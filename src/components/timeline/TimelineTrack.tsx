/**
 * @file /src/components/timeline/TimelineTrack.tsx
 * @description Master 12.0s Slide Timeline Track & Sequence Controller.
 * 
 * Enforced Directives:
 * 1. UI De-Clutter: Zero card pop-overs, zero floating tooltips, zero hover preview cards, zero scale transforms.
 * 2. Strict 12.0s Slide Architecture:
 *    - Every slide is fixed at exactly 12.0 seconds (288 frames @ 24fps).
 *    - Ruler markings indicate 12.0s intervals: 00:00, 00:12, 00:24, 00:36, etc.
 * 3. High-Contrast Dark-Brutalist Visuals:
 *    - Crisp #18181D backgrounds with #2C2C35 borders, #E6E6E6 text, #E5A919 accents.
 * 4. Dual Playback Support:
 *    - Sequence Playback vs Solo Scrub.
 *    - Hardware accelerated transitions (transition-colors duration-150 ease-out).
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SlideDraft } from '../../types/project';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight,
  MoveLeft,
  MoveRight,
  Clock,
  Layers
} from 'lucide-react';

interface TimelineTrackProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  onSelectSlide: (index: number) => void;
  onTogglePlay: () => void;
  onAddSlide?: () => void;
  onDuplicateSlide?: (index: number) => void;
  onDeleteSlide?: (index: number) => void;
  onReorderSlides?: (newSlides: SlideDraft[]) => void;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  className?: string;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  slides,
  activeSlideIndex,
  playbackMode,
  isPlaying,
  onSelectSlide,
  onTogglePlay,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
  onSelectPlaybackMode,
  className = ''
}) => {
  const trackContainerRef = useRef<HTMLDivElement>(null);
  const [zoomPixelsPerSec, setZoomPixelsPerSec] = useState(18); // Pixels per second for 12s slides

  const totalDurationSec = slides.length * SLIDE_DURATION_SEC;
  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));

  // Auto-scroll timeline to keep active slide visible
  useEffect(() => {
    if (trackContainerRef.current) {
      const activeElement = trackContainerRef.current.querySelector(`[data-slide-index="${safeIndex}"]`) as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  const formatSecondsToTimecode = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    if (!onReorderSlides || toIndex < 0 || toIndex >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderSlides(reordered);
    onSelectSlide(toIndex);
  };

  return (
    <div className={`w-full bg-[#121217] border-t border-[#262630] flex flex-col font-mono select-none ${className}`}>
      {/* Timeline Header Bar: Controls, Mode Readout & Duration Ticker */}
      <div className="h-9 px-4 bg-[#16161D] border-b border-[#24242D] flex items-center justify-between text-xs">
        {/* Left: Quick Transport & Slide Counter */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer ${
              isPlaying
                ? 'bg-[#E5A919] text-black shadow-sm'
                : 'bg-[#22222B] hover:bg-[#2C2C36] text-[#E6E6E6] border border-[#353542]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-white/70">
            <span className="text-white/40">SLIDE</span>
            <span className="text-[#FFE066] font-bold">{String(safeIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/60">{String(slides.length).padStart(3, '0')}</span>
          </div>

          <span className="text-white/20">|</span>

          {/* Mode Switcher */}
          {onSelectPlaybackMode && (
            <div className="flex items-center bg-[#0F0F14] p-0.5 rounded border border-[#2B2B36] text-[10px]">
              <button
                onClick={() => onSelectPlaybackMode('sequence')}
                className={`px-2.5 py-0.5 rounded transition-colors duration-150 cursor-pointer ${
                  playbackMode === 'sequence'
                    ? 'bg-[#E5A919] text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                SEQUENCE (12S EACH)
              </button>
              <button
                onClick={() => onSelectPlaybackMode('solo')}
                className={`px-2.5 py-0.5 rounded transition-colors duration-150 cursor-pointer ${
                  playbackMode === 'solo'
                    ? 'bg-[#E5A919] text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                SOLO SCRUB
              </button>
            </div>
          )}
        </div>

        {/* Right: Total Timeline Duration (slides * 12.0s) & Add Slide */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-white/40">TOTAL DURATION:</span>
            <span className="text-[#E6E6E6] font-bold">{formatSecondsToTimecode(totalDurationSec)}</span>
            <span className="text-[10px] text-white/40">({totalDurationSec}s)</span>
          </div>

          {onAddSlide && (
            <button
              onClick={onAddSlide}
              className="px-2.5 py-1 bg-[#1F1F28] hover:bg-[#2A2A36] text-[#E6E6E6] hover:text-[#FFE066] border border-[#343442] rounded text-[10.5px] font-medium flex items-center gap-1 cursor-pointer transition-colors duration-150"
              title="Add 12.0s Slide"
            >
              <Plus className="w-3.5 h-3.5 text-[#E5A919]" />
              <span>+ 12.0S SLIDE</span>
            </button>
          )}
        </div>
      </div>

      {/* 12.0s Time Ruler */}
      <div className="h-6 bg-[#0E0E12] border-b border-[#202028] px-4 flex items-center overflow-x-hidden relative">
        <div className="flex items-center min-w-full">
          {slides.map((_, i) => {
            const startSec = i * SLIDE_DURATION_SEC;
            return (
              <div
                key={i}
                className="shrink-0 flex items-center justify-between border-l border-[#333340] px-1 text-[9px] text-white/40"
                style={{ width: `${SLIDE_DURATION_SEC * zoomPixelsPerSec}px` }}
              >
                <span className="font-bold text-white/60">{formatSecondsToTimecode(startSec)}</span>
                <span className="text-[8px] text-white/20">288F @ 24fps</span>
                <span className="text-white/30">+12.0s</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Track Lane: 12.0s Storyboard Cards (Zero Hover Popup, Zero Floating Cards) */}
      <div
        ref={trackContainerRef}
        className="flex-1 min-h-[105px] max-h-[125px] p-3 overflow-x-auto no-scrollbar flex items-center gap-2.5 bg-[#09090D]"
      >
        {slides.map((slide, idx) => {
          const isActive = idx === safeIndex;
          const epNum = String(idx + 1).padStart(3, '0');

          return (
            <div
              key={slide.id || idx}
              data-slide-index={idx}
              onClick={() => onSelectSlide(idx)}
              style={{ width: `${Math.max(160, SLIDE_DURATION_SEC * zoomPixelsPerSec)}px` }}
              className={`shrink-0 h-[88px] rounded border transition-colors duration-150 ease-out cursor-pointer relative flex flex-col justify-between p-2 overflow-hidden ${
                isActive
                  ? 'bg-[#1C1C24] border-[#E5A919] ring-1 ring-[#E5A919]/50 shadow-lg'
                  : 'bg-[#13131A] hover:bg-[#181822] border-[#2B2B36]'
              }`}
            >
              {/* Media Thumbnail Backdrop */}
              {slide.remoteUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none"
                  style={{ backgroundImage: `url(${slide.remoteUrl})` }}
                />
              )}

              {/* Top Row: Frame Number, 12.0s Badge, Reorder Arrows */}
              <div className="relative z-10 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`px-1.5 py-0.2 rounded text-[9.5px] ${
                    isActive ? 'bg-[#E5A919] text-black' : 'bg-[#22222E] text-white/80'
                  }`}>
                    SH{epNum}
                  </span>
                  <span className="text-white/50 text-[9px]">12.0s</span>
                </div>

                {/* Move Left / Right Controls */}
                <div className="flex items-center gap-0.5">
                  {idx > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, idx - 1);
                      }}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Move slide left"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  )}
                  {idx < slides.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, idx + 1);
                      }}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Move slide right"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Middle: Clean Typography (Bengali + English Title) */}
              <div className="relative z-10 truncate my-auto">
                {slide.titleBn && (
                  <p className="text-[11px] text-[#FFE066] font-serif truncate leading-tight">
                    {slide.titleBn}
                  </p>
                )}
                <p className="text-[10px] text-[#E6E6E6] font-mono truncate leading-tight mt-0.5">
                  {slide.titleEn || `Shot ${epNum}`}
                </p>
              </div>

              {/* Bottom Row: Markers / Action Icons */}
              <div className="relative z-10 flex items-center justify-between text-[9px] text-white/40 border-t border-white/5 pt-1">
                <span>{slide.markers?.length || 0} MARKERS</span>
                <div className="flex items-center gap-1.5">
                  {onDuplicateSlide && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSlide(idx);
                      }}
                      className="hover:text-[#FFE066] transition-colors"
                      title="Duplicate slide"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                  {slides.length > 1 && onDeleteSlide && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(idx);
                      }}
                      className="hover:text-red-400 transition-colors"
                      title="Delete slide"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
