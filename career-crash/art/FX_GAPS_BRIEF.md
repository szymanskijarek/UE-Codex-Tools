# Effect gaps: brief for the image agent

> **Status:** requested 2 October 2026, not delivered yet. The game already
> looks for every name below: drop a sheet in, import it, and it replaces the
> stand-in. Nothing else needs changing in code.

This file is self-contained: hand it to the image agent together with the
reference images it names. It follows the same rules as `art/FX_BRIEF.md` (the
impact effects, all delivered).

## Audit (2 October 2026): what the arena still draws in code

Everything a fight shows was checked for shapes drawn in code instead of
painted art.

**Already painted (no work):** fighters, faces, critters, held and heavy
weapons, every prop, every obstacle with its damaged and destroyed state,
floor spills, hazards, and the 13 impact effects.

**Fixed now with art we already had:**

| Was drawn in code | Now uses |
|---|---|
| Fire on a burning fighter (orange triangles) | three flickering `fx-fire-patch` flames |
| Stars round a stunned or downed head | `fx-dizzy` (was in the atlas, unused) |
| Lightning lines on an electrified fighter | `fx-zap` frames on a loop |
| Foam blobs on a foamed fighter | `fx-foam-cloud` |
| Panic sweat and wet drips (blue ellipses) | `fx-sweat` frames and drops |
| Grey and brown rectangles where a wall breaks (your screenshot), and spark lines | `fx-debris` bursts, `land-dust`, a dust patch |
| Spark lines when glass or electrics break | `fx-sparks` |
| Coloured circles where a solid prop breaks | `fx-debris` and a dust patch; glass leaves `fx-broken-glass`, paper `fx-papers` |
| Melee ability arc | `fx-slash` |
| Explosion circles | `fx-debris` (the fireball itself still needs art, #10) |

**Still drawn in code until this brief is delivered:** the cast ring under
someone using an ability, ability cones, thrown ability blobs, lightning
beams, the explosion fireball, dash streaks, floor cracks after a slam, the
inspired, caffeinated and slipping effects, food and liquid splats, and the
stand-ins above (they work, but a dedicated loop reads better).

**Drawn on purpose (no art wanted):** health bars, name labels, team rings
and shadows, floor zone labels, conveyor arrows, floating combat text, the
red "RIVAL!" link.

## House style (paste this before every prompt)

> Pixel-art game effect for "Career Crash", a comedic 2D workplace brawler.
> Chunky, clean pixel art with a thick dark outline (#1b1f2a) on solid shapes,
> flat colour fills with one shade tone, bright readable palette, cartoon
> comic-book energy (think classic beat-'em-up hit sparks). Transparent
> background, no ground shadow, no text, no letters, no labels, no watermark,
> no frame, no characters, no blood or gore.

**References to attach:** `art/items/fx-hit.png`, `art/items/fx-debris.png`,
`art/items/fx-dust-decals.png`, `art/items/floor-fx.png` and
`art/items/hazard-fx.png` (the effects already in the game).

## Rules every sheet must follow

1. **One sheet per effect,** a single row of equal cells, left to right in
   playing order. Canvas = `cells × cell width` wide, one cell tall. Nothing may
   cross a cell edge; keep at least 6% empty margin in every cell (except the
   cone blast and the bolt, which start right at the left edge).
2. **Same origin in every frame.** "Centre" effects sit on the cell centre;
   "bottom" effects stand on a ground line 85% of the way down, centred
   horizontally.
3. **Loops loop.** Status effects (A) play over and over while the status
   lasts: frame 4 must flow back into frame 1, with no growing or fading.
4. **One-shots** (B) play once: they start small, peak, then break up into
   bits on the last frame rather than going transparent.
5. **Empty middle on body effects.** Status loops are drawn over a fighter,
   so leave the centre open (a person-shaped gap about 40% of the cell wide).
   Flames, sparks and drips go round the edges and the top.
6. **Tintable art (marked ✱)** is painted in white and light greys with the
   dark outline. The game colours it per ability (orange fire, blue water,
   purple social...), so no colour of its own.
7. **Directional** effects travel to the right (the move or force goes right).
   The game mirrors them.
8. **Floor decals** are flat on the floor seen from a 3/4 top-down view, so
   about twice as wide as they are tall. They stay for the whole fight, so keep
   them quiet: muted colours, no bright highlights.
9. At most about 12 colours per sheet, flat fills, hard edges, no glows or
   gradients.

## The sheets

### A. Status loops (4 frames each, looping)

| # | File | Shown while | Cell (px) | Anchor | Atlas px |
|---|---|---|---|---|---|
| 1 | `fx-status-burning.png` | on fire | 256 × 256 | bottom | 192 |
| 2 | `fx-status-electrified.png` | electrified | 256 × 256 | centre | 160 |
| 3 | `fx-status-wet.png` | soaked | 256 × 256 | bottom | 160 |
| 4 | `fx-status-dizzy.png` | stunned, or downed | 256 × 256 | centre | 128 |
| 5 | `fx-status-foamed.png` | covered in extinguisher foam | 256 × 256 | centre | 160 |
| 6 | `fx-status-inspired.png` | inspired (a team buff) | 256 × 256 | bottom | 160 |
| 7 | `fx-status-caffeinated.png` | caffeinated (fast and jittery) | 256 × 256 | centre | 128 |
| 8 | `fx-status-slipping.png` | slipping on a spill | 256 × 256 | centre | 160 |
| 9 | `fx-status-panic.png` | panicking (fleeing a critter) | 256 × 256 | centre | 128 |

**1. `fx-status-burning.png`, 1024 × 256**
> A looping cartoon fire animation in 4 frames, flames licking upward around
> an empty person-shaped gap in the middle: tall orange-and-yellow flame
> tongues on the left and right edges reaching to the top of the cell, small
> flames along the bottom, a few embers. Each frame the flame tips sway to a
> different shape; frame 4 flows back into frame 1.

**2. `fx-status-electrified.png`, 1024 × 256**
> A looping electric-crackle animation in 4 frames: three or four short jagged
> cyan-and-yellow lightning arcs jumping around the edge of an empty middle,
> tiny white sparks. The arcs jump to new positions every frame.

**3. `fx-status-wet.png`, 1024 × 256**
> A looping dripping animation in 4 frames: light-blue water drops with dark
> outlines falling down both sides of an empty middle onto the ground line,
> where they make small splash crowns and a thin puddle. Drops move down a step
> each frame.

**4. `fx-status-dizzy.png`, 1024 × 256**
> A looping "seeing stars" animation in 4 frames: five chunky yellow cartoon
> stars and two tiny birds circling on a tilted elliptical orbit (an orbit
> line in pale yellow). Each frame turns the ring a fifth of the way round.
> This sits above a head: no head, no character.

**5. `fx-status-foamed.png`, 1024 × 256**
> A looping foam animation in 4 frames: white fire-extinguisher foam blobs
> with pale blue-grey shading clinging round an empty middle, a few soap
> bubbles popping and re-forming. Gentle bubbling between frames.

**6. `fx-status-inspired.png`, 1024 × 256**
> A looping "motivated" animation in 4 frames: small golden 4-point sparkles
> and pale yellow upward chevrons rising from the ground line up both sides of
> an empty middle, each frame a step higher, new ones appearing at the bottom.

**7. `fx-status-caffeinated.png`, 1024 × 256**
> A looping jitter animation in 4 frames: short brown-and-white vibration
> lines and two wiggly coffee-steam squiggles around an empty middle, plus one
> tiny coffee bean. Lines jump position every frame, like a cartoon character
> buzzing on espresso.

**8. `fx-status-slipping.png`, 1024 × 256**
> A looping "losing your footing" animation in 4 frames, seen around a pair of
> feet in the middle (not drawn): light-blue water splash arcs flicking out
> sideways, two swirly white skid-mark curves on the floor, a couple of
> droplets. Splashes alternate left and right each frame.

**9. `fx-status-panic.png`, 1024 × 256**
> A looping panic animation in 4 frames: three big light-blue cartoon sweat
> drops with dark outlines flying off to the upper right from the lower left
> of the cell, plus two short black shock lines. Each frame the drops launch
> again from a new spot.

### B. Ability and impact one-shots

| # | File | Plays when | Frames | Cell (px) | Anchor | Directional | Atlas px |
|---|---|---|---|---|---|---|---|
| 10 | `fx-explosion.png` | something explodes (gas bottle, microwave) | 6 | 256 × 256 | centre | no | 256 |
| 11 | `fx-dash.png` | someone dashes or dodges | 4 | 256 × 256 | bottom | **yes** | 160 |
| 12 | `fx-cast-ring.png` ✱ | someone is using an ability (the ring under them) | 1 | 256 × 256 | centre | no | 192 |
| 13 | `fx-cone-blast.png` ✱ | a cone ability (a spray, a shout, a blast) | 1 | 384 × 256 | left edge, middle | **yes** | 256 |
| 14 | `fx-projectile.png` ✱ | a ranged or lobbed ability in flight | 1 | 128 × 128 | centre | **yes** | 96 |
| 15 | `fx-bolt.png` | a lightning ability arcing to its target | 1 | 512 × 128 | left edge, middle | **yes** | 384 |

**10. `fx-explosion.png`, 1536 × 256**
> A cartoon explosion animation in 6 frames: (1) a small white-yellow flash,
> (2) a round orange-and-yellow fireball with a dark outline, (3) the fireball
> at full size with a jagged edge and flying chips, (4) the fire turning into
> billowing dark-grey smoke puffs with orange inside, (5) smoke puffs spreading
> out, (6) a few small smoke puffs and embers.

**11. `fx-dash.png`, 1024 × 256, moving right**
> A cartoon dash animation in 4 frames: a scuff of beige floor dust at the
> bottom middle and four horizontal white speed streaks trailing off to the
> left (the runner went right). (1) short streaks and a puff, (2) long streaks,
> (3) streaks breaking into dashes, dust spreading, (4) two short dashes and a
> thin puff.

**12. `fx-cast-ring.png` ✱, 256 × 256**
> A magic-circle ring seen from straight above: a perfect circle made of a
> thick white band with a dark outline, small white runes replaced by simple
> geometric ticks (no letters), four small diamond studs at the compass
> points. White and light grey only. The game squashes it flat onto the floor
> and colours it.

**13. `fx-cone-blast.png` ✱, 384 × 256, pointing right**
> A comic blast wedge: a cone of white wind and shockwave lines fanning out to
> the right from a point on the middle of the left edge, about 90 degrees wide,
> with curved pressure arcs and a few speed streaks, outlined in dark. White
> and light grey only.

**14. `fx-projectile.png` ✱, 128 × 128, flying right**
> A thrown cartoon energy blob: a round white orb with a dark outline and a
> short tapered white motion trail to its left, one small highlight. White and
> light grey only.

**15. `fx-bolt.png`, 512 × 128, left to right**
> A single horizontal cartoon lightning bolt spanning the whole width from the
> middle of the left edge to the middle of the right edge: jagged yellow and
> cyan with a white-hot core and dark outline, a couple of short side forks.

### C. Floor decals (3 variants each, still images)

| # | File | Left behind when | Cell (px) | Atlas px |
|---|---|---|---|---|
| 16 | `fx-rubble-decals.png` | a wall or obstacle breaks | 512 × 256 | 256 |
| 17 | `fx-crack-decals.png` | a body slams into the floor hard | 512 × 256 | 256 |
| 18 | `fx-chips-decals.png` | a solid prop breaks (chairs, laptops, boxes) | 384 × 192 | 192 |
| 19 | `fx-splat-food-decals.png` | food breaks (a cake, a watermelon, a pizza) | 384 × 192 | 192 |
| 20 | `fx-splat-liquid-decals.png` ✱ | a drink or bottle breaks | 384 × 192 | 192 |

**16. `fx-rubble-decals.png`, 1536 × 512**
> Three variants of a flat rubble heap on the floor: broken plaster and
> concrete chunks, a few wood splinters and a bent bracket, settled in a
> low pile with grey dust around it. Muted greys and browns.

**17. `fx-crack-decals.png`, 1536 × 512**
> Three variants of floor cracks where something heavy slammed down: dark
> jagged crack lines radiating from a small shattered centre, a few loose
> floor-tile chips. Mostly dark lines on transparent, no floor surface.

**18. `fx-chips-decals.png`, 1152 × 192**
> Three variants of small broken bits scattered on the floor: wood splinters,
> grey plastic shards, a screw, a spring, a keycap. Muted colours, small
> pieces spread loosely.

**19. `fx-splat-food-decals.png`, 1152 × 192**
> Three variants of a comic food splat on the floor: red sauce and cream
> splodges with crumbs, a lettuce leaf, a squashed tomato slice and seeds.
> Cartoony, not gross.

**20. `fx-splat-liquid-decals.png` ✱, 1152 × 192**
> Three variants of a spilled-drink splash on the floor: a puddle with
> splash droplets around it and a few round drips. White and light grey with
> the dark outline only; the game colours it by drink.

## Importing

Copy the PNGs into `art/items/` and add these lines to
`art/items/manifest.json`, then run `pnpm --filter @cc/art-pipeline items`:

```json
"fx-status-burning": {"grid": [4, 1], "px": 192, "names": ["fx-status-burning-1", "fx-status-burning-2", "fx-status-burning-3", "fx-status-burning-4"]},
"fx-status-electrified": {"grid": [4, 1], "px": 160, "names": ["fx-status-electrified-1", "fx-status-electrified-2", "fx-status-electrified-3", "fx-status-electrified-4"]},
"fx-status-wet": {"grid": [4, 1], "px": 160, "names": ["fx-status-wet-1", "fx-status-wet-2", "fx-status-wet-3", "fx-status-wet-4"]},
"fx-status-dizzy": {"grid": [4, 1], "px": 128, "names": ["fx-status-dizzy-1", "fx-status-dizzy-2", "fx-status-dizzy-3", "fx-status-dizzy-4"]},
"fx-status-foamed": {"grid": [4, 1], "px": 160, "names": ["fx-status-foamed-1", "fx-status-foamed-2", "fx-status-foamed-3", "fx-status-foamed-4"]},
"fx-status-inspired": {"grid": [4, 1], "px": 160, "names": ["fx-status-inspired-1", "fx-status-inspired-2", "fx-status-inspired-3", "fx-status-inspired-4"]},
"fx-status-caffeinated": {"grid": [4, 1], "px": 128, "names": ["fx-status-caffeinated-1", "fx-status-caffeinated-2", "fx-status-caffeinated-3", "fx-status-caffeinated-4"]},
"fx-status-slipping": {"grid": [4, 1], "px": 160, "names": ["fx-status-slipping-1", "fx-status-slipping-2", "fx-status-slipping-3", "fx-status-slipping-4"]},
"fx-status-panic": {"grid": [4, 1], "px": 128, "names": ["fx-status-panic-1", "fx-status-panic-2", "fx-status-panic-3", "fx-status-panic-4"]},
"fx-explosion": {"grid": [6, 1], "px": 256, "names": ["fx-explosion-1", "fx-explosion-2", "fx-explosion-3", "fx-explosion-4", "fx-explosion-5", "fx-explosion-6"]},
"fx-dash": {"grid": [4, 1], "px": 160, "names": ["fx-dash-1", "fx-dash-2", "fx-dash-3", "fx-dash-4"]},
"fx-cast-ring": {"grid": [1, 1], "px": 192, "names": ["fx-cast-ring"]},
"fx-cone-blast": {"grid": [1, 1], "px": 256, "names": ["fx-cone-blast"]},
"fx-projectile": {"grid": [1, 1], "px": 96, "names": ["fx-projectile"]},
"fx-bolt": {"grid": [1, 1], "px": 384, "names": ["fx-bolt"]},
"fx-rubble-decals": {"grid": [3, 1], "px": 256, "names": ["fx-rubble-decal-1", "fx-rubble-decal-2", "fx-rubble-decal-3"]},
"fx-crack-decals": {"grid": [3, 1], "px": 256, "names": ["fx-crack-decal-1", "fx-crack-decal-2", "fx-crack-decal-3"]},
"fx-chips-decals": {"grid": [3, 1], "px": 192, "names": ["fx-chips-decal-1", "fx-chips-decal-2", "fx-chips-decal-3"]},
"fx-splat-food-decals": {"grid": [3, 1], "px": 192, "names": ["fx-splat-food-1", "fx-splat-food-2", "fx-splat-food-3"]},
"fx-splat-liquid-decals": {"grid": [3, 1], "px": 192, "names": ["fx-splat-liquid-1", "fx-splat-liquid-2", "fx-splat-liquid-3"]}
```

Sheets can arrive one at a time; each replaces its stand-in as soon as it is
imported.
