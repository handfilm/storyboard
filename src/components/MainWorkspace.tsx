/**
 * @file /src/components/MainWorkspace.tsx
 * @description Central Studio Workspace switcher.
 * Hosts the primary STAGE (hero default), BOARD sheet, or CUT multi-track editor.
 */

import React from 'react';
import { WorkspaceMode } from '../core/theme';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { OpticalFrame } from './OpticalFrame';
import { GridView } from './GridView';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { ChevronLeft, ChevronRight, Scissors } from 'lucide-react';
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
  if (activeMode === 'BOARD') {
    return (
      <main className="flex-1 w-full h-full overflow-y-auto pt-2 pb-28 px-4 no-scrollbar">
        <GridView
          frames={frames}
          currentFrameIndex={currentIndex}
          onSelectFrame={(idx) => {
            onSelectFrame(idx);
          }}
          onPopulateSamplePack={onPopulateAllFrames}
        />
      </main>
    );
  }

  if (activeMode === 'CUT') {
    return (
      <main className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center font-mono-tech select-none">
        <div className="max-w-lg p-8 bg-[#0B0C10] border border-[#D4AF37]/40 rounded-[2px] shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col items-center gap-3">
          <div className="p-3 bg-[#D4AF37]/10 rounded-full border border-[#D4AF37]/30 text-[#FFE066]">
            <Scissors className="w-8 h-8" />
          </div>
          <h2 className="font-cinzel text-base font-bold text-white tracking-[0.2em]">
            CUT MULTI-TRACK VIDEO EDITOR
          </h2>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Multi-track sequence timeline (V1–V4, A1–A4, T1–T2) with frame-accurate video playback, Razor (C), Split (S), and Ripple Trim (B) editing tools.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-[1px] bg-amber-500/10 border border-amber-500/30 text-[9px] text-amber-300">
              CORE TIMELINE ENGINE READY
            </span>
            <span className="px-2 py-0.5 rounded-[1px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[9px] text-[#FFE066] font-bold">
              ACTIVE SEQUENCE: 100 SHOTS
            </span>
          </div>
        </div>
      </main>
    );
  }

  // Active Specialized Studio Modules
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

  // Default Primary Hero Mode: STAGE
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
