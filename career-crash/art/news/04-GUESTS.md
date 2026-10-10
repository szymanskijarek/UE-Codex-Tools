# Broken News 04: the recurring guests

> **Status (9 October 2026):** Dusty's six desk close-ups delivered and in
> the game (a seventh, presenting while facing the camera, is kept as
> `desk-dusty-neutral-front.png`). His body sheet
> (`npc.news-dusty`, six manifest cuts) and four fight heads are in too, so
> Dusty is complete. He has since been redesigned (brief 11 A: tall, lanky,
> yellow rain mac, weathervane hair); the pictures above are the new look. The other guests are
> now ready-to-paste prompts in brief 10.

> Part of the Broken News art set (`art/news/README.md`). Design:
> `docs/career-crash/10-broken-news.md` §3.2.

Some weeks a third person barges into the shot: the weather man, the sports
desk, an "expert". They walk on mid-argument, make it worse, and join the
brawl. Each guest needs **three things**, made with the same prompts as the
anchors so they sit in the same shot:

1. **Seated/standing close-up for the desk shot** (brief 01, part C rules):
   `art/news/desk-<guest>-<expression>.png`, 768 × 768, transparent, waist
   up, facing the camera turned slightly **left** (they stand at the right
   edge of the desk), expressions `neutral`, `talk`, `smug`, `surprised`,
   `angry`, `lunge`.
2. **Body sheet** (brief 02, part A rules): `art/sheets/npc-news-<guest>.png`.
3. **Four heads** (brief 02, part B rules): `art/heads/<expression>/npc-news-<guest>.png`.

Paste the preamble from brief 01 (close-ups) or brief 02 (body, heads) first,
then the guest's description below.

**Send one guest at a time,** Dusty first.

## 1. Dusty Gale: Weather (`dusty`) (priority 1, in the pilot)

He/him, 30s, on a short-term contract and desperate to be noticed.
Main colour: teal #0e7c66 with yellow.

> A TV weatherman in his thirties: a teal suit with a loud yellow tie
> covered in little suns and clouds, a weather clicker in his breast pocket,
> a lapel mic, windswept sandy hair that is always blowing to one side even
> indoors, a big hopeful grin, a slightly damp collar as if he's just come in
> from the rain.

| Expression | Close-up and head |
|---|---|
| `neutral` | big eager grin, presenting an invisible weather map with an open hand |
| `talk` | mid-forecast, pointing off to the side at an invisible map |
| `smug` | finger-guns, winking |
| `surprised` | hair blown fully straight back, mouth an O |
| `angry` | jabbing the weather clicker like a weapon |
| `lunge` | leaping in from the right, tie flying, clicker raised |

Heads use `neutral`, `angry`, `surprised` and a `hurt` (eyes squeezed shut,
wincing, hair flattened by a gust).

## Later guests (written now so the cast stays consistent)

**2. Coach Biff Malone: Sports (`biff`), retired** (Brody Kale replaces him: brief 10, cast bible §5). He/him, 50s, American. Red
#b91c1c with white. *A former minor-league baseball coach turned sports
anchor: a red team windbreaker over a polo shirt, a whistle on a lanyard, a
baseball cap, a stopwatch, a thick grey moustache, a clipboard tucked under
the arm.* Shouts every sentence.

**3. Tamsin Quayle: Traffic, live from the helicopter (`tamsin`)**,
she/her, 30s, British. Orange #ea580c with grey. *A traffic reporter in an
orange flight jacket with a headset and boom mic, aviator sunglasses pushed
up on windswept blonde hair, a clipboard of road maps.* Always shouting over
rotor noise, even in the studio.

**4. Dr Ainsley Verity: An Expert (`ainsley`)**, they/them, 40s. Mustard
#ca8a04 with brown. *A pundit in a mustard tweed jacket with elbow patches, a
turtleneck, round tortoiseshell glasses, a stack of their own book under one
arm (blank covers).* Agrees with whoever spoke last.

**5. Kevin: The Intern (`kevin`)**, he/him, 20s. Grey #6b7280 with a lanyard.
*A studio intern in a grey hoodie with a lanyard and a headset, holding a
boom microphone pole (strapped to his back on the body sheet), a coffee
tray, a nervous smile.* Has never been allowed to speak.

## Importing

As in briefs 01 and 02:

```
pnpm --filter @cc/art-pipeline puppets npc-news-<guest>
pnpm --filter @cc/art-pipeline faces
```

Close-ups go to `apps/client/src/news/art/` as WebP. Then Claude gives the
guest a stand-in-free entry in `apps/client/src/news/cast.ts` and episodes can
name them in `guest`.
