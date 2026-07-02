param(
  [string]$PublicUrl = $env:FIELD_KIT_PUBLIC_URL,
  [string]$DCacheRoot = "D:\Downloads\RokidCache"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRoot = (Resolve-Path (Join-Path $root "..")).Path
$localRenderer = Join-Path $root "pdf-renderer"
$siblingRenderer = Join-Path $repoRoot "pdf-renderer"
if (Test-Path -LiteralPath (Join-Path $localRenderer "pom.xml")) {
  $renderer = $localRenderer
} else {
  $renderer = $siblingRenderer
}
$pom = Join-Path $renderer "pom.xml"

if (!(Test-Path -LiteralPath $pom)) {
  throw "Missing PDF renderer pom: $pom"
}

if ([string]::IsNullOrWhiteSpace($PublicUrl)) {
  $PublicUrl = "http://localhost:5177/"
}

$dCacheParent = Split-Path -Parent $DCacheRoot
if (!(Test-Path -LiteralPath $dCacheParent)) {
  $DCacheRoot = Join-Path $root "output\cache"
}
$mavenRepo = Join-Path $DCacheRoot "m2-repository"
New-Item -ItemType Directory -Force -Path $mavenRepo | Out-Null

$oldPublicUrl = $env:FIELD_KIT_PUBLIC_URL
$env:FIELD_KIT_PUBLIC_URL = $PublicUrl
try {
  & mvn -q -f $pom compile exec:java "-Dmaven.repo.local=$mavenRepo" "-Dexec.mainClass=com.rokid.innerworld.FieldKitPdf" "-Dinnerworld.projectRoot=$root"
  if ($LASTEXITCODE -ne 0) {
    throw "Maven PDF render failed with exit code $LASTEXITCODE"
  }
} finally {
  $env:FIELD_KIT_PUBLIC_URL = $oldPublicUrl
}
