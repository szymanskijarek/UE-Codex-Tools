# 10 — Broken News (design v0.1)

Status: **block-out** (§10). The reusable studio open runs end to end at
`careercrash.org/news/` (unlisted, `noindex`) with stand-in art, one pilot
episode and a placeholder minigame. No real-news episode yet.

A weekly news show, as a game. Every week a new minigame covers one story from
the world news, comically and sarcastically, and every minigame starts the
same way: two anchors at a desk read the story, the conversation spirals, they
brawl for a few seconds, and the game begins. The studio is the vehicle; the
minigames are the cargo.

> *"Good evening, I'm Brock Stetson Jr." "And I'm Philippa Featherstonehaugh."
> "Thank you, Philippa Feather-Stone-Hog." "It's Fanshaw."*

Owner of: the show's format (the segment), the studio and its cast, the
episode script format and its rules, the minigame contract, the weekly
pipeline, and the content rules for satire about real news.

### Name

**Broken News** (working title, owner likes it; still open to the
alternatives below; short form *BN*). It's *breaking news* after a
brawl, and it fits Career Crash: things get broken. Tagline: *"We break it.
You fix it."* (the minigame is the fixing). The ident's logo cracks before
every episode.

Alternatives, by the joke they make:

| Joke | Names |
|---|---|
| breaking → broken | *Broken News*, *Breaking Point*, *Breaking & Entering*, *Broken Record* |
| crash (the house brand) | *Crash Bulletin*, *Crash Course*, *Newsflash Crash*, *Crash Report* |
| the brawl | *The Six O'Clock Brawl*, *Headline Smash*, *Newsbrawl Tonight*, *Fight at Eleven* |
| the news itself | *Breaking Noise*, *Hard News*, *Unbalanced Reporting*, *The Spin Cycle* |

**The BSN idea** (owner, 9 October): a channel name whose initials spell
*BS*, a cheeky nod to how much of the news is. It fits the cast too:
**Brock Stetson's initials are B.S.** Candidates:

| Name | The joke |
|---|---|
| **BSN: the Brock Stetson Network** | Brock named the channel after himself (he is the self-appointed senior anchor). Philippa insists it stands for *British Standards Network*; the ticker says *Breaking Stuff Network*. Nobody says the obvious. |
| **BSNN: Breaking Stuff News Network** | The cable-giant parody: four letters, two of them "news". |
| **BSN: Breaking Story Network** | The straight-faced version; the joke is in the initials only. |
| **Breaking BS** | Show title on BSN; also *BS at Six*, *Full BS*, *The BS Report*, *Total BS Tonight*. |

**Decided (owner, 9 October):** the channel is **BSN**, officially the
**Breaking Story Network**, and the show is *Broken News, on BSN*. Nobody
agrees what BSN stands for, and that's a running joke across every episode
(§3.4).

URL: `/news` whatever the name, each episode `/news/?ep=<id>` (later `/news/<id>`).

## 1. Goals

1. **Gamify the week's news.** Players come away knowing what actually
   happened (§4.3 "The real story"), having laughed at it.
2. **One vehicle, many games.** The studio, the cast and the open are built
   once; each week adds only a script and a minigame.
3. **Under a minute to the game.** The open gives context and a laugh, never a
   lecture. Skippable.
4. **Same tone as Career Crash.** Lighthearted, satirical, workplace
   slapstick, no gore. Punch up, not down (§7).

## 2. The format: one segment, every week

Every episode opens with the same segment, in this order:

| # | Phase | Length | What happens |
|---|---|---|---|
| 1 | **Ident** | 2.4 s | Sting. The BROKEN NEWS logo slams in and cracks. |
| 2 | **Desk** | ~25–40 s | Close-up of the anchors behind the desk. They read the story straight, then needle each other; it gets personal; the last line is the swing. A guest may walk on mid-argument. |
| 3 | **Brawl** | 2–6 s (pilot: 4) | Cut to the studio floor: the anchors (and guest) brawl, a real Career Crash fight, shot as a **close-up**: the camera locks onto the two anchors at up to 3.4× zoom (the guest runs into shot), unlike the wide director's camera of the mass brawls elsewhere in Career Crash, and keeps the bottom 16% clear for the straps. Everyone gets one shouted line as the first punch lands (a 0.8 s freeze-frame so it reads). |
| 4 | **Stand-by** | 1.6 s | Colour bars: *WE ARE EXPERIENCING TECHNICAL DIFFICULTIES*. |
| 5 | **Hand-off** | 2.6 s | *THIS WEEK ON BROKEN NEWS:* the minigame's title and one line on what to do. |
| 6 | **Minigame** | the game's own | The week's game, mounted into the same TV frame. |
| 7 | **Sign-off** | until the player leaves | *THAT'S THE NEWS*, the game's result line, **the real story** (§4.3) with a source, *Watch it again*. |

Phases 1–5 must fit in **60 seconds** (checked, §4.2). The broadcast furniture
stays on through the desk and the brawl: the LIVE bug, a clock showing both
time zones (*7:00 PM ET · MIDNIGHT GMT*, one for each anchor), the speaker's
lower third, the red BREAKING strap with the week's chyron, and a ticker
crawling with joke headlines. During the brawl the strap reads *LIVE:
ANCHORS "IN DISCUSSION"*.

### 2.1 The spiral (heat)

Every desk line carries a **heat** from 0 to 3, and the studio reacts:

| Heat | Desk | Camera |
|---|---|---|
| 0 professional | reading the autocue, polite smiles | locked off |
| 1 bickering | a correction, a mispronounced name, a sigh | slow drift |
| 2 personal | leaning in, tie askew, papers flying, faces angry | shaking, pushed in |
| 3 the swing | half out of the chair | hard shake, red vignette, big bubble |

Rules: the first line is heat 0, heat never goes down, the last line is heat
3. The story must be told (straight) in the first two or three lines, so the
player has the context before it falls apart.

## 3. The studio and the cast

### 3.1 The anchors

| | **Brock Stetson Jr.** | **Philippa Featherstonehaugh** |
|---|---|---|
| From | America (*very*) | Britain (*very*) |
| Title | Senior Anchor (self-appointed) | Co-Anchor; pronounced "Fanshaw" |
| Look | glossy chestnut hair helmet, square jaw, red power tie, navy suit a size too small, flag pin | sharp dark bob, reading glasses, royal-blue blazer, pearls, fountain pen |
| Voice | deep, loud, confident, wrong | bright, precise, dry, quietly furious |
| Running gags | mispronounces her name every week; his "Emmy" (regional, Best Hair); owns everything in the studio | corrects him; reads off "her" autocue; has a grudge and a pension |
| Brawl line (pilot) | *"BACK TO YOU, PHILIPPA!"* | *"IT'S FANSHAW!"* |

They are types, not people: no likeness of any real presenter or channel.
Who throws the first punch alternates; neither is the straight man for long.

### 3.2 Guests

Some weeks a third person barges in (`guest` in the script, walking on at a
given line): they make it worse and join the brawl. Recurring guests (looks
in `career-crash/art/news/04-GUESTS.md`): **Dusty Gale** (Weather, on a
short-term contract; in the pilot), **Coach Biff Malone** (Sports, shouts),
**Tamsin Quayle** (Traffic, live from the helicopter, even in the studio),
**Dr Ainsley Verity** (An Expert; agrees with whoever spoke last), **Kevin**
(The Intern; has never been allowed to speak, and one day will).

### 3.3 The studio

Two shots, made once:

- **The desk shot** (close-up): layered backdrop, anchors, desk front, so the
  anchors can change expression and lean in while the set stays put. The
  week's headline is written onto the video wall by the game.
- **The studio floor** (brawl): a small Career Crash arena with the desk in
  the middle and the anchors' spawns either side of it, so the first punch
  lands within a second.

Art: `career-crash/art/news/` (briefs 01–05). Until it arrives the desk shot is
CSS with the TV host's and journalist's faces, and the brawl uses those
careers' puppets in the Theatre (§10).

### 3.4 What BSN stands for (running joke)

Officially: **Breaking Story Network**. Nobody believes it.

| Who | BSN is the… | Where it shows |
|---|---|---|
| The channel | Breaking Story Network | ident ("BSN presents"), live bug, feed ads, sign-off |
| Brock | Brock Stetson Network (his initials; he's sure he owns it) | his lower third, every episode |
| Philippa | British Standards Network | her lower third, every episode |
| Each guest | their own (Dusty: Barometric Storm Network) | their lower third (`guest.bsn`) |
| The ticker | **a different one every episode** (`bsn` in the script) | first item on the crawl: `BSN: BREAKING STUFF NETWORK` |

The sign-off card lists them all: *"BSN stands for Breaking Story Network.
Officially. Brock: Brock Stetson Network. Philippa: British Standards
Network. Dusty: Barometric Storm Network. Ticker: Breaking Stuff Network."*
Scripts can also have the anchors bicker about it at heat 1.

Rules (checked): every expansion's initials spell B-S-N (small words like
*of* and *the* are skipped, a hyphenated word counts once); the ticker never
uses the official name; no expansion is ever used twice, across all
episodes, anchors and guests. The joke is that the letters are obvious, so
the expansion never says the obvious one, and stays clean.

Bank of unused ticker expansions (strike them off as they air):
*Barely Sourced News*, *Bureau of Selective Narratives*, *Bold Speculation
Nightly*, *Blame Someone Now*, *Big Shouty Network*, *Biased Since Noon*,
*Bravely Saying Nothing*, *Buffering Signal Now*, *Bluffing Since Nineteen-something*,
*Breaking Sofas Nightly*, *Broadly Similar News*, *Believe Some News*,
*Bring Snacks Now*, *Best Seen Never*, *Bonus Shouting Network*, *Brawling
Studio Nightly*, *Burying Stories Nightly*, *Both Sides, Nearly*,
*Blatantly Spinning News*, *Background Shouting Network*.

## 4. Episodes

### 4.1 Script format

An episode is one JSON file, `apps/client/src/news/episodes/<id>.json`
(`Episode` in `apps/client/src/news/episode.ts`):

| Field | What |
|---|---|
| `id` | `2026-w41-printers`: year, ISO week, slug. Also the brawl's seed, so an episode's fight is the same every time. |
| `week` | Monday it airs (ISO date). The newest is the default episode. |
| `bsn` | This episode's ticker guess at what BSN stands for (§3.4): spells B-S-N, never repeats. |
| `headline` | Two or three words for the video wall: `PRINTERS UNIONISE`. |
| `chyron` | The BREAKING strap: one line, no "BREAKING:". |
| `ticker` | 3–6 joke headlines for the crawl. |
| `guest` | Optional: `name`, `role` (lower third), stand-in `career`, `enters` (line index), `bsn` (their own expansion). |
| `beats` | The desk lines: `who` (`us`, `uk`, `guest`), `text`, `heat`, optional `mood` (`neutral`, `angry`, `surprised`, `hurt`) and `ms` (hold time; default from reading speed). |
| `brawl` | `seconds` (2–6), optional `arena`, `shouts` per seat. |
| `minigame` | The week's minigame id (§5). |
| `realStory` | `text` (2–3 plain sentences: what actually happened) and `source` (a link to a reputable report). |

Reading speed is 1.0 s + 42 ms per character (1.5–6 s per line), so a
50-character line holds about 3 s. Ten lines is a full desk.

### 4.2 Checks

`checkEpisode` enforces the format, and the page lists any problems on its
start card; `apps/client/test/news-episode.test.ts` runs it on every episode
file: at least 4 lines, both anchors speak, heat starts at 0, never drops and
ends at 3, a guest only speaks after walking on, the brawl is 2–6 s, the
minigame exists, there is a ticker and a real story, and phases 1–5 fit in 60 s.

### 4.3 The real story

The jokes are the vehicle; the sign-off card carries the information: what
actually happened, in two or three neutral sentences, with a source link. It
is required. The minigame should also be *about* the story's actual mechanics
where it can (a game about a shipping jam is about routing ships), so playing
it teaches something true.

## 5. Minigames

A minigame is a module in `apps/client/src/news/minigames/` registered in
`MINIGAMES` (`minigames/index.ts`):

```ts
interface Minigame {
  id: string;
  title: string;   // the hand-off card: "THIS WEEK: <title>"
  blurb: string;   // one line: what to do
  mount(el: HTMLElement, ctx: { episode: Episode; done(r: { score?: number; line: string }): void }): () => void;
}
```

It gets the TV frame (a 16:9 element) to draw in, owns everything inside it,
calls `done` once with a result line for the sign-off card, and cleans up when
its returned function runs. Constraints:

- **30 seconds to 3 minutes** of play, one-thumb on a phone, mouse on desktop.
- **No backend.** Client only; local storage for a best score at most (and
  only for per-viewer conveniences).
- **Small.** It's a lazy-loadable chunk (the studio can `import()` it later),
  ideally under ~150 KB with its art.
- It may reuse anything in the client: the sim and renderer for a fight, the
  puppets and faces, the synth audio and music.
- Same tone and content rules (§7).

The placeholder, `test-card` (*Please Stand By*: tap the test card until the
signal comes back), shows the contract.

## 6. The weekly pipeline

1. **Pick the story** (early in the week): big enough that most people have
   heard of it, absurd enough to joke about, passing §7.
2. **Write the script** (episode JSON) and the real story with its source.
3. **Design the minigame**, as small as possible; reuse earlier games'
   mechanics where they fit.
4. **Art:** if it needs any, write a detailed brief for the image agent first
   (`career-crash/PIPELINES.md` §5), ship with stand-ins, import on delivery.
5. **Release:** not before the first real episode (owner, 9 October): the
   feed ads would otherwise advertise the pilot.
6. `pnpm check`, play it, screenshot each phase (`?at=<ms>` starts the open
   part-way in), then release as usual (`WORKFLOW.md`) whenever it's ready:
   there is no fixed day (§11). The feed ads pick up the newest episode
   automatically.

Past episodes stay playable (`?ep=<id>`, and a picker under the screen when
there's more than one).

## 7. Content rules (real news)

Satire about the real world needs firmer rules than satire about plumbers:

1. **Punch up.** Joke about institutions, the powerful, bureaucracy, hype,
   corporate speak, absurd situations. Never about victims, ordinary
   bystanders, or groups of people for who they are.
2. **No tragedies.** Wars, attacks, disasters with deaths, crimes against
   people: skip the story that week, or cover a genuinely absurd side story
   with no victims.
3. **No real faces.** Real public figures appear only by role ("a tech
   billionaire", "the Chancellor"), never by likeness or name in art.
   Companies by role too ("a social network") unless the joke needs the name
   and it's fair comment. (Owner decision, §11.)
4. **Not partisan.** Both anchors are wrong in equal measure; no side of an
   election is the punchline.
5. **True where it counts.** The real story card is accurate, neutral and
   sourced. Jokes may exaggerate; the card may not.
6. **Career Crash slapstick.** No gore, no blood, no weapons beyond office
   supplies and studio furniture.

## 8. Code map

| What | Where |
|---|---|
| Page entry | `career-crash/apps/client/news/index.html` (listed in `vite.config.ts` `input`) |
| Studio (the segment player) | `apps/client/src/news/Studio.tsx`, `news.css`, `main.tsx` |
| Format, timeline, checks | `apps/client/src/news/episode.ts` |
| Cast | `apps/client/src/news/cast.ts` |
| Episodes | `apps/client/src/news/episodes/*.json`, loaded by `episodes.ts` |
| Minigames | `apps/client/src/news/minigames/` (`index.ts` registry, `test-card.ts`) |
| Test | `apps/client/test/news-episode.test.ts` |
| Art briefs | `career-crash/art/news/` |

Episode scripts live in the client (like Crypto Bros' `mock-feed.json`), not
the content bundle: they're presentation, not gameplay numbers, and keeping
them out keeps the golden content hash still. The brawl itself is a normal
`ffa` battle (one team per seat, seeded with the episode id), started just
before the first hit lands, so it changes with the sim like any other fight.

## 9. Phases

1. **Block-out** (done, §10): the open, the format, the checks, a pilot, the
   minigame contract, art briefs.
2. **Studio art**: the desk shot and the anchors as fighters (briefs 01–02),
   then the studio arena (03). Voice the anchors more distinctly.
3. **First real episode**: a real story, a real minigame, the real story
   card, the launch (link from the home page, sitemap, share image).
4. **Weekly**: one episode a week; an archive page; sharing a result
   ("I fixed the news in 14 taps").

## 10. As built (block-out, 9 October 2026)

- `/news/` plays the whole segment: ident (logo slams and cracks), desk with
  typed speech bubbles, babble voices, lower thirds, chyron and ticker, heat
  reactions (faces, leaning, tie, flying papers, shake, vignette), a guest
  walk-on, the brawl on the real sim with everyone's shout in a freeze-frame,
  colour bars, the hand-off card, the minigame, and the sign-off with the real
  story.
- Pilot: `2026-w41-printers` (*Printers Unionise*, fictional, 47.4 s open)
  with Dusty Gale; minigame `test-card`.
- Controls: *Skip to the game*, *Replay the open*, sound toggle, episode
  picker; `?ep=<id>` and `?at=<ms>`.

- Fake Broken News ads in the career feed link to the page (§12).
- The desk shot uses the painted studio (art brief 01 A–B, delivered 9
  October): backdrop and desk layers, with the headline on the big screen,
  BSN on the side screens and *BROKEN NEWS · BSN* on the desk's plaque,
  written by the game (`apps/client/src/news/art/`, sources in
  `career-crash/art/news/`). Both anchors are painted too, six expressions
  each, picked by `deskFace` (talk; smug at heat 1; angry at 2; lunge on the
  swing; listeners calm, then taken aback, then angry). While a line types
  out, the speaker flaps between the expression and its `-b` twin (the other
  mouth) every 0.13 s (brief 01 D: talk, smug and angry for both anchors). Anyone without
  painted art falls back to their career face. Speech bubbles sit in the top
  strip; the clock sits above the strap, bottom right.
- In the brawl the anchors wear their own puppets and four-expression faces
  (`npc.news-brock`, `npc.news-philippa`, art brief 02) and fight with the TV host's and
  journalist's moves.
- The brawl is a close-up (`BattleRenderer.closeUp`, up to 3.4×): framed on the anchors,
  cut straight to the framing, bottom strip kept clear.

**Not yet:** the rest of the studio art (the anchors at the desk are 64 px career faces on CSS suits; brawl in the
Theatre with stand-in careers, starting from the arena's spawns, so the guest
starts out of shot), a real episode and minigame, lazy-loading minigames, per-anchor
voices beyond pitch and type, links from the rest of the site, sitemap and
share image (the page is `noindex` until launch).

## 11. Owner decisions (9 October 2026)

1. **Name:** Broken News is the working title and sounds good; the owner is
   still weighing the alternatives, including a *BS* / *BSN* channel name
   (Name, above).
2. **Real people:** by role only (§7 rule 3). Never named, never drawn.
3. **Cadence:** an episode goes live when it's ready. No schedule for now;
   `week` is just the week it's about, and the newest file is the default.
4. **Where it lives:** its own page on careercrash.org, `/news`. Career
   Crash points to it with **fake ads in the career feed** (§12), not a tab
   or a menu entry. Minigames don't pay career-mode cash.

## 12. The feed ads

The career-mode feed (the LinkedIn parody in the hub) carries a *Promoted*
post from **Broken News** on about 6 fights in 10, slotted in as the fourth
post, next to the other sponsored posts (the company hiring, the Corner
Shop). The text is a fake TV ad for the newest episode (`news_ad` in
`packages/content/data/live.json`, `{headline}` is the episode's headline),
with a link card to `/news/` (`news_ad_link` lines for the card). Code:
`promotedPosts` in `apps/client/src/career/feed.ts`, placed by `timeline` in
`Hub.tsx`. In the single-file build the link goes to careercrash.org.
