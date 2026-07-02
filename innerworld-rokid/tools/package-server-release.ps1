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
Copy-Directory -Source (Join-Path $root "shared") -Destination (Join-Path $staging "shared")
Copy-Directory -Source (Join-Path $root "data") -Destination (Join-Path $staging "data")
Copy-Directory -Source (Join-Path $root "ai") -Destination (Join-Path $staging "ai")
Copy-Directory -Source (Join-Path $root "docs") -Destination (Join-Path $staging "docs")

$runtimeState = Join-Path $staging "data\runtime_state.json"
if (Test-Path -LiteralPath $runtimeState) {
  Assert-UnderPath -Path $runtimeState -RootPath $staging
  Remove-Item -LiteralPath $runtimeState -Force
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
    check = "node server/space-server/check-readonly.js"
    "check:ops" = "node server/space-server/check-ops.js"
    reset = "node server/space-server/reset.js"
    rehearsal = "node server/space-server/capture-rehearsal.js --reset-after"
  }
  engines = [ordered]@{
    node = ">=20"
  }
}
$packageJson | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path (Join-Path $staging "package.json")

$startWindows = @"
`$ErrorActionPreference = "Stop"
Set-Location -LiteralPath `$PSScriptRoot
if (`$env:PORT -eq `$null -or `$env:PORT -eq "") { `$env:PORT = "$Port" }
if (`$env:HOST -eq `$null -or `$env:HOST -eq "") { `$env:HOST = "127.0.0.1" }
node server\space-server\index.js
"@
$startWindows | Set-Content -Encoding UTF8 -Path (Join-Path $staging "start-server.ps1")

$startLanWindows = @"
`$ErrorActionPreference = "Stop"
Set-Location -LiteralPath `$PSScriptRoot
if (`$env:PORT -eq `$null -or `$env:PORT -eq "") { `$env:PORT = "$Port" }
`$env:HOST = "0.0.0.0"
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
  node server/space-server/check-contract.js
  node server/space-server/check-device.js
  node server/space-server/check-readonly.js
  node server/space-server/check-ops.js
  node server/space-server/capture-rehearsal.js --reset-after

Runtime state:
  data/runtime_state.json is intentionally excluded.
  The server regenerates it on first request so every release starts from entered / 2 beacons / 0 completed steps.

Reverse proxy hint:
  Put Nginx/Caddy in front of this process for HTTPS and domain routing.
  Keep the Node process bound to 127.0.0.1 on a public server unless LAN/external direct access is intentional.
"@
$readme | Set-Content -Encoding UTF8 -Path (Join-Path $staging "README-SERVER.txt")

$forbiddenEntries = Get-ChildItem -LiteralPath $staging -Recurse -Force | Where-Object {
  $relative = $_.FullName.Substring($staging.Length + 1)
  $relative -match '(^|\\)(runtime_state\.json|Library|PackageCache|node_modules|\.git|Temp|Obj|target)(\\|$)'
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
