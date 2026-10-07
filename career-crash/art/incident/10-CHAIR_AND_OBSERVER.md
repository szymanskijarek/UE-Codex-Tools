# Diplomatic Incident 10: Madam Chair and The Observer

> **Status:** delivered and in the game (7 October 2026): both bodies and all eight heads.

> Part of the Diplomatic Incident art set (`art/incident/README.md`).

Two characters who belong to the summit rather than to a country:

- **Madam Chair** referees the floor (the knock-out-able referee). She's
  unflappable until someone throws a delegate at her.
- **The Observer** stands in for any country that doesn't have its own
  delegate yet. Deliberately neutral: grey suit, no national dress.

**Reference to attach:** `art/heads/_reference/body-sheet-example.webp` for
the bodies; each character's finished body sheet for their heads.

## Bodies (same layout as every body sheet)

1254 × 1254 px, transparent. LEFT: the full character in 3/4 view facing
right, hands empty. RIGHT: the same character in 13 separate outlined pieces
(head, torso, pelvis, two upper arms, two forearms with hands, two thighs,
two shins, two shoes). No text, no letters, no logos, no flags.

Paste the style preamble from `01-DELEGATES_A.md` first, then:

**1. Madam Chair** (`art/sheets/npc-madam-chair.png`, navy #1f2a44 with gold #e0b441)
> A composed chairperson in her sixties: a navy skirt suit with a gold
> brooch, a pale-blue silk scarf, reading glasses on a chain, a gavel hooked
> on her belt, an earpiece with a curly wire, sensible low heels, short
> silver hair in a neat bob, an expression of infinite patience.

**2. The Observer** (`art/sheets/npc-del-observer.png`, grey #6b7280)
> A deliberately neutral delegate of no country in particular: a plain grey
> suit, a grey tie, a blank grey lanyard, a notepad and pencil clipped to the
> pocket, grey shoes, medium build, short brown hair, glasses, a face that
> gives nothing away.

## Heads (four each, 256 × 256)

Files: `art/heads/<expression>/npc-madam-chair.png`, `…/npc-del-observer.png`,
for `neutral`, `angry`, `surprised`, `hurt`. Same prompt as in `02-HEADS_A.md`.

| Character | `neutral` | `angry` | `surprised` | `hurt` |
|---|---|---|---|---|
| Madam Chair | infinitely patient, glasses on the nose | "ORDER!", glasses flying on their chain | eyebrows up, mouth an O, bob ruffled | eyes squeezed shut, glasses askew |
| The Observer | blank, giving nothing away | a tiny frown (as angry as he gets) | eyes wide behind the glasses | wincing, glasses cracked |

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-madam-chair npc-del-observer
pnpm --filter @cc/art-pipeline faces
```
