# Fine Print: design notes

## Pillars

1. **Humour first.** The wardens are sparky, awkward and a bit tragic, never
   villains. Every system should create comedy: barks on every action,
   excuses from drivers, radio chatter from Dennis in Control, and
   end-of-shift reviews and awards ("Loneliest Palm"). Jokes are data in
   `shared/content.js`, so writers can add lines without touching code.
2. **The quota is the loop.** Everything feeds a single pressure: *hit your
   number before the shift ends*. The quota rises every day.
3. **A big cast with distinct verbs.** Each of the 14 wardens has one
   ability that changes how they hunt for points. Some are self-buffs
   (Brenda, Agatha, Barry), some change the town itself (Declan, Maureen,
   Tariq), some control drivers (Kevin, Gordon), and some act on other
   wardens (Nigel, Derek, Colin, Lionel, Sandra).
4. **Co-op and rivalry at once.** Wardens share a team quota but compete on
   the leaderboard. High-fives reward cooperation, sabotage abilities reward
   betrayal, and both are funny.

## Core loop

```
patrol → inspect (proximity reveals legality) → stand still & write (hold E)
   ↑                                                     │
   └──── use ability / high-five / dodge drivers ←───────┘
shift ends → performance review + awards → next day, quota +3
```

Tension sources:
- **Reading the street.** Tells only show within ~140px, so you must patrol.
  Meters expire mid-shift, so legal cars turn illegal over time.
- **Commitment.** Writing takes about 1.2s and you must stand still. A returning
  driver escapes if they reach the car first.
- **Risk.** A wrong ticket costs a point plus public shame on the radio.
- **Other wardens.** They race you to cars, lecture you, blind you and steal
  your points.

## Tuning (in `TUNING`, `shared/sim.js`)

- A 3-minute shift and a base quota of 18 (+3/day). Bots are deliberately
  slower (62% speed, 1.7× write time, pause after each ticket) and land
  around quota, so a human has to hustle to beat them.
- Occupancy ~55% of ~126 bays, with ~45% of arrivals intending to park
  illegally.

## Networking

The server is authoritative (`server/server.js`). Clients send key state and
one-shot actions, and the server simulates at 30 Hz and broadcasts full
snapshots at 15 Hz (~18 KB JSON). This is fine for 8 players on a LAN or a
small VPS. If it grows, send deltas and/or binary.

Known trade-off: snapshots include each car's offence so clients can draw
the tells. A curious player could read them from devtools. For a party game
this is acceptable.

## Roadmap ideas

- **More towns:** seaside promenade (seagulls steal tickets), hospital car
  park (moral dilemmas), a festival.
- **More mid-shift events** (five ship today, see `EVENTS` in content.js and
  `startEvent`/`updateEvent` in sim.js): a funeral procession (ticket it and
  lose points, obviously), a film crew closing a street, a seagull that
  steals your last ticket, the Mayor's Jaguar on a bus stop.
- **Career mode:** unlock wardens, vest cosmetics, "Warden of the Month"
  wall in the depot, persistent grudges with named repeat-offender drivers.
- **More interactions:** handing off tickets, "tag-team" clamps, arguing
  with each other over who saw a car first (a quick-time "No, I saw it
  first" duel).
- **Voice barks:** short gibberish voice blips per character, like Animal
  Crossing.
- **Deploy:** a Dockerfile and one-click hosting (Fly.io, Render), room
  browser, reconnect-on-drop.
