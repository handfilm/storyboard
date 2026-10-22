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
import { storyboardSyncService } from '../../services/storyboardSyncService';
import { db } from '../../services/db';
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
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
  isAudioMuted?: boolean;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
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
  onOpenCinemaPlayer,
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
  projectTitle = 'RAWx Storyboard Studio',
  onOpenExportTimeline,
  onOpenExportRange,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onLoadAudioFile,
  detectedBpm,
  isAudioMuted = false,
  onToggleMute
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

  // Direct file or Media Asset Vault drop on an individual slide thumbnail
  const handleThumbnailFileDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const customData = e.dataTransfer.getData('text/plain');
    if (customData) {
      try {
        const parsed = JSON.parse(customData);
        if (parsed.type === 'MEDIA_ASSET_VAULT' && parsed.assetId) {
          onSelectFrame(index);
          storyboardSyncService.assignAssetToShot(parsed.assetId, index);
          return;
        }
      } catch {
        // Not a JSON payload, proceed to files check
      }
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onSelectFrame(index);
      db.saveMediaToVault(file).then(saved => {
        db.assignMediaToShot(saved.id, index);
      });
      onUploadImage(file);
    }
  };

  const [isStageDraggingOver, setIsStageDraggingOver] = useState(false);

  const handleStageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStageDraggingOver(true);
  };

  const handleStageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isStageDraggingOver) setIsStageDraggingOver(true);
  };

  const handleStageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsStageDraggingOver(false);
  };

  const handleStageDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStageDraggingOver(false);

    // Check for Media Asset Vault card payload
    const customData = e.dataTransfer.getData('text/plain');
    if (customData) {
      try {
        const parsed = JSON.parse(customData);
        if (parsed.type === 'MEDIA_ASSET_VAULT' && parsed.assetId) {
          await db.assignMediaToShot(parsed.assetId, currentIndex);
          return;
        }
      } catch {}
    }

    // Check for external files
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const saved = await db.saveMediaToVault(file);
        if (i === 0) {
          await db.assignMediaToShot(saved.id, currentIndex);
          onUploadImage(file);
        }
      }
    }
  };

  return (
    <div className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-[#070709] font-mono select-none">
      {/* Main Stage Viewport (Hero Visual Plate with Glowing Metallic Titles) */}
      <div 
        className={`flex-1 w-full relative flex items-center justify-center overflow-hidden p-2 sm:p-3 bg-[#070709] transition-all duration-150 ${
          isStageDraggingOver ? 'border-2 border-[#F5A623] bg-[#F5A623]/10 shadow-[0_0_30px_rgba(245,166,35,0.3)]' : 'border-transparent'
        }`}
        onDragEnter={handleStageDragEnter}
        onDragOver={handleStageDragOver}
        onDragLeave={handleStageDragLeave}
        onDrop={handleStageDrop}
      >
        <div className="w-full h-full max-w-6xl max-h-[82vh] flex items-center justify-center pointer-events-auto">
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
            onOpenCinemaPlayer={onOpenCinemaPlayer}
          />
        </div>

        {/* Magnetic Snap Laser Guides */}
        <TactileSnapGuide guides={snapGuides} zoom={1.0} />
      </div>

      {/* 3. Permanent Tactical Transport Pill Bar */}
      <div className="h-12 bg-[#0c0c10] border-t border-[#272732] px-4 flex items-center justify-center shrink-0 z-30">
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
          isMuted={isAudioMuted}
          onToggleMute={onToggleMute || (() => {})}
          slideTimeSec={slideTimeSec}
          currentIndex={currentIndex}
          totalSlides={frames.length}
          onScrubSlideTime={onScrubSlideTime || (() => {})}
          onScrubGlobalTime={onScrubGlobalTime}
          aspectRatio={aspectRatio as any}
          onPurgeMedia={onPurgeMedia}
          hasMedia={Boolean(activeFrame.imageUrl)}
          onOpenExportTimeline={onOpenExportTimeline}
          onOpenExportRange={onOpenExportRange}
          isSnapToBeat={isSnapToBeat}
          onToggleSnapToBeat={onToggleSnapToBeat}
          onLoadAudioFile={onLoadAudioFile}
          detectedBpm={detectedBpm}
          showFrameStepButtons={componentsVisibility?.frameStepButtons ?? false}
        />
      </div>

      {/* 4. Bottom Tactile Sequence Runner (Frames 001 - 100) */}
      <div className="h-28 bg-[#0a0a10] border-t border-[#272732] px-3 py-2 flex flex-col justify-between shrink-0 z-30">
        {/* Runner Header Readout */}
        <div className="flex items-center justify-between text-[8.5px] text-zinc-400 mb-1">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-[#eab308] animate-pulse" />
            <span className="font-bold text-zinc-200 uppercase tracking-wider">
              100-SHOT SEQUENCE RUNNER (CLICK TO AUDITION • DRAG TO REORDER WITH MAGNETIC SNAP)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#fbbf24] font-bold">AUTO-SYNC 12.0s</span>
            <span className="text-zinc-600">•</span>
            {isSnapToBeat && (
              <>
                <span className="text-[#eab308] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-ping" />
                  RHYTHMIC BEAT SNAP ({detectedBpm || 120} BPM)
                </span>
                <span className="text-zinc-600">•</span>
              </>
            )}
            <span className="text-zinc-400">DRAG MEDIA DIRECTLY ONTO CARDS</span>
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
                  const customData = e.dataTransfer.getData('text/plain');
                  if ((e.dataTransfer.files && e.dataTransfer.files.length > 0) || (customData && customData.includes('MEDIA_ASSET_VAULT'))) {
                    handleThumbnailFileDrop(e, idx);
                  } else {
                    handleDrop(e, idx);
                  }
                }}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectFrame(idx)}
                className={`h-full w-28 shrink-0 bg-[#070709] border rounded-md overflow-hidden cursor-pointer transition-colors duration-150 ease-out flex flex-col relative group active:scale-[0.98] ${
                  isActive
                    ? 'border-[#d4af37] shadow-[0_0_15px_rgba(234,179,8,0.4)] ring-1 ring-[#eab308]'
                    : isTarget
                    ? 'border-[#fbbf24] scale-105'
                    : 'border-[#272732] hover:border-[#d4af37]/60'
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
                    <div className="w-full h-full flex flex-col items-center justify-center text-[7.5px] text-zinc-500 bg-gradient-to-br from-[#101018] to-black">
                      <Film className="w-3.5 h-3.5 mb-0.5 text-zinc-600" />
                      <span>SH{String(idx + 1).padStart(3, '0')}</span>
                    </div>
                  )}

                  {/* Top Badge: Shot Number */}
                  <span className={`absolute top-0.5 left-0.5 px-1.5 py-0.2 rounded-full text-[7.5px] font-mono font-bold ${
                    isActive ? 'bg-[#eab308] text-black font-black' : 'bg-black/90 text-[#fbbf24]'
                  }`}>
                    {String(idx + 1).padStart(3, '0')}
                  </span>

                  {/* Duration Tag */}
                  <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/90 text-[7px] font-mono text-zinc-300">
                    12.0s
                  </span>
                </div>

                {/* Bottom Short Caption Slate */}
                <div className={`h-4.5 px-1.5 flex items-center justify-between text-[7.5px] border-t ${
                  isActive ? 'bg-[#121218] text-[#fbbf24] border-[#d4af37]/50' : 'bg-[#070709] text-zinc-400 border-[#272732]'
                }`}>
                  <span className="font-bold truncate max-w-[55px]">{frame.bengaliTitle || 'দৃষ্টি'}</span>
                  <span className="truncate max-w-[45px] text-zinc-500">{frame.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
