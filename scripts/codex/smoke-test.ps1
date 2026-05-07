[CmdletBinding()]
param(
    [switch]$CheckUnrealEndpoint
)

$scriptPath = Join-Path $PSScriptRoot "validate-toolchain.ps1"
$arguments = @("-ExecutionPolicy", "Bypass", "-File", $scriptPath)
if ($CheckUnrealEndpoint) {
    $arguments += "-CheckUnrealEndpoint"
}

& powershell @arguments
exit $LASTEXITCODE
