# Carver Source Review

Updated: 2026-07-03 20:18 Asia/Shanghai

Superseding audit record: `.agents/carver/source-audit-2026-07-03.md`. That fresh user-requested audit re-read teammate/group/GitHub materials, rendered `docs/策划案.pdf` into 13 page PNGs, smoke-rendered 19 raw PDFs, and found that old `analysis/extracted_attachments/**/pdfinfo.txt` files are mostly broken Poppler-wrapper output. Use `pages.json` or the real Poppler exe path for future page metadata.

This is the durable local record of Carver's source review for the real-device phase. Carver is the long-running mainline reviewer name going forward. The review was read-only and did not modify files.

Latest main-agent checkpoint sent back to Carver at 20:17 Asia/Shanghai: direct Unity-generated Gradle `:launcher:assembleRelease` succeeded after adding Aliyun Maven mirrors, `output/unity-android/InnerWorldRokid.apk` is now a real LAN Gradle APK artifact, and static LAN APK/device/mainline/preflight gates passed. IDM was not needed this pass, but remains the preferred fallback for future failed Maven/Gradle dependency URLs. No new Station Pro install/launch was performed in this checkpoint; live UXR binding and field acceptance remain pending.

## Review Scope

Carver reviewed the final group materials, teammate GitHub files, and the previous Codex context exports:

- `analysis/attachment_index.md`
- `analysis/evidence_index.md`
- `analysis/chat_timeline.md`
- `analysis/reading_notes_agent_A.md` through `analysis/reading_notes_agent_D.md`
- `analysis/extracted_attachments/147_Rokid_最终主方案_全证据决策表/*`
- `analysis/extracted_attachments/170_Rokid_最新群聊整合_空间记忆任务层_Java矢量版/text.txt`
- `analysis/extracted_attachments/193_镜见_InnerWorld里世界_完整策划案_深蓝科技版/text.txt`
- `analysis/extracted_attachments/249_镜见_InnerWorld里世界_最终策划案_空间隐藏层版/text.txt`
- `analysis/extracted_attachments/312_镜见_InnerWorld_混合式空间Pin技术实现路径/text.txt`
- `docs/design.md`
- `docs/rokid_sdk_docs.md`
- `docs/rokid_sdk_docs_full.md`
- `docs/策划案.pdf`
- `output/context/latest-context.md`
- `output/context/latest-context.json`
- `docs/active-goal.md`
- `docs/status.md`
- `docs/teammate-docs-bus.md`
- `docs/rokid-device-integration.md`
- `package.json`

Privacy boundary: the review did not record full serials, USB instance ids, MAC addresses, private IPs, pairing codes, contacts, accounts, or raw logcat.

## PDF Extraction Coverage

All recovered group PDFs have a readable extraction directory with `text.txt`; the main PDF set also has `pages.json` and `pdfinfo.txt`, with most files also carrying `tables.json`.

PDF page coverage checked by Carver:

- `046` training transcript: 71 pages
- `047` detailed summary: 20 pages
- `052` GlassCoach plan: 22 pages
- `111` launch supplement: 6 pages
- `112` launch transcript: 6 pages
- `114` multi-direction plan pack: 22 pages
- `119` spatial browser: 4 pages
- `136` spatial browser creative summary: 7 pages
- `146` champion execution plan: 14 pages
- `160` InnerWorld commercial plan: 4 pages
- `170` latest group integration: 15 pages
- `193` complete InnerWorld proposal: 12 pages
- `219` mirror-see notes PDF: 2 pages
- `249` final spatial hidden layer proposal: 13 pages
- `266` CircuitMate proposal: 11 pages
- `270` In Character pitch deck: 15 pages
- `288` CircuitMate final: 12 pages
- `289` In Character final: 15 pages

`docs/策划案.pdf` matches the large final proposal PDF lineage represented by `249_镜见_InnerWorld里世界_最终策划案_空间隐藏层版`. The text/page/table extraction under `analysis/extracted_attachments/249_*` is the current content authority. If visual fidelity becomes necessary, render all 13 pages with Poppler PNG output and inspect/OCR them before citing layout-specific claims.

## Locked Product Direction

P0 is still exactly one real campus memory wall:

- A1 spatial entry opens the layer.
- A2 memory read shows the controlled wall memory.
- A3 TimeMark write-back creates a new beacon.
- User B revisits and reads the newly added memory.

This is not a normal guide app, PPT, phone-only page, broad route system, open UGC platform, institution backend, or generic campus social product.

## P0 Directions

Build or gate these now because they directly serve the true Rokid hardware lane:

- `station_pro_trusted_hardware_session`
- sanitized device/toolchain probe
- operator pairing
- Station Pro LAN or USB reachability
- Unity or AR Studio APK install/run smoke
- live SDK heartbeat
- RKCameraRig
- RKInput 3DoF ray
- PointableUI for A1/A2/A3 controls
- A2/A3 image target library from `/api/field/markers`
- SLAM or head-tracking heartbeat
- overlay rendering through the Unity adapter boundary
- trusted A1/A2/A3 observations through `/api/calibration/observations`
- `/api/field/acceptance` as the final hardware gate

## P1 Directions

Queue these after P0 is moving, or build them only as bounded polish that cannot claim hardware readiness:

- gesture five-state feedback
- user-initiated spatial audio for A2 or A3
- low-distraction radar/HUD
- polished Unity spatial shell
- controlled TimeMark authoring
- AI semantic compression and stricter HUD schema fixtures
- bounded offline voice commands for open memory, next, write back, or reset

## P2 / Reference

Keep these as later expansion or answer material until the real wall hardware loop passes:

- open Spatial Pin world
- PostGIS/cloud spatial platform
- WebXR/H5 ecosystem
- institution dashboard
- content editor
- analytics/data board
- personal homepage
- public social interactions
- commercial activity templates
- city/campus wide route systems
- CircuitMate or In Character as independent mainlines

## Current Risks

Carver's risk assessment is strict:

- Current evidence proves a sanitized Station Pro-class ADB device is visible, not that hardware is ready.
- `ROKID_UXR` boundary compilation, package detection, LAN APK inspection, simulator observations, manual observations, and print-kit readiness cannot claim live hardware acceptance.
- The project still lacks official UXR package/account validation, Unity Package Manager install of `com.rokid.xr.unity`, OpenXR feature/project validation, real RKCameraRig/RKInput/PointableUI binding, A2/A3 image target import, SLAM/head tracking heartbeat, user-confirmed Station Pro install/run/live heartbeat, operator-paired live SDK session, and trusted A1/A2/A3 observations.
- The Gradle mirror patch currently lives in generated Unity `Library/Bee/.../Gradle/settings.gradle`; a clean Unity export can erase it. Build hardening should codify mirrors and the IDM fallback in a durable script or Gradle template path.

## Next Task Queue

1. Main agent plus user: confirm Rokid developer account access, UXR package availability, Unity license/login, and any hardware permission popups. Do not record sensitive codes.
2. Hardware worker: keep running `device:probe:strict`, `env:doctor`, and `station:apk:inspect` as sanitized evidence only.
3. LAN/APK worker: codify Gradle mirror and IDM fallback outside generated Unity output, keep `field:preflight -RequireLan` and LAN APK inspection green, then run Station Pro install/launch smoke only after operator confirmation.
4. Unity worker: after official SDK install, bind RKCameraRig, RKInput 3DoF ray, and PointableUI behind `ROKID_UXR` while preserving fallback.
5. Marker worker: use `/api/field/markers` to create/check the A2/A3 image target library and enforce asset hash, physical size, DPI, and print version.
6. Main agent: wire `/api/device/pairing` -> live heartbeat -> `sdk_binding_status.live_binding_ready`, then bind SDK proof to the session.
7. Human hardware pass: place A1/A2/A3 on the real wall, scan or align them, and verify head tracking/SLAM and visible overlay behavior.
8. QA worker: submit trusted three-anchor observations, run `/api/field/acceptance`, and export a sanitized evidence chain plus release gate result.

## Carver Verdict

The direction is locked and the repository skeleton is sound. Do not expand the product surface now. Put the next engineering force into `station_pro_trusted_hardware_session` and the narrow live Rokid adapter chain.
