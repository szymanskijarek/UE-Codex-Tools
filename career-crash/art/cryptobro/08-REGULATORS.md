# Crypto Bros 8: The Regulators (gatecrashers)

> **Status:** all three bodies and all twelve heads delivered and in the game (5 October 2026); in the game as the gatecrasher set `crasher.regulators` (phase 3). The auditors are `npc-reg-auditor` (A, B): the main game already has an `npc-auditor` (the Stocktake leader).

> Part of the Crypto Bros art set (`art/cryptobro/README.md`). Same format as
> the main game's gatecrashers (`art/GATECRASHER_PROMPTS.md`).

About one hour in six, the floor gets a visit from **The Regulators**: a
compliance officer and two auditors who burst in and fight every bro at
once. Leader's line: "Nobody move. Where are the reserves?"

They're a gatecrasher set: a **leader** and one kind of **henchman** in two
looks, **A** and **B** (same job, same uniform, different people).

**References to attach:** `art/heads/_reference/body-sheet-example.webp` to
every body sheet; for henchman B also attach the finished A sheet.

## Body sheets

Layout exactly as the example: the full figure on the left (3/4 facing
right, hands empty), 13 pieces on the right (head, torso, pelvis, two upper
arms, two forearms with hands, two thighs, two shins, two shoes), each with
a gap around it, transparent background, 1254 × 1254 (or 1536 × 1024).

### Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example,
> each outlined, rounded joint ends, a clear gap around each. No text, no
> letters, no numbers, no logos, no badges with writing, no shadow.

**1. Compliance Officer: Prudence Ledger** (`compliance-officer`, navy #1e3a8a) → `art/sheets/npc-compliance-officer.png`
> A fearsome compliance officer in her fifties: a navy trouser suit, a
> white blouse buttoned to the top, a lanyard with a blank ID card, a
> magnifying glass hanging from a cord, a thick ring binder strapped to her
> back like a shield, sensible black shoes, a severe grey bob, half-moon
> glasses, lips pressed thin.

**2. Auditor** (`reg-auditor`, navy #2563eb)
> A: Nigel, a thin, sweaty auditor in a blue short-sleeved shirt and a navy
> tie, a pocket protector full of pens, a calculator holstered on the belt,
> beige trousers, brown shoes, a comb-over. → `art/sheets/npc-reg-auditor.png`
> B: Priya, a sharp young auditor in a navy waistcoat over a white shirt,
> sleeves rolled up, a tablet in a holster on the hip, a pencil behind the
> ear, slim trousers, trainers, hair in a tight ponytail. → `art/sheets/npc-reg-auditor-b.png`

## Heads

- 256 × 256, transparent, head only, centred, ~85% of the canvas, 3/4 facing
  right. Attach the character's body sheet.
- Files: `art/heads/<expression>/npc-compliance-officer.png`,
  `npc-reg-auditor.png`, `npc-reg-auditor-b.png`, for `neutral`, `angry`,
  `surprised`, `hurt` (12 heads).

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet. Expression: [neutral: stern, unimpressed, peering over glasses |
> angry: shouting "where are the reserves", eyebrows in a V | surprised: eyes
> wide, mouth open | hurt: eyes squeezed shut, teeth gritted].

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-compliance-officer npc-auditor npc-auditor-b
pnpm --filter @cc/art-pipeline faces
```
