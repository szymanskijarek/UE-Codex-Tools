# Wardrobe pixel tests (11 November 2026)

Code-drawn test art for doc 13 (`docs/career-crash/13-wardrobe-and-art-style.md`).
**None of this is game art.** It tests whether the plan's layer rules hold
before the painted art arrives, and it can stand in for that art while
phases 1 and 2 are built.

Redraw everything: `pnpm --filter @cc/art-pipeline wardrobe-test` (from
`career-crash/`). Source: `tools/art-pipeline/src/wardrobe-test/`.

## How it is drawn

Each sprite is painted as an SVG in final-pixel units, rendered 8× too big,
then reduced to the native grid on the draft palette (`palette-draft.json`:
6 skin ramps, 6 hair ramps, 16 cloth ramps). This is doc 13's "paint big,
pixelate in the pipeline", with code as the painter.

- **Two layers per sprite.** The *paint* layer has soft light and shadow
  (blurred shapes, gradients that run along a colour ramp). It is averaged
  down and each pixel takes the ramp tone nearest in lightness, with a light
  ordered dither where two tones meet and pixel noise on hair. The *detail*
  layer (eyes, brows, mouth, glasses) is kept crisp by majority vote, so
  single pixels survive.
- **Round 1 (flat shapes, one shade tone) looked poor** and was replaced by
  this on the owner's feedback, the same day.
- **Faces** are data: skin ramp, hair, one exaggerated feature. Frames are
  data too (brow height and tilt, eye and mouth shapes, extras). So 8 faces ×
  8 frames is 8 + 8 definitions, not 64 drawings.
- **Headwear, face accessories and outfits** are separate sprites, stacked as
  the game would: hat back → face → accessory → hat front, on a 96 × 160 body.

## The sheets

| Sheet | Tests |
|---|---|
| `01-faces.png` | 8 faces in the game's 8 frames, including hat-hair |
| `02-sizes.png` | 48 px at real size, the automatic 24 px chip, light and dark floors |
| `03-headwear.png` | 8 faces × 11 items (3 helmets, 5 caps, 3 face accessories) from one sprite each |
| `04-outfits.png` | Full fighters at head : body 1 : 2, senior recolours, the outline question |
| `05-normalise.png` | Ten of today's heads at 48 px: automatic palette vs. the draft hand palette |

## What held up

1. **One anchor is enough for hats.** All 8 hats sit on all 6 bare-headed
   faces from a single sprite each, with no per-face fixes. The hat-hair frame
   does the work: it is made by clipping the hair to the skull above the hat
   line, so it costs nothing per face.
2. **The own-headwear rule works.** Caps are not offered, and the hard hat,
   fire helmet and space helmet go over the hijab and the turban.
3. **Senior colours really are free.** The senior builder, chef and teacher
   are the same sprite with whole ramps swapped (denim → navy, hi-vis → gold).
4. **Any outfit on any face.** The dress on the bearded man and the builder
   on the hijab face need nothing special.
5. **The 8 frames can be told apart at 48 px**, on light and dark floors. The
   8 faces stay distinct as 24 px chips, mostly through hair and skin.
6. **A hand-built palette keeps the accents.** In `05`, the automatic palette
   turns the fortune teller's purple scarf brown and the clown's red hair
   beige. The draft palette keeps both.

## What the plan needs to change

1. **Helmets need a second size.** Over a turban the hard hat has to be drawn
   20 % bigger (7 % over a hijab). A face with its own headwear needs a
   `helmetFit` value, and each helmet a larger sprite. Scaling pixels won't do.
2. **Face accessories need a nose anchor.** The clown nose sits on the big
   noses and floats in front of the small ones. Each face needs a nose point,
   or noses must end at the same place.
3. **Sunglasses on a face with glasses** must replace the glasses, so glasses
   should be a face accessory the face starts with, not part of the face art.
4. **Trim needs its own ramp.** Swapping "leather → gold" for the senior
   teacher also turned the shoes gold. Recolourable parts must be on ramps
   nothing else in the outfit uses.
5. **Snapping to one big palette is not enough for old art.** In `05` the hand
   palette keeps the accents but pushes skin towards orange, because skin
   pixels fall into the hi-vis and ginger ramps. `normalise` should snap by
   region (skin to skin ramps, cloth to cloth), or the skin ramps should be
   picked from the approved tile.
6. **Texture is for hair only.** Pixel noise on a cardigan read as glitter at
   fight size. It is right on hair and beards, as doc 13 says.
7. **Big hair needs trimming at the sides too**, not only above the hat line,
   or the afro shows as two horns under a cap.
8. **One silhouette line vs. a line per sprite** makes little difference:
   upper layers cover most inner lines. The renderer can outline sprites
   one by one.

## What code-drawn art can't do

After the repaint the faces have painted skin, form and hair texture, and
read as people. They are still short of the painted round 1 tile: the
drawing underneath is generic (every face shares one skull), hair is stiff,
and the bodies are simple tubes. The suggested split:

- **Painted by the image agent:** the 16 faces (neutral frame, bare head).
- **Worth trying in code:** the other 7 frames of each face, by moving brows,
  eyes and mouth over the painted neutral; the hat-hair clip; senior
  recolours; the 24 px chips.
- **Either:** hats and flat-colour outfits. The code-drawn hard hat, cap and
  toque are close to shippable; outfits need more detail than these.
