---
name: pixel-forge
description: Draw Career Crash pixel art as code instead of asking the image generator. Use for small art (critters with 2 poses, props, held items, hats, FX frames, UI icons, ticker badges) when the owner wants new visuals without an imagegen round trip, or says "draw it yourself" / "pixel forge". Not for character body sheets or faces (those stay painted, PIPELINES.md §5).
---

# Pixel forge: sprites as code

`tools/art-pipeline/src/pixel.ts` turns a small JSON spec (shapes in palette
keys) into a sprite sheet in the house look: flat fills, one shade tone away
from the top-left light, an optional highlight, the thick `#1b1f2a` outline.
Frames land in 256 px cells, 4 per row, the same layout the critter and item
slicers read, so a forged sheet imports exactly like painted art.

## Loop

1. Write `career-crash/art/pixel/<name>.json` (format below). Draw **facing
   right**, light from the top left, on a 64×64 grid (32×32 for icons and
   held items).
2. Render: `pnpm --filter @cc/art-pipeline pixel <name>` (from `career-crash/`).
3. **Look at it:** Read `tools/art-pipeline/out/pixel/<name>.png` (checkerboard
   preview). Judge the silhouette first: would it read at 48 px? Then fix
   shapes and re-render. Two or three passes is normal.
4. Compare with painted art at game size before calling it done (e.g. next
   to `art/critters/poodle-goose-crab-seagull.png`), and send the owner the
   preview.
5. Import with the slicer the asset belongs to: add the sheet to that
   slicer's manifest (`art/critters/manifest.json`, `art/items/…`) pointing at
   `art/pixel/<name>.png`, or copy it into that folder, then run the slicer
   as `PIPELINES.md` §5 says.

## Spec format

```json
{
  "size": [64, 64],
  "palette": { "b": ["#9a6538", "#62391f", "#c08a55"], "r": ["#d8383a", "#8e2023"] },
  "base": [ ...ops every frame shares... ],
  "frames": [ [ ...pose A ops... ], [ ...pose B ops... ] ],
  "shade": 2,
  "flip": false
}
```

- **Palette:** key → `[base, shade?, light?]`. Keys are single characters.
  `.` erases (transparent), `k` is the outline colour. A key with only a base
  colour gets no shading (use it for details: stripes, feather lines).
- **Ops**, in sprite pixels, later ops paint over earlier ones:
  - `{ "rect": [x, y, w, h], "c": "b" }`
  - `{ "ellipse": [cx, cy, rx, ry], "c": "b" }`
  - `{ "poly": [[x, y], ...], "c": "b" }` (any shape: wings, tails, ties)
  - `{ "line": [x0, y0, x1, y1], "c": "k", "w": 2 }`
  - `{ "rows": ["..bb..", ".bbbb."], "at": [x, y] }` (literal pixels, space = leave)
- The outline is added automatically round the outside. Inside lines (a brow,
  a seam, a briefcase strap) are explicit `k` lines.

## Style rules (same as painted art)

- No logos, no readable text or numbers, no real people. The game adds labels.
- Chunky: nothing thinner than 1 px at 64 px, faces as 2–3 px features.
- Big readable silhouette, at most ~8 palette keys, one shade tone each.
- Slapstick, no gore.

Examples: `art/pixel/rate-hawk.json` (a 2-pose critter), `art/pixel/golden-parachute.json` (a prop).
