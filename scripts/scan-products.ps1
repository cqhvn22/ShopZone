param(
    [ValidateRange(1,20)][int]$Limit = 20,
    [switch]$Preview,
    [string]$UrlsFile
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22+ is required.' }
if ($UrlsFile) { $UrlsFile = (Resolve-Path -LiteralPath $UrlsFile).Path }
$reportDirectory = Join-Path $root 'reports'
New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
$report = Join-Path $reportDirectory ('scan-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '.json')
$scanArguments = @((Join-Path $PSScriptRoot 'import-tgdd.mjs'), '--limit', "$Limit", '--report', $report)
if (-not $Preview) { $scanArguments += '--apply' }
if ($UrlsFile) { $scanArguments += @('--urls-file', $UrlsFile) }
Write-Host $(if ($Preview) { 'Preview only: database will not be changed.' } else { 'Scanning TGDD and importing products into the ShopZone database.' })
& $nodePath @scanArguments
if ($LASTEXITCODE -ne 0) { throw 'Scan failed. Check the error above. Existing data was not reset; rerun after fixing the cause.' }
Write-Host "Completed. Report: $report"
