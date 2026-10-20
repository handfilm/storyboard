/**
 * @file /src/services/localDbService.ts
 * @description Local IndexedDB persistence service (`rawx_storyboard_studio_db`).
 * 
 * Mandated Capabilities:
 * - Database Name: `rawx_storyboard_studio_db` (v1)
 * - Object Stores:
 *   * `timeline_frames`: active storyboard frames and NLE sequence clips
 *   * `media_blobs`: offline temporary Blobs, video stream chunks, audio buffers
 *   * `undo_snapshots`: undo/redo snapshots with strict 2MB payload cap enforcement
 *   * `r2_asset_index`: cached asset registry for Cloudflare R2 zero-egress streaming
 *   * `automation_logs`: webhook pipeline execution audits
 * - Safe Serialization Guard: Strict 2MB payload cap to prevent RangeError memory leaks.
 */

import { AnthologyFrame } from '../types/anthology';
import { TimelineClip } from '../types/cut';
import { SafeStateSnapshotMetadata } from '../types/automation';

const DB_NAME = 'rawx_storyboard_studio_db';
const DB_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024; // 2MB strict payload cap

export interface StoredTimelineFrame {
  id: number;
  orderIndex: number;
  frame: AnthologyFrame;
  updatedAt: string;
}

export interface StoredMediaBlob {
  id: string; // URL hash or R2 key
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  cachedAt: string;
}

export interface StoredSnapshot {
  id: string;
  timestamp: string;
  serializedPayload: string;
  byteSize: number;
  isPruned: boolean;
  shotCount: number;
}

class LocalDbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('timeline_frames')) {
          const store = db.createObjectStore('timeline_frames', { keyPath: 'id' });
          store.createIndex('orderIndex', 'orderIndex', { unique: false });
        }

        if (!db.objectStoreNames.contains('media_blobs')) {
          db.createObjectStore('media_blobs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('undo_snapshots')) {
          const snapshotStore = db.createObjectStore('undo_snapshots', { keyPath: 'id' });
          snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('r2_asset_index')) {
          const r2Store = db.createObjectStore('r2_asset_index', { keyPath: 'key' });
          r2Store.createIndex('etag', 'etag', { unique: false });
        }

        if (!db.objectStoreNames.contains('automation_logs')) {
          const logStore = db.createObjectStore('automation_logs', { keyPath: 'id' });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.initPromise;
  }

  // =========================================================================
  // TIMELINE FRAMES PERSISTENCE
  // =========================================================================

  public async saveTimelineFrames(frames: AnthologyFrame[]): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('timeline_frames', 'readwrite');
      const store = tx.objectStore('timeline_frames');

      // Clear existing and rewrite in batch
      store.clear();
      frames.forEach((frame, idx) => {
        const item: StoredTimelineFrame = {
          id: frame.id,
          orderIndex: idx,
          frame,
          updatedAt: new Date().toISOString()
        };
        store.put(item);
      });

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[LocalDB] saveTimelineFrames error:', err);
    }
  }

  public async getTimelineFrames(): Promise<AnthologyFrame[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('timeline_frames', 'readonly');
      const store = tx.objectStore('timeline_frames');
      const index = store.index('orderIndex');
      const request = index.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const items: StoredTimelineFrame[] = request.result || [];
          resolve(items.map(it => it.frame));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[LocalDB] getTimelineFrames error:', err);
      return [];
    }
  }

  // =========================================================================
  // MEDIA BLOBS (TEMPORARY & STREAMING CHUNKS)
  // =========================================================================

  public async putMediaBlob(id: string, blob: Blob, mimeType: string): Promise<void> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_blobs', 'readwrite');
      const store = tx.objectStore('media_blobs');

      const item: StoredMediaBlob = {
        id,
        blob,
        mimeType,
        sizeBytes: blob.size,
        cachedAt: new Date().toISOString()
      };
      store.put(item);

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[LocalDB] putMediaBlob error:', err);
    }
  }

  public async getMediaBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_blobs', 'readonly');
      const store = tx.objectStore('media_blobs');
      const request = store.get(id);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const res: StoredMediaBlob = request.result;
          resolve(res ? res.blob : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  // =========================================================================
  // SAFE UNDO/REDO SNAPSHOTS (<2MB PAYLOAD CAP GUARD)
  // =========================================================================

  /**
   * Serializes project data with strict 2MB safety pruning:
   * Replaces any huge base64 strings with lightweight pointers to prevent RangeError memory leaks.
   */
  public pruneToSafePayload(rawObject: any): { json: string; byteSize: number; isPruned: boolean } {
    let isPruned = false;

    // Deep clone and prune oversized inline strings
    const sanitizeValue = (val: any): any => {
      if (val === null || val === undefined) return val;
      if (typeof val === 'string') {
        // If string is an oversized data URL (> 64KB), prune it to a safe stub
        if (val.startsWith('data:') && val.length > 64 * 1024) {
          isPruned = true;
          return `[PRUNED_BLOB_POINTER_HASH_${val.slice(0, 32).replace(/[^a-zA-Z0-9]/g, '')}]`;
        }
        return val;
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeValue);
      }
      if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(val)) {
          out[k] = sanitizeValue(val[k]);
        }
        return out;
      }
      return val;
    };

    const sanitized = sanitizeValue(rawObject);
    let json = JSON.stringify(sanitized);
    let byteSize = new Blob([json]).size;

    // Hard emergency truncation if still exceeds 2MB limit
    if (byteSize > MAX_SNAPSHOT_BYTES) {
      isPruned = true;
      // Strip adjustments and notes if necessary
      const emergencyObj = {
        title: rawObject.title || 'Untitled Project',
        director: rawObject.director || 'Director',
        frames: Array.isArray(rawObject.frames)
          ? rawObject.frames.map((f: any) => ({
              id: f.id,
              epNumber: f.epNumber,
              title: f.title,
              imageUrl: f.imageUrl && !f.imageUrl.startsWith('data:') ? f.imageUrl : ''
            }))
          : []
      };
      json = JSON.stringify(emergencyObj);
      byteSize = new Blob([json]).size;
    }

    return { json, byteSize, isPruned };
  }

  public async saveUndoSnapshot(id: string, payloadObj: any): Promise<SafeStateSnapshotMetadata> {
    const { json, byteSize, isPruned } = this.pruneToSafePayload(payloadObj);
    const shotCount = Array.isArray(payloadObj?.frames) ? payloadObj.frames.length : (payloadObj?.shots?.length || 0);

    const snapshot: StoredSnapshot = {
      id,
      timestamp: new Date().toISOString(),
      serializedPayload: json,
      byteSize,
      isPruned,
      shotCount
    };

    try {
      const db = await this.getDb();
      const tx = db.transaction('undo_snapshots', 'readwrite');
      tx.objectStore('undo_snapshots').put(snapshot);

      // Keep only the most recent 25 snapshots to avoid filling IndexedDB quota
      const countReq = tx.objectStore('undo_snapshots').count();
      countReq.onsuccess = () => {
        if (countReq.result > 25) {
          const index = tx.objectStore('undo_snapshots').index('timestamp');
          const cursorReq = index.openCursor();
          let removed = 0;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && removed < countReq.result - 25) {
              cursor.delete();
              removed++;
              cursor.continue();
            }
          };
        }
      };
    } catch (err) {
      console.warn('[LocalDB] saveUndoSnapshot error:', err);
    }

    return {
      id,
      timestamp: snapshot.timestamp,
      byteSizeBytes: byteSize,
      isPruned,
      shotCount,
      projectTitle: payloadObj?.title || 'RAWx Project'
    };
  }

  public async getUndoSnapshot(id: string): Promise<any | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('undo_snapshots', 'readonly');
      const store = tx.objectStore('undo_snapshots');
      const request = store.get(id);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          if (!request.result) return resolve(null);
          try {
            const data = JSON.parse(request.result.serializedPayload);
            resolve(data);
          } catch {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const localDbService = new LocalDbService();
