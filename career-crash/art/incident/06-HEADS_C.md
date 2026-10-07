# Diplomatic Incident 06: heads, batch C (four per delegate)

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
| Mexico: Don Lucho Mariachi (`del-mx`) | big singing smile | luchador battle cry | eyes wide, mouth an O, sombrero, luchador mask pushed up, black moustache knocked askew | eyes squeezed shut, wincing, sombrero, luchador mask pushed up, black moustache squashed or fallen |
| Brazil: Samba Silva (`del-br`) | huge joyful smile | shouting "GOOOL" | eyes wide, mouth an O, feather carnival band and long curls knocked askew | eyes squeezed shut, wincing, feather carnival band and long curls squashed or fallen |
| Argentina: Martín Gaucho (`del-ar`) | cool, half-lidded confident look | passionate shout | eyes wide, mouth an O, flat gaucho hat and dark stubble knocked askew | eyes squeezed shut, wincing, flat gaucho hat and dark stubble squashed or fallen |
| Colombia: Valentina Cafetera (`del-co`) | bright warm smile | fiery shout | eyes wide, mouth an O, sombrero vueltiao and long dark hair knocked askew | eyes squeezed shut, wincing, sombrero vueltiao and long dark hair squashed or fallen |
| Chile: Pancho Huaso (`del-cl`) | calm, unbothered look (he has felt worse quakes) | stern shout | eyes wide, mouth an O, flat-brimmed black hat and moustache knocked askew | eyes squeezed shut, wincing, flat-brimmed black hat and moustache squashed or fallen |
| Jamaica: Desmond Sprint (`del-jm`) | relaxed confident grin | sprint-finish face | eyes wide, mouth an O, gold-green sweatband and short twists knocked askew | eyes squeezed shut, wincing, gold-green sweatband and short twists squashed or fallen |
| Japan: Kenji Ojigi (`del-jp`) | respectful, composed look | fierce kiai shout | eyes wide, mouth an O, hachimaki headband and neat black hair knocked askew | eyes squeezed shut, wincing, hachimaki headband and neat black hair squashed or fallen |
| South Korea: Min-jun Idol (`del-kr`) | flawless stage smile | performing a fierce high note | eyes wide, mouth an O, styled hair with a blue streak and a headset mic knocked askew | eyes squeezed shut, wincing, styled hair with a blue streak and a headset mic squashed or fallen |
| India: Raj Googly (`del-in`) | big friendly smile | "HOWZAT!" appeal shout | eyes wide, mouth an O, navy cricket cap and black moustache knocked askew | eyes squeezed shut, wincing, navy cricket cap and black moustache squashed or fallen |
| Indonesia: Budi Batik (`del-id`) | calm, polite smile | focused silat shout | eyes wide, mouth an O, black peci cap knocked askew | eyes squeezed shut, wincing, black peci cap squashed or fallen |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-del-<key>` import as `npc.del-<key>:<expression>`.
