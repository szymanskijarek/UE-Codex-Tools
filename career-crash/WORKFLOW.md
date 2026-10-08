# Career Crash: how we work

How the game gets changed, checked, released and kept healthy, and which tools
to use for each step. It's written for whoever picks the project up: you, or
a Claude Code session. Exact commands for every build step are in
[`PIPELINES.md`](PIPELINES.md); code rules are in [`AGENTS.md`](AGENTS.md).

## Where things live

| What | Where |
|---|---|
| Live game | https://careercrash.org (www.careercrash.org redirects there) |
| Hosting | Cloudflare Worker `career-crash`, deployed by Workers Builds from the `prod` branch |
| Online API | Cloudflare Worker `career-crash-api` + D1 `career-crash` on api.careercrash.org, deployed by GitHub Actions from `prod` (launch steps: `PIPELINES.md` §7.1) |
| Code | GitHub `szymanskijarek/UE-Codex-Tools`, folder `career-crash/` |
| Single-file copy | Claude artifact https://claude.ai/artifact/2xjKeMt4niQSx7P9jYzwg7 (private; opens in the Claude app) |
| Unlisted CV page | https://careercrash.org/jarek-o9bh9e/ (`apps/client/public/jarek-o9bh9e/index.html`, plain HTML). `noindex`, kept out of `sitemap.xml` and not linked from the site: reachable by direct link only. |
| Design docs | `docs/career-crash/` (GDD, tech spec, combat, economy, roadmap) |
| Build and pipeline commands | `PIPELINES.md` |
| CI | `.github/workflows/career-crash.yml`: content, lint, typecheck, tests, goldens, balance smoke, client build |
| API deploy | `.github/workflows/career-crash-api.yml` |
| Diplomatic Incident votes | Cloudflare Worker `career-crash-votes` + Durable Objects on vote.careercrash.org, deployed by `.github/workflows/career-crash-votes.yml` from `prod` (launch steps: `PIPELINES.md` §7.3) |
| Crypto Bros feed | Cloudflare Worker `career-crash-markets` + KV `career-crash-feed` on feed.careercrash.org, deployed by `.github/workflows/career-crash-markets.yml` from `prod` (launch steps: `PIPELINES.md` §7.2) |

## Branches and releases

| Branch | Role |
|---|---|
| `prod` | What's live. Every push deploys careercrash.org, usually in 2–3 minutes (and the API, when worker code changed). |
| `dev` | Integration. Finished work lands here. Pushes get a private preview build on Cloudflare. |
| feature branches | One per piece of work (Claude sessions create `claude/…` or `ccr-…` branches). Merge into `dev`. |
| `main` | The repo's original Unreal/Codex tooling only. It does **not** contain the game. Don't deploy from it. |

**Release flow:**
1. Do the work on a feature branch, running `pnpm check` (see *Everyday loop*).
2. Merge into `dev` and let CI go green. Optionally check the Cloudflare preview build.
3. Fast-forward `prod` to `dev`, either by a PR from `dev` to `prod` on GitHub or with
   `git push origin dev:prod`.
4. Confirm the live site serves the new build (see *Checking a release*).
5. Republish the Claude artifact if you want the offline copy in sync (see `PIPELINES.md` §6.3).

**Rolling back:** push the previous good commit to `prod`
(`git push -f origin <good-sha>:prod`). The next build redeploys it. Cloudflare's
dashboard can also roll back instantly under the Worker's Deployments tab.

Recommended GitHub and Cloudflare settings are listed under *Settings checklist*.

## Everyday loop

From `career-crash/`:

```bash
pnpm install                 # once per checkout
pnpm check                   # content build + lint + typecheck + all tests: must pass before committing
pnpm dev:client              # play locally at http://localhost:5173/#/career or #/sandbox
pnpm build:web               # the exact site careercrash.org serves → apps/client/dist-web/
npx wrangler deploy --dry-run   # validates the Cloudflare config without deploying
```

**If you change behaviour:**
- **Content (JSON under `packages/content/data/`):** `pnpm golden:update` re-records the 96
  golden fights (the check fails on the content hash until you do).
- **Sim code:** also bump `SIM_VERSION` (AGENTS.md rule 2).
- **Balance-relevant content:** `pnpm balance --battles=400`, and
  `pnpm balance --bosses` for boss changes. Put the headline numbers in the commit or PR.
- **UI and art:** look at it in a browser (Sandbox fights exercise nearly everything).
  Playwright with the preinstalled Chromium is how Claude sessions take screenshots.

## Checking a release

After pushing to `prod`, the live site should serve the same script file as
your local `pnpm build:web`:

```bash
H=$(grep -o 'assets/index-[A-Za-z0-9_-]*\.js' apps/client/dist-web/index.html)
curl -s https://careercrash.org/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'   # should equal $H
```

Then open the site on a phone and play one fight. If it's still the old
version after ~5 minutes, open the Cloudflare dashboard → Workers & Pages →
`career-crash` → Deployments, and read the build log.

## Bringing in new art

Send images as PNG with transparent backgrounds (backdrops are opaque). Put
source files in `art/`; the art pipeline turns them into the game's atlases
(`PIPELINES.md` §5 has the commands and flags).

| Asset | What to deliver | Goes to |
|---|---|---|
| Arena backdrop | ~1672 × 941 painting with an open floor in the middle | `art/arenas/<arena>.png` |
| Obstacles / machines | Sheet of large props, 2 rows (2 or 3 per row) | `art/obstacles/<name>.png` + `manifest.json` |
| Obstacle damage states | The same sheet, damaged (still standing) and destroyed (flat rubble), same order | `art/obstacles/<arena>-damaged.png`, `<arena>-destroyed.png` |
| Props / items | Sheet of small props, 2 rows (3 or 4 per row) | `art/items/<name>.png` + `manifest.json` |
| Character body (career or boss) | Posed figure on the left, the same figure cut into parts on the right (head, torso, pelvis, upper arms, forearms with hands, thighs, shins, feet) | `art/sheets/<career>.png` |
| Faces | Four emotion sheets (neutral, angry, surprised, hurt), heads in a grid | `art/faces/`, `art/faces-b/` |
| Impact effect (hits, dust, KO stars…) | One row of animation frames per effect, same origin in every frame (sizes and prompts in `art/FX_BRIEF.md`) | `art/items/fx-<effect>.png` + `manifest.json` (`grid`) |
| Summoned animal | 256 px cells, 2 rows × 4: pose A standing, pose B moving, facing right, feet at the bottom | `art/critters/<sheet>.png` + `manifest.json` |

Check each import: the slicers write labelled previews to
`tools/art-pipeline/out/`. Fix mislabelled or merged parts in the sheet's
manifest (`parts`, `split`, `noFeet`, `flip`).

Every career and the referee now have body sheets and faces. The referee's
puppet is `career.referee` in the atlas; his sheet needed a head/torso split
override in the manifest.

**Still needed:**
- **Boss faces:** the 12 bosses still wear one fixed head (prompts in
  `art/ART_BRIEF.md` §3).
- **Docks obstacles:** they currently use their weathered art as the intact state, and have no
  separate damaged state. A clean "intact" sheet would complete them.
- **Damage states for the six original arenas** (supermarket, office, diner, station,
  warehouse, construction), plus the docks damaged sheet. Their obstacles squash
  into a plain grey heap when destroyed until real rubble art exists.
  Ready-to-paste prompts: `art/obstacles/DAMAGE_SHEET_PROMPTS.md`.

**Size budget:** the single-file build is ~8.0 MB, against a 16 MB artifact limit.
The website loads images on demand, so size matters less there. Rough costs per
addition in the single file: a backdrop ~130 KB, a character (body plus faces) ~30 KB,
an obstacle ~15 KB, a prop ~4 KB. Keep sheets at the sizes above; the pipeline
compresses them (WebP, palette-quantised).

## Adding content

**Where each kind of change goes:**
- **Text** (commentary, barks, feed posts, comments, boss one-liners): `live.json`
  (placeholder rules are in `PIPELINES.md` §1).
- **Career banter:** `data/synergies/`.
- **Company name words** (the adjective, noun and suffix players pick from): `packages/game-rules/src/company.ts`.
- **Summons** (critters that Senior Moves call in): `data/summons/` — health, speed, lifetime,
  behaviour (scatter, pester, decoy, aura, entourage), touch and aura effects, and which fear they
  trigger. Fighters get fears from career tags (`fear:dogs` …); `animal-friend` careers are left
  alone. Design and numbers: `docs/career-crash/05-summons-and-senior-moves.md`.
- **Senior Moves:** the `senior` field on each career (rank 4 in the skill tree).
- **HR notes** (each profession's hidden personnel-file buffs and debuffs, revealed when the player opens the file):
  `packages/content/data/hrNotes/`, with `hr.<id>.name` and `hr.<id>.desc` in the locale. Conditions (arena, teammate career,
  tag or personality, agency temp, opponent career or tag, boss, perk kind, packed consumable), budget and the scowl rule:
  `docs/career-crash/06-personnel-files-and-garden-leave.md`. Staff cap, squad size and Garden Leave XP: `economy.json` → `hr`.
- **Loot** ("Perks & Benefits" in the game; items dropped by wins, assignable to you and every hire): kinds of item in `packages/content/data/loot/` (icon plus the stats it
  favours, name in the locale); rarity points, drop odds, ability chances, sell prices, bag size and opponent
  gear in `economy.json` → `loot`. Rules and the server-side validity check are in `packages/game-rules/src/loot.ts`.
  After changing odds or points, re-check boss difficulty with `pnpm balance --bosses`.
- **Nationality** (career mode, optional): the main character's country lends a small boost when it did well at the
  Diplomatic Incident in the last finished hour. Tiers by rank (stats, an optional kick-off status), the change cooldown
  and their names: `economy.json` → `nationality` and `nationality.<tier>.name` in the locale. Rules:
  `packages/game-rules/src/nationality.ts`; UI: `apps/client/src/career/nation.ts`, `Hub.tsx`.
- **Character names and titles** (first and last names, titles before and after a name): `packages/content/data/names.json`.
  Add freely. If an entry is removed, characters keep their saved name; the rename picker starts from a fresh name for them.
  Only add words; renaming or removing one resets saves that used it to a random name.
- **Careers, abilities, props, arenas, bosses:** follow the checklists in
  `PIPELINES.md` (*Adding an arena*, *Adding or changing a ladder boss*,
  *Adding art for a new career*) and AGENTS.md *Common tasks*.

**Current scale:** 66 careers plus 12 ladder bosses, 12 arenas (48-stage ladder), 101
props, 344 abilities (every career has a Senior Move), 28 summoned critters, 132 HR notes (two per career).

## Search and link previews

| What | Where |
|---|---|
| `robots.txt`, `sitemap.xml` (the three real pages) | `apps/client/public/` |
| Title, description, canonical, Open Graph / Twitter tags | each page's `index.html` (`apps/client/index.html`, `cryptobro/`, `incident/`) |
| Structured data (`WebSite`, `VideoGame`) | `apps/client/index.html` |
| Share images (1200 × 630) | `public/share.jpg`, `public/cryptobro/share.jpg`, `public/incident/share.jpg` |
| Text for crawlers and no-JavaScript visitors | inside `<div id="app">` in each `index.html`; each `main.tsx` clears it before rendering |
| www → careercrash.org (301) | `apps/client/src/site-worker.ts` |

`share.jpg` and `incident/share.jpg` are Sandbox / Summit screenshots with a title
plate; the painted Summit share image (`art/incident/11-FX_AND_PAGE.md` #5) replaces
the Incident one when it arrives. In-game screens (`#/career` …) sit behind a hash
and are never indexed; add a page to `sitemap.xml` only when it has its own path.
After changing tags, check a preview with the platforms' debuggers (Facebook Sharing
Debugger, LinkedIn Post Inspector) to refresh their cache.

## Tools

| Tool | Used for | Notes |
|---|---|---|
| Node 22 + pnpm 10.33 | everything | versions pinned in `package.json` (`packageManager`, `engines`) |
| Wrangler (workspace dependency) | Cloudflare config, dry runs, manual deploys | `npx wrangler …` from `career-crash/`; config in `wrangler.jsonc` |
| sharp | art pipeline | installed with the workspace |
| Playwright + Chromium | screenshots and browser smoke tests | preinstalled in Claude cloud sessions |
| GitHub Actions | CI on every push touching `career-crash/`; deploys the API from `prod` | secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Cloudflare Workers Builds | builds and deploys from `prod` (and previews for other branches) | settings in `PIPELINES.md` §6.4 |

## Claude Code setup

**Cloudflare plugin.** It bundles Cloudflare's skills and an MCP server. The
most useful skills here:
- `cloudflare:wrangler`: Wrangler commands and config.
- `cloudflare:workers-best-practices`: reviewing the Worker config.
- `cloudflare:web-perf`: load speed and Core Web Vitals for careercrash.org.
- `cloudflare:cloudflare`: choosing products, for example when the online API goes live.

To enable it for every session on this repo, commit this as `.claude/settings.json`
at the repo root:

```json
{
  "extraKnownMarketplaces": {
    "cloudflare": { "source": { "source": "github", "repo": "cloudflare/skills" } }
  },
  "enabledPlugins": { "cloudflare@cloudflare": true }
}
```

The Cloudflare MCP server needs a one-time browser sign-in (`/mcp` in an
interactive session). Until then, Claude works through git, Wrangler dry runs
and the build logs you share.

**Built-in skills worth using:**
- `/code-review`: before merging bigger changes.
- `/simplify`: after a feature lands.
- `/security-review`: before the online API goes live.
- `/run`: launch and screenshot the game.

**Optional:** a SessionStart hook (the `session-start-hook` skill) to run
`pnpm install && pnpm content:build` when a cloud session starts, so checks run
straight away.

**Working from the Claude mobile app:**
- **What works:** everything code-side (edits, checks, pushes, screenshots, publishing the artifact).
- **What doesn't:** you can't set environment variables or sign in to MCP servers from the app.
- **Workarounds:** use a browser for the Cloudflare dashboard and GitHub settings, and paste
  screenshots or build logs into the chat when something needs inspecting.

**Limits of Claude cloud sessions:**
- **Reaching the live site:** the sandbox's network gateway lets `curl` reach
  careercrash.org, but its browser often can't (certificate or tunnel errors).
  Test the site's content with `curl`, and test UI on the local `dist-web` build.
- **Artifacts:** publishing the artifact always updates the same link. The publisher's
  "download link" warning is a false alarm (unused PixiJS code).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Cloudflare build fails at "Cloning": *root directory not found* | The build ran from a branch without `career-crash/` (for example `main`). Set Settings → Build → Branch control → production branch `prod`. |
| Deploy fails: Worker name mismatch | The Cloudflare Worker must be named `career-crash`, matching `name` in `wrangler.jsonc`. |
| Site "doesn't exist" right after the first deploy | DNS "not found" answers are cached for up to 30 minutes. Try a private tab or another network, or clear the browser's DNS cache. |
| www works oddly | `www.careercrash.org` must be a Custom domain (it's in `wrangler.jsonc`). Delete any leftover *Route* for it under Domains & Routes. |
| API workflow says "skipping" | The GitHub secrets or the real D1 id aren't in place yet (`PIPELINES.md` §7.1 steps 1–3). |
| Online game: "Not signed in" everywhere | `SESSION_SECRET` isn't set on `career-crash-api` (§7.1 step 5). |
| Online game: requests blocked by CORS in the browser console | The page's address isn't in `ALLOWED_ORIGIN` in `apps/worker/wrangler.toml`. |
| `wrangler` in `apps/worker` deploys the site instead | Always pass `-c wrangler.toml` (the package scripts do). |
| http doesn't redirect to https | Turn on SSL/TLS → Edge Certificates → Always Use HTTPS. |
| `pnpm check` fails only on "golden replays were generated for the current content" | Content changed: `pnpm golden:update` (and bump `SIM_VERSION` if sim code changed). |
| Lint reports thousands of errors in minified code | A build folder isn't in `eslint.config.js` ignores. |
| A character looks stitched together | They have no body sheet (see *Bringing in new art*), or the slicer mislabelled a part: check `tools/art-pipeline/out/puppets/<career>.png`. |

## Settings checklist

One-time settings that live in dashboards, not in the repo.

**Cloudflare** (dash.cloudflare.com → careercrash.org):
- [ ] SSL/TLS → Edge Certificates → **Always Use HTTPS**: on.
- [ ] SSL/TLS → Overview → encryption mode **Full (strict)**.
- [ ] Workers & Pages → `career-crash` → Settings → Domains & Routes: `careercrash.org`
      and `www.careercrash.org` both listed as **Custom domain**; delete any *Route* entry for www.
- www → careercrash.org is done by the site Worker (`apps/client/src/site-worker.ts`), so no Redirect Rule is needed.
- [ ] Workers & Pages → `career-crash` → Settings → Build: production branch `prod`;
      non-production builds on (these make the `dev` previews).
- [ ] Rate limiting rule for the vote service (`PIPELINES.md` §7.3 step 3); after the API launch, extend it (§7.1 step 6).

**GitHub** (repo → Settings):
- [ ] General → Default branch: **`dev`** (new PRs and Claude sessions start from the game, not `main`).
- [ ] Rules → Rulesets → New branch ruleset for `prod`: restrict deletions and block force
      pushes. Optionally also require a pull request with the `check` status check; then
      releases go by PR from `dev` (not `git push origin dev:prod`), and so do rollbacks.
- [ ] Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (API launch).

**Search engines** (one-time, needs the owner's Google/Microsoft account):
- [ ] Google Search Console: add the **Domain** property `careercrash.org`, verify with the TXT record it gives
      (Cloudflare → DNS → Records → Add), then Sitemaps → submit `https://careercrash.org/sitemap.xml`.
- [ ] Bing Webmaster Tools: *Import from Google Search Console* (or the same TXT route).

**Claude Code:** commit the `.claude/settings.json` from *Claude Code setup* so every
session gets the Cloudflare plugin.

## Next milestones

- **Body sheets** for the four remaining careers (prompts ready in `art/sheets/BODY_SHEET_PROMPTS.md`).
- **Online game:** API code, config and deploy workflow are ready and tested locally,
  including cross-origin; follow `PIPELINES.md` §7.1 to launch. Run `/security-review` first.
- **Settings checklist** above.
