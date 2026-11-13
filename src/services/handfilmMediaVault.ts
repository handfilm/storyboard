/**
 * @file /src/services/handfilmMediaVault.ts
 * @description Sovereign Per-Shot IndexedDB Media Vault (`handfilm_media_vault`).
 * Keys binary Blobs strictly by `shotId` so assigning or dropping media onto
 * any individual shot updates ONLY that shot across reloads.
 */

export const HANDFILM_MEDIA_VAULT_DB = 'handfilm_media_vault';
export const HANDFILM_MEDIA_VAULT_VERSION = 1;
export const HANDFILM_MEDIA_VAULT_STORE = 'shot_media';

export type ShotMediaType = 'image' | 'video';

export interface ShotMediaEntry {
  url: string;
  type: ShotMediaType;
  name: string;
  mimeType?: string;
}

export type ShotMediaMap = Record<string, ShotMediaEntry>;

interface StoredShotMediaRecord {
  shotId: string;
  blob: Blob;
  type: ShotMediaType;
  name: string;
  mimeType: string;
  updatedAt: number;
}

export function getShotMediaKey(
  shot: { id?: string | number | null } | null | undefined,
  fallbackIndex: number = 0
): string {
  if (shot && shot.id !== undefined && shot.id !== null && String(shot.id).trim() !== '') {
    return String(shot.id);
  }
  return String(Math.max(0, fallbackIndex));
}

export function getCandidateShotMediaKeys(
  primaryShot: { id?: string | number | null } | null | undefined,
  secondaryShot: { id?: string | number | null } | null | undefined,
  fallbackIndex: number = 0
): string[] {
  const keys: string[] = [];
  const pushUnique = (val: string) => {
    if (val && !keys.includes(val)) keys.push(val);
  };
  if (primaryShot && primaryShot.id !== undefined && primaryShot.id !== null && String(primaryShot.id).trim() !== '') {
    pushUnique(String(primaryShot.id));
  }
  if (secondaryShot && secondaryShot.id !== undefined && secondaryShot.id !== null && String(secondaryShot.id).trim() !== '') {
    pushUnique(String(secondaryShot.id));
  }
  pushUnique(String(Math.max(0, fallbackIndex)));
  return keys;
}

export function resolveShotMediaEntry(
  shotMediaMap: ShotMediaMap | null | undefined,
  primaryShot: { id?: string | number | null } | null | undefined,
  secondaryShot: { id?: string | number | null } | null | undefined,
  fallbackIndex: number = 0
): ShotMediaEntry | null {
  if (!shotMediaMap) return null;
  const candidates = getCandidateShotMediaKeys(primaryShot, secondaryShot, fallbackIndex);
  for (const key of candidates) {
    const entry = shotMediaMap[key];
    if (entry?.url) return entry;
  }
  return null;
}

export function inferShotMediaType(fileOrBlob: Blob, name?: string): ShotMediaType {
  const mime = (fileOrBlob.type || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('image/')) return 'image';
  if (name && /\.(mp4|webm|mov|m4v|mkv|avi|ogg|ogv)$/i.test(name)) {
    return 'video';
  }
  return 'image';
}

function openMediaVaultDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(HANDFILM_MEDIA_VAULT_DB, HANDFILM_MEDIA_VAULT_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDFILM_MEDIA_VAULT_STORE)) {
          db.createObjectStore(HANDFILM_MEDIA_VAULT_STORE, { keyPath: 'shotId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persists a binary image/video Blob for a single `shotId` and returns a fresh object URL entry.
 */
export async function saveShotMediaBlob(
  shotId: string,
  blob: Blob,
  name?: string
): Promise<ShotMediaEntry> {
  const normalizedId = String(shotId);
  const resolvedName = name || (blob instanceof File ? blob.name : `shot_${normalizedId}_media`);
  const mediaType = inferShotMediaType(blob, resolvedName);
  const resolvedMime =
    blob.type || (mediaType === 'video' ? 'video/mp4' : 'image/png');
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(blob)
    : '';

  const db = await openMediaVaultDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(HANDFILM_MEDIA_VAULT_STORE, 'readwrite');
        const store = tx.objectStore(HANDFILM_MEDIA_VAULT_STORE);
        const record: StoredShotMediaRecord = {
          shotId: normalizedId,
          blob,
          type: mediaType,
          name: resolvedName,
          mimeType: resolvedMime,
          updatedAt: Date.now()
        };
        store.put(record);
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

  return {
    url,
    type: mediaType,
    name: resolvedName,
    mimeType: resolvedMime
  };
}

/**
 * Hydrates all stored shot media Blobs from `handfilm_media_vault` with fresh `URL.createObjectURL(blob)` URLs.
 */
export async function loadAllShotMedia(): Promise<ShotMediaMap> {
  const result: ShotMediaMap = {};
  const db = await openMediaVaultDb();
  if (!db) return result;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDFILM_MEDIA_VAULT_STORE, 'readonly');
      const store = tx.objectStore(HANDFILM_MEDIA_VAULT_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as StoredShotMediaRecord[]) : [];
        for (const row of rows) {
          if (!row?.shotId || !row?.blob) continue;
          const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(row.blob)
            : '';
          if (!url) continue;
          result[String(row.shotId)] = {
            url,
            type: row.type || inferShotMediaType(row.blob, row.name),
            name: row.name || `shot_${row.shotId}`,
            mimeType: row.mimeType || row.blob.type
          };
        }
        db.close();
        resolve(result);
      };

      req.onerror = () => {
        db.close();
        resolve(result);
      };
    } catch {
      db.close();
      resolve(result);
    }
  });
}

/**
 * Retrieves the raw stored binary Blob for a specific `shotId` (used by the offline render pipeline).
 */
export async function getShotMediaBlob(shotId: string): Promise<Blob | null> {
  const db = await openMediaVaultDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDFILM_MEDIA_VAULT_STORE, 'readonly');
      const store = tx.objectStore(HANDFILM_MEDIA_VAULT_STORE);
      const req = store.get(String(shotId));

      req.onsuccess = () => {
        const record = req.result as StoredShotMediaRecord | undefined;
        db.close();
        resolve(record?.blob || null);
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

/**
 * Deletes stored media for a single `shotId` without touching any other shots.
 */
export async function deleteShotMedia(shotId: string): Promise<void> {
  const db = await openMediaVaultDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDFILM_MEDIA_VAULT_STORE, 'readwrite');
      const store = tx.objectStore(HANDFILM_MEDIA_VAULT_STORE);
      store.delete(String(shotId));
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

/**
 * Clears all stored shot media entries from `handfilm_media_vault`.
 */
export async function clearAllShotMedia(): Promise<void> {
  const db = await openMediaVaultDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(HANDFILM_MEDIA_VAULT_STORE, 'readwrite');
      const store = tx.objectStore(HANDFILM_MEDIA_VAULT_STORE);
      store.clear();
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
