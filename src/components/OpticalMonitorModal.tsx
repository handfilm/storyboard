/**
 * @file /src/components/OpticalMonitorModal.tsx
 * @description Dedicated Lightbox Cinema Player Modal hosting the NetflixCinemaPlayer.
 * 
 * Features:
 * - Dynamic media duration: plays clips seconds, minutes, or hours long.
 * - Complete Netflix-style fullscreen experience with autohiding HUD on mouse inactivity.
 * - Real-time CSS LUT color grading, grain, bloom, and toggleable cinematic title overlays.
 * - State-of-the-art online playback controls (scrubber, buffer, 10s skips, volume, speed, PiP, fullscreen).
 */

import React, { useEffect } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { AspectRatioType } from '../types/project';
import { NetflixCinemaPlayer } from './player/NetflixCinemaPlayer';

interface OpticalMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  aspectRatio: AspectRatio;
  playbackMode?: PlaybackMode;
  isPlaying?: boolean;
  slideTimeSec?: number;
  playbackSpeed?: number;
  onTogglePlay?: () => void;
  onStepFrame?: (forward: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  onChangePlaybackSpeed?: (speed: number) => void;
  onChangeAspectRatio?: (aspect: AspectRatioType) => void;
  onUploadMedia?: (file: File) => void;
  onPurgeMedia?: () => void;
  projectTitle?: string;
  directorName?: string;
  onSelectFrame?: (index: number) => void;
}

export const OpticalMonitorModal: React.FC<OpticalMonitorModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex,
  onSelectFrame,
  aspectRatio,
  directorName = 'Rakib Himon',
  projectTitle = 'RAWx Storyboard Studio',
  onUploadMedia
}) => {
  // ESC key dismissal fallback
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <NetflixCinemaPlayer
      isOpen={isOpen}
      onClose={onClose}
      frames={frames}
      currentIndex={currentIndex}
      onSelectFrame={onSelectFrame || (() => {})}
      aspectRatio={aspectRatio}
      directorName={directorName}
      projectTitle={projectTitle}
      onUploadMedia={onUploadMedia}
    />
  );
};
