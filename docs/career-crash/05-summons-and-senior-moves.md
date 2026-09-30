# 05 — Summons and Senior Moves (design v0.1)

Status: design, not built. Covers one new move for every career ("Senior
Move"), a summoning mechanic used by about a third of them, and fears that let
summons cause panic. The last section lists the art and text this needs.

## 1. Goals and limits

- **Every career gets at least one new move.** The 60 careers with two moves
  get one; the 6 tier-2 careers with only one move (Engineer, Politician,
  Psychologist, Life Coach, TV Host, Food Critic) get two. **72 new abilities.**
  Bosses are unchanged.
- **27 of them summon** (19 animal, 9 human kinds; the zookeeper rolls one of
  two animals). Summons are a *distraction*, never a damage source: flimsy,
  short-lived, they pull attention, trip people, steal things and scare the
  fighters who fear them.
- The other 45 use effects the sim already has (damage, statuses, knockback,
  knockdown, spawnProp, morale, energy, taunt, dash, pull, toss, dropHeld),
  plus one new status, `jinxed`.
- A summon never decides a fight on its own. Target: a summon move's win-rate
  impact within ±3% of an average non-summon move (balance tool, §7).

## 2. Where the new move sits

- **Senior Move:** a new skill-tree node at **rank 4**, cost 2, next to the
  capstone (`extra-2`). Senior Moves are the reward for mastering a career.
- **Tier-2 careers** also fill their empty rank-2 slot (`extra-0`) with the
  second new move, so they end up with three moves like everyone else.
- **Perks:** Senior Moves join the pool of abilities perks can grant, so a
  welder can still end up pulling rabbits out of a hat.
- **Opponents:** AI fighters use them like any move; Brutal opponents always
  have them.

## 3. Summons: the rules

A summon ("critter") is a lightweight fighter on the summoner's team.

| Rule | Value |
|---|---|
| Health | 15–60 (a fighter has ~350+). One good hit or thrown prop ends it. |
| On defeat | Never downed or revived. Animals **bolt off-screen** in a dust puff; humans **"call in sick"** (ragdoll and fade). |
| Lifetime | 8–20 s, and they leave the moment their summoner is KO'd. |
| Caps | 4 alive per summoner (a group like "3 rabbits" counts 3), 6 per team. Recasting while capped refreshes lifetimes instead of adding more. |
| Doesn't count for | KOs, MVP, XP, the win condition, perks, the post-fight board. Commentary and the feed still mention them. |
| Can't | Use abilities, use items, pick up props. |
| Can be | Hit, knocked back, tripped. Human summons can be grabbed and thrown (it's an office game; the intern gets thrown). Animals can't be picked up. |
| Referee | Ignores them. No fouls either way. |

### 3.1 Behaviours

Every summon uses one of five behaviours; this keeps the sim work small.

| Behaviour | What it does | Used by |
|---|---|---|
| **Scatter** | Zig-zags through the enemy side at speed. Touching a fighter can trip them (knockdown chance). | rabbits, lab rats, bugs, chickens-style swarms, dik-dik, school kids |
| **Pester** | Latches onto the nearest enemy and follows them, applying a small effect every second (nip, pinch, flash, steal). | poodle, goose, crabs, seagulls, parrot, kitchen rat, paparazzi |
| **Decoy** | Wanders slowly near the summoner; enemies within 3 m prefer to hit it (short taunt aura). Toughest summons (40–60 HP). | capybara, therapy dog, hedgehog, balloon dog, tour group, intern |
| **Aura** | Drifts around and applies a status to enemies within range every second. | black cats, butterflies, pigeons, scarabs, drone pigeons, studio audience |
| **Entourage** | Follows the summoner, blocks paths (solid), and buffs the summoner or nearby allies. | fans, campaign volunteers, bellhop, paralegal |

### 3.2 Fears and panic

- Fighters can carry **fear tags**: `fear:cats`, `fear:dogs`, `fear:birds`,
  `fear:critters` (rats, rabbits, crabs, hedgehogs), `fear:bugs`,
  `fear:crowds`, `fear:kids`.
- Each summon **scares** one group. A fighter with the matching fear within
  2.5 m of it loses about 3 morale a second. Below 10 morale they panic (the
  existing system): they drop what they hold and run about. They calm down at
  25.
- **Where fears come from:**
  - **Careers,** one each, for comedy: Postal Worker fears dogs, Food Critic
    fears critters, Programmer fears crowds, Accountant fears kids, Mime fears
    birds, Influencer fears bugs, Lawyer fears cats.
  - **The Coward personality** fears everything, at half the rate.
  - **New earnable traits,** like the existing Fear of Fire: *Ailurophobe*
    (fear of cats), *Pigeon PTSD* (birds) and *Stage Fright* (crowds), each
    earned after being pestered or panicked 8 times by that group.
- **Animal friends:** Zookeeper, Veterinarian, Dog Groomer and Farmer carry
  `animal-friend`. Animals are never scary to them, and summoned animals
  ignore them.

### 3.3 AI

- **Enemies:** critters are low-priority targets unless they're adjacent,
  pestering them, or a decoy's taunt is on. That way a summon wastes a few of
  the enemy's seconds, not the whole fight.
- **Summoners:** they don't cast a summon when already at the cap, or when
  no enemy is within 8 m.

## 4. The summons (starting numbers)

HP is hit points; speed is relative to an average fighter (100%); life is in seconds.

| Summon | From (move) | Kind | Count | HP | Speed | Life | Behaviour | Effect | Scares |
|---|---|---|---|---|---|---|---|---|---|
| Rabbit | Magician — *Pick a Card, Any Rabbit* | animal | 3 | 15 | 140% | 10 | Scatter | trip 30% | critters |
| Black cat | Fortune Teller — *Crossed Path* | animal | 2 | 20 | 120% | 12 | Aura 1.5 m | `jinxed` 6 s (−4 luck, +trip chance) | cats |
| Capybara (70%) | Zookeeper — *Enrichment Programme* | animal | 1 | 60 | 60% | 16 | Decoy | allies within 2 m +2 morale/s; whoever hits it is `embarrassed` | — |
| Dik-dik (30%) | Zookeeper — same move | animal | 1 | 20 | 170% | 12 | Scatter | trip 45% | critters |
| Poodle | Dog Groomer — *Release the Poodle* | animal | 1 | 30 | 130% | 14 | Pester | 2 dmg + `slowed` 1 s | dogs |
| Goose | Farmer — *Goose on the Loose* | animal | 1 | 35 | 120% | 14 | Pester | honk: `stunned` 0.5 s every 3 s | birds |
| Crab | Marine Biologist — *Crab Pot* | animal | 2 | 20 | 70% | 14 | Pester | pinch: 2 dmg + `slowed` | critters |
| Seagull | Ice Cream Vendor — *Seagull Magnet* | animal | 2 | 15 | 150% | 12 | Pester | 25% steal (`dropHeld`) | birds |
| Pigeon | Window Cleaner — *Pigeons on the Ledge* | animal | 3 | 15 | 130% | 10 | Aura 1 m | `distracted` | birds |
| Lab rat | Scientist — *Lab Rats* | animal | 3 | 15 | 150% | 10 | Scatter | trip 25% | critters |
| Therapy dog | Veterinarian — *Therapy Dog* | animal | 1 | 50 | 90% | 16 | Decoy | allies within 2 m `regen` | dogs |
| Bug (beetle) | Programmer — *It's Not a Bug* | animal | 3 | 15 | 110% | 10 | Scatter | `distracted` on touch | bugs |
| Kitchen rat | Chef — *Le Petit Chef* | animal | 1 | 20 | 140% | 12 | Pester | steals a consumable before it fires | critters |
| Scarab | Archaeologist — *Scarab Swarm* | animal | 4 | 10 | 110% | 8 | Aura 1 m | `slowed` + 1 dmg/s | bugs |
| Hedgehog | Gardener — *Prickly Customer* | animal | 1 | 45 | 50% | 16 | Decoy | melee attackers take 5 dmg | critters |
| Balloon dog | Clown — *Balloon Animal* | animal | 1 | 25 | 80% | 14 | Decoy | pops when hit: `stunned` 1 s within 1.5 m | — |
| Butterfly | Florist — *Butterfly Effect* | animal | 4 | 10 | 100% | 10 | Aura 1 m | `distracted`; allies nearby `inspired` | bugs |
| Parrot | Sailor — *Pieces of Eight* | animal | 1 | 20 | 130% | 14 | Pester | repeats insults: `embarrassed` | birds |
| Drone pigeon | Conspiracy Podcaster — *Birds Aren't Real* | animal | 2 | 20 | 130% | 12 | Aura 2 m | enemies `distracted`, podcaster `inspired` | birds |
| School kid | Teacher — *School Trip* | human | 4 | 15 | 120% | 10 | Scatter | trip 20% | kids |
| Fan | Influencer — *Fan Meet-Up* | human | 2 | 25 | 100% | 14 | Entourage | influencer `inspired`; fans block | crowds |
| Paparazzo | Photographer — *Paparazzi* | human | 2 | 25 | 120% | 12 | Pester | flash: `distracted` + `embarrassed` | crowds |
| Campaign volunteer | Politician — *Canvassing* | human | 2 | 25 | 100% | 14 | Entourage | leaflets: enemies within 2 m `distracted` | crowds |
| Tour group | Museum Curator — *Guided Tour* | human | 3 | 30 | 60% | 16 | Decoy | blocks paths (solid) | crowds |
| Audience member | TV Host — *Studio Audience* | human | 3 | 20 | 80% | 14 | Aura 3 m | allies `inspired`, enemies −1 morale/s | crowds |
| Intern | Accountant — *Delegate to the Intern* | human | 1 | 40 | 100% | 16 | Decoy | throwable; enemies who throw it are `embarrassed` | — |
| Bellhop | Hotel Concierge — *Bellhop!* | human | 1 | 35 | 110% | 14 | Entourage | pushes a luggage trolley that bowls people over | — |
| Paralegal | Lawyer — *Discovery* | human | 1 | 30 | 90% | 14 | Entourage | drops paper stacks (spawns `paper-stack`, slippery) | — |

## 5. Every career's new move(s)

✦ = summon (section 4). Everything else is built from existing effects;
"new status" marks the only addition.

| Career | New move | What it does |
|---|---|---|
| Accountant | ✦ Delegate to the Intern | Intern decoy |
| Archaeologist | ✦ Scarab Swarm | Scarab aura |
| Astronaut | Re-entry | Leap and slam: knockdown in 2 m, damage |
| Baker | Rolling Pin Spin | Spin: knockback everyone within 1.5 m |
| Barista | Oat Milk Spill | Slippery puddle at target (`soda-spill` style) |
| Beekeeper | Honey Trap | Sticky patch: `sticky` + `slowed` |
| Builder | Scaffold Collapse | Planks fall on an area: knockdown, damage |
| Bus Driver | Emergency Brake | Dash forward, knocking down anyone in the way |
| Carpenter | Sawhorse Barricade | Spawns a barrier prop between you and the nearest enemy |
| Chef | ✦ Le Petit Chef | Kitchen rat pester |
| Chimney Sweep | Up the Flue | Pull a target in and soot them: `distracted` |
| Clown | ✦ Balloon Animal | Balloon dog decoy |
| Conspiracy Podcaster | ✦ Birds Aren't Real | Drone pigeons |
| Delivery Driver | Van Door Slam | Cone knockback, 1 m |
| Dentist | Open Wide | Grab and `stunned` 1.5 s, then `embarrassed` |
| DJ | Fog Machine | Spawns `foam-cloud` fog: enemies inside `distracted` |
| Dog Groomer | ✦ Release the Poodle | Poodle pester |
| Electrician | Tripped Breaker | Every `electrified` fighter is `stunned` 1 s |
| Engineer | Load-Bearing Wall | Spawns a barrier prop |
| Engineer | Stress Test | Target `slowed`; next hit on them is a crit |
| Farmer | ✦ Goose on the Loose | Goose pester |
| Fashion Designer | Runway Walk | Dash plus taunt; enemies passed are `embarrassed` |
| Firefighter | Ladder Swing | Long-reach sweep: knockdown |
| Flight Attendant | Oxygen Masks | Team: small heal, clears `stunned` |
| Florist | ✦ Butterfly Effect | Butterfly aura |
| Food Critic | One Star | Target `embarrassed` and −20 morale |
| Food Critic | Send It Back | Throws the target's held item back at them (`dropHeld` + damage) |
| Fortune Teller | ✦ Crossed Path | Black cats (new status `jinxed`) |
| Gardener | ✦ Prickly Customer | Hedgehog decoy |
| Hairdresser | Blow-Dry Blast | Cone knockback plus `distracted` |
| Hotel Concierge | ✦ Bellhop! | Bellhop with a luggage trolley |
| Ice Cream Vendor | ✦ Seagull Magnet | Seagull pester (steals items) |
| Influencer | ✦ Fan Meet-Up | Fans entourage |
| Janitor | Out of Order | Spawns an out-of-order sign (`wet-floor-sign` style) that blocks a lane |
| Journalist | Hot Take | All enemies within 4 m `embarrassed`, −10 morale |
| Lawyer | ✦ Discovery | Paralegal entourage |
| Librarian | Late Fees | Target loses energy over 6 s |
| Life Coach | Vision Board | Team `inspired` |
| Life Coach | Cold Shower | Self `wet`; clears statuses, +20 morale |
| Lifeguard | Whistle Blast | Enemies within 3 m `stunned` 0.5 s |
| Magician | ✦ Pick a Card, Any Rabbit | Rabbits |
| Marine Biologist | ✦ Crab Pot | Crabs pester |
| Mechanic | Jack It Up | Toss the nearest heavy prop at a target |
| Mime | Trapped in a Box | Target `slowed` heavily for 2 s, `embarrassed` |
| Museum Curator | ✦ Guided Tour | Tour group decoy |
| Nurse | Bed Rest | Target `stunned` 3 s; a hit wakes them |
| Painter | Drop Cloth | Throw a cloth: `distracted` + `slowed` |
| Paramedic | Stretcher Run | Dash to a downed ally; they stand up faster |
| Personal Trainer | Burpees! | Self `pumped`; enemies within 2 m lose energy |
| Photographer | ✦ Paparazzi | Paparazzi pester |
| Plumber | U-Bend Launch | Toss a target, `wet` |
| Police Officer | Kettle | Enemies within 2.5 m `slowed`, can't dash |
| Politician | ✦ Canvassing | Volunteers entourage |
| Politician | U-Turn | Pull a target in, then knock them down |
| Postal Worker | Signed For | Target `stunned` 1.5 s ("please sign here") |
| Programmer | ✦ It's Not a Bug | Bugs scatter |
| Psychologist | Inkblot Test | Target `distracted` 3 s, −15 morale |
| Psychologist | Group Therapy | Allies within 3 m +25 morale, small heal |
| Sailor | ✦ Pieces of Eight | Parrot pester |
| Scientist | ✦ Lab Rats | Lab rats scatter |
| Security Guard | Pat Down | Grab: `dropHeld`, `stunned` 1 s |
| Tailor | Measure You Up | Tape pull plus `slowed` |
| Tattoo Artist | Flash Sheet | Self `armoured`; enemies within 2 m −10 morale |
| Taxi Driver | Meter's Running | Enemies within 3 m `slowed` and lose energy |
| Teacher | ✦ School Trip | School kids scatter |
| Train Conductor | Mind the Gap | Knockdown along a line 4 m long |
| TV Host | ✦ Studio Audience | Audience aura |
| TV Host | And We're Back! | Dash plus taunt |
| Veterinarian | ✦ Therapy Dog | Therapy dog decoy |
| Welder | Sparks Fly | Cone of `sparks` |
| Window Cleaner | ✦ Pigeons on the Ledge | Pigeon aura |
| Zookeeper | ✦ Enrichment Programme | Capybara (70%) or dik-dik (30%) |

## 6. Engine work (for the build)

Per AGENTS.md rule 5 (schema, implementation, test, content example):

1. **Content:**
   - A new collection `data/summons/`: kind, HP, speed, radius, lifetime,
     behaviour, effects, aura, `scares`, art id.
   - A new effect `summon` (`summon`, `count`, `at: self | target`).
   - New status `jinxed`; tags `fear:*`, `animal-friend`; three new traits.
2. **Sim:**
   - Critter entities (a `char` with `summonOf` and `expires`).
   - The five behaviours, the caps, and the defeat exit.
   - Fear morale drain.
   - Critters excluded from the win condition, results and XP.
   - `SIM_VERSION` bump and golden update.
3. **Rules:** `extra-2` Senior Move node; tier-2 `extra-0`; perks may grant
   Senior Moves.
4. **Client:**
   - Critter renderer: a 2-frame loop plus hop or waddle, flipping with
     direction, and a dust-puff exit.
   - Human summons use the drawn paper-doll body with an outfit tint and a
     held item.
   - Tags in the fight UI ("🐇 ×3").
5. **Commentary:** summon, bolt-off and panic-by-fear lines; feed posts ("My
   intern carried the team today").
6. **Balance:** a `--summons` report comparing each summon move's win rate
   with the career's other moves; property tests for the caps and lifetimes,
   and a check that critters never appear in results.

## 7. Content requirements

### 7.1 Art (from you)

**Animal sprites: 19 animals × 2 poses = 38 images**, delivered like the item
sheets:
- **Sheets:** transparent PNG, 2 rows × 4 cells, about 256 px per cell; 5
  sheets, the last one partly empty.
- **Style:** the house style (thick navy outline, flat fills), side view
  facing right, feet at the bottom of the cell.
- **Pose A:** standing or idle. **Pose B:** running, leaping, flapping or
  scuttling (the "moving" frame).
- **Size:** keep true relative size within the cell. The butterfly, beetle,
  scarab and crab are small; the capybara, goose and dogs fill most of it.

| # | Animal | Notes |
|---|---|---|
| 1 | Rabbit | white, magician-show rabbit |
| 2 | Black cat | arched back in pose A |
| 3 | Capybara | calm, unbothered expression |
| 4 | Dik-dik | tiny antelope, huge eyes |
| 5 | Poodle | groomed pom-poms, pink bow |
| 6 | Goose | angry, neck out in pose B |
| 7 | Crab | red, claws up |
| 8 | Seagull | pose B mid-swoop |
| 9 | Pigeon | grey city pigeon |
| 10 | Lab rat | white, pink tail, maybe a tiny ear tag |
| 11 | Therapy dog | golden retriever in a "THERAPY" vest |
| 12 | Beetle ("bug") | green-black, cartoon |
| 13 | Kitchen rat | brown rat in a tiny chef's hat |
| 14 | Scarab | gold-blue Egyptian beetle |
| 15 | Hedgehog | spikes up |
| 16 | Balloon dog | twisted-balloon poodle, shiny red |
| 17 | Butterfly | bright; pose B wings closed |
| 18 | Parrot | red/green pirate parrot |
| 19 | Drone pigeon | pigeon with a camera lens eye and a little antenna |

Plus **1 dust-puff cloud** (the exit): a single image, which can go in a free
cell of the last sheet.

**Human summons: no new art needed to ship.**
- They use the drawn paper-doll body with an outfit colour and an existing
  held item: school kid (backpack), fan (selfie stick), paparazzo (camera),
  volunteer (placard), tour guide (umbrella), audience member (microphone or
  foam finger), intern (clipboard), bellhop (luggage trolley), paralegal
  (briefcase).
- **Optional later:** body sheets in the career format (posed figure plus
  parts) for the 9 human kinds, if you want them to look as good as the
  careers.
- **Optional small props:** one item sheet with a foam finger, a campaign
  rosette, a paper-stack pile, a school backpack and a tour flag (5 cells).

**Size impact:** about 40 small images, around 150 KB in the single-file
build (well within budget). The website loads them on demand.

### 7.2 Text (I write it)

- Names and descriptions for 72 abilities and 28 summons.
- Commentary:
  - 3 spawn lines per summon (84).
  - 2 exit lines per animal and human kind (56).
  - 12 generic lines for panicking from fear, plus 3 per fear group (21).
- Feed posts: 12 summon brags (as the summoner), 12 complaints (as the
  victim), and comments.
- Names and descriptions for the three new traits and `jinxed`.

### 7.3 Nothing needed

- **Sound:** effects are synthesised (squeak, honk, meow, buzz, crowd murmur);
  no audio files.
- **Ability icons:** text and emoji, as today.
