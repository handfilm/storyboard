/**
 * @file /src/types/storyboard.ts
 * @description Elastic Multi-Cadence Timeline Engine — Dynamic Shot Temporal Model & Utilities.
 * Supports arbitrary slide durations from 0.5s rap staccato cuts up to 30-minute (1800.0s) documentary holds.
 */

export interface DirectorShot {
  id: string;
  index: number;
  durationSec: number;        // Flexible: e.g. 0.5s, 3.2s, 12.0s, 180.0s, up to 1800.0s
  targetFps: number;          // 24.0 or 60.0
  inPointMs?: number;
  outPointMs?: number;
  beatSnapEnabled?: boolean;
  titleBangla: string;
  titleEnglish: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export const MIN_SHOT_DURATION_SEC = 0.5;
export const MAX_SHOT_DURATION_SEC = 1800.0; // 30 minutes
export const DEFAULT_SHOT_DURATION_SEC = 12.0;
export const DEFAULT_TARGET_FPS = 24;

export type CadencePresetId =
  | 'rap-beat'
  | 'shorts-pace'
  | 'cinema-previz'
  | 'docu-hold'
  | 'custom';

export interface CadencePreset {
  id: Exclude<CadencePresetId, 'custom'>;
  icon: string;
  label: string;
  subtitle: string;
  durationSec: number;
}

export const CADENCE_PRESETS: ReadonlyArray<CadencePreset> = [
  {
    id: 'rap-beat',
    icon: '⚡',
    label: 'RAP BEAT',
    subtitle: 'Hyper-fast rhythmic cutting',
    durationSec: 1.5
  },
  {
    id: 'shorts-pace',
    icon: '◷',
    label: 'SHORTS PACE',
    subtitle: 'High retention reel pace',
    durationSec: 6.0
  },
  {
    id: 'cinema-previz',
    icon: '🎬',
    label: 'CINEMA PREVIZ',
    subtitle: 'Default anchor',
    durationSec: 12.0
  },
  {
    id: 'docu-hold',
    icon: '🎙',
    label: 'DOCU HOLD',
    subtitle: 'Long dialogue breath',
    durationSec: 30.0
  }
];

export interface ShotTemporalOffset {
  index: number;
  startSec: number;
  endSec: number;
  durationSec: number;
  frames: number;
  fps: number;
}

export interface ResolvedGlobalTimelinePosition {
  shotIndex: number;
  localTimeSec: number;
  shotStartSec: number;
  shotDurationSec: number;
  totalDurationSec: number;
}

/**
 * Clamps any candidate shot duration to [0.5s, 1800.0s] with millisecond precision.
 */
export function clampShotDuration(sec: number, fallbackSec: number = DEFAULT_SHOT_DURATION_SEC): number {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) {
    return fallbackSec;
  }
  const clamped = Math.max(MIN_SHOT_DURATION_SEC, Math.min(MAX_SHOT_DURATION_SEC, sec));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * Extracts flexible shot duration in seconds from DirectorShot, AnthologyFrame, SlideDraft, or CutClip.
 */
export function getShotDurationSec(
  shot: Record<string, any> | null | undefined,
  fallbackSec: number = DEFAULT_SHOT_DURATION_SEC
): number {
  if (!shot) return clampShotDuration(fallbackSec);

  if (typeof shot.durationSec === 'number' && Number.isFinite(shot.durationSec) && shot.durationSec > 0) {
    return clampShotDuration(shot.durationSec, fallbackSec);
  }
  if (typeof shot.slideHoldSec === 'number' && Number.isFinite(shot.slideHoldSec) && shot.slideHoldSec > 0) {
    return clampShotDuration(shot.slideHoldSec, fallbackSec);
  }
  if (typeof shot.duration === 'number' && Number.isFinite(shot.duration) && shot.duration > 0) {
    return clampShotDuration(shot.duration, fallbackSec);
  }
  if (typeof shot.durationSeconds === 'number' && Number.isFinite(shot.durationSeconds) && shot.durationSeconds > 0) {
    return clampShotDuration(shot.durationSeconds, fallbackSec);
  }

  return clampShotDuration(fallbackSec);
}

/**
 * Extracts shot target frame rate (24.0 or 60.0 fps).
 */
export function getShotTargetFps(
  shot: Record<string, any> | null | undefined,
  fallbackFps: number = DEFAULT_TARGET_FPS
): number {
  if (!shot) return fallbackFps;
  if (shot.targetFps === 60) return 60;
  if (shot.targetFps === 24) return 24;
  if (typeof shot.targetFps === 'number' && shot.targetFps > 0) return shot.targetFps;
  return fallbackFps;
}

/**
 * Computes exact frame count for a variable shot duration and FPS.
 */
export function getShotFrameCount(durationSec: number, fps: number = DEFAULT_TARGET_FPS): number {
  return Math.max(1, Math.round(clampShotDuration(durationSec) * fps));
}

/**
 * Global Timeline Duration Calculator: sum(shots.map(s => s.durationSec)).
 */
export function calculateMasterSequenceDuration(
  shots: ReadonlyArray<Record<string, any>> | null | undefined,
  fallbackSec: number = DEFAULT_SHOT_DURATION_SEC
): number {
  if (!shots || shots.length === 0) return 0;
  const total = shots.reduce((sum, s) => sum + getShotDurationSec(s, fallbackSec), 0);
  return Math.round(total * 1000) / 1000;
}

/**
 * Computes cumulative start/end timestamps across a variable-duration shot list.
 */
export function getCumulativeShotOffsets(
  shots: ReadonlyArray<Record<string, any>> | null | undefined,
  fallbackSec: number = DEFAULT_SHOT_DURATION_SEC
): ShotTemporalOffset[] {
  if (!shots || shots.length === 0) return [];
  const offsets: ShotTemporalOffset[] = [];
  let cursor = 0;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const durationSec = getShotDurationSec(shot, fallbackSec);
    const fps = getShotTargetFps(shot, DEFAULT_TARGET_FPS);
    const startSec = cursor;
    const endSec = Math.round((cursor + durationSec) * 1000) / 1000;
    offsets.push({
      index: i,
      startSec,
      endSec,
      durationSec,
      frames: getShotFrameCount(durationSec, fps),
      fps
    });
    cursor = endSec;
  }

  return offsets;
}

/**
 * Maps an arbitrary master sequence timestamp (seconds) to its owning shot index and local offset.
 */
export function resolveGlobalTimeToShot(
  shots: ReadonlyArray<Record<string, any>> | null | undefined,
  globalTimeSec: number,
  fallbackSec: number = DEFAULT_SHOT_DURATION_SEC
): ResolvedGlobalTimelinePosition {
  const offsets = getCumulativeShotOffsets(shots, fallbackSec);
  if (offsets.length === 0) {
    return {
      shotIndex: 0,
      localTimeSec: 0,
      shotStartSec: 0,
      shotDurationSec: fallbackSec,
      totalDurationSec: 0
    };
  }

  const totalDurationSec = offsets[offsets.length - 1].endSec;
  const clampedGlobal = Math.max(0, Math.min(totalDurationSec, globalTimeSec));

  for (let i = 0; i < offsets.length; i++) {
    const seg = offsets[i];
    const isLast = i === offsets.length - 1;
    if (clampedGlobal < seg.endSec || isLast) {
      const localTimeSec = Math.max(0, Math.min(seg.durationSec, clampedGlobal - seg.startSec));
      return {
        shotIndex: i,
        localTimeSec,
        shotStartSec: seg.startSec,
        shotDurationSec: seg.durationSec,
        totalDurationSec
      };
    }
  }

  const last = offsets[offsets.length - 1];
  return {
    shotIndex: last.index,
    localTimeSec: last.durationSec,
    shotStartSec: last.startSec,
    shotDurationSec: last.durationSec,
    totalDurationSec
  };
}

/**
 * Formats compact duration text (e.g. "12.0s", "1.5s", "4.25s").
 */
export function formatDurationPillValue(durationSec: number): string {
  const safe = clampShotDuration(durationSec);
  const roundedTenths = Math.round(safe * 10) / 10;
  if (Math.abs(safe - roundedTenths) < 0.005) {
    return `${safe.toFixed(1)}s`;
  }
  return `${safe.toFixed(2)}s`;
}

/**
 * Formats Solo Shot HUD badge text: e.g. "SH012 // 04.5s (108 F)"
 */
export function formatSoloShotTelemetry(
  shotIndexZeroBased: number,
  durationSec: number,
  fps: number = DEFAULT_TARGET_FPS
): string {
  const sh = `SH${String(Math.max(1, shotIndexZeroBased + 1)).padStart(3, '0')}`;
  const safeDur = clampShotDuration(durationSec);
  const secStr = safeDur < 10 ? `0${safeDur.toFixed(1)}` : safeDur.toFixed(1);
  const frames = getShotFrameCount(safeDur, fps);
  return `${sh} // ${secStr}s (${frames} F)`;
}

/**
 * Formats Master Sequence runtime timecode:
 * - Under 1 hour: MM:SS:FF (e.g. "03:24:18")
 * - 1 hour or more: HH:MM:SS:FF (e.g. "01:12:04:08")
 */
export function formatRuntimeTimecode(totalSec: number, fps: number = DEFAULT_TARGET_FPS): string {
  const safeSec = Math.max(0, Number.isFinite(totalSec) ? totalSec : 0);
  const totalFrames = Math.round(safeSec * fps);
  const ff = totalFrames % fps;
  const totalWholeSeconds = Math.floor(totalFrames / fps);
  const ss = totalWholeSeconds % 60;
  const mm = Math.floor(totalWholeSeconds / 60) % 60;
  const hh = Math.floor(totalWholeSeconds / 3600);

  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  }
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

/**
 * Formats full SMPTE HH:MM:SS:FF timecode.
 */
export function formatFullSMPTETimecode(totalSec: number, fps: number = DEFAULT_TARGET_FPS): string {
  const safeSec = Math.max(0, Number.isFinite(totalSec) ? totalSec : 0);
  const totalFrames = Math.floor(safeSec * fps);
  const ff = totalFrames % fps;
  const totalWholeSeconds = Math.floor(totalFrames / fps);
  const ss = totalWholeSeconds % 60;
  const mm = Math.floor(totalWholeSeconds / 60) % 60;
  const hh = Math.floor(totalWholeSeconds / 3600);

  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
}

/**
 * Formats custom stepper input as HH:MM:SS.cc (e.g. "00:01:45.00").
 */
export function formatCustomDurationTimecode(durationSec: number): string {
  const safe = clampShotDuration(durationSec);
  const whole = Math.floor(safe);
  const centis = Math.round((safe - whole) * 100);
  const hh = Math.floor(whole / 3600);
  const mm = Math.floor((whole % 3600) / 60);
  const ss = whole % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(centis === 100 ? 0 : centis).padStart(2, '0')}`;
}

/**
 * Parses flexible duration strings:
 * - "4.25" or "4.25s" -> 4.25
 * - "01:45" or "01:45.50" -> 105.5
 * - "00:01:45.00" -> 105.0
 * - "00:00:12:12" (SMPTE @ fps) -> 12.5
 */
export function parseDurationInput(raw: string, fps: number = DEFAULT_TARGET_FPS): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/s$/, '');
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => Number(p));
    if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;

    if (parts.length === 2) {
      const [mm, ss] = parts;
      return clampShotDuration(mm * 60 + ss);
    }
    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      return clampShotDuration(hh * 3600 + mm * 60 + ss);
    }
    if (parts.length === 4) {
      const [hh, mm, ss, ff] = parts;
      return clampShotDuration(hh * 3600 + mm * 60 + ss + ff / fps);
    }
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isNaN(numeric) || numeric <= 0) return null;
  return clampShotDuration(numeric);
}

/**
 * Converts any AnthologyFrame or SlideDraft into a normalized DirectorShot record.
 */
export function toDirectorShot(source: Record<string, any>, index: number): DirectorShot {
  const durationSec = getShotDurationSec(source, DEFAULT_SHOT_DURATION_SEC);
  const targetFps = getShotTargetFps(source, DEFAULT_TARGET_FPS);
  const mediaUrl = source?.mediaUrl || source?.imageUrl || source?.remoteUrl || undefined;
  const isVideo = Boolean(
    source?.mediaType === 'video' ||
      source?.isVideo ||
      (typeof mediaUrl === 'string' &&
        (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('video')))
  );

  return {
    id: String(source?.id ?? `sh_${String(index + 1).padStart(3, '0')}`),
    index,
    durationSec,
    targetFps,
    inPointMs:
      typeof source?.inPointMs === 'number'
        ? source.inPointMs
        : typeof source?.subclipInSec === 'number'
        ? Math.round(source.subclipInSec * 1000)
        : undefined,
    outPointMs:
      typeof source?.outPointMs === 'number'
        ? source.outPointMs
        : typeof source?.subclipOutSec === 'number'
        ? Math.round(source.subclipOutSec * 1000)
        : undefined,
    beatSnapEnabled: Boolean(source?.beatSnapEnabled),
    titleBangla: String(source?.titleBangla ?? source?.bengaliTitle ?? source?.titleBn ?? ''),
    titleEnglish: String(source?.titleEnglish ?? source?.title ?? source?.titleEn ?? `Shot ${index + 1}`),
    mediaUrl,
    mediaType: mediaUrl ? (isVideo ? 'video' : 'image') : undefined
  };
}
