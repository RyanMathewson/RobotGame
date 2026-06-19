// Robot VM instruction costs (design §9.6). Every executed instruction debits
// energy and consumes VM cycles, so program *efficiency* is a measurable in-game
// advantage: a tight loop does more work per joule than a sloppy one. Opcodes
// here are the *flat* ops the interpreter runs (control flow is lowered to jumps
// by the compiler); `NEAREST_OF` is sensing, charged whenever a target/condition
// is resolved against the world.

export type Opcode =
  // Actions
  | 'NAVIGATE_TO'
  | 'MINE'
  | 'DEPOSIT'
  | 'WAIT'
  // Sensing (charged on target/condition resolution)
  | 'NEAREST_OF'
  // Control flow (lowered from loop/if)
  | 'JUMP'
  | 'JUMP_IF_FALSE'
  | 'HALT';

export interface InstructionMeta {
  /** Energy drained when this instruction executes. */
  energyCost: number;
  /** VM cycles consumed (gates how many run per tick at a given Logic Core tier). */
  cycleCost: number;
}

/** Provisional costs — tuned during MVP balancing (design §13.4). Control-flow
 *  ops cost a little (not zero) so that a uselessly spinning program still drains
 *  energy and underperforms a well-conditioned one. */
export const INSTRUCTION_TABLE: Record<Opcode, InstructionMeta> = {
  NAVIGATE_TO: { energyCost: 0.5, cycleCost: 1 },
  MINE: { energyCost: 1.0, cycleCost: 1 },
  DEPOSIT: { energyCost: 0.3, cycleCost: 1 },
  WAIT: { energyCost: 0.0, cycleCost: 1 },
  NEAREST_OF: { energyCost: 0.3, cycleCost: 2 },
  JUMP: { energyCost: 0.02, cycleCost: 1 },
  JUMP_IF_FALSE: { energyCost: 0.05, cycleCost: 1 },
  HALT: { energyCost: 0.0, cycleCost: 1 },
};
