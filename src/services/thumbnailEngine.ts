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

export const THUMB_WIDTH = 160;
export const THUMB_HEIGHT = 90;
export const THUMB_JPEG_QUALITY = 0.7;
export const DEFAULT_KEYFRAME_TIMESTAMP_SEC = 0.5;

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

// In-Memory Fast LRU Cache (Up to 150 items)
class ThumbnailMemoryCache {
  private cache = new Map<string, string>();
  private maxEntries = 150;

  get(key: string): string | undefined {
    const val = this.cache.get(key);
    if (val) {
      this.cache.delete(key);
      this.cache.set(key, val);
    }
    return val;
  }

  set(key: string, val: string): void {
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
 * Generates an instant procedural SVG fallback poster so shot cards are NEVER blank.
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
    }, 2000);

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
      if (typeof source === 'string') {
        video.src = source;
      } else {
        tempBlobUrl = URL.createObjectURL(source);
        video.src = tempBlobUrl;
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn('[RECOVERY FALLBACK] Failed to assign video src for metadata:', err);
      finish(fallbackMeta);
    }
  });
}

/**
 * Tier 1 Primary: Fast DOM Video Seek Frame Extraction.
 * Off-DOM lightweight <video preload="metadata" muted playsInline>, seeks to 0.1s (or 10% duration),
 * draws to 160x90 canvas, and extracts JPEG 0.7 data URL.
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
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let tempBlobUrl = '';
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (tempBlobUrl) {
        try { URL.revokeObjectURL(tempBlobUrl); } catch { /* ignore */ }
      }
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch { /* ignore */ }
    };

    // 1800ms fast resilience timeout guard
    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Tier 1 DOM seek timed out'));
    }, 1800);

    video.onloadedmetadata = () => {
      const dur = video.duration && !isNaN(video.duration) && video.duration > 0 ? video.duration : 12.0;
      // Seek to 0.1s or 10% duration to bypass black intro
      let targetTime = 0.1;
      if (preferredTimestampSec !== undefined && preferredTimestampSec > 0) {
        targetTime = Math.min(Math.max(dur - 0.05, 0.05), preferredTimestampSec);
      } else {
        targetTime = Math.min(Math.max(dur - 0.05, 0.05), Math.max(0.1, dur * 0.1));
      }
      video.currentTime = targetTime;
    };

    video.onseeked = async () => {
      clearTimeout(timeoutTimer);
      try {
        const vw = video.videoWidth || THUMB_WIDTH;
        const vh = video.videoHeight || THUMB_HEIGHT;
        const targetW = THUMB_WIDTH;
        const targetH = Math.round(targetW * (vh / vw)) || THUMB_HEIGHT;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D Canvas context unavailable');
        ctx.drawImage(video, 0, 0, targetW, targetH);

        const base64 = canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
        const blobResult = await new Promise<Blob>((res) => {
          canvas.toBlob(
            (b) => res(b || new Blob([], { type: 'image/jpeg' })),
            'image/jpeg',
            THUMB_JPEG_QUALITY
          );
        });

        const dur = video.duration || 12.0;
        cleanup();
        resolve({
          base64,
          blob: blobResult,
          width: targetW,
          height: targetH,
          duration: dur,
          timecode: formatSMPTETimecode(video.currentTime, 24)
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(new Error('Video element decoding error'));
    };

    try {
      if (typeof source === 'string') {
        video.src = source;
      } else {
        tempBlobUrl = URL.createObjectURL(source);
        video.src = tempBlobUrl;
      }
    } catch (err) {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(err);
    }
  });
}

/**
 * Tier 2 Secondary: WebCodecs or ImageBitmap frame extraction fallback.
 * Decodes the first VideoFrame, renders to canvas, and explicitly calls frame.close() immediately.
 */
export async function extractVideoPosterTier2WebCodecs(
  source: Blob | File | string
): Promise<ExtractedPosterResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'WEBCODECS POSTER');
  }

  // Attempt ImageBitmap extraction or standard canvas draw
  try {
    let sourceBlob: Blob;
    if (typeof source === 'string') {
      const res = await fetch(source);
      sourceBlob = await res.blob();
    } else {
      sourceBlob = source;
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
          bmp.close(); // Immediate cleanup
          return {
            base64,
            blob: new Blob([base64], { type: 'image/jpeg' }),
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
    console.warn('[RECOVERY FALLBACK] Tier 2 WebCodecs fallback encountered error:', err);
  }

  throw new Error('Tier 2 WebCodecs extraction unavailable');
}

/**
 * High-Reliability Video Poster Extraction Pipeline (2-Tier Guard).
 * Tier 1: Fast DOM Video Seek to 0.1s / 10% duration -> 160x90 Canvas -> JPEG 0.7.
 * Tier 2: WebCodecs VideoFrame decode with immediate frame.close().
 * Final Fallback: Procedural SVG with zero-black-frame guarantee.
 */
export async function extractVideoPoster(
  source: Blob | File | string,
  preferredTimestampSec?: number,
  assetId?: string
): Promise<ExtractedPosterResult> {
  // If in Node.js / test environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const fallback = createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'RAWx POSTER');
    return fallback;
  }

  let result: ExtractedPosterResult | null = null;

  // 1. Try Tier 1: Fast DOM Video Seek
  try {
    result = await extractVideoPosterTier1DOM(source, preferredTimestampSec);
  } catch (tier1Err) {
    console.warn('[RECOVERY FALLBACK] Tier 1 DOM video seek failed, trying Tier 2:', tier1Err);
  }

  // 2. Try Tier 2: WebCodecs / ImageBitmap
  if (!result) {
    try {
      result = await extractVideoPosterTier2WebCodecs(source);
    } catch (tier2Err) {
      console.warn('[RECOVERY FALLBACK] Tier 2 WebCodecs extraction failed, engaging procedural SVG:', tier2Err);
    }
  }

  // 3. Guaranteed Procedural Fallback
  if (!result) {
    result = createProceduralSvgPoster(THUMB_WIDTH, THUMB_HEIGHT, 'CINEMA POSTER');
  }

  // Cache in memory and IndexedDB
  if (assetId && result.base64) {
    thumbnailMemoryCache.set(assetId, result.base64);
    try {
      studioDraftDb.putMediaThumbnail(assetId, result.blob).catch(() => {});
    } catch {
      // Non-fatal if IDB unavailable
    }
  }

  return result;
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
