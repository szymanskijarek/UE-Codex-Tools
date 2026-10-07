# Diplomatic Incident 02: heads, batch A (four per delegate)

> **Status:** delivered and in the game (7 October 2026): all 40 heads.

> Part of the Diplomatic Incident art set (`art/incident/README.md`).

The game swaps heads during a fight (proud on walk-on, furious mid-brawl,
shocked when thrown, hurt when knocked out) and uses them as portraits in
the lobby and the standings.

**Send this file in two halves** (delegates 1–5, then 6–10: 20 heads each),
so the agent isn't overwhelmed.

**Reference to attach:** the delegate's own body sheet from `art/sheets/`
(`npc-del-<key>.png`). Generate the body first.

## Format

- **One head per file, 256 × 256 px,** transparent background, head only,
  centred, filling about 85% of the canvas, the same 3/4 angle facing right
  as the head on the body sheet, with the same hat, hair and headwear.
- **Files:** `art/heads/<expression>/npc-del-<key>.png`.
- **Expressions:** `neutral`, `angry`, `surprised`, `hurt`.
- Same face, same skin tone and same features in all four: only the
  expression changes.

## Prompt (one per head)

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet, same hat, hair and headwear, natural features drawn with respect
> (no caricature). No text, no letters, no logos. Expression: [EXPRESSION]

Replace `[EXPRESSION]` with the delegate's line from the table.

| Delegate (`id`) | `neutral` (proud default) | `angry` (shouting) | `surprised` | `hurt` |
|---|---|---|---|---|
| England: Sir Nigel Queueworth (`del-eng`) | polite tight-lipped smile, one eyebrow raised, bowler hat straight | red-faced indignation, moustache bristling, "I say!" | eyes wide, mouth an O, bowler hat knocked askew | eyes squeezed shut, wincing, bowler hat squashed or fallen |
| Scotland: Hamish McTavish (`del-sco`) | broad grin through the beard | roaring battle cry, beard bristling | eyes wide, mouth an O, tam o' shanter bonnet and ginger beard knocked askew | eyes squeezed shut, wincing, tam o' shanter bonnet and ginger beard squashed or fallen |
| Wales: Dai Llewellyn (`del-wal`) | cheeky grin, about to burst into song | mid-roar like a scrum call | eyes wide, mouth an O, short dark hair and daffodil knocked askew | eyes squeezed shut, wincing, short dark hair and daffodil squashed or fallen |
| Ireland: Siobhán O'Leary (`del-ie`) | mischievous wink | shouting, cap pushed back, curls flying | eyes wide, mouth an O, flat cap and red curls knocked askew | eyes squeezed shut, wincing, flat cap and red curls squashed or fallen |
| France: Amélie Baguette (`del-fr`) | unimpressed half-smile, one eyebrow raised | scandalised, "non non non", beret slipping | eyes wide, mouth an O, beret and dark bob knocked askew | eyes squeezed shut, wincing, beret and dark bob squashed or fallen |
| Germany: Klaus Pünktlich (`del-de`) | proud punctual smile, checking the time | stern shout, moustache bristling | eyes wide, mouth an O, alpine hat with a feather and blond moustache knocked askew | eyes squeezed shut, wincing, alpine hat with a feather and blond moustache squashed or fallen |
| Italy: Gianni Gesto (`del-it`) | charming smile, fingers pinched together (head only: eyebrows doing the gesture) | exasperated "ma che fai", eyebrows up | eyes wide, mouth an O, sunglasses on slicked-back hair knocked askew | eyes squeezed shut, wincing, sunglasses on slicked-back hair squashed or fallen |
| Spain: Lola Taconazo (`del-es`) | proud chin, confident half-smile | fierce "olé", eyes flashing | eyes wide, mouth an O, black bun with a red flower and comb knocked askew | eyes squeezed shut, wincing, black bun with a red flower and comb squashed or fallen |
| Portugal: Tiago Navegador (`del-pt`) | kind, slightly melancholy smile | stormy sea-captain shout | eyes wide, mouth an O, fisherman's cap and salt-and-pepper beard knocked askew | eyes squeezed shut, wincing, fisherman's cap and salt-and-pepper beard squashed or fallen |
| Netherlands: Joost van Fiets (`del-nl`) | frank, friendly look | very direct shout, finger-wag eyebrows | eyes wide, mouth an O, short blonde hair knocked askew | eyes squeezed shut, wincing, short blonde hair squashed or fallen |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-del-<key>` import as `npc.del-<key>:<expression>`.
