import type { Substation } from './substation';
import type { Transformer } from './topology';
import type { NetworkBus, ScadaPoint } from './network';
import type { Alarm, SubstationEvent } from './events';

export interface SubstationState {
  substation: Substation;
  transformers: Transformer[];
  networkBuses: NetworkBus[];
  scadaPoints: ScadaPoint[];
  alarms: Alarm[];
  events: SubstationEvent[];
}
