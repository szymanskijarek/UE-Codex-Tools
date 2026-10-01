# Career Crash: art brief for the image-generation agent

> **Status:** §2, §5, §6 and §9 are delivered and in the game.
> Still to come: §3 boss faces, §4 body sheets, §7 damage sheets and §8 the
> referee. Their references are in `art/heads/_reference/boss-sheet-*.webp`,
> `art/sheets/BODY_SHEET_PROMPTS.md` and `art/obstacles/DAMAGE_SHEET_PROMPTS.md`;
> attach those to the prompts.

Everything the game still draws with placeholder "programmer art", plus new face
variants and the sprites for ten new arena hazards. Every section has a
ready-to-paste prompt, the exact file layout the importers expect, and where
each file goes.

**Order of work** (biggest visible gain first):

1. Faces: `hurt3` and `surprised2` for 66 careers (§2).
2. Props players see in every fight (§6).
3. Human summons (§5).
4. Boss faces (§3).
5. Hazards (§9).

The rest can come in any order.

---

## 1. House style (paste this before every prompt)

> Pixel-art game asset for "Career Crash", a comedic 2D workplace brawler.
> Chunky, clean pixel art with a thick dark outline (#1b1f2a), flat colour
> fills with one shade tone, light from the top left, bright readable palette,
> 3/4 top-down view (we see the front and a little of the top). Transparent
> background, no ground shadow, no text, no labels, no watermark, no frame.
> Each object isolated with generous empty space around it.

**Rules every file must follow (the importers rely on them):**

- **Background:** transparent. Flat white works only where a section says so.
- **Grid:** one object per grid cell, nothing touching the cell edges, and no
  empty cells (fill a spare cell with a duplicate and say so).
- **Order:** reading order, left to right then top to bottom, exactly as listed.
- **Reference:** when a section names reference images
  (`art/heads/_reference/`), attach them. The new art must look like the same
  character or object.

---

## 2. Face variants: `hurt3` and `surprised2` (66 careers)

The game already has, for each career: `neutral`, `angry`, `surprised`, `hurt`
(eyes squeezed shut, teeth clenched) and `hurt2` (the "fun pain" set: one eye
popping, tongue out). These two new variants add variety. The game picks
randomly between all hurt or all surprised faces whenever a fighter gets hit or
startled, and fight photos use them too.

**Format:**

- **Size:** one head per file, 256 × 256 px, transparent background.
- **Framing:** head only, centred, filling about 85% of the canvas, same 3/4
  angle and size as the reference.
- **Include:** hats, helmets, hair accessories and glasses, exactly as in the
  reference. No neck, no body, no hands.
- **Files:** `art/heads/hurt3/<career>.png` and `art/heads/surprised2/<career>.png`.
- **Reference:** `art/heads/_reference/<career>.webp`, the career's neutral
  head. Always attach it.

### Prompt: `hurt3` ("seeing stars")

> [House style] Single cartoon head, 256 × 256, transparent background. The
> SAME character as the attached reference (same face shape, skin tone, hair,
> headwear, glasses, facial hair, colours), now just took a heavy hit and is
> DAZED: eyes turned into dizzy spirals, a fresh red bump on the forehead,
> one cheek swollen, mouth wobbly and open, a tooth chipped, little cartoon
> stars circling above the head. Headwear knocked slightly askew. Keep the
> head the same size and angle as the reference.

### Prompt: `surprised2` ("shock horror")

> [House style] Single cartoon head, 256 × 256, transparent background. The
> SAME character as the attached reference (same face shape, skin tone, hair,
> headwear, glasses, facial hair, colours), now utterly SHOCKED: eyes popping
> wide out of the head, tiny pupils, eyebrows flying up off the forehead, jaw
> dropped comically low, hair (or hat) jumping up, a single sweat drop. Keep
> the head the same size and angle as the reference.

**Careers** (file names; the matching reference is
`art/heads/_reference/<name>.webp`):

`accountant, archaeologist, astronaut, baker, barista, beekeeper, builder,
bus-driver, carpenter, chef, chimney-sweep, clown, conspiracy-podcaster,
delivery-driver, dentist, dj, dog-groomer, electrician, engineer, farmer,
fashion-designer, firefighter, flight-attendant, florist, food-critic,
fortune-teller, gardener, hairdresser, hotel-concierge, ice-cream-vendor,
influencer, janitor, journalist, lawyer, librarian, life-coach, lifeguard,
magician, marine-biologist, mechanic, mime, museum-curator, nurse, painter,
paramedic, personal-trainer, photographer, plumber, police-officer, politician,
postal-worker, programmer, psychologist, sailor, scientist, security-guard,
tailor, tattoo-artist, taxi-driver, teacher, train-conductor, tv-host,
veterinarian, welder, window-cleaner, zookeeper`

**Special cases:**

- **Astronaut:** keep the visor and show the expression on the visor display,
  as the reference does.
- **Mime:** keep the white face paint.
- **Clown:** keep the make-up; the red nose can squeak off in `hurt3`.

**Import:** `pnpm --filter @cc/art-pipeline faces`, nothing else.

---

## 3. Boss faces (12 bosses × 5 heads)

The 12 ladder bosses have bodies but no painted faces. They wear one fixed head
and never change expression.

- **Format:** same as §2, 256 × 256 single heads.
- **Files:** `art/heads/<frame>/<boss>.png` for the frames `neutral`, `angry`,
  `surprised`, `hurt` and `hurt2`.
- **Reference:** `art/heads/_reference/boss-sheet-<boss>.webp`, the boss's body
  sheet. Copy the head from it.
- **Bosses:** `airline-captain, ceo, chief-surgeon, harbour-master, head-chef,
  hotel-manager, impresario, museum-director, site-foreman, stationmaster,
  store-manager, warehouse-foreman`.

> [House style] Single cartoon head, 256 × 256, transparent background, of the
> boss character on the attached sheet (copy the head exactly: face, hair,
> hat, glasses, facial hair, colours). Make five versions, one file each:
> NEUTRAL (smug, self-important half smile), ANGRY (furious, red-faced, veins
> popping, teeth bared), SURPRISED (wide eyes, open mouth), HURT (eyes squeezed
> shut, teeth clenched, wincing), HURT2 (one eye popping, tongue out,
> cross-eyed, comedic). Same size and angle in all five.

---

## 4. Body sheets still missing (4 careers)

Security Guard, Delivery Driver, Janitor and Engineer still draw a plain body
under their painted face. Full prompts are in `art/sheets/BODY_SHEET_PROMPTS.md`.
Save the results as `art/sheets/<career>.png`.

---

## 5. Human summons (9 characters, 2 poses each)

Callable helpers ("The Intern", "Paparazzo"…) currently draw as a plain
coloured stick figure. They use the same format as the summoned animals.

- **Format:** sheets of 1024 × 512 px, 4 columns × 2 rows of 256 px cells,
  transparent background.
- **Cells:** each character takes two cells side by side. Pose A is a neutral
  stance; pose B is mid-action (the animation alternates them).
- **Scale and footing:** draw everyone at the same scale, about 200 px tall
  standing (smaller than a fighter), feet on the cell's bottom edge.
- **Files:** `art/critters/humans-1.png`, `humans-2.png`, `humans-3.png`.

> [House style] Sprite sheet 1024 × 512, transparent background, 4 columns × 2
> rows of 256 px cells. Small full-body cartoon people (chibi proportions:
> big head, short body), feet on the bottom of each cell, all at the same
> scale. Each character appears twice side by side: pose A standing, pose B
> doing their thing. Characters, in order: [list below]

| Sheet | Cells (A, B per character) |
|---|---|
| `humans-1` | **Intern**: eager young office intern with lanyard and a coffee tray (B: tray wobbling) · **Paparazzo**: scruffy photographer in a vest with a huge flash camera (B: flash going off) · **Paralegal**: neat suit, arms full of legal files (B: files flying) · **Bellhop**: red bellhop uniform and pillbox hat, pushing nothing (B: offering a tiny bell) |
| `humans-2` | **School Kid**: backpack, school cap, sticky lolly (B: tugging a sleeve, mid-yell) · **Tourist**: Hawaiian shirt, bum bag, sun hat, camera round neck (B: pointing at a map) · **Superfan**: foam finger, face paint, fan T-shirt (B: screaming, foam finger high) · **Audience Member**: theatre-goer in a cardigan holding a programme (B: gasping, programme over mouth) |
| `humans-3` | **Campaign Volunteer**: rosette, clipboard and leaflets (B: thrusting a leaflet forward) · then the same Campaign Volunteer again in the remaining 6 cells (filler, ignored on import) |

I'll wire these into the renderer once they arrive. This needs a small code
change (human summons switch from stick figures to these sprites).

---

## 6. Props still drawn as placeholders (18 props, 8 held items)

### 6a. Small props and held weapons (3 item sheets)

- **Format:** 1254 × 1254 px, 4 columns × 2 rows, one item per cell, transparent
  background, same look as `art/items/diner-station.png`.
- **Size:** items are drawn big and centred in their cell; the game scales them
  down.
- **Files:** `art/items/<sheet>.png`.

> [House style] Item sheet 1254 × 1254, transparent background, 4 columns × 2
> rows, one object per cell, each centred and large with empty space around
> it, in this exact order: [list below]

| Sheet | Cells (reading order) |
|---|---|
| `misc-b` | birthday cake (slice missing, candles) · cardboard cereal box (cartoon mascot) · frozen turkey (frosty, in netting) · garden rake · open laptop (stickers on the lid) · olive oil bottle (tall, green glass) · bag of crisps / snack packet · soda can (red) |
| `misc-c` | red office stapler · yellow "WET FLOOR" A-frame sign (wobbly man icon, no readable text) · red wine bottle · takeaway coffee cup with lid and sleeve · rubber chicken (yellow, comic) · cardboard supermarket promo display stand (empty, colourful) · fire axe (red head) · French baguette |
| `tools-c` | police baton · claw hammer · leaf blower (petrol, orange) · moon rock (grey, cratered, faintly glowing) · string mop · screwdriver (yellow handle) · rubber gloves (yellow, pair) · hi-vis vest (filler, ignored) |

### 6b. Big props (1 obstacle-style sheet)

These stand on the floor, about as tall as a person or bigger.

- **Format:** 1254 × 1254 px, 3 columns × 2 rows, same look as
  `art/obstacles/office.png`.
- **File:** `art/obstacles/props-big.png`.

> [House style] Large-object sheet 1254 × 1254, transparent background, 3
> columns × 2 rows, one object per cell, same 3/4 view and scale feel as office
> furniture, in this order: office water cooler (blue bottle on top) · bean-to-cup
> coffee machine (big, chrome, lots of buttons) · robot vacuum cleaner (round,
> seen from 3/4, small "eyes" light) · supermarket shopping trolley (empty,
> chrome) · cardboard promo display tower (filled with snack boxes) · a second
> shopping trolley tipped on its side (filler, may be used later)

### 6c. Floor effects (optional, 1 sheet)

Puddles, spills and fire are drawn as plain coloured shapes. Flat, top-down
splats would look better.

- **Format:** 1254 × 1254, 4 × 2.
- **File:** `art/items/floor-fx.png`.

> [House style] Floor-decal sheet 1254 × 1254, transparent background, 4 × 2,
> each a FLAT irregular splat seen from above (it lies on the floor), no
> objects standing up: water puddle (light blue, reflective glint) · black oil
> slick (rainbow sheen) · orange soda spill (bubbles) · flood pool (big, wavy
> edge) · patch of small flames (low fire on the floor) · white fire-extinguisher
> foam cloud · scattered electric sparks on the floor · smashed glass shards

---

## 7. Damaged and destroyed obstacles (6 arenas + docks)

Full prompts and grids are in `art/obstacles/DAMAGE_SHEET_PROMPTS.md`: 13 sheets.

---

## 8. The referee

The referee is still a hand-drawn stick figure (white and black stripes, "REF"
label).

- **Body:** the same format as the career body sheets in
  `art/sheets/BODY_SHEET_PROMPTS.md`, saved as `art/sheets/referee.png`.
  Description: *a lanky, tired football-style referee in a black-and-white
  striped shirt, black shorts, long socks, whistle on a cord, a yellow card
  peeking from the breast pocket.*
- **Head:** five heads as in §3 (`neutral` (stern), `angry`, `surprised`,
  `hurt`, `hurt2`), saved as `art/heads/<frame>/referee.png`.

The referee needs a small code change to switch from the stick figure to the
puppet. I'll do it on import.

---

## 9. New arena hazards (design, plus the sprites they need)

The arenas already have timed hazards: falling boxes, spills, fire drills and
machines that patrol. These ten add pushing, sweeping and environmental chaos.
Each has a warning cue so players can react; that matters, because the game
announces hazards a moment before they hit.

| # | Hazard | Arena(s) | What it does | Engine work |
|---|---|---|---|---|
| H1 | **Industrial fan** | warehouse, construction | A big floor fan spins up (2 s warning), then blows a strong wind across a strip of the arena for 4 s. Fighters slide sideways, light props fly, thrown things curve. | New *wind zone* (a temporary conveyor-style push over a region). |
| H2 | **Desk-fan gale** | office | A row of desk fans on full: a weaker, wider gust. Paper stacks explode into flying sheets, which briefly blind anyone they hit. | Same wind zone, weaker, plus spawned paper. |
| H3 | **Revolving door** | hotel | Spins up fast. Anyone close gets caught and flung out of the far side, dizzy. | New *spinner* (a fixed point that flings nearby fighters). |
| H4 | **Sprinklers** | office, hospital, warehouse | Ceiling sprinklers burst over a region: puts out fires and leaves a slippery wet floor; electric gear sparks. | Uses existing spills and statuses; needs only the art. |
| H5 | **Crane hook swing** | docks, construction | A hook on a chain swings across the arena along a marked line, knocking down whoever it hits. | Uses the existing patrolling-machine system along a swing path. |
| H6 | **Runaway trolley train** | supermarket | A long nested line of trolleys careers down an aisle and bowls fighters over. | Existing patrolling machine. |
| H7 | **Rolling boulder exhibit** | museum | A prop boulder breaks loose from an exhibit and rolls across the hall (Indiana-Jones style). | Existing patrolling machine. |
| H8 | **Runaway gurney** | hospital | An empty gurney rattles down the ward. It may scoop a fighter up and carry them along. | Existing patrolling machine, plus the existing "rider" mechanic. |
| H9 | **Stage trapdoor** | theatre | A marked trapdoor opens. Whoever stands on it drops out of sight, then pops up elsewhere dazed. | New *trapdoor* (a region that removes a fighter and sends them back after a delay). |
| H10 | **Steam vent** | diner (kitchen), warehouse | Floor grate blasts steam: blinds and lightly burns anyone on it, and pushes them upward. | Existing area effects and statuses; needs only the art. |

### 9a. Hazard sprite sheet A: big pieces (obstacle style)

- **Format:** 1254 × 1254, 3 columns × 2 rows, same look as `art/obstacles/*.png`.
- **File:** `art/obstacles/hazards-a.png`.

> [House style] Large-object sheet 1254 × 1254, transparent background, 3 × 2,
> same 3/4 view as warehouse and office furniture, in this order:
> 1. industrial floor fan, big caged blades, on a wheeled stand — blades
>    STILL (we see each blade)
> 2. the same industrial fan, blades a SPINNING blur, small wind lines
>    blowing out the front
> 3. hotel revolving door (glass, brass frame, four wings), seen 3/4
> 4. ceiling sprinkler head spraying a wide cone of water downward (just the
>    head and its spray, no ceiling)
> 5. stage trapdoor in a wooden floor, CLOSED (square hatch, hinges, a painted
>    warning stripe)
> 6. the same stage trapdoor OPEN (dark hole, hatch flipped up)

### 9b. Hazard sprite sheet B: movers and small parts (obstacle style)

- **Format:** 1254 × 1254, 3 × 2.
- **File:** `art/obstacles/hazards-b.png`.

> [House style] Large-object sheet 1254 × 1254, transparent background, 3 × 2,
> in this order:
> 1. a steel crane hook on a short heavy chain, seen 3/4, slightly swinging
> 2. a line of 4 nested shopping trolleys pushed together, side view 3/4
> 3. a big round sandstone boulder with a cracked museum label plaque stuck to it
> 4. an empty hospital gurney on wheels (white sheet, rails)
> 5. a floor steam vent grate with a big white steam cloud bursting up
> 6. a row of three office desk fans on a long desk, blowing (wind lines)

### 9c. Hazard effects (item sheet)

- **Format:** 1254 × 1254, 4 × 2, flat effects.
- **File:** `art/items/hazard-fx.png`.

> [House style] Effect sheet 1254 × 1254, transparent background, 4 × 2: a
> horizontal wind streak (white lines, curling) · a second wind streak variant
> · a flying sheet of paper (tumbling) · a cluster of flying papers · a water
> spray droplet burst · a white steam puff · a dizzy-stars ring (yellow stars
> in a circle, for dazed fighters) · a dust cloud (grey, for trapdoor drops)

**Implementation note:**

- **H4, H6, H7, H8 and H10** reuse systems the game already has. They can ship
  as soon as their sprites arrive.
- **H1, H2, H3 and H9** each need one new engine mechanic (wind zone, spinner,
  trapdoor). They take a round of balance testing.

---

## 10. Hand-back checklist

When the files come back, drop them in the folders named above and tell me. I
will then:

1. Run the matching importer:
   - `faces` for §2, §3 and §8 heads;
   - `items` for §6a, §6c and §9c;
   - `items obstacles` for §6b, §9a and §9b;
   - `critters` for §5;
   - `puppets` for §4 and §8 bodies.
2. Make the small code changes noted in §5, §8 and §9.
3. Add the hazards to the arenas and run the balance reports.
4. Check every sheet in the browser before releasing.
