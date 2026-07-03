param(
  [string]$ChromeExe = "",
  [string]$MarkerExe = "",
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\rokid-image-db"
}

function Resolve-ProjectPath {
  param([string]$Path)
  return [System.IO.Path]::GetFullPath($Path)
}

function Assert-PathUnder {
  param(
    [string]$Path,
    [string]$Parent,
    [string]$Label
  )
  $fullPath = Resolve-ProjectPath $Path
  $fullParent = (Resolve-ProjectPath $Parent).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullParent, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label resolved outside allowed parent: $fullPath"
  }
  return $fullPath
}

function Find-Chrome {
  param([string]$Preferred)
  $candidates = @()
  if (![string]::IsNullOrWhiteSpace($Preferred)) { $candidates += $Preferred }
  $cmd = Get-Command chrome -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $candidates += $cmd.Source }
  $candidates += @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  throw "Chrome or Edge executable not found for SVG rendering."
}

function Find-RokidMarker {
  param([string]$Preferred)
  if (![string]::IsNullOrWhiteSpace($Preferred) -and (Test-Path -LiteralPath $Preferred)) {
    return (Resolve-Path -LiteralPath $Preferred).Path
  }

  $packageRoot = Join-Path $root "apps\unity-shell\Library\PackageCache"
  $candidate = Get-ChildItem -LiteralPath $packageRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "com.rokid.openxr@*" } |
    ForEach-Object { Join-Path $_.FullName "Tools~\Windows\marker.exe" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
  if ($candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  throw "Rokid marker.exe not found under Unity PackageCache."
}

function Get-RokidMarkerConfigDir {
  param([string]$MarkerPath)
  $toolsRoot = Split-Path -Parent (Split-Path -Parent $MarkerPath)
  $config = Join-Path $toolsRoot "Config"
  if (!(Test-Path -LiteralPath $config)) {
    throw "Rokid marker config directory not found: $config"
  }
  return (Resolve-Path -LiteralPath $config).Path
}

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-SvgSize {
  param([string]$Path)
  $text = Get-Content -LiteralPath $Path -Raw
  if ($text -notmatch 'width="([0-9]+)"' -or $text -notmatch 'height="([0-9]+)"') {
    throw "SVG must declare integer width and height: $Path"
  }
  $width = [int]([regex]::Match($text, 'width="([0-9]+)"').Groups[1].Value)
  $height = [int]([regex]::Match($text, 'height="([0-9]+)"').Groups[1].Value)
  return [pscustomobject]@{
    width = $width
    height = $height
  }
}

function Render-SvgToPng {
  param(
    [string]$ChromePath,
    [string]$SvgPath,
    [string]$PngPath,
    [string]$ChromeProfileRoot
  )
  $size = Read-SvgSize -Path $SvgPath
  $profile = Join-Path $ChromeProfileRoot ([System.IO.Path]::GetFileNameWithoutExtension($PngPath) + "-profile")
  New-Item -ItemType Directory -Force -Path $profile | Out-Null
  $uri = (New-Object System.Uri((Resolve-ProjectPath $SvgPath))).AbsoluteUri
  $args = @(
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--user-data-dir=$profile",
    "--window-size=$($size.width),$($size.height)",
    "--screenshot=$PngPath",
    $uri
  )
  try {
    $process = Start-Process -FilePath $ChromePath -ArgumentList $args -Wait -PassThru -WindowStyle Hidden
    $exitCode = $process.ExitCode
    if ($exitCode -ne 0 -or !(Test-Path -LiteralPath $PngPath)) {
      throw "Chrome SVG render failed for $SvgPath with exit code $exitCode"
    }
    $file = Get-Item -LiteralPath $PngPath
    if ($file.Length -lt 1024) {
      throw "Rendered PNG is unexpectedly small: $PngPath"
    }
  } finally {
    if (Test-Path -LiteralPath $profile) {
      Remove-Item -LiteralPath $profile -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Write-Utf8NoBom {
  param(
    [string]$Path,
    [string]$Text
  )
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

$projectOutputRoot = Assert-PathUnder -Path $OutputRoot -Parent (Join-Path $root "output") -Label "OutputRoot"
$workDir = Join-Path $projectOutputRoot "current"
$renderDir = Join-Path $workDir "rendered"
$stageDir = Join-Path $workDir "zip-root"
$streamingAssetsDir = Join-Path $root "apps\unity-shell\Assets\StreamingAssets"
$streamingDbPath = Join-Path $streamingAssetsDir "RKImage.db"
$outputDbPath = Join-Path $projectOutputRoot "RKImage.db"
$reportPath = Join-Path $projectOutputRoot "rokid-image-db-latest.json"
$markdownPath = Join-Path $projectOutputRoot "rokid-image-db-latest.md"

$workDir = Assert-PathUnder -Path $workDir -Parent $projectOutputRoot -Label "workDir"
if (Test-Path -LiteralPath $workDir) {
  Remove-Item -LiteralPath $workDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $renderDir, $stageDir, $streamingAssetsDir | Out-Null

$chrome = Find-Chrome -Preferred $ChromeExe
$marker = Find-RokidMarker -Preferred $MarkerExe
$configDir = Get-RokidMarkerConfigDir -MarkerPath $marker

$targets = @(
  [pscustomobject]@{
    index = 1
    anchor_id = "A1"
    marker_id = "A1:qr-entry"
    tracking_mode = "qr"
    guid = "innerworld-a1-qr-entry-v1"
    name = "A1 QR Entry"
    svg = Join-Path $root "data\field-targets\a1-qr-entry-target.svg"
    width_m = 0.150
    height_m = 0.100
  },
  [pscustomobject]@{
    index = 2
    anchor_id = "A2"
    marker_id = "A2:image-target"
    tracking_mode = "image_tracking"
    guid = "innerworld-a2-memory-beacon-v1"
    name = "A2 Memory Beacon"
    svg = Join-Path $root "data\field-targets\a2-memory-beacon-target.svg"
    width_m = 0.150
    height_m = 0.100
  },
  [pscustomobject]@{
    index = 3
    anchor_id = "A3"
    marker_id = "A3:image-target"
    tracking_mode = "image_tracking"
    guid = "innerworld-a3-writeback-v1"
    name = "A3 Writeback Node"
    svg = Join-Path $root "data\field-targets\a3-writeback-target.svg"
    width_m = 0.150
    height_m = 0.100
  }
)

$inputLines = New-Object 'System.Collections.Generic.List[string]'
$dataRows = @()
$targetReports = @()

foreach ($target in $targets) {
  if (!(Test-Path -LiteralPath $target.svg)) {
    throw "Target SVG missing: $($target.svg)"
  }
  $renderedPng = Join-Path $renderDir ("{0}-{1}.png" -f $target.index, $target.anchor_id.ToLowerInvariant())
  Render-SvgToPng -ChromePath $chrome -SvgPath $target.svg -PngPath $renderedPng -ChromeProfileRoot $workDir

  $stagedPngName = "$($target.guid).png"
  $stagedPng = Join-Path $stageDir $stagedPngName
  Copy-Item -LiteralPath $renderedPng -Destination $stagedPng -Force

  [void]$inputLines.Add(("{0}|{1}|{2}" -f $target.index, $renderedPng, $target.width_m.ToString("0.000", [System.Globalization.CultureInfo]::InvariantCulture)))
  $dataRows += [pscustomobject]@{
    index = $target.index
    guid = $target.guid
    imageName = $target.name
    imageExtension = ".png"
    specifySize = $true
    physicalWidth = $target.width_m
    physicalHeight = $target.height_m
  }
  $targetReports += [pscustomobject]@{
    index = $target.index
    anchor_id = $target.anchor_id
    marker_id = $target.marker_id
    tracking_mode = $target.tracking_mode
    source_svg = $target.svg.Replace($root + "\", "").Replace("\", "/")
    rendered_png = $renderedPng.Replace($root + "\", "").Replace("\", "/")
    staged_png = $stagedPngName
    source_svg_sha256 = Get-Sha256 -Path $target.svg
    rendered_png_sha256 = Get-Sha256 -Path $renderedPng
    width_m = $target.width_m
    height_m = $target.height_m
  }
}

$inputListPath = Join-Path $workDir "rokid-image-list.txt"
Write-Utf8NoBom -Path $inputListPath -Text (($inputLines -join "`n") + "`n")

$corePath = Join-Path $stageDir "ImageDB.core"
$markerOutput = & $marker "build-db" "-c" $configDir "-i" $inputListPath "-o" $corePath 2>&1
$markerExitCode = $LASTEXITCODE
if ($markerExitCode -ne 0 -or !(Test-Path -LiteralPath $corePath)) {
  throw "Rokid marker database build failed with exit code $markerExitCode`n$markerOutput"
}
if ((Get-Item -LiteralPath $corePath).Length -lt 1024) {
  throw "ImageDB.core is unexpectedly small: $corePath"
}

$dataJsonPath = Join-Path $stageDir "Data.json"
Write-Utf8NoBom -Path $dataJsonPath -Text (($dataRows | ConvertTo-Json -Depth 8) + "`n")

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $outputDbPath) {
  Remove-Item -LiteralPath $outputDbPath -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $outputDbPath)
if (Test-Path -LiteralPath $streamingDbPath) {
  Remove-Item -LiteralPath $streamingDbPath -Force
}
Copy-Item -LiteralPath $outputDbPath -Destination $streamingDbPath -Force

$zip = [System.IO.Compression.ZipFile]::OpenRead($streamingDbPath)
try {
  $entries = @($zip.Entries | ForEach-Object { $_.FullName })
} finally {
  $zip.Dispose()
}

$report = [pscustomobject]@{
  schema = "innerworld-rokid-image-db/v1"
  generated_at = (Get-Date).ToString("o")
  ok = $true
  chrome = $chrome
  marker = $marker
  marker_config = $configDir
  marker_exit_code = $markerExitCode
  marker_output_tail = (($markerOutput | ForEach-Object { "$_" }) -join "`n")
  input_list = $inputListPath.Replace($root + "\", "").Replace("\", "/")
  targets = $targetReports
  zip_entries = $entries
  image_db_core = [pscustomobject]@{
    bytes = (Get-Item -LiteralPath $corePath).Length
    sha256 = Get-Sha256 -Path $corePath
  }
  rkimage_db = [pscustomobject]@{
    output_path = $outputDbPath.Replace($root + "\", "").Replace("\", "/")
    streaming_assets_path = $streamingDbPath.Replace($root + "\", "").Replace("\", "/")
    bytes = (Get-Item -LiteralPath $streamingDbPath).Length
    sha256 = Get-Sha256 -Path $streamingDbPath
    contains_image_db_core = [bool]($entries -contains "ImageDB.core")
    contains_data_json = [bool]($entries -contains "Data.json")
  }
  boundary = "This builds the Rokid image-tracking database for APK packaging only. It does not prove hardware observations or field acceptance."
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $reportPath -Encoding UTF8
$markdown = @(
  "# Rokid Image DB",
  "",
  "- Generated: $($report.generated_at)",
  "- OK: $($report.ok)",
  "- Targets: $($targets.Count)",
  "- ImageDB.core bytes: $($report.image_db_core.bytes)",
  "- RKImage.db bytes: $($report.rkimage_db.bytes)",
  "- RKImage.db SHA256: $($report.rkimage_db.sha256)",
  "- StreamingAssets path: $($report.rkimage_db.streaming_assets_path)",
  "- Contains ImageDB.core: $($report.rkimage_db.contains_image_db_core)",
  "- Contains Data.json: $($report.rkimage_db.contains_data_json)",
  "",
  "## Target Index Map",
  "",
  ($targetReports | ForEach-Object { "- $($_.index) -> $($_.anchor_id) / $($_.marker_id) / $($_.tracking_mode)" }),
  "",
  "## Boundary",
  "",
  $report.boundary
)
$markdown | Set-Content -LiteralPath $markdownPath -Encoding UTF8

Write-Output "Rokid image DB generated."
Write-Output "RKImage.db: $streamingDbPath"
Write-Output "ImageDB.core bytes: $($report.image_db_core.bytes)"
Write-Output "RKImage.db bytes: $($report.rkimage_db.bytes)"
Write-Output "SHA256: $($report.rkimage_db.sha256)"
