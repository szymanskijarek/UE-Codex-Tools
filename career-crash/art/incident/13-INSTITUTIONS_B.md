# Diplomatic Incident 13: the Institutions, batch B (Big Oil, Health Authority, Lenders, Federation, Brussels)

> **Status:** not delivered yet. Design exploration (`docs/career-crash/09-diplomatic-incident.md` §7.2).

> Part of the Diplomatic Incident art set (`art/incident/README.md`). Same
> rules as `12-INSTITUTIONS_A.md`: no emblems, logos or flags of any real
> organisation or company, no likeness of any real person, no weapons.

Ten body sheets. **Heads come after** (table at the end; send them in two
halves of 20).

**Reference to attach:** `art/heads/_reference/body-sheet-example.webp`.
Layout and style preamble as in `01-DELEGATES_A.md`.

## The bodies (`art/sheets/npc-inst-<id>.png`)

**1. Big Oil Executive** (`inst-oil-exec`, black #1f1f1f with oil-gold #c9a227)
> A slick oil executive in his sixties: a white hard hat (spotless, never
> used) over a black three-piece suit, a gold tie, a gold watch, a little
> barrel-shaped money box on the belt, shiny shoes with a smear of oil on one
> toe, slicked silver hair, a wide sales smile.

**2. Roughneck** (`inst-oil-roughneck`, orange overalls, black oil stains)
> A burly oil-rig roughneck: orange overalls smeared with black oil, a
> scuffed yellow hard hat, heavy gloves, a giant wrench strapped across the
> back, steel-toe boots, a big beard, cheerfully covered in oil.

**3. Health Inspector** (`inst-health-inspector`, white coat with mint green #34d399)
> A brisk health inspector in her forties: a crisp white lab coat over mint
> green scrubs, a clipboard and a pump bottle of hand sanitiser on the belt,
> a stethoscope, comfortable white shoes, a neat short haircut, glasses, a
> brisk, no-nonsense look.

**4. Hazmat Hygienist** (`inst-health-hazmat`, bright yellow)
> A cheerful hygienist in a puffy bright-yellow hazmat suit with a clear
> visor hood, yellow rubber gloves and boots, a backpack sprayer tank with a
> hose (sanitiser foam), a roll of tape on the belt. Only the friendly eyes
> visible through the visor.

**5. The Lender** (`inst-lender`, charcoal pinstripe with bank green #166534)
> A smiling banker in his fifties: a charcoal pinstripe suit, a green tie, a
> briefcase chained to the wrist-cuff (strapped to the body), a calculator in
> the breast pocket, a fountain pen behind the ear, round glasses, a thin
> moustache, a smile that says "small print".

**6. Loan Officer** (`inst-lender-officer`, grey with green)
> An efficient loan officer in her thirties: a grey trouser suit, a green
> scarf, a stack of contracts under the arm, a rubber stamp on the belt, a
> tight bun, a polite, unblinking stare.

**7. Federation Official** (`inst-fed-official`, navy blazer with gold buttons)
> A self-important sports-federation official in his sixties: a navy blazer
> with big gold buttons, a striped club tie, grey trousers, polished loafers,
> a small gold trophy and an envelope of cash peeking from the blazer pocket,
> a lanyard with an "all access" pass (blank), a tan, perfect teeth.

**8. Federation Ambassador** (`inst-fed-ambassador`, tracksuit in gold and white)
> A beaming retired-athlete "ambassador": a gold-and-white tracksuit, a
> medal on a ribbon, spotless trainers, a sweatband, a selfie stick strapped
> to the back, a huge camera-ready grin. (No real athlete's likeness.)

**9. Brussels Regulator** (`inst-brussels`, EU-ish blue #1e3a8a with gold)
> A meticulous regulator in her forties: a blue trouser suit with gold
> buttons, a thick rulebook strapped to the hip, a retractable measuring
> tape and a rubber "COMPLIANT" stamp shape (no letters) on the belt,
> sensible shoes, neat hair, reading glasses on a chain, an expression of
> total procedural calm.

**10. The Rater** (`inst-rater`, grey with red)
> A grey man from a credit-rating agency: a grey suit, a grey tie with a
> thin red stripe, a giant rubber stamp strapped to his back, a tablet
> showing a red downward arrow (no numbers) on his belt, grey hair, a grey
> face, utterly unimpressed by anyone.

## Heads (four each, 256 × 256)

Files: `art/heads/<expression>/npc-inst-<id>.png`. Same prompt as
`02-HEADS_A.md`; attach the character's body sheet.

| Character (`id`) | `neutral` | `angry` | `surprised` | `hurt` |
|---|---|---|---|---|
| Big Oil Executive (`inst-oil-exec`) | wide sales smile | snarl, hard hat tipped back | hard hat jumped up, eyes wide | wincing, oil splashed on the face |
| Roughneck (`inst-oil-roughneck`) | cheerful oily grin | bellowing through the beard | eyebrows up, hard hat askew | eyes shut, oily and dazed |
| Health Inspector (`inst-health-inspector`) | brisk, assessing | "WASH YOUR HANDS!", pointing eyebrows | glasses fogged, mouth open | wincing, hair ruffled |
| Hazmat Hygienist (`inst-health-hazmat`) | friendly eyes behind the visor | narrowed eyes, visor misted | eyes huge, visor cracked a little | eyes shut, visor smeared with foam |
| The Lender (`inst-lender`) | "small print" smile | cold fury, moustache twitching | glasses flying, mouth an O | wincing, pen fallen from the ear |
| Loan Officer (`inst-lender-officer`) | polite unblinking stare | stern shout | eyebrows shot up, bun loose | eyes shut, bun undone |
| Federation Official (`inst-fed-official`) | perfect-teeth smile | blustering, red in the face | eyes wide, teeth still showing | wincing, tan gone pale |
| Federation Ambassador (`inst-fed-ambassador`) | camera-ready grin | competitive shout | sweatband slipped over the eyes | eyes shut, medal on the face |
| Brussels Regulator (`inst-brussels`) | procedural calm | stern "non-compliant" glare | glasses jumping off the chain | wincing, hair escaping |
| The Rater (`inst-rater`) | utterly unimpressed | cold frown | one eyebrow up (his maximum) | wince, tie crooked |

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-inst-oil-exec npc-inst-oil-roughneck npc-inst-health-inspector npc-inst-health-hazmat npc-inst-lender npc-inst-lender-officer npc-inst-fed-official npc-inst-fed-ambassador npc-inst-brussels npc-inst-rater
pnpm --filter @cc/art-pipeline faces
```
