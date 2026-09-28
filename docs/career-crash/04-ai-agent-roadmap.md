# Career Crash — AI-Agent Implementation Roadmap (v0.1)

Status: draft. This document **sequences** work defined in 01–03. It never
redefines behaviour; if a task needs a rule that isn't specified, the agent
stops and proposes a doc change first.

---

## 0. Status (v0.1 implementation)

Code lives in [`career-crash/`](../../career-crash/README.md). Implemented in the first pass:

| Phase | State |
|---|---|
| 0 Foundations | ✅ monorepo, strict TS, ESLint determinism + boundary rules, CI workflow, `AGENTS.md` |
| 1 Deterministic core | ✅ integer math, sfc32 + forks, world/hash, 12-phase tick loop, physics, nav A*, golden harness + replay CLI (cross-runtime job: Node only so far) |
| 2 Content pipeline | ✅ schemas, compiler (refs, tags, budgets, locale), 28 careers, 64 abilities, 38 props, 26 rules, 2 arenas |
| 3 Combat | ✅ B-1…B-12 (balance tool reports duration, outliers, story density, perf) |
| 4 Replay + commentary | ✅ Pixi viewer with placeholder paper dolls, 19 detectors, report screen, Sandbox — **Gate 3 ("is it funny?") is next for a human** |
| 5 Backend + loop | ✅ K-1…K-9 on D1 (K-10 immutable R2 bundles: not yet — old replays currently need the same content hash) |
| 6 Depth | ◐ masteries + discoveries, traits, relationships, job board, 5v5 done; leagues/seasons cron, economy simulator, Hall of Fame not yet |
| 7 Art pipeline | ◐ style guide + prompt generator; generated assets not yet |
| 8 Launch | ☐ |

Latest balance run (1,500 × 3v3, sim 0.3.0): median 54 s, ~4 % timeouts, p99 sim ≈ 85–97 ms on the dev container, 2.3 story moments/battle; all 28 tier-1 careers within 40–60 % except Farmer (62 %, trimmed afterwards).

v0.3 additions: 36 careers (Barista, Hairdresser, Lifeguard, Personal Trainer, Gardener, Mime, Conspiracy Podcaster, Astronaut), 124 abilities, 6 masteries; stations + duels (02 §6.7); movers (floor scrubber, robot vacuum) and new arena events (02 §7.4); client: director camera, slow-motion action replays of KOs/explosions/run-overs with zoom lens and pitched-down audio, intent and job icons, floor signage, contextual live commentary (ability-specific jokes, irony, location cuts).

v0.4 additions: grapples and throws (`toss` effect, Airborne status, body-to-body collisions, landings; 02 §5.6) with 10 new grapple abilities; 95 career synergies — profession-vs-profession banter lines with behavioural effects (02 §8.1.1); client: Verlet ragdolls for thrown/knocked-down/KO'd characters, grab/landing/banter reactions, action replays of big throws and body hits.

---

## 1. How agents work on this project

### 1.1 Task contract

Every task handed to a coding agent has this shape (copy into the issue/prompt):

```
Task:        <id> <title>
Owns:        <packages/paths the agent may change>
Reads:       <doc sections that define the behaviour>
Interfaces:  <types/functions that must exist when done>
Done when:   <commands that must pass + observable result>
Out of scope:<explicitly excluded things>
```

Tasks are sized so one agent session can finish, test and commit them:
roughly **≤ 600 lines of non-test code** and **one package** (two at most when
the second is only an interface consumer).

### 1.2 Standing rules (put these in the repo's `AGENTS.md` / `CLAUDE.md`)

1. Read the owning design doc section before changing a system.
2. `packages/sim` obeys the determinism contract (01 §4). Lint enforces it;
   never disable those lint rules.
3. Never edit golden replay hashes to make tests pass. If a golden changes,
   explain *why* in the commit and bump `simVersion`.
4. Content changes go through `pnpm content:build`; never hand-edit a
   compiled bundle.
5. Every new effect type, quirk, component or event type needs: schema,
   implementation, unit test, one content example using it.
6. No gameplay constants in TypeScript. If a number affects balance, it lives
   in `content/`.
7. Keep PRs to one task. Update the relevant doc in the same PR if behaviour
   was clarified.
8. `pnpm check` (lint + typecheck + test + content build) must pass before commit.

### 1.3 Human checkpoints

Agents can run autonomously within a phase. A human reviews at each
**milestone gate** (✅ below): watches replays, reads battle reports, plays
the loop. "Is it funny?" is not automatable — but §02 §11.4 story-density
metrics make it measurable enough to steer between gates.

---

## 2. Phases

Durations assume one agent working with a human reviewing at gates; tasks
within a phase marked ∥ can run in parallel.

### Phase 0 — Foundations (week 1)

| ID | Task | Owns | Done when |
|---|---|---|---|
| F-1 | Monorepo scaffold: pnpm workspace, TS strict, ESLint, Prettier, Vitest, CI workflow running `pnpm check` | root | CI green on empty packages |
| F-2 | Dependency-boundary lint (01 §2) and determinism lint rules (01 §4.1 banned globals) | root, `packages/sim` | A test file using `Math.random` in `sim` fails lint |
| F-3 ∥ | `AGENTS.md` with §1.2 rules and package map | root | — |

✅ **Gate 0:** repo skeleton reviewed.

### Phase 1 — Deterministic core (weeks 2–3)

| ID | Task | Owns | Done when |
|---|---|---|---|
| S-1 | Fixed-point math: `idiv`, `isqrt`, angle LUT sin/cos, vector ops | `sim/core` | Property tests vs float reference within tolerance; no floats in outputs |
| S-2 | `sfc32` PRNG with `fork(label)`, serialization | `sim/core` | Known-answer tests; fork independence test |
| S-3 | World state, entity store (sorted by id), canonical serializer, FNV-1a hash | `sim/core` | Hash stable across 2 runs and after serialize→deserialize |
| S-4 | Tick loop skeleton with the 12 phases (02 §4) as no-op systems; `simulate()` entry | `sim` | Empty battle runs 2,400 ticks, deterministic hash |
| S-5 | Movement + collision (circles, AABB), knockback, `z` gravity | `sim/systems` | Unit tests; two bodies never overlap > 1 tick |
| S-6 | Nav grid + A* + soft-blocked cells | `sim/systems` | Path tests on fixture arenas |
| S-7 | Golden-replay harness + `tools/replay-cli run/diff` | `sim/test`, `tools/replay-cli` | Divergence reports the first differing 100-tick window |
| S-8 | Cross-runtime determinism job (Node + headless Chromium) | CI | Same goldens pass in both |

✅ **Gate 1:** dots moving around a box deterministically, in two runtimes.

### Phase 2 — Content pipeline (weeks 3–4, overlaps Phase 1)

| ID | Task | Owns | Done when |
|---|---|---|---|
| C-1 | Zod schemas for tags, stats, careers, abilities, effects, statuses, props, rules, arenas, personalities, traits, equipment, locale | `content-schema` | Generated JSON Schema + TS types exported |
| C-2 | Content compiler: validate, resolve refs, budgets (02 §9), locale/art checks, emit hashed bundle | `content-compiler` | Invalid fixtures each produce the specific expected error |
| C-3 ∥ | Seed content: 20 tier-1 careers, 10 personalities, 12 statuses, ~40 rules, 25 props, 15 equipment, 1 arena (Supermarket) | `content` | `pnpm content:build` green |

### Phase 3 — Combat (weeks 4–7)

| ID | Task | Owns | Done when |
|---|---|---|---|
| B-1 | Stats → derived values (02 §3) | `sim/systems/stats` | Table-driven tests |
| B-2 | Actions: basic attack, damage formula, crits, downed/revive/KO | `sim/systems/combat` | Unit tests per 02 §5 |
| B-3 | Abilities + effect executor (closed effect set) | `sim/systems/abilities` | Each effect type has a test + content example |
| B-4 | Statuses (durations, stacking, periodic, tag grants) | `sim/systems/status` | — |
| B-5 | Props & components: carry, throw, push, ride, health/break | `sim/systems/props` | — |
| B-6 | Interaction rule engine: event index, tag match, priority, 3-round cascade | `sim/systems/rules` | Fire-spread + water-electric fixtures behave per 02 §7.3 |
| B-7 | Spills, zones, hazards, movers, sudden death | `sim/systems/environment` | Battles always end ≤ 2,400 ticks (property test, 1,000 seeds) |
| B-8 | Utility AI: candidates, considerations, goals, personality weights, noise, commitment | `sim/systems/ai` | Scenario tests: Coward retreats at low morale; Helpful revives; Chaotic pushes props into crowds |
| B-9 | Morale, panic, friendly fire | `sim/systems/morale` | — |
| B-10 | Referee NPC: fouls, cards, KO → early sudden death | `sim/systems/referee` | — |
| B-11 | Event log with cause chains | `sim/events` | Every KO has a cause chain |
| B-12 | Balance tool v1: mass sim, win rates by career/personality, duration histogram, perf p50/p99 | `tools/balance` | Report in markdown + JSON |

✅ **Gate 2:** balance report within targets (no career outside 40–60% at
equal power, median duration 60–90 s, p99 sim time < 80 ms). Human reads 20
raw event logs.

### Phase 4 — Replay viewer and commentary (weeks 7–9)

| ID | Task | Owns | Done when |
|---|---|---|---|
| R-1 | Client scaffold: Vite + Preact + routing + signals store | `apps/client` | Loads, lints, Playwright smoke |
| R-2 | Sim-in-Web-Worker playback buffer + interpolation + speed controls | `client/replay` | Replays a golden at 1×/2×/4×; hash verified |
| R-3 | Pixi renderer with **placeholder art** (coloured circles + labels + prop rectangles), status icons, VFX stubs | `client/render` | Gate-able visual of any battle |
| R-4 | Commentary package: detectors, templates, deterministic selection, report model | `packages/commentary` | Same battle → identical report; story-density metric emitted to balance tool |
| R-5 | Battle report screen with jump-to-tick highlights | `client/screens` | — |

✅ **Gate 3 — "Is it funny?"** Humans watch 30 replays with placeholder art
and read the reports. Tune rules/personalities before building backend.
This is the most important gate; do not skip it.

### Phase 5 — Backend and the async loop (weeks 9–12)

| ID | Task | Owns | Done when |
|---|---|---|---|
| K-1 | Worker scaffold (Hono), `protocol` types, error model, idempotency middleware | `apps/worker`, `protocol` | `wrangler dev` + API tests |
| K-2 | D1 migrations (01 §6.3), repository layer, ledger with invariant check | `worker/db` | Ledger property test: balance == sum |
| K-3 | Auth: device accounts + Turnstile + session tokens | `worker/auth` | — |
| K-4 | `game-rules`: XP, milestones, rewards, rating, opponent selection (03) | `packages/game-rules` | Table tests from 03 numbers |
| K-5 | Characters, careers (milestone offers), equipment, recruiting endpoints | `worker/routes` | — |
| K-6 | Defence upload/freeze; opponents endpoint incl. ghost defences | `worker/routes` | — |
| K-7 | Attack endpoint: server-run sim, record, rewards, rating in one batch | `worker/routes` | Replays fetched by client verify their hash |
| K-8 | Offline settlement + "while you were away" summary | `worker/routes`, `game-rules` | Idempotent per window |
| K-9 | Client screens: Home/summary, Roster, Character, Career pick, Loadout, Opponents | `apps/client` | Playwright: sign up → pick career → attack → watch replay → report |
| K-10 | R2 immutable hosting of content bundles and sim builds; old-replay loader | `worker`, `client` | A replay from previous `simVersion` still plays |

✅ **Gate 4:** internal alpha. The full 5-minute loop works end to end.

### Phase 6 — Depth (weeks 12–16)

| ID | Task |
|---|---|
| D-1 | Masteries engine + discovery tracking + collection screen |
| D-2 | Post-battle trait earning + relationships (rival/nemesis/friend) |
| D-3 | Leagues, seasons, season rewards (cron) |
| D-4 | Job Board, rumours, achievement-unlocked careers |
| D-5 | 5v5 mode unlock; second and third arenas (Office, Construction Site) |
| D-6 | Economy simulator (03 §9) in nightly CI |
| D-7 | Hall of Fame, retirement, mentor traits |

### Phase 7 — Art pipeline (parallel from Phase 4)

| ID | Task |
|---|---|
| A-1 | Style guide doc: palette, outline weight, head:body ratio (≈ 1:1.4), lighting, reference sheet |
| A-2 | Paper-doll rig spec: part slots (body, head, hair, face, hat, upper, lower, shoes, accessory, held item), pivot points, 8 animation poses shared by all parts |
| A-3 | Prompt templates per part type + consistency checks (silhouette, palette quantization, outline detection) in `tools/art-pipeline` |
| A-4 | Atlas packer + art manifest validated by the content compiler |
| A-5 | Replace placeholders: 20 career outfits, 25 props, Supermarket tiles, status/ability icons |
| A-6 | Portrait generator (composited from the paper-doll) + mastery frames |

Rule: **generated art is never referenced by a raw filename in code** — only
by art ids in content, resolved through the manifest, so any asset can be
regenerated without code changes.

### Phase 8 — Launch readiness (weeks 16–20)

Events (FFA, King of the Hill, Boss via Durable Object), cosmetic shop and
Gold Stars (with the 03 §6 structural tests), rate limits, telemetry,
performance budgets (01 §8) enforced in CI, content to ~100 careers and 6 arenas.

✅ **Gate 5:** closed beta.

---

## 3. Scaling content with agents

Once Phase 5 is done, most new content is a **content-only task**:

```
Task:      Add career "career.dentist"
Owns:      packages/content/careers/dentist.json, locales/en.json, art manifest entry
Reads:     01 §5.3 Career, 02 §9 budgets, existing careers with role:medical
Done when: pnpm content:build green; balance run shows dentist win rate 40–60%;
           ≥ 1 new interaction with existing tags (e.g. "numbing gel" → Stunned)
Out of scope: any .ts file
```

If an agent finds a career can't be expressed without new code, the output is
a proposal for a new **effect type, quirk, or component** (general-purpose,
with ≥ 3 intended uses) — not a career-specific special case.

Throughput target after launch: 10 careers, 1–2 masteries, 1 arena per month,
each shipped with its balance report.

---

## 4. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Determinism breaks across browsers/runtimes | Integer-only sim, lint bans, cross-runtime CI (S-8), per-100-tick hashes to localize bugs. |
| Battles are chaotic but not *funny* | Gate 3 before any backend work; story-density metrics; tune rules, not code. |
| Emergent systems produce degenerate strategies (e.g. all-Electrician + water) | Nightly balance run with team-composition search; rules have counters by design (foam, rubber boots). |
| Rule cascades explode CPU | 3-round cascade cap, entity cap 256, perf p99 gate. |
| Old replays stop working after content updates | Immutable bundles/sim builds on R2 keyed by hash/version (K-10). |
| AI art inconsistency | Paper-doll parts on shared rig, automated style checks, regeneration through ids. |
| Agents invent architecture | Task contract (§1.1), doc precedence, "stop and propose" rule. |
| Thin PvP pool at launch | Ghost defences (03 §5.2), PvE ladder of curated teams. |

---

## 5. Open questions (decide before the phase that needs them)

1. Account system beyond device accounts: email magic link vs OAuth only? (Phase 5)
2. Can players share replays publicly by link, and are names moderated? (Phase 5)
3. Localisation targets for launch (EN only?) — affects commentary template volume. (Phase 6)
4. Audio direction and whether commentary is ever voiced. (Phase 7)
5. Final title (currently "Career Crash"). (Phase 8)
