export type AudioPunchMode = 'KICK' | 'VOCAL' | 'OFF';

export interface CameraShakeMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
  rotationRad: number;
  scale: number;
}

export interface KickPunchPayload {
  band: 'LOW_BAND_SUB_120HZ';
  energy: number;
  impact: number;
  scaledIntensity: number;
  cameraShakeMatrix: CameraShakeMatrix;
  chromaticSplitPx: number;
  timestampSec: number;
}

export interface VocalHitPayload {
  band: 'HIGH_MID_1KHZ_5KHZ';
  energy: number;
  impact: number;
  scaledIntensity: number;
  wordIndex: number;
  timestampSec: number;
}

export interface TransientPeak {
  timeSec: number;
  energy: number;
}

export interface DualBandOfflineMap {
  durationSec: number;
  kickPeaks: TransientPeak[];
  vocalHits: TransientPeak[];
}

export interface TransientPhysicsState {
  mode: AudioPunchMode;
  impact: number;
  kickEnvelope: number;
  vocalEnvelope: number;
  chromaticSplitPx: number;
  cameraShakeMatrix: CameraShakeMatrix;
  framesSinceVocalHit: number;
  vocalHitIndex: number;
}

export declare const AUDIO_PUNCH_MODES: {
  readonly KICK: 'KICK';
  readonly VOCAL: 'VOCAL';
  readonly OFF: 'OFF';
};

export declare function clampImpactIntensity(value: number): number;

export declare class TransientPunchEngine {
  mode: AudioPunchMode;
  impact: number;
  isPlaying: boolean;
  setImpact(impactValue: number): void;
  getImpact(): number;
  setMode(mode: AudioPunchMode): void;
  getMode(): AudioPunchMode;
  onKickPunch(listener: (payload: KickPunchPayload) => void): () => void;
  onVocalHit(listener: (payload: VocalHitPayload) => void): () => void;
  createProceduralTimelineBuffer(bpm?: number, durationSec?: number): AudioBuffer | null;
  ingestAudioBuffer(
    audioBuffer: AudioBuffer,
    options?: { autoStart?: boolean; offsetSec?: number; loop?: boolean; muted?: boolean }
  ): DualBandOfflineMap | null;
  loadTimelineAudio(
    input: File | Blob | ArrayBuffer,
    options?: { autoStart?: boolean; muted?: boolean }
  ): Promise<DualBandOfflineMap | null>;
  startBufferSourceNode(offsetSec?: number, loop?: boolean): void;
  stopBufferSourceNode(): void;
  syncTransport(shouldPlay: boolean, timelineSec?: number): void;
  analyzeBufferDualBand(bufferLike: {
    sampleRate: number;
    duration: number;
    numberOfChannels: number;
    getChannelData: (channel: number) => Float32Array;
  }): DualBandOfflineMap;
  emitKickPunch(energy?: number, timestampSec?: number): KickPunchPayload;
  emitVocalHit(energy?: number, timestampSec?: number): VocalHitPayload;
  getPhysicsAtTime(timeSec: number, fps?: number, isLivePlaying?: boolean): TransientPhysicsState;
}

export declare const transientPunchEngine: TransientPunchEngine;
