# Diplomatic Incident 09: The Summit Hall (backdrop and furniture)

> **Status:** not delivered yet. The floor borrows the Office painting and furniture until then.

> Part of the Diplomatic Incident art set (`art/incident/README.md`).

The only arena of the Diplomatic Incident: a grand international summit
hall where ten delegates brawl around the clock. It must look important,
formal and slightly over-catered at the edges, with an **open floor in the
middle** where ten fighters fit.

## A. Backdrop

- **File:** `art/arenas/summit-hall.png`, **1774 × 887 px**, opaque.
- **Reference:** attach `art/arenas/trading-floor.png` and copy its camera,
  scale and look. The game draws fighters on the floor area, so leave it clear.
- **Floor area:** the open floor runs from about 30% to 82% of the height,
  across the middle two-thirds of the width. Keep it flat and empty.

> Pixel-art arena backdrop for "Career Crash", a comedic 2D brawler, matching
> the attached trading-floor arena painting in style, camera and scale:
> chunky clean pixel art, thick dark outlines, flat colours with one shade
> tone, 3/4 stage view (we see the floor and the back wall). 1774 × 887,
> opaque. A grand international summit hall. Back wall: tall wood panelling,
> a raised chairperson's podium in the centre with a gavel block and a
> microphone, a huge blank pale-blue backdrop banner behind it (no emblem,
> no text), a row of ten empty flagpoles with gold finials along the wall
> (the game hangs the flags), two glass interpreters' booths up on the left
> wall with headsets inside. Left edge: a long buffet table with silver
> tureens, pastries and a coffee urn. Right edge: a roped-off press pen with
> tripods and cameras. The floor: a deep blue carpet with a subtle gold
> pattern, open and empty in the middle two-thirds. Warm chandelier light
> from above. No people, no text, no flags, no logos.

## B. Furniture (intact)

Big pieces that stand on the floor (obstacles fighters crash into and break).

- **File:** `art/obstacles/summit-hall.png`, **1254 × 1254 px**, transparent,
  **3 columns × 2 rows**, one object per cell, nothing touching the cell edges.
- **Reference:** attach `art/obstacles/trading-floor.png`.
- **Order:** `delegate-desk`, `horseshoe-table`, `translation-booth`, `buffet-table`, `press-tripods`, `water-cooler-row`.

> Pixel-art large-object sheet for "Career Crash": chunky clean pixel art,
> thick dark outline (#1b1f2a), flat colours with one shade tone, light from
> the top left, 3/4 top-down view, same scale feel as the attached furniture.
> 1254 × 1254, transparent background, 3 columns × 2 rows, one object per cell
> with generous empty space, in this order: (1) a polished wooden delegate
> desk with a blank name placard, a gooseneck microphone, a glass of water
> and a headset; (2) a curved section of a horseshoe conference table with
> three chairs and microphones; (3) a small free-standing glass
> interpreters' booth with two headsets on a desk inside; (4) a buffet table
> with a white tablecloth, a coffee urn, a tower of pastries and silver
> tureens; (5) a cluster of three press camera tripods with big cameras and
> a boom microphone; (6) a row of three water coolers with paper cups.
> No text, no numbers, no logos, no flags.

## C. Furniture, damaged

- **File:** `art/obstacles/summit-hall-damaged.png`, same size and grid,
  **same objects in the same order**, attach sheet B.

> [Same preamble as B] The same six objects in the same order and positions,
> each DAMAGED but still standing: (1) desk cracked, microphone bent, water
> spilled; (2) table section with a chair tipped and a microphone snapped;
> (3) booth with a cracked glass pane and a headset dangling; (4) buffet
> tablecloth half pulled off, pastries scattered, urn dented; (5) one tripod
> collapsed, a camera lens cracked; (6) one cooler bottle burst, cups everywhere.

## D. Furniture, destroyed

- **File:** `art/obstacles/summit-hall-destroyed.png`, same size and grid,
  same order, attach sheet B.

> [Same preamble as B] The same six objects in the same order, each
> DESTROYED and lying FLAT on the floor as rubble seen from above: (1) desk
> boards and a squashed placard; (2) a broken table segment and toppled
> chairs; (3) shattered glass panes and a flattened booth frame; (4) a heap
> of tablecloth, crushed pastries and a rolling urn; (5) tangled tripod legs
> and a broken camera; (6) flattened coolers in a puddle of cups. Low and
> flat, nothing standing up.

## Manifest (`art/obstacles/manifest.json`)

```json
"summit-hall":           ["delegate-desk", "horseshoe-table", "translation-booth", "buffet-table", "press-tripods", "water-cooler-row"],
"summit-hall-damaged":   ["delegate-desk-damaged", "horseshoe-table-damaged", "translation-booth-damaged", "buffet-table-damaged", "press-tripods-damaged", "water-cooler-row-damaged"],
"summit-hall-destroyed": { "names": ["delegate-desk-destroyed", "horseshoe-table-destroyed", "translation-booth-destroyed", "buffet-table-destroyed", "press-tripods-destroyed", "water-cooler-row-destroyed"], "px": 130 }
```

## Importing

```
pnpm --filter @cc/art-pipeline arenas
pnpm --filter @cc/art-pipeline items obstacles
```

Then Claude points `arena.summit-hall` at its own painting
(`apps/client/src/replay/arena-art.ts`, measuring the floor trapezoid),
swaps the arena's obstacles to the new pieces and adds their sizes to
`packages/content/data/furniture.json`.
