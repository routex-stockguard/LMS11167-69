const DB_NAME = 'routex_rms_media_db';
const STORE_NAME = 'evidence_videos';
const DB_VERSION = 1;

const memoryBlobUrlCache = new Map<string, string>();
const memoryBlobMap = new Map<string, Blob>();

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveVideoBlob(id: string, blob: Blob): Promise<string> {
  memoryBlobMap.set(id, blob);
  const existingUrl = memoryBlobUrlCache.get(id);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
  }
  const objectUrl = URL.createObjectURL(blob);
  memoryBlobUrlCache.set(id, objectUrl);

  const db = await openMediaDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  return objectUrl;
}

export async function loadVideoUrl(id: string): Promise<string | null> {
  const cached = memoryBlobUrlCache.get(id);
  if (cached) return cached;

  const memBlob = memoryBlobMap.get(id);
  if (memBlob) {
    const url = URL.createObjectURL(memBlob);
    memoryBlobUrlCache.set(id, url);
    return url;
  }

  const db = await openMediaDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const result = req.result;
        db.close();
        if (result instanceof Blob) {
          memoryBlobMap.set(id, result);
          const url = URL.createObjectURL(result);
          memoryBlobUrlCache.set(id, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function deleteVideoBlob(id: string): Promise<void> {
  memoryBlobMap.delete(id);
  const cached = memoryBlobUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    memoryBlobUrlCache.delete(id);
  }

  const db = await openMediaDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
