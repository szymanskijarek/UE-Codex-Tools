# Broken News 10: the later guests, ready-to-paste (Biff, Tamsin, Ainsley, Kevin)

> **Status (9 October 2026):** not delivered yet. Brief 04 introduced these
> four; this file turns them into prompts. Each one is complete when it
> arrives: desk close-ups, mouth twins, `hurt`, a body sheet and four fight
> heads, 16 pictures per guest.

> Part of the Broken News art set (`art/news/README.md`). Design:
> `docs/career-crash/10-broken-news.md` §3.2.
> **Sending them back:** zips under 30 MB each, about 12 pictures per zip
> (README, *Sending art back*). One guest per two zips works well: zip 1 the
> desk pictures, zip 2 the twins, body sheet and heads.

**Do one guest at a time, in four rounds.** Rounds 1 and 2 belong in the
session that drew the desk guests (attach `art/news/desk-dusty-neutral.png`
as the scale reference if it's a new session). Rounds 3 and 4 can be a
fresh session: attach the guest's `neutral` desk picture from round 1 so the
fighter matches.

Order: **Biff, Tamsin, Ainsley, Kevin** (sports and traffic are the most
useful in episodes; Kevin's joke is that he never speaks, so he comes last).

## The four guests

| Guest | Key | Look (paste after the setup) | Main colours |
|---|---|---|---|
| Coach Biff Malone, Sports | `biff` | *A former minor-league baseball coach in his fifties turned sports anchor: a red team windbreaker over a white polo shirt, a whistle on a lanyard, a red baseball cap, a stopwatch, a thick grey moustache, a clipboard. Shouts every sentence.* | red #b91c1c, white |
| Tamsin Quayle, Traffic | `tamsin` | *A British traffic reporter in her thirties, live from the helicopter: an orange flight jacket with patches, a headset with a boom mic, aviator sunglasses pushed up on windswept blonde hair that is always blowing, a clipboard of road maps. Shouts over rotor noise even in the studio.* | orange #ea580c, grey |
| Dr Ainsley Verity, An Expert | `ainsley` | *A TV pundit in their forties: a mustard tweed jacket with brown elbow patches, a dark turtleneck, round tortoiseshell glasses, short neat hair, a stack of their own hardback book under one arm (blank covers). Agrees with whoever spoke last.* | mustard #ca8a04, brown |
| Kevin, The Intern | `kevin` | *A studio intern in his twenties: a grey hoodie, a staff lanyard, a headset round his neck, scruffy hair, a cardboard tray of four coffees, a boom microphone pole. A nervous, hopeful smile. Has never been allowed to speak.* | grey #6b7280 |

## Round 1: desk close-ups (seven pictures)

### Setup (paste once per guest, first)

> We're adding a new guest to the news desk, drawn exactly like the other
> desk guests you made (attached: Dusty Gale the weatherman): same pixel-art
> style (chunky clean pixel art, thick dark outline #1b1f2a, flat colours
> with one shade tone, light from the top left), same 1254 × 1254
> transparent canvas, same scale and head height, waist up, standing at the
> right-hand end of the desk, turned slightly to the LEFT towards the
> anchors. No desk, no background, no text, no letters, no logos. The guest
> keeps the same position, size and clothes in all their pictures; only the
> face, hands and posture change. The guest: [LOOK FROM THE TABLE ABOVE].
> Reply "ready" and wait for the first one.

Then one prompt per picture: **"`desk-<key>-<expression>.png`: [cell]"**.
Comic slapstick, no blood or wounds in `hurt`.

| Guest | `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` | `hurt` (chair from the left) |
|---|---|---|---|---|---|---|---|
| Biff | arms folded, clipboard under one arm, mouth shut, glaring | blowing the whistle, cheeks puffed, pointing | tapping the stopwatch, closed-mouth grin under the moustache | cap flying off, mouth an O | red-faced, yelling, clipboard raised | charging forward like a linebacker, mouth open roaring | knocked back, cap over his eyes, whistle flying off its lanyard, stars circling |
| Tamsin | one hand pressed to the headset, listening, mouth shut | shouting into the boom mic, hair blowing sideways | sunglasses flicked down, closed-mouth smirk | sunglasses flying off, mouth an O | jabbing at a road map on the clipboard, mouth open | leaping in, clipboard raised like a shield, mouth open | headset knocked askew, hair blown flat, road maps fluttering, a tiny helicopter circling her head |
| Ainsley | nodding sagely, finger on chin, mouth shut | holding up their own book to the camera, mouth open | eyes closed, smiling serenely, mouth shut, one finger raised | glasses slipping, book stack wobbling, mouth an O | slamming the book down, mouth open | swinging the book stack, mouth open | glasses hanging off one ear, books tumbling, birds circling, a bump rising |
| Kevin | holding the coffee tray, nervous smile, mouth shut | leaning towards a microphone that isn't on, mouth open, finally about to speak | proud thumbs-up over the coffees, mouth shut | coffees sloshing, mouth an O | gripping the boom pole, mouth open | swinging the boom pole, mouth open | coffees flying in the air, hoodie half over his face, stars circling |

## Round 2: mouth twins (four pictures, same session)

> Make an EDITED COPY of your `[expression]` picture of [guest] where ONLY THE
> MOUTH changes: [open becomes shut / shut becomes open, as below]. Everything
> else stays pixel-identical: canvas, position, pose, hands, props, hair,
> eyes, clothes, outline and colours. The two pictures will swap several
> times a second while the guest talks, so anything else that moves will
> jitter.

| File | Edit |
|---|---|
| `desk-<key>-talk-b.png` | if the mouth is open: closed, lips together; if shut: open mid-word |
| `desk-<key>-smug-b.png` | open mid-word, still smug |
| `desk-<key>-angry-b.png` | if open: shut, teeth gritted; if shut: open, shouting |
| `desk-<key>-lunge-b.png` | if open: shut, teeth gritted; if shut: open, a yell |

(Biff's `talk` has the whistle in his mouth: for his twin, the whistle drops
from his lips and dangles on the lanyard, mouth open shouting.)

## Round 3: body sheet (one picture)

**Reference to attach:** `art/heads/_reference/body-sheet-example.webp` and
the guest's `desk-<key>-neutral.png`.

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background, 1254 × 1254. LEFT:
> the full character standing in 3/4 view facing right, hands empty. RIGHT:
> the same character cut into 13 separate paper-doll pieces laid out like the
> example (head, torso, pelvis, two upper arms, two forearms with hands, two
> thighs, two shins, two shoes), each piece outlined, with rounded joint ends
> and a clear gap around it. No text, no letters, no numbers, no logos, no
> shadow, no extra pieces. The character is the one in the attached desk
> picture, full body: [LOOK FROM THE TABLE]. Anything they hold goes ON the
> body (clipped to the belt, slung on the back, in a pocket), never in the
> hands.

Save as `art/sheets/npc-news-<key>.png`. Where the props go:

| Guest | Props on the body |
|---|---|
| Biff | whistle on its lanyard round the neck, clipboard clipped to the belt, cap on the head piece |
| Tamsin | headset on the head piece, clipboard slung across the back on a strap |
| Ainsley | one book in the jacket pocket, the rest left out |
| Kevin | boom pole strapped across his back, lanyard round the neck, no coffees |

## Round 4: four fight heads

**Reference to attach:** the guest's body sheet from round 3.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256, head only, centred, filling about
> 85% of the canvas, the same 3/4 angle facing right as the head on the
> attached sheet, same hair, hat and glasses. No text, no letters, no logos.
> Expression: [EXPRESSION]

Save as `art/heads/<expression>/npc-news-<key>.png`.

| Guest | `neutral` | `angry` | `surprised` | `hurt` |
|---|---|---|---|---|
| Biff | stern glare under the cap, moustache bristling | roaring, whistle flying out of his mouth | cap popping up off his head, mouth an O | eyes squeezed shut, cap crooked |
| Tamsin | headset on, sunglasses up, determined | shouting into the boom mic | sunglasses slipping down, mouth an O | wincing, hair blown flat, headset askew |
| Ainsley | serene, slightly smug, over the glasses | frowning, glasses flashing | glasses slipping, mouth an O | eyes squeezed shut, glasses crooked |
| Kevin | nervous hopeful smile | panicked yelling | eyes huge, mouth an O | wincing, hair everywhere |

## Importing

Upload the files (any names; say which is which if unsure). Claude:

```
pnpm --filter @cc/art-pipeline puppets npc-news-<key>
pnpm --filter @cc/art-pipeline faces
```

then checks the puppet previews (`tools/art-pipeline/out/puppets/`), fixes
merged parts in `art/sheets/manifest.json`, converts the desk pictures to
WebP in `apps/client/src/news/art/`, adds the persona `npc.news-<key>` and
writes the guest into an episode.
