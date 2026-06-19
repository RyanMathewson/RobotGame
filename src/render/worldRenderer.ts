// Pixi (v8) renderer. Reads the world and draws it; owns no game logic.

import { Application, Container, Graphics } from 'pixi.js';
import type { World } from '../game/sim/world';
import { RESOURCES } from '../game/data/resources';

const TILE = 34;

export class WorldRenderer {
  private root = new Container();
  private grid = new Graphics();
  private nodes = new Graphics();
  private robots = new Container();
  private robotGfx = new Map<number, Graphics>();

  constructor(private app: Application, world: World) {
    this.root.addChild(this.grid, this.nodes, this.robots);
    this.app.stage.addChild(this.root);
    this.drawStatic(world);
  }

  /** Grid + resource nodes only change rarely; draw them once up front. */
  private drawStatic(world: World): void {
    const w = world.width * TILE;
    const h = world.height * TILE;

    this.grid.clear();
    this.grid.rect(0, 0, w, h).fill({ color: 0x0e1620 });
    for (let x = 0; x <= world.width; x++) {
      this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h);
    }
    for (let y = 0; y <= world.height; y++) {
      this.grid.moveTo(0, y * TILE).lineTo(w, y * TILE);
    }
    this.grid.stroke({ color: 0x1d2c3a, width: 1 });

    this.nodes.clear();
    for (const node of world.nodes) {
      const cx = (node.pos.x + 0.5) * TILE;
      const cy = (node.pos.y + 0.5) * TILE;
      this.nodes
        .circle(cx, cy, TILE * 0.32)
        .fill({ color: RESOURCES[node.kind].color })
        .stroke({ color: 0x0a0f15, width: 2 });
    }
  }

  /** Per-frame: update robot positions and keep the world centered. */
  draw(world: World): void {
    // Center the world within the current canvas size.
    const cw = this.app.renderer.width;
    const ch = this.app.renderer.height;
    this.root.position.set(
      Math.round((cw - world.width * TILE) / 2),
      Math.round((ch - world.height * TILE) / 2),
    );

    for (const robot of world.robots) {
      let g = this.robotGfx.get(robot.id);
      if (!g) {
        g = new Graphics()
          .roundRect(-TILE * 0.3, -TILE * 0.3, TILE * 0.6, TILE * 0.6, 5)
          .fill({ color: 0x7fd1ff })
          .stroke({ color: 0xeaf6ff, width: 2 });
        this.robots.addChild(g);
        this.robotGfx.set(robot.id, g);
      }
      g.position.set((robot.pos.x + 0.5) * TILE, (robot.pos.y + 0.5) * TILE);
    }
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.robotGfx.clear();
  }
}
