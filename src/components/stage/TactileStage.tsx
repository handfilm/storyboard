/**
 * @file /src/components/stage/TactileStage.tsx
 * @description Master Tactile Cinema Stage & Adaptive Dual-Stream Viewport.
 * Features:
 * - Dynamic Dual-Stream Engine: Lightweight 540p proxy for 24fps zero-latency scrubbing,
 *   full-resolution 4K/1080p source file during playback and fullscreen.
 * - Reactive real-time bilingual titles (Bangla + English).
 * - Zero-cloud bulk ingest via Drag & Drop directly into IndexedDB media_vault.
 */

import React, { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { PlaybackMode } from '../../types/editor';
import { StageTextOverlay } from '../StageTextOverlay';
import { studioDraftDb } from '../../services/db';
import { getLutFilterCSS, calculateMultiLayerZoom } from '../../utils/engine';
import { useStudioStore } from '../../core/store';
import { getShotMediaKey, resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import {
  clampGpuPanZoom,
  computeThreeSlotIndices,
  createSeekGuardController
} from '../../utils/stagePlaybackMath';
import {
  Play,
  Pause,
  Upload,
  Maximize2,
  Film,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Volume2,
  VolumeX,
  Type,
  ZoomIn,
  Repeat,
  Music,
  Zap,
  RotateCcw
} from 'lucide-react';
import { getBarrelDistortionMapUrl, clampBarrelDistortion } from '../../utils/barrelDistortionFilter';
import { WebCodecsStageCompositor } from './WebCodecsStageCompositor';
import { opfsMediaStorage } from '../../services/media/opfsMediaStorage';
import { StudioModuleId } from '../StudioNavRail';
import { ReviewMarkupCanvas } from './ReviewMarkupCanvas';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import {
  extractVideoPoster,
  thumbnailMemoryCache,
  cleanupVideoElement,
  isVideoSourceUrl,
  isSvgPlaceholderUrl,
  getCachedThumbnailUrl
} from '../../services/thumbnailEngine';
import { handleFileUpload } from '../../services/mediaIngestService';
import { useTitleContainerRepaint } from '../../hooks/useTitleContainerRepaint';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { audioEngine } from '../../utils/audioEngine';
import { framesToTimecode } from '../../utils/timecode';
import {
  clampShotDuration,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps,
  calculateMasterSequenceDuration,
  formatRuntimeTimecode
} from '../../types/storyboard';
import {
  buildFilmStockCssFilter,
  applyCinematicPostProcess,
  getFilmStockMeta
} from '../../services/cinematicFilterEngine';
import { FilterGradingTray } from './FilterGradingTray';
import { KineticCaptionOverlay } from './KineticCaptionOverlay';
import { KineticAdTextDrawer } from './KineticAdTextDrawer';
import { DopamineCompilationSequence } from './templates/DopamineCompilationSequence';
import { FrameAdjustments, LutPreset } from '../../types/anthology';
import { depthOcclusionService } from '../../services/depthOcclusionService';
import { transientPunchEngine } from '../../services/transientPunchEngine';
import { StageMetadataFxBar } from './StageMetadataFxBar';
import { StageCaptionStrip } from './StageCaptionStrip';
import { VlcStageBar } from './VlcStageBar';
import { getLightingPresetById } from '../../data/lightingPresets';
import { getShotProceduralSpec, renderProceduralBackdropToCanvas } from '../../data/proceduralCinemaEngine';
import { formatFullSMPTETimecode } from '../../types/storyboard';
import { playbackClock, syncVideoCurrentTimeWithFastSeek, type VlcLoopMode, type VlcAbLoop } from '../../utils/playbackClock';
import { applyVlcMediaGain, resumeVlcAudioContext } from '../../utils/vlcAudioPreamp';
import { videoCacheService } from '../../services/videoCacheService';

export interface TactileStageProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onUpdateFrameAtIndex?: (index: number, updated: AnthologyFrame) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUploadImage?: (file: File) => void;
  onUploadMediaForIndex?: (index: number, file: File) => void;
  onOpenAnimatic?: () => void;
  onOpenInspector?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideTimeSec?: number;
  onTogglePlay?: () => void;
  onStepFrame?: (fwd: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
  onPurgeMedia?: () => void;
  projectTitle?: string;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
  isAudioMuted?: boolean;
  activeModule?: StudioModuleId;
  fitMode?: 'cover' | 'contain' | 'fill';
  seekVersion?: number;
  onSyncVideoTime?: (shotIndex: number, timeSec: number) => void;
  onAdvanceFromVideoClock?: (shotIndex: number) => void;
  isBorderlessFullscreen?: boolean;
  isCursorAwake?: boolean;
  onToggleBorderlessFullscreen?: () => void;
}

export const TactileStage: React.FC<TactileStageProps> = ({
  frames = [],
  currentIndex = 0,
  currentFrame,
  aspectRatio = '2.39:1',
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  componentsVisibility,
  onSelectFrame,
  onUpdateFrame,
  onUpdateFrameAtIndex,
  onApplyDurationToAll,
  onMatchAudioBeats,
  onUploadImage,
  onUploadMediaForIndex,
  onOpenInspector,
  onToggleTitles,
  showTitles = true,
  playbackMode = 'sequence',
  onTogglePlay,
  onStepFrame,
  slideTimeSec = 0,
  playbackSpeed = 1.0,
  onPurgeMedia,
  activeModule,
  onScrubSlideTime,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onReorderFrames,
  detectedBpm = 120,
  isAudioMuted = true,
  fitMode = 'cover',
  seekVersion = 0,
  onSyncVideoTime,
  onAdvanceFromVideoClock,
  isBorderlessFullscreen,
  isCursorAwake = true,
  onToggleBorderlessFullscreen,
  onSelectPlaybackMode,
  onChangePlaybackSpeed,
  onToggleMute,
  onOpenCinemaPlayer
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const slotVideoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const seekGuardRef = useRef(createSeekGuardController());
  const lastVideoClockTimeRef = useRef<number>(0);
  const accumulatedShotClockRef = useRef<number>(0);
  const lastHandledSeekVersionRef = useRef<number>(seekVersion);
  const lastShotEntrySeekKeyRef = useRef<string>('');
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTitleContainerRef = useRef<HTMLDivElement | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef<boolean>(false);
  const isDraggingScrubberRef = useRef<boolean>(false);
  const lastScrubTimeRef = useRef<number>(0);
  const wasAudioMutedBeforeScrubRef = useRef<boolean>(true);
  const slideTimeSecRef = useRef<number>(slideTimeSec);
  slideTimeSecRef.current = slideTimeSec;
  const currentIndexRef = useRef<number>(currentIndex);
  currentIndexRef.current = currentIndex;

  const cachedPosterImgRef = useRef<HTMLImageElement | null>(null);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [cachedPosterUrl, setCachedPosterUrl] = useState<string | null>(null);
  const [stillPlateRevision, setStillPlateRevision] = useState<number>(0);
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const effectiveFullscreen = isBorderlessFullscreen ?? localFullscreen;
  const hideFullscreenStageBars = Boolean(effectiveFullscreen && !isCursorAwake);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);
  const [isWebCodecsEngineActive, setIsWebCodecsEngineActive] = useState<boolean>(true);
  const [nativeVideoDuration, setNativeVideoDuration] = useState<number>(0);
  const [loopMode, setLoopMode] = useState<VlcLoopMode>(playbackMode === 'solo' ? 'repeat-one' : 'sequence');
  const [abLoop, setAbLoop] = useState<VlcAbLoop>({ a: null, b: null });
  const [stageFitMode, setStageFitMode] = useState<'contain' | 'cover' | 'fill'>(fitMode === 'contain' ? 'contain' : 'cover');
  const [clickBeacon, setClickBeacon] = useState<'play' | 'pause' | null>(null);
  const lastParentSyncTsRef = useRef<number>(0);
  const clickBeaconTimerRef = useRef<number | null>(null);

  const storeAudioVolume = useStudioStore((s) => s.audioVolume);
  const setStoreAudioVolume = useStudioStore((s) => s.setAudioVolume);
  const storeIsAudioMuted = useStudioStore((s) => s.isAudioMuted);
  const toggleStoreAudio = useStudioStore((s) => s.toggleAudio);
  const setStoreAspectRatio = useStudioStore((s) => s.setAspectRatio);
  const setStoreFitMode = useStudioStore((s) => s.setFitMode);

  const effectiveMuted = isAudioMuted ?? storeIsAudioMuted;
  const effectiveVolume = Number.isFinite(storeAudioVolume) ? storeAudioVolume : 0.85;

  useEffect(() => {
    setStageFitMode(fitMode === 'contain' ? 'contain' : fitMode === 'fill' ? 'fill' : 'cover');
  }, [fitMode]);

  useEffect(() => {
    setLoopMode(playbackMode === 'solo' ? 'repeat-one' : 'sequence');
  }, [playbackMode]);

  // Reset A-B loop & native duration cleanly when switching shots
  useEffect(() => {
    setAbLoop({ a: null, b: null });
    setNativeVideoDuration(0);
  }, [currentIndex]);

  // Auto-open filter dock when OPTICS or LIBRARY module is selected
  useEffect(() => {
    if (activeModule === 'OPTICS' || activeModule === 'LIBRARY') {
      setIsFilterTrayOpen(true);
    }
  }, [activeModule]);

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const zoomTransforms = calculateMultiLayerZoom(bgZoom, fgZoom, isVertigo);

  // Digital Zoom & Barrel Distortion Simulation
  const stageMediaContainerRef = useRef<HTMLDivElement | null>(null);
  const digitalZoom = useStudioStore((s) => s.digitalZoom);
  const setDigitalZoom = useStudioStore((s) => s.setDigitalZoom);
  const resetDigitalZoom = useStudioStore((s) => s.resetDigitalZoom);
  const stageScale = useStudioStore((s) => s.stageScale);
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);

  const [distortionMapUrl, setDistortionMapUrl] = useState<string>('');
  useEffect(() => {
    setDistortionMapUrl(getBarrelDistortionMapUrl());
  }, []);

  const storeBarrelDistortion = useStudioStore((s) => s.visibility.barrelDistortion);
  const barrelDistortion = clampBarrelDistortion(
    componentsVisibility?.barrelDistortion ?? storeBarrelDistortion ?? 0
  );

  // 60fps Direct-DOM GPU Pan & Zoom (`1.0x` - `4.0x`) + 16:9 Marquee Fallback when zoom === 1.0x
  const gpuZoomRef = useRef<{ zoom: number; panX: number; panY: number }>({ zoom: 1.0, panX: 0, panY: 0 });
  const zoomSyncTimerRef = useRef<number | null>(null);
  const gpuPanDragRef = useRef<{
    isDown: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({ isDown: false, startClientX: 0, startClientY: 0, startPanX: 0, startPanY: 0 });

  const applyGpuTransformImmediate = useCallback((rawZoom: number, rawPanX: number, rawPanY: number, syncStoreDebounced = true) => {
    const rect = stageMediaContainerRef.current?.getBoundingClientRect();
    const w = rect?.width || 1280;
    const h = rect?.height || 536;
    const clamped = clampGpuPanZoom(rawZoom, rawPanX, rawPanY, w, h);
    gpuZoomRef.current = { zoom: clamped.zoom, panX: clamped.panX, panY: clamped.panY };

    if (stageViewportRef.current) {
      stageViewportRef.current.style.transition = 'none';
      stageViewportRef.current.style.transform = clamped.cssTransform;
    }

    if (syncStoreDebounced) {
      if (zoomSyncTimerRef.current !== null) {
        window.clearTimeout(zoomSyncTimerRef.current);
      }
      zoomSyncTimerRef.current = window.setTimeout(() => {
        const cur = gpuZoomRef.current;
        const pctX = w > 0 ? Math.round((cur.panX / w) * 1000) / 10 : 0;
        const pctY = h > 0 ? Math.round((cur.panY / h) * 1000) / 10 : 0;
        if (cur.zoom <= 1.005) {
          resetDigitalZoom();
        } else {
          setDigitalZoom({
            scale: Math.round(cur.zoom * 100) / 100,
            translateX: pctX,
            translateY: pctY,
            isZoomed: true
          });
        }
      }, 120);
    }
  }, [resetDigitalZoom, setDigitalZoom]);

  // Sync external Reset Zoom button cleanly back into direct-DOM transform ref
  useEffect(() => {
    if (!digitalZoom.isZoomed && gpuZoomRef.current.zoom > 1.001) {
      gpuZoomRef.current = { zoom: 1.0, panX: 0, panY: 0 };
      if (stageViewportRef.current) {
        stageViewportRef.current.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
        stageViewportRef.current.style.transform = 'none';
      }
    }
  }, [digitalZoom.isZoomed]);

  useEffect(() => {
    return () => {
      if (zoomSyncTimerRef.current !== null) {
        window.clearTimeout(zoomSyncTimerRef.current);
      }
    };
  }, []);

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 0.5) return;
    e.preventDefault();
    const cur = gpuZoomRef.current;
    const factor = 1 - e.deltaY * 0.0018;
    const nextZoom = Math.max(1.0, Math.min(4.0, cur.zoom * factor));
    const ratio = cur.zoom > 0 ? nextZoom / cur.zoom : 1;
    applyGpuTransformImmediate(nextZoom, cur.panX * ratio, cur.panY * ratio, true);
  };

  // 16:9 Marquee Selection Drag State (Active when zoom === 1.0x)
  const [selectionBox, setSelectionBox] = useState<{
    isSelecting: boolean;
    left: number;
    top: number;
    width: number;
    height: number;
    scale: number;
  } | null>(null);

  const selectionDragRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    rectWidth: number;
    rectHeight: number;
    hasDragged: boolean;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    rectWidth: 0,
    rectHeight: 0,
    hasDragged: false
  });

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isScrubbingRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, [data-interactive="true"]')) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // When zoomed in (>1.01x), click-drag pans at locked 60fps via direct GPU transform mutation
    if (gpuZoomRef.current.zoom > 1.01) {
      gpuPanDragRef.current = {
        isDown: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: gpuZoomRef.current.panX,
        startPanY: gpuZoomRef.current.panY
      };
      return;
    }

    const rect = stageMediaContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const startY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    selectionDragRef.current = {
      isDown: true,
      startX,
      startY,
      rectWidth: rect.width,
      rectHeight: rect.height,
      hasDragged: false
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gpuPanDragRef.current.isDown) {
      const dx = e.clientX - gpuPanDragRef.current.startClientX;
      const dy = e.clientY - gpuPanDragRef.current.startClientY;
      applyGpuTransformImmediate(
        gpuZoomRef.current.zoom,
        gpuPanDragRef.current.startPanX + dx,
        gpuPanDragRef.current.startPanY + dy,
        false
      );
      return;
    }

    if (!selectionDragRef.current.isDown) return;
    const { startX, startY, rectWidth, rectHeight } = selectionDragRef.current;
    const rect = stageMediaContainerRef.current?.getBoundingClientRect();
    const currentW = rect?.width || rectWidth;
    const currentH = rect?.height || rectHeight;
    const currentClientLeft = rect?.left || 0;
    const currentClientTop = rect?.top || 0;

    const currentX = Math.max(0, Math.min(currentW, e.clientX - currentClientLeft));
    const currentY = Math.max(0, Math.min(currentH, e.clientY - currentClientTop));

    const dx = currentX - startX;
    const dy = currentY - startY;

    if (!selectionDragRef.current.hasDragged) {
      if (Math.hypot(dx, dy) < 6) return;
      selectionDragRef.current.hasDragged = true;
    }

    // Strict 16:9 Aspect Ratio Lock
    const targetRatio = 16 / 9;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let boxWidth = absDx;
    let boxHeight = absDx / targetRatio;

    if (absDx / targetRatio < absDy) {
      boxHeight = absDy;
      boxWidth = absDy * targetRatio;
    }

    const dirX = dx >= 0 ? 1 : -1;
    const dirY = dy >= 0 ? 1 : -1;

    const maxW = dirX > 0 ? (currentW - startX) : startX;
    const maxH = dirY > 0 ? (currentH - startY) : startY;

    if (boxWidth > maxW) {
      boxWidth = maxW;
      boxHeight = boxWidth / targetRatio;
    }
    if (boxHeight > maxH) {
      boxHeight = maxH;
      boxWidth = boxHeight * targetRatio;
    }

    const left = dirX > 0 ? startX : (startX - boxWidth);
    const top = dirY > 0 ? startY : (startY - boxHeight);
    const scale = boxWidth > 0 ? Math.min(4.0, currentW / boxWidth) : 1.0;

    setSelectionBox({
      isSelecting: true,
      left,
      top,
      width: boxWidth,
      height: boxHeight,
      scale
    });
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gpuPanDragRef.current.isDown) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      gpuPanDragRef.current.isDown = false;
      applyGpuTransformImmediate(
        gpuZoomRef.current.zoom,
        gpuZoomRef.current.panX,
        gpuZoomRef.current.panY,
        true
      );
      return;
    }

    if (selectionDragRef.current.isDown) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      let didZoomMarquee = false;
      if (selectionBox?.isSelecting && selectionBox.width >= 24 && selectionBox.height >= 14) {
        didZoomMarquee = true;
        const rect = stageMediaContainerRef.current?.getBoundingClientRect();
        const currentW = rect?.width || selectionDragRef.current.rectWidth || 1;
        const currentH = rect?.height || selectionDragRef.current.rectHeight || 1;

        const cx = selectionBox.left + selectionBox.width / 2;
        const cy = selectionBox.top + selectionBox.height / 2;
        const ncx = cx / currentW;
        const ncy = cy / currentH;
        const scale = Math.min(4.0, Math.max(1.05, currentW / selectionBox.width));
        const panX = (0.5 - ncx) * currentW * scale;
        const panY = (0.5 - ncy) * currentH * scale;
        applyGpuTransformImmediate(scale, panX, panY, true);
      }

      const wasCleanClick = !selectionDragRef.current.hasDragged && !didZoomMarquee;
      selectionDragRef.current.isDown = false;
      selectionDragRef.current.hasDragged = false;
      setSelectionBox(null);

      // Single click on viewport toggles Play/Pause cleanly like VLC
      if (wasCleanClick && onTogglePlay) {
        onTogglePlay();
        const nextBeacon = !isAutoplay ? 'play' : 'pause';
        setClickBeacon(nextBeacon);
        if (clickBeaconTimerRef.current) window.clearTimeout(clickBeaconTimerRef.current);
        clickBeaconTimerRef.current = window.setTimeout(() => setClickBeacon(null), 550);
      }
    }
  };

  const handleStagePointerCancel = () => {
    gpuPanDragRef.current.isDown = false;
    selectionDragRef.current.isDown = false;
    selectionDragRef.current.hasDragged = false;
    setSelectionBox(null);
  };

  const storeTitleConfig = useStudioStore(s => s.titleConfig);
  const storeVisibility = useStudioStore(s => s.visibility.titlesAll);
  const toggleTitlesStore = useStudioStore(s => s.toggleTitles);
  const kineticOcclusion = useStudioStore(s => s.kineticOcclusion);
  const isTitlesActive = componentsVisibility !== undefined
    ? Boolean(
        showTitles !== false &&
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean((showTitles !== false) && (storeTitleConfig?.showTitles ?? true) && (storeVisibility ?? true));

  // Active frame fallback
  const frame = currentFrame || frames[currentIndex] || frames[0];

  const kineticOcclusionRef = useRef(kineticOcclusion);
  kineticOcclusionRef.current = kineticOcclusion;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const isTitlesActiveRef = useRef(isTitlesActive);
  isTitlesActiveRef.current = isTitlesActive;
  const isAutoplayRef = useRef(isAutoplay);
  isAutoplayRef.current = isAutoplay;
  const storeTitleConfigRef = useRef(storeTitleConfig);
  storeTitleConfigRef.current = storeTitleConfig;

  // Sync client-side AudioBufferSourceNode dual-band transient detector with transport
  useEffect(() => {
    transientPunchEngine.syncTransport(
      Boolean(isAutoplay && kineticOcclusion.enabled),
      slideTimeSecRef.current
    );
  }, [isAutoplay, kineticOcclusion.enabled, kineticOcclusion.audioPunchMode]);

  useEffect(() => {
    return () => {
      transientPunchEngine.stopBufferSourceNode();
    };
  }, []);
  const activeShotDurationSec = getShotDurationSec(frame, 12.0);
  const activeShotFps = getShotTargetFps(frame, 24);
  const activeTotalFrames = getShotFrameCount(activeShotDurationSec, activeShotFps);
  const activeFrameNum = Math.min(
    activeTotalFrames,
    Math.max(1, Math.floor(Math.min(slideTimeSec, activeShotDurationSec) * activeShotFps) + 1)
  );
  const progressPercent = activeShotDurationSec > 0
    ? Math.min(100, Math.max(0, (slideTimeSec / activeShotDurationSec) * 100))
    : 0;

  // Master total sequence runtime calculation across all timeline shots
  const totalMasterRuntimeSec = useMemo(() => {
    return frames.reduce((acc, f) => acc + getShotDurationSec(f, 12.0), 0);
  }, [frames]);

  const masterTimecode = useMemo(() => {
    return framesToTimecode(Math.floor(totalMasterRuntimeSec * activeShotFps), activeShotFps);
  }, [totalMasterRuntimeSec, activeShotFps]);

  const totalRuntimeTimecode = useMemo(() => {
    return formatRuntimeTimecode(totalMasterRuntimeSec, activeShotFps);
  }, [totalMasterRuntimeSec, activeShotFps]);

  const handleChangeCurrentDuration = async (newDurationSec: number) => {
    if (!frame) return;
    const clamped = clampShotDuration(newDurationSec);
    const updated: AnthologyFrame = {
      ...frame,
      slideHoldSec: clamped,
      durationSec: clamped
    };
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
    // Write directly to active shot in IndexedDB
    try {
      await studioDraftDb.updateSlideHoldSec(currentIndex, clamped);
    } catch (err) {
      console.warn('[TactileStage] Failed to write duration to IndexedDB:', err);
    }
  };

  const handleRippleAll = async () => {
    if (!frames.length) return;
    const currentDur = activeShotDurationSec;
    if (onApplyDurationToAll) {
      onApplyDurationToAll(currentDur);
    }
    try {
      await studioDraftDb.rippleAllSlideDurations(currentDur);
    } catch (err) {
      console.warn('[TactileStage] Failed to persist ripple to IndexedDB:', err);
    }
  };

  const handleMatchBeats = () => {
    if (onMatchAudioBeats) {
      onMatchAudioBeats();
    }
  };

  const handleChangeCurrentFps = (newFps: number) => {
    if (!frame) return;
    const updated: AnthologyFrame = {
      ...frame,
      targetFps: newFps === 60 ? 60 : 24
    };
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
  };

  const handleUpdateCurrentFrame = (updated: AnthologyFrame) => {
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
  };

  const handleApplyGradeToAll = (lut: LutPreset, adj: FrameAdjustments) => {
    if (!frames.length) return;
    const updatedFrames = frames.map(f => ({
      ...f,
      lutFilter: lut,
      adjustments: { ...f.adjustments, ...adj }
    }));
    if (onReorderFrames) {
      onReorderFrames(updatedFrames);
    } else if (onUpdateFrameAtIndex) {
      updatedFrames.forEach((uf, idx) => onUpdateFrameAtIndex(idx, uf));
    }
  };

  useTitleContainerRepaint({
    containerRef: stageTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: isTitlesActive,
    label: 'TactileStage',
    activeKey: currentIndex
  });

  const activeShotKey = getShotMediaKey(frame, currentIndex);
  const vaultEntry = shotMediaMap?.[activeShotKey] ?? null;

  // Resolve strict per-shot media streams without leaking or flashing across shot transitions
  useEffect(() => {
    let isCancelled = false;

    const initialPoster = thumbnailMemoryCache.get(String(frame?.id)) || frame?.thumbnailUrl || null;
    setCachedPosterUrl(initialPoster);

    const resolvedDirectUrl = vaultEntry?.url || (frame?.imageUrl ? frame.imageUrl : null);

    if (resolvedDirectUrl) {
      const fastUrl = videoCacheService.getFastUrlSync(resolvedDirectUrl) || resolvedDirectUrl;
      if (!isCancelled) {
        setSourceUrl(fastUrl);
        setProxyUrl(fastUrl);
      }
    } else if (frame) {
      setSourceUrl(null);
      setProxyUrl(null);
      const resolveFromLegacySlot = async () => {
        try {
          const slot = await studioDraftDb.getTimelineSlot(currentIndex);
          if (slot?.mediaId) {
            const vaultItem = await studioDraftDb.getVaultMediaItem(slot.mediaId);
            if (vaultItem && !isCancelled && frame.imageUrl) {
              if (vaultItem.thumbnailUrl) {
                setCachedPosterUrl(vaultItem.thumbnailUrl);
                thumbnailMemoryCache.set(slot.mediaId, vaultItem.thumbnailUrl);
              }
              const rawUrl = studioDraftDb.getActiveMediaUrl(vaultItem.id, vaultItem.blob);
              setSourceUrl(rawUrl);

              const proxy = await studioDraftDb.getMediaProxy(slot.mediaId);
              if (proxy && !isCancelled) {
                const pUrl = studioDraftDb.getActiveMediaUrl(`${vaultItem.id}_proxy`, proxy.blob);
                setProxyUrl(pUrl);
              } else if (!isCancelled) {
                setProxyUrl(rawUrl);
              }
            }
          }
        } catch (err) {
          console.warn('Error resolving media streams from vault:', err);
        }
      };
      void resolveFromLegacySlot();
    } else {
      setSourceUrl(null);
      setProxyUrl(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [currentIndex, frame?.imageUrl, frame?.thumbnailUrl, frame?.id, vaultEntry?.url]);

  // Lookahead prefetch active + neighbor shots (`[0, +1, +2, +3, -1]`) for VLC-grade instant seeking & transitions
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    videoCacheService.prefetchShotWindow(frames, currentIndex, shotMediaMap);
  }, [currentIndex, frames, shotMediaMap]);

  // 3-Slot Pre-Warmed Video Pool descriptors (`prevShot`, `activeShot`, `nextShot`)
  const poolSlots = useMemo(() => {
    const descriptors = computeThreeSlotIndices(currentIndex, frames.length);
    return descriptors.map((desc) => {
      const f = frames[desc.shotIdx];
      const shotKey = getShotMediaKey(f, desc.shotIdx);
      const entry = resolveShotMediaEntry(shotMediaMap, f, undefined, desc.shotIdx);
      const rawUrl = entry?.url || (f?.imageUrl ? f.imageUrl : '') || (desc.role === 'active' ? (sourceUrl || '') : '');
      const cleanRawUrl = rawUrl && !isSvgPlaceholderUrl(rawUrl) ? rawUrl : '';
      const url = cleanRawUrl ? (videoCacheService.getFastUrlSync(cleanRawUrl) || cleanRawUrl) : '';
      const isVid = entry
        ? entry.type === 'video'
        : isVideoSourceUrl(cleanRawUrl || url, { isVideo: f?.isVideo, mimeType: (f as any)?.mimeType });
      const poster =
        getCachedThumbnailUrl([f?.id, `shot_${desc.shotIdx}`, desc.shotIdx, cleanRawUrl, url]) ||
        (f?.thumbnailUrl && !isSvgPlaceholderUrl(f.thumbnailUrl) && !isVideoSourceUrl(f.thumbnailUrl) ? f.thumbnailUrl : '') ||
        (desc.role === 'active' && cachedPosterUrl ? cachedPosterUrl : '');
      const slotLut = getLutFilterCSS(f?.lutFilter, f?.adjustments);
      let slotFilter = zoomTransforms.bgDepthBlur !== 'none'
        ? `${slotLut} ${zoomTransforms.bgDepthBlur}`
        : slotLut;
      if (barrelDistortion > 0) {
        slotFilter = `${slotFilter} url(#stage-barrel-distortion-filter)`.trim();
      }
      return {
        shotIdx: desc.shotIdx,
        role: desc.role,
        shotKey,
        frame: f,
        url,
        isVideo: isVid,
        poster,
        filter: slotFilter
      };
    });
  }, [currentIndex, frames, shotMediaMap, sourceUrl, cachedPosterUrl, zoomTransforms.bgDepthBlur, barrelDistortion]);

  // Keep videoRef synced to active slot and release unmounted decoder handles
  const registerSlotVideoRef = useCallback(
    (shotIdx: number, role: 'prev' | 'active' | 'next', el: HTMLVideoElement | null) => {
      if (el) {
        slotVideoRefs.current.set(shotIdx, el);
        if (role === 'active') {
          videoRef.current = el;
        }
      } else {
        const existing = slotVideoRefs.current.get(shotIdx);
        if (existing) {
          cleanupVideoElement(existing);
          slotVideoRefs.current.delete(shotIdx);
        }
        if (role === 'active') {
          videoRef.current = null;
        }
      }
    },
    []
  );

  // Video decoder teardown on unmount (4GB Guard)
  useEffect(() => {
    return () => {
      for (const vid of slotVideoRefs.current.values()) {
        cleanupVideoElement(vid);
      }
      slotVideoRefs.current.clear();
      seekGuardRef.current.reset();
    };
  }, []);

  // Determine active media URL strictly for activeShot.id (using promoted RAM blob when available)
  const rawActiveMediaUrl = (isScrubbing && proxyUrl)
    ? proxyUrl
    : (vaultEntry?.url || sourceUrl || (frame?.imageUrl ? frame.imageUrl : null));
  const activeMediaUrl = rawActiveMediaUrl
    ? (videoCacheService.getFastUrlSync(rawActiveMediaUrl) || rawActiveMediaUrl)
    : null;

  const isVideoMedia = vaultEntry
    ? vaultEntry.type === 'video'
    : Boolean(
        frame?.isVideo ||
        (frame as any)?.mimeType?.startsWith('video/') ||
        (activeMediaUrl && (
          /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(activeMediaUrl) ||
          activeMediaUrl.startsWith('data:video')
        ))
      );

  const lutFilterStyle = getLutFilterCSS(frame?.lutFilter, frame?.adjustments);
  let baseMediaFilter = zoomTransforms.bgDepthBlur !== 'none'
    ? `${lutFilterStyle} ${zoomTransforms.bgDepthBlur}`
    : lutFilterStyle;

  if (barrelDistortion > 0) {
    baseMediaFilter = `${baseMediaFilter} url(#stage-barrel-distortion-filter)`.trim();
  }
  const combinedMediaFilter = baseMediaFilter;

  const clipSpeed =
    typeof frame?.playbackSpeed === 'number' && Number.isFinite(frame.playbackSpeed) && frame.playbackSpeed > 0
      ? Math.max(0.25, Math.min(4.0, frame.playbackSpeed))
      : 1.0;
  const clipInSec =
    typeof frame?.inPointMs === 'number' && Number.isFinite(frame.inPointMs) && frame.inPointMs >= 0
      ? frame.inPointMs / 1000
      : 0;
  const clipOutSec =
    typeof frame?.outPointMs === 'number' &&
    Number.isFinite(frame.outPointMs) &&
    frame.outPointMs > clipInSec * 1000
      ? frame.outPointMs / 1000
      : null;
  const hasExplicitTrimOrSpeed =
    clipInSec > 0.001 || clipOutSec !== null || Math.abs(clipSpeed - 1.0) > 0.01;

  const effectiveShotDurationSec =
    !hasExplicitTrimOrSpeed && isVideoMedia && nativeVideoDuration > 0.25
      ? nativeVideoDuration
      : activeShotDurationSec;

  const localToSourceSec = useCallback(
    (localSec: number) => {
      const clampedLocal = Math.max(0, Math.min(effectiveShotDurationSec, localSec));
      return Math.max(0, clipInSec + clampedLocal * clipSpeed);
    },
    [clipInSec, clipSpeed, effectiveShotDurationSec]
  );

  const sourceToLocalSec = useCallback(
    (rawVideoSec: number) => {
      return Math.max(0, Math.min(effectiveShotDurationSec, (rawVideoSec - clipInSec) / clipSpeed));
    },
    [clipInSec, clipSpeed, effectiveShotDurationSec]
  );

  // Keep playbackClock updated for non-video shots and paused state
  useEffect(() => {
    if (!isVideoMedia || !isAutoplay) {
      playbackClock.emit({
        timeSec: slideTimeSec,
        durationSec: effectiveShotDurationSec,
        bufferedPct: 1,
        shotIndex: currentIndex,
        fps: activeShotFps
      });
    }
  }, [slideTimeSec, effectiveShotDurationSec, currentIndex, activeShotFps, isVideoMedia, isAutoplay]);

  // Pure Hardware <video> Transport Control: Seek ONCE on initial shot entry (never mid-playback)
  useLayoutEffect(() => {
    const activeVideo = slotVideoRefs.current.get(currentIndex) ?? videoRef.current;
    videoRef.current = activeVideo ?? null;

    // Pause any non-active buffered slot immediately (never seek neighbor slots while active plays)
    for (const [idx, vid] of slotVideoRefs.current.entries()) {
      if (idx !== currentIndex && !vid.paused) {
        vid.pause();
      }
    }

    if (!activeVideo || !isVideoMedia) return;

    if (Number.isFinite(activeVideo.duration) && activeVideo.duration > 0.25) {
      setNativeVideoDuration(activeVideo.duration);
    }

    applyVlcMediaGain(activeVideo, effectiveVolume, effectiveMuted);
    activeVideo.playbackRate = Math.max(0.25, Math.min(4.0, (playbackSpeed || 1.0) * clipSpeed));

    const entryKey = `${currentIndex}:${activeMediaUrl || ''}`;
    const isInitialEntry = lastShotEntrySeekKeyRef.current !== entryKey;

    if (isInitialEntry && activeVideo.readyState >= 1) {
      lastShotEntrySeekKeyRef.current = entryKey;
      const entrySourceSec = clipInSec > 0.001 ? clipInSec : (slideTimeSecRef.current > 0.05 && slideTimeSecRef.current < effectiveShotDurationSec - 0.05 ? localToSourceSec(slideTimeSecRef.current) : 0);
      if (entrySourceSec > 0.01 && Math.abs((activeVideo.currentTime || 0) - entrySourceSec) > 0.05) {
        if (!activeVideo.paused) activeVideo.pause();
        try {
          activeVideo.currentTime = entrySourceSec;
        } catch {}
      }
    }

    if (isAutoplay && !isScrubbingRef.current) {
      if (!effectiveMuted) resumeVlcAudioContext();
      if (activeVideo.paused) {
        const playPromise = activeVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            activeVideo.muted = true;
            activeVideo.play().catch(() => {});
          });
        }
      }
    } else if (!activeVideo.paused) {
      activeVideo.pause();
    }
  }, [currentIndex, isAutoplay, isVideoMedia, effectiveMuted, effectiveVolume, playbackSpeed, clipSpeed, clipInSec, activeMediaUrl, effectiveShotDurationSec, localToSourceSec]);

  // External Seek Sync: strictly ONLY runs when paused (!isAutoplay) for frame-step / scrub
  useEffect(() => {
    const activeVideo = videoRef.current;
    if (!activeVideo || !isVideoMedia) {
      lastHandledSeekVersionRef.current = seekVersion;
      return;
    }

    const versionChanged = seekVersion !== lastHandledSeekVersionRef.current;
    lastHandledSeekVersionRef.current = seekVersion;

    if (versionChanged && !isAutoplay && !isDraggingScrubberRef.current) {
      const targetLocalSec = Math.max(0, Math.min(effectiveShotDurationSec, slideTimeSecRef.current));
      const targetSourceSec = localToSourceSec(targetLocalSec);
      accumulatedShotClockRef.current = targetLocalSec;
      if (Math.abs((activeVideo.currentTime || 0) - targetSourceSec) > 0.04) {
        seekGuardRef.current.requestSeek(activeVideo, targetSourceSec, {
          exact: true,
          pauseFirst: true
        });
      }
      lastVideoClockTimeRef.current = targetLocalSec;
      playbackClock.emit({
        timeSec: targetLocalSec,
        durationSec: effectiveShotDurationSec,
        shotIndex: currentIndex,
        fps: activeShotFps
      });
    }
  }, [seekVersion, currentIndex, isVideoMedia, isAutoplay, effectiveShotDurationSec, activeShotFps, localToSourceSec]);

  // Passive Hardware Video Clock -> 60fps Direct-DOM PlaybackClock Bus (ZERO currentTime/fastSeek writes in rAF!)
  useEffect(() => {
    if (!isAutoplay || !isVideoMedia) return;
    let rafId: number | null = null;

    const syncTick = () => {
      const video = videoRef.current;
      if (video && !isScrubbingRef.current && !video.seeking && !video.paused && video.readyState >= 2) {
        const curRaw = video.currentTime || 0;
        const curLocal = sourceToLocalSec(curRaw);
        const clipDur = effectiveShotDurationSec;

        let bufferedPct = 1;
        if (video.buffered && video.buffered.length > 0 && Number.isFinite(video.duration) && video.duration > 0) {
          bufferedPct = Math.min(1, video.buffered.end(video.buffered.length - 1) / video.duration);
        }

        // Direct hardware time mapped to trimmed clip timeline is ground truth (read-only)
        accumulatedShotClockRef.current = curLocal;
        lastVideoClockTimeRef.current = curLocal;

        playbackClock.emit({
          timeSec: curLocal,
          durationSec: clipDur,
          bufferedPct,
          shotIndex: currentIndexRef.current,
          fps: activeShotFps
        });

        const endThreshold = Math.max(0.15, clipDur - 0.06);
        if (curLocal >= endThreshold) {
          if (loopMode === 'sequence' && frames.length > 1) {
            onAdvanceFromVideoClock?.(currentIndexRef.current);
            return;
          }
          if (loopMode === 'once') {
            video.pause();
            onSyncVideoTime?.(currentIndexRef.current, curLocal);
            if (isAutoplayRef.current && onTogglePlay) {
              onTogglePlay();
            }
            return;
          }
        }
      }
      rafId = requestAnimationFrame(syncTick);
    };

    rafId = requestAnimationFrame(syncTick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      // Sync final discrete timecode to React only when pausing/stopping hardware clock
      if (!isAutoplayRef.current && videoRef.current) {
        onSyncVideoTime?.(currentIndexRef.current, sourceToLocalSec(videoRef.current.currentTime || clipInSec));
      }
    };
  }, [
    isAutoplay,
    isVideoMedia,
    currentIndex,
    frames.length,
    effectiveShotDurationSec,
    activeShotFps,
    loopMode,
    clipInSec,
    sourceToLocalSec,
    onAdvanceFromVideoClock,
    onSyncVideoTime,
    onTogglePlay
  ]);

  // Sync cached poster element for instant fallback
  useEffect(() => {
    if (cachedPosterUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setStillPlateRevision((r) => r + 1);
      img.src = cachedPosterUrl;
      cachedPosterImgRef.current = img;
    } else {
      cachedPosterImgRef.current = null;
    }
  }, [cachedPosterUrl]);

  // Sync still image plate
  useEffect(() => {
    if (activeMediaUrl && !isVideoMedia) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeMediaUrl;
      img.onload = () => {
        imageElementRef.current = img;
        setStillPlateRevision((r) => r + 1);
      };
    } else {
      imageElementRef.current = null;
    }
  }, [activeMediaUrl, isVideoMedia]);

  // Canvas Renderer: STRICTLY for non-video still plates & procedural cinema backdrops
  // Renders on-demand when paused on a static still plate so GPU decode budget stays free for video!
  useEffect(() => {
    if (activeMediaUrl && isVideoMedia) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let animId: number | null = null;
    const isAnimatedBackdrop = !activeMediaUrl && !cachedPosterUrl;

    const drawCover = (ctx: CanvasRenderingContext2D, source: CanvasImageSource, targetW: number, targetH: number) => {
      let sw = 1920;
      let sh = 1080;
      if (source instanceof HTMLImageElement) {
        sw = source.naturalWidth || 1920;
        sh = source.naturalHeight || 1080;
      } else if (source instanceof ImageBitmap) {
        sw = source.width;
        sh = source.height;
      }
      if (sw <= 0 || sh <= 0) return;

      const mediaAspect = sw / sh;
      const targetAspect = targetW / targetH;
      let dw = targetW;
      let dh = targetH;
      let dx = 0;
      let dy = 0;

      if (mediaAspect > targetAspect) {
        dw = targetH * mediaAspect;
        dx = (targetW - dw) / 2;
      } else {
        dh = targetW / mediaAspect;
        dy = (targetH - dh) / 2;
      }

      ctx.drawImage(source, dx, dy, dw, dh);
    };

    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: true });
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = Math.max(320, Math.round((rect.width || 1280) * dpr));
          const targetH = Math.max(180, Math.round((rect.height || 536) * dpr));
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const curFrame = frameRef.current;
          const filmFilter = buildFilmStockCssFilter(curFrame?.lutFilter || 'kodak_vision3', curFrame?.adjustments);

          let activeSource: CanvasImageSource | null = null;
          if (imageElementRef.current && imageElementRef.current.complete && imageElementRef.current.naturalWidth > 0) {
            activeSource = imageElementRef.current;
          } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
            activeSource = cachedPosterImgRef.current;
          }

          ctx.clearRect(0, 0, targetW, targetH);
          const activeLight = curFrame?.lightId ? getLightingPresetById(curFrame.lightId) : null;
          const combinedCanvasFilter = [
            filmFilter && filmFilter !== 'none' ? filmFilter : '',
            activeLight?.filter || ''
          ].filter(Boolean).join(' ');

          if (activeSource) {
            if (combinedCanvasFilter) {
              ctx.filter = combinedCanvasFilter;
            }
            drawCover(ctx, activeSource, targetW, targetH);
            ctx.filter = 'none';
          } else if (!activeMediaUrl && !cachedPosterUrl) {
            renderProceduralBackdropToCanvas(
              ctx,
              targetW,
              targetH,
              currentIndexRef.current,
              slideTimeSecRef.current
            );
          }
          ctx.filter = 'none';
          applyCinematicPostProcess(
            ctx,
            targetW,
            targetH,
            curFrame?.lutFilter || 'kodak_vision3',
            curFrame?.adjustments,
            slideTimeSecRef.current
          );
          if (activeLight && (activeSource || (!activeMediaUrl && !cachedPosterUrl))) {
            ctx.save();
            ctx.globalCompositeOperation = activeLight.blendMode;
            activeLight.renderOverlay(ctx, targetW, targetH, slideTimeSecRef.current);
            ctx.restore();
          }
        }
      }
    };

    const renderLoop = () => {
      drawFrame();
      animId = requestAnimationFrame(renderLoop);
    };

    if (isAutoplay || isAnimatedBackdrop) {
      animId = requestAnimationFrame(renderLoop);
    } else {
      drawFrame();
    }

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [activeMediaUrl, isVideoMedia, cachedPosterUrl, frame?.lutFilter, frame?.adjustments, isAutoplay, currentIndex, stillPlateRevision]);

  // Seek-Locked Scrubbing: Single-in-flight seek guard (`isSeeking` + `pendingSeekTimeRef` flushed in `onSeeked`)
  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingScrubberRef.current = true;
    wasAudioMutedBeforeScrubRef.current = audioEngine.getIsMuted();
    audioEngine.setMuted(true);
    setIsScrubbing(true);
    isScrubbingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * effectiveShotDurationSec;
    slideTimeSecRef.current = targetSec;
    accumulatedShotClockRef.current = targetSec;
    lastScrubTimeRef.current = performance.now();
    if (onScrubSlideTime) onScrubSlideTime(targetSec);
    seekGuardRef.current.requestSeek(videoRef.current, localToSourceSec(targetSec), {
      exact: false,
      pauseFirst: true
    });
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrubberRef.current) return;
    const now = performance.now();
    if (now - lastScrubTimeRef.current < 16) return;
    lastScrubTimeRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * effectiveShotDurationSec;
    slideTimeSecRef.current = targetSec;
    accumulatedShotClockRef.current = targetSec;
    if (onScrubSlideTime) onScrubSlideTime(targetSec);
    seekGuardRef.current.requestSeek(videoRef.current, localToSourceSec(targetSec), {
      exact: false,
      pauseFirst: true
    });
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingScrubberRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingScrubberRef.current = false;
      setIsScrubbing(false);
      isScrubbingRef.current = false;

      // Exact frame snap upon pointer release
      seekGuardRef.current.requestSeek(videoRef.current, localToSourceSec(slideTimeSecRef.current), {
        exact: true,
        pauseFirst: !isAutoplay
      });

      if (!wasAudioMutedBeforeScrubRef.current) {
        audioEngine.setMuted(false);
        if (isAutoplay) {
          audioEngine.playAudio();
        }
      }
    }
  };


  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setIsIngesting(true);
    const safetyTimeout = window.setTimeout(() => {
      setIsIngesting(false);
    }, 2500);

    try {
      if (onUploadMediaForIndex) {
        await Promise.resolve(onUploadMediaForIndex(currentIndex, droppedFile));
      } else if (onUploadImage) {
        await Promise.resolve(onUploadImage(droppedFile));
      } else {
        await handleFileUpload([droppedFile], {
          shotIndex: currentIndex,
          onImmediatePreview: (item) => {
            setSourceUrl(item.objectUrl);
            setProxyUrl(item.objectUrl);
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: item.objectUrl,
                isVideo: item.isVideo
              });
            }
          },
          onMetadataReady: (item) => {
            if (item.thumbnailUrl) {
              setCachedPosterUrl(item.thumbnailUrl);
              thumbnailMemoryCache.set(String(frame?.id ?? currentIndex), item.thumbnailUrl);
              thumbnailMemoryCache.set(`shot_${currentIndex}`, item.thumbnailUrl);
            }
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: item.objectUrl,
                thumbnailUrl: item.thumbnailUrl || undefined,
                isVideo: item.isVideo
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn('[RECOVERY FALLBACK] Failed to ingest dropped media:', err);
    } finally {
      window.clearTimeout(safetyTimeout);
      setIsIngesting(false);
    }
  };

  const toggleFullscreen = () => {
    if (onToggleBorderlessFullscreen) {
      onToggleBorderlessFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setLocalFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setLocalFullscreen(false)).catch(() => {});
    }
  };

  // Dynamic Aspect Ratio Auto-Fitting:
  // - Clean, responsive framing flush to top with no blank gap
  // - Leaves dedicated clearance at bottom for bezel ribbon and control dock
  // Tight Edge-to-Edge Stage Sizing: fills 100% of available stage width & height at 100% scale,
  // or scales cleanly to 70% when toggled in the Stage Metadata Bar.
  const getStageBoxStyle = (): React.CSSProperties => {
    if (stageScale === 0.7) {
      return {
        width: '70%',
        height: '70%',
        margin: '0 auto'
      };
    }
    return {
      width: '100%',
      height: '100%'
    };
  };

  const fitModeClass =
    stageFitMode === 'contain'
      ? 'object-contain'
      : stageFitMode === 'fill'
        ? 'object-fill'
        : 'object-cover';
  const activeLightPreset = frame?.lightId ? getLightingPresetById(frame.lightId) : undefined;
  const activeSmpte = formatFullSMPTETimecode(slideTimeSec, activeShotFps);
  const proceduralSpec = getShotProceduralSpec(currentIndex);

  const handleVlcScrubStart = () => {
    isDraggingScrubberRef.current = true;
    wasPlayingBeforeScrubRef.current = Boolean(isAutoplay);
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    wasAudioMutedBeforeScrubRef.current = audioEngine.getIsMuted();
    audioEngine.setMuted(true);
    setIsScrubbing(true);
    isScrubbingRef.current = true;
  };

  const handleVlcScrubTo = (targetSec: number, exact = false) => {
    const clamped = Math.max(0, Math.min(effectiveShotDurationSec, targetSec));
    slideTimeSecRef.current = clamped;
    accumulatedShotClockRef.current = clamped;
    playbackClock.emit({
      timeSec: clamped,
      durationSec: effectiveShotDurationSec,
      shotIndex: currentIndex
    });
    if (videoRef.current && isVideoMedia) {
      seekGuardRef.current.requestSeek(videoRef.current, localToSourceSec(clamped), {
        exact,
        pauseFirst: true
      });
    }
    const now = performance.now();
    if (exact || now - lastParentSyncTsRef.current > 80) {
      lastParentSyncTsRef.current = now;
      if (onScrubSlideTime) onScrubSlideTime(clamped);
    }
  };

  const handleVlcScrubEnd = (finalTimeSec: number) => {
    isDraggingScrubberRef.current = false;
    setIsScrubbing(false);
    isScrubbingRef.current = false;
    const clamped = Math.max(0, Math.min(effectiveShotDurationSec, finalTimeSec));
    slideTimeSecRef.current = clamped;
    accumulatedShotClockRef.current = clamped;
    if (videoRef.current && isVideoMedia) {
      seekGuardRef.current.requestSeek(videoRef.current, localToSourceSec(clamped), {
        exact: true,
        pauseFirst: true
      });
      if (isAutoplay || wasPlayingBeforeScrubRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
    wasPlayingBeforeScrubRef.current = false;
    if (onScrubSlideTime) onScrubSlideTime(clamped);
    if (!wasAudioMutedBeforeScrubRef.current) {
      audioEngine.setMuted(false);
      if (isAutoplay) audioEngine.playAudio();
    }
  };

  const handleVlcStop = () => {
    if (isAutoplay && onTogglePlay) onTogglePlay();
    slideTimeSecRef.current = 0;
    accumulatedShotClockRef.current = 0;
    if (videoRef.current && isVideoMedia) {
      videoRef.current.pause();
      seekGuardRef.current.requestSeek(videoRef.current, clipInSec, { exact: true, pauseFirst: true });
    }
    playbackClock.emit({ timeSec: 0, durationSec: effectiveShotDurationSec, shotIndex: currentIndex });
    if (onScrubSlideTime) onScrubSlideTime(0);
  };

  const handleVlcSkipSeconds = (deltaSec: number) => {
    const current = videoRef.current && isVideoMedia
      ? sourceToLocalSec(videoRef.current.currentTime)
      : slideTimeSecRef.current;
    const next = Math.max(0, Math.min(effectiveShotDurationSec, current + deltaSec));
    handleVlcScrubTo(next, true);
  };

  const handleVlcVolumeChange = (vol: number) => {
    const clamped = Math.max(0, Math.min(2.0, vol));
    setStoreAudioVolume(clamped);
    if (clamped > 0.01 && effectiveMuted) {
      if (onToggleMute) onToggleMute();
      else toggleStoreAudio();
    }
    applyVlcMediaGain(videoRef.current, clamped, clamped <= 0.01);
  };

  const handleVlcToggleMute = () => {
    if (onToggleMute) onToggleMute();
    else toggleStoreAudio();
  };

  const handleVlcCycleLoop = () => {
    const order: VlcLoopMode[] = ['sequence', 'repeat-one', 'once'];
    const next = order[(order.indexOf(loopMode) + 1) % order.length];
    setLoopMode(next);
    if (onSelectPlaybackMode) {
      onSelectPlaybackMode(next === 'repeat-one' ? 'solo' : 'sequence');
    }
  };

  const handleVlcSetAb = (which: 'a' | 'b' | 'clear') => {
    if (which === 'clear') {
      setAbLoop({ a: null, b: null });
      return;
    }
    const cur = videoRef.current && isVideoMedia ? videoRef.current.currentTime : slideTimeSecRef.current;
    setAbLoop((prev) => {
      if (which === 'a') {
        return { a: cur, b: prev.b !== null && prev.b <= cur ? null : prev.b };
      }
      if (prev.a !== null && cur <= prev.a + 0.08) {
        return { a: cur, b: prev.a + 0.1 };
      }
      return { a: prev.a ?? 0, b: cur };
    });
  };

  const handleCaptureSnapshot = () => {
    try {
      const snapCanvas = document.createElement('canvas');
      const activeVideo = videoRef.current;
      if (activeVideo && isVideoMedia && activeVideo.videoWidth > 0) {
        snapCanvas.width = activeVideo.videoWidth;
        snapCanvas.height = activeVideo.videoHeight;
        const ctx = snapCanvas.getContext('2d');
        if (ctx) {
          ctx.filter = combinedMediaFilter;
          ctx.drawImage(activeVideo, 0, 0, snapCanvas.width, snapCanvas.height);
        }
      } else if (canvasRef.current) {
        snapCanvas.width = canvasRef.current.width || 1280;
        snapCanvas.height = canvasRef.current.height || 720;
        const ctx = snapCanvas.getContext('2d');
        ctx?.drawImage(canvasRef.current, 0, 0);
      }
      const dataUrl = snapCanvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `shot_${String(currentIndex + 1).padStart(3, '0')}_snapshot.png`;
      a.click();
    } catch (err) {
      console.warn('Snapshot capture unavailable (CORS-restricted source):', err);
    }
  };

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full flex flex-col items-center justify-between pt-0 mt-0 pb-0 bg-[#000000] overflow-hidden select-none px-0"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,image/*,.mp4,.mov,.webm,.m4v,.avi,.mkv"
        className="hidden"
        onChange={async (e) => {
          const pickedFile = e.target.files?.[0];
          if (!pickedFile) return;
          try {
            if (onUploadMediaForIndex) {
              await Promise.resolve(onUploadMediaForIndex(currentIndex, pickedFile));
            } else if (onUploadImage) {
              await Promise.resolve(onUploadImage(pickedFile));
            } else {
              await handleFileUpload([pickedFile], {
                shotIndex: currentIndex,
                onImmediatePreview: (item) => {
                  setSourceUrl(item.objectUrl);
                  setProxyUrl(item.objectUrl);
                  if (onUpdateFrame) {
                    onUpdateFrame({
                      ...frame,
                      imageUrl: item.objectUrl,
                      isVideo: item.isVideo
                    });
                  }
                },
                onMetadataReady: (item) => {
                  if (item.thumbnailUrl) {
                    setCachedPosterUrl(item.thumbnailUrl);
                    thumbnailMemoryCache.set(String(frame?.id ?? currentIndex), item.thumbnailUrl);
                    thumbnailMemoryCache.set(`shot_${currentIndex}`, item.thumbnailUrl);
                  }
                  if (onUpdateFrame) {
                    onUpdateFrame({
                      ...frame,
                      imageUrl: item.objectUrl,
                      thumbnailUrl: item.thumbnailUrl || undefined,
                      isVideo: item.isVideo
                    });
                  }
                }
              });
            }
          } catch (err) {
            console.warn('[RECOVERY FALLBACK] File upload input error:', err);
          } finally {
            e.target.value = '';
          }
        }}
      />

      {/* 1. SLEEK 28px EXTERNAL STAGE METADATA & FX BAR (Hidden during Borderless Fullscreen idle) */}
      {!hideFullscreenStageBars && (
        <StageMetadataFxBar
          className="animate-hud-fade-in"
          sceneCode={frame?.epNumber ? frame.epNumber.replace(/^#/, '').slice(0, 2) : '01'}
          shotIndex={currentIndex}
          frameNum={activeFrameNum}
          totalFrames={activeTotalFrames}
          smpte={activeSmpte}
          fps={activeShotFps}
          streamLabel={isScrubbing ? '540p PROXY' : 'RAW 4K'}
          aspectRatio={aspectRatio || '2.39:1'}
          playbackMode={playbackMode}
          showHud={showHud}
          isTitlesActive={isTitlesActive}
          onToggleTitles={onToggleTitles}
          lightName={activeLightPreset?.name}
          onUploadMedia={() => fileInputRef.current?.click()}
          onOpenInspector={onOpenInspector}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* 2. PURE ZERO-OVERLAY CINEMA VIDEO BOX (TIGHT EDGE-TO-EDGE FIT) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden p-0">
        <div
          id="stage-media-container"
          ref={stageMediaContainerRef}
          onWheel={handleStageWheel}
          onDoubleClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, input, select, a, [data-interactive="true"]')) return;
            toggleFullscreen();
          }}
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={handleStagePointerUp}
          onPointerCancel={handleStagePointerCancel}
          style={getStageBoxStyle()}
          className="relative bg-[#000000] border-y border-white/10 rounded-none overflow-hidden flex items-center justify-center select-none shrink-0 cursor-crosshair transition-[width,height] duration-200 ease-out"
        >
        {/* DYNAMIC CANVAS SVG BARREL DISTORTION FILTER */}
        <svg
          id="stage-svg-filters"
          aria-hidden="true"
          className="absolute w-0 h-0 pointer-events-none opacity-0 overflow-hidden"
          style={{ position: 'absolute', width: 0, height: 0, top: -9999, left: -9999 }}
        >
          <defs>
            <filter
              id="stage-barrel-distortion-filter"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              {distortionMapUrl && (
                <feImage
                  href={distortionMapUrl}
                  result="displacementMap"
                  preserveAspectRatio="none"
                />
              )}
              <feDisplacementMap
                in="SourceGraphic"
                in2="displacementMap"
                scale={barrelDistortion * 75}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* DIGITAL ZOOM TRANSFORM LAYER (60fps Direct-DOM translate3d + scale) */}
        <div
          id="stage-media-viewport"
          ref={stageViewportRef}
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
          style={{
            transformOrigin: '50% 50%',
            willChange: 'transform'
          }}
        >
          {/* 3-SLOT PRE-WARMED HARDWARE <video> POOL (active & next use preload="auto", prev stays warm for instant reverse switch) */}
          {poolSlots
            .map((slot) => {
              if (!slot.url || !slot.isVideo) return null;
              const isSlotActive = slot.role === 'active';
              const shouldPreloadAuto = slot.role === 'active' || slot.role === 'next';
              const shouldNativeLoop = loopMode === 'repeat-one' && abLoop.a === null && abLoop.b === null;
              return (
                <video
                  key={`stage-pool-video-${slot.shotIdx}-${slot.shotKey}-${slot.url}`}
                  id={isSlotActive ? 'stage-fallback-video' : `stage-pool-${slot.role}-${slot.shotIdx}`}
                  data-pool-role={slot.role}
                  ref={(el) => registerSlotVideoRef(slot.shotIdx, slot.role, el)}
                  src={slot.url}
                  crossOrigin="anonymous"
                  poster={slot.poster || undefined}
                  loop={shouldNativeLoop}
                  muted={isSlotActive ? effectiveMuted : true}
                  playsInline
                  preload={shouldPreloadAuto ? 'auto' : 'metadata'}
                  onSeeked={(e) => {
                    if (isSlotActive) {
                      seekGuardRef.current.handleSeeked(e.currentTarget);
                      void videoCacheService.captureKeyframeBitmap(e.currentTarget, slot.url, e.currentTarget.currentTime);
                    }
                  }}
                  onPause={(e) => {
                    if (isSlotActive) {
                      void videoCacheService.captureKeyframeBitmap(e.currentTarget, slot.url, e.currentTarget.currentTime);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    if (isSlotActive) {
                      const vid = e.currentTarget;
                      if (Number.isFinite(vid.duration) && vid.duration > 0.25) {
                        setNativeVideoDuration(vid.duration);
                        playbackClock.emit({
                          durationSec: vid.duration,
                          shotIndex: slot.shotIdx
                        });
                      }
                      const entryKey = `${slot.shotIdx}:${slot.url}`;
                      if (lastShotEntrySeekKeyRef.current !== entryKey) {
                        lastShotEntrySeekKeyRef.current = entryKey;
                        if (clipInSec > 0.01 && Math.abs(vid.currentTime - clipInSec) > 0.05) {
                          try {
                            vid.currentTime = clipInSec;
                          } catch {}
                        }
                      }
                    }
                  }}
                  onLoadedData={(e) => {
                    if (isSlotActive && isAutoplay && !isScrubbingRef.current && e.currentTarget.paused) {
                      applyVlcMediaGain(e.currentTarget, effectiveVolume, effectiveMuted);
                      e.currentTarget.playbackRate = Math.max(0.25, Math.min(4.0, (playbackSpeed || 1.0) * clipSpeed));
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={(e) => {
                    if (!isSlotActive) return;
                    const vid = e.currentTarget;
                    const curLocal = sourceToLocalSec(vid.currentTime || 0);
                    // Handle A-B loop or trimmed repeat-one cleanly on pause->seek->play outside rAF
                    if (!vid.paused) {
                      if (
                        abLoop.a !== null &&
                        abLoop.b !== null &&
                        abLoop.b > abLoop.a + 0.08 &&
                        curLocal >= abLoop.b
                      ) {
                        vid.pause();
                        try { vid.currentTime = localToSourceSec(abLoop.a); } catch {}
                        vid.play().catch(() => {});
                      } else if (
                        loopMode === 'repeat-one' &&
                        hasExplicitTrimOrSpeed &&
                        curLocal >= Math.max(0.15, effectiveShotDurationSec - 0.05)
                      ) {
                        vid.pause();
                        try { vid.currentTime = clipInSec; } catch {}
                        vid.play().catch(() => {});
                      }
                    }
                  }}
                  onEnded={(e) => {
                    if (!isSlotActive) return;
                    if (loopMode === 'sequence' && frames.length > 1) {
                      onAdvanceFromVideoClock?.(currentIndexRef.current);
                    } else if (loopMode === 'repeat-one') {
                      e.currentTarget.currentTime = localToSourceSec(abLoop.a ?? 0);
                      e.currentTarget.play().catch(() => {});
                    } else if (loopMode === 'once' && isAutoplayRef.current && onTogglePlay) {
                      onTogglePlay();
                    }
                  }}
                  className={`absolute inset-0 w-full h-full ${fitModeClass} will-change-transform`}
                  style={{
                    filter: slot.filter,
                    opacity: isSlotActive ? 1 : 0,
                    zIndex: isSlotActive ? 2 : 0,
                    pointerEvents: isSlotActive ? 'auto' : 'none',
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                />
              );
            })}

          {/* STILL IMAGE / CACHED POSTER INSTANT LAYER */}
          {activeMediaUrl && !isVideoMedia && (
            <img
              id="stage-fallback-img"
              src={activeMediaUrl}
              crossOrigin="anonymous"
              alt="Active Shot Plate"
              className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-[1]`}
              style={{ filter: combinedMediaFilter }}
            />
          )}
          {!activeMediaUrl && cachedPosterUrl && (
            <img
              id="stage-fallback-poster"
              src={cachedPosterUrl}
              crossOrigin="anonymous"
              alt="Cached Shot Poster"
              className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-[1]`}
              style={{ filter: combinedMediaFilter }}
            />
          )}

          {/* PURE PROCEDURAL CINEMA BACKDROP LAYER (Active whenever no local video/photo has been dropped) */}
          {!activeMediaUrl && !cachedPosterUrl && (
            <div
              data-testid="procedural-stage-backdrop"
              data-palette-id={proceduralSpec.palette.id}
              data-optical-fx={proceduralSpec.opticalFx.id}
              className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transition-all duration-500"
              style={{
                background: proceduralSpec.palette.cssBackdrop,
                filter: combinedMediaFilter
              }}
            >
              {/* Anamorphic Light Leak Accent */}
              <div
                className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-500"
                style={{ background: proceduralSpec.palette.lightLeakCss }}
              />
              {/* Fine Film-Grain Texture */}
              <div className="procedural-film-grain absolute inset-0 pointer-events-none" />
              {/* Per-Shot Optical FX Layer ((shotIndex * 3) % 10) */}
              {proceduralSpec.opticalFx.hasFlareStreak && (
                <div
                  className="absolute top-1/2 inset-x-0 h-[2px] -translate-y-1/2 pointer-events-none opacity-65"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${proceduralSpec.palette.accentHex} 50%, transparent 100%)`,
                    boxShadow: `0 0 28px ${proceduralSpec.palette.accentHex}`
                  }}
                />
              )}
              {proceduralSpec.opticalFx.hasCoronaRing && (
                <div
                  className="absolute left-1/2 top-1/2 w-[48%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none opacity-45"
                  style={{
                    border: `1.5px solid ${proceduralSpec.palette.accentHex}`,
                    boxShadow: `0 0 40px ${proceduralSpec.palette.leakHex}, inset 0 0 36px ${proceduralSpec.palette.leakHex}`
                  }}
                />
              )}
              {proceduralSpec.opticalFx.hasScanlines && (
                <div className="procedural-scanlines absolute inset-0 pointer-events-none opacity-35" />
              )}
              {proceduralSpec.opticalFx.hasBrutalistFrame && (
                <div className="absolute inset-4 pointer-events-none opacity-55">
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={{ borderColor: proceduralSpec.palette.accentHex }} />
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={{ borderColor: proceduralSpec.palette.accentHex }} />
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2" style={{ borderColor: proceduralSpec.palette.accentHex }} />
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2" style={{ borderColor: proceduralSpec.palette.accentHex }} />
                </div>
              )}
            </div>
          )}

          {/* STILL-ONLY CANVAS LAYER (Hidden during hardware video playback so GPU decoder runs uncontested) */}
          <canvas
            id="stage-canvas"
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none ${
              activeMediaUrl && isVideoMedia ? 'opacity-0 z-0' : 'z-[1]'
            }`}
            style={{ filter: combinedMediaFilter }}
          />
        </div>

        {/* STAGE CINEMA TITLE & SUBTITLE OVERLAY LAYER (Inside Stage Canvas Overlay, Default: MID Center) */}
        {isTitlesActive && (
          frame?.dopamineConfig ? (
            <div
              data-testid="stage-dopamine-overlay"
              className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden"
            >
              <DopamineCompilationSequence
                hookText={frame.dopamineConfig.hookText || frame.title || 'PURE RHYTHM'}
                subText={frame.dopamineConfig.subText || frame.tagline || ''}
                glitchIntensity={frame.dopamineConfig.glitchIntensity ?? 80}
                strobeRate={frame.dopamineConfig.strobeRate ?? 60}
                motionSpeed={frame.dopamineConfig.motionSpeed ?? 1.5}
                audioBeatSync={frame.dopamineConfig.audioBeatSync ?? true}
                currentTime={slideTimeSec}
                isPlaying={isAutoplay}
                accentColor={frame.dopamineConfig.accentColor || '#FF2B2B'}
                titleAlign={titleAlign}
                shotIndex={currentIndex}
                shotType={frame?.shotType}
              />
            </div>
          ) : (
            <StageTextOverlay
              shotIndex={currentIndex}
              banglaTitle={frame?.bengaliTitle}
              englishTitle={frame?.title}
              subtitle={frame?.tagline}
              directorNotes={frame?.directorNotes}
              shotType={frame?.shotType}
              titleAlign={titleAlign}
              cameraInfo={
                frame?.cameraSpec
                  ? `${frame.cameraSpec.focalLength || '35mm'} • ${frame.cameraSpec.aperture || 'f/1.4'}`
                  : undefined
              }
              isVisible={isTitlesActive}
              componentsVisibility={componentsVisibility}
              className="z-20 pointer-events-none select-none"
            />
          )
        )}

        {/* 16:9 DIGITAL ZOOM SELECTION MARQUEE */}
        {selectionBox && selectionBox.isSelecting && (
          <div
            className="absolute pointer-events-none z-40 border border-dashed border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(245,166,35,0.35)]"
            style={{
              left: selectionBox.left,
              top: selectionBox.top,
              width: selectionBox.width,
              height: selectionBox.height
            }}
          >
            {/* Corner Reticles */}
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-300" />
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-300" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-300" />

            {/* Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-4 h-4">
                <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-amber-400/60" />
                <span className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-amber-400/60" />
              </div>
            </div>

            {/* Floating 16:9 Magnification Badge */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 bg-black/90 border border-amber-400/60 rounded text-[9px] font-mono text-amber-300 shadow font-bold flex items-center gap-1">
              <span>16:9 ZOOM</span>
              <span className="text-white/60">•</span>
              <span className="tabular-nums">{selectionBox.scale.toFixed(1)}x</span>
            </div>
          </div>
        )}

        {/* Click Play/Pause Center Beacon */}
        {clickBeacon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="p-4 rounded-full bg-black/75 border border-amber-400/50 text-amber-300 shadow-2xl animate-hud-fade-in">
              {clickBeacon === 'play' ? (
                <Play className="w-8 h-8 fill-current" />
              ) : (
                <Pause className="w-8 h-8 fill-current" />
              )}
            </div>
          </div>
        )}

        {/* Ingesting Spinner Overlay */}
        {isIngesting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-30">
            <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono-tech text-[#ffe066] tracking-wider text-center px-4">
              INGESTING RAW 4K ASSET &amp; GENERATING 540P PROXY...
            </span>
          </div>
        )}
        </div>
      </div>

      {/* 3. VLC-GRADE STAGE TRANSPORT BAR (Scrubber, A-B Loop, Speed, 200% Preamp, Fit, Playlist) */}
      {!hideFullscreenStageBars && (
        <VlcStageBar
          frames={frames}
          currentIndex={currentIndex}
          shotMediaMap={shotMediaMap}
          durationSec={effectiveShotDurationSec}
          fps={activeShotFps}
          isPlaying={isAutoplay}
          playbackSpeed={playbackSpeed}
          isMuted={effectiveMuted}
          volume={effectiveVolume}
          loopMode={loopMode}
          abLoop={abLoop}
          fitMode={stageFitMode}
          aspectRatio={aspectRatio || '16:9'}
          isTitlesActive={isTitlesActive}
          isFullscreen={effectiveFullscreen}
          onTogglePlay={() => onTogglePlay?.()}
          onStop={handleVlcStop}
          onPrevShot={() => onSelectFrame(Math.max(0, currentIndex - 1))}
          onNextShot={() => onSelectFrame(Math.min(frames.length - 1, currentIndex + 1))}
          onSelectShot={(idx) => onSelectFrame(idx)}
          onStepFrame={(fwd) => onStepFrame?.(fwd)}
          onSkipSeconds={handleVlcSkipSeconds}
          onScrubStart={handleVlcScrubStart}
          onScrubTo={handleVlcScrubTo}
          onScrubEnd={handleVlcScrubEnd}
          onChangeSpeed={(spd) => onChangePlaybackSpeed?.(spd)}
          onToggleMute={handleVlcToggleMute}
          onChangeVolume={handleVlcVolumeChange}
          onCycleLoopMode={handleVlcCycleLoop}
          onSetAbPoint={handleVlcSetAb}
          onChangeFitMode={(mode) => {
            setStageFitMode(mode);
            if (mode !== 'fill') setStoreFitMode(mode);
          }}
          onChangeAspectRatio={(r) => setStoreAspectRatio(r as any)}
          onCaptureSnapshot={handleCaptureSnapshot}
          onToggleTitles={onToggleTitles}
          onUploadMedia={() => fileInputRef.current?.click()}
          onOpenCinemaPlayer={onOpenCinemaPlayer}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* 4. SINGLE COMPACT 20px STEALTH GREY TECHNICAL TELEMETRY BAR */}
      {!hideFullscreenStageBars && (
        <StageCaptionStrip
          shotIndex={currentIndex}
          sceneCode={frame?.epNumber ? frame.epNumber.replace(/^#/, '').slice(0, 2) : '00'}
          aspectRatio={aspectRatio || '2.39:1'}
          shotType={frame?.shotType}
          cameraSpec={
            frame?.cameraSpec
              ? `${frame.cameraSpec.focalLength || '35mm'} ${frame.cameraSpec.aperture || 'f/1.4'}`
              : undefined
          }
          lutFilter={frame?.lutFilter}
          dopamineConfig={frame?.dopamineConfig}
          slideTimeSec={slideTimeSec}
          durationSec={effectiveShotDurationSec}
          isTitlesActive={isTitlesActive}
          onToggleTitles={onToggleTitles}
          componentsVisibility={componentsVisibility}
          isWebCodecsEngineActive={isWebCodecsEngineActive}
          onToggleWebCodecs={() => setIsWebCodecsEngineActive(!isWebCodecsEngineActive)}
          totalRuntimeTimecode={totalRuntimeTimecode}
          totalShotsCount={frames.length}
          onUploadMedia={() => fileInputRef.current?.click()}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {/* Floating 35mm Film Stock & Color Grading Tray */}
      <FilterGradingTray
        isOpen={isFilterTrayOpen}
        currentFrame={frame}
        currentIndex={currentIndex}
        totalShots={frames.length}
        onUpdateFrame={handleUpdateCurrentFrame}
        onApplyGradeToAll={handleApplyGradeToAll}
        onClose={() => setIsFilterTrayOpen(false)}
      />

      {/* Module 11: Review Visual Markup Canvas Overlay */}
      {activeModule === 'REVIEW' && (
        <ReviewMarkupCanvas
          shotIndex={currentIndex}
          slideTimeSec={slideTimeSec}
          onJumpToFrame={(targetShotIdx, targetTimeSec) => {
            onSelectFrame(targetShotIdx);
            if (onScrubSlideTime) onScrubSlideTime(targetTimeSec);
          }}
        />
      )}
    </div>
  );
};
