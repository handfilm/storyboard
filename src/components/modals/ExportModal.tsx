/**
 * @file /src/components/modals/ExportModal.tsx
 * @description Cinema Export Studio Modal Wrapper for RAWx Storyboard Studio.
 * Delegates to the WebCodecs hardware accelerated Cinema Export Studio (CutNativeExportModal).
 */

import React from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { CutNativeExportModal } from '../CutNativeExportModal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex?: number;
  projectTitle?: string;
  directorName?: string;
  aspectRatio?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex = 0,
  projectTitle = 'RAWx Storyboard Studio',
  directorName,
  aspectRatio,
}) => {
  return (
    <CutNativeExportModal
      isOpen={isOpen}
      onClose={onClose}
      frames={frames}
      currentSlideIndex={currentIndex}
      totalSlides={frames.length}
      projectTitle={projectTitle}
      directorName={directorName}
      aspectRatio={aspectRatio}
      initialTab="mp4"
    />
  );
};
