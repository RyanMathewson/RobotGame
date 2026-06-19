// The robot Program Editor (design §9, §12.1). A custom, structured block editor:
// the selected robot's program is shown as a nested block tree you edit in place
// (add from a palette, reorder, delete, tweak params), then Run to compile it onto
// the robot's VM. The block currently at the program counter is highlighted live.

import { useEffect, useState } from 'react';
import { useHud } from './store';
import type { BlockProgram, Stmt, TargetExpr, Cond } from '../game/vm/ast';
import type { RawKind, ItemKind, ItemMap } from '../game/sim/components';
import { ITEMS } from '../game/data/resources';
import type { Step } from '../game/vm/source';
import { pathKey } from '../game/vm/source';
import { insertStmt, removeStmt, moveStmt, replaceStmt, newStmt, type StmtKind } from './programEdit';

const LABELS: Record<StmtKind, string> = {
  mine: '⛏ Mine',
  deposit: '📦 Deposit',
  navigateTo: '→ Go to',
  wait: '⏱ Wait',
  if: '❓ If',
  loop: '🔁 Loop',
};

const NODE_TARGETS: Array<[string, string]> = [
  ['node:any', 'nearest node'],
  ['node:iron', 'nearest iron'],
  ['node:scrap', 'nearest scrap'],
  ['node:silica', 'nearest silica'],
];
const NAV_TARGETS: Array<[string, string]> = [...NODE_TARGETS, ['refinery', 'the refinery']];

const COND_BASES: Array<[string, string]> = [
  ['node-exists:any', 'a node exists'],
  ['node-exists:iron', 'iron exists'],
  ['node-exists:scrap', 'scrap exists'],
  ['node-exists:silica', 'silica exists'],
  ['cargo-full', 'cargo is full'],
];

const ADDABLE: StmtKind[] = ['mine', 'deposit', 'navigateTo', 'wait', 'if', 'loop'];

// --- target / condition <-> select-value encoding ----------------------------
function targetToValue(t: TargetExpr): string {
  if (t.kind === 'nearestRefinery') return 'refinery';
  return t.of ? `node:${t.of}` : 'node:any';
}
function valueToTarget(v: string): TargetExpr {
  if (v === 'refinery') return { kind: 'nearestRefinery' };
  if (v === 'node:any') return { kind: 'nearestNode' };
  return { kind: 'nearestNode', of: v.split(':')[1] as RawKind };
}
function condToUi(c: Cond): { base: string; negated: boolean } {
  let negated = false;
  let inner = c;
  while (inner.kind === 'not') {
    negated = !negated;
    inner = inner.of;
  }
  if (inner.kind === 'exists') {
    const of = inner.target.kind === 'nearestNode' ? (inner.target.of ?? 'any') : 'any';
    return { base: `node-exists:${of}`, negated };
  }
  return { base: 'cargo-full', negated };
}
function uiToCond(base: string, negated: boolean): Cond {
  let inner: Cond;
  if (base === 'cargo-full') inner = { kind: 'cargoFull' };
  else {
    const of = base.split(':')[1];
    inner = { kind: 'exists', target: of === 'any' ? { kind: 'nearestNode' } : { kind: 'nearestNode', of: of as RawKind } };
  }
  return negated ? { kind: 'not', of: inner } : inner;
}

/** "iron 60 · scrap 25" for a robot's carried items (empty string if none). */
function cargoContents(items: ItemMap): string {
  return (Object.entries(items) as Array<[ItemKind, number]>)
    .filter(([, q]) => (q ?? 0) >= 1)
    .map(([k, q]) => `${ITEMS[k].label} ${Math.floor(q)}`)
    .join(' · ');
}

interface EditCtx {
  apply: (fn: (p: BlockProgram) => BlockProgram) => void;
  /** path key of the block at the program counter to highlight, or null */
  currentKey: string | null;
}

// --- block tree --------------------------------------------------------------
function BlockList({ list, parent, ctx }: { list: Stmt[]; parent: Step[]; ctx: EditCtx }) {
  return (
    <div className="pe-list">
      {list.map((s, i) => (
        <BlockRow key={i} stmt={s} parent={parent} index={i} count={list.length} ctx={ctx} />
      ))}
      <AddBlock parent={parent} index={list.length} ctx={ctx} />
    </div>
  );
}

function AddBlock({ parent, index, ctx }: { parent: Step[]; index: number; ctx: EditCtx }) {
  return (
    <select
      className="pe-add"
      value=""
      onChange={(e) => {
        const k = e.target.value as StmtKind;
        if (k) ctx.apply((p) => insertStmt(p, parent, index, newStmt(k)));
        e.target.value = '';
      }}
    >
      <option value="">+ add block…</option>
      {ADDABLE.map((k) => (
        <option key={k} value={k}>
          {LABELS[k]}
        </option>
      ))}
    </select>
  );
}

function BlockRow({
  stmt,
  parent,
  index,
  count,
  ctx,
}: {
  stmt: Stmt;
  parent: Step[];
  index: number;
  count: number;
  ctx: EditCtx;
}) {
  const highlighted = ctx.currentKey === pathKey({ parent, index });
  const replace = (s: Stmt) => ctx.apply((p) => replaceStmt(p, parent, index, s));

  return (
    <div className={`pe-block pe-${stmt.op}${highlighted ? ' pe-active' : ''}`}>
      <div className="pe-row">
        <span className="pe-op">{LABELS[stmt.op]}</span>
        <Params stmt={stmt} replace={replace} />
        <span className="pe-ctrls">
          <button onClick={() => ctx.apply((p) => moveStmt(p, parent, index, -1))} disabled={index === 0} title="Move up">
            ↑
          </button>
          <button
            onClick={() => ctx.apply((p) => moveStmt(p, parent, index, 1))}
            disabled={index === count - 1}
            title="Move down"
          >
            ↓
          </button>
          <button onClick={() => ctx.apply((p) => removeStmt(p, parent, index))} title="Delete">
            ×
          </button>
        </span>
      </div>

      {stmt.op === 'loop' && (
        <BlockList list={stmt.body} parent={[...parent, { i: index, into: 'body' }]} ctx={ctx} />
      )}
      {stmt.op === 'if' && (
        <>
          <div className="pe-branch">then</div>
          <BlockList list={stmt.then} parent={[...parent, { i: index, into: 'then' }]} ctx={ctx} />
          <div className="pe-branch">else</div>
          <BlockList list={stmt.otherwise ?? []} parent={[...parent, { i: index, into: 'otherwise' }]} ctx={ctx} />
        </>
      )}
    </div>
  );
}

function Params({ stmt, replace }: { stmt: Stmt; replace: (s: Stmt) => void }) {
  switch (stmt.op) {
    case 'mine':
      return (
        <TargetSelect value={targetToValue(stmt.target)} options={NODE_TARGETS} onChange={(t) => replace({ op: 'mine', target: t })} />
      );
    case 'navigateTo':
      return (
        <TargetSelect value={targetToValue(stmt.target)} options={NAV_TARGETS} onChange={(t) => replace({ op: 'navigateTo', target: t })} />
      );
    case 'deposit':
      return <span className="pe-static">at the refinery</span>;
    case 'wait':
      return (
        <span className="pe-param">
          <input
            type="number"
            min={0}
            step={0.5}
            value={stmt.seconds}
            onChange={(e) => replace({ op: 'wait', seconds: Math.max(0, Number(e.target.value) || 0) })}
          />
          s
        </span>
      );
    case 'if': {
      const ui = condToUi(stmt.cond);
      return (
        <span className="pe-param">
          <select
            value={ui.base}
            onChange={(e) => replace({ op: 'if', cond: uiToCond(e.target.value, ui.negated), then: stmt.then, otherwise: stmt.otherwise })}
          >
            {COND_BASES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <label className="pe-not">
            <input
              type="checkbox"
              checked={ui.negated}
              onChange={(e) => replace({ op: 'if', cond: uiToCond(ui.base, e.target.checked), then: stmt.then, otherwise: stmt.otherwise })}
            />
            not
          </label>
        </span>
      );
    }
    case 'loop':
      return null;
  }
}

function TargetSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (t: TargetExpr) => void;
}) {
  return (
    <select className="pe-param" value={value} onChange={(e) => onChange(valueToTarget(e.target.value))}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

// --- panel -------------------------------------------------------------------
export function ProgramEditor() {
  const selected = useHud((s) => s.selectedRobot);
  const getRobotProgram = useHud((s) => s.getRobotProgram);
  const applyProgram = useHud((s) => s.applyProgram);
  const debug = useHud((s) => s.robotDebug);
  const setStore = useHud((s) => s.set);

  const [working, setWorking] = useState<BlockProgram | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load the selected robot's program once, keyed only on which robot is selected
  // (read the bridge lazily so re-registration can't clobber in-progress edits).
  useEffect(() => {
    if (selected === null) {
      setWorking(null);
      setDirty(false);
      return;
    }
    setWorking(useHud.getState().getRobotProgram(selected) ?? []);
    setDirty(false);
  }, [selected]);

  if (selected === null || working === null) return null;

  const ctx: EditCtx = {
    apply: (fn) => {
      setWorking((p) => (p ? fn(p) : p));
      setDirty(true);
    },
    // Once edited, the running program differs from the canvas — don't highlight.
    currentKey: dirty ? null : (debug?.currentBlockKey ?? null),
  };

  const run = () => {
    applyProgram(selected, working);
    setDirty(false);
  };
  const revert = () => {
    setWorking(getRobotProgram(selected) ?? []);
    setDirty(false);
  };

  return (
    <div className="pe">
      <div className="pe-header">
        <span className="pe-title">Program · Robot {selected}</span>
        <button className="pe-x" onClick={() => setStore({ selectedRobot: null })} title="Close">
          ×
        </button>
      </div>

      <div className="pe-debug">
        {debug ? (
          <>
            <span className={`pe-status pe-status-${debug.status}`}>{debug.status}</span>
            <span className="pe-dim">
              op {debug.currentOp ?? '—'} · pc {debug.pc}/{debug.codeLen}
            </span>
            {debug.energyPct !== null && <span className="pe-dim">⚡ {debug.energyPct}%</span>}
            <span className="pe-dim">
              📦 {Math.floor(debug.cargoUsed)}/{debug.cargoCapacity}
            </span>
            {cargoContents(debug.cargo) && <span className="pe-dim">{cargoContents(debug.cargo)}</span>}
          </>
        ) : (
          <span className="pe-dim">robot unavailable</span>
        )}
      </div>

      <div className="pe-canvas">
        <BlockList list={working} parent={[]} ctx={ctx} />
      </div>

      <div className="pe-actions">
        <button className="pe-run" onClick={run} disabled={!dirty}>
          {dirty ? 'Run ▷' : 'Running'}
        </button>
        <button onClick={revert} disabled={!dirty}>
          Revert
        </button>
        <span className="pe-hint">{dirty ? 'edited — Run to apply' : 'live'}</span>
      </div>
    </div>
  );
}
