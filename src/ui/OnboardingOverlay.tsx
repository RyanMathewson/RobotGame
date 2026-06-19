// Onboarding (design §12.3, §17.1): FORGE walks a new player through the core loop
// — mine → refine → build → program — as short interactive prompts that advance
// when it detects the player did the thing. It's pure UI: it reads the same store
// snapshots the HUD does (no sim coupling), and remembers completion in localStorage.

import { useEffect, useState } from 'react';
import { useHud } from './store';

const DONE_KEY = 'cogworks.onboarded';

interface Progress {
  cargoUsed: number;
  hasRefined: boolean;
  fleetCount: number;
  selectedRobot: number | null;
}

interface Step {
  title: string;
  body: string;
  /** which control to highlight while on this step, or null */
  hint: string | null;
  /** completion is monotonic: later signals also satisfy earlier steps */
  done: (p: Progress) => boolean;
}

const STEPS: Step[] = [
  {
    title: 'Mine some ore',
    body: 'Click a glowing ore node. Your unit walks over and mines until its cargo fills. (WASD drives it directly.)',
    hint: null,
    done: (p) => p.cargoUsed > 0 || p.hasRefined || p.fleetCount > 0,
  },
  {
    title: 'Refine it',
    body: 'Click the Refinery to unload your cargo. It smelts ore into ingots — watch the Stockpile fill up.',
    hint: null,
    done: (p) => p.hasRefined || p.fleetCount > 0,
  },
  {
    title: 'Build a robot',
    body: 'Mine iron and scrap until you can afford a Worker Mk1 (5 iron ingot + 2 carbon), then press Build.',
    hint: 'build',
    done: (p) => p.fleetCount > 0,
  },
  {
    title: 'Inspect its program',
    body: "Your new unit is already mining on its own — that's automation. Click it to open its program.",
    hint: 'robot',
    done: (p) => p.selectedRobot !== null,
  },
];

export function OnboardingOverlay() {
  const cargoUsed = useHud((s) => s.cargoUsed);
  const stockpile = useHud((s) => s.stockpile);
  const fleet = useHud((s) => s.fleet);
  const selectedRobot = useHud((s) => s.selectedRobot);
  const setStore = useHud((s) => s.set);

  const [active, setActive] = useState(() => localStorage.getItem(DONE_KEY) !== '1');
  const [step, setStep] = useState(0);

  const hasRefined = Object.values(stockpile).some((q) => (q ?? 0) >= 1);

  // Advance when the current step's condition is satisfied.
  useEffect(() => {
    if (!active || step >= STEPS.length) return;
    if (STEPS[step].done({ cargoUsed, hasRefined, fleetCount: fleet.count, selectedRobot })) {
      setStep((s) => s + 1);
    }
  }, [active, step, cargoUsed, hasRefined, fleet.count, selectedRobot]);

  // Mirror the current highlight target into the store for the HUD to read.
  useEffect(() => {
    const hint = active && step < STEPS.length ? STEPS[step].hint : null;
    setStore({ tutorialHint: hint });
  }, [active, step, setStore]);

  const finish = () => {
    localStorage.setItem(DONE_KEY, '1');
    setStore({ tutorialHint: null });
    setActive(false);
  };
  const replay = () => {
    setStep(0);
    setActive(true);
  };

  if (!active) {
    return (
      <button className="ob-replay" onClick={replay} title="Replay the tutorial">
        ❔ Tutorial
      </button>
    );
  }

  const complete = step >= STEPS.length;

  return (
    <div className={`ob${complete ? ' ob-complete' : ''}`} role="status">
      <div className="ob-who">
        <span className="ob-avatar">◉</span> FORGE
      </div>
      {complete ? (
        <>
          <div className="ob-title">You built your first autonomous robot.</div>
          <p className="ob-body">
            That program is yours to command — edit its blocks and hit <strong>Run</strong> to change its
            behavior anytime. Welcome to the colony, operator.
          </p>
          <div className="ob-foot">
            <span className="ob-dim">Milestone 1 complete</span>
            <button className="ob-next" onClick={finish}>
              Got it
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ob-title">{STEPS[step].title}</div>
          <p className="ob-body">{STEPS[step].body}</p>
          <div className="ob-foot">
            <span className="ob-dim">
              Step {step + 1} of {STEPS.length}
            </span>
            <button className="ob-skip" onClick={finish}>
              Skip tutorial
            </button>
          </div>
        </>
      )}
    </div>
  );
}
