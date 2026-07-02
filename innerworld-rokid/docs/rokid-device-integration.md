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
- UXR2.0 / UXR SDK package access is through Unity Package Manager scoped registry/package flow. Do not commit downloaded vendor SDK payloads into this repo.

Practical implication for this project:

- Unity remains the primary hardware runtime. Web is the localhost/LAN fallback and operator console, not the final glasses experience.
- Do not vendor Rokid SDK files into Git until the official UPM registry and package version are confirmed on the hardware account.
- Treat Rokid SDK integration as an adapter swap: `EditorRokidInputSource` and screen-space HUD are replaced by UXR2.0 input/display adapters, while Space API, mission state, evidence chain, AI HUD schema, write-back, and LAN server stay stable.

## Hardware Arrival Checklist

1. Power and pair Rokid Max Pro with Rokid Station Pro; confirm YodaOS-Master system build and network access.
2. Put Station Pro and the Windows host on the same LAN.
3. Start the server with `npm run dev:lan`; record `http://<Windows host IP>:5177`.
4. Run `npm run field:preflight -- -RequireLan` to verify LAN health, update Unity config, and refresh the field-kit QR.
5. In Unity Package Manager, add the official Rokid UXR2.0 registry/scopes from the account-visible documentation; install the SDK package version approved by Rokid docs.
6. Build an Android/Rokid APK from Unity, keeping `Assets/Plugins/Android/InnerWorldNetwork.androidlib` for HTTP LAN access during local demo.
7. Replace only the input/display adapters:
   - Input: gaze/ray/gesture/voice/keyboard events map to `SelectAnchor`, `CompleteNextStep`, `PostServiceAction`, and `PostWriteBack`.
   - Display: UXR binocular/spatial overlay renders the same HUD text, anchor labels, and mission state currently shown by the fallback.
   - Networking: `SpaceApiClient` keeps using `/api/device/bootstrap`, `/api/spaces/{id}`, `/api/ai/hud`, `/api/evidence/chain`, and `/api/session/plan`.
8. Run field acceptance:
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
- `client_hints`: polling intervals, timeout, cache policy, and write-back anchor.
- `unity_compat.config`: the same `{ base_url, space_id }` shape used by the Unity fallback.

## Required Checks

Run these before connecting real hardware:

```powershell
npm run check:device
npm run check:ops -- --require-artifacts
npm run check:unity
```

`check:device` verifies `/api/device/bootstrap`, follows the advertised URLs, and confirms AI schema/prompt availability. It does not mutate runtime state.

## Runtime Flow

1. Fetch `/api/device/bootstrap`.
2. Poll `endpoints.health.url` or `endpoints.space.url`.
3. Use `endpoints.nearby_pins.url` to map A1/A2/A3 to visible overlays.
4. POST task progress to `endpoints.interactions.url`.
5. POST service intent to `endpoints.service_actions.url`.
6. POST user write-back text to `endpoints.write_back.url`.
7. Re-fetch state/space after every POST. API JSON uses `Cache-Control: no-store`.

## LAN Notes

Do not use `localhost` from Rokid hardware. Use the Windows host IP and make sure Windows Firewall allows Node.js on the private network.

If a generated Unity config or PDF points to the wrong host, run:

```powershell
npm run field:preflight -- -RequireLan
```

This updates Unity config and re-renders the field-kit QR when LAN health is reachable.
