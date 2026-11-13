/**
 * @file /src/components/stage/VlcStageBar.tsx
 * @description Sleek VLC-style Transport Scrubber & Playback Control Bar for TactileStage.
 * Subscribes to playbackClock for 60fps timecode/scrubber updates without re-rendering App.
 */

import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Repeat,
  Repeat1,
  ArrowRightToLine,
  Maximize2,
  Minimize2,
  Camera,
  ListVideo,
  Subtitles,
  Upload,
  Monitor,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import {
  usePlaybackClock,
  formatVlcTimecode,
  type VlcLoopMode,
  type VlcAbLoop
} from '../../utils/playbackClock';
import { AnthologyFrame } from '../../types/anthology';
import type { ShotMediaMap } from '../../services/handfilmMediaVault';
import { resolveShotMediaEntry } from '../../services/handfilmMediaVault';

export interface VlcStageBarProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  shotMediaMap: ShotMediaMap;
  durationSec: number;
  fps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isMuted: boolean;
  volume: number; // 0.0 - 2.0 (VLC 200% preamp)
  loopMode: VlcLoopMode;
  abLoop: VlcAbLoop;
  fitMode: 'contain' | 'cover' | 'fill';
  aspectRatio: string;
  isTitlesActive: boolean;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onPrevShot: () => void;
  onNextShot: () => void;
  onSelectShot: (idx: number) => void;
  onStepFrame: (forward: boolean) => void;
  onSkipSeconds: (deltaSec: number) => void;
  onScrubStart: () => void;
  onScrubTo: (timeSec: number, exact?: boolean) => void;
  onScrubEnd: (finalTimeSec: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onCycleLoopMode: () => void;
  onSetAbPoint: (which: 'a' | 'b' | 'clear') => void;
  onChangeFitMode: (mode: 'contain' | 'cover' | 'fill') => void;
  onChangeAspectRatio: (ratio: string) => void;
  onCaptureSnapshot: () => void;
  onToggleTitles?: () => void;
  onUploadMedia?: () => void;
  onOpenCinemaPlayer?: () => void;
  onToggleFullscreen: () => void;
}

const VLC_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];
const VLC_ASPECT_OPTIONS = ['2.39:1', '16:9', '4:3', '1:1', '9:16'];

export const VlcStageBar: React.FC<VlcStageBarProps> = ({
  frames,
  currentIndex,
  shotMediaMap,
  durationSec,
  fps,
  isPlaying,
  playbackSpeed,
  isMuted,
  volume,
  loopMode,
  abLoop,
  fitMode,
  aspectRatio,
  isTitlesActive,
  isFullscreen,
  onTogglePlay,
  onStop,
  onPrevShot,
  onNextShot,
  onSelectShot,
  onStepFrame,
  onSkipSeconds,
  onScrubStart,
  onScrubTo,
  onScrubEnd,
  onChangeSpeed,
  onToggleMute,
  onChangeVolume,
  onCycleLoopMode,
  onSetAbPoint,
  onChangeFitMode,
  onChangeAspectRatio,
  onCaptureSnapshot,
  onToggleTitles,
  onUploadMedia,
  onOpenCinemaPlayer,
  onToggleFullscreen
}) => {
  const clock = usePlaybackClock(true);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [showRemaining, setShowRemaining] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isAspectOpen, setIsAspectOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  const safeDuration = Math.max(0.1, clock.durationSec > 0 ? clock.durationSec : durationSec);
  const safeTime = Math.max(0, Math.min(safeDuration, clock.timeSec));
  const progressPct = Math.min(100, Math.max(0, (safeTime / safeDuration) * 100));
  const bufferPct = Math.min(100, Math.max(progressPct, clock.bufferedPct * 100));

  const computeTimeFromPointer = (clientX: number): { sec: number; pct: number } => {
    const rect = scrubberRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return { sec: 0, pct: 0 };
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return { sec: ratio * safeDuration, pct: ratio * 100 };
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = true;
    onScrubStart();
    const { sec } = computeTimeFromPointer(e.clientX);
    onScrubTo(sec, false);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { sec, pct } = computeTimeFromPointer(e.clientX);
    setHoverTime(sec);
    setHoverPct(pct);
    if (isDraggingRef.current) {
      onScrubTo(sec, false);
    }
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    isDraggingRef.current = false;
    const { sec } = computeTimeFromPointer(e.clientX);
    onScrubEnd(sec);
  };

  const volumePct = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <div
      data-interactive="true"
      data-testid="vlc-stage-bar"
      onClick={(e) => e.stopPropagation()}
      className="relative w-full bg-[#090A0F]/95 border-t border-white/10 px-3 py-1.5 select-none shrink-0 z-30"
    >
      {/* Playlist Queue Drawer Popover */}
      {isPlaylistOpen && (
        <div
          data-interactive="true"
          className="absolute bottom-full right-3 mb-2 w-80 max-h-72 bg-[#0B0C12]/98 backdrop-blur-xl border border-[#2A2F3D] rounded-lg shadow-2xl flex flex-col overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#10121A]">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-amber-400">
              <ListVideo className="w-3.5 h-3.5" />
              <span>PLAYLIST QUEUE ({frames.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaylistOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
              aria-label="Close playlist"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-y-auto divide-y divide-white/5 max-h-60">
            {frames.map((item, idx) => {
              const media = resolveShotMediaEntry(shotMediaMap, item, undefined, idx);
              const isActive = idx === currentIndex;
              const hasRealMedia = Boolean(media?.url || (item.imageUrl && !item.imageUrl.startsWith('data:image/svg')));
              return (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectShot(idx);
                    setIsPlaylistOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between gap-2 text-[11px] font-mono transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 font-bold'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-white/40 tabular-nums shrink-0 w-6">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{item.title || `Shot ${idx + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[9.5px]">
                    {hasRealMedia && (
                      <span className="px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {media?.type === 'video' || item.isVideo ? 'VID' : 'IMG'}
                      </span>
                    )}
                    <span className="text-white/40 tabular-nums">
                      {(item.durationSec || item.slideHoldSec || 4).toFixed(1)}s
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 1: Full-Width Seek Scrubber with A-B Loop Highlight + Hover Preview */}
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-[10.5px] font-mono font-semibold text-white/85 tabular-nums w-14 shrink-0">
          {formatVlcTimecode(safeTime, safeDuration < 60)}
        </span>

        <div
          ref={scrubberRef}
          onPointerDown={handleScrubPointerDown}
          onPointerMove={handleScrubPointerMove}
          onPointerUp={handleScrubPointerUp}
          onPointerCancel={handleScrubPointerUp}
          onPointerLeave={() => setHoverTime(null)}
          className="relative flex-1 h-4 flex items-center cursor-pointer group touch-none"
        >
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPct}%` }}
              className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/95 border border-amber-400/70 text-[10px] font-mono font-bold text-amber-300 tabular-nums pointer-events-none whitespace-nowrap shadow-lg z-40"
            >
              {formatVlcTimecode(hoverTime, true)}
            </div>
          )}

          {/* Track groove */}
          <div className="w-full h-1.5 group-hover:h-2 bg-white/15 rounded-full overflow-hidden relative transition-all">
            {/* Buffered */}
            <div
              style={{ width: `${bufferPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-white/20"
            />
            {/* A-B Loop Span Highlight */}
            {abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a && (
              <div
                style={{
                  left: `${(abLoop.a / safeDuration) * 100}%`,
                  width: `${((abLoop.b - abLoop.a) / safeDuration) * 100}%`
                }}
                className="absolute top-0 bottom-0 bg-cyan-400/50"
              />
            )}
            {/* Playhead Fill */}
            <div
              style={{ width: `${progressPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#F5A623] to-[#FFE066]"
            />
          </div>

          {/* A / B Marker Pins */}
          {abLoop.a !== null && (
            <div
              style={{ left: `${Math.min(100, (abLoop.a / safeDuration) * 100)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 pointer-events-none"
              title={`Loop A: ${formatVlcTimecode(abLoop.a, true)}`}
            />
          )}
          {abLoop.b !== null && (
            <div
              style={{ left: `${Math.min(100, (abLoop.b / safeDuration) * 100)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 pointer-events-none"
              title={`Loop B: ${formatVlcTimecode(abLoop.b, true)}`}
            />
          )}

          {/* Scrub Handle */}
          <div
            style={{ left: `${progressPct}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FFE066] border border-black shadow-[0_0_8px_rgba(245,166,35,0.85)] opacity-80 group-hover:opacity-100 scale-90 group-hover:scale-110 transition-transform pointer-events-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowRemaining((r) => !r)}
          className="text-[10.5px] font-mono font-semibold text-white/65 hover:text-amber-300 tabular-nums w-16 text-right shrink-0 cursor-pointer"
          title="Click to toggle remaining time"
        >
          {showRemaining
            ? `-${formatVlcTimecode(Math.max(0, safeDuration - safeTime), safeDuration < 60)}`
            : formatVlcTimecode(safeDuration, safeDuration < 60)}
        </button>
      </div>

      {/* Row 2: VLC Transport Controls + Preamp + Fit/Aspect/A-B/Playlist */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Left: Core VLC Transport */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-7 h-7 rounded bg-[#F5A623] hover:bg-[#FFE066] text-black flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="w-7 h-7 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Stop (Reset to 00:00)"
            aria-label="Stop"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={onPrevShot}
            className="w-7 h-7 rounded hover:bg-white/10 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Shot"
            aria-label="Previous Shot"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSkipSeconds(-5)}
            className="px-1.5 h-7 rounded hover:bg-white/10 text-white/75 hover:text-white flex items-center gap-0.5 text-[10px] font-mono cursor-pointer whitespace-nowrap"
            title="Skip Back 5s"
          >
            <RotateCcw className="w-3 h-3" />
            <span>5s</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-1 h-7 rounded hover:bg-white/10 text-white/70 hover:text-amber-300 flex items-center text-[10px] font-mono cursor-pointer whitespace-nowrap"
            title="Step Back 1 Frame (,)"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>1F</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-1 h-7 rounded hover:bg-white/10 text-white/70 hover:text-amber-300 flex items-center text-[10px] font-mono cursor-pointer whitespace-nowrap"
            title="Step Forward 1 Frame (.)"
          >
            <span>1F</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => onSkipSeconds(5)}
            className="px-1.5 h-7 rounded hover:bg-white/10 text-white/75 hover:text-white flex items-center gap-0.5 text-[10px] font-mono cursor-pointer whitespace-nowrap"
            title="Skip Forward 5s"
          >
            <span>5s</span>
            <RotateCw className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onNextShot}
            className="w-7 h-7 rounded hover:bg-white/10 text-white/75 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Next Shot"
            aria-label="Next Shot"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* VLC Volume + 200% Preamp */}
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/10">
            <button
              type="button"
              onClick={onToggleMute}
              className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume <= 0.01 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : volume < 0.6 ? (
                <Volume1 className="w-3.5 h-3.5 text-white/85" />
              ) : (
                <Volume2 className={`w-3.5 h-3.5 ${volume > 1.05 ? 'text-amber-400' : 'text-white/90'}`} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              aria-label="VLC Volume and 200% Preamp"
              className="w-16 sm:w-20 h-1 accent-[#F5A623] cursor-pointer"
            />
            <span
              className={`text-[10px] font-mono tabular-nums w-9 shrink-0 ${
                volumePct > 100 && !isMuted ? 'text-amber-400 font-bold' : 'text-white/55'
              }`}
            >
              {volumePct}%
            </span>
          </div>
        </div>

        {/* Right: A-B Loop, Loop Mode, Speed, Fit Mode, Aspect, Snapshot, Playlist, Fullscreen */}
        <div className="flex items-center gap-1 shrink-0 text-[10px] font-mono">
          {/* A-B Loop Controls */}
          <div className="hidden md:flex items-center rounded border border-white/10 bg-black/50 overflow-hidden">
            <button
              type="button"
              onClick={() => onSetAbPoint('a')}
              className={`px-1.5 py-1 cursor-pointer transition-colors whitespace-nowrap ${
                abLoop.a !== null ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-white/60 hover:text-white'
              }`}
              title="Set Loop Start Point A"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onSetAbPoint('b')}
              className={`px-1.5 py-1 border-l border-white/10 cursor-pointer transition-colors whitespace-nowrap ${
                abLoop.b !== null ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-white/60 hover:text-white'
              }`}
              title="Set Loop End Point B"
            >
              B
            </button>
            {(abLoop.a !== null || abLoop.b !== null) && (
              <button
                type="button"
                onClick={() => onSetAbPoint('clear')}
                className="px-1 py-1 border-l border-white/10 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                title="Clear A-B Loop"
              >
                ×
              </button>
            )}
          </div>

          {/* Loop Mode Switcher */}
          <button
            type="button"
            onClick={onCycleLoopMode}
            className={`px-2 h-7 rounded border flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              loopMode === 'repeat-one'
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                : loopMode === 'sequence'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-white/10 bg-white/5 text-white/65 hover:text-white'
            }`}
            title="Cycle Loop Mode: Repeat Shot / Sequence / Play Once"
          >
            {loopMode === 'repeat-one' ? (
              <>
                <Repeat1 className="w-3 h-3" />
                <span className="hidden lg:inline">LOOP 1</span>
              </>
            ) : loopMode === 'sequence' ? (
              <>
                <Repeat className="w-3 h-3" />
                <span className="hidden lg:inline">SEQ</span>
              </>
            ) : (
              <>
                <ArrowRightToLine className="w-3 h-3" />
                <span className="hidden lg:inline">ONCE</span>
              </>
            )}
          </button>

          {/* Speed Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSpeedOpen((o) => !o);
                setIsAspectOpen(false);
              }}
              className="px-2 h-7 rounded border border-white/10 bg-white/5 hover:border-amber-400/50 text-amber-300 font-bold tabular-nums cursor-pointer whitespace-nowrap"
              title="Playback Speed (0.25x - 4x)"
            >
              {playbackSpeed}x
            </button>
            {isSpeedOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 py-1 bg-[#0D0F16] border border-[#2B3140] rounded-md shadow-2xl min-w-[72px] z-50 flex flex-col">
                {VLC_SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      onChangeSpeed(spd);
                      setIsSpeedOpen(false);
                    }}
                    className={`px-3 py-1 text-left hover:bg-white/10 cursor-pointer tabular-nums ${
                      Math.abs(playbackSpeed - spd) < 0.01 ? 'text-amber-400 font-bold' : 'text-white/75'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Video Fit Mode (Contain / Cover / Fill) */}
          <button
            type="button"
            onClick={() => {
              const order: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];
              const next = order[(order.indexOf(fitMode) + 1) % order.length];
              onChangeFitMode(next);
            }}
            className="hidden sm:flex px-2 h-7 rounded border border-white/10 bg-white/5 hover:border-white/30 text-white/80 hover:text-white items-center gap-1 cursor-pointer uppercase whitespace-nowrap"
            title={`Fit Mode: ${fitMode} (Click to cycle)`}
          >
            <Monitor className="w-3 h-3 text-cyan-300" />
            <span className="hidden xl:inline">{fitMode}</span>
          </button>

          {/* Aspect Ratio Menu */}
          <div className="relative hidden sm:block">
            <button
              type="button"
              onClick={() => {
                setIsAspectOpen((o) => !o);
                setIsSpeedOpen(false);
              }}
              className="px-2 h-7 rounded border border-white/10 bg-white/5 hover:border-white/30 text-white/80 hover:text-white cursor-pointer whitespace-nowrap"
              title="Aspect Ratio Override"
            >
              {aspectRatio}
            </button>
            {isAspectOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 py-1 bg-[#0D0F16] border border-[#2B3140] rounded-md shadow-2xl min-w-[82px] z-50 flex flex-col">
                {VLC_ASPECT_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onChangeAspectRatio(r);
                      setIsAspectOpen(false);
                    }}
                    className={`px-3 py-1 text-left hover:bg-white/10 cursor-pointer ${
                      aspectRatio === r ? 'text-amber-400 font-bold' : 'text-white/75'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Snapshot PNG */}
          <button
            type="button"
            onClick={onCaptureSnapshot}
            className="w-7 h-7 rounded border border-white/10 bg-white/5 hover:bg-white/15 text-white/75 hover:text-amber-300 flex items-center justify-center cursor-pointer"
            title="Take Snapshot PNG (Current Frame)"
            aria-label="Take Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Upload/Open File */}
          {onUploadMedia && (
            <button
              type="button"
              onClick={onUploadMedia}
              className="w-7 h-7 rounded border border-white/10 bg-white/5 hover:bg-white/15 text-white/75 hover:text-emerald-300 flex items-center justify-center cursor-pointer"
              title="Open Local Video / Image"
              aria-label="Open Media File"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Titles Toggle */}
          {onToggleTitles && (
            <button
              type="button"
              onClick={onToggleTitles}
              className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${
                isTitlesActive
                  ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                  : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
              title="Toggle Titles / Subtitles (T)"
              aria-label="Toggle Titles"
            >
              <Subtitles className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Playlist Queue Drawer */}
          <button
            type="button"
            onClick={() => setIsPlaylistOpen((o) => !o)}
            className={`w-7 h-7 rounded border flex items-center justify-center cursor-pointer ${
              isPlaylistOpen
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                : 'border-white/10 bg-white/5 text-white/75 hover:text-white'
            }`}
            title="Toggle Playlist Queue"
            aria-label="Toggle Playlist"
          >
            <ListVideo className="w-3.5 h-3.5" />
          </button>

          {/* Cinema Player / Fullscreen */}
          {onOpenCinemaPlayer && (
            <button
              type="button"
              onClick={onOpenCinemaPlayer}
              className="hidden lg:flex px-2 h-7 rounded border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Open Dedicated Theater Player"
            >
              THEATER
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-7 h-7 rounded border border-white/10 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-300" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
