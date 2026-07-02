param(
  [string]$BaseUrl = "http://localhost:5177",
  [string]$UnityRoot = "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1",
  [string]$DCacheRoot = "D:\Downloads\RokidCache",
  [int]$WarnFreeGB = 25,
  [int]$StopFreeGB = 8
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $root "output\env-doctor"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Add-Issue {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )
  $List.Add($Message) | Out-Null
}

function Invoke-Version {
  param(
    [string]$Command,
    [string[]]$Arguments = @("--version")
  )
  try {
    $output = & $Command @Arguments 2>&1 | Select-Object -First 5
    return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
  } catch {
    return $_.Exception.Message
  }
}

function Get-CommandInfo {
  param(
    [string]$Name,
    [string[]]$VersionArguments = @("--version")
  )
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (!$cmd) {
    return [pscustomobject]@{
      name = $Name
      ok = $false
      path = $null
      version = $null
    }
  }

  return [pscustomobject]@{
    name = $Name
    ok = $true
    path = $cmd.Source
    version = Invoke-Version -Command $cmd.Source -Arguments $VersionArguments
  }
}

function Test-PathInfo {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      path = $Path
      exists = $false
      size_bytes = 0
      sha256 = $null
      last_write_time = $null
    }
  }
  $item = Get-Item -LiteralPath $Path -Force
  $hash = $null
  if (!$item.PSIsContainer) {
    $hash = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
  }
  return [pscustomobject]@{
    path = $Path
    exists = $true
    size_bytes = if ($item.PSIsContainer) { $null } else { [int64]$item.Length }
    sha256 = $hash
    last_write_time = $item.LastWriteTime.ToString("o")
  }
}

function Get-LatestFileInfo {
  param(
    [string]$Path,
    [string]$Filter
  )
  $latest = Get-ChildItem -LiteralPath $Path -Filter $Filter -File -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$latest) {
    return [pscustomobject]@{
      path = $null
      exists = $false
      size_bytes = 0
      sha256 = $null
      last_write_time = $null
    }
  }
  return Test-PathInfo -Path $latest.FullName
}

function Test-Health {
  param([string]$Url)
  try {
    $healthUrl = "$($Url.TrimEnd('/'))/api/health"
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
    $body = $response.Content | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      url = $healthUrl
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
      url = "$($Url.TrimEnd('/'))/api/health"
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

function Get-PortInfo {
  param([int[]]$Ports)
  $rows = @()
  foreach ($port in $Ports) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
      $proc = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
      $rows += [pscustomobject]@{
        local_address = $listener.LocalAddress
        local_port = $listener.LocalPort
        process_id = $listener.OwningProcess
        process_name = $proc.ProcessName
        process_path = $proc.Path
      }
    }
  }
  return @($rows)
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

$node = Get-CommandInfo -Name "node" -VersionArguments @("--version")
$npm = Get-CommandInfo -Name "npm" -VersionArguments @("--version")
$java = Get-CommandInfo -Name "java" -VersionArguments @("-version")
$maven = Get-CommandInfo -Name "mvn" -VersionArguments @("--version")

$unityExe = Join-Path $UnityRoot "Editor\Unity.exe"
$unity = [pscustomobject]@{
  name = "Unity"
  ok = (Test-Path -LiteralPath $unityExe)
  path = $unityExe
  version = Split-Path -Leaf $UnityRoot
}

$androidPlayer = Join-Path $UnityRoot "Editor\Data\PlaybackEngines\AndroidPlayer"
$androidChecks = [ordered]@{
  android_player = $androidPlayer
  sdk = (Join-Path $androidPlayer "SDK")
  ndk = (Join-Path $androidPlayer "NDK")
  openjdk = (Join-Path $androidPlayer "OpenJDK")
  adb = (Join-Path $androidPlayer "SDK\platform-tools\adb.exe")
  aapt2 = (Join-Path $androidPlayer "SDK\build-tools\36.0.0\aapt2.exe")
  android_jar_35 = (Join-Path $androidPlayer "SDK\platforms\android-35\android.jar")
}

$android = foreach ($key in $androidChecks.Keys) {
  $path = $androidChecks[$key]
  [pscustomobject]@{
    name = $key
    path = $path
    exists = (Test-Path -LiteralPath $path)
  }
}

$drives = foreach ($name in @("C", "D")) {
  $disk = Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}:'" -f $name) -ErrorAction SilentlyContinue
  if ($disk) {
    [pscustomobject]@{
      drive = $name
      free_gb = Format-GB ([int64]$disk.FreeSpace)
      used_gb = Format-GB ([int64]($disk.Size - $disk.FreeSpace))
      size_gb = Format-GB ([int64]$disk.Size)
    }
  }
}

$artifacts = [ordered]@{
  windows_exe = Test-PathInfo -Path (Join-Path $root "output\unity-windows\InnerWorldRokid.exe")
  android_apk = Test-PathInfo -Path (Join-Path $root "output\unity-android\InnerWorldRokid.apk")
  field_kit_pdf = Test-PathInfo -Path (Join-Path $root "output\pdf\rokid_innerworld_field_kit.pdf")
  latest_rehearsal_json = Test-PathInfo -Path (Join-Path $root "output\demo\rehearsal-evidence-latest.json")
  latest_field_preflight_json = Test-PathInfo -Path (Join-Path $root "output\field-preflight\field-preflight-latest.json")
  latest_package_zip = Get-LatestFileInfo -Path (Join-Path $root "output\package") -Filter "innerworld-rokid-demo-*.zip"
  latest_server_zip = Get-LatestFileInfo -Path (Join-Path $root "output\server-release") -Filter "innerworld-space-server-*.zip"
}

$health = Test-Health -Url $BaseUrl
$ports = Get-PortInfo -Ports @(5177, 5188, 5191)

foreach ($tool in @($node, $npm, $java, $maven, $unity)) {
  if (!$tool.ok) { Add-Issue $errors "$($tool.name) is missing." }
}

foreach ($item in $android) {
  if (!$item.exists) { Add-Issue $errors "Unity Android component missing: $($item.name) at $($item.path)" }
}

foreach ($key in $artifacts.Keys) {
  if (!$artifacts[$key].exists) { Add-Issue $errors "Required artifact missing: $key" }
}

if (!$health.ok) {
  Add-Issue $errors "Space Server health failed at $($health.url): $($health.error)"
} elseif ($health.mission_state -ne "entered" -or $health.beacon_count -ne 2 -or $health.completed_step_count -ne 0) {
  Add-Issue $warnings "Space Server is reachable but not in clean initial state."
}

$cDrive = @($drives | Where-Object { $_.drive -eq "C" } | Select-Object -First 1)
if ($cDrive.Count -gt 0) {
  if ($cDrive[0].free_gb -lt $StopFreeGB) {
    Add-Issue $errors "C drive free space is below $StopFreeGB GB."
  } elseif ($cDrive[0].free_gb -lt $WarnFreeGB) {
    Add-Issue $warnings "C drive free space is below $WarnFreeGB GB."
  }
}

if (!(Test-Path -LiteralPath $DCacheRoot)) {
  Add-Issue $warnings "D cache root is missing: $DCacheRoot"
}

$result = [pscustomobject]@{
  ok = ($errors.Count -eq 0)
  generated_at = (Get-Date).ToString("o")
  root = $root
  base_url = $BaseUrl
  tools = [pscustomobject]@{
    node = $node
    npm = $npm
    java = $java
    maven = $maven
    unity = $unity
  }
  android = @($android)
  drives = @($drives)
  ports = @($ports)
  health = $health
  artifacts = [pscustomobject]$artifacts
  warnings = @($warnings)
  errors = @($errors)
}

$jsonPath = Join-Path $outputRoot "env-doctor-$stamp.json"
$mdPath = Join-Path $outputRoot "env-doctor-$stamp.md"
$latestJson = Join-Path $outputRoot "env-doctor-latest.json"
$latestMd = Join-Path $outputRoot "env-doctor-latest.md"

$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path $jsonPath
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$toolLines = foreach ($tool in @($node, $npm, $java, $maven, $unity)) {
  "- $($tool.name): $($tool.ok) | $($tool.path)"
}
$artifactLines = foreach ($key in $artifacts.Keys) {
  "- ${key}: $($artifacts[$key].exists) | $($artifacts[$key].path)"
}
$warningLines = if ($warnings.Count -gt 0) { $warnings | ForEach-Object { "- $_" } } else { @("- None") }
$errorLines = if ($errors.Count -gt 0) { $errors | ForEach-Object { "- $_" } } else { @("- None") }

$md = @"
# Rokid Env Doctor

- Generated: $($result.generated_at)
- OK: $($result.ok)
- Base URL: $BaseUrl
- Health: $($health.ok), state=$($health.mission_state), beacons=$($health.beacon_count), completed=$($health.completed_step_count)

## Tools

$($toolLines -join "`n")

## Artifacts

$($artifactLines -join "`n")

## Warnings

$($warningLines -join "`n")

## Errors

$($errorLines -join "`n")
"@
$md | Set-Content -Encoding UTF8 -Path $mdPath
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "Env doctor complete."
Write-Output "OK: $($result.ok)"
Write-Output "JSON: $jsonPath"
Write-Output "Markdown: $mdPath"
if ($warnings.Count -gt 0) {
  Write-Output "Warnings:"
  $warnings | ForEach-Object { Write-Output " - $_" }
}
if ($errors.Count -gt 0) {
  Write-Output "Errors:"
  $errors | ForEach-Object { Write-Output " - $_" }
  exit 1
}
