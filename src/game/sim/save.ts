// Save serialization (design §15.5). The World is plain data, but its component
// stores are Maps/Sets — not JSON-native — so here we convert to/from arrays. The
// result is a versioned, JSON-safe snapshot (world + robot programs as block ASTs
// + timestamp) that the persistence layer writes to IndexedDB or a file.
//
// This module is DOM-free (it's part of the sim): IndexedDB/file IO lives in
// `src/persist/`. Determinism guarantee: deserialize→tick reproduces serialize→tick.

import type {
  Transform,
  Movement,
  ResourceNode,
  Cargo,
  Mining,
  DepositOrder,
  Refinery,
  Assembler,
  Energy,
  ItemMap,
} from './components';
import type { World, Entity } from './world';
import type { Vm, VmStatus } from '../vm/interpreter';
import { createVm } from '../vm/interpreter';
import type { BlockProgram } from '../vm/ast';
import type { Opcode } from '../vm/instructions';

export const SAVE_VERSION = 1;

/** A robot's VM minus its compiled `code` (recompiled from `ast` on load). */
interface VmSnapshot {
  ast: BlockProgram;
  pc: number;
  status: VmStatus;
  waiting: boolean;
  waitRemaining: number;
  cyclesPerTick: number;
  error: string | null;
  lastOp: Opcode | null;
}

interface WorldSnapshot {
  tick: number;
  width: number;
  height: number;
  rngState: number;
  nextEntity: number;
  stockpile: ItemMap;
  transform: Array<[Entity, Transform]>;
  movement: Array<[Entity, Movement]>;
  resourceNode: Array<[Entity, ResourceNode]>;
  cargo: Array<[Entity, Cargo]>;
  mining: Array<[Entity, Mining]>;
  depositOrder: Array<[Entity, DepositOrder]>;
  refinery: Array<[Entity, Refinery]>;
  assembler: Array<[Entity, Assembler]>;
  vm: Array<[Entity, VmSnapshot]>;
  energy: Array<[Entity, Energy]>;
  player: Entity[];
}

export interface SaveData {
  version: number;
  savedAt: number;
  world: WorldSnapshot;
}

const entries = <T>(m: Map<Entity, T>): Array<[Entity, T]> => [...m];

function serializeVm(vm: Vm): VmSnapshot {
  return {
    ast: vm.ast,
    pc: vm.pc,
    status: vm.status,
    waiting: vm.waiting,
    waitRemaining: vm.waitRemaining,
    cyclesPerTick: vm.cyclesPerTick,
    error: vm.error,
    lastOp: vm.lastOp,
  };
}

function deserializeVm(s: VmSnapshot): Vm {
  const vm = createVm(s.ast, s.cyclesPerTick); // recompiles `code` deterministically
  vm.pc = s.pc;
  vm.status = s.status;
  vm.waiting = s.waiting;
  vm.waitRemaining = s.waitRemaining;
  vm.error = s.error;
  vm.lastOp = s.lastOp;
  return vm;
}

/** Snapshot the world into a JSON-safe, versioned save. */
export function serializeWorld(world: World): SaveData {
  const snapshot: WorldSnapshot = {
    tick: world.tick,
    width: world.width,
    height: world.height,
    rngState: world.rngState,
    nextEntity: world.nextEntity,
    stockpile: world.stockpile,
    transform: entries(world.transform),
    movement: entries(world.movement),
    resourceNode: entries(world.resourceNode),
    cargo: entries(world.cargo),
    mining: entries(world.mining),
    depositOrder: entries(world.depositOrder),
    refinery: entries(world.refinery),
    assembler: entries(world.assembler),
    vm: entries(world.vm).map(([e, vm]): [Entity, VmSnapshot] => [e, serializeVm(vm)]),
    energy: entries(world.energy),
    player: [...world.player],
  };
  // Deep clone so the returned save is decoupled from live sim state.
  return structuredClone({ version: SAVE_VERSION, savedAt: Date.now(), world: snapshot });
}

const fillMap = <T>(m: Map<Entity, T>, list: Array<[Entity, T]>): void => {
  m.clear();
  for (const [e, v] of list) m.set(e, v);
};

/** Restore a save into an existing world in place (keeps the world's identity, so
 *  the running loop/renderer keep their reference). Throws on an unsupported version. */
export function loadInto(world: World, save: SaveData): void {
  if (save.version !== SAVE_VERSION) {
    throw new Error(`Unsupported save version ${save.version} (expected ${SAVE_VERSION})`);
  }
  const s = structuredClone(save.world); // detach from the passed-in object

  world.tick = s.tick;
  world.width = s.width;
  world.height = s.height;
  world.rngState = s.rngState;
  world.nextEntity = s.nextEntity;
  world.stockpile = s.stockpile;

  fillMap(world.transform, s.transform);
  fillMap(world.movement, s.movement);
  fillMap(world.resourceNode, s.resourceNode);
  fillMap(world.cargo, s.cargo);
  fillMap(world.mining, s.mining);
  fillMap(world.depositOrder, s.depositOrder);
  fillMap(world.refinery, s.refinery);
  fillMap(world.assembler, s.assembler);
  fillMap(world.energy, s.energy);

  world.vm.clear();
  for (const [e, vmS] of s.vm) world.vm.set(e, deserializeVm(vmS));

  world.player.clear();
  for (const e of s.player) world.player.add(e);
}
