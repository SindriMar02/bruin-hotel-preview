#!/bin/bash
# Publish the PUBLIC files for Brúin to gh-pages from an isolated worktree.
# Never checkout gh-pages inside the main tree: its files live at the repo root,
# so clearing the root there would delete the real source.
# _internal/, the QA scripts, the local server and every SOURCE asset are
# deliberately NOT published: a client preview must never expose internal notes,
# and the 4K master plus the raw Kling render are 13MB of dead weight.
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
WT="$(mktemp -d)/bruin-pages"

git -C "$REPO" worktree add --detach -q "$WT"
cd "$WT"
git branch -D gh-pages >/dev/null 2>&1 || true
git checkout -q --orphan gh-pages
git rm -rq --cached . >/dev/null 2>&1 || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

mkdir -p assets/img assets/fonts assets/vendor
cp "$REPO/index.html" "$REPO/hotel.html" "$REPO/about.html" "$REPO/styles.css" "$REPO/app.js" "$REPO/robots.txt" .
cp "$REPO"/assets/fonts/*.woff2   assets/fonts/
cp "$REPO"/assets/vendor/*.js     assets/vendor/

# SHIPPING ASSETS ONLY. The image list is DERIVED from what the pages actually
# reference, not hand-maintained: the hand-list had silently gone stale and was
# missing the 242 film frames, so a deploy would have shipped a dead film.
# A glob over assets/img would instead drag in the 7.8MB 4K master and the
# 5.6MB raw render, hence: derive, then copy exactly those.
grep -ohE '(src|href)="assets/img/[^"]+"' index.html hotel.html about.html \
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
for p in index.html hotel.html about.html; do
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
# GATE 5 — both routes must reach each other, or the cross-sell is dead
grep -q 'hotel.html' index.html || { echo "BLOCKED: index.html does not link the hotel"; exit 1; }
grep -q 'index.html' hotel.html || { echo "BLOCKED: hotel.html does not link the restaurant"; exit 1; }

echo "staged tree:"; find . -path ./.git -prune -o -type f -print | sort
echo
echo "Review the tree above, then to publish run from $WT:"
echo "  git add -A && git commit -qm 'bruin preview' && git push -f origin gh-pages"
