param(
  [string]$ZipPath,
  [string]$ManifestPath,
  [string]$TempRoot = "D:\Downloads\RokidCache\package-audit"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageRoot = Join-Path $root "output\package"

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Add-Failure {
  param([System.Collections.Generic.List[string]]$Failures, [string]$Message)
  $Failures.Add($Message) | Out-Null
}

function Normalize-ZipPath {
  param([string]$Path)
  if ($null -eq $Path) { return $null }
  return $Path -replace '/', '\'
}

function Get-ZipEntry {
  param($Zip, [string]$Path)
  $expected = Normalize-ZipPath -Path $Path
  return $Zip.Entries |
    Where-Object { (Normalize-ZipPath -Path $_.FullName) -eq $expected } |
    Select-Object -First 1
}

function Get-PathLeaf {
  param([object]$Path)
  if ($null -eq $Path) { return $null }
  $value = [string]$Path
  if ([string]::IsNullOrWhiteSpace($value)) { return $null }
  return [System.IO.Path]::GetFileName($value)
}

function Get-LatestServerReleaseName {
  param([string[]]$Entries)
  $releaseNames = @()
  foreach ($entryName in @($Entries)) {
    $normalized = Normalize-ZipPath -Path $entryName
    if ($normalized -match '^output\\server-release\\(innerworld-space-server-\d{8}-\d{6})\.(zip|manifest\.json)$') {
      $releaseNames += $matches[1]
    }
  }
  return @($releaseNames | Sort-Object -Descending -Unique | Select-Object -First 1)
}

function Get-LatestManifest {
  $latest = Get-ChildItem -LiteralPath $packageRoot -Filter "innerworld-rokid-demo-*.manifest.json" -File -Force |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($null -eq $latest) {
    throw "No package manifest found in $packageRoot"
  }
  return $latest.FullName
}

if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
  $ManifestPath = Get-LatestManifest
}
$ManifestPath = (Resolve-Path -LiteralPath $ManifestPath).Path
$manifest = Get-Content -LiteralPath $ManifestPath -Encoding UTF8 | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($ZipPath)) {
  if ($manifest.zip_path) {
    $ZipPath = [string]$manifest.zip_path
  } else {
    $ZipPath = [System.IO.Path]::ChangeExtension($ManifestPath, ".zip")
  }
}
$ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path

$failures = [System.Collections.Generic.List[string]]::new()
$actualHash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash
if ($actualHash -ne $manifest.zip_sha256) {
  Add-Failure $failures "Manifest SHA does not match actual zip SHA."
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
$entries = @()
try {
  $entries = @($zip.Entries | ForEach-Object { $_.FullName })

  $required = @(
    "server\space-server\index.js",
    "server\space-server\check-contract.js",
    "server\space-server\src\domain\hud-generator.js",
    "server\space-server\src\domain\mission-engine.js",
    "server\space-server\src\http\api-router.js",
    "server\space-server\src\http\response.js",
    "server\space-server\src\http\static-files.js",
    "server\space-server\src\ops\status-service.js",
    "server\space-server\src\store\runtime-store.js",
    "server\space-server\capture-rehearsal.js",
    "server\space-server\check-device.js",
    "server\space-server\check-ops.js",
    "apps\web-demo\index.html",
    "shared\innerworld-contract.js",
    "data\hardware_manifest.json",
    "data\space_demo.json",
    "docs\demo-runbook.md",
    "docs\ops-monitor.md",
    "docs\rokid-device-integration.md",
    "docs\server-deploy.md",
    "tools\env-doctor.ps1",
    "tools\deploy-dry-run-server.ps1",
    "tools\field-preflight.ps1",
    "tools\ops-monitor.ps1",
    "tools\ops-monitor-status.ps1",
    "tools\release-index.ps1",
    "tools\server-deploy-plan.ps1",
    "tools\package-server-release.ps1",
    "tools\smoke-server-release.ps1",
    "tools\audit-demo-package.ps1",
    "output\env-doctor\env-doctor-latest.json",
    "output\env-doctor\env-doctor-latest.md",
    "output\field-preflight\field-preflight-latest.json",
    "output\field-preflight\field-preflight-latest.md",
    "output\context\latest-context-handoff.md",
    "output\context\latest-context-handoff.json",
    "output\server-release\deploy-plan-latest.json",
    "output\server-release\deploy-plan-latest.md",
    "output\server-release\deploy-dry-run-latest.json",
    "output\server-release\deploy-dry-run-latest.md",
    "output\demo\rehearsal-evidence-latest.json",
    "output\pdf\rokid_innerworld_field_kit.pdf",
    "pdf-renderer\src\main\java\com\rokid\innerworld\FieldKitPdf.java"
  )
  foreach ($item in $required) {
    if (!($entries -contains $item)) {
      Add-Failure $failures "Missing required entry: $item"
    }
  }

  if ($entries -contains "data\runtime_state.json") {
    Add-Failure $failures "Package contains data/runtime_state.json"
  }

  $normalizedEntries = @($entries | ForEach-Object { Normalize-ZipPath -Path $_ })
  $serverReleaseZipCount = @($normalizedEntries | Where-Object { $_ -like "output\server-release\innerworld-space-server-*.zip" }).Count
  $serverReleaseManifestCount = @($normalizedEntries | Where-Object { $_ -like "output\server-release\innerworld-space-server-*.manifest.json" }).Count
  if ($serverReleaseZipCount -lt 1 -or $serverReleaseManifestCount -lt 1) {
    Add-Failure $failures "Package does not contain a server release zip/manifest pair."
  }
  $latestServerReleaseName = Get-LatestServerReleaseName -Entries $entries

  $forbidden = @($entries | Where-Object { $_ -match '(^|[\\/])(Library|PackageCache|node_modules|\.git|Temp|Obj|target)([\\/]|$)' })
  if ($forbidden.Count -gt 0) {
    Add-Failure $failures "Package contains forbidden entries: $($forbidden[0..([Math]::Min(4, $forbidden.Count - 1))] -join ', ')"
  }

  $deployDryRunEntry = Get-ZipEntry -Zip $zip -Path "output\server-release\deploy-dry-run-latest.json"
  $deployDryRun = $null
  if ($null -eq $deployDryRunEntry) {
    Add-Failure $failures "Package missing output/server-release/deploy-dry-run-latest.json"
  } else {
    New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
    $deployDryRunPath = Join-Path $TempRoot "deploy-dry-run-latest.json"
    if (Test-Path -LiteralPath $deployDryRunPath) { Remove-Item -LiteralPath $deployDryRunPath -Force }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($deployDryRunEntry, $deployDryRunPath, $true)
    $deployDryRun = Get-Content -LiteralPath $deployDryRunPath -Encoding UTF8 | ConvertFrom-Json
    if (!$deployDryRun.ok) {
      Add-Failure $failures "Deploy dry-run latest evidence is not OK."
    }
  }

  $serverZipEntry = if ($latestServerReleaseName) { Get-ZipEntry -Zip $zip -Path "output\server-release\$latestServerReleaseName.zip" } else { $null }
  $serverManifestEntry = if ($latestServerReleaseName) { Get-ZipEntry -Zip $zip -Path "output\server-release\$latestServerReleaseName.manifest.json" } else { $null }
  if ($null -eq $serverZipEntry -or $null -eq $serverManifestEntry) {
    Add-Failure $failures "Latest nested server release zip/manifest is missing."
  } else {
    New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
    $nestedZipPath = Join-Path $TempRoot $serverZipEntry.Name
    $nestedManifestPath = Join-Path $TempRoot $serverManifestEntry.Name
    if (Test-Path -LiteralPath $nestedZipPath) { Remove-Item -LiteralPath $nestedZipPath -Force }
    if (Test-Path -LiteralPath $nestedManifestPath) { Remove-Item -LiteralPath $nestedManifestPath -Force }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($serverZipEntry, $nestedZipPath, $true)
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($serverManifestEntry, $nestedManifestPath, $true)

    $nestedManifest = Get-Content -LiteralPath $nestedManifestPath -Encoding UTF8 | ConvertFrom-Json
    $nestedHash = (Get-FileHash -LiteralPath $nestedZipPath -Algorithm SHA256).Hash
    if ($nestedHash -ne $nestedManifest.zip_sha256) {
      Add-Failure $failures "Latest nested server release SHA does not match nested manifest."
    }
    $nestedRelease = [string]$nestedManifest.release
    if ([string]::IsNullOrWhiteSpace($nestedRelease)) {
      Add-Failure $failures "Latest nested server release manifest is missing release."
    } elseif ($nestedRelease -ne $latestServerReleaseName) {
      Add-Failure $failures "Latest nested server release manifest release does not match its file name."
    }

    if ($deployDryRun) {
      $deployDryRunRelease = [string]$deployDryRun.release
      if ([string]::IsNullOrWhiteSpace($deployDryRunRelease)) {
        Add-Failure $failures "Deploy dry-run release is missing."
      } elseif (![string]::IsNullOrWhiteSpace($nestedRelease) -and $deployDryRunRelease -ne $nestedRelease) {
        Add-Failure $failures "Deploy dry-run release does not match latest nested server release."
      }

      $deployDryRunSha = [string]$deployDryRun.zip_sha256
      if ([string]::IsNullOrWhiteSpace($deployDryRunSha)) {
        Add-Failure $failures "Deploy dry-run zip_sha256 is missing."
      } elseif ($deployDryRunSha -ne $nestedHash) {
        Add-Failure $failures "Deploy dry-run SHA does not match latest nested server release SHA."
      }

      $deployDryRunZipName = Get-PathLeaf -Path $deployDryRun.zip_path
      if ([string]::IsNullOrWhiteSpace($deployDryRunZipName)) {
        Add-Failure $failures "Deploy dry-run zip_path is missing."
      } elseif ($deployDryRunZipName -ne $serverZipEntry.Name) {
        Add-Failure $failures "Deploy dry-run zip_path does not point to the latest nested server release zip."
      }
    }

    $nestedZip = [System.IO.Compression.ZipFile]::OpenRead($nestedZipPath)
    try {
      $nestedEntries = @($nestedZip.Entries | ForEach-Object { $_.FullName })
      foreach ($item in @("server\space-server\index.js", "server\space-server\check-contract.js", "server\space-server\src\domain\hud-generator.js", "server\space-server\src\domain\mission-engine.js", "server\space-server\src\http\api-router.js", "server\space-server\src\http\response.js", "server\space-server\src\http\static-files.js", "server\space-server\src\ops\status-service.js", "server\space-server\src\store\runtime-store.js", "server\space-server\check-device.js", "server\space-server\check-ops.js", "apps\web-demo\index.html", "shared\innerworld-contract.js", "data\hardware_manifest.json", "data\space_demo.json", "README-SERVER.txt", "start-server.ps1", "start-server-lan.ps1", "start-server.sh", "package.json", "SERVER-RELEASE-MANIFEST.json")) {
        if (!($nestedEntries -contains $item)) {
          Add-Failure $failures "Nested server release missing required entry: $item"
        }
      }
      $nestedForbidden = @($nestedEntries | Where-Object { $_ -match '(^|[\\/])(runtime_state\.json|output|node_modules|\.git|Unity|Library|Temp|Obj|target)([\\/]|$)' })
      if ($nestedForbidden.Count -gt 0) {
        Add-Failure $failures "Nested server release contains forbidden entries: $($nestedForbidden[0..([Math]::Min(4, $nestedForbidden.Count - 1))] -join ', ')"
      }
    } finally {
      $nestedZip.Dispose()
    }
  }
} finally {
  $zip.Dispose()
}

if (Test-Path -LiteralPath $TempRoot) {
  Assert-UnderPath -Path $TempRoot -RootPath (Split-Path -Parent $TempRoot)
  Remove-Item -LiteralPath $TempRoot -Recurse -Force
}

$result = [pscustomobject]@{
  ok = ($failures.Count -eq 0)
  package = $ZipPath
  manifest = $ManifestPath
  sha256 = $actualHash
  file_count = $entries.Count
  failures = @($failures)
}
$result | ConvertTo-Json -Depth 6

if ($failures.Count -gt 0) {
  exit 1
}
