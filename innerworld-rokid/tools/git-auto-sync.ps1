param(
  [Alias("m")]
  [string]$Message = "",
  [Alias("Interval")]
  [ValidateRange(1, 86400)]
  [int]$IntervalSeconds = 300,
  [Alias("dry-run")]
  [switch]$DryRun,
  [switch]$Loop,
  [Alias("skip-push", "NoPush")]
  [switch]$SkipPush,
  [Alias("include-untracked")]
  [switch]$IncludeUntracked,
  [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRootOutput = & git -C $projectRoot rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($repoRootOutput -join "`n"))) {
  throw "Could not find a Git repository for $projectRoot"
}
$repoRoot = ($repoRootOutput | Select-Object -First 1).Trim()

$repoRootFull = (Resolve-Path -LiteralPath $repoRoot).Path
$projectRootFull = (Resolve-Path -LiteralPath $projectRoot).Path
$repoRootUri = [Uri](($repoRootFull.TrimEnd('\') + '\'))
$projectRootUri = [Uri](($projectRootFull.TrimEnd('\') + '\'))
$projectPrefix = [Uri]::UnescapeDataString($repoRootUri.MakeRelativeUri($projectRootUri).ToString()).TrimEnd('/')

$denyPathPatterns = @(
  '(^|/)\.git($|/)',
  '(^|/)node_modules($|/)',
  '(^|/)output($|/)',
  '(^|/)data/runtime_state\.json$',
  '(^|/)data/innerworld\.sqlite($|-)',
  '(^|/)innerworld-sqlite-\d{8}-\d{6}\.(sqlite|manifest\.json)$',
  '(^|/)innerworld-before-restore-\d{8}-\d{6}\.(sqlite|manifest\.json)$',
  '(^|/)sqlite-backup-latest\.md$',
  '(^|/)Logs($|/)',
  '(^|/)Library($|/)',
  '(^|/)Temp($|/)',
  '(^|/)Obj($|/)',
  '(^|/)UserSettings($|/)',
  '(^|/)\.utmp($|/)',
  '(^|/)\.cache($|/)',
  '(^|/)dist($|/)',
  '(^|/)build($|/)',
  '(^|/)coverage($|/)',
  '(^|/)secrets($|/)',
  '(^|/)local-secrets($|/)',
  '(^|/)\.env($|\.|/)',
  '\.secret($|\.|/)',
  '(^|/)PackageCache($|/)'
)

function Invoke-GitRaw {
  param(
    [string[]]$Arguments,
    [switch]$AllowFailure
  )

  $stderrPath = [System.IO.Path]::GetTempFileName()
  try {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
      $output = & git -C $repoRoot @Arguments 2> $stderrPath
      $exitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }

    $stdoutLines = @($output | ForEach-Object { "$_" })
    $stderrLines = @()
    if (Test-Path -LiteralPath $stderrPath) {
      $stderrLines = @(Get-Content -LiteralPath $stderrPath -ErrorAction SilentlyContinue | ForEach-Object { "$_" })
    }
  } finally {
    Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
  }

  if ($exitCode -ne 0 -and !$AllowFailure) {
    $detail = (@($stdoutLines) + @($stderrLines) -join "`n").Trim()
    if ([string]::IsNullOrWhiteSpace($detail)) {
      $detail = "no output"
    }
    throw "git $($Arguments -join ' ') failed with exit code $exitCode`: $detail"
  }

  [pscustomobject]@{
    ExitCode = $exitCode
    Output = $stdoutLines
    Error = $stderrLines
  }
}

function Get-GitLines {
  param([string[]]$Arguments)

  $result = Invoke-GitRaw -Arguments $Arguments
  @($result.Output | Where-Object { ![string]::IsNullOrWhiteSpace($_) })
}

function Invoke-GitChecked {
  param([string[]]$Arguments)

  $result = Invoke-GitRaw -Arguments $Arguments
  $result.Output | ForEach-Object { Write-Output $_ }
  $result.Error | ForEach-Object { Write-Output $_ }
}

function ConvertTo-GitPath {
  param([string]$Path)

  ($Path -replace '\\', '/').TrimStart('/')
}

function Test-DeniedPath {
  param([string]$Path)

  $normalized = ConvertTo-GitPath -Path $Path
  foreach ($pattern in $denyPathPatterns) {
    if ($normalized -match $pattern) {
      return $true
    }
  }
  return $false
}

function Test-InProjectPath {
  param([string]$Path)

  $normalized = ConvertTo-GitPath -Path $Path
  if ([string]::IsNullOrWhiteSpace($projectPrefix)) {
    return $true
  }

  return ($normalized -eq $projectPrefix -or $normalized.StartsWith("$projectPrefix/"))
}

function Get-UniqueSorted {
  param([string[]]$Items)

  @($Items | Where-Object { ![string]::IsNullOrWhiteSpace($_) } | ForEach-Object { ConvertTo-GitPath -Path $_ } | Sort-Object -Unique)
}

function Write-FileList {
  param(
    [string]$Title,
    [string[]]$Files
  )

  $items = Get-UniqueSorted -Items $Files
  if ($items.Count -eq 0) {
    return
  }

  Write-Output $Title
  $items | ForEach-Object { Write-Output "  - $_" }
}

function Get-SyncScope {
  $unstagedTracked = Get-GitLines -Arguments @("diff", "--name-only")
  $stagedTracked = Get-GitLines -Arguments @("diff", "--cached", "--name-only")
  $untrackedAvailable = @(Get-GitLines -Arguments @("ls-files", "--others", "--exclude-standard") | Where-Object { Test-InProjectPath -Path $_ })
  $selectedUntracked = if ($IncludeUntracked) { $untrackedAvailable } else { @() }

  $candidates = Get-UniqueSorted -Items (@($unstagedTracked) + @($stagedTracked) + @($selectedUntracked) | Where-Object { Test-InProjectPath -Path $_ })
  $eligible = @()
  $denied = @()

  foreach ($path in $candidates) {
    if (Test-DeniedPath -Path $path) {
      $denied += $path
    } else {
      $eligible += $path
    }
  }

  [pscustomobject]@{
    Candidates = $candidates
    Eligible = Get-UniqueSorted -Items $eligible
    Denied = Get-UniqueSorted -Items $denied
    UntrackedAvailable = Get-UniqueSorted -Items $untrackedAvailable
    UntrackedSkipped = if ($IncludeUntracked) { @() } else { Get-UniqueSorted -Items $untrackedAvailable }
  }
}

function Get-StagedDeniedFiles {
  $staged = Get-GitLines -Arguments @("diff", "--cached", "--name-only")
  Get-UniqueSorted -Items @($staged | Where-Object { Test-DeniedPath -Path $_ })
}

function Get-StagedUnexpectedFiles {
  param([string[]]$AllowedFiles)

  $allowed = @{}
  Get-UniqueSorted -Items $AllowedFiles | ForEach-Object {
    $allowed[$_] = $true
  }

  $staged = Get-UniqueSorted -Items (Get-GitLines -Arguments @("diff", "--cached", "--name-only"))
  @($staged | Where-Object { !$allowed.ContainsKey($_) })
}

function Get-CommitMessage {
  param([string]$CommitMessage)

  if (![string]::IsNullOrWhiteSpace($CommitMessage)) {
    return $CommitMessage
  }

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  "Auto-sync InnerWorld checkpoint $stamp"
}

function Invoke-SecurityCheck {
  if ($SkipChecks) {
    Write-Output "Skipping security check because -SkipChecks was supplied."
    return
  }

  Push-Location -LiteralPath $projectRoot
  try {
    & npm run check:security
    if ($LASTEXITCODE -ne 0) {
      throw "npm run check:security failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

function Write-DryRunSummary {
  param(
    [pscustomobject]$Scope,
    [string]$CommitMessage
  )

  Write-Output "Dry run: no files will be staged, committed, or pushed."

  if ($Scope.Eligible.Count -eq 0) {
    Write-Output "No eligible changes to sync."
  } else {
    Write-FileList -Title "Would stage and commit:" -Files $Scope.Eligible
    Write-Output "Would commit with message: $CommitMessage"
  }

  if ($Scope.Denied.Count -gt 0) {
    Write-FileList -Title "Excluded by auto-sync guardrails:" -Files $Scope.Denied
  }

  if ($Scope.UntrackedSkipped.Count -gt 0) {
    Write-FileList -Title "Untracked files not selected; pass -IncludeUntracked to include them:" -Files $Scope.UntrackedSkipped
  }

  $alreadyStagedDenied = Get-StagedDeniedFiles
  if ($alreadyStagedDenied.Count -gt 0) {
    Write-FileList -Title "Already staged but refused by guardrails:" -Files $alreadyStagedDenied
  }

  $alreadyStagedUnexpected = Get-StagedUnexpectedFiles -AllowedFiles $Scope.Eligible
  if ($alreadyStagedUnexpected.Count -gt 0) {
    Write-FileList -Title "Already staged outside this auto-sync scope; actual run will refuse:" -Files $alreadyStagedUnexpected
  }

  if (!$SkipChecks -and $Scope.Eligible.Count -gt 0) {
    Write-Output "Would run: npm run check:security"
  }

  if ($Scope.Eligible.Count -gt 0) {
    if ($SkipPush) {
      Write-Output "Would skip push because -SkipPush was supplied."
    } else {
      Write-Output "Would push the current branch to its upstream, or set upstream to origin/<branch>."
    }
  }
}

function Invoke-GitSyncOnce {
  param([string]$RequestedMessage)

  $scope = Get-SyncScope
  $commitMessage = Get-CommitMessage -CommitMessage $RequestedMessage

  if ($DryRun) {
    Write-DryRunSummary -Scope $scope -CommitMessage $commitMessage
    return
  }

  if ($scope.Eligible.Count -eq 0) {
    if ($scope.Denied.Count -gt 0) {
      Write-FileList -Title "Only excluded changes were found; nothing will be synced:" -Files $scope.Denied
    } else {
      Write-Output "No eligible changes to sync."
    }

    if ($scope.UntrackedSkipped.Count -gt 0) {
      Write-FileList -Title "Untracked files not selected; pass -IncludeUntracked to include them:" -Files $scope.UntrackedSkipped
    }
    return
  }

  $alreadyStagedDenied = Get-StagedDeniedFiles
  if ($alreadyStagedDenied.Count -gt 0) {
    Write-FileList -Title "Refusing to commit already staged runtime/private files:" -Files $alreadyStagedDenied
    throw "Unsafe files are already staged. Unstage them before running auto-sync."
  }

  $alreadyStagedUnexpected = Get-StagedUnexpectedFiles -AllowedFiles $scope.Eligible
  if ($alreadyStagedUnexpected.Count -gt 0) {
    Write-FileList -Title "Refusing to commit files already staged outside this auto-sync scope:" -Files $alreadyStagedUnexpected
    throw "Unexpected files are already staged. Unstage them before running auto-sync."
  }

  if (!$SkipPush) {
    $branch = ((Get-GitLines -Arguments @("branch", "--show-current")) -join "").Trim()
    if ([string]::IsNullOrWhiteSpace($branch)) {
      throw "Detached HEAD; refusing automatic push. Re-run with -SkipPush if you intentionally want a local-only commit."
    }
  }

  Invoke-SecurityCheck

  $addArguments = @("add", "--") + @($scope.Eligible)
  Invoke-GitChecked -Arguments $addArguments

  $stagedDenied = Get-StagedDeniedFiles
  if ($stagedDenied.Count -gt 0) {
    Write-FileList -Title "Refusing to commit runtime/private files:" -Files $stagedDenied
    throw "Unsafe files were staged outside the auto-sync allowlist."
  }

  $stagedUnexpected = Get-StagedUnexpectedFiles -AllowedFiles $scope.Eligible
  if ($stagedUnexpected.Count -gt 0) {
    Write-FileList -Title "Refusing to commit staged files outside this auto-sync scope:" -Files $stagedUnexpected
    throw "Unexpected staged files would be included in git commit."
  }

  $staged = Get-GitLines -Arguments @("diff", "--cached", "--name-only")
  if ($staged.Count -eq 0) {
    Write-Output "No staged changes after guarded add; nothing to sync."
    return
  }

  Invoke-GitChecked -Arguments @("commit", "-m", $commitMessage)

  if ($SkipPush) {
    Write-Output "Committed locally and skipped push: $commitMessage"
    return
  }

  $branch = ((Get-GitLines -Arguments @("branch", "--show-current")) -join "").Trim()
  $upstream = Invoke-GitRaw -Arguments @("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}") -AllowFailure
  if ($upstream.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace(($upstream.Output -join "`n"))) {
    Invoke-GitChecked -Arguments @("push", "-u", "origin", $branch)
  } else {
    Invoke-GitChecked -Arguments @("push")
  }

  Write-Output "Synced branch $branch with commit: $commitMessage"
}

do {
  try {
    Invoke-GitSyncOnce -RequestedMessage $Message
  } catch {
    if ($Loop) {
      Write-Warning "Git auto-sync failed: $($_.Exception.Message)"
    } else {
      throw
    }
  }

  if ($Loop) {
    $sleepSeconds = [Math]::Max(30, $IntervalSeconds)
    Write-Output "Sleeping $sleepSeconds seconds before next auto-sync pass."
    Start-Sleep -Seconds $sleepSeconds
  }
} while ($Loop)
