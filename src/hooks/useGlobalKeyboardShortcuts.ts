/**
 * @file /src/hooks/useGlobalKeyboardShortcuts.ts
 * @description Master Global Keyboard Shortcut Handler for RAWx Storyboard Studio.
 * 
 * Supports:
 * - Mode A: 'HERO_GLOBAL' Shortcuts:
 *   - Space: Toggle Play / Pause.
 *   - ArrowRight: Jump to Next Slide.
 *   - ArrowLeft: Jump to Previous Slide.
 * - Mode B: 'SOLO_INSPECTOR' Professional NLE Shortcuts:
 *   - J: 2x Reverse Playback Shuttle.
 *   - K: Stop / Pause.
 *   - L: 1x / 2x Forward Playback Shuttle.
 *   - ArrowLeft / ArrowRight: Frame-accurate step ±1 Frame (41.66ms / 1/24s).
 *   - I: Set In-Point marker.
 *   - O: Set Out-Point marker.
 *   - Alt + X: Clear In/Out markers.
 * - Universal Studio Shortcuts:
 *   - F: Toggle Fullscreen.
 *   - Shift + E: Export Custom Frame Range to MP4.
 *   - Shift + / (?): Shortcuts Cheat Sheet.
 */

import { useEffect } from 'react';
import { PlaybackMode } from '../types/editor';

export interface KeyboardShortcutsHandlers {
  playbackMode: PlaybackMode;
  onTogglePlay: () => void;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onStepFrame: (forward: boolean) => void;
  onShuttleReverse: () => void;
  onShuttleStop: () => void;
  onShuttleForward: () => void;
  onSetInPoint: () => void;
  onSetOutPoint: () => void;
  onClearInOutPoints?: () => void;
  onToggleFullscreen?: () => void;
  onOpenExportRange?: () => void;
  onToggleTitles?: () => void;
  onToggleShortcuts?: () => void;
}

export function useGlobalKeyboardShortcuts(handlers: KeyboardShortcutsHandlers) {
  const {
    playbackMode,
    onTogglePlay,
    onNextSlide,
    onPrevSlide,
    onStepFrame,
    onShuttleReverse,
    onShuttleStop,
    onShuttleForward,
    onSetInPoint,
    onSetOutPoint,
    onClearInOutPoints,
    onToggleFullscreen,
    onOpenExportRange,
    onToggleTitles,
    onToggleShortcuts
  } = handlers;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the user is typing in form inputs, textareas or contenteditable fields
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Check modifier combinations
      if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        onClearInOutPoints?.();
        return;
      }

      if (e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        onOpenExportRange?.();
        return;
      }

      // Keyboard Shortcuts Cheat Sheet: '?' or Shift + /
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }

      // Space: Toggle Play / Pause
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
        return;
      }

      // Arrow Keys behavior depends on Playback Mode
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (playbackMode === 'sequence') {
          // Mode A: Jump to Next Slide
          onNextSlide();
        } else {
          // Mode B: Step +1 Frame (41.66ms / 1/24s)
          onStepFrame(true);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (playbackMode === 'sequence') {
          // Mode A: Jump to Previous Slide
          onPrevSlide();
        } else {
          // Mode B: Step -1 Frame (41.66ms / 1/24s)
          onStepFrame(false);
        }
        return;
      }

      // Standard Professional NLE Transport Hotkeys: J / K / L
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        onShuttleReverse();
        return;
      }

      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        onShuttleStop();
        return;
      }

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onShuttleForward();
        return;
      }

      // Sub-Clip In / Out Points: I / O
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        onSetInPoint();
        return;
      }

      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        onSetOutPoint();
        return;
      }

      // Fullscreen (F)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onToggleFullscreen?.();
        return;
      }

      // Title Overlay Toggle (T)
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToggleTitles?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    playbackMode,
    onTogglePlay,
    onNextSlide,
    onPrevSlide,
    onStepFrame,
    onShuttleReverse,
    onShuttleStop,
    onShuttleForward,
    onSetInPoint,
    onSetOutPoint,
    onClearInOutPoints,
    onToggleFullscreen,
    onOpenExportRange,
    onToggleTitles,
    onToggleShortcuts
  ]);
}
