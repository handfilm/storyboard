/**
 * @file /src/components/controls/TactileTransport.tsx
 * @description Master Tactical Pill Transport Dock ("Google Flow" Aesthetic) for Optical Cinema Monitor.
 * Features tactile HUD controls, precision frame stepping, mode switching, and smooth timeline scrubber.
 */

import React from 'react';
import { PlaybackMode } from '../../types/editor';
import { clampShotDuration, formatDurationPillValue } from '../../types/storyboard';
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

  return (
    <div className={`w-full bg-[#08080C]/95 backdrop-blur-xl border border-white/10 rounded-[3px] p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech select-none shadow-[0_10px_30px_rgba(0,0,0,0.8)] ${className}`}>
      {/* Left: Transport buttons & Quick Cadence Selector */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onStepFrame?.(false)}
          className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/15 text-white/70 hover:text-white cursor-pointer transition-all active:scale-95"
          title={`Previous Frame (1/${safeFps}s)`}
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onTogglePlay}
          className={`px-3 py-1.5 rounded-[2px] border font-bold flex items-center gap-1.5 tracking-wider transition-all cursor-pointer text-[10px] sm:text-[11px] ${
            isPlaying
              ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#FFE066] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
              : 'border-white/20 bg-white/5 text-white hover:border-[#D4AF37] hover:text-[#FFE066]'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
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
          className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/15 text-white/70 hover:text-white cursor-pointer transition-all active:scale-95"
          title={`Next Frame (1/${safeFps}s)`}
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {onToggleLoop && (
          <button
            onClick={onToggleLoop}
            className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
              isLooping
                ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066]'
                : 'bg-white/5 border-white/15 text-white/50 hover:text-white'
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
        <span className="text-[9px] text-[#D4AF37] font-semibold w-12 text-right">
          {slideTimeSec.toFixed(2)}s
        </span>
        <input
          type="range"
          min="0"
          max={effectiveDuration}
          step={1 / safeFps}
          value={Math.min(effectiveDuration, slideTimeSec)}
          onChange={(e) => onScrubSlideTime?.(Number(e.target.value))}
          className="flex-1 accent-[#D4AF37] cursor-pointer h-1.5 bg-white/20 rounded"
        />
        <span className="text-[9px] text-white/50 min-w-[36px]">
          {formatDurationPillValue(effectiveDuration)}
        </span>
      </div>

      {/* Right: Mode & Extras */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Playback Mode (Solo vs Sequence) */}
        <div className="flex items-center bg-black/80 border border-white/15 rounded-[2px] p-0.5">
          <button
            onClick={() => onSelectPlaybackMode('sequence')}
            className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
              playbackMode === 'sequence'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            SEQ
          </button>
          <button
            onClick={() => onSelectPlaybackMode('solo')}
            className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
              playbackMode === 'solo'
                ? 'bg-[#D4AF37] text-black font-bold'
                : 'text-white/50 hover:text-white'
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
                ? 'bg-white/5 border-white/15 text-white/40 hover:text-white'
                : 'bg-amber-500/20 border-amber-400 text-amber-300'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {onCaptureStill && (
          <button
            onClick={onCaptureStill}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/15 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all"
            title="Capture High-Res Frame PNG"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        )}

        {hasMedia && onPurgeMedia && (
          <button
            onClick={onPurgeMedia}
            className="p-1.5 rounded-[2px] bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 cursor-pointer transition-all"
            title="Purge Active Shot Media"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/15 text-white/70 hover:text-white cursor-pointer transition-all"
            title="Toggle Monitor Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};
