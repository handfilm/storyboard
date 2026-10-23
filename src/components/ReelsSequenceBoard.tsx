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
  formatSMPTETimecode, 
  cleanupVideoElement, 
  thumbnailMemoryCache 
} from '../services/thumbnailEngine';
import { 
  Play, 
  Volume2, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Video, 
  ImageIcon,
  Edit3,
  Copy,
  Trash2
} from 'lucide-react';

export interface ReelsSequenceBoardProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode?: PlaybackMode;
  isPlaying?: boolean;
  slideTimeSec?: number;
  onSelectSlide: (index: number) => void;
  onReorderSlides?: (reordered: SlideDraft[]) => void;
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
  isActive: boolean;
  isWithinBuffer: boolean;
  onSelect: () => void;
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
  isActive,
  isWithinBuffer,
  onSelect,
  onMoveLeft,
  onMoveRight,
  onDropMedia,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [smpteTimecode, setSmpteTimecode] = useState<string>('TC 00:00:00:00');
  const [transformOrigin, setTransformOrigin] = useState<'origin-center' | 'origin-left' | 'origin-right'>('origin-center');
  const [isDragOver, setIsDragOver] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const latestMouseXRef = useRef<number>(0);

  const epNum = String(index + 1).padStart(3, '0');
  const durationSec = 12.0;

  // Determine media type
  const isVideo = Boolean(
    slide.remoteUrl?.includes('.mp4') || 
    slide.remoteUrl?.includes('.webm') || 
    slide.remoteUrl?.includes('video') ||
    slide.remoteUrl?.startsWith('blob:')
  );

  // Cached fallback thumbnail (never pure black)
  const fallbackThumbnail = useMemo(() => {
    if (slide.remoteUrl && !isVideo) return slide.remoteUrl;
    const cached = thumbnailMemoryCache.get(slide.id || `shot_${index}`);
    if (cached) return cached;
    return '';
  }, [slide.remoteUrl, isVideo, slide.id, index]);

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

  // RAF-throttled hover scrubbing
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    latestMouseXRef.current = e.clientX - rect.left;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!cardRef.current) return;
        const currentRect = cardRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(currentRect.width, latestMouseXRef.current));
        const normalized = currentRect.width > 0 ? x / currentRect.width : 0;
        const targetSec = normalized * durationSec;

        setCursorX(x);
        setSmpteTimecode(formatSMPTETimecode(targetSec, 24));

        if (videoRef.current && videoRef.current.readyState >= 1) {
          try {
            videoRef.current.muted = true;
            videoRef.current.currentTime = targetSec;
          } catch {
            // ignore
          }
        }
      });
    }
  };

  const handleMouseEnter = () => {
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
    // Release video seek state on leave
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
    }
  };

  // Teardown on unmount (4GB Guard)
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (videoRef.current) {
        cleanupVideoElement(videoRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
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
      className={`shrink-0 w-64 h-44 rounded-xl border transition-colors duration-150 ease-out cursor-pointer relative flex flex-col justify-between p-3 select-none ${
        isDragOver
          ? 'border-2 border-dashed border-[#F5A623] bg-[#14141B]'
          : isActive
          ? 'bg-[#14141C] border-[#F5A623] shadow-[0_4px_20px_rgba(245,166,35,0.25)]'
          : 'bg-[#101016] hover:bg-[#15151F] border-[#1C1C26]'
      }`}
    >
      {/* 1. Tactical Hover Zoom Container with Dynamic Scrubbing */}
      <div
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`absolute inset-0 cursor-ew-resize transition-all duration-300 ease-out rounded-lg border ${transformOrigin} ${
          isHovered
            ? 'scale-125 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623] bg-black'
            : 'border-white/10 z-0 overflow-hidden'
        }`}
      >
        {/* RAM Virtualization: Mount Video ONLY if card is within active viewport buffer */}
        {isWithinBuffer && isVideo && slide.remoteUrl ? (
          <video
            ref={videoRef}
            src={slide.remoteUrl}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
          />
        ) : fallbackThumbnail ? (
          <img
            src={fallbackThumbnail}
            alt={slide.titleEn || `Shot ${epNum}`}
            className="w-full h-full object-cover opacity-50"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#0D0D14] flex flex-col items-center justify-center text-zinc-700">
            {isVideo ? <Video className="w-6 h-6 mb-1 text-cyan-500/40" /> : <ImageIcon className="w-6 h-6 mb-1 text-amber-500/40" />}
            <span className="text-[8px] font-mono tracking-widest text-zinc-500">READY</span>
          </div>
        )}

        {/* Dynamic Scrub Needle Line */}
        {isHovered && cursorX !== null && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#F5A623] z-20 pointer-events-none shadow-[0_0_8px_#F5A623]"
            style={{ left: `${cursorX}px` }}
          />
        )}

        {/* Floating Tactical Micro-HUD at bottom when hovered */}
        {isHovered ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/90 backdrop-blur-md border-t border-[#F5A623]/60 px-2.5 py-1 flex items-center justify-between text-[9px] font-mono z-30 pointer-events-none">
            <div className="flex items-center gap-1.5 font-bold text-[#FFE066]">
              <span>{smpteTimecode}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/90">SH{epNum}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.2 bg-[#F5A623]/25 border border-[#F5A623]/40 text-[#F5A623] text-[7.5px] font-bold rounded-[2px] tracking-wider animate-pulse">
                SCRUB
              </span>
              <span className="text-zinc-400 text-[8px]">24FPS</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Top Header Row: Scene Badge, 12.0s Allocation, Reorder Buttons */}
      <div className="relative z-10 flex items-center justify-between text-xs pointer-events-auto">
        <div className="flex items-center gap-1.5 font-bold">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
              isActive ? 'bg-[#F5A623] text-black font-black' : 'bg-[#1C1C26] text-white/80'
            }`}
          >
            SH{epNum}
          </span>
          <span className="text-[#F5A623] text-[10px] font-mono font-bold">12.0s</span>
          <span className="text-white/40 text-[9px] font-mono">(288F)</span>
        </div>

        <div className="flex items-center gap-0.5">
          {onMoveLeft && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft();
              }}
              className="p-1 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Move card left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveRight && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight();
              }}
              className="p-1 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Move card right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Middle Content: Scene Labels & Text Cues */}
      <div className="relative z-10 my-auto flex flex-col gap-0.5 pointer-events-none">
        {slide.titleBn && (
          <p className="text-xs text-[#F5A623] font-serif font-bold truncate">
            {slide.titleBn}
          </p>
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
          <span className="truncate max-w-[100px] text-zinc-400">
            {slide.remoteUrl ? 'BOUND ASSET' : 'DROP VIDEO'}
          </span>
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
            className="p-1 rounded bg-black/60 hover:bg-black text-zinc-400 hover:text-[#F5A623] transition-colors cursor-pointer"
            title="Upload or replace media asset"
          >
            <Upload className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-[#F5A623] transition-colors cursor-pointer"
              title="Edit scene labels & text cues"
            >
              <Edit3 className="w-3 h-3" />
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-[#F5A623] transition-colors cursor-pointer"
              title="Duplicate card"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {onDelete && totalSlides > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
              title="Delete card"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ReelsSequenceBoard: React.FC<ReelsSequenceBoardProps> = ({
  slides,
  activeSlideIndex,
  onSelectSlide,
  onReorderSlides,
  onUploadMedia,
  onDuplicateSlide,
  onDeleteSlide,
  onEditSlide,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 10 });

  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));

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

    // Maintain ±3 buffer window
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

  return (
    <div
      ref={containerRef}
      className={`p-3 overflow-x-auto no-scrollbar flex items-center gap-3 bg-[#0B0B0F] select-none ${className}`}
    >
      {slides.map((slide, idx) => {
        const isWithinBuffer = idx >= visibleRange.start && idx <= visibleRange.end;
        return (
          <VirtualizedSequenceCard
            key={slide.id || idx}
            slide={slide}
            index={idx}
            totalSlides={slides.length}
            isActive={idx === safeIndex}
            isWithinBuffer={isWithinBuffer}
            onSelect={() => onSelectSlide(idx)}
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
  );
};
