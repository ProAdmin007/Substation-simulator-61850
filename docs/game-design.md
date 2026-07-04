# Game Design Document — PAC Engineer Substation Simulator

## 1. Premise & player fantasy

The player is a **Protection, Automation & Control (PAC) engineer** newly assigned to a 120 kV → 20 kV /
10 kV substation. The game is a first-person, browser-based 3D walkthrough-and-panel-interaction
simulation — not a shooter, not a builder. The core loop is: **walk to the right place, read the right
instrument, understand why something is in the state it's in, and take the correct action** — exactly the
job of a real PAC engineer. There is no combat, no timer pressure that punishes careful reading, and no
"try random buttons until something works" solution path: every blocked action explains *why*, every fault
has a diagnosable cause, and every scenario ends with the player having produced something a real engineer
would produce (a switching log, an event report, a restored comms link, a signed-off checklist).

**Design pillars**
1. **Realism over arcade.** Equipment states, interlocking, and protocols behave the way the research in
   `research.md` describes. Fantasy is only used for cosmetic branding (see §4), never for behavior.
2. **Mistakes teach.** A blocked or wrong action always surfaces the *why* — interlock reason, missing
   permit, wrong sequence — the same way a real bay controller or supervisor would.
3. **Instruments are the interface.** The player rarely "just clicks a breaker" — they read the SLD, read
   the IED, read the alarm list, and only then act. Reading is the primary skill being taught.
4. **Procedures over vibes.** Checklists, permits, and logs are first-class UI, not flavor text.

## 2. Areas the player can visit

- **120 kV yard/GIS zone** — outdoor AIS-style bays (or an indoor GIS room, per §7 visual notes) containing
  the line/transformer bays: breaker, disconnectors, earthing switch, CT/VT stands, busbar.
- **Transformer bay** — the 120/20 kV or 120/10 kV power transformer(s), with nameplate, temperature
  indication, and its own protection function set (differential, REF, overcurrent).
  visible from both the yard side and the MV room side.
- **MV switchgear room (10 kV / 20 kV)** — a row of metal-clad, compartmentalized panels (generic
  "Voltrix"/"Halvex"-style, see §4): incoming transformer feeder bay(s), outgoing distribution feeder bays,
  bus-coupler bay.
- **PAC/SCADA room** — relay/IED panels ("Greyhart"-style, see §4), patch panels representing the station
  bus/process bus fiber terminations, a test-set trolley (secondary injection simulator), and an
  engineering laptop station for SCD/config-adjacent tasks.
- **Control room HMI desk** — the SCADA/HMI overlay: single-line diagram with live status, alarm banner,
  event list, and remote control controls.

Areas are connected by simple corridors/doors; the emphasis is on the interactable stations, not open-world
exploration. Placeholder geometry (boxes/cylinders with labels) stands in for all of the above; see
`technical-design.md` for how real 3D models can later replace them without touching simulation logic.

## 3. Scenarios

Full step-by-step scripting lives in `scenarios.md`. This section describes player experience and intent.

### 3.1 Introduction / tutorial
The player is walked through the station by an in-game "handover" briefing (text/UI, no NPC required for
the prototype). They learn to identify the yard bay, the transformer, the MV room, and the PAC room; open
the single-line diagram (SLD) overlay; and read the current status of each major primary component
(breaker/disconnector/earth-switch positions, transformer loading, bus voltage). Success condition: the
player can state the current normal operating state of the station before touching anything.

### 3.2 Switching operation
The player is given a switching schedule (e.g. "isolate feeder bay F2 for maintenance") and must execute it
in the correct order using the bay control panel and yard/MV equipment. Interlocking blocks unsafe or
out-of-order actions (see `research.md` §3) with an explanatory message rather than silently failing. On
success, the player has a completed switching log with timestamps.

### 3.3 Protection trip
A fault is injected on a 20 kV feeder (overcurrent/earth fault). The bay IED trips the breaker
automatically — the player does not prevent this, they **investigate it afterwards**: read the IED's LED
pattern, open the event list, inspect a (simplified) disturbance record, determine probable cause, then
acknowledge/reset the alarm following procedure and record a short "reason for trip" report. This is the
scenario that most directly exercises the IEC 61850 logical-node model (PTOC → PTRC → XCBR → RDRE) end to
end.

### 3.4 PAC fault (comms troubleshooting)
Communication between a bay IED and SCADA is lost (simulated GOOSE/MMS/network fault, possibly a PRP
single-LAN-path failure vs. a real outage — see `research.md` §7). The player uses the network/comms view to
check station-bus vs. process-bus status, PRP port health per device, and GOOSE/MMS link state, narrowing
down whether it's a physical link, a configuration mismatch, or a logic fault, then fixes the underlying
(simulated) cause rather than just "reconnecting."

### 3.5 Commissioning / test
The player is handed a new/modified bay to commission: compare the SLD/bay drawing against the modeled
physical installation, run a simplified secondary-injection test against the bay's protection function
(verify pickup and that the correct trip output operates), verify status inputs and output contacts, and
complete a signed-off commissioning checklist item by item.

Only 3.2 and 3.3 are required to be fully playable in the first prototype slice; 3.1, 3.4, and 3.5 are
designed now and implemented as time allows (see `technical-design.md` prototype scope).

## 4. Visual style & fictional equipment brands

**Overall style**: realistic, technical, industrial — matte greys/off-whites, safety yellow/orange
warning stripes, engraved-look labels, cable trays, visible earthing braid, mimic-diagram silkscreens.
Explicitly **not** cartoon-shaded, not glossy/sci-fi. Panel proportions, compartment layout, and control
conventions are drawn from the ABB/Eaton/GE research in `research.md` §4–5, but no real logo, wordmark, or
trademarked panel design is reproduced. Instead, the game uses three **original fictional equipment
brands**, each visually *inspired by* one real vendor's industrial language without copying it:

| Fictional brand | Real-world inspiration | Product line in-game | Visual identity |
|---|---|---|---|
| **Voltrix** | ABB-style | MV switchgear — "Voltrix UniLine" panels; bay controller "Voltrix BCU-500" | Dark charcoal panel bodies, a bold red square corner mark (own geometry, not ABB's), condensed geometric sans-serif wordmark, brushed-metal-look door hardware. |
| **Halvex** | Eaton-style | MV switchgear/RMU — "Halvex SecureRing" | Off-white/light-grey panels with a mid-blue accent band, a rounded shield-shaped mark (own shape), friendly rounded sans-serif wordmark, emphasis on large clear position-indicator windows. |
| **Greyhart** | GE-style | Protection IEDs — "Greyhart Sentinel-600 series" relays, merging units | Dark bezel front panel, a blue hexagon mark (own geometry, distinct from GE's roundel), technical monospace-adjacent wordmark, amber/green/red LED cluster matching real IED conventions from `research.md` §5. |

These are **original marks and names** designed only to evoke the *category* of industrial branding
(the same way generic stock-photo products do) — no shape, color combination, or wordmark is copied from an
actual registered trademark. Nameplates, front panels, and cabinet labels in the 3D scene use these three
brands consistently instead of any real manufacturer name.

## 5. UI/UX for HMI, IED panels, and logs

- **SLD/SCADA overlay**: a 2D panel (React overlay on top of the 3D view) showing the single-line diagram
  with live-colored status (green = closed/energized, grey = open/de-energized, red = tripped/alarmed),
  clickable elements that jump the 3D camera to that bay, and a persistent alarm banner.
- **IED front panel**: modeled as an interactable 3D object; clicking it opens a detail view showing LEDs,
  a simplified display readout (measured values, target/trip messages), and buttons to navigate its event
  list and disturbance record placeholder.
- **Event/alarm log**: a persistent, filterable list (time, source, description, cause, acknowledged
  state) — the same tool used across all scenarios, reinforcing that logs are the source of truth.
- **Test-set panel**: a simplified secondary-injection UI (set a test current/voltage, "inject", observe
  whether the IED picks up/trips at the expected value and time) for the commissioning scenario.
- Every blocked/invalid action shows a short, specific reason (e.g. "Disconnector Q1 cannot open: breaker
  QA1 is still closed") rather than a generic error — this is the primary teaching mechanism.

## 6. Educational framing

- No scenario can be "won" by trial and error faster than a real engineer could reason it out; blocked
  actions always explain the rule being enforced, tying back to `research.md`.
- Checklists and logs are shown as explicit UI artifacts (not just internal state), so the player has to
  produce the same paperwork a real engineer would.
- The game favors **explaining consequences before they happen** (e.g. a warning when the player is about
  to attempt something that would be blocked, referencing the applicable safety rule) over letting the
  player fail repeatedly without context.
- Safety procedure (five safety rules / permit-to-work, `research.md` §11) is presented as the reason
  *why* the switching sequence must be followed, not just a lockout on the UI.

## 7. Assumptions

- The 120 kV side is represented primarily as an AIS-style outdoor yard in the prototype (simpler to model
  with placeholder geometry than a GIS building); a GIS variant is a valid future reskin since the
  simulation model doesn't care which physical form the yard takes.
- Vendor-inspired styling (§4) is a deliberate design choice, not a legal opinion — if this project were
  ever distributed commercially, a trademark/copyright review of the fictional brands would still be
  prudent.
- The tutorial in the prototype is UI-driven (text/overlay prompts), not a voiced or animated NPC.
