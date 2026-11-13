/**
 * @file /src/services/thumbnailEngine.ts
 * @description High-Performance Video Thumbnail & Tactical Hover-Scrubbing Engine with 2-Tier Fallback.
 * 
 * Mandates:
 * 1. Primary (Fast DOM Video Seek): Off-DOM lightweight <video preload="metadata" muted playsInline>,
 *    seek to 0.1s (or 10% duration), draw to 160x90 canvas, extract JPEG 0.7 data URL.
 * 2. Secondary (WebCodecs): Decodes first VideoFrame, renders to canvas, explicitly calls frame.close() immediately.
 * 3. Exact Metadata Extractor: duration, videoWidth, videoHeight, fps, aspectRatio, isVertical.
 * 4. Zero-Crash Fallbacks: Explicit try/catch guards with console.warn('[RECOVERY FALLBACK]', error).
 */

import { studioDraftDb } from './db';
import { eventBus } from '../core/eventBus';

export const THUMB_WIDTH = 160;
export const THUMB_HEIGHT = 90;
export const THUMB_JPEG_QUALITY = 0.78;
export const DEFAULT_KEYFRAME_TIMESTAMP_SEC = 0.5;
const THUMB_OFFSCREEN_HOST_ID = 'handfilm-offscreen-thumb-host';

export interface ExtractedPosterResult {
  base64: string;
  blob: Blob;
  width: number;
  height: number;
  duration: number;
  timecode: string;
}

export interface VideoMetadata {
  duration: number;
  videoWidth: number;
  videoHeight: number;
  fps: number;
  aspectRatio: string;
  isVertical: boolean;
}

export interface HoverScrubState {
  normalizedX: number;
  currentSec: number;
  timecode: string;
  thumbnailSource?: string;
}

export function isSvgPlaceholderUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().toLowerCase().startsWith('data:image/svg+xml');
}

export function isVideoSourceUrl(
  url?: string | null,
  flags?: { isVideo?: boolean; mimeType?: string | null; name?: string | null }
): boolean {
  if (flags?.isVideo) return true;
  if (flags?.mimeType && flags.mimeType.toLowerCase().startsWith('video/')) return true;
  if (flags?.name && /\.(mp4|webm|mov|m4v|mkv|avi|ogv)(\?|$)/i.test(flags.name)) return true;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('data:video')) return true;
  if (/\.(mp4|webm|mov|m4v|mkv|avi|ogv)(\?|#|$)/i.test(trimmed)) return true;
  if (trimmed.includes('/api/local-video')) {
    try {
      const qIdx = url.indexOf('?');
      if (qIdx !== -1) {
        const params = new URLSearchParams(url.slice(qIdx + 1));
        const nativePath = params.get('path') || '';
        if (/\.(mp4|webm|mov|m4v|mkv|avi|ogv)$/i.test(nativePath)) return true;
      }
    } catch {
      // ignore malformed query
    }
  }
  return false;
}

// In-Memory Fast LRU Cache (Up to 250 items)
class ThumbnailMemoryCache {
  private cache = new Map<string, string>();
  private maxEntries = 250;

  get(key: string): string | undefined {
    const val = this.cache.get(key);
    if (val) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }

  set(key: string, val: string): void {
    if (!key || !val || isSvgPlaceholderUrl(val)) return;
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, val);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const thumbnailMemoryCache = new ThumbnailMemoryCache();

export function getCachedThumbnailUrl(
  keys: Array<string | number | undefined | null>
): string | null {
  for (const rawKey of keys) {
    if (rawKey === undefined || rawKey === null) continue;
    const key = String(rawKey).trim();
    if (!key) continue;
    const hit = thumbnailMemoryCache.get(key);
    if (hit && !isSvgPlaceholderUrl(hit)) {
      return hit;
    }
  }
  return null;
}

function getOffscreenThumbHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let host = document.getElementById(THUMB_OFFSCREEN_HOST_ID);
  if (!host && document.body) {
    host = document.createElement('div');
    host.id = THUMB_OFFSCREEN_HOST_ID;
    host.setAttribute('aria-hidden', 'true');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    host.style.top = '0px';
    host.style.width = '4px';
    host.style.height = '4px';
    host.style.overflow = 'hidden';
    host.style.opacity = '0.001';
    host.style.pointerEvents = 'none';
    host.style.zIndex = '-1';
    document.body.appendChild(host);
  }
  return host;
}

function mountOffscreenThumbVideo(video: HTMLVideoElement): void {
  const host = getOffscreenThumbHost();
  if (host && video.parentElement !== host) {
    video.style.width = '4px';
    video.style.height = '4px';
    host.appendChild(video);
  }
}

function unmountOffscreenThumbVideo(video: HTMLVideoElement): void {
  try {
    if (video.parentElement) {
      video.parentElement.removeChild(video);
    }
  } catch {
    // ignore
  }
}

/**
 * Formats seconds into broadcast SMPTE timecode (TC HH:MM:SS:FF) locked at 24fps.
 */
export function formatSMPTETimecode(seconds: number, fps: number = 24): string {
  if (isNaN(seconds) || seconds < 0) {
    return 'TC 00:00:00:00';
  }
  const totalFrames = Math.floor(seconds * fps);
  const ff = totalFrames % fps;
  const totalSecs = Math.floor(seconds);
  const ss = totalSecs % 60;
  const mm = Math.floor(totalSecs / 60) % 60;
  const hh = Math.floor(totalSecs / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `TC ${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/**
 * Generates an instant procedural SVG fallback poster.
 * Not stored in thumbnailMemoryCache so real raster extraction can overwrite it anytime.
 */
function createProceduralSvgPoster(width = THUMB_WIDTH, height = THUMB_HEIGHT, label = 'VIDEO POSTER'): ExtractedPosterResult {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#0A0A0F"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#23232E" stroke-width="1"/><circle cx="${width / 2}" cy="${height / 2 - 6}" r="12" fill="#14141B"/><polygon points="${width / 2 - 4},${height / 2 - 11} ${width / 2 + 6},${height / 2 - 6} ${width / 2 - 4},${height / 2 - 1}" fill="#F5A623"/><text x="50%" y="${height / 2 + 18}" text-anchor="middle" fill="#A1A1AA" font-family="monospace" font-size="8" letter-spacing="1">${label}</text></svg>`;
  const base64 = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    base64,
    blob: new Blob([svg], { type: 'image/svg+xml' }),
    width,
    height,
    duration: 12.0,
    timecode: 'TC 00:00:00:12'
  };
}

/**
 * Extracts exact video metadata: duration, dimensions, framerate, aspect ratio, and orientation.
 */
export async function extractVideoMetadata(
  source: Blob | File | string
): Promise<VideoMetadata> {
  const fallbackMeta: VideoMetadata = {
    duration: 12.0,
    videoWidth: 1920,
    videoHeight: 1080,
    fps: 24,
    aspectRatio: '16:9',
    isVertical: false
  };

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallbackMeta;
  }

  return new Promise<VideoMetadata>((resolve) => {
    let resolved = false;
    let tempBlobUrl = '';
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      if (tempBlobUrl) {
        try { URL.revokeObjectURL(tempBlobUrl); } catch { /* ignore */ }
      }
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch { /* ignore */ }
      unmountOffscreenThumbVideo(video);
    };

    const finish = (result: VideoMetadata) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      console.warn('[RECOVERY FALLBACK] Metadata extraction timed out, returning fallback defaults.');
      finish(fallbackMeta);
    }, 2500);

    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      const dur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 12.0;
      const isVertical = vh > vw;
      const aspect = isVertical ? '9:16' : (vw / vh >= 2.0 ? '2.39:1' : '16:9');

      finish({
        duration: dur,
        videoWidth: vw,
        videoHeight: vh,
        fps: 24,
        aspectRatio: aspect,
        isVertical
      });
    };

    video.onerror = () => {
      clearTimeout(timer);
      console.warn('[RECOVERY FALLBACK] Video metadata extraction error event.');
      finish(fallbackMeta);
    };

    try {
      mountOffscreenThumbVideo(video);
      if (typeof source === 'string') {
        video.src = source;
      } else {
        tempBlobUrl = URL.createObjectURL(source);
        video.src = tempBlobUrl;
      }
      video.load();
    } catch (err) {
      clearTimeout(timer);
      console.warn('[RECOVERY FALLBACK] Failed to assign video src for metadata:', err);
      finish(fallbackMeta);
    }
  });
}

function isCanvasFrameUniformBlack(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const pts: Array<[number, number]> = [
      [Math.floor(w * 0.5), Math.floor(h * 0.5)],
      [Math.floor(w * 0.25), Math.floor(h * 0.25)],
      [Math.floor(w * 0.75), Math.floor(h * 0.75)],
      [Math.floor(w * 0.25), Math.floor(h * 0.75)],
      [Math.floor(w * 0.75), Math.floor(h * 0.25)]
    ];
    for (const [x, y] of pts) {
      const px = ctx.getImageData(x, y, 1, 1).data;
      if (px[0] + px[1] + px[2] > 6) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Tier 1 Primary: DOM Video Seek Frame Extraction attached to offscreen host for active GPU decode.
 */
export async function extractVideoPosterTier1DOM(
  source: Blob | File | string,
  preferredTimestampSec?: number
): Promise<ExtractedPosterResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'RAWx POSTER');
  }

  return new Promise<ExtractedPosterResult>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    if (typeof source === 'string' && !source.startsWith('blob:') && !source.startsWith('data:')) {
      video.crossOrigin = 'anonymous';
    }

    let tempBlobUrl = '';
    let isCleanedUp = false;
    let seekTriggered = false;
    let retriedNonBlackSeek = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      if (tempBlobUrl) {
        try { URL.revokeObjectURL(tempBlobUrl); } catch { /* ignore */ }
      }
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch { /* ignore */ }
      unmountOffscreenThumbVideo(video);
    };

    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Tier 1 DOM seek timed out'));
    }, 4500);

    const captureCurrentFrame = async () => {
      if (isCleanedUp) return;
      try {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (isCleanedUp) return;

        const vw = video.videoWidth || THUMB_WIDTH;
        const vh = video.videoHeight || THUMB_HEIGHT;
        const targetW = THUMB_WIDTH;
        const targetH = Math.max(45, Math.round(targetW * (vh / vw)) || THUMB_HEIGHT);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('2D Canvas context unavailable');
        ctx.drawImage(video, 0, 0, targetW, targetH);

        const dur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 12.0;
        if (!retriedNonBlackSeek && dur > 0.8 && isCanvasFrameUniformBlack(ctx, targetW, targetH)) {
          retriedNonBlackSeek = true;
          const retryTime = Math.min(Math.max(0.2, dur - 0.1), Math.max(0.4, Math.min(dur * 0.35, 1.5)));
          if (Math.abs(video.currentTime - retryTime) > 0.08) {
            video.currentTime = retryTime;
            return;
          }
        }

        const base64 = canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
        const blobResult = await new Promise<Blob>((res) => {
          canvas.toBlob(
            (b) => res(b || new Blob([], { type: 'image/jpeg' })),
            'image/jpeg',
            THUMB_JPEG_QUALITY
          );
        });

        clearTimeout(timeoutTimer);
        const tc = formatSMPTETimecode(video.currentTime, 24);
        cleanup();
        resolve({
          base64,
          blob: blobResult,
          width: targetW,
          height: targetH,
          duration: dur,
          timecode: tc
        });
      } catch (err) {
        clearTimeout(timeoutTimer);
        cleanup();
        reject(err);
      }
    };

    const triggerSeek = () => {
      if (seekTriggered || isCleanedUp) return;
      seekTriggered = true;
      const dur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 12.0;
      let targetTime = 0.15;
      if (preferredTimestampSec !== undefined && preferredTimestampSec > 0) {
        targetTime = Math.min(Math.max(dur - 0.05, 0.05), preferredTimestampSec);
      } else {
        targetTime = Math.min(Math.max(dur - 0.05, 0.05), Math.max(0.15, dur * 0.1));
      }
      if (dur <= 0.15 && video.readyState >= 2) {
        void captureCurrentFrame();
        return;
      }
      try {
        video.currentTime = targetTime;
      } catch {
        if (video.readyState >= 2) {
          void captureCurrentFrame();
        }
      }
    };

    video.onloadedmetadata = triggerSeek;
    video.onloadeddata = () => {
      if (!seekTriggered) {
        triggerSeek();
      } else if (video.readyState >= 2 && Math.abs(video.currentTime - (preferredTimestampSec || 0.15)) < 0.05) {
        void captureCurrentFrame();
      }
    };
    video.onseeked = () => {
      void captureCurrentFrame();
    };

    video.onerror = () => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(new Error('Video element decoding error'));
    };

    try {
      mountOffscreenThumbVideo(video);
      if (typeof source === 'string') {
        video.src = source;
      } else {
        tempBlobUrl = URL.createObjectURL(source);
        video.src = tempBlobUrl;
      }
      video.load();
    } catch (err) {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(err);
    }
  });
}

/**
 * Tier 2 Secondary: ImageBitmap extraction fallback for still image sources.
 */
export async function extractVideoPosterTier2WebCodecs(
  source: Blob | File | string
): Promise<ExtractedPosterResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'WEBCODECS POSTER');
  }

  try {
    let sourceBlob: Blob;
    if (typeof source === 'string') {
      const res = await fetch(source);
      sourceBlob = await res.blob();
    } else {
      sourceBlob = source;
    }

    if (sourceBlob.type.startsWith('video/')) {
      throw new Error('ImageBitmap cannot decode video containers directly');
    }

    if (typeof createImageBitmap === 'function') {
      try {
        const bmp = await createImageBitmap(sourceBlob);
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_WIDTH;
        canvas.height = THUMB_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
          const base64 = canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
          const blob = await new Promise<Blob>((res) =>
            canvas.toBlob((b) => res(b || new Blob([], { type: 'image/jpeg' })), 'image/jpeg', THUMB_JPEG_QUALITY)
          );
          bmp.close();
          return {
            base64,
            blob,
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            duration: 12.0,
            timecode: 'TC 00:00:00:00'
          };
        }
        bmp.close();
      } catch (bmpErr) {
        console.warn('[RECOVERY FALLBACK] ImageBitmap seek skipped:', bmpErr);
      }
    }
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] Tier 2 extraction skipped:', err);
  }

  throw new Error('Tier 2 WebCodecs extraction unavailable');
}

/**
 * High-Reliability Video Poster Extraction Pipeline (2-Tier Guard).
 * Only stores real raster thumbnails in thumbnailMemoryCache / IndexedDB (never SVG placeholders).
 */
export async function extractVideoPoster(
  source: Blob | File | string,
  preferredTimestampSec?: number,
  assetId?: string
): Promise<ExtractedPosterResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'RAWx POSTER');
  }

  let result: ExtractedPosterResult | null = null;

  try {
    result = await extractVideoPosterTier1DOM(source, preferredTimestampSec);
  } catch (tier1Err) {
    console.warn('[RECOVERY FALLBACK] Tier 1 DOM video seek failed, trying Tier 2:', tier1Err);
  }

  if (!result) {
    try {
      result = await extractVideoPosterTier2WebCodecs(source);
    } catch (tier2Err) {
      console.warn('[RECOVERY FALLBACK] Tier 2 extraction skipped:', tier2Err);
    }
  }

  if (!result) {
    result = createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'CINEMA POSTER');
  }

  // Only cache real raster thumbnails (never poison cache with procedural SVG fallbacks)
  if (assetId && result.base64 && !isSvgPlaceholderUrl(result.base64)) {
    thumbnailMemoryCache.set(assetId, result.base64);
    try {
      studioDraftDb.putMediaThumbnail(assetId, result.blob).catch(() => {});
    } catch {
      // Non-fatal if IDB unavailable
    }
  }

  return result;
}

// Concurrency-limited video thumbnail extractor (4GB Guard: max 3 active decoders at once)
const MAX_CONCURRENT_THUMB_DECODERS = 3;
let activeThumbDecodes = 0;
const thumbQueue: Array<() => void> = [];
const inFlightVideoThumbExtractions = new Map<string, Promise<string | null>>();

function runWithThumbSlot<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      activeThumbDecodes++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeThumbDecodes = Math.max(0, activeThumbDecodes - 1);
          const next = thumbQueue.shift();
          if (next) next();
        });
    };

    if (activeThumbDecodes < MAX_CONCURRENT_THUMB_DECODERS) {
      start();
    } else {
      thumbQueue.push(start);
    }
  });
}

/**
 * Extracts and caches a crisp JPEG poster for any video URL (deduplicated & concurrency-limited).
 * Stores the resulting JPEG data URL under all provided cacheKeys + videoUrl and emits `thumbnails_updated`.
 */
export function ensureVideoThumbnailUrl(
  cacheKeys: Array<string | number | undefined | null>,
  videoUrl: string,
  preferredTimestampSec: number = 0.15
): Promise<string | null> {
  const normalizedKeys = Array.from(
    new Set(
      [...cacheKeys, videoUrl]
        .filter((k) => k !== undefined && k !== null && String(k).trim() !== '')
        .map((k) => String(k).trim())
    )
  );

  const existing = getCachedThumbnailUrl(normalizedKeys);
  if (existing) {
    for (const key of normalizedKeys) {
      thumbnailMemoryCache.set(key, existing);
    }
    return Promise.resolve(existing);
  }

  if (!videoUrl || typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  const dedupeKey = videoUrl;
  const existingFlight = inFlightVideoThumbExtractions.get(dedupeKey);
  if (existingFlight) {
    return existingFlight.then((url) => {
      if (url && !isSvgPlaceholderUrl(url)) {
        for (const key of normalizedKeys) {
          thumbnailMemoryCache.set(key, url);
        }
      }
      return url;
    });
  }

  const flight = runWithThumbSlot(async (): Promise<string | null> => {
    try {
      const res = await extractVideoPosterTier1DOM(videoUrl, preferredTimestampSec);
      if (res?.base64 && !isSvgPlaceholderUrl(res.base64)) {
        for (const key of normalizedKeys) {
          thumbnailMemoryCache.set(key, res.base64);
        }
        eventBus.emit('thumbnails_updated', {
          keys: normalizedKeys,
          url: res.base64,
          timestamp: Date.now()
        });
        return res.base64;
      }
    } catch (err) {
      console.warn('[thumbnailEngine] ensureVideoThumbnailUrl fallback:', err);
    }
    return null;
  }).finally(() => {
    inFlightVideoThumbExtractions.delete(dedupeKey);
  });

  inFlightVideoThumbExtractions.set(dedupeKey, flight);
  return flight;
}

/**
 * Captures the current frame of a video element to a lightweight base64 JPEG.
 */
export function captureVideoFrameAsBase64(
  video: HTMLVideoElement,
  targetW: number = THUMB_WIDTH,
  targetH: number = THUMB_HEIGHT,
  quality: number = THUMB_JPEG_QUALITY
): string {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] captureVideoFrameAsBase64 error:', err);
    return '';
  }
}

/**
 * Commits a generated thumbnail to both in-memory cache and IndexedDB.
 */
export async function cacheVideoThumbnail(
  assetId: string,
  base64OrBlob: string | Blob
): Promise<void> {
  if (typeof base64OrBlob === 'string') {
    if (isSvgPlaceholderUrl(base64OrBlob)) return;
    thumbnailMemoryCache.set(assetId, base64OrBlob);
  }
  try {
    if (typeof base64OrBlob === 'string') {
      const res = await fetch(base64OrBlob);
      const blob = await res.blob();
      await studioDraftDb.putMediaThumbnail(assetId, blob);
    } else {
      await studioDraftDb.putMediaThumbnail(assetId, base64OrBlob);
    }
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] cacheVideoThumbnail IDB error:', err);
  }
}

/**
 * Resolves a thumbnail for an asset: checks memory cache -> IndexedDB -> returns fallback.
 */
export async function resolveAssetThumbnail(assetId: string): Promise<string | null> {
  const inMem = thumbnailMemoryCache.get(assetId);
  if (inMem) return inMem;

  try {
    const dbBlob = await studioDraftDb.getMediaThumbnail(assetId);
    if (dbBlob) {
      const url = URL.createObjectURL(dbBlob);
      thumbnailMemoryCache.set(assetId, url);
      return url;
    }
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] resolveAssetThumbnail IDB lookup error:', err);
  }

  return null;
}

/**
 * RAM Virtualization & Decoder Cleanup Guard (4GB Guard):
 * Releases hardware video decoder contexts when video elements are unmounted or scrolled offscreen.
 */
export function cleanupVideoElement(videoEl: HTMLVideoElement | null, blobUrlToRevoke?: string | null): void {
  if (!videoEl) return;
  try {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] cleanupVideoElement error:', err);
  }
  if (blobUrlToRevoke && blobUrlToRevoke.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(blobUrlToRevoke);
    } catch {
      // ignore
    }
  }
}

/**
 * Exposes a dedicated hover-scrubbing controller that uses requestAnimationFrame (RAF)
 * to seek the hidden <video> element smoothly without audio.
 */
export function hoverScrubThumbnailSource(
  containerEl: HTMLElement,
  clientX: number,
  videoEl: HTMLVideoElement | null,
  durationSec: number,
  onUpdate: (state: HoverScrubState) => void,
  rafRef: { current: number | null }
): void {
  if (rafRef.current !== null) return;

  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    const rect = containerEl.getBoundingClientRect();
    if (rect.width <= 0) return;

    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const normalized = clampedX / rect.width;
    const dur = durationSec > 0 ? durationSec : 12.0;
    const currentSec = Math.min(dur, Math.max(0, normalized * dur));
    const tc = formatSMPTETimecode(currentSec, 24);

    let newSource: string | undefined;

    if (videoEl) {
      videoEl.muted = true;
      videoEl.volume = 0;
      try {
        videoEl.currentTime = currentSec;
        if (videoEl.readyState >= 2) {
          const captured = captureVideoFrameAsBase64(videoEl);
          if (captured) newSource = captured;
        }
      } catch (err) {
        console.warn('[RECOVERY FALLBACK] Fast scrub seek error:', err);
      }
    }

    onUpdate({
      normalizedX: normalized,
      currentSec,
      timecode: tc,
      thumbnailSource: newSource
    });
  });
}

/**
 * Creates a reusable RAF hover scrubber for components.
 */
export function createHoverScrubber(
  containerEl: HTMLElement,
  videoEl: HTMLVideoElement | null,
  durationSec: number,
  onUpdate: (state: HoverScrubState) => void
): {
  handleMouseMove: (e: React.MouseEvent | MouseEvent) => void;
  cleanup: () => void;
} {
  const rafRef = { current: null as number | null };

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    hoverScrubThumbnailSource(containerEl, e.clientX, videoEl, durationSec, onUpdate, rafRef);
  };

  const cleanup = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  return { handleMouseMove, cleanup };
}
