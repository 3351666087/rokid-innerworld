param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [string]$SpaceId = "innerworld_campus_wall"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$configPaths = @(
  (Join-Path $root "apps\unity-shell\Assets\StreamingAssets\innerworld-config.json"),
  (Join-Path $root "apps\unity-shell\Assets\Resources\innerworld-config.json")
)

if ($BaseUrl -notmatch '^https?://') {
  throw "BaseUrl must start with http:// or https://"
}

$config = [pscustomobject]@{
  base_url = $BaseUrl.TrimEnd('/')
  space_id = $SpaceId
}

foreach ($configPath in $configPaths) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $configPath) | Out-Null
  $config | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 -Path $configPath
  Write-Output "Unity config updated: $configPath"
}

Write-Output "base_url=$($config.base_url)"
Write-Output "space_id=$($config.space_id)"
