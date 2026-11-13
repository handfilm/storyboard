/**
 * @file /src/components/scrub/ScrubPanel.tsx
 * @description CapCut-Grade Real-Time NLE Cutting, Trimming & Sub-Frame Precision Scrubber.
 *
 * Capabilities:
 * 1. Real-Time Multi-Clip Proportional NLE Timeline:
 *    - Proportional draggable clip blocks with filmstrip thumbnails, Bangla/English titles,
 *      live duration (`1.5s / 36F`), and speed badges (`0.5x`, `1.0x`, `1.5x`, `2.0x`).
 *    - Razor Split at Playhead (`✂ SPLIT` / `S` / `Ctrl+B`) -> Part A & Part B sub-clips.
 *    - Thick Amber/White Edge Drag Trim Handles (`[|` left `inPoint`, `|]` right `outPoint`)
 *      with real-time ripple auto-close (zero gaps) and live `<video>` frame scrubbing.
 *    - CapCut Ripple Hotkeys: `Q` (Trim Start), `W` (Trim End), `Delete/Backspace` (Ripple Delete).
 *    - Magnetic red playhead needle (`SNAP 1F`) synced with Stage & Monitor `<video>` via fastSeek.
 * 2. Active Frame Cinema Monitor:
 *    - Synchronized `<video>` preview honoring `inPointMs`, `outPointMs`, and `playbackSpeed`.
 * 3. Card Management Interface (Filmstrip & Grid Matrix):
 *    - Preserved sequence ordering, inline bilingual editing, search filter, and drag-and-drop ingest.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode } from '../../types/editor';
import {
  calculateMasterSequenceDuration,
  formatDurationPillValue,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../../types/storyboard';
import {
  MIN_NLE_CLIP_DURATION_SEC,
  SCRUB_SPEED_OPTIONS,
  getClipSourceWindow,
  getClipSourceMediaTimeSec,
  splitClipAtTime,
  trimClipEdge,
  trimStartToPlayheadQ,
  trimEndToPlayheadW,
  rippleDeleteClip,
  applyClipSpeed
} from '../../utils/scrubNleMath';
import { syncVideoCurrentTimeWithFastSeek } from '../../utils/playbackClock';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { audioEngine } from '../../utils/audioEngine';
import { useStudioStore } from '../../core/store';
import { resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { ShotMediaThumbnail } from '../ShotMediaThumbnail';
import { isVideoSourceUrl } from '../../services/thumbnailEngine';
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
  Camera,
  Video,
  Music,
  RefreshCw,
  Scissors,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ArrowLeftToLine,
  ArrowRightToLine,
  Gauge,
  ZoomIn,
  ZoomOut
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
  // Navigation & Card View State
  const [viewMode, setViewMode] = useState<'SPLIT' | 'CARDS_EXPANDED'>('SPLIT');
  const [cardLayout, setCardLayout] = useState<'FILMSTRIP' | 'GRID'>('FILMSTRIP');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMagneticSnap, setIsMagneticSnap] = useState(true);
  const [dropCardIndex, setDropCardIndex] = useState<number | null>(null);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [nleFeedback, setNleFeedback] = useState<string | null>(null);
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

  // In-line Edit State
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSoundCue, setEditSoundCue] = useState('');

  // DOM Refs
  const monitorVideoRef = useRef<HTMLVideoElement | null>(null);
  const nleTimelineScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingMasterNeedleRef = useRef(false);
  const filmstripScrollRef = useRef<HTMLDivElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIdx, setUploadTargetIdx] = useState<number | null>(null);

  // Resolve current slide media for live NLE Monitor
  const currentVaultEntry = useMemo(
    () => resolveShotMediaEntry(shotMediaMap, currentSlide as any, undefined, safeIndex),
    [shotMediaMap, currentSlide, safeIndex]
  );
  const monitorMediaUrl = currentVaultEntry?.url || currentSlide?.remoteUrl || '';
  const isMonitorVideo = currentVaultEntry
    ? currentVaultEntry.type === 'video'
    : isVideoSourceUrl(monitorMediaUrl, { isVideo: Boolean(currentSlide?.isVideo) });

  const showToastFeedback = useCallback((msg: string) => {
    setNleFeedback(msg);
    window.setTimeout(() => {
      setNleFeedback((prev) => (prev === msg ? null : prev));
    }, 1800);
  }, []);

  // Commit NLE Edit helper (routes to App-level atomic committer or safe fallbacks)
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

  // Synchronize Monitor <video>: seek when paused/scrubbing or ONCE on initial clip entry (never mid-play)
  useEffect(() => {
    const vid = monitorVideoRef.current;
    if (!vid || !isMonitorVideo || !monitorMediaUrl) return;
    const effectiveRate = Math.max(0.25, Math.min(4.0, currentWindow.speed * (playbackSpeed || 1.0)));
    if (Math.abs(vid.playbackRate - effectiveRate) > 0.01) {
      vid.playbackRate = effectiveRate;
    }

    const entryKey = `${currentSlide?.id || safeIndex}:${monitorMediaUrl}:${currentWindow.inSec.toFixed(3)}`;
    const isInitialEntry = lastMonitorEntryKeyRef.current !== entryKey;
    const targetSourceSec = getClipSourceMediaTimeSec(currentSlide, slideTimeSec);

    if (!isPlaying || activeTrimDragRef.current || isDraggingMasterNeedleRef.current) {
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
    currentSlide,
    safeIndex
  ]);

  // Auto-scroll active card into view in filmstrip mode
  useEffect(() => {
    if (filmstripScrollRef.current && cardLayout === 'FILMSTRIP') {
      const cardEl = filmstripScrollRef.current.querySelector(`[data-shot-card="${safeIndex}"]`) as HTMLElement;
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex, cardLayout]);

  // NLE Edit Actions
  const handleSplitAtPlayhead = useCallback(() => {
    const res = splitClipAtTime(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback(`MIN ${(MIN_NLE_CLIP_DURATION_SEC * 2).toFixed(1)}S NEEDED TO SPLIT`);
      return;
    }
    try {
      audioEngine.playShutterClick();
    } catch {}
    commitNleResult(
      res.slides,
      res.activeIndex,
      res.localTimeSec,
      `SPLIT SH${String(safeIndex + 1).padStart(3, '0')} -> PART A + PART B`
    );
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleTrimStartQ = useCallback(() => {
    const res = trimStartToPlayheadQ(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback('PLAYHEAD TOO CLOSE TO CLIP IN/OUT');
      return;
    }
    try {
      audioEngine.playShutterClick();
    } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'TRIM START [Q] · RIPPLE CLOSED');
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleTrimEndW = useCallback(() => {
    const res = trimEndToPlayheadW(slides, safeIndex, slideTimeSec, isMagneticSnap);
    if (!res.changed) {
      showToastFeedback('PLAYHEAD TOO CLOSE TO CLIP END');
      return;
    }
    try {
      audioEngine.playShutterClick();
    } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'TRIM END [W] · RIPPLE CLOSED');
  }, [slides, safeIndex, slideTimeSec, isMagneticSnap, commitNleResult, showToastFeedback]);

  const handleRippleDelete = useCallback(() => {
    const res = rippleDeleteClip(slides, safeIndex);
    if (!res.changed) {
      showToastFeedback('CANNOT DELETE LAST REMAINING CLIP');
      return;
    }
    try {
      audioEngine.playShutterClick();
    } catch {}
    commitNleResult(res.slides, res.activeIndex, res.localTimeSec, 'RIPPLE DELETED · ZERO GAPS');
  }, [slides, safeIndex, commitNleResult, showToastFeedback]);

  const handleClipSpeedChange = useCallback(
    (speed: number) => {
      const res = applyClipSpeed(slides, safeIndex, speed);
      if (!res.changed) return;
      commitNleResult(res.slides, res.activeIndex, res.localTimeSec, `CLIP SPEED ${speed.toFixed(1)}x`);
    },
    [slides, safeIndex, commitNleResult, showToastFeedback]
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

  // Format Timecode to SMPTE HH:MM:SS:FF
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
    const base = 36 * timelineZoom;
    return Math.max(12, Math.min(180, base));
  }, [timelineZoom]);

  const totalTrackWidthPx = Math.max(640, Math.round(totalDurationSec * pxPerSec));

  // Scrubbing across the Master Multi-Clip NLE Ruler / Track
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
        // Fallback resolution against shotOffsets
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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
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

    // Live <video> scrub under cursor while trimming
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
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

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

  // Fine Jog-Wheel Nudge
  const handleJogNudge = (deltaFrames: number) => {
    const frameDuration = 1 / activeSlideFps;
    const nextTime = Math.max(0, Math.min(activeSlideDurationSec, slideTimeSec + deltaFrames * frameDuration));
    onScrubSlideTime(nextTime);
    try {
      audioEngine.playShutterClick();
    } catch {}
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

  // In-line Edit Handlers
  const handleStartEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = slides[idx];
    if (!target) return;
    setEditingCardIndex(idx);
    setEditTitleEn(target.titleEn || '');
    setEditTitleBn(target.titleBn || '');
    setEditNotes(target.directorNotes || '');
    setEditSoundCue(target.soundCue || '');
  };

  const handleSaveEdit = (idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateSlide(idx, {
      titleEn: editTitleEn.trim(),
      titleBn: editTitleBn.trim(),
      directorNotes: editNotes.trim(),
      soundCue: editSoundCue.trim()
    });
    setEditingCardIndex(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCardIndex(null);
  };

  // Trigger File Upload for specific slide
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

  // Quick AI Direct Actions
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const handleQuickAnimateOmni = async () => {
    if (!currentSlide.remoteUrl) return;
    setIsAiGenerating(true);
    setAiMessage('Omni Flash: Animating video...');
    try {
      const res = await fetch('/api/ai/video/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: currentSlide.remoteUrl,
          motionPrompt: 'Cinematic forward camera motion with atmospheric depth dynamics',
          aspectRatio: '16:9'
        })
      });
      const data = await res.json();
      if (data.success && data.videoUrl) {
        onUpdateSlide(safeIndex, {
          remoteUrl: data.videoUrl,
          isVideo: true
        });
        setAiMessage('Video animated & auto-assigned!');
      } else {
        setAiMessage(data.error || 'Animation failed');
      }
    } catch {
      setAiMessage('Animation request failed');
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  const handleQuickScoreLyria = async () => {
    setIsAiGenerating(true);
    setAiMessage('Lyria 3: Synthesizing 12s cue...');
    try {
      const res = await fetch('/api/ai/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Cinematic 12s background score for shot ${safeIndex + 1}: ${currentSlide.titleEn || 'Theatrical Scene'}`,
          durationSec: 12.0
        })
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        onUpdateSlide(safeIndex, {
          soundCue: `Lyria 12s Score — ${currentSlide.titleEn || 'Thematic Cue'}`
        });
        const audio = new Audio(data.audioUrl);
        audio.play().catch(() => {});
        setAiMessage('12s Score generated & assigned!');
      } else {
        setAiMessage(data.error || 'Score generation failed');
      }
    } catch {
      setAiMessage('Score request failed');
    } finally {
      setIsAiGenerating(false);
      setTimeout(() => setAiMessage(null), 3000);
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

  // Ruler Second Marks for Proportional NLE Track
  const rulerTicks = useMemo(() => {
    const stepSec = timelineZoom >= 2.0 ? 1 : timelineZoom >= 1.0 ? 2 : 5;
    const ticks: number[] = [];
    for (let s = 0; s <= totalDurationSec + 0.01; s += stepSec) {
      ticks.push(s);
    }
    return ticks;
  }, [totalDurationSec, timelineZoom]);

  const masterNeedleLeftPx = Math.max(0, Math.min(totalTrackWidthPx, globalCurrentSec * pxPerSec));

  return (
    <div className={`w-full h-full bg-[#08090C] text-slate-200 flex flex-col overflow-hidden select-none font-mono ${className}`}>
      <input
        ref={fileUploadInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. Master Header Strip */}
      <header className="h-12 sm:h-14 px-4 bg-[#0B0C10] border-b border-white/10 flex items-center justify-between shrink-0 gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-amber-500/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-white uppercase">SCRUB NLE CUTTER</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] tabular-nums">
                SH{String(safeIndex + 1).padStart(3, '0')} / {activeSlides.length}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[260px] sm:max-w-[380px]">
              {currentSlide?.titleBn ? `${currentSlide.titleBn} · ` : ''}{currentSlide?.titleEn || 'Untitled Sequence'}
            </div>
          </div>
        </div>

        {/* Center: SMPTE Timecode & In/Out Readouts */}
        <div className="hidden lg:flex items-center gap-2 text-xs tabular-nums">
          <div className="bg-black/70 border border-white/10 px-2.5 py-1 flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">CLIP:</span>
            <span className="font-bold text-[#F5A623]">{formatSMPTE(slideTimeSec)}</span>
            <span className="text-slate-500 text-[10px]">/ {formatDurationPillValue(activeSlideDurationSec)}</span>
          </div>

          <div className="bg-black/70 border border-white/10 px-2.5 py-1 flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">IN–OUT:</span>
            <span className="font-bold text-cyan-300">
              {currentWindow.inSec.toFixed(2)}s–{currentWindow.outSec.toFixed(2)}s
            </span>
          </div>

          <div className="bg-black/70 border border-white/10 px-2.5 py-1 flex items-center gap-2">
            <span className="text-slate-400 text-[10px]">MASTER:</span>
            <span className="font-semibold text-white">{formatSMPTE(globalCurrentSec)}</span>
            <span className="text-slate-500 text-[10px]">/ {totalDurationSec.toFixed(1)}s</span>
          </div>

          <div className="bg-black/70 border border-white/10 px-2 py-1 flex items-center gap-1 font-bold">
            <span className="text-amber-400">F{String(currentFrameNum).padStart(3, '0')}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{activeSlideTotalFrames}F</span>
          </div>
        </div>

        {/* Right: Snap, Mode & Monitor Toggle */}
        <div className="flex items-center gap-2">
          {nleFeedback && (
            <span className="px-2 py-1 bg-[#F5A623]/15 border border-[#F5A623]/60 text-[#FFE066] text-[10px] font-bold tracking-wider">
              {nleFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsMagneticSnap((m) => !m)}
            className={`px-2 py-1 text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
              isMagneticSnap
                ? 'bg-amber-500/20 border-amber-500/50 text-[#F5A623]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Magnetic 1-Frame Snapping (SNAP 1F)"
          >
            <Magnet className="w-3 h-3" />
            <span>SNAP 1F</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPlaybackMode(playbackMode === 'sequence' ? 'solo' : 'sequence')}
            className={`px-2 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${
              playbackMode === 'sequence'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-[#F5A623]'
            }`}
          >
            {playbackMode === 'sequence' ? 'ANIMATIC' : 'SOLO'}
          </button>

          <button
            type="button"
            onClick={() => setViewMode((v) => (v === 'SPLIT' ? 'CARDS_EXPANDED' : 'SPLIT'))}
            className="p-1.5 bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            title={viewMode === 'SPLIT' ? 'Expand Card Matrix' : 'Show Live Preview Monitor'}
          >
            {viewMode === 'SPLIT' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. Main Viewport: Monitor Preview + Collapsible Card Matrix */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {viewMode === 'SPLIT' && (
          <div className="h-[36%] min-h-[180px] max-h-[300px] w-full bg-[#050608] border-b border-white/10 flex items-center justify-center p-2.5 relative overflow-hidden shrink-0">
            <div className="relative h-full max-w-full aspect-[2.39/1] bg-black border border-white/15 overflow-hidden shadow-2xl flex items-center justify-center group">
              {monitorMediaUrl ? (
                isMonitorVideo ? (
                  <video
                    ref={monitorVideoRef}
                    src={monitorMediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    style={{
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                  />
                ) : (
                  <img
                    src={monitorMediaUrl}
                    alt={currentSlide?.titleEn || 'Slide preview'}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                  <Film className="w-7 h-7 opacity-40" />
                  <span className="text-[11px] font-mono tracking-widest text-slate-500 uppercase">NO MEDIA ATTACHED</span>
                  <button
                    type="button"
                    onClick={(e) => handleTriggerUpload(safeIndex, e)}
                    className="px-3 py-1 bg-amber-500/15 border border-[#F5A623]/30 text-amber-300 text-xs hover:bg-amber-500/30 transition-colors cursor-pointer"
                  >
                    + Ingest Frame Media
                  </button>
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none border border-[#F5A623]/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />

              <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none flex items-end justify-between text-xs">
                <div>
                  {currentSlide?.titleBn && (
                    <div className="text-[#FFE066] font-serif font-bold text-sm leading-tight drop-shadow-md">
                      {currentSlide.titleBn}
                    </div>
                  )}
                  <div className="text-white font-bold tracking-wide drop-shadow-md">
                    {currentSlide?.titleEn || `Shot ${String(safeIndex + 1).padStart(3, '0')}`}
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-mono hidden sm:block tabular-nums">
                  <div className="text-amber-400 font-bold">
                    {currentWindow.speed !== 1 ? `${currentWindow.speed.toFixed(1)}x SPEED · ` : ''}
                    {activeSlideDurationSec.toFixed(2)}s ({activeSlideTotalFrames}F)
                  </div>
                  <div>{currentSlide?.cameraSpec?.focalLength || '35mm'} · {currentSlide?.cameraSpec?.aperture || 'f/1.4'}</div>
                </div>
              </div>

              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/85 border border-white/20 text-[10px] font-mono text-[#F5A623] pointer-events-none font-bold tabular-nums">
                F{String(currentFrameNum).padStart(3, '0')} / {activeSlideTotalFrames}F · SRC {getClipSourceMediaTimeSec(currentSlide, slideTimeSec).toFixed(2)}s
              </div>

              <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {currentSlide?.remoteUrl && !isMonitorVideo && (
                  <button
                    type="button"
                    onClick={handleQuickAnimateOmni}
                    disabled={isAiGenerating}
                    className="px-2 py-1 bg-black/85 border border-cyan-500/40 text-cyan-300 text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Video className="w-3 h-3" />
                    <span>Omni</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleQuickScoreLyria}
                  disabled={isAiGenerating}
                  className="px-2 py-1 bg-black/85 border border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Music className="w-3 h-3" />
                  <span>Lyria</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTriggerUpload(safeIndex, e)}
                  className="px-2 py-1 bg-black/85 border border-white/20 text-slate-200 hover:text-amber-300 text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Replace</span>
                </button>
              </div>

              {aiMessage && (
                <div className="absolute top-9 right-2 px-2.5 py-1 bg-black/90 border border-amber-400/50 text-amber-300 text-[10px] font-bold flex items-center gap-1.5">
                  {isAiGenerating && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}
                  <span>{aiMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Card Management Matrix */}
        <div className="flex-1 min-h-0 flex flex-col bg-[#07080B] overflow-hidden">
          <div className="h-9 px-4 bg-[#090A0E] border-b border-white/5 flex items-center justify-between shrink-0 text-xs gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">SEQUENCE CARDS</span>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter shots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/60 border border-white/10 pl-6 pr-2 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-32 sm:w-44"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-black/50 border border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setCardLayout('FILMSTRIP')}
                  className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                    cardLayout === 'FILMSTRIP' ? 'bg-[#F5A623] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  STRIP
                </button>
                <button
                  type="button"
                  onClick={() => setCardLayout('GRID')}
                  className={`px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                    cardLayout === 'GRID' ? 'bg-[#F5A623] text-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GRID
                </button>
              </div>

              <button
                type="button"
                onClick={onAddSlide}
                className="px-2.5 py-1 bg-[#F5A623] hover:bg-amber-400 text-black font-extrabold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add 12s Shot</span>
              </button>
            </div>
          </div>

          <div
            ref={filmstripScrollRef}
            className={`flex-1 p-2.5 overflow-auto ${
              cardLayout === 'FILMSTRIP'
                ? 'flex flex-row gap-2.5 items-stretch'
                : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'
            }`}
          >
            {filteredSlides.map((slide, idx) => {
              const originalIndex = activeSlides.findIndex((s) => s.id === slide.id);
              const resolvedIndex = originalIndex >= 0 ? originalIndex : idx;
              const isSelected = resolvedIndex === safeIndex;
              const isEditing = editingCardIndex === resolvedIndex;
              const shotNumStr = String(resolvedIndex + 1).padStart(3, '0');
              const vaultEntry = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, resolvedIndex);
              const cardMediaUrl = vaultEntry?.url || slide.remoteUrl || '';
              const isCardVideo = vaultEntry
                ? vaultEntry.type === 'video'
                : isVideoSourceUrl(cardMediaUrl, { isVideo: Boolean(slide.isVideo) });
              const cardWin = getClipSourceWindow(slide);

              return (
                <div
                  key={slide.id || `slide_${resolvedIndex}`}
                  data-shot-card={resolvedIndex}
                  data-shot-drop-index={resolvedIndex}
                  onClick={() => onSelectSlide(resolvedIndex)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dropCardIndex !== resolvedIndex) setDropCardIndex(resolvedIndex);
                  }}
                  onDragLeave={() => {
                    setDropCardIndex((prev) => (prev === resolvedIndex ? null : prev));
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropCardIndex(null);
                    const file = e.dataTransfer.files?.[0];
                    if (file && onUploadMedia) {
                      onUploadMedia(resolvedIndex, file);
                    }
                  }}
                  className={`relative border transition-colors cursor-pointer flex flex-col overflow-hidden ${
                    cardLayout === 'FILMSTRIP' ? 'w-56 sm:w-60 shrink-0' : 'w-full'
                  } ${
                    dropCardIndex === resolvedIndex
                      ? 'bg-[#0d1f18] border-emerald-400 border-dashed ring-2 ring-emerald-400/50'
                      : isSelected
                      ? 'bg-[#15130f] border-[#F5A623] ring-1 ring-[#F5A623]/50'
                      : 'bg-[#0E0F14] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="px-2 py-1 bg-black/40 border-b border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold tabular-nums">
                      <span className={`px-1 py-0.5 text-[10px] ${
                        isSelected ? 'bg-[#F5A623] text-black' : 'bg-white/10 text-slate-300'
                      }`}>
                        SH{shotNumStr}
                      </span>
                      <span className="text-[10px] text-[#F5A623]">
                        {formatDurationPillValue(cardWin.timelineDurationSec)}
                      </span>
                      {cardWin.speed !== 1.0 && (
                        <span className="text-[9px] text-cyan-300 font-bold">{cardWin.speed}x</span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(resolvedIndex, 'left')}
                        disabled={resolvedIndex === 0}
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Shot Left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(resolvedIndex, 'right')}
                        disabled={resolvedIndex === activeSlides.length - 1}
                        className="p-0.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Move Shot Right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateSlide(resolvedIndex)}
                        className="p-0.5 text-slate-400 hover:text-amber-300 cursor-pointer"
                        title="Duplicate Shot"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSlide(resolvedIndex)}
                        disabled={activeSlides.length <= 1}
                        className="p-0.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                        title="Delete Shot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="relative aspect-[2.39/1] bg-black overflow-hidden flex items-center justify-center group/card-thumb">
                    {cardMediaUrl || slide.thumbnailUrl ? (
                      <ShotMediaThumbnail
                        shotIndex={resolvedIndex}
                        shotId={slide.id}
                        mediaUrl={cardMediaUrl}
                        thumbnailUrl={slide.thumbnailUrl}
                        isVideo={isCardVideo}
                        mimeType={vaultEntry?.mimeType}
                        name={vaultEntry?.name}
                        title={slide.titleEn}
                        bengaliTitle={slide.titleBn}
                        disableLiveVideoElement
                        alt={slide.titleEn || `Shot ${shotNumStr}`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 gap-0.5">
                        <Camera className="w-4 h-4 opacity-40" />
                        <span className="text-[9px] uppercase tracking-wider">Empty</span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                        <div
                          className="h-full bg-[#F5A623]"
                          style={{
                            width: `${Math.min(100, Math.max(0, (slideTimeSec / cardWin.timelineDurationSec) * 100))}%`
                          }}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleTriggerUpload(resolvedIndex, e)}
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover/card-thumb:opacity-100 flex items-center justify-center gap-1 text-xs text-amber-300 font-bold transition-opacity"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ingest</span>
                    </button>
                  </div>

                  <div className="p-2 flex-1 flex flex-col justify-between text-xs">
                    {isEditing ? (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitleEn}
                          onChange={(e) => setEditTitleEn(e.target.value)}
                          placeholder="English Title"
                          className="w-full bg-black/70 border border-white/20 px-1.5 py-0.5 text-[11px] text-white"
                        />
                        <input
                          type="text"
                          value={editTitleBn}
                          onChange={(e) => setEditTitleBn(e.target.value)}
                          placeholder="Bengali Title"
                          className="w-full bg-black/70 border border-white/20 px-1.5 py-0.5 text-[11px] text-amber-300 font-serif"
                        />
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          placeholder="Director Notes"
                          className="w-full bg-black/70 border border-white/20 px-1.5 py-0.5 text-[11px] text-slate-300 resize-none"
                        />
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={handleCancelEdit} className="px-2 py-0.5 bg-white/10 text-[10px]">
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSaveEdit(resolvedIndex, e)}
                            className="px-2 py-0.5 bg-amber-500 text-black font-bold text-[10px]"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-1">
                        <div className="truncate">
                          {slide.titleBn && (
                            <div className="text-[#FFE066] font-serif font-bold text-[11px] truncate">
                              {slide.titleBn}
                            </div>
                          )}
                          <div className="text-white font-bold text-[11px] truncate">
                            {slide.titleEn || `Shot ${shotNumStr}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(resolvedIndex, e)}
                          className="p-0.5 text-slate-400 hover:text-white shrink-0"
                          title="Edit Shot Metadata"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CapCut-Grade Real-Time NLE Cutting & Ripple Trim Timeline Dock */}
      <footer className="h-56 sm:h-60 bg-[#0A0B10] border-t border-white/15 px-3 sm:px-5 py-2 flex flex-col justify-between shrink-0 z-30 select-none shadow-[0_-8px_24px_rgba(0,0,0,0.8)]">
        {/* Top Row: CapCut NLE Cutter Toolbar + Transport + Speed Multiplier */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-white/10">
          {/* CapCut Quick Edit Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="scrub-split-btn"
              onClick={handleSplitAtPlayhead}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400 text-[#FFE066] text-[10px] font-extrabold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              title="Razor Split Active Clip at Playhead (S or Ctrl+B)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>SPLIT [S]</span>
            </button>

            <button
              type="button"
              data-testid="scrub-trim-q-btn"
              onClick={handleTrimStartQ}
              className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Trim Start to Playhead & Ripple Left (Q)"
            >
              <ArrowLeftToLine className="w-3 h-3 text-amber-400" />
              <span>TRIM IN [Q]</span>
            </button>

            <button
              type="button"
              data-testid="scrub-trim-w-btn"
              onClick={handleTrimEndW}
              className="px-2 py-1 bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Trim End to Playhead & Ripple Left (W)"
            >
              <span>TRIM OUT [W]</span>
              <ArrowRightToLine className="w-3 h-3 text-amber-400" />
            </button>

            <button
              type="button"
              data-testid="scrub-ripple-delete-btn"
              onClick={handleRippleDelete}
              disabled={slides.length <= 1}
              className="px-2 py-1 bg-rose-950/30 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-35 transition-colors"
              title="Ripple Delete Selected Clip (Delete / Backspace)"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">RIPPLE DEL</span>
            </button>
          </div>

          {/* Center Transport Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onScrubSlideTime(0)}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 cursor-pointer"
              title="Start of Clip"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleJogNudge(-24)}
              className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => onStepFrame(false)}
              className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-amber-300 cursor-pointer"
            >
              -1F
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              className={`px-3.5 py-1 font-extrabold text-[11px] flex items-center gap-1.5 border cursor-pointer ${
                isPlaying
                  ? 'bg-amber-600 border-amber-400 text-white'
                  : 'bg-[#1a1308] border-[#F5A623] text-[#F5A623]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              onClick={() => onStepFrame(true)}
              className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-amber-300 cursor-pointer"
            >
              +1F
            </button>
            <button
              type="button"
              onClick={() => handleJogNudge(24)}
              className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
            >
              +1s
            </button>
            <button
              type="button"
              onClick={() => onScrubSlideTime(activeSlideDurationSec)}
              className="p-1.5 bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 cursor-pointer"
              title="End of Clip"
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
            />
          </div>

          {/* Right: Clip Speed Multiplier + Timeline Zoom */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 px-1.5 py-0.5">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span className="text-slate-400 hidden md:inline">CLIP SPEED:</span>
              {SCRUB_SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    handleClipSpeedChange(spd);
                    onChangePlaybackSpeed?.(spd);
                  }}
                  className={`px-1.5 py-0.5 font-bold cursor-pointer transition-colors ${
                    Math.abs(currentWindow.speed - spd) < 0.05
                      ? 'bg-cyan-500 text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-black/60 border border-white/10 px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setTimelineZoom((z) => Math.max(0.5, Number((z - 0.5).toFixed(1))))}
                className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom Out NLE Timeline"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-slate-300 font-bold tabular-nums w-8 text-center">{timelineZoom.toFixed(1)}x</span>
              <button
                type="button"
                onClick={() => setTimelineZoom((z) => Math.min(4.0, Number((z + 0.5).toFixed(1))))}
                className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                title="Zoom In NLE Timeline"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Multi-Clip CapCut NLE Timeline Track */}
        <div
          ref={nleTimelineScrollRef}
          data-testid="scrub-nle-timeline"
          className="flex-1 min-h-0 mt-1.5 overflow-x-auto overflow-y-hidden bg-[#06070B] border border-white/15 relative"
        >
          <div style={{ width: `${totalTrackWidthPx}px` }} className="h-full relative flex flex-col">
            {/* Timecode Tick Ruler (Click / Drag to scrub globally) */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="h-6 w-full bg-[#0E1017] border-b border-white/10 relative cursor-ew-resize shrink-0"
            >
              {rulerTicks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                >
                  <span className="text-[9px] text-slate-400 tabular-nums pl-1 leading-none">
                    {sec.toFixed(0)}s
                  </span>
                  <div className="w-[1px] h-2 bg-white/30" />
                </div>
              ))}
            </div>

            {/* Proportional Draggable Clip Track with `[|` and `|]` Ripple Trim Handles */}
            <div className="flex-1 min-h-0 flex flex-row items-stretch py-2 px-0 relative">
              {activeSlides.map((slide, idx) => {
                const win = getClipSourceWindow(slide);
                const clipFrames = getShotFrameCount(win.timelineDurationSec, win.fps);
                const widthPx = Math.max(46, Math.round(win.timelineDurationSec * pxPerSec));
                const isActive = idx === safeIndex;
                const vaultEntry = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, idx);
                const thumbUrl = vaultEntry?.url || slide.thumbnailUrl || slide.remoteUrl || '';

                return (
                  <div
                    key={slide.id || idx}
                    data-testid={`scrub-clip-block-${idx}`}
                    onClick={() => onSelectSlide(idx)}
                    style={{ width: `${widthPx}px` }}
                    className={`relative h-full shrink-0 border-r border-black/80 overflow-hidden cursor-pointer group/clip transition-colors ${
                      isActive
                        ? 'bg-[#1D160B] ring-2 ring-inset ring-[#F5A623]'
                        : 'bg-[#12151E] hover:bg-[#171B26] border-y border-white/10'
                    }`}
                  >
                    {/* Filmstrip Background Preview */}
                    {thumbUrl && (
                      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden">
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

                    {/* Left Edge Trim Handle `[|` (adjusts inPoint & auto-ripples) */}
                    <div
                      role="separator"
                      aria-label={`Trim in-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-left-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'left')}
                      onPointerMove={handleTrimHandlePointerMove}
                      onPointerUp={handleTrimHandlePointerUp}
                      title="Drag [| Left Edge to Trim In-Point (Ripple Auto-Close)"
                      className={`absolute left-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#F5A623] text-black'
                          : 'bg-white/25 hover:bg-amber-400 text-black opacity-75 group-hover/clip:opacity-100'
                      }`}
                    >
                      <span className="w-[2px] h-5 bg-black/80" />
                    </div>

                    {/* Clip Label & Duration Overlay */}
                    <div className="relative z-10 h-full px-3.5 py-1 flex flex-col justify-between pointer-events-none">
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className={`font-extrabold px-1 py-0.2 truncate ${
                          isActive ? 'bg-[#F5A623] text-black' : 'bg-black/75 text-slate-200'
                        }`}>
                          SH{String(idx + 1).padStart(3, '0')}
                        </span>
                        <span className="px-1 bg-black/80 text-amber-300 font-bold tabular-nums shrink-0">
                          {win.timelineDurationSec.toFixed(1)}s / {clipFrames}F
                        </span>
                      </div>

                      <div className="truncate">
                        {slide.titleBn && (
                          <div className="text-[10px] font-serif font-bold text-[#FFE066] truncate leading-tight">
                            {slide.titleBn}
                          </div>
                        )}
                        <div className="text-[10px] font-bold text-white truncate">
                          {slide.titleEn || `Shot ${idx + 1}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-300/80 tabular-nums">
                        <span>IN {win.inSec.toFixed(1)}s</span>
                        {win.speed !== 1.0 && <span className="text-cyan-300 font-bold">{win.speed}x</span>}
                      </div>
                    </div>

                    {/* Right Edge Trim Handle `|]` (adjusts outPoint & auto-ripples) */}
                    <div
                      role="separator"
                      aria-label={`Trim out-point of shot ${idx + 1}`}
                      data-testid={`scrub-trim-right-${idx}`}
                      onPointerDown={(e) => handleTrimHandlePointerDown(e, idx, 'right')}
                      onPointerMove={handleTrimHandlePointerMove}
                      onPointerUp={handleTrimHandlePointerUp}
                      title="Drag |] Right Edge to Trim Out-Point (Ripple Auto-Close)"
                      className={`absolute right-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#F5A623] text-black'
                          : 'bg-white/25 hover:bg-amber-400 text-black opacity-75 group-hover/clip:opacity-100'
                      }`}
                    >
                      <span className="w-[2px] h-5 bg-black/80" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Magnetic Red Snapping Playhead Needle across Master Track */}
            <div
              data-testid="scrub-master-playhead"
              style={{ left: `${masterNeedleLeftPx}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.85)] pointer-events-none z-30"
            >
              <div className="w-3 h-3 bg-[#EF4444] -ml-[5px] rotate-45 -mt-1 border border-white/60" />
              <div className="absolute top-1 left-2 px-1.5 py-0.5 bg-[#EF4444] text-white font-extrabold text-[9px] whitespace-nowrap tabular-nums">
                {globalCurrentSec.toFixed(2)}s · F{String(currentFrameNum).padStart(3, '0')}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
