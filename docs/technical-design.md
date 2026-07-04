# Technical Design Document

## 1. Tech stack

| Concern | Choice | Rationale |
|---|---|---|
| Build tool | **Vite** | Fast dev server/HMR, trivial `npm run dev`, first-class TypeScript support. |
| Language | **TypeScript** (strict) | Type-safe modeling of the substation domain; catches invalid state transitions at compile time where possible. |
| UI framework | **React 19** | Needed anyway for R3F; also drives all 2D overlay panels (HMI/SLD, IED front panel, event log, test-set). React 19 specifically because current `@react-three/fiber`/`@react-three/drei` majors (v9/v10) require it as a peer dependency. |
| 3D | **React Three Fiber (`@react-three/fiber`) + `@react-three/drei`** | A large fraction of this game's surface is 2D UI layered over a 3D scene. R3F lets the 3D scene and the DOM UI share one component tree and one state store — a much better fit here than Babylon.js's separate scene-graph API or vanilla Three.js's imperative style. `drei` supplies `OrbitControls`, `Text`, and primitives so camera control and 3D labels don't need to be hand-rolled. |
| State | **Zustand** | Minimal boilerplate, plugs directly into React/R3F via hooks, easy to expose one `useSubstationStore` consumed by both 3D components and 2D panels. |
| Styling | Plain CSS modules | No design-system dependency needed for an industrial HMI look; keeps the bundle light. |
| Testing (simulation core) | **Vitest** | Ships with Vite, zero extra config, used to unit-test the engine/interlocking/protection logic independently of any 3D rendering. |
| No backend | Everything runs client-side; no server, no persistence beyond in-memory session state. |

Placeholder 3D geometry (boxes, cylinders, simple extrusions) stands in for real models. Every 3D component
takes its visual representation as a swappable piece (a `<Placeholder>` today, a `<GltfModel src=... />`
later) so replacing a placeholder with a real asset never touches simulation logic — the R3F component only
ever reads from the Zustand store and renders whatever visual is configured for that entity.

## 2. Project structure

```
Substation-simulator-61850/
  docs/
    research.md
    game-design.md
    technical-design.md
    scenarios.md
    devlog.md
  src/
    main.tsx                  # ReactDOM root
    App.tsx                   # Layout: <Canvas> (3D) + overlay UI panels
    simulation/
      model/                  # Pure TS types (no logic) — see §3
        topology.ts           # Substation, VoltageLevel, Bay, Busbar
        switchgear.ts         # Breaker, Disconnector, EarthingSwitch
        transformer.ts        # Transformer
        measurement.ts        # CT, VT, MergingUnit, SvControlBlock
        iec61850.ts            # LogicalDevice, LogicalNode, LnClass, DataObject, GoCB/SvCB/ReportControlBlock
        network.ts             # NetworkBus, CommsLink, PrpPortStatus
        events.ts              # Alarm, Event, ScadaPoint
        index.ts               # barrel re-export
      engine/
        substationEngine.ts    # command handling: openBreaker(), closeDisconnector(), etc. Pure functions
                                # taking (state, command) -> new state + emitted events
        interlocking.ts        # canOpen/canClose predicate functions, §5
        protectionEngine.ts    # fault injection -> LN evaluation -> trip flow, §6
        commsSimulator.ts      # network/PRP/GOOSE/MMS status simulation for the PAC-fault scenario
        eventLog.ts            # append-only event/alarm log helpers (timestamping, formatting)
      scenarios/
        types.ts               # ScenarioDefinition shape (see scenarios.md)
        tutorial.ts, switching.ts, protectionTrip.ts, pacFault.ts, commissioning.ts
        runner.ts               # drives a ScenarioDefinition against the engine/store
      data/
        demoSubstation.ts       # the one hand-authored topology instance used by the prototype
      store/
        useSubstationStore.ts   # zustand store: state + actions, wraps substationEngine calls
    scene3d/
      SubstationScene.tsx       # top-level <Canvas> content: rooms, camera/player controller, lighting
      Yard120kV.tsx             # outdoor/AIS-style yard bay group
      TransformerBay.tsx
      MvSwitchgearRoom.tsx      # row of Voltrix/Halvex-style panel meshes
      ControlRoom.tsx           # Greyhart-style IED panels, patch panel, test-set trolley
      primitives/               # Placeholder mesh components (Cabinet, Busbar, Breaker, Disconnector, Ct, ...)
      PlayerController.tsx      # simple first-person or orbit navigation
    ui/
      HmiOverlay.tsx            # SLD + live status + alarm banner
      IedFrontPanel.tsx         # LEDs, display, event list, disturbance-record placeholder
      EventAlarmList.tsx
      BayControlPanel.tsx       # breaker/disconnector/earth-switch controls + interlock messages
      TestSetPanel.tsx
      TutorialOverlay.tsx
    styles/
  public/
  package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html
  README.md
```

## 3. Simulation data model

The model tracks IEC 61850 Edition 2.1 semantics reasonably closely (Logical Devices, Logical Nodes, Common
Data Classes — see `research.md` §8) without implementing real wire-level MMS/GOOSE/SV encoding. All types
are plain TypeScript interfaces/discriminated unions; the engine operates on them with pure functions so
state transitions stay testable and predictable.

### 3.1 Physical/topology layer

```ts
interface Substation {
  id: string;
  name: string;
  voltageLevels: VoltageLevel[];
}

interface VoltageLevel {
  id: string;
  kv: 120 | 20 | 10;
  busbars: Busbar[];
  bays: Bay[];
}

interface Busbar {
  id: string;
  status: 'energized' | 'de-energized';
}

type BayType = 'line' | 'transformer' | 'feeder' | 'coupler';

interface Bay {
  id: string;
  name: string;
  type: BayType;
  breaker: Breaker;
  disconnectors: Disconnector[];
  earthingSwitches: EarthingSwitch[];
  cts: CurrentTransformer[];
  vts: VoltageTransformer[];
  mergingUnit?: MergingUnit;
  ied?: Ied;
}

interface Breaker {
  id: string;
  status: 'open' | 'closed' | 'tripped';
}

interface Disconnector {
  id: string;
  status: 'open' | 'closed' | 'moving';
}

interface EarthingSwitch {
  id: string;
  status: 'open' | 'closed';
}

interface Transformer {
  id: string;
  name: string;
  ratioKv: [120, 20 | 10];
  status: 'in-service' | 'out-of-service';
  loadingPercent: number; // simplified loading simulation, no thermal modeling
}
```

### 3.2 Measurement & process bus layer

```ts
interface CurrentTransformer { id: string; bayId: string; ratio: string; }
interface VoltageTransformer { id: string; bayId: string; ratio: string; }

interface SvControlBlock {
  id: string;
  samplesPerCycle: 80 | 256; // per IEC 61850-9-2 common rates
}

type PortStatus = 'up' | 'down';

interface MergingUnit {
  id: string;
  bayId: string;
  svControlBlocks: SvControlBlock[];
  prpPorts: [PortStatus, PortStatus]; // LAN A, LAN B
}
```

### 3.3 IEC 61850 logical layer (per IED)

```ts
type LnClass =
  | 'LLN0' | 'LPHD'                 // mandatory system nodes
  | 'XCBR' | 'XSWI'                 // switchgear
  | 'CSWI'                          // control
  | 'MMXU'                          // measurement
  | 'PTOC' | 'PIOC' | 'PDIF' | 'PTRC' // protection
  | 'RBRF' | 'RREC' | 'RDRE' | 'RSYN' // protection-related
  | 'GGIO';                         // generic I/O

interface DataObject {
  name: string;           // e.g. "Pos", "Str", "Op", "A"
  cdc: 'DPC' | 'ACD' | 'ACT' | 'MX' | 'SPS';
  value: unknown;         // shape depends on cdc; see engine for concrete usage
}

interface LogicalNode {
  class: LnClass;
  instanceId: string;
  dataObjects: DataObject[];
}

interface LogicalDevice {
  id: string;
  logicalNodes: LogicalNode[]; // always includes one LLN0 + one LPHD
}

type VendorStyle = 'voltrix' | 'halvex' | 'greyhart'; // fictional in-game brands, see game-design.md §4

interface Ied {
  id: string;
  name: string;
  vendorStyle: VendorStyle;
  logicalDevices: LogicalDevice[];
  commsStatus: CommsStatus;
  leds: LedState[];
  goCbs: GoCb[];
  svCbs: SvCbSubscription[];
  reportControlBlocks: ReportControlBlock[];
}

interface LedState { id: string; label: string; color: 'green' | 'amber' | 'red'; mode: 'off' | 'steady' | 'blinking-unack' | 'blinking-ack'; }
interface GoCb { id: string; purpose: 'trip' | 'interlock' | 'blocking'; }
interface SvCbSubscription { id: string; mergingUnitId: string; }
interface ReportControlBlock { id: string; buffered: boolean; }
```

### 3.4 Network layer

```ts
type BusKind = 'station-bus' | 'process-bus';
type BusProtocol = 'GOOSE' | 'MMS' | 'SV';

interface NetworkBus {
  id: string;
  kind: BusKind;
  protocol: BusProtocol;
  prp: true; // both buses are modeled as redundant PRP (IEC 62439-3) networks
}

interface ScadaPoint { id: string; ref: string; value: unknown; quality: 'good' | 'invalid' | 'questionable'; }

interface CommsLink {
  id: string;
  protocol: 'GOOSE' | 'MMS' | 'IEC104' | 'Modbus';
  status: 'ok' | 'lost' | 'degraded';
}

type CommsStatus = { stationBus: 'ok' | 'lost'; processBus: 'ok' | 'lost' };
```

### 3.5 Alarms & events

```ts
interface Alarm {
  id: string;
  timestamp: string; // ISO 8601
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
}

interface Event {
  id: string;
  timestamp: string;
  source: string;   // e.g. IED id, bay id
  description: string;
  cause: string;     // required — every event must state why it happened
}
```

## 4. Engine architecture

`substationEngine.ts` exposes a single entry point:

```ts
function applyCommand(state: SubstationState, command: Command): { state: SubstationState; events: Event[] }
```

Commands are a discriminated union (`OpenBreaker`, `CloseBreaker`, `OpenDisconnector`, `CloseDisconnector`,
`OpenEarthingSwitch`, `CloseEarthingSwitch`, `AcknowledgeAlarm`, `InjectFault`, `SetPrpPortStatus`, ...).
`applyCommand` is pure: given the same state and command it always produces the same result, which keeps
the engine trivially unit-testable with Vitest and keeps React/Zustand a thin wrapper (the store just calls
`applyCommand` and replaces its state).

Every command that changes a switching-device status is first checked by `interlocking.ts`; every command
is logged via `eventLog.ts` with a cause string, even successful ones (so the event list is a complete
audit trail, not just a fault log).

## 5. Interlocking

Pure predicate functions, one per operation, returning a reason instead of a boolean so the UI can explain
blocks (per `research.md` §3 and `game-design.md` §5):

```ts
type InterlockResult = { allowed: true } | { allowed: false; reason: string };

function canOpenDisconnector(disconnector: Disconnector, bay: Bay): InterlockResult;
function canCloseBreaker(breaker: Breaker, bay: Bay): InterlockResult;
function canCloseEarthingSwitch(sw: EarthingSwitch, bay: Bay, voltageLevel: VoltageLevel): InterlockResult;
```

Core rules encoded (traced directly to `research.md` §3):
- A disconnector may only move while its bay's breaker is `open`.
- A breaker may only close while its bay's disconnectors are in a valid position for the intended state
  (closed for service, or open/earthed for maintenance) — never mid-`moving`.
- An earthing switch may only close once the relevant section is verified de-energized (breaker open,
  disconnectors open) — modeling the real de-energization sequence: breaker open → disconnector open →
  (verify) → earth switch close.

## 6. Protection & trip flow

`protectionEngine.ts` implements the flow described in `research.md` §6–§8:

1. A scenario calls `injectFault(bayId, faultType)` (`faultType`: `overcurrent` | `earth-fault`).
2. The bay's `MergingUnit` is treated as publishing the fault current as Sampled Values (simulated — no
   real SV encoding, just a value on the bay's `MMXU` measurement data object).
3. The IED's `PTOC` (or `PIOC`) logical node evaluates the measured value against its configured setting
   (pickup current, time delay). If exceeded, it sets its `Str` (start) data object, then after the time
   delay sets `Op` (operate).
4. `PTRC` (trip conditioning) collects the operate signal and issues a trip.
5. A `GoCb` publishes the trip command (simulated GOOSE) on the station bus; the bay's `XCBR`/`Breaker`
   transitions to `tripped`.
6. `RDRE` (disturbance recorder) records a simplified disturbance-record stub (fault type, timestamp, peak
   measured value) — enough for the player to review, not a full COMTRADE implementation.
7. The IED's `leds` update (e.g. a red "TRIP" LED goes to `blinking-unack`); an `Event` and `Alarm` are
   appended to the log with a `cause` string.
8. The player acknowledges the alarm (`AcknowledgeAlarm` command) and can reset the breaker only after
   acknowledgment — mirroring real trip-reset procedure.

## 7. Communications simulation (PAC-fault scenario)

`commsSimulator.ts` models `CommsLink` and `MergingUnit.prpPorts` state independently, so a scenario can:
- Flip one PRP port (`LAN A` or `LAN B`) to `down` on a single device — this should **not** by itself break
  `commsStatus` (both buses stay `ok`) because the redundant path still carries traffic, per `research.md`
  §7's explanation of PRP's zero-recovery-time redundancy.
- Set a `CommsLink` to `lost` or introduce a configuration mismatch (e.g. an IED subscribed to the wrong
  `SvCb`/`GoCb` id) to actually break communication — the fault the player must diagnose and fix.
This separation is what lets the PAC-fault scenario teach "redundancy tolerates one failure, but not
everything is a hardware problem" without a deep network-simulation implementation.

## 8. 3D scene composition

- `SubstationScene.tsx` mounts the `<Canvas>` and composes `Yard120kV`, `TransformerBay`,
  `MvSwitchgearRoom`, and `ControlRoom` as sibling groups positioned along one walkable axis.
- Every interactive primitive (`Breaker`, `Disconnector`, `EarthingSwitch`, `IedFrontPanel` mesh) is a thin
  R3F component that reads its status from `useSubstationStore` and dispatches commands on click/pointer
  events — no simulation logic lives in scene3d/, only rendering and input.
- Placeholder primitives use simple geometry + color coding consistent with `game-design.md` §4/§7 (status
  colors: green closed/energized, grey open, red tripped/alarm) and are structured so a later
  `<GltfModel src="...">` swap-in requires no changes to the store or engine.
- Camera/navigation: `drei`'s `OrbitControls` for the prototype (not `PointerLockControls`/first-person
  walk as originally sketched) — pointer-lock needs an explicit user gesture to capture the pointer and is
  awkward to drive and verify (including via automated browser testing), while orbit controls give the same
  "look around the station and click things" experience with no capture step. First-person walking remains
  a reasonable later enhancement if the game grows beyond a single-room layout. Equipment labels use drei's
  `<Text>` (a WebGL-rendered mesh, not a DOM node, so it isn't reachable by DOM-based tooling or screen
  readers) — every interaction reachable only via a 3D-mesh click also has a plain-DOM equivalent in the
  `ui/` overlay (e.g. the IEDs list in `HmiOverlay`), both for accessibility/testability and because it's
  simply a better HMI pattern to let the player open a device from a list as well as by clicking it in the
  scene.

## 9. State management wiring

`useSubstationStore.ts` (Zustand) holds the `SubstationState` (topology + logical layer + network layer +
alarms/events) and exposes action methods that call into `substationEngine.applyCommand`, replacing state
and appending returned events to the log in one atomic update. Both `scene3d/` components and `ui/`
components subscribe to the same store — there is exactly one source of truth, so the 3D breaker mesh and
the 2D bay control panel can never disagree about a breaker's status.

## 10. Prototype scope (first working slice)

- 3D scene: yard/GIS zone, one transformer, one MV switchgear row (2–3 bays), a control room with IED
  panels.
- Interactive breaker/disconnector/earthing switch on at least one bay, governed by interlocking.
- SCADA/SLD overlay with live status.
- IED front panel UI: LEDs, display, event list, disturbance-record placeholder.
- Simple network/comms view: station bus vs. process bus, merging unit(s), PRP dual-port status per device.
- Event/alarm log panel.
- One working protection-trip scenario end-to-end (§6).
- One working switching scenario end-to-end (§5).
- Basic tutorial overlay.
- PAC-fault and commissioning scenarios are documented in `scenarios.md` for this milestone; fully
  implementing them is a stretch goal for the same prototype pass, flagged in the README if deferred.

## 11. Verification

- `npm install` succeeds from a clean clone.
- `npm run dev` boots the Vite dev server without errors; scene renders and panels are interactive.
- `tsc --noEmit` / `npm run build` has zero TypeScript errors.
- `npm run test` (Vitest) covers the simulation core: interlocking predicates, protection trip flow, event
  log correctness — independent of any 3D rendering.
- Manual walkthrough of both required scenarios in-browser, confirming event log entries and interlock
  block messages appear as designed.
