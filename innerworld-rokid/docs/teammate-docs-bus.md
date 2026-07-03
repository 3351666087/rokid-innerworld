# Teammate Docs Bus

Updated: 2026-07-03 17:55 Asia/Shanghai

This document records how teammate commit `f402f82f61d62e897d7615fa3f4259423e5cfce9` enters the InnerWorld mainline. Kepler reviewed the materials again during the real-device phase. The rule is strict: the teammate docs are actionable only through the current one-wall A1/A2/A3/User B Rokid spatial memory loop. They do not create a parallel product line.

## Sources

- `docs/design.md`: spatial UX/design work breakdown for InnerWorld and Rokid UXR constraints.
- `docs/rokid_sdk_docs.md`: extracted Rokid SDK notes for RKCameraRig, RKInput, RKHand, PointableUI, PointableUICurve, FollowCamera, image recognition, SLAM/head tracking, GlobalEventUtils, and UXR3.0 setup.
- `docs/rokid_sdk_docs_full.md`: full SDK capture, including UXR3.0/OpenXR package setup, scoped registry flow, `com.rokid.xr.unity`, Environment Fix, OpenXR Feature Groups, Project Validation, RKCameraRig replacement, sample APK install/run, image tracking, and SLAM sample references.
- `docs/策划案.pdf`: 13-page A4 proposal. Extractable text confirms the core idea: Campus Hidden Layer, Spatial URL/visual anchor entry, fixed-place TimeMark, AI semantic compression/moderation, controlled demo at one place, and later platform ideas. The P0 adoption below deliberately keeps only the one-wall demo loop.

## Kepler Review Result

Kepler says the current absorption path is correct: teammate material must enter through Space API, SQLite, Unity adapter, device runtime, field markers, field acceptance, and evidence replay. It must not compete with `station_pro_trusted_hardware_session`.

Final Kepler review on 2026-07-03: OK to commit/push this checkpoint. Mainline drift check passed: P0 remains Station Pro + UXR3.0 + RKCameraRig/RKInput/PointableUI/image target/SLAM/live SDK proof on a single A1/A2/A3/User B wall loop. Hardware-ready language is still correct because sanitized ADB visibility only starts the hardware lane; it does not prove Unity/UXR adapter readiness, APK runtime, or field acceptance. The only commit caution is to keep the historical dirty `docs/rokid_sdk_docs_full.md` out of this checkpoint.

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

The next implementation checkpoint remains `station_pro_trusted_hardware_session`. The bus accepts teammate modules only when they pass these questions:

1. Does it strengthen the one-wall A1/A2/A3/User B Rokid spatial memory loop?
2. Does it reuse Space API, SQLite, shared contract, calibration, field markers, field acceptance, and evidence replay?
3. Does it advance true RKCameraRig/RKInput/PointableUI/image target/SLAM/live SDK proof instead of rehearsal-only polish?
4. Does it preserve the privacy boundary for device ids, network identifiers, chat evidence, and loan/contact information?

If any answer is no, keep it P2/reference until the real hardware loop is accepted.
