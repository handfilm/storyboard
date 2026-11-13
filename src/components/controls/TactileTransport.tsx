/**
 * @file /src/components/controls/TactileTransport.tsx
 * @description Master Tactical Pill Transport Dock ("Google Flow" Aesthetic) for Optical Cinema Monitor.
 * Features tactile HUD controls, precision frame stepping, mode switching, and smooth timeline scrubber.
 */

import React, { useEffect, useRef } from 'react';
import { PlaybackMode } from '../../types/editor';
import { clampShotDuration, formatDurationPillValue } from '../../types/storyboard';
import { playbackClock } from '../../utils/playbackClock';
import { CadenceSelectorPill } from './CadenceSelectorPill';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Camera,
  Trash2,
  Maximize2,
  Minimize2,
  Repeat
} from 'lucide-react';

export interface TactileTransportProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackMode: PlaybackMode;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onStepFrame?: (fwd: boolean) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  slideTimeSec?: number;
  slideDurationSec?: number;
  targetFps?: number;
  onChangeSlideDuration?: (durationSec: number) => void;
  onChangeTargetFps?: (fps: number) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  currentIndex?: number;
  totalSlides?: number;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  aspectRatio?: string;
  onChangeAspectRatio?: (ratio: any) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onCaptureStill?: () => void;
  onPurgeMedia?: () => void;
  hasMedia?: boolean;
  className?: string;
}

export const TactileTransport: React.FC<TactileTransportProps> = ({
  isPlaying,
  onTogglePlay,
  playbackMode,
  onSelectPlaybackMode,
  isLooping = false,
  onToggleLoop,
  onStepFrame,
  isMuted = true,
  onToggleMute,
  slideTimeSec = 0,
  slideDurationSec = 12.0,
  targetFps = 24,
  onChangeSlideDuration,
  onChangeTargetFps,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onScrubSlideTime,
  isFullscreen = false,
  onToggleFullscreen,
  onCaptureStill,
  onPurgeMedia,
  hasMedia = false,
  className = ''
}) => {
  const effectiveDuration = clampShotDuration(slideDurationSec);
  const safeFps = targetFps === 60 ? 60 : 24;
  const timeLabelDomRef = useRef<HTMLSpanElement | null>(null);
  const rangeDomRef = useRef<HTMLInputElement | null>(null);
  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;

  useEffect(() => {
    return playbackClock.subscribe((snap) => {
      const dur = snap.durationSec > 0 ? snap.durationSec : durationRef.current;
      const clamped = Math.min(dur, Math.max(0, snap.timeSec));
      if (timeLabelDomRef.current) {
        timeLabelDomRef.current.textContent = `${clamped.toFixed(2)}s`;
      }
      if (rangeDomRef.current) {
        rangeDomRef.current.value = String(clamped);
      }
    });
  }, []);

  useEffect(() => {
    const clamped = Math.min(effectiveDuration, Math.max(0, slideTimeSec));
    if (timeLabelDomRef.current) {
      timeLabelDomRef.current.textContent = `${clamped.toFixed(2)}s`;
    }
    if (rangeDomRef.current) {
      rangeDomRef.current.value = String(clamped);
    }
  }, [slideTimeSec, effectiveDuration]);

  return (
    <div className={`w-full bg-[#0B0B0D]/95 backdrop-blur-xl border border-white/[0.07] rounded-[3px] p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech select-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Left: Transport buttons & Quick Cadence Selector */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onStepFrame?.(false)}
          className="p-1.5 rounded-[2px] bg-[#141417] hover:border-[#F59E0B]/60 border border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all active:scale-95"
          title={`Previous Frame (1/${safeFps}s)`}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 rounded-[2px] border font-bold flex items-center gap-1.5 tracking-wider transition-all cursor-pointer text-[10px] sm:text-[11px] ${
            isPlaying
              ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F4F4F5]'
              : 'border-white/[0.07] bg-[#141417] text-[#8E8E93] hover:border-[#F59E0B]/60 hover:text-[#F4F4F5]'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current text-[#F59E0B]" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              <span>PLAY</span>
            </>
          )}
        </button>

        <button
          onClick={() => onStepFrame?.(true)}
          className="p-1.5 rounded-[2px] bg-[#141417] hover:border-[#F59E0B]/60 border border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all active:scale-95"
          title={`Next Frame (1/${safeFps}s)`}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {onToggleLoop && (
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
              isLooping
                ? 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B]'
                : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60'
            }`}
            title="Toggle Shot Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        )}

        {onChangeSlideDuration && (
          <CadenceSelectorPill
            durationSec={effectiveDuration}
            targetFps={safeFps}
            onChangeDuration={onChangeSlideDuration}
            onChangeTargetFps={onChangeTargetFps}
            onApplyDurationToAll={onApplyDurationToAll}
            isSnapToBeat={isSnapToBeat}
            onToggleSnapToBeat={onToggleSnapToBeat}
            compact
          />
        )}
      </div>

      {/* Center: Slide timeline scrubber */}
      <div className="flex-1 min-w-[200px] flex items-center gap-2 px-2 tabular-nums">
        <span ref={timeLabelDomRef} className="text-[9px] text-[#F59E0B] font-semibold w-12 text-right tabular-nums">
          {slideTimeSec.toFixed(2)}s
        </span>
        <input
          ref={rangeDomRef}
          type="range"
          min="0"
          max={effectiveDuration}
          step={1 / safeFps}
          defaultValue={Math.min(effectiveDuration, slideTimeSec)}
          onChange={(e) => onScrubSlideTime?.(Number(e.target.value))}
          className="flex-1 accent-[#F59E0B] cursor-pointer h-1.5 bg-white/15 rounded"
        />
        <span className="text-[9px] text-[#8E8E93] min-w-[36px] tabular-nums">
          {formatDurationPillValue(effectiveDuration)}
        </span>
      </div>

      {/* Right: Mode & Extras */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Playback Mode (Solo vs Sequence) */}
        <div className="flex items-center bg-[#141417] border border-white/[0.07] rounded-[2px] p-0.5">
          <button
            onClick={() => onSelectPlaybackMode('sequence')}
            className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
              playbackMode === 'sequence'
                ? 'bg-[#F59E0B] text-[#0B0B0D] font-bold'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
          >
            SEQ
          </button>
          <button
            onClick={() => onSelectPlaybackMode('solo')}
            className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
              playbackMode === 'solo'
                ? 'bg-[#F59E0B] text-[#0B0B0D] font-bold'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
          >
            SOLO
          </button>
        </div>

        {onToggleMute && (
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
              isMuted
                ? 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60'
                : 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B]'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {onCaptureStill && (
          <button
            onClick={onCaptureStill}
            className="p-1.5 rounded-[2px] bg-[#141417] hover:border-[#F59E0B]/60 border border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all"
            title="Capture High-Res Frame PNG"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {hasMedia && onPurgeMedia && (
          <button
            onClick={onPurgeMedia}
            className="p-1.5 rounded-[2px] bg-[#141417] hover:border-[#F59E0B]/60 border border-white/[0.07] text-[#8E8E93] hover:text-[#F59E0B] cursor-pointer transition-all"
            title="Purge Active Shot Media"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-[2px] bg-[#141417] hover:border-[#F59E0B]/60 border border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all"
            title="Toggle Monitor Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};
