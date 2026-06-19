// Immutable edits on a block program, addressed by path (see vm/source.ts). Each
// op clones the whole program (programs are tiny) and splices the target list, so
// React state updates are straightforward and never alias the running program.

import type { BlockProgram, Stmt } from '../game/vm/ast';
import type { Step, Branch } from '../game/vm/source';

export type StmtKind = Stmt['op'];

/** A fresh block of the given kind, with sensible defaults. */
export function newStmt(kind: StmtKind): Stmt {
  switch (kind) {
    case 'loop':
      return { op: 'loop', body: [] };
    case 'if':
      return { op: 'if', cond: { kind: 'exists', target: { kind: 'nearestNode' } }, then: [], otherwise: [] };
    case 'navigateTo':
      return { op: 'navigateTo', target: { kind: 'nearestNode' } };
    case 'mine':
      return { op: 'mine', target: { kind: 'nearestNode' } };
    case 'deposit':
      return { op: 'deposit', target: { kind: 'nearestRefinery' } };
    case 'wait':
      return { op: 'wait', seconds: 1 };
  }
}

/** The child statement list a container block exposes under `into`, or null. */
export function childListOf(block: Stmt, into: Branch): Stmt[] | null {
  if (block.op === 'loop' && into === 'body') return block.body;
  if (block.op === 'if' && into === 'then') return block.then;
  if (block.op === 'if' && into === 'otherwise') return block.otherwise ?? null;
  return null;
}

/** Navigate to the statement list addressed by `parent` (mutates-safe on a clone). */
function listAt(program: BlockProgram, parent: Step[]): Stmt[] {
  let list: Stmt[] = program;
  for (const s of parent) {
    const block = list[s.i];
    let child = childListOf(block, s.into);
    if (child === null && block.op === 'if' && s.into === 'otherwise') {
      block.otherwise = []; // materialize an empty else on first descent
      child = block.otherwise;
    }
    if (child === null) throw new Error(`invalid program path at step ${s.i}/${s.into}`);
    list = child;
  }
  return list;
}

const clone = (p: BlockProgram): BlockProgram => structuredClone(p);

export function insertStmt(program: BlockProgram, parent: Step[], index: number, stmt: Stmt): BlockProgram {
  const next = clone(program);
  listAt(next, parent).splice(index, 0, stmt);
  return next;
}

export function removeStmt(program: BlockProgram, parent: Step[], index: number): BlockProgram {
  const next = clone(program);
  listAt(next, parent).splice(index, 1);
  return next;
}

/** Swap a statement with its neighbour; a no-op at the ends. */
export function moveStmt(program: BlockProgram, parent: Step[], index: number, dir: -1 | 1): BlockProgram {
  const next = clone(program);
  const list = listAt(next, parent);
  const j = index + dir;
  if (j < 0 || j >= list.length) return program;
  [list[index], list[j]] = [list[j], list[index]];
  return next;
}

/** Replace the block at a path with a new one (used for param edits). */
export function replaceStmt(program: BlockProgram, parent: Step[], index: number, stmt: Stmt): BlockProgram {
  const next = clone(program);
  listAt(next, parent)[index] = stmt;
  return next;
}
