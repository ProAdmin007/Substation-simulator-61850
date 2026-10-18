# Substation Simulator 61850 — PAC Engineer Console

A browser-based 3D educational simulation where the player acts as a **Protection, Automation & Control
(PAC) engineer** at a 120 kV → 20 kV / 10 kV substation ("Meadow Creek Substation"): reading single-line
status, running a safe switching sequence under interlocking, investigating a protection trip via an IED's
LEDs/event list/disturbance record, and (documented, not yet built) troubleshooting a PAC communications
fault and running a commissioning test.

This project was built research-first: see `docs/research.md` for the sourced technical background before
any design or code decisions were made.

## Documentation

- [`docs/research.md`](docs/research.md) — sourced research on the PAC engineer role, substation
  architecture, IEC 61850 (Edition 2.1), GOOSE/MMS/Sampled Values, merging units/PRP, representative
  ABB/Eaton/GE equipment, and safety procedures.
- [`docs/game-design.md`](docs/game-design.md) — player fantasy, scenarios, visual style, and the three
  fictional equipment brands ("Voltrix"/"Halvex"/"Greyhart") used in place of any real manufacturer.
- [`docs/technical-design.md`](docs/technical-design.md) — tech stack rationale, project structure, the
  simulation data model, engine/interlocking/protection logic, and 3D scene composition.
- [`docs/scenarios.md`](docs/scenarios.md) — step-by-step scripted definitions of all five scenarios.
- [`docs/devlog.md`](docs/devlog.md) — running log of decisions and things learned while building this.

## Tech stack

Vite + React 19 + TypeScript (strict) + React Three Fiber / drei (3D) + Zustand (state) + Vitest
(simulation-core unit tests). No backend — everything runs client-side. See `docs/technical-design.md` §1
for the rationale.

## Getting started

```bash
npm install
npm run dev       # starts the Vite dev server, prints a local URL (typically http://localhost:5173)
```

Other scripts:

```bash
npm run build     # tsc -b (type-check) + production build
npm run test      # Vitest — unit tests for the simulation core (interlocking, protection trip flow)
npm run lint      # oxlint
npm run preview   # preview a production build locally
```

## How to play (current prototype)

The simulated station is **Onderstation Hoogeveen-Toldijk** (120 kV → 20 kV), with feeders named after
Hoogeveen districts (Buitenvaart, Wolfsbos).

1. On load, dismiss the handover briefing (tutorial) overlay.
2. **Controls** (matching the reference project): click into the 3D view to lock the mouse, then —
   **WASD / arrow keys** walk · **mouse** look · **Shift** sprint · **E** operate (or close a panel) ·
   **B** open the IED relay · **F** toggle the SLD · **Z** toggle 3D labels · **Esc** close / release the
   mouse. Walk up to equipment until a hint appears at the crosshair. (While the mouse is locked, press Esc
   to free the cursor before clicking the always-visible side panels.)
3. **Switching scenario**: select "20 kV Veld Buitenvaart", then in the bay control panel: open breaker
   `QA2`, then disconnector `QS2`, then close earthing switch `QE2`. Try it out of order first — it will be
   blocked with a specific reason (interlocking).
4. **Protection-trip scenario**: click "Aardfout op Buitenvaart injecteren" (bottom-left). The feeder's
   breaker trips automatically; open its IED to read its LEDs, measured current, event list, and disturbance
   record, then acknowledge the alarm.
5. **PAC comms-fault scenario**: use the "Scenario 4" panel to inject a PRP LAN failure or a config mismatch
   on the Wolfsbos IED, then open the **Network / Comms** view (walk to the SCADA gateway in the control
   building, press E) to diagnose and fix it.

## Current limitations / what's stubbed

This slice implements the introduction, switching, protection-trip, and **PAC comms-fault** scenarios
fully. **The commissioning/test scenario (Scenario 5)** is designed in `docs/scenarios.md` but not yet
implemented.

The PAC comms-fault scenario (Scenario 4) is playable: use the "Scenario 4" panel to inject a PRP LAN
failure or a config mismatch on Feeder F2's IED, then walk into the control building, press **E** on the
SCADA gateway to open the **Network / Comms** view, and diagnose whether it's a PRP-tolerated link failure
(no outage — schedule a repair) or a real report-control-block config fault (correct the configuration).

Other explicit simplifications (see `docs/research.md`'s closing notes and `docs/technical-design.md` §6-7
for the reasoning):

- No real GOOSE/MMS/Sampled-Values wire encoding — the engine models the *shape* of the IEC 61850 logical
  layer (Logical Devices/Nodes, Common Data Classes, control blocks) and the trip/interlocking behavior, not
  a byte-accurate protocol implementation.
- Protection timing is instantaneous (no ramping toward a time-delay setting); a fault immediately produces
  a fault current well above pickup.
- All equipment visuals are placeholder primitives (boxes/cylinders with text labels), not real 3D models —
  intentionally, so real models can be swapped in later without touching simulation logic (see
  `docs/technical-design.md` §1/§8).
- Vendor branding ("Voltrix"/"Halvex"/"Greyhart") is original, fictional, and only *inspired by* ABB/Eaton/GE
  industrial styling — no real logos, wordmarks, or panel designs are reproduced.
- The 120 kV yard's CT stands and disconnectors are scenery (no separate interactable model instances yet)
  — only the breaker per yard bay is wired to the simulation, matching the current data model.
- Cable routes (overhead HV jumpers and the ground-level power/process-bus/station-bus stripes) are
  hand-placed constants matching the fixed demo topology, not a player-editable routing tool.

## Assumptions

- IEC 61850 Edition 2.1's logical-node/CDC vocabulary is treated as equivalent to the well-documented
  Edition 2 model for modeling purposes — Edition 2.1 is a consolidation of Edition 2 + Amendment 1, not a
  new vocabulary (see `docs/research.md` §8).
- The demo topology ("Meadow Creek Substation") is a single hand-authored instance sized for the prototype
  (2 bays at 120 kV, 3 bays at 20 kV, 1 transformer) — not a general-purpose substation editor.
- This is an educational simulation, not a certified protection/SCADA engineering tool.

---

<div align="center">

## ☕ Support

<a href="https://ko-fi.com/proadmin007" target="_blank"><img height="48" src="https://storage.ko-fi.com/cdn/kofi2.png?v=6" alt="Buy Me a Coffee at ko-fi.com" /></a>

</div>
