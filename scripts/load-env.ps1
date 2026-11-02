# Dot-source before Maven/java: . ./scripts/load-env.ps1
$projectRoot = Split-Path -Parent $PSScriptRoot
Get-Content -LiteralPath (Join-Path $projectRoot '.env') | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
