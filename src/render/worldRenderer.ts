// Pixi (v8) renderer. Reads the ECS world and draws it; owns no game logic.

import { Application, Container, Graphics } from 'pixi.js';
import type { World, Entity } from '../game/sim/world';
import { NODE_START_AMOUNT } from '../game/sim/world';
import type { Vec2 } from '../game/sim/components';
import { RESOURCES } from '../game/data/resources';

const TILE = 34;

export class WorldRenderer {
  private root = new Container();
  private grid = new Graphics();
  private nodes = new Graphics();
  private miningFx = new Graphics();
  private targetMarker = new Graphics();
  private robots = new Container();
  private robotGfx = new Map<Entity, Graphics>();

  constructor(
    private app: Application,
    world: World,
  ) {
    this.root.addChild(this.grid, this.nodes, this.miningFx, this.targetMarker, this.robots);
    this.app.stage.addChild(this.root);
    this.drawGrid(world);
  }

  /** Convert a global (canvas) pixel coordinate into continuous tile coords. */
  screenToTile(globalX: number, globalY: number): Vec2 {
    return {
      x: (globalX - this.root.position.x) / TILE,
      y: (globalY - this.root.position.y) / TILE,
    };
  }

  /** The grid never changes; draw it once up front. */
  private drawGrid(world: World): void {
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
  }

  /** Per-frame: center the world and redraw dynamic layers. */
  draw(world: World): void {
    const cw = this.app.renderer.width;
    const ch = this.app.renderer.height;
    this.root.position.set(
      Math.round((cw - world.width * TILE) / 2),
      Math.round((ch - world.height * TILE) / 2),
    );

    this.drawNodes(world);
    this.drawMiningFx(world);
    this.drawTargets(world);
    this.drawRobots(world);
  }

  /** Deposits shrink as they deplete and vanish when removed from the store. */
  private drawNodes(world: World): void {
    this.nodes.clear();
    for (const e of world.resourceNode.keys()) {
      const node = world.resourceNode.get(e)!;
      const tf = world.transform.get(e);
      if (!tf) continue;
      const frac = Math.max(0, Math.min(1, node.amount / NODE_START_AMOUNT));
      const r = TILE * (0.16 + 0.18 * frac);
      const cx = (tf.pos.x + 0.5) * TILE;
      const cy = (tf.pos.y + 0.5) * TILE;
      this.nodes
        .circle(cx, cy, r)
        .fill({ color: RESOURCES[node.kind].color })
        .stroke({ color: 0x0a0f15, width: 2 });
    }
  }

  /** A beam from each mining robot to its node + a pulsing ring on the node. */
  private drawMiningFx(world: World): void {
    this.miningFx.clear();
    const pulse = 0.6 + 0.4 * Math.sin(world.tick * 0.3);
    for (const e of world.mining.keys()) {
      const mining = world.mining.get(e)!;
      const robot = world.transform.get(e);
      const nodeTf = world.transform.get(mining.nodeId);
      if (!robot || !nodeTf) continue;
      const nx = (nodeTf.pos.x + 0.5) * TILE;
      const ny = (nodeTf.pos.y + 0.5) * TILE;
      this.miningFx
        .moveTo(robot.pos.x * TILE, robot.pos.y * TILE)
        .lineTo(nx, ny)
        .stroke({ color: 0xffd27f, width: 2, alpha: 0.7 });
      this.miningFx
        .circle(nx, ny, TILE * 0.42)
        .stroke({ color: 0xffd27f, width: 2, alpha: pulse });
    }
  }

  /** Click-to-move destination marker (player robots only). */
  private drawTargets(world: World): void {
    this.targetMarker.clear();
    for (const e of world.player) {
      const mv = world.movement.get(e);
      if (mv?.target) {
        this.targetMarker
          .circle(mv.target.x * TILE, mv.target.y * TILE, 7)
          .stroke({ color: 0x7fd1ff, width: 2, alpha: 0.8 });
      }
    }
  }

  private drawRobots(world: World): void {
    for (const e of world.movement.keys()) {
      const tf = world.transform.get(e);
      if (!tf) continue;
      let g = this.robotGfx.get(e);
      if (!g) {
        g = this.makeRobot(world.player.has(e));
        this.robots.addChild(g);
        this.robotGfx.set(e, g);
      }
      g.position.set(tf.pos.x * TILE, tf.pos.y * TILE);
    }
  }

  private makeRobot(isPlayer: boolean): Graphics {
    const s = TILE * 0.6;
    const fill = isPlayer ? 0x7fd1ff : 0xffb27f;
    const stroke = isPlayer ? 0xeaf6ff : 0xffe3cf;
    return new Graphics()
      .roundRect(-s / 2, -s / 2, s, s, 5)
      .fill({ color: fill })
      .stroke({ color: stroke, width: 2 });
  }

  destroy(): void {
    this.root.destroy({ children: true });
    this.robotGfx.clear();
  }
}
