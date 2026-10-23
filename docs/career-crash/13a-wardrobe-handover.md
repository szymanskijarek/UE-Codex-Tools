# Handover: wardrobe and art-style work (doc 13)

Session of 15 October 2026, branch `claude/gifted-dirac-ts9syc` (from `dev`
at `72e1932`, **not merged**). Planning and art direction only: **no game
code has changed.** This file is for whoever picks the work up next.

## 1. What the owner asked for

1. **Customisation.** A new career no longer swaps the whole sprite: the
   player picks a face at the start and keeps it; careers unlock costumes,
   worn from a loadout menu. Headwear and gender-specific clothing must not be
   a hurdle for anyone.
2. **One art style.** Character art drifted across sessions (the teacher vs
   the builder is the obvious case). Do a blanket restyle.
3. Plan both with **efficiency and retention** as the main goals.
4. Later: make the pixel art "more compelling and interesting, yet still
   accessible and fun", from two reference portraits the owner supplied.

## 2. Where things are

| What | Where |
|---|---|
| The plan (owning doc) | `docs/career-crash/13-wardrobe-and-art-style.md` |
| Brief for the image agent, with round 1 review and round 2 prompts | `career-crash/art/STYLE_TILE_BRIEF.md` |
| Retention counter (backlog) | `career-crash/WORKFLOW.md`, Next milestones |
| Index rows | `INDEX.md` (doc 13 under design docs; the brief under Art) |

Commits on the branch: `1c4861c` plan, `29583ea` target look and owner
decisions, `92779c3` style tile brief, `01dc8b4` round 1 review and round 2.

**Not in the repo** (they only existed in this chat; ask the owner to upload
them again):

- The owner's two reference portraits: a pixelated photo-style portrait of a
  bearded man in glasses and a hood, and an early-90s RPG-style portrait of a
  young man with shaggy brown hair.
- Round 1 of the style tile from the image agent: two 1536 × 1024 sheets
  (see §5).

## 3. The plan in short (doc 13)

- **A fighter = face + outfit + headwear**, three independent layers.
  - **Face:** chosen at creation and kept for the whole game. 8 frames:
    neutral, angry, surprised, hurt, hurt2, hurt3, surprised2, hat-hair.
  - **Outfit:** a headless body on one shared template.
  - **Headwear:** a separate sprite. Types `cap`, `helmet` and `face`
    (masks, glasses) each have their own rule.
- **Headwear is always optional.** Faces with their own headwear (hijab,
  turban…) keep it, and only helmets go over it.
- **Every outfit fits every face.** Uniforms are drawn unisex; skirts and
  dresses are separate outfits anyone can unlock. The teacher is redrawn.
- **Wardrobe tab** next to Gear. Outfits come from:
  - joining a career;
  - Lead/Head rank (a recolour: no new art);
  - bosses;
  - gatecrasher trophies;
  - the shop (a cash sink);
  - HR messages and feed posts announcing them.
- **Opponents and hires get random faces.**
- **Old saves:** each fighter gets the closest new face, and every career
  they've held unlocked.
- **Efficiency:** ~460 career heads become 16 faces × 8 frames. A new career
  then costs one outfit sheet and at most one hat.
- **The sim never reads `appearance`.** The new `look` fields go there, so
  there are no golden changes and no `SIM_VERSION` bump.
- **Phases** (doc 13 §4):
  - 0: spike: the `normalise` and `lineup` tools;
  - 1: layered puppet, falling back to today's art;
  - 2: style test in the Sandbox;
  - 3: faces and the face picker at creation;
  - 4: Wardrobe;
  - 5: collection features;
  - 6: clean-up.

## 4. Owner decisions (15 October 2026)

| Question | Answer |
|---|---|
| Target look | Neither of today's two styles: new **"VGA caricature"** (doc 13 §3.2) |
| Faces at launch | 16 |
| Faces with their own headwear at launch | Yes |
| Changing face later | Free for now |
| Body builds | One at launch |
| Retention measuring | Not now; in the backlog |

"VGA caricature" means:
- realistic anatomy with one exaggerated feature per face;
- warm skin in many tones, with hue-shifted shading;
- texture on hair, beards and wool;
- readable eyes;
- a 1 px silhouette outline only;
- head : body about 1 : 2;
- faces 48 px native.

References are listed in doc 13 §3.2.

## 5. The style tile: round 1 result

The owner asked "is that what you wanted?"; the review is in the brief's
"Round 2" section.

- **The look is right and approved in principle.** Shrunk to 48 px, the
  faces keep their hair texture, glasses, eyes and skin tones.
- **Pixel art works too.** The agent drew pixel art instead of painting,
  and it survived shrinking, so the "paint, don't pixel" rule was dropped.
- **Sheet 2's 13-piece exploded builder** is the layout for all future
  bodies.
- **Sheet 2's four hats** (hard hat, beanie, cap, chef's toque) are fine as
  they are.
- **To fix in round 2** (prompts R2-1, R2-2 and R2-3 in the brief):
  - Face 1 always wears a cap or hard hat; it needs a bare head.
  - The expressions are the wrong set (smile, laugh and wink instead of hurt,
    hurt2, hurt3, surprised2 and hat-hair) and too subtle for fights.
  - The bald body template is missing.
  - Sheet 1's body pieces are fused and unusable.
- **Open with the owner:**
  - Faces 1 and 2 copy the owner's two reference portraits rather than the
    brief's people. Face 1 is based on the first reference (a photo-style
    portrait), so the owner should confirm they're happy for it to become a
    playable face.
  - Should Face 2 stay as delivered, or be swapped for the brief's older
    woman with deep brown skin?

## 6. Next steps

1. **Waiting on the owner:** round 2 art from the image agent, and the two
   open questions in §5.
2. **Offered, not yet accepted:** build phase 0 now:
   - `@cc/art-pipeline normalise`: shrink to the native grid, snap to a
     hand-picked palette, add the outline;
   - `lineup`: a contact sheet of before and after;
   - import sheet 2's builder and hats;
   - show them in a Sandbox fight with screenshots.
3. **Lesson from the 15 October tests:** a palette picked automatically
   washes out accent colours (purple went grey). Build the palette by hand
   from the approved tile.
4. **When art arrives:** save it under `career-crash/art/style-tile/`, run
   the steps in the brief's "Import and review", then send screenshots
   (house rule: show, don't describe).
5. **No release.** Nothing here touches the live game. Ask before merging to
   `dev`, and only push to `prod` when the owner says so.
