param(
  [string]$Message = "",
  [int]$IntervalSeconds = 300,
  [switch]$Loop,
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRoot = (& git -C $projectRoot rev-parse --show-toplevel 2>$null).Trim()
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
  throw "Could not find a Git repository for $projectRoot"
}

function Invoke-GitSyncOnce {
  param([string]$CommitMessage)

  Set-Location -LiteralPath $projectRoot

  if (!$SkipChecks) {
    npm run check:security
  }

  $statusBefore = & git -C $repoRoot status --short
  if ([string]::IsNullOrWhiteSpace(($statusBefore -join "`n"))) {
    Write-Output "No changes to sync."
    return
  }

  & git -C $repoRoot add -A
  $staged = & git -C $repoRoot diff --cached --name-only
  if ([string]::IsNullOrWhiteSpace(($staged -join "`n"))) {
    Write-Output "No staged changes after git add; likely ignored-only changes."
    return
  }

  $branch = (& git -C $repoRoot branch --show-current).Trim()
  if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Detached HEAD; refusing automatic push."
  }

  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $CommitMessage = "Auto-sync InnerWorld checkpoint $stamp"
  }

  & git -C $repoRoot commit -m $CommitMessage

  $upstream = (& git -C $repoRoot rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($upstream -join "`n"))) {
    & git -C $repoRoot push -u origin $branch
  } else {
    & git -C $repoRoot push
  }

  Write-Output "Synced branch $branch with commit: $CommitMessage"
}

do {
  try {
    Invoke-GitSyncOnce -CommitMessage $Message
  } catch {
    Write-Warning "Git auto-sync failed: $($_.Exception.Message)"
  }

  if ($Loop) {
    Start-Sleep -Seconds ([Math]::Max(30, $IntervalSeconds))
  }
} while ($Loop)
