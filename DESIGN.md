# Veitingahúsið Brúin — DESIGN.md

Hafnargata 26, 240 Grindavík · kt. 690311-1000 · bruin@simnet.is · +354 426 7080
Owners: Inga Sigríður Gunndórsdóttir, Ólafur Arnberg Þórðarson
FB `veitingahusidbruin` · IG `@bruinrestaurant`

**Design read:** local family seafood restaurant on a working harbour, for road-trip
travellers between Keflavík and the Blue Lagoon plus the town's own returning residents.
Warm, plain-spoken, image-led. Leaning to vanilla HTML/CSS/JS with GSAP + Lenis, no
build step, in the ERNA/Ölvisholt lineage.

**Dials:** VARIANCE 7 · MOTION 6 · DENSITY 3

---

## 1. The concept: "Ljósin eru kveikt" (the lights are on)

**Engine: the Mirror House engine, transplanted and re-aimed.** v1 of this page was a
generic spine with a good palette on it (measured: scrub 68 vs 0 against the reference).
v2 ports the five devices that make that page work, as BEHAVIOUR rather than tokens:

1. **One master scroll writes the whole page's palette.** No section has a fixed ground.
   Mirror House is one NIGHT (ice to basalt). This is one harbour DAY that ends with the
   windows lit, which is literally the sentence their own section says out loud: first
   light at 0.0, daylight held to 0.60, a fast crossover, dusk, then lit at 1.0. The
   booking form arrives at night with the lights on.
2. **A seam that births the wordmark.** Mirror House splits MIRROR|HOUSE at a vertical
   rule. "Brúin" is one word, so the seam is re-aimed to their building's own long low
   ROOF RIDGE: a horizontal line draws itself, the eyebrow opens upward out of it and the
   name downward. Scroll then keeps parting them.
3. **A pinned, scrubbed canvas frame sequence.** 121 frames of their real building,
   traversing 0 to 120 across a 300% pin. A canvas, never a `<video>` driven by
   currentTime: every assignment is a decoder seek and the film would step, not track.
4. **A preloader counting REAL loading** (hero decode + fonts.ready), 1.1s floor, 2.4s
   cap, once per session, `?loader` forces it, never under reduced motion. It dispatches
   `br:revealed` and the seam chains off that event, never a guessed delay.
5. **Per-word mask rises** on every headline, split in JS with the accessible name preserved.

The reopening is the emotional spine underneath, factual and dated: opened June 2013,
evacuated 10-11 November 2023, reopened June 2025 (Morgunblaðið). Told warmly and once.
No eruption imagery, no disaster language.

**Borðið is NOT the signature.** In v1 a three-state tab switcher was presented as one,
which is what a component library sells, not a design device. It is now what it always
was: a small functional control that pre-fills the booking party size.


## 2. Palette — sampled from their own building, not chosen

Measured off their real exterior photo (8.687 cladding pixels, red-dominant, sat > 0.30):

| Token | Hex | Source |
|---|---|---|
| `--ground` | `#2F2B22` | the black volcanic gravel the building stands on |
| `--iron` | `#73433A` | MEAN of the red corrugated cladding |
| `--iron-deep` | `#462828` | its most common shadowed panel tone |
| `--iron-lift` | `#8C4B3C` | cladding lifted for screen use on dark grounds |
| `--sky` | `#93B7D3` | the pale nordic sky in the same frame |
| `--roof` | `#ACB6B8` | the cool grey metal roof |
| `--paper` | `#E4E0D1` | warm off-white from the window frames |

This is an iron-oxide red against volcanic black with a cold sky blue. It is not the
banned beige/brass/espresso premium-consumer default, and it is not the dark-luxury
gold-and-serif reflex. Every value is sampled from their own building, which is the
explicit override for using an oxblood family at all.

**One accent, locked:** `--iron-lift`. It does not change between sections.

## 3. Type

- **Display:** Cabinet Grotesk — sturdy, characterful, matches corrugated metal.
- **Body:** Switzer.
- Both are Fontshare families already owned locally (`~/Design fonts/`), so they ship
  as real self-hosted `@font-face` kits, never a CDN link.
- **HARD GATE before build:** render `Þ ð Æ æ Ö ö Á Í Ó Ú Ý É` in both faces and confirm
  every glyph exists and the acutes are drawn attached. Anton is banned here — it draws
  uppercase Í/Á detached and high, which has already cost a round on an Icelandic
  headline. Multi-line display leading stays ≥ 1.16.

## 4. Motion table

| Element | Device | Driver | Reduced motion |
|---|---|---|---|
| Whole document | palette lerp across 6 stops, one writer | master ScrollTrigger, scrubbed | fixed mid-palette |
| `is-night` | flipped from canvas LUMINANCE, never a progress threshold | derived | day |
| Hero wordmark | roof-ridge seam draws, eyebrow up + name down out of it | `br:revealed` event | fully open |
| Hero, on scroll | eyebrow and name keep parting, rule grows past them | scrub 0.6 | static |
| Film | 121-frame canvas sequence | pinned +300%, scrub | still + one caption |
| Film captions | exact handoff at 0.5 | same trigger | first caption only |
| Headlines | per-word mask rise | IO, once | visible |
| Photographs | Heklusýn drift, clamped +/-1 | ticker, reads batched before writes | static |

Verified in headless Chrome, not by eye: the palette and the film are asserted
**reversible** (scroll back and the value falls again), which is the only thing that
distinguishes a scrubbed value from a one-shot that happens to animate.


## 5. Sections (11)

1. Hero — the building, full-bleed, glazed corner, wordmark
2. Opið aftur — the reopening, warm, factual, once
3. **Borðið** — the signature switcher
4. Matseðill — menu (BLOCKED on real prices)
5. Fiskisúpan — the Captain's fish soup as the one hero dish
6. Húsið — the room, 135 seats, the terrace
7. Fyrir börnin — kids' corner (mounts in Fjölskylda)
8. Hópar — groups menu (mounts in Hópur)
9. Hvar — harbour, Blue Lagoon proximity, map
10. Bókun — request-to-book form, the phone-line replacement
11. Footer — hours, phone, address

No two sections share a layout family. Max 3 eyebrows across 11 sections.


---

## 7. ASSETS — this is the gate, and it is not clear

### What we actually have (all eyeballed, not assumed)

| File | Size | What it is | Verdict |
|---|---|---|---|
| `fl-1.jpg` | 800×600 | **the building** — red corrugated cladding, glazed corner, terrace, black gravel, sea at left | THE anchor. Too small for a hero at native size |
| `fl-2.jpg` | 800×600 | burger + fried egg + fries, heavy 2013 vignette filter | weak, small use only |
| `fl-3.jpg` | 800×600 | homemade carrot cake on a silver platter | charming, low quality |
| `untappd-1..6` | 1512×2016 | customer beer check-ins | **interior intelligence only, never publishable** |

The Untappd photos are not assets but they told us the room: wood tables, brown leather
banquettes, teal-green accent walls, pendant lighting, tiled floor, and lace doilies on
every table. Warm, casual, unpretentious. This is why any dark-luxury treatment is wrong.

### Missing, and blocking a full build

- interior photography at resolution
- the harbour view from the dining-room window (their single best selling point)
- the fish soup, and food shot this decade
- a logo or wordmark of any kind (none found anywhere)
- real menu prices (none found anywhere)
- confirmed current opening hours (sources conflict: 12:00-21:00 vs a breakfast/lunch split)

### Generation plan — where it genuinely earns its place

1. **Upscale `fl-1.jpg`** to 4K via `upscale_image`. Legitimate: it is their real
   building, and upscaling architecture is enhancement. (Upscaling a *person* would be
   fabrication and stays banned.)
2. **Kling 3.0 ambient loop** from the upscaled frame: camera locked, only sky and sea
   move, palindrome-concatenated so the loop is seamless. ~20 credits against a 2.034
   balance. This is the one impossible-to-photograph asset — we cannot fly to Grindavík.
3. **Nothing else is generated.** No invented interiors, no invented food, no invented
   town. Generating a real place we have not seen is fabrication, not art direction.

---

## 8. Honesty guardrails

- **Never invent:** prices, founding-year narrative, ownership characterisation
  ("family-run" is NOT sourced), review scores, awards, seat counts beyond the sourced 135.
  Grep before QA: `fjölskyldu|síðan 19|síðan 20|ára reynsl|verðlaun|vinsæl|best|fremst`.
- **Zero em-dashes** in any customer-facing Icelandic copy.
- **Icelandic gender agreement** on every invented noun phrase; check any noun used twice.
- Distance to the Blue Lagoon is cited as 5 min in one source and 10 in another — say
  neither until confirmed, or say "við Bláa lónið".
- The reopening date is sourced to Morgunblaðið. The evacuation date is public record.
  Nothing else about the eruption period gets stated.
- ISK grouped with a period by hand, never `Intl`/ICU.

## 9. Open questions for the owner (and the reason to make contact)

1. Current opening hours, confirmed.
2. Menu with real prices.
3. Any logo file at all.
4. Photographs: the room, the window view, the fish soup.
5. Whether they want the reopening mentioned publicly. **This is theirs to decide, not
   ours** — and it is the single most important question on the list.
