# InnerWorld Demo Plan: Campus Hidden Layer

This document records the proposed final demo narrative for teammate review and Codex alignment. It does not replace the current P0 goal. It packages the existing A1/A2/A3 real-device loop into a clearer product story, then adds a controlled Sky Pin as the open-world extension preview.

## One-Line Demo

A judge wears Rokid glasses, opens a hidden campus layer from a real exhibition wall, reads a spatial memory, writes a TimeMark, sees another user read it back, and finally discovers a high-heat Sky Pin that previews open-world 3D pins.

## Why This Demo

The current codebase is strongest on the P0 hardware and field-acceptance lane:

- one real campus wall
- A1 spatial entry
- A2 memory read
- A3 TimeMark write-back
- User B readback
- Station Pro / Rokid real-device path
- operator plan, field acceptance, and hardware-ready guardrails

The demo should respect that work. The open-world idea should appear as an extension layer, not as a replacement for the proven wall loop. This keeps the project easy to explain to judges: first prove the controlled spatial memory loop, then show how the same model can expand into campus-scale pins.

## Five-Scene Flow

### Scene 1: A1 Spatial Entry

The judge approaches a real campus wall. A1 acts as the trusted entry anchor for this physical location. The glasses open the InnerWorld hidden layer for that site.

Role of Spatial URL: it is the location entry protocol. It means a physical place can bind to a digital spatial layer. It is not presented as a full marketplace in P0.

### Scene 2: A2 Memory Read

The judge moves focus to A2. A memory card, audio cue, or visual fragment appears as a spatial layer, not as a flat web page. The memory can use premium spatial-card styling, but the behavior remains bounded to the wall.

Role of AR: it turns the physical wall into a memory surface.

### Scene 3: A3 TimeMark Write-Back

The judge writes a TimeMark at A3. The TimeMark can contain text and, in later UI, an optional image. It is attached to this location and mission context.

Role of Pin / TimeMark: it is the content unit left in space. It is not a generic social feed in P0.

### Scene 4: User B Readback

The demo switches to User B. User B reads back the TimeMark left by the first user. This proves the memory is not only a local visual effect. It is a persistent spatial record another person can encounter.

Role of the multi-user loop: it proves that InnerWorld can be inherited and revisited.

### Scene 5: Whale Cloud Sky Pin

After the wall loop, the judge sees a high-heat Sky Pin, such as the Whale Cloud, floating far above or outside the wall context. It uses the same semantic pin data model but is marked as a controlled demo, not open UGC.

Role of open world: it previews how TimeMarks can expand from trusted wall anchors into campus-scale 3D pins.

## Concept Boundaries

Spatial URL means: the entry route from a physical location into its hidden layer.

Pin / TimeMark means: the spatial content unit users can read, write, revisit, and eventually attach media to.

Open world means: the long-term expansion direction where pins can exist beyond one wall, using controlled geo/spatial placement first and reviewed UGC later.

A1/A2/A3 wall means: the P0 proof structure that makes the demo reliable, testable, and hardware-verifiable.

## P0 / P1 / P2 Scope

P0 must keep:

- one real wall
- A1 entry
- A2 memory read
- A3 TimeMark write-back
- User B readback
- Station Pro / Rokid hardware path
- Space API, field acceptance, and hardware-ready guardrails
- controlled semantic Sky Pin as an extension preview only

P1 can add:

- more polished spatial-card UI
- better near/far layout
- richer gesture feedback
- optional TimeMark media display
- controlled campus hidden-layer locations

P2 should remain reference only until P0 is accepted:

- open UGC
- broad campus or city routing
- merchant dashboards
- public social feeds
- full content editor
- commercial task systems

## Implementation Alignment

The existing teammate hardware lane remains the mainline proof. The controlled Sky Pin work should complement it:

- A1/A2/A3 stay as anchored pins and field markers.
- `semantic_pins` can demonstrate the future open-world data model.
- `/api/pins/nearby` can return both anchored pins and semantic pins.
- Unity can consume `geo`, `spatial`, `media`, and `social` metadata when the visual layer is ready.
- The Sky Pin must stay labeled as controlled demo content until moderation, abuse prevention, and open UGC rules are implemented.

## Recommended Pitch

InnerWorld is not a normal guide app and not a phone page. It is a spatial memory layer over real places. In the demo, the wall proves reliability; the TimeMark proves persistence; User B proves shared memory; the Whale Cloud proves that the same mechanism can grow into an open-world 3D pin system.
