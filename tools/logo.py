"""Rebuild the Karst Fliesenleger logo as clean SVG from the 2018 business card.

The tile swoosh (and the K, whose stem is the tile column) is traced as straight
polygons; "ARST." and "FLIESENLEGER" are re-set in Source Sans 3 (outlines), each
glyph placed at the position measured on the card, so the layout stays faithful.

    python3 tools/logo.py      -> assets/logo*.svg, assets/mark*.svg, assets/favicon.svg
"""
import os
import cv2
import numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets")
S = 8  # trace upscale

# ---------- trace ----------
card = cv2.imread(os.path.join(HERE, "visitenkarte.jpg"))
big = cv2.resize(card, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
gray = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY)
_, th = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

tiles = []   # (polygon in card px, centroid)
for c in contours:
    x, y, w, h = cv2.boundingRect(c)
    if not (y > 40 * S and y < 290 * S and x < 226 * S) or cv2.contourArea(c) < 30 * S * S:
        continue
    if x > 200 * S and y > 190 * S:          # the F of FLIESENLEGER
        continue
    peri = cv2.arcLength(c, True)
    if w < 30 * S and h < 40 * S:            # a single tile -> 4 corners
        eps = 0.01 * peri
        p = cv2.approxPolyDP(c, eps, True)
        while len(p) > 4 and eps < 0.2 * peri:
            eps *= 1.1
            p = cv2.approxPolyDP(c, eps, True)
    else:                                     # K arms fused with a stem tile
        p = cv2.approxPolyDP(c, 0.7 * S, True)
    pts = p.reshape(-1, 2).astype(float) / S
    m = cv2.moments(c)
    tiles.append((pts, (m["m10"] / m["m00"] / S, m["m01"] / m["m00"] / S), len(pts) > 4))


def clip_x(pts, xmax):
    """Sutherland-Hodgman against the half plane x <= xmax."""
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ina, inb = a[0] <= xmax, b[0] <= xmax
        if ina:
            out.append(a)
        if ina != inb:
            t = (xmax - a[0]) / (b[0] - a[0])
            out.append((xmax, a[1] + t * (b[1] - a[1])))
    return np.array(out)


# the mark (no wordmark): the K's arms cut off its stem tile
mark_tiles = [(clip_x(t[0], 198.6) if t[2] else t[0], t[1], False) for t in tiles]


def poly_d(pts):
    return "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + "Z"


# ---------- type ----------
def font_at(wght):
    f = TTFont(os.path.join(HERE, "SourceSans3.ttf"))
    return instantiateVariableFont(f, {"wght": wght})


def glyph_d(font, ch, left, baseline, cap_px, right=None):
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    name = cmap[ord(ch)]
    capH = font["OS/2"].sCapHeight
    k = cap_px / capH
    # left side: align the ink's left edge (not the advance origin) to `left`
    from fontTools.pens.boundsPen import BoundsPen
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    xmin, _, xmax, _ = bp.bounds
    kx = k if right is None else (right - left) / (xmax - xmin)
    RATIOS.append((ch, round(kx / k, 3)))
    pen = SVGPathPen(gs)
    tp = TransformPen(pen, (kx, 0, 0, -k, left - xmin * kx, baseline))
    gs[name].draw(tp)
    return pen.getCommands()


RATIOS = []
bold = font_at(700)
regular = font_at(400)
# measured on the card (px): ink left edges, cap height, baseline
# measured ink boxes (left, right) at 8x on the card
WORD = [("A", 227.2, 271.9), ("R", 279.1, 316.0), ("S", 321.9, 355.9), ("T", 360.1, 398.8), (".", 399.1, 411.1)]
WORD_BASE, WORD_CAP = 175.6, 50.1
SUB = [("F", 203.1, 210.8), ("L", 220.9, 229.0), ("I", 238.2, 239.9), ("E", 250.5, 258.9), ("S", 268.0, 276.8),
       ("E", 286.5, 294.9), ("N", 304.5, 315.9), ("L", 326.5, 334.8), ("E", 344.1, 352.5), ("G", 361.1, 373.5),
       ("E", 383.5, 391.9), ("R", 401.5, 411.0)]
SUB_BASE, SUB_CAP = 212.0, 15.1

word_d = "".join(glyph_d(bold, ch, l, WORD_BASE, WORD_CAP, r) for ch, l, r in WORD)
sub_d = "".join(glyph_d(regular, ch, l, SUB_BASE, SUB_CAP, r if ch != "I" else None) for ch, l, r in SUB)

# ---------- compose ----------
allpts = np.vstack([t[0] for t in tiles])
x0, y0 = allpts.min(axis=0)
x1 = 413.5
y1 = allpts[:, 1].max()
pad = 2
VB = f"{x0 - pad:.1f} {y0 - pad:.1f} {x1 - x0 + 2 * pad:.1f} {y1 - y0 + 2 * pad:.1f}"
mx1 = 198.6
VB_MARK = f"{x0 - pad:.1f} {y0 - pad:.1f} {mx1 - x0 + 2 * pad:.1f} {y1 - y0 + 2 * pad:.1f}"

# van colourway: tiles alternate ice blue / silver along the swoosh
order = sorted(range(len(tiles)), key=lambda i: (round(tiles[i][1][1] / 9), tiles[i][1][0]))
alt = {i: n % 2 for n, i in enumerate(order)}


def tiles_svg(c_a, c_b=None, ts=None):
    ts = ts or tiles
    if c_b is None:
        return f'<path fill="{c_a}" d="{"".join(poly_d(t[0]) for t in ts)}"/>'
    a = "".join(poly_d(ts[i][0]) for i in range(len(ts)) if alt[i] == 0)
    b = "".join(poly_d(ts[i][0]) for i in range(len(ts)) if alt[i] == 1)
    return f'<path fill="{c_a}" d="{a}"/><path fill="{c_b}" d="{b}"/>'


def write(name, vb, body, title="Karst Fliesenleger"):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}">{body}</svg>\n')


os.makedirs(OUT, exist_ok=True)
ICE, SILVER, ROYAL, NAVY, WHITE = "#8FD9F7", "#B7BDCB", "#1D3693", "#13284F", "#FFFFFF"
# 1 business-card version: all white (for dark grounds)
write("logo-white.svg", VB, tiles_svg(WHITE) + f'<path fill="{WHITE}" d="{word_d}"/><path fill="{WHITE}" d="{sub_d}"/>')
# 2 van version: ice/silver tiles, ice wordmark, silver subline (on royal blue)
write("logo-van.svg", VB, tiles_svg(ICE, SILVER) + f'<path fill="{ICE}" d="{word_d}"/><path fill="{SILVER}" d="{sub_d}"/>')
# 3 for light grounds: royal + ice tiles, navy type
write("logo.svg", VB, tiles_svg(ROYAL, "#4FA9DA") + f'<path fill="{NAVY}" d="{word_d}"/><path fill="#5A6478" d="{sub_d}"/>')
# marks
write("mark-van.svg", VB_MARK, tiles_svg(ICE, SILVER, mark_tiles))
write("mark.svg", VB_MARK, tiles_svg(ROYAL, "#4FA9DA", mark_tiles))
write("mark-white.svg", VB_MARK, tiles_svg(WHITE, None, mark_tiles))
# favicon: van-ice swoosh on a royal rounded square
mw, mh = mx1 - x0 + 2 * pad, y1 - y0 + 2 * pad
side = max(mw, mh) * 1.18
cx, cy = x0 - pad + mw / 2, y0 - pad + mh / 2
fv = f"{cx - side / 2:.1f} {cy - side / 2:.1f} {side:.1f} {side:.1f}"
write("favicon.svg", fv, f'<rect x="{cx - side / 2:.1f}" y="{cy - side / 2:.1f}" width="{side:.1f}" height="{side:.1f}" rx="{side * .22:.1f}" fill="{ROYAL}"/>' + tiles_svg(ICE, WHITE, mark_tiles))
print(len(tiles), "tiles;", VB)
print(RATIOS)

# preloader: the mark with one path per tile (top to bottom), each with its index in --i
seq = sorted(range(len(mark_tiles)), key=lambda i: mark_tiles[i][1][1])
paths = "".join(f'<path style="--i:{n}" class="t{alt[i]}" d="{poly_d(mark_tiles[i][0])}"/>' for n, i in enumerate(seq))
with open(os.path.join(OUT, "mark-tiles.svg"), "w") as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB_MARK}" aria-hidden="true">{paths}</svg>\n')
