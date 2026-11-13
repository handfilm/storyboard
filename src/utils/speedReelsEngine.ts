/**
 * @file /src/utils/speedReelsEngine.ts
 * @description Crazy 12-Second Speed Reels Engine:
 * - Exact 12.00s (288 frames @ 24fps) Hyper-Reel Auto-Packer (`1.5s Hook -> Rapid Cuts -> 2.5s Climax Slam`)
 * - Smooth integrable Velocity Speed-Ramp curves (`Bullet-Time`, `Whip-Cut`, `Heartbeat Pulse`)
 * - Beat-Drop 2-frame Vantablack flash cuts, chromatic aberration pulses, and kinetic beat title slams
 * - Unified 9:16 Smart-Crop Subject Lock geometry shared between live DOM preview & Canvas export
 */

import type { SmartCropMode, SpeedRampPreset } from '../types/anthology';
import type { SlideDraft } from '../types/project';
import { getClipSourceWindow } from './scrubNleMath';
import { resolveShotMediaEntry, type ShotMediaMap } from '../services/handfilmMediaVault';

export const HYPER_REEL_TOTAL_SEC = 12.0;
export const HYPER_REEL_FPS = 24;
export const HYPER_REEL_TOTAL_FRAMES = 288; // 12.00s * 24fps

export const BEAT_INTERVAL_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;

export const SPEED_RAMP_PRESETS: ReadonlyArray<{
  id: SpeedRampPreset;
  label: string;
  shortLabel: string;
  curveSummary: string;
}> = [
  { id: 'NONE', label: 'Linear 1.0x', shortLabel: 'LINEAR', curveSummary: 'Constant 1.0x cadence' },
  { id: 'BULLET_TIME', label: 'Bullet-Time', shortLabel: 'BULLET', curveSummary: '2.0x -> 0.4x -> 2.0x' },
  { id: 'WHIP_CUT', label: 'Whip-Cut Accel', shortLabel: 'WHIP', curveSummary: '0.6x -> 2.6x surge' },
  { id: 'HEARTBEAT', label: 'Heartbeat Pulse', shortLabel: 'PULSE', curveSummary: '2x rhythmic pulses' }
];

export const SMART_CROP_MODES: ReadonlyArray<{
  id: SmartCropMode;
  label: string;
  panX: number;
  panY: number;
  zoom: number;
}> = [
  { id: 'LEFT', label: 'LEFT', panX: 18, panY: 50, zoom: 1.0 },
  { id: 'CENTER', label: 'CENTER', panX: 50, panY: 50, zoom: 1.0 },
  { id: 'RIGHT', label: 'RIGHT', panX: 82, panY: 50, zoom: 1.0 },
  { id: 'AUTO_ZOOM', label: 'AUTO 1.8x', panX: 50, panY: 46, zoom: 1.8 }
];

function roundSec(val: number): number {
  return Math.round(val * 1000) / 1000;
}

/**
 * Evaluates instantaneous playback rate multiplier (relative to base clip speed)
 * at normalized progress `u` in `[0, 1]` for smooth preview & export synchronization.
 */
export function getSpeedRampFactorAtProgress(preset: SpeedRampPreset | undefined, u: number): number {
  const t = Math.max(0, Math.min(1, u));
  switch (preset) {
    case 'BULLET_TIME': {
      // Smooth 2.0x -> 0.4x (at u=0.5) -> 2.0x symmetric velocity curve
      const dip = Math.sin(Math.PI * t);
      return Math.max(0.4, 2.0 - 1.6 * Math.pow(dip, 0.85));
    }
    case 'WHIP_CUT': {
      // Exponential whip acceleration from 0.65x entry to 2.55x exit
      return 0.65 + 1.9 * (t * t);
    }
    case 'HEARTBEAT': {
      // Two crisp systolic/diastolic speed surges across the clip
      const pulse = Math.abs(Math.sin(Math.PI * 2 * t));
      return 0.65 + 1.45 * Math.pow(pulse, 2);
    }
    case 'NONE':
    default:
      return 1.0;
  }
}

export function getSpeedRampInstantRate(
  preset: SpeedRampPreset | undefined,
  localTimeSec: number,
  timelineDurationSec: number
): number {
  if (!preset || preset === 'NONE') return 1.0;
  const dur = Math.max(0.25, timelineDurationSec);
  return getSpeedRampFactorAtProgress(preset, localTimeSec / dur);
}

/**
 * Integrates the active velocity curve analytically via fast Simpson/midpoint sampling (16 steps)
 * so both real-time preview seeking and offline WebCodecs frame extraction match 1:1.
 */
export function evaluateSpeedRampSourceTime(
  slide: Partial<SlideDraft> & { slideHoldSec?: number } | null | undefined,
  localTimeSec: number
): number {
  const win = getClipSourceWindow(slide as Partial<SlideDraft>);
  const clampedLocal = Math.max(0, Math.min(win.timelineDurationSec, localTimeSec));
  const preset = slide?.speedRampPreset;

  if (!preset || preset === 'NONE') {
    return roundSec(win.inSec + clampedLocal * win.speed);
  }

  const dur = Math.max(0.25, win.timelineDurationSec);
  const progressEnd = clampedLocal / dur;
  if (progressEnd <= 0) return roundSec(win.inSec);

  const steps = 16;
  const du = progressEnd / steps;
  let integral = 0;
  for (let i = 0; i < steps; i++) {
    const uMid = (i + 0.5) * du;
    integral += getSpeedRampFactorAtProgress(preset, uMid) * du;
  }

  return roundSec(win.inSec + integral * dur * win.speed);
}

export interface BeatDropFxEvaluation {
  isFlashCutFrame: boolean;
  flashAlpha: number;
  chromaticOffsetPx: number;
  beatSlamScale: number;
  beatSlamActive: boolean;
  beatIndex: number;
  intervalSec: number;
}

/**
 * Computes exact beat-drop events at configured intervals (0.5s, 1.0s, 1.5s, 2.0s):
 * - 2-frame Vantablack flash cuts (`isFlashCutFrame`)
 * - Chromatic aberration pulse (`chromaticOffsetPx`)
 * - Kinetic beat title slam recoil (`beatSlamScale`)
 */
export function evaluateBeatDropFx(
  slide: Partial<SlideDraft> | null | undefined,
  localTimeSec: number,
  fps: number = HYPER_REEL_FPS
): BeatDropFxEvaluation {
  const flashOn = Boolean(slide?.flashCutEnabled);
  const beatOn = Boolean(slide?.beatDropEnabled || flashOn);
  const rawInterval = slide?.flashCutIntervalSec ?? 1.0;
  const intervalSec = Math.max(0.25, Math.min(4.0, rawInterval));

  if (!beatOn || localTimeSec < 0) {
    return {
      isFlashCutFrame: false,
      flashAlpha: 0,
      chromaticOffsetPx: 0,
      beatSlamScale: 1.0,
      beatSlamActive: false,
      beatIndex: 0,
      intervalSec
    };
  }

  const safeFps = fps > 0 ? fps : HYPER_REEL_FPS;
  const frameDuration = 1 / safeFps;
  const beatIndex = Math.floor((localTimeSec + 1e-5) / intervalSec);
  const timeSinceBeat = Math.max(0, localTimeSec - beatIndex * intervalSec);
  const framesSinceBeat = Math.floor(timeSinceBeat / frameDuration + 1e-4);

  // Skip index 0 only for flash-black so frame 0 opens hot unless beat 0 slammed intentionally; trigger on every subsequent beat
  const isFlashCutFrame = Boolean(flashOn && beatIndex >= 1 && framesSinceBeat < 2);
  const flashAlpha = isFlashCutFrame ? 1.0 : 0;

  // 4-frame chromatic aberration shockwave decaying out of each beat boundary
  const pulseDecay = framesSinceBeat < 5 ? Math.max(0, 1 - framesSinceBeat / 5) : 0;
  const chromaticOffsetPx = beatOn ? Math.round(pulseDecay * 9 * 10) / 10 : 0;

  // Kinetic title slam bounce in first 6 frames of each beat
  const slamDecay = framesSinceBeat < 6 ? Math.pow(Math.max(0, 1 - framesSinceBeat / 6), 2) : 0;
  const beatSlamScale = 1 + slamDecay * 0.14;

  return {
    isFlashCutFrame,
    flashAlpha,
    chromaticOffsetPx,
    beatSlamScale,
    beatSlamActive: framesSinceBeat < 5,
    beatIndex,
    intervalSec
  };
}

export interface SmartCropRectResult {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  objectPositionX: number; // 0..100
  objectPositionY: number; // 0..100
  zoom: number;
}

/**
 * Shared 9:16 Smart-Crop & Drag-to-Reframe geometry solver.
 * Guarantees wide 2.39:1 / 16:9 plates fill 9:16 cleanly with zero unintended black bars
 * and exact parity between Reels DOM preview and WebCodecs Canvas export.
 */
export function computeSmartCropRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  config?: {
    panX?: number;
    panY?: number;
    reframeZoom?: number;
    smartCropMode?: SmartCropMode;
  }
): SmartCropRectResult {
  const safeSrcW = Math.max(1, srcW);
  const safeSrcH = Math.max(1, srcH);
  const safeDstW = Math.max(1, dstW);
  const safeDstH = Math.max(1, dstH);

  let panX = typeof config?.panX === 'number' && Number.isFinite(config.panX) ? config.panX : 50;
  let panY = typeof config?.panY === 'number' && Number.isFinite(config.panY) ? config.panY : 50;
  let zoom = typeof config?.reframeZoom === 'number' && Number.isFinite(config.reframeZoom) ? config.reframeZoom : 1.0;

  if (config?.smartCropMode && config.smartCropMode !== 'CUSTOM') {
    const preset = SMART_CROP_MODES.find((m) => m.id === config.smartCropMode);
    if (preset) {
      if (typeof config.panX !== 'number') panX = preset.panX;
      if (typeof config.panY !== 'number') panY = preset.panY;
      if (typeof config.reframeZoom !== 'number') zoom = preset.zoom;
    }
  }

  panX = Math.max(0, Math.min(100, panX));
  panY = Math.max(0, Math.min(100, panY));
  zoom = Math.max(1.0, Math.min(3.5, zoom));

  const srcAspect = safeSrcW / safeSrcH;
  const dstAspect = safeDstW / safeDstH;

  // Base cover crop rectangle inside source coordinates before applying reframeZoom
  let baseCropW = safeSrcW;
  let baseCropH = safeSrcH;

  if (srcAspect > dstAspect) {
    baseCropH = safeSrcH;
    baseCropW = safeSrcH * dstAspect;
  } else {
    baseCropW = safeSrcW;
    baseCropH = safeSrcW / dstAspect;
  }

  const sw = Math.max(1, baseCropW / zoom);
  const sh = Math.max(1, baseCropH / zoom);
  const maxOffsetX = Math.max(0, safeSrcW - sw);
  const maxOffsetY = Math.max(0, safeSrcH - sh);

  const sx = (panX / 100) * maxOffsetX;
  const sy = (panY / 100) * maxOffsetY;

  return {
    sx,
    sy,
    sw,
    sh,
    dx: 0,
    dy: 0,
    dw: safeDstW,
    dh: safeDstH,
    objectPositionX: panX,
    objectPositionY: panY,
    zoom
  };
}

/**
 * Scores each slide for visual/editorial energy so the 12s Hyper-Reel Auto-Packer
 * picks the strongest cuts (prioritizing loaded video/photo plates, dopamine configs, and titles).
 */
export function scoreShotForHyperReel(
  slide: SlideDraft,
  index: number,
  shotMediaMap?: ShotMediaMap
): number {
  let score = 0;
  const media = resolveShotMediaEntry(shotMediaMap, slide as any, undefined, index);
  const url = media?.url || slide.remoteUrl || slide.imageUrl || '';
  const isVideo = media ? media.type === 'video' : Boolean(slide.isVideo);

  if (isVideo && url) score += 120;
  else if (url && !url.startsWith('data:image/svg+xml')) score += 85;
  else if (slide.thumbnailUrl && !slide.thumbnailUrl.startsWith('data:image/svg+xml')) score += 45;

  if (slide.dopamineConfig) score += 30;
  if (slide.titleBn) score += 12;
  if (slide.titleEn) score += 10;
  if (slide.directorNotes) score += 8;
  if (slide.soundCue) score += 6;

  // Gentle spread bonus so we sample across acts rather than bunching only adjacent empties
  score += ((index * 7) % 13) * 0.25;
  return score;
}

export interface HyperReelPackResult {
  slides: SlideDraft[];
  selectedCount: number;
  totalDurationSec: number;
  totalFrames: number;
  cadenceLabel: string;
}

/**
 * 1-CLICK "12s HYPER-REEL" AUTO-PACKER:
 * Selects top-energy shots across the project and trims/time-compresses them into
 * an exact `12.00s` (288 frames @ 24fps) viral sequence:
 * `1.50s Hook (36F) -> 8 x 1.00s Rapid Cuts (24F ea) -> 2.50s Climax Title Slam (60F)`.
 */
export function pack12sHyperReel(
  slides: SlideDraft[],
  shotMediaMap?: ShotMediaMap
): HyperReelPackResult {
  if (!slides || slides.length === 0) {
    return {
      slides: [],
      selectedCount: 0,
      totalDurationSec: 0,
      totalFrames: 0,
      cadenceLabel: '0.00s (0F)'
    };
  }

  // Rank candidates by visual/editorial energy while preserving narrative flow when sorted back
  const scored = slides.map((s, idx) => ({
    slide: s,
    originalIndex: idx,
    score: scoreShotForHyperReel(s, idx, shotMediaMap)
  }));

  let picked: typeof scored = [];
  if (scored.length >= 10) {
    // Pick top 10 highest-energy shots, then order by original narrative sequence
    picked = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .sort((a, b) => a.originalIndex - b.originalIndex);
  } else {
    picked = [...scored];
  }

  // Compute exact 24fps frame budgets summing strictly to 288 frames (12.00s)
  let frameBudgets: number[];
  if (picked.length === 10) {
    // Canonical viral structure: 1.5s Hook (36F) -> 8x 1.0s Rapid Cuts (24F) -> 2.5s Climax Slam (60F)
    frameBudgets = [36, 24, 24, 24, 24, 24, 24, 24, 24, 60];
  } else if (picked.length === 1) {
    frameBudgets = [HYPER_REEL_TOTAL_FRAMES];
  } else if (picked.length === 2) {
    frameBudgets = [108, 180]; // 4.5s + 7.5s = 12.0s (288F)
  } else {
    // 1.5s Hook (36F) + (N-2) rapid cuts sharing 192F + 2.5s Climax (60F) = 288F
    const midCount = picked.length - 2;
    const midTotalFrames = HYPER_REEL_TOTAL_FRAMES - 36 - 60; // 192F (8.0s)
    const baseMid = Math.floor(midTotalFrames / midCount);
    const rem = midTotalFrames - baseMid * midCount;
    frameBudgets = [
      36,
      ...Array.from({ length: midCount }, (_, i) => baseMid + (i < rem ? 1 : 0)),
      60
    ];
  }

  const packedSlides: SlideDraft[] = picked.map((item, idx) => {
    const frames = frameBudgets[idx];
    const durSec = roundSec(frames / HYPER_REEL_FPS);
    const orig = item.slide;
    const win = getClipSourceWindow(orig);
    const inSec = win.inSec;
    const rolePreset: SpeedRampPreset =
      idx === 0
        ? 'WHIP_CUT'
        : idx === picked.length - 1
          ? 'BULLET_TIME'
          : idx % 3 === 1
            ? 'WHIP_CUT'
            : 'HEARTBEAT';
    const nextSpeed = idx === 0 || idx === picked.length - 1 ? 1.0 : 1.5;
    const outSec = roundSec(inSec + durSec * nextSpeed);

    return {
      ...orig,
      orderIndex: idx,
      duration: durSec,
      durationSec: durSec,
      targetFps: HYPER_REEL_FPS,
      inPointMs: Math.round(inSec * 1000),
      outPointMs: Math.round(outSec * 1000),
      playbackSpeed: nextSpeed,
      smartCropMode: orig.smartCropMode ?? 'AUTO_ZOOM',
      panX: orig.panX ?? 50,
      panY: orig.panY ?? 46,
      reframeZoom: orig.reframeZoom && orig.reframeZoom > 1 ? orig.reframeZoom : 1.8,
      speedRampPreset: rolePreset,
      flashCutEnabled: true,
      flashCutIntervalSec: 0.5,
      beatDropEnabled: true,
      beatSnapEnabled: true
    };
  });

  return {
    slides: packedSlides,
    selectedCount: packedSlides.length,
    totalDurationSec: HYPER_REEL_TOTAL_SEC,
    totalFrames: HYPER_REEL_TOTAL_FRAMES,
    cadenceLabel:
      packedSlides.length === 10
        ? '1.5s Hook -> 8x 1.0s Rapid Cuts -> 2.5s Climax Slam'
        : `${packedSlides.length} Cuts Locked @ 12.00s (288F)`
  };
}
