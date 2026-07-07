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

function Read-ZipEntryText {
  param($Zip, [string]$Path, [string]$TempRoot)
  $entry = Get-ZipEntry -Zip $Zip -Path $Path
  if ($null -eq $entry) { return $null }
  New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
  $safeName = (Normalize-ZipPath -Path $Path) -replace '[\\/:*?"<>|]', '_'
  $tempPath = Join-Path $TempRoot $safeName
  if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $tempPath, $true)
  return Get-Content -LiteralPath $tempPath -Encoding UTF8 -Raw
}

function Assert-TextContainsAll {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Label,
    [string]$Text,
    [string[]]$Tokens
  )
  if ([string]::IsNullOrWhiteSpace($Text)) {
    Add-Failure $Failures "$Label is missing or empty."
    return
  }
  foreach ($token in $Tokens) {
    if ($Text -notlike "*$token*") {
      Add-Failure $Failures "$Label is missing required token: $token"
    }
  }
}

function Assert-SpaceDemoPins {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Label,
    [object]$Space
  )
  $anchors = @($Space.anchors)
  $semanticPins = @($Space.semantic_pins)
  if ($anchors.Count -ne 3) {
    Add-Failure $Failures "$Label must contain exactly 3 P0 anchors for A1/A2/A3."
  }
  foreach ($anchorId in @("A1", "A2", "A3")) {
    if (!($anchors | Where-Object { $_.anchor_id -eq $anchorId })) {
      Add-Failure $Failures "$Label missing P0 anchor: $anchorId"
    }
  }

  $skyPin = $semanticPins | Where-Object { $_.pin_id -eq "SKY_WHALE_CLOUD_001" } | Select-Object -First 1
  if ($null -eq $skyPin) {
    Add-Failure $Failures "$Label missing controlled Sky Pin: SKY_WHALE_CLOUD_001"
    return
  }
  if ($skyPin.controlled_demo -ne $true) { Add-Failure $Failures "$Label Sky Pin must be controlled_demo=true." }
  if ($skyPin.open_ugc_allowed -ne $false) { Add-Failure $Failures "$Label Sky Pin must keep open_ugc_allowed=false." }
  if ($skyPin.hardware_acceptance_evidence -ne $false) { Add-Failure $Failures "$Label Sky Pin must keep hardware_acceptance_evidence=false." }
  if ($skyPin.p0_required -ne $false) { Add-Failure $Failures "$Label Sky Pin must keep p0_required=false." }
  if ([string]$skyPin.demo_role -ne "controlled_extension_preview") { Add-Failure $Failures "$Label Sky Pin must keep demo_role=controlled_extension_preview." }

  $sceneActions = @($Space.scene_actions)
  $expectedSceneActions = @(
    @{ id = "A1_CHECK_IN_STAMP"; anchor = "A1"; role = "spatial_entry" },
    @{ id = "A2_MEMORY_VIEW_AND_COLLECT"; anchor = "A2"; role = "memory_read" },
    @{ id = "A3_TIMEMARK_WRITE_BACK"; anchor = "A3"; role = "timemark_writeback" },
    @{ id = "USER_B_READBACK_PASS"; anchor = "A3"; role = "user_b_readback" }
  )
  if ($sceneActions.Count -ne $expectedSceneActions.Count) {
    Add-Failure $Failures "$Label scene_actions must contain exactly A1/A2/A3/User B tasks."
  }
  foreach ($expected in $expectedSceneActions) {
    $action = $sceneActions | Where-Object { $_.action_id -eq $expected.id } | Select-Object -First 1
    if ($null -eq $action) {
      Add-Failure $Failures "$Label missing scene action: $($expected.id)"
      continue
    }
    if ([string]$action.anchor_id -ne [string]$expected.anchor) { Add-Failure $Failures "$Label scene action $($expected.id) anchor mismatch." }
    if ([string]$action.p0_role -ne [string]$expected.role) { Add-Failure $Failures "$Label scene action $($expected.id) P0 role mismatch." }
    if ([string]::IsNullOrWhiteSpace([string]$action.user_task)) { Add-Failure $Failures "$Label scene action $($expected.id) user_task missing." }
    if ([string]::IsNullOrWhiteSpace([string]$action.physical_cue) -or !(([string]$action.physical_cue).ToLowerInvariant().Contains("wall"))) { Add-Failure $Failures "$Label scene action $($expected.id) must bind to a physical wall cue." }
    if ($null -eq $action.spatial_binding -or $null -eq $action.spatial_binding.pose) { Add-Failure $Failures "$Label scene action $($expected.id) spatial pose missing." }
    if ([string]::IsNullOrWhiteSpace([string]$action.spatial_binding.projection)) { Add-Failure $Failures "$Label scene action $($expected.id) projection missing." }
    if ([string]::IsNullOrWhiteSpace([string]$action.spatial_binding.depth_layer)) { Add-Failure $Failures "$Label scene action $($expected.id) depth layer missing." }
  }
  $a1Action = $sceneActions | Where-Object { $_.action_id -eq "A1_CHECK_IN_STAMP" } | Select-Object -First 1
  if ($null -eq $a1Action -or $a1Action.handoff_to_shiyao_scan_scene -ne $true) {
    Add-Failure $Failures "$Label A1 scene action must document shiyao scan handoff."
  }
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
    "apps\unity-shell\Assets\Scripts\Concrete\ShiyaoConcreteSceneHandoffBridge.cs",
    "shared\innerworld-contract.js",
    "data\hardware_manifest.json",
    "data\merge_map.json",
    "data\space_demo.json",
    "docs\demo-plan.md",
    "docs\demo-runbook.md",
    "docs\shiyao-handoff-contract.md",
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

  $demoPlanText = Read-ZipEntryText -Zip $zip -Path "docs\demo-plan.md" -TempRoot $TempRoot
  Assert-TextContainsAll -Failures $failures -Label "docs/demo-plan.md" -Text $demoPlanText -Tokens @(
    "Campus Hidden Layer",
    "A1 Spatial Entry",
    "A2 Memory Read",
    "A3 TimeMark Write-Back",
    "User B Readback",
    "Whale Cloud Sky Pin",
    "controlled demo",
    "not open UGC",
    "one real wall"
  )

  $spaceDemoText = Read-ZipEntryText -Zip $zip -Path "data\space_demo.json" -TempRoot $TempRoot
  if ([string]::IsNullOrWhiteSpace($spaceDemoText)) {
    Add-Failure $failures "data/space_demo.json is missing or empty."
  } else {
    try {
      $spaceDemo = $spaceDemoText | ConvertFrom-Json
      Assert-SpaceDemoPins -Failures $failures -Label "data/space_demo.json" -Space $spaceDemo
    } catch {
      Add-Failure $failures "data/space_demo.json could not be parsed: $($_.Exception.Message)"
    }
  }

  $mergeMapText = Read-ZipEntryText -Zip $zip -Path "data\merge_map.json" -TempRoot $TempRoot
  Assert-TextContainsAll -Failures $failures -Label "data/merge_map.json" -Text $mergeMapText -Tokens @(
    "innerworld-shiyao-merge-map/v1",
    "innerworld-shiyao-handoff/v1",
    "EnterConcreteScene",
    "ShiyaoConcreteSceneHandoffBridge",
    "do_not_merge_hardware_claims_without_field_acceptance"
  )
  $handoffDocText = Read-ZipEntryText -Zip $zip -Path "docs\shiyao-handoff-contract.md" -TempRoot $TempRoot
  Assert-TextContainsAll -Failures $failures -Label "docs/shiyao-handoff-contract.md" -Text $handoffDocText -Tokens @(
    'ISceneHandoffReceiver.EnterConcreteScene',
    'innerworld-shiyao-handoff/v1',
    'ShiyaoConcreteSceneHandoffBridge',
    'hardware is with teammate',
    'shiyao',
    'must not claim live hardware-ready'
  )
  $bridgeText = Read-ZipEntryText -Zip $zip -Path "apps\unity-shell\Assets\Scripts\Concrete\ShiyaoConcreteSceneHandoffBridge.cs" -TempRoot $TempRoot
  Assert-TextContainsAll -Failures $failures -Label "ShiyaoConcreteSceneHandoffBridge.cs" -Text $bridgeText -Tokens @(
    'ShiyaoConcreteSceneHandoffBridge',
    'innerworld-shiyao-handoff/v1',
    'campus_memory_wall',
    'whale_cloud',
    'task_board',
    'no local hardware claim'
  )

  if ($entries -contains "data\runtime_state.json") {
    Add-Failure $failures "Package contains data/runtime_state.json"
  }
  if ($entries -contains "data\innerworld.sqlite") {
    Add-Failure $failures "Package contains data/innerworld.sqlite"
  }

  $normalizedEntries = @($entries | ForEach-Object { Normalize-ZipPath -Path $_ })
  $serverReleaseZipCount = @($normalizedEntries | Where-Object { $_ -like "output\server-release\innerworld-space-server-*.zip" }).Count
  $serverReleaseManifestCount = @($normalizedEntries | Where-Object { $_ -like "output\server-release\innerworld-space-server-*.manifest.json" }).Count
  if ($serverReleaseZipCount -lt 1 -or $serverReleaseManifestCount -lt 1) {
    Add-Failure $failures "Package does not contain a server release zip/manifest pair."
  }
  $latestServerReleaseName = Get-LatestServerReleaseName -Entries $entries

  $forbidden = @($entries | Where-Object {
    $_ -match '(^|[\\/])(innerworld\.sqlite(?:-.+)?|Library|PackageCache|node_modules|\.git|Temp|Obj|target)([\\/]|$)' -or
      $_ -match '(^|[\\/])(innerworld-sqlite-\d{8}-\d{6}\.(sqlite|manifest\.json)|innerworld-before-restore-\d{8}-\d{6}\.(sqlite|manifest\.json)|sqlite-backup-latest\.md)$'
  })
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
        foreach ($item in @("server\space-server\index.js", "server\space-server\check-contract.js", "server\space-server\check-readonly.js", "server\space-server\src\domain\evidence-chain.js", "server\space-server\src\domain\hud-generator.js", "server\space-server\src\domain\mission-engine.js", "server\space-server\src\http\api-router.js", "server\space-server\src\http\response.js", "server\space-server\src\http\static-files.js", "server\space-server\src\ops\status-service.js", "server\space-server\src\store\runtime-store.js", "server\space-server\check-device.js", "server\space-server\check-ops.js", "apps\web-demo\index.html", "shared\innerworld-contract.js", "data\hardware_manifest.json", "data\merge_map.json", "data\space_demo.json", "docs\shiyao-handoff-contract.md", "README-SERVER.txt", "start-server.ps1", "start-server-lan.ps1", "start-server.sh", "package.json", "SERVER-RELEASE-MANIFEST.json")) {
          if (!($nestedEntries -contains $item)) {
            Add-Failure $failures "Nested server release missing required entry: $item"
          }
        }
        $nestedSpaceDemoText = Read-ZipEntryText -Zip $nestedZip -Path "data\space_demo.json" -TempRoot $TempRoot
        if ([string]::IsNullOrWhiteSpace($nestedSpaceDemoText)) {
          Add-Failure $failures "Nested server release data/space_demo.json is missing or empty."
        } else {
          try {
            $nestedSpaceDemo = $nestedSpaceDemoText | ConvertFrom-Json
            Assert-SpaceDemoPins -Failures $failures -Label "nested data/space_demo.json" -Space $nestedSpaceDemo
          } catch {
            Add-Failure $failures "Nested server release data/space_demo.json could not be parsed: $($_.Exception.Message)"
          }
        }
        $nestedEvidenceText = Read-ZipEntryText -Zip $nestedZip -Path "server\space-server\src\domain\evidence-chain.js" -TempRoot $TempRoot
        Assert-TextContainsAll -Failures $failures -Label "nested evidence-chain.js" -Text $nestedEvidenceText -Tokens @(
          "controlled_sky_pin_preview",
          "controlledPreviews",
          "contributes_to_p0_acceptance: false",
          "hardware_acceptance_evidence: false",
          "open_ugc_allowed: false"
        )
        Assert-TextContainsAll -Failures $failures -Label "nested data/space_demo.json choreography" -Text $nestedSpaceDemoText -Tokens @(
          "spatial_choreography",
          "growth_beats",
          "wall_seed_rule",
          "gesture_affordance"
        )
        $nestedReadonlyText = Read-ZipEntryText -Zip $nestedZip -Path "server\space-server\check-readonly.js" -TempRoot $TempRoot
        Assert-TextContainsAll -Failures $failures -Label "nested check-readonly.js" -Text $nestedReadonlyText -Tokens @(
          "p0_anchor_count !== 3",
          "semantic_preview_count !== 1",
          "hardware_acceptance_evidence !== false",
          "p0_required !== false"
        )
        $nestedForbidden = @($nestedEntries | Where-Object {
        $_ -match '(^|[\\/])(runtime_state\.json|innerworld\.sqlite(?:-.+)?|output|node_modules|\.git|Unity|Library|Temp|Obj|target)([\\/]|$)' -or
          $_ -match '(^|[\\/])(innerworld-sqlite-\d{8}-\d{6}\.(sqlite|manifest\.json)|innerworld-before-restore-\d{8}-\d{6}\.(sqlite|manifest\.json)|sqlite-backup-latest\.md)$'
      })
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
