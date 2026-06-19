// Data-driven content lives here (design §15.3). For the scaffold this is just
// resource presentation metadata; recipes/modules/tech nodes join it in Phase 2.

import type { ResourceKind } from '../sim/components';

export interface ResourceDef {
  kind: ResourceKind;
  label: string;
  /** Render color (0xRRGGBB). Chosen to stay colorblind-distinct (design §14). */
  color: number;
}

export const RESOURCES: Record<ResourceKind, ResourceDef> = {
  iron: { kind: 'iron', label: 'Iron Ore', color: 0x9aa6b2 },
  scrap: { kind: 'scrap', label: 'Scrap', color: 0xc7913f },
  silica: { kind: 'silica', label: 'Silica', color: 0x6fb3c9 },
};
