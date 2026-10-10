# Broken News 13: *Wrestle the Bird* (the *Man vs Emu* minigame)

> **Status (10 October 2026):** delivered and in the game, except
> `wrestle-emu-kick.png`, which arrived truncated (only the top half): please
> re-send it. Until then the kick wind-up lunges in its place. Part of the Broken News art set (`art/news/README.md`); the emu's
> look comes from brief 12 (`12-EMU_AND_ALPACA.md`), so send that one first.

**The game:** first person, on the A381 verge. You are the passer-by,
squared up to Side Neck the emu. It plays like a rhythm game: the emu
**telegraphs** an attack (a wind-up pose), a button prompt drops in, and you
press it in time to grab, block or duck. Late or wrong and the attack lands:
the screen shakes and your **trouser integrity** meter at the bottom drops a
stage. The further into the fight, the faster the wind-ups and the narrower
the window. Survive the round (or pin the bird) and Side Neck sulks off home;
lose your trousers and he struts off with them in his beak.

Backdrop: the existing sheep-field plate (`art/news/location-sheep-field.png`,
gate on the left, tractor on the right). The alpaca witness from brief 12
watches from the gate. **Nothing new is needed for the background.**

| # | What | Pictures |
|---|---|---|
| A | Side Neck, close up, facing you: idle, three wind-ups, three attacks, dazed, two endings | 12 |
| B | Your hands, first person, at the bottom of the screen | 5 |
| C | The trouser integrity meter: one pair of trousers in five stages | 5 |

**References to attach:** `art/news/location-sheep-field.png` (light and
palette: overcast, drizzle), brief 12's `cameo-emu.png` once drawn (so it's
the same bird), `art/news/field-rupert-neutral.png` (style and outline).

## Style preamble (paste first)

> Pixel-art game sprite for "Career Crash", a comedic 2D game, in the style of
> the attached pictures: chunky clean pixel art, thick dark outline (#1b1f2a),
> flat colours with one shade tone, soft overcast light from the top left (a
> grey, drizzly day in a Devon field), friendly cartoon slapstick. Transparent
> background, nothing but the subject: no ground, no shadow, no grass, no
> text, no letters. Every frame of the same subject keeps the same size,
> scale and colours, so the game can flip between them.

## A. Side Neck, close up (twelve frames, 1024 × 1024)

The same emu as brief 12, now **right in your face**: seen from the front,
from about knee height up, filling most of the canvas, as if he's a metre
away and looking straight down the camera. Shaggy grey-brown feathers, long
grey legs, pale blue-grey neck **bent sharply sideways** (that's his name),
beady orange eyes, a beak that means business. He's a cartoon menace, never
scary: silly, theatrical, very pleased with himself. No blood, no wounds.

> [Preamble.] 1024 × 1024. A shaggy grey-brown emu called Side Neck, seen
> close up from the front at about knee height, facing the viewer, his pale
> blue-grey neck bent sideways at a jaunty angle, beady orange eyes, comic
> and theatrical, never scary. [POSE]

| File | Moment | [POSE] |
|---|---|---|
| `art/news/wrestle-emu-idle.png` | idle (loops with -b) | standing tall, neck cocked to the left, head tilted, sizing you up, one eye squinting |
| `art/news/wrestle-emu-idle-b.png` | idle, second frame | identical, but neck cocked to the right and head bobbed lower, beak slightly open |
| `art/news/wrestle-emu-tell-peck.png` | wind-up: the peck is coming | head pulled far back like a loaded spring, neck coiled in an S, eyes narrowed, a little glint on the beak |
| `art/news/wrestle-emu-peck.png` | attack: peck | head and beak lunging straight at the viewer, hugely foreshortened, beak wide open filling the middle of the frame, eyes wide, feathers streaming back, three speed lines |
| `art/news/wrestle-emu-tell-kick.png` | wind-up: the kick is coming | balanced on one leg, the other leg raised high and bent like a karate stance, wings out for balance, smug look |
| `art/news/wrestle-emu-kick.png` | attack: kick | the big three-toed foot thrust straight at the viewer, enormous in the foreground, the rest of the emu small behind it, mud flicking off the toes |
| `art/news/wrestle-emu-tell-slam.png` | wind-up: the body slam is coming | crouched low, stubby wings spread wide, feathers puffed up to twice his size, neck pulled in, ready to charge |
| `art/news/wrestle-emu-slam.png` | attack: body slam | a wall of puffed-up feathers and spread wings rushing at the viewer, filling the frame, one indignant eye visible through the fluff |
| `art/news/wrestle-emu-dazed.png` | you timed it right | staggering back, neck in a loose corkscrew, eyes spirals, three little stars and a loose feather circling his head |
| `art/news/wrestle-emu-dazed-b.png` | dazed, second frame | identical, stars moved round, neck swaying the other way |
| `art/news/wrestle-emu-win.png` | ending: you lose | strutting proudly sideways, chest out, holding a pair of grey suit trousers in his beak like a trophy flag, one wing raised in triumph |
| `art/news/wrestle-emu-sulk.png` | ending: you win | sitting down in a huff with his back half-turned, neck bent away, wings folded, one eye looking back over his shoulder, deeply offended |

## B. Your hands, first person (five frames, 1536 × 768)

You never see yourself, only your **two forearms and hands rising from the
bottom edge**, like a first-person game. Sleeves of an ordinary grey suit
jacket (the passer-by was on his way somewhere smart), white shirt cuffs, a
cheap wristwatch. Hands cartoony and expressive. Generic person, nobody real.

> [Preamble.] 1536 × 768, transparent. First-person view: two forearms and
> hands rising from the bottom edge of the frame, grey suit sleeves, white
> shirt cuffs, a cheap wristwatch on the left wrist, cartoony expressive
> hands, seen from the viewer's own eyes. [POSE]

| File | Moment | [POSE] |
|---|---|---|
| `art/news/wrestle-hands-ready.png` | waiting | both hands up and open at chest height, fingers spread, a wrestler's ready stance, a bit wobbly |
| `art/news/wrestle-hands-grab.png` | right on the beat (vs peck) | both hands shot forward and clamped together around nothing at the centre, a couple of grey feathers popping out between the fingers |
| `art/news/wrestle-hands-block.png` | right on the beat (vs kick) | forearms crossed in an X in front of the face, palms out, braced |
| `art/news/wrestle-hands-duck.png` | right on the beat (vs slam) | both hands flung up and to the sides, low in the frame, as if ducking, fingers splayed |
| `art/news/wrestle-hands-hit.png` | too late: the attack lands | hands flailing in opposite directions, one with a grey feather stuck to it, the watch flying off, little impact stars |

## C. Trouser integrity meter (five frames, 512 × 512)

The meter at the bottom of the screen: **one pair of grey suit trousers,
on their own, front view**, getting worse in stages. Pure slapstick: the
last stage shows the trousers gone and only a pair of red boxer shorts with
white hearts, no person in them. No skin, no body, nothing rude.

> [Preamble.] 512 × 512, transparent, centred, front view, no person
> wearing them: [STAGE]

| File | Stage | [STAGE] |
|---|---|---|
| `art/news/wrestle-trousers-1.png` | 100%, intact | a smart pair of grey suit trousers with a brown belt, crisp front creases, perfectly pressed |
| `art/news/wrestle-trousers-2.png` | 75% | the same trousers with a muddy knee and the button popped off, flying away to one side |
| `art/news/wrestle-trousers-3.png` | 50% | the belt snapped and dangling, one leg torn at the knee, a peck-shaped hole, a grey feather stuck in the waistband |
| `art/news/wrestle-trousers-4.png` | 25% | the trousers slipping down to half-mast, held up by one desperate belt loop, red boxer shorts with white hearts peeking out at the top |
| `art/news/wrestle-trousers-5.png` | 0%, lost | no trousers at all: just the red boxer shorts with white hearts, standing alone, a single grey feather on top, a tiny white flag of surrender stuck in the waistband |

## Re-send: the kick (one picture)

The first `wrestle-emu-kick.png` arrived cut off halfway down (the file itself
was truncated). Hand the agent this section on its own, with
`wrestle-emu-tell-kick.png` and `wrestle-emu-peck.png` attached as references.

> Pixel-art game sprite for "Career Crash", a comedic 2D game, matching the two
> attached emu pictures exactly: the same emu (Side Neck), the same art style,
> outline, colours, feather texture, eye and beak, the same scale and camera.
> 1024 × 1024 PNG, fully transparent background, nothing but the emu: no
> ground, no shadow, no grass, no text, no frame.
>
> The moment: the kick lands. The first attached picture is his wind-up
> (standing on one leg, the other raised in a karate stance); this is the
> next frame, a split second later. He is seen from the front, close up, and
> has thrust his raised foot **straight at the viewer**: the big grey
> three-toed foot fills the lower-middle of the picture, hugely
> foreshortened, toes spread, the sole facing the camera, a few clumps of mud
> flicking off the toes. Behind the foot, the rest of the emu is smaller and
> further away: shaggy grey-brown body leaning back, the standing leg
> braced, stubby wings flung out for balance, his pale blue-grey neck bent
> sharply sideways, beak open in a triumphant honk, eyes squeezed into a
> cheeky grin. Three short white speed lines around the foot. Comic and
> theatrical, never scary; no blood, no injury.
>
> Check before sending: the whole emu and the whole foot are inside the
> canvas, nothing cut off at any edge; the picture is complete to the bottom
> row; the background is transparent.

File: `art/news/wrestle-emu-kick.png`. Send it on its own (it's about 1 MB),
zipped or as a plain image.

## Sending

22 PNGs, about 2 MB each: send as **two zips** (`Wrestle-1.zip`: part A,
`Wrestle-2.zip`: parts B and C), under 30 MB each. File names inside don't
have to match; Claude maps each picture by eye.

## Importing

Claude converts them to WebP (emu frames 768 px, hands 1024 px wide, meter
256 px, quality 80) as `apps/client/src/news/minigames/wrestle/<name>.webp`,
so they load only with the minigame's own chunk (10 §5), then checks each
pose in the running game against the sheep-field plate.
