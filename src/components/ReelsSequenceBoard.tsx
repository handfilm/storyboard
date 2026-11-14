/**
 * @file /src/components/ReelsSequenceBoard.tsx
 * @description Dedicated Reels & 100-Shot Sequence Board with Viewport Virtualization,
 * Tactile Hover Zoom, and Zero-Lag Hover-Scrubbing.
 * 
 * Hardware 4GB Guard & RAM Virtualization:
 * - Horizontally virtualizes video decoders: Only mounts active video elements for visible
 *   cards within the scroll viewport (plus a strict ±3 card buffer).
 * - Offscreen cards render lightweight 5KB JPEG fallback plates to prevent browser decoder exhaustion.
 * - Strict DOM cleanup: calls `video.removeAttribute('src')`, `video.load()`, and revokes blob URLs.
 * 
 * Tactical Aesthetics & Interactions:
 * - Preview Container: `relative overflow-hidden rounded-lg border border-white/10 transition-all duration-300 ease-out`
 * - Hover State: `scale-125 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623]`
 * - Floating Micro-HUD at bottom: `TC 00:00:03:12`, shot index (`SH001`), mini playback status badge.
 * - Monotonic RAF-throttled hover scrubbing without audio.
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SlideDraft } from '../types/project';
import { PlaybackMode } from '../types/editor';
import {
  clampShotDuration,
  formatDurationPillValue,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../types/storyboard';
import { audioEngine } from '../services/audioEngine';
import { useStudioStore } from '../core/store';
import { getShotMediaKey, resolveShotMediaEntry } from '../services/handfilmMediaVault';
import { CadenceSelectorPill } from './controls/CadenceSelectorPill';
import { ShotMediaThumbnail } from './ShotMediaThumbnail';
import {
  formatSMPTETimecode,
  isVideoSourceUrl,
  thumbnailMemoryCache
} from '../services/thumbnailEngine';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Video,
  ImageIcon,
  Edit3,
  Copy,
  Trash2,
  Repeat,
  Music,
  Activity
} from 'lucide-react';
import { CinemaToolHUD } from './ui/CinemaToolHUD';

export interface ReelsSequenceBoardProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode?: PlaybackMode;
  isPlaying?: boolean;
  slideTimeSec?: number;
  onSelectSlide: (index: number) => void;
  onReorderSlides?: (reordered: SlideDraft[]) => void;
  onUpdateSlide?: (index: number, partial: Partial<SlideDraft>) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  showSequenceActionBar?: boolean;
  onUploadMedia?: (index: number, file: File) => void;
  onDuplicateSlide?: (index: number) => void;
  onDeleteSlide?: (index: number) => void;
  onEditSlide?: (index: number) => void;
  onStepFrame?: (forward: boolean) => void;
  className?: string;
}

// Single Virtualized Reels Sequence Card
interface VirtualizedCardProps {
  slide: SlideDraft;
  index: number;
  totalSlides: number;
  shotStartSec: number;
  isActive: boolean;
  isWithinBuffer: boolean;
  isSnapToBeat: boolean;
  onSelect: () => void;
  onResizeDuration?: (newDurationSec: number) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDropMedia?: (file: File) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const VirtualizedSequenceCard: React.FC<VirtualizedCardProps> = ({
  slide,
  index,
  totalSlides,
  shotStartSec,
  isActive,
  isWithinBuffer,
  isSnapToBeat,
  onSelect,
  onResizeDuration,
  onMoveLeft,
  onMoveRight,
  onDropMedia,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [dragDurationSec, setDragDurationSec] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [smpteTimecode, setSmpteTimecode] = useState<string>('TC 00:00:00:00');
  const [transformOrigin, setTransformOrigin] = useState<'origin-center' | 'origin-left' | 'origin-right'>('origin-center');
  const [isDragOver, setIsDragOver] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const latestMouseXRef = useRef<number>(0);

  const epNum = String(index + 1).padStart(3, '0');
  const baseDurationSec = getShotDurationSec(slide, 12.0);
  const targetFps = getShotTargetFps(slide, 24);
  const liveDurationSec = dragDurationSec !== null ? dragDurationSec : baseDurationSec;
  const liveFrameCount = getShotFrameCount(liveDurationSec, targetFps);

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const vaultEntry = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, index);
  const resolvedMediaUrl = vaultEntry?.url || slide.remoteUrl || '';

  // Determine media type (never assume generic blob: URLs are videos)
  const isVideo = vaultEntry
    ? vaultEntry.type === 'video'
    : isVideoSourceUrl(resolvedMediaUrl, {
        isVideo: Boolean(slide.isVideo)
      });

  // Cached fallback thumbnail (never pure black)
  const fallbackThumbnail = useMemo(() => {
    if (slide.thumbnailUrl) return slide.thumbnailUrl;
    if (resolvedMediaUrl && !isVideo) return resolvedMediaUrl;
    const cached =
      thumbnailMemoryCache.get(slide.id || `shot_${index}`) ||
      thumbnailMemoryCache.get(String(index + 1)) ||
      thumbnailMemoryCache.get(`shot_${index}`);
    if (cached) return cached;
    return '';
  }, [slide.thumbnailUrl, resolvedMediaUrl, isVideo, slide.id, index]);

  // Viewport-aware origin clamping
  const updateOrigin = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.left < 140) {
      setTransformOrigin('origin-left');
    } else if (window.innerWidth - rect.right < 140) {
      setTransformOrigin('origin-right');
    } else {
      setTransformOrigin('origin-center');
    }
  }, []);

  // RAF-throttled hover scrubbing across variable slide duration
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragDurationSec !== null || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    latestMouseXRef.current = e.clientX - rect.left;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!cardRef.current) return;
        const currentRect = cardRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(currentRect.width, latestMouseXRef.current));
        const normalized = currentRect.width > 0 ? x / currentRect.width : 0;
        const targetSec = normalized * liveDurationSec;

        setCursorX(x);
        setSmpteTimecode(formatSMPTETimecode(targetSec, targetFps));
      });
    }
  };

  const handleMouseEnter = () => {
    if (dragDurationSec !== null) return;
    setIsHovered(true);
    updateOrigin();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCursorX(null);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  // Right-border duration stretch/compress drag handle
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onResizeDuration) return;
    e.preventDefault();
    e.stopPropagation();

    setIsHovered(false);
    const startX = e.clientX;
    const startDuration = baseDurationSec;
    const snapActive =
      isSnapToBeat || Boolean(slide.beatSnapEnabled) || audioEngine.getIsSnapToBeatEnabled();

    setDragDurationSec(startDuration);

    const handleWindowMove = (moveEv: MouseEvent) => {
      const deltaPx = moveEv.clientX - startX;
      // Adaptive sensitivity: fine with Shift, wide with Alt, balanced default
      const secPerPx = moveEv.shiftKey
        ? 0.01
        : moveEv.altKey
        ? 0.5
        : startDuration >= 30
        ? 0.25
        : 0.05;

      let candidate = clampShotDuration(startDuration + deltaPx * secPerPx);
      if (snapActive) {
        candidate = audioEngine.snapDurationToNearestBeat(shotStartSec, candidate, 0.5, 0.45);
      } else {
        candidate = Math.round(candidate * 20) / 20; // crisp 0.05s increments
        candidate = clampShotDuration(candidate);
      }

      setDragDurationSec(candidate);
      onResizeDuration(candidate);
    };

    const handleWindowUp = () => {
      setDragDurationSec(null);
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
  };

  // Teardown on unmount (4GB Guard)
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const showDurTooltip = dragDurationSec !== null || isHandleHovered;

  return (
    <div
      ref={cardRef}
      data-shot-id={getShotMediaKey(slide as any, index)}
      data-shot-drop-index={index}
      data-card-index={index}
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && onDropMedia) {
          onDropMedia(e.dataTransfer.files[0]);
        }
      }}
      className={`shrink-0 w-64 h-44 rounded-xl border transition-all duration-300 ease-out cursor-pointer relative flex flex-col justify-between p-3 select-none will-change-transform ${
        dragDurationSec !== null
          ? 'bg-[#171722] border-[#FFE066] ring-1 ring-[#F5A623] z-40 scale-[1.02]'
          : isDragOver
          ? 'border-2 border-dashed border-[#F5A623] bg-[#14141B] scale-[1.02]'
          : isActive
          ? 'bg-[#14141C] border-[#F5A623] shadow-[0_4px_24px_rgba(245,166,35,0.32)] scale-[1.03] z-20 ring-1 ring-[#F5A623]/60'
          : 'bg-[#101016] hover:bg-[#15151F] border-[#1C1C26] hover:border-white/20 hover:scale-[1.01] opacity-80 hover:opacity-100'
      }`}
    >
      {/* Real-time Duration Resize Tooltip */}
      {showDurTooltip && (
        <div className="absolute -top-8 right-0 z-50 px-2.5 py-1 rounded-md bg-black/95 border border-[#F5A623] text-[10px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.9)] pointer-events-none tabular-nums">
          DUR: {liveDurationSec.toFixed(2)}s // {liveFrameCount} FRAMES
        </div>
      )}

      {/* 1. Tactical Hover Zoom Container with Dynamic Scrubbing */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`absolute inset-0 cursor-ew-resize transition-all duration-200 ease-out rounded-lg border ${transformOrigin} ${
          isHovered && dragDurationSec === null
            ? 'scale-110 z-30 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623] bg-black'
            : 'border-white/10 z-0 overflow-hidden'
        }`}
      >
        {/* Persistent Poster Base + Hover-Scrubbing Video Layer (Never Solid Black) */}
        {(resolvedMediaUrl || fallbackThumbnail) ? (
          <>
            <ShotMediaThumbnail
              shotIndex={index}
              shotId={slide.id}
              mediaUrl={resolvedMediaUrl}
              thumbnailUrl={fallbackThumbnail}
              isVideo={isVideo}
              mimeType={vaultEntry?.mimeType}
              name={vaultEntry?.name}
              title={slide.titleEn}
              bengaliTitle={slide.titleBn}
              virtualized={isWithinBuffer}
              disableLiveVideoElement
              className="w-full h-full overflow-hidden"
              mediaClassName="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
              alt={slide.titleEn || `Shot ${epNum}`}
            />
          </>
        ) : (
          <div className="w-full h-full bg-[#0D0D14] flex flex-col items-center justify-center text-zinc-700">
            {isVideo ? (
              <Video className="w-6 h-6 mb-1 text-cyan-500/40" />
            ) : (
              <ImageIcon className="w-6 h-6 mb-1 text-amber-500/40" />
            )}
            <span className="text-[8px] font-mono tracking-widest text-zinc-500">READY</span>
          </div>
        )}

        {/* Dynamic Scrub Needle Line */}
        {isHovered && cursorX !== null && dragDurationSec === null && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#F5A623] z-20 pointer-events-none shadow-[0_0_8px_#F5A623]"
            style={{ left: `${cursorX}px` }}
          />
        )}

        {/* Floating Tactical Micro-HUD at bottom when hovered */}
        {isHovered && dragDurationSec === null ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/90 backdrop-blur-md border-t border-[#F5A623]/60 px-2.5 py-1 flex items-center justify-between text-[9px] font-mono z-30 pointer-events-none tabular-nums">
            <div className="flex items-center gap-1.5 font-bold text-[#FFE066]">
              <span>{smpteTimecode}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/90">SH{epNum}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[#F5A623] text-[8px] font-bold">SCRUB</span>
              <span className="text-white/30">·</span>
              <span className="text-zinc-400 text-[8px]">{targetFps}FPS</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Top Header Row: Scene Badge, Elastic Duration Allocation, Reorder Buttons */}
      <div className="relative z-10 flex items-center justify-between text-xs pointer-events-auto">
        <div className="flex items-center gap-1.5 font-bold tabular-nums">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${
              isActive ? 'bg-[#F5A623] text-black font-black' : 'bg-[#1C1C26] text-white/80'
            }`}
          >
            SH{epNum}
          </span>
          <span className="text-[#F5A623] text-[10px] font-mono font-bold">
            {formatDurationPillValue(liveDurationSec)}
          </span>
          <span className="text-white/45 text-[9px] font-mono">({liveFrameCount}F)</span>
        </div>

        <div className="flex items-center gap-0.5">
          {onMoveLeft && (
            <CinemaToolHUD
              title="MOVE LEFT"
              en="Swap this shot earlier in sequence."
              bn="শট কার্ডটি বামে সরাতে চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveLeft();
                }}
                className="cinema-tile cinema-tile-amber p-1 rounded-full cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          )}
          {onMoveRight && (
            <CinemaToolHUD
              title="MOVE RIGHT"
              en="Swap this shot later in sequence."
              bn="শট কার্ডটি ডানে সরাতে চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveRight();
                }}
                className="cinema-tile cinema-tile-amber p-1 rounded-full cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          )}
        </div>
      </div>

      {/* 3. Middle Content: Scene Labels & Text Cues */}
      <div className="relative z-10 my-auto flex flex-col gap-0.5 pointer-events-none">
        {slide.titleBn && (
          <p className="text-xs text-[#F5A623] font-serif font-bold truncate">{slide.titleBn}</p>
        )}
        <p className="text-xs text-[#EDEDED] font-mono font-bold truncate">
          {slide.titleEn || `Scene Shot ${epNum}`}
        </p>

        {slide.directorNotes && (
          <p className="text-[10px] text-white/50 font-mono line-clamp-1">
            Dir: {slide.directorNotes}
          </p>
        )}
        {slide.soundCue && (
          <p className="text-[9.5px] text-[#38BDF8] font-mono line-clamp-1 flex items-center gap-1">
            <Volume2 className="w-3 h-3 shrink-0" />
            <span>{slide.soundCue}</span>
          </p>
        )}
      </div>

      {/* 4. Bottom Row: Media Ingest Prompt or Bound Asset Indicator */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40 font-mono pt-1 border-t border-white/5 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="truncate max-w-[100px] text-zinc-400 font-bold">
            {slide.remoteUrl ? 'BOUND' : 'DROP'}
          </span>
          <CinemaToolHUD
            title="UPLOAD MEDIA"
            en="Attach or replace video/image file on this shot."
            bn="এই শটে নতুন ভিডিও বা ছবি আপলোড করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*,image/*';
                input.onchange = (ev: any) => {
                  if (ev.target?.files?.[0] && onDropMedia) {
                    onDropMedia(ev.target.files[0]);
                  }
                };
                input.click();
              }}
              className="cinema-tile cinema-tile-amber p-1 rounded cursor-pointer"
            >
              <Upload className="w-3 h-3 cinema-tile-icon" />
            </button>
          </CinemaToolHUD>
        </div>

        <div className="flex items-center gap-1 pr-1">
          {onEdit && (
            <CinemaToolHUD
              title="EDIT SHOT"
              en="Edit shot titles, Bangla line, and audio cues."
              bn="শটের টাইটেল, বাংলা লেখা ও ডিরেক্টর নোট এডিট করতে চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="cinema-tile cinema-tile-amber p-1 rounded cursor-pointer"
              >
                <Edit3 className="w-3 h-3 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          )}
          {onDuplicate && (
            <CinemaToolHUD
              title="DUPLICATE SHOT"
              en="Clone this shot card next in the timeline."
              bn="এই শট কার্ডটি কপি করে ডুপ্লিকেট তৈরি করতে চাপুন।"
              accent="cyan"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="cinema-tile cinema-tile-cyan p-1 rounded cursor-pointer"
              >
                <Copy className="w-3 h-3 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          )}
          {onDelete && totalSlides > 1 && (
            <CinemaToolHUD
              title="DELETE SHOT"
              en="Remove this shot card from sequence."
              bn="সিকোয়েন্স থেকে এই শটটি মুছে ফেলতে চাপুন।"
              accent="crimson"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="cinema-tile cinema-tile-crimson p-1 rounded cursor-pointer"
              >
                <Trash2 className="w-3 h-3 cinema-tile-icon" />
              </button>
            </CinemaToolHUD>
          )}
        </div>
      </div>

      {/* 5. Per-Slide Right-Border Duration Drag Handle */}
      {onResizeDuration && (
        <div
          onMouseDown={handleResizeStart}
          onMouseEnter={() => setIsHandleHovered(true)}
          onMouseLeave={() => setIsHandleHovered(false)}
          onClick={(e) => e.stopPropagation()}
          title="Drag right edge to stretch or compress shot duration (Shift = fine 0.01s, Alt = 0.5s)"
          className={`absolute top-2 bottom-2 -right-1.5 w-3 z-40 cursor-ew-resize flex items-center justify-center rounded-full transition-colors ${
            dragDurationSec !== null || isHandleHovered
              ? 'bg-[#F5A623] shadow-[0_0_10px_rgba(245,166,35,0.8)]'
              : 'bg-white/10 hover:bg-[#F5A623]/80'
          }`}
        >
          <div className="w-[2px] h-7 rounded-full bg-black/70" />
        </div>
      )}
    </div>
  );
};

export const ReelsSequenceBoard: React.FC<ReelsSequenceBoardProps> = ({
  slides,
  activeSlideIndex,
  onSelectSlide,
  onReorderSlides,
  onUpdateSlide,
  onApplyDurationToAll,
  onMatchAudioBeats,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onLoadAudioFile,
  showSequenceActionBar = true,
  onUploadMedia,
  onDuplicateSlide,
  onDeleteSlide,
  onEditSlide,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 10 });

  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));
  const activeSlide = slides[safeIndex];
  const activeSlideDuration = getShotDurationSec(activeSlide, 12.0);
  const activeSlideFps = getShotTargetFps(activeSlide, 24);
  const shotOffsets = useMemo(() => getCumulativeShotOffsets(slides), [slides]);

  // Auto-scroll timeline track to keep current slide in view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-card-index="${safeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  // Viewport tracking for RAM Virtualization (4GB Guard)
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const cardWidth = 268; // 256px card + 12px gap
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    const firstVisible = Math.max(0, Math.floor(scrollLeft / cardWidth));
    const lastVisible = Math.min(slides.length - 1, Math.ceil((scrollLeft + containerWidth) / cardWidth));

    const bufferStart = Math.max(0, firstVisible - 3);
    const bufferEnd = Math.min(slides.length - 1, lastVisible + 3);

    setVisibleRange({ start: bufferStart, end: bufferEnd });
  }, [slides.length]);

  useEffect(() => {
    updateVisibleRange();
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updateVisibleRange, { passive: true });
      window.addEventListener('resize', updateVisibleRange);
      return () => {
        container.removeEventListener('scroll', updateVisibleRange);
        window.removeEventListener('resize', updateVisibleRange);
      };
    }
  }, [updateVisibleRange]);

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= slides.length || !onReorderSlides) return;
    const next = [...slides];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderSlides(next);
  };

  const hasActionControls = Boolean(
    showSequenceActionBar &&
      (onUpdateSlide || onApplyDurationToAll || onMatchAudioBeats || onToggleSnapToBeat || onLoadAudioFile)
  );

  return (
    <div className={`flex flex-col bg-[#0B0B0F] select-none ${className}`}>
      {hasActionControls && (
        <div className="px-3 py-1.5 border-b border-[#1C1C26] bg-[#0E0E14] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono shrink-0">
          <div className="flex items-center gap-2">
            {onUpdateSlide && (
              <CadenceSelectorPill
                durationSec={activeSlideDuration}
                targetFps={activeSlideFps}
                onChangeDuration={(dur) =>
                  onUpdateSlide(safeIndex, { duration: dur, durationSec: dur })
                }
                onChangeTargetFps={(fps) => onUpdateSlide(safeIndex, { targetFps: fps })}
                onApplyDurationToAll={onApplyDurationToAll}
                isSnapToBeat={isSnapToBeat}
                onToggleSnapToBeat={onToggleSnapToBeat}
                compact
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {onApplyDurationToAll && (
              <CinemaToolHUD
                title="RIPPLE ALL"
                en="Apply active shot duration across every cut in sequence."
                bn="এই শটের সময়কাল সিকোয়েন্সের সব শটে প্রয়োগ করতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => onApplyDurationToAll(activeSlideDuration)}
                  className="cinema-tile cinema-tile-amber px-2.5 py-1 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer whitespace-nowrap"
                >
                  <Repeat className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>RIPPLE ALL</span>
                </button>
              </CinemaToolHUD>
            )}

            {onMatchAudioBeats && (
              <CinemaToolHUD
                title="MATCH BEATS"
                en="Quantize all shot durations to detected waveform beats."
                bn="মিউজিকের বিটের সাথে সব শটের দৈর্ঘ্য অটো-ম্যাচ করতে চাপুন।"
                accent="cyan"
              >
                <button
                  type="button"
                  onClick={onMatchAudioBeats}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer whitespace-nowrap"
                >
                  <Activity className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>MATCH BEATS</span>
                </button>
              </CinemaToolHUD>
            )}

            {onToggleSnapToBeat && (
              <CinemaToolHUD
                title="BEAT SNAP"
                en="Magnetically snap shot resize/split edges to beat transients."
                bn="শট কাটার সময় বিট লাইনে ম্যাগনেটিক স্ন্যাপ চালু বা বন্ধ করুন।"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={isSnapToBeat ? 'true' : 'false'}
                  onClick={onToggleSnapToBeat}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer whitespace-nowrap"
                >
                  <Music className="w-3.5 h-3.5 cinema-tile-icon" />
                  <span>BEAT SNAP</span>
                </button>
              </CinemaToolHUD>
            )}

            {onLoadAudioFile && (
              <>
                <CinemaToolHUD
                  title="LOAD AUDIO"
                  en="Attach MP3/WAV track for transient beat detection."
                  bn="বিট ডিটেকশনের জন্য ডিভাইস থেকে অডিও বা গান যোগ করুন।"
                  accent="emerald"
                >
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="cinema-tile cinema-tile-emerald px-2.5 py-1 rounded-md flex items-center gap-1.5 font-black tracking-wider text-[10px] uppercase cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>LOAD AUDIO</span>
                  </button>
                </CinemaToolHUD>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      onLoadAudioFile(e.target.files[0]);
                    }
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 p-3 overflow-x-auto no-scrollbar flex items-center gap-3 scroll-smooth transition-all duration-300 ease-out"
        style={{ scrollBehavior: 'smooth' }}
      >
        {slides.map((slide, idx) => {
          const isWithinBuffer = idx >= visibleRange.start && idx <= visibleRange.end;
          const shotStartSec = shotOffsets[idx]?.startSec ?? idx * 12.0;
          return (
            <VirtualizedSequenceCard
              key={slide.id || idx}
              slide={slide}
              index={idx}
              totalSlides={slides.length}
              shotStartSec={shotStartSec}
              isActive={idx === safeIndex}
              isWithinBuffer={isWithinBuffer}
              isSnapToBeat={isSnapToBeat}
              onSelect={() => onSelectSlide(idx)}
              onResizeDuration={
                onUpdateSlide
                  ? (newDur) => onUpdateSlide(idx, { duration: newDur, durationSec: newDur })
                  : undefined
              }
              onMoveLeft={idx > 0 ? () => handleMove(idx, idx - 1) : undefined}
              onMoveRight={idx < slides.length - 1 ? () => handleMove(idx, idx + 1) : undefined}
              onDropMedia={onUploadMedia ? (file) => onUploadMedia(idx, file) : undefined}
              onEdit={onEditSlide ? () => onEditSlide(idx) : undefined}
              onDuplicate={onDuplicateSlide ? () => onDuplicateSlide(idx) : undefined}
              onDelete={onDeleteSlide ? () => onDeleteSlide(idx) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

