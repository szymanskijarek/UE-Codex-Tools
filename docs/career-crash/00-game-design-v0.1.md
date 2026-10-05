# Career Crash (Working Title) — Initial Game Design Document (v0.1)

> Source vision document. Follow-up specs in this folder refine it; where they
> conflict with this file, the more specific document wins and this file is
> updated to match.

## Vision

Career Crash is an asynchronous multiplayer auto-brawler where players build
teams of ordinary people with extraordinary career paths and send them into
ridiculous battles while offline. The browser is the primary platform, with
saved permanent progression.

The game combines:

- **BattleCry** — asynchronous progression and PvP.
- **MDickie** — emergent simulation and environmental chaos.
- **Football Manager** — long-term character development.
- **Modern web games** — short, daily play sessions.

There is no fantasy, magic, or sci-fi. Every character, object, weapon, and
arena is grounded in the modern world — but exaggerated to create absurd comedy.

The game is designed from day one to be largely built and expanded by AI coding
agents and AI art generation.

## Design Pillars

### 1. Emergent Comedy

Nothing is funny because it is scripted. Everything is funny because systems collide.

- A plumber accidentally floods the supermarket.
- A janitor slips.
- A chef catches fire.
- A firefighter extinguishes everyone.
- The referee gets knocked unconscious by a shopping trolley.

No scripted sequence. Only simulation.

### 2. Asynchronous Multiplayer

No real-time networking. Players build teams, upload defenders, attack others,
collect rewards later, and watch replays. The game should be playable in
5-minute sessions.

### 3. Career Evolution

Characters evolve through careers instead of levels. Nobody becomes a wizard.

- Barista → Chef → Food Critic → TV Host → Politician
- Mechanic → Engineer → Astronaut → Conspiracy Podcaster

Every career permanently shapes the character.

### 4. Sandbox Arenas

Every arena is a playground. Objects obey simple rules. Everything can interact
with everything else.

### 5. AI-first Architecture

Nothing is hardcoded. Everything comes from data. The engine should not know
what a Chef is. It only understands: **Tags, Stats, Traits, Abilities,
Equipment, Interactions.**

## Gameplay Loop

1. Player logs in.
2. Collects offline rewards.
3. Watches defence replay.
4. Levels characters.
5. Chooses new career milestones.
6. Equips gear.
7. Challenges several players.
8. Uploads updated defence.
9. Leaves.

## Match Structure

- Team size: 3v3 initially, 5v5 unlocked later.
- Special events: Free-for-all, King of the Hill, Last Person Standing, Boss Events.
- Battle duration: 60–120 seconds.
- Entirely deterministic. Replay generated from seed.

## Character System

Every character consists of: name, appearance, current careers, traits,
personality, equipment, statistics, career history, battle history,
relationships. Everything is persistent. Characters become memorable.

## Career System

Every character begins with one profession, e.g. Teacher, Electrician, Chef,
Taxi Driver, Paramedic, Programmer, Influencer, Dentist, Mechanic, Farmer,
Librarian, Accountant, Firefighter, Security Guard, Lawyer, Journalist, DJ,
Builder, Police Officer, Delivery Driver. Eventually 300–500 careers.

### Career Milestones

At every milestone the player selects another profession. Maximum five
professions. Each profession contributes stat modifiers, a passive ability, an
active ability, interaction rules, and tags. The order may matter for unlocking
some advanced combinations.

### Hidden Masteries

Specific combinations unlock secret identities:

| Careers | Mastery |
|---|---|
| Chef + Firefighter + Paramedic | Emergency Response Expert |
| Lawyer + Journalist + Politician | Spin Doctor |
| Electrician + Mechanic + Engineer | Inventor |
| Teacher + Psychologist + Life Coach | Motivational Speaker |

Masteries grant a unique passive, visual badge, victory animation, portrait
frame, and rare abilities. Community discovery should be a major part of the game.

## Personality

Separate from profession: Coward, Aggressive, Greedy, Helpful, Lazy, Chaotic,
Competitive, Paranoid, Clumsy, Confident. Personalities affect AI decisions.

## Arena Philosophy

Maps should feel alive: Supermarket, Airport, Construction Site, Office,
Shopping Mall, Hospital, Theme Park, Train Station, Museum, School, Zoo,
Harbour, Factory, Warehouse. Every arena contains interactive props,
environmental hazards, moving objects, and destructible scenery.

## Object System

Every object is component-based. Properties include weight, health, material,
can carry, can throw, can break, can ride, can push, can burn, can conduct
electricity, can explode, can leak. This enables hundreds of interactions with
very little code.

## Equipment

Everything comes from everyday life: clipboard, hammer, laptop, coffee, traffic
cone, briefcase, leaf blower, rubber chicken, megaphone, umbrella, mop, fire
extinguisher, shopping basket, skateboard. Equipment changes both combat and
interactions.

## Combat

No direct player control. Characters automatically move, attack, use abilities,
use objects, react to hazards, support allies, retreat, and prioritize targets.
The entire combat simulation runs server-side; the client replays results.

## Statistics

Simple core stats: Health, Energy, Movement Speed, Strength, Throwing Skill,
Intelligence, Awareness, Confidence, Luck, Charisma, Recovery, Interaction
Speed. Avoid dozens of hidden modifiers.

## Traits

Traits emerge through gameplay and are mostly behavioural: Never Lost A Duel,
Coffee Addict, Pyromaniac, Always Late, Pigeon Friend, Fear Of Bees,
Favourite Weapon: Chair, Forklift Certified.

## Procedural Commentary

Every battle produces commentary:

- "The Accountant finally defeated his lifelong rival."
- "Nobody expected five librarians to dominate the tournament."
- "The Janitor cleaned up everyone."
- "The referee has lost control."

Players should read battle reports for entertainment.

## Progression

Unlocks include new professions, arenas, equipment, cosmetics, portraits,
titles, animations, masteries. **No power sold through monetization.**

## Art Direction

Stylized 2D, large heads, expressive animation, bright readable colours, thick
outlines, simple modular construction. Characters are assembled from body,
head, hair, face, hat, upper clothing, lower clothing, shoes, accessory, and
held item — allowing AI generation of hundreds of professions efficiently.

## Technical Architecture

- **Frontend:** HTML5, TypeScript, Phaser (or PixiJS), Vite.
- **Backend:** Cloudflare Workers, D1, R2, Durable Objects (only where
  necessary), Turnstile for bot protection.
- **Data:** JSON definitions for all gameplay content; deterministic simulation
  using seeded RNG; replay event logs instead of video.

## AI-First Development Principles

The coding agent is never asked to build the whole game in one step. Every
feature is a self-contained module with clear interfaces:

1. Simulation Engine
2. AI Decision System
3. Character System
4. Career & Mastery Engine
5. Environment & Interaction System
6. Combat Replay System
7. Backend Services
8. UI Framework
9. Asset Generation Pipeline
10. Automated Balance & Testing Tools

Art generation is template-driven: modular body parts, reusable props, icon
sets, and arena tiles generated to a consistent style guide rather than as
isolated images.

## Success Criteria

- A new player understands the core loop within five minutes.
- Battles generate memorable stories without scripted events.
- Team composition and career combinations inspire experimentation.
- Players return daily to see what happened while they were away.
- New professions, arenas, and masteries can be added largely by editing data.
- An AI coding agent can implement, test, and expand the project incrementally
  with minimal human intervention.
