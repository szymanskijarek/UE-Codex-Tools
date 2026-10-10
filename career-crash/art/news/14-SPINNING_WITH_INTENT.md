# Broken News 14: *Spinning With Intent* (the *Chairs Recalled* minigame)

> **Status (10 October 2026):** open. The game is built as a block-out
> (shapes and labels); each picture here replaces its shape by name as soon
> as it's imported. Part of the Broken News art set (`art/news/README.md`).

**The game:** top down. You are **Jeff's recalled office chair** (the one
that hit Brock in *Chairs Recalled*), loose in the BSN building. Roll out of
the props store, through the newsroom and the green room, into Studio 1, and
hit **Brock** at the anchor desk hard enough to knock him over. The chair
keeps its momentum, so every turn has to be planned; walls and furniture
cost it integrity. Jeff is never seen, only heard ("Come back! That one's
recalled!").

The camera looks **straight down** (a floor plan, not an angled view). The
game turns the chair and moves the camera, places the furniture and tiles the
floors, so **every picture is one object, seen from directly above, on a
transparent background** (floors and walls are seamless tiles instead).

| # | What | Pictures |
|---|---|---|
| A | The chair: wheelbase, seat in three states of damage, wrecked | 5 |
| B | Brock at the desk, from above: unaware, startled, knocked over | 3 |
| C | Furniture, from above | 10 |
| D | Floors and wall (seamless tiles) | 5 |

**References to attach:** `art/news/fx-rogue-chair.png` (Jeff's chair as it
looks in the show: match its colours), `art/news/desk-brock-neutral.png`
(Brock: hair, suit, red tie), `art/news/desk-backdrop.png` (the studio's
navy, red and chrome).

## Style preamble (paste first)

> Game sprite for "Career Crash", a comedic 2D game, in the style of the
> attached pictures: chunky clean pixel art, thick dark outline (#1b1f2a),
> flat colours with one shade tone, light from the top left, friendly
> cartoon proportions. **Seen from directly above** (a top-down floor-plan
> view, no perspective, no horizon). Transparent background, one object
> centred and filling the canvas as described, no shadow on the ground, no
> floor, no text, no letters, no logos.

## A. The chair (five pictures, 512 × 512)

The game draws the **wheelbase** and the **seat** separately: the base turns
with the steering and the seat spins on top, so they're two pictures. Same
blue as the rogue chair in the show.

| File | Prompt (after the preamble) |
|---|---|
| `art/news/chair-base.png` | The five-star wheelbase of an office chair from directly above: five black plastic legs from a round chrome hub, each ending in a black caster wheel, filling about 90% of the canvas, perfectly symmetrical, nothing on top. |
| `art/news/chair-1.png` | The seat of a blue office chair from directly above, as if sitting on it: a round padded blue seat cushion in the centre (about 60% of the canvas wide) with the curved padded backrest along the **left** edge, two black armrests at the top and bottom. Brand new, glossy. |
| `art/news/chair-2.png` | The same seat, identical size and position: scuffed, a coffee stain on the cushion, one armrest cracked, a strip of tape on the backrest. |
| `art/news/chair-3.png` | The same seat, identical size and position: badly battered, the cushion split with yellow foam poking out, one armrest missing, the backrest dented and hanging at an angle, a spring sticking out. |
| `art/news/chair-broken.png` | The chair in pieces from above, spread around the centre: the seat cushion, the backrest, both armrests, a couple of loose wheels and a spring, little dust puffs. Comic, not sad. |

## B. Brock at the desk (three pictures, 512 × 512)

Brock sits on the open side of the anchor desk, **facing right** (towards the
cameras). From above you see the top of that famous helmet of glossy
chestnut hair, his broad navy shoulders, the red tie and his hands on a
script. The game draws the desk separately (C), so draw only Brock in his
anchor chair.

| File | Prompt (after the preamble) |
|---|---|
| `art/news/brock.png` | A TV news anchor in a black swivel chair seen from directly above, facing right: the top of a big glossy chestnut hair helmet, broad shoulders in a tight navy suit, the red tie just visible, both hands holding a script in front of him on the right. Relaxed, unaware. Fills about 70% of the canvas. |
| `art/news/brock-startled.png` | The same anchor, same size and position, face turned up towards the viewer in alarm (we see his face from above: wide eyes, mouth open), the script flying up, hands raised. |
| `art/news/brock-hit.png` | The same anchor knocked out of his chair, lying sprawled on his back seen from above, arms and legs out like a starfish, dizzy spiral eyes, three stars circling his head, the script pages scattered around, the hair helmet perfectly intact. |

## C. Furniture (ten pictures)

Each one fills its whole canvas edge to edge (the game stretches it over the
object's footprint, so keep the proportions).

| File | Size | Prompt (after the preamble) |
|---|---|---|
| `art/news/news-desk.png` | 440 × 220 | A newsroom desk from above: wood-effect top, two computer monitors, a keyboard, scattered papers, a mug and a desk phone. |
| `art/news/sofa.png` | 480 × 200 | A teal green-room sofa from above: three seat cushions, the backrest along the top edge, two cushions and a magazine on it. |
| `art/news/plant.png` | 256 × 256 | A big potted office plant from above: a round terracotta pot rim, a spray of broad green leaves filling the canvas. |
| `art/news/water-cooler.png` | 256 × 256 | An office water cooler from above: the round blue water bottle top in the centre of a white square unit, a stack of paper cups beside it. |
| `art/news/camera.png` | 256 × 256 | A TV studio camera on a wheeled pedestal from above: the camera body and lens pointing left, a teleprompter hood on the front, the round pedestal base with three wheels, a cable trailing off. |
| `art/news/light.png` | 256 × 256 | A studio light stand from above: a tripod of three legs, a round black spotlight on top with barn doors, glowing yellow at the front. |
| `art/news/anchor-desk.png` | 320 × 600 | The BSN anchor desk from above: a tall curved desk, glossy navy and chrome with a red stripe, its curve bulging to the **left**, the open working side on the **right** (where Brock sits), two laptops and a mug on top. |
| `art/news/coffee-cart.png` | 280 × 160 | A catering trolley from above: a steel cart with an urn, rows of cups, a plate of biscuits, a stack of napkins. |
| `art/news/cable-reel.png` | 256 × 256 | A big wooden cable drum from above: a round orange-red reel wound with thick black cable, a loose end snaking off. |
| `art/news/shelves.png` | 600 × 140 | A long props-store shelving unit from above: grey steel shelves crammed with props (a spare "LIVE" sign facing up blank, rolls of tape, a fake plant, boxes, a traffic cone, a spare news-desk mug). |

## D. Floors and wall (seamless tiles)

These **repeat**: the left edge must continue into the right, and the top
into the bottom, with no visible seam and no single standout detail that
would repeat obviously. Opaque, no transparency.

| File | Size | Prompt (after the preamble, but: opaque, seamless tile) |
|---|---|---|
| `art/news/floor-concrete.png` | 512 × 512 | Props-store floor from above: grey painted concrete, faint scuffs, a few yellow hazard-tape fragments, an oil spot. |
| `art/news/floor-carpet.png` | 512 × 512 | Newsroom floor from above: dark blue carpet tiles in a subtle grid, a little worn. |
| `art/news/floor-lounge.png` | 512 × 512 | Green-room floor from above: plum-coloured carpet with a faint pattern. |
| `art/news/floor-studio.png` | 512 × 512 | Studio floor from above: glossy dark navy, soft reflections, a few taped camera marks (small coloured crosses). |
| `art/news/wall.png` | 256 × 256 | The top of the building's walls from above: dark navy painted plaster with a faint brushed texture and a few tiny chrome rivets, the same in every direction (no stripes, no edges: the game adds the red stripe and the walls run both ways). |

## Sending

23 PNGs: send as **two zips** under 30 MB each (`Chair-1.zip`: A and B,
`Chair-2.zip`: C and D). File names inside don't have to match; Claude maps
each picture by eye.

## Importing

Claude converts each to WebP as
`apps/client/src/news/minigames/chair/art/<name>.webp` (furniture and Brock
at the sizes above, the chair at 256 px, floors at 512, the wall tile shrunk to 40 px, the walls' thickness). The
game draws each one in place of its shape as soon as it exists, no code
changes; then Claude plays a round and checks each object's footprint
against its picture.
