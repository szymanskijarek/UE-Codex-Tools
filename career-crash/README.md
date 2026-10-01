# Career Crash

An asynchronous browser auto-brawler: build teams of ordinary people with
extraordinary careers and send them into ridiculous, fully simulated fights.
Design documents: [`../docs/career-crash/`](../docs/career-crash/README.md).

## Quick start

```bash
cd career-crash
pnpm install
pnpm content:build              # compile game content → packages/content/dist/bundle.json

# Play offline: career mode and the Sandbox run in the browser, no server needed
pnpm dev:client                 # http://localhost:5173/#/career  (or #/sandbox)

# Full game (API + client)
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
pnpm --filter @cc/worker db:migrate:local
pnpm dev                        # worker on :8787, client on :5173 (proxied /api)
```

## What's in v0.1

- **Deterministic simulation** (`packages/sim`): integer physics, utility AI
  driven by personality/traits, statuses, tag-based interaction rules, props
  (throw, push, ride, leak, explode), grapples that toss fighters into each other, a knock-out-able referee, hazards,
  patrolling machines (floor scrubber, robot vacuum), duels spread across
  named arena stations, and sudden death. Every battle replays from a ~5 KB
  input record.
- **Content** (`packages/content/data`): 66 careers (58 tier 1, 7 tier 2,
  1 tier 3) plus 12 ladder bosses with their own moves, 272 abilities (incl. 10 grapples/throws), 196 career synergies (banter, including every career against its own job), 6 hidden masteries, 10 personalities, 12 traits,
  43 items, 101 props, 27 interaction rules, 12 arenas (Supermarket, Office,
  Train Station, Diner, Construction Site, Warehouse, Docks, Hotel Lobby,
  Hospital Ward, Museum, Airport, Theatre) on painted backdrops, each with its own chiptune.
- **Commentary**: 21 moment detectors for the battle report, plus a live feed
  (~300 lines: ability-specific jokes, irony, location cuts) and ~180 fighter
  barks.
- **Backend** (`apps/worker`): Cloudflare Worker + D1 — device accounts,
  roster, career milestones & masteries, recruiting, shop, job board, defences,
  opponent matching with bot fill, server-run battles, defence rewards,
  reports, leaderboard, idempotent writes, append-only currency ledger.
- **Client** (`apps/client`): Preact UI + PixiJS replay viewer with animated
  sprite-puppet characters built from sliced career art (32 of 36 careers;
  the rest use paper dolls) with floppy ragdolls (expressions, speech bubbles, reactions), drawn props,
  ability effects, a director camera, slow-motion action replays, synthesised
  sound and Simlish-style babbling voices (6 voice types), battle reports with jump-to-moment, and the Sandbox.
  Each career fight posts a photo on the results screen and at the top of the feed.
  The client picks the best moment, preferring the receiving end (thrown, hurt,
  spooked) over dealing it. The face is set to pained or shocked and never
  mid-blink, and the zoom varies but never goes wider than the default framing. The client
  renders a close-up off screen, and keeps only the latest photo in localStorage
  (`career/photo-moment.ts`, `career/photo.ts`). A standalone
  single-file build (career mode + Sandbox): `pnpm --filter @cc/client build:standalone`.
- **Tooling**: balance reports, replay CLI + 48 golden replays, art prompt
  generator and style guide, character-sheet slicer (`pnpm --filter @cc/art-pipeline puppets`), CI workflow.

## Career mode (v0.9)

Create a fighter, climb the ladder, spend stat and skill points, hire a squad at
Senior rank, and spend fight pay in the Corner Shop: each fighter packs up to 3
items — consumables that fire at kick-off or at low HP, and gear that adds a
little to their stats. Opponents carry items too (03 §3.6). Each of the 12
arenas ends in a boss fight against its own boss (a Store Manager, a CEO, a
Harbour Master…), each with three signature moves and a passive.

## How we work

[`WORKFLOW.md`](WORKFLOW.md): branches (`dev` → `prod` → careercrash.org),
releases and rollbacks, checking a release, bringing in art, tools, Claude Code
setup and troubleshooting. Live at **https://careercrash.org**.

## Pipelines

Content, art, builds, publishing, the API and CI are documented step by step in
[`PIPELINES.md`](PIPELINES.md). Play it without installing anything: the
**Career Crash** artifact (https://claude.ai/artifact/2xjKeMt4niQSx7P9jYzwg7)
runs the single-file build in the browser.

## Checks

```bash
pnpm check                      # content + lint + typecheck + 67 tests
pnpm balance --battles=400      # writes tools/balance/reports/*.md
```
