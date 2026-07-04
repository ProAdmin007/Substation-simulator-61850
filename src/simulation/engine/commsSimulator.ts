// PAC communications fault simulation (docs/scenarios.md Scenario 4). Models two failure modes
// that present the SAME visible symptom (SCADA stops updating for a bay's IED) but need opposite
// responses — the core teaching point that "not every red indicator is an outage, and not every
// outage is a hardware problem" (docs/research.md §7 on PRP redundancy).
//
//   'prp-link'  → one PRP port (LAN B) goes down. PRP (IEC 62439-3) carries every frame on BOTH
//                 LANs, so the redundant path keeps traffic flowing: commsStatus stays 'ok'. The
//                 correct action is to DIAGNOSE degraded redundancy and log it — NOT to "fix" comms.
//   'config'    → a report control block reference mismatch (e.g. after a config change). There is
//                 no redundancy for a logical/config error: commsStatus.stationBus goes 'lost' and
//                 the player must correct the configuration to restore reporting.

import type { Ied, SubstationEvent, Alarm, SubstationState } from '../model';
import { makeAlarm, makeEvent } from './eventLog';

export type PacFaultKind = 'prp-link' | 'config';

export interface PacFaultResult {
  state: SubstationState;
  events: SubstationEvent[];
  alarms: Alarm[];
}

function findIed(state: SubstationState, iedId: string): Ied | undefined {
  for (const vl of state.substation.voltageLevels) {
    for (const bay of vl.bays) {
      if (bay.ied?.id === iedId) return bay.ied;
    }
  }
  return undefined;
}

export function injectPacFault(state: SubstationState, iedId: string, kind: PacFaultKind): PacFaultResult {
  const next = structuredClone(state);
  const ied = findIed(next, iedId);
  const events: SubstationEvent[] = [];
  const alarms: Alarm[] = [];
  if (!ied) return { state: next, events, alarms };

  if (kind === 'prp-link') {
    ied.prpPorts[1] = 'down'; // LAN B down; LAN A still carries traffic
    // commsStatus deliberately unchanged — PRP tolerates a single-LAN failure.
    events.push(
      makeEvent(
        ied.id,
        `PRP LAN B link down on ${ied.name}`,
        'Physical link/port fault on one PRP LAN. Redundant LAN A still carrying traffic — no communications outage, redundancy degraded.',
      ),
    );
    alarms.push(makeAlarm('warning', `PRP redundancy degraded on ${ied.name} (LAN B down)`));
  } else {
    ied.reportControlBlocks.forEach((rcb) => (rcb.configOk = false));
    ied.commsStatus.stationBus = 'lost';
    events.push(
      makeEvent(
        ied.id,
        `Report control block reference mismatch on ${ied.name}`,
        'Buffered report control block points to an invalid dataset reference after a configuration change — SCADA (station bus / MMS reporting) receives no updates for this bay.',
      ),
    );
    alarms.push(makeAlarm('critical', `SCADA communications lost with ${ied.name} (station bus)`));
  }

  next.events = [...next.events, ...events];
  next.alarms = [...next.alarms, ...alarms];
  return { state: next, events, alarms };
}

/** Corrects the report-control-block configuration and restores station-bus comms. Only meaningful
 * for the 'config' fault; a no-op (with an explanatory event) otherwise, so "fixing" a PRP-link
 * condition as if it were an outage teaches that no config change was warranted. */
export function fixIedConfig(state: SubstationState, iedId: string): PacFaultResult {
  const next = structuredClone(state);
  const ied = findIed(next, iedId);
  const events: SubstationEvent[] = [];
  if (!ied) return { state: next, events, alarms: [] };

  const hadConfigFault = ied.reportControlBlocks.some((rcb) => !rcb.configOk);
  if (hadConfigFault) {
    ied.reportControlBlocks.forEach((rcb) => (rcb.configOk = true));
    ied.commsStatus.stationBus = 'ok';
    events.push(makeEvent(ied.id, `Configuration corrected on ${ied.name}`, 'Report control block reference restored — station bus communications re-established.'));
  } else {
    events.push(
      makeEvent(
        ied.id,
        `No configuration fault found on ${ied.name}`,
        'Configuration is already valid. If a PRP LAN is down, that is a hardware repair to schedule, not a configuration change — PRP redundancy is tolerating it with no outage.',
      ),
    );
  }
  next.events = [...next.events, ...events];
  return { state: next, events, alarms: [] };
}

/** Repairs a downed PRP port (restores LAN B). */
export function restorePrpPort(state: SubstationState, iedId: string): PacFaultResult {
  const next = structuredClone(state);
  const ied = findIed(next, iedId);
  const events: SubstationEvent[] = [];
  if (!ied) return { state: next, events, alarms: [] };

  if (ied.prpPorts[1] === 'down') {
    ied.prpPorts[1] = 'up';
    events.push(makeEvent(ied.id, `PRP LAN B link restored on ${ied.name}`, 'Physical link repaired — full PRP redundancy re-established.'));
  }
  next.events = [...next.events, ...events];
  return { state: next, events, alarms: [] };
}
