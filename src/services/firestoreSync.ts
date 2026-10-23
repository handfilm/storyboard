/**
 * @file /src/services/firestoreSync.ts
 * @description Synchronization engine connecting local Storyboard drafts with Firestore.
 */

import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { AnthologyProject } from '../types/anthology';

export interface CloudSyncStatus {
  isSynced: boolean;
  lastSyncedAt: number | null;
  error: string | null;
}

class FirestoreSyncService {
  private syncListeners: ((status: CloudSyncStatus) => void)[] = [];
  private currentStatus: CloudSyncStatus = {
    isSynced: false,
    lastSyncedAt: null,
    error: null
  };

  public subscribeStatus(listener: (status: CloudSyncStatus) => void) {
    this.syncListeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus(update: Partial<CloudSyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...update };
    this.syncListeners.forEach(l => l(this.currentStatus));
  }

  /**
   * Save complete Storyboard Project to Firestore
   */
  public async saveProjectToCloud(project: AnthologyProject): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) {
      this.notifyStatus({ isSynced: false, error: 'Sign in required to sync to Firestore' });
      return false;
    }

    const projectId = project.title ? project.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : 'default_storyboard';
    const docPath = `storyboards/${projectId}`;

    try {
      // Prepare clean serializable frames payload (strip circular or transient blob URLs)
      const cleanFrames = project.frames.map(f => ({
        id: f.id,
        epNumber: f.epNumber,
        title: f.title,
        bengaliTitle: f.bengaliTitle,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        cameraSpec: f.cameraSpec || {},
        imageUrl: f.imageUrl?.startsWith('blob:') ? '' : (f.imageUrl || ''),
        isVideo: Boolean(f.isVideo),
        panY: f.panY ?? 50,
        colorAccent: f.colorAccent || '#D4AF37',
        lutFilter: f.lutFilter || 'cinematic',
        aspectRatio: f.aspectRatio || '2.39:1',
        adjustments: f.adjustments || {}
      }));

      const payload = {
        id: projectId,
        title: project.title,
        director: project.director,
        nodeLocation: project.nodeLocation,
        framesCount: cleanFrames.length,
        frames: cleanFrames,
        aspectRatio: project.frames[0]?.aspectRatio || '2.39:1',
        updatedAt: serverTimestamp(),
        updatedBy: user.email || user.uid,
        ownerUid: user.uid
      };

      await setDoc(doc(db, 'storyboards', projectId), payload, { merge: true });

      this.notifyStatus({
        isSynced: true,
        lastSyncedAt: Date.now(),
        error: null
      });
      return true;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
      this.notifyStatus({ isSynced: false, error: err.message || 'Firestore write failed' });
      return false;
    }
  }

  /**
   * Load Storyboard Project from Firestore
   */
  public async loadProjectFromCloud(projectId = 'default_storyboard'): Promise<any | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const cleanId = projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const docPath = `storyboards/${cleanId}`;

    try {
      const snapshot = await getDoc(doc(db, 'storyboards', cleanId));
      if (snapshot.exists()) {
        this.notifyStatus({ isSynced: true, lastSyncedAt: Date.now(), error: null });
        return snapshot.data();
      }
      return null;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, docPath);
      this.notifyStatus({ isSynced: false, error: err.message });
      return null;
    }
  }

  /**
   * Real-time subscription to cloud storyboard changes
   */
  public subscribeToCloudProject(projectId: string, onUpdate: (data: any) => void) {
    const user = auth.currentUser;
    if (!user) return () => {};

    const cleanId = projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const docRef = doc(db, 'storyboards', cleanId);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data());
          this.notifyStatus({ isSynced: true, lastSyncedAt: Date.now(), error: null });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `storyboards/${cleanId}`);
        this.notifyStatus({ isSynced: false, error: error.message });
      }
    );
  }
}

export const firestoreSync = new FirestoreSyncService();
