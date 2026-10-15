# Style tile: brief for the image agent

> **Status:** round 1 delivered (two sheets, 15 October 2026): **the look is
> approved in principle**; the structure needs round 2 (see "Round 2" at the
> end). This is the first art for the wardrobe and art-style work
> (`docs/career-crash/13-wardrobe-and-art-style.md`, §3.2 and phase 2).

This file is self-contained: hand it to the image agent together with the
reference images it names.

## What this is for

Today every career has its own head with the hat painted in, and the art comes
in two or three styles that don't match. The game is moving to:

- **one face per fighter**, chosen at the start and kept for the whole game,
  drawn in 8 expressions;
- **outfits**: headless bodies on one shared body template, one per career;
- **headwear** as separate sprites, worn on any face or left off.

The style tile is the smallest set of art that proves the new look works:
three faces, the body template, one outfit and three hats. Once approved, it is
attached to every later character prompt as the style anchor, and its colours
become the game's palette.

## The look: "VGA caricature"

Think of an early-90s adventure-game dialogue portrait, painted and then
digitised, but with the comic timing of a LucasArts comedy. Real people with
real anatomy, each one slightly exaggerated, never cute, never grim.

| Do | Don't |
|---|---|
| Realistic skull and face anatomy, 3/4 view facing right | Chibi faces, huge round anime or "cute mascot" eyes |
| Exaggerate **one** signature feature per face by 20–30 % (nose, brows, jaw, ears, hair) | Caricature so strong the face stops being a person |
| Warm, many-step skin: shadows shift towards red-violet, light towards warm yellow | Flat single-tone skin, grey shadows |
| Hair, beards, wool and tweed with visible texture (strands, flecks) | Smooth plastic hair helmets |
| Eyes always readable: coloured iris, a white highlight, eyelids; brows thick and expressive | Dot eyes, eyes lost in shadow |
| Clothes in flat, clean colour blocks with one shadow tone | Busy patterns, tiny logos, text |
| Warm key light from the top left, a cool blue rim light on the right edge | Flat front lighting, dramatic horror lighting |
| A thin dark line around the outer silhouette only | Black lines inside the face or clothes (except glasses frames and dark features) |
| Clear, chunky shapes and colour clusters that survive being shrunk to 48 px | Soft airbrush blur, photographic micro-detail, film grain |

**Painted or pixel art: both work.** Round 1 came back as clean pixel art at
large size and still held up when shrunk to 48 px, so either is fine. What
matters is clear shapes and colour clusters, not soft blur or photo detail.

## References to attach

| Attach | Why |
|---|---|
| The owner's two reference portraits (supplied by the owner with the brief; not stored in the repo) | The target surface: realistic faces, warm many-tone skin, textured hair, silhouette outline |
| `art/heads/_reference/body-sheet-example.webp` | **Layout only** for the body sheets (where the 13 pieces go). Ignore its style: it is the old look |

Style references to name in the prompt (the agent may know them): the dialogue
portraits of *Indiana Jones and the Fate of Atlantis*, *Gabriel Knight: Sins
of the Fathers* and *Quest for Glory IV*, the character portraits of
*Ultima VII*, and the tone of *Thimbleweed Park* and *Day of the Tentacle*.

## House style (paste this before every prompt)

> Character art for "Career Crash", a comedic 2D workplace brawler. Style:
> an early-1990s VGA adventure-game portrait, hand-painted, in the spirit of
> the dialogue portraits in Indiana Jones and the Fate of Atlantis, Gabriel
> Knight and Quest for Glory IV, with the comic timing of Thimbleweed Park.
> Realistic anatomy with one feature gently exaggerated, like a friendly
> caricature. Warm skin painted in many tones (shadows towards red-violet,
> highlights towards warm yellow), textured hair, readable eyes with a
> coloured iris and a white highlight, thick expressive eyebrows. Warm key
> light from the top left, cool blue rim light on the right edge. Clean
> painted shapes and clear colour clusters, flat colour blocks on clothes,
> a thin dark line around the outer silhouette only. NOT pixel art, no
> pixel blocks, no airbrush blur, no photo texture. Transparent background,
> no shadow on the ground, no text, no labels, no watermark, no blood or gore.

## Rules every image must follow (the importer relies on them)

1. **Transparent background**, nothing else in the image.
2. **Equal cells.** Sheets are cut into equal cells (sizes below). Nothing may
   cross a cell edge; keep at least 6 % empty margin in every cell.
3. **Same head in the same place.** In every face cell the head is the same
   size and position: the **chin rests on a line 85 % of the way down** the
   cell, the head is centred horizontally and about **300 px tall** (chin to
   top of the hair). The neck shows only as a short stub under the chin. The
   game pins every face to the body at that chin line.
4. **3/4 view facing right** for every face, body and hat.
5. **No hats on faces** (except Face 3's own hijab). Headwear is separate.
6. **Hands empty**, no props, no extra pieces.

## The images

| # | File | Canvas (px) | Cells | What |
|---|---|---|---|---|
| 1 | `art/style-tile/face-01.png` | 1536 × 1024 | 4 × 2 of 384 × 512 | Face 1 in all 8 frames |
| 2 | `art/style-tile/faces-02-03.png` | 1536 × 512 | 4 × 1 of 384 × 512 | Faces 2 and 3, neutral and angry |
| 3 | `art/style-tile/mannequin.png` | 1536 × 1024 | free layout, like the example | The body template: posed + 12 pieces |
| 4 | `art/style-tile/outfit-builder.png` | 1536 × 1024 | free layout, like the example | The builder's outfit on the template: posed + 12 pieces |
| 5 | `art/style-tile/headwear.png` | 1536 × 1024 | 3 × 2 of 512 × 512 | Hard hat, chef's toque, police cap; and each worn by Face 1 |

### The three faces

All three are adults, everyday office-and-workplace people, likeable, a bit
funny-looking in the way real people are.

| Face | Who | Signature feature | Tests |
|---|---|---|---|
| **1** | A man in his mid-30s, light olive skin, a mop of curly dark-brown hair, a day's stubble, a big friendly hooked nose | the nose | Hair texture, hat-hair, the full range of 8 expressions |
| **2** | A woman in her late 50s, deep brown skin, short grey natural hair, reading glasses, laughter lines | dramatic arched eyebrows | Age, dark skin with warm many-tone shading, glasses at small size |
| **3** | A young woman in her early 20s, medium-tan skin, wearing a plain teal hijab, round cheeks | big expressive eyes and round cheeks | A face with its own headwear (the hijab belongs to the face; it is never removed) |

### Prompt 1: Face 1, all 8 frames → `face-01.png`

> [House style] A character sheet of ONE man's head shown in 8 expressions,
> on a 1536 × 1024 transparent canvas divided into 4 columns × 2 rows of
> equal 384 × 512 cells (no visible grid lines). In every cell: the same head,
> 3/4 view facing right, same size (about 300 px tall), chin resting on a line
> 85 % of the way down the cell, a short neck stub, no shoulders. He is in his
> mid-30s, light olive skin, a mop of curly dark-brown hair, a day's stubble,
> and a big friendly hooked nose (his signature feature, gently exaggerated).
> No hat.
> Top row, left to right:
> 1. NEUTRAL: relaxed, faint confident half-smile.
> 2. ANGRY: brows slammed down into a V, nostrils flared, teeth bared in a
>    snarl, a vein on the temple.
> 3. SURPRISED: eyebrows high, eyes wide, mouth a round "O".
> 4. HURT: eyes squeezed shut, teeth clenched, wincing, head tilted away.
> Bottom row, left to right:
> 5. HURT 2 ("fun pain"): one eye popping wide, the other squeezed shut,
>    cross-eyed, tongue out, cheeks puffed.
> 6. HURT 3 ("seeing stars"): dazed, eyes turned into dizzy spirals, a red
>    bump on the forehead, mouth wobbly and open, small cartoon stars circling
>    above the hair.
> 7. SURPRISED 2 ("shock horror"): eyes popping, tiny pupils, eyebrows flying
>    up, jaw dropped comically low, hair jumping up, a single sweat drop.
> 8. HAT HAIR: exactly like NEUTRAL, but his hair pressed flat and trimmed so
>    the top of the head is a smooth rounded dome that a cap or helmet can
>    sit on; curls still show at the sides and back below the hat line.
> Keep the face, skin, hair colour and lighting identical in all 8 cells; only
> the expression changes.

### Prompt 2: Faces 2 and 3, neutral and angry → `faces-02-03.png`

> [House style] Four heads on a 1536 × 512 transparent canvas, 4 equal
> 384 × 512 cells in one row (no grid lines). Every head 3/4 view facing
> right, about 300 px tall, chin on a line 85 % of the way down the cell,
> short neck stub, no shoulders.
> Cells 1–2: a woman in her late 50s, deep brown skin painted in warm tones,
> short grey natural hair, thin reading glasses, laughter lines, and dramatic
> arched eyebrows (her signature feature). Cell 1 NEUTRAL: a knowing,
> slightly amused look over the top of her glasses. Cell 2 ANGRY: eyebrows
> arched into a furious peak, lips pursed, glasses slipping down her nose.
> Cells 3–4: a young woman in her early 20s, medium-tan skin, wearing a plain
> teal hijab that frames her face, round cheeks and big expressive eyes (her
> signature feature). Cell 3 NEUTRAL: bright, eager smile. Cell 4 ANGRY:
> cheeks puffed, eyes narrowed, eyebrows knitted, lips pressed tight.

### Prompt 3: the body template → `mannequin.png`

Attach `body-sheet-example.webp` (layout only).

> [House style] A body template sheet on a 1536 × 1024 transparent canvas,
> laid out like the attached example (ignore the example's art style).
> LEFT: one plain adult figure standing in 3/4 view facing right, arms
> relaxed slightly away from the body, feet apart, hands empty. Proportions:
> the head is one third of the total height (head : body about 1 : 2), sturdy
> everyday build, neither muscular nor thin, neutral enough for any face. The
> head is a smooth BALD featureless dome in skin tone (a placeholder, no face).
> The figure wears a plain light-grey T-shirt, plain mid-grey shorts to the
> knee and simple grey shoes; bare forearms and shins, skin in a neutral
> medium tone. RIGHT: the same figure cut into 12 separate pieces with a
> clear transparent gap around each: torso (with the neck), pelvis/hips,
> left upper arm, right upper arm, left forearm with hand, right forearm with
> hand, left thigh, right thigh, left shin, right shin, left shoe, right shoe.
> Do NOT include the head as a piece. Each piece complete, with rounded joint
> ends so it can be pinned at the shoulders, elbows, hips and knees.

### Prompt 4: the builder's outfit → `outfit-builder.png`

Attach `mannequin.png` (once approved), `face-01.png` and `body-sheet-example.webp`.

> [House style] The attached body template DRESSED as a builder, on a
> 1536 × 1024 transparent canvas, same layout, same proportions and same
> pose as the template. LEFT: the full figure, wearing Face 1's NEUTRAL head
> from the attached face sheet (so we can judge face and outfit together),
> no hat. Outfit: faded blue denim work overalls over a dark-grey T-shirt,
> an orange high-vis vest with two reflective silver stripes, a brown leather
> tool belt (empty loops, no tools), rolled sleeves, scuffed tan steel-toe
> work boots. RIGHT: the same outfit cut into the same 12 pieces as the
> template (torso with neck, pelvis, two upper arms, two forearms with hands,
> two thighs, two shins, two boots), NO head piece. Unisex cut: it must look
> right on any face.

### Prompt 5: three hats → `headwear.png`

Attach `face-01.png`.

> [House style] Headwear sheet on a 1536 × 1024 transparent canvas, 3
> columns × 2 rows of equal 512 × 512 cells (no grid lines). Everything in
> 3/4 view facing right, at the same scale as the attached face sheet.
> TOP ROW, the hats alone, each centred in its cell: 1. a yellow construction
> hard hat with a small brim; 2. a tall white chef's toque with soft pleats;
> 3. a navy-blue police peaked cap with a black visor and a gold badge.
> BOTTOM ROW, the same three hats worn by Face 1 using his HAT HAIR head
> from the attached sheet (neutral expression), so we can check the fit: the
> hat sits on the dome of his head, his curls show below it at the sides.

## Import and review (for the coding session)

The tooling for this is phase 0 of the plan (doc 13 §3.3), built when the tile
arrives:

1. Save the files under `career-crash/art/style-tile/` with the names above.
2. `pnpm --filter @cc/art-pipeline normalise art/style-tile/*`: shrinks to native
   size (faces to 48 px from the 300 px head), snaps to a hand-picked palette,
   adds the 1 px silhouette outline. Previews go to `tools/art-pipeline/out/style-tile/`.
3. `pnpm --filter @cc/art-pipeline lineup style-tile`: one contact sheet with
   the painted originals, the 48 px results at ×1, ×2 and ×4, and the 24 px
   icons, next to today's builder and chef for comparison.
4. Build the master palette from the approved results (`art/template/palette.json`)
   and move the approved template to `art/template/mannequin.png`.
5. Stage a Sandbox fight with the builder outfit and Face 1 against today's
   art, and send screenshots.

## What the owner checks before signing off

- At **48 px**, all 8 expressions of Face 1 can be told apart, and the eyes
  still read.
- At **24 px** (chips, icons), the three faces can still be told apart.
- The look is more interesting than today's art, but still friendly and funny;
  nobody looks grim or creepy.
- The hats sit on the hat-hair head without gaps or floating; Face 3's hijab
  looks right and natural.
- In a fight, the builder outfit still reads as "builder" from across the arena.
- Face 1 on the builder body reads as one person, not a head stuck on a body.

## Hand-back checklist (for the image agent)

- [ ] 5 PNG files, transparent background, exact canvas sizes above.
- [ ] Faces: same size and chin line in every cell, 3/4 view facing right.
- [ ] Face 1: all 8 frames in the order above; frame 8 has the flattened hat hair.
- [ ] No hats on faces (Face 3's hijab excepted), no hands, no shoulders.
- [ ] Body sheets: 12 pieces, no head piece, clear gaps, rounded joint ends.
- [ ] Painted, not pixel art; no text, labels, ground shadow or gore.

## Round 2: what round 1 got right, and what to fix

Round 1 (two 1536 × 1024 sheets) nailed the **look**: realistic but likeable
faces, warm many-tone skin, textured hair and beards, glasses and eyes that
still read at 48 px. Keep all of that. The **structure** missed the brief:

| Problem | Why it matters |
|---|---|
| Face 1 always wears a cap or the hard hat | Hats must be separate sprites so any hat fits any face. A face with a hat painted in can't take another one |
| The 8 frames are neutral, smile, laugh, angry, wink, surprised, sad, and one more, all subtle | The game needs **neutral, angry, surprised, hurt, hurt 2, hurt 3, surprised 2, hat hair**, and fights need them big and comic. At 48 px, today's angry and sad barely differ from neutral |
| Faces 1 and 2 follow the reference portraits, not the brief's people | Fine if the owner wants them in the set. Face 2 of the brief (an older woman with deep brown skin) still needs testing |
| No body template (the bald mannequin) | The template keeps every future outfit on the same proportions |
| Sheet 1's body pieces are fused (arms on the torso, both thighs in one piece) | Sheet 2's 13-piece exploded builder is right: **use it as the layout** for every body from now on |

Smile, laugh and wink are worth keeping as extra frames (victory poses,
photos), but they come after the game's 8.

### Prompt R2-1: Face 1 without a hat, game expressions → `face-01.png`

Attach round 1's sheets (as the style and the man) and both reference portraits.

> [House style, may be pixel art] The SAME bearded man with glasses as the
> attached sheets, now WITHOUT any hat: short, slightly messy dark-brown
> hair. 1536 × 1024 transparent canvas, 4 × 2 equal 384 × 512 cells, no grid
> lines. Same head size, 3/4 view facing right, chin on a line 85 % of the
> way down every cell, a short neck stub only (no hoodie, no shoulders).
> Expressions are BIG and comic, readable on a 48-pixel head, like a cartoon
> reaction shot:
> 1. NEUTRAL: relaxed half-smile.
> 2. ANGRY: brows slammed into a deep V, teeth bared, nostrils flared, a vein
>    on the temple, face flushed red.
> 3. SURPRISED: eyebrows high, eyes wide behind the glasses, mouth a round "O".
> 4. HURT: eyes squeezed shut, teeth clenched, head tilted away, glasses knocked crooked.
> 5. HURT 2 ("fun pain"): one eye popping, the other squeezed, cross-eyed,
>    tongue out, cheeks puffed.
> 6. HURT 3 ("seeing stars"): dizzy spiral eyes, a red bump on the forehead,
>    glasses hanging off one ear, small cartoon stars circling the head.
> 7. SURPRISED 2 ("shock horror"): eyes popping, tiny pupils, eyebrows flying
>    up, jaw dropped comically low, hair standing up, one sweat drop.
> 8. HAT HAIR: like NEUTRAL, hair pressed flat so the top of the head is a
>    smooth dome for a cap or helmet to sit on.

### Prompt R2-2: Faces 2 and 3, the same 8 frames → `face-02.png`, `face-03.png`

Same prompt as R2-1, once per face, with the round 1 face attached:
**Face 2** is the round 1 young man with brown shaggy hair (or the brief's
older woman with deep brown skin, if the owner prefers to test her);
**Face 3** is the round 1 woman in the purple hijab. Face 3 skips HAT HAIR
(her hijab stays; a hard hat goes over it): draw her HURT 3 a second time,
with stars only and no bump, as frame 8.

### Prompt R2-3: the body template → `mannequin.png`

Attach round 1's sheet 2 (the exploded builder).

> [House style, may be pixel art] The attached exploded builder's exact
> layout, proportions and 13 pieces, but as a plain body template: a bald
> featureless head in skin tone, a plain light-grey T-shirt, mid-grey knee
> shorts, simple grey shoes, bare forearms, hands without gloves. Same
> pieces in the same places with the same gaps: head, torso, pelvis, two upper
> arms, two forearms with hands, two thighs, two shins, two shoes. No belt,
> no tools, no knee pads.

The builder outfit (round 1, sheet 2) and the hats (sheet 2's four: hard
hat, beanie, cap, chef's toque) are good as they are and don't need redoing.
