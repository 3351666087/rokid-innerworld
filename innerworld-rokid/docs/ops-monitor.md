# Ops Monitor

`tools\ops-monitor.ps1` is the long-running local watchdog for this workspace. It repeatedly runs the environment doctor, cache reports, and optional guarded cleanup while writing bounded logs under `output\ops-monitor`.

## Commands

```powershell
npm run ops:monitor:once
npm run ops:monitor:clean:once
npm run ops:monitor
npm run ops:monitor:clean
npm run ops:monitor:status
```

- `ops:monitor:once` runs one pass and exits.
- `ops:monitor:clean:once` runs one pass with guarded cleanup enabled.
- `ops:monitor` runs every 15 minutes, reports only, and keeps the latest status in `output\ops-monitor\ops-monitor-latest.md`.
- `ops:monitor:clean` runs every 15 minutes with `-ApplySafeCleanup -CleanupEveryIterations 1`, so every pass also runs guarded Temp/cache cleanup.
- `ops:monitor:status` prints the background process state and latest C-drive/cache result without dumping PowerShell file metadata.

## Safety

Cleanup is delegated to the existing guarded scripts:

- `tools\temp-clean.ps1 -Apply` only removes known installer remnants or Rokid temp folders under the current user's Temp root, skips recent items, skips process-referenced paths, and skips reparse points.
- `tools\cache-clean.ps1 -Apply` moves Unity Hub downloads on C to `D:\Downloads\RokidCache`, deletes bounded Unity Hub logs/GPU cache and Rokid temp downloads, and only reports npm/Maven/Unity editor caches.

The monitor writes detailed command logs into `output\ops-monitor\logs` and keeps the newest 200 logs by default. It does not include those logs in the main demo package.
The summary file keeps the newest 1000 entries by default. When Unity Hub or its installer/downloader is active, clean mode skips `cache-clean.ps1 -Apply` so live Unity downloads are not moved mid-install; Temp cleanup and reporting still run.

## Useful Options

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools\ops-monitor.ps1 -RunOnce
powershell -NoProfile -ExecutionPolicy Bypass -File tools\ops-monitor.ps1 -IntervalMinutes 10 -ApplySafeCleanup -CleanupEveryIterations 1
powershell -NoProfile -ExecutionPolicy Bypass -File tools\ops-monitor.ps1 -Iterations 96 -IntervalMinutes 15 -ApplySafeCleanup
powershell -NoProfile -ExecutionPolicy Bypass -File tools\ops-monitor.ps1 -RunOnce -ApplySafeCleanup -KeepSummaryLines 500
```

For multi-day unattended work, prefer a visible terminal first so the latest line remains easy to inspect. If it is started as a hidden Windows process, check `output\ops-monitor\ops-monitor-latest.md` and `output\ops-monitor\ops-monitor-summary.md`.
