import type { BreakerStatus, DisconnectorStatus, EarthingSwitchStatus } from '../simulation/model';

// Consistent status coloring across the 3D scene and the 2D HMI/SLD overlay — see
// docs/game-design.md §7 (green = closed/energized, grey = open, red = tripped/alarm).

export function breakerColor(status: BreakerStatus): string {
  switch (status) {
    case 'closed':
      return '#2ecc71';
    case 'open':
      return '#7f8c8d';
    case 'tripped':
      return '#e74c3c';
  }
}

export function disconnectorColor(status: DisconnectorStatus): string {
  switch (status) {
    case 'closed':
      return '#2ecc71';
    case 'open':
      return '#7f8c8d';
    case 'moving':
      return '#f1c40f';
  }
}

export function earthingSwitchColor(status: EarthingSwitchStatus): string {
  return status === 'closed' ? '#f1c40f' : '#7f8c8d';
}
