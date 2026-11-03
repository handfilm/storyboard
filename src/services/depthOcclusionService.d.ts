import { AudioPunchMode } from './transientPunchEngine';
import { AutonomousKineticPreset } from './kineticTypographyStyles';

export type DepthLayerMode = 'BEHIND_SUBJECT' | 'FOREGROUND';

export interface DepthOcclusionConfig {
  enabled: boolean;
  layerMode: DepthLayerMode;
  audioPunchMode: AudioPunchMode;
  preset: AutonomousKineticPreset;
  impact: number;
  lumaThreshold: number;
}

export interface CompositeDepthFrameParams {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  sourceElement?: HTMLVideoElement | ImageBitmap | HTMLImageElement | HTMLCanvasElement | null;
  timeSec: number;
  durationSec?: number;
  fps?: number;
  isLivePlaying?: boolean;
  titleBn?: string;
  titleEn?: string;
  lyricText?: string;
  filmFilter?: string;
  zoomScale?: number;
  skipBaseDraw?: boolean;
  titleSize?: number;
  verticalOffset?: number;
  postBaseHook?: (
    baseCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    width: number,
    height: number
  ) => void;
}

export declare const DEPTH_LAYER_MODES: {
  readonly BEHIND_SUBJECT: 'BEHIND_SUBJECT';
  readonly FOREGROUND: 'FOREGROUND';
};

export declare function computeFallbackLumaEdgeMattePixels(
  rgbaPixels: Uint8ClampedArray,
  width: number,
  height: number,
  lumaThreshold?: number
): Uint8ClampedArray;

export declare class DepthOcclusionService {
  config: DepthOcclusionConfig;
  setWebGPUMatteModel(
    provider: null | ((source: any, width: number, height: number) => CanvasImageSource | null)
  ): void;
  setConfig(partial: Partial<DepthOcclusionConfig>): void;
  getConfig(): DepthOcclusionConfig;
  isEnabled(): boolean;
  getLayerStackOrder(mode?: DepthLayerMode): ('BASE_PASS' | 'TEXT_PASS' | 'SUBJECT_PASS')[];
  compositeFrame(params: CompositeDepthFrameParams): void;
}

export declare const depthOcclusionService: DepthOcclusionService;
