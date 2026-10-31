# Regards, Wall Street 3: share image

> Part of the Regards, Wall Street art set (`art/wallstreet/README.md`).

The picture link previews show when someone shares careercrash.org/wallstreet
(Slack, WhatsApp, LinkedIn…). The logo and icons are already drawn in code.

**Reference to attach:** `apps/client/public/cryptobro/share.jpg` (the Crypto
Bros share image: same layout and energy) and two or three of the body sheets
from `01-SECTOR_BODIES.md` once they exist.

## Format

- **1200 × 630 px, JPEG,** no transparency. **File:** `apps/client/public/wallstreet/share.jpg`.
- Keep the middle 1000 × 500 clear of anything important (previews crop).

## Prompt

> Pixel-art key art for "Career Crash", a comedic 2D workplace brawler,
> 1200 × 630, matching the attached share image in style: chunky clean pixel
> art, thick dark outline (#1b1f2a), flat colours with one shade tone. A
> navy-and-brass stock-exchange trading floor at the end of the day, a big
> brass bell on a podium at the back, a wall of green and red price
> candles. In the foreground a slapstick office brawl between the attached
> characters: a scrum master in a blue hoodie mid-tackle, a vest-wearing
> banker swinging a phone-free punch, a shelf stacker brandishing an empty
> hand like a price gun, a real-estate agent ducking; paper order slips and
> sticky notes flying. A red-jacketed floor referee blowing a whistle. No
> text, no letters, no numbers, no logos, no real people.

## Importing

Nothing to run: drop the file in place, then add the image tags to
`apps/client/wallstreet/index.html` (`og:image`, `og:image:width`/`height`,
`og:image:alt`, `twitter:card` → `summary_large_image`), as in
`apps/client/cryptobro/index.html`.
