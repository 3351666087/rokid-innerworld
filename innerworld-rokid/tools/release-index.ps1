param(
  [string]$BaseUrl = "http://localhost:5177"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $root "output\release-index"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Add-Issue {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )
  $List.Add($Message) | Out-Null
}

function Read-JsonIfExists {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return $null }
  return Get-Content -LiteralPath $Path -Encoding UTF8 -Raw | ConvertFrom-Json
}

function Get-LatestFile {
  param(
    [string]$Path,
    [string]$Filter
  )
  return Get-ChildItem -LiteralPath $Path -Filter $Filter -File -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Get-FileSummary {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path) -or !(Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      path = $Path
      exists = $false
      size_bytes = 0
      sha256 = $null
      last_write_time = $null
    }
  }
  $item = Get-Item -LiteralPath $Path -Force
  return [pscustomobject]@{
    path = $item.FullName
    exists = $true
    size_bytes = [int64]$item.Length
    sha256 = (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash
    last_write_time = $item.LastWriteTime.ToString("o")
  }
}

function Get-PackageSummary {
  param(
    [string]$ManifestDir,
    [string]$ManifestFilter,
    [string]$FallbackZipFilter
  )
  $manifestFile = Get-LatestFile -Path $ManifestDir -Filter $ManifestFilter
  $manifest = $null
  $zipPath = $null
  if ($manifestFile) {
    $manifest = Read-JsonIfExists -Path $manifestFile.FullName
    if ($manifest.zip_path) {
      $zipPath = [string]$manifest.zip_path
    } else {
      $zipPath = [System.IO.Path]::ChangeExtension($manifestFile.FullName, ".zip")
    }
  } else {
    $zipFile = Get-LatestFile -Path $ManifestDir -Filter $FallbackZipFilter
    if ($zipFile) { $zipPath = $zipFile.FullName }
  }
  $zip = Get-FileSummary -Path $zipPath
  return [pscustomobject]@{
    manifest_path = if ($manifestFile) { $manifestFile.FullName } else { $null }
    manifest = $manifest
    zip = $zip
    manifest_release = if ($manifest -and $manifest.release) { [string]$manifest.release } else { $null }
    manifest_sha256 = if ($manifest -and $manifest.zip_sha256) { [string]$manifest.zip_sha256 } else { $null }
    sha_matches_manifest = if ($manifest -and $manifest.zip_sha256 -and $zip.exists) { $zip.sha256 -eq [string]$manifest.zip_sha256 } else { $null }
  }
}

function Get-PathLeaf {
  param([object]$Path)
  if ($null -eq $Path) { return $null }
  $value = [string]$Path
  if ([string]::IsNullOrWhiteSpace($value)) { return $null }
  return [System.IO.Path]::GetFileName($value)
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
      mission_state = $body.mission_state
      beacon_count = $body.beacon_count
      completed_step_count = $body.completed_step_count
      demo_ready = $body.demo_ready
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
      error = $_.Exception.Message
    }
  }
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$errors = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

$mainPackage = Get-PackageSummary `
  -ManifestDir (Join-Path $root "output\package") `
  -ManifestFilter "innerworld-rokid-demo-*.manifest.json" `
  -FallbackZipFilter "innerworld-rokid-demo-*.zip"
$serverPackage = Get-PackageSummary `
  -ManifestDir (Join-Path $root "output\server-release") `
  -ManifestFilter "innerworld-space-server-*.manifest.json" `
  -FallbackZipFilter "innerworld-space-server-*.zip"

$health = Test-Health -Url $BaseUrl
$envDoctor = Read-JsonIfExists -Path (Join-Path $root "output\env-doctor\env-doctor-latest.json")
$fieldPreflight = Read-JsonIfExists -Path (Join-Path $root "output\field-preflight\field-preflight-latest.json")
$rehearsal = Read-JsonIfExists -Path (Join-Path $root "output\demo\rehearsal-evidence-latest.json")
$deployDryRun = Read-JsonIfExists -Path (Join-Path $root "output\server-release\deploy-dry-run-latest.json")

$artifacts = [pscustomobject]@{
  windows_exe = Get-FileSummary -Path (Join-Path $root "output\unity-windows\InnerWorldRokid.exe")
  android_apk = Get-FileSummary -Path (Join-Path $root "output\unity-android\InnerWorldRokid.apk")
  field_kit_pdf = Get-FileSummary -Path (Join-Path $root "output\pdf\rokid_innerworld_field_kit.pdf")
  rehearsal_latest = Get-FileSummary -Path (Join-Path $root "output\demo\rehearsal-evidence-latest.json")
  env_doctor_latest = Get-FileSummary -Path (Join-Path $root "output\env-doctor\env-doctor-latest.json")
  field_preflight_latest = Get-FileSummary -Path (Join-Path $root "output\field-preflight\field-preflight-latest.json")
  deploy_dry_run_latest = Get-FileSummary -Path (Join-Path $root "output\server-release\deploy-dry-run-latest.json")
}

if (!$mainPackage.zip.exists) { Add-Issue $errors "Main demo package zip is missing." }
if ($mainPackage.sha_matches_manifest -eq $false) { Add-Issue $errors "Main demo package SHA does not match manifest." }
if (!$serverPackage.zip.exists) { Add-Issue $errors "Server-only release zip is missing." }
if ($serverPackage.sha_matches_manifest -eq $false) { Add-Issue $errors "Server-only release SHA does not match manifest." }
if (!$health.ok) { Add-Issue $errors "Local API health is not reachable: $($health.error)" }

foreach ($name in @("windows_exe", "android_apk", "field_kit_pdf", "rehearsal_latest", "env_doctor_latest", "field_preflight_latest")) {
  if (!$artifacts.$name.exists) { Add-Issue $errors "Required artifact is missing: $name" }
}
if (!$artifacts.deploy_dry_run_latest.exists) { Add-Issue $errors "Required artifact is missing: deploy_dry_run_latest" }

if ($envDoctor -and $envDoctor.warnings) {
  foreach ($warning in @($envDoctor.warnings)) { Add-Issue $warnings "env:doctor: $warning" }
}
if ($fieldPreflight -and $fieldPreflight.lan_health -and !$fieldPreflight.lan_health.ok) {
  Add-Issue $warnings "field:preflight: LAN health is not reachable until npm run dev:lan is used."
}
if ($rehearsal -and $rehearsal.final_state) {
  if ($rehearsal.final_state.mission_state -ne "complete") {
    Add-Issue $warnings "Latest rehearsal final state is not complete."
  }
  if ($rehearsal.final_state.beacon_count -ne 3) {
    Add-Issue $warnings "Latest rehearsal beacon_count is not 3."
  }
} else {
  Add-Issue $warnings "Latest rehearsal evidence is missing final_state."
}
if ($deployDryRun) {
  if (!$deployDryRun.ok) {
    Add-Issue $errors "Latest server deploy dry-run is not OK."
  }

  $expectedRelease = $serverPackage.manifest_release
  $actualRelease = [string]$deployDryRun.release
  if ([string]::IsNullOrWhiteSpace($expectedRelease)) {
    Add-Issue $errors "Latest server release manifest is missing release."
  } elseif ([string]::IsNullOrWhiteSpace($actualRelease)) {
    Add-Issue $errors "Latest server deploy dry-run release is missing."
  } elseif ($actualRelease -ne $expectedRelease) {
    Add-Issue $errors "Latest server deploy dry-run release does not match latest server release manifest."
  }

  $expectedSha = if ($serverPackage.zip.exists) { [string]$serverPackage.zip.sha256 } else { $serverPackage.manifest_sha256 }
  $actualSha = [string]$deployDryRun.zip_sha256
  if ([string]::IsNullOrWhiteSpace($actualSha)) {
    Add-Issue $errors "Latest server deploy dry-run zip_sha256 is missing."
  } elseif (![string]::IsNullOrWhiteSpace($expectedSha) -and $actualSha -ne $expectedSha) {
    Add-Issue $errors "Latest server deploy dry-run SHA does not match latest server-only package."
  }

  $expectedZipName = Get-PathLeaf -Path $serverPackage.zip.path
  $actualZipName = Get-PathLeaf -Path $deployDryRun.zip_path
  if ([string]::IsNullOrWhiteSpace($actualZipName)) {
    Add-Issue $errors "Latest server deploy dry-run zip_path is missing."
  } elseif (![string]::IsNullOrWhiteSpace($expectedZipName) -and $actualZipName -ne $expectedZipName) {
    Add-Issue $errors "Latest server deploy dry-run zip_path does not point to latest server-only package."
  }
} else {
  Add-Issue $errors "Latest server deploy dry-run evidence is missing."
}

$result = [pscustomobject]@{
  ok = ($errors.Count -eq 0)
  generated_at = (Get-Date).ToString("o")
  root = $root
  base_url = $BaseUrl
  health = $health
  main_package = $mainPackage
  server_package = $serverPackage
  artifacts = $artifacts
  env_doctor = [pscustomobject]@{
    path = (Join-Path $root "output\env-doctor\env-doctor-latest.json")
    ok = if ($envDoctor) { $envDoctor.ok } else { $false }
    warnings = if ($envDoctor) { @($envDoctor.warnings) } else { @("missing") }
  }
  field_preflight = [pscustomobject]@{
    path = (Join-Path $root "output\field-preflight\field-preflight-latest.json")
    lan_url = if ($fieldPreflight) { $fieldPreflight.lan_url } else { $null }
    lan_health_ok = if ($fieldPreflight -and $fieldPreflight.lan_health) { $fieldPreflight.lan_health.ok } else { $false }
    unity_config_updated = if ($fieldPreflight) { $fieldPreflight.unity_config_updated } else { $false }
    pdf_rendered = if ($fieldPreflight) { $fieldPreflight.pdf_rendered } else { $false }
  }
  rehearsal = [pscustomobject]@{
    path = (Join-Path $root "output\demo\rehearsal-evidence-latest.json")
    mission_state = if ($rehearsal -and $rehearsal.final_state) { $rehearsal.final_state.mission_state } else { $null }
    completed_steps = if ($rehearsal -and $rehearsal.final_state) { $rehearsal.final_state.completed_steps.Count } else { $null }
    beacons = if ($rehearsal -and $rehearsal.final_state) { $rehearsal.final_state.beacon_count } else { $null }
  }
  deploy_dry_run = [pscustomobject]@{
    path = (Join-Path $root "output\server-release\deploy-dry-run-latest.json")
    ok = if ($deployDryRun) { $deployDryRun.ok } else { $false }
    release = if ($deployDryRun) { $deployDryRun.release } else { $null }
    port = if ($deployDryRun) { $deployDryRun.port } else { $null }
    zip_path = if ($deployDryRun) { $deployDryRun.zip_path } else { $null }
    zip_sha256 = if ($deployDryRun) { $deployDryRun.zip_sha256 } else { $null }
    expected_release = $serverPackage.manifest_release
    expected_zip_path = $serverPackage.zip.path
    expected_zip_sha256 = if ($serverPackage.zip.exists) { $serverPackage.zip.sha256 } else { $serverPackage.manifest_sha256 }
  }
  warnings = @($warnings)
  errors = @($errors)
}

$jsonPath = Join-Path $outputRoot "release-index-$stamp.json"
$mdPath = Join-Path $outputRoot "release-index-$stamp.md"
$latestJson = Join-Path $outputRoot "release-index-latest.json"
$latestMd = Join-Path $outputRoot "release-index-latest.md"

$result | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $jsonPath
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$warningLines = if ($warnings.Count -gt 0) { $warnings | ForEach-Object { "- $_" } } else { @("- None") }
$errorLines = if ($errors.Count -gt 0) { $errors | ForEach-Object { "- $_" } } else { @("- None") }
$md = @"
# Rokid Release Index

- Generated: $($result.generated_at)
- OK: $($result.ok)
- Local API: $($health.ok), state=$($health.mission_state), beacons=$($health.beacon_count), completed=$($health.completed_step_count)

## Packages

- Main demo: $($mainPackage.zip.path)
- Main SHA256: $($mainPackage.zip.sha256)
- Server-only: $($serverPackage.zip.path)
- Server SHA256: $($serverPackage.zip.sha256)

## Core Artifacts

- Windows fallback: $($artifacts.windows_exe.path)
- Android APK: $($artifacts.android_apk.path)
- Field kit PDF: $($artifacts.field_kit_pdf.path)
- Rehearsal evidence: $($artifacts.rehearsal_latest.path)
- Env doctor: $($artifacts.env_doctor_latest.path)
- Field preflight: $($artifacts.field_preflight_latest.path)
- Server deploy dry-run: $($artifacts.deploy_dry_run_latest.path)

## Handoff Commands

- Localhost demo: npm run dev
- Field LAN: npm run dev:lan
- Field preflight: npm run field:preflight -- -RequireLan
- Release verification: npm run verify:release
- Server-only smoke: npm run server:smoke
- Server deploy dry-run: npm run server:deploy-dry-run
- Long local monitor: npm run ops:monitor:clean

## Warnings

$($warningLines -join "`n")

## Errors

$($errorLines -join "`n")
"@
$md | Set-Content -Encoding UTF8 -Path $mdPath
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "Release index complete."
Write-Output "OK: $($result.ok)"
Write-Output "Markdown: $mdPath"
Write-Output "JSON: $jsonPath"
if ($warnings.Count -gt 0) {
  Write-Output "Warnings:"
  $warnings | ForEach-Object { Write-Output " - $_" }
}
if ($errors.Count -gt 0) {
  Write-Output "Errors:"
  $errors | ForEach-Object { Write-Output " - $_" }
  exit 1
}
