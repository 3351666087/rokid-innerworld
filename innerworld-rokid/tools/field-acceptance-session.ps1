param(
  [string]$BaseUrl = "http://127.0.0.1:5177",
  [string]$OutputRoot = "",
  [switch]$SkipDeviceProbe,
  [switch]$SkipGlassesDiagnostics,
  [switch]$SkipInputAssist,
  [switch]$SkipInputReadiness,
  [switch]$SkipApkInspect,
  [switch]$PairSmoke,
  [switch]$ApplyInputAssist,
  [switch]$Watch,
  [switch]$TargetPass,
  [switch]$ApplyMissionActions,
  [switch]$ConfirmUserBReadback,
  [switch]$RequireTrusted,
  [switch]$RequireMissionLoop,
  [int]$WatchDurationSec = 120,
  [int]$WatchIntervalSec = 2,
  [int]$CommandTimeoutSec = 180
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\field-acceptance-session"
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
  param([AllowNull()][string]$Text)
  if ($null -eq $Text) { return $null }
  $redacted = "$Text"
  $redacted = $redacted -replace '\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b', '<mac-redacted>'
  $redacted = $redacted -replace '\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b', '<private-ip-redacted>'
  $redacted = $redacted -replace 'USB\\VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4}\\[^\\\s"]+', 'USB\VID_<redacted>&PID_<redacted>\<redacted>'
  $redacted = $redacted -replace '(?i)("?(?:pairing_code|operator_pairing_code|session_id|device_id|raw_id)"?\s*[:=]\s*)"[^"\r\n]*"', '$1"<redacted>"'
  $redacted = $redacted -creplace '\b[A-Z0-9]{4}-[A-Z0-9]{4}\b', '<pairing-code-redacted>'
  return $redacted
}

function Redact-Url {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return $null }
  try {
    $uri = [System.Uri]$Value
    $port = if ($uri.IsDefaultPort) { "" } else { ":$($uri.Port)" }
    if ($uri.Host -match '^(localhost|127\.0\.0\.1|\[::1\])$') {
      return "$($uri.Scheme)://localhost$port"
    }
    if ($uri.Host -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)') {
      return "$($uri.Scheme)://<private-ip-redacted>$port"
    }
    return "$($uri.Scheme)://<host-redacted>$port"
  } catch {
    return "<invalid-url-redacted>"
  }
}

function Get-HostKind {
  param([string]$Value)
  try {
    $uri = [System.Uri]$Value
    if ($uri.Host -match '^(localhost|127\.0\.0\.1|\[::1\])$') { return "localhost" }
    if ($uri.Host -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)') { return "private_lan" }
    return "public_or_hostname"
  } catch {
    return "invalid"
  }
}

function Get-CFreeGB {
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction SilentlyContinue
  if (!$disk) { return $null }
  return [math]::Round(([int64]$disk.FreeSpace) / 1GB, 3)
}

function Join-ProcessArguments {
  param([string[]]$Arguments = @())
  $escaped = foreach ($argument in $Arguments) {
    $value = "$argument"
    if ($value -notmatch '[\s"]') {
      $value
    } else {
      '"' + ($value -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"'
    }
  }
  return ($escaped -join " ")
}

function Get-OutputTail {
  param(
    [AllowNull()][string]$Text,
    [int]$LineCount = 40
  )
  if ([string]::IsNullOrWhiteSpace($Text)) { return @() }
  return @(($Text -split "`r?`n") | Where-Object { $_ -ne "" } | Select-Object -Last $LineCount)
}

function Convert-ToStringArray {
  param([AllowNull()][object]$Value)
  if ($null -eq $Value) { return ,([string[]]@()) }
  $items = New-Object 'System.Collections.Generic.List[string]'
  $queue = New-Object System.Collections.Queue
  [void]$queue.Enqueue($Value)
  while ($queue.Count -gt 0) {
    $item = $queue.Dequeue()
    if ($null -eq $item) { continue }
    if ($item -is [string]) {
      if (![string]::IsNullOrWhiteSpace($item)) {
        [void]$items.Add($item)
      }
      continue
    }
    if ($item -is [System.Collections.IEnumerable]) {
      foreach ($nested in $item) {
        [void]$queue.Enqueue($nested)
      }
      continue
    }
    if (![string]::IsNullOrWhiteSpace("$item")) {
      [void]$items.Add("$item")
    }
  }
  return ,([string[]]($items.ToArray()))
}

function Invoke-ProcessCapture {
  param(
    [string]$Name,
    [string]$FileName,
    [string[]]$Arguments = @(),
    [int]$TimeoutSec = $CommandTimeoutSec
  )

  $started = Get-Date
  $process = $null
  $timedOut = $false
  $safeName = ($Name -replace '[^A-Za-z0-9_.-]', '-')
  $captureRoot = Join-Path $OutputRoot "process-capture"
  New-Item -ItemType Directory -Force -Path $captureRoot | Out-Null
  $outPath = Join-Path $captureRoot "$stamp-$safeName.out"
  $errPath = Join-Path $captureRoot "$stamp-$safeName.err"
  try {
    $argumentLine = Join-ProcessArguments -Arguments $Arguments
    $process = Start-Process `
      -FilePath $FileName `
      -ArgumentList $argumentLine `
      -WorkingDirectory $root `
      -RedirectStandardOutput $outPath `
      -RedirectStandardError $errPath `
      -WindowStyle Hidden `
      -PassThru
    if (!$process.WaitForExit([Math]::Max(1, $TimeoutSec) * 1000)) {
      $timedOut = $true
      try { $process.Kill() } catch {}
    }
    $stdout = if (Test-Path -LiteralPath $outPath) { Get-Content -LiteralPath $outPath -Raw -ErrorAction SilentlyContinue } else { "" }
    $stderr = if (Test-Path -LiteralPath $errPath) { Get-Content -LiteralPath $errPath -Raw -ErrorAction SilentlyContinue } else { "" }
    $exitCode = if ($timedOut) { $null } else { [int]$process.ExitCode }
  } catch {
    $stdout = ""
    $stderr = $_.Exception.Message
    $exitCode = $null
  } finally {
    if ($process) { $process.Dispose() }
  }
  $finished = Get-Date
  $combined = Redact-Text ((@($stdout, $stderr) | Where-Object { $_ }) -join "`n")
  try {
    $combined | Set-Content -Encoding UTF8 -Path $outPath
    "" | Set-Content -Encoding UTF8 -Path $errPath
  } catch {}

  return [pscustomobject]@{
    name = $Name
    ok = [bool](!$timedOut -and $exitCode -eq 0)
    exit_code = $exitCode
    timed_out = [bool]$timedOut
    started_at = $started.ToString("o")
    finished_at = $finished.ToString("o")
    duration_seconds = [math]::Round(($finished - $started).TotalSeconds, 3)
    redacted_text = $combined
    output_tail = @(Get-OutputTail -Text $combined)
  }
}

function Convert-EndpointSummary {
  param(
    [string]$Path,
    [AllowNull()][object]$Body
  )
  if ($null -eq $Body) { return $null }

  if ($Path -eq "/api/health") {
    return [pscustomobject]@{
      ok = [bool]$Body.ok
      service = $Body.service
      mission_state = $Body.mission_state
      beacon_count = [int]($Body.beacon_count)
      completed_step_count = [int]($Body.completed_step_count)
    }
  }

  if ($Path -eq "/api/device/sessions") {
    $sessions = @($Body.sessions)
    $online = @($sessions | Where-Object { $_.session_status -eq "online" })
    $paired = @($sessions | Where-Object { $_.pairing_status -eq "operator_paired" })
    $eligible = @($sessions | Where-Object { $_.hardware_acceptance_eligible -eq $true })
    $latest = @($sessions | Sort-Object { [datetime]$_.created_at } -Descending | Select-Object -First 1)
    return [pscustomobject]@{
      total = [int]($Body.total)
      online_count = $online.Count
      operator_paired_count = $paired.Count
      hardware_acceptance_eligible_count = $eligible.Count
      latest_session_hash_prefix = if ($latest.Count -gt 0) { Get-Sha256Prefix "$($latest[0].session_id)" } else { $null }
      latest_device_hash_prefix = if ($latest.Count -gt 0) { Get-Sha256Prefix "$($latest[0].device_id)" } else { $null }
      raw_session_ids_included = $false
      raw_device_ids_included = $false
    }
  }

  if ($Path -eq "/api/calibration/wall") {
    $summary = $Body.runtime.summary
    return [pscustomobject]@{
      schema = $Body.schema
      ready_for_hardware = [bool]$summary.ready_for_hardware
      rehearsal_ready = [bool]$summary.rehearsal_ready
      calibrated_anchor_ids = @($summary.calibrated_anchor_ids)
      hardware_calibrated_anchor_ids = @($summary.hardware_calibrated_anchor_ids)
      trusted_hardware_calibrated_anchor_ids = @($summary.trusted_hardware_calibrated_anchor_ids)
      untrusted_hardware_anchor_ids = @($summary.untrusted_hardware_anchor_ids)
    }
  }

  if ($Path -eq "/api/field/acceptance") {
    return [pscustomobject]@{
      schema = $Body.schema
      status = $Body.status
      ready = [bool]$Body.ready
      ready_gates = [int]($Body.summary.ready_gates)
      pending_gates = [int]($Body.summary.pending_gates)
      trusted_hardware_evidence_count = [int]($Body.summary.trusted_hardware_evidence_count)
      trusted_hardware_session_count = [int]($Body.summary.trusted_hardware_session_count)
      pending_gate_ids = @($Body.gates | Where-Object { $_.status -eq "pending" } | ForEach-Object { $_.id })
    }
  }

  if ($Path -eq "/api/field/operator-plan") {
    return [pscustomobject]@{
      schema = $Body.schema
      current_phase = $Body.current_phase
      phase_index = [int]($Body.phase_index)
      total_phases = [int]($Body.total_phases)
      precheck_ok = [bool]$Body.readiness.precheck_ok
      live_session_ready = [bool]$Body.readiness.live_session_ready
      trusted_a1_a2_a3_ready = [bool]$Body.readiness.trusted_a1_a2_a3_ready
      mission_loop_ready = [bool]$Body.readiness.mission_loop_ready
      physical_acceptance_ready = [bool]$Body.readiness.physical_acceptance_ready
      hardware_ready_claim_allowed = [bool]$Body.readiness.hardware_ready_claim_allowed
      next_actions = @(Convert-ToStringArray -Value $Body.next_actions)
      missing_trusted_anchor_ids = @(Convert-ToStringArray -Value $Body.sanitized_summary.missing_trusted_anchor_ids)
    }
  }

  if ($Path -eq "/api/state") {
    return [pscustomobject]@{
      active_user = $Body.active_user
      mission_state = $Body.mission_state
      completed_steps = @($Body.completed_steps)
      beacon_count = @($Body.beacons).Count
    }
  }

  return [pscustomobject]@{
    ok = [bool]$Body.ok
    schema = $Body.schema
  }
}

function Invoke-JsonEndpoint {
  param([string]$Path)
  $cleanBase = $BaseUrl.Trim().TrimEnd("/")
  $url = "$cleanBase$Path"
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    $json = $response.Content | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      path = $Path
      status_code = [int]$response.StatusCode
      cache_control = "$($response.Headers["Cache-Control"])"
      summary = Convert-EndpointSummary -Path $Path -Body $json
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      path = $Path
      status_code = $null
      cache_control = $null
      summary = $null
      error = Redact-Text $_.Exception.Message
    }
  }
}

function Convert-JsonOutput {
  param([object]$Command)
  $text = "$($Command.redacted_text)".Trim()
  if ([string]::IsNullOrWhiteSpace($text)) { return $null }
  $first = $text.IndexOf("{")
  $last = $text.LastIndexOf("}")
  if ($first -lt 0 -or $last -lt $first) { return $null }
  try {
    return $text.Substring($first, ($last - $first + 1)) | ConvertFrom-Json
  } catch {
    return $null
  }
}

function New-SkippedCommand {
  param([string]$Name, [string]$Reason)
  $now = (Get-Date).ToString("o")
  return [pscustomobject]@{
    name = $Name
    ok = $true
    exit_code = 0
    timed_out = $false
    started_at = $now
    finished_at = $now
    duration_seconds = 0
    output_tail = @("skipped: $Reason")
  }
}

function Write-SessionMarkdown {
  param(
    [pscustomobject]$Report,
    [string]$Path
  )
  $commandLines = foreach ($command in @($Report.commands)) {
    "- $($command.name): ok=$($command.ok), exit=$($command.exit_code), timed_out=$($command.timed_out), seconds=$($command.duration_seconds)"
  }
  if (!$commandLines) { $commandLines = @("- none") }

  $actionLines = foreach ($action in @($Report.next_required_actions)) {
    "- $action"
  }
  if (!$actionLines) { $actionLines = @("- none") }
  $targetBlockerLines = foreach ($blocker in @($Report.target_pass.blockers)) {
    "- $blocker"
  }
  if (!$targetBlockerLines) { $targetBlockerLines = @("- none") }
  $targetPhysicalBlockerLines = foreach ($blocker in @($Report.target_pass.physical_blockers)) {
    "- $blocker"
  }
  if (!$targetPhysicalBlockerLines) { $targetPhysicalBlockerLines = @("- none") }
  $glassesBlockerLines = foreach ($blocker in @($Report.station_glasses.blocker_ids)) {
    "- $blocker"
  }
  if (!$glassesBlockerLines) { $glassesBlockerLines = @("- none") }
  $commandsBlock = $commandLines -join "`n"
  $actionsBlock = $actionLines -join "`n"
  $targetBlockersBlock = $targetBlockerLines -join "`n"
  $targetPhysicalBlockersBlock = $targetPhysicalBlockerLines -join "`n"
  $glassesBlockersBlock = $glassesBlockerLines -join "`n"
  $operatorActionLines = foreach ($action in @($Report.operator_plan.next_actions)) {
    "- $action"
  }
  if (!$operatorActionLines) { $operatorActionLines = @("- none") }
  $operatorBlockerLines = foreach ($blocker in @($Report.operator_plan.blockers)) {
    "- $blocker"
  }
  if (!$operatorBlockerLines) { $operatorBlockerLines = @("- none") }
  $operatorPhaseLines = foreach ($phase in @($Report.operator_plan.phase_table)) {
    "- $($phase.id): status=$($phase.status), anchor=$($phase.anchor_id), mutates_state=$($phase.mutates_state)"
  }
  if (!$operatorPhaseLines) { $operatorPhaseLines = @("- none") }
  $inputAssistStepLines = foreach ($step in @($Report.station_input_assist.steps)) {
    "- $($step.action): keyevent=$($step.keyevent), mode=$($step.input_mode)"
  }
  if (!$inputAssistStepLines) { $inputAssistStepLines = @("- none") }
  $inputAssistStepsBlock = $inputAssistStepLines -join "`n"
  $fieldInputReadinessBlockerLines = foreach ($blocker in @($Report.field_input_readiness.blockers)) {
    "- $blocker"
  }
  if (!$fieldInputReadinessBlockerLines) { $fieldInputReadinessBlockerLines = @("- none") }
  $fieldInputReadinessBlockersBlock = $fieldInputReadinessBlockerLines -join "`n"
  $operatorActionsBlock = $operatorActionLines -join "`n"
  $operatorBlockersBlock = $operatorBlockerLines -join "`n"
  $operatorPhasesBlock = $operatorPhaseLines -join "`n"

  $md = @"
# Field Acceptance Session

- Generated: $($Report.generated_at)
- OK: $($Report.ok)
- API host kind: $($Report.api.host_kind)
- API base URL: $($Report.api.base_url_redacted)
- C free before: $($Report.disk.c_free_gb_before) GB
- C free after: $($Report.disk.c_free_gb_after) GB
- Pair smoke requested: $($Report.mutating_actions.pair_smoke_requested)
- Watch requested: $($Report.watch.requested)
- Operator plan current phase: $($Report.operator_plan.current_phase) ($($Report.operator_plan.phase_index)/$($Report.operator_plan.total_phases))
- Operator plan command OK: $($Report.operator_plan.command_ok)
- Station glasses display ready: $($Report.station_glasses.glasses_display_ready)
- Station glasses command OK: $($Report.station_glasses.command_ok)
- Station input assist OK: $($Report.station_input_assist.command_ok)
- Station input assist apply requested: $($Report.station_input_assist.apply_requested)
- Real input ready: $($Report.field_input_readiness.real_input_ready)
- Real input blocker count: $($Report.field_input_readiness.blocker_count)
- Live session ready: $($Report.live_pass.live_session_ready)
- Trusted A1/A2/A3 ready: $($Report.live_pass.trusted_a1_a2_a3_ready)
- Mission loop ready: $($Report.live_pass.mission_loop_ready)
- Field acceptance ready: $($Report.live_pass.field_acceptance_ready)
- Target pass requested: $($Report.target_pass.requested)
- Target diagnostics preflight ready: $($Report.target_pass.target_diagnostics_preflight_ready)
- Target precheck OK: $($Report.target_pass.precheck_ok)
- Target physical acceptance ready: $($Report.target_pass.physical_acceptance_ready)
- Target mutating launch matches APK: $($Report.target_pass.mutating_launch_matches_current_apk)
- Target pass command OK: $($Report.target_pass.command_ok)
- Hardware-ready claim allowed: $($Report.hardware_ready_claim_allowed)

## Commands

$commandsBlock

## Station Pro Glasses Diagnostics

- Selected transport: $($Report.station_glasses.selected_transport)
- Selected device hash prefix: $($Report.station_glasses.selected_device_id_hash_prefix)
- ADB device-state count: $($Report.station_glasses.device_state_count)
- Glasses display ready: $($Report.station_glasses.glasses_display_ready)
- External display detected: $($Report.station_glasses.external_display_detected)
- Rokid display service ready: $($Report.station_glasses.rokid_display_service_ready)
- DSP connected: $($Report.station_glasses.dsp_connected)
- Station USB role ready for glasses: $($Report.station_glasses.station_usb_role_ready_for_glasses)
- Station USB mode: $($Report.station_glasses.station_usb_current_mode)
- Station USB data role: $($Report.station_glasses.station_usb_current_data_role)
- Head-pose failure count: $($Report.station_glasses.head_pose_failure_count)
- Hardware-ready claim allowed: $($Report.station_glasses.hardware_ready_claim_allowed)

### Real Input Readiness

- Command OK: $($Report.field_input_readiness.command_ok)
- Real input ready: $($Report.field_input_readiness.real_input_ready)
- Real input frame count: $($Report.field_input_readiness.real_input_frame_count)
- Operator assist frame count: $($Report.field_input_readiness.operator_assist_frame_count)
- Pointable focus count: $($Report.field_input_readiness.pointable_focus_count)
- Confirm ready count: $($Report.field_input_readiness.confirm_ready_count)
- Hardware acceptance evidence: $($Report.field_input_readiness.hardware_acceptance_evidence)

$fieldInputReadinessBlockersBlock

### Station Pro Input Assist

- Command OK: $($Report.station_input_assist.command_ok)
- Apply requested: $($Report.station_input_assist.apply_requested)
- Input mode: $($Report.station_input_assist.input_mode)
- Input blocker: $($Report.station_input_assist.input_blocker)
- Selected transport: $($Report.station_input_assist.selected_transport)
- Selected device hash prefix: $($Report.station_input_assist.selected_device_id_hash_prefix)
- ADB device-state count: $($Report.station_input_assist.device_state_count)
- Sent step count: $($Report.station_input_assist.sent_step_count)
- Readback state OK: $($Report.station_input_assist.readback_state_ok)
- Readback sessions OK: $($Report.station_input_assist.readback_sessions_ok)
- Readback latest active anchor: $($Report.station_input_assist.readback_latest_active_anchor)
- Readback mission state: $($Report.station_input_assist.readback_mission_state)
- Readback proves hardware input: $($Report.station_input_assist.readback_proves_hardware_input)
- Hardware acceptance evidence: $($Report.station_input_assist.hardware_acceptance_evidence)
- Hardware-ready claim allowed: $($Report.station_input_assist.hardware_ready_claim_allowed)

$inputAssistStepsBlock

### Station Pro Glasses Blockers

$glassesBlockersBlock

## Operator Plan

- Current phase: $($Report.operator_plan.current_phase)
- Precheck OK: $($Report.operator_plan.precheck_ok)
- Live session ready: $($Report.operator_plan.live_session_ready)
- Trusted A1/A2/A3 ready: $($Report.operator_plan.trusted_a1_a2_a3_ready)
- Mission loop ready: $($Report.operator_plan.mission_loop_ready)
- Physical acceptance ready: $($Report.operator_plan.physical_acceptance_ready)
- Hardware-ready claim allowed: $($Report.operator_plan.hardware_ready_claim_allowed)

### Operator Plan Next Actions

$operatorActionsBlock

### Operator Plan Phase Table

$operatorPhasesBlock

### Operator Plan Blockers

$operatorBlockersBlock

## Target Pass Blockers

$targetBlockersBlock

## Target Physical Acceptance Blockers

$targetPhysicalBlockersBlock

## Next Required Actions

$actionsBlock

## Boundary

This session runner does not create simulator/manual observations. The Station Pro glasses diagnostics step is read-only display/USB/head-pose evidence and is not A1/A2/A3 field acceptance. The operator-plan step only reads /api/field/operator-plan and writes a local command report. Pair-smoke and watch modes only install/launch/pair the APK and observe live/target gates. Mission/service/write-back/User B mutations only happen when the explicit target-pass action switches are used, and those actions remain gated by trusted A2/A3 evidence. Hardware-ready remains false until trusted A1/A2/A3, A3 write-back, User B readback, and /api/field/acceptance are all ready.
"@
  $md | Set-Content -Encoding UTF8 -Path $Path
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

$BaseUrl = $BaseUrl.Trim().TrimEnd("/")
$cFreeBefore = Get-CFreeGB
$commands = @()
$apiSnapshots = [ordered]@{}
foreach ($path in @("/api/health", "/api/device/sessions", "/api/calibration/wall", "/api/field/acceptance", "/api/field/operator-plan", "/api/state")) {
  $apiSnapshots[$path] = Invoke-JsonEndpoint -Path $path
}

if (!$SkipDeviceProbe) {
  $commands += Invoke-ProcessCapture `
    -Name "device-probe-strict" `
    -FileName "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/device-probe.ps1", "-RequireAdbDevice") `
    -TimeoutSec $CommandTimeoutSec
} else {
  $commands += New-SkippedCommand -Name "device-probe-strict" -Reason "SkipDeviceProbe"
}

if (!$SkipGlassesDiagnostics) {
  $stationGlassesCommand = Invoke-ProcessCapture `
    -Name "station-glasses-diagnostics" `
    -FileName "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/station-pro-glasses-diagnostics.ps1") `
    -TimeoutSec $CommandTimeoutSec
  $commands += $stationGlassesCommand
} else {
  $stationGlassesCommand = New-SkippedCommand -Name "station-glasses-diagnostics" -Reason "SkipGlassesDiagnostics"
  $commands += $stationGlassesCommand
}
$stationGlassesJson = Convert-JsonOutput -Command $stationGlassesCommand

$inputAssistArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/station-pro-field-input-assist.ps1", "-Action", "P0Loop")
if ($ApplyInputAssist) {
  $inputAssistArguments += @("-Apply", "-RequireDevice")
}
if (!$SkipInputAssist) {
  $stationInputAssistCommand = Invoke-ProcessCapture `
    -Name "station-field-input-assist" `
    -FileName "powershell" `
    -Arguments $inputAssistArguments `
    -TimeoutSec $CommandTimeoutSec
  $commands += $stationInputAssistCommand
} else {
  $stationInputAssistCommand = New-SkippedCommand -Name "station-field-input-assist" -Reason "SkipInputAssist"
  $commands += $stationInputAssistCommand
}
$stationInputAssistJson = Convert-JsonOutput -Command $stationInputAssistCommand

if (!$SkipInputReadiness) {
  $fieldInputReadinessCommand = Invoke-ProcessCapture `
    -Name "field-input-readiness" `
    -FileName "node" `
    -Arguments @("tools/field-input-readiness.js", "--base-url=$BaseUrl") `
    -TimeoutSec ([Math]::Min($CommandTimeoutSec, 90))
  $commands += $fieldInputReadinessCommand
} else {
  $fieldInputReadinessCommand = New-SkippedCommand -Name "field-input-readiness" -Reason "SkipInputReadiness"
  $commands += $fieldInputReadinessCommand
}
$fieldInputReadinessJson = Convert-JsonOutput -Command $fieldInputReadinessCommand

if (!$SkipApkInspect) {
  $commands += Invoke-ProcessCapture `
    -Name "station-apk-inspect" `
    -FileName "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/station-pro-apk-smoke.ps1") `
    -TimeoutSec $CommandTimeoutSec
} else {
  $commands += New-SkippedCommand -Name "station-apk-inspect" -Reason "SkipApkInspect"
}

if ($PairSmoke) {
  $commands += Invoke-ProcessCapture `
    -Name "station-apk-pair-smoke" `
    -FileName "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "tools/station-pro-apk-smoke.ps1", "-RequireDevice", "-InstallAndLaunch", "-PairWithOperator", "-ApiBaseUrl", $BaseUrl) `
    -TimeoutSec ([Math]::Max($CommandTimeoutSec, 240))
} else {
  $commands += New-SkippedCommand -Name "station-apk-pair-smoke" -Reason "PairSmoke switch not set"
}

$operatorPlanCommand = Invoke-ProcessCapture `
  -Name "field-operator-plan" `
  -FileName "node" `
  -Arguments @("tools/field-operator-plan.js", "--base-url", $BaseUrl) `
  -TimeoutSec 60
$commands += $operatorPlanCommand
$operatorPlanJson = Convert-JsonOutput -Command $operatorPlanCommand
if ($operatorPlanJson -and $operatorPlanJson.ok -eq $false) {
  $operatorPlanCommand.ok = $false
  if ($null -eq $operatorPlanCommand.exit_code -or $operatorPlanCommand.exit_code -eq 0) {
    $operatorPlanCommand.exit_code = 2
  }
}

$liveArgs = @("tools/field-live-pass.js", "--single", "--base-url", $BaseUrl, "--require-live-session")
if ($RequireTrusted) { $liveArgs += "--require-trusted" }
if ($RequireMissionLoop) { $liveArgs += "--require-mission-loop" }
$livePassCommand = Invoke-ProcessCapture `
  -Name "field-live-pass-single" `
  -FileName "node" `
  -Arguments $liveArgs `
  -TimeoutSec 90
$commands += $livePassCommand
$livePassJson = Convert-JsonOutput -Command $livePassCommand
$livePassReportJson = $null
if ($livePassJson -and $livePassJson.json -and (Test-Path -LiteralPath "$($livePassJson.json)")) {
  try {
    $livePassReportJson = Get-Content -Raw -LiteralPath "$($livePassJson.json)" | ConvertFrom-Json
  } catch {
    $livePassReportJson = $null
  }
}
if ($null -eq $livePassReportJson) {
  $livePassLatestReportPath = Join-Path $root "output\field-live-pass\field-live-pass-latest.json"
  if (Test-Path -LiteralPath $livePassLatestReportPath) {
    try {
      $livePassReportJson = Get-Content -Raw -LiteralPath $livePassLatestReportPath | ConvertFrom-Json
    } catch {
      $livePassReportJson = $null
    }
  }
}
if ($livePassJson -and $livePassJson.ok -eq $false) {
  $livePassCommand.ok = $false
  if ($null -eq $livePassCommand.exit_code -or $livePassCommand.exit_code -eq 0) {
    $livePassCommand.exit_code = 2
  }
}

if ($Watch) {
  $watchArgs = @("tools/field-live-pass.js", "--base-url", $BaseUrl, "--duration-sec", "$WatchDurationSec", "--interval-sec", "$WatchIntervalSec", "--logcat")
  if ($RequireTrusted) { $watchArgs += "--require-trusted" }
  if ($RequireMissionLoop) { $watchArgs += "--require-mission-loop" }
  $commands += Invoke-ProcessCapture `
    -Name "field-live-pass-watch" `
    -FileName "node" `
    -Arguments $watchArgs `
    -TimeoutSec ([Math]::Max(30, $WatchDurationSec + 45))
} else {
  $commands += New-SkippedCommand -Name "field-live-pass-watch" -Reason "Watch switch not set"
}

$targetPassCommand = $null
$targetPassJson = $null
$targetAppliedActions = @()
if ($TargetPass) {
  $targetArgs = @("tools/field-target-pass.js", "--base-url", $BaseUrl, "--require-live-session", "--require-target-diagnostics")
  if ($Watch) {
    $targetArgs += @("--watch", "--duration-sec", "$WatchDurationSec", "--interval-sec", "$WatchIntervalSec", "--logcat")
  } else {
    $targetArgs += "--single"
  }
  if ($ApplyMissionActions) { $targetArgs += "--apply-mission-actions" }
  if ($ConfirmUserBReadback) { $targetArgs += "--confirm-user-b-readback" }
  if ($RequireTrusted) { $targetArgs += "--require-trusted" }
  if ($RequireMissionLoop) { $targetArgs += "--require-mission-loop" }

  $targetPassCommand = Invoke-ProcessCapture `
    -Name "field-target-pass" `
    -FileName "node" `
    -Arguments $targetArgs `
    -TimeoutSec ([Math]::Max(90, $WatchDurationSec + 75))
  $commands += $targetPassCommand
  $targetPassJson = Convert-JsonOutput -Command $targetPassCommand
  if ($targetPassJson -and $targetPassJson.ok -eq $false) {
    $targetPassCommand.ok = $false
    if ($null -eq $targetPassCommand.exit_code -or $targetPassCommand.exit_code -eq 0) {
      $targetPassCommand.exit_code = 2
    }
  }
  if ($targetPassJson -and $targetPassJson.actions) {
    $targetAppliedActions = @($targetPassJson.actions | Where-Object { $_.applied -eq $true })
  }
} else {
  $commands += New-SkippedCommand -Name "field-target-pass" -Reason "TargetPass switch not set"
}

$cFreeAfter = Get-CFreeGB
$commandFailures = @($commands | Where-Object { !$_.ok })
$healthOk = [bool]$apiSnapshots["/api/health"].ok
$livePassOk = [bool]$livePassCommand.ok
$targetPassOk = [bool]($null -eq $targetPassCommand -or $targetPassCommand.ok)
$fieldAcceptanceReady = [bool]($livePassJson -and $livePassJson.field_acceptance_ready -eq $true)
$trustedReady = [bool]($livePassJson -and $livePassJson.trusted_a1_a2_a3_ready -eq $true)
$missionReady = [bool]($livePassJson -and $livePassJson.mission_loop_ready -eq $true)
$hardwareReadyClaimAllowed = [bool]($fieldAcceptanceReady -and $trustedReady -and $missionReady)
$hostHashPrefix = try { Get-Sha256Prefix ([System.Uri]$BaseUrl).Host } catch { $null }

$operatorPlanNextActions = @()
if ($operatorPlanJson -and $operatorPlanJson.next_actions) {
  $operatorPlanNextActions = Convert-ToStringArray -Value $operatorPlanJson.next_actions
}
$livePassNextActions = @()
if ($livePassReportJson -and $livePassReportJson.latest_snapshot.next_required_actions) {
  $actionItems = New-Object 'System.Collections.Generic.List[string]'
  foreach ($action in $livePassReportJson.latest_snapshot.next_required_actions) {
    if ($null -ne $action -and ![string]::IsNullOrWhiteSpace("$action")) {
      [void]$actionItems.Add("$action")
    }
  }
  $livePassNextActions = [string[]]$actionItems.ToArray()
} elseif ($livePassJson -and $livePassJson.next_required_actions) {
  $livePassNextActions = Convert-ToStringArray -Value $livePassJson.next_required_actions
}
$stationGlassesNextActions = @()
$stationInputAssistNextActions = @()
if ($stationGlassesJson -and $stationGlassesJson.readiness -and $stationGlassesJson.readiness.glasses_display_ready -ne $true) {
  $glassesBlockers = Convert-ToStringArray -Value $stationGlassesJson.readiness.blocker_ids
  if ($glassesBlockers.Count -gt 0) {
    $stationGlassesNextActions = @("Resolve Station Pro glasses/display blockers before claiming hardware-ready: $($glassesBlockers -join ', ').")
  } else {
    $stationGlassesNextActions = @("Run Station Pro glasses/display diagnostics until glasses display and head-pose readiness are green.")
  }
}
$nextActionItems = New-Object 'System.Collections.Generic.List[string]'
foreach ($action in $operatorPlanNextActions) {
  if (![string]::IsNullOrWhiteSpace($action) -and !$nextActionItems.Contains($action)) {
    [void]$nextActionItems.Add($action)
  }
}
foreach ($action in $livePassNextActions) {
  if (![string]::IsNullOrWhiteSpace($action) -and !$nextActionItems.Contains($action)) {
    [void]$nextActionItems.Add($action)
  }
}
if ($stationInputAssistCommand.ok -and $stationInputAssistJson -and $stationInputAssistJson.input_blocker -eq "visible_but_no_remote_or_hand") {
  if ($stationInputAssistJson.apply_requested -eq $true) {
    $stationInputAssistNextActions = @("Station Pro field input assist keyevents were applied for rehearsal only; verify real RKInput/PointableUI/hand evidence before hardware-ready.")
  } else {
    $stationInputAssistNextActions = @("Use station:field-input-assist:apply only as operator rehearsal for the visible-but-no-input blocker; it cannot satisfy hardware-ready.")
  }
}
foreach ($action in $stationGlassesNextActions) {
  if (![string]::IsNullOrWhiteSpace($action) -and !$nextActionItems.Contains($action)) {
    [void]$nextActionItems.Add($action)
  }
}
foreach ($action in $stationInputAssistNextActions) {
  if (![string]::IsNullOrWhiteSpace($action) -and !$nextActionItems.Contains($action)) {
    [void]$nextActionItems.Add($action)
  }
}
$nextActions = [string[]]$nextActionItems.ToArray()
if ($nextActions.Count -eq 0) {
  $nextActions = @(
    "Start or keep LAN server running.",
    "Run pair smoke when ready for a mutating Station Pro launch.",
    "Run field-live-pass watch during the physical A1/A2/A3/User B pass."
  )
}

$report = [pscustomobject]@{
  schema = "innerworld-field-acceptance-session/v1"
  generated_at = (Get-Date).ToString("o")
  ok = [bool]($healthOk -and $commandFailures.Count -eq 0 -and $livePassOk)
  api = [pscustomobject]@{
    base_url_redacted = Redact-Url $BaseUrl
    host_kind = Get-HostKind $BaseUrl
    host_hash_prefix = $hostHashPrefix
    endpoints_checked = @($apiSnapshots.Keys)
  }
  disk = [pscustomobject]@{
    c_free_gb_before = $cFreeBefore
    c_free_gb_after = $cFreeAfter
  }
  mutating_actions = [pscustomobject]@{
    pair_smoke_requested = [bool]$PairSmoke
    target_pass_apply_mission_actions_requested = [bool]$ApplyMissionActions
    target_pass_confirm_user_b_readback_requested = [bool]$ConfirmUserBReadback
    simulator_or_manual_observations_created = $false
    mission_or_writeback_mutated = [bool]($targetAppliedActions.Count -gt 0)
  }
  operator_plan = [pscustomobject]@{
    command_ok = [bool]$operatorPlanCommand.ok
    schema = if ($operatorPlanJson) { $operatorPlanJson.schema } else { $null }
    current_phase = if ($operatorPlanJson) { $operatorPlanJson.current_phase } else { $null }
    phase_index = if ($operatorPlanJson) { [int]$operatorPlanJson.phase_index } else { 0 }
    total_phases = if ($operatorPlanJson) { [int]$operatorPlanJson.total_phases } else { 0 }
    precheck_ok = [bool]($operatorPlanJson -and $operatorPlanJson.precheck_ok -eq $true)
    live_session_ready = [bool]($operatorPlanJson -and $operatorPlanJson.live_session_ready -eq $true)
    trusted_a1_a2_a3_ready = [bool]($operatorPlanJson -and $operatorPlanJson.trusted_a1_a2_a3_ready -eq $true)
    mission_loop_ready = [bool]($operatorPlanJson -and $operatorPlanJson.mission_loop_ready -eq $true)
    user_b_readback_ready = [bool]($operatorPlanJson -and $operatorPlanJson.user_b_readback_ready -eq $true)
    physical_acceptance_ready = [bool]($operatorPlanJson -and $operatorPlanJson.physical_acceptance_ready -eq $true)
    hardware_ready_claim_allowed = [bool]($operatorPlanJson -and $operatorPlanJson.hardware_ready_claim_allowed -eq $true)
    missing_trusted_anchor_ids = if ($operatorPlanJson) { Convert-ToStringArray -Value $operatorPlanJson.missing_trusted_anchor_ids } else { Convert-ToStringArray -Value $null }
    write_back_beacon_count = if ($operatorPlanJson) { [int]$operatorPlanJson.write_back_beacon_count } else { 0 }
    next_actions = [string[]]$operatorPlanNextActions
    blockers = if ($operatorPlanJson) { Convert-ToStringArray -Value $operatorPlanJson.blockers } else { Convert-ToStringArray -Value "field_operator_plan_summary_missing" }
    phase_table = if ($operatorPlanJson -and $operatorPlanJson.phase_table) { @($operatorPlanJson.phase_table) } else { @() }
  }
  field_input_readiness = [pscustomobject]@{
    command_ok = [bool]$fieldInputReadinessCommand.ok
    schema = if ($fieldInputReadinessJson) { $fieldInputReadinessJson.schema } else { $null }
    real_input_ready = [bool]($fieldInputReadinessJson -and $fieldInputReadinessJson.real_input_ready -eq $true)
    blocker_count = if ($fieldInputReadinessJson -and $fieldInputReadinessJson.blockers) { @($fieldInputReadinessJson.blockers).Count } else { 0 }
    blockers = if ($fieldInputReadinessJson) { Convert-ToStringArray -Value $fieldInputReadinessJson.blockers } else { Convert-ToStringArray -Value "field_input_readiness_missing" }
    session_count = if ($fieldInputReadinessJson) { [int]$fieldInputReadinessJson.summary.session_count } else { 0 }
    real_input_frame_count = if ($fieldInputReadinessJson) { [int]$fieldInputReadinessJson.summary.real_input_frame_count } else { 0 }
    operator_assist_frame_count = if ($fieldInputReadinessJson) { [int]$fieldInputReadinessJson.summary.operator_assist_frame_count } else { 0 }
    pointable_focus_count = if ($fieldInputReadinessJson) { [int]$fieldInputReadinessJson.summary.pointable_focus_count } else { 0 }
    confirm_ready_count = if ($fieldInputReadinessJson) { [int]$fieldInputReadinessJson.summary.confirm_ready_count } else { 0 }
    hardware_acceptance_evidence = $false
    hardware_ready_claim_allowed = $false
  }
  station_input_assist = [pscustomobject]@{
    command_ok = [bool]$stationInputAssistCommand.ok
    schema = if ($stationInputAssistJson) { $stationInputAssistJson.schema } else { $null }
    apply_requested = [bool]($stationInputAssistJson -and $stationInputAssistJson.apply_requested -eq $true)
    input_mode = if ($stationInputAssistJson) { $stationInputAssistJson.input_mode } else { "operator_assist_rehearsal_not_hardware_ready" }
    input_blocker = if ($stationInputAssistJson) { $stationInputAssistJson.input_blocker } else { "visible_but_no_remote_or_hand" }
    adb_found = [bool]($stationInputAssistJson -and $stationInputAssistJson.adb.found -eq $true)
    selected_transport = if ($stationInputAssistJson) { $stationInputAssistJson.adb.selected_transport } else { $null }
    selected_device_id_hash_prefix = if ($stationInputAssistJson) { $stationInputAssistJson.adb.selected_device_id_hash_prefix } else { $null }
    device_state_count = if ($stationInputAssistJson) { [int]$stationInputAssistJson.adb.device_state_count } else { 0 }
    step_count = if ($stationInputAssistJson -and $stationInputAssistJson.steps) { @($stationInputAssistJson.steps).Count } else { 0 }
    sent_step_count = if ($stationInputAssistJson -and $stationInputAssistJson.sent_steps) { @($stationInputAssistJson.sent_steps).Count } else { 0 }
    steps = if ($stationInputAssistJson -and $stationInputAssistJson.steps) { @($stationInputAssistJson.steps) } else { @() }
    readback_state_ok = [bool]($stationInputAssistJson -and $stationInputAssistJson.readback.after.state_ok -eq $true)
    readback_sessions_ok = [bool]($stationInputAssistJson -and $stationInputAssistJson.readback.after.sessions_ok -eq $true)
    readback_latest_active_anchor = if ($stationInputAssistJson) { $stationInputAssistJson.readback.after.latest_active_anchor } else { $null }
    readback_mission_state = if ($stationInputAssistJson) { $stationInputAssistJson.readback.after.mission_state } else { $null }
    readback_completed_step_delta = if ($stationInputAssistJson) { [int]$stationInputAssistJson.readback.delta.completed_step_delta } else { 0 }
    readback_beacon_delta = if ($stationInputAssistJson) { [int]$stationInputAssistJson.readback.delta.beacon_delta } else { 0 }
    readback_write_back_beacon_delta = if ($stationInputAssistJson) { [int]$stationInputAssistJson.readback.delta.write_back_beacon_delta } else { 0 }
    readback_proves_hardware_input = $false
    hardware_acceptance_evidence = $false
    hardware_ready_claim_allowed = $false
  }
  station_glasses = [pscustomobject]@{
    command_ok = [bool]$stationGlassesCommand.ok
    schema = if ($stationGlassesJson) { $stationGlassesJson.schema } else { $null }
    selected_transport = if ($stationGlassesJson) { $stationGlassesJson.adb.selected_transport } else { $null }
    selected_device_id_hash_prefix = if ($stationGlassesJson) { $stationGlassesJson.adb.selected_device_id_hash_prefix } else { $null }
    device_state_count = if ($stationGlassesJson) { [int]$stationGlassesJson.adb.device_state_count } else { 0 }
    glasses_display_ready = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.glasses_display_ready -eq $true)
    external_display_detected = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.external_display_detected -eq $true)
    rokid_display_service_ready = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.rokid_display_service_ready -eq $true)
    station_usb_role_ready_for_glasses = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.station_usb_role_ready_for_glasses -eq $true)
    runtime_ready = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.runtime_ready -eq $true)
    openxr_runtime_package_ready = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.openxr_runtime_package_ready -eq $true)
    hardware_ready_claim_allowed = [bool]($stationGlassesJson -and $stationGlassesJson.readiness.hardware_ready_claim_allowed -eq $true)
    blocker_ids = if ($stationGlassesJson) { Convert-ToStringArray -Value $stationGlassesJson.readiness.blocker_ids } else { Convert-ToStringArray -Value "station_glasses_diagnostics_missing" }
    display_count = if ($stationGlassesJson) { [int]$stationGlassesJson.display.display_count } else { 0 }
    dsp_connected = [bool]($stationGlassesJson -and $stationGlassesJson.rokid_display.dsp_connected -eq $true)
    usb_display_connected = [bool]($stationGlassesJson -and $stationGlassesJson.rokid_display.usb_display_connected -eq $true)
    usb_device_connected = [bool]($stationGlassesJson -and $stationGlassesJson.rokid_display.usb_device_connected -eq $true)
    station_usb_device_mode = [bool]($stationGlassesJson -and $stationGlassesJson.usb.station_usb_device_mode -eq $true)
    station_usb_host_mode = [bool]($stationGlassesJson -and $stationGlassesJson.usb.station_usb_host_mode -eq $true)
    station_usb_role_blocks_glasses = [bool]($stationGlassesJson -and $stationGlassesJson.usb.station_usb_role_blocks_glasses -eq $true)
    station_usb_current_mode = if ($stationGlassesJson) { $stationGlassesJson.usb.current_mode } else { $null }
    station_usb_current_data_role = if ($stationGlassesJson) { $stationGlassesJson.usb.current_data_role } else { $null }
    head_pose_failure_count = if ($stationGlassesJson) { [int]$stationGlassesJson.runtime_log.head_pose_failure_count } else { 0 }
    raw_dumpsys_included = $false
    raw_logcat_included = $false
    raw_getprop_included = $false
    hardware_acceptance_evidence = $false
  }
  watch = [pscustomobject]@{
    requested = [bool]$Watch
    duration_sec = $WatchDurationSec
    interval_sec = $WatchIntervalSec
  }
  live_pass = [pscustomobject]@{
    command_ok = [bool]$livePassCommand.ok
    live_session_ready = [bool]($livePassJson -and $livePassJson.live_session_ready -eq $true)
    trusted_a1_a2_a3_ready = $trustedReady
    hardware_a1_a2_a3_ready = [bool]($livePassJson -and $livePassJson.hardware_a1_a2_a3_ready -eq $true)
    mission_loop_ready = $missionReady
    field_acceptance_ready = $fieldAcceptanceReady
    user_b_readback_ready = [bool]($livePassJson -and $livePassJson.user_b_readback_ready -eq $true)
    missing_trusted_anchor_ids = if ($livePassJson) { Convert-ToStringArray -Value $livePassJson.missing_trusted_anchor_ids } else { Convert-ToStringArray -Value $null }
    missing_hardware_anchor_ids = if ($livePassJson) { Convert-ToStringArray -Value $livePassJson.missing_hardware_anchor_ids } else { Convert-ToStringArray -Value $null }
    missing_mission_step_ids = if ($livePassJson) { Convert-ToStringArray -Value $livePassJson.missing_mission_step_ids } else { Convert-ToStringArray -Value $null }
    blockers = if ($livePassJson) { Convert-ToStringArray -Value $livePassJson.blockers } else { Convert-ToStringArray -Value "field_live_pass_summary_missing" }
  }
  target_pass = [pscustomobject]@{
    requested = [bool]$TargetPass
    command_ok = $targetPassOk
    precheck_ok = [bool]($targetPassJson -and $targetPassJson.precheck_ok -eq $true)
    physical_acceptance_ready = [bool]($targetPassJson -and $targetPassJson.physical_acceptance_ready -eq $true)
    target_diagnostics_preflight_ready = [bool]($targetPassJson -and $targetPassJson.target_diagnostics_preflight_ready -eq $true)
    mutating_launch_matches_current_apk = [bool]($targetPassJson -and $targetPassJson.mutating_launch_matches_current_apk -eq $true)
    target_diagnostic_tokens_found = [bool]($targetPassJson -and $targetPassJson.target_diagnostic_tokens_found -eq $true)
    live_session_ready = [bool]($targetPassJson -and $targetPassJson.live_session_ready -eq $true)
    trusted_a1_a2_a3_ready = [bool]($targetPassJson -and $targetPassJson.trusted_a1_a2_a3_ready -eq $true)
    mission_loop_ready = [bool]($targetPassJson -and $targetPassJson.mission_loop_ready -eq $true)
    field_acceptance_ready = [bool]($targetPassJson -and $targetPassJson.field_acceptance_ready -eq $true)
    missing_trusted_anchor_ids = if ($targetPassJson) { Convert-ToStringArray -Value $targetPassJson.missing_trusted_anchor_ids } else { Convert-ToStringArray -Value $null }
    missing_mission_step_ids = if ($targetPassJson) { Convert-ToStringArray -Value $targetPassJson.missing_mission_step_ids } else { Convert-ToStringArray -Value $null }
    blockers = if ($targetPassJson) { Convert-ToStringArray -Value $targetPassJson.blockers } else { Convert-ToStringArray -Value $null }
    physical_blockers = if ($targetPassJson) { Convert-ToStringArray -Value $targetPassJson.physical_blockers } else { Convert-ToStringArray -Value $null }
  }
  hardware_ready_claim_allowed = $hardwareReadyClaimAllowed
  next_required_actions = [string[]]$nextActions
  api_snapshots = $apiSnapshots
  commands = @($commands | Select-Object name,ok,exit_code,timed_out,started_at,finished_at,duration_seconds,output_tail)
  privacy = [pscustomobject]@{
    raw_device_ids_included = $false
    raw_usb_instance_ids_included = $false
    raw_pairing_codes_included = $false
    raw_session_ids_included = $false
    private_ips_included = $false
    raw_logcat_included = $false
    raw_dumpsys_included = $false
    raw_getprop_included = $false
    field_input_readiness_hardware_acceptance_evidence = $false
    station_input_assist_hardware_acceptance_evidence = $false
    note = "Command tails are redacted. The runner never writes raw logcat, pairing codes, serials, USB instance ids, MACs, or private IPs."
  }
}

$jsonPath = Join-Path $OutputRoot "field-acceptance-session-$stamp.json"
$mdPath = Join-Path $OutputRoot "field-acceptance-session-$stamp.md"
$latestJson = Join-Path $OutputRoot "field-acceptance-session-latest.json"
$latestMd = Join-Path $OutputRoot "field-acceptance-session-latest.md"

$report | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 -Path $jsonPath
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force
Write-SessionMarkdown -Report $report -Path $mdPath
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output ($report | Select-Object schema,generated_at,ok,hardware_ready_claim_allowed,next_required_actions | ConvertTo-Json -Depth 5)
Write-Output "JSON: $jsonPath"
Write-Output "Markdown: $mdPath"

if (!$report.ok) {
  exit 2
}
