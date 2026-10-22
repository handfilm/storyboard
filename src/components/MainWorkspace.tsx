/**
 * @file /src/components/MainWorkspace.tsx
 * @description Central Studio Workspace switcher.
 * Hosts the primary STAGE with Dual-Panel Engine:
 * - "12.0S SEQUENCER": Strict 12.0s time allocation (288 frames @ 24fps) per card,
 *   card ordering, scene labels, text cues, and asset bindings.
 * - "OPTICAL MONITOR": 2.39:1 Cinema aspect ratio canvas, zero-latency rendering,
 *   high-visibility permanent transport buttons (Play, Pause, -1F, +1F, Loop),
 *   strictly zero hover scaling or tooltip popovers.
 * - BOARD (7-view storyboard engines) and CUT (CapCut-style multi-track editor).
 */

import React, { useState, useMemo } from 'react';
import { WorkspaceMode } from '../core/theme';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { OpticalFrame } from './OpticalFrame';
import { OpticalMonitor } from './player/OpticalMonitor';
import { TimelineSequencer } from './sequencer/TimelineSequencer';
import { BoardStudio } from '../features/board/BoardStudio';
import { CutStudio } from '../features/cut/CutStudio';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { ChevronLeft, ChevronRight, Home, Film, SlidersHorizontal, Layers, Play, SplitSquareVertical, Sparkles, Sliders, Maximize2 } from 'lucide-react';
import { StudioModuleId } from './LeftRail';
import { BloomInteractiveCanvas } from './stage/BloomInteractiveCanvas';
import { TactileStage } from './stage/TactileStage';
import { SlideDraft, AspectRatioType } from '../types/project';
import { PlaybackMode, SLIDE_DURATION_SEC } from '../types/editor';

interface MainWorkspaceProps {
  activeMode: WorkspaceMode;
  activeModule?: StudioModuleId;
  onReturnToStage?: () => void;
  onToggleTitles?: () => void;
  currentFrame: AnthologyFrame;
  frames: AnthologyFrame[];
  currentIndex: number;
  aspectRatio: AspectRatio;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  isPanActive: boolean;
  panOffsetPercent: number;
  showGuides: boolean;
  fitMode?: 'cover' | 'contain' | 'fill';
  componentsVisibility?: ComponentVisibility;
  onPrevFrame: () => void;
  onNextFrame: () => void;
  onSelectFrame: (index: number) => void;
  onUploadImage: (file: File) => void;
  onOpenInspector: () => void;
  onQuickSampleImage: () => void;
  onPopulateAllFrames: () => void;
  onPanChange: (newPercent: number) => void;
  onOpenAnimatic?: () => void;
  onOpenLens?: () => void;
  onOpenSliders?: () => void;
  onOpenGrid?: () => void;
  onOpenSettings?: () => void;
  titleAnimation?: 'flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter';
  onCycleTitleAnimation?: () => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  // Dual-Panel Engine & Dual-Mode Playback
  playbackMode?: PlaybackMode;
  slideTimeSec?: number;
  activeDualPanel?: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT';
  onChangeDualPanel?: (panel: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT') => void;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  onTogglePlay?: () => void;
  onStepFrame?: (forward: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalSec: number) => void;
  onChangeAspectRatio?: (ratio: AspectRatio) => void;
  onAddSlide?: () => void;
  onDuplicateSlide?: (index: number) => void;
  onDeleteSlide?: (index: number) => void;
  onUpdateSlide?: (index: number, partial: Partial<SlideDraft>) => void;
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

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  activeMode,
  activeModule,
  onReturnToStage,
  onToggleTitles,
  currentFrame,
  frames,
  currentIndex,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  isPanActive,
  panOffsetPercent,
  showGuides,
  fitMode = 'cover',
  componentsVisibility,
  onPrevFrame,
  onNextFrame,
  onSelectFrame,
  onUploadImage,
  onOpenInspector,
  onQuickSampleImage,
  onPopulateAllFrames,
  onPanChange,
  onOpenAnimatic,
  onOpenLens,
  onOpenSliders,
  onOpenGrid,
  onOpenSettings,
  titleAnimation,
  onCycleTitleAnimation,
  onReorderFrames,
  onUpdateFrame,
  playbackMode = 'sequence',
  slideTimeSec = 0,
  activeDualPanel = 'TACTILE_STAGE',
  onChangeDualPanel,
  onSelectPlaybackMode,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onChangeAspectRatio,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onUpdateSlide,
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
  onToggleMute,
  onOpenCinemaPlayer
}) => {
  // Local dual-panel view selection if not externally controlled (TACTILE STAGE is the default primary stage)
  const [localDualPanel, setLocalDualPanel] = useState<'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT'>(activeDualPanel || 'TACTILE_STAGE');
  const currentPanel = onChangeDualPanel ? (activeDualPanel || 'TACTILE_STAGE') : localDualPanel;

  const handleSelectPanel = (panel: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT') => {
    if (onChangeDualPanel) {
      onChangeDualPanel(panel);
    } else {
      setLocalDualPanel(panel);
    }
  };

  const [isLooping, setIsLooping] = useState(true);

  // Convert AnthologyFrames into SlideDrafts with strict 12.0s durations
  const slides: SlideDraft[] = useMemo(() => {
    return frames.map((f, i) => ({
      id: `slide_${f.id ?? i}`,
      orderIndex: i,
      duration: SLIDE_DURATION_SEC, // Strictly 12.0s
      remoteUrl: f.imageUrl,
      titleBn: f.bengaliTitle,
      titleEn: f.title,
      tagline: f.tagline,
      directorNotes: f.directorNotes,
      soundCue: f.soundCue,
      aspectRatio: aspectRatio as AspectRatioType,
      colorAccent: f.colorAccent,
      lutFilter: f.lutFilter,
      isVideo: f.isVideo,
      panY: panOffsetPercent,
      cameraSpec: f.cameraSpec
    }));
  }, [frames, aspectRatio, panOffsetPercent]);

  // Handle slide updates and reflect to parent frame
  const handleUpdateSlideInternal = (index: number, partial: Partial<SlideDraft>) => {
    if (onUpdateSlide) {
      onUpdateSlide(index, partial);
    }
    if (onUpdateFrame && frames[index]) {
      const original = frames[index];
      onUpdateFrame({
        ...original,
        title: partial.titleEn !== undefined ? partial.titleEn : original.title,
        bengaliTitle: partial.titleBn !== undefined ? partial.titleBn : original.bengaliTitle,
        directorNotes: partial.directorNotes !== undefined ? partial.directorNotes : original.directorNotes,
        soundCue: partial.soundCue !== undefined ? partial.soundCue : original.soundCue,
        imageUrl: partial.remoteUrl !== undefined ? partial.remoteUrl : original.imageUrl
      });
    }
  };

  // 1. BLOOM VIEW (Consolidated with Tactile Cinema Stage)
  if (activeMode === 'BLOOM') {
    return (
      <main className="flex-1 w-full h-full overflow-hidden bg-[#07070A]">
        <TactileStage
          frames={frames}
          currentIndex={currentIndex}
          currentFrame={currentFrame}
          aspectRatio={aspectRatio}
          directorName={directorName}
          nodeLocation={nodeLocation}
          showHud={showHud}
          isAutoplay={isAutoplay}
          componentsVisibility={componentsVisibility}
          onSelectFrame={onSelectFrame}
          onUpdateFrame={onUpdateFrame}
          onReorderFrames={onReorderFrames}
          onUploadImage={onUploadImage}
          onOpenAnimatic={onOpenAnimatic}
          onOpenInspector={onOpenInspector}
          onToggleTitles={onToggleTitles}
          showTitles={true}
          playbackMode={playbackMode}
          onSelectPlaybackMode={onSelectPlaybackMode}
          slideTimeSec={slideTimeSec}
          onTogglePlay={onTogglePlay}
          onStepFrame={onStepFrame}
          onScrubSlideTime={onScrubSlideTime}
          onScrubGlobalTime={onScrubGlobalTime}
          playbackSpeed={playbackSpeed}
          onChangePlaybackSpeed={onChangePlaybackSpeed}
          onPurgeMedia={onPurgeMedia}
          projectTitle={projectTitle}
          onOpenExportTimeline={onOpenExportTimeline}
          isSnapToBeat={isSnapToBeat}
          onToggleSnapToBeat={onToggleSnapToBeat}
          onLoadAudioFile={onLoadAudioFile}
          detectedBpm={detectedBpm}
          isAudioMuted={isAudioMuted}
          onToggleMute={onToggleMute}
        />
      </main>
    );
  }

  // 2. BOARD VIEW
  if (activeMode === 'BOARD') {
    return (
      <main className="flex-1 w-full h-full overflow-hidden">
        <BoardStudio />
      </main>
    );
  }

  // 3. CUT VIEW
  if (activeMode === 'CUT') {
    return (
      <main className="flex-1 w-full h-full overflow-hidden">
        <CutStudio />
      </main>
    );
  }

  // 4. Default Hero STAGE Mode with Dual-Panel Workflow (Exclusively renders the 2.39:1 anamorphic monitor)
  return (
    <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-[#070709] font-mono">
      {/* Consolidated Master Navigation Header */}
      <div className="h-9 bg-[#0c0c10] border-b border-[#272732] px-4 flex items-center justify-between z-20 select-none shrink-0">
        <div className="flex items-center gap-2">
          {/* Panel Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#0a0a10] border border-[#272732] rounded-full p-0.5">
            <button
              type="button"
              onClick={() => handleSelectPanel('TACTILE_STAGE')}
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                currentPanel === 'TACTILE_STAGE'
                  ? 'bg-[#1a1a24] text-[#fbbf24] border border-[#d4af37]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Stage Viewport with 100-Shot Sequence Runner"
            >
              <Film className="w-3 h-3 text-[#eab308]" />
              <span>Stage</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPanel('SPLIT')}
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                currentPanel === 'SPLIT'
                  ? 'bg-[#1a1a24] text-[#fbbf24] border border-[#d4af37]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="12.0s Reels Viewport & Timeline Sequencer"
            >
              <Sliders className="w-3 h-3 text-[#38bdf8]" />
              <span>12.0s Reels</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPanel('OPTICAL')}
              className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                currentPanel === 'OPTICAL'
                  ? 'bg-[#1a1a24] text-[#fbbf24] border border-[#d4af37]/40 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Advanced Monitor & JKL Transport"
            >
              <Maximize2 className="w-3 h-3 text-emerald-400" />
              <span>Monitor</span>
            </button>
          </div>

          <span className="text-zinc-700 hidden sm:inline">|</span>

          {/* Active Shot Telemetry */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0a0a10] border border-[#272732] text-[10px] truncate max-w-[240px] xl:max-w-[360px]">
            <span className="text-[#fbbf24] font-bold shrink-0">
              SH{String(currentIndex + 1).padStart(3, '0')} / {String(frames.length).padStart(3, '0')}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-200 font-bold truncate">
              {currentFrame?.bengaliTitle || 'দৃষ্টি'} // {currentFrame?.title || 'THE SINGULARITY'}
            </span>
          </div>
        </div>

        {/* Right Timing Spec & Mode Capsules */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#0a0a10] border border-[#272732] text-[10px] text-zinc-400 font-mono">
            <span className="text-[#fbbf24] font-bold">12.000s ALLOCATION</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300">288 FRAMES @ 24FPS</span>
          </div>

          {/* Solo / Sequence Mode Pill */}
          {onSelectPlaybackMode && (
            <button
              type="button"
              onClick={() => onSelectPlaybackMode(playbackMode === 'sequence' ? 'solo' : 'sequence')}
              className={`px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider transition-colors duration-150 ease-out cursor-pointer border active:scale-[0.98] ${
                playbackMode === 'sequence'
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/70 border-[#eab308]/60 text-[#fbbf24]'
              }`}
              title="Toggle between 12s Animatic Sequence advance and Solo Scrub"
            >
              {playbackMode === 'sequence' ? '▶ ANIMATIC (12s)' : '🔍 SOLO SCRUB'}
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Content based on active panel */}
      <div className="flex-1 w-full relative flex flex-col overflow-hidden">
        {/* VIEW 0: TACTILE STAGE (Consolidated Primary View: Glowing Bloom Stage + 100-Shot Sequence Runner) */}
        {currentPanel === 'TACTILE_STAGE' && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <TactileStage
              frames={frames}
              currentIndex={currentIndex}
              currentFrame={currentFrame}
              aspectRatio={aspectRatio}
              directorName={directorName}
              nodeLocation={nodeLocation}
              showHud={showHud}
              isAutoplay={isAutoplay}
              componentsVisibility={componentsVisibility}
              onSelectFrame={onSelectFrame}
              onUpdateFrame={onUpdateFrame}
              onReorderFrames={onReorderFrames}
              onUploadImage={onUploadImage}
              onOpenAnimatic={onOpenAnimatic}
              onOpenInspector={onOpenInspector}
              onToggleTitles={onToggleTitles}
              showTitles={true}
              playbackMode={playbackMode}
              onSelectPlaybackMode={onSelectPlaybackMode}
              slideTimeSec={slideTimeSec}
              onTogglePlay={onTogglePlay}
              onStepFrame={onStepFrame}
              onScrubSlideTime={onScrubSlideTime}
              onScrubGlobalTime={onScrubGlobalTime}
              playbackSpeed={playbackSpeed}
              onChangePlaybackSpeed={onChangePlaybackSpeed}
              onPurgeMedia={onPurgeMedia}
              projectTitle={projectTitle}
              onOpenExportTimeline={onOpenExportTimeline}
              onOpenExportRange={onOpenExportRange}
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              onLoadAudioFile={onLoadAudioFile}
              detectedBpm={detectedBpm}
              isAudioMuted={isAudioMuted}
              onToggleMute={onToggleMute}
              onOpenCinemaPlayer={onOpenCinemaPlayer}
            />
          </div>
        )}

        {/* VIEW 1: DUAL STUDIO SPLIT (Top: Optical Monitor, Bottom: Timeline Sequencer) */}
        {currentPanel === 'SPLIT' && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Top: 2.39:1 Optical Monitor Canvas */}
            <div className="flex-1 min-h-[340px] w-full flex items-center justify-center overflow-hidden border-b border-[#1C1C24] p-2">
              <OpticalMonitor
                currentSlide={slides[currentIndex]}
                nextSlide={slides[(currentIndex + 1) % slides.length]}
                currentIndex={currentIndex}
                totalSlides={slides.length}
                aspectRatio={aspectRatio as AspectRatioType}
                playbackMode={playbackMode}
                isPlaying={isAutoplay}
                isLooping={isLooping}
                slideTimeSec={slideTimeSec}
                playbackSpeed={playbackSpeed}
                onChangePlaybackSpeed={onChangePlaybackSpeed}
                onTogglePlay={onTogglePlay || (() => {})}
                onToggleLoop={() => setIsLooping(l => !l)}
                onStepFrame={onStepFrame || (() => {})}
                onScrubSlideTime={onScrubSlideTime || (() => {})}
                onScrubGlobalTime={onScrubGlobalTime}
                onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
                onChangeAspectRatio={onChangeAspectRatio || (() => {})}
                onUploadMedia={onUploadImage}
                onPurgeMedia={onPurgeMedia}
                onOpenCinemaPlayer={onOpenCinemaPlayer}
                projectTitle={projectTitle}
              />
            </div>

            {/* Bottom: 12.0S Sequencer (Card Ordering, Scene Labels, Text Cues, Scrub) */}
            <div className="h-[275px] w-full shrink-0 overflow-hidden">
              <TimelineSequencer
                slides={slides}
                activeSlideIndex={currentIndex}
                playbackMode={playbackMode}
                isPlaying={isAutoplay}
                slideTimeSec={slideTimeSec}
                onSelectSlide={onSelectFrame}
                onTogglePlay={onTogglePlay || (() => {})}
                onStepFrame={onStepFrame || (() => {})}
                onScrubSlideTime={onScrubSlideTime || (() => {})}
                onScrubGlobalTime={onScrubGlobalTime}
                onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
                onAddSlide={onAddSlide || (() => {})}
                onDuplicateSlide={onDuplicateSlide || (() => {})}
                onDeleteSlide={onDeleteSlide || (() => {})}
                onReorderSlides={(reordered) => {
                  if (onReorderFrames) {
                    const newFrames = reordered.map((s, idx) => {
                      const original = frames[idx] || frames[0];
                      return {
                        ...original,
                        title: s.titleEn || original.title,
                        bengaliTitle: s.titleBn || original.bengaliTitle,
                        imageUrl: s.remoteUrl || original.imageUrl
                      };
                    });
                    onReorderFrames(newFrames);
                  }
                }}
                onUpdateSlide={handleUpdateSlideInternal}
                onUploadMedia={(idx, file) => {
                  onSelectFrame(idx);
                  onUploadImage(file);
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: OPTICAL MONITOR (Expanded Canvas) */}
        {currentPanel === 'OPTICAL' && (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 overflow-hidden">
            <OpticalMonitor
              currentSlide={slides[currentIndex]}
              nextSlide={slides[(currentIndex + 1) % slides.length]}
              currentIndex={currentIndex}
              totalSlides={slides.length}
              aspectRatio={aspectRatio as AspectRatioType}
              playbackMode={playbackMode}
              isPlaying={isAutoplay}
              isLooping={isLooping}
              slideTimeSec={slideTimeSec}
              playbackSpeed={playbackSpeed}
              onChangePlaybackSpeed={onChangePlaybackSpeed}
              onTogglePlay={onTogglePlay || (() => {})}
              onToggleLoop={() => setIsLooping(l => !l)}
              onStepFrame={onStepFrame || (() => {})}
              onScrubSlideTime={onScrubSlideTime || (() => {})}
              onScrubGlobalTime={onScrubGlobalTime}
              onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
              onChangeAspectRatio={onChangeAspectRatio || (() => {})}
              onUploadMedia={onUploadImage}
              onPurgeMedia={onPurgeMedia}
              onOpenCinemaPlayer={onOpenCinemaPlayer}
              projectTitle={projectTitle}
            />
          </div>
        )}

        {/* VIEW 3: 12.0S SEQUENCER (Expanded Full-Screen Manager) */}
        {currentPanel === 'SEQUENCER' && (
          <div className="w-full h-full overflow-hidden">
            <TimelineSequencer
              slides={slides}
              activeSlideIndex={currentIndex}
              playbackMode={playbackMode}
              isPlaying={isAutoplay}
              slideTimeSec={slideTimeSec}
              onSelectSlide={onSelectFrame}
              onTogglePlay={onTogglePlay || (() => {})}
              onStepFrame={onStepFrame || (() => {})}
              onScrubSlideTime={onScrubSlideTime || (() => {})}
              onScrubGlobalTime={onScrubGlobalTime}
              onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
              onAddSlide={onAddSlide || (() => {})}
              onDuplicateSlide={onDuplicateSlide || (() => {})}
              onDeleteSlide={onDeleteSlide || (() => {})}
              onReorderSlides={(reordered) => {
                if (onReorderFrames) {
                  const newFrames = reordered.map((s, idx) => {
                    const original = frames[idx] || frames[0];
                    return {
                      ...original,
                      title: s.titleEn || original.title,
                      bengaliTitle: s.titleBn || original.bengaliTitle,
                      imageUrl: s.remoteUrl || original.imageUrl
                    };
                  });
                  onReorderFrames(newFrames);
                }
              }}
              onUpdateSlide={handleUpdateSlideInternal}
              onUploadMedia={(idx, file) => {
                onSelectFrame(idx);
                onUploadImage(file);
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
};
