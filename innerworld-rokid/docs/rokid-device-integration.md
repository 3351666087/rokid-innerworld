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
- Submit `POST /api/calibration/observations` with `session_id`, `device_id`, `anchor_id`, `tracking_mode`, `observed_pose`, `confidence`, `notes`, and `client_time`.
- Accepted observations prove a marker is close enough to the configured wall pose; warning observations are usable but need operator attention; rejected observations block hardware confidence for that anchor.
- The SQLite store persists sanitized calibration observations and exposes a summary through the same API. Raw network/device identifiers are redacted.
- Calibration `ready_for_hardware` is latest-observation based: if A1/A2/A3 ever had an accepted observation but the latest observation for that anchor is rejected, the anchor is no longer counted ready.
- Calibration can use QR, image tracking, SLAM, manual, or simulator modes, but field evidence should prefer QR/image tracking for A1/A2/A3 marker lock.
- The Web operator console has a Wall Calibration panel that reads the same manifest, displays A1/A2/A3 marker/pose/latest observation state, and can submit simulator observations before hardware arrives.

## Unity Adapter Boundary

The Unity runtime now has a compile-safe SDK boundary:

- `RokidAdapterResolver.Resolve(...)` is the only controller entry point for choosing input/display adapters.
- `ROKID_UXR` is the only define symbol that may expose future Rokid UXR SDK references.
- `RokidUxrInputSource.cs` and `RokidUxrOverlayRenderer.cs` are wrapped by `#if ROKID_UXR`; until the official SDK package is installed, they compile out and the resolver returns editor/fallback adapters.
- `IRokidInputStateSink` keeps connection status, LAN base URL, and anchor-hit state flowing through the same interface for fallback and future hardware adapters.
- `RokidSdkBindingProbe` reports `fallback_only`, `boundary_compiled`, `package_detected`, or `live_binding_ready`. The first three are not proof that real hardware input/display is bound.
- `/api/device/manifest`, `/api/device/register`, `/api/device/heartbeat`, and `/api/device/sessions` carry a sanitized `sdk_binding_status` report so the operator console can distinguish SDK stub readiness from live Rokid SDK binding.
- The Unity controller actively fetches `endpoints.wall_calibration.url` during startup after bootstrap and before device registration. The HUD/log/heartbeat show schema, anchor count, `ready_for_hardware`, and calibrated anchor IDs.
- Vendor SDK packages downloaded through Unity Package Manager stay out of Git. Commit only the small adapter code that maps SDK gaze/ray/gesture/voice events into `IRokidInputSource`, `IRokidInputStateSink`, and `IRokidOverlayRenderer`.

## Hardware Arrival Checklist

1. Power and pair Rokid Max Pro with Rokid Station Pro; confirm YodaOS-Master system build and network access.
2. Put Station Pro and the Windows host on the same LAN.
3. Start the server with `npm run dev:lan`; record `http://<Windows host IP>:5177`.
4. Run `npm run field:preflight -- -RequireLan` to verify LAN health, update Unity config, and refresh the field-kit QR.
5. In Unity Package Manager, add the official Rokid UXR/OpenXR registry/scopes from the account-visible documentation; install the SDK package version approved by Rokid docs.
6. Build an Android/Rokid APK from Unity, keeping `Assets/Plugins/Android/InnerWorldNetwork.androidlib` for HTTP LAN access during local demo.
7. Open the Web Wall Calibration panel, confirm the manifest and A1/A2/A3 expected poses, then fetch `/api/calibration/wall` from Unity/Rokid, scan/lock A1/A2/A3 markers, and submit `/api/calibration/observations` for each anchor.
8. Replace only the input/display adapters:
   - Input: gaze/ray/gesture/voice/keyboard events map to `SelectAnchor`, `CompleteNextStep`, `PostServiceAction`, and `PostWriteBack`.
   - Display: UXR binocular/spatial overlay renders the same HUD text, anchor labels, and mission state currently shown by the fallback.
   - Networking: `SpaceApiClient` keeps using `/api/device/bootstrap`, `/api/calibration/wall`, `/api/spaces/{id}`, `/api/ai/hud`, `/api/evidence/chain`, and `/api/session/plan`.
9. Run field acceptance:
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
- `client_hints`: polling intervals, timeout, cache policy, and write-back anchor.
- `unity_compat.config`: the same `{ base_url, space_id }` shape used by the Unity fallback.

## Required Checks

Run these before connecting real hardware:

```powershell
npm run check:device
npm run check:ops -- --require-artifacts
npm run check:web
npm run check:unity
```

`check:device` verifies `/api/device/bootstrap`, follows the advertised URLs, confirms AI schema/prompt availability, submits one sanitized A2 calibration observation, and checks the SQLite-backed calibration summary.
`check:web` verifies the operator console keeps the Wall Calibration panel, API read/write hooks, simulator lock actions, and trace fields.
`check:unity` verifies the controller actively fetches and parses the wall calibration manifest instead of only declaring protocol DTOs.

## Runtime Flow

1. Fetch `/api/device/bootstrap`.
2. Poll `endpoints.health.url` or `endpoints.space.url`.
3. Use `endpoints.nearby_pins.url` to map A1/A2/A3 to visible overlays.
4. Fetch `endpoints.wall_calibration.url`, display the returned readiness summary, and submit marker observations before claiming hardware alignment.
5. POST task progress to `endpoints.interactions.url`.
6. POST service intent to `endpoints.service_actions.url`.
7. POST user write-back text to `endpoints.write_back.url`.
8. Re-fetch state/space after every POST. API JSON uses `Cache-Control: no-store`.

## LAN Notes

Do not use `localhost` from Rokid hardware. Use the Windows host IP and make sure Windows Firewall allows Node.js on the private network.

If a generated Unity config or PDF points to the wrong host, run:

```powershell
npm run field:preflight -- -RequireLan
```

This updates Unity config and re-renders the field-kit QR when LAN health is reachable.
