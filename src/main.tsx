import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/index.css';

// Dev-only: assert the simulation/VM is deterministic (Pillar 2).
if (import.meta.env.DEV) {
  import('./game/vm/determinism').then(({ checkVmDeterminism }) => {
    const { ok, detail } = checkVmDeterminism();
    if (ok) console.info('%cVM determinism check: PASS', 'color:#8fe6b0');
    else console.error('VM determinism check: FAIL\n' + detail);
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
