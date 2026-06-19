// ECS systems: pure functions that read/write component stores each tick.

import type { Vec2, ItemKind } from './components';
import { cargoUsed, addItem, hasItems, takeItems } from './components';
import type { World, Entity } from './world';
import { spawnRobot } from './world';
import type { FrameInput } from './input';
import {
  REFINE_RECIPES,
  refineRecipeFor,
  assembleRecipeFor,
  type AssembleRecipe,
} from '../data/recipes';
import { MINER_PROGRAM } from '../vm/programs';
import { createVm } from '../vm/interpreter';

const EPSILON = 1e-4;

/** How close (in tiles) a robot must be to a node to mine it. */
export const MINING_RANGE = 1.5;
/** Mining throughput in units/second. */
export const MINE_RATE = 25;

// --- Input -> intent ---------------------------------------------------------
/**
 * Resolve this frame's click into an action for each player robot:
 *  - clicked a node     -> order it to mine that node (walk over; auto-mine in range)
 *  - clicked a refinery -> order it to haul cargo there and unload (auto on arrival)
 *  - clicked ground     -> move there
 * Movement (this, or WASD) always cancels any in-progress order.
 */
export function applyInput(world: World, input: FrameInput): void {
  // Program applies (from the editor): recompile a robot's VM and reset it clean.
  if (input.programApplies.length > 0) {
    for (const { entity, ast } of input.programApplies) {
      if (!world.vm.has(entity)) continue;
      const prev = world.vm.get(entity)!;
      world.vm.set(entity, createVm(ast, prev.cyclesPerTick));
      world.mining.delete(entity); // drop any in-flight action so it starts fresh
      world.depositOrder.delete(entity);
      const mv = world.movement.get(entity);
      if (mv) mv.target = null;
    }
    input.programApplies.length = 0;
  }

  // Build requests (from the HUD) queue onto the first assembler.
  if (input.buildRequests.length > 0) {
    const asm = firstAssembler(world);
    if (asm !== null) {
      const a = world.assembler.get(asm)!;
      for (const id of input.buildRequests) {
        if (assembleRecipeFor(id)) a.queue.push(id);
      }
    }
    input.buildRequests.length = 0; // consumed
  }

  if (!input.clickTile) return;
  const click = input.clickTile;
  const node = nodeAtTile(world, click);
  const refinery = node === null ? refineryAtTile(world, click) : null;

  for (const e of world.player) {
    const mv = world.movement.get(e);
    const tf = world.transform.get(e);
    if (!mv || !tf) continue;

    if (node !== null) {
      world.depositOrder.delete(e);
      world.mining.set(e, { nodeId: node });
      const c = nodeCenter(world, node);
      // Mine in place if already in range; otherwise head there and auto-mine on arrival.
      mv.target = distance(tf.pos, c) <= MINING_RANGE ? null : c;
    } else if (refinery !== null) {
      world.mining.delete(e);
      world.depositOrder.set(e, { refineryId: refinery });
      const c = buildingCenter(world, refinery);
      mv.target = inRange(world, tf.pos, refinery) ? null : c;
    } else {
      world.mining.delete(e);
      world.depositOrder.delete(e);
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

    // Direct (WASD) control of the player robot overrides target & cancels orders.
    if (axisActive && world.player.has(e)) {
      world.mining.delete(e);
      world.depositOrder.delete(e);
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

    const center = nodeCenter(world, nodeId);
    const mv = world.movement.get(e);

    // Still travelling to the node: keep heading there, extract nothing yet.
    if (distance(tf.pos, center) > MINING_RANGE + EPSILON) {
      if (mv && !mv.target) mv.target = center;
      continue;
    }
    // In range: halt and extract.
    if (mv) mv.target = null;

    const free = cargo.capacity - cargoUsed(cargo);
    if (free <= EPSILON) {
      // Cargo full: hold the mining order (robot is "blocked") rather than
      // cancelling it, so it resumes automatically once cargo is freed. The
      // HUD reads this state to remind the player why mining stopped.
      continue;
    }

    const mined = Math.min(MINE_RATE * dt, node.amount, free);
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

// --- Deposit -----------------------------------------------------------------
/** Haul cargo to the ordered refinery and unload it into the refinery's input. */
export function depositSystem(world: World): void {
  for (const e of [...world.depositOrder.keys()]) {
    const order = world.depositOrder.get(e);
    if (!order) continue;
    const refinery = world.refinery.get(order.refineryId);
    const tf = world.transform.get(e);
    if (!refinery || !tf) {
      world.depositOrder.delete(e);
      continue;
    }

    const mv = world.movement.get(e);

    // Still travelling: keep heading to the building.
    if (!inRange(world, tf.pos, order.refineryId)) {
      if (mv && !mv.target) mv.target = buildingCenter(world, order.refineryId);
      continue;
    }

    // In range: stop and unload all cargo into the refinery input buffer.
    if (mv) mv.target = null;
    const cargo = world.cargo.get(e);
    if (cargo) {
      for (const k of Object.keys(cargo.items) as ItemKind[]) {
        const qty = cargo.items[k] ?? 0;
        if (qty > 0) refinery.input[k] = (refinery.input[k] ?? 0) + qty;
      }
      cargo.items = {};
    }
    world.depositOrder.delete(e);
  }
}

// --- Refinery ----------------------------------------------------------------
/** Each refinery processes one batch at a time: consume inputs, then output. */
export function refinerySystem(world: World, dt: number): void {
  for (const e of world.refinery.keys()) {
    const r = world.refinery.get(e)!;

    // Idle: try to start a batch from whatever input is available.
    if (r.activeInput === null) {
      for (const recipe of REFINE_RECIPES) {
        if ((r.input[recipe.input] ?? 0) >= recipe.inputQty) {
          r.input[recipe.input] = (r.input[recipe.input] ?? 0) - recipe.inputQty;
          r.activeInput = recipe.input;
          r.progress = 0;
          break;
        }
      }
    }

    // Processing: advance and emit output when the batch completes.
    if (r.activeInput !== null) {
      const recipe = refineRecipeFor(r.activeInput);
      if (!recipe) {
        r.activeInput = null;
        continue;
      }
      r.progress += dt;
      if (r.progress >= recipe.seconds) {
        addItem(world.stockpile, recipe.output, recipe.outputQty);
        r.activeInput = null;
        r.progress = 0;
      }
    }
  }
}

// --- Assembler ---------------------------------------------------------------
/** Each assembler builds one queued recipe at a time, drawing inputs from the
 *  colony stockpile, then emits its output (a stockpiled item, or a new robot). */
export function assemblerSystem(world: World, dt: number): void {
  for (const e of world.assembler.keys()) {
    const a = world.assembler.get(e)!;

    // Idle: try to start the next queued build once its inputs are affordable.
    if (a.active === null) {
      if (a.queue.length === 0) continue;
      const recipe = assembleRecipeFor(a.queue[0]);
      if (!recipe) {
        a.queue.shift(); // unknown recipe id: drop it
        continue;
      }
      if (!hasItems(world.stockpile, recipe.inputs)) continue; // blocked: short on materials
      takeItems(world.stockpile, recipe.inputs);
      a.active = a.queue.shift()!;
      a.progress = 0;
    }

    // Building: advance and emit output when the build completes.
    const recipe = a.active ? assembleRecipeFor(a.active) : undefined;
    if (recipe) {
      a.progress += dt;
      if (a.progress >= recipe.seconds) {
        emitAssembleOutput(world, e, recipe);
        a.active = null;
        a.progress = 0;
      }
    }
  }
}

/** Produce a finished assemble recipe: stockpile an item, or spawn a robot. */
function emitAssembleOutput(world: World, assembler: Entity, recipe: AssembleRecipe): void {
  const out = recipe.output;
  if (out.kind === 'item') {
    addItem(world.stockpile, out.item, out.qty);
  } else {
    // Built robots ship with the autonomous miner so they run on their own
    // (Milestone 1). The program editor will let players replace it later.
    spawnRobot(world, robotSpawnPos(world, assembler), {
      speed: out.speed,
      cargoCapacity: out.cargo,
      program: MINER_PROGRAM,
    });
  }
}

/** A clear tile just east of the assembler for a freshly-built robot to appear on. */
function robotSpawnPos(world: World, assembler: Entity): Vec2 {
  const tf = world.transform.get(assembler)!;
  const a = world.assembler.get(assembler)!;
  const x = Math.min(world.width - 0.5, tf.pos.x + a.size + 0.5);
  return { x, y: tf.pos.y + a.size / 2 };
}

// --- Helpers -----------------------------------------------------------------
/** The first assembler entity, or null. (One assembler for now.) */
function firstAssembler(world: World): Entity | null {
  for (const e of world.assembler.keys()) return e;
  return null;
}

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

/** The refinery entity whose footprint covers `tile`, or null. */
function refineryAtTile(world: World, tile: Vec2): Entity | null {
  const tx = Math.floor(tile.x);
  const ty = Math.floor(tile.y);
  for (const e of world.refinery.keys()) {
    const r = world.refinery.get(e)!;
    const tf = world.transform.get(e);
    if (!tf) continue;
    if (tx >= tf.pos.x && tx < tf.pos.x + r.size && ty >= tf.pos.y && ty < tf.pos.y + r.size) {
      return e;
    }
  }
  return null;
}

/** Center of a building's footprint, in world coords. */
function buildingCenter(world: World, building: Entity): Vec2 {
  const tf = world.transform.get(building)!;
  const r = world.refinery.get(building)!;
  return { x: tf.pos.x + r.size / 2, y: tf.pos.y + r.size / 2 };
}

/** Whether `pos` is close enough to interact with the building (adjacent counts). */
function inRange(world: World, pos: Vec2, building: Entity): boolean {
  const r = world.refinery.get(building)!;
  const reach = r.size / 2 + 0.8;
  return distance(pos, buildingCenter(world, building)) <= reach + EPSILON;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampToWorld(world: World, pos: Vec2): void {
  pos.x = Math.max(0, Math.min(world.width, pos.x));
  pos.y = Math.max(0, Math.min(world.height, pos.y));
}
