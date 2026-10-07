# Diplomatic Incident 04: heads, batch B (four per delegate)

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
| Belgium: Lotte Wafelaar (`del-be`) | patient diplomatic smile | finally out of patience, shouting | eyes wide, mouth an O, curly bun and round glasses knocked askew | eyes squeezed shut, wincing, curly bun and round glasses squashed or fallen |
| Switzerland: Ueli Neutral (`del-ch`) | perfectly neutral expression | yodelling at full lung capacity | eyes wide, mouth an O, black cap and neat grey beard knocked askew | eyes squeezed shut, wincing, black cap and neat grey beard squashed or fallen |
| Austria: Franzi Walzer (`del-at`) | graceful, ready-to-waltz smile | cross, braid coming loose | eyes wide, mouth an O, braided blonde crown knocked askew | eyes squeezed shut, wincing, braided blonde crown squashed or fallen |
| Poland: Zbigniew Góral (`del-pl`) | proud, warm half-smile under the moustache | mountain bellow, moustache flared | eyes wide, mouth an O, black felt hat with shells and dark moustache knocked askew | eyes squeezed shut, wincing, black felt hat with shells and dark moustache squashed or fallen |
| Sweden: Astrid Fika (`del-se`) | calm "lagom" smile | shouting at the flat-pack instructions | eyes wide, mouth an O, two pale-blonde plaits knocked askew | eyes squeezed shut, wincing, two pale-blonde plaits squashed or fallen |
| Norway: Ola Fjellstad (`del-no`) | cheerful outdoorsy grin | gritted-teeth sprint finish face | eyes wide, mouth an O, bobble hat and blond beard knocked askew | eyes squeezed shut, wincing, bobble hat and blond beard squashed or fallen |
| Denmark: Mette Hygge (`del-dk`) | content, hygge smile | cross, scarf pulled up to the nose | eyes wide, mouth an O, messy blonde top-knot and round spectacles knocked askew | eyes squeezed shut, wincing, messy blonde top-knot and round spectacles squashed or fallen |
| Greece: Yiannis Olympiou (`del-gr`) | proud "opa" smile | shouting with both eyebrows up | eyes wide, mouth an O, red tasselled cap and black moustache knocked askew | eyes squeezed shut, wincing, red tasselled cap and black moustache squashed or fallen |
| United States: Hank Tailgate (`del-us`) | huge confident grin | touchdown roar | eyes wide, mouth an O, white cowboy hat knocked askew | eyes squeezed shut, wincing, white cowboy hat squashed or fallen |
| Canada: Constable Doug Maple (`del-ca`) | sincere, apologetic smile | apologetic shout, "SORRY!" energy | eyes wide, mouth an O, wide-brimmed campaign hat and trim beard knocked askew | eyes squeezed shut, wincing, wide-brimmed campaign hat and trim beard squashed or fallen |

## Importing

```
pnpm --filter @cc/art-pipeline faces
```

Heads named `npc-del-<key>` import as `npc.del-<key>:<expression>`.
