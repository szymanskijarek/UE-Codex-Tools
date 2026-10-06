# Career Crash — pipelines

Every way something in this repo gets built, generated, checked or shipped.
For the day-to-day process (branches, releases, art intake, tools) see
[`WORKFLOW.md`](WORKFLOW.md).
Run commands from `career-crash/` unless stated otherwise. When you add or
change a pipeline, update this file in the same change.

```
packages/content/data/*.json ──content:build──▶ packages/content/dist/bundle.json ──┐
art/** ──art-pipeline──▶ apps/client/src/replay/{puppets,faces,items,obstacles,arenas}/ ─┤
                                                                                    ▼
                          sim / game-rules / commentary ──▶ apps/client ──build──────▶ dist/ (hosted site)
                                                                         └─build:standalone─▶ dist-standalone/career-crash.html
                                                                                              career-crash.artifact.html
```

| Pipeline | Command | Reads | Writes |
|---|---|---|---|
| [Content build](#1-content-build) | `pnpm content:build` | `packages/content/data/` | `packages/content/dist/bundle.json`, `manifest.json` |
| [Checks](#2-checks) | `pnpm check` | everything | nothing (fails on problems) |
| [Golden replays](#3-golden-replays) | `pnpm replay golden [--update]` | `packages/sim/test/golden/` | `goldens.json` (with `--update`) |
| [Balance](#4-balance-reports) | `pnpm balance --battles=400` | content bundle | `tools/balance/reports/` |
| [Art: puppets](#51-character-puppets) | `pnpm --filter @cc/art-pipeline puppets [career…]` | `art/sheets/` | `apps/client/src/replay/puppets/` |
| [Art: grid puppets](#52-grid-puppets-currently-unused) | `pnpm --filter @cc/art-pipeline puppets-grid` | `art/sheets-grid/` | `apps/client/src/replay/puppets/` |
| [Art: faces](#53-faces) | `pnpm --filter @cc/art-pipeline faces` | `art/faces/`, `art/faces-b/` | `apps/client/src/replay/faces/` |
| [Art: items](#54-items-and-obstacles) | `pnpm --filter @cc/art-pipeline items` | `art/items/` | `apps/client/src/replay/items/` |
| [Art: obstacles](#54-items-and-obstacles) | `pnpm --filter @cc/art-pipeline items obstacles` | `art/obstacles/` | `apps/client/src/replay/obstacles/` |
| [Art: arenas](#55-arena-backdrops) | `pnpm --filter @cc/art-pipeline arenas` | `art/arenas/` | `apps/client/src/replay/arenas/` |
| [Art prompts](#56-art-prompts) | `pnpm art:prompts` | content bundle | `tools/art-pipeline/out/prompts.json` |
| [Client (hosted)](#61-hosted-build) | `pnpm --filter @cc/client build` | client + bundle + art | `apps/client/dist/` |
| [Client (single file)](#62-single-file-build) | `pnpm --filter @cc/client build:standalone` | same | `apps/client/dist-standalone/` |
| [Publish to Claude](#63-publishing-the-single-file-as-a-claude-artifact) | Artifact tool | `career-crash.artifact.html` | the Career Crash artifact link |
| [careercrash.org](#64-careercrashorg-cloudflare-workers) | push to `prod` (Workers Builds) | `pnpm build:web` → `apps/client/dist-web/` | the live site |
| [API worker](#7-api-worker) | `pnpm dev:worker`, `pnpm --filter @cc/worker deploy` | `apps/worker/` | Cloudflare Worker + D1 |
| [CI](#8-ci) | on push / PR | `career-crash/**` | balance report artifact |

## 1. Content build

`pnpm content:build` (`packages/content-compiler`) validates all gameplay
content against the Zod schemas in `packages/content-schema` and compiles it
into one bundle the game loads.

- **Reads:** `packages/content/data/**` — careers, abilities, props, rules,
  arenas, statuses, synergies (banter), `live.json` (commentary, barks, menu
  lines, feed posts and comments), `locales/en.json`, economy, names, tags.
- **Checks:** schema shape, id references between files, the tag vocabulary
  (`data/tags.json`), power budgets (02 §9), and that every id has a
  `locales/en.json` name. HR notes (`data/hrNotes/`) are checked for their
  references, stat budget (±3 per stat, 4 points in all), tone, mood rule and
  coverage (two per non-boss career); see 06 §3.3.
- **Writes:** `packages/content/dist/bundle.json` and `manifest.json`. The
  bundle carries a content hash; golden replays record it.
- **Run it** after any change under `data/`. The client, tests and tools all
  import the built bundle, so a stale one gives confusing results, and the
  client build fails outright when it's missing.

Zod runs only here. Runtime code imports plain constants from
`@cc/content-schema/constants` so Zod never reaches the player's bundle.

**Writing text content:** feed and comment templates in `live.json` may only
use the `{slots}` the client fills for that key (see
`apps/client/src/career/feed.ts`). `feed_network` also appears before the
first fight, so it may use only `{arena}` and `{career}`; `feed_c_generic`
is shown unfilled, so it must have no slots. Banter lines live in
`data/synergies/core.json`, keyed by the attacker's and victim's careers.

## 2. Checks

`pnpm check` = content build → `pnpm lint` → `pnpm typecheck` → `pnpm test`.
It must pass before committing (AGENTS.md rule 7). The tests cover the sim
(determinism, properties, weapons), golden replays, game rules, skills,
commentary, the content compiler and the worker API.

## 3. Golden replays

`packages/sim/test/golden/goldens.json` holds 48 recorded battles across all six
arenas (3v3, 5v5 and free-for-all) with their event hashes. `golden.test.ts` fails when
any battle plays out differently.

- `pnpm replay golden` shows which battles diverged.
- `pnpm golden:update` re-records them after an **intended** change.
- Bump `SIM_VERSION` in `packages/sim/src/types.ts` only when sim **code**
  changed behaviour. Content-only changes just need `golden:update`.
- Content changes that look harmless still diverge replays when they consume
  the sim's random numbers — for example, adding banter pairings adds dice
  rolls.

Other replay tools: `pnpm replay run <input.json>` simulates a saved battle and
prints its report; `pnpm replay events <input.json> [n]` prints its first
`n` events.

## 4. Balance reports

`pnpm balance --battles=400 [--mode=duel_5v5] [--arena=arena.office,arena.diner] [--seed=…] [--strict]`
(or `pnpm balance --bosses [--battles=200]` for the boss table below)
simulates many battles and writes `tools/balance/reports/balance-<mode>.md`
and `.json`: fight length, sim time per battle (p50/p99 against an 80 ms budget),
story moments per battle, and careers winning outside 40–60%. `--strict`
fails when p99 sim time is over budget. After content changes, compare
against a run on the previous commit and put the headline numbers in the PR
(AGENTS.md rule 6). The reports folder is not committed.

`pnpm balance --bosses` plays each ladder boss stage on Normal against a squad
as strong as the previous stage's opponents, and prints the player's win rate
against the boss and against the old generic boss. Bosses are tuned to 30–45%.

## 5. Art pipeline

`tools/art-pipeline` (uses `sharp`) turns painted source art in `art/` into
packed atlases the client imports from `apps/client/src/replay/`. Both the
source art and the generated output are committed, so the game builds without
running the art pipeline. Re-run a step only when its source art changes.

**Output format** (`src/encode.ts`): sprite sheets are quantised to a palette,
then saved as **lossless WebP**, so they keep those exact pixels at about 10%
under the palette PNG. Backdrops are **lossy WebP at quality 70**, 1536 px wide
(fighters cover the floor; 80 cost about 25% more with no visible gain).
Every image is inlined as base64 into the single-file build, so each byte costs
4/3 of a byte there. Keep images small.

Visual rules for new art (palette, outlines, proportions, poses) are in
[`tools/art-pipeline/STYLE_GUIDE.md`](tools/art-pipeline/STYLE_GUIDE.md).

### 5.1 Character puppets

`pnpm --filter @cc/art-pipeline puppets` (all sheets) or `… puppets mime chef` (only these).

- **Source:** `art/sheets/<career>.png`: a posed figure plus the same
  character cut into body parts on a transparent background.
- **Output:** `replay/puppets/<career>.webp` (one atlas per career) and
  `puppets.json` (part rectangles and joint anchors for the ragdoll).
- **Checking:** labelled previews go to `tools/art-pipeline/out/puppets/`.
  When the classifier assigns a blob to the wrong body part, map part names to
  the component numbers shown in the preview in `art/sheets/manifest.json`.
  When two parts touch and come out as one blob (a thigh and its shin), add
  `"split": [[n, fraction]]` to cut component `n` at that fraction of its
  height; the lower piece is numbered 101, 102, … (the chief surgeon uses this).
- **Portraits:** careers without face-sheet heads (the bosses) use the puppet's
  head sprite as their portrait and keep one expression in fights.
- **Gatecrashers (07):** `art/sheets/npc-<persona>.png` (and `-b` for a
  second henchman's look) import as the persona `npc.<persona>`; heads go in
  `art/heads/<expression>/npc-<persona>.png`. The game uses them before the
  career's art. Brief: `art/GATECRASHER_PROMPTS.md`.

### 5.2 Grid puppets (currently unused)

`pnpm --filter @cc/art-pipeline puppets-grid` slices many careers from one
grid sheet (`art/sheets-grid/<sheet>.jpg`, each cell a posed figure plus an
"exploded" figure) into the same per-career atlases. `art/sheets-grid/manifest.json`
is empty: the 30 newer careers were re-imported from separate sheets through
5.1. Env: `TOL` (background key tolerance, default 16), `DBG=<slug>`, `VERBOSE=1`.

### 5.3 Faces

`pnpm --filter @cc/art-pipeline faces`

- **Source:** four emotion sheets (neutral, angry, surprised, hurt):
  `art/faces/*.png` (6 × 6 heads, the original 36 careers in alphabetical
  order) and `art/faces-b/*.jpg` (6 × 5, the newer careers, background keyed out).
- **Output:** `replay/faces/faces.webp` + `faces.json` (`"career.x:emotion"` → rect).
- **Derived frames:** `blink` (eyes painted over) and `talk` (the surprised
  mouth pasted onto the neutral face), where the art allows.
- **Optional variants:** extra pain and shock heads on the same grid:
  - `hurt-2`, `hurt-3`, `hurt-4`, `surprised-2`, `surprised-3` (`.png` in
    `art/faces/`, `.jpg` in `art/faces-b/`). Missing sheets are skipped.
  - Single heads work too, one per career:
    `art/heads/<frame>/<career>.webp`, for example `hurt2/chef.webp`. This
    works for any frame, base emotions included, so careers without a face
    sheet (bosses, the referee) can get faces this way. Reference heads for the
    image agent live in `art/heads/_reference/` and are not imported.
    Underscores in names are fine. This is where the 66 "fun pain" heads
    (`hurt2`) live, stored as quality-92 WebP: 837 KB, against about 6 MB as PNG.
  - They become frames `hurt2`, `surprised2` and so on.
  - In fights, every new hurt or surprised expression picks one of the career's
    variants at random. Fight photos pick one too.
- **Size:** faces are 64 px on their longest side (`FACE_PX`), kept small because the atlas is the largest single image.

### 5.4 Items and obstacles

`pnpm --filter @cc/art-pipeline items` and `pnpm --filter @cc/art-pipeline items obstacles`

- **Source:** `art/items/*.png` (hand-held and throwable props, 4 per row by
  default, 96 px in the atlas) and `art/obstacles/*.png` (machines and large
  props, 3 per row by default, 170 px). Sheets are 2 rows.
- **Names:** item names in reading order live in each folder's `manifest.json`,
  either as a list or as `{ cols, px, names }` for sheets with a different layout.
  A `null` name skips that cell, for art the atlas already has (the hotel's red
  suitcase and the airport umbrella); skipped cells cost no bytes.
- **Output:** `replay/items/items.webp` + `items.json`, and
  `replay/obstacles/obstacles.webp` + `obstacles.json`.
- **Damage states (obstacles):**
  - **Where:** `<arena>-damaged.png` and `<arena>-destroyed.png` sheets name
    their cells `<art>-damaged` and `<art>-destroyed`.
  - **In play:** the renderer swaps to the damaged art at half health. When
    the obstacle breaks it shows the destroyed art flat on the floor, under
    spills and fighters; broken obstacles are already walkable in the sim.
  - **Missing states:** an obstacle without damaged art is tinted as it loses
    health. One without destroyed art squashes flat into a grey heap on the
    same rubble layer; nothing rotates.
  - **Debris sheets:** add `"anchors": true` to a sheet's manifest entry
    when shards or smoke sit between objects. The largest blobs become the
    items and every smaller bit joins the nearest one, instead of cells being
    found from gaps.
  - **Prompts:** `art/obstacles/DAMAGE_SHEET_PROMPTS.md` has the prompts used
    for every arena's sheets; all of them are imported.
- **Real-world sizes (`packages/content/data/furniture.json`):** every piece of
  obstacle art has one size, so it looks the same in every arena and next to
  fighters (about 1900 mm tall).
  - `w` is the drawn width in mm.
  - `fp` is the collision footprint [width, depth]. The sim centres it on the
    arena slot, so a slot can offer art of different sizes.
  - Props drawn from obstacle art (vending machine, freezer, printer, filing
    cabinet, forklift, floor scrubber) use the same `w`.
  - New obstacle art needs an entry here. The content build fails without one.
  - **Size:** destroyed sheets use `px: 130` in the manifest to save space.

### 5.4a Impact effects

- **What:** hits, crits, slashes, zaps, burns, insults, animal bites, pain
  sweat, landing dust, debris, KO stars and parries
  (`apps/client/src/replay/impact-fx.ts`), plus floor dust that builds up
  where bodies land.
- **Art:** one sheet per effect, a single row of animation frames,
  in `art/items/fx-<effect>.png`, with a `{ "grid": [cols, rows], "px", "names" }`
  manifest entry naming the frames `fx-<effect>-1…n`. Grid sheets are cut into
  equal cells kept whole at one scale, so frames stay aligned. Brief, sizes and
  prompts: `art/FX_BRIEF.md`.
- **Fallback:** an effect without art plays a stand-in drawn in code; art
  replaces it as soon as all of its frames are in the atlas.
- **Status loops, ability effects and floor decals:** looping
  `fx-status-<status>-1…4` over a fighter, `fx-explosion`, `fx-dash`, tintable
  `fx-cast-ring` / `fx-cone-blast` / `fx-projectile`, `fx-bolt`, and floor
  decals `fx-rubble-decal-1…3`, `fx-crack-decal-…`, `fx-chips-decal-…`,
  `fx-splat-food-…`, `fx-splat-liquid-…`. The renderer uses each one as soon as
  it is in the atlas, with a stand-in from older art (or a drawing) until then.
  All of them are delivered. Audit, brief and manifest lines: `art/FX_GAPS_BRIEF.md`.
- **Atlas size:** both atlases are 2048 px wide, so they stay well under the
  4096 px texture limit of older phones. Keep an eye on the height when adding sheets.

### 5.4b Hazard fixtures and effects

- **Art:** hazard pieces live in the obstacle atlas (`hazards-a`, `hazards-b`).
  Their effects are in the item atlas (`hazard-fx`: wind, paper, spray, steam,
  dizzy stars, dust), and so are the floor splats (`floor-fx`, named `fx-<area prop>`).
- **Placement:** an arena hazard can carry
  `art: { sprite?, active?, activeTicks?, at, floor?, fx? }`.
  - The renderer stands `sprite` at `at`, or lays it on the rubble layer when
    `floor` is set.
  - It swaps to `active` while the hazard runs, working that out from the
    schedule so it survives seeking.
  - It plays `fx` (`wind`, `spray`, `steam` or `dust`) when the hazard starts.
- **Sizes:** come from `furniture.json`.
- **Gameplay:** hazard actions can also be `wind` (a temporary belt), `spin`
  (fling everyone outward) or `trapdoor` (drop, then re-spawn stunned).
  Patrolling machines (crane hook, trolley train, boulder, gurney) are ordinary
  movers drawn from the obstacle atlas.

### 5.5 Arena backdrops

`pnpm --filter @cc/art-pipeline arenas`

- **Source:** full-size paintings in `art/arenas/<arena>.png`.
- **Output:** `replay/arenas/<arena>.webp`. Floor placement for each painting
  is set in `apps/client/src/replay/arena-art.ts`.
- **Legacy files:** the same command converts any sprite sheet still shipped
  as PNG to WebP and updates `puppets.json`. That step does nothing once
  everything is WebP.

### 5.5b Summoned animals (critters)

`pnpm --filter @cc/art-pipeline critters`

- **Source:** `art/critters/<sheet>.png`, 2 rows × 4 cells of 256 px on a
  transparent background, each animal as pose A (standing) then pose B
  (moving). Names in reading order in `art/critters/manifest.json` (`null`
  skips a cell); pose B is `<name>-b`, and `puff` is the dust cloud.
- **Output:** `replay/critters/critters.webp` + `critters.json`.
- **Size in game:** each summon's `art.heightMm` (`data/summons/`) sets how tall it
  is drawn next to a fighter (about 1800 mm), measured on its standing pose. The
  smallest critters are a little exaggerated so they read on screen. New summons
  need a height; the content build fails without one.
- **Wiring:** a summon's `art.sprite` in `data/summons/` names the sprite.
  Human summons need no art: they use the drawn body in `art.color` holding
  `art.held`.

### 5.6 Art prompts

`pnpm art:prompts` writes `tools/art-pipeline/out/prompts.json`: generation
prompts for every career's paper-doll parts, props and items, sharing the
style preamble so new art matches. Ready-to-paste prompts for the body sheets
still missing are in `art/sheets/BODY_SHEET_PROMPTS.md`.

### Adding an arena

1. **Art:** save the painting as `art/arenas/<arena>.png` (1672 × 941, open
   floor in the middle), obstacles on a sheet in `art/obstacles/` and props on
   a sheet in `art/items/`, each listed in its `manifest.json`. Run `arenas`,
   `items` and `items obstacles`.
2. **Floor:** add the painting to `apps/client/src/replay/arena-art.ts`. The
   `floor` trapezoid is in image fractions: tune it until fighters stand on
   the painted floor in a Sandbox fight.
3. **Content:** `packages/content/data/arenas/<arena>.json`: spawns, props,
   obstacles (art names from the atlas), stations, hazards, sudden death,
   movers, debris and theme. Keep it mirror-symmetric (AGENTS.md). New props
   go in `data/props/`, with a `locales/en.json` name and a sprite mapping in
   `apps/client/src/replay/items.ts` (`PROPS`).
4. **Wiring:** name in `locales/en.json` (`arena.<id>.name`), a song in
   `apps/client/src/replay/music.ts` (keyed by the arena id), a
   `hazard_start_<id>` commentary line per new hazard in `live.json`, and the
   career ladder order in `packages/game-rules/src/skills.ts`. Append new
   arenas to the end of the ladder so existing saves keep their stages.
5. **Checks:** `pnpm check` (fails on the golden content hash: run
   `pnpm golden:update`, which also records 8 fights in the new arena), then
   `pnpm balance --battles=200 --arena=arena.<id>` and compare with the other arenas.

The career ladder gives each arena 4 stages, the last one a boss fight, so the
12 arenas make a 48-stage ladder with 12 bosses.

### Adding or changing a ladder boss

1. **Art:** the boss's sheet goes in `art/sheets/<boss>.png` like any career.
   Run `puppets <boss>` and check the preview.
2. **Content:** the career in `data/careers/bosses.json` (`"boss": true`, tier 3,
   an active, two `extraActives` and a passive), abilities in
   `data/abilities/bosses.json`, a name and description for each in
   `locales/en.json`, and `ab_<ability>` commentary lines in `live.json`.
   Link it from the arena: `"boss": { "career": "career.<boss>", "name": "…" }`.
   Bosses have their own stat budget (12 positive, 9 net) and are never
   offered, recruited or generated.
3. **In the ladder** (`packages/game-rules/src/skills.ts`, `makeBoss`): the
   boss fights with its own career only, with every move and passive unlocked;
   its stat perks follow its rank; it gets 4 stat points per career slot it
   gives up; and it is up to 2 levels above the stage.
4. **Tune** with `pnpm balance --bosses` until the player's win rate is 30–45%.
5. **Entrance:** every match with a boss opens with the boss introduced on
   screen and delivering a random line from `boss_intro_<boss>` in `live.json`
   (12 per boss; the feed line format is `boss_intro_feed`). Bosses are drawn
   twice the size of other fighters (`BOSS_DRAW_SCALE` in the renderer; their
   hitbox is unchanged).

### Adding art for a new career

1. Paint the sheet (see STYLE_GUIDE.md), save it as `art/sheets/<career>.png`,
   run `puppets <career>`, and check the preview.
2. Add the career's heads to the face sheets and run `faces`.
3. Any new props go on an item sheet and into its `manifest.json`; then run `items`.
4. Run `pnpm check` and look at the career in the Sandbox (`pnpm dev:client`, `#/sandbox`).

## 6. Client builds

### 6.1 Hosted build

`pnpm --filter @cc/client build` → `apps/client/dist/`. It is a normal
multi-file site: images are separate files, loaded when a fight or screen
first needs them. For development, `pnpm dev:client` serves the offline
client on http://localhost:5173, and `pnpm dev` also runs the API worker.

**Second page: Crypto Bros** (`docs/career-crash/08-cryptobro.md`).
- **Where:** `apps/client/cryptobro/index.html` (entry `src/cryptobro/main.tsx`)
  builds to `dist-web/cryptobro/index.html`, served at careercrash.org/cryptobro.
  It is a Vite input next to `index.html` (`vite.config.ts`); the single-file
  build leaves it out. The main page's input is named `index`, so its script
  stays `assets/index-*.js` for the release check.
- **Locally:** http://localhost:5173/cryptobro/. Add `?t=2026-10-05T14:37:00Z`
  to pin the floor's clock to any moment (screenshots, a liquidation, a
  circuit breaker); the clock runs on from there.
- **Data:** it fetches `/cryptobro/feed/latest.json` and falls back to the
  sample snapshot in `src/cryptobro/mock-feed.json` (relabelled as the current
  hour) until the hourly feed worker exists.
- **Content:** `packages/content/data/markets/crypto.json` (cast, scoring,
  candle timings, points), text in `live.json` (`market_*`).

**Third page: Diplomatic Incident** (`docs/career-crash/09-diplomatic-incident.md`).
- **Where:** `apps/client/incident/index.html` (entry `src/incident/main.tsx`)
  builds to `dist-web/incident/index.html`, served at careercrash.org/incident.
  Another Vite input (`vite.config.ts`); the single-file build leaves it out.
- **Locally:** http://localhost:5173/incident/. `?c=pl` follows a country,
  `?t=2026-10-06T18:07:30Z` pins the clock (UTC hours divisible by 3 are
  England–Scotland derby hours).
- **Likes:** a seeded sample plus your own (localStorage, one per country per
  hour) until the vote service exists (09 §6).
- **Content:** `packages/content/data/markets/countries.json` (40 delegates,
  power, lobby, derbies), moves in `abilities/incident.json`, derby banter in
  `synergies/derbies.json`, text in `live.json` (`incident_*`). Flags are SVGs
  in `apps/client/src/incident/flags/` (flag-icons, MIT): add the country's
  file there when adding a country.
- **Balance:** `pnpm balance --incident-flat [--sessions=96]` (every delegate
  with the same likes: tune `statBonus` until all are within ±25%) and
  `pnpm balance --incident [--hours=12] [--sessions=6]` (long-tail likes: how
  often the most-liked country wins the hour).
- **Art:** briefs in `art/incident/` (ten pictures per brief). Delegates import
  as `npc-del-<key>` with the usual `puppets` and `faces` commands.

### 6.2 Single-file build

`pnpm --filter @cc/client build:standalone` builds the offline game (career
mode and Sandbox; no server features) with every script, style and image
inlined (`VITE_STANDALONE=1`, see `vite.config.ts`), then
`scripts-standalone.mjs` writes two files to `apps/client/dist-standalone/`:

- `career-crash.html`: a complete HTML document. Open it from disk or send it
  to a phone; it has the viewport meta phones need.
- `career-crash.artifact.html`: the same page without `<html>/<head>`, for
  publishing as a Claude artifact (6.3).

Size is currently about 5.3 MB, most of it images. The artifact limit is 16 MB.

### 6.3 Publishing the single file as a Claude artifact

The game is published as the private claude.ai artifact **Career Crash**
(https://claude.ai/artifact/2xjKeMt4niQSx7P9jYzwg7). It opens in the browser,
including the Claude app's built-in browser, with no download. To update it
from a Claude Code session:

1. `pnpm check`, then `pnpm --filter @cc/client build:standalone`.
2. Open the page once (e.g. with Playwright) and confirm the Sandbox fight and
   career mode run without console errors.
3. Publish `apps/client/dist-standalone/career-crash.artifact.html` to that
   URL with the Artifact tool. Always publish to the existing URL so the link
   stays the same.

The artifact host enforces a strict content security policy: no external
requests. The build already inlines everything; don't add CDN scripts, web
fonts or `fetch()` calls to other hosts to the client.

### 6.4 careercrash.org (Cloudflare Workers)

The offline game is served as a static site by the Worker `career-crash`
(`wrangler.jsonc` in this folder), built by `pnpm build:web`: the same game as
the single file, as normal files, so images download only when needed.

**Branches:**
- **`prod`:** production. Every push deploys careercrash.org.
- **`dev`:** integration. Work lands here, and each push gets a preview URL.
- **Feature branches:** open PRs into `dev`, and get preview URLs too.
- **Releasing:** merge `dev` into `prod`.

**Cloudflare Workers Builds settings** (Workers & Pages → career-crash → Settings → Build):

| Setting | Value |
|---|---|
| Repository | `szymanskijarek/UE-Codex-Tools` |
| Project / Worker name | `career-crash` (must match `name` in `wrangler.jsonc`) |
| Root directory | `career-crash` |
| Production branch | `prod` |
| Build command | `pnpm build:web` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |

Previews can be kept private with Cloudflare Access ("Previews only"). The
custom domains in `wrangler.jsonc` attach careercrash.org and
www.careercrash.org on the first production deploy.

If a build fails at "Cloning" with **root directory not found**, it ran from a
branch without the `career-crash/` folder (for example `main`): check that the
production branch under Settings → Build → Branch control is `prod`.

Check locally before pushing to `prod`: `pnpm check && pnpm build:web &&
npx wrangler deploy --dry-run`.

## 7. API worker

`apps/worker`: Cloudflare Worker (Hono) + D1 database, for the online game
(accounts, roster, matchmaking, server-run battles, shop, leaderboard). It is a
separate Worker, `career-crash-api`, served on **api.careercrash.org**; the site
(6.4) stays a static-assets Worker and calls it cross-origin.

| Piece | Where |
|---|---|
| Config | `apps/worker/wrangler.toml` (always pass `-c wrangler.toml`: otherwise wrangler picks up the site's `wrangler.jsonc` one folder up) |
| Database | D1 `career-crash`, migrations in `apps/worker/migrations/` |
| Allowed browser origins | `ALLOWED_ORIGIN` in `[vars]` (the two careercrash.org addresses) |
| Secrets | `SESSION_SECRET` (required), `TURNSTILE_SECRET` (optional); set in the dashboard, never in git |
| Deploy | `.github/workflows/career-crash-api.yml`: on pushes to `prod` touching the worker or packages, or by hand (Actions → career-crash-api → Run workflow) |

**Local:**
```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars   # then put a long random SESSION_SECRET in it
pnpm --filter @cc/worker db:migrate:local
pnpm dev                     # worker :8787, client :5173 with /api proxied
```
To test the real cross-origin setup, set `ALLOWED_ORIGIN` in `.dev.vars` to
the client's address and build the client with
`VITE_API_URL=http://localhost:8787/api/v1`.

**Deploy by hand** (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the shell):
`pnpm deploy:api` (applies pending D1 migrations, then deploys). Note
`pnpm --filter @cc/worker deploy` without `run` is pnpm's own `deploy`
command, not ours.

### 7.1 Launching the API (one-time)

1. **D1 database:** Cloudflare dashboard → Storage & Databases → D1 → Create →
   name `career-crash`. Copy its Database ID into `database_id` in
   `wrangler.toml` (the id is not a secret) and commit.
2. **API token:** My Profile → API Tokens → Create Token → *Edit Cloudflare
   Workers* template, and add **Account · D1 · Edit**. Zone resources: include
   `careercrash.org` (needed for the api.careercrash.org custom domain).
3. **GitHub secrets:** repo Settings → Secrets and variables → Actions → New
   repository secret: `CLOUDFLARE_API_TOKEN` (the token) and
   `CLOUDFLARE_ACCOUNT_ID` (Workers & Pages overview, right-hand column).
4. **First deploy:** push to `prod` (or run the workflow by hand). The workflow
   skips itself until steps 1 and 3 are done, then migrates, deploys and checks
   that api.careercrash.org answers `401` for a signed-out request.
5. **Session secret:** dashboard → Workers & Pages → `career-crash-api` →
   Settings → Variables and Secrets → Add → type *Secret*, name
   `SESSION_SECRET`, value a long random string (e.g. from a password manager).
   Until it exists, sign-in fails.
6. **Abuse protection (recommended):** Security → WAF → Rate limiting rules:
   limit `POST` to `/api/v1/auth/device` to about 10 per minute per IP.
   Optionally add Turnstile and the `TURNSTILE_SECRET` secret.
7. **Switch the site online:** change the root `build:web` script to run
   `build:web:online` (client built with
   `VITE_API_URL=https://api.careercrash.org/api/v1`) and release through `prod`.
   Check it on a phone: the home screen shows a league and rating instead of the
   offline career.

**Rolling back the online game:** revert step 7 (the site goes back to
offline play); the API can stay deployed.

### 7.2 The Crypto Bros market feed (one-time)

`apps/markets` (Worker `career-crash-markets` on **feed.careercrash.org**,
design: `docs/career-crash/08-cryptobro.md` §10). At the top of every hour
(and again two minutes later if that failed) it fetches the top 40 coins
from CoinGecko, turns them into the hour's snapshot and keeps it in KV for
49 hours. It serves `/crypto/latest.json`, `/crypto/<hour>.json` and
`/crypto/hours.json` to careercrash.org/cryptobro. Until it's live, the page
runs on its sample snapshot and says so in the footer.

1. **KV namespace:** Cloudflare dashboard → Storage & Databases → KV →
   Create → name `career-crash-feed`. Copy its ID into `id` under
   `[[kv_namespaces]]` in `apps/markets/wrangler.toml` (not a secret) and commit.
2. **GitHub secrets:** the same `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` as the API (§7.1 steps 2–3). The token needs
   *Workers Scripts · Edit*, *Workers KV Storage · Edit* and the
   `careercrash.org` zone (for the feed.careercrash.org custom domain); the
   *Edit Cloudflare Workers* template has all three.
3. **First deploy:** push to `prod` (or run the `career-crash-markets` workflow
   by hand). It skips itself until steps 1–2 are done, then tests, deploys, and
   checks that feed.careercrash.org serves a snapshot (the first request fills
   an empty store straight away).
4. **CoinGecko key (needed in practice: keyless calls from Workers get HTTP 429):** a free Demo key as the GitHub repo secret `COINGECKO_KEY`; the deploy copies it into the Worker. Or set it on the Worker directly
   (dashboard → Compute → Workers & Pages → `career-crash-markets` →
   Settings → Variables and Secrets). Without a key the Worker tries the
   keyless API and then CoinPaprika, and `latest.json` says why if both refuse.

**Locally:** `pnpm --filter @cc/markets dev` runs the Worker on
http://localhost:8788 with a local KV; trigger the hourly job with
`curl "http://localhost:8788/__scheduled?cron=0+*+*+*+*"`, then run the
client against it: `VITE_FEED_URL=http://localhost:8788/crypto pnpm dev:client`.

**Balance on real markets:** `pnpm balance --record-markets [--hours=48]`
records recent real hours from CoinGecko into `tools/balance/data/crypto-hours.json`;
`pnpm balance --markets [--hours=48] [--candles=12]` replays them and reports how
often the hour's best coin wins it (target 60–75%); `pnpm balance --markets-flat`
measures each bro's strength in a flat market, which `statBonus` in
`markets/crypto.json` evens out.

## 8. CI

`.github/workflows/career-crash.yml` runs on pushes and PRs that touch
`career-crash/**`: install → content build → lint → typecheck → tests →
golden replay diff → balance smoke run (150 battles, report only, uploaded as
the `balance-report` artifact) → hosted client build. It does not build the
single file, run the art pipeline or deploy.
