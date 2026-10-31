# Regards, Wall Street: art briefs for the image agent

> **Status:** briefs ready (31 October 2026), nothing delivered yet. The page
> runs on borrowed career art and the Crypto Bros' Trading Floor until then.

Art for **careercrash.org/wallstreet** (design: `docs/career-crash/13-regards-wall-street.md`):
the biggest US stocks as office workers, brawling through the New York
trading day. Every company is its **sector's office archetype** (eleven of
them) with the ticker as a label the game adds, so eleven characters cover
the whole market.

**Hand the agent one file at a time**, with the reference images it names.

| # | File | What | Images | Priority |
|---|---|---|---|---|
| 1 | [`01-SECTOR_BODIES.md`](01-SECTOR_BODIES.md) | Body sheets: the 11 sector archetypes, the Floor Specialist (referee) and the Temp | 13 | **1** |
| 2 | [`02-HEADS.md`](02-HEADS.md) | Four heads per character | 4 per character | **1** (after each body) |
| 3 | [`03-PAGE.md`](03-PAGE.md) | Share image for link previews | 1 | 2 |

**Later (not briefed yet, they come with later phases):** the Index Fund
and the Short Seller (13 §5.4, phase 3); *The Exchange* backdrop and
furniture (until then the Trading Floor); company props, the Rate Hawk, Rate
Dove, Dead Cat Bounce and the Golden Parachute (13 §12.1, phase 4). The page
logo and icons are drawn in code (`art/pixel/ws-logo.svg`, the pixel forge).

## Rules that apply to everything

- **No real people.** No likeness of any founder, executive, investor or
  celebrity. No turtlenecks-and-jeans founders, no leather-jacket keynotes,
  nothing that points at a real person. Every character is a made-up
  employee *type*, never a company's boss.
- **No logos, no trade dress, no text.** No company logos, product shapes or
  brand colours, no readable words or numbers. The game adds the ticker.
  Characters are told apart by their **sector colour** and **costume**.
- **No gore,** slapstick only, as in the rest of the game.
- **Same look as Career Crash.** Chunky pixel art, thick dark outline
  (#1b1f2a), flat colours with one shade tone, light from the top left.

## Reference images

All in `career-crash/art/`.

- `heads/_reference/body-sheet-example.webp`: the layout every body sheet copies.
- `sheets/npc-bro-eth.png`: a Crypto Bros sheet, the closest cousin in tone.

## Hand-back

Drop files at the paths the briefs give, then tell Claude "go". The import
commands are at the end of each brief; the game wears the new art the moment
it's imported (each sector's persona is already wired in `markets/stocks.json`).
