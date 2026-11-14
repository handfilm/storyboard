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
  X,
  ArrowLeftRight
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
import { CinemaToolHUD } from '../ui/CinemaToolHUD';

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
  isReversed?: boolean;
  onToggleReverse?: () => void;
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
  onToggleFullscreen,
  isReversed = false,
  onToggleReverse
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
          <CinemaToolHUD
            title={isPlaying ? 'PAUSE PLAYBACK' : 'PLAY SEQUENCE'}
            en="Toggles real-time stage playback."
            bn="কীভাবে ব্যবহার করবেন: প্লে বা পজ করতে স্পেসবার চাপুন বা এখানে ক্লিক করুন।"
            shortcut="SPACE"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              onClick={onTogglePlay}
              className="cinema-tile cinema-tile-amber w-[16px] h-[16px] rounded !bg-[#F59E0B] hover:!bg-[#F59E0B]/90 !text-[#0B0B0D] flex items-center justify-center cursor-pointer shadow-sm"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-[9px] h-[9px] fill-current" /> : <Play className="w-[9px] h-[9px] fill-current ml-0.5" />}
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="STOP & REWIND"
            en="Stops playback and resets playhead to 00:00."
            bn="কীভাবে ব্যবহার করবেন: ভিডিও থামিয়ে শট শুরুতে ফিরিয়ে নিতে ক্লিক করুন।"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              onClick={onStop}
              className="cinema-tile cinema-tile-amber w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Stop"
            >
              <Square className="w-[8.5px] h-[8.5px] fill-current" />
            </button>
          </CinemaToolHUD>

          <div className="w-px h-2.5 bg-white/[0.07] mx-0.5" />

          <CinemaToolHUD
            title="PREVIOUS SHOT"
            en="Jumps directly to the previous shot."
            bn="কীভাবে ব্যবহার করবেন: আগের শটে ফিরে যেতে ক্লিক করুন বা বাম অ্যারো চাপুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={onPrevShot}
              className="cinema-tile cinema-tile-cyan w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Previous Shot"
            >
              <SkipBack className="w-[9px] h-[9px]" />
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="SKIP -5S"
            en="Rewinds timeline playhead by 5 seconds."
            bn="কীভাবে ব্যবহার করবেন: ৫ সেকেন্ড পেছনে স্কিপ করতে ক্লিক করুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={() => onSkipSeconds(-5)}
              className="cinema-tile cinema-tile-cyan px-1 h-[16px] rounded flex items-center gap-0.5 text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-[8.5px] h-[8.5px]" />
              <span>5s</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="STEP -1 FRAME"
            en="Moves backward by one exact frame."
            bn="কীভাবে ব্যবহার করবেন: ১ ফ্রেম পেছনে দেখতে কমা (,) চাপুন বা ক্লিক করুন।"
            shortcut=","
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={() => onStepFrame(false)}
              className="cinema-tile cinema-tile-cyan px-1 h-[16px] rounded flex items-center text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="w-[8.5px] h-[8.5px]" />
              <span>1F</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="STEP +1 FRAME"
            en="Advances forward by one exact frame."
            bn="কীভাবে ব্যবহার করবেন: ১ ফ্রেম সামনে দেখতে ডট (.) চাপুন বা ক্লিক করুন।"
            shortcut="."
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={() => onStepFrame(true)}
              className="cinema-tile cinema-tile-cyan px-1 h-[16px] rounded flex items-center text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            >
              <span>1F</span>
              <ChevronRight className="w-[8.5px] h-[8.5px]" />
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="SKIP +5S"
            en="Fast-forwards timeline playhead by 5 seconds."
            bn="কীভাবে ব্যবহার করবেন: ৫ সেকেন্ড সামনে স্কিপ করতে ক্লিক করুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={() => onSkipSeconds(5)}
              className="cinema-tile cinema-tile-cyan px-1 h-[16px] rounded flex items-center gap-0.5 text-[8px] font-mono tabular-nums cursor-pointer whitespace-nowrap"
            >
              <span>5s</span>
              <RotateCw className="w-[8.5px] h-[8.5px]" />
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="NEXT SHOT"
            en="Jumps directly to the next shot."
            bn="কীভাবে ব্যবহার করবেন: পরের শটে যেতে ক্লিক করুন বা ডান অ্যারো চাপুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={onNextShot}
              className="cinema-tile cinema-tile-cyan w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Next Shot"
            >
              <SkipForward className="w-[9px] h-[9px]" />
            </button>
          </CinemaToolHUD>

          {/* VLC Volume + 200% Preamp */}
          <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-white/[0.07]">
            <CinemaToolHUD
              title={isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
              en="Toggles stage audio output."
              bn="কীভাবে ব্যবহার করবেন: সাউন্ড অন বা মিউট করতে M চাপুন বা ক্লিক করুন।"
              shortcut="M"
              accent="emerald"
              side="top"
            >
              <button
                type="button"
                onClick={onToggleMute}
                className="cinema-tile cinema-tile-emerald w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
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
            </CinemaToolHUD>
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
            <CinemaToolHUD
              title="ASPECT SCOPE"
              en="Switches stage cinema matte aspect ratio."
              bn="কীভাবে ব্যবহার করবেন: ক্লিক করে 2.39:1, 16:9 বা 9:16 ফ্রেম বাছুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={() => {
                  setIsAspectOpen((o) => !o);
                  setIsSpeedOpen(false);
                }}
                className="flex items-center gap-1 text-[#8E8E93] hover:text-[#F59E0B] font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                <RectangleHorizontal className="w-[9px] h-[9px] text-[#F59E0B]/85" />
                <span>{aspectRatio}</span>
              </button>
            </CinemaToolHUD>
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
          <CinemaToolHUD
            title={`COLOR LUT: ${lutDisplayLabel}`}
            en="Active 3D film grade look applied to current shot."
            bn="কীভাবে ব্যবহার করবেন: বাম পাশের FX বা FILTER ট্রে থেকে যেকোনো লুট পরিবর্তন করুন।"
            accent="cyan"
            side="top"
          >
            <span
              data-testid="vlc-center-lut-badge"
              className="flex items-center gap-1 text-[#8E8E93] hover:text-cyan-300 font-bold whitespace-nowrap transition-colors"
            >
              <Palette className="w-[9px] h-[9px] text-cyan-400/80" />
              <span>{lutDisplayLabel}</span>
            </span>
          </CinemaToolHUD>

          <span className="text-white/15">·</span>

          {/* Total Sequence Runtime */}
          <CinemaToolHUD
            title="TOTAL RUNTIME"
            en={`Cumulative sequence duration (${typeof totalShotsCount === 'number' ? `${totalShotsCount} shots` : 'all shots'}).`}
            bn="কীভাবে ব্যবহার করবেন: এটি পুরো প্রজেক্টের মোট সময় দেখায়।"
            accent="amber"
            side="top"
          >
            <span
              data-testid="vlc-center-runtime-badge"
              className="flex items-center gap-1 text-[#F4F4F5]/90 hover:text-[#F59E0B] font-bold whitespace-nowrap transition-colors"
            >
              <Clock className="w-[9px] h-[9px] text-[#F59E0B]/85" />
              <span>{displayRuntime}</span>
            </span>
          </CinemaToolHUD>
        </div>

        {/* Right: A-B Loop, Loop Mode, Speed, Fit Mode, Snapshot, Upload, Titles, Playlist, Theater, Fullscreen */}
        <div className="flex items-center gap-1 shrink-0 text-[8px] font-mono tabular-nums">
          {/* A-B Loop Controls */}
          <div className="hidden md:flex items-center rounded border border-white/[0.07] bg-[#141417] overflow-hidden h-[16px]">
            <CinemaToolHUD
              title="LOOP IN POINT A"
              en="Sets A-B loop start pin at current playhead."
              bn="কীভাবে ব্যবহার করবেন: লুপ শুরুর জায়গায় A পিন সেট করতে ক্লিক করুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={() => onSetAbPoint('a')}
                data-active={abLoop.a !== null ? 'true' : 'false'}
                className={`px-1 h-full cursor-pointer transition-colors whitespace-nowrap ${
                  abLoop.a !== null ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                A
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="LOOP OUT POINT B"
              en="Sets A-B loop end pin at current playhead."
              bn="কীভাবে ব্যবহার করবেন: লুপ শেষ হওয়ার জায়গায় B পিন সেট করতে ক্লিক করুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={() => onSetAbPoint('b')}
                data-active={abLoop.b !== null ? 'true' : 'false'}
                className={`px-1 h-full border-l border-white/[0.07] cursor-pointer transition-colors whitespace-nowrap ${
                  abLoop.b !== null ? 'bg-[#F59E0B]/15 text-[#F59E0B] font-bold' : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                B
              </button>
            </CinemaToolHUD>
            {(abLoop.a !== null || abLoop.b !== null) && (
              <CinemaToolHUD
                title="CLEAR A-B LOOP"
                en="Removes active A and B loop pins."
                bn="কীভাবে ব্যবহার করবেন: A-B লুপ মুছে ফেলতে × চাপুন।"
                accent="crimson"
                side="top"
              >
                <button
                  type="button"
                  onClick={() => onSetAbPoint('clear')}
                  className="px-1 h-full border-l border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:bg-white/[0.06] cursor-pointer"
                >
                  ×
                </button>
              </CinemaToolHUD>
            )}
          </div>

          {/* Loop Mode Switcher */}
          <CinemaToolHUD
            title="LOOP MODE"
            en="Cycles repeat-one shot, full sequence loop, or play once."
            bn="কীভাবে ব্যবহার করবেন: ক্লিক করে LOOP 1, SEQ বা ONCE মোড পরিবর্তন করুন।"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              onClick={onCycleLoopMode}
              data-active={loopMode === 'repeat-one' || loopMode === 'sequence' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber px-1.5 h-[16px] rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
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
          </CinemaToolHUD>

          {/* Speed Popover */}
          <div className="relative">
            <CinemaToolHUD
              title="PLAYBACK SPEED"
              en="Adjusts preview playback multiplier (0.25x to 4x)."
              bn="কীভাবে ব্যবহার করবেন: ক্লিক করে স্লো-মোশন বা ফাস্ট প্লেব্যাক স্পিড বাছুন।"
              accent="cyan"
              side="top"
            >
              <button
                type="button"
                onClick={() => {
                  setIsSpeedOpen((o) => !o);
                  setIsAspectOpen(false);
                }}
                className="cinema-tile cinema-tile-cyan px-1.5 h-[16px] rounded font-bold tabular-nums cursor-pointer whitespace-nowrap"
              >
                {playbackSpeed}x
              </button>
            </CinemaToolHUD>
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

          {/* Non-Destructive Reverse Clip Toggle */}
          {onToggleReverse && (
            <CinemaToolHUD
              title="REVERSE CLIP"
              en="Plays active clip and scrubbing in reverse without re-encoding."
              bn="কীভাবে ব্যবহার করবেন: ভিডিও উল্টো দিকে চালাতে REVERSE বাটন অন করুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                data-testid="toggle-reverse-clip-btn"
                data-active={isReversed ? 'true' : 'false'}
                onClick={onToggleReverse}
                aria-pressed={isReversed}
                className="cinema-tile cinema-tile-amber px-1.5 h-[16px] rounded flex items-center gap-1 cursor-pointer whitespace-nowrap font-bold"
              >
                <ArrowLeftRight className="w-[9px] h-[9px]" />
                <span className="hidden sm:inline">REVERSE</span>
              </button>
            </CinemaToolHUD>
          )}

          {/* Video Fit Mode (Contain / Cover / Fill) */}
          <CinemaToolHUD
            title={`FIT: ${fitMode.toUpperCase()}`}
            en="Cycles video canvas scaling between Contain, Cover, and Fill."
            bn="কীভাবে ব্যবহার করবেন: স্ক্রিনে ভিডিও ফিট বা জুম করতে ক্লিক করুন।"
            accent="cyan"
            side="top"
          >
            <button
              type="button"
              onClick={() => {
                const order: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];
                const next = order[(order.indexOf(fitMode) + 1) % order.length];
                onChangeFitMode(next);
              }}
              className="cinema-tile cinema-tile-cyan hidden sm:flex px-1.5 h-[16px] rounded items-center gap-1 cursor-pointer uppercase whitespace-nowrap"
            >
              <Monitor className="w-[9px] h-[9px]" />
              <span className="hidden xl:inline">{fitMode}</span>
            </button>
          </CinemaToolHUD>

          {/* Compact Mobile/Tablet Aspect Ratio Fallback (hidden on lg+ where Center Telemetry Bridge displays Aspect Scope) */}
          <div className="relative hidden sm:block lg:hidden">
            <CinemaToolHUD
              title="ASPECT RATIO"
              en="Switches stage aspect matte override."
              bn="কীভাবে ব্যবহার করবেন: ক্লিক করে ফ্রেম অনুপাত বদলান।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={() => {
                  setIsAspectOpen((o) => !o);
                  setIsSpeedOpen(false);
                }}
                className="cinema-tile cinema-tile-amber px-1.5 h-[16px] rounded cursor-pointer whitespace-nowrap tabular-nums"
              >
                {aspectRatio}
              </button>
            </CinemaToolHUD>
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
          <CinemaToolHUD
            title="CAPTURE PNG"
            en="Saves the current composite stage frame as a PNG still."
            bn="কীভাবে ব্যবহার করবেন: বর্তমান ফ্রেমের ছবি সেভ করতে ক্যামেরা আইকনে ক্লিক করুন।"
            accent="emerald"
            side="top"
          >
            <button
              type="button"
              onClick={onCaptureSnapshot}
              className="cinema-tile cinema-tile-emerald w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Take Snapshot"
            >
              <Camera className="w-[9px] h-[9px]" />
            </button>
          </CinemaToolHUD>

          {/* Upload/Open File */}
          {onUploadMedia && (
            <CinemaToolHUD
              title="IMPORT MEDIA"
              en="Loads a local video or image file into the active shot."
              bn="কীভাবে ব্যবহার করবেন: ফোন বা পিসি থেকে ভিডিও/ছবি আনতে আপলোড চাপুন।"
              accent="cyan"
              side="top"
            >
              <button
                type="button"
                onClick={onUploadMedia}
                className="cinema-tile cinema-tile-cyan w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
                aria-label="Open Media File"
              >
                <Upload className="w-[9px] h-[9px]" />
              </button>
            </CinemaToolHUD>
          )}

          {/* Titles Toggle */}
          {onToggleTitles && (
            <CinemaToolHUD
              title="TOGGLE TITLES"
              en="Shows or hides kinetic stage titles and Bangla subtitles."
              bn="কীভাবে ব্যবহার করবেন: টাইটেল দেখাতে বা লুকাতে T চাপুন বা এখানে ক্লিক করুন।"
              shortcut="T"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                data-active={isTitlesActive ? 'true' : 'false'}
                onClick={onToggleTitles}
                className="cinema-tile cinema-tile-amber w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
                aria-label="Toggle Titles"
              >
                <Subtitles className="w-[9px] h-[9px]" />
              </button>
            </CinemaToolHUD>
          )}

          {/* Playlist Queue Drawer */}
          <CinemaToolHUD
            title="SHOT QUEUE"
            en="Opens shot playlist drawer for instant frame jumping."
            bn="কীভাবে ব্যবহার করবেন: সব শটের তালিকা দেখতে ও সরাসরি জাম্প করতে ক্লিক করুন।"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              data-active={isPlaylistOpen ? 'true' : 'false'}
              onClick={() => setIsPlaylistOpen((o) => !o)}
              className="cinema-tile cinema-tile-amber w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Toggle Playlist"
            >
              <ListVideo className="w-[9px] h-[9px]" />
            </button>
          </CinemaToolHUD>

          {/* Cinema Player / Fullscreen */}
          {onOpenCinemaPlayer && (
            <CinemaToolHUD
              title="THEATER PLAYER"
              en="Launches dedicated distraction-free theater screening player."
              bn="কীভাবে ব্যবহার করবেন: সিনেমা থিয়েটার মুডে পুরো মুভি দেখতে ক্লিক করুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={onOpenCinemaPlayer}
                className="cinema-tile cinema-tile-amber hidden lg:flex px-1.5 h-[16px] rounded items-center gap-1 cursor-pointer whitespace-nowrap font-black"
              >
                THEATER
              </button>
            </CinemaToolHUD>
          )}

          <CinemaToolHUD
            title={isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
            en="Toggles fullscreen monitor screening."
            bn="কীভাবে ব্যবহার করবেন: ফুল-স্ক্রিন মোড অন বা অফ করতে F চাপুন বা ক্লিক করুন।"
            shortcut="F"
            accent="amber"
            side="top"
          >
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="cinema-tile cinema-tile-amber w-[16px] h-[16px] rounded flex items-center justify-center cursor-pointer"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-[9px] h-[9px] text-[#F59E0B]" /> : <Maximize2 className="w-[9px] h-[9px]" />}
            </button>
          </CinemaToolHUD>
        </div>
      </div>
    </div>
  );
};
