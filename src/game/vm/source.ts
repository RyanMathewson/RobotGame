// Source paths tie a compiled instruction back to the block it came from, so the
// editor can highlight the currently-executing block (debug v0). A path addresses
// a statement within the nested block tree: a list of `Step`s descending into
// container blocks (loop/if), then a final `index` into the reached list.

/** Which child list of a container block a step descends into. */
export type Branch = 'body' | 'then' | 'otherwise';

/** One descent: pick the block at `i` in the current list, enter its `into` list. */
export interface Step {
  i: number;
  into: Branch;
}

/** Addresses one statement: descend `parent`, then take `index` in that list. */
export interface SrcPath {
  parent: Step[];
  index: number;
}

/** A stable string key for a path, for cheap equality (editor ↔ live debug). */
export function pathKey(p: SrcPath): string {
  return p.parent.map((s) => `${s.i}:${s.into}`).join('>') + '#' + p.index;
}
