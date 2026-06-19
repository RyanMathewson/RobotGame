// Determinism check (design §9.6, Pillar 2). Runs the same scenario twice and
// compares a full state summary — same world + program must produce identical
// results, which is what makes save/replay and offline simulation tractable.
// Invoked once at startup in dev (see main.tsx); cheap and silent unless it fails.

import { createWorld, spawnRobot, tickWorld, type World } from '../sim/world';
import { cargoUsed } from '../sim/components';
import { createFrameInput } from '../sim/input';
import { MINER_PROGRAM } from './programs';

const DT = 1 / 30;
const TICKS = 400;

/** Build the test colony: the default world + one autonomous miner. */
function scenario(): World {
  const world = createWorld();
  spawnRobot(world, { x: 8, y: 6 }, { cargoCapacity: 25, program: MINER_PROGRAM });
  return world;
}

/** A stable string fingerprint of the parts of the world the VM affects. */
function summarize(world: World): string {
  const parts: string[] = [`tick=${world.tick}`];

  const stock = Object.entries(world.stockpile)
    .filter(([, q]) => (q ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, q]) => `${k}:${(q ?? 0).toFixed(3)}`);
  parts.push(`stock{${stock.join(',')}}`);

  for (const [e, vm] of world.vm) {
    const tf = world.transform.get(e);
    const energy = world.energy.get(e);
    const cargo = world.cargo.get(e);
    parts.push(
      `r${e}[pc=${vm.pc},st=${vm.status},` +
        `pos=${tf ? `${tf.pos.x.toFixed(3)},${tf.pos.y.toFixed(3)}` : '?'},` +
        `e=${energy ? energy.current.toFixed(3) : '?'},` +
        `cargo=${cargo ? cargoUsed(cargo).toFixed(3) : '?'}]`,
    );
  }
  return parts.join(' ');
}

function run(): string {
  const world = scenario();
  const input = createFrameInput();
  for (let i = 0; i < TICKS; i++) tickWorld(world, DT, input);
  return summarize(world);
}

/** Returns whether two independent runs matched, plus a detail string. */
export function checkVmDeterminism(): { ok: boolean; detail: string } {
  const a = run();
  const b = run();
  return a === b ? { ok: true, detail: a } : { ok: false, detail: `A: ${a}\nB: ${b}` };
}
