import { Text } from '@react-three/drei';
import type * as THREE from 'three';
import { useSubstationStore } from '../../simulation/store/useSubstationStore';

interface BoxPrimitiveProps {
  position: [number, number, number];
  size?: [number, number, number];
  color: string;
  label?: string;
  /** First-person "walk up and press E" interaction — see FirstPersonController. This is the only
   * interaction path: a mouse onClick here would also fire whenever the player clicks the canvas
   * just to (re-)engage pointer lock while looking at the object, since that click lands on
   * whatever mesh is under the crosshair. `iedId` lets the B key jump straight to that relay. */
  interactable?: { hint: string; onInteract: () => void; iedId?: string };
  /** PBR tuning — defaults suit painted steel/plastic cabinetry; override per material. */
  roughness?: number;
  metalness?: number;
  map?: THREE.Texture;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/** Placeholder geometry for a piece of equipment. Swap for a <GltfModel> later without touching callers. */
export function BoxPrimitive({
  position,
  size = [1, 1, 1],
  color,
  label,
  interactable,
  roughness = 0.6,
  metalness = 0.15,
  map,
  castShadow = true,
  receiveShadow = true,
}: BoxPrimitiveProps) {
  const showLabels = useSubstationStore((s) => s.showLabels);
  return (
    <group position={position}>
      <mesh userData={interactable ? { interactable: true, ...interactable } : undefined} castShadow={castShadow} receiveShadow={receiveShadow}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} map={map} />
      </mesh>
      {label && showLabels && (
        <Text position={[0, size[1] / 2 + 0.15, 0]} fontSize={0.12} color="white" anchorX="center" anchorY="bottom" outlineWidth={0.006} outlineColor="black">
          {label}
        </Text>
      )}
    </group>
  );
}
