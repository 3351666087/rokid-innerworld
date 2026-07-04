# Rokid InnerWorld / 镜见

## Latest Checkpoint

2026-07-04 14:31 Asia/Shanghai:

- Rebuilt the current Unity APK with the `IW_TARGET_*` target-observation diagnostics included. Current APK: `innerworld-rokid/output/unity-android/InnerWorldRokid.apk`, 45,721,247 bytes, SHA256 `e447069ac12b8b757e143387975a06a6965e0ede50b91e77d78763b5adf39c84`; APK metadata contains the target diagnostics tokens in `global-metadata.dat`.
- Installed and cold-launched that APK on the connected Station Pro with operator pairing. `station:apk:pair-smoke`, `check:station-apk:rkimage`, `check:uxr-readiness:ready`, `uxr:doctor`, `check:contract`, `check:mainline`, and `check:field-live-pass` passed.
- `field-live-pass --single --logcat` now reports the `IW_TARGET_*` diagnostic counters with `raw_logcat_included=false`; counts are still `0` until a physical A1/A2/A3 scan occurs. Hardware-ready remains false because trusted A1/A2/A3, A3 write-back, User B readback, and `/api/field/acceptance` are not complete.
- `field:target-pass:strict` now also requires the current target-diagnostics APK preflight: current APK SHA prefix, APK token scan, latest mutating Station Pro launch, and UXR readiness must all match before a physical pass can be accepted. The preflight is green for `e447...`; strict still fails correctly on missing trusted A1/A2/A3 and P0 mission/User B loop.
- Added `field:target-pass:watch` as the read-only physical scan watcher. It samples field target phases while counting `IW_TARGET_*` logcat tokens without writing raw logcat, so the operator can run one command during the A1/A2/A3 pass.
- Fixed `tools/build-unity-android.ps1` so post-build external checks run through a timeout-bounded wrapper; `-SkipUnityBuild -RunPostChecks -RequirePostCheckDevice` now writes a fresh build report for the current APK instead of hanging after Unity success.

2026-07-04 13:54 Asia/Shanghai:

- Added `field:target-pass` as the guided real-wall A1/A2/A3/User B runner. Default mode is read-only and writes a sanitized JSON/MD phase report; `field:target-pass:apply` can post A2 read/find_year, service_action, and A3 TimeMark only after trusted A2/A3 gates exist; `field:target-pass:strict` also requires operator-confirmed User B readback and must fail until trusted hardware plus mission loop are complete.
- Verified `check:field-target-pass` passes with the current operator-paired live session, while `field:target-pass:strict` fails as expected because trusted A1/A2/A3, mission steps, A3 write-back, and User B readback are still missing. No simulator/manual observations were created and `/api/state` remains User A / `entered` / no completed steps.
- Hardware-ready remains false; the next physical action is still to scan/re-bind A1/A2/A3 through the live Rokid SDK session, then use the runner during the real wall pass.

2026-07-04 13:35 Asia/Shanghai:

- Unity/Rokid image tracking now has a trusted-target mission assist bridge: only server-returned `hardware_observation_trusted=true` observations can advance A2 `read/find_year`; A1 still requires deliberate entry confirmation, and A3 TimeMark write-back stays gated behind `service_action`.
- DTO/check coverage now records the sanitized hardware proof (`hardware_session`) and asserts simulator/manual calibration cannot trigger mission assist. Verified: `check:unity`, `check:contract`, `check:field-live-pass`, `check:field-acceptance -- --api`, `check:mainline`, and `context:export`.
- Hardware-ready remains false. Current live-pass still has one operator-paired live session but no trusted A1/A2/A3 anchors, missing mission steps `read/find_year/service_action/write_back`, and `user_b_readback_ready=false`.

2026-07-04 12:31 Asia/Shanghai:

- PR #1 is open as a draft from `codex/rokid-real-device-sync`; Carver reviewed commit `1358664f` as directionally safe for the P0 real-device lane.
- Current APK remains `innerworld-rokid/output/unity-android/InnerWorldRokid.apk`, 45,719,155 bytes, SHA256 `bd852f7012e25f9ccd2630e2113a1a3526fc7bdfea5d05c32d56c410303fe142`, with `assets/RKImage.db`, `libopenxr_loader.so`, `librokid_openxr_api.so`, and `libyuv.so` packaged.
- `device-probe` is hardened against Windows/ADB hangs: ADB/tool calls and PnP enumeration have internal timeouts, `check:device-probe` has an outer 90s timeout, and current strict probe still sees one sanitized Station Pro-class ADB device in `device` state.
- LAN Space Server is back online on `0.0.0.0:5177`, and `npm run station:apk:pair-smoke` passed again on the connected Station Pro for the current APK: install OK, cold launch OK, process observed, `is_uxr_app=true`, operator pairing issued/injected/verified, and no raw pairing code persisted.
- `check:station-apk:rkimage` now reads inspect-only APK evidence after mutating pair-smoke runs, so package gates cannot accidentally consume install/launch evidence. The latest inspect gate verifies LAN config, `assets/RKImage.db`, and Rokid native libraries.
- `field:live-pass` now prints missing trusted anchors, missing hardware anchors, missing mission steps, and next required field actions. Current baseline: trusted A1/A2/A3 is still `0/3`; A1 needs raw hardware scan; A2/A3 need re-scan or re-bind through the operator-paired live SDK session.
- `field:acceptance-session` is now the local/LAN field runner for real-device acceptance: default mode runs device probe, APK inspect, endpoint snapshots, and single live-pass without writing observations; `field:acceptance-session:live` explicitly runs mutating Station Pro pair-smoke and live watch for the physical A1/A2/A3/User B pass.
- Field acceptance now makes User B readback explicit: mission/write-back is not enough unless `/api/state.active_user` is `B` after the A3 write-back beacon exists. `npm run check:field-acceptance -- --api` and `npm run check:field-live-pass` both reflect `user_b_readback_ready=false` until the physical pass completes.
- Hardware-ready remains false. The next P0 action is the real A1/A2/A3 target pass plus A1 entry -> A2 read -> A3 TimeMark write-back -> User B readback, then `field:live-pass -- --single --require-live-session --require-trusted --require-mission-loop` and `/api/field/acceptance`.

2026-07-03 22:18 Asia/Shanghai:

- Evidence-chain reconciliation is now the latest checkpoint. The current disk APK is `innerworld-rokid/output/unity-android/InnerWorldRokid.apk` at 45,167,409 bytes with SHA256 `ce3f118632d6202c61455f19cdc11080a765e17c74f6be07496ef2c2b571cf1d`.
- `tools/build-unity-android.ps1` now samples APK size/SHA after post-checks, then `powershell -File tools/build-unity-android.ps1 -SkipUnityBuild -RunPostChecks -RequirePostCheckDevice` refreshed `unity-build-android-latest.*` without rebuilding, installing, or launching.
- `npm run check:station-apk:lan`, `npm run uxr:doctor`, and `npm run check:uxr-readiness:ready` pass for the current APK. The APK is LAN-ready, UXR-manifest-ready, min SDK 28, target SDK 36, and the latest inspect evidence matches the current APK SHA.
- Important boundary correction: the latest mutating launch proof still belongs to the previous 45MB APK SHA `70592a5dfec4...`, not the current `ce3f118632d6...` APK. `uxr-readiness-latest` now records `latest_mutating_launch_apk_sha_mismatch_current_apk` and sets the next proof to `user_confirmed_current_apk_station_pro_install_launch_smoke`.
- Hardware-ready remains false. The next P0 action is a user/operator-confirmed current-APK Station Pro install/launch smoke, then live Rokid SDK binding, operator pairing, trusted A1/A2/A3 observations, A3 write-back, User B readback, and `/api/field/acceptance`.

2026-07-03 21:19 Asia/Shanghai:

- The 20:48 Station Pro error-102 launch blocker was superseded by the 21:05 mutating smoke for that checkpoint's APK: install succeeded, `am start` succeeded, the app process was observed, `isUxrApp=true`, and no launch error was reported. This remains historical launch proof, not proof that the later `ce3f...` APK has been launched.
- Space API LAN heartbeat from the running Unity app is proven, with active anchor A3 and pose present, but this is still not hardware acceptance.
- Current hard boundary: `sdk_binding_status.stage=fallback_only`, `live_binding_ready=false`, input/overlay binding are false, the Unity session is unpaired, and `hardware_acceptance_eligible=false`.
- `station-pro-apk-smoke` now writes separate latest inspect and latest mutating-launch evidence pointers so non-mutating package checks do not erase the last real launch proof.
- Next P0 proof is official Rokid UXR/OpenXR live binding: install/validate `com.rokid.xr.unity`, `com.unity.xr.openxr`, and `com.unity.xr.management`; run Environment Fix / OpenXR Feature Groups / Project Validation; then bind RKCameraRig, RKInput 3DoF ray, PointableUI, image target / SLAM heartbeat, operator pairing, trusted A1-A3 observations, and User B readback.
- Hardware-ready remains false until `/api/field/acceptance` is green from an operator-paired live SDK session, not fallback/manual/simulator evidence.

2026-07-03 20:18 Asia/Shanghai:

- LAN APK rebuild moved from config-patch fallback to a real Gradle APK artifact. After adding Aliyun Maven mirrors to Unity's generated Gradle `settings.gradle`, direct Gradle `:launcher:assembleRelease` completed successfully; the APK was copied to `innerworld-rokid/output/unity-android/InnerWorldRokid.apk` (24,752,749 bytes).
- `npm run station:apk:inspect`, `npm run check:station-apk:lan`, `npm run device:probe`, `npm run check:device-probe`, `npm run check:mainline`, and `npm run field:preflight -- -RequireLan` passed. The APK config is now `private_lan`, `network_ready_for_device=true`, and `space_id=innerworld_campus_wall`; the current Unity source config host hash matches the embedded APK config host hash.
- No install or launch was performed in this checkpoint. This is LAN-ready package evidence only, not live heartbeat, UXR binding, trusted A1/A2/A3 observations, or field acceptance. Station Pro install/launch remains a separate mutating step requiring operator confirmation.
- IDM is recorded as the fallback for future Maven/Gradle dependency download failures (`IDMan.exe /d <URL> /p <dir> /f <file> /n`), but it was not needed in this pass because the mirror patch resolved the failed dependency fetches. The mirror currently lives in generated Unity `Library/Bee/.../Gradle/settings.gradle`, so the next build-hardening task is to codify mirror/IDM fallback outside generated output.
- C drive free space after the checkpoint is about 26GB. Keep using guarded cache/temp cleanup and avoid deleting useful Unity/Android build caches before the next real-device pass.

2026-07-03 19:46 Asia/Shanghai:

- Fresh Carver re-audit completed with a disjoint local write set under `.agents/carver/`. The final record is `.agents/carver/source-audit-2026-07-03.md`; `docs/策划案.pdf` was text-extracted and rendered into 13 page PNGs, and 19 raw PDFs were smoke-rendered. Carver's important correction: old `analysis/extracted_attachments/**/pdfinfo.txt` files are mostly broken-wrapper output, so future page metadata should use `pages.json` or the real Poppler exe path.
- Real-device evidence was rerun this turn: `npm run device:probe`, `npm run station:apk:inspect`, `npm run check:device-probe`, `npm run check:station-apk`, and `npm run check:mainline` all passed. The latest device probe at `2026-07-03T19:41:21+08:00` still sees one sanitized Station Pro-class USB ADB device in `device` state.
- GitHub was fetched and checked with `gh`: local `main` and `origin/main` remain at `b21fa314`; there are currently no PRs or issues in `3351666087/rokid-innerworld`. The only teammate GitHub contribution found on main remains Shiyao Zhang's `f402f82f61d62e897d7615fa3f4259423e5cfce9`.
- Carver's next-task order is now the active P0 queue: confirm Rokid/Unity/UXR access and hardware popups, keep sanitized probes running, replace APK `localhost` with LAN config, rebuild Android/Rokid APK, run Station Pro install/launch smoke, install official UXR, bind RKCameraRig/RKInput/PointableUI, import A1/A2/A3 target library, then prove operator-paired heartbeat and trusted field acceptance.
- Root attachment extraction tooling was fixed after Carver's PDF finding: `tools/extract_attachments.py` now prefers the real bundled Poppler executables and writes `pdfinfo.txt` only when `pdfinfo` succeeds. Verified against `docs/策划案.pdf`: page count is 13 through the corrected path.
- C drive free space was checked, then guarded temp cleanup removed about 1.39GB of old Visual Studio installer temp files. C now has about 30.3GB free; one larger temp candidate was skipped because Windows reported a file lock. Unity and Android build caches were kept.

2026-07-03 19:32 Asia/Shanghai:

- Carver is now the long-running mainline reviewer sub-agent name. Future checkpoint reviews should say "Carver review" and keep the same P0 lock: one real campus wall, A1 entry, A2 memory read, A3 TimeMark write-back, and User B readback.
- Carver completed the requested full source review. The durable local record is [innerworld-rokid/docs/carver-source-review.md](innerworld-rokid/docs/carver-source-review.md): group PDFs are unpacked/readable, P0/P1/P2 boundaries are restated, and the next engineering queue is narrowed to `station_pro_trusted_hardware_session`.
- `npm run station:apk:inspect` and `npm run check:station-apk` now pass as non-mutating Station Pro APK checks. They prove package/config inspectability and one connected Station Pro-class ADB device, while correctly marking the current APK as `localhost` and not LAN/live-heartbeat ready.
- Local/GitHub alignment is current: `origin/main` is at `b21fa314` (`Adopt teammate docs bus for hardware phase`). The teammate GitHub contribution is commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` by Shiyao Zhang, adding `docs/design.md`, `docs/rokid_sdk_docs.md`, `docs/rokid_sdk_docs_full.md`, and `docs/策划案.pdf`; these remain input to the P0 hardware bus, not a second product direction.
- `npm run device:probe:strict` now records the connected Station Pro lane as sanitized hardware evidence: ADB is found at `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`, ADB version is 36.0.0, one USB ADB device is in `device` state with model `RG_stationPro` / device `stationPro`, Android SDK build-tools/platforms are installed, and Unity Editor `6000.3.19f1` is present.
- The current local environment gap is not hardware presence; it is live runtime proof. `adb`/Unity are still not exposed through PATH, AR Studio / official Rokid UXR package access is not yet verified, no operator-paired Unity/UXR APK heartbeat has passed, and no trusted A1/A2/A3 hardware observations have cleared `/api/field/acceptance`.
- Worker participation has started with a disjoint write set: a worker is hardening the sanitized ADB parser so daemon startup noise cannot pollute device evidence. Fallback/manual/simulator remains rehearsal only.

2026-07-03 17:55 Asia/Shanghai:

- Carver re-reviewed teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` for the now-connected hardware phase. The durable adoption ledger is [innerworld-rokid/docs/teammate-docs-bus.md](innerworld-rokid/docs/teammate-docs-bus.md).
- The teammate docs and 13-page PDF now enter the bus as: P0 UXR3.0 validation, RKCameraRig, RKInput 3DoF ray, PointableUI, A2/A3 image target library, SLAM/head tracking heartbeat, operator-paired live SDK proof, and trusted calibration observations; P1 bounded near/far layout, gestures, audio, TimeMark, and AI compression; P2/reference institution/social/platform/broad-route ideas.
- The local device probe path is being hardened so hardware evidence stays sanitized before it reaches docs, release evidence, or GitHub.

2026-07-03 17:31 Asia/Shanghai:

- The project has officially switched from hardware-waiting fallback work to real-device development. Windows now sees a connected Rokid Station Pro as `RG-stationPro` with an ADB interface, and `adb devices -l` reports it as `device`. Full device serials, USB instance ids, MAC addresses, private IPs, and pairing codes remain private and must not be committed.
- The new P0 checkpoint is `station_pro_trusted_hardware_session`: convert the connected Station Pro + Max Pro lane into a reproducible live path for ADB/toolchain detection, operator pairing, Unity/AR Studio APK install/run, heartbeat, A1/A2/A3 trusted observations, evidence chain, and field acceptance.
- `Rokid x Bolon` is treated as a secondary connected glasses line until proven to expose the same Station Pro / UXR / RKCameraRig / RKInput / image target / SLAM development path. It must not pull P0 away from the Max Pro + Station Pro AR Studio lane.
- The next implementation work should codify a sanitized device/toolchain probe and feed every live adapter checkpoint back to Carver before declaring hardware readiness.

2026-07-03 00:57 Asia/Shanghai:

- Kepler re-audited teammate documents for hardware-independent but heavy long-run modules. `innerworld-rokid/docs/active-goal.md` now records the long module backlog: `a1_spatial_entry_experience`, `story_graph_mission_runtime_v2`, `evidence_replay_judge_mode`, `premium_unity_spatial_shell_2`, `controlled_timemark_authoring`, `ai_hud_contract_hardening`, `institution_lite_content_compiler`, and `spatial_audio_gesture_feedback_pack`.
- `check:mainline` now locks those long modules to the same product direction: one real campus wall, A1 entry, A2 memory, A3 write-back, User B readback, Space API, SQLite, shared contract, and no hardware-ready claim from rehearsal.
- First slices landed for Story Graph / Mission Runtime v2, A1 Spatial Entry, and Evidence Replay / Judge Mode. The judge replay is sanitized and read-only; Unity fallback now reports A1 entry lock/confirmation/transition state through the Rokid boundary; session planning and device bootstrap expose the story graph contract.
- Kepler found and we fixed the main consistency issue before submit: User B readback and handoff now bind to A3 write-back, not A2 memory. `check-contract` asserts both the story graph node/action and session-plan handoff anchor stay on A3.
- Verified before GitHub sync: `check:mainline`, `check:contract`, `check:device`, `check:web`, `check:unity`, `check:ops`, `check:security`, and `git diff --check` all passed. Commit `bc1c1a8e` is pushed to `origin/main`; the unrelated local `docs/rokid_sdk_docs_full.md` change remains unstaged.

2026-07-03 00:08 Asia/Shanghai:

- Kepler reviewed the teammate files again. P0 remains the real Rokid campus wall mainline: A1 spatial entry, A2/A3 image target lock, wall calibration, writeback, User B readback, and hardware-safe evidence gates. Open UGC, institution dashboards, broad route maps, and generic social features stay P2.
- A2/A3 image target assets are now first-class field marker data. `data/field_markers.json` records asset ids, source paths, SHA256 hashes, physical dimensions, DPI, print version, Unity import status, and Rokid XR Extension import status. The source SVGs live under `innerworld-rokid/data/field-targets`, and `/api/field/markers` exposes `/api/field/assets/<file>` URLs.
- Unity fallback was upgraded from a cramped debug HUD into a premium spatial shell: operator rail, active target card, radar strip, A1/A2/A3 route line, animated anchor halos/stems, compact image-target asset state, and `ar_shell` metrics for spatial entry, target lock, radar, writeback readiness, and operator-safe device mode.
- `docs/rokid-device-integration.md` now has the P0 live-adapter checklist for RKCameraRig, RKInput 3DoF ray, PointableUI/PointableUICurve, A2/A3 image target library import, SLAM/head-tracking heartbeat, and hardware evidence gates. Hardware arrival should attach to the existing Space API/SQLite contracts instead of creating a parallel runtime.
- `check:unity` and `check:field-markers` now enforce these contracts so future commits cannot quietly regress back to missing target assets, broken asset URLs, unsafe asset paths, or a toy-like Unity shell.

Rokid InnerWorld 是一个面向真实校园展墙的空间记忆层：观众戴上 Rokid 眼镜后，对准物理展墙上的入口锚点，现实墙面会叠加出 A1/A2/A3 三个空间记忆点、任务推进、TimeMark 写回、后来者读取和现场状态反馈。

这不是普通校园导览、静态网页或 PPT。当前仓库的目标是先在 Windows 主控机上把完整闭环跑通，再把 Rokid Max Pro / Station Pro 的输入与显示层接入同一套 Space API、SQLite 数据层和 Unity 协议客户端。

## 当前成品长什么样

现场展示以一台 Windows 主控机为核心，运行 localhost/LAN Space Server，并投屏展示 Web 或 Unity 第一视角 fallback。观众侧最终使用 Rokid 眼镜进入同一空间层：

- A1 入口海报：识别物理锚点，开启 InnerWorld 空间层。
- A2 年份信标：读取校史/记忆片段，推动任务状态机。
- A3 写回点：生成并展示时间胶囊，后来者能读到新信标。
- 操作台：显示设备会话、心跳、展墙标定、服务动作 outbox、写回链路、现场预检和发布状态。

硬件未到场时，Web demo 和 Unity fallback 承担完整演示；硬件到场后，只替换输入/显示层，不重写数据契约。

## 已申请硬件

硬件记录见 [innerworld-rokid/data/hardware_manifest.json](innerworld-rokid/data/hardware_manifest.json)。

- Rokid Max Pro, model `RA202`, blue-black, quantity `1`
- Rokid Station Pro, model `RAS201`, blue-black, quantity `1`
- Windows 主控机：当前开发机，同时承担 localhost/LAN Space Server、演示投屏、打包和现场预检

项目接入原则：Rokid 设备负责空间输入、显示、手势/射线/图像识别/SLAM 能力；Windows 主控机负责 Space Server、SQLite、任务状态、写回、证据链和部署包。

## 快速运行

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm install
npm run dev
```

默认地址：

- Web demo: `http://localhost:5177/`
- API health: `http://localhost:5177/api/health`
- Ops status: `http://localhost:5177/api/ops/status`
- Space data: `http://localhost:5177/api/spaces/innerworld_campus_wall`
- Wall calibration: `http://localhost:5177/api/calibration/wall`
- Field markers: `http://localhost:5177/api/field/markers`
- Field acceptance: `http://localhost:5177/api/field/acceptance`

现场 LAN 模式：

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run dev:lan
npm run unity:config -- http://<Windows主控机IP>:5177
```

## 关键检查

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run check:mainline
npm run check:contract
npm run check:device
npm run check:unity
npm run check:service-actions
npm run check:security
npm run check:web
npm run check:field-markers
npm run check:field-acceptance
```

常用交付检查：

```powershell
npm run context:export
npm run db:backup
npm run db:backup:verify
npm run env:doctor
npm run field:preflight
npm run pdf:fieldkit
npm run check:field-markers
npm run check:field-acceptance
npm run release:index
npm run server:package
npm run verify:release
```

缓存和磁盘守护：

```powershell
npm run cache:report
npm run cache:clean
npm run cache:temp:report
npm run cache:temp:clean
```

## 仓库结构

- [innerworld-rokid](innerworld-rokid): 主工程，包含 Web demo、Space Server、Unity shell、共享协议、AI schema/prompt、打包和检查脚本。
- [innerworld-rokid/apps/web-demo](innerworld-rokid/apps/web-demo): 当前可投屏的第一视角空间展墙和操作台。
- [innerworld-rokid/server/space-server](innerworld-rokid/server/space-server): localhost/LAN Space Server，托管静态页面和 Space API。
- [innerworld-rokid/apps/unity-shell](innerworld-rokid/apps/unity-shell): Unity/Rokid fallback 与设备接入边界。
- [innerworld-rokid/shared](innerworld-rokid/shared): Web、Server、Unity 共同遵守的 InnerWorld contract。
- [innerworld-rokid/data](innerworld-rokid/data): `space_demo.json`、`field_markers.json`、硬件 manifest 和本地 SQLite 运行时数据入口。
- [innerworld-rokid/docs](innerworld-rokid/docs): 主线目标、现场 runbook、Rokid 接入、部署、缓存和安全文档。
- [pdf-renderer](pdf-renderer): Java/OpenHTMLToPDF + PDFBox 现场 PDF 渲染器。
- [docs](docs): 策划案与 Rokid SDK 参考资料。

## 主线复审

Carver 是长期主线 reviewer。重大 checkpoint 必须回投 Carver 复审，尤其是：

- 前端叙事、展示节奏或现场话术发生大改。
- Rokid SDK、Unity adapter、设备心跳或硬件协议发生大改。
- SQLite、service action、write-back、证据链、发布包或部署链路发生大改。
- 新文档或新功能可能把项目带向普通导览、社交 UGC 平台、机构后台、PPT 或纯网页演示。

## 新增参考资料

2026-07-02 的提交 `f402f82f61d62e897d7615fa3f4259423e5cfce9` 已纳入本地 `main`。它新增：

- [docs/design.md](docs/design.md): InnerWorld 空间设计工作拆解。
- [docs/rokid_sdk_docs.md](docs/rokid_sdk_docs.md): Rokid SDK 摘要资料。
- [docs/rokid_sdk_docs_full.md](docs/rokid_sdk_docs_full.md): Rokid SDK 完整摘录。
- [docs/策划案.pdf](docs/%E7%AD%96%E5%88%92%E6%A1%88.pdf): 原始策划案 PDF。

这些资料不是只做归档。已经把其中可立即执行的部分并入工程总线，采纳矩阵见 [innerworld-rokid/docs/rokid-device-integration.md](innerworld-rokid/docs/rokid-device-integration.md)：RKCameraRig、RKInput、RKHand、PointableUI、图像识别、SLAM/头部追踪、FollowCamera、空间音频、3DoF 射线、近场手势、AR 视觉亮度和空间布局规则，都通过 Space API、Unity adapter boundary、wall calibration 和现有任务状态机接入。

当前 P0 只认一条线：A1/A2/A3 真实展墙锚点、wall calibration、mission state、service action、write-back、User B 读到新增记忆、现场证据链。操场广场大路线、开放 UGC 社交、个人主页、机构后台、商业任务或 NPC 徽章系统不抢当前阶段。

## 当前实现重点

- SQLite 已作为本地权威 store，负责运行态、写回记录、数据集目录、设备会话、bounded device events、service action outbox 和 wall calibration observations。
- Space Server 已有 health、ops status、space data、device bootstrap、device register/heartbeat、service actions outbox/ack、wall calibration manifest/observations、field markers manifest 和 field acceptance gates 等接口。
- Unity client 已具备 Space API bootstrap、设备注册、心跳、SDK binding 状态、service action outbox/ack、wall calibration manifest/observation、field marker manifest 和 field acceptance 运行时消费；启动链与 runtime contract 会主动读取 `/api/calibration/wall`、`/api/field/markers` 和 `/api/field/acceptance`，并把现场 gate 状态写入 HUD、target debug、input status 与设备 heartbeat。
- `/api/calibration/wall` 暴露 A1/A2/A3 墙面坐标系、marker 类型、预期 pose 和验收阈值；`/api/calibration/observations` 接收脱敏后的 QR/image tracking/SLAM/manual/simulator 观测并写入 SQLite。
- `/api/field/markers` 暴露可打印现场 marker manifest，绑定 `data/field_markers.json`、`/api/calibration/wall`、A1/A2/A3 marker id/type、tracking modes、expected pose 和现场证据来源。
- `/api/field/acceptance` 现在是现场验收总线，聚合 print kit、simulator rehearsal、hardware alignment、trusted hardware session、mission/write-back loop、SQLite evidence、release/deploy chain 和 Rokid hardware kit，不允许 simulator/manual 或脚本伪造 `tracking_mode` 直接推绿硬件验收。
- 真机硬件验收现在要求 `/api/calibration/observations` 的 QR/image tracking/SLAM 观测绑定服务器侧可信 live Rokid SDK session：session 必须在线、有 heartbeat、health ok、有 pose、active anchor 匹配，并且 SDK boundary/package/input/overlay/live binding 全部 ready。
- Web demo 已完成第一视角空间展墙、三锚点任务闭环、右侧操作台、写回状态、展墙标定/现场包面板、Field Acceptance / Site Gates 面板和 responsive 布局修正；操作台明确区分 `print kit ready`、`simulator rehearsal`、`hardware ready/pending`。
- Java PDF 渲染链路已用于现场 field kit，输出路径为 `innerworld-rokid/output/pdf/rokid_innerworld_field_kit.pdf`；PDF 内含 A1:qr-entry、A2:image-target、A3:image-target 三张可打印锚点牌，并由 `npm run check:field-markers` 验收。
- GitHub 自动同步脚本已存在，但运行前必须先看 dry-run，确认不会提交私密证据、runtime 数据或大缓存。

## 阶段记录

2026-07-02 20:47 Asia/Shanghai：

- Web 操作台新增 `Wall Calibration / 展墙标定` 模块，可刷新 `/api/calibration/wall`，查看 A1/A2/A3 marker、expected pose、latest observation 和 `ready_for_hardware`。
- Web 操作台可提交 simulator 标定观测到 `/api/calibration/observations`，用于硬件未到场阶段演练同一套墙面锁定合同；硬件到场后 Rokid QR/image tracking/SLAM 写入同一接口。
- Unity fallback/controller 启动时主动读取 wall calibration manifest，并把 schema、anchor count、ready flag 和 calibrated anchor ids 放进 HUD/log/heartbeat。
- Wall calibration 记录会脱敏 `session_id`、`device_id` 和 notes；`ready_for_hardware` 只看每个 anchor 的最新 QR/image tracking/SLAM 硬件观测，历史 accepted 不能覆盖后续 rejected，simulator/manual 只能作为 rehearsal/field check。
- `check:web` 和 `check:unity` 已加入防退化断言，防止只保留空协议或空 DOM。

2026-07-02 21:08 Asia/Shanghai：

- Web 标定面板升级为现场 evidence/readiness 面板：显示 `SQLite/API authoritative`、`simulator rehearsal`、hardware evidence candidate、confidence、position error 和 rejected issues。
- Unity fallback/controller 不只读取 manifest，还会在启动后提交 simulator observation；`C` 键和 `Calib` 按钮可提交 manual rehearsal observation，HUD/log/heartbeat 显示最新 observation status/issues。
- SQLite summary 的 latest-observation 语义进入 `check:store`：后续 rejected observation 会取消该 anchor 的 ready 状态，不能被历史 accepted 覆盖。

2026-07-02 21:28 Asia/Shanghai：

- 新增现场 marker/field-kit 资产链路：`data/field_markers.json` 记录 A1/A2/A3 可打印锚点牌、marker id/type、tracking modes、operator action 和 evidence source。
- Space Server 新增 `/api/field/markers`，从同一套 `space_demo.json` 与 wall calibration manifest 派生现场 marker 运行态，避免 PDF、设备端和校准 API 各说各话。
- Java/OpenHTMLToPDF 现场包重渲染为 8 页 A4 PDF，A1/A2/A3 卡片含可扫码 URL、expected pose、marker id 和证据来源；已渲染 PNG 视觉检查，未发现覆盖或裁切。
- 新增 `npm run check:field-markers`，并接入 `verify:release`，用于验证 marker manifest、`/api/calibration/wall`、PDF/HTML 可搜索 token 和隐私边界。
- Kepler 已复核方向：field kit 是真实展墙安装与验收包，不是导览册、宣传 PDF、PPT 或手机主体验。

2026-07-02 21:49 Asia/Shanghai：

- Web 操作台的 `Wall Calibration / Field Kit` 区域已经主动读取 `/api/field/markers`，把 A1/A2/A3 的 marker id/type、tracking modes、expected pose 渲染成现场 marker card。
- Web readiness 被拆成三条独立现场状态：`print kit ready/pending` 表示打印包和三张卡片是否齐备，`simulator rehearsal` 表示本地演练观测，`hardware ready/pending` 只由 QR/image tracking/SLAM 等硬件观测和硬件适配状态决定。
- Unity/Rokid fallback 启动链现在在 wall calibration 后继续读取 `endpoints.field_markers.url`，HUD、target panel、input status 和 heartbeat 会显示现场 marker schema、三张卡 ID、追踪模式和 active marker expected pose。
- `check:web` 和 `check:unity` 已升级为硬约束：不允许只声明 DTO 或接口，必须实际消费 `/api/field/markers`，并保持 print kit、simulator rehearsal、hardware readiness 三态分离。

2026-07-02 22:00 Asia/Shanghai：

- Kepler 复核指出 P0：旧的 `ready_for_hardware` 可能被 simulator/manual accepted observation 推绿。已修复为只统计 `qr`、`image_tracking`、`slam` 三类硬件观测。
- SQLite wall calibration summary 新增 `rehearsal_ready`、`hardware_calibrated_anchor_count`、`hardware_calibrated_anchor_ids` 和 `hardware_tracking_modes`；`ready_for_hardware` 只在 A1/A2/A3 最新硬件观测均 accepted/warning 时为 true。
- Web 的 `Hardware Wall Lock` 与 Field Kit 三态都改读硬件专用字段；Unity HUD/heartbeat 同步显示硬件专用 calibrated anchors。
- `check:store` 新增回归用例：A1/A2/A3 全部 simulator accepted 时，`rehearsal_ready=true`，但 `ready_for_hardware=false` 且硬件锚点计数为 0。

2026-07-02 22:27 Asia/Shanghai：

- Space Server 新增 `/api/field/acceptance`，把现场安装/验收判断收敛成七个 gate：`print_kit`、`simulator_rehearsal`、`hardware_alignment`、`mission_loop`、`sqlite_evidence`、`release_chain`、`hardware_kit`。
- Web 操作台新增 `Field Acceptance / Site Gates` 区域，直接读取验收总线；endpoint 暂不可用时会从本地 runtime 降级展示，但仍明确写出 `simulator/manual is not hardware ready`。
- Unity 协议层新增 `field_acceptance` endpoint、manifest、gate、summary、blocking item 和 source-of-truth DTO，后续真机 overlay 可以直接消费同一验收总线。
- Kepler P0 复审指出 overall 不能在 print kit 或 SQLite evidence pending 时返回 `hardware_acceptance_ready`；已修复为 final ready 必须同时满足 print kit、hardware alignment、mission loop、SQLite evidence、release chain 和 hardware kit。
- 新增 `npm run check:field-acceptance`，并让 `check:web`、`check:mainline`、`check:contract`、`check:device`、`check:ops` 硬约束 `/api/field/acceptance`、schema、gate 分离、all-simulator negative guard 和必要 gate pending 时不得 ready。

2026-07-02 22:38 Asia/Shanghai：

- Unity/Rokid fallback 现在把 `/api/field/acceptance` 从协议边界推进到实际运行时消费：启动链、`LoadRuntimeServiceContracts()` 和 calibration observation POST 后都会刷新现场验收 manifest。
- Unity HUD、target debug、input status 和 `sdk_binding_status.message` 已显示 acceptance schema、overall status、ready/pending/blocked gate 数、`ready_for_hardware`、hardware evidence count、`blocking_items`、`next_actions` 和 `simulator/manual not hardware` guard。
- `check:unity` 新增硬约束：必须实际 GET/parse `FieldAcceptanceManifest`，并在 runtime detail、target、input 和 heartbeat 中展示现场验收状态；只保留 DTO/URL 不算通过。
- `verify:release` 在 field markers 后新增 `npm run check:field-acceptance -- --api`，确保发布链覆盖真实 localhost `/api/field/acceptance` 端点，而不是只跑静态合同。
- Kepler 复核通过当前主线方向，并把下一 checkpoint 定为 `trusted_hardware_session` / `sdk_live_binding`：真机验收前，硬件模式观测必须绑定真实 Rokid SDK live session，不能只凭脚本 POST 的 `qr`、`image_tracking` 或 `slam` 字段推绿。

2026-07-02 23:06 Asia/Shanghai：

- 已落地 `trusted_hardware_session` / `sdk_live_binding` checkpoint：`/api/calibration/observations` 不再信任请求体里的硬件模式字段，QR/image tracking/SLAM 观测必须由服务器从 live device session 派生硬件 proof。
- `resolveHardwareObservationProof` 会检查 session online、heartbeat、health、pose、active anchor、SDK boundary/package/input/overlay/live binding；缺任何一项都会写入 untrusted proof，并让 `trusted_hardware_session` gate 保持 pending。
- SQLite wall calibration summary 现在区分 raw hardware-mode alignment 与 trusted hardware evidence：脚本 POST 三个 `qr/image_tracking/slam` accepted 只能证明 raw hardware-mode observation，不能让 `ready_for_hardware` 或 `hardware_acceptance_ready` 变 true。
- 历史 wall calibration `acceptance` 读取时会重新脱敏，避免旧测试记录里的 session/device proof 泄露 token、IP、SN、SSID 或 MAC；新写入记录也在 store 边界再次清洗。
- 回归检查已覆盖 tracking-mode-only fake hardware negative、trusted live hardware positive、all-simulator negative、field acceptance API/static contract、Unity runtime consumption、Web rendering 和 security scan。

2026-07-02 23:24 Asia/Shanghai：

- 已推进 `operator_issued_device_pairing` checkpoint：Space Server 新增 `/api/device/pairing`，由操作员在现场签发一次性配对码，真实设备在 `/api/device/register` 时提交并消耗，成功后 session 标记为 `operator_paired`。
- Web/Unity fallback 仍允许未配对 session 做 rehearsal、UI 调试和协议联调；但 `/api/field/acceptance` 的 `trusted_hardware_session` gate 现在必须看到 `operator_paired_session`，未配对设备会得到 `device_not_operator_paired` blocker，不能推绿硬件验收。
- 配对码只在服务器内存中以 SHA-256 hash 短期保存，注册成功、过期或服务重启后失效；SQLite、snapshot、manifest、公有摘要和 Web 本地存储都不保存明文配对码，这是现场安全取舍。
- Unity 协议 DTO 和共享 contract 已加入 `device_pairing` endpoint，Web 操作台显示配对状态、硬件验收资格和签发按钮，方便硬件到场后直接按“操作员签发 -> 设备注册 -> 心跳/观测 -> 验收 gate”的现场路径接入。
- 新增和更新的检查覆盖 bad pairing code 403、good pairing code single-use、配对码不泄露、未配对硬件 proof 不可信、Field Acceptance 必须要求 operator pairing、Web 不做 localStorage/sessionStorage 持久化。

2026-07-02 23:45 Asia/Shanghai：

- 已加固为 `operator_pairing_gate_and_unity_consumption` checkpoint：`/api/device/pairing` 默认只允许 Windows 主控机本机 loopback 签发；非本机 LAN 请求必须配置并提交 `INNERWORLD_OPERATOR_PIN`，错误或未配置时返回 `device_pairing_operator_gate_failed`。
- operator PIN 和 pairing code 都不回显、不写 SQLite、不写 snapshot、不进 manifest；runtime event 只记录 `operator_gate` 的通过方式、默认策略和 `pin_persisted=false`。
- Unity/Rokid fallback 不再只是知道 `device_pairing` endpoint：`DeviceRegisterRequest` 已包含 `pairing_code`，`InnerWorldDemoController` 只通过非序列化运行时字段、`INNERWORLD_OPERATOR_PAIRING_CODE` 或 `--innerworld-pairing-code` 接收操作员配对码，发送前规范化为 `ABCD-EFGH`，空值仍走 rehearsal/unpaired。
- Unity HUD、runtime detail、input status 和日志只显示 `pairing submitted`、`pairing required-for-hardware`、`pairing operator_paired`、`pairing expired` 等状态，不显示明文配对码，也不把配对码写入 Inspector 序列化字段、PlayerPrefs、文件或任何本地持久化。
- `check-device` 现在直接模拟 loopback/non-loopback/PIN 场景；`check-unity` 和 `check-contract` 硬约束 Unity 必须把清洗后的 `pairing_code` 放进注册请求，并且不得打印或持久化明文配对码。

## 隐私与安全

不要提交以下内容：

- `.env`、API key、token、账号凭据和本地登录材料
- 微信原始导出、私密聊天证据、个人电话/地址/序列号等敏感字段
- `innerworld-rokid/data/innerworld.sqlite*`
- `innerworld-rokid/output/`
- `node_modules/`、Unity `Library/`、`Temp/`、`Obj/`、构建输出和缓存
- Rokid SDK 包本体、vendor payload、设备 SN、SSID、MAC、个人 IP 证据或任何可识别现场私密设备的信息

提交前至少运行：

```powershell
cd C:\Users\33516\Documents\Rokid\innerworld-rokid
npm run git:sync:dry
npm run check:security
```

## 主线判断

项目最终要交付的是“Rokid 眼镜中的真实展墙空间记忆层”。任何新增模块都必须能回答三个问题：

1. 它是否帮助 Rokid 眼镜接入真实空间锚点、手势/射线、SLAM、图像识别或空间音频？
2. 它是否加强 Space Server、SQLite、写回、服务动作、设备会话或现场证据链？
3. 它是否能让交付现场更稳定、更好展示、更容易恢复？

回答不上来，就先不要进主线。
