<#
.SYNOPSIS
  Copies Sales Management Application SQLite database files when the app is closed.

.DESCRIPTION
  Intended for Windows Task Scheduler (nightly / off-hours backup).
  Skips the copy if the application process is still running.

.PARAMETER DestinationRoot
  Folder where backups are stored. A subfolder per PC name is created automatically.

.PARAMETER UserDataPath
  Optional override for the Electron userData folder containing sales.db.
  When omitted, common install locations are tried.

.PARAMETER ProcessName
  Process name without .exe. Default matches the installed product.

.PARAMETER RetentionDays
  Delete backup folders older than this many days (default 30).

.EXAMPLE
  .\backup-windows.ps1 -DestinationRoot "\\fileserver\backups\sales"

.EXAMPLE
  .\backup-windows.ps1 -DestinationRoot "D:\Backups\sales" -UserDataPath "$env:APPDATA\Sales Management Application"
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string] $DestinationRoot,

  [string] $UserDataPath = "",

  [string] $ProcessName = "Sales Management Application",

  [int] $RetentionDays = 30
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param([string] $Message)
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Output "[$stamp] $Message"
}

function Resolve-UserDataPath {
  if ($UserDataPath -and (Test-Path $UserDataPath)) {
    return (Resolve-Path $UserDataPath).Path
  }

  $candidates = @(
    (Join-Path $env:APPDATA "Sales Management Application"),
    (Join-Path $env:APPDATA "sales-electron")
  )

  foreach ($candidate in $candidates) {
    $dbPath = Join-Path $candidate "sales.db"
    if (Test-Path $dbPath) {
      return $candidate
    }
  }

  throw "Could not find sales.db. Pass -UserDataPath explicitly."
}

if (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) {
  Write-Log "Process '$ProcessName' is running. Skipping backup."
  exit 1
}

$userData = Resolve-UserDataPath
$dbFile = Join-Path $userData "sales.db"
if (-not (Test-Path $dbFile)) {
  throw "Database file not found: $dbFile"
}

$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$machine = $env:COMPUTERNAME
$dest = Join-Path $DestinationRoot $machine
$runFolder = Join-Path $dest "sales-backup-$timestamp"

New-Item -ItemType Directory -Force -Path $runFolder | Out-Null

$patterns = @("sales.db", "sales.db-wal", "sales.db-shm")
$copied = 0
foreach ($pattern in $patterns) {
  $source = Join-Path $userData $pattern
  if (Test-Path $source) {
    Copy-Item -Path $source -Destination $runFolder -Force
    $copied += 1
  }
}

if ($copied -eq 0) {
  throw "No database files were copied from $userData"
}

Write-Log "Backup saved to $runFolder ($copied file(s))."

if ($RetentionDays -gt 0 -and (Test-Path $dest)) {
  $cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $dest -Directory -Filter "sales-backup-*" |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
      Remove-Item -Path $_.FullName -Recurse -Force
      Write-Log "Removed old backup folder $($_.FullName)"
    }
}

exit 0
