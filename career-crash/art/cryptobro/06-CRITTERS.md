# Crypto Bros 6: critters

> **Status:** both sheets delivered and in the game (5 October 2026). They join the fight with the bros' own moves and the scene events (phase 3).

> Part of the Crypto Bros art set (`art/cryptobro/README.md`). Same format
> as the main game's critter sheets (`PIPELINES.md` §5.5b).

Animals that bros summon or that wander in as scene events: Such Wow Wes
and Shiba Sharon summon **shibas**, Degen Dex summons **frogs**, and the market
itself sends a **bull** (green hours), a **bear** (red hours), a **whale**
(big moves) and, very rarely, a **black swan**.

**Reference to attach:** `art/critters/poodle-goose-crab-seagull.png`.

## Format

- **2 rows × 4 cells of 256 px** (1024 × 512), transparent background.
- Each animal takes two cells in a row: **pose A** (standing) then **pose B**
  (moving), facing right, feet on the bottom of the cell, nothing crossing a
  cell edge.
- The bull, bear and whale are big: draw them filling their cell. The game
  sets their real size.

## House style (paste first)

> Pixel-art critter sheet for "Career Crash", a comedic 2D workplace brawler,
> matching the attached sheet: chunky clean pixel art, thick dark outline
> (#1b1f2a), flat colours with one shade tone, light from the top left, cute
> cartoon proportions, 3/4 side view facing right. 1024 × 512, transparent
> background, 2 rows × 4 cells of 256 px, each animal as pose A (standing)
> then pose B (moving), feet on the bottom edge of the cell. No text, no
> logos, no shadow.

## Sheet 1: `art/critters/shiba-frog-bull-bear.png`

> [House style] In reading order: (1) a fluffy orange-and-cream shiba inu dog
> standing, curly tail, smug side-eye; (2) the same shiba mid-run, ears back,
> tongue out; (3) a plain round green pond frog sitting, cheeky grin (an
> ordinary frog, not any internet meme frog); (4) the same frog mid-leap;
> (5) a muscular green-tinted cartoon bull standing, steam from the nostrils,
> horns forward; (6) the same bull charging, head down, dust kicking up;
> (7) a big red-brown cartoon bear standing on all fours, grumpy; (8) the
> same bear up on its hind legs, swiping a paw.

## Sheet 2: `art/critters/whale-swan.png`

> [House style] In reading order: (1) a chubby blue cartoon whale wearing a
> tiny business suit and tie, upright on its tail like it's waddling, smug;
> (2) the same whale mid-waddle, tilted, a small water spout from its head;
> (3) a sleek black swan standing, red beak, menacing; (4) the same black
> swan wings spread, attacking; (5)–(8) empty cells (leave transparent).

## Manifest (`art/critters/manifest.json`)

```json
"shiba-frog-bull-bear": ["shiba", "shiba-b", "frog", "frog-b", "bull", "bull-b", "bear", "bear-b"],
"whale-swan":           ["whale", "whale-b", "black-swan", "black-swan-b", null, null, null, null]
```

## Importing

```
pnpm --filter @cc/art-pipeline critters
```

Each critter also needs `art.heightMm` in its summon (Claude adds it on
import: shiba 500, frog 300, bull 1700, bear 1900, whale 2400, black swan 900).
