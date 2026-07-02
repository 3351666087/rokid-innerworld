# Space Server Deploy

This is the lightweight path for uploading only the runnable Space Server to a small host.

## Build

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run server:package
npm run server:deploy-plan
npm run server:deploy-dry-run
```

Output:

```text
output\server-release\innerworld-space-server-*.zip
output\server-release\innerworld-space-server-*.manifest.json
output\server-release\deploy-plan-latest.md
output\server-release\deploy-dry-run-latest.md
```

The release excludes `data/runtime_state.json`, Unity outputs, `node_modules`, `.git`, package zips, and cache folders.

`deploy-plan-latest.md` is a local handoff plan for the latest server-only zip. It includes upload commands, Linux startup, systemd, Caddy, and Nginx snippets. It does not connect to or upload anything by itself.

`deploy-dry-run-latest.md` is the local proof that the latest server-only zip and deploy plan agree. It extracts the zip under `D:\Downloads\RokidCache`, verifies hashes and required files, starts the extracted `start-server.ps1` on a temporary localhost port, then runs health, ops status, read-only, and rehearsal checks.

## Local Smoke

Run the reusable smoke script:

```powershell
npm run server:smoke
npm run server:deploy-dry-run
```

Or extract the zip manually and run:

```powershell
$env:PORT = "5188"
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-server.ps1
```

Then check:

```powershell
Invoke-RestMethod http://127.0.0.1:5188/api/health
```

Expected clean state:

```text
demo_ready=true
mission_state=entered
beacon_count=2
completed_step_count=0
```

## Linux Host

```sh
unzip innerworld-space-server-*.zip -d innerworld-space-server
cd innerworld-space-server
PORT=5177 HOST=127.0.0.1 sh ./start-server.sh
```

Put Nginx or Caddy in front of the Node process for HTTPS and domain routing. Keep `HOST=127.0.0.1` on public servers unless direct external access is intentional.

## LAN Demo

On the Windows main control machine:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-server-lan.ps1
```

Phones or Rokid devices should open:

```text
http://<Windows主控机IP>:5177/
```

## Checks

```powershell
node server\space-server\check-readonly.js
node server\space-server\check-device.js
node server\space-server\check-ops.js
node server\space-server\capture-rehearsal.js --reset-after
```

For localhost-only work, the full project can still use:

```powershell
npm run check:unity
npm run evidence:rehearsal -- --reset-after
```
