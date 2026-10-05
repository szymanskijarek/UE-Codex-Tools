# Crypto Bros 2: heads (four per bro)

> **Status:** all sixteen bros delivered and in the game (5 October 2026), all four expressions.

> Part of the Crypto Bros art set (`art/cryptobro/README.md`).

The game swaps heads during a fight (a bro pumping looks smug, a bro
being liquidated looks horrified) and uses them as portraits in the ticker.

**Reference to attach:** the bro's own body sheet from `art/sheets/`
(`npc-bro-<id>.png`). Generate the body first.

## Format

- **One head per file, 256 × 256 px,** transparent background, head only,
  centred, filling about 85% of the canvas, the same 3/4 angle facing right
  as the head on the body sheet, with the same hat, hair, glasses and ears.
- **Files:** `art/heads/<expression>/npc-bro-<id>.png`.
- **Expressions:** `neutral`, `angry`, `surprised`, `hurt`.

## Prompt (one per head)

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet, same hat, hair, glasses and accessories. No text, no letters, no
> logos. Expression: [EXPRESSION]

Replace `[EXPRESSION]` with the bro's line from the table.

| Bro (`id`) | `neutral` (smug default) | `angry` (shouting) | `surprised` | `hurt` |
|---|---|---|---|---|
| The OG (`bro-btc`) | smirking, one eyebrow up, laser shades on, as if saying "have fun staying poor" | shouting, laser shades glowing brighter, teeth bared | shades slipped down his nose, eyes wide | eyes squeezed shut, shades askew, teeth gritted |
| Gas Fee Gavin (`bro-eth`) | polite apologetic smile, glasses straight | indignant, mouth open mid-complaint, glasses fogged | glasses jumping off his nose, mouth an O | wincing, glasses cracked on one lens |
| Litigation Larry (`bro-xrp`) | lawyerly half-smile, one finger raised (head only, so: chin up, eyebrows raised) | yelling "objection", vein on the forehead | jaw dropped, hair coming unstuck | grimacing, a curl of hair fallen over his eyes |
| Exchange Eddie (`bro-bnb`) | huge customer-service grin, headset mic by the cheek | grin turned into a snarl, headset mic bent | eyes popping, grin frozen | grimace, headset hanging off one ear |
| Speedrun Sol (`bro-sol`) | eager, panting slightly, sunglasses on the head | shouting with a sweaty red face | frozen mid-blink, eyes spiral-dazed (network outage) | eyes shut, cheeks puffed, sweatband slipped over one eye |
| Such Wow Wes (`bro-doge`) | wide goofy grin, ears headband upright | barking-shout, ears headband flat back like an angry dog | ears headband sticking straight up, eyes huge | eyes shut, tongue out, ears headband drooping |
| Peer-Review Pete (`bro-ada`) | thoughtful frown, one eyebrow raised, glasses on | lecturing, mouth wide, finger-wag energy in the eyebrows | glasses pushed up on the forehead, mouth open | pained, glasses dangling from one ear |
| Neon Trent (`bro-trx`) | camera-ready smirk, white sunglasses | shouting, sunglasses flashing | sunglasses blown off up onto his hair, eyes wide | wincing, hair spikes flattened |
| Avalanche Al (`bro-avax`) | big white grin, goggles on the beanie | yelling, goggles down over angry eyes | goggles snapped down, mouth open | eyes shut, cheeks red with cold, pompom squashed |
| Oracle Olly (`bro-link`) | half-closed knowing eyes, serene | eyes open wide and furious, hair loose from the bun | genuinely shocked (he didn't see it coming) | eyes squeezed shut, man-bun undone |
| Tony Tons (`bro-ton`) | content, hard hat straight | bellowing, hard hat tipped back | hard hat lifted off the head by surprise | wincing, hard hat dented |
| Shiba Sharon (`bro-shib`) | sweet, cooing at an unseen dog | shouting "heel!", hair frizzed | mouth open, a dog lead looped over one ear | eyes shut, hair full of dog hair |
| Silver Steve (`bro-ltc`) | trying to look like The OG, failing | angry but half-hearted, mouth a wobbly line | wide eyes, chain twisted | hurt, sad puppy eyes |
| Degen Dex (`bro-pepe`) | lazy grin, hood half up | screaming "PUMP IT", eyes wide | mouth open, hood fallen back | grimace, ring-light reflections in teary eyes |
| Para Pat (`bro-dot`) | cheery, polka-dot bow tie straight | shouting, bow tie spinning | eyes huge, bow tie popped up | wincing, bow tie drooping |
| Anon Bro (`bro-anon`) | balaclava on, only eyes showing, calm | eyes narrowed, balaclava mouth-hole shouting | eyes wide | eyes shut tight |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-bro-<id>` import as `npc.bro-<id>:<expression>`.
