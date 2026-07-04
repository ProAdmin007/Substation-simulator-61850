// "Meadow Creek Substation" — the one hand-authored topology used by the prototype.
// IDs and structure match docs/scenarios.md exactly so the docs and the running app agree.

import type { Ied, LogicalDevice, MergingUnit, SubstationState } from '../model';

function makeMergingUnit(id: string, bayId: string): MergingUnit {
  return {
    id,
    bayId,
    svControlBlocks: [{ id: `${id}-sv1`, samplesPerCycle: 80 }],
    prpPorts: ['up', 'up'],
  };
}

function makeFeederIed(id: string, name: string, vendorStyle: Ied['vendorStyle']): Ied {
  const logicalDevices: LogicalDevice[] = [
    {
      id: `${id}-LD0`,
      logicalNodes: [
        { class: 'LLN0', instanceId: '0', dataObjects: [] },
        { class: 'LPHD', instanceId: '1', dataObjects: [] },
        {
          class: 'MMXU',
          instanceId: '1',
          dataObjects: [{ name: 'A', cdc: 'MX', value: 82 }],
        },
        {
          class: 'PTOC',
          instanceId: 'phase-oc',
          dataObjects: [
            { name: 'Str', cdc: 'ACD', value: false },
            { name: 'Op', cdc: 'ACT', value: false },
          ],
          settings: { pickupA: 400, timeDelayS: 0.3 },
        },
        {
          class: 'PTOC',
          instanceId: 'earth-fault',
          dataObjects: [
            { name: 'Str', cdc: 'ACD', value: false },
            { name: 'Op', cdc: 'ACT', value: false },
          ],
          settings: { pickupA: 40, timeDelayS: 0.2 },
        },
        { class: 'PTRC', instanceId: '1', dataObjects: [{ name: 'Tr', cdc: 'ACT', value: false }] },
        { class: 'XCBR', instanceId: '1', dataObjects: [{ name: 'Pos', cdc: 'DPC', value: 'closed' }] },
        { class: 'CSWI', instanceId: '1', dataObjects: [] },
        { class: 'RDRE', instanceId: '1', dataObjects: [] },
      ],
    },
  ];

  return {
    id,
    name,
    vendorStyle,
    logicalDevices,
    commsStatus: { stationBus: 'ok', processBus: 'ok' },
    prpPorts: ['up', 'up'],
    leds: [
      { id: 'ready', label: 'READY', color: 'green', mode: 'steady' },
      { id: 'trip', label: 'TRIP', color: 'red', mode: 'off' },
      { id: 'alarm', label: 'ALARM', color: 'amber', mode: 'off' },
    ],
    goCbs: [{ id: `${id}-gocb-trip`, purpose: 'trip' }],
    svCbs: [{ id: `${id}-svcb1`, mergingUnitId: id === 'ied-f1' ? 'mu-f1' : 'mu-f2' }],
    reportControlBlocks: [{ id: `${id}-rcb1`, buffered: true, configOk: true }],
    disturbanceRecords: [],
  };
}

export function createDemoSubstationState(): SubstationState {
  return {
    substation: {
      id: 'sub-1',
      // Named after the Hoogeveen-Toldijk substation locality; the feeder names below use real
      // Hoogeveen districts/industrial areas (illustrative — not verified against the operator's
      // actual bay schedule).
      name: 'Onderstation Hoogeveen-Toldijk',
      voltageLevels: [
        {
          id: 'vl-120',
          kv: 120,
          busbars: [{ id: 'bb-120-1', status: 'energized' }],
          bays: [
            {
              id: 'bay-l1',
              name: '120 kV Netvoeding Beilen',
              type: 'line',
              breaker: { id: 'QA-L1', status: 'closed' },
              disconnectors: [],
              earthingSwitches: [],
              cts: [],
              vts: [],
            },
            {
              id: 'bay-t1-hv',
              name: '120 kV Trafoveld T1',
              type: 'transformer',
              breaker: { id: 'QA-T1H', status: 'closed' },
              disconnectors: [],
              earthingSwitches: [],
              cts: [],
              vts: [],
            },
          ],
        },
        {
          id: 'vl-20',
          kv: 20,
          busbars: [{ id: 'bb-20-1', status: 'energized' }],
          bays: [
            {
              id: 'bay-t1-mv',
              name: '20 kV Trafo-inkomer T1',
              type: 'transformer',
              breaker: { id: 'QA1', status: 'closed' },
              disconnectors: [{ id: 'QS1', status: 'closed' }],
              earthingSwitches: [{ id: 'QE1', status: 'open' }],
              cts: [{ id: 'CT1', bayId: 'bay-t1-mv', ratio: '1000/1' }],
              vts: [{ id: 'VT1', bayId: 'bay-t1-mv', ratio: '20000/110' }],
            },
            {
              id: 'bay-f1',
              name: '20 kV Veld Buitenvaart',
              type: 'feeder',
              breaker: { id: 'QA2', status: 'closed' },
              disconnectors: [{ id: 'QS2', status: 'closed' }],
              earthingSwitches: [{ id: 'QE2', status: 'open' }],
              cts: [{ id: 'CT2', bayId: 'bay-f1', ratio: '400/1' }],
              vts: [],
              mergingUnit: makeMergingUnit('mu-f1', 'bay-f1'),
              ied: makeFeederIed('ied-f1', 'Greyhart Sentinel-610 (Buitenvaart)', 'greyhart'),
            },
            {
              id: 'bay-f2',
              name: '20 kV Veld Wolfsbos',
              type: 'feeder',
              breaker: { id: 'QA3', status: 'closed' },
              disconnectors: [{ id: 'QS3', status: 'closed' }],
              earthingSwitches: [{ id: 'QE3', status: 'open' }],
              cts: [{ id: 'CT3', bayId: 'bay-f2', ratio: '400/1' }],
              vts: [],
              mergingUnit: makeMergingUnit('mu-f2', 'bay-f2'),
              ied: makeFeederIed('ied-f2', 'Greyhart Sentinel-610 (Wolfsbos)', 'greyhart'),
            },
          ],
        },
      ],
    },
    transformers: [
      { id: 'tx-1', name: 'T1', ratioKv: [120, 20], status: 'in-service', loadingPercent: 62 },
    ],
    networkBuses: [
      { id: 'station-bus-1', kind: 'station-bus', protocol: 'GOOSE', prp: true },
      { id: 'process-bus-1', kind: 'process-bus', protocol: 'SV', prp: true },
    ],
    scadaPoints: [],
    alarms: [],
    events: [],
  };
}
