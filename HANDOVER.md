# Handover: careercrash.org and the other products

For a coding agent (or person) taking over this repo. It covers what exists,
how to get access, how to build and deploy, and what's still open. Details
live in the linked docs; this is the one-page orientation.

Status checked on **23 Oct 2026**.

## 1. What's in this repo

GitHub: `szymanskijarek/UE-Codex-Tools` (owner: Jarek Szymański).

| Product | What | Branch | Live at | Status |
|---|---|---|---|---|
| **Career Crash** | Async browser auto-brawler: career mode, story inbox, Sandbox | `dev` / `prod` | https://careercrash.org | Live (offline play, no accounts) |
| **Crypto Bros** | Endless hourly brawl of the top-10 coins, driven by real market data | same | https://careercrash.org/cryptobro/ | Live, feed worker live |
| **Diplomatic Incident** | Endless brawl of 40 countries, powered by viewers' likes | same | https://careercrash.org/incident/ | Live, vote worker live |
| **Broken News** | News-satire minigames introduced by two brawling anchors | same | https://careercrash.org/news/ | Live (two episodes on air) |
| **CV page** | Unlisted plain-HTML CV linking the games | same | https://careercrash.org/jarek-o9bh9e/ | Live, `noindex`, direct link only |
| **Online API** | Accounts, matchmaking, leaderboard (Hono + D1) | same, `apps/worker` | api.careercrash.org | **Built, not launched** (no DNS yet) |
| **Fine Print** | Multiplayer parking-warden browser game, no deps | `claude/parking-warden-game-3eucn3` | none | Prototype, **not merged** |
| **Unreal/Codex tooling** | MCP servers and bridges for Unreal Engine | `main` | none | Stable, rarely touched |
| **Career Crash single file** | Offline game as one HTML file | built from `dev` | Claude artifact https://claude.ai/artifact/2xjKeMt4niQSx7P9jYzwg7 (private) | Only republish when asked |

Crypto Bros, Diplomatic Incident and Broken News are extra pages of the same
client: they share the sim, renderer, puppets, audio and content bundle.

**Important:** `main` holds only the Unreal tooling. Everything game-related is
in `career-crash/` and `docs/career-crash/` on **`dev`**. Sessions often start on
`main`; switch first.

## 2. Getting set up

```bash
git fetch origin dev prod
git checkout -B <your-branch> origin/dev     # work branches always start from dev
cd career-crash
pnpm install                                 # Node 22, pnpm 10.33 (pinned in package.json)
pnpm check                                   # content build + lint + typecheck + tests; must pass before every commit
pnpm dev:client                              # http://localhost:5173  (#/career, #/sandbox, /cryptobro/, /incident/, /news/)
```

Then read, in order:
1. `INDEX.md` (repo root on `dev`): map of every project, doc section, code area and art brief.
2. `career-crash/AGENTS.md`: package map and the 7 standing rules.
3. `career-crash/WORKFLOW.md`: hosts, branches, releases, art intake, troubleshooting, settings checklist.
4. `career-crash/PIPELINES.md`: exact commands for every build, art and deploy step.
5. Design docs as needed: `docs/career-crash/00`–`12` (`README.md` there gives precedence).

Root `CLAUDE.md` holds the owner's working preferences; follow them.

## 3. Access: who holds what

| System | What it controls | Access |
|---|---|---|
| GitHub repo | Code, CI (Actions), the API/feed/vote deploys | Owner's account. Claude sessions push through the Claude GitHub App. |
| GitHub Actions secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `COINGECKO_KEY` | Repo → Settings → Secrets and variables → Actions. Never commit them. |
| Cloudflare account | Domain `careercrash.org` (DNS, SSL, WAF), Workers, KV, D1, Durable Objects | Owner's account (dash.cloudflare.com). Agents normally have **no** direct access: they work through git pushes, `wrangler --dry-run` and logs the owner pastes. The Cloudflare MCP server needs a one-time browser sign-in (`/mcp`). |
| Claude artifact | Single-file copy of the game | Owner's claude.ai account; publish with the Artifact tool to the existing URL. |
| Google Search Console / Bing | Search listing for careercrash.org | Owner's accounts (see WORKFLOW.md settings checklist). |

No credentials are stored in the repo, and none are needed for normal work:
pushing to the right branch is the deploy.

## 4. Infrastructure

All on Cloudflare, one zone `careercrash.org`:

| Worker | Host | Config | Storage | Deployed by |
|---|---|---|---|---|
| `career-crash` (static site + www→apex redirect) | careercrash.org, www.careercrash.org | `career-crash/wrangler.jsonc`, script `apps/client/src/site-worker.ts` | static assets (`apps/client/dist-web`) | **Cloudflare Workers Builds** from `prod` (root dir `career-crash`, build `pnpm build:web`, deploy `npx wrangler deploy`). Other branches get private preview builds. |
| `career-crash-markets` (Crypto Bros feed) | feed.careercrash.org | `apps/markets/wrangler.toml` | KV `career-crash-feed`, hourly crons | GitHub Actions `career-crash-markets.yml` on `prod` |
| `career-crash-votes` (Incident likes) | vote.careercrash.org | `apps/votes/wrangler.toml` | SQLite Durable Objects `HourTally`, `VoteKeys` | GitHub Actions `career-crash-votes.yml` on `prod` |
| `career-crash-api` (online game) | api.careercrash.org | `apps/worker/wrangler.toml` (pass `-c wrangler.toml`) | D1 `career-crash` (id still a placeholder) | GitHub Actions `career-crash-api.yml` on `prod`; **skips itself** until the D1 id is real |

CI for everything: `.github/workflows/career-crash.yml` (content, lint,
typecheck, tests, goldens, balance smoke, client build). It does not deploy.

Kill switch for likes: `LIKES_OPEN = "0"` in `apps/votes/wrangler.toml` (or as
a Worker variable in the dashboard).

## 5. Branches

| Branch | Role |
|---|---|
| `prod` | Live. Every push deploys careercrash.org in about 1–3 minutes (and the workers, when their code changed). |
| `dev` | Integration; work lands here. Currently equal to `prod` (`72e1932`, 14 Oct 2026). |
| `ccr-…`, `claude/…` | One per session/feature, branched from `dev`. |
| `main` | Unreal/Codex tooling only. Never deploy from it. |

Branches with unmerged work (as of 23 Oct 2026):

| Branch | Ahead of `dev` | What |
|---|---|---|
| `claude/gifted-dirac-ts9syc` | 4 | Doc 13 "wardrobe and art style" (own face, unlockable outfits, "VGA caricature" look) and a style-tile brief, round 2 |
| `claude/parking-warden-game-3eucn3` | 3 | Fine Print, the parking-warden game |
| `ccr-cb65c9d3-ha0iml` | 1 | Quieter speech bubbles on phones |
| `ccr-0ed8c867-87djp3` | 1 | Routing notes on the game branch, art to-do refresh (likely superseded) |

All other remote branches are fully merged into `dev`.

## 6. Day-to-day loop

```bash
pnpm check                       # before every commit
pnpm golden:update               # after any content (JSON) change; also bump SIM_VERSION if sim code changed
pnpm balance --battles=400       # after balance-relevant content; put headline numbers in the commit
pnpm build:web                   # exact site careercrash.org serves → apps/client/dist-web/
npx wrangler deploy --dry-run    # validate the Cloudflare config
```

Rules that bite (full list in `AGENTS.md`):
- The sim is deterministic: integers only, seeded PRNG, no `Date`/`Math.random`/trig. ESLint enforces it.
- No gameplay numbers in TypeScript: they live in `packages/content/data/`.
- Every new content id needs a locale string in `locales/en.json`.
- For anything visual, run the dev server and take Playwright screenshots (Chromium is preinstalled in Claude cloud sessions; don't run `playwright install`). The Sandbox (`#/sandbox`) can stage almost any fight.

## 7. Releasing to production

**Only when the owner explicitly says so** ("release it", "push it to prod").
Otherwise: commit, push to your session branch, report, and ask
"Should I release this to prod?".

1. Push the work and wait for `career-crash.yml` to go green on the commit.
2. Fast-forward both branches to it: `git push origin <sha>:dev <sha>:prod`.
3. Check it's live (from `career-crash/`):
   ```bash
   pnpm build:web
   grep -o 'assets/index-[A-Za-z0-9_-]*\.js' apps/client/dist-web/index.html
   curl -s https://careercrash.org/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'   # must match (allow 1–3 min)
   ```
   Live right now: `assets/index-C27ldXw8.js`.
4. If a worker changed, check its GitHub Actions run and its host
   (`curl https://feed.careercrash.org/crypto/latest.json`, `curl https://vote.careercrash.org/config`).

**Rollback:** `git push -f origin <good-sha>:prod` (the next build redeploys
it), or Cloudflare dashboard → Workers & Pages → `career-crash` → Deployments →
roll back.

**Single-file artifact** (only when asked): `pnpm --filter @cc/client build:standalone`,
smoke-test it, then publish `apps/client/dist-standalone/career-crash.artifact.html`
to the existing artifact URL (`PIPELINES.md` §6.3). No external requests allowed
in the client: the artifact's security policy blocks them.

## 8. Health check (all answered on 23 Oct 2026)

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://careercrash.org/            # 200
curl -s -o /dev/null -w '%{http_code}\n' https://careercrash.org/news/       # 200
curl -s https://feed.careercrash.org/crypto/latest.json | head -c 200       # current hour's snapshot
curl -s https://vote.careercrash.org/config                                 # {"bits":17,...,"open":true}
```

Claude cloud sessions can `curl` the live site but their browser often can't
reach it; test UI against a local `dist-web` build instead.

## 9. Art

New art always starts as a brief for an image agent (style template:
`career-crash/art/FX_BRIEF.md`; sizes, file names, ready-to-paste prompts,
import lines). The owner uploads results as zips or images, sometimes over
several messages; if asked to wait, collect and import only on "go". The
pipeline (`PIPELINES.md` §5) slices sheets into atlases; check previews in
`career-crash/tools/art-pipeline/out/` and fix bad cuts in the sheet's
`manifest.json`. Map files to the game's names, not the zip's.

Still missing: boss faces, Docks intact/damaged obstacles, damage states for
the six original arenas (`WORKFLOW.md` → "Still needed").

## 10. Open work and decisions pending

- **Online API launch** (`PIPELINES.md` §7.1): create D1, put its id in
  `apps/worker/wrangler.toml`, set `SESSION_SECRET` on the Worker, add the rate
  limit, run `/security-review`, then switch `build:web` to `build:web:online`.
  Needs the owner's Cloudflare dashboard.
- **Doc 13 wardrobe and art style** on `claude/gifted-dirac-ts9syc`: awaiting
  owner review of the style tiles before anything is built.
- **Fine Print**: decide whether to merge, host, or park.
- **Settings checklist** in `WORKFLOW.md` (GitHub default branch `dev`, `prod`
  ruleset, Search Console, Cloudflare plugin in `.claude/settings.json`).
- **Unreal tooling** (`main`): see `README.md` and `docs/codex-tooling/`. Its MCP
  servers (`blueprint-mcp`, `ccbridge`, `ue-llm-toolkit`, `unreal-analyzer-mcp`)
  need a local Unreal Editor and fail to connect in cloud sessions; that's expected.

## 11. Tone and house style

In-game text is comedic: LinkedIn-parody feed posts, workplace slapstick, no
gore. Broken News handles real news under `docs/career-crash/10-broken-news.md`
§7 and the voice rules in `11-broken-news-cast.md` (skill:
`.claude/skills/broken-news-voice`). No cookies or tracking: storage is browser
local storage only (`#/privacy`). Sound and music are synthesised in code; there
are no audio files.
