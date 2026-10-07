# Diplomatic Incident: art briefs for the image agent

> **Status (7 October 2026):** all 160 heads (40 delegates × 4) and bodies
> for batches A, B and D (30 delegates) are in the game. Still to come: batch C
> bodies (Mexico, Brazil, Argentina, Colombia, Chile, Jamaica, Japan, South
> Korea, India, Indonesia), which until then wear their own heads on a
> borrowed career body, and everything from brief 09 on (hall, Chair and
> Observer, FX and page art, institutions).

Art for **careercrash.org/incident** (design: `docs/career-crash/09-diplomatic-incident.md`):
an endless brawl between 40 countries at a summit, each country played by
its **delegate**, on a floor called *The Summit Hall*.

The work is split into **small briefs of ten pictures or fewer**. **Hand the
agent one file at a time**, with the reference images that file names. Each
file is self-contained: it repeats the house style and the layout rules it needs.

| # | File | What | Images | Priority |
|---|---|---|---|---|
| 1 | [`01-DELEGATES_A.md`](01-DELEGATES_A.md) | Bodies: England, Scotland (the derby, **first**), Wales, Ireland, France, Germany, Italy, Spain, Portugal, Netherlands | 10 | **1** |
| 2 | [`02-HEADS_A.md`](02-HEADS_A.md) | Heads for batch A, 4 per delegate (send in two halves of 20) | 40 | **1** |
| 3 | [`03-DELEGATES_B.md`](03-DELEGATES_B.md) | Bodies: Belgium, Switzerland, Austria, Poland, Sweden, Norway, Denmark, Greece, United States, Canada | 10 | 2 |
| 4 | [`04-HEADS_B.md`](04-HEADS_B.md) | Heads for batch B | 40 | 2 |
| 5 | [`05-DELEGATES_C.md`](05-DELEGATES_C.md) | Bodies: Mexico, Brazil, Argentina, Colombia, Chile, Jamaica, Japan, South Korea, India, Indonesia | 10 | 3 |
| 6 | [`06-HEADS_C.md`](06-HEADS_C.md) | Heads for batch C | 40 | 3 |
| 7 | [`07-DELEGATES_D.md`](07-DELEGATES_D.md) | Bodies: Philippines, Vietnam, Thailand, Australia, New Zealand, Nigeria, South Africa, Kenya, Egypt, Morocco | 10 | 4 |
| 8 | [`08-HEADS_D.md`](08-HEADS_D.md) | Heads for batch D | 40 | 4 |
| 9 | [`09-SUMMIT_HALL.md`](09-SUMMIT_HALL.md) | Arena backdrop + furniture sheets (intact, damaged, destroyed) | 4 | **2** |
| 10 | [`10-CHAIR_AND_OBSERVER.md`](10-CHAIR_AND_OBSERVER.md) | Madam Chair (the referee) and The Observer (any country without a delegate yet): bodies + heads | 2 + 8 | 3 |
| 11 | [`11-FX_AND_PAGE.md`](11-FX_AND_PAGE.md) | Gavel bang, SURGE burst, derby clash; page logo, share image, icon | 6 | 4 |
| 12 | [`12-INSTITUTIONS_A.md`](12-INSTITUTIONS_A.md) | Gatecrashers: UN, NATO (+ the Moral High Horse), ICC, Big Tech; bodies, then heads | 9 + 32 | 3 |
| 13 | [`13-INSTITUTIONS_B.md`](13-INSTITUTIONS_B.md) | Gatecrashers: Big Oil, Health Authority, Lenders, Federation, Brussels, the Rater | 10 + 40 | 5 |

The order above is the biggest visible gain first: England and Scotland are
the MVP derby, so their bodies and heads come before anything else.

## How we portray countries (read before every brief)

The fun of this mode is **pride in difference**: each delegate wears a
recognisable, affectionate version of their country's traditional or
iconic dress, and fights with a signature move from their culture
(a caber toss, a flamenco zapateado, a Muay Thai elbow). It's the spirit of
a World Cup opening ceremony, not a joke at anyone's expense.

- **Celebrate, don't mock.** Every delegate is the hero of their own country's
  fans. Draw them proud, capable and likeable. The comedy comes from the
  brawl (they get hit, fall over, lose their hat), never from who they are.
- **Dress:** traditional or iconic national costume, or sporting kit a
  country is proud of, drawn accurately and with care. A suit-and-lanyard
  delegate pass on top of it ties them all to the summit.
- **Bodies and faces:** a natural, everyday look for someone from that
  country, with skin tones and hair drawn as they really are. **No
  exaggerated or caricatured features**: same friendly cartoon proportions
  for everyone (big head, simple face), as in the rest of Career Crash.
- **No sacred or religious items** used as costume (no religious dress, no
  ceremonial headdresses, no haka), no military uniforms, no weapons beyond
  the folk-sports props named in the brief, no flags worn as capes over the
  face.
- **No real people.** No likeness of any politician, royal, athlete or
  celebrity. Every delegate is made up.
- **No text, no logos.** No letters or numbers anywhere, no team crests or
  brand marks. Flag colours on clothing are welcome; the game draws the
  actual flag beside the name tag.
- **No gore,** as in the rest of the game: slapstick only.
- **Same look as Career Crash.** Chunky pixel art, thick dark outline
  (#1b1f2a), flat colours with one shade tone, light from the top left.

## Reference images

All in `career-crash/art/`. Each brief says which to attach.

- `heads/_reference/body-sheet-example.webp`: the layout every body sheet copies.
- `sheets/npc-bro-btc.png`: a finished persona sheet, for the level of detail.
- `arenas/office.png`, `arenas/trading-floor.png`: the look and camera of arena paintings.
- `obstacles/trading-floor.png`: the look of furniture sheets.
- `items/fx-hit.png`, `items/fx-ko-stars.png`: the look of effect sheets.

## Hand-back

Drop files at the paths the briefs give, then tell Claude "go". Import
commands are at the end of each brief; Claude runs them, checks the slicer
previews in `tools/art-pipeline/out/`, fixes any mislabelled parts in the
manifests and sends screenshots.
