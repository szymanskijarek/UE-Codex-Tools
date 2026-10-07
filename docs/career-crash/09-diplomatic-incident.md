# 09 — Diplomatic Incident (design v0.1)

Status: **phases 1 and 2 built** (§14): 40 countries, the lobby, real likes
counted by the vote service on vote.careercrash.org (phase 2), England–Scotland
derby hours, the page at `/incident/`. Owner decisions are in §13. A second endless floor, after Crypto
Bros (08), at **careercrash.org/incident**: a brawl between countries that
never stops. Each country sends a delegate. Ten of them are on the floor at a
time, and when one is knocked out the next country in the lobby takes their
seat. There's no market data. **Viewers set the power.** During each hour-long
match, anyone can like each country once, and likes make a delegate stronger.

> *"At 14:37 UTC, Portugal threw Canada into the buffet. Canada has requested
> an emergency session."*

Owner of: the Diplomatic Incident page, the queue (lobby → floor), likes and
how they become power, the vote service, anti-abuse, the cast (delegates), the
Summit Hall, the sharing and growth features, and the content rules for
anything that touches real countries. The numbers will live in
`packages/content/data/markets/countries.json`.

It reuses 08's endless mode (re-listing, 5-minute chapters, scene events,
gatecrashers, Rewind, standings) and replaces 08 §12 ("Countries" on market
data): measuring hourly FX or index moves gave noise, and votes give the
crowd something to do.

### Name

**Diplomatic Incident** (decided; short form *the Incident*,
`#DiplomaticIncident`). Every knockout *is* one.
Other names considered: *Summit Smash*, *Flag Fight*, *Border Brawl*, *United
Nations of Punch*, *Countryball Royale*. The URL is `/incident`, and each
country gets its own: `/incident/pl`.

## 1. Goals

- **Your like is visible.** Within five minutes of a like, the country you
  liked is stronger on screen, and you can see the like arriving (§5.4). That
  feedback loop is what makes people come back.
- **Every country gets screen time, every hour.** About 270 delegates walk on
  in an hour (§4.3), so every country (40 to start, ~195 eventually) gets onto the floor at least once.
  Likes decide **how long they last**, not whether they appear. "Your country
  is on in 3 minutes" is a reason to share.
- **Popular usually wins, small can win.** The most-liked country wins the
  hour most of the time (target **55–70%**). Likes count on a log scale (§5.2),
  so a country with a tenth of the likes is weaker but not hopeless. Upsets
  make the best clips.
- **Built to be shared.** Every country, every moment and every hour has a
  link that shows exactly that, plus a preview card worth posting (§8).
- **Everyone sees the same fight.** Deterministic from the session input and
  the clock, as in 08. Likes only change the fight at the 5-minute seams, so
  determinism holds.
- **Pride in difference.** Each delegate wears a loving version of their
  country's national dress and fights with a signature move from its
  culture: a caber toss, a flamenco zapateado, a Muay Thai elbow. Celebrated,
  never mocked: everyone is the hero of their own fans. No real politics, no
  real people (§9).
- **The house privacy promise holds.** No cookies, accounts, tracking or
  third-party scripts. A like needs a random token and a one-off proof of
  work (§6).

## 2. The page

| Part | What it shows |
|---|---|
| **The floor** | *The Summit Hall*: a horseshoe of conference tables, translation booths, a row of flagpoles, a buffet, a press pen and the Chair's podium. Ten delegates, free-for-all. Each on-floor country's flag hangs on a pole and is lowered when they're knocked out. |
| **Lobby strip** (under the floor) | The next ~12 countries in the queue, flags and portraits, with "on in ~40 s" estimates. Waiting delegates mill about, check their phones and eat canapés. |
| **Like bar** | The followed country's big **👍 Like** button, its likes this hour, and its *pending* likes ("+312 arriving at 14:40"). After you like, a 🛂 stamp lands in your passport (§8.5). |
| **Search** | Any country by name in your own language (`Intl.DisplayNames`). Choosing one follows them: the camera follows them on the floor, otherwise the lobby strip highlights them with their place in line. |
| **This hour** (side panel) | Standings by **influence** (§4.5), each row with likes and a sparkline of likes per session. |
| **Session clock** | The hour as 12 sessions of 5 minutes, with the current one lit. Each finished session shows its winner's flag. |
| **Feed** | Communiqués, press releases and comments in the house LinkedIn-parody voice (§10). |
| **Boards** | *This hour*, *Today*, *This week*, and **Punching Above Its Weight**: likes per head of population (§7.3). |
| **Rewind** | Any of the last 48 hours, played from the start. |
| **Footer** | "Not diplomacy. Not advice of any kind." What a like stores (§6.4). No cookies. |

Mobile first: the floor on top, then the like bar (always within thumb
reach), the lobby strip, and the panels in tabs. Sound is off until tapped.

## 3. The hour

Wall-clock UTC, as in 08 §3. Every viewer is in the same moment.

| Time | What happens |
|---|---|
| **:00:00 Opening Ceremony** (~12 s) | Flags are raised for the opening ten, and the Chair bangs the gavel: "This session is now in order." Last hour's winner walks on first. Likes reset to zero (§5.1). |
| **Sessions 1–12** (5 min each) | Continuous brawl. KO'd delegates leave the floor and the next in line walks on (§4). Scene events every 30–55 s (§7.1). |
| **Recess** (last 4 s of each session) | The Chair's gavel, "We'll take a short recess." Everyone freezes, the lights dip, and the session winner gets a sparkle. Likes cast during the session apply from the next one (§5.3). |
| **:59:15 Closing Ceremony** (~45 s) | Fighting stops. Podium by influence, and the winner gets the **Resolution**: a giant rubber stamp and a framed certificate. Last place carries the minutes. The winner's communiqué goes up in the feed and the Hour Card is drawn (§8.3). |

## 4. The floor and the queue

### 4.1 The seats

Ten seats (`floor: 10`; 8 on low-end phones is a client-only setting that
hides two, but the sim always runs ten). When a delegate is knocked out:

1. They're **escorted out** by Summit Security (carried, as in 08's cleaner),
   and their flag is lowered.
2. After **4 s** the next country in the lobby **walks on** through the
   double doors at the free seat's spawn, with a 2 s shield. Their flag goes up.
3. The knocked-out country goes to the back of the lobby.

The floor never holds fewer than nine for more than a few seconds, and nobody
re-lists in place: the cast keeps changing.

### 4.2 Lobby order (the agenda)

At the start of each session the next session's agenda is fixed (§5.3): the
order in which waiting countries will walk on. Each country's **priority** is:

```
priority = waited_s                         # seconds since they last left the floor
         + lobbyBoost × log2(1 + likes)     # likes buy a little queue-jumping
```

Waited time dominates, so the queue is a fair rotation and liked countries
only get back sooner. `lobbyBoost` is set so that ~1,000 likes is worth
~90 s of waiting. Two seats work differently:

- **The Host seat.** One seat belongs to the **host country**: whichever
  country (with ≥ 1 like this hour) has its local time closest to 20:00. It
  changes every hour and goes around the world once a day. The host walks on
  at the Opening Ceremony, gets a small home advantage
  (`status.pumped` for 60 s at each entrance), and a host-only feed post.
  Whole regions get a turn to be prime time.
- **The Wildcard seat.** Every third walk-on goes to a random country with
  fewer than the median likes, drawn from the session seed. Small countries
  get a guaranteed slice of screen time, and an upset is a news story
  ("BREAKING: Tuvalu has knocked out three G20 delegations").

Countries with **no likes at all** stay in the rotation, at base power. A
silent country still shows up, it just doesn't last.

### 4.3 How much screen time that gives

Crypto Bros measures about 23 knockouts per 5-minute candle with ten fighters.
That's ~270 walk-ons an hour (measured: ~26 a session, ~310 an hour) against 40 countries now and ~195 eventually, so every country gets on
at least once an hour with room to spare, and well-liked ones stay on longer
and come back sooner. Phase 1 (§12) measures it, and the balance run checks
it (§11): **every country on the floor at least once per hour in ≥ 99% of
simulated hours.**

### 4.4 Engine change: the queue

08's endless mode brings the *same* fighter back. This needs a new engine
concept (AGENTS rule 5):

- `EndlessInput.queue?: CharacterSnapshot[]`: the agenda, in order, plus
  `walkOnTicks` (the gap before the next one walks on).
- On a KO, after `walkOnTicks`, the floored entity is **removed** and the next
  snapshot in the queue is **spawned** at that seat, as a new entity with a new
  id and a `walkon` event. The removed delegate's snapshot isn't re-queued
  inside the session, because the agenda for the next session is rebuilt
  outside the sim (§5.3).
- If the queue runs dry (it shouldn't, since sessions carry ~30–40), fall back
  to 08's re-listing for that delegate.
- Grudges: a walk-on's `grudge` starts at whoever floored the last delegate
  *of the same country this hour* (carried in the snapshot), so feuds survive
  the rotation ("Portugal is back, and it remembers").
- Tests: a unit test (a queue of 3 behind a floor of 2 → walk-on order, ids,
  events), a property test (entity count ≤ floor + carried at every tick), and
  a golden (`countries-calm`, `countries-landslide`). `SIM_VERSION` bump;
  crypto goldens unchanged.

### 4.5 Influence (standings)

| | Influence |
|---|---|
| KO dealt | 3 |
| Session won (most influence in the session) | 5 |
| Damage | 1 per 100 |
| Seconds on the floor | 1 per 20 s (staying power is worth something) |
| Being KO'd | −1 |
| KO dealt by a Wildcard | ×2 |

The hour's winner is the country with the most influence. Ties go to fewer
likes: the underdog wins the tie.

## 5. Likes → power

### 5.1 The rule

- **One like per country, per viewer, per hour.** A viewer can like as many
  countries as they want, each once. Likes reset at :00.
- **Likes are not exclusive.** Liking every country changes nothing,
  because power is relative to the field (§5.2). That's what makes a like a
  choice without forcing anyone to pick only one.
- **No dislikes.** A "boo" or "sanction" vote turns countries into targets of
  organised hate. Rejected on purpose. Everything you can do *helps* someone.

### 5.2 The score

Raw likes can't be used directly: a country of 1.4 billion would win every
hour. So the score is logarithmic and relative, the same shape as 08 §5.1:

```
s(c)    = log2(1 + likes(c))                       # 0, 1, 1.6, 2, … 10 at 1,023 likes, 20 at ~1M
mid     = median of s over every country that got ≥ 1 like this hour
spread  = median absolute deviation of s over the same countries (floor: 1.0)
score   = clamp((s(c) − mid) ÷ spread, −2, +2)
```

| Score | Effect |
|---|---|
| any | **Power**: level and stat points around a shared base, ±18 levels and ±140 stat points at ±2 (08's tuned swing, re-checked in §11). |
| ≥ +1.5 | **Mandate**: starts each entrance `pumped`, a gold sash, louder barks. |
| = +2 (top of the hour so far) | **Chair of the Session**: a gold laurel and the crown from 08 §4.3. Everyone wants a piece of the leader. |
| no likes | **Abstained**: the lowest score (−2) and an "ABSTAINED" placard. Still fights. |
| ≤ −1.5 | **Under-represented**: starts each entrance `embarrassed`. |

The mapping table lives in `countries.json` (AGENTS rule 3). The scoring
function is pure and tested (`game-rules/src/votes.ts`).

Log scale in practice: 10 likes vs 1,000 is a ~6.6 point gap in `s`. Against a
typical field spread of ~2–3 that's about +1.5 score for the bigger one: clearly
stronger, still beatable. 100,000 vs 1,000,000 is only 3.3 points apart. A
huge country can't buy the floor, and a brigade gets less back for every like.

### 5.3 Sessions are the seams

Determinism (01 §4) needs everyone to simulate the same input, so likes can't
change a fight in progress. They apply at the next session:

```
session n runs   14:35:00 – 14:40:00
tallies frozen   14:39:45            (likes after this count for session n+2)
input published  14:39:50            /incident/2026-10-06T14/s08.json
session n+1      14:40:00 – 14:45:00 using the tallies frozen at 14:39:45
```

The **session input** (~6 KB) holds everything a client needs: the seed, the
ten on the floor at the start (carried over from the end of session n, at
full health after the recess), the agenda (the next ~40 countries, built
from priority, §4.2), each one's score, flags and power, the host, the
wildcards, the content hash and sim version. The server builds it by
**simulating session n headless** as soon as session n's input is out, so it
knows who is on the floor at the seam. That's ~0.3–0.6 s of CPU every 5 min
(measured on 08's floor).

A viewer who arrives at 14:37 fetches `s08.json` and catches up from 14:35
in a Web Worker, as in 08 §4.2. Standings for earlier sessions come from
`hour.json`, which the server appends to after each session.

### 5.4 Making a like feel immediate

The fight only changes at the seam, so the page closes the gap:

- **Instantly:** a 👍 burst over the delegate (or their lobby card), the
  stamp in the passport, and "+1 · arrives in 2:31".
- **Live pending count:** "+312 likes arriving at 14:40" under the followed
  country, polled every 10 s (§6.2). Watching your country's number climb
  before a seam is the suspense.
- **At the seam:** **Reinforcements**: each country whose score jumped by ≥ 0.5
  gets a "📈 SURGE" placard and a quick power-up flash as the session starts,
  with a feed line ("Ireland's likes just doubled. Ireland has removed its
  jacket."). Every viewer sees the crowd's effect at the same moment.

## 6. The vote service

### 6.1 Shape

```
careercrash.org/incident                       static page (apps/client, like /cryptobro)
vote.careercrash.org                           Worker career-crash-votes (apps/votes, new)
  POST /token          proof of work → signed device token (valid 7 days)
  POST /like           { token, country, hour } → 204, or 409 if already liked
  GET  /live/<hour>    pending + frozen likes per country   (edge-cached 5 s)
  GET  /incident/<hour>/s<NN>.json   session input           (immutable, edge-cached forever)
  GET  /incident/<hour>/hour.json    standings so far, Hour Card data
  GET  /incident/hours.json          last 48 hours, for Rewind
Durable Object HourTally   one per hour (name = hour), SQLite-backed
  likes(token_hash, country) PRIMARY KEY   ← dedupe
  counts(country, session, n)              ← tallies
  alarm at :mm:45 of each session          → freeze, simulate, publish the next input to KV
KV career-crash-feed   (existing)          ← published inputs and hour files, 49 h TTL
```

- **One Durable Object per hour** is enough to start: a SQLite DO handles on
  the order of 1,000 writes per second, about 3.6 M likes an hour. The plan
  for more: **shard by country** (`HourTally:<hour>:<shard>`, 16 shards),
  with the alarm in shard 0 merging counts. Build it sharded-ready (the key
  includes the shard), deploy with 1.
- **The DO is the clock-keeper**: its alarm freezes, simulates and publishes,
  so there's no cron jitter. If an alarm fails, the next viewer's
  `GET s<NN>.json` miss triggers the DO to publish it, idempotently.
- **If publishing is late,** clients fall back to "same powers as the last
  session" with a "🗳️ Counting delayed" banner, exactly like 08's delayed data.
- The worker imports `@cc/content` and `@cc/game-rules` like `apps/markets`.
  It could live inside `apps/markets`, but a separate Worker keeps the
  write-heavy vote path away from the crypto feed and its own rate limits.

### 6.2 Load

Reads go to the edge: `/live` is cached for 5 s per colo and session inputs
are immutable, so a million viewers mean a few thousand origin hits per
minute. Writes are one DO request per like. At a viral 1 M likes an hour that's
~720 M requests a month: roughly **$100–150/month** on Workers + DO pricing.
`countries.json` gets a `maxLikesPerHour` safety valve: past it, likes are
counted at a sample rate (1 in N, scaled back up), so the bill has a ceiling.

### 6.3 Anti-abuse

Likes are the attack surface. Fake likes buy less and less (log scale, §5.2),
which already removes most of the incentive. The rest:

| Layer | What it does |
|---|---|
| **Proof of work for a token** | `POST /token` needs a hashcash-style proof (~1–2 s on a phone, in a Web Worker). Cheap for a person, expensive for a farm of a million tokens. Token = HMAC(server secret, random id, issue day). |
| **One like per token per country per hour** | The DO's primary key. |
| **Per-IP soft cap** | Tokens are tallied per hashed `/24` (IPv4) or `/48` (IPv6) per hour, with an hourly salt, kept in DO memory only and dropped at :00. Past ~200 likes per network per country per hour, further likes count at ¼. Caps are soft, so a university or mobile carrier still counts. |
| **Cloudflare rate limiting rule** | On `/token` and `/like` (as in `PIPELINES.md` §7.1 step 6). |
| **Turnstile, as an escalation** | Off by default because it's a third-party script and the privacy page promises none (§6.4). A KV flag can switch it on for `/token` during an attack, with the privacy page updated to say so. **Owner decision**, §13. |
| **Anomaly flag** | If a country's likes jump above 20× its trailing average in one session from fewer than 50 networks, the alarm counts that session's likes for that country at ¼ and logs it. |
| **Kill switch** | KV `incident/config`: freeze likes (powers stay as they are), disable rivalry posts, or show a holding page. |

### 6.4 Privacy

The page keeps the house promise: no cookies, no analytics, no ads, no
third-party scripts. What a like stores, in plain words on `#/privacy` and in
the page footer:

- **In your browser:** a random token and the countries you liked (your
  passport). Clearing site data deletes them.
- **On our server:** a one-way hash of the token next to the countries it
  liked this hour, deleted after 2 hours. Your network address, hashed with a
  salt that changes every hour, used only to stop floods and never stored to
  disk. Totals per country, kept.
- No accounts, no location lookup. The country you like is the one you chose,
  not the one you're in.

## 7. The floor's life

### 7.1 Scene events (08 §6's system, Summit flavour)

Rolled from the session seed every 30–55 s. Most are reskins of crypto events
that already exist in the sim.

| Event | Built from | What happens |
|---|---|---|
| **Coffee Break** | Airdrop | Catering trolleys roll in; coffee and pastries everywhere. |
| **Fire Drill** | Rug Pull | Alarm, everyone is pushed towards the exits; whoever's slowest gets trampled. |
| **The Family Photo** | (new, cheap) | Everyone freezes in a line for the summit photo. A camera flash, then chaos resumes. The client grabs the frame as a shareable "official photo" (§8.4). |
| **Interpreters' Strike** | FUD Cloud | Barks turn into gibberish in a zone; everyone in it is `spooked`. |
| **Seating Plan Reshuffle** | Whale Alert | The floor tilts; delegates slide to new seats. |
| **Buffet Trolley** | Bull Run | A runaway trolley crosses the hall and tosses whoever's in the way. |
| **Motorcade** | Black Swan | Rare. A black car noses through and goes for the Chair of the Session. |
| **Red Tape** | Gas Spike | A taped-off zone: abilities cost double inside it. |

### 7.2 Gatecrashers: the Institutions (owner's direction 6 Oct; all ten built 7 Oct, §14)

The summit's gatecrashers aren't venue staff (07) but **the institutions**:
international bodies and global industries who barge into the brawl,
**react to what's on the floor**, and leave having changed very little. The
joke is always on the institution's reputation, never on a country or a
people, and never about a real event, war or real person.

#### How they differ from 07's gatecrashers

| | 07 (career fights) | Institutions (here) |
|---|---|---|
| When | 10% of fights, at a random tick | **When the floor matches their trigger** (§7.2.3), at most one visit a session, ~5 an hour as built |
| How they fight | Fight everyone, stay down | One of four **stances** (§7.2.2): most don't really fight |
| How they leave | Knocked out | Most **leave on their own** (they walk or ride out), having changed nothing |
| Score | None | None, but the visit is a feed event and a 📸 moment |

#### 7.2.1 The cast

Each is a leader plus up to two henchmen, as in 07, with personas
(`npc.inst-*`), no emblems or logos (colours and costume only), and their own
lines and posts.

| Institution | Trigger (context) | Stance | What happens | Exit line |
|---|---|---|---|---|
| **The UN Peacekeeping Mission**: a Special Envoy in a sky-blue suit and two peacekeepers in sky-blue helmets with clipboards | The floor gets busy: 3+ knockouts in 20 s | **Skirmish** | Step between fighters and draw aggro (taunt), take a beating, deal no damage, hand out "deep concern" (`lectured` on everyone nearby). At half health they leave by the fire exit. | "We call on all parties to show restraint." *(leaves)* |
| **NATO, the Alliance**: an immaculate official riding a white **Moral High Horse**, with two aides on foot | **No NATO member standing on the floor** | **Aloof** | Rides a lap of the hall on the horse (a rideable prop), keeps out of reach of everyone, never lands a blow, gives a speech about values. If a NATO member walks on mid-visit, they leave at once ("Not our jurisdiction, actually it is, but…"). | "We stand ready to stand ready." *(rides off)* |
| **The ICC**: two **gendarmes** in post-war Belgian/French uniform (kepi, short cape, white gloves, a whistle), with a magistrate in robes | One country knocks out 3 in 30 s | **Fight (weak)** | March straight at the most violent delegate and try to arrest them (a grapple that roots, `sticky` + `stunned`). They're two levels under the floor, so they get beaten, and they're carried out on the Chair's orders. | "You are all under arr— ow." |
| **Big Oil**: a slick executive in a hard hat over a suit, two roughnecks | Random, more often in a Coffee Break | **Meddle** | Spills oil slicks (`prop.oil-spill`) and a gas canister or two everywhere, sells fuel (energy) to whoever leads the standings, and leaves as things catch fire. | "We'll help with the clean-up. For a fee." |
| **Big Tech**: a hoodie-and-gilet founder (generic, no look-alike) and two growth hackers | **A SURGE** just happened (§5.4) | **Meddle** | An aura that harvests everyone's energy ("data"), hands out phones (`distracted`), and **boosts whoever already has the most likes** (`pumped`): the algorithm amplifies the popular. | "Move fast and break things. Like your jaw." |
| **The Health Authority** (WHO): an inspector in a white coat with a clipboard, two in bright hazmat suits | After Big Oil, or 4+ fighters burning, wet or sticky at once | **Meddle** | Hoses down the floor with sanitiser (`foamed`, `wet`, removes `burning`), cordons off a "quarantine" zone (`sticky`), insists on handwashing. Leaves when the floor is spotless. Strictly handwashing jokes. | "Please maintain a safe punching distance." |
| **The Lenders** (IMF / World Bank): two bankers in pinstripes with a briefcase of cash | The lowest-ranked country on the floor has lost 3 times this session | **Meddle** | Give that delegate a loan (big heal + `armoured`), then 40 s later come back for repayment with interest (energy drained, `embarrassed`). | "Structural adjustment. Mostly to your face." |
| **The Federation** (sports governing body): an official in a gold-buttoned blazer and two "ambassadors" | **Derby hours** only | **Meddle** | Hands a trophy to a random delegate (`pumped`, a 📸 photo op), takes a commission (energy from everyone), and leaves before anyone asks questions. | "Congratulations to the winner. Invoice to follow." |
| **Brussels** (the EU's regulators): two officials with rulebooks and a measuring tape | 5+ EU members on the floor | **Meddle** | **Harmonise**: everyone on the floor is slowed to the same speed and given a pop-up "consent banner" (`distracted`, short). Leave when everyone complies. *(This page has no cookies, which is the joke.)* | "This brawl is now fully compliant." |
| **The Raters** (credit-rating agency): a man in a grey suit with a big rubber stamp | The hour's leader takes the lead by 50+ | **Skirmish** | **Downgrades** the leader (`embarrassed` + a small stat drop for 30 s), flees when anyone hits back. | "Outlook: negative." |

More later in the same mould: the Eurovision jury (gives *nul points*), the
Press Pool (already in §7.2's first draft), the Lobbyists, the Space Agency.

#### 7.2.2 Stances (engine: one general concept, four uses)

A new crasher field, `stance`, with an exit rule:

| Stance | AI | Leaves when |
|---|---|---|
| `fight` | As 07: fights everyone | Knocked out (carried off) |
| `skirmish` | Fights, prefers to draw attention (taunts), never chases far | HP below `leaveAtBp` (e.g. 50%) → walks to the nearest door and is removed |
| `aloof` | Never attacks; keeps away from fighters (the flee goal, permanently); rides a prop if one is given | After `leaveAfterTicks`, or at once if `leaveIf` becomes true |
| `meddle` | Doesn't fight; walks to its aura spot and uses its abilities (auras, spills, buffs) | After `leaveAfterTicks`, or when its job is done |

**Exit:** a new `crashExit` event; the crasher walks to the nearest door
(arena `exits`, two per arena) and is removed when there. The renderer plays a
"swoosh" and the feed reads the set's exit line. Nobody scores for it.

#### 7.2.3 Triggers (engine: evaluated in the sim, so it stays deterministic)

The floor's make-up changes every few seconds (walk-ons), so the trigger is
checked **inside the sim**, every second, against the floor as it is. The
session input carries a short list of candidates (from game-rules, seeded
per session) with their conditions; the first one whose condition holds
comes in, and only one per session.

| Condition | Example |
|---|---|
| `noneTagged: tag` (among those standing) | NATO: no `nato` member standing |
| `atLeastTagged: [tag, n]` | Brussels: 5+ `eu` |
| `koStreak: [kos, withinTicks]` (one side, or anyone) | ICC: 3 KOs by one country in 30 s; UN: 3 KOs in 20 s by anyone |
| `statusCount: [statuses, n]` | Health Authority: 4+ burning, wet or sticky |
| `afterEvent: surge \| derby \| crashExit:<set>` | Big Tech after a SURGE; Health Authority after Big Oil left |
| `leadBy: points` | The Raters |

Countries get **membership tags** in `countries.json` (facts, checked when a
country is added): `nato` (England, Scotland, Wales via the UK; France,
Germany, Italy, Spain, Portugal, Netherlands, Belgium, Poland, Sweden,
Norway, Denmark, Greece, United States, Canada), `eu` (Ireland, France,
Germany, Italy, Spain, Portugal, Netherlands, Belgium, Austria, Poland,
Sweden, Denmark, Greece), `commonwealth`, `g7`, `g20`.

How often NATO comes (measured over 12 simulated sessions, 40 countries, 17
of them NATO members): "no NATO member standing" (knocked-out members count
as not standing) happens about **once an hour**, for a few seconds; "nobody
from NATO even on the floor" never happened. The trigger fires the moment
the condition holds, so NATO turns up roughly once an hour, **just after its
members have all been knocked down**, which is the joke. If that's too rare,
loosen it to "at most one NATO member standing".

**As built (7 Oct):** with the sample likes, the strict rule brought NATO in
about once every three hours, so it is loosened: NATO comes when **at most one
member is standing** (`absentFew: 1`) and leaves when a second one is (after
a ten-second minimum stay, so the horse gets its moment). Measured over six
sample hours (72 sessions): UN 1.7, ICC 1.3, NATO 1.2 and Big Tech 0.8 visits
an hour, about five in all.

#### 7.2.4 Feed and posts

Each institution posts in its own voice after a visit, as 07's sets do:

- **UN:** "Today we visited the Summit Hall to call for calm. We were thrown into the buffet. We remain deeply concerned. #Peace"
- **NATO:** "Proud to have ridden through the Summit Hall today and to have upheld our values from a safe height. 🐴"
- **ICC:** "Arrests made today: 0. Gendarmes hospitalised: 2. Proceedings continue."
- **Big Tech:** "We're humbled to have connected 10 delegates today. Their energy is now ours. Terms apply."
- **Big Oil:** "Proud sponsors of today's fire."
- Comments from delegates: "Who invited them?" · "Did they just… leave?" · "Classic." · "Sending thoughts and prayers. And a bill."

#### 7.2.5 Rules for this satire

- **Punch up, never down:** the joke is on institutions' reputations
  (talking instead of acting, fees, red tape, PR), never on a country, a
  people, or the people those institutions serve.
- **No real events:** no wars, conflicts, pandemics, scandals or real
  operations, in text or art. The Health Authority jokes are about
  handwashing and clipboards, nothing else.
- **No real people, no emblems:** no look-alikes of any official or founder;
  no UN, NATO, EU, ICC, WHO or company logos, emblems or flags in the art.
  Names in feed text are allowed (it's commentary), costumes and colours do
  the rest.
- **Kill switch per institution** (`countries.json` → `institutions[].off`),
  so one can be pulled at once if a real-world event makes it unfunny.

#### 7.2.6 Build plan

1. **Engine** (one change, AGENTS rule 5): `stance` + exit rule + `crashExit`;
   endless `raids` (candidate list with conditions, one per session);
   membership tags on delegates. Unit tests per stance and per condition.
2. **First four**, one per stance: **UN** (skirmish), **NATO** (aloof, with
   the Moral High Horse as a rideable prop), **ICC** (weak fight + arrest),
   **Big Tech** (meddle, triggered by SURGE). Their abilities from existing
   effects; borrowed career bodies until art.
3. **The rest** (Big Oil, Health Authority, Lenders, Federation, Brussels,
   Raters) as content only.
4. **Art:** `career-crash/art/incident/12-INSTITUTIONS_A.md` (the first four
   plus the horse) and `13-INSTITUTIONS_B.md`.

### 7.3 Punching Above Its Weight

Influence divided by log of population (UN population data, bundled once and
refreshed yearly, in `countries.json`). Shown as its own board and in the
Hour Card. Small nations have something to win and something to share,
and nothing in the fight changes.

### 7.4 The Chair

The floor's referee (02 §7.5) is **Madam Chair**, a fictional chairperson
with a gavel and an earpiece. She can be knocked out: "The Chair has lost
control of the session. And consciousness." While she's out, the next scene
event comes sooner.

## 8. Growth: built to be shared

Each feature is designed so a viewer has a reason to bring someone in, and
the person they bring lands on exactly what they were sent.

### 8.1 Country links: "Send help"

`careercrash.org/incident/pl` opens following Poland, with the like button
under your thumb. The **share button** on the like bar writes a message for
the moment:

- On the floor: "Poland is on the floor RIGHT NOW with 3 KOs. Like to keep them standing 👉 careercrash.org/incident/pl"
- In the lobby: "Poland is on in ~2 minutes and needs backup 👉 …"
- Low on likes: "Poland has 12 likes this hour. Twelve. 👉 …"

It uses the Web Share API on phones and copy-to-clipboard elsewhere. Each
country page has its own **preview card** (Open Graph image): the country's
delegate mid-punch, the country's name and the line "Your country needs you."
In phase 3 these are pre-rendered at build time into
`dist-web/incident/<cc>/` (one static HTML page and image per country, a few MB).
In phase 5, a Worker draws a live card ("#3 this hour") at the edge.

### 8.2 Moment links: "Did you see that?"

Every fight is deterministic, so a moment is a URL:
`careercrash.org/incident/?t=2026-10-06T14:37:12Z&follow=pt`. It replays that
exact second, camera on Portugal, for anyone, for 48 hours. A **📎 Clip**
button on any big moment (KO, upset, Surge, a Chair KO) copies the link
together with a one-line caption written by the commentary system ("Portugal
threw Canada into the buffet").

### 8.3 Clips and the Hour Card

- **🎬 Save clip:** the last 8 s, re-simulated and recorded in the browser
  (`canvas.captureStream` + `MediaRecorder`, WebM/MP4) with the page's logo
  and the moment's URL burned in. Shared as a file through the Web Share API,
  so it goes straight into TikTok, Instagram, WhatsApp or X. No server: a
  phone records its own clip.
- **Hour Card** (at the Closing Ceremony): a portrait image with the podium,
  the hour's best upset, the Punching Above Its Weight winner and "Your
  country: #14 (+6)". One tap to share. The card says the hour, so a feed of
  them makes its own story.

### 8.4 The Family Photo

The scene event in §7.1 freezes ten delegates in a summit-photo line-up. The
client takes the frame, adds a caption plate ("Family photo, 14:37 session,
moments before the buffet incident") and offers it as an image. It's the
easiest shareable in the game, and different every time.

### 8.5 The Passport

Every like stamps a page in your **Diplomatic Passport** (local storage only):
one stamp per country, with gold stamps for liking a country in an hour it won, and
visa-style badges ("Liked all of the Pacific Islands", "Liked a Wildcard that
went on to win", "Present at 24 Closing Ceremonies"). The passport is a
shareable image too. It rewards spreading likes around, which keeps the board
friendly rather than tribal.

### 8.6 Rivalry hours and tournaments

- **Derby hours, a synergy special event** (decided; built for
  England–Scotland, §14): in the derby's hours (`derbies` in
  `countries.json`, England–Scotland every third hour), both sides start on
  the floor and **keep their seats all hour** (floored, they come straight
  back instead of queueing), they're each other's rivals (the AI goes for
  them first), and hits between them fire their **own banter**: a persona
  synergy (`synergies/derbies.json`) that shouts a derby line and leaves the
  one who got hit `pumped`. A ⚔️ DERBY banner opens each session. Next
  derbies to add, all friendly sporting rivalries: Australia–New Zealand,
  Argentina–Brazil, Spain–Portugal, USA–Canada, Norway–Sweden,
  Netherlands–Belgium, England–Wales. Never a pair with a live conflict (§9.3).
- **Weekly Summit (Sunday 18:00 UTC):** a 64-country knockout bracket over 6
  hours, seeded by the week's influence, each round a 5-minute floor of 8.
  The bracket fills a page, and the final is an event worth announcing.
- **Continental Cups** once a month, with only that continent's countries in
  the rotation.

### 8.7 For streamers and embeds

- **Overlay mode** `?overlay=1`: a transparent background, no panels, large
  flags, and a QR code to the followed country's like page in the corner. A
  streamer can keep it running all day and tell chat to go and like.
- **Embed** `<iframe src="careercrash.org/incident/embed/pl">`: one country's
  card with a live floor peek and the like button, for fan sites and news
  pieces.

### 8.8 Speaking everyone's language

Country names come from `Intl.DisplayNames` in the viewer's language for
free. The page's own UI strings (~60) get translated into the 12 most-spoken
languages. That's a small job (the house i18n already exists), and it makes
the page feel like it's *for* a Brazilian, Indonesian or Pole, not just about
them. Feed jokes stay English in v1. The text pack is written with
translation in mind.

### 8.9 Cross-promotion

As with Crypto Bros (08 §15 "Career feed link"): after a career fight, a
delegate sometimes posts in the main game's feed with a link card to
`/incident`. Crypto Bros' ticker gets a "🌍 Diplomatic Incident: Japan leads"
chip. The Incident's footer links both.

## 9. The cast and content rules

### 9.1 Who's in: 40 countries to start (decided)

The biggest and most-followed countries, avoiding controversy for now. The
UK plays as its nations, because that's how its fans support it and it
makes the derbies:

| Region | Countries |
|---|---|
| UK and Ireland | England, Scotland, Wales, Ireland |
| Europe | France, Germany, Italy, Spain, Portugal, Netherlands, Belgium, Switzerland, Austria, Poland, Sweden, Norway, Denmark, Greece |
| Americas | United States, Canada, Mexico, Brazil, Argentina, Colombia, Chile, Jamaica |
| Asia–Pacific | Japan, South Korea, India, Indonesia, Philippines, Vietnam, Thailand, Australia, New Zealand |
| Africa | Nigeria, South Africa, Kenya, Egypt, Morocco |

**Held back for now** (owner's call to add later): Israel, Palestine, Russia,
Ukraine, China, Taiwan, Iran, North Korea, Pakistan, Turkey. **Northern
Ireland** is held until its flag is settled: it has no official flag, and the
Ulster Banner that flag sets use is contested.

Keys are ISO codes (`PL`), with `ENG`, `SCO` and `WAL` for the UK nations.
Names come from `Intl.DisplayNames` in the viewer's language (fixed English
names for the three nations).

### 9.2 Delegates: national dress, with pride (decided)

Each country's delegate is its own character, with its own body and heads,
dressed in a recognisable, affectionate version of the country's
traditional or iconic dress, with a summit lanyard on top: a góral
highlander for Poland, lederhosen for Germany, a mariachi charro with a
poncho for Mexico, a kilt and tam o' shanter for Scotland, a bowler hat and
umbrella for England, a flamenco dress for Spain, an áo dài and nón lá for
Vietnam, an agbada for Nigeria. Bodies and faces look like someone from that
country, with natural skin tones and hair, in the same friendly cartoon
proportions for everyone. The full art rules (celebrate, don't mock; no
caricatured features; no sacred dress; no military uniforms) are in
`career-crash/art/incident/README.md`, and every delegate's costume is
written out in the batch briefs there.

Until a delegate's art arrives they borrow a career's body that fits
(England a train conductor, Scotland a builder, Poland a carpenter…), as the
Crypto Bros did.

### 9.3 Country moves (decided)

Every delegate has **two signature moves from their culture**, on top of the
borrowed career's moveset, all built from existing effects (80 abilities in
`abilities/incident.json`). A sample:

| Country | Moves |
|---|---|
| England | **Orderly Queue** (everyone nearby slowed and embarrassed) · **Tea Break** (heal + caffeinated) |
| Scotland | **Caber Toss** (a long throw) · **Bagpipe Lament** (spooks everyone nearby) |
| Poland | **Ciupaga Swing** (the highlander's axe-stick, flat side) · **Pierogi Power** (heal + armour) |
| Germany | **Schuhplattler** (slap-dance stun) · **Punctuality** (armour + caffeine) |
| Mexico | **Luchador Plancha** (off a conference table) · **Mariachi Serenade** |
| Spain | **Zapateado** (flamenco footwork stun) · **Siesta** (heal at low health) |
| Canada | **Sorry!** (the target forgets to hit back) · **Goose Patrol** (two geese) |
| Japan | **Deep Bow** (into someone's chin) · **Karaoke Encore** |
| South Korea | **Idol Choreography** · **Fan Chant** (three superfans) |
| Thailand | **Muay Elbow** · **Tuk-Tuk** |
| Nigeria | **Jollof Wars** · **Afrobeats Groove** |
| Egypt | **Sandstorm** · **Sacred Scarabs** (two scarabs) |

Each also has four catchphrases shouted on walk-on ("Mind the queue.",
"Och, come here!", "Pierogi first, then we fight."). Bodies were evened out
with `statBonus` so no culture is simply better (§11).

### 9.4 Content rules (hard)

- **Celebrate, don't mock.** National dress, sports, food and music are
  shown with affection; the slapstick is in the fight, never in who someone
  is. No caricatured features.
- **No real people:** no leaders, politicians, royals, athletes or
  celebrities, and no look-alikes or names that point at them.
- **No politics, wars, borders, religion or disasters** in any text, art,
  move or event. The one exception is satire of international institutions'
  reputations in the gatecrashers, under the rules in §7.2.5. No sacred dress or ceremonies (no haka), no military
  uniforms, no weapons beyond folk-sports props (a caber, a hurley, a
  ciupaga drawn blunt).
- **No user-written text anywhere.** No chat, no names, no messages. There is
  nothing to moderate except the numbers.
- **Sensitive pairs:** `quietPairs` (phase 2), a list of country pairs between
  which rivalry posts, derby hours and "X knocked out Y" headlines are
  **never** generated. Reviewed monthly, and checked whenever a country is
  added.
- **Kill switches** (§6.3) for rivalry text, likes and the whole page.

## 10. Text and posts

All in the house voice: summit communiqués as LinkedIn posts. Examples of what
`markets/countries-live.json` holds:

- **Walk-on:** "Chile has entered the chamber and immediately sat in the wrong seat."
- **KO:** "We regret to inform you that Belgium has been placed in the buffet."
- **Double KO:** "JOINT STATEMENT: Norway and Kenya have agreed to both lie down."
- **Surge:** "Ireland's likes just doubled. Ireland has removed its jacket."
- **Wildcard win:** "BREAKING: Tuvalu has knocked out three delegations and a catering trolley."
- **Winner's communiqué:** "Humbled to announce that Japan has passed this hour's resolution.
  Grateful to my interpreters, the buffet, and 41,207 of you. Agree?"
- **Comments:** "Point of order." · "Seconded." · "Can we take this offline?" ·
  "Who ordered the canapés?" · "This should have been an email." · "Noted."
- **Barks:** "Objection!", "Point of order!", "I yield!", "Off the record!",
  "Veto!", "Minutes!", "Recess!", "Seconded!"

Never a real event, never a real person, never a dig at a people. Every
template is about one or two delegates *as delegates*.

## 11. Balance

`pnpm balance --incident` simulates hours from recorded or synthetic like
distributions: flat, power-law (a few giants), one brigade, two rivals,
"Tuvalu day".

| Target | Value |
|---|---|
| Target | Value | Measured (phase 1) |
|---|---|---|
| Most-liked country wins the hour | 40–60% with 40 countries (was 55–70% for a smaller field) | **43%** (40 hours) |
| Most-liked country in the top 3 | ≥ 85% | **90%** |
| The hour's winner is one of the 5 most-liked | ≥ 90% | **100%** |
| Every country on the floor at least once | ≥ 99% of hours | **100%** |
| Every delegate within ±25% of an even share (flat likes) | `pnpm balance --incident-flat` | **0.84–1.17** (96 sessions) |
| Knockouts per session | 18–30 | **~25** |

Why the first target moved: with 1/rank likes, the top two or three
countries are all strong, and in a 40-country field one of them nearly
always wins. The country with the most likes winning outright 4 hours in 10,
and the top five winning every hour, keeps "your like matters" true while
leaving room for upsets. Power: ±20 levels and ±300 stat points at score ±3
(`countries.json` → `power`, `score.max`). The lobby churns completely
every session (about 26 walk-ons against 30 waiting), so likes act through
power, not queue position.

## 12. Implementation plan

Each phase ends with `pnpm check`, screenshots of the page (Playwright,
`pnpm dev:client`), and a short report. Nothing goes to prod without the
owner's yes.

### Phase 0: decisions ✅

Settled (§13). The art briefs are in `career-crash/art/incident/`, in small
batches of ten so the image agent isn't overwhelmed.

### Phase 1: offline prototype (no votes) ✅ (as built: §14)

The plan as written, kept for the record; §14 says where the build differs.

| Work | Where |
|---|---|
| Generalise the market floor: pull the shared parts of `markets.ts` (clock, sessions/candles, events, raids, standings) into `game-rules/src/floors.ts`; `markets.ts` keeps crypto scoring. Crypto goldens and `--markets` balance must be unchanged. | `packages/game-rules` |
| Schema: `FloorDef` (shared) with `market` and `votes` sources; `countries.json` with field, seats, posting table, power curve, lobby boost, quietPairs, population | `content-schema`, `content/data/markets/` |
| **Queue in endless mode** (§4.4): `queue`, `walkOnTicks`, `walkon` event, removal and spawn, tests, two goldens, `SIM_VERSION` bump | `packages/sim` |
| `votes.ts`: score (§5.2), agenda priority (§4.2), host and wildcard picks, session input builder, influence tally (§4.5). Pure and tested. | `packages/game-rules` |
| Postings: 8 posting defs, 11 abilities from existing effects | `content/data/abilities/incident.json`, `markets/countries.json`, `locales/en.json` |
| Page `incident.html` → `dist-web/incident/`: floor, lobby strip, standings, session clock, like bar (local only: likes go into a sample tally in memory), search with `Intl.DisplayNames`. Floor on the Office backdrop. | `apps/client/src/incident/` |
| Runtime flagball heads: flag SVG → circle texture + eyes overlay; sash tint. Placeholder eyes drawn in code until the art arrives. | `apps/client/src/replay/` (puppet head override hook) |
| **Measure:** walk-ons per hour, catch-up time on a mid-range phone with 10 + queue, and the CPU time of one session on Workers. | |

### Phase 2: real likes

| Work | Where |
|---|---|
| Worker `career-crash-votes` on vote.careercrash.org, DO `HourTally` (SQLite, alarm-driven publish), routes in §6.1, PoW token, per-network soft caps, anomaly flag, kill switch | `apps/votes` (new), `wrangler.toml` |
| API tests: dedupe, the hour boundary, the freeze at :mm:45, a late alarm, idempotent publish, PoW checks, caps | `apps/votes/test` |
| Client: token in a Web Worker, like and pending count, Surge placards at seams, "counting delayed" fallback | `apps/client/src/incident/` |
| Deploy workflow `.github/workflows/career-crash-votes.yml` (copy of the markets one), launch steps as `PIPELINES.md` §7.3 | |
| Privacy page and footer text (§6.4) | `apps/client/src/screens/Privacy.tsx` |
| Load test: 2,000 likes/s for 10 min against a preview deployment. Write down the DO's limits and costs. | `tools/` script |
| Opening and Closing Ceremony, Rewind (48 h) | client |

### Phase 3: share everything

Country pages and pre-rendered preview cards (build step), share texts, moment
links, 📎 Clip links with commentary captions, 🎬 Save clip (MediaRecorder), the
Hour Card, the Family Photo, the Passport. **Measure:** clip recording on
iOS Safari and Android Chrome (MediaRecorder support differs, with a fallback
to a GIF-like image strip).

### Phase 4: art, sound and life

Summit Hall backdrop and obstacles (intact/damaged/destroyed), 40 delegate body
sheets and heads (in batches of ten: `career-crash/art/incident/`), the Chair, the gatecrasher sets, critter/mover art for the
events (trolley, motorcade), FX (gavel, flag lowering, stamp, SURGE). Two Summit
songs (`music.ts`, a calm one and a "landslide" one when one country holds
> 30% of likes). Delegate voices from `voices.ts`, pitch and pace hashed per
country. The text pack (§10), ~300 lines. Scene events and gatecrashers
(§7.1–7.2).

### Phase 5: competitions and reach

Boards (Today, This week, Punching Above Its Weight), Derby hours, the Weekly
Summit bracket, Continental Cups, overlay and embed modes, translated UI (§8.8),
live preview cards from a Worker, the Crypto Bros and career-feed
cross-promos.

### Rough size

| Phase | Effort (agent sessions) | Risk |
|---|---|---|
| 1 | 3–4 | Queue in the sim; catch-up time with a bigger cast |
| 2 | 3 | DO throughput and the alarm timing; abuse |
| 3 | 2–3 | MediaRecorder on iOS |
| 4 | 2 + art | Art turnaround |
| 5 | 3 | Tournament scheduling |

## 13. Owner decisions (6 October 2026)

1. **Name:** *Diplomatic Incident*.
2. **Countries:** 40 to start (§9.1), the biggest and most popular, avoiding
   controversy (no Israel for now, and the others held back in §9.1). The UK
   plays as its nations; England and Scotland are the MVP.
3. **Character design:** national dress and visible national traits,
   portrayed with respect and pride, plus country-specific moves (§9.2–9.3).
   The flagball-mascot idea is dropped.
4. **Derbies:** yes, as a synergy special event (§8.6), England–Scotland first.
5. **Likes per viewer:** one per country per hour, as proposed.
6. **Turnstile:** off. Proof of work and soft caps only (§6.3).
7. Still open: whether a country can skip the queue on a like surge
   (proposed no), the list of further derbies, and when to add held-back
   countries.

## 14. As built (phase 1)

| Piece | State |
|---|---|
| Page `/incident/` | `apps/client/incident/index.html` → `dist-web/incident/`, entry `src/incident/`. Like bar (your country, likes this hour, likes arriving at the next seam, 👍 Like, 📣 Send help with a ready-made message, 🎥 follow with the camera, search in your language), the chamber strip (ten on the floor with health), the floor, the lobby (next 12, ETA, 🃏 Wildcards), this hour's standings by influence, session clock, communiqués feed, Opening and Closing Ceremony, Recess, SURGE and DERBY banners. Your country is guessed from your browser language (`en-GB` → England), never from location. `?c=pl` follows a country; `?t=` pins the clock as on Crypto Bros. |
| Lobby (sim) | `EndlessInput.seats`, `walkOnTicks` and `resident`: the first ten teams start, the rest queue; a floored delegate is escorted out after 4 s and the next walks on with a shield and their Mandate; residents (derby sides) re-list in place. `walkon` event. `SIM_VERSION` 0.18.0; ordinary fights and crypto floors unchanged (all goldens matched). |
| Persona synergies (sim) | Synergies can name a persona (`npc.*`) as well as a career, so two delegates can have banter of their own (the derby). |
| Likes → power | `game-rules/src/incident.ts`: integer log2 (identical in every browser), score against the median of liked countries, clamped ±3; Mandate at +1.5, Abstained (no likes) at −2; host seat (local time nearest 20:00), Wildcard every third lobby place, derby pair first. |
| Likes (prototype) | Other viewers' likes are a seeded sample that grows through the hour (`sampleTally`); yours are kept in this browser only, one per country per hour, and count from the next session, exactly as the real service will. Phase 2 replaces the sample with the vote service. |
| Sessions | Each session is lined up from the likes frozen at its start (a fresh seeded lobby order each session), not carried over from the previous session's end: a joining viewer only simulates the current session (0.5–0.75 s in headless Chromium). Carrying the floor across seams waits for the vote service, which will publish each session's input (§5.3). |
| Cast | 40 delegates (`markets/countries.json`, `npc.del-<key>`), each with a borrowed career, two moves (`abilities/incident.json`), four catchphrases, colour, flag, time zone and population. The Observer stands in for countries without a delegate; Madam Chair referees. |
| Arena | `arena.summit-hall`, `marketOnly`, the Office's layout and backdrop until the Summit Hall art arrives. Scene events: Coffee Break, Red Tape, Interpreters' Strike, Seating Plan Reshuffle. |
| Flags | `flag-icons` 7.5.0 (MIT), the 40 SVGs copied to `apps/client/src/incident/flags/`; drawn in the page and beside each delegate's name tag (`BattleRenderer.setBadges`). |
| Balance | `pnpm balance --incident` and `--incident-flat` (§11). |
| One-liners | 923 lines in `live.json`: each delegate's own version of every bark (`npc.del-<key>:bark_walkon`, `bark_attack`, `bark_ko_win`, `bark_hurt`, `bark_thrown`, `bark_downed_crawl`, `bark_low_hp`, `bark_revenge`; used 80% of the time, the generic line otherwise), and 85 country-vs-country pairings (`npc.del-<a>>npc.del-<b>`) said on hits (30%) and knockouts (60%) between those two: neighbours, derbies, food and sport rivalries. Walk-on lines as a delegate enters from the lobby; a low-health line once per walk-on. Client-only (`renderer.ts`: `bark`, `clash`), so replays are unaffected. |
| Career feed | After a career fight a delegate posts in the main game's feed (`career/feed.ts`, `incident_post_*`), with a link card to `/incident/?c=<their country>`: always after the first fight that has none yet, then about every other fight. Other delegates object in the comments (`feed_c_del_*`). An institution (§7.2) also posts a statement about your fight from the second fight on (always the first time, then about one fight in three), picked to suit it: the ICC and the UN after lots of knockouts, the Lenders and the Health Authority after a loss, the Raters after a flawless win, Big Tech and the Federation after a win, Brussels after a draw. Five lines each (`feed_inst_<id>`, with `{me}`, `{company}`, `{kos}`) plus the set's own posts, a link card to `/incident/` with the institution's icon and 🏛️, and comments from its crew (the set's `comments`), delegates objecting (`feed_c_inst_del`), you and passers-by (`feed_c_inst*`). |
| Code shape | No `floors.ts` split: `incident.ts` reuses `markets.ts` (clock, scene events, fighters) directly, and the market schema gained `source: 'likes'`, `likes`, `derbies`, `candle.seats`/`walkOnTicks` and per-delegate `flag`/`tzMin`/`popM`. |
| Art | All 40 delegates complete (body sheet plus neutral, angry, surprised and hurt heads), and Madam Chair and The Observer. 21 of the 42 sheets needed slicer overrides (`cut`, `cutX` in `art/sheets/manifest.json`). A puppet can also wear a persona's faces on a borrowed body (`Puppet(career, r, faces)`), for any persona whose body hasn't arrived. Still to come: Summit Hall, FX and page art, institutions. |
| Institutions | The first four (§7.2), one per stance: **UN** (`skirmish`, three, three levels under the floor; comes after 3 knockouts in 20 s, leaves by a side door once one is at half health; Deep Concern = `lectured` on everyone near, Ceasefire Appeal = taunt + `distracted`), **NATO** (`aloof`, two; comes when at most one of the 17 members is standing, rides in on the **Moral High Horse** (`prop.high-horse`, a rideable prop that only nudges), laps the hall well away from everyone, never lands a blow; leaves after 45 s or when a second member stands), **ICC** (`fight`, three, two levels under; comes after one country scores 3 knockouts in 30 s; Arrest Warrant = `sticky` + `stunned`, Gendarme Whistle = `spooked`; floored, they're carried out), **Big Tech** (`meddle`, two; comes to every session that opens with a SURGE, uses only its own moves: Harvest Data drains energy, Free Phones = `distracted`, Go Viral pumps a delegate; leaves after 50 s). Content: `crashers/institutions.json` (lines, entrance, posts, comments, exit lines), `abilities/institutions.json`, `props/incident.json`, `countries.json` → `institutions` (chance 45% a session, weights, triggers, `absentTag`, `koStreak`, `needsSurge`, `mount`) and membership `tags` (`nato`, `eu`, `commonwealth`) on each delegate. Sim (`SIM_VERSION` 0.19.0): `CrasherInput.stance`, `leaveAtBp`, `leaveAfterTicks`, `leaveIfStanding`, `when` (`noneStanding` + `few`, `koStreak`), `mount`; `crashLeave` and `crashExit` events; the floored ones of any stance are escorted out. Game-rules: `sessionRaid` (seeded per session) and `surgesOf`; `sessionInput` takes the previous session's likes for SURGEs. Client: exit line as a speech bubble and in the communiqués, a sting on arrival. Sample likes now include two countries a session that go viral (likes four times as fast from a seeded session on), so SURGEs and Big Tech happen in the prototype. Borrowed career bodies until the art (`12-INSTITUTIONS_A.md`); the horse is a placeholder disc. |
| Institutions, the other six | Built as for the first four, borrowed bodies until `13-INSTITUTIONS_B.md`. **Big Oil** (`meddle`, three; no trigger, turns up at a seeded moment; Drill, Baby spills oil under a delegate, Gas Giveaway hands out a gas canister, Fuel Sale = energy + `caffeinated`, which crashes later), **the Health Authority** (`meddle`, three; comes when 3+ standing delegates are burning, wet, sticky, foamed or slipping; Sanitise puts fires out and foams everyone, Quarantine = `sticky` zone, Wash Your Hands = a 2 s lecture), **the Lenders** (`meddle`, two; come when one country has been floored twice this session; Emergency Loan heals and armours a delegate, Repayment Due drains energy + `embarrassed`, Small Print slows everyone), **the Federation** (`meddle`, three; derby hours only, weight 6 so it's the usual derby visitor; Award Trophy = `pumped`, Commission drains energy, Photo Opportunity = `distracted`), **Brussels** (`meddle`, three; comes when 4+ EU members are standing; Harmonise = `slowed`, Consent Banner = `distracted`, Tape Measure = a short lecture), **the Raters** (`skirmish`, two, three levels under; come when a delegate with a Mandate is standing, flee at 85% health; Downgrade = `embarrassed` + `jinxed`, Outlook: Negative = morale down). New triggers in the sim: `someStanding` (teams, at least n), `statusCount` (statuses, n), `koedTimes`; in `countries.json`: `presentTag`, `mandate`, `statusCount`, `koedTimes`, `derbyOnly`, `spreadTicks` and the kill switch `off` (§7.2.5). Measured over eight sample hours: about five visits an hour in total, each institution between none and one an hour in a given eight-hour sample (the draw is per session, so the mix shifts from hour to hour); the Lenders were the rarest until their trigger came down to 2 knockouts and their weight went up to 4. |
| Support you can see, and the like pipe | Every like shows: a beam of light in the country's colour down onto their delegate for under a second (`BattleRenderer.supportBeam`; brighter and wider, with a chime, for your own), or a glow on their lobby row if they're waiting. The crowd's likes land through the session in seeded bunches (`crowdStream`: up to 16 per country, at most one beam per country every 1.5 s), and the "arriving at the next seam" count goes up as they land. `incident/likes.ts` is the pipe: `castLike(key, source)` from any page on careercrash.org (one per country per hour, whichever page; counts from the next session), `onLikes` hears them at once in every open tab (BroadcastChannel, with the storage event as a fallback). Sources: `hall`, `careercrash` (a **👍 Like <country> in the Summit Hall** button on delegate posts in the career feed; the Hall says "A like for … just came in from the Career Crash feed"), `crowd` (the sample), and `service` reserved for phase 2's vote service, which plugs into the same pipe. |
| Vote service (phase 2) | `apps/votes`: Worker `career-crash-votes` on vote.careercrash.org, routes and shapes in `packages/protocol/src/votes.ts`, launch steps in `PIPELINES.md` §7.3. **Counting:** one SQLite Durable Object per hour (`HourTally`); the `likes` table's primary key (voter, country) is the one-like-per-device-per-country-per-hour rule, and `counts` keeps totals per session. A like lands in the session running on the hour object's clock and counts from the next, so `frozen[s]` (every like from sessions before `s`) is final once session `s` starts; the page asks for it only then (`425` before), so every viewer runs the same session. **Tokens:** a 17-bit hashcash proof (about 0.1–0.5 s of background work in the page, `incident/pow.ts`) buys a 7-day token signed with a key the `VoteKeys` object makes on first use (no secret to set). **Page:** `likes.ts` sends each like (kept in the browser and retried until sent, within its hour), waits up to 6 s for a session's tally (then runs on the last one with a "Counting delayed" banner), and polls the likes still arriving every 10 s, showing other viewers' as beams. **Privacy:** voters are a hash of token and hour, deleted two hours after the hour; network counts live in memory only. Differences from §5–6: there is no server-side simulation or published session input (each session is lined up in the page from its frozen tally, as in phase 1, so the floor still doesn't carry across seams); the per-network limit is a hard cap of 200 likes per country per hour (`429`) rather than counting extras at ¼, so every counted like is a real one; no anomaly flag, `maxLikesPerHour` or `hour.json`/`hours.json` yet; the kill switch is the `LIKES_OPEN` variable. Without a service (local dev, single file) the page runs the phase 1 sample crowd. |
| Nationality in career mode | Optional, picked when creating a character or later from the profile (once a day; the first pick is free), stored in the career save. The main character's country, ranked by its likes in the last finished hour (`/hour/<hour>?s=11`, frozen plus pending; ties share a rank), lends a small boost from `economy.json` → `nationality`: **#1** Head of Delegation (+2 Confidence, +2 Charisma, +1 Strength, `pumped` for 5 s at kick-off), **top 3** On the Podium (+2 Confidence, +1 Charisma), **top 10** Home Support (+1 Confidence, +1 Charisma); nothing below that, with no likes or with no nationality (no penalties). Folded into the main character's snapshot when the fight is set up, so the fight replays the same. The profile shows the boost and a 👍 Back <country> button that casts a like (source `careercrash`). Without a vote service (single file) there's no boost. Code: `game-rules/src/nationality.ts`, `career/nation.ts`. |
| Not yet | Server-built session inputs and the floor carried across seams (§5.3), the anomaly flag and like sampling (§6.2–6.3), sharing beyond the share button (phase 3), the art (briefs ready), music of its own (it plays the Office song), Punching Above Its Weight board, Rewind picker. |
