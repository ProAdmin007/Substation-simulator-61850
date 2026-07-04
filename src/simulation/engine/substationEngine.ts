// Single command-handling entry point. Pure with respect to its inputs: applyCommand always
// clones state before mutating, so the same (state, command) pair always yields the same
// result — this is what keeps the engine trivially unit-testable and keeps the Zustand store a
// thin wrapper. See docs/technical-design.md §4.

import type { SubstationState } from '../model';
import { findBay } from './lookup';
import {
  canCloseBreaker,
  canCloseEarthingSwitch,
  canCloseTrippedBreaker,
  canOperateDisconnector,
  type InterlockResult,
} from './interlocking';
import { makeEvent } from './eventLog';
import { injectFault, type FaultType } from './protectionEngine';
import { fixIedConfig, injectPacFault, restorePrpPort, type PacFaultKind } from './commsSimulator';

export type Command =
  | { type: 'OpenBreaker'; bayId: string }
  | { type: 'CloseBreaker'; bayId: string }
  | { type: 'OpenDisconnector'; bayId: string; disconnectorId: string }
  | { type: 'CloseDisconnector'; bayId: string; disconnectorId: string }
  | { type: 'OpenEarthingSwitch'; bayId: string; earthingSwitchId: string }
  | { type: 'CloseEarthingSwitch'; bayId: string; earthingSwitchId: string }
  | { type: 'AcknowledgeAlarm'; alarmId: string }
  | { type: 'InjectFault'; bayId: string; faultType: FaultType }
  | { type: 'InjectPacFault'; iedId: string; kind: PacFaultKind }
  | { type: 'FixIedConfig'; iedId: string }
  | { type: 'RestorePrpPort'; iedId: string };

export interface ApplyCommandResult {
  state: SubstationState;
  interlockResult?: InterlockResult;
}

export function applyCommand(state: SubstationState, command: Command): ApplyCommandResult {
  switch (command.type) {
    case 'OpenBreaker':
    case 'CloseBreaker':
      return applyBreakerCommand(state, command);
    case 'OpenDisconnector':
    case 'CloseDisconnector':
      return applyDisconnectorCommand(state, command);
    case 'OpenEarthingSwitch':
    case 'CloseEarthingSwitch':
      return applyEarthingSwitchCommand(state, command);
    case 'AcknowledgeAlarm':
      return applyAcknowledgeAlarm(state, command);
    case 'InjectFault': {
      const result = injectFault(state, command.bayId, command.faultType);
      return { state: result.state };
    }
    case 'InjectPacFault':
      return { state: injectPacFault(state, command.iedId, command.kind).state };
    case 'FixIedConfig':
      return { state: fixIedConfig(state, command.iedId).state };
    case 'RestorePrpPort':
      return { state: restorePrpPort(state, command.iedId).state };
  }
}

function applyBreakerCommand(
  state: SubstationState,
  command: { type: 'OpenBreaker' | 'CloseBreaker'; bayId: string },
): ApplyCommandResult {
  const next = structuredClone(state);
  const bay = findBay(next, command.bayId);
  if (!bay) return { state: next };

  if (command.type === 'OpenBreaker') {
    bay.breaker.status = 'open';
    next.events = [...next.events, makeEvent(bay.breaker.id, `Breaker ${bay.breaker.id} opened`, 'Operator command')];
    return { state: next };
  }

  const hasUnacknowledgedTrip = next.alarms.some((a) => a.bayId === bay.id && !a.acknowledged);
  const tripCheck = canCloseTrippedBreaker(bay, hasUnacknowledgedTrip);
  if (!tripCheck.allowed) return { state, interlockResult: tripCheck };

  const check = canCloseBreaker(bay);
  if (!check.allowed) return { state, interlockResult: check };

  bay.breaker.status = 'closed';
  next.events = [...next.events, makeEvent(bay.breaker.id, `Breaker ${bay.breaker.id} closed`, 'Operator command')];
  return { state: next };
}

function applyDisconnectorCommand(
  state: SubstationState,
  command: { type: 'OpenDisconnector' | 'CloseDisconnector'; bayId: string; disconnectorId: string },
): ApplyCommandResult {
  const bay = findBay(state, command.bayId);
  if (!bay) return { state };
  const disconnector = bay.disconnectors.find((d) => d.id === command.disconnectorId);
  if (!disconnector) return { state };

  const check = canOperateDisconnector(bay, disconnector);
  if (!check.allowed) return { state, interlockResult: check };

  const next = structuredClone(state);
  const nextBay = findBay(next, command.bayId)!;
  const nextDisconnector = nextBay.disconnectors.find((d) => d.id === command.disconnectorId)!;
  const targetStatus = command.type === 'OpenDisconnector' ? 'open' : 'closed';
  nextDisconnector.status = targetStatus;
  next.events = [
    ...next.events,
    makeEvent(disconnector.id, `Disconnector ${disconnector.id} ${targetStatus}`, 'Operator command'),
  ];
  return { state: next };
}

function applyEarthingSwitchCommand(
  state: SubstationState,
  command: { type: 'OpenEarthingSwitch' | 'CloseEarthingSwitch'; bayId: string; earthingSwitchId: string },
): ApplyCommandResult {
  const bay = findBay(state, command.bayId);
  if (!bay) return { state };
  const earthingSwitch = bay.earthingSwitches.find((e) => e.id === command.earthingSwitchId);
  if (!earthingSwitch) return { state };

  if (command.type === 'CloseEarthingSwitch') {
    const check = canCloseEarthingSwitch(bay, earthingSwitch);
    if (!check.allowed) return { state, interlockResult: check };
  }

  const next = structuredClone(state);
  const nextBay = findBay(next, command.bayId)!;
  const nextEarth = nextBay.earthingSwitches.find((e) => e.id === command.earthingSwitchId)!;
  const targetStatus = command.type === 'OpenEarthingSwitch' ? 'open' : 'closed';
  nextEarth.status = targetStatus;
  next.events = [
    ...next.events,
    makeEvent(earthingSwitch.id, `Earthing switch ${earthingSwitch.id} ${targetStatus}`, 'Operator command'),
  ];
  return { state: next };
}

function applyAcknowledgeAlarm(state: SubstationState, command: { alarmId: string }): ApplyCommandResult {
  const next = structuredClone(state);
  const alarm = next.alarms.find((a) => a.id === command.alarmId);
  if (!alarm) return { state: next };
  alarm.acknowledged = true;

  // Acknowledging a trip alarm also clears the IED's unacknowledged trip LED.
  if (alarm.bayId) {
    const bay = findBay(next, alarm.bayId);
    const tripLed = bay?.ied?.leds.find((l) => l.id === 'trip');
    if (tripLed && tripLed.mode === 'blinking-unack') {
      tripLed.mode = 'blinking-ack';
    }
  }

  next.events = [...next.events, makeEvent(alarm.id, `Alarm acknowledged: ${alarm.message}`, 'Operator acknowledgment')];
  return { state: next };
}
