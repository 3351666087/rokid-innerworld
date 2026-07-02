# Cache Ops

This project treats C drive space as a build safety requirement. Unity, Android, npm, and browser tooling can fill C quickly, so every major build or package pass should include a cache check.

## Routine

Run this before and after Unity, Android, or demo package work:

```powershell
npm run ops:monitor:once
npm run cache:temp:report
npm run cache:report
npm run cache:clean
npm run cache:temp:clean
npm run cache:report
```

`npm run package:demo` also runs a safe cache pass by default and writes cache reports into the package under `output/package-cache`.
It keeps only the latest two package groups in `output\package` by default, so repeated packaging does not slowly fill C.
`npm run verify:release` includes `cache:temp:report` and `cache:report`; destructive Temp cleanup remains an explicit operator action.
For continuous local work, run `npm run ops:monitor` for report-only monitoring or `npm run ops:monitor:clean` for frequent guarded cleanup. See `docs\ops-monitor.md`.
For one immediate guarded cleanup pass, run `npm run ops:monitor:clean:once`.

## Storage Rule

- Keep reusable installers, Unity module archives, Android tool zips, and large downloads under `D:\Downloads\RokidCache`.
- Keep C drive for active tools only.
- Do not delete `apps\unity-shell\Library` casually. It is large, but it is also the hot Unity build cache. Delete it only when C drive pressure is severe or a clean Unity reimport is required.
- Prefer `npm run package:demo:noclean` only when debugging the packager itself.

## Thresholds

- Warn below 25 GB free on C.
- Stop packaging below 8 GB free on C.
- If C remains below the warning threshold after cleanup, move non-project downloads to D before another Unity or Android build.
- If user Temp contains multi-GB installer remnants, run `npm run cache:temp:report` first and only then `npm run cache:temp:clean`.

## Safe Cleanup Scope

`tools\cache-clean.ps1` currently cleans or moves only bounded cache locations:

- Unity Hub downloads on C are moved to `D:\Downloads\RokidCache\UnityHubDownloads`.
- Unity Hub logs and GPU cache are deleted.
- Rokid temp downloads under the system temp directory are deleted.
- npm cache and Unity editor cache are reported, not deleted.
- The D cache root is reported and kept.

`tools\temp-clean.ps1` is a separate guarded Temp cleaner:

- It only scans the current user's Temp root.
- It defaults to items older than 6 hours.
- It currently targets Visual Studio/Android/.NET/SSMS installer extraction remnants and Rokid temp directories.
- It checks whether any running process command line references a candidate path before deleting.
- It skips reparse points such as junctions and symlinks.
- It runs as dry-run unless `-Apply` is passed through `npm run cache:temp:clean`.
