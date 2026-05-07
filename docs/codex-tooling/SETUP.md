# Codex Tooling Setup

## Scope

This repo is a portable Unreal Codex tooling pack. It carries:

- `.codex/config.toml`
- `.mcp.json`
- `Tools/blueprint-mcp/`
- `Tools/ue-llm-mcp-bridge/`
- `Tools/unreal-analyzer-mcp/`
- `Tools/unreal/python/`
- `scripts/codex/`
- `docs/codex-tooling/`

It does not include your Unreal project or user-level Codex state.

## Required software

- Codex desktop app with project-local config support
- Unreal Engine `5.7`
- Node.js `18+`
- npm `9+`
- Python `3.10+`
- PowerShell `5.1+`

## Required Python packages

Repo-local validation and helper scripts use only the Python standard library.

Unreal automation scripts that import `unreal` must be run inside Unreal's Python environment or via `UnrealEditor-Cmd.exe -run=pythonscript`.

## Required Node / npm packages

Install dependencies in these directories:

```powershell
npm install --prefix Tools\blueprint-mcp
npm install --prefix Tools\ue-llm-mcp-bridge
npm install --prefix Tools\unreal-analyzer-mcp
npm run build --prefix Tools\unreal-analyzer-mcp
```

## Environment variables

Copy `.env.example` to `.env` and fill in local values:

- `UE_PROJECT_DIR`
- `UE_EDITOR_CMD`
- `UNREAL_MCP_URL`
- `P4PORT`
- `P4USER`
- `P4CLIENT`

`UE_PROJECT_DIR` must point at the target Unreal project root when you use `BlueprintMCP` from this standalone repo.

If `UE_EDITOR_CMD` is unset, `BlueprintMCP` falls back to default Epic install paths derived from the target `.uproject` engine association when possible.

## Project-scoped Codex config

Primary Codex config lives at `.codex/config.toml`.

It intentionally contains only portable Unreal-focused MCP entries:

- `blueprint_mcp`
- `ccbridge`
- `ue_llm_toolkit`
- `unreal-analyzer-mcp`

Excluded from the project-local Codex config:

- user trust state
- marketplace/plugin cache state
- auth files
- generic non-project servers such as `chrome_devtools`

## `.mcp.json`

`.mcp.json` uses relative repo paths so UE-oriented routing rules can resolve the bundled servers without hardcoded machine paths.

Backup created before modification:

- `.mcp.json.bak-20260507-codex-export`

## How to trust and use the local config

1. Open the repo in Codex.
2. Mark the repo as trusted in your local Codex UI if prompted.
3. Keep `.codex/config.toml` in the repo root.
4. Load local settings from `.env` in the shell or environment you use to launch tools.

Example PowerShell session:

```powershell
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $name, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
```

## Smoke test

Run the non-destructive validation pass:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex\smoke-test.ps1
```

If Unreal Editor is already running with the UE LLM Toolkit HTTP bridge enabled, add:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\codex\smoke-test.ps1 -CheckUnrealEndpoint
```

## Local secret restoration

This repo does not include secrets from `%USERPROFILE%\\.codex`, local auth files, browser state, or private certificates.

Restore local-only values by:

1. Copying `.env.example` to `.env`
2. Filling in machine-specific values
3. Reloading those variables into the shell before launching validation or Codex
