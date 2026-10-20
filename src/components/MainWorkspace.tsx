/**
 * @file /src/components/MainWorkspace.tsx
 * @description Central Studio Workspace switcher.
 * Hosts the primary STAGE (hero cinematic monitor), BOARD (7-view storyboard engines),
 * and CUT (CapCut-style multi-track video editor).
 */

import React from 'react';
import { WorkspaceMode } from '../core/theme';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { OpticalFrame } from './OpticalFrame';
import { BoardStudio } from '../features/board/BoardStudio';
import { CutStudio } from '../features/cut/CutStudio';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
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
  onCycleTitleAnimation
}) => {
  // 1. BOARD VIEW: 7 Storyboard Engines (Grid, Row Sheet, Filmstrip, Corkboard, Kanban, Timeline, Outline)
  if (activeMode === 'BOARD') {
    return (
      <main className="flex-1 w-full h-full overflow-hidden">
        <BoardStudio />
      </main>
    );
  }

  // 2. CUT VIEW: CapCut / Premiere-Style Multi-Track Sequence Editor
  if (activeMode === 'CUT') {
    return (
      <main className="flex-1 w-full h-full overflow-hidden">
        <CutStudio />
      </main>
    );
  }

  // 3. Specialized Studio Modules when in STAGE Mode
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
          {/* Top Quick-Return to Stage Navigation Bar */}
          <div className="h-9 bg-[#090A0F]/95 border-b border-white/10 px-4 flex items-center justify-between text-xs font-mono shrink-0 select-none z-20 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={onReturnToStage}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5A919] hover:bg-[#FFE066] text-black text-[11px] font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(229,169,25,0.4)]"
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
              className="px-2.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white text-[10.5px] transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10"
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

  // Default Primary Hero Mode: STAGE (Cinematic Cinema Monitor)
  return (
    <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
      <OpticalFrame
        frame={currentFrame || frames[currentIndex] || frames[0]}
        aspectRatio={aspectRatio}
        directorName={directorName}
        nodeLocation={nodeLocation}
        showHud={showHud}
        isAutoplay={isAutoplay}
        isPanActive={isPanActive}
        panOffsetPercent={panOffsetPercent}
        showGuides={showGuides}
        fitMode={fitMode}
        componentsVisibility={componentsVisibility}
        onUploadImage={onUploadImage}
        onOpenInspector={onOpenInspector}
        onQuickSampleImage={onQuickSampleImage}
        onPanChange={onPanChange}
        onOpenAnimatic={onOpenAnimatic}
        onOpenLens={onOpenLens}
        onOpenSliders={onOpenSliders}
        onOpenGrid={onOpenGrid}
        onOpenSettings={onOpenSettings}
        titleAnimation={titleAnimation}
        onCycleTitleAnimation={onCycleTitleAnimation}
        onToggleTitles={onToggleTitles}
      />

      {/* Floating Left & Right Navigation Arrows */}
      <button
        onClick={onPrevFrame}
        aria-label="Previous Frame"
        className="hidden md:flex fixed left-16 lg:left-20 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-[1px] bg-black/60 hover:bg-black/95 border border-white/10 hover:border-[#D4AF37] text-white/40 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all duration-200 items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={onNextFrame}
        aria-label="Next Frame"
        className="hidden md:flex fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-[1px] bg-black/60 hover:bg-black/95 border border-white/10 hover:border-[#D4AF37] text-white/40 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all duration-200 items-center justify-center"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </main>
  );
};
