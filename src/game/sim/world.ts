// The simulation world: plain data + a deterministic tick function.
// Kept free of any rendering concerns (design §15.2). In a later phase this
// module moves into a Web Worker so the sim never blocks the UI thread.

export interface Vec2 {
  x: number;
  y: number;
}

export type ResourceKind = 'iron' | 'scrap' | 'silica';

export interface ResourceNode {
  id: number;
  pos: Vec2;
  kind: ResourceKind;
  amount: number;
}

export interface Robot {
  id: number;
  pos: Vec2;
  target: Vec2;
  /** tiles per second */
  speed: number;
}

export interface World {
  /** width/height in tiles */
  width: number;
  height: number;
  /** sim ticks elapsed */
  tick: number;
  robots: Robot[];
  nodes: ResourceNode[];
  /** deterministic PRNG state (so saves/replays reproduce exactly) */
  rngState: number;
}

// --- Deterministic PRNG (mulberry32) ----------------------------------------
function nextRandom(world: World): number {
  world.rngState = (world.rngState + 0x6d2b79f5) | 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomTile(world: World): Vec2 {
  return {
    x: Math.floor(nextRandom(world) * world.width),
    y: Math.floor(nextRandom(world) * world.height),
  };
}

// --- World construction ------------------------------------------------------
export function createWorld(): World {
  const world: World = {
    width: 28,
    height: 18,
    tick: 0,
    robots: [],
    nodes: [],
    rngState: 0x1a2b3c4d,
  };

  // A handful of resource nodes to make the map read as a place.
  const nodeSpecs: Array<[ResourceKind, number, number]> = [
    ['iron', 5, 4],
    ['iron', 22, 13],
    ['scrap', 9, 12],
    ['scrap', 20, 5],
    ['silica', 14, 9],
  ];
  nodeSpecs.forEach(([kind, x, y], i) => {
    world.nodes.push({ id: i, pos: { x, y }, kind, amount: 500 });
  });

  // One robot at center with an initial wander target (placeholder behavior
  // until the robot VM drives it — Phase 2).
  world.robots.push({
    id: 0,
    pos: { x: world.width / 2, y: world.height / 2 },
    target: randomTile(world),
    speed: 3.5,
  });

  return world;
}

// --- Tick --------------------------------------------------------------------
/** Advance the world by `dt` seconds. Deterministic given world state. */
export function tickWorld(world: World, dt: number): void {
  world.tick++;

  for (const robot of world.robots) {
    const dx = robot.target.x - robot.pos.x;
    const dy = robot.target.y - robot.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = robot.speed * dt;

    if (dist <= step || dist === 0) {
      // Arrived: snap and pick a new wander target.
      robot.pos.x = robot.target.x;
      robot.pos.y = robot.target.y;
      robot.target = randomTile(world);
    } else {
      robot.pos.x += (dx / dist) * step;
      robot.pos.y += (dy / dist) * step;
    }
  }
}
