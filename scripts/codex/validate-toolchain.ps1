[CmdletBinding()]
param(
    [switch]$CheckUnrealEndpoint
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Test-CommandExists {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-Result {
    param(
        [string]$Label,
        [bool]$Passed,
        [string]$Detail
    )

    $status = if ($Passed) { "PASS" } else { "FAIL" }
    Write-Output ("[{0}] {1} - {2}" -f $status, $Label, $Detail)
}

$failed = $false

$requiredCommands = @("node", "npm", "python", "powershell")
foreach ($commandName in $requiredCommands) {
    $ok = Test-CommandExists -Name $commandName
    if (-not $ok) { $failed = $true }
    Write-Result -Label "command:$commandName" -Passed $ok -Detail ($(if ($ok) { "available" } else { "not found" }))
}

$paths = @(
    ".codex/config.toml",
    ".mcp.json",
    "Tools/blueprint-mcp/dist/index.js",
    "Tools/ue-llm-mcp-bridge/index.js",
    "Tools/unreal-analyzer-mcp/package.json",
    "Tools/unreal/python/bridge_smoke_test.py",
    "Tools/unreal/python/introspect_bridges.py",
    "Tools/unreal/python/check_imports.py"
)

foreach ($relativePath in $paths) {
    $fullPath = Join-Path $root $relativePath
    $ok = Test-Path $fullPath
    if (-not $ok) { $failed = $true }
    Write-Result -Label "path:$relativePath" -Passed $ok -Detail ($(if ($ok) { "present" } else { "missing" }))
}

$optionalPaths = @(
    "Tools/unreal-analyzer-mcp/build/index.js"
)

foreach ($relativePath in $optionalPaths) {
    $fullPath = Join-Path $root $relativePath
    $ok = Test-Path $fullPath
    Write-Result -Label "optional:$relativePath" -Passed $ok -Detail ($(if ($ok) { "present" } else { "missing" }))
}

$envVars = @("UE_PROJECT_DIR", "UE_EDITOR_CMD", "UNREAL_MCP_URL", "P4PORT", "P4USER", "P4CLIENT")
foreach ($name in $envVars) {
    $present = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "Process"))
    if (-not $present) {
        $present = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "User"))
    }
    if (-not $present) { $failed = $true }
    Write-Result -Label "env:$name" -Passed $present -Detail ($(if ($present) { "set" } else { "missing" }))
}

$pythonCheck = Join-Path $root "Tools/unreal/python/check_imports.py"
$pythonOutput = & python $pythonCheck 2>&1
$pythonOk = $LASTEXITCODE -eq 0
if (-not $pythonOk) { $failed = $true }
Write-Result -Label "python:check_imports" -Passed $pythonOk -Detail "completed"
$pythonOutput | ForEach-Object { Write-Output "  $_" }

if ($CheckUnrealEndpoint) {
    $endpoint = [Environment]::GetEnvironmentVariable("UNREAL_MCP_URL", "Process")
    if ([string]::IsNullOrWhiteSpace($endpoint)) {
        $endpoint = [Environment]::GetEnvironmentVariable("UNREAL_MCP_URL", "User")
    }
    if ([string]::IsNullOrWhiteSpace($endpoint)) {
        $endpoint = "http://localhost:3000"
    }
    $endpoint = $endpoint.TrimEnd("/")
    $statusUrl = "$endpoint/mcp/status"

    try {
        $response = Invoke-WebRequest -Uri $statusUrl -UseBasicParsing -TimeoutSec 5
        Write-Result -Label "unreal:endpoint" -Passed $true -Detail "reachable"
    } catch {
        $failed = $true
        Write-Result -Label "unreal:endpoint" -Passed $false -Detail "not reachable"
    }
}

if ($failed) {
    exit 1
}
