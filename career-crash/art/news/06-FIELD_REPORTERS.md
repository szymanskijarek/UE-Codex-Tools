# Broken News 06: the field reporters

> **Status (9 October 2026):** not delivered yet. Design:
> `docs/career-crash/10-broken-news.md` §13. Until the art lands, the block-out
> stands the TV host's and journalist's career faces in for them, in front of
> the existing arena paintings.

> Part of the Broken News art set (`art/news/README.md`).

Two reporters who appear "live on location", cut in from the desk: full
screen in front of a location backdrop, or in the right-hand box of a split
screen next to an anchor. Same pixel-art house style as the desk pictures, and
the **same canvas, scale and head height as the desk anchors** (attach
`art/news/desk-brock-neutral.png` as the reference), so they sit next to the
anchors in a split screen without looking bigger or smaller.

Locations come from the existing arena paintings, so **draw the reporters
only**, on a transparent background.

## The reporters

**Chase Hurley** (`chase`), American field reporter, he/him, 30s. *A storm
chaser who treats every story as a hurricane: a bright orange waterproof
storm jacket with the hood up, a BSN-red handheld microphone with a square
mic flag (blank), wind-tousled dark hair escaping the hood, a determined jaw,
squinting into wind that isn't there.*

**Rupert Fennimore-Twistleton** (`rupert`), British foreign correspondent,
he/him, 50s. *War-correspondent gravitas for trivial stories: a khaki safari
jacket with too many pockets, a blue shirt, a lanyard press pass (blank), a
neat grey moustache, sunburnt nose, a battered microphone with a blank mic
flag, reading glasses pushed up on his forehead.*

## Layout (both)

- **Canvas:** 1254 × 1254 px, transparent background.
- **Waist up, standing,** facing the camera at a slight 3/4 turn to the
  **left** (they're on the right of the split screen, looking towards the
  anchor's box), holding the microphone in the right hand at chin height.
- Same position and scale in every expression, so the game can swap them
  without a jump. Head about 300 px tall, top of the head about 4% down.
- The microphone's mic flag stays blank: the game prints BSN on it.

## Style preamble (paste first)

> Pixel-art character portrait for "Career Crash", a comedic 2D brawler,
> matching the attached news-anchor picture exactly in style, scale and head
> height: chunky clean pixel art, thick dark outline (#1b1f2a), flat colours
> with one shade tone, light from the top left, friendly cartoon proportions.
> Waist-up, standing, slight 3/4 turn to the left, holding a handheld TV
> microphone at chin height in the right hand. Transparent background,
> 1254 × 1254. No text, no letters, no logos, no background.

## Expressions (seven each; then their -b mouth twins, as in brief 01 D)

| `<expression>` | Chase | Rupert |
|---|---|---|
| `neutral` (waiting, listening in the earpiece) | squinting into the wind, hand on earpiece | grave, patient nod, finger on earpiece |
| `talk` (reporting) | mouth open, shouting over imaginary wind, free hand pointing behind him | mouth open mid-word, solemn, free hand gesturing at the scene |
| `smug` (got the scoop) | thumbs up, big grin, hood blown back | knowing half-smile, eyebrows raised over his glasses |
| `surprised` (something behind him) | jaw dropped, looking over his shoulder | glasses dropping onto his nose, moustache bristling |
| `angry` (the anchors talking over him) | shouting into the mic, red-faced | clipped fury, mic gripped like a baton |
| `frozen` (satellite delay: stuck mid-smile) | a fixed, slightly too-wide grin, eyes unblinking, totally still | a fixed polite smile, one eyebrow stuck halfway up |
| `hurt` (hit by something off screen) | knocked sideways, hood over his face, mic still held up | glasses askew, moustache crooked, a few dizzy stars |

**Prompt (one per picture, after the preamble):**

> [REPORTER DESCRIPTION]. Expression and pose: [EXPRESSION].

Files: `art/news/field-<reporter>-<expression>.png` (14 pictures), then the
mouth twins `field-<reporter>-<expression>-b.png` for `talk`, `smug` and
`angry` (6 more, made by editing only the mouth, as in `01D-MOUTH_PROMPTS.md`).

## Fighters (for field brawls, later)

Body sheets and four fight heads exactly as in brief 02, for
`npc-news-chase` and `npc-news-rupert` (same descriptions; the microphone goes
on the belt, hands empty).

## Importing

Same as the desk pictures: Claude converts them to 512 px WebP in
`apps/client/src/news/art/`, and the field shot picks the expression from the
line like `deskFace` does (`frozen` during a satellite delay, `hurt` for a hit).
