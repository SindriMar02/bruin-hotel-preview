#!/bin/bash
# Publish the PUBLIC files for Brúin AND Hótel Grindavík to gh-pages from an
# isolated worktree. Both businesses, one site, three routes.
# Never checkout gh-pages inside the main tree: its files live at the repo root,
# so clearing the root there would delete the real source.
# _internal/, the QA scripts, the local server and every SOURCE asset are
# deliberately NOT published: a client preview must never expose internal notes,
# and the 4K master plus the raw Kling render are 13MB of dead weight.
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
WT="$(mktemp -d)/bruin-pages"
ORIGIN="${PREVIEW_ORIGIN:-https://sindrimar02.github.io/bruin-hotel-preview}"

# BUILD ON TOP OF THE PUBLISHED BRANCH, never as a fresh orphan each time.
# An orphan re-root gives the remote unrelated history, so every redeploy after
# the first would need a force push — and a force push is exactly what the
# backup guard blocks, for good reason. Continuing the existing branch keeps the
# history linear, so a plain push always works and nothing is ever rewritten.
# ALWAYS clean up the worktree, including on a failed gate. `set -e` exits
# before the removal line at the bottom, and the leaked worktree then holds the
# gh-pages branch so the NEXT run dies with "already used by worktree".
cleanup() { cd "$REPO" 2>/dev/null || true; git worktree remove --force "$WT" 2>/dev/null || true; git worktree prune 2>/dev/null || true; }
trap cleanup EXIT

git -C "$REPO" fetch -q origin gh-pages 2>/dev/null || true
git -C "$REPO" worktree prune 2>/dev/null || true
git -C "$REPO" worktree add --detach -q "$WT"
cd "$WT"
if git -C "$REPO" rev-parse --verify -q origin/gh-pages >/dev/null; then
  git checkout -q -B gh-pages origin/gh-pages
else
  git checkout -q --orphan gh-pages
  git rm -rq --cached . >/dev/null 2>&1 || true
fi
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

mkdir -p assets/img assets/fonts assets/vendor
cp "$REPO/index.html" "$REPO/hotel.html" "$REPO/restaurant.html" "$REPO/styles.css" "$REPO/app.js" "$REPO/robots.txt" .
cp "$REPO"/assets/fonts/*.woff2   assets/fonts/
cp "$REPO"/assets/vendor/*.js     assets/vendor/

# SHIPPING ASSETS ONLY. The image list is DERIVED from what the pages actually
# reference, not hand-maintained: the hand-list had silently gone stale and was
# missing the 242 film frames, so a deploy would have shipped a dead film.
# A glob over assets/img would instead drag in the 7.8MB 4K master and the
# 5.6MB raw render, hence: derive, then copy exactly those.
grep -ohE '(src|href)="assets/img/[^"]+"' index.html hotel.html restaurant.html \
  | sed -E 's/.*assets\/img\///; s/"$//' | sort -u > /tmp/br-assets.txt
while read -r f; do
  [ -n "$f" ] && cp "$REPO/assets/img/$f" "assets/img/$f"
done < /tmp/br-assets.txt
cp "$REPO/assets/img/favicon.svg" assets/img/
# the frame sequence is referenced from JS, so it can never appear above
cp -R "$REPO/assets/img/frames" "$REPO/assets/img/frames-sm" assets/img/
touch .nojekyll

# GATE 1 — nothing internal may reach the staged tree
if find . -name '_*' -o -name '*-src.*' -o -name 'husid-4k.png' -o -name 'film-raw.mp4' | grep -q .; then
  echo "BLOCKED: an internal or source file reached the staged tree"; exit 1
fi
# GATE 2 — a preview without its own icon inherits the origin root's favicon
test -f assets/img/favicon.svg || { echo "BLOCKED: no favicon"; exit 1; }
# GATE 3 — the preview must stay out of search
for p in index.html hotel.html restaurant.html; do
  grep -q 'noindex' "$p" || { echo "BLOCKED: $p is missing noindex"; exit 1; }
done
grep -q 'Disallow: /' robots.txt || { echo "BLOCKED: robots.txt does not disallow"; exit 1; }
# GATE 4 — every asset the pages reference must exist in the STAGED tree. This
# is the gate that would have caught the missing film frames; without it a
# stale manifest fails silently and only in the browser.
missing=0
while read -r f; do
  [ -n "$f" ] && [ ! -f "assets/img/$f" ] && { echo "BLOCKED: missing asset $f"; missing=1; }
done < /tmp/br-assets.txt
for f in frames/f001.jpg frames/f121.jpg frames-sm/f001.jpg frames-sm/f121.jpg; do
  [ -f "assets/img/$f" ] || { echo "BLOCKED: film frame $f did not stage"; missing=1; }
done
[ "$missing" = 0 ] || exit 1
# GATE 5 — the landing must offer BOTH doors, and each property must reach the
# other and the landing. If the fork breaks, one whole business goes invisible.
grep -q 'restaurant.html' index.html || { echo "BLOCKED: landing has no restaurant door"; exit 1; }
grep -q 'hotel.html' index.html      || { echo "BLOCKED: landing has no hotel door"; exit 1; }
for p in restaurant.html hotel.html; do
  grep -q 'href="index.html"' "$p" || { echo "BLOCKED: $p does not link back to the landing"; exit 1; }
done
grep -q 'hotel.html' restaurant.html || { echo "BLOCKED: restaurant does not link the hotel"; exit 1; }
grep -q 'restaurant.html' hotel.html || { echo "BLOCKED: hotel does not link the restaurant"; exit 1; }
# GATE 6 — a preview shipping without a usable favicon shows the ARTIX helm from
# the origin root in the client's tab. Checks the STAGED tree, byte-for-byte.
node "$REPO"/../_tools/favicon-guard.mjs "$WT"

echo "staged: $(find . -path ./.git -prune -o -type f -print | wc -l | tr -d ' ') files, $(du -sh --exclude=.git . 2>/dev/null | cut -f1 || du -sh . | cut -f1)"

git add -A
git -c user.email=sindri@klubbr.is -c user.name="Sindri Már" \
    commit -q -m "Deploy $(git -C "$REPO" rev-parse --short HEAD) (noindex preview)" || echo "(nothing changed)"
git push -q origin gh-pages
cd "$REPO"
echo "published to $ORIGIN"

# GATE 7 — on-disk correct is not proof the client sees an icon: the Pages CDN
# takes a minute. Check the DEPLOYED url. Polls ~3 min.
node "$REPO"/../_tools/favicon-verify-live.mjs "$ORIGIN/"
