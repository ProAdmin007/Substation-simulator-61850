import { describe, expect, it } from 'vitest';
import { createDemoSubstationState } from '../data/demoSubstation';
import { applyCommand } from './substationEngine';
import { findBay } from './lookup';

describe('interlocking', () => {
  it('blocks opening a disconnector while its breaker is closed', () => {
    const state = createDemoSubstationState();
    const result = applyCommand(state, { type: 'OpenDisconnector', bayId: 'bay-f1', disconnectorId: 'QS2' });
    expect(result.interlockResult?.allowed).toBe(false);
    // state must be unchanged (same reference) when a command is blocked
    expect(findBay(result.state, 'bay-f1')!.disconnectors[0].status).toBe('closed');
  });

  it('allows the full safe de-energization sequence for a feeder bay', () => {
    let state = createDemoSubstationState();

    state = applyCommand(state, { type: 'OpenBreaker', bayId: 'bay-f1' }).state;
    expect(findBay(state, 'bay-f1')!.breaker.status).toBe('open');

    const openDisc = applyCommand(state, { type: 'OpenDisconnector', bayId: 'bay-f1', disconnectorId: 'QS2' });
    expect(openDisc.interlockResult).toBeUndefined();
    state = openDisc.state;
    expect(findBay(state, 'bay-f1')!.disconnectors[0].status).toBe('open');

    const closeEarth = applyCommand(state, { type: 'CloseEarthingSwitch', bayId: 'bay-f1', earthingSwitchId: 'QE2' });
    expect(closeEarth.interlockResult).toBeUndefined();
    state = closeEarth.state;
    expect(findBay(state, 'bay-f1')!.earthingSwitches[0].status).toBe('closed');
  });

  it('blocks closing the earthing switch before the disconnector is open', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'OpenBreaker', bayId: 'bay-f1' }).state;

    const result = applyCommand(state, { type: 'CloseEarthingSwitch', bayId: 'bay-f1', earthingSwitchId: 'QE2' });
    expect(result.interlockResult?.allowed).toBe(false);
  });
});

describe('protection trip flow', () => {
  it('trips the breaker, records a disturbance record, and lights the trip LED on an earth fault', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'InjectFault', bayId: 'bay-f1', faultType: 'earth-fault' }).state;

    const bay = findBay(state, 'bay-f1')!;
    expect(bay.breaker.status).toBe('tripped');
    expect(bay.ied!.disturbanceRecords).toHaveLength(1);
    expect(bay.ied!.leds.find((l) => l.id === 'trip')!.mode).toBe('blinking-unack');
    expect(state.alarms).toHaveLength(1);
    expect(state.alarms[0].acknowledged).toBe(false);
  });

  it('requires alarm acknowledgment before the tripped breaker can be closed again', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'InjectFault', bayId: 'bay-f1', faultType: 'earth-fault' }).state;

    const blocked = applyCommand(state, { type: 'CloseBreaker', bayId: 'bay-f1' });
    expect(blocked.interlockResult?.allowed).toBe(false);

    const alarmId = state.alarms[0].id;
    state = applyCommand(state, { type: 'AcknowledgeAlarm', alarmId }).state;
    expect(findBay(state, 'bay-f1')!.ied!.leds.find((l) => l.id === 'trip')!.mode).toBe('blinking-ack');
  });
});

describe('PAC comms fault (Scenario 4)', () => {
  it('a PRP LAN failure degrades redundancy but does NOT cause a comms outage', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'InjectPacFault', iedId: 'ied-f2', kind: 'prp-link' }).state;
    const ied = findBay(state, 'bay-f2')!.ied!;
    expect(ied.prpPorts[1]).toBe('down');
    expect(ied.commsStatus.stationBus).toBe('ok'); // redundant LAN still carries traffic
  });

  it('a config mismatch loses the station bus and is fixed by correcting the config', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'InjectPacFault', iedId: 'ied-f2', kind: 'config' }).state;
    let ied = findBay(state, 'bay-f2')!.ied!;
    expect(ied.commsStatus.stationBus).toBe('lost');
    expect(ied.reportControlBlocks.every((r) => r.configOk)).toBe(false);

    state = applyCommand(state, { type: 'FixIedConfig', iedId: 'ied-f2' }).state;
    ied = findBay(state, 'bay-f2')!.ied!;
    expect(ied.commsStatus.stationBus).toBe('ok');
    expect(ied.reportControlBlocks.every((r) => r.configOk)).toBe(true);
  });

  it('"fixing config" on a PRP-only fault is a no-op that does not fabricate a restore', () => {
    let state = createDemoSubstationState();
    state = applyCommand(state, { type: 'InjectPacFault', iedId: 'ied-f2', kind: 'prp-link' }).state;
    state = applyCommand(state, { type: 'FixIedConfig', iedId: 'ied-f2' }).state;
    const ied = findBay(state, 'bay-f2')!.ied!;
    expect(ied.prpPorts[1]).toBe('down'); // still down — config fix doesn't repair a link
    expect(ied.commsStatus.stationBus).toBe('ok');
  });
});
