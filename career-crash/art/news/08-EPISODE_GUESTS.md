# Broken News 08: desk close-ups for the episode guests

> **Status (9 October 2026):** not delivered yet. The guests in the six new
> episodes sit at the desk as a painted head on a plain CSS suit: their
> career's face (Gideon, Marcel, Terry) or their own painted head from Crypto
> Bros or Diplomatic Incident (Wes, Sir Nigel). These close-ups put them in the
> same painted shot as the anchors and Dusty. They fight with their existing
> bodies, so no body sheets are needed.

> Part of the Broken News art set (`art/news/README.md`). Same rules as Dusty's
> close-ups (brief 04): **use the session that drew the desk art** if you can,
> or attach `art/news/desk-dusty-neutral.png` as the scale reference.

## Setup (paste once, first)

> We're adding five more guests to the news desk, drawn exactly like Dusty Gale
> the weatherman you made earlier: same pixel-art style, same 1254 × 1254
> transparent canvas, same scale and head height, waist up, standing at the
> right-hand end of the desk, turned slightly to the LEFT towards the anchors.
> No desk, no background, no text, no logos. Each guest keeps the same
> position, size and clothes in all their pictures; only the face, hands and
> posture change. Reply "ready" and wait for the first one.

For each guest, make **six pictures**: `neutral`, `talk`, `smug`, `surprised`,
`angry`, `lunge` (as described in their table), named
`art/news/desk-<guest>-<expression>.png`. Reference images to attach for the
ones who already exist elsewhere in the game are listed with them.

## 1. Gideon Rebuttal (`gideon`), legal correspondent (Clinics Strike)

*A lawyer in his 40s billed in six-minute units: a navy three-piece suit, a
gold watch chain, slicked silver hair, half-moon glasses, a fat leather
briefcase under one arm, a stopwatch in the other hand.*
Reference: `art/heads/_reference/lawyer.webp`.

| `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` |
|---|---|---|---|---|---|
| checking the stopwatch | raising one finger, "point of order" | presenting an invoice, very pleased | glasses down his nose | slamming the briefcase shut | swinging the briefcase |

## 2. Marcel (`marcel`), mime correspondent (Silly Careers)

*A classic mime in his 30s: white face paint, black-and-white striped top,
black braces and trousers, a black beret, white gloves. He never speaks: every
picture is a mime pose, mouth closed.*
Reference: `art/heads/_reference/mime.webp`.

| `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` |
|---|---|---|---|---|---|
| hands flat on an invisible box wall | pulling an invisible rope | leaning on an invisible desk, pleased | hands to cheeks, silent "oh" | shaking an invisible fist | throwing an invisible punch |

## 3. Terry from Transport (`terry`), transport desk (Luxury)

*A bus driver in his 50s, always late on purpose: a short-sleeved blue uniform
shirt with epaulettes, a peaked driver's cap, a ticket machine on a strap
across his chest, a moustache, a flask of tea.*
Reference: `art/heads/_reference/bus-driver.webp`.

| `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` |
|---|---|---|---|---|---|
| sipping tea from the flask lid | pointing at his watch | tapping the ticket machine, smug | spitting out his tea | red-faced, cap askew | charging, cap flying off |

## 4. Sir Nigel Queueworth (`nigel`), Delegate for England (Nobody Expects)

*Already in the game as a delegate: draw him exactly as his Diplomatic
Incident body and heads: black bowler hat, charcoal pinstripe three-piece
suit, red tie, a red rose, a tightly furled umbrella, a delegate lanyard, a
neat grey moustache.* Reference: `art/sheets/npc-del-eng.png` and
`art/heads/neutral/npc-del-eng.png`.

| `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` |
|---|---|---|---|---|---|
| polite tight smile, waiting his turn | arms flung wide, "NOBODY expects…" | raising a teacup | bowler knocked askew | brandishing the umbrella | charging with the umbrella like a lance |

## 5. Such Wow Wes (`wes`), crypto correspondent (Ex-Coin)

*Already in the game as the DOGE crypto bro: draw him exactly as his Crypto
Bros body and heads.* Reference: `art/sheets/npc-bro-doge.png` and
`art/heads/neutral/npc-bro-doge.png`.

| `neutral` | `talk` | `smug` | `surprised` | `angry` | `lunge` |
|---|---|---|---|---|---|
| holding a coin up to the light | pointing at the moon (up) | "diamond hands" pose, grinning | phone screen showing a red line, aghast | yelling at his phone | leaping, coin raised |

## Importing

Claude converts them to 512 px WebP in `apps/client/src/news/art/` and gives
each episode's guest its `art` name (`"art": "gideon"` …); the desk shot then
shows them instead of the stand-in. Mouth twins for lip flap can follow later
(brief 01D's method).
