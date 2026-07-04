import { useMemo } from 'react';
import * as THREE from 'three';

interface InsulatorProps {
  position: [number, number, number];
  height: number;
  coreRadius?: number;
  shedRadius?: number;
  sheds?: number;
  color?: string;
  rotation?: [number, number, number];
}

/**
 * A ribbed porcelain/composite post insulator — the single most recognisable shape in an
 * outdoor HV yard (breakers, disconnectors, CTs, VTs all sit on these). Built as ONE mesh with
 * LatheGeometry: a sawtooth radial profile (core → shed → core, repeated) revolved around Y gives
 * the classic weather-shed silhouette without stacking dozens of separate disc meshes.
 *
 * This is a reusable building block — see docs/technical-design.md §8 on swapping placeholder
 * geometry for detailed models without touching simulation logic.
 */
export function Insulator({
  position,
  height,
  coreRadius = 0.07,
  shedRadius = 0.14,
  sheds = 10,
  color = '#d8d7cf',
  rotation = [0, 0, 0],
}: InsulatorProps) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const shedH = height / sheds;
    points.push(new THREE.Vector2(coreRadius, 0));
    for (let i = 0; i < sheds; i++) {
      const y = i * shedH;
      points.push(new THREE.Vector2(coreRadius, y + shedH * 0.15));
      points.push(new THREE.Vector2(shedRadius, y + shedH * 0.45));
      points.push(new THREE.Vector2(coreRadius, y + shedH * 0.6));
    }
    points.push(new THREE.Vector2(coreRadius, height));
    const geo = new THREE.LatheGeometry(points, 16);
    geo.computeVertexNormals();
    return geo;
  }, [height, coreRadius, shedRadius, sheds]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      {/* Glazed porcelain: fairly smooth, non-metallic, picks up a soft sheen from the environment */}
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
    </mesh>
  );
}
