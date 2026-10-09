# Broken News 02: the anchors as fighters (bodies and heads)

> **Status (9 October 2026):** A (both body sheets) delivered and in the
> game (`npc.news-brock`, `npc.news-philippa`; Brock's sheet needed six cuts
> in the manifest, Philippa's one), and so is B (four heads each; they came
> in at 1254 px and were scaled to the usual 256 px). Nothing left here.

> Part of the Broken News art set (`art/news/README.md`, read *The two
> anchors* first). Design: `docs/career-crash/10-broken-news.md` §3.

When the desk argument boils over, the show cuts to the studio floor and the
anchors brawl for a few seconds, as ordinary Career Crash fighters. They need
a paper-doll body sheet each and the usual four heads. Draw them to match the
desk-shot art (brief 01) if that exists: same hair, suit, tie, glasses.

**Reference to attach to every prompt:** `art/heads/_reference/body-sheet-example.webp`
(and `art/sheets/npc-bro-btc.png` for the level of detail).

## A. Bodies: `art/sheets/npc-news-brock.png`, `art/sheets/npc-news-philippa.png`

### Layout (copy `body-sheet-example.webp` exactly)

- **Canvas:** 1254 × 1254 px (or 1536 × 1024 landscape), transparent background.
- **Left half:** the full character standing, 3/4 view facing right, arms
  relaxed slightly away from the body, feet apart, **hands empty**.
- **Right half:** the same character cut into **13 separate pieces**, each with
  a clear transparent gap around it: head (with hair), torso, pelvis, left and
  right upper arm, left and right forearm with hand, left and right thigh,
  left and right shin, left and right shoe.
- **Held things go on the body:** Brock's cue cards and Philippa's fountain
  pen are clipped to the belt or the breast pocket, never in the hands.
- Philippa's skirt goes on the **pelvis** piece and may hang over the thighs.

### Style preamble (paste first)

> Pixel-art character sheet for "Career Crash", a comedic 2D workplace
> brawler, matching the attached example sheet exactly in style and layout:
> chunky clean pixel art, thick dark outline (#1b1f2a), flat colours with one
> shade tone, light from the top left, big head (head to body about 1 : 1.4),
> friendly cartoon proportions. Transparent background. LEFT: the full
> character standing in 3/4 view facing right, hands empty. RIGHT: the same
> character cut into 13 separate paper-doll pieces laid out like the example
> (head, torso, pelvis, two upper arms, two forearms with hands, two thighs,
> two shins, two shoes), each piece outlined, with rounded joint ends and a
> clear gap around it. No text, no letters, no numbers, no logos, no shadow,
> no extra pieces.

**1. Brock Stetson Jr.** (`news-brock`, main colour navy #1f2f5c with red tie #c8102e)
> A TV news anchor in his forties, built like a former college quarterback:
> a navy suit slightly too tight across the shoulders, a white shirt, a red
> power tie, a small American-flag lapel pin, a bundle of blue cue cards
> clipped to the belt, shiny black shoes, a helmet of glossy chestnut hair,
> a big square jaw, very white teeth, a perma-tan, a radio earpiece with a
> curly wire.

**2. Philippa Featherstonehaugh** (`news-philippa`, main colour royal blue #1d3f8f with cream)
> A British TV news anchor in her forties, upright and precise: a tailored
> royal-blue blazer over a cream blouse, a navy pencil skirt, black low-heeled
> court shoes, pearl earrings, a sharp dark bob, reading glasses low on her
> nose, a fountain pen clipped in the breast pocket, a radio earpiece with a
> curly wire. Fair skin.

## B. Heads: four per anchor

**Reference to attach:** the anchor's own body sheet from part A. Generate the
body first.

- **One head per file, 256 × 256 px,** transparent background, head only,
  centred, filling about 85% of the canvas, the same 3/4 angle facing right
  as the head on the body sheet.
- **Files:** `art/heads/<expression>/npc-news-<anchor>.png`.
- **Expressions:** `neutral`, `angry`, `surprised`, `hurt`.
- Same face, same hair and same features in all four: only the expression changes.

> Pixel-art cartoon head for "Career Crash": chunky clean pixel art, thick dark
> outline (#1b1f2a), flat colours with one shade tone, light from the top
> left, transparent background, 256 × 256. The character from the attached
> sheet, same hair, glasses and earpiece. No text, no letters, no logos.
> Expression: [EXPRESSION]

| Anchor | `neutral` | `angry` | `surprised` | `hurt` |
|---|---|---|---|---|
| Brock (`news-brock`) | dazzling on-air grin, teeth sparkling | roaring, vein on the forehead, hair still perfect | jaw dropped, eyes wide, one strand of hair finally out of place | eyes squeezed shut, wincing, hair flattened on one side |
| Philippa (`news-philippa`) | composed, peering over her glasses | eyes narrowed to slits, lips pressed thin, glasses flashing | glasses slipping off, mouth a small O | eyes squeezed shut, wincing, glasses askew, bob messed up |

## Importing

```
pnpm --filter @cc/art-pipeline puppets npc-news-brock npc-news-philippa
pnpm --filter @cc/art-pipeline faces
```

Check the previews in `tools/art-pipeline/out/puppets/` and fix merged parts
in `art/sheets/manifest.json` (`PIPELINES.md` §5.1). They import as
`npc.news-brock` and `npc.news-philippa`; then Claude swaps the stand-in
`career` in `apps/client/src/news/cast.ts` for them (the brawl puppet and the
portraits).
