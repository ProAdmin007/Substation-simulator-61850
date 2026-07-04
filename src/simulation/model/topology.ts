// Physical/topology layer. See docs/technical-design.md §3.1.

export type BreakerStatus = 'open' | 'closed' | 'tripped';
export type DisconnectorStatus = 'open' | 'closed' | 'moving';
export type EarthingSwitchStatus = 'open' | 'closed';
export type BusbarStatus = 'energized' | 'de-energized';
export type BayType = 'line' | 'transformer' | 'feeder' | 'coupler';

export interface Breaker {
  id: string;
  status: BreakerStatus;
}

export interface Disconnector {
  id: string;
  status: DisconnectorStatus;
}

export interface EarthingSwitch {
  id: string;
  status: EarthingSwitchStatus;
}

export interface Busbar {
  id: string;
  status: BusbarStatus;
}

export interface Transformer {
  id: string;
  name: string;
  ratioKv: [number, number];
  status: 'in-service' | 'out-of-service';
  loadingPercent: number;
}
