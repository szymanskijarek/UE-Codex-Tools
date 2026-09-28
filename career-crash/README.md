# Career Crash

An asynchronous browser auto-brawler: build teams of ordinary people with
extraordinary careers and send them into ridiculous, fully simulated fights.
Design documents: [`../docs/career-crash/`](../docs/career-crash/README.md).

## Quick start

```bash
cd career-crash
pnpm install
pnpm content:build              # compile game content → packages/content/dist/bundle.json

# Play offline: the Sandbox runs battles in the browser, no server needed
pnpm dev:client                 # http://localhost:5173/#/sandbox

# Full game (API + client)
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
pnpm --filter @cc/worker db:migrate:local
pnpm dev                        # worker on :8787, client on :5173 (proxied /api)
```

## What's in v0.1

- **Deterministic simulation** (`packages/sim`): integer physics, utility AI
  driven by personality/traits, statuses, tag-based interaction rules, props
  (throw, push, ride, leak, explode), a knock-out-able referee, hazards and
  sudden death. Every battle replays from a ~5 KB input record.
- **Content** (`packages/content/data`): 28 careers (22 tier 1, 6 tier 2),
  64 abilities, 4 hidden masteries, 10 personalities, 12 traits, 36 items,
  38 props, 26 interaction rules, 2 arenas (Supermarket, Office).
- **Commentary**: 19 moment detectors turn the event log into a battle report.
- **Backend** (`apps/worker`): Cloudflare Worker + D1 — device accounts,
  roster, career milestones & masteries, recruiting, shop, job board, defences,
  opponent matching with bot fill, server-run battles, defence rewards,
  reports, leaderboard, idempotent writes, append-only currency ledger.
- **Client** (`apps/client`): Preact UI + PixiJS replay viewer with placeholder
  paper-doll art, battle reports with jump-to-moment, and the Sandbox.
- **Tooling**: balance reports, replay CLI + 16 golden replays, art prompt
  generator and style guide, CI workflow.

## Checks

```bash
pnpm check                      # content + lint + typecheck + 64 tests
pnpm balance --battles=400      # writes tools/balance/reports/*.md
```
