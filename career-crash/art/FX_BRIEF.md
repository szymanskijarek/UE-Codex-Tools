# Impact effects: brief for the image agent

> **Status:** wanted. The game already plays every effect below, using simple
> shapes drawn in code. Each painted sheet that arrives replaces its stand-in
> automatically. Nothing else needs to change, and they can arrive one at a time.

This file is self-contained: hand it to the image agent together with the
reference images it names. The code side is in
`apps/client/src/replay/impact-fx.ts` (the list below, with timings) and the
`impact()` calls in `apps/client/src/replay/renderer.ts`.

## What these are for

Every time someone takes damage, hits the floor or gets knocked out, a short
effect plays on top of the fight. They make hits readable from across the arena
and give each kind of damage its own look: a punch, a slash, a zap, a burn, an
insult, an animal bite. Bodies landing kick up dust, and the dust stays on the
floor, so busy spots build up scuffs over a fight.

## House style (paste this before every prompt)

> Pixel-art game effect for "Career Crash", a comedic 2D workplace brawler.
> Chunky, clean pixel art with a thick dark outline (#1b1f2a) on solid shapes,
> flat colour fills with one shade tone, bright readable palette, cartoon
> comic-book energy (think classic beat-'em-up hit sparks). Transparent
> background, no ground shadow, no text, no letters, no labels, no watermark,
> no frame, no characters, no blood or gore.

**References to attach:** `art/items/hazard-fx.png` and `art/items/floor-fx.png`
(the effects already in the game: wind, steam, dust, dizzy stars, puddles). The
new effects must look like they belong with these.

## Rules every sheet must follow (the importer relies on them)

1. **One sheet per effect,** a single row of frames, left to right in playing order.
2. **Equal cells.** The canvas is exactly `frames × cell width` wide and one cell
   tall (sizes per effect below). The importer cuts it into equal cells, so
   nothing may cross a cell edge, and every frame needs at least 6% empty margin.
3. **Same origin in every frame.** Bursts are centred on the cell centre in
   every frame. Floor effects (dust, debris) sit on a ground line 85% of the way
   down the cell, centred horizontally. The game places the cell's origin on the
   point of impact; an origin that drifts between frames makes the effect jitter.
4. **The animation lives in the frames.** The game swaps frames evenly over the
   effect's duration and doesn't scale, rotate or fade them. So the first frame is
   small and bright, the effect grows and peaks, and the last one or two frames
   break up and thin out (scattered bits, open outlines, smaller puffs) rather
   than going transparent.
5. **Direction.** Effects marked *directional* travel to the right: the attacker
   is on the left, the force goes right. The game mirrors them for blows the
   other way, so draw nothing that reads wrong when mirrored.
6. **Colours.** At most about 12 colours per sheet, flat fills, hard edges. Soft
   glows and gradients turn into banding when the atlas is palette-compressed.
   One or two semi-transparent tones are fine for dust and smoke.
7. **Scale.** In the game a 256 px cell of `hit` is drawn about half as wide as
   a fighter is tall, and a 512 px `land-dust` cell about as wide as a fighter is
   tall. Fill most of each cell at the effect's biggest frame. The game scales
   whole sheets, never single frames.

## The effects

| # | Effect id | Plays when | Frames | Cell (px) | Anchor | Directional | Duration |
|---|---|---|---|---|---|---|---|
| 1 | `hit` | a punch, kick or thrown thing lands (blunt damage) | 4 | 256 × 256 | centre | no | 0.22 s |
| 2 | `hit-heavy` | heavy weapon, a body thrown into a body, a machine running someone over | 5 | 256 × 256 | centre | no | 0.32 s |
| 3 | `crit` | a critical hit | 5 | 256 × 256 | centre | no | 0.36 s |
| 4 | `slash` | sharp damage (scissors, shears, a saw) | 4 | 256 × 256 | centre | **yes** | 0.22 s |
| 5 | `zap` | electric damage | 4 | 256 × 256 | centre | no | 0.26 s |
| 6 | `scorch` | fire damage | 5 | 256 × 256 | centre | no | 0.42 s |
| 7 | `social` | social damage (insults, a bad review, an audit) | 4 | 256 × 256 | centre | no | 0.42 s |
| 8 | `bite` | a summoned animal bites, pecks, pinches or nips | 4 | 256 × 256 | centre | **yes** | 0.30 s |
| 9 | `sweat` | pain droplets flying off the head on bigger hits | 4 | 256 × 256 | centre | **yes** | 0.45 s |
| 10 | `land-dust` | a body hits the floor (landing from a throw, knocked down, downed) | 6 | 512 × 256 | bottom | **yes** | 0.65 s |
| 11 | `debris` | chips knocked loose (walls, heavy hits, big slams) | 5 | 256 × 256 | bottom | no | 0.50 s |
| 12 | `ko-stars` | a knockout | 6 | 256 × 256 | centre | no | 0.65 s |
| 13 | `parry` | a blow is parried | 4 | 256 × 256 | centre | no | 0.24 s |

Plus three still images (not animated):

| # | Effect id | What | Cell (px) | Count |
|---|---|---|---|---|
| 14 | `dust-decal-1…3` | floor scuffs left where bodies land; they build up over a fight | 512 × 256 | 3 variants |

### Prompts

Each prompt follows the house style. Sheet sizes are frames × cell.

**1. `hit`: `art/items/fx-hit.png`, 1024 × 256, 4 frames**
> A comic impact starburst animation in 4 frames: (1) a small bright white star
> flash, (2) a big jagged 8-point white starburst with thick dark outline and a
> pale yellow core, (3) the burst opening into a thin white ring with a few
> speed ticks, (4) the ring broken into 5 short dashes, almost gone.

**2. `hit-heavy`: `art/items/fx-hit-heavy.png`, 1280 × 256, 5 frames**
> A heavy impact animation in 5 frames: (1) a white flash, (2) a large jagged
> orange-and-cream starburst, (3) the starburst at full size with grey chips and
> splinters flying outward, (4) a broken shockwave ring with chips further out,
> (5) a few small chips and a faint ring fragment.

**3. `crit`: `art/items/fx-crit.png`, 1280 × 256, 5 frames**
> A critical-hit animation in 5 frames: (1) a small gold sparkle, (2) a
> 12-point golden starburst with a white centre, (3) the starburst at full size
> with four 4-point sparkle stars around it, (4) the sparkles spinning outward
> and the burst shrinking, (5) four small fading sparkles only.

**4. `slash`: `art/items/fx-slash.png`, 1024 × 256, 4 frames, travels right**
> A cartoon slash-swipe animation in 4 frames: a crescent-shaped white swoosh
> arc with dark outline, sweeping from upper-left to lower-right. (1) thin
> start of the arc, (2) full thick crescent, (3) crescent thinning with two
> small speed lines, (4) a thin trailing sliver. No blood.

**5. `zap`: `art/items/fx-zap.png`, 1024 × 256, 4 frames**
> An electric shock animation in 4 frames: jagged cyan-and-yellow lightning
> bolts bursting out from a white-hot centre, thick dark outline on the bolts.
> (1) small spark, (2) five bolts at full length, (3) bolts flickered into a
> different jagged shape, (4) two broken bolt fragments and tiny sparks.

**6. `scorch`: `art/items/fx-scorch.png`, 1280 × 256, 5 frames**
> A cartoon fire-hit animation in 5 frames: (1) a small yellow flame lick,
> (2) a round puff of orange and yellow flame, (3) bigger puff rising with
> flame tongues, (4) the flame turning into grey smoke puffs with a few
> embers, (5) two small smoke puffs drifting up.

**7. `social`: `art/items/fx-social.png`, 1024 × 256, 4 frames**
> An anime-style "anger vein" animation in 4 frames: a red cross-shaped
> throbbing vein mark (four curved hooks around a centre), the comedy symbol
> for being insulted. (1) small, (2) big with two black shock lines and a
> blue sweat drop, (3) slightly smaller (the throb), (4) half-faded, broken
> open. No text, no letters, no emoji.

**8. `bite`: `art/items/fx-bite.png`, 1024 × 256, 4 frames, travels right**
> A cartoon "chomp" animation in 4 frames: two rows of white triangular teeth
> (upper and lower jaw, like a comic bite mark) with dark outlines. (1) jaws
> wide open, (2) jaws snapping halfway, (3) jaws shut with a small white star
> burst where they meet, (4) a curved row of little tooth-mark dents and a
> tiny star. Comic, not scary, no blood.

**9. `sweat`: `art/items/fx-sweat.png`, 1024 × 256, 4 frames, travels right**
> Comic pain-sweat animation in 4 frames: four light-blue teardrop-shaped
> sweat drops with dark outlines flying out to the upper right from a point
> at the lower left of the cell, like a cartoon character's "ouch" sweat.
> (1) drops just leaving, (2) drops mid-air spread in a fan, (3) drops
> further out and falling, (4) two small drops left. Never red.

**10. `land-dust`: `art/items/fx-land-dust.png`, 3072 × 256, 6 frames of 512 × 256, travels right**
> A dust cloud animation in 6 frames, seen from a 3/4 top-down view, for a
> body slamming onto the floor: beige-grey cartoon dust puffs (round clumps
> with a dark outline on the lower edge only) bursting out from the centre of
> a ground line 85% of the way down the cell, rolling out to both sides, a
> little further to the right. (1) a small flat puff, (2) puffs spreading
> sideways, (3) widest, tallest cloud with a few pebbles, (4) cloud
> thinning, (5) separate drifting puffs, (6) a few faint wisps at floor
> level.

**11. `debris`: `art/items/fx-debris.png`, 1280 × 256, 5 frames**
> Flying debris animation in 5 frames: 7 small grey and brown chips, plaster
> bits and pebbles with dark outlines, thrown up and outward from a point on
> a ground line 85% of the way down the cell, then falling. (1) chips just
> leaving, (2) chips rising in a fan, (3) at the top of their arc, (4)
> falling, (5) chips lying on the ground line.

**12. `ko-stars`: `art/items/fx-ko-stars.png`, 1536 × 256, 6 frames**
> A knockout animation in 6 frames: (1) a white flash circle, (2) six yellow
> and white 4-point stars bursting outward in a ring, (3) the ring wider,
> stars spinning, (4) ring wider still, stars smaller, (5) a few stars left,
> (6) two tiny twinkles.

**13. `parry`: `art/items/fx-parry.png`, 1024 × 256, 4 frames**
> A sword-clash parry flash in 4 frames: (1) a bright white point, (2) a sharp
> yellow-and-white 4-point cross flash with tiny metal sparks, (3) the cross
> stretched thin and sparks flying, (4) two sparks.

**14. `dust-decal`: `art/items/fx-dust-decals.png`, 1536 × 256, 3 still images of 512 × 256**
> Three floor scuff marks seen from a 3/4 top-down view, for where bodies hit
> the floor: soft flat ellipses of beige-grey dust with scattered specks and a
> couple of short scrape lines, low contrast so they sit on any floor (tiles,
> wood, concrete, carpet). Each one a different shape. No outlines, partly
> transparent.

## Manifest entries (paste into `art/items/manifest.json`)

```json
"fx-hit":        { "grid": [4, 1], "px": 160, "names": ["fx-hit-1", "fx-hit-2", "fx-hit-3", "fx-hit-4"] },
"fx-hit-heavy":  { "grid": [5, 1], "px": 192, "names": ["fx-hit-heavy-1", "fx-hit-heavy-2", "fx-hit-heavy-3", "fx-hit-heavy-4", "fx-hit-heavy-5"] },
"fx-crit":       { "grid": [5, 1], "px": 192, "names": ["fx-crit-1", "fx-crit-2", "fx-crit-3", "fx-crit-4", "fx-crit-5"] },
"fx-slash":      { "grid": [4, 1], "px": 160, "names": ["fx-slash-1", "fx-slash-2", "fx-slash-3", "fx-slash-4"] },
"fx-zap":        { "grid": [4, 1], "px": 160, "names": ["fx-zap-1", "fx-zap-2", "fx-zap-3", "fx-zap-4"] },
"fx-scorch":     { "grid": [5, 1], "px": 160, "names": ["fx-scorch-1", "fx-scorch-2", "fx-scorch-3", "fx-scorch-4", "fx-scorch-5"] },
"fx-social":     { "grid": [4, 1], "px": 128, "names": ["fx-social-1", "fx-social-2", "fx-social-3", "fx-social-4"] },
"fx-bite":       { "grid": [4, 1], "px": 128, "names": ["fx-bite-1", "fx-bite-2", "fx-bite-3", "fx-bite-4"] },
"fx-sweat":      { "grid": [4, 1], "px": 128, "names": ["fx-sweat-1", "fx-sweat-2", "fx-sweat-3", "fx-sweat-4"] },
"fx-land-dust":  { "grid": [6, 1], "px": 256, "names": ["fx-land-dust-1", "fx-land-dust-2", "fx-land-dust-3", "fx-land-dust-4", "fx-land-dust-5", "fx-land-dust-6"] },
"fx-debris":     { "grid": [5, 1], "px": 160, "names": ["fx-debris-1", "fx-debris-2", "fx-debris-3", "fx-debris-4", "fx-debris-5"] },
"fx-ko-stars":   { "grid": [6, 1], "px": 192, "names": ["fx-ko-stars-1", "fx-ko-stars-2", "fx-ko-stars-3", "fx-ko-stars-4", "fx-ko-stars-5", "fx-ko-stars-6"] },
"fx-parry":      { "grid": [4, 1], "px": 128, "names": ["fx-parry-1", "fx-parry-2", "fx-parry-3", "fx-parry-4"] },
"fx-dust-decals": { "grid": [3, 1], "px": 256, "names": ["fx-dust-decal-1", "fx-dust-decal-2", "fx-dust-decal-3"] }
```

`px` is the longest side of one frame in the game's atlas: big, fast bursts
get more pixels, small icons fewer.

## Size budget

All 14 sheets come to about 60 frames. At the sizes above they add roughly
1024 × 1500 px to the item atlas: about 350–500 KB in the single-file build,
which is 8.4 MB of its 16 MB limit today. The website loads them on demand.

## Priority

1. `hit`, `land-dust`, `crit`: seen in every fight.
2. `bite`, `ko-stars`, `hit-heavy`, `sweat`.
3. `slash`, `zap`, `scorch`, `social`, `debris`, `parry`, `dust-decal`.

## Hand-back checklist

1. Drop each sheet in `art/items/` with the file name above, and add its
   manifest line.
2. Run `pnpm --filter @cc/art-pipeline items` and check the frames came out in
   order (`apps/client/src/replay/items/items.json` lists `fx-<id>-1…n`).
3. Run `pnpm check`, then watch a Sandbox fight: the painted effect replaces its
   stand-in. If an effect sits too big or too small, change its `size` in
   `impact-fx.ts`, not the art.
4. Check the single-file size (`pnpm --filter @cc/client build:standalone`).
