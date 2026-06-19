// Fixed-timestep game loop. The simulation advances in fixed steps (decoupled
// from render framerate) so behavior is deterministic and frame-rate independent
// (design §15.2). Rendering happens once per animation frame after stepping.

import type { World, Entity } from './sim/world';
import { tickWorld } from './sim/world';
import type { Vec2 } from './sim/components';
import { cargoUsed } from './sim/components';
import type { FrameInput } from './sim/input';

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
      cb.onStats({
        tick: world.tick,
        fps: Math.round(fps),
        robotCount: world.movement.size,
        playerPos: pe !== null ? (world.transform.get(pe)?.pos ?? null) : null,
        cargoUsed: cargo ? Math.floor(cargoUsed(cargo)) : 0,
        cargoCapacity: cargo ? cargo.capacity : 0,
        mining: pe !== null ? world.mining.has(pe) : false,
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
