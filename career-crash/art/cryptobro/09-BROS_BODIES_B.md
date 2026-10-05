# Crypto Bros 9: body sheets, the bench

> **Status:** all six delivered and in the game (5 October 2026) (PEPE's crocs split from his shins in the sheet manifest).

> Part of the Crypto Bros art set (`art/cryptobro/README.md`). Same format as
> `01-BROS_BODIES_A.md`.

The top 10 coins change over time. These bros wait on the bench until their
coin climbs into the top 10. **Anon Bro** stands in for any coin that has no
bro of its own yet, so he matters most here.

**Reference to attach to every prompt:** `art/heads/_reference/body-sheet-example.webp`.

## Layout (copy `body-sheet-example.webp` exactly)

- **Canvas:** 1254 × 1254 px (or 1536 × 1024 landscape), transparent background.
- **Left half:** the full character standing, 3/4 view facing right, hands empty.
- **Right half:** the same character cut into 13 pieces with gaps (head,
  torso, pelvis, two upper arms, two forearms with hands, two thighs, two
  shins, two shoes), outlined, rounded joint ends.
- **Leave out:** held items, text, numbers, logos, coin symbols, shadows, background.

## Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example,
> each outlined, with rounded joint ends and a clear gap around it. No text,
> no letters, no numbers, no logos, no symbols on clothing, no shadow.

## The bros

File: `art/sheets/npc-bro-<id>.png`.

**1. Anon Bro** (`bro-anon`, hoodie black #111827 with grey) — *do this one first*
> An anonymous crypto bro nobody has ever seen the face of: a black hoodie
> with the hood up, a black knitted balaclava showing only his eyes, a
> plain grey baseball cap over the hood (the game prints a ticker on it),
> black joggers, grey trainers, fingerless gloves. Mysterious but slightly
> sad, like he's been up all night.

**2. TON: Tony Tons** (`bro-ton`, cyan #0098ea)
> A big, cheerful builder-bro: a cyan hi-vis hoodie, a white hard hat, a
> canvas tote bag of bricks worn across the body, a phone in an arm holster,
> work trousers with knee pads, steel-toe boots, a bushy beard. Built like a
> fridge.

**3. SHIB: Shiba Sharon** (`bro-shib`, red-orange #e44d26)
> A professional dog-walker bro (a woman in her thirties): a red-orange
> fleece gilet over a striped top, six dog leads looped round her waist and
> shoulder, poo-bag dispensers clipped to the belt, leggings, muddy walking
> boots, a high ponytail, a whistle. Beaming.

**4. LTC: Silver Steve** (`bro-ltc`, silver #a6a9aa)
> A bro who dresses exactly like The OG, but cheaper: silver laser-eye
> novelty sunglasses (one lens cracked), a thin silver chain, a grey
> T-shirt that's a slightly-too-big hand-me-down, a grey gilet, cargo
> shorts, off-brand trainers. Trying hard to look confident.

**5. PEPE: Degen Dex** (`bro-pepe`, frog green #3d9b3f)
> A chaotic meme-coin degen streamer: a green hoodie with the hood half up,
> gaming headphones round the neck, a phone on a selfie lanyard, frog-green
> joggers, lime crocs with charms, messy hair, dark circles under wide
> excited eyes. (No frog face, no meme characters.)

**6. DOT: Para Pat** (`bro-dot`, magenta-pink #e6007a)
> A relentlessly upbeat networking bro: a magenta suit covered in white
> polka dots, a matching polka-dot bow tie, a lanyard with dozens of
> conference badges (blank), white trainers, a neat quiff, an enormous
> smile.

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-bro-anon npc-bro-ton npc-bro-shib npc-bro-ltc npc-bro-pepe npc-bro-dot
```

Heads for these are in `02-BROS_HEADS.md`.
