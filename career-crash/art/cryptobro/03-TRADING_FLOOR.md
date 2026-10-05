# Crypto Bros 3: The Trading Floor (backdrop and furniture)

> Part of the Crypto Bros art set (`art/cryptobro/README.md`).

The only arena on the Crypto Bros page: a start-up-style trading floor in a
glass tower, where ten bros brawl all day and night. It must look busy and
expensive at the edges, with an **open floor in the middle** where ten
fighters plus animals fit.

## A. Backdrop

- **File:** `art/arenas/trading-floor.png`, **1774 × 887 px**, opaque.
- **Reference:** attach `art/arenas/office.png` and copy its camera, scale and
  look. The game draws fighters on the floor area, so leave it clear.
- **Floor area:** the open floor runs from about 24% to 80% of the height,
  across the middle two-thirds of the width. Keep it flat and empty: no
  desks, chairs or people on it.

> Pixel-art arena backdrop for "Career Crash", a comedic 2D brawler, matching
> the attached office arena painting in style, camera and scale: chunky clean
> pixel art, thick dark outlines, flat colours with one shade tone, 3/4 stage
> view (we see the floor and the back wall). 1774 × 887, opaque. A flashy
> crypto start-up trading floor at the top of a glass tower. Back wall: a
> huge wall of price screens showing green and red zig-zag line charts and
> candlestick bars (no numbers, no letters), a big brass bell on a small
> podium in the centre, floor-to-ceiling windows on the right with a night
> city skyline and a full moon, a neon strip light along the ceiling.
> Left edge: beanbags, a ping-pong table, a kombucha tap. Right edge: a
> humming server rack with blinking lights and a glass meeting room with a
> whiteboard covered in rocket and moon doodles. The floor: polished dark
> concrete with a faint grid, open and empty in the middle two-thirds,
> from just below the screens to near the bottom. Moody purple and teal
> lighting with green and red glows from the screens. No people, no text,
> no numbers, no logos.

## B. Furniture (intact)

Big pieces that stand on the floor (obstacles fighters crash into and
break). Same format as `art/obstacles/office.png`.

- **File:** `art/obstacles/trading-floor.png`, **1254 × 1254 px**,
  transparent, **3 columns × 2 rows**, one object per cell, nothing touching
  the cell edges.
- **Reference:** attach `art/obstacles/office.png`.
- **Order:** `trading-desk`, `screen-wall`, `bell-podium`, `server-rack`, `beanbag-pile`, `gold-bull-statue`.

> Pixel-art large-object sheet for "Career Crash": chunky clean pixel art,
> thick dark outline (#1b1f2a), flat colours with one shade tone, light from
> the top left, 3/4 top-down view, same scale feel as the attached office
> furniture. 1254 × 1254, transparent background, 3 columns × 2 rows, one
> object per cell with generous empty space, in this order:
> (1) a curved trading desk with four chunky monitors showing green and red
> zig-zag charts and a gaming chair; (2) a free-standing wall of six
> screens on a stand, red and green candlestick charts; (3) a small podium
> with a big brass bell hanging from a wooden frame; (4) a tall black server
> rack with blinking green and blue lights and cables; (5) a heap of three
> bright beanbags; (6) a shiny golden charging-bull statue on a marble plinth.
> No text, no numbers, no logos.

## C. Furniture, damaged

- **File:** `art/obstacles/trading-floor-damaged.png`, same size and grid,
  **same objects in the same order**, attach sheet B.

> [Same preamble as B] The same six objects in the same order and positions,
> each DAMAGED but still standing: (1) desk with two cracked monitors, one
> hanging off its arm, chair tipped; (2) screen wall with three screens
> cracked or showing static; (3) podium scuffed, bell knocked crooked;
> (4) server rack dented, a door hanging open, sparks and loose cables;
> (5) beanbags split with filling spilling out; (6) bull statue chipped,
> one horn snapped off.

## D. Furniture, destroyed

- **File:** `art/obstacles/trading-floor-destroyed.png`, same size and grid,
  same order, attach sheet B.

> [Same preamble as B] The same six objects in the same order, each
> DESTROYED and lying FLAT on the floor as rubble seen from above: (1) a heap
> of desk boards, smashed monitors and a chair wheel; (2) a pile of broken
> screens and a twisted stand; (3) a toppled podium with the bell on its
> side; (4) a flattened server rack with scattered circuit boards; (5) burst
> beanbags and a drift of white filling beads; (6) the bull statue in gold
> chunks around its broken plinth. Low and flat, nothing standing up.

## Manifest (`art/obstacles/manifest.json`)

```json
"trading-floor":           ["trading-desk", "screen-wall", "bell-podium", "server-rack", "beanbag-pile", "gold-bull-statue"],
"trading-floor-damaged":   ["trading-desk-damaged", "screen-wall-damaged", "bell-podium-damaged", "server-rack-damaged", "beanbag-pile-damaged", "gold-bull-statue-damaged"],
"trading-floor-destroyed": { "names": ["trading-desk-destroyed", "screen-wall-destroyed", "bell-podium-destroyed", "server-rack-destroyed", "beanbag-pile-destroyed", "gold-bull-statue-destroyed"], "px": 130 }
```

## Importing

```
pnpm --filter @cc/art-pipeline arenas
pnpm --filter @cc/art-pipeline items obstacles
```

Each piece also needs a size in `packages/content/data/furniture.json`
(Claude adds it on import).
