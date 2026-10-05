# Character prompts: the missing character art (bosses excluded)

> **Status:** delivered and in the game: all five body sheets and the seven referee heads.

This file is self-contained: hand it to the image agent with the reference
images it names. Everything else in the game already has character art. What
is still missing:

| # | Character | What's missing | Why it matters |
|---|---|---|---|
| A | Security Guard | body sheet | Draws a plain stick body under his painted face |
| B | Delivery Driver | body sheet | Same |
| C | Janitor | body sheet | Same |
| D | Engineer | body sheet | Same |
| E | Referee | body sheet + 7 heads | Appears in every fight; still a hand-drawn stick figure with a "REF" label |

The four careers already have finished faces (all expressions); only their
bodies are missing. **The body must match the existing face**: same person,
headwear and colours. The descriptions below were written from those faces.

---

## Reference images to attach

All are in `career-crash/art/heads/_reference/`:

- **`body-sheet-example.webp`**: the builder's body sheet. **Attach it to every
  body-sheet prompt.** It shows the exact layout and style to copy.
- **`<career>.webp`**: the career's existing face, e.g. `janitor.webp`. Attach
  it to that career's prompt.

---

## Part 1: body sheets (A–E)

### Layout (copy `body-sheet-example.webp` exactly)

- **Canvas:** 1254 × 1254 px (or 1536 × 1024 landscape), transparent background.
- **Left half:** the full character standing, 3/4 view facing right, arms
  relaxed slightly away from the body, feet apart, **hands empty**.
- **Right half:** the same character cut into **13 separate pieces**, laid out
  like the example, each with a clear transparent gap around it:
  1. head (with hat or helmet)
  2. torso
  3. pelvis/hips
  4. left upper arm
  5. right upper arm
  6. left forearm with hand
  7. right forearm with hand
  8. left thigh
  9. right thigh
  10. left shin
  11. right shin
  12. left shoe or boot
  13. right shoe or boot
- **Pieces:** each one is complete, with its own outline and rounded joint ends
  so it can be pinned at shoulders, elbows, hips and knees.
- **Leave out:** extra pieces (no back of the head, no held tools, no second
  pose), text, labels, floor shadows and background.

### Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example
> (head, torso, pelvis, two upper arms, two forearms with hands, two thighs,
> two shins, two shoes), each piece outlined, with rounded joint ends and a
> clear gap around it. No text, no labels, no shadow, no extra pieces.

### A. Security Guard → `art/sheets/security-guard.png`

Attach `security-guard.webp` (face) and `body-sheet-example.webp`.

> A stocky middle-aged security guard. HEAD exactly as the attached face:
> navy-blue peaked cap with a gold shield badge, thick dark moustache, stern
> furrowed brows. Body: navy-blue uniform shirt (#1e3a8a) with short sleeves,
> shoulder epaulettes, a gold badge on the chest and a black radio clipped to
> the shoulder; heavy black utility belt with pouches and a key ring; dark navy
> trousers; polished black boots. A little belly. Hands empty.

### B. Delivery Driver → `art/sheets/delivery-driver.png`

Attach `delivery-driver.webp` (face) and `body-sheet-example.webp`.

> A wiry young delivery driver, always in a hurry. HEAD exactly as the attached
> face: red-and-white trucker baseball cap, messy dark hair, big friendly grin.
> Body: red courier polo shirt (#dc2626) with a white collar and a small parcel
> logo on the chest, a lanyard with an ID card, beige cargo shorts with bulging
> pockets, high-vis yellow ankle socks, scuffed white running trainers.
> Hands empty.

### C. Janitor → `art/sheets/janitor.png`

Attach `janitor.webp` (face) and `body-sheet-example.webp`.

> A calm, seen-it-all school janitor. HEAD exactly as the attached face: blue
> baseball cap, big bushy dark moustache, droopy unimpressed eyes. Body:
> slate-blue work overalls (#475569) over a light grey T-shirt, a name tag on
> the chest, a yellow rag hanging from the back pocket, a big ring of keys on
> the belt loop, sleeves rolled up, dark work boots with rubber toes.
> Hands empty.

### D. Engineer → `art/sheets/engineer.png`

Attach `engineer.webp` (face) and `body-sheet-example.webp`.

> A confident bearded site engineer. HEAD exactly as the attached face:
> yellow hard hat with dark goggles strapped on the front, full brown beard,
> focused squint. Body: teal work jacket (#0f766e) with an orange high-vis
> stripe across the chest and arms, worn open over a checked shirt; a tape
> measure and a pencil on the belt; grey cargo work trousers with knee pads;
> brown steel-toe boots. Make him clearly different from the builder: teal
> jacket instead of blue overalls, no tool belt full of tools. Hands empty.

### E. Referee → `art/sheets/referee.png`

No face reference exists yet. This sheet defines his look, and his heads in
Part 2 must match it.

> The fight referee: a lanky, tired, middle-aged football-style referee with a
> long neck and a receding hairline (short grey-brown hair at the sides, shiny
> on top), thick black eyebrows and a neat grey moustache. Black-and-white
> vertically striped referee shirt with a black collar and short sleeves, a
> silver whistle on a black cord round his neck, a yellow card peeking out of
> the breast pocket, black shorts, long black socks with white tops, black
> football boots. Hands empty.

---

## Part 2: referee heads (7 heads)

These are the faces the game swaps between during a fight, as for every other
character.

- **Format:** one head per file, **256 × 256 px**, transparent background,
  head only (no neck or shoulders), centred, filling about 85% of the canvas,
  same 3/4 angle facing right as the head on the referee body sheet.
- **Consistency:** all seven must be the same man at the same size.
- **Reference:** generate the body sheet (E) first, then attach it.
- **Files:** `art/heads/<expression>/referee.png`, where `<expression>` is the
  name in bold below.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The REFEREE from the attached
> sheet (receding grey-brown hair, shiny top, thick black eyebrows, neat grey
> moustache, whistle cord visible at the bottom edge). Expression: [one of the
> list below].

1. **neutral**: stern, unimpressed, about to blow the whistle; the whistle in
   his mouth is fine.
2. **angry**: red-faced, veins popping, blowing the whistle so hard his cheeks
   puff out, eyebrows in a V.
3. **surprised**: eyes wide, eyebrows high, whistle dropping out of his open
   mouth.
4. **hurt**: eyes squeezed shut, teeth clenched, wincing.
5. **hurt2**: one eye popping wide, the other squeezed, tongue out, cross-eyed:
   comedic pain.
6. **hurt3**: dazed, dizzy spiral eyes, a red bump on the forehead, little
   stars circling above the head.
7. **surprised2**: eyes popping out of the head, jaw dropped very low, eyebrows
   flying off the forehead, a single sweat drop.

---

## Hand-back checklist

- [ ] `art/sheets/security-guard.png`
- [ ] `art/sheets/delivery-driver.png`
- [ ] `art/sheets/janitor.png`
- [ ] `art/sheets/engineer.png`
- [ ] `art/sheets/referee.png`
- [ ] `art/heads/{neutral,angry,surprised,hurt,hurt2,hurt3,surprised2}/referee.png`
  (7 files)

**Importing:** `pnpm --filter @cc/art-pipeline puppets <career>` slices each
body sheet; check the labelled preview in `tools/art-pipeline/out/puppets/`.
`pnpm --filter @cc/art-pipeline faces` imports the referee heads. The referee
then needs a small code change to switch from the stick figure to his puppet.
