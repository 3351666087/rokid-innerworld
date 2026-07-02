param(
  [string]$ZipPath,
  [int]$Port = 5191,
  [string]$SmokeRoot = "D:\Downloads\RokidCache\server-release-smoke"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "output\server-release"

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Get-LatestZip {
  param([string]$Path)
  $latest = Get-ChildItem -LiteralPath $Path -Filter "innerworld-space-server-*.zip" -File -Force |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $latest) {
    throw "No server release zip found in $Path"
  }
  return $latest.FullName
}

function Get-FreePort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), 0)
  try {
    $listener.Start()
    return $listener.LocalEndpoint.Port
  } finally {
    $listener.Stop()
  }
}

function Test-PortFree {
  param([int]$PortToCheck)
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $PortToCheck)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try { $listener.Stop() } catch {}
  }
}

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  $ZipPath = Get-LatestZip -Path $releaseRoot
}
$ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path

if ($Port -le 0 -or !(Test-PortFree -PortToCheck $Port)) {
  $Port = Get-FreePort
}

New-Item -ItemType Directory -Force -Path $SmokeRoot | Out-Null
$targetName = "{0}-smoke-{1}" -f ([System.IO.Path]::GetFileNameWithoutExtension($ZipPath)), (Get-Date -Format "yyyyMMddHHmmssfff")
$target = Join-Path $SmokeRoot $targetName
New-Item -ItemType Directory -Force -Path $target | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $target -Force

$runtimePath = Join-Path $target "data\runtime_state.json"
$runtimeBefore = Test-Path -LiteralPath $runtimePath

$oldPort = $env:PORT
$oldHost = $env:HOST
$oldBase = $env:BASE_URL
$env:PORT = [string]$Port
$env:HOST = "127.0.0.1"
$env:BASE_URL = "http://127.0.0.1:$Port"
$server = $null

try {
  $server = Start-Process -FilePath "node" `
    -ArgumentList @("server\space-server\index.js") `
    -WorkingDirectory $target `
    -PassThru `
    -WindowStyle Hidden

  $health = $null
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 2
      break
    } catch {
    }
  }
  if ($null -eq $health) {
    throw "Server release did not answer /api/health on port $Port"
  }

  $readonly = & node (Join-Path $target "server\space-server\check-readonly.js")
  if ($LASTEXITCODE -ne 0) {
    throw "check-readonly failed for server release"
  }

  $rehearsal = & node (Join-Path $target "server\space-server\capture-rehearsal.js") "--reset-after"
  if ($LASTEXITCODE -ne 0) {
    throw "capture-rehearsal failed for server release"
  }

  $finalHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 2

  [pscustomobject]@{
    ok = $true
    zip = $ZipPath
    port = $Port
    runtime_before = $runtimeBefore
    runtime_after = (Test-Path -LiteralPath $runtimePath)
    initial_state = $health.mission_state
    initial_beacons = $health.beacon_count
    initial_completed = $health.completed_step_count
    readonly_ok = (($readonly -join "`n") -match '"ok": true')
    rehearsal_ok = (($rehearsal -join "`n") -match '"ok": true')
    final_state = $finalHealth.mission_state
    final_beacons = $finalHealth.beacon_count
    final_completed = $finalHealth.completed_step_count
  } | ConvertTo-Json -Depth 5
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
    $server.WaitForExit(3000) | Out-Null
  }
  $env:PORT = $oldPort
  $env:HOST = $oldHost
  $env:BASE_URL = $oldBase
  Start-Sleep -Milliseconds 500
  if (Test-Path -LiteralPath $target) {
    Assert-UnderPath -Path $target -RootPath $SmokeRoot
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}
