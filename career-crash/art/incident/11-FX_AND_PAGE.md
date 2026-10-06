# Diplomatic Incident 11: effects and page art

> **Status:** not delivered yet. The page uses emoji and drawn stand-ins until then.

> Part of the Diplomatic Incident art set (`art/incident/README.md`).

Six pictures: three effect sheets for the floor, three images for the page.

## A. Effects (same rules as `art/FX_BRIEF.md`: one row of frames, equal cells, same origin)

**Reference to attach:** `art/items/fx-hit.png` and `art/items/fx-ko-stars.png`.

> Pixel-art game effect for "Career Crash", a comedic 2D workplace brawler.
> Chunky, clean pixel art with a thick dark outline (#1b1f2a) on solid
> shapes, flat colour fills with one shade tone, bright readable palette,
> cartoon comic-book energy. Transparent background, no ground shadow, no
> text, no letters, no labels, no watermark, no frame, no characters, no
> blood or gore.

| # | File | Plays when | Frames | Cell (px) | Anchor | Prompt (after the preamble) |
|---|---|---|---|---|---|---|
| 1 | `art/items/fx-gavel.png` | the Chair opens a session, calls recess, or a session ends | 5 | 256 × 256 | centre | A wooden gavel striking a round sound block: raised, swinging down, hitting with a burst of impact lines and a ring, then the ring fading into small sparks. |
| 2 | `art/items/fx-surge.png` | a country's likes jump (SURGE) | 6 | 256 × 256 | centre | A golden upward burst: a small gold spark grows into a rising column of gold chevrons and thumbs-up shapes with sparkles, peaks, then breaks into drifting gold sparkles. |
| 3 | `art/items/fx-derby-clash.png` | the two derby rivals hit each other | 5 | 256 × 256 | centre | Two big comic-book clash shapes slamming together from the left and right (one blue, one red), a white starburst between them, then crackling sparks scattering. |

Manifest (`art/items/manifest.json`): `"fx-gavel": { "grid": [5, 1] }`,
`"fx-surge": { "grid": [6, 1] }`, `"fx-derby-clash": { "grid": [5, 1] }`.

## B. Page art

**Reference to attach:** `art/ui/cryptobro-logo.png` and `art/arenas/office.png`.

| # | File | Size | Prompt |
|---|---|---|---|
| 4 | `art/ui/incident-logo.png` | 512 × 512, transparent | Pixel-art game logo emblem for "Career Crash": a chunky wooden gavel crossed with a cartoon boxing glove over a round globe in gold and navy, thick dark outline (#1b1f2a), flat colours with one shade tone. No text, no letters, no real flags. |
| 5 | `art/ui/incident-share.jpg` | 1200 × 630, opaque | Pixel-art promotional scene for "Career Crash", a comedic brawler, in the style of the attached arena: a grand summit hall with a blue carpet and chandeliers, five delegates in loving versions of national dress mid-brawl (a Scot in a kilt tossing a gentleman in a bowler hat, a flamenco dancer stamping, a Mexican mariachi leaping off a conference table, a Muay Thai fighter blocking), a chairperson banging a gavel in the background, pastries flying from a buffet. Leave the top-left third calm (the page puts the title there). Friendly slapstick, no gore, no text, no flags, no logos. |
| 6 | `art/ui/incident-icon.png` | 512 × 512, transparent | The gavel-and-glove emblem from the logo on its own, simplified to read at 64 px. |

## Importing

Effects: `pnpm --filter @cc/art-pipeline items` (Claude adds the effect ids to
`apps/client/src/replay/impact-fx.ts`). Page art goes straight into the page
build (no atlas step); Claude converts it to WebP and wires the logo, the
share card (`og:image`) and the icons in `apps/client/incident/index.html`.
