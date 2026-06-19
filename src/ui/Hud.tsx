// HUD overlay. Reads live sim stats from the store to prove the
// sim → render → UI wiring end-to-end.

import { useHud } from './store';

export function Hud() {
  const tick = useHud((s) => s.tick);
  const fps = useHud((s) => s.fps);
  const robotCount = useHud((s) => s.robotCount);
  const playerPos = useHud((s) => s.playerPos);
  const cargoUsed = useHud((s) => s.cargoUsed);
  const cargoCapacity = useHud((s) => s.cargoCapacity);
  const mining = useHud((s) => s.mining);
  const notice = useHud((s) => s.notice);

  const posLabel = playerPos ? `${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}` : '—';
  const status = notice ? '⛔ blocked' : mining ? '⛏ mining' : robotCount > 0 ? 'idle' : '—';

  return (
    <>
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
            <dt>Cargo</dt>
            <dd>
              {cargoUsed}
              <span className="hud-dim"> / {cargoCapacity}</span>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>Robot pos</dt>
            <dd>{posLabel}</dd>
          </div>
        </dl>
        <p className="hud-note">
          <strong>Click a node</strong> to send the robot to mine it (until you move) ·{' '}
          <strong>click ground / WASD</strong> to move.
        </p>
      </div>

      {notice && (
        <div className="toast" role="status">
          <span className="toast-icon">⚠️</span>
          {notice}
        </div>
      )}
    </>
  );
}
