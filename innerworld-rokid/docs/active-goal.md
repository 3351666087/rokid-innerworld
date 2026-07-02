# Active Goal

Updated: 2026-07-02 14:13 Asia/Shanghai

## Objective

Long-term execution goal for Rokid "Mirror-See InnerWorld / Campus Memory Wall":

Build the real project framework and delivery chain, not just an environment demo. The final product is a Rokid glasses spatial memory layer opened on top of a real campus exhibition wall. It is not a normal guide app, not a PPT, and not a phone-only page.

## Final Agreed Direction

- A Windows host is the field control machine.
- The Windows host runs localhost/LAN Space Server, Web demo, Unity fallback, AI contract, write-back loop, field status panel, release packages, and evidence generation.
- Before hardware arrives, localhost and LAN are the source of truth.
- After hardware arrives, Rokid / AR Studio replaces only input and display.
- The data contract, mission state machine, service actions, write-back flow, AI schema/prompt, and evidence chain stay the same across Web, Unity fallback, Android fallback, and Rokid hardware.
- Field delivery should show a real spatial wall experience: A1 entry poster, A2 memory beacon, A3 write-back point, mission progress, service action, and User B seeing the new write-back beacon.

## Current Build Phase

Move from "environment and demo loop are runnable" to "main project framework and bulk implementation":

- Shared API/device contract.
- Mission state machine and runtime store.
- Server core modules instead of one large server file.
- Device bootstrap and AI contract checks.
- Web device/ops panel.
- Unity/Rokid protocol client.
- Rokid simulator and integration checks.
- Localhost-first server release and deploy dry-run chain.
- Printable field kit and release evidence.

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
- Ask the user for login windows, licenses, hardware access, server credentials, or system prompts when needed.
- This machine is a full Windows development environment with user-granted local and network permissions.

## Worker Participation

Active worker lanes:

- Web panel worker: `apps/web-demo/*`
- Unity protocol worker: `apps/unity-shell/Assets/Scripts/Protocol/*`
- Main thread: shared contract, server integration, checks, docs, packages, verification

## Guardrails

- Do not pivot into a generic campus tour.
- Do not collapse the project into a static web page.
- Do not make the phone the main artifact.
- Do not let Unity/Rokid/Web invent separate endpoint or state contracts.
- Do not package `data/runtime_state.json`, Unity `Library`, `node_modules`, `.git`, or large caches.
