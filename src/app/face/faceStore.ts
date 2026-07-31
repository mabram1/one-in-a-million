/**
 * Persistence for the processed "My Face" overlay.
 *
 * Stores ONLY the processed 512×768 RGBA overlay Blob (never the original photo)
 * under a single key, in IndexedDB (Blobs don't belong in localStorage). The
 * backend is injectable so tests use an in-memory map — no real IndexedDB needed.
 */
export const CUSTOM_FACE_KEY = 'oiam_custom_face_v1';
const DB_NAME = 'oiam';
const STORE = 'faces';

export interface BlobBackend {
  get(key: string): Promise<Blob | null>;
  put(key: string, blob: Blob): Promise<void>;
  del(key: string): Promise<void>;
}

/** In-memory backend (tests / environments without IndexedDB). */
export function memoryBackend(): BlobBackend {
  const m = new Map<string, Blob>();
  return {
    async get(k) { return m.get(k) ?? null; },
    async put(k, b) { m.set(k, b); },
    async del(k) { m.delete(k); },
  };
}

function idbAvailable(): boolean {
  try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch { return false; }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB backend (default in the browser). */
export function idbBackend(): BlobBackend {
  const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> => {
    const db = await openDb();
    return new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
      t.oncomplete = () => db.close();
    });
  };
  return {
    async get(k) { try { return (await tx<Blob | undefined>('readonly', (s) => s.get(k))) ?? null; } catch { return null; } },
    async put(k, b) { try { await tx('readwrite', (s) => s.put(b, k)); } catch { /* quota/unavailable */ } },
    async del(k) { try { await tx('readwrite', (s) => s.delete(k)); } catch { /* */ } },
  };
}

export class FaceStore {
  constructor(private backend: BlobBackend = idbAvailable() ? idbBackend() : memoryBackend()) {}

  /** Persist the processed overlay (replaces any existing one). */
  save(overlay: Blob): Promise<void> { return this.backend.put(CUSTOM_FACE_KEY, overlay); }

  /** The processed overlay, or null if the player hasn't set one. */
  load(): Promise<Blob | null> { return this.backend.get(CUSTOM_FACE_KEY); }

  /** Remove the custom face immediately (returns to the canonical face). */
  remove(): Promise<void> { return this.backend.del(CUSTOM_FACE_KEY); }

  async has(): Promise<boolean> { return !!(await this.load()); }
}

let singleton: FaceStore | null = null;
export function getFaceStore(): FaceStore {
  if (!singleton) singleton = new FaceStore();
  return singleton;
}
