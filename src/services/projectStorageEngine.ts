/**
 * @file /src/services/projectStorageEngine.ts
 * @description Autonomous Sovereign Session Persistence & IndexedDB Auto-Save Engine for HANDFILM.
 * 
 * Features:
 * 1. Seamless IndexedDB Autosave:
 *    - Debounces timeline mutations by 1.5 seconds and serializes state to IndexedDB ('handfilm_active_project').
 *    - Persists: active shot index, custom titles (Bangla/English), multi-cam cut markers, and trim durations.
 * 2. Hard Reload Recovery:
 *    - On app reload, automatically hydrates state from IndexedDB so zero progress is lost on accidental browser closure.
 * 3. Quick Project Backup (.JSON):
 *    - High-fidelity lossless JSON export of current session project state.
 *    - One-click JSON restore pipeline with instant state rehydration.
 */

import { MultiCamGroup } from '../types/multicam';

export interface ShotSessionState {
  id: string;
  shotIndex: number;
  title: string;
  bengaliTitle: string;
  englishTitle?: string;
  tagline?: string;
  directorNotes?: string;
  soundCue?: string;
  durationSeconds: number;
  trimInSec?: number;
  trimOutSec?: number;
  imageUrl?: string;
  isVideo?: boolean;
  aspectRatio?: string;
  lutFilter?: string;
}

export interface SovereignProjectState {
  version: string;
  updatedAt: number;
  activeShotIndex: number;
  projectTitle: string;
  shots: ShotSessionState[];
  multiCamGroup?: MultiCamGroup;
  titleConfig?: {
    preset?: string;
    titleSize?: number;
    glowIntensity?: number;
    tracking?: number;
    verticalOffset?: number;
    showTitles?: boolean;
  };
}

const DB_NAME = 'handfilm_sovereign_db';
const DB_VERSION = 1;
const STORE_NAME = 'handfilm_active_project';
const SESSION_KEY = 'active_session';

class ProjectStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private autosaveTimer: any = null;
  private pendingState: SovereignProjectState | null = null;
  private isSaving = false;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          return reject(new Error('IndexedDB not supported in this environment'));
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }
    return this.dbPromise;
  }

  /**
   * Save session directly to IndexedDB.
   */
  public async saveSession(state: SovereignProjectState): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record = {
          key: SESSION_KEY,
          state: {
            ...state,
            updatedAt: Date.now()
          }
        };

        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[ProjectStorageEngine] Failed to save session to IndexedDB:', err);
    }
  }

  /**
   * Hydrate project session state from IndexedDB on hard reload.
   */
  public async loadSession(): Promise<SovereignProjectState | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(SESSION_KEY);

        req.onsuccess = () => {
          if (req.result && req.result.state) {
            resolve(req.result.state as SovereignProjectState);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[ProjectStorageEngine] Failed to load session from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Clear active session.
   */
  public async clearSession(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(SESSION_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[ProjectStorageEngine] Failed to clear session:', err);
    }
  }

  /**
   * Debounced autosave (1.5 seconds) to prevent disk I/O thrashing during live scrubbing and cutting.
   */
  public scheduleAutosave(state: SovereignProjectState, delayMs = 1500): void {
    this.pendingState = state;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(async () => {
      if (this.pendingState && !this.isSaving) {
        this.isSaving = true;
        try {
          await this.saveSession(this.pendingState);
        } finally {
          this.isSaving = false;
        }
      }
    }, delayMs);
  }

  /**
   * Export sovereign session project state to downloadable JSON file.
   */
  public exportProjectJson(state: SovereignProjectState, filenamePrefix = 'handfilm_project'): void {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `${filenamePrefix}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Import project state from JSON file.
   */
  public async importProjectJson(file: File): Promise<SovereignProjectState> {
    const text = await file.text();
    const parsed = JSON.parse(text) as SovereignProjectState;
    if (!parsed || !Array.isArray(parsed.shots)) {
      throw new Error('Invalid project file format: missing shots array');
    }
    await this.saveSession(parsed);
    return parsed;
  }
}

export const projectStorageEngine = new ProjectStorageEngine();
