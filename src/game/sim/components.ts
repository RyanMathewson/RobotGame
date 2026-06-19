// ECS component data types. Components are plain, serializable data — no methods,
// no behavior. Systems (see systems.ts) operate over these stores each tick.

export interface Vec2 {
  x: number;
  y: number;
}

/** Raw, minable resources. */
export type RawKind = 'iron' | 'scrap' | 'silica';
/** Refined materials produced by the Refinery. */
export type RefinedKind = 'iron_ingot' | 'carbon' | 'glass';
/** Anything that can sit in a cargo hold or building buffer. */
export type ItemKind = RawKind | RefinedKind;

/** A count of items keyed by kind. */
export type ItemMap = Partial<Record<ItemKind, number>>;

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
  kind: RawKind;
  /** units remaining; node despawns at 0 */
  amount: number;
}

/** Carried items. `items` maps item kind -> units held. */
export interface Cargo {
  capacity: number;
  items: ItemMap;
}

/** Tag: this entity is currently mining the node with id `nodeId`. */
export interface Mining {
  /** Entity id of the node being mined (Entity is a number alias). */
  nodeId: number;
}

/** A robot's battery. The VM (and later movement/mining) debit it per action. */
export interface Energy {
  current: number;
  max: number;
}

/** Order: haul cargo to and unload it into refinery `refineryId`. */
export interface DepositOrder {
  refineryId: number;
}

/** A building that converts raw inputs into refined outputs over time. Refined
 *  output is emitted into the colony stockpile (see `World.stockpile`), not held
 *  locally — there is one shared refined inventory for now. */
export interface Refinery {
  /** raw items waiting to be processed */
  input: ItemMap;
  /** input kind of the batch currently processing, or null if idle */
  activeInput: ItemKind | null;
  /** seconds elapsed on the current batch */
  progress: number;
  /** footprint in tiles (size x size) */
  size: number;
}

/** A building that assembles refined materials (drawn from the colony stockpile)
 *  into parts or whole robots. Recipe-driven; see `data/recipes.ts`. */
export interface Assembler {
  /** recipe ids the player has requested, built FIFO */
  queue: string[];
  /** recipe id currently building (its inputs already consumed), or null if idle */
  active: string | null;
  /** seconds elapsed on the current build */
  progress: number;
  /** footprint in tiles (size x size) */
  size: number;
}

/** Total units currently held in a cargo hold. */
export function cargoUsed(cargo: Cargo): number {
  let sum = 0;
  for (const v of Object.values(cargo.items)) sum += v ?? 0;
  return sum;
}

// --- ItemMap helpers (pure data ops over an inventory) -----------------------
/** Add `qty` of `kind` to an inventory in place. */
export function addItem(pool: ItemMap, kind: ItemKind, qty: number): void {
  pool[kind] = (pool[kind] ?? 0) + qty;
}

/** Whether `pool` holds at least every quantity listed in `need`. */
export function hasItems(pool: ItemMap, need: ItemMap): boolean {
  for (const k of Object.keys(need) as ItemKind[]) {
    if ((pool[k] ?? 0) < (need[k] ?? 0)) return false;
  }
  return true;
}

/** Subtract `need` from `pool` in place (caller must ensure `hasItems` first). */
export function takeItems(pool: ItemMap, need: ItemMap): void {
  for (const k of Object.keys(need) as ItemKind[]) {
    pool[k] = (pool[k] ?? 0) - (need[k] ?? 0);
  }
}
