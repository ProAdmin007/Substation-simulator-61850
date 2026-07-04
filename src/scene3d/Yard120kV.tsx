import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findBay } from '../simulation/engine/lookup';
import type { Bay } from '../simulation/model';
import { BoxPrimitive } from './primitives/BoxPrimitive';
import { Insulator } from './primitives/Insulator';
import { OverheadJumper } from './primitives/OverheadJumper';
import { useBrushedMetal, useConcreteFloor, useCopperBusbar, usePaintedMetal, useWarningSticker } from './materials';
import { breakerColor } from './statusColors';

const YARD_BAY_IDS = ['bay-l1', 'bay-t1-hv'];
const BAY_X = [-2.6, 2.6];
const PORTAL_X = [-5, 5];
const BUSBAR_Y = 7.2;

const CT_Z = -1.4;
const DISC_Z = 0;
const BREAKER_Z = 1.6;

/** Portal/gantry tower: four lattice legs (approximated as posts) under a horizontal beam,
 * the classic AIS busbar support structure — see docs/research.md §2. */
function PortalTower({ x }: { x: number }) {
  const steel = useBrushedMetal('#6b7378');
  return (
    <group position={[x, 0, 0]}>
      <BoxPrimitive position={[-0.5, BUSBAR_Y / 2, -0.5]} size={[0.18, BUSBAR_Y, 0.18]} {...steel} />
      <BoxPrimitive position={[0.5, BUSBAR_Y / 2, -0.5]} size={[0.18, BUSBAR_Y, 0.18]} {...steel} />
      <BoxPrimitive position={[-0.5, BUSBAR_Y / 2, 0.5]} size={[0.18, BUSBAR_Y, 0.18]} {...steel} />
      <BoxPrimitive position={[0.5, BUSBAR_Y / 2, 0.5]} size={[0.18, BUSBAR_Y, 0.18]} {...steel} />
      <BoxPrimitive position={[0, BUSBAR_Y, 0]} size={[1.1, 0.2, 1.1]} {...useBrushedMetal('#5a6266')} />
    </group>
  );
}

/** Current transformer: a tall ribbed porcelain column on a base with a rectangular head — the
 * "hairpin/eye-bolt" CT silhouette common in AIS yards. Scenery only in this prototype. */
function CtColumn({ x, z }: { x: number; z: number }) {
  const base = useConcreteFloor();
  const head = usePaintedMetal('#8a9099');
  return (
    <group position={[x, 0, z]}>
      <BoxPrimitive position={[0, 0.15, 0]} size={[0.5, 0.3, 0.5]} {...base} />
      <Insulator position={[0, 0.3, 0]} height={2.1} coreRadius={0.09} shedRadius={0.17} sheds={9} />
      <BoxPrimitive position={[0, 2.6, 0]} size={[0.45, 0.4, 0.45]} {...head} />
      <BoxPrimitive position={[0, 2.9, 0]} size={[0.18, 0.22, 0.18]} {...useCopperBusbar('#c9a227')} />
    </group>
  );
}

/** Centre-break disconnector: two ribbed post insulators carrying a horizontal aluminium blade
 * (shown closed / in-line). Scenery only. */
function Disconnector({ x, z }: { x: number; z: number }) {
  const base = usePaintedMetal('#5a6266');
  const blade = useBrushedMetal('#cfd3d6');
  return (
    <group position={[x, 0, z]}>
      <BoxPrimitive position={[0, 0.12, 0]} size={[1.0, 0.24, 0.4]} {...base} />
      <Insulator position={[-0.38, 0.24, 0]} height={1.4} coreRadius={0.07} shedRadius={0.14} sheds={7} />
      <Insulator position={[0.38, 0.24, 0]} height={1.4} coreRadius={0.07} shedRadius={0.14} sheds={7} />
      {/* Contact terminals + the in-line blade bridging the two posts */}
      <BoxPrimitive position={[-0.38, 1.68, 0]} size={[0.14, 0.1, 0.14]} {...useCopperBusbar('#c9a227')} />
      <BoxPrimitive position={[0.38, 1.68, 0]} size={[0.14, 0.1, 0.14]} {...useCopperBusbar('#c9a227')} />
      <BoxPrimitive position={[0, 1.72, 0]} size={[0.7, 0.05, 0.06]} {...blade} />
    </group>
  );
}

interface YardBreakerProps {
  bay: Bay;
  x: number;
}

/** Live-tank 120 kV circuit breaker: a steel support frame carrying two vertical porcelain
 * insulator columns that hold the horizontal interrupter chamber aloft — the tall, unmistakable
 * live-tank silhouette (docs/research.md §2), not a box on the ground. */
function YardBreaker({ bay, x }: YardBreakerProps) {
  const selectBay = useSubstationStore((s) => s.selectBay);
  const frame = useBrushedMetal('#6b7378');
  const platform = usePaintedMetal('#5a6266');
  const chamber = usePaintedMetal('#9aa0a6');
  const cabinet = usePaintedMetal('#c9cdc8');
  const sticker = useWarningSticker();

  return (
    <group position={[x, 0, BREAKER_Z]}>
      {/* Support frame legs + platform */}
      <BoxPrimitive position={[-0.4, 0.9, -0.3]} size={[0.14, 1.8, 0.14]} {...frame} />
      <BoxPrimitive position={[0.4, 0.9, -0.3]} size={[0.14, 1.8, 0.14]} {...frame} />
      <BoxPrimitive position={[-0.4, 0.9, 0.3]} size={[0.14, 1.8, 0.14]} {...frame} />
      <BoxPrimitive position={[0.4, 0.9, 0.3]} size={[0.14, 1.8, 0.14]} {...frame} />
      <BoxPrimitive position={[0, 1.85, 0]} size={[1.1, 0.12, 0.8]} {...platform} />

      {/* Two porcelain support insulators */}
      <Insulator position={[-0.35, 1.9, 0]} height={1.2} coreRadius={0.09} shedRadius={0.17} sheds={6} />
      <Insulator position={[0.35, 1.9, 0]} height={1.2} coreRadius={0.09} shedRadius={0.17} sheds={6} />

      {/* Horizontal interrupter chamber on top */}
      <BoxPrimitive position={[0, 3.2, 0]} size={[1.2, 0.34, 0.34]} {...chamber} />
      <BoxPrimitive position={[-0.55, 3.2, 0]} size={[0.12, 0.28, 0.28]} {...useCopperBusbar('#c9a227')} />
      <BoxPrimitive position={[0.55, 3.2, 0]} size={[0.12, 0.28, 0.28]} {...useCopperBusbar('#c9a227')} />

      {/* Operating mechanism cabinet at the base — the interactable element + status lamp */}
      <BoxPrimitive
        position={[0, 0.7, 0.45]}
        size={[0.6, 0.9, 0.35]}
        {...cabinet}
        label={bay.name}
        interactable={{ hint: `E — Open bay controls: ${bay.name}`, onInteract: () => selectBay(bay.id) }}
      />
      <BoxPrimitive position={[-0.18, 0.62, 0.64]} size={[0.14, 0.14, 0.01]} {...sticker} />
      <BoxPrimitive position={[0.12, 0.9, 0.63]} size={[0.08, 0.08, 0.03]} color={breakerColor(bay.breaker.status)} roughness={0.3} metalness={0} />
    </group>
  );
}

/** Simplified 120 kV open-air (AIS) switchyard: gantry-supported busbar over a row of bays,
 * each with a CT column, centre-break disconnector, and live-tank circuit breaker in line — the
 * "classical" AIS layout described in docs/research.md §2. */
export function Yard120kV() {
  const state = useSubstationStore((s) => s.state);
  const copperBus = useCopperBusbar('#c9a227');

  return (
    <group position={[0, 0, -12]}>
      <PortalTower x={PORTAL_X[0]} />
      <PortalTower x={PORTAL_X[1]} />
      {/* Busbar conductor spanning the gantry */}
      <BoxPrimitive position={[0, BUSBAR_Y - 0.3, 0]} size={[PORTAL_X[1] - PORTAL_X[0] + 1, 0.06, 0.06]} {...copperBus} />

      {YARD_BAY_IDS.map((bayId, i) => {
        const bay = findBay(state, bayId);
        if (!bay) return null;
        const x = BAY_X[i];
        return (
          <group key={bayId}>
            <CtColumn x={x} z={CT_Z} />
            <Disconnector x={x} z={DISC_Z} />
            <YardBreaker bay={bay} x={x} />

            {/* Overhead jumpers: busbar → CT → disconnector → breaker chamber */}
            <OverheadJumper from={[x, BUSBAR_Y - 0.3, 0]} to={[x, 2.9, CT_Z]} sag={0.25} />
            <OverheadJumper from={[x, 2.9, CT_Z]} to={[x, 1.72, DISC_Z]} sag={0.2} />
            <OverheadJumper from={[x, 1.72, DISC_Z]} to={[x, 3.2, BREAKER_Z]} sag={0.2} />
          </group>
        );
      })}
    </group>
  );
}
