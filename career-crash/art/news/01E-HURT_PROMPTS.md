# Broken News 01 E: seated "hurt" pose and the rogue chair (same session as the desk art)

> Ready-to-paste prompts. Use them **in the same image-agent session that drew
> the desk expressions**, so it can refer back to its own pictures. Paste the
> setup once, then one prompt per image.

Some brawls won't start with an argument: something flies in from off screen
(a rogue office chair, a boom mic, a stray weather clicker) and hits an
anchor, and *that* starts the fight. So each person at the desk needs a
seventh expression, **`hurt`**: just been hit, still in their seat. A script
line with `"mood": "hurt"` shows it (until the art exists the game uses
`surprised`). The flying object is an animated sprite the game throws across
the shot.

## Setup (paste once, first)

> We're adding one more expression to the news-desk pictures you drew earlier
> in this session: Brock Stetson Jr., Philippa Featherstonehaugh and Dusty
> Gale. This one is "hurt": the moment something (an office chair) has just
> flown in from the side and hit them. Same 1254 × 1254 transparent canvas,
> same scale and same head height as their other desk pictures, waist up,
> still in their seat, turned the same way as their other pictures. Comic
> slapstick, not violent: no blood, no wounds, no bruises. Cartoon pain cues
> are welcome: squeezed-shut eyes, a few dizzy stars or birds circling the
> head, a big bump rising on the head, sweat drops, impact lines. Reply
> "ready" and wait for the first one.

## The three hurt pictures

**1. `desk-brock-hurt.png`**
> Brock **hurt**, seated: knocked sideways in his chair, leaning away to his
> left, one hand clutching the side of his head where a cartoon bump is
> rising, eyes squeezed shut, teeth gritted, three small yellow stars
> circling his head. His perfect hair is finally knocked out of place, one
> big lock sticking straight up. Tie flipped over his shoulder. Same suit,
> pin and pocket square as before.

**2. `desk-philippa-hurt.png`**
> Philippa **hurt**, seated: knocked sideways, leaning away to her right,
> glasses knocked crooked and hanging off one ear, eyes squeezed shut, mouth
> a pained tight line, one hand on her temple, the fountain pen still
> gripped in the other hand out of sheer principle, her neat bob ruffled on
> one side, two small cartoon birds circling her head. Same blazer and pearls.

**3. `desk-dusty-hurt.png`**
> Dusty **hurt**, standing at the end of the desk: staggering back, his
> windswept hair now blown completely flat to one side, eyes spinning
> (cartoon swirls), tongue slightly out, weather clicker flying out of his
> hand, a little rain cloud with a tiny lightning bolt hovering over his
> head. Same teal suit and sun-and-cloud tie.

## The rogue chair (one sprite sheet)

**4. `art/items/fx-rogue-chair.png`, 1536 × 384, 4 frames of 384 × 384, transparent**
> Pixel-art game sprite sheet for "Career Crash", a comedic 2D brawler,
> matching your desk pictures' style: chunky pixel art, thick dark outline
> (#1b1f2a), flat colours with one shade tone. One row of 4 equal frames,
> left to right: a black swivel office chair with five castor wheels and a
> high back, tumbling through the air as if thrown, spinning a quarter turn
> more in each frame (upright, tipped forward, upside down, tipped back), with
> a few white speed lines trailing behind it to the LEFT (it flies to the
> right). The chair is the same size and centred in every frame. Transparent
> background, no shadow, no text, no people.

Manifest line (Claude adds it): `"fx-rogue-chair": { "grid": [4, 1] }` in `art/items/manifest.json`.

## Importing

Upload the files (any names; say which is which if unsure). Claude saves the
three as `art/news/desk-<who>-hurt.png` and converts them, and imports the
chair through the items pipeline; then a script line can use
`"mood": "hurt"` and the chair can open a segment.
