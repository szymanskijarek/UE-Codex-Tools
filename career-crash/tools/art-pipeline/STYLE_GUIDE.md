# Career Crash — Art Style Guide (v0.1)

Source of truth for AI-generated art (docs/career-crash/00 Art Direction, 04 Phase 7).
Every asset is a **part** on a shared rig, never a one-off illustration.

## Look

- Stylised 2D, big heads (head : body ≈ 1 : 1.4), expressive faces.
- Thick dark outline `#1b1f2a`, 3 px at 128 px part height; flat fills, one soft shadow tone.
- Bright, readable palette. Career colour comes from `careers/*.json → art.color` (outfit) and `art.hat` (headwear).
- Lighting from top-left. No gradients except the single shadow tone. Transparent background.
- 3/4 "stage" view, facing right. The engine mirrors for left.

## Paper-doll parts

| Slot | Canvas | Pivot | Notes |
|---|---|---|---|
| body | 128×160 | feet centre | neutral torso + legs, skin-tone mask layer |
| head | 128×128 | neck | face-less, skin-tone mask |
| face | 128×128 | neck | eyes/mouth only; 6 expressions (neutral, angry, scared, ko, smug, panic) |
| hair | 128×128 | neck | 6 styles, tinted at runtime |
| hat | 128×96 | head top | one per career |
| upper | 128×128 | shoulders | career top (uses career colour) |
| lower | 128×96 | hips | trousers/skirt |
| shoes | 128×48 | feet | |
| accessory | 64×64 | chest | per accessory item |
| held item | 96×96 | hand | per equipment item |

Eight shared poses (idle, walk×2, windup, strike, throw, hit, down) — every part is drawn for every pose.

## Props

Drawn at 1 px = 10 mm scale (a 450 mm-radius trolley ≈ 90 px wide), same outline and palette rules.
Area props (spills, fire, sparks) are top-down tiling blobs with 40 % opacity.

## Rules for generation

1. Generate from `tools/art-pipeline/out/prompts.json` (run `pnpm --filter @cc/art-pipeline prompts`).
2. Reject outputs that fail: silhouette readable at 48 px, palette ≤ 12 colours after quantisation, outline present on ≥ 90 % of the edge.
3. Assets are referenced **only** by art ids in content, never by filenames in code, so any asset can be regenerated.

## Character sheets → ragdoll puppets (v0.5)

Career art ships as **character sheets**: `art/sheets/<career-slug>.png`, transparent
background, the posed character on the left and the same character cut into
separated parts on the right — head, torso, pelvis, 2 upper arms, 2 forearms
(with hands), 2 thighs, 2 shins, 2 feet (feet optional: shins may include shoes;
separate hands are optional too — the chef and teacher have them).
Leave a clear gap between parts; extra items (props, back views) are ignored.

```bash
pnpm --filter @cc/art-pipeline puppets            # all sheets
pnpm --filter @cc/art-pipeline puppets mime       # one sheet
```

The slicer finds each part, measures its joint anchors, downsizes it (figure
≈ 300 px) and packs `apps/client/src/replay/puppets/<career>.png` plus
`puppets.json`. Labelled previews land in `tools/art-pipeline/out/puppets/`;
when a sheet uses an unusual layout, map part names to the numbers shown there
in `art/sheets/manifest.json` (see barista, hairdresser, plumber, mime, chef, teacher); `flip` lists parts
drawn upside down (the teacher's wrist-down hands).

In game the parts hang on the same 11-point skeleton as the ragdoll: a
procedural pose while standing (walk, wind-up, strike, throw, carry, panic)
and Verlet physics when thrown or knocked down. Careers without a sheet keep
the drawn paper doll.

## Item and obstacle sheets (v0.6)

`art/items/*.png` (2 rows × 4 small items) and `art/obstacles/*.png` (2 rows ×
3 large pieces) on transparent backgrounds; item names in reading order go in
each folder's `manifest.json`. `pnpm --filter @cc/art-pipeline items` and
`… items obstacles` pack them into `apps/client/src/replay/{items,obstacles}/`.
`client/replay/items.ts` maps equipment, props, machines and each arena's
obstacles to atlas names; anything unmapped keeps its drawn fallback.

## Heavy weapons (two-handed)

Twelve two-handed weapons (list and atlas names in 02 §5.2c): frozen-salmon,
sale-sign, coat-stand, novelty-cheque, platform-bench, platform-sign, beer-keg,
pepper-grinder, sledgehammer, road-sign, wooden-pallet, rolled-carpet. Paint
them like the other items (same outline weight and palette), **upright, with
the end you hold at the top** and the heavy end at the bottom, on the usual
2 × 4 item sheets (`art/items/heavy-1.png`, `heavy-2.png`) with the names in
`art/items/manifest.json`. They're shown both in a fighter's hands (rotated
with the arms) and lying on the floor, so avoid a ground shadow in the art.
