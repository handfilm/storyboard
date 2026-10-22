/**
 * @file /src/types/projectSchema.ts
 * @description Single versioned project schema "rawx-project.v1" for RAWx Storyboard Engine.
 * Covers project meta, scenes, shots, media references, studio settings, and sequence timeline.
 */

import { AspectRatio, CameraSpec, FrameAdjustments, LutPreset } from './anthology';
import { ComponentVisibility } from '../components/ComponentsMatrixPopover';

export const CURRENT_PROJECT_SCHEMA_VERSION = 'rawx-project.v1';

export type ShotTransition = 'CUT' | 'DISSOLVE' | 'WIPE';
export type ShotMove = 'PAN' | 'PUSH-IN' | 'PULL-OUT' | 'TILT' | 'STATIC';

export interface ShotV1 {
  id: string; // Unique shot ID (e.g. "shot-001")
  number: string; // Episode/Shot number (e.g. "001")
  sceneId: string;
  titleBn: string; // Bengali title
  titleEn: string; // English Cinzel title
  subtitle: string; // Curatorial tagline/descriptor
  directorNotes: string;
  soundCue: string;
  cameraSpec: CameraSpec;
  durationFrames: number; // e.g. 60 frames = 2.5s @ 24fps
  transition: ShotTransition;
  move: ShotMove;
  lens: string;
  filter: LutPreset;
  panY: number; // 0 to 100, default 50
  mediaId: string | null;
  imageUrl?: string;
  isVideo?: boolean;
  colorAccent: string;
  hoverStyle?: number;
  titleAnimation?: 'flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter' | 'neon' | 'cinema-fade' | 'fade';
  adjustments: FrameAdjustments;
  tags: string[];
  slideHoldSec?: number; // Preview hold in stage slider (default 12.0s)
  durationSec?: number;  // Real assigned duration for exports (EDL, OTIO, CSV)
  subclipInSec?: number;
  subclipOutSec?: number;
}

export interface SceneV1 {
  id: string;
  sceneNumber: number;
  title: string;
  description?: string;
}

export interface MediaRefV1 {
  id: string;
  url: string;
  name: string;
  type: string; // 'image/jpeg' | 'image/png' | 'video/mp4' | etc.
  size?: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  hash?: string;
}

export interface ProjectSettingsV1 {
  aspectRatio: AspectRatio;
  defaultFps: number; // 24 default
  activeLut: LutPreset;
  activeLens: string;
  fitMode: 'cover' | 'contain' | 'fill';
  componentsVisibility: ComponentVisibility;
  theme: string;
  density: 'compact' | 'spacious';
  defaultSlideHoldSec?: number; // 12.0s default
}

export interface TimelineClipV1 {
  id: string;
  shotId: string;
  startFrame: number;
  durationFrames: number;
}

export interface TimelineTrackV1 {
  id: string;
  type: 'video' | 'audio';
  name: string;
  clips: TimelineClipV1[];
  isMuted?: boolean;
  volume?: number;
}

export interface TimelineV1 {
  tracks: TimelineTrackV1[];
  durationFrames: number;
}

export interface ProjectV1 {
  schemaVersion: 'rawx-project.v1';
  id: string;
  meta: {
    title: string;
    director: string;
    nodeLocation: string;
    createdAt: string;
    updatedAt: string;
    version: string;
    description?: string;
    tags?: string[];
  };
  settings: ProjectSettingsV1;
  scenes: SceneV1[];
  shots: ShotV1[];
  mediaRefs: Record<string, MediaRefV1>;
  timeline: TimelineV1;
}

export interface ProjectSnapshotV1 {
  id: string;
  projectId: string;
  name?: string;
  timestamp: string;
  isAutomatic: boolean;
  projectData: ProjectV1;
}

export interface StorageQuotaInfo {
  supported: boolean;
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  isHighUsage: boolean; // >= 80%
}

/**
 * Validates whether an object matches the rawx-project.v1 specification
 */
export function isValidProjectV1(obj: any): obj is ProjectV1 {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.schemaVersion !== CURRENT_PROJECT_VERSION_ALIAS && obj.schemaVersion !== CURRENT_PROJECT_SCHEMA_VERSION) return false;
  if (!obj.id || typeof obj.id !== 'string') return false;
  if (!obj.meta || typeof obj.meta.title !== 'string') return false;
  if (!Array.isArray(obj.shots) || obj.shots.length === 0) return false;
  if (!obj.settings || typeof obj.settings.aspectRatio !== 'string') return false;
  return true;
}
const CURRENT_PROJECT_VERSION_ALIAS = 'rawx-project.v1';

