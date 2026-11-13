/**
 * @file /src/utils/scrubNleMath.ts
 * @description Pure CapCut-grade Non-Linear Editing (NLE) timeline math for SCRUB.
 * Supports frame-accurate razor splits (Part A / Part B), real-time ripple left/right
 * edge trimming ([| and |]), Q/W trim-to-playhead ripple shortcuts, ripple delete,
 * and dynamic clip speed multipliers (0.5x, 1.0x, 1.5x, 2.0x).
 */

import { SlideDraft } from '../types/project';
import {
  DEFAULT_TARGET_FPS,
  MAX_SHOT_DURATION_SEC,
  getShotDurationSec,
  getShotTargetFps
} from '../types/storyboard';

export const MIN_NLE_CLIP_DURATION_SEC = 0.25;
export const SCRUB_SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0] as const;

export interface ClipSourceWindow {
  inSec: number;
  outSec: number;
  sourceSpanSec: number;
  timelineDurationSec: number;
  speed: number;
  fps: number;
}

export interface ScrubNleEditResult {
  slides: SlideDraft[];
  activeIndex: number;
  localTimeSec: number;
  changed: boolean;
}

function roundMs(sec: number): number {
  return Math.max(0, Math.round(sec * 1000));
}

function roundSec(sec: number): number {
  return Math.round(sec * 1000) / 1000;
}

export function snapSecondsToFrame(sec: number, fps: number = DEFAULT_TARGET_FPS, enabled: boolean = true): number {
  const safeFps = fps > 0 ? fps : DEFAULT_TARGET_FPS;
  if (!enabled) return roundSec(Math.max(0, sec));
  const snapped = Math.round(Math.max(0, sec) * safeFps) / safeFps;
  return roundSec(snapped);
}

/**
 * Resolves exact source in/out timestamps, speed multiplier, and timeline duration for a clip.
 */
export function getClipSourceWindow(slide: Partial<SlideDraft> | null | undefined): ClipSourceWindow {
  const fps = getShotTargetFps(slide as any, DEFAULT_TARGET_FPS);
  const rawSpeed = typeof slide?.playbackSpeed === 'number' && Number.isFinite(slide.playbackSpeed) && slide.playbackSpeed > 0
    ? slide.playbackSpeed
    : 1.0;
  const speed = Math.max(0.25, Math.min(4.0, rawSpeed));
  const inSec = typeof slide?.inPointMs === 'number' && Number.isFinite(slide.inPointMs) && slide.inPointMs >= 0
    ? slide.inPointMs / 1000
    : 0;

  const fallbackTimelineDur = getShotDurationSec(slide as any, 12.0);

  if (
    typeof slide?.outPointMs === 'number' &&
    Number.isFinite(slide.outPointMs) &&
    slide.outPointMs > inSec * 1000
  ) {
    const outSec = slide.outPointMs / 1000;
    const sourceSpanSec = Math.max(0.1, outSec - inSec);
    const timelineDurationSec = roundSec(
      Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, sourceSpanSec / speed))
    );
    return {
      inSec: roundSec(inSec),
      outSec: roundSec(outSec),
      sourceSpanSec: roundSec(sourceSpanSec),
      timelineDurationSec,
      speed,
      fps
    };
  }

  const timelineDurationSec = roundSec(
    Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, fallbackTimelineDur))
  );
  const sourceSpanSec = roundSec(timelineDurationSec * speed);
  const outSec = roundSec(inSec + sourceSpanSec);

  return {
    inSec: roundSec(inSec),
    outSec,
    sourceSpanSec,
    timelineDurationSec,
    speed,
    fps
  };
}

/**
 * Maps timeline local time (0 .. clip.durationSec) into the exact underlying video source timestamp.
 */
export function getClipSourceMediaTimeSec(
  slide: Partial<SlideDraft> | null | undefined,
  localTimeSec: number
): number {
  const win = getClipSourceWindow(slide);
  const clampedLocal = Math.max(0, Math.min(win.timelineDurationSec, localTimeSec));
  return roundSec(win.inSec + clampedLocal * win.speed);
}

/**
 * Strips any prior split suffix "(Part A)" / "(Part B)" cleanly so repeated splits stay readable.
 */
function stripPartSuffix(title: string): string {
  return title.replace(/\s*\(Part [AB]\)\s*$/i, '').trim();
}

function generateSplitSlideId(baseId: string, existingIds: Set<string>): string {
  const root = baseId.replace(/_part[ab]_\d+$/i, '');
  let counter = 1;
  let candidate = `${root}_partB_${Date.now().toString(36)}_${counter}`;
  while (existingIds.has(candidate)) {
    counter++;
    candidate = `${root}_partB_${Date.now().toString(36)}_${counter}`;
  }
  return candidate;
}

function reindexOrder(slides: SlideDraft[]): SlideDraft[] {
  return slides.map((s, idx) => ({ ...s, orderIndex: idx }));
}

/**
 * Razor Split at Playhead (`Split [S]` / `Ctrl+B`):
 * Slices `slides[clipIndex]` at `localTimeSec` into Part A and Part B with contiguous
 * `inPointMs` / `outPointMs` timestamps and preserved vault media references.
 */
export function splitClipAtTime(
  slides: SlideDraft[],
  clipIndex: number,
  localTimeSec: number,
  snapToFrame: boolean = true
): ScrubNleEditResult {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec, changed: false };
  }

  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const rawSplitSec = snapToFrame ? snapSecondsToFrame(localTimeSec, win.fps, true) : roundSec(localTimeSec);

  if (
    rawSplitSec < MIN_NLE_CLIP_DURATION_SEC ||
    win.timelineDurationSec - rawSplitSec < MIN_NLE_CLIP_DURATION_SEC
  ) {
    return { slides, activeIndex: clipIndex, localTimeSec, changed: false };
  }

  const partADur = roundSec(rawSplitSec);
  const partBDur = roundSec(win.timelineDurationSec - partADur);
  const splitSourceSec = roundSec(win.inSec + partADur * win.speed);

  const baseTitleEn = stripPartSuffix(target.titleEn || `Shot ${String(clipIndex + 1).padStart(3, '0')}`);
  const vaultKey =
    target.mediaVaultKey ||
    (target.id ? target.id.replace(/^slide_/, '') : String(clipIndex));

  const existingIds = new Set(slides.map((s) => s.id));
  const partBId = generateSplitSlideId(target.id || `slide_${clipIndex}`, existingIds);

  const partA: SlideDraft = {
    ...target,
    titleEn: `${baseTitleEn} (Part A)`,
    duration: partADur,
    durationSec: partADur,
    inPointMs: roundMs(win.inSec),
    outPointMs: roundMs(splitSourceSec),
    playbackSpeed: win.speed,
    mediaVaultKey: vaultKey
  };

  const partB: SlideDraft = {
    ...target,
    id: partBId,
    titleEn: `${baseTitleEn} (Part B)`,
    duration: partBDur,
    durationSec: partBDur,
    inPointMs: roundMs(splitSourceSec),
    outPointMs: roundMs(win.outSec),
    playbackSpeed: win.speed,
    mediaVaultKey: vaultKey
  };

  const nextSlides = [...slides];
  nextSlides.splice(clipIndex, 1, partA, partB);

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: clipIndex + 1,
    localTimeSec: 0,
    changed: true
  };
}

/**
 * Real-Time Edge Drag Trim (`[|` left inPoint or `|]` right outPoint):
 * Shortens or extends clip while auto-rippling adjacent clips (zero black gaps).
 */
export function trimClipEdge(
  slides: SlideDraft[],
  clipIndex: number,
  edge: 'left' | 'right',
  deltaTimelineSec: number,
  snapToFrame: boolean = true
): {
  slides: SlideDraft[];
  scrubPreviewSourceSec: number;
  changed: boolean;
} {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, scrubPreviewSourceSec: 0, changed: false };
  }

  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const delta = snapToFrame ? snapSecondsToFrame(Math.abs(deltaTimelineSec), win.fps, true) * Math.sign(deltaTimelineSec) : deltaTimelineSec;

  if (Math.abs(delta) < 0.001) {
    return { slides, scrubPreviewSourceSec: edge === 'left' ? win.inSec : win.outSec, changed: false };
  }

  if (edge === 'left') {
    // Dragging `[|` right (+delta) advances inPoint and shortens clip.
    // Dragging `[|` left (-delta) pulls inPoint back toward 0 (recovering head media) up to MAX_SHOT_DURATION_SEC.
    const maxRightDelta = Math.max(0, win.timelineDurationSec - MIN_NLE_CLIP_DURATION_SEC);
    const maxRecoverableLeftSec = win.inSec / win.speed;
    const minLeftDelta = -maxRecoverableLeftSec;
    const clampedDelta = Math.max(minLeftDelta, Math.min(maxRightDelta, delta));

    const nextDur = roundSec(
      Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, win.timelineDurationSec - clampedDelta))
    );
    const nextInSec = roundSec(Math.max(0, win.outSec - nextDur * win.speed));

    const nextSlides = slides.map((s, idx) =>
      idx === clipIndex
        ? {
            ...s,
            duration: nextDur,
            durationSec: nextDur,
            inPointMs: roundMs(nextInSec),
            outPointMs: roundMs(win.outSec),
            playbackSpeed: win.speed
          }
        : s
    );

    return {
      slides: reindexOrder(nextSlides),
      scrubPreviewSourceSec: nextInSec,
      changed: Math.abs(nextDur - win.timelineDurationSec) > 0.001 || Math.abs(nextInSec - win.inSec) > 0.001
    };
  }

  // Right edge `|]` adjusts outPoint & durationSec
  const nextDur = roundSec(
    Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, win.timelineDurationSec + delta))
  );
  const nextOutSec = roundSec(win.inSec + nextDur * win.speed);

  const nextSlides = slides.map((s, idx) =>
    idx === clipIndex
      ? {
          ...s,
          duration: nextDur,
          durationSec: nextDur,
          inPointMs: roundMs(win.inSec),
          outPointMs: roundMs(nextOutSec),
          playbackSpeed: win.speed
        }
      : s
  );

  return {
    slides: reindexOrder(nextSlides),
    scrubPreviewSourceSec: Math.max(win.inSec, nextOutSec - 1 / win.fps),
    changed: Math.abs(nextDur - win.timelineDurationSec) > 0.001
  };
}

/**
 * Hotkey `Q` — Trim Start to Playhead:
 * Cuts everything before `localTimeSec` on the active clip and ripples left.
 */
export function trimStartToPlayheadQ(
  slides: SlideDraft[],
  clipIndex: number,
  localTimeSec: number,
  snapToFrame: boolean = true
): ScrubNleEditResult {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec, changed: false };
  }

  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const cutDur = snapToFrame ? snapSecondsToFrame(localTimeSec, win.fps, true) : roundSec(localTimeSec);

  if (cutDur <= 0.01) {
    return { slides, activeIndex: clipIndex, localTimeSec: 0, changed: false };
  }

  const maxCut = Math.max(0, win.timelineDurationSec - MIN_NLE_CLIP_DURATION_SEC);
  const appliedCut = Math.min(cutDur, maxCut);
  if (appliedCut <= 0.01) {
    return { slides, activeIndex: clipIndex, localTimeSec, changed: false };
  }

  const nextDur = roundSec(Math.max(MIN_NLE_CLIP_DURATION_SEC, win.timelineDurationSec - appliedCut));
  const nextInSec = roundSec(win.inSec + appliedCut * win.speed);

  const nextSlides = slides.map((s, idx) =>
    idx === clipIndex
      ? {
          ...s,
          duration: nextDur,
          durationSec: nextDur,
          inPointMs: roundMs(nextInSec),
          outPointMs: roundMs(win.outSec),
          playbackSpeed: win.speed
        }
      : s
  );

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: clipIndex,
    localTimeSec: 0,
    changed: true
  };
}

/**
 * Hotkey `W` — Trim End to Playhead:
 * Cuts everything after `localTimeSec` on the active clip and ripples left.
 */
export function trimEndToPlayheadW(
  slides: SlideDraft[],
  clipIndex: number,
  localTimeSec: number,
  snapToFrame: boolean = true
): ScrubNleEditResult {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec, changed: false };
  }

  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const rawNewDur = snapToFrame ? snapSecondsToFrame(localTimeSec, win.fps, true) : roundSec(localTimeSec);
  const nextDur = roundSec(Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(win.timelineDurationSec, rawNewDur)));

  if (nextDur >= win.timelineDurationSec - 0.01) {
    return { slides, activeIndex: clipIndex, localTimeSec, changed: false };
  }

  const nextOutSec = roundSec(win.inSec + nextDur * win.speed);
  const nextSlides = slides.map((s, idx) =>
    idx === clipIndex
      ? {
          ...s,
          duration: nextDur,
          durationSec: nextDur,
          inPointMs: roundMs(win.inSec),
          outPointMs: roundMs(nextOutSec),
          playbackSpeed: win.speed
        }
      : s
  );

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: clipIndex,
    localTimeSec: Math.min(localTimeSec, nextDur),
    changed: true
  };
}

/**
 * Hotkey `Delete / Backspace` — Ripple Delete:
 * Removes selected clip segment and automatically closes the gap.
 */
export function rippleDeleteClip(
  slides: SlideDraft[],
  clipIndex: number
): ScrubNleEditResult {
  if (slides.length <= 1 || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec: 0, changed: false };
  }

  const nextSlides = slides.filter((_, idx) => idx !== clipIndex);
  const nextActive = Math.max(0, Math.min(nextSlides.length - 1, clipIndex));

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: nextActive,
    localTimeSec: 0,
    changed: true
  };
}

/**
 * Clip Speed Multiplier (`0.5x`, `1.0x`, `1.5x`, `2.0x`):
 * Keeps source span constant while dynamically recalculating timeline duration & playbackSpeed.
 */
export function applyClipSpeed(
  slides: SlideDraft[],
  clipIndex: number,
  newSpeed: number
): ScrubNleEditResult {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec: 0, changed: false };
  }

  const safeSpeed = Math.max(0.25, Math.min(4.0, newSpeed));
  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const nextDur = roundSec(
    Math.max(MIN_NLE_CLIP_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, win.sourceSpanSec / safeSpeed))
  );

  const nextSlides = slides.map((s, idx) =>
    idx === clipIndex
      ? {
          ...s,
          playbackSpeed: safeSpeed,
          duration: nextDur,
          durationSec: nextDur,
          inPointMs: roundMs(win.inSec),
          outPointMs: roundMs(win.outSec)
        }
      : s
  );

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: clipIndex,
    localTimeSec: 0,
    changed: true
  };
}

/**
 * Slip Clip Source Window (`SLIP`):
 * Shifts source `inPointMs` / `outPointMs` in tandem without altering `timelineDurationSec`.
 */
export function slipClipWindow(
  slides: SlideDraft[],
  clipIndex: number,
  deltaSourceSec: number,
  snapToFrame: boolean = true
): ScrubNleEditResult {
  if (!slides.length || clipIndex < 0 || clipIndex >= slides.length) {
    return { slides, activeIndex: Math.max(0, clipIndex), localTimeSec: 0, changed: false };
  }

  const target = slides[clipIndex];
  const win = getClipSourceWindow(target);
  const delta = snapToFrame
    ? snapSecondsToFrame(Math.abs(deltaSourceSec), win.fps, true) * Math.sign(deltaSourceSec)
    : deltaSourceSec;

  if (Math.abs(delta) < 0.001) {
    return { slides, activeIndex: clipIndex, localTimeSec: 0, changed: false };
  }

  const nextInSec = roundSec(Math.max(0, win.inSec + delta));
  const actualShift = nextInSec - win.inSec;
  if (Math.abs(actualShift) < 0.001) {
    return { slides, activeIndex: clipIndex, localTimeSec: 0, changed: false };
  }
  const nextOutSec = roundSec(nextInSec + win.sourceSpanSec);

  const nextSlides = slides.map((s, idx) =>
    idx === clipIndex
      ? {
          ...s,
          inPointMs: roundMs(nextInSec),
          outPointMs: roundMs(nextOutSec)
        }
      : s
  );

  return {
    slides: reindexOrder(nextSlides),
    activeIndex: clipIndex,
    localTimeSec: 0,
    changed: true
  };
}

/**
 * Roll Edit Cut Point (`ROLL [N]`):
 * Adjusts the cut seam between `slides[leftClipIndex]` (outPoint/duration) and
 * `slides[leftClipIndex + 1]` (inPoint/duration) inversely while locking combined runtime.
 */
export function rollClipCutPoint(
  slides: SlideDraft[],
  leftClipIndex: number,
  deltaTimelineSec: number,
  snapToFrame: boolean = true
): {
  slides: SlideDraft[];
  leftDurationSec: number;
  rightDurationSec: number;
  scrubPreviewSourceSec: number;
  changed: boolean;
} {
  if (!slides.length || leftClipIndex < 0 || leftClipIndex >= slides.length - 1) {
    return {
      slides,
      leftDurationSec: 0,
      rightDurationSec: 0,
      scrubPreviewSourceSec: 0,
      changed: false
    };
  }

  const leftSlide = slides[leftClipIndex];
  const rightSlide = slides[leftClipIndex + 1];
  const leftWin = getClipSourceWindow(leftSlide);
  const rightWin = getClipSourceWindow(rightSlide);

  const delta = snapToFrame
    ? snapSecondsToFrame(Math.abs(deltaTimelineSec), leftWin.fps, true) * Math.sign(deltaTimelineSec)
    : deltaTimelineSec;

  if (Math.abs(delta) < 0.001) {
    return {
      slides,
      leftDurationSec: leftWin.timelineDurationSec,
      rightDurationSec: rightWin.timelineDurationSec,
      scrubPreviewSourceSec: leftWin.outSec,
      changed: false
    };
  }

  // Right clip cannot shrink below MIN_NLE_CLIP_DURATION_SEC, nor pull inSec below 0
  const maxExtendRight = Math.min(
    MAX_SHOT_DURATION_SEC - leftWin.timelineDurationSec,
    Math.max(0, rightWin.timelineDurationSec - MIN_NLE_CLIP_DURATION_SEC)
  );
  // Left clip cannot shrink below MIN_NLE_CLIP_DURATION_SEC, nor extend right clip past recoverable head or max dur
  const maxRecoverRightLeft = Math.min(
    rightWin.inSec / rightWin.speed,
    MAX_SHOT_DURATION_SEC - rightWin.timelineDurationSec
  );
  const maxShrinkLeft = Math.min(
    Math.max(0, leftWin.timelineDurationSec - MIN_NLE_CLIP_DURATION_SEC),
    maxRecoverRightLeft
  );

  const appliedDelta = Math.max(-maxShrinkLeft, Math.min(maxExtendRight, delta));
  if (Math.abs(appliedDelta) < 0.001) {
    return {
      slides,
      leftDurationSec: leftWin.timelineDurationSec,
      rightDurationSec: rightWin.timelineDurationSec,
      scrubPreviewSourceSec: leftWin.outSec,
      changed: false
    };
  }

  const nextLeftDur = roundSec(leftWin.timelineDurationSec + appliedDelta);
  const nextRightDur = roundSec(rightWin.timelineDurationSec - appliedDelta);
  const nextLeftOutSec = roundSec(leftWin.inSec + nextLeftDur * leftWin.speed);
  const nextRightInSec = roundSec(Math.max(0, rightWin.outSec - nextRightDur * rightWin.speed));

  const nextSlides = slides.map((s, idx) => {
    if (idx === leftClipIndex) {
      return {
        ...s,
        duration: nextLeftDur,
        durationSec: nextLeftDur,
        inPointMs: roundMs(leftWin.inSec),
        outPointMs: roundMs(nextLeftOutSec),
        playbackSpeed: leftWin.speed
      };
    }
    if (idx === leftClipIndex + 1) {
      return {
        ...s,
        duration: nextRightDur,
        durationSec: nextRightDur,
        inPointMs: roundMs(nextRightInSec),
        outPointMs: roundMs(rightWin.outSec),
        playbackSpeed: rightWin.speed
      };
    }
    return s;
  });

  return {
    slides: reindexOrder(nextSlides),
    leftDurationSec: nextLeftDur,
    rightDurationSec: nextRightDur,
    scrubPreviewSourceSec: nextLeftOutSec,
    changed: true
  };
}

export interface ClipWaveformSample {
  bars: number[]; // Normalized 0.12 .. 1.0 energy heights
  transientPositions: number[]; // Normalized 0 .. 1 positions along clip duration
  transientSeconds: number[]; // Local timeline seconds of beat transients
}

/**
 * Generates deterministic high-contrast micro-waveform bars & transient beat markers
 * for timeline clips (aligning peaks with Beat-Drop interval if enabled).
 */
export function generateClipWaveformProfile(
  slide: Partial<SlideDraft> | null | undefined,
  clipIndex: number,
  barCount: number = 28
): ClipWaveformSample {
  const win = getClipSourceWindow(slide);
  const dur = Math.max(0.25, win.timelineDurationSec);
  const intervalSec = Math.max(0.25, slide?.flashCutIntervalSec ?? 1.0);
  const seedBase = (clipIndex + 1) * 37 + Math.round(win.inSec * 10);

  const bars: number[] = [];
  const transientPositions: number[] = [];
  const transientSeconds: number[] = [];

  for (let i = 0; i < barCount; i++) {
    const u = (i + 0.5) / barCount;
    const tSec = u * dur;
    const distToBeat = Math.abs((tSec % intervalSec) - 0) < (dur / barCount) * 0.65;
    const hash = Math.abs(Math.sin(seedBase * 0.71 + i * 1.93)) * 0.58 + Math.abs(Math.cos(i * 0.62 + clipIndex)) * 0.25;
    const peakBoost = distToBeat ? 0.34 : 0;
    const amplitude = Math.max(0.15, Math.min(1.0, hash + peakBoost));
    bars.push(Number(amplitude.toFixed(3)));
    if ((distToBeat && amplitude >= 0.72) || amplitude >= 0.86) {
      transientPositions.push(Number(u.toFixed(4)));
      transientSeconds.push(roundSec(tSec));
    }
  }

  if (transientSeconds.length === 0 && dur >= 0.5) {
    transientPositions.push(0.5);
    transientSeconds.push(roundSec(dur * 0.5));
  }

  return { bars, transientPositions, transientSeconds };
}

/**
 * Finds the nearest detected transient beat timestamp (in local clip seconds) to `localTimeSec`.
 */
export function findNearestTransientSec(
  slide: Partial<SlideDraft> | null | undefined,
  clipIndex: number,
  localTimeSec: number
): number {
  const profile = generateClipWaveformProfile(slide, clipIndex, 32);
  if (profile.transientSeconds.length === 0) return roundSec(localTimeSec);
  let best = profile.transientSeconds[0];
  let minDiff = Math.abs(best - localTimeSec);
  for (const t of profile.transientSeconds) {
    const diff = Math.abs(t - localTimeSec);
    if (diff < minDiff) {
      minDiff = diff;
      best = t;
    }
  }
  return best;
}
