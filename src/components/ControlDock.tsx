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
  Music,
  Layers
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
  onToggleSnapToBeat?: (nextState?: boolean) => void;
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
  isZenMode?: boolean;
  playbackMode?: 'solo' | 'sequence' | string;
  onSelectPlaybackMode?: (mode: 'solo' | 'sequence') => void;
  onStepFrame?: (forward: boolean) => void;
  isTelemetryRackOpen?: boolean;
  onToggleTelemetryRack?: () => void;
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
  isSnapToBeat,
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
  onToggleZen,
  isZenMode = false,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  onStepFrame,
  isTelemetryRackOpen = false,
  onToggleTelemetryRack
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [isFreqVisualizerOpen, setIsFreqVisualizerOpen] = useState(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const [effectiveSnapToBeat, setEffectiveSnapToBeat] = useState<boolean>(
    () => isSnapToBeat ?? audioEngine.getIsSnapToBeatEnabled()
  );

  useEffect(() => {
    if (typeof isSnapToBeat === 'boolean') {
      setEffectiveSnapToBeat(isSnapToBeat);
      audioEngine.setSnapToBeatEnabled(isSnapToBeat);
    }
  }, [isSnapToBeat]);

  const handleSnapToBeatToggle = () => {
    const nextSnap = audioEngine.toggleSnapToBeat();
    setEffectiveSnapToBeat(nextSnap);
    onToggleSnapToBeat?.(nextSnap);
  };
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

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [quickTitleInput, setQuickTitleInput] = useState('');
  const [quickBengaliInput, setQuickBengaliInput] = useState('');

  const safeFrames = Array.isArray(frames) && frames.length > 0 ? frames : [];
  const currentFrame = safeFrames[currentIndex] || safeFrames[0];
  const currentDurationSec = getShotDurationSec(currentFrame, 12.0);
  const currentFps = getShotTargetFps(currentFrame, 24);
  const intervalSeconds = (calculateSlideshowInterval(speed) / 1000).toFixed(1);

  // Sync quick title input when current frame changes
  useEffect(() => {
    if (currentFrame) {
      setQuickTitleInput(currentFrame.title || '');
      setQuickBengaliInput(currentFrame.bengaliTitle || '');
    }
  }, [currentIndex, currentFrame?.title, currentFrame?.bengaliTitle]);

  const handleSaveQuickTitle = () => {
    if (onUpdateFrameAtIndex && currentFrame) {
      onUpdateFrameAtIndex(currentIndex, {
        ...currentFrame,
        title: quickTitleInput,
        bengaliTitle: quickBengaliInput
      });
    }
    setIsEditingTitle(false);
  };

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
      effectiveSnapToBeat || Boolean(targetFrame.beatSnapEnabled) || audioEngine.getIsSnapToBeatEnabled();

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
    <div
      style={{ bottom: '4px', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="fixed inset-x-0 z-40 flex flex-col items-center pointer-events-none px-1 sm:px-2 transition-all duration-200 ease-out opacity-100"
    >
      {/* Floating Real-Time Drag Handle Tooltip */}
      {dragShotState && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.max(80, Math.min(window.innerWidth - 180, dragShotState.clientX - 70))}px`,
            top: `${Math.max(24, dragShotState.clientY - 42)}px`,
            zIndex: 9999
          }}
          className="px-2 py-0.5 rounded-md bg-black/95 border border-[#F5A623] text-[9.5px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.9)] pointer-events-none tabular-nums"
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
          className="w-48 bg-[#090A10]/95 backdrop-blur-xl border border-[#D4AF37]/55 rounded-[4px] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.95)] pointer-events-none select-none transform-gpu animate-in fade-in zoom-in-95 duration-150"
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
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex items-end justify-between px-1.5 pb-0.5 font-mono text-[8px] tabular-nums">
              <span className="font-bold text-[#FFE066]">
                #{String(hoveredPreviewData.shotNumber).padStart(3, '0')}
              </span>
              <span className="text-zinc-300">
                {hoveredPreviewData.startTimecode}
              </span>
            </div>
          </div>

          {/* Frame Title, Bengali Subtitle & Hold Duration */}
          <div className="pt-1 px-0.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[9.5px] font-semibold text-white truncate">
                {hoveredPreviewData.frame.title || `Frame ${hoveredPreviewData.shotNumber}`}
              </span>
              <span className="text-[8.5px] font-mono text-[#D4AF37] tabular-nums shrink-0">
                {formatDurationPillValue(hoveredPreviewData.holdSec)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5 text-[8px] text-zinc-400">
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
      <div className="w-full max-w-[min(99vw,1880px)] mb-0.5 pointer-events-auto flex items-center gap-1 sm:gap-1.5">
        <button
          onClick={onPrev}
          aria-label="Previous Shot (J)"
          title="Previous Shot (J / Left Arrow)"
          className="h-5.5 w-5 sm:w-5.5 p-0.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95 flex items-center justify-center"
        >
          <ChevronLeft className="w-2.5 h-2.5" />
        </button>

        <div
          ref={stripRef}
          onMouseLeave={() => setHoveredMarker(null)}
          className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 px-1 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-md no-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.85)] scroll-smooth h-5 sm:h-5.5"
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
                className={`group relative shrink-0 w-8.5 sm:w-9.5 h-4.5 sm:h-5 rounded-[2px] overflow-hidden flex items-center justify-center cursor-pointer select-none transition-all duration-200 ease-out will-change-transform border ${
                  isActive
                    ? 'border-[#FFE066] ring-1 ring-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.75)] scale-105 z-20'
                    : hasMedia
                    ? 'border-white/20 hover:border-[#FFE066]/90 hover:scale-105 bg-[#121218] opacity-85 hover:opacity-100'
                    : 'border-white/10 hover:border-white/30 hover:scale-105 bg-[#0e0e14] opacity-75 hover:opacity-100'
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
                    <Camera className="w-2.5 h-2.5 text-white/20 group-hover:text-amber-400/50 transition-colors pointer-events-none" />
                  </div>
                )}

                {/* Contrast shade overlay */}
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/20 transition-colors pointer-events-none" />

                {/* Floating Real-Time Relative Timecode / Duration Overlay Badge */}
                <div
                  className={`absolute top-0.5 inset-x-0.5 z-20 flex items-center justify-between px-0.5 py-0 rounded-[1px] backdrop-blur-md transition-all duration-150 pointer-events-none ${
                    isActive
                      ? 'bg-black/90 border border-[#FFE066] text-[#FFE066] shadow-[0_0_6px_rgba(245,166,35,0.7)]'
                      : 'bg-black/75 border border-white/10 text-white/60 opacity-85 group-hover:opacity-100'
                  }`}
                >
                  <span className="text-[5.5px] sm:text-[6px] font-mono font-bold tracking-tight leading-none tabular-nums">
                    {isActive && isPlaying ? relativeTc : formatDurationPillValue(holdSec)}
                  </span>
                </div>

                {/* Real-Time Slide Progress Baseline */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-black/80 overflow-hidden pointer-events-none z-20">
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
                  <span className="absolute bottom-0 inset-x-0 h-[1.5px] bg-[#D4AF37]/80 pointer-events-none" />
                )}

                {/* Number overlay */}
                <span
                  className={`relative z-10 font-mono transition-all duration-200 pointer-events-none select-none mt-1 tabular-nums ${
                    isActive
                      ? 'text-[#FFE066] font-black text-[9.5px] scale-110 drop-shadow-[0_0_6px_rgba(245,166,35,0.95)]'
                      : 'text-white/80 text-[8.5px] font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] group-hover:scale-115 group-hover:text-[#FFE066] group-hover:font-black'
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
                    className={`absolute top-0 bottom-0 right-0 w-1 z-30 cursor-ew-resize transition-colors ${
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
          className="h-5 w-5 sm:w-5.5 p-0.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95 flex items-center justify-center"
        >
          <ChevronRight className="w-2.5 h-2.5" />
        </button>

        {/* Sequence Bar Quick Actions: Ripple Duration & Beat Match */}
        {onApplyDurationToAll && (
          <button
            type="button"
            onClick={() => onApplyDurationToAll(currentDurationSec)}
            title={`Ripple Apply ${formatDurationPillValue(currentDurationSec)} to All Shots`}
            className="hidden md:flex items-center gap-1 h-5 px-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/75 hover:text-[#FFE066] text-[7.5px] font-mono-tech cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <Repeat className="w-2 h-2 text-[#D4AF37]" />
            <span>Ripple All</span>
          </button>
        )}

        {onMatchAudioBeats && (
          <button
            type="button"
            onClick={onMatchAudioBeats}
            title="Match Audio Waveform Beats across all shots"
            className="hidden lg:flex items-center gap-1 h-5 px-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-cyan-400 text-white/75 hover:text-cyan-200 text-[7.5px] font-mono-tech cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <Music className="w-2 h-2 text-cyan-400" />
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
            className="w-9 sm:w-10 h-5 bg-black/85 border border-white/20 focus:border-[#D4AF37] text-white text-[7.5px] font-mono-tech px-1 rounded-[2px] text-center outline-none transition-colors tabular-nums"
            title="Type shot number and press Enter to jump"
          />
        </form>
      </div>

      {/* Real-time Audio Frequency Visualizer Floating Overlay */}
      {isFreqVisualizerOpen && (
        <div className="animate-hud-fade-in w-full max-w-5xl mb-2 pointer-events-auto">
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
        <div className="animate-hud-fade-in w-full max-w-md mb-2 pointer-events-auto">
          <MultiLayerZoomControls
            onClose={() => setIsZoomControlsOpen(false)}
          />
        </div>
      )}

      {/* Main Transport & Optics Toolbar */}
      <div className="relative w-full max-w-[min(99vw,1880px)] h-[28px] sm:h-[30px] min-h-[28px] max-h-[30px] pointer-events-auto bg-black/92 backdrop-blur-2xl border border-white/10 rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.95)] px-1 sm:px-1.5 flex flex-row items-center justify-between flex-nowrap gap-1 sm:gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar text-[8px] font-mono-tech select-none">
        {/* Subtle Ambient Gold Audio Reactivity Edge */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent pointer-events-none shadow-[0_0_8px_rgba(212,175,55,0.4)]" />

        {/* ======================================================= */}
        {/* 1. LEFT WING: PLAY/PAUSE, STEP BUTTONS & SMPTE CLOCK */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Circular Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Loop' : 'Play Loop'}
            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
              isPlaying
                ? 'bg-gradient-to-r from-amber-500 to-[#F5A623] text-black ring-1 ring-amber-500/30 shadow-[0_0_8px_rgba(245,166,35,0.6)]'
                : 'bg-[#e50914] hover:bg-[#ff1e2b] text-white ring-1 ring-red-500/30 shadow-[0_0_8px_rgba(229,9,20,0.6)]'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-2.5 h-2.5 fill-current" />
            ) : (
              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Frame Step Controls (-1F / +1F) */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (onStepFrame) onStepFrame(false);
                else onPrev();
              }}
              className="h-5 px-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white font-mono text-[7px] font-bold transition-all cursor-pointer"
              title="Step Backward 1 Frame (Left Arrow)"
            >
              -1F
            </button>
            <button
              type="button"
              onClick={() => {
                if (onStepFrame) onStepFrame(true);
                else onNext();
              }}
              className="h-5 px-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white font-mono text-[7px] font-bold transition-all cursor-pointer"
              title="Step Forward 1 Frame (Right Arrow)"
            >
              +1F
            </button>
          </div>

          {/* Monospace SMPTE Timecode Badge */}
          <div
            className="flex items-center gap-1 h-5 px-1.5 rounded bg-black/90 border border-white/15 text-[7.5px] font-mono shrink-0 whitespace-nowrap shadow-inner tabular-nums"
            title={`Sequence SMPTE Timecode (HH:MM:SS:FF) at ${currentFps} FPS`}
          >
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-white/40 text-[7px] font-bold">TC</span>
            <span className="text-amber-400 font-bold tracking-wider text-[8.5px]">{tcString}</span>
            <span className="text-zinc-500 text-[7px]">/</span>
            <span className="text-zinc-300 font-bold text-[7.5px]">{currentDurationSec.toFixed(1)}s</span>
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
              isSnapToBeat={effectiveSnapToBeat}
              onToggleSnapToBeat={() => handleSnapToBeatToggle()}
              compact
            />
          )}
        </div>

        {/* ======================================================= */}
        {/* 2. CENTER WING: [ SOLO | MASTER ] POD, BEAT-SNAP & SPEED */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1 shrink-0">
          {/* SOLO / MASTER Segmented Command Hub */}
          <div className="flex items-center h-5 p-0.5 bg-black/90 rounded border border-white/20 shadow-inner">
            {/* SOLO Button */}
            <button
              type="button"
              onClick={() => onSelectPlaybackMode?.('solo')}
              style={
                playbackMode === 'solo'
                  ? {
                      border: '1px solid #00f0ff',
                      background: 'rgba(0, 240, 255, 0.18)',
                      color: '#00f0ff',
                      fontWeight: 800,
                      boxShadow: '0 0 8px rgba(0, 240, 255, 0.5)'
                    }
                  : undefined
              }
              className={`h-4 px-1 rounded font-mono text-[7px] uppercase flex items-center gap-0.5 transition-all cursor-pointer ${
                playbackMode === 'solo' ? '' : 'text-zinc-400 hover:text-white'
              }`}
              title="SOLO MODE: Lock playback strictly into isolated active shot"
            >
              <span className={`w-1 h-1 rounded-full ${playbackMode === 'solo' ? 'bg-[#00f0ff] animate-ping' : 'bg-zinc-600'}`} />
              <span>SOLO</span>
            </button>

            {/* MASTER Button */}
            <button
              type="button"
              onClick={() => onSelectPlaybackMode?.('sequence')}
              style={
                playbackMode !== 'solo'
                  ? {
                      border: '1px solid #ffaa00',
                      background: 'rgba(255, 170, 0, 0.22)',
                      color: '#ffaa00',
                      fontWeight: 800,
                      boxShadow: '0 0 8px rgba(255, 170, 0, 0.5)'
                    }
                  : undefined
              }
              className={`h-4 px-1 rounded font-mono text-[7px] uppercase flex items-center gap-0.5 transition-all cursor-pointer ${
                playbackMode !== 'solo' ? '' : 'text-zinc-400 hover:text-white'
              }`}
              title="MASTER MODE: Continuous narrative playback across full sequence"
            >
              <span className={`w-1 h-1 rounded-full ${playbackMode !== 'solo' ? 'bg-[#ffaa00] animate-pulse' : 'bg-zinc-600'}`} />
              <span>MASTER</span>
            </button>
          </div>

          {/* Dedicated Beat-Snap Waveform Toggle Button */}
          <button
            type="button"
            data-testid="control-dock-snap-to-beat"
            aria-pressed={effectiveSnapToBeat}
            aria-label="Toggle Snap to Beat"
            onClick={handleSnapToBeatToggle}
            title={
              effectiveSnapToBeat
                ? 'Snap to Beat: ON — Cuts quantize to audio transients'
                : 'Snap to Beat: OFF — Click to quantize cuts to audio transients'
            }
            className={`h-5 px-1 sm:px-1.5 rounded border text-[7px] sm:text-[7.5px] font-mono flex items-center gap-0.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              effectiveSnapToBeat
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-[0_0_6px_rgba(245,166,35,0.4)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-amber-300 hover:border-amber-400/50'
            }`}
          >
            <Music
              className={`w-2 h-2 shrink-0 transition-colors ${
                effectiveSnapToBeat ? 'text-amber-300' : 'text-amber-400'
              }`}
            />
            <span className="hidden sm:inline">♫ BEAT</span>
            <span
              className={`px-0.5 rounded text-[6.5px] font-mono tabular-nums transition-colors ${
                effectiveSnapToBeat
                  ? 'bg-amber-400 text-black font-black'
                  : 'bg-white/10 text-white/45'
              }`}
            >
              {effectiveSnapToBeat ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Pace & Speed Slider */}
          <div className="hidden xl:flex items-center gap-1 h-5 bg-black/60 px-1 rounded border border-white/10 font-mono text-[7px] text-zinc-400 shrink-0">
            <span className="text-[6.5px] text-white/50 uppercase tracking-wider">SPEED</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-6 sm:w-8 accent-[#F5A623] cursor-pointer h-1 bg-white/20 rounded shrink-0"
              title={`Playback tempo scalar (${intervalSeconds}s ref)`}
            />
            <span className="text-amber-400 font-bold tabular-nums text-[7px]">{intervalSeconds}s</span>
          </div>

          {/* Pan Tool */}
          {onTogglePan && (
            <button
              onClick={onTogglePan}
              className={`h-5 px-1 rounded border text-[7px] sm:text-[7.5px] font-mono flex items-center gap-0.5 cursor-pointer transition-all shrink-0 ${
                isPanActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-[0_0_6px_rgba(245,166,35,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Interactive Vertical Alignment Pan Tool (P / Y)"
            >
              <Move className="w-2 h-2 text-amber-400" />
              <span className="hidden sm:inline">PAN</span>
              <span className="text-[6.5px] opacity-75">{panOffsetPercent}%</span>
            </button>
          )}

          {/* Canvas Warp / Liquify */}
          {onOpenLiquify && (
            <button
              onClick={onOpenLiquify}
              className="h-5 px-1 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-amber-300 text-[7px] sm:text-[7.5px] font-mono flex items-center gap-0.5 cursor-pointer transition-all shrink-0"
              title="HTML5 Canvas Liquify & Mesh Warp Studio (W)"
            >
              <Wand2 className="w-2 h-2 text-amber-400" />
              <span className="hidden sm:inline">WARP</span>
            </button>
          )}
        </div>

        {/* ======================================================= */}
        {/* 3. RIGHT WING: TITLES, ZEN, OPTICS & TOOLS */}
        {/* ======================================================= */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Easy Change Title & Titles ON/OFF Hub */}
          <div className="relative flex items-center bg-black/90 border border-white/20 rounded p-0.5 shadow-inner shrink-0">
            {/* Master Titles ON/OFF Toggle Button */}
            {onToggleTitles && (
              <button
                type="button"
                onClick={onToggleTitles}
                className={`h-4 px-1 rounded font-mono text-[7px] font-bold flex items-center gap-0.5 transition-all cursor-pointer shrink-0 ${
                  showTitles
                    ? 'bg-amber-500/25 border border-amber-400 text-amber-300 shadow-[0_0_6px_rgba(245,166,35,0.4)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Toggle Creative Kinetic Titles Layer On/Off"
              >
                <span className={`w-1 h-1 rounded-full ${showTitles ? 'bg-amber-400 shadow-[0_0_4px_#f5a623]' : 'bg-zinc-600'}`} />
                <Type className="w-2 h-2" />
                <span>TITLES {showTitles ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Quick Title Edit Trigger */}
            <button
              type="button"
              onClick={() => setIsEditingTitle(prev => !prev)}
              className={`h-4 px-1 rounded font-mono text-[7px] transition-all cursor-pointer flex items-center gap-0.5 max-w-[60px] sm:max-w-[75px] truncate ${
                isEditingTitle
                  ? 'bg-white/20 text-white font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Click to quickly rename Shot Title and Bengali Subtitle"
            >
              <span className="text-amber-400 text-[7px]">✏️</span>
              <span className="truncate">{currentFrame?.title || 'Edit'}</span>
            </button>

            {/* Inline Title Quick Edit Popover */}
            {isEditingTitle && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-neutral-950/98 backdrop-blur-2xl border border-white/20 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-zinc-400 border-b border-white/10 pb-1.5 text-[10px] uppercase font-bold tracking-wider">
                  <span>QUICK EDIT TITLES</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">English Title</label>
                  <input
                    type="text"
                    value={quickTitleInput}
                    onChange={(e) => setQuickTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuickTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    placeholder="Scene Title..."
                    className="w-full h-8 px-2.5 bg-black/80 border border-white/15 focus:border-amber-400 rounded text-xs text-white outline-none"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Bangla Subtitle</label>
                  <input
                    type="text"
                    value={quickBengaliInput}
                    onChange={(e) => setQuickBengaliInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuickTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    placeholder="বাংলা শিরোনাম..."
                    className="w-full h-8 px-2.5 bg-black/80 border border-white/15 focus:border-cyan-400 rounded text-xs font-bangla text-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickTitle}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px]"
                  >
                    Save Titles
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aspect Ratio Selector Dropdown */}
          <select
            value={aspectRatio}
            onChange={(e) => onChangeAspectRatio(e.target.value)}
            className="h-5 px-1 rounded bg-black/85 border border-white/15 text-white font-mono text-[7px] sm:text-[7.5px] font-bold outline-none cursor-pointer hover:border-amber-400/50 focus:border-amber-400 transition-colors shrink-0"
            title="Aspect Ratio"
          >
            <option value="2.39:1">2.39:1</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
          </select>

          {/* LUT Preset Selector */}
          <select
            value={currentFrame?.lutFilter || 'cinematic'}
            onChange={(e) => onChangeLut(e.target.value as LutPreset)}
            className="hidden sm:block h-5 px-1 bg-black/85 border border-white/15 rounded text-[7px] sm:text-[7.5px] text-amber-300 font-mono outline-none cursor-pointer focus:border-amber-400 shrink-0 max-w-[68px] truncate"
          >
            {LUT_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#101014] text-white">
                {p.label}
              </option>
            ))}
          </select>

          {/* Zen Focus Mode Button */}
          {onToggleZen && (
            <button
              type="button"
              onClick={onToggleZen}
              className={`h-5 px-1 rounded border font-mono text-[7px] font-bold flex items-center gap-0.5 cursor-pointer transition-all shrink-0 ${
                isZenMode
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_6px_rgba(0,240,255,0.45)]'
                  : 'bg-black/60 border-white/15 text-zinc-400 hover:text-cyan-300 hover:border-cyan-400/50'
              }`}
              title="Zen Focus Mode: Distraction-free clean viewport (Z)"
            >
              <span className="text-[7.5px]">⛶</span>
              <span className="hidden sm:inline">ZEN</span>
            </button>
          )}

          {/* Stage HUD Overlay Toggle */}
          <button
            type="button"
            data-testid="control-dock-hud-toggle"
            aria-pressed={showHud}
            aria-label="Toggle Stage HUD (H)"
            onClick={onToggleHud}
            className={`h-5 w-5 p-0.5 rounded-[2px] border cursor-pointer transition-all shrink-0 flex items-center justify-center ${
              showHud
                ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_6px_rgba(212,175,55,0.3)]'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title={`Toggle Stage HUD Overlay (H) — ${showHud ? 'ON' : 'OFF'}`}
          >
            <Eye className="w-2.5 h-2.5" />
          </button>

          {/* Thirds Guides */}
          {onToggleGuides && (
            <button
              onClick={onToggleGuides}
              className={`h-5 w-5 p-0.5 rounded-[2px] border cursor-pointer transition-all shrink-0 flex items-center justify-center ${
                showGuides
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_6px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Toggle Rule of Thirds & Crosshair Guides (C)"
            >
              <Crosshair className="w-2.5 h-2.5" />
            </button>
          )}

          {/* Capture Still */}
          {onCaptureStill && (
            <button
              onClick={onCaptureStill}
              className="h-5 w-5 p-0.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
              title="Capture High-Res Cinema Still PNG (S)"
            >
              <Camera className="w-2.5 h-2.5" />
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
            className={`h-5 px-1 rounded-[2px] border text-[7px] sm:text-[7.5px] font-mono-tech flex items-center gap-0.5 cursor-pointer transition-all shrink-0 ${
              isFreqVisualizerOpen
                ? 'bg-[#D4AF37]/30 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_6px_rgba(212,175,55,0.45)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-[#FFE066] hover:border-[#D4AF37]/50'
            }`}
            title="Toggle Real-Time Audio Frequency Visualizer Overlay"
            aria-label="Toggle Audio Frequency Visualizer"
          >
            <Activity className="w-2 h-2 text-[#FFE066]" />
            <span className="hidden sm:inline">FREQ</span>
            <span className="w-1 h-1 rounded-full bg-[#FFE066] animate-pulse" />
          </button>

          {/* Multi-Layer Zoom HUD Button */}
          <button
            type="button"
            onClick={() => setIsZoomControlsOpen((prev) => !prev)}
            className={`h-5 px-1 rounded-[2px] border text-[7px] sm:text-[7.5px] font-mono-tech flex items-center gap-0.5 cursor-pointer transition-all shrink-0 ${
              isZoomControlsOpen
                ? 'bg-[#D4AF37]/30 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_6px_rgba(212,175,55,0.45)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-[#FFE066] hover:border-[#D4AF37]/50'
            }`}
            title="Multi-Layer Zoom: Scale Foreground & Background independently"
            aria-label="Toggle Multi-Layer Zoom Controls"
          >
            <ZoomIn className="w-2 h-2 text-[#D4AF37]" />
            <span className="hidden sm:inline">ZOOM</span>
            <span className="text-[6.5px] text-[#FFE066] font-bold tabular-nums">
              {fgZoom.toFixed(1)}x
            </span>
          </button>

          {/* Modular Telemetry Rack */}
          {onToggleTelemetryRack && (
            <button
              type="button"
              onClick={onToggleTelemetryRack}
              className={`h-5 px-1 rounded-[2px] border text-[7px] sm:text-[7.5px] font-mono-tech flex items-center gap-0.5 cursor-pointer transition-all shrink-0 ${
                isTelemetryRackOpen
                  ? 'bg-[#2dd4bf]/25 border-[#2dd4bf] text-[#2dd4bf] font-bold shadow-[0_0_6px_rgba(45,212,191,0.45)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-[#2dd4bf] hover:border-[#2dd4bf]/50'
              }`}
              title="Toggle Modular Telemetry Rack: Audio-Reactive Sync, Voiceover/Subtitles & 3D LUT Engine"
              aria-label="Toggle Modular Telemetry Rack"
            >
              <Layers className="w-2 h-2 text-[#2dd4bf]" />
              <span className="hidden sm:inline">RACK</span>
              <span className="text-[6.5px] px-0.5 rounded bg-[#2dd4bf]/20 text-[#2dd4bf] font-bold">3P</span>
            </button>
          )}

          {/* Grid / Contact Sheet */}
          <button
            onClick={onToggleViewMode}
            className={`h-5 px-1 rounded-[2px] border flex items-center gap-0.5 cursor-pointer transition-all text-[7px] sm:text-[7.5px] shrink-0 ${
              viewMode === 'grid'
                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="100-Frame Contact Sheet (G)"
          >
            <Grid className="w-2 h-2" />
            <span className="hidden sm:inline">GRID</span>
          </button>

          {/* Optical Inspector */}
          <button
            onClick={onOpenInspector}
            className="h-5 w-5 p-0.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all shrink-0 flex items-center justify-center"
            title="Director Optical Inspector (E)"
          >
            <Sliders className="w-2.5 h-2.5" />
          </button>

          {/* Fullscreen Monitor */}
          <button
            onClick={onToggleFullscreen}
            className="h-5 w-5 p-0.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
            title="Toggle Cinema Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-2.5 h-2.5" /> : <Maximize2 className="w-2.5 h-2.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
