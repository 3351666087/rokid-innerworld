param(
  [switch]$SkipCacheClean,
  [string]$DCacheRoot = "D:\Downloads\RokidCache",
  [int]$WarnFreeGB = 25,
  [int]$StopFreeGB = 8,
  [int]$KeepPackages = 2
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageRoot = Join-Path $root "output\package"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "innerworld-rokid-demo-$stamp"
$stagingRoot = Join-Path $packageRoot "staging"
$staging = Join-Path $stagingRoot $packageName
$zipPath = Join-Path $packageRoot "$packageName.zip"
$manifestPath = Join-Path $packageRoot "$packageName.manifest.json"

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Get-CFreeGB {
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
  return Format-GB ([int64]$disk.FreeSpace)
}

function Get-DirectorySize {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return 0 }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [int64]$sum
}

function Write-CacheReport {
  param([string]$Path)
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools\cache-clean.ps1") -DCacheRoot $DCacheRoot |
    Set-Content -Encoding UTF8 -Path $Path
}

function Copy-Directory {
  param([string]$Source, [string]$Destination)
  if (!(Test-Path -LiteralPath $Source)) {
    Write-Warning "Skipping missing directory: $Source"
    return
  }
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
  }
}

function Copy-FileIfExists {
  param([string]$Source, [string]$Destination)
  if (!(Test-Path -LiteralPath $Source)) {
    Write-Warning "Skipping missing file: $Source"
    return
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Remove-OldPackages {
  param([string]$Path, [int]$Keep)
  if ($Keep -lt 1) { return }
  if (!(Test-Path -LiteralPath $Path)) { return }

  $groups = Get-ChildItem -LiteralPath $Path -File -Force |
    Where-Object { $_.Name -match '^(innerworld-rokid-demo-\d{8}-\d{6})\.' } |
    Group-Object { [regex]::Match($_.Name, '^(innerworld-rokid-demo-\d{8}-\d{6})\.').Groups[1].Value } |
    Sort-Object { ($_.Group | Measure-Object LastWriteTime -Maximum).Maximum } -Descending

  $groups | Select-Object -Skip $Keep | ForEach-Object {
    foreach ($file in $_.Group) {
      Assert-UnderPath -Path $file.FullName -RootPath $Path
      Remove-Item -LiteralPath $file.FullName -Force
    }
  }
}

New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
if (Test-Path -LiteralPath $stagingRoot) {
  Assert-UnderPath -Path $stagingRoot -RootPath $packageRoot
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

Remove-OldPackages -Path $packageRoot -Keep $KeepPackages
New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null

if (Test-Path -LiteralPath $staging) {
  Assert-UnderPath -Path $staging -RootPath $stagingRoot
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $staging | Out-Null

$beforeFree = Get-CFreeGB
Write-Output "C drive free before packaging: $beforeFree GB"
if ($beforeFree -lt $StopFreeGB) {
  throw "C drive free space is below $StopFreeGB GB. Run npm run cache:clean or move large artifacts to D: before packaging."
}
if ($beforeFree -lt $WarnFreeGB) {
  Write-Warning "C drive free space is below $WarnFreeGB GB. Cache cleanup will be run unless -SkipCacheClean is set."
}

$cacheBefore = Join-Path $packageRoot "$packageName.cache-before.txt"
Write-CacheReport -Path $cacheBefore

if (!$SkipCacheClean) {
  $cleanupLog = Join-Path $packageRoot "$packageName.cache-clean.txt"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "tools\cache-clean.ps1") -Apply -DCacheRoot $DCacheRoot |
    Set-Content -Encoding UTF8 -Path $cleanupLog
}

$afterCleanFree = Get-CFreeGB
Write-Output "C drive free after cache pass: $afterCleanFree GB"
if ($afterCleanFree -lt $StopFreeGB) {
  throw "C drive free space is still below $StopFreeGB GB after cache pass."
}

$copyMap = @(
  @{ Source = "ai"; Destination = "ai" },
  @{ Source = "apps\web-demo"; Destination = "apps\web-demo" },
  @{ Source = "apps\unity-shell\Assets"; Destination = "apps\unity-shell\Assets" },
  @{ Source = "apps\unity-shell\Packages"; Destination = "apps\unity-shell\Packages" },
  @{ Source = "apps\unity-shell\ProjectSettings"; Destination = "apps\unity-shell\ProjectSettings" },
  @{ Source = "data"; Destination = "data" },
  @{ Source = "docs"; Destination = "docs" },
  @{ Source = "server\space-server"; Destination = "server\space-server" },
  @{ Source = "shared"; Destination = "shared" },
  @{ Source = "tools"; Destination = "tools" },
  @{ Source = "output\demo"; Destination = "output\demo" },
  @{ Source = "output\env-doctor"; Destination = "output\env-doctor" },
  @{ Source = "output\field-preflight"; Destination = "output\field-preflight" },
  @{ Source = "output\context"; Destination = "output\context" },
  @{ Source = "output\pdf"; Destination = "output\pdf" },
  @{ Source = "output\server-release"; Destination = "output\server-release" },
  @{ Source = "..\pdf-renderer\src"; Destination = "pdf-renderer\src" },
  @{ Source = "output\unity-windows"; Destination = "output\unity-windows" }
)

foreach ($item in $copyMap) {
  Copy-Directory -Source (Join-Path $root $item.Source) -Destination (Join-Path $staging $item.Destination)
}

$runtimeStateInPackage = Join-Path $staging "data\runtime_state.json"
if (Test-Path -LiteralPath $runtimeStateInPackage) {
  Assert-UnderPath -Path $runtimeStateInPackage -RootPath $staging
  Remove-Item -LiteralPath $runtimeStateInPackage -Force
}

Copy-FileIfExists -Source (Join-Path $root "apps\unity-shell\README.md") -Destination (Join-Path $staging "apps\unity-shell\README.md")
Copy-FileIfExists -Source (Join-Path $root "output\unity-android\InnerWorldRokid.apk") -Destination (Join-Path $staging "output\unity-android\InnerWorldRokid.apk")
Copy-FileIfExists -Source (Join-Path $root "package.json") -Destination (Join-Path $staging "package.json")
Copy-FileIfExists -Source (Join-Path $root "README.md") -Destination (Join-Path $staging "README.md")
Copy-FileIfExists -Source (Join-Path $root "..\pdf-renderer\pom.xml") -Destination (Join-Path $staging "pdf-renderer\pom.xml")
Copy-FileIfExists -Source (Join-Path $root "start-lan.ps1") -Destination (Join-Path $staging "start-lan.ps1")
Copy-FileIfExists -Source (Join-Path $root "start-localhost.ps1") -Destination (Join-Path $staging "start-localhost.ps1")
Copy-FileIfExists -Source $cacheBefore -Destination (Join-Path $staging "output\package-cache\cache-before.txt")
if (Test-Path -LiteralPath (Join-Path $packageRoot "$packageName.cache-clean.txt")) {
  Copy-FileIfExists -Source (Join-Path $packageRoot "$packageName.cache-clean.txt") -Destination (Join-Path $staging "output\package-cache\cache-clean.txt")
}

$cacheAfter = Join-Path $packageRoot "$packageName.cache-after.txt"
Write-CacheReport -Path $cacheAfter
Copy-FileIfExists -Source $cacheAfter -Destination (Join-Path $staging "output\package-cache\cache-after.txt")

$forbiddenEntries = Get-ChildItem -LiteralPath $staging -Recurse -Force | Where-Object {
  $relative = $_.FullName.Substring($staging.Length + 1)
  $relative -match '(^|\\)(Library|PackageCache|node_modules|\.git|Temp|Obj)(\\|$)' -or
    $relative -match '(^|\\)RokidCache(\\|$)' -or
    $relative -match '(^|\\)UnityHubDownloads(\\|$)'
}
if ($forbiddenEntries) {
  $sample = ($forbiddenEntries | Select-Object -First 10 | ForEach-Object { $_.FullName }) -join "`n"
  throw "Refusing to package cache or intermediate build paths. Sample:`n$sample"
}

$stagingBytes = Get-DirectorySize -Path $staging
$stagingGB = Format-GB $stagingBytes
Write-Output "Staged package input size: $stagingGB GB"
if ($stagingBytes -gt 5GB) {
  throw "Package input is larger than 5 GB. This usually means cache or build intermediates were included by mistake."
}
if ($stagingBytes -gt 1GB) {
  Write-Warning "Package input is larger than 1 GB. Verify no cache folders were included."
}

$readmePackage = @"
InnerWorld Rokid Demo Package
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")

Run localhost:
  powershell -NoProfile -ExecutionPolicy Bypass -File start-localhost.ps1
  open http://localhost:5177/

Run checks:
  npm run reset
  npm run check:contract
  npm run check:device
  npm run check:readonly
  npm run check:ops
  npm run check:unity
  npm run env:doctor
  npm run ops:monitor:once
  npm run evidence:rehearsal -- --reset-after
  npm run field:preflight
  npm run pdf:fieldkit
  npm run release:index
  npm run server:package
  npm run server:deploy-plan
  npm run server:deploy-dry-run
  npm run server:smoke
  npm run package:audit

Run Windows fallback:
  output\unity-windows\InnerWorldRokid.exe

Android fallback APK:
  output\unity-android\InnerWorldRokid.apk

Printable field kit:
  output\pdf\rokid_innerworld_field_kit.pdf

Field LAN preflight:
  npm run dev:lan
  npm run field:preflight -- -RequireLan
  output\field-preflight\field-preflight-latest.md

Environment doctor:
  npm run env:doctor
  output\env-doctor\env-doctor-latest.md

Ops monitor:
  npm run ops:monitor:once
  npm run ops:monitor:clean:once
  npm run ops:monitor
  npm run ops:monitor:clean
  npm run ops:monitor:status
  output\ops-monitor\ops-monitor-latest.md

Release index:
  npm run release:index
  output\release-index\release-index-latest.md

Server release:
  output\server-release\innerworld-space-server-*.zip
  output\server-release\deploy-plan-latest.md
  output\server-release\deploy-dry-run-latest.md

Rokid device bootstrap:
  npm run check:device
  http://localhost:5177/api/device/bootstrap
  docs\rokid-device-integration.md

Cache safety:
  Cache reports are in output\package-cache.
  Run npm run cache:report frequently.
  Run npm run ops:monitor:clean during long local build sessions.
  Run npm run cache:clean before/after Unity, Android, or package builds.
  Keep large reusable downloads in D:\Downloads\RokidCache.

Runtime state:
  data\runtime_state.json is intentionally excluded from the package.
  The Space Server regenerates it on first run so every package starts from a clean entered state.
"@
$readmePackage | Set-Content -Encoding UTF8 -Path (Join-Path $staging "README-PACKAGE.txt")

$files = Get-ChildItem -LiteralPath $staging -Recurse -File | Sort-Object FullName
$hashRows = foreach ($file in $files) {
  $rel = $file.FullName.Substring($staging.Length + 1)
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  "$hash  $rel"
}
$hashRows | Set-Content -Encoding UTF8 -Path (Join-Path $staging "SHA256SUMS.txt")

$manifest = [pscustomobject]@{
  package = $packageName
  generated_at = (Get-Date).ToString("o")
  root = $root
  zip_path = $zipPath
  zip_sha256 = $null
  c_drive_free_gb_before = $beforeFree
  c_drive_free_gb_after_cache = $afterCleanFree
  c_drive_free_gb_after_package = $null
  warn_free_gb = $WarnFreeGB
  stop_free_gb = $StopFreeGB
  staging_size_gb = $stagingGB
  d_cache_root = $DCacheRoot
  cache_clean_ran = !$SkipCacheClean
  included = @(
    "ai",
    "apps/web-demo",
    "apps/unity-shell/Assets",
    "apps/unity-shell/Packages",
    "apps/unity-shell/ProjectSettings",
    "data",
    "docs",
    "server/space-server",
    "shared",
    "tools",
    "start-lan.ps1",
    "start-localhost.ps1",
    "output/demo",
    "output/env-doctor",
    "output/field-preflight",
    "output/context",
    "output/pdf",
    "output/server-release",
    "pdf-renderer/pom.xml",
    "pdf-renderer/src",
    "output/unity-windows",
    "output/unity-android/InnerWorldRokid.apk"
  )
  excluded = @(
    "apps/unity-shell/Library",
    "apps/unity-shell/Temp",
    "apps/unity-shell/Logs",
    "data/runtime_state.json",
    "previous output/package zips",
    "node_modules"
  )
  file_count = $files.Count + 1
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path (Join-Path $staging "PACKAGE-MANIFEST.json")

if (Test-Path -LiteralPath $zipPath) {
  Assert-UnderPath -Path $zipPath -RootPath $packageRoot
  Remove-Item -LiteralPath $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $staging,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$afterPackageFree = Get-CFreeGB
$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$manifest.c_drive_free_gb_after_package = $afterPackageFree
$manifest.zip_sha256 = $zipHash
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path $manifestPath

Write-Output "Package created: $zipPath"
Write-Output "Package SHA256: $zipHash"
Write-Output "Manifest: $manifestPath"
Write-Output "C drive free after packaging: $afterPackageFree GB"
if ($afterPackageFree -lt $WarnFreeGB) {
  Write-Warning "C drive free space remains below $WarnFreeGB GB. Run npm run cache:clean frequently and avoid placing large installers on C:."
}

if (Test-Path -LiteralPath $stagingRoot) {
  Assert-UnderPath -Path $stagingRoot -RootPath $packageRoot
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

Remove-OldPackages -Path $packageRoot -Keep $KeepPackages
