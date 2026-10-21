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
import { ChevronLeft, ChevronRight, Home, Film, SlidersHorizontal, Layers, Play, SplitSquareVertical, Sparkles } from 'lucide-react';
import { MediaStudio } from '../features/media/MediaStudio';
import { StoryNotebook } from '../features/story/StoryNotebook';
import { TextStudio } from '../features/text/TextStudio';
import { SoundStudio } from '../features/sound/SoundStudio';
import { ProductionStudio } from '../features/production/ProductionStudio';
import { ReviewStudio } from '../features/review/ReviewStudio';
import { LibraryStudio } from '../features/library/LibraryStudio';
import { AiStudio } from '../features/ai/AiStudio';
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
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
  isAudioMuted?: boolean;
  onToggleMute?: () => void;
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
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onLoadAudioFile,
  detectedBpm,
  isAudioMuted = false,
  onToggleMute
}) => {
  // Local dual-panel view selection if not externally controlled
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

  // 4. Specialized Studio Modules in STAGE Mode
  if (activeMode === 'STAGE' && activeModule && activeModule !== 'PLAYER') {
    const renderModule = () => {
      switch (activeModule) {
        case 'MEDIA': return <MediaStudio />;
        case 'STORY': return <StoryNotebook />;
        case 'TEXT': return <TextStudio />;
        case 'SOUND': return <SoundStudio />;
        case 'PRODUCTION': return <ProductionStudio />;
        case 'REVIEW': return <ReviewStudio />;
        case 'LIBRARY': return <LibraryStudio />;
        case 'AI': return <AiStudio />;
        default: return null;
      }
    };

    const moduleView = renderModule();
    if (moduleView) {
      return (
        <main className="flex-1 w-full h-full overflow-hidden flex flex-col bg-[#050508]">
          <div className="h-9 bg-[#090A0F]/95 border-b border-white/10 px-4 flex items-center justify-between text-xs font-mono shrink-0 select-none z-20 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={onReturnToStage}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#E5A919] hover:bg-[#FFE066] text-black text-[11px] font-bold tracking-wider transition-colors duration-150 cursor-pointer shadow-[0_0_12px_rgba(229,169,25,0.4)]"
                title="Return to Cinema Stage (Home)"
              >
                <Home className="w-3.5 h-3.5" />
                <span>← STAGE (HOME)</span>
              </button>
              <span className="text-white/20">|</span>
              <span className="text-[#FFE066] text-[11px] uppercase font-bold tracking-wider">
                {activeModule} MODULE ACTIVE
              </span>
            </div>

            <button
              onClick={onReturnToStage}
              className="px-2.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-[10.5px] transition-colors duration-150 cursor-pointer flex items-center gap-1.5 border border-white/10"
              title="Close module and return to viewport"
            >
              <span>Back to Viewport</span>
              <span>✕</span>
            </button>
          </div>

          <div className="flex-1 w-full h-full overflow-hidden">
            {moduleView}
          </div>
        </main>
      );
    }
  }

  // 5. Default Hero STAGE Mode with Dual-Panel Workflow
  return (
    <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-[#070709] font-mono">
      {/* Top Dual-Panel Navigation Header (Hollywood Director Chassis) */}
      <div className="h-9 bg-[#0c0c10] border-b border-[#272732] px-4 flex items-center justify-between z-20 select-none shrink-0">
        <div className="flex items-center gap-3">
          {/* Dual Panel Switcher: [TACTILE STAGE] | [DUAL STUDIO SPLIT] | [OPTICAL MONITOR] | [12.0S SEQUENCER] */}
          <div className="flex items-center bg-[#0a0a10] p-0.5 rounded-full border border-[#272732] text-[10.5px]">
            <button
              type="button"
              onClick={() => handleSelectPanel('TACTILE_STAGE')}
              className={`px-3 py-0.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                currentPanel === 'TACTILE_STAGE'
                  ? 'bg-[#eab308] text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Consolidated Tactical Stage: Glowing Bloom Viewport + 100-Shot Sequence Runner"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>TACTILE STAGE</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPanel('SPLIT')}
              className={`px-3 py-0.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                currentPanel === 'SPLIT'
                  ? 'bg-[#eab308] text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Dual-Panel Workflow: 2.39:1 Cinema Optical Monitor on top, 12.0s Sequencer below"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>DUAL STUDIO (SPLIT)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPanel('OPTICAL')}
              className={`px-3 py-0.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                currentPanel === 'OPTICAL'
                  ? 'bg-[#eab308] text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Optical Monitor: 2.39:1 Cinema canvas with permanent high-contrast transport controls"
            >
              <Film className="w-3.5 h-3.5" />
              <span>OPTICAL MONITOR</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPanel('SEQUENCER')}
              className={`px-3 py-0.5 rounded-full font-bold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                currentPanel === 'SEQUENCER'
                  ? 'bg-[#eab308] text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="12.0s Sequencer: Card order, scene labels, text cues, and asset bindings"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>12.0S SEQUENCER</span>
            </button>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Mode Tag Indicator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0a0a10] border border-[#272732] text-[10px]">
            <span className="text-zinc-500">MODE:</span>
            <span className={`font-bold ${playbackMode === 'sequence' ? 'text-emerald-400' : 'text-[#fbbf24]'}`}>
              {playbackMode === 'sequence' ? 'ANIMATIC 12.0s' : 'SOLO SCRUB 12.0s'}
            </span>
          </div>
        </div>

        {/* Right Timing Spec Pill */}
        <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#0a0a10] border border-[#272732] text-[10px] text-zinc-400">
          <span className="text-[#fbbf24] font-bold">12.000s ALLOCATION</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300">288 FRAMES @ 24FPS</span>
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
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              onLoadAudioFile={onLoadAudioFile}
              detectedBpm={detectedBpm}
              isAudioMuted={isAudioMuted}
              onToggleMute={onToggleMute}
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
