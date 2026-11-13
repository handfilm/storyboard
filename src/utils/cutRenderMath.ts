/**
 * @file /src/utils/cutRenderMath.ts
 * @description Pure NLE compositing, timeline manipulation, and audio-mix math
 * for RAWx CutStudio (CapCut-grade multi-track engine).
 */

import type { TimelineClip, TrackLaneId } from '../types/cut';
import type { Shot } from '../core/schemas';

export interface TrackMixState {
  muted: boolean;
  solo: boolean;
  locked: boolean;
  hidden: boolean;
}

/**
 * Computes source media timestamp (seconds) for a clip at timeline `playheadTime`,
 * accounting for `inPoint`, `outPoint`, `speed.multiplier`, `speed.isFrozen`, and `speed.isReversed`.
 */
export function computeClipMediaTime(clip: TimelineClip, playheadTime: number): number {
  const localElapsed = Math.max(0, Math.min(clip.duration, playheadTime - clip.start));
  const inPt = Math.max(0, clip.inPoint || 0);
  const multiplier = Math.max(0.1, Math.min(8.0, clip.speed?.multiplier ?? 1));

  if (clip.speed?.isFrozen) {
    return inPt;
  }

  const effectiveOut =
    clip.outPoint > inPt ? clip.outPoint : inPt + clip.duration * multiplier;
  const span = Math.max(0.01, effectiveOut - inPt);

  if (clip.speed?.isReversed) {
    const revOffset = localElapsed * multiplier;
    return Math.max(inPt, effectiveOut - (revOffset % span));
  }

  const fwdOffset = localElapsed * multiplier;
  return inPt + (fwdOffset >= span ? fwdOffset % span : fwdOffset);
}

export interface ComputedAnimationVisual {
  opacityMultiplier: number;
  scaleMultiplier: number;
  translateXPercent: number;
  translateYPercent: number;
  clipPath?: string;
}

/**
 * Computes keyframe In/Out animation transform & opacity at timeline `playheadTime`.
 */
export function computeClipAnimationState(
  clip: TimelineClip,
  playheadTime: number
): ComputedAnimationVisual {
  const result: ComputedAnimationVisual = {
    opacityMultiplier: 1,
    scaleMultiplier: 1,
    translateXPercent: 0,
    translateYPercent: 0
  };

  const animDur = Math.max(0.05, Math.min(clip.duration / 2, clip.animation?.duration ?? 0.5));
  const localTime = Math.max(0, playheadTime - clip.start);
  const timeToEnd = Math.max(0, clip.start + clip.duration - playheadTime);

  const inType = clip.animation?.inType ?? 'none';
  if (inType !== 'none' && localTime < animDur) {
    const t = Math.max(0, Math.min(1, localTime / animDur));
    const ease = 1 - Math.pow(1 - t, 3);
    if (inType === 'fade-in') {
      result.opacityMultiplier *= ease;
    } else if (inType === 'zoom-in') {
      result.scaleMultiplier *= 0.8 + 0.2 * ease;
      result.opacityMultiplier *= ease;
    } else if (inType === 'slide-up') {
      result.translateYPercent += (1 - ease) * 18;
      result.opacityMultiplier *= ease;
    } else if (inType === 'wipe-right') {
      const rightInset = Math.max(0, (1 - ease) * 100);
      result.clipPath = `inset(0 ${rightInset.toFixed(1)}% 0 0)`;
    }
  }

  const outType = clip.animation?.outType ?? 'none';
  if (outType !== 'none' && timeToEnd < animDur) {
    const t = Math.max(0, Math.min(1, timeToEnd / animDur));
    const ease = 1 - Math.pow(1 - t, 3);
    if (outType === 'fade-out') {
      result.opacityMultiplier *= ease;
    } else if (outType === 'zoom-out') {
      result.scaleMultiplier *= 0.8 + 0.2 * ease;
      result.opacityMultiplier *= ease;
    } else if (outType === 'slide-down') {
      result.translateYPercent += (1 - ease) * 18;
      result.opacityMultiplier *= ease;
    } else if (outType === 'wipe-left') {
      const leftInset = Math.max(0, (1 - ease) * 100);
      result.clipPath = `inset(0 0 0 ${leftInset.toFixed(1)}%)`;
    }
  }

  return result;
}

export interface ComputedTransitionState {
  active: boolean;
  progress: number; // 0 (at cut boundary) -> 1 (fully in)
  overlayColor: string | null;
  overlayOpacity: number;
  extraTranslateXPercent: number;
  extraScale: number;
  glitchOffsetPx: number;
  opacityMultiplier: number;
}

/**
 * Evaluates incoming transition applied at the head of `clip` (duration `clip.transition.duration`).
 */
export function computeClipTransitionState(
  clip: TimelineClip,
  playheadTime: number
): ComputedTransitionState {
  const base: ComputedTransitionState = {
    active: false,
    progress: 1,
    overlayColor: null,
    overlayOpacity: 0,
    extraTranslateXPercent: 0,
    extraScale: 1,
    glitchOffsetPx: 0,
    opacityMultiplier: 1
  };

  if (!clip.transition || clip.transition.duration <= 0) return base;
  const localTime = playheadTime - clip.start;
  const dur = Math.min(clip.duration, Math.max(0.08, clip.transition.duration));
  if (localTime < 0 || localTime >= dur) return base;

  const p = Math.max(0, Math.min(1, localTime / dur));
  const ease = 1 - Math.pow(1 - p, 2);

  switch (clip.transition.type) {
    case 'dissolve':
      return { ...base, active: true, progress: p, opacityMultiplier: ease };
    case 'dip-black':
      return {
        ...base,
        active: true,
        progress: p,
        overlayColor: '#000000',
        overlayOpacity: Math.max(0, 1 - ease * 1.15)
      };
    case 'gold-flash':
      return {
        ...base,
        active: true,
        progress: p,
        overlayColor: '#f59e0b',
        overlayOpacity: Math.max(0, (1 - p) * 0.75)
      };
    case 'whip-pan':
      return {
        ...base,
        active: true,
        progress: p,
        extraTranslateXPercent: (1 - ease) * 45,
        opacityMultiplier: Math.min(1, 0.35 + ease * 0.65)
      };
    case 'zoom':
      return {
        ...base,
        active: true,
        progress: p,
        extraScale: 1.45 - 0.45 * ease,
        opacityMultiplier: ease
      };
    case 'glitch':
      return {
        ...base,
        active: true,
        progress: p,
        glitchOffsetPx: Math.sin(p * Math.PI * 12) * (1 - p) * 14,
        overlayColor: '#22d3ee',
        overlayOpacity: (1 - p) * 0.25
      };
    default:
      return base;
  }
}

export interface ClipColorAndFxResult {
  filterCss: string;
  vignetteOpacity: number;
  grainOpacity: number;
  warmthOverlayColor: string | null;
  warmthOverlayOpacity: number;
  shaderOverlayClass: string;
  rgbSplitPx: number;
}

/**
 * Builds full CSS filter string and overlay modifiers from the 9 color adjustments + effectShader.
 */
export function buildClipColorAndFx(clip: TimelineClip): ClipColorAndFxResult {
  const adj = clip.adjustments || {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    shadows: 0,
    highlights: 0,
    sharpen: 0,
    vignette: 0,
    grain: 0
  };

  let brightness = (adj.brightness ?? 100) + (adj.highlights ?? 0) * 0.22 - (adj.shadows ?? 0) * 0.12;
  let contrast = (adj.contrast ?? 100) + (adj.sharpen ?? 0) * 0.28 + Math.abs(adj.shadows ?? 0) * 0.15;
  let saturate = adj.saturation ?? 100;
  let sepia = 0;
  let hueRotate = 0;
  let blurPx = 0;
  let vignetteOpacity = Math.max(0, Math.min(0.85, (adj.vignette ?? 0) / 100));
  let grainOpacity = Math.max(0, Math.min(0.65, (adj.grain ?? 0) / 100));
  let shaderOverlayClass = '';
  let rgbSplitPx = 0;

  const shader = (clip.effectShader || '').toLowerCase();
  if (shader.includes('noir')) {
    saturate = 0;
    contrast += 24;
    vignetteOpacity = Math.max(vignetteOpacity, 0.45);
  } else if (shader.includes('bleach')) {
    saturate *= 0.45;
    contrast += 30;
    brightness *= 0.94;
  } else if (shader.includes('teal') || shader.includes('cyber')) {
    contrast += 12;
    saturate *= 1.18;
    hueRotate -= 8;
  } else if (shader.includes('kodak') || shader.includes('golden') || shader.includes('warm')) {
    sepia = 18;
    saturate *= 1.16;
  } else if (shader.includes('vhs') || shader.includes('glitch') || shader.includes('rgb')) {
    contrast += 15;
    saturate *= 1.25;
    rgbSplitPx = 3;
    shaderOverlayClass = 'rawx-shader-scanlines';
  } else if (shader.includes('crt') || shader.includes('scanline')) {
    contrast += 14;
    shaderOverlayClass = 'rawx-shader-scanlines';
  } else if (shader.includes('bloom') || shader.includes('halation') || shader.includes('dream')) {
    brightness *= 1.08;
    contrast *= 0.96;
    shaderOverlayClass = 'rawx-shader-bloom';
  } else if (shader.includes('blur') || shader.includes('tilt')) {
    blurPx = 1.5;
  } else if (shader.includes('sepia') || shader.includes('vintage')) {
    sepia = 45;
    grainOpacity = Math.max(grainOpacity, 0.22);
  }

  const parts = [
    `brightness(${Math.max(20, Math.min(240, brightness)).toFixed(1)}%)`,
    `contrast(${Math.max(20, Math.min(260, contrast)).toFixed(1)}%)`,
    `saturate(${Math.max(0, Math.min(300, saturate)).toFixed(1)}%)`
  ];
  if (sepia > 0) parts.push(`sepia(${sepia.toFixed(0)}%)`);
  if (hueRotate !== 0) parts.push(`hue-rotate(${hueRotate}deg)`);
  if (blurPx > 0) parts.push(`blur(${blurPx}px)`);

  const temp = adj.temperature ?? 0;
  const warmthOverlayColor = temp > 2 ? '#f59e0b' : temp < -2 ? '#38bdf8' : null;
  const warmthOverlayOpacity = Math.min(0.28, Math.abs(temp) / 180);

  return {
    filterCss: parts.join(' '),
    vignetteOpacity,
    grainOpacity,
    warmthOverlayColor,
    warmthOverlayOpacity,
    shaderOverlayClass,
    rgbSplitPx
  };
}

/**
 * Builds CSS clipPath from clip.mask and clip.crop percentages.
 */
export function buildClipMaskAndCropCss(clip: TimelineClip): {
  clipPath?: string;
  borderRadius?: string;
} {
  const crop = clip.crop || { top: 0, bottom: 0, left: 0, right: 0 };
  const hasCrop = crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0;

  if (clip.mask === 'ellipse') {
    return { clipPath: 'ellipse(46% 42% at 50% 50%)' };
  }
  if (clip.mask === 'rectangle') {
    return {
      clipPath: `inset(${Math.max(8, crop.top)}% ${Math.max(8, crop.right)}% ${Math.max(8, crop.bottom)}% ${Math.max(8, crop.left)}% round 14px)`
    };
  }
  if (clip.mask === 'split') {
    return { clipPath: 'inset(0 50% 0 0)' };
  }
  if (hasCrop) {
    return {
      clipPath: `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`
    };
  }
  return {};
}

/**
 * Computes effective linear gain [0..1.5] for a clip at `playheadTime` considering fades & track M/S.
 */
export function computeAudioClipGain(
  clip: TimelineClip,
  playheadTime: number,
  trackState: TrackMixState | undefined,
  anyTrackSoloed: boolean,
  masterMuted: boolean
): number {
  if (masterMuted) return 0;
  if (trackState?.muted) return 0;
  if (anyTrackSoloed && !trackState?.solo) return 0;

  const baseVol = Math.max(0, Math.min(2, (clip.audio?.volume ?? 100) / 100));
  if (baseVol <= 0.001) return 0;

  const localTime = Math.max(0, playheadTime - clip.start);
  const timeToEnd = Math.max(0, clip.start + clip.duration - playheadTime);
  const fadeIn = Math.max(0, clip.audio?.fadeIn ?? 0);
  const fadeOut = Math.max(0, clip.audio?.fadeOut ?? 0);

  let envelope = 1;
  if (fadeIn > 0.01 && localTime < fadeIn) {
    envelope *= Math.max(0, Math.min(1, localTime / fadeIn));
  }
  if (fadeOut > 0.01 && timeToEnd < fadeOut) {
    envelope *= Math.max(0, Math.min(1, timeToEnd / fadeOut));
  }

  return baseVol * envelope;
}

/**
 * Deletes `clipId` and shifts downstream clips on the same track earlier by its duration
 * (CapCut Ripple Delete).
 */
export function rippleDeleteClip(clips: TimelineClip[], clipId: string): TimelineClip[] {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return clips;
  const shiftAfter = target.start;
  const delta = target.duration;

  return clips
    .filter((c) => c.id !== clipId)
    .map((c) => {
      if (c.trackId === target.trackId && c.start >= shiftAfter - 0.001) {
        return {
          ...c,
          start: Number(Math.max(0, c.start - delta).toFixed(3))
        };
      }
      return c;
    });
}

/**
 * Moves a clip horizontally (and optionally across compatible tracks) with magnetic snapping
 * to other clip edges, timeline 0, playhead, or beat markers.
 */
export function moveClipWithMagneticSnap(
  clips: TimelineClip[],
  clipId: string,
  desiredStart: number,
  desiredTrackId: TrackLaneId,
  snapThresholdSec: number,
  extraSnapPoints: number[] = []
): { clips: TimelineClip[]; snappedAt: number | null } {
  const moving = clips.find((c) => c.id === clipId);
  if (!moving) return { clips, snappedAt: null };

  const clampedStart = Math.max(0, desiredStart);
  const dur = moving.duration;

  // Collect candidate snap points from other clips + 0 + playhead/beats
  const snapPoints: number[] = [0, ...extraSnapPoints];
  for (const c of clips) {
    if (c.id === clipId) continue;
    snapPoints.push(c.start, c.start + c.duration);
  }

  let bestStart = clampedStart;
  let bestDist = snapThresholdSec;
  let snappedAt: number | null = null;

  for (const pt of snapPoints) {
    const distHead = Math.abs(clampedStart - pt);
    if (distHead < bestDist) {
      bestDist = distHead;
      bestStart = pt;
      snappedAt = pt;
    }
    const distTail = Math.abs(clampedStart + dur - pt);
    if (distTail < bestDist) {
      bestDist = distTail;
      bestStart = Math.max(0, pt - dur);
      snappedAt = pt;
    }
  }

  const finalStart = Number(Math.max(0, bestStart).toFixed(3));
  const updated = clips.map((c) =>
    c.id === clipId ? { ...c, start: finalStart, trackId: desiredTrackId } : c
  );

  return { clips: updated, snappedAt };
}

/**
 * CapCut Freeze Frame: freezes frame at `playheadTime` inside `clipId` by splitting it
 * and inserting a `freezeDurationSec` still segment with `speed.isFrozen = true`.
 */
export function freezeFrameAtPlayhead(
  clips: TimelineClip[],
  clipId: string,
  playheadTime: number,
  freezeDurationSec = 2.0
): { clips: TimelineClip[]; freezeClipId: string | null } {
  const target = clips.find((c) => c.id === clipId);
  if (!target) return { clips, freezeClipId: null };

  const relOffset = Math.max(0.1, Math.min(target.duration - 0.1, playheadTime - target.start));
  const freezeMediaTime = computeClipMediaTime(target, target.start + relOffset);
  const freezeId = `freeze-${Date.now().toString(36)}`;

  const firstPart: TimelineClip = {
    ...target,
    duration: Number(relOffset.toFixed(3)),
    outPoint: Number((target.inPoint + relOffset * (target.speed?.multiplier || 1)).toFixed(3))
  };

  const freezeClip: TimelineClip = {
    ...target,
    id: freezeId,
    name: `${target.name} [FREEZE]`,
    start: Number((target.start + relOffset).toFixed(3)),
    duration: freezeDurationSec,
    inPoint: Number(freezeMediaTime.toFixed(3)),
    outPoint: Number(freezeMediaTime.toFixed(3)),
    speed: {
      multiplier: 1,
      ramp: 'constant',
      isReversed: false,
      isFrozen: true
    },
    audio: { ...target.audio, volume: 0 }
  };

  const remainingDur = Math.max(0.2, Number((target.duration - relOffset).toFixed(3)));
  const secondPart: TimelineClip = {
    ...target,
    id: `${target.id}-post-${Date.now().toString(36)}`,
    start: Number((freezeClip.start + freezeDurationSec).toFixed(3)),
    duration: remainingDur,
    inPoint: Number(freezeMediaTime.toFixed(3))
  };

  const nextClips: TimelineClip[] = [];
  for (const c of clips) {
    if (c.id === clipId) {
      nextClips.push(firstPart, freezeClip, secondPart);
    } else if (c.trackId === target.trackId && c.start >= target.start + target.duration - 0.01) {
      nextClips.push({ ...c, start: Number((c.start + freezeDurationSec).toFixed(3)) });
    } else {
      nextClips.push(c);
    }
  }

  return { clips: nextClips, freezeClipId: freezeId };
}

/**
 * CapCut Extract Audio: clones audio stream of `clipId` onto `A1` and mutes original video clip.
 */
export function detachAudioFromClip(
  clips: TimelineClip[],
  clipId: string
): { clips: TimelineClip[]; audioClipId: string | null } {
  const target = clips.find((c) => c.id === clipId);
  if (!target || (target.type !== 'video' && target.type !== 'audio')) {
    return { clips, audioClipId: null };
  }

  const audioId = `a1-ext-${Date.now().toString(36)}`;
  const extractedClip: TimelineClip = {
    ...target,
    id: audioId,
    trackId: 'A1',
    type: 'audio',
    name: `${target.name} [Audio]`,
    audio: {
      ...target.audio,
      volume: target.audio?.volume > 0 ? target.audio.volume : 100
    }
  };

  const updated = clips.map((c) =>
    c.id === clipId ? { ...c, audio: { ...c.audio, volume: 0 } } : c
  );
  updated.push(extractedClip);

  return { clips: updated, audioClipId: audioId };
}

function toSrtTimestamp(sec: number): string {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateSrtFromClips(clips: TimelineClip[]): string {
  const textClips = clips
    .filter((c) => c.trackId === 'T1' || Boolean(c.text || c.bengaliText))
    .sort((a, b) => a.start - b.start);

  if (textClips.length === 0) {
    return '1\n00:00:00,000 --> 00:00:04,000\nRAWx Studio Sequence\n';
  }

  return textClips
    .map((clip, i) => {
      const startTs = toSrtTimestamp(clip.start);
      const endTs = toSrtTimestamp(clip.start + clip.duration);
      const line = [clip.text, clip.bengaliText].filter(Boolean).join('\n') || clip.name;
      return `${i + 1}\n${startTs} --> ${endTs}\n${line}\n`;
    })
    .join('\n');
}

export function generateCaptionClipsFromV1(
  clips: TimelineClip[],
  shots: Shot[]
): TimelineClip[] {
  const v1Clips = clips.filter((c) => c.trackId === 'V1').sort((a, b) => a.start - b.start);
  return v1Clips.map((vClip, idx) => {
    const shot = vClip.shotIndex !== undefined ? shots[vClip.shotIndex] : shots[idx];
    const english = shot?.tagline || shot?.title || vClip.name;
    const bengali = shot?.bengaliTitle || '';
    return {
      ...vClip,
      id: `t1-cap-${idx}-${Date.now().toString(36)}`,
      trackId: 'T1',
      type: 'text',
      name: `Caption ${idx + 1}`,
      text: english,
      bengaliText: bengali,
      posX: 0,
      posY: 36,
      scale: 100,
      rotation: 0,
      opacity: 100,
      animation: { inType: 'fade-in', outType: 'fade-out', duration: 0.25 }
    };
  });
}
