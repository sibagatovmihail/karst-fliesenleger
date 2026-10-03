/* Designentwurf „Karst Fliesenleger“
   Gestaltung und Code © 2026 Mykhailo Sibahatov. Alle Rechte vorbehalten.
   Nur zur Ansicht — keine Nutzung ohne schriftliche Vereinbarung (LICENSE).
   Karst Fliesenleger — interactions. No dependencies. */
(function () {
  'use strict';

  /* ---------- Licence: the draft only runs where it has been licensed ----------
     Add a domain here once a written agreement is in place. */
  var LICENSED = ['sibagatovmihail.github.io', 'localhost', '127.0.0.1'];
  if (location.protocol !== 'file:' && LICENSED.indexOf(location.hostname) === -1) {
    var lock = document.createElement('div');
    lock.className = 'licence-lock';
    lock.setAttribute('role', 'alertdialog');
    lock.innerHTML = '<div><b>Nicht lizenzierte Kopie</b>' +
      '<p>Diese Website ist ein urheberrechtlich geschützter Designentwurf von Mykhailo Sibahatov und für diese Domain nicht lizenziert.</p>' +
      '<p>Nutzungsrechte: <a href="mailto:sibagatovmihail@gmail.com">sibagatovmihail@gmail.com</a></p></div>';
    document.body.appendChild(lock);
    document.documentElement.style.overflow = 'hidden';
  }

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- preloader: the tiles are laid, then it fades (CSS failsafe at 2.4s) ---------- */
  if (!root.classList.contains('no-preload') && !reduceMotion) {
    var t0 = Date.now();
    var ready = function () { setTimeout(function () { root.classList.add('is-ready'); }, Math.max(0, 1350 - (Date.now() - t0))); };
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
  }

  /* ---------- scroll lock for the menu sheet and the lightbox ----------
     overflow:hidden alone does not stop iOS Safari, so the body is pinned at the
     current offset and the exact position is restored on close, instantly. */
  var lockY = 0, locks = 0;
  function lockScroll(on) {
    var b = document.body.style;
    if (on) {
      if (locks++ > 0) return;
      lockY = window.scrollY;
      b.position = 'fixed'; b.top = -lockY + 'px'; b.left = '0'; b.right = '0'; b.width = '100%';
    } else {
      if (locks === 0 || --locks > 0) return;
      b.position = b.top = b.left = b.right = b.width = '';
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, lockY);
      root.style.scrollBehavior = '';
    }
  }
  var isLocked = function () { return locks > 0; };

  /* ---------- navigation ---------- */
  var header = document.querySelector('.site-header');
  var strip = document.querySelector('.navbar');
  var toggle = document.querySelector('.navbar__toggle');
  function setNav(open) {
    if ((strip.getAttribute('data-open') === 'true') === open) return;
    strip.setAttribute('data-open', open ? 'true' : 'false');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('.visually-hidden').textContent = open ? 'Menü schließen' : 'Menü öffnen';
    root.classList.toggle('nav-open', open);
    lockScroll(open);
  }
  toggle.addEventListener('click', function () { setNav(strip.getAttribute('data-open') !== 'true'); });
  /* links in the sheet: unlock first, then let the jump happen */
  strip.querySelector('.navbar__menu').addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || strip.getAttribute('data-open') !== 'true') return;
    var hash = a.getAttribute('href');
    if (hash.charAt(0) !== '#') { setNav(false); return; }
    e.preventDefault();
    setNav(false);
    var target = document.querySelector(hash);
    if (target) {
      requestAnimationFrame(function () { target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); });
      history.replaceState(null, '', hash);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && strip.getAttribute('data-open') === 'true') { setNav(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (strip.getAttribute('data-open') === 'true' && !e.target.closest('.site-header')) setNav(false);
  });
  window.matchMedia('(min-width: 64.0625rem)').addEventListener('change', function (m) { if (m.matches) setNav(false); });

  /* header hover: one tinted block glides from link to link (wide screens, real pointer) */
  var links = document.querySelector('.navbar__links');
  var wideHover = window.matchMedia('(min-width: 64.0625rem) and (hover: hover) and (pointer: fine)');
  if (!reduceMotion) {
    var glider = document.createElement('li');
    glider.className = 'navbar__glider';
    glider.setAttribute('aria-hidden', 'true');
    links.prepend(glider);
    var moveTo = function (link) {
      glider.style.left = link.offsetLeft + 'px';
      glider.style.top = link.offsetTop + 'px';
      glider.style.width = link.offsetWidth + 'px';
    };
    var show = function (link) {
      if (!wideHover.matches) return;
      if (!links.classList.contains('has-glider')) {
        glider.style.transition = 'none'; moveTo(link); void glider.offsetWidth; glider.style.transition = '';
        links.classList.add('has-glider');
      } else moveTo(link);
    };
    var hide = function () { links.classList.remove('has-glider'); };
    links.querySelectorAll('.navbar__link').forEach(function (link) {
      link.addEventListener('mouseenter', function () { show(link); });
      link.addEventListener('focus', function () { show(link); });
      link.addEventListener('blur', hide);
    });
    links.addEventListener('mouseleave', hide);
  }

  /* current section: the link of the section under the header */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.navbar__link'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var faq = document.getElementById('faq');
  function markCurrent() {
    var line = window.innerHeight * 0.35, current = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= line) current = i; });
    if (faq && faq.getBoundingClientRect().top <= line) current = -1;   /* past Bewertungen nothing is current */
    navLinks.forEach(function (a, i) {
      a.classList.toggle('is-current', i === current);
      if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking || isLocked()) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; header.classList.toggle('is-scrolled', window.scrollY > 8); markCurrent(); });
  }, { passive: true });
  markCurrent();

  /* ---------- reveal: whole groups ---------- */
  var reveals = document.querySelectorAll('.reveal');
  function finish(el) {
    el.classList.add('is-in');
    setTimeout(function () { el.classList.add('is-done'); }, 900);
  }
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in', 'is-done'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { finish(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
    /* a jump (anchor, End key) can skip an element entirely */
    var sweep = function () {
      reveals.forEach(function (el) {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < window.innerHeight) { finish(el); io.unobserve(el); }
      });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(sweep); }, { passive: true });
    window.addEventListener('load', sweep);
  }

  /* ---------- before / after ----------
     Drag anywhere on the photo (horizontal drags only; vertical swipes still scroll
     the page on touch), click to jump, or use the arrow keys on the handle. */
  document.querySelectorAll('.ba').forEach(function (ba) {
    var handle = ba.querySelector('.ba__handle');
    var pos = 50, raf = 0, target = 50;
    var render = function () {
      ba.style.setProperty('--pos', pos + '%');
      handle.setAttribute('aria-valuenow', String(Math.round(pos)));
      handle.setAttribute('aria-valuetext', Math.round(pos) + ' % Vorher');
      ba.classList.toggle('is-left', pos < 14);
      ba.classList.toggle('is-right', pos > 86);
    };
    var set = function (p) { pos = Math.max(0, Math.min(100, p)); render(); };
    var fromEvent = function (e) { var r = ba.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    var dragging = false, startX = 0, startY = 0, decided = false;
    ba.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true; decided = e.pointerType === 'mouse'; startX = e.clientX; startY = e.clientY;
      if (decided) { ba.setPointerCapture(e.pointerId); ba.classList.add('is-dragging'); set(fromEvent(e)); }
      cancelSweep();
    });
    ba.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (!decided) {
        var dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { dragging = false; return; }          /* a vertical swipe: leave it to the page */
        decided = true; ba.setPointerCapture(e.pointerId); ba.classList.add('is-dragging');
      }
      set(fromEvent(e));
    });
    var end = function (e) {
      if (dragging && !decided && e.type === 'pointerup') set(fromEvent(e));   /* a tap jumps there */
      dragging = false; ba.classList.remove('is-dragging');
    };
    ba.addEventListener('pointerup', end);
    ba.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 2, k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') set(pos - step);
      else if (k === 'ArrowRight' || k === 'ArrowUp') set(pos + step);
      else if (k === 'Home') set(0);
      else if (k === 'End') set(100);
      else if (k === 'PageDown') set(pos - 25);
      else if (k === 'PageUp') set(pos + 25);
      else return;
      e.preventDefault(); cancelSweep();
    });
    /* once, when it scrolls into view: a short sweep shows that it moves */
    var sweeping = false;
    function cancelSweep() { sweeping = false; cancelAnimationFrame(raf); }
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        seen.disconnect();
        var keys = [[0, 50], [700, 28], [1500, 72], [2200, 50]], t0 = null;
        sweeping = true;
        var ease = function (x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
        var step = function (ts) {
          if (!sweeping) return;
          if (t0 === null) t0 = ts + 500;
          var t = ts - t0;
          if (t < 0) { raf = requestAnimationFrame(step); return; }
          for (var i = 1; i < keys.length; i++) {
            if (t <= keys[i][0]) {
              var a = keys[i - 1], b = keys[i], f = ease((t - a[0]) / (b[0] - a[0]));
              set(a[1] + (b[1] - a[1]) * f); raf = requestAnimationFrame(step); return;
            }
          }
          set(50); sweeping = false;
        };
        raf = requestAnimationFrame(step);
      }, { threshold: 0.6 });
      seen.observe(ba);
    }
    render();
  });

  /* ---------- project gallery: filter + lightbox ---------- */
  var chips = document.querySelectorAll('.chip');
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery .g'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      items.forEach(function (it) { it.hidden = !(f === 'alle' || it.getAttribute('data-cat') === f); });
    });
  });

  var lb = document.querySelector('.lightbox');
  var lbImg = lb.querySelector('.lightbox__img');
  var lbCap = lb.querySelector('.lightbox__cap');
  var lbCount = lb.querySelector('.lightbox__count');
  var visible = [], idx = 0, opener = null;
  function showItem(i) {
    idx = (i + visible.length) % visible.length;
    var btn = visible[idx].querySelector('button');
    lbImg.src = btn.getAttribute('data-full');
    lbImg.alt = btn.querySelector('img').alt;
    lbCap.textContent = btn.querySelector('.g__cap').textContent;
    lbCount.textContent = (idx + 1) + ' / ' + visible.length;
  }
  function openLb(item) {
    visible = items.filter(function (it) { return !it.hidden; });
    opener = item.querySelector('button');
    showItem(visible.indexOf(item));
    lb.hidden = false;
    lockScroll(true);
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    lb.querySelector('.lightbox__close').focus();
  }
  function closeLb() {
    lb.classList.remove('is-open');
    lockScroll(false);
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute('src'); }, reduceMotion ? 0 : 250);
    if (opener) opener.focus({ preventScroll: true });
  }
  items.forEach(function (it) { it.querySelector('button').addEventListener('click', function () { openLb(it); }); });
  lb.querySelector('.lightbox__close').addEventListener('click', closeLb);
  lb.querySelector('.lightbox__prev').addEventListener('click', function () { showItem(idx - 1); });
  lb.querySelector('.lightbox__next').addEventListener('click', function () { showItem(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lightbox__fig')) closeLb(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') showItem(idx - 1);
    else if (e.key === 'ArrowRight') showItem(idx + 1);
    else if (e.key === 'Tab') {                                       /* keep focus inside */
      var f = lb.querySelectorAll('button'), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var sx = 0, sy = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) showItem(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- FAQ: one open at a time; beside the heading, the list reserves its tallest state ---------- */
  var accList = document.querySelector('.acc-list');
  var accs = Array.prototype.slice.call(document.querySelectorAll('.acc'));
  var setAcc = function (item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.acc__btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  accs.forEach(function (item) {
    item.querySelector('.acc__btn').addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      accs.forEach(function (o) { if (o !== item) setAcc(o, false); });
      setAcc(item, open);
    });
  });
  if (accList) {
    var reserve = function () {
      accList.style.minHeight = '';
      if (!window.matchMedia('(min-width: 40.0625rem)').matches) return;
      var rows = 0, tallest = 0;
      accs.forEach(function (item) {
        rows += item.querySelector('h3').offsetHeight;
        tallest = Math.max(tallest, item.querySelector('.acc__inner').scrollHeight);
      });
      var gaps = (accs.length - 1) * parseFloat(getComputedStyle(accList).rowGap || 0);
      accList.style.minHeight = Math.ceil(rows + gaps + tallest) + 'px';
    };
    reserve();
    window.addEventListener('resize', reserve);
    window.addEventListener('load', reserve);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserve);
  }

  /* ---------- custom dropdowns: the native <select> stays for value + validation ---------- */
  document.querySelectorAll('#contact-form select.input').forEach(function (sel) {
    var wrap = document.createElement('div');
    wrap.className = 'select';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('select__native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');
    var id = sel.id;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'select__btn';
    btn.id = id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="select__val"></span><svg class="select__chev" aria-hidden="true"><use href="#i-chev"/></svg>';
    var label = document.querySelector('label[for="' + id + '"]');
    if (label) { label.htmlFor = btn.id; label.id = id + '-lbl'; btn.setAttribute('aria-labelledby', label.id + ' ' + btn.id); }
    var list = document.createElement('ul');
    list.className = 'select__list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    if (label) list.setAttribute('aria-labelledby', label.id);
    btn.setAttribute('aria-controls', list.id);
    var opts = Array.prototype.map.call(sel.options, function (o, i) {
      var li = document.createElement('li');
      li.id = id + '-o' + i;
      li.setAttribute('role', 'option');
      li.innerHTML = '<span>' + o.text + '</span><svg aria-hidden="true"><use href="#i-check"/></svg>';
      if (o.value === '') li.classList.add('is-placeholder');
      list.appendChild(li);
      return li;
    });
    wrap.appendChild(btn);
    wrap.appendChild(list);
    var active = sel.selectedIndex;
    var sync = function () {
      var o = sel.options[sel.selectedIndex];
      btn.querySelector('.select__val').textContent = o ? o.text : '';
      btn.classList.toggle('is-empty', !o || o.value === '');
      opts.forEach(function (li, i) { li.setAttribute('aria-selected', String(i === sel.selectedIndex)); });
    };
    var mark = function (i) {
      active = Math.max(0, Math.min(opts.length - 1, i));
      opts.forEach(function (li, k) { li.classList.toggle('is-active', k === active); });
      list.setAttribute('aria-activedescendant', opts[active].id);
      var li = opts[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 4;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 4;
    };
    var open = function () {
      document.querySelectorAll('.select.is-open').forEach(function (w) { if (w !== wrap) w._close(); });
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      var r = btn.getBoundingClientRect();
      wrap.classList.toggle('is-up', window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom);
      mark(sel.selectedIndex < 0 ? 0 : sel.selectedIndex);
      list.focus({ preventScroll: true });
    };
    var close = function (focusBtn) {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus({ preventScroll: true });
    };
    wrap._close = function () { close(false); };
    var choose = function (i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      close(true);
    };
    btn.addEventListener('click', function () { if (wrap.classList.contains('is-open')) close(true); else open(); });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); open(); }
    });
    var typed = '', typedT;
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); mark(0); }
      else if (e.key === 'End') { e.preventDefault(); mark(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(false); }
      else if (e.key.length === 1) {
        typed += e.key.toLowerCase(); clearTimeout(typedT);
        typedT = setTimeout(function () { typed = ''; }, 600);
        for (var k = 0; k < opts.length; k++) {
          if (sel.options[k].text.toLowerCase().indexOf(typed) === 0) { mark(k); break; }
        }
      }
    });
    opts.forEach(function (li, i) {
      li.addEventListener('click', function () { choose(i); });
      li.addEventListener('mousemove', function () { if (active !== i) mark(i); });
    });
    sel.addEventListener('change', sync);
    sync();
  });
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.select.is-open').forEach(function (w) { if (!w.contains(e.target)) w._close(); });
  });

  /* ---------- request form — draft: validates, then shows the thank-you state ----------
     Production: Web3Forms (hidden access_key + the botcheck honeypot are in place). */
  var form = document.getElementById('contact-form');
  if (form) {
    var status = form.querySelector('.form__status');
    var messages = {
      'f-name': 'Bitte geben Sie Ihren Namen an.',
      'f-tel': 'Bitte eine Telefonnummer für den Rückruf angeben.',
      'f-mail': 'Bitte prüfen Sie die E-Mail-Adresse.',
      'f-ok': 'Bitte bestätigen Sie die Einwilligung.'
    };
    var check = function (input) {
      var field = input.closest('.field');
      var err = document.getElementById(input.id + '-err');
      var ok = input.checkValidity();
      if (input.type === 'email' && ok && input.value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value);
      if (input.type === 'tel' && ok && input.value) ok = input.value.replace(/\D/g, '').length >= 6;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (err) { err.textContent = ok ? '' : messages[input.id]; input.setAttribute('aria-describedby', err.id); }
      return ok;
    };
    var checked = form.querySelectorAll('[required], [type="email"]');
    checked.forEach(function (input) {
      input.addEventListener(input.type === 'checkbox' ? 'change' : 'blur', function () {
        if (input.value || input.type === 'checkbox') check(input);
      });
      input.addEventListener('input', function () { if (input.closest('.field').classList.contains('is-invalid')) check(input); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('[name="botcheck"]').checked) return;
      var firstBad = null;
      checked.forEach(function (input) { if (!check(input) && !firstBad) firstBad = input; });
      if (firstBad) { firstBad.focus(); return; }
      var name = form.querySelector('#f-name').value.trim().split(/\s+/)[0];
      status.textContent = 'Danke, ' + name + '! Ich melde mich in Kürze bei Ihnen.';
      form.closest('.form-cell').classList.add('is-sent');
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
