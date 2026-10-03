"""Resize the business's own photos (Google Maps + Facebook, tools/src/) into assets/img/*.webp.

    python3 tools/images.py
"""
import os
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, "src"), os.path.join(HERE, "..", "assets", "img")
os.makedirs(OUT, exist_ok=True)

# source -> (name, widths)
JOBS = {
    "g00.jpg": ("bad-walk-in", (1600, 800)),
    "g01.jpg": ("bad-wanne-holzoptik", (1200, 700)),
    "g02.jpg": ("kamin", (1000, 600)),
    "g03.jpg": ("bad-dusche-nischen", (1000, 600)),
    "g04.jpg": ("bad-bordure", (1200, 700)),
    "g05.jpg": ("bad-im-bau", (1200, 700)),
    "g06.jpg": ("eingangsstufen", (1200, 700)),
    "g07.jpg": ("aussentreppe", (1000, 600)),
    "g08.jpg": ("dusche-glas", (1000, 600)),
    "g09.jpg": ("treppe-innen", (1200, 700)),
    "p03_720x720.jpg": ("oliver-transporter", (720,)),
    "p11_960x720.jpg": ("treppe-grau", (960,)),
    "p16_720x1273.jpg": ("boden-schwarz", (720,)),
    "p17_543x960.jpg": ("dusche-rinne", (543,)),
    "p19_960x543.jpg": ("holzoptik-boden", (960,)),
}

for src, (name, widths) in JOBS.items():
    im = ImageOps.exif_transpose(Image.open(os.path.join(SRC, src))).convert("RGB")
    for w in widths:
        r = im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        suffix = "" if w == widths[0] else f"-{w}"
        r.save(os.path.join(OUT, f"{name}{suffix}.webp"), "WEBP", quality=78, method=6)
    print(name, im.size)

# before / after: same bathroom, the before shot sits 30px to the right -> crop both to overlap
a = Image.open(os.path.join(SRC, "p14_960x543.jpg")).convert("RGB").crop((30, 0, 960, 543))
b = Image.open(os.path.join(SRC, "p15_960x543.jpg")).convert("RGB").crop((0, 0, 930, 543))
a.save(os.path.join(OUT, "vorher-bad-mosaik.webp"), "WEBP", quality=80, method=6)
b.save(os.path.join(OUT, "nachher-bad-mosaik.webp"), "WEBP", quality=80, method=6)
# social preview
og = Image.open(os.path.join(SRC, "g00.jpg")).convert("RGB")
og = ImageOps.fit(og, (1200, 630), Image.LANCZOS)
og.save(os.path.join(OUT, "og.jpg"), "JPEG", quality=82, optimize=True, progressive=True)
