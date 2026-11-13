/**
 * @file /src/utils/playbackClock.ts
 * @description Zero-overhead high-frequency playback clock pub/sub for 60fps UI telemetry
 * (timecodes, scrubbers, A-B loop progress) without triggering root App.tsx React re-renders.
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
}

type ClockListener = (snapshot: PlaybackClockSnapshot) => void;

class PlaybackClockBus {
  private snapshot: PlaybackClockSnapshot = {
    timeSec: 0,
    durationSec: 4,
    bufferedPct: 1,
    shotIndex: 0
  };
  private listeners = new Set<ClockListener>();

  public getSnapshot(): PlaybackClockSnapshot {
    return this.snapshot;
  }

  public emit(partial: Partial<PlaybackClockSnapshot>): void {
    const next: PlaybackClockSnapshot = {
      timeSec: partial.timeSec !== undefined ? partial.timeSec : this.snapshot.timeSec,
      durationSec: partial.durationSec !== undefined ? partial.durationSec : this.snapshot.durationSec,
      bufferedPct: partial.bufferedPct !== undefined ? partial.bufferedPct : this.snapshot.bufferedPct,
      shotIndex: partial.shotIndex !== undefined ? partial.shotIndex : this.snapshot.shotIndex
    };

    const changed =
      Math.abs(next.timeSec - this.snapshot.timeSec) > 0.004 ||
      Math.abs(next.durationSec - this.snapshot.durationSec) > 0.01 ||
      Math.abs(next.bufferedPct - this.snapshot.bufferedPct) > 0.01 ||
      next.shotIndex !== this.snapshot.shotIndex;

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
}

export const playbackClock = new PlaybackClockBus();

/**
 * Subscribe cleanly inside small HUD/scrubber components to get smooth ~30–60fps time
 * updates without forcing parent App/Stage components to re-render.
 */
export function usePlaybackClock(enabled = true): PlaybackClockSnapshot {
  const [state, setState] = useState<PlaybackClockSnapshot>(() => playbackClock.getSnapshot());

  useEffect(() => {
    if (!enabled) return;
    return playbackClock.subscribe(setState);
  }, [enabled]);

  return state;
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
