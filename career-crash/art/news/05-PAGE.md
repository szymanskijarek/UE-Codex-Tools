# Broken News 05: logo, ident and page art (show + channel)

> **Status (9 October 2026):** delivered and in the game (round 2, with BSN):
> the bug is the corner logo, the logo heads the page and the start card, the
> ident is the opening card, and the share image and icons are in the page's
> link preview. Full-size icon and share sources are kept in `art/news/`.

> Part of the Broken News art set (`art/news/README.md`). Design:
> `docs/career-crash/10-broken-news.md` §2 and §3.4.

## The naming (read first)

- The **show** is **BROKEN NEWS**.
- The **channel** it airs on is **BSN**: officially the *Breaking Story
  Network*. Nobody agrees what BSN stands for (it's a running joke), so the
  art only ever writes the three letters **BSN**, never the expansion.
- Together: **"BROKEN NEWS · on BSN"**. The show logo is the big thing; BSN
  is the channel's small bug next to it, like a TV channel's corner logo.
- Image generators garble letters. Every prompt spells the text out and says
  it is the ONLY text; check each letter before importing (the first round
  had a broken "O" in BROKEN, which is on-joke as a crack, but not as a
  missing letter).

## Style preamble (paste first)

> Pixel-art graphic for "Career Crash", a comedic 2D brawler: chunky clean
> pixel art, thick dark outline (#1b1f2a), flat colours with one shade tone,
> bold cable-news energy in navy #13204a, red #c8102e, white and gold #f5c542.
> All lettering is clean, bold and correctly spelled, every letter complete
> and readable. No watermark, no other text than stated.

**Reference to attach:** the previous logo you made (the red BROKEN slab over
the white NEWS slab with the gold swoosh): keep that look.

| # | File | Size | Prompt (after the preamble) |
|---|---|---|---|
| 1 | `art/news/bsn-bug.png` | 512 × 256, transparent | A TV channel corner logo: the three letters **BSN** in heavy white italic capitals inside a rounded red (#c8102e) rectangle with a thick white border and a thin dark outline, a small gold lightning-crack running diagonally through the rectangle's corner. Flat, clean, readable at 48 px tall. The only text is BSN. |
| 2 | `art/news/logo.png` | 1024 × 512, transparent | The show logo, matching the attached one: "BROKEN" in heavy white italic capitals on a red slab, "NEWS" in heavy navy italic capitals on a white slab below and to the right, both slabs slightly skewed, a jagged crack through the red slab with a small chip falling off (all six letters of BROKEN complete and readable), a gold swoosh underneath. In the top-right corner, overlapping the red slab slightly, the small **BSN** channel bug from image 1. The only text is BROKEN, NEWS and BSN. |
| 3 | `art/news/ident.png` | 1920 × 1080, opaque | The logo from image 2 (with the BSN bug) centred on a dramatic navy background with radiating light beams, a gold wireframe globe behind it with a crack across it, small sparks flying from the crack. Below the logo, a thin gold line and the words **ON BSN** in small white capitals. The only text is BROKEN, NEWS, BSN and ON. |
| 4 | `apps/client/public/news/share.jpg` | 1200 × 630, opaque | The two anchors (Brock in a navy suit and red tie, left; Philippa in a royal-blue blazer with glasses, right) half out of their chairs mid-brawl across a curved news desk, papers and a coffee mug flying, Brock's tie over his shoulder, Philippa brandishing a fountain pen, glasses flying. The BROKEN NEWS logo (image 2, with its BSN bug) fully visible in the top-left corner, not cropped. A red strap along the bottom reading **BREAKING** on its left end, nothing else on it. The only text is BROKEN, NEWS, BSN and BREAKING. |
| 5 | `apps/client/public/news/icon.png` | 512 × 512, opaque | App icon: the BSN bug from image 1, large and centred on a navy square with a tiny gold swoosh beneath it. Readable at 32 px. The only text is BSN. |

## Importing

The logo, bug and ident go to `apps/client/src/news/` as WebP (lossless) and
replace the CSS logo in `Studio.tsx` (`.bn-ident-logo`, `.bn-brand`) and the
"LIVE · BSN" bug. The share image and icon go in `apps/client/public/news/`;
Claude adds `og:image`, `icon` and `apple-touch-icon` (180 px, resized) to
`apps/client/news/index.html` when the page launches.
