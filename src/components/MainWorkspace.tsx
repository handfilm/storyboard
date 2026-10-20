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
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaStudio } from '../features/media/MediaStudio';
import { StoryNotebook } from '../features/story/StoryNotebook';
import { TextStudio } from '../features/text/TextStudio';
import { SoundStudio } from '../features/sound/SoundStudio';
import { ProductionStudio } from '../features/production/ProductionStudio';
import { ReviewStudio } from '../features/review/ReviewStudio';
import { LibraryStudio } from '../features/library/LibraryStudio';
import { AiStudio } from '../features/ai/AiStudio';
import { StudioModuleId } from './LeftRail';

interface MainWorkspaceProps {
  activeMode: WorkspaceMode;
  activeModule?: StudioModuleId;
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
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  activeMode,
  activeModule,
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
  onPanChange
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
    if (activeModule === 'MEDIA') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <MediaStudio />
        </main>
      );
    }
    if (activeModule === 'STORY') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <StoryNotebook />
        </main>
      );
    }
    if (activeModule === 'TEXT') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <TextStudio />
        </main>
      );
    }
    if (activeModule === 'SOUND') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <SoundStudio />
        </main>
      );
    }
    if (activeModule === 'PRODUCTION') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <ProductionStudio />
        </main>
      );
    }
    if (activeModule === 'REVIEW') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <ReviewStudio />
        </main>
      );
    }
    if (activeModule === 'LIBRARY') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <LibraryStudio />
        </main>
      );
    }
    if (activeModule === 'AI') {
      return (
        <main className="flex-1 w-full h-full overflow-hidden">
          <AiStudio />
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
