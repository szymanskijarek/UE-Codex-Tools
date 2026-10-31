# Regards, Wall Street 2: heads (four per character)

> Part of the Regards, Wall Street art set (`art/wallstreet/README.md`).

The game swaps heads during a fight (a company beating the market looks
smug, one being margin-called looks horrified) and uses them as portraits in
the ticker.

**Reference to attach:** the character's own body sheet from `art/sheets/`
(`npc-ws-<id>.png`). Generate the body first.

## Format

- **One head per file, 256 × 256 px,** transparent background, head only,
  centred, filling about 85% of the canvas, the same 3/4 angle facing right
  as the head on the body sheet, with the same hat, hair, glasses and ears.
- **Files:** `art/heads/<expression>/npc-ws-<id>.png`.
- **Expressions:** `neutral`, `angry`, `surprised`, `hurt`.

## Prompt (one per head)

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet, same hat, hair, glasses and accessories. No text, no letters, no
> logos. Expression: [EXPRESSION]

Replace `[EXPRESSION]` with the character's line from the table.

| Character (`id`) | `neutral` (default) | `angry` (shouting) | `surprised` | `hurt` |
|---|---|---|---|---|
| Scrum Master (`ws-scrum-master`) | eager grin, earbuds in | shouting "blocker!", hoodie strings flying | eyes wide, a sticky note stuck to the forehead | wincing, earbud dangling |
| Engagement Farmer (`ws-engagement-farmer`) | camera smile, ring light glowing behind | yelling at the camera, ring light flaring | mouth an O, bucket hat jumping off | eyes shut, ring light cracked |
| Brand Ambassador (`ws-brand-ambassador`) | big launch-day smile, cap backwards | bellowing, veins out, cap twisted | jaw dropped, cap flying off | grimace, cap over one eye |
| Shelf Stacker (`ws-shelf-stacker`) | patient half-smile, glasses on the chain | stern "not in my aisle" glare, glasses pushed up | glasses swinging, eyebrows up | eyes shut, bun half undone |
| Sales Rep (`ws-sales-rep`) | dazzling pitch smile | snarling, hair out of place | smile frozen, eyes popping | wince, stethoscope tangled round the ear |
| Vest Bro (`ws-vest-bro`) | tired confident smirk | shouting into an invisible phone, red-faced | eyes wide, hair standing up | eyes squeezed shut, hair flopped forward |
| Roughneck (`ws-roughneck`) | steady grin, goggles on the hard hat | roaring, goggles down | goggles snapped onto the eyes, mouth open | grimace, hard hat dented |
| Forklift Certified (`ws-forklift-certified`) | serious safety-officer frown | yelling "BACK IT UP!", moustache bristling | eyebrows shot up, ear defenders askew | eyes shut, moustache drooping |
| Quarry Boss (`ws-quarry-boss`) | dusty cheerful grin | shouting, dust puffing off | eyes wide, a little dust cloud above | coughing grimace, eyes shut |
| Meter Reader (`ws-meter-reader`) | calm, unbothered, cap straight | mildly cross, cap pulled down (his angriest) | eyebrows raised a millimetre | eyes shut, cap knocked sideways |
| Open House Agent (`ws-open-house-agent`) | professional beaming smile, sunglasses up | furious, sunglasses down | sunglasses dropped onto the nose, mouth open | wincing, hair messed up |
| The Floor Specialist (`ws-specialist`) | stern referee face, whistle in mouth | shouting, whistle dropped, face red | eyes bulging, pencil flying from behind the ear | eyes shut, whistle bent |
| The Temp (`ws-temp`) | nervous hopeful smile | trying to look angry, failing | terrified, hair standing up | eyes shut, coffee splash on the cheek |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-ws-<id>` import as `npc.ws-<id>:<expression>`; the ticker
portraits pick them up straight away.
