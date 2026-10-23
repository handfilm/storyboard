/**
 * @file /src/core/storage.ts
 * @description Storage manager with debounced autosave, crash recovery, and persistent storage quota checks.
 */

import { ProjectV1 } from '../types/projectSchema';
import { studioDraftDb } from '../services/db';

export type SaveState = 'SAVED (IDB)' | 'SAVING...' | 'SAVE ERROR' | 'IDLE' | 'UNSAVED' | 'saved';

export interface StorageQuotaInfo {
  supported: boolean;
  usagePercent: number;
  persisted: boolean;
  isHighUsage: boolean;
}

export interface CrashRecoveryResult {
  hasCrash: boolean;
  recoveredProject: ProjectV1 | null;
}

const CRASH_STORAGE_KEY = 'rawx_crash_recovery_snapshot_v1';
const CRASH_HEARTBEAT_KEY = 'rawx_session_heartbeat_active';

export class StorageManager {
  private saveState: SaveState = 'IDLE';
  private listeners: Set<(state: SaveState) => void> = new Set();
  private debounceTimer: any = null;
  private pendingProject: ProjectV1 | null = null;
  private isPersisted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // Clear active session heartbeat so normal exits are not flagged as crashes
        localStorage.removeItem(CRASH_HEARTBEAT_KEY);
      });
    }
  }

  public onSaveStateChange(listener: (state: SaveState) => void): () => void {
    this.listeners.add(listener);
    listener(this.saveState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setSaveState(newState: SaveState): void {
    this.saveState = newState;
    this.listeners.forEach((fn) => {
      try {
        fn(newState);
      } catch (err) {
        console.error('Error in save state listener:', err);
      }
    });
  }

  public async init(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        this.isPersisted = await navigator.storage.persist();
      }
    } catch {
      this.isPersisted = false;
    }

    // Set heartbeat marker
    if (typeof window !== 'undefined') {
      localStorage.setItem(CRASH_HEARTBEAT_KEY, String(Date.now()));
    }
  }

  public getCrashRecovery(): CrashRecoveryResult {
    if (typeof window === 'undefined') {
      return { hasCrash: false, recoveredProject: null };
    }

    try {
      const heartbeat = localStorage.getItem(CRASH_HEARTBEAT_KEY);
      const snapshot = localStorage.getItem(CRASH_STORAGE_KEY);
      if (heartbeat && snapshot) {
        const parsed = JSON.parse(snapshot) as ProjectV1;
        return { hasCrash: true, recoveredProject: parsed };
      }
    } catch (e) {
      console.warn('Could not read crash recovery snapshot:', e);
    }

    return { hasCrash: false, recoveredProject: null };
  }

  public async dismissCrashRecovery(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CRASH_STORAGE_KEY);
    }
  }

  public async loadProject(projectId?: string): Promise<ProjectV1 | null> {
    try {
      const activeDraft = await studioDraftDb.getActiveProjectDraft(projectId);
      if (activeDraft && (activeDraft as any).meta) {
        return activeDraft as unknown as ProjectV1;
      }
    } catch (err) {
      console.warn('IndexedDB loadProject error:', err);
    }

    // Fallback to localStorage snapshot
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(CRASH_STORAGE_KEY);
        if (local) return JSON.parse(local) as ProjectV1;
      } catch {}
    }

    return null;
  }

  public saveProjectDebounced(project: ProjectV1): void {
    this.pendingProject = project;
    this.setSaveState('SAVING...');

    // Save emergency backup synchronously to localStorage for crash resilience
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(project));
      } catch {}
    }

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.saveProjectNow(project).catch((err) => {
        console.error('Debounced save error:', err);
        this.setSaveState('SAVE ERROR');
      });
    }, 400);
  }

  public async saveProjectNow(project: ProjectV1): Promise<void> {
    this.setSaveState('SAVING...');
    try {
      await studioDraftDb.saveProjectDraft({
        projectId: project.id || 'default_proj',
        activeSlideIndex: 0,
        slides: (project.shots || []).map((s, idx) => ({
          id: s.id,
          shotNumber: idx + 1,
          duration: s.slideHoldSec || 12.0,
          titleBn: s.titleBn,
          titleEn: s.titleEn,
          subtitle: s.subtitle,
          imageUrl: s.imageUrl,
          directorNotes: s.directorNotes,
          soundCue: s.soundCue,
          cameraSpec: s.cameraSpec,
          lutFilter: s.filter,
          adjustments: s.adjustments,
          aspectRatio: (project.settings?.aspectRatio as any) || '2.39:1'
        })),
        config: {
          aspectRatio: (project.settings?.aspectRatio as any) || '2.39:1',
          globalHoldSec: 12.0,
          showTitles: true,
          themeId: project.settings?.theme || 'rawx-gold'
        }
      });
      this.setSaveState('SAVED (IDB)');
    } catch (err) {
      console.error('Save error in storageManager:', err);
      this.setSaveState('SAVE ERROR');
    }
  }

  public async resetVault(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CRASH_STORAGE_KEY);
      localStorage.removeItem(CRASH_HEARTBEAT_KEY);
    }
    await studioDraftDb.clearAllProjectDrafts();
  }

  public async getStorageQuota(): Promise<StorageQuotaInfo> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return { supported: false, usagePercent: 0, persisted: this.isPersisted, isHighUsage: false };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1;
      const percent = Math.min(100, Math.round((usage / quota) * 100));

      return {
        supported: true,
        usagePercent: percent,
        persisted: this.isPersisted,
        isHighUsage: percent >= 80
      };
    } catch {
      return { supported: false, usagePercent: 0, persisted: this.isPersisted, isHighUsage: false };
    }
  }
}

export const storageManager = new StorageManager();
