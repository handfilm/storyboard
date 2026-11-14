/**
 * @file /src/components/mobile/MobileTransportBar.tsx
 * @description Single 40px Mobile Transport Bar positioned directly below the preview canvas:
 * Play/Pause, Timecode (00:00 / 12.0s), Undo, Redo, and Fullscreen.
 */

import React, { useEffect, useRef } from 'react';
import { Play, Pause, Undo2, Redo2, Maximize2, Minimize2 } from 'lucide-react';
import { playbackClock } from '../../utils/playbackClock';

export interface MobileTransportBarProps {
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number;
  canUndo: boolean;
  canRedo: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFullscreen: () => void;
}

function formatShortTimecode(sec: number): string {
  const safe = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const MobileTransportBar: React.FC<MobileTransportBarProps> = ({
  isPlaying,
  currentTimeSec,
  durationSec,
  canUndo,
  canRedo,
  isFullscreen,
  onTogglePlay,
  onUndo,
  onRedo,
  onToggleFullscreen
}) => {
  const timeRef = useRef<HTMLSpanElement | null>(null);
  const durRef = useRef<HTMLSpanElement | null>(null);
  const formattedCurrent = formatShortTimecode(currentTimeSec);
  const formattedDuration = `${Math.max(0.1, durationSec || 12).toFixed(1)}s`;

  useEffect(() => {
    if (!isPlaying) return;
    return playbackClock.subscribe((snap) => {
      if (timeRef.current) {
        timeRef.current.textContent = formatShortTimecode(snap.timeSec);
      }
      if (durRef.current && snap.durationSec > 0) {
        durRef.current.textContent = `${Math.max(0.1, snap.durationSec).toFixed(1)}s`;
      }
    });
  }, [isPlaying]);

  return (
    <div
      data-testid="mobile-transport-bar"
      className="h-[40px] shrink-0 w-full bg-[#0E0E12] border-y border-white/[0.08] px-2 flex items-center justify-between gap-2 select-none"
    >
      {/* Left: Play/Pause + Timecode */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`w-[40px] h-[36px] rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isPlaying
              ? 'bg-[#F59E0B] text-[#0B0B0D]'
              : 'bg-[#18181D] text-[#F4F4F5] active:bg-[#24242C] border border-white/[0.08]'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <div className="px-2 py-1 rounded bg-[#08080A] border border-white/[0.06] font-mono text-[11px] font-bold tabular-nums whitespace-nowrap">
          <span ref={timeRef} className="text-[#F4F4F5]">{formattedCurrent}</span>
          <span className="text-[#71717A] mx-1">/</span>
          <span ref={durRef} className="text-[#A1A1AA]">{formattedDuration}</span>
        </div>
      </div>

      {/* Right: Undo, Redo, Fullscreen */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          className={`w-[38px] h-[36px] rounded-md flex items-center justify-center transition-colors ${
            canUndo
              ? 'text-[#E4E4E7] bg-[#18181D] active:bg-[#24242C] border border-white/[0.08] cursor-pointer'
              : 'text-[#52525B] bg-[#111115] border border-white/[0.04] cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          className={`w-[38px] h-[36px] rounded-md flex items-center justify-center transition-colors ${
            canRedo
              ? 'text-[#E4E4E7] bg-[#18181D] active:bg-[#24242C] border border-white/[0.08] cursor-pointer'
              : 'text-[#52525B] bg-[#111115] border border-white/[0.04] cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="w-[38px] h-[36px] rounded-md flex items-center justify-center text-[#E4E4E7] bg-[#18181D] active:bg-[#24242C] border border-white/[0.08] transition-colors cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-[#F59E0B]" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
