// Pixi (v8) renderer. Reads the ECS world and draws it; owns no game logic.

import { Application, Container, Graphics } from 'pixi.js';
import type { World, Entity } from '../game/sim/world';
import { NODE_START_AMOUNT } from '../game/sim/world';
import type { Vec2 } from '../game/sim/components';
import { cargoUsed } from '../game/sim/components';
import { ITEMS } from '../game/data/resources';
import { refineRecipeFor, assembleRecipeFor } from '../game/data/recipes';

const TILE = 34;

export class WorldRenderer {
  private root = new Container();
  private grid = new Graphics();
  private buildings = new Graphics();
  private nodes = new Graphics();
  private miningFx = new Graphics();
  private targetMarker = new Graphics();
  private robots = new Container();
  private robotGfx = new Map<Entity, Graphics>();
  private vmFx = new Graphics();

  constructor(
    private app: Application,
    world: World,
  ) {
    this.root.addChild(
      this.grid,
      this.buildings,
      this.nodes,
      this.miningFx,
      this.targetMarker,
      this.robots,
      this.vmFx,
    );
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
  draw(world: World, selected: Entity | null = null): void {
    const cw = this.app.renderer.width;
    const ch = this.app.renderer.height;
    this.root.position.set(
      Math.round((cw - world.width * TILE) / 2),
      Math.round((ch - world.height * TILE) / 2),
    );

    this.drawBuildings(world);
    this.drawNodes(world);
    this.drawMiningFx(world);
    this.drawTargets(world);
    this.drawRobots(world);
    this.drawVmStatus(world, selected);
  }

  /** Refinery + Assembler buildings, each with a progress bar while working. */
  private drawBuildings(world: World): void {
    this.buildings.clear();

    for (const e of world.refinery.keys()) {
      const r = world.refinery.get(e)!;
      const tf = world.transform.get(e);
      if (!tf) continue;
      const box = this.machineBox(tf.pos.x, tf.pos.y, r.size, 0x2a3340, 0x55708a);
      // "gear" glyph to read as a refining machine.
      this.buildings.circle(box.cx, box.y + box.h * 0.42, TILE * 0.26).stroke({ color: 0x9fc3e0, width: 3 });
      const recipe = r.activeInput ? refineRecipeFor(r.activeInput) : undefined;
      this.progressBar(box, recipe ? Math.min(1, r.progress / recipe.seconds) : 0, 0xffd27f);
    }

    for (const e of world.assembler.keys()) {
      const a = world.assembler.get(e)!;
      const tf = world.transform.get(e);
      if (!tf) continue;
      const box = this.machineBox(tf.pos.x, tf.pos.y, a.size, 0x2f3a31, 0x6fae8c);
      // Small "robot" glyph (chassis + two eyes) to read as an assembler.
      const gs = TILE * 0.42;
      this.buildings
        .roundRect(box.cx - gs / 2, box.y + box.h * 0.42 - gs / 2, gs, gs, 4)
        .stroke({ color: 0xbfe8d0, width: 3 });
      this.buildings
        .circle(box.cx - gs * 0.18, box.y + box.h * 0.42 - gs * 0.12, 1.8)
        .circle(box.cx + gs * 0.18, box.y + box.h * 0.42 - gs * 0.12, 1.8)
        .fill({ color: 0xbfe8d0 });
      const recipe = a.active ? assembleRecipeFor(a.active) : undefined;
      this.progressBar(box, recipe ? Math.min(1, a.progress / recipe.seconds) : 0, 0x8fe6b0);
    }
  }

  /** Draw a machine's body and return geometry for glyph/bar placement. */
  private machineBox(tileX: number, tileY: number, size: number, fill: number, stroke: number) {
    const x = tileX * TILE;
    const y = tileY * TILE;
    const w = size * TILE;
    const h = size * TILE;
    this.buildings
      .roundRect(x + 2, y + 2, w - 4, h - 4, 6)
      .fill({ color: fill })
      .stroke({ color: stroke, width: 2 });
    return { x, y, w, h, cx: x + w / 2 };
  }

  /** A progress bar along the bottom of a machine box (hidden when frac is 0). */
  private progressBar(box: { x: number; y: number; w: number; h: number }, frac: number, color: number): void {
    const barX = box.x + 6;
    const barY = box.y + box.h - 11;
    const barW = box.w - 12;
    this.buildings.rect(barX, barY, barW, 5).fill({ color: 0x10171f });
    if (frac > 0) this.buildings.rect(barX, barY, barW * frac, 5).fill({ color });
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
        .fill({ color: ITEMS[node.kind].color })
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

      // Blocked (cargo full) reads red; actively mining reads gold.
      const cargo = world.cargo.get(e);
      const blocked = cargo ? cargoUsed(cargo) >= cargo.capacity - 1e-6 : false;
      const color = blocked ? 0xff7f7f : 0xffd27f;

      const nx = (nodeTf.pos.x + 0.5) * TILE;
      const ny = (nodeTf.pos.y + 0.5) * TILE;
      this.miningFx
        .moveTo(robot.pos.x * TILE, robot.pos.y * TILE)
        .lineTo(nx, ny)
        .stroke({ color, width: 2, alpha: 0.7 });
      this.miningFx
        .circle(nx, ny, TILE * 0.42)
        .stroke({ color, width: 2, alpha: blocked ? 0.9 : pulse });
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
    // Prune graphics for robots that no longer exist (e.g. after loading a save).
    for (const [e, g] of this.robotGfx) {
      if (!world.movement.has(e)) {
        g.destroy();
        this.robotGfx.delete(e);
      }
    }
  }

  /** A status pip above each autonomous robot + a ring around the selected one. */
  private drawVmStatus(world: World, selected: Entity | null): void {
    this.vmFx.clear();
    for (const e of world.vm.keys()) {
      const vm = world.vm.get(e)!;
      const tf = world.transform.get(e);
      if (!tf) continue;
      const cx = tf.pos.x * TILE;
      const cy = tf.pos.y * TILE;

      if (e === selected) {
        this.vmFx.circle(cx, cy, TILE * 0.5).stroke({ color: 0xeaf6ff, width: 2, alpha: 0.9 });
      }

      const color =
        vm.status === 'running'
          ? 0x8fe6b0
          : vm.status === 'blocked'
            ? 0xffcf7f
            : vm.status === 'error'
              ? 0xff7f7f
              : 0x9aa6b2;
      this.vmFx.circle(cx, cy - TILE * 0.46, 3.5).fill({ color }).stroke({ color: 0x0a0f15, width: 1 });
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
