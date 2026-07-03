# Rokid Device Integration

This is the handoff contract for Rokid hardware, AR Studio, or any headset-side prototype that needs to attach to the InnerWorld Space Server.

## Confirmed Applied Hardware

Current application / loan record: `data/hardware_manifest.json`.

- Rokid Max Pro, model RA202, blue-black, quantity 1.
- Rokid Station Pro, model RAS201, blue-black, quantity 1.
- Interpreted kit: Rokid AR Studio.
- Loan deadline in the agreement image: 2026-08-31.
- Developer reference price in the agreement image: 6500 CNY per set.

Assessment: this hardware has no direction problem for InnerWorld. The official Rokid Open Platform describes Rokid AR Studio as Rokid Max Pro glasses plus Rokid Station Pro host, running YodaOS-Master for spatial computing. That matches the final group decision to prioritize Studio over Lite when available.

Privacy rule: recipient details, phone numbers, addresses, and device serial numbers from the source image stay out of engineering docs and public reports.

## Official Hardware / SDK Facts To Track

Sources checked on 2026-07-02:

- Rokid AR Studio official site: `https://arstudio.rokid.com/`
- Rokid Open Platform / YodaOS-Master docs: `https://open.rokid.com/master?lang=en`
- Rokid AR Platform SDK docs entry from the AR Studio site: `https://custom.rokid.com/prod/rokid_web/c88be4bcde4c42c0b8b53409e1fa1701/pc/cn/b07fcaecebc84cb499d221347cd3a591.html`
- Rokid AR Platform SDK architecture entry: `https://s.rokid.com/srAHeF4`

Facts to treat as design constraints:

- AR Studio pairs Rokid Max Pro glasses with Rokid Station Pro and runs YodaOS-Master for spatial computing.
- Station Pro includes Wi-Fi 6, camera, physical buttons, and XR-class compute. The field demo must therefore support LAN server access and Android/Rokid builds, not only desktop localhost.
- Max Pro / AR Studio supports spatial positioning, 6DoF head control, micro-gesture interaction, voice/keyboard/mouse style multimodal input, and Micro OLED binocular display. The Unity app should map those inputs to our existing anchor/mission/write-back commands.
- Rokid's developer material points to Unity-side debugging/performance tooling and SDK documentation. The project should keep a Unity-first hardware lane.
- UXR3.0/OpenXR package access is through Unity Package Manager scoped registry/package flow; the UXR2 component notes remain useful for RKCameraRig/RKInput/RKHand/PointableUI patterns. Do not commit downloaded vendor SDK payloads into this repo.

Practical implication for this project:

- Unity remains the primary hardware runtime. Web is the localhost/LAN fallback and operator console, not the final glasses experience.
- Do not vendor Rokid SDK files into Git until the official UPM registry, package name, scoped registry, and package version are confirmed on the hardware account.
- Treat Rokid SDK integration as an adapter swap: `EditorRokidInputSource` and screen-space HUD are replaced by UXR/OpenXR input/display adapters, while Space API, mission state, evidence chain, AI HUD schema, write-back, calibration, and LAN server stay stable.

## Station Pro Live Pass

Station Pro live pass starts with sanitized ADB evidence, then Unity UXR3.0 validation: Android target, `com.rokid.xr.unity`, Environment Fix, OpenXR Feature Groups, Project Validation, RKCameraRig, RKInput, PointableUI, image target library, and SLAM/head tracking heartbeat. Passing package detection is not live binding; passing live binding is not field acceptance until operator-paired A1/A2/A3 observations clear `/api/field/acceptance`.

The current connected-hardware fact is: Windows can see a Rokid Station Pro over USB ADB as a device-state Android target. Strict probe evidence on 2026-07-03 19:12 Asia/Shanghai found ADB 36.0.0 at `C:\Program Files (x86)\Android\android-sdk\platform-tools\adb.exe`, one sanitized USB device in `device` state with model `RG_stationPro` / device `stationPro`, Android SDK build-tools/platforms, and Unity Editor `6000.3.19f1`. This proves that the hardware lane can begin. It does not prove the Unity/UXR adapter, APK runtime, or field acceptance gates yet.

Environment gap: the current shell does not expose `adb` or Unity through PATH and does not set `ANDROID_HOME`, `ANDROID_SDK_ROOT`, or `JAVA_HOME`. Scripts can find known install paths, but a reproducible runbook should either call the explicit paths or set the environment before AR Studio / UXR package validation.

`npm run station:apk:inspect` inspects the current Android fallback APK, aapt badging, Android manifest network flags, embedded `innerworld-config.json`, and sanitized ADB state without installing anything. `npm run check:station-apk` reruns that non-mutating inspect path and asserts that the report does not expose raw serials, raw USB instance ids, private IPs, MAC addresses, or raw config URLs. `npm run check:station-apk:lan` adds the P0 hardware-network gate: APK config must be device-network-ready, not `localhost`. `npm run station:apk:patch-lan` is now only a local config-only fallback for cases where Unity/Gradle rebuild is blocked; the preferred path is `npm run unity:android:build:lan`, which can patch Unity-generated Gradle repositories, retry direct `:launcher:assembleRelease`, copy the Gradle APK, and run non-mutating LAN package checks. `npm run station:apk:smoke` requires a connected Station Pro ADB device, installs the APK, launches it, verifies the app process, and writes a sanitized ignored report under `output/station-pro-apk-smoke`.

Current checkpoint: the current APK is SHA256 `bd852f7012e25f9ccd2630e2113a1a3526fc7bdfea5d05c32d56c410303fe142`, size 45,719,155 bytes. Its package includes `assets/RKImage.db` plus `arm64-v8a/libopenxr_loader.so`, `arm64-v8a/librokid_openxr_api.so`, and `arm64-v8a/libyuv.so`. `station:apk:pair-smoke` passed install, cold launch, process observation, `is_uxr_app`, and operator pairing for this checkpoint.

Clean logcat relaunch for the same checkpoint showed `DllNotFoundException=0`, `rokid_openxr_api=0`, and `UnsatisfiedLinkError=0`. This is APK runtime evidence for the P0 lane, not field acceptance.

Current remaining boundary: this still is not hardware-ready. The project cannot claim RKCameraRig/RKInput/PointableUI/image target/SLAM trusted hardware readiness until trusted A1/A2/A3 physical observations, mission write-back, User B readback, and `/api/field/acceptance` readiness all pass.

UXR live-binding instruction: keep the UXR manifest gate, then install `com.rokid.xr.unity`, run Rokid Environment Fix, OpenXR Feature Groups, and Project Validation. Bind RKCameraRig/RKInput/PointableUI/image target/SLAM into the existing adapter boundary and heartbeat contract instead of creating a parallel runtime.

## SDK Docs Adoption Matrix

The newly added SDK/design reference docs are actionable, but they enter the mainline only through the existing contract. Current P0 is still the real campus exhibition wall with A1/A2/A3, not a broad campus social platform.

Immediate P0 adoption:

- RKCameraRig: hardware scene must replace Unity `Main Camera` with the SDK rig when `ROKID_UXR` is enabled. Until then, fallback remains compile-safe.
- RKInput: multimodal input maps into the same commands: select A1/A2/A3, complete mission step, create service action, submit write-back.
- 3DoF controller ray: first live hardware control path because it is the default Rokid interaction and has lower demo risk.
- RKHand / gesture: supported through the adapter boundary and five-state feedback contract, but live gesture binding waits for the official package and hardware.
- PointableUI / PointableUICurve: use for A1 entry confirmation, A2 memory panel, and A3 write-back controls; do not create separate web-only UI semantics.
- Image recognition: maps directly to `/api/calibration/wall` and `/api/calibration/observations`; A1 is the QR/entry marker, A2/A3 are image-target or wall-marker anchors.
- SLAM/head tracking status: maps to device heartbeat and calibration observations, never to raw public logs.
- FollowCamera / billboard: HUD panels and prompts must face the user and preserve the Space API mission state.
- Visual rules: black is transparent, white is high-brightness; avoid large black/white slabs in glasses overlays.
- Spatial layout: near-field controls use roughly 0.4m-0.5m, far/read panels stay 1m+; all hot zones must remain large enough for ray/gesture selection.
- Spatial audio: allowed as a controlled enhancement for A2 memory or A3 confirmation, triggered deliberately rather than autoplaying multiple sources.

P1 after hardware / SDK login:

- Install `com.rokid.xr.unity` through Unity Package Manager from the official scoped registry visible to the account.
- Use Rokid Environment Fix / Project Validation and OpenXR Feature Groups before claiming live SDK readiness.
- Add real RKCameraRig/RKInput/RKHand/PointableUI prefab binding behind `ROKID_UXR`.
- Add image library setup for A1/A2/A3 markers once final printed marker art is locked.
- Add offline voice commands only for bounded actions such as "open memory", "next", "write back", and "reset demo".
- Pull device logs with ADB only into private evidence folders; never commit raw device logs.

Do not merge into current P0:

- Open UGC social layer, free 3D graffiti, public voice uploads, personal homepage, institution dashboard, commercial task system, NPC reward layer, or broad campus route.
- Raw hardware serials, SSID, MAC, IP, phone/address data, vendor SDK package files, Unity Library, Android build caches, or device logcat dumps.
- A separate mobile/website state model that bypasses Space API, SQLite ledger, calibration, service action outbox, or write-back review.

## Physical Wall Calibration Contract

Hardware arrival should start with wall calibration, not with ad hoc placement.

- Fetch `GET /api/calibration/wall` from Unity/Rokid to obtain the A1/A2/A3 wall coordinate system, expected poses, marker types, acceptance thresholds, and the observation endpoint.
- Fetch `GET /api/field/markers` when the device/operator needs the printable marker plan: marker ids, tracking modes, public URLs, operator actions, and evidence sources are derived from the same wall calibration contract.
- Fetch `GET /api/field/acceptance` when the device/operator needs the authoritative site gate: print kit, simulator rehearsal, hardware alignment, mission/write-back loop, SQLite evidence, release/deploy chain, and applied hardware kit are evaluated together.
- Submit `POST /api/calibration/observations` with `session_id`, `device_id`, `anchor_id`, `tracking_mode`, `observed_pose`, `confidence`, `notes`, and `client_time`.
- Accepted observations prove a marker is close enough to the configured wall pose; warning observations are usable but need operator attention; rejected observations block hardware confidence for that anchor.
- The SQLite store persists sanitized calibration observations and exposes a summary through the same API. Raw network/device identifiers are redacted.
- Calibration `ready_for_hardware` is latest-hardware-observation based: A1/A2/A3 only count when their latest accepted/warning observation uses `qr`, `image_tracking`, or `slam`; simulator/manual observations can make rehearsal evidence but cannot claim hardware readiness. If a later hardware observation for that anchor is rejected, the anchor is no longer counted ready.
- Calibration can use QR, image tracking, SLAM, manual, or simulator modes, but field hardware evidence must use QR/image tracking/SLAM for A1/A2/A3 marker lock.
- The Web operator console has a Wall Calibration / Field Kit panel that reads the same manifests, displays A1/A2/A3 marker id/type/tracking modes/expected pose/latest observation state, shows confidence, position error, rejected issues, and evidence source, separates print-kit readiness from simulator rehearsal and hardware readiness, and can submit simulator observations before hardware arrives.
- The Web operator console also has a Field Acceptance / Site Gates panel. Use it as the final field decision surface: simulator/manual observations may clear rehearsal gates, but only QR/image tracking/SLAM observations can clear hardware alignment.

## Unity Adapter Boundary

The Unity runtime now has a compile-safe SDK boundary:

- `RokidAdapterResolver.Resolve(...)` is the only controller entry point for choosing input/display adapters.
- `ROKID_UXR` is the only define symbol that may expose future Rokid UXR SDK references.
- `RokidUxrInputSource.cs` and `RokidUxrOverlayRenderer.cs` are wrapped by `#if ROKID_UXR`; until the official SDK package is installed, they compile out and the resolver returns editor/fallback adapters.
- `IRokidInputStateSink` keeps connection status, LAN base URL, and anchor-hit state flowing through the same interface for fallback and future hardware adapters.
- `RokidSdkBindingProbe` reports `fallback_only`, `boundary_compiled`, `package_detected`, or `live_binding_ready`. The first three are not proof that real hardware input/display is bound.
- `/api/device/manifest`, `/api/device/register`, `/api/device/heartbeat`, and `/api/device/sessions` carry a sanitized `sdk_binding_status` report so the operator console can distinguish SDK stub readiness from live Rokid SDK binding.
- The Unity controller actively fetches `endpoints.wall_calibration.url` and `endpoints.field_markers.url` during startup after bootstrap and before device registration, then posts a simulator calibration observation through `endpoints.wall_calibration_observations.url`. The `C` key / `Calib` button posts a manual rehearsal observation through the same endpoint. The HUD/log/heartbeat show schema, anchor count, `ready_for_hardware`, calibrated anchor IDs, field marker ids/tracking modes, active marker expected pose, and latest observation status/issues without claiming real hardware readiness.
- Vendor SDK packages downloaded through Unity Package Manager stay out of Git. Commit only the small adapter code that maps SDK gaze/ray/gesture/voice events into `IRokidInputSource`, `IRokidInputStateSink`, and `IRokidOverlayRenderer`.

## Live Rokid Adapter Checklist

This checklist is the P0 implementation contract for the first real hardware pass. Do not claim Rokid hardware readiness until every item below has a passing local proof or a clearly marked hardware-blocked note.

Current checkpoint status: the Space API contract, `/api/device/adapter-checklist`, Web operator rendering, Unity manifest consumption, Unity heartbeat report field, and regression checks are implemented. A Station Pro is now visible over sanitized ADB, so the next gap is no longer "hardware absent"; the real SDK binding items remain `pending` until the official UXR package, Unity project validation, APK install/run, live heartbeat, and operator-paired A1/A2/A3 observations pass. Do not substitute Web expansion, open UGC, institution backend, or route-system work for this P0.

- `RKCameraRig`: replace the scene `Main Camera` only inside the `ROKID_UXR` lane. The adapter must keep the fallback scene runnable without vendor packages and must report the rig status through `RokidSdkBindingProbe`.
- `RKInput` / 3DoF ray: bind the default controller ray to `IRokidInputSource`. Ray hover maps to A1/A2/A3 focus, confirm maps to `CompleteNextStep`, and long-confirm or explicit command maps to write-back/service actions. The fallback mouse/keyboard path stays unchanged.
- `PointableUI` / `PointableUICurve`: A1 entry confirmation, A2 memory panel, and A3 write-back confirmation must be selectable through Rokid pointable UI. These controls reuse the existing mission/write-back endpoints and must not introduce a second UI state model.
- Image target library: import the A2/A3 target assets from `data/field-targets` using the metadata exposed by `/api/field/markers`. The Unity target library must match `asset_id`, `sha256`, `physical_width_mm`, `physical_height_mm`, `dpi`, and `print_version`; mismatches block field acceptance.
- A1 entry lock: QR/logo recognition opens the spatial layer only after a deliberate confirmation near the configured 0.4m-0.5m entry interaction distance. This is the start of the demo, not a passive web page reveal.
- A2/A3 lock proof: image tracking or SLAM observations submit `POST /api/calibration/observations` with sanitized `session_id`, `device_id`, `anchor_id`, `tracking_mode`, `observed_pose`, `confidence`, and `client_time`.
- SLAM/head tracking heartbeat: headset pose quality, tracking mode, active anchor, and SDK binding status flow into `/api/device/heartbeat` and `InnerWorldArShellState`. Raw camera frames, serial numbers, SSID, MAC, IP, and token-like identifiers never enter public logs or Git.
- Overlay renderer: UXR binocular/spatial overlay renders the same mission state, radar, anchor halo, route line, write-back status, and evidence messages as the fallback shell. The Web console remains operator/debug, not the audience-facing runtime.
- Hardware evidence gate: `ready_for_hardware` requires latest accepted or warning observations for A1/A2/A3 using `qr`, `image_tracking`, or `slam`. Simulator/manual observations can clear rehearsal gates only.
- Performance gate: hold 60 FPS target behavior, avoid large black/white slabs, keep panels readable at near/far field sizes, and keep audio/voice triggers user-initiated.

## Hardware Arrival Checklist

1. Power and pair Rokid Max Pro with Rokid Station Pro; confirm YodaOS-Master system build and network access.
2. Put Station Pro and the Windows host on the same LAN.
3. Start the server with `npm run dev:lan`; record `http://<Windows host IP>:5177`.
4. Run `npm run field:preflight -- -RequireLan` to verify LAN health, update Unity config, and refresh the field-kit QR.
5. Run `npm run check:field-markers` after `npm run pdf:fieldkit`; do not place cards on the wall if A1/A2/A3 marker ids or expected poses fail this check.
6. In Unity Package Manager, add the official Rokid UXR/OpenXR registry/scopes from the account-visible documentation; install the SDK package version approved by Rokid docs.
7. Build an Android/Rokid APK from Unity, keeping `Assets/Plugins/Android/InnerWorldNetwork.androidlib` for HTTP LAN access during local demo.
8. Open the Web Wall Calibration / Field Kit panel, confirm the wall manifest, A1/A2/A3 field marker ids, tracking modes, expected poses, and print-kit readiness, then fetch `/api/calibration/wall`, `/api/field/markers`, and `/api/field/acceptance` from Unity/Rokid, rehearse simulator/manual observations, scan/lock A1/A2/A3 markers, and submit `/api/calibration/observations` for each anchor.
   - Keep `npm run field:live-pass` running during this pass. It is a read-only live field monitor for the A1/A2/A3 physical target pass: it watches current session/operator pairing, trusted A1/A2/A3 status, mission write-back, User B readback, and `/api/field/acceptance` readiness without posting observations, writing mission state, or claiming hardware readiness.
9. Replace only the input/display adapters:
   - Input: gaze/ray/gesture/voice/keyboard events map to `SelectAnchor`, `CompleteNextStep`, `PostServiceAction`, and `PostWriteBack`.
   - Display: UXR binocular/spatial overlay renders the same HUD text, anchor labels, and mission state currently shown by the fallback.
   - Networking: `SpaceApiClient` keeps using `/api/device/bootstrap`, `/api/calibration/wall`, `/api/field/markers`, `/api/field/acceptance`, `/api/spaces/{id}`, `/api/ai/hud`, `/api/evidence/chain`, and `/api/session/plan`.
10. Run field acceptance:
   - A1 opens the memory layer.
   - A2 shows public memory content.
   - A3 writes a time capsule.
   - User B sees the new beacon.
   - Evidence chain and session plan are reachable from the operator console / debug overlay.

## Bootstrap

Start the local server:

```powershell
npm run dev
```

Then fetch:

```text
http://localhost:5177/api/device/bootstrap
```

For LAN hardware access, start LAN mode first:

```powershell
npm run dev:lan
```

Then fetch bootstrap through the Windows host IP:

```text
http://<Windows主控机IP>:5177/api/device/bootstrap?profile=rokid-ar
```

The bootstrap response includes:

- `base_url`: the HTTP origin the device should use.
- `space.space_id`: currently `innerworld_campus_wall`.
- `anchors`: A1/A2/A3 labels, grid positions, poses, and default states.
- `mission.steps`: read, find_year, service_action, write_back.
- `endpoints`: absolute and relative API routes for health, space, state, nearby pins, interactions, service actions, write-back, AI schema, AI prompt, and reset.
- `ai.output_schema_url` and `ai.prompt_url`: the HUD generation contract.
- `endpoints.evidence_chain.url`: evidence chain for field verification.
- `endpoints.session_plan.url`: staged on-site script and fallback actions.
- `endpoints.wall_calibration.url`: A1/A2/A3 wall coordinate system, marker plan, and acceptance thresholds.
- `endpoints.wall_calibration_observations.url`: calibration observation write path for Unity/Rokid.
- `endpoints.field_markers.url`: printable A1/A2/A3 marker manifest for field setup and device-side marker plan checks.
- `endpoints.field_acceptance.url`: site gate manifest for print kit, rehearsal, hardware alignment, mission loop, SQLite evidence, release chain, and applied hardware kit.
- `client_hints`: polling intervals, timeout, cache policy, and write-back anchor.
- `unity_compat.config`: the same `{ base_url, space_id }` shape used by the Unity fallback.

## Required Checks

Run these before connecting real hardware:

```powershell
npm run device:probe
npm run check:device-probe -- --require-adb-device
npm run station:apk:inspect
npm run check:station-apk
npm run check:station-apk:lan
npm run check:device
npm run check:ops -- --require-artifacts
npm run check:web
npm run check:unity
npm run check:field-markers
npm run check:field-acceptance
npm run check:field-live-pass
```

`device:probe` writes a private ignored sanitized hardware/toolchain report under `output/device-probe`.
`check:device-probe` reruns the probe, asserts that JSON/Markdown do not expose raw serials, USB instance ids, private IPs, MAC addresses, or pairing codes, and can require one ADB `device` when passed `--require-adb-device`.
`station:apk:inspect` proves the APK package metadata, launchable activity, embedded Space config boundary, aapt availability, Android manifest network flags, and sanitized ADB state. `check:station-apk:lan` is the required hardware-network gate before install/launch. Use `station:apk:smoke` only when the operator is ready for an actual install/launch on the connected Station Pro; a successful install without process observation is not hardware readiness.
`check:device` verifies `/api/device/bootstrap`, follows the advertised URLs including `/api/field/acceptance`, confirms AI schema/prompt availability, submits one sanitized A2 calibration observation, and checks the SQLite-backed calibration summary.
`check:web` verifies the operator console keeps the Wall Calibration / Field Kit panel, `/api/field/markers` API hook, marker-card rendering, API read/write hooks, simulator lock actions, readiness separation, and trace fields.
`check:unity` verifies the controller actively fetches/parses the wall calibration and field marker manifests and POSTs simulator/manual observations instead of only declaring protocol DTOs.
`check:store` verifies the SQLite summary separates simulator/manual rehearsal from hardware readiness, uses each anchor's latest observation, and blocks `ready_for_hardware` unless A1/A2/A3 have accepted/warning QR/image tracking/SLAM observations.
`check:field-markers` verifies printable marker cards stay synchronized with wall calibration and the field kit PDF/HTML.
`check:field-acceptance` verifies the site gate schema, endpoint, all required gate IDs, hardware tracking mode whitelist, and the all-simulator negative guard.
`field:live-pass` is the read-only live monitor for the trusted A1/A2/A3 physical target pass. It is P0-only and must not mutate calibration, mission, write-back, or acceptance state.
`check:field-live-pass` verifies that live-pass monitoring stays read-only and keeps the boundary intact: not hardware-ready until trusted A1/A2/A3 observations, mission write-back, User B readback, and `/api/field/acceptance` are ready.

## Runtime Flow

1. Fetch `/api/device/bootstrap`.
2. Poll `endpoints.health.url` or `endpoints.space.url`.
3. Use `endpoints.nearby_pins.url` to map A1/A2/A3 to visible overlays.
4. Fetch `endpoints.wall_calibration.url`, display the returned readiness summary, and submit marker observations before claiming hardware alignment.
5. Fetch `endpoints.field_markers.url` to confirm A1:qr-entry, A2:image-target, A3:image-target, tracking modes, and printable payload URLs.
6. Fetch `endpoints.field_acceptance.url` and read gate status plus blocking items before claiming site readiness.
7. POST task progress to `endpoints.interactions.url`.
8. POST service intent to `endpoints.service_actions.url`.
9. POST user write-back text to `endpoints.write_back.url`.
10. Re-fetch state/space/field acceptance after every POST. API JSON uses `Cache-Control: no-store`.

## LAN Notes

Do not use `localhost` from Rokid hardware. Use the Windows host IP and make sure Windows Firewall allows Node.js on the private network.

If a generated Unity config or PDF points to the wrong host, run:

```powershell
npm run field:preflight -- -RequireLan
```

This updates Unity config and re-renders the field-kit QR when LAN health is reachable.
