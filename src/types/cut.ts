/**
 * @file /src/types/cut.ts
 * @description Types for RAWx Cut Multi-Track Video Editor.
 */

export type TrackLaneId = 'V2' | 'V1' | 'T1' | 'A1' | 'A2' | 'VO';

export interface TimelineClip {
  id: string;
  trackId: TrackLaneId;
  name: string;
  type: 'video' | 'image' | 'text' | 'audio' | 'sticker' | 'effect';
  start: number; // timeline start time in seconds
  duration: number; // duration in seconds
  inPoint: number; // media in-point trim
  outPoint: number; // media out-point trim
  url?: string;
  text?: string;
  bengaliText?: string;
  shotIndex?: number;
  
  // Video & Transform properties
  posX: number; // % offset (-50 to 50)
  posY: number; // % offset (-50 to 50)
  scale: number; // % (10 to 300)
  rotation: number; // degrees (-180 to 180)
  opacity: number; // 0 to 100
  blendMode: 'normal' | 'screen' | 'multiply' | 'overlay' | 'hard-light';
  mask: 'none' | 'rectangle' | 'ellipse' | 'split';
  crop: { top: number; bottom: number; left: number; right: number };

  // Keyframe animation curve
  animation: {
    inType: 'none' | 'fade-in' | 'zoom-in' | 'slide-up' | 'wipe-right';
    outType: 'none' | 'fade-out' | 'zoom-out' | 'slide-down' | 'wipe-left';
    duration: number; // seconds
  };

  // Color adjustments
  adjustments: {
    brightness: number; // 50 to 150
    contrast: number; // 50 to 150
    saturation: number; // 0 to 200
    temperature: number; // -50 to 50
    shadows: number; // -50 to 50
    highlights: number; // -50 to 50
    sharpen: number; // 0 to 100
    vignette: number; // 0 to 100
    grain: number; // 0 to 100
  };

  // Speed controls
  speed: {
    multiplier: number; // 0.1 to 8.0
    ramp: 'constant' | 'hero' | 'slowmo' | 'whip';
    isReversed: boolean;
    isFrozen: boolean;
  };

  // Audio controls
  audio: {
    volume: number; // 0 to 100
    fadeIn: number; // seconds
    fadeOut: number; // seconds
    noiseReduction: boolean;
  };

  // Effect shader & transition
  effectShader?: string;
  transition?: {
    type: 'dissolve' | 'dip-black' | 'gold-flash' | 'whip-pan' | 'zoom' | 'glitch';
    duration: number;
  };
}

export interface TrackLane {
  id: TrackLaneId;
  label: string;
  type: 'video' | 'text' | 'audio';
  isMuted: boolean;
  isLocked: boolean;
  isHidden: boolean;
}
