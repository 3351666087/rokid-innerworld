param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $root "output\ops-monitor"
$processPath = Join-Path $outputRoot "ops-monitor-process.json"
$latestPath = Join-Path $outputRoot "ops-monitor-latest.json"

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

$processInfo = $null
if (Test-Path -LiteralPath $processPath) {
  $processInfo = Get-Content -LiteralPath $processPath -Encoding UTF8 -Raw | ConvertFrom-Json
}

$latest = $null
if (Test-Path -LiteralPath $latestPath) {
  $latest = Get-Content -LiteralPath $latestPath -Encoding UTF8 -Raw | ConvertFrom-Json
}

$pidValue = if ($processInfo -and $processInfo.process_id) { [int]$processInfo.process_id } else { $null }
$process = if ($pidValue) { Get-Process -Id $pidValue -ErrorAction SilentlyContinue } else { $null }
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue

$status = [pscustomobject]@{
  ok = ($null -ne $latest -and $latest.ok -eq $true)
  generated_at = (Get-Date).ToString("o")
  root = $root
  monitor_process = [pscustomobject]@{
    configured = ($null -ne $processInfo)
    process_id = $pidValue
    running = ($null -ne $process)
    started_at = if ($processInfo) { $processInfo.started_at } else { $null }
    command = if ($processInfo) { $processInfo.command } else { $null }
    stdout = if ($processInfo) { $processInfo.stdout } else { $null }
    stderr = if ($processInfo) { $processInfo.stderr } else { $null }
  }
  latest_iteration = if ($latest) { $latest.iteration } else { $null }
  latest_generated_at = if ($latest) { $latest.generated_at } else { $null }
  latest_ok = if ($latest) { $latest.ok } else { $false }
  latest_cleanup_applied = if ($latest) { $latest.cleanup_applied } else { $null }
  latest_c_free_gb_after = if ($latest) { $latest.c_free_gb_after } else { $null }
  current_c_free_gb = if ($disk) { Format-GB ([int64]$disk.FreeSpace) } else { $null }
  latest_path = $latestPath
  process_path = $processPath
}

if ($Json) {
  $status | ConvertTo-Json -Depth 8
  exit 0
}

Write-Output "Ops monitor status:"
Write-Output "  Process configured: $($status.monitor_process.configured)"
Write-Output "  Process running: $($status.monitor_process.running)"
Write-Output "  Process ID: $($status.monitor_process.process_id)"
Write-Output "  Latest OK: $($status.latest_ok)"
Write-Output "  Latest generated: $($status.latest_generated_at)"
Write-Output "  Latest cleanup applied: $($status.latest_cleanup_applied)"
Write-Output "  Latest C free after: $($status.latest_c_free_gb_after) GB"
Write-Output "  Current C free: $($status.current_c_free_gb) GB"
Write-Output "  Latest JSON: $latestPath"
