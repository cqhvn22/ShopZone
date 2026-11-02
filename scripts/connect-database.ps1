param([switch]$HostFrontend)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { $null }
if (-not $dockerPath) {
    foreach ($candidate in @(
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
        "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",
        "$env:USERPROFILE\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
    )) {
        if (Test-Path -LiteralPath $candidate) { $dockerPath = $candidate; break }
    }
}
if (-not $dockerPath) { throw 'Docker Desktop is required.' }
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodePath) {
    $candidate = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    if (Test-Path -LiteralPath $candidate) { $nodePath = $candidate }
}
if (-not $nodePath) { throw 'Node.js 22 or newer is required to load development data.' }
$nodeMajor = & $nodePath -p 'process.versions.node.split(".")[0]'
if ($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }

function Set-LocalSetting([string]$Path, [string]$Name, [string]$Value) {
    $lines = if (Test-Path -LiteralPath $Path) { @(Get-Content -LiteralPath $Path) } else { @() }
    $found = $false
    $result = foreach ($line in $lines) {
        if ($line -match ('^' + [regex]::Escape($Name) + '=')) { $found = $true; "$Name=$Value" } else { $line }
    }
    if (-not $found) { $result = @($result) + "$Name=$Value" }
    [IO.File]::WriteAllLines($Path, [string[]]@($result), [Text.UTF8Encoding]::new($false))
}

Push-Location -LiteralPath $projectRoot
$previousMode = $env:SHOPZONE_DATA_MODE
$previousBackend = $env:BACKEND_URL
try {
    & $dockerPath info --format '{{.ServerVersion}}'
    if ($LASTEXITCODE -ne 0) {
        throw 'Cannot access Docker Engine. Start Docker Desktop, then run this script in your own PowerShell window (outside the Codex sandbox).'
    }
    if (-not (Test-Path -LiteralPath '.env')) { & (Join-Path $PSScriptRoot 'init-env.ps1') }
    $env:SHOPZONE_DATA_MODE = 'backend'
    $services = @('postgres', 'mongodb', 'kafka', 'mailpit', 'auth-service', 'product-service', 'order-service', 'inventory-service', 'payment-service', 'notification-service', 'api-gateway')
    if (-not $HostFrontend) { $services += 'frontend' }
    & $dockerPath compose up --build -d --wait --wait-timeout 600 @services
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Inspect: docker compose ps; docker compose logs --tail 100' }
    $health = Invoke-RestMethod -Uri 'http://localhost:8080/actuator/health' -TimeoutSec 15
    if ($health.status -ne 'UP') { throw 'Backend health did not report UP.' }
    $env:BACKEND_URL = 'http://localhost:8080'
    & $nodePath (Join-Path $PSScriptRoot 'seed-data.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Seed did not complete. Existing records and seed state were preserved; fix the reported cause and rerun.' }

    # Inspect the storage engines themselves after the API checks succeeded.
    $counts = [ordered]@{}
    foreach ($entry in @(
        @{ Database = 'auth_db'; Table = 'users' },
        @{ Database = 'order_db'; Table = 'orders' },
        @{ Database = 'inventory_db'; Table = 'stock_items' },
        @{ Database = 'payment_db'; Table = 'payments' },
        @{ Database = 'notification_db'; Table = 'notifications' }
    )) {
        $count = & $dockerPath compose exec -T postgres psql -U postgres -d $entry.Database -At -c "SELECT count(*) FROM $($entry.Table);"
        if ($LASTEXITCODE -ne 0) { throw "Database verification failed: $($entry.Database)." }
        $counts["$($entry.Database).$($entry.Table)"] = [long]($count -join '').Trim()
    }
    $mongoOutput = & $dockerPath compose exec -T mongodb mongosh product_db --quiet --eval 'JSON.stringify({products:db.products.countDocuments({}),categories:db.categories.countDocuments({})})'
    if ($LASTEXITCODE -ne 0) { throw 'MongoDB verification failed.' }
    $mongo = ($mongoOutput -join "`n") | ConvertFrom-Json
    $counts['product_db.products'] = $mongo.products
    $counts['product_db.categories'] = $mongo.categories
    if ($counts['auth_db.users'] -lt 4 -or $counts['order_db.orders'] -lt 6 -or $counts['product_db.products'] -lt 18 -or $counts['payment_db.payments'] -lt 6 -or $counts['notification_db.notifications'] -lt 6) {
        throw 'Database counts are below the expected development dataset.'
    }
    $reportPath = Join-Path $projectRoot '.seed-report.json'
    $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
    $report | Add-Member -NotePropertyName databaseCounts -NotePropertyValue $counts -Force
    [IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json -Depth 15), [Text.UTF8Encoding]::new($false))
    Set-LocalSetting (Join-Path $projectRoot '.env') 'SHOPZONE_DATA_MODE' 'backend'
    if ($HostFrontend) {
        Set-LocalSetting (Join-Path $projectRoot 'frontend\.env.local') 'SHOPZONE_DATA_MODE' 'backend'
        Set-LocalSetting (Join-Path $projectRoot 'frontend\.env.local') 'BACKEND_URL' 'http://localhost:8080'
    }
    $counts.GetEnumerator() | Format-Table -AutoSize
    Write-Host 'Database connection and persisted development data verified.'
    Write-Host 'Storefront: http://localhost:3000 | API: http://localhost:8080 | Mailpit: http://localhost:8025'
    Write-Host 'Administrator: .env | Development customer credentials: .seed-state.json'
    if ($HostFrontend) { Write-Host 'If the existing frontend was started in demo mode, restart its Node process once.' }
} finally {
    $env:SHOPZONE_DATA_MODE = $previousMode
    $env:BACKEND_URL = $previousBackend
    Pop-Location
}
