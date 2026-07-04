import { useMemo } from 'react';

interface Segment {
  position: [number, number, number];
  rotationZ: number;
  length: number;
}

function computeSegments(points: [number, number][]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[i + 1];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    if (length < 1e-4) continue;
    const angle = Math.atan2(dx, dz);
    segs.push({ position: [(x1 + x2) / 2, 0, (z1 + z2) / 2], rotationZ: -angle, length });
  }
  return segs;
}

interface GroundCableRouteProps {
  points: [number, number][];
  color?: string;
  width?: number;
}

/** A ground-level cable route rendered as a coloured stripe on top of the ground (rather than a
 * literal buried trench) — reads clearly in-game while still tracing a real waypointed path
 * between two pieces of equipment. Ported from the reference prototype's undergroundCable(). */
export function GroundCableRoute({ points, color = '#ff6600', width = 0.14 }: GroundCableRouteProps) {
  const segments = useMemo(() => computeSegments(points), [JSON.stringify(points)]);

  return (
    <group>
      {segments.map((seg, i) => (
        <group key={i}>
          {/* Glow halo, wider and dimmer, sits just below the main stripe */}
          <mesh position={[seg.position[0], 0.013, seg.position[2]]} rotation={[-Math.PI / 2, 0, seg.rotationZ]} renderOrder={9}>
            <planeGeometry args={[width + 0.16, seg.length + 0.1]} />
            <meshBasicMaterial color={color} transparent opacity={0.25} depthTest={false} depthWrite={false} />
          </mesh>
          {/* Main stripe */}
          <mesh position={[seg.position[0], 0.015, seg.position[2]]} rotation={[-Math.PI / 2, 0, seg.rotationZ]} renderOrder={10}>
            <planeGeometry args={[width, seg.length]} />
            <meshBasicMaterial color={color} depthTest={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
