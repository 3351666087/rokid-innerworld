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

function Invoke-SmokeJson {
  param([string]$Path)
  return Invoke-RestMethod -Uri "http://127.0.0.1:$Port$Path" -TimeoutSec 3
}

function Assert-ReleaseFieldEndpoints {
  param(
    [object]$OperatorPlan,
    [object]$FieldAcceptance,
    [object]$TargetReadiness
  )

  if ($OperatorPlan.schema -ne "innerworld-field-operator-plan/v1") {
    throw "Release smoke /api/field/operator-plan schema mismatch"
  }
  if ($OperatorPlan.endpoint.path -ne "/api/field/operator-plan") {
    throw "Release smoke operator-plan endpoint path mismatch"
  }
  if ($OperatorPlan.scope_guard.p0_only -ne $true -or $OperatorPlan.scope_guard.campus_wall_only -ne $true -or $OperatorPlan.scope_guard.a1_a2_a3_user_b_only -ne $true) {
    throw "Release smoke operator-plan P0 scope guard missing"
  }
  if ($OperatorPlan.scope_guard.guide_app_or_ppt -ne $false -or $OperatorPlan.scope_guard.phone_page -ne $false -or $OperatorPlan.scope_guard.open_ugc -ne $false -or $OperatorPlan.scope_guard.backend_expansion -ne $false -or $OperatorPlan.scope_guard.broad_route -ne $false) {
    throw "Release smoke operator-plan scope drift guard failed"
  }
  if ($OperatorPlan.readiness.hardware_ready_claim_allowed -ne $false) {
    throw "Release smoke package must not claim hardware-ready without physical field acceptance"
  }

  if ($FieldAcceptance.schema -ne "innerworld-field-acceptance/v1") {
    throw "Release smoke /api/field/acceptance schema mismatch"
  }
  if ($FieldAcceptance.summary.ready_for_hardware -ne $false) {
    throw "Release smoke field acceptance must stay hardware-pending for a fresh package"
  }

  if ($TargetReadiness.schema -ne "innerworld-field-target-readiness/v1") {
    throw "Release smoke /api/field/target-readiness schema mismatch"
  }
  if ($TargetReadiness.hardware_ready_claim_allowed -ne $false -or $TargetReadiness.physical_acceptance_ready -ne $false) {
    throw "Release smoke target readiness must not claim physical acceptance"
  }
}

function Convert-CommandJson {
  param(
    [AllowNull()][object]$Lines,
    [string]$Label
  )
  $text = (@($Lines) -join "`n").Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    throw "$Label did not write JSON to stdout"
  }
  try {
    return $text | ConvertFrom-Json
  } catch {
    throw "$Label stdout was not JSON: $($_.Exception.Message)"
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
$sqlitePath = Join-Path $target "data\innerworld.sqlite"
$runtimeBefore = Test-Path -LiteralPath $runtimePath
$sqliteBefore = Test-Path -LiteralPath $sqlitePath

$oldPort = $env:PORT
$oldHost = $env:HOST
$oldBase = $env:BASE_URL
$env:PORT = [string]$Port
$env:HOST = "127.0.0.1"
$env:BASE_URL = "http://127.0.0.1:$Port"
$server = $null

try {
  Push-Location -LiteralPath $target
  try {
    & npm install --omit=dev --no-audit
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed for server release smoke test"
    }
  } finally {
    Pop-Location
  }

  $server = Start-Process -FilePath "node" `
    -ArgumentList @("server\space-server\index.js") `
    -WorkingDirectory $target `
    -PassThru `
    -WindowStyle Hidden

  $baseUrl = "http://127.0.0.1:$Port"
  $health = $null
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    try {
      $health = Invoke-SmokeJson -Path "/api/health"
      break
    } catch {
    }
  }
  if ($null -eq $health) {
    throw "Server release did not answer /api/health on port $Port"
  }

  $operatorPlan = Invoke-SmokeJson -Path "/api/field/operator-plan"
  $fieldAcceptance = Invoke-SmokeJson -Path "/api/field/acceptance"
  $targetReadiness = Invoke-SmokeJson -Path "/api/field/target-readiness"
  Assert-ReleaseFieldEndpoints -OperatorPlan $operatorPlan -FieldAcceptance $fieldAcceptance -TargetReadiness $targetReadiness

  $livePassOutputRoot = Join-Path $target "field-live-pass-output"
  $livePassLines = & node (Join-Path $root "tools\field-live-pass.js") "--single" "--base-url" $baseUrl "--output-root" $livePassOutputRoot
  if ($LASTEXITCODE -ne 0) {
    throw "field-live-pass package smoke failed"
  }
  $livePass = Convert-CommandJson -Lines $livePassLines -Label "field-live-pass package smoke"
  if ($livePass.check -ne "field-live-pass") {
    throw "field-live-pass package smoke check name mismatch"
  }
  if ($livePass.hardware_a1_a2_a3_ready -ne $false -or $livePass.field_acceptance_ready -ne $false) {
    throw "field-live-pass package smoke must keep hardware acceptance pending"
  }

  $readonly = & node (Join-Path $target "server\space-server\check-readonly.js")
  if ($LASTEXITCODE -ne 0) {
    throw "check-readonly failed for server release"
  }

  $rehearsal = & node (Join-Path $target "server\space-server\capture-rehearsal.js") "--reset-after"
  if ($LASTEXITCODE -ne 0) {
    throw "capture-rehearsal failed for server release"
  }

  $finalHealth = Invoke-SmokeJson -Path "/api/health"

  [pscustomobject]@{
    ok = $true
    zip = $ZipPath
    port = $Port
    runtime_before = $runtimeBefore
    runtime_after = (Test-Path -LiteralPath $runtimePath)
    sqlite_before = $sqliteBefore
    sqlite_after = (Test-Path -LiteralPath $sqlitePath)
    initial_state = $health.mission_state
    initial_beacons = $health.beacon_count
    initial_completed = $health.completed_step_count
    field_operator_plan = [pscustomobject]@{
      schema = $operatorPlan.schema
      current_phase = $operatorPlan.current_phase
      phase_index = $operatorPlan.phase_index
      total_phases = $operatorPlan.total_phases
      hardware_ready_claim_allowed = $operatorPlan.readiness.hardware_ready_claim_allowed
      next_action_count = @($operatorPlan.next_actions).Count
    }
    field_acceptance = [pscustomobject]@{
      schema = $fieldAcceptance.schema
      status = $fieldAcceptance.status
      ready = $fieldAcceptance.ready
      ready_for_hardware = $fieldAcceptance.summary.ready_for_hardware
      blocking_items = @($fieldAcceptance.blocking_items).Count
    }
    target_readiness = [pscustomobject]@{
      schema = $targetReadiness.schema
      precheck_ok = $targetReadiness.precheck_ok
      physical_acceptance_ready = $targetReadiness.physical_acceptance_ready
      hardware_ready_claim_allowed = $targetReadiness.hardware_ready_claim_allowed
    }
    field_live_pass = [pscustomobject]@{
      ok = $livePass.ok
      live_session_ready = $livePass.live_session_ready
      trusted_a1_a2_a3_ready = $livePass.trusted_a1_a2_a3_ready
      hardware_a1_a2_a3_ready = $livePass.hardware_a1_a2_a3_ready
      field_acceptance_ready = $livePass.field_acceptance_ready
      next_action_count = @($livePass.next_required_actions).Count
    }
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
