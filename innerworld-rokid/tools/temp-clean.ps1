param(
  [switch]$Apply,
  [int]$OlderThanHours = 6,
  [switch]$IncludeVisualStudioInstallerTemp = $true,
  [int]$Top = 25
)

$ErrorActionPreference = "Stop"

function Format-GB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1GB, 3)
}

function Format-MB {
  param([int64]$Bytes)
  return [math]::Round($Bytes / 1MB, 2)
}

function Get-DirectorySize {
  param([string]$Path)
  if (!(Test-Path -LiteralPath $Path)) { return 0 }
  $sum = (Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { return 0 }
  return [int64]$sum
}

function Assert-UnderPath {
  param([string]$Path, [string]$RootPath)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\') + '\'
  if (!$fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside allowed root. Path=$fullPath Root=$fullRoot"
  }
}

function Test-VisualStudioInstallerTemp {
  param([System.IO.FileSystemInfo]$Item)
  if (!$Item.PSIsContainer) { return $false }
  $children = @(Get-ChildItem -LiteralPath $Item.FullName -Force -ErrorAction SilentlyContinue | Select-Object -First 40)
  if ($children.Count -eq 0) { return $false }
  $names = ($children | ForEach-Object { $_.Name }) -join "`n"
  return ($names -match 'Microsoft\.VisualStudio|Microsoft\.Net\.|Microsoft\.Android|Microsoft\.SqlServer\.SSMS|Win11SDK|Xamarin\.VisualStudio|VisualStudio\.GitHub\.Copilot')
}

function Test-ProcessReferencesPath {
  param([string]$Path)
  $escaped = [regex]::Escape($Path)
  $matches = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $escaped })
  return $matches.Count -gt 0
}

$temp = [System.IO.Path]::GetTempPath()
$cutoff = (Get-Date).AddHours(-1 * $OlderThanHours)

Write-Output "Temp root: $temp"
Write-Output "Cutoff: items must be older than $OlderThanHours hours ($cutoff)"

$topRows = foreach ($item in Get-ChildItem -LiteralPath $temp -Force -ErrorAction SilentlyContinue) {
  $size = if ($item.PSIsContainer) { Get-DirectorySize $item.FullName } else { [int64]$item.Length }
  [pscustomobject]@{
    Name = $item.Name
    Path = $item.FullName
    IsDir = $item.PSIsContainer
    SizeMB = Format-MB $size
    LastWriteTime = $item.LastWriteTime
  }
}

Write-Output "Top temp entries:"
$topRows | Sort-Object SizeMB -Descending | Select-Object -First $Top | Format-Table -AutoSize

$candidates = @()
foreach ($item in Get-ChildItem -LiteralPath $temp -Force -ErrorAction SilentlyContinue) {
  if ($item.LastWriteTime -ge $cutoff) { continue }
  $reason = $null
  if ($IncludeVisualStudioInstallerTemp -and (Test-VisualStudioInstallerTemp -Item $item)) {
    $reason = "visual-studio-installer-temp"
  } elseif ($item.Name -eq "Rokid") {
    $reason = "rokid-temp"
  } else {
    continue
  }

  $size = if ($item.PSIsContainer) { Get-DirectorySize $item.FullName } else { [int64]$item.Length }
  $referencedByProcess = Test-ProcessReferencesPath -Path $item.FullName
  $isReparsePoint = (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
  $candidates += [pscustomobject]@{
    Name = $item.Name
    Path = $item.FullName
    Reason = $reason
    SizeGB = Format-GB $size
    LastWriteTime = $item.LastWriteTime
    ReferencedByProcess = $referencedByProcess
    IsReparsePoint = $isReparsePoint
  }
}

Write-Output "Safe cleanup candidates:"
if ($candidates.Count -eq 0) {
  Write-Output "No candidates matched the current guardrails."
} else {
  $candidates | Sort-Object SizeGB -Descending | Format-Table -AutoSize
}

if (!$Apply) {
  Write-Output "Dry run only. Re-run with -Apply to remove candidates that are not referenced by a process."
  exit 0
}

$deleted = @()
$skipped = @()
foreach ($candidate in $candidates) {
  if ($candidate.ReferencedByProcess) {
    $skipped += [pscustomobject]@{
      Path = $candidate.Path
      Reason = "referenced-by-process"
    }
    continue
  }

  if ($candidate.IsReparsePoint) {
    $skipped += [pscustomobject]@{
      Path = $candidate.Path
      Reason = "reparse-point"
    }
    continue
  }

  if (!(Test-Path -LiteralPath $candidate.Path)) { continue }
  Assert-UnderPath -Path $candidate.Path -RootPath $temp
  try {
    Remove-Item -LiteralPath $candidate.Path -Recurse -Force -ErrorAction Stop
    $deleted += $candidate
  } catch {
    $skipped += [pscustomobject]@{
      Path = $candidate.Path
      Reason = $_.Exception.Message
    }
  }
}

Write-Output "Deleted candidates:"
if ($deleted.Count -eq 0) {
  Write-Output "None"
} else {
  $deleted | Format-Table -AutoSize
}

Write-Output "Skipped candidates:"
if ($skipped.Count -eq 0) {
  Write-Output "None"
} else {
  $skipped | Format-Table -AutoSize
}
