/**
 * @file /src/components/stage/VlcStageBar.tsx
 * @description Ultra-Slim (~26px) VLC-style Transport Scrubber & Playback Control Bar for TactileStage.
 * Features centered compact Telemetry Bridge (Aspect Scope + Color LUT badge + Sequence Runtime)
 * so the redundant middle telemetry strip below the player is cleanly eliminated.
 */

import React, { useEffect, useRef, useState } from 'react';
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
  RectangleHorizontal,
  Palette,
  Clock,
  X
} from 'lucide-react';
import {
  playbackClock,
  formatVlcTimecode,
  type PlaybackClockSnapshot,
  type VlcLoopMode,
  type VlcAbLoop
} from '../../utils/playbackClock';
import { AnthologyFrame, LutPreset } from '../../types/anthology';
import type { ShotMediaMap } from '../../services/handfilmMediaVault';
import { resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { formatLutPresetLabel } from '../../utils/engine';

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
  lutFilter?: LutPreset | string;
  totalRuntimeTimecode?: string;
  totalShotsCount?: number;
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
  isPlaying,
  playbackSpeed,
  isMuted,
  volume,
  loopMode,
  abLoop,
  fitMode,
  aspectRatio,
  lutFilter,
  totalRuntimeTimecode,
  totalShotsCount,
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
  const scrubberRef = useRef<HTMLDivElement>(null);
  const currentTimeDomRef = useRef<HTMLSpanElement>(null);
  const remainingTimeDomRef = useRef<HTMLButtonElement>(null);
  const bufferedFillDomRef = useRef<HTMLDivElement>(null);
  const progressFillDomRef = useRef<HTMLDivElement>(null);
  const scrubThumbDomRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const showRemainingRef = useRef(false);
  const durationPropRef = useRef(durationSec);
  durationPropRef.current = durationSec;
  const safeDurationRef = useRef(Math.max(0.1, durationSec));

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState(0);
  const [showRemaining, setShowRemaining] = useState(false);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);
  const [isAspectOpen, setIsAspectOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  showRemainingRef.current = showRemaining;

  const initialClock = playbackClock.getSnapshot();
  const safeDuration = Math.max(0.1, initialClock.durationSec > 0 ? initialClock.durationSec : durationSec);
  const safeTime = Math.max(0, Math.min(safeDuration, initialClock.timeSec));
  const initialProgressPct = Math.min(100, Math.max(0, (safeTime / safeDuration) * 100));
  const initialBufferPct = Math.min(100, Math.max(initialProgressPct, initialClock.bufferedPct * 100));

  const applyClockSnapshotToDom = (snap: PlaybackClockSnapshot) => {
    const dur = Math.max(0.1, snap.durationSec > 0 ? snap.durationSec : durationPropRef.current);
    safeDurationRef.current = dur;
    const t = Math.max(0, Math.min(dur, snap.timeSec));
    const pct = Math.min(100, Math.max(0, (t / dur) * 100));
    const bufPct = Math.min(100, Math.max(pct, snap.bufferedPct * 100));
    const showMs = dur < 60;

    if (currentTimeDomRef.current) {
      currentTimeDomRef.current.textContent = formatVlcTimecode(t, showMs);
    }
    if (remainingTimeDomRef.current) {
      remainingTimeDomRef.current.textContent = showRemainingRef.current
        ? `-${formatVlcTimecode(Math.max(0, dur - t), showMs)}`
        : formatVlcTimecode(dur, showMs);
    }
    if (progressFillDomRef.current) {
      progressFillDomRef.current.style.width = `${pct.toFixed(3)}%`;
    }
    if (bufferedFillDomRef.current) {
      bufferedFillDomRef.current.style.width = `${bufPct.toFixed(3)}%`;
    }
    if (scrubThumbDomRef.current) {
      scrubThumbDomRef.current.style.left = `${pct.toFixed(3)}%`;
    }
  };

  useEffect(() => {
    return playbackClock.subscribe(applyClockSnapshotToDom);
  }, []);

  useEffect(() => {
    applyClockSnapshotToDom(playbackClock.getSnapshot());
  }, [showRemaining, durationSec]);

  const computeTimeFromPointer = (clientX: number): { sec: number; pct: number } => {
    const rect = scrubberRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return { sec: 0, pct: 0 };
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return { sec: ratio * safeDurationRef.current, pct: ratio * 100 };
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
  const lutDisplayLabel = formatLutPresetLabel(lutFilter ?? frames[currentIndex]?.lutFilter ?? 'cinematic').toUpperCase();
  const displayRuntime = totalRuntimeTimecode || formatVlcTimecode(safeDuration, false);

  return (
    <div
      data-interactive="true"
      data-testid="vlc-stage-bar"
      onClick={(e) => e.stopPropagation()}
      className="relative w-full h-[26px] min-h-[26px] max-h-[26px] bg-[#0B0B0D]/95 border-t border-b border-white/[0.08] px-2 py-0 flex flex-col justify-center gap-[1px] select-none shrink-0 z-30"
    >
      {/* Playlist Queue Drawer Popover */}
      {isPlaylistOpen && (
        <div
          data-interactive="true"
          className="absolute bottom-full right-3 mb-2 w-80 max-h-72 bg-[#0B0B0D]/96 backdrop-blur-xl border border-white/[0.07] rounded-lg shadow-2xl flex flex-col overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between bg-[#141417]">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#F4F4F5] tabular-nums">
              <ListVideo className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>PLAYLIST QUEUE ({frames.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPlaylistOpen(false)}
              className="p-1 rounded hover:bg-white/[0.06] text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer"
              aria-label="Close playlist"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-y-auto divide-y divide-white/[0.05] max-h-60">
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
                      ? 'bg-[#F59E0B]/15 text-[#F4F4F5] font-bold'
                      : 'text-[#8E8E93] hover:bg-white/[0.04] hover:text-[#F4F4F5]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] tabular-nums shrink-0 w-6 ${isActive ? 'text-[#F59E0B]' : 'text-[#8E8E93]/70'}`}>
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{item.title || `Shot ${idx + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-[9.5px] tabular-nums">
                    {hasRealMedia && (
                      <span className="px-1 py-0.5 rounded bg-[#141417] text-[#8E8E93] border border-white/[0.07]">
                        {media?.type === 'video' || item.isVideo ? 'VID' : 'IMG'}
                      </span>
                    )}
                    <span className="text-[#8E8E93] tabular-nums">
                      {(item.durationSec || item.slideHoldSec || 4).toFixed(1)}s
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 1: Ultra-Slim 6px Seek Scrubber with A-B Loop Highlight + Hover Preview */}
      <div className="flex items-center gap-1.5 h-[6px] min-h-[6px] leading-none py-0">
        <span
          ref={currentTimeDomRef}
          className="text-[7.5px] leading-none font-mono font-semibold text-[#F4F4F5] tabular-nums w-10 shrink-0"
        >
          {formatVlcTimecode(safeTime, safeDuration < 60)}
        </span>

        <div
          ref={scrubberRef}
          onPointerDown={handleScrubPointerDown}
          onPointerMove={handleScrubPointerMove}
          onPointerUp={handleScrubPointerUp}
          onPointerCancel={handleScrubPointerUp}
          onPointerLeave={() => setHoverTime(null)}
          className="relative flex-1 h-[6px] flex items-center cursor-pointer group touch-none"
        >
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPct}%` }}
              className="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#0B0B0D]/95 border border-[#F59E0B]/60 text-[9px] font-mono font-bold text-[#F4F4F5] tabular-nums pointer-events-none whitespace-nowrap shadow-lg z-40"
            >
              {formatVlcTimecode(hoverTime, true)}
            </div>
          )}

          {/* Track groove */}
          <div className="w-full h-[2px] group-hover:h-[3px] bg-white/15 rounded-full overflow-hidden relative transition-all">
            {/* Buffered */}
            <div
              ref={bufferedFillDomRef}
              style={{ width: `${initialBufferPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-white/20"
            />
            {/* A-B Loop Span Highlight */}
            {abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a && (
              <div
                style={{
                  left: `${(abLoop.a / safeDuration) * 100}%`,
                  width: `${((abLoop.b - abLoop.a) / safeDuration) * 100}%`
                }}
                className="absolute top-0 bottom-0 bg-[#F59E0B]/30"
              />
            )}
            {/* Playhead Fill */}
            <div
              ref={progressFillDomRef}
              style={{ width: `${initialProgressPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-[#F59E0B]"
            />
          </div>

          {/* A / B Marker Pins */}
          {abLoop.a !== null && (
            <div
              style={{ left: `${Math.min(100, (abLoop.a / safeDuration) * 100)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#F4F4F5] pointer-events-none"
              title={`Loop A: ${formatVlcTimecode(abLoop.a, true)}`}
            />
          )}
          {abLoop.b !== null && (
            <div
              style={{ left: `${Math.min(100, (abLoop.b / safeDuration) * 100)}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-[#F4F4F5] pointer-events-none"
              title={`Loop B: ${formatVlcTimecode(abLoop.b, true)}`}
            />
          )}

          {/* Scrub Handle */}
          <div
            ref={scrubThumbDomRef}
            style={{ left: `${initialProgressPct}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 group-hover:w-2 group-hover:h-2 rounded-full bg-[#F59E0B] border border-[#0B0B0D] shadow-[0_0_8px_rgba(245,158,11,0.7)] opacity-85 group-hover:opacity-100 transition-all pointer-events-none"
          />
        </div>

        <button
          ref={remainingTimeDomRef}
          type="button"
          onClick={() => setShowRemaining((r) => !r)}
          className="text-[7.5px] leading-none font-mono font-semibold text-[#8E8E93] hover:text-[#F4F4F5] tabular-nums w-12 text-right shrink-0 cursor-pointer"
          title="Click to toggle remaining time"
        >
          {showRemaining
            ? `-${formatVlcTimecode(Math.max(0, safeDuration - safeTime), safeDuration < 60)}`
            : formatVlcTimecode(safeDuration, safeDuration < 60)}
        </button>
      </div>

      {/* Row 2: Slim 17px Transport Row + Center Telemetry Bridge + Right Utility Strip */}
      <div className="flex items-center justify-between gap-1.5 min-h-[17px] h-[17px] leading-none">
        {/* Left: Core VLC Transport */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-[16px] h-[16px] rounded bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0B0B0D] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-[9px] h-[9px] fill-current" /> : <Play className="w-[9px] h-[9px] fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onStop}
            className="w-[16px] h-[16px] rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center transition-colors cursor-pointer"
            title="Stop (Reset to 00:00)"
            aria-label="Stop"
          >
            <Square className="w-[8.5px] h-[8.5px] fill-current" />
          </button>

          <div className="w-px h-2.5 bg-white/[0.07] mx-0.5" />

          <button
            type="button"
            onClick={onPrevShot}
            className="w-[16px] h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center transition-colors cursor-pointer"
            title="Previous Shot"
            aria-label="Previous Shot"
          >
            <SkipBack className="w-[9px] h-[9px]" />
          </button>

          <button
            type="button"
            onClick={() => onSkipSeconds(-5)}
            className="px-1 h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-0.5 text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            title="Skip Back 5s"
          >
            <RotateCcw className="w-[8.5px] h-[8.5px]" />
            <span>5s</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-1 h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            title="Step Back 1 Frame (,)"
          >
            <ChevronLeft className="w-[8.5px] h-[8.5px]" />
            <span>1F</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-1 h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            title="Step Forward 1 Frame (.)"
          >
            <span>1F</span>
            <ChevronRight className="w-[8.5px] h-[8.5px]" />
          </button>

          <button
            type="button"
            onClick={() => onSkipSeconds(5)}
            className="px-1 h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-0.5 text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            title="Skip Forward 5s"
          >
            <span>5s</span>
            <RotateCw className="w-[8.5px] h-[8.5px]" />
          </button>

          <button
            type="button"
            onClick={onNextShot}
            className="w-[16px] h-[16px] rounded hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center transition-colors cursor-pointer"
            title="Next Shot"
            aria-label="Next Shot"
          >
            <SkipForward className="w-[9px] h-[9px]" />
          </button>

          {/* VLC Volume + 200% Preamp */}
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-white/[0.07]">
            <button
              type="button"
              onClick={onToggleMute}
              className="w-[16px] h-[16px] rounded hover:bg-[#141417] flex items-center justify-center cursor-pointer"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume <= 0.01 ? (
                <VolumeX className="w-[9px] h-[9px] text-[#8E8E93]" />
              ) : volume < 0.6 ? (
                <Volume1 className="w-[9px] h-[9px] text-[#F4F4F5]" />
              ) : (
                <Volume2 className={`w-[9px] h-[9px] ${volume > 1.05 ? 'text-[#F59E0B]' : 'text-[#F4F4F5]'}`} />
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
              className="w-12 sm:w-14 h-1 accent-[#F59E0B] cursor-pointer"
            />
            <span
              className={`text-[8px] font-mono tabular-nums w-7 shrink-0 ${
                volumePct > 100 && !isMuted ? 'text-[#F59E0B] font-bold' : 'text-[#8E8E93]'
              }`}
            >
              {volumePct}%
            </span>
          </div>
        </div>

        {/* CENTER TELEMETRY BRIDGE: Aspect Scope Icon + Color LUT Badge + Total Sequence Runtime */}
        <div
          data-testid="vlc-center-telemetry-bridge"
          className="hidden lg:flex items-center gap-1.5 px-2 h-[16px] rounded bg-[#141417]/90 border border-white/[0.07] hover:border-[#F59E0B]/45 hover:shadow-[0_0_12px_rgba(245,158,11,0.18)] text-[8px] font-mono tabular-nums transition-all duration-200 shrink-0"
        >
          {/* Active Aspect Scope Dropdown Trigger */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                setIsAspectOpen((o) => !o);
                setIsSpeedOpen(false);
              }}
              className="flex items-center gap-1 text-[#8E8E93] hover:text-[#F59E0B] font-bold cursor-pointer transition-colors whitespace-nowrap"
              title="Active Aspect Scope (Click to switch)"
            >
              <RectangleHorizontal className="w-[9px] h-[9px] text-[#F59E0B]/85" />
              <span>{aspectRatio}</span>
            </button>
            {isAspectOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 py-1 bg-[#0B0B0D] border border-white/[0.07] rounded-md shadow-2xl min-w-[82px] z-50 flex flex-col">
                {VLC_ASPECT_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onChangeAspectRatio(r);
                      setIsAspectOpen(false);
                    }}
                    className={`px-3 py-1 text-left hover:bg-[#141417] cursor-pointer tabular-nums ${
                      aspectRatio === r ? 'text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-white/15">·</span>

          {/* Color LUT Badge */}
          <span
            data-testid="vlc-center-lut-badge"
            className="flex items-center gap-1 text-[#8E8E93] hover:text-cyan-300 font-bold whitespace-nowrap transition-colors"
            title={`Active Color LUT: ${lutDisplayLabel}`}
          >
            <Palette className="w-[9px] h-[9px] text-cyan-400/80" />
            <span>{lutDisplayLabel}</span>
          </span>

          <span className="text-white/15">·</span>

          {/* Total Sequence Runtime */}
          <span
            data-testid="vlc-center-runtime-badge"
            className="flex items-center gap-1 text-[#F4F4F5]/90 hover:text-[#F59E0B] font-bold whitespace-nowrap transition-colors"
            title={`Total Sequence Runtime${typeof totalShotsCount === 'number' ? ` across ${totalShotsCount} shots` : ''}`}
          >
            <Clock className="w-[9px] h-[9px] text-[#F59E0B]/85" />
            <span>{displayRuntime}</span>
          </span>
        </div>

        {/* Right: A-B Loop, Loop Mode, Speed, Fit Mode, Snapshot, Upload, Titles, Playlist, Theater, Fullscreen */}
        <div className="flex items-center gap-1 shrink-0 text-[8px] font-mono tabular-nums">
          {/* A-B Loop Controls */}
          <div className="hidden md:flex items-center rounded border border-white/[0.07] bg-[#141417] overflow-hidden h-[16px]">
            <button
              type="button"
              onClick={() => onSetAbPoint('a')}
              className={`px-1 h-full cursor-pointer transition-colors whitespace-nowrap ${
                abLoop.a !== null ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
              title="Set Loop Start Point A"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => onSetAbPoint('b')}
              className={`px-1 h-full border-l border-white/[0.07] cursor-pointer transition-colors whitespace-nowrap ${
                abLoop.b !== null ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
              title="Set Loop End Point B"
            >
              B
            </button>
            {(abLoop.a !== null || abLoop.b !== null) && (
              <button
                type="button"
                onClick={() => onSetAbPoint('clear')}
                className="px-1 h-full border-l border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:bg-white/[0.06] cursor-pointer"
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
            className={`px-1.5 h-[16px] rounded border flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
              loopMode === 'repeat-one' || loopMode === 'sequence'
                ? 'border-[#F59E0B]/65 bg-[#F59E0B]/15 text-[#F4F4F5]'
                : 'border-white/[0.07] bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
            title="Cycle Loop Mode: Repeat Shot / Sequence / Play Once"
          >
            {loopMode === 'repeat-one' ? (
              <>
                <Repeat1 className="w-[9px] h-[9px] text-[#F59E0B]" />
                <span className="hidden xl:inline">LOOP 1</span>
              </>
            ) : loopMode === 'sequence' ? (
              <>
                <Repeat className="w-[9px] h-[9px] text-[#F59E0B]" />
                <span className="hidden xl:inline">SEQ</span>
              </>
            ) : (
              <>
                <ArrowRightToLine className="w-[9px] h-[9px]" />
                <span className="hidden xl:inline">ONCE</span>
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
              className="px-1.5 h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold tabular-nums cursor-pointer whitespace-nowrap"
              title="Playback Speed (0.25x - 4x)"
            >
              {playbackSpeed}x
            </button>
            {isSpeedOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 py-1 bg-[#0B0B0D] border border-white/[0.07] rounded-md shadow-2xl min-w-[72px] z-50 flex flex-col">
                {VLC_SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      onChangeSpeed(spd);
                      setIsSpeedOpen(false);
                    }}
                    className={`px-3 py-1 text-left hover:bg-[#141417] cursor-pointer tabular-nums ${
                      Math.abs(playbackSpeed - spd) < 0.01 ? 'text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
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
            className="hidden sm:flex px-1.5 h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] items-center gap-1 cursor-pointer uppercase whitespace-nowrap"
            title={`Fit Mode: ${fitMode} (Click to cycle)`}
          >
            <Monitor className="w-[9px] h-[9px] text-[#8E8E93]" />
            <span className="hidden xl:inline">{fitMode}</span>
          </button>

          {/* Compact Mobile/Tablet Aspect Ratio Fallback (hidden on lg+ where Center Telemetry Bridge displays Aspect Scope) */}
          <div className="relative hidden sm:block lg:hidden">
            <button
              type="button"
              onClick={() => {
                setIsAspectOpen((o) => !o);
                setIsSpeedOpen(false);
              }}
              className="px-1.5 h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer whitespace-nowrap tabular-nums"
              title="Aspect Ratio Override"
            >
              {aspectRatio}
            </button>
            {isAspectOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 py-1 bg-[#0B0B0D] border border-white/[0.07] rounded-md shadow-2xl min-w-[82px] z-50 flex flex-col">
                {VLC_ASPECT_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onChangeAspectRatio(r);
                      setIsAspectOpen(false);
                    }}
                    className={`px-3 py-1 text-left hover:bg-[#141417] cursor-pointer tabular-nums ${
                      aspectRatio === r ? 'text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
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
            className="w-[16px] h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
            title="Take Snapshot PNG (Current Frame)"
            aria-label="Take Snapshot"
          >
            <Camera className="w-[9px] h-[9px]" />
          </button>

          {/* Upload/Open File */}
          {onUploadMedia && (
            <button
              type="button"
              onClick={onUploadMedia}
              className="w-[16px] h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
              title="Open Local Video / Image"
              aria-label="Open Media File"
            >
              <Upload className="w-[9px] h-[9px]" />
            </button>
          )}

          {/* Titles Toggle */}
          {onToggleTitles && (
            <button
              type="button"
              onClick={onToggleTitles}
              className={`w-[16px] h-[16px] rounded border flex items-center justify-center cursor-pointer ${
                isTitlesActive
                  ? 'border-[#F59E0B]/65 bg-[#F59E0B]/15 text-[#F59E0B]'
                  : 'border-white/[0.07] bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60'
              }`}
              title="Toggle Titles / Subtitles (T)"
              aria-label="Toggle Titles"
            >
              <Subtitles className="w-[9px] h-[9px]" />
            </button>
          )}

          {/* Playlist Queue Drawer */}
          <button
            type="button"
            onClick={() => setIsPlaylistOpen((o) => !o)}
            className={`w-[16px] h-[16px] rounded border flex items-center justify-center cursor-pointer ${
              isPlaylistOpen
                ? 'border-[#F59E0B]/65 bg-[#F59E0B]/15 text-[#F59E0B]'
                : 'border-white/[0.07] bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60'
            }`}
            title="Toggle Playlist Queue"
            aria-label="Toggle Playlist"
          >
            <ListVideo className="w-[9px] h-[9px]" />
          </button>

          {/* Cinema Player / Fullscreen */}
          {onOpenCinemaPlayer && (
            <button
              type="button"
              onClick={onOpenCinemaPlayer}
              className="hidden lg:flex px-1.5 h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Open Dedicated Theater Player"
            >
              THEATER
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-[16px] h-[16px] rounded border border-white/[0.07] bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-center cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-[9px] h-[9px] text-[#F59E0B]" /> : <Maximize2 className="w-[9px] h-[9px]" />}
          </button>
        </div>
      </div>
    </div>
  );
};
