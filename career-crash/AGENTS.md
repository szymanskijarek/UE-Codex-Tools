# Career Crash — guide for coding agents

Read this before changing anything. Design docs live in `../docs/career-crash/`
(00 GDD, 01 technical spec, 02 combat, 03 economy, 04 roadmap). When code and
docs disagree, fix one of them in the same change.

## Package map

| Path | What | May depend on |
|---|---|---|
| `packages/content-schema` | Zod schemas + types for all content | zod |
| `packages/content/data` | **All gameplay content** (JSON). No TS here. | — |
| `packages/content-compiler` | Validates content, emits `packages/content/dist/bundle.json` | content-schema, sim (hash) |
| `packages/sim` | Deterministic battle simulation | content-schema **only** |
| `packages/commentary` | Event log → battle report | sim, content-schema |
| `packages/game-rules` | XP, careers, traits, rating, rewards, bots | sim, content-schema |
| `packages/protocol` | API request/response types | the above (types only) |
| `apps/worker` | Cloudflare Worker API (Hono + D1) | everything above |
| `apps/client` | Vite + Preact UI, PixiJS replay viewer | everything above |
| `tools/balance` | Mass simulation reports | sim, game-rules, commentary |
| `tools/replay-cli` | Run/inspect battles, golden replays | sim, commentary |
| `tools/art-pipeline` | Style guide + generation prompts | content |

## Standing rules

1. **Determinism (01 §4).** `packages/sim` uses integers only, one seeded PRNG
   (`world.rng` / `aiRng` / `envRng`), no `Date`, `Math.random`, trig, or
   comparator-less `sort()`. ESLint enforces this — never disable those rules.
2. **Golden replays.** If `pnpm test` fails in `golden.test.ts`, behaviour changed.
   Run `pnpm replay golden` to see which battles diverged. If the change is
   intended run `pnpm golden:update`, and bump `SIM_VERSION`
   (`packages/sim/src/types.ts`) when sim code (not just content) changed.
3. **No gameplay numbers in TypeScript.** Damage, costs, cooldowns, XP curves,
   rewards live in `packages/content/data`. The only constants in sim code are
   engine-level (tick rate, gravity, stat → derived formulas in `world.ts`).
4. **Content changes** go through `pnpm content:build` (it checks references,
   tag vocabulary, stat budgets, locale keys). New tags must be declared in
   `data/tags.json`; every id needs `locales/en.json` `<id>.name`.
5. **New engine concepts** (effect type, status flag, prop component, quirk,
   detector kind) need: schema change, implementation, a unit/property test and
   at least one content example. Prefer general mechanics with ≥ 3 uses over
   career-specific special cases.
6. **Balance.** After changing content run `pnpm balance --battles=400` and
   include the headline numbers (duration, outliers, story density, p99) in
   the PR description.
7. `pnpm check` must pass before committing.

## Common tasks

- **Add a career:** add abilities to `data/abilities/*.json`, the career to
  `data/careers/*.json` (respect the budget in 02 §9), at least two HR notes to
  `data/hrNotes/` (06 §3; the content build fails without them), names/descriptions to
  `data/locales/en.json`, then `pnpm content:build && pnpm golden:update && pnpm balance`.
- **Add a prop or interaction:** props in `data/props/*.json`, rules in
  `data/rules/core.json`. Contact rules are matched by tags on both sides;
  keep them bounded (status with `stacking: "ignore"` rather than spawning
  props that re-trigger the rule).
- **Add an arena:** `data/arenas/<name>.json` (walls, spawns, props, hazards,
  sudden death). Arenas must stay symmetric for fairness.
- **Add an API endpoint:** types in `packages/protocol`, route in
  `apps/worker/src/app.ts`, test in `apps/worker/test/api.test.ts`.

## Workflow

[`WORKFLOW.md`](WORKFLOW.md) covers branches and releases (`prod` is live on
careercrash.org; work lands on `dev`), how to check a release, art intake, and
the tools and skills to use. Never deploy from `main`: it doesn't contain the game.

## Pipelines

[`PIPELINES.md`](PIPELINES.md) documents every pipeline: content build, checks,
golden replays, balance, each art-pipeline step, both client builds,
publishing the Career Crash artifact, the API worker and CI. Update it in the
same change whenever you add or change a pipeline.

## Commands

```
pnpm install
pnpm check            # content build + lint + typecheck + tests
pnpm dev              # worker (8787) + client (5173); needs apps/worker/.dev.vars
pnpm dev:client       # client only — the Sandbox works without a server
pnpm balance --battles=400 [--mode=duel_5v5]
pnpm replay run <input.json> | pnpm replay golden [--update]
pnpm --filter @cc/client build:standalone   # single file → apps/client/dist-standalone/
pnpm --filter @cc/art-pipeline <puppets|faces|items|items obstacles|arenas|puppets-grid|prompts>
```
