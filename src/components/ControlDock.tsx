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
import { getCachedThumbnailUrl, isSvgPlaceholderUrl, isVideoSourceUrl } from '../services/thumbnailEngine';
import { playbackClock } from '../utils/playbackClock';
import { ShotMediaThumbnail } from './ShotMediaThumbnail';
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
  Zap,
  SlidersHorizontal,
  LayoutGrid,
  X,
  Lightbulb,
  Volume2,
  BarChart3,
  FolderOpen,
  Cloud,
  Sparkles,
  Settings,
  Keyboard,
  Activity,
  Download,
  Scissors,
  Layers,
  Video,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ExternalLink,
  HardDrive
} from 'lucide-react';
import { ToolTooltip } from './ui/ToolTooltip';
import { TrackVuMeter } from './audio/TrackVuMeter';
import { MediaAssetVaultModal } from './MediaAssetVaultModal';
import { EditInAppStrip } from './bridge/EditInAppStrip';
import { AudioFrequencyVisualizer } from './audio/AudioFrequencyVisualizer';
import { MultiLayerZoomControls } from './optics/MultiLayerZoomControls';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';
import { CockpitDispatchTarget, CockpitShotBridge } from '../types/cockpit';
import {
  dispatchToExternalApp,
  captureCompositeCanvasPng,
  renderAlignedCinemaTitleOverlay
} from '../utils/interchangeExport';
import { resolveEffectiveTitleAlign } from '../core/store';
import { getLightingPresetById } from '../data/lightingPresets';
import { getShotProceduralSpec } from '../data/proceduralCinemaEngine';
import { getShotMediaKey, resolveShotMediaEntry, saveShotMediaBlob } from '../services/handfilmMediaVault';

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
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUploadMediaForIndex?: (index: number, file: File) => void;
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
  onReorderFrames,
  onUploadMediaForIndex,
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
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);
  const [isMediaVaultOpen, setIsMediaVaultOpen] = useState(false);
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
  const [hoveredMarker, setHoveredMarker] = useState<{
    index: number;
    centerX: number;
    topY: number;
  } | null>(null);

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const digitalZoom = useStudioStore((s) => s.digitalZoom);
  const resetDigitalZoomStore = useStudioStore((s) => s.resetDigitalZoom);
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [draggedShotIndex, setDraggedShotIndex] = useState<number | null>(null);
  const touchReorderTimerRef = useRef<number | null>(null);
  const touchDragStateRef = useRef<{
    active: boolean;
    fromIdx: number | null;
    startX: number;
    startY: number;
  }>({ active: false, fromIdx: null, startX: 0, startY: 0 });
  const [isStripCollapsed, setIsStripCollapsed] = useState(false);
  const hoverLeaveTimerRef = useRef<number | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetIdx, setReplaceTargetIdx] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (hoverLeaveTimerRef.current !== null) {
        window.clearTimeout(hoverLeaveTimerRef.current);
      }
    };
  }, []);

  const clearHoverLeaveTimer = useCallback(() => {
    if (hoverLeaveTimerRef.current !== null) {
      window.clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  }, []);

  const scheduleHoverLeaveClear = useCallback((onlyForIdx?: number) => {
    clearHoverLeaveTimer();
    hoverLeaveTimerRef.current = window.setTimeout(() => {
      setHoveredMarker((prev) => {
        if (!prev) return null;
        if (onlyForIdx !== undefined && prev.index !== onlyForIdx) return prev;
        return null;
      });
    }, 180);
  }, [clearHoverLeaveTimer]);

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

  const tcDomRef = useRef<HTMLSpanElement | null>(null);
  const activeShotProgressDomRef = useRef<HTMLDivElement | null>(null);
  const activeShotRelTcDomRef = useRef<HTMLSpanElement | null>(null);
  const dockClockCtxRef = useRef({
    currentIndex,
    currentShotStartSec,
    currentDurationSec,
    currentFps,
    isPlaying
  });
  dockClockCtxRef.current = {
    currentIndex,
    currentShotStartSec,
    currentDurationSec,
    currentFps,
    isPlaying
  };

  useEffect(() => {
    return playbackClock.subscribe((snap) => {
      const ctx = dockClockCtxRef.current;
      const activeStart = snap.shotStartSec > 0 || snap.shotIndex === 0 ? snap.shotStartSec : ctx.currentShotStartSec;
      const activeFps = snap.fps > 0 ? snap.fps : ctx.currentFps;
      const activeDur = snap.durationSec > 0 ? snap.durationSec : ctx.currentDurationSec;

      if (tcDomRef.current) {
        tcDomRef.current.textContent = formatFullSMPTETimecode(activeStart + snap.timeSec, activeFps);
      }
      if (snap.shotIndex === ctx.currentIndex) {
        if (activeShotProgressDomRef.current) {
          const pct = activeDur > 0 ? Math.min(100, Math.max(0, (snap.timeSec / activeDur) * 100)) : 0;
          activeShotProgressDomRef.current.style.width = `${pct.toFixed(3)}%`;
        }
        if (activeShotRelTcDomRef.current && ctx.isPlaying) {
          const relFrames = Math.floor((snap.timeSec % 1) * activeFps);
          const relSecondsPart = Math.floor(snap.timeSec);
          activeShotRelTcDomRef.current.textContent = `+${String(relSecondsPart).padStart(2, '0')}:${String(relFrames).padStart(2, '0')}F`;
        }
      }
    });
  }, []);

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

      const state = useStudioStore.getState();
      if (state.visibility.titlesAll) {
        const effectiveAlign = resolveEffectiveTitleAlign(
          state.titleAlign,
          shotIdx,
          target.shotType
        );
        renderAlignedCinemaTitleOverlay(ctx, 1920, 1080, {
          banglaTitle: target.bengaliTitle || '',
          englishTitle: target.title || '',
          dialogue: target.directorNotes || target.tagline || '',
          effectiveAlign,
          preset: state.titleConfig?.preset || 'molten-gold',
          verticalOffset: state.titleConfig?.verticalOffset ?? 0,
          titleSize: state.titleConfig?.titleSize ?? 72,
          opacity: state.visibility?.titleOpacity ?? 1
        });
      }

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

  // Compute visible shot range + 5-shot buffer window (88px card + 10px gap)
  const shotWidthApprox = 98;
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
    clearHoverLeaveTimer();
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

  const handleStartShotTouchResize = (idx: number, e: React.TouchEvent) => {
    if (!onUpdateFrameAtIndex || e.touches.length === 0) return;
    e.stopPropagation();
    const targetFrame = safeFrames[idx];
    if (!targetFrame) return;

    const startX = e.touches[0].clientX;
    const startDuration = getShotDurationSec(targetFrame, 12.0);
    const shotStartSec = shotOffsets[idx]?.startSec ?? idx * 12.0;
    const snapActive =
      effectiveSnapToBeat || Boolean(targetFrame.beatSnapEnabled) || audioEngine.getIsSnapToBeatEnabled();

    setDragShotState({
      index: idx,
      durationSec: startDuration,
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY
    });

    const onTouchMove = (moveEv: TouchEvent) => {
      if (moveEv.touches.length === 0) return;
      const t = moveEv.touches[0];
      const deltaPx = t.clientX - startX;
      const secPerPx = startDuration >= 30 ? 0.25 : 0.06;
      let candidate = clampShotDuration(startDuration + deltaPx * secPerPx);
      if (snapActive) {
        candidate = audioEngine.snapDurationToNearestBeat(shotStartSec, candidate, 0.5, 0.45);
      } else {
        candidate = clampShotDuration(Math.round(candidate * 20) / 20);
      }
      setDragShotState({
        index: idx,
        durationSec: candidate,
        clientX: t.clientX,
        clientY: t.clientY
      });
      onUpdateFrameAtIndex(idx, {
        ...targetFrame,
        slideHoldSec: candidate,
        durationSec: candidate
      });
    };

    const onTouchEnd = () => {
      setDragShotState(null);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };

  const commitShotReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (!onReorderFrames || fromIdx === toIdx) return;
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= safeFrames.length || toIdx >= safeFrames.length) return;
      const reordered = [...safeFrames];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      onReorderFrames(reordered);
      onSelectFrame(toIdx);
    },
    [onReorderFrames, onSelectFrame, safeFrames]
  );

  const hoveredPreviewData = useMemo(() => {
    if (!hoveredMarker || dragShotState) return null;
    const frame = safeFrames[hoveredMarker.index];
    if (!frame) return null;
    const idx = hoveredMarker.index;
    const vaultEntry = resolveShotMediaEntry(shotMediaMap, frame, undefined, idx);
    const resolvedUrl = vaultEntry?.url || frame.imageUrl || '';
    const cachedThumb =
      getCachedThumbnailUrl([frame.id, `shot_${idx}`, idx, resolvedUrl]) ||
      (frame.thumbnailUrl && !isSvgPlaceholderUrl(frame.thumbnailUrl) ? frame.thumbnailUrl : '') ||
      (frame.thumbnail && !isSvgPlaceholderUrl(frame.thumbnail) ? frame.thumbnail : '') ||
      '';
    const isVideoMedia = vaultEntry
      ? vaultEntry.type === 'video'
      : isVideoSourceUrl(resolvedUrl, { isVideo: frame.isVideo });
    const hasMedia = Boolean(cachedThumb || resolvedUrl || isVideoMedia);
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
      vaultEntry,
      resolvedUrl,
      cachedThumb,
      isVideoMedia,
      hasMedia,
      holdSec,
      startTimecode,
      clampedLeft,
      topY: Math.max(120, hoveredMarker.topY - 10),
      caretOffsetPx,
      lutFilterCss: getLutFilterCSS(frame.lutFilter || 'cinematic', frame.adjustments)
    };
  }, [hoveredMarker, dragShotState, safeFrames, shotOffsets, shotMediaMap]);

  return (
    <div
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onMouseLeave={() => scheduleHoverLeaveClear()}
      className="relative w-full shrink-0 z-40 flex flex-col items-center pointer-events-auto px-1 sm:px-2 pb-0 pt-0 bg-[#0B0B0D]/95 border-t border-white/[0.07] transition-all duration-200 ease-out opacity-100"
    >
      {/* Hidden File Input for Hover Card Replace Shot Action */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const targetIdx = replaceTargetIdx;
          e.target.value = '';
          if (!file || targetIdx === null) return;
          const targetFrame = safeFrames[targetIdx];
          if (!targetFrame) return;
          if (onUploadMediaForIndex) {
            onUploadMediaForIndex(targetIdx, file);
          } else {
            const shotKey = getShotMediaKey(targetFrame, targetIdx);
            const entry = await saveShotMediaBlob(shotKey, file, file.name);
            useStudioStore.getState().setShotMediaEntry(shotKey, entry);
            if (onUpdateFrameAtIndex) {
              onUpdateFrameAtIndex(targetIdx, {
                ...targetFrame,
                imageUrl: entry.url,
                thumbnailUrl: entry.type === 'image' ? entry.url : targetFrame.thumbnailUrl,
                isVideo: entry.type === 'video'
              });
            }
          }
          setHoveredMarker(null);
          setReplaceTargetIdx(null);
        }}
      />

      {/* Floating Real-Time Drag Handle Tooltip */}
      {dragShotState && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.max(80, Math.min(window.innerWidth - 180, dragShotState.clientX - 70))}px`,
            top: `${Math.max(24, dragShotState.clientY - 42)}px`,
            zIndex: 9999
          }}
          className="px-2 py-0.5 rounded-md bg-[#0B0B0D]/95 border border-[#F59E0B]/60 text-[9.5px] font-mono font-bold text-[#F4F4F5] whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.9)] pointer-events-none tabular-nums"
        >
          DUR: {dragShotState?.durationSec ? dragShotState.durationSec.toFixed(2) : '12.00'}s //{' '}
          {getShotFrameCount(dragShotState?.durationSec ?? 12.0, getShotTargetFps(safeFrames[dragShotState?.index ?? 0], 24))} FRAMES
        </div>
      )}

      {/* Floating Full-Color Interactive Frame Hover-Preview Card */}
      {hoveredPreviewData && (
        <div
          role="tooltip"
          data-testid="scrubber-hover-preview"
          onMouseEnter={clearHoverLeaveTimer}
          onMouseLeave={() => scheduleHoverLeaveClear()}
          style={{
            position: 'fixed',
            left: `${hoveredPreviewData.clampedLeft}px`,
            top: `${hoveredPreviewData.topY}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 9998
          }}
          className="w-56 bg-[#0B0B0D]/96 backdrop-blur-2xl border border-white/[0.12] rounded-[6px] p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.96)] pointer-events-auto select-none transform-gpu animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Frame Thumbnail Viewport (Always Full-Color) */}
          <div className="relative w-full aspect-[16/9] rounded-[3px] overflow-hidden bg-[#0B0B0D] border border-white/[0.07]">
            {hoveredPreviewData.hasMedia ? (
              <ShotMediaThumbnail
                shotIndex={hoveredPreviewData.idx}
                shotId={hoveredPreviewData.frame.id}
                mediaUrl={hoveredPreviewData.resolvedUrl}
                thumbnailUrl={hoveredPreviewData.cachedThumb || hoveredPreviewData.frame.thumbnailUrl}
                isVideo={hoveredPreviewData.isVideoMedia}
                mimeType={hoveredPreviewData.vaultEntry?.mimeType}
                name={hoveredPreviewData.vaultEntry?.name}
                title={hoveredPreviewData.frame.title}
                bengaliTitle={hoveredPreviewData.frame.bengaliTitle}
                shotType={hoveredPreviewData.frame.shotType}
                titleAlign={titleAlign}
                lutFilterCss={hoveredPreviewData.lutFilterCss}
                disableLiveVideoElement
                alt={`Frame ${hoveredPreviewData.shotNumber} preview`}
              />
            ) : (() => {
              const proc = getShotProceduralSpec(hoveredPreviewData.idx);
              const effAlign = resolveEffectiveTitleAlign(
                titleAlign,
                hoveredPreviewData.idx,
                hoveredPreviewData.frame.shotType
              );
              const previewAlignCls =
                effAlign === 'LEFT'
                  ? 'items-start text-left pl-2 pr-4'
                  : effAlign === 'RIGHT'
                    ? 'items-end text-right pl-4 pr-2'
                    : 'items-center text-center px-2';
              return (
                <div
                  className="relative w-full h-full flex flex-col justify-center overflow-hidden"
                  style={{
                    background: proc.palette.thumbCssBackdrop,
                    filter: hoveredPreviewData.lutFilterCss
                  }}
                >
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: proc.palette.lightLeakCss }}
                  />
                  <div className="absolute inset-0 procedural-film-grain opacity-45 pointer-events-none" />
                  <div className={`relative z-10 w-full flex flex-col gap-0.5 ${previewAlignCls}`}>
                    <span className="font-bangla text-[9px] font-bold text-amber-200 leading-tight truncate max-w-full drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                      {hoveredPreviewData.frame.bengaliTitle || 'প্রসিডিউরাল সিন'}
                    </span>
                    <span className="font-mono text-[6.5px] font-semibold tracking-[0.16em] text-zinc-200 uppercase truncate max-w-full">
                      {hoveredPreviewData.frame.title || `SHOT ${hoveredPreviewData.shotNumber}`}
                    </span>
                    <span
                      className="h-[1px] w-8 rounded-full opacity-90"
                      style={{ backgroundColor: proc.palette.accentHex }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Scrim + Unboxed Index & Start Timecode */}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/90 via-black/45 to-transparent flex items-end justify-between px-1.5 pb-0.5 font-mono text-[8px] tabular-nums">
              <span className="font-bold text-[#F59E0B]">
                SH{String(hoveredPreviewData.shotNumber).padStart(2, '0')}
              </span>
              <span className="text-[#8E8E93]">
                {hoveredPreviewData.startTimecode}
              </span>
            </div>
          </div>

          {/* Frame Title, Bengali Subtitle, Duration & Lens Metadata */}
          <div className="pt-1.5 px-0.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[10px] font-bold text-[#F4F4F5] truncate">
                {hoveredPreviewData.frame.title || `Frame ${hoveredPreviewData.shotNumber}`}
              </span>
              <span className="text-[8.5px] font-mono font-bold text-[#F59E0B] tabular-nums shrink-0">
                {formatDurationPillValue(hoveredPreviewData.holdSec)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5 text-[8px] text-[#8E8E93]">
              <span className="truncate font-bangla text-[#8E8E93]">
                {hoveredPreviewData.frame.bengaliTitle || 'Sequence Frame'}
              </span>
              <span className="font-mono text-[#8E8E93] shrink-0 truncate max-w-[92px] tabular-nums">
                {hoveredPreviewData.frame.cameraSpec?.focalLength || '50mm Cine'}
              </span>
            </div>
          </div>

          {/* Interactive Action Trio: JUMP / SOLO / REPLACE */}
          <div className="mt-1.5 pt-1.5 border-t border-white/[0.07] grid grid-cols-3 gap-1 font-mono text-[8px] font-black uppercase">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectFrame(hoveredPreviewData.idx);
                setHoveredMarker(null);
              }}
              className="py-1 px-1 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-[#0B0B0D] border border-[#F59E0B]/50 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-0.5"
            >
              <Play className="w-2.5 h-2.5" />
              <span>JUMP</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectFrame(hoveredPreviewData.idx);
                onSelectPlaybackMode?.('solo');
                setHoveredMarker(null);
              }}
              className="py-1 px-1 rounded bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] border border-white/[0.07] transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-0.5"
            >
              <Focus className="w-2.5 h-2.5" />
              <span>SOLO</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReplaceTargetIdx(hoveredPreviewData.idx);
                replaceFileInputRef.current?.click();
              }}
              className="py-1 px-1 rounded bg-[#141417] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] border border-white/[0.07] transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-0.5"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>REPLACE</span>
            </button>
          </div>

          {/* Downward Pointer Caret Aligned to Hovered Index Marker */}
          <div
            style={{
              left: `calc(50% + ${hoveredPreviewData.caretOffsetPx}px)`
            }}
            className="absolute -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-[#0B0B0D] border-r border-b border-white/[0.12]"
          />
        </div>
      )}

      {/* Shot Strip + Editorial Transport Wrapper (Full-Color Sharpness Preserved) */}
      <div className="w-full flex flex-col items-center">
      {/* 100-Frame Strip Navigation with Ultra-Slim 80x34 Cards & Collapsible Strip Container */}
      <div
        className={`w-full flex items-center gap-1 transition-all duration-200 ease-out ${
          isStripCollapsed
            ? 'max-h-0 opacity-0 pointer-events-none overflow-hidden mb-0'
            : 'max-h-[38px] opacity-100 pointer-events-auto mb-0'
        }`}
      >
        <ToolTooltip
          title="PREVIOUS SHOT"
          why="Jumps playhead backward to the preceding sequence shot"
          how="Click or press J / Left Arrow to step backward"
        >
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous Shot (J)"
            className="w-4 h-4 p-0 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] backdrop-blur-md cursor-pointer transition-all shadow shrink-0 active:scale-95 flex items-center justify-center"
          >
            <ChevronLeft className="w-2.5 h-2.5" />
          </button>
        </ToolTooltip>

        <div
          ref={stripRef}
          onMouseLeave={() => scheduleHoverLeaveClear()}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="flex-1 flex items-center gap-1.5 px-1.5 py-[1px] overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar bg-[#0B0B0D]/90 backdrop-blur-2xl border border-white/[0.07] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.85)]"
        >
          {safeFrames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const shotKey = getShotMediaKey(frame, idx);
            const vaultEntry = resolveShotMediaEntry(shotMediaMap, frame, undefined, idx);
            const resolvedUrl = vaultEntry?.url || frame?.imageUrl || '';
            const cachedThumb =
              getCachedThumbnailUrl([frame?.id, `shot_${idx}`, idx, resolvedUrl]) ||
              (frame?.thumbnailUrl && !isSvgPlaceholderUrl(frame.thumbnailUrl) ? frame.thumbnailUrl : '') ||
              (frame?.thumbnail && !isSvgPlaceholderUrl(frame.thumbnail) ? frame.thumbnail : '') ||
              '';
            const isVideoMedia = vaultEntry
              ? vaultEntry.type === 'video'
              : isVideoSourceUrl(resolvedUrl, { isVideo: frame?.isVideo });
            const hasMedia = Boolean(cachedThumb || resolvedUrl || isVideoMedia);
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

            return (
              <div
                key={`shot-strip-${idx}-${frame?.id ?? 'none'}`}
                data-testid={`scrubber-index-marker-${idx}`}
                data-shot-id={shotKey}
                data-shot-drop-index={idx}
                draggable={Boolean(onReorderFrames)}
                onDragStart={(e) => {
                  if (!onReorderFrames) return;
                  setDraggedShotIndex(idx);
                  try {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('application/x-handfilm-shot-idx', String(idx));
                  } catch {}
                }}
                onDragEnd={() => {
                  setDraggedShotIndex(null);
                  setDropTargetIndex(null);
                }}
                onTouchStart={(e) => {
                  if (!onReorderFrames || e.touches.length !== 1) return;
                  const t = e.touches[0];
                  touchDragStateRef.current = {
                    active: false,
                    fromIdx: idx,
                    startX: t.clientX,
                    startY: t.clientY
                  };
                  if (touchReorderTimerRef.current !== null) {
                    window.clearTimeout(touchReorderTimerRef.current);
                  }
                  touchReorderTimerRef.current = window.setTimeout(() => {
                    touchDragStateRef.current.active = true;
                    setDraggedShotIndex(idx);
                    setDropTargetIndex(idx);
                  }, 260);
                }}
                onTouchMove={(e) => {
                  if (!touchDragStateRef.current.active) {
                    const t = e.touches[0];
                    if (
                      t &&
                      Math.hypot(
                        t.clientX - touchDragStateRef.current.startX,
                        t.clientY - touchDragStateRef.current.startY
                      ) > 10
                    ) {
                      if (touchReorderTimerRef.current !== null) {
                        window.clearTimeout(touchReorderTimerRef.current);
                        touchReorderTimerRef.current = null;
                      }
                    }
                    return;
                  }
                  const t = e.touches[0];
                  if (!t || typeof document === 'undefined') return;
                  const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
                  const card = el?.closest('[data-shot-drop-index]') as HTMLElement | null;
                  const targetRaw = card?.getAttribute('data-shot-drop-index');
                  if (targetRaw !== null && targetRaw !== undefined) {
                    const parsed = Number(targetRaw);
                    if (Number.isInteger(parsed)) setDropTargetIndex(parsed);
                  }
                }}
                onTouchEnd={() => {
                  if (touchReorderTimerRef.current !== null) {
                    window.clearTimeout(touchReorderTimerRef.current);
                    touchReorderTimerRef.current = null;
                  }
                  if (touchDragStateRef.current.active && touchDragStateRef.current.fromIdx !== null) {
                    const fromIdx = touchDragStateRef.current.fromIdx;
                    const toIdx = dropTargetIndex;
                    if (toIdx !== null && toIdx !== fromIdx) {
                      commitShotReorder(fromIdx, toIdx);
                    }
                  }
                  touchDragStateRef.current = { active: false, fromIdx: null, startX: 0, startY: 0 };
                  setDraggedShotIndex(null);
                  setDropTargetIndex(null);
                }}
                onClick={() => onSelectFrame(idx)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHoveredMarker(null);
                  setDispatchHudAnchor({
                    idx,
                    left: e.clientX,
                    top: e.clientY
                  });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dropTargetIndex !== idx) setDropTargetIndex(idx);
                }}
                onDragLeave={() => {
                  setDropTargetIndex((prev) => (prev === idx ? null : prev));
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const sourceRaw = e.dataTransfer.getData('application/x-handfilm-shot-idx');
                  setDropTargetIndex(null);
                  setDraggedShotIndex(null);
                  if (sourceRaw && onReorderFrames) {
                    const fromIdx = Number(sourceRaw);
                    if (Number.isInteger(fromIdx) && fromIdx !== idx) {
                      commitShotReorder(fromIdx, idx);
                      return;
                    }
                  }
                  if (draggedShotIndex !== null && draggedShotIndex !== idx && onReorderFrames) {
                    commitShotReorder(draggedShotIndex, idx);
                    return;
                  }
                  const droppedFile = e.dataTransfer.files?.[0];
                  if (!droppedFile) return;
                  if (onUploadMediaForIndex) {
                    onUploadMediaForIndex(idx, droppedFile);
                  } else {
                    const entry = await saveShotMediaBlob(shotKey, droppedFile, droppedFile.name);
                    useStudioStore.getState().setShotMediaEntry(shotKey, entry);
                    if (onUpdateFrameAtIndex && frame) {
                      onUpdateFrameAtIndex(idx, {
                        ...frame,
                        imageUrl: entry.url,
                        thumbnailUrl: entry.type === 'image' ? entry.url : frame.thumbnailUrl,
                        isVideo: entry.type === 'video'
                      });
                    }
                  }
                }}
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
                onMouseLeave={() => scheduleHoverLeaveClear(idx)}
                onFocus={(e) => handleMarkerHoverEnter(idx, e.currentTarget)}
                onBlur={() => scheduleHoverLeaveClear(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectFrame(idx);
                  }
                }}
                aria-label={`Shot ${shotNumber}: ${title}${bn ? ` (${bn})` : ''} — ${holdSec.toFixed(2)}s`}
                className={`group relative min-w-[80px] w-[80px] h-[34px] flex-shrink-0 snap-start rounded overflow-hidden flex flex-col justify-between cursor-pointer select-none transition-all duration-[240ms] ease-out will-change-transform ${
                  dropTargetIndex === idx
                    ? 'border-2 border-dashed border-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.4)] scale-[1.04] z-30 bg-[#141417]'
                    : isActive
                    ? 'border-2 border-[#F59E0B] shadow-[0_0_18px_rgba(245,158,11,0.45)] scale-[1.04] z-20 bg-[#141417] opacity-100'
                    : 'border border-white/[0.07] hover:border-[#F59E0B]/55 bg-[#141417]'
                }`}
              >
                {/* Visual Preview Wrapper: Active Shot = 100% Full-Color Sharpness; Inactive Shots = Blurred & Grayscale Stealth */}
                <div
                  className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none transition-all duration-[240ms] ease-out ${
                    isActive
                      ? '[filter:grayscale(0%)_blur(0px)_brightness(1)] opacity-100'
                      : '[filter:grayscale(100%)_blur(1.5px)_brightness(0.55)] opacity-50 group-hover:[filter:grayscale(0%)_blur(0px)_brightness(0.95)] group-hover:opacity-85'
                  }`}
                >
                {hasMedia ? (
                  <ShotMediaThumbnail
                    shotIndex={idx}
                    shotId={frame?.id}
                    mediaUrl={resolvedUrl}
                    thumbnailUrl={cachedThumb || frame?.thumbnailUrl}
                    isVideo={isVideoMedia}
                    mimeType={vaultEntry?.mimeType}
                    name={vaultEntry?.name}
                    title={title}
                    bengaliTitle={bn}
                    shotType={frame?.shotType}
                    titleAlign={titleAlign}
                    virtualized={isThumbnailVisible}
                    compactProcedural
                    disableLiveVideoElement
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    mediaClassName="w-full h-full object-cover transition-transform duration-[240ms] group-hover:scale-105"
                    alt={`Shot ${shotNumber}`}
                  />
                ) : (() => {
                  const proc = getShotProceduralSpec(idx);
                  const effAlign = resolveEffectiveTitleAlign(titleAlign, idx, frame?.shotType);
                  const miniAlignCls =
                    effAlign === 'LEFT'
                      ? 'items-start text-left pl-1.5 pr-3'
                      : effAlign === 'RIGHT'
                        ? 'items-end text-right pl-3 pr-1.5'
                        : 'items-center text-center px-1.5';
                  return (
                    <div
                      data-testid={`procedural-thumb-${idx}`}
                      data-palette-id={proc.palette.id}
                      data-effective-align={effAlign}
                      className="absolute inset-0 flex flex-col justify-end pb-0.5 overflow-hidden pointer-events-none"
                      style={{ background: proc.palette.thumbCssBackdrop }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: proc.palette.lightLeakCss }}
                      />
                      <div className="absolute inset-0 procedural-film-grain opacity-35 pointer-events-none" />
                      <div className={`relative z-10 w-full flex flex-col gap-[1px] ${miniAlignCls}`}>
                        <span
                          className={`font-bangla text-[7px] leading-none text-amber-100/95 truncate max-w-full drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] ${
                            proc.architecture.italicStyle ? 'italic' : ''
                          } ${proc.architecture.index === 0 || proc.architecture.index === 8 ? 'font-black' : 'font-bold'}`}
                        >
                          {bn || title}
                        </span>
                        <span
                          className="h-[1px] rounded-full opacity-90"
                          style={{
                            width: proc.architecture.dividerKind === 'anamorphic-wide' ? '72%' : '36%',
                            backgroundColor: proc.palette.accentHex
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
                </div>

                {/* Contrast scrim overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/55 pointer-events-none" />

                {/* Top Metadata Bar: #01 + Duration / Relative TC (leaves room for top-right dispatch button) */}
                <div className="relative z-10 pl-1 pr-3.5 pt-[1px] flex items-center justify-between gap-0.5 font-mono pointer-events-none">
                  <span
                    className={`px-0.5 py-0 rounded text-[7px] font-black leading-none tabular-nums inline-flex items-center gap-0.5 ${
                      isActive ? 'bg-[#F59E0B] text-[#0B0B0D]' : 'bg-[#0B0B0D]/85 text-[#8E8E93] group-hover:text-[#F4F4F5]'
                    }`}
                  >
                    {isActive && <span className="w-1 h-1 rounded-full bg-[#0B0B0D] animate-pulse" />}
                    {shotBadge}
                  </span>
                  <span
                    ref={isActive ? activeShotRelTcDomRef : undefined}
                    className={`px-0.5 py-0 rounded text-[6.5px] font-bold leading-none tabular-nums ${
                      isActive
                        ? 'bg-[#0B0B0D]/90 border border-[#F59E0B]/60 text-[#F59E0B]'
                        : 'bg-[#0B0B0D]/80 text-[#8E8E93]'
                    }`}
                  >
                    {isActive && isPlaying ? relativeTc : formatDurationPillValue(holdSec)}
                  </span>
                </div>

                {/* Top-Right Always-Visible Directorial Dispatch Trigger */}
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
                  className="absolute top-0.5 right-0.5 z-30 bg-[#141417]/90 border border-white/[0.12] text-[#8E8E93] hover:bg-[#F59E0B] hover:text-[#0B0B0D] hover:border-[#F59E0B] font-bold w-2.5 h-2.5 rounded-sm flex items-center justify-center shadow active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-[7px] h-[7px]" />
                </button>

                {/* Bottom Metadata Bar: Title/Bangla Label + Active LUT Badge */}
                <div className="relative z-10 px-1 pb-[1px] flex items-center justify-between gap-0.5 font-mono pointer-events-none">
                  <span className="text-[7px] font-semibold text-[#F4F4F5] truncate leading-none drop-shadow">
                    {bn || title}
                  </span>
                  {frame?.lutFilter && (
                    <span className="px-0.5 py-0 rounded bg-[#0B0B0D]/80 border border-white/[0.07] text-[6px] text-[#8E8E93] font-bold uppercase leading-none shrink-0">
                      {frame.lutFilter.slice(0, 3)}
                    </span>
                  )}
                </div>

                {/* Real-Time Slide Progress Baseline */}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-[#0B0B0D]/80 overflow-hidden pointer-events-none z-20">
                    <div
                      ref={activeShotProgressDomRef}
                      className="h-full bg-[#F59E0B]"
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
                    onTouchStart={(e) => handleStartShotTouchResize(idx, e)}
                    onClick={(e) => e.stopPropagation()}
                    title={`Drag right edge to resize SH${String(shotNumber).padStart(3, '0')} (${holdSec.toFixed(2)}s // ${shotFrames}F)`}
                    className={`touch-manipulation absolute top-0 bottom-0 right-0 w-2 z-30 cursor-ew-resize transition-colors ${
                      dragShotState?.index === idx
                        ? 'bg-[#F59E0B]'
                        : 'bg-transparent group-hover:bg-[#F59E0B]/70 hover:!bg-[#F59E0B]'
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
            className="w-4 h-4 p-0 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] backdrop-blur-md cursor-pointer transition-all shadow shrink-0 active:scale-95 flex items-center justify-center"
          >
            <ChevronRight className="w-2.5 h-2.5" />
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
              className="hidden md:flex w-4 h-4 p-0 items-center justify-center rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Repeat className="w-2.5 h-2.5" />
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
              className="hidden lg:flex w-4 h-4 p-0 items-center justify-center rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Music className="w-2.5 h-2.5" />
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
            className="w-7 h-4 bg-[#141417] border border-white/[0.07] focus:border-[#F59E0B] text-[#F4F4F5] placeholder-[#8E8E93] text-[8px] font-mono px-1 rounded text-center outline-none transition-colors tabular-nums"
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

      {/* Main Single-Row Ultra-Slim 22px Iconic Transport & Optics Toolbar Flush Bottom */}
      <div
        data-testid="control-dock-toolbar"
        data-playing={isPlaying ? 'true' : 'false'}
        className="nle-focus-bar relative w-full h-[22px] min-h-[22px] max-h-[22px] py-0 pointer-events-auto bg-[#0B0B0D]/95 backdrop-blur-2xl border-t border-x border-b-0 border-white/[0.07] rounded-t-md rounded-b-none shadow-[0_8px_32px_rgba(0,0,0,0.95)] px-1.5 flex flex-row items-center justify-between flex-nowrap gap-1 overflow-x-auto overflow-y-hidden no-scrollbar text-[9.5px] leading-none font-mono-tech select-none"
      >
        {/* Subtle 1px Top Hairline Divider */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-white/[0.07] pointer-events-none" />

        {/* ======================================================= */}
        {/* 1. LEFT WING: PLAY/PAUSE, STEP BUTTONS, SMPTE CLOCK & MEDIA VAULT */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Circular Play/Pause Button (Always Razor-Sharp During Playback) */}
          <ToolTooltip
            title="PLAYBACK TRANSPORT"
            why="Plays or pauses real-time sequence preview"
            how="Click or press Spacebar to start/stop playback"
          >
            <button
              type="button"
              data-transport-sharp="true"
              data-active={isPlaying ? 'true' : 'false'}
              style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause Loop' : 'Play Loop'}
              className={`nle-editorial-btn w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer active:scale-95 shrink-0 ${
                isPlaying
                  ? 'bg-[#F59E0B] text-[#0B0B0D] ring-1 ring-[#F59E0B]/60 shadow-[0_0_10px_rgba(245,158,11,0.45)]'
                  : 'bg-[#141417] border border-amber-500/35 hover:border-[#F59E0B] text-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.16)]'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-[9.5px] h-[9.5px] fill-current" />
              ) : (
                <Play className="w-[9.5px] h-[9.5px] fill-current ml-0.5" />
              )}
            </button>
          </ToolTooltip>

          {/* Frame Step Controls (-1F / +1F) (Always Razor-Sharp During Playback) */}
          <div className="flex items-center gap-0.5 shrink-0">
            <ToolTooltip
              title="STEP BACK 1 FRAME"
              why="Moves playhead backward one exact frame or shot"
              how="Click or press Left Arrow for frame precision"
            >
              <button
                type="button"
                data-transport-sharp="true"
                style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
                onClick={() => {
                  if (onStepFrame) onStepFrame(false);
                  else onPrev();
                }}
                aria-label="Step Backward 1 Frame"
                className="nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded bg-[#141417] border border-sky-400/20 hover:border-sky-400/60 text-sky-300/80 hover:text-sky-200 cursor-pointer"
              >
                <ChevronLeft className="w-2.5 h-2.5" />
              </button>
            </ToolTooltip>

            <ToolTooltip
              title="STEP FORWARD 1 FRAME"
              why="Advances playhead forward one exact frame or shot"
              how="Click or press Right Arrow for frame precision"
            >
              <button
                type="button"
                data-transport-sharp="true"
                style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
                onClick={() => {
                  if (onStepFrame) onStepFrame(true);
                  else onNext();
                }}
                aria-label="Step Forward 1 Frame"
                className="nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded bg-[#141417] border border-sky-400/20 hover:border-sky-400/60 text-sky-300/80 hover:text-sky-200 cursor-pointer"
              >
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </ToolTooltip>
          </div>

          {/* Monospace SMPTE Timecode Badge (Always Razor-Sharp During Playback) */}
          <ToolTooltip
            title="SMPTE TIMECODE"
            why="Displays cumulative timeline clock and shot duration"
            how={`Running at ${currentFps} FPS; drag card edges to adjust`}
          >
            <div
              data-transport-sharp="true"
              className="flex items-center gap-1 h-[18px] px-1.5 rounded bg-[#141417] border border-amber-500/25 text-[9px] font-mono shrink-0 whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] tabular-nums"
            >
              <Clock className="w-2.5 h-2.5 text-[#F59E0B]/85" />
              <span ref={tcDomRef} className="text-[#F59E0B] font-bold tracking-wider text-[9px] tabular-nums">{tcString}</span>
              <span className="text-[#8E8E93]/50 text-[8px]">/</span>
              <span className="text-[#F4F4F5] font-bold text-[9px] tabular-nums">{currentDurationSec.toFixed(1)}s</span>
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

          {/* Tactile MEDIA Asset Vault Button (Positioned between DURATION and SOLO/MASTER) */}
          <ToolTooltip
            title="MEDIA ASSET VAULT"
            why="Opens unified OPFS & IndexedDB project asset vault with live hover previews and 1-click assignment"
            how="Click to browse, import, preview, or assign video/image/audio clips"
          >
            <button
              type="button"
              data-testid="control-dock-media-vault"
              data-active={isMediaVaultOpen ? 'true' : 'false'}
              style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
              onClick={() => setIsMediaVaultOpen(true)}
              aria-label="Open Media Asset Vault"
              aria-expanded={isMediaVaultOpen}
              className={`nle-editorial-btn h-[18px] px-1.5 rounded border flex items-center gap-1 font-mono text-[8.5px] font-black tracking-[0.08em] uppercase cursor-pointer shrink-0 ${
                isMediaVaultOpen
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                  : 'bg-[#141417] border-sky-400/30 hover:border-sky-400/75 text-sky-300 hover:text-white shadow-[0_0_8px_rgba(56,189,248,0.12)]'
              }`}
            >
              <HardDrive className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              <span>MEDIA</span>
            </button>
          </ToolTooltip>
        </div>

        {/* ======================================================= */}
        {/* 2. CENTER WING: [ SOLO | MASTER ], BEAT SNAP, SPEED, PAN, WARP, ⚡ COCKPIT */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1 shrink-0">
          {/* SOLO / MASTER Segmented Command Hub */}
          <ToolTooltip
            title="SOLO / MASTER MODE"
            why="Locks playback to active clip or plays continuous sequence"
            how="Pick SOLO for single-shot review, MASTER for full cut"
          >
            <div
              data-active="true"
              className="flex items-center h-[18px] p-[1px] bg-[#0B0B0D] rounded border border-white/[0.09] shadow-inner"
            >
              <button
                type="button"
                data-active={playbackMode === 'solo' ? 'true' : 'false'}
                style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
                onClick={() => onSelectPlaybackMode?.('solo')}
                className={`nle-editorial-btn h-[14px] px-1.5 rounded font-mono text-[8px] uppercase flex items-center gap-1 cursor-pointer ${
                  playbackMode === 'solo'
                    ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/65 text-[#F4F4F5] font-bold shadow-[0_0_8px_rgba(245,158,11,0.22)]'
                    : 'border border-transparent text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${playbackMode === 'solo' ? 'bg-[#F59E0B]' : 'bg-[#8E8E93]/40'}`} />
                <span>SOLO</span>
              </button>

              <button
                type="button"
                data-active={playbackMode !== 'solo' ? 'true' : 'false'}
                style={{ '--item-accent': '#10B981' } as React.CSSProperties}
                onClick={() => onSelectPlaybackMode?.('sequence')}
                className={`nle-editorial-btn h-[14px] px-1.5 rounded font-mono text-[8px] uppercase flex items-center gap-1 cursor-pointer ${
                  playbackMode !== 'solo'
                    ? 'bg-emerald-500/15 border border-emerald-400/60 text-[#F4F4F5] font-bold shadow-[0_0_8px_rgba(16,185,129,0.22)]'
                    : 'border border-transparent text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${playbackMode !== 'solo' ? 'bg-emerald-400' : 'bg-[#8E8E93]/40'}`} />
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
              data-active={effectiveSnapToBeat ? 'true' : 'false'}
              style={{ '--item-accent': '#10B981' } as React.CSSProperties}
              aria-pressed={effectiveSnapToBeat}
              aria-label="Toggle Snap to Beat"
              onClick={handleSnapToBeatToggle}
              className={`nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                effectiveSnapToBeat
                  ? 'bg-emerald-500/15 border-emerald-400/70 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-[#141417] border-emerald-500/20 hover:border-emerald-400/60 text-emerald-300/70 hover:text-emerald-200'
              }`}
            >
              <Music className="w-2.5 h-2.5" />
            </button>
          </ToolTooltip>

          {/* Pace & Speed Slider with Compact Readout */}
          <ToolTooltip
            title="PLAYBACK PACING"
            why="Controls slideshow interval and transition tempo"
            how="Drag slider to tune shot hold cadence in seconds"
          >
            <div className="hidden xl:flex items-center gap-1 h-[18px] bg-[#141417] px-1.5 rounded border border-white/[0.08] hover:border-[#F59E0B]/60 font-mono text-[8.5px] text-[#8E8E93] shrink-0 transition-colors tabular-nums">
              <input
                type="range"
                min="1"
                max="100"
                value={speed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                aria-label="Playback Tempo"
                className="w-9 accent-[#F59E0B] cursor-pointer h-1 bg-white/15 rounded shrink-0"
              />
              <span className="text-[#F4F4F5] font-bold tabular-nums text-[8.5px]">{intervalSeconds}s</span>
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
                data-active={isPanActive ? 'true' : 'false'}
                style={{ '--item-accent': '#A855F7' } as React.CSSProperties}
                onClick={onTogglePan}
                aria-label="Toggle Frame Pan Tool"
                aria-pressed={isPanActive}
                className={`nle-editorial-btn h-[18px] px-1.5 rounded border flex items-center gap-1 font-mono text-[8.5px] font-bold cursor-pointer shrink-0 tabular-nums ${
                  isPanActive
                    ? 'bg-purple-500/20 border-purple-400/75 text-[#F4F4F5] shadow-[0_0_10px_rgba(168,85,247,0.28)]'
                    : 'bg-[#141417] border-purple-500/20 hover:border-purple-400/60 text-purple-300/75 hover:text-purple-200'
                }`}
              >
                <Move className={`w-2.5 h-2.5 ${isPanActive ? 'text-purple-300' : 'text-current'}`} />
                <span className="tabular-nums text-[8px]">{panOffsetPercent}%</span>
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
                style={{ '--item-accent': '#FB7185' } as React.CSSProperties}
                onClick={onOpenLiquify}
                aria-label="Open Liquify Warp Studio"
                className="nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded bg-[#141417] border border-rose-500/20 hover:border-rose-400/65 text-rose-300/75 hover:text-rose-200 cursor-pointer shrink-0"
              >
                <Wand2 className="w-2.5 h-2.5" />
              </button>
            </ToolTooltip>
          )}

          {/* Tactile ⚡ COCKPIT Hub Button (Positioned cleanly before Title T) */}
          <ToolTooltip
            title="⚡ DIRECTOR COCKPIT HUB"
            why="Opens the 1-Click Interchange & External App Dispatch Hub (Premiere XML, CapCut, Photoshop, Illustrator)"
            how="Click to dispatch active shots or configure signal telemetry"
          >
            <button
              type="button"
              data-testid="control-dock-cockpit-btn"
              style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
              onClick={() => eventBus.emit('cockpit:action', { type: 'open_modal' })}
              aria-label="Open Director Cockpit Hub"
              className="nle-editorial-btn h-[18px] px-1.5 rounded border border-amber-400/45 hover:border-amber-300 bg-gradient-to-b from-[#1E1C18] to-[#121215] text-amber-300 hover:text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_10px_rgba(245,158,11,0.18)] font-mono text-[8.5px] font-black tracking-[0.08em] uppercase flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Zap className="w-[9.5px] h-[9.5px] text-[#F59E0B] fill-current shrink-0" />
              <span>COCKPIT</span>
            </button>
          </ToolTooltip>
        </div>

        {/* ======================================================= */}
        {/* 3. RIGHT WING: TITLES, ZEN, OPTICS & TOOLS */}
        {/* ======================================================= */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Titles ON/OFF & Quick Edit Icon Pair */}
          <div className="relative flex items-center gap-1 shrink-0">
            {onToggleTitles && (
              <ToolTooltip
                title="KINETIC TITLES"
                why="Toggles dynamic title typography and Bangla overlays"
                how="Click to preview clean plates vs. subtitled frames"
              >
                <button
                  type="button"
                  data-active={showTitles ? 'true' : 'false'}
                  style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
                  onClick={onToggleTitles}
                  aria-label="Toggle Titles Layer"
                  aria-pressed={showTitles}
                  className={`nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                    showTitles
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.22)]'
                      : 'bg-[#141417] border-amber-500/20 hover:border-[#F59E0B]/60 text-amber-200/70 hover:text-amber-200'
                  }`}
                >
                  <Type className="w-2.5 h-2.5" />
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
                data-active={isEditingTitle ? 'true' : 'false'}
                style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
                onClick={() => setIsEditingTitle(prev => !prev)}
                aria-label="Edit Shot Title"
                className={`nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                  isEditingTitle
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B]'
                    : 'bg-[#141417] border-amber-500/20 hover:border-[#F59E0B]/60 text-amber-200/70 hover:text-amber-200'
                }`}
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            </ToolTooltip>

            {/* Inline Title Quick Edit Popover */}
            {isEditingTitle && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#0B0B0D]/96 backdrop-blur-2xl border border-white/[0.12] rounded-xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[#8E8E93] border-b border-white/[0.07] pb-1.5 text-[10px] uppercase font-bold tracking-wider">
                  <span>QUICK EDIT TITLES</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="text-[#8E8E93] hover:text-[#F4F4F5]"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase">English Title</label>
                  <input
                    type="text"
                    value={quickTitleInput}
                    onChange={(e) => setQuickTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuickTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    placeholder="Scene Title..."
                    className="w-full h-8 px-2.5 bg-[#141417] border border-white/[0.07] focus:border-[#F59E0B] rounded text-xs text-[#F4F4F5] outline-none"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-[#8E8E93] uppercase">Bangla Subtitle</label>
                  <input
                    type="text"
                    value={quickBengaliInput}
                    onChange={(e) => setQuickBengaliInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuickTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    placeholder="বাংলা শিরোনাম..."
                    className="w-full h-8 px-2.5 bg-[#141417] border border-white/[0.07] focus:border-[#F59E0B] rounded text-xs font-bangla text-[#F4F4F5] outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="px-2.5 py-1 rounded bg-[#141417] hover:bg-white/[0.06] text-[#8E8E93] hover:text-[#F4F4F5] text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickTitle}
                    className="px-3 py-1 rounded bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0B0B0D] font-bold text-[11px]"
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
              className="h-[18px] px-1 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 focus:border-[#F59E0B] text-[#F4F4F5] font-mono text-[8.5px] font-bold outline-none cursor-pointer transition-colors shrink-0 tabular-nums"
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
              className="hidden sm:block h-[18px] px-1 bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 focus:border-[#F59E0B] rounded text-[8.5px] text-[#F4F4F5] font-mono font-bold outline-none cursor-pointer shrink-0 max-w-[74px] truncate"
            >
              {LUT_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B0B0D] text-[#F4F4F5]">
                  {p.label}
                </option>
              ))}
            </select>
          </ToolTooltip>

          {/* Freeze Master Frame */}
          <ToolTooltip
            title="FREEZE MASTER FRAME"
            why="Exports current composite frame as lossless PNG for Photoshop paint-over or thumbnailing."
            how="Click icon to capture & dispatch active frame to Photoshop."
          >
            <button
              type="button"
              data-testid="control-dock-freeze-frame"
              style={{ '--item-accent': '#31A8FF' } as React.CSSProperties}
              onClick={() => handleDispatchToTool('photoshop', currentIndex)}
              aria-label="Freeze Master Frame"
              className="nle-editorial-btn bg-[#141417] border border-sky-400/20 hover:border-sky-400/65 text-sky-300/75 hover:text-sky-200 w-[18px] h-[18px] p-0 rounded cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Camera className="w-2.5 h-2.5" />
            </button>
          </ToolTooltip>

          {/* Ecosystem Bridge */}
          <ToolTooltip
            title="ECOSYSTEM BRIDGE"
            why="Hand off timeline cuts, audio sync & Bangla/English scripts to Premiere, Resolve, or CapCut."
            how="Click to open the Director's Cockpit Interchange Hub."
          >
            <button
              type="button"
              data-testid="control-dock-ecosystem-bridge"
              style={{ '--item-accent': '#9999FF' } as React.CSSProperties}
              onClick={() => eventBus.emit('cockpit:action', { type: 'open_modal' })}
              aria-label="Open Ecosystem Bridge"
              className="nle-editorial-btn bg-[#141417] border border-indigo-400/20 hover:border-indigo-400/65 text-indigo-300/75 hover:text-indigo-200 w-[18px] h-[18px] p-0 rounded cursor-pointer shrink-0 flex items-center justify-center"
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </ToolTooltip>

          {/* Icon-Only Signal Rack Square Toggle Button */}
          <ToolTooltip
            title="SIGNAL RACK"
            why="Opens the 3-Panel Signal Rack (Audio Beat Sync, Voiceover & Subtitles, 3D LUT Grade) cleanly above the timeline."
            how="Click to dock or hide the 3-panel signal processing rack."
          >
            <button
              type="button"
              data-testid="control-dock-signal-rack"
              data-active={isTelemetryRackOpen ? 'true' : 'false'}
              style={{ '--item-accent': '#10B981' } as React.CSSProperties}
              aria-label="Signal Rack"
              aria-pressed={isTelemetryRackOpen}
              onClick={() => {
                if (onToggleTelemetryRack) onToggleTelemetryRack();
                else eventBus.emit('cockpit:toggle_telemetry');
              }}
              className={`nle-editorial-btn w-[18px] h-[18px] rounded border flex items-center justify-center cursor-pointer shrink-0 ${
                isTelemetryRackOpen
                  ? 'bg-emerald-500 text-[#0B0B0D] border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                  : 'bg-[#141417] border-emerald-500/20 hover:border-emerald-400/60 text-emerald-300/75 hover:text-emerald-200'
              }`}
            >
              <SlidersHorizontal className="w-2.5 h-2.5" />
            </button>
          </ToolTooltip>

          {/* Icon-Only All Tools Master Menu Square Button */}
          <ToolTooltip
            title="ALL TOOLS MASTER MENU"
            why="1-click 4-column Master Command Menu for every engine, preset, scope, vault, and export tool."
            how="Click to browse all modules and launch any tool immediately."
          >
            <button
              type="button"
              data-testid="control-dock-all-tools"
              data-active={isAllToolsOpen ? 'true' : 'false'}
              style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
              aria-label="All Tools Master Menu"
              aria-expanded={isAllToolsOpen}
              onClick={() => setIsAllToolsOpen((prev) => !prev)}
              className={`nle-editorial-btn w-[18px] h-[18px] rounded border flex items-center justify-center cursor-pointer shrink-0 ${
                isAllToolsOpen
                  ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                  : 'bg-[#141417] border-amber-500/20 hover:border-[#F59E0B]/60 text-amber-300/75 hover:text-amber-200'
              }`}
            >
              <LayoutGrid className="w-2.5 h-2.5" />
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
                data-active={isZenMode ? 'true' : 'false'}
                style={{ '--item-accent': '#A855F7' } as React.CSSProperties}
                onClick={onToggleZen}
                aria-label="Toggle Zen Focus Mode"
                aria-pressed={isZenMode}
                className={`nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                  isZenMode
                    ? 'bg-purple-500/20 border-purple-400/70 text-purple-300'
                    : 'bg-[#141417] border-purple-500/20 hover:border-purple-400/60 text-purple-300/75 hover:text-purple-200'
                }`}
              >
                <Focus className="w-2.5 h-2.5" />
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
              data-active={showHud ? 'true' : 'false'}
              style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
              aria-pressed={showHud}
              aria-label="Toggle Stage HUD (H)"
              onClick={onToggleHud}
              className={`nle-editorial-btn w-[18px] h-[18px] p-0 rounded border cursor-pointer shrink-0 flex items-center justify-center ${
                showHud
                  ? 'bg-sky-500/15 border-sky-400/65 text-sky-300'
                  : 'bg-[#141417] border-sky-500/20 hover:border-sky-400/60 text-sky-300/70 hover:text-sky-200'
              }`}
            >
              <Eye className="w-2.5 h-2.5" />
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
                data-active={showGuides ? 'true' : 'false'}
                style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
                onClick={onToggleGuides}
                aria-label="Toggle Composition Guides"
                aria-pressed={showGuides}
                className={`nle-editorial-btn w-[18px] h-[18px] p-0 rounded border cursor-pointer shrink-0 flex items-center justify-center ${
                  showGuides
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B]'
                    : 'bg-[#141417] border-amber-500/20 hover:border-[#F59E0B]/60 text-amber-200/70 hover:text-amber-200'
                }`}
              >
                <Crosshair className="w-2.5 h-2.5" />
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
                style={{ '--item-accent': '#10B981' } as React.CSSProperties}
                onClick={onCaptureStill}
                aria-label="Capture High-Res Still"
                className="nle-editorial-btn w-[18px] h-[18px] p-0 rounded bg-[#141417] border border-emerald-500/20 hover:border-emerald-400/60 text-emerald-300/75 hover:text-emerald-200 cursor-pointer shrink-0 flex items-center justify-center"
              >
                <Camera className="w-2.5 h-2.5" />
              </button>
            </ToolTooltip>
          )}

          {/* Track VU Meter & Master Audio Engine (compact mute icon + w-16 L/R meter so all icons fit cleanly) */}
          <div className="flex items-center shrink-0">
            <TrackVuMeter
              variant="dock"
              showLabels={false}
              showWaveEditor={false}
              showDbReadout={false}
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
                className="h-[18px] px-1 rounded border flex items-center gap-1 font-mono text-[8.5px] font-bold cursor-pointer transition-all active:scale-95 shrink-0 bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F4F4F5] tabular-nums"
              >
                <RotateCcw className="w-2.5 h-2.5 text-[#F59E0B]" />
                <span className="tabular-nums text-[8px]">
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
              data-active={viewMode === 'grid' ? 'true' : 'false'}
              style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
              onClick={onToggleViewMode}
              aria-label="Toggle Contact Sheet Grid (G)"
              className={`nle-editorial-btn w-[18px] h-[18px] p-0 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                viewMode === 'grid'
                  ? 'bg-[#F59E0B] text-[#0B0B0D] border-[#F59E0B]'
                  : 'bg-[#141417] border-amber-500/20 hover:border-[#F59E0B]/60 text-amber-200/70 hover:text-amber-200'
              }`}
            >
              <Grid className="w-2.5 h-2.5" />
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
              style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
              onClick={onOpenInspector}
              aria-label="Open Director Optical Inspector (E)"
              className="nle-editorial-btn w-[18px] h-[18px] p-0 rounded bg-[#141417] border border-sky-500/20 hover:border-sky-400/60 text-sky-300/75 hover:text-sky-200 cursor-pointer shrink-0 flex items-center justify-center"
            >
              <Sliders className="w-2.5 h-2.5" />
            </button>
          </ToolTooltip>

          {/* Collapse / Expand Bottom Strip Toggle */}
          <ToolTooltip
            title={isStripCollapsed ? 'SHOW SHOT STRIP' : 'HIDE SHOT STRIP'}
            why="Collapses the 100-shot strip so the video playback stage commands maximum vertical space."
            how="Click to fold or unfold the thumbnail filmstrip."
          >
            <button
              type="button"
              data-testid="control-dock-strip-toggle"
              aria-expanded={!isStripCollapsed}
              aria-label={isStripCollapsed ? 'Expand Shot Strip' : 'Collapse Shot Strip'}
              onClick={() => {
                setHoveredMarker(null);
                setIsStripCollapsed((c) => !c);
              }}
              className={`w-[18px] h-[18px] p-0 rounded border cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center ${
                isStripCollapsed
                  ? 'bg-[#F59E0B]/15 border-[#F59E0B]/65 text-[#F59E0B]'
                  : 'bg-[#141417] border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
            >
              {isStripCollapsed ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
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
              className="w-5 h-5 p-0 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer transition-all active:scale-95 shrink-0 flex items-center justify-center"
            >
              {isFullscreen ? <Minimize2 className="w-[11px] h-[11px]" /> : <Maximize2 className="w-[11px] h-[11px]" />}
            </button>
          </ToolTooltip>
        </div>
      </div>
      </div>

      {/* Transient Cockpit Dispatch Toast */}
      {cockpitToast && typeof document !== 'undefined' && createPortal(
        <div
          style={{ zIndex: 9999 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] px-3.5 py-2 rounded-lg bg-[#0B0B0D]/95 border border-[#F59E0B]/60 text-[#F4F4F5] font-mono text-[11px] font-bold shadow-2xl backdrop-blur-md pointer-events-none tabular-nums"
        >
          {cockpitToast}
        </div>,
        document.body
      )}

      {/* Floating Portal Directorial Dispatch HUD (Right-Click / Context Trigger with Zero-Prompt EDIT IN App Strip) */}
      {dispatchHudAnchor && typeof document !== 'undefined' && createPortal(
        <div
          data-testid="directorial-dispatch-hud"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 236, Math.max(12, dispatchHudAnchor.left - 108))}px`,
            top: `${Math.max(16, dispatchHudAnchor.top - 8)}px`,
            transform: 'translateY(-100%)',
            zIndex: 9999
          }}
          className="z-[9999] w-56 bg-[#0B0B0D]/96 backdrop-blur-xl border border-white/[0.12] rounded-lg p-2 shadow-[0_18px_45px_rgba(0,0,0,0.95)] font-mono text-[10px] flex flex-col gap-1.5 animate-in fade-in zoom-in-95 tabular-nums"
        >
          <div className="text-[8px] text-[#8E8E93] font-bold uppercase px-1 border-b border-white/[0.07] pb-1 flex items-center justify-between">
            <span>EDIT IN // SH{String(dispatchHudAnchor.idx + 1).padStart(2, '0')}</span>
            <span className="text-[#F59E0B] tabular-nums">
              {(allCockpitShots[dispatchHudAnchor.idx]?.durationSec ?? 12.0).toFixed(1)}s
            </span>
          </div>

          <EditInAppStrip
            shotIndex={dispatchHudAnchor.idx}
            frame={safeFrames[dispatchHudAnchor.idx]}
            variant="context"
            onLaunched={() => setDispatchHudAnchor(null)}
          />

          <div className="border-t border-white/[0.07] pt-1 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleDispatchToTool('photoshop', dispatchHudAnchor.idx)}
              className="px-2 py-1 rounded bg-[#141417] border border-white/[0.07] hover:bg-[#F59E0B] hover:text-[#0B0B0D] hover:border-[#F59E0B] text-[#F4F4F5] text-left font-bold flex items-center justify-between transition-colors cursor-pointer text-[9.5px]"
            >
              <span>[ DOWNLOAD // FRAME PNG ]</span>
              <Camera className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleDispatchToTool('premiere', dispatchHudAnchor.idx)}
              className="px-2 py-1 rounded bg-[#141417] border border-white/[0.07] hover:bg-[#F59E0B] hover:text-[#0B0B0D] hover:border-[#F59E0B] text-[#F4F4F5] text-left font-bold flex items-center justify-between transition-colors cursor-pointer text-[9.5px]"
            >
              <span>[ DOWNLOAD // FCP7 XML ]</span>
              <Film className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleDispatchToTool('capcut', dispatchHudAnchor.idx)}
              className="px-2 py-1 rounded bg-[#141417] border border-white/[0.07] hover:bg-[#F59E0B] hover:text-[#0B0B0D] hover:border-[#F59E0B] text-[#F4F4F5] text-left font-bold flex items-center justify-between transition-colors cursor-pointer text-[9.5px]"
            >
              <span>[ DOWNLOAD // CAPCUT ZIP ]</span>
              <Zap className="w-3 h-3" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Glassmorphic Media Asset Vault Modal (Bottom Toolbar MEDIA Trigger) */}
      <MediaAssetVaultModal
        isOpen={isMediaVaultOpen}
        onClose={() => setIsMediaVaultOpen(false)}
        currentIndex={currentIndex}
        currentFrame={currentFrame}
        onAssignToActiveShot={async (blob, name, mimeType) => {
          const targetFrame = safeFrames[currentIndex];
          const file = blob instanceof File ? blob : new File([blob], name, { type: mimeType });
          if (onUploadMediaForIndex) {
            onUploadMediaForIndex(currentIndex, file);
            return;
          }
          const shotKey = getShotMediaKey(targetFrame, currentIndex);
          const entry = await saveShotMediaBlob(shotKey, file, file.name);
          useStudioStore.getState().setShotMediaEntry(shotKey, entry);
          if (onUpdateFrameAtIndex && targetFrame) {
            onUpdateFrameAtIndex(currentIndex, {
              ...targetFrame,
              imageUrl: entry.url,
              thumbnailUrl: entry.type === 'image' ? entry.url : targetFrame.thumbnailUrl,
              isVideo: entry.type === 'video'
            });
          }
        }}
      />

      {/* 4-Column Master Command Popover (ALL TOOLS) */}
      {isAllToolsOpen && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px]"
            onClick={() => setIsAllToolsOpen(false)}
          />
          <div
            data-testid="all-tools-mega-popover"
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 w-[min(96vw,1080px)] max-h-[72vh] overflow-y-auto z-[9999] bg-[#0B0B0D]/96 border border-white/[0.07] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.98)] p-4 font-mono text-[#F4F4F5] animate-in fade-in zoom-in-95 duration-150 tabular-nums"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-xs font-black tracking-widest uppercase text-[#F4F4F5]">
                  MASTER STUDIO COMMAND DIRECTORY
                </span>
                <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[9px] font-bold">
                  1-CLICK ACCESS
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAllToolsOpen(false)}
                className="p-1 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] cursor-pointer"
                aria-label="Close All Tools Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[10.5px]">
              {/* Column 1: Stage & Camera */}
              <div className="bg-[#141417]/70 border border-white/[0.07] rounded-lg p-2.5 space-y-1.5">
                <div className="text-[9.5px] font-black tracking-widest uppercase text-[#8E8E93] border-b border-white/[0.07] pb-1">
                  STAGE &amp; CAMERA
                </div>
                {[
                  { label: 'Tactile Cinema Stage', icon: Film, action: () => eventBus.emit('studio:select_panel', { panel: 'TACTILE_STAGE' }) },
                  { label: 'Reels Split Sequencer', icon: Scissors, action: () => eventBus.emit('studio:select_panel', { panel: 'SPLIT' }) },
                  { label: 'Optical Monitor', icon: Eye, action: () => eventBus.emit('studio:select_panel', { panel: 'OPTICAL' }) },
                  { label: 'Scrub Precision Timeline', icon: Clock, action: () => eventBus.emit('studio:select_panel', { panel: 'SEQUENCER' }) },
                  { label: 'Multi-Cam 2x2 Monitor', icon: LayoutGrid, action: () => eventBus.emit('studio:open_multicam') },
                  { label: 'Bloom Interactive Stage', icon: Sparkles, action: () => eventBus.emit('studio:open_bloom') },
                  { label: 'Optics & Crop Drawer', icon: Sliders, action: () => eventBus.emit('studio:open_module', { module: 'OPTICS' }) },
                  { label: 'Director Inspector Sidebar', icon: SlidersHorizontal, action: () => onOpenInspector() },
                  { label: 'Safe Composition Guides', icon: Crosshair, action: () => onToggleGuides?.() },
                  { label: 'Multi-Layer Parallax Zoom', icon: Move, action: () => eventBus.emit('cockpit:toggle_zoom') }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setIsAllToolsOpen(false);
                        item.action();
                      }}
                      className="group w-full px-2 py-1.5 rounded bg-[#141417] hover:bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-left text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Column 2: 34-Preset Lights, FX & Typography */}
              <div className="bg-[#141417]/70 border border-white/[0.07] rounded-lg p-2.5 space-y-1.5">
                <div className="text-[9.5px] font-black tracking-widest uppercase text-[#8E8E93] border-b border-white/[0.07] pb-1">
                  LIGHTS, LUTS &amp; TYPOGRAPHY
                </div>
                {[
                  { label: '34-Preset Lighting Rig', icon: Lightbulb, action: () => eventBus.emit('lighting:open') },
                  { label: '15 Hollywood Film LUTs', icon: Layers, action: () => eventBus.emit('studio:open_module', { module: 'LIBRARY' }) },
                  { label: 'Liquify & Mesh Warp', icon: Wand2, action: () => onOpenLiquify?.() },
                  { label: 'Typography & Subtitles', icon: Type, action: () => eventBus.emit('studio:open_module', { module: 'TEXT' }) },
                  { label: 'Toggle Stage Captions', icon: Eye, action: () => onToggleTitles?.() },
                  { label: 'Story & Script Notebook', icon: Pencil, action: () => eventBus.emit('studio:open_module', { module: 'STORY' }) },
                  { label: 'AI Director Prompts', icon: Sparkles, action: () => eventBus.emit('studio:open_module', { module: 'AI' }) },
                  { label: 'Frame Markup & Review', icon: Focus, action: () => eventBus.emit('studio:open_module', { module: 'REVIEW' }) }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setIsAllToolsOpen(false);
                        item.action();
                      }}
                      className="group w-full px-2 py-1.5 rounded bg-[#141417] hover:bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-left text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Column 3: Signal Rack, Scopes & Media Vault */}
              <div className="bg-[#141417]/70 border border-white/[0.07] rounded-lg p-2.5 space-y-1.5">
                <div className="text-[9.5px] font-black tracking-widest uppercase text-[#8E8E93] border-b border-white/[0.07] pb-1">
                  SIGNAL RACK, SCOPES &amp; VAULT
                </div>
                {[
                  { label: 'Modular 3-Panel Signal Rack', icon: SlidersHorizontal, action: () => (onToggleTelemetryRack ? onToggleTelemetryRack() : eventBus.emit('cockpit:toggle_telemetry')) },
                  { label: 'IRE & RGB Video Scopes', icon: BarChart3, action: () => eventBus.emit('studio:open_scopes') },
                  { label: 'Spectral Frequency Analyzer', icon: Activity, action: () => eventBus.emit('cockpit:toggle_spectrum') },
                  { label: 'Sound DSP Studio', icon: Volume2, action: () => eventBus.emit('studio:open_module', { module: 'SOUND' }) },
                  { label: 'Toggle Audio Beat Snap', icon: Music, action: () => handleSnapToBeatToggle() },
                  { label: '100-Shot Contact Sheet Grid', icon: Grid, action: () => onToggleViewMode() },
                  { label: 'Media Asset Vault', icon: FolderOpen, action: () => eventBus.emit('studio:open_module', { module: 'MEDIA' }) },
                  { label: 'Cloudflare R2 Cloud Sync', icon: Cloud, action: () => eventBus.emit('studio:open_module', { module: 'R2_STORAGE' }) },
                  { label: 'Multi-Project IDB Manager', icon: Layers, action: () => eventBus.emit('studio:open_project_manager') }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setIsAllToolsOpen(false);
                        item.action();
                      }}
                      className="group w-full px-2 py-1.5 rounded bg-[#141417] hover:bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-left text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Column 4: Cockpit Export, Recorder & System */}
              <div className="bg-[#141417]/70 border border-white/[0.07] rounded-lg p-2.5 space-y-1.5">
                <div className="text-[9.5px] font-black tracking-widest uppercase text-[#8E8E93] border-b border-white/[0.07] pb-1">
                  COCKPIT, EXPORT &amp; SYSTEM
                </div>
                {[
                  { label: "Director's Cockpit Hub", icon: Zap, action: () => eventBus.emit('cockpit:action', { type: 'open_modal' }) },
                  { label: 'Freeze PNG to Photoshop', icon: Camera, action: () => handleDispatchToTool('photoshop', currentIndex) },
                  { label: 'Export FCPXML (Premiere/Resolve)', icon: Download, action: () => eventBus.emit('cockpit:action', { type: 'nle_xml' }) },
                  { label: 'Build CapCut Quick-Pack ZIP', icon: Download, action: () => eventBus.emit('cockpit:action', { type: 'capcut_pack' }) },
                  { label: 'Master MP4 / PDF Export Studio', icon: Film, action: () => eventBus.emit('studio:open_export', { tab: 'mp4' }) },
                  { label: 'Animatic Cinema Player', icon: Play, action: () => eventBus.emit('studio:open_animatic') },
                  { label: '4K Screen Recorder Dock', icon: Video, action: () => eventBus.emit('studio:toggle_recorder') },
                  { label: 'Compilation Wizard', icon: Sparkles, action: () => eventBus.emit('studio:open_compile') },
                  { label: 'Studio Settings & Codecs', icon: Settings, action: () => eventBus.emit('settings:open') },
                  { label: 'Keyboard Shortcuts & Self-Test', icon: Keyboard, action: () => eventBus.emit('shortcuts:open') }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setIsAllToolsOpen(false);
                        item.action();
                      }}
                      className="group w-full px-2 py-1.5 rounded bg-[#141417] hover:bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-left text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
