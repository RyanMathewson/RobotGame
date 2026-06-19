// React component that hosts the Pixi canvas, captures input, and drives the loop.
// NOTE (scaffold): world + loop + renderer are wired together here for now.
// Phase 2/3 will lift the sim into a Web Worker (design §15.4, docs/TASKS.md).

import { useEffect, useRef } from 'react';
import { Application, type FederatedPointerEvent } from 'pixi.js';
import { createWorld, type World } from '../game/sim/world';
import { createFrameInput, axisFromKeys, isMoveKey, type FrameInput } from '../game/sim/input';
import { robotDebugInfo } from '../game/vm/interpreter';
import { serializeWorld, loadInto } from '../game/sim/save';
import { idbSave, idbLoad, downloadSave, readSaveFile } from '../persist/db';
import { startGameLoop } from '../game/loop';
import { WorldRenderer } from './worldRenderer';
import { useHud } from '../ui/store';

const SAVE_SLOT = 'auto';

export function PixiStage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Input state lives outside the async init so keyboard works immediately.
    const input = createFrameInput();
    const pressed = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isMoveKey(e.code)) return;
      pressed.add(e.code);
      input.moveAxis = axisFromKeys(pressed);
      e.preventDefault(); // stop arrow keys scrolling the page
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isMoveKey(e.code)) return;
      pressed.delete(e.code);
      input.moveAxis = axisFromKeys(pressed);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let disposed = false;
    let app: Application | null = null;
    let renderer: WorldRenderer | null = null;
    let stopLoop: (() => void) | null = null;

    const pending = new Application();
    pending
      .init({ background: 0x0b1118, resizeTo: host, antialias: true })
      .then(() => {
        // Guard against React StrictMode's mount/unmount/mount in dev.
        if (disposed) {
          pending.destroy(true);
          return;
        }
        app = pending;
        host.appendChild(app.canvas);

        const world = createWorld();
        renderer = new WorldRenderer(app, world);

        // After loading a save: discard stale input/selection so nothing applies
        // to entities that no longer exist.
        const afterLoad = () => {
          clearTransientInput(input);
          useHud.getState().set({ selectedRobot: null });
        };

        // Bridge UI → sim (one-way) for build, program-editor, and save commands.
        useHud.getState().set({
          requestBuild: (id: string) => input.buildRequests.push(id),
          getRobotProgram: (entity) => {
            const vm = world.vm.get(entity);
            return vm ? structuredClone(vm.ast) : null;
          },
          applyProgram: (entity, ast) => {
            input.programApplies.push({ entity, ast: structuredClone(ast) });
          },
          saveGame: () => idbSave(SAVE_SLOT, serializeWorld(world)),
          loadGame: async () => {
            const data = await idbLoad(SAVE_SLOT);
            if (!data) return false;
            loadInto(world, data);
            afterLoad();
            return true;
          },
          exportGame: () => downloadSave(serializeWorld(world), `cogworks-${saveStamp()}.json`),
          importGame: async (file) => {
            loadInto(world, await readSaveFile(file));
            afterLoad();
          },
        });

        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
        app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
          const t = renderer!.screenToTile(e.global.x, e.global.y);
          // Clicking a programmable robot selects it for editing...
          const hit = pickRobot(world, t.x, t.y);
          if (hit !== null) {
            useHud.getState().set({ selectedRobot: hit });
            return;
          }
          // ...otherwise it's a move/mine order for the player robot.
          t.x = Math.max(0, Math.min(world.width, t.x));
          t.y = Math.max(0, Math.min(world.height, t.y));
          input.clickTile = t;
        });

        stopLoop = startGameLoop(world, input, {
          onRender: (w) => renderer?.draw(w, useHud.getState().selectedRobot),
          onStats: (s) => {
            const sel = useHud.getState().selectedRobot;
            useHud.getState().set({ ...s, robotDebug: sel !== null ? robotDebugInfo(world, sel) : null });
          },
        }).stop;
      });

    return () => {
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      stopLoop?.();
      renderer?.destroy();
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className="pixi-stage" />;
}

/** Drop one-shot input + queues (used after a load swaps the world's entities). */
function clearTransientInput(input: FrameInput): void {
  input.clickTile = null;
  input.buildRequests.length = 0;
  input.programApplies.length = 0;
}

/** A filename-safe timestamp like 2026-06-19_14-32-05 for exported saves. */
function saveStamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

/** The nearest programmable (VM-running) robot to a tile, within reach, or null. */
function pickRobot(world: World, tx: number, ty: number): number | null {
  let hit: number | null = null;
  let bestD = 0.7; // tiles
  for (const id of world.vm.keys()) {
    const tf = world.transform.get(id);
    if (!tf) continue;
    const d = Math.hypot(tf.pos.x - tx, tf.pos.y - ty);
    if (d < bestD) {
      bestD = d;
      hit = id;
    }
  }
  return hit;
}
