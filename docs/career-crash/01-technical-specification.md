# Career Crash — Technical Specification (v0.1)

Status: draft for implementation. Owner of: repository layout, runtime
boundaries, determinism, content schemas, persistence, API, security.

---

## 1. Goals and non-goals

**Goals**

- One simulation package that runs identically in a Cloudflare Worker, in the
  browser, and in Node (tests, balance tools).
- All gameplay content (careers, masteries, props, equipment, arenas,
  personalities, traits, commentary) is JSON validated against schemas. Adding a
  career never requires a TypeScript change.
- Every battle is reproducible forever from a small input record.
- Small, testable modules with explicit interfaces so an AI agent can work on
  one at a time.

**Non-goals (v1)**

- Real-time multiplayer, chat, guilds, trading between players.
- Native mobile apps (the web client must work on mobile browsers, though).
- User-generated content.

---

## 2. Repository layout

A pnpm workspace monorepo, TypeScript everywhere, `strict: true`.

```
career-crash/
├─ packages/
│  ├─ sim/              # Deterministic simulation. No DOM, no Node APIs, no Date, no Math.random.
│  │  ├─ src/core/      # fixed-point math, PRNG, tick loop, world state
│  │  ├─ src/systems/   # movement, combat, status, interaction, hazards, ai, referee
│  │  ├─ src/events/    # battle event types + emitter
│  │  └─ test/          # unit tests + golden replays
│  ├─ content-schema/   # Zod schemas + generated JSON Schema + TS types for all content
│  ├─ content/          # The JSON data itself (careers/, props/, arenas/, ...)
│  ├─ content-compiler/ # Validates, cross-links and bundles content into one versioned blob
│  ├─ commentary/       # Event log → human-readable battle report (pure functions)
│  ├─ protocol/         # API request/response types shared by client and worker
│  └─ game-rules/       # Non-combat rules: XP curves, rewards, matchmaking math (pure)
├─ apps/
│  ├─ client/           # Vite + Preact UI + PixiJS battle viewer
│  └─ worker/           # Cloudflare Worker (API), D1 migrations, Durable Objects
├─ tools/
│  ├─ balance/          # Headless mass-simulation, win-rate reports
│  ├─ art-pipeline/     # Prompt templates, sprite assembly, atlas packing
│  └─ replay-cli/       # Run/inspect/diff a battle from an input record
└─ docs/                # These design documents
```

**Dependency rule (enforced by lint, `eslint-plugin-boundaries` or
`dependency-cruiser`):**

```
content-schema ← content-compiler ← content
content-schema ← sim ← commentary
game-rules ← protocol ← client, worker
sim, commentary → client, worker, tools
```

`sim` must never import from `apps/*`, `game-rules`, or anything with I/O.

**Tooling:** Node 22 LTS, pnpm 9, Vitest, ESLint, Prettier, `wrangler` for the
worker, Playwright for a small number of client smoke tests.

---

## 3. Client

### 3.1 Renderer choice: PixiJS v8 + Preact

The v0.1 GDD left Phaser vs PixiJS open. Decision: **PixiJS**.

- The client never simulates physics or reads input during battle — it plays
  back a deterministic simulation. Phaser's scene, arcade physics and input
  systems would be dead weight or, worse, a temptation to put gameplay logic in
  the client.
- Most screens (roster, careers, shop, reports) are forms and lists; DOM is
  better at those (accessibility, text layout, localisation).
- Pixi gives sprite batching, containers for modular characters, and a small
  bundle.

Battle view = one `<canvas>` managed by Pixi, mounted inside a Preact route.

### 3.2 Client modules

| Module | Responsibility |
|---|---|
| `api/` | Typed fetch wrapper over `protocol` types, retries, auth token. |
| `state/` | Signals-based store (`@preact/signals`) for player, roster, inbox. |
| `screens/` | Home, Roster, Character, Career Pick, Loadout, Opponents, Report, Replay, Collection. |
| `replay/` | Runs `sim` locally from an input record, buffers snapshots, drives renderer. |
| `render/` | Pixi scene graph: arena layers, props, characters (paper-doll), VFX, camera. |
| `audio/` | Event → sound cue mapping (data-driven). |

### 3.3 Replay playback

1. Fetch the `BattleRecord` (see §4.4) and the content bundle matching its
   `contentHash` (cached in IndexedDB; immutable URL on R2/CDN).
2. Run the sim incrementally as playback advances, emitting per-tick snapshots
   and events. (v0.1 runs it on the main thread: a whole battle simulates in
   < 100 ms, and seeking backwards re-simulates from tick 0. Move to a Web
   Worker if profiling on low-end phones shows frame drops.)
3. Main thread renders at display refresh rate, interpolating between the two
   nearest ticks. Speed control: 1×, 2×, 4×, skip-to-end.
4. Verify the final state hash equals `BattleRecord.resultHash`. On mismatch,
   show the replay anyway but report a `desync` telemetry event (this is a bug).

---

## 4. Determinism contract

The single most important technical rule. Violations break replays, PvP
fairness and balance tooling simultaneously.

### 4.1 Rules for `packages/sim`

1. **No floating point in state.** Positions, velocities, stats, timers are
   integers. Distances use a fixed-point unit: **1 world unit = 1/1000 m**
   ("mm"). Percentages are stored in basis points (1% = 100 bp).
2. **One PRNG**, `sfc32`, seeded from the battle seed. It lives in the world
   state and is only advanced inside the tick loop. Subsystems that need
   independent streams derive them with `fork(label)` (hash of seed + label),
   so adding a new system does not shift other systems' rolls.
3. **Deterministic iteration order.** Entities are stored in arrays sorted by
   `entityId` (integers assigned in spawn order). No iterating over `Map`/`Set`
   built from non-deterministic sources; never iterate object keys of data
   whose insertion order could vary.
4. **Integer trig and sqrt.** Provide `isqrt`, and angles as 1/4096 turns with
   a lookup table for sin/cos. No `Math.sin`, `Math.sqrt`, `Math.pow`, `**`
   on non-integers.
5. **Banned globals** (lint rule): `Math.random`, `Date`, `performance`,
   `setTimeout`, `crypto`, `Intl`, `toLocaleString`, `Array.prototype.sort`
   without an explicit comparator.
6. **Pure input.** The simulation takes a `BattleInput` and the compiled
   `ContentBundle`; it returns events and a final state. No hidden reads.
7. **Integer division** uses a single helper `idiv(a, b)` that truncates toward
   zero, so rounding is identical everywhere.

### 4.2 Tick rate and budget

- **20 ticks per second.** Max battle length 120 s → 2,400 ticks.
- Target: a 5v5 battle simulates in **< 50 ms** on a Worker (≈ 20 µs/tick).
  3v3 on a mid-range phone in < 150 ms.
- Hard entity cap per battle: 256 (characters + props + projectiles + spills).

### 4.3 State hashing

After every tick in debug builds (and after the final tick always), compute a
64-bit FNV-1a hash over a canonical serialization of world state. Golden tests
store per-tick hashes every 100 ticks so that a divergence can be located.

### 4.4 Replays

```ts
interface BattleInput {
  schemaVersion: 1;
  contentHash: string;        // hash of the compiled ContentBundle used
  simVersion: string;         // semver of packages/sim
  seed: string;               // 128-bit hex
  arenaId: string;
  mode: 'duel_3v3' | 'duel_5v5' | 'ffa' | 'koth' | 'boss';
  teams: TeamSnapshot[];      // frozen copies, not references to live characters
  modifiers: string[];        // event/season modifiers, data ids
  crashers?: CrasherInput;    // gatecrashers (07): set, earliest/latest tick, snapshots
}

interface BattleRecord {
  id: string;
  input: BattleInput;
  resultHash: string;         // final state hash
  summary: BattleSummary;     // winner, KOs, MVP, duration, notable events
  createdAt: number;
}
```

- The server stores `BattleRecord` (~2–6 KB JSON). The client re-simulates.
- **Old replays must keep working.** Compiled content bundles and sim builds
  are immutable and kept on R2 keyed by `contentHash` / `simVersion`. The
  client lazy-loads the matching sim build (a separate JS chunk per sim major
  version) when a replay predates the current one. Rule: bump `simVersion`
  whenever any golden hash changes.

---

## 5. Content system

### 5.1 Principles

- The engine knows **tags, stats, statuses, abilities, effects, interaction
  rules**. It does not know "chef", "fire extinguisher" or "supermarket".
- Every content file has a stable `id` (`kebab-case`, namespaced by type:
  `career.chef`, `prop.shopping-trolley`). Ids are never reused or renamed;
  deprecate with `"deprecated": true`.
- Display strings live in `content/locales/en.json`, keyed by id. Content
  files contain no player-facing text.
- The compiler rejects: unknown tags, dangling references, stat totals outside
  the budget for the rarity tier (see 02 §9), duplicate ids, missing locale keys,
  missing art references.

### 5.2 Tag vocabulary

Tags are the connective tissue. They are declared in `content/tags.json` so
typos are compile errors. Families:

| Family | Examples |
|---|---|
| `material:` | `material:metal`, `material:wood`, `material:glass`, `material:liquid`, `material:food`, `material:paper` |
| `element:` | `element:fire`, `element:water`, `element:electric`, `element:slippery`, `element:foam` |
| `role:` | `role:medical`, `role:emergency`, `role:tech`, `role:manual`, `role:media`, `role:legal`, `role:food`, `role:education` |
| `skill:` | `skill:repair`, `skill:drive`, `skill:extinguish`, `skill:heal`, `skill:persuade`, `skill:cook` |
| `state:` | `state:burning`, `state:wet`, `state:electrified`, `state:stunned`, `state:carried` |
| `trait:` | behavioural hooks referenced by traits and personalities |

Entities receive tags from their definition, their careers, their equipment
and their current statuses. Tags are the only thing interaction rules match on.

### 5.3 Schemas (abridged)

Full schemas live in `packages/content-schema`. The shapes below are normative.

**Career**

```json
{
  "id": "career.firefighter",
  "tier": 1,
  "tags": ["role:emergency", "skill:extinguish", "skill:carry"],
  "statMods": { "strength": 2, "health": 3, "recovery": 1, "intelligence": -1 },
  "passive": "ability.fireproof-gear",
  "active": "ability.hose-down",
  "interactionRules": ["rule.firefighter-extinguish-burning"],
  "unlock": { "type": "default" },
  "prerequisites": null,
  "art": { "outfit": "outfit.firefighter", "heldItem": "item.axe" }
}
```

`tier` 1 = starting careers; tier 2+ can require prerequisites, e.g.
`"prerequisites": { "anyOf": [["career.mechanic"], ["career.electrician"]] }`
for `career.engineer`.

**Mastery**

```json
{
  "id": "mastery.emergency-response-expert",
  "requires": { "careers": ["career.chef", "career.firefighter", "career.paramedic"], "ordered": false },
  "passive": "ability.triage-instinct",
  "grantsAbilities": ["ability.flambe-and-rescue"],
  "cosmetics": { "badge": "badge.ere", "frame": "frame.ere", "victory": "anim.victory-salute" },
  "hidden": true
}
```

With `"ordered": true` the careers must appear in that order (not necessarily
consecutively) in the character's career history.

**Ability**

```json
{
  "id": "ability.hose-down",
  "kind": "active",
  "cost": { "energy": 30 },
  "cooldownTicks": 160,
  "castTicks": 10,
  "targeting": { "type": "cone", "rangeMm": 4000, "angle": 512 },
  "aiHints": { "goal": ["extinguish", "control"], "preferTargetsWithTags": ["state:burning"] },
  "effects": [
    { "type": "applyStatus", "status": "status.wet", "durationTicks": 100 },
    { "type": "removeStatus", "status": "status.burning" },
    { "type": "knockback", "forceMm": 1500 },
    { "type": "spawnProp", "prop": "prop.puddle-water", "at": "targetGround", "chanceBp": 5000 }
  ]
}
```

Effect types are a closed set implemented in code (≈ 25 in v1): `damage`,
`heal`, `applyStatus`, `removeStatus`, `knockback`, `pull`, `stun`,
`spawnProp`, `spawnProjectile`, `modifyStat`, `taunt`, `grabProp`, `throwHeld`,
`dash`, `summonAlly` (bosses only), `emitNoise`, `setFlag`, … Adding an
effect type is a code change; using one is data.

**Prop**

```json
{
  "id": "prop.shopping-trolley",
  "tags": ["material:metal", "rideable", "pushable"],
  "components": {
    "physical": { "weightG": 25000, "radiusMm": 450, "friction": 200 },
    "health": { "hp": 120, "onBreak": ["spawn:prop.scrap-metal"] },
    "carry": null,
    "throw": null,
    "push": { "impactDamagePerMs": 8 },
    "ride": { "speedBonusBp": 4000 },
    "conducts": true
  },
  "art": "sprite.prop.shopping-trolley"
}
```

Components (all optional): `physical`, `health`, `carry`, `throw`, `push`,
`ride`, `burn`, `conduct`, `explode`, `leak`, `hazard`, `mover` (scripted path,
e.g. escalators, baggage carousels), `container` (spawns items), `use`
(consumable, e.g. coffee).

**Interaction rule**

```json
{
  "id": "rule.water-conducts-electricity",
  "when": {
    "event": "contact",
    "a": { "hasAll": ["element:electric"] },
    "b": { "hasAll": ["state:wet"] }
  },
  "then": [
    { "target": "b", "effect": { "type": "applyStatus", "status": "status.electrified", "durationTicks": 40 } },
    { "target": "b", "effect": { "type": "damage", "amount": 12, "damageType": "electric" } }
  ],
  "priority": 50,
  "commentaryTag": "shock"
}
```

Events that rules can listen to: `contact`, `hit`, `statusApplied`,
`statusTick`, `propBroken`, `enterZone`, `ko`, `abilityCast`, `tick` (for
auras, sparingly). Rules are indexed by event and by required tags at compile
time so evaluation stays cheap.

**Arena**

```json
{
  "id": "arena.supermarket",
  "sizeMm": [24000, 14000],
  "navGridCellMm": 500,
  "layers": { "floor": "tiles.supermarket-floor", "decor": ["..."] },
  "spawns": { "teamA": [[2000, 3000], [2000, 7000], [2000, 11000]], "teamB": ["..."] },
  "props": [ { "prop": "prop.shopping-trolley", "at": [8000, 4000] } ],
  "zones": [ { "id": "freezer", "rect": [18000, 0, 6000, 3000], "tags": ["cold"] } ],
  "hazards": [ { "id": "hazard.cleaning-robot", "startTick": 400, "path": "path.aisle-loop" } ],
  "suddenDeath": "sudden.sprinklers"
}
```

**Personality, Trait, Equipment, Status, Commentary template** follow the same
pattern; see 02 §6–§8 for their fields.

### 5.4 Content compilation

`pnpm content:build`:

1. Load all JSON, validate with Zod.
2. Resolve references, check tag vocabulary, locale keys, art keys.
3. Run budget checks (02 §9).
4. Emit `content-bundle.<hash>.json` (minified, ids interned to integer
   indices for the sim) plus a `manifest.json`.
5. Run the golden-replay suite; if hashes change, the build prints which
   battles changed so the author decides whether that was intended.

---

## 6. Backend

### 6.1 Runtime components

| Component | Tech | Purpose |
|---|---|---|
| API Worker | Cloudflare Worker (Hono router) | All HTTP endpoints, auth, validation, runs battles. |
| Primary DB | D1 (SQLite) | Players, characters, defences, battles, ledger, ladder. |
| Blob storage | R2 | Content bundles, sim builds, art atlases, archived battle records. |
| Cron | Workers Cron Triggers | Season rollover, offline reward settlement, leaderboard snapshots. |
| Durable Objects | Only `LadderShard` and `EventRoom` | Serialize writes to hot, contended state (ladder rating updates, live boss event HP pool). Everything else is plain D1. |
| Bot protection | Turnstile | On account creation and on burst battle requests. |

### 6.2 Who runs the simulation

**The server runs every rated battle.** The client never submits results. The
attack endpoint: validates the attacker's team, loads the defender's frozen
snapshot, picks the seed server-side, runs `sim`, writes the `BattleRecord`,
applies rewards and rating changes in one D1 batch, and returns the record.

Worker CPU limits: a 5v5 battle at ≤ 50 ms fits comfortably inside paid-plan
limits. The balance suite enforces a p99 of < 80 ms per battle as a CI gate.

### 6.3 Data model (D1)

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,            -- ulid
  display_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1000,
  league TEXT NOT NULL DEFAULT 'intern',
  flags INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE auth_identities (
  provider TEXT NOT NULL,          -- 'device' | 'email' | 'google' | 'discord'
  subject TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  PRIMARY KEY (provider, subject)
);

CREATE TABLE wallets (
  player_id TEXT NOT NULL REFERENCES players(id),
  currency TEXT NOT NULL,          -- 'cash' | 'rep' | 'stars' | 'tickets'
  balance INTEGER NOT NULL,
  PRIMARY KEY (player_id, currency)
);

CREATE TABLE ledger (             -- append-only; balances must equal SUM(ledger)
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,            -- 'battle_win', 'offline', 'purchase', ...
  ref TEXT,                        -- battle id, sku, etc.
  created_at INTEGER NOT NULL
);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  data TEXT NOT NULL,              -- JSON: name, appearance, careers[], traits[], personality, stats, xp, level
  version INTEGER NOT NULL,        -- optimistic concurrency
  retired INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_characters_player ON characters(player_id);

CREATE TABLE defences (
  player_id TEXT NOT NULL REFERENCES players(id),
  mode TEXT NOT NULL,
  snapshot TEXT NOT NULL,          -- frozen TeamSnapshot JSON
  content_hash TEXT NOT NULL,
  power INTEGER NOT NULL,          -- for matchmaking
  rating INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (player_id, mode)
);
CREATE INDEX idx_defences_match ON defences(mode, rating);

CREATE TABLE battles (
  id TEXT PRIMARY KEY,
  attacker_id TEXT NOT NULL,
  defender_id TEXT,                -- null for PvE
  mode TEXT NOT NULL,
  record TEXT NOT NULL,            -- BattleRecord JSON (moved to R2 after 30 days)
  winner TEXT NOT NULL,            -- 'attacker' | 'defender' | 'draw'
  rating_delta INTEGER NOT NULL,
  seen_by_defender INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_battles_defender ON battles(defender_id, created_at);

CREATE TABLE relationships (      -- rivalries, friendships between characters (cross-player allowed)
  a_character_id TEXT NOT NULL,
  b_character_id TEXT NOT NULL,
  kind TEXT NOT NULL,              -- 'rival' | 'nemesis' | 'friend' | 'mentor'
  score INTEGER NOT NULL,
  PRIMARY KEY (a_character_id, b_character_id)
);

CREATE TABLE discoveries (        -- global first-discovery of masteries
  mastery_id TEXT PRIMARY KEY,
  first_player_id TEXT NOT NULL,
  first_at INTEGER NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 1
);
```

Character data is a JSON column validated by a Zod schema on every write: it
is always read and written whole, and it evolves often; normalising it buys
nothing at this scale.

### 6.4 API (v1)

All endpoints are `POST`/`GET` JSON under `/api/v1`, typed in `packages/protocol`.
Authenticated with a short-lived signed session token (HMAC, 24 h) obtained
from `/auth/*`.

| Endpoint | Purpose |
|---|---|
| `POST /auth/device` | Anonymous device account (Turnstile). Upgradable later. |
| `POST /auth/link` | Link email / OAuth identity to current account. |
| `GET /me` | Player, wallets, roster, unread defence reports, pending offline rewards. |
| `POST /rewards/collect` | Settle and collect offline rewards. Idempotent per settlement window. |
| `POST /characters/:id/career` | Choose a career at an available milestone. |
| `POST /characters/:id/equip` | Change equipment. |
| `POST /characters/recruit` | Spend cash on a recruit from the current applicant pool. |
| `PUT /defence/:mode` | Upload defence team; server freezes a snapshot. |
| `GET /opponents/:mode` | Returns 3 opponents (see 03 §5). Cached per player for 10 min. |
| `POST /battles/attack` | `{ mode, opponentId, teamIds }` → `BattleRecord` + reward result. |
| `GET /battles/:id` | Fetch a record (for replays, sharing). Public if shared. |
| `GET /reports` | Defence reports since last visit. |
| `GET /content/manifest` | Current `contentHash`, `simVersion`, asset URLs. |

**Idempotency:** mutating endpoints accept an `Idempotency-Key` header; the
worker stores results for 24 h so a flaky mobile connection never double-spends.

### 6.5 Security and anti-cheat

- Server-authoritative battles and rewards; the client only renders.
- Defences are validated at upload against the player's actual characters and
  frozen; later edits don't retroactively change old battles.
- Rate limits per player (token bucket in KV or a DO): attacks 60/h, writes 120/h.
- Turnstile on sign-up and whenever rate limits are hit.
- Ledger invariant check in the daily cron: `wallets.balance == SUM(ledger.delta)`.

### 6.6 Observability

- Structured logs (JSON) with `battleId`, `playerId`, `simVersion`.
- Client telemetry events: `session_start`, `replay_watched`, `career_chosen`,
  `desync`, `error`. Batched to an `/telemetry` endpoint → Workers Analytics Engine.
- Balance dashboards come from the `battles` table + offline balance runs, not
  from live telemetry.

---

## 7. Testing strategy

| Layer | What | Gate |
|---|---|---|
| Sim unit tests | math, PRNG, each system in isolation | CI |
| Golden replays | ~50 fixed `BattleInput`s with stored per-100-tick hashes | CI; change requires `simVersion` bump |
| Cross-runtime determinism | same goldens run in Node, headless Chromium, and `wrangler dev` | CI nightly |
| Property tests | random teams/arenas: no crash, battle ends ≤ 2,400 ticks, no NaN, entity cap respected | CI (1,000 seeds) |
| Content lint | compiler checks (§5.4) | CI |
| Balance smoke | 10k battles; no career > 60% or < 40% win rate at equal power | CI nightly, report only |
| API tests | worker routes against local D1 (`wrangler d1 --local`) | CI |
| Client smoke | Playwright: sign up → attack → watch replay | CI |

---

## 8. Performance budgets

| Item | Budget |
|---|---|
| Initial JS (gzip) | ≤ 250 KB before first screen |
| Content bundle (gzip) | ≤ 400 KB at 100 careers |
| Character atlas per character | ≤ 64 KB (assembled from shared part atlases) |
| Time to interactive (mid phone, 4G) | ≤ 3 s |
| Battle sim, 5v5, Worker | p50 ≤ 30 ms, p99 ≤ 80 ms |
| Replay start latency | ≤ 500 ms after tap |
