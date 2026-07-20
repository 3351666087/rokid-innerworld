param(
  [string]$InputApk = "",
  [string]$ConfigPath = "",
  [string]$OutputApk = "",
  [string]$PackageName = "com.innerworld.rokid.prototype",
  [string]$KeystorePath = "",
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($InputApk)) {
  $InputApk = Join-Path $root "output\unity-android\InnerWorldRokid.apk"
}
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $ConfigPath = Join-Path $root "apps\unity-shell\Assets\StreamingAssets\innerworld-config.json"
}
if ([string]::IsNullOrWhiteSpace($OutputApk)) {
  $OutputApk = $InputApk
}
if ([string]::IsNullOrWhiteSpace($KeystorePath)) {
  $KeystorePath = Join-Path $env:USERPROFILE ".android\debug.keystore"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\apk-config-patch"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$workRoot = Join-Path $OutputRoot $stamp
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null

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

function Convert-BaseUrlToEvidence {
  param([AllowNull()][string]$BaseUrl)
  $hostKind = "missing"
  $baseUrlRedacted = $null
  $hostHash = $null
  $networkReady = $false

  if (![string]::IsNullOrWhiteSpace($BaseUrl)) {
    if ($BaseUrl -match '^(https?)://([^/:]+)(:\d+)?') {
      $scheme = $Matches[1]
      $hostName = $Matches[2]
      $portText = if ($Matches[3]) { $Matches[3] } else { "" }
      $hostHash = Get-Sha256Prefix $hostName
      if ($hostName -match '^(localhost|127\.0\.0\.1)$') {
        $hostKind = "localhost"
        $baseUrlRedacted = "${scheme}://localhost$portText"
      } elseif ($hostName -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)') {
        $hostKind = "private_lan"
        $baseUrlRedacted = "${scheme}://<private-ip-redacted>$portText"
        $networkReady = $true
      } else {
        $hostKind = "public_or_hostname"
        $baseUrlRedacted = "${scheme}://<host-redacted>$portText"
        $networkReady = $true
      }
    } else {
      $hostKind = "invalid"
      $baseUrlRedacted = "<invalid-url-redacted>"
    }
  }

  return [pscustomobject]@{
    base_url_redacted = $baseUrlRedacted
    host_kind = $hostKind
    host_hash_prefix = $hostHash
    network_ready_for_device = [bool]$networkReady
  }
}

function Find-AndroidTool {
  param([string]$Name)
  $sdkRoots = @(
    $env:ANDROID_HOME,
    $env:ANDROID_SDK_ROOT,
    "C:\Program Files (x86)\Android\android-sdk",
    "C:\Program Files\Android\android-sdk",
    (Join-Path $env:LOCALAPPDATA "Android\Sdk")
  ) | Where-Object { $_ } | Select-Object -Unique

  foreach ($sdkRoot in $sdkRoots) {
    $buildToolsRoot = Join-Path $sdkRoot "build-tools"
    if (Test-Path -LiteralPath $buildToolsRoot) {
      $candidate = Get-ChildItem -LiteralPath $buildToolsRoot -Filter $Name -Recurse -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
      if ($candidate) { return $candidate.FullName }
    }
  }
  return $null
}

if (!(Test-Path -LiteralPath $InputApk)) { throw "Input APK not found: $InputApk" }
if (!(Test-Path -LiteralPath $ConfigPath)) { throw "Config JSON not found: $ConfigPath" }
if (!(Test-Path -LiteralPath $KeystorePath)) { throw "Debug keystore not found: $KeystorePath" }

$zipalign = Find-AndroidTool "zipalign.exe"
$apksigner = Find-AndroidTool "apksigner.bat"
if (!$zipalign) { throw "zipalign.exe not found in Android build-tools" }
if (!$apksigner) { throw "apksigner.bat not found in Android build-tools" }

$configJsonText = Get-Content -LiteralPath $ConfigPath -Raw
$configJson = $configJsonText | ConvertFrom-Json
$configEvidence = Convert-BaseUrlToEvidence -BaseUrl "$($configJson.base_url)"
if ($configJson.space_id -ne "innerworld_campus_wall") {
  throw "Config space_id mismatch: expected innerworld_campus_wall"
}

$inputFull = [System.IO.Path]::GetFullPath($InputApk)
$outputFull = [System.IO.Path]::GetFullPath($OutputApk)
$inPlace = [string]::Equals($inputFull, $outputFull, [System.StringComparison]::OrdinalIgnoreCase)
$backupPath = $null
if ($inPlace) {
  $backupPath = Join-Path (Split-Path -Parent $outputFull) ("InnerWorldRokid.apk.before-config-patch-$stamp")
  Copy-Item -LiteralPath $inputFull -Destination $backupPath -Force
}

$unsignedApk = Join-Path $workRoot "InnerWorldRokid-config-unsigned.apk"
$alignedApk = Join-Path $workRoot "InnerWorldRokid-config-aligned.apk"
$signedApk = Join-Path $workRoot "InnerWorldRokid-config-signed.apk"
Copy-Item -LiteralPath $inputFull -Destination $unsignedApk -Force

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($unsignedApk, [System.IO.Compression.ZipArchiveMode]::Update)
try {
  $entriesToDelete = @($zip.Entries | Where-Object {
      $_.FullName -match '^META-INF/' -or $_.FullName -match '(^|/)innerworld-config\.json$'
    })
  foreach ($entry in $entriesToDelete) {
    $entry.Delete()
  }

  $configEntry = $zip.CreateEntry("assets/innerworld-config.json", [System.IO.Compression.CompressionLevel]::Optimal)
  $stream = $configEntry.Open()
  try {
    $encoding = New-Object System.Text.UTF8Encoding($false)
    $writer = New-Object System.IO.StreamWriter($stream, $encoding)
    try {
      $writer.Write($configJsonText.Trim())
    } finally {
      $writer.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
} finally {
  $zip.Dispose()
}

& $zipalign -f -p 4 $unsignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed with exit code $LASTEXITCODE" }

& $apksigner sign --ks $KeystorePath --ks-pass pass:android --key-pass pass:android --out $signedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner sign failed with exit code $LASTEXITCODE" }

$verifyOutput = & $apksigner verify --verbose $signedApk 2>&1
$verifyExit = $LASTEXITCODE
$verifyText = (@($verifyOutput | ForEach-Object { "$_" }) -join "`n")
if ($verifyExit -ne 0) { throw "apksigner verify failed with exit code $verifyExit`n$verifyText" }

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputFull) | Out-Null
Copy-Item -LiteralPath $signedApk -Destination $outputFull -Force

$apkFile = Get-Item -LiteralPath $outputFull
$apkHash = (Get-FileHash -LiteralPath $outputFull -Algorithm SHA256).Hash.ToLowerInvariant()

$report = [pscustomobject]@{
  schema = "innerworld-apk-config-patch/v1"
  generated_at = (Get-Date).ToString("o")
  ok = $true
  privacy = [pscustomobject]@{
    private_ips_included = $false
    keystore_passwords_included = $false
    note = "The APK contains the real field URL for device access, but this report stores only redacted URL/hash evidence."
  }
  package = $PackageName
  input_apk = $inputFull
  output_apk = $outputFull
  backup_apk = $backupPath
  config_entry = "assets/innerworld-config.json"
  source_config = [pscustomobject]@{
    space_id = $configJson.space_id
    base_url_redacted = $configEvidence.base_url_redacted
    host_kind = $configEvidence.host_kind
    host_hash_prefix = $configEvidence.host_hash_prefix
    network_ready_for_device = $configEvidence.network_ready_for_device
  }
  signing = [pscustomobject]@{
    zipalign = $zipalign
    apksigner = $apksigner
    verified = $true
    scheme_v2 = [bool]($verifyText -match 'Verified using v2 scheme .* true')
  }
  apk = [pscustomobject]@{
    exists = $true
    path = $outputFull
    size_bytes = $apkFile.Length
    sha256 = $apkHash
    last_write_time = $apkFile.LastWriteTime.ToString("o")
  }
  boundary = "Config patch only. This does not prove install/run, live SDK binding, heartbeat, trusted observations, or field acceptance."
}

$jsonPath = Join-Path $OutputRoot "apk-config-patch-$stamp.json"
$mdPath = Join-Path $OutputRoot "apk-config-patch-$stamp.md"
$latestJson = Join-Path $OutputRoot "apk-config-patch-latest.json"
$latestMd = Join-Path $OutputRoot "apk-config-patch-latest.md"

$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$markdown = @(
  "# APK Config Patch",
  "",
  "- Generated: $($report.generated_at)",
  "- OK: $($report.ok)",
  "- APK: $($report.apk.path)",
  "- APK size: $($report.apk.size_bytes)",
  "- APK SHA256: $($report.apk.sha256)",
  "- Config entry: $($report.config_entry)",
  "- Source config host kind: $($report.source_config.host_kind)",
  "- Network ready for device: $($report.source_config.network_ready_for_device)",
  "- Source config base URL: $($report.source_config.base_url_redacted)",
  "- apksigner verified: $($report.signing.verified)",
  "- v2 signature: $($report.signing.scheme_v2)",
  "",
  "## Boundary",
  "",
  $report.boundary
)
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "APK config patch complete."
Write-Output "Source config host kind: $($report.source_config.host_kind)"
Write-Output "Network ready for device: $($report.source_config.network_ready_for_device)"
Write-Output "apksigner verified: $($report.signing.verified)"
Write-Output "v2 signature: $($report.signing.scheme_v2)"
Write-Output "APK: $outputFull"
Write-Output "JSON: $jsonPath"
Write-Output "Markdown: $mdPath"
