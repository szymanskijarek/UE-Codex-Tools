# Diplomatic Incident 08: heads, batch D (four per delegate)

> **Status:** not delivered yet.

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
| Philippines: Maria Videoke (`del-ph`) | huge welcoming smile | belting a power ballad | eyes wide, mouth an O, glossy black low bun knocked askew | eyes squeezed shut, wincing, glossy black low bun squashed or fallen |
| Vietnam: Linh Nón Lá (`del-vn`) | calm, gentle smile | sharp shout | eyes wide, mouth an O, nón lá conical hat and long black hair knocked askew | eyes squeezed shut, wincing, nón lá conical hat and long black hair squashed or fallen |
| Thailand: Somchai Muay (`del-th`) | focused, respectful look | fierce fighting shout | eyes wide, mouth an O, mongkol headband and short black hair knocked askew | eyes squeezed shut, wincing, mongkol headband and short black hair squashed or fallen |
| Australia: Bazza Barbie (`del-au`) | big easy grin | outraged "OI!" | eyes wide, mouth an O, cork bush hat and zinc on the nose knocked askew | eyes squeezed shut, wincing, cork bush hat and zinc on the nose squashed or fallen |
| New Zealand: Kiri Jandal (`del-nz`) | relaxed "sweet as" smile | rugby-tackle shout | eyes wide, mouth an O, wavy brown ponytail knocked askew | eyes squeezed shut, wincing, wavy brown ponytail squashed or fallen |
| Nigeria: Chidi Agbada (`del-ng`) | confident generous smile | booming "Ehen!" shout | eyes wide, mouth an O, fila cap tilted, trimmed beard knocked askew | eyes squeezed shut, wincing, fila cap tilted, trimmed beard squashed or fallen |
| South Africa: Thabo Vuvuzela (`del-za`) | huge grin | blowing-a-vuvuzela cheeks puffed out | eyes wide, mouth an O, decorated makarapa fan helmet knocked askew | eyes squeezed shut, wincing, decorated makarapa fan helmet squashed or fallen |
| Kenya: Wanjiru Marathon (`del-ke`) | calm, determined look | final-lap grimace | eyes wide, mouth an O, short hair knocked askew | eyes squeezed shut, wincing, short hair squashed or fallen |
| Egypt: Nour Nile (`del-eg`) | confident smile | commanding shout | eyes wide, mouth an O, striped fan nemes headcloth knocked askew | eyes squeezed shut, wincing, striped fan nemes headcloth squashed or fallen |
| Morocco: Youssef Babouche (`del-ma`) | salesman's twinkle | haggling indignation | eyes wide, mouth an O, red fez and neat black beard knocked askew | eyes squeezed shut, wincing, red fez and neat black beard squashed or fallen |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-del-<key>` import as `npc.del-<key>:<expression>`.
