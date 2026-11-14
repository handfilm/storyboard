/**
 * @file /src/components/mobile/MobilePortraitWorkspace.tsx
 * @description Dedicated CapCut-style Mobile Portrait NLE Workspace (< 768px):
 * 1. Minimal Mobile Top Bar (48px height, 4 items max)
 * 2. Unobstructed Center Preview Stage (~45% viewport height) + 40px Transport Bar
 * 3. Clean Mobile Multi-Track Timeline (~30% viewport height)
 * 4. Single Bottom Icon Dock (56px) + Compact Slide-Up Contextual Sheet (lower 38% viewport height)
 * 5. Slide-over Mobile Menu Drawer collapsing secondary desktop items
 */

import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode } from '../../types/editor';
import { WorkspaceMode } from '../../core/theme';
import { StudioModuleId } from '../LeftRail';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { getShotDurationSec } from '../../types/storyboard';
import { pack12sHyperReel } from '../../utils/speedReelsEngine';
import { useStudioStore } from '../../core/store';
import { TactileStage } from '../stage/TactileStage';
import { BoardStudio } from '../../features/board/BoardStudio';
import { CutStudio } from '../../features/cut/CutStudio';
import { MobileTopBar } from './MobileTopBar';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { MobileTransportBar } from './MobileTransportBar';
import { MobileMultiTrackTimeline } from './MobileMultiTrackTimeline';
import { MobileBottomDockAndSheet, MobileDockTabId } from './MobileBottomDockAndSheet';

export interface MobilePortraitWorkspaceProps {
  projectTitle: string;
  directorName: string;
  nodeLocation: string;
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  workspaceMode: WorkspaceMode;
  activeModule: StudioModuleId;
  isPlaying: boolean;
  showHud: boolean;
  aspectRatio: AspectRatio;
  fitMode: 'cover' | 'contain' | 'fill';
  playbackMode: PlaybackMode;
  slideTimeSec: number;
  playbackSpeed: number;
  seekVersion: number;
  isFullscreen: boolean;
  isAudioMuted: boolean;
  audioVolume: number;
  isSnapToBeat: boolean;
  detectedBpm: number;
  componentsVisibility: ComponentVisibility;
  canUndo: boolean;
  canRedo: boolean;
  onSelectFrame: (idx: number) => void;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onUpdateFrameAtIndex: (idx: number, updated: AnthologyFrame) => void;
  onCommitSlidesNle: (nextSlides: SlideDraft[], nextActiveIndex: number, nextLocalTimeSec: number) => void;
  onTogglePlay: () => void;
  onStepFrame: (forward: boolean) => void;
  onScrubSlideTime: (timeSec: number) => void;
  onScrubGlobalTime: (globalSec: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleFullscreen: () => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onChangeFitMode: (mode: 'cover' | 'contain' | 'fill') => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onChangePlaybackSpeed: (speed: number) => void;
  onToggleTitles: () => void;
  onToggleAudio: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleSnapToBeat: () => void;
  onLoadAudioFile: (file: File) => Promise<void> | void;
  onUploadImage: (file: File) => void;
  onUploadMediaForIndex: (idx: number, file: File) => void;
  onBatchImportMedia: () => void;
  onPurgeMedia: () => void;
  onOpenExportStudio: () => void;
  onGoHome: () => void;
  onSelectWorkspaceMode: (mode: WorkspaceMode) => void;
  onOpenVideoScopes: () => void;
  onOpenProjectManager: () => void;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
  onSyncVideoTime: (shotIndex: number, timeSec: number) => void;
  onAdvanceFromVideoClock: (shotIndex: number) => void;
}

const ASPECT_CYCLE: AspectRatio[] = ['2.39:1', '9:16', '16:9'];

export const MobilePortraitWorkspace: React.FC<MobilePortraitWorkspaceProps> = ({
  projectTitle,
  directorName,
  nodeLocation,
  frames,
  currentIndex,
  currentFrame,
  workspaceMode,
  activeModule,
  isPlaying,
  showHud,
  aspectRatio,
  fitMode,
  playbackMode,
  slideTimeSec,
  playbackSpeed,
  seekVersion,
  isFullscreen,
  isAudioMuted,
  audioVolume,
  isSnapToBeat,
  detectedBpm,
  componentsVisibility,
  canUndo,
  canRedo,
  onSelectFrame,
  onUpdateFrame,
  onUpdateFrameAtIndex,
  onCommitSlidesNle,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onUndo,
  onRedo,
  onToggleFullscreen,
  onChangeAspectRatio,
  onChangeFitMode,
  onSelectPlaybackMode,
  onChangePlaybackSpeed,
  onToggleTitles,
  onToggleAudio,
  onChangeVolume,
  onToggleSnapToBeat,
  onLoadAudioFile,
  onUploadImage,
  onUploadMediaForIndex,
  onBatchImportMedia,
  onPurgeMedia,
  onOpenExportStudio,
  onGoHome,
  onSelectWorkspaceMode,
  onOpenVideoScopes,
  onOpenProjectManager,
  onOpenInspector,
  onOpenSettings,
  onSyncVideoTime,
  onAdvanceFromVideoClock
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<MobileDockTabId | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuFocusSearch, setMenuFocusSearch] = useState(false);

  const replaceMediaInputRef = useRef<HTMLInputElement | null>(null);
  const quickAudioInputRef = useRef<HTMLInputElement | null>(null);

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const storeTitlesAll = useStudioStore((s) => s.visibility.titlesAll);
  const storeShowTitles = useStudioStore((s) => s.titleConfig?.showTitles ?? true);
  const effectiveShowTitles =
    Boolean(componentsVisibility.titlesAll && (componentsVisibility.titleBn !== false || componentsVisibility.titleEn !== false || componentsVisibility.tagline !== false)) &&
    storeTitlesAll &&
    storeShowTitles;

  const activeDurationSec = getShotDurationSec(currentFrame, 12.0);

  const handleCycleAspectRatio = () => {
    const idx = ASPECT_CYCLE.indexOf(aspectRatio);
    const next = ASPECT_CYCLE[(idx + 1) % ASPECT_CYCLE.length];
    onChangeAspectRatio(next);
  };

  const slides: SlideDraft[] = useMemo(() => {
    return frames.map((f, i) => ({
      id: `slide_${f.id ?? i}`,
      orderIndex: i,
      duration: getShotDurationSec(f, 12.0),
      durationSec: getShotDurationSec(f, 12.0),
      targetFps: f.targetFps ?? 24,
      mediaVaultKey: f.mediaVaultKey ?? (f.id !== undefined ? String(f.id) : undefined),
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
      cameraSpec: f.cameraSpec
    }));
  }, [frames, aspectRatio]);

  const handleTriggerHyperReelPack = () => {
    const packed = pack12sHyperReel(slides, shotMediaMap);
    if (packed.slides.length > 0) {
      onCommitSlidesNle(packed.slides, 0, 0);
      onSelectPlaybackMode('sequence');
    }
    onSelectWorkspaceMode('STAGE');
    setActiveSheetTab('reels');
  };

  return (
    <div
      data-testid="mobile-portrait-workspace"
      className="md:hidden flex-1 min-h-0 w-full flex flex-col bg-[#060608] overflow-hidden relative"
    >
      {/* Hidden native pickers for quick single-tap media/audio ingestion */}
      <input
        ref={replaceMediaInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUploadMediaForIndex(currentIndex, file);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={quickAudioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.aac,.ogg,.flac,.m4a"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void onLoadAudioFile(file);
          }
          e.target.value = '';
        }}
      />

      {/* 1. Minimal 48px Mobile Top Bar (4 items max) */}
      {!isFullscreen && (
        <MobileTopBar
          currentIndex={currentIndex}
          currentFrame={currentFrame}
          aspectRatio={aspectRatio}
          onOpenMenu={() => {
            setMenuFocusSearch(false);
            setIsMenuOpen(true);
          }}
          onOpenShotPicker={() => {
            setMenuFocusSearch(true);
            setIsMenuOpen(true);
          }}
          onCycleAspectRatio={handleCycleAspectRatio}
          onOpenExport={onOpenExportStudio}
        />
      )}

      {/* Alternate Secondary Views (BOARD / CUT) if selected from Slide-Over Drawer */}
      {workspaceMode === 'BOARD' || workspaceMode === 'CUT' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="h-[38px] shrink-0 px-3 bg-[#101014] border-b border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectWorkspaceMode('STAGE')}
              className="min-h-[32px] px-2.5 rounded-md bg-[#18181E] border border-white/[0.1] text-[#F59E0B] font-mono text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>BACK TO STAGE</span>
            </button>
            <span className="font-mono text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider">
              {workspaceMode === 'BOARD' ? 'STORYBOARD' : 'CUT DESK'}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {workspaceMode === 'BOARD' ? (
              <BoardStudio />
            ) : (
              <CutStudio onOpenMultiCam={() => onSelectWorkspaceMode('STAGE')} />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 2. Unobstructed Center Preview Stage (~45% viewport height in portrait, expands in fullscreen) */}
          <div
            className={
              isFullscreen
                ? 'flex-1 min-h-0 w-full bg-[#000000] overflow-hidden relative flex flex-col'
                : 'h-[44dvh] min-h-[190px] max-h-[46dvh] shrink-0 w-full bg-[#050507] overflow-hidden relative flex flex-col'
            }
          >
            <TactileStage
              hideChrome={true}
              frames={frames}
              currentIndex={currentIndex}
              currentFrame={currentFrame}
              aspectRatio={aspectRatio}
              directorName={directorName}
              nodeLocation={nodeLocation}
              showHud={showHud}
              isAutoplay={isPlaying}
              fitMode={fitMode}
              componentsVisibility={componentsVisibility}
              onSelectFrame={onSelectFrame}
              onUpdateFrame={onUpdateFrame}
              onUpdateFrameAtIndex={onUpdateFrameAtIndex}
              onUploadImage={onUploadImage}
              onUploadMediaForIndex={onUploadMediaForIndex}
              onOpenInspector={onOpenInspector}
              onToggleTitles={onToggleTitles}
              showTitles={effectiveShowTitles}
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
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              onLoadAudioFile={onLoadAudioFile}
              detectedBpm={detectedBpm}
              isAudioMuted={isAudioMuted}
              onToggleMute={onToggleAudio}
              activeModule={activeModule}
              seekVersion={seekVersion}
              onSyncVideoTime={onSyncVideoTime}
              onAdvanceFromVideoClock={onAdvanceFromVideoClock}
              isBorderlessFullscreen={isFullscreen}
              isCursorAwake={true}
              onToggleBorderlessFullscreen={onToggleFullscreen}
            />
          </div>

          {/* Directly below canvas: Single 40px Mobile Transport Bar */}
          <MobileTransportBar
            isPlaying={isPlaying}
            currentTimeSec={slideTimeSec}
            durationSec={activeDurationSec}
            canUndo={canUndo}
            canRedo={canRedo}
            isFullscreen={isFullscreen}
            onTogglePlay={onTogglePlay}
            onUndo={onUndo}
            onRedo={onRedo}
            onToggleFullscreen={onToggleFullscreen}
          />

          {/* 3. Clean Mobile Multi-Track Timeline (~30% viewport height) */}
          {!isFullscreen && (
            <MobileMultiTrackTimeline
              frames={frames}
              currentIndex={currentIndex}
              slideTimeSec={slideTimeSec}
              isPlaying={isPlaying}
              detectedBpm={detectedBpm}
              showTitles={effectiveShowTitles}
              onSelectFrame={onSelectFrame}
              onScrubGlobalTime={onScrubGlobalTime}
              onOpenAudioSheet={() => setActiveSheetTab('audio')}
              onOpenTitleSheet={() => setActiveSheetTab('title')}
              onUploadAudioClick={() => quickAudioInputRef.current?.click()}
            />
          )}

          {/* 4. Single Bottom Icon Dock (56px) + Compact 38% Slide-Up Contextual Sheet */}
          {!isFullscreen && (
            <MobileBottomDockAndSheet
              activeTab={activeSheetTab}
              onSelectTab={setActiveSheetTab}
              frames={frames}
              currentIndex={currentIndex}
              currentFrame={currentFrame}
              slideTimeSec={slideTimeSec}
              aspectRatio={aspectRatio}
              fitMode={fitMode}
              playbackMode={playbackMode}
              playbackSpeed={playbackSpeed}
              showTitles={effectiveShowTitles}
              isAudioMuted={isAudioMuted}
              audioVolume={audioVolume}
              detectedBpm={detectedBpm}
              isSnapToBeat={isSnapToBeat}
              onUpdateFrame={onUpdateFrame}
              onCommitSlidesNle={onCommitSlidesNle}
              onChangeAspectRatio={onChangeAspectRatio}
              onChangeFitMode={onChangeFitMode}
              onSelectPlaybackMode={onSelectPlaybackMode}
              onChangePlaybackSpeed={onChangePlaybackSpeed}
              onToggleTitles={onToggleTitles}
              onToggleAudio={onToggleAudio}
              onChangeVolume={onChangeVolume}
              onToggleSnapToBeat={onToggleSnapToBeat}
              onLoadAudioFile={onLoadAudioFile}
              onUploadMediaForActiveShot={() => replaceMediaInputRef.current?.click()}
            />
          )}
        </>
      )}

      {/* 5. Slide-over Mobile Navigation Drawer (HOME, STUDIO, Search shots, Features, Vault, Settings) */}
      <MobileMenuDrawer
        isOpen={isMenuOpen}
        initialFocusSearch={menuFocusSearch}
        frames={frames}
        currentIndex={currentIndex}
        workspaceMode={workspaceMode}
        projectTitle={projectTitle}
        onClose={() => setIsMenuOpen(false)}
        onGoHome={onGoHome}
        onSelectWorkspaceMode={onSelectWorkspaceMode}
        onJumpToShot={onSelectFrame}
        onBatchImportMedia={onBatchImportMedia}
        onTriggerHyperReelPack={handleTriggerHyperReelPack}
        onOpenVideoScopes={onOpenVideoScopes}
        onOpenProjectManager={onOpenProjectManager}
        onOpenInspector={onOpenInspector}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
};
