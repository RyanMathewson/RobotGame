// The robot VM: a per-robot, ticked, deterministic interpreter (design §9.6, §15.2).
//
// Execution model
//  - Each programmed robot has a program counter (`pc`) into its bytecode and a
//    per-tick *cycle budget* (its Logic Core clock). Cheap ops run several per
//    tick; the budget caps a spinning program.
//  - Action ops (mine/navigate/deposit/wait) are *blocking*: on dispatch they set
//    the same ECS components the player's input sets, then the VM yields and polls
//    for completion on later ticks. This reuses movement/mining/deposit systems
//    (and their renderer FX) instead of duplicating logic.
//  - Energy is debited per executed instruction; at zero the program is `blocked`
//    until it recharges. Given the same world + program, execution is identical
//    (no Math.random, fixed iteration order) — Pillar 2 / offline-sim tractable.

import type { World, Entity } from '../sim/world';
import type { Vec2, RawKind, ItemMap } from '../sim/components';
import { cargoUsed } from '../sim/components';
import { compileProgram, type Instr } from './compiler';
import type { BlockProgram, TargetExpr, Cond } from './ast';
import { pathKey } from './source';
import { INSTRUCTION_TABLE, type Opcode } from './instructions';

export type VmStatus = 'running' | 'blocked' | 'done' | 'error';

/** Per-robot VM runtime state + its program (source AST + compiled bytecode). */
export interface Vm {
  /** the authored program — kept for the editor and save/load (design §15.5) */
  ast: BlockProgram;
  code: Instr[];
  pc: number;
  status: VmStatus;
  /** true while a blocking action at code[pc] is still in progress */
  waiting: boolean;
  /** seconds remaining for a WAIT in progress */
  waitRemaining: number;
  /** Logic Core clock: instructions dispatched per tick */
  cyclesPerTick: number;
  error: string | null;
  /** last dispatched op, for the debugger/trace and HUD */
  lastOp: Opcode | null;
}

/** A serializable snapshot of a robot's execution, for the editor's debugger. */
export interface RobotDebug {
  status: VmStatus;
  pc: number;
  codeLen: number;
  currentOp: Opcode | null;
  /** path key of the block at the program counter, or null (e.g. at HALT) */
  currentBlockKey: string | null;
  energyPct: number | null;
  cargoUsed: number;
  cargoCapacity: number;
  /** carried items by kind, for the inventory readout */
  cargo: ItemMap;
}

/** Default battery + a placeholder passive recharge. Real charging (pads/grid)
 *  is a separate Energy task; this keeps autonomous robots from stranding. */
export const ENERGY_MAX = 100;
export const ENERGY_REGEN_PER_SEC = 6;
const DEFAULT_CYCLES_PER_TICK = 8;
const EPSILON = 1e-4;

export function createVm(ast: BlockProgram, cyclesPerTick = DEFAULT_CYCLES_PER_TICK): Vm {
  return {
    ast,
    code: compileProgram(ast),
    pc: 0,
    status: 'running',
    waiting: false,
    waitRemaining: 0,
    cyclesPerTick,
    error: null,
    lastOp: null,
  };
}

/** A snapshot of the robot's execution for the editor (live block highlight + trace). */
export function robotDebugInfo(world: World, e: Entity): RobotDebug | null {
  const vm = world.vm.get(e);
  if (!vm) return null;
  const instr = vm.pc >= 0 && vm.pc < vm.code.length ? vm.code[vm.pc] : undefined;
  const energy = world.energy.get(e);
  const cargo = world.cargo.get(e);
  return {
    status: vm.status,
    pc: vm.pc,
    codeLen: vm.code.length,
    currentOp: instr ? instr.op : null,
    currentBlockKey: instr ? pathKey(instr.src) : null,
    energyPct: energy ? Math.round((energy.current / energy.max) * 100) : null,
    cargoUsed: cargo ? cargoUsed(cargo) : 0,
    cargoCapacity: cargo ? cargo.capacity : 0,
    cargo: cargo ? { ...cargo.items } : {},
  };
}

// --- The system --------------------------------------------------------------
/** Advance every robot program by up to its cycle budget this tick. */
export function vmSystem(world: World, dt: number): void {
  for (const e of world.vm.keys()) {
    const vm = world.vm.get(e)!;
    if (vm.status === 'done' || vm.status === 'error') continue;
    stepRobot(world, e, vm, dt);
  }
}

/** Passive energy recharge (placeholder until charging pads/grid exist). */
export function energySystem(world: World, dt: number): void {
  for (const energy of world.energy.values()) {
    if (energy.current < energy.max) {
      energy.current = Math.min(energy.max, energy.current + ENERGY_REGEN_PER_SEC * dt);
    }
  }
}

type DispatchResult = 'advance' | 'jumped' | 'block' | 'halt';

function stepRobot(world: World, e: Entity, vm: Vm, dt: number): void {
  let budget = vm.cyclesPerTick;
  vm.status = 'running';

  while (budget > 0) {
    if (vm.pc < 0 || vm.pc >= vm.code.length) {
      vm.status = 'done';
      return;
    }
    const instr = vm.code[vm.pc];

    // A blocking action is mid-flight: poll for completion (free — no budget/energy).
    if (vm.waiting) {
      if (!pollAction(world, e, vm, instr, dt)) {
        vm.status = 'running'; // still working
        return;
      }
      vm.waiting = false;
      vm.pc++;
      continue;
    }

    // Energy gate: an empty battery blocks until it recharges.
    const energy = world.energy.get(e);
    if (energy && energy.current <= EPSILON) {
      vm.status = 'blocked';
      return;
    }

    const meta = INSTRUCTION_TABLE[instr.op];
    const result = dispatch(world, e, vm, instr);
    if (energy) energy.current = Math.max(0, energy.current - meta.energyCost);
    vm.lastOp = instr.op;
    budget -= meta.cycleCost;

    if (result === 'advance') vm.pc++;
    else if (result === 'jumped') continue; // pc already updated by dispatch
    else if (result === 'block') {
      vm.waiting = true; // a blocking action is now in flight; poll it next tick
      return;
    } else if (result === 'halt') {
      vm.status = 'done';
      return;
    }
  }
}

/** Execute one instruction. Action ops set ECS components and return 'block'. */
function dispatch(world: World, e: Entity, vm: Vm, instr: Instr): DispatchResult {
  switch (instr.op) {
    case 'NAVIGATE_TO': {
      const pos = resolveTarget(world, e, instr.target).pos;
      if (!pos) return 'advance'; // nothing to navigate to
      const mv = world.movement.get(e);
      if (mv) mv.target = { x: pos.x, y: pos.y };
      world.mining.delete(e);
      world.depositOrder.delete(e);
      return 'block';
    }
    case 'MINE': {
      const id = resolveTarget(world, e, instr.target).id;
      if (id === null) return 'advance'; // nothing to mine
      world.depositOrder.delete(e);
      world.mining.set(e, { nodeId: id });
      return 'block';
    }
    case 'DEPOSIT': {
      const id = resolveTarget(world, e, instr.target).id;
      if (id === null) return 'advance'; // nowhere to deposit
      world.mining.delete(e);
      world.depositOrder.set(e, { refineryId: id });
      return 'block';
    }
    case 'WAIT': {
      vm.waitRemaining = instr.seconds;
      return 'block';
    }
    case 'JUMP':
      vm.pc = instr.addr;
      return 'jumped';
    case 'JUMP_IF_FALSE':
      if (!evalCond(world, e, instr.cond)) {
        vm.pc = instr.addr;
        return 'jumped';
      }
      return 'advance';
    case 'HALT':
      return 'halt';
  }
}

/** Has the blocking action at code[pc] finished? */
function pollAction(world: World, e: Entity, vm: Vm, instr: Instr, dt: number): boolean {
  switch (instr.op) {
    case 'NAVIGATE_TO':
      // movementSystem clears the target on arrival.
      return !world.movement.get(e)?.target;
    case 'MINE': {
      // Done when cargo is full or the node is gone (miningSystem drops the
      // mining tag when the deposit is exhausted).
      const cargo = world.cargo.get(e);
      const full = cargo ? cargoUsed(cargo) >= cargo.capacity - EPSILON : true;
      return full || !world.mining.has(e);
    }
    case 'DEPOSIT':
      // depositSystem clears the order once cargo is unloaded.
      return !world.depositOrder.has(e);
    case 'WAIT':
      vm.waitRemaining -= dt;
      return vm.waitRemaining <= 0;
    default:
      return true;
  }
}

// --- Expression evaluation (sensing) -----------------------------------------
/** Resolve a target to an entity id and/or world position. Charges sensing energy. */
function resolveTarget(world: World, e: Entity, t: TargetExpr): { id: Entity | null; pos: Vec2 | null } {
  charge(world, e, 'NEAREST_OF');
  const from = world.transform.get(e)?.pos ?? { x: 0, y: 0 };
  if (t.kind === 'nearestNode') {
    const id = nearestNode(world, from, t.of);
    return { id, pos: id !== null ? nodeCenter(world, id) : null };
  }
  const id = nearestRefinery(world, from);
  return { id, pos: id !== null ? refineryCenter(world, id) : null };
}

function evalCond(world: World, e: Entity, c: Cond): boolean {
  switch (c.kind) {
    case 'exists':
      return resolveTarget(world, e, c.target).id !== null;
    case 'cargoFull': {
      const cargo = world.cargo.get(e);
      return cargo ? cargoUsed(cargo) >= cargo.capacity - EPSILON : false;
    }
    case 'not':
      return !evalCond(world, e, c.of);
  }
}

/** Debit an op's energy cost (used for sensing during expression evaluation). */
function charge(world: World, e: Entity, op: Opcode): void {
  const energy = world.energy.get(e);
  if (energy) energy.current = Math.max(0, energy.current - INSTRUCTION_TABLE[op].energyCost);
}

// --- World queries (deterministic: fixed iteration order, id tie-break) -------
function nearestNode(world: World, from: Vec2, of?: RawKind): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const [id, node] of world.resourceNode) {
    if (of !== undefined && node.kind !== of) continue;
    const tf = world.transform.get(id);
    if (!tf) continue;
    const d = dist2(from, { x: tf.pos.x + 0.5, y: tf.pos.y + 0.5 });
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function nearestRefinery(world: World, from: Vec2): Entity | null {
  let best: Entity | null = null;
  let bestD = Infinity;
  for (const id of world.refinery.keys()) {
    const c = refineryCenter(world, id);
    const d = dist2(from, c);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

function nodeCenter(world: World, id: Entity): Vec2 {
  const pos = world.transform.get(id)!.pos;
  return { x: pos.x + 0.5, y: pos.y + 0.5 };
}

function refineryCenter(world: World, id: Entity): Vec2 {
  const tf = world.transform.get(id)!;
  const r = world.refinery.get(id)!;
  return { x: tf.pos.x + r.size / 2, y: tf.pos.y + r.size / 2 };
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
