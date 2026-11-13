/**
 * @file /src/utils/playbackClock.ts
 * @description Zero-overhead 60 FPS direct-DOM playback clock pub/sub + sub-millisecond
 * `video.fastSeek()` synchronization utilities. Eliminates React `useState` lifecycle
 * re-renders during continuous playback and high-speed timeline scrubbing.
 */

import { useEffect, useState } from 'react';

export type VlcLoopMode = 'repeat-one' | 'sequence' | 'once';

export interface VlcAbLoop {
  a: number | null;
  b: number | null;
}

export interface PlaybackClockSnapshot {
  timeSec: number;
  durationSec: number;
  bufferedPct: number;
  shotIndex: number;
  fps: number;
  shotStartSec: number;
}

export type ClockListener = (snapshot: PlaybackClockSnapshot) => void;

export interface FastSeekableVideo {
  currentTime: number;
  duration: number;
  paused?: boolean;
  seeking?: boolean;
  readyState?: number;
  fastSeek?: (time: number) => void;
}

/**
 * Directly synchronizes an HTMLMediaElement's currentTime to `targetSec` using `video.fastSeek()`
 * when available for sub-millisecond scrub precision, with safe `.currentTime` fallback.
 *
 * Pure Native Clock Rule: When `video.paused === false` (actively playing), seeking inside rAF
 * or effect ticks is strictly forbidden unless `allowWhilePlaying` is explicitly true.
 */
export function syncVideoCurrentTimeWithFastSeek(
  video: FastSeekableVideo | null | undefined,
  targetSec: number,
  driftThresholdSec: number = 0.0005,
  allowWhilePlaying: boolean = false
): boolean {
  if (!video) return false;
  if (video.paused === false && !allowWhilePlaying) return false;
  if (video.seeking) return false;

  const rawTarget = Number.isFinite(targetSec) ? Math.max(0, targetSec) : 0;
  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const safeTarget = dur > 0.01 ? Math.min(dur - 0.005, rawTarget) : rawTarget;

  const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  if (Math.abs(current - safeTarget) <= driftThresholdSec) {
    return false;
  }

  if (typeof video.fastSeek === 'function') {
    try {
      video.fastSeek(safeTarget);
      return true;
    } catch {
      // Fallback to direct currentTime assignment below
    }
  }

  try {
    video.currentTime = safeTarget;
    return true;
  } catch {
    return false;
  }
}

export function formatSmpteTimecode(seconds: number, fps: number = 24): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const safeFps = Math.max(1, Math.round(fps || 24));
  const totalFrames = Math.floor(safe * safeFps);
  const ff = totalFrames % safeFps;
  const ss = Math.floor(safe) % 60;
  const mm = Math.floor(safe / 60) % 60;
  const hh = Math.floor(safe / 3600);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

export function formatVlcTimecode(seconds: number, showMillis = false): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 100);

  const base =
    hrs > 0
      ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return showMillis ? `${base}.${String(ms).padStart(2, '0')}` : base;
}

export function isVideoMediaUrl(url?: string | null, explicitIsVideo?: boolean, mimeType?: string): boolean {
  if (explicitIsVideo) return true;
  if (mimeType && mimeType.toLowerCase().startsWith('video/')) return true;
  if (!url) return false;
  return (
    url.startsWith('data:video') ||
    /#video\b/i.test(url) ||
    /\.(mp4|webm|mov|ogg|m4v|mkv|avi)($|\?)/i.test(url)
  );
}

export class PlaybackClockBus {
  private snapshot: PlaybackClockSnapshot = {
    timeSec: 0,
    durationSec: 4,
    bufferedPct: 1,
    shotIndex: 0,
    fps: 24,
    shotStartSec: 0
  };
  private listeners = new Set<ClockListener>();

  public getSnapshot(): PlaybackClockSnapshot {
    return this.snapshot;
  }

  public getTimeSec(): number {
    return this.snapshot.timeSec;
  }

  public emit(partial: Partial<PlaybackClockSnapshot>): void {
    const next: PlaybackClockSnapshot = {
      timeSec: partial.timeSec !== undefined ? partial.timeSec : this.snapshot.timeSec,
      durationSec: partial.durationSec !== undefined ? partial.durationSec : this.snapshot.durationSec,
      bufferedPct: partial.bufferedPct !== undefined ? partial.bufferedPct : this.snapshot.bufferedPct,
      shotIndex: partial.shotIndex !== undefined ? partial.shotIndex : this.snapshot.shotIndex,
      fps: partial.fps !== undefined ? partial.fps : this.snapshot.fps,
      shotStartSec: partial.shotStartSec !== undefined ? partial.shotStartSec : this.snapshot.shotStartSec
    };

    const changed =
      Math.abs(next.timeSec - this.snapshot.timeSec) > 0.0004 ||
      Math.abs(next.durationSec - this.snapshot.durationSec) > 0.005 ||
      Math.abs(next.bufferedPct - this.snapshot.bufferedPct) > 0.005 ||
      next.shotIndex !== this.snapshot.shotIndex ||
      next.fps !== this.snapshot.fps ||
      Math.abs(next.shotStartSec - this.snapshot.shotStartSec) > 0.005;

    if (!changed) return;
    this.snapshot = next;
    this.listeners.forEach((listener) => {
      try {
        listener(next);
      } catch {
        // isolate subscriber errors
      }
    });
  }

  public subscribe(listener: ClockListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Direct-DOM subscription helper: updates a DOM element's textContent or style at 60 FPS
   * completely bypassing React component state updates.
   */
  public bindDomElement(
    el: HTMLElement | null,
    updater: (el: HTMLElement, snap: PlaybackClockSnapshot) => void
  ): () => void {
    if (!el) return () => {};
    return this.subscribe((snap) => updater(el, snap));
  }
}

/** Master global Stage / Player 60 FPS clock bus */
export const playbackClock = new PlaybackClockBus();

/** Dedicated Multi-Track NLE CutStudio 60 FPS clock bus */
export const cutClock = new PlaybackClockBus();

/**
 * Legacy coarse React hook kept only for low-frequency / modal consumers.
 * 60 FPS HUD components should bind direct DOM refs via `playbackClock.subscribe(...)`.
 */
export function usePlaybackClock(enabled = true): PlaybackClockSnapshot {
  const [state, setState] = useState<PlaybackClockSnapshot>(() => playbackClock.getSnapshot());

  useEffect(() => {
    if (!enabled) return;
    return playbackClock.subscribe(setState);
  }, [enabled]);

  return state;
}
