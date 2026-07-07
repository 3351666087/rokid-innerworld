# Shiyao Scan Scene Handoff Contract

Status: local contract for merging `shiyao` scan/logo/QR discovery with the concrete Campus Hidden Layer scene.

## Current physical constraint

The real Rokid hardware is with teammate `shiyao`. This branch must not claim live hardware-ready from local rehearsal. Local work focuses on the concrete scene opened after shiyao's scan/logo scene.

## Unity seam

Shared seam:

```csharp
InnerWorld.Rokid.Concrete.ISceneHandoffReceiver.EnterConcreteScene(SceneHandoffData data)
```

`SceneHandoffData` version: `innerworld-shiyao-handoff/v1`.

Required fields:

- `scene_id`: `A1`, `A2`, or `A3`; invalid values fail soft to `A1`.
- `anchor_id`: scan/logo/QR anchor id from shiyao scene.
- `anchor_position`, `anchor_rotation`, `wall_normal`: anchor-relative pose; invalid pose triggers fallback and keeps the no-hardware-claim banner.
- `origin_mode`: `anchor_relative`, `gps`, or `fallback`.
- `event_id`: selected event/scene id.
- `gps_latitude`, `gps_longitude`: optional flavor/location context.
- `confidence`: scan confidence, `0..1`.
- `fallback`: true when scan pose is not trusted.

## Concrete scene content

After handoff, this branch renders `data/space_demo.json` `scene_actions`:

1. `A1_CHECK_IN_STAMP`: user opens the hidden layer from the real wall logo/poster.
2. `A2_MEMORY_VIEW_AND_COLLECT`: user reads a spatial memory fragment and collects the year clue.
3. `A3_TIMEMARK_WRITE_BACK`: user leaves one sentence pinned to A3.
4. `USER_B_READBACK_PASS`: User B reads the same A3 TimeMark from the same physical wall position.

## Merge policy

- Do not edit shiyao's scene files directly from this branch.
- Keep concrete scene behavior data-driven through `space_demo.json` and `merge_map.json`.
- Keep hardware-ready false unless trusted A1/A2/A3, A3 write-back, User B readback, and `/api/field/acceptance` pass on the real device.
- Sky Pin remains controlled preview only and cannot be P0 evidence.
