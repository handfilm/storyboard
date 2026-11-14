/**
 * @file /src/components/scrub/ScrubPanel.tsx
 * @description Brutalist CapCut-Grade Real-Time NLE Cutting, Light-Speed Scrub Accelerator & Velocity Curve Studio.
 *
 * Architecture:
 * 1. MAXIMIZED HERO SCRUB VIEWPORT (>=75% Stage Height, auto-collapses secondary header on play):
 *    - Frame-Cache Scrub Accelerator (<canvas> ImageBitmap ring-buffer blitting for 120fps-feel drag scrub).
 *    - J / K / L Shuttle Engine (-4x, -2x, -1x, Freeze, +1x, +2x, +4x) with live HUD shuttle badge.
 *    - Direct Hover-Skim + `Alt + Hover` 2x Pixel-Peep Focus Loupe over Hero Canvas.
 * 2. COMPACT PRECISION RAZOR & SHUTTLE BAR:
 *    - Tool Modes: `SELECT [V]`, `SLIP [Y]`, `ROLL [N]`.
 *    - Razor ops: `SPLIT [S]`, `TRIM IN [Q]`, `TRIM OUT [W]`, `RIPPLE DEL`, `SNAP BEAT` (transient snap).
 *    - Velocity Curve Bezier Editor (`0.25x`–`4.0x` 3-point interactive SVG curve) + `OPTICAL FLOW / FRAME-BLEND` toggle.
 * 3. COLLAPSIBLE FILMSTRIP & WAVEFORM TRACK + CARDS DRAWER:
 *    - High-density horizontal clips with gold/amber audio waveforms + transient beat diamonds + `[|` `|]` trim/roll handles.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { OpticalFlowMode, SpeedRampKeyframe, SpeedRampPreset } from '../../types/anthology';
import { PlaybackMode } from '../../types/editor';
import {
  calculateMasterSequenceDuration,
  formatDurationPillValue,
  getCumulativeShotOffsets,
  getShotFrameCount
} from '../../types/storyboard';
import {
  MIN_NLE_CLIP_DURATION_SEC,
  SCRUB_SPEED_OPTIONS,
  getClipSourceWindow,
  splitClipAtTime,
  trimClipEdge,
  trimStartToPlayheadQ,
  trimEndToPlayheadW,
  rippleDeleteClip,
  applyClipSpeed,
  slipClipWindow,
  rollClipCutPoint,
  generateClipWaveformProfile,
  findNearestTransientSec
} from '../../utils/scrubNleMath';
import {
  SPEED_RAMP_PRESETS,
  evaluateSpeedRampSourceTime,
  getSpeedRampInstantRate,
  evaluateBeatDropFx
} from '../../utils/speedReelsEngine';
import { syncVideoCurrentTimeWithFastSeek } from '../../utils/playbackClock';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { audioEngine } from '../../utils/audioEngine';
import { useStudioStore } from '../../core/store';
import { getShotMediaKey, resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { ShotMediaThumbnail } from '../ShotMediaThumbnail';
import { isVideoSourceUrl, isSvgPlaceholderUrl } from '../../services/thumbnailEngine';
import { videoCacheService } from '../../services/videoCacheService';
import {
  Play,
  Pause,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Upload,
  Edit3,
  Search,
  Magnet,
  Film,
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Gauge,
  ZoomIn,
  ZoomOut,
  PanelBottomOpen,
  PanelBottomClose,
  MoveHorizontal,
  Zap,
  Sparkles,
  Crosshair,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

export type ScrubEditToolMode = 'SELECT' | 'SLIP' | 'ROLL';
export type ShuttleRate = -4 | -2 | -1 | 0 | 1 | 2 | 4;

const DEFAULT_RAMP_KEYFRAMES: SpeedRampKeyframe[] = [
  { u: 0, rate: 1.0 },
  { u: 0.5, rate: 2.2 },
  { u: 1, rate: 1.0 }
];

export interface ScrubPanelProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  slideTimeSec: number;
  aspectRatio?: AspectRatioType;
  onSelectSlide: (index: number) => void;
  onTogglePlay: () => void;
  onStepFrame: (forward: boolean) => void;
  onScrubSlideTime: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (reordered: SlideDraft[]) => void;
  onUpdateSlide: (index: number, partial: Partial<SlideDraft>) => void;
  onCommitNleEdit?: (nextSlides: SlideDraft[], nextActiveIndex: number, nextLocalTimeSec: number) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onUploadMedia?: (index: number, file: File) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  projectTitle?: string;
  className?: string;
}

export const ScrubPanel: React.FC<ScrubPanelProps> = ({
  slides,
  activeSlideIndex,
  playbackMode,
  isPlaying,
  slideTimeSec,
  aspectRatio = '2.39:1',
  onSelectSlide,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onSelectPlaybackMode,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
  onUpdateSlide,
  onCommitNleEdit,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onUploadMedia,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  className = ''
}) => {
  const [isCardDrawerOpen, setIsCardDrawerOpen] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isRampCurveOpen, setIsRampCurveOpen] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMagneticSnap, setIsMagneticSnap] = useState(true);
  const [isHoverScrubEnabled, setIsHoverScrubEnabled] = useState(true);
  const [editToolMode, setEditToolMode] = useState<ScrubEditToolMode>('SELECT');
  const [shuttleRate, setShuttleRate] = useState<ShuttleRate>(0);
  const [dropCardIndex, setDropCardIndex] = useState<number | null>(null);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.2);
  const [nleFeedback, setNleFeedback] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [canvasHoverPct, setCanvasHoverPct] = useState<number | null>(null);
  const [ringCacheCount, setRingCacheCount] = useState(0);
  const [isCanvasCacheVisible, setIsCanvasCacheVisible] = useState(false);

  // Alt+Hover 2x Focus Loupe on Hero Canvas
  const [loupeState, setLoupeState] = useState<{
    active: boolean;
    x: number;
    y: number;
    pctX: number;
    pctY: number;
  } | null>(null);

  // Timeline Hover-Skim Tooltip (skims without moving primary playhead)
  const [hoverSkim, setHoverSkim] = useState<{
    clipIndex: number;
    localTimeSec: number;
    frameNum: number;
    title: string;
    thumbUrl: string;
    clientX: number;
  } | null>(null);

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);

  // Optimistic NLE preview state during Edge Trim / Roll / Slip drags
  const [trimPreviewSlides, setTrimPreviewSlides] = useState<SlideDraft[] | null>(null);
  const activeTrimDragRef = useRef<{
    kind: 'edge' | 'roll' | 'slip';
    clipIndex: number;
    edge?: 'left' | 'right';
    startClientX: number;
    baseSlides: SlideDraft[];
    latestSlides: SlideDraft[];
    latestTargetTimeSec?: number;
  } | null>(null);

  const activeSlides = trimPreviewSlides ?? slides;
  const safeIndex = Math.max(0, Math.min(activeSlides.length - 1, activeSlideIndex));
  const currentSlide = activeSlides[safeIndex] || activeSlides[0];
  const currentWindow = getClipSourceWindow(currentSlide);
  const activeSlideDurationSec = currentWindow.timelineDurationSec;
  const activeSlideFps = currentWindow.fps;
  const activeSlideTotalFrames = getShotFrameCount(activeSlideDurationSec, activeSlideFps);

  const shotOffsets = useMemo(() => getCumulativeShotOffsets(activeSlides), [activeSlides]);
  const totalDurationSec = useMemo(() => calculateMasterSequenceDuration(activeSlides), [activeSlides]);
  const currentFrameNum = Math.min(
    activeSlideTotalFrames,
    Math.max(1, Math.floor(Math.min(slideTimeSec, activeSlideDurationSec) * activeSlideFps) + 1)
  );
  const globalCurrentSec = (shotOffsets[safeIndex]?.startSec ?? 0) + Math.min(slideTimeSec, activeSlideDurationSec);

  // In-line Card Drawer Edit State
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // DOM Refs
  const monitorVideoRef = useRef<HTMLVideoElement | null>(null);
  const scrubCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroViewportRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCanvasScrubRef = useRef(false);
  const nleTimelineScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingMasterNeedleRef = useRef(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIdx, setUploadTargetIdx] = useState<number | null>(null);
  const lastCacheCaptureMsRef = useRef<number>(0);

  // Resolve current slide media for live Hero Monitor
  const currentVaultEntry = useMemo(
    () => resolveShotMediaEntry(shotMediaMap, currentSlide as any, undefined, safeIndex),
    [shotMediaMap, currentSlide, safeIndex]
  );
  const rawMonitorMediaUrl = currentVaultEntry?.url || currentSlide?.remoteUrl || '';
  const monitorMediaUrl = rawMonitorMediaUrl
    ? (videoCacheService.getFastUrlSync(rawMonitorMediaUrl) || rawMonitorMediaUrl)
    : '';
  const isMonitorVideo = currentVaultEntry
    ? currentVaultEntry.type === 'video'
    : isVideoSourceUrl(rawMonitorMediaUrl || monitorMediaUrl, { isVideo: Boolean(currentSlide?.isVideo) });
  const fallbackPosterUrl =
    currentSlide?.thumbnailUrl && !isSvgPlaceholderUrl(currentSlide.thumbnailUrl) && !isVideoSourceUrl(currentSlide.thumbnailUrl)
      ? currentSlide.thumbnailUrl
      : '';

  useEffect(() => {
    setIsVideoReady(false);
    setIsCanvasCacheVisible(false);
    setRingCacheCount(monitorMediaUrl ? videoCacheService.getRingBufferCount(monitorMediaUrl) : 0);
  }, [monitorMediaUrl, safeIndex]);

  useEffect(() => {
    if (activeSlides.length > 0) {
      videoCacheService.prefetchShotWindow(activeSlides as any, safeIndex, shotMediaMap);
    }
  }, [activeSlides, safeIndex, shotMediaMap]);

  const showToastFeedback = useCallback((msg: string) => {
    setNleFeedback(msg);
    window.setTimeout(() => {
      setNleFeedback((prev) => (prev === msg ? null : prev));
    }, 1800);
  }, []);

  const commitNleResult = useCallback(
    (nextSlides: SlideDraft[], nextIdx: number, nextLocalSec: number, label?: string) => {
      if (onCommitNleEdit) {
        onCommitNleEdit(nextSlides, nextIdx, nextLocalSec);
      } else {
        onReorderSlides(nextSlides);
        onSelectSlide(nextIdx);
        onScrubSlideTime(nextLocalSec);
      }
      if (label) showToastFeedback(label);
    },
    [onCommitNleEdit, onReorderSlides, onSelectSlide, onScrubSlideTime, showToastFeedback]
  );

  // Helper to blit nearest keyframe bitmap into Scrub GPU Canvas for 0ms drag feel
  const blitCachedBitmapAtTime = useCallback(
    (sourceSec: number): boolean => {
      if (!monitorMediaUrl || !scrubCanvasRef.current) return false;
      const hit = videoCacheService.getNearestKeyframeBitmap(monitorMediaUrl, sourceSec, 0.75);
      if (!hit) return false;
      const canvas = scrubCanvasRef.current;
      if (canvas.width !== hit.bitmap.width || canvas.height !== hit.bitmap.height) {
        canvas.width = hit.bitmap.width;
        canvas.height = hit.bitmap.height;
      }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return false;
      ctx.drawImage(hit.bitmap, 0, 0, canvas.width, canvas.height);
      setIsCanvasCacheVisible(true);
      return true;
    },
    [monitorMediaUrl]
  );

  // Capture decoded frames into ImageBitmap ring buffer cleanly during playback / seeked
  const captureCurrentVideoFrameToRing = useCallback(async () => {
    const vid = monitorVideoRef.current;
    if (!vid || !monitorMediaUrl || !isMonitorVideo || vid.readyState < 2) return;
    const now = performance.now();
    if (now - lastCacheCaptureMsRef.current < 120) return;
    lastCacheCaptureMsRef.current = now;
    const bmp = await videoCacheService.captureKeyframeBitmap(vid, monitorMediaUrl, vid.currentTime || 0);
    if (bmp) {
      setRingCacheCount(videoCacheService.getRingBufferCount(monitorMediaUrl));
    }
  }, [monitorMediaUrl, isMonitorVideo]);

  const lastMonitorEntryKeyRef = useRef<string>('');

  // Synchronize Hero Monitor <video>: obeys speed ramp + custom keyframes + inPointMs + playbackSpeed
  useEffect(() => {
    const vid = monitorVideoRef.current;
    if (!vid || !isMonitorVideo || !monitorMediaUrl) return;
    const rampMult = getSpeedRampInstantRate(
      currentSlide?.speedRampPreset,
      slideTimeSec,
      activeSlideDurationSec,
      currentSlide?.speedRampKeyframes
    );
    const effectiveRate = Math.max(0.25, Math.min(4.0, currentWindow.speed * (playbackSpeed || 1.0) * rampMult));
    if (Math.abs(vid.playbackRate - effectiveRate) > 0.02) {
      vid.playbackRate = effectiveRate;
    }

    const entryKey = `${currentSlide?.id || safeIndex}:${monitorMediaUrl}:${currentWindow.inSec.toFixed(3)}`;
    const isInitialEntry = lastMonitorEntryKeyRef.current !== entryKey;
    const targetSourceSec = evaluateSpeedRampSourceTime(currentSlide, slideTimeSec);

    if (
      !isPlaying ||
      shuttleRate !== 0 ||
      activeTrimDragRef.current ||
      isDraggingMasterNeedleRef.current ||
      isDraggingCanvasScrubRef.current
    ) {
      if (!vid.paused) vid.pause();
      lastMonitorEntryKeyRef.current = entryKey;
      if (isDraggingCanvasScrubRef.current || isDraggingMasterNeedleRef.current || activeTrimDragRef.current) {
        blitCachedBitmapAtTime(targetSourceSec);
      }
      if (vid.readyState >= 1) {
        syncVideoCurrentTimeWithFastSeek(vid, targetSourceSec, 0.002);
      }
    } else {
      setIsCanvasCacheVisible(false);
      if (isInitialEntry && vid.readyState >= 1) {
        lastMonitorEntryKeyRef.current = entryKey;
        if (Math.abs((vid.currentTime || 0) - targetSourceSec) > 0.08) {
          if (!vid.paused) vid.pause();
          try {
            vid.currentTime = targetSourceSec;
          } catch {}
        }
      }
      if (vid.paused) {
        vid.play().catch(() => {});
      }
    }
  }, [
    monitorMediaUrl,
    isMonitorVideo,
    slideTimeSec,
    isPlaying,
    shuttleRate,
    playbackSpeed,
    currentWindow.speed,
    currentWindow.inSec,
    activeSlideDurationSec,
    currentSlide,
    safeIndex,
    blitCachedBitmapAtTime
  ]);

  // J / K / L Shuttle Engine rAF Driver
  const globalCurrentSecRef = useRef(globalCurrentSec);
  globalCurrentSecRef.current = globalCurrentSec;

  useEffect(() => {
    if (shuttleRate === 0) return;
    let rafId = 0;
    let lastTs = performance.now();

    const stepShuttle = (now: number) => {
      const dt = Math.min(0.06, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;
      const nextGlobal = Math.max(0, Math.min(totalDurationSec, globalCurrentSecRef.current + dt * shuttleRate));
      globalCurrentSecRef.current = nextGlobal;

      if (onScrubGlobalTime) {
        onScrubGlobalTime(nextGlobal);
      } else {
        const nextLocal = Math.max(0, Math.min(activeSlideDurationSec, slideTimeSec + dt * shuttleRate));
        onScrubSlideTime(nextLocal);
      }

      if ((shuttleRate < 0 && nextGlobal <= 0.001) || (shuttleRate > 0 && nextGlobal >= totalDurationSec - 0.001)) {
        setShuttleRate(0);
        return;
      }
      rafId = requestAnimationFrame(stepShuttle);
    };

    rafId = requestAnimationFrame(stepShuttle);
    return () => cancelAnimationFrame(rafId);
  }, [shuttleRate, totalDurationSec, onScrubGlobalTime, activeSlideDurationSec, slideTimeSec, onScrubSlideTime]);

  // Reset shuttle when normal playback starts
  useEffect(() => {
    if (isPlaying && shuttleRate !== 0) {
      setShuttleRate(0);
    }
  }, [isPlaying, shuttleRate]);

  // Auto-scroll active clip block into view on the filmstrip track
  useEffect(() => {
    if (nleTimelineScrollRef.current) {
      const clipEl = nleTimelineScrollRef.current.querySelector(`[data-shot-card="${safeIndex}"]`) as HTMLElement;
      if (clipEl) {
        clipEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  // NLE Edit Actions
  const handleSplitAtPlayhead = useCallback(() => {
    const res = splitClipAtTime(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback(`MIN ${(MIN_NLE_CLIP_DURATION_SEC * 2).toFixed(1)}S NEEDED TO SPLIT`);
      return;
    }
    try { audioEngine.playShutterClick(); } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, `SPLIT SH${String(safeIndex + 1).padStart(3, '0')} -> A + B`);
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleTrimStartQ = useCallback(() => {
    const res = trimStartToPlayheadQ(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback('PLAYHEAD TOO CLOSE TO CLIP IN/OUT');
      return;
    }
    try { audioEngine.playShutterClick(); } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'TRIM IN [Q]');
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleTrimEndW = useCallback(() => {
    const res = trimEndToPlayheadW(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback('PLAYHEAD TOO CLOSE TO CLIP END');
      return;
    }
    try { audioEngine.playShutterClick(); } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'TRIM OUT [W]');
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleRippleDelete = useCallback(() => {
    const res = rippleDeleteClip(slides, safeIndex);
    if (!res.changed) {
      showToastFeedback('CANNOT DELETE LAST CLIP');
      return;
    }
    try { audioEngine.playShutterClick(); } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'RIPPLE DELETED');
  }, [slides, safeIndex, commitNleResult, showToastFeedback]);

  const handleSlipFrames = useCallback(
    (deltaFrames: number) => {
      const deltaSec = deltaFrames / activeSlideFps;
      const res = slipClipWindow(slides, safeIndex, deltaSec, isMagneticSnap);
      if (!res.changed) {
        showToastFeedback('AT SOURCE BOUNDARY (IN = 0.00S)');
        return;
      }
      try { audioEngine.playShutterClick(); } catch {}
      commitNleResult(
        res.slides,
        res.activeIndex,
        slideTimeSec,
        `SLIP ${deltaFrames > 0 ? `+${deltaFrames}F` : `${deltaFrames}F`} -> IN ${getClipSourceWindow(res.slides[safeIndex]).inSec.toFixed(2)}S`
      );
    },
    [slides, safeIndex, activeSlideFps, isMagneticSnap, slideTimeSec, commitNleResult, showToastFeedback]
  );

  const handleSnapToTransient = useCallback(() => {
    const targetSec = findNearestTransientSec(currentSlide, safeIndex, slideTimeSec);
    try { audioEngine.playShutterClick(); } catch {}
    onScrubSlideTime(targetSec);
    showToastFeedback(`SNAPPED TO TRANSIENT @ ${targetSec.toFixed(2)}s`);
  }, [currentSlide, safeIndex, slideTimeSec, onScrubSlideTime, showToastFeedback]);

  const handleClipSpeedChange = useCallback(
    (speed: number) => {
      const res = applyClipSpeed(slides, safeIndex, speed);
      if (!res.changed) return;
      commitNleResult(res.slides, res.activeIndex, res.localTimeSec, `CLIP SPEED ${speed}x`);
    },
    [slides, safeIndex, commitNleResult]
  );

  const handleSpeedRampChange = useCallback(
    (preset: SpeedRampPreset) => {
      onUpdateSlide(safeIndex, { speedRampPreset: preset, speedRampKeyframes: undefined });
      showToastFeedback(`VELOCITY CURVE: ${preset.replace('_', ' ')}`);
    },
    [safeIndex, onUpdateSlide, showToastFeedback]
  );

  const handleCycleOpticalFlow = useCallback(() => {
    const modes: OpticalFlowMode[] = ['NONE', 'FRAME_BLEND', 'OPTICAL_FLOW'];
    const cur = currentSlide?.opticalFlowMode || 'NONE';
    const next = modes[(modes.indexOf(cur) + 1) % modes.length];
    onUpdateSlide(safeIndex, { opticalFlowMode: next });
    showToastFeedback(`INTERPOLATION: ${next.replace('_', ' ')}`);
  }, [currentSlide?.opticalFlowMode, safeIndex, onUpdateSlide, showToastFeedback]);

  const handleShuttleReverse = useCallback(() => {
    if (isPlaying) onTogglePlay();
    setShuttleRate((prev) => {
      if (prev > 1) return 1;
      if (prev === 1) return -1;
      if (prev === 0) return -1;
      if (prev === -1) return -2;
      return -4;
    });
  }, [isPlaying, onTogglePlay]);

  const handleShuttleFreeze = useCallback(() => {
    setShuttleRate(0);
    if (isPlaying) onTogglePlay();
    showToastFeedback('SHUTTLE FREEZE [K]');
  }, [isPlaying, onTogglePlay, showToastFeedback]);

  const handleShuttleForward = useCallback(() => {
    if (isPlaying) onTogglePlay();
    setShuttleRate((prev) => {
      if (prev < -1) return -1;
      if (prev === -1) return 1;
      if (prev === 0) return 1;
      if (prev === 1) return 2;
      return 4;
    });
  }, [isPlaying, onTogglePlay]);

  // Scoped CapCut NLE + J/K/L + V/Y/N Hotkeys
  useEffect(() => {
    const handleNleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        e.stopPropagation();
        handleSplitAtPlayhead();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      const lower = e.key.toLowerCase();
      if (lower === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleSplitAtPlayhead();
      } else if (lower === 'q') {
        e.preventDefault();
        e.stopPropagation();
        handleTrimStartQ();
      } else if (lower === 'w') {
        e.preventDefault();
        e.stopPropagation();
        handleTrimEndW();
      } else if (lower === 'j') {
        e.preventDefault();
        e.stopPropagation();
        handleShuttleReverse();
      } else if (lower === 'k') {
        e.preventDefault();
        e.stopPropagation();
        handleShuttleFreeze();
      } else if (lower === 'l') {
        e.preventDefault();
        e.stopPropagation();
        handleShuttleForward();
      } else if (lower === 'v') {
        e.preventDefault();
        e.stopPropagation();
        setEditToolMode('SELECT');
        showToastFeedback('TOOL: SELECT [V]');
      } else if (lower === 'y') {
        e.preventDefault();
        e.stopPropagation();
        setEditToolMode('SLIP');
        showToastFeedback('TOOL: SLIP [Y]');
      } else if (lower === 'n') {
        e.preventDefault();
        e.stopPropagation();
        setEditToolMode('ROLL');
        showToastFeedback('TOOL: ROLL [N]');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleRippleDelete();
      }
    };

    window.addEventListener('keydown', handleNleKeyDown, true);
    return () => window.removeEventListener('keydown', handleNleKeyDown, true);
  }, [
    handleSplitAtPlayhead,
    handleTrimStartQ,
    handleTrimEndW,
    handleRippleDelete,
    handleShuttleReverse,
    handleShuttleFreeze,
    handleShuttleForward,
    showToastFeedback
  ]);

  const formatSMPTE = (sec: number, fps = activeSlideFps) => {
    const totalFrames = Math.max(0, Math.floor(sec * fps));
    const ff = String(totalFrames % fps).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  // Proportional NLE Scale (px per second)
  const pxPerSec = useMemo(() => {
    const base = 44 * timelineZoom;
    return Math.max(16, Math.min(220, base));
  }, [timelineZoom]);

  const totalTrackWidthPx = Math.max(720, Math.round(totalDurationSec * pxPerSec));

  // Draw 2x Pixel-Peep Focus Loupe when Alt+Hovering Hero Canvas
  const drawLoupeMagnifier = useCallback(
    (pctX: number, pctY: number) => {
      const loupeCanvas = loupeCanvasRef.current;
      if (!loupeCanvas) return;
      const ctx = loupeCanvas.getContext('2d');
      if (!ctx) return;

      const w = loupeCanvas.width;
      const h = loupeCanvas.height;
      ctx.clearRect(0, 0, w, h);

      let sourceEl: CanvasImageSource | null = null;
      let srcW = 0;
      let srcH = 0;

      const vid = monitorVideoRef.current;
      const scrubCvs = scrubCanvasRef.current;
      if (isCanvasCacheVisible && scrubCvs && scrubCvs.width > 0) {
        sourceEl = scrubCvs;
        srcW = scrubCvs.width;
        srcH = scrubCvs.height;
      } else if (vid && vid.readyState >= 2 && vid.videoWidth > 0) {
        sourceEl = vid;
        srcW = vid.videoWidth;
        srcH = vid.videoHeight;
      }

      if (sourceEl && srcW > 0 && srcH > 0) {
        const cropW = srcW * 0.28;
        const cropH = srcH * 0.28;
        const sx = Math.max(0, Math.min(srcW - cropW, pctX * srcW - cropW / 2));
        const sy = Math.max(0, Math.min(srcH - cropH, pctY * srcH - cropH / 2));
        ctx.drawImage(sourceEl, sx, sy, cropW, cropH, 0, 0, w, h);
      } else {
        ctx.fillStyle = '#0B0C10';
        ctx.fillRect(0, 0, w, h);
      }
    },
    [isCanvasCacheVisible]
  );

  // Direct Canvas Hover / Drag Scrubbing + 2x Focus Loupe
  const scrubHeroCanvasFromPointer = useCallback(
    (clientX: number, clientY: number, altHeld: boolean, commitSeek: boolean) => {
      const el = heroViewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const ratioX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ratioY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      setCanvasHoverPct(ratioX * 100);

      if (altHeld) {
        setLoupeState({
          active: true,
          x: clientX - rect.left,
          y: clientY - rect.top,
          pctX: ratioX,
          pctY: ratioY
        });
        drawLoupeMagnifier(ratioX, ratioY);
      } else if (loupeState?.active) {
        setLoupeState(null);
      }

      if (commitSeek) {
        const targetLocalSec = ratioX * activeSlideDurationSec;
        const targetSourceSec = evaluateSpeedRampSourceTime(currentSlide, targetLocalSec);
        blitCachedBitmapAtTime(targetSourceSec);
        onScrubSlideTime(targetLocalSec);
        if (monitorVideoRef.current && isMonitorVideo && monitorVideoRef.current.readyState >= 1) {
          syncVideoCurrentTimeWithFastSeek(monitorVideoRef.current, targetSourceSec, 0.002);
        }
      }
    },
    [
      activeSlideDurationSec,
      onScrubSlideTime,
      isMonitorVideo,
      currentSlide,
      blitCachedBitmapAtTime,
      drawLoupeMagnifier,
      loupeState?.active
    ]
  );

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select')) return;
    setShuttleRate(0);
    isDraggingCanvasScrubRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubHeroCanvasFromPointer(e.clientX, e.clientY, e.altKey, true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const shouldScrub = isDraggingCanvasScrubRef.current || (isHoverScrubEnabled && !isPlaying && shuttleRate === 0);
    scrubHeroCanvasFromPointer(e.clientX, e.clientY, e.altKey, shouldScrub);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCanvasScrubRef.current) {
      isDraggingCanvasScrubRef.current = false;
      setIsCanvasCacheVisible(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const handleCanvasPointerLeave = () => {
    setCanvasHoverPct(null);
    setLoupeState(null);
    setIsCanvasCacheVisible(false);
    isDraggingCanvasScrubRef.current = false;
  };

  // Master Track Ruler Scrubbing
  const scrubAtTrackClientX = useCallback(
    (clientX: number) => {
      const container = nleTimelineScrollRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const offsetX = clientX - rect.left + container.scrollLeft;
      const targetGlobalSec = Math.max(0, Math.min(totalDurationSec, offsetX / pxPerSec));

      if (onScrubGlobalTime) {
        onScrubGlobalTime(targetGlobalSec);
      } else {
        let matchedIdx = 0;
        let localSec = 0;
        for (let i = 0; i < shotOffsets.length; i++) {
          const off = shotOffsets[i];
          if (targetGlobalSec >= off.startSec && targetGlobalSec <= off.endSec) {
            matchedIdx = i;
            localSec = targetGlobalSec - off.startSec;
            break;
          }
          if (targetGlobalSec > off.endSec) {
            matchedIdx = i;
            localSec = off.durationSec;
          }
        }
        onSelectSlide(matchedIdx);
        onScrubSlideTime(localSec);
      }
    },
    [totalDurationSec, pxPerSec, onScrubGlobalTime, shotOffsets, onSelectSlide, onScrubSlideTime]
  );

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setShuttleRate(0);
    isDraggingMasterNeedleRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubAtTrackClientX(e.clientX);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMasterNeedleRef.current) return;
    scrubAtTrackClientX(e.clientX);
  };

  const handleRulerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingMasterNeedleRef.current) {
      isDraggingMasterNeedleRef.current = false;
      setIsCanvasCacheVisible(false);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  // Smooth mouse-wheel zoom (`Ctrl`/`Meta`/`Alt`) or timeline horizontal scrub
  const handleFilmstripWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.25 : -0.25;
      setTimelineZoom((z) => Math.max(0.5, Math.min(4.0, Number((z + step).toFixed(2)))));
      return;
    }
    const container = nleTimelineScrollRef.current;
    if (container && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      container.scrollLeft += e.deltaY;
    }
  };

  // Edge / Roll Handle Pointer Handlers
  const handleTrimHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clipIndex: number,
    edge: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelectSlide(clipIndex);

    const canRoll =
      editToolMode === 'ROLL' &&
      ((edge === 'right' && clipIndex < slides.length - 1) || (edge === 'left' && clipIndex > 0));

    activeTrimDragRef.current = {
      kind: canRoll ? 'roll' : 'edge',
      clipIndex: canRoll ? (edge === 'right' ? clipIndex : clipIndex - 1) : clipIndex,
      edge,
      startClientX: e.clientX,
      baseSlides: slides,
      latestSlides: slides
    };
  };

  // Slip Interior Drag Handlers when Tool === 'SLIP'
  const handleClipBodyPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clipIndex: number
  ) => {
    if (editToolMode !== 'SLIP') return;
    if ((e.target as HTMLElement).closest('[role="separator"]')) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelectSlide(clipIndex);
    activeTrimDragRef.current = {
      kind: 'slip',
      clipIndex,
      startClientX: e.clientX,
      baseSlides: slides,
      latestSlides: slides
    };
  };

  const handleClipDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = activeTrimDragRef.current;
    if (!drag) return;
    e.stopPropagation();

    const deltaPx = e.clientX - drag.startClientX;
    const deltaSec = deltaPx / pxPerSec;

    if (drag.kind === 'roll') {
      const res = rollClipCutPoint(drag.baseSlides, drag.clipIndex, deltaSec, isMagneticSnap);
      drag.latestSlides = res.slides;
      setTrimPreviewSlides(res.slides);
      const vid = monitorVideoRef.current;
      if (vid && isMonitorVideo && vid.readyState >= 1) {
        blitCachedBitmapAtTime(res.scrubPreviewSourceSec);
        syncVideoCurrentTimeWithFastSeek(vid, res.scrubPreviewSourceSec, 0.002);
      }
      return;
    }

    if (drag.kind === 'slip') {
      const res = slipClipWindow(drag.baseSlides, drag.clipIndex, -deltaSec, isMagneticSnap);
      drag.latestSlides = res.slides;
      setTrimPreviewSlides(res.slides);
      const slipWin = getClipSourceWindow(res.slides[drag.clipIndex]);
      const vid = monitorVideoRef.current;
      if (vid && isMonitorVideo && vid.readyState >= 1) {
        blitCachedBitmapAtTime(slipWin.inSec);
        syncVideoCurrentTimeWithFastSeek(vid, slipWin.inSec, 0.002);
      }
      return;
    }

    // Standard Edge Trim (`[|` / `|]`)
    const res = trimClipEdge(drag.baseSlides, drag.clipIndex, drag.edge || 'right', deltaSec, isMagneticSnap);
    drag.latestSlides = res.slides;
    setTrimPreviewSlides(res.slides);

    const vid = monitorVideoRef.current;
    if (vid && isMonitorVideo && vid.readyState >= 1) {
      blitCachedBitmapAtTime(res.scrubPreviewSourceSec);
      syncVideoCurrentTimeWithFastSeek(vid, res.scrubPreviewSourceSec, 0.002);
    }

    const updatedWin = getClipSourceWindow(res.slides[drag.clipIndex]);
    onScrubSlideTime(drag.edge === 'left' ? 0 : Math.max(0, updatedWin.timelineDurationSec - 1 / updatedWin.fps));
  };

  const handleClipDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = activeTrimDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const finalSlides = drag.latestSlides;
    const finalWin = getClipSourceWindow(finalSlides[drag.clipIndex]);
    const finalLocalSec =
      drag.kind === 'slip'
        ? slideTimeSec
        : drag.kind === 'roll'
          ? Math.max(0, finalWin.timelineDurationSec - 1 / finalWin.fps)
          : drag.edge === 'left'
            ? 0
            : Math.max(0, finalWin.timelineDurationSec - 1 / finalWin.fps);

    const toastLabel =
      drag.kind === 'roll'
        ? `ROLLED SEAM (${finalWin.timelineDurationSec.toFixed(2)}S)`
        : drag.kind === 'slip'
          ? `SLIPPED IN ${finalWin.inSec.toFixed(2)}S`
          : `${drag.edge === 'left' ? 'IN' : 'OUT'} TRIMMED (${finalWin.timelineDurationSec.toFixed(2)}S)`;

    activeTrimDragRef.current = null;
    setTrimPreviewSlides(null);
    setIsCanvasCacheVisible(false);

    commitNleResult(finalSlides, drag.clipIndex, finalLocalSec, toastLabel);
  };

  // Bezier Velocity Ramp Keyframe Manipulation
  const activeKeyframes: SpeedRampKeyframe[] = useMemo(() => {
    if (currentSlide?.speedRampKeyframes && currentSlide.speedRampKeyframes.length >= 2) {
      return currentSlide.speedRampKeyframes;
    }
    return DEFAULT_RAMP_KEYFRAMES;
  }, [currentSlide?.speedRampKeyframes]);

  const updateKeyframeSpeed = (kfIdx: number, nextSpeed: number) => {
    const clamped = Number(Math.max(0.25, Math.min(4.0, nextSpeed)).toFixed(2));
    const nextKfs = activeKeyframes.map((kf, i) => (i === kfIdx ? { ...kf, rate: clamped } : kf));
    onUpdateSlide(safeIndex, {
      speedRampKeyframes: nextKfs,
      speedRampPreset: currentSlide?.speedRampPreset === 'NONE' || !currentSlide?.speedRampPreset ? 'WHIP_CUT' : currentSlide.speedRampPreset
    });
  };

  // Card Reordering
  const handleMoveCard = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const nextSlides = [...slides];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(targetIdx, 0, moved);
    onReorderSlides(nextSlides);
    onSelectSlide(targetIdx);
  };

  const handleStartEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = slides[idx];
    if (!target) return;
    setEditingCardIndex(idx);
    setEditTitleEn(target.titleEn || '');
    setEditTitleBn(target.titleBn || '');
    setEditNotes(target.directorNotes || '');
  };

  const handleSaveEdit = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateSlide(idx, {
      titleEn: editTitleEn.trim(),
      titleBn: editTitleBn.trim(),
      directorNotes: editNotes.trim()
    });
    setEditingCardIndex(null);
  };

  const handleTriggerUpload = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadTargetIdx(idx);
    fileUploadInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetIdx !== null && onUploadMedia) {
      onUploadMedia(uploadTargetIdx, file);
    }
    if (fileUploadInputRef.current) {
      fileUploadInputRef.current.value = '';
    }
  };

  const filteredSlides = useMemo(() => {
    if (!searchQuery.trim()) return activeSlides;
    const q = searchQuery.toLowerCase();
    return activeSlides.filter((s, idx) => {
      const shotNum = String(idx + 1).padStart(3, '0');
      return (
        shotNum.includes(q) ||
        (s.titleEn && s.titleEn.toLowerCase().includes(q)) ||
        (s.titleBn && s.titleBn.toLowerCase().includes(q)) ||
        (s.directorNotes && s.directorNotes.toLowerCase().includes(q))
      );
    });
  }, [activeSlides, searchQuery]);

  const rulerTicks = useMemo(() => {
    const stepSec = timelineZoom >= 2.0 ? 1 : timelineZoom >= 1.0 ? 2 : 5;
    const ticks: number[] = [];
    for (let s = 0; s <= totalDurationSec + 0.01; s += stepSec) {
      ticks.push(s);
    }
    return ticks;
  }, [totalDurationSec, timelineZoom]);

  const masterNeedleLeftPx = Math.max(0, Math.min(totalTrackWidthPx, globalCurrentSec * pxPerSec));
  const localProgressPct = Math.max(0, Math.min(100, (slideTimeSec / Math.max(0.01, activeSlideDurationSec)) * 100));
  const beatFx = evaluateBeatDropFx(currentSlide, slideTimeSec, activeSlideFps);
  const opticalFlowMode = currentSlide?.opticalFlowMode || 'NONE';

  const viewportAspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] h-full max-w-full'
      : aspectRatio === '16:9'
        ? 'aspect-video max-h-full max-w-full w-auto h-full'
        : 'aspect-[2.39/1] max-h-full max-w-full w-full';

  const hideTopStrip = isPlaying && !isHeaderHovered;

  return (
    <div className={`w-full h-full bg-[#050505] text-zinc-200 flex flex-col overflow-hidden select-none font-mono ${className}`}>
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. MAXIMIZED HERO SCRUB VIEWPORT (>=76% Height, auto-collapses secondary header on play) */}
      <section
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        className="relative flex-1 min-h-0 w-full bg-[#050505] flex flex-col overflow-hidden"
      >
        {/* Auto-Collapsible Telemetry Header */}
        <div
          className={`px-3 bg-[#08090C] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 text-[10px] transition-all duration-200 ${
            hideTopStrip ? 'h-0 opacity-0 border-b-0 overflow-hidden py-0' : 'h-8 opacity-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 bg-[#F5A623] text-black font-black tracking-wider shrink-0">
              SCRUB
            </span>
            <span className="font-bold text-white shrink-0 tabular-nums">
              SH{String(safeIndex + 1).padStart(3, '0')}/{activeSlides.length}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300 truncate max-w-[200px] sm:max-w-[340px]">
              {currentSlide?.titleBn ? `${currentSlide.titleBn} · ` : ''}
              {currentSlide?.titleEn || `Shot ${String(safeIndex + 1).padStart(3, '0')}`}
            </span>
            {ringCacheCount > 0 && (
              <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[9px] font-bold">
                CACHE {ringCacheCount}F
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3 tabular-nums">
            <span className="text-[#F5A623] font-bold">
              {formatSMPTE(slideTimeSec)} / {formatDurationPillValue(activeSlideDurationSec)}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-300 font-bold">
              F{String(currentFrameNum).padStart(3, '0')}/{activeSlideTotalFrames}F
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">
              IN {currentWindow.inSec.toFixed(2)}s · OUT {currentWindow.outSec.toFixed(2)}s
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {nleFeedback && (
              <span className="px-2 py-0.5 bg-[#F5A623]/20 border border-[#F5A623]/60 text-[#FFE066] text-[10px] font-bold">
                {nleFeedback}
              </span>
            )}
            <CinemaToolHUD
              title="HOVER SCRUB"
              en="Move mouse across preview frame to scrub video smoothly."
              bn="ভিডিওর উপর মাউস নাড়িয়েই সাথে সাথে স্ক্রাব প্রিভিউ দেখুন।"
              accent="amber"
            >
              <button
                type="button"
                data-active={isHoverScrubEnabled ? 'true' : 'false'}
                onClick={() => setIsHoverScrubEnabled((h) => !h)}
                className="px-2 py-0.5 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer whitespace-nowrap"
              >
                SCRUB {isHoverScrubEnabled ? 'ON' : 'OFF'}
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="1F MAGNETIC SNAP"
              en="Snap cuts and trim handles cleanly to 1-frame boundaries."
              bn="১-ফ্রেম নিখুঁতভাবে কাট ও ট্রিম লক করতে এটি অন রাখুন।"
              accent="amber"
            >
              <button
                type="button"
                data-active={isMagneticSnap ? 'true' : 'false'}
                onClick={() => setIsMagneticSnap((m) => !m)}
                className="px-2 py-0.5 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Magnet className="w-3 h-3 cinema-tile-icon" />
                <span>SNAP 1F</span>
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="PLAYBACK SCOPE"
              en="Switch between sequential sequence playback and single-shot loop."
              bn="সব শট একসাথে প্লে (SEQ) বা শুধু একটি শট লুপ (SOLO) বদলান।"
              accent="emerald"
            >
              <button
                type="button"
                data-active={playbackMode === 'sequence' ? 'true' : 'false'}
                onClick={() => onSelectPlaybackMode(playbackMode === 'sequence' ? 'solo' : 'sequence')}
                className="px-2 py-0.5 rounded cinema-tile cinema-tile-emerald text-[10px] font-black cursor-pointer whitespace-nowrap"
              >
                {playbackMode === 'sequence' ? 'SEQ' : 'SOLO'}
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Interactive Maximized Canvas Stage (Direct Hover/Drag Scrub + Ring-Buffer GPU Blitting + Alt 2x Loupe) */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1.5 sm:p-2 overflow-hidden bg-[#050505]">
          <div
            ref={heroViewportRef}
            data-testid="scrub-hero-viewport"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerLeave}
            className={`relative ${viewportAspectClass} bg-black border border-white/15 overflow-hidden flex items-center justify-center cursor-ew-resize group`}
          >
            {/* Video / Still Plate Layer */}
            {monitorMediaUrl ? (
              isMonitorVideo ? (
                <>
                  {(!isVideoReady && fallbackPosterUrl) && (
                    <img
                      src={fallbackPosterUrl}
                      alt={currentSlide?.titleEn || 'Video poster'}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[1]"
                    />
                  )}
                  <video
                    ref={monitorVideoRef}
                    src={monitorMediaUrl}
                    crossOrigin="anonymous"
                    poster={fallbackPosterUrl || undefined}
                    className={`w-full h-full object-cover pointer-events-none z-[2] ${
                      opticalFlowMode === 'OPTICAL_FLOW'
                        ? 'transition-[filter] duration-150 saturate-[1.06]'
                        : opticalFlowMode === 'FRAME_BLEND'
                          ? 'transition-opacity duration-75'
                          : ''
                    }`}
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={() => {
                      setIsVideoReady(true);
                      void captureCurrentVideoFrameToRing();
                    }}
                    onCanPlay={() => setIsVideoReady(true)}
                    onSeeked={() => {
                      setIsCanvasCacheVisible(false);
                      void captureCurrentVideoFrameToRing();
                    }}
                    onTimeUpdate={() => {
                      if (isPlaying) void captureCurrentVideoFrameToRing();
                    }}
                    style={{
                      opacity: isVideoReady || !fallbackPosterUrl ? 1 : 0,
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  />
                  {/* GPU Keyframe Ring-Buffer Scrub Accelerator Canvas */}
                  <canvas
                    ref={scrubCanvasRef}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none z-[3] transition-opacity duration-75 ${
                      isCanvasCacheVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              ) : (
                <img
                  src={monitorMediaUrl}
                  alt={currentSlide?.titleEn || 'Slide preview'}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Film className="w-8 h-8 opacity-40" />
                <span className="text-[11px] font-black tracking-widest uppercase">SH{String(safeIndex + 1).padStart(3, '0')} EMPTY</span>
                <CinemaToolHUD title="INGEST CLIP" en="Upload a video or photo plate for this shot." bn="এই শটে নতুন ভিডিও বা ছবি আপলোড করতে চাপুন।" accent="amber">
                  <button
                    type="button"
                    data-active="true"
                    onClick={(e) => handleTriggerUpload(safeIndex, e)}
                    className="px-3 py-1 rounded cinema-tile cinema-tile-amber text-[11px] font-black cursor-pointer"
                  >
                    + INGEST
                  </button>
                </CinemaToolHUD>
              </div>
            )}

            {/* Beat-Drop 2F Flash Preview */}
            {beatFx.isFlashCutFrame && (
              <div className="absolute inset-0 bg-[#050505] pointer-events-none z-[15]" />
            )}

            {/* Top-Left Live SMPTE, Frame Counter & Shuttle Speed HUD */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-20">
              <div className="px-2 py-0.5 bg-black/85 border border-white/15 text-[10px] font-bold text-[#F5A623] tabular-nums">
                F{String(currentFrameNum).padStart(3, '0')}/{activeSlideTotalFrames} · {formatSMPTE(slideTimeSec)} · SRC {evaluateSpeedRampSourceTime(currentSlide, slideTimeSec).toFixed(2)}s
              </div>
              {shuttleRate !== 0 && (
                <div
                  data-testid="scrub-shuttle-badge"
                  className={`px-2 py-0.5 border text-[10px] font-black tracking-wider uppercase tabular-nums ${
                    shuttleRate < 0
                      ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                      : 'bg-cyan-950/95 border-cyan-400 text-cyan-200'
                  }`}
                >
                  SHUTTLE {shuttleRate > 0 ? `+${shuttleRate}x FWD` : `${shuttleRate}x REV`}
                </div>
              )}
              {opticalFlowMode !== 'NONE' && (
                <div className="px-1.5 py-0.5 bg-purple-950/90 border border-purple-400/50 text-purple-200 text-[9px] font-bold uppercase">
                  {opticalFlowMode === 'OPTICAL_FLOW' ? 'OPTICAL FLOW' : 'FRAME BLEND'}
                </div>
              )}
            </div>

            {/* Top-Right Alt+Hover Hint & Upload Replace */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
              <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/75 border border-white/10 text-[9px] font-bold text-zinc-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <Crosshair className="w-2.5 h-2.5 text-cyan-400" />
                ALT 2X
              </span>
              <CinemaToolHUD title="REPLACE MEDIA" en="Swap current shot media with a new local file." bn="বর্তমান শটের ফাইল বদলাতে নতুন মিডিয়া দিন।" accent="amber">
                <button
                  type="button"
                  onClick={(e) => handleTriggerUpload(safeIndex, e)}
                  className="px-2 py-0.5 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Upload className="w-3 h-3 cinema-tile-icon" />
                  <span>REPLACE</span>
                </button>
              </CinemaToolHUD>
            </div>

            {/* Interactive Bezier Velocity Ramp Overlay Drawer */}
            {isRampCurveOpen && (
              <div
                data-testid="scrub-bezier-ramp-editor"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerMove={(e) => e.stopPropagation()}
                className="absolute right-3 bottom-12 w-72 bg-[#08090D]/95 border border-[#F5A623]/60 backdrop-blur-xl p-2.5 z-40 shadow-2xl"
              >
                <div className="flex items-center justify-between text-[9px] font-black text-[#F5A623] uppercase tracking-wider mb-1.5">
                  <span>BEZIER SPEED RAMP (0.25x–4.0x)</span>
                  <button
                    type="button"
                    onClick={() => onUpdateSlide(safeIndex, { speedRampKeyframes: DEFAULT_RAMP_KEYFRAMES, speedRampPreset: 'WHIP_CUT' })}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    RESET
                  </button>
                </div>

                {/* Live Smooth Bezier Curve SVG */}
                <svg viewBox="0 0 240 72" className="w-full h-16 bg-black/80 border border-white/10 mb-2">
                  <line x1="0" y1="54" x2="240" y2="54" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                  <path
                    d={(() => {
                      const toY = (spd: number) => 66 - ((spd - 0.25) / 3.75) * 56;
                      const p0 = toY(activeKeyframes[0]?.rate ?? 1);
                      const p1 = toY(activeKeyframes[1]?.rate ?? 2);
                      const p2 = toY(activeKeyframes[2]?.rate ?? 1);
                      return `M 12 ${p0} C 70 ${p0}, 70 ${p1}, 120 ${p1} S 170 ${p2}, 228 ${p2}`;
                    })()}
                    fill="none"
                    stroke="#F5A623"
                    strokeWidth="2.5"
                  />
                  {activeKeyframes.map((kf, kIdx) => {
                    const cx = kIdx === 0 ? 12 : kIdx === 1 ? 120 : 228;
                    const cy = 66 - ((kf.rate - 0.25) / 3.75) * 56;
                    return (
                      <g key={kIdx}>
                        <circle cx={cx} cy={cy} r="5" fill="#00F0FF" stroke="#000" strokeWidth="1.5" />
                        <text x={cx} y={Math.max(10, cy - 8)} textAnchor="middle" fill="#FFE066" fontSize="8" fontWeight="bold">
                          {kf.rate.toFixed(1)}x
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* 3 Keyframe Sliders */}
                <div className="grid grid-cols-3 gap-2 text-[9px]">
                  {(['IN', 'MID', 'OUT'] as const).map((label, kIdx) => (
                    <label key={label} className="flex flex-col gap-0.5 text-zinc-300">
                      <div className="flex justify-between">
                        <span>{label}</span>
                        <span className="text-cyan-300 font-bold">{(activeKeyframes[kIdx]?.rate ?? 1).toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={4.0}
                        step={0.05}
                        value={activeKeyframes[kIdx]?.rate ?? 1}
                        onChange={(e) => updateKeyframeSpeed(kIdx, Number(e.target.value))}
                        className="w-full accent-[#F5A623] cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Title Overlay Preview at Bottom of Hero Stage */}
            <div className="absolute inset-x-0 bottom-2.5 px-3 pointer-events-none z-20 flex items-end justify-between">
              <div className="bg-black/75 border border-white/10 px-2.5 py-1 max-w-[68%]">
                {currentSlide?.titleBn && (
                  <div className="text-[#FFE066] font-serif font-bold text-sm leading-tight truncate">
                    {currentSlide.titleBn}
                  </div>
                )}
                <div className="text-white font-bold text-xs tracking-wide truncate">
                  {currentSlide?.titleEn || `Shot ${String(safeIndex + 1).padStart(3, '0')}`}
                </div>
              </div>
              <div className="bg-black/80 border border-white/10 px-2 py-1 text-[10px] text-zinc-300 tabular-nums">
                IN {currentWindow.inSec.toFixed(2)}s · OUT {currentWindow.outSec.toFixed(2)}s · {currentWindow.speed.toFixed(2)}x
              </div>
            </div>

            {/* 2x Pixel-Peep Focus Loupe (`Alt + Hover`) */}
            {loupeState?.active && (
              <div
                data-testid="scrub-focus-loupe"
                style={{
                  left: `${Math.max(70, Math.min((heroViewportRef.current?.clientWidth || 600) - 70, loupeState.x))}px`,
                  top: `${Math.max(70, Math.min((heroViewportRef.current?.clientHeight || 400) - 70, loupeState.y))}px`
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-[132px] h-[132px] rounded-full border-2 border-cyan-400 shadow-[0_0_24px_rgba(0,240,255,0.6)] overflow-hidden pointer-events-none z-40 bg-black"
              >
                <canvas ref={loupeCanvasRef} width={132} height={132} className="w-full h-full" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-4 h-px bg-cyan-400/80" />
                  <div className="h-4 w-px bg-cyan-400/80 absolute" />
                </div>
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-black/85 text-cyan-300 text-[8px] font-black">
                  2.0× LOUPE
                </span>
              </div>
            )}

            {/* Direct-Canvas Hover Hairline Scrub Needle */}
            {canvasHoverPct !== null && (
              <div
                style={{ left: `${canvasHoverPct}%` }}
                className="absolute top-0 bottom-0 w-px bg-[#F5A623] pointer-events-none z-30"
              >
                <div className="absolute top-2 left-1.5 px-1.5 py-0.5 bg-[#F5A623] text-black text-[9px] font-black whitespace-nowrap tabular-nums">
                  {((canvasHoverPct / 100) * activeSlideDurationSec).toFixed(2)}s
                </div>
              </div>
            )}

            {/* Bottom Edge In/Out Playhead Progress Bar */}
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/80 pointer-events-none z-20">
              <div
                className="h-full bg-[#E50914]"
                style={{ width: `${localProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPACT PRECISION RAZOR, SHUTTLE & NLE MODE BAR */}
      <div className="min-h-[40px] px-2.5 py-1 bg-[#0B0C10] border-y border-white/15 flex flex-wrap items-center justify-between gap-1 shrink-0 z-30">
        {/* Left: Edit Modes (`SELECT [V]`, `SLIP [Y]`, `ROLL [N]`) + Cutting Ops */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-black/70 border border-white/10 p-0.5 mr-1 gap-0.5">
            {([
              { id: 'SELECT', label: 'V', title: 'SELECT & TRIM [V]', en: 'Standard edge trim & scrub pointer.', bn: 'ক্লিপ সিলেক্ট ও দুই পাশ ট্রিম করার টুল।' },
              { id: 'SLIP', label: 'Y SLIP', title: 'SLIP SOURCE [Y]', en: 'Slip source in/out window without moving clip.', bn: 'ক্লিপের জায়গা না বদলে ভেতরের দৃশ্য সামনে-পিছনে নিন।' },
              { id: 'ROLL', label: 'N ROLL', title: 'ROLL SEAM [N]', en: 'Roll shared edit cut between adjacent clips.', bn: 'পাশাপাশি দুটি ক্লিপের জয়েন্ট কাট একসাথে স্লাইড করুন।' }
            ] as const).map((tool) => (
              <CinemaToolHUD key={tool.id} title={tool.title} en={tool.en} bn={tool.bn} accent="cyan">
                <button
                  type="button"
                  data-testid={`scrub-tool-${tool.id.toLowerCase()}`}
                  data-active={editToolMode === tool.id ? 'true' : 'false'}
                  onClick={() => setEditToolMode(tool.id)}
                  className="px-1.5 py-0.5 rounded cinema-tile cinema-tile-cyan text-[9px] font-black cursor-pointer whitespace-nowrap"
                >
                  {tool.label}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          <CinemaToolHUD
            title="RAZOR SPLIT [S]"
            en="Split active shot at the playhead frame."
            bn="প্লেহেডের জায়গায় শটটি দুই টুকরো করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              data-testid="scrub-split-btn"
              data-active="true"
              onClick={handleSplitAtPlayhead}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Scissors className="w-3 h-3 cinema-tile-icon" />
              <span>SPLIT</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="TRIM START [Q]"
            en="Ripple-trim clip start point cleanly to playhead."
            bn="প্লেহেডের বাম পাশের বাড়তি অংশ এক চাপে কেটে ফেলুন।"
            accent="amber"
          >
            <button
              type="button"
              data-testid="scrub-trim-q-btn"
              onClick={handleTrimStartQ}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeftToLine className="w-3 h-3 cinema-tile-icon" />
              <span>IN [Q]</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="TRIM END [W]"
            en="Ripple-trim clip end point cleanly to playhead."
            bn="প্লেহেডের ডান পাশের বাড়তি অংশ এক চাপে কেটে ফেলুন।"
            accent="amber"
          >
            <button
              type="button"
              data-testid="scrub-trim-w-btn"
              onClick={handleTrimEndW}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>OUT [W]</span>
              <ArrowRightToLine className="w-3 h-3 cinema-tile-icon" />
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="RIPPLE DELETE"
            en="Delete active shot and close timeline gap."
            bn="বর্তমান শট ডিলিট করে টাইমলাইনের ফাঁকা জায়গা বন্ধ করুন।"
            accent="crimson"
          >
            <button
              type="button"
              data-testid="scrub-ripple-delete-btn"
              onClick={handleRippleDelete}
              disabled={slides.length <= 1}
              className="px-1.5 py-1 rounded cinema-tile cinema-tile-crimson text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-35 whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3 cinema-tile-icon" />
              <span className="hidden xl:inline">DEL</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="SNAP TO BEAT"
            en="Jump playhead to nearest transient beat marker."
            bn="অডিওর কাছের বিট পয়েন্টে প্লেহেড নিয়ে যেতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              data-testid="scrub-snap-transient-btn"
              onClick={handleSnapToTransient}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Activity className="w-3 h-3 cinema-tile-icon" />
              <span>BEAT</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Center: J/K/L Shuttle, Frame-Steppers & Transport */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center bg-black/70 border border-white/10 p-0.5 mr-0.5 gap-0.5">
            <CinemaToolHUD title="SHUTTLE REV [J]" en="Shuttle reverse at -1x / -2x / -4x speed." bn="পিছনের দিকে দ্রুত রিওয়াইন্ড স্পিড বাড়ান [J]।" accent="crimson">
              <button
                type="button"
                data-active={shuttleRate < 0 ? 'true' : 'false'}
                onClick={handleShuttleReverse}
                className="px-1.5 py-0.5 rounded cinema-tile cinema-tile-crimson text-[9px] font-black cursor-pointer"
              >
                J {shuttleRate < 0 ? `${shuttleRate}x` : '◀'}
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD title="PAUSE DECK [K]" en="Stop J/K/L deck shuttling immediately." bn="প্লেব্যাক ও শাটল সাথে সাথে থামান [K]।" accent="amber">
              <button
                type="button"
                data-active={shuttleRate === 0 && !isPlaying ? 'true' : 'false'}
                onClick={handleShuttleFreeze}
                className="px-1.5 py-0.5 rounded cinema-tile cinema-tile-amber text-[9px] font-black cursor-pointer"
              >
                K
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD title="SHUTTLE FWD [L]" en="Shuttle forward at +1x / +2x / +4x speed." bn="সামনের দিকে ফাস্ট-ফরওয়ার্ড স্পিড বাড়ান [L]।" accent="cyan">
              <button
                type="button"
                data-active={shuttleRate > 0 ? 'true' : 'false'}
                onClick={handleShuttleForward}
                className="px-1.5 py-0.5 rounded cinema-tile cinema-tile-cyan text-[9px] font-black cursor-pointer"
              >
                L {shuttleRate > 0 ? `+${shuttleRate}x` : '▶'}
              </button>
            </CinemaToolHUD>
          </div>

          <CinemaToolHUD title="STEP -1 FRAME" en="Step backward by 1 frame." bn="ঠিক ১ ফ্রেম পিছনে যান।" accent="amber">
            <button
              type="button"
              onClick={() => onStepFrame(false)}
              className="px-1.5 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer whitespace-nowrap"
            >
              -1F
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD title={isPlaying ? 'PAUSE' : 'PLAY'} en="Toggle Scrub NLE playback." bn="ভিডিও চালু বা বিরতি দিতে চাপুন।" accent="amber">
            <button
              type="button"
              data-active={isPlaying ? 'true' : 'false'}
              onClick={onTogglePlay}
              className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber font-black text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current cinema-tile-icon" /> : <Play className="w-3 h-3 fill-current cinema-tile-icon" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD title="STEP +1 FRAME" en="Step forward by 1 frame." bn="ঠিক ১ ফ্রেম সামনে যান।" accent="amber">
            <button
              type="button"
              onClick={() => onStepFrame(true)}
              className="px-1.5 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer whitespace-nowrap"
            >
              +1F
            </button>
          </CinemaToolHUD>

          <CadenceSelectorPill
            durationSec={activeSlideDurationSec}
            targetFps={activeSlideFps}
            onChangeDuration={(dur) => onUpdateSlide(safeIndex, { duration: dur, durationSec: dur })}
            onChangeTargetFps={(fps) => onUpdateSlide(safeIndex, { targetFps: fps })}
            onApplyDurationToAll={onApplyDurationToAll}
            isSnapToBeat={isSnapToBeat}
            onToggleSnapToBeat={onToggleSnapToBeat}
            compact
          />
        </div>

        {/* Right: Speed Multipliers, Bezier Ramp, Optical Flow, Zoom & Timeline/Cards Collapse */}
        <div className="flex items-center gap-1 text-[10px]">
          <div className="hidden xl:flex items-center gap-0.5 bg-black/60 border border-white/10 px-1 py-0.5">
            <Gauge className="w-3 h-3 text-cyan-400 mr-0.5" />
            {SCRUB_SPEED_OPTIONS.map((spd) => (
              <CinemaToolHUD key={spd} title={`SPEED ${spd}X`} en={`Set clip playback rate to ${spd}x.`} bn={`ক্লিপের গতি ${spd}x করতে চাপুন।`} accent="cyan">
                <button
                  type="button"
                  data-active={Math.abs(currentWindow.speed - spd) < 0.05 ? 'true' : 'false'}
                  onClick={() => {
                    handleClipSpeedChange(spd);
                    onChangePlaybackSpeed?.(spd);
                  }}
                  className="px-1 py-0.5 rounded cinema-tile cinema-tile-cyan font-black cursor-pointer whitespace-nowrap"
                >
                  {spd}x
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          <CinemaToolHUD
            title="SPEED CURVE"
            en="Open interactive Bezier speed-ramp keyframe editor."
            bn="স্মুথ স্লো-মোশন ও স্পিড-র‍্যাম্প কার্ভ সেট করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              data-active={isRampCurveOpen || Boolean(currentSlide?.speedRampKeyframes?.length) ? 'true' : 'false'}
              onClick={() => setIsRampCurveOpen((o) => !o)}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3 h-3 cinema-tile-icon" />
              <span>CURVE</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="OPTICAL FLOW"
            en="Cycle Optical Flow or Frame-Blend slow-motion smoothing."
            bn="স্লো-মোশন ফ্রেম স্মুথ করতে Optical Flow চালু করুন।"
            accent="cyan"
          >
            <button
              type="button"
              data-testid="scrub-optical-flow-btn"
              data-active={opticalFlowMode !== 'NONE' ? 'true' : 'false'}
              onClick={handleCycleOpticalFlow}
              className="px-2 py-1 rounded cinema-tile cinema-tile-cyan text-[9px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3 cinema-tile-icon" />
              <span>{opticalFlowMode === 'OPTICAL_FLOW' ? 'FLOW' : opticalFlowMode === 'FRAME_BLEND' ? 'BLEND' : 'OPTICAL'}</span>
            </button>
          </CinemaToolHUD>

          <div className="flex items-center gap-0.5 bg-black/60 border border-white/10 px-1 py-0.5">
            <CinemaToolHUD title="ZOOM OUT" en="Zoom out filmstrip track." bn="টাইমলাইন জুম আউট করুন।" accent="amber">
              <button
                type="button"
                onClick={() => setTimelineZoom((z) => Math.max(0.5, Number((z - 0.5).toFixed(1))))}
                className="p-0.5 rounded cinema-tile cinema-tile-amber cursor-pointer"
              >
                <ZoomOut className="w-3 h-3 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
            <span className="text-zinc-300 font-bold tabular-nums w-6 text-center">{timelineZoom.toFixed(1)}x</span>
            <CinemaToolHUD title="ZOOM IN" en="Zoom in filmstrip track." bn="টাইমলাইন জুম ইন করুন।" accent="amber">
              <button
                type="button"
                onClick={() => setTimelineZoom((z) => Math.min(4.0, Number((z + 0.5).toFixed(1))))}
                className="p-0.5 rounded cinema-tile cinema-tile-amber cursor-pointer"
              >
                <ZoomIn className="w-3 h-3 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          </div>

          <CinemaToolHUD title="SHOT CARDS" en="Toggle collapsible shot cards drawer." bn="সব শটের কার্ড ও টাইটেল ড্রয়ার খুলুন।" accent="amber">
            <button
              type="button"
              data-active={isCardDrawerOpen ? 'true' : 'false'}
              onClick={() => setIsCardDrawerOpen((o) => !o)}
              className="px-2 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              {isCardDrawerOpen ? <PanelBottomClose className="w-3 h-3 cinema-tile-icon" /> : <PanelBottomOpen className="w-3 h-3 cinema-tile-icon" />}
              <span>CARDS ({activeSlides.length})</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD title="TRACK VISIBILITY" en="Collapse or expand bottom filmstrip track." bn="নিচের ফিল্মস্ট্রিপ ট্র্যাক ছোট বা বড় করুন।" accent="amber">
            <button
              type="button"
              onClick={() => setIsTimelineCollapsed((c) => !c)}
              className="px-1.5 py-1 rounded cinema-tile cinema-tile-amber text-[9px] font-black flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            >
              {isTimelineCollapsed ? <ChevronUp className="w-3 h-3 cinema-tile-icon" /> : <ChevronDown className="w-3 h-3 cinema-tile-icon" />}
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* 3. COLLAPSIBLE COMPACT FILMSTRIP & WAVEFORM TRACK (<=22% Height or Collapsed 28px) */}
      <footer
        className={`relative bg-[#07080B] flex flex-col shrink-0 z-20 transition-all duration-200 ${
          isTimelineCollapsed ? 'h-7 overflow-hidden' : 'h-[128px]'
        }`}
      >
        {isTimelineCollapsed && (
          <div
            onClick={() => setIsTimelineCollapsed(false)}
            className="h-7 px-3 flex items-center justify-between text-[10px] text-zinc-400 hover:text-white cursor-pointer bg-[#090A0F]"
          >
            <span className="font-bold tracking-wider uppercase">
              TRACK · SH{String(safeIndex + 1).padStart(3, '0')}/{activeSlides.length} · {totalDurationSec.toFixed(1)}S
            </span>
            <span className="text-[#F5A623] font-black uppercase">EXPAND ▲</span>
          </div>
        )}

        {/* Optional Collapsible Card Drawer */}
        {isCardDrawerOpen && !isTimelineCollapsed && (
          <div className="fixed inset-x-0 bottom-0 h-[230px] z-50 bg-[#08090C] border-t border-[#F5A623]/50 flex flex-col overflow-hidden shadow-2xl">
            <div className="h-9 px-3 bg-[#0D0E14] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 text-[10px]">
              <div className="flex items-center gap-2">
                <CinemaBadgeHeader label="SHOT CARDS" accent="amber" />
                <div className="relative">
                  <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/70 border border-white/15 pl-6 pr-2 py-0.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#F5A623] w-36"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CinemaToolHUD title="ADD 12S SHOT" en="Append a new 12-second shot card to timeline." bn="টাইমলাইনে নতুন ১২ সেকেন্ডের শট যোগ করুন।" accent="amber">
                  <button
                    type="button"
                    data-active="true"
                    onClick={onAddSlide}
                    className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber font-black text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3 cinema-tile-icon" />
                    <span>+12S SHOT</span>
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="CLOSE DRAWER" en="Collapse shot cards drawer." bn="শট কার্ড ড্রয়ার বন্ধ করুন।" accent="amber">
                  <button
                    type="button"
                    onClick={() => setIsCardDrawerOpen(false)}
                    className="px-2.5 py-1 rounded cinema-tile cinema-tile-amber text-[10px] font-black cursor-pointer"
                  >
                    CLOSE
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            <div className="flex-1 p-2 overflow-x-auto flex flex-row gap-2 items-stretch">
              {filteredSlides.map((slide, idx) => {
                const originalIndex = activeSlides.findIndex((s) => s.id === slide.id);
                const resolvedIndex = originalIndex >= 0 ? originalIndex : idx;
                const isSelected = resolvedIndex === safeIndex;
                const isEditing = editingCardIndex === resolvedIndex;
                const shotNumStr = String(resolvedIndex + 1).padStart(3, '0');
                const cardWin = getClipSourceWindow(slide);

                return (
                  <div
                    key={slide.id || `drawer_${resolvedIndex}`}
                    onClick={() => onSelectSlide(resolvedIndex)}
                    className={`w-56 shrink-0 border p-2 flex flex-col justify-between cursor-pointer ${
                      isSelected ? 'bg-[#171209] border-[#F5A623]' : 'bg-[#0E1016] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={isSelected ? 'text-[#F5A623]' : 'text-zinc-300'}>
                        SH{shotNumStr} · {formatDurationPillValue(cardWin.timelineDurationSec)}
                      </span>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => handleMoveCard(resolvedIndex, 'left')} disabled={resolvedIndex === 0} className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer">
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => handleMoveCard(resolvedIndex, 'right')} disabled={resolvedIndex === activeSlides.length - 1} className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer">
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => onDuplicateSlide(resolvedIndex)} className="p-0.5 text-zinc-400 hover:text-[#F5A623] cursor-pointer">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => onDeleteSlide(resolvedIndex)} disabled={activeSlides.length <= 1} className="p-0.5 text-zinc-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-1 my-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleEn}
                          onChange={(e) => setEditTitleEn(e.target.value)}
                          placeholder="English Title"
                          className="w-full bg-black border border-white/20 px-1.5 py-0.5 text-[10px] text-white"
                        />
                        <input
                          type="text"
                          value={editTitleBn}
                          onChange={(e) => setEditTitleBn(e.target.value)}
                          placeholder="Bangla Title"
                          className="w-full bg-black border border-white/20 px-1.5 py-0.5 text-[10px] text-[#FFE066] font-serif"
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setEditingCardIndex(null)} className="px-1.5 py-0.5 bg-white/10 text-[9px]">CANCEL</button>
                          <button type="button" onClick={(e) => handleSaveEdit(resolvedIndex, e)} className="px-1.5 py-0.5 bg-[#F5A623] text-black font-bold text-[9px]">SAVE</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between gap-1 mt-1">
                        <div className="truncate">
                          {slide.titleBn && <div className="text-[11px] font-serif font-bold text-[#FFE066] truncate">{slide.titleBn}</div>}
                          <div className="text-[10px] font-bold text-white truncate">{slide.titleEn || `Shot ${shotNumStr}`}</div>
                        </div>
                        <button type="button" onClick={(e) => handleStartEdit(resolvedIndex, e)} className="p-1 text-zinc-400 hover:text-white cursor-pointer shrink-0">
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hover-Skim Floating Preview Tooltip (Independent of Playhead) */}
        {hoverSkim && !isTimelineCollapsed && (
          <div
            data-testid="scrub-hover-skim-tooltip"
            style={{ left: `${Math.max(96, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - 96, hoverSkim.clientX))}px` }}
            className="fixed bottom-[134px] -translate-x-1/2 w-44 rounded-lg bg-[#08090D]/95 border border-amber-400/60 shadow-2xl overflow-hidden pointer-events-none z-50"
          >
            <div className="h-20 bg-black relative overflow-hidden">
              {hoverSkim.thumbUrl ? (
                <img src={hoverSkim.thumbUrl} alt={hoverSkim.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500 font-bold">
                  SH{String(hoverSkim.clipIndex + 1).padStart(3, '0')}
                </div>
              )}
              <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/85 text-[#FFE066] text-[9px] font-black tabular-nums">
                {hoverSkim.localTimeSec.toFixed(2)}s · F{hoverSkim.frameNum}
              </span>
              <span className="absolute top-1 right-1 px-1 py-0.2 bg-amber-400 text-black text-[8px] font-black">
                SKIM
              </span>
            </div>
            <div className="px-2 py-1 text-[9px] font-bold text-white truncate">
              {hoverSkim.title}
            </div>
          </div>
        )}

        {/* Unified High-Density Proportional NLE Filmstrip Track */}
        <div
          ref={nleTimelineScrollRef}
          data-testid="scrub-nle-timeline"
          onWheel={handleFilmstripWheel}
          onMouseLeave={() => setHoverSkim(null)}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-[#06070B] relative"
        >
          <div style={{ width: `${totalTrackWidthPx}px` }} className="h-full relative flex flex-col">
            {/* Timecode Tick Ruler */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="h-5 w-full bg-[#0D0E14] border-b border-white/10 relative cursor-ew-resize shrink-0"
            >
              {rulerTicks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                >
                  <span className="text-[9px] text-zinc-400 tabular-nums pl-1 leading-none">
                    {sec.toFixed(0)}s
                  </span>
                  <div className="w-px h-1.5 bg-white/30" />
                </div>
              ))}
            </div>

            {/* Unified Proportional Filmstrip Blocks + Gold Audio Waveform & Transients + `[|` `|]` Trim/Roll Handles */}
            <div className="flex-1 min-h-0 flex flex-row items-stretch py-1 relative">
              {activeSlides.map((slide, idx) => {
                const win = getClipSourceWindow(slide);
                const clipFrames = getShotFrameCount(win.timelineDurationSec, win.fps);
                const widthPx = Math.max(54, Math.round(win.timelineDurationSec * pxPerSec));
                const isActive = idx === safeIndex;
                const vaultEntry = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, idx);
                const thumbUrl = vaultEntry?.url || slide.thumbnailUrl || slide.remoteUrl || '';
                const waveform = generateClipWaveformProfile(slide, idx, 18);

                return (
                  <div
                    key={slide.id || idx}
                    data-shot-id={getShotMediaKey(slide as any, idx)}
                    data-shot-card={idx}
                    data-shot-drop-index={idx}
                    data-testid={`scrub-clip-block-${idx}`}
                    onClick={() => onSelectSlide(idx)}
                    onPointerDown={(e) => handleClipBodyPointerDown(e, idx)}
                    onPointerMove={(e) => {
                      handleClipDragPointerMove(e);
                      if (!activeTrimDragRef.current) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
                        const localT = ratio * win.timelineDurationSec;
                        setHoverSkim({
                          clipIndex: idx,
                          localTimeSec: localT,
                          frameNum: Math.max(1, Math.floor(localT * win.fps) + 1),
                          title: slide.titleEn || `Shot ${idx + 1}`,
                          thumbUrl: (!isVideoSourceUrl(thumbUrl) ? thumbUrl : slide.thumbnailUrl) || '',
                          clientX: e.clientX
                        });
                      }
                    }}
                    onPointerUp={handleClipDragPointerUp}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dropCardIndex !== idx) setDropCardIndex(idx);
                    }}
                    onDragLeave={() => {
                      setDropCardIndex((prev) => (prev === idx ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropCardIndex(null);
                      const file = e.dataTransfer.files?.[0];
                      if (file && onUploadMedia) {
                        onUploadMedia(idx, file);
                      }
                    }}
                    style={{ width: `${widthPx}px` }}
                    className={`relative h-full shrink-0 border-r border-black overflow-hidden group/clip transition-colors ${
                      editToolMode === 'SLIP' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    } ${
                      dropCardIndex === idx
                        ? 'bg-[#0d1f18] border-emerald-400 ring-2 ring-emerald-400/50'
                        : isActive
                          ? 'bg-[#1D160B] ring-2 ring-inset ring-[#F5A623]'
                          : 'bg-[#11131A] hover:bg-[#171B24] border-y border-white/10'
                    }`}
                  >
                    {/* Filmstrip Background Preview */}
                    {thumbUrl && (
                      <div className="absolute inset-0 opacity-35 pointer-events-none overflow-hidden">
                        <ShotMediaThumbnail
                          shotIndex={idx}
                          shotId={slide.id}
                          mediaUrl={thumbUrl}
                          thumbnailUrl={slide.thumbnailUrl}
                          isVideo={vaultEntry ? vaultEntry.type === 'video' : Boolean(slide.isVideo)}
                          mimeType={vaultEntry?.mimeType}
                          disableLiveVideoElement
                          alt={slide.titleEn || `SH${idx + 1}`}
                        />
                      </div>
                    )}

                    {/* Left Edge Trim / Roll Handle `[|` */}
                    <div
                      role="separator"
                      aria-label={`Trim in-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-left-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'left')}
                      onPointerMove={handleClipDragPointerMove}
                      onPointerUp={handleClipDragPointerUp}
                      className={`absolute left-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize flex items-center justify-center ${
                        editToolMode === 'ROLL' && idx > 0
                          ? 'bg-cyan-400'
                          : isActive
                            ? 'bg-[#F5A623]'
                            : 'bg-white/25 hover:bg-[#F5A623] opacity-70 group-hover/clip:opacity-100'
                      }`}
                    >
                      <span className="w-[2px] h-5 bg-black/85" />
                    </div>

                    {/* Clip Label + Gold Audio Waveform & Transient Beat Markers */}
                    <div className="relative z-10 h-full px-3 py-1 flex flex-col justify-between pointer-events-none">
                      <div className="flex items-center justify-between gap-1 text-[9px] tabular-nums">
                        <span className={`font-black px-1 ${isActive ? 'bg-[#F5A623] text-black' : 'bg-black/80 text-zinc-200'}`}>
                          {String(idx + 1).padStart(3, '0')}
                        </span>
                        <span className="px-1 bg-black/80 text-[#F5A623] font-bold">
                          {win.timelineDurationSec.toFixed(1)}s · {clipFrames}F
                        </span>
                      </div>

                      <div className="truncate">
                        <div className="text-[10px] font-bold text-white truncate drop-shadow">
                          {slide.titleBn ? `${slide.titleBn} · ` : ''}
                          {slide.titleEn || `Shot ${idx + 1}`}
                        </div>
                      </div>

                      {/* Gold Audio Waveform + Transient Beat Diamonds */}
                      <div className="relative h-4 w-full flex items-end gap-[2px] opacity-85">
                        {waveform.transientPositions.map((pos, tIdx) => (
                          <span
                            key={`tr_${tIdx}`}
                            style={{ left: `${pos * 100}%` }}
                            className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-cyan-300 shadow-[0_0_4px_#00F0FF]"
                          />
                        ))}
                        {waveform.bars.map((amp, bIdx) => (
                          <span
                            key={bIdx}
                            className={`flex-1 rounded-t-[1px] ${
                              amp >= 0.78
                                ? 'bg-[#FFE066]'
                                : isActive
                                  ? 'bg-[#F5A623]'
                                  : 'bg-amber-400/55'
                            }`}
                            style={{ height: `${Math.round(amp * 100)}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Right Edge Trim / Roll Handle `|]` */}
                    <div
                      role="separator"
                      aria-label={`Trim out-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-right-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'right')}
                      onPointerMove={handleClipDragPointerMove}
                      onPointerUp={handleClipDragPointerUp}
                      className={`absolute right-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize flex items-center justify-center ${
                        editToolMode === 'ROLL' && idx < activeSlides.length - 1
                          ? 'bg-cyan-400'
                          : isActive
                            ? 'bg-[#F5A623]'
                            : 'bg-white/25 hover:bg-[#F5A623] opacity-70 group-hover/clip:opacity-100'
                      }`}
                    >
                      <span className="w-[2px] h-5 bg-black/85" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Magnetic Red Snapping Playhead Needle across Master Track */}
            <div
              data-testid="scrub-master-playhead"
              style={{ left: `${masterNeedleLeftPx}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-[#E50914] pointer-events-none z-30"
            >
              <div className="w-2.5 h-2.5 bg-[#E50914] -ml-[4px] rotate-45 -mt-1 border border-white/70" />
              <div className="absolute top-1 left-2 px-1.5 py-0.5 bg-[#E50914] text-white font-black text-[9px] whitespace-nowrap tabular-nums">
                {globalCurrentSec.toFixed(2)}s · F{String(currentFrameNum).padStart(3, '0')}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
