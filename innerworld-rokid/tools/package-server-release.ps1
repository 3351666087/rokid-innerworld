param(
  [int]$Port = 5177,
  [int]$KeepReleases = 3
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "output\server-release"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$releaseName = "innerworld-space-server-$stamp"
$stagingRoot = Join-Path $releaseRoot "staging"
$staging = Join-Path $stagingRoot $releaseName
$zipPath = Join-Path $releaseRoot "$releaseName.zip"
$manifestPath = Join-Path $releaseRoot "$releaseName.manifest.json"

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Get-DirectorySize {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return 0 }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [int64]$sum
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

function Remove-OldReleases {
  param([string]$Path, [int]$Keep)
  if ($Keep -lt 1) { return }
  if (!(Test-Path -LiteralPath $Path)) { return }

  $groups = Get-ChildItem -LiteralPath $Path -File -Force |
    Where-Object { $_.Name -match '^(innerworld-space-server-\d{8}-\d{6})\.' } |
    Group-Object { [regex]::Match($_.Name, '^(innerworld-space-server-\d{8}-\d{6})\.').Groups[1].Value } |
    Sort-Object { ($_.Group | Measure-Object LastWriteTime -Maximum).Maximum } -Descending

  $groups | Select-Object -Skip $Keep | ForEach-Object {
    foreach ($file in $_.Group) {
      Assert-UnderPath -Path $file.FullName -RootPath $Path
      Remove-Item -LiteralPath $file.FullName -Force
    }
  }
}

New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
if (Test-Path -LiteralPath $stagingRoot) {
  Assert-UnderPath -Path $stagingRoot -RootPath $releaseRoot
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
Remove-OldReleases -Path $releaseRoot -Keep $KeepReleases
New-Item -ItemType Directory -Force -Path $staging | Out-Null

Copy-Directory -Source (Join-Path $root "server\space-server") -Destination (Join-Path $staging "server\space-server")
Copy-Directory -Source (Join-Path $root "apps\web-demo") -Destination (Join-Path $staging "apps\web-demo")
Copy-Directory -Source (Join-Path $root "apps\unity-shell\Assets\Scripts\Concrete") -Destination (Join-Path $staging "apps\unity-shell\Assets\Scripts\Concrete")
Copy-Directory -Source (Join-Path $root "shared") -Destination (Join-Path $staging "shared")
Copy-Directory -Source (Join-Path $root "data") -Destination (Join-Path $staging "data")
Copy-Directory -Source (Join-Path $root "ai") -Destination (Join-Path $staging "ai")
Copy-Directory -Source (Join-Path $root "docs") -Destination (Join-Path $staging "docs")

foreach ($toolPath in @(
  "tools\build-unity-android.ps1",
  "tools\field-acceptance-session.ps1",
  "tools\field-input-readiness.js",
  "tools\field-live-pass.js",
  "tools\field-target-pass.js",
  "tools\station-pro-apk-smoke.ps1",
  "tools\station-pro-field-input-assist.ps1",
  "tools\uxr-readiness.js"
)) {
  Copy-FileIfExists -Source (Join-Path $root $toolPath) -Destination (Join-Path $staging $toolPath)
}

$runtimeState = Join-Path $staging "data\runtime_state.json"
if (Test-Path -LiteralPath $runtimeState) {
  Assert-UnderPath -Path $runtimeState -RootPath $staging
  Remove-Item -LiteralPath $runtimeState -Force
}
$sqliteRuntime = Join-Path $staging "data\innerworld.sqlite"
if (Test-Path -LiteralPath $sqliteRuntime) {
  Assert-UnderPath -Path $sqliteRuntime -RootPath $staging
  Remove-Item -LiteralPath $sqliteRuntime -Force
}
Get-ChildItem -LiteralPath (Join-Path $staging "data") -Filter "innerworld.sqlite-*" -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
  Assert-UnderPath -Path $_.FullName -RootPath $staging
  Remove-Item -LiteralPath $_.FullName -Force
}

$serverRuntimeOutput = Join-Path $staging "server\space-server\output"
if (Test-Path -LiteralPath $serverRuntimeOutput) {
  Assert-UnderPath -Path $serverRuntimeOutput -RootPath $staging
  Remove-Item -LiteralPath $serverRuntimeOutput -Recurse -Force
}

$packageJson = [ordered]@{
  name = "innerworld-space-server-release"
  version = "0.1.0"
  private = $true
  type = "module"
  scripts = [ordered]@{
    start = "node server/space-server/index.js"
    "check:contract" = "node server/space-server/check-contract.js"
    "check:device" = "node server/space-server/check-device.js"
    "check:field-acceptance" = "node server/space-server/check-field-acceptance.js"
    "field:live-pass" = "node tools/field-live-pass.js --single"
    "check:field-live-pass" = "node tools/field-live-pass.js --single --require-ready"
    "field:target-pass" = "node tools/field-target-pass.js"
    "field:target-pass:watch" = "node tools/field-target-pass.js --watch --require-live-session --require-target-diagnostics"
    "field:target-pass:apply" = "node tools/field-target-pass.js --apply-mission-actions --require-live-session --require-target-diagnostics"
    "field:target-pass:strict" = "node tools/field-target-pass.js --apply-mission-actions --confirm-user-b-readback --require-live-session --require-target-diagnostics --require-trusted --require-mission-loop"
    "check:field-target-pass" = "node tools/field-target-pass.js --require-ready"
    "field:acceptance-session" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/field-acceptance-session.ps1"
    "field:acceptance-session:live" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/field-acceptance-session.ps1 -PairSmoke -Watch"
    "field:acceptance-session:strict" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/field-acceptance-session.ps1 -PairSmoke -Watch -RequireTrusted -RequireMissionLoop"
    "field:acceptance-session:target" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/field-acceptance-session.ps1 -PairSmoke -Watch -TargetPass"
    "field:acceptance-session:target-strict" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/field-acceptance-session.ps1 -PairSmoke -Watch -TargetPass -ApplyMissionActions -ConfirmUserBReadback -RequireTrusted -RequireMissionLoop"
    "station:field-input-assist" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/station-pro-field-input-assist.ps1"
    "station:field-input-assist:apply" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/station-pro-field-input-assist.ps1 -Apply -RequireDevice"
    "station:field-input-assist:p0" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/station-pro-field-input-assist.ps1 -Action P0Loop"
    "field:input-readiness" = "node tools/field-input-readiness.js"
    "check:field-input-readiness" = "node tools/field-input-readiness.js --require-ready"
    "unity:android:build:lan" = "powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-unity-android.ps1 -RunPostChecks -RequirePostCheckDevice"
    check = "node server/space-server/check-readonly.js"
    "check:ops" = "node server/space-server/check-ops.js"
    reset = "node server/space-server/reset.js"
    rehearsal = "node server/space-server/capture-rehearsal.js --reset-after"
  }
  engines = [ordered]@{
    node = ">=20"
  }
  dependencies = [ordered]@{
    "sql.js" = "^1.14.1"
  }
}
$packageJson | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path (Join-Path $staging "package.json")

$startWindows = @"
`$ErrorActionPreference = "Stop"
Set-Location -LiteralPath `$PSScriptRoot
if (`$env:PORT -eq `$null -or `$env:PORT -eq "") { `$env:PORT = "$Port" }
if (`$env:HOST -eq `$null -or `$env:HOST -eq "") { `$env:HOST = "127.0.0.1" }
if (!(Test-Path -LiteralPath (Join-Path `$PSScriptRoot "node_modules\sql.js"))) {
  npm install --omit=dev --no-audit
}
node server\space-server\index.js
"@
$startWindows | Set-Content -Encoding UTF8 -Path (Join-Path $staging "start-server.ps1")

$startLanWindows = @"
`$ErrorActionPreference = "Stop"
Set-Location -LiteralPath `$PSScriptRoot
if (`$env:PORT -eq `$null -or `$env:PORT -eq "") { `$env:PORT = "$Port" }
`$env:HOST = "0.0.0.0"
if (!(Test-Path -LiteralPath (Join-Path `$PSScriptRoot "node_modules\sql.js"))) {
  npm install --omit=dev --no-audit
}
node server\space-server\index.js
"@
$startLanWindows | Set-Content -Encoding UTF8 -Path (Join-Path $staging "start-server-lan.ps1")

$startSh = @"
#!/usr/bin/env sh
set -eu
cd "`$(dirname "`$0")"
: "`${PORT:=$Port}"
: "`${HOST:=127.0.0.1}"
export PORT HOST
if [ ! -d "node_modules/sql.js" ]; then
  npm install --omit=dev --no-audit
fi
exec node server/space-server/index.js
"@
$startSh | Set-Content -Encoding UTF8 -Path (Join-Path $staging "start-server.sh")

$readme = @"
InnerWorld Space Server Release
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")

Purpose:
  Lightweight server package for localhost, LAN, and future small-server upload.
  It contains Space Server, Web demo static files, data/space_demo.json, AI schema/prompt, and docs.

Run on Windows localhost:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\start-server.ps1
  open http://localhost:$Port/

Run on Windows LAN:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\start-server-lan.ps1
  open http://<Windows-host-IP>:$Port/

Run on Linux server:
  PORT=$Port HOST=0.0.0.0 sh ./start-server.sh

Checks:
  npm install --omit=dev --no-audit
  node server/space-server/check-contract.js
  node server/space-server/check-device.js
  node server/space-server/check-readonly.js
  node server/space-server/check-ops.js
  node server/space-server/capture-rehearsal.js --reset-after

Runtime state:
  data/innerworld.sqlite and data/runtime_state.json are intentionally excluded.
  The Space Server creates data/innerworld.sqlite on first run from public seed files.
  The old JSON runtime file is only a migration source when present.

Reverse proxy hint:
  Put Nginx/Caddy in front of this process for HTTPS and domain routing.
  Keep the Node process bound to 127.0.0.1 on a public server unless LAN/external direct access is intentional.
"@
$readme | Set-Content -Encoding UTF8 -Path (Join-Path $staging "README-SERVER.txt")

$forbiddenEntries = Get-ChildItem -LiteralPath $staging -Recurse -Force | Where-Object {
  $relative = $_.FullName.Substring($staging.Length + 1)
  $relative -match '(^|\\)(runtime_state\.json|innerworld\.sqlite(?:-.+)?|Library|PackageCache|node_modules|\.git|Temp|Obj|target)(\\|$)' -or
    $relative -match '(^|\\)(innerworld-sqlite-\d{8}-\d{6}\.(sqlite|manifest\.json)|innerworld-before-restore-\d{8}-\d{6}\.(sqlite|manifest\.json)|sqlite-backup-latest\.md)$'
}
if ($forbiddenEntries) {
  $sample = ($forbiddenEntries | Select-Object -First 10 | ForEach-Object { $_.FullName }) -join "`n"
  throw "Refusing to package runtime or cache paths. Sample:`n$sample"
}

$stagingBytes = Get-DirectorySize -Path $staging
$files = Get-ChildItem -LiteralPath $staging -Recurse -File | Sort-Object FullName
$hashRows = foreach ($file in $files) {
  $rel = $file.FullName.Substring($staging.Length + 1)
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
  "$hash  $rel"
}
$hashRows | Set-Content -Encoding UTF8 -Path (Join-Path $staging "SHA256SUMS.txt")

$manifest = [pscustomobject]@{
  release = $releaseName
  generated_at = (Get-Date).ToString("o")
  root = $root
  zip_path = $zipPath
  zip_sha256 = $null
  default_port = $Port
  staging_size_gb = Format-GB $stagingBytes
  includes = @(
    "server/space-server",
    "shared",
    "apps/web-demo",
    "data/hardware_manifest.json",
    "data/space_demo.json",
    "ai",
    "docs",
    "start-server.ps1",
    "start-server-lan.ps1",
    "start-server.sh",
    "README-SERVER.txt"
  )
  excludes = @(
    "data/runtime_state.json",
    "data/innerworld.sqlite",
    "SQLite backup snapshots and manifests",
    "node_modules",
    ".git",
    "Unity build outputs",
    "PDF/demo/package artifacts"
  )
  file_count = $files.Count + 1
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path (Join-Path $staging "SERVER-RELEASE-MANIFEST.json")

if (Test-Path -LiteralPath $zipPath) {
  Assert-UnderPath -Path $zipPath -RootPath $releaseRoot
  Remove-Item -LiteralPath $zipPath -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $staging,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

$zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
$manifest.zip_sha256 = $zipHash
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -Path $manifestPath

Write-Output "Server release created: $zipPath"
Write-Output "Server release SHA256: $zipHash"
Write-Output "Manifest: $manifestPath"
Write-Output "Staged size: $(Format-GB $stagingBytes) GB"

if (Test-Path -LiteralPath $stagingRoot) {
  Assert-UnderPath -Path $stagingRoot -RootPath $releaseRoot
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}
Remove-OldReleases -Path $releaseRoot -Keep $KeepReleases
