/**
 * @file /src/utils/bufferRanges.ts
 * @description Pure helpers for extracting, merging, and querying HTML5 <video> `buffered` TimeRanges
 * to drive exact multi-segment visual buffer indicators with zero React re-render overhead.
 */

export interface BufferedRangeSegment {
  startSec: number;
  endSec: number;
  leftPct: number;
  widthPct: number;
}

export interface BufferedProgressSummary {
  segments: BufferedRangeSegment[];
  contiguousAheadSec: number;
  contiguousEndSec: number;
  contiguousEndPct: number;
  totalBufferedSec: number;
  totalBufferedPct: number;
}

export interface TimeRangesLike {
  length: number;
  start(index: number): number;
  end(index: number): number;
}

/**
 * Extracts, clamps, and merges touching/overlapping TimeRanges into normalized percentage segments.
 */
export function extractBufferedSegments(
  buffered: TimeRangesLike | null | undefined,
  durationSec: number
): BufferedRangeSegment[] {
  if (!buffered || !Number.isFinite(durationSec) || durationSec <= 0 || buffered.length <= 0) {
    return [];
  }

  const raw: Array<{ startSec: number; endSec: number }> = [];
  for (let i = 0; i < buffered.length; i++) {
    try {
      const s = Math.max(0, Math.min(durationSec, buffered.start(i)));
      const e = Math.max(0, Math.min(durationSec, buffered.end(i)));
      if (Number.isFinite(s) && Number.isFinite(e) && e > s + 0.001) {
        raw.push({ startSec: s, endSec: e });
      }
    } catch {
      // Guard against transient DOM IndexSizeError when media source resets mid-frame
    }
  }

  if (raw.length === 0) return [];
  raw.sort((a, b) => a.startSec - b.startSec);

  const merged: Array<{ startSec: number; endSec: number }> = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = raw[i];
    if (cur.startSec <= prev.endSec + 0.02) {
      prev.endSec = Math.max(prev.endSec, cur.endSec);
    } else {
      merged.push({ ...cur });
    }
  }

  return merged.map((seg) => {
    const leftPct = Math.max(0, Math.min(100, (seg.startSec / durationSec) * 100));
    const widthPct = Math.max(0, Math.min(100 - leftPct, ((seg.endSec - seg.startSec) / durationSec) * 100));
    return {
      startSec: seg.startSec,
      endSec: seg.endSec,
      leftPct,
      widthPct
    };
  });
}

/**
 * Computes contiguous ahead-of-playhead runway and total buffered coverage across all TimeRanges.
 */
export function computeBufferedSummary(
  buffered: TimeRangesLike | null | undefined,
  currentTimeSec: number,
  durationSec: number
): BufferedProgressSummary {
  const segments = extractBufferedSegments(buffered, durationSec);
  const safeCur = Number.isFinite(currentTimeSec) && currentTimeSec >= 0 ? currentTimeSec : 0;

  let totalBufferedSec = 0;
  let contiguousEndSec = safeCur;

  for (const seg of segments) {
    totalBufferedSec += seg.endSec - seg.startSec;
    if (seg.startSec <= safeCur + 0.05 && seg.endSec >= safeCur) {
      contiguousEndSec = Math.max(contiguousEndSec, seg.endSec);
    }
  }

  const contiguousAheadSec = Math.max(0, contiguousEndSec - safeCur);
  const safeDur = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
  const contiguousEndPct = safeDur > 0 ? Math.min(100, Math.max(0, (contiguousEndSec / safeDur) * 100)) : 0;
  const totalBufferedPct = safeDur > 0 ? Math.min(100, Math.max(0, (totalBufferedSec / safeDur) * 100)) : 0;

  return {
    segments,
    contiguousAheadSec,
    contiguousEndSec,
    contiguousEndPct,
    totalBufferedSec,
    totalBufferedPct
  };
}

/**
 * Checks whether a hovered timeline timestamp falls within a buffered TimeRange.
 */
export function isTimeInBufferedSegments(segments: BufferedRangeSegment[], timeSec: number): boolean {
  if (!Number.isFinite(timeSec) || segments.length === 0) return false;
  for (const seg of segments) {
    if (timeSec >= seg.startSec - 0.02 && timeSec <= seg.endSec + 0.02) {
      return true;
    }
  }
  return false;
}
