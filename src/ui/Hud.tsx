// HUD overlay. Reads live sim stats from the store to prove the
// sim → render → UI wiring end-to-end.

import { useHud } from './store';

export function Hud() {
  const tick = useHud((s) => s.tick);
  const fps = useHud((s) => s.fps);
  const robotCount = useHud((s) => s.robotCount);

  return (
    <div className="hud">
      <div className="hud-title">
        Cogworks <span className="hud-tag">scaffold</span>
      </div>
      <dl className="hud-stats">
        <div>
          <dt>Sim tick</dt>
          <dd>{tick.toLocaleString()}</dd>
        </div>
        <div>
          <dt>FPS</dt>
          <dd>{fps}</dd>
        </div>
        <div>
          <dt>Robots</dt>
          <dd>{robotCount}</dd>
        </div>
      </dl>
      <p className="hud-note">
        Fixed-timestep sim → Pixi render → React HUD. Next: the robot VM &amp; block editor.
      </p>
    </div>
  );
}
