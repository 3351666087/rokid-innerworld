param(
  [string]$UnityExe = "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1\Editor\Unity.exe",
  [string]$ProjectPath = "",
  [string]$OutputRoot = "",
  [string]$LogPath = "",
  [switch]$SkipUnityBuild,
  [switch]$SkipRokidImageDbBuild,
  [switch]$SkipGradleFallback,
  [switch]$SkipIdmFallback,
  [switch]$RunPostChecks,
  [switch]$RequirePostCheckDevice,
  [string]$LocalMavenRepo = "D:\Downloads\RokidCache\gradle-m2",
  [string]$IdmExe = "C:\Program Files (x86)\Internet Download Manager\IDMan.exe"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
  $ProjectPath = Join-Path $root "apps\unity-shell"
}
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $root "output\unity-build"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null

if ([string]::IsNullOrWhiteSpace($LogPath)) {
  $LogPath = Join-Path $OutputRoot "unity-build-android-$stamp.log"
}

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

function Get-UnityConfigEvidence {
  $configPath = Join-Path $root "apps\unity-shell\Assets\StreamingAssets\innerworld-config.json"
  if (!(Test-Path -LiteralPath $configPath)) {
    return [pscustomobject]@{
      exists = $false
      path = $configPath
      base_url_redacted = $null
      host_kind = "missing"
      host_hash_prefix = $null
      network_ready_for_device = $false
      space_id = $null
    }
  }

  $json = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  $baseEvidence = Convert-BaseUrlToEvidence -BaseUrl "$($json.base_url)"
  return [pscustomobject]@{
    exists = $true
    path = $configPath
    base_url_redacted = $baseEvidence.base_url_redacted
    host_kind = $baseEvidence.host_kind
    host_hash_prefix = $baseEvidence.host_hash_prefix
    network_ready_for_device = $baseEvidence.network_ready_for_device
    space_id = $json.space_id
  }
}

function Get-GradleRoot {
  param([string]$UnityProjectPath)
  return Join-Path $UnityProjectPath "Library\Bee\Android\Prj\IL2CPP\Gradle"
}

function Convert-ToGradlePath {
  param([string]$Path)
  return ([System.IO.Path]::GetFullPath($Path)).Replace("\", "/")
}

function Patch-GradleSettingsRepositories {
  param(
    [string]$GradleRoot,
    [string]$LocalRepo
  )

  $settingsPath = Join-Path $GradleRoot "settings.gradle"
  if (!(Test-Path -LiteralPath $settingsPath)) {
    throw "Generated Gradle settings.gradle not found: $settingsPath"
  }

  New-Item -ItemType Directory -Force -Path $LocalRepo | Out-Null
  $localRepoUri = Convert-ToGradlePath -Path $LocalRepo
  $desiredRepos = @(
    [pscustomobject]@{ Marker = $localRepoUri; Text = "maven { url uri('$localRepoUri') }" },
    [pscustomobject]@{ Marker = "https://maven.aliyun.com/repository/gradle-plugin"; Text = "maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }" },
    [pscustomobject]@{ Marker = "https://maven.aliyun.com/repository/google"; Text = "maven { url 'https://maven.aliyun.com/repository/google' }" },
    [pscustomobject]@{ Marker = "https://maven.aliyun.com/repository/public"; Text = "maven { url 'https://maven.aliyun.com/repository/public' }" },
    [pscustomobject]@{ Marker = "https://maven.aliyun.com/repository/central"; Text = "maven { url 'https://maven.aliyun.com/repository/central' }" }
  )

  $lines = @(Get-Content -LiteralPath $settingsPath)
  $result = New-Object 'System.Collections.Generic.List[string]'
  $i = 0
  while ($i -lt $lines.Count) {
    $line = $lines[$i]
    if ($line -match '^\s*repositories\s*\{\s*$') {
      $start = $i
      $depth = 0
      $end = $i
      for ($j = $start; $j -lt $lines.Count; $j++) {
        $open = [regex]::Matches($lines[$j], '\{').Count
        $close = [regex]::Matches($lines[$j], '\}').Count
        $depth += ($open - $close)
        if ($j -gt $start -and $depth -le 0) {
          $end = $j
          break
        }
      }

      $blockLines = @($lines[$start..$end])
      $blockText = $blockLines -join "`n"
      $indent = ($line -replace 'repositories.*$', '') + '    '
      $result.Add($line)
      foreach ($repo in $desiredRepos) {
        if ($blockText -notmatch [regex]::Escape($repo.Marker)) {
          $result.Add("$indent$($repo.Text)")
        }
      }
      for ($k = $start + 1; $k -le $end; $k++) {
        $result.Add($lines[$k])
      }
      $i = $end + 1
    } else {
      $result.Add($line)
      $i++
    }
  }

  $newText = ($result -join "`r`n") + "`r`n"
  $oldText = (Get-Content -LiteralPath $settingsPath -Raw)
  $changed = $newText -ne $oldText
  if ($changed) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($settingsPath, $newText, $utf8NoBom)
  }

  return [pscustomobject]@{
    settings_path = $settingsPath
    changed = [bool]$changed
    local_maven_repo = [System.IO.Path]::GetFullPath($LocalRepo)
    local_maven_repo_gradle_uri = $localRepoUri
  }
}

function Get-GradleDownloadUrls {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return @() }
  $text = Get-Content -LiteralPath $Path -Raw
  $urls = New-Object 'System.Collections.Generic.List[string]'
  foreach ($match in [regex]::Matches($text, 'https://[^\s''")<>]+')) {
    $url = $match.Value.TrimEnd(".", ",", ";")
    if ($url -match '\.(jar|pom|module|aar)(\?|$)') {
      if (!$urls.Contains($url)) { $urls.Add($url) }
    }
  }
  return @($urls)
}

function Find-RokidOpenXrLoaderAar {
  $packageRoot = Join-Path $root "apps\unity-shell\Library\PackageCache"
  $candidate = Get-ChildItem -LiteralPath $packageRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "com.rokid.openxr@*" } |
    ForEach-Object { Join-Path $_.FullName "Runtime\Android\openxr_loader.aar" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
  if ($candidate) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }
  return $null
}

function Copy-RokidNativeLibsToGradleProject {
  param([string]$GradleRoot)

  $aarPath = Find-RokidOpenXrLoaderAar
  $requiredEntries = @(
    "jni/arm64-v8a/librokid_openxr_api.so",
    "jni/arm64-v8a/libyuv.so"
  )
  $destDir = Join-Path $GradleRoot "unityLibrary\src\main\jniLibs\arm64-v8a"
  $copied = @()
  $missing = @()

  if ([string]::IsNullOrWhiteSpace($aarPath)) {
    return [pscustomobject]@{
      attempted = $true
      ok = $false
      source_aar = $null
      destination = $destDir
      copied = @()
      missing = $requiredEntries
      error = "openxr_loader_aar_not_found"
    }
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  $zip = [System.IO.Compression.ZipFile]::OpenRead($aarPath)
  try {
    foreach ($entryName in $requiredEntries) {
      $entry = @($zip.Entries | Where-Object { $_.FullName -eq $entryName }) | Select-Object -First 1
      if (!$entry) {
        $missing += $entryName
        continue
      }
      $destPath = Join-Path $destDir ([System.IO.Path]::GetFileName($entryName))
      $stream = $entry.Open()
      $fileStream = [System.IO.File]::Open($destPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
      try {
        $stream.CopyTo($fileStream)
      } finally {
        $fileStream.Dispose()
        $stream.Dispose()
      }
      $copied += [pscustomobject]@{
        entry = $entryName
        path = $destPath
        bytes = (Get-Item -LiteralPath $destPath).Length
      }
    }
  } finally {
    $zip.Dispose()
  }

  return [pscustomobject]@{
    attempted = $true
    ok = [bool]($missing.Count -eq 0 -and $copied.Count -eq $requiredEntries.Count)
    source_aar = $aarPath
    destination = $destDir
    copied = @($copied)
    missing = @($missing)
    error = if ($missing.Count -eq 0) { $null } else { "required_native_lib_entries_missing" }
  }
}

function Convert-MavenUrlToLocalPath {
  param(
    [string]$Url,
    [string]$LocalRepo
  )
  $uri = [Uri]$Url
  $relative = $uri.AbsolutePath.TrimStart("/")
  $prefixes = @(
    "m2/",
    "maven2/",
    "repository/public/",
    "repository/google/",
    "repository/central/",
    "repository/gradle-plugin/"
  )
  foreach ($prefix in $prefixes) {
    if ($relative.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      $relative = $relative.Substring($prefix.Length)
      break
    }
  }
  return Join-Path $LocalRepo ($relative -replace '/', '\')
}

function Invoke-IdmDependencyDownloads {
  param(
    [string[]]$Urls,
    [string]$LocalRepo,
    [string]$IdmPath,
    [int]$TimeoutSeconds = 300
  )

  if ($Urls.Count -eq 0) {
    return [pscustomobject]@{
      attempted = $false
      idm_found = Test-Path -LiteralPath $IdmPath
      url_count = 0
      downloaded_count = 0
      downloads = @()
    }
  }
  if (!(Test-Path -LiteralPath $IdmPath)) {
    return [pscustomobject]@{
      attempted = $false
      idm_found = $false
      url_count = $Urls.Count
      downloaded_count = 0
      downloads = @()
      error = "idm_not_found"
    }
  }

  $downloads = @()
  foreach ($url in $Urls) {
    $target = Convert-MavenUrlToLocalPath -Url $url -LocalRepo $LocalRepo
    $targetDir = Split-Path -Parent $target
    $fileName = Split-Path -Leaf $target
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    $proc = Start-Process -FilePath $IdmPath -ArgumentList @("/d", $url, "/p", $targetDir, "/f", $fileName, "/n") -PassThru -WindowStyle Hidden
    $proc.WaitForExit()
    $downloads += [pscustomobject]@{
      url = $url
      target = $target
      queued_exit_code = $proc.ExitCode
      exists = Test-Path -LiteralPath $target
      size_bytes = if (Test-Path -LiteralPath $target) { (Get-Item -LiteralPath $target).Length } else { 0 }
    }
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $missing = @($downloads | Where-Object {
        !(Test-Path -LiteralPath $_.target) -or (Get-Item -LiteralPath $_.target -ErrorAction SilentlyContinue).Length -le 0
      })
    if ($missing.Count -eq 0) { break }
    Start-Sleep -Seconds 3
  }

  $finalDownloads = @($downloads | ForEach-Object {
      $exists = Test-Path -LiteralPath $_.target
      [pscustomobject]@{
        url = $_.url
        target = $_.target
        queued_exit_code = $_.queued_exit_code
        exists = $exists
        size_bytes = if ($exists) { (Get-Item -LiteralPath $_.target).Length } else { 0 }
      }
    })

  return [pscustomobject]@{
    attempted = $true
    idm_found = $true
    url_count = $Urls.Count
    downloaded_count = @($finalDownloads | Where-Object { $_.exists -and $_.size_bytes -gt 0 }).Count
    downloads = $finalDownloads
  }
}

function Invoke-GeneratedGradleBuild {
  param(
    [string]$GradleRoot,
    [string]$UnityExePath,
    [string]$LogFile,
    [string]$LocalRepo,
    [string]$IdmPath,
    [bool]$AllowIdmFallback
  )

  $patch = Patch-GradleSettingsRepositories -GradleRoot $GradleRoot -LocalRepo $LocalRepo
  $rokidNativeLibs = Copy-RokidNativeLibsToGradleProject -GradleRoot $GradleRoot
  if (!$rokidNativeLibs.ok) {
    throw "Failed to stage Rokid native libraries into generated Gradle project: $($rokidNativeLibs.error)"
  }
  $editorDir = Split-Path -Parent $UnityExePath
  $java = Join-Path $editorDir "Data\PlaybackEngines\AndroidPlayer\OpenJDK\bin\java.exe"
  $gradleLauncher = Join-Path $editorDir "Data\PlaybackEngines\AndroidPlayer\Tools\gradle\lib\gradle-launcher-9.1.0.jar"
  if (!(Test-Path -LiteralPath $java)) { throw "Unity OpenJDK java.exe not found: $java" }
  if (!(Test-Path -LiteralPath $gradleLauncher)) { throw "Unity Gradle launcher not found: $gradleLauncher" }

  Push-Location $GradleRoot
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $java -classpath $gradleLauncher org.gradle.launcher.GradleMain '-Dorg.gradle.jvmargs=-Xmx4096m' ':launcher:assembleRelease' '--stacktrace' '--no-daemon' *> $LogFile
    $firstExit = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
    Pop-Location
  }

  $idm = [pscustomobject]@{
    attempted = $false
    idm_found = Test-Path -LiteralPath $IdmPath
    url_count = 0
    downloaded_count = 0
    downloads = @()
  }
  $finalExit = $firstExit
  $finalLog = $LogFile

  if ($firstExit -ne 0 -and $AllowIdmFallback) {
    $urls = @(Get-GradleDownloadUrls -Path $LogFile)
    $idm = Invoke-IdmDependencyDownloads -Urls $urls -LocalRepo $LocalRepo -IdmPath $IdmPath
    if ($idm.attempted -and $idm.url_count -gt 0 -and $idm.downloaded_count -eq $idm.url_count) {
      $retryLog = [System.IO.Path]::ChangeExtension($LogFile, $null) + "-idm-retry.log"
      Push-Location $GradleRoot
      try {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        & $java -classpath $gradleLauncher org.gradle.launcher.GradleMain '-Dorg.gradle.jvmargs=-Xmx4096m' ':launcher:assembleRelease' '--stacktrace' '--no-daemon' *> $retryLog
        $finalExit = $LASTEXITCODE
      } finally {
        $ErrorActionPreference = $previousErrorActionPreference
        Pop-Location
      }
      $finalLog = $retryLog
    }
  }

  return [pscustomobject]@{
    attempted = $true
    ok = [bool]($finalExit -eq 0)
    first_exit_code = $firstExit
    exit_code = $finalExit
    log_path = $finalLog
    patch = $patch
    rokid_native_libs = $rokidNativeLibs
    idm = $idm
  }
}

function Copy-GeneratedGradleApk {
  param(
    [string]$GradleRoot,
    [string]$OutputApk
  )
  $releaseDir = Join-Path $GradleRoot "launcher\build\outputs\apk\release"
  $preferred = Join-Path $releaseDir "launcher-release.apk"
  $source = $preferred
  if (!(Test-Path -LiteralPath $source)) {
    $candidate = Get-ChildItem -LiteralPath $releaseDir -Filter "*.apk" -File -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if (!$candidate) { throw "Gradle build succeeded but no release APK was found in $releaseDir" }
    $source = $candidate.FullName
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputApk) | Out-Null
  Copy-Item -LiteralPath $source -Destination $OutputApk -Force
  return [pscustomobject]@{
    source = $source
    output = $OutputApk
  }
}

function Get-ApkEvidence {
  param([string]$Path)

  $exists = Test-Path -LiteralPath $Path
  $file = if ($exists) { Get-Item -LiteralPath $Path } else { $null }
  $hash = if ($exists) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() } else { $null }

  return [pscustomobject]@{
    exists = [bool]$exists
    path = $Path
    size_bytes = if ($file) { $file.Length } else { 0 }
    sha256 = $hash
    last_write_time = if ($file) { $file.LastWriteTime.ToString("o") } else { $null }
  }
}

function Get-ApkRokidNativeLibraryEvidence {
  param([string]$Path)

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
      missing_names = @($expected | ForEach-Object { $_.name })
      libraries = @($expected | ForEach-Object {
          [pscustomobject]@{
            name = $_.name
            expected_path = $_.path
            found = $false
            size_bytes = 0
          }
        })
      missing_reason = "apk_not_found"
    }
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $libraries = @()
    foreach ($item in $expected) {
      $entry = @($zip.Entries | Where-Object { $_.FullName -eq $item.path }) | Select-Object -First 1
      $libraries += [pscustomobject]@{
        name = $item.name
        expected_path = $item.path
        found = [bool]$entry
        size_bytes = if ($entry) { [int64]$entry.Length } else { 0 }
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
    missing_names = @($missing | ForEach-Object { $_.name })
    libraries = @($libraries)
    missing_reason = if ($missing.Count -eq 0) { $null } else { "required_rokid_native_libraries_missing" }
  }
}

function Invoke-ProcessPollingWait {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [int]$TimeoutSeconds = 1800
  )

  $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -PassThru -WindowStyle Hidden
  $exited = $process.WaitForExit($TimeoutSeconds * 1000)
  if (!$exited) {
    try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}
    throw "Process timed out after $TimeoutSeconds seconds: $FilePath"
  }
  try { $process.Refresh() } catch {}
  $exitCode = $process.ExitCode
  return [pscustomobject]@{
    id = $process.Id
    exit_code = $exitCode
  }
}

function Redact-BuildOutput {
  param([AllowNull()][string]$Text)
  if ($null -eq $Text) { return $null }
  $redacted = "$Text"
  $redacted = $redacted -replace '\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b', '<mac-redacted>'
  $redacted = $redacted -replace '\b(?:(?:10|127)\.(?:\d{1,3}\.){2}\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b', '<private-ip-redacted>'
  $redacted = $redacted -replace 'USB\\VID_[0-9A-Fa-f]{4}&PID_[0-9A-Fa-f]{4}\\[^\\\s]+', 'USB\VID_<redacted>&PID_<redacted>\<redacted>'
  return $redacted
}

function Convert-ToProcessArgument {
  param([AllowNull()][string]$Value)

  if ($null -eq $Value) { return '""' }
  $text = "$Value"
  if ($text.Length -eq 0) { return '""' }
  if ($text -notmatch '[\s"]') { return $text }
  return '"' + ($text -replace '"', '\"') + '"'
}

function Invoke-ExternalForReport {
  param(
    [string]$Name,
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WorkingDirectory = $root,
    [int]$TimeoutSeconds = 300
  )

  $exitCode = $null
  $timedOut = $false
  $text = ""
  $process = $null
  $stdoutTask = $null
  $stderrTask = $null

  try {
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FilePath
    $startInfo.Arguments = (@($Arguments) | ForEach-Object { Convert-ToProcessArgument $_ }) -join " "
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $exited = $process.WaitForExit($TimeoutSeconds * 1000)
    if (!$exited) {
      $timedOut = $true
      try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}
    } else {
      try { $process.WaitForExit() } catch {}
      try { $process.Refresh() } catch {}
      $exitCode = $process.ExitCode
    }
    $stdout = if ($stdoutTask) { $stdoutTask.Result } else { "" }
    $stderr = if ($stderrTask) { $stderrTask.Result } else { "" }
    $text = (@($stdout, $stderr) | Where-Object { ![string]::IsNullOrWhiteSpace($_) }) -join "`n"
    if ($timedOut) {
      $text = "timed out after $TimeoutSeconds seconds`n$text"
    }
  } catch {
    $text = "$($_.Exception.Message)`n$text"
  }

  $redacted = Redact-BuildOutput -Text $text
  if ($redacted -and $redacted.Length -gt 4000) {
    $redacted = $redacted.Substring($redacted.Length - 4000)
  }

  return [pscustomobject]@{
    name = $Name
    ok = [bool](!$timedOut -and $exitCode -eq 0)
    exit_code = $exitCode
    timed_out = [bool]$timedOut
    timeout_seconds = $TimeoutSeconds
    output_tail = $redacted
  }
}

function Invoke-PostBuildChecks {
  param(
    [bool]$RequireLan,
    [bool]$RequireDevice
  )

  $stationScript = Join-Path $root "tools\station-pro-apk-smoke.ps1"
  $stationLatestJson = Join-Path $root "output\station-pro-apk-smoke\station-pro-apk-smoke-latest.json"
  $checks = @()
  $checks += Invoke-ExternalForReport `
    -Name "station:apk:inspect" `
    -FilePath "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $stationScript)

  $issues = New-Object 'System.Collections.Generic.List[string]'
  try {
    if (!(Test-Path -LiteralPath $stationLatestJson)) {
      [void]$issues.Add("station_apk_inspect_report_missing")
    } else {
      $inspect = Get-Content -LiteralPath $stationLatestJson -Raw | ConvertFrom-Json
      if ($inspect.ok -ne $true) { [void]$issues.Add("station_apk_inspect_not_ok") }
      if ($inspect.install_and_launch -ne $false) { [void]$issues.Add("post_check_must_not_install_or_launch") }
      if ($inspect.apk.package -ne "com.innerworld.rokid.prototype") { [void]$issues.Add("apk_package_mismatch") }
      if ([string]::IsNullOrWhiteSpace($inspect.apk.launchable_activity)) { [void]$issues.Add("apk_launchable_activity_missing") }
      if ($inspect.apk.config.space_id -ne "innerworld_campus_wall") { [void]$issues.Add("apk_space_id_mismatch") }
      if ($RequireLan -and !(($inspect.apk.config.host_kind -eq "private_lan") -or ($inspect.apk.config.host_kind -eq "public_or_hostname"))) {
        [void]$issues.Add("apk_config_not_lan_ready")
      }
      if ($RequireLan -and $inspect.readiness.network_ready_for_device -ne $true) {
        [void]$issues.Add("apk_network_not_ready_for_device")
      }
      if ($RequireDevice) {
        $stationDevices = @($inspect.adb.devices | Where-Object {
            $_.state -eq "device" -and
            (($_.product -match '^stationPro$') -or ($_.device -match '^stationPro$') -or ($_.model -match '^RG[_-]?stationPro$'))
          })
        if ($stationDevices.Count -ne 1) { [void]$issues.Add("station_pro_adb_device_required") }
      }
      if ($inspect.readiness.live_heartbeat_ready -ne $false) { [void]$issues.Add("inspect_cannot_claim_live_heartbeat") }
      if ($inspect.readiness.hardware_acceptance_ready -ne $false) { [void]$issues.Add("inspect_cannot_claim_hardware_acceptance") }
      if ($inspect.readiness.install_run_smoke -ne $false) { [void]$issues.Add("inspect_cannot_claim_install_run_smoke") }
    }
  } catch {
    [void]$issues.Add("station_apk_inspect_report_parse_failed")
  }

  $checks += [pscustomobject]@{
    name = "check:station-apk:lan:report"
    ok = [bool]($issues.Count -eq 0)
    exit_code = if ($issues.Count -eq 0) { 0 } else { 2 }
    output_tail = if ($issues.Count -eq 0) { "ok" } else { ($issues -join "; ") }
  }

  return [pscustomobject]@{
    attempted = $true
    ok = [bool](@($checks | Where-Object { !$_.ok }).Count -eq 0)
    require_lan = [bool]$RequireLan
    require_device = [bool]$RequireDevice
    checks = @($checks)
  }
}

if (!(Test-Path -LiteralPath $UnityExe)) {
  throw "Unity executable not found: $UnityExe"
}
if (!(Test-Path -LiteralPath $ProjectPath)) {
  throw "Unity project not found: $ProjectPath"
}

$apkPath = Join-Path $root "output\unity-android\InnerWorldRokid.apk"
$configEvidence = Get-UnityConfigEvidence
$imageDbBuild = [pscustomobject]@{
  name = "rokid:image-db"
  ok = $true
  exit_code = 0
  output_tail = "skipped"
  skipped = $true
}
if (!$SkipRokidImageDbBuild -and !$SkipUnityBuild) {
  $imageDbScript = Join-Path $root "tools\build-rokid-image-db.ps1"
  if (!(Test-Path -LiteralPath $imageDbScript)) {
    throw "Rokid image DB build script not found: $imageDbScript"
  }
  $imageDbBuild = Invoke-ExternalForReport `
    -Name "rokid:image-db" `
    -FilePath "powershell" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $imageDbScript)
  $imageDbBuild | Add-Member -NotePropertyName skipped -NotePropertyValue $false -Force
  if (!$imageDbBuild.ok) {
    throw "Rokid image DB build failed before Unity Android build: $($imageDbBuild.output_tail)"
  }
}

$arguments = @(
  "-batchmode",
  "-nographics",
  "-quit",
  "-projectPath",
  $ProjectPath,
  "-executeMethod",
  "InnerWorld.Rokid.Editor.InnerWorldSceneBuilder.BuildAndroidFallback",
  "-logFile",
  $LogPath
)

$startedAt = (Get-Date).ToString("o")
if ($SkipUnityBuild) {
  $unityProcess = [pscustomobject]@{
    id = $null
    exit_code = 0
  }
  $unityFinishedAt = (Get-Date).ToString("o")
} else {
  $unityProcess = Invoke-ProcessPollingWait -FilePath $UnityExe -ArgumentList $arguments
  $unityFinishedAt = (Get-Date).ToString("o")
}

$gradleFallback = [pscustomobject]@{
  attempted = $false
  ok = $false
  first_exit_code = $null
  exit_code = $null
  log_path = $null
  patch = $null
  rokid_native_libs = $null
  idm = [pscustomobject]@{
    attempted = $false
    idm_found = Test-Path -LiteralPath $IdmExe
    url_count = 0
    downloaded_count = 0
    downloads = @()
  }
}
$gradleCopy = $null
$nativeLibRepack = [pscustomobject]@{
  attempted = $false
  needed = $false
  ok = $false
  reason = $null
  pre_repack_native_libraries = $null
}
$buildMethod = if ($SkipUnityBuild) { "existing_apk_only" } else { "unity_batchmode" }

if (!$SkipUnityBuild -and $unityProcess.exit_code -ne 0 -and !$SkipGradleFallback) {
  $gradleRoot = Get-GradleRoot -UnityProjectPath $ProjectPath
  if (Test-Path -LiteralPath $gradleRoot) {
    $gradleLog = Join-Path $OutputRoot "gradle-assemble-android-$stamp.log"
    $gradleFallback = Invoke-GeneratedGradleBuild `
      -GradleRoot $gradleRoot `
      -UnityExePath $UnityExe `
      -LogFile $gradleLog `
      -LocalRepo $LocalMavenRepo `
      -IdmPath $IdmExe `
      -AllowIdmFallback:(!$SkipIdmFallback)
    if ($gradleFallback.ok) {
      $gradleCopy = Copy-GeneratedGradleApk -GradleRoot $gradleRoot -OutputApk $apkPath
      $buildMethod = "generated_gradle_fallback"
    }
  }
}

if (!$SkipUnityBuild -and $unityProcess.exit_code -eq 0 -and (Test-Path -LiteralPath $apkPath) -and !$SkipGradleFallback) {
  $preRepackNativeLibs = Get-ApkRokidNativeLibraryEvidence -Path $apkPath
  if (!$preRepackNativeLibs.found_all) {
    $nativeLibRepack = [pscustomobject]@{
      attempted = $true
      needed = $true
      ok = $false
      reason = $preRepackNativeLibs.missing_reason
      pre_repack_native_libraries = $preRepackNativeLibs
    }
    $gradleRoot = Get-GradleRoot -UnityProjectPath $ProjectPath
    if (Test-Path -LiteralPath $gradleRoot) {
      $gradleLog = Join-Path $OutputRoot "gradle-native-repack-android-$stamp.log"
      $gradleFallback = Invoke-GeneratedGradleBuild `
        -GradleRoot $gradleRoot `
        -UnityExePath $UnityExe `
        -LogFile $gradleLog `
        -LocalRepo $LocalMavenRepo `
        -IdmPath $IdmExe `
        -AllowIdmFallback:(!$SkipIdmFallback)
      if ($gradleFallback.ok) {
        $gradleCopy = Copy-GeneratedGradleApk -GradleRoot $gradleRoot -OutputApk $apkPath
        $buildMethod = "unity_batchmode_generated_gradle_native_repack"
        $nativeLibRepack.ok = $true
      } else {
        $nativeLibRepack.reason = "generated_gradle_native_repack_failed"
      }
    } else {
      $nativeLibRepack.reason = "generated_gradle_root_missing"
    }
  }
}

$finishedAt = (Get-Date).ToString("o")
$apkEvidence = Get-ApkEvidence -Path $apkPath
$apkNativeLibraries = Get-ApkRokidNativeLibraryEvidence -Path $apkPath
$apkExists = $apkEvidence.exists
$buildOk = [bool]((($unityProcess.exit_code -eq 0 -and $apkExists) -or ($gradleFallback.ok -and $apkExists)) -and $apkNativeLibraries.found_all)
$finalOk = $buildOk
$finalExitCode = if ($buildOk) { 0 } elseif (!$apkNativeLibraries.found_all) { 4 } elseif ($gradleFallback.attempted) { $gradleFallback.exit_code } else { $unityProcess.exit_code }
$postChecks = [pscustomobject]@{
  attempted = $false
  ok = $false
  require_lan = $false
  require_device = $false
  checks = @()
}
if ($buildOk -and $RunPostChecks) {
  $postChecks = Invoke-PostBuildChecks -RequireLan:$true -RequireDevice:$RequirePostCheckDevice
  if (!$postChecks.ok) {
    $finalOk = $false
    $finalExitCode = 3
  }
}
$apkEvidence = Get-ApkEvidence -Path $apkPath
$apkNativeLibraries = Get-ApkRokidNativeLibraryEvidence -Path $apkPath

$report = [pscustomobject]@{
  schema = "innerworld-unity-android-build/v1"
  generated_at = $finishedAt
  ok = $finalOk
  privacy = [pscustomobject]@{
    private_ips_included = $false
    note = "Unity source config is summarized with redacted URL/hash evidence only."
  }
  started_at = $startedAt
  unity_finished_at = $unityFinishedAt
  finished_at = $finishedAt
  exit_code = $finalExitCode
  unity_skipped = [bool]$SkipUnityBuild
  unity_process_id = $unityProcess.id
  unity_exit_code = $unityProcess.exit_code
  build_method = $buildMethod
  unity_exe = $UnityExe
  project_path = $ProjectPath
  log_path = $LogPath
  image_db_build = $imageDbBuild
  source_config = $configEvidence
  gradle_fallback = $gradleFallback
  gradle_apk_copy = $gradleCopy
  native_lib_repack = $nativeLibRepack
  post_checks = $postChecks
  apk = $apkEvidence
  apk_native_libraries = $apkNativeLibraries
}

$jsonPath = Join-Path $OutputRoot "unity-build-android-$stamp.json"
$mdPath = Join-Path $OutputRoot "unity-build-android-$stamp.md"
$latestJson = Join-Path $OutputRoot "unity-build-android-latest.json"
$latestMd = Join-Path $OutputRoot "unity-build-android-latest.md"

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding UTF8
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$idmSummary = $report.gradle_fallback.idm
$markdown = @(
  "# Unity Android Build",
  "",
  "- Generated: $($report.generated_at)",
  "- OK: $($report.ok)",
  "- Build method: $($report.build_method)",
  "- Exit code: $($report.exit_code)",
  "- Unity exit code: $($report.unity_exit_code)",
  "- Rokid image DB build skipped: $($report.image_db_build.skipped)",
  "- Rokid image DB build OK: $($report.image_db_build.ok)",
  "- Gradle fallback attempted: $($report.gradle_fallback.attempted)",
  "- Gradle fallback OK: $($report.gradle_fallback.ok)",
  "- Native lib repack attempted: $($report.native_lib_repack.attempted)",
  "- Native lib repack OK: $($report.native_lib_repack.ok)",
  "- Rokid native libs packaged: $($report.apk_native_libraries.found_all)",
  "- Rokid native libs missing: $(@($report.apk_native_libraries.missing_names) -join ', ')",
  "- Gradle fallback log: $($report.gradle_fallback.log_path)",
  "- IDM fallback attempted: $($idmSummary.attempted)",
  "- IDM URL count: $($idmSummary.url_count)",
  "- IDM downloaded count: $($idmSummary.downloaded_count)",
  "- Post checks attempted: $($report.post_checks.attempted)",
  "- Post checks OK: $($report.post_checks.ok)",
  "- Post checks require LAN: $($report.post_checks.require_lan)",
  "- Post checks require device: $($report.post_checks.require_device)",
  "- APK exists: $($report.apk.exists)",
  "- APK size: $($report.apk.size_bytes)",
  "- APK SHA256: $($report.apk.sha256)",
  "- Source config host kind: $($report.source_config.host_kind)",
  "- Network ready for device: $($report.source_config.network_ready_for_device)",
  "- Source config base URL: $($report.source_config.base_url_redacted)",
  "- Unity log: $($report.log_path)",
  "",
  "## Boundary",
  "",
  "This build proves Unity batchmode or generated Gradle produced an Android APK from the current project/config. It does not prove install/run, live SDK binding, heartbeat, trusted observations, or field acceptance."
)
$markdown | Set-Content -LiteralPath $mdPath -Encoding UTF8
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "Unity Android build complete."
Write-Output "OK: $($report.ok)"
Write-Output "Build method: $($report.build_method)"
Write-Output "Unity exit code: $($report.unity_exit_code)"
Write-Output "Gradle fallback attempted: $($report.gradle_fallback.attempted)"
Write-Output "Gradle fallback OK: $($report.gradle_fallback.ok)"
Write-Output "Native lib repack attempted: $($report.native_lib_repack.attempted)"
Write-Output "Native lib repack OK: $($report.native_lib_repack.ok)"
Write-Output "Rokid native libs packaged: $($report.apk_native_libraries.found_all)"
Write-Output "IDM fallback attempted: $($idmSummary.attempted)"
Write-Output "IDM URL count: $($idmSummary.url_count)"
Write-Output "IDM downloaded count: $($idmSummary.downloaded_count)"
Write-Output "Post checks attempted: $($report.post_checks.attempted)"
Write-Output "Post checks OK: $($report.post_checks.ok)"
Write-Output "Source config host kind: $($report.source_config.host_kind)"
Write-Output "Network ready for device: $($report.source_config.network_ready_for_device)"
Write-Output "APK: $apkPath"
Write-Output "JSON: $jsonPath"
Write-Output "Markdown: $mdPath"

if (!$report.ok) {
  if (Test-Path -LiteralPath $LogPath) {
    Write-Output "Unity log tail:"
    Get-Content -LiteralPath $LogPath -Tail 80
  }
  if ($report.gradle_fallback.log_path -and (Test-Path -LiteralPath $report.gradle_fallback.log_path)) {
    Write-Output "Gradle log tail:"
    Get-Content -LiteralPath $report.gradle_fallback.log_path -Tail 80
  }
  if ($report.post_checks.attempted) {
    foreach ($check in $report.post_checks.checks) {
      if (!$check.ok) {
        Write-Output "$($check.name) output tail:"
        Write-Output $check.output_tail
      }
    }
  }
  exit 2
}
