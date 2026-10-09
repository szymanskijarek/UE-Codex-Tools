# Repo index

A map of where everything is. When asked to "read the docs", read this file first,
then open only the pieces the task needs. Section numbers (§) are stable; line
numbers aren't, so jump with `grep -n '^## 7' <file>`.

Paths are from the repo root. Everything under `career-crash/` and
`docs/career-crash/` is on the **`dev`** branch (from `main`:
`git show origin/dev:INDEX.md`).

**Keep it current:** see "Keeping this index current" in `CLAUDE.md`.

## Projects at a glance

| Project | What | Branch | Code | Design | Live |
|---|---|---|---|---|---|
| Career Crash | Async browser auto-brawler, career mode, Sandbox | `dev` / `prod` | `career-crash/` | `docs/career-crash/00`–`07` | careercrash.org |
| Crypto Bros | Endless hourly brawl of the top-10 coins as crypto bros | same | `career-crash/apps/client/src/cryptobro/`, `apps/markets/` | `docs/career-crash/08-cryptobro.md` | /cryptobro/ |
| Diplomatic Incident | Endless brawl of 40 countries, powered by viewers' likes | same | `career-crash/apps/client/src/incident/`, `apps/votes/` | `docs/career-crash/09-diplomatic-incident.md` | /incident/ |
| Broken News | Weekly news-satire minigames, each opened by two anchors whose desk argument becomes a brawl (block-out, unlisted) | same | `career-crash/apps/client/src/news/` | `docs/career-crash/10-broken-news.md` | /news/ (`noindex`) |
| CV page | Unlisted HTML CV linking the games | same | `career-crash/apps/client/public/jarek-o9bh9e/index.html` | `career-crash/WORKFLOW.md` (Where things live) | /jarek-o9bh9e/ |
| Fine Print | Multiplayer parking-warden browser game (no deps) | `claude/parking-warden-game-3eucn3` only, **not merged** | `parking-warden/` | `parking-warden/README.md`, `docs/DESIGN.md` | — |
| Unreal/Codex tooling | MCP servers and bridges for Unreal Engine | `main` | `Tools/`, `scripts/codex/`, `.mcp.json`, `.codex/` | `docs/codex-tooling/` | — |

Crypto Bros, Diplomatic Incident and Broken News are pages of the same client
and share the sim, renderer, puppets, audio and content bundle with Career Crash.

## Career Crash: process docs (`career-crash/`)

| File | Read it for |
|---|---|
| `AGENTS.md` | Package map, the 7 standing rules (determinism, goldens, no numbers in TS…), common tasks (add a career / prop / arena / endpoint), commands |
| `WORKFLOW.md` | Where things live (hosts, workers, artifact), Branches and releases, Everyday loop, Checking a release, Bringing in new art, Adding content, Search and link previews, Tools, Claude Code setup, Troubleshooting, Settings checklist, Next milestones |
| `PIPELINES.md` | Pipeline table at the top; §1 content build, §2 checks, §3 goldens, §4 balance, §5 art (intro: new art starts as a brief; 5.1 puppets, 5.3 faces, 5.4 items/obstacles, 5.4a impact FX, 5.4b hazards, 5.5 arenas, 5.5b critters, 5.6 prompts; adding an arena / boss / career art), §6 client builds (6.1 hosted, 6.2 single file, 6.3 Claude artifact, 6.4 careercrash.org), §7 API worker (7.1 API launch, 7.2 Crypto Bros feed, 7.3 vote service), §8 CI |
| `README.md` | Feature summary with content counts, career mode, quick start |

## Career Crash: design docs (`docs/career-crash/`)

`README.md` there: doc table, precedence (01/02/03 > 00; 04 only sequences), key decisions.

| Doc | Sections worth jumping to |
|---|---|
| `00-game-design-v0.1.md` | Vision, pillars, loop, careers, masteries, art direction |
| `01-technical-specification.md` | §2 repo layout, §3 client/renderer, **§4 determinism** (4.1 sim rules, 4.4 replays), §5 content system (5.2 tags, 5.3 schemas), §6 backend (6.3 D1 model, 6.4 API, 6.5 anti-cheat), §7 testing, §8 perf budgets |
| `02-combat-systems.md` | §3 stats, §4 tick pipeline, §5 actions/damage/statuses (5.2c weapons, 5.6 grapples), §6 AI (utility scoring, personalities, 6.7 stations/duels), §7 props/rules/hazards/destruction/referee, §8 careers/synergies/grudges, **§9 power budgets**, §10 win/sudden death, §11 commentary/detectors |
| `03-economy-design.md` | §2 currencies, §3 progression (3.4 ranks/skill trees, 3.5 offline career mode, 3.6 fight pay/shop/loadouts), §4 unlocks, §5 PvP rating/leagues, §6 monetisation (cosmetic only), §8 sources/sinks |
| `04-ai-agent-roadmap.md` | §0 implementation status, §1 agent task contract, §2 phases, §5 open questions |
| `05-summons-and-senior-moves.md` | §3 summon rules (fears, panic), §4 summon list, §5 every career's new move, §6b as built, §7 art needed |
| `06-personnel-files-and-garden-leave.md` | §2 staff/Garden Leave, §3 HR notes (conditions, budget), §4 reveal and scowl |
| `07-gatecrashers.md` | §2 when, §3 the 24 sets, §4 strength, §5 sim, §7 posts, §8 content rules, §10 Sandbox |

## Crypto Bros

| What | Where |
|---|---|
| Design | `docs/career-crash/08-cryptobro.md`: §2 page, §3 the hour, §4 endless mode/candles, §5 market data → power, §6 scene events, §7 liquidation, §8 cast, §10 data feed, §11 code map, **§15 as built + "Not yet"** |
| Page | entry `career-crash/apps/client/cryptobro/index.html`; code `apps/client/src/cryptobro/` (`main.tsx`, `Floor.tsx`, `feed.ts`, `past.ts` rewind, `mock-feed.json`) |
| Scoring, snapshots | `packages/game-rules/src/markets.ts`, `coingecko.ts` |
| Content | `packages/content/data/markets/crypto.json` (cast, voices, events, regulators), `abilities/cryptobro.json`, `arenas/trading-floor.json`, `crashers/core.json` (Regulators), text in `live.json` |
| Sim | endless mode: `packages/sim/src/systems/endless.ts` |
| Feed worker | `apps/markets/src/index.ts` (feed.careercrash.org, KV); launch `PIPELINES.md` §7.2; CI `.github/workflows/career-crash-markets.yml` |
| Balance | `tools/balance/src/markets.ts`, `record-markets.ts`; `pnpm balance --markets` / `--markets-flat` |
| Career feed link | `apps/client/src/career/feed.ts` (`bro_post_*`) |
| Art | `career-crash/art/cryptobro/README.md` (briefs 01–11, all delivered) |

## Diplomatic Incident

| What | Where |
|---|---|
| Design | `docs/career-crash/09-diplomatic-incident.md`: §2 page, §4 floor/lobby queue, §5 likes → power, §6 vote service (6.3 anti-abuse, 6.4 privacy), §7 scene events, **§7.2 Institutions** (gatecrashers), §8 sharing features, §9 cast and content rules (9.4 hard rules), §11 balance, §12 phases, §13 owner decisions, **§14 as built + "Not yet"** |
| Page | entry `career-crash/apps/client/incident/index.html`; code `apps/client/src/incident/` (`main.tsx`, `Hall.tsx`, `countries.ts`, `likes.ts` like pipe, `pow.ts` hashcash, `past.ts`, `flags/`) |
| Likes → power, sessions | `packages/game-rules/src/incident.ts` (reuses `markets.ts`) |
| Nationality boost in career mode | `game-rules/src/nationality.ts`, `apps/client/src/career/nation.ts`, `economy.json` → `nationality` |
| Content | `packages/content/data/markets/countries.json` (40 delegates, derbies, institutions config), `abilities/incident.json`, `abilities/institutions.json`, `crashers/institutions.json`, `props/incident.json`, barks in `live.json` |
| Sim | lobby/seats/walk-on: `systems/endless.ts`; institutions: `systems/crashers.ts` |
| Vote service | `apps/votes/src/` (`index.ts`, `ledger.ts`, `token.ts`), shapes `packages/protocol/src/votes.ts`; launch `PIPELINES.md` §7.3; CI `.github/workflows/career-crash-votes.yml` |
| Balance | `tools/balance/src/incident.ts`; `pnpm balance --incident` / `--incident-flat` |
| Art | `career-crash/art/incident/README.md` (status line, briefs 01–13, how to portray countries) |

## Broken News

| What | Where |
|---|---|
| Design | `docs/career-crash/10-broken-news.md`: §2 the segment (2.1 heat, 2.2 score), §3 cast and studio (3.4 what BSN stands for), §4 episode script format and checks (4.3 the real story, 4.4 comic timing), §5 minigame contract, §6 weekly pipeline, **§7 content rules for real news**, §10 as built + "Not yet", §11 owner decisions, §12 feed ads, §13 field reports (plan) |
| Page | entry `career-crash/apps/client/news/index.html`; code `apps/client/src/news/` (`Studio.tsx` segment player, `episode.ts` format/timeline/checks, `cast.ts`, `episodes/*.json`, `minigames/`) |
| Feed ads | `promotedPosts` in `apps/client/src/career/feed.ts` (`news_ad`, `news_ad_link` in `live.json`), placed in `Hub.tsx` |
| Test | `apps/client/test/news-episode.test.ts` |
| Art | `career-crash/art/news/README.md` (briefs 01–08: desk shot, anchors, studio arena, guests, page, field reporters, locations, episode guests) |

## Career Crash: code map (`career-crash/`)

| Area | Where |
|---|---|
| Client shell, routes (`#/career`, `#/sandbox`, `#/lab`, `#/privacy`…) | `apps/client/src/app.tsx`, `main.tsx`, `state.ts`, `i18n.ts` |
| Career mode | `apps/client/src/career/` (Hub, Shop, Squad, Skills, File = personnel file, `feed.ts`, `photo*.ts`) |
| Screens | `apps/client/src/screens/` (Sandbox, Fight, Replay, Reports, Office, Lab…) |
| Replay renderer | `apps/client/src/replay/` (`renderer.ts`, `puppet.ts`, `ragdoll.ts`, `audio.ts`, `music.ts`, `voices.ts`, `impact-fx.ts`) |
| Sliced art output | `apps/client/src/replay/{puppets,faces,items,obstacles,arenas,critters}/` |
| Site worker (careercrash.org) | `apps/client/src/site-worker.ts`, `wrangler.jsonc`; static extras in `apps/client/public/` |
| Simulation | `packages/sim/src/` (`world.ts`, `simulate.ts`, `types.ts` with `SIM_VERSION`; `systems/` ai, actions, effects, environment, summons, crashers, weapons, destruction, endless) |
| Rules and progression | `packages/game-rules/src/` (`character.ts`, `progression.ts`, `skills.ts`, `hr.ts`, `loot.ts`, `crashers.ts`, `economy.ts`) |
| Content (all gameplay numbers) | `packages/content/data/` (abilities, careers, arenas, props, rules, statuses, summons, crashers, hrNotes, synergies, equipment, shopItems, `economy.json`, `live.json`, `tags.json`, `locales/en.json`) |
| Schemas / compiler | `packages/content-schema/src/`, `packages/content-compiler/src/` |
| Commentary | `packages/commentary/src/` |
| API | `apps/worker/src/` (`app.ts` routes, `repo.ts` D1), types `packages/protocol/src/` |
| Tools | `tools/balance/src/`, `tools/replay-cli/src/`, `tools/art-pipeline/src/` |
| Tests | `packages/*/test/`, goldens `packages/sim/test/golden/` |
| CI | `.github/workflows/career-crash.yml` (+ `-api`, `-markets`, `-votes`) |

## Art (`career-crash/art/`)

| What | Where |
|---|---|
| Sheet manifests (slicer overrides, `cut`, `cutX`) | `art/sheets/manifest.json`, `art/items/`, `art/obstacles/`, `art/critters/`, `art/sheets-grid/` `manifest.json` |
| Source folders | `sheets/` (bodies), `heads/`, `faces/`, `faces-b/`, `items/`, `obstacles/`, `arenas/`, `critters/`, `ui/` |
| Slicer previews | `tools/art-pipeline/out/` |
| Briefs (style template: `FX_BRIEF.md`; rule: new art starts as a brief, `PIPELINES.md` §5) | `ART_BRIEF.md` (open gaps), `CHARACTER_PROMPTS.md`, `FX_BRIEF.md`, `FX_GAPS_BRIEF.md`, `GATECRASHER_PROMPTS.md`, `PERSONNEL_FILE_PROMPTS.md`, `sheets/BODY_SHEET_PROMPTS.md`, `cryptobro/`, `incident/`, `news/` |

## Unreal/Codex tooling (`main`)

| What | Where |
|---|---|
| Overview | `README.md` |
| Setup, env vars, smoke test | `docs/codex-tooling/SETUP.md` |
| MCP servers and `.mcp.json` | `docs/codex-tooling/MCP_SERVERS.md` |
| Bridge layout, Unreal Python helpers | `docs/codex-tooling/UNREAL_BRIDGE.md` |
| Servers | `Tools/blueprint-mcp/`, `Tools/ue-llm-mcp-bridge/`, `Tools/unreal-analyzer-mcp/`, `Tools/unreal/python/` |
| Scripts | `scripts/codex/` |

## Open branches with unmerged work (as of 9 Oct 2026)

| Branch | What |
|---|---|
| `claude/parking-warden-game-3eucn3` | Fine Print (3 commits) |
| `ccr-cb65c9d3-ha0iml` | "Quieter speech bubbles on phones" (1 commit) |
| `ccr-0ed8c867-87djp3` | "Routing notes on the game branch too; refresh the art to-do list" (1 commit) |
