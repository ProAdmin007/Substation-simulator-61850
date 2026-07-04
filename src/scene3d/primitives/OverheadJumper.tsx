import { useMemo } from 'react';
import * as THREE from 'three';

interface SagSegment {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  length: number;
}

/** Segmented parabolic-sag conductor between two points, matching the look of a real overhead
 * HV jumper (see docs/devlog.md — ported from the reference prototype's makeOverheadLine). */
function computeSagSegments(from: THREE.Vector3, to: THREE.Vector3, sag: number, segments: number): SagSegment[] {
  const out: SagSegment[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const a = new THREE.Vector3().lerpVectors(from, to, t1);
    a.y -= sag * 4 * t1 * (1 - t1);
    const b = new THREE.Vector3().lerpVectors(from, to, t2);
    b.y -= sag * 4 * t2 * (1 - t2);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    if (length < 1e-4) continue;
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    out.push({ position: [mid.x, mid.y, mid.z], quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w], length });
  }
  return out;
}

interface OverheadJumperProps {
  from: [number, number, number];
  to: [number, number, number];
  /** Lateral offsets (world X) for each phase conductor — three parallel conductors by default. */
  phaseOffsets?: number[];
  sag?: number;
  segments?: number;
  radius?: number;
  color?: string;
  roughness?: number;
  metalness?: number;
}

/** A 3-phase overhead jumper conductor (busbar-to-equipment style connection) in the HV yard. */
export function OverheadJumper({
  from,
  to,
  phaseOffsets = [-0.22, 0, 0.22],
  sag = 0.25,
  segments = 6,
  radius = 0.02,
  color = '#b5651d',
  roughness = 0.35,
  metalness = 0.85,
}: OverheadJumperProps) {
  const segmentsByPhase = useMemo(
    () =>
      phaseOffsets.map((offset) =>
        computeSagSegments(
          new THREE.Vector3(from[0] + offset, from[1], from[2]),
          new THREE.Vector3(to[0] + offset, to[1], to[2]),
          sag,
          segments,
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from[0], from[1], from[2], to[0], to[1], to[2], sag, segments, phaseOffsets.join(',')],
  );

  return (
    <group>
      {segmentsByPhase.map((segs, phaseIndex) =>
        segs.map((seg, i) => (
          <mesh key={`${phaseIndex}-${i}`} position={seg.position} quaternion={seg.quaternion}>
            <cylinderGeometry args={[radius, radius, seg.length, 6]} />
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
          </mesh>
        )),
      )}
    </group>
  );
}
