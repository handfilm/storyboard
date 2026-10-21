/**
 * @file /src/components/controls/TactileTransport.tsx
 * @description Master "Google Flow" Tactical Transport Controller for RAWx Storyboard Studio.
 * 
 * Design Directives:
 * - Re-skin every control into tactical pill badges: rounded capsules (`rounded-full`),
 *   deep obsidian containers (`#0E0E12` with subtle `#1C1C24` 1px borders), and vivid warm-amber/gold active accents (`#F5A623`, `#D97706`).
 * - Permanent Visibility & Zero Distraction:
 *   `PLAY`, `PAUSE`, `STEP -1F`, `STEP +1F`, `LOOP`, `ANIMATIC`, `SOLO SCRUB`, `REC` remain permanently visible with stark contrast.
 * - Zero hover clutter: No transient tooltip popovers, no card lift/scale (`hover:scale-*`).
 * - Micro-interactions: GPU-accelerated micro-transitions (`transition-colors duration-150 ease-out`, `active:scale-[0.98]`).
 * - Professional NLE grade: Sub-frame precision, variable speed controls (0.5x, 1.0x, 1.5x, 2.0x),
 *   1/24s frame nudge, pitch preservation, and instant media purge capability.
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Camera, 
  Trash2,
  Gauge
} from 'lucide-react';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { AspectRatioType } from '../../types/project';

export interface TactileTransportProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackMode: PlaybackMode;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  onStepFrame: (forward: boolean) => void;
  playbackSpeed: number; // 0.5, 1.0, 1.5, 2.0
  onChangePlaybackSpeed: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  slideTimeSec: number;
  currentIndex: number;
  totalSlides: number;
  onScrubSlideTime: (timeSec: number) => void;
  onScrubGlobalTime?: (globalSec: number) => void;
  aspectRatio?: AspectRatioType;
  onChangeAspectRatio?: (aspect: AspectRatioType) => void;
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
  isLooping,
  onToggleLoop,
  onStepFrame,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  isMuted,
  onToggleMute,
  slideTimeSec,
  currentIndex,
  totalSlides,
  onScrubSlideTime,
  onScrubGlobalTime,
  aspectRatio = '2.39:1',
  onChangeAspectRatio,
  isFullscreen = false,
  onToggleFullscreen,
  onCaptureStill,
  onPurgeMedia,
  hasMedia = false,
  className = ''
}) => {
  // Format SMPTE Timecode @ 24fps
  const formatTimecode = (sec: number) => {
    const totalFrames = Math.max(0, Math.floor(sec * 24));
    const ff = String(totalFrames % 24).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const slideTc = formatTimecode(slideTimeSec);
  const globalSec = (currentIndex * SLIDE_DURATION_SEC) + slideTimeSec;
  const globalTc = formatTimecode(globalSec);
  const totalDurationSec = Math.max(1, totalSlides) * SLIDE_DURATION_SEC;
  const totalDurationTc = formatTimecode(totalDurationSec);
  const currentFrameInSlide = Math.min(SLIDE_TOTAL_FRAMES_24FPS, Math.max(1, Math.floor(slideTimeSec * 24) + 1));

  const speedOptions = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className={`w-full max-w-5xl px-3.5 py-2.5 bg-[#0E0E12] border border-[#1C1C24] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col gap-2 font-mono select-none ${className}`}>
      {/* Upper Deck: Scrub Track & Live Monospace SMPTE Timecode */}
      <div className="flex items-center gap-3 w-full">
        {/* Tactical Shot Label Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#14141B] border border-[#23232E] shrink-0 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
          <span className="text-[#EDEDED]">SH{String(currentIndex + 1).padStart(3, '0')}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/50">{String(totalSlides).padStart(3, '0')}</span>
          <span className="text-[#F5A623] ml-1">F{String(currentFrameInSlide).padStart(3, '0')}/288</span>
        </div>

        {/* Dynamic Dual-Mode Scrubber Slider */}
        <div className="flex-1 flex items-center relative py-1">
          <input
            type="range"
            min="0"
            max={playbackMode === 'solo' ? SLIDE_DURATION_SEC : totalDurationSec}
            step="0.041666" // 1 frame @ 24fps
            value={playbackMode === 'solo' ? slideTimeSec : globalSec}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (playbackMode === 'solo') {
                onScrubSlideTime(val);
              } else {
                if (onScrubGlobalTime) {
                  onScrubGlobalTime(val);
                } else {
                  onScrubSlideTime(val % SLIDE_DURATION_SEC);
                }
              }
            }}
            className="w-full h-1.5 bg-[#1C1C26] rounded-full appearance-none cursor-pointer accent-[#F5A623]"
            aria-label="Timeline scrubber"
          />
        </div>

        {/* Live Monospace Timecode Pill Badges (Stark Permanent Contrast) */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#14141B] border border-[#23232E] shrink-0 text-[10.5px] font-mono font-bold">
          <span className="text-[#F5A623]">{slideTc}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40">00:00:12:00</span>
          <span className="text-white/20">|</span>
          <span className="text-white/40 text-[9.5px]">GLOBAL:</span>
          <span className="text-[#EDEDED]">{globalTc}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40 text-[9.5px]">{totalDurationTc}</span>
        </div>
      </div>

      {/* Lower Deck: Tactical Pill Badges & Permanent Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1C1C24]">
        {/* Left: Step -1F, PLAY/PAUSE, Step +1F, LOOP, Variable Speed Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Step -1F (1/24s = 41.666ms) */}
          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-3 py-1.5 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Step Back 1 Frame (1/24s, J)"
          >
            <SkipBack className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>-1F</span>
          </button>

          {/* Master PLAY / PAUSE Tactical Pill (Gold/Amber Accent) */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] shadow-md ${
              isPlaying
                ? 'bg-[#F5A623] hover:bg-[#D97706] text-black shadow-[0_0_15px_rgba(245,166,35,0.4)]'
                : 'bg-[#1C1C26] hover:bg-[#262635] text-[#FFFFFF] border border-[#303042]'
            }`}
            title={isPlaying ? "Pause Playback (Space / K)" : "Start Playback (Space / L)"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Step +1F (1/24s = 41.666ms) */}
          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-3 py-1.5 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Step Forward 1 Frame (1/24s, L)"
          >
            <SkipForward className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>+1F</span>
          </button>

          {/* LOOP Pill */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] border ${
              isLooping
                ? 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/60 shadow-[0_0_10px_rgba(245,166,35,0.2)]'
                : 'bg-[#16161F] text-white/50 border-[#242432] hover:text-white'
            }`}
            title="Toggle Continuous Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>LOOP</span>
          </button>

          {/* Speed Pills: 0.5x, 1.0x, 1.5x, 2.0x (Pitch-Preserved) */}
          <div className="flex items-center bg-[#12121A] p-0.5 rounded-full border border-[#22222E]">
            <Gauge className="w-3 h-3 text-white/30 ml-2 mr-1" />
            {speedOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangePlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                  playbackSpeed === s
                    ? 'bg-[#F5A623] text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
                title={`Playback Speed ${s}x (Pitch Preserved)`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Audio Mute / Unmute Pill */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-1.5 rounded-full border cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] ${
              !isMuted
                ? 'bg-[#1C1C28] text-[#F5A623] border-[#F5A623]/60'
                : 'bg-[#16161F] text-white/40 border-[#242432] hover:text-white'
            }`}
            title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Center: SEQUENCE (ANIMATIC) vs SOLO SCRUB Mode Segmented Capsule */}
        <div className="flex items-center bg-[#12121A] p-0.5 rounded-full border border-[#22222E] text-[11px]">
          <button
            type="button"
            onClick={() => onSelectPlaybackMode('sequence')}
            className={`px-3.5 py-1 rounded-full transition-colors duration-150 ease-out cursor-pointer font-bold active:scale-[0.98] ${
              playbackMode === 'sequence'
                ? 'bg-[#F5A623] text-black shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
            title="Auto-advance across Slide 001-100 every 12.0s with 0ms pre-buffering"
          >
            ANIMATIC
          </button>
          <button
            type="button"
            onClick={() => onSelectPlaybackMode('solo')}
            className={`px-3.5 py-1 rounded-full transition-colors duration-150 ease-out cursor-pointer font-bold active:scale-[0.98] ${
              playbackMode === 'solo'
                ? 'bg-[#F5A623] text-black shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
            title="Strictly bound to isolated 12.0s boundary of selected shot"
          >
            SOLO SCRUB
          </button>
        </div>

        {/* Right: Aspect Ratio, REC/STILL, Purge, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onChangeAspectRatio && (
            <div className="flex items-center bg-[#14141B] border border-[#23232E] rounded-full px-2 py-0.5">
              <span className="text-[9.5px] text-white/40 mr-1.5 font-bold">ASPECT</span>
              <select
                value={aspectRatio}
                onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
                className="bg-transparent text-[#EDEDED] text-[10px] font-mono outline-none cursor-pointer"
              >
                <option value="2.39:1" className="bg-[#12121A] text-white">2.39:1 CINEMA</option>
                <option value="16:9" className="bg-[#12121A] text-white">16:9 WIDE</option>
                <option value="4:3" className="bg-[#12121A] text-white">4:3 ACADEMY</option>
                <option value="1:1" className="bg-[#12121A] text-white">1:1 SQUARE</option>
                <option value="9:16" className="bg-[#12121A] text-white">9:16 VERTICAL</option>
              </select>
            </div>
          )}

          {/* REC / STILL Capture Pill */}
          {onCaptureStill && (
            <button
              type="button"
              onClick={onCaptureStill}
              className="px-3 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] border border-[#242432] text-[#EDEDED] hover:text-[#F5A623] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
              title="Capture 4K Cinema Slate Still (S)"
            >
              <Camera className="w-3.5 h-3.5 text-[#F5A623]" />
              <span>REC / STILL</span>
            </button>
          )}

          {/* Instant Purge Media Pill (Shift+Delete) */}
          {onPurgeMedia && hasMedia && (
            <button
              type="button"
              onClick={onPurgeMedia}
              className="px-2.5 py-1 rounded-full bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
              title="Purge clip media instantly (Shift+Delete)"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline">PURGE</span>
            </button>
          )}

          {/* Fullscreen Pill */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-full bg-[#16161F] hover:bg-[#20202C] text-white/70 hover:text-white border border-[#242432] cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
