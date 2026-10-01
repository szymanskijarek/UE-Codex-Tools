# 06 — Personnel Files and Garden Leave (design v0.1)

Status: **built**. Adds a people layer on top of career mode: a bigger staff,
a bench called **Garden Leave**, and a hidden **Personnel File** for every
profession. Each file holds **HR notes**: buffs and debuffs that switch on
in the right arena, next to the right (or wrong) colleague, against certain
opponents, or with certain perks or snacks packed.

Owner of: squad size, garden leave, HR notes (content, conditions, effects),
when they are revealed, and how fighters look when a colleague winds them up.
The economy numbers live in `economy.json` → `hr`; the notes live in
`packages/content/data/hrNotes/`.

## 1. Goals

- **Squad picking becomes a decision every fight.** Who fights depends on the
  arena, the opponents and who gets on with whom, not only on levels.
- **Hiring is a gamble with a reveal.** You learn what someone is really like
  only after you've hired them and opened their file.
- **Office politics you can see.** A fighter who can't stand a teammate scowls
  in the line-up before you've read a single note.
- **Small numbers.** An HR note is worth about one loot item: it nudges a
  fight, it doesn't decide it.

## 2. Staff and Garden Leave

| Rule | Value |
|---|---|
| Staff | You plus up to **5 hires** (roster cap 6, unchanged). |
| Squad | You plus **2** hires fight (3v3, unchanged). Empty slots get agency temps. |
| Garden Leave | Everyone else, up to **3**. They're still on the payroll, "between projects". |
| Garden Leave XP | After each fight, everyone on Garden Leave gets **25%** of the fight's base XP (win/draw/loss, no KO or MVP bonus), at the difficulty's reward rate. It's from the online courses they "did" in a deckchair. Their careers rank up from it too. |
| Moving people | One tap in the Squad screen: **🌷 Garden Leave** or **💼 Back to work**. A new hire joins the squad if there's room, otherwise they start on Garden Leave. |

Garden Leave is also how you sidestep office politics: send whoever is upsetting
the squad off to the garden for this fight.

## 3. HR notes

### 3.1 What a note is

Each profession has **two HR notes** (66 careers × 2 = 132; bosses have none).
A character with several careers carries the notes of every career they hold.
A note has:

| Field | Meaning |
|---|---|
| `career` | Whose file it's in. |
| `tone` | `buff`, `debuff` or `mixed`. It sets the colour in the file and the scowl rule (§4). |
| `when` | Conditions; **all** must hold for the note to switch on (below). |
| `stats` | Stat changes for that fight, folded into the snapshot like loot. |
| `status` | Optional status from kick-off (applied at the same moment as kick-off consumables). |
| `mood` | Optional face for an ally-caused debuff: `angry` (default) or `hurt`. |

Display text: `hr.<id>.name` (the note's title) and `hr.<id>.desc` (one line
in HR's voice) in `locales/en.json`. The condition and effect lines in the
file are generated from the data, so they never go stale.

### 3.2 Conditions (`when`)

| Key | Holds when | Example |
|---|---|---|
| `arena` | The fight is in one of these arenas. | Lifeguard at the Docks: +2 Speed. |
| `ally` | A teammate's current career is one of these. | Lawyer next to a Journalist: −2 Charisma (scowls). |
| `allyTag` | A teammate's current career has one of these tags. | Nurse with any `role:medical` colleague: +2 Recovery. |
| `allyPersonality` | A teammate has one of these personalities. | Personal Trainer with a Lazy teammate: −2 Confidence (scowls). |
| `temp` | At least one agency temp is in the squad. | Hotel Concierge with a temp: Embarrassed at kick-off. |
| `enemy` | An opponent's current career is one of these. | Food Critic against a Chef: Inspired. |
| `enemyTag` | An opponent's current career has one of these tags. | Police Officer against `role:legal`: −2 Confidence. |
| `boss` | It's a boss fight. | TV Host against a boss: +2 Charisma. |
| `gear` | They wear a perk of one of these kinds. | Builder in a hard hat: +2 Health. |
| `consumable` | They packed one of these shop items. | Barista with an energy drink: −2 Awareness (tolerance). |

"Teammate" counts the main character, hires and agency temps. Notes never
trigger on the character themselves.

### 3.3 Effects and budget (checked by the content compiler)

- `stats`: each stat between −3 and +3, at most 4 points in total (counting
  minus points too).
- `status`: from a short allow-list (good: `inspired`, `pumped`, `caffeinated`,
  `buzzed`, `regen`, `armoured`, `numb`; bad: `embarrassed`, `distracted`,
  `slowed`, `jinxed`, `cold`, `sticky`), lasting 1–30 s. Fighters walk to their
  stations for the first 11 s, so 15–25 s is typical.
- `tone` must match: a `buff` has no minus stats and only a good status, a
  `debuff` has no plus stats and only a bad status, `mixed` is anything else.
- Every non-boss career has at least 2 notes. Every reference (career, arena,
  tag, personality, loot kind, shop item, status) must exist.

### 3.4 Who has notes

- **Your staff and you.** The main character has a file too.
- **Agency temps** have none ("the agency doesn't share files"), but their
  careers can set off your people's notes.
- **Opponents** have none in this version. Their careers are what your people
  react to. (Opponent files are a possible later step, see §7.)
- **Sandbox fights** ignore HR notes.

## 4. Reveal and the scowl

- **Applicants:** their file is sealed. The card says so.
- **After hiring:** every note is in the file but unread. The staff row shows
  a **📁 File** button with an alert dot until you open it.
- **Opening the file** (the character sheet, `#/career/file/<id>`) marks every
  current note as read. Taking a new career adds that career's notes as unread
  again.
- **Unread notes still apply in fights.** You just don't know why someone
  played well or badly.
- **The scowl:** when an **ally-caused** note with tone `debuff` or `mixed`
  is active for the next fight (its conditions include `ally`, `allyTag`,
  `allyPersonality` or `temp`), that fighter's portrait and line-up puppet use
  the note's `mood` (angry by default, pained for allergies and the like).
  This shows even when the note is unread, as a hint to go and read the file.
- **Line-up preview:** the Squad screen lists, per fighter, the notes active
  for the next fight against the known opponents and arena. Read notes show
  their name and effect. Unread ones show as "📁 something in their file",
  with a ▲ or ▼ for the direction.

## 5. Engine and data work

| Piece | Where |
|---|---|
| Schema `hrNoteSchema`, collection `hrNotes`, compiler checks (§3.3) | `content-schema`, `content-compiler` |
| `economy.hr`: `gardenLeaveXpBp`, `squadSize`, `staffCap` | `economy.json` |
| Resolving notes: `activeHrNotes`, `applyHrNotes`, `hrMood`, `describeHrWhen`, `describeHrEffect` | `game-rules/src/hr.ts` |
| Snapshot field `startStatuses` (status + ticks, applied at kick-off with consumables; absent = no change) | `sim` (`SIM_VERSION` 0.14.0) |
| Squad screen (Garden Leave, preview, scowls), Personnel File screen, applicant teaser | `apps/client/src/career/` |
| Saves: `CareerChar.readNotes` (note ids read); old saves start with every file unread | `game-rules`, `client/career/model.ts` |

## 6. Balance

HR notes only touch the player's side. Across all 132 notes the stat points
sum to roughly zero, and a typical squad has 1–3 notes active in a fight. The
ladder difficulty table (03 §3.5) should hold: measure with a proxy squad
before adding bigger effects. `pnpm balance` (random teams, no files) is
unaffected.

## 7. Later

- **Opponent files:** ladder opponents and bosses with their own notes, and
  showing them in the hub as "rumours".
- **Feed posts** when a note fires ("Not working with HIM again.").
- **Garden Leave art:** a garden backdrop with deckchairs where benched staff
  idle (prompt in `career-crash/art/PERSONNEL_FILE_PROMPTS.md`).
