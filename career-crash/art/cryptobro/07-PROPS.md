# Crypto Bros 7: small props

> Part of the Crypto Bros art set (`art/cryptobro/README.md`). Same format
> as the main game's item sheets (`art/items/careers-a.png`).

Things bros throw, pick up and trip over: airdrop crates parachute in,
coins scatter after a liquidation, and the floor is littered with start-up
junk.

**Reference to attach:** `art/items/careers-a.png`.

## Format

- **1254 × 1254 px,** transparent, **4 columns × 2 rows,** one object per
  cell, nothing touching the cell edges, reading order as listed.

## House style (paste first)

> Pixel-art game asset sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached sheet: chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colour fills with one shade tone, light from the
> top left, bright readable palette, 3/4 top-down view. 1254 × 1254,
> transparent background, 4 × 2 grid, one object per cell with generous empty
> space around it. No text, no letters, no numbers, no logos, no coin
> symbols, no shadow.

## Sheet 1: `art/items/cryptobro-a.png`

> [House style] In reading order: (1) a wooden airdrop supply crate with a
> small white parachute bundled on top; (2) the same crate under an open
> white parachute, floating; (3) a single big shiny gold coin, plain, a rim
> and a glint, no symbol; (4) a small pile of plain gold coins; (5) a
> hardware crypto wallet (a small black USB-stick-like gadget with a tiny
> screen showing nothing and two buttons); (6) a laminated card with twelve
> blank lines on it (a seed-phrase backup card, lines blank); (7) a mining
> rig: a small open metal frame with four graphics cards and fans; (8) a
> folded paper rocket-ship model ("to the moon").

## Sheet 2: `art/items/cryptobro-b.png`

> [House style] In reading order: (1) a kombucha bottle with a paper label
> (blank); (2) a ring light on a short tripod; (3) a stack of glossy
> "whitepaper" documents with a blue binder clip (pages blank); (4) a
> cardboard box with "WAGMI"-style scrawl (scribbles only, no readable
> letters) and a crumpled hoodie spilling out; (5) a gold-plated
> Lamborghini-shaped toy car key fob (generic sports car shape, no badge);
> (6) a rolled-up rug (for the Rug Pull event); (7) a broken laptop with
> green and red stickers (shapes only); (8) a rubber duck in tiny laser-eye
> sunglasses.

## Manifest (`art/items/manifest.json`)

```json
"cryptobro-a": ["airdrop-crate", "airdrop-parachute", "gold-coin", "coin-pile", "hardware-wallet", "seed-card", "mining-rig", "paper-rocket"],
"cryptobro-b": ["kombucha", "ring-light", "whitepaper-stack", "relaunch-box", "lambo-key", "rolled-rug", "sticker-laptop", "laser-duck"]
```

## Importing

```
pnpm --filter @cc/art-pipeline items
```
