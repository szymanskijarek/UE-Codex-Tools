# UE-Codex-Tools

Portable Codex tooling for Unreal Engine projects.

## Contents

- `.codex/config.toml` project-local Codex MCP config
- `.mcp.json` UE-oriented MCP routing config
- `Tools/blueprint-mcp/` BlueprintMCP server bundle
- `Tools/ue-llm-mcp-bridge/` UE LLM Toolkit / CCBridge HTTP MCP bridge
- `Tools/unreal-analyzer-mcp/` Unreal C++ analyzer MCP source
- `Tools/unreal/python/` small Unreal Python helper scripts
- `scripts/codex/` validation and smoke-test scripts
- `docs/codex-tooling/` setup and bridge documentation

## Quick start

1. Copy `.env.example` to `.env` and fill in local values.
2. Install Node dependencies for the bundled MCP tools.
3. Run `powershell -ExecutionPolicy Bypass -File .\\scripts\\codex\\smoke-test.ps1`.

Detailed setup is documented in `docs/codex-tooling/SETUP.md`.
