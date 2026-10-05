# 07 — Gatecrashers (design v0.1)

Status: **built** (art pending: `art/GATECRASHER_PROMPTS.md`). Now and then,
partway through a fight, up to three people who belong to the venue burst in:
the train driver and two ticket inspectors at the station, a hedge-fund owner
and his lackeys at the hotel lobby. They're nobody's side: they fight
everyone, shout a catchphrase as they arrive, and post about it afterwards.

Owner of: when gatecrashers come, who they are, how strong they are, how the
fight treats them, and the posts and comments they leave. The numbers live in
`economy.json` → `crashers`; the sets live in `packages/content/data/crashers/`.

## 1. Goals

- **A story you didn't plan for.** Most fights are about your squad against
  theirs. A gatecrash turns a few of them into "and then the health
  inspector turned up".
- **The venue comes alive.** Each arena has its own people, so the station
  feels like a station and the hotel like a hotel.
- **Rare enough to be a moment.** About one fight in ten.
- **A threat to both sides, not a coin flip.** Gatecrashers are about your
  power and hit everyone, so they shake a fight up without deciding it.

## 2. When they come

| Rule | Value |
|---|---|
| Chance | **10%** of fights (`chanceBp` 1000). Never in a boss fight or the first fight of a career. |
| Earliest | Not before **18 s** (`earliestTick` 360). Their arrival tick is rolled between 18 s and 43 s. |
| Latest | Not after **55 s** (`latestTick` 1100), well before the shortest fights end (10th percentile: 54 s). |
| Fight still open | Each side needs **60%** of its fighters standing (`minActiveBp` 6000; 2 of 3 in a 3v3). If not, they wait, and if the fight never reopens before their latest tick, they don't come. So they never arrive in a fight that's nearly over. |
| How many | The leader, plus 0–2 henchmen: 1, 2 or 3 of them at weights 2 : 4 : 4. |

Measured over 108 gatecrashed ladder fights (113 tried; in the rest the fight was no longer open): they arrive at a median of **30%**
of the way through, and never later than **72%**.

## 3. Who comes

- **24 sets, two per arena.** Every set belongs to one arena (its **home**)
  and **visits** two others. A gatecrash is a home set **65%** of the time
  (`homeBp`), otherwise a visiting one. So the Trolley Marshals mostly
  turn up in the supermarket, but sometimes at the warehouse or the airport.
- **A set** is a leader with a name, and one kind of henchman with two names.
  Each has a **persona** (`npc.<id>`): a job title, a colour, an icon and
  catchphrases. They fight with an existing career's moves (the train driver
  drives like a Bus Driver, ticket inspectors arrest like Police Officers).
- **Not playable.** Personas are not careers: they never appear in offers,
  recruits, loot or HR notes.

### The 24 sets

| Set | Home | Visits | Leader (fights as) | Henchmen (fight as) | Leader's first line |
|---|---|---|---|---|---|
| The Mystery Shopper | Supermarket | Diner, Hotel Lobby | Agnes Clipboard-Hale, Mystery Shopper (Food Critic) | Trainee Mystery Shopper: Dev Lurke & Pippa Undercover (Journalist) | “Act natural. I'm not here.” |
| The Trolley Marshals | Supermarket | Warehouse, Airport | Big Kev Pushworth, Car Park Trolley Marshal (Builder) | Trolley Lad: Jordan "Wheels" Reilly & Tyler Castor (Delivery Driver) | “Nobody leaves a trolley in MY bay!” |
| The Consultants | Office | Hotel Lobby, Hospital Ward | Tristan Vale, Change Management Consultant (Life Coach) | Junior Associate: Hamish Lovelock & Ottilie Spreadsheet (Accountant) | “We're not here to fire anyone. Today.” |
| IT Support | Office | Airport, Museum | Gary from IT, Head of IT Support (Programmer) | IT Intern: Neil Patchwell & Becca Bluescreen (Electrician) | “Have you tried turning it off and on again?” |
| Health Inspection | Diner | Supermarket, Hospital Ward | Mona Grubb, Health Inspector (Scientist) | Swab Deputy: Lionel Swabb & Tasha Petri (Nurse) | “Nobody move. Is that a HAIR?” |
| The Food Truck Mafia | Diner | Construction Site, Docks | Don Taco Delgado, Food Truck Kingpin (Chef) | Sauce Lad: Sriracha Sam & Mayo Mario (Barista) | “This is taco territory now.” |
| The 07:42 | Train Station | Airport, Docks | Doug Platt, Train Driver (Bus Driver) | Ticket Inspector: Barry Gripps & Joan Punchwell (Police Officer) | “Mind the gap. The gap is me.” |
| Rail Replacement Bus | Train Station | Construction Site, Warehouse | Brenda Diversion, Rail Replacement Coordinator (Taxi Driver) | Hi-Vis Marshal: Clive Cones & Dot Signage (Security Guard) | “Your train is now a bus. Your fight is now MY fight.” |
| Stocktake | Warehouse | Supermarket, Museum | Margaret Tally, Stocktake Auditor (Accountant) | Barcode Scanner Operator: Ron Beepman & Kirsty SKU (Postal Worker) | “Nobody touches anything until I've counted it.” |
| The Union Rep | Warehouse | Construction Site, Docks | Big Sal Strickland, Union Rep (Politician) | Shop Steward: Dennis Picket & Fay Motion (Builder) | “Everybody out! ...After this.” |
| Planning Permission | Construction Site | Office, Theatre | Gordon Pruitt, Planning Officer (Lawyer) | Council Surveyor: Ian Theodolite & Bev Boundary (Engineer) | “This fight does not have planning permission!” |
| The Crane Gang | Construction Site | Docks, Warehouse | Mick 'Hook' O'Hara, Crane Operator (Mechanic) | Tea-Break Labourer: Gaz Mortar & Stevie Breezeblock (Builder) | “Tea break's over. So are you.” |
| The Customs Raid | Docks | Airport, Warehouse | Hilda Stamp, Customs Officer (Police Officer) | Sniffer Dog Handler: Colin Leash & Mo Biscuit (Zookeeper) | “Anything to declare? Besides defeat?” |
| The Fishmongers | Docks | Diner, Supermarket | Barnaby Sole, Trawler Captain (Sailor) | Gutting Crew: Gilly McKipper & Ray Pollock (Marine Biologist) | “Smell that? That's victory. And mackerel.” |
| The Hedge Fund | Hotel Lobby | Office, Airport | Sterling Vance III, Hedge Fund Owner (Politician) | Lackey: Fitzgerald Yesman & Penelope Notetaker (Lawyer) | “I'm buying this fight. Then shorting it.” |
| The Hen Party | Hotel Lobby | Diner, Theatre | Kayleigh Fairweather, Bride-to-Be (DJ) | Bridesmaid: Shaz & Big Lou (Hairdresser) | “It's MY special day and you're IN it!” |
| Visiting Hours | Hospital Ward | Hotel Lobby, Supermarket | Nana Edith Bunch, Professional Visitor (Florist) | Bored Grandson: Tyler, 19 & Kayden, 22 (Ice Cream Vendor) | “I brought grapes. They're for throwing.” |
| The Pharma Rep | Hospital Ward | Office, Hotel Lobby | Chad Pfennig, Pharmaceutical Sales Rep (Influencer) | Free Pen Intern: Josh Lanyard & Freya Samples (Teacher) | “Have you heard about our new side effects?” |
| The School Trip | Museum | Theatre, Train Station | Mrs Pickering, Year 4 Teacher (Teacher) | Parent Helper: Mr Dawson (dad) & Mrs Ahmed (mum) (Gardener) | “Line up in twos. Then ATTACK in twos.” |
| The Night Watch | Museum | Hotel Lobby, Theatre | Reg Lantern, Night Watchman (Security Guard) | Wax Figure (Somehow Alive): Henry VIII (wax) & Napoleon (wax) (Mime) | “I've seen things in this museum. Now you'll see me.” |
| Duty Free | Airport | Supermarket, Hotel Lobby | Valentina Spritz, Duty Free Perfume Counter Queen (Fashion Designer) | Tester Sprayer: Mikey Mist & Clara Cologne (Hairdresser) | “Have you tried 'Defeat' by Valentina?” |
| Lost Luggage | Airport | Train Station, Warehouse | Terry Carousel, Head Baggage Handler (Delivery Driver) | Carousel Crew: Danny Tags & Big Sue Strap (Postal Worker) | “Your bag went to Lisbon. You're going down.” |
| The Critics | Theatre | Museum, Diner | Lady Penelope Scathe, Theatre Critic (Journalist) | Understudy: Rupert Wings & Jess Standby (Magician) | “Dreadful. Unwatchable. I'll stay till the end.” |
| Panto Season | Theatre | Hospital Ward, Hotel Lobby | Dame Trevor Twankey, Pantomime Dame (Clown) | Pantomime Horse (One Half): Barry (front half) & Barry (back half) (Mime) | “Oh yes I am!” |

## 4. How strong

- The **leader** comes at the player's main character's level − 1, the
  **henchmen** at − 2, at the main character's career rank, using 60% of
  their skill points (`leaderLevelOffset`, `henchmanLevelOffset`,
  `spendBp`).
- Each has **one** career; every career slot they don't have becomes 4 stat
  points (the boss rule, 03).
- **AI:** fighters keep their duels (02 §6.7), but a gatecrasher within 3 m
  outranks their duel opponent, so a scrap they barge into turns on them.

Balance check (`pnpm balance`-style run, 113 ladder fights with and without a
forced gatecrash):

| | Without | With |
|---|---|---|
| Median length | 88 s | 93 s |
| Timeouts | 16 | 21 |
| Fighters knocked out by gatecrashers, per fight | – | 0.85 |
| Gatecrashers downed, per fight | – | 0.55 |

## 5. In the sim (01 §4)

- `BattleInput.crashers` (optional): the set, the earliest and latest tick,
  `minActiveBp`, and their snapshots (leader first). Rolled by game-rules
  (`rollCrashers`), deterministic from the battle seed, so replays and
  results are reproducible.
- They spawn at the back of the arena, side by side, as a side of their own
  (team index = number of teams), with a `spawn` event each and one `crash`
  event (a = leader, v = how many, s = set).
- They're **left out of the result**: no team, never MVP, not in
  `result.characters`, and they don't count for elimination. A fight still
  ends when one real side is out.
- Their critters (if their career summons any) are on their side too.

## 6. On screen

- **Entrance:** the fight holds for 3.4 s. The camera frames them under
  "🚨 GATECRASHERS!" with the set's name and the leader's job, and each one
  shouts a catchphrase in turn. Then the commentator reads the set's
  entrance line, and an action replay waiting for its turn waits until the
  entrance is over.
- **In the fight:** a ring in their own colour, their persona's icon by their
  name, and their own puppet once it's painted (until then, their career's).
  The side panel lists them, on hazard-tape stripes, from the moment they
  arrive.
- **Commentary:** `crash` (their entrance), `crash_out` (one of them goes
  down), `crash_ko` (they knock someone out).

## 7. Posts and comments

- **The leader posts** about the fight from the set's own lines (`posts`):
  "Visited the supermarket today, entirely anonymously. Staff were fighting.
  Customer service: one star. Fighting: four."
- **You usually post too** (70%), `feed_crashed`: "Not how I expected my day
  to go: halfway through the fight, Doug Platt the Train Driver turned up."
- **Comments:** the henchmen pile in under their leader's post with the set's
  `comments` ("Rex ate the evidence"); you answer back (`feed_c_crash_me`);
  colleagues and strangers react (`feed_c_crash`, `feed_c_crash_about`).
  Posts about a gatecrash get mostly 😂 reactions.

## 8. Content rules (checked by the content build)

- Every arena is home to at least two sets.
- Every set's arenas, careers and personalities exist; careers are not bosses
  or retired; a set doesn't visit its own home.
- Every set (`crasher.*`) and persona (`npc.*`) has a name in the locale.
- No persona appears in two sets.

## 9. Art

`art/GATECRASHER_PROMPTS.md`: a body sheet and four heads for each leader and
each henchman, with an A and a B look for henchmen (the second henchman uses B
once it exists). Files named `npc-<persona>` import as persona art; the game
uses it as soon as it's in, before falling back to the career's.

## 10. Sandbox

The Sandbox has a **Gatecrashers** picker: now and then (the usual chance),
never, or a particular set every time.
