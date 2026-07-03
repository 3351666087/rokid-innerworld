param(
  [switch]$RequireAdbDevice,
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\device-probe"
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Get-Sha256Prefix {
  param(
    [AllowNull()][string]$Value,
    [int]$Length = 12
  )
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($bytes)
  } finally {
    $sha.Dispose()
  }
  $hex = [System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant()
  return $hex.Substring(0, [Math]::Min($Length, $hex.Length))
}

function Invoke-Capture {
  param(
    [string]$Command,
    [string[]]$Arguments = @()
  )
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    return [pscustomobject]@{
      ok = $true
      exit_code = $exitCode
      lines = @($output | ForEach-Object { "$_" })
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      exit_code = $null
      lines = @()
      error = $_.Exception.Message
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Get-DirectoryNames {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path) -or !(Test-Path -LiteralPath $Path)) { return @() }
  return @((Get-ChildItem -LiteralPath $Path -Directory -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -ExpandProperty Name))
}

function Get-AdbCandidates {
  $candidates = @()
  $cmd = Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $candidates += [pscustomobject]@{ source = "path"; path = $cmd.Source } }
  foreach ($candidate in @(
    "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    "C:\Program Files\Android\android-sdk\platform-tools\adb.exe",
    (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
  )) {
    if (![string]::IsNullOrWhiteSpace($candidate)) {
      $candidates += [pscustomobject]@{ source = "known_path"; path = $candidate }
    }
  }
  $seen = @{}
  $rows = foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate.path)) { continue }
    $key = $candidate.path.ToLowerInvariant()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $exists = Test-Path -LiteralPath $candidate.path
    [pscustomobject]@{
      source = $candidate.source
      path = if ($exists) { (Resolve-Path -LiteralPath $candidate.path).Path } else { $candidate.path }
      exists = [bool]$exists
      selected = $false
    }
  }
  return @($rows)
}

function Select-AdbPath {
  param([object[]]$Candidates)
  $found = @($Candidates | Where-Object { $_.exists } | Select-Object -First 1)
  if ($found.Count -lt 1) { return $null }
  return $found[0].path
}

function Get-Version {
  param(
    [string]$Name,
    [string[]]$Arguments = @("--version")
  )
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (!$cmd) {
    return [pscustomobject]@{ name = $Name; ok = $false; path = $null; version = $null; error = "not found" }
  }
  $capture = Invoke-Capture -Command $cmd.Source -Arguments $Arguments
  return [pscustomobject]@{
    name = $Name
    ok = [bool]($capture.ok -and ($capture.exit_code -eq 0 -or $null -eq $capture.exit_code))
    path = $cmd.Source
    version = (($capture.lines | Select-Object -First 5) -join "`n").Trim()
    error = $capture.error
  }
}

function Convert-AdbDeviceLine {
  param([string]$Line)
  if ([string]::IsNullOrWhiteSpace($Line)) { return $null }
  $trimmed = $Line.Trim()
  if ($trimmed -match "^List of devices") { return $null }
  if ($trimmed -match "^\*+\s*daemon\b") { return $null }
  if ($trimmed -match "^daemon\s+started\s+successfully\b") { return $null }
  $parts = $trimmed -split "\s+"
  if ($parts.Count -lt 2) { return $null }
  $id = $parts[0]
  $state = $parts[1]
  $fieldStart = 2
  if ($state -eq "no" -and $parts.Count -ge 3 -and $parts[2] -eq "permissions") {
    $state = "no permissions"
    $fieldStart = 3
  }
  $validStates = @("device", "offline", "unauthorized", "recovery", "sideload", "rescue", "bootloader", "host", "no permissions")
  if ($id -match "^\*" -or $validStates -notcontains $state) { return $null }
  $fields = @{}
  foreach ($part in ($parts | Select-Object -Skip $fieldStart)) {
    if ($part -match "^([^:]+):(.+)$") { $fields[$Matches[1]] = $Matches[2] }
  }
  $transport = if ($id -match "^\d{1,3}(\.\d{1,3}){3}:\d+$") { "tcp" } else { "usb" }
  $idHash = Get-Sha256Prefix $id
  return [pscustomobject]@{
    id_hash_prefix = $idHash
    id_redacted = "$transport`:<redacted>:$idHash"
    transport = $transport
    state = $state
    product = $fields["product"]
    model = $fields["model"]
    device = $fields["device"]
    transport_id = $fields["transport_id"]
  }
}

function Get-AdbInfo {
  param(
    [object[]]$Candidates,
    [AllowNull()][string]$AdbPath
  )
  if (!$AdbPath) {
    return [pscustomobject]@{
      found = $false
      selected_path = $null
      candidates = @($Candidates)
      version = $null
      devices = @()
      device_count = 0
      device_state_count = 0
      error = "adb not found"
    }
  }
  foreach ($candidate in $Candidates) {
    if ($candidate.path -eq $AdbPath) { $candidate.selected = $true }
  }
  $version = Invoke-Capture -Command $AdbPath -Arguments @("version")
  $devices = Invoke-Capture -Command $AdbPath -Arguments @("devices", "-l")
  $rows = @()
  foreach ($line in $devices.lines) {
    $row = Convert-AdbDeviceLine -Line $line
    if ($row) { $rows += $row }
  }
  return [pscustomobject]@{
    found = $true
    selected_path = $AdbPath
    candidates = @($Candidates)
    version = (($version.lines | Select-Object -First 3) -join "`n").Trim()
    devices = @($rows)
    device_count = @($rows).Count
    device_state_count = @($rows | Where-Object { $_.state -eq "device" }).Count
    error = $devices.error
  }
}

function Get-AndroidSdkInfo {
  $roots = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    "C:\Program Files (x86)\Android\android-sdk",
    "C:\Program Files\Android\android-sdk",
    (Join-Path $env:LOCALAPPDATA "Android\Sdk")
  ) | Where-Object { $_ } | Select-Object -Unique

  $items = foreach ($sdkRoot in $roots) {
    $exists = Test-Path -LiteralPath $sdkRoot
    [pscustomobject]@{
      path = $sdkRoot
      exists = [bool]$exists
      platform_tools = [pscustomobject]@{
        adb_exists = Test-Path -LiteralPath (Join-Path $sdkRoot "platform-tools\adb.exe")
      }
      build_tools = [pscustomobject]@{
        versions = @(Get-DirectoryNames -Path (Join-Path $sdkRoot "build-tools"))
      }
      platforms = [pscustomobject]@{
        versions = @(Get-DirectoryNames -Path (Join-Path $sdkRoot "platforms"))
      }
      cmdline_tools = [pscustomobject]@{
        exists = Test-Path -LiteralPath (Join-Path $sdkRoot "cmdline-tools")
        versions = @(Get-DirectoryNames -Path (Join-Path $sdkRoot "cmdline-tools"))
      }
    }
  }
  return [pscustomobject]@{
    roots = @($items)
    existing_root_count = @($items | Where-Object { $_.exists }).Count
  }
}

function Get-UnityInfo {
  $hubExe = "C:\Program Files\Unity Hub\Unity Hub.exe"
  $editorRoots = @(
    "C:\Program Files\Unity\Hub\Editor",
    "C:\Users\33516\Unity\Hub\Editor"
  )
  $editors = foreach ($editorRoot in $editorRoots) {
    Get-ChildItem -LiteralPath $editorRoot -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $unityExe = Join-Path $_.FullName "Editor\Unity.exe"
      [pscustomobject]@{
        version = $_.Name
        path = $_.FullName
        unity_exe_exists = Test-Path -LiteralPath $unityExe
      }
    }
  }
  return [pscustomobject]@{
    hub = @([pscustomobject]@{
        path = $hubExe
        exists = Test-Path -LiteralPath $hubExe
      })
    editors = @($editors)
  }
}

function Convert-PnpDevice {
  param($Device)
  $instanceId = "$($Device.InstanceId)"
  $vid = $null
  $productId = $null
  if ($instanceId -match "VID_([0-9A-Fa-f]{4})") { $vid = $Matches[1].ToUpperInvariant() }
  if ($instanceId -match "PID_([0-9A-Fa-f]{4})") { $productId = $Matches[1].ToUpperInvariant() }
  $instanceHash = Get-Sha256Prefix $instanceId
  return [pscustomobject]@{
    class = $Device.Class
    friendly_name = $Device.FriendlyName
    status = $Device.Status
    vid = $vid
    pid = $productId
    instance_id_redacted = if ($vid -and $productId) { "USB\VID_$vid&PID_$productId\<redacted>" } else { "pnp:<redacted>" }
    instance_hash_prefix = $instanceHash
  }
}

function Get-PnpSummary {
  try {
    $devices = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object {
      $_.FriendlyName -match "Rokid|BOLON|Bolon|Android|ADB|MTP|Station|XR|Composite|USB|Portable|WPD" -or
      $_.Class -match "Android|USB|WPD|Portable|USBDevice"
    }
  } catch {
    return [pscustomobject]@{
      devices = @()
      counts_by_class = @()
      counts_by_status = @()
      error = $_.Exception.Message
    }
  }
  $rows = @($devices | Sort-Object Class,FriendlyName | ForEach-Object { Convert-PnpDevice -Device $_ })
  $byClass = @($rows | Group-Object class | Sort-Object Name | ForEach-Object {
      [pscustomobject]@{ key = $_.Name; count = $_.Count }
    })
  $byStatus = @($rows | Group-Object status | Sort-Object Name | ForEach-Object {
      [pscustomobject]@{ key = $_.Name; count = $_.Count }
    })
  return [pscustomobject]@{
    devices = @($rows)
    counts_by_class = @($byClass)
    counts_by_status = @($byStatus)
    error = $null
  }
}

function Get-EnvironmentInfo {
  $variableNames = @(
    "ANDROID_HOME",
    "ANDROID_SDK_ROOT",
    "JAVA_HOME",
    "MAVEN_OPTS",
    "INNERWORLD_API_BASE_URL",
    "INNERWORLD_OPERATOR_PIN",
    "INNERWORLD_OPERATOR_PAIRING_CODE"
  )
  $variables = foreach ($name in $variableNames) {
    [pscustomobject]@{
      name = $name
      set = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))
      value_redacted = $true
    }
  }
  $path = [Environment]::GetEnvironmentVariable("PATH")
  $highlights = @(
    [pscustomobject]@{ name = "android_platform_tools"; present = $path -match "platform-tools" },
    [pscustomobject]@{ name = "unity_hub"; present = $path -match "Unity" },
    [pscustomobject]@{ name = "maven"; present = $path -match "Maven|mvn" },
    [pscustomobject]@{ name = "node"; present = $path -match "nodejs|node" }
  )
  return [pscustomobject]@{
    variables = @($variables)
    path_highlights = @($highlights)
  }
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

$adbCandidates = Get-AdbCandidates
$adbPath = Select-AdbPath -Candidates $adbCandidates
$adb = Get-AdbInfo -Candidates $adbCandidates -AdbPath $adbPath
$androidSdk = Get-AndroidSdkInfo
$unity = Get-UnityInfo
$pnp = Get-PnpSummary
$warnings = New-Object 'System.Collections.Generic.List[string]'
$errors = New-Object 'System.Collections.Generic.List[string]'
if (!$adb.found) { [void]$errors.Add("ADB executable was not found.") }
if ($adb.device_state_count -lt 1) { [void]$warnings.Add("No ADB device is currently in device state.") }
if ($androidSdk.existing_root_count -lt 1) { [void]$warnings.Add("No Android SDK root was found.") }
if ($unity.editors.Count -lt 1) { [void]$warnings.Add("No Unity editor installation was found.") }
if ($pnp.error) { [void]$warnings.Add("Windows PnP summary failed: $($pnp.error)") }
$ok = ($errors.Count -eq 0 -and $adb.device_state_count -ge 1)

$summary = [pscustomobject]@{
  schema = "innerworld-device-probe/v1"
  generated_at = (Get-Date).ToString("o")
  ok = [bool]$ok
  require_adb_device = [bool]$RequireAdbDevice
  privacy = [pscustomobject]@{
    full_serials_included = $false
    full_usb_instance_ids_included = $false
    private_ips_included = $false
    mac_addresses_included = $false
    pairing_codes_included = $false
    note = "Device ids and USB instance ids are hashed and redacted; only model, status, class, VID/PID, and local tool evidence is retained."
  }
  adb = $adb
  pnp = $pnp
  tools = [pscustomobject]@{
    node = Get-Version -Name "node" -Arguments @("--version")
    npm = Get-Version -Name "npm" -Arguments @("--version")
    java = Get-Version -Name "java" -Arguments @("-version")
    maven = Get-Version -Name "mvn" -Arguments @("--version")
  }
  android_sdk = $androidSdk
  unity = $unity
  environment = Get-EnvironmentInfo
  warnings = @($warnings)
  errors = @($errors)
}

$jsonPath = Join-Path $OutputRoot "device-probe-$stamp.json"
$latestJson = Join-Path $OutputRoot "device-probe-latest.json"
$mdPath = Join-Path $OutputRoot "device-probe-$stamp.md"
$latestMd = Join-Path $OutputRoot "device-probe-latest.md"

$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$summary | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $latestJson -Encoding UTF8

$deviceLines = if ($summary.adb.devices.Count) {
  $summary.adb.devices | ForEach-Object {
    "- $($_.transport) $($_.state) model=$($_.model) product=$($_.product) id=$($_.id_redacted)"
  }
} else {
  @("- No ADB devices reported.")
}

$pnpLines = $summary.pnp.devices | Select-Object -First 12 | ForEach-Object {
  "- $($_.class) $($_.friendly_name) status=$($_.status) vid=$($_.vid) pid=$($_.pid) id=$($_.instance_id_redacted) hash=$($_.instance_hash_prefix)"
}

$markdown = @(
  "# InnerWorld Device Probe",
  "",
  "- Generated: $($summary.generated_at)",
  "- Schema: $($summary.schema)",
  "- OK: $($summary.ok)",
  "- ADB found: $($summary.adb.found)",
  "- ADB selected path: $($summary.adb.selected_path)",
  "- ADB ready devices: $($summary.adb.device_state_count)",
  "- Android SDK roots: $($summary.android_sdk.existing_root_count)",
  "- Unity editors: $($summary.unity.editors.Count)",
  "- Privacy: full serials, USB instance ids, private IPs, MAC addresses, and pairing codes are not included.",
  "",
  "## ADB Devices",
  "",
  $deviceLines,
  "",
  "## Windows PnP Summary",
  "",
  $pnpLines,
  "",
  "## Issues",
  "",
  ($(if ($summary.errors.Count) { $summary.errors | ForEach-Object { "- error: $_" } } else { "- errors: none" })),
  ($(if ($summary.warnings.Count) { $summary.warnings | ForEach-Object { "- warning: $_" } } else { "- warnings: none" }))
)

$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
$markdown | Set-Content -LiteralPath $latestMd -Encoding UTF8

Write-Host ($summary | ConvertTo-Json -Depth 8)

if ($summary.errors.Count -gt 0) {
  exit 2
}

if ($RequireAdbDevice -and $summary.adb.device_state_count -lt 1) {
  exit 2
}
