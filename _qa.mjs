// Brúin QA. Headless Chrome: the preview pane suspends rAF while backgrounded,
// so a pin holds (CSS) while the scrub tween freezes, and a frozen film is
// indistinguishable from a working one on a static read.
// Run: node bruin-grindavik/_qa.mjs
import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';

// pass a route to test it: `node _qa.mjs http://localhost:5321/hotel.html`
const URL = process.argv[2] || 'http://localhost:5321/';
let HAS_FILM = true, HAS_HERO = true;   // detected from the DOM after load, not
                                        // guessed from the URL: routes differ
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROFILE = '/private/tmp/claude-501/-Users-sindri-Documents-Website-redesign-mockups/a7e40b8f-1958-4e1d-9e46-56a6fc7054fd/scratchpad/qa-profile';

const out = [];
const log = (ok, name, detail = '') => { out.push({ ok, name }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', userDataDir: PROFILE,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

/* ── 0. the loader runs and leaves ─────────────────────────────────────── */
await page.goto(URL + '?loader', { waitUntil: 'domcontentloaded' });
await sleep(280);
const loaderUp = await page.evaluate(() => !!document.getElementById('loader'));
await sleep(3600);
const loaderGone = await page.evaluate(() => !document.getElementById('loader'));
log(loaderUp && loaderGone, 'preloader mounts then removes itself', `up:${loaderUp} gone:${loaderGone}`);

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await sleep(900);
// which devices does THIS route actually carry?
({ HAS_FILM, HAS_HERO } = await page.evaluate(() => ({
  HAS_FILM: !!document.querySelector('.br-film'),
  HAS_HERO: !!document.getElementById('hero'),
})));

/* helper: walk to an absolute scroll depth and settle */
const at = async (frac) => {
  await page.evaluate(f => {
    const H = document.documentElement.scrollHeight - innerHeight;
    window.scrollTo(0, Math.round(H * f));
  }, frac);
  await sleep(620);
};

/* ── 1. THE PALETTE SCRUB: differs across the page AND reverses ────────── */
const readC = () => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--br-c').trim());
await at(0.05); const c05 = await readC();
await at(0.45); const c45 = await readC();
await at(0.92); const c92 = await readC();
await at(0.45); const c45b = await readC();
const distinct = new Set([c05, c45, c92]).size === 3;
log(distinct && c45 === c45b, 'palette scrub is continuous and reversible',
  `${c05} -> ${c45} -> ${c92}, back to ${c45b}`);

/* night flips from luminance, not a progress threshold.
   NB: read it AT depth. The earlier version checked straight after the
   reversibility probe had already scrolled back to 0.45, i.e. in daylight. */
await at(0.92);
const night = await page.evaluate(() => document.body.classList.contains('is-night'));
await at(0.05);
const day = await page.evaluate(() => !document.body.classList.contains('is-night'));
if (HAS_FILM) log(night && day, 'is-night derives from canvas luminance', `night@0.92:${night} day@0.05:${day}`);

/* ── 2. THE FILM: pinned, frames advance, and the scrub REVERSES ───────── */
// drive the trigger's OWN range: offsetTop is not the pin start once a
// pin-spacer exists, and probing the wrong window made a full traverse look
// like it only reached frame 6 of 120.
await sleep(2200);                                  // let the 121 frames pump in
const filmProbe = await page.evaluate(async () => {
  const st = ScrollTrigger.getAll().find(t => t.pin);
  const cv = document.querySelector('.br-film__canvas');
  if (!st || !cv) return null;
  const read = async (f) => {
    window.scrollTo(0, Math.round(st.start + (st.end - st.start) * f));
    await new Promise(r => setTimeout(r, 560));
    return Number(cv.dataset.frame ?? -1);
  };
  const a = await read(0.02), mid = await read(0.5), end = await read(0.98), back = await read(0.5);
  return { a, mid, end, back };
});
const filmScrubs = filmProbe &&
  filmProbe.end >= 100 &&                           // the whole sequence is reached
  filmProbe.mid > filmProbe.a &&
  Math.abs(filmProbe.back - filmProbe.mid) <= 2;    // reversible: it tracks, not replays
if (HAS_FILM) log(!!filmScrubs, 'film traverses the full sequence and reverses',
  filmProbe ? `${filmProbe.a} -> ${filmProbe.mid} -> ${filmProbe.end}, back to ${filmProbe.back} of 120` : 'no pinned trigger');

const pinned = await page.evaluate(() => {
  const s = document.querySelector('.br-film');
  return !!(s && s.parentElement && s.parentElement.classList.contains('pin-spacer'));
});
if (HAS_FILM) log(pinned, 'film section is genuinely pinned', pinned ? 'pin-spacer present' : 'no pin-spacer');

/* ── 3. the seam reveal fired ─────────────────────────────────────────── */
await at(0);
await sleep(700);
const seam = await page.evaluate(() => {
  const s = document.getElementById('wmSeam');
  const t = document.getElementById('wmGlyphText');
  const g = document.getElementById('heroGlyph');
  const hero = document.getElementById('hero');
  const bb = t ? t.getBBox() : null;
  return {
    seamScale: s ? getComputedStyle(s).transform : 'none',
    glyphClip: g ? getComputedStyle(g).clipPath : '',
    fontSize: t ? parseFloat(t.getAttribute('font-size')) : 0,
    textW: bb ? bb.width : 0,
    heroW: hero ? hero.getBoundingClientRect().width : 0,
  };
});
// matrix(a,...) where a is scaleX. "not none" is NOT enough: a fully-erased
// seam reports matrix(0,0,0,1,0,0) and would pass that weaker check.
const sx = (() => { const m = seam.seamScale.match(/matrix\(([-\d.]+)/); return m ? parseFloat(m[1]) : (seam.seamScale === 'none' ? 1 : NaN); })();
log(sx >= 0.9, 'seam drew', `scaleX ${sx}`);

/* ── 3b. the wordmark's glyph clip is actually wired ──────────────────────
   The failure this catches is silent and ugly: if the <use> clone never picks
   up a font-size, the clip falls back to 16px and the photograph pours into a
   row of letters a fifth of the size of the visible ones, off to one side. */
const glyphOK = /url\(/.test(seam.glyphClip) && seam.fontSize > 60
  && seam.textW > seam.heroW * 0.25;
if (HAS_HERO) log(glyphOK, 'wordmark glyph-clip is wired and full size',
  `clip ${seam.glyphClip} font ${seam.fontSize}px run ${Math.round(seam.textW)}px of ${Math.round(seam.heroW)}`);

/* ── 3c. the crossing actually crosses ────────────────────────────────────
   Measures the RENDERED crop, never the --panel-w token: that token is an
   unresolved min() string, and for a while it was being silently discarded
   while hardcoded JS constants drew the panel. If the crop is ever wider than
   the wordmark, the letters sit entirely inside the picture and the whole
   hero device disappears into one flat colour. */
if (HAS_HERO) {
  const cross = await page.evaluate(() => {
    const hero = document.getElementById('hero');
    const t = document.getElementById('wmGlyphText');
    const cx = parseFloat(getComputedStyle(hero).getPropertyValue('--clip-x')) || 0;
    const panelW = innerWidth * (1 - 2 * cx / 100);
    return { panelW: Math.round(panelW), runW: Math.round(t.getBBox().width) };
  });
  const margin = Math.round((cross.runW - cross.panelW) / 2);
  log(margin >= 30, 'wordmark overhangs the crop on both sides',
    `run ${cross.runW}px vs crop ${cross.panelW}px, ${margin}px each side`);
}

/* ── 4. word-mask headlines resolve ───────────────────────────────────── */
await at(0.35); await sleep(500);
const stuckWords = await page.evaluate(() => {
  let stuck = 0;
  document.querySelectorAll('[data-headline]').forEach(h => {
    const r = h.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    h.querySelectorAll('.br-word').forEach(w => {
      if (parseFloat(getComputedStyle(w).opacity) < 0.9) stuck++;
    });
  });
  return stuck;
});
log(stuckWords === 0, 'in-view headline words resolved', `${stuckWords} stuck`);

/* ── 5. images ────────────────────────────────────────────────────────── */
await page.evaluate(async () => {
  const H = document.body.scrollHeight, vh = innerHeight;
  for (let y = 0; y < H; y += vh * 0.5) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 130)); }
  window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
});
const broken = await page.evaluate(() =>
  [...document.querySelectorAll('img')].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')));
log(broken.length === 0, 'every <img> decoded', broken.join(', ') || 'all decoded');

/* ── 6. contrast over real backdrops ──────────────────────────────────── */
const lum = (r, g, b) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const worstAgainst = async (sel, inkRGB, hideSel) => {
  await page.evaluate(() => window.scrollTo(0, 0)); await sleep(600);
  const box = await page.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.left)), y: Math.max(0, Math.round(r.top)), w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
  }, sel);
  if (!box) return 99;
  await page.evaluate(s => document.querySelectorAll(s).forEach(e => e.style.visibility = 'hidden'), hideSel);
  const buf = await page.screenshot({ clip: { x: box.x, y: box.y, width: box.w, height: box.h }, type: 'png' });
  await page.evaluate(s => document.querySelectorAll(s).forEach(e => e.style.visibility = ''), hideSel);
  const png = PNG.sync.read(Buffer.from(buf));
  const inkL = lum(...inkRGB);
  let worst = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const bl = lum(png.data[i], png.data[i + 1], png.data[i + 2]);
    const ratio = (Math.max(inkL, bl) + .05) / (Math.min(inkL, bl) + .05);
    if (worst === 0 || ratio < worst) worst = ratio;
  }
  return worst;
};
const heroSub = await worstAgainst('.br-hero__sub', [228, 224, 209], '.br-hero__copy');
log(heroSub >= 3, 'hero subtext over its real backdrop', `worst ${heroSub.toFixed(2)}:1`);
const navTel = await worstAgainst('.br-nav__tel', [228, 224, 209], '.br-nav__tel,.br-nav__links,.br-nav__mark');
log(navTel >= 4.5, 'nav text over the sky at scroll 0', `worst ${navTel.toFixed(2)}:1`);

/* ── 7. tap targets (WCAG 2.5.8 exempts links inline in a sentence) ────── */
const taps = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('a,button,input,textarea').forEach(el => {
    if (el.closest('[hidden]')) return;
    if (el.tagName === 'A' && el.closest('p')) return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    if (r.height < 44 || r.width < 44) bad.push(el.tagName + '.' + (el.className || '').toString().slice(0, 24) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  });
  return bad;
});
log(taps.length === 0, 'tap targets >= 44px', taps.slice(0, 5).join(' | ') || 'all pass');

/* ── 8. overflow at three widths ──────────────────────────────────────── */
for (const w of [390, 768, 1440]) {
  await page.setViewport({ width: w, height: 860 });
  await sleep(420);
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  log(o.sw <= o.iw + 1, `no horizontal overflow @${w}`, `${o.sw} vs ${o.iw}`);
}
await page.setViewport({ width: 1440, height: 900 });

/* ── 9. copy gates ────────────────────────────────────────────────────── */
const h1 = await page.evaluate(() => {
  const h = document.querySelector('h1');
  return { aria: h.getAttribute('aria-label'), text: h.textContent.replace(/\s+/g, ' ').trim() };
});
// the visible wordmark is SVG now, so the <h1> carries the name as real text
log(!!h1.aria || h1.text.length > 3, 'h1 has an accessible name', JSON.stringify(h1));

const dashes = await page.evaluate(() => {
  const bad = [];
  document.querySelectorAll('main *, header *, footer *').forEach(el => {
    for (const n of el.childNodes) if (n.nodeType === 3 && /[—–]/.test(n.nodeValue)) bad.push(n.nodeValue.trim().slice(0, 50));
  });
  return [...new Set(bad)];
});
log(dashes.length === 0, 'zero em-dashes in customer copy', dashes.join(' | ') || 'clean');

/* ── 10. reduced motion renders everything ────────────────────────────── */
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
const rm = await page.evaluate(() => {
  const hidden = [];
  document.querySelectorAll('.br-rv, .br-word, section').forEach(el => {
    if (el.closest('[hidden]')) return;
    if (parseFloat(getComputedStyle(el).opacity) < 0.9) hidden.push((el.className || el.tagName).toString().slice(0, 34));
  });
  return [...new Set(hidden)];
});
log(rm.length === 0, 'reduced motion renders every block', rm.slice(0, 4).join(' | ') || 'all visible');

log(errs.length === 0, 'no page errors', errs.slice(0, 2).join(' | ') || 'clean');

await browser.close();
const failed = out.filter(o => !o.ok);
console.log(`\n${out.length - failed.length}/${out.length} passed`);
process.exit(failed.length ? 1 : 0);
