/**
 * @file /src/utils/multiCamMath.ts
 * @description Deterministic Broadcast Multi-Cam Switching & Timeline Segmentation Math.
 */

import { MultiCamCutEvent } from '../types/multicam';

export interface MultiCamSegment {
  id: string;
  cutId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  angleIndex: number;
  isFirst: boolean;
}

/**
 * Computes ordered non-overlapping timeline segments from multi-cam cut events.
 */
export function getMultiCamSegments(
  cutEvents: MultiCamCutEvent[],
  durationMs: number,
  defaultAngleIndex: number = 0
): MultiCamSegment[] {
  const safeDuration = Math.max(500, durationMs);
  const cuts = [...(cutEvents || [])].sort((a, b) => a.timeMs - b.timeMs);

  if (cuts.length === 0 || cuts[0].timeMs > 0) {
    cuts.unshift({ id: 'cut-init', timeMs: 0, angleIndex: defaultAngleIndex });
  }

  return cuts.map((current, i) => {
    const nextTime = i < cuts.length - 1 ? cuts[i + 1].timeMs : safeDuration;
    const segDuration = Math.max(0, nextTime - current.timeMs);
    return {
      id: `seg-${i}-${current.id}`,
      cutId: current.id,
      startMs: current.timeMs,
      endMs: nextTime,
      durationMs: segDuration,
      angleIndex: current.angleIndex,
      isFirst: i === 0
    };
  });
}

/**
 * Resolves active camera index at `timeMs`.
 */
export function getActiveMultiCamAngleAtTime(
  cutEvents: MultiCamCutEvent[],
  timeMs: number,
  defaultIndex: number = 0
): number {
  if (!cutEvents || cutEvents.length === 0) return defaultIndex;
  const sorted = [...cutEvents].sort((a, b) => a.timeMs - b.timeMs);
  let active = defaultIndex;
  for (const cut of sorted) {
    if (cut.timeMs <= timeMs) {
      active = cut.angleIndex;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Punches a live camera switch marker at `timeMs` (supports all 9 cameras CAM 01..CAM 09).
 */
export function punchMultiCamAngle(
  cutEvents: MultiCamCutEvent[],
  timeMs: number,
  angleIndex: number,
  durationMs: number,
  previousAngleIndex: number = 0
): {
  cutEvents: MultiCamCutEvent[];
  newCut: MultiCamCutEvent;
} {
  const safeMs = Math.max(0, Math.min(durationMs, Math.round(timeMs)));
  const frameNum = Math.floor((safeMs / 1000) * 30);

  const newCut: MultiCamCutEvent = {
    id: `cut-${Date.now()}-${angleIndex}-${Math.floor(Math.random() * 1000)}`,
    timeMs: safeMs,
    angleIndex,
    timestampMs: safeMs,
    frame: frameNum,
    previousAngle: previousAngleIndex,
    newAngle: angleIndex
  };

  const existingIdx = cutEvents.findIndex((c) => Math.abs(c.timeMs - safeMs) < 120);
  const updated =
    existingIdx >= 0
      ? cutEvents.map((c, i) => (i === existingIdx ? { ...c, angleIndex, newAngle: angleIndex } : c))
      : [...cutEvents, newCut].sort((a, b) => a.timeMs - b.timeMs);

  return { cutEvents: updated, newCut };
}

/**
 * Inserts a razor split cut marker at the playhead (`SPLIT AT PLAYHEAD [C]`).
 */
export function splitMultiCamAtPlayhead(
  cutEvents: MultiCamCutEvent[],
  timeMs: number,
  durationMs: number,
  currentAngleIndex: number
): {
  cutEvents: MultiCamCutEvent[];
  inserted: boolean;
  newCut?: MultiCamCutEvent;
} {
  const safeMs = Math.max(100, Math.min(Math.max(200, durationMs - 100), Math.round(timeMs)));
  const tooClose = cutEvents.some((c) => Math.abs(c.timeMs - safeMs) < 120);
  if (tooClose) {
    return { cutEvents, inserted: false };
  }

  const newCut: MultiCamCutEvent = {
    id: `cut-split-${Date.now()}-${currentAngleIndex}`,
    timeMs: safeMs,
    angleIndex: currentAngleIndex,
    timestampMs: safeMs,
    frame: Math.floor((safeMs / 1000) * 30),
    previousAngle: currentAngleIndex,
    newAngle: currentAngleIndex
  };

  const updated = [...cutEvents, newCut].sort((a, b) => a.timeMs - b.timeMs);
  return { cutEvents: updated, inserted: true, newCut };
}

/**
 * Formats milliseconds into `HH:MM:SS` for broadcast Master Program tally readout:
 * e.g. `LIVE ON AIR · CAM 01 · TC 00:00:00`.
 */
export function formatBroadcastTimecode(ms: number): string {
  const safeSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const hh = Math.floor(safeSec / 3600);
  const mm = Math.floor((safeSec % 3600) / 60);
  const ss = safeSec % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
