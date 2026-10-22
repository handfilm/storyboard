/**
 * @file /src/components/CanvasLiquifyModal.tsx
 * @description Photo Edit & Liquify Warp Suite Modal (Re-exports PhotoLiquifySuite).
 */

import React from 'react';
import { PhotoLiquifySuite } from './PhotoLiquifySuite';
import { AnthologyFrame } from '../types/anthology';

interface CanvasLiquifyModalProps {
  isOpen: boolean;
  frame: AnthologyFrame;
  onClose: () => void;
  onApplyWarp: (warpedDataUrl: string) => void;
}

export const CanvasLiquifyModal: React.FC<CanvasLiquifyModalProps> = (props) => {
  return <PhotoLiquifySuite {...props} />;
};
