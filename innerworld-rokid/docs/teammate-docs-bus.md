# Teammate Docs Bus

Updated: 2026-07-04 17:55 Asia/Shanghai

This document records how teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` enters the InnerWorld mainline. Carver is the long-running mainline reviewer sub-agent name going forward. The rule is strict: the teammate docs are actionable only through the current one-wall A1/A2/A3/User B Rokid spatial memory loop. They do not create a parallel product line.

## Sources

- `docs/design.md`: spatial UX/design work breakdown for InnerWorld and Rokid UXR constraints.
- `docs/rokid_sdk_docs.md`: extracted Rokid SDK notes for RKCameraRig, RKInput, RKHand, PointableUI, PointableUICurve, FollowCamera, image recognition, SLAM/head tracking, GlobalEventUtils, and UXR3.0 setup.
- `docs/rokid_sdk_docs_full.md`: full SDK capture, including UXR3.0/OpenXR package setup, scoped registry flow, `com.rokid.xr.unity`, Environment Fix, OpenXR Feature Groups, Project Validation, RKCameraRig replacement, sample APK install/run, image tracking, and SLAM sample references.
- `docs/策划案.pdf`: 13-page A4 proposal. Extractable text confirms the core idea: Campus Hidden Layer, Spatial URL/visual anchor entry, fixed-place TimeMark, AI semantic compression/moderation, controlled demo at one place, and later platform ideas. The P0 adoption below deliberately keeps only the one-wall demo loop.

## Carver Review Result

Carver says the current absorption path is correct: teammate material must enter through Space API, SQLite, Unity adapter, device runtime, field markers, field acceptance, and evidence replay. It must not compete with `station_pro_trusted_hardware_session`.

Latest Carver-context review on 2026-07-03: OK to keep this checkpoint as the bus. Mainline drift check passed: P0 remains Station Pro + UXR3.0 + RKCameraRig/RKInput/PointableUI/image target/SLAM/live SDK proof on a single A1/A2/A3/User B wall loop. Hardware-ready language is still correct because sanitized ADB visibility only starts the hardware lane; it does not prove Unity/UXR adapter readiness, APK runtime, or field acceptance.

Full source-review record: `docs/carver-source-review.md`. That file records Carver's requested read-through of group extracted attachments, teammate GitHub files, old context exports, PDF extraction coverage, P0/P1/P2 boundaries, current live-hardware risks, and the next task queue.

Local/GitHub source alignment checked on 2026-07-03 19:20 Asia/Shanghai:

- `origin/main` and local `main` are at `b21fa314`.
- Teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` is by Shiyao Zhang and adds only `docs/design.md`, `docs/rokid_sdk_docs.md`, `docs/rokid_sdk_docs_full.md`, and `docs/策划案.pdf`.
- Group-chat final artifacts still support the campus memory wall / small controlled hidden layer loop; broad Spatial Pin, public TimeMark, dashboards, and platform content remain P2/reference until the hardware loop is accepted.

Fresh GitHub check on 2026-07-03 19:46 Asia/Shanghai:

- `git fetch --all --prune` completed and left local `main`, `origin/main`, and `origin/HEAD` aligned at `b21fa314`.
- `gh pr list --state all` and `gh issue list --state all` returned no repository PRs or issues, so teammate GitHub material currently enters only through the main-branch commit above.
- Fresh Carver re-audit completed under `.agents/carver/`; the final source audit is `.agents/carver/source-audit-2026-07-03.md`. It rendered the 13-page proposal PDF to page PNGs, smoke-rendered 19 raw PDFs, and confirmed the root proposal PDF is readable with `pypdf`/`pdfplumber`.
- Carver's PDF metadata correction: old extracted `pdfinfo.txt` files are mostly broken wrapper output, so future page/encryption metadata should come from `pages.json` or the real Poppler executables in the bundled runtime.

LAN APK checkpoint on 2026-07-03 20:18 Asia/Shanghai:

- Direct Gradle `:launcher:assembleRelease` succeeded after adding Aliyun Maven mirrors to Unity's generated Gradle `settings.gradle`; the current APK artifact is `output/unity-android/InnerWorldRokid.apk` copied from `launcher-release.apk`, not only a config-patched fallback.
- `station:apk:inspect`, `check:station-apk:lan`, `device:probe`, `check:device-probe`, `check:mainline`, and `field:preflight -- -RequireLan` passed. APK config is `private_lan` and `network_ready_for_device=true`; APK and source Unity config host hashes match.
- No new install/launch was performed in this checkpoint. The bus still treats this as package/config readiness, not live UXR proof or hardware acceptance.
- If Gradle/Maven downloads fail again, IDM is the preferred fetch tool for failed dependency URLs; long-term fix is to codify mirror/IDM fallback outside generated Unity output.

UXR launch + heartbeat checkpoint on 2026-07-03 21:05/21:19 Asia/Shanghai:

- Carver's superseded blocker audit remains `.agents/carver/uxr-blocker-audit-2026-07-03.md`; the current checkpoint audit is `.agents/carver/uxr-launch-heartbeat-checkpoint-2026-07-03-2105.md`.
- That checkpoint's LAN APK was Station-UXR-manifest accepted at the install/run layer: install OK, `am start` OK, process observed, `isUxrApp=true`, and no error 102. This resolved the plain package launch blocker for that APK lineage.
- LAN Space API heartbeat from the running Unity app is proven, including active anchor A3 and pose present.
- This still narrows, rather than expands, the bus: teammate SDK material must enter next through official UXR/OpenXR live binding, not fallback UI polish or broad product features.
- P0 next proof is `com.rokid.xr.unity`, `com.unity.xr.openxr`, `com.unity.xr.management`, Rokid Environment Fix, OpenXR Feature Groups, Project Validation, minimal RKCameraRig/sample launch, RKInput 3DoF ray, PointableUI, image target / SLAM heartbeat, operator pairing, trusted A1/A2/A3 observations, and User B readback inside that live SDK lane.
- Boundary remains false for hardware acceptance: current live session is still `fallback_only`, `live_binding_ready=false`, unpaired, and `hardware_acceptance_eligible=false`.
- Evidence tooling now separates latest non-mutating inspect from latest mutating launch so package checks do not overwrite the last real Station Pro launch proof.

Evidence reconciliation checkpoint on 2026-07-03 22:18 Asia/Shanghai:

- The current disk APK is now 45,167,409 bytes with SHA256 `ce3f118632d6202c61455f19cdc11080a765e17c74f6be07496ef2c2b571cf1d`; current non-mutating inspect/LAN evidence matches that SHA.
- `tools/build-unity-android.ps1` records final APK size/SHA after post-checks, preventing stale build reports when the APK changes after an earlier sample point.
- `uxr-readiness-latest` now compares current APK SHA, latest inspect SHA, and latest mutating-launch SHA. It warns `latest_mutating_launch_apk_sha_mismatch_current_apk` because the last mutating launch belongs to previous APK SHA `70592a5dfec4...`.
- The bus must treat the 21:05/22:01 Station Pro launch as historical proof for earlier APKs, not launch proof for the current `ce3f...` APK. Next P0 proof is `user_confirmed_current_apk_station_pro_install_launch_smoke`, followed by live SDK binding, operator pairing, trusted A1/A2/A3 observations, A3 write-back, User B readback, and `/api/field/acceptance`.

Real-device probe and evidence-pointer checkpoint on 2026-07-04 12:31 Asia/Shanghai:

- The current PR branch is `codex/rokid-real-device-sync`, and PR #1 is open as a draft. The current APK remains SHA256 `bd852f7012e25f9ccd2630e2113a1a3526fc7bdfea5d05c32d56c410303fe142` with `assets/RKImage.db` and Rokid/OpenXR native libraries packaged.
- Carver's fresh source/PDF audit for this checkpoint is `.agents/carver/carver-source-audit-2026-07-04-1231.md`; it confirms 19 target PDFs are readable through PyMuPDF text extraction and that the teammate/group materials still converge on the P0 one-wall A1/A2/A3/User B loop.
- `device-probe` now has bounded ADB/tool/PnP timeouts plus an outer `check:device-probe` timeout, so Windows hardware enumeration cannot hang the real-device gate indefinitely.
- `check:station-apk:rkimage` now consumes `station-pro-apk-smoke-latest-inspect.*` and asserts `evidence_kind=inspect_only`; this keeps inspect/package evidence separate from mutating Station Pro install/launch/pairing evidence.
- Latest live boundary is correct: LAN server is up, `station:apk:pair-smoke` passed, and `check:field-live-pass` sees one online operator-paired live session. Hardware-ready remains false because trusted A1/A2/A3 observations, A3 TimeMark write-back, and User B readback are still missing.
- Follow-up live-pass watch hardening now reports missing trusted anchors, missing raw hardware anchors, missing mission steps, and next required field actions. The current baseline says A1 still needs raw hardware scan, while A2/A3 need re-scan or re-bind through the operator-paired live SDK session before they can become trusted evidence.
- Follow-up field acceptance session runner now makes the next physical proof executable: default mode captures sanitized device/APK/API/live-pass prechecks without mutating observations or mission state, and `field:acceptance-session:live` explicitly wraps the mutating pair-smoke plus live watch for the real A1/A2/A3/User B pass. Latest default runner pass is green but still blocks hardware-ready with trusted anchors and mission/User B incomplete.

Target-diagnostics APK checkpoint on 2026-07-04 14:31 Asia/Shanghai:

- The current APK supersedes the earlier `bd852...` fact: `output/unity-android/InnerWorldRokid.apk`, 45,721,247 bytes, SHA256 `e447069ac12b8b757e143387975a06a6965e0ede50b91e77d78763b5adf39c84`.
- This APK includes the `IW_TARGET_*` target-observation diagnostics and passed Station Pro install/cold-launch/process/operator-pairing smoke. `field-live-pass --single --logcat` exposes the diagnostic counters without writing raw logcat.
- `field:target-pass` strict mode now requires a target-diagnostics preflight that matches current APK SHA prefix, APK token scan, latest mutating launch evidence, and UXR readiness before the physical pass can be accepted. The guard is green for `e447...` and still leaves trusted A1/A2/A3 plus mission/User B as the remaining blockers.
- `tools/build-unity-android.ps1` now timeout-bounds external post-build checks, so Unity success can refresh build evidence without hanging. This is build/evidence reliability only, not hardware-ready proof.
- The bus remains unchanged: teammate SDK material still enters only through the single-wall A1/A2/A3/User B loop. Trusted A1/A2/A3 observations, A3 TimeMark write-back, User B readback, and `/api/field/acceptance` are still the missing proof.

APK target-index preflight checkpoint on 2026-07-04 15:25 Asia/Shanghai:

- The current APK-packaged `assets/RKImage.db` is now opened by `station-pro-apk-smoke.ps1` and `uxr-readiness.js`; both parse nested `Data.json` and require `innerworld-rokid-target-index-map/v1` with `1:A1`, `2:A2`, `3:A3`.
- `check:station-apk:rkimage`, `check:uxr-readiness:ready`, `check:field-target-pass`, `check:contract`, and `check:mainline` pass with the target map green. `field:target-pass:strict` still fails only on missing trusted A1/A2/A3 observations and the P0 mission/User B loop.

Target readiness operator panel checkpoint on 2026-07-04 16:52 Asia/Shanghai:

- Carver's panel audit is `.agents/carver/carver-target-readiness-panel-audit-2026-07-04-1640.md`.
- The bus now exposes read-only `/api/field/target-readiness` and Web Field Acceptance cards for `precheck_ok`, `physical_acceptance_ready`, trusted A1/A2/A3 count, mission/User B state, and physical blockers.
- This is not a Web product expansion: it does not run device commands, read output reports directly, post simulator/manual observations, mutate mission/write-back state, or relax `/api/field/acceptance.ready` as the final physical acceptance truth.
- This checkpoint strengthens the image-target package gate from “RKImage.db exists” to “the APK carries the correct one-wall A1/A2/A3 map.” It does not claim target events, live physical observations, write-back, User B readback, or hardware acceptance.

RKInput/PointableUI heartbeat checkpoint on 2026-07-04 17:08 Asia/Shanghai:

- Unity heartbeat now reports sanitized `input_frame` evidence for the RKInput 3DoF ray / PointableUI focus path over A1/A2/A3.
- The Space Server summarizes that evidence in device health, sessions, and the `rk_input_3dof_ray` live-adapter checklist while omitting raw ray vectors and raw pose streams.
- This is adapter observability for the physical pass, not a hardware-ready claim or a replacement for trusted A1/A2/A3 observations and the A3/User B loop.

Trusted mission provenance checkpoint on 2026-07-04 17:28 Asia/Shanghai:

- Carver audit record: `.agents/carver/carver-trusted-mission-provenance-audit-2026-07-04-1728.md`.
- Unity/Rokid mission requests now carry session/device/anchor inputs so the server can derive sanitized trusted proof for A2 read/find_year, service action, A3 TimeMark, and User B readback.
- SQLite and `/api/field/acceptance` now require trusted mission provenance for `mission_loop`; scripts/manual/simulator can rehearse but cannot make strict physical acceptance green.
- `field-live-pass` and `field-target-pass` now expose `trusted_mission_provenance_ready`; strict target pass remains red with `trusted_mission_provenance_missing` until the real live Rokid loop completes.

Current-APK Station Pro rebuild/smoke checkpoint on 2026-07-04 17:55 Asia/Shanghai:

- GitHub branch `codex/rokid-real-device-sync` was pushed and PR #1 was clean/CI-green before this hardware slice continued.
- The LAN Space Server was restarted on current code, a Unity compile blocker in `BuildDeviceInputFramePayload` was fixed, and the current APK now supersedes the earlier `9ddf...` fact: `output/unity-android/InnerWorldRokid.apk`, 45,727,279 bytes, SHA256 `19733d32b2bdbd347895a319e55a051c7c3722d1329f823baf78ce61e9978955`.
- `station:apk:pair-smoke` passed for that exact APK on the connected Station Pro: install, cold launch, process observation, UXR app acceptance, and operator pairing are verified with raw identifiers/pairing code excluded from evidence.
- The bus remains strict: this proves the current package/install/pairing lane, not hardware acceptance. `field:target-pass:strict` still blocks on missing trusted A1/A2/A3 observations, and the next proof is the real wall A1 -> A2 -> A3 TimeMark -> User B loop.
- `tools/build-unity-android.ps1` post-check execution now uses a direct timeout-bounded .NET process runner instead of a PowerShell Job wrapper; `-SkipUnityBuild -RunPostChecks -RequirePostCheckDevice` passes for the current APK.

Per-anchor trust diagnostics checkpoint on 2026-07-04 15:43 Asia/Shanghai:

- `field-live-pass` and `field-target-pass` now read `/api/calibration/wall` trust details and add sanitized `trust_issues_by_anchor` plus an `Untrusted Hardware Observations` report section.
- The bus uses this only to guide the physical pass: current A2/A3 hardware-mode observations can be explained by issue codes and SDK binding stage, but they remain untrusted until re-scanned or re-bound through the operator-paired live SDK session.
- No hardware-ready claim changes in this checkpoint. Trusted A1/A2/A3, A3 TimeMark write-back, User B readback, and `/api/field/acceptance` are still required.

Trusted-observation rescan barrier checkpoint on 2026-07-04 16:01 Asia/Shanghai:

- Carver recorded the checkpoint audit in `.agents/carver/carver-trusted-observation-checkpoint-2026-07-04.md`. Its key finding is that the current live adapter may be ready, but old A2/A3 observations cannot be upgraded; the physical pass needs fresh scans.
- Unity now queues one latest target event per A1/A2/A3 anchor until a same-session heartbeat acknowledges operator pairing, hardware eligibility, and input/overlay/live SDK binding, then retries through the normal trusted observation POST path.
- Field live/target reports expose live adapter checklist gaps; current latest operator-paired session is live-bound with no adapter checklist gaps. The bus still requires fresh trusted A1/A2/A3 plus A3 write-back/User B readback before hardware acceptance.

Current-APK Station Pro smoke checkpoint on 2026-07-04 16:17 Asia/Shanghai:

- GitHub branch `codex/rokid-real-device-sync` and PR #1 were synced before the next hardware slice.
- The then-current APK for that checkpoint was `output/unity-android/InnerWorldRokid.apk`, 45,722,295 bytes, SHA256 `9ddf80932c9896c3c744f6a46bef104e6722bd0615675f1a83e364db2adafe4e`; it is now superseded by the 17:55 `19733d32b2bd...` APK.
- `station:apk:pair-smoke` passed for that exact APK on the connected Station Pro with install, cold launch, process observation, UXR app acceptance, and operator pairing verified.
- Readiness/package/live-window checks passed, while `field:target-pass:strict` still fails on missing trusted A1/A2/A3 observations and the A2->A3->User B mission loop. This is the correct hardware boundary.

Field target session wrapper checkpoint on 2026-07-04 16:32 Asia/Shanghai:

- Carver recorded the short audit in `.agents/carver/carver-target-session-wrapper-audit-2026-07-04-1632.md`: no hardware-ready misclaim, no P0 drift, and the correct next slice is reducing ambiguity in the physical-pass runner.
- `field-target-pass` now separates `precheck_ok` from `physical_acceptance_ready` and lists `physical_blockers` even when a non-strict precheck exits green.
- `field:acceptance-session:target` and `field:acceptance-session:target-strict` are now the recommended site commands for combined live/target evidence and strict closeout. The strict path remains blocked until fresh trusted A1/A2/A3, A3 TimeMark write-back, User B readback, and `/api/field/acceptance`.

Already merged into the mainline:

- A1 spatial entry, including physical anchor/QR/logo, recognition lock frame, deliberate confirmation, and entry transition language.
- A2/A3 field marker and image target asset chain, with source assets under `data/field-targets` and runtime exposure through `/api/field/markers`.
- Story Graph / mission loop for A1 entry, A2 memory, A3 TimeMark write-back, and User B readback.
- Evidence Replay / Judge Mode and Field Acceptance gates that prove the loop without leaking private identifiers.
- Premium Unity shell language for radar, anchor halo, route line, near/far panels, and low-noise operator state.
- Controlled TimeMark authoring direction: bounded write-back and AI semantic compression, not open UGC.

## P0 Adoption

P0 adoption means "build now or gate now" because it directly serves true Rokid hardware attachment.

- `station_pro_trusted_hardware_session`: sanitized ADB/toolchain probe, operator pairing, APK install/run, Unity heartbeat, and trusted A1/A2/A3 observations.
- UXR3.0 SDK project validation: Android target, scoped registry, `com.rokid.xr.unity`, Environment Fix, OpenXR Feature Groups, and Project Validation.
- RKCameraRig: replace Unity `Main Camera` only in the `ROKID_UXR` lane and report binding status through `RokidSdkBindingProbe`.
- RKInput 3DoF ray: default hardware interaction maps to the existing command set: select A1/A2/A3, complete next mission step, service action, and write-back.
- PointableUI / PointableUICurve: A1 confirmation, A2 memory panel, and A3 write-back controls reuse the Space API and do not create a second UI state model.
- A2/A3 image target library: import target assets from `/api/field/markers`, match `asset_id`, SHA256, physical size, DPI, and print version.
- A1 deliberate confirmation: recognition alone is not entry. A1 emits a structured interaction event only after the 0.4m-0.5m confirmation path.
- A2/A3 image recognition live proof: Rokid image tracking or SLAM observations write to `/api/calibration/observations` and bind to an operator-paired live SDK session.
- SLAM/head tracking heartbeat: pose quality, active anchor, tracking mode, and SDK binding status flow into `/api/device/heartbeat` without serials, MACs, SSIDs, private IPs, or raw camera frames.
- Operator-paired live SDK proof: field acceptance cannot turn green from simulator/manual/package-detected evidence.

## P1 Adoption

P1 means "add after P0 is moving, or build as bounded polish without blocking the live adapter."

- Near/far layout constraints: A1 0.4m-0.5m near-field confirmation, A2/A3 1m+ reading panels, large hit areas, and low-distraction HUD.
- Gesture five-state feedback: hover, touch, press, release, and response, first for A1 and A3 only.
- Spatial audio: user-initiated A2 memory or A3 confirmation audio. No autoplay and no public voice feed.
- GlobalEventUtils / ADB debug: private diagnostic lane only. Do not commit raw logs or device identifiers.
- Controlled TimeMark authoring: local sanitized text/media metadata, AI summary, review/cleaning state, and User B visibility.
- AI semantic compression: summarize and de-noise spatial content; do not turn AI into a generic chatbot or broad guide writer.

## P2 / Reference Only

These ideas are useful but cannot pull effort away from the hardware loop until A1/A2/A3/User B is accepted on real devices.

- `institution_lite_content_compiler`: offline JSON/YAML content compiler for swapping wall content at build time. It is not a live backend.
- Voice commands for bounded operator actions such as open memory, next, write back, and reset demo.
- RKHand deep gesture, spatial drawing, 3D asset library, richer spatial radar, and broader visual polish.
- Account, nearby layers, social interactions, analytics, and platform expansion from the PDF remain reference ideas only.

## Do Not Merge Into P0

- Open UGC, public social feed, public voice upload, personal homepage, likes/comments as a platform, or free spatial graffiti.
- Institution dashboard, operations analytics, account system, live content editor, commercial task system, NPC rewards, or badge economy.
- Broad campus/city route, navigation, nearby map, or arbitrary spatial platform.
- Phone page, website, or PPT as the audience-side primary experience.
- Vendor SDK payload, Unity `Library`, Android build cache, raw logcat, raw hardware ids, serial numbers, MAC addresses, SSIDs, private IPs, contacts, addresses, or pairing codes.

## Current Bus Action

The next implementation checkpoint remains `station_pro_trusted_hardware_session`. The immediate build-hardening slice has advanced: the current Station Pro APK is SHA256 `19733d32b2bdbd347895a319e55a051c7c3722d1329f823baf78ce61e9978955`, includes `assets/RKImage.db`, `librokid_openxr_api.so`, and `libyuv.so`, passes current-APK Station Pro install/launch/operator-pairing smoke, and has aligned target diagnostics, UXR readiness, mutating launch, and A1/A2/A3 target-index preflight.

The bus now moves to the physical trusted-observation pass: run `npm run check:field-live-pass` before scanning, use `npm run field:live-pass:watch` during the A1/A2/A3 target pass, point the live device at A1/A2/A3 targets, produce operator-paired trusted QR/image_tracking observations, complete A2 read -> A3 write-back -> User B readback, and only then allow `/api/field/acceptance` to turn hardware-ready. Current live-pass baseline is one online operator-paired live SDK session and `0/3` trusted A1/A2/A3 anchors; mission/User B/provenance ledger readiness does not override the missing physical observations. `npm run field:live-pass -- --require-trusted --require-mission-loop` must fail until that evidence exists. Gradle mirror/IDM fallback still needs durable non-generated hardening, but it is no longer the immediate runtime blocker.

The bus accepts teammate modules only when they pass these questions:

1. Does it strengthen the one-wall A1/A2/A3/User B Rokid spatial memory loop?
2. Does it reuse Space API, SQLite, shared contract, calibration, field markers, field acceptance, and evidence replay?
3. Does it advance true RKCameraRig/RKInput/PointableUI/image target/SLAM/live SDK proof instead of rehearsal-only polish?
4. Does it preserve the privacy boundary for device ids, network identifiers, chat evidence, and loan/contact information?

If any answer is no, keep it P2/reference until the real hardware loop is accepted.
