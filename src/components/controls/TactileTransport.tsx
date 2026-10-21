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

import React, { useMemo } from 'react';
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
  Gauge,
  Music,
  Film,
  Sparkles,
  Video
} from 'lucide-react';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { AspectRatioType } from '../../types/project';
import { BeatMarker, audioEngine } from '../../services/audioEngine';

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
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  beatMarkers?: BeatMarker[];
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
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
  className = '',
  onOpenExportTimeline,
  onOpenExportRange,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  beatMarkers,
  onLoadAudioFile,
  detectedBpm
}) => {
  // Active transient markers for the current scrubber domain
  const displayMarkers = useMemo(() => {
    if (beatMarkers && beatMarkers.length > 0) {
      return beatMarkers;
    }
    const analysis = audioEngine.getAnalysis();
    if (!analysis) return [];
    if (playbackMode === 'solo') {
      return audioEngine.getTransientsForSlide(currentIndex, SLIDE_DURATION_SEC);
    } else {
      return analysis.transients;
    }
  }, [beatMarkers, playbackMode, currentIndex]);

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
    <div className={`w-full max-w-5xl px-3.5 py-2.5 bg-[#0a0a10] border border-[#272732] rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.92)] flex flex-col gap-2 font-mono select-none ${className}`}>
      {/* Upper Deck: Scrub Track & Live Monospace SMPTE Timecode */}
      <div className="flex items-center gap-3 w-full">
        {/* Tactical Shot Label Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070709] border border-[#272732] shrink-0 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse" />
          <span className="text-zinc-200">SH{String(currentIndex + 1).padStart(3, '0')}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400">{String(totalSlides).padStart(3, '0')}</span>
          <span className="text-[#fbbf24] ml-1">F{String(currentFrameInSlide).padStart(3, '0')}/288</span>
        </div>

        {/* Dynamic Dual-Mode Scrubber Slider with Subtle Gold Transient Ticks */}
        <div className="flex-1 flex items-center relative py-1">
          {/* Subtle gold tick marks for kick/snare transients */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 pointer-events-none flex items-center z-10 overflow-hidden px-1">
            {displayMarkers.map((marker, idx) => {
              const maxRange = playbackMode === 'solo' ? SLIDE_DURATION_SEC : totalDurationSec;
              const markerTime = playbackMode === 'solo' ? (marker.timeSec % SLIDE_DURATION_SEC) : marker.timeSec;
              if (markerTime < 0 || markerTime > maxRange) return null;
              const pct = (markerTime / maxRange) * 100;
              return (
                <div
                  key={marker.id || idx}
                  style={{ left: `${pct}%` }}
                  className={`absolute top-0 bottom-0 pointer-events-none ${
                    marker.isDownbeat
                      ? 'w-[2px] bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.95)] opacity-95'
                      : 'w-[1px] bg-[#d4af37]/65 opacity-60'
                  }`}
                  title={`${marker.type.toUpperCase()} @ ${markerTime.toFixed(2)}s`}
                />
              );
            })}
          </div>

          <input
            type="range"
            min="0"
            max={playbackMode === 'solo' ? SLIDE_DURATION_SEC : totalDurationSec}
            step="0.041666" // 1 frame @ 24fps
            value={playbackMode === 'solo' ? slideTimeSec : globalSec}
            onChange={(e) => {
              let val = parseFloat(e.target.value);
              if (isSnapToBeat) {
                val = audioEngine.snapTimeToNearestBeat(val, 0.3);
              }
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
            className="w-full h-1.5 bg-[#181822] rounded-full appearance-none cursor-pointer accent-[#eab308] relative z-20"
            aria-label="Timeline scrubber"
          />
        </div>

        {/* Live Monospace Timecode Pill Badges (Stark Permanent Contrast) */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#070709] border border-[#272732] shrink-0 text-[10.5px] font-mono font-bold">
          <span className="text-[#fbbf24] tabular-nums">{slideTc}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500 tabular-nums">00:00:12:00</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 text-[9.5px]">GLOBAL:</span>
          <span className="text-zinc-200 tabular-nums">{globalTc}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500 text-[9.5px] tabular-nums">{totalDurationTc}</span>
        </div>
      </div>

      {/* Lower Deck: Tactical Pill Badges & Permanent Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#272732]">
        {/* Left: Step -1F, PLAY/PAUSE, Step +1F, LOOP, Variable Speed Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Step -1F (1/24s = 41.666ms, J) */}
          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-3 py-1.5 rounded-full bg-[#101018] hover:bg-[#181824] text-zinc-200 border border-[#272732] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Step Back 1 Frame (1/24s, J)"
          >
            <SkipBack className="w-3.5 h-3.5 text-[#eab308]" />
            <span>-1F</span>
          </button>

          {/* Master PLAY / PAUSE Tactical Pill (Gold/Amber Accent, K/L) */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] shadow-md ${
              isPlaying
                ? 'bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#fbbf24] text-black shadow-[0_0_15px_rgba(234,179,8,0.45)]'
                : 'bg-[#181822] hover:bg-[#20202e] text-white border border-[#272732]'
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

          {/* Step +1F (1/24s = 41.666ms, L) */}
          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-3 py-1.5 rounded-full bg-[#101018] hover:bg-[#181824] text-zinc-200 border border-[#272732] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Step Forward 1 Frame (1/24s, L)"
          >
            <SkipForward className="w-3.5 h-3.5 text-[#eab308]" />
            <span>+1F</span>
          </button>

          {/* LOOP Pill */}
          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] border ${
              isLooping
                ? 'bg-[#d4af37]/20 text-[#fbbf24] border-[#d4af37]/60 shadow-[0_0_10px_rgba(234,179,8,0.25)]'
                : 'bg-[#101018] text-zinc-400 border-[#272732] hover:text-white'
            }`}
            title="Toggle Continuous Loop"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>LOOP</span>
          </button>

          {/* Export Range MP4 Option next to main playback controls */}
          {onOpenExportRange && (
            <button
              type="button"
              onClick={onOpenExportRange}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#d4af37]/25 via-[#eab308]/30 to-[#fbbf24]/25 hover:brightness-110 border border-[#d4af37] text-[#fbbf24] hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] shadow-[0_0_12px_rgba(234,179,8,0.25)]"
              title="Export Custom Frame Range to MP4 Video (WebCodecs H.264)"
            >
              <Video className="w-3.5 h-3.5 text-[#eab308]" />
              <span className="hidden sm:inline">EXPORT</span>
              <span>RANGE MP4</span>
            </button>
          )}

          {/* Speed Pills: 0.5x, 1.0x, 1.5x, 2.0x (Pitch-Preserved) */}
          <div className="flex items-center bg-[#070709] p-0.5 rounded-full border border-[#272732]">
            <Gauge className="w-3 h-3 text-zinc-500 ml-2 mr-1" />
            {speedOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangePlaybackSpeed(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors duration-150 ease-out cursor-pointer active:scale-[0.98] ${
                  playbackSpeed === s
                    ? 'bg-[#eab308] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
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
                ? 'bg-[#14141e] text-[#fbbf24] border-[#d4af37]/60'
                : 'bg-[#101018] text-zinc-500 border-[#272732] hover:text-white'
            }`}
            title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#eab308]" />}
          </button>

          {/* Auto-Cut / Snap to Beat Toggle Pill */}
          {onToggleSnapToBeat && (
            <button
              type="button"
              onClick={onToggleSnapToBeat}
              className={`px-2.5 py-1.5 rounded-full text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] border ${
                isSnapToBeat
                  ? 'bg-[#181824] border-[#d4af37] text-[#fbbf24] shadow-[0_0_12px_rgba(234,179,8,0.35)]'
                  : 'bg-[#101018] border-[#272732] text-zinc-500 hover:text-zinc-300'
              }`}
              title="Auto-Cut / Snap to Beat: Lock slide cuts to nearest kick/snare transients"
            >
              <Music className={`w-3.5 h-3.5 ${isSnapToBeat ? 'text-[#eab308]' : 'text-zinc-500'}`} />
              <span className="hidden sm:inline">SNAP BEAT:</span>
              <span>{isSnapToBeat ? 'ON' : 'OFF'}</span>
              {detectedBpm && isSnapToBeat && (
                <span className="text-[9px] text-[#eab308] font-mono hidden md:inline">({detectedBpm} BPM)</span>
              )}
            </button>
          )}

          {/* Audio Ingestion Pill */}
          <label
            className="px-2.5 py-1.5 rounded-full bg-[#101018] hover:bg-[#181824] border border-[#272732] text-zinc-400 hover:text-[#fbbf24] text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Ingest Audio Track for Beat Transient Analysis (MP3, WAV, AAC, OGG)"
          >
            <Music className="w-3 h-3 text-[#eab308]" />
            <span className="hidden xl:inline text-zinc-300">TRACK:</span>
            <span>INGEST</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && onLoadAudioFile) {
                  onLoadAudioFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>

        {/* Center: SEQUENCE (ANIMATIC) vs SOLO SCRUB Mode Segmented Capsule */}
        <div className="flex items-center bg-[#070709] p-0.5 rounded-full border border-[#272732] text-[11px]">
          <button
            type="button"
            onClick={() => onSelectPlaybackMode('sequence')}
            className={`px-3.5 py-1 rounded-full transition-colors duration-150 ease-out cursor-pointer font-bold active:scale-[0.98] ${
              playbackMode === 'sequence'
                ? 'bg-[#eab308] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
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
                ? 'bg-[#eab308] text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Strictly bound to isolated 12.0s boundary of selected shot"
          >
            SOLO SCRUB
          </button>
        </div>

        {/* Right: Aspect Ratio, REC/STILL, Purge, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {onChangeAspectRatio && (
            <div className="flex items-center bg-[#070709] border border-[#272732] rounded-full px-2 py-0.5">
              <span className="text-[9.5px] text-zinc-500 mr-1.5 font-bold">ASPECT</span>
              <select
                value={aspectRatio}
                onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
                className="bg-transparent text-zinc-200 text-[10px] font-mono outline-none cursor-pointer"
              >
                <option value="2.39:1" className="bg-[#0a0a10] text-white">2.39:1 CINEMA</option>
                <option value="16:9" className="bg-[#0a0a10] text-white">16:9 WIDE</option>
                <option value="4:3" className="bg-[#0a0a10] text-white">4:3 ACADEMY</option>
                <option value="1:1" className="bg-[#0a0a10] text-white">1:1 SQUARE</option>
                <option value="9:16" className="bg-[#0a0a10] text-white">9:16 VERTICAL</option>
              </select>
            </div>
          )}

          {/* Export Timeline NLE Modal Trigger Pill */}
          {onOpenExportTimeline && (
            <button
              type="button"
              onClick={onOpenExportTimeline}
              className="px-3 py-1 rounded-full bg-gradient-to-r from-[#181824] to-[#12121a] hover:bg-[#202030] border border-[#d4af37]/70 text-[#fbbf24] hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] shadow-sm"
              title="Export Timeline XML (CapCut Desktop, Adobe Premiere Pro & DaVinci Resolve)"
            >
              <Film className="w-3.5 h-3.5 text-[#eab308]" />
              <span className="hidden sm:inline">EXPORT</span>
              <span>NLE XML</span>
            </button>
          )}

          {/* REC / STILL Capture Pill */}
          {onCaptureStill && (
            <button
              type="button"
              onClick={onCaptureStill}
              className="px-3 py-1 rounded-full bg-[#101018] hover:bg-[#181824] border border-[#272732] text-zinc-200 hover:text-[#fbbf24] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
              title="Capture 4K Cinema Slate Still (S)"
            >
              <Camera className="w-3.5 h-3.5 text-[#eab308]" />
              <span>REC / STILL</span>
            </button>
          )}

          {/* Instant Purge Media Pill (Shift+Delete) */}
          {onPurgeMedia && hasMedia && (
            <button
              type="button"
              onClick={onPurgeMedia}
              className="px-2.5 py-1 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
              title="Purge clip media instantly (Shift+Delete)"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span className="hidden sm:inline">PURGE</span>
            </button>
          )}

          {/* Fullscreen Pill */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-full bg-[#101018] hover:bg-[#181824] text-zinc-400 hover:text-white border border-[#272732] cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
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
