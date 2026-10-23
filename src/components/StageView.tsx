/**
 * @file /src/components/StageView.tsx
 * @description Master Stage Viewport Container integrating StageHeader, TactileStage,
 * and precision playhead controls for RAWx Cinema Studio.
 */

import React, { useState } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { StageHeader, StagePanelType } from './StageHeader';
import { TactileStage } from './stage/TactileStage';
import { TactileTransport } from './controls/TactileTransport';
import { PlaybackMode, SLIDE_DURATION_SEC } from '../types/editor';
import { ComponentVisibility } from './ComponentsMatrixPopover';

export interface StageViewProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isPlaying: boolean;
  playbackMode?: PlaybackMode;
  currentPanel?: StagePanelType;
  slideTimeSec?: number;
  fps?: number;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onSelectPanel?: (panel: StagePanelType) => void;
  onTogglePlay?: () => void;
  onStepFrame?: (forward: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  onUploadImage?: (file: File) => void;
  onOpenInspector?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  className?: string;
}

export const StageView: React.FC<StageViewProps> = ({
  frames,
  currentIndex,
  currentFrame,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isPlaying,
  playbackMode = 'sequence',
  currentPanel = 'TACTILE_STAGE',
  slideTimeSec = 0,
  fps = 24,
  componentsVisibility,
  onSelectFrame,
  onSelectPanel,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onSelectPlaybackMode,
  onUploadImage,
  onOpenInspector,
  onToggleTitles,
  showTitles = true,
  className = ''
}) => {
  const [internalPanel, setInternalPanel] = useState<StagePanelType>(currentPanel);
  const activePanel = onSelectPanel ? currentPanel : internalPanel;
  const handleSelectPanel = (panel: StagePanelType) => {
    if (onSelectPanel) {
      onSelectPanel(panel);
    } else {
      setInternalPanel(panel);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden bg-[#070709] font-mono select-none ${className}`}>
      {/* 1. Master Stage Top Bar with Tactile Capsule Switcher & Telemetry */}
      <StageHeader
        currentPanel={activePanel}
        onSelectPanel={handleSelectPanel}
        currentIndex={currentIndex}
        totalShots={frames.length || 100}
        currentFrame={currentFrame}
        playbackMode={playbackMode}
        onSelectPlaybackMode={onSelectPlaybackMode}
        slideDurationSec={SLIDE_DURATION_SEC}
        fps={fps}
      />

      {/* 2. Primary 2.39:1 Cinema Viewport */}
      <div className="flex-1 w-full relative flex flex-col overflow-hidden">
        <TactileStage
          frames={frames}
          currentIndex={currentIndex}
          currentFrame={currentFrame}
          aspectRatio={aspectRatio}
          directorName={directorName}
          nodeLocation={nodeLocation}
          showHud={showHud}
          isAutoplay={isPlaying}
          componentsVisibility={componentsVisibility}
          onSelectFrame={onSelectFrame}
          onUploadImage={onUploadImage}
          onOpenInspector={onOpenInspector}
          onToggleTitles={onToggleTitles}
          showTitles={showTitles}
          playbackMode={playbackMode}
          onSelectPlaybackMode={onSelectPlaybackMode}
          slideTimeSec={slideTimeSec}
          onTogglePlay={onTogglePlay}
          onStepFrame={onStepFrame}
          onScrubSlideTime={onScrubSlideTime}
          onScrubGlobalTime={onScrubGlobalTime}
        />
      </div>

      {/* 3. Bottom Transport Controls Dock */}
      {onTogglePlay && (
        <TactileTransport
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          playbackMode={playbackMode}
          onSelectPlaybackMode={onSelectPlaybackMode || (() => {})}
          onStepFrame={onStepFrame}
          slideTimeSec={slideTimeSec}
          currentIndex={currentIndex}
          totalSlides={frames.length}
          onScrubSlideTime={onScrubSlideTime}
          onScrubGlobalTime={onScrubGlobalTime}
          aspectRatio={typeof aspectRatio === 'string' ? aspectRatio : '2.39:1'}
          className="border-t border-white/10 shrink-0"
        />
      )}
    </div>
  );
};

export default StageView;
