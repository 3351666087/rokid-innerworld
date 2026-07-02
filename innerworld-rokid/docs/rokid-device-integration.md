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
