// HUD overlay. Reads live sim stats from the store to prove the
// sim → render → UI wiring end-to-end.

import { useHud } from './store';
import { ITEMS } from '../game/data/resources';
import { ASSEMBLE_RECIPES } from '../game/data/recipes';
import { hasItems } from '../game/sim/components';
import type { ItemKind, ItemMap } from '../game/sim/components';

/** "5 Iron Ingot · 2 Carbon" for a recipe's input map. */
function itemList(items: ItemMap): string {
  return (Object.entries(items) as Array<[ItemKind, number]>)
    .filter(([, qty]) => (qty ?? 0) >= 1)
    .map(([kind, qty]) => `${ITEMS[kind].label} ${Math.floor(qty)}`)
    .join(' · ');
}

export function Hud() {
  const fps = useHud((s) => s.fps);
  const robotCount = useHud((s) => s.robotCount);
  const cargoUsed = useHud((s) => s.cargoUsed);
  const cargoCapacity = useHud((s) => s.cargoCapacity);
  const mining = useHud((s) => s.mining);
  const notice = useHud((s) => s.notice);
  const stockpile = useHud((s) => s.stockpile);
  const refineryQueue = useHud((s) => s.refineryQueue);
  const refineryBusy = useHud((s) => s.refineryBusy);
  const assemblerLabel = useHud((s) => s.assemblerLabel);
  const assemblerProgress = useHud((s) => s.assemblerProgress);
  const assemblerQueue = useHud((s) => s.assemblerQueue);
  const fleet = useHud((s) => s.fleet);
  const tutorialHint = useHud((s) => s.tutorialHint);
  const requestBuild = useHud((s) => s.requestBuild);

  const status = notice ? '⛔ blocked' : mining ? '⛏ mining' : robotCount > 0 ? 'idle' : '—';

  const stockLabel = itemList(stockpile) || 'empty';

  return (
    <>
      <div className="hud">
        <div className="hud-title">
          Cogworks <span className="hud-tag">scaffold</span>
        </div>
        <dl className="hud-stats">
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
            <dt>Robots</dt>
            <dd>{robotCount}</dd>
          </div>
        </dl>

        <div className="hud-section">
          <div className="hud-section-head">
            Refinery <span className="hud-dim">{refineryBusy ? '⚙ processing' : 'idle'}</span>
            {refineryQueue > 0 && <span className="hud-dim"> · queue {refineryQueue}</span>}
          </div>
          <div className="hud-section-body">
            <span className="hud-dim">Stockpile:</span> {stockLabel}
          </div>
        </div>

        <div className="hud-section">
          <div className="hud-section-head">
            Assembler{' '}
            <span className="hud-dim">
              {assemblerLabel ? `🔧 ${assemblerLabel} ${Math.round(assemblerProgress * 100)}%` : 'idle'}
            </span>
            {assemblerQueue > 0 && <span className="hud-dim"> · queue {assemblerQueue}</span>}
          </div>
          <div className="hud-build">
            {ASSEMBLE_RECIPES.map((r) => {
              const affordable = hasItems(stockpile, r.inputs);
              return (
                <button
                  key={r.id}
                  className={`hud-build-btn${tutorialHint === 'build' && affordable ? ' hud-build-btn--hint' : ''}`}
                  disabled={!affordable}
                  title={itemList(r.inputs)}
                  onClick={() => requestBuild(r.id)}
                >
                  Build {r.label}
                  <span className="hud-build-cost">{itemList(r.inputs)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {fleet.count > 0 && (
          <div className="hud-section">
            <div className="hud-section-head">
              Fleet <span className="hud-dim">{fleet.count} autonomous</span>
            </div>
            <div className="hud-section-body">
              {fleet.running} running · {fleet.blocked} blocked
              {fleet.leadEnergyPct !== null && (
                <span className="hud-dim"> · lead ⚡ {fleet.leadEnergyPct}%</span>
              )}
            </div>
          </div>
        )}

        <p className="hud-note">
          <strong>Click a node</strong> to mine · <strong>the Refinery</strong> to unload · <strong>WASD</strong>{' '}
          to drive · <strong>Build</strong> a robot, then <strong>click it</strong> to program it.
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
