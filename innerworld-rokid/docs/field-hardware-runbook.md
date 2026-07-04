# Field Hardware Runbook

P0 scope: real Rokid Station Pro + real A1/A2/A3 wall targets only. Unity fallback, manual observations, and simulator observations are rehearsal evidence; they must not be used to claim hardware-ready.

Do not write raw ADB serials, USB instance ids, private LAN IPs, pairing codes, MACs, or raw logcat into docs, screenshots, commit messages, or shared reports. Use script reports only after confirming they say raw identifiers are redacted or absent.

## 1. Host And Current APK Smoke

Run from the project root:

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run dev:lan
```

In another terminal, refresh LAN field config without printing the host address:

```powershell
npm run field:preflight -- -RequireLan
```

If the current APK has not already passed Station Pro smoke for the exact build being tested, run:

```powershell
npm run station:apk:pair-smoke
npm run check:station-apk:rkimage
npm run check:uxr-readiness:ready
```

Pass means install OK, cold launch OK, process observed, UXR app accepted, operator pairing verified, `assets/RKImage.db` contains target map `1:A1, 2:A2, 3:A3`, and evidence stays sanitized. This is still only APK/live-session proof, not hardware acceptance.

For the current black-screen fix line, APK smoke must also show `rokid_loader_ready=true`: the packaged `libopenxr_loader.so` must contain marker `com.rokid.openxr.runtime`. If smoke/logcat no longer shows `XR_ERROR_RUNTIME_UNAVAILABLE` but the glasses still show black, stop treating it as an APK loader issue and check physical display/glasses detection first. The current known residual symptoms are internal display only, `getGlassName failed: glass not detected`, and head-pose failures.

Before physical A1/A2/A3 scanning, require the glasses display chain:

```powershell
npm run station:apk:display-smoke
npm run station:glasses:require-ready
```

These commands are expected to fail until Station Pro detects the Rokid glasses/external display and head pose is healthy. Passing APK smoke alone is not enough; the strict display smoke and read-only glasses readiness gate must be green before the physical target pass.

For non-mutating troubleshooting after cable/dock/HDMI/glasses changes, run:

```powershell
npm run station:glasses:diagnose
```

Green report generation with `glasses_display_ready=false` is useful diagnostic evidence, not hardware readiness.

## 2. Open The Field Watch

Capture the current operator plan before the physical pass:

```powershell
npm run field:operator-plan
```

This writes `output/field-operator-plan/field-operator-plan-latest.json` and `.md` with the current phase, next actions, readiness, phase table, source-of-truth endpoints, P0 scope guard, and blockers. It is read-only and does not create evidence, run ADB/logcat, mutate mission state, or claim hardware-ready.

Start the combined read-only live + target watcher before anyone scans the wall:

```powershell
npm run field:acceptance-session:target
```

Use a longer watch window if the operator needs more time:

```powershell
npm run field:acceptance-session:target -- -WatchDurationSec 240 -WatchIntervalSec 2
```

The watcher must show `target_pass.precheck_ok=true`, `target_pass.physical_acceptance_ready=false` until the physical loop is complete, and `raw_logcat_included=false`. It may count `IW_TARGET_*` diagnostics, but it must not write raw logcat and it must not create simulator/manual observations.

## 3. Physical A1/A2/A3 Pass

Use the glasses, not the Web fallback, to scan the printed targets in order:

1. A1: frame the QR entry target through the current operator-paired live Rokid session, then confirm entry in the glasses.
2. A2: frame the A2 image target until the watch/latest report shows A2 as trusted. Then run the guarded mission action command:

```powershell
npm run field:target-pass:apply
```

This may post A2 `read` and `find_year`, then the controlled `service_action`, but only after trusted A2 exists. If the report says `trusted_A2_missing`, rescan A2 through the live session.
When an action is applied, its report line should show `provenance_ready=true` and `provenance_session=true` with only hash/sanitized provenance fields. If it is skipped with `live_mission_provenance_input_missing`, or if `provenance_blockers` lists `active_anchor_not_target`, `pointable_ui_focus_missing`, or `input_confirm_missing`, keep the A2/A3 target focused through the glasses and confirm again before rerunning.

3. A3: frame the A3 image target until it is trusted. Rerun the same guarded command to allow the A3 TimeMark write-back:

```powershell
npm run field:target-pass:apply
```

This may post the TimeMark only after `service_action` is complete and trusted A3 exists. If the report says `trusted_A3_or_service_action_missing`, finish the missing step and rescan A3.
The write-back and User B confirmation requests also attach the current live-session provenance input internally; reports must keep raw session ids and raw device ids out.

4. User B: switch to the User B readback path only after the operator has seen the new A3 memory through the glasses. Then run the strict target pass:

```powershell
npm run field:acceptance-session:target-strict
```

Pass means the command exits 0 and prints `ok=true`, `hardware_ready_claim_allowed=true`, `target_pass.precheck_ok=true`, `target_pass.physical_acceptance_ready=true`, `target_pass.trusted_a1_a2_a3_ready=true`, `target_pass.mission_loop_ready=true`, `target_pass.field_acceptance_ready=true`, empty `target_pass.missing_trusted_anchor_ids`, empty `target_pass.missing_mission_step_ids`, and empty `target_pass.physical_blockers`.

## 4. Field Acceptance Closeout

After strict target pass is green, run the acceptance checks against the live API:

```powershell
npm run field:live-pass -- --single --require-live-session --require-trusted --require-mission-loop
npm run field:acceptance-session -- -RequireTrusted -RequireMissionLoop
npm run check:field-acceptance -- --api
```

Hardware-ready is allowed only when the live/target reports and `/api/field/acceptance` agree on:

- trusted A1/A2/A3 observations from an operator-paired live SDK session
- mission steps complete: `read`, `find_year`, `service_action`, `write_back`
- at least one A3 write-back beacon
- User B readback ready with active user B
- `/api/field/acceptance` status `hardware_acceptance_ready` and `ready=true`

## 5. Fail Fast Rules

Stop and rescan or rerun smoke if any of these appear:

- `live_operator_paired_sdk_session_missing`
- `current_target_diagnostics_apk_preflight_missing`
- `apk_rokid_openxr_loader_not_from_rokid_package`
- `getGlassName failed: glass not detected`
- `rokid_glasses_display_not_ready`
- `rokid_external_display_not_detected`
- `rokid_head_pose_failure_detected`
- `trusted_a1_a2_a3_observations_missing`
- `mission_loop_waiting_for_trusted_a1_a2_a3`
- `p0_mission_writeback_user_b_loop_missing`
- `trusted_A2_missing`
- `trusted_A3_or_service_action_missing`
- `field_acceptance_ready=false`
- any report, console capture, or copied text contains raw serials, raw private IPs, raw pairing codes, or raw logcat

Passing `check:field-live-pass` or `field:acceptance-session` without trusted A1/A2/A3 and the User B loop is only a clean precheck. If a report shows `mission_ledger_ready=true` but `mission_loop_ready=false`, the next action is still physical trusted A1/A2/A3 scanning, not a hardware-ready claim.
