# Active Goal

Updated: 2026-07-07 19:24 Asia/Shanghai

Current shiyao-first constraint: the real Rokid hardware is now with teammate `shiyao`, whose branch owns the scan/logo/QR scene discovery and hardware-side interaction polishing. This branch must therefore stop treating local live hardware as the immediate blocker and instead make the concrete A1/A2/A3 scene merge-friendly, spatially richer, and useful after shiyao's entry scene hands off into it. Local work may build localhost/LAN packages, scene data, Unity visuals, web fallback, contracts, and audits, but must not claim live hardware-ready while the device is not locally held.

Current concrete-scene direction: after shiyao's scan/logo entry selects the wall scene, our scene must give users things to do in the real wall context: A1 check-in stamp / hidden-layer opening, A2 memory fragment read and clue collection, A3 TimeMark write-back, and User B readback at the same physical wall position. `data/space_demo.json` `scene_actions` and Unity `RenderSceneActionTasks` are the merge contract for this handoff.

Latest execution slice: `field:operator-plan` is now the lightweight local/LAN operator-plan capture command for the productized field lane. It reads only `/api/field/operator-plan`, writes sanitized `output/field-operator-plan/field-operator-plan-latest.json` and `.md`, and keeps the same P0 boundary: one real wall, A1 entry, A2 read, A3 TimeMark write-back, User B readback, with no guide/PPT/phone-only/open-UGC/backend/route expansion and no hardware-ready claim without physical `/api/field/acceptance`.

Current continuation: `field:acceptance-session` now embeds that operator-plan snapshot into the现场 session report. The wrapper still does not create simulator/manual observations; operator-plan is a read-only phase/blocker guide, and hardware-ready remains gated by trusted A1/A2/A3, A3 write-back, User B readback, and `/api/field/acceptance`.

Current product slice: Unity HUD now loads `/api/field/operator-plan` and displays phase progress, hardware-ready claim guard, first next action, and blocker summary in the glasses/desktop HUD. `server:smoke` also checks the packaged local server against operator-plan, field acceptance, target readiness, and field-live-pass while keeping hardware-ready false for a fresh package.


Latest real-device input checkpoint: the real-device page is now visible, but the virtual remote/hand input is absent, so this is a P0 physical acceptance blocker (`visible_but_no_remote_or_hand`). Unity now exposes a clearly marked `Field Input Assist Rail` for A1/A2/A3, Confirm, Service, Write, User B, and Reload so现场 rehearsal can continue without waiting on hand/remote UI. The assist path is deliberately labeled `operator_assist_rehearsal_not_hardware_ready`, sends `fallback_input_visible`, `operator_assist_input`, `input_blocker`, and `input_acceptance_mode` in heartbeat payloads, and cannot satisfy hardware-ready release gates. Real acceptance still requires trusted RKInput/PointableUI/hand or equivalent live SDK input evidence.

Spatial system checkpoint: the Unity shell is no longer treated as a flat panel stack only. A1/A2/A3 now use depth-layer offsets and a curved `Spatial Memory Depth Ribbon` so the memory-read node can float forward from the wall while entry/write-back sit on separate spatial layers. Continue growing the spatial memory field opportunistically, but keep every growth locked to the single P0 wall and the A1 entry / A2 memory read / A3 TimeMark write-back / User B readback loop: prefer anchored depth, breathing surfaces, route ribbons, focus state, and memory evidence layering over flat UI cards, and do not expand into general spatial navigation.

Demo plan alignment: PR #2 `docs/demo-plan.md` is now the narrative wrapper for the final showing: `Campus Hidden Layer` over one real exhibition wall. It does not replace the current P0 goal. P0 remains one real wall, A1 entry, A2 memory read, A3 TimeMark write-back, and User B readback on the Rokid real-device route. `Whale Cloud Sky Pin` is allowed only as controlled demo extension preview content, not open UGC, merchant dashboards, normal guide scope, phone-page scope, broad routing, or a platform pivot.

Current plan reset from the 2026-07-05 PR #2 teammate note: keep `docs/demo-plan.md` as the demo narrative contract and keep the engineering mainline on true Rokid hardware. The next work is ordered as follows: (1) real input recovery and proof, where Station Pro / RKInput / PointableUI / hand or equivalent SDK input must produce trusted evidence and the operator-assist rail remains rehearsal only; (2) spatial product polish, where A1/A2/A3 grow into a deeper Campus Hidden Layer memory field without leaving the one-wall P0 loop; (3) demo-package hardening, where packaged localhost/LAN releases must include the demo-plan contract, the controlled `SKY_WHALE_CLOUD_001` preview, and guards proving it is not P0 acceptance evidence; (4) field acceptance closure, where trusted A1/A2/A3 observations, A3 write-back, User B readback, and `/api/field/acceptance` are the only route to a hardware-ready claim; (5) Carver long-line audit, where Carver keeps rereading teammate docs/PDFs and checkpoint diffs and writes local findings before major direction changes.

Do not expand the new plan into a general guide, phone-only page, PPT, open UGC feed, institution backend, merchant platform, broad route map, or campus/city navigation product. Sky Pin / Whale Cloud is a controlled future-facing scene after the wall loop, not a scope escape hatch.

## Objective

Long-term execution goal for Rokid "Mirror-See InnerWorld / Campus Memory Wall":

Build the real project framework and delivery chain, not just an environment demo. The final product is a Rokid glasses spatial memory layer opened on top of a real campus exhibition wall. It is not a normal guide app, not a PPT, and not a phone-only page.

## Hardware-Connected Phase

The project has entered the real-device development phase. A Rokid Station Pro is now visible to the Windows development machine over USB ADB as `RG-stationPro` / `stationPro` with Android 12 and an ADB interface. This is the first authoritative hardware evidence for the P0 live adapter lane. Do not record or publish full device serial numbers, USB instance ids, MAC addresses, private IPs, or pairing codes; only sanitized model/status/hash evidence may enter docs, probes, release evidence, or GitHub.

Current P0 is now `station_pro_trusted_hardware_session`: turn this connected Station Pro + Max Pro lane into a reproducible live development path. The next code and ops checkpoints must prove ADB/toolchain detection, operator pairing, Station Pro LAN/USB reachability, APK install/run capability, Unity/AR Studio heartbeat, and trusted A1/A2/A3 observations through the existing Space API, SQLite, mission state, write-back, evidence chain, and field acceptance gates.

The second connected glasses line, identified in UI as Rokid x Bolon, is not the P0 AR Studio runtime unless later evidence proves it exposes the same Station Pro / UXR / RKCameraRig / RKInput / image target / SLAM development path. Treat it as a secondary device lane for future reference, not a replacement for the Max Pro + Station Pro mainline.

Current verified local facts from the strict hardware probe:

- ADB exists at `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`, version 36.0.0, but it is not on PATH in the current shell.
- One Station Pro is visible through two sanitized ADB transports, USB and TCP, both in `device` state with model `RG_stationPro` / device `stationPro`; tooling must select one transport explicitly and avoid raw serial output.
- Windows PnP shows sanitized `RG-stationPro` WPD and `ADB Interface` entries using VID/PID `18D1/4EE2`.
- Android SDK build-tools `36.0.0`, platforms `android-35` and `android-36`, cmdline-tools `latest`, Node, npm, Java, Maven, Unity Hub, and Unity Editor `6000.3.19f1` are present.
- `device-probe` is now bounded against Windows/ADB enumeration hangs: ADB/tool commands and PnP enumeration have internal timeouts, `check:device-probe` has an outer 90s timeout, and probe reports expose timeout flags without leaking raw identifiers.
- `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, `INNERWORLD_OPERATOR_PIN`, and `INNERWORLD_OPERATOR_PAIRING_CODE` are not set in the current shell.
- These facts authorize live-adapter work, but they do not satisfy `trusted_hardware_session`, `ready_for_hardware`, or `hardware_acceptance_ready`.

Current Station Pro live APK checkpoint:

- GitHub was synced first for this slice: branch `codex/rokid-real-device-sync` tracks origin, PR #1 is open/clean, and CI was green before the next hardware work.
- Current authoritative APK fact: `output/unity-android/InnerWorldRokid.apk`, 45,798,669 bytes, SHA256 `5b1d4641616dfc75bee98f1772af5c592820b07ba90c0e38413dff2bdd253029`. It includes `assets/RKImage.db`, `libopenxr_loader.so`, `librokid_openxr_api.so`, and `libyuv.so`; the packaged `libopenxr_loader.so` is verified as the Rokid package loader (`b7e723e8017e`, marker `com.rokid.openxr.runtime`), and the APK metadata contains the `IW_TARGET_*` target-observation diagnostics plus the latest Unity mission provenance payload code for the next physical wall pass.
- The user-reported black-screen launch blocker from the previous APK packaging is fixed at the OpenXR loader level. Before the fix, the APK used Unity's default loader and logcat showed `XR_ERROR_RUNTIME_UNAVAILABLE` plus Khronos runtime broker lookup failures. After the fix, fresh Station Pro launch evidence for `5b1d4641616d...` has `xr_runtime_unavailable=0`, `runtime_broker_failed=0`, `fatal=0`, and Rokid runtime manifest/load success.
- Remaining display blocker: Station Pro smoke proves the app process and Rokid runtime path, but `dumpsys display` still only exposes the internal display and runtime logs include `getGlassName failed: glass not detected` / head-pose failures. The current diagnostics now sharpen this into a Station Pro -> glasses display-session blocker: `rokid_display` sees USB display/device presence but `dsp_connected=false`, and the Station USB role is device/MTP toward Windows rather than a glasses-ready host/display path. Treat this as the next glasses/external-display detection lane; do not mark hardware-ready from the loader fix.
- The display blocker is now a first-class gate. `station:apk:smoke` clears logcat before launch, records sanitized `dumpsys display` summaries plus runtime pattern counts, chooses one ADB transport when USB/TCP duplicate transports exist, and keeps raw dumpsys/logcat out of evidence. Fresh evidence shows `install_run_smoke=true`, `external_display_detected=false`, `internal_only=true`, `rokid_runtime_loaded=true`, `runtime_unavailable_detected=false`, selected ADB transport recorded, and `glass_name_failure_count=2`. `station:apk:display-smoke` is the strict glasses-display command and currently fails correctly with `rokid_glasses_display_not_detected`.
- A read-only diagnostic layer now exists as `station:glasses:diagnose` / `station:glasses:require-ready`. Current evidence says the Rokid/OpenXR package and runtime service are present, runtime signals are active, input/USB have Rokid-like candidates, but Android display enumeration remains internal-only. The active blockers now include `rokid_display_dsp_not_connected` and `station_usb_role_device_mode_blocks_glasses`. The next physical task is therefore Station Pro -> Max/HDMI/glasses display detection, Station USB role/display path correction, and head-pose health, not another APK/package rebuild.
- Current APK target-index preflight is green: package gates now parse `assets/RKImage.db/Data.json` from the APK and require `innerworld-rokid-target-index-map/v1` with `1:A1`, `2:A2`, `3:A3` before target/image-tracking evidence can be accepted. This prevents a package with the wrong target map from reaching field acceptance, but it is not physical target observation.
- Current Station Pro proof for that exact `5b1d4641616d...` SHA is green for APK smoke: install OK, cold launch OK, process observed, `is_uxr_app=true`, and the launch evidence includes no raw pairing code, raw session id, raw serial, raw USB id, private IP, or MAC address. Pair-smoke can still report an operator verification race, so use the Space API live-session snapshot before claiming operator-paired readiness for a field pass.
- Current live-pass snapshot after the 2026-07-04 17:51 current-APK pair smoke proves the operator-paired live SDK session window is open (`live_session_ready=true`, one online live operator-paired session). Current ledger/provenance can report `mission_ledger_ready=true`, `user_b_readback_ready=true`, and `trusted_mission_provenance_ready=true`, but `mission_loop_ready=false`, `trusted_a1_a2_a3_ready=false`, `hardware_a1_a2_a3_ready=false`, and `field_acceptance_ready=false` until fresh trusted A1/A2/A3 observations exist.
- Current live-pass watch now also reports missing trusted anchors, missing raw hardware anchors, missing mission steps, and operator-facing next actions. The current baseline is: trusted A1/A2/A3 `0/3`, raw hardware alignment missing `A1`, A2/A3 requiring re-scan or re-bind through the operator-paired live SDK session, and `mission_loop_waiting_for_trusted_a1_a2_a3` even though the mission ledger/User B/provenance side is complete.
- Current field live/target reports also expose per-anchor untrusted hardware diagnostics from `/api/calibration/wall`: sanitized tracking mode, observation issue codes, hardware-session trust issue codes, SDK binding stage, and pairing/session status snapshots. This is only an operator debugging aid; it does not turn A2/A3 into trusted evidence and does not relax the hardware-ready boundary.
- Current Unity trusted target path now has a rescan barrier: if an A1/A2/A3 target event arrives before the server acknowledges the same session as operator-paired, hardware-eligible, and input/overlay/live SDK-bound, Unity queues the latest event for that anchor and retries after heartbeat ack. This prevents startup timing from dropping physical scans, while `/api/calibration/observations` and `/api/field/acceptance` remain the source of truth.
- Current field reports show the latest operator-paired session is `live_binding_ready` with no adapter checklist gaps. The remaining physical action is a fresh A1/A2/A3 scan under that current live adapter session, then A2 read, A3 TimeMark write-back, and User B readback.
- Current post-smoke checks are green for package/readiness/live-window evidence: `check:station-apk:rkimage`, `check:uxr-readiness:ready`, `check:field-live-pass`, `check:field-target-pass`, `check:unity`, `check:contract`, `check:mainline`, and `context:export`. The strict field target gate still fails correctly on missing trusted A1/A2/A3 and `mission_loop_waiting_for_trusted_a1_a2_a3`.
- Current Unity/field-watch diagnostics now expose stable `IW_TARGET_*` log tokens for the next physical wall pass: target event received, unknown image index, live-pairing/session gate reason, throttle, POST start/result/failure, and mission-assist outcome. `field:live-pass:watch --logcat` counts these tokens only as diagnostics and still writes no raw logcat, pairing codes, session ids, serials, private IPs, or MAC addresses.
- Current `field:target-pass` also records a `target_diagnostics_preflight` guard. It verifies the current APK SHA prefix, APK `IW_TARGET_*` token scan, latest mutating Station Pro launch evidence, UXR readiness, and APK target index map all match before strict physical acceptance. The preflight must be refreshed against the current `5b1d4641616d...` APK before the next physical wall pass; strict acceptance still correctly blocks on missing trusted A1/A2/A3 observations and the P0 mission/User B loop.
- Current target reports now split evidence freshness from physical acceptance: `precheck_ok=true` can mean APK/session/diagnostics are aligned, while `physical_acceptance_ready=false` and `physical_blockers` still show missing trusted A1/A2/A3, mission/User B loop, and field acceptance. This prevents a green precheck from being read as hardware-ready.
- Current live/target Markdown reports now expose the mission split at the top: `mission_ledger_ready`, trusted A1/A2/A3 prerequisite readiness, missing trusted anchors, and trusted mission provenance. The runbook fail-fast list includes `mission_loop_waiting_for_trusted_a1_a2_a3`, so现场 operators do not treat a completed ledger as physical acceptance.
- Current Web/operator console also exposes this split through read-only `/api/field/target-readiness`, derived from `/api/field/acceptance`. It shows `precheck_ok`, `physical_acceptance_ready`, trusted A1/A2/A3 count, mission/User B state, and blockers, but it does not read `output/*.json`, run ADB/logcat, create simulator/manual observations, or mutate mission/write-back state. Hardware Runtime now calls wall-lock evidence a lock candidate, not final hardware readiness.
- Current productization checkpoint adds a read-only `/api/field/operator-plan` and Web Field Pass panel as the现场 P0 command center. It turns the commercial flow into six explicit phases: preflight, A1 spatial entry, A2 memory read, A3 TimeMark write-back, User B readback, and closeout. The endpoint is in the shared endpoint map, Unity DTO/API client, Web console, and contract checks. It is read-only, privacy-sanitized, and cannot make a hardware-ready claim; it only tells the operator the next action and blockers before the strict field pass.
- Carver reviewed pushed commit `f440a388` in `.agents/carver/carver-f440a388-adb-display-diagnostics-audit-2026-07-04.md`. It confirmed no hardware-ready overclaim and agreed the main branch should now prioritize a commercial P0现场 product package: operator flow, local/LAN run package, release gates, and Unity/Web P0 status experience while keeping the real A1/A2/A3 -> A3 TimeMark -> User B loop as the only acceptance path.
- Current Unity heartbeat now carries a sanitized RKInput/PointableUI `input_frame` from `RokidInputFrame`: source, sequence, command/buttons, focused A1/A2/A3 anchor, hit distance, `ray_reported`, and `pointable_ui_focus`. The Space Server stores only the summary in device health/sessions and uses it for the `rk_input_3dof_ray` checklist check; raw ray vectors and raw pose streams stay out of API summaries.
- This input-frame checkpoint is live-adapter observability only. Hardware-ready remains false until fresh operator-paired trusted A1/A2/A3 observations, A3 TimeMark write-back, User B readback, and `/api/field/acceptance.ready=true` are all present.
- Current mission/write-back loop now has `trusted_mission_provenance_gate/v1`: A2 read/find_year, service action, A3 TimeMark write-back, and User B readback can satisfy `mission_loop` only when the server derives trusted proof from the current online operator-paired live Rokid session, live/input/overlay SDK binding, sanitized input-frame ray/focus, and confirm input over the action anchor.
- Current scripts/manual/simulator can still rehearse mission state, but they cannot make `mission_loop_ready` true or hardware-ready without trusted mission provenance plus trusted A1/A2/A3 physical observations. Strict target pass now reports provenance and trusted-physical blockers separately.
- Current field session wrapper has target-pass entrypoints: `field:acceptance-session:target` for the on-site precheck/watch and `field:acceptance-session:target-strict` for the final strict A1/A2/A3 -> A3 TimeMark -> User B closeout. The strict command is expected to fail until the real wall pass completes.
- Current `field:target-pass:apply` now requires current online operator-paired live session/device/anchor provenance inputs plus RKInput ray, PointableUI focus, target active-anchor match, and confirm evidence before it posts A2 read/find_year, controlled service action, A3 TimeMark, or User B readback. Reports expose only sanitized `provenance_input` summaries with hash prefixes, readiness, blockers, and input-confirm status, not raw session/device ids.
- Current `field:target-pass:watch` is the preferred one-command companion during the physical scan. It is read-only by default, samples repeated API/phase snapshots, and counts `IW_TARGET_*` logcat diagnostics without writing raw logcat; zero counts mean the glasses have not yet produced target events during the watch window.
- Current Unity build wrapper is hardened after live rebuilds exposed post-Unity hangs: `tools/build-unity-android.ps1` external checks now run through a direct timeout-bounded .NET process wrapper, capture stdout/stderr without PowerShell Job hangs, expose `timed_out` / `timeout_seconds`, and `-SkipUnityBuild -RunPostChecks -RequirePostCheckDevice` refreshes build evidence for the current APK without rebuilding `RKImage.db`.
- Current field acceptance runner now has a local/LAN executable wrapper: `npm run field:acceptance-session` records device probe, APK inspect, endpoint snapshots, and a single live-pass without creating simulator/manual observations; `npm run field:acceptance-session:live` adds the explicit mutating pair-smoke plus live watch for the physical target pass. The latest default runner pass is green as a precheck, with `hardware_ready_claim_allowed=false`.
- Field acceptance now explicitly requires User B readback. A completed read/service/write-back sequence cannot set hardware acceptance unless `/api/state.active_user` is `B` after an A3 write-back beacon exists.
- Historical note: the 22:18 `ce3f...`, 21:05/22:01 `70592...`, 2026-07-04 12:29 `bd852...`, 2026-07-04 14:31/15:25 `e447...`, 2026-07-04 16:17 `9ddf...`, and 2026-07-04 17:55 `19733...` APK facts are superseded by the current `5b1d4641616d...` APK and must not be used as the current next proof. The old `fallback_only`/unpaired boundary describes earlier evidence, not the current APK smoke/live-session state.
- Hardware-ready remains false. The next mainline gap is not current-APK launch or pairing; it is the physical target pass: trusted A1 QR plus A2/A3 image-tracking observations, A3 TimeMark write-back, User B readback, and `/api/field/acceptance` green under `field:live-pass -- --single --require-live-session --require-trusted --require-mission-loop`.

Current non-mutating APK evidence:

- `npm run station:apk:inspect` reads the Android fallback APK without installing it.
- `npm run check:station-apk` passes and verifies package `com.innerworld.rokid.prototype`, launchable activity `com.unity3d.player.UnityPlayerGameActivity`, min SDK 25, target SDK 36, manifest network flags, and embedded `innerworld_campus_wall` config.
- Non-mutating Station Pro checks now read `station-pro-apk-smoke-latest-inspect.*` and assert `evidence_kind=inspect_only`, so a later `station:apk:pair-smoke` cannot make package gates consume mutating install/launch evidence.
- Earlier direct Gradle rebuild completed after adding Aliyun Maven mirrors to Unity's generated Gradle `settings.gradle`: `:launcher:assembleRelease` succeeded and `launcher-release.apk` was copied to `output/unity-android/InnerWorldRokid.apk` (24,752,749 bytes). This is historical LAN package evidence; the current disk APK is now the 45,798,669-byte `5b1d4641616d...` artifact recorded above.
- Latest LAN preflight on 2026-07-03 20:12 Asia/Shanghai restarted the Space Server in LAN mode, updated Unity config to a private-LAN URL, and kept reports/stdout redacted.
- `npm run station:apk:patch-lan` created a config-only, zipaligned, debug-signed APK with v2 signature verification. `npm run check:station-apk:lan` now passes with `config_host_kind=private_lan` and `network_ready_for_device=true`.
- Latest `npm run station:apk:inspect` and `npm run check:station-apk:lan` pass with `config_host_kind=private_lan`, `network_ready_for_device=true`, and the same host hash as the current Unity source config after `field:preflight -- -RequireLan`.
- Earlier `npm run station:apk:smoke` attempts installed but failed to launch with error `102` because `is_uxr_app=false`; that history is now a regression guard, not the current state.
- Current boundary: the project has LAN-ready APK/package/install/run evidence and a real Space API heartbeat from Station Pro. It still has no official UXR/OpenXR live SDK binding, no operator-paired trusted A1/A2/A3 hardware observations, and no field acceptance.
- User preference for dependency failures: use IDM as the download fallback for Maven/Gradle URLs when mirrors do not resolve the issue, then place artifacts in a controlled local cache/repo. The mirror patch worked this time, but it currently lives in generated Unity output and must be codified before the next clean export.

Current UXR live-binding instruction:

- Do not spend the next slice on plain Unity fallback polish. The current APK already has its own Station Pro install/launch/operator-pairing smoke; the next proof is trusted physical A1/A2/A3 plus A3 write-back and User B readback.
- Install/validate `com.rokid.xr.unity`, run Rokid Environment Fix, OpenXR Feature Groups, and Project Validation, then bind RKCameraRig, RKInput 3DoF ray, PointableUI/PointableUICurve, A1/A2/A3 image targets, SLAM/head tracking heartbeat, device pairing, live heartbeat, and field acceptance to the existing Space API/SQLite contracts.

## Teammate Docs Adoption Ledger

Carver reviewed teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` again during the real-device phase. The durable adoption record is `docs/teammate-docs-bus.md`; use that document as the bus whenever a worker or future compressed context needs to decide whether teammate files can enter the mainline.

`docs/design.md`, `docs/rokid_sdk_docs.md`, `docs/rokid_sdk_docs_full.md`, and `docs/策划案.pdf` are actionable only through the current one-wall A1/A2/A3/User B mainline. Now that Station Pro is visible over sanitized ADB, P0 adoption is: UXR3.0 SDK project validation, RKCameraRig, RKInput 3DoF ray, PointableUI, A2/A3 image target library, SLAM/head tracking heartbeat, operator-paired live SDK proof, and trusted calibration observations through the existing Space API / SQLite / field acceptance gates.

P1 adoption is: near/far AR layout constraints, A1 0.4m-0.5m confirmation polish, low-distraction radar/HUD, gesture five-state feedback for bounded controls, user-initiated A2/A3 spatial audio, controlled TimeMark authoring, and AI semantic compression.

P2/reference only: open UGC, institution dashboard, public social feeds, personal homepage, broad campus/city route, NPC reward layer, commercial task system, spatial drawing tools, and full content editor. These cannot compete with `station_pro_trusted_hardware_session` until the real A1/A2/A3 hardware loop is accepted.

## Carver Source Review

Carver completed the requested full-read source audit for the real-device phase. The durable record is `docs/carver-source-review.md`.

Fresh re-audit requested on 2026-07-03 19:40 Asia/Shanghai completed in `.agents/carver/`. The final record is `.agents/carver/source-audit-2026-07-03.md`; Carver rendered `docs/策划案.pdf` into 13 page PNGs, smoke-rendered 19 raw PDFs, and confirmed the root proposal PDF is readable with `pypdf`/`pdfplumber`.

Fresh Carver source/PDF audit requested on 2026-07-04 12:31 Asia/Shanghai completed in `.agents/carver/carver-source-audit-2026-07-04-1231.md`. It confirms 19 target PDFs were readable with PyMuPDF text extraction and restates the mainline: real Rokid hardware, one real campus wall, A1 entry, A2 memory read, A3 TimeMark write-back, and User B readback. It explicitly says current package/probe/pairing/live-session evidence is not hardware-ready without trusted physical A1/A2/A3 plus the User B loop.

Carver's important PDF correction: old `analysis/extracted_attachments/**/pdfinfo.txt` files are mostly broken Poppler-wrapper output, not reliable metadata. Future PDF page counts or encryption checks should use `pages.json` or the real Poppler executables under `C:\Users\33516\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin`.

Key results:

- Group uploads are covered by extracted text artifacts. The 18 recovered PDFs all have `text.txt`; the main PDF set also has `pages.json` and `pdfinfo.txt`, and most have `tables.json`.
- `docs/策划案.pdf` is represented by the final #249 proposal extraction for content-level work. If visual fidelity becomes a claim, render all 13 pages to PNG and inspect/OCR before citing layout details.
- The product direction remains one real campus memory wall: A1 entry, A2 memory read, A3 TimeMark write-back, and User B readback.
- Current evidence proves only sanitized Station Pro ADB visibility and APK inspectability. It does not prove live SDK binding, trusted hardware session, or field acceptance.
- Next work should stay on `station_pro_trusted_hardware_session`: official UXR package validation, LAN APK rebuild, Station Pro install/run, live heartbeat, operator-paired SDK session, A1/A2/A3 trusted observations, and `/api/field/acceptance`.

## Carver Mainline Lock

Rokid InnerWorld / 镜见的长期目标是：Rokid 眼镜在真实校园展墙上打开一层可读、可写、可复访的空间记忆层。P0 只服务一面可控校园展墙上的 A1/A2/A3 三锚点闭环：A1 入口打开空间层，A2 读取校园记忆/任务线索，A3 写回 TimeMark，并让后来者 User B 在同一空间看到新增记忆。

This is not a normal guide app, PPT, phone-only page, broad campus map, open UGC social product, or institution dashboard. Web is the operator console and rehearsal surface; Unity/Rokid is the audience-facing spatial runtime.

Current next P0 checkpoint: `station_pro_trusted_hardware_session` under `real_rokid_live_adapter_execution`. RKCameraRig, RKInput 3DoF ray, PointableUI, A2/A3 image target library, SLAM/head-tracking heartbeat, overlay rendering, and operator-paired live SDK proof must be wired into the existing Space API / SQLite / calibration / mission contracts before Web expansion, institution backend, open UGC, broad route systems, or design-document P2 ideas can compete for priority.

The Windows localhost/LAN Space Server, Web operator console, Unity fallback, SQLite, field kit, release package, AI HUD contract, write-back loop, and field acceptance remain the rehearsal and operator foundation. Now that hardware is connected, Rokid / AR Studio replaces only input and display: RKCameraRig, RKInput 3DoF ray, PointableUI, image target tracking, SLAM/head tracking, and overlay rendering bind into the existing Space API, SQLite, mission state, service actions, write-back, AI HUD schema/prompt, evidence chain, and field acceptance gates.

Never claim hardware readiness from simulator/manual observations, print-kit readiness, or `ROKID_UXR` boundary compilation alone. Hardware acceptance requires operator-paired live SDK session proof plus trusted A1/A2/A3 observations through QR/image_tracking/SLAM.

## Final Agreed Direction

- A Windows host is the field control machine.
- The Windows host runs localhost/LAN Space Server, Web demo, Unity fallback, AI contract, write-back loop, field status panel, release packages, and evidence generation.
- Before hardware arrived, localhost and LAN were the source of truth.
- Now that hardware is connected, localhost and LAN remain the rehearsal/operator foundation while Rokid / AR Studio replaces only input and display after live proof passes.
- The data contract, mission state machine, service actions, write-back flow, AI schema/prompt, and evidence chain stay the same across Web, Unity fallback, Android fallback, and Rokid hardware.
- Production-shaped modules are pulled forward immediately. Do not defer stable storage, device runtime, deployment automation, or sync automation as "later"; build the final local/server shape now, then harden it.
- SQLite is the authoritative local/field store now (`data/innerworld.sqlite`) for runtime state, safe dataset catalog, device sessions, and bounded device events. It is not a disposable prototype database.
- SQLite backups are a first-class runtime operation now: use `npm run db:backup`, `npm run db:backup:list`, and `npm run db:backup:verify` to create private SHA256-verified snapshots under the guarded backup root before release, restore, or server handoff work.
- Server upload/deployment keeps the same Space API, mission state, write-back, device runtime, and SQLite-backed store contract. Treat a server move as a hosting/deployment boundary, not a product data-contract rewrite.
- Do not describe the storage plan as "temporary" or "later swap databases." If remote replication or backup is added, it must preserve the same contract and sanitized evidence boundary.
- Raw private evidence remains outside the database/API unless explicitly sanitized.
- Field delivery should show a real spatial wall experience: A1 entry poster, A2 memory beacon, A3 write-back point, mission progress, service action, and User B seeing the new write-back beacon.

## Current Build Phase

Move from "environment and demo loop are runnable" to "main project framework and bulk implementation":

- Shared API/device contract.
- Mission state machine and runtime store.
- SQLite-backed dataset storage and safe dataset call layer.
- Server core modules instead of one large server file.
- Device bootstrap and AI contract checks.
- Physical wall calibration contract and observation store for A1/A2/A3 marker lock.
- Field marker manifest/API/PDF checks for printable A1/A2/A3 cards.
- Web device/ops panel.
- Unity/Rokid protocol client.
- Rokid simulator and integration checks.
- Compile-safe Rokid SDK adapter boundary with `ROKID_UXR` as the only future SDK compile symbol.
- Localhost-first server release and deploy dry-run chain.
- Printable field kit and release evidence.

## Hardware-Independent Long Modules

While waiting for physical hardware, SDK account access, or live Rokid package binding, long-running worker agents may advance difficult modules that can be completed on localhost/LAN, SQLite, Web operator console, and Unity fallback without changing the final product direction.

P0.5 modules:

- `a1_spatial_entry_experience`: A1 lock state, spatial recognition frame, 0.4m-0.5m deliberate confirmation, entry transition, HUD/heartbeat fields, and Web operator observation. This must feel like the Rokid glasses opening a layer on the real wall, not a phone scan page or Web reveal.
- `story_graph_mission_runtime_v2`: model A1 entry, A2 memory read, A3 write-back, and User B readback as a controlled spatial task graph backed by Space API and SQLite. It must stay scoped to one wall and three anchors, not a broad campus route or task platform.
- `evidence_replay_judge_mode`: create a sanitized replay chain proving A1 -> A2 -> A3 -> User B, SQLite write-back, field acceptance, and release evidence. This is for competition judging and field proof, not an institution analytics dashboard.

P1 modules:

- `premium_unity_spatial_shell_2`: strengthen radar, anchor halo, route, near/far layout, transition states, overlap protection, performance budgets, and low-noise motion in Unity fallback so the audience runtime reads as a polished spatial product.
- `controlled_timemark_authoring`: make A3 write-back richer but still bounded: local sanitized text/media metadata, review/cleaning state, User B visibility, and AI semantic compression. This is not open UGC social, public voice upload, or a personal homepage.
- `ai_hud_contract_hardening`: version AI schemas/prompts, add fixtures and negative tests, keep AI as a spatial task interpreter and content reducer rather than a chatbot or generic guide writer.

P2 reference modules:

- `institution_lite_content_compiler`: offline JSON/YAML-to-space compiler for changing wall content at build time. It is not a live institution backend, account system, or operations dashboard.
- `spatial_audio_gesture_feedback_pack`: controlled A2 memory or A3 confirmation audio and gesture-state feedback. Audio must be user-initiated, never autoplaying UGC.

All of these modules must answer yes to the same mainline test: they strengthen the one-wall A1/A2/A3/User B Rokid spatial memory loop, reuse the existing Space API / SQLite / shared contract, and avoid parallel state models. Simulator/manual/local rehearsal remains rehearsal only and must never be counted as hardware readiness.

Each module must ship with at least one regression check or release/evidence assertion before it can be marked complete; visual polish alone is not enough for mainline acceptance.

## Current Checkpoint

- 2026-07-03 23:14-23:17 Asia/Shanghai checkpoint: current Station Pro APK is `output/unity-android/InnerWorldRokid.apk`, SHA256 `bd852f7012e25f9ccd2630e2113a1a3526fc7bdfea5d05c32d56c410303fe142`, 45,719,155 bytes.
- Build lane is now `unity_batchmode_generated_gradle_native_repack`: Unity batchmode may build first, but if the APK lacks `librokid_openxr_api.so` or `libyuv.so`, the script stages those libraries from the Rokid OpenXR AAR into Unity's generated Gradle `jniLibs` and reassembles the APK. Missing Rokid native libs fail the build/gate.
- Current package evidence is green for LAN, `assets/RKImage.db`, and `arm64-v8a` native libs: `libopenxr_loader.so`, `librokid_openxr_api.so`, and `libyuv.so`.
- Current Station Pro mutating smoke is green for install, cold launch, process observed, `is_uxr_app=true`, and operator pairing verified. After clearing logcat and relaunching, `DllNotFoundException`, `rokid_openxr_api`, and `UnsatisfiedLinkError` counts are zero.
- Current live monitoring checkpoint: `npm run field:live-pass` records an online operator-paired live SDK session, but trusted A1/A2/A3 is still `0/3`, mission/User B loop is incomplete, and `/api/field/acceptance` remains `rehearsal_ready`.
- Boundary remains strict: `check:uxr-readiness:ready` is green for minimal UXR project/package state, but hardware-ready is still false. `/api/field/acceptance` remains `rehearsal_ready` because trusted A1/A2/A3 observations and the live P0 mission/write-back/User B loop have not passed on the real wall.
- Next physical pass: run `npm run field:live-pass` or `npm run field:live-pass:watch` while pointing Station Pro/Rokid at printed/displayed A1/A2/A3 targets. Unity maps image index 1/2/3 to A1/A2/A3, posts A1 as `qr`, A2/A3 as `image_tracking`, and the server only trusts those posts when tied to an operator-paired live SDK session.

- Latest implementation checkpoint: the project now has a Field Acceptance runtime bus that turns the field marker/calibration/release/hardware state into one executable site gate contract.
- `/api/calibration/wall` exposes the A1/A2/A3 wall coordinate system, expected poses, marker types, and acceptance thresholds.
- `/api/calibration/observations` accepts sanitized Unity/Rokid calibration observations and persists them in SQLite.
- `/api/field/markers` exposes the printable A1/A2/A3 marker runtime manifest derived from `data/field_markers.json` and `/api/calibration/wall`, including marker id/type, tracking modes, expected pose, operator action, and evidence source.
- `/api/field/acceptance` exposes the authoritative site gate manifest derived from field markers, wall calibration, mission state, SQLite ledger, ops/release status, and the applied Rokid hardware manifest.
- `npm run check:field-markers` verifies the marker manifest, wall calibration binding, and PDF/HTML searchable marker tokens; it is wired into `verify:release` after `pdf:fieldkit`.
- The Java/OpenHTMLToPDF field kit now renders A1:qr-entry, A2:image-target, and A3:image-target printable cards with QR/public URLs, expected poses, and evidence sources; visual PDF inspection has confirmed the cards do not overlap or clip.
- Web/operator console now fetches `/api/field/markers` with wall calibration, renders A1/A2/A3 marker cards with marker id/type, tracking modes, and expected pose, and separates `print kit ready/pending`, `simulator rehearsal`, and `hardware ready/pending`.
- Web/operator console now fetches `/api/field/acceptance` and renders Field Acceptance / Site Gates for `print_kit`, `simulator_rehearsal`, `hardware_alignment`, `mission_loop`, `sqlite_evidence`, `release_chain`, and `hardware_kit`; the panel explicitly states that simulator/manual is not hardware ready.
- Kepler P0 field acceptance fix is applied: `hardware_acceptance_ready` requires print kit, hardware alignment, mission loop, SQLite evidence, release chain, and hardware kit to be ready; `ready: true` cannot coexist with missing print-kit or SQLite evidence blockers.
- Web/operator console now has an executable Wall Calibration panel: it refreshes the manifest, shows A1/A2/A3 marker/pose/latest observation status, surfaces `ready_for_hardware`, distinguishes `SQLite/API authoritative`, `simulator rehearsal`, and hardware evidence candidates, and can submit simulator observations through the same API used by future Rokid QR/image tracking/SLAM.
- Unity fallback/controller now fetches the wall calibration manifest and `/api/field/markers` during startup after bootstrap and before device registration, then posts a simulator observation through `/api/calibration/observations`; the `C` key / `Calib` button posts a manual rehearsal observation through the same route. HUD/log/heartbeat expose schema, anchor count, readiness, calibrated anchor IDs, field marker ids/tracking modes, active marker expected pose, and the latest observation status/issues.
- Kepler P0 calibration fixes are applied: calibration `session_id`, `device_id`, and notes are redacted; `ready_for_hardware` is based on each anchor's latest QR/image tracking/SLAM hardware observation so simulator/manual rehearsal cannot claim hardware readiness and a later rejected/stale observation cannot be hidden by older accepted history.
- Kepler P0 field marker readiness fix is applied: SQLite summary now exposes `rehearsal_ready`, `hardware_calibrated_anchor_count`, `hardware_calibrated_anchor_ids`, and `hardware_tracking_modes`; Web/Unity read hardware-specific fields, and `check:store` proves all-simulator accepted observations cannot set `ready_for_hardware`.
- The newly added Rokid SDK/design docs are now treated as actionable input to the mainline: RKCameraRig/RKInput/RKHand/PointableUI/image tracking/SLAM/visual layout rules enter through the adapter boundary, calibration API, and existing Space API instead of creating a parallel product direction.
- Unity controller now enters hardware/fallback selection through `RokidAdapterResolver.Resolve(...)`.
- `IRokidInputStateSink` keeps base URL, connection status, and anchor-hit state flowing through both fallback and future hardware adapters.
- `RokidUxrInputSource.cs` and `RokidUxrOverlayRenderer.cs` are fully wrapped in `#if ROKID_UXR`; no vendor SDK payload is committed.
- Current follow-up implementation checkpoint: `RokidSdkBindingProbe` and backend `sdk_binding_status` distinguish `boundary_compiled`, `package_detected`, and `live_binding_ready` instead of treating the stub as hardware-ready.
- Web/operator console now surfaces SDK binding readiness as local fallback, `ROKID_UXR` boundary, or real SDK live-bound; simulator sessions are evidence but do not claim hardware binding.
- Checks now require the adapter boundary and SDK binding readiness distinction in `check:mainline`, `check:contract`, `check:unity`, `check:device`, and `check:web`.
- Checks now also require Web and Unity to actively consume wall calibration and field marker runtime data, Web to display latest-observation evidence/rejected issues and field marker cards, Unity to POST observations, Unity to GET/parse `/api/field/markers`, and `check:store` to prove latest rejected observations block hardware readiness.
- Checks now also require `/api/field/acceptance`, `innerworld-field-acceptance/v1`, gate separation, top-level hardware tracking modes, Web Field Acceptance rendering, an all-simulator negative guard, and a required-gate-pending negative guard through `npm run check:field-acceptance`.
- Unity now actively consumes `/api/field/acceptance` as runtime data, not only DTO/endpoint shape: startup, `LoadRuntimeServiceContracts()`, and post-calibration refresh all GET/parse `FieldAcceptanceManifest`, then expose gate status, blockers, next actions, hardware evidence count, and simulator/manual guard through HUD, target debug, input status, and `sdk_binding_status.message`.
- `check:unity` now requires Unity to consume field acceptance in runtime detail, target, input, and heartbeat; `verify:release` now runs `npm run check:field-acceptance -- --api` after field markers to cover the live localhost endpoint.
- Kepler reviewed the field acceptance consumption checkpoint and returned OK on direction, with the next required checkpoint set to `trusted_hardware_session` / `sdk_live_binding`: before true hardware acceptance, hardware-mode observations must be tied to a real Rokid SDK live session instead of trusting a script-posted tracking mode.
- Current implementation checkpoint completed: `trusted_hardware_session` / `sdk_live_binding` is now enforced in code. Hardware-mode calibration observations must carry server-derived proof from a live Rokid SDK device session before they can count toward `ready_for_hardware` or `hardware_acceptance_ready`.
- `resolveHardwareObservationProof` checks session online state, heartbeat, health, pose, active anchor, SDK boundary/package/input/overlay/live binding readiness, and stores trusted/untrusted evidence in the calibration record. Raw QR/image tracking/SLAM mode alone is only hardware-mode alignment evidence.
- SQLite summary now computes trusted hardware anchor/session counts separately from raw hardware-mode observations; old stored calibration acceptance payloads are sanitized on read so previous test records cannot leak token/IP/SN/SSID/MAC strings through summaries.
- Kepler reviewed the SDK binding readiness checkpoint and returned OK to commit/push after the `sdk_binding_status` redaction blocker was fixed.
- Current implementation checkpoint in progress/completed for this phase: `operator_issued_device_pairing`. The Space Server now exposes `/api/device/pairing` so an operator can issue a short-lived one-time code before a real device registers.
- Device registration consumes a valid pairing code and marks the session as `operator_paired`; bad codes return 403, used codes cannot be reused, unconsumed codes expire on TTL or service restart, and the plain code is never persisted to SQLite, snapshots, manifests, public summaries, or browser storage.
- Web/Unity fallback sessions may remain unpaired for rehearsal and protocol testing, but trusted hardware proof and `trusted_hardware_session` acceptance now require `operator_paired_session`; otherwise `device_not_operator_paired` blocks hardware readiness.
- The Unity protocol contract, shared endpoint map, Web operator console, field acceptance gate, SQLite trusted-evidence fallback, and regression checks now all understand device pairing status and hardware acceptance eligibility.
- Current follow-up checkpoint: `operator_pairing_gate_and_unity_consumption`. Pairing issue is no longer an open LAN action: loopback Windows host can issue codes by default, while non-loopback LAN issue requests must pass `INNERWORLD_OPERATOR_PIN`; failures return `device_pairing_operator_gate_failed`.
- Operator PINs and pairing codes are never echoed or persisted. Pairing events and manifests expose only the operator gate policy/result, not the secret.
- Unity now has a real pairing-code consumption path: `operatorPairingCode` is non-serialized runtime memory fed by `INNERWORLD_OPERATOR_PAIRING_CODE`, `--innerworld-pairing-code`, or runtime code, normalized to `ABCD-EFGH`, sent as `DeviceRegisterRequest.pairing_code`, and represented in HUD/runtime/input/log output only as pairing status.
- Checks now prove the operator gate for loopback/non-loopback/PIN cases and prove Unity submits `pairing_code` without logging or persisting the plaintext code.
- Current implementation checkpoint completed: `image_target_assets_and_premium_unity_shell`. Kepler reviewed the teammate files and confirmed the immediate P0 gap was the A2/A3 image target asset chain plus a less debug-like Unity spatial shell.
- `data/field_markers.json` now declares A2/A3 `image_target_asset` metadata with asset id, source path, SHA256, physical print size, DPI, print version, Unity target-library status, and Rokid XR Extension import status.
- `data/field-targets/a2-memory-beacon-target.svg` and `data/field-targets/a3-writeback-target.svg` are public, hash-checked source assets for the future Rokid image target library. `/api/field/markers` exposes them with `/api/field/assets/<file>` URLs.
- `check:field-markers` now verifies image target asset presence, file existence, SHA256, physical dimensions, DPI, print version, and Unity/Rokid import status for A2/A3. API mode also fetches live A2/A3 asset URLs and verifies `image/svg+xml` responses plus path-traversal rejection.
- Unity fallback now has a premium spatial shell layer: operator rail, active target card, radar strip, A1/A2/A3 spatial route, animated anchor halos/stems, compact image target asset status, and AR shell state/metrics. The old long debug lines remain in heartbeat/runtime contract paths, but the visible shell no longer depends on one crowded panel.
- The Unity runtime state now carries `ar_shell` state for spatial entry, image target lock quality, discovery/radar layer, writeback readiness, and operator-safe device mode. `InnerWorldDemoController` applies `RokidPresentationStrategy` to this state so desktop fallback, on-site display, and future Rokid hardware share the same status language.
- The default localhost server on `http://localhost:5177/` was restarted onto the current code after a stale node process exposed an old bootstrap without `device_pairing`.
- Carver's next recommended P0 is now recorded as an executable real Rokid adapter checklist in `docs/rokid-device-integration.md`: bind RKCameraRig, RKInput 3DoF ray, image tracking target library, SLAM/head tracking heartbeat, PointableUI handoff, overlay rendering, and hardware proof to the existing adapter boundary without changing Space API or SQLite contracts.

## Confirmed Applied Hardware

- Rokid Max Pro, model RA202, blue-black, quantity 1.
- Rokid Station Pro, model RAS201, blue-black, quantity 1.
- Interpreted target kit: Rokid AR Studio.
- Borrow deadline in the loan agreement image: 2026-08-31.
- Product fit: no issue. This is the right hardware lane for the final "campus memory wall spatial layer" direction because AR Studio is the Max Pro glasses plus Station Pro host path for YodaOS-Master spatial computing.
- Rule: do not publish recipient details, phone numbers, addresses, serial numbers, or other private identifiers from the loan image.

## Operating Rules

- Export context frequently to `output/context` so future compaction does not erase the agreed direction.
- Use worker subagents for real code construction with disjoint write sets.
- Keep Chrome available for visual localhost and link verification; wait for pages to load.
- Monitor and clean C drive frequently. Keep valuable build caches, delete only low-value temp/cache artifacts through guarded scripts.
- Run anything that will later upload to a server locally first.
- Run `npm run db:backup` before destructive rehearsal, restore, release packaging, or server handoff steps that depend on preserving the current field runtime state.
- Run `npm run git:sync:dry` before any frequent auto-sync loop, then use `npm run git:sync:loop` only after confirming the selected files. Auto-sync must never stage ignored files, runtime state, SQLite files, `.env`/secret files, `output`, `node_modules`, Unity caches, or other private artifacts.
- If a module's final version needs a real environment, dependency, database, or automation, install and wire that environment now instead of building a disposable placeholder.
- Ask the user for login windows, licenses, hardware access, server credentials, or system prompts when needed.
- This machine is a full Windows development environment with user-granted local and network permissions.

## Worker Participation

Active worker lanes:

- Carver reviewer: the special long-line subagent for mainline audit. Keep it as the persistent reviewer, feed every major implementation checkpoint back to it, and adopt or explicitly record its findings before pushing large direction changes.
- Hardware probe worker: `tools/device-probe.ps1`, `tools/station-pro-apk-smoke.ps1`, and their focused check scripts. This lane hardens sanitized device evidence and must not touch docs, Unity/Web runtime code, or server domain behavior while other work is in flight.
- Web panel worker: `apps/web-demo/*`
- Unity controller/protocol workers: `apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs` and `apps/unity-shell/Assets/Scripts/Protocol/*`
- Field-kit/check workers: `pdf-renderer/src/main/java/com/rokid/innerworld/FieldKitPdf.java`, `server/space-server/check-field-markers.js`, `server/space-server/check-field-acceptance.js`, and release verification hooks.
- Main thread: shared contract, server integration, checks, docs, packages, verification

## Guardrails

- P0 is the real campus wall memory layer: A1 entry, A2 memory, A3 write-back, User B readback.
- AI must compress and interpret spatial actions; it must not become a generic chatbot or content platform.
- Open UGC, institution dashboards, broad routes, personal homepages, NPC rewards, and commercial task systems are P2 until the wall hardware loop is proven.
- Do not pivot into a generic campus tour.
- Do not collapse the project into a static web page.
- Do not make the phone the main artifact.
- Do not let Unity/Rokid/Web invent separate endpoint or state contracts.
- Do not package `data/innerworld.sqlite`, `data/runtime_state.json`, Unity `Library`, `node_modules`, `.git`, or large caches.
