/**
 * @file /src/types/multicam.ts
 * @description Type definitions for the Multi-Camera Live Switching & Precision Shorts Engine.
 */

export interface MultiCamAngle {
  id: string;
  mediaId: string;
  label: string; // e.g. "CAM 01", "CAM 02", "CAM 03"
  blobUrl: string;
  aspectRatio: number;
  syncOffsetMs: number; // Audio/timecode waveform offset (in milliseconds)
  volume?: number;
  isMuted?: boolean;
  name?: string;
}

export interface MultiCamCutEvent {
  id: string;
  timeMs: number;
  angleIndex: number;
}

export interface MultiCamGroup {
  id: string;
  name: string;
  angles: MultiCamAngle[];
  duration: number; // Duration in seconds
  durationMs: number; // Duration in milliseconds
  masterAudioAngleIndex: number;
  activeAngleIndex: number;
  cutEvents: MultiCamCutEvent[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  createdAt?: string;
}
