// The ECS world: entity ids + per-component stores + the tick orchestrator.
//
// Design notes (see CLAUDE.md):
//  - This is the simulation. It holds NO rendering/DOM/React concerns.
//  - State is plain & serializable (Maps of entity -> component; convert to
//    arrays when we add save/load). Iteration order is insertion order, which
//    keeps ticking deterministic.
//  - Determinism: any randomness must come from `nextRandom(world)`, never
//    `Math.random()`, so saves/replays/offline-sim reproduce exactly.

import type {
  Vec2,
  Transform,
  Movement,
  ResourceNode,
  RawKind,
  Cargo,
  Mining,
  DepositOrder,
  Refinery,
  Assembler,
  Energy,
  ItemMap,
} from './components';
import type { FrameInput } from './input';
import {
  applyInput,
  movementSystem,
  miningSystem,
  depositSystem,
  refinerySystem,
  assemblerSystem,
} from './systems';
import type { BlockProgram } from '../vm/ast';
import type { Vm } from '../vm/interpreter';
import { createVm, vmSystem, energySystem, ENERGY_MAX } from '../vm/interpreter';

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

  /** colony-wide refined-goods inventory (Refinery fills it, Assembler draws from it) */
  stockpile: ItemMap;

  // Component stores.
  transform: Store<Transform>;
  movement: Store<Movement>;
  resourceNode: Store<ResourceNode>;
  cargo: Store<Cargo>;
  mining: Store<Mining>;
  depositOrder: Store<DepositOrder>;
  refinery: Store<Refinery>;
  assembler: Store<Assembler>;
  vm: Store<Vm>;
  energy: Store<Energy>;
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
  world.cargo.delete(e);
  world.mining.delete(e);
  world.depositOrder.delete(e);
  world.refinery.delete(e);
  world.assembler.delete(e);
  world.vm.delete(e);
  world.energy.delete(e);
  world.player.delete(e);
}

export function spawnRefinery(world: World, pos: Vec2, size = 2): Entity {
  const e = createEntity(world);
  world.transform.set(e, { pos: { ...pos } });
  world.refinery.set(e, { input: {}, activeInput: null, progress: 0, size });
  return e;
}

export function spawnAssembler(world: World, pos: Vec2, size = 2): Entity {
  const e = createEntity(world);
  world.transform.set(e, { pos: { ...pos } });
  world.assembler.set(e, { queue: [], active: null, progress: 0, size });
  return e;
}

export function spawnRobot(
  world: World,
  pos: Vec2,
  opts: {
    player?: boolean;
    speed?: number;
    cargoCapacity?: number;
    /** a program makes the robot autonomous: it gets a VM + a battery */
    program?: BlockProgram;
    cyclesPerTick?: number;
  } = {},
): Entity {
  const e = createEntity(world);
  world.transform.set(e, { pos: { ...pos } });
  world.movement.set(e, { target: null, speed: opts.speed ?? 3.5 });
  if (opts.cargoCapacity) world.cargo.set(e, { capacity: opts.cargoCapacity, items: {} });
  if (opts.program) {
    world.vm.set(e, createVm(opts.program, opts.cyclesPerTick));
    world.energy.set(e, { current: ENERGY_MAX, max: ENERGY_MAX });
  }
  if (opts.player) world.player.add(e);
  return e;
}

export function spawnNode(world: World, pos: Vec2, kind: RawKind, amount: number): Entity {
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
    stockpile: {},
    transform: new Map(),
    movement: new Map(),
    resourceNode: new Map(),
    cargo: new Map(),
    mining: new Map(),
    depositOrder: new Map(),
    refinery: new Map(),
    assembler: new Map(),
    vm: new Map(),
    energy: new Map(),
    player: new Set(),
  };

  // Scenery + first minable deposits.
  const nodeSpecs: Array<[RawKind, number, number]> = [
    ['iron', 5, 4],
    ['iron', 22, 13],
    ['scrap', 9, 12],
    ['scrap', 20, 5],
    ['silica', 25, 9],
  ];
  for (const [kind, x, y] of nodeSpecs) {
    spawnNode(world, { x, y }, kind, NODE_START_AMOUNT);
  }

  // The central Refinery (2x2). Robots haul raw resources here to refine them.
  spawnRefinery(world, { x: 13, y: 8 }, 2);

  // The Assembler (2x2), just east of the refinery. Builds parts/robots from
  // refined materials drawn out of the colony stockpile.
  spawnAssembler(world, { x: 18, y: 8 }, 2);

  // The player's robot, parked near center until commanded.
  spawnRobot(world, { x: 9, y: 9 }, { player: true, cargoCapacity: 300 });

  return world;
}

/** Starting units in a fresh deposit (also the renderer's "full" reference). */
export const NODE_START_AMOUNT = 200;

// --- Tick orchestrator -------------------------------------------------------
/** Advance the world by `dt` seconds, applying this frame's input. */
export function tickWorld(world: World, dt: number, input: FrameInput): void {
  world.tick++;
  applyInput(world, input);
  vmSystem(world, dt); // programmed robots set their action components...
  movementSystem(world, dt, input); // ...then the action systems carry them out
  miningSystem(world, dt);
  depositSystem(world);
  refinerySystem(world, dt);
  assemblerSystem(world, dt);
  energySystem(world, dt);
}
