import type { Bay, SubstationState } from '../model';

export function findBay(state: SubstationState, bayId: string): Bay | undefined {
  for (const vl of state.substation.voltageLevels) {
    const bay = vl.bays.find((b) => b.id === bayId);
    if (bay) return bay;
  }
  return undefined;
}

export function findBayIndex(state: SubstationState, bayId: string): { vlIndex: number; bayIndex: number } | undefined {
  for (let vlIndex = 0; vlIndex < state.substation.voltageLevels.length; vlIndex++) {
    const bayIndex = state.substation.voltageLevels[vlIndex].bays.findIndex((b) => b.id === bayId);
    if (bayIndex !== -1) return { vlIndex, bayIndex };
  }
  return undefined;
}
