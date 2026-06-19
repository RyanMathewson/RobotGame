// Robot VM instruction set (design §9.2). This file establishes the shape of the
// program model; the AST→bytecode compiler and the ticked interpreter land in
// Phase 2 (see docs/TASKS.md). Each instruction will carry an energy/cycle cost
// so that program *efficiency* is a measurable in-game advantage (design §9.6).

export type Opcode =
  // Movement
  | 'NAVIGATE_TO'
  // Actions
  | 'MINE'
  | 'DEPOSIT'
  // Sensing
  | 'NEAREST_OF'
  // Control flow
  | 'LOOP'
  | 'IF';

export interface InstructionMeta {
  opcode: Opcode;
  /** Energy drained when this instruction executes. */
  energyCost: number;
  /** VM cycles consumed (gates how many run per tick at a given Logic Core tier). */
  cycleCost: number;
}

/** Provisional costs — tuned during MVP balancing (design §13.4). */
export const INSTRUCTION_TABLE: Record<Opcode, InstructionMeta> = {
  NAVIGATE_TO: { opcode: 'NAVIGATE_TO', energyCost: 0.5, cycleCost: 1 },
  MINE: { opcode: 'MINE', energyCost: 1.0, cycleCost: 1 },
  DEPOSIT: { opcode: 'DEPOSIT', energyCost: 0.2, cycleCost: 1 },
  NEAREST_OF: { opcode: 'NEAREST_OF', energyCost: 0.3, cycleCost: 2 },
  LOOP: { opcode: 'LOOP', energyCost: 0.0, cycleCost: 1 },
  IF: { opcode: 'IF', energyCost: 0.0, cycleCost: 1 },
};
