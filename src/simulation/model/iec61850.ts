// IEC 61850 (Edition 2.1) logical layer, modeled to reflect the shape of the standard's
// Logical Device / Logical Node / Common Data Class hierarchy — not a wire-accurate
// implementation. See docs/research.md §8 and docs/technical-design.md §3.3.

import type { PrpPortStatus } from './measurement';

export type LnClass =
  | 'LLN0'
  | 'LPHD'
  | 'XCBR'
  | 'XSWI'
  | 'CSWI'
  | 'MMXU'
  | 'PTOC'
  | 'PIOC'
  | 'PDIF'
  | 'PTRC'
  | 'RBRF'
  | 'RREC'
  | 'RDRE'
  | 'RSYN'
  | 'GGIO';

export type CommonDataClass = 'DPC' | 'ACD' | 'ACT' | 'MX' | 'SPS';

export interface DataObject {
  name: string;
  cdc: CommonDataClass;
  value: unknown;
}

export interface LogicalNode {
  class: LnClass;
  instanceId: string;
  dataObjects: DataObject[];
  /**
   * Simplified stand-in for IEC 61850 setting-group data (e.g. ASG pickup/delay attributes).
   * Not modeled as full Common Data Classes — this is an educational simulation, not a
   * certified engineering tool (see docs/research.md, closing note).
   */
  settings?: Record<string, number>;
}

export interface LogicalDevice {
  id: string;
  logicalNodes: LogicalNode[];
}

/** Fictional in-game equipment brands — see docs/game-design.md §4. Inspired by, not copies of, real vendors. */
export type VendorStyle = 'voltrix' | 'halvex' | 'greyhart';

export type LedColor = 'green' | 'amber' | 'red';
export type LedMode = 'off' | 'steady' | 'blinking-unack' | 'blinking-ack';

export interface LedState {
  id: string;
  label: string;
  color: LedColor;
  mode: LedMode;
}

export interface GoCb {
  id: string;
  purpose: 'trip' | 'interlock' | 'blocking';
}

export interface SvCbSubscription {
  id: string;
  mergingUnitId: string;
}

export interface ReportControlBlock {
  id: string;
  buffered: boolean;
  /** Dataset/report reference this RCB is configured with. A mismatch here (wrong reference after a
   * config change) is the "real fault" the player must find in the PAC-fault scenario, as opposed to
   * a PRP link that PRP redundancy tolerates. See docs/scenarios.md Scenario 4. */
  configOk: boolean;
}

export interface DisturbanceRecord {
  id: string;
  timestamp: string;
  faultType: 'overcurrent' | 'earth-fault';
  peakMeasuredValueA: number;
}

export type CommsStatus = {
  stationBus: 'ok' | 'lost';
  processBus: 'ok' | 'lost';
};

export interface Ied {
  id: string;
  name: string;
  vendorStyle: VendorStyle;
  logicalDevices: LogicalDevice[];
  commsStatus: CommsStatus;
  /** Redundant network ports [LAN A, LAN B] per PRP (IEC 62439-3) — see docs/research.md §7. */
  prpPorts: [PrpPortStatus, PrpPortStatus];
  leds: LedState[];
  goCbs: GoCb[];
  svCbs: SvCbSubscription[];
  reportControlBlocks: ReportControlBlock[];
  disturbanceRecords: DisturbanceRecord[];
}

/** Finds a logical node by class across all logical devices of an IED. */
export function findLogicalNode(ied: Ied, lnClass: LnClass): LogicalNode | undefined {
  for (const ld of ied.logicalDevices) {
    const ln = ld.logicalNodes.find((n) => n.class === lnClass);
    if (ln) return ln;
  }
  return undefined;
}

export function findDataObject(ln: LogicalNode | undefined, name: string): DataObject | undefined {
  return ln?.dataObjects.find((d) => d.name === name);
}
