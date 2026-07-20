param(
  [ValidateSet("A1","A2","A3","Confirm","Service","Write","UserB","Reload","Calibrate","P0Loop")]
  [string[]]$Action = @("P0Loop"),
  [string]$AdbPath = "",
  [string]$AdbSerial = "",
  [string]$OutputRoot = "",
  [string]$ApiBaseUrl = "http://127.0.0.1:5177",
  [int]$DelayMs = 450,
  [int]$ReadbackAfterApplySeconds = 2,
  [switch]$Apply,
  [switch]$RequireDevice
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\station-pro-field-input-assist"
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
  return $redacted
}

function Resolve-AdbPath {
  param([string]$RequestedPath)
  if (![string]::IsNullOrWhiteSpace($RequestedPath) -and (Test-Path $RequestedPath)) {
    return (Resolve-Path $RequestedPath).Path
  }

  $candidates = @()
  if (![string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $candidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe") }
  if (![string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) { $candidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe") }
  $candidates += @(
    "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    "C:\Android\platform-tools\adb.exe"
  )

  foreach ($candidate in $candidates) {
    if (![string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }

  $command = Get-Command adb.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $null
}

function Invoke-Capture {
  param(
    [string]$Command,
    [string[]]$Arguments = @(),
    [string[]]$KnownDeviceIds = @()
  )
  try {
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
  }
}

function Get-AdbDevices {
  param([string]$Adb)
  $result = Invoke-Capture -Command $Adb -Arguments @("devices")
  $devices = New-Object 'System.Collections.Generic.List[object]'
  if ($result.ok -and $result.text) {
    foreach ($line in ($result.text -split "`r?`n")) {
      if ($line -match '^([^\s]+)\s+(device|unauthorized|offline)$') {
        $id = $Matches[1]
        $state = $Matches[2]
        $transport = if ($id -match ':\d+$') { "tcp" } else { "usb" }
        [void]$devices.Add([pscustomobject]@{
          id = $id
          state = $state
          transport = $transport
          id_hash_prefix = Get-Sha256Prefix $id
        })
      }
    }
  }
  return [pscustomobject]@{
    command = $result
    devices = @($devices.ToArray())
  }
}

function Select-AdbDevice {
  param(
    [object[]]$Devices,
    [string]$RequestedSerial
  )
  if (![string]::IsNullOrWhiteSpace($RequestedSerial)) {
    foreach ($device in $Devices) {
      if ($device.id -eq $RequestedSerial) { return $device }
    }
    return [pscustomobject]@{
      id = $RequestedSerial
      state = "requested_not_listed"
      transport = if ($RequestedSerial -match ':\d+$') { "tcp" } else { "usb" }
      id_hash_prefix = Get-Sha256Prefix $RequestedSerial
    }
  }

  $ready = @($Devices | Where-Object { $_.state -eq "device" })
  $usb = @($ready | Where-Object { $_.transport -eq "usb" })
  if ($usb.Count -gt 0) { return $usb[0] }
  if ($ready.Count -gt 0) { return $ready[0] }
  return $null
}


function Invoke-ApiJson {
  param(
    [string]$BaseUrl,
    [string]$Path
  )
  $cleanBaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) { "http://127.0.0.1:5177" } else { $BaseUrl.Trim().TrimEnd("/") }
  try {
    $response = Invoke-RestMethod -Method Get -Uri "$cleanBaseUrl$Path" -TimeoutSec 4
    return [pscustomobject]@{ ok = $true; body = $response; error = $null }
  } catch {
    return [pscustomobject]@{ ok = $false; body = $null; error = $_.Exception.Message }
  }
}

function Get-CountSafe {
  param([AllowNull()]$Value)
  if ($null -eq $Value) { return 0 }
  return @($Value).Count
}

function Get-ReadbackSnapshot {
  param([string]$BaseUrl)
  $state = Invoke-ApiJson -BaseUrl $BaseUrl -Path "/api/state"
  $sessions = Invoke-ApiJson -BaseUrl $BaseUrl -Path "/api/device/sessions"
  $sessionRows = if ($sessions.ok -and $sessions.body.sessions) { @($sessions.body.sessions) } else { @() }
  $liveRows = @($sessionRows | Where-Object { $_.session_status -eq "live" -or $_.session_status -eq "active" })
  $pairedRows = @($sessionRows | Where-Object { $_.pairing_status -eq "operator_paired" })
  $latest = if ($sessionRows.Count -gt 0) { $sessionRows[0] } else { $null }
  $runtime = if ($state.ok) { $state.body } else { $null }
  return [pscustomobject]@{
    state_ok = [bool]$state.ok
    sessions_ok = [bool]$sessions.ok
    state_error = if ($state.ok) { $null } else { Redact-Text -Text $state.error }
    sessions_error = if ($sessions.ok) { $null } else { Redact-Text -Text $sessions.error }
    mission_state = if ($runtime) { $runtime.mission_state } else { $null }
    active_user = if ($runtime) { $runtime.active_user } else { $null }
    current_step_index = if ($runtime -and $null -ne $runtime.current_step_index) { [int]$runtime.current_step_index } else { $null }
    completed_step_count = if ($runtime) { Get-CountSafe $runtime.completed_steps } else { 0 }
    beacon_count = if ($runtime) { Get-CountSafe $runtime.beacons } else { 0 }
    write_back_beacon_count = if ($runtime) { Get-CountSafe (@($runtime.beacons) | Where-Object { $_.anchor_id -eq "A3" -or $_.layer -eq "time_capsule" }) } else { 0 }
    device_session_count = $sessionRows.Count
    live_session_count = $liveRows.Count
    paired_session_count = $pairedRows.Count
    latest_session_status = if ($latest) { $latest.session_status } else { $null }
    latest_pairing_status = if ($latest) { $latest.pairing_status } else { $null }
    latest_active_anchor = if ($latest -and $latest.active_anchor) { $latest.active_anchor.anchor_id } else { $null }
    latest_input_command = if ($latest -and $latest.input_frame) { $latest.input_frame.command } else { $null }
    latest_input_blocker = if ($latest -and $latest.input_frame) { $latest.input_frame.input_blocker } else { $null }
    latest_input_acceptance_mode = if ($latest -and $latest.input_frame) { $latest.input_frame.input_acceptance_mode } else { $null }
    raw_session_ids_included = $false
    raw_device_ids_included = $false
  }
}

function Compare-ReadbackSnapshot {
  param(
    [AllowNull()]$Before,
    [AllowNull()]$After
  )
  return [pscustomobject]@{
    mission_state_changed = [bool]($Before -and $After -and $Before.mission_state -ne $After.mission_state)
    active_user_changed = [bool]($Before -and $After -and $Before.active_user -ne $After.active_user)
    active_anchor_changed = [bool]($Before -and $After -and $Before.latest_active_anchor -ne $After.latest_active_anchor)
    completed_step_delta = if ($Before -and $After) { [int]$After.completed_step_count - [int]$Before.completed_step_count } else { 0 }
    beacon_delta = if ($Before -and $After) { [int]$After.beacon_count - [int]$Before.beacon_count } else { 0 }
    write_back_beacon_delta = if ($Before -and $After) { [int]$After.write_back_beacon_count - [int]$Before.write_back_beacon_count } else { 0 }
    live_session_delta = if ($Before -and $After) { [int]$After.live_session_count - [int]$Before.live_session_count } else { 0 }
    proves_hardware_input = $false
  }
}
function Expand-ActionPlan {
  param([string[]]$RequestedActions)
  $map = @{
    A1 = @(@{ action = "A1"; keyevent = 8; label = "select A1 anchor" })
    A2 = @(@{ action = "A2"; keyevent = 9; label = "select A2 anchor" })
    A3 = @(@{ action = "A3"; keyevent = 10; label = "select A3 anchor" })
    Confirm = @(@{ action = "Confirm"; keyevent = 66; label = "confirm / next" })
    Service = @(@{ action = "Service"; keyevent = 47; label = "service action" })
    Write = @(@{ action = "Write"; keyevent = 51; label = "A3 TimeMark write-back" })
    UserB = @(@{ action = "UserB"; keyevent = 30; label = "switch to User B" })
    Reload = @(@{ action = "Reload"; keyevent = 46; label = "reload space" })
    Calibrate = @(@{ action = "Calibrate"; keyevent = 31; label = "manual calibration rehearsal" })
    P0Loop = @(
      @{ action = "A1"; keyevent = 8; label = "select A1 anchor" },
      @{ action = "Confirm"; keyevent = 66; label = "confirm A1 spatial entry" },
      @{ action = "A2"; keyevent = 9; label = "select A2 memory anchor" },
      @{ action = "Confirm"; keyevent = 66; label = "confirm A2 read" },
      @{ action = "Service"; keyevent = 47; label = "service action" },
      @{ action = "A3"; keyevent = 10; label = "select A3 write-back anchor" },
      @{ action = "Write"; keyevent = 51; label = "A3 TimeMark write-back" },
      @{ action = "UserB"; keyevent = 30; label = "switch to User B readback" }
    )
  }

  $steps = New-Object 'System.Collections.Generic.List[object]'
  foreach ($name in $RequestedActions) {
    foreach ($step in @($map[$name])) {
      [void]$steps.Add([pscustomobject]@{
        action = $step.action
        keyevent = [int]$step.keyevent
        label = $step.label
        input_mode = "operator_assist_rehearsal_not_hardware_ready"
      })
    }
  }
  return @($steps.ToArray())
}

function Write-ReportMarkdown {
  param(
    [object]$Report,
    [string]$Path
  )
  $stepLines = foreach ($step in @($Report.steps)) {
    "- $($step.action): keyevent $($step.keyevent) - $($step.label)"
  }
  if (!$stepLines) { $stepLines = @("- none") }
  $lines = @(
    "# Station Pro Field Input Assist",
    "",
    "Generated: $($Report.generated_at)",
    "",
    "- OK: $($Report.ok)",
    "- Apply requested: $($Report.apply_requested)",
    "- ADB found: $($Report.adb.found)",
    "- Selected transport: $($Report.adb.selected_transport)",
    "- Selected device hash: $($Report.adb.selected_device_id_hash_prefix)",
    "- Input mode: $($Report.input_mode)",
    "- Input blocker: $($Report.input_blocker)",
    "- Hardware acceptance evidence: $($Report.hardware_acceptance_evidence)",
    "- Hardware-ready claim allowed: $($Report.hardware_ready_claim_allowed)",
    "- Readback state OK: $($Report.readback.after.state_ok)",
    "- Readback sessions OK: $($Report.readback.after.sessions_ok)",
    "- Readback latest active anchor: $($Report.readback.after.latest_active_anchor)",
    "- Readback mission state: $($Report.readback.after.mission_state)",
    "- Readback hardware evidence: $($Report.readback.hardware_acceptance_evidence)",
    "",
    "## Steps",
    "",
    ($stepLines -join "`n"),
    "",
    "## Privacy",
    "",
    "Raw ADB serials, private IPs, pairing codes, and raw dumps are not written. Device identifiers are represented only by hash prefix."
  )
  $lines -join "`n" | Set-Content -Path $Path -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$adb = Resolve-AdbPath -RequestedPath $AdbPath
$deviceProbe = if ($adb) { Get-AdbDevices -Adb $adb } else { [pscustomobject]@{ command = $null; devices = @() } }
$selectedDevice = if ($adb) { Select-AdbDevice -Devices @($deviceProbe.devices) -RequestedSerial $AdbSerial } else { $null }
$knownIds = @($deviceProbe.devices | ForEach-Object { $_.id })
if (![string]::IsNullOrWhiteSpace($AdbSerial)) { $knownIds += $AdbSerial }
$steps = Expand-ActionPlan -RequestedActions $Action
$readbackBefore = Get-ReadbackSnapshot -BaseUrl $ApiBaseUrl
$sent = New-Object 'System.Collections.Generic.List[object]'
$ok = $true

if (!$adb) { $ok = $false }
if ($RequireDevice -and (!$selectedDevice -or $selectedDevice.state -ne "device")) { $ok = $false }

if ($Apply -and $adb -and $selectedDevice -and $selectedDevice.state -eq "device") {
  foreach ($step in $steps) {
    $args = @("-s", $selectedDevice.id, "shell", "input", "keyevent", "$($step.keyevent)")
    $result = Invoke-Capture -Command $adb -Arguments $args -KnownDeviceIds $knownIds
    if (!$result.ok) { $ok = $false }
    [void]$sent.Add([pscustomobject]@{
      action = $step.action
      keyevent = $step.keyevent
      ok = [bool]$result.ok
      exit_code = $result.exit_code
      output_tail = if ($result.text) { ($result.text -split "`r?`n" | Select-Object -Last 3) -join "`n" } else { "" }
    })
    Start-Sleep -Milliseconds ([Math]::Max(0, $DelayMs))
  }
} elseif ($Apply) {
  $ok = $false
}
if ($Apply -and $ReadbackAfterApplySeconds -gt 0) {
  Start-Sleep -Seconds $ReadbackAfterApplySeconds
}
$readbackAfter = Get-ReadbackSnapshot -BaseUrl $ApiBaseUrl
$readbackDelta = Compare-ReadbackSnapshot -Before $readbackBefore -After $readbackAfter

$report = [pscustomobject]@{
  schema = "innerworld-station-pro-field-input-assist/v1"
  generated_at = (Get-Date).ToString("o")
  ok = [bool]$ok
  apply_requested = [bool]$Apply
  input_mode = "operator_assist_rehearsal_not_hardware_ready"
  input_blocker = "visible_but_no_remote_or_hand"
  hardware_acceptance_evidence = $false
  hardware_ready_claim_allowed = $false
  simulator_or_manual_observations_created = $false
  mission_or_writeback_mutated_by_script = $false
  adb = [pscustomobject]@{
    found = [bool]$adb
    path = if ($adb) { Split-Path -Leaf $adb } else { $null }
    device_state_count = @($deviceProbe.devices | Where-Object { $_.state -eq "device" }).Count
    selected_transport = if ($selectedDevice) { $selectedDevice.transport } else { $null }
    selected_device_id_hash_prefix = if ($selectedDevice) { $selectedDevice.id_hash_prefix } else { $null }
  }
  requested_actions = @($Action)
  steps = @($steps)
  sent_steps = @($sent.ToArray())
  readback = [pscustomobject]@{
    api_base_url_redacted = Redact-Text -Text $ApiBaseUrl
    before = $readbackBefore
    after = $readbackAfter
    delta = $readbackDelta
    hardware_acceptance_evidence = $false
    note = "Readback only checks whether Space API summaries changed after ADB keyevents; it does not prove real RKInput/PointableUI/hand input."
  }
  privacy = [pscustomobject]@{
    raw_device_ids_included = $false
    private_ips_included = $false
    raw_pairing_codes_included = $false
    raw_logcat_included = $false
    raw_dumpsys_included = $false
    raw_session_ids_included = $false
  }
}

$jsonPath = Join-Path $OutputRoot "station-pro-field-input-assist-$stamp.json"
$mdPath = Join-Path $OutputRoot "station-pro-field-input-assist-$stamp.md"
$latestJsonPath = Join-Path $OutputRoot "station-pro-field-input-assist-latest.json"
$latestMdPath = Join-Path $OutputRoot "station-pro-field-input-assist-latest.md"
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $latestJsonPath -Encoding UTF8
Write-ReportMarkdown -Report $report -Path $mdPath
Write-ReportMarkdown -Report $report -Path $latestMdPath
$report | ConvertTo-Json -Depth 8
Write-Host "JSON: $jsonPath" -ForegroundColor DarkGray
Write-Host "Markdown: $mdPath" -ForegroundColor DarkGray

if (!$ok) { exit 1 }