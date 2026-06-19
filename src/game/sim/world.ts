// The ECS world: entity ids + per-component stores + the tick orchestrator.
//
// Design notes (see CLAUDE.md):
//  - This is the simulation. It holds NO rendering/DOM/React concerns.
//  - State is plain & serializable (Maps of entity -> component; convert to
//    arrays when we add save/load). Iteration order is insertion order, which
//    keeps ticking deterministic.
//  - Determinism: any randomness must come from `nextRandom(world)`, never
//    `Math.random()`, so saves/replays/offline-sim reproduce exactly.

import type { Vec2, Transform, Movement, ResourceNode, ResourceKind } from './components';
import type { FrameInput } from './input';
import { applyInput, movementSystem } from './systems';

export type Entity = number;

/** A component store: entity id -> component data. */
export type Store<T> = Map<Entity, T>;

export interface World {
  tick: number;
  /** map size in tiles */
  width: number;
  height: number;
  /** deterministic PRNG state (mulberry32) */
  rngState: number;
  /** next entity id to hand out */
  nextEntity: Entity;

  // Component stores.
  transform: Store<Transform>;
  movement: Store<Movement>;
  resourceNode: Store<ResourceNode>;
  /** tag set: entities under direct player control */
  player: Set<Entity>;
}

// --- Entity management -------------------------------------------------------
export function createEntity(world: World): Entity {
  return world.nextEntity++;
}

export function destroyEntity(world: World, e: Entity): void {
  world.transform.delete(e);
  world.movement.delete(e);
  world.resourceNode.delete(e);
  world.player.delete(e);
}

export function spawnRobot(
  world: World,
  pos: Vec2,
  opts: { player?: boolean; speed?: number } = {},
): Entity {
  const e = createEntity(world);
  world.transform.set(e, { pos: { ...pos } });
  world.movement.set(e, { target: null, speed: opts.speed ?? 3.5 });
  if (opts.player) world.player.add(e);
  return e;
}

export function spawnNode(world: World, pos: Vec2, kind: ResourceKind, amount: number): Entity {
  const e = createEntity(world);
  world.transform.set(e, { pos: { ...pos } });
  world.resourceNode.set(e, { kind, amount });
  return e;
}

// --- Deterministic PRNG (mulberry32) ----------------------------------------
export function nextRandom(world: World): number {
  world.rngState = (world.rngState + 0x6d2b79f5) | 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// --- World construction ------------------------------------------------------
export function createWorld(): World {
  const world: World = {
    tick: 0,
    width: 28,
    height: 18,
    rngState: 0x1a2b3c4d,
    nextEntity: 1,
    transform: new Map(),
    movement: new Map(),
    resourceNode: new Map(),
    player: new Set(),
  };

  // Scenery: a few deposits so the map reads as a place (mining lands next task).
  const nodeSpecs: Array<[ResourceKind, number, number]> = [
    ['iron', 5, 4],
    ['iron', 22, 13],
    ['scrap', 9, 12],
    ['scrap', 20, 5],
    ['silica', 14, 9],
  ];
  for (const [kind, x, y] of nodeSpecs) {
    spawnNode(world, { x, y }, kind, 500);
  }

  // The player's robot, parked at center until commanded.
  spawnRobot(world, { x: world.width / 2, y: world.height / 2 }, { player: true });

  return world;
}

// --- Tick orchestrator -------------------------------------------------------
/** Advance the world by `dt` seconds, applying this frame's input. */
export function tickWorld(world: World, dt: number, input: FrameInput): void {
  world.tick++;
  applyInput(world, input);
  movementSystem(world, dt, input);
}
