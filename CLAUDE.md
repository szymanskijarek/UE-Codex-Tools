# Start here: routing notes for agents

This repo holds two things. Work out which one the request is about before
doing anything else.

| Request mentions… | Project | Where it lives |
|---|---|---|
| Career Crash, careercrash.org, "the game", fights, careers, arenas, gatecrashers, art sheets, prod, a release | **Career Crash** (browser auto-brawler) | `career-crash/` on the **`dev`** branch. **Not on `main`.** |
| Unreal, UE, Blueprints, MCP bridge, Codex tooling | Unreal/Codex tooling | this branch (`main`), see `README.md` |

**If in doubt, it's Career Crash.** Almost all work in this repo is on the game.

## Repo index: read this before any other doc

`INDEX.md` lives on `dev`: read it with `git show origin/dev:INDEX.md`
(after `git fetch origin dev`). It maps every project, doc section, code area
and art brief. When asked to "read the docs", read the index, then open only
the sections the task needs. The rule for keeping it current is in `dev`'s
`CLAUDE.md`.

## Career Crash: first steps in a new session

1. `main` (where sessions start) does **not** contain the game. Get it:
   ```bash
   git fetch origin dev prod
   git checkout -B <your-session-branch> origin/dev   # work branches start from dev
   cd career-crash && pnpm install
   ```
   Already have a session branch with unmerged work? Rebase it onto `origin/dev`
   instead of resetting it.
2. Read, in this order (all in `career-crash/`):
   - `AGENTS.md`: package map, standing rules (determinism, goldens, no
     gameplay numbers in TypeScript), commands.
   - `WORKFLOW.md`: branches, how to release and check a release, art intake.
   - `PIPELINES.md`: exact commands for every build and art-pipeline step.
   - Design docs: `docs/career-crash/` (00–07: GDD, tech spec, combat, economy,
     roadmap, summons, personnel files, gatecrashers).
3. Before every commit: `pnpm check` must pass (content build, lint, typecheck, tests).

## How this owner likes to work

- **Releases only when asked.** Finish the work, commit, push to your session
  branch, report what changed, then ask "Should I release this to prod?". Only on
  an explicit yes ("push it to prod", "release it"):
  1. Wait for CI (`.github/workflows/career-crash.yml`) to go green on the commit.
  2. Fast-forward both branches: `git push origin <sha>:dev <sha>:prod`.
  3. Confirm it's live: the `assets/index-*.js` name in a local `pnpm build:web`
     (`apps/client/dist-web/index.html`) must match `curl -s https://careercrash.org/`.
     Cloudflare deploys `prod` in about 1–3 minutes.
- **Don't republish the Claude artifact** (single-file copy of the game) unless asked.
- **Show, don't describe.** For anything visual, run the dev server
  (`pnpm dev:client`, port 5173) and take Playwright screenshots (Chromium is
  preinstalled); send them with the report. The Sandbox (`#/sandbox`) can stage
  almost any fight, including a chosen gatecrasher set.
- **Art arrives as uploads** (zips or images), sometimes in several messages. If
  asked to wait, collect them and only import on "go". Map files to the game's own
  names (not the zip's), check the slicer previews in `tools/art-pipeline/out/`,
  and fix merged or mislabelled parts in the sheet manifest. Briefs for the image
  agent live next to the art (`career-crash/art/*.md`).
- **Image briefs** are welcome whenever new visuals are needed: write them in the
  style of `career-crash/art/FX_BRIEF.md` (sizes, file names, ready-to-paste
  prompts, import lines).
- Keep the tone of in-game text comedic: LinkedIn-parody feed posts,
  workplace slapstick, no gore.

## Quick facts

| | |
|---|---|
| Live site | https://careercrash.org (Cloudflare Worker `career-crash`, deployed from `prod`) |
| Branches | `prod` = live, `dev` = integration, session branches `ccr-…` / `claude/…` from `dev`, `main` = Unreal tooling only |
| Stack | pnpm monorepo: Preact + PixiJS client, deterministic TypeScript sim, JSON content, sharp art pipeline |
| Sound and music | synthesised in code (`apps/client/src/replay/audio.ts`, `music.ts`), no audio files |
| Storage | browser local storage only, no cookies or tracking (`#/privacy`) |
