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

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceMode } from '../core/theme';
import { useStudioStore } from '../core/store';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { OpticalFrame } from './OpticalFrame';
import { OpticalMonitor } from './player/OpticalMonitor';
import { ReelsView } from './ReelsView';
import { TimelineSequencer } from './sequencer/TimelineSequencer';
import { ScrubPanel } from './scrub/ScrubPanel';
import { BoardStudio } from '../features/board/BoardStudio';
import { CutStudio } from '../features/cut/CutStudio';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { ChevronLeft, ChevronRight, Home, Film, SlidersHorizontal, Layers, Play, SplitSquareVertical, Sparkles, Sliders, Maximize2 } from 'lucide-react';
import { StudioModuleId } from './LeftRail';
import { BloomInteractiveCanvas } from './stage/BloomInteractiveCanvas';
import { TactileStage } from './stage/TactileStage';
import { StageHeader, StagePanelType } from './StageHeader';
import { MultiCamGridMonitor } from './multicam/MultiCamGridMonitor';
import { MultiCamGroup } from '../types/multicam';
import { MultiCamGridConfig } from './multicam/MultiCamViewportGrid';
import { SlideDraft, AspectRatioType } from '../types/project';
import { PlaybackMode } from '../types/editor';
import {
  clampShotDuration,
  getShotDurationSec,
  getShotTargetFps
} from '../types/storyboard';

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
  onUpdateFrameAtIndex?: (index: number, frame: AnthologyFrame) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  // Dual-Panel Engine & Dual-Mode Playback
  playbackMode?: PlaybackMode;
  slideTimeSec?: number;
  activeDualPanel?: StagePanelType;
  onChangeDualPanel?: (panel: StagePanelType) => void;
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
  multiCamGroup?: MultiCamGroup;
  onUpdateMultiCamGroup?: (group: MultiCamGroup) => void;
  multiCamLayoutConfig?: MultiCamGridConfig;
  onChangeMultiCamLayoutConfig?: (config: MultiCamGridConfig) => void;
  onOpenRecorder?: () => void;
  onOpenExport?: () => void;
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
  onUpdateFrameAtIndex,
  onApplyDurationToAll,
  onMatchAudioBeats,
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
  onOpenCinemaPlayer,
  multiCamGroup,
  onUpdateMultiCamGroup,
  multiCamLayoutConfig,
  onChangeMultiCamLayoutConfig,
  onOpenRecorder,
  onOpenExport
}) => {
  // Local dual-panel view selection if not externally controlled (TACTILE STAGE is the default primary stage)
  const [localDualPanel, setLocalDualPanel] = useState<StagePanelType>(activeDualPanel || 'TACTILE_STAGE');
  const currentPanel = onChangeDualPanel ? (activeDualPanel || 'TACTILE_STAGE') : localDualPanel;

  const handleSelectPanel = (panel: StagePanelType) => {
    if (onChangeDualPanel) {
      onChangeDualPanel(panel);
    } else {
      setLocalDualPanel(panel);
    }
  };

  const [isLooping, setIsLooping] = useState(true);

  const storeTitlesAll = useStudioStore((s) => s.visibility.titlesAll);
  const storeShowTitles = useStudioStore((s) => s.titleConfig?.showTitles ?? true);

  // Explicitly evaluate component visibility state for title elements in MainWorkspace
  const isTitleVisible = useMemo(() => {
    if (componentsVisibility !== undefined) {
      const hasEnabledTitleLayer =
        componentsVisibility.titleBn !== false ||
        componentsVisibility.titleEn !== false ||
        componentsVisibility.tagline !== false;
      return Boolean(componentsVisibility.titlesAll && hasEnabledTitleLayer);
    }
    return Boolean(storeTitlesAll && storeShowTitles);
  }, [componentsVisibility, storeTitlesAll, storeShowTitles]);

  useEffect(() => {
    console.log('[MainWorkspace] Title visibility state change -> triggering workspace title re-render:', {
      isTitleVisible,
      titlesAll: componentsVisibility?.titlesAll,
      titleBn: componentsVisibility?.titleBn,
      titleEn: componentsVisibility?.titleEn,
      tagline: componentsVisibility?.tagline,
      storeTitlesAll,
      storeShowTitles,
      activeMode,
      currentPanel,
      currentIndex
    });
  }, [
    isTitleVisible,
    componentsVisibility?.titlesAll,
    componentsVisibility?.titleBn,
    componentsVisibility?.titleEn,
    componentsVisibility?.tagline,
    storeTitlesAll,
    storeShowTitles,
    activeMode,
    currentPanel,
    currentIndex
  ]);

  // Convert AnthologyFrames into Elastic Multi-Cadence SlideDrafts
  const slides: SlideDraft[] = useMemo(() => {
    return frames.map((f, i) => {
      const dur = getShotDurationSec(f, 12.0);
      const fps = getShotTargetFps(f, 24);
      return {
        id: `slide_${f.id ?? i}`,
        orderIndex: i,
        duration: dur,
        durationSec: dur,
        targetFps: fps,
        inPointMs: f.inPointMs,
        outPointMs: f.outPointMs,
        beatSnapEnabled: f.beatSnapEnabled,
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
      };
    });
  }, [frames, aspectRatio, panOffsetPercent]);

  // Handle slide updates (including variable durationSec & targetFps) and reflect to parent frame
  const handleUpdateSlideInternal = (index: number, partial: Partial<SlideDraft>) => {
    if (onUpdateSlide) {
      onUpdateSlide(index, partial);
    }
    if (frames[index]) {
      const original = frames[index];
      const nextDuration =
        partial.durationSec !== undefined
          ? clampShotDuration(partial.durationSec)
          : partial.duration !== undefined
          ? clampShotDuration(partial.duration)
          : getShotDurationSec(original, 12.0);

      const updatedFrame: AnthologyFrame = {
        ...original,
        title: partial.titleEn !== undefined ? partial.titleEn : original.title,
        bengaliTitle: partial.titleBn !== undefined ? partial.titleBn : original.bengaliTitle,
        directorNotes: partial.directorNotes !== undefined ? partial.directorNotes : original.directorNotes,
        soundCue: partial.soundCue !== undefined ? partial.soundCue : original.soundCue,
        imageUrl: partial.remoteUrl !== undefined ? partial.remoteUrl : original.imageUrl,
        slideHoldSec: nextDuration,
        durationSec: nextDuration,
        targetFps: partial.targetFps !== undefined ? partial.targetFps : original.targetFps,
        inPointMs: partial.inPointMs !== undefined ? partial.inPointMs : original.inPointMs,
        outPointMs: partial.outPointMs !== undefined ? partial.outPointMs : original.outPointMs,
        beatSnapEnabled: partial.beatSnapEnabled !== undefined ? partial.beatSnapEnabled : original.beatSnapEnabled
      };

      if (onUpdateFrameAtIndex) {
        onUpdateFrameAtIndex(index, updatedFrame);
      } else if (onUpdateFrame) {
        onUpdateFrame(updatedFrame);
      }
    }
  };

  const handleActiveShotDurationChange = (newDurationSec: number) => {
    handleUpdateSlideInternal(currentIndex, {
      duration: clampShotDuration(newDurationSec),
      durationSec: clampShotDuration(newDurationSec)
    });
  };

  const handleActiveShotFpsChange = (newFps: number) => {
    handleUpdateSlideInternal(currentIndex, {
      targetFps: newFps === 60 ? 60 : 24
    });
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
          onUpdateFrameAtIndex={onUpdateFrameAtIndex}
          onApplyDurationToAll={onApplyDurationToAll}
          onMatchAudioBeats={onMatchAudioBeats}
          onReorderFrames={onReorderFrames}
          onUploadImage={onUploadImage}
          onOpenAnimatic={onOpenAnimatic}
          onOpenInspector={onOpenInspector}
          onToggleTitles={onToggleTitles}
          showTitles={isTitleVisible}
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
        <CutStudio onOpenMultiCam={() => {
          if (onReturnToStage) onReturnToStage();
          handleSelectPanel('MULTICAM');
        }} />
      </main>
    );
  }

  // 4. Default Hero STAGE Mode with Dual-Panel Workflow (Exclusively renders the 2.39:1 anamorphic monitor)
  return (
    <main className="relative flex-1 w-full h-full flex flex-col overflow-hidden bg-[#070709] font-mono">
      {/* Main Viewport Content based on active panel with GPU Cross-Dissolve */}
      <div className="flex-1 w-full relative grid grid-cols-1 grid-rows-1 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentPanel}
            initial={{ opacity: 0, scale: 0.994 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.004 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="col-start-1 row-start-1 w-full h-full flex flex-col overflow-hidden transform-gpu will-change-[opacity,transform]"
          >
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
              onUpdateFrameAtIndex={onUpdateFrameAtIndex}
              onApplyDurationToAll={onApplyDurationToAll}
              onMatchAudioBeats={onMatchAudioBeats}
              onReorderFrames={onReorderFrames}
              onUploadImage={onUploadImage}
              onOpenAnimatic={onOpenAnimatic}
              onOpenInspector={onOpenInspector}
              onToggleTitles={onToggleTitles}
              showTitles={isTitleVisible}
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
              activeModule={activeModule}
            />
          </div>
        )}

        {/* VIEW 1: DUAL STUDIO SPLIT (Top: Elastic Reels Viewport, Bottom: Timeline Sequencer) */}
        {currentPanel === 'SPLIT' && (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <div className="flex-1 min-h-[340px] w-full flex items-center justify-center overflow-hidden border-b border-[#1C1C24]">
              <ReelsView
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
                onChangeSlideDuration={handleActiveShotDurationChange}
                onChangeTargetFps={handleActiveShotFpsChange}
                onApplyDurationToAll={onApplyDurationToAll}
                isSnapToBeat={isSnapToBeat}
                onToggleSnapToBeat={onToggleSnapToBeat}
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
                showTitles={isTitleVisible}
                componentsVisibility={componentsVisibility}
                defaultSafeZone="bottom"
              />
            </div>

            {/* Bottom: Elastic Multi-Cadence Sequencer */}
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
                      const original = frames[s.orderIndex ?? idx] || frames[idx] || frames[0];
                      const dur = getShotDurationSec(s, getShotDurationSec(original, 12.0));
                      return {
                        ...original,
                        title: s.titleEn || original.title,
                        bengaliTitle: s.titleBn || original.bengaliTitle,
                        imageUrl: s.remoteUrl || original.imageUrl,
                        slideHoldSec: dur,
                        durationSec: dur,
                        targetFps: s.targetFps ?? original.targetFps
                      };
                    });
                    onReorderFrames(newFrames);
                  }
                }}
                onUpdateSlide={handleUpdateSlideInternal}
                onApplyDurationToAll={onApplyDurationToAll}
                onMatchAudioBeats={onMatchAudioBeats}
                isSnapToBeat={isSnapToBeat}
                onToggleSnapToBeat={onToggleSnapToBeat}
                onLoadAudioFile={onLoadAudioFile}
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
              onChangeSlideDuration={handleActiveShotDurationChange}
              onChangeTargetFps={handleActiveShotFpsChange}
              onApplyDurationToAll={onApplyDurationToAll}
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
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
              showTitles={isTitleVisible}
              componentsVisibility={componentsVisibility}
            />
          </div>
        )}

        {/* VIEW 3: SCRUB PANEL (Full-Screen Sub-Frame Precision Timeline & Card Management) */}
        {currentPanel === 'SEQUENCER' && (
          <div className="w-full h-full overflow-hidden">
            <ScrubPanel
              slides={slides}
              activeSlideIndex={currentIndex}
              playbackMode={playbackMode}
              isPlaying={isAutoplay}
              slideTimeSec={slideTimeSec}
              aspectRatio={aspectRatio as AspectRatioType}
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
                    const original = frames[s.orderIndex ?? idx] || frames[idx] || frames[0];
                    const dur = getShotDurationSec(s, getShotDurationSec(original, 12.0));
                    return {
                      ...original,
                      title: s.titleEn || original.title,
                      bengaliTitle: s.titleBn || original.bengaliTitle,
                      imageUrl: s.remoteUrl || original.imageUrl,
                      slideHoldSec: dur,
                      durationSec: dur,
                      targetFps: s.targetFps ?? original.targetFps
                    };
                  });
                  onReorderFrames(newFrames);
                }
              }}
              onUpdateSlide={handleUpdateSlideInternal}
              onApplyDurationToAll={onApplyDurationToAll}
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              onUploadMedia={(idx, file) => {
                onSelectFrame(idx);
                onUploadImage(file);
              }}
              playbackSpeed={playbackSpeed}
              onChangePlaybackSpeed={onChangePlaybackSpeed}
              projectTitle={projectTitle}
            />
          </div>
        )}

        {/* VIEW 4: MULTI-CAMERA LIVE CUTTING & EDITING VIEWPORT */}
        {currentPanel === 'MULTICAM' && (
          <div className="w-full h-full overflow-hidden flex flex-col">
            <MultiCamGridMonitor
              isInline={true}
              isOpen={true}
              group={multiCamGroup}
              layoutConfig={multiCamLayoutConfig}
              onChangeLayoutConfig={onChangeMultiCamLayoutConfig}
              onClose={() => handleSelectPanel('TACTILE_STAGE')}
              onSaveGroup={onUpdateMultiCamGroup}
            />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
};
