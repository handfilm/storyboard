/**
 * RAWx Studio — Master Studio Shell (CSS Grid)
 * Public API: StudioShell component
 * Orchestrates TopBar, LeftRail, MainWorkspace, RightInspector, and BottomDock without clipping or overlapping.
 */

import React from 'react';
import { useStudioStore } from '../../core/store';
import { TopBar } from './TopBar';
import { LeftRail } from './LeftRail';
import { RightInspector } from './RightInspector';
import { BottomDock } from './BottomDock';
import { CinemaStage } from '../../features/player/CinemaStage';
import { LiquifyModal } from '../../features/edit/LiquifyModal';
import { CommandPalette } from '../components/CommandPalette';
import { ShortcutModal } from '../components/ShortcutModal';
import { SelfTestPanel } from '../components/SelfTestPanel';
import { ExportGitModal } from '../../features/export/ExportGitModal';

import { StoryNotebook } from '../../features/story/StoryNotebook';
import { BoardStudio } from '../../features/board/BoardStudio';
import { MediaStudio } from '../../features/media/MediaStudio';
import { TextStudio } from '../../features/text/TextStudio';
import { ColorStudio } from '../../features/color/ColorStudio';
import { SoundStudio } from '../../features/sound/SoundStudio';
import { PrevisStudio } from '../../features/previs/PrevisStudio';
import { ProductionStudio } from '../../features/production/ProductionStudio';
import { ReviewStudio } from '../../features/review/ReviewStudio';
import { AiStudio } from '../../features/ai/AiStudio';
import { LibraryStudio } from '../../features/library/LibraryStudio';
import { SettingsStudio } from '../../features/settings/SettingsStudio';

export const StudioShell: React.FC = () => {
  const {
    activeModule,
    isZenMode,
    toggleZenMode
  } = useStudioStore();

  return (
    <div className="w-screen h-screen bg-[#050505] text-[#EDEDED] flex flex-col overflow-hidden font-mono select-none">
      {/* Zen Cinema Exit Overlay */}
      {isZenMode && (
        <button
          onClick={toggleZenMode}
          className="fixed top-3 right-3 z-50 px-3 py-1 bg-black/80 hover:bg-black border border-[#D4AF37] rounded-full text-xs font-mono text-[#FFE066] shadow-2xl transition-all"
          title="Exit Clean Zen Cinema (Z / ESC)"
        >
          EXIT ZEN [ESC]
        </button>
      )}

      {/* TopBar (Hidden in Zen Mode) */}
      {!isZenMode && <TopBar />}

      {/* Middle Workspace Area (LeftRail + Content + RightInspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LeftRail Module Navigator (Hidden in Zen Mode) */}
        {!isZenMode && <LeftRail />}

        {/* Master Content Area */}
        <main className="flex-1 h-full overflow-hidden relative bg-[#030304]">
          {/* Active Module Router */}
          {activeModule === 'PLAYER' && <CinemaStage />}
          {activeModule === 'STORY' && <StoryNotebook />}
          {activeModule === 'BOARD' && <BoardStudio />}
          {activeModule === 'MEDIA' && <MediaStudio />}
          {activeModule === 'TEXT' && <TextStudio />}
          {activeModule === 'EDIT' && <CinemaStage />}
          {activeModule === 'COLOR' && <ColorStudio />}
          {activeModule === 'SOUND' && <SoundStudio />}
          {activeModule === 'PREVIS' && <PrevisStudio />}
          {activeModule === 'PRODUCTION' && <ProductionStudio />}
          {activeModule === 'REVIEW' && <ReviewStudio />}
          {activeModule === 'LIBRARY' && <LibraryStudio />}
          {activeModule === 'AI' && <AiStudio />}
          {activeModule === 'SETTINGS' && <SettingsStudio />}
          {activeModule === 'EXPORT' && <CinemaStage />}
        </main>

        {/* Right Contextual Inspector (Hidden in Zen Mode) */}
        {!isZenMode && <RightInspector />}
      </div>

      {/* BottomDock Transport & Timeline (Hidden in Zen Mode) */}
      {!isZenMode && <BottomDock />}

      {/* Studio Modals */}
      <CommandPalette />
      <ShortcutModal />
      <SelfTestPanel />
      <LiquifyModal />
      <ExportGitModal />
    </div>
  );
};
