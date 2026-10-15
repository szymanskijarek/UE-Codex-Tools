# Career Crash: your own face, unlockable costumes, and one art style (plan)

Status: **proposal, nothing built.** Covers two pieces of work that share one
art pass:

1. **Wardrobe.** Your fighter keeps the same face for the whole game. A new
   career no longer swaps the whole sprite. It unlocks that career's costume,
   and you choose what to wear.
2. **Art-style reset.** Character art was made over many sessions from
   prompts that contradict each other. One style bible, one body template and
   a normalising step in the pipeline bring it all back into line.

The goals are **efficiency** (less art per career, less manual slicing) and
**retention** (a character the player feels is theirs, plus a collection to
fill). The order matters: do the style reset *as part of* the wardrobe work,
not before it. Most of today's heads would be thrown away by the wardrobe
anyway (§3.1), so restyling them first would pay for the same art twice.

---

## 1. Where we are

### 1.1 How a fighter is drawn today

- One body atlas per career (`replay/puppets/<career>.webp`, sliced from
  `art/sheets/<career>.png`, PIPELINES §5.1).
- One painted head per career and emotion (`replay/faces/faces.webp`, 64 px,
  PIPELINES §5.3): 66 careers × up to 7 frames (neutral, angry, surprised,
  hurt, hurt2, hurt3, surprised2). **The hat is painted into the head.**
- The puppet is built from the character's latest career
  (`careers[careers.length - 1]`), so changing career changes everything,
  face included. Every chef in every fight is the same person.
- `Puppet` already takes a separate face key (`faces`, used for Diplomatic
  Incident delegates on a borrowed body). Face and body can already come from
  different places; what's missing is a head without a hat.
- `CharacterSnapshot.appearance` (`skin`, `hair`, `hairStyle`) travels in
  battle inputs, but the sim never reads it. Adding optional fields to it
  doesn't change goldens.

### 1.2 What's wrong with the style (audit of the 78 career and boss sheets)

| Problem | Where | Effect |
|---|---|---|
| Two families of faces | `art/faces/` (first 36: chunky pixels, hard outline) vs `art/faces-b/` (newer 30: smoother, finer detail, soft shading) | Neighbours in a fight look as if they come from two different games |
| Body outliers | **teacher**: realistic proportions, long legs, heels, sexualised; **mechanic** and **plumber**: smaller, brighter, a different chibi; **lifeguard** and **personal trainer**: exaggerated muscle; **store manager**: different build | The teacher, beside the builder, is the most obvious case |
| Different pixel density | Effective pixel size changes from sheet to sheet, some sheets aren't really pixel art | Some fighters look blurred next to others |
| Layout drift | hairdresser, barista and teacher sheets have extra or loose pieces | Hand fixes in `art/sheets/manifest.json` (`cut`, `split`, `cutX`) |
| One woman's face, many jobs | Most female careers share the same brown-bun face | Feels like a single character in many costumes, the opposite of what we want |

Most of the cast (builder, firefighter, accountant, chef, police officer and
others) already agree with each other, but the owner wants a more
interesting look than any of today's art, so everything moves to the new
target in §3.2.

---

## 2. Target design: face + outfit + headwear

A fighter is put together from three independent layers:

| Layer | Chosen | Art per item | Changes with emotion |
|---|---|---|---|
| **Face** (bare head, hair, features) | at character creation, can change later | 7 frames + 1 "hat hair" | yes |
| **Outfit** (headless body: 13 pieces on the shared template) | in the Wardrobe, from unlocked outfits | 1 sheet | no |
| **Headwear** (hat, helmet, cap) | in the Wardrobe, from any unlocked headwear, or none | 1 sprite | no |

Drawn back to front: body → face → headwear. Face and headwear anchor on fixed
points of the template head (neck point, crown line), so any face fits any
outfit and any hat fits any face.

### 2.1 Headwear: the hard part

Every headwear item gets a **type**, and each type has a rule:

| Type | Examples | Rule |
|---|---|---|
| `cap` | baseball caps, chef's hat, beret, peaked caps, top hat | Face switches to its **hat-hair** frame (hair cropped to fit under the standard hat line), hat drawn on top |
| `helmet` | hard hat, firefighter helmet, astronaut helmet | Hat-hair; helmets with visors draw a front overlay (glass) over the face |
| `face` | surgical mask, sunglasses, goggles, clown nose, mime paint | Separate "face accessory" slot, drawn over the face; works with any headwear |

Rules that keep it fair to every player:

- **Headwear is always optional.** A "Show headwear" toggle per fighter (on by
  default for opponents, remembered for the player). A costume never forces a
  hat.
- **Faces may have their own headwear** (hijab, turban, kippah, headscarf,
  durag). Such a face is marked `ownHeadwear`. Then career caps are hidden by
  default, and only helmets that plausibly go over it (hard hat, firefighter,
  astronaut) are offered. A player never has to remove their own headwear to
  wear a uniform.
- **Big hair** (afro, high bun, long curls) needs its hat-hair frame drawn
  with care: it's one extra head per face, not one per hat.

### 2.2 Gender-specific clothing

- **Every outfit fits every face.** No outfit is locked by face, body or
  pronoun.
- **One body template** at launch (§3.2: head : body 1 : 2), neutral enough
  for any face. A second build (broad/stocky) is optional later, and
  doubles outfit art, so only if players ask for it.
- **Uniforms are drawn unisex by default:** trousers, scrubs, overalls,
  jackets. Careers whose current outfit is a skirt or dress (teacher, flight
  attendant, fortune teller, store manager) get the unisex version as the
  career's outfit, and the skirt or dress becomes **its own unlockable
  outfit** that anyone can wear (a kilt and a long coat join the same
  "Formalwear" set so it isn't one-sided).
- The teacher is redesigned from scratch to the house proportions (comedic,
  cardigan and elbow patches; not a pin-up).

### 2.3 Wardrobe and unlocks (the retention part)

**Character creation.** "Start your career" gets a face strip under the job
preview: 8 faces shown, a 🔀 shuffle, one pre-selected so creation stays one
tap. The live `PuppetView` shows the chosen face in the chosen job's outfit.
Adds no new screen.

**The Wardrobe** is a tab in each fighter's screen next to Gear: outfit grid
(unlocked, plus silhouettes of locked ones with how to get them, like
masteries), headwear grid, face accessory, "Show headwear" toggle, and a
"Wear new uniform when I change jobs" switch (on by default, so nothing feels
lost).

**Sources of outfits:**

| Source | What | Cost in art |
|---|---|---|
| Joining a career | Its standard outfit and headwear | 1 sheet + 1 hat (needed anyway) |
| Career rank **Lead / Head** | Same outfit in "senior" colours (gold trim, darker cloth) | **None**: a palette swap, possible once the palette is fixed (§3.2) |
| Chapter bosses (12 §7) | The boss's outfit, as an offer-letter reward | Already in the boss sheets |
| Gatecrasher sets beaten (07) | One trophy piece per set (24): veil, crown, hi-vis tabard | Headwear sprites only |
| Corner Shop | Rotating outfits and hats for cash | Reuses the above; gives cash a sink (03 §8) |
| Story / Messages | "There's a new uniform in your locker" from HR; a Feed post: "Excited to share I'm now wearing…" | Text only |

All of it is cosmetic, per 03 §6.1: no field the sim reads, nothing that
changes a fight.

**Why this should help retention:**

- **Identity.** The fighter is a person, not a job. Their face is still there
  at level 30, in every photo and feed post.
- **Collection.** 66 outfits, ~45 headwear, 24 trophies and their senior
  variants, with visible silhouettes: a reason to try one more career or
  beat one more set.
- **Short goals.** "2 fights to Lead: senior uniform" on the hub.
- **Variety.** Opponents and hires get random faces, so two chefs are two
  different people, and a squad looks like a team rather than a costume rack.

**Old saves.** Each existing fighter gets the closest new face (a table from
the 66 old career faces to the new set), the outfit of their current career,
and every career they have held unlocked. HR sends a message about the new
Wardrobe the first time they load.

---

## 3. The art-style reset

### 3.1 What survives and what's redrawn

| Asset | Today | After | Action |
|---|---|---|---|
| Career heads | 66 × 7 frames (~460 heads), hats painted in | **16 faces × 8 frames (128)** | Replaced by the face set |
| Bodies | 78 sheets, mixed styles | 78 headless outfits on one template | Re-dressed on the template |
| Headwear | painted into heads | ~45 sprites on 3–4 item sheets | New, cut from the old heads' design |
| Boss heads | puppet head sprite, one expression | Bosses become outfits; the boss *characters* keep a fixed face from the set | Folded in |
| Gatecrasher, delegate and crypto bro art (~170) | bespoke sheets and heads | unchanged at first | Normalise only (§3.3); redraw later if needed |

Cost of a **new career** afterwards: one outfit sheet and, at most, one hat.
Today it is one body sheet plus seven heads plus manifest fixes.

### 3.2 The target look: "VGA caricature"

The owner's references are two low-resolution, realistic-leaning portraits:
a pixelated photo portrait (front view, ~44 px wide, rich skin tones, beard
and wool texture made of pixel noise, black lines only on the glasses) and an
early-90s RPG/adventure dialogue portrait (3/4 view, ~32 px, a 1 px black
silhouette, warm painted shading, no inner outlines, plus a 16 px icon of the
same head). Both look **painted or photographed first, then reduced to
pixels**. Both are more interesting than today's flat chibi, and both would
turn grim or blurry in a comedy brawler if copied straight.

The target keeps their surface and adds the comedy back:

| From the references (more interesting) | Kept from today (accessible and fun) |
|---|---|
| Real skull and face anatomy, 3/4 view facing right | Each face exaggerates **one signature feature** (nose, brows, jaw, ears, hair) by 20–30 % |
| Many-step, hue-shifted skin (shadows towards red-violet, light towards yellow) | Big readable eyes: always a coloured iris pixel and a white highlight; brows 2 px thick, carrying the emotion |
| Pixel noise as texture on hair, beards, wool, tweed | Flat, clean colour on clothes so outfits read at fight size |
| 1 px near-black outer silhouette, no inner black lines (except glasses and dark features) | Saturated accent colours for uniforms and hats (hi-vis, chef white, police blue) |
| Warm key light top left, cool rim light from the right | Big head: head : body about **1 : 2** (today 1 : 1.4), so faces stay the star in a fight |

**References for the image agent and for review:**

| Reference | Take from it |
|---|---|
| *Ultima VII* and *Darklands* character portraits (1992) | The second sample's look: painted-then-pixelled, 3/4 view, silhouette outline |
| *Gabriel Knight: Sins of the Fathers* and *Quest for Glory IV* dialogue portraits (1993–94) | Realistic faces with strong, readable expressions |
| *Indiana Jones and the Fate of Atlantis*, *The Secret of Monkey Island 2* close-ups (1991–92) | Rich VGA colour, hue-shifted skin, light dithering on texture only |
| Wadjet Eye Games: *Blackwell*, *Unavowed* portraits | The same style made by hand today, at our sizes |
| *Thimbleweed Park* | Tone: comedic, caricatured, but every character a real person; body proportions |
| *Papers, Please* | Low-res realistic faces that are still funny, and faces built from parts, much like our face set |
| *Day of the Tentacle* | How far caricature can go before it stops being a person (don't go past it) |

**Sizes.** Faces are drawn at **48 × 48 px native** (today's 64 px atlas cells
hold them with room for hats). Portraits in menus, the personnel file and
fight photos are the same art at ×2 or ×3, nearest-neighbour. Chips and icons
are an automatic 24 px reduction. No second portrait set.

**How the look is captured, so it holds across many sessions:**

1. **Style tile first.** One face in all 8 frames, one outfit and one hat,
   iterated with the image agent from the references until the owner signs it
   off. It's the anchor attached to every later prompt.
2. **Palette from the tile.** The signed-off tile's colours become the master
   palette (`art/template/palette.json`, about 64 colours in named ramps: skin
   ×6, hair ×6, cloth, metal, accents). Accent ramps are reserved by hand: a
   palette worked out automatically drops them (see the test below).
3. **Paint big, pixelate in the pipeline.** The image agent paints at about
   8× size (384 px heads) in the target style; `normalise` reduces to 48 px,
   snaps to the palette and draws the silhouette outline. The look comes from
   a deterministic tool, not from prompt luck, which is how the references
   were made too.
4. **The rules in writing:** `career-crash/art/STYLE.md` (this section plus the
   template and palette), attached to every character brief; it replaces the
   house-style preambles copied around today's briefs.

**First test (October 2026).** Seven of today's smooth heads through a quick
`normalise` prototype (44 px, a 40-colour palette taken from the heads
themselves, 1 px outline). The pixel texture already looks like the
references and the two face families stop looking like two games. But the
automatic palette washed out the accents (the fortune teller's purple went
grey) and the cute 3-pixel eyes stopped reading. So the palette must be
built by hand, and the source art must be drawn in the target proportions
(real eyes and brows, not chibi), not just shrunk.

**Bodies and the template.** `art/template/mannequin.png`: a bald, neutral
figure at 1 : 2, in the standard pose, its 13 pieces at **fixed positions on a
fixed grid**. Outfits are briefed as "dress this mannequin". Fixed boxes mean
the slicer reads cells instead of guessing blobs, so the `cut`/`split`/`cutX`
fixes go away for new art.

### 3.3 Tooling (makes it mechanical, not taste-by-taste)

New `@cc/art-pipeline` steps:

| Command | Does |
|---|---|
| `normalise <files>` | Downscale to the native grid, snap to the master palette, rebuild the outline, scale back up with nearest-neighbour. Makes any input (or an old sheet) match the bible |
| `lineup [set]` | One contact sheet of every face, outfit or hat side by side (like the audit image) for review |
| `stylecheck` | Fails on: colours off-palette above a threshold, missing outline, wrong head : body ratio, piece outside its template cell. Runs in `pnpm check` on new art |
| `faces` / `puppets` | Extended for the face set, hat-hair frames, headwear sheets and template-grid outfits |

`normalise` is also the cheap fix for the ~170 gatecrasher, delegate and
crypto bro sheets: run it once, without new art, and they move most of the
way to the house style.

### 3.4 Production order

1. **Style tile** (brief: `career-crash/art/STYLE_TILE_BRIEF.md`): 3 faces
   (one in all 8 frames, one with her own hijab), the body template, the
   builder's outfit and 3 hats. Owner approves the look before anything else
   is made; teacher, chef and astronaut outfits follow as the first wave.
2. Face set: 16 faces as 4 × 4 grids, one sheet per frame (8 sheets).
   Spread across skin tones, ages, hair types and gender presentation; 2–3
   with their own headwear; glasses and beards as part of some faces.
3. Outfits in waves of ~10, **starting with the 28 starting careers**, then
   tier1-b, tier 2, bosses.
4. Headwear and face accessories: 3–4 item sheets, taken from the old heads'
   hat designs.

Briefs go in `career-crash/art/WARDROBE_BRIEF.md` in the `FX_BRIEF.md` format
(sizes, file names, ready-to-paste prompts, import lines).

---

## 4. Implementation plan

Each phase ships on its own and leaves the game working.

| Phase | What | Art needed | Visible to players |
|---|---|---|---|
| **0. Spike** (1 session) | `normalise` + `lineup` prototype run on teacher, builder, mechanic and two face sheets; template draft; style bible draft | none | no |
| **1. Layered puppet** | `appearance.look` (`face`, `outfit`, `headwear`, `faceAcc`, `showHeadwear`), all optional; `Puppet` composes face + outfit + headwear with fixed anchors; renderer, `PuppetView`, fight photos and feed portraits use it. A missing piece falls back to today's career art, so old and new art can coexist | none (works with today's art) | no change |
| **2. Style test** | Template, 4 faces, 4 outfits, a few hats imported; Sandbox gets face/outfit/hat pickers | §3.4 step 1 | Sandbox only |
| **3. Faces and creation** | Face set imported; face strip in "Start your career"; random faces for opponents, hires, temps; old saves mapped | §3.4 step 2 | **yes**: own face |
| **4. Wardrobe** | Wardrobe tab, unlock sources (career, rank colours, bosses, shop), HR message and feed post, auto-wear switch | §3.4 steps 3–4, in waves | **yes**: costumes |
| **5. Collection** | Gatecrasher trophies, silhouettes, hub goal line ("2 fights to Lead uniform"); `normalise` over the NPC art | trophy hats | yes |
| **6. Clean-up** | Retire the per-career head atlas once every career is on the new art; update PIPELINES §5, INDEX, 03 §4.3/§6 | none | smaller download |

Technical notes:

- **Determinism and goldens:** `look` lives in `appearance`, which the sim
  never reads. No `SIM_VERSION` bump, no golden changes. A test asserts that
  changing `look` leaves a battle's result unchanged.
- **Content:** outfits and headwear become content (`data/wardrobe/*.json`:
  id, type, unlock source, price, palette variant), validated by the compiler
  like other cosmetics (no stats, tags, abilities or rules).
- **Download size:** the face atlas (the biggest image) drops from ~460 heads
  to ~130. Outfit atlases stay one per career and load lazily as now.
- **Other pages:** Crypto Bros, Diplomatic Incident and Broken News keep
  their bespoke heads (`faces` override path): a persona with its own head is
  treated as "fixed head, no headwear layer".
- **Measuring retention:** the site has no tracking by design (`#/privacy`),
  so there is no retention number to watch. Options: judge it by play-testing,
  or add an anonymous, cookie-free daily "a save was opened" counter to the
  existing API worker. Owner's call (§5).

---

## 5. Owner decisions (15 October 2026)

1. **Look:** neither of today's two styles. A new "VGA caricature" look from
   the owner's reference portraits (§3.2).
2. **Faces at launch:** 16.
3. **Faces with their own headwear:** yes, at launch.
4. **Changing your face later:** free for now.
5. **Body builds:** one at launch.
6. **Measuring retention:** not now; in the backlog (`WORKFLOW.md`, Next
   milestones).
