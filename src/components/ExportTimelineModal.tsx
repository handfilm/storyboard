/**
 * @file /src/components/ExportTimelineModal.tsx
 * @description Professional NLE Timeline Export Suite wrapper for RAWx / HANDFILM.
 * Delegates directly to the Unified Cinema Export Studio (CutNativeExportModal) on the Premiere / XML tab.
 */

import React from 'react';
import { AnthologyProject } from '../types/anthology';
import { CutNativeExportModal } from './CutNativeExportModal';

interface ExportTimelineModalProps {
  project: AnthologyProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportTimelineModal: React.FC<ExportTimelineModalProps> = ({
  project,
  isOpen,
  onClose
}) => {
  return (
    <CutNativeExportModal
      isOpen={isOpen}
      onClose={onClose}
      frames={project.frames}
      totalSlides={project.frames?.length || 100}
      projectTitle={project.title}
      directorName={project.director}
      aspectRatio={project.aspectRatio}
      initialTab="premiere"
    />
  );
};
