/**
 * @file /src/core/store/timelineState.ts
 * @description Master Timeline State Safeguards & Duration Safety Utilities.
 * Enforces strict null checks, optional chaining, and finite boundaries on shot durationSec,
 * ensuring zero crashes during modal launches, shot switching, or timeline mutations.
 */

import { Shot } from '../schemas';
import { AnthologyFrame } from '../../types/anthology';

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
