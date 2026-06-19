// ECS component data types. Components are plain, serializable data — no methods,
// no behavior. Systems (see systems.ts) operate over these stores each tick.

export interface Vec2 {
  x: number;
  y: number;
}

export type ResourceKind = 'iron' | 'scrap' | 'silica';

/** World-space position, in tile units (1 unit = 1 tile). */
export interface Transform {
  pos: Vec2;
}

/** Makes an entity move. `target` null = idle. Speed is tiles/second. */
export interface Movement {
  target: Vec2 | null;
  speed: number;
}

/** A minable deposit. */
export interface ResourceNode {
  kind: ResourceKind;
  amount: number;
}
