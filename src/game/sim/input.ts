// Player input, modeled as data the sim consumes (keeps the sim DOM-free and
// deterministic given the input stream). The render layer translates raw DOM
// events into a FrameInput; the sim reads it each tick.

import type { Vec2 } from './components';
import type { BlockProgram } from '../vm/ast';

/** A request to (re)program a robot: replace its VM with a freshly compiled AST. */
export interface ProgramApply {
  entity: number;
  ast: BlockProgram;
}

export interface FrameInput {
  /** Continuous movement axis from held keys; each component in [-1, 1]. */
  moveAxis: Vec2;
  /**
   * One-shot click in tile coords. The sim decides what it means: clicking a
   * nearby node mines it; clicking a far node walks to it; clicking ground moves.
   * Consumed by the sim, then cleared.
   */
  clickTile: Vec2 | null;
  /**
   * Recipe ids the player asked the assembler to build (e.g. from a HUD button).
   * Drained each tick by the sim and appended to the assembler's queue.
   */
  buildRequests: string[];
  /** Programs the player applied from the editor; drained + compiled each tick. */
  programApplies: ProgramApply[];
}

export function createFrameInput(): FrameInput {
  return { moveAxis: { x: 0, y: 0 }, clickTile: null, buildRequests: [], programApplies: [] };
}

/** Key code -> unit direction. Supports WASD and arrow keys. */
const MOVE_KEYS: Record<string, Vec2> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export function isMoveKey(code: string): boolean {
  return code in MOVE_KEYS;
}

/** Combine all currently-held movement keys into a clamped axis. */
export function axisFromKeys(pressed: Set<string>): Vec2 {
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    const dir = MOVE_KEYS[code];
    if (dir) {
      x += dir.x;
      y += dir.y;
    }
  }
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}
