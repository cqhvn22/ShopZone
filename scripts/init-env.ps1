param([switch]$Force)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
if ((Test-Path -LiteralPath $envPath) -and -not $Force) { throw '.env already exists. Keep it, or explicitly use -Force to regenerate secrets.' }
function New-Secret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$content = @(
    "JWT_SECRET=$(New-Secret)"
    "PAYMENT_CALLBACK_SECRET=$(New-Secret)"
    "POSTGRES_PASSWORD=$(New-Secret)"
    "DB_PASSWORD=$(New-Secret)"
    'ADMIN_EMAIL=admin@shopzone.local'
    "ADMIN_PASSWORD=$(New-Secret)"
    'CORS_ORIGINS=http://localhost:5173'
) -join [Environment]::NewLine
[IO.File]::WriteAllText($envPath, $content + [Environment]::NewLine, (New-Object Text.UTF8Encoding $false))
Write-Host 'Created .env with random secrets. Administrator credentials are stored in that file.'
