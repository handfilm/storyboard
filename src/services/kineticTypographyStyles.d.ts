export type AutonomousKineticPreset =
  | 'CHOPPER_RAP_PUNCH'
  | 'COMMERCIAL_TITAN_DROP'
  | 'MINIMAL';

export interface KineticTypographyState {
  preset: AutonomousKineticPreset;
  activeWord: string;
  activeWordIndex: number;
  totalWords: number;
  scale: number;
  letterSpacingPx: number;
  wipeProgress: number;
  motionBlurVecPx: { x: number; y: number };
  chromaticShiftPx: number;
  rotationRad: number;
  bengaliTitle: string;
  englishSubtext: string;
  opacity: number;
  durationSec?: number;
}

export interface ComputeKineticTypographyParams {
  preset?: AutonomousKineticPreset;
  timeSec: number;
  durationSec?: number;
  fps?: number;
  impact?: number;
  framesSinceVocalHit?: number;
  vocalHitIndex?: number;
  chromaticSplitPx?: number;
  kickEnvelope?: number;
  bengaliText?: string;
  englishSubtext?: string;
  lyricText?: string;
}

export declare const KINETIC_TYPOGRAPHY_PRESETS: {
  readonly CHOPPER_RAP_PUNCH: 'CHOPPER_RAP_PUNCH';
  readonly COMMERCIAL_TITAN_DROP: 'COMMERCIAL_TITAN_DROP';
  readonly MINIMAL: 'MINIMAL';
};

export declare function tokenizeChopperWords(rawText: string): string[];
export declare function computeKineticTypographyState(
  params: ComputeKineticTypographyParams
): KineticTypographyState;

export declare class KineticTypographyRenderer {
  renderTextPass(
    targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number,
    state: KineticTypographyState,
    customConfig?: { verticalOffset?: number; titleSize?: number }
  ): void;
}

export declare const kineticTypographyRenderer: KineticTypographyRenderer;
