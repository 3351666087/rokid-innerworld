param(
  [switch]$Apply,
  [string]$DCacheRoot = "D:\Downloads\RokidCache",
  [switch]$KeepUnityHubDownloads
)

$ErrorActionPreference = "Stop"

function Get-DirectorySize {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return 0 }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [int64]$sum
}

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Assert-UnderPath {
  param([string]$Path, [string]$Root)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

$roaming = [Environment]::GetFolderPath("ApplicationData")
$local = [Environment]::GetFolderPath("LocalApplicationData")
$temp = [System.IO.Path]::GetTempPath()
$userProfile = [Environment]::GetFolderPath("UserProfile")

$targets = @(
  [pscustomobject]@{
    Name = "Unity Hub downloads on C"
    Path = Join-Path $roaming "UnityHub\downloads"
    Root = Join-Path $roaming "UnityHub"
    Action = "move-to-d"
  },
  [pscustomobject]@{
    Name = "Unity Hub logs"
    Path = Join-Path $roaming "UnityHub\logs"
    Root = Join-Path $roaming "UnityHub"
    Action = "delete-contents"
  },
  [pscustomobject]@{
    Name = "Unity Hub GPU/cache folders"
    Path = Join-Path $roaming "UnityHub\GPUCache"
    Root = Join-Path $roaming "UnityHub"
    Action = "delete-contents"
  },
  [pscustomobject]@{
    Name = "Unity editor cache"
    Path = Join-Path $local "Unity\cache"
    Root = Join-Path $local "Unity"
    Action = "report-only"
  },
  [pscustomobject]@{
    Name = "npm cache"
    Path = Join-Path $local "npm-cache"
    Root = $local
    Action = "report-only"
  },
  [pscustomobject]@{
    Name = "Maven repo on C"
    Path = Join-Path $userProfile ".m2\repository"
    Root = $userProfile
    Action = "report-only"
  },
  [pscustomobject]@{
    Name = "Windows temp total"
    Path = $temp
    Root = $temp
    Action = "report-only"
  },
  [pscustomobject]@{
    Name = "Rokid temp downloads"
    Path = Join-Path $temp "Rokid"
    Root = $temp
    Action = "delete-contents"
  },
  [pscustomobject]@{
    Name = "D Rokid cache"
    Path = $DCacheRoot
    Root = (Split-Path -Parent $DCacheRoot)
    Action = "keep"
  },
  [pscustomobject]@{
    Name = "D Maven cache"
    Path = Join-Path $DCacheRoot "m2-repository"
    Root = $DCacheRoot
    Action = "keep"
  }
)

$drives = Get-PSDrive -PSProvider FileSystem | Select-Object Name, Root, Used, Free
Write-Output "Disk report:"
$drives | ForEach-Object {
  [pscustomobject]@{
    Drive = $_.Name
    Root = $_.Root
    FreeGB = Format-GB $_.Free
    UsedGB = Format-GB $_.Used
  }
} | Format-Table -AutoSize

Write-Output "Cache report:"
$report = foreach ($target in $targets) {
  [pscustomobject]@{
    Name = $target.Name
    Path = $target.Path
    Exists = (Test-Path -LiteralPath $target.Path)
    SizeGB = Format-GB (Get-DirectorySize $target.Path)
    Action = $target.Action
  }
}
$report | Format-Table -AutoSize

if (!$Apply) {
  Write-Output "Dry run only. Re-run with -Apply, or npm run cache:clean, to move/delete safe cache contents."
  exit 0
}

New-Item -ItemType Directory -Force -Path $DCacheRoot | Out-Null
$unityHubArchive = Join-Path $DCacheRoot "UnityHubDownloads"
New-Item -ItemType Directory -Force -Path $unityHubArchive | Out-Null

foreach ($target in $targets) {
  if (!(Test-Path -LiteralPath $target.Path)) { continue }
  Assert-UnderPath -Path $target.Path -Root $target.Root

  if ($target.Action -eq "move-to-d") {
    if ($KeepUnityHubDownloads) { continue }
    Get-ChildItem -LiteralPath $target.Path -Force | ForEach-Object {
      Assert-UnderPath -Path $_.FullName -Root $target.Root
      $dest = Join-Path $unityHubArchive $_.Name
      if (Test-Path -LiteralPath $dest) {
        Remove-Item -LiteralPath $_.FullName -Recurse -Force
      } else {
        Move-Item -LiteralPath $_.FullName -Destination $dest -Force
      }
    }
  } elseif ($target.Action -eq "delete-contents") {
    Get-ChildItem -LiteralPath $target.Path -Force | ForEach-Object {
      Assert-UnderPath -Path $_.FullName -Root $target.Root
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }
  }
}

Write-Output "Cache cleanup complete."
