param(
  [string]$BaseUrl = "http://localhost:5177",
  [int]$IntervalMinutes = 15,
  [int]$Iterations = 0,
  [switch]$RunOnce,
  [switch]$ApplySafeCleanup,
  [int]$CleanupEveryIterations = 4,
  [int]$WarnFreeGB = 25,
  [int]$StopFreeGB = 8,
  [int]$TempOlderThanHours = 6,
  [int]$KeepLogCount = 200,
  [int]$KeepSummaryLines = 1000,
  [string]$DCacheRoot = "D:\Downloads\RokidCache"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $root "output\ops-monitor"
$logRoot = Join-Path $outputRoot "logs"
$summaryPath = Join-Path $outputRoot "ops-monitor-summary.md"

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Get-CFreeGB {
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
  if (!$disk) { return $null }
  return Format-GB ([int64]$disk.FreeSpace)
}

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Invoke-LoggedScript {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safeName = ($Name -replace '[^A-Za-z0-9_.-]', '-')
  $logPath = Join-Path $logRoot "$stamp-$safeName.log"
  $processArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath) + $Arguments

  $started = Get-Date
  $output = & powershell @processArgs 2>&1
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  $finished = Get-Date
  $text = ($output | ForEach-Object { "$_" }) -join "`r`n"
  $text | Set-Content -Encoding UTF8 -Path $logPath

  return [pscustomobject]@{
    name = $Name
    ok = ($exitCode -eq 0)
    exit_code = $exitCode
    started_at = $started.ToString("o")
    finished_at = $finished.ToString("o")
    duration_seconds = [math]::Round(($finished - $started).TotalSeconds, 3)
    log_path = $logPath
  }
}

function Remove-OldLogs {
  param([int]$Keep)
  if ($Keep -lt 1) { return }
  $oldLogs = Get-ChildItem -LiteralPath $logRoot -File -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep
  foreach ($log in $oldLogs) {
    Assert-UnderPath -Path $log.FullName -RootPath $logRoot
    Remove-Item -LiteralPath $log.FullName -Force
  }
}

function Trim-Summary {
  param([string]$Path, [int]$Keep)
  if ($Keep -lt 1 -or !(Test-Path -LiteralPath $Path)) { return }
  $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8)
  if ($lines.Count -le ($Keep + 1)) { return }
  $header = $lines[0]
  $tail = @($lines | Select-Object -Skip 1 | Select-Object -Last $Keep)
  @($header) + $tail | Set-Content -Encoding UTF8 -Path $Path
}

function Test-UnityHubActive {
  $processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -match '^(Unity Hub|UnityHub|Unity Hub Helper|UnityDownloadAssistant|UnityInstaller)$'
  })
  return $processes.Count -gt 0
}

function New-SkippedCommand {
  param([string]$Name, [string]$Reason)
  $now = (Get-Date).ToString("o")
  return [pscustomobject]@{
    name = $Name
    ok = $true
    exit_code = 0
    started_at = $now
    finished_at = $now
    duration_seconds = 0
    log_path = "skipped: $Reason"
  }
}

function Write-LatestMarkdown {
  param([pscustomobject]$Result, [string]$Path)

  $commandLines = foreach ($command in @($Result.commands)) {
    "- $($command.name): ok=$($command.ok), exit=$($command.exit_code), log=$($command.log_path)"
  }
  if (!$commandLines) { $commandLines = @("- None") }

  $cleanupReason = if ($Result.cleanup_reason.Count -gt 0) {
    $Result.cleanup_reason -join "; "
  } else {
    "none"
  }

  $md = @"
# Rokid Ops Monitor

- Generated: $($Result.finished_at)
- OK: $($Result.ok)
- Base URL: $($Result.base_url)
- Iteration: $($Result.iteration)
- C free before: $($Result.c_free_gb_before) GB
- C free after: $($Result.c_free_gb_after) GB
- Cleanup applied: $($Result.cleanup_applied)
- Cleanup reason: $cleanupReason

## Commands

$($commandLines -join "`n")
"@
  $md | Set-Content -Encoding UTF8 -Path $Path
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
if (!(Test-Path -LiteralPath $summaryPath)) {
  "# Rokid Ops Monitor Summary`n" | Set-Content -Encoding UTF8 -Path $summaryPath
}

$envDoctorScript = Join-Path $PSScriptRoot "env-doctor.ps1"
$tempCleanScript = Join-Path $PSScriptRoot "temp-clean.ps1"
$cacheCleanScript = Join-Path $PSScriptRoot "cache-clean.ps1"
$iteration = 0

while ($true) {
  $iteration += 1
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $startedAt = Get-Date
  $commands = @()
  $cleanupReason = @()
  $cleanupApplied = $false
  $cFreeBefore = Get-CFreeGB

  $commands += Invoke-LoggedScript `
    -Name "env-doctor" `
    -ScriptPath $envDoctorScript `
    -Arguments @("-BaseUrl", $BaseUrl, "-WarnFreeGB", "$WarnFreeGB", "-StopFreeGB", "$StopFreeGB", "-DCacheRoot", $DCacheRoot)

  $commands += Invoke-LoggedScript `
    -Name "cache-temp-report" `
    -ScriptPath $tempCleanScript `
    -Arguments @("-OlderThanHours", "$TempOlderThanHours")

  $commands += Invoke-LoggedScript `
    -Name "cache-report" `
    -ScriptPath $cacheCleanScript `
    -Arguments @("-DCacheRoot", $DCacheRoot)

  if ($ApplySafeCleanup) {
    if ($null -ne $cFreeBefore -and $cFreeBefore -lt $WarnFreeGB) {
      $cleanupReason += "C drive below $WarnFreeGB GB warning threshold"
    }
    if ($CleanupEveryIterations -gt 0 -and ($iteration % $CleanupEveryIterations -eq 0)) {
      $cleanupReason += "scheduled cleanup interval $CleanupEveryIterations"
    }
  }

  if ($cleanupReason.Count -gt 0) {
    $cleanupApplied = $true
    $commands += Invoke-LoggedScript `
      -Name "cache-temp-clean" `
      -ScriptPath $tempCleanScript `
      -Arguments @("-Apply", "-OlderThanHours", "$TempOlderThanHours")

    if (Test-UnityHubActive) {
      $skipReason = "Unity Hub is active; skip cache-clean apply to avoid moving live downloads"
      $cleanupReason += $skipReason
      $commands += New-SkippedCommand -Name "cache-clean" -Reason $skipReason
    } else {
      $commands += Invoke-LoggedScript `
        -Name "cache-clean" `
        -ScriptPath $cacheCleanScript `
        -Arguments @("-Apply", "-DCacheRoot", $DCacheRoot)
    }

    $commands += Invoke-LoggedScript `
      -Name "cache-report-post-clean" `
      -ScriptPath $cacheCleanScript `
      -Arguments @("-DCacheRoot", $DCacheRoot)
  }

  $cFreeAfter = Get-CFreeGB
  $finishedAt = Get-Date
  $commandFailures = @($commands | Where-Object { !$_.ok })
  $diskCritical = ($null -ne $cFreeAfter -and $cFreeAfter -lt $StopFreeGB)

  $result = [pscustomobject]@{
    ok = ($commandFailures.Count -eq 0 -and !$diskCritical)
    generated_at = $finishedAt.ToString("o")
    started_at = $startedAt.ToString("o")
    finished_at = $finishedAt.ToString("o")
    duration_seconds = [math]::Round(($finishedAt - $startedAt).TotalSeconds, 3)
    root = $root
    base_url = $BaseUrl
    iteration = $iteration
    run_once = [bool]$RunOnce
    apply_safe_cleanup = [bool]$ApplySafeCleanup
    cleanup_every_iterations = $CleanupEveryIterations
    cleanup_applied = $cleanupApplied
    cleanup_reason = @($cleanupReason)
    warn_free_gb = $WarnFreeGB
    stop_free_gb = $StopFreeGB
    c_free_gb_before = $cFreeBefore
    c_free_gb_after = $cFreeAfter
    disk_critical = $diskCritical
    commands = @($commands)
  }

  $jsonPath = Join-Path $outputRoot "ops-monitor-$stamp.json"
  $latestJson = Join-Path $outputRoot "ops-monitor-latest.json"
  $latestMd = Join-Path $outputRoot "ops-monitor-latest.md"
  $result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path $jsonPath
  Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force
  Write-LatestMarkdown -Result $result -Path $latestMd

  $summaryLine = "- $($result.finished_at) | ok=$($result.ok) | iter=$iteration | C=$cFreeAfter GB | cleanup=$cleanupApplied | latest=$latestJson"
  Add-Content -Encoding UTF8 -Path $summaryPath -Value $summaryLine
  Trim-Summary -Path $summaryPath -Keep $KeepSummaryLines
  Remove-OldLogs -Keep $KeepLogCount

  Write-Output "Ops monitor iteration $iteration complete. OK: $($result.ok). C free: $cFreeAfter GB. Cleanup applied: $cleanupApplied."
  Write-Output "Latest: $latestMd"

  if ($RunOnce) { break }
  if ($Iterations -gt 0 -and $iteration -ge $Iterations) { break }

  $sleepSeconds = [math]::Max(1, $IntervalMinutes * 60)
  Start-Sleep -Seconds $sleepSeconds
}

if ($RunOnce -and $result -and !$result.ok) {
  exit 1
}
