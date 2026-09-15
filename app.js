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

    /* THE INTRO. Runs once, after the loader leaves (or at once without one). */
    var seam = document.getElementById('wmSeam');
    var wmTop = document.getElementById('wmTop');
    var heroEl = document.getElementById('hero');
    var heroMedia = document.getElementById('heroMedia');
    var heroImg = document.getElementById('heroImg');
    var heroMask = document.getElementById('heroMask');
    var heroShade = document.getElementById('heroShade');
    var heroFoot = heroEl ? heroEl.querySelector('.br-hero__foot') : null;
    var letters = heroMask ? heroMask.querySelectorAll('.br-ch') : [];
    var doors = document.querySelectorAll('.br-door');
    var onReveal = function (fn) {
      if (document.getElementById('loader')) window.addEventListener('br:revealed', fn, { once: true });
      else gsap.delayedCall(0.12, fn);
    };

    if (seam && wmTop) {
      gsap.set(seam, { scaleX: 0 });
      gsap.set(wmTop, { opacity: 0, y: 12 });
    }
    if (letters.length) gsap.set(letters, { yPercent: 108 });
    if (heroMedia) gsap.set(heroMedia, { scale: 1.12 });
    if (heroFoot) gsap.set(heroFoot, { opacity: 0, y: 18 });

    /* the doors open from the seam between them: each photograph grows out of
       the shared edge (side by side on desktop, stacked on a phone) */
    var doorMedia = [], doorBodies = [];
    if (doors.length === 2) {
      var sideBySide = window.matchMedia('(min-width:860px)').matches;
      var shut = sideBySide ? ['inset(0% 0% 0% 100%)', 'inset(0% 100% 0% 0%)']
                            : ['inset(100% 0% 0% 0%)', 'inset(0% 0% 100% 0%)'];
      doors.forEach(function (d, i) {
        var m = d.querySelector('.br-door__media');
        doorMedia.push(m);
        gsap.set(m, { clipPath: shut[i] });
        doorBodies.push(d.querySelectorAll('.br-door__body > *'));
      });
      gsap.set(doorBodies, { opacity: 0, y: 22 });
    }

    onReveal(function () {
      var tl = gsap.timeline();
      if (heroMedia) tl.to(heroMedia, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0);
      if (letters.length) tl.to(letters, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }, 0.1);
      if (seam && wmTop) {
        tl.to(seam, { scaleX: 1, duration: 0.9, ease: 'expo.out' }, 0.35)
          .to(wmTop, { opacity: .9, y: 0, duration: 1.0, ease: 'expo.out' }, 0.5);
      }
      if (heroFoot) tl.to(heroFoot, { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out' }, 0.7);
      if (doorMedia.length) {
        tl.to(doorMedia, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', stagger: 0.08,
          onComplete: function () { gsap.set(doorMedia, { clearProps: 'clipPath' }); } }, 0)
          .to(doorBodies[0], { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.8)
          .to(doorBodies[1], { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 }, 0.88);
      }
    });

    /* THE SCROLL. The picture pushes in and darkens while the name lifts away;
       all scrubbed to the hero's own height, all transform/opacity. */
    if (heroEl && heroImg && heroMask) {
      var st = { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 0.6 };
      gsap.fromTo(heroImg, { scale: 1, yPercent: 0 }, { scale: 1.14, yPercent: 7, ease: 'none', scrollTrigger: st });
      gsap.fromTo(heroMask, { yPercent: 0, opacity: 1 }, { yPercent: -60, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: heroEl, start: 'top top', end: '70% top', scrub: 0.6 } });
      if (heroShade) gsap.fromTo(heroShade, { opacity: 0 }, { opacity: 0.7, ease: 'none', scrollTrigger: st });
      var copyEls = heroEl.querySelectorAll('.br-hero__top, .br-hero__foot > *');
      gsap.fromTo(copyEls, { opacity: 1 }, { opacity: 0, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: heroEl, start: '8% top', end: '45% top', scrub: 0.6 } });

      /* THE POINTER. A fine pointer drifts the picture a few pixels one way and
         the name the other: depth without a gimmick. Touch never sees it. */
      if (window.matchMedia('(hover:hover) and (pointer:fine)').matches && heroMedia) {
        var mx = gsap.quickTo(heroMedia, 'x', { duration: 1.1, ease: 'power3.out' });
        var my = gsap.quickTo(heroMedia, 'y', { duration: 1.1, ease: 'power3.out' });
        var wx = gsap.quickTo(heroMask, 'x', { duration: 1.3, ease: 'power3.out' });
        heroEl.addEventListener('pointermove', function (e) {
          var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
          mx(nx * -22); my(ny * -14); wx(nx * 10);
        }, { passive: true });
        heroEl.addEventListener('pointerleave', function () { mx(0); my(0); wx(0); });
      }
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
    var hero = document.getElementById('heroImg');
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
