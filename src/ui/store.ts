// Lightweight UI state (design §15.1). The Pixi/sim layer pushes throttled
// snapshots here; React reads them. The sim itself never reads from this store.

import { create } from 'zustand';

export interface HudState {
  tick: number;
  fps: number;
  robotCount: number;
  set: (partial: Partial<Omit<HudState, 'set'>>) => void;
}

export const useHud = create<HudState>((set) => ({
  tick: 0,
  fps: 0,
  robotCount: 0,
  set: (partial) => set(partial),
}));
