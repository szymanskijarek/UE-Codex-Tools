# Career Crash — Design Documentation

Pre-production blueprint for **Career Crash**, an asynchronous browser
auto-brawler about ordinary people with extraordinary careers.

No game code exists yet. These documents are written so that an AI coding agent
can build the game incrementally without inventing architecture as it goes.

| # | Document | Answers |
|---|---|---|
| 00 | [Game Design v0.1](00-game-design-v0.1.md) | What is the game and why is it fun? |
| 01 | [Technical Specification](01-technical-specification.md) | How is it built? Repo layout, determinism, data schemas, backend, API. |
| 02 | [Combat Systems](02-combat-systems.md) | How does a battle actually run, tick by tick? |
| 03 | [Economy & Progression](03-economy-design.md) | What do players earn, spend, and unlock, and how fast? |
| 04 | [AI-Agent Implementation Roadmap](04-ai-agent-roadmap.md) | In what order is it built, and how is each step verified? |
| 05 | [Summons & Senior Moves](05-summons-and-senior-moves.md) | A new move for every career, summoned critters, fears and panic, and the art they need. |
| 06 | [Personnel Files & Garden Leave](06-personnel-files-and-garden-leave.md) | Bigger staff, the Garden Leave bench, and each profession's hidden HR notes (buffs and debuffs by arena, colleague, opponent, perk or snack). |
| 07 | [Gatecrashers](07-gatecrashers.md) | The rare mid-fight interruption by people who belong to the venue: 24 sets, when they come, how strong they are, and the posts they leave. |
| 08 | [Crypto Bros](08-cryptobro.md) | careercrash.org/cryptobro: an endless brawl between the top 10 cryptocurrencies as crypto bros, rebuilt every hour from the market; candles, liquidations, the hourly data feed, and the pipeline the Countries version reuses. |
| 09 | [Diplomatic Incident](09-diplomatic-incident.md) | careercrash.org/incident: an endless brawl between 40 countries in national dress, 10 on the floor and the rest in the lobby, powered by viewers' likes (one per country per viewer per hour); derbies, country moves, the vote service, anti-abuse, sharing features, the implementation plan and what's built (phase 1). |
| 10 | [Broken News](10-broken-news.md) | careercrash.org/news: a weekly news-satire minigame, each opened by the same studio segment (two anchors, one American, one British, whose desk argument spirals into a brawl); the episode script format and its checks, the minigame contract, the weekly pipeline and the content rules for real news. Block-out. |
| 11 | [Broken News: the cast](11-broken-news-cast.md) | Who the people of BSN are: each one's flaw and why we love them, voices and sample lines, the relationship map, which character leads which story, and the art and mechanics the new cast needs. |

## Precedence

When documents disagree: **01/02/03 > 00** (specific beats general), and the
roadmap (04) never redefines behaviour — it only sequences work. Any change to
a rule must update the owning document in the same commit.

## Key decisions made in these documents

These resolve open questions left by v0.1. Each is justified in the linked doc.

1. **Renderer:** PixiJS v8 for the battle view, plain DOM (Preact) for menus —
   not Phaser. The client is a replay viewer plus menus; it does not need a
   game framework's input/physics/scene stack. ([01 §3](01-technical-specification.md#3-client))
2. **Determinism:** integer fixed-point math only inside the simulation, a
   single seeded PRNG (sfc32), 20 ticks/second. ([01 §4](01-technical-specification.md#4-determinism-contract))
3. **Replays are re-simulated, not streamed.** A battle is stored as its inputs
   (seed + frozen team snapshots + arena + content hash). The client re-runs
   the same simulation package. The event log is derived, never stored as the
   source of truth. ([01 §4.4](01-technical-specification.md#44-replays))
4. **Space:** 2D plane (x, y) with a small integer height (z) for throws,
   knockdowns and jumping onto props; rendered in a 3/4 "stage" view.
   ([02 §2](02-combat-systems.md#2-space-and-time))
5. **AI:** utility scoring with personality weight vectors, not behaviour
   trees — content can add actions without new code. ([02 §6](02-combat-systems.md#6-ai-decision-system))
6. **Career slots unlock at character levels 1 / 5 / 12 / 22 / 35.**
   ([03 §3](03-economy-design.md#3-character-progression))
7. **Monetization is cosmetic-only**, enforced structurally: the premium
   currency has no code path into any stat-bearing entity. ([03 §6](03-economy-design.md#6-monetization))
