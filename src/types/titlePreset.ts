/**
 * @file /src/types/titlePreset.ts
 * @description Unified Single-Source-of-Truth Type Definitions for the Handfilm Title Preset Engine.
 * Drives DOM overlays (`StageTextOverlay.tsx`), Drawer previews (`TextTypographyDrawer.tsx`),
 * Export Monitor previews (`UnifiedExportStudio.tsx`), and Offline 2D Canvas compositing (`titleCanvasRenderer.ts`).
 */

export type TitlePresetCategory =
  | 'DOPAMINE'
  | 'CORPORATE'
  | 'CINEMATIC'
  | 'RAP'
  | 'DOCU'
  | 'RETRO';

export type TitleLayoutMode =
  | 'center-hero'
  | 'lower-third-bar'
  | 'editorial-split'
  | 'hud-bracket'
  | 'brutalist-box'
  | 'minimal-whisper';

export type TitleMotionAnimation =
  | 'kinetic-slam'
  | 'typewriter-hud'
  | 'neon-glitch-rgb'
  | 'slow-cinema-fade'
  | 'chopper-staccato'
  | 'lower-third-slide';

export interface TitleBackdropPlate {
  enabled: boolean;
  background: string;
  border: string;
  backdropBlur: number;
  padding: string;
  accentBarColor?: string;
}

export interface TitlePresetConfig {
  presetId: string;
  presetName: string;
  category: TitlePresetCategory;
  layoutMode: TitleLayoutMode;
  banglaFontFamily: string;
  englishFontFamily: string;
  primaryColor: string;
  primaryGradient?: [string, string, string];
  secondaryColor: string;
  strokeColor: string;
  strokeWidth: number;
  glowColor: string;
  glowIntensity: number; // 0.0 to 2.0
  backdropPlate: TitleBackdropPlate;
  motionAnimation: TitleMotionAnimation;
  chromaticAberration: number; // 0 to 100
  letterTracking: number; // 0.0 to 0.60 em
  fontScale: number; // 24 to 140 px
  verticalOffset: number; // -200 to +200 px
  uppercase?: boolean;
}

export type ShotTitleAlignment = 'LEFT' | 'MID' | 'RIGHT' | 'AUTO';

export interface ShotTitleData {
  enabled: boolean;
  presetId: string;
  banglaTitle: string;
  englishSubtitle: string;
  captionNote?: string;
  alignment: ShotTitleAlignment;
  fontScale: number;
  glowIntensity: number;
  letterTracking: number;
  verticalOffset: number;
  entranceAnim?: TitleMotionAnimation | string;
  exitAnim?: 'dissolve-out' | 'slide-out' | 'none';
  styleConfig?: TitlePresetConfig;
}

