# Broken News 03: the studio floor (brawl arena)

> **Status (9 October 2026):** delivered and in the game: `arena.news-studio`
> ("The BSN Studio", marketOnly with `usedBy: "news"`), all 18 furniture
> pieces.

> Part of the Broken News art set (`art/news/README.md`). Design:
> `docs/career-crash/10-broken-news.md` §3.

Where the anchors land when the argument boils over: the same studio as the
desk shot (brief 01), seen from the high studio camera, so the cut reads as
"the director switched cameras". It's small: two or three fighters, a few
seconds, so the camera stays close.

## A. Backdrop

- **File:** `art/arenas/news-studio.png`, **1774 × 887 px**, opaque.
- **Reference:** attach `art/arenas/trading-floor.png` and copy its camera,
  scale and look, plus `art/news/desk-backdrop.png` if it exists (same studio).
- **Floor area:** the open floor runs from about 35% to 85% of the height,
  across the middle two-thirds of the width. Keep it flat and empty.

> Pixel-art arena backdrop for "Career Crash", a comedic 2D brawler, matching
> the attached trading-floor arena painting in style, camera and scale:
> chunky clean pixel art, thick dark outlines, flat colours with one shade
> tone, 3/4 stage view (we see the floor and the back wall). 1774 × 887,
> opaque. A cable-news studio seen from the high camera: back wall with a big
> video wall of three screens glowing red (blank, no text), navy wall panels
> with chrome trim, a window strip with a night city skyline. Left edge: a
> green-screen weather corner with a blank green wall and a stool. Right
> edge: a make-up station with a lit mirror and a swivel chair. Ceiling edge:
> a lighting rig with studio spotlights. The floor: glossy dark-navy studio
> floor with a faint reflective sheen and a red circular rug in the middle,
> open and empty in the middle two-thirds. No people, no text, no logos.

## B. Furniture (intact)

Big pieces that stand on the floor (obstacles fighters crash into and break).

- **File:** `art/obstacles/news-studio.png`, **1254 × 1254 px**, transparent,
  **3 columns × 2 rows**, one object per cell, nothing touching the cell edges.
- **Reference:** attach `art/obstacles/trading-floor.png`.
- **Order:** `news-desk`, `studio-camera`, `teleprompter`, `weather-screen`, `light-stand`, `guest-sofa`.

> Pixel-art large-object sheet for "Career Crash": chunky clean pixel art,
> thick dark outline (#1b1f2a), flat colours with one shade tone, light from
> the top left, 3/4 top-down view, same scale feel as the attached furniture.
> 1254 × 1254, transparent background, 3 columns × 2 rows, one object per cell
> with generous empty space, in this order: (1) a curved glossy news desk,
> white top and navy front with a red stripe, two closed laptops and a mug;
> (2) a big pedestal studio camera on wheels with a hood and a blank screen;
> (3) a teleprompter on a stand, its glass blank; (4) a free-standing green
> screen on a frame with a weather clicker on a little table; (5) a tall
> studio light stand with a softbox; (6) a small two-seat guest sofa with a
> coffee table. No text, no numbers, no logos.

## C. Furniture, damaged

- **File:** `art/obstacles/news-studio-damaged.png`, same size and grid,
  **same objects in the same order**, attach sheet B.

> [Same preamble as B] The same six objects in the same order and positions,
> each DAMAGED but still standing: (1) desk top cracked, laptop snapped open,
> mug spilled; (2) camera hood bent, cable trailing; (3) teleprompter glass
> cracked; (4) green screen torn and sagging; (5) light stand tilted, softbox
> dented; (6) sofa cushion ripped, coffee table missing a leg.

## D. Furniture, destroyed

- **File:** `art/obstacles/news-studio-destroyed.png`, same size and grid,
  same order, attach sheet B.

> [Same preamble as B] The same six objects in the same order, each
> DESTROYED and lying FLAT on the floor as rubble seen from above: (1) desk
> panels and a squashed laptop; (2) a toppled camera and pedestal parts;
> (3) shattered glass and a bent stand; (4) a heap of green cloth and a
> broken frame; (5) a flattened light stand and broken bulbs; (6) a squashed
> sofa and scattered cushions. Low and flat, nothing standing up.

## Manifest (`art/obstacles/manifest.json`)

```json
"news-studio":           ["news-desk", "studio-camera", "teleprompter", "weather-screen", "light-stand", "guest-sofa"],
"news-studio-damaged":   ["news-desk-damaged", "studio-camera-damaged", "teleprompter-damaged", "weather-screen-damaged", "light-stand-damaged", "guest-sofa-damaged"],
"news-studio-destroyed": { "names": ["news-desk-destroyed", "studio-camera-destroyed", "teleprompter-destroyed", "weather-screen-destroyed", "light-stand-destroyed", "guest-sofa-destroyed"], "px": 130 }
```

## Importing

```
pnpm --filter @cc/art-pipeline arenas
pnpm --filter @cc/art-pipeline items obstacles
```

Then add `arena.news-studio` (`PIPELINES.md`, "Adding an arena"): a small
symmetric arena with the desk in the middle and the anchors' spawns either
side of it, so the first punch lands within a second. It is not part of the
career ladder. Point `brawl.arena` in new episodes at it.
