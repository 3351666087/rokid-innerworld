param(
  [int]$Port = 5177,
  [string]$LanIp = "",
  [switch]$SkipUnityConfig,
  [switch]$SkipPdf,
  [switch]$SkipCacheReport,
  [switch]$RequireLan,
  [switch]$AllowUnreachableLan,
  [string]$DCacheRoot = "D:\Downloads\RokidCache"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $root "output\field-preflight"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Get-LanIPv4 {
  $configs = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object {
      $_.NetAdapter.Status -eq "Up" -and
      $_.IPv4DefaultGateway -and
      $_.IPv4Address
    })

  foreach ($config in $configs) {
    foreach ($address in @($config.IPv4Address)) {
      $ip = $address.IPAddress
      if ($ip -and $ip -notmatch '^127\.' -and $ip -notmatch '^169\.254\.') {
        return $ip
      }
    }
  }

  $fallback = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -and
      $_.IPAddress -notmatch '^127\.' -and
      $_.IPAddress -notmatch '^169\.254\.' -and
      $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1)

  if ($fallback.Count -gt 0) {
    return $fallback[0].IPAddress
  }

  throw "Could not detect a LAN IPv4 address. Pass -LanIp <ip> explicitly."
}

function Test-JsonEndpoint {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    $body = $response.Content | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      url = $Url
      status_code = [int]$response.StatusCode
      service = $body.service
      demo_ready = $body.demo_ready
      mission_state = $body.mission_state
      beacon_count = $body.beacon_count
      completed_step_count = $body.completed_step_count
      cache_control = $response.Headers["Cache-Control"]
      cors = $response.Headers["Access-Control-Allow-Origin"]
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      url = $Url
      status_code = $null
      service = $null
      demo_ready = $null
      mission_state = $null
      beacon_count = $null
      completed_step_count = $null
      cache_control = $null
      cors = $null
      error = $_.Exception.Message
    }
  }
}

function Write-ToolReport {
  param(
    [string]$ScriptName,
    [string]$Destination,
    [string[]]$Arguments = @()
  )
  $scriptPath = Join-Path $root "tools\$ScriptName"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments |
    Set-Content -Encoding UTF8 -Path $Destination
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

if ([string]::IsNullOrWhiteSpace($LanIp)) {
  $LanIp = Get-LanIPv4
}

$localhostUrl = "http://localhost:$Port"
$localLoopbackUrl = "http://127.0.0.1:$Port"
$lanUrl = "http://$LanIp`:$Port"
$publicUrl = "$lanUrl/"

$localHealth = Test-JsonEndpoint -Url "$localLoopbackUrl/api/health"
$lanHealth = Test-JsonEndpoint -Url "$lanUrl/api/health"

if (!$localHealth.ok) {
  throw "Local Space Server is not reachable at $localLoopbackUrl. Start it with npm run dev or npm run dev:lan first."
}

if (!$lanHealth.ok) {
  Write-Warning "LAN URL is not reachable from this machine: $lanUrl. For Rokid/phone access, run npm run dev:lan and allow the port through Windows Firewall if prompted."
  if ($RequireLan) {
    throw "LAN health check failed and -RequireLan was set."
  }
  if ((!$SkipUnityConfig -or !$SkipPdf) -and !$AllowUnreachableLan) {
    throw "LAN health check failed. Refusing to update Unity config or render LAN QR PDF for an unreachable URL. Start with npm run dev:lan, or pass -AllowUnreachableLan if you intentionally want to prepare offline assets."
  }
}

$unityConfigUpdated = $false
if (!$SkipUnityConfig) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools\set-unity-config.ps1") -BaseUrl $lanUrl
  if ($LASTEXITCODE -ne 0) {
    throw "Unity config update failed with exit code $LASTEXITCODE"
  }
  $unityConfigUpdated = $true
}

$pdfRendered = $false
if (!$SkipPdf) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools\render-field-kit-pdf.ps1") -PublicUrl $publicUrl -DCacheRoot $DCacheRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Field kit PDF render failed with exit code $LASTEXITCODE"
  }
  $pdfRendered = $true
}

$cacheReport = $null
$tempReport = $null
if (!$SkipCacheReport) {
  $cacheReport = Join-Path $outputRoot "cache-report-$stamp.txt"
  $tempReport = Join-Path $outputRoot "temp-report-$stamp.txt"
  Write-ToolReport -ScriptName "cache-clean.ps1" -Destination $cacheReport -Arguments @("-DCacheRoot", $DCacheRoot)
  Write-ToolReport -ScriptName "temp-clean.ps1" -Destination $tempReport
}

$result = [pscustomobject]@{
  ok = $true
  generated_at = (Get-Date).ToString("o")
  port = $Port
  lan_ip = $LanIp
  localhost_url = "$localhostUrl/"
  lan_url = $publicUrl
  local_health = $localHealth
  lan_health = $lanHealth
  unity_config_updated = $unityConfigUpdated
  pdf_rendered = $pdfRendered
  pdf_path = (Join-Path $root "output\pdf\rokid_innerworld_field_kit.pdf")
  cache_report = $cacheReport
  temp_report = $tempReport
  next_steps = @(
    "Run npm run dev:lan for Rokid/phone access.",
    "Open $publicUrl on devices connected to the same LAN.",
    "Use output\pdf\rokid_innerworld_field_kit.pdf for the LAN QR field kit.",
    "Run npm run evidence:rehearsal -- --reset-after before packaging."
  )
}

$jsonPath = Join-Path $outputRoot "field-preflight-$stamp.json"
$mdPath = Join-Path $outputRoot "field-preflight-$stamp.md"
$latestJson = Join-Path $outputRoot "field-preflight-latest.json"
$latestMd = Join-Path $outputRoot "field-preflight-latest.md"

$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path $jsonPath
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$lanStatus = if ($lanHealth.ok) { "reachable" } else { "not reachable" }
$md = @"
# Rokid Field Preflight

- Generated: $($result.generated_at)
- Localhost: $($result.localhost_url)
- LAN URL: $($result.lan_url)
- LAN health: $lanStatus
- Unity config updated: $unityConfigUpdated
- Field kit PDF rendered: $pdfRendered
- PDF: $($result.pdf_path)

## Commands

- npm run dev:lan
- npm run field:preflight -- -RequireLan

## Device Handoff

- Windows host: keep the Space Server running.
- Rokid/phone: open $($result.lan_url) on the same LAN.
- Big screen: open $($result.localhost_url) or run output\unity-windows\InnerWorldRokid.exe.
- QR/print kit: use output\pdf\rokid_innerworld_field_kit.pdf.

## Health

- Local API: $($localHealth.ok), state=$($localHealth.mission_state), beacons=$($localHealth.beacon_count), completed=$($localHealth.completed_step_count)
- LAN API: $($lanHealth.ok), state=$($lanHealth.mission_state), beacons=$($lanHealth.beacon_count), completed=$($lanHealth.completed_step_count)

If LAN health is false, restart with npm run dev:lan and allow Windows Firewall access for Node.js on private networks. The script refuses to update Unity config or render a LAN QR PDF for an unreachable URL unless -AllowUnreachableLan is passed.
"@
$md | Set-Content -Encoding UTF8 -Path $mdPath
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "Field preflight complete."
Write-Output "LAN URL: $publicUrl"
Write-Output "JSON: $jsonPath"
Write-Output "Markdown: $mdPath"
if (!$lanHealth.ok) {
  Write-Warning "LAN health is not reachable yet. Use npm run dev:lan for hardware/phone access."
}
