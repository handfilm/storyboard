/**
 * @file /src/components/stage/TactileStage.tsx
 * @description Master Consolidated Cinematic Stage for RAWx Storyboard Studio.
 * 
 * Features:
 * - Default primary view for the entire studio (consolidates the Bloom aesthetic directly into Stage).
 * - Full 2.39:1 Cinema Viewport with background media plate, glowing metallic Bangla typography
 *   ('দৃষ্টি / সূচনা'), English title ('THE SINGULARITY'), and live director telemetry captions.
 * - Central anamorphic flare with soft bloom and radial falloff simulation.
 * - Strict zero-distraction layout: No bulky floating lens bars.
 * - Permanent Google Flow tactical transport pills (Play, Pause, -1F, +1F, Loop, Solo Scrub, Variable Speed).
 * - Bottom Tactile Sequence Runner (Frames 001 - 100) with instant thumbnail selection,
 *   drag-and-drop reordering with magnetic snap alignment, and direct media ingestion.
 * - Sub-frame precision timecode & 12.000s dual-mode playback engine (Sequence vs Solo Scrub).
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { OpticalFrame } from '../OpticalFrame';
import { TactileTransport } from '../controls/TactileTransport';
import { TactileSnapGuide } from './TactileSnapGuide';
import { TactileSnapGuideLine } from '../../types/bloom';
import { ComponentVisibility, DEFAULT_COMPONENT_VISIBILITY } from '../ComponentsMatrixPopover';
import { localDbService } from '../../services/localDbService';
import { automationService } from '../../services/automationService';
import { PlaybackMode, SLIDE_DURATION_SEC } from '../../types/editor';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  GripHorizontal, 
  Film, 
  Sparkles, 
  Layers, 
  Maximize2,
  Clock,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';

interface TactileStageProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  aspectRatio: AspectRatio;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  onReorderFrames?: (frames: AnthologyFrame[]) => void;
  onUploadImage: (file: File) => void;
  onOpenAnimatic?: () => void;
  onOpenInspector?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  // Playback & Sequencer props
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideTimeSec?: number;
  onTogglePlay?: () => void;
  onStepFrame?: (forward: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalSec: number) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  onPurgeMedia?: () => void;
  projectTitle?: string;
}

export const TactileStage: React.FC<TactileStageProps> = ({
  frames,
  currentIndex,
  currentFrame,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  componentsVisibility = DEFAULT_COMPONENT_VISIBILITY,
  onSelectFrame,
  onUpdateFrame,
  onReorderFrames,
  onUploadImage,
  onOpenAnimatic,
  onOpenInspector,
  onToggleTitles,
  showTitles = true,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  slideTimeSec = 0,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  onPurgeMedia,
  projectTitle = 'RAWx Storyboard Studio'
}) => {
  const activeFrame: AnthologyFrame = currentFrame || frames[currentIndex] || frames[0];
  const [isLooping, setIsLooping] = useState(true);

  // Drag and drop sequencing state for the 100-slide runner
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [snapGuides, setSnapGuides] = useState<TactileSnapGuideLine[]>([]);
  const runnerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active card into view in the bottom runner
  useEffect(() => {
    if (runnerRef.current) {
      const activeEl = runnerRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Handle slide reordering with magnetic snap
  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= frames.length || toIdx >= frames.length) {
      return;
    }
    const updated = [...frames];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    if (onReorderFrames) {
      onReorderFrames(updated);
    }
    onSelectFrame(toIdx);

    // Persist reorder to local storage / IndexedDB
    try {
      localDbService.saveTimelineFrames(updated);
      automationService.dispatchEvent('on_timeline_sync', {
        reorderedFrom: fromIdx,
        reorderedTo: toIdx,
        totalFrames: updated.length,
        activeFrameTitle: moved.title
      });
    } catch {
      // Safe fallback
    }
  }, [frames, onReorderFrames, onSelectFrame]);

  // Drag Handlers for Bottom Runner
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const distanceToCenter = Math.abs(e.clientX - midX);

    // Magnetic snap activates within 24px of card boundary
    if (distanceToCenter < 24) {
      setDropTargetIndex(index);
      setSnapGuides([
        {
          id: `snap_guide_${index}`,
          orientation: 'vertical',
          coordinate: rect.left,
          startCoord: rect.top,
          endCoord: rect.bottom,
          distancePx: distanceToCenter,
          activeFrameId: draggedIndex,
          snapTargetFrameId: index,
          label: `SNAP SH${String(index + 1).padStart(3, '0')}`
        }
      ]);
    }
  };

  const handleDragLeave = () => {
    setSnapGuides([]);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setSnapGuides([]);
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      handleReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setSnapGuides([]);
  };

  // Direct file drop on an individual slide thumbnail
  const handleThumbnailFileDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFrame(index);
      onUploadImage(file);
    }
  };

  return (
    <div className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-[#07070A] font-mono select-none">
      {/* 1. Tactical HUD Header Bar (Google Flow Obsidian & Warm Gold Aesthetic) */}
      <div className="h-9 bg-[#0E0E12] border-b border-[#1C1C24] px-4 flex items-center justify-between text-xs shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Active Mode Capsule */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#14141B] border border-[#23232E] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            <span className="text-white/50 uppercase">STAGE:</span>
            <span className="text-[#F5A623] font-bold">TACTILE CINEMA VIEWPORT</span>
          </div>

          <span className="text-white/20 hidden sm:inline">|</span>

          {/* Active Shot Telemetry */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#14141B] border border-[#23232E] text-[10px] truncate">
            <span className="text-[#F5A623] font-bold">
              SH{String(currentIndex + 1).padStart(3, '0')} / {String(frames.length).padStart(3, '0')}
            </span>
            <span className="text-white/30">•</span>
            <span className="text-white/80 font-bold truncate">
              {activeFrame.bengaliTitle || 'দৃষ্টি'} // {activeFrame.title || 'THE SINGULARITY'}
            </span>
          </div>
        </div>

        {/* Right Timing & Spec Capsules */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#14141B] border border-[#23232E] text-[10px] text-white/60">
            <span className="text-[#F5A623] font-bold">12.000s ALLOCATION</span>
            <span>•</span>
            <span>288 FRAMES @ 24FPS</span>
          </div>

          {/* Solo / Sequence Mode Pill */}
          <button
            type="button"
            onClick={() => onSelectPlaybackMode?.(playbackMode === 'sequence' ? 'solo' : 'sequence')}
            className={`px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-colors duration-150 ease-out cursor-pointer border active:scale-[0.98] ${
              playbackMode === 'sequence'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/70 border-[#F5A623]/50 text-[#F5A623]'
            }`}
            title="Toggle between 12s Animatic Sequence advance and Solo Scrub"
          >
            {playbackMode === 'sequence' ? '▶ ANIMATIC (12s)' : '🔍 SOLO SCRUB'}
          </button>
        </div>
      </div>

      {/* 2. Main Stage Viewport (Hero Visual Plate with Glowing Metallic Titles) */}
      <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden p-2 sm:p-3 bg-[#08080C]">
        <div className="w-full h-full max-w-6xl max-h-[82vh] flex items-center justify-center">
          <OpticalFrame
            frame={activeFrame}
            aspectRatio={aspectRatio}
            directorName={directorName}
            nodeLocation={nodeLocation}
            showHud={showHud}
            isAutoplay={isAutoplay}
            componentsVisibility={componentsVisibility}
            onUploadImage={onUploadImage}
            onOpenInspector={onOpenInspector || (() => {})}
            onQuickSampleImage={() => {}}
            onOpenAnimatic={onOpenAnimatic}
            onToggleTitles={onToggleTitles}
          />
        </div>

        {/* Magnetic Snap Laser Guides */}
        <TactileSnapGuide guides={snapGuides} zoom={1.0} />
      </div>

      {/* 3. Permanent Tactical Transport Pill Bar */}
      <div className="h-11 bg-[#0E0E12] border-t border-[#1C1C24] px-4 flex items-center justify-between shrink-0 z-30">
        <TactileTransport
          isPlaying={isAutoplay}
          onTogglePlay={onTogglePlay || (() => {})}
          playbackMode={playbackMode}
          onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping(l => !l)}
          onStepFrame={onStepFrame || (() => {})}
          playbackSpeed={playbackSpeed}
          onChangePlaybackSpeed={onChangePlaybackSpeed || (() => {})}
          isMuted={false}
          onToggleMute={() => {}}
          slideTimeSec={slideTimeSec}
          currentIndex={currentIndex}
          totalSlides={frames.length}
          onScrubSlideTime={onScrubSlideTime || (() => {})}
          onScrubGlobalTime={onScrubGlobalTime}
          aspectRatio={aspectRatio as any}
          onPurgeMedia={onPurgeMedia}
          hasMedia={Boolean(activeFrame.imageUrl)}
        />
      </div>

      {/* 4. Bottom Tactile Sequence Runner (Frames 001 - 100) */}
      <div className="h-28 bg-[#090A0E] border-t border-[#1C1C24] px-3 py-2 flex flex-col justify-between shrink-0 z-30">
        {/* Runner Header Readout */}
        <div className="flex items-center justify-between text-[8.5px] text-white/50 mb-1">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-[#F5A623] animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">
              100-SHOT SEQUENCE RUNNER (CLICK TO AUDITION • DRAG TO REORDER WITH MAGNETIC SNAP)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#F5A623] font-bold">AUTO-SYNC 12.0s</span>
            <span className="text-white/20">•</span>
            <span className="text-white/60">DRAG MEDIA DIRECTLY ONTO CARDS</span>
          </div>
        </div>

        {/* Horizontal 100-Shot Scrollable Frame Ribbon */}
        <div 
          ref={runnerRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5"
        >
          {frames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const isTarget = dropTargetIndex === idx;

            return (
              <div
                key={frame.id ?? idx}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleThumbnailFileDrop(e, idx);
                  } else {
                    handleDrop(e, idx);
                  }
                }}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectFrame(idx)}
                className={`h-full w-28 shrink-0 bg-[#0E0E14] border rounded-md overflow-hidden cursor-pointer transition-colors duration-150 ease-out flex flex-col relative group active:scale-[0.98] ${
                  isActive
                    ? 'border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.45)] ring-1 ring-[#F5A623]'
                    : isTarget
                    ? 'border-[#FFE066] scale-105'
                    : 'border-[#23232E] hover:border-[#F5A623]/60'
                }`}
                title={`Shot ${idx + 1}: ${frame.title} — Click to load, drag to reorder`}
              >
                {/* Media Image / Plate Thumbnail */}
                <div className="flex-1 bg-black relative overflow-hidden">
                  {frame.imageUrl ? (
                    <img 
                      src={frame.imageUrl} 
                      alt={frame.title} 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[7.5px] text-white/30 bg-gradient-to-br from-[#121218] to-black">
                      <Film className="w-3.5 h-3.5 mb-0.5 text-white/20" />
                      <span>SH{String(idx + 1).padStart(3, '0')}</span>
                    </div>
                  )}

                  {/* Top Badge: Shot Number */}
                  <span className={`absolute top-0.5 left-0.5 px-1.5 py-0.2 rounded-full text-[7.5px] font-mono font-bold ${
                    isActive ? 'bg-[#F5A623] text-black font-black' : 'bg-black/80 text-[#FFE066]'
                  }`}>
                    {String(idx + 1).padStart(3, '0')}
                  </span>

                  {/* Duration Tag */}
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[7px] font-mono text-white/70">
                    12.0s
                  </span>
                </div>

                {/* Bottom Short Caption Slate */}
                <div className={`h-4.5 px-1.5 flex items-center justify-between text-[7.5px] border-t ${
                  isActive ? 'bg-[#181822] text-[#F5A623] border-[#F5A623]/40' : 'bg-black/90 text-white/70 border-white/5'
                }`}>
                  <span className="font-bold truncate max-w-[55px]">{frame.bengaliTitle || 'দৃষ্টি'}</span>
                  <span className="truncate max-w-[45px] text-white/40">{frame.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
