import type { Alarm, AlarmSeverity, SubstationEvent } from '../model';

let sequence = 0;

/** Monotonic id generator kept separate from Date.now() so events created in the same tick still sort deterministically. */
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function makeEvent(source: string, description: string, cause: string): SubstationEvent {
  return {
    id: nextId('evt'),
    timestamp: new Date().toISOString(),
    source,
    description,
    cause,
  };
}

export function makeAlarm(
  severity: AlarmSeverity,
  message: string,
  bayId?: string,
): Alarm {
  return {
    id: nextId('alm'),
    timestamp: new Date().toISOString(),
    severity,
    message,
    acknowledged: false,
    bayId,
  };
}
