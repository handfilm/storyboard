/**
 * @file /src/types/bloom.ts
 * @description Bloom Interactive Canvas types for fluid drag-and-drop frame sequencing and tactile snap alignment.
 */

import { AnthologyFrame } from './anthology';

export interface BloomCanvasFrame {
  id: number;
  frame: AnthologyFrame;
  x: number;
  y: number;
  width: number;
  height: number;
  orderIndex: number;
  isSelected: boolean;
  isDragging: boolean;
  isSnapping: boolean;
  rotation: number;
  scale: number;
  opacity: number;
}

export interface TactileSnapGuideLine {
  id: string;
  orientation: 'vertical' | 'horizontal';
  coordinate: number; // pixel position on canvas
  startCoord: number;
  endCoord: number;
  distancePx: number;
  activeFrameId: number;
  snapTargetFrameId: number;
  label?: string; // e.g. "SNAP 00:00:02:12" or "MAGNETIC 16px"
}

export interface CanvasViewportTransform {
  panX: number;
  panY: number;
  zoom: number; // 0.25 to 3.0
}
