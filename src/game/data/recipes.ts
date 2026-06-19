// Data-driven recipes (design §15.3, §7). The Refinery turns one raw input into a
// refined output over time; the Assembler turns refined materials into parts or
// whole robots. Tune/extend content here without touching system code.

import type { ItemKind, ItemMap } from '../sim/components';

export interface RefineRecipe {
  input: ItemKind;
  inputQty: number;
  output: ItemKind;
  outputQty: number;
  /** seconds to process one batch */
  seconds: number;
}

export const REFINE_RECIPES: RefineRecipe[] = [
  { input: 'iron', inputQty: 2, output: 'iron_ingot', outputQty: 1, seconds: 2 },
  { input: 'scrap', inputQty: 3, output: 'carbon', outputQty: 1, seconds: 2 },
  { input: 'silica', inputQty: 2, output: 'glass', outputQty: 1, seconds: 2 },
];

export function refineRecipeFor(input: ItemKind): RefineRecipe | undefined {
  return REFINE_RECIPES.find((r) => r.input === input);
}

// --- Assembly ----------------------------------------------------------------
/** What an assemble recipe produces: either a stockpiled item, or a new robot
 *  spawned into the world with the given chassis stats. */
export type AssembleOutput =
  | { kind: 'item'; item: ItemKind; qty: number }
  | { kind: 'robot'; label: string; speed: number; cargo: number };

export interface AssembleRecipe {
  id: string;
  label: string;
  /** refined materials consumed from the colony stockpile to start a build */
  inputs: ItemMap;
  output: AssembleOutput;
  /** seconds to assemble one unit */
  seconds: number;
}

export const ASSEMBLE_RECIPES: AssembleRecipe[] = [
  {
    id: 'worker_mk1',
    label: 'Worker Mk1',
    inputs: { iron_ingot: 5, carbon: 2 },
    output: { kind: 'robot', label: 'Worker Mk1', speed: 3.5, cargo: 25 },
    seconds: 6,
  },
];

export function assembleRecipeFor(id: string): AssembleRecipe | undefined {
  return ASSEMBLE_RECIPES.find((r) => r.id === id);
}
