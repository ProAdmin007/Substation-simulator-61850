import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findBay } from '../simulation/engine/lookup';
import type { Bay } from '../simulation/model';
import { BoxPrimitive } from './primitives/BoxPrimitive';
import { useLouver, usePaintedMetal, usePanelMimic, useSwitchgearGrey, useWarningSticker } from './materials';
import { breakerColor, disconnectorColor, earthingSwitchColor } from './statusColors';

const BAY_IDS = ['bay-t1-mv', 'bay-f1', 'bay-f2'];
const CABINET_LABELS: Record<string, string> = {
  'bay-t1-mv': 'VOLTRIX UniLine',
  'bay-f1': 'HALVEX SecureRing',
  'bay-f2': 'VOLTRIX UniLine',
};

// A real metal-clad MV panel is tall, narrow and deep, in a butted lineup. Front face (+Z) carries
// the LV instrument compartment (top), breaker compartment with ventilation louvers (middle) and
// cable compartment (bottom) — see docs/research.md §4.
const PANEL_W = 1.0;
const PANEL_H = 2.4;
const PANEL_D = 1.5;
const FRONT_Z = PANEL_D / 2;

interface SwitchgearCabinetProps {
  bay: Bay;
  x: number;
}

/** One MV switchgear cabinet — its own component (rather than inlined in a .map()) so the
 * per-cabinet material hooks below follow the Rules of Hooks. Interaction is E-key only (see
 * FirstPersonController / BoxPrimitive). */
function SwitchgearCabinet({ bay, x }: SwitchgearCabinetProps) {
  const selectBay = useSubstationStore((s) => s.selectBay);
  const disconnector = bay.disconnectors[0];
  const earthingSwitch = bay.earthingSwitches[0];

  const body = useSwitchgearGrey();
  const doorGrey = useSwitchgearGrey('#bec2bd');
  const plinth = usePaintedMetal('#1c1f22');
  const louver = useLouver();
  const mimic = usePanelMimic();
  const sticker = useWarningSticker();

  return (
    <group position={[x, 0, 0]}>
      {/* Cabinet body — this is the interactable mesh (whole panel) */}
      <BoxPrimitive
        position={[0, PANEL_H / 2, 0]}
        size={[PANEL_W, PANEL_H, PANEL_D]}
        {...body}
        label={`${CABINET_LABELS[bay.id]}\n${bay.name}`}
        interactable={{
          hint: `${bay.name} — [E] bediening${bay.ied ? ' · [B] relais' : ''}`,
          onInteract: () => selectBay(bay.id),
          iedId: bay.ied?.id,
        }}
      />
      {/* Dark base plinth + vertical seam lines between panels */}
      <BoxPrimitive position={[0, 0.06, 0]} size={[PANEL_W + 0.02, 0.12, PANEL_D + 0.02]} {...plinth} />
      <BoxPrimitive position={[-PANEL_W / 2, PANEL_H / 2, FRONT_Z]} size={[0.02, PANEL_H, 0.02]} {...plinth} />
      <BoxPrimitive position={[PANEL_W / 2, PANEL_H / 2, FRONT_Z]} size={[0.02, PANEL_H, 0.02]} {...plinth} />

      {/* ── LV / instrument compartment (top) ── */}
      <BoxPrimitive position={[0, 2.0, FRONT_Z + 0.01]} size={[PANEL_W - 0.12, 0.62, 0.03]} {...doorGrey} />
      {/* Mimic diagram + indicator panel */}
      <BoxPrimitive position={[0, 2.05, FRONT_Z + 0.03]} size={[0.55, 0.4, 0.01]} {...mimic} />
      {/* Protection relay / IED faceplate set into the compartment */}
      <BoxPrimitive position={[0, 1.72, FRONT_Z + 0.03]} size={[0.42, 0.16, 0.02]} color="#15181b" roughness={0.4} metalness={0.2} />

      {/* ── Circuit-breaker compartment (middle) with ventilation louvers ── */}
      <BoxPrimitive position={[0, 1.15, FRONT_Z + 0.01]} size={[PANEL_W - 0.12, 0.85, 0.03]} {...doorGrey} />
      <BoxPrimitive position={[0, 1.42, FRONT_Z + 0.03]} size={[PANEL_W - 0.28, 0.12, 0.01]} {...louver} />
      <BoxPrimitive position={[0, 0.9, FRONT_Z + 0.03]} size={[PANEL_W - 0.28, 0.12, 0.01]} {...louver} />
      {/* Racking-port / operating handle plate */}
      <BoxPrimitive position={[0, 1.15, FRONT_Z + 0.03]} size={[0.14, 0.14, 0.03]} {...usePaintedMetal('#2a2f33')} />

      {/* ── Cable compartment (bottom) ── */}
      <BoxPrimitive position={[0, 0.42, FRONT_Z + 0.01]} size={[PANEL_W - 0.12, 0.5, 0.03]} {...doorGrey} />
      <BoxPrimitive position={[-0.28, 0.55, FRONT_Z + 0.03]} size={[0.16, 0.16, 0.01]} {...sticker} />

      {/* ── Live status indicator lamps on the LV compartment ── */}
      <BoxPrimitive position={[-0.18, 1.72, FRONT_Z + 0.04]} size={[0.05, 0.05, 0.03]} color={breakerColor(bay.breaker.status)} roughness={0.3} metalness={0} />
      {disconnector && (
        <BoxPrimitive position={[0, 1.72, FRONT_Z + 0.04]} size={[0.05, 0.05, 0.03]} color={disconnectorColor(disconnector.status)} roughness={0.3} metalness={0} />
      )}
      {earthingSwitch && (
        <BoxPrimitive position={[0.18, 1.72, FRONT_Z + 0.04]} size={[0.05, 0.05, 0.03]} color={earthingSwitchColor(earthingSwitch.status)} roughness={0.3} metalness={0} />
      )}

      {/* Merging unit at the rear (process bus) — see docs/research.md §7 */}
      {bay.mergingUnit && <BoxPrimitive position={[0, 0.4, -FRONT_Z - 0.12]} size={[0.28, 0.28, 0.22]} color="#22262b" roughness={0.5} metalness={0.4} label="MU" />}
    </group>
  );
}

/** A row of generic, fictional-brand MV switchgear cabinets — see docs/game-design.md §4. */
export function MvSwitchgearRoom() {
  const state = useSubstationStore((s) => s.state);

  return (
    <group position={[0, 0, 0]}>
      {BAY_IDS.map((bayId, i) => {
        const bay = findBay(state, bayId);
        if (!bay) return null;
        // Butted lineup: panels touch (1.02 m centres for a 1.0 m panel → a thin seam).
        return <SwitchgearCabinet key={bayId} bay={bay} x={(i - 1) * 1.02} />;
      })}
    </group>
  );
}
