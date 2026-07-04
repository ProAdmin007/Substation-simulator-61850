// Simple circle-vs-AABB collision for the first-person walker. The scene is small and static,
// so a hand-listed obstacle footprint (matching the placeholder geometry in scene3d/*.tsx) is
// simpler and more transparent than a generic physics engine for a prototype this size.

interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function box(centerX: number, centerZ: number, halfX: number, halfZ: number): Obstacle {
  return { minX: centerX - halfX, maxX: centerX + halfX, minZ: centerZ - halfZ, maxZ: centerZ + halfZ };
}

export const OBSTACLES: Obstacle[] = [
  // Yard120kV (group z=-12): portal towers, CT columns, disconnectors, live-tank breakers per bay
  box(-5, -12, 0.7, 0.7),
  box(5, -12, 0.7, 0.7),
  box(-2.6, -13.4, 0.35, 0.35),
  box(2.6, -13.4, 0.35, 0.35),
  box(-2.6, -12, 0.55, 0.25),
  box(2.6, -12, 0.55, 0.25),
  box(-2.6, -10.4, 0.55, 0.45),
  box(2.6, -10.4, 0.55, 0.45),

  // TransformerBay (group z=-6.5): tank + radiator banks
  box(0, -6.5, 1.1, 0.8),
  box(-1.25, -6.5, 0.2, 0.7),
  box(1.25, -6.5, 0.2, 0.7),

  // MvSwitchgearRoom (group z=0): three butted panels (1.0w × 1.5d at x=-1.02, 0, 1.02)
  box(-1.02, 0, 0.55, 0.78),
  box(0, 0, 0.55, 0.78),
  box(1.02, 0, 0.55, 0.78),

  // ControlRoom (group z=6): building walls (door gap at front x∈[-0.8,0.8], z=8) + interior units
  box(-3, 6, 0.1, 2), // left wall
  box(3, 6, 0.1, 2), // right wall
  box(0, 4, 3, 0.1), // back wall
  box(-1.9, 8, 1.1, 0.1), // front wall left of door
  box(1.9, 8, 1.1, 0.1), // front wall right of door
  box(-1.5, 4.5, 0.45, 0.35), // IED F1
  box(-0.5, 4.5, 0.45, 0.35), // IED F2
  box(0.65, 4.5, 0.35, 0.3), // SCADA gateway
  box(1.7, 4.6, 0.4, 0.3), // test set
];

const PLAYER_RADIUS = 0.4;

/** Pushes (x, z) out of any overlapping obstacle, in place. */
export function resolveCollisions(pos: { x: number; z: number }): void {
  for (const o of OBSTACLES) {
    const closestX = Math.max(o.minX, Math.min(pos.x, o.maxX));
    const closestZ = Math.max(o.minZ, Math.min(pos.z, o.maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
      const dist = Math.sqrt(distSq) || 0.0001;
      const overlap = PLAYER_RADIUS - dist;
      pos.x += (dx / dist) * overlap;
      pos.z += (dz / dist) * overlap;
    }
  }
}
