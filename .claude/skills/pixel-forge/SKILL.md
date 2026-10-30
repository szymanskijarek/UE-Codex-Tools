---
name: pixel-forge
description: Draw Career Crash pixel art as code instead of asking the image generator. Use for flat, geometric art (UI icons, badges, sector chips, ticker plates, simple FX frames) when the owner wants visuals without an imagegen round trip, or says "draw it yourself" / "pixel forge". Not for anything with a face or fur/feathers (characters, critters): the owner judged code-drawn creatures below the painted standard (30 Oct 2026), so those stay with the image agent (PIPELINES.md §5).
---

# Pixel forge: sprites as code

`tools/art-pipeline/src/pixel.ts` turns a small JSON spec (shapes in palette
keys) into a sprite sheet in the house look: flat fills, one shade tone away
from the top-left light, an optional highlight, the thick `#1b1f2a` outline.
Frames land in 256 px cells, 4 per row, the same layout the critter and item
slicers read, so a forged sheet imports exactly like painted art.

## Loop

1. **Draw in SVG** (`career-crash/art/pixel/<name>-a.svg`, one file per
   pose): flat fills, curves, each shade and highlight as its own shape,
   light from the top left, facing right, no gradients, no strokes thinner
   than ~1/64 of the canvas. The forge renders it to the sprite grid, snaps
   every pixel to the drawing's own colours and adds the outline. This reads
   far better than shape ops. Then list it in `career-crash/art/pixel/<name>.json`
   (`{ "size": [64, 64], "frames": ["<name>-a.svg"] }`; 32×32 for icons).
   Shape ops (below) are for tiny icons only.
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

## Spec format (shape ops, for tiny icons)

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

## Know the ceiling

Code-drawn art comes out clean but simpler than the painted art: fewer
pixels of detail, stiffer poses. Fine for icons, badges and plates;
not for creatures or people. When unsure, render it next to painted art at
game size and let the owner choose.

Examples: `art/pixel/rate-hawk.json` + `rate-hawk-a.svg`/`-b.svg` (SVG frames; a
test of the ceiling, not shipped art), `art/pixel/golden-parachute.json` (shape ops).
