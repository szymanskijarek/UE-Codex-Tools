# 09 — Diplomatic Incident (design v0.1)

Status: **design only, nothing built.** A second endless floor, after Crypto
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

**Diplomatic Incident** (short form *the Incident*, `#DiplomaticIncident`). It
is satire of summits and protocol, not of peoples, and every knockout *is* one.
Other names considered: *Summit Smash*, *Flag Fight*, *Border Brawl*, *United
Nations of Punch*, *Countryball Royale*. The URL is `/incident`, and each
country gets its own: `/incident/pl`.

## 1. Goals

- **Your like is visible.** Within five minutes of a like, the country you
  liked is stronger on screen, and you can see the like arriving (§5.4). That
  feedback loop is what makes people come back.
- **Every country gets screen time, every hour.** About 270 delegates walk on
  in an hour (§4.3), so all ~195 countries get onto the floor at least once.
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
- **Satire of institutions, never of peoples.** Delegates are bureaucrats in
  mascot heads. The jokes are about summits, catering and protocol. No
  stereotypes, no real politics, no real people (§9).
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
That's ~270 walk-ons an hour against ~195 countries, so every country gets on
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
- **Likes are not exclusive.** Liking all 195 countries changes nothing,
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

### 7.2 Gatecrashers (07's system)

One session in about six:

- **Summit Security**: a head of security with two earpiece agents. They
  tackle anyone who's been in a fight lately.
- **The Press Pool**: a reporter and two camera operators. Flashes `spooked`
  everyone, and their KOs become "exclusive" feed posts.
- **The Tour Group**: a guide with an umbrella and two lost tourists. Nobody
  knows why they're here.

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
country page has its own **preview card** (Open Graph image): the flagball
delegate mid-punch, the country's name and the line "Your country needs you."
In phase 3 these are pre-rendered at build time into
`dist-web/incident/<cc>/` (195 static HTML pages plus 195 images, a few MB).
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
195 stamps, with gold stamps for liking a country in an hour it won, and
visa-style badges ("Liked all of the Pacific Islands", "Liked a Wildcard that
went on to win", "Present at 24 Closing Ceremonies"). The passport is a
shareable image too. It rewards spreading likes around, which keeps the board
friendly rather than tribal.

### 8.6 Rivalry hours and tournaments

- **Derby hours:** scheduled hours where two neighbours or old sporting rivals
  have reserved seats and a "derby" banner (a curated, opt-in list of
  friendly rivalries: Australia–New Zealand, Argentina–Brazil,
  Spain–Portugal, England–Scotland-style football derbies). Never pairs with
  a live conflict (§9.3).
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

### 9.1 Delegates: flagball mascots in suits

Each country's delegate is a **mascot**: a round ball head painted in the
country's flag with cartoon eyes and brows (the countryballs meme is the
shorthand, in Career Crash's own style), on a delegate body: a suit, a
lanyard, and a sash in the flag's colours.

This choice carries the whole mode:

- **No skin tones, faces or costumes standing in for a people.** A flag is a
  symbol each country chose for itself.
- **Art scales to ~195 countries for the price of one.** One body sheet in a
  neutral grey suit, plus one **eyes sheet** with the four emotions
  (neutral, angry, surprised, hurt). At runtime the client draws the flag
  (from an SVG set) into a circle, lays the eyes over it, and tints the sash
  and tie from the flag's two main colours. Nothing per country to paint, and
  it costs ~0 KB per country in the atlas.
- **Flags:** the MIT-licensed `flag-icons` SVG set (bundled, ~1 MB total,
  loaded per country on demand). Emoji flags don't render on Windows, so
  they're only used in share texts.
- **Body types:** 3 body sheets (tall, average, round), assigned by a hash of
  the country code, so the floor doesn't look cloned.

### 9.2 Moves: postings, not national traits

No country gets moves based on what it's "like". Each delegate is given a
**posting** for the day: one of eight summit jobs, assigned by a hash of
(country, date), so everyone rotates through them. Each posting is an existing
career's moveset (as the bros borrow careers) plus one signature summit move:

| Posting | Fights as | Signature move |
|---|---|---|
| Interpreter | Teacher | **Lost in Translation**: target `lectured`, its next ability fizzles |
| Minute-Taker | Accountant | **Strongly Worded Letter**: a paper projectile, knockback |
| Protocol Officer | Security Guard | **Red Carpet**: a carpet yank, everyone on it trips |
| Press Attaché | Journalist | **No Comment**: blocks the next hit and taunts |
| Catering Liaison | Chef | **Canapé Barrage**: thrown food props |
| Head of Security | Police Officer | **Escort Out**: a grapple, thrown towards the doors |
| Intern | Delivery Driver | **Wrong Room**: a dash that ends somewhere random |
| Envoy | Life Coach | **Photo Op**: pulls everyone near into a handshake stun |

Plus three shared moves every delegate can use: **Veto** (interrupts an
ability being channelled), **Sanctions** (`slowed` + energy drain) and
**Walkout** (a dash away at low health). All of these are built from
existing effects, with no ★ engine work (balance check in §11).

### 9.3 Content rules (hard)

- **Countries:** the ISO 3166-1 list of sovereign states plus the two UN
  observer states (**owner decision on disputed entries**, §13). Names come
  from `Intl.DisplayNames`, so the browser's own naming is used.
- **No real people:** no leaders, politicians or celebrities, and no
  look-alikes or names that point at them.
- **No politics, wars, history, religion, ethnicity, borders, disasters or
  national stereotypes** in any text, art, move or event. Jokes are about
  summits: catering, protocol, seating plans, translation, minutes, photos,
  lanyards.
- **No user-written text anywhere.** No chat, no names, no messages. There is
  nothing to moderate except the numbers.
- **Sensitive pairs:** `countries.json` → `quietPairs`, a list of country
  pairs (active conflicts, recent disputes) between which rivalry posts,
  derby hours and "X knocked out Y" headlines are **never** generated. The
  fight still happens (removing them would itself be a statement), but the
  feed stays generic ("A delegate has been escorted out."). Reviewed monthly.
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
| Most-liked country wins the hour | **55–70%** |
| Most-liked country in the top 3 | ≥ 85% |
| A Wildcard wins at least one session | in ~1 hour of 3 |
| Every country on the floor at least once | ≥ 99% of hours |
| Every posting within ±20% of an even share (flat likes) | `pnpm balance --incident-flat` |
| Knockouts per session | 18–30 |
| 10× likes vs another country | wins their 1v1 ~70% of the time, not 99% |

The score is log-scaled with `lobbyBoost` and the power swing in
`countries.json`. Tune the swing before the curve.

## 12. Implementation plan

Each phase ends with `pnpm check`, screenshots of the page (Playwright,
`pnpm dev:client`), and a short report. Nothing goes to prod without the
owner's yes.

### Phase 0: decisions (this document)

Settle §13: the name, the country list, the Turnstile stance and the derby
list. Write the art brief (`career-crash/art/incident/INCIDENT_BRIEF.md`, in
the style of `FX_BRIEF.md`) so the art arrives while phase 1 runs.

### Phase 1: offline prototype (no votes)

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

Summit Hall backdrop and obstacles (intact/damaged/destroyed), 3 delegate body
sheets, eyes sheet, the Chair, the gatecrasher sets, critter/mover art for the
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

## 13. Open questions (owner decisions)

1. **The name.** *Diplomatic Incident* proposed; alternatives in the intro.
2. **Which countries.** ISO 3166-1 sovereign states plus UN observers is the
   proposal. Disputed and partially recognised entries (e.g. Taiwan, Kosovo,
   Western Sahara) need a deliberate yes or no. Whatever is chosen, say it on
   the page ("the list follows ISO 3166-1").
3. **Turnstile.** Off by default with PoW, on as an emergency switch
   (proposed), or always on (stronger, but breaks "no third-party scripts").
4. **Likes per viewer.** One per country per hour as briefed. Alternatives:
   one *total* per hour (a stronger choice, less to stand on for small
   countries), or a budget of 3.
5. **The derby list** (§8.6): which friendly rivalries, if any.
6. **Late joins.** Should a country be able to "skip the queue" if its likes
   jump? (Proposed: no, only the gentle lobby boost.)
7. **Monetisation:** none proposed. If ever, cosmetic only (03 §6), never
   likes or power.
