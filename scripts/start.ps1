param([switch]$Smoke)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { $null }
if (-not $dockerPath) {
    foreach ($candidate in @(
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
        "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe"
    )) {
        if (Test-Path -LiteralPath $candidate) { $dockerPath = $candidate; break }
    }
}
if (-not $dockerPath) {
    throw 'Docker Desktop is missing. Install it from https://docs.docker.com/desktop/setup/install/windows-install/ and start its Linux engine, then run this script again.'
}
Push-Location -LiteralPath $projectRoot
try {
    & $dockerPath info --format '{{.ServerVersion}}' 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Docker engine is not running. Open Docker Desktop and wait until Engine running.' }
    if (-not (Test-Path -LiteralPath '.env')) { & (Join-Path $PSScriptRoot 'init-env.ps1') }
    & $dockerPath compose up --build -d --wait --wait-timeout 600
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Inspect: docker compose ps; docker compose logs --tail 100' }
    $health = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 15
    if ($health.status -ne 'UP') { throw 'Gateway health check did not report UP.' }
    Write-Host 'ShopZone API is running: http://localhost:8080'
    Write-Host 'ShopZone storefront: http://localhost:3000'
    Write-Host 'Demo email inbox: http://localhost:8025'
    if ($Smoke) {
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 18+ is required for -Smoke.' }
        & node (Join-Path $PSScriptRoot 'smoke.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'API smoke tests failed. See the output above.' }
    }
} finally {
    Pop-Location
}
