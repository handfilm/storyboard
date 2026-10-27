/**
 * @file /src/components/export/UnifiedExportStudio.tsx
 * @description Unified Cinema Export Studio Wrapper for HANDFILM & RAWx.
 * Delegates directly to the full hardware-accelerated WebCodecs Unified Master Export Studio
 * (`CutNativeExportModal`) with Shared Shot Sequence Matrix, Dedicated Frame Preview Monitor,
 * Resolution & Aspect presets, Bitrate Profiles, Composite Layers, Premiere XML, CapCut/DaVinci FCPXML,
 * Production Package (.zip), Contact Sheet PDF, Director's Cut (.zip), and RAWX Backup.
 */

import React from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { CutNativeExportModal, ExportModalTab } from '../CutNativeExportModal';

export type UnifiedExportTab = ExportModalTab;

export interface UnifiedExportStudioProps {
  isOpen: boolean;
  onClose: () => void;
  frames?: AnthologyFrame[];
  currentIndex?: number;
  projectTitle?: string;
  directorName?: string;
  aspectRatio?: string;
  initialTab?: ExportModalTab;
}

export const UnifiedExportStudio: React.FC<UnifiedExportStudioProps> = ({
  isOpen,
  onClose,
  frames = [],
  currentIndex = 0,
  projectTitle = 'RAWx // Master Anthology Engine 100',
  directorName = 'Rakib Himon',
  aspectRatio = '2.39:1',
  initialTab = 'mp4'
}) => {
  return (
    <CutNativeExportModal
      isOpen={isOpen}
      onClose={onClose}
      frames={frames}
      currentSlideIndex={currentIndex}
      totalSlides={frames.length || 100}
      projectTitle={projectTitle}
      directorName={directorName}
      aspectRatio={aspectRatio}
      initialTab={initialTab}
    />
  );
};
