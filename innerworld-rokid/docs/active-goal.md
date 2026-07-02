# Active Goal

Updated: 2026-07-02 19:10 Asia/Shanghai

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
- Web device/ops panel.
- Unity/Rokid protocol client.
- Rokid simulator and integration checks.
- Compile-safe Rokid SDK adapter boundary with `ROKID_UXR` as the only future SDK compile symbol.
- Localhost-first server release and deploy dry-run chain.
- Printable field kit and release evidence.

## Current Checkpoint

- Latest implementation checkpoint: Rokid SDK conditional adapter boundary.
- Unity controller now enters hardware/fallback selection through `RokidAdapterResolver.Resolve(...)`.
- `IRokidInputStateSink` keeps base URL, connection status, and anchor-hit state flowing through both fallback and future hardware adapters.
- `RokidUxrInputSource.cs` and `RokidUxrOverlayRenderer.cs` are fully wrapped in `#if ROKID_UXR`; no vendor SDK payload is committed.
- Checks now require the adapter boundary in `check:mainline`, `check:contract`, and `check:unity`.
- Kepler reviewed this checkpoint and returned OK to commit/push. Non-blocking caveat to carry forward: next hardware checkpoint should distinguish "ROKID_UXR boundary/stub compiled" from "real Rokid SDK package installed and live-bound."

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
- Unity protocol worker: `apps/unity-shell/Assets/Scripts/Protocol/*`
- Main thread: shared contract, server integration, checks, docs, packages, verification

## Guardrails

- Do not pivot into a generic campus tour.
- Do not collapse the project into a static web page.
- Do not make the phone the main artifact.
- Do not let Unity/Rokid/Web invent separate endpoint or state contracts.
- Do not package `data/innerworld.sqlite`, `data/runtime_state.json`, Unity `Library`, `node_modules`, `.git`, or large caches.
