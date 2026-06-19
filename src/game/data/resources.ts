// Data-driven content (design §15.3): presentation metadata for every item kind.

import type { ItemKind } from '../sim/components';

export interface ItemDef {
  label: string;
  /** Render color (0xRRGGBB). Chosen to stay colorblind-distinct (design §14). */
  color: number;
}

export const ITEMS: Record<ItemKind, ItemDef> = {
  // Raw
  iron: { label: 'Iron Ore', color: 0x9aa6b2 },
  scrap: { label: 'Scrap', color: 0xc7913f },
  silica: { label: 'Silica', color: 0x6fb3c9 },
  // Refined
  iron_ingot: { label: 'Iron Ingot', color: 0xd9e2ec },
  carbon: { label: 'Carbon', color: 0x5a5a66 },
  glass: { label: 'Glass', color: 0xafe9ff },
};
