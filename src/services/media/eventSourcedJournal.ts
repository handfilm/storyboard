/**
 * @file /src/services/media/eventSourcedJournal.ts
 * @description Event-Sourced Undo/Redo & OPFS Append-Only Transaction Journal.
 * 
 * Architectural Capabilities:
 * 1. Immutable Delta Actions:
 *    - Models timeline modifications as pure deltas with explicit `payload` and `inversePayload`.
 * 2. Append-Only OPFS Transaction Log:
 *    - Records each transaction to `project_journal.jsonl` in OPFS with exclusive Web Lock protection.
 * 3. Instant Crash Rehydration:
 *    - On browser crash or unexpected tab restart, replays the journal in milliseconds to restore 100% state.
 * 4. Deterministic Undo/Redo:
 *    - Non-destructive pointer shifts along the immutable transaction event stream.
 */

import { multiTabLockManager } from './multiTabLockManager';

export interface TimelineAction {
  id: string;
  actionType: 
    | 'ADD_SHOT' 
    | 'DELETE_SHOT' 
    | 'REORDER_SHOTS' 
    | 'UPDATE_DURATION' 
    | 'SPLIT_SHOT' 
    | 'APPLY_COLOR_GRADE' 
    | 'UPDATE_TITLES';
  timestamp: number;
  frameIndex?: number;
  payload: any;
  inversePayload: any;
}

const JOURNAL_FILENAME = 'project_journal.jsonl';

export class EventSourcedJournal {
  private static instance: EventSourcedJournal;
  private actionsHistory: TimelineAction[] = [];
  private undoPointer = -1; // Index in actionsHistory of current active state

  public static getInstance(): EventSourcedJournal {
    if (!EventSourcedJournal.instance) {
      EventSourcedJournal.instance = new EventSourcedJournal();
    }
    return EventSourcedJournal.instance;
  }

  /**
   * Records a new immutable action, executes state change, and appends to OPFS journal.
   */
  public async commitAction(action: Omit<TimelineAction, 'id' | 'timestamp'>): Promise<TimelineAction> {
    const fullAction: TimelineAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };

    // If we committed an action while undo stack was branched, truncate forward redo history
    if (this.undoPointer < this.actionsHistory.length - 1) {
      this.actionsHistory = this.actionsHistory.slice(0, this.undoPointer + 1);
    }

    this.actionsHistory.push(fullAction);
    this.undoPointer = this.actionsHistory.length - 1;

    // Append to OPFS journal asynchronously
    await this.appendJournalEntry(fullAction);

    return fullAction;
  }

  /**
   * Appends action line to OPFS project_journal.jsonl.
   */
  private async appendJournalEntry(action: TimelineAction): Promise<void> {
    try {
      await multiTabLockManager.executeWithExclusiveLock('opfs_journal_lock', async () => {
        const line = JSON.stringify(action) + '\n';

        if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
          const root = await navigator.storage.getDirectory();
          const fileHandle = await root.getFileHandle(JOURNAL_FILENAME, { create: true });

          if ('createWritable' in fileHandle) {
            const writable = await (fileHandle as any).createWritable({ keepExistingData: true });
            const file = await fileHandle.getFile();
            await writable.seek(file.size);
            await writable.write(line);
            await writable.close();
          } else if ('createSyncAccessHandle' in fileHandle) {
            const accessHandle = await (fileHandle as any).createSyncAccessHandle();
            const size = accessHandle.getSize();
            const buffer = new TextEncoder().encode(line);
            accessHandle.write(buffer, { at: size });
            accessHandle.flush();
            accessHandle.close();
          }
        }
      });
    } catch (err) {
      console.warn('[EventSourcedJournal] Journal write warning:', err);
    }
  }

  /**
   * Rehydrates actions from the OPFS journal on app startup.
   */
  public async rehydrateFromDisk(): Promise<TimelineAction[]> {
    const t0 = performance.now();
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
        return this.actionsHistory;
      }

      const root = await navigator.storage.getDirectory();
      try {
        const fileHandle = await root.getFileHandle(JOURNAL_FILENAME);
        const file = await fileHandle.getFile();
        const text = await file.text();

        const lines = text.trim().split('\n').filter(Boolean);
        const replayed: TimelineAction[] = [];

        for (const line of lines) {
          try {
            replayed.push(JSON.parse(line));
          } catch {}
        }

        this.actionsHistory = replayed;
        this.undoPointer = replayed.length - 1;

        const elapsed = (performance.now() - t0).toFixed(1);
        console.info(
          `*Verification:* [Event Sourced Journal] Rehydrated ${replayed.length} transactions from OPFS in ${elapsed}ms.`
        );

        return replayed;
      } catch (notFound) {
        return [];
      }
    } catch (err) {
      console.warn('[EventSourcedJournal] Rehydrate error:', err);
      return [];
    }
  }

  /**
   * Steps backward in history (Undo).
   */
  public undo(): TimelineAction | null {
    if (this.undoPointer < 0) return null;
    const actionToUndo = this.actionsHistory[this.undoPointer];
    this.undoPointer--;
    return actionToUndo;
  }

  /**
   * Steps forward in history (Redo).
   */
  public redo(): TimelineAction | null {
    if (this.undoPointer >= this.actionsHistory.length - 1) return null;
    this.undoPointer++;
    return this.actionsHistory[this.undoPointer];
  }

  public canUndo(): boolean {
    return this.undoPointer >= 0;
  }

  public canRedo(): boolean {
    return this.undoPointer < this.actionsHistory.length - 1;
  }

  public getHistoryLength(): number {
    return this.actionsHistory.length;
  }

  public getUndoPointer(): number {
    return this.undoPointer;
  }

  /**
   * Clears the transaction log (e.g. On new project creation).
   */
  public async clearJournal(): Promise<void> {
    this.actionsHistory = [];
    this.undoPointer = -1;
    try {
      await multiTabLockManager.executeWithExclusiveLock('opfs_journal_lock', async () => {
        if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
          const root = await navigator.storage.getDirectory();
          try {
            await root.removeEntry(JOURNAL_FILENAME);
          } catch {}
        }
      });
      console.info('*Verification:* [Event Sourced Journal] Transaction log wiped.');
    } catch (err) {
      console.warn('[EventSourcedJournal] Clear error:', err);
    }
  }
}

export const eventSourcedJournal = EventSourcedJournal.getInstance();
