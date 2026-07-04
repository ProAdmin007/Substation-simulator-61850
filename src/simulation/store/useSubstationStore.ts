import { create } from 'zustand';
import type { SubstationState } from '../model';
import { createDemoSubstationState } from '../data/demoSubstation';
import { applyCommand, type Command } from '../engine/substationEngine';
import type { InterlockResult } from '../engine/interlocking';

interface SubstationStore {
  state: SubstationState;
  /** Reason for the most recently blocked command, shown by the bay control panel until the next command. */
  lastInterlockBlock?: InterlockResult & { allowed: false };
  selectedBayId?: string;
  selectedIedId?: string;
  showComms: boolean;
  showTutorial: boolean;
  /** SLD/Status overlay visibility — toggled with F, matching the reference project's controls. */
  showSld: boolean;
  /** 3D equipment nameplate labels visibility — toggled with Z. */
  showLabels: boolean;
  dispatch: (command: Command) => void;
  selectBay: (bayId: string | undefined) => void;
  selectIed: (iedId: string | undefined) => void;
  setShowComms: (show: boolean) => void;
  setShowTutorial: (show: boolean) => void;
  toggleSld: () => void;
  toggleLabels: () => void;
  /** Closes every open panel at once (E / Esc). */
  closeAllPanels: () => void;
}

export const useSubstationStore = create<SubstationStore>((set, get) => ({
  state: createDemoSubstationState(),
  lastInterlockBlock: undefined,
  selectedBayId: undefined,
  selectedIedId: undefined,
  showComms: false,
  showTutorial: true,
  showSld: true,
  showLabels: true,
  dispatch: (command: Command) => {
    const { state } = get();
    const result = applyCommand(state, command);
    set({
      state: result.state,
      lastInterlockBlock: result.interlockResult?.allowed === false ? result.interlockResult : undefined,
    });
  },
  selectBay: (bayId) => set({ selectedBayId: bayId }),
  selectIed: (iedId) => set({ selectedIedId: iedId }),
  setShowComms: (show) => set({ showComms: show }),
  setShowTutorial: (show) => set({ showTutorial: show }),
  toggleSld: () => set((s) => ({ showSld: !s.showSld })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  closeAllPanels: () => set({ selectedBayId: undefined, selectedIedId: undefined, showComms: false }),
}));
