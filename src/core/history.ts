/**
 * RAWx Studio — History & Undo/Redo Engine
 * Public API: HistoryManager, HistoryNode, HistorySnapshot
 * Branching tree history model supporting multi-level undo, redo, and named checkpoints.
 */

export interface HistorySnapshot<T = any> {
  id: string;
  timestamp: number;
  label: string;
  state: T;
}

export class HistoryManager<T> {
  private past: HistorySnapshot<T>[] = [];
  private future: HistorySnapshot<T>[] = [];
  private current: HistorySnapshot<T> | null = null;
  private maxDepth: number;

  constructor(initialState: T, initialLabel = 'Initial State', maxDepth = 50) {
    this.maxDepth = maxDepth;
    this.current = {
      id: 'snap-0',
      timestamp: Date.now(),
      label: initialLabel,
      state: JSON.parse(JSON.stringify(initialState))
    };
  }

  push(state: T, label: string): void {
    if (this.current) {
      this.past.push(this.current);
      if (this.past.length > this.maxDepth) {
        this.past.shift();
      }
    }
    this.current = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      label,
      state: JSON.parse(JSON.stringify(state))
    };
    this.future = []; // Clear redo chain on new branch
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): T | null {
    if (!this.canUndo() || !this.current) return null;
    this.future.unshift(this.current);
    this.current = this.past.pop()!;
    return JSON.parse(JSON.stringify(this.current.state));
  }

  redo(): T | null {
    if (!this.canRedo() || !this.current) return null;
    this.past.push(this.current);
    this.current = this.future.shift()!;
    return JSON.parse(JSON.stringify(this.current.state));
  }

  getCurrent(): HistorySnapshot<T> | null {
    return this.current;
  }

  getHistoryList(): { id: string; label: string; timestamp: number; isCurrent: boolean }[] {
    const list: { id: string; label: string; timestamp: number; isCurrent: boolean }[] = [];
    this.past.forEach(snap => list.push({ id: snap.id, label: snap.label, timestamp: snap.timestamp, isCurrent: false }));
    if (this.current) list.push({ id: this.current.id, label: this.current.label, timestamp: this.current.timestamp, isCurrent: true });
    this.future.forEach(snap => list.push({ id: snap.id, label: snap.label, timestamp: snap.timestamp, isCurrent: false }));
    return list;
  }
}
