import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findBay } from '../simulation/engine/lookup';
import type { Ied } from '../simulation/model';
import { BoxPrimitive } from './primitives/BoxPrimitive';
import { useBrushedMetal, useConcreteFloor, useGlassPanel, usePaintedMetal, useSwitchgearGrey } from './materials';

const IED_BAY_IDS = ['bay-f1', 'bay-f2'];

interface IedCubicleProps {
  ied: Ied;
  x: number;
  z: number;
}

/** One floor-standing protection relay cubicle (Greyhart-style), faceplate recessed into the upper
 * front: glazed LCD behind a bezel, an LED status column, a keypad plate (docs/research.md §5).
 * Faces +Z (toward a player entering the building through the front door). E-key interaction only. */
function IedCubicle({ ied, x, z }: IedCubicleProps) {
  const selectIed = useSubstationStore((s) => s.selectIed);
  const tripLed = ied.leds.find((l) => l.id === 'trip');
  const anyTrip = tripLed && tripLed.mode !== 'off';

  const cubicle = useSwitchgearGrey('#c9cdc8');
  const faceplate = usePaintedMetal('#15181b');
  const bezel = useBrushedMetal('#3a4048');
  const display = useGlassPanel();
  const plinth = usePaintedMetal('#1c1f22');
  const keypad = usePaintedMetal('#22262b');

  return (
    <group position={[x, 0, z]}>
      <BoxPrimitive
        position={[0, 1.0, 0]}
        size={[0.8, 2.0, 0.6]}
        {...cubicle}
        label={ied.name}
        interactable={{ hint: `IED ${ied.name} — [E]/[B] instellingen`, onInteract: () => selectIed(ied.id), iedId: ied.id }}
      />
      <BoxPrimitive position={[0, 0.05, 0]} size={[0.84, 0.1, 0.64]} {...plinth} />
      <BoxPrimitive position={[0, 1.45, 0.31]} size={[0.62, 0.5, 0.03]} {...faceplate} />
      <BoxPrimitive position={[-0.08, 1.58, 0.33]} size={[0.34, 0.22, 0.01]} {...bezel} />
      <BoxPrimitive position={[-0.08, 1.58, 0.34]} size={[0.3, 0.18, 0.005]} {...display} />
      {[0, 1, 2, 3].map((i) => (
        <BoxPrimitive
          key={i}
          position={[0.2, 1.66 - i * 0.05, 0.34]}
          size={[0.03, 0.03, 0.01]}
          color={i === 0 ? '#2ecc71' : anyTrip && i === 1 ? '#e74c3c' : '#2a2f2b'}
          roughness={0.3}
          metalness={0}
        />
      ))}
      <BoxPrimitive position={[0, 1.34, 0.33]} size={[0.5, 0.12, 0.01]} {...keypad} />
    </group>
  );
}

/** The control / PAC building shell: light concrete walls, roof, floor, and a front door gap the
 * player walks through, with an interior ceiling light. The MV yard stays outdoors; only the relay
 * room is enclosed (per the user's "partial building" choice). Local coords — group is at z=6. */
function ControlBuilding() {
  const wall = usePaintedMetal('#c2c6c1');
  const roofMat = usePaintedMetal('#7a827c');
  const floor = useConcreteFloor();

  return (
    <group>
      {/* Floor + roof */}
      <BoxPrimitive position={[0, 0.02, 0]} size={[6, 0.04, 4]} {...floor} castShadow={false} />
      <BoxPrimitive position={[0, 3, 0]} size={[6.2, 0.16, 4.2]} {...roofMat} />
      {/* Side + back walls */}
      <BoxPrimitive position={[-3, 1.5, 0]} size={[0.15, 3, 4]} {...wall} />
      <BoxPrimitive position={[3, 1.5, 0]} size={[0.15, 3, 4]} {...wall} />
      <BoxPrimitive position={[0, 1.5, -2]} size={[6, 3, 0.15]} {...wall} />
      {/* Front wall with a central door gap (x ∈ [-0.8, 0.8]) */}
      <BoxPrimitive position={[-1.9, 1.5, 2]} size={[2.2, 3, 0.15]} {...wall} />
      <BoxPrimitive position={[1.9, 1.5, 2]} size={[2.2, 3, 0.15]} {...wall} />
      <BoxPrimitive position={[0, 2.55, 2]} size={[1.6, 0.9, 0.15]} {...wall} />
      {/* Door frame accents */}
      <BoxPrimitive position={[-0.82, 1.05, 2]} size={[0.06, 2.1, 0.18]} {...usePaintedMetal('#3a4048')} />
      <BoxPrimitive position={[0.82, 1.05, 2]} size={[0.06, 2.1, 0.18]} {...usePaintedMetal('#3a4048')} />

      {/* Interior ceiling light */}
      <pointLight position={[0, 2.7, 0]} intensity={12} distance={9} decay={2} color="#fff4e0" />
      <BoxPrimitive position={[0, 2.9, 0]} size={[0.8, 0.06, 0.3]} color="#fffbe8" roughness={0.4} metalness={0} castShadow={false} />
    </group>
  );
}

/** PAC/relay building: IED cubicles + SCADA gateway + test-set trolley, enclosed in a building. */
export function ControlRoom() {
  const state = useSubstationStore((s) => s.state);
  const setShowComms = useSubstationStore((s) => s.setShowComms);
  const trolley = usePaintedMetal('#34495e');
  const gateway = usePaintedMetal('#22262b');

  const ieds = IED_BAY_IDS.map((bayId) => findBay(state, bayId)?.ied).filter((i): i is Ied => Boolean(i));

  return (
    <group position={[0, 0, 6]}>
      <ControlBuilding />

      {/* Units lined against the back wall (local z=-1.5), facing the entering player (+Z) */}
      {ieds.map((ied, i) => (
        <IedCubicle key={ied.id} ied={ied} x={-1.5 + i * 1.0} z={-1.5} />
      ))}

      {/* SCADA gateway — interactable, opens the Network / Comms view (docs/scenarios.md Scenario 4) */}
      <BoxPrimitive
        position={[0.65, 1.0, -1.5]}
        size={[0.6, 2.0, 0.5]}
        {...gateway}
        label="Station Bus / SCADA GW"
        interactable={{ hint: 'E — Open Network / Comms view', onInteract: () => setShowComms(true) }}
      />
      {/* Test-set trolley (secondary injection simulator, placeholder) */}
      <BoxPrimitive position={[1.7, 0.5, -1.4]} size={[0.7, 0.9, 0.5]} {...trolley} label="Test Set" />
    </group>
  );
}
