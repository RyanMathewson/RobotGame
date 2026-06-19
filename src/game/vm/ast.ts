// The robot program as an authored block tree (design §9.1). This is the shape
// the Blockly editor will produce/consume; the compiler (compiler.ts) lowers it
// to flat bytecode for the interpreter. Kept plain & serializable for save/load.

import type { RawKind } from '../sim/components';

/** A target the robot resolves against the world when an instruction runs. */
export type TargetExpr =
  | { kind: 'nearestNode'; of?: RawKind } // nearest resource node (optionally of a kind)
  | { kind: 'nearestRefinery' };

/** A boolean test resolved against the world at run time (design §9.2.D/E). */
export type Cond =
  | { kind: 'exists'; target: TargetExpr } // does the target resolve to something?
  | { kind: 'cargoFull' }
  | { kind: 'not'; of: Cond };

/** A statement block. An authored program is an ordered list of these. */
export type Stmt =
  | { op: 'loop'; body: Stmt[] }
  | { op: 'if'; cond: Cond; then: Stmt[]; otherwise?: Stmt[] }
  | { op: 'navigateTo'; target: TargetExpr }
  | { op: 'mine'; target: TargetExpr }
  | { op: 'deposit'; target: TargetExpr }
  | { op: 'wait'; seconds: number };

/** A whole program: the top-level sequence of blocks. */
export type BlockProgram = Stmt[];
