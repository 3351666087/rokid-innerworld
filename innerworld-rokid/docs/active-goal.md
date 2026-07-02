# Active Goal

Updated: 2026-07-03 00:08 Asia/Shanghai

## Objective

Long-term execution goal for Rokid "Mirror-See InnerWorld / Campus Memory Wall":

Build the real project framework and delivery chain, not just an environment demo. The final product is a Rokid glasses spatial memory layer opened on top of a real campus exhibition wall. It is not a normal guide app, not a PPT, and not a phone-only page.

## Final Agreed Direction

- A Windows host is the field control machine.
- The Windows host runs localhost/LAN Space Server, Web demo, Unity fallback, AI contract, write-back loop, field status panel, release packages, and evidence generation.
- Before hardware arrives, localhost and LAN are the source of truth.
- After hardware arrives, Rokid / AR Studio replaces only input and display.
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

## Current Checkpoint

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
- Kepler's next recommended P0 is now recorded as an executable real Rokid adapter checklist in `docs/rokid-device-integration.md`: bind RKCameraRig, RKInput 3DoF ray, image tracking target library, SLAM/head tracking heartbeat, PointableUI handoff, overlay rendering, and hardware proof to the existing adapter boundary without changing Space API or SQLite contracts.

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

- Kepler reviewer: the special long-line subagent for mainline audit. Keep it as the persistent reviewer, feed every major implementation checkpoint back to it, and adopt or explicitly record its findings before pushing large direction changes.
- Web panel worker: `apps/web-demo/*`
- Unity controller/protocol workers: `apps/unity-shell/Assets/Scripts/InnerWorldDemoController.cs` and `apps/unity-shell/Assets/Scripts/Protocol/*`
- Field-kit/check workers: `pdf-renderer/src/main/java/com/rokid/innerworld/FieldKitPdf.java`, `server/space-server/check-field-markers.js`, `server/space-server/check-field-acceptance.js`, and release verification hooks.
- Main thread: shared contract, server integration, checks, docs, packages, verification

## Guardrails

- Do not pivot into a generic campus tour.
- Do not collapse the project into a static web page.
- Do not make the phone the main artifact.
- Do not let Unity/Rokid/Web invent separate endpoint or state contracts.
- Do not package `data/innerworld.sqlite`, `data/runtime_state.json`, Unity `Library`, `node_modules`, `.git`, or large caches.
