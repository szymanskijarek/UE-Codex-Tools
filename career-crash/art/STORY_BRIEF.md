# Story mode and Messages: brief for the image agent

> **Status:** in progress. Part A delivered and in the game (14 Oct 2026): all five cards (`rugpull-card` kept for the friend's return, phase 3), the temp sticker (on temps' chests in fights) and lanyard (on temps' portraits), and the four connection badges (on the profile). Part B (gig characters) not started. Design: `docs/career-crash/12-career-story.md`.
> Nothing here blocks the game: until the art lands, it uses emoji, arena art,
> CSS and the careers' own looks in its place. Part A is phase 4; Part B (the
> gig casts) can be imported any time, like gatecrashers.

This file is self-contained: hand it to the image agent with the reference
images it names.

## What these are for

Career mode is getting a story told through LinkedIn-style messages: a friend
introduces you to the network, a recruiter unlocks your first fight, the friend
fights two fights with you and then leaves for a crypto DAO, agency temps fill
in, and later the friend comes back when the DAO collapses. Most of it reuses
art the game already has (career faces, crypto bros, delegates, the BSN cast,
arena backdrops). What is new is a handful of **feed and message cards**
(illustrations shown inside posts and threads), a way to make **temps look
temporary**, and **connection badges**.

No new characters: the friend is generated from existing careers, and every
cameo has art already.

## House style (paste this before every prompt)

> Pixel-art illustration for "Career Crash", a comedic 2D workplace brawler
> that parodies a professional networking site. Chunky, clean pixel art with a
> thick dark outline (#1b1f2a), flat colour fills with one shade tone, light
> from the top left, bright readable palette, friendly cartoon proportions,
> workplace slapstick. No text, no letters, no numbers, no logos, no labels, no
> watermark, no frame, no blood or gore.

**References to attach:** `art/heads/_reference/body-sheet-example.webp` (the
character style) and one arena backdrop, `art/arenas/office.png` (the scene
style). The cards must look like they belong next to these.

## Rules every image must follow

1. **No text at all.** The game writes names, numbers and captions over or
   under the art in HTML, so it can be translated and changed. Any sign, card
   or screen in a picture is blank or has squiggle "writing".
2. **Exact canvas size** as listed. Cards are opaque (full scene); badges and
   stickers have a transparent background.
3. **Safe area.** Cards are cropped to 16:9 on desktop and 4:3 on phones:
   keep everything that matters in the middle 75% of the width.
4. **People are generic.** Background figures are the game's style of office
   workers with simple faces, mixed ages and skin tones, nobody recognisable,
   no real brands. The friend is never shown face-on (it's a different career
   in every save): seen from behind, or as a hand, or only as their desk.
5. **Colours.** At most about 16 colours per card, flat fills, hard edges. No
   soft gradients (they band when compressed).

## Part A: cards, temp markers, badges

| # | File | Where it shows | Size (px) | Background |
|---|---|---|---|---|
| 1 | `feed-empty.png` | The empty feed on a brand-new profile | 960 × 540 | opaque |
| 2 | `intro-card.png` | The friend's "Delighted to introduce my oldest friend" post | 960 × 540 | opaque |
| 3 | `farewell-card.png` | The friend's leaving post when they join the DAO | 960 × 540 | opaque |
| 4 | `offer-letter.png` | The offer letter after each chapter boss | 960 × 540 | opaque |
| 5 | `rugpull-card.png` | The friend's comeback post when the DAO dissolves | 960 × 540 | opaque |
| 6 | `temp-sticker.png` | A temp's torso in fights (item atlas) | 256 × 256 | transparent |
| 7 | `temp-lanyard.png` | Corner badge on a temp's portrait | 256 × 256 | transparent |
| 8 | `badge-1…4.png` | Connection milestones 50 / 100 / 250 / 500+ | 256 × 256 each | transparent |

### 1. `feed-empty.png`: the quiet feed

> An empty open-plan office at mid-morning: rows of identical desks with
> nobody at them, office chairs pushed in, a single tumbleweed rolling down
> the aisle between the desks, a lone potted plant leaning sadly, a water
> cooler with one bubble rising. Soft daylight through big windows. Calm,
> faintly lonely, funny. Wide shot, centred on the tumbleweed.

### 2. `intro-card.png`: you've been introduced

> A busy networking event in a hotel function room: a crowd of cheerful
> office workers in lanyards turning towards the viewer and waving, raising
> coffee cups and paper plates of canapés. In the foreground, seen from behind,
> one person (only their back, shoulder and raised arm visible) gestures
> grandly at the crowd as if presenting them. Bunting, a buffet table, name
> badges with blank cards. Warm, welcoming, slightly too enthusiastic.

### 3. `farewell-card.png`: the friend leaves for a DAO

> An office desk being cleared out: a cardboard box holding a mug, a small
> plant and a framed photo turned away from the viewer. On the desk, an
> oversized fold-out leaving card covered in squiggle signatures and doodled
> hearts, and a shiny gold coin balanced on top of the card like a trophy.
> Behind the desk, a laptop screen glowing with an upward green chart line and
> rocket doodles. Bittersweet and silly.

### 4. `offer-letter.png`: the offer letter

> A crisp offer letter on a clipboard, lying on a polished boardroom table,
> lines of squiggle writing and a big empty signature line. A red boxing glove
> rests on the corner of the clipboard like a paperweight, and a fountain pen
> lies next to it. A small gold rosette sticker on the letter. Spotlight-like
> light from the top left, the rest of the table falling into shadow. Feels
> like an important moment, played straight.

### 5. `rugpull-card.png`: the DAO dissolves

> A trendy startup office the morning after: beanbags deflated, a neon sign
> switched off (blank tubes, no letters), a ping-pong table folded up, a crowd
> of empty energy drink cans. In the middle of the floor a large rug is being
> yanked out of frame to the right, and a stack of gold coins topples off it
> mid-air. A single cardboard box waits by the door. Comic, not sad.

### 6. `temp-sticker.png`: the visitor sticker

> A single large peel-off visitor sticker, slightly crooked, with a bright red
> top band and a blank white writing area (no letters), one corner curling up.
> Seen flat-on, filling most of the canvas with 8% margin. Transparent
> background.

It is drawn small on a temp's chest in fights (about the size of a hand). The
game adds the word "TEMP" in its own font only on the portrait badge (#7),
not here.

### 7. `temp-lanyard.png`: the temp's lanyard badge

> A plastic ID badge on a short loop of bright orange lanyard, badge card blank
> (no photo, no text), a barcode stripe of plain bars at the bottom, slightly
> tilted. Filling most of the canvas with 8% margin. Transparent background.

### 8. `badge-1.png` … `badge-4.png`: connection milestones

One prompt, four tiers. Same shape in every file, centred, 8% margin:

> A chunky round rosette badge with two ribbon tails, the centre a plain
> empty disc (no numbers, no letters), small sparkle highlights. Transparent
> background.
>
> Tier variants (one image each): **badge-1** bronze rosette with blue ribbons;
> **badge-2** silver rosette with green ribbons; **badge-3** gold rosette with
> red ribbons; **badge-4** platinum rosette with purple ribbons and a small
> gold crown on top.

The game writes 50 / 100 / 250 / 500+ on the empty disc.

## Delivery

One zip under 30 MB, files named exactly as in the table (PNG). Re-delivering
a single file is fine.

## Import (phase 4, for the coding agent)

- Cards 1–5 and badges 8: source in `art/story/`, converted to WebP by a new
  `pnpm --filter @cc/art-pipeline story` step (sharp, as the other steps) into
  `apps/client/src/career/story-art/`; add the step to `PIPELINES.md` §5.
- `temp-sticker` and `temp-lanyard`: add to `art/items/` with names in
  `art/items/manifest.json` (`temp-sticker`, `temp-lanyard`), then
  `pnpm --filter @cc/art-pipeline items`. The renderer draws `temp-sticker` on
  the torso of fighters whose snapshot is a temp (needs a `temp` flag on the
  snapshot's appearance, render-only, no sim change); `Portrait` overlays
  `temp-lanyard` in the corner for temps.
- Check the slicer previews in `tools/art-pipeline/out/` before committing.

---

## Part B: the gig casts (invite-only gigs, 12 §8.2)

Gigs are one-off brawls offered in a message: a period-drama shoot, a posh
gala, a supermarket reopening, a cooking-show pilot. Each brings its own
characters. In the game today they fight with an existing career's body and
face; with this art they get their own look. **13 characters**, each a body
sheet and four heads, **exactly like the gatecrashers**: follow the layout,
reference images and head rules in `art/GATECRASHER_PROMPTS.md` (Parts 1 and 2)
and paste its house style. Never playable; funnier and more specific than the
careers. No real people, no real brands, no weapons beyond comedy props.

| # | Persona (file name) | Gig | Who they are, what they wear | Pose prop (in the hand piece) |
|---|---|---|---|---|
| 1 | `npc-gig-napoleonic` | Battlefield Extra | A film extra in a Napoleonic French Imperial Guard costume: tall bearskin hat slightly crooked, navy coat with white crossbelts and red epaulettes, white breeches, a lanyard with a film-set pass over the uniform, exhausted and furious | a prop musket made of painted foam, bent |
| 2 | `npc-gig-method-actor` | Battlefield Extra | A method actor in a green Rifles-style jacket (no insignia from a real regiment), dramatic hair, a single tear, refuses to break character | a rolled-up script |
| 3 | `npc-gig-stunt-double` | Battlefield Extra | A nervous stunt double in an identical costume to the actor but two sizes too big, knee pads and elbow pads visible over it, a helmet under the hat | a crash mat folded under one arm |
| 4 | `npc-gig-head-waiter` | Silver Service Waiter | An immaculate head waiter, sixties, slicked silver hair, white tailcoat jacket, black bow tie, a white cloth over one forearm, utterly disdainful | a silver cloche |
| 5 | `npc-gig-trainee-waiter` | Silver Service Waiter | A first-shift waiter, too-big waistcoat, crooked bow tie, name badge, terrified | a tray of wobbling champagne flutes |
| 6 | `npc-gig-posh-guest` | Silver Service Waiter | A tipsy aristocratic gala guest in evening dress (tuxedo or ball gown variant, pick the tuxedo), monocle, a paper charity raffle ticket in the lapel, flushed cheeks | a half-eaten vol-au-vent |
| 7 | `npc-gig-rival-mascot` | Store Mascot | A person in a slightly grubby full-body foam mascot costume of a cartoon badger, the head on but the face hole showing a grumpy human face | a giant foam pointing hand |
| 8 | `npc-gig-cabin-crew` | Focus Group | Budget-airline cabin crew: bright orange and purple uniform, neckerchief, a fixed smile that does not reach the eyes, hair in a bun | a drinks-trolley handle (the trolley stays off the sheet) |
| 9 | `npc-gig-performance-artist` | Night Guard | An avant-garde performance artist: all-black turtleneck and trousers, white face paint on half the face only, bare feet, intense | a single long-stemmed flower |
| 10 | `npc-gig-facilitator` | Team-building Away Day | An outdoor team-building facilitator: branded fleece with a blank logo patch, cargo shorts, hiking boots, lanyard with a whistle, relentless enthusiasm | a clipboard |
| 11 | `npc-gig-understudy` | Cooking Show Pilot | A celebrity chef's understudy: chef's whites with the celebrity's (blank) monogram, the same signature hairstyle copied badly, a microphone headset | a large wooden spoon |
| 12 | `npc-gig-sous-chef` | Cooking Show Pilot | A silent sous-chef with several kitchen timers clipped to the apron, a tall paper hat, wide eyes | a kitchen timer held up like a badge |
| 13 | `npc-gig-tv-judge` | Cooking Show Pilot | A TV cooking-show judge: sharp blazer over a black T-shirt, folded arms, one eyebrow permanently raised, reading glasses on a chain | a tasting spoon |

**Head expressions** (four per character, as for gatecrashers): `neutral`,
`angry`, `hurt`, `happy`. The napoleonic extra keeps the bearskin hat in every
head; the mascot's head is the human face inside the costume's face hole.

**Import:** body sheets as `art/sheets/npc-gig-<name>.png`, heads as
`art/heads/<expression>/npc-gig-<name>.png`, then the usual puppet and face
steps (`PIPELINES.md` §5.1, §5.3). The game picks them up by persona id
(`npc.gig-<name>`) with no code change.
