# Personnel files and Garden Leave: art prompts

> **Status:** optional. The feature ships without new art: the scowl uses
> the existing `angry` and `hurt` faces, and the file and Garden Leave screens
> are drawn in CSS with emoji. These three sets would make it look finished.
> Design: `docs/career-crash/06-personnel-files-and-garden-leave.md`.

This file is self-contained: hand it to the image agent with the reference
images it names. Paste the **house style** (from `art/ART_BRIEF.md` §1) before
every prompt:

> Pixel-art game asset for "Career Crash", a comedic 2D workplace brawler.
> Chunky, clean pixel art with a thick dark outline (#1b1f2a), flat colour
> fills with one shade tone, light from the top left, bright readable palette,
> 3/4 top-down view (we see the front and a little of the top). Transparent
> background, no ground shadow, no text, no labels, no watermark, no frame.
> Each object isolated with generous empty space around it.

| # | Set | Files | Used for | Priority |
|---|---|---|---|---|
| A | Garden Leave backdrop | 1 painting | Behind the benched staff on the Squad screen, idling in deckchairs | High |
| B | HR office props | 1 item sheet (8 cells) | Folder, stamps and garden icons in the file and Squad screens | Medium |
| C | "Fed up" heads | 44 single heads | A sulkier face than `angry` when a teammate winds someone up | Low |

---

## A. Garden Leave backdrop

- **File:** `art/ui/garden-leave.png`, **1536 × 640 px**, opaque (it's a
  backdrop, so no transparency).
- **Layout:** the bottom 45% is an open, flat lawn with nothing on it, where
  up to three fighters will stand. Keep the props to the edges and the back.
- **Reference:** attach `art/arenas/office.png` so the painting matches the
  arena backdrops' look.

> [House style, but opaque background] A wide pixel-art backdrop, 1536 × 640,
> of a sunny suburban back garden used by office workers on "garden leave".
> Same 3/4 stage view as the arena paintings. At the back: a wooden fence, a
> small shed with its door open showing a filing cabinet inside, a washing line
> with a shirt and a loose tie pegged on it, and a sun umbrella. Along the left
> and right edges: two striped deckchairs (one with a laptop on it, its lid
> half shut), a hammock between two trees, a garden gnome wearing a lanyard, a
> watering can, a small paddling pool and a barbecue. The bottom 45% of the
> picture is an empty, flat, mown lawn with stripes, open for characters to
> stand on. Warm afternoon light, blue sky with two fluffy clouds. Calm, smug,
> holiday mood. No people, no text.

**After it arrives:** I add it to the Garden Leave card on the Squad screen,
with the benched staff idling on the lawn as `PuppetView`s (lazy idle,
sunglasses optional), converted to lossy WebP like the arena backdrops.

---

## B. HR office props (item sheet)

- **File:** `art/items/hr-office.png`, **1254 × 1254 px**, transparent,
  **4 columns × 2 rows**, one object per cell, nothing touching the cell
  edges. Same format as the other item sheets.
- **Manifest** (`art/items/manifest.json`, reading order):
  `hr-folder`, `hr-folder-open`, `hr-stamp-approved`, `hr-stamp-concern`,
  `deckchair`, `watering-can`, `garden-gnome`, `sun-hat`.

> [House style] Item sheet 1254 × 1254, transparent background, 4 × 2 grid,
> one object per cell, reading order: (1) a closed manila personnel folder
> with a red "confidential"-style band (a plain red stripe, no letters) and a
> paperclip; (2) the same folder lying open with two sheets of paper and a
> passport-style photo clipped inside (photo blank); (3) a wooden rubber
> stamp with a green ink pad, a green tick mark stamped next to it; (4) the
> same rubber stamp with a red ink pad, a red cross stamped next to it; (5) a
> striped folding deckchair; (6) a green metal watering can; (7) a garden
> gnome with a lanyard and a tiny briefcase; (8) a floppy straw sun hat. No
> text or letters anywhere.

**After it arrives:** `pnpm --filter @cc/art-pipeline items`, then the
folder replaces the 📁 emoji, the stamps replace the CSS stamps on notes, and
the deckchair marks the Garden Leave buttons.

---

## C. "Fed up" heads (optional face variant)

A sulkier face than the existing `angry` one: arms-folded energy, eyes rolled
sideways at a colleague, lips pressed flat. Shown instead of `angry` when an
HR note says a teammate is the problem.

- **Format:** one head per file, **256 × 256 px**, transparent, head only,
  centred, filling about 85% of the canvas. Same 3/4 angle, size, hat, hair
  and glasses as the reference. No neck, no body, no hands.
- **Files:** `art/heads/fedup/<career>.webp` (the single-head importer
  already reads any frame folder; see `PIPELINES.md` §5.3).
- **Reference:** attach `art/heads/_reference/<career>.webp` for each head.
- **Only these 44 careers need one** (they have a teammate-caused debuff):
  accountant, archaeologist, astronaut, builder, bus-driver, carpenter, chef,
  chimney-sweep, clown, conspiracy-podcaster, dentist, dj, electrician,
  engineer, fashion-designer, flight-attendant, fortune-teller,
  hotel-concierge, janitor, journalist, lawyer, librarian, magician,
  marine-biologist, mechanic, mime, museum-curator, nurse, painter,
  personal-trainer, plumber, politician, postal-worker, programmer,
  psychologist, scientist, security-guard, tailor, tattoo-artist,
  taxi-driver, teacher, train-conductor, tv-host, welder.

> [House style] A single pixel-art head, 256 × 256, transparent background,
> the same character as the attached reference head (same face, skin, hair,
> hat, glasses and colours, same 3/4 angle and size). Expression: fed up with
> a colleague. Eyes rolled hard to the side (towards the viewer's left), one
> eyebrow down, lips pressed into a flat line, cheeks slightly puffed, a tiny
> grey storm-cloud scribble above the head. Head only, no neck, no body.

**After it arrives:** `pnpm --filter @cc/art-pipeline faces`, then I add the
`fedup` frame to the face atlas types and use it for the scowl (falling back
to `angry` for anyone without one).

---

## Hand-back checklist

1. Drop the files in the folders named above and tell me.
2. I run the matching importer (a WebP conversion for A, `items` for B,
   `faces` for C), check the previews in `tools/art-pipeline/out/`, wire them into the
   Squad and file screens, and check the single-file size stays under budget
   (about +200 KB for A, +20 KB for B, +60 KB for C).
