/**
 * @file /src/components/scrub/ScrubPanel.tsx
 * @description Brutalist CapCut-Grade Real-Time NLE Cutting, Trimming & Precision Canvas Scrubber.
 *
 * Architecture:
 * 1. HERO SCRUB VIEWPORT (Top ~64%):
 *    - Maximized aspect-ratio-locked active video/image preview with seamless readyState<2 poster fallback.
 *    - Live SMPTE timecode HUD, frame counter (`F001/total`), In/Out range bar, and direct
 *      hover/drag scrub-by-mouse across the preview canvas with magnetic hairline needle.
 * 2. COMPACT PRECISION RAZOR BAR (Middle ~8%):
 *    - Single-row floating Brutalist toolbar: `SPLIT [S]`, `TRIM IN [Q]`, `TRIM OUT [W]`,
 *      `RIPPLE DEL`, `SLIP -/+`, `-1F`/`+1F` frame-steppers, `CLIP SPEED` (`0.5x`–`2x`), and `SPEED RAMP`.
 * 3. UNIFIED FILMSTRIP & COLLAPSIBLE SHOT DRAWER (Bottom ~28%):
 *    - Single high-density horizontal filmstrip track with waveform bars, `[|` `|]` trim handles,
 *      wheel-zoom & scrub, drag-drop ingest (`data-shot-card`), plus collapsible `CARDS / EDIT` drawer.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { SpeedRampPreset } from '../../types/anthology';
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
  slipClipWindow
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
  Zap
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isMagneticSnap, setIsMagneticSnap] = useState(true);
  const [isHoverScrubEnabled, setIsHoverScrubEnabled] = useState(true);
  const [dropCardIndex, setDropCardIndex] = useState<number | null>(null);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.2);
  const [nleFeedback, setNleFeedback] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [canvasHoverPct, setCanvasHoverPct] = useState<number | null>(null);

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);

  // Optimistic NLE preview state while dragging edge trim handles `[|` or `|]`
  const [trimPreviewSlides, setTrimPreviewSlides] = useState<SlideDraft[] | null>(null);
  const activeTrimDragRef = useRef<{
    clipIndex: number;
    edge: 'left' | 'right';
    startClientX: number;
    baseSlides: SlideDraft[];
    latestSlides: SlideDraft[];
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
  const heroViewportRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCanvasScrubRef = useRef(false);
  const nleTimelineScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingMasterNeedleRef = useRef(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIdx, setUploadTargetIdx] = useState<number | null>(null);

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

  const lastMonitorEntryKeyRef = useRef<string>('');

  // Synchronize Hero Monitor <video>: obeys speed ramp + inPointMs + playbackSpeed cleanly
  useEffect(() => {
    const vid = monitorVideoRef.current;
    if (!vid || !isMonitorVideo || !monitorMediaUrl) return;
    const rampMult = getSpeedRampInstantRate(currentSlide?.speedRampPreset, slideTimeSec, activeSlideDurationSec);
    const effectiveRate = Math.max(0.25, Math.min(4.0, currentWindow.speed * (playbackSpeed || 1.0) * rampMult));
    if (Math.abs(vid.playbackRate - effectiveRate) > 0.02) {
      vid.playbackRate = effectiveRate;
    }

    const entryKey = `${currentSlide?.id || safeIndex}:${monitorMediaUrl}:${currentWindow.inSec.toFixed(3)}`;
    const isInitialEntry = lastMonitorEntryKeyRef.current !== entryKey;
    const targetSourceSec = evaluateSpeedRampSourceTime(currentSlide, slideTimeSec);

    if (!isPlaying || activeTrimDragRef.current || isDraggingMasterNeedleRef.current || isDraggingCanvasScrubRef.current) {
      if (!vid.paused) vid.pause();
      lastMonitorEntryKeyRef.current = entryKey;
      if (vid.readyState >= 1) {
        syncVideoCurrentTimeWithFastSeek(vid, targetSourceSec, 0.002);
      }
    } else {
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
    playbackSpeed,
    currentWindow.speed,
    currentWindow.inSec,
    activeSlideDurationSec,
    currentSlide,
    safeIndex
  ]);

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
      onUpdateSlide(safeIndex, { speedRampPreset: preset });
      showToastFeedback(`VELOCITY CURVE: ${preset.replace('_', ' ')}`);
    },
    [safeIndex, onUpdateSlide, showToastFeedback]
  );

  // Scoped CapCut NLE Keyboard Hotkeys (`S` / `Ctrl+B`, `Q`, `W`, `Delete/Backspace`)
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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleRippleDelete();
      }
    };

    window.addEventListener('keydown', handleNleKeyDown, true);
    return () => window.removeEventListener('keydown', handleNleKeyDown, true);
  }, [handleSplitAtPlayhead, handleTrimStartQ, handleTrimEndW, handleRippleDelete]);

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

  // Direct Canvas Hover / Drag Scrubbing
  const scrubHeroCanvasFromPointer = useCallback(
    (clientX: number, commitSeek: boolean) => {
      const el = heroViewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setCanvasHoverPct(ratio * 100);
      if (commitSeek) {
        const targetLocalSec = ratio * activeSlideDurationSec;
        onScrubSlideTime(targetLocalSec);
        if (monitorVideoRef.current && isMonitorVideo && monitorVideoRef.current.readyState >= 1) {
          syncVideoCurrentTimeWithFastSeek(
            monitorVideoRef.current,
            evaluateSpeedRampSourceTime(currentSlide, targetLocalSec),
            0.002
          );
        }
      }
    },
    [activeSlideDurationSec, onScrubSlideTime, isMonitorVideo, currentSlide]
  );

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select')) return;
    isDraggingCanvasScrubRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubHeroCanvasFromPointer(e.clientX, true);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const shouldScrub = isDraggingCanvasScrubRef.current || (isHoverScrubEnabled && !isPlaying);
    scrubHeroCanvasFromPointer(e.clientX, shouldScrub);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCanvasScrubRef.current) {
      isDraggingCanvasScrubRef.current = false;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const handleCanvasPointerLeave = () => {
    setCanvasHoverPct(null);
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
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  // Smooth mouse-wheel zoom (`Ctrl`/`Meta`/vertical) or timeline horizontal scrub across filmstrip
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

  // Real-Time Edge Drag Trim Handles (`[|` left `inPoint` and `|]` right `outPoint`)
  const handleTrimHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clipIndex: number,
    edge: 'left' | 'right'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelectSlide(clipIndex);

    activeTrimDragRef.current = {
      clipIndex,
      edge,
      startClientX: e.clientX,
      baseSlides: slides,
      latestSlides: slides
    };
  };

  const handleTrimHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = activeTrimDragRef.current;
    if (!drag) return;
    e.stopPropagation();

    const deltaPx = e.clientX - drag.startClientX;
    const deltaSec = deltaPx / pxPerSec;
    const res = trimClipEdge(drag.baseSlides, drag.clipIndex, drag.edge, deltaSec, isMagneticSnap);
    drag.latestSlides = res.slides;
    setTrimPreviewSlides(res.slides);

    const vid = monitorVideoRef.current;
    if (vid && isMonitorVideo && vid.readyState >= 1) {
      syncVideoCurrentTimeWithFastSeek(vid, res.scrubPreviewSourceSec, 0.002);
    }

    const updatedWin = getClipSourceWindow(res.slides[drag.clipIndex]);
    onScrubSlideTime(drag.edge === 'left' ? 0 : Math.max(0, updatedWin.timelineDurationSec - 1 / updatedWin.fps));
  };

  const handleTrimHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = activeTrimDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}

    const finalSlides = drag.latestSlides;
    const finalWin = getClipSourceWindow(finalSlides[drag.clipIndex]);
    const finalLocalSec =
      drag.edge === 'left' ? 0 : Math.max(0, finalWin.timelineDurationSec - 1 / finalWin.fps);

    activeTrimDragRef.current = null;
    setTrimPreviewSlides(null);

    commitNleResult(
      finalSlides,
      drag.clipIndex,
      finalLocalSec,
      `${drag.edge === 'left' ? 'IN' : 'OUT'} TRIMMED (${finalWin.timelineDurationSec.toFixed(2)}S)`
    );
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

  const viewportAspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16] h-full max-w-full'
      : aspectRatio === '16:9'
        ? 'aspect-video max-h-full max-w-full w-auto h-full'
        : 'aspect-[2.39/1] max-h-full max-w-full w-full';

  return (
    <div className={`w-full h-full bg-[#050505] text-zinc-200 flex flex-col overflow-hidden select-none font-mono ${className}`}>
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. HERO SCRUB VIEWPORT (Top ~64% Height) */}
      <section className="relative flex-[1_1_64%] min-h-[260px] w-full bg-[#050505] flex flex-col overflow-hidden">
        {/* Top Compact Brutalist Telemetry Strip */}
        <div className="h-9 px-3 bg-[#08090C] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 text-[10px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 bg-[#F5A623] text-black font-black tracking-wider shrink-0">
              SCRUB
            </span>
            <span className="font-bold text-white shrink-0 tabular-nums">
              SH{String(safeIndex + 1).padStart(3, '0')}/{activeSlides.length}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-300 truncate max-w-[240px] sm:max-w-[380px]">
              {currentSlide?.titleBn ? `${currentSlide.titleBn} · ` : ''}
              {currentSlide?.titleEn || `Shot ${String(safeIndex + 1).padStart(3, '0')}`}
            </span>
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
            <button
              type="button"
              onClick={() => setIsHoverScrubEnabled((h) => !h)}
              className={`px-2 py-0.5 border text-[10px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                isHoverScrubEnabled
                  ? 'bg-amber-500/20 border-[#F5A623]/60 text-[#F5A623]'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Hover-to-Scrub directly over the video canvas"
            >
              HOVER SCRUB {isHoverScrubEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setIsMagneticSnap((m) => !m)}
              className={`px-2 py-0.5 border text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                isMagneticSnap
                  ? 'bg-white/10 border-[#F5A623]/50 text-[#F5A623]'
                  : 'bg-white/5 border-white/10 text-zinc-500'
              }`}
              title="Magnetic 1-Frame Snapping"
            >
              <Magnet className="w-3 h-3" />
              <span>SNAP 1F</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPlaybackMode(playbackMode === 'sequence' ? 'solo' : 'sequence')}
              className={`px-2 py-0.5 border text-[10px] font-bold cursor-pointer whitespace-nowrap ${
                playbackMode === 'sequence'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/50 border-amber-500/40 text-[#F5A623]'
              }`}
            >
              {playbackMode === 'sequence' ? 'SEQ' : 'SOLO'}
            </button>
          </div>
        </div>

        {/* Interactive Maximized Canvas Stage (Direct Hover/Drag Scrub-By-Mouse) */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-3 overflow-hidden bg-[#050505]">
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
                    className="w-full h-full object-cover pointer-events-none z-[2]"
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={() => setIsVideoReady(true)}
                    onCanPlay={() => setIsVideoReady(true)}
                    style={{
                      opacity: isVideoReady || !fallbackPosterUrl ? 1 : 0,
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
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
                <span className="text-[11px] tracking-widest uppercase">NO MEDIA BOUND TO SHOT {String(safeIndex + 1).padStart(3, '0')}</span>
                <button
                  type="button"
                  onClick={(e) => handleTriggerUpload(safeIndex, e)}
                  className="px-3 py-1 bg-[#F5A623] text-black text-[11px] font-black cursor-pointer"
                >
                  + INGEST CLIP
                </button>
              </div>
            )}

            {/* Beat-Drop 2F Flash / Chromatic Pulse Preview */}
            {beatFx.isFlashCutFrame && (
              <div className="absolute inset-0 bg-[#050505] pointer-events-none z-[15]" />
            )}

            {/* Top-Left Live SMPTE & Frame Counter HUD */}
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/85 border border-white/15 text-[10px] font-bold text-[#F5A623] pointer-events-none z-20 tabular-nums">
              F{String(currentFrameNum).padStart(3, '0')}/{activeSlideTotalFrames} · {formatSMPTE(slideTimeSec)} · SRC {evaluateSpeedRampSourceTime(currentSlide, slideTimeSec).toFixed(2)}s
            </div>

            {/* Top-Right Upload Replace Action */}
            <button
              type="button"
              onClick={(e) => handleTriggerUpload(safeIndex, e)}
              className="absolute top-2 right-2 px-2 py-0.5 bg-black/85 border border-white/20 text-[10px] text-zinc-200 hover:text-[#F5A623] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
            >
              <Upload className="w-3 h-3" />
              <span>REPLACE</span>
            </button>

            {/* Title Overlay Preview at Bottom of Hero Stage */}
            <div className="absolute inset-x-0 bottom-3 px-3 pointer-events-none z-20 flex items-end justify-between">
              <div className="bg-black/75 border border-white/10 px-2.5 py-1 max-w-[70%]">
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
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/80 pointer-events-none z-20">
              <div
                className="h-full bg-[#E50914]"
                style={{ width: `${localProgressPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPACT PRECISION RAZOR BAR (Middle ~8% Height) */}
      <div className="min-h-[44px] px-3 py-1 bg-[#0B0C10] border-y border-white/15 flex flex-wrap items-center justify-between gap-1.5 shrink-0 z-30">
        {/* Cutting Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="scrub-split-btn"
            onClick={handleSplitAtPlayhead}
            className="px-2.5 py-1 bg-[#F5A623] hover:bg-amber-400 text-black text-[10px] font-black tracking-wider flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Razor Split at Playhead (S / Ctrl+B)"
          >
            <Scissors className="w-3 h-3" />
            <span>SPLIT [S]</span>
          </button>

          <button
            type="button"
            data-testid="scrub-trim-q-btn"
            onClick={handleTrimStartQ}
            className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-[#F5A623] text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Trim Start to Playhead (Q)"
          >
            <ArrowLeftToLine className="w-3 h-3 text-[#F5A623]" />
            <span>TRIM IN [Q]</span>
          </button>

          <button
            type="button"
            data-testid="scrub-trim-w-btn"
            onClick={handleTrimEndW}
            className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-[#F5A623] text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            title="Trim End to Playhead (W)"
          >
            <span>TRIM OUT [W]</span>
            <ArrowRightToLine className="w-3 h-3 text-[#F5A623]" />
          </button>

          <button
            type="button"
            data-testid="scrub-ripple-delete-btn"
            onClick={handleRippleDelete}
            disabled={slides.length <= 1}
            className="px-2 py-1 bg-[#E50914]/15 hover:bg-[#E50914]/35 border border-[#E50914]/45 text-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-35 whitespace-nowrap"
            title="Ripple Delete Active Shot (Del)"
          >
            <Trash2 className="w-3 h-3" />
            <span>RIPPLE DEL</span>
          </button>

          {/* Slip / Slide In-Out Source Window */}
          <div className="hidden sm:flex items-center bg-black/60 border border-white/10 ml-1">
            <span className="px-1.5 text-[9px] text-zinc-400 flex items-center gap-0.5">
              <MoveHorizontal className="w-2.5 h-2.5 text-cyan-400" />
              SLIP
            </span>
            <button
              type="button"
              onClick={() => handleSlipFrames(-4)}
              className="px-1.5 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Slip Source Window -4 Frames"
            >
              -4F
            </button>
            <button
              type="button"
              onClick={() => handleSlipFrames(4)}
              className="px-1.5 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Slip Source Window +4 Frames"
            >
              +4F
            </button>
          </div>
        </div>

        {/* Center Frame-Steppers & Transport */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onScrubSlideTime(0)}
            className="p-1 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 cursor-pointer"
            title="Jump to Start of Shot"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-[#F5A623] cursor-pointer whitespace-nowrap"
            title="Step Back 1 Frame"
          >
            -1F
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-3 py-1 font-black text-[10px] flex items-center gap-1 border cursor-pointer whitespace-nowrap ${
              isPlaying
                ? 'bg-[#E50914] border-[#E50914] text-white'
                : 'bg-[#1a1308] border-[#F5A623] text-[#F5A623]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-[#F5A623] cursor-pointer whitespace-nowrap"
            title="Step Forward 1 Frame"
          >
            +1F
          </button>
          <button
            type="button"
            onClick={() => onScrubSlideTime(activeSlideDurationSec)}
            className="p-1 bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 cursor-pointer"
            title="Jump to End of Shot"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

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

        {/* Right: Speed Multipliers, Velocity Speed-Ramp, Zoom & Collapsible Cards Drawer Toggle */}
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="flex items-center gap-0.5 bg-black/60 border border-white/10 px-1 py-0.5">
            <Gauge className="w-3 h-3 text-cyan-400 mr-0.5" />
            {SCRUB_SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  handleClipSpeedChange(spd);
                  onChangePlaybackSpeed?.(spd);
                }}
                className={`px-1.5 py-0.5 font-bold cursor-pointer whitespace-nowrap ${
                  Math.abs(currentWindow.speed - spd) < 0.05
                    ? 'bg-cyan-400 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-black/60 border border-white/10 px-1.5 py-0.5">
            <Zap className="w-3 h-3 text-[#F5A623]" />
            <select
              value={currentSlide?.speedRampPreset || 'NONE'}
              onChange={(e) => handleSpeedRampChange(e.target.value as SpeedRampPreset)}
              className="bg-transparent text-[10px] font-bold text-[#F5A623] outline-none cursor-pointer"
              title="Velocity Speed-Ramp Curve"
            >
              {SPEED_RAMP_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0B0C10] text-white">
                  RAMP: {p.shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-0.5 bg-black/60 border border-white/10 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setTimelineZoom((z) => Math.max(0.5, Number((z - 0.5).toFixed(1))))}
              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
              title="Zoom Out Filmstrip"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-zinc-300 font-bold tabular-nums w-7 text-center">{timelineZoom.toFixed(1)}x</span>
            <button
              type="button"
              onClick={() => setTimelineZoom((z) => Math.min(4.0, Number((z + 0.5).toFixed(1))))}
              className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
              title="Zoom In Filmstrip"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCardDrawerOpen((o) => !o)}
            className={`px-2 py-1 border text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              isCardDrawerOpen
                ? 'bg-[#F5A623] border-[#F5A623] text-black'
                : 'bg-white/5 border-white/15 text-zinc-200 hover:border-white/30'
            }`}
            title="Toggle Collapsible Shot Cards & Metadata Drawer"
          >
            {isCardDrawerOpen ? <PanelBottomClose className="w-3 h-3" /> : <PanelBottomOpen className="w-3 h-3" />}
            <span>CARDS ({activeSlides.length})</span>
          </button>
        </div>
      </div>

      {/* 3. UNIFIED FILMSTRIP & SHOT SELECTOR (Bottom ~28% Height + Collapsible Card Drawer) */}
      <footer className="relative flex-[0_0_28%] min-h-[155px] max-h-[245px] bg-[#07080B] flex flex-col shrink-0 z-20">
        {/* Optional Collapsible Card Drawer */}
        {isCardDrawerOpen && (
          <div className="absolute inset-0 z-40 bg-[#08090C] border-t border-[#F5A623]/40 flex flex-col overflow-hidden">
            <div className="h-8 px-3 bg-[#0D0E14] border-b border-white/10 flex items-center justify-between gap-2 shrink-0 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="text-[#F5A623] font-black tracking-wider">SHOT CARDS DRAWER</span>
                <div className="relative">
                  <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter shots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/70 border border-white/15 pl-6 pr-2 py-0.5 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#F5A623] w-40"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onAddSlide}
                  className="px-2 py-0.5 bg-[#F5A623] text-black font-black text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                  <span>ADD 12S SHOT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCardDrawerOpen(false)}
                  className="px-2 py-0.5 bg-white/10 text-zinc-200 hover:text-white text-[10px] font-bold cursor-pointer"
                >
                  COLLAPSE
                </button>
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

        {/* Unified High-Density Proportional NLE Filmstrip Track */}
        <div
          ref={nleTimelineScrollRef}
          data-testid="scrub-nle-timeline"
          onWheel={handleFilmstripWheel}
          className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-[#06070B] relative"
        >
          <div style={{ width: `${totalTrackWidthPx}px` }} className="h-full relative flex flex-col">
            {/* Timecode Tick Ruler */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="h-6 w-full bg-[#0D0E14] border-b border-white/10 relative cursor-ew-resize shrink-0"
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
                  <div className="w-px h-2 bg-white/30" />
                </div>
              ))}
            </div>

            {/* Unified Proportional Filmstrip Blocks + Waveform Strip + `[|` `|]` Trim Handles */}
            <div className="flex-1 min-h-0 flex flex-row items-stretch py-1.5 relative">
              {activeSlides.map((slide, idx) => {
                const win = getClipSourceWindow(slide);
                const clipFrames = getShotFrameCount(win.timelineDurationSec, win.fps);
                const widthPx = Math.max(54, Math.round(win.timelineDurationSec * pxPerSec));
                const isActive = idx === safeIndex;
                const vaultEntry = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, idx);
                const thumbUrl = vaultEntry?.url || slide.thumbnailUrl || slide.remoteUrl || '';

                return (
                  <div
                    key={slide.id || idx}
                    data-shot-id={getShotMediaKey(slide as any, idx)}
                    data-shot-card={idx}
                    data-shot-drop-index={idx}
                    data-testid={`scrub-clip-block-${idx}`}
                    onClick={() => onSelectSlide(idx)}
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
                    className={`relative h-full shrink-0 border-r border-black overflow-hidden cursor-pointer group/clip transition-colors ${
                      dropCardIndex === idx
                        ? 'bg-[#0d1f18] border-emerald-400 ring-2 ring-emerald-400/50'
                        : isActive
                          ? 'bg-[#1D160B] ring-2 ring-inset ring-[#F5A623]'
                          : 'bg-[#11131A] hover:bg-[#171B24] border-y border-white/10'
                    }`}
                  >
                    {/* Filmstrip Background Preview */}
                    {thumbUrl && (
                      <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
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

                    {/* Left Edge Trim Handle `[|` */}
                    <div
                      role="separator"
                      aria-label={`Trim in-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-left-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'left')}
                      onPointerMove={handleTrimHandlePointerMove}
                      onPointerUp={handleTrimHandlePointerUp}
                      className={`absolute left-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize flex items-center justify-center ${
                        isActive ? 'bg-[#F5A623]' : 'bg-white/25 hover:bg-[#F5A623] opacity-70 group-hover/clip:opacity-100'
                      }`}
                    >
                      <span className="w-[2px] h-5 bg-black/85" />
                    </div>

                    {/* Clip Label + Waveform Energy Bars */}
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

                      {/* Tactile Waveform / Beat Cut Profile Strip */}
                      <div className="h-3.5 w-full flex items-end gap-[2px] opacity-75">
                        {Array.from({ length: 12 }, (_, bIdx) => {
                          const hPct = 25 + (((idx * 17 + bIdx * 31) % 75));
                          return (
                            <span
                              key={bIdx}
                              className={`flex-1 ${isActive ? 'bg-[#F5A623]' : 'bg-zinc-400/50'}`}
                              style={{ height: `${hPct}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Edge Trim Handle `|]` */}
                    <div
                      role="separator"
                      aria-label={`Trim out-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-right-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'right')}
                      onPointerMove={handleTrimHandlePointerMove}
                      onPointerUp={handleTrimHandlePointerUp}
                      className={`absolute right-0 top-0 bottom-0 w-2 z-20 cursor-ew-resize flex items-center justify-center ${
                        isActive ? 'bg-[#F5A623]' : 'bg-white/25 hover:bg-[#F5A623] opacity-70 group-hover/clip:opacity-100'
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
