import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { BoxPrimitive } from './primitives/BoxPrimitive';
import { Insulator } from './primitives/Insulator';
import { useConcreteFloor, useCopperBusbar, usePaintedMetal } from './materials';

/** Radiator bank: a row of thin cooling fins along one side of the tank. */
function RadiatorBank({ side }: { side: -1 | 1 }) {
  const fin = usePaintedMetal('#4a5860');
  const fins = [];
  for (let i = 0; i < 6; i++) {
    fins.push(<BoxPrimitive key={i} position={[side * 1.25, 0.95, -0.55 + i * 0.22]} size={[0.35, 1.3, 0.06]} {...fin} />);
  }
  return <>{fins}</>;
}

/**
 * Power transformer T1 — a tank with corrugated radiator banks, a cylindrical conservator on top,
 * and ribbed HV/LV bushings angled up from the lid (the iconic transformer silhouette, see
 * docs/research.md §2). The tank keeps a fixed real-world colour; a separate loading-status lamp
 * (not the whole tank) reflects loading percent.
 */
export function TransformerBay() {
  const transformer = useSubstationStore((s) => s.state.transformers[0]);
  const tankMat = usePaintedMetal('#5c6b70');
  const base = useConcreteFloor();
  const terminal = useCopperBusbar('#c9a227');
  if (!transformer) return null;

  const loadColor = transformer.loadingPercent > 90 ? '#e74c3c' : transformer.loadingPercent > 70 ? '#f1c40f' : '#2ecc71';

  return (
    <group position={[0, 0, -6.5]}>
      {/* Concrete bund / plinth */}
      <BoxPrimitive position={[0, 0.1, 0]} size={[2.8, 0.2, 2.2]} {...base} />

      {/* Main tank */}
      <BoxPrimitive
        position={[0, 0.95, 0]}
        size={[2.0, 1.6, 1.4]}
        {...tankMat}
        label={`${transformer.name}  120/${transformer.ratioKv[1]} kV\n${transformer.loadingPercent}% load`}
      />
      <RadiatorBank side={-1} />
      <RadiatorBank side={1} />

      {/* Conservator (oil expansion) tank — horizontal cylinder on a support above the lid */}
      <mesh position={[0, 2.05, -0.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 1.4, 16]} />
        <meshStandardMaterial color="#6a777c" roughness={0.5} metalness={0.35} />
      </mesh>

      {/* HV bushings (120 kV) — three tall ribbed insulators angled up-and-back off the lid */}
      {[-0.6, 0, 0.6].map((bx) => (
        <group key={`hv${bx}`} position={[bx, 1.75, 0.35]} rotation={[-0.35, 0, 0]}>
          <Insulator position={[0, 0, 0]} height={1.4} coreRadius={0.06} shedRadius={0.13} sheds={9} color="#c8b89a" />
          <BoxPrimitive position={[0, 1.45, 0]} size={[0.12, 0.1, 0.12]} {...terminal} />
        </group>
      ))}

      {/* LV bushings (MV side) — three shorter insulators on the opposite side of the lid */}
      {[-0.5, 0, 0.5].map((bx) => (
        <group key={`lv${bx}`} position={[bx, 1.75, -0.35]} rotation={[0.4, 0, 0]}>
          <Insulator position={[0, 0, 0]} height={0.6} coreRadius={0.05} shedRadius={0.1} sheds={5} color="#c8b89a" />
          <BoxPrimitive position={[0, 0.63, 0]} size={[0.1, 0.08, 0.1]} {...terminal} />
        </group>
      ))}

      {/* Loading-status lamp on the tank front */}
      <BoxPrimitive position={[0, 1.4, 0.71]} size={[0.12, 0.12, 0.04]} color={loadColor} roughness={0.3} metalness={0} />
      {/* Control/marshalling cabinet on the tank side */}
      <BoxPrimitive position={[-1.1, 0.7, 0.75]} size={[0.5, 0.9, 0.3]} {...usePaintedMetal('#c9cdc8')} />
    </group>
  );
}
