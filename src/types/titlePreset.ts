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
  | 'RETRO'
  | 'VIRAL_HOOKS'
  | 'END_CREDITS';

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
  | 'lower-third-slide'
  | '3d-flip'
  | 'anamorphic-sweep'
  | 'glitch-slice'
  | 'typewriter-telemetry'
  | 'cinema-credit-crawl'
  | 'viral-pop-bounce'
  | 'subtle-depth-drift';

export type TitleEasingCurve =
  | 'cubic-out'
  | 'spring-overshoot'
  | 'linear-hud'
  | 'whip-slam';

export type TitleStaggerMode = 'block' | 'word' | 'char';

export type TitleLayerKey = 'bangla' | 'english' | 'subtitle' | 'eyebrow' | 'credits';

export interface TitleLayerPlateStyle {
  enabled?: boolean;
  background?: string;
  border?: string;
  borderRadius?: number;
  backdropBlur?: number;
  padding?: string;
}

export interface TitleLayerStyle {
  enabled?: boolean;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number; // 10 to 160 px
  lineHeight?: number;
  letterSpacing?: number; // em
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  color?: string;
  gradientStops?: [string, string, string];
  strokeWidth?: number;
  strokeColor?: string;
  dropShadow?: string;
  bloomIntensity?: number;
  plate?: TitleLayerPlateStyle;
}

export interface TitleKeyframeConfig {
  inAnim: TitleMotionAnimation;
  midAnim:
    | 'none'
    | 'subtle-depth-drift'
    | 'viral-pop-bounce'
    | 'cinema-credit-crawl'
    | 'chopper-staccato'
    | 'neon-glitch-rgb';
  outAnim: 'dissolve-out' | 'slide-out' | 'glitch-slice' | '3d-flip' | 'none';
  durationSec: number; // 0.1 to 2.5
  delaySec: number; // 0.0 to 2.0
  easingCurve: TitleEasingCurve;
  staggerMode: TitleStaggerMode;
}

export interface TitleBackdropPlate {
  enabled: boolean;
  background: string;
  border: string;
  backdropBlur: number;
  padding: string;
  accentBarColor?: string;
  borderRadius?: number;
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
  fontScale: number; // 24 to 160 px
  verticalOffset: number; // -200 to +200 px
  uppercase?: boolean;
  layers?: Partial<Record<TitleLayerKey, TitleLayerStyle>>;
  keyframes?: Partial<TitleKeyframeConfig>;
}

export type ShotTitleAlignment = 'LEFT' | 'MID' | 'RIGHT' | 'AUTO';

export type TitleZone9 =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'mid-left'
  | 'center-hero'
  | 'mid-right'
  | 'lower-left'
  | 'lower-center'
  | 'lower-right';

export type TitleKineticEntrance =
  | 'slide-from-left'
  | 'center-bloom'
  | 'slide-from-right';

export interface ShotTitleData {
  enabled: boolean;
  presetId: string;
  banglaTitle: string;
  englishSubtitle: string;
  captionNote?: string;
  eyebrowText?: string;
  creditsText?: string;
  alignment: ShotTitleAlignment;
  zone9?: TitleZone9 | 'AUTO';
  kineticEntrance?: TitleKineticEntrance;
  fontScale: number;
  glowIntensity: number;
  letterTracking: number;
  verticalOffset: number;
  entranceAnim?: TitleMotionAnimation | string;
  exitAnim?: 'dissolve-out' | 'slide-out' | 'glitch-slice' | '3d-flip' | 'none';
  layers?: Partial<Record<TitleLayerKey, TitleLayerStyle>>;
  keyframes?: Partial<TitleKeyframeConfig>;
  styleConfig?: TitlePresetConfig;
}
