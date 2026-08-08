/* ════════════════════════════════════════════════════════════════════════
   Brúin — the Mirror House engine, re-aimed.

   Five devices ported as BEHAVIOUR, not as tokens:
     1. one master scroll writes the whole page's palette
     2. a seam that draws itself and births the wordmark
     3. a pinned, scrubbed canvas frame sequence (never a <video>)
     4. a preloader counting REAL loading
     5. per-word mask rises on every headline

   The arc is theirs, not Mirror House's: that page is one NIGHT (ice to
   basalt). This one is a harbour DAY that ends with the windows lit, which is
   the same sentence their own section says out loud.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── the film's frames ────────────────────────────────────────────────
     Module scope, started from a plain timer. Deliberately depends on
     NOTHING: not gsap, not ScrollTrigger, not scroll position, not a media
     query. Every gated version finds a browser where it never fires and
     leaves the canvas empty over the section, and someone opening this link
     once does not get a second chance. */
  var FRAME_COUNT = 121;
  var small = window.innerWidth < 768;
  var shots = new Array(FRAME_COUNT).fill(null);
  var framesStarted = false;

  function frameSrc(i) {
    var n = String(i + 1);
    while (n.length < 3) n = '0' + n;
    return 'assets/img/' + (small ? 'frames-sm' : 'frames') + '/f' + n + '.jpg';
  }

  function loadFrames(onFirst) {
    if (framesStarted) return;
    framesStarted = true;
    var next = 0;
    function pump() {
      if (next >= FRAME_COUNT) return;
      var idx = next++;
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () {
        // onload only means the bytes arrived. The pixels can still decode
        // lazily on the FIRST drawImage, which is a synchronous stall in the
        // middle of a scrub gesture on iOS. decode() front-loads that cost.
        var commit = function () { shots[idx] = im; if (idx === 0 && onFirst) onFirst(); pump(); };
        im.decode ? im.decode().then(commit, commit) : commit();
      };
      im.onerror = pump;
      im.src = frameSrc(idx);
    }
    // wide pump: a curious scroller reaching the pin before the set fills in
    // lands on the nearest-loaded-frame fallback, which reads as the film
    // stepping. GH Pages is HTTP/2 so this is not per-origin limited.
    for (var l = 0; l < 14; l++) pump();
  }

  /* ── the palette arc ──────────────────────────────────────────────────
     Canvas and ink cross through mid-tone together, so anywhere the crossover
     is SLOW the two meet in the middle and contrast collapses. Hold the light
     palette late, then cross fast, so no body copy sits inside the crossover. */
  var STOPS = [
    { at: 0.00, c: '#C3D2DD', ink: '#2F2B22', soft: '#B4C6D3' }, // first light on the harbour
    { at: 0.14, c: '#E4E0D1', ink: '#2F2B22', soft: '#EEEBE0' }, // day
    { at: 0.60, c: '#E4E0D1', ink: '#2F2B22', soft: '#EEEBE0' }, // held
    { at: 0.66, c: '#8A7F6C', ink: '#F2EFE4', soft: '#6E6353' }, // cross fast
    { at: 0.74, c: '#3A3529', ink: '#E4E0D1', soft: '#2F2B22' }, // dusk
    { at: 1.00, c: '#241F18', ink: '#E4E0D1', soft: '#2F2B22' }  // lights on
  ];

  function hex2rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function mixHex(a, b, t) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
  }
  function paletteAt(p) {
    var i = 0;
    while (i < STOPS.length - 2 && p > STOPS[i + 1].at) i++;
    var a = STOPS[i], b = STOPS[i + 1];
    var t = Math.max(0, Math.min(1, (p - a.at) / ((b.at - a.at) || 1)));
    return { c: mixHex(a.c, b.c, t), ink: mixHex(a.ink, b.ink, t), soft: mixHex(a.soft, b.soft, t) };
  }

  var themeMeta = document.getElementById('themeColor');
  var lastC = '', lastInk = '', lastSoft = '';
  function applyPalette(p) {
    var v = paletteAt(p);
    // writing a custom property on the root restyles every descendant, and the
    // palette is FLAT across most of the document. Skipping identical writes
    // removes that recalc entirely there.
    if (v.c !== lastC) { root.style.setProperty('--br-c', v.c); lastC = v.c; }
    if (v.ink !== lastInk) { root.style.setProperty('--br-ink', v.ink); lastInk = v.ink; }
    if (v.soft !== lastSoft) { root.style.setProperty('--br-soft', v.soft); lastSoft = v.soft; }
    // derive "is it night now" from the canvas LUMINANCE, never a progress
    // threshold: a threshold drifts out of sync the moment a stop moves
    var rgb = v.c.match(/\d+/g).map(Number);
    var lin = rgb.map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    var night = (0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]) < 0.18;
    if (body.classList.contains('is-night') !== night) {
      body.classList.toggle('is-night', night);
      if (themeMeta) themeMeta.setAttribute('content', night ? '#241F18' : '#E4E0D1');
    }
  }
  applyPalette(0);

  /* ── per-word headline split (accessible name preserved) ─────────────── */
  document.querySelectorAll('[data-headline]').forEach(function (h) {
    var text = h.textContent.replace(/\s+/g, ' ').trim();
    h.setAttribute('aria-label', text);           // split spans mangle the name
    h.textContent = '';
    text.split(' ').forEach(function (w, i, arr) {
      var outer = document.createElement('span');
      outer.className = 'br-line';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'br-word';
      inner.textContent = w;
      outer.appendChild(inner);
      h.appendChild(outer);
      if (i < arr.length - 1) h.appendChild(document.createTextNode(' '));
    });
  });

  /* ══ reduced motion: resting state IS the visible one ═════════════════ */
  if (reduced) {
    body.classList.add('br-static');
    var v0 = paletteAt(0.5);
    root.style.setProperty('--br-c', v0.c);
    root.style.setProperty('--br-ink', v0.ink);
    root.style.setProperty('--br-soft', v0.soft);
    initMenu(null); initSwitch(); initForm();
    var lo = document.getElementById('loader'); if (lo) lo.remove();
    return;
  }

  /* ══ motion ═══════════════════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);
  // iOS Safari fires a resize when its address bar hides mid-scroll; without
  // this a pinned trigger can refresh and jump mid-gesture
  ScrollTrigger.config({ ignoreMobileResize: true });
  var lenis = new Lenis({ duration: 1.7, smoothWheel: true, touchMultiplier: 1.25 });

  /* drift: batched reads then writes, off-screen skipped, clamped to ±1 */
  var frames = Array.prototype.slice.call(document.querySelectorAll('.br-frame-in'));
  var filmST = null;
  function drift() {
    // while the pin holds, every frame reports the same rect on every tick:
    // this loop would burn main thread next to the canvas draw for no change
    if (filmST && filmST.isActive) return;
    var vh = window.innerHeight, writes = [], i;
    for (i = 0; i < frames.length; i++) {
      var box = frames[i].parentElement;
      if (!box) continue;
      var r = box.getBoundingClientRect();
      if (r.bottom < -240 || r.top > vh + 240) continue;
      var d = Number(frames[i].dataset.drift || 9);
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      if (p > 1) p = 1; if (p < -1) p = -1;
      writes.push([frames[i], 'translate3d(0,' + (-p * d).toFixed(2) + '%,0)']);
    }
    for (i = 0; i < writes.length; i++) writes[i][0].style.transform = writes[i][1];
  }

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('is-in'); });
  }, { threshold: 0.2 });
  document.querySelectorAll('.br-rv').forEach(function (el) { io.observe(el); });

  gsap.context(function () {
    /* ONE master scroll owns the palette for the whole document */
    ScrollTrigger.create({
      start: 0,
      end: function () { return document.documentElement.scrollHeight - window.innerHeight; },
      onUpdate: function (self) { applyPalette(self.progress); },
      invalidateOnRefresh: true
    });

    /* THE SEAM + THE OPENING CROP.
       The wordmark itself is NEVER animated: it carries mix-blend-mode, and a
       transform/opacity/clip on it or any ancestor inside the hero would create
       a stacking context and stop the blend seeing the picture. So the intro
       animates the seam and the eyebrow (a sibling subtree), and the scroll
       animates the PANEL's clip, which opens the crop out to full bleed. */
    var seam = document.getElementById('wmSeam');
    var wmTop = document.getElementById('wmTop');
    var heroEl = document.getElementById('hero');
    var panel = document.querySelector('.br-hero__panel');

    if (seam && wmTop) {
      gsap.set(seam, { scaleX: 0 });
      gsap.set(wmTop, { opacity: 0, y: 12 });
      var openFromTheLine = function () {
        gsap.timeline()
          .to(seam, { scaleX: 1, duration: 0.9, ease: 'expo.out' })
          .to(wmTop, { opacity: .9, y: 0, duration: 1.0, ease: 'expo.out' }, '-=0.55');
      };
      if (document.getElementById('loader')) {
        window.addEventListener('br:revealed', openFromTheLine, { once: true });
      } else {
        gsap.delayedCall(0.12, openFromTheLine);
      }
    }

    /* the crop opens to full bleed across the hero's own scroll range */
    if (panel && heroEl) {
      /* THE PANEL'S RESTING SIZE LIVES HERE, not in the stylesheet.
         An unregistered custom property comes back from getComputedStyle as the
         literal string 'min(42vw,520px)', so parseFloat gives NaN and the old
         code fell through to its hardcoded fallback every single time. The CSS
         tokens looked authoritative and changed nothing; only these numbers
         ever reached the screen. One source of truth, and the stylesheet's
         inset() percentages are now only the pre-JS resting frame. */
      var PANEL = {
        wide:   { w: [0.56, 760], h: [0.54, 520], mw: [0.58, 226], mh: [0.30, 230] },
        normal: { w: [0.42, 520], h: [0.62, 620], mw: [0.44, 200], mh: [0.46, 380] }
      };
      var startClip = function () {
        var vw = window.innerWidth, vh = window.innerHeight;
        var p = PANEL[heroEl.classList.contains('br-hero--wide') ? 'wide' : 'normal'];
        var mob = vw <= 760;
        var pw = Math.min(vw * (mob ? p.mw[0] : p.w[0]), mob ? p.mw[1] : p.w[1]);
        var ph = Math.min(vh * (mob ? p.mh[0] : p.h[0]), mob ? p.mh[1] : p.h[1]);
        return {
          x: Math.max(0, (100 - (pw / vw) * 100) / 2),
          y: Math.max(0, (100 - (ph / vh) * 100) / 2)
        };
      };
      /* ONE pair of custom properties on the hero drives BOTH copies of the
         photograph: the plain one behind the letters, and the graded one that
         is clipped to the letterforms. Writing them on the shared ancestor is
         what keeps the two in register — two independently-written clips drift
         apart by a pixel or two and the drift reads as a printing error. */
      var writeClip = function (progress) {
        var c = startClip(), k = 1 - progress;
        heroEl.style.setProperty('--clip-x', (c.x * k).toFixed(2) + '%');
        heroEl.style.setProperty('--clip-y', (c.y * k).toFixed(2) + '%');
      };
      var applyStart = function () { writeClip(0); };

      /* The wordmark is SVG, not HTML text, because the same <text> has to do
         two jobs at once: paint the paper letters, and BE the clip path that
         the graded photograph is poured into. A <use> of the rendered node
         guarantees the two are the same geometry — matching an HTML span's
         glyph box by measurement never survives a font swap or a resize. */
      var wmText = document.getElementById('wmGlyphText');
      var wmUse = document.getElementById('wmGlyphUse');
      var CAP = 0.72;                   // Clash Display cap height, in em
      var syncWordmark = function () {
        if (!wmText) return;
        var r = heroEl.getBoundingClientRect();
        /* font-size is written as an ATTRIBUTE, not left to the stylesheet.
           The clip path consumes this node through <use>, and a class-based
           font-size is not guaranteed to reach a use-shadow clone — when it
           doesn't, the clip silently falls back to 16px and the picture pours
           into letters a fifth of the size of the visible ones. */
        var fs = Math.max(84, Math.min(window.innerWidth * 0.235, 340));
        wmText.setAttribute('font-size', fs.toFixed(1));
        /* then shrink to fit: 'HÓTELIÐ' is seven characters against 'BRÚIN's
           five, so one shared clamp cannot serve both wordmarks. Measure the
           rendered run and scale down if it would reach the page margins. */
        var room = r.width * 0.88;
        if (wmText.getComputedTextLength) {
          var w = wmText.getComputedTextLength();
          if (w > room && w > 0) {
            fs = Math.max(52, fs * (room / w));
            wmText.setAttribute('font-size', fs.toFixed(1));
          }
        }
        wmText.setAttribute('x', (r.width / 2).toFixed(1));
        // centre the CAPS optically, not the em box: uppercase-only text sits
        // high in its em square and a plain middle leaves it visibly above centre
        wmText.setAttribute('y', (r.height / 2 + fs * CAP * 0.5).toFixed(1));
        /* the offset strike is a RATIO of the letter size, not a fixed pixel
           nudge: 10px is a confident letterpress double-strike on a 260px
           wordmark and a blurry edge artefact on a 74px one. Offsetting the
           <use> shifts the INK's letterforms while the crop clip on the layer
           below stays locked to the photograph's real edge. */
        var strike = (fs * 0.038).toFixed(1);
        if (wmUse) { wmUse.setAttribute('x', strike); wmUse.setAttribute('y', strike); }
      };
      syncWordmark();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncWordmark);

      ScrollTrigger.create({
        // opens over just over half a viewport, so the picture is fully out
        // before the hero starts leaving rather than arriving as it goes
        trigger: heroEl, start: 'top top', end: '+=58%',
        scrub: 0.5, invalidateOnRefresh: true,
        onRefresh: applyStart,
        onUpdate: function (self) { writeClip(self.progress); }
      });
      writeClip(0);                     // paint the resting state before any scroll
      window.addEventListener('resize', function () {
        writeClip(0); syncWordmark();
      }, { passive: true });
    }

    /* word-mask rises */
    document.querySelectorAll('[data-headline]').forEach(function (h) {
      var words = h.querySelectorAll('.br-word');
      if (!words.length) return;
      gsap.fromTo(words, { yPercent: 116, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: 1.05, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
    });

    /* THE FILM — pinned and scrubbed */
    var filmWrap = document.querySelector('.br-film');
    var canvas = document.querySelector('.br-film__canvas');
    // alpha:true on purpose: an opaque context paints solid BLACK before the
    // first frame lands. Transparent lets the daylight still show through.
    var ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;
    var stillImg = document.querySelector('.br-film__still img');
    var shown = -1;

    // Cover-fit, biased UP the frame. The source's bottom third is empty
    // volcanic gravel, so a centred crop spends a third of the viewport on
    // nothing; 0.36 keeps the roofline and sky and trims the dead ground.
    function drawCover(img) {
      if (!canvas || !ctx || !img.naturalWidth) return;
      var cw = canvas.width, ch = canvas.height;
      var sc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * sc, h = img.naturalHeight * sc;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) * 0.36, w, h);
    }

    function paint(idx) {
      if (!canvas || !ctx || !canvas.width) return;
      var any = false, k;
      for (k = 0; k < shots.length; k++) { if (shots[k]) { any = true; break; } }
      if (!any) {                       // nothing decoded yet: hold the still
        if (stillImg && stillImg.complete) drawCover(stillImg);
        return;
      }
      var i = idx;
      if (!shots[i]) {                  // nearest frame we hold, so a partial load still animates
        var loI = i, hiI = i;
        while (loI >= 0 || hiI < shots.length) {
          if (loI >= 0 && shots[loI]) { i = loI; break; }
          if (hiI < shots.length && shots[hiI]) { i = hiI; break; }
          loI--; hiI++;
        }
      }
      var img = shots[i];
      if (!img || i === shown) return;
      shown = i;
      canvas.dataset.frame = String(i);   // exposed so the harness can assert it
      drawCover(img);
    }

    function sizeCanvas() {
      if (!canvas || !canvas.clientWidth || !canvas.clientHeight) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);  // a 4K blit per frame buys nothing
      var w = Math.round(canvas.clientWidth * dpr);
      var h = Math.round(canvas.clientHeight * dpr);
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w; canvas.height = h;
      var keep = shown; shown = -1; paint(Math.max(0, keep));
    }

    if (filmWrap && canvas) {
      var caps = document.querySelectorAll('.br-film__cap');
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: filmWrap, start: 'top top', end: '+=300%',
          pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true,
          // a pin poisons every trigger created below it unless it re-measures first
          refreshPriority: 1,
          onUpdate: function (self) {
            paint(Math.min(FRAME_COUNT - 1, Math.round(self.progress * (FRAME_COUNT - 1))));
            // exact handoff: one caption ends where the next begins
            var on = self.progress < 0.5 ? 'day' : 'eve';
            caps.forEach(function (c) { c.classList.toggle('is-on', c.dataset.cap === on); });
          }
        }
      });
      filmST = tl.scrollTrigger || null;

      window.addEventListener('br:firstframe', function () { shown = -1; paint(0); });
      if (shots[0]) { shown = -1; paint(0); }
      ScrollTrigger.addEventListener('refresh', sizeCanvas);
      sizeCanvas();
      window.addEventListener('resize', sizeCanvas, { passive: true });
    }
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (t) { drift(); lenis.raf(t * 1000); });
  gsap.ticker.lagSmoothing(0);
  drift();

  /* A HIDDEN TAB PAUSES rAF, which starves the Lenis -> ScrollTrigger loop while
     native scrolling keeps moving underneath it: you come back to a hero whose
     crop never opened, a film stuck on frame 0 and a palette that never scrubbed.
     Re-sync on the way back in. ScrollTrigger.update(), never refresh(): a
     refresh here recalculates the pinned film's spacer and poisons every trigger
     that starts after it. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    lenis.resize();
    ScrollTrigger.update();
  });

  /* ── hero film: their own clip, only sky and sea generated ──────────── */
  var hf = document.getElementById('heroFilm');
  if (hf && !reduced) {
    hf.addEventListener('canplay', function () { hf.classList.add('is-ready'); }, { once: true });
    var hp = hf.play(); if (hp && hp.catch) hp.catch(function () {});
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? hf.play().catch(function () {}) : hf.pause(); });
    }, { threshold: 0.01 }).observe(hf);
  }

  /* ── nav ground ─────────────────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var heroSec = document.getElementById('hero');
  gsap.ticker.add(function () {
    if (!nav) return;
    var past = heroSec ? heroSec.getBoundingClientRect().bottom <= (nav.offsetHeight + 4) : window.scrollY > 40;
    nav.classList.toggle('is-solid', past);
  });

  /* ── menu / switcher / form ─────────────────────────────────────────── */
  function initMenu(l) {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('menu');
    if (!burger || !menu) return;
    var open = false;
    function set(v) {
      open = v;
      burger.setAttribute('aria-expanded', v ? 'true' : 'false');
      burger.setAttribute('aria-label', v ? 'Loka valmynd' : 'Opna valmynd');
      if (v) {
        menu.hidden = false;
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
        if (l) l.stop();          // body overflow does NOT lock scroll under Lenis
      } else {
        menu.classList.remove('is-open');
        if (l) l.start();
        setTimeout(function () { if (!open) menu.hidden = true; }, 380);
      }
    }
    burger.addEventListener('click', function () { set(!open); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { set(false); burger.focus(); }
    });
    menu.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () { set(false); });
    });
  }

  function initSwitch() {
    var sw = document.querySelector('.br-switch');
    if (!sw) return;
    var btns = Array.prototype.slice.call(sw.querySelectorAll('button'));
    var ink = sw.querySelector('.br-switch__ink');
    var states = Array.prototype.slice.call(document.querySelectorAll('.br-state'));
    function moveInk(b) { if (ink && b) { ink.style.width = b.offsetWidth + 'px'; ink.style.transform = 'translateX(' + b.offsetLeft + 'px)'; } }
    function set(name, focus) {
      btns.forEach(function (b) {
        var on = b.dataset.set === name;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (on) { moveInk(b); if (focus) b.focus(); }
      });
      states.forEach(function (s) {
        var on = s.dataset.state === name;
        s.classList.toggle('is-on', on);
        s.hidden = !on;
      });
      var f = document.getElementById('f-fjoldi');
      if (f) f.value = name === 'tvo' ? 2 : name === 'fjolskylda' ? 4 : 20;
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.set); }); });
    sw.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); set(btns[(i + 1) % btns.length].dataset.set, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); set(btns[(i - 1 + btns.length) % btns.length].dataset.set, true); }
    });
    set('tvo');
    window.addEventListener('resize', function () { moveInk(sw.querySelector('[aria-checked="true"]')); });
  }

  function initForm() {
    var form = document.getElementById('form');
    var msg = document.getElementById('formMsg');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var need = ['f-nafn', 'f-sim', 'f-dags', 'f-fjoldi'];
      for (var i = 0; i < need.length; i++) {
        var el = document.getElementById(need[i]);
        if (!el.value.trim()) { msg.textContent = 'Please fill in the missing field.'; el.focus(); return; }
      }
      // snapshot at submit: a live-derived panel mutates if the user keeps typing
      var nafn = document.getElementById('f-nafn').value.trim();
      var fj = document.getElementById('f-fjoldi').value;
      msg.textContent = 'Thank you ' + nafn + '. Enquiry for ' + fj + ' noted. This is a prototype, no enquiry was actually sent.';
      form.reset();
    });
  }

  initMenu(lenis); initSwitch(); initForm();

  /* ── preloader: counts REAL loading, never a fake timer ──────────────── */
  var loader = document.getElementById('loader');
  function showLoader() {
    if (!loader) return false;
    if (new URLSearchParams(location.search).has('loader')) return true;
    try { return !sessionStorage.getItem('br_seen'); } catch (e) { return true; }
  }

  if (!showLoader()) {
    if (loader) loader.remove();
    window.dispatchEvent(new Event('br:revealed'));
  } else {
    try { sessionStorage.setItem('br_seen', '1'); } catch (e) { /* private mode */ }
    body.classList.add('is-loading');
    var mark = document.getElementById('loaderMark');
    var pctEl = document.getElementById('loaderPct');
    var t0 = performance.now(), shownPct = 0;
    var hero = document.querySelector('.br-hero__panel img');
    var heroDone = hero ? hero.complete : true;
    var fontsDone = false;
    if (hero && !heroDone) {
      hero.addEventListener('load', function () { heroDone = true; }, { once: true });
      hero.addEventListener('error', function () { heroDone = true; }, { once: true });
    }
    document.fonts.ready.then(function () { fontsDone = true; });

    var FLOOR = 1100, CAP = 2400;
    (function tick() {
      var t = performance.now() - t0;
      var target = (heroDone ? 55 : Math.min(50, t / 24)) + (fontsDone ? 45 : 0);
      if (t >= CAP) target = 100;
      shownPct += (target - shownPct) * 0.12;   // the data is real, the ease is ours
      var d = Math.min(100, Math.round(shownPct));
      if (pctEl) pctEl.textContent = d + '%';
      if (mark) mark.style.backgroundPositionX = (100 - d) + '%';
      if (d >= 100 && t >= FLOOR) {
        loader.classList.add('is-leaving');
        body.classList.remove('is-loading');
        setTimeout(function () {
          if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
          window.dispatchEvent(new Event('br:revealed'));
        }, 900);
        return;
      }
      requestAnimationFrame(tick);
    })();
  }

  // start the film downloading unconditionally, held a beat so the hero wins
  // the connection first, then nothing can stop it
  setTimeout(function () {
    loadFrames(function () { window.dispatchEvent(new Event('br:firstframe')); });
  }, 700);
})();
