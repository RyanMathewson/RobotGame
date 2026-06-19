// React component that hosts the Pixi canvas, captures input, and drives the loop.
// NOTE (scaffold): world + loop + renderer are wired together here for now.
// Phase 2/3 will lift the sim into a Web Worker (design §15.4, docs/TASKS.md).

import { useEffect, useRef } from 'react';
import { Application, type FederatedPointerEvent } from 'pixi.js';
import { createWorld } from '../game/sim/world';
import { createFrameInput, axisFromKeys, isMoveKey } from '../game/sim/input';
import { startGameLoop } from '../game/loop';
import { WorldRenderer } from './worldRenderer';
import { useHud } from '../ui/store';

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

        // Click-to-move: translate a canvas click into a tile target.
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
        app.stage.on('pointerdown', (e: FederatedPointerEvent) => {
          const t = renderer!.screenToTile(e.global.x, e.global.y);
          t.x = Math.max(0, Math.min(world.width, t.x));
          t.y = Math.max(0, Math.min(world.height, t.y));
          input.clickTile = t; // sim decides: mine nearby node, or move
        });

        stopLoop = startGameLoop(world, input, {
          onRender: (w) => renderer?.draw(w),
          onStats: (s) => useHud.getState().set(s),
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
