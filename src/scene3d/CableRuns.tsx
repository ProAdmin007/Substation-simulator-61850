import { GroundCableRoute } from './primitives/GroundCableRoute';

// Cable colour legend (mirrors the reference prototype's per-voltage/per-service colour coding):
//   orange  #ff6600  — LV power (transformer -> MV switchgear incomer)
//   cyan    #00d4ff  — process bus (merging unit -> IED, carries Sampled Values, see research.md §7)
//   violet  #8b5cf6  — station bus (IED -> SCADA gateway, carries GOOSE/MMS, see research.md §7)
//
// Routes are plain waypoint lists in world [x, z] coordinates, hand-routed to run through the
// clear corridor between the MV switchgear row (z ~ -0.4..0.4) and the control room (z ~ 5.85)
// rather than through any equipment footprint (see collision.ts for those footprints).

const POWER_ROUTE: [number, number][] = [
  [0, -6.5],
  [0, -1.5],
  [-1.8, -1.5],
  [-1.8, -0.4],
];

const PROCESS_BUS_F1: [number, number][] = [
  [0, -0.55],
  [0, 3],
  [-0.8, 3],
  [-0.8, 5.85],
];

const PROCESS_BUS_F2: [number, number][] = [
  [1.8, -0.55],
  [1.8, 3],
  [0.8, 3],
  [0.8, 5.85],
];

const STATION_BUS_F1: [number, number][] = [
  [-0.8, 6],
  [-0.8, 7.4],
  [0, 7.4],
];

const STATION_BUS_F2: [number, number][] = [
  [0.8, 6],
  [0.8, 7.4],
  [0, 7.4],
];

/** Ground-level cable routes connecting the transformer, MV bays, IEDs, and the station bus
 * patch panel — see docs/scenarios.md Scenario 4 for why process bus vs. station bus matters. */
export function CableRuns() {
  return (
    <>
      <GroundCableRoute points={POWER_ROUTE} color="#ff6600" />
      <GroundCableRoute points={PROCESS_BUS_F1} color="#00d4ff" width={0.08} />
      <GroundCableRoute points={PROCESS_BUS_F2} color="#00d4ff" width={0.08} />
      <GroundCableRoute points={STATION_BUS_F1} color="#8b5cf6" width={0.08} />
      <GroundCableRoute points={STATION_BUS_F2} color="#8b5cf6" width={0.08} />
    </>
  );
}
