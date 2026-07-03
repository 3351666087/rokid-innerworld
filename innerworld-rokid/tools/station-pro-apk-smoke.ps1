param(
  [string]$ApkPath = "",
  [string]$PackageName = "com.innerworld.rokid.prototype",
  [switch]$InstallAndLaunch,
  [switch]$RequireDevice,
  [switch]$PairWithOperator,
  [string]$ApiBaseUrl = "http://127.0.0.1:5177",
  [int]$PairingVerifyTimeoutSeconds = 12,
  [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($ApkPath)) {
  $ApkPath = Join-Path $root "output\unity-android\InnerWorldRokid.apk"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\station-pro-apk-smoke"
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

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

function Invoke-Capture {
  param(
    [string]$Command,
    [string[]]$Arguments = @(),
    [string[]]$KnownDeviceIds = @(),
    [string[]]$KnownPairingCodes = @()
  )
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = (@($output | ForEach-Object { "$_" }) -join "`n")
    return [pscustomobject]@{
      ok = $exitCode -eq 0
      exit_code = $exitCode
      text = Redact-Text -Text $text -KnownDeviceIds $KnownDeviceIds -KnownPairingCodes $KnownPairingCodes
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      exit_code = $null
      text = Redact-Text -Text $_.Exception.Message -KnownDeviceIds $KnownDeviceIds -KnownPairingCodes $KnownPairingCodes
    }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Redact-Text {
  param(
    [AllowNull()][string]$Text,
    [string[]]$KnownDeviceIds = @(),
    [string[]]$KnownPairingCodes = @()
  )
  if ($null -eq $Text) { return $null }
  $redacted = "$Text"
  foreach ($id in $KnownDeviceIds) {
    if (![string]::IsNullOrWhiteSpace($id)) {
      $redacted = $redacted.Replace($id, "<device-id-redacted>")
    }
  }
  foreach ($code in $KnownPairingCodes) {
    if (![string]::IsNullOrWhiteSpace($code)) {
      $redacted = $redacted.Replace($code, "<pairing-code-redacted>")
      $redacted = $redacted.Replace(($code -replace "-", ""), "<pairing-code-redacted>")
    }
  }
  $redacted = $redacted -replace '\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b', '<mac-redacted>'
  $redacted = $redacted -replace '\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b', '<private-ip-redacted>'
  $redacted = $redacted -replace 'USB\\VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4}\\[^\\\s]+', 'USB\VID_<redacted>&PID_<redacted>\<redacted>'
  return $redacted
}

function Invoke-OperatorPairingIssue {
  param([string]$BaseUrl)
  $cleanBaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) { "http://127.0.0.1:5177" } else { $BaseUrl.Trim().TrimEnd("/") }
  $url = "$cleanBaseUrl/api/device/pairing"
  $body = @{
    purpose = "hardware_acceptance"
    client = "station-pro-apk-smoke"
  } | ConvertTo-Json -Compress

  try {
    $response = Invoke-RestMethod -Method Post -Uri $url -Body $body -ContentType "application/json" -TimeoutSec 8
    $code = "$($response.pairing_code)"
    $pairingId = "$($response.pairing_id)"
    $ok = [bool]($response.ok -eq $true -and $code -match "^[A-Z0-9]{4}-[A-Z0-9]{4}$")
    return [pscustomobject]@{
      code = if ($ok) { $code } else { $null }
      pairing_id = if (![string]::IsNullOrWhiteSpace($pairingId)) { $pairingId } else { $null }
      report = [pscustomobject]@{
        requested = $true
        ok = $ok
        api_base_url_redacted = Redact-Text -Text $cleanBaseUrl
        code_hash_prefix = if ($ok) { Get-Sha256Prefix $code } else { $null }
        pairing_id_hash_prefix = if (![string]::IsNullOrWhiteSpace($pairingId)) { Get-Sha256Prefix $pairingId } else { $null }
        expires_at = $response.expires_at
        consume_on = $response.consume_on
        required_for_hardware_acceptance = [bool]$response.required_for_hardware_acceptance
        code_persisted = [bool]$response.code_persisted
        raw_pairing_code_included = $false
        error = if ($ok) { $null } else { "pairing_code_missing_or_invalid" }
      }
    }
  } catch {
    return [pscustomobject]@{
      code = $null
      pairing_id = $null
      report = [pscustomobject]@{
        requested = $true
        ok = $false
        api_base_url_redacted = Redact-Text -Text $cleanBaseUrl
        code_hash_prefix = $null
        pairing_id_hash_prefix = $null
        expires_at = $null
        consume_on = "/api/device/register"
        required_for_hardware_acceptance = $true
        code_persisted = $false
        raw_pairing_code_included = $false
        error = Redact-Text -Text $_.Exception.Message
      }
    }
  }
}

function Test-OperatorPairedSession {
  param(
    [string]$BaseUrl,
    [AllowNull()][string]$PairingId,
    [int]$TimeoutSeconds = 12
  )
  $cleanBaseUrl = if ([string]::IsNullOrWhiteSpace($BaseUrl)) { "http://127.0.0.1:5177" } else { $BaseUrl.Trim().TrimEnd("/") }
  $url = "$cleanBaseUrl/api/device/sessions"
  $deadline = (Get-Date).AddSeconds([Math]::Max(1, $TimeoutSeconds))
  $lastError = $null
  do {
    try {
      $response = Invoke-RestMethod -Method Get -Uri $url -TimeoutSec 5
      $sessions = @($response.sessions)
      $matching = @($sessions | Where-Object {
          $_.pairing_status -eq "operator_paired" -and
          ($_.hardware_acceptance_eligible -eq $true) -and
          ([string]::IsNullOrWhiteSpace($PairingId) -or $_.pairing.pairing_id -eq $PairingId)
        })
      if ($matching.Count -gt 0) {
        $latest = $matching | Sort-Object { [datetime]$_.created_at } -Descending | Select-Object -First 1
        return [pscustomobject]@{
          requested = $true
          ok = $true
          paired_session_count = $matching.Count
          hardware_acceptance_eligible_session_count = @($sessions | Where-Object { $_.hardware_acceptance_eligible -eq $true }).Count
          latest_session_hash_prefix = Get-Sha256Prefix "$($latest.session_id)"
          latest_pairing_id_hash_prefix = if ($latest.pairing -and $latest.pairing.pairing_id) { Get-Sha256Prefix "$($latest.pairing.pairing_id)" } else { $null }
          raw_session_ids_included = $false
          error = $null
        }
      }
      $lastError = "operator_paired_session_not_seen"
    } catch {
      $lastError = Redact-Text -Text $_.Exception.Message
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  return [pscustomobject]@{
    requested = $true
    ok = $false
    paired_session_count = 0
    hardware_acceptance_eligible_session_count = 0
    latest_session_hash_prefix = $null
    latest_pairing_id_hash_prefix = $null
    raw_session_ids_included = $false
    error = $lastError
  }
}

function Find-Adb {
  $candidates = @()
  $cmd = Get-Command adb -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $candidates += $cmd.Source }
  $candidates += @(
    "C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe",
    "C:\Program Files\Android\android-sdk\platform-tools\adb.exe",
    (Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe")
  )
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  }
  return $null
}

function Find-Aapt {
  $candidates = @()
  $cmd = Get-Command aapt -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cmd) { $candidates += $cmd.Source }
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
      $candidates += @(Get-ChildItem -LiteralPath $buildToolsRoot -Filter "aapt.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
    }
  }
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path }
  }
  return $null
}

function Convert-AdbDeviceLine {
  param([string]$Line)
  if ([string]::IsNullOrWhiteSpace($Line)) { return $null }
  $trimmed = $Line.Trim()
  if ($trimmed -match "^List of devices") { return $null }
  if ($trimmed -match "^\*+\s*daemon\b") { return $null }
  if ($trimmed -match "^daemon\s+started\s+successfully\b") { return $null }
  $parts = $trimmed -split "\s+"
  if ($parts.Count -lt 2) { return $null }
  $rawId = $parts[0]
  $state = $parts[1]
  $fieldStart = 2
  if ($state -eq "no" -and $parts.Count -ge 3 -and $parts[2] -eq "permissions") {
    $state = "no permissions"
    $fieldStart = 3
  }
  $validStates = @("device", "offline", "unauthorized", "recovery", "sideload", "rescue", "bootloader", "host", "no permissions")
  if ($rawId -match "^\*" -or $validStates -notcontains $state) { return $null }
  $fields = @{}
  foreach ($part in ($parts | Select-Object -Skip $fieldStart)) {
    if ($part -match "^([^:]+):(.+)$") { $fields[$Matches[1]] = $Matches[2] }
  }
  $transport = if ($rawId -match "^\d{1,3}(\.\d{1,3}){3}:\d+$") { "tcp" } else { "usb" }
  $hash = Get-Sha256Prefix $rawId
  return [pscustomobject]@{
    raw_id = $rawId
    id_hash_prefix = $hash
    id_redacted = "$transport`:<redacted>:$hash"
    transport = $transport
    state = $state
    product = $fields["product"]
    model = $fields["model"]
    device = $fields["device"]
  }
}

function Get-AdbDevices {
  param([AllowNull()][string]$AdbPath)
  if (!$AdbPath) {
    return [pscustomobject]@{
      found = $false
      selected_path = $null
      devices = @()
      device_state_count = 0
      raw_device_ids = @()
    }
  }
  $capture = Invoke-Capture -Command $AdbPath -Arguments @("devices", "-l")
  $rows = @()
  foreach ($line in (($capture.text -split "`n") | ForEach-Object { $_.Trim() })) {
    $row = Convert-AdbDeviceLine -Line $line
    if ($row) { $rows += $row }
  }
  return [pscustomobject]@{
    found = $true
    selected_path = $AdbPath
    devices = @($rows | ForEach-Object {
        [pscustomobject]@{
          id_hash_prefix = $_.id_hash_prefix
          id_redacted = $_.id_redacted
          transport = $_.transport
          state = $_.state
          product = $_.product
          model = $_.model
          device = $_.device
        }
      })
    device_state_count = @($rows | Where-Object { $_.state -eq "device" }).Count
    raw_device_ids = @($rows | Select-Object -ExpandProperty raw_id)
  }
}

function Get-ApkConfig {
  param([string]$Path)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entries = @($zip.Entries | Where-Object { $_.FullName -match 'innerworld-config\.json$' })
    foreach ($entry in $entries) {
      $stream = $entry.Open()
      try {
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
      } finally {
        $stream.Dispose()
      }
      try {
        $json = $text | ConvertFrom-Json
        $baseUrl = "$($json.base_url)"
        $hostKind = "missing"
        $baseUrlRedacted = $null
        $hostHash = $null
        $networkReady = $false
        if (![string]::IsNullOrWhiteSpace($baseUrl)) {
          if ($baseUrl -match '^(https?)://([^/:]+)(:\d+)?') {
            $scheme = $Matches[1]
            $urlHost = $Matches[2]
            $portText = if ($Matches[3]) { $Matches[3] } else { "" }
            $hostHash = Get-Sha256Prefix $urlHost
            if ($urlHost -match '^(localhost|127\.0\.0\.1)$') {
              $hostKind = "localhost"
              $baseUrlRedacted = "${scheme}://localhost$portText"
            } elseif ($urlHost -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)') {
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
          found = $true
          path = $entry.FullName
          base_url_redacted = $baseUrlRedacted
          host_kind = $hostKind
          host_hash_prefix = $hostHash
          network_ready_for_device = [bool]$networkReady
          space_id = $json.space_id
        }
      } catch {
        return [pscustomobject]@{
          found = $true
          path = $entry.FullName
          base_url_redacted = $null
          host_kind = "invalid_json"
          host_hash_prefix = $null
          network_ready_for_device = $false
          space_id = $null
          parse_error = "config_json_parse_failed"
        }
      }
    }
  } finally {
    $zip.Dispose()
  }
  return [pscustomobject]@{
    found = $false
    path = $null
    base_url_redacted = $null
    host_kind = "missing"
    host_hash_prefix = $null
    network_ready_for_device = $false
    space_id = $null
  }
}

function Get-ApkRokidImageDatabase {
  param([string]$Path)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $expectedPath = "assets/RKImage.db"
  if (!(Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      found = $false
      expected_path = $expectedPath
      path = $null
      size_bytes = 0
      sha256 = $null
      sha256_prefix = $null
      streaming_assets_candidate = $false
      zip_entries = @()
      contains_image_db_core = $false
      contains_data_json = $false
      image_db_core_bytes = 0
      required_for_trusted_image_tracking = $true
      missing_reason = "apk_not_found"
    }
  }
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entries = @($zip.Entries | Where-Object { $_.FullName -match '(^|/)RKImage\.db$' })
    if ($entries.Count -eq 0) {
      return [pscustomobject]@{
        found = $false
        expected_path = $expectedPath
        path = $null
        size_bytes = 0
        sha256 = $null
        sha256_prefix = $null
        streaming_assets_candidate = $false
        zip_entries = @()
        contains_image_db_core = $false
        contains_data_json = $false
        image_db_core_bytes = 0
        required_for_trusted_image_tracking = $true
        missing_reason = "RKImage.db not found in APK assets"
      }
    }
    $entry = @(
      $entries |
        Sort-Object -Property @{ Expression = {
            if ($_.FullName -eq $expectedPath) { 0 }
            elseif ($_.FullName -match '^assets/') { 1 }
            else { 2 }
          }
        }, FullName |
        Select-Object -First 1
    )[0]
    $memory = New-Object System.IO.MemoryStream
    $stream = $entry.Open()
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
      $stream.CopyTo($memory)
      $bytes = $memory.ToArray()
      $hash = $sha.ComputeHash($bytes)
    } finally {
      $sha.Dispose()
      $stream.Dispose()
    }
    $hex = [System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant()
    $streamingCandidate = [bool]($entry.FullName -match '^assets/' -and $entry.FullName -match '(^|/)RKImage\.db$')

    $entries = @()
    $coreBytes = 0
    $hasCore = $false
    $hasData = $false
    $nestedError = $null
    try {
      $memory.Position = 0
      $nested = New-Object System.IO.Compression.ZipArchive($memory, [System.IO.Compression.ZipArchiveMode]::Read, $true)
      try {
        $entries = @($nested.Entries | ForEach-Object { $_.FullName })
        $coreEntry = @($nested.Entries | Where-Object { $_.FullName -eq "ImageDB.core" }) | Select-Object -First 1
        $dataEntry = @($nested.Entries | Where-Object { $_.FullName -eq "Data.json" }) | Select-Object -First 1
        $hasCore = [bool]$coreEntry
        $hasData = [bool]$dataEntry
        $coreBytes = if ($coreEntry) { [int64]$coreEntry.Length } else { 0 }
      } finally {
        $nested.Dispose()
      }
    } catch {
      $nestedError = "rkimage_db_zip_parse_failed"
    } finally {
      $memory.Dispose()
    }

    return [pscustomobject]@{
      found = $true
      expected_path = $expectedPath
      path = $entry.FullName
      size_bytes = [int64]$entry.Length
      sha256 = $hex
      sha256_prefix = $hex.Substring(0, [Math]::Min(12, $hex.Length))
      streaming_assets_candidate = $streamingCandidate
      zip_entries = $entries
      contains_image_db_core = $hasCore
      contains_data_json = $hasData
      image_db_core_bytes = $coreBytes
      required_for_trusted_image_tracking = $true
      missing_reason = $nestedError
    }
  } finally {
    $zip.Dispose()
  }
}

function Get-ApkNativeLibraries {
  param([string]$Path)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $abi = "arm64-v8a"
  $expected = @(
    [pscustomobject]@{ name = "libopenxr_loader.so"; path = "lib/$abi/libopenxr_loader.so" },
    [pscustomobject]@{ name = "librokid_openxr_api.so"; path = "lib/$abi/librokid_openxr_api.so" },
    [pscustomobject]@{ name = "libyuv.so"; path = "lib/$abi/libyuv.so" }
  )

  if (!(Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      required_for_live_rokid_openxr = $true
      abi = $abi
      found_all = $false
      expected_paths = @($expected | ForEach-Object { $_.path })
      missing_names = @($expected | ForEach-Object { $_.name })
      missing_paths = @($expected | ForEach-Object { $_.path })
      libraries = @($expected | ForEach-Object {
          [pscustomobject]@{
            name = $_.name
            expected_path = $_.path
            found = $false
            path = $null
            size_bytes = 0
            sha256_prefix = $null
          }
        })
      missing_reason = "apk_not_found"
    }
  }

  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $libraries = @()
    foreach ($item in $expected) {
      $entry = @($zip.Entries | Where-Object { $_.FullName -eq $item.path }) | Select-Object -First 1
      if (!$entry) {
        $libraries += [pscustomobject]@{
          name = $item.name
          expected_path = $item.path
          found = $false
          path = $null
          size_bytes = 0
          sha256_prefix = $null
        }
        continue
      }

      $memory = New-Object System.IO.MemoryStream
      $stream = $entry.Open()
      $sha = [System.Security.Cryptography.SHA256]::Create()
      try {
        $stream.CopyTo($memory)
        $hash = $sha.ComputeHash($memory.ToArray())
      } finally {
        $sha.Dispose()
        $stream.Dispose()
        $memory.Dispose()
      }
      $hex = [System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant()
      $libraries += [pscustomobject]@{
        name = $item.name
        expected_path = $item.path
        found = $true
        path = $entry.FullName
        size_bytes = [int64]$entry.Length
        sha256_prefix = $hex.Substring(0, [Math]::Min(12, $hex.Length))
      }
    }
  } finally {
    $zip.Dispose()
  }

  $missing = @($libraries | Where-Object { !$_.found })
  return [pscustomobject]@{
    required_for_live_rokid_openxr = $true
    abi = $abi
    found_all = [bool]($missing.Count -eq 0)
    expected_paths = @($expected | ForEach-Object { $_.path })
    missing_names = @($missing | ForEach-Object { $_.name })
    missing_paths = @($missing | ForEach-Object { $_.expected_path })
    libraries = @($libraries)
    missing_reason = if ($missing.Count -eq 0) { $null } else { "required_rokid_native_libraries_missing" }
  }
}

function Get-XmlTreeNamedValue {
  param(
    [AllowNull()][string]$ManifestText,
    [string]$Name,
    [int]$Window = 8
  )
  if ([string]::IsNullOrWhiteSpace($ManifestText)) { return $null }
  $lines = @($ManifestText -split "`n")
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match ('A:\s+android:name.*="' + [regex]::Escape($Name) + '"')) {
      $end = [Math]::Min($lines.Count - 1, $i + $Window)
      for ($j = $i + 1; $j -le $end; $j++) {
        $line = $lines[$j]
        if ($line -match 'A:\s+android:value.*="([^"]*)"\s+\(Raw:') { return $Matches[1] }
        if ($line -match 'A:\s+android:value.*0xffffffff') { return $true }
        if ($line -match 'A:\s+android:value.*0x0') { return $false }
        if ($line -match 'A:\s+android:value.*\(type 0x10\)(0x[0-9A-Fa-f]+|\d+)') { return $Matches[1] }
      }
    }
  }
  return $null
}

function Test-XmlTreeContainsName {
  param(
    [AllowNull()][string]$ManifestText,
    [string]$Name
  )
  if ([string]::IsNullOrWhiteSpace($ManifestText)) { return $false }
  return [bool]($ManifestText -match [regex]::Escape($Name))
}

function Test-UnityActivityResizeableFalse {
  param([AllowNull()][string]$ManifestText)
  if ([string]::IsNullOrWhiteSpace($ManifestText)) { return $false }
  $lines = @($ManifestText -split "`n")
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'com\.unity3d\.player\.UnityPlayer(Game)?Activity') {
      $end = [Math]::Min($lines.Count - 1, $i + 20)
      for ($j = $i + 1; $j -le $end; $j++) {
        if ($lines[$j] -match 'resizeableActivity.*0x0') { return $true }
        if ($lines[$j] -match 'resizeableActivity.*0xffffffff') { return $false }
      }
    }
  }
  return $false
}

function Get-ApkInfo {
  param(
    [string]$Path,
    [AllowNull()][string]$AaptPath
  )
  if (!(Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      exists = $false
      path = $Path
      size_bytes = 0
      sha256 = $null
      package = $null
      launchable_activity = $null
      sdk_version = $null
      target_sdk_version = $null
      permissions = @()
      manifest = [pscustomobject]@{
        uses_cleartext_traffic = $false
      network_security_config = $false
    }
    config = $null
    rokid_image_db = Get-ApkRokidImageDatabase -Path $Path
    native_libraries = Get-ApkNativeLibraries -Path $Path
    aapt_ok = $false
  }
}
  $hash = Get-FileHash -LiteralPath $Path -Algorithm SHA256
  $badgingText = ""
  $manifestText = ""
  if ($AaptPath) {
    $badging = Invoke-Capture -Command $AaptPath -Arguments @("dump", "badging", $Path)
    $badgingText = $badging.text
    $manifest = Invoke-Capture -Command $AaptPath -Arguments @("dump", "xmltree", $Path, "AndroidManifest.xml")
    $manifestText = $manifest.text
  }
  $package = $null
  $launchable = $null
  $sdk = $null
  $target = $null
  $permissions = @()
  foreach ($line in ($badgingText -split "`n")) {
    if ($line -match "package: name='([^']+)'") { $package = $Matches[1] }
    if ($line -match "launchable-activity: name='([^']+)'") { $launchable = $Matches[1] }
    if ($line -match "^sdkVersion:'([^']+)'") { $sdk = $Matches[1] }
    if ($line -match "^targetSdkVersion:'([^']+)'") { $target = $Matches[1] }
    if ($line -match "uses-permission: name='([^']+)'") { $permissions += $Matches[1] }
  }
  $usesCleartext = $manifestText -match 'usesCleartextTraffic.+0xffffffff|usesCleartextTraffic.+true'
  $networkSecurityConfig = $manifestText -match 'networkSecurityConfig'
  $rokidSdkValue = Get-XmlTreeNamedValue -ManifestText $manifestText -Name "com.rokid.sdk"
  $rokidUxrApplicationMode = Get-XmlTreeNamedValue -ManifestText $manifestText -Name "com.rokid.uxr.application.mode"
  $rokidUxrSdkFlag = Get-XmlTreeNamedValue -ManifestText $manifestText -Name "rokid_uxr_sdk"
  $openxrRuntimeQuery = Test-XmlTreeContainsName -ManifestText $manifestText -Name "com.rokid.openxr.runtime"
  $uxrLauncherQuery = Test-XmlTreeContainsName -ManifestText $manifestText -Name "com.rokid.uxr.launcher"
  $unityActivityResizeableFalse = Test-UnityActivityResizeableFalse -ManifestText $manifestText
  $uxrManifestReady = [bool]($rokidSdkValue -eq "uxr" -and $rokidUxrApplicationMode -eq "3d")
  return [pscustomobject]@{
    exists = $true
    path = $Path
    size_bytes = (Get-Item -LiteralPath $Path).Length
    sha256 = $hash.Hash.ToLowerInvariant()
    package = $package
    launchable_activity = $launchable
    sdk_version = $sdk
    target_sdk_version = $target
    permissions = @($permissions | Select-Object -Unique)
    manifest = [pscustomobject]@{
      uses_cleartext_traffic = [bool]$usesCleartext
      network_security_config = [bool]$networkSecurityConfig
      rokid_sdk_value = $rokidSdkValue
      rokid_uxr_application_mode = $rokidUxrApplicationMode
      rokid_uxr_sdk_flag = $rokidUxrSdkFlag
      openxr_runtime_query = [bool]$openxrRuntimeQuery
      uxr_launcher_query = [bool]$uxrLauncherQuery
      unity_activity_resizeable_false = [bool]$unityActivityResizeableFalse
      uxr_manifest_ready = [bool]$uxrManifestReady
    }
    config = Get-ApkConfig -Path $Path
    rokid_image_db = Get-ApkRokidImageDatabase -Path $Path
    native_libraries = Get-ApkNativeLibraries -Path $Path
    aapt_ok = -not [string]::IsNullOrWhiteSpace($package)
  }
}

function Get-LaunchDiagnostics {
  param(
    [AllowNull()][string]$AdbPath,
    [string]$PackageName,
    [string[]]$KnownDeviceIds = @()
  )
  if (!$AdbPath) {
    return [pscustomobject]@{
      requested = $false
      query_ok = $false
      activity_enabled = $null
      activity_exported = $null
      can_launch_by_default = $null
      is_uxr_app = $null
      launch_error_code = $null
      notes = @("adb_not_available")
    }
  }

  $query = Invoke-Capture -Command $AdbPath -Arguments @(
    "shell",
    "cmd",
    "package",
    "query-activities",
    "-a",
    "android.intent.action.MAIN",
    "-c",
    "android.intent.category.LAUNCHER",
    $PackageName
  ) -KnownDeviceIds $KnownDeviceIds
  $text = "$($query.text)"
  $notes = @()
  if ($text -match "isUxrApp=(true|false)") {
    $isUxrApp = [System.Convert]::ToBoolean($Matches[1])
  } else {
    $isUxrApp = $null
    $notes += "is_uxr_app_not_reported"
  }
  if ($text -match "canLaunchByDefault=(true|false)") {
    $canLaunchByDefault = [System.Convert]::ToBoolean($Matches[1])
  } else {
    $canLaunchByDefault = $null
    $notes += "can_launch_by_default_not_reported"
  }
  if ($text -match "enabled=(true|false)") {
    $activityEnabled = [System.Convert]::ToBoolean($Matches[1])
  } else {
    $activityEnabled = $null
  }
  if ($text -match "exported=(true|false)") {
    $activityExported = [System.Convert]::ToBoolean($Matches[1])
  } else {
    $activityExported = $null
  }

  return [pscustomobject]@{
    requested = $true
    query_ok = [bool]$query.ok
    activity_enabled = $activityEnabled
    activity_exported = $activityExported
    can_launch_by_default = $canLaunchByDefault
    is_uxr_app = $isUxrApp
    launch_error_code = $null
    notes = @($notes)
  }
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

$adbPath = Find-Adb
$aaptPath = Find-Aapt
$adb = Get-AdbDevices -AdbPath $adbPath
$apk = Get-ApkInfo -Path $ApkPath -AaptPath $aaptPath
$knownIds = @($adb.raw_device_ids)
$errors = New-Object 'System.Collections.Generic.List[string]'
$warnings = New-Object 'System.Collections.Generic.List[string]'
$operatorPairingCode = $null
$operatorPairingId = $null
$pairingIssue = [pscustomobject]@{
  requested = [bool]$PairWithOperator
  ok = $false
  api_base_url_redacted = if ($PairWithOperator) { Redact-Text -Text $ApiBaseUrl } else { $null }
  code_hash_prefix = $null
  pairing_id_hash_prefix = $null
  expires_at = $null
  consume_on = "/api/device/register"
  required_for_hardware_acceptance = $true
  code_persisted = $false
  raw_pairing_code_included = $false
  error = if ($PairWithOperator) { "not_attempted" } else { $null }
}
$pairingVerification = [pscustomobject]@{
  requested = [bool]$PairWithOperator
  ok = $false
  paired_session_count = 0
  hardware_acceptance_eligible_session_count = 0
  latest_session_hash_prefix = $null
  latest_pairing_id_hash_prefix = $null
  raw_session_ids_included = $false
  error = if ($PairWithOperator) { "not_attempted" } else { $null }
}

if (!$adb.found) { [void]$errors.Add("adb_not_found") }
if (!$apk.exists) { [void]$errors.Add("apk_not_found") }
if (!$aaptPath) { [void]$errors.Add("aapt_not_found") }
if (!$apk.aapt_ok) { [void]$errors.Add("apk_badging_unavailable") }
if ($apk.package -and $apk.package -ne $PackageName) { [void]$errors.Add("apk_package_mismatch") }
if ($RequireDevice -and $adb.device_state_count -lt 1) { [void]$errors.Add("adb_device_required") }
if ($adb.device_state_count -gt 1 -and $InstallAndLaunch) { [void]$errors.Add("multiple_adb_devices_present") }
if ([string]::IsNullOrWhiteSpace($apk.package)) { [void]$errors.Add("apk_package_missing") }
if ([string]::IsNullOrWhiteSpace($apk.launchable_activity)) { [void]$errors.Add("apk_launchable_activity_missing") }
if (!($apk.permissions -contains "android.permission.INTERNET")) { [void]$errors.Add("apk_internet_permission_missing") }
if (!$apk.manifest.uses_cleartext_traffic) { [void]$errors.Add("apk_cleartext_traffic_missing") }
if (!$apk.manifest.network_security_config) { [void]$errors.Add("apk_network_security_config_missing") }
if (!$apk.manifest.uxr_manifest_ready) { [void]$errors.Add("apk_rokid_uxr_manifest_missing") }
if (!$apk.manifest.unity_activity_resizeable_false) { [void]$warnings.Add("apk_unity_activity_resizeable_not_false") }
if (!$apk.rokid_image_db.found) { [void]$warnings.Add("apk_rkimage_db_missing") }
elseif (!$apk.rokid_image_db.streaming_assets_candidate) { [void]$warnings.Add("apk_rkimage_db_not_in_streaming_assets") }
elseif (!$apk.rokid_image_db.contains_image_db_core) { [void]$warnings.Add("apk_rkimage_db_core_missing") }
elseif ($apk.rokid_image_db.image_db_core_bytes -lt 1024) { [void]$warnings.Add("apk_rkimage_db_core_too_small") }
if ($apk.rokid_image_db.found -and !$apk.rokid_image_db.contains_data_json) { [void]$warnings.Add("apk_rkimage_db_data_json_missing") }
if (!$apk.native_libraries.found_all) { [void]$errors.Add("apk_rokid_native_libs_missing") }
if (!$apk.config.found) { [void]$errors.Add("apk_innerworld_config_missing") }
if ($apk.config.space_id -ne "innerworld_campus_wall") { [void]$errors.Add("apk_space_id_mismatch") }
if ($PairWithOperator -and !$InstallAndLaunch) { [void]$errors.Add("operator_pairing_requires_install_and_launch") }

$stationDevices = @($adb.devices | Where-Object {
    $_.state -eq "device" -and
    (($_.product -match '^stationPro$') -or ($_.device -match '^stationPro$') -or ($_.model -match '^RG[_-]?stationPro$'))
  })
if (($RequireDevice -or $InstallAndLaunch) -and $stationDevices.Count -ne 1) {
  [void]$errors.Add("station_pro_adb_device_required")
}

$networkReadyForDevice = [bool]$apk.config.network_ready_for_device
if (!$networkReadyForDevice) {
  [void]$warnings.Add("apk_config_is_not_lan_ready")
}

$pairingLaunchExtraInjected = $false
if ($PairWithOperator -and $errors.Count -eq 0) {
  $pairingResult = Invoke-OperatorPairingIssue -BaseUrl $ApiBaseUrl
  $pairingIssue = $pairingResult.report
  $operatorPairingCode = $pairingResult.code
  $operatorPairingId = $pairingResult.pairing_id
  if (!$pairingIssue.ok -or [string]::IsNullOrWhiteSpace($operatorPairingCode)) {
    [void]$errors.Add("operator_pairing_issue_failed")
  }
}

$install = [pscustomobject]@{ requested = [bool]$InstallAndLaunch; ok = $false; exit_code = $null; output = $null }
$forceStop = [pscustomobject]@{ requested = [bool]$InstallAndLaunch; ok = $false; exit_code = $null; output = $null }
$launch = [pscustomobject]@{ requested = [bool]$InstallAndLaunch; ok = $false; exit_code = $null; method = $null; output = $null }
$pidof = [pscustomobject]@{ requested = [bool]$InstallAndLaunch; ok = $false; exit_code = $null; output = $null }
$launchDiagnostics = [pscustomobject]@{
  requested = [bool]$InstallAndLaunch
  query_ok = $false
  activity_enabled = $null
  activity_exported = $null
  can_launch_by_default = $null
  is_uxr_app = $null
  launch_error_code = $null
  notes = @()
}

if ($InstallAndLaunch -and $errors.Count -eq 0) {
  $knownPairingCodes = @($operatorPairingCode | Where-Object { ![string]::IsNullOrWhiteSpace($_) })
  $installResult = Invoke-Capture -Command $adbPath -Arguments @("install", "-r", $ApkPath) -KnownDeviceIds $knownIds -KnownPairingCodes $knownPairingCodes
  $install = [pscustomobject]@{
    requested = $true
    ok = [bool]$installResult.ok
    exit_code = $installResult.exit_code
    output = $installResult.text
  }
  if (!$install.ok) { [void]$errors.Add("adb_install_failed") }

  if ($install.ok) {
    $forceStopResult = Invoke-Capture -Command $adbPath -Arguments @("shell", "am", "force-stop", $PackageName) -KnownDeviceIds $knownIds -KnownPairingCodes $knownPairingCodes
    $forceStop = [pscustomobject]@{
      requested = $true
      ok = [bool]$forceStopResult.ok
      exit_code = $forceStopResult.exit_code
      output = $forceStopResult.text
    }
    if (!$forceStop.ok) { [void]$warnings.Add("adb_force_stop_failed") }

    $launchDiagnostics = Get-LaunchDiagnostics -AdbPath $adbPath -PackageName $PackageName -KnownDeviceIds $knownIds
    $launchArgs = if ($apk.launchable_activity) {
      @("shell", "am", "start", "-W", "-n", "$PackageName/$($apk.launchable_activity)")
    } else {
      @("shell", "monkey", "-p", $PackageName, "-c", "android.intent.category.LAUNCHER", "1")
    }
    if ($apk.launchable_activity -and $PairWithOperator -and ![string]::IsNullOrWhiteSpace($operatorPairingCode)) {
      $launchArgs += @(
        "--es",
        "innerworld_pairing_code",
        $operatorPairingCode,
        "--es",
        "com.innerworld.rokid.OPERATOR_PAIRING_CODE",
        $operatorPairingCode
      )
      $pairingLaunchExtraInjected = $true
    }
    $launchMethod = if ($apk.launchable_activity) { "am_start_wait" } else { "monkey_launcher" }
    $launchResult = Invoke-Capture -Command $adbPath -Arguments $launchArgs -KnownDeviceIds $knownIds -KnownPairingCodes $knownPairingCodes
    $launchText = "$($launchResult.text)"
    $launchOk = [bool]($launchResult.ok -and $launchText -notmatch "(?m)^Error:")
    if ($launchText -match "unknown error code\s+(\d+)") {
      $launchDiagnostics.launch_error_code = $Matches[1]
      if ($launchDiagnostics.notes -notcontains "activity_start_error") {
        $launchDiagnostics.notes += "activity_start_error"
      }
    }
    $launch = [pscustomobject]@{
      requested = $true
      ok = $launchOk
      exit_code = $launchResult.exit_code
      method = $launchMethod
      output = $launchResult.text
    }
    if (!$launch.ok) { [void]$errors.Add("adb_launch_failed") }

    Start-Sleep -Seconds 2
    $pidResult = Invoke-Capture -Command $adbPath -Arguments @("shell", "pidof", $PackageName) -KnownDeviceIds $knownIds -KnownPairingCodes $knownPairingCodes
    $pidof = [pscustomobject]@{
      requested = $true
      ok = [bool]($pidResult.ok -and -not [string]::IsNullOrWhiteSpace($pidResult.text))
      exit_code = $pidResult.exit_code
      output = $pidResult.text.Trim()
    }
    if (!$pidof.ok) { [void]$warnings.Add("apk_process_not_observed_after_launch") }
    if (!$pidof.ok) { [void]$errors.Add("apk_process_not_observed_after_launch") }
    if ($PairWithOperator -and $pairingLaunchExtraInjected) {
      $pairingVerification = Test-OperatorPairedSession -BaseUrl $ApiBaseUrl -PairingId $operatorPairingId -TimeoutSeconds $PairingVerifyTimeoutSeconds
      if (!$pairingVerification.ok) {
        [void]$warnings.Add("operator_paired_session_not_verified")
      }
    }
  }
}

$installLaunchIntentAccepted = [bool]($install.ok -and $launch.ok)
$processObserved = [bool]$pidof.ok
$installRunSmoke = [bool]($installLaunchIntentAccepted -and $processObserved)
$evidenceKind = if ($InstallAndLaunch) { "mutating_launch" } else { "inspect_only" }
$pairingLaunchExtraKeys = [string[]]@()
if ($pairingLaunchExtraInjected) {
  $pairingLaunchExtraKeys = [string[]]@("innerworld_pairing_code", "com.innerworld.rokid.OPERATOR_PAIRING_CODE")
}

$report = [pscustomobject]@{
  schema = "innerworld-station-pro-apk-smoke/v1"
  generated_at = (Get-Date).ToString("o")
  ok = $errors.Count -eq 0
  evidence_kind = $evidenceKind
  install_and_launch = [bool]$InstallAndLaunch
  require_device = [bool]$RequireDevice
  pair_with_operator = [bool]$PairWithOperator
  privacy = [pscustomobject]@{
    full_serials_included = $false
    full_usb_instance_ids_included = $false
    private_ips_included = $false
    mac_addresses_included = $false
    raw_pairing_codes_included = $false
    raw_session_ids_included = $false
    note = "ADB ids are hashed/redacted; pairing codes are launch-only secrets and are never written to evidence."
  }
  adb = [pscustomobject]@{
    found = $adb.found
    selected_path = $adb.selected_path
    devices = $adb.devices
    device_state_count = $adb.device_state_count
  }
  aapt = [pscustomobject]@{
    found = -not [string]::IsNullOrWhiteSpace($aaptPath)
    selected_path = $aaptPath
  }
  apk = $apk
  readiness = [pscustomobject]@{
    install_launch_intent_accepted = $installLaunchIntentAccepted
    process_observed = $processObserved
    install_run_smoke = $installRunSmoke
    network_ready_for_device = [bool]$networkReadyForDevice
    operator_pairing_requested = [bool]$PairWithOperator
    operator_pairing_issue_ok = [bool]$pairingIssue.ok
    operator_pairing_launch_extra_injected = [bool]$pairingLaunchExtraInjected
    operator_pairing_verified = [bool]$pairingVerification.ok
    live_heartbeat_ready = $false
    hardware_acceptance_ready = $false
    note = "APK install/run smoke and operator pairing proof are not field acceptance. Trusted A1/A2/A3 QR/image_tracking/SLAM observations are still required."
  }
  pairing = [pscustomobject]@{
    issue = $pairingIssue
    launch_extra = [pscustomobject]@{
      requested = [bool]$PairWithOperator
      injected = [bool]$pairingLaunchExtraInjected
      keys = $pairingLaunchExtraKeys
      raw_pairing_code_included = $false
    }
    verification = $pairingVerification
  }
  actions = [pscustomobject]@{
    install = $install
    force_stop = $forceStop
    launch = $launch
    pidof = $pidof
  }
  diagnostics = [pscustomobject]@{
    launch = $launchDiagnostics
  }
  warnings = @($warnings)
  errors = @($errors)
}

$jsonPath = Join-Path $OutputRoot "station-pro-apk-smoke-$stamp.json"
$latestJson = Join-Path $OutputRoot "station-pro-apk-smoke-latest.json"
$mdPath = Join-Path $OutputRoot "station-pro-apk-smoke-$stamp.md"
$latestMd = Join-Path $OutputRoot "station-pro-apk-smoke-latest.md"
$kindLatestJson = if ($InstallAndLaunch) {
  Join-Path $OutputRoot "station-pro-apk-smoke-latest-mutating-launch.json"
} else {
  Join-Path $OutputRoot "station-pro-apk-smoke-latest-inspect.json"
}
$kindLatestMd = if ($InstallAndLaunch) {
  Join-Path $OutputRoot "station-pro-apk-smoke-latest-mutating-launch.md"
} else {
  Join-Path $OutputRoot "station-pro-apk-smoke-latest-inspect.md"
}

$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $latestJson -Encoding UTF8
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $kindLatestJson -Encoding UTF8

$deviceLines = if ($report.adb.devices.Count) {
  $report.adb.devices | ForEach-Object {
    "- $($_.transport) $($_.state) model=$($_.model) product=$($_.product) id=$($_.id_redacted)"
  }
} else {
  @("- No ADB devices reported.")
}

$warningLines = if ($warnings.Count) { $warnings | ForEach-Object { "- $_" } } else { @("- none") }
$errorLines = if ($errors.Count) { $errors | ForEach-Object { "- $_" } } else { @("- none") }

$markdown = @(
  "# Station Pro APK Smoke",
  "",
  "- Generated: $($report.generated_at)",
  "- Schema: $($report.schema)",
  "- OK: $($report.ok)",
  "- Evidence kind: $($report.evidence_kind)",
  "- Install and launch requested: $($report.install_and_launch)",
  "- Operator pairing requested: $($report.pair_with_operator)",
  "- APK package: $($report.apk.package)",
  "- Launchable activity: $($report.apk.launchable_activity)",
  "- APK config base_url: $($report.apk.config.base_url_redacted)",
  "- APK config host kind: $($report.apk.config.host_kind)",
  "- Network ready for device: $($report.readiness.network_ready_for_device)",
  "- Rokid UXR manifest ready: $($report.apk.manifest.uxr_manifest_ready)",
  "- Rokid SDK marker: $($report.apk.manifest.rokid_sdk_value)",
  "- Rokid UXR application mode: $($report.apk.manifest.rokid_uxr_application_mode)",
  "- RKImage.db packaged: $($report.apk.rokid_image_db.found)",
  "- RKImage.db path: $($report.apk.rokid_image_db.path)",
  "- RKImage.db StreamingAssets candidate: $($report.apk.rokid_image_db.streaming_assets_candidate)",
  "- RKImage.db contains ImageDB.core: $($report.apk.rokid_image_db.contains_image_db_core)",
  "- RKImage.db ImageDB.core bytes: $($report.apk.rokid_image_db.image_db_core_bytes)",
  "- Rokid native libs packaged: $($report.apk.native_libraries.found_all)",
  "- Rokid native libs missing: $(@($report.apk.native_libraries.missing_names) -join ', ')",
  "- Install/launch intent accepted: $($report.readiness.install_launch_intent_accepted)",
  "- Process observed: $($report.readiness.process_observed)",
  "- Install/run smoke: $($report.readiness.install_run_smoke)",
  "- Operator pairing issue OK: $($report.readiness.operator_pairing_issue_ok)",
  "- Operator pairing launch extra injected: $($report.readiness.operator_pairing_launch_extra_injected)",
  "- Operator pairing verified: $($report.readiness.operator_pairing_verified)",
  "- Activity is UXR app: $($report.diagnostics.launch.is_uxr_app)",
  "- Activity can launch by default: $($report.diagnostics.launch.can_launch_by_default)",
  "- Launch error code: $($report.diagnostics.launch.launch_error_code)",
  "- Live heartbeat ready: false",
  "- Hardware acceptance ready: false",
  "",
  "## ADB Devices",
  "",
  $deviceLines,
  "",
  "## Warnings",
  "",
  $warningLines,
  "",
  "## Errors",
  "",
  $errorLines,
  "",
  "## Boundary",
  "",
  "This smoke only proves package inspection and, when requested, ADB install/launch. It does not prove Rokid UXR live SDK binding, LAN heartbeat, trusted observations, or field acceptance."
)

$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
$markdown | Set-Content -LiteralPath $latestMd -Encoding UTF8
$markdown | Set-Content -LiteralPath $kindLatestMd -Encoding UTF8

Write-Host ($report | ConvertTo-Json -Depth 8)

if ($errors.Count -gt 0) {
  exit 2
}
