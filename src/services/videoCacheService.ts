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
export const FRAGMENT_BLOCK_BYTES = 2 * 1024 * 1024; // 2MB aligned 4K video fragment blocks
export const MAX_FRAGMENT_LRU_BYTES = 192 * 1024 * 1024; // 192MB LRU cap for 4K fragments
export const SEQUENCE_LOOKAHEAD_FRAGMENTS = 3; // Pre-fetch next 3 upcoming fragments ahead of playhead
export const MAX_SINGLE_RAM_BLOB_BYTES = 48 * 1024 * 1024; // 48MB per promoted remote clip
export const MAX_RAM_BLOB_CACHE_BYTES = 256 * 1024 * 1024; // 256MB total promoted RAM blob LRU
export const MAX_KEYFRAME_BITMAPS = 150;
export const KEYFRAME_QUANT_SEC = 0.25;

export interface VideoCacheServiceOptions {
  fragmentBlockBytes?: number;
  maxFragmentCacheBytes?: number;
  lookaheadFragments?: number;
  maxConcurrency?: number;
}

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
  fragmentCacheCount: number;
  fragmentCacheBytes: number;
  fragmentCacheHits: number;
  fragmentCacheEvictions: number;
}

interface PromotedBlobRecord {
  originalUrl: string;
  objectUrl: string;
  sizeBytes: number;
  lastUsedAt: number;
}

interface FragmentBlockRecord {
  key: string;
  url: string;
  blockIndex: number;
  startByte: number;
  bytes: Uint8Array;
  sizeBytes: number;
  lastUsedAt: number;
  hitCount: number;
}

interface KeyframeBitmapRecord {
  key: string;
  sourceUrl: string;
  bitmap: ImageBitmap;
}

interface PriorityPrefetchJob {
  kind: 'shot' | 'fragment';
  url: string;
  blockIndex?: number;
  priority: number;
  promote: boolean;
  generation: number;
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

function makeFragmentKey(sourceUrl: string, blockIndex: number): string {
  return `${sourceUrl}#block=${blockIndex}`;
}

export class VideoCacheService {
  private readonly fragmentBlockBytes: number;
  private readonly maxFragmentCacheBytes: number;
  private readonly lookaheadFragments: number;
  private readonly maxConcurrency: number;

  private warmedRanges = new Map<string, { totalBytes: number | null; warmedAt: number }>();
  private fragmentLru = new Map<string, FragmentBlockRecord>();
  private fragmentCacheBytes = 0;
  private fragmentCacheHits = 0;
  private fragmentCacheEvictions = 0;

  private promotedBlobs = new Map<string, PromotedBlobRecord>();
  private promotedBlobBytes = 0;
  private keyframeBitmaps = new Map<string, KeyframeBitmapRecord>();

  private inFlightWarmups = new Map<string, Promise<void>>();
  private inFlightFragments = new Map<string, Promise<Uint8Array | null>>();
  private inFlightPromotions = new Map<string, Promise<string | null>>();
  private activeQueue: PriorityPrefetchJob[] = [];
  private activeWorkers = 0;
  private windowGeneration = 0;
  private activeAbortControllers = new Map<string, AbortController>();
  private lastPlaybackBuckets = new Map<string, number>();

  constructor(options: VideoCacheServiceOptions = {}) {
    this.fragmentBlockBytes = Math.max(16 * 1024, options.fragmentBlockBytes ?? FRAGMENT_BLOCK_BYTES);
    this.maxFragmentCacheBytes = Math.max(64 * 1024, options.maxFragmentCacheBytes ?? MAX_FRAGMENT_LRU_BYTES);
    this.lookaheadFragments = Math.max(1, options.lookaheadFragments ?? SEQUENCE_LOOKAHEAD_FRAGMENTS);
    this.maxConcurrency = Math.max(1, options.maxConcurrency ?? 2);
  }

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
   * Checks whether an aligned 4K byte-range fragment is resident in the LRU cache without mutating recency.
   */
  public hasFragment(url: string, blockIndex: number): boolean {
    if (!url || blockIndex < 0) return false;
    return this.fragmentLru.has(makeFragmentKey(url, blockIndex));
  }

  /**
   * Retrieves a cached 4K video fragment and promotes it to MRU (Most Recently Used).
   */
  public getFragment(url: string, blockIndex: number): Uint8Array | null {
    if (!url || blockIndex < 0) return null;
    const key = makeFragmentKey(url, blockIndex);
    const rec = this.fragmentLru.get(key);
    if (!rec) return null;

    // Promote to MRU tail
    this.fragmentLru.delete(key);
    rec.lastUsedAt = Date.now();
    rec.hitCount += 1;
    this.fragmentLru.set(key, rec);
    this.fragmentCacheHits += 1;
    return rec.bytes;
  }

  /**
   * Inserts an aligned 4K video fragment into the byte-budgeted LRU cache,
   * evicting Least Recently Used fragments until `fragmentCacheBytes <= maxFragmentCacheBytes`.
   */
  public putFragment(url: string, blockIndex: number, bytes: Uint8Array, totalBytes?: number | null): void {
    if (!url || blockIndex < 0 || !bytes || bytes.byteLength === 0) return;
    if (bytes.byteLength > this.maxFragmentCacheBytes) return;

    if (totalBytes !== undefined && totalBytes !== null && totalBytes > 0) {
      this.recordWarmedUrl(url, totalBytes);
    }

    const key = makeFragmentKey(url, blockIndex);
    const existing = this.fragmentLru.get(key);
    if (existing) {
      this.fragmentCacheBytes = Math.max(0, this.fragmentCacheBytes - existing.sizeBytes);
      this.fragmentLru.delete(key);
    }

    while (
      this.fragmentCacheBytes + bytes.byteLength > this.maxFragmentCacheBytes &&
      this.fragmentLru.size > 0
    ) {
      const oldestKey = this.fragmentLru.keys().next().value;
      if (oldestKey === undefined) break;
      const oldest = this.fragmentLru.get(oldestKey);
      this.fragmentLru.delete(oldestKey);
      if (oldest) {
        this.fragmentCacheBytes = Math.max(0, this.fragmentCacheBytes - oldest.sizeBytes);
        this.fragmentCacheEvictions += 1;
      }
    }

    const record: FragmentBlockRecord = {
      key,
      url,
      blockIndex,
      startByte: blockIndex * this.fragmentBlockBytes,
      bytes,
      sizeBytes: bytes.byteLength,
      lastUsedAt: Date.now(),
      hitCount: 0
    };
    this.fragmentLru.set(key, record);
    this.fragmentCacheBytes += bytes.byteLength;
  }

  /**
   * Reads an arbitrary byte slice `[startByte, endByte]` purely from cached LRU fragments when fully resident.
   */
  public readCachedByteRange(url: string, startByte: number, endByte: number): Uint8Array | null {
    if (!url || startByte < 0 || endByte < startByte) return null;
    const firstBlock = Math.floor(startByte / this.fragmentBlockBytes);
    const lastBlock = Math.floor(endByte / this.fragmentBlockBytes);
    const chunks: Uint8Array[] = [];
    let totalLen = 0;

    for (let b = firstBlock; b <= lastBlock; b++) {
      const blockBytes = this.getFragment(url, b);
      if (!blockBytes) return null;
      const blockBase = b * this.fragmentBlockBytes;
      const sliceStart = Math.max(0, startByte - blockBase);
      const sliceEnd = Math.min(blockBytes.byteLength, endByte - blockBase + 1);
      if (sliceEnd <= sliceStart) return null;
      const sub = blockBytes.subarray(sliceStart, sliceEnd);
      chunks.push(sub);
      totalLen += sub.byteLength;
    }

    if (chunks.length === 1) return chunks[0];
    const merged = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return merged;
  }

  /**
   * Fetches a single aligned 4K byte-range fragment (`Range: bytes=blockStart-blockEnd`) and caches it in LRU.
   */
  public fetchAndCacheFragment(
    url: string,
    blockIndex: number,
    options: { signal?: AbortSignal } = {}
  ): Promise<Uint8Array | null> {
    if (!isCacheableHttpUrl(url) || blockIndex < 0 || typeof fetch !== 'function') {
      return Promise.resolve(null);
    }

    const cached = this.getFragment(url, blockIndex);
    if (cached) {
      return Promise.resolve(cached);
    }

    const fragKey = makeFragmentKey(url, blockIndex);
    const inflight = this.inFlightFragments.get(fragKey);
    if (inflight) return inflight;

    const knownTotal = this.warmedRanges.get(url)?.totalBytes ?? null;
    const blockStart = blockIndex * this.fragmentBlockBytes;
    const blockEnd =
      knownTotal !== null && knownTotal > 0
        ? Math.min(knownTotal - 1, blockStart + this.fragmentBlockBytes - 1)
        : blockStart + this.fragmentBlockBytes - 1;

    if (blockStart > blockEnd) {
      return Promise.resolve(null);
    }

    const task = (async (): Promise<Uint8Array | null> => {
      const controller = !options.signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
      const signal = options.signal ?? controller?.signal;
      if (controller) {
        this.activeAbortControllers.set(fragKey, controller);
      }

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Range: `bytes=${blockStart}-${blockEnd}` },
          mode: 'cors',
          credentials: 'omit',
          signal
        });

        if (!res || (!res.ok && res.status !== 206)) return null;

        const arrayBuf = await res.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        if (bytes.byteLength === 0) return null;

        const contentRangeTotal = parseContentRangeTotal(res.headers?.get?.('content-range') ?? null);
        const contentLenHeader = Number(res.headers?.get?.('content-length') ?? 0);
        const totalBytes =
          contentRangeTotal ??
          (res.status === 200 && Number.isFinite(contentLenHeader) && contentLenHeader > 0
            ? contentLenHeader
            : null);

        if (res.status === 200 && blockIndex === 0 && bytes.byteLength > this.fragmentBlockBytes) {
          // Server returned full file instead of 206: partition cleanly into aligned LRU fragments
          const count = Math.ceil(bytes.byteLength / this.fragmentBlockBytes);
          for (let b = 0; b < count; b++) {
            const s = b * this.fragmentBlockBytes;
            const e = Math.min(bytes.byteLength, s + this.fragmentBlockBytes);
            this.putFragment(url, b, bytes.slice(s, e), bytes.byteLength);
          }
          return this.getFragment(url, 0);
        }

        this.putFragment(url, blockIndex, bytes, totalBytes);
        return bytes;
      } catch {
        return null;
      } finally {
        this.activeAbortControllers.delete(fragKey);
      }
    })().finally(() => {
      this.inFlightFragments.delete(fragKey);
    });

    this.inFlightFragments.set(fragKey, task);
    return task;
  }

  /**
   * Pre-warms a single video URL using bounded HTTP Range requests (head 4MB + moov tail 1MB)
   * so both local fragment LRU, local RAM block cache, and Chromium HTTP cache are hot before playback.
   */
  public warmVideoUrl(url: string, options: { promoteSmallRemoteBlob?: boolean; force?: boolean } = {}): Promise<void> {
    if (!isCacheableHttpUrl(url)) return Promise.resolve();
    if (!options.force && this.warmedRanges.has(url)) {
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

      let receivedBytes: Uint8Array | null = null;
      let receivedLen = 0;
      try {
        const buf = await headRes.arrayBuffer();
        receivedBytes = new Uint8Array(buf);
        receivedLen = receivedBytes.byteLength;
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

      // Populate aligned LRU fragments from head payload cleanly
      if (receivedBytes && receivedBytes.byteLength > 0) {
        const blockCount = Math.ceil(receivedBytes.byteLength / this.fragmentBlockBytes);
        for (let b = 0; b < blockCount; b++) {
          const s = b * this.fragmentBlockBytes;
          const e = Math.min(receivedBytes.byteLength, s + this.fragmentBlockBytes);
          this.putFragment(url, b, receivedBytes.slice(s, e), totalBytes);
        }
      }

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
              const tailBuf = await tailRes.arrayBuffer().catch(() => null);
              if (tailBuf && tailBuf.byteLength > 0 && tailStart % this.fragmentBlockBytes === 0) {
                this.putFragment(
                  url,
                  Math.floor(tailStart / this.fragmentBlockBytes),
                  new Uint8Array(tailBuf),
                  totalBytes
                );
              }
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
   * Prioritizes upcoming 4K byte-range fragments ahead of `currentTimeSec` in the active playback sequence,
   * followed by upcoming storyboard shot URLs (`upcomingShotUrls`), guaranteeing buffer-free sequential playback.
   */
  public prefetchPlaybackSequence(
    url: string,
    currentTimeSec: number,
    durationSec: number,
    upcomingShotUrls: string[] = []
  ): number[] {
    if (!isCacheableHttpUrl(url)) return [];

    const totalBytes = this.warmedRanges.get(url)?.totalBytes ?? null;
    const queuedBlockIndices: number[] = [];

    this.windowGeneration++;
    const gen = this.windowGeneration;
    this.activeQueue = [];

    if (!totalBytes || totalBytes <= 0 || !Number.isFinite(durationSec) || durationSec <= 0) {
      // File size not yet known: warm head + moov first at top priority
      if (!this.warmedRanges.has(url)) {
        this.activeQueue.push({
          kind: 'shot',
          url,
          priority: 0,
          promote: true,
          generation: gen
        });
      }
    } else {
      const safeTime = Math.max(0, Math.min(durationSec, Number.isFinite(currentTimeSec) ? currentTimeSec : 0));
      const estimatedByte = Math.floor((safeTime / durationSec) * totalBytes);
      const startBlock = Math.max(0, Math.floor(estimatedByte / this.fragmentBlockBytes));
      const totalBlocks = Math.ceil(totalBytes / this.fragmentBlockBytes);

      const desiredKeys = new Set<string>();
      for (let offset = 0; offset < this.lookaheadFragments; offset++) {
        const blockIdx = startBlock + offset;
        if (blockIdx >= totalBlocks) break;
        const fragKey = makeFragmentKey(url, blockIdx);
        desiredKeys.add(fragKey);

        if (this.hasFragment(url, blockIdx)) {
          // Refresh LRU recency for already-cached upcoming segments so they aren't evicted mid-playback
          this.getFragment(url, blockIdx);
        } else {
          queuedBlockIndices.push(blockIdx);
          this.activeQueue.push({
            kind: 'fragment',
            url,
            blockIndex: blockIdx,
            priority: offset,
            promote: false,
            generation: gen
          });
        }
      }

      // Abort stale in-flight fragment requests for other positions no longer ahead of playhead
      for (const [inflightKey, controller] of this.activeAbortControllers.entries()) {
        if (inflightKey.startsWith(`${url}#block=`) && !desiredKeys.has(inflightKey)) {
          try {
            controller.abort();
          } catch {}
          this.activeAbortControllers.delete(inflightKey);
        }
      }
    }

    // Queue upcoming shots in the storyboard playback sequence at lower priority than immediate active segments
    upcomingShotUrls.forEach((nextUrl, idx) => {
      if (!nextUrl || nextUrl === url || !isCacheableHttpUrl(nextUrl)) return;
      this.activeQueue.push({
        kind: 'shot',
        url: nextUrl,
        priority: 100 + idx,
        promote: true,
        generation: gen
      });
    });

    this.drainQueue();
    return queuedBlockIndices;
  }

  /**
   * Lightweight playhead tracker invoked during playback/buffering.
   * Quantizes position into 2s buckets so it triggers `prefetchPlaybackSequence` only when advancing into a new horizon.
   */
  public updatePlaybackPosition(
    url: string,
    currentTimeSec: number,
    durationSec: number,
    contiguousBufferedEndSec?: number,
    upcomingShotUrls: string[] = []
  ): void {
    if (!isCacheableHttpUrl(url) || !Number.isFinite(durationSec) || durationSec <= 0) return;
    const anchorSec = Math.max(
      Number.isFinite(currentTimeSec) ? currentTimeSec : 0,
      Number.isFinite(contiguousBufferedEndSec) ? (contiguousBufferedEndSec as number) : 0
    );
    const bucket = Math.floor(anchorSec / 2);
    const prevBucket = this.lastPlaybackBuckets.get(url);
    if (prevBucket === bucket) return;

    this.lastPlaybackBuckets.set(url, bucket);
    this.prefetchPlaybackSequence(url, anchorSec, durationSec, upcomingShotUrls);
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
    for (const [inflightKey, controller] of this.activeAbortControllers.entries()) {
      const baseUrl = inflightKey.split('#block=')[0];
      if (!seenUrls.has(baseUrl)) {
        try {
          controller.abort();
        } catch {}
        this.activeAbortControllers.delete(inflightKey);
      }
    }

    targetUrls.forEach((url, priority) => {
      this.activeQueue.push({ kind: 'shot', url, priority, promote, generation: gen });
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
    if (this.activeQueue.length > 1) {
      this.activeQueue.sort((a, b) => a.priority - b.priority);
    }
    while (this.activeWorkers < this.maxConcurrency && this.activeQueue.length > 0) {
      const job = this.activeQueue.shift();
      if (!job || job.generation !== this.windowGeneration) continue;
      this.activeWorkers++;

      const workPromise: Promise<unknown> =
        job.kind === 'fragment' && job.blockIndex !== undefined
          ? this.fetchAndCacheFragment(job.url, job.blockIndex)
          : this.warmVideoUrl(job.url, { promoteSmallRemoteBlob: job.promote });

      void workPromise.finally(() => {
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
    this.lastPlaybackBuckets.delete(url);

    for (const [k, rec] of this.fragmentLru.entries()) {
      if (rec.url === url) {
        this.fragmentLru.delete(k);
        this.fragmentCacheBytes = Math.max(0, this.fragmentCacheBytes - rec.sizeBytes);
      }
    }

    for (const [key, controller] of this.activeAbortControllers.entries()) {
      if (key === url || key.startsWith(`${url}#block=`)) {
        try {
          controller.abort();
        } catch {}
        this.activeAbortControllers.delete(key);
      }
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
    this.lastPlaybackBuckets.clear();
    this.fragmentLru.clear();
    this.fragmentCacheBytes = 0;
    this.fragmentCacheHits = 0;
    this.fragmentCacheEvictions = 0;
    this.inFlightWarmups.clear();
    this.inFlightFragments.clear();
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
      inFlightPrefetches: this.inFlightWarmups.size + this.inFlightFragments.size,
      fragmentCacheCount: this.fragmentLru.size,
      fragmentCacheBytes: this.fragmentCacheBytes,
      fragmentCacheHits: this.fragmentCacheHits,
      fragmentCacheEvictions: this.fragmentCacheEvictions
    };
  }
}

export function createVideoCacheService(options?: VideoCacheServiceOptions): VideoCacheService {
  return new VideoCacheService(options);
}

export const videoCacheService = new VideoCacheService();
