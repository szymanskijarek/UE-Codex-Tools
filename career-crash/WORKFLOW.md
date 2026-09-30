# Career Crash: how we work

How the game gets changed, checked, released and kept healthy, and which tools
to use for each step. It's written for whoever picks the project up: you, or
a Claude Code session. Exact commands for every build step are in
[`PIPELINES.md`](PIPELINES.md); code rules are in [`AGENTS.md`](AGENTS.md).

## Where things live

| What | Where |
|---|---|
| Live game | https://careercrash.org (and www.careercrash.org) |
| Hosting | Cloudflare Worker `career-crash`, deployed by Workers Builds from the `prod` branch |
| Online API | Cloudflare Worker `career-crash-api` + D1 `career-crash` on api.careercrash.org, deployed by GitHub Actions from `prod` (launch steps: `PIPELINES.md` §7.1) |
| Code | GitHub `szymanskijarek/UE-Codex-Tools`, folder `career-crash/` |
| Single-file copy | Claude artifact https://claude.ai/artifact/2xjKeMt4niQSx7P9jYzwg7 (private; opens in the Claude app) |
| Design docs | `docs/career-crash/` (GDD, tech spec, combat, economy, roadmap) |
| Build and pipeline commands | `PIPELINES.md` |
| CI | `.github/workflows/career-crash.yml`: content, lint, typecheck, tests, goldens, balance smoke, client build |
| API deploy | `.github/workflows/career-crash-api.yml` |

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
| Props / items | Sheet of small props, 2 rows (3 or 4 per row) | `art/items/<name>.png` + `manifest.json` |
| Character body (career or boss) | Posed figure on the left, the same figure cut into parts on the right (head, torso, pelvis, upper arms, forearms with hands, thighs, shins, feet) | `art/sheets/<career>.png` |
| Faces | Four emotion sheets (neutral, angry, surprised, hurt), heads in a grid | `art/faces/`, `art/faces-b/` |

Check each import: the slicers write labelled previews to
`tools/art-pipeline/out/`. Fix mislabelled or merged parts in the sheet's
manifest (`parts`, `split`, `noFeet`, `flip`).

**Still needed:** body sheets for **Security Guard, Delivery Driver, Janitor**
and **Engineer**. They currently draw a plain body under their painted face.
Ready-to-paste generation prompts: `art/sheets/BODY_SHEET_PROMPTS.md`.

**Size budget:** the single-file build is ~6.5 MB, against a 16 MB artifact limit.
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
  Only add words; renaming or removing one resets saves that used it to a random name.
- **Careers, abilities, props, arenas, bosses:** follow the checklists in
  `PIPELINES.md` (*Adding an arena*, *Adding or changing a ladder boss*,
  *Adding art for a new career*) and AGENTS.md *Common tasks*.

**Current scale:** 66 careers plus 12 ladder bosses, 12 arenas (48-stage ladder), 101
props, 272 abilities.

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
- [ ] Optional: Rules → Redirect Rules → *Redirect from WWW to root* template, so there's one canonical address.
- [ ] Workers & Pages → `career-crash` → Settings → Build: production branch `prod`;
      non-production builds on (these make the `dev` previews).
- [ ] After the API launch: the rate-limiting rule from `PIPELINES.md` §7.1 step 6.

**GitHub** (repo → Settings):
- [ ] General → Default branch: **`dev`** (new PRs and Claude sessions start from the game, not `main`).
- [ ] Rules → Rulesets → New branch ruleset for `prod`: restrict deletions and block force
      pushes. Optionally also require a pull request with the `check` status check; then
      releases go by PR from `dev` (not `git push origin dev:prod`), and so do rollbacks.
- [ ] Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (API launch).

**Claude Code:** commit the `.claude/settings.json` from *Claude Code setup* so every
session gets the Cloudflare plugin.

## Next milestones

- **Body sheets** for the four remaining careers (prompts ready in `art/sheets/BODY_SHEET_PROMPTS.md`).
- **Online game:** API code, config and deploy workflow are ready and tested locally,
  including cross-origin; follow `PIPELINES.md` §7.1 to launch. Run `/security-review` first.
- **Settings checklist** above.
