# Crypto Bros: art briefs for the image agent

> **Status:** the whole set is delivered and in the game (5 October 2026).

Art for **careercrash.org/cryptobro** (design: `docs/career-crash/08-cryptobro.md`):
an endless brawl between the top 10 cryptocurrencies, each played by a crypto
bro, on a floor called *The Trading Floor*.

The work is split into small briefs. **Hand the agent one file at a time**,
with the reference images that file names. Each file is self-contained: it
repeats the house style and the layout rules it needs.

| # | File | What | Images | Priority |
|---|---|---|---|---|
| 1 | [`01-BROS_BODIES_A.md`](01-BROS_BODIES_A.md) | Body sheets, the first ten bros (BTC … LINK) | 10 | **1** |
| 2 | [`02-BROS_HEADS.md`](02-BROS_HEADS.md) | Four heads per bro | 4 per bro | **1** (after each body) |
| 3 | [`03-TRADING_FLOOR.md`](03-TRADING_FLOOR.md) | Arena backdrop + furniture sheets (intact, damaged, destroyed) | 4 | **2** |
| 4 | [`04-REFEREE.md`](04-REFEREE.md) | Pegged Peggy, the stablecoin referee: body + 5 heads | 6 | **2** |
| 5 | [`05-FX.md`](05-FX.md) | Laser eyes, LIQUIDATED stamp, margin-call strobe, coin shower, gas fog, FUD cloud | 7 | **2** |
| 6 | [`06-CRITTERS.md`](06-CRITTERS.md) | Shiba, frog, bull, bear, whale, black swan (2 poses each) | 2 | 3 |
| 7 | [`07-PROPS.md`](07-PROPS.md) | Small props (hardware wallet, airdrop crate, coins…) | 2 | 3 |
| 8 | [`08-REGULATORS.md`](08-REGULATORS.md) | The Regulators gatecrasher set: leader + two auditors, bodies + heads | 3 + 12 | 4 |
| 9 | [`09-BROS_BODIES_B.md`](09-BROS_BODIES_B.md) | Body sheets, the bench (TON, SHIB, LTC, PEPE, DOT, Anon Bro) | 6 | 4 |
| 10 | [`10-PAGE.md`](10-PAGE.md) | Page logo, share image, ticker portraits frame | 3 | 5 |
| 11 | [`11-MISSING.md`](11-MISSING.md) | **Everything still missing, in one file** (5 Oct 2026) | 38 | ✓ delivered |

Until a piece of art arrives the game uses a stand-in (a borrowed career
puppet, the Office backdrop, a drawn effect), so anything can come in any
order. The order above is the biggest visible gain first.

## Rules that apply to everything

- **No real people.** No likeness of any founder, executive, investor or
  influencer. Every bro is a made-up character.
- **No logos, no text.** No coin logos or symbols (no ₿, no Ξ, no Ð), no
  brand marks, no readable words or numbers anywhere in the art. The game
  adds the ticker as a label. A coin is told apart by its **colour** and its
  **costume**.
- **No gore,** as in the rest of the game: slapstick only.
- **Same look as Career Crash.** Chunky pixel art, thick dark outline
  (#1b1f2a), flat colours with one shade tone, light from the top left.

## Reference images

All in `career-crash/art/`. Each brief says which to attach.

- `heads/_reference/body-sheet-example.webp`: the layout every body sheet copies.
- `arenas/office.png`: the look and camera of the arena paintings.
- `obstacles/office.png`: the look of furniture sheets.
- `items/careers-a.png`: the look of small props.
- `critters/poodle-goose-crab-seagull.png`: the look of critter sheets.
- `items/fx-hit.png`, `items/fx-ko-stars.png`: the look of effect sheets.

## Hand-back

Drop files at the paths the briefs give (create `art/ui/` for the page art), then
tell Claude "go". Import commands are at the end of each brief; Claude runs
them, checks the slicer previews in `tools/art-pipeline/out/`, fixes any
mislabelled parts in the manifests and sends screenshots.
