/**
 * @file /src/core/store/timelineState.ts
 * @description Master Timeline State Safeguards & Duration Safety Utilities.
 * Enforces strict null checks, optional chaining, and finite boundaries on shot durationSec,
 * ensuring zero crashes during modal launches, shot switching, or timeline mutations.
 * Also provides timeline dispatch actions: addShotToTimeline, appendClipToTimeline, addShot.
 */

import { Shot } from '../schemas';
import { AnthologyFrame } from '../../types/anthology';
import { useStudioStore, createDefaultStoreShots } from '../store';
import { eventBus } from '../eventBus';

export const DEFAULT_SHOT_DURATION = 12.0;
export const MIN_SHOT_DURATION = 0.5;
export const MAX_SHOT_DURATION = 1800.0;

/**
 * Safely extracts durationSec from any shot, frame, or slide object with strict null checks.
 * Guarantees a finite, positive number >= MIN_SHOT_DURATION.
 */
export function getSafeDurationSec(
  shot: Record<string, any> | null | undefined,
  fallbackSec: number = DEFAULT_SHOT_DURATION
): number {
  if (!shot) {
    return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, fallbackSec));
  }

  // Check durationSec
  if (typeof shot.durationSec === 'number' && Number.isFinite(shot.durationSec) && shot.durationSec > 0) {
    return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, shot.durationSec));
  }

  // Check durationSeconds
  if (typeof shot.durationSeconds === 'number' && Number.isFinite(shot.durationSeconds) && shot.durationSeconds > 0) {
    return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, shot.durationSeconds));
  }

  // Check slideHoldSec
  if (typeof shot.slideHoldSec === 'number' && Number.isFinite(shot.slideHoldSec) && shot.slideHoldSec > 0) {
    return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, shot.slideHoldSec));
  }

  // Check duration
  if (typeof shot.duration === 'number' && Number.isFinite(shot.duration) && shot.duration > 0) {
    return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, shot.duration));
  }

  return Math.max(MIN_SHOT_DURATION, Math.min(MAX_SHOT_DURATION, fallbackSec));
}

/**
 * Calculates the total cumulative duration of an array of shots or frames safely.
 */
export function calculateSafeTotalDuration(
  shots: Array<Record<string, any> | null | undefined> | null | undefined,
  fallbackPerShot: number = DEFAULT_SHOT_DURATION
): number {
  if (!shots || !Array.isArray(shots) || shots.length === 0) {
    return fallbackPerShot;
  }

  return shots.reduce((acc, shot) => {
    return acc + getSafeDurationSec(shot, fallbackPerShot);
  }, 0);
}

/**
 * Safe shot resolver that never throws even if indices or collections are out of bounds.
 */
export function getSafeShotAtIndex<T = Shot>(
  shots: T[] | null | undefined,
  index: number
): T | undefined {
  if (!shots || !Array.isArray(shots) || shots.length === 0) {
    return undefined;
  }
  const safeIndex = Math.max(0, Math.min(shots.length - 1, index));
  return shots[safeIndex];
}

export interface TimelineClipPayload {
  durationSec?: number;
  durationSeconds?: number;
  type?: string;
  thumbnail?: string;
  imageUrl?: string;
  isVideo?: boolean;
  title?: string;
  bengaliTitle?: string;
  tagline?: string;
  directorNotes?: string;
  soundCue?: string;
  cameraSpec?: any;
  model?: string;
  prompt?: string;
  [key: string]: any;
}

/**
 * Appends a new shot or AI-generated clip directly to the end of the global master timeline.
 * Dispatches updates to useStudioStore and emits eventBus events for StagePlayer and BiDirectionalTimeline.
 */
export function addShotToTimeline(newClip: TimelineClipPayload): Shot {
  const durationSec = getSafeDurationSec(newClip, 5.0);
  const imageUrl = newClip.thumbnail || newClip.imageUrl || 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800';
  const isVideo = newClip.isVideo !== undefined ? Boolean(newClip.isVideo) : true;

  const currentStore = useStudioStore.getState();
  const currentShots = currentStore.project?.shots || [];
  const newIndex = currentShots.length;
  const nextId = newIndex + 1;

  const defaults = createDefaultStoreShots();
  const baseDefault = defaults[newIndex % defaults.length] || defaults[0];

  const shotToAdd: Shot = {
    ...baseDefault,
    id: nextId,
    epNumber: String(newIndex + 1).padStart(3, '0'),
    title: newClip.title || `AI_SHOT_${String(newIndex + 1).padStart(3, '0')}`,
    bengaliTitle: newClip.bengaliTitle || 'কৃত্রিম নিউরাল দৃশ্য',
    tagline: newClip.tagline || (newClip.prompt ? `PROMPT: ${newClip.prompt.slice(0, 48)}...` : 'AI Generated Neural Asset'),
    directorNotes: newClip.directorNotes || (newClip.prompt ? `[AI FORGE: ${newClip.model || 'OMNI-AI'}] ${newClip.prompt}` : 'Synthesized via Omni-AI Forge'),
    soundCue: newClip.soundCue || 'Atmospheric Neural Sub-Bass Surge',
    cameraSpec: newClip.cameraSpec || {
      focalLength: '35mm Anamorphic Master',
      aperture: 'f/1.4',
      shutter: '1/48s 180°',
      iso: 'ISO 400',
      sensor: 'Full Frame ARRI LF',
      format: '2.39:1 Scope'
    },
    imageUrl,
    isVideo,
    panY: 50,
    colorAccent: '#A855F7',
    hoverStyle: 1,
    lutFilter: 'golden',
    aspectRatio: '16:9',
    adjustments: {
      ...baseDefault.adjustments,
      halations: 10,
      anamorphicStreak: 30
    },
    durationSeconds: durationSec,
    shotType: 'CU',
    status: 'in-progress',
    tags: ['AI_GENERATED', 'NEURAL_DIFFUSION', newClip.type || 'ai_generated', newClip.model || 'VEO'].filter(Boolean),
    activeLens: '35mm f/1.4 Master Anamorphic',
    dof: '1.2cm',
    updatedAt: Date.now()
  };

  // 1. Mutate Studio Store
  useStudioStore.setState((state) => {
    if (!state.project.shots) {
      state.project.shots = [];
    }
    state.project.shots.push(shotToAdd);
    state.activeShotIndex = newIndex;
  });

  // 2. Emit global eventBus events for all timeline/stage listeners
  eventBus.emit('timeline:add_shot', { shot: shotToAdd, index: newIndex });
  eventBus.emit('shot:change', newIndex);
  eventBus.emit('shot:updated', { index: newIndex, partial: shotToAdd });
  eventBus.emit('asset_assigned_to_shot', {
    assetId: `ai-forge-${Date.now()}`,
    shotIndex: newIndex,
    blobUrl: imageUrl,
    meta: {
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      name: `ai_clip_${newIndex + 1}.mp4`
    }
  });

  return shotToAdd;
}

export const appendClipToTimeline = addShotToTimeline;
export const addShot = addShotToTimeline;
export const appendClip = addShotToTimeline;

export interface DopamineTemplateParameters {
  presetId?: string;
  presetName?: string;
  hookText: string;
  subText: string;
  glitchIntensity: number;
  strobeRate: number;
  motionSpeed: number;
  accentColor?: string;
  audioBeatSync?: boolean;
}

/**
 * Applies Dopamine sequence or typography template parameters strictly to a single target shot
 * (by shot index or shot ID) WITHOUT overwriting its underlying video/image source, thumbnail, or duration.
 */
export function applyTemplateToShot(
  shotIdOrIndex: number | string | undefined,
  dopamineParameters: DopamineTemplateParameters
): Shot | null {
  const currentStore = useStudioStore.getState();
  const shots = currentStore.project?.shots || [];
  let targetIndex = currentStore.activeShotIndex ?? 0;

  if (typeof shotIdOrIndex === 'number' && Number.isFinite(shotIdOrIndex)) {
    if (shotIdOrIndex >= 0 && shotIdOrIndex < Math.max(100, shots.length)) {
      targetIndex = shotIdOrIndex;
    } else {
      const foundById = shots.findIndex((s) => s.id === shotIdOrIndex);
      if (foundById !== -1) targetIndex = foundById;
    }
  } else if (typeof shotIdOrIndex === 'string' && shotIdOrIndex.trim()) {
    const numeric = parseInt(shotIdOrIndex.replace(/\D+/g, ''), 10);
    const foundById = shots.findIndex(
      (s) => String(s.id) === shotIdOrIndex || s.epNumber === shotIdOrIndex
    );
    if (foundById !== -1) {
      targetIndex = foundById;
    } else if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= Math.max(100, shots.length)) {
      targetIndex = numeric - 1;
    }
  }

  const accentColor = dopamineParameters.accentColor || '#FF2B2B';
  const dopamineConfig = {
    presetId: dopamineParameters.presetId || 'viral_loop_1',
    presetName: dopamineParameters.presetName || 'DOPAMINE SEQUENCE',
    hookText: dopamineParameters.hookText || 'PURE RHYTHM',
    subText: dopamineParameters.subText || 'Visual Physics at Work.',
    glitchIntensity: dopamineParameters.glitchIntensity ?? 80,
    strobeRate: dopamineParameters.strobeRate ?? 60,
    motionSpeed: dopamineParameters.motionSpeed ?? 1.5,
    accentColor,
    audioBeatSync: dopamineParameters.audioBeatSync ?? true
  };

  const existingShot = shots[targetIndex];
  const mergedTags = Array.from(
    new Set([...(existingShot?.tags || []), 'dopamine', dopamineConfig.presetId])
  );
  const directorNote = `[🌪️ DOPAMINE: ${dopamineConfig.presetName}] Glitch: ${dopamineConfig.glitchIntensity}%, Strobe: ${dopamineConfig.strobeRate}ms, Speed: ${dopamineConfig.motionSpeed}x`;

  // Mutate ONLY typography & template fields on the single target shot; preserve media & duration!
  useStudioStore.setState((state) => {
    const target = state.project.shots[targetIndex];
    if (target) {
      target.title = dopamineConfig.hookText;
      target.tagline = dopamineConfig.subText;
      target.directorNotes = directorNote;
      target.titleAnimation = 'kinetic';
      target.colorAccent = accentColor;
      target.tags = mergedTags;
      target.dopamineConfig = dopamineConfig;
      target.updatedAt = Date.now();
    }
    state.titleConfig.showTitles = true;
    state.visibility.titlesAll = true;
  });

  const partialUpdate: Partial<AnthologyFrame> = {
    title: dopamineConfig.hookText,
    tagline: dopamineConfig.subText,
    directorNotes: directorNote,
    titleAnimation: 'kinetic',
    colorAccent: accentColor,
    tags: mergedTags,
    dopamineConfig,
    caption: {
      text: dopamineConfig.subText,
      style: 'rap_pop',
      color: accentColor
    }
  };

  // Broadcast scoped update for App.tsx & active StagePlayer without touching imageUrl or durationSec
  eventBus.emit('shot:updated', {
    index: targetIndex,
    partial: partialUpdate
  });
  eventBus.emit('titles:toggle', true);

  return useStudioStore.getState().project?.shots?.[targetIndex] || null;
}

/**
 * Deducts credits from the global store and syncs across all UI components.
 */
export function deductCredits(amount: number = 25): boolean {
  return useStudioStore.getState().deductCredits(amount);
}

/**
 * Sets available credits in the global store and notifies subscribers.
 */
export function setCredits(amount: number): void {
  useStudioStore.getState().setCredits(amount);
}

