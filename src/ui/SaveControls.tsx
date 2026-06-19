// Save / Load / Export / Import controls (design §15.5). Local-first: Save/Load
// use IndexedDB; Export/Import move a save to/from a JSON file. The heavy lifting
// is in the store bridges (registered by PixiStage); this is just the toolbar.

import { useRef, useState } from 'react';
import { useHud } from './store';

export function SaveControls() {
  const saveGame = useHud((s) => s.saveGame);
  const loadGame = useHud((s) => s.loadGame);
  const exportGame = useHud((s) => s.exportGame);
  const importGame = useHud((s) => s.importGame);

  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setStatus(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(''), 2500);
  };

  const onSave = async () => {
    try {
      await saveGame();
      flash('Saved ✓');
    } catch {
      flash('Save failed');
    }
  };

  const onLoad = async () => {
    try {
      flash((await loadGame()) ? 'Loaded ✓' : 'No save found');
    } catch {
      flash('Load failed');
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    try {
      await importGame(file);
      flash('Imported ✓');
    } catch {
      flash('Import failed');
    }
  };

  return (
    <div className="save">
      <button onClick={onSave}>Save</button>
      <button onClick={onLoad}>Load</button>
      <button onClick={exportGame}>Export</button>
      <button onClick={() => fileRef.current?.click()}>Import</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
      {status && <span className="save-status">{status}</span>}
    </div>
  );
}
