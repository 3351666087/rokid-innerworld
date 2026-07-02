param(
  [string]$DatabasePath = "",
  [string]$BackupRoot = "",
  [switch]$List,
  [switch]$VerifyLatest,
  [string]$RestoreFrom = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($DatabasePath)) {
  $DatabasePath = Join-Path $projectRoot "data\innerworld.sqlite"
}
if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
  if (Test-Path -LiteralPath "D:\") {
    $BackupRoot = "D:\Downloads\RokidCache\sqlite-backups"
  } else {
    $BackupRoot = Join-Path $projectRoot "output\sqlite-backups"
  }
}

function Resolve-AbsolutePath {
  param([string]$PathValue)

  $expanded = [Environment]::ExpandEnvironmentVariables($PathValue)
  if ([System.IO.Path]::IsPathRooted($expanded)) {
    return [System.IO.Path]::GetFullPath($expanded)
  }
  return [System.IO.Path]::GetFullPath((Join-Path $projectRoot $expanded))
}

function Get-UpperSha256 {
  param([string]$PathValue)

  (Get-FileHash -Algorithm SHA256 -LiteralPath $PathValue).Hash.ToUpperInvariant()
}

function Save-Json {
  param(
    [object]$Value,
    [string]$PathValue
  )

  $json = $Value | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath $PathValue -Value $json -Encoding UTF8
}

function Save-LatestMarkdown {
  param(
    [object]$Manifest,
    [string]$PathValue
  )

  $lines = @(
    "# InnerWorld SQLite Backup",
    "",
    "- Created: $($Manifest.created_at)",
    "- Operation: $($Manifest.operation)",
    "- Database: $($Manifest.database_file)",
    "- Backup: $($Manifest.backup_file)",
    "- Size bytes: $($Manifest.size_bytes)",
    "- SHA256: $($Manifest.sha256)",
    "",
    "This is a private runtime backup. Do not commit it to GitHub or put it in release packages."
  )
  Set-Content -LiteralPath $PathValue -Value $lines -Encoding UTF8
}

function Get-LatestManifestPath {
  param([string]$RootPath)

  if (!(Test-Path -LiteralPath $RootPath)) {
    return $null
  }
  $latest = Get-ChildItem -LiteralPath $RootPath -Filter "innerworld-sqlite-*.manifest.json" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $latest) {
    return $null
  }
  return $latest.FullName
}

function New-Backup {
  param(
    [string]$SourcePath,
    [string]$RootPath,
    [string]$Prefix = "innerworld-sqlite",
    [string]$Operation = "backup"
  )

  if (!(Test-Path -LiteralPath $SourcePath)) {
    throw "SQLite database not found at $SourcePath. Start the Space Server or run npm run check:store once before backing up."
  }

  New-Item -ItemType Directory -Force -Path $RootPath | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupFile = Join-Path $RootPath "$Prefix-$stamp.sqlite"
  $tempFile = Join-Path $RootPath ".$Prefix-$stamp.$PID.tmp"
  Copy-Item -LiteralPath $SourcePath -Destination $tempFile -Force
  Move-Item -LiteralPath $tempFile -Destination $backupFile -Force

  $hash = Get-UpperSha256 -PathValue $backupFile
  $manifest = [pscustomobject]@{
    schema = "innerworld-sqlite-backup/v1"
    operation = $Operation
    created_at = (Get-Date).ToString("o")
    database_file = $SourcePath
    backup_file = $backupFile
    backup_root = $RootPath
    size_bytes = (Get-Item -LiteralPath $backupFile).Length
    sha256 = $hash
    private_runtime_backup = $true
    git_policy = "Do not commit this SQLite backup, manifest, or restored runtime database."
  }

  $manifestPath = [System.IO.Path]::ChangeExtension($backupFile, ".manifest.json")
  Save-Json -Value $manifest -PathValue $manifestPath
  Save-LatestMarkdown -Manifest $manifest -PathValue (Join-Path $RootPath "sqlite-backup-latest.md")
  return $manifest
}

function Show-BackupList {
  param([string]$RootPath)

  if (!(Test-Path -LiteralPath $RootPath)) {
    Write-Output "[]"
    return
  }

  $items = Get-ChildItem -LiteralPath $RootPath -Filter "innerworld-sqlite-*.manifest.json" -File |
    Sort-Object LastWriteTime -Descending |
    ForEach-Object {
      $manifest = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json
      [pscustomobject]@{
        created_at = $manifest.created_at
        backup_file = $manifest.backup_file
        size_bytes = $manifest.size_bytes
        sha256 = $manifest.sha256
        manifest_file = $_.FullName
      }
    }
  Write-Output ($items | ConvertTo-Json -Depth 6)
}

function Test-LatestBackup {
  param([string]$RootPath)

  $manifestPath = Get-LatestManifestPath -RootPath $RootPath
  if ([string]::IsNullOrWhiteSpace($manifestPath)) {
    throw "No SQLite backup manifest found in $RootPath"
  }

  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if (!(Test-Path -LiteralPath $manifest.backup_file)) {
    throw "Backup file missing: $($manifest.backup_file)"
  }
  $actualHash = Get-UpperSha256 -PathValue $manifest.backup_file
  if ($actualHash -ne $manifest.sha256) {
    throw "Backup hash mismatch. Expected $($manifest.sha256), got $actualHash"
  }
  Write-Output ([pscustomobject]@{
    ok = $true
    manifest_file = $manifestPath
    backup_file = $manifest.backup_file
    sha256 = $actualHash
    size_bytes = (Get-Item -LiteralPath $manifest.backup_file).Length
  } | ConvertTo-Json -Depth 6)
}

function Restore-Backup {
  param(
    [string]$SourceBackup,
    [string]$TargetDatabase,
    [string]$RootPath
  )

  if (!$Force) {
    throw "Restore requires -Force. The script will first create a before-restore backup of the current database."
  }
  if (!(Test-Path -LiteralPath $SourceBackup)) {
    throw "Restore source not found: $SourceBackup"
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $TargetDatabase) | Out-Null
  $beforeRestore = $null
  if (Test-Path -LiteralPath $TargetDatabase) {
    $beforeRestore = New-Backup -SourcePath $TargetDatabase -RootPath $RootPath -Prefix "innerworld-before-restore" -Operation "before_restore"
  }

  $sourceHash = Get-UpperSha256 -PathValue $SourceBackup
  $tempRestore = Join-Path (Split-Path -Parent $TargetDatabase) ".innerworld-restore-$PID.tmp"
  Copy-Item -LiteralPath $SourceBackup -Destination $tempRestore -Force
  Move-Item -LiteralPath $tempRestore -Destination $TargetDatabase -Force
  $restoredHash = Get-UpperSha256 -PathValue $TargetDatabase
  if ($restoredHash -ne $sourceHash) {
    throw "Restored database hash mismatch. Expected $sourceHash, got $restoredHash"
  }

  Write-Output ([pscustomobject]@{
    ok = $true
    operation = "restore"
    database_file = $TargetDatabase
    restored_from = $SourceBackup
    sha256 = $restoredHash
    before_restore_backup = $beforeRestore
  } | ConvertTo-Json -Depth 8)
}

$databaseFile = Resolve-AbsolutePath -PathValue $DatabasePath
$backupRootPath = Resolve-AbsolutePath -PathValue $BackupRoot

if ($List) {
  Show-BackupList -RootPath $backupRootPath
  exit 0
}

if ($VerifyLatest) {
  Test-LatestBackup -RootPath $backupRootPath
  exit 0
}

if (![string]::IsNullOrWhiteSpace($RestoreFrom)) {
  Restore-Backup -SourceBackup (Resolve-AbsolutePath -PathValue $RestoreFrom) -TargetDatabase $databaseFile -RootPath $backupRootPath
  exit 0
}

$result = New-Backup -SourcePath $databaseFile -RootPath $backupRootPath
Write-Output ($result | ConvertTo-Json -Depth 8)
