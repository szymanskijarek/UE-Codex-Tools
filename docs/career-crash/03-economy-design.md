# Career Crash — Economy & Progression Design (v0.1)

Status: draft for implementation. Owner of: currencies, rewards, XP curves,
career unlocks, roster size, matchmaking/rating, offline rewards, monetization.
All numbers live in `content/economy/*.json` and are read by
`packages/game-rules`; this document gives their **starting values** and the
reasoning behind them.

---

## 1. Economy goals

1. **A 5-minute session always has something meaningful to do**: collect,
   watch one replay, make one progression decision, attack 3 times.
2. **Daily return is driven by curiosity** (what happened to my defence? what
   did my characters become?) more than by timers.
3. **Progression is about breadth, not height.** A day-60 character is more
   *interesting* than a day-1 character, only modestly stronger. Power gap
   between a max-level and a level-1 character at equal gear: ≤ 1.6×
   effective combat value. Matchmaking does the rest.
4. **No power for money, structurally** (§6).
5. Every source and sink is logged in the ledger (01 §6.3) so the economy can
   be audited and simulated.

---

## 2. Currencies

| Currency | Earned by | Spent on | Notes |
|---|---|---|---|
| **Cash** (soft) | Battles, offline pay, daily jobs | Recruiting, retraining, equipment, roster slots | Main loop currency. |
| **Reputation** (rep) | PvP wins, discoveries | Unlocking careers from the Job Board, arenas | Never lost; not to be confused with rating. |
| **Tickets** | Regenerate: 1 per 20 min, cap 10; daily login +5 | Rated attacks (1 each) | Paces PvP; unrated friendly battles are free. |
| **Gold Stars** (premium) | Purchase; small free drip (achievements, season track) | Cosmetics only | §6. |

Character **XP** and per-career **Experience** are not currencies (not
transferable) and are covered in §3.

---

## 3. Character progression

### 3.1 Levels and XP

- Characters earn XP from every battle they take part in, attack or defence:
  `win 100 / draw 60 / loss 40`, +10 per KO, +20 MVP, ×0.5 for defence
  battles (they happen without the player's attention).
- XP to next level: `xpToNext(L) = 100 + 40 × L + 4 × L²`. Level cap 50.

| Level | Cumulative XP | ≈ Battles (avg 70 XP) | ≈ Time at 12 battles/day incl. defence |
|---|---|---|---|
| 5 | 920 | 13 | ~1 day |
| 12 | 5,764 | 82 | ~1 week |
| 22 | 24,584 | 351 | ~1 month |
| 35 | 81,940 | 1,171 | ~3 months |
| 50 | 215,600 | 3,080 | ~8–9 months |

Characters rotate (a roster of 8–15 shares battles), so per-character pace
is slower than the table; the table is per-active-character.

### 3.2 Career milestones

**Career slots unlock at levels 1 / 5 / 12 / 22 / 35.** Level 1 is the origin
career. The spacing gives a new decision on day 1, a second around day 7,
then at roughly 1 and 3 months — each milestone is an *event* the player looks forward to.

At a milestone the game offers **3 career options** drawn from:

- careers the player has unlocked (Job Board, §4), filtered by prerequisites;
- weighted toward careers that *share tags* with the character's existing
  careers (so paths feel coherent: Mechanic → Engineer is likely), with
  one "wildcard" slot from anywhere (so Mechanic → Astronaut → Conspiracy
  Podcaster is possible).
- One free reroll per milestone; further rerolls cost Cash
  (`200 × milestoneIndex`).

Choosing is permanent. That is the point: characters have histories.

### 3.3 Level-up stat points

+1 stat point every level (player-assigned, capped at +10 into any one stat
over a character's life). With careers contributing up to ~+15 net, a
level-50 character totals roughly base 60 + 50 + 15 = 125 stat points vs 60
for a fresh recruit. Health/damage scaling is linear and gentle (§02 §3), so
effective power is ≈ 1.5×, inside goal 3.

### 3.4 Retraining and retirement

- **Retrain** the *latest* career only, at `2,000 × careerCount` Cash, once
  per 7 days per character. Older careers are history and stay.
- **Retire** a character: they leave the roster, grant a one-off Cash payout
  (`25 × level²`) and a permanent **Hall of Fame** entry (portrait, careers,
  record, best commentary lines). Retired characters may appear as
  "mentors" to new recruits: a recruit can inherit one non-stat trait.

### 3.5 Traits

Traits are earned from play (02 §8.4). Max 4 per character. The player can
**lock** up to 2 traits (free) so they are never replaced; others rotate
oldest-first. No purchase path touches traits.

---

### 3.4 Career ranks and skill trees (v0.8)

Each career a character holds ranks up on its own from the battle XP earned
while it is their current career: **Trainee → Junior → Senior → Lead → Head**
at 0 / 200 / 550 / 1100 / 1900 career XP. A career's tree has 1 skill point at
Trainee and +2 per rank (9 at Head). Trees are generated from the career
(`game-rules/skills.ts`):

| Row (rank) | Nodes |
|---|---|
| Trainee | main move (free) · passive (1) · +2 best stat (1) |
| Junior | reflex perk (parry/evade/dash by career style, 1) · first extra move (2) |
| Senior | +2 second stat (1) · second extra move (2) |
| Lead | Mastery capstone: +1 to every stat the career boosts (2) |

Battle snapshots carry `unlocked` (only those career moves fight) and
`defenseBonus`; stat perks are folded into stats. Snapshots without `unlocked`
(Sandbox, legacy) keep everything.

### 3.5 Offline career mode and difficulty (v0.8)

The standalone client opens on **Career**: create a main character (pick one of
28 starting jobs, name, personality, difficulty), climb a ladder of stages (4 per
arena, every 4th a boss), spend stat and skill points, take new careers at level
milestones. Agency temps fill the squad until the main character reaches
**Senior** in a career; then the **Squad** screen unlocks: hire applicants
(💵 250/450/700 by rarity, refreshed after each win, roster cap 6), pick the two
who fight, and grow their own trees. Results are applied by re-simulating the
pending battle, so replays can't be gamed.

Difficulty shapes opponents, never the player:

| | Level | Rank | Skills spent | Stats | Rewards | Typical win rate |
|---|---|---|---|---|---|---|
| Relaxed | −1 | −1 | 30% | −2 | ×0.8 | ~90% |
| Normal | ±0 | ±0 | 70% | −1 | ×1.0 | ~68% |
| Hard | +1 | ±0 | 100% | ±0 | ×1.3 | ~32–45% |
| Brutal | +2 | +2 | all unlocked | ±0 | ×1.7 | ~10–35% |

## 4. Unlocks

### 4.1 The Job Board (careers)

- Start: **20 tier-1 careers**; the player's starting three recruits roll from
  a curated 10.
- The Job Board shows 6 locked careers at a time; unlocking costs Reputation
  (tier 1: 150, tier 2: 400, tier 3: 1,000). Refreshes daily; one pinned slot.
- Some careers unlock by *achievement* instead (e.g. `career.forklift-operator`
  unlocks when any character earns *Forklift Certified*). These are listed as
  "rumours" with vague hints — part of discovery.

### 4.2 Masteries

Hidden until discovered. Discovering a mastery (first character on your
account to meet the combo) grants: 300 Rep, a collection entry, and — if first
in the world — a **permanent "Discovered by"** credit on the mastery's wiki
page in-game (`discoveries` table). Undiscovered masteries show a silhouette
count per career ("This career is part of 3 masteries").

### 4.3 Arenas, equipment, cosmetics

| Unlock | Source |
|---|---|
| Arenas | League promotion (§5.3) — 3 at start, +1 per league, event arenas timed. |
| Equipment | Cash shop (rotating daily, 6 items), battle drops (15% per win), found-item trait ("Favourite Weapon") gives a copy. |
| Cosmetics | Season track, achievements, Gold Stars shop. |
| Titles | Achievements and commentary milestones ("Referee Menace": KO'd 10 referees). |
| Roster slots | Start 6; buy up to 15 with Cash: `1,000 × (slot − 5)²`. |

---

## 5. PvP: matchmaking, rating, leagues

### 5.1 Rating

Elo-like, per mode. K = 32 below 1,400, 24 up to 1,800, 16 above. **Defence
losses count at half K** (the defender wasn't present), defence wins give
the full gain — defending is rewarding, not punishing.

### 5.2 Opponent selection

`GET /opponents` returns 3 cards: **Easy / Even / Hard**, chosen from
defences within ±50 / ±100 / +100..+250 rating, also filtered to power
within ±20% of the attacker's selected team power, excluding opponents
attacked in the last 24 h. Rewards scale with difficulty (§5.4). If the pool
is thin (early launch), fill with **ghost defences**: frozen snapshots of
real players' past defences at similar rating, flagged as such (no rating
change for the ghost's owner). v0.1 fills with deterministic bot teams
(`botTeam()` in game-rules, level scaled from rating). Within a band, real
players are always preferred over bots; bots only fill empty bands.

### 5.3 Leagues

Intern → Junior → Associate → Senior → Manager → Director → Executive → CEO.
Promotion thresholds at rating 1,100 / 1,250 / 1,400 / 1,550 / 1,700 /
1,850 / 2,000. Seasons last 4 weeks; soft reset toward 1,000 by 50%.
Season rewards: Cash, Rep, cosmetics by peak league.

### 5.4 Battle rewards

| Outcome | Cash | Rep | XP (per char) |
|---|---|---|---|
| Attack win vs Easy | 60 | 4 | 100 |
| Attack win vs Even | 100 | 8 | 100 |
| Attack win vs Hard | 160 | 14 | 100 |
| Attack loss | 25 | 1 | 40 |
| Defence win (settled offline) | 40 | 3 | 50 |
| Defence loss | 10 | 0 | 20 |

Plus: first 3 wins of the day ×2 Cash ("overtime"). With 10 tickets/day and
regen, a daily active player makes ~10–14 attacks.

---

## 6. Monetization

### 6.1 Rule

**Nothing purchasable changes battle outcomes.** Enforced structurally:

- Gold Stars can only be spent on SKUs whose target entity type is in the
  allowlist `{cosmetic, portrait_frame, victory_animation, title_style,
  outfit_variant, arena_skin, replay_theme, name_change}`.
- Those entity types have **no fields the sim reads**. The content compiler
  rejects any cosmetic with stat mods, tags, abilities or rules.
- There is no Gold Stars → Cash, Tickets, Rep or XP conversion. A unit test in
  `game-rules` asserts the conversion graph has no such edge.

### 6.2 Offer

- Cosmetic shop (rotating) and career-specific outfit variants.
- **Season Pass (optional):** cosmetic track + small Cash/Rep bonuses equal
  on free and paid tracks (the paid track adds only cosmetics).
- Supporter pack: cosmetics + name-colour. No ads during replays; optional
  rewarded ads are out of scope for v1.

---

## 7. Offline rewards and the "while you were away" moment

- Each character not in the player's attack team this session earns **shift
  pay** while the player is offline: `2 Cash × careerTier-sum` per hour,
  capped at **12 hours** of accrual.
- Defence battle rewards (§5.4) accumulate in an inbox.
- On login: one **Summary card** — "While you were away: 7 defences (5W 2L),
  +420 Cash, Accountant earned *Never Lost A Duel*, Janitor became
  Chef's *rival*." One-tap collect. The best defence replay is surfaced first,
  chosen by highest commentary headline score.
- Settlement runs lazily on `/me` or `/rewards/collect` (no per-player cron),
  computed from `last_seen_at`, idempotent per window.

---

## 8. Sources and sinks

**Cash, daily active player (target):**

| Sources/day | Amount |
|---|---|
| Attacks (~12, 60% win, mixed difficulty) | ~1,050 |
| Overtime bonus | ~300 |
| Defence inbox | ~250 |
| Shift pay | ~200 |
| **Total** | **~1,800** |

| Sinks | Cost |
|---|---|
| Recruit from applicant pool (daily 3 applicants) | 500 / 900 / 1,400 by rarity |
| Equipment shop items | 300–1,500 |
| Milestone rerolls | 200–1,000 |
| Retrain latest career | 2,000–10,000 |
| Roster slots | 1,000 → 100,000 |

The roster-slot curve and retraining are the long-term sinks; recruiting and
equipment are the daily ones. Target: a player can afford one "meaningful
purchase" per 1–2 sessions.

**Rep:** ~120/day active → one tier-1 career unlock per day or a tier-2 every
3–4 days. With 20 careers at start and ~100 at launch, the Job Board lasts
months; new careers ship monthly.

---

## 9. Economy simulation

`tools/balance/economy-sim` simulates 1,000 synthetic players for 90 days
with play-pattern archetypes (daily-5-min, daily-30-min, weekend-only,
lapsed-and-returning). Outputs per archetype: level curves, careers unlocked,
currency balances, days to first mastery, and inflation checks (median Cash
balance must not grow unbounded). Runs in CI nightly; parameter changes to
`content/economy/*.json` must include the before/after report in the PR.

Target outcomes:

| Metric | Target |
|---|---|
| First career milestone (level 5) | Day 1, session 1–2 |
| First mastery discovered (daily-5-min player) | Day 7–14 |
| Careers unlocked by day 30 | 35–45 |
| Median unspent Cash at day 60 | < 3 days of income |
