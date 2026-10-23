/**
 * @file /src/types/project.ts
 * @description CapCut-style local project and draft schemas.
 * Enforces IndexedDB database `rawx_storyboard_studio_db` (v4) requirements.
 */

export type AspectRatioType = '2.39:1' | '16:9' | '4:3' | '1:1' | '9:16';

export interface SlideMarker {
  id: string;
  timeSec: number; // Offset within 0.0s - 12.0s
  label: string;
  color?: string;
}

export interface SlideTextLayer {
  id: string;
  text: string;
  subText?: string;
  fontSize?: number;
  position?: 'top' | 'center' | 'bottom';
  fontFamily?: string;
  color?: string;
}

export interface SlideDraft {
  id: string; // e.g. "slide_001" or "sh_001"
  orderIndex: number;
  duration: number; // Dynamic slide duration in seconds (0.5s - 1800.0s, default 12.0s)
  durationSec?: number;
  targetFps?: number; // 24.0 or 60.0
  inPointMs?: number;
  outPointMs?: number;
  beatSnapEnabled?: boolean;
  mediaBlobId?: string; // Key in media_blobs store
  remoteUrl?: string; // Pre-signed Cloudflare R2 URL or Edge CDN stream
  titleBn?: string;
  titleEn?: string;
  tagline?: string;
  directorNotes?: string;
  soundCue?: string;
  textLayers?: SlideTextLayer[];
  markers?: SlideMarker[];
  aspectRatio?: AspectRatioType;
  colorAccent?: string;
  lutFilter?: string;
  isVideo?: boolean;
  panY?: number;
  cameraSpec?: {
    focalLength?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
    sensor?: string;
    format?: string;
  };
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
    bloom: number;
    grain: number;
    motionBlur: number;
    vignette: number;
  };
}

export interface ProjectDraftConfig {
  aspectRatio: AspectRatioType;
  fps: number; // Standard 24fps
  playbackMode: 'sequence' | 'solo' | 'loop';
  loop: boolean;
  masterVolume: number;
  isMuted: boolean;
}

export interface ProjectDraft {
  projectId: string;
  activeSlideIndex: number;
  slides: SlideDraft[];
  config: ProjectDraftConfig;
  updatedAt: number;
}

export interface ProjectMeta {
  id: string;
  title: string;
  thumbnail?: string; // Lightweight base64 or blob URL preview
  duration: number; // slides.length * 12.0s
  updatedAt: number;
  aspectRatio: AspectRatioType;
  slideCount?: number;
  director?: string;
}

export interface MediaBlobRecord {
  id: string; // Unique blob id
  blob?: Blob | ArrayBuffer;
  fileBlob: Blob | File;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  name?: string;
  updatedAt: number;
  createdAt?: number;
}

export interface MediaThumbnailRecord {
  id: string;
  thumbnailBlob: Blob;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface MediaMetaRecord {
  id: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  codec?: string;
  assignedShotId?: number | null;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: number;
}

