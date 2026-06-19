// Block AST -> flat bytecode (design §15.2). Control flow is lowered to jumps so
// the interpreter is a simple program-counter machine: cheap to budget per tick
// and trivially deterministic. Leaf expressions (targets/conditions) are carried
// inline and evaluated at run time — for v0's tiny expression set this is simpler
// than a value stack; a stack-based value model is the growth path (variables,
// arithmetic) in Alpha.
//
// Every instruction carries `src`, the path of the block it came from, so the
// editor can highlight the block currently at the program counter.

import type { BlockProgram, Stmt, TargetExpr, Cond } from './ast';
import type { SrcPath, Step } from './source';

/** One compiled instruction. `op` values are a subset of the cost-table Opcodes. */
export type Instr = (
  | { op: 'NAVIGATE_TO'; target: TargetExpr }
  | { op: 'MINE'; target: TargetExpr }
  | { op: 'DEPOSIT'; target: TargetExpr }
  | { op: 'WAIT'; seconds: number }
  | { op: 'JUMP'; addr: number }
  | { op: 'JUMP_IF_FALSE'; cond: Cond; addr: number }
  | { op: 'HALT' }
) & { src: SrcPath };

/** Lower a block program to bytecode. The final instruction is always HALT. */
export function compileProgram(ast: BlockProgram): Instr[] {
  const code: Instr[] = [];

  const block = (stmts: Stmt[], parent: Step[]): void => {
    stmts.forEach((s, index) => stmt(s, parent, index));
  };

  const stmt = (s: Stmt, parent: Step[], index: number): void => {
    const src: SrcPath = { parent, index };
    switch (s.op) {
      case 'navigateTo':
        code.push({ op: 'NAVIGATE_TO', target: s.target, src });
        break;
      case 'mine':
        code.push({ op: 'MINE', target: s.target, src });
        break;
      case 'deposit':
        code.push({ op: 'DEPOSIT', target: s.target, src });
        break;
      case 'wait':
        code.push({ op: 'WAIT', seconds: s.seconds, src });
        break;
      case 'loop': {
        const start = code.length;
        block(s.body, [...parent, { i: index, into: 'body' }]);
        code.push({ op: 'JUMP', addr: start, src }); // tail jump back to the top
        break;
      }
      case 'if': {
        // if cond is false, skip the `then` (jump to else / end).
        const branch: Instr = { op: 'JUMP_IF_FALSE', cond: s.cond, addr: -1, src };
        code.push(branch);
        block(s.then, [...parent, { i: index, into: 'then' }]);
        if (s.otherwise && s.otherwise.length > 0) {
          const skipElse: Instr = { op: 'JUMP', addr: -1, src };
          code.push(skipElse);
          if (branch.op === 'JUMP_IF_FALSE') branch.addr = code.length; // else starts here
          block(s.otherwise, [...parent, { i: index, into: 'otherwise' }]);
          if (skipElse.op === 'JUMP') skipElse.addr = code.length; // after the else
        } else {
          if (branch.op === 'JUMP_IF_FALSE') branch.addr = code.length; // after the then
        }
        break;
      }
    }
  };

  block(ast, []);
  code.push({ op: 'HALT', src: { parent: [], index: ast.length } });
  return code;
}
