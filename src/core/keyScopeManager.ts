/**
 * @file /src/core/keyScopeManager.ts
 * @description Single Source of Truth Key Scope Manager for RAWx Storyboard Engine.
 * 
 * Enforces strict layer priority:
 * - Layers: 'STAGE' | 'CINEMA' | 'TRIMMER'
 * - Active layer wins: Only shortcuts registered to the current active layer are processed.
 * - Universal suppression: All shortcuts are bypassed when focus is within inputs, textareas,
 *   selects, contenteditable elements, or active non-player dialogs.
 * - Provides active layer query for the '?' shortcut cheat sheet overlay.
 */

export type KeyScopeLayer = 'STAGE' | 'CINEMA' | 'TRIMMER';

export interface StageShortcutHandlers {
  onTogglePlay: () => void;
  onNextShot: () => void;
  onPrevShot: () => void;
  onStepFrame: (forward: boolean) => void;
  onToggleGrid: () => void;
  onOpenCinema: () => void;
  onToggleMute?: () => void;
}

export interface CinemaShortcutHandlers {
  onTogglePlay: () => void;
  onSkipTime: (seconds: number) => void;
  onStepFrame: (forward: boolean) => void;
  onShuttle: (action: 'reverse' | 'stop' | 'forward') => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleTitles: () => void;
  onCloseCinema: () => void;
}

export interface TrimmerShortcutHandlers {
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onSplitClip: () => void;
  onShuttle: (action: 'reverse' | 'stop' | 'forward') => void;
  onStepFrame: (forward: boolean) => void;
}

type LayerChangeListener = (layer: KeyScopeLayer) => void;

class KeyScopeManager {
  private activeLayer: KeyScopeLayer = 'STAGE';
  private stageHandlers: StageShortcutHandlers | null = null;
  private cinemaHandlers: CinemaShortcutHandlers | null = null;
  private trimmerHandlers: TrimmerShortcutHandlers | null = null;
  private onToggleCheatSheet: (() => void) | null = null;
  private listeners: Set<LayerChangeListener> = new Set();
  private isListening = false;

  public setCheatSheetHandler(handler: () => void): () => void {
    this.onToggleCheatSheet = handler;
    return () => {
      this.onToggleCheatSheet = null;
    };
  }

  public setActiveLayer(layer: KeyScopeLayer): void {
    if (this.activeLayer !== layer) {
      this.activeLayer = layer;
      this.notifyListeners();
    }
  }

  public getActiveLayer(): KeyScopeLayer {
    return this.activeLayer;
  }

  public registerStageHandlers(handlers: StageShortcutHandlers): () => void {
    this.stageHandlers = handlers;
    return () => {
      if (this.stageHandlers === handlers) {
        this.stageHandlers = null;
      }
    };
  }

  public registerCinemaHandlers(handlers: CinemaShortcutHandlers): () => void {
    this.cinemaHandlers = handlers;
    return () => {
      if (this.cinemaHandlers === handlers) {
        this.cinemaHandlers = null;
      }
    };
  }

  public registerTrimmerHandlers(handlers: TrimmerShortcutHandlers): () => void {
    this.trimmerHandlers = handlers;
    return () => {
      if (this.trimmerHandlers === handlers) {
        this.trimmerHandlers = null;
      }
    };
  }

  public subscribe(listener: LayerChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.activeLayer);
      } catch (err) {
        console.error('[KeyScopeManager] Listener error:', err);
      }
    }
  }

  public isInputElement(el: EventTarget | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    // Check if within non-player dialog
    const dialog = el.closest('[role="dialog"]');
    if (dialog && !dialog.classList.contains('cinema-player-dialog') && !dialog.classList.contains('shortcuts-dialog')) {
      return true;
    }
    return false;
  }

  public init(): () => void {
    if (this.isListening || typeof window === 'undefined') return () => {};

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Universal input suppression
      if (this.isInputElement(e.target)) return;

      // 2. Global Shortcut Cheat Sheet: '?' or Shift+/
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        this.onToggleCheatSheet?.();
        return;
      }

      // 3. Dispatch to active layer ONLY
      switch (this.activeLayer) {
        case 'STAGE':
          this.handleStageKeys(e);
          break;
        case 'CINEMA':
          this.handleCinemaKeys(e);
          break;
        case 'TRIMMER':
          this.handleTrimmerKeys(e);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    this.isListening = true;

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      this.isListening = false;
    };
  }

  private handleStageKeys(e: KeyboardEvent): void {
    if (!this.stageHandlers) return;

    // Space: Play / Pause
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      this.stageHandlers.onTogglePlay();
      return;
    }

    // Left / Right arrows: Previous / Next shot
    if (e.key === 'ArrowLeft' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.stageHandlers.onPrevShot();
      return;
    }
    if (e.key === 'ArrowRight' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      this.stageHandlers.onNextShot();
      return;
    }

    // , and . : Frame stepping (-1F / +1F)
    if (e.key === ',' || e.key === '<') {
      e.preventDefault();
      this.stageHandlers.onStepFrame(false);
      return;
    }
    if (e.key === '.' || e.key === '>') {
      e.preventDefault();
      this.stageHandlers.onStepFrame(true);
      return;
    }

    // G: Toggle Modal 1: Contact Sheet Grid
    if (e.key === 'g' || e.key === 'G') {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.stageHandlers.onToggleGrid();
        return;
      }
    }

    // F: Open Cinema Player
    if (e.key === 'f' || e.key === 'F') {
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        this.stageHandlers.onOpenCinema();
        return;
      }
    }

    // M: Toggle audio mute (Shift+M reserved for Multi-Cam)
    if (e.key === 'm' || e.key === 'M') {
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && this.stageHandlers.onToggleMute) {
        e.preventDefault();
        this.stageHandlers.onToggleMute();
        return;
      }
    }
  }

  private handleCinemaKeys(e: KeyboardEvent): void {
    if (!this.cinemaHandlers) return;

    // Space: Play / Pause
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      this.cinemaHandlers.onTogglePlay();
      return;
    }

    // Shift + Left/Right: Frame step (1 frame = 1/24s)
    if (e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      this.cinemaHandlers.onStepFrame(false);
      return;
    }
    if (e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault();
      this.cinemaHandlers.onStepFrame(true);
      return;
    }

    // Left / Right: -10s / +10s skip
    if (e.key === 'ArrowLeft' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.cinemaHandlers.onSkipTime(-10);
      return;
    }
    if (e.key === 'ArrowRight' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      this.cinemaHandlers.onSkipTime(10);
      return;
    }

    // J / K / L Shuttle
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      this.cinemaHandlers.onShuttle('reverse');
      return;
    }
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      this.cinemaHandlers.onShuttle('stop');
      return;
    }
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      this.cinemaHandlers.onShuttle('forward');
      return;
    }

    // M: Mute
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      this.cinemaHandlers.onToggleMute();
      return;
    }

    // F: Container Fullscreen
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      this.cinemaHandlers.onToggleFullscreen();
      return;
    }

    // C: Titles / CC toggle
    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      this.cinemaHandlers.onToggleTitles();
      return;
    }

    // Escape: Close Cinema Player
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cinemaHandlers.onCloseCinema();
      return;
    }
  }

  private handleTrimmerKeys(e: KeyboardEvent): void {
    if (!this.trimmerHandlers) return;

    if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      this.trimmerHandlers.onSetInPoint();
      return;
    }
    if (e.key === 'o' || e.key === 'O') {
      e.preventDefault();
      this.trimmerHandlers.onSetOutPoint();
      return;
    }
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      this.trimmerHandlers.onSplitClip();
      return;
    }
    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault();
      this.trimmerHandlers.onShuttle('reverse');
      return;
    }
    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      this.trimmerHandlers.onShuttle('stop');
      return;
    }
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      this.trimmerHandlers.onShuttle('forward');
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.trimmerHandlers.onStepFrame(false);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.trimmerHandlers.onStepFrame(true);
      return;
    }
  }
}

export const keyScopeManager = new KeyScopeManager();
