# Uploads the bot (and its index and .env) to a Linux VM and installs the service.
# The token is sent only over SSH as a file copy, never printed or archived.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$VmHost,
    [string]$VmUser = "ubuntu",
    [int]$Port = 22,
    [string]$KeyPath = (Join-Path $PSScriptRoot "..\build\oracle-vm-key"),
    [string]$SourceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$RemoteDir = "telegram-file-bot",
    [switch]$SkipDatabase
)

$ErrorActionPreference = "Stop"

function Fail([string]$Message) { throw $Message }

foreach ($tool in @("ssh", "scp")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Fail "$tool was not found. Install the Windows OpenSSH Client (Settings > Apps > Optional features)."
    }
}

$SourceDir = (Resolve-Path -LiteralPath $SourceDir).Path
if (-not (Test-Path -LiteralPath $KeyPath)) {
    Fail "SSH key not found at $KeyPath. Create one with: ssh-keygen -t ed25519 -f build\oracle-vm-key"
}
$KeyPath = (Resolve-Path -LiteralPath $KeyPath).Path

foreach ($name in @("bot.py", "config.py", "database.py", "requirements.txt", ".env")) {
    if (-not (Test-Path -LiteralPath (Join-Path $SourceDir $name))) {
        Fail "$name is missing from $SourceDir"
    }
}
$installScript = Join-Path $SourceDir "deploy\install.sh"
if (-not (Test-Path -LiteralPath $installScript)) { Fail "deploy\install.sh is missing from $SourceDir" }

$envFile = Join-Path $SourceDir ".env"
$envLines = Get-Content -LiteralPath $envFile
if (-not ($envLines -match '^\s*BOT_TOKEN\s*=\s*.+')) { Fail ".env has no BOT_TOKEN." }
if (-not ($envLines -match '^\s*OWNER_ID\s*=\s*[0-9]+')) { Fail ".env has no numeric OWNER_ID." }

$dbFile = Join-Path $SourceDir "data\files.db"

# OpenSSH on Windows refuses keys other users can read.
& icacls.exe $KeyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Warning "Could not tighten permissions on $KeyPath; SSH may refuse the key." }

$remote = "$VmUser@$VmHost"
$sshOptions = @(
    "-p", "$Port",
    "-i", $KeyPath,
    "-o", "BatchMode=yes",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "ConnectTimeout=20",
    "-o", "ServerAliveInterval=30"
)
$scpOptions = @("-P", "$Port", "-i", $KeyPath) + ($sshOptions | Select-Object -Skip 4)

Write-Host "Checking SSH access to $VmHost..." -ForegroundColor Cyan
& ssh @sshOptions $remote "echo connected" | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fail "Could not sign in to $remote. Check the IP, the key, and that port $Port is open."
}

Write-Host ""
Write-Host "The storage bot runs only on this VM; the Explorer no longer starts it." -ForegroundColor Yellow
Write-Host ""

& ssh @sshOptions $remote "mkdir -p '$RemoteDir/deploy' '$RemoteDir/data' && chmod 700 '$RemoteDir/data'"
if ($LASTEXITCODE -ne 0) { Fail "Could not create $RemoteDir on the VM." }

foreach ($name in @("bot.py", "config.py", "database.py", "requirements.txt")) {
    Write-Host "Uploading $name"
    & scp @scpOptions (Join-Path $SourceDir $name) "${remote}:$RemoteDir/"
    if ($LASTEXITCODE -ne 0) { Fail "Upload failed for $name." }
}

Write-Host "Uploading deploy/install.sh"
& scp @scpOptions $installScript "${remote}:$RemoteDir/deploy/"
if ($LASTEXITCODE -ne 0) { Fail "Upload failed for deploy/install.sh." }

Write-Host "Uploading .env (contents are not shown)"
& scp @scpOptions $envFile "${remote}:$RemoteDir/.env"
if ($LASTEXITCODE -ne 0) { Fail "Upload failed for .env." }

if ($SkipDatabase) {
    Write-Host "Skipping data/files.db (-SkipDatabase)." -ForegroundColor Yellow
} elseif (Test-Path -LiteralPath $dbFile) {
    Write-Host "Uploading data/files.db"
    & scp @scpOptions $dbFile "${remote}:$RemoteDir/data/files.db"
    if ($LASTEXITCODE -ne 0) { Fail "Upload failed for data/files.db." }
} else {
    Write-Host "No data/files.db found; the VM bot will start with an empty index." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installing the systemd service on the VM..." -ForegroundColor Cyan
& ssh @sshOptions $remote "chmod 600 '$RemoteDir/.env' && cd '$RemoteDir' && bash deploy/install.sh"
if ($LASTEXITCODE -ne 0) { Fail "The installer reported an error. See the output above." }

Write-Host ""
Write-Host "Done. The bot now runs on $VmHost and starts on boot." -ForegroundColor Green
Write-Host "Logs:  ssh -i `"$KeyPath`" $remote `"sudo journalctl -u telegram-file-bot -f`""
Write-Host "Test:  send /stats to the bot in Telegram."
Write-Host "Keep the bot off on every PC; two pollers cause Telegram's 409 Conflict."
