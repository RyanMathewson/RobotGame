// Lightweight UI state (design §15.1). The Pixi/sim layer pushes throttled
// snapshots here; React reads them. The sim itself never reads from this store.

import { create } from 'zustand';
import type { ItemMap } from '../game/sim/components';
import type { FleetStats } from '../game/loop';
import type { BlockProgram } from '../game/vm/ast';
import type { RobotDebug } from '../game/vm/interpreter';

export interface HudState {
  tick: number;
  fps: number;
  robotCount: number;
  playerPos: { x: number; y: number } | null;
  cargoUsed: number;
  cargoCapacity: number;
  mining: boolean;
  notice: string | null;
  stockpile: ItemMap;
  refineryQueue: number;
  refineryBusy: boolean;
  assemblerLabel: string | null;
  assemblerProgress: number;
  assemblerQueue: number;
  fleet: FleetStats;
  /** The robot whose program is open in the editor, or null. */
  selectedRobot: number | null;
  /** Live execution snapshot of the selected robot (block highlight + trace). */
  robotDebug: RobotDebug | null;
  /** Which control the onboarding wants to highlight (e.g. 'build'), or null. */
  tutorialHint: string | null;
  /** Bridge to the sim's input: ask the assembler to build a recipe id.
   *  Registered by PixiStage; no-op until the loop is running. */
  requestBuild: (recipeId: string) => void;
  /** Read a robot's current program AST (deep-cloned) for editing. */
  getRobotProgram: (entity: number) => BlockProgram | null;
  /** Apply an edited program to a robot (recompiles its VM next tick). */
  applyProgram: (entity: number, ast: BlockProgram) => void;
  /** Persistence bridges (registered by PixiStage; close over the live world). */
  saveGame: () => Promise<void>;
  loadGame: () => Promise<boolean>; // false ⇒ nothing saved yet
  exportGame: () => void;
  importGame: (file: File) => Promise<void>;
  set: (partial: Partial<Omit<HudState, 'set'>>) => void;
}

export const useHud = create<HudState>((set) => ({
  tick: 0,
  fps: 0,
  robotCount: 0,
  playerPos: null,
  cargoUsed: 0,
  cargoCapacity: 0,
  mining: false,
  notice: null,
  stockpile: {},
  refineryQueue: 0,
  refineryBusy: false,
  assemblerLabel: null,
  assemblerProgress: 0,
  assemblerQueue: 0,
  fleet: { count: 0, running: 0, blocked: 0, leadStatus: null, leadEnergyPct: null },
  selectedRobot: null,
  robotDebug: null,
  tutorialHint: null,
  requestBuild: () => {},
  getRobotProgram: () => null,
  applyProgram: () => {},
  saveGame: async () => {},
  loadGame: async () => false,
  exportGame: () => {},
  importGame: async () => {},
  set: (partial) => set(partial),
}));
