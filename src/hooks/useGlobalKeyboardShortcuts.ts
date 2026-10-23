/**
 * @file /src/hooks/useGlobalKeyboardShortcuts.ts
 * @description Master Global Keyboard Shortcut Handler for RAWx Storyboard Studio.
 * Synchronized with customShortcutsService for user key rebindings.
 * 
 * Supports:
 * - Playback: Space, J/K/L, ,/. frame step
 * - Navigation: ArrowLeft/ArrowRight, Shift+Left/Right
 * - Trimmer: I/O In-Out, Alt+X Clear
 * - System: Shift+E Export, Shift+/ (?) Shortcuts Modal, F Fullscreen, T Titles
 */

import { useEffect } from 'react';
import { PlaybackMode } from '../types/editor';
import { customShortcutsService } from '../services/customShortcutsService';

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
  onToggleScreenRecorder?: () => void;
}

function matchesCombo(e: KeyboardEvent, shortcutId: string, fallback: boolean): boolean {
  try {
    const list = customShortcutsService.getShortcuts();
    const item = list.find((s) => s.id === shortcutId);
    if (!item) return fallback;

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');

    let keyName = e.key.toLowerCase();
    if (keyName === ' ') keyName = 'space';
    else if (keyName === 'arrowleft') keyName = '←';
    else if (keyName === 'arrowright') keyName = '→';
    parts.push(keyName);

    const pressed = parts.join(' + ');
    const target = item.currentKey.toLowerCase().replace(/\s*\+\s*/g, ' + ');

    if (pressed === target) return true;
  } catch {
    // Fall back to default
  }
  return fallback;
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
    onToggleShortcuts,
    onToggleScreenRecorder
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

      // Alt + R: Screen Recorder Toggle
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        onToggleScreenRecorder?.();
        return;
      }

      // Check modifier combinations
      if (matchesCombo(e, 'trim_clear_markers', e.altKey && (e.key === 'x' || e.key === 'X'))) {
        e.preventDefault();
        onClearInOutPoints?.();
        return;
      }

      if (matchesCombo(e, 'export_mp4_range', e.shiftKey && (e.key === 'e' || e.key === 'E'))) {
        e.preventDefault();
        onOpenExportRange?.();
        return;
      }

      // Keyboard Shortcuts Cheat Sheet: '?' or Shift + /
      if (matchesCombo(e, 'shortcuts_cheat_sheet', e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }

      // Space: Toggle Play / Pause
      if (matchesCombo(e, 'playback_toggle', e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        onTogglePlay();
        return;
      }

      // Arrow Keys behavior depends on Playback Mode
      if (matchesCombo(e, 'nav_next_shot', e.key === 'ArrowRight')) {
        e.preventDefault();
        if (playbackMode === 'sequence') {
          onNextSlide();
        } else {
          onStepFrame(true);
        }
        return;
      }

      if (matchesCombo(e, 'nav_prev_shot', e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (playbackMode === 'sequence') {
          onPrevSlide();
        } else {
          onStepFrame(false);
        }
        return;
      }

      // Single frame stepping (, and .)
      if (matchesCombo(e, 'frame_step_backward', e.key === ',')) {
        e.preventDefault();
        onStepFrame(false);
        return;
      }

      if (matchesCombo(e, 'frame_step_forward', e.key === '.')) {
        e.preventDefault();
        onStepFrame(true);
        return;
      }

      // Standard Professional NLE Transport Hotkeys: J / K / L
      if (matchesCombo(e, 'shuttle_rev', e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        onShuttleReverse();
        return;
      }

      if (matchesCombo(e, 'shuttle_stop', e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onShuttleStop();
        return;
      }

      if (matchesCombo(e, 'shuttle_fwd', e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        onShuttleForward();
        return;
      }

      // Sub-Clip In / Out Points: I / O
      if (matchesCombo(e, 'trim_in_point', e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        onSetInPoint();
        return;
      }

      if (matchesCombo(e, 'trim_out_point', e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        onSetOutPoint();
        return;
      }

      // Fullscreen (F)
      if (matchesCombo(e, 'fullscreen_toggle', e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        onToggleFullscreen?.();
        return;
      }

      // Title Overlay Toggle (T)
      if (matchesCombo(e, 'fx_titles_cycle', e.key === 't' || e.key === 'T')) {
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
