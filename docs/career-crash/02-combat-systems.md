# Career Crash — Combat Systems Document (v0.1)

Status: draft for implementation. Owner of: battle rules, stats, abilities,
statuses, AI decision-making, environment interactions, win conditions,
commentary generation. Numbers here are **starting values** for the balance
tools to tune; the structure is the contract.

All quantities are integers (see 01 §4). "Ticks" are 1/20 s. Distances are in
mm. Percentages are basis points (bp, 100 bp = 1%).

---

## 1. What a battle is

A battle is a pure function:

```
simulate(BattleInput, ContentBundle) → { events: BattleEvent[], finalState, resultHash }
```

Two teams (or N free-for-all participants) are placed in an arena full of props
and hazards. Characters act autonomously based on stats, careers, equipment,
personality and traits. Nothing is scripted: every funny moment is a
consequence of systems colliding — interaction rules firing between tags.

Design target per battle: **3–6 "story moments"** a player would retell
(someone set on fire, a prop used unexpectedly, a comeback, a referee
incident). The balance tools measure this (§11.4).

---

## 2. Space and time

- **Plane:** the arena is a 2D rectangle in mm (typical 24 m × 14 m). Entities
  have `x, y` (ground position) and `z` (height, 0 = floor) for throws,
  knock-ups, and standing on props (tables, counters, car roofs).
- **Rendering:** 3/4 "stage" view: screen y = world y × 0.6 − z. Draw order by
  world y. This is purely a client concern.
- **Collision:** entities are circles (`radiusMm`). Walls and static scenery are
  axis-aligned rectangles. Circle–circle and circle–AABB only; no rotation.
- **Navigation:** coarse grid (500 mm cells) with A* on arena load and cached
  flow fields toward frequently used targets. Dynamic props mark cells as
  "soft blocked" (cost ×4, not impassable) so characters sometimes squeeze
  past trolleys and sometimes knock them over.
- **Time:** 20 ticks/s. Hard cap 2,400 ticks (120 s). Target median duration
  75 s.

---

## 3. Statistics

### 3.1 Core stats

Every character has the 12 stats from the GDD. Scale: **1–20**, base value 5
for a fresh recruit (recruits roll ±2 on up to three stats). Careers add
modifiers (§9 budget). Level-ups add points (03 §3). Hard clamp 1–30 after
all modifiers.

| Stat | Primary effect (derived value) | Secondary effect |
|---|---|---|
| Health | Max HP = `220 + 24 × Health` (tuned in v0.1 from `60 + 8 ×` so median 3v3 length approaches 60 s) | Resistance to knock-down |
| Energy | Max energy = `50 + 5 × Energy` | — |
| Movement Speed | Speed mm/tick = `150 + 10 × Speed` (3.0–9.0 m/s) | Dodge chance |
| Strength | Melee damage multiplier `+5%/pt`; carry weight `10 kg × Str` | Push force |
| Throwing Skill | Throw accuracy (spread shrinks); throw damage `+5%/pt` | Throw range |
| Intelligence | **AI decision noise** decreases (§6.4) | Ability effectiveness `+2%/pt` on non-damage effects |
| Awareness | Perception radius `4 m + 0.4 m × Awareness` | Hazard avoidance roll, reaction delay |
| Confidence | Morale max and morale floor (§5.5) | Resist taunt/fear |
| Luck | Crit chance `1% × Luck` | Slip/trip avoidance, "saved by a lucky bounce" |
| Charisma | Strength of support/social effects `+4%/pt` | Referee leniency, taunt range |
| Recovery | Energy regen `(20 + 2 × Recovery)`/100 per tick; stand-up time | HP regen out of combat (tiny) |
| Interaction Speed | Ticks to pick up / use / operate a prop: `max(4, 30 − Int.Speed)` | Weapon swap time |

Why Intelligence drives decision noise: low-Intelligence characters make
suboptimal, *funny* choices (throwing the fire extinguisher instead of using
it) without any special-case code.

### 3.2 Resources

- **HP.** At 0 → **Downed** (§5.4).
- **Energy.** Spent by active abilities and sprinting. Regenerates continuously.
- **Morale** (hidden, 0–100). Drives retreat/panic. Starts at `50 + 2 × Confidence`.

---

## 4. The tick pipeline

Each tick runs these systems **in this fixed order**. Order is part of the
determinism contract; changing it bumps `simVersion`.

1. **Scheduled events** — arena hazard timers, sudden-death escalation, mover paths.
2. **Perception** — update each character's visible entity list (every 4 ticks, staggered by `entityId % 4`).
3. **AI decision** — characters whose decision timer expired pick an action (every 5 ticks, staggered; immediately on interrupt: hit, status applied, target lost).
4. **Action progress** — advance wind-ups, casts, interactions; fire effects whose wind-up finished.
5. **Movement & physics** — apply intended velocities, knockback, friction, gravity on `z`; resolve collisions; projectiles advance.
6. **Contacts** — emit `contact` events for new overlaps (character↔prop, prop↔prop, character↔zone).
7. **Interaction rules** — evaluate rules for all events emitted this tick (bounded: max 3 cascade rounds per tick; further events defer to the next tick). Rules that spawn props must not be able to re-trigger themselves; as a safety net the engine caps prop spawns at 12 per tick (`MAX_SPAWNS_PER_TICK`). Contact pairs are pre-filtered with per-entity rule bitmasks so only pairs that could match a rule are evaluated.
8. **Statuses** — tick durations, apply periodic effects, expire.
9. **Resources** — energy regen, morale drift, downed/revive timers.
10. **Referee** — observe fouls, issue cards (§7.5).
11. **Win check** — §10.
12. **Hash** (debug) and event flush.

---

## 5. Actions, damage and statuses

### 5.1 Action types

Every character action is one of:

| Action | Source | Notes |
|---|---|---|
| `move` | always | Toward a point or entity, via nav grid. |
| `basicAttack` | equipped item, else "shove" | Melee or thrown depending on item. |
| `useAbility` | careers, mastery, equipment | Costs energy, has cooldown. |
| `pickUp` | nearby prop with `carry` | Takes `interactionTicks`. |
| `throwHeld` | held prop | Arc projectile; damage by weight and speed. |
| `useProp` | prop with `use` (coffee, vending machine, forklift) | May grant status or mount. |
| `push` | prop with `push` | Sends it sliding; damages what it hits. |
| `revive` | ally downed, actor has `skill:heal` or any ally after 4 s channel | §5.4 |
| `retreat` | always | Move away from threats toward allies/cover. |
| `taunt` / `emote` | personality-driven | Cosmetic mostly; taunt pulls aggro with Charisma. |

### 5.2 Damage formula

```
raw      = base × (100 + 5 × AttackStat) / 100          // AttackStat: Strength (melee) or Throwing (thrown)
crit     = roll(Luck × 100 bp) ? raw × 150 / 100 : raw
mitig    = sum of armour-like modifiers in bp, cap 6000
final    = max(1, crit × (10000 − mitig) / 10000)
```

- `base` comes from the weapon/ability/prop. Guideline: basic shove 6,
  handheld tool 9–12, thrown heavy prop `weightKg × 1.5` capped at 40.
- Environmental damage (fire, electricity, falling shelves) ignores the
  attacker stat and uses only `base`.
- **Time-to-KO target:** an average character dies to sustained focus from one
  average enemy in **~12 s**, from three in **~4 s**. Balance tools verify.

### 5.2a Parry, evade, dash

Every melee blow can be defended. The target (standing, able to act, not
crawling, off a 1.5 s cooldown) rolls once: **parry** (attacker is stunned
0.8 s and shoved back) or **evade** (a 2.4 m burst sideways, or backwards if
boxed in by walls). Characters closing on a far goal can **dash** up to 3.2 m
(3.5 s cooldown). Chances per character:

- parry = 2.5% + 0.6% × (Strength + Awareness − 10), evade = 3.5% + 0.7% ×
  (Speed + Awareness − 10), dash check = 15% + 2.5% × (Speed − 5) per 0.5 s;
- plus career and personality styles (`defense` in careers/personalities):
  security and police parry, mimes and politicians slip away, delivery
  drivers and lifeguards dash, cowards evade, the lazy don't bother.
- Caps: parry 30%, evade 35%. Typical 3v3: ~6 parries, ~6 evades, ~6 dashes.

### 5.2b Throwing first

If a throwable prop is within 3.5 m, closer than the nearest enemy, and an
enemy is within 7 m, grabbing it is a *damage* move that outscores a punch;
anyone holding something throws it at anything 0.8–10 m away. Thrown objects
deal 2.8× their listed damage (a good throw is worth the trip). ~23 throws per
3v3 battle (was ~6).

Sudden death (from 90 s) escalates: +30% damage taken per 10 s wave, up to
+120%, so stalemates end.

### 5.2c Weapons in hand, disarms, choke holds, heavy weapons (v0.9)

What a fighter holds decides their basic attack (`sim/systems/weapons.ts`):

| In hand | Attack |
|---|---|
| Career weapon (one-handed equipment) | its `attack` (8–13 dmg) |
| A throwable, swung as a club | 6–9 dmg, short range, slow — throwing it is still better |
| Two-handed heavy weapon | 13–20 dmg, slow wind-up, 4–5.5 m knockback, 45% knockdown |
| Nothing | shove (6 dmg) — or a **choke hold** |

**Disarms.** A hard blow (≈ % of max HP lost + knockback/100 mm, over 11) or
a big blast (explosions, machines, ≥ 2 m shoves) may knock everything out of
someone's hands; strength helps hold on. A career weapon lands on the floor as
`prop.weapon` (remembering which weapon it is); anyone with free hands can pick
it up, the owner most eagerly. ~3 disarms per 3v3 battle.

**Choke holds.** An unarmed attack may become a choke hold (1.2% base, more
with strength, +40% on stunned/crawling/prone targets, +25% from behind): the
victim is held in front of the choker, can't act and loses 2 HP every 4 ticks
for 1.5–3 s; either is frozen; it breaks when the choker is hit by someone
else, when either goes down, or when the victim wriggles free (strength).
~3 per battle.

**Heavy weapons** (props with `heavy`) sit in every arena, two kinds per arena,
mirrored for both teams. Only a fighter with *empty hands* can lift one; it
slows them 20–35%, can't be thrown, and breaks after 5–7 swings. ~1 picked up
per battle. Art: the item atlas names below (drawn placeholders until then).

| Arena | Heavy weapon | Atlas name | Notes |
|---|---|---|---|
| Supermarket | Giant Frozen Salmon | `frozen-salmon` | chills (Cold) |
| Supermarket | SALE Aisle Sign | `sale-sign` | sign on a pole |
| Office | Coat Stand | `coat-stand` | |
| Office | Giant Novelty Cheque | `novelty-cheque` | embarrasses |
| Train Station | Platform Bench | `platform-bench` | heaviest, slowest, 5.5 m knockback |
| Train Station | Platform Sign | `platform-sign` | |
| Diner | Beer Keg | `beer-keg` | |
| Diner | Giant Pepper Grinder | `pepper-grinder` | distracts |
| Construction Site | Sledgehammer | `sledgehammer` | |
| Construction Site | Road Sign | `road-sign` | |
| Warehouse | Wooden Pallet | `wooden-pallet` | |
| Warehouse | Rolled-up Carpet | `rolled-carpet` | longest reach |

### 5.3 Statuses

Statuses are content (`status.*`). Each defines: duration, stacking rule
(`refresh`, `stack:max`, `ignore`), tags it grants while active (e.g.
`state:burning`), periodic effects, stat modifiers, and AI hints.

Core v1 set:

| Status | Grants tag | Effect |
|---|---|---|
| Burning | `state:burning`, `element:fire` | 3 dmg / 10 ticks; spreads to adjacent `burn` props/characters; AI panics toward water. |
| Wet | `state:wet` | Immune to Burning; takes ×2 electric damage. |
| Electrified | `state:electrified`, `element:electric` | Stun 20 ticks; chains to touching wet/conductive entities. |
| Slippery-footed | `state:slipping` | Movement becomes sliding; Luck roll each tick of motion to avoid falling. |
| Stunned | `state:stunned` | No actions. |
| Knocked down | `state:down` | Prone; stand-up time `max(10, 40 − Recovery)` ticks. |
| Caffeinated | `state:caffeinated` | +30% move and interaction speed, −1 Awareness, crash (Slowed) afterwards. |
| Foamed | `state:foamed` | Slowed 50%, cannot burn. |
| Inspired | `state:inspired` | +20% damage, +morale; Charisma-scaled. |
| Embarrassed | `state:embarrassed` | Morale −20; 30% chance to skip next action. |
| Lectured | `state:lectured` | Referee card: stunned 40 ticks while being told off. |

### 5.4 Downed, revive, KO

- HP 0 → **Downed** for 140 ticks (7 s). Downed characters **crawl** slowly
  towards the nearest standing ally and stop when one comes to help. Allies
  within 20 m weigh a revive highly; the revive channels 35 ticks with
  `skill:heal`, 60 without. Revived at 30% HP. Each character can be revived
  **once per battle**. (v0.5: with the old 5 s / 12 m / 80-tick numbers ~92%
  of KOs were silent bleed-outs; now ~0.4 revives per 3v3 battle.)
- Downed timer expires, or downed again after a revive → **KO** (out of the
  battle, body remains as a trippable obstacle — intentionally).
- Hitting a downed character is a foul (§7.5).
- **Crawling after a knockdown.** When `status.knocked-down` wears off, a
  character below 50% HP doesn't spring up: they get `status.crawling`
  (0.6 s at 50% HP up to 3.6 s near 0) — belly-crawling towards an ally or away
  from the nearest enemy at 30% speed, dealing half damage, unable to start
  attacks, and still very much attackable.
- Replays and report moments show the **decisive blow** (the hit that downed
  someone, or a finishing hit), never the moment a timer ran out.

### 5.5 Morale

- Drops on: taking big hits (−1 per 5% max HP), ally KO (−15), being
  Embarrassed, being alone (−1/s when no ally within 5 m).
- Rises on: landing KOs (+15), Inspired, ally revive, being near a
  higher-Charisma ally.
- Floor: `Confidence × 2`. Below 25 → AI heavily weights `retreat`; below 10 →
  **Panic**: random fleeing, drops held item. Panicked characters are a
  primary comedy source and a real tactical weakness.

### 5.6 Grapples, throws and ragdolls

Contact is the heart of the comedy (think MDickie): characters get picked up,
spun and thrown into each other.

- **`toss` effect** `{distanceMm, heightMm, direction: away|behind|up,
  landDamage}`. The victim drops whatever it holds, dismounts, becomes
  **Airborne** (`state:airborne`, no actions) and follows an integer ballistic
  arc (gravity 12 mm/tick²). `behind` = judo-style over-the-shoulder throw;
  `away` aims the victim *at the nearest other enemy* within range, so bodies
  are thrown into bodies; `up` = launch straight up.
- A flying body (z > 150 mm) that touches another character deals 7 damage,
  knocks them down and shoves them (`hit` with `s = "body"`), and smashes or
  pushes props in its path — the bowling-pin effect.
- Landing emits `landed` (damage = `landDamage`) and knocks the victim down.
- Grapple abilities: Bouncer Toss (Security), Fireman's Carry (Firefighter),
  Judo Takedown (Police), Body Slam (Builder), Deadlift Suplex (Trainer),
  Pitchfork Toss (Farmer), Return to Sender (Delivery), Belly Flop
  (Lifeguard), Crowd Surf (DJ), Giant Swing (Aggressive personality); big
  knockbacks (Drop the Bass, Honk, Table Flip, Haymaker, ...) became small
  tosses.
- The client layers a cosmetic Verlet **ragdoll** over any airborne, knocked
  down, downed or KO'd character: limbs flop, bodies tumble in the air and
  settle on the floor. It is purely visual; the sim still owns positions.

---

## 6. AI decision system

### 6.1 Approach: utility scoring

Characters use **utility AI**: at each decision point, enumerate candidate
(action, target) pairs, score each, pick the best (with noise). Chosen over
behaviour trees because:

- New careers/abilities/props become usable by AI purely via data
  (`aiHints`), with no tree editing.
- Personality and traits are just weight multipliers.
- It degrades gracefully and produces varied, emergent behaviour.

### 6.2 Candidate generation

Bounded to keep the cost predictable (≤ 40 candidates per decision):

- Each ready ability × up to 3 best targets per its targeting type.
- Basic attack × up to 3 nearest visible enemies.
- Up to 4 nearest usable props (pick up / push / use / throw-held).
- Revive for each downed ally within 8 m.
- Retreat (1 candidate: safest reachable cell from a precomputed threat map).
- Reposition (1: toward team centroid) and Idle/Taunt (1).

### 6.3 Scoring

```
score(c) = Π considerations(c) × goalWeight(c.goal, personality, traits) × commitmentBonus
```

**Considerations** are normalized 0–1 response curves over inputs, declared
per action type (and overridable via `aiHints`):

| Input | Example curve use |
|---|---|
| distance to target | melee prefers near, throw prefers 3–8 m |
| target HP% | finish low targets |
| self HP% | retreat/heal when low |
| target has preferred tags | `preferTargetsWithTags` (e.g. burning → extinguish) |
| number of enemies in AoE | cones, spills |
| energy after cost | avoid bottoming out |
| threat at destination | from the threat map |
| ally need | revive, heal, buff |

**Goals** tag every action: `damage`, `control`, `support`, `survive`,
`loot`, `chaos`, `show-off`. Personality defines a weight per goal.

### 6.4 Noise and intelligence

After scoring, add noise: `score × (1 + N(0, σ))` with
`σ = (22 − Intelligence) × 1.5%`, drawn from the AI PRNG stream. Intelligence
5 → σ ≈ 25%: sensible but fallible. Intelligence 20 → σ ≈ 3%: nearly optimal.

**Commitment:** the currently running action gets ×1.25 so characters don't
dither. Interrupts (hit, stun, target lost) clear commitment.

### 6.5 Personalities (content)

```json
{
  "id": "personality.coward",
  "goalWeights": { "damage": 0.7, "control": 1.0, "support": 1.0, "survive": 1.8, "loot": 1.0, "chaos": 0.6, "show-off": 0.3 },
  "moraleMods": { "floorBonus": -10, "allyKoLoss": 25 },
  "targetPreference": "weakest",
  "quirks": ["hide-behind-props"]
}
```

| Personality | Behaviour signature |
|---|---|
| Coward | High `survive`; retreats early; picks weakest targets; hides behind props. |
| Aggressive | High `damage`; low `survive`; charges the nearest enemy. |
| Greedy | High `loot`; grabs every pickup, won't drop held items. |
| Helpful | High `support`; revives first, bodyguards the weakest ally. |
| Lazy | Movement costs are weighted ×2; prefers ranged, throws whatever is nearest. |
| Chaotic | High `chaos`; favours hazards, pushes props into crowds, ignores friendly fire. |
| Competitive | Targets the enemy with the most KOs; bonus for duels. |
| Paranoid | Reacts to threats at +50% range; prefers cover; attacks anyone who hit them (incl. allies once). |
| Clumsy | +15% trip chance, +10% throw spread; occasional accidental drops. |
| Confident | Higher morale floor; high `show-off` (taunts after KOs, which can backfire). |

**Quirks** are a closed set of small coded behaviour hooks
(`hide-behind-props`, `bodyguard`, `grudge`, `taunt-after-ko`, …) that data
can attach to personalities and traits.

### 6.6 Friendly fire

On for everything except basic melee. Area effects, thrown props, spills,
fire, electricity and pushed trolleys hit allies. AI scoring includes an
`allyInArea` consideration (penalty scaled by Intelligence and reduced by
Chaotic). This is a deliberate source of emergent comedy.

### 6.7 Fight locations (stations and duels)

A single pile-up in the middle is hard to read and kills contextual jokes, so
battles are spread across the arena:

- Each arena defines 2–5 named **stations** (Supermarket: Frozen Aisle,
  Checkouts, Bakery, Drinks Aisle, Fruit & Veg).
- At kick-off, opponents are paired into **duels** (A[i] vs B[i]) and each pair
  is assigned a station (rotated by the battle seed).
- For the first 11 s, characters walk to their station and only swing at
  someone right next to them.
- While their duel partner is still up, characters prefer that opponent (×1.5)
  and are leashed to their station: targets more than 5 m from it score ×0.25,
  and they drift back if dragged more than 6 m away.
- Once the partner is down, the character is free and joins the nearest fight,
  so scraps merge naturally towards the end.
- Gatecrashers (07) are the exception: one within 3 m outranks the duel
  partner (×1.6), so a scrap they barge into turns on them.

Measured effect: average number of separate fight groups between 7.5 s and
45 s rose from 1.6 to 2.3 (3v3) and to 3.2 (5v5). Live commentary cuts
between locations ("Meanwhile, at the Frozen Aisle: …") and the mobile
camera directs itself to the busiest fight.

---

## 7. Environment and interaction system

### 7.1 Props

Props are entities with components (01 §5.3). Examples of what components
do at runtime:

| Component | Runtime behaviour |
|---|---|
| `physical` | Has mass, radius, friction; can be pushed/knocked; blocks movement. |
| `health` | Takes damage; on 0 runs `onBreak` (spawn debris, spill, sparks). |
| `carry` / `throw` | Can be picked up (weight vs Strength) and thrown. |
| `push` | Sliding impact damage `mass × speed`. |
| `ride` | Can be mounted (trolley, skateboard, forklift): speed bonus, knocks others over. |
| `burn` | Ignites from fire contact; burns N ticks, spreads, may break. |
| `conduct` | Passes `element:electric` to touching entities. |
| `explode` | On trigger (fire, damage threshold): radial damage + knockback. |
| `leak` | When damaged, spawns a spill (water, oil, soda) that grows over time. |
| `hazard` | Periodic effect in an area (sprinklers, cleaning robot, baggage carousel). |
| `use` | Consumable or operable (coffee → Caffeinated; vending machine → dispenses cans). |

### 7.2 Spills and zones

Spills are flat props with an area and element tags (`water` → Wet,
`oil` → Slippery, `soda` → Slippery+Sticky). They grow from leaks and can be
ignited (oil). Zones are arena-defined areas with tags (`cold`, `dark`,
`noisy`, `wet-floor`) that rules and AI can reference.

### 7.3 Interaction rules

Rules are the heart of emergent comedy (schema in 01 §5.3). Evaluation:

1. Systems emit events (`contact`, `hit`, `statusApplied`, …).
2. For each event, look up rules indexed by event type, then filter by the tag
   requirements on `a` and `b`.
3. Apply matching rules in `priority` order, then by rule id (determinism).
4. Effects may emit more events → up to 3 cascade rounds per tick.

Starter rule set (v1 needs ~40):

- fire + `burn` prop → Burning prop; Burning + adjacent `burn` → spread (Luck-independent chance per 10 ticks).
- `element:water` / `element:foam` + Burning → extinguish.
- `element:electric` + Wet / `conduct` → Electrified, chain.
- oil spill + fire → burning spill (area).
- moving `ride` prop + character → knockdown + damage by speed.
- Slipping character + `physical` prop → both knocked over.
- `explode` prop + fire or HP < 30% → explosion.
- character with `skill:repair` + broken `hazard` prop → can disable/restore it (tactical).
- `material:food` + `skill:cook` → consumable heal item (Chef makes snacks mid-fight).

### 7.4 Arena hazards and movers

Each arena defines 1–3 scheduled hazards and 0–2 movers (escalators, baggage
belts, forklifts on patrol, zoo animals on a path). Hazards telegraph for
≥ 20 ticks (visible warning in replay) so outcomes read as fair.

**Movers** (implemented in v0.3) are props with a `mover` component, spawned by
the arena at `startTick` and driven along a waypoint path:

- On new contact with a standing character they apply `hitEffects` (e.g. the
  floor scrubber: damage, knockdown, knockback, Wet), at most once per victim
  every 3 s.
- They can eat small carryable props (`eatsUpToG`) and leave a `trail`
  (the scrubber leaves puddles, so people slip in its wake).
- Characters notice an approaching mover within `1.5 m + 0.25 m × Awareness`
  and sidestep; oblivious characters get run over, which is the joke.

Current arena events: Supermarket — floor scrubber (two passes), clean-up on
aisle three, falling stock, free samples at the bakery. Office — robot vacuum
(patrols all battle, trips people, eats staplers and coffee cups), printer jam
sparks, birthday cake, fire drill (sprinklers soak everyone).

### 7.4a Per-battle layouts

Arenas list art-backed `obstacles` (each with art variants, an optional
`chanceBp`, and optional `belt` velocity for conveyors). `layoutArena(arena,
seed)` (shared by sim and renderer) rolls which optional pieces appear, picks
their art, shifts them up to `layoutJitterMm` (never onto mover paths or spawn
points), jitters loose props by up to 0.7 m and sits 15% of them out. Conveyor
belts carry anything standing on them. The diner's jukebox periodically
distracts everyone nearby.

### 7.4b Destruction

Every obstacle has health (120, or 170 for big ones). Bodies thrown into it
(30 damage; they take 8 themselves), fighters knocked into it at speed (12),
flying props (2 × their throw damage) and explosions (45) wear it down; it
wobbles and looks battered as it goes. At 0 it **topples** towards whichever
side has more people, crushing them (16 damage + knockdown) and scattering the
arena's `debris` props; it stops blocking movement for the rest of the fight.
~1–2.5 topples per battle depending on the arena (supermarket shelves are the
flimsiest). The client keeps rubble, splats of broken props and floor cracks
from big slams as decals.

### 7.5 The referee

Every duel has a neutral **referee** entity (content: `npc.referee`). It:

- Wanders to keep line of sight on the densest fight.
- Tracks fouls: hitting downed characters, friendly-fire KOs, repeated taunts.
- At 3 foul points, issues a **card**: the offender is `Lectured`
  (stunned 40 ticks). Charisma reduces foul points accrued (−5%/pt).
- Is a physical entity with HP (260 in v0.1). It **can be knocked out** by stray props,
  explosions, trolleys. When KO'd: event `refereeDown`, fouls stop being
  enforced, sudden death starts 15 s earlier. Knocking out the referee on
  purpose is never an AI goal — it only happens by accident, which is the joke.

---

## 8. Careers, equipment and traits in combat

### 8.1 Careers

A character has 1–5 careers. Each contributes stat modifiers, one passive,
one active ability, interaction rules, and tags (all cumulative). With five
careers the character has 5 actives; AI selects among them by utility, so
there is no player-set rotation.

**Order bonus:** the *first* career is the character's "origin" and grants
its passive at +50% strength; the *latest* career determines the default
outfit. Masteries may require ordered careers (01 §5.3).

### 8.1.1 Career synergies (banter)

`synergies/*.json` pairs an attacker career with a victim career. When a hit
lands across teams, each matching synergy rolls `chanceBp` (cooldown 400 ticks
per pair) and emits `banter` with a line — *Barista hits Farmer:* "Oat milk is
NOT real milk!" — spoken by the attacker or victim. Optional `effects` apply to
the speaker (e.g. Inspired + Taunt = rage at the other; Embarrassed = shame),
so professional rivalries change behaviour, not just text. Every career also
has a mirror synergy for same-career fights ("Two of us? Awkward.").

### 8.1.2 Grudges

Whoever floors you (down or KO) becomes your rival immediately (relationship
−3). Rivals are paired into the same duel, spot each other 1 s in (`rivalry`:
"You again?!"), target each other harder (×2), and matchmaking prefers teams
fielding one of your rivals ("grudge match" badge). Within a fight, being
downed gives a grudge against the one who did it (×2.2 targeting after a
revive). Flooring your rival or grudge is `revenge`: its own lines, hit stop
and an always-shown, extra-slow "GRUDGE SETTLED" replay. The Sandbox keeps
fighter identities per slot and remembers grudges in the browser.

### 8.2 Masteries

Checked after each career selection; if requirements are met the mastery is
permanently attached (a character can hold at most 2). Masteries add a
passive, 1 rare ability, and cosmetics. They must obey the same budget (§9)
— masteries are **sideways power, not raw power**: they combine the
character's tags in new ways (e.g. Emergency Response Expert: extinguishing
an ally also heals them 10%, and cooking produces revive-speed snacks).

### 8.3 Equipment

Two slots in v1: **held item** (weapon/tool) and **accessory** (passive
item: hi-vis vest, earbuds, lucky keychain). Held items define basic attack
(`base`, range, wind-up, knockback), tags, and optionally an active
(`fire-extinguisher` → foam cone). Everyday items can also be *found* in
arenas mid-battle, so a character's equipment is only a starting point.

### 8.4 Traits

Traits are earned **after** battles by rules evaluated over the character's
battle history (event logs), never during the battle. Each trait is content:

```json
{
  "id": "trait.pyromaniac",
  "earn": { "counter": "statusCausedByMe:status.burning", "atLeast": 10, "withinBattles": 10 },
  "effects": { "goalWeights": { "chaos": 1.3 }, "preferTargetsWithTags": ["burn"] },
  "exclusive": ["trait.fear-of-fire"],
  "maxPerCharacter": 1
}
```

Traits are mostly behavioural (goal weights, quirks, target preferences) with
at most a ±1 stat modifier. A character holds max 4 traits; new ones replace
the oldest unless locked by the player (03 §3.5). Relationships (rival,
nemesis, friend) come from the same post-battle pass and affect AI targeting
(rivals are preferred targets; friends are revived first).

---

## 9. Power budgets (enforced by the content compiler)

| Item | Budget |
|---|---|
| Career stat mods | Sum of positives ≤ 6, net sum ≤ +3 (tier 1), +4 (tier 2), +5 (tier 3) |
| Career active | declared `powerScore` 90–110 (computed estimator in `tools/balance`) |
| Mastery | net stat ≤ +2; ability `powerScore` ≤ 115 |
| Held item | `base` ≤ 12 for common, ≤ 14 rare; rarity never affects stats beyond ±10% |
| Trait | stat mod ∈ {−1, 0, +1} |

The estimator is intentionally rough; the real arbiter is the nightly balance
run (win rates at equal "power").

---

## 10. Win conditions and sudden death

| Mode | Win |
|---|---|
| Duel (3v3, 5v5) | All enemies KO'd. On timeout: higher sum of remaining HP% wins; within 1% → draw. |
| Free-for-all | Last standing; timeout → most KOs, then HP%. |
| King of the Hill | Points per tick while sole team in hill zone; first to 600 or most at timeout. |
| Last Person Standing | FFA with no revives and shrinking arena. |
| Boss Event | Team vs boss NPC; damage dealt counts toward a shared event pool (DO). |

**Sudden death** (from tick 1,800, or 1,500 if the referee is down): the
arena's `suddenDeath` escalation runs — sprinklers everywhere (supermarket),
all baggage belts at max speed (airport), crane drops pallets (construction).
It escalates every 10 s so battles reliably end by tick 2,400.

---

## 11. Events and procedural commentary

### 11.1 Battle events

The sim emits typed events: `spawn`, `move` (sampled, client-only), `attack`,
`hit`, `crit`, `statusApplied`, `statusExpired`, `pickUp`, `throw`,
`propBroken`, `spill`, `explosion`, `downed`, `revived`, `ko`, `panic`,
`foul`, `card`, `refereeDown`, `ruleFired(ruleId)`, `hazardStart`,
`suddenDeath`, `battleEnd`. Every event carries `tick`, actor, target, and a
`cause` chain (up to 3 links: e.g. `ko ← hit ← thrownProp ← push`). The cause
chain is what makes commentary able to say *why* something happened.

### 11.2 Moment detectors

`packages/commentary` runs **detectors** (content: `commentary/detectors/*.json`)
over the event log and the characters' histories. Each detector produces a
`Moment` with a `score` (how noteworthy) and slot values. Examples:

| Detector | Fires when | Score |
|---|---|---|
| `ironic-ko` | KO cause chain includes a prop tagged with the victim's own `role:` (firefighter KO'd by fire) | 90 |
| `referee-down` | `refereeDown` | 85 |
| `friendly-fire-ko` | ko by ally | 75 |
| `rival-defeated` | ko where relationship = rival/nemesis | 80 |
| `clutch` | winner's last character had < 10% HP | 70 |
| `career-cleanup` | one career type got all KOs | 60 |
| `chain-reaction` | a cause chain of length ≥ 3 | 65 |
| `upset` | lower-rated team won by > 150 rating | 60 |
| `explosion` | a prop exploded (credits whoever set it off) | 60 |
| `rideHit` | someone rode a trolley/chair into another character | 70 |
| `healedEnemy` | a healer patched up the other team (e.g. medic first-aid rule) | 64 |
| `card` | the referee showed a yellow card | 62 |
| `panic` | a character's morale collapsed | 58 |
| `massStatus` | ≥ 3 characters share a status not caused by a hazard | 50 |
| `flawless` | winners lost nobody | 40 |

### 11.3 Templates

```json
{
  "id": "tpl.ironic-ko.1",
  "moment": "ironic-ko",
  "text": "commentary.ironic-ko.1",
  "slots": ["victim.name", "victim.careerTitle", "cause.propName"]
}
```

`en.json`: `"commentary.ironic-ko.1": "{victim.name} the {victim.careerTitle} has been defeated by a {cause.propName}. Professional embarrassment is total."`

Selection uses a PRNG forked from the battle seed (`fork("commentary")`), so
the same battle always produces the same report. The report shows a
**headline** (top moment), 3–5 highlights, per-character lines, and MVP.
Each highlight links to its tick in the replay.

### 11.4 Measuring "story density"

The balance tool reports, per arena/career: mean moments with score ≥ 60 per
battle (target 3–6), and the distribution of detector types (no single
detector > 30% of headlines). This turns "is it funny?" into a tunable metric.

---

## 12. Worked example (Supermarket, 3v3, ~70 s)

Team A: Chef (Aggressive), Firefighter (Helpful), Accountant (Coward).
Team B: Electrician (Chaotic), Janitor (Lazy), Influencer (Confident).

1. **t=2 s.** Janitor's passive spawns a wet-floor spill near their spawn
   (their active *Mop Slide* needs it). Influencer taunts; Chef (Aggressive)
   takes the bait and charges.
2. **t=9 s.** Chef uses *Flambé* (cone, fire) on the Influencer. A cardboard
   display (`burn`) catches fire. Rule `fire-spreads` → a second display burns.
3. **t=14 s.** Firefighter's utility for *Hose Down* spikes (`preferTargetsWithTags: state:burning`) — the best cluster contains the burning displays *and* the Chef. Everyone in the cone is Wet, including the Chef.
4. **t=15 s.** Electrician (Chaotic, `chaos` weight high) uses *Live Wire* on the wet cluster. Rule `water-conducts-electricity` chains: Chef and Firefighter Electrified. Commentary cause chain: `electrified ← wet ← hoseDown(ally)`.
5. **t=22 s.** Accountant (Coward) has hidden behind a shelf the whole time. Morale OK. Throws a calculator (the only prop in reach; Coward prefers ranged options). Misses (Throwing 4), hits the **referee**.
6. **t=40 s.** Janitor rides a shopping trolley through the wet-floor spill (slipping + ride), knocks down both the Firefighter and their own Influencer (friendly fire).
7. **t=58 s.** Stray trolley hits the referee (already at low HP): `refereeDown`. Sudden death moves to 75 s.
8. **t=70 s.** Accountant, last on Team A, finishes the downed-then-revived Janitor with a stapler. Clutch win.

Report headline (detector `referee-down`, 85): *"The referee has lost
control."* Highlights: `friendly-fire-ko` (Janitor), `chain-reaction`
(hose → wire), `clutch` (Accountant). Post-battle: Accountant progresses
toward trait *Never Lost A Duel*; Janitor and Influencer relationship score
drops (future *rival* candidate).

None of this was scripted: it came from ~6 interaction rules, 3
personalities and 6 abilities.
