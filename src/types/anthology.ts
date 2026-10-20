export type LutPreset = 
  | 'cinematic' 
  | 'bleach'
  | 'technicolor'
  | 'noir' 
  | 'flir'
  | 'nightvision'
  | 'kodachrome'
  | 'solaris'
  | 'golden' 
  | 'tungsten' 
  | 'cyberpunk' 
  | 'infrared' 
  | 'monolith' 
  | 'matrix'
  | 'raw';

export type AspectRatio = '2.39:1' | '16:9' | '4:3' | '1:1' | '9:16' | '4:5';

export type ViewMode = 'stage' | 'grid' | 'screenplay' | 'export' | 'brutalist-manager';

export interface CameraSpec {
  focalLength: string;
  aperture: string;
  shutter: string;
  iso: string;
  sensor: string;
  format: string;
}

export interface FrameAdjustments {
  brightness: number; // 50 to 150
  contrast: number;   // 50 to 180
  saturation: number; // 0 to 200
  bloom: number;      // 0 to 100
  grain: number;      // 0 to 50
  motionBlur: number; // 0 to 100
  vignette: number;   // 0 to 100
}

export interface AnthologyFrame {
  id: number;
  epNumber: string;
  title: string;
  bengaliTitle: string;
  bengaliDesc?: string;
  cameraMove?: string;
  tagline: string;
  directorNotes: string;
  cameraSpec: CameraSpec;
  imageUrl?: string;
  isVideo?: boolean;
  colorAccent: string;
  hoverStyle: number;
  soundCue: string;
  lutFilter: LutPreset;
  aspectRatio: AspectRatio;
  adjustments: FrameAdjustments;
  tags: string[];
  activeLens?: string;
  dof?: string;
  titleAnimation?: 'flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter' | 'fade';
  voiceoverDirective?: any;
  omniDecisions?: any;
}

export interface AnthologyProject {
  title: string;
  director: string;
  nodeLocation: string;
  aspectRatio: AspectRatio;
  frames: AnthologyFrame[];
  createdAt: string;
  version: string;
  playbackSpeed?: number;
  activeFilter?: LutPreset;
  activeLens?: string;
  lastUpdatedBy?: string;
}

export interface CollaboratorPresence {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  activeFrame: number;
  lastSeen?: any;
}
