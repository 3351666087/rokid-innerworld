param(
  [string]$UnityVersion = "6000.3.19f1",
  [string]$UnityRoot = "C:\Users\33516\Unity\Hub\Editor\6000.3.19f1",
  [string]$CacheRoot = "D:\Downloads\RokidCache\UnityAndroid",
  [ValidateSet("curl", "idman")]
  [string]$Downloader = "curl",
  [switch]$SkipDownload
)

$ErrorActionPreference = "Stop"

$androidPlayer = Join-Path $UnityRoot "Editor\Data\PlaybackEngines\AndroidPlayer"
$sdkRoot = Join-Path $androidPlayer "SDK"
$ndkRoot = Join-Path $androidPlayer "NDK"
$openJdkRoot = Join-Path $androidPlayer "OpenJDK"

function Assert-UnderPath {
  param([string]$Path, [string]$Root)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Get-FileNameFromUrl {
  param([string]$Url)
  return [System.IO.Path]::GetFileName(([Uri]$Url).AbsolutePath)
}

function Download-File {
  param([string]$Url, [string]$OutFile)
  if (Test-Path -LiteralPath $OutFile) {
    $length = (Get-Item -LiteralPath $OutFile).Length
    if ($length -gt 0) {
      Write-Output "Using cached $OutFile ($length bytes)"
      return
    }
  }

  if ($SkipDownload) {
    throw "Missing $OutFile and -SkipDownload was supplied."
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutFile) | Out-Null
  Write-Output "Downloading $Url"
  if ($Downloader -eq "idman") {
    $idman = "C:\Program Files (x86)\Internet Download Manager\IDMan.exe"
    if (!(Test-Path -LiteralPath $idman)) { throw "IDM not found at $idman" }
    $downloadDir = Split-Path -Parent $OutFile
    $fileName = Split-Path -Leaf $OutFile
    $proc = Start-Process -FilePath $idman -ArgumentList @("/d", $Url, "/p", $downloadDir, "/f", $fileName, "/n") -PassThru -WindowStyle Hidden
    $proc.WaitForExit()
    if (!(Test-Path -LiteralPath $OutFile)) {
      throw "IDM command returned but file was not found: $OutFile"
    }
  } else {
    & curl.exe -L --fail --retry 5 --retry-delay 5 --continue-at - --output $OutFile $Url
    if ($LASTEXITCODE -ne 0) { throw "curl failed for $Url" }
  }
}

function Clear-Directory {
  param([string]$Path, [string]$AllowedRoot)
  if (Test-Path -LiteralPath $Path) {
    Assert-UnderPath -Path $Path -Root $AllowedRoot
    $empty = Join-Path $CacheRoot "__empty"
    New-Item -ItemType Directory -Force -Path $empty | Out-Null
    & robocopy.exe $empty $Path /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) {
      throw "robocopy cleanup failed for $Path with code $LASTEXITCODE"
    }
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
  }
  New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Copy-DirectoryContents {
  param([string]$Source, [string]$Destination, [string]$AllowedDestinationRoot)
  Assert-UnderPath -Path $Destination -Root $AllowedDestinationRoot
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  & robocopy.exe $Source $Destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed from $Source to $Destination with code $LASTEXITCODE"
  }
}

function Find-RootByMarker {
  param([string]$SearchRoot, [string]$MarkerRelativePath)
  $marker = Get-ChildItem -LiteralPath $SearchRoot -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName.EndsWith($MarkerRelativePath, [System.StringComparison]::OrdinalIgnoreCase) } |
    Select-Object -First 1
  if (!$marker) { throw "Marker not found in ${SearchRoot}: $MarkerRelativePath" }
  return $marker.FullName.Substring(0, $marker.FullName.Length - $MarkerRelativePath.Length).TrimEnd('\')
}

function Expand-Fresh {
  param([string]$Zip, [string]$Destination)
  $temp = Join-Path $CacheRoot ("extract-" + [System.IO.Path]::GetFileNameWithoutExtension($Zip))
  Clear-Directory -Path $temp -AllowedRoot $CacheRoot
  Expand-Archive -LiteralPath $Zip -DestinationPath $temp -Force
  return $temp
}

function Install-RootFromMarker {
  param(
    [string]$Zip,
    [string]$MarkerRelativePath,
    [string]$Destination,
    [string]$DestinationRoot
  )
  $temp = Expand-Fresh -Zip $Zip -Destination $Destination
  $root = Find-RootByMarker -SearchRoot $temp -MarkerRelativePath $MarkerRelativePath
  Clear-Directory -Path $Destination -AllowedRoot $DestinationRoot
  Copy-DirectoryContents -Source $root -Destination $Destination -AllowedDestinationRoot $DestinationRoot
}

function Install-DirectoryFromMarker {
  param(
    [string]$Zip,
    [string]$MarkerRelativePath,
    [string]$Destination,
    [string]$DestinationRoot
  )
  $temp = Expand-Fresh -Zip $Zip -Destination $Destination
  $root = Find-RootByMarker -SearchRoot $temp -MarkerRelativePath $MarkerRelativePath
  Clear-Directory -Path $Destination -AllowedRoot $DestinationRoot
  Copy-DirectoryContents -Source $root -Destination $Destination -AllowedDestinationRoot $DestinationRoot
}

function Remove-SdkRootStrays {
  $strays = @(
    "adb.exe",
    "AdbWinApi.dll",
    "AdbWinUsbApi.dll",
    "etc1tool.exe",
    "fastboot.exe",
    "hprof-conv.exe",
    "libwinpthread-1.dll",
    "make_f2fs.exe",
    "make_f2fs_casefold.exe",
    "mke2fs.conf",
    "mke2fs.exe",
    "NOTICE.txt",
    "source.properties",
    "sqlite3.exe"
  )
  foreach ($name in $strays) {
    $path = Join-Path $sdkRoot $name
    if (Test-Path -LiteralPath $path) {
      Assert-UnderPath -Path $path -Root $sdkRoot
      Remove-Item -LiteralPath $path -Force
    }
  }
}

$modules = @(
  [pscustomobject]@{ Id = "openjdk"; Url = "https://download.unity3d.com/download_unity/open-jdk/open-jdk-win-x64/jdk17.0.18-8_15e8817d1f5db6db3571ebe7430ef37f7fa8e60e8ff6f3e18ca1cb4c29f78774.zip"; Kind = "marker"; Marker = "bin\java.exe"; Destination = $openJdkRoot },
  [pscustomobject]@{ Id = "sdk-tools"; Url = "https://dl.google.com/android/repository/sdk-tools-windows-4333796.zip"; Kind = "directory"; Marker = "bin\sdkmanager.bat"; Destination = (Join-Path $sdkRoot "tools") },
  [pscustomobject]@{ Id = "ndk-r27c"; Url = "https://dl.google.com/android/repository/android-ndk-r27c-windows.zip"; Kind = "marker"; Marker = "ndk-build.cmd"; Destination = $ndkRoot },
  [pscustomobject]@{ Id = "cmake-3.22.1"; Url = "https://dl.google.com/android/repository/cmake-3.22.1-windows.zip"; Kind = "marker"; Marker = "bin\cmake.exe"; Destination = (Join-Path $sdkRoot "cmake\3.22.1") },
  [pscustomobject]@{ Id = "build-tools-36.0.0"; Url = "https://dl.google.com/android/repository/build-tools_r36_windows.zip"; Kind = "marker"; Marker = "aapt2.exe"; Destination = (Join-Path $sdkRoot "build-tools\36.0.0") },
  [pscustomobject]@{ Id = "platform-tools-36.0.0"; Url = "https://dl.google.com/android/repository/platform-tools_r36.0.0-win.zip"; Kind = "directory"; Marker = "adb.exe"; Destination = (Join-Path $sdkRoot "platform-tools") },
  [pscustomobject]@{ Id = "platform-34"; Url = "https://dl.google.com/android/repository/platform-34-ext7_r02.zip"; Kind = "platform"; Marker = "android.jar"; Destination = (Join-Path $sdkRoot "platforms\android-34") },
  [pscustomobject]@{ Id = "platform-35"; Url = "https://dl.google.com/android/repository/platform-35_r01.zip"; Kind = "platform"; Marker = "android.jar"; Destination = (Join-Path $sdkRoot "platforms\android-35") },
  [pscustomobject]@{ Id = "platform-36"; Url = "https://dl.google.com/android/repository/platform-36_r02.zip"; Kind = "platform"; Marker = "android.jar"; Destination = (Join-Path $sdkRoot "platforms\android-36") },
  [pscustomobject]@{ Id = "cmdline-tools-16.0"; Url = "https://dl.google.com/android/repository/commandlinetools-win-12266719_latest.zip"; Kind = "marker"; Marker = "bin\sdkmanager.bat"; Destination = (Join-Path $sdkRoot "cmdline-tools\latest") }
)

if (!(Test-Path -LiteralPath $androidPlayer)) {
  throw "AndroidPlayer is missing. Install Android Build Support first: $androidPlayer"
}

New-Item -ItemType Directory -Force -Path $CacheRoot | Out-Null
New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null
Remove-SdkRootStrays

foreach ($module in $modules) {
  $fileName = Get-FileNameFromUrl $module.Url
  $zip = Join-Path $CacheRoot $fileName
  Download-File -Url $module.Url -OutFile $zip

  Write-Output "Installing $($module.Id) -> $($module.Destination)"
  if ($module.Kind -eq "directory") {
    Install-DirectoryFromMarker -Zip $zip -MarkerRelativePath $module.Marker -Destination $module.Destination -DestinationRoot $androidPlayer
  } else {
    $marker = $module.Marker
    Install-RootFromMarker -Zip $zip -MarkerRelativePath $marker -Destination $module.Destination -DestinationRoot $androidPlayer
  }
}

$checks = @()
$checks += (Join-Path $openJdkRoot "bin\java.exe")
$checks += (Join-Path $sdkRoot "tools\bin\sdkmanager.bat")
$checks += (Join-Path $sdkRoot "platform-tools\adb.exe")
$checks += (Join-Path $sdkRoot "cmdline-tools\latest\bin\sdkmanager.bat")
$checks += (Join-Path $sdkRoot "build-tools\36.0.0\aapt2.exe")
$checks += (Join-Path $sdkRoot "platforms\android-34\android.jar")
$checks += (Join-Path $sdkRoot "platforms\android-35\android.jar")
$checks += (Join-Path $sdkRoot "platforms\android-36\android.jar")
$checks += (Join-Path $ndkRoot "ndk-build.cmd")
$checks += (Join-Path $sdkRoot "cmake\3.22.1\bin\cmake.exe")

$missing = @()
foreach ($check in $checks) {
  if (!(Test-Path -LiteralPath $check)) { $missing += $check }
}

if ($missing.Count -gt 0) {
  Write-Output "Missing Android module files:"
  $missing | ForEach-Object { Write-Output " - $_" }
  throw "Unity Android module install incomplete."
}

Write-Output "Unity Android SDK/NDK/OpenJDK modules are installed for $UnityVersion."
