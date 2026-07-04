import type { BayType, Breaker, Busbar, Disconnector, EarthingSwitch } from './topology';
import type { CurrentTransformer, MergingUnit, VoltageTransformer } from './measurement';
import type { Ied } from './iec61850';

export interface Bay {
  id: string;
  name: string;
  type: BayType;
  breaker: Breaker;
  disconnectors: Disconnector[];
  earthingSwitches: EarthingSwitch[];
  cts: CurrentTransformer[];
  vts: VoltageTransformer[];
  mergingUnit?: MergingUnit;
  ied?: Ied;
}

export interface VoltageLevel {
  id: string;
  kv: 120 | 20 | 10;
  busbars: Busbar[];
  bays: Bay[];
}

export interface Substation {
  id: string;
  name: string;
  voltageLevels: VoltageLevel[];
}
