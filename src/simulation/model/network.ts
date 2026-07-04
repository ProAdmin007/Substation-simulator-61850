// Network layer. See docs/technical-design.md §3.4.

export type BusKind = 'station-bus' | 'process-bus';
export type BusProtocol = 'GOOSE' | 'MMS' | 'SV';

export interface NetworkBus {
  id: string;
  kind: BusKind;
  protocol: BusProtocol;
  /** Both buses are modeled as redundant PRP (IEC 62439-3) networks — see docs/research.md §7. */
  prp: true;
}

export interface ScadaPoint {
  id: string;
  ref: string;
  value: unknown;
  quality: 'good' | 'invalid' | 'questionable';
}

export interface CommsLink {
  id: string;
  protocol: 'GOOSE' | 'MMS' | 'IEC104' | 'Modbus';
  status: 'ok' | 'lost' | 'degraded';
}
