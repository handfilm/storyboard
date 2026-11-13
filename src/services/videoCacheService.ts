/**
 * @file /src/services/videoCacheService.ts
 * @description VLC-Grade Multi-Tier Video Caching & Lookahead Prefetch Engine.
 *
 * Tiers:
 * 1. Byte-Range Lookahead Prefetcher: Pre-warms initial 4MB head + 1MB tail (`moov` atom)
 *    for active and upcoming/previous shots (`[0, +1, +2, +3, -1]`) with concurrency=2.
 *    Populates both Chromium HTTP cache and the Node/Rust 1MB LRU RAM block cache.
 * 2. Promoted RAM Blob LRU (256MB cap, <= 48MB per remote clip): Promotes remote HTTP
 *    videos into in-memory `blob:` ObjectURLs for 0ms seeking, looping, and replay.
 *    Skips `/api/local-video` (multi-GB SSD streams served directly via HTTP 206 + RAM blocks).
 * 3. Decoded Keyframe `ImageBitmap` Scrub Ring Buffer (150 frames max, 0.25s quantization)
 *    with deterministic `.close()` cleanup on eviction.
 */

import { isVideoSourceUrl, isSvgPlaceholderUrl } from './thumbnailEngine';
import { resolveShotMediaEntry, type ShotMediaEntry } from './handfilmMediaVault';
import { isVideoMediaUrl } from '../utils/playbackClock';

export const HEAD_PREFETCH_BYTES = 4 * 1024 * 1024; // 4MB head (ftyp + initial GOPs)
export const TAIL_PREFETCH_BYTES = 1 * 1024 * 1024; // 1MB tail (moov atom when non-faststart)
export const MAX_SINGLE_RAM_BLOB_BYTES = 48 * 1024 * 1024; // 48MB per promoted remote clip
export const MAX_RAM_BLOB_CACHE_BYTES = 256 * 1024 * 1024; // 256MB total promoted RAM blob LRU
export const MAX_KEYFRAME_BITMAPS = 150;
export const KEYFRAME_QUANT_SEC = 0.25;

export interface ShotWindowFrameLike {
  id?: string | number;
  imageUrl?: string;
  videoSrc?: string;
  blobUrl?: string;
  remoteUrl?: string;
  isVideo?: boolean;
  mimeType?: string;
}

export interface PrefetchWindowOptions {
  offsets?: number[];
  promoteSmallRemoteBlobs?: boolean;
}

export interface VideoCacheStats {
  warmedRangeCount: number;
  promotedBlobCount: number;
  promotedBlobBytes: number;
  keyframeBitmapCount: number;
  inFlightPrefetches: number;
}

interface PromotedBlobRecord {
  originalUrl: string;
  objectUrl: string;
  sizeBytes: number;
  lastUsedAt: number;
}

interface KeyframeBitmapRecord {
  key: string;
  sourceUrl: string;
  bitmap: ImageBitmap;
}

export function isLocalRangeStreamUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('/api/local-video');
}

function isCacheableHttpUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:') || isSvgPlaceholderUrl(url)) {
    return false;
  }
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/')
  );
}

function parseContentRangeTotal(contentRange: string | null): number | null {
  if (!contentRange) return null;
  const slashIdx = contentRange.lastIndexOf('/');
  if (slashIdx === -1) return null;
  const totalStr = contentRange.slice(slashIdx + 1).trim();
  if (!totalStr || totalStr === '*') return null;
  const parsed = Number(totalStr);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function quantizeKeyframeTime(timeSec: number): number {
  const safe = Number.isFinite(timeSec) && timeSec >= 0 ? timeSec : 0;
  return Math.round(safe / KEYFRAME_QUANT_SEC) * KEYFRAME_QUANT_SEC;
}

function makeKeyframeKey(sourceUrl: string, timeSec: number): string {
  return `${sourceUrl}@@${quantizeKeyframeTime(timeSec).toFixed(2)}`;
}

class VideoCacheService {
  private warmedRanges = new Map<string, { totalBytes: number | null; warmedAt: number }>();
  private promotedBlobs = new Map<string, PromotedBlobRecord>();
  private promotedBlobBytes = 0;
  private keyframeBitmaps = new Map<string, KeyframeBitmapRecord>();

  private inFlightWarmups = new Map<string, Promise<void>>();
  private inFlightPromotions = new Map<string, Promise<string | null>>();
  private activeQueue: Array<{ url: string; priority: number; promote: boolean; generation: number }> = [];
  private activeWorkers = 0;
  private readonly maxConcurrency = 2;
  private windowGeneration = 0;
  private activeAbortControllers = new Map<string, AbortController>();

  /**
   * Synchronously returns a promoted `blob:` RAM ObjectURL if cached; otherwise returns the original URL.
   * Refreshing LRU recency guarantees active shots remain pinned in RAM.
   */
  public getFastUrlSync(url: string | null | undefined): string {
    if (!url) return '';
    const record = this.promotedBlobs.get(url);
    if (record) {
      this.promotedBlobs.delete(url);
      record.lastUsedAt = Date.now();
      this.promotedBlobs.set(url, record);
      return record.objectUrl;
    }
    return url;
  }

  public hasWarmedRange(url: string): boolean {
    return this.warmedRanges.has(url);
  }

  public hasPromotedBlob(url: string): boolean {
    return this.promotedBlobs.has(url);
  }

  /**
   * Pre-warms a single video URL using bounded HTTP Range requests (head 4MB + moov tail 1MB)
   * so both local RAM block cache and Chromium HTTP cache are hot before playback/scrubbing.
   */
  public warmVideoUrl(url: string, options: { promoteSmallRemoteBlob?: boolean; force?: boolean } = {}): Promise<void> {
    if (!isCacheableHttpUrl(url)) return Promise.resolve();
    if (!options.force && this.warmedRanges.has(url)) {
      // Refresh recency
      const existing = this.warmedRanges.get(url)!;
      this.warmedRanges.delete(url);
      existing.warmedAt = Date.now();
      this.warmedRanges.set(url, existing);
      if (options.promoteSmallRemoteBlob && !isLocalRangeStreamUrl(url) && !this.promotedBlobs.has(url)) {
        void this.promoteRemoteVideoToRam(url);
      }
      return Promise.resolve();
    }

    const existingPromise = this.inFlightWarmups.get(url);
    if (existingPromise) return existingPromise;

    const task = this.executeRangeWarmup(url, Boolean(options.promoteSmallRemoteBlob))
      .finally(() => {
        this.inFlightWarmups.delete(url);
      });
    this.inFlightWarmups.set(url, task);
    return task;
  }

  private async executeRangeWarmup(url: string, promoteSmallRemoteBlob: boolean): Promise<void> {
    if (typeof fetch !== 'function') return;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) {
      this.activeAbortControllers.set(url, controller);
    }

    try {
      const headEnd = HEAD_PREFETCH_BYTES - 1;
      const headRes = await fetch(url, {
        method: 'GET',
        headers: { Range: `bytes=0-${headEnd}` },
        mode: 'cors',
        credentials: 'omit',
        signal: controller?.signal
      });

      if (!headRes || (!headRes.ok && headRes.status !== 206)) return;

      // Consume response body so Chromium commits bytes to disk/memory cache cleanly
      let receivedLen = 0;
      try {
        const buf = await headRes.arrayBuffer();
        receivedLen = buf.byteLength;
      } catch {
        // ignore abort/body consumption error
      }

      const contentRangeTotal = parseContentRangeTotal(headRes.headers?.get?.('content-range') ?? null);
      const contentLenHeader = Number(headRes.headers?.get?.('content-length') ?? 0);
      const totalBytes =
        contentRangeTotal ??
        (headRes.status === 200 && Number.isFinite(contentLenHeader) && contentLenHeader > 0
          ? contentLenHeader
          : receivedLen > 0
            ? receivedLen
            : null);

      this.recordWarmedUrl(url, totalBytes);

      // Prefetch tail 1MB moov atom when file extends beyond initial 4MB head window
      if (totalBytes && totalBytes > HEAD_PREFETCH_BYTES + 4096) {
        const tailStart = Math.max(HEAD_PREFETCH_BYTES, totalBytes - TAIL_PREFETCH_BYTES);
        const tailEnd = totalBytes - 1;
        if (tailEnd > tailStart) {
          try {
            const tailRes = await fetch(url, {
              method: 'GET',
              headers: { Range: `bytes=${tailStart}-${tailEnd}` },
              mode: 'cors',
              credentials: 'omit',
              signal: controller?.signal
            });
            if (tailRes && (tailRes.ok || tailRes.status === 206)) {
              await tailRes.arrayBuffer().catch(() => {});
            }
          } catch {
            // Non-fatal tail prefetch skip
          }
        }
      }

      // Tier 2: Promote small-to-medium remote clips (<= 48MB) into zero-copy RAM ObjectURLs
      if (
        promoteSmallRemoteBlob &&
        !isLocalRangeStreamUrl(url) &&
        totalBytes !== null &&
        totalBytes > 0 &&
        totalBytes <= MAX_SINGLE_RAM_BLOB_BYTES
      ) {
        void this.promoteRemoteVideoToRam(url);
      }
    } catch {
      // Aborted or network offline - fail silently without blocking UI
    } finally {
      this.activeAbortControllers.delete(url);
    }
  }

  private recordWarmedUrl(url: string, totalBytes: number | null): void {
    if (this.warmedRanges.has(url)) {
      this.warmedRanges.delete(url);
    }
    while (this.warmedRanges.size >= 120) {
      const oldest = this.warmedRanges.keys().next().value;
      if (oldest === undefined) break;
      this.warmedRanges.delete(oldest);
    }
    this.warmedRanges.set(url, { totalBytes, warmedAt: Date.now() });
  }

  /**
   * Promotes a remote HTTP video (<= 48MB) into an in-memory Blob + ObjectURL under the 256MB RAM LRU budget.
   * Never downloads `/api/local-video` multi-GB SSD streams into browser JS heap.
   */
  public promoteRemoteVideoToRam(url: string): Promise<string | null> {
    if (!isCacheableHttpUrl(url) || isLocalRangeStreamUrl(url)) {
      return Promise.resolve(null);
    }

    const existing = this.promotedBlobs.get(url);
    if (existing) {
      this.promotedBlobs.delete(url);
      existing.lastUsedAt = Date.now();
      this.promotedBlobs.set(url, existing);
      return Promise.resolve(existing.objectUrl);
    }

    const inflight = this.inFlightPromotions.get(url);
    if (inflight) return inflight;

    const promise = (async (): Promise<string | null> => {
      if (typeof fetch !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return null;
      }
      try {
        // Optional HEAD/Range guard if file size unknown
        const known = this.warmedRanges.get(url)?.totalBytes ?? null;
        if (known !== null && known > MAX_SINGLE_RAM_BLOB_BYTES) {
          return null;
        }

        const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (!resp || !resp.ok) return null;

        const lenHeader = Number(resp.headers?.get?.('content-length') ?? 0);
        if (lenHeader > MAX_SINGLE_RAM_BLOB_BYTES) {
          return null;
        }

        const blob = await resp.blob();
        if (!blob || blob.size === 0 || blob.size > MAX_SINGLE_RAM_BLOB_BYTES) {
          return null;
        }

        const objectUrl = URL.createObjectURL(blob);
        this.insertPromotedBlob(url, objectUrl, blob.size);
        return objectUrl;
      } catch {
        return null;
      }
    })().finally(() => {
      this.inFlightPromotions.delete(url);
    });

    this.inFlightPromotions.set(url, promise);
    return promise;
  }

  /**
   * Allows tests or manual loaders to insert/track a promoted Blob record cleanly inside the LRU budget.
   */
  public insertPromotedBlob(originalUrl: string, objectUrl: string, sizeBytes: number): void {
    if (sizeBytes <= 0 || sizeBytes > MAX_SINGLE_RAM_BLOB_BYTES) return;
    const prev = this.promotedBlobs.get(originalUrl);
    if (prev) {
      this.promotedBlobBytes -= prev.sizeBytes;
      if (prev.objectUrl !== objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(prev.objectUrl);
        } catch {}
      }
      this.promotedBlobs.delete(originalUrl);
    }

    while (this.promotedBlobBytes + sizeBytes > MAX_RAM_BLOB_CACHE_BYTES && this.promotedBlobs.size > 0) {
      const oldestKey = this.promotedBlobs.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.promotedBlobs.get(oldestKey);
      this.promotedBlobs.delete(oldestKey);
      if (oldest) {
        this.promotedBlobBytes = Math.max(0, this.promotedBlobBytes - oldest.sizeBytes);
        if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          try {
            URL.revokeObjectURL(oldest.objectUrl);
          } catch {}
        }
      }
    }

    this.promotedBlobs.set(originalUrl, {
      originalUrl,
      objectUrl,
      sizeBytes,
      lastUsedAt: Date.now()
    });
    this.promotedBlobBytes += sizeBytes;
  }

  /**
   * Lookahead shot-window prefetcher: warms active shot + neighbor shots `[0, +1, +2, +3, -1]`
   * in priority order under a strict concurrency cap of 2.
   */
  public prefetchShotWindow(
    frames: ShotWindowFrameLike[],
    currentIndex: number,
    shotMediaMap?: Record<string, ShotMediaEntry>,
    options: PrefetchWindowOptions = {}
  ): string[] {
    if (!frames || frames.length === 0) return [];
    const total = frames.length;
    const offsets = options.offsets ?? [0, 1, 2, 3, -1];
    const promote = options.promoteSmallRemoteBlobs ?? true;

    const targetUrls: string[] = [];
    const seenUrls = new Set<string>();

    for (const offset of offsets) {
      const idx = ((currentIndex + offset) % total + total) % total;
      const frame = frames[idx];
      if (!frame) continue;
      const entry = shotMediaMap ? resolveShotMediaEntry(shotMediaMap, frame as any, undefined, idx) : undefined;
      const candidateUrl = entry?.url || frame.videoSrc || frame.blobUrl || frame.remoteUrl || frame.imageUrl || '';
      if (!candidateUrl || seenUrls.has(candidateUrl) || !isCacheableHttpUrl(candidateUrl)) continue;

      const isVid = entry
        ? entry.type === 'video'
        : isVideoSourceUrl(candidateUrl, { isVideo: frame.isVideo, mimeType: frame.mimeType }) ||
          isVideoMediaUrl(candidateUrl, frame.isVideo, frame.mimeType);

      if (!isVid) continue;
      seenUrls.add(candidateUrl);
      targetUrls.push(candidateUrl);
    }

    // Cancel stale queued jobs outside current window and enqueue prioritized jobs
    this.windowGeneration++;
    const gen = this.windowGeneration;
    this.activeQueue = [];

    // Abort in-flight prefetches that are no longer inside the active window
    for (const [inflightUrl, controller] of this.activeAbortControllers.entries()) {
      if (!seenUrls.has(inflightUrl)) {
        try {
          controller.abort();
        } catch {}
        this.activeAbortControllers.delete(inflightUrl);
      }
    }

    targetUrls.forEach((url, priority) => {
      this.activeQueue.push({ url, priority, promote, generation: gen });
    });

    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller && targetUrls.length > 0) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'PREFETCH_VIDEO_FRAGMENTS',
          payload: { urls: targetUrls }
        });
      } catch {
        // Non-fatal SW notification fallback
      }
    }

    this.drainQueue();
    return targetUrls;
  }

  private drainQueue(): void {
    while (this.activeWorkers < this.maxConcurrency && this.activeQueue.length > 0) {
      const job = this.activeQueue.shift();
      if (!job || job.generation !== this.windowGeneration) continue;
      this.activeWorkers++;
      void this.warmVideoUrl(job.url, { promoteSmallRemoteBlob: job.promote }).finally(() => {
        this.activeWorkers = Math.max(0, this.activeWorkers - 1);
        this.drainQueue();
      });
    }
  }

  /**
   * Tier 3: Quantized Keyframe ImageBitmap LRU Ring Buffer for zero-stall hover/scrub preview.
   */
  public getKeyframeBitmap(sourceUrl: string, timeSec: number): ImageBitmap | null {
    if (!sourceUrl) return null;
    const key = makeKeyframeKey(sourceUrl, timeSec);
    const rec = this.keyframeBitmaps.get(key);
    if (!rec) return null;
    this.keyframeBitmaps.delete(key);
    this.keyframeBitmaps.set(key, rec);
    return rec.bitmap;
  }

  public setKeyframeBitmap(sourceUrl: string, timeSec: number, bitmap: ImageBitmap): void {
    if (!sourceUrl || !bitmap) return;
    const key = makeKeyframeKey(sourceUrl, timeSec);
    const existing = this.keyframeBitmaps.get(key);
    if (existing) {
      if (existing.bitmap !== bitmap && typeof existing.bitmap.close === 'function') {
        try {
          existing.bitmap.close();
        } catch {}
      }
      this.keyframeBitmaps.delete(key);
    }

    while (this.keyframeBitmaps.size >= MAX_KEYFRAME_BITMAPS) {
      const oldestKey = this.keyframeBitmaps.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.keyframeBitmaps.get(oldestKey);
      this.keyframeBitmaps.delete(oldestKey);
      if (oldest && typeof oldest.bitmap.close === 'function') {
        try {
          oldest.bitmap.close();
        } catch {}
      }
    }

    this.keyframeBitmaps.set(key, { key, sourceUrl, bitmap });
  }

  public async captureKeyframeBitmap(
    video: HTMLVideoElement,
    sourceUrl: string,
    timeSec: number
  ): Promise<ImageBitmap | null> {
    if (!sourceUrl || !video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      return null;
    }
    const cached = this.getKeyframeBitmap(sourceUrl, timeSec);
    if (cached) return cached;
    if (typeof createImageBitmap !== 'function') return null;

    try {
      const bitmap = await createImageBitmap(video);
      this.setKeyframeBitmap(sourceUrl, timeSec, bitmap);
      return bitmap;
    } catch {
      return null;
    }
  }

  public evictUrl(url: string): void {
    if (!url) return;
    this.warmedRanges.delete(url);
    const controller = this.activeAbortControllers.get(url);
    if (controller) {
      try {
        controller.abort();
      } catch {}
      this.activeAbortControllers.delete(url);
    }

    const blobRec = this.promotedBlobs.get(url);
    if (blobRec) {
      this.promotedBlobs.delete(url);
      this.promotedBlobBytes = Math.max(0, this.promotedBlobBytes - blobRec.sizeBytes);
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(blobRec.objectUrl);
        } catch {}
      }
    }

    for (const [k, rec] of this.keyframeBitmaps.entries()) {
      if (rec.sourceUrl === url) {
        this.keyframeBitmaps.delete(k);
        if (typeof rec.bitmap.close === 'function') {
          try {
            rec.bitmap.close();
          } catch {}
        }
      }
    }
  }

  public clearAll(): void {
    this.windowGeneration++;
    this.activeQueue = [];
    for (const controller of this.activeAbortControllers.values()) {
      try {
        controller.abort();
      } catch {}
    }
    this.activeAbortControllers.clear();
    this.warmedRanges.clear();
    this.inFlightWarmups.clear();
    this.inFlightPromotions.clear();

    for (const rec of this.promotedBlobs.values()) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        try {
          URL.revokeObjectURL(rec.objectUrl);
        } catch {}
      }
    }
    this.promotedBlobs.clear();
    this.promotedBlobBytes = 0;

    for (const rec of this.keyframeBitmaps.values()) {
      if (typeof rec.bitmap.close === 'function') {
        try {
          rec.bitmap.close();
        } catch {}
      }
    }
    this.keyframeBitmaps.clear();
  }

  public getStats(): VideoCacheStats {
    return {
      warmedRangeCount: this.warmedRanges.size,
      promotedBlobCount: this.promotedBlobs.size,
      promotedBlobBytes: this.promotedBlobBytes,
      keyframeBitmapCount: this.keyframeBitmaps.size,
      inFlightPrefetches: this.inFlightWarmups.size
    };
  }
}

export const videoCacheService = new VideoCacheService();
