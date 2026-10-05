# Crypto Bros 4: the referee, Pegged Peggy

> **Status:** delivered and in the game (5 October 2026): body sheet and all five heads.

> Part of the Crypto Bros art set (`art/cryptobro/README.md`).

Stablecoins never go up or down, so they don't fight: the biggest one
referees the floor. **Pegged Peggy** is utterly unmoved by anything, the
calm, slightly bored adult in a room full of shouting bros. She can be
knocked out like the main game's referee ("Tether has lost the peg… and
consciousness").

**References to attach:** `art/heads/_reference/body-sheet-example.webp`
and `art/sheets/referee.png` (the main game's referee, for the role).

## A. Body sheet

- **File:** `art/sheets/npc-pegged-peggy.png`, 1254 × 1254 (or 1536 × 1024),
  transparent. Layout exactly as the example: the full figure on the left,
  13 pieces on the right (head, torso, pelvis, two upper arms, two forearms
  with hands, two thighs, two shins, two shoes), hands empty.

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example,
> each outlined, rounded joint ends, a clear gap around each. No text, no
> letters, no numbers, no logos, no shadow.
> The character: a composed woman in her fifties who referees a crypto brawl
> and has seen it all: a referee's black-and-white striped shirt under a
> sensible mint-green cardigan (#26a17b), a whistle on a cord, a red card and
> a yellow card peeking from the breast pocket, neat grey trousers, comfy
> white trainers, a silver bob, reading glasses on a chain, perfectly level
> posture. Totally unbothered.

## B. Heads (5)

- **Format:** 256 × 256, transparent, head only, centred, ~85% of the canvas,
  3/4 facing right, same glasses and hair as the sheet. Attach sheet A.
- **Files:** `art/heads/<frame>/npc-pegged-peggy.png` for `neutral`, `angry`,
  `surprised`, `hurt`, `hurt2`.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet. Expression: [neutral: flat, unimpressed, one eyebrow slightly
> raised, glasses on | angry: blowing her whistle hard, cheeks puffed, eyes
> narrowed | surprised: glasses slipped to the tip of her nose, eyebrows up,
> still mostly calm | hurt: eyes squeezed shut, glasses askew | hurt2:
> knocked out, swirly eyes, little stars, glasses hanging off one ear].

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-pegged-peggy
pnpm --filter @cc/art-pipeline faces
```
