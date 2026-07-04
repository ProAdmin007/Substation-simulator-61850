// Measurement & process bus layer. See docs/technical-design.md §3.2.

export interface CurrentTransformer {
  id: string;
  bayId: string;
  ratio: string;
}

export interface VoltageTransformer {
  id: string;
  bayId: string;
  ratio: string;
}

export interface SvControlBlock {
  id: string;
  samplesPerCycle: 80 | 256;
}

export type PrpPortStatus = 'up' | 'down';

export interface MergingUnit {
  id: string;
  bayId: string;
  svControlBlocks: SvControlBlock[];
  /** [LAN A, LAN B] — see docs/research.md §7 (PRP, IEC 62439-3). */
  prpPorts: [PrpPortStatus, PrpPortStatus];
}
