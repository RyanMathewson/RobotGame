// ECS systems: pure functions that read/write component stores each tick.

import type { Vec2 } from './components';
import type { World } from './world';
import type { FrameInput } from './input';

const EPSILON = 1e-4;

/** Turn this frame's click-to-move into movement targets for player entities. */
export function applyInput(world: World, input: FrameInput): void {
  if (!input.moveToTarget) return;
  for (const e of world.player) {
    const mv = world.movement.get(e);
    if (mv) mv.target = { ...input.moveToTarget };
  }
  input.moveToTarget = null; // one-shot: consumed
}

/** Advance every entity that has a Movement + Transform. */
export function movementSystem(world: World, dt: number, input: FrameInput): void {
  const axisActive = input.moveAxis.x !== 0 || input.moveAxis.y !== 0;

  for (const e of world.movement.keys()) {
    const mv = world.movement.get(e)!;
    const tf = world.transform.get(e);
    if (!tf) continue;

    // Direct (WASD) control of the player robot overrides any click target.
    if (axisActive && world.player.has(e)) {
      mv.target = null;
      const len = Math.hypot(input.moveAxis.x, input.moveAxis.y) || 1;
      tf.pos.x += (input.moveAxis.x / len) * mv.speed * dt;
      tf.pos.y += (input.moveAxis.y / len) * mv.speed * dt;
      clampToWorld(world, tf.pos);
      continue;
    }

    // Otherwise, seek the current target if any.
    if (mv.target) {
      const dx = mv.target.x - tf.pos.x;
      const dy = mv.target.y - tf.pos.y;
      const dist = Math.hypot(dx, dy);
      const step = mv.speed * dt;
      if (dist <= step || dist < EPSILON) {
        tf.pos.x = mv.target.x;
        tf.pos.y = mv.target.y;
        mv.target = null; // arrived
      } else {
        tf.pos.x += (dx / dist) * step;
        tf.pos.y += (dy / dist) * step;
      }
    }
  }
}

function clampToWorld(world: World, pos: Vec2): void {
  pos.x = Math.max(0, Math.min(world.width, pos.x));
  pos.y = Math.max(0, Math.min(world.height, pos.y));
}
