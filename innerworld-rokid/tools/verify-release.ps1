$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  Write-Output "== $Name =="
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Set-Location -LiteralPath $root

Invoke-Step "check:contract" { npm run check:contract }
Invoke-Step "check:unity" { npm run check:unity }
Invoke-Step "check:device" { npm run check:device }
Invoke-Step "env:doctor" { npm run env:doctor }
Invoke-Step "ops:monitor:once" { npm run ops:monitor:once }
Invoke-Step "evidence:rehearsal" { npm run evidence:rehearsal -- --reset-after }
Invoke-Step "field:preflight" { npm run field:preflight -- -SkipUnityConfig -SkipPdf }
Invoke-Step "pdf:fieldkit" { npm run pdf:fieldkit }
Invoke-Step "check:field-markers" { npm run check:field-markers }
Invoke-Step "check:field-acceptance:api" { npm run check:field-acceptance -- --api }
Invoke-Step "server:package" { npm run server:package }
Invoke-Step "server:smoke" { powershell -NoProfile -ExecutionPolicy Bypass -File tools\smoke-server-release.ps1 }
Invoke-Step "server:deploy-plan" { npm run server:deploy-plan }
Invoke-Step "server:deploy-dry-run" { npm run server:deploy-dry-run }
Invoke-Step "package:demo" { npm run package:demo }
Invoke-Step "package:audit" { powershell -NoProfile -ExecutionPolicy Bypass -File tools\audit-demo-package.ps1 }
Invoke-Step "env:doctor:post-package" { npm run env:doctor }
Invoke-Step "release:index" { npm run release:index }
Invoke-Step "check:ops" { npm run check:ops -- --require-artifacts }
Invoke-Step "cache:temp:report" { npm run cache:temp:report }
Invoke-Step "cache:report" { npm run cache:report }

Write-Output "Release verification complete."
