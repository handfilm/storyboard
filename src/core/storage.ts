/**
 * @file /src/core/storage.ts
 * @description Master IndexedDB Persistence Core for RAWx Storyboard Engine.
 * Features:
 * - Versioned IndexedDB schema (RAWxVault100_DB v2) with non-destructive migrations
 * - 800ms debounced autosave with visible save state ('saving' | 'saved' | 'error')
 * - Transactional writes and corruption detection with auto-snapshot recovery
 * - navigator.storage.persist() and 80% quota warning
 * - Crash recovery detection ("Restore last session")
 * - Multi-project CRUD: create, switch, rename, duplicate, delete
 */

import { ProjectV1, ProjectSnapshotV1, StorageQuotaInfo, isValidProjectV1 } from '../types/projectSchema';
import { createDefaultProjectV1, duplicateProjectV1, migrateToProjectV1 } from '../utils/projectMigration';

const DB_NAME = 'RAWxVault100_DB';
const DB_VERSION = 2;

export type SaveState = 'saving' | 'saved' | 'error';

class StorageManager {
  private db: IDBDatabase | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private saveStateListeners: Set<(state: SaveState) => void> = new Set();
  private hasAbnormalTermination = false;
  private lastSessionData: ProjectV1 | null = null;
  private activeProjectId: string = '';

  /**
   * Initializes IndexedDB, runs migrations, verifies quota, and checks crash status.
   */
  public async init(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }

    // 1. Request persistent storage if supported
    if (navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // Fallback gracefully
      }
    }

    // 2. Open DB with migration support and timeout guard
    try {
      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('IndexedDB open timed out after 2500ms; falling back to in-memory mode');
          reject(new Error('IndexedDB open timed out'));
        }, 2500);

        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onblocked = () => {
            console.warn('IndexedDB upgrade blocked by concurrent connection');
            clearTimeout(timeout);
            if (request.result) resolve(request.result);
          };

          request.onupgradeneeded = (event) => {
            const db = request.result;

            // Ensure legacy stores remain untouched
            if (!db.objectStoreNames.contains('frames')) {
              db.createObjectStore('frames', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('settings')) {
              db.createObjectStore('settings', { keyPath: 'key' });
            }

            // Add v2 project & snapshot stores
            if (!db.objectStoreNames.contains('projects')) {
              db.createObjectStore('projects', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('snapshots')) {
              const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
              snapshotStore.createIndex('projectId', 'projectId', { unique: false });
              snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains('session')) {
              db.createObjectStore('session');
            }
          };

          request.onsuccess = () => {
            clearTimeout(timeout);
            resolve(request.result);
          };
          request.onerror = () => {
            clearTimeout(timeout);
            reject(request.error);
          };
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    } catch (err) {
      console.warn('IndexedDB unavailable or blocked — running in-memory fallback:', err);
      this.db = null;
    }

    // 3. Check for crash recovery / abnormal termination
    await this.checkSessionIntegrity();

    // 4. Ensure at least one valid 100-shot project exists
    await this.ensureInitialProject();

    // 5. Register clean exit listener
    this.setupExitHeartbeat();
  }

  /**
   * Checks whether the previous session terminated abruptly without clean exit
   */
  private async checkSessionIntegrity(): Promise<void> {
    if (!this.db) return;
    try {
      const sessionData = await this.readSessionKey('session_status');
      if (sessionData && sessionData.active === true && sessionData.cleanExit === false) {
        this.hasAbnormalTermination = true;
        const lastProj = await this.readSessionKey('last_active_project');
        if (lastProj && isValidProjectV1(lastProj)) {
          this.lastSessionData = lastProj;
        }
      }

      // Mark current session as active
      await this.writeSessionKey('session_status', {
        active: true,
        cleanExit: false,
        startedAt: new Date().toISOString()
      });
    } catch {
      // Session tracking fallback
    }
  }

  /**
   * Sets up window unload listener to record clean exit
   */
  private setupExitHeartbeat(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      if (this.db) {
        try {
          const tx = this.db.transaction('session', 'readwrite');
          tx.objectStore('session').put({
            active: false,
            cleanExit: true,
            endedAt: new Date().toISOString()
          }, 'session_status');
        } catch {
          // Unload sync
        }
      }
    });
  }

  /**
   * Migrates legacy v1 frames or creates initial demo project if DB is empty
   */
  private async ensureInitialProject(): Promise<void> {
    if (!this.db) return;

    const existingProjects = await this.listProjects();
    if (existingProjects.length > 0) {
      this.activeProjectId = existingProjects[0].id;
      // Auto-repair existing project if shots were lost or corrupted
      try {
        const existing = await this.loadProject(existingProjects[0].id);
        if (existing && (!existing.shots || existing.shots.length < 100)) {
          const repaired = migrateToProjectV1(existing);
          await this.saveProjectDirect(repaired);
        }
      } catch {}
      return;
    }

    // Check if legacy 'frames' store has data
    const legacyFrames = await this.readAllLegacyFrames();
    let initialProject: ProjectV1;

    if (legacyFrames.length > 0) {
      // Migrate legacy data safely onto full 100-frame sequence
      initialProject = migrateToProjectV1({
        title: 'RAWx // Master Anthology (Migrated)',
        director: 'Rakib Himon',
        nodeLocation: 'DHAKA_01',
        aspectRatio: '2.39:1',
        frames: legacyFrames as any,
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      });
    } else {
      // DB completely empty -> create demo project
      initialProject = createDefaultProjectV1();
    }

    await this.saveProjectDirect(initialProject);
    this.activeProjectId = initialProject.id;
  }

  private readAllLegacyFrames(): Promise<any[]> {
    return new Promise((resolve) => {
      if (!this.db || !this.db.objectStoreNames.contains('frames')) {
        return resolve([]);
      }
      try {
        const tx = this.db.transaction('frames', 'readonly');
        const req = tx.objectStore('frames').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Direct transactional write for a project
   */
  private saveProjectDirect(project: ProjectV1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      try {
        project.meta.updatedAt = new Date().toISOString();
        const tx = this.db.transaction(['projects', 'session'], 'readwrite');
        const store = tx.objectStore('projects');
        store.put(project);

        // Keep last active project cached in session for crash recovery
        const sessionStore = tx.objectStore('session');
        sessionStore.put(project, 'last_active_project');
        sessionStore.put(project.id, 'last_active_project_id');

        tx.oncomplete = () => {
          this.activeProjectId = project.id;
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 300ms debounced auto-save with UI state notifications ('saving' | 'saved' | 'error')
   */
  public saveProjectDebounced(project: ProjectV1): void {
    this.notifySaveState('saving');

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveProjectDirect(project);
        this.notifySaveState('saved');
      } catch (err) {
        this.notifySaveState('error');
      }
    }, 300);
  }

  /**
   * Loads a project by ID with corruption check, auto-healing to 100 shots, and snapshot recovery
   */
  public async loadProject(id?: string): Promise<ProjectV1 | null> {
    if (!this.db) return null;

    const targetId = id || this.activeProjectId;
    if (!targetId) {
      const all = await this.listProjects();
      if (all.length === 0) return null;
      return this.loadProject(all[0].id);
    }

    return new Promise(async (resolve) => {
      try {
        const tx = this.db!.transaction('projects', 'readonly');
        const req = tx.objectStore('projects').get(targetId);

        req.onsuccess = async () => {
          const raw = req.result;

          // Corruption & completeness check
          if (isValidProjectV1(raw)) {
            // Self-heal: ensure project always has 100 shots
            if (!raw.shots || raw.shots.length < 100) {
              const repaired = migrateToProjectV1(raw);
              await this.saveProjectDirect(repaired);
              this.activeProjectId = repaired.id;
              return resolve(repaired);
            }
            this.activeProjectId = raw.id;
            return resolve(raw);
          }

          // Corrupted project detected -> attempt recovery from latest snapshot
          const recovered = await this.recoverFromSnapshot(targetId);
          if (recovered) {
            const repaired = migrateToProjectV1(recovered);
            await this.saveProjectDirect(repaired);
            this.activeProjectId = repaired.id;
            return resolve(repaired);
          }

          // Fallback to fresh default 100-shot project
          const fresh = createDefaultProjectV1('RAWx // Recovered Project');
          await this.saveProjectDirect(fresh);
          resolve(fresh);
        };

        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Resets vault and seeds pristine 100 shots
   */
  public async resetVault(): Promise<ProjectV1> {
    const fresh = createDefaultProjectV1();
    if (this.db) {
      try {
        const tx = this.db.transaction(['projects', 'session'], 'readwrite');
        tx.objectStore('projects').clear();
        tx.objectStore('session').clear();
      } catch {}
    }
    await this.saveProjectDirect(fresh);
    this.activeProjectId = fresh.id;
    return fresh;
  }

  /**
   * Auto-recovers a corrupted project from its latest valid snapshot
   */
  private async recoverFromSnapshot(projectId: string): Promise<ProjectV1 | null> {
    if (!this.db || !this.db.objectStoreNames.contains('snapshots')) return null;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('snapshots', 'readonly');
        const store = tx.objectStore('snapshots');
        const index = store.index('projectId');
        const req = index.getAll(projectId);

        req.onsuccess = () => {
          const snapshots: ProjectSnapshotV1[] = req.result || [];
          if (snapshots.length === 0) return resolve(null);

          // Sort by timestamp descending
          snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          for (const snap of snapshots) {
            if (isValidProjectV1(snap.projectData)) {
              return resolve(snap.projectData);
            }
          }
          resolve(null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Lists all projects saved in IndexedDB
   */
  public async listProjects(): Promise<Array<{ id: string; title: string; updatedAt: string; shotCount: number }>> {
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('projects', 'readonly');
        const req = tx.objectStore('projects').getAll();

        req.onsuccess = () => {
          const rawProjects: any[] = req.result || [];
          const list = rawProjects
            .filter(p => p && p.id && p.meta)
            .map(p => ({
              id: p.id,
              title: p.meta.title || 'Untitled Project',
              updatedAt: p.meta.updatedAt || p.meta.createdAt || new Date().toISOString(),
              shotCount: Array.isArray(p.shots) ? p.shots.length : 0
            }))
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Creates a new project and saves it to IndexedDB
   */
  public async createProject(title: string, director = 'Rakib Himon'): Promise<ProjectV1> {
    const project = createDefaultProjectV1(title);
    project.meta.director = director;
    await this.saveProjectDirect(project);
    this.activeProjectId = project.id;
    return project;
  }

  /**
   * Duplicates an existing project
   */
  public async duplicateProject(id: string): Promise<ProjectV1 | null> {
    const source = await this.loadProject(id);
    if (!source) return null;

    const cloned = duplicateProjectV1(source);
    await this.saveProjectDirect(cloned);
    return cloned;
  }

  /**
   * Deletes a project by ID
   */
  public async deleteProject(id: string): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('projects', 'readwrite');
        const req = tx.objectStore('projects').delete(id);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Creates a snapshot of the project
   */
  public async createSnapshot(project: ProjectV1, name?: string, isAutomatic = false): Promise<ProjectSnapshotV1> {
    const snapshot: ProjectSnapshotV1 = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: project.id,
      name: name || (isAutomatic ? `Auto-Snapshot ${new Date().toLocaleTimeString()}` : `Manual Snapshot`),
      timestamp: new Date().toISOString(),
      isAutomatic,
      projectData: JSON.parse(JSON.stringify(project))
    };

    if (this.db) {
      try {
        const tx = this.db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put(snapshot);
      } catch {
        // Snapshot save fallback
      }
    }

    return snapshot;
  }

  /**
   * Queries navigator.storage for quota and persistence status
   */
  public async getStorageQuota(): Promise<StorageQuotaInfo> {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
      return {
        supported: false,
        persisted: false,
        usageBytes: 0,
        quotaBytes: 0,
        usagePercent: 0,
        isHighUsage: false
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const isPersisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 1;
      const usagePercent = Math.round((usageBytes / quotaBytes) * 100);

      return {
        supported: true,
        persisted: isPersisted,
        usageBytes,
        quotaBytes,
        usagePercent,
        isHighUsage: usagePercent >= 80
      };
    } catch {
      return {
        supported: false,
        persisted: false,
        usageBytes: 0,
        quotaBytes: 0,
        usagePercent: 0,
        isHighUsage: false
      };
    }
  }

  /**
   * Crash recovery accessor and clearing methods
   */
  public getCrashRecovery(): { hasCrash: boolean; recoveredProject: ProjectV1 | null } {
    return {
      hasCrash: this.hasAbnormalTermination && Boolean(this.lastSessionData),
      recoveredProject: this.lastSessionData
    };
  }

  public async dismissCrashRecovery(): Promise<void> {
    this.hasAbnormalTermination = false;
    this.lastSessionData = null;
    await this.writeSessionKey('session_status', {
      active: true,
      cleanExit: false,
      startedAt: new Date().toISOString()
    });
  }

  // --- Session Key Helpers ---
  private readSessionKey(key: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.db || !this.db.objectStoreNames.contains('session')) return resolve(null);
      try {
        const tx = this.db.transaction('session', 'readonly');
        const req = tx.objectStore('session').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private writeSessionKey(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db || !this.db.objectStoreNames.contains('session')) return resolve();
      try {
        const tx = this.db.transaction('session', 'readwrite');
        tx.objectStore('session').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // --- Save State Listeners ---
  public onSaveStateChange(listener: (state: SaveState) => void): () => void {
    this.saveStateListeners.add(listener);
    return () => this.saveStateListeners.delete(listener);
  }

  private notifySaveState(state: SaveState): void {
    this.saveStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch {
        // Listener fail silent
      }
    });
  }
}

export const storageManager = new StorageManager();
