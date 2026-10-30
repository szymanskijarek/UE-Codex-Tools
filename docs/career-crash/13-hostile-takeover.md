# 13 — Hostile Takeover (design v0.1, proposal)

Status: **proposal, nothing built** except the pixel forge (§8). Working name;
alternatives in §11. A third market floor at **careercrash.org/takeover**:
US stocks as office workers, brawling to the rhythm of the trading day. It
borrows Crypto Bros' engine (08: snapshot → score → endless floor) and adds
the thing Crypto Bros never had: **you pick the team**. You draft a five-stock
*fund*, and your fund fights the market.

Owner of: the page, the fund (lineup) rules, how stock data becomes power,
the trading-day clock, the sector cast, stock scene events, the fund report,
and the stock feed.

## 1. The pitch

> Draft five US stocks. They show up to work at 9:30 Eastern as office
> workers. All day they fight the S&P 500's own team, the Index Fund, and
> the fight follows the real prices. At the closing bell you get a report
> card in LinkedIn voice, with the real numbers underneath.

**Fun:** your picks are characters with grudges, you have someone to cheer
for at lunch, a stock split literally splits a fighter in two.
**Useful:** it's your watchlist, made watchable. The fight is a readable
picture of *relative* performance (did my stock beat the market, not just
"was it green"), and the rules quietly teach the ideas that matter:
diversification, volatility, defensive sectors, dividends, hedging, and the
uncomfortable fact that the index usually wins (§5.4).

## 2. Goals

- **Your watchlist, at a glance.** Over a day, the fight's story matches the
  day's relative performance, as Crypto Bros does for an hour (08 §1).
- **Decisions that mean something,** taken before the bell, not during it:
  the lineup locks at 9:30 so nobody "trades" in the page.
- **Honest scoreboard.** Every result shows the real return next to the
  fight result. The fight is the show; the numbers are the truth.
- **Built to be shared.** The daily report card and "my fund vs yours" links.
- **Comedy, not finance.** Corporate-culture satire in the house voice. No
  advice, no money, no real people, no logos (§9).

## 3. The trading day (the clock)

US markets keep office hours, which suits a game about offices. Everything
runs on New York time, NYSE calendar (holidays and half days come with the
feed).

| Time (ET) | On the floor | On the page |
|---|---|---|
| **Pre-market** 4:00–9:30 | Fighters arrive, coffee, a stand-up meeting nobody listens to. Pre-market movers get a placard. | **Draft window**: build or change your fund. |
| **9:30 Opening Bell** | Each fighter walks on to their gap: gapped up = confetti, gapped down = trips on the stairs. | Lineups lock. |
| **9:30–16:00** | 13 **half-hour candles** (the hour's 5-min candles in 08 §4.2, scaled up). A Circuit Breaker beat at each seam. | Live floor, your fund's panel. |
| **12:00–13:00 Lunch** | Real volume sags at lunch; so does the brawl. Slower AI, a sandwich event, someone microwaves fish. | — |
| **15:30–16:00 Power hour** | Volume spikes into the close; energy regen up, more events. | — |
| **16:00 Closing Bell** | Podium, the day's MVP rings the bell. | **Fund report** (§6.1). |
| **After hours / overnight** | The floor dims. A cleaner mops round the ragdolls; replays of the day's big moments. Earnings after the close get a "breaking" ticker. | Rewind any session of the last 10 trading days. |
| **Weekend** | *The Weekend Retreat*: the week's highlight reel at a team-building away day (trust falls, paintball). | Weekly table (§5.5). |

The lunch dip and power hour aren't decoration: intraday volume really is
U-shaped, and the floor's energy follows it. People who watch learn the
shape of a trading day without being told.

## 4. Two ways to watch

### 4.1 The Big Board (no account, no setup)

The Crypto Bros format with stocks: the **10 biggest US companies** by market
cap brawl free-for-all, rebuilt every half hour from their change vs the S&P
500. Zero friction, works on day one, reuses 08 almost entirely. This is the
page's landing view and the draft's shop window: tap a fighter → "Add to my
fund".

### 4.2 My Fund vs The Index (the new part)

Your **5 picks** fight **The Index Fund**, five sector-blended fighters who
represent the S&P 500 itself: fleece vests, sensible shoes, they barely move
and rarely lose (they're "the market", so by construction they score 0;
§5.1). Beating them means your picks outperformed the market *that day*.

- Same deterministic sim, same seed for everyone with the same lineup:
  `seed = feed day + candle + fund hash`.
- The fund's fight is a 5v5 team fight per candle (the existing team mode),
  not endless free-for-all: 13 rounds a day, the day's result is rounds won.
  Each round's power comes from that half hour's data.
- **Fund vs Fund**: share a link (`/takeover/#f=NVDA.KO.XOM.WMT.JNJ~Synergy+Capital`)
  and the friend sees your fund fight theirs, today, deterministically, with
  no server. A weekly league with stored funds is phase 4 (§12).

## 5. The fund

### 5.1 Data → power (per candle, per stock)

Same idea as 08 §5.1: score each stock **against the market**, not on raw
change, so a red day still has winners.

```
relative = stock's change since the open − S&P 500's change since the open
spread   = median absolute deviation of the universe's relatives (floor 0.15 pp)
score    = clamp(relative ÷ spread, −2, +2)
```

| Input | Effect | What it teaches |
|---|---|---|
| Score | Power ±, as Crypto Bros (levels and stat points, tuned in `markets/stocks.json`) | Relative performance |
| Score ≥ +1.5 / ≤ −1.5 | `pumped` / `embarrassed` at the candle start | — |
| Beta (or 30-day volatility) | AI personality: high beta = Chaotic/Aggressive, low beta = Confident/Lazy. Big swings both ways. | Volatility cuts both ways |
| Market cap tier (mega, large, mid) | Body size and health | Big companies move less |
| Dividend yield | **Dividend**: a small heal every 60 s, all day, whatever the price did | Dividends are steady return |
| Sector | Sector body and moveset (§7), sector aura (§5.3) | Sectors move together |
| Relative volume | Energy (how often abilities fire) | Volume = attention |
| Earnings today | **Earnings Call**: a sealed envelope over their head until the report; then a big buff or a big pratfall depending on the move | Earnings days are lottery days |
| Gap at the open | Opening Bell entrance | — |

Numbers in content (`markets/stocks.json`), scoring in
`game-rules/src/stocks.ts` reusing `markets.ts` (AGENTS rule 3).

### 5.2 Draft rules

- **Five picks** from the universe (§10.1), plus one optional **Hedge** (§5.4).
- **Cap Space 100.** Mega cap costs 30, large 20, mid 12. You can't field five
  trillion-dollar companies; you can field two and three smaller ones. Prices
  come from the tier, never from recent performance, so the draft never says
  "this one's hot".
- **Overweight one pick** (a crown, "Overweight" badge): their score counts
  ×1.5 for power, up *and* down. Conviction has a cost.
- **Name your fund** or take a generated one ("Synergy Capital Partners",
  "Blue Sky Thinking LLP", "Paradigm Shift Holdings").
- Lineups lock at the Opening Bell and apply until the close. Changes in the
  draft window take effect next session. No intraday swaps: this is fantasy
  sport, not a trading app.

### 5.3 Diversification is a defence (the core lesson, as a mechanic)

- **Sector aura:** each candle, each sector's average relative change gives
  its fighters a shared aura. Same-sector teammates win together and lose
  together.
- **Sector Rout** (scene event, §12.1): when a sector is the day's worst, a
  wave hits *every* fighter from that sector at once. A fund of five chip
  stocks gets wiped by one event.
- **Balanced Portfolio** synergy (existing synergy system, 02 §8): four or
  more sectors in the lineup → a small all-day defence bonus. Spread five
  across five sectors and the bonus is bigger.
- **Defensive sectors** (Staples, Utilities, Health Care) take less damage
  when the market's down; **cyclicals** (Discretionary, Industrials, Energy,
  Materials, Financials) hit harder when it's up. True to how they behave,
  and it makes the draft a real choice between "safe" and "punchy".

### 5.4 The Hedge and the honest scoreboard

- **The Hedge** (sixth slot, bench): *The Short Seller*, in black, sunglasses
  indoors. Sits out green days. On a red market day (S&P down), the Short
  Seller **subs in** for your worst fighter and gets stronger the further the
  market falls. Hedges cost upside and save you on bad days; the game says
  so in one line on the draft screen.
- **Under every result, the real numbers:** your fund's equal-weighted
  return today (Overweight counted ×1.5), the S&P 500's, and the gap. Over
  the week and the month, a plain line: "Days you beat the market: 9 of 21."
  Most players will find that hard. The Index Fund fighters celebrate by
  doing nothing in particular. That's the joke, and the lesson.

### 5.5 The week (light meta, no money)

- Mon–Fri make a **week**; your fund's week = rounds won + days won.
- **Season badges** (cosmetic, local storage like the rest of the site):
  *Beat the Market* (a day), *Diamond Desk* (held the same five for 4 weeks),
  *Fully Diversified* (5 sectors), *Called the Earnings* (overweighted a
  stock on its earnings day and it went up), *Index Hugger* (within 0.1% of
  the S&P all week; "congratulations, you are the market").
- No currency, no wagers, no prizes. Nothing that turns a pick into a bet.

## 6. The page

| Part | What |
|---|---|
| **Floor** | Big Board (§4.1) or your fund's fight (§4.2), a toggle. |
| **Ticker** | Your five (or the Big Board ten): ticker, change since open, change vs S&P, health, badges (👑 overweight, ✉️ earnings today, 💰 dividend). |
| **Day clock** | 13 candles across the session, coloured by who won each; lunch and power hour marked. Outside hours: "Market closed. Opens in 14h 02m." |
| **Draft** | Universe list by sector with cap tier and price in Cap Space, sector colour chips, a diversification meter. No charts of past performance, deliberately. |
| **Feed** | LinkedIn-parody posts from the fighters (§9). |
| **Footer** | "Not financial advice. Not advice of any kind. Prices delayed." Data credit. No cookies. |

### 6.1 The fund report (the shareable thing)

At 16:00, a card in the Hour Card format (09 §8.3): fund name, five
portraits, rounds won, the MVP, the real return vs S&P, and a generated post:

> "Thrilled to share that Synergy Capital Partners **beat the market by
> 0.4%** today. This proves nothing. Grateful to my team, especially XOM, who
> carried us while NVDA was 'in meetings'. Agree?"

## 7. The cast

### 7.1 Sector archetypes (11 painted bodies)

The universe is too big for a persona per company. Each of the 11 sectors
gets one office archetype (body sheet + 4 heads, painted like every other
character), and each company is that archetype plus its **ticker lanyard,
its colour and a company prop** (§7.3).

| Sector | Archetype | Look | Moves | Catchphrase |
|---|---|---|---|---|
| Information Technology | **Scrum Master** | Hoodie, lanyard, sticky notes | *Sprint* (dash chain) · *Blocker* (root) · *Push to Prod* (huge hit, may hurt himself) | "Let's take this offline. Offline being your face." |
| Communication Services | **Engagement Farmer** | Selfie stick, ring light on a backpack | *Doomscroll* (stun) · *The Algorithm* (pulls a target in) · *Going Viral* (summons fans) | "Like and subscribe. To pain." |
| Consumer Discretionary | **Brand Ambassador** | Fresh sneakers, shopping bags | *Flash Sale* (burst of cheap jabs) · *Free Returns* (reflects a hit) · *Same-Day Delivery* (a parcel lands on someone) | "Limited edition. Like your health bar." |
| Consumer Staples | **Shelf Stacker** | Apron, price gun | *Price Gun* (marks a target) · *Shrinkflation* (target's damage shrinks) · *Pallet Jack* (charge). Passive: *Defensive* | "Everyone needs cereal. Nobody needs you." |
| Health Care | **Sales Rep** | White coat over a suit, sample bag | *Side Effects* (random status) · *Prior Authorisation* (long stun) · *Free Samples* (heals an ally). Passive: *Defensive* | "Ask your doctor if punching is right for you." |
| Financials | **Vest Bro** | Fleece vest over a shirt, two phones | *Leverage* (big buff, takes more damage) · *Fee Structure* (steals energy) · *Too Big to Fail* (gets up from the first KO, on red days only) | "Per my last email, you're liquidated." |
| Energy | **Roughneck** | Hard hat, oil-stained overalls | *Drill Down* (ground pound) · *Pipeline* (hazard line) · *Price Shock* (knockback wave) | "Burning the midnight oil. And you." |
| Industrials | **Forklift Certified** | Hi-vis vest, clipboard | *Supply Chain* (a delayed hit that arrives late) · *Heavy Machinery* (armoured charge) · *Safety Briefing* (everyone near him is slowed) | "Forty-seven days without an incident. Until now." |
| Materials | **Quarry Boss** | Hard hat, pickaxe, dust | *Rock Slide* · *Commodity Cycle* (alternates strong and weak every 30 s) | "Rock solid. Rock everything, really." |
| Utilities | **Meter Reader** | Clipboard, torch, hi-vis | *Rolling Blackout* (dark zone, spooked) · *Rate Case* (slow steady heal). Passive: *Defensive*, *Boring* (immune to spooked) | "I'm not exciting. I'm reliable. Like your bill." |
| Real Estate | **Open House Agent** | Blazer, SOLD sign | *Eviction* (big knockback) · *Open House* (zone that pulls people in) · *Cap Rate* | "Cosy. Characterful. You're going through the wall." |

Plus the specials: **The Index Fund** (×5, fleece and sensible shoes, one
body, slow, unbothered), **The Short Seller** (the Hedge), and the referee
**The Specialist**, an old-school floor trader in a numbered jacket, who
blows a whistle and shouts nonsense hand signals.

### 7.2 Headliners (later)

The ~10 biggest companies (the Big Board regulars) can earn their own body
later, as Crypto Bros did with borrowed career art first. **Always a
fictional employee archetype of the product category, never the founder or
CEO** (no turtlenecks, no leather jackets, no rockets): the warehouse picker,
the data-centre tech, the search-results intern.

### 7.3 Company props (the pixel forge's job)

Each company carries one held prop that says what it does, generically: a
graphics card, a cardboard box, a phone, a spreadsheet laptop, a charging
cable, a VR headset, a magnifying glass, a gold bar, a pill bottle, a
shopping trolley, a hard drive, a burger. **Generic objects only** (no
product shapes that are trade dress, no logos). About 40 props cover the top
100 companies, and they're small, 32×32: exactly what the forge draws well
(§8).

## 8. Art without the image generator: the pixel forge

The owner asked whether a skill can make pixel art so content doesn't wait on
imagegen. Findings (30 Oct 2026):

| Option | What | Verdict |
|---|---|---|
| **SpriteCook** (Claude plugin directory, community) | Sprite, UI kit and animation *generation* via its own API, with skills and an MCP server | Still an image generator, external account and cost, its own style. Doesn't remove the round trip. |
| **pixel-plugin / pixel-mcp** (willibrandon), **aseprite-mcp** | Claude drives Aseprite via MCP | Needs the Aseprite desktop app (paid), not in our cloud container. Good for a human artist's machine. |
| **eachlabs game-asset-generation** | Skill over an AI image API | Imagegen again. |
| **Code-only sprite arrays** (e.g. opusgamelabs game-assets) | Sprites as 2D arrays in code | The right idea, but generic; doesn't know our outline, shading or sheet layout. |
| **Our own forge** (built: `tools/art-pipeline/src/pixel.ts` + skill `pixel-forge`) | Sprite = JSON of shapes in palette keys; the forge adds our shade tone and the `#1b1f2a` outline, scales nearest-neighbour into the critter/item sheet layout | **Recommended.** No cost, no network, deterministic, diffs are reviewable, matches the house look, any session can use it. |

**Proof** (both built and rendered in this change): `art/pixel/rate-hawk`
(the Fed's Rate Hawk in a red tie, standing and swooping, a §12.1 scene-event
critter) and `art/pixel/golden-parachute` (a prop). Next to the painted
poodle and goose at in-game size they sit in the same world; up close
they're simpler (flatter, fewer pixels of detail).

**Split of work:**

| Painted (image agent, as now) | Forged (code, by Claude) |
|---|---|
| The 11 sector body sheets + heads (the rig needs separated limbs and expressive faces) | ~40 company props, 2-pose critters (hawk, dove, dead cat, bull/bear variants), FX frames (ticker tape, confetti, the SPLIT flash), UI icons (sector chips, badges), the trading-floor small furniture |
| The arena backdrop (*The Exchange*) | Badges for the season (§5.5) |

That cuts this project's imagegen briefs from ~70 images to ~17.

## 9. Content rules (hard)

Stricter than Crypto Bros, because these are real companies with real
employees.

- **No advice.** No buy/sell/hold, no price targets, no "hot picks". The
  draft shows no past-performance charts. Disclaimer on every page and card.
- **No real people.** No founders, executives or famous investors, no
  look-alikes, no names that point at them.
- **No logos or trade dress.** Tickers as labels; colours are sector colours,
  not brand colours.
- **Jokes about the number, never the news.** Posts react to *how much* a
  stock moved, never *why*. A stock that falls 20% may have fallen because
  something terrible happened; the game never guesses. Single-name moves
  beyond ±15% get a neutral line ("…has had a day."), no mockery.
- **No allegations.** Nothing that says or implies a real company did
  something wrong. The satire is about corporate culture and finance-speak,
  through fictional archetypes.
- No gore, as everywhere. Company names appear only as tickers (owner
  decision, §11).

## 10. Data

### 10.1 Universe

The **S&P 100** to start (100 tickers, all 11 sectors, big enough to draft,
small enough for one API call), plus the S&P 500 index (via SPY) as the
benchmark. The list and each stock's sector, cap tier, beta and dividend
yield are refreshed weekly into `markets/stocks.json` by a script; only
prices come live.

### 10.2 Feed

```
Cloudflare Cron, every 30 min in market hours (+ 9:31 and 16:01)
  └─ worker career-crash-markets (existing apps/markets, new adapter)
       1. one batch quote call for the 100 + SPY
       2. score vs SPY (§5.1) → snapshot (~6 KB)
       3. KV: stocks/2026-11-02T1400.json, stocks/latest.json (kept 10 trading days)
       4. earnings calendar once a day (pre-market)
```

- **Provider:** needs batch quotes (100 symbols in one request) and terms
  that allow showing derived % changes on a free site. Candidates to verify
  before phase 2: **Alpaca market data** (free plan, IEX feed, multi-symbol
  snapshots), **Finnhub** (free key, per-symbol, 60/min), **Twelve Data**
  (free 800/day). Free tiers are delayed and some forbid commercial
  redistribution; check the terms, not the blog posts.
- Showing 15-min-delayed prices is fine: the floor runs a candle behind
  anyway, and "Prices delayed" is in the footer.
- Failures: as 08 §10 (carry on with the last snapshot, show "delayed").

## 11. Owner decisions needed

1. **Name.** *Hostile Takeover* (`/takeover`), or *Bull Pit*, *Closing Bell*,
   *The Big Board*, *Synergy*.
2. **Tickers only, or company names too?** Tickers only is safer
   (proposed).
3. **Universe:** S&P 100 (proposed) or the top 50.
4. **Candle length:** 30 min (proposed; 13 a day) or hourly (7).
5. **Data provider** after a terms check (§10.2).
6. **Accounts:** none in v1 (local fund + share links, proposed); a weekly
   league with stored funds later needs the API worker's D1.

## 12. Phases

1. **Big Board on sample data.** `markets/stocks.json` (10 megacaps on
   sector archetypes borrowing career art, like Crypto Bros phase 1), the
   trading-day clock with open/closed states, page `/takeover`. Screenshots.
2. **Live feed.** Provider chosen, stocks adapter in `apps/markets`, KV,
   Rewind, `pnpm balance --stocks` on recorded days (target: the day's best
   relative performer of the ten wins the day 60–75%).
3. **My Fund.** Draft (Cap Space, Overweight, Hedge), Index Fund team,
   13-round day, fund report card, share links, sector aura and Balanced
   Portfolio synergy.
4. **Life on the floor.** Scene events (§12.1), earnings calls, lunch and
   power hour, the Weekend Retreat, badges; weekly league if wanted.
5. **Art.** Painted: 11 sector bodies + heads, the Index Fund, the Short
   Seller, the Specialist, *The Exchange* backdrop. Forged: props, critters,
   FX, icons (§8).

### 12.1 Scene events

| Event | When | What happens |
|---|---|---|
| **Rate Hawk** | Market down; Fed days always | A hawk in a tie swoops on the floor's leader: knockdown, `slowed` (forged sprite, built) |
| **Rate Dove** | Market up; Fed days | A dove drops olive branches: small heals for everyone |
| **Stock Split** ★ | A fighter's stock is up big, rare | The fighter splits into two half-size copies with half the health each, for the rest of the candle |
| **Buyback** | A fighter's stock is up | They pick up their own coins: heal |
| **Dividend Day** | Ex-dividend date | The fighter rains coins; teammates heal |
| **Short Squeeze** | The day's worst performer turns sharply | The Short Seller is swarmed; the squeezed fighter goes `pumped` |
| **Sector Rout** | A sector is the day's worst | A wave hits every fighter of that sector (§5.3) |
| **Activist Investor** | Rare | A gatecrasher in a bow tie takes over one fighter's AI for a candle ("I have some notes") |
| **Hostile Takeover** ★ | Rare, the page's namesake | Whoever lands the KO on a fighter *acquires* them: the KO'd fighter swaps teams for the rest of the candle, in a new lanyard |
| **Golden Parachute** | A megacap is KO'd | They float gently off the floor under a gold parachute instead of ragdolling (forged sprite, built) |
| **Dead Cat Bounce** | A stock that fell all morning turns up | A cat bounces across the floor (strictly cartoon, it lands on its feet and leaves offended) |
| **Circuit Breaker (Level 1)** | S&P down 7% (real rule, very rare) | Everything stops for a 15-s "TRADING HALTED" beat; klaxon; the Specialist faints |
| **The Regulators** | ~1 day in 5 | Reuse Crypto Bros' gatecrasher set (08 §15) |

★ = needs a new engine concept (AGENTS rule 5).

## 13. Code map (planned)

| Piece | Where |
|---|---|
| Page | `apps/client/takeover/index.html`, `apps/client/src/takeover/` (Floor, Draft, Report, `fund.ts` share-link codec) |
| Scoring, fund, day clock, NYSE calendar | `packages/game-rules/src/stocks.ts` (reuses `markets.ts`) |
| Content | `packages/content/data/markets/stocks.json` (universe, sectors, power map, events), `abilities/stocks.json`, `arenas/exchange.json`, `synergies` (Balanced Portfolio) |
| Sim | Team fights as now; endless floor as 08; ★ concepts as needed |
| Feed | `apps/markets` stocks adapter |
| Balance | `tools/balance/src/stocks.ts` |
| Art | painted: `career-crash/art/takeover/` briefs; forged: `career-crash/art/pixel/` |
