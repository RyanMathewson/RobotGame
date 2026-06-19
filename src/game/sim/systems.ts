// ECS systems: pure functions that read/write component stores each tick.

import type { Vec2 } from './components';
import { cargoUsed } from './components';
import type { World, Entity } from './world';
import type { FrameInput } from './input';

const EPSILON = 1e-4;

/** How close (in tiles) a robot must be to a node to mine it. */
export const MINING_RANGE = 1.5;
/** Mining throughput in units/second. */
export const MINE_RATE = 25;

// --- Input -> intent ---------------------------------------------------------
/**
 * Resolve this frame's click into an action for each player robot:
 *  - clicked a node within MINING_RANGE -> start mining it
 *  - clicked a node out of range        -> walk toward it
 *  - clicked empty ground               -> move there
 * Movement always cancels any in-progress mining.
 */
export function applyInput(world: World, input: FrameInput): void {
  if (!input.clickTile) return;
  const click = input.clickTile;
  const node = nodeAtTile(world, click);

  for (const e of world.player) {
    const mv = world.movement.get(e);
    const tf = world.transform.get(e);
    if (!mv || !tf) continue;

    if (node !== null) {
      const c = nodeCenter(world, node);
      if (distance(tf.pos, c) <= MINING_RANGE) {
        world.mining.set(e, { nodeId: node });
        mv.target = null; // mine in place
      } else {
        world.mining.delete(e);
        mv.target = c; // approach the node
      }
    } else {
      world.mining.delete(e);
      mv.target = { x: click.x, y: click.y };
    }
  }

  input.clickTile = null; // one-shot: consumed
}

// --- Movement ----------------------------------------------------------------
/** Advance every entity that has a Movement + Transform. */
export function movementSystem(world: World, dt: number, input: FrameInput): void {
  const axisActive = input.moveAxis.x !== 0 || input.moveAxis.y !== 0;

  for (const e of world.movement.keys()) {
    const mv = world.movement.get(e)!;
    const tf = world.transform.get(e);
    if (!tf) continue;

    // Direct (WASD) control of the player robot overrides target & cancels mining.
    if (axisActive && world.player.has(e)) {
      world.mining.delete(e);
      mv.target = null;
      const len = Math.hypot(input.moveAxis.x, input.moveAxis.y) || 1;
      tf.pos.x += (input.moveAxis.x / len) * mv.speed * dt;
      tf.pos.y += (input.moveAxis.y / len) * mv.speed * dt;
      clampToWorld(world, tf.pos);
      continue;
    }

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

// --- Mining ------------------------------------------------------------------
/** Transfer resource from mined nodes into cargo; deplete & despawn empty nodes. */
export function miningSystem(world: World, dt: number): void {
  // Snapshot keys: we may delete from the store while iterating.
  for (const e of [...world.mining.keys()]) {
    const mining = world.mining.get(e);
    if (!mining) continue; // already cleared this tick (e.g. shared node depleted)
    const nodeId = mining.nodeId;
    const node = world.resourceNode.get(nodeId);
    const tf = world.transform.get(e);
    const cargo = world.cargo.get(e);

    if (!node || !tf || !cargo) {
      world.mining.delete(e);
      continue;
    }

    // Must remain in range (a moving robot already had mining cancelled).
    if (distance(tf.pos, nodeCenter(world, nodeId)) > MINING_RANGE + EPSILON) {
      world.mining.delete(e);
      continue;
    }

    const free = cargo.capacity - cargoUsed(cargo);
    const mined = Math.min(MINE_RATE * dt, node.amount, free);
    if (mined <= 0) {
      world.mining.delete(e); // cargo full or node empty
      continue;
    }

    cargo.items[node.kind] = (cargo.items[node.kind] ?? 0) + mined;
    node.amount -= mined;

    if (node.amount <= EPSILON) {
      // Node depleted: remove it and stop anyone mining it.
      world.resourceNode.delete(nodeId);
      world.transform.delete(nodeId);
      for (const [other, m] of world.mining) {
        if (m.nodeId === nodeId) world.mining.delete(other);
      }
    }
  }
}

// --- Helpers -----------------------------------------------------------------
/** The node entity occupying the tile under `tile`, or null. */
function nodeAtTile(world: World, tile: Vec2): Entity | null {
  const tx = Math.floor(tile.x);
  const ty = Math.floor(tile.y);
  for (const e of world.resourceNode.keys()) {
    const tf = world.transform.get(e);
    if (tf && tf.pos.x === tx && tf.pos.y === ty) return e;
  }
  return null;
}

/** Center of a node's tile, in world coords (nodes occupy integer tiles). */
function nodeCenter(world: World, node: Entity): Vec2 {
  const pos = world.transform.get(node)!.pos;
  return { x: pos.x + 0.5, y: pos.y + 0.5 };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampToWorld(world: World, pos: Vec2): void {
  pos.x = Math.max(0, Math.min(world.width, pos.x));
  pos.y = Math.max(0, Math.min(world.height, pos.y));
}
