# Broken News 06: the field reporters (ready-to-paste prompts)

> **Status (9 October 2026):** delivered and in the game: all 14 close-ups,
> the 6 mouth twins, both body sheets (sliced as `npc.news-chase` and
> `npc.news-rupert`, no manifest cuts needed) and the 8 fight heads.

> Part of the Broken News art set (`art/news/README.md`).

Two reporters who appear "live on location": full screen in front of a
location painting, or in the right-hand box of a split screen next to an
anchor. **Use the same image-agent session that drew the desk anchors** if you
can (it remembers their style and scale); otherwise attach
`art/news/desk-brock-neutral.png` as the reference for every prompt.

30 images in four rounds. Do them in order: round 1 is what the game shows most.

| Round | What | Images | Files |
|---|---|---|---|
| 1 | Close-ups, seven expressions each | 14 | `art/news/field-<reporter>-<expression>.png` |
| 2 | Mouth twins for lip flap | 6 | `art/news/field-<reporter>-<expression>-b.png` |
| 3 | Body sheets (for brawls on location) | 2 | `art/sheets/npc-news-<reporter>.png` |
| 4 | Fight heads, four each | 8 | `art/heads/<expression>/npc-news-<reporter>.png` |

`<reporter>` is `chase` or `rupert`.

## Setup (paste once, first)

> We're adding two field reporters to the Broken News cast, drawn exactly like
> the news anchors you made earlier (Brock and Philippa): same chunky pixel-art
> style, thick dark outline (#1b1f2a), flat colours with one shade tone, light
> from the top left, friendly cartoon proportions, and the SAME scale and head
> height as the anchors (head about 300 px tall, top of head about 4% down from
> the top edge). Each picture: 1254 × 1254, transparent background, waist up,
> standing, slight 3/4 turn to the LEFT, holding a handheld TV microphone at chin
> height in the right hand. The mic has a small square mic flag that is BLANK
> (no letters: the game prints on it). No background, no text, no logos. Keep
> each reporter identical across all their pictures: same position, size,
> clothes and hair; only the face, the free hand and the posture change.
> Reply "ready" and wait for the first one.

### The two reporters (the prompts below refer to these)

**Chase Hurley** (American field reporter, he/him, 30s): *a storm chaser who
treats every story as a hurricane: a bright orange waterproof storm jacket with
the hood up and the drawstrings flying, wind-tousled dark hair escaping the
hood, a determined square jaw, a light stubble, squinting into wind that
isn't there; a red handheld microphone.*

**Rupert Fennimore-Twistleton** (British foreign correspondent, he/him, 50s):
*war-correspondent gravitas for trivial stories: a khaki safari jacket with
far too many pockets over a pale blue shirt, a blank press pass on a lanyard, a
neat grey moustache, a sunburnt nose, reading glasses pushed up on his
forehead, a battered silver handheld microphone.*

## Round 1: close-ups (14)

**Chase** (`field-chase-<expression>.png`):

1. `neutral`: *Chase listening to the studio: hand pressed to his earpiece, squinting, leaning slightly into the wind, mouth closed.*
2. `talk`: *Chase reporting: mouth wide open, shouting over imaginary wind, free hand pointing back over his shoulder at the scene.*
3. `smug`: *Chase with the scoop: big grin, thumbs up with the free hand, hood blown back off his head.*
4. `surprised`: *Chase startled by something behind him: jaw dropped, looking back over his shoulder, eyebrows up.*
5. `angry`: *Chase being talked over: red-faced, shouting into the mic held right up to his mouth, veins standing out.*
6. `frozen`: *Chase on a satellite delay: a fixed, slightly too wide grin, eyes unblinking and a bit glassy, perfectly still, as if the picture froze mid-smile.*
7. `hurt`: *Chase hit by something off screen: knocked sideways, the hood pulled down over his eyes, the mic still held up heroically, a few dizzy stars.*

**Rupert** (`field-rupert-<expression>.png`):

8. `neutral`: *Rupert listening: a grave, patient expression, one finger on his earpiece, mouth closed under the moustache.*
9. `talk`: *Rupert reporting: mouth open mid-word, solemn as a war report, free hand gesturing gravely at the scene behind him.*
10. `smug`: *Rupert with a knowing half-smile, eyebrows raised, glasses pushed up, as if he has seen it all before.*
11. `surprised`: *Rupert startled: reading glasses dropping down onto his nose, moustache bristling, eyes wide.*
12. `angry`: *Rupert in clipped fury: lips pressed thin, gripping the mic like a baton, nostrils flared.*
13. `frozen`: *Rupert on a satellite delay: a fixed polite smile, one eyebrow stuck halfway up, perfectly still.*
14. `hurt`: *Rupert hit by something off screen: glasses askew, moustache crooked, safari hat (if any) gone, a couple of dizzy birds circling.*

## Round 2: mouth twins (6)

> Take your picture of [REPORTER] [EXPRESSION]. Make an EDITED COPY where ONLY
> THE MOUTH changes to: [MOUTH]. Everything else must stay pixel-identical:
> same canvas, position, pose, hands, mic, hair, eyes and clothes.

| File | Expression | [MOUTH] |
|---|---|---|
| `field-chase-talk-b.png` | talk | closed, mid-shout pause, lips pressed |
| `field-chase-smug-b.png` | smug | open, mid-word, still grinning |
| `field-chase-angry-b.png` | angry | shut, teeth gritted |
| `field-rupert-talk-b.png` | talk | closed, lips pressed under the moustache |
| `field-rupert-smug-b.png` | smug | slightly open, a dry remark |
| `field-rupert-angry-b.png` | angry | open, a clipped furious word |

If more than the mouth moves, send it anyway: Claude pastes just the mouth.

## Round 3: body sheets (2)

Attach `art/heads/_reference/body-sheet-example.webp` and copy its layout exactly.

> Pixel-art character sheet for "Career Crash", matching the attached example
> sheet exactly in style and layout: chunky clean pixel art, thick dark outline
> (#1b1f2a), flat colours with one shade tone, light from the top left, big
> head (head to body about 1 : 1.4), friendly cartoon proportions.
> Transparent background, 1254 × 1254. LEFT: the full character standing in
> 3/4 view facing right, hands empty. RIGHT: the same character cut into 13
> separate paper-doll pieces laid out like the example (head, torso, pelvis,
> two upper arms, two forearms with hands, two thighs, two shins, two shoes),
> each outlined, with rounded joint ends and a clear gap around every piece.
> No text, no logos, no shadow. The character: [REPORTER, full body: Chase in
> orange storm jacket, waterproof trousers and wellington boots, the mic clipped
> to his belt / Rupert in safari jacket, khaki trousers and desert boots, the mic
> in a breast pocket].

Files: `art/sheets/npc-news-chase.png`, `art/sheets/npc-news-rupert.png`.

## Round 4: fight heads (8)

Attach the reporter's own body sheet from round 3.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, transparent background,
> 256 × 256, head only, centred, 3/4 view facing right, the character from the
> attached sheet with the same hair and headwear. Expression: [EXPRESSION].

| | `neutral` | `angry` | `surprised` | `hurt` |
|---|---|---|---|---|
| Chase | squinting into the wind, determined | shouting, hood flying | jaw dropped, hood blown back | eyes squeezed shut, hood over one eye |
| Rupert | grave, moustache neat | clipped shout, moustache bristling | glasses dropping, eyes wide | wincing, glasses askew |

Files: `art/heads/<expression>/npc-news-chase.png`, `…/npc-news-rupert.png`.

## Importing

Upload in any order and with any names (say which is which if unsure).
Claude converts the close-ups to 512 px WebP in `apps/client/src/news/art/`
(the field shot then shows them instead of the stand-ins), slices the body
sheets (`pnpm --filter @cc/art-pipeline puppets npc-news-chase npc-news-rupert`),
imports the heads (`… faces`), and checks the previews.
