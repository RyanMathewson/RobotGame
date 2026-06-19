// React component that hosts the Pixi canvas and drives the game loop.
// NOTE (scaffold): world + loop + renderer are wired together here for now.
// Phase 2/3 will lift the sim into a Web Worker (design §15.4, docs/TASKS.md).

import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { createWorld } from '../game/sim/world';
import { startGameLoop } from '../game/loop';
import { WorldRenderer } from './worldRenderer';
import { useHud } from '../ui/store';

export function PixiStage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

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
        stopLoop = startGameLoop(world, {
          onRender: (w) => renderer?.draw(w),
          onStats: (stats) => useHud.getState().set(stats),
        }).stop;
      });

    return () => {
      disposed = true;
      stopLoop?.();
      renderer?.destroy();
      app?.destroy(true, { children: true });
    };
  }, []);

  return <div ref={hostRef} className="pixi-stage" />;
}
