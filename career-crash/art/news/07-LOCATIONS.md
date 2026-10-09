# Broken News 07: location plates for field reports

> **Status (9 October 2026):** delivered and in the game. Field reports name
> a plate as `"location": "news:<name>"`; *No Sandwiches* (sandwich shop) and
> *Traffic Chaos* (motorway) use them. Design: `docs/career-crash/10-broken-news.md` §13.4.

> Part of the Broken News art set (`art/news/README.md`).

A location plate is the picture **behind** a reporter. The game blurs it
slightly and stands the reporter in front, waist up, in the middle third. So:

- **Size:** 1672 × 941, opaque (same as the arena paintings).
- **Camera:** eye level, like a TV camera on a tripod on the spot (not the
  arenas' raised stage view). The horizon sits about 45% down.
- **Keep the middle third clear and calm:** nothing important where the
  reporter stands (x 33–66%, y 30–100%). Put the interesting stuff to the left
  and right, and in the distance, so it reads around the reporter.
- **No people, no text, no logos, no real landmarks or real brands.**

**Reference to attach:** `art/arenas/docks.png` (palette and detail level) and
`art/news/desk-backdrop.png` (the show's look).

## Style preamble (paste first)

> Pixel-art background for "Career Crash", a comedic 2D game, matching the
> attached paintings in style: chunky clean pixel art, thick dark outlines,
> flat colours with one shade tone, light from the top left. 1672 × 941,
> opaque. An eye-level TV news camera view of a location, horizon about 45%
> down, the middle third of the picture clear and calm (a reporter will stand
> there), the interesting details at the left and right edges and in the
> distance. No people, no text, no letters, no logos, no real landmarks.

## The plates

| # | File | Gag it serves | Prompt (after the preamble) |
|---|---|---|---|
| 1 | `art/news/location-motorway.png` | Chase reporting a "traffic apocalypse" from the hard shoulder | A motorway hard shoulder at dawn: a crash barrier running away into the distance, a gantry sign with blank panels, a single traffic cone on its side in the left foreground, a perfectly empty road, a lay-by with a closed burger van on the right, grey drizzle. |
| 2 | `art/news/location-sheep-field.png` | "Rural unrest", reported with war-zone gravitas | A muddy sheep field in light rain: a dry-stone wall and a wooden gate on the left, three sheep far in the background staring at the camera, a lone tractor on the right, rolling green hills, a heavy grey sky. |
| 3 | `art/news/location-ministry.png` | Outside a government building where nothing is happening | The steps of a grand generic government building at night (columns, a big closed wooden door, two empty flagpoles, no flags, no emblem): a single security barrier on the left, a lamppost on the right, wet paving, nobody around. |
| 4 | `art/news/location-glacier.png` | Rupert "at the edge of the world" for a minor story | A blinding white glacier under a pale blue sky: ice ridges at the left and right edges, a tiny orange tent far in the distance, a flag-less pole stuck in the snow on the right, snow blowing sideways. |
| 5 | `art/news/location-car-park.png` | A shopping-centre car park at closing time ("scenes of chaos") | A huge, almost empty shopping-centre car park at dusk: a row of trolleys on the left, a pay-and-display machine on the right, painted bays stretching away, one abandoned shopping trolley in the distance, sodium lights flickering on. |
| 6 | `art/news/location-sandwich-shop.png` | Rupert's famous "outside a sandwich shop that has run out of sandwiches" | A high-street sandwich shop seen from across the pavement: a big front window with empty display shelves and one sad lettuce leaf, a chalkboard A-board on the left (blank), a bin and a pigeon on the right, rain on the glass. No shop name. |

## Importing

Claude converts each plate to WebP (1536 px wide, quality 70, like the arena
backdrops) into `apps/client/src/news/art/`, and a field report then names it
as its `location` (`"location": "news:motorway"`) instead of an arena.
