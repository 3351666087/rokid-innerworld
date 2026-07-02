$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $PSScriptRoot "node_modules\sql.js"))) {
  npm ci
}
npm run dev
