param(
  [string]$HostName = "innerworld.example.com",
  [int]$Port = 5177,
  [string]$ServiceName = "innerworld-space-server",
  [string]$RemoteDir = "/opt/innerworld-space-server"
)

$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseRoot = Join-Path $root "output\server-release"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Add-Issue {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Message
  )
  $List.Add($Message) | Out-Null
}

function Get-LatestManifest {
  $latest = Get-ChildItem -LiteralPath $releaseRoot -Filter "innerworld-space-server-*.manifest.json" -File -Force |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$latest) { throw "No server release manifest found in $releaseRoot" }
  return $latest.FullName
}

function Test-Health {
  param([string]$Url)
  try {
    $healthUrl = "$($Url.TrimEnd('/'))/api/health"
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
    $body = $response.Content | ConvertFrom-Json
    return [pscustomobject]@{
      ok = $true
      url = $healthUrl
      status_code = [int]$response.StatusCode
      mission_state = $body.mission_state
      beacon_count = $body.beacon_count
      completed_step_count = $body.completed_step_count
      demo_ready = $body.demo_ready
      error = $null
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      url = "$($Url.TrimEnd('/'))/api/health"
      status_code = $null
      mission_state = $null
      beacon_count = $null
      completed_step_count = $null
      demo_ready = $null
      error = $_.Exception.Message
    }
  }
}

$warnings = [System.Collections.Generic.List[string]]::new()
$errors = [System.Collections.Generic.List[string]]::new()

$manifestPath = Get-LatestManifest
$manifest = Get-Content -LiteralPath $manifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
$zipPath = [string]$manifest.zip_path
if (!(Test-Path -LiteralPath $zipPath)) {
  Add-Issue $errors "Server release zip is missing: $zipPath"
}

$zipHash = if (Test-Path -LiteralPath $zipPath) { (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash } else { $null }
if ($zipHash -and $manifest.zip_sha256 -and $zipHash -ne [string]$manifest.zip_sha256) {
  Add-Issue $errors "Server release zip SHA does not match manifest."
}

$health = Test-Health -Url "http://localhost:$Port"
if (!$health.ok) {
  Add-Issue $warnings "Local API health is not reachable on http://localhost:$Port; run npm run dev or server:smoke before upload."
} elseif ($health.mission_state -ne "entered" -or $health.beacon_count -ne 2 -or $health.completed_step_count -ne 0) {
  Add-Issue $warnings "Local API is reachable but not in clean entered / 2 beacons / 0 completed state."
}

$zipName = Split-Path -Leaf $zipPath
$releaseName = [System.IO.Path]::GetFileNameWithoutExtension($zipName)
$remoteZip = "$RemoteDir/releases/$zipName"
$extractDir = "$RemoteDir/releases/$releaseName"

$plan = [pscustomobject]@{
  ok = ($errors.Count -eq 0)
  generated_at = (Get-Date).ToString("o")
  release = $manifest.release
  zip_path = $zipPath
  zip_sha256 = $zipHash
  manifest_path = $manifestPath
  host_name = $HostName
  port = $Port
  service_name = $ServiceName
  remote_dir = $RemoteDir
  remote_zip = $remoteZip
  extract_dir = $extractDir
  local_health = $health
  warnings = @($warnings)
  errors = @($errors)
}

$jsonPath = Join-Path $releaseRoot "deploy-plan-$stamp.json"
$mdPath = Join-Path $releaseRoot "deploy-plan-$stamp.md"
$latestJson = Join-Path $releaseRoot "deploy-plan-latest.json"
$latestMd = Join-Path $releaseRoot "deploy-plan-latest.md"

$plan | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path $jsonPath
Copy-Item -LiteralPath $jsonPath -Destination $latestJson -Force

$warningLines = if ($warnings.Count -gt 0) { $warnings | ForEach-Object { "- $_" } } else { @("- None") }
$errorLines = if ($errors.Count -gt 0) { $errors | ForEach-Object { "- $_" } } else { @("- None") }

$md = @"
# InnerWorld Server Deploy Plan

- Generated: $($plan.generated_at)
- OK: $($plan.ok)
- Release: $($plan.release)
- Server zip: $zipPath
- SHA256: $zipHash
- Local health: $($health.ok), state=$($health.mission_state), beacons=$($health.beacon_count), completed=$($health.completed_step_count)

## Upload

- scp $zipPath user@${HostName}:$remoteZip
- ssh user@${HostName}
- mkdir -p $RemoteDir/releases
- unzip -o $remoteZip -d $extractDir
- cd $extractDir
- node server/space-server/check-readonly.js
- PORT=$Port HOST=127.0.0.1 sh ./start-server.sh

## systemd Unit

Save as /etc/systemd/system/$ServiceName.service:

[Unit]
Description=InnerWorld Space Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$extractDir
Environment=PORT=$Port
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node server/space-server/index.js
Restart=always
RestartSec=3
User=www-data

[Install]
WantedBy=multi-user.target

Then run:

- sudo systemctl daemon-reload
- sudo systemctl enable --now $ServiceName
- curl http://127.0.0.1:$Port/api/health

## Caddy Reverse Proxy

$HostName {
  reverse_proxy 127.0.0.1:$Port
}

## Nginx Reverse Proxy

server {
  listen 80;
  server_name $HostName;

  location / {
    proxy_pass http://127.0.0.1:$Port;
    proxy_set_header Host `$host;
    proxy_set_header X-Real-IP `$remote_addr;
    proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto `$scheme;
  }
}

## Warnings

$($warningLines -join "`n")

## Errors

$($errorLines -join "`n")
"@
$md | Set-Content -Encoding UTF8 -Path $mdPath
Copy-Item -LiteralPath $mdPath -Destination $latestMd -Force

Write-Output "Server deploy plan complete."
Write-Output "OK: $($plan.ok)"
Write-Output "Markdown: $mdPath"
Write-Output "JSON: $jsonPath"
if ($warnings.Count -gt 0) {
  Write-Output "Warnings:"
  $warnings | ForEach-Object { Write-Output " - $_" }
}
if ($errors.Count -gt 0) {
  Write-Output "Errors:"
  $errors | ForEach-Object { Write-Output " - $_" }
  exit 1
}
