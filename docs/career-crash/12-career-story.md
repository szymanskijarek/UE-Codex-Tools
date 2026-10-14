# Career Crash: the story mode and Messages (design + implementation plan)

Status: **phase 1 built** (see §12 for what exists and what doesn't yet). Owner of: the Messages tab, story beats,
the first-time experience (FTUE), the friend, temps vs hires, opponent counts
on the ladder, chapter structure and the cameos from the other shows. Where it
changes an existing rule it says so; the owning doc (03 §3.5–3.6, 06 §2, 07 §2)
gets updated in the same commit as the code.

Art for it: [`career-crash/art/STORY_BRIEF.md`](../../career-crash/art/STORY_BRIEF.md).

---

## 1. Why

Career mode today is a working ladder with no story. The player picks a job and
lands on a full hub: a feed of strangers, a job posting, Easy Apply, two free
agency temps who are as strong as the opposition. Nothing introduces anything,
so nothing feels earned, and the hiring screen (locked until Senior rank) is a
long way off with little reason to use it when free temps are this good.

The fix is a thin layer of **story told through messages**, the way the site we
parody tells it: a DM pings, someone introduces you, a recruiter "came across
your profile". Every unlock gets a person who hands it to you, and every other
show on careercrash.org gets a character who walks into your feed.

Goals:

1. **First five minutes:** empty profile → a friend introduces you → the feed
   fills → a recruiter unlocks Easy Apply → two easy 2v2 fights with the friend
   → the friend leaves → you're alone, with temps and hiring as answers.
2. **Progress you can feel:** every 1–3 fights something new opens or someone
   new writes, and the hub always says what comes next.
3. **Hires matter:** temps are cheap, weak, and never grow; a hire is the first
   real investment and the numbers show it.
4. **Cross-promotion that is content, not ads:** Crypto Bros, Diplomatic
   Incident and Broken News characters arrive as people with a reason to talk
   to you, and their posts link to their pages.
5. **Comedy first:** LinkedIn-parody tone, workplace slapstick, no gore, no
   cruelty (Broken News characters keep their voice rules, 11 §1 and §10).

Non-goals: free-text chat (replies are canned, §3.3), a branching narrative
(choices colour lines, not outcomes), any change to the sim.

---

## 2. The first session, beat by beat

Times are from the hub first loading. Every UI-timed beat has a fallback so it
can never block (§4.3).

| # | When | Who | What happens | Unlocks |
|---|---|---|---|---|
| 0 | Career created | — | Hub in **empty state**: 0 connections, feed shows "Your feed is quiet" (empty-state art), no job card, no Easy Apply, "People you may know" empty. Profile card, Skills and Shop are there. | — |
| 1 | ~4 s | **Friend** | 🔔 ping, a message pops up docked bottom-right: "omg you're FINALLY on here. ok let me sort you out." Opening it shows the thread with 2–3 canned replies. | Messages tab |
| 2 | Player replies (fallback 20 s) | Friend | "Introduced you to a few people. Don't thank me, thank my 500+." **Connections 0 → 12** (counter rolls), posts slide into the feed one by one over ~3 s (the existing starter posts plus the friend's own "Delighted to introduce my oldest friend…" post). | Feed, connections |
| 3 | Player scrolls past the 4th post (fallback: 25 s on the hub, or "Show more") | **Recruiter** of stage 1's company | 🔔 "Hi {first}, I came across your profile and think you'd be a great fit for a Brawler role at {company}. It's a group interview: bring a friend!" Reply "Interested" / "Tell me more" / "Is this a scam?" | **Easy Apply**, job card slides in |
| 4 | After reply | Friend | "a GROUP interview?? I'm in. I've been training (I've watched a video)." Friend joins the line-up. | Friend in squad |
| 5 | Fights 1–2 | — | **You + friend vs 2.** Stage 1 opponents a level down. Easy Apply shows the count (§5). | — |
| 6 | After fight 2 | Friend → **Gas Fee Gavin** (Crypto Bros) | Friend: "ok don't be mad. a guy called Gavin slid into my DMs. I'm Head of Vibes at a DAO now." Friend's farewell post, Gavin in the comments, link card to /cryptobro/. Friend leaves the line-up. | Bro posts in feed |
| 7 | Right after | **Temp agency** (Temporarily Yours Staffing) | "Short-staffed? Our temps turn up. Mostly. From 💵 30 a shift." | **Temps** (§6.1) |
| 8 | After fight 3, or cash ≥ cheapest hire | **Talent Acquisition** (Karen Whitfield, already a feed persona) | "Temps are a cost. People are an investment. 🚀 (Also temps are a cost.)" Shows what temps have cost so far. | **Hiring**, 1 squad slot |
| 9 | Before the chapter boss | **The boss** | Pre-fight DM in the boss's voice ("Looking forward to our final interview. Bring a pen. You'll need it to sign your resignation."). | — |
| 10 | Chapter 1 boss beaten | Karen | **Offer letter** (§7.2), promotion headline. | 2nd squad slot |

By the end of chapter 1 (4–6 fights, ~15 minutes) the player has met every
system the old hub showed on minute one, each from a person.

---

## 3. Messages

### 3.1 What it looks like

A parody of LinkedIn Messaging, built in Preact like the rest of the career UI.

- **Ping:** a synthesised two-note notification (new `uiPing` in
  `replay/audio.ts`, respects mute) and a **message pop-up**: avatar, name,
  first line, slides in docked bottom-right (desktop) or top (phones), stays
  until opened or dismissed, stacks at most two. Not the `notify()` toast.
- **Dock (desktop ≥ 900 px):** a collapsed "💬 Messaging" bar bottom-right with
  the unread count; opens a 360 px panel over the hub (thread list ↔ thread).
- **Screen (phones):** `#/career/messages` (thread list) and
  `#/career/messages/:contact` (thread). Header link "💬 Messaging (2)" on every
  career screen, and in `CoreActions` when something is unread.
- **Thread:** bubbles, "{name} is typing…" for 0.6–1.8 s before each message
  (UI only), a timestamp in fights ("2 fights ago"), link cards (same component
  as the feed's), and **reply chips**.

### 3.2 Contacts

A contact is a person or company with a portrait (`Portrait`, so painted faces
for careers and personas work as-is) or an icon square. Kinds:

| Kind | Examples | Portrait from |
|---|---|---|
| `friend` | the friend (§6.2) | their career's face |
| `recruiter` | each stage company's recruiter | company icon square |
| `persona` | Karen Whitfield (Talent Acquisition), the temp agency | a career face (`career.hotel-concierge` for Karen) / icon |
| `boss` | the arena boss | boss career face |
| `bro` | Gas Fee Gavin, The OG, Speedrun Sol… | `broSpeaker()` (08 cast) |
| `delegate` | your nationality's delegate, else a rotating one | `delegateSpeaker()` (09) |
| `news` | Brock, Philippa, Bev, Kevin (BSN) | the news cast art (10, 11) |
| `crasher` | the leader of a set that crashed your fight | crasher persona art (07) |

### 3.3 Replies

Two or three **canned reply chips**, written like LinkedIn's smart replies and
then slightly wrong: "Thanks!", "Interested", "Sounds great 👍", "Is this a
scam?", "Who is this?". No free text: nothing to moderate, nothing stored that
isn't ours. A reply may set a flag that picks later lines (the friend remembers
you called the DAO a scam), never a gameplay outcome, except where a beat is
explicitly a choice (offer letters, §7.2).

### 3.4 Unread and history

Threads keep every message; unread counts are per thread. Story messages are
stored as references (`beat id + line index`), so the save stays small and
copy edits reach old saves.

---

## 4. Story beats (data)

### 4.1 Content

New content folder `packages/content/data/story/` (no gameplay numbers in TS):

- `contacts.json`: id, kind, name or name rule (`{company} Recruiter`), sub
  line, portrait source, `link?`.
- `ch1.json`, `ch2.json`…, `systemic.json`: beats.

A beat:

```jsonc
{
  "id": "story.ch1.intro",
  "contact": "contact.friend",
  "trigger": { "kind": "idle", "ms": 4000 },          // see 4.2
  "after": ["story.ch1.start"],                          // beats that must have fired
  "lines": ["omg you're FINALLY on here.", "ok let me sort you out."],
  "replies": [
    { "text": "Thanks!", "next": "story.ch1.network" },
    { "text": "Who is this?", "next": "story.ch1.network", "flag": "friend.cold" }
  ],
  "effects": [ { "kind": "unlock", "what": "messages" } ],
  "fallbackMs": 20000                                    // UI-timed only: fire `next` anyway
}
```

Lines use the feed's slot syntax (`{me}`, `{first}`, `{friend}`, `{company}`,
`{next}`, `{arena}`, `{boss}`, `{cash}`, `{tempspend}`) and can be lists (one is
picked from the save's seed, like feed posts). Text lives in the beat file, as
crasher posts do; the compiler checks it (§9.2).

### 4.2 Triggers and effects

| Trigger | Fires when |
|---|---|
| `start` | the career is created |
| `idle` `{ms}` | the hub has been open `ms` since the last beat fired (UI clock; not saved) |
| `scroll` `{posts}` | the n-th feed post scrolled into view (IntersectionObserver) |
| `reply` | the player picked a reply that names this beat as `next` |
| `fight` `{n, outcome?}` | results of the n-th career fight were collected |
| `stage` `{reached}` / `boss` `{chapter}` | ladder position / a chapter's boss was beaten |
| `rank` `{rank}` / `level` `{level}` | main character reached it |
| `cash` `{atLeast}` | wallet after a fight |
| `lossStreak` `{n}` | n losses in a row (help beats: "have you tried hiring?") |
| `crash` | first fight with gatecrashers |
| `nationality` | a nationality was set |

| Effect | Does |
|---|---|
| `unlock` `{what}` | `messages`, `feed`, `easyApply`, `temps`, `hiring`, `squadSlot`, `nationality`, `shopTier` |
| `connections` `{n}` | adds connections (rolls the counter, §7.3) |
| `feed` `{posts}` | writes posts now (`starter`, a `live.json` key, or a cameo post) |
| `partner` `{join | leave | rehire}` | the friend joins/leaves the line-up, or comes back as a free hire |
| `cash` / `item` | a gift (signing bonus, a meal deal from the friend) |
| `offer` `{choices}` | offer letter: pick one of three rewards (§7.2) |
| `gate` `{feed kind}` | lets a kind of post into the feed (`bro`, `delegate`, `news`) |

### 4.3 Never stuck

UI-timed triggers (`idle`, `scroll`, `reply`) are conveniences. Each has
`fallbackMs`; and on any career screen load, a beat whose UI trigger was missed
fires if its fight/stage condition already passed. A "Skip the intro" link in
Career settings fires every chapter 1 setup beat at once (for restarts).

### 4.4 Rules engine

`packages/game-rules/src/story.ts`, pure and unit-tested:

- `dueBeats(story, content, event) → BeatDef[]` (event = `start | fight | ui:idle
  | ui:scroll | reply | …`), in content order, each at most once.
- `applyBeat(save, beat, rngSeed) → save'`: appends thread lines, applies
  effects, returns which pop-ups to show.
- No `Date` in state transitions; UI timers only decide *when* to call it.

Client: `apps/client/src/career/story.ts` (scheduler: timers, scroll observer,
hooks into `startCareer`, `collectResults`, `setNationality`) and
`apps/client/src/career/messages/` (`Dock.tsx`, `Messages.tsx`, `Thread.tsx`,
`Ping.tsx`).

### 4.5 Save

```ts
interface StoryState {
  v: 1;
  fired: string[];                       // beat ids, in order
  threads: Record<string, { lines: [beat: string, i: number, fight: number][]; read: number; replied: Record<string, number> }>;
  flags: Record<string, boolean | number>; // unlocks, reply flags
  connections: number;
  friend?: CareerChar;                   // while partnered, and kept after they leave (cameos, rehire)
  tempSpend: number;                     // 💵 spent on temps so far (Karen quotes it)
  temps: number;                         // temps booked for the next fight (0–2)
}
// CareerSave gains: story?: StoryState
```

---

## 5. Opponent counts: 1 to 3

Easy Apply and "Meet the hiring team" show how many interviewers the next
stage has, from 1 to 3, gatecrashers not counted (they're never announced).

- **Label:** "🥊 Easy Apply · 2 interviewers" and three seats on the job card
  (filled 👤 / empty ⬚). Kinds by count: *One-to-one* (1), *Group interview*
  (2), *Panel interview* (3), *Final interview* (boss).
- **Shape,** in `economy.json` → `ladder`:

```jsonc
"ladder": {
  "chapter1": [2, 2, 1, 3],               // stages 1–4; the boss stage counts the boss
  "pattern": [[1, 2, 3, 2], [2, 1, 3, 3], [2, 3, 1, 2], [3, 2, 2, 3]], // later chapters, picked by chapter
  "solo":  { "levels": 2, "rank": 1, "stats": 1 },   // a one-to-one interviewer is senior
  "duo":   { "levels": 1, "rank": 0, "stats": 1 },
  "panel": { "levels": 0, "rank": 0, "stats": -1 },  // a panel is three juniors
  "tutorial": { "stages": 2, "levels": -2, "stats": -2 } // stages 1–2, with the friend (replaces the above)
}
```

- `opponentTeam(bundle, seed, stage, diff, size)` already takes `size`; the new
  `ladderSize(bundle, stage)` feeds it, and the per-count offsets go into
  `generatedFighter`'s level and rank. The sim already handles uneven teams
  (spawns a/b have 5 spots per arena); the battle `mode` label stays.
- **Gatecrashers (07):** never before stage 3 (was: never in fight 1), and
  crew size capped at the bigger side's size, so a solo fight never gets three.
  07 §2 updated.

---

## 6. Line-up: friend, temps, hires

### 6.1 Temps (03 §3.5 changes)

Today: free, same level and rank as you, Normal-difficulty skill spending, a
meal deal each. New:

| | Old | New (`economy.json` → `temps`) |
|---|---|---|
| Cost | free | 💵 `30 + 4 × stage` each, per fight, paid as the fight starts (booked temps keep coming until unbooked; only as many as you can afford) |
| Level | yours | yours − 4 (min 1) |
| Rank | yours | Trainee, main move only (`spendBp` 0) |
| Stats | as generated | −3 each (`statOffset`) |
| Packed | meal deal | nothing ("brought a lanyard") |
| Growth | none | none |
| Look | normal | visitor sticker on the torso, "TEMP" lanyard on portraits (art) |

Booking: two seats on the job card show **＋ Temp 💵 38** buttons; a booked temp
fights the next fight only. Without temps or hires you fight alone (allowed:
it's a joke and a challenge, and chapter pattern keeps some 1-opponent
stages).

### 6.2 The friend

Generated per save so no new art is needed: a career from a **complement
pool** (a healer or tank if you picked a hitter, a hitter if you picked support;
pools in `economy.json`), your level, your rank, 70% of skills spent, a meal
deal. They level with you while partnered (stored in `story.friend`, not in
`chars`, so they never count toward the staff cap or Garden Leave). Name from
the name lists, seeded. Headline: "{career} · Your friend · 500+ connections".

Their arc (§8): leaves after fight 2 for Gas Fee Gavin's DAO, posts from the
trading floor, and comes back in chapter 4 when the DAO dissolves, as a **free
hire** at their saved level. A payoff the player remembers.

### 6.3 Hiring (03 §3.5, 06 §2 change)

- Hiring unlocks from beat 8 (after fight 3 or once the wallet covers the
  cheapest applicant), not at Senior rank. `SQUAD_UNLOCK_RANK` goes.
- **Squad slots open with the story:** 1 at beat 8, 2 when chapter 1's boss
  falls (`economy.hr.squadSlots`). Staff cap stays 6.
- Costs stay 💵 250 / 450 / 700. Karen's message quotes your temp spend so far
  ("You've spent 💵 {tempspend} on people who called you 'boss' and 'mate' and
  once 'Dad'"), so the maths is in the player's face.
- Squad screen: hires show a "grows" tag and their next rank, temps a
  "doesn't grow" tag, side by side.

### 6.4 Balance targets (Normal)

Measured by a new `pnpm balance --ladder` (§9.3), which plays stages 1–16 with
fixed line-up policies:

| Stages | Line-up | Opponents | Target win rate |
|---|---|---|---|
| 1–2 | you + friend | 2 (tutorial −1 level) | ~85% |
| 3 | alone | 1 (senior) | ~45% |
| 3 | you + 1 temp | 1 | ~65% |
| 4 (boss) | you + hire + temp | boss + 1 | ~55% |
| 4 (boss) | you + 2 temps | boss + 1 | ~35% |
| 5–8 | you + 2 hires | 1–3 | ~65–70% (today's Normal) |
| 5–8 | you + 2 temps | 1–3 | ≤ 40% |

The headline is the gap: **two hires vs two temps ≥ 25 points** from chapter 2.

**Measured** (phase 1, `pnpm balance --ladder --battles=60`, Normal; the player
is a generated fighter at the stage's level, a hire a level and a rank behind):

| Stage | Arena | Opp | solo | temp | temps | friend | hire+temp | hires |
|---|---|---|---|---|---|---|---|---|
| 1 | supermarket | 2 | 20% | 68% | 97% | 83% | 100% | 100% |
| 2 | supermarket | 2 | 15% | 67% | 97% | 93% | 97% | 100% |
| 3 | supermarket | 1 | 35% | 90% | 100% | 93% | 100% | 100% |
| 4 ☠ | supermarket | 3 | 0% | 2% | 15% | 18% | 38% | 50% |
| 5 | office | 1 | 25% | 90% | 98% | 100% | 100% | 100% |
| 6 | office | 2 | 2% | 10% | 52% | 27% | 73% | 78% |
| 7 | office | 3 | 0% | 3% | 18% | 12% | 40% | 53% |
| 8 ☠ | office | 2 | 0% | 5% | 42% | 37% | 72% | 83% |
| 9 | diner | 2 | 2% | 17% | 48% | 42% | 83% | 92% |
| 10 | diner | 1 | 42% | 88% | 100% | 95% | 100% | 100% |
| 11 | diner | 3 | 0% | 0% | 12% | 3% | 47% | 65% |
| 12 ☠ | diner | 3 | 0% | 0% | 3% | 3% | 12% | 45% |

Friend stages land at 83–93%, a lone senior interviewer beats you alone about
two times in three but falls to you plus one temp, and from chapter 2 two hires
beat two temps by 20–40 points (most on panels and bosses). Panels (3) are the
hard stages; one-to-ones are the breathers.
Temps' offsets in `economy.json` get tuned until it holds.

---

## 7. Making progress feel like progress

### 7.1 "Next up" strip

Under the profile card: the next thing that opens and how far it is, from the
beat list and the ladder ("2 wins to your first hire", "Shop restocks at stage
6", "Final interview at {company} in 1 fight"). Pure function of the save and
the content (`nextUnlock(save)`), so it never lies.

### 7.2 Offer letters

After every chapter boss, the recruiter of the next chapter's first company
sends an offer letter (art: letter card): **pick one of three**, e.g. signing
bonus 💵 (`200 × chapter`), a guaranteed rare perk roll, a free applicant of
the next rarity up, or a stat respec. Numbers in `economy.json` → `offers`.
The headline on the profile steps up a title (Intern → Associate → Senior
Associate → Manager → Director → VP → C-suite, by chapter).

### 7.3 Connections

A visible number on the profile ("500+" once past 500, the real joke):
+12 from the friend, +3–8 per fight (more for wins and KOs), +20 per cameo
contact, +50 per boss. Milestone badges at 50, 100, 250, 500+ (art) unlock
feed variety: more strangers commenting, a "Top Voice" pill at 500+. Cosmetic
only.

### 7.4 Faster early levels

`economy.story.earlyXpBp` (proposal 15000) on stages 1–4 so the main character
levels after fights 1, 2 and 4, and spends the first skill point before the
first boss. Results screen gains "What changed": level, rank bar, connections,
the new thing that opened, and the "Next up" line.

### 7.5 Chapter cards

Entering a new arena shows a one-screen card: arena art, "Chapter 2: The
Office", the company you're applying to and who wrote to you. Uses the
existing arena art (no new art).

---

## 8. The cast beyond chapter 1

Each chapter has an **opener** (who brings you to the new arena), a **boss
DM**, and one **cameo** from another show. Cameos `gate` their kind of post into
the feed, so bro, delegate and BSN posts appear after someone introduced them
(today they appear from fight 1). Links use the existing `CRYPTO_URL`,
`INCIDENT_URL`, `NEWS_URL` (careercrash.org in the single-file build).

| Ch | Arena | Cameo | Beat |
|---|---|---|---|
| 1 | Supermarket | **Gas Fee Gavin** (Crypto Bros) | Poaches the friend (beat 6). Comments "WAGMI 🚀" on the farewell post. Gates bro posts. |
| 2 | Office | **Gas Fee Gavin** again | DMs *you* an "opportunity". Replies: "Tell me more" / "What's a DAO?" / "No". All answers get the same pitch and a link to the trading floor. |
| 2 | Office | **Bev Fizzwilliam** (BSN) | Feed post live from the friend's DAO launch party, link to /news/. Gates BSN posts and ads. |
| 2 | Office (boss beaten) | **Brock Stetson Jr.** (BSN) | "BSN wants your comment on the {boss} situation." Replies pick the quote; BSN posts a story about your boss win with your quote. Voice-checked (§9.2). |
| 3 | Diner | **Your country's delegate** (Diplomatic Incident), else a rotating one | Invites you to the Summit Hall; unlocks the nationality field (today always shown) and a "Back {country}" link. Gates delegate posts. |
| 3 | Diner | **Kevin** (BSN intern) | Sends a message. It's empty. "Kevin is typing…" shows on the thread for the rest of the chapter. (Kevin never speaks, 11 §5.) |
| 4 | Station | **The friend**, back | "The DAO voted to dissolve itself. Then it voted to dissolve the vote." Open to work → free hire (`partner: rehire`). Gavin comments "few understand". |
| 5+ | rotating | pool | Systemic cameos: a bro per chapter, a delegate when your country tops the Summit, BSN when an episode goes on air (`ON_AIR`), the leader of the first gatecrash set you meet ("Apologies for the disruption. Not for the chair."). |

Rules: Broken News lines follow 11 §1 (likable, nobody cruel) and the voice
checks; delegates follow 09 §9.4; bros stay "not financial advice" parody,
nothing that tells the player to buy real crypto.

### 8.1 Systemic beats (any chapter)

- **Loss streak 3:** the friend (or Karen) suggests hiring or Relaxed difficulty.
- **Rank up to Senior:** the friend congratulates you, from the DAO.
- **Bag full:** Corner Shop DMs about selling perks.
- **Milestone career offer:** a recruiter "saw you're open to new roles".
- **First gatecrash:** the set's leader writes.

### 8.2 Invite-only gigs

One-off brawls offered in a message (owner's idea, added in phase 1). A gig
arrives in its own thread from whoever is hiring, with an **accept** and a
**decline** button. It can be accepted only there and only once; declined or
ignored for `expiresAfter` fights, it's gone for good. Each gig is offered at
most once per career.

- **When:** from fight `fromFight` (4), at most every `everyFights` (3), with
  `chanceBp` (50%) after each ladder fight, never while another invite is open,
  only gigs whose `minStage` you've reached (`economy.gigs`).
- **Who goes** (`side`): `squad` (your usual line-up, friend/hires/booked temps),
  `solo` (you alone), or `cast` (you plus the gig's own, very strange temps).
- **Off the ladder:** a gig never moves your stage or your record, drops no
  loot, and pays a flat fee × the difficulty multiplier. XP, HR notes and the
  nationality boost work as in any fight.
- **Afterwards:** your own post about it (`posts`), and the sender signs off in
  the thread (`after`).
- **Content:** `packages/content/data/gigs/*.json`. Opponents and allies are
  named, with a career (their moves) and an optional persona (`npc.gig-*`: job
  title now, their own art once the brief's sheets land; until then they wear
  the career's look).

| Gig | Arena | Side | Who |
|---|---|---|---|
| Battlefield Extra (Napoleonic) | theatre (a soundstage) | cast: a method actor and a stunt double who has never done a stunt | three French Imperial Guard extras, in costume since 5am |
| Silver Service Waiter | hotel | cast: Gaston the head waiter, Tiffany on her first shift | three posh gala guests told the waiters are "part of the entertainment" |
| Store Mascot | supermarket | solo | three rival mascots (a badger, a carrot, Mister Coupon) |
| Focus Group | airport | squad | cabin crew defending the overhead lockers |
| Night Guard | museum | solo | two performance artists "liberating" a vase |
| Team-building Away Day | warehouse | squad | three facilitators doing Trust Falls, on you |
| Cooking Show Pilot | diner | cast: the celebrity chef's understudy, a sous-chef who speaks in timers | three TV judges who fight back |

---

## 9. Implementation plan

Everything lands on `dev` in phases, each one shippable, each with
`pnpm check` green and screenshots of the hub in the report.

### Phase 1: story engine, Messages, chapter 1 (the FTUE)

1. **Schema** `packages/content-schema/src/story.ts`: contacts, beats,
   triggers, effects (zod). Bundle gains `story`.
2. **Content** `data/story/contacts.json`, `ch1.json` (beats 0–10),
   `systemic.json` (loss streak only); `economy.json` gains `ladder`, `temps`,
   `story.earlyXpBp`, `hr.squadSlots`, friend complement pools.
3. **Compiler** checks (§9.2).
4. **Rules** `game-rules/src/story.ts` (`dueBeats`, `applyBeat`, `nextUnlock`),
   `ladderSize`, opponent offsets by count, new `agencyTemp` (weak, paid),
   `partnerFriend`. Tests in `packages/game-rules/test/story.test.ts`: the
   chapter 1 script replayed from a fresh save (beats fire once, in order,
   fallbacks fire, no beat fires twice after reload), ladder sizes 1–3, temp
   strength below a hire's.
5. **Client:** `career/story.ts` scheduler; `career/messages/*` (dock, screen,
   thread, ping); hub empty states and gated Easy Apply/job card/FAB; job card
   seats with temp booking; interviewer count on every Easy Apply button
   (`Hub`, `CoreActions`, `EasyApplyFab`); route `#/career/messages[/:id]`;
   `uiPing` sound.
6. **`model.ts`:** `lineup()` = main + friend (while partnered) + hires in
   squad + booked temps; `prepareFight` uses `ladderSize`; `collectResults`
   raises `fight` events and charges nothing extra (temps are paid at booking);
   `migrate()` (§10).
7. **Balance:** `tools/balance/src/ladder.ts` + `pnpm balance --ladder`; tune
   temps until §6.4 holds; numbers in the PR.
8. **Docs:** 03 §3.5 (temps, hiring), 06 §2 (squad slots), 07 §2 (earliest
   stage, crew cap), this doc's status, `INDEX.md`, `README.md` feature list.

### Phase 2: progress

`nextUnlock` strip, offer letters, connections counter and badges, headline
titles by chapter, "What changed" on Results, chapter cards, faster early XP.
Tests for `nextUnlock` and offer rewards (no Gold Star path, 03 §6).

### Phase 3: the cast

`ch2.json`–`ch4.json` and the systemic cameo pool; feed gating by `gate`
effects (`feed.ts`: bro/delegate/news posts only once introduced, for story
saves); `newsSpeaker()` for BSN contacts next to `broSpeaker`/`delegateSpeaker`;
friend's posts from the DAO; rehire. Voice check: run BSN lines through
`news/voice.ts` in the content test (§9.2).

### Phase 4: art and polish

Import `STORY_BRIEF.md` art (empty feed, intro card, farewell card, offer
letter, rug-pull card, temp sticker and lanyard, connection badges);
pop-up and feed-reveal animations; reduced-motion fallbacks; Playwright
screenshots of the full FTUE on desktop and phone width.

### 9.2 Compiler checks (content build)

- Beat ids unique; `after`, `next` and contacts resolve; no cycles in `after`.
- Each chapter's chain from `start` reaches an `unlock easyApply` without a
  UI-only trigger lacking `fallbackMs`.
- Lines ≤ 300 chars, replies ≤ 3 per beat and ≤ 32 chars each, known slots only.
- Cameo contacts reference real cast: bro symbols in `markets/crypto.json`,
  delegate keys in `countries.json`, news cast ids in `news/cast.ts`'s list
  (exported as JSON for the compiler).
- BSN lines pass the `news/voice.ts` checks (run from the client test).
- `ladder` shapes only contain 1–3; boss stages ≥ 1.

### 9.3 Tests and tools

| What | Where |
|---|---|
| Story engine: order, once-only, fallbacks, reload | `packages/game-rules/test/story.test.ts` |
| Ladder sizes, temp vs hire strength | `packages/game-rules/test/ladder.test.ts` |
| Save migration (old save → story state) | `apps/client/test/career-migrate.test.ts` |
| FTUE end to end (fake timers) | `apps/client/test/story-ftue.test.ts` |
| Ladder balance | `pnpm balance --ladder [--battles=N] [--policy=temps|hires|solo]` |
| Goldens | unaffected (no sim change; career fights aren't goldens). If `opponentTeam`'s RNG order shifts, `pnpm golden:update` per AGENTS.md rule 2 |

### 9.4 Determinism

The sim is untouched. Story state changes only on events with deterministic
inputs (fight results, replies, the save seed). UI timers decide *when* a beat
is applied, never *what* it does. Line picks use `Rng.fromSeed(story:{seed}:{beat})`.

---

## 10. Existing saves

Saves without `story` are migrated at load:

- All chapter-1 setup beats marked fired, `connections` from the fight count,
  feed gates open, Messages unlocked with one welcome thread from Karen
  explaining the new agency terms.
- Hiring unlocked; squad slots as the new rule gives for their stage (2 for
  anyone past stage 4).
- Temps become paid and weak. To soften it: a one-off **💵 500 "restructuring
  bonus"** in Karen's message.
- Chapter cameos from their current chapter onwards still fire.

---

## 11. Owner decisions

Decided (Oct 2026): all six as recommended below; players may fight alone.

| # | Question | Recommendation |
|---|---|---|
| 1 | Existing saves: new temp rules, or keep free temps? | New rules + 💵 500 bonus (§10); one ruleset to balance. |
| 2 | The friend: generated per save, or one fixed named character with own art? | Generated (no art, every save differs); a fixed character later if the friend proves popular. |
| 3 | Can the player fight alone with no temps or hires? | Yes: it's funny and some stages have 1 opponent. |
| 4 | Squad unlock: story beat after fight 3 (this doc) or keep Senior rank? | Story beat: Senior arrives far too late for "investment" to mean anything. |
| 5 | Crypto "invest in Gavin's coin" side bet driven by the live hourly feed? | Not now: reads as gambling. Revisit as cosmetic-only. |
| 6 | Relaxed/Hard/Brutal: same story? | Same beats; difficulty only touches opponents (03 §3.5). |

---

## 12. As built (phase 1)

| What | Where |
|---|---|
| Schemas: contacts, beats (triggers, effects), gigs; economy `ladder`, `temps`, `friend`, `gigs`, `crashers.fromStage` | `packages/content-schema/src/index.ts` |
| Content checks (refs, reply chains, cycles, slots, gig casts) | `validateStory` in `packages/content-compiler/src/index.ts` |
| Content | `data/contacts/core.json`, `data/story/ch1.json` (beats 1–10), `data/story/systemic.json` (loss streak, old-save welcome), `data/gigs/core.json` (7 gigs) |
| Story engine, friend, gigs | `packages/game-rules/src/story.ts` |
| Ladder sizes, weak paid temps | `ladderSize`, `ladderAdjust`, `ladderOpponents`, `agencyTemp`, `tempCost` in `game-rules/src/skills.ts`; crasher cap `maxSize` in `crashers.ts` |
| Save, line-up, fights, gigs, migration, skip intro | `apps/client/src/career/model.ts` (`story` on the save) |
| Messaging screen, pop-ups, story runner | `apps/client/src/career/Messages.tsx`; route `#/career/messages[/:thread]`; nav badge in `app.tsx`; `ping` sound in `replay/audio.ts` |
| Hub: quiet feed, no job card until the recruiter, interviewer counts, temp desk, connections | `apps/client/src/career/Hub.tsx`, `CoreActions.tsx` |
| Tests | `packages/game-rules/test/story.test.ts`, `apps/client/test/career-story.test.ts` |
| Balance | `pnpm balance --ladder [--battles=N] [--stages=N]` (`tools/balance/src/ladder.ts`) |

**Art in:** the quiet feed, the friend's introduction and farewell cards (on their posts), the
offer letter (attached to Karen's message after chapter 1's boss), the temp visitor sticker (pinned to
temps' chests in fights: `Puppet.pin`, temps recognised by their `temp-` snapshot id) and lanyard (on
their portraits), and connection badges at 50 / 100 / 250 / 500+ on the profile; the rug-pull card
waits for the friend's return. Gig characters (brief Part B): the period drama's three (Napoleonic extra, method actor, stunt double) and the gala's three (head waiter, trainee waiter, posh guest) have their own art; the other seven still wear their careers' looks. **Not yet:** the desktop docked Messaging panel (Messaging is a page with two
panes on wide screens); chapters 2+ and the cameos (phase 3); progress features
(phase 2); the story art (phase 4). Old saves skip chapter 1 and get Karen's
💵 500 restructuring bonus; their booked temps match their old line-up.
