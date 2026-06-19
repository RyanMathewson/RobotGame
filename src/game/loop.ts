// Fixed-timestep game loop. The simulation advances in fixed steps (decoupled
// from render framerate) so behavior is deterministic and frame-rate independent
// (design §15.2). Rendering happens once per animation frame after stepping.

import type { World, Entity } from './sim/world';
import { tickWorld } from './sim/world';
import type { Vec2, ItemMap } from './sim/components';
import { cargoUsed } from './sim/components';
import type { FrameInput } from './sim/input';
import { assembleRecipeFor } from './data/recipes';
import type { VmStatus } from './vm/interpreter';

/** Simulation rate: 30 deterministic ticks per second. */
const TICKS_PER_SECOND = 30;
const STEP_MS = 1000 / TICKS_PER_SECOND;
/** Clamp accumulated time to avoid a "spiral of death" after a stall/tab-switch. */
const MAX_FRAME_MS = 250;

export interface LoopHandle {
  stop: () => void;
}

export interface LoopCallbacks {
  /** Called once per animation frame with the latest world and interpolation alpha. */
  onRender: (world: World, alpha: number) => void;
  /** Called at a throttled cadence (~4Hz) for cheap UI/HUD updates. */
  onStats?: (stats: LoopStats) => void;
}

export interface LoopStats {
  tick: number;
  fps: number;
  robotCount: number;
  playerPos: Vec2 | null;
  cargoUsed: number;
  cargoCapacity: number;
  mining: boolean;
  /** A transient reminder for the player (e.g. why mining stopped), or null. */
  notice: string | null;
  /** Colony stockpile of refined goods (what the assembler draws from). */
  stockpile: ItemMap;
  /** Total raw units queued in the refinery's input buffer. */
  refineryQueue: number;
  /** Whether the refinery is currently processing a batch. */
  refineryBusy: boolean;
  /** Label of the recipe the assembler is currently building, or null if idle. */
  assemblerLabel: string | null;
  /** Progress of the current assembler build, 0..1. */
  assemblerProgress: number;
  /** Number of builds queued (excluding the one in progress) at the assembler. */
  assemblerQueue: number;
  /** Summary of program-running robots (the autonomous fleet). */
  fleet: FleetStats;
}

export interface FleetStats {
  /** robots running a program */
  count: number;
  running: number;
  blocked: number;
  /** the lead programmed robot's status + battery, for an at-a-glance readout */
  leadStatus: VmStatus | null;
  leadEnergyPct: number | null;
}

export function startGameLoop(world: World, input: FrameInput, cb: LoopCallbacks): LoopHandle {
  let raf = 0;
  let last = performance.now();
  let acc = 0;

  // FPS tracking (smoothed) + throttled stats emission.
  let fps = 0;
  let lastStatsAt = last;

  const frame = (now: number) => {
    const delta = now - last;
    last = now;

    acc += Math.min(delta, MAX_FRAME_MS);
    while (acc >= STEP_MS) {
      tickWorld(world, STEP_MS / 1000, input);
      acc -= STEP_MS;
    }

    // Exponential moving average of instantaneous FPS.
    if (delta > 0) fps += (1000 / delta - fps) * 0.1;

    cb.onRender(world, acc / STEP_MS);

    if (cb.onStats && now - lastStatsAt >= 250) {
      lastStatsAt = now;
      const pe = firstPlayer(world);
      const cargo = pe !== null ? world.cargo.get(pe) : undefined;
      const used = cargo ? cargoUsed(cargo) : 0;
      const mining = pe !== null ? world.mining.has(pe) : false;
      const cargoFull = cargo ? used >= cargo.capacity - 1e-6 : false;

      // First refinery's summary (single refinery for now).
      let refineryQueue = 0;
      let refineryBusy = false;
      for (const re of world.refinery.keys()) {
        const r = world.refinery.get(re)!;
        for (const v of Object.values(r.input)) refineryQueue += v ?? 0;
        refineryBusy = r.activeInput !== null;
        break;
      }

      // First assembler's summary (single assembler for now).
      let assemblerLabel: string | null = null;
      let assemblerProgress = 0;
      let assemblerQueue = 0;
      for (const ae of world.assembler.keys()) {
        const a = world.assembler.get(ae)!;
        assemblerQueue = a.queue.length;
        const recipe = a.active ? assembleRecipeFor(a.active) : undefined;
        if (recipe) {
          assemblerLabel = recipe.label;
          assemblerProgress = Math.min(1, a.progress / recipe.seconds);
        }
        break;
      }

      // Autonomous fleet summary (robots running a VM program).
      let fleetCount = 0;
      let fleetRunning = 0;
      let fleetBlocked = 0;
      let leadStatus: VmStatus | null = null;
      let leadEnergyPct: number | null = null;
      for (const ve of world.vm.keys()) {
        const vm = world.vm.get(ve)!;
        fleetCount++;
        if (vm.status === 'running') fleetRunning++;
        else if (vm.status === 'blocked') fleetBlocked++;
        if (leadStatus === null) {
          leadStatus = vm.status;
          const en = world.energy.get(ve);
          leadEnergyPct = en ? Math.round((en.current / en.max) * 100) : null;
        }
      }

      cb.onStats({
        tick: world.tick,
        fps: Math.round(fps),
        robotCount: world.movement.size,
        playerPos: pe !== null ? (world.transform.get(pe)?.pos ?? null) : null,
        cargoUsed: Math.floor(used),
        cargoCapacity: cargo ? cargo.capacity : 0,
        mining,
        notice: mining && cargoFull ? 'Cargo full — drop it at the Refinery to continue mining.' : null,
        stockpile: { ...world.stockpile },
        refineryQueue: Math.floor(refineryQueue),
        refineryBusy,
        assemblerLabel,
        assemblerProgress,
        assemblerQueue,
        fleet: {
          count: fleetCount,
          running: fleetRunning,
          blocked: fleetBlocked,
          leadStatus,
          leadEnergyPct,
        },
      });
    }

    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(raf) };
}

function firstPlayer(world: World): Entity | null {
  for (const e of world.player) return e;
  return null;
}
