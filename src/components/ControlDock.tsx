/**
 * @file /src/components/ControlDock.tsx
 * @description Master Tactical Bottom Control Dock for HANDFILM Cinema Engine.
 * Features 100-shot thumbnail strip, precision transport, pace slider, aspect toggle,
 * LUT selector, and futuristic tactile HUD controls.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AnthologyFrame, LutPreset } from '../types/anthology';
import { calculateSlideshowInterval, getLutFilterCSS } from '../utils/engine';
import {
  clampShotDuration,
  formatDurationPillValue,
  formatFullSMPTETimecode,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../types/storyboard';
import { audioEngine } from '../services/audioEngine';
import { thumbnailMemoryCache } from '../services/thumbnailEngine';
import { CadenceSelectorPill } from './controls/CadenceSelectorPill';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sliders,
  Move,
  Wand2,
  Grid,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Camera,
  Crosshair,
  Eye,
  Type,
  Activity,
  ZoomIn,
  Repeat,
  Music
} from 'lucide-react';
import { TrackVuMeter } from './audio/TrackVuMeter';
import { AudioFrequencyVisualizer } from './audio/AudioFrequencyVisualizer';
import { MultiLayerZoomControls } from './optics/MultiLayerZoomControls';
import { useStudioStore } from '../core/store';

export interface ControlDockProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  slideTimeSec?: number;
  viewMode: 'stage' | 'grid';
  isPlaying: boolean;
  speed: number;
  showHud: boolean;
  aspectRatio: string;
  isFullscreen: boolean;
  isAudioMuted: boolean;
  audioVolume?: number;
  isPanActive?: boolean;
  panOffsetPercent?: number;
  showGuides?: boolean;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectFrame: (index: number) => void;
  onUpdateFrameAtIndex?: (index: number, updatedFrame: AnthologyFrame) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleHud: () => void;
  onToggleFullscreen: () => void;
  onToggleAudio: () => void;
  onVolumeChange?: (vol: number) => void;
  onToggleViewMode: () => void;
  onOpenInspector: () => void;
  onOpenPublishModal?: () => void;
  onChangeAspectRatio: (ratio: any) => void;
  onChangeLut: (lut: LutPreset) => void;
  onTogglePan?: () => void;
  onOpenLiquify?: () => void;
  onToggleGuides?: () => void;
  onCaptureStill?: () => void;
  onToggleZen?: () => void;
}

const LUT_PRESETS: { id: LutPreset; label: string }[] = [
  { id: 'cinematic', label: 'Cinema 35' },
  { id: 'noir', label: 'B&W Noir' },
  { id: 'golden', label: 'Golden Hour' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'bleach', label: 'Bleach Bypass' },
  { id: 'technicolor', label: 'Technicolor' },
  { id: 'infrared', label: 'Infrared' },
  { id: 'raw', label: 'RAW Flat' }
];

export const ControlDock: React.FC<ControlDockProps> = ({
  frames = [],
  currentIndex = 0,
  slideTimeSec = 0,
  viewMode,
  isPlaying,
  speed,
  showHud,
  aspectRatio,
  isFullscreen,
  isAudioMuted,
  audioVolume,
  isPanActive = false,
  panOffsetPercent = 50,
  showGuides = false,
  onToggleTitles,
  showTitles = true,
  onPrev,
  onNext,
  onSelectFrame,
  onUpdateFrameAtIndex,
  onApplyDurationToAll,
  onMatchAudioBeats,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onTogglePlay,
  onSpeedChange,
  onToggleHud,
  onToggleFullscreen,
  onToggleAudio,
  onVolumeChange,
  onToggleViewMode,
  onOpenInspector,
  onOpenPublishModal,
  onChangeAspectRatio,
  onChangeLut,
  onTogglePan,
  onOpenLiquify,
  onToggleGuides,
  onCaptureStill,
  onToggleZen
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [isFreqVisualizerOpen, setIsFreqVisualizerOpen] = useState(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const [dragShotState, setDragShotState] = useState<{
    index: number;
    durationSec: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [failedThumbMap, setFailedThumbMap] = useState<Record<string, boolean>>({});
  const [hoveredMarker, setHoveredMarker] = useState<{
    index: number;
    centerX: number;
    topY: number;
  } | null>(null);

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);

  const safeFrames = Array.isArray(frames) && frames.length > 0 ? frames : [];
  const currentFrame = safeFrames[currentIndex] || safeFrames[0];
  const currentDurationSec = getShotDurationSec(currentFrame, 12.0);
  const currentFps = getShotTargetFps(currentFrame, 24);
  const intervalSeconds = (calculateSlideshowInterval(speed) / 1000).toFixed(1);

  const shotOffsets = useMemo(() => getCumulativeShotOffsets(safeFrames), [safeFrames]);
  const currentShotStartSec = shotOffsets[currentIndex]?.startSec ?? 0;
  const tcString = formatFullSMPTETimecode(currentShotStartSec + slideTimeSec, currentFps);

  // Scroll-based Virtualization State for bottom 100-shot sequence bar
  const [stripScroll, setStripScroll] = useState<{ scrollLeft: number; clientWidth: number }>({
    scrollLeft: 0,
    clientWidth: 768
  });

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const onScroll = () => {
      setStripScroll({ scrollLeft: el.scrollLeft, clientWidth: el.clientWidth });
      setHoveredMarker(null);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Compute visible shot range + 5-shot buffer window
  const shotWidthApprox = 56;
  const visibleStartShot = Math.max(0, Math.floor(stripScroll.scrollLeft / shotWidthApprox) - 5);
  const visibleEndShot = Math.min(
    safeFrames.length - 1,
    Math.ceil((stripScroll.scrollLeft + stripScroll.clientWidth) / shotWidthApprox) + 5
  );

  // Auto-scroll timeline to active shot
  useEffect(() => {
    if (stripRef.current) {
      const activeEl = stripRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= safeFrames.length) {
      onSelectFrame(num - 1);
      setJumpInput('');
    }
  };

  const handleMarkerHoverEnter = (idx: number, targetEl: HTMLElement) => {
    if (dragShotState) return;
    const rect = targetEl.getBoundingClientRect();
    setHoveredMarker({
      index: idx,
      centerX: rect.left + rect.width / 2,
      topY: rect.top
    });
  };

  const handleStartShotResize = (idx: number, e: React.MouseEvent) => {
    if (!onUpdateFrameAtIndex) return;
    e.preventDefault();
    e.stopPropagation();
    setHoveredMarker(null);

    const targetFrame = safeFrames[idx];
    if (!targetFrame) return;

    const startX = e.clientX;
    const startDuration = getShotDurationSec(targetFrame, 12.0);
    const shotStartSec = shotOffsets[idx]?.startSec ?? idx * 12.0;
    const snapActive =
      isSnapToBeat || Boolean(targetFrame.beatSnapEnabled) || audioEngine.getIsSnapToBeatEnabled();

    setDragShotState({
      index: idx,
      durationSec: startDuration,
      clientX: e.clientX,
      clientY: e.clientY
    });

    const onMove = (moveEv: MouseEvent) => {
      const deltaPx = moveEv.clientX - startX;
      const secPerPx = moveEv.shiftKey ? 0.01 : moveEv.altKey ? 0.5 : startDuration >= 30 ? 0.25 : 0.06;
      let candidate = clampShotDuration(startDuration + deltaPx * secPerPx);

      if (snapActive) {
        candidate = audioEngine.snapDurationToNearestBeat(shotStartSec, candidate, 0.5, 0.45);
      } else {
        candidate = clampShotDuration(Math.round(candidate * 20) / 20);
      }

      setDragShotState({
        index: idx,
        durationSec: candidate,
        clientX: moveEv.clientX,
        clientY: moveEv.clientY
      });

      onUpdateFrameAtIndex(idx, {
        ...targetFrame,
        slideHoldSec: candidate,
        durationSec: candidate
      });
    };

    const onUp = () => {
      setDragShotState(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const hoveredPreviewData = useMemo(() => {
    if (!hoveredMarker || dragShotState) return null;
    const frame = safeFrames[hoveredMarker.index];
    if (!frame) return null;
    const idx = hoveredMarker.index;
    const cachedThumb =
      frame.thumbnailUrl ||
      frame.thumbnail ||
      thumbnailMemoryCache.get(String(frame.id)) ||
      thumbnailMemoryCache.get(`shot_${idx}`) ||
      thumbnailMemoryCache.get(String(idx)) ||
      '';
    const isVideoMedia = Boolean(
      frame.isVideo ||
      (frame.imageUrl && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(frame.imageUrl))
    );
    const primaryImgSrc = cachedThumb || (!isVideoMedia ? frame.imageUrl || '' : '');
    const holdSec = getShotDurationSec(frame, 12.0);
    const shotFps = getShotTargetFps(frame, 24);
    const startSec = shotOffsets[idx]?.startSec ?? idx * 12.0;
    const startTimecode = formatFullSMPTETimecode(startSec, shotFps);
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const clampedLeft = Math.max(96, Math.min(viewportWidth - 96, hoveredMarker.centerX));
    const caretOffsetPx = Math.max(-72, Math.min(72, hoveredMarker.centerX - clampedLeft));

    return {
      idx,
      shotNumber: idx + 1,
      frame,
      primaryImgSrc,
      isVideoMedia,
      holdSec,
      startTimecode,
      clampedLeft,
      topY: Math.max(120, hoveredMarker.topY - 10),
      caretOffsetPx,
      thumbKey: `${idx}_${primaryImgSrc}`,
      lutFilterCss: getLutFilterCSS(frame.lutFilter || 'cinematic', frame.adjustments)
    };
  }, [hoveredMarker, dragShotState, safeFrames, shotOffsets]);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-2 px-2 sm:px-4">
      {/* Floating Real-Time Drag Handle Tooltip */}
      {dragShotState && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.max(80, Math.min(window.innerWidth - 180, dragShotState.clientX - 70))}px`,
            top: `${Math.max(24, dragShotState.clientY - 42)}px`,
            zIndex: 9999
          }}
          className="px-2.5 py-1 rounded-md bg-black/95 border border-[#F5A623] text-[10px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.9)] pointer-events-none tabular-nums"
        >
          DUR: {dragShotState?.durationSec ? dragShotState.durationSec.toFixed(2) : '12.00'}s //{' '}
          {getShotFrameCount(dragShotState?.durationSec ?? 12.0, getShotTargetFps(safeFrames[dragShotState?.index ?? 0], 24))} FRAMES
        </div>
      )}

      {/* Floating Frame Thumbnail Hover-Preview on Bottom Scrubber Index Marker */}
      {hoveredPreviewData && (
        <div
          role="tooltip"
          data-testid="scrubber-hover-preview"
          style={{
            position: 'fixed',
            left: `${hoveredPreviewData.clampedLeft}px`,
            top: `${hoveredPreviewData.topY}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9998
          }}
          className="w-52 bg-[#090A10]/95 backdrop-blur-xl border border-[#D4AF37]/55 rounded-[4px] p-1.5 p-1.5! shadow-[0_16px_40px_rgba(0,0,0,0.95)] pointer-events-none select-none transform-gpu animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Frame Thumbnail Viewport */}
          <div className="relative w-full aspect-[16/9] rounded-[2px] overflow-hidden bg-[#050508] border border-white/10">
            {hoveredPreviewData.primaryImgSrc && !failedThumbMap[hoveredPreviewData.thumbKey] ? (
              <img
                src={hoveredPreviewData.primaryImgSrc}
                alt={`Frame ${hoveredPreviewData.shotNumber} preview`}
                referrerPolicy="no-referrer"
                decoding="async"
                onError={() =>
                  setFailedThumbMap((prev) => ({ ...prev, [hoveredPreviewData.thumbKey]: true }))
                }
                style={{ filter: hoveredPreviewData.lutFilterCss }}
                className="w-full h-full object-cover"
              />
            ) : hoveredPreviewData.isVideoMedia && hoveredPreviewData.frame.imageUrl ? (
              <video
                src={hoveredPreviewData.frame.imageUrl}
                muted
                playsInline
                preload="metadata"
                style={{ filter: hoveredPreviewData.lutFilterCss }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#161722] via-[#0E0F16] to-[#07080C] flex flex-col items-center justify-center gap-1">
                <Camera className="w-4 h-4 text-white/25" />
                <span className="text-[8px] font-mono text-zinc-500 tracking-wider">
                  EMPTY FRAME
                </span>
              </div>
            )}

            {/* Scrim + Unboxed Index & Start Timecode */}
            <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex items-end justify-between px-1.5 px-1.5! pb-1 pb-1! font-mono text-[8.5px] tabular-nums">
              <span className="font-bold text-[#FFE066]">
                #{String(hoveredPreviewData.shotNumber).padStart(3, '0')}
              </span>
              <span className="text-zinc-300">
                {hoveredPreviewData.startTimecode}
              </span>
            </div>
          </div>

          {/* Frame Title, Bengali Subtitle & Hold Duration */}
          <div className="pt-1.5 pt-1.5! px-0.5 px-0.5! flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-white truncate">
                {hoveredPreviewData.frame.title || `Frame ${hoveredPreviewData.shotNumber}`}
              </span>
              <span className="text-[9px] font-mono text-[#D4AF37] tabular-nums shrink-0">
                {formatDurationPillValue(hoveredPreviewData.holdSec)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[8.5px] text-zinc-400">
              <span className="truncate font-bangla text-zinc-300">
                {hoveredPreviewData.frame.bengaliTitle || 'Sequence Frame'}
              </span>
              <span className="font-mono text-zinc-500 shrink-0">Click to jump</span>
            </div>
          </div>

          {/* Downward Pointer Caret Aligned to Hovered Index Marker */}
          <div
            style={{
              left: `calc(50% + ${hoveredPreviewData.caretOffsetPx}px)`
            }}
            className="absolute -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#090A10] border-r border-b border-[#D4AF37]/55"
          />
        </div>
      )}

      {/* 100-Frame Strip Navigation with High-Throughput Virtualization & Per-Slide Duration Handles */}
      <div className="w-full max-w-5xl mb-1.5 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous Shot (J)"
          title="Previous Shot (J / Left Arrow)"
          className="p-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={stripRef}
          onMouseLeave={() => setHoveredMarker(null)}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 bg-[#060609]/95 backdrop-blur-md border border-white/15 rounded-[4px] no-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.85)] scroll-smooth h-11"
        >
          {safeFrames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const cachedThumb =
              frame?.thumbnailUrl ||
              frame?.thumbnail ||
              thumbnailMemoryCache.get(String(frame?.id)) ||
              thumbnailMemoryCache.get(`shot_${idx}`) ||
              thumbnailMemoryCache.get(String(idx)) ||
              '';
            const isVideoMedia = Boolean(
              frame?.isVideo ||
              (frame?.imageUrl && /\.(mp4|webm|mov|m4v)(\?|$)/i.test(frame.imageUrl))
            );
            const primaryImgSrc = cachedThumb || (!isVideoMedia ? frame?.imageUrl || '' : '');
            const hasMedia = Boolean(primaryImgSrc || frame?.imageUrl || frame?.isVideo);
            const isThumbnailVisible = idx >= visibleStartShot && idx <= visibleEndShot;
            const shotNumber = idx + 1;
            const title = frame?.title || `Shot ${shotNumber}`;
            const bn = frame?.bengaliTitle || '';
            const holdSec =
              dragShotState?.index === idx
                ? dragShotState.durationSec
                : getShotDurationSec(frame, 12.0);
            const shotFps = getShotTargetFps(frame, 24);
            const shotFrames = getShotFrameCount(holdSec, shotFps);

            // Real-time relative timecode for the active frame during playback
            const relSec = isActive ? slideTimeSec : 0;
            const relFrames = Math.floor((relSec % 1) * shotFps);
            const relSecondsPart = Math.floor(relSec);
            const relativeTc = `+${String(relSecondsPart).padStart(2, '0')}:${String(relFrames).padStart(2, '0')}F`;
            const thumbKey = `${idx}_${primaryImgSrc}`;

            return (
              <div
                key={frame?.id ?? idx}
                data-testid={`scrubber-index-marker-${idx}`}
                onClick={() => onSelectFrame(idx)}
                onMouseEnter={(e) => handleMarkerHoverEnter(idx, e.currentTarget)}
                onMouseMove={(e) => {
                  if (hoveredMarker?.index !== idx) {
                    handleMarkerHoverEnter(idx, e.currentTarget);
                  }
                }}
                onMouseLeave={() =>
                  setHoveredMarker((prev) => (prev?.index === idx ? null : prev))
                }
                onFocus={(e) => handleMarkerHoverEnter(idx, e.currentTarget)}
                onBlur={() =>
                  setHoveredMarker((prev) => (prev?.index === idx ? null : prev))
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFrame(idx);
                  }
                }}
                aria-label={`Shot ${shotNumber}: ${title}${bn ? ` (${bn})` : ''} — ${holdSec.toFixed(2)}s`}
                className={`group relative shrink-0 w-13 sm:w-14 h-7.5 sm:h-8.5 rounded-[3px] overflow-hidden flex items-center justify-center cursor-pointer select-none transition-all duration-200 border ${
                  isActive
                    ? 'border-[#FFE066] ring-2 ring-[#D4AF37] shadow-[0_0_14px_rgba(212,175,55,0.7)] scale-105 z-20'
                    : hasMedia
                    ? 'border-white/20 hover:border-[#FFE066]/90 hover:scale-105 bg-[#121218]'
                    : 'border-white/10 hover:border-white/30 hover:scale-105 bg-[#0e0e14]'
                }`}
              >
                {/* Virtualized Persistent Media Thumbnail Preview */}
                {hasMedia && isThumbnailVisible && primaryImgSrc && !failedThumbMap[thumbKey] ? (
                  <img
                    src={primaryImgSrc}
                    alt={`Shot ${shotNumber}`}
                    referrerPolicy="no-referrer"
                    decoding="async"
                    onError={() =>
                      setFailedThumbMap((prev) => ({ ...prev, [thumbKey]: true }))
                    }
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.75] group-hover:brightness-100 transition-all duration-200 group-hover:scale-110"
                  />
                ) : hasMedia && isThumbnailVisible && isVideoMedia && frame?.imageUrl ? (
                  <video
                    src={frame.imageUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.75] group-hover:brightness-100 pointer-events-none"
                  />
                ) : hasMedia ? (
                  <div className="absolute inset-0 bg-[#12121a] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/40 pointer-events-none" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#181824] via-[#101018] to-[#08080e] flex items-center justify-center">
                    <div className="w-full h-full opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:4px_4px]" />
                    <Camera className="w-3 h-3 text-white/20 group-hover:text-amber-400/50 transition-colors pointer-events-none" />
                  </div>
                )}

                {/* Contrast shade overlay */}
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/20 transition-colors pointer-events-none" />

                {/* Floating Real-Time Relative Timecode / Duration Overlay Badge */}
                <div
                  className={`absolute top-0.5 inset-x-0.5 z-20 flex items-center justify-between px-1 py-0.2 rounded-[2px] backdrop-blur-md transition-all duration-150 pointer-events-none ${
                    isActive
                      ? 'bg-black/90 border border-[#FFE066] text-[#FFE066] shadow-[0_0_8px_rgba(245,166,35,0.7)]'
                      : 'bg-black/75 border border-white/10 text-white/60 opacity-85 group-hover:opacity-100'
                  }`}
                >
                  <span className="text-[6.5px] sm:text-[7px] font-mono font-bold tracking-tight leading-none tabular-nums">
                    {isActive && isPlaying ? relativeTc : formatDurationPillValue(holdSec)}
                  </span>
                </div>

                {/* Real-Time Slide Progress Baseline */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-black/80 overflow-hidden pointer-events-none z-20">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.9)]"
                      style={{
                        width: `${Math.min(100, Math.max(0, (slideTimeSec / holdSec) * 100))}%`
                      }}
                    />
                  </div>
                )}

                {/* Bottom media indicator accent for inactive shots */}
                {hasMedia && !isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#D4AF37]/80 pointer-events-none" />
                )}

                {/* Number overlay */}
                <span
                  className={`relative z-10 font-mono transition-all duration-200 pointer-events-none select-none mt-1.5 tabular-nums ${
                    isActive
                      ? 'text-[#FFE066] font-black text-[11px] scale-110 drop-shadow-[0_0_8px_rgba(245,166,35,0.95)]'
                      : 'text-white/80 text-[9.5px] font-bold tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] group-hover:scale-125 group-hover:text-[#FFE066] group-hover:font-black group-hover:text-[11px]'
                  }`}
                >
                  {shotNumber}
                </span>

                {/* Right-Border Duration Drag Handle */}
                {onUpdateFrameAtIndex && (
                  <div
                    onMouseDown={(e) => handleStartShotResize(idx, e)}
                    onClick={(e) => e.stopPropagation()}
                    title={`Drag right edge to resize SH${String(shotNumber).padStart(3, '0')} (${holdSec.toFixed(2)}s // ${shotFrames}F)`}
                    className={`absolute top-0 bottom-0 right-0 w-1.5 z-30 cursor-ew-resize transition-colors ${
                      dragShotState?.index === idx
                        ? 'bg-[#FFE066]'
                        : 'bg-transparent group-hover:bg-[#F5A623]/80 hover:!bg-[#FFE066]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={onNext}
          aria-label="Next Shot (L)"
          title="Next Shot (L / Right Arrow)"
          className="p-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Sequence Bar Quick Actions: Ripple Duration & Beat Match */}
        {onApplyDurationToAll && (
          <button
            type="button"
            onClick={() => onApplyDurationToAll(currentDurationSec)}
            title={`Ripple Apply ${formatDurationPillValue(currentDurationSec)} to All Shots`}
            className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/75 hover:text-[#FFE066] text-[9px] font-mono-tech cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <Repeat className="w-3 h-3 text-[#D4AF37]" />
            <span>Ripple All</span>
          </button>
        )}

        {onMatchAudioBeats && (
          <button
            type="button"
            onClick={onMatchAudioBeats}
            title="Match Audio Waveform Beats across all shots"
            className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-cyan-400 text-white/75 hover:text-cyan-200 text-[9px] font-mono-tech cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <Music className="w-3 h-3 text-cyan-400" />
            <span>Match Beats</span>
          </button>
        )}

        <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center shrink-0">
          <input
            type="text"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={() => handleJumpSubmit()}
            placeholder={`# ${currentIndex + 1}`}
            className="w-14 bg-black/85 border border-white/20 focus:border-[#D4AF37] text-white text-[9.5px] font-mono-tech px-2 py-1 rounded-[2px] text-center outline-none transition-colors tabular-nums"
            title="Type shot number and press Enter to jump"
          />
        </form>
      </div>

      {/* Real-time Audio Frequency Visualizer Floating Overlay */}
      {isFreqVisualizerOpen && (
        <div className="w-full max-w-5xl mb-2 pointer-events-auto">
          <AudioFrequencyVisualizer
            isOpen={isFreqVisualizerOpen}
            onClose={() => setIsFreqVisualizerOpen(false)}
            isAudioMuted={isAudioMuted}
            onToggleAudio={onToggleAudio}
          />
        </div>
      )}

      {/* Multi-Layer Zoom HUD Floating Overlay */}
      {isZoomControlsOpen && (
        <div className="w-full max-w-md mb-2 pointer-events-auto">
          <MultiLayerZoomControls
            onClose={() => setIsZoomControlsOpen(false)}
          />
        </div>
      )}

      {/* Main Transport & Optics Toolbar */}
      <div className="relative w-full max-w-5xl pointer-events-auto bg-[#08080B]/95 backdrop-blur-xl border border-white/15 rounded-[3px] shadow-[0_8px_32px_rgba(0,0,0,0.85)] p-2 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech">
        {/* Subtle Ambient Gold Audio Reactivity Edge */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent pointer-events-none shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
        {/* Left Section: Playback, Timecode & Quick Cadence Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Loop' : 'Play Loop'}
            className={`px-3 py-1.5 rounded-[2px] border font-bold flex items-center gap-1.5 tracking-wider transition-all cursor-pointer text-[10px] sm:text-[11px] shrink-0 ${
              isPlaying
                ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#FFE066] shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                : 'border-white/20 bg-white/5 text-white hover:border-[#D4AF37] hover:text-[#FFE066]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span className="hidden sm:inline">LOOP</span>
              </>
            )}
          </button>

          {/* Timecode Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-black/90 border border-white/15 text-[9px] font-mono-tech shrink-0 whitespace-nowrap shadow-inner tabular-nums"
            title={`Sequence SMPTE Timecode (HH:MM:SS:FF) at ${currentFps} FPS`}
          >
            <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span className="text-[8px] text-white/40 font-semibold">TC</span>
            <span className="text-[#D4AF37] font-bold tracking-wider">{tcString}</span>
            <span className="text-[7.5px] text-white/40 border-l border-white/15 pl-1.5">{currentFps}F</span>
          </div>

          {/* In-Player Quick Cadence Selector Pill */}
          {onUpdateFrameAtIndex && currentFrame && (
            <CadenceSelectorPill
              durationSec={currentDurationSec}
              targetFps={currentFps}
              onChangeDuration={(dur) =>
                onUpdateFrameAtIndex(currentIndex, {
                  ...currentFrame,
                  slideHoldSec: dur,
                  durationSec: dur
                })
              }
              onChangeTargetFps={(fps) =>
                onUpdateFrameAtIndex(currentIndex, {
                  ...currentFrame,
                  targetFps: fps
                })
              }
              onApplyDurationToAll={onApplyDurationToAll}
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              compact
            />
          )}

          {/* Pace Slider */}
          <div className="hidden xl:flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0 whitespace-nowrap tabular-nums">
            <span className="text-[8.5px] text-white/40 tracking-wider shrink-0">SPEED</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-12 accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded shrink-0"
              title={`Playback tempo scalar (${intervalSeconds}s ref)`}
            />
          </div>

          {/* Pan Tool */}
          {onTogglePan && (
            <button
              onClick={onTogglePan}
              className={`px-2.5 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                isPanActive
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Interactive Vertical Alignment Pan Tool (P / Y)"
            >
              <Move className="w-3 h-3 text-[#D4AF37]" />
              <span className="hidden sm:inline">PAN</span>
              <span className="text-[8px] opacity-75">{panOffsetPercent}%</span>
            </button>
          )}

          {/* Canvas Warp / Liquify */}
          {onOpenLiquify && (
            <button
              onClick={onOpenLiquify}
              className="px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="HTML5 Canvas Liquify & Mesh Warp Studio (W)"
            >
              <Wand2 className="w-3 h-3 text-[#D4AF37]" />
              <span className="hidden sm:inline">WARP</span>
            </button>
          )}
        </div>

        {/* Center Section: Aspect Ratio & LUT preset */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <div className="flex items-center bg-black/80 border border-white/15 rounded-[2px] p-0.5 shrink-0">
            <span className="text-[8px] text-white/40 px-1.5 hidden lg:inline tracking-widest uppercase">
              ASPECT
            </span>
            {['2.39:1', '16:9', '4:3', '1:1', '9:16'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => onChangeAspectRatio(ratio)}
                className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
                  aspectRatio === ratio
                    ? 'bg-[#D4AF37] text-black font-bold shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <select
            value={currentFrame?.lutFilter || 'cinematic'}
            onChange={(e) => onChangeLut(e.target.value as LutPreset)}
            className="hidden sm:block px-2.5 py-1 bg-black/85 border border-white/15 rounded-[2px] text-[9.5px] text-[#FFE066] font-mono-tech outline-none cursor-pointer focus:border-[#D4AF37]"
          >
            {LUT_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#101014] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Section: Cinema Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Kinetic Hero Titles Toggle: Symbol "T" ONLY */}
          {onToggleTitles && (
            <button
              onClick={onToggleTitles}
              className={`w-6 h-6 rounded-[2px] border font-serif text-xs font-black flex items-center justify-center cursor-pointer transition-all ${
                showTitles
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Toggle Kinetic Hero Typography (T)"
              aria-label="Toggle Kinetic Hero Typography"
            >
              <span>T</span>
            </button>
          )}
          {/* Thirds Guides */}
          {onToggleGuides && (
            <button
              onClick={onToggleGuides}
              className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
                showGuides
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Toggle Rule of Thirds & Crosshair Guides (C)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Capture Still */}
          {onCaptureStill && (
            <button
              onClick={onCaptureStill}
              className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all active:scale-95"
              title="Capture High-Res Cinema Still PNG (S)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Track VU Meter & Master Audio Engine */}
          <TrackVuMeter
            variant="dock"
            onToggleMute={onToggleAudio}
            isMuted={isAudioMuted}
          />

          {/* Real-Time Audio Frequency Visualizer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFreqVisualizerOpen((prev) => !prev)}
            className={`px-2 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
              isFreqVisualizerOpen
                ? 'bg-[#D4AF37]/30 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-[#FFE066] hover:border-[#D4AF37]/50'
            }`}
            title="Toggle Real-Time Audio Frequency Visualizer Overlay"
            aria-label="Toggle Audio Frequency Visualizer"
          >
            <Activity className="w-3 h-3 text-[#FFE066]" />
            <span className="hidden sm:inline">FREQ</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE066] animate-pulse" />
          </button>

          {/* Multi-Layer Zoom HUD Button */}
          <button
            type="button"
            onClick={() => setIsZoomControlsOpen((prev) => !prev)}
            className={`px-2 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
              isZoomControlsOpen
                ? 'bg-[#D4AF37]/30 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-[#FFE066] hover:border-[#D4AF37]/50'
            }`}
            title="Multi-Layer Zoom: Scale Foreground & Background independently with optical depth perception"
            aria-label="Toggle Multi-Layer Zoom Controls"
          >
            <ZoomIn className="w-3 h-3 text-[#D4AF37]" />
            <span className="hidden sm:inline">ZOOM</span>
            <span className="text-[8px] text-[#FFE066] font-bold tabular-nums">
              {fgZoom.toFixed(1)}x/{bgZoom.toFixed(1)}x
            </span>
          </button>

          {/* Grid / Contact Sheet */}
          <button
            onClick={onToggleViewMode}
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1 cursor-pointer transition-all text-[9.5px] ${
              viewMode === 'grid'
                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="100-Frame Contact Sheet (G)"
          >
            <Grid className="w-3 h-3" />
            <span className="hidden sm:inline">GRID</span>
          </button>

          {/* Optical Inspector */}
          <button
            onClick={onOpenInspector}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all"
            title="Director Optical Inspector (E)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Monitor */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white cursor-pointer transition-all active:scale-95"
            title="Toggle Cinema Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
