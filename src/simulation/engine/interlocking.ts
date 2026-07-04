// Interlocking predicates. Each returns a reason so the UI can explain *why* an action is
// blocked instead of silently failing — see docs/research.md §3 and docs/technical-design.md §5.

import type { Bay, Disconnector, EarthingSwitch } from '../model';

export type InterlockResult = { allowed: true } | { allowed: false; reason: string };

const allowed: InterlockResult = { allowed: true };

/**
 * A disconnector has no arc-extinguishing capability: it must only move while its bay's
 * breaker is open, in either direction (opening or closing).
 */
export function canOperateDisconnector(bay: Bay, disconnector: Disconnector): InterlockResult {
  if (bay.breaker.status !== 'open') {
    return {
      allowed: false,
      reason: `Disconnector ${disconnector.id} cannot operate: breaker ${bay.breaker.id} is still ${bay.breaker.status}. Opening a disconnector under load causes a sustained arc.`,
    };
  }
  return allowed;
}

/**
 * A breaker must not close onto a bay that still has a closed earthing switch — that would
 * create a bolted fault through the grounding system.
 */
export function canCloseBreaker(bay: Bay): InterlockResult {
  const closedEarth = bay.earthingSwitches.find((e) => e.status === 'closed');
  if (closedEarth) {
    return {
      allowed: false,
      reason: `Breaker ${bay.breaker.id} cannot close while earthing switch ${closedEarth.id} is closed.`,
    };
  }
  const movingDisconnector = bay.disconnectors.find((d) => d.status === 'moving');
  if (movingDisconnector) {
    return {
      allowed: false,
      reason: `Breaker ${bay.breaker.id} cannot close while disconnector ${movingDisconnector.id} is mid-travel.`,
    };
  }
  return allowed;
}

/**
 * An earthing switch may only close once the section is verified de-energized: breaker open
 * and all disconnectors open. This mirrors the real de-energization sequence (breaker open ->
 * disconnector open -> verify absence of voltage -> earth).
 */
export function canCloseEarthingSwitch(bay: Bay, earthingSwitch: EarthingSwitch): InterlockResult {
  if (bay.breaker.status !== 'open') {
    return {
      allowed: false,
      reason: `Earthing switch ${earthingSwitch.id} cannot close: breaker ${bay.breaker.id} is still ${bay.breaker.status}.`,
    };
  }
  const closedDisconnector = bay.disconnectors.find((d) => d.status !== 'open');
  if (closedDisconnector) {
    return {
      allowed: false,
      reason: `Earthing switch ${earthingSwitch.id} cannot close: disconnector ${closedDisconnector.id} is not open — the section is not yet verified de-energized.`,
    };
  }
  return allowed;
}

/**
 * A protection trip must be acknowledged before the breaker can be closed again — resetting a
 * trip is not the same as clearing the underlying fault.
 */
export function canCloseTrippedBreaker(bay: Bay, hasUnacknowledgedTripAlarm: boolean): InterlockResult {
  if (bay.breaker.status === 'tripped' && hasUnacknowledgedTripAlarm) {
    return {
      allowed: false,
      reason: `Breaker ${bay.breaker.id} cannot close: an unacknowledged protection trip is active on this bay.`,
    };
  }
  return allowed;
}
