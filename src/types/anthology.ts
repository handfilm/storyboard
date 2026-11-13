import type {
  TitlePresetCategory,
  TitleLayoutMode,
  TitleMotionAnimation,
  TitleBackdropPlate,
  TitlePresetConfig,
  ShotTitleData,
  ShotTitleAlignment
} from './titlePreset';

export type {
  TitlePresetCategory,
  TitleLayoutMode,
  TitleMotionAnimation,
  TitleBackdropPlate,
  TitlePresetConfig,
  ShotTitleData,
  ShotTitleAlignment
};

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

export type CaptionStyle =
  | 'rap_pop'
  | 'cinematic_minimal'
  | 'bilingual_dual'
  | 'bounce'
  | 'karaoke'
  | 'editorial';

export type ClipKeyframeEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface ClipKeyframe {
  id: string;
  timeNorm: number; // 0.0 .. 1.0 within clip duration
  x: number; // px offset or % (-50 .. +50)
  y: number; // % (-50 .. +50)
  scale: number; // 0.25 .. 3.0 (default 1.0)
  rotation: number; // degrees (-180 .. +180)
  opacity: number; // 0.0 .. 1.0
  volume: number; // 0.0 .. 2.0
  easing: ClipKeyframeEasing;
}

export interface SmartCutoutConfig {
  enabled: boolean;
  mode: 'ai-subject' | 'chroma-green' | 'chroma-blue';
  tolerance: number; // 5 .. 120
  feather: number; // 0 .. 40
  backgroundMode: 'transparent' | 'obsidian' | 'blur';
}

export interface ColorWheelChannel {
  r: number; // -50 .. +50
  g: number; // -50 .. +50
  b: number; // -50 .. +50
}

export interface ColorWheelsConfig {
  lift: ColorWheelChannel;
  gamma: ColorWheelChannel;
  gain: ColorWheelChannel;
  grain: number; // 0 .. 100
  halation: number; // 0 .. 100
  motionBlur3d: number; // 0 .. 100
}

export interface ShotAudioFx {
  normalizeLufs14: boolean;
  noiseReduction: boolean;
  pitchSemitones: number; // -12 .. +12
  emotion: 'neutral' | 'dramatic' | 'warm' | 'intense' | 'whisper' | 'poetic';
  vocalIsolated?: 'none' | 'instrumental' | 'acapella';
}

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

export interface DopamineShotConfig {
  presetId?: string;
  presetName?: string;
  hookText: string;
  subText: string;
  glitchIntensity: number;
  strobeRate: number;
  motionSpeed: number;
  accentColor: string;
  audioBeatSync?: boolean;
}

export type KineticTypographyArchetype =
  | 'dopamine-explosion'
  | 'kinetic-minimalist'
  | 'b2b-industrial'
  | 'retro-anamorphic'
  | 'dark-metallic'
  | 'ambient-chill';

export type SpeedRampPreset =
  | 'NONE'
  | 'BULLET_TIME'
  | 'WHIP_CUT'
  | 'HEARTBEAT'
  | 'HERO'
  | 'BULLET'
  | 'MONTAGE';
export type SmartCropMode = 'LEFT' | 'CENTER' | 'RIGHT' | 'AUTO_ZOOM' | 'CUSTOM';
export type OpticalFlowMode = 'NONE' | 'FRAME_BLEND' | 'OPTICAL_FLOW';

export interface SpeedRampKeyframe {
  u: number; // Normalized 0.0 .. 1.0 along clip timeline duration
  rate: number; // 0.25 .. 4.0 speed multiplier
}

export interface LightNodePosition {
  x: number;
  y: number;
}

export interface ShotLightConfig {
  keyPos: LightNodePosition;
  rimPos: LightNodePosition;
  fillPos: LightNodePosition;
  keyIntensity: number; // 0 to 200 (%)
  colorTempK: number; // 2400 to 7500 K
  hazeBloom: number; // 0 to 100 (%)
  rimCatchlight: number; // 0 to 100 (%)
  vignetteFalloff: number; // 0 to 100 (%)
  streakAngle: number; // -45 to +45 deg
  enabled?: boolean;
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
  thumbnailUrl?: string;
  thumbnail?: string;
  videoUrl?: string;
  videoSrc?: string;
  mediaUrl?: string;
  assetUrl?: string;
  blobUrl?: string;
  previewUrl?: string;
  isVideo?: boolean;
  isReversed?: boolean;
  voAudioUrl?: string;
  sfxAudioUrl?: string;
  colorAccent: string;
  hoverStyle: number;
  soundCue: string;
  lutFilter: LutPreset;
  aspectRatio: AspectRatio;
  adjustments: FrameAdjustments;
  caption?: ShotCaption;
  dopamineConfig?: DopamineShotConfig;
  activeTitlePreset?: string;
  titleStyleConfig?: TitlePresetConfig;
  titleData?: ShotTitleData;
  kineticArchetype?: KineticTypographyArchetype;
  tags: string[];
  panX?: number;
  panY?: number;
  reframeZoom?: number;
  smartCropMode?: SmartCropMode;
  speedRampPreset?: SpeedRampPreset;
  speedRampKeyframes?: SpeedRampKeyframe[];
  opticalFlowMode?: OpticalFlowMode;
  flashCutEnabled?: boolean;
  flashCutIntervalSec?: number;
  beatDropEnabled?: boolean;
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
  playbackSpeed?: number;
  mediaVaultKey?: string;
  beatSnapEnabled?: boolean;
  subclipInSec?: number;
  subclipOutSec?: number;
  lightId?: string | null;
  lightConfig?: ShotLightConfig;
  clipKeyframes?: ClipKeyframe[];
  smartCutout?: SmartCutoutConfig;
  colorWheels?: ColorWheelsConfig;
  audioFx?: ShotAudioFx;
  beatMarkersSec?: number[];
  shotType?: string;
  proceduralPaletteId?: string;
  typographyArchitecture?: string;
  opticalFxId?: string;
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
