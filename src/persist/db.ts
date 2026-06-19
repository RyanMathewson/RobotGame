// Persistence IO (design §15.5): IndexedDB for local saves + file export/import.
// This is the DOM-facing side of saving; the pure (de)serialization lives in
// `game/sim/save.ts`. Local-first, no server — works on static hosting.

import type { SaveData } from '../game/sim/save';

const DB_NAME = 'cogworks';
const STORE = 'saves';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSave(slot: string, data: SaveData): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function idbLoad(slot: string): Promise<SaveData | null> {
  const db = await openDb();
  try {
    return await new Promise<SaveData | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(slot);
      req.onsuccess = () => resolve((req.result as SaveData | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Trigger a browser download of the save as a pretty-printed JSON file. */
export function downloadSave(data: SaveData, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Parse an imported save file. Throws if it isn't valid save JSON. */
export async function readSaveFile(file: File): Promise<SaveData> {
  const data = JSON.parse(await file.text()) as SaveData;
  if (typeof data?.version !== 'number' || typeof data?.world !== 'object') {
    throw new Error('Not a Cogworks save file');
  }
  return data;
}
