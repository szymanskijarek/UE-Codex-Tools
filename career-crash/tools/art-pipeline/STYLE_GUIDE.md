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
