# 08 — Crypto Bros (design v0.1)

Status: **phases 1 and 2 built** (§15): live data, bells, Rewind, tuned on real hours. The feed goes live with the one-time steps in `PIPELINES.md` §7.2. A side attraction at
**careercrash.org/cryptobro**: an endless brawl between the top 10
cryptocurrencies, each played by a crypto bro. Not a game you play, a market
you watch. Every hour the bros are rebuilt from how their coin did in the last
hour, so over an hour the fight tells roughly the same story the charts do.

Owner of: the Crypto Bros page, the endless mode, how market data becomes
fighter power, the cast, the scene events, liquidation, the hourly data feed,
and the general "market feed" that the Countries version (§12) reuses. The
numbers live in `packages/content/data/markets/crypto.json`; the cast lives in
`packages/content/data/markets/crypto-cast/`.

## 1. Goals

- **A market you can read at a glance.** Who's pumping is who's winning. Over
  an hour, the KO table should look like the 1h % change column.
- **Always something going on.** The brawl never ends: knocked-out bros come
  back, events keep the floor busy, and every five minutes there's a beat
  (§4). You can leave the tab open all day.
- **Usually right, not rigged.** The best performer of the hour wins the
  hour most of the time (target 60–75%), but upsets happen. Upsets are the
  funny part.
- **Crashes are an event.** A coin that tanks gets a big, dramatic
  liquidation (§7), not a quiet stat drop.
- **Everyone sees the same fight.** Deterministic from the hour's snapshot and
  the clock, like every other Career Crash fight (01 §4). No server-run fights.
- **Comedy, not finance.** Satire of crypto culture in the house voice
  (LinkedIn-parody posts, slapstick). No real people, no logos, no advice.

## 2. The page

| Part | What it shows |
|---|---|
| **The floor** | One arena, *The Trading Floor*: open-plan, wall of price screens, a bell podium, beanbags, a ping-pong table, a server rack, a glass meeting room. All 10 bros fight free-for-all. |
| **Ticker** (top) | Each coin: ticker, 1h %, a 24h sparkline, its bro's portrait and health. Tap one to follow that bro with the camera. |
| **This hour** (side panel) | Standings by **market share points** (§5.3): KOs dealt, times liquidated, damage. Next to it, the 1h % rank, so you can see where the brawl and the market disagree. |
| **Candle clock** | The hour as 12 five-minute candles; the current one glows. Each finished candle is coloured by who won it. |
| **Feed** | Posts and comments in the game's LinkedIn-parody voice (§9). |
| **History** | "Rewind": watch any of the last 48 hours from its start. |
| **Footer** | "Not financial advice. Not advice of any kind." Data credit (§10). No cookies, no tracking, as on the main site. |

Mobile first: the floor on top, ticker as a horizontal strip, panels in tabs
below. Sound off until tapped (browser rule), then the floor's own chiptune
and the usual babble voices.

## 3. The hour

The whole thing runs on the wall clock (UTC). Every viewer computes the same
"now" and lands in the same moment of the same fight.

| Time | What happens |
|---|---|
| **:00:00 Opening Bell** (~12 s) | New snapshot in. The bell rings, the screens update, each bro walks on to a placard with their 1h % ("SOL +3.8% 📈"). Pumpers get a power-up flash, dumpers get booed. Anyone flagged for liquidation (§7) gets a red **100×** gauge over their head. |
| **:00 – :59 continuous brawl** | 12 candles of 5 minutes (§4). KO'd bros re-list and come back. Scene events keep firing (§6). |
| **:59:00 Closing Bell** (~45 s) | The fighting stops; the bros line up by standings. The hour's winner rings the bell, the loser holds a "WILL WORK FOR GAS" sign. Winner's post goes up in the feed. |
| Next :00 | Opening Bell with the next snapshot. |

If the new snapshot is late, the brawl carries on with last hour's bros and a
"📡 Market data delayed" banner; the Opening Bell plays when the data arrives.

## 4. Endless mode: how it lasts all hour

The existing fight ends when one side is out, after 60–120 s. The Crypto Bros
floor needs a fight that never ends but can still be joined at any moment.

### 4.1 Re-listing (nobody stays out)

- A KO'd bro is **delisted**: ragdoll, stars, carried off by a cleaner (or
  launched, §7). After **15 s** they **re-list**: back through the revolving
  door with full health and a small "v2" badge (v3, v4… as the hour goes on).
- No elimination, no sudden death, no win condition inside a candle. The
  referee role is played by a stablecoin (§8.3).
- A short **respawn shield** (2 s) stops spawn-camping.

### 4.2 Candles (5-minute chapters)

The hour is cut into **12 candles of 5 minutes** (6,000 ticks at 20 tps).

- Each candle is a deterministic sim of its own: `seed = feed + hour +
  candle`, same bros, same stats. A viewer who opens the page at 14:37 only
  has to simulate from 14:35:00 to 14:37 to catch up, never the whole hour.
- **The seam is a scene beat, not a cut.** Each candle ends with a
  **Circuit Breaker** (~4 s): klaxon, the screens flash "TRADING HALTED",
  everyone freezes mid-swing, the lights dip, and the next candle starts from
  a regroup (bros at their desks, full health). It looks like part of the
  show, and it's when the candle's winner gets a sparkle.
- Catch-up runs headless in a Web Worker at full speed. The page shows the
  floor as soon as the current candle has caught up.
- **Standings for earlier candles** come with the snapshot (§10): the
  hourly job simulates the candles in advance and publishes each one's
  result (≈1 KB). Fallback if that's too slow on Workers: the client
  simulates past candles in the background, and the standings say
  "counting…" until it's done. (Measure in phase 1, §13.)

### 4.3 Keeping the floor busy

Ten bros in free-for-all already brawl constantly. On top of that:

- **Scene events** every 30–60 s (§6), rolled from the candle's seed.
- **Bounties:** whoever is top of the standings wears a gold crown and draws
  more attention ("everyone wants a piece of the leader").
- **Grudges** from the hour carry inside it: whoever liquidated you is your
  next target after re-listing (the existing grudge system, 02 §8.1.2).
- **Pickups** from events (airdrop crates, coin showers) give everyone a reason
  to run around.
- **Director camera** cuts between the busiest spots, with action replays of
  big hits and every liquidation.

## 5. Market data → power

### 5.1 The score

Prices move together: in a −3% hour every coin is red. Scoring raw % change
would make a red hour look like a weak hour, not a fight. So each coin is
scored **against the other nine**:

```
relative = coin's 1h % change − median 1h % change of the ten
spread   = median absolute deviation of the ten (floor: 0.25 percentage points)
score    = clamp(relative ÷ spread, −2, +2)
```

So "outperformed the market this hour" is +1 or +2, whatever the market did.
The **market mood** (median 1h change) drives the scene instead (§6).

### 5.2 What the score and the data set

| Input | Effect | Range |
|---|---|---|
| Score | **Power**: stat points and level around a shared base. | −40% … +40% effective power |
| Score ≥ +1.5 | **Pumping**: starts each candle `pumped`, gold aura, louder barks. | |
| Score ≤ −1.5 | **Dumping**: starts each candle `embarrassed`. | |
| 1h change ≤ −5% (absolute) *or* score = −2 | **Over-leveraged**: the 100× gauge; their KOs become liquidations (§7). | |
| Volatility (24h high/low ÷ price) | **Speed and chaos**: volatile coins get the Chaotic/Aggressive AI weights, calm ones Confident/Lazy. | |
| Market cap rank | **Size and health**: rank 1 is big and tanky, rank 10 small and quick. Changes slowly, so a bro's body feels stable from hour to hour. | |
| 24h volume ÷ market cap | **Energy**: how often abilities fire. | |

The mapping table lives in `markets/crypto.json`, not in TypeScript (AGENTS
rule 3). The scoring function is a pure, tested game-rule
(`game-rules/src/markets.ts`).

### 5.3 Market share points (the hour's standings)

| | Points |
|---|---|
| KO dealt | 3 |
| Liquidation dealt (§7) | 5 |
| Candle won (most points in the candle) | 5 |
| Damage | 1 per 100 |
| Being KO'd / liquidated | −1 / −3 |

**"Usually wins" target:** the coin with the top score wins the hour in
**60–75%** of hours, and is in the top 3 in **90%**. Tuned by the power range
in §5.2 and checked with a balance run over replayed real hours
(`pnpm balance --markets`, §13).

## 6. Scene events

Rolled from each candle's seed every 30–60 s, weighted by market mood, so a
red hour *looks* red.

| Event | When | What happens |
|---|---|---|
| **Bull Run** | Mood ≥ +1% (more often the higher) | A bull charges across the floor and tosses whoever's in the way. Pumpers ride it. |
| **Bear Market** | Mood ≤ −1% | A bear wanders in and swats people; everyone is `slowed` near it. |
| **Whale Alert** | Any; more often in big-move hours | A whale (in a suit) waddles through; the floor tilts toward it and everyone slides. |
| **Airdrop** | Any | Crates parachute in with props (coffee, hardware wallets, a rubber chicken). |
| **Coin Shower** | After a liquidation (§7) | The liquidated bro's coins scatter; picking one up heals a bit. A scramble. |
| **Rug Pull** | Rare, any | A rug in the middle of the floor gets yanked; everyone on it goes flying. |
| **Gas Spike** | Any | Green fog zone: abilities cost double energy inside it. |
| **FUD Cloud** | Mood ≤ −1% | A grey cloud follows a random bro; everyone near it is `spooked`. |
| **Hype Train** | Mood ≥ +1% | A toy train of influencer-style fans (the existing `summon.fan`) runs a lap. |
| **Black Swan** | Very rare (~1 an hour at most) | A black swan flaps in and goes for the leader. |
| **Regulators** | ~1 hour in 6 | A gatecrasher set (07) for this floor: *The Regulators*, a compliance officer with two auditors, fighting everyone, using the gatecrasher system as is. |

## 7. Liquidation (dramatic)

The over-leveraged bro (§5.2) is a walking disaster, and the floor knows it.

- **Before:** a red **100×** gauge over their head that fills as they take
  damage. A warning siren starts at 70%. The AI of the others sees blood:
  they're a preferred target.
- **The moment** (when they're KO'd):
  1. Everything freezes; a **MARGIN CALL** klaxon, red strobe, screens go red.
  2. Slow-motion zoom (1.5 s) as a giant **LIQUIDATED** stamp slams down.
  3. They're launched out through the ceiling tiles, spinning, with papers
     and a trail of coins.
  4. A **Coin Shower** (§6) rains down; everyone scrambles.
  5. Action replay of the hit, credited: "Liquidated by Gas Fee Gavin."
- **After:** out for **45 s** (not 15). They re-list in a cardboard box
  labelled "v2 (relaunch)", with "WAGMI" scrawled on the side.
- **Market crash (1h ≤ −15%):** the whole floor shakes when they're
  liquidated, the lights go out for a beat, and the feed gets a special post.
- **A pumper can be liquidated too** if they go below 10% health while
  wearing a leverage pickup (Airdrop crate), so it isn't only the losers.
- Score for whoever lands it: 5 market share points (§5.3).

## 8. The cast

### 8.1 Rules

- **Who's on the floor:** the top 10 by market cap each hour, excluding
  stablecoins, wrapped and staked copies (WBTC, stETH…) and exchange IOUs.
  The list is in `markets/crypto.json` (`exclude`).
- **Personas, not people.** Fictional bros. No look-alikes of founders,
  executives or influencers, no names that point at them.
- **No logos.** Ticker on a cap or hoodie, coin colours, and a costume motif.
  Logos are trademarks.
- **Own puppets and moves.** Each bro is a new character with a new body
  sheet, faces and 3 signature moves (not an existing career). A bro that
  hasn't been painted yet borrows the nearest career's art.
- **The pool** holds more bros than the top 10, so coins can move in and out.
  A coin with no bro yet appears as **Anon Bro**: a hoodie, a balaclava and
  the ticker on a cap, with a generic moveset.

### 8.2 The pool

Moves marked ★ need a new engine concept (AGENTS rule 5); everything else
uses existing effects, statuses, summons and props.

| Coin | Bro | Look | Moves | Catchphrase |
|---|---|---|---|---|
| BTC | **The OG** | Laser-eye shades, gold chain, 2013 T-shirt | *Laser Eyes* (ranged beam) · *Halving* (halves a target's energy) · passive *Digital Gold*: armoured | "Have fun staying poor." |
| ETH | **Gas Fee Gavin** | Pastel blazer, fanny pack, calculator | *Gas Fee* (marks a target: their abilities cost more) · *Smart Contract* (a delayed trap that goes off when someone walks in) ★ · *The Merge* (pulls two enemies together) | "That'll be 40 dollars to throw that punch." |
| XRP | **Litigation Larry** | Suit, briefcase full of filings | *Cease and Desist* (stun) · *Ripple* (shockwave knockback) · *Appeal* (gets up from the first knockdown each candle) | "My lawyer will see you in round two." |
| BNB | **Exchange Eddie** | Polo shirt, lanyard, headset | *Withdrawals Paused* (roots a target) · *Token Burn* (burning) · *Listing Fee* (steals energy) | "Funds are SAFU. Mostly." |
| SOL | **Speedrun Sol** | Running vest, energy gels | *Validator Rush* (dash chain) · *Low Fees* (cheap, fast jabs) · passive *Network Outage*: now and then freezes himself for 2 s ★ | "Already there. Wait, where am I?" |
| DOGE | **Such Wow Wes** | Shiba ears headband, meme T-shirt | *Much Bark* (scares people near him) · *Shiba Pack* (summons 3 shibas, new critter) · *To The Moon* (a jump that lands on someone) | "Wow. Such punch. Very rekt." |
| ADA | **Peer-Review Pete** | Tweed jacket, stack of papers | *Roadmap* (charges for 30 s, then one enormous hit) ★ · *Citation Needed* (lectured) · *Formal Verification* (blocks the next hit) | "It's coming. Phase five. Peer reviewed." |
| TRX | **Neon Trent** | Light-up suit | *Light Trail* (dash leaving a hazard line) ★ · *Energy Rental* (gives an ally energy… then charges for it) | "Faster. Cheaper. Brighter." |
| AVAX | **Avalanche Al** | Ski gear, goggles | *Avalanche* (snow wave: cold + knockback) · *Subnet* (an icy zone of his own) | "It's all downhill from here. For you." |
| LINK | **Oracle Olly** | Crystal ball, cardigan | *Price Feed* (sees the next attack coming and evades it) · *Off-Chain* (teleports) | "I knew you'd do that." |
| TON | **Tony Tons** | Hard hat, tote bag of bricks | *Ton of Bricks* (heavy throw) · *Mini App* (summons a phone that buzzes at people) | "A ton of value. Mostly bricks." |
| SHIB | **Shiba Sharon** | Dog-walker vest, six leads | *Walkies* (summons two shibas on leads that trip people) · *Burn Rate* | "Who's a good investment? You are!" |
| LTC | **Silver Steve** | Silver chain, BTC's old T-shirt | *Laser Eyes (Lite)*, a cheaper copy of the OG's moves · *Faster Blocks* (speed) | "I was here first. Second." |
| PEPE | **Degen Dex** | Green hoodie, ring light | *Ribbit Rally* (summons frogs, new critter, plain frogs, no meme frog) · *Pump & Dump* (huge buff, then crash) | "Not a frog. A movement." |
| DOT | **Para Pat** | Polka-dot suit | *Parachain* (links to an ally, sharing damage) ★ · *Slot Auction* | "Interoperable. With your face." |
| any | **Anon Bro** | Hoodie, balaclava, ticker cap | *DYOR* (random buff) · *Shill* (taunt) · *Exit Scam* (dash away) | "Few understand." |

Bros' names and lines go in `locales/en.json` like every other name.

### 8.3 Stablecoins: the referees

Stablecoins never move, so they never fight. The biggest one is the referee
of the floor (the existing knock-out-able referee, 02 §7.5): **Pegged Peggy**,
whistle, cardigan, unmoved by anything. If she's knocked out: "Tether has lost
the peg… and consciousness."

## 9. Text and posts

All in the house voice: crypto culture as LinkedIn posts. Examples of what
`markets/crypto-live.json` holds:

- **Opening Bell:** "SOL is up 3.8% and has taken his shirt off."
- **Liquidation:** "LIQUIDATED. Gas Fee Gavin has been sent to the shadow realm. And also the car park."
- **Winner's post:** "Humbled to announce I've closed the hour as #1. Grateful to my
  shibas, my mentors and absolutely nobody at ETH. Agree?"
- **Comments:** "Bought the top. Again." · "This is literally the bottom." ·
  "Ser, this is a supermarket." · "Probably nothing." · "Few."
- **Barks:** "WAGMI!", "HODL!", "Diamond hands!", "It's a dip!", "Ser!",
  "GM!", "NGMI!", "Rekt!".

Never price predictions, never "buy"/"sell" calls, no real projects other
than the ten tickers on the board.

## 10. The data feed

```
Cloudflare Cron Trigger, every hour at :00:30
  └─ worker career-crash-markets   (apps/markets, new; Hono not needed)
       1. fetch CoinGecko /coins/markets (top ~30 by cap, 1h + 24h change,
          price, cap, volume, 24h high/low)
       2. drop excluded coins, keep the top 10 → score them (§5)
       3. build the 10 fighter snapshots (game-rules)
       4. simulate the 12 candles headless → per-candle results (§4.2)
       5. write to KV:  crypto/latest.json, crypto/2026-10-05T14.json
          (kept 48 h, for Rewind)
careercrash.org/cryptobro
  └─ GET /cryptobro/feed/latest.json (same worker, route on the site)
       → rebuild the snapshots, simulate the current candle, render
```

- **Data source:** CoinGecko's Demo API (free, key in a Worker secret, 1h
  change in a single call). Credit on the page: "Market data: CoinGecko."
  Binance's public API is out: it often blocks requests from Cloudflare's US
  locations.
- **The snapshot** (~3 KB): hour, content hash, sim version, the 10 coins
  (ticker, % changes, cap rank, volatility, score, flags), and the 12 candle
  results. Everything the client needs; no other API.
- **Failures:** retry twice in the minute; if still nothing, keep
  `latest.json` as is (the page shows "delayed", §3). A coin with missing
  fields keeps last hour's values.
- **Content or sim changes** (new `contentHash`) take effect at the next
  hour; old hours in Rewind keep the version they were made with, so they
  still replay (01 §4.4).

## 11. Build and code

| Piece | Where |
|---|---|
| Page entry `cryptobro.html` → `dist-web/cryptobro/index.html` (real path, own share preview, smaller download; reuses renderer, puppets, audio) | `apps/client/src/cryptobro/` |
| Endless mode: `mode: 'endless'`, re-listing, respawn shield, no win condition, candle length, circuit breaker | `sim` (schema + `SIM_VERSION` bump; other modes and goldens unchanged) |
| Liquidation: over-leveraged status, gauge, the launch, a `liquidation` event | `sim`, `content/data/statuses` |
| Scene events (§6) as arena hazards and summons on a market-mood table | `content/data/arenas/trading-floor.json`, `markets/crypto.json` |
| Scoring, snapshot builder, standings | `game-rules/src/markets.ts` (pure, tested) |
| Cast (bros, abilities, critters) | `content/data/markets/crypto-cast/`, `abilities/`, `summons/` |
| Text | `markets/crypto-live.json`, `locales/en.json` |
| Hourly worker + KV | `apps/markets` (new), `wrangler.toml`, a route on careercrash.org |
| Commentary detectors for the endless floor | `commentary` |
| Balance: `pnpm balance --markets` replays a set of recorded real hours and reports how often the top score wins the hour | `tools/balance` |
| Golden replays: two recorded hours (a calm one and a crash) | `tools/replay-cli` |

## 12. Next: Countries

Built on the same feed → score → snapshot → floor pipeline: a second adapter
and a second mapping file, no new engine work.

- **What to measure is still open.** Exchange rates barely move in an hour
  (~0.05%), so an hourly FX fight is noise. Options:
  - **Stock indices**, hourly, but only while each market is open. Fighters
    clock in and out with their exchange's hours ("Tokyo has gone home"),
    which fits a 24-hour floor.
  - **Currencies, daily**: one big day-long brawl rebuilt each morning.
- **Who fights:** finance ministers and central bankers as personas, never
  national stereotypes. The satire is about institutions, not peoples.
- Its own arena (a summit hall), its own subsite (e.g. `/markets`).

## 13. Phases

1. **Prototype, no live data.** A hand-written snapshot; the endless mode
   (re-listing, candles, circuit breaker); the page with ticker and
   standings; the Trading Floor on an existing Office backdrop; the 10 bros
   on borrowed career art and existing moves. Measure: catch-up time on a
   mid-range phone, and the cost of simulating 12 candles on Workers (§4.2).
   Screenshots.
2. **Live data.** The hourly worker, KV, Opening and Closing Bell, Rewind, the
   balance run on recorded hours, tuning to the 60–75% target.
3. **Liquidation and events.** The full liquidation sequence, the scene events,
   the text pack.
4. **Art.** Image briefs (`career-crash/art/cryptobro/`, one file per kind, in the style of
   `FX_BRIEF.md`): the Trading Floor backdrop and obstacles; a body sheet and
   four faces per bro (15 + Anon Bro + Pegged Peggy); critters (shiba, frog,
   bull, bear, whale, black swan); FX (laser eyes, LIQUIDATED stamp, coin
   shower, margin-call strobe). The bros' signature moves (★) land with their art.
5. **Countries** (§12).

## 14. Open questions

- **Shared clock vs your own:** everyone sees the same moment (proposed). The
  alternative, each viewer starting their own run, is simpler but loses "did
  you see that liquidation at 14:37?".
- **Interaction:** none in v1 (it's a market, not a game). Later maybe
  cheering for a coin (a cosmetic confetti burst), never anything that changes
  the fight.
- **Embedding** the floor as a widget on other sites: later, if wanted.

## 15. As built (phases 1–3)

What exists now, and where it differs from the plan above.

| Piece | State |
|---|---|
| Page `/cryptobro` | Built: floor, ticker (1h %, 24h sparkline, health, 100× and 🚀 badges, tap to follow), hour standings, candle clock, floor feed, footer. Sample data until the feed worker exists (`feed.ts`). |
| Endless mode | Built in the sim: `BattleInput.endless` (`round`, `ticks`, `relistTicks`, `liquidatedTicks`, `shieldTicks`, `spawns`), `relist` and `liquidated` events, referee on the floor, no sudden death. `SIM_VERSION` 0.16.0; ordinary fights unchanged (all 96 goldens matched). Each candle is a `round` of one seed, so the floor's layout stays the same all hour. |
| Candles | 5 min slots: 296 s of fight + 4 s circuit breaker, 12 an hour. A candle is caught up from its start on load: a full candle of 10 bros simulates in 0.3–0.6 s (Node and headless Chromium), so joining mid-candle is under a second. Earlier candles' standings are worked out in the background in slices; the feed worker will publish them instead (§4.2). |
| Scoring and power | `game-rules/src/markets.ts`: median and median absolute deviation of the field, score clamped to ±2, power around level 20 at rank 4 (see Balance below), pumped/embarrassed for 60 s at kick-off. Numbers in `markets/crypto.json`. |
| Liquidation | Over-leveraged bros' KOs emit `liquidated` and keep them out 45 s. The renderer plays the painted margin-call klaxon, the LIQUIDATED stamp, the ceiling launch and the coin shower; the page adds a red strobe, a caption and a slow-motion focus. The filling 100× gauge comes in phase 3. |
| Cast | 15 bros plus Anon Bro as personas (`npc.bro-*`) on borrowed careers' moves. All sixteen have their own bodies and heads. Pegged Peggy (`npc.pegged-peggy`, `market.referee`) referees the floor. |
| Arena | `arena.trading-floor`, `marketOnly`: the painted Trading Floor with its own furniture (trading desks, screen walls, the gold bull, server racks, beanbags, intact/damaged/destroyed), on the Office's layout and props. Market-only arenas stay out of the ladder, the Sandbox, online fights, gatecrashers, goldens and balance runs. |
| Career feed link | Built: after every career fight one bro posts 2nd or 3rd in the feed (an "opportunity", a flex, crypto-bro wisdom, or a take on your fight), with a link card to `/cryptobro/` (the full careercrash.org address in the single-file build). Other bros, your staff, you and sceptics comment underneath. Text: `live.json` `bro_post_*`, `feed_c_bro*`, `bro_link`; code: `apps/client/src/career/feed.ts`. Portraits use the bros' heads once they're in. |
| Live data (phase 2) | `apps/markets`: Worker `career-crash-markets` on feed.careercrash.org, cron at :00 and :02, CoinGecko `/coins/markets` (keyless, or a Demo key) → `snapshotFromCoinGecko` (game-rules) → KV for 49 h. The page reads `/crypto/<hour>.json`, else the newest snapshot relabelled as this hour (with a "data delayed" notice), else the bundled sample. Launch: `PIPELINES.md` §7.2. |
| Opening and Closing Bell | Built. The Opening Bell (first 12 s of the hour, over the fight) walks each coin's placard on, sorted by its 1h change. The hour's last candle ends 45 s early (`candle.closingTicks`) for the Closing Bell: podium, who rings the bell, who will work for gas, a feed line. |
| Rewind | Built: a picker in the header lists the hours on file (48 h); choosing one replays that hour from its start (`?t=`). |
| Balance | Tuned on 48 recorded real hours (`pnpm balance --markets`): the best coin wins the hour **63%** of the time (target 60–75%), is in the top 3 **96%**, score vs points correlates at **0.86**. Each bro's borrowed career was evened out first (`statBonus`, `pnpm balance --markets-flat`: every bro within ±25% of an even share in a flat market); Peer-Review Pete now fights as a teacher and Para Pat as a life coach. Power: ±18 levels and ±140 stat points at score ±2. About 23 knockouts per candle, 9 liquidations an hour. |
| Field | Real top-10 quirks handled: tokenised loans, exchange tokens and more stablecoins are excluded (`exclude`), a renamed ticker keeps its bro (`aliases`: GRAM → Tony Tons). |
| Voices (phase 3) | Each bro has a voice of their own (`voice` in `markets/crypto.json`: type, pitch, pace, effect). Effects in `replay/voices.ts`: DOGE **barks** every word, SHIB yips, PEPE croaks "ribbit", Neon Trent is auto-tuned, Anon Bro talks through a robotic voice changer; the OG is deep, Oracle Olly whispers, Speedrun Sol talks at 1.45×. Shouts (yells, ouches, KO wails) follow the effect: a yelp, a howl, a long sad croak. Shibas yap and frogs croak (`audio.ts`). |
| Music (phase 3) | Two Trading Floor songs (`music.ts`): `trading-floor`, 140 bpm four-on-the-floor in A major for a green hour, and `trading-floor-bear`, 112 bpm in A minor, heading down, when the hour's median change is negative. |
| Bros' own moves (phase 3) | `moves` per bro (granted on top of the borrowed career), 23 abilities in `abilities/cryptobro.json`, all from existing effects: Laser Eyes (a painted red beam), Halving, Gas Fee, The Merge, Ripple, Withdrawals Paused, Token Burn, Validator Rush, Much Bark, **Shiba Pack** (3 shibas), To The Moon, Citation Needed, Energy Rental, Avalanche, Off-Chain, Ton of Bricks, Walkies (2 shibas), Laser Eyes (Lite), **Ribbit Rally** (3 frogs), Pump & Dump (a big buff, then the crash), Slot Auction, Shill, DYOR. New critters `summon.shiba` and `summon.frog`. The ★ moves (engine concepts) are still to come. |
| Scene events (phase 3) | `events` in the market: one every 30–55 s (`gapTicks`), drawn by weight from what the hour's mood allows (`minMoodBp`/`maxMoodBp`, median 1h change), seeded per hour and candle so everyone sees the same bull. **Bull Run** (green hours: charges across, tosses people), **Bear Market** (red: swats, knocks down, slows), **Whale Alert** (a whale in a suit, big knockback), **Black Swan** (rare, fast, stuns), **Airdrop** (crates on parachutes drop coffee), **Gas Spike** (green fog: energy drained, slowed), **FUD Cloud** (red: spooked and embarrassed), **Rug Pull** (rare: everyone on it goes flying). Creatures are mover props drawn with the critter art; in the sim they're `BattleInput.endless.events`. The office's own hazards are gone from the Trading Floor. `SIM_VERSION` 0.17.0. |
| The Regulators (phase 3) | `crasher.regulators` (Prudence Ledger, compliance officer, with auditors Nigel Footnote and Priya Reconcile, `npc.reg-auditor`, `-b`) raid one candle in about one hour in six (`regulators` in the market), fighting every bro. They don't score and don't re-list once floored. |
| Balance (phase 3) | Re-tuned with the new moves (`statBonus`): every bro within ±25% of an even share in a flat market (0.81–1.19); on 48 real hours the best coin wins the hour **65%**, is in the top 3 **98%**, ρ **0.88**. |
| Not yet | The ★ moves (Smart Contract, Roadmap, Light Trail, Parachain, Network Outage), the filling 100× gauge, the Hype Train, coin-shower pickups. |

