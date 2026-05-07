# Unreal Bridge Layout

## Bundled bridge paths

This repo bundles:

- `Tools/ue-llm-mcp-bridge/index.js`
- `Tools/blueprint-mcp/dist/index.js`
- `Tools/unreal-analyzer-mcp/`

Source provenance:

- `Tools/ue-llm-mcp-bridge/` was exported from the active `ue-llm-toolkit` plugin bridge
- `Tools/blueprint-mcp/` was exported from the project's BlueprintMCP tool directory
- `Tools/unreal-analyzer-mcp/` was exported from the local analyzer MCP repo already present in the workspace

## BlueprintMCP

BlueprintMCP is configured from:

- `Tools/blueprint-mcp/dist/index.js`

Important behavior:

- expects `UE_PROJECT_DIR` to point at the target Unreal project
- tries to auto-detect Unreal from default Epic install locations
- uses `UE_EDITOR_CMD` when explicit local engine paths are required

## Repo-local Unreal Python helpers

Portable helper scripts were normalized into:

- `Tools/unreal/python/bridge_smoke_test.py`
- `Tools/unreal/python/introspect_bridges.py`
- `Tools/unreal/python/check_imports.py`

These are cleaned exports of small local Unreal Python workflows that were previously scattered under content or scratch tooling.

## Running the Unreal Python smoke test

Example:

```powershell
& $env:UE_EDITOR_CMD .\Extractor.uproject -run=pythonscript -script="Tools/unreal/python/bridge_smoke_test.py" -unattended -nop4 -nosplash -nullrhi
```

## Bridge endpoint assumptions

The HTTP bridge used by `ccbridge` and `ue_llm_toolkit` expects the editor plugin to expose:

- `UNREAL_MCP_URL=http://localhost:3000`

If the port changes, update `.env` and restart the editor-side plugin session.
