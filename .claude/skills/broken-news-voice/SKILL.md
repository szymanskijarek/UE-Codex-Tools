---
name: broken-news-voice
description: Keep every Broken News character in character. Use whenever writing, importing, editing or reviewing a Broken News episode script (career-crash/apps/client/src/news/episodes/*.json), including turning the owner's rough script into episode JSON, and flag any line where a character says or does something they wouldn't (Philippa saying "pants", Brock being sarcastic, Kevin speaking).
---

# Broken News: keep everyone in character

The cast bible (`docs/career-crash/11-broken-news-cast.md`) says who everyone
is. This skill is the checklist for scripts. Owner scripts arrive rough
(typos, shorthand, "cohost"); turning them into JSON is where characters
slip.

## How to use it

1. Write or import the script as usual (`docs/career-crash/10-broken-news.md` §4).
2. Run the automatic check: `pnpm --filter @cc/client exec vitest run test/news-episode.test.ts`.
   It runs `voiceFlags` (`apps/client/src/news/voice.ts`), and the page lists
   the same flags on the episode's start card.
3. Read every line against **the sheet below** for what words can't catch.
4. **Report what you changed and what you flagged.** In the reply to the
   owner, list each in-character fix you made to their lines ("Philippa:
   *pants* → *trousers*, she's British") and each thing you weren't sure
   about, as a question. Don't silently rewrite their joke; fix dialect and
   names, ask about anything that changes the joke.
5. A deliberate break (Philippa quoting Brock's "pants") stays, with the
   reason in the line's `offVoice`. Then the check lets it be.

When a script establishes something new about a character (a catchphrase, a
fact, a relationship beat), add it to the sheet here and to the cast bible
in the same commit.

## The sheet

| Who | Seat | Speaks | Always | Never |
|---|---|---|---|---|
| **Brock Stetson Jr.** | `us` | American English (pants, mom, color). Short, loud, sure. Catchphrases slightly wrong. | Wrong with total confidence; generous and thrilled for everyone; believes every word he's told; calls the desk "the stage"; loves Jeff; calls Philippa his friend. | Sarcastic or ironic. Gets her surname right (he mangles *Featherstonehaugh*, or sticks to "Philippa"). Blames Jeff. Mean to anyone below him. |
| **Philippa Featherstonehaugh** | `uk` | British English (trousers, mum, colour). Precise, flat, a beat too long. "Right." as a sentence. | Has the real story by the second line; takes idioms literally; oddly specific questions; one awkward attempt at warmth an episode; corrects Brock but defends him to others. | Exclamation marks before the swing. Small talk. Lying. Calling him "Stets". Raising her voice before heat 3. |
| **Rupert Fennimore-Twistleton** | `field` | British English. War-zone gravitas, formal, unhurried. | Treats trivia as a front line ("battlefield", "casualty", "withdrew to its own lines"); kind to every local; unsure which country he's in; extra formal with Philippa (old flame). | Exclamation marks before it gets personal. Mocking the locals. Slang. |
| **Chase Hurley** | `field` | American English. Shouting over silence, superlatives. | "Stets!" for Brock; every story is the biggest of his career; backs up Brock's wrong claims with "evidence"; takes fact-checks as compliments. | Calm understatement. Turning on Brock. |
| **Hamish Tuck** | `field` | New Zealand English, British spellings. Sunny, unhurried; "yeah, nah", "sweet as", sparingly. | One line behind (`pause: "delay"`); already in tomorrow; proud of Wellington; delighted by everything. | Complaining about the delay. Mocking his town. His height as the joke (the props do it). |
| **Bev Fizzwilliam** | `field` | Long vowels, "darling", champagne pauses. | Tipsy means bubbly; one risqué line, cut off or `{bleep}`ed; kind to waiters; adores Philippa ("my favourite little iceberg"); toasts at the end. | Explicit words. Jokes about a real person or anyone's body. Sloppy or sad. |
| **Brody Kale** | `guest` | Upbeat, earnest, counts reps. | Hears every question as a wellness question; only knows which players hydrate; proud of everyone; thinks the brawl is a workout. | Understanding the question. Being discouraging. |
| **Dusty Gale** | `guest` | Data, isobars, clouds by name. | Takes the weather personally; names clouds (Gerald); nerds out with Philippa; wants a longer slot. | Hype. Getting the science wrong. |
| **Jeff** | `jeff` | One short shout from off screen (70 characters at most). | "Sorry, Brock!"; drops things only on Brock. | Being seen (not even a hand). A second sentence. Dropping things on anyone else. |
| **Kevin** | `guest` | Never speaks. | Picks up what Jeff dropped; stage directions only, in (brackets). | Words. (One day, the season finale.) |
| **Marcel** | `guest` | Never speaks (mime). | Stage directions only. | Words. |

Everyone (cast bible §1): good at something once an episode; nobody is cruel
or mocked for who they are; one mean line at most, from whoever has the most
status, never down; they make up by the sign-off.

## What the automatic check flags (`voice.ts`)

- A British character using American words or spellings, and the reverse.
- Cruel words (idiot, stupid, ugly, fat, shut up…) from anyone.
- Brock saying *Featherstonehaugh* or *Fanshaw* correctly, or blaming Jeff.
- Philippa using "!" before heat 3 or calling Brock "Stets"; Rupert using "!" before heat 2.
- Bev saying the explicit word instead of implying it.
- Jeff saying more than one short line.
- Kevin or Marcel saying anything that isn't a stage direction.

New rules go in `VOICE` in `voice.ts`, with a test case in
`test/news-episode.test.ts`.
