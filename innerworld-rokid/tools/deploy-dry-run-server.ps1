param(
  [string]$ZipPath,
  [string]$ManifestPath,
  [string]$DeployPlanPath,
  [int]$Port = 5192,
  [string]$DryRunRoot = "D:\Downloads\RokidCache\server-deploy-dry-run"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "output\server-release"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputJson = Join-Path $releaseRoot "deploy-dry-run-$stamp.json"
$outputMd = Join-Path $releaseRoot "deploy-dry-run-$stamp.md"
$latestJson = Join-Path $releaseRoot "deploy-dry-run-latest.json"
$latestMd = Join-Path $releaseRoot "deploy-dry-run-latest.md"

function Add-Issue {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )
  $List.Add($Message) | Out-Null
}

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Get-LatestFile {
  param([string]$Path, [string]$Filter)
  $latest = Get-ChildItem -LiteralPath $Path -Filter $Filter -File -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$latest) { return $null }
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

function Invoke-NodeJson {
  param(
    [string]$ScriptPath,
    [string]$WorkingDirectory,
    [string[]]$Arguments = @()
  )
  Push-Location -LiteralPath $WorkingDirectory
  try {
    $output = & node $ScriptPath @Arguments 2>&1
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    return [pscustomobject]@{
      ok = ($exitCode -eq 0 -and (($output -join "`n") -match '"ok": true'))
      exit_code = $exitCode
      output = ($output | ForEach-Object { "$_" })
    }
  } finally {
    Pop-Location
  }
}

function Test-Health {
  param([string]$Url)
  try {
    $healthUrl = "$($Url.TrimEnd('/'))/api/health"
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
    $body = $response.Content | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      url = $healthUrl
      status_code = [int]$response.StatusCode
      mission_state = $body.mission_state
      beacon_count = $body.beacon_count
      completed_step_count = $body.completed_step_count
      demo_ready = $body.demo_ready
      cache_control = $response.Headers["Cache-Control"]
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      url = "$($Url.TrimEnd('/'))/api/health"
      status_code = $null
      mission_state = $null
      beacon_count = $null
      completed_step_count = $null
      demo_ready = $null
      cache_control = $null
      error = $_.Exception.Message
    }
  }
}

function Test-Sha256Sums {
  param([string]$ExtractRoot)
  $sumPath = Join-Path $ExtractRoot "SHA256SUMS.txt"
  if (!(Test-Path -LiteralPath $sumPath)) {
    return [pscustomobject]@{
      ok = $false
      checked = 0
      failures = @("SHA256SUMS.txt missing")
    }
  }

  $failures = [System.Collections.Generic.List[string]]::new()
  $checked = 0
  foreach ($line in Get-Content -LiteralPath $sumPath -Encoding UTF8) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -notmatch '^([A-Fa-f0-9]{64})\s\s(.+)$') {
      Add-Issue $failures "Malformed SHA line: $line"
      continue
    }
    $expected = $matches[1].ToUpperInvariant()
    $relative = $matches[2]
    if ($relative -eq "SHA256SUMS.txt") { continue }
    $path = Join-Path $ExtractRoot $relative
    if (!(Test-Path -LiteralPath $path)) {
      Add-Issue $failures "Missing hashed file: $relative"
      continue
    }
    $actual = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
    $checked += 1
    if ($actual -ne $expected) {
      Add-Issue $failures "SHA mismatch: $relative"
    }
  }

  return [pscustomobject]@{
    ok = ($failures.Count -eq 0)
    checked = $checked
    failures = @($failures)
  }
}

function Stop-ProcessTree {
  param([int]$ProcessId)
  $children = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ParentProcessId -eq $ProcessId })
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId ([int]$child.ProcessId)
  }
  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Remove-DirectoryWithRetry {
  param(
    [string]$Path,
    [string]$RootPath
  )
  if (!(Test-Path -LiteralPath $Path)) { return }
  Assert-UnderPath -Path $Path -RootPath $RootPath
  for ($i = 0; $i -lt 8; $i++) {
    try {
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
      return
    } catch {
      if ($i -eq 7) { throw }
      Start-Sleep -Milliseconds 300
    }
  }
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
New-Item -ItemType Directory -Force -Path $DryRunRoot | Out-Null

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Get-LatestFile -Path $releaseRoot -Filter "innerworld-space-server-*.manifest.json"
}
if ([string]::IsNullOrWhiteSpace($ManifestPath)) { throw "No server release manifest found in $releaseRoot" }
$ManifestPath = (Resolve-Path -LiteralPath $ManifestPath).Path
$manifest = Get-Content -LiteralPath $ManifestPath -Encoding UTF8 -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($ZipPath)) { $ZipPath = [string]$manifest.zip_path }
if ([string]::IsNullOrWhiteSpace($ZipPath)) { throw "Server release manifest does not contain zip_path." }
$ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path

if ([string]::IsNullOrWhiteSpace($DeployPlanPath)) {
  $DeployPlanPath = Join-Path $releaseRoot "deploy-plan-latest.json"
}
$deployPlan = $null
if (Test-Path -LiteralPath $DeployPlanPath) {
  $DeployPlanPath = (Resolve-Path -LiteralPath $DeployPlanPath).Path
  $deployPlan = Get-Content -LiteralPath $DeployPlanPath -Encoding UTF8 -Raw | ConvertFrom-Json
} else {
  Add-Issue $warnings "Deploy plan JSON is missing: $DeployPlanPath"
}

if ($Port -le 0 -or !(Test-PortFree -PortToCheck $Port)) {
  $Port = Get-FreePort
}

$zipHash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash
if ($manifest.zip_sha256 -and $zipHash -ne [string]$manifest.zip_sha256) {
  Add-Issue $errors "Zip SHA does not match server release manifest."
}
if ($deployPlan) {
  if ($deployPlan.zip_path -and ((Resolve-Path -LiteralPath ([string]$deployPlan.zip_path)).Path -ne $ZipPath)) {
    Add-Issue $errors "Deploy plan zip_path does not match latest manifest zip_path."
  }
  if ($deployPlan.zip_sha256 -and [string]$deployPlan.zip_sha256 -ne $zipHash) {
    Add-Issue $errors "Deploy plan SHA does not match actual server zip SHA."
  }
  if ($deployPlan.release -and [string]$deployPlan.release -ne [string]$manifest.release) {
    Add-Issue $errors "Deploy plan release does not match latest server release manifest."
  }
}

$targetName = "{0}-deploy-dry-run-{1}" -f ([System.IO.Path]::GetFileNameWithoutExtension($ZipPath)), (Get-Date -Format "yyyyMMddHHmmssfff")
$target = Join-Path $DryRunRoot $targetName
$server = $null
$health = $null
$finalHealth = $null
$contractCheck = $null
$deviceCheck = $null
$readonly = $null
$opsCheck = $null
$rehearsal = $null
$shSyntax = [pscustomobject]@{ checked = $false; ok = $null; command = $null; output = @() }
$hashCheck = $null
$requiredMissing = @()
$runtimeBefore = $false
$runtimeAfter = $false
$sqliteBefore = $false
$sqliteAfter = $false

try {
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $target -Force

  $nestedManifestPath = Join-Path $target "SERVER-RELEASE-MANIFEST.json"
  if (!(Test-Path -LiteralPath $nestedManifestPath)) {
    Add-Issue $errors "Extracted release missing SERVER-RELEASE-MANIFEST.json"
  } else {
    $nestedManifest = Get-Content -LiteralPath $nestedManifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
    if ($nestedManifest.release -and [string]$nestedManifest.release -ne [string]$manifest.release) {
      Add-Issue $errors "Extracted SERVER-RELEASE-MANIFEST release does not match outer manifest."
    }
  }

  $required = @(
    "package.json",
    "README-SERVER.txt",
    "start-server.ps1",
    "start-server-lan.ps1",
    "start-server.sh",
    "server\space-server\index.js",
    "server\space-server\check-contract.js",
    "server\space-server\src\domain\hud-generator.js",
    "server\space-server\src\domain\mission-engine.js",
    "server\space-server\src\http\api-router.js",
    "server\space-server\src\http\response.js",
    "server\space-server\src\http\static-files.js",
    "server\space-server\src\ops\status-service.js",
    "server\space-server\src\store\runtime-store.js",
    "server\space-server\check-device.js",
    "server\space-server\check-readonly.js",
    "server\space-server\check-ops.js",
    "server\space-server\capture-rehearsal.js",
    "shared\innerworld-contract.js",
    "apps\web-demo\index.html",
    "data\hardware_manifest.json",
    "data\space_demo.json",
    "ai\schema.json",
    "ai\prompt.md",
    "docs\server-deploy.md"
  )
  $requiredMissing = @($required | Where-Object { !(Test-Path -LiteralPath (Join-Path $target $_)) })
  foreach ($missing in $requiredMissing) {
    Add-Issue $errors "Extracted release missing required file: $missing"
  }

  $runtimePath = Join-Path $target "data\runtime_state.json"
  $sqlitePath = Join-Path $target "data\innerworld.sqlite"
  $runtimeBefore = Test-Path -LiteralPath $runtimePath
  $sqliteBefore = Test-Path -LiteralPath $sqlitePath
  if ($runtimeBefore) {
    Add-Issue $errors "Extracted release unexpectedly contains data/runtime_state.json before first start."
  }
  if ($sqliteBefore) {
    Add-Issue $errors "Extracted release unexpectedly contains data/innerworld.sqlite before first start."
  }

  $hashCheck = Test-Sha256Sums -ExtractRoot $target
  if (!$hashCheck.ok) {
    foreach ($failure in @($hashCheck.failures)) { Add-Issue $errors $failure }
  }

  $bash = Get-Command "bash" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bash) {
    $shOutput = & $bash.Source "-n" (Join-Path $target "start-server.sh") 2>&1
    $shExit = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
    $shSyntax = [pscustomobject]@{
      checked = $true
      ok = ($shExit -eq 0)
      command = "$($bash.Source) -n start-server.sh"
      output = ($shOutput | ForEach-Object { "$_" })
    }
    if (!$shSyntax.ok) {
      Add-Issue $errors "start-server.sh syntax check failed."
    }
  } else {
    Add-Issue $warnings "bash not found; skipped start-server.sh syntax check."
  }

  if ($errors.Count -eq 0) {
    $oldPort = $env:PORT
    $oldHost = $env:HOST
    $oldBase = $env:BASE_URL
    $env:PORT = [string]$Port
    $env:HOST = "127.0.0.1"
    $env:BASE_URL = "http://127.0.0.1:$Port"
    try {
      Push-Location -LiteralPath $target
      try {
        & npm install --omit=dev --no-audit
        if ($LASTEXITCODE -ne 0) {
          Add-Issue $errors "npm install failed for extracted server release."
        }
      } finally {
        Pop-Location
      }

      $server = Start-Process -FilePath "powershell" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ".\start-server.ps1") `
        -WorkingDirectory $target `
        -PassThru `
        -WindowStyle Hidden

      for ($i = 0; $i -lt 48; $i++) {
        Start-Sleep -Milliseconds 250
        $health = Test-Health -Url "http://127.0.0.1:$Port"
        if ($health.ok) { break }
      }
      if ($null -eq $health -or !$health.ok) {
        Add-Issue $errors "Extracted deploy server did not answer /api/health on port $Port."
      } else {
        if ($health.mission_state -ne "entered" -or $health.beacon_count -ne 2 -or $health.completed_step_count -ne 0) {
          Add-Issue $errors "Initial deploy dry-run state is not entered / 2 beacons / 0 completed."
        }
        if ($health.cache_control -ne "no-store") {
          Add-Issue $errors "Deploy dry-run /api/health is missing Cache-Control: no-store."
        }
      }

      if ($errors.Count -eq 0) {
        $contractCheck = Invoke-NodeJson -ScriptPath (Join-Path $target "server\space-server\check-contract.js") -WorkingDirectory $target
        if (!$contractCheck.ok) { Add-Issue $errors "Deploy dry-run check-contract failed." }

        $deviceCheck = Invoke-NodeJson -ScriptPath (Join-Path $target "server\space-server\check-device.js") -WorkingDirectory $target
        if (!$deviceCheck.ok) { Add-Issue $errors "Deploy dry-run check-device failed." }

        $opsCheck = Invoke-NodeJson -ScriptPath (Join-Path $target "server\space-server\check-ops.js") -WorkingDirectory $target
        if (!$opsCheck.ok) { Add-Issue $errors "Deploy dry-run check-ops failed." }

        $readonly = Invoke-NodeJson -ScriptPath (Join-Path $target "server\space-server\check-readonly.js") -WorkingDirectory $target
        if (!$readonly.ok) { Add-Issue $errors "Deploy dry-run check-readonly failed." }

        $rehearsal = Invoke-NodeJson -ScriptPath (Join-Path $target "server\space-server\capture-rehearsal.js") -WorkingDirectory $target -Arguments @("--reset-after")
        if (!$rehearsal.ok) { Add-Issue $errors "Deploy dry-run capture-rehearsal failed." }

        $finalHealth = Test-Health -Url "http://127.0.0.1:$Port"
        if (!$finalHealth.ok) {
          Add-Issue $errors "Deploy dry-run final health failed."
        } elseif ($finalHealth.mission_state -ne "entered" -or $finalHealth.beacon_count -ne 2 -or $finalHealth.completed_step_count -ne 0) {
          Add-Issue $errors "Deploy dry-run did not reset back to clean initial state."
        }
      }
    } finally {
      $env:PORT = $oldPort
      $env:HOST = $oldHost
      $env:BASE_URL = $oldBase
    }
  }

  $runtimeAfter = Test-Path -LiteralPath $runtimePath
  $sqliteAfter = Test-Path -LiteralPath $sqlitePath
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-ProcessTree -ProcessId $server.Id
    $server.WaitForExit(3000) | Out-Null
  }
  Start-Sleep -Milliseconds 300
  if (Test-Path -LiteralPath $target) {
    Remove-DirectoryWithRetry -Path $target -RootPath $DryRunRoot
  }
}

$result = [pscustomobject]@{
  ok = ($errors.Count -eq 0)
  generated_at = (Get-Date).ToString("o")
  root = $root
  release = $manifest.release
  zip_path = $ZipPath
  zip_sha256 = $zipHash
  manifest_path = $ManifestPath
  deploy_plan_path = $DeployPlanPath
  dry_run_root = $DryRunRoot
  port = $Port
  required_missing = @($requiredMissing)
  runtime_before_start = $runtimeBefore
  runtime_after_start = $runtimeAfter
  sqlite_before_start = $sqliteBefore
  sqlite_after_start = $sqliteAfter
  sha256sums = $hashCheck
  sh_syntax = $shSyntax
  initial_health = $health
  contract_check = $contractCheck
  device_check = $deviceCheck
  ops_check = $opsCheck
  readonly = $readonly
  rehearsal = $rehearsal
  final_health = $finalHealth
  warnings = @($warnings)
  errors = @($errors)
}

$result | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $outputJson
Copy-Item -LiteralPath $outputJson -Destination $latestJson -Force

$warningLines = if ($warnings.Count -gt 0) { $warnings | ForEach-Object { "- $_" } } else { @("- None") }
$errorLines = if ($errors.Count -gt 0) { $errors | ForEach-Object { "- $_" } } else { @("- None") }
$md = @"
# InnerWorld Server Deploy Dry Run

- Generated: $($result.generated_at)
- OK: $($result.ok)
- Release: $($result.release)
- Server zip: $ZipPath
- SHA256: $zipHash
- Manifest: $ManifestPath
- Deploy plan: $DeployPlanPath
- Local dry-run URL: http://127.0.0.1:$Port/
- Initial health: $($health.ok), state=$($health.mission_state), beacons=$($health.beacon_count), completed=$($health.completed_step_count)
- Contract check: $($contractCheck.ok)
- Device bootstrap check: $($deviceCheck.ok)
- Ops check: $($opsCheck.ok)
- Final health after rehearsal reset: $($finalHealth.ok), state=$($finalHealth.mission_state), beacons=$($finalHealth.beacon_count), completed=$($finalHealth.completed_step_count)
- SHA256SUMS checked files: $($hashCheck.checked)
- start-server.sh syntax checked: $($shSyntax.checked), ok=$($shSyntax.ok)

## Warnings

$($warningLines -join "`n")

## Errors

$($errorLines -join "`n")
"@
$md | Set-Content -Encoding UTF8 -Path $outputMd
Copy-Item -LiteralPath $outputMd -Destination $latestMd -Force

Write-Output "Server deploy dry-run complete."
Write-Output "OK: $($result.ok)"
Write-Output "Markdown: $outputMd"
Write-Output "JSON: $outputJson"
if ($warnings.Count -gt 0) {
  Write-Output "Warnings:"
  $warnings | ForEach-Object { Write-Output " - $_" }
}
if ($errors.Count -gt 0) {
  Write-Output "Errors:"
  $errors | ForEach-Object { Write-Output " - $_" }
  exit 1
}
