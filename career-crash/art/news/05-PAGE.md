# Broken News 05: logo, ident and page art

> **Status:** not delivered yet. The logo and ident are CSS (two skewed
> blocks, red and white) until then.

> Part of the Broken News art set (`art/news/README.md`). Design:
> `docs/career-crash/10-broken-news.md` §2.

Four images (a fifth for the channel bug is optional: a small "BSN"
rounded box in red and white, 256 × 128, the only text BSN): the show's logo, the ident card it slams onto at the start of
every episode, the share image and the page icon.

**Reference to attach:** `apps/client/src/cryptobro/logo.webp` (how Crypto
Bros' logo sits in the house style) and a screenshot of the block-out ident
(the red BROKEN block over the white NEWS block, both skewed).

## Style preamble (paste first)

> Pixel-art graphic for "Career Crash", a comedic 2D brawler: chunky clean
> pixel art, thick dark outline (#1b1f2a), flat colours with one shade tone,
> bold cable-news energy in navy #13204a, red #c8102e, white and gold #f5c542.
> No watermark.

| # | File | Size | Prompt (after the preamble) |
|---|---|---|---|
| 1 | `art/news/logo.png` | 1024 × 512, transparent | A cable-news show logo reading exactly **BROKEN NEWS**: "BROKEN" in heavy white italic capitals on a red slab, "NEWS" in heavy navy italic capitals on a white slab below and to the right, both slabs slightly skewed. The red slab has a jagged crack running through it with a small chip falling off, like a dropped plate. A small gold swoosh underneath. The only text is BROKEN NEWS. |
| 2 | `art/news/ident.png` | 1920 × 1080, opaque | The logo from image 1 centred on a dramatic navy background with radiating light beams, a spinning globe made of grid lines behind it with a crack across it, small sparks flying from the crack. The only text is BROKEN NEWS. |
| 3 | `apps/client/public/news/share.jpg` | 1200 × 630, opaque | The two anchors from `art/news/README.md` (Brock in a navy suit and red tie, left; Philippa in a royal-blue blazer with glasses, right) half out of their chairs mid-brawl across a curved news desk, papers and a coffee mug flying, Brock's tie over his shoulder, Philippa brandishing a fountain pen. The BROKEN NEWS logo top left. A red BREAKING strap along the bottom with no words on it. |
| 4 | `apps/client/public/news/icon.png` | 512 × 512, opaque | Just the cracked red BROKEN slab from the logo on a navy square, with a tiny gold swoosh. Readable at 32 px. The only text is BROKEN. |

## Importing

The logo and ident go to `apps/client/src/news/` as WebP (lossless) and
replace the CSS logo in `Studio.tsx` (`.bn-ident-logo`, `.bn-brand`). The share
image and icon go in `apps/client/public/news/`; Claude adds `og:image`,
`icon` and `apple-touch-icon` (180 px, resized) to `apps/client/news/index.html`
when the page launches.
