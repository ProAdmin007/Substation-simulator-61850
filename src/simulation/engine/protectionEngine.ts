// Fault injection -> logical-node evaluation -> trip flow.
// Chain: MergingUnit/CT (measured value) -> MMXU -> PTOC/PIOC (start/operate) -> PTRC (trip) ->
// breaker "tripped" -> RDRE (disturbance record) -> IED LEDs -> event/alarm log.
// See docs/technical-design.md §6 and docs/research.md §6-§8.

import type { SubstationEvent, Alarm, SubstationState } from '../model';
import { findDataObject, findLogicalNode } from '../model';
import { findBay } from './lookup';
import { makeAlarm, makeEvent } from './eventLog';

export type FaultType = 'overcurrent' | 'earth-fault';

/** Maps a fault type to the PTOC instance that is configured to evaluate it in the demo topology. */
function protectionInstanceForFault(faultType: FaultType): string {
  return faultType === 'overcurrent' ? 'phase-oc' : 'earth-fault';
}

export interface InjectFaultResult {
  state: SubstationState;
  events: SubstationEvent[];
  alarms: Alarm[];
}

export function injectFault(state: SubstationState, bayId: string, faultType: FaultType): InjectFaultResult {
  const next = structuredClone(state);
  const bay = findBay(next, bayId);
  const events: SubstationEvent[] = [];
  const alarms: Alarm[] = [];

  if (!bay || !bay.ied || bay.breaker.status !== 'closed') {
    // Nothing to trip: bay missing protection, or already open/tripped. No-op, no false event.
    return { state: next, events, alarms };
  }

  const ied = bay.ied;
  const mmxu = findLogicalNode(ied, 'MMXU');
  const measured = findDataObject(mmxu, 'A');
  const ptoc = ied.logicalDevices
    .flatMap((ld) => ld.logicalNodes)
    .find((ln) => ln.class === 'PTOC' && ln.instanceId === protectionInstanceForFault(faultType));

  if (!mmxu || !measured || !ptoc) {
    return { state: next, events, alarms };
  }

  const pickupA = ptoc.settings?.pickupA ?? 400;
  const faultCurrentA = pickupA * 3; // simulated fault well above pickup, no time-delay ramp modeled

  measured.value = faultCurrentA;

  const strObj = findDataObject(ptoc, 'Str');
  const opObj = findDataObject(ptoc, 'Op');
  if (strObj) strObj.value = true;
  if (opObj) opObj.value = true;

  // PTRC: trip conditioning issues the trip -> breaker (XCBR) goes to 'tripped'.
  bay.breaker.status = 'tripped';

  // RDRE: disturbance record stub.
  ied.disturbanceRecords.push({
    id: `dr-${ied.id}-${ied.disturbanceRecords.length + 1}`,
    timestamp: new Date().toISOString(),
    faultType,
    peakMeasuredValueA: faultCurrentA,
  });

  // IED LED: trip indication, unacknowledged.
  const tripLed = ied.leds.find((l) => l.id === 'trip');
  if (tripLed) {
    tripLed.color = 'red';
    tripLed.mode = 'blinking-unack';
  }

  const cause = `${faultType} detected on ${bay.name}: ${ptoc.class} ${ptoc.instanceId} measured ${faultCurrentA} A (pickup ${pickupA} A), PTRC issued trip.`;
  events.push(makeEvent(ied.id, `Protection trip: ${bay.name}`, cause));
  alarms.push(makeAlarm('critical', `Breaker ${bay.breaker.id} tripped on ${faultType} — ${bay.name}`, bay.id));

  next.events = [...next.events, ...events];
  next.alarms = [...next.alarms, ...alarms];

  return { state: next, events, alarms };
}
