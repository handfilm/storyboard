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
  | 'raw'
  | 'kodak_vision3'
  | 'fuji_eterna'
  | 'noir_35mm'
  | 'bleach_bypass'
  | 'raw_clean';

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
  grain: number;      // 0 to 100
  motionBlur: number; // 0 to 100
  vignette: number;   // 0 to 100
  exposure?: number;  // -2.0 to +2.0 EV
  temperature?: number; // -100 (Cool/Cyan) to +100 (Warm/Amber)
  glow?: number;      // 0 to 100 (Anamorphic glow)
  foregroundZoom?: number; // 0.2 to 3.0 (default 1.0)
  backgroundZoom?: number; // 0.2 to 3.0 (default 1.0)
  vertigoLock?: boolean;   // Dolly zoom inverse coupling
}

export type CaptionStyle = 'rap_pop' | 'cinematic_minimal' | 'bilingual_dual';

export interface TimedWord {
  word: string;
  startSec: number;
  endSec: number;
  isPunch?: boolean;
}

export interface ShotCaption {
  text: string;
  bengaliText?: string;
  style: CaptionStyle;
  words?: TimedWord[];
  color?: string;
  fontFamily?: string;
  position?: string;
}

export type TitleAnimationStyle = 'flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter' | 'neon' | 'cinema-fade' | 'fade' | 'pop' | 'slide' | 'static';

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
  thumbnailUrl?: string;
  isVideo?: boolean;
  colorAccent: string;
  hoverStyle: number;
  soundCue: string;
  lutFilter: LutPreset;
  aspectRatio: AspectRatio;
  adjustments: FrameAdjustments;
  caption?: ShotCaption;
  tags: string[];
  panY?: number;
  activeLens?: string;
  dof?: string;
  titleAnimation?: TitleAnimationStyle;
  voiceoverDirective?: any;
  omniDecisions?: any;
  slideHoldSec?: number;
  durationSec?: number;
  targetFps?: number;
  inPointMs?: number;
  outPointMs?: number;
  beatSnapEnabled?: boolean;
  subclipInSec?: number;
  subclipOutSec?: number;
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
  defaultSlideHoldSec?: number;
}

export interface CollaboratorPresence {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  activeFrame: number;
  lastSeen?: any;
}
