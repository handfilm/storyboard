/**
 * @file /src/utils/stagePlaybackMath.ts
 * @description Core math and deterministic state controllers for Master Playback Architecture:
 * - 3-Slot Pre-Warmed Video Pool index resolver (`prevShot`, `activeShot`, `nextShot`)
 * - Single-In-Flight Seek Guard (`isSeekingRef` + `pendingSeekTimeRef` + `fastSeek` / exact snap)
 * - 60fps GPU Pan & Zoom clamping (`1.0x` - `4.0x`, `translate3d(panX, panY, 0) scale(zoom)`)
 */

export type PoolSlotRole = 'prev' | 'active' | 'next';

export interface ThreeSlotDescriptor {
  shotIdx: number;
  role: PoolSlotRole;
}

/**
 * Computes deduplicated pre-warmed pool slot indices `[prev, active, next]`
 * so each mounted video keeps a stable shot index key and promotes with 0ms flash.
 */
export function computeThreeSlotIndices(
  currentIndex: number,
  totalShots: number
): ThreeSlotDescriptor[] {
  const safeTotal = Math.max(0, totalShots);
  if (safeTotal === 0) return [];
  const activeIdx = ((currentIndex % safeTotal) + safeTotal) % safeTotal;
  const descriptors: ThreeSlotDescriptor[] = [];
  const seen = new Set<number>();

  if (safeTotal > 1) {
    const prevIdx = (activeIdx - 1 + safeTotal) % safeTotal;
    if (!seen.has(prevIdx)) {
      seen.add(prevIdx);
      descriptors.push({ shotIdx: prevIdx, role: 'prev' });
    }
  }

  seen.add(activeIdx);
  descriptors.push({ shotIdx: activeIdx, role: 'active' });

  if (safeTotal > 1) {
    const nextIdx = (activeIdx + 1) % safeTotal;
    if (!seen.has(nextIdx)) {
      seen.add(nextIdx);
      descriptors.push({ shotIdx: nextIdx, role: 'next' });
    }
  }

  return descriptors;
}

export interface GpuPanZoomState {
  zoom: number;
  panX: number;
  panY: number;
  cssTransform: string;
}

/**
 * Clamps GPU zoom to [1.0, 4.0] and clamps pan offsets strictly within container edges
 * for `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})` (applied right-to-left).
 */
export function clampGpuPanZoom(
  rawZoom: number,
  rawPanX: number,
  rawPanY: number,
  containerWidth: number,
  containerHeight: number
): GpuPanZoomState {
  const zoom = Math.max(1.0, Math.min(4.0, Number.isFinite(rawZoom) ? rawZoom : 1.0));
  const w = Math.max(0, Number.isFinite(containerWidth) ? containerWidth : 0);
  const h = Math.max(0, Number.isFinite(containerHeight) ? containerHeight : 0);

  const maxPanX = Math.max(0, ((zoom - 1.0) * w) / 2);
  const maxPanY = Math.max(0, ((zoom - 1.0) * h) / 2);

  const panX = zoom <= 1.001
    ? 0
    : Math.max(-maxPanX, Math.min(maxPanX, Number.isFinite(rawPanX) ? rawPanX : 0));
  const panY = zoom <= 1.001
    ? 0
    : Math.max(-maxPanY, Math.min(maxPanY, Number.isFinite(rawPanY) ? rawPanY : 0));

  const cssTransform =
    zoom <= 1.001 && Math.abs(panX) < 0.25 && Math.abs(panY) < 0.25
      ? 'none'
      : `translate3d(${panX.toFixed(1)}px, ${panY.toFixed(1)}px, 0) scale(${zoom.toFixed(4)})`;

  return { zoom, panX, panY, cssTransform };
}

export interface SeekableVideoLike {
  currentTime: number;
  duration: number;
  paused: boolean;
  seeking: boolean;
  pause?: () => void;
  fastSeek?: (time: number) => void;
}

export interface PendingSeekRequest {
  timeSec: number;
  exact: boolean;
}

export function normalizeVideoSeekTarget(
  targetSec: number,
  videoDuration: number
): number {
  const safeInput = Math.max(0, Number.isFinite(targetSec) ? targetSec : 0);
  if (!Number.isFinite(videoDuration) || videoDuration <= 0.04) {
    return safeInput;
  }
  const wrapped = safeInput >= videoDuration ? safeInput % videoDuration : safeInput;
  return Math.max(0, Math.min(videoDuration - 0.02, wrapped));
}

/**
 * Single-In-Flight Seek Guard Controller:
 * Never dispatches a concurrent seek while `isSeeking || video.seeking`.
 * Coalesces rapid pointer moves into `pendingSeek`, executing on `onSeeked`,
 * using `fastSeek` during drag and exact `currentTime` assignment on snap.
 */
export interface SeekGuardController {
  isSeeking: () => boolean;
  getPendingSeek: () => PendingSeekRequest | null;
  requestSeek: (
    video: SeekableVideoLike | null,
    targetSec: number,
    options?: { exact?: boolean; pauseFirst?: boolean }
  ) => boolean;
  handleSeeked: (video: SeekableVideoLike | null) => boolean;
  reset: () => void;
}

export function createSeekGuardController(): SeekGuardController {
  let isSeeking = false;
  let pendingSeek: PendingSeekRequest | null = null;

  const dispatchSeek = (
    video: SeekableVideoLike,
    targetSec: number,
    exact: boolean,
    pauseFirst: boolean
  ): boolean => {
    if (pauseFirst && !video.paused && typeof video.pause === 'function') {
      try {
        video.pause();
      } catch {
        // ignore
      }
    }

    const safeTarget = normalizeVideoSeekTarget(targetSec, video.duration);
    if (Math.abs((video.currentTime || 0) - safeTarget) < 0.002 && !video.seeking) {
      return false;
    }

    isSeeking = true;
    try {
      if (!exact && typeof video.fastSeek === 'function') {
        video.fastSeek(safeTarget);
      } else {
        video.currentTime = safeTarget;
      }
      return true;
    } catch {
      try {
        video.currentTime = safeTarget;
        return true;
      } catch {
        isSeeking = false;
        return false;
      }
    }
  };

  return {
    isSeeking: () => isSeeking,
    getPendingSeek: () => pendingSeek,
    requestSeek: (video, targetSec, options) => {
      if (!video) return false;
      const exact = Boolean(options?.exact);
      const pauseFirst = Boolean(options?.pauseFirst);

      if (pauseFirst && !video.paused && typeof video.pause === 'function') {
        try {
          video.pause();
        } catch {
          // ignore
        }
      }

      if (isSeeking || video.seeking) {
        pendingSeek = { timeSec: targetSec, exact };
        return false;
      }

      pendingSeek = null;
      return dispatchSeek(video, targetSec, exact, pauseFirst);
    },
    handleSeeked: (video) => {
      isSeeking = false;
      if (pendingSeek && video) {
        const queued = pendingSeek;
        pendingSeek = null;
        return dispatchSeek(video, queued.timeSec, queued.exact, false);
      }
      return false;
    },
    reset: () => {
      isSeeking = false;
      pendingSeek = null;
    }
  };
}
