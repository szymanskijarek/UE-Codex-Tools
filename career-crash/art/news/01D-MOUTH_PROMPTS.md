# Broken News 01 D: mouth-frame prompts (same session as the desk art)

> Ready-to-paste prompts for brief 01 D (`01-DESK_SHOT.md`). Use them **in the
> same image-agent session that drew the anchors' desk expressions**, so it can
> refer back to its own pictures. Paste the setup message once, then one
> prompt per image. Save each result as the file name given.

## Setup (paste once, first)

> We're going to make lip-flap frames for the two news anchors you drew
> earlier in this session: Brock Stetson Jr. (navy suit, red tie, flag pin)
> and Philippa Featherstonehaugh (royal-blue blazer, glasses, fountain pen),
> six expressions each. For each one I name, make an EDITED COPY of that exact
> image you already made, where ONLY THE MOUTH changes. Everything else must
> stay pixel-identical: same 1254 × 1254 canvas, same position and scale, same
> pose, hands, fingers, pen, glasses, hair, eyes, eyebrows, clothes, outline
> and colours, transparent background. Do not redraw, re-pose, re-crop or
> restyle anything. In the game the two pictures swap several times a second
> while the character talks, so anything except the mouth that moves will
> jitter. Reply "ready" and wait for the first one.

## Priority 1 (six images)

**1. `desk-brock-talk-b.png`**
> Take your image of Brock **talking** (gesturing with one open hand, mouth
> open mid-word). Edit only the mouth: **closed, in a confident on-air smile,
> lips together**. Everything else identical.

**2. `desk-brock-smug-b.png`**
> Take your image of Brock **smug** (finger-guns at the camera, winking,
> closed grin). Edit only the mouth: **open mid-word, still grinning, teeth
> showing**. Everything else identical, including the wink.

**3. `desk-brock-angry-b.png`**
> Take your image of Brock **angry** (pointing sideways, vein on his forehead,
> mouth open shouting). Edit only the mouth: **shut, teeth gritted in a
> snarl, still furious**. Everything else identical, including the vein.

**4. `desk-philippa-talk-b.png`**
> Take your image of Philippa **talking** (pointing her fountain pen, mouth
> open mid-word). Edit only the mouth: **closed, lips pressed together, a
> crisp pause between words**. Everything else identical.

**5. `desk-philippa-smug-b.png`**
> Take your image of Philippa **smug** (pen tip resting on her chin, small
> tight smile). Edit only the mouth: **slightly open, delivering a dry remark,
> still smirking**. Everything else identical, including the pen on her chin.

**6. `desk-philippa-angry-b.png`**
> Take your image of Philippa **angry** (scowling over her glasses, pen
> gripped, lips pressed thin). Edit only the mouth: **open, spitting out a
> clipped furious word, teeth showing**. Everything else identical.

## Priority 2 (optional, four images)

**7. `desk-brock-surprised-b.png`**
> Take your image of Brock **surprised** (jaw dropped, hands raised). Edit
> only the mouth: **half closed, mid-sputter**. Everything else identical.

**8. `desk-brock-lunge-b.png`**
> Take your image of Brock **lunging** (fist pulled back, tie flying, teeth
> gritted). Edit only the mouth: **wide open in a battle yell**. Everything
> else identical.

**9. `desk-philippa-surprised-b.png`**
> Take your image of Philippa **surprised** (mouth a small O, pen in hand).
> Edit only the mouth: **closed, lips pursed in disbelief**. Everything else
> identical.

**10. `desk-philippa-lunge-b.png`**
> Take your image of Philippa **lunging** (pen raised high, glasses flying,
> mouth open shouting). Edit only the mouth: **shut, teeth gritted**.
> Everything else identical, including the glasses mid-air.

## If something else moved

Send it anyway. Claude checks each pair: if more than the mouth changed, it
pastes just the mouth area from the new image onto the original, so the flap
never jitters.

## Importing

Upload the files (any names; say which is which if unsure). Claude saves them
as `art/news/desk-<anchor>-<expression>-b.png`, converts them to WebP in
`apps/client/src/news/art/`, and the game plays them straight away.
