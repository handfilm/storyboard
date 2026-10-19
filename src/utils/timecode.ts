/**
 * @file /src/utils/timecode.ts
 * @description Standard SMPTE Timecode (HH:MM:SS:FF) calculation and formatting utility.
 * Supports configurable frame rates (24fps default for cinema, 25fps PAL, 30fps NTSC, 60fps high-speed).
 */

export interface TimecodeConfig {
  fps: number; // Default 24fps
  dropFrame?: boolean;
}

export const DEFAULT_FPS = 24;

/**
 * Converts total frame count to a valid SMPTE timecode string: HH:MM:SS:FF
 */
export function framesToTimecode(totalFrames: number, fps: number = DEFAULT_FPS): string {
  const safeFps = Math.max(1, Math.round(fps));
  const safeFrames = Math.max(0, Math.floor(totalFrames));

  const frames = safeFrames % safeFps;
  const totalSeconds = Math.floor(safeFrames / safeFps);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Parses a timecode string HH:MM:SS:FF into total frames.
 * Returns null if format is invalid.
 */
export function timecodeToFrames(timecode: string, fps: number = DEFAULT_FPS): number | null {
  if (!timecode || typeof timecode !== 'string') return null;

  const parts = timecode.trim().split(':');
  if (parts.length !== 4) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);
  const frames = parseInt(parts[3], 10);

  if (
    isNaN(hours) || isNaN(minutes) || isNaN(seconds) || isNaN(frames) ||
    hours < 0 || minutes < 0 || minutes >= 60 ||
    seconds < 0 || seconds >= 60 ||
    frames < 0 || frames >= fps
  ) {
    return null;
  }

  const safeFps = Math.max(1, Math.round(fps));
  return (hours * 3600 + minutes * 60 + seconds) * safeFps + frames;
}

/**
 * Validates whether a given string is a valid SMPTE timecode.
 */
export function isValidTimecode(timecode: string, fps: number = DEFAULT_FPS): boolean {
  return timecodeToFrames(timecode, fps) !== null;
}

/**
 * Calculates shot start, end, and duration timecodes for a given shot index.
 * By default, each storyboard shot occupies 2.5 seconds (60 frames @ 24fps).
 */
export function calculateShotTimecode(
  shotIndex: number,
  framesPerShot: number = 60,
  fps: number = DEFAULT_FPS
): {
  start: string;
  end: string;
  duration: string;
  currentFrame: number;
} {
  const safeIndex = Math.max(0, shotIndex);
  const startFrame = safeIndex * framesPerShot;
  const endFrame = startFrame + framesPerShot - 1;

  return {
    start: framesToTimecode(startFrame, fps),
    end: framesToTimecode(endFrame, fps),
    duration: framesToTimecode(framesPerShot, fps),
    currentFrame: startFrame
  };
}
