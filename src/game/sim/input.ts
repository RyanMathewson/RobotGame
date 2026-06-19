// Player input, modeled as data the sim consumes (keeps the sim DOM-free and
// deterministic given the input stream). The render layer translates raw DOM
// events into a FrameInput; the sim reads it each tick.

import type { Vec2 } from './components';

export interface FrameInput {
  /** Continuous movement axis from held keys; each component in [-1, 1]. */
  moveAxis: Vec2;
  /** One-shot click-to-move target (tile coords). Consumed by the sim, then cleared. */
  moveToTarget: Vec2 | null;
}

export function createFrameInput(): FrameInput {
  return { moveAxis: { x: 0, y: 0 }, moveToTarget: null };
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
