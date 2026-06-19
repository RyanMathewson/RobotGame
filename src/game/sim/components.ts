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
  /** units remaining; node despawns at 0 */
  amount: number;
}

/** Carried resources. `items` maps resource kind -> units held. */
export interface Cargo {
  capacity: number;
  items: Partial<Record<ResourceKind, number>>;
}

/** Tag: this entity is currently mining the node with id `nodeId`. */
export interface Mining {
  /** Entity id of the node being mined (Entity is a number alias). */
  nodeId: number;
}

/** Total units currently held in a cargo hold. */
export function cargoUsed(cargo: Cargo): number {
  let sum = 0;
  for (const v of Object.values(cargo.items)) sum += v ?? 0;
  return sum;
}
