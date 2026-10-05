# Crypto Bros 1: body sheets, the first ten bros

> **Status:** delivered and in the game (5 October 2026): all ten sheets.

> Part of the Crypto Bros art set (`art/cryptobro/README.md`). Design:
> `docs/career-crash/08-cryptobro.md` §8.

Ten crypto bros, one per coin, who fight nonstop on a trading floor. They
are not careers: each is a caricature of the culture around a coin, never
of a real person. Make them vain, loud and a bit ridiculous, the kind of
person who says "few understand" unironically.

**Reference to attach to every prompt:** `art/heads/_reference/body-sheet-example.webp`.

## Layout (copy `body-sheet-example.webp` exactly)

- **Canvas:** 1254 × 1254 px (or 1536 × 1024 landscape), transparent background.
- **Left half:** the full character standing, 3/4 view facing right, arms
  relaxed slightly away from the body, feet apart, **hands empty**.
- **Right half:** the same character cut into **13 separate pieces**, each with
  a clear transparent gap around it: head (with any hat, hair or glasses),
  torso, pelvis, left and right upper arm, left and right forearm with hand,
  left and right thigh, left and right shin, left and right shoe.
- Each piece is complete, outlined, with rounded joint ends.
- **Leave out:** held items (anything they'd carry goes on the body: on a
  belt, a lanyard, in a pocket or a bum bag), text, numbers, logos, coin
  symbols, floor shadows, background.

## Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example
> (head, torso, pelvis, two upper arms, two forearms with hands, two thighs,
> two shins, two shoes), each piece outlined, with rounded joint ends and a
> clear gap around it. No text, no letters, no numbers, no logos, no symbols
> on clothing, no shadow, no extra pieces.

## The bros

Main colour in brackets: use it for the main garment, so each bro reads at a
glance in a ten-way brawl. File: `art/sheets/npc-bro-<id>.png`.

**1. BTC: The OG** (`bro-btc`, bitcoin orange #f7931a)
> A smug early-adopter crypto bro in his forties who never stops reminding you
> he was here first: red laser-beam "laser eyes" novelty sunglasses (red lenses
> with a glow), a chunky gold chain, a faded orange vintage T-shirt with a
> cracked print (no letters), a black puffer gilet, cargo shorts, chunky
> white trainers, receding hair slicked back, a short grey goatee. Arms
> crossed confidence, big and solid.

**2. ETH: Gas Fee Gavin** (`bro-eth`, slate-violet #627eea)
> A fussy crypto bro who charges for everything: a pastel violet blazer with
> sleeves pushed up over a white T-shirt, a lanyard with a pocket calculator,
> a leather bum bag worn across the chest stuffed with receipts, slim chinos,
> loafers without socks, round tortoiseshell glasses, neat side-parted hair.
> Slim build, a faintly apologetic smile.

**3. XRP: Litigation Larry** (`bro-xrp`, charcoal #23292f with teal tie #00aae4)
> A crypto bro who is always in court: a charcoal three-piece suit slightly
> too shiny, a teal tie, a briefcase-shaped bum bag overflowing with paper
> (clipped to the belt), an earpiece, shiny black shoes, greased-back dark
> hair, a five-o'clock shadow. Leaning forward as if about to object.

**4. BNB: Exchange Eddie** (`bro-bnb`, exchange yellow #f3ba2f)
> A crypto-exchange floor guy: a yellow polo shirt with the collar popped, a
> black headset round his neck, a lanyard with a keycard, black trousers,
> yellow-and-black trainers, a big sports watch, a shaved head, a relentless
> customer-service grin. Medium build.

**5. SOL: Speedrun Sol** (`bro-sol`, violet #9945ff with mint trim #14f195)
> A hyperactive speed-obsessed bro: a violet running vest with mint-green
> trim, energy gels tucked into a race belt, split running shorts,
> mint-green compression socks, neon racing trainers, a sweatband, wraparound
> sports sunglasses pushed up on his head, wiry and lean, mid-stride energy
> even standing still.

**6. DOGE: Such Wow Wes** (`bro-doge`, doge gold #c2a633)
> A cheerful meme-coin bro: a headband with pointy shiba-dog ears, a gold
> hoodie with a cartoon dog-paw print on the chest, a pocket full of dog
> treats, baggy joggers, gold sliders with white socks, a wide goofy grin,
> messy blond hair under the ears. Soft and round.

**7. ADA: Peer-Review Pete** (`bro-ada`, deep blue #0033ad)
> An academic crypto bro who has been "almost ready" for years: a tweed
> jacket with elbow patches over a blue knitted jumper, a stack of papers
> tucked under the belt, three pens in the breast pocket, corduroy trousers,
> brown brogues, wire-rimmed glasses, a neat beard, a thoughtful frown.
> Tall and slightly stooped.

**8. TRX: Neon Trent** (`bro-trx`, red #eb0029)
> A flashy showman bro: a glossy black suit lined with glowing red light
> strips down the arms and legs (like a light-up stage costume), a red
> pocket square, slicked spiky black hair, white-framed sunglasses, shiny
> pointed shoes with red light-up soles. Posing as if for a photo.

**9. AVAX: Avalanche Al** (`bro-avax`, avalanche red #e84142 with snow white)
> A ski-bro: a red-and-white ski jacket half unzipped, ski goggles pushed up
> on a beanie with a pompom, a lift pass on a zip-cord clipped to the jacket
> (blank), white ski trousers, chunky après-ski moon boots, a tan with a
> goggle line, a big white grin.

**10. LINK: Oracle Olly** (`bro-link`, oracle blue #2a5ada)
> A mystic crypto bro who says he saw it coming: a long blue cardigan over a
> white T-shirt, a crystal pendant on a cord, a small crystal ball in a mesh
> bag clipped to the belt, linen trousers, sandals, rings on every finger,
> long wavy hair in a man-bun, half-closed knowing eyes.

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-bro-btc npc-bro-eth npc-bro-xrp npc-bro-bnb npc-bro-sol npc-bro-doge npc-bro-ada npc-bro-trx npc-bro-avax npc-bro-link
```

Files named `npc-<persona>` import as the persona `npc.<persona>`, which the
game looks for before falling back to borrowed career art. Check the labelled
previews in `tools/art-pipeline/out/puppets/`.

**Next:** the heads for each bro (`02-BROS_HEADS.md`). Generate a bro's body
first and attach it to their head prompts.
