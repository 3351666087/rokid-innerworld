param(
  [switch]$RequireReady,
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"
$script:SelectedAdbDeviceId = $null

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\station-pro-glasses-diagnostics"
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

function Redact-Text {
  param(
    [AllowNull()][string]$Text,
    [string[]]$KnownDeviceIds = @()
  )
  if ($null -eq $Text) { return $null }
  $redacted = "$Text"
  foreach ($id in $KnownDeviceIds) {
    if (![string]::IsNullOrWhiteSpace($id)) {
      $redacted = $redacted.Replace($id, "<device-id-redacted>")
    }
  }
  $redacted = $redacted -replace '\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b', '<mac-redacted>'
  $redacted = $redacted -replace '\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b', '<private-ip-redacted>'
  $redacted = $redacted -replace 'USB\\VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4}\\[^\\\s]+', 'USB\VID_<redacted>&PID_<redacted>\<redacted>'
  return $redacted
}

function Invoke-Capture {
  param(
    [string]$Command,
    [string[]]$Arguments = @(),
    [string[]]$KnownDeviceIds = @()
  )
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    if ($script:SelectedAdbDeviceId -and (Split-Path -Leaf $Command) -match '^adb(\.exe)?$' -and $Arguments.Count -gt 0 -and $Arguments[0] -notin @("devices", "connect", "disconnect", "start-server", "kill-server") -and $Arguments[0] -ne "-s") {
      $Arguments = @("-s", $script:SelectedAdbDeviceId) + $Arguments
    }
    $output = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = (@($output | ForEach-Object { "$_" }) -join "`n")
    return [pscustomobject]@{
      ok = $exitCode -eq 0
      exit_code = $exitCode
      text = Redact-Text -Text $text -KnownDeviceIds $KnownDeviceIds
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      exit_code = $null
      text = Redact-Text -Text $_.Exception.Message -KnownDeviceIds $KnownDeviceIds
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Find-Adb {
  $candidates = @()
  $cmd = Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $candidates += $cmd.Source }
  $candidates += @(
    "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    "C:\Program Files\Android\android-sdk\platform-tools\adb.exe",
    (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
  )
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  }
  return $null
}

function Get-AdbDevices {
  param([AllowNull()][string]$AdbPath)
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      found = $false
      selected_path = $null
      devices = @()
      raw_device_ids = @()
      device_state_count = 0
    }
  }
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $AdbPath devices -l 2>&1
    $exitCode = $LASTEXITCODE
    $text = (@($output | ForEach-Object { "$_" }) -join "`n")
  } catch {
    $exitCode = $null
    $text = $_.Exception.Message
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  $deviceRows = @()
  $rawIds = @()
  foreach ($line in ($text -split "`r?`n")) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed -match "^List of devices" -or $trimmed -match "^daemon ") { continue }
    $parts = $trimmed -split "\s+"
    if ($parts.Count -lt 2) { continue }
    $rawId = $parts[0]
    $state = $parts[1]
    $rawIds += $rawId
    $details = @{}
    foreach ($part in $parts | Select-Object -Skip 2) {
      if ($part -match "^([^:]+):(.+)$") { $details[$Matches[1]] = $Matches[2] }
    }
    $deviceRows += [pscustomobject]@{
      raw_id = $rawId
      id_hash_prefix = Get-Sha256Prefix $rawId
      id_redacted = "usb:<redacted>:$(Get-Sha256Prefix $rawId)"
      transport = if ($rawId -match "^\d+\.\d+\.\d+\.\d+:") { "tcp" } else { "usb" }
      state = $state
      product = $details["product"]
      model = $details["model"]
      device = $details["device"]
    }
  }
  $deviceCandidates = @($deviceRows | Where-Object { $_.state -eq "device" })
  $usbCandidates = @($deviceCandidates | Where-Object { $_.transport -eq "usb" } | Sort-Object raw_id)
  $tcpCandidates = @($deviceCandidates | Where-Object { $_.transport -eq "tcp" } | Sort-Object raw_id)
  $selected = if ($usbCandidates.Count -gt 0) {
    $usbCandidates[0]
  } elseif ($tcpCandidates.Count -gt 0) {
    $tcpCandidates[0]
  } elseif ($deviceCandidates.Count -gt 0) {
    $deviceCandidates[0]
  } else {
    $null
  }
  return [pscustomobject]@{
    found = [bool]($exitCode -eq 0)
    selected_path = $AdbPath
    devices = @($deviceRows | ForEach-Object {
        [pscustomobject]@{
          id_hash_prefix = $_.id_hash_prefix
          id_redacted = "$($_.transport):<redacted>:$($_.id_hash_prefix)"
          transport = $_.transport
          state = $_.state
          product = $_.product
          model = $_.model
          device = $_.device
        }
      })
    raw_device_ids = @($rawIds)
    selected_device_id = if ($null -ne $selected) { $selected.raw_id } else { $null }
    selected_device_id_hash_prefix = if ($null -ne $selected) { $selected.id_hash_prefix } else { $null }
    selected_transport = if ($null -ne $selected) { $selected.transport } else { $null }
    device_state_count = @($deviceRows | Where-Object { $_.state -eq "device" }).Count
  }
}

function Get-DisplayNameHint {
  param([AllowNull()][string]$Name)
  if ([string]::IsNullOrWhiteSpace($Name)) { return "unknown" }
  $value = "$Name"
  if ($value -match "(?i)rokid") { return "rokid" }
  if ($value -match "(?i)max") { return "max" }
  if ($value -match "(?i)glass|glasses") { return "glasses" }
  if ($value -match "(?i)hdmi") { return "hdmi" }
  if ($value -match "(?i)external|wireless|virtual") { return "external" }
  if ($value -match "(?i)built.?in|internal|default|local|内置") { return "internal" }
  return "unknown"
}

function Get-DisplayDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      display_count = 0
      external_display_detected = $false
      internal_only = $false
      display_summaries = @()
      raw_dumpsys_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "dumpsys", "display") -KnownDeviceIds $KnownDeviceIds
  $text = "$($result.text)"
  $displayLines = @($text -split "`r?`n" | Where-Object { $_ -match "DisplayDeviceInfo\{" })
  $summaries = @()
  foreach ($line in $displayLines) {
    $name = $null
    $type = $null
    $state = $null
    if ($line -match 'DisplayDeviceInfo\{"([^"]*)"') { $name = $Matches[1] }
    if ($line -match '\btype\s+([A-Z_]+)') { $type = $Matches[1] }
    if ($line -match '\bstate\s+([A-Z_]+)') { $state = $Matches[1] }
    $hint = Get-DisplayNameHint -Name $name
    $externalCandidate = [bool](
      ($type -and $type -match "EXTERNAL|OVERLAY|VIRTUAL") -or
      ($hint -in @("rokid", "max", "glasses", "hdmi", "external"))
    )
    $summaries += [pscustomobject]@{
      name_hint = $hint
      name_hash_prefix = if (![string]::IsNullOrWhiteSpace($name)) { Get-Sha256Prefix $name } else { $null }
      type = $type
      state = $state
      external_candidate = $externalCandidate
    }
  }
  $externalDetected = [bool](@($summaries | Where-Object { $_.external_candidate }).Count -gt 0)
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    display_count = $summaries.Count
    external_display_detected = $externalDetected
    internal_only = [bool]($summaries.Count -gt 0 -and !$externalDetected)
    display_summaries = @($summaries)
    raw_dumpsys_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Count-TextRegex {
  param(
    [AllowNull()][string]$Text,
    [string]$Pattern
  )
  if ([string]::IsNullOrWhiteSpace($Text)) { return 0 }
  return [regex]::Matches($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase).Count
}

function Get-FirstRegexValue {
  param(
    [AllowNull()][string]$Text,
    [string]$Pattern,
    [string]$GroupName = "value"
  )
  if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
  $match = [regex]::Match($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Multiline)
  if (!$match.Success) { return $null }
  if ($match.Groups[$GroupName] -and $match.Groups[$GroupName].Success) {
    return $match.Groups[$GroupName].Value.Trim()
  }
  if ($match.Groups.Count -gt 1) { return $match.Groups[1].Value.Trim() }
  return $match.Value.Trim()
}

function Convert-NullableBool {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
  if ($Value -match "^(?i:true)$") { return $true }
  if ($Value -match "^(?i:false)$") { return $false }
  return $null
}

function Get-RuntimeLogDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      raw_logcat_included = $false
      runtime_unavailable_count = 0
      runtime_broker_failure_count = 0
      rokid_runtime_manifest_count = 0
      runtime_load_success_count = 0
      glass_name_failure_count = 0
      head_pose_failure_count = 0
      rokid_runtime_loaded = $false
      runtime_unavailable_detected = $false
      glasses_detection_blocked = $false
      error = "adb_not_available"
    }
  }
  $tailLineLimit = 2000
  $result = Invoke-Capture -Command $AdbPath -Arguments @("logcat", "-d", "-t", "$tailLineLimit", "-v", "brief") -KnownDeviceIds $KnownDeviceIds
  $text = "$($result.text)"
  $runtimeUnavailableCount = Count-TextRegex -Text $text -Pattern "XR_ERROR_RUNTIME_UNAVAILABLE"
  $runtimeBrokerFailureCount = Count-TextRegex -Text $text -Pattern "runtime_broker|Could access neither the installable nor system runtime broker|Failed to find provider info for org\.khronos\.openxr\.runtime_broker"
  $rokidRuntimeManifestCount = Count-TextRegex -Text $text -Pattern "GetRokidRuntimeManifest"
  $runtimeLoadSuccessCount = Count-TextRegex -Text $text -Pattern "RuntimeInterface::LoadRuntime succeeded|LoadRuntime succeeded"
  $glassNameFailureCount = Count-TextRegex -Text $text -Pattern "getGlassName failed|glass not detected"
  $headPoseFailureCount = Count-TextRegex -Text $text -Pattern "oxr_getHeadPose[^\r\n]*(result\s*=\s*-101|-101)"
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    raw_logcat_included = $false
    logcat_tail_line_limit = $tailLineLimit
    runtime_unavailable_count = $runtimeUnavailableCount
    runtime_broker_failure_count = $runtimeBrokerFailureCount
    rokid_runtime_manifest_count = $rokidRuntimeManifestCount
    runtime_load_success_count = $runtimeLoadSuccessCount
    glass_name_failure_count = $glassNameFailureCount
    head_pose_failure_count = $headPoseFailureCount
    rokid_runtime_loaded = [bool]($rokidRuntimeManifestCount -gt 0 -or $runtimeLoadSuccessCount -gt 0 -or $glassNameFailureCount -gt 0 -or $headPoseFailureCount -gt 0)
    runtime_unavailable_detected = [bool]($runtimeUnavailableCount -gt 0 -or $runtimeBrokerFailureCount -gt 0)
    glasses_detection_blocked = [bool]($glassNameFailureCount -gt 0 -or $headPoseFailureCount -gt 0)
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-PackageDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      openxr_runtime_package_installed = $false
      rokid_package_count = 0
      package_names = @()
      raw_package_dump_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "pm", "list", "packages") -KnownDeviceIds $KnownDeviceIds
  $packages = @($result.text -split "`r?`n" | ForEach-Object {
      if ($_ -match "^package:(.+)$") { $Matches[1].Trim() }
    } | Where-Object { $_ -match "(?i)rokid|openxr|uxr" } | Sort-Object -Unique)
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    openxr_runtime_package_installed = [bool]($packages -contains "com.rokid.openxr.runtime")
    rokid_package_count = $packages.Count
    package_names = @($packages)
    raw_package_dump_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-OpenXrServiceDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      runtime_service_resolves = $false
      broker_provider_resolves = $false
      runtime_package_marker_seen = $false
      raw_service_dump_included = $false
      error = "adb_not_available"
    }
  }
  $runtime = Invoke-Capture -Command $AdbPath -Arguments @("shell", "cmd", "package", "query-services", "-a", "org.khronos.openxr.OpenXRRuntimeService") -KnownDeviceIds $KnownDeviceIds
  $provider = Invoke-Capture -Command $AdbPath -Arguments @("shell", "cmd", "package", "resolve-content-provider", "org.khronos.openxr.runtime_broker") -KnownDeviceIds $KnownDeviceIds
  $runtimeText = "$($runtime.text)"
  $providerText = "$($provider.text)"
  return [pscustomobject]@{
    query_ok = [bool]($runtime.ok -or $provider.ok)
    runtime_service_resolves = [bool]($runtimeText -match "com\.rokid\.openxr\.runtime|OpenXRRuntimeService")
    broker_provider_resolves = [bool]($provider.ok -and $providerText -match "name=|packageName=")
    runtime_package_marker_seen = [bool]($runtimeText -match "com\.rokid\.openxr\.runtime")
    raw_service_dump_included = $false
    error = if ($runtime.ok -or $provider.ok) { $null } else { "$($runtime.text) $($provider.text)" }
  }
}

function Get-RokidDisplayServiceDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      system_ready = $false
      boot_completed = $false
      dsp_connected = $false
      usb_display_connected = $false
      usb_device_connected = $false
      psensor_status_hint = "unknown"
      focus_display_id = $null
      power_off = $null
      service_display_ready = $false
      raw_service_dump_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "dumpsys", "rokid_display") -KnownDeviceIds $KnownDeviceIds
  $text = "$($result.text)"
  $systemReady = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mSystemReady:\s*(?<value>true|false)')
  $bootCompleted = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mBootCompleted:\s*(?<value>true|false)')
  $dspConnected = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mDspConnected:\s*(?<value>true|false)')
  $usbDisplayConnected = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mUsbDisplayConnected:\s*(?<value>true|false)')
  $usbDeviceConnected = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mUsbDeviceConnected:\s*(?<value>true|false)')
  $powerOff = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^mIsPowerOff:\s*(?<value>true|false)')
  $psensor = Get-FirstRegexValue -Text $text -Pattern '^mPsensorStatus:\s*(?<value>[^\r\n]+)'
  $focusDisplayIdText = Get-FirstRegexValue -Text $text -Pattern '^mFocusDisplayId:\s*(?<value>-?\d+)'
  $focusDisplayId = if ($focusDisplayIdText -match '^-?\d+$') { [int]$focusDisplayIdText } else { $null }
  $psensorHint = if ([string]::IsNullOrWhiteSpace($psensor)) {
    "unknown"
  } elseif ($psensor -match "(?i)near|close") {
    "near"
  } elseif ($psensor -match "(?i)far|away") {
    "far"
  } elseif ($psensor -match "(?i)unknown") {
    "unknown"
  } else {
    "present"
  }
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    system_ready = [bool]($systemReady -eq $true)
    boot_completed = [bool]($bootCompleted -eq $true)
    dsp_connected = [bool]($dspConnected -eq $true)
    usb_display_connected = [bool]($usbDisplayConnected -eq $true)
    usb_device_connected = [bool]($usbDeviceConnected -eq $true)
    psensor_status_hint = $psensorHint
    focus_display_id = $focusDisplayId
    power_off = if ($null -ne $powerOff) { [bool]$powerOff } else { $null }
    service_display_ready = [bool]($systemReady -eq $true -and $bootCompleted -eq $true -and $usbDisplayConnected -eq $true -and $usbDeviceConnected -eq $true -and $dspConnected -eq $true -and $powerOff -ne $true)
    raw_service_dump_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-InputDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      device_count = 0
      external_input_candidate_count = 0
      device_summaries = @()
      raw_input_dump_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "dumpsys", "input") -KnownDeviceIds $KnownDeviceIds
  $text = "$($result.text)"
  $names = @()
  foreach ($line in ($text -split "`r?`n")) {
    if ($line -match '^\s*\d+:\s+(.+)$') { $names += $Matches[1].Trim() }
    elseif ($line -match '^\s*Name:\s+(.+)$') { $names += $Matches[1].Trim().Trim('"') }
  }
  $summaries = @($names | Where-Object { $_ } | Sort-Object -Unique | ForEach-Object {
      $hint = Get-DisplayNameHint -Name $_
      [pscustomobject]@{
        name_hint = $hint
        name_hash_prefix = Get-Sha256Prefix $_
        external_candidate = [bool]($hint -in @("rokid", "max", "glasses", "hdmi", "external"))
      }
    })
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    device_count = $summaries.Count
    external_input_candidate_count = @($summaries | Where-Object { $_.external_candidate }).Count
    device_summaries = @($summaries)
    raw_input_dump_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-UsbDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      connected_token_count = 0
      disconnected_token_count = 0
      host_mode_token_count = 0
      accessory_token_count = 0
      raw_usb_dump_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "dumpsys", "usb") -KnownDeviceIds $KnownDeviceIds
  $text = "$($result.text)"
  $currentFunctions = Get-FirstRegexValue -Text $text -Pattern '^\s*current_functions=(?<value>[^\r\n]+)'
  $currentMode = Get-FirstRegexValue -Text $text -Pattern '^\s*current_mode=(?<value>[a-z0-9_-]+)'
  $currentPowerRole = Get-FirstRegexValue -Text $text -Pattern '^\s*power_role=(?<value>[a-z0-9_-]+)'
  $currentDataRole = Get-FirstRegexValue -Text $text -Pattern '^\s*data_role=(?<value>[a-z0-9_-]+)'
  $deviceConnected = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^\s*connected=(?<value>true|false)')
  $configured = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^\s*configured=(?<value>true|false)')
  $hostConnected = Convert-NullableBool (Get-FirstRegexValue -Text $text -Pattern '^\s*host_connected=(?<value>true|false)')
  $stationUsbDeviceMode = [bool](
    ($currentMode -match "^(?i:ufp)$") -or
    ($currentDataRole -match "^(?i:device)$") -or
    ($currentFunctions -match "(?i)\b(?:mtp|ptp|adb|rndis|midi|ncm)\b")
  )
  $stationUsbHostMode = [bool](
    ($currentMode -match "^(?i:dfp)$") -or
    ($currentDataRole -match "^(?i:host)$") -or
    ($currentPowerRole -match "^(?i:source)$")
  )
  $rokidGlassAttachCount = Count-TextRegex -Text $text -Pattern "mManufacturerName=Rokid Corporation Ltd\.|mProductName=Rokid"
  $rokidProductName = Get-FirstRegexValue -Text $text -Pattern 'mProductName=(?<value>Rokid[^,\]\r\n]+)'
  $rokidProductHint = if ($rokidProductName -match "(?i)max") {
    "rokid_max"
  } elseif ($rokidProductName -match "(?i)air") {
    "rokid_air"
  } elseif ($rokidProductName -match "(?i)glass|rokid") {
    "rokid_glass"
  } else {
    $null
  }
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    connected_token_count = Count-TextRegex -Text $text -Pattern "connected\s*=\s*true|status\s*=\s*connected|mHostConnected\s*=\s*true"
    disconnected_token_count = Count-TextRegex -Text $text -Pattern "connected\s*=\s*false|status\s*=\s*disconnected|mHostConnected\s*=\s*false"
    host_mode_token_count = Count-TextRegex -Text $text -Pattern "host|dfp|source"
    accessory_token_count = Count-TextRegex -Text $text -Pattern "accessory|alternate|displayport|dp"
    current_functions_hint = if ([string]::IsNullOrWhiteSpace($currentFunctions)) { $null } else { ($currentFunctions -replace '(?i)adb', 'adb' -replace '(?i)mtp', 'mtp' -replace '[^a-zA-Z0-9_, -]', '') }
    current_mode = $currentMode
    current_power_role = $currentPowerRole
    current_data_role = $currentDataRole
    device_connected = if ($null -ne $deviceConnected) { [bool]$deviceConnected } else { $null }
    configured = if ($null -ne $configured) { [bool]$configured } else { $null }
    host_connected = if ($null -ne $hostConnected) { [bool]$hostConnected } else { $null }
    station_usb_device_mode = $stationUsbDeviceMode
    station_usb_host_mode = $stationUsbHostMode
    station_usb_role_blocks_glasses = [bool]($stationUsbDeviceMode -and !$stationUsbHostMode)
    rokid_glass_attach_event_count = $rokidGlassAttachCount
    rokid_glass_attach_seen = [bool]($rokidGlassAttachCount -gt 0)
    rokid_product_hint = $rokidProductHint
    raw_usb_dump_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-PropertyDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string[]]$KnownDeviceIds = @()
  )
  if ([string]::IsNullOrWhiteSpace($AdbPath)) {
    return [pscustomobject]@{
      query_ok = $false
      selected_property_count = 0
      properties = @()
      raw_getprop_included = $false
      error = "adb_not_available"
    }
  }
  $result = Invoke-Capture -Command $AdbPath -Arguments @("shell", "getprop") -KnownDeviceIds $KnownDeviceIds
  $props = @()
  foreach ($line in ($result.text -split "`r?`n")) {
    if ($line -notmatch '^\[([^\]]+)\]:\s+\[(.*)\]$') { continue }
    $key = $Matches[1]
    $value = $Matches[2]
    if ($key -notmatch '(?i)^(ro\.product\.(model|device|brand|manufacturer)|ro\.build\.version\.release|ro\.hardware|ro\.sf\.|vendor\..*(display|hdmi|rokid|xr|glass)|persist\..*(display|hdmi|rokid|xr|glass)|sys\..*(display|hdmi|rokid|xr|glass))') { continue }
    $props += [pscustomobject]@{
      key = $key
      value_hint = if ($value -match "(?i)rokid") { "rokid" } elseif ($value -match "(?i)station") { "station" } elseif ($value -match "(?i)hdmi|display") { "display" } elseif ([string]::IsNullOrWhiteSpace($value)) { "empty" } else { "present" }
      value_hash_prefix = if (![string]::IsNullOrWhiteSpace($value)) { Get-Sha256Prefix $value } else { $null }
    }
  }
  return [pscustomobject]@{
    query_ok = [bool]$result.ok
    selected_property_count = $props.Count
    properties = @($props | Sort-Object key)
    raw_getprop_included = $false
    error = if ($result.ok) { $null } else { $result.text }
  }
}

function Get-Readiness {
  param(
    [object]$Adb,
    [object]$Display,
    [object]$Runtime,
    [object]$Packages,
    [object]$Services,
    [object]$RokidDisplay,
    [object]$Usb
  )
  $blockers = New-Object 'System.Collections.Generic.List[string]'
  if (!$Adb.found -or $Adb.device_state_count -lt 1) { [void]$blockers.Add("station_pro_adb_device_missing") }
  if (!$Packages.openxr_runtime_package_installed) { [void]$blockers.Add("rokid_openxr_runtime_package_missing") }
  if (!$Services.runtime_service_resolves) { [void]$blockers.Add("rokid_openxr_runtime_service_missing") }
  if (!$Display.query_ok) { [void]$blockers.Add("display_dumpsys_unavailable") }
  if (!$Display.external_display_detected) { [void]$blockers.Add("rokid_external_display_not_detected") }
  if ($RokidDisplay -and $RokidDisplay.query_ok) {
    if (!$RokidDisplay.usb_display_connected) { [void]$blockers.Add("rokid_usb_display_not_connected") }
    if (!$RokidDisplay.usb_device_connected) { [void]$blockers.Add("rokid_usb_device_not_connected") }
    if (!$RokidDisplay.dsp_connected) { [void]$blockers.Add("rokid_display_dsp_not_connected") }
    if ($RokidDisplay.power_off -eq $true) { [void]$blockers.Add("rokid_display_powered_off") }
  } elseif ($Adb.found -and $Adb.device_state_count -gt 0) {
    [void]$blockers.Add("rokid_display_service_unavailable")
  }
  if ($Usb -and $Usb.query_ok -and $Usb.station_usb_role_blocks_glasses) {
    [void]$blockers.Add("station_usb_role_device_mode_blocks_glasses")
  }
  if (!$Runtime.query_ok) { [void]$blockers.Add("runtime_logcat_unavailable") }
  if ($Runtime.runtime_unavailable_detected) { [void]$blockers.Add("rokid_openxr_runtime_unavailable_detected") }
  if (!$Runtime.rokid_runtime_loaded) { [void]$blockers.Add("rokid_runtime_load_success_not_seen") }
  if ($Runtime.glass_name_failure_count -gt 0) { [void]$blockers.Add("rokid_glass_name_not_detected") }
  if ($Runtime.head_pose_failure_count -gt 0) { [void]$blockers.Add("rokid_head_pose_failure_detected") }
  return [pscustomobject]@{
    glasses_display_ready = [bool]($blockers.Count -eq 0)
    external_display_detected = [bool]$Display.external_display_detected
    rokid_display_service_ready = [bool]($RokidDisplay -and $RokidDisplay.service_display_ready)
    station_usb_role_ready_for_glasses = [bool](!($Usb -and $Usb.query_ok -and $Usb.station_usb_role_blocks_glasses))
    runtime_ready = [bool]($Runtime.rokid_runtime_loaded -and !$Runtime.runtime_unavailable_detected)
    openxr_runtime_package_ready = [bool]($Packages.openxr_runtime_package_installed -and $Services.runtime_service_resolves)
    blocker_ids = @($blockers)
    hardware_ready_claim_allowed = $false
    boundary = "This diagnostic only evaluates Station Pro glasses/display detection. It is not A1/A2/A3 field acceptance."
  }
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$adbPath = Find-Adb
$adb = Get-AdbDevices -AdbPath $adbPath
$script:SelectedAdbDeviceId = $adb.selected_device_id
$knownIds = @($adb.raw_device_ids)
$display = Get-DisplayDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$runtime = Get-RuntimeLogDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$packages = Get-PackageDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$services = Get-OpenXrServiceDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$rokidDisplay = Get-RokidDisplayServiceDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$input = Get-InputDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$usb = Get-UsbDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$properties = Get-PropertyDiagnostics -AdbPath $adbPath -KnownDeviceIds $knownIds
$readiness = Get-Readiness -Adb $adb -Display $display -Runtime $runtime -Packages $packages -Services $services -RokidDisplay $rokidDisplay -Usb $usb

$errors = @()
if ($RequireReady -and !$readiness.glasses_display_ready) {
  $errors += "rokid_glasses_display_not_ready"
}

$report = [pscustomobject]@{
  schema = "innerworld-station-pro-glasses-diagnostics/v1"
  generated_at = (Get-Date).ToString("o")
  ok = [bool]($errors.Count -eq 0)
  evidence_kind = if ($RequireReady) { "readiness_gate" } else { "diagnose" }
  require_ready = [bool]$RequireReady
  privacy = [pscustomobject]@{
    full_serials_included = $false
    full_usb_instance_ids_included = $false
    private_ips_included = $false
    mac_addresses_included = $false
    raw_pairing_codes_included = $false
    raw_session_ids_included = $false
    raw_dumpsys_included = $false
    raw_logcat_included = $false
    raw_getprop_included = $false
    note = "Reports store only counts, hints, hashes, package names, and readiness blockers."
  }
  adb = [pscustomobject]@{
    found = $adb.found
    selected_path = $adb.selected_path
    selected_transport = $adb.selected_transport
    selected_device_id_hash_prefix = $adb.selected_device_id_hash_prefix
    devices = $adb.devices
    device_state_count = $adb.device_state_count
  }
  display = $display
  runtime_log = $runtime
  packages = $packages
  services = $services
  rokid_display = $rokidDisplay
  input = $input
  usb = $usb
  properties = $properties
  readiness = $readiness
  errors = @($errors)
}

$jsonPath = Join-Path $OutputRoot "station-pro-glasses-diagnostics-$stamp.json"
$mdPath = Join-Path $OutputRoot "station-pro-glasses-diagnostics-$stamp.md"
$latestJson = Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest.json"
$latestMd = Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest.md"
$kindLatestJson = if ($RequireReady) {
  Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest-readiness-gate.json"
} else {
  Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest-diagnose.json"
}
$kindLatestMd = if ($RequireReady) {
  Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest-readiness-gate.md"
} else {
  Join-Path $OutputRoot "station-pro-glasses-diagnostics-latest-diagnose.md"
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $latestJson -Encoding UTF8
$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $kindLatestJson -Encoding UTF8

$blockerLines = if ($readiness.blocker_ids.Count) { $readiness.blocker_ids | ForEach-Object { "- $_" } } else { @("- none") }
$packageLines = if ($packages.package_names.Count) { $packages.package_names | ForEach-Object { "- $_" } } else { @("- none") }
$markdown = @(
  "# Station Pro Glasses Diagnostics",
  "",
  "- Generated: $($report.generated_at)",
  "- OK: $($report.ok)",
  "- Require ready: $($report.require_ready)",
  "- ADB device count: $($report.adb.device_state_count)",
  "- ADB selected transport: $($report.adb.selected_transport)",
  "- Display count: $($report.display.display_count)",
  "- External display detected: $($report.display.external_display_detected)",
  "- Internal only: $($report.display.internal_only)",
  "- Rokid runtime package installed: $($report.packages.openxr_runtime_package_installed)",
  "- OpenXR runtime service resolves: $($report.services.runtime_service_resolves)",
  "- Rokid display service ready: $($report.readiness.rokid_display_service_ready)",
  "- Rokid display USB display connected: $($report.rokid_display.usb_display_connected)",
  "- Rokid display USB device connected: $($report.rokid_display.usb_device_connected)",
  "- Rokid display DSP connected: $($report.rokid_display.dsp_connected)",
  "- Rokid display psensor hint: $($report.rokid_display.psensor_status_hint)",
  "- Station USB current mode: $($report.usb.current_mode)",
  "- Station USB data role: $($report.usb.current_data_role)",
  "- Station USB functions: $($report.usb.current_functions_hint)",
  "- Station USB role blocks glasses: $($report.usb.station_usb_role_blocks_glasses)",
  "- Rokid glass attach seen in USB history: $($report.usb.rokid_glass_attach_seen)",
  "- Rokid USB product hint: $($report.usb.rokid_product_hint)",
  "- Runtime loaded: $($report.runtime_log.rokid_runtime_loaded)",
  "- Runtime unavailable detected: $($report.runtime_log.runtime_unavailable_detected)",
  "- Glass name failure count: $($report.runtime_log.glass_name_failure_count)",
  "- Head pose failure count: $($report.runtime_log.head_pose_failure_count)",
  "- Glasses display ready: $($report.readiness.glasses_display_ready)",
  "- Hardware-ready claim allowed: false",
  "- Raw dumpsys included: false",
  "- Raw logcat included: false",
  "",
  "## Blockers",
  "",
  $blockerLines,
  "",
  "## Rokid/OpenXR Packages",
  "",
  $packageLines,
  "",
  "## Boundary",
  "",
  "This diagnostic is read-only and only evaluates Station Pro glasses/display detection. It does not install or launch the APK, create calibration observations, mutate mission state, or claim field acceptance."
)
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
$markdown | Set-Content -LiteralPath $latestMd -Encoding UTF8
$markdown | Set-Content -LiteralPath $kindLatestMd -Encoding UTF8

Write-Host ($report | ConvertTo-Json -Depth 8)

if ($errors.Count -gt 0) {
  exit 2
}
