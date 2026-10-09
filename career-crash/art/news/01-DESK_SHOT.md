# Broken News 01: the desk shot

> **Status (9 October 2026):** A–C delivered, and D's six priority mouth
> frames (talk, smug, angry for both anchors). The agent's edits shifted a
> few edge pixels all over, so only each mouth area was pasted onto the
> original (`desk-*-b.png` here are those patched files). Optional: the four
> priority-2 twins (surprised, lunge).

> Part of the Broken News art set (`art/news/README.md`, read *The two
> anchors* first). Design: `docs/career-crash/10-broken-news.md` §3.

The close-up every episode opens on: the two anchors seated behind the desk,
from the chest up, talking. It is a **stack of layers** so the game can make
the anchors talk, lean in and change expression while the set stays put:

1. **Backdrop** (back): the studio wall and the video wall.
2. **Anchors** (middle): one image per anchor per expression, half-body, seated.
3. **Desk** (front): the desk alone, transparent above it, hiding the anchors
   from the chest down.

The game adds the live bug, the clock, the lower third, the BREAKING strap and
the ticker on top, and writes the week's headline onto the video wall itself.
So: **no text anywhere** in these images.

## Style preamble (paste first)

> Pixel-art scene for "Career Crash", a comedic 2D workplace brawler: chunky
> clean pixel art, thick dark outline (#1b1f2a), flat colours with one shade
> tone, light from the top left, friendly cartoon proportions. A slightly
> too-expensive American cable-news studio in navy, red and chrome. No text,
> no letters, no numbers, no logos, no watermark.

**References to attach:** `art/arenas/theatre.png` (palette and detail level)
and `art/heads/_reference/body-sheet-example.webp` (how people are drawn).

## A. Backdrop: `art/news/desk-backdrop.png`, 1920 × 1080, opaque

> [preamble] Front-on camera view of a TV news studio's back wall at chest
> height, as seen behind two seated anchors. Centre: a big video wall made of
> three screens, the middle one twice as wide, all showing a plain glowing
> red-to-crimson gradient (left empty: the game writes on it). Around it:
> navy wall panels with thin chrome trim and small round studio lights, a
> blurred fake night-time city skyline through a window strip at the bottom of
> the wall, two tall potted plants at the far left and right edges. Nothing in
> the bottom 35% but a plain dark navy floor fading into shadow (the desk
> covers it). Symmetric.

- The middle screen sits at **x 25–75%, y 8–40%**; side screens at
  **x 7–23%** and **x 77–93%**, same height. The game places the headline in
  the middle screen by these fractions.

## B. Desk: `art/news/desk-front.png`, 1920 × 1080, transparent except the desk

> [preamble] Only a curved glossy news desk, seen front-on, on a transparent
> background: a wide gently curved desk running from x 10% to x 90% of the
> image, its top edge at about 62% of the height and its base off the bottom
> edge. A glossy white-and-chrome top surface, a deep navy front panel with a
> red accent stripe, an empty raised plaque area in the centre of the front
> panel (blank: the game prints the show name), two closed laptops and a
> coffee mug with a blank side on the top surface, a neat stack of papers in
> front of each seat. Transparent everywhere above and around the desk.

## C. The anchors seated: `art/news/desk-<anchor>-<expression>.png`, 768 × 768, transparent

One image per anchor per expression: **12 images**. Each is the anchor from
the waist up, seated, facing the camera at a slight 3/4 angle **towards the
centre of the desk** (Brock sits on the left and turns right; Philippa sits
on the right and turns left). Arms resting forward as if on a desk (the desk
layer hides everything below the chest, so the bottom 25% of the image
will be covered: draw the arms and torso through it anyway, no desk).

- Head and shoulders fill the top two-thirds; the head is about 300 px tall.
- Same figure, same position and same scale in all six images of an anchor,
  so the game can swap them without a jump. Only face, arms and posture change.

> [preamble] Waist-up pixel-art portrait of [ANCHOR], seated at a news desk
> (desk not drawn), arms resting forward, facing the camera with a slight 3/4
> turn to the [right/left], transparent background, 768 × 768. Expression and
> pose: [EXPRESSION].

**Brock Stetson Jr.** (`brock`, turned right): *a TV news anchor in his
forties with a big square jaw, very white teeth, a helmet of glossy chestnut
hair, a perma-tan, a navy suit slightly too tight across the shoulders, a
white shirt, a red power tie, a small American-flag lapel pin.*

**Philippa Featherstonehaugh** (`philippa`, turned left): *a British TV news
anchor in her forties with a sharp dark bob, reading glasses low on her nose,
pearl earrings, a tailored royal-blue blazer over a cream blouse, holding a
fountain pen.*

| Expression (`<expression>`) | Brock | Philippa |
|---|---|---|
| `neutral` (reading the news) | professional on-air smile, hands clasped | composed, looking over her glasses, pen poised |
| `talk` (mid-sentence) | mouth open mid-word, one hand gesturing | mouth open mid-word, pen pointing at camera |
| `smug` (winning the argument) | huge grin, finger-guns at the camera | tiny tight smile, eyebrows raised, pen tapping chin |
| `surprised` (just insulted) | jaw dropped, hair still perfect | glasses slipping off, mouth a small O |
| `angry` (it's personal now) | red-faced, vein on forehead, jabbing finger sideways | eyes narrowed to slits, pen gripped like a dagger, nostrils flared |
| `lunge` (the swing) | half out of the chair towards the right, fist pulled back, tie flying | half out of the chair towards the left, fountain pen raised high, glasses flying off |

## D. Lip flap: second mouth frames, `art/news/desk-<anchor>-<expression>-b.png`

While a line types out, the game swaps the speaker between the expression
and its **-b** twin every 0.13 s, so the mouth flaps like a cartoon. The twin
is **the same picture with only the mouth changed**: open if the original is
shut, shut if it's open. Same canvas (1254 × 1254), same pose, hands, hair,
glasses and pen, to the pixel: anything else that moves will jitter.

**Ready-to-paste prompts** for the same image-agent session that drew the
anchors: [`01D-MOUTH_PROMPTS.md`](01D-MOUTH_PROMPTS.md). In a new session,
attach the original expression and ask the agent to *edit* it, not draw it
again:

> Edit the attached image. Change ONLY the mouth: [MOUTH]. Keep every other
> pixel identical: same pose, same hands, same hair, same clothes, same
> outline, same canvas size and position, transparent background.

| File | From | [MOUTH] | Priority |
|---|---|---|---|
| `desk-brock-talk-b.png` | `desk-brock-talk.png` | closed in a confident on-air smile | **1** |
| `desk-brock-smug-b.png` | `desk-brock-smug.png` | open mid-word, still grinning | **1** |
| `desk-brock-angry-b.png` | `desk-brock-angry.png` | shut, teeth gritted, still furious | **1** |
| `desk-philippa-talk-b.png` | `desk-philippa-talk.png` | closed, lips pressed, mid-sentence pause | **1** |
| `desk-philippa-smug-b.png` | `desk-philippa-smug.png` | slightly open, a dry remark, still smirking | **1** |
| `desk-philippa-angry-b.png` | `desk-philippa-angry.png` | open, a clipped furious word | **1** |
| `desk-<anchor>-surprised-b.png` | `…-surprised.png` | half closed, a sputter | 2 |
| `desk-<anchor>-lunge-b.png` | `…-lunge.png` | the other mouth (open ↔ gritted) | 2 |

`neutral` needs no twin (it's the listening face). Guests (brief 04) get the
same three priority-1 twins.

If the agent can't keep the rest identical, send it anyway: Claude can paste
just the mouth area onto the original.

## Importing

These are page images, not atlas sprites: save them under `art/news/`, then
convert to WebP into `apps/client/src/news/art/` (lossless for the anchors and
the desk, quality 70 for the backdrop, like the arena backdrops in
`PIPELINES.md` §5). Swap the CSS desk, skyline and `Portrait` heads in
`Studio.tsx` for the three layers, and map `Beat.mood` to the expressions
(`talk` while the speaker's line is typing, `lunge` on heat 3).
