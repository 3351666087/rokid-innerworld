param(
  [string]$BaseUrl = "http://127.0.0.1:5177",
  [string]$OutputRoot = "",
  [switch]$SkipDeviceProbe,
  [switch]$SkipApkInspect,
  [switch]$PairSmoke,
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
  $commandsBlock = $commandLines -join "`n"
  $actionsBlock = $actionLines -join "`n"
  $targetBlockersBlock = $targetBlockerLines -join "`n"
  $targetPhysicalBlockersBlock = $targetPhysicalBlockerLines -join "`n"
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

This session runner does not create simulator/manual observations. The operator-plan step only reads /api/field/operator-plan and writes a local command report. Pair-smoke and watch modes only install/launch/pair the APK and observe live/target gates. Mission/service/write-back/User B mutations only happen when the explicit target-pass action switches are used, and those actions remain gated by trusted A2/A3 evidence. Hardware-ready remains false until trusted A1/A2/A3, A3 write-back, User B readback, and /api/field/acceptance are all ready.
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
