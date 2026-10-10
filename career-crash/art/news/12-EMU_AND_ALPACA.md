# Broken News 12: the emu and the alpaca witness (*Man vs Emu*)

> **Status (10 October 2026):** open. Stand-ins (🦙, 🦤) are in the game until
> these land. Part of the Broken News art set (`art/news/README.md`).

Two animals on location for episode `2026-w42-emu` (*Man vs Emu*): Rupert
reports from the side of the A381 in Devon, where an escaped emu called
**Side Neck** wrestled a man and won.

| # | Who | Where it appears | Frames |
|---|---|---|---|
| A | **The alpaca witness** ("a woolly gentleman of Andean extraction") | next to Rupert, slowly panning into frame from the right edge as he mentions the witness, then standing there for the rest of the report, deadpan | 2: still and chewing |
| B | **Side Neck, the emu** | tiny, far behind Rupert in the field, dashing back and forth by the gate at the end of the report: he's loose again | 2: running, legs alternating |

Both are **sprites on a transparent background**. The game puts them over the
sheep-field plate (`art/news/location-sheep-field.png`), moves them and swaps
the two frames: the alpaca chews every 0.7 s, the emu's legs swap every
0.11 s. They are stand-ins for the real animals in a real story, so: friendly
cartoon animals, nothing that looks like the real farm, its owner or the man.

**References to attach:** `art/news/location-sheep-field.png` (where they
stand: overcast, light rain, muddy green field) and
`art/news/field-rupert-neutral.png` (the field pictures' style and scale).

## Style preamble (paste first)

> Pixel-art game sprite for "Career Crash", a comedic 2D game, in the style of
> the attached news pictures: chunky clean pixel art, thick dark outline
> (#1b1f2a), flat colours with one shade tone, soft overcast light from the
> top left (it's a grey, drizzly day in a Devon field), friendly cartoon
> proportions. Transparent background, one animal, full body, side view, feet
> on the bottom edge of the canvas, nothing else in the picture: no ground,
> no shadow, no grass, no text. Both frames of an animal must match exactly
> in size, position and colours, so they can be flipped between.

## A. The alpaca witness (two frames, 768 × 768)

The joke: the only witness to the duel, completely unbothered, staring
straight down the camera with total judgement while Rupert treats it like a
war-crimes tribunal. Long neck, fluffy cream-white fleece, a big woolly
topknot over the eyes, banana-shaped ears, half-closed unimpressed eyes,
a slight underbite.

> [Preamble.] 768 × 768. A cream-white alpaca standing side-on with its body
> facing left, its long neck upright and its head turned to look straight
> at the viewer. Fluffy fleece with a big woolly topknot, tall banana-shaped
> ears, heavy-lidded, deeply unimpressed eyes, a small underbite. Mud on its
> feet. Calm, still, judging. It fills about 85% of the canvas height.
> [FRAME]

| File | [FRAME] |
|---|---|
| `art/news/cameo-alpaca.png` | Mouth closed, jaw to one side, mid-chew. |
| `art/news/cameo-alpaca-b.png` | The same alpaca, identical pose, jaw shifted to the other side, a wisp of grass poking out of its mouth. |

## B. Side Neck, the emu (two frames, 512 × 512)

The joke: he escaped, won the fight, went home, and is now out again. He's
named for **the way his head moves when he runs: his neck bends sideways**,
so his head sticks out to one side instead of up. Shaggy grey-brown
feathers, long powerful legs, a pale blue-grey neck, a beady orange eye, a
look of pure freedom. He's seen small and far away, so keep the silhouette
bold and simple: big body, long legs, the bent neck.

> [Preamble.] 512 × 512. A shaggy grey-brown emu running flat out, facing
> left, side view: a round body of messy drooping feathers, long strong grey
> legs with big three-toed feet, a pale blue-grey neck **bent sharply
> sideways at an angle** so the small head pokes out ahead and to one side,
> beak open in a happy honk, a beady orange eye, a few loose feathers flying
> behind him, two short white speed lines behind. He fills about 80% of the
> canvas. [FRAME]

| File | [FRAME] |
|---|---|
| `art/news/cameo-emu.png` | Front leg stretched forward, back leg kicked out behind (mid-stride). |
| `art/news/cameo-emu-b.png` | The same emu, identical body and neck, legs swapped: both legs gathered under the body, feet off the ground (mid-bound). |

## Sending

Four PNGs, about 2 MB each, so one zip (`Emu-and-Alpaca.zip`) is fine.

## Importing

Claude converts the four PNGs to WebP (quality 80, the alpaca at 512 px wide,
the emu at 256 px) as `apps/client/src/news/art/cameo-<who>.webp` and
`cameo-<who>-b.webp`. The game picks them up by name (`CAMEO_ART` in
`Studio.tsx`) and the stand-in glyphs go away; no script changes. Then check
the field and split shots at `?ep=2026-w42-emu&at=26000` (the alpaca) and
`&at=43500` (the emu) and nudge `.bn-cameo-beside` / `.bn-cameo-far` in
`news.css` if their size or height looks off against the plate.
