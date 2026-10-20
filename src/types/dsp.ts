/**
 * @file /src/types/dsp.ts
 * @description Web Audio DSP, 3-Band EQ, Waveform Visualizer, Auto-Ducking & Transient Detection types.
 */

export interface ThreeBandEqConfig {
  lowGainDb: number; // -24 to +24 dB (Low shelf at 120Hz)
  midGainDb: number; // -24 to +24 dB (Peaking at 1200Hz, Q=1.2)
  highGainDb: number; // -24 to +24 dB (High shelf at 6500Hz)
  lowFreqHz: number;
  midFreqHz: number;
  highFreqHz: number;
}

export type WaveformRenderMode = 'bars' | 'wave' | 'spectrum' | 'tactile-glow';

export interface WaveformRenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  primaryColor?: string; // Crimson e.g. '#e11d48'
  secondaryColor?: string; // Gold e.g. '#ffe066'
  backgroundColor?: string;
  barWidth?: number;
  barGap?: number;
  mode: WaveformRenderMode;
  showRmsEnergyLine?: boolean;
}

export interface AutoDuckingConfig {
  enabled: boolean;
  thresholdDb: number; // e.g. -24 dB on voice track
  duckAttenuationDb: number; // e.g. -14 dB attenuation on BGM
  attackMs: number; // e.g. 45ms
  releaseMs: number; // e.g. 320ms
  sourceTrackId: string; // usually 'VO' or 'A1'
  targetTrackIds: string[]; // usually ['A2', 'DRONE']
}

export interface TransientPoint {
  timeSeconds: number;
  energy: number; // 0 to 1
  isBeat: boolean;
  isSilenceBoundary: boolean;
  type: 'peak' | 'silence-start' | 'silence-end' | 'downbeat';
}

export interface TransientDetectionResult {
  detectedBpm: number;
  transients: TransientPoint[];
  silenceIntervals: { start: number; end: number; duration: number }[];
  averageRms: number;
  peakRms: number;
}
