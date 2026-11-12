/**
 * @file /src/components/ControlDock.tsx
 * @description Master Tactical Bottom Control Dock for HANDFILM Cinema Engine.
 * Features 100-shot thumbnail strip, precision transport, pace slider, aspect toggle,
 * LUT selector, and futuristic tactile HUD controls.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Camera,
  Crosshair,
  Eye,
  Type,
  Repeat,
  Music,
  RotateCcw,
  Pencil,
  Focus,
  Film,
  Zap
} from 'lucide-react';
import { ToolTooltip } from './ui/ToolTooltip';
import { TrackVuMeter } from './audio/TrackVuMeter';
import { AudioFrequencyVisualizer } from './audio/AudioFrequencyVisualizer';
import { MultiLayerZoomControls } from './optics/MultiLayerZoomControls';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';
import { CockpitDispatchTarget, CockpitShotBridge } from '../types/cockpit';
import { dispatchToExternalApp, captureCompositeCanvasPng } from '../utils/interchangeExport';
import { getLightingPresetById } from '../data/lightingPresets';

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
  onResetZoom?: () => void;
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
  onResetZoom,
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
  onStepFrame
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [isFreqVisualizerOpen, setIsFreqVisualizerOpen] = useState(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const [effectiveSnapToBeat, setEffectiveSnapToBeat] = useState<boolean>(
    () => isSnapToBeat ?? audioEngine.getIsSnapToBeatEnabled()
  );

  useEffect(() => {
    const unsubSpectrum = eventBus.on('cockpit:toggle_spectrum', () => {
      setIsFreqVisualizerOpen((prev) => !prev);
    });
    const unsubZoom = eventBus.on('cockpit:toggle_zoom', () => {
      setIsZoomControlsOpen((prev) => !prev);
    });
    return () => {
      unsubSpectrum();
      unsubZoom();
    };
  }, []);

  useEffect(() => {
    eventBus.emit('cockpit:spectrum_state', isFreqVisualizerOpen);
  }, [isFreqVisualizerOpen]);

  useEffect(() => {
    eventBus.emit('cockpit:zoom_state', isZoomControlsOpen);
  }, [isZoomControlsOpen]);

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
  const digitalZoom = useStudioStore((s) => s.digitalZoom);
  const resetDigitalZoomStore = useStudioStore((s) => s.resetDigitalZoom);

  const isAnyZoomActive = Boolean(
    (digitalZoom && digitalZoom.isZoomed && digitalZoom.scale > 1.01) ||
    fgZoom !== 1.0 ||
    bgZoom !== 1.0
  );

  const handleResetAllZoom = () => {
    if (onResetZoom) {
      onResetZoom();
    }
    resetDigitalZoomStore();
  };

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

  // Director's Cockpit — Bridge Shots Manifest & Floating Dispatch HUD State
  const [dispatchHudAnchor, setDispatchHudAnchor] = useState<{
    idx: number;
    left: number;
    top: number;
  } | null>(null);
  const [cockpitToast, setCockpitToast] = useState<string | null>(null);

  const allCockpitShots = useMemo<CockpitShotBridge[]>(() => {
    return safeFrames.map((f, idx) => {
      const dur = getShotDurationSec(f, 12.0);
      const startSec = shotOffsets[idx]?.startSec ?? idx * 12.0;
      const lightName = f?.lightId ? getLightingPresetById(f.lightId)?.name : undefined;
      return {
        shotId: `shot_${String(idx + 1).padStart(2, '0')}`,
        shotNumber: idx + 1,
        titleEn: f?.title || `Shot ${idx + 1}`,
        titleBn: f?.bengaliTitle || '',
        titleText: [f?.bengaliTitle, f?.title].filter(Boolean).join(' // ') || `Shot ${idx + 1}`,
        personality: 'KINETIC',
        inPoint: startSec,
        outPoint: startSec + dur,
        durationSec: dur,
        mediaUrl: f?.videoSrc || f?.imageUrl,
        lutFilter: f?.lutFilter,
        lensSpec: f?.cameraSpec?.focalLength,
        directorNotes: f?.directorNotes,
        lightId: f?.lightId,
        lightName
      };
    });
  }, [safeFrames, shotOffsets]);

  const showCockpitFeedback = useCallback((msg: string) => {
    setCockpitToast(msg);
    eventBus.emit('cockpit:feedback', msg);
    setTimeout(() => setCockpitToast(null), 4000);
  }, []);

  const captureShotFrameForDispatch = useCallback(
    async (shotIdx: number): Promise<string | undefined> => {
      if (shotIdx === currentIndex && typeof document !== 'undefined') {
        const liveCanvas =
          (document.getElementById('stage-canvas') as HTMLCanvasElement | null) ||
          (document.querySelector('main canvas') as HTMLCanvasElement | null);
        const livePng = captureCompositeCanvasPng(liveCanvas);
        if (livePng) return livePng;
      }

      const target = safeFrames[shotIdx];
      if (!target || typeof document === 'undefined') return undefined;

      const offscreen = document.createElement('canvas');
      offscreen.width = 1920;
      offscreen.height = 1080;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return undefined;

      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, 1920, 1080);

      const srcUrl = target.thumbnailUrl || target.thumbnail || target.imageUrl;
      if (srcUrl && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(srcUrl)) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              ctx.drawImage(img, 0, 0, 1920, 1080);
            } catch {}
            resolve();
          };
          img.onerror = () => resolve();
          img.src = srcUrl;
        });
      }

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 24, 1872, 1032);
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 28px JetBrains Mono, monospace';
      ctx.fillText(
        `HANDFILM // #${String(shotIdx + 1).padStart(2, '0')} ${target.title || ''}`,
        48,
        72
      );

      return captureCompositeCanvasPng(offscreen) ?? undefined;
    },
    [currentIndex, safeFrames]
  );

  const handleDispatchToTool = useCallback(
    async (target: CockpitDispatchTarget, shotIdx: number) => {
      const targetShot = allCockpitShots[shotIdx] || allCockpitShots[0];
      if (!targetShot) return;

      const stageCanvas =
        typeof document !== 'undefined'
          ? ((document.getElementById('stage-canvas') as HTMLCanvasElement | null) ||
            (document.querySelector('main canvas') as HTMLCanvasElement | null))
          : null;

      const base64Frame =
        target === 'photoshop' || target === 'illustrator'
          ? await captureShotFrameForDispatch(shotIdx)
          : undefined;

      const result = await dispatchToExternalApp({
        appName: target,
        shot: targetShot,
        base64Frame,
        allShots: allCockpitShots,
        audioTrack: null,
        canvas: stageCanvas,
        fps: currentFps === 30 ? 30 : 24,
        projectName: 'HANDFILM_SEQUENCE'
      });

      showCockpitFeedback(result.message);
      setDispatchHudAnchor(null);
      try {
        audioEngine.playShutterClick();
      } catch {}
    },
    [allCockpitShots, captureShotFrameForDispatch, currentFps, showCockpitFeedback]
  );

  // Close Directorial Dispatch HUD on outside click, scroll, or Escape
  useEffect(() => {
    if (!dispatchHudAnchor) return;
    const handleDismiss = () => setDispatchHudAnchor(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDispatchHudAnchor(null);
    };
    window.addEventListener('mousedown', handleDismiss);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('keydown', handleKey);
    };
  }, [dispatchHudAnchor]);

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
  const shotWidthApprox = 122;
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
    if (dragShotState || dispatchHudAnchor) return;
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

      {/* 100-Frame Strip Navigation with Generous 112x64 Cards & Smooth Wheel Scroll */}
      <div className="w-full max-w-[min(99vw,1880px)] mb-1 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <ToolTooltip
          title="PREVIOUS SHOT"
          why="Jumps playhead backward to the preceding sequence shot"
          how="Click or press J / Left Arrow to step backward"
        >
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous Shot (J)"
            className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 backdrop-blur-md cursor-pointer transition-all shadow shrink-0 active:scale-95 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </ToolTooltip>

        <div
          ref={stripRef}
          onMouseLeave={() => setHoveredMarker(null)}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 flex items-center gap-2.5 px-3 py-1.5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar bg-black/85 backdrop-blur-2xl border border-white/10 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
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
            const shotBadge = `#${String(shotNumber).padStart(2, '0')}`;
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
                key={`shot-strip-${idx}-${frame?.id ?? 'none'}`}
                data-testid={`scrubber-index-marker-${idx}`}
                onClick={() => onSelectFrame(idx)}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLElement | null;
                  if (target?.closest?.('[data-dispatch-trigger="true"]')) return;
                  handleMarkerHoverEnter(idx, e.currentTarget);
                }}
                onMouseMove={(e) => {
                  const target = e.target as HTMLElement | null;
                  if (target?.closest?.('[data-dispatch-trigger="true"]')) {
                    if (hoveredMarker) setHoveredMarker(null);
                    return;
                  }
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
                className={`group relative min-w-[112px] w-[112px] h-[64px] flex-shrink-0 snap-start rounded-lg overflow-hidden flex flex-col justify-between cursor-pointer select-none transition-all duration-150 ease-out will-change-transform ${
                  isActive
                    ? 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-[1.02] z-20 bg-[#121218]'
                    : 'border border-neutral-800/90 opacity-80 hover:opacity-100 hover:border-neutral-600 bg-[#0e0e14]'
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
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.82] group-hover:brightness-100 transition-all duration-200 group-hover:scale-105"
                  />
                ) : hasMedia && isThumbnailVisible && isVideoMedia && frame?.imageUrl ? (
                  <video
                    src={frame.imageUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 w-full h-full object-cover filter brightness-[0.82] group-hover:brightness-100 pointer-events-none"
                  />
                ) : hasMedia ? (
                  <div className="absolute inset-0 bg-[#12121a] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]/40 pointer-events-none" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#161722] via-[#0e0f16] to-[#08080e] flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white/20 group-hover:text-amber-400/50 transition-colors pointer-events-none" />
                  </div>
                )}

                {/* Contrast scrim overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/55 pointer-events-none" />

                {/* Top Metadata Bar: #01 + Duration / Relative TC (leaves room for top-right dispatch button) */}
                <div className="relative z-10 pl-1.5 pr-7 pt-1 flex items-center justify-between gap-1 font-mono pointer-events-none">
                  <span
                    className={`px-1 py-0.5 rounded text-[9px] font-black leading-none tabular-nums ${
                      isActive ? 'bg-amber-400 text-black' : 'bg-black/80 text-white'
                    }`}
                  >
                    {shotBadge}
                  </span>
                  <span
                    className={`px-1 py-0.5 rounded text-[8.5px] font-bold leading-none tabular-nums ${
                      isActive
                        ? 'bg-black/90 border border-amber-400/70 text-amber-300'
                        : 'bg-black/75 text-zinc-300'
                    }`}
                  >
                    {isActive && isPlaying ? relativeTc : formatDurationPillValue(holdSec)}
                  </span>
                </div>

                {/* Top-Right Always-Visible Directorial Dispatch Trigger (⚡) */}
                <button
                  type="button"
                  data-dispatch-trigger="true"
                  data-testid={`shot-dispatch-trigger-${idx}`}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredMarker(null);
                  }}
                  onMouseMove={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredMarker(null);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDispatchHudAnchor((prev) =>
                      prev?.idx === idx
                        ? null
                        : { idx, left: rect.left + rect.width / 2, top: rect.top }
                    );
                  }}
                  title={`Dispatch Shot ${shotBadge} to Photoshop / Premiere / CapCut`}
                  aria-label={`Dispatch Shot ${shotNumber} to External Studio`}
                  className="absolute top-1 right-2 z-30 bg-amber-500 text-black font-bold w-5 h-5 rounded-sm flex items-center justify-center text-[11px] shadow hover:bg-amber-400 active:scale-95 transition-all cursor-pointer"
                >
                  ⚡
                </button>

                {/* Bottom Metadata Bar: Title/Bangla Label + Active Light Badge */}
                <div className="relative z-10 px-1.5 pb-1 flex items-center justify-between gap-1 font-mono pointer-events-none">
                  <span className="text-[9px] font-semibold text-white truncate leading-none drop-shadow">
                    {bn || title}
                  </span>
                  {frame?.lutFilter && (
                    <span className="px-1 py-0.5 rounded bg-black/75 text-[7.5px] text-amber-300 font-bold uppercase leading-none shrink-0">
                      {frame.lutFilter.slice(0, 3)}
                    </span>
                  )}
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

        <ToolTooltip
          title="NEXT SHOT"
          why="Advances playhead forward to the next sequence shot"
          how="Click or press L / Right Arrow to step forward"
        >
          <button
            type="button"
            onClick={onNext}
            aria-label="Next Shot (L)"
            className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 backdrop-blur-md cursor-pointer transition-all shadow shrink-0 active:scale-95 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </ToolTooltip>

        {/* Sequence Bar Quick Actions: Ripple Duration & Beat Match (Icon-First + Tooltips) */}
        {onApplyDurationToAll && (
          <ToolTooltip
            title="RIPPLE SYNC"
            why="Applies current shot timing across the entire sequence"
            how={`Click to set all ${safeFrames.length} shots to ${formatDurationPillValue(currentDurationSec)}`}
          >
            <button
              type="button"
              onClick={() => onApplyDurationToAll(currentDurationSec)}
              aria-label="Ripple Apply Duration to All Shots"
              className="hidden md:flex p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </ToolTooltip>
        )}

        {onMatchAudioBeats && (
          <ToolTooltip
            title="MATCH AUDIO BEATS"
            why="Quantizes shot durations to detected audio waveform beats"
            how="Click to automatically align cuts across your soundtrack"
          >
            <button
              type="button"
              onClick={onMatchAudioBeats}
              aria-label="Match Audio Beats"
              className="hidden lg:flex p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-cyan-300 hover:text-cyan-200 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Music className="w-4 h-4" />
            </button>
          </ToolTooltip>
        )}

        <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center shrink-0">
          <input
            type="text"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={() => handleJumpSubmit()}
            placeholder={`#${currentIndex + 1}`}
            aria-label="Jump to Shot Number"
            className="w-11 h-8 bg-neutral-900/90 border border-neutral-800 focus:border-amber-400 text-white text-[10px] font-mono px-1.5 rounded text-center outline-none transition-colors tabular-nums"
            title="Type shot number and press Enter to jump"
          />
        </form>
      </div>

      {/* Spectral & Parallax Overlays (Hidden by default; portaled cleanly only when toggled from ⚡ COCKPIT) */}
      {isFreqVisualizerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[min(94vw,1024px)] z-[85] animate-hud-fade-in pointer-events-auto">
          <AudioFrequencyVisualizer
            isOpen={isFreqVisualizerOpen}
            onClose={() => setIsFreqVisualizerOpen(false)}
            isAudioMuted={isAudioMuted}
            onToggleAudio={onToggleAudio}
          />
        </div>,
        document.body
      )}

      {isZoomControlsOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[min(92vw,448px)] z-[85] animate-hud-fade-in pointer-events-auto">
          <MultiLayerZoomControls
            onClose={() => setIsZoomControlsOpen(false)}
          />
        </div>,
        document.body
      )}

      {/* Main Single-Row Iconic Transport & Optics Toolbar */}
      <div className="relative w-full max-w-[min(99vw,1880px)] h-[46px] min-h-[46px] pointer-events-auto bg-black/92 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.95)] px-2.5 sm:px-3 flex flex-row items-center justify-between flex-nowrap gap-2 overflow-x-auto overflow-y-hidden no-scrollbar text-xs font-mono-tech select-none">
        {/* Subtle Ambient Gold Audio Reactivity Edge */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent pointer-events-none shadow-[0_0_8px_rgba(212,175,55,0.4)]" />

        {/* ======================================================= */}
        {/* 1. LEFT WING: PLAY/PAUSE, STEP BUTTONS & SMPTE CLOCK */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Circular Play/Pause Button */}
          <ToolTooltip
            title="PLAYBACK TRANSPORT"
            why="Plays or pauses real-time sequence preview"
            how="Click or press Spacebar to start/stop playback"
          >
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause Loop' : 'Play Loop'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                isPlaying
                  ? 'bg-gradient-to-r from-amber-500 to-[#F5A623] text-black ring-2 ring-amber-500/30 shadow-[0_0_12px_rgba(245,166,35,0.6)]'
                  : 'bg-[#e50914] hover:bg-[#ff1e2b] text-white ring-2 ring-red-500/30 shadow-[0_0_12px_rgba(229,9,20,0.6)]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </ToolTooltip>

          {/* Frame Step Controls (-1F / +1F) */}
          <div className="flex items-center gap-1 shrink-0">
            <ToolTooltip
              title="STEP BACK 1 FRAME"
              why="Moves playhead backward one exact frame or shot"
              how="Click or press Left Arrow for frame precision"
            >
              <button
                type="button"
                onClick={() => {
                  if (onStepFrame) onStepFrame(false);
                  else onPrev();
                }}
                aria-label="Step Backward 1 Frame"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </ToolTooltip>

            <ToolTooltip
              title="STEP FORWARD 1 FRAME"
              why="Advances playhead forward one exact frame or shot"
              how="Click or press Right Arrow for frame precision"
            >
              <button
                type="button"
                onClick={() => {
                  if (onStepFrame) onStepFrame(true);
                  else onNext();
                }}
                aria-label="Step Forward 1 Frame"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </ToolTooltip>
          </div>

          {/* Monospace SMPTE Timecode Badge */}
          <ToolTooltip
            title="SMPTE TIMECODE"
            why="Displays cumulative timeline clock and shot duration"
            how={`Running at ${currentFps} FPS; drag card edges to adjust`}
          >
            <div className="flex items-center gap-1.5 h-8 px-2.5 rounded bg-neutral-900/90 border border-neutral-800 text-[10px] font-mono shrink-0 whitespace-nowrap shadow-inner tabular-nums">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 font-bold tracking-wider text-[11px]">{tcString}</span>
              <span className="text-zinc-600 text-[10px]">/</span>
              <span className="text-zinc-300 font-bold text-[10px]">{currentDurationSec.toFixed(1)}s</span>
            </div>
          </ToolTooltip>

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
        {/* 2. CENTER WING: [ SOLO | MASTER ], BEAT SNAP, SPEED, PAN, WARP */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* SOLO / MASTER Segmented Command Hub */}
          <ToolTooltip
            title="SOLO / MASTER MODE"
            why="Locks playback to active clip or plays continuous sequence"
            how="Pick SOLO for single-shot review, MASTER for full cut"
          >
            <div className="flex items-center h-8 p-0.5 bg-black/90 rounded border border-neutral-800 shadow-inner">
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
                        boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
                      }
                    : undefined
                }
                className={`h-6.5 px-2 rounded font-mono text-[10px] uppercase flex items-center gap-1 transition-all cursor-pointer ${
                  playbackMode === 'solo' ? '' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${playbackMode === 'solo' ? 'bg-[#00f0ff] animate-ping' : 'bg-zinc-600'}`} />
                <span>SOLO</span>
              </button>

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
                        boxShadow: '0 0 8px rgba(255, 170, 0, 0.4)'
                      }
                    : undefined
                }
                className={`h-6.5 px-2 rounded font-mono text-[10px] uppercase flex items-center gap-1 transition-all cursor-pointer ${
                  playbackMode !== 'solo' ? '' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${playbackMode !== 'solo' ? 'bg-[#ffaa00] animate-pulse' : 'bg-zinc-600'}`} />
                <span>MASTER</span>
              </button>
            </div>
          </ToolTooltip>

          {/* Dedicated Beat-Snap Waveform Toggle Icon Button */}
          <ToolTooltip
            title="AUDIO BEAT SNAP"
            why="Locks shot cuts and edge trims to music transients"
            how="Toggle on before dragging right edges of timeline cards"
          >
            <button
              type="button"
              data-testid="control-dock-snap-to-beat"
              aria-pressed={effectiveSnapToBeat}
              aria-label="Toggle Snap to Beat"
              onClick={handleSnapToBeatToggle}
              className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                effectiveSnapToBeat
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-amber-300'
              }`}
            >
              <Music className="w-4 h-4" />
            </button>
          </ToolTooltip>

          {/* Pace & Speed Slider with Compact Readout */}
          <ToolTooltip
            title="PLAYBACK PACING"
            why="Controls slideshow interval and transition tempo"
            how="Drag slider to tune shot hold cadence in seconds"
          >
            <div className="hidden xl:flex items-center gap-1.5 h-8 bg-neutral-900/90 px-2 rounded border border-neutral-800 hover:border-amber-400/60 font-mono text-[10px] text-zinc-400 shrink-0 transition-colors">
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                aria-label="Playback Tempo"
                className="w-10 accent-[#F5A623] cursor-pointer h-1 bg-white/20 rounded shrink-0"
              />
              <span className="text-amber-400 font-bold tabular-nums text-[10px]">{intervalSeconds}s</span>
            </div>
          </ToolTooltip>

          {/* Pan Tool Icon + Compact Percentage */}
          {onTogglePan && (
            <ToolTooltip
              title="VERTICAL FRAME PAN"
              why="Shifts vertical framing offset inside cropped aspect ratios"
              how="Click or press P / Y then drag vertically on stage"
            >
              <button
                type="button"
                onClick={onTogglePan}
                aria-label="Toggle Frame Pan Tool"
                aria-pressed={isPanActive}
                className={`p-2 rounded border flex items-center gap-1 font-mono text-[10px] font-bold cursor-pointer transition-all active:scale-95 shrink-0 ${
                  isPanActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,166,35,0.3)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white'
                }`}
              >
                <Move className="w-4 h-4 text-amber-400" />
                <span className="tabular-nums text-[9.5px]">{panOffsetPercent}%</span>
              </button>
            </ToolTooltip>
          )}

          {/* Canvas Warp / Liquify Icon */}
          {onOpenLiquify && (
            <ToolTooltip
              title="MESH WARP & LIQUIFY"
              why="Opens optical canvas mesh distortion and retouch sculpting"
              how="Click or press W to launch the canvas liquify studio"
            >
              <button
                type="button"
                onClick={onOpenLiquify}
                aria-label="Open Liquify Warp Studio"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Wand2 className="w-4 h-4 text-amber-400" />
              </button>
            </ToolTooltip>
          )}
        </div>

        {/* ======================================================= */}
        {/* 3. RIGHT WING: TITLES, ZEN, OPTICS & TOOLS */}
        {/* ======================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Titles ON/OFF & Quick Edit Icon Pair */}
          <div className="relative flex items-center gap-2 shrink-0">
            {onToggleTitles && (
              <ToolTooltip
                title="KINETIC TITLES"
                why="Toggles dynamic title typography and Bangla overlays"
                how="Click to preview clean plates vs. subtitled frames"
              >
                <button
                  type="button"
                  onClick={onToggleTitles}
                  aria-label="Toggle Titles Layer"
                  aria-pressed={showTitles}
                  className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                    showTitles
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Type className="w-4 h-4" />
                </button>
              </ToolTooltip>
            )}

            <ToolTooltip
              title="RENAME SHOT TITLES"
              why="Edits active shot English title and Bangla subtitle inline"
              how="Click to open title editor and press Enter to save"
            >
              <button
                type="button"
                onClick={() => setIsEditingTitle(prev => !prev)}
                aria-label="Edit Shot Title"
                className={`p-2 rounded border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isEditingTitle
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-amber-300'
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </ToolTooltip>

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
          <ToolTooltip
            title="OPTICAL ASPECT RATIO"
            why="Changes canvas matte between scope, 16:9, and vertical reel"
            how="Select a framing preset to inspect live crop boundaries"
          >
            <select
              value={aspectRatio}
              onChange={(e) => onChangeAspectRatio(e.target.value)}
              aria-label="Aspect Ratio"
              className="h-8 px-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 focus:border-amber-400 text-white font-mono text-[10px] font-bold outline-none cursor-pointer transition-colors shrink-0"
            >
              <option value="2.39:1">2.39:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
            </select>
          </ToolTooltip>

          {/* LUT Preset Selector */}
          <ToolTooltip
            title="COLOR GRADE LUT"
            why="Applies film-stock color look and contrast curve to shot"
            how="Pick any LUT preset to grade the active sequence frame"
          >
            <select
              value={currentFrame?.lutFilter || 'cinematic'}
              onChange={(e) => onChangeLut(e.target.value as LutPreset)}
              aria-label="LUT Preset"
              className="hidden sm:block h-8 px-2 bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 focus:border-amber-400 rounded text-[10px] text-amber-300 font-mono font-bold outline-none cursor-pointer shrink-0 max-w-[92px] truncate"
            >
              {LUT_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#101014] text-white">
                  {p.label}
                </option>
              ))}
            </select>
          </ToolTooltip>

          {/* Module 3: Freeze Master Frame ([ 📸 ]) surfaced in visible right-center cluster */}
          <ToolTooltip
            title="FREEZE MASTER FRAME"
            why="Exports current composite frame as lossless PNG for Photoshop paint-over or thumbnailing."
            how="Click icon to capture & dispatch active frame to Photoshop."
          >
            <button
              type="button"
              data-testid="control-dock-freeze-frame"
              onClick={() => handleDispatchToTool('photoshop', currentIndex)}
              aria-label="Freeze Master Frame"
              className="text-amber-300 border border-amber-500/40 bg-neutral-900 hover:bg-amber-500/15 hover:border-amber-400 p-1.5 rounded transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center text-sm leading-none"
            >
              <span>📸</span>
            </button>
          </ToolTooltip>

          {/* Module 3: Ecosystem Bridge ([ 🚀 ]) surfaced in visible right-center cluster */}
          <ToolTooltip
            title="ECOSYSTEM BRIDGE"
            why="Hand off timeline cuts, audio sync & Bangla/English scripts to Premiere, Resolve, or CapCut."
            how="Click to open the Director's Cockpit Interchange Hub."
          >
            <button
              type="button"
              data-testid="control-dock-ecosystem-bridge"
              onClick={() => eventBus.emit('cockpit:action', { type: 'open_modal' })}
              aria-label="Open Ecosystem Bridge"
              className="text-amber-300 border border-amber-500/40 bg-neutral-900 hover:bg-amber-500/15 hover:border-amber-400 p-1.5 rounded transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center text-sm leading-none"
            >
              <span>🚀</span>
            </button>
          </ToolTooltip>

          {/* Zen Focus Mode Icon Button */}
          {onToggleZen && (
            <ToolTooltip
              title="ZEN FOCUS MODE"
              why="Fades out peripheral chrome for distraction-free screening"
              how="Click or press Z to toggle clean cinema stage view"
            >
              <button
                type="button"
                onClick={onToggleZen}
                aria-label="Toggle Zen Focus Mode"
                aria-pressed={isZenMode}
                className={`p-2 rounded border cursor-pointer transition-all active:scale-95 shrink-0 ${
                  isZenMode
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.45)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-cyan-300'
                }`}
              >
                <Focus className="w-4 h-4" />
              </button>
            </ToolTooltip>
          )}

          {/* Stage HUD Overlay Toggle */}
          <ToolTooltip
            title="STAGE HUD OVERLAY"
            why="Shows or hides lens telemetry and slate metadata on stage"
            how="Click or press H to inspect clean frame vs. HUD readout"
          >
            <button
              type="button"
              data-testid="control-dock-hud-toggle"
              aria-pressed={showHud}
              aria-label="Toggle Stage HUD (H)"
              onClick={onToggleHud}
              className={`p-2 rounded border cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center ${
                showHud
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          </ToolTooltip>

          {/* Thirds Guides */}
          {onToggleGuides && (
            <ToolTooltip
              title="COMPOSITION GUIDES"
              why="Overlays rule-of-thirds grid and optical center crosshairs"
              how="Click or press C to verify shot symmetry and headroom"
            >
              <button
                type="button"
                onClick={onToggleGuides}
                aria-label="Toggle Composition Guides"
                aria-pressed={showGuides}
                className={`p-2 rounded border cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center ${
                  showGuides
                    ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-400 hover:text-white'
                }`}
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </ToolTooltip>
          )}

          {/* Capture Still */}
          {onCaptureStill && (
            <ToolTooltip
              title="CAPTURE STILL PNG"
              why="Exports a lossless full-resolution frame still from stage"
              how="Click or press S to save current graded frame"
            >
              <button
                type="button"
                onClick={onCaptureStill}
                aria-label="Capture High-Res Still"
                className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-[#FFE066] cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
            </ToolTooltip>
          )}

          {/* Track VU Meter & Master Audio Engine (spaced cleanly with shrink-0 gap-2) */}
          <div className="flex items-center gap-2 shrink-0">
            <TrackVuMeter
              variant="dock"
              onToggleMute={onToggleAudio}
              isMuted={isAudioMuted}
            />
          </div>

          {/* Reset Zoom Button (only surfaced when optics/parallax zoom is active) */}
          {isAnyZoomActive && (
            <ToolTooltip
              title="RESET OPTICS ZOOM"
              why="Restores digital zoom and parallax layers to 1.0x fit"
              how="Click whenever zoomed in to snap back to full framing"
            >
              <button
                type="button"
                onClick={handleResetAllZoom}
                aria-label="Reset Zoom"
                className="p-2 rounded border flex items-center gap-1 font-mono text-[10px] font-bold cursor-pointer transition-all active:scale-95 shrink-0 bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,166,35,0.35)]"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="tabular-nums text-[9.5px]">
                  {digitalZoom?.isZoomed ? `${digitalZoom.scale.toFixed(1)}x` : `${fgZoom.toFixed(1)}x`}
                </span>
              </button>
            </ToolTooltip>
          )}

          {/* Grid / Contact Sheet */}
          <ToolTooltip
            title="CONTACT SHEET GRID"
            why="Switches between single stage monitor and 100-shot contact grid"
            how="Click or press G to overview and reorder sequence frames"
          >
            <button
              type="button"
              onClick={onToggleViewMode}
              aria-label="Toggle Contact Sheet Grid (G)"
              className={`p-2 rounded border cursor-pointer transition-all active:scale-95 shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </ToolTooltip>

          {/* Optical Inspector */}
          <ToolTooltip
            title="OPTICAL INSPECTOR"
            why="Opens lens specs, exposure, color sliders, and shot notes"
            how="Click or press E to fine-tune the selected shot"
          >
            <button
              type="button"
              onClick={onOpenInspector}
              aria-label="Open Director Optical Inspector (E)"
              className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-[#FFE066] cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </ToolTooltip>

          {/* Fullscreen Monitor */}
          <ToolTooltip
            title="CINEMA FULLSCREEN"
            why="Expands the stage monitor across your entire display"
            how="Click or press F to toggle fullscreen screening"
          >
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Toggle Cinema Fullscreen (F)"
              className="p-2 rounded bg-neutral-900/90 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-white cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </ToolTooltip>
        </div>
      </div>

      {/* Transient Cockpit Dispatch Toast */}
      {cockpitToast && typeof document !== 'undefined' && createPortal(
        <div
          style={{ zIndex: 9999 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] px-3.5 py-2 rounded-lg bg-neutral-950/95 border border-amber-400/70 text-amber-300 font-mono text-[11px] font-bold shadow-2xl backdrop-blur-md pointer-events-none"
        >
          {cockpitToast}
        </div>,
        document.body
      )}

      {/* Module 2: Floating Portal Directorial Dispatch HUD anchored cleanly above shot card */}
      {dispatchHudAnchor && typeof document !== 'undefined' && createPortal(
        <div
          data-testid="directorial-dispatch-hud"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 196, Math.max(12, dispatchHudAnchor.left - 88))}px`,
            top: `${Math.max(16, dispatchHudAnchor.top - 8)}px`,
            transform: 'translateY(-100%)',
            zIndex: 9999
          }}
          className="z-[9999] w-48 bg-[#08090f]/98 backdrop-blur-xl border border-amber-400/90 rounded-lg p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.95)] font-mono text-[10px] flex flex-col gap-1 animate-in fade-in zoom-in-95"
        >
          <div className="text-[8px] text-zinc-400 font-bold uppercase px-1 border-b border-white/10 pb-1 flex items-center justify-between">
            <span>DISPATCH #{String(dispatchHudAnchor.idx + 1).padStart(2, '0')}</span>
            <span className="text-amber-300">
              {(allCockpitShots[dispatchHudAnchor.idx]?.durationSec ?? 12.0).toFixed(1)}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleDispatchToTool('photoshop', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-blue-600 hover:text-white text-blue-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ PS // PAINT-OVER ]</span>
            <Camera className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleDispatchToTool('premiere', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-purple-600 hover:text-white text-purple-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ PR // SEND SEQUENCE ]</span>
            <Film className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleDispatchToTool('capcut', dispatchHudAnchor.idx)}
            className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-amber-500 hover:text-black text-amber-300 text-left font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>[ CC // REEL BUNDLE ]</span>
            <Zap className="w-3 h-3" />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
