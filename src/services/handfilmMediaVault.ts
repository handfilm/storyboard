/**
 * @file /src/services/handfilmMediaVault.ts
 * @description Sovereign Per-Shot IndexedDB Media Vault (`handfilm_media_vault`).
 * Keys binary Blobs strictly by `shotId` so assigning or dropping media onto
 * any individual shot updates ONLY that shot across reloads.
 */

import { convertFileSrc } from '@tauri-apps/api/core';

export const HANDFILM_MEDIA_VAULT_DB = 'handfilm_media_vault';
export const HANDFILM_MEDIA_VAULT_VERSION = 1;
export const HANDFILM_MEDIA_VAULT_STORE = 'shot_media';
export const HANDFILM_SHOT_PATHS_KEY = 'handfilm_shot_paths';

export type ShotMediaType = 'image' | 'video';

export interface ShotMediaEntry {
  url: string;
  type: ShotMediaType;
  name: string;
  mimeType?: string;
  nativePath?: string;
  isTauriAsset?: boolean;
}

export type ShotMediaMap = Record<string, ShotMediaEntry>;

export interface StoredShotNativePathRecord {
  shotId: string;
  nativePath: string;
  type: ShotMediaType;
  name: string;
  mimeType: string;
  updatedAt: number;
}

interface StoredShotMediaRecord {
  shotId: string;
  blob: Blob;
  type: ShotMediaType;
  name: string;
  mimeType: string;
  updatedAt: number;
}

export function isTauriNativeRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function extractFileNameFromPath(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

export function inferMimeTypeFromFileName(name: string, type: ShotMediaType): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return type === 'video' ? 'video/mp4' : 'image/jpeg';
}

export function resolveTauriAssetUrl(nativePath: string): string {
  if (!nativePath) return '';
  if (!isTauriNativeRuntime()) return nativePath;
  try {
    return convertFileSrc(nativePath);
  } catch {
    return nativePath;
  }
}

export function loadAllShotNativePaths(): Record<string, StoredShotNativePathRecord> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HANDFILM_SHOT_PATHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, StoredShotNativePathRecord>;
  } catch {
    return {};
  }
}

export function saveShotNativePath(
  shotId: string,
  nativePath: string,
  name?: string,
  mimeType?: string
): ShotMediaEntry {
  const normalizedId = String(shotId);
  const resolvedName = name || extractFileNameFromPath(nativePath);
  const fakeBlob = new Blob([], { type: mimeType || '' });
  const mediaType = inferShotMediaType(fakeBlob, resolvedName);
  const resolvedMime = mimeType || inferMimeTypeFromFileName(resolvedName, mediaType);

  const records = loadAllShotNativePaths();
  records[normalizedId] = {
    shotId: normalizedId,
    nativePath,
    type: mediaType,
    name: resolvedName,
    mimeType: resolvedMime,
    updatedAt: Date.now()
  };

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(HANDFILM_SHOT_PATHS_KEY, JSON.stringify(records));
    } catch {
      // Ignore quota errors cleanly
    }
  }

  return {
    url: resolveTauriAssetUrl(nativePath),
    type: mediaType,
    name: resolvedName,
    mimeType: resolvedMime,
    nativePath,
    isTauriAsset: true
  };
}

export function deleteShotNativePath(shotId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const records = loadAllShotNativePaths();
    const key = String(shotId);
    if (key in records) {
      delete records[key];
      localStorage.setItem(HANDFILM_SHOT_PATHS_KEY, JSON.stringify(records));
    }
  } catch {
    // ignore
  }
}

export function clearAllShotNativePaths(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(HANDFILM_SHOT_PATHS_KEY);
  } catch {
    // ignore
  }
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
  primaryShot: { id?: string | number | null; mediaVaultKey?: string | null } | null | undefined,
  secondaryShot: { id?: string | number | null; mediaVaultKey?: string | null } | null | undefined,
  fallbackIndex: number = 0
): string[] {
  const keys: string[] = [];
  const pushUnique = (val: string) => {
    if (val && !keys.includes(val)) keys.push(val);
  };
  if (primaryShot && primaryShot.id !== undefined && primaryShot.id !== null && String(primaryShot.id).trim() !== '') {
    pushUnique(String(primaryShot.id));
  }
  if (primaryShot?.mediaVaultKey && String(primaryShot.mediaVaultKey).trim() !== '') {
    pushUnique(String(primaryShot.mediaVaultKey));
  }
  if (secondaryShot && secondaryShot.id !== undefined && secondaryShot.id !== null && String(secondaryShot.id).trim() !== '') {
    pushUnique(String(secondaryShot.id));
  }
  if (secondaryShot?.mediaVaultKey && String(secondaryShot.mediaVaultKey).trim() !== '') {
    pushUnique(String(secondaryShot.mediaVaultKey));
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
 * Clears any stale nativePath on that shot so newly dropped browser blobs take precedence.
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

  deleteShotNativePath(normalizedId);

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
    mimeType: resolvedMime,
    isTauriAsset: false
  };
}

/**
 * Hydrates all stored shot media entries:
 * 1. Tauri native paths from `localStorage` (`handfilm_shot_paths`) resolved zero-copy via `convertFileSrc`
 * 2. IndexedDB Blobs from `handfilm_media_vault` hydrated with `URL.createObjectURL`
 */
export async function loadAllShotMedia(): Promise<ShotMediaMap> {
  const result: ShotMediaMap = {};

  // 1. Hydrate IndexedDB Blobs first (browser mode & non-path uploads)
  const db = await openMediaVaultDb();
  if (db) {
    await new Promise<void>((resolve) => {
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
              mimeType: row.mimeType || row.blob.type,
              isTauriAsset: false
            };
          }
          db.close();
          resolve();
        };

        req.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  // 2. Overlay VLC-style zero-copy native OS paths in Tauri runtime (zero RAM copy on startup)
  if (isTauriNativeRuntime()) {
    const nativePaths = loadAllShotNativePaths();
    for (const [shotId, rec] of Object.entries(nativePaths)) {
      if (!rec?.nativePath) continue;
      const resolvedUrl = resolveTauriAssetUrl(rec.nativePath);
      if (!resolvedUrl) continue;
      result[String(shotId)] = {
        url: resolvedUrl,
        type: rec.type || inferShotMediaType(new Blob([], { type: rec.mimeType }), rec.name),
        name: rec.name || extractFileNameFromPath(rec.nativePath),
        mimeType: rec.mimeType || inferMimeTypeFromFileName(rec.nativePath, rec.type || 'video'),
        nativePath: rec.nativePath,
        isTauriAsset: true
      };
    }
  }

  return result;
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
 * Deletes stored media (both IndexedDB Blob and Tauri nativePath) for a single `shotId`.
 */
export async function deleteShotMedia(shotId: string): Promise<void> {
  deleteShotNativePath(shotId);
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
 * Clears all stored shot media entries from `handfilm_media_vault` and `handfilm_shot_paths`.
 */
export async function clearAllShotMedia(): Promise<void> {
  clearAllShotNativePaths();
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
