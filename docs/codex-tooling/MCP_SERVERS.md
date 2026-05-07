# MCP Servers

## Exported project-local servers

| Server | Source | Command | Notes |
|---|---|---|---|
| `blueprint_mcp` | `.codex/config.toml` | `node Tools/blueprint-mcp/dist/index.js` | Requires `UE_PROJECT_DIR` and usually `UE_EDITOR_CMD`. |
| `ccbridge` | `.codex/config.toml` | `node Tools/ue-llm-mcp-bridge/index.js` | Targets the editor HTTP bridge at `UNREAL_MCP_URL`. |
| `ue_llm_toolkit` | `.codex/config.toml` | `node Tools/ue-llm-mcp-bridge/index.js` | Same bridge entrypoint, different routing intent. |
| `unreal-analyzer-mcp` | `.codex/config.toml` | `node Tools/unreal-analyzer-mcp/build/index.js` | Requires local install/build before use. |

## Project `.mcp.json`

`.mcp.json` mirrors the same portable server paths for UE-focused tool routing:

- `blueprint-mcp`
- `ccbridge`
- `ue-llm-toolkit`
- `unreal-analyzer-mcp`

## Environment assumptions

`blueprint_mcp`

- Requires `UE_PROJECT_DIR`
- Reads `UE_EDITOR_CMD` from the environment when Unreal is not in a default Epic install path
- Uses `UE_PORT` if set, otherwise defaults to `9847`

`ccbridge` / `ue_llm_toolkit`

- Require `UNREAL_MCP_URL`
- Default expected endpoint is `http://localhost:3000`

## Install / build commands

```powershell
npm install --prefix Tools\blueprint-mcp
npm install --prefix Tools\ue-llm-mcp-bridge
npm install --prefix Tools\unreal-analyzer-mcp
npm run build --prefix Tools\unreal-analyzer-mcp
```
