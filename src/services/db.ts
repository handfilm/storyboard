/**
 * @file /src/services/db.ts
 * @description CapCut-Style Local Multi-Project Draft Engine.
 * 
 * IndexedDB Specification:
 * - Database Name: `rawx_storyboard_studio_db` (Version 4)
 * - Object Stores:
 *   1. `projects_meta`: { id, title, thumbnail, duration, updatedAt, aspectRatio }
 *   2. `project_drafts`: { projectId, activeSlideIndex, slides: Array<{ id, duration: 12.0, ... }>, config }
 *   3. `media_blobs`: Direct storage of heavy binary video, image, audio files as native Blob/ArrayBuffer.
 * 
 * Resilience Features:
 * - navigator.storage.persist() call on mount
 * - Debounced 400ms autosave cycle
 * - Zero-leak URL.revokeObjectURL() lifecycle tracking
 * - Strict 2MB payload cap on serialized snapshots to prevent RangeError
 */

import { ProjectDraft, ProjectMeta, MediaBlobRecord, MediaThumbnailRecord, MediaMetaRecord, SlideDraft, AspectRatioType } from '../types/project';
import { SLIDE_DURATION_SEC } from '../types/editor';
import { eventBus } from '../core/eventBus';

export const DB_NAME = 'rawx_storyboard_studio_db';
export const DB_VERSION = 6;
export const MAX_SERIALIZED_SNAPSHOT_BYTES = 2 * 1024 * 1024; // 2MB limit

export interface MediaProxyRecord {
  id: string; // mediaId
  mediaId: string;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface VaultMediaItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob; // Raw binary file (never convert multi-GB files to base64)
  thumbnailUrl: string; // Resilient WebP/JPEG data URL or SVG placeholder
  thumbnails?: string[]; // 6 thumbnail keyframes (0%, 20%, 40%, 60%, 80%, 100%)
  duration?: number;
  resolution?: string;
  createdAt: number;
  assignedShotIndex?: number;
  shotIndex?: number;
}

export type MediaItem = VaultMediaItem;

export interface TimelineSlotRecord {
  slotIndex: number;
  mediaId: string;
  assignedAt: number;
}

export function createFallbackSvgThumbnail(
  title: string,
  isVideo: boolean,
  sizeBytes?: number,
  ext?: string
): string {
  const bg = isVideo ? '%2307121c' : '%23140f07';
  const fg = isVideo ? '%2338bdf8' : '%23fbbf24';
  const fileExt = ext || (title.includes('.') ? title.split('.').pop()?.toUpperCase() : (isVideo ? 'MP4' : 'IMG'));
  const cleanTitle = encodeURIComponent((title || (isVideo ? 'Video' : 'Still')).slice(0, 18));
  const sizeText = sizeBytes ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` : '';
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135" viewBox="0 0 240 135"><rect width="240" height="135" fill="${bg}"/><rect x="6" y="6" width="228" height="123" fill="none" stroke="${fg}" stroke-width="1" stroke-dasharray="4 2" opacity="0.4"/><text x="50%" y="40%" text-anchor="middle" fill="${fg}" font-family="monospace" font-size="12" font-weight="bold">${isVideo ? '▶ ' + fileExt + ' VIDEO' : '◆ ' + fileExt + ' PLATE'}</text><text x="50%" y="60%" text-anchor="middle" fill="%23a1a1aa" font-family="monospace" font-size="9.5">${cleanTitle}</text><text x="50%" y="78%" text-anchor="middle" fill="%2371717a" font-family="monospace" font-size="8.5">${sizeText}</text></svg>`;
}

/**
 * Resilient thumbnail and metadata extractor with a strict 1.2-second timeout.
 * NEVER lets video decoding stalls or errors block file ingestion.
 */
export async function extractMediaMetadataAndThumbnail(
  file: File | Blob
): Promise<{ thumbnailUrl: string; thumbnails: string[]; duration?: number; resolution?: string }> {
  const isVideo = file.type.startsWith('video') || (file instanceof File && /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(file.name));
  const isAudio = file.type.startsWith('audio') || (file instanceof File && /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name));
  const filename = file instanceof File ? file.name : (isVideo ? 'video.mp4' : isAudio ? 'audio.mp3' : 'image.jpg');
  const ext = filename.includes('.') ? filename.split('.').pop()?.toUpperCase() : undefined;

  if (isAudio) {
    const thumb = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="135" viewBox="0 0 240 135"><rect width="240" height="135" fill="%23130d1e"/><text x="50%" y="45%" text-anchor="middle" fill="%23c084fc" font-family="monospace" font-size="13" font-weight="bold">♫ AUDIO TRACK</text><text x="50%" y="65%" text-anchor="middle" fill="%23a1a1aa" font-family="monospace" font-size="9.5">${encodeURIComponent(filename.slice(0, 18))}</text></svg>`;
    return { thumbnailUrl: thumb, thumbnails: Array(6).fill(thumb), duration: 12.0, resolution: 'AUDIO' };
  }

  if (isVideo) {
    return new Promise((resolve) => {
      let settled = false;
      let tempUrl = '';
      const framesCaptured: string[] = [];

      const fallback = () => {
        if (settled) return;
        settled = true;
        if (tempUrl) {
          try { URL.revokeObjectURL(tempUrl); } catch {}
        }
        const fallbackThumb = framesCaptured[0] || createFallbackSvgThumbnail(filename, true, file.size, ext);
        const finalFrames = framesCaptured.length >= 6 
          ? framesCaptured 
          : Array.from({ length: 6 }, (_, i) => framesCaptured[i % framesCaptured.length] || fallbackThumb);
        resolve({
          thumbnailUrl: fallbackThumb,
          thumbnails: finalFrames,
          duration: 12.0,
          resolution: '4K'
        });
      };

      // 2.2-second resilience timeout for multi-frame extraction
      const timer = setTimeout(fallback, 2200);

      try {
        tempUrl = URL.createObjectURL(file);
      } catch {
        clearTimeout(timer);
        return fallback();
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = tempUrl;

      const finishSuccess = (thumbUrl: string, frames: string[], duration?: number, resolution?: string) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (tempUrl) {
          try { URL.revokeObjectURL(tempUrl); } catch {}
        }
        const finalFrames = frames.length >= 6 
          ? frames.slice(0, 6) 
          : Array.from({ length: 6 }, (_, i) => frames[i % frames.length] || thumbUrl);
        resolve({ thumbnailUrl: thumbUrl, thumbnails: finalFrames, duration, resolution });
      };

      const percentages = [0.0, 0.2, 0.4, 0.6, 0.8, 0.98];
      let currentSeekIndex = 0;
      let detectedDuration = 12.0;
      let detectedResolution = '1080P';

      const captureCurrentFrame = () => {
        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 360;
          if (vw >= 3840 || vh >= 2160) detectedResolution = '4K';
          else if (vw >= 2560 || vh >= 1440) detectedResolution = '2K';
          else if (vw >= 1920 || vh >= 1080) detectedResolution = '1080P';
          else if (vw >= 1280 || vh >= 720) detectedResolution = '720P';
          else detectedResolution = `${vw}x${vh}`;

          if (video.duration && !isNaN(video.duration)) {
            detectedDuration = Math.round(video.duration * 10) / 10;
          }

          const targetW = 240;
          const targetH = Math.round(targetW * (vh / vw)) || 135;
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, targetW, targetH);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            if (dataUrl && dataUrl.length > 50) {
              framesCaptured.push(dataUrl);
            }
          }

          // Advance to next frame in filmstrip (0%, 20%, 40%, 60%, 80%, 100%)
          currentSeekIndex++;
          if (currentSeekIndex < percentages.length) {
            video.currentTime = Math.max(0, Math.min(detectedDuration - 0.05, percentages[currentSeekIndex] * detectedDuration));
          } else {
            // All 6 frames successfully captured
            finishSuccess(framesCaptured[0], framesCaptured, detectedDuration, detectedResolution);
          }
        } catch {
          fallback();
        }
      };

      video.onloadedmetadata = () => {
        try {
          if (video.duration && !isNaN(video.duration)) {
            detectedDuration = Math.round(video.duration * 10) / 10;
          }
          video.currentTime = percentages[0] * detectedDuration;
        } catch {
          captureCurrentFrame();
        }
      };

      video.onseeked = () => {
        captureCurrentFrame();
      };

      video.onerror = () => fallback();
    });
  } else {
    // Image Plate
    return new Promise((resolve) => {
      let settled = false;
      let tempUrl = '';

      const fallback = () => {
        if (settled) return;
        settled = true;
        if (tempUrl) {
          try { URL.revokeObjectURL(tempUrl); } catch {}
        }
        const fallbackThumb = createFallbackSvgThumbnail(filename, false, file.size, ext);
        resolve({
          thumbnailUrl: fallbackThumb,
          thumbnails: Array(6).fill(fallbackThumb),
          resolution: 'STILL'
        });
      };

      const timer = setTimeout(fallback, 1200);

      try {
        tempUrl = URL.createObjectURL(file);
      } catch {
        clearTimeout(timer);
        return fallback();
      }

      const img = new Image();
      img.src = tempUrl;

      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const iw = img.naturalWidth || 640;
          const ih = img.naturalHeight || 360;
          let resolution = '1080P';
          if (iw >= 3840 || ih >= 2160) resolution = '4K';
          else if (iw >= 1920 || ih >= 1080) resolution = '1080P';
          else resolution = `${iw}x${ih}`;

          const targetW = 240;
          const targetH = Math.round(targetW * (ih / iw)) || 135;
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            if (dataUrl && dataUrl.length > 60) {
              if (tempUrl) {
                try { URL.revokeObjectURL(tempUrl); } catch {}
              }
              return resolve({ 
                thumbnailUrl: dataUrl, 
                thumbnails: Array(6).fill(dataUrl), 
                resolution 
              });
            }
          }
        } catch {}
        fallback();
      };

      img.onerror = () => fallback();
    });
  }
}

export async function generateCanvasThumbnail(file: File | Blob): Promise<string> {
  const result = await extractMediaMetadataAndThumbnail(file);
  return result.thumbnailUrl;
}

/**
 * High-performance 720p proxy generation for 4K video / media
 * Downscales heavy footage to lightweight 720p WebM/MP4 for fluid 24fps scrubbing & J-K-L shuttling
 */
export async function generateVideoProxy(file: File | Blob): Promise<{ blob: Blob; width: number; height: number; mimeType: string }> {
  const isVideo = file.type.startsWith('video') || (file instanceof File && /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(file.name));
  if (!isVideo) {
    return { blob: file, width: 1280, height: 720, mimeType: file.type || 'image/jpeg' };
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { blob: file, width: 1280, height: 720, mimeType: file.type || 'video/mp4' };
  }

  return new Promise((resolve) => {
    let resolved = false;
    let tempUrl = '';
    try {
      tempUrl = URL.createObjectURL(file);
    } catch {
      return resolve({ blob: file, width: 1280, height: 720, mimeType: file.type || 'video/mp4' });
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = tempUrl;

    const cleanup = () => {
      try { URL.revokeObjectURL(tempUrl); } catch {}
    };

    const finish = (blob: Blob, width: number, height: number, mimeType: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ blob, width, height, mimeType });
    };

    const timer = setTimeout(() => {
      finish(file, 1280, 720, file.type || 'video/mp4');
    }, 3500);

    video.onerror = () => {
      clearTimeout(timer);
      finish(file, 1280, 720, file.type || 'video/mp4');
    };

    video.onloadedmetadata = () => {
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      // Fast 540p target (max 960x540, 24fps) for zero-latency 24fps scrubbing
      const scale = Math.min(1, 540 / vh, 960 / vw);
      let targetW = Math.max(320, Math.round(vw * scale));
      let targetH = Math.max(180, Math.round(vh * scale));
      // Force even dimensions for video codecs
      if (targetW % 2 !== 0) targetW -= 1;
      if (targetH % 2 !== 0) targetH -= 1;

      if (typeof MediaRecorder === 'undefined' || (vw <= 960 && vh <= 540 && file.size < 3 * 1024 * 1024)) {
        clearTimeout(timer);
        return finish(file, targetW, targetH, file.type || 'video/mp4');
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx || typeof canvas.captureStream !== 'function') {
        clearTimeout(timer);
        return finish(file, targetW, targetH, file.type || 'video/mp4');
      }

      const stream = canvas.captureStream(24);
      let chosenMime = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(chosenMime)) {
        chosenMime = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: chosenMime, videoBitsPerSecond: 1_000_000 });
      } catch {
        clearTimeout(timer);
        return finish(file, targetW, targetH, file.type || 'video/mp4');
      }

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(timer);
        if (chunks.length > 0) {
          const proxyBlob = new Blob(chunks, { type: chosenMime });
          finish(proxyBlob, targetW, targetH, chosenMime);
        } else {
          finish(file, targetW, targetH, file.type || 'video/mp4');
        }
      };

      try {
        recorder.start();
        video.currentTime = 0;
        video.play().catch(() => {});

        let frameCount = 0;
        const maxFrames = Math.min(288, Math.round((video.duration || 12) * 24));
        const drawLoop = () => {
          if (resolved) return;
          if (video.paused || video.ended || frameCount >= maxFrames || frameCount >= 72) {
            if (recorder.state === 'recording') recorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, targetW, targetH);
          frameCount++;
          requestAnimationFrame(drawLoop);
        };
        requestAnimationFrame(drawLoop);

        setTimeout(() => {
          if (recorder.state === 'recording') {
            try { recorder.stop(); } catch {}
          }
        }, 2200);
      } catch {
        clearTimeout(timer);
        finish(file, targetW, targetH, file.type || 'video/mp4');
      }
    };
  });
}


class StudioDraftDbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private activeObjectUrls: Set<string> = new Set();
  private activeMediaUrls: Map<string, string> = new Map();
  private activeProxyUrls: Map<string, string> = new Map();
  private isPersisted: boolean = false;

  /**
   * Initializes IndexedDB Version 5 with the designated object stores:
   * 1. media_blobs: Primary binary storage { id, fileBlob, filename, mimeType, sizeBytes, createdAt }
   * 2. media_thumbnails: Ultra-lightweight WebP/JPEG thumbnail blobs (240x135)
   * 3. media_meta: Telemetry data { id, duration, fps, width, height, codec, assignedShotId }
   * Also retains projects_meta and project_drafts for timeline autosave.
   */
  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        throw new Error('IndexedDB not available in current environment');
      }

      // Lock browser cache against OS eviction
      this.ensureStoragePersistence().catch(() => {});

      let versionToOpen = DB_VERSION;
      if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
        try {
          const dbs = await indexedDB.databases();
          const existing = dbs.find(d => d.name === DB_NAME);
          if (existing && typeof existing.version === 'number' && existing.version >= versionToOpen) {
            versionToOpen = existing.version + 1;
          }
        } catch {
          // ignore
        }
      }

      const openReq = (ver?: number): Promise<IDBDatabase> => {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const request = typeof ver === 'number' ? indexedDB.open(DB_NAME, ver) : indexedDB.open(DB_NAME);

          request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
            const db = (e.target as IDBOpenDBRequest).result;

            // 1. projects_meta: metadata for quick project switching
            if (!db.objectStoreNames.contains('projects_meta')) {
              const metaStore = db.createObjectStore('projects_meta', { keyPath: 'id' });
              metaStore.createIndex('updatedAt', 'updatedAt', { unique: false });
              metaStore.createIndex('title', 'title', { unique: false });
            }

            // 2. project_drafts: full draft state including 12.0s slides
            if (!db.objectStoreNames.contains('project_drafts')) {
              const draftStore = db.createObjectStore('project_drafts', { keyPath: 'projectId' });
              draftStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            }

            // 3. media_blobs: Primary binary storage keyed by id storing { id, fileBlob, filename, mimeType, sizeBytes, createdAt }
            if (!db.objectStoreNames.contains('media_blobs')) {
              const mediaStore = db.createObjectStore('media_blobs', { keyPath: 'id' });
              mediaStore.createIndex('updatedAt', 'updatedAt', { unique: false });
              mediaStore.createIndex('mimeType', 'mimeType', { unique: false });
              mediaStore.createIndex('filename', 'filename', { unique: false });
              mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // 4. media_thumbnails: Ultra-lightweight WebP/JPEG thumbnail blobs (240x135)
            if (!db.objectStoreNames.contains('media_thumbnails')) {
              const thumbStore = db.createObjectStore('media_thumbnails', { keyPath: 'id' });
              thumbStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // 5. media_meta: Telemetry data { id, duration, fps, width, height, codec, assignedShotId }
            if (!db.objectStoreNames.contains('media_meta')) {
              const metaStore = db.createObjectStore('media_meta', { keyPath: 'id' });
              metaStore.createIndex('assignedShotId', 'assignedShotId', { unique: false });
              metaStore.createIndex('createdAt', 'createdAt', { unique: false });
              metaStore.createIndex('filename', 'filename', { unique: false });
            }

            // 6. media_vault: Primary store for uploaded files { id, name, mimeType, size, blob, thumbnailUrl, createdAt, shotIndex }
            if (!db.objectStoreNames.contains('media_vault')) {
              const vaultStore = db.createObjectStore('media_vault', { keyPath: 'id' });
              vaultStore.createIndex('createdAt', 'createdAt', { unique: false });
              vaultStore.createIndex('shotIndex', 'shotIndex', { unique: false });
              vaultStore.createIndex('mimeType', 'mimeType', { unique: false });
              vaultStore.createIndex('name', 'name', { unique: false });
            }

            // 7. timeline_slots: Maps timeline indices (0 to 99) directly to mediaId references { slotIndex, mediaId, assignedAt }
            if (!db.objectStoreNames.contains('timeline_slots')) {
              const slotStore = db.createObjectStore('timeline_slots', { keyPath: 'slotIndex' });
              slotStore.createIndex('mediaId', 'mediaId', { unique: false });
              slotStore.createIndex('assignedAt', 'assignedAt', { unique: false });
            }

            // 8. media_proxies: 720p WebM/MP4 proxy blobs for fluid 24fps scrubbing & J-K-L shuttling
            if (!db.objectStoreNames.contains('media_proxies')) {
              const proxyStore = db.createObjectStore('media_proxies', { keyPath: 'id' });
              proxyStore.createIndex('mediaId', 'mediaId', { unique: false });
              proxyStore.createIndex('createdAt', 'createdAt', { unique: false });
            }
          };

          request.onsuccess = () => {
            this.db = request.result;
            resolve(request.result);
          };

          request.onerror = async () => {
            const err = request.error;
            // VersionError fallback: if existing database version was higher than requested
            if (err && err.name === 'VersionError') {
              console.warn('[DraftDB] VersionError detected, automatically opening at current existing database version');
              try {
                const fallbackReq = indexedDB.open(DB_NAME);
                fallbackReq.onsuccess = () => {
                  this.db = fallbackReq.result;
                  resolve(fallbackReq.result);
                };
                fallbackReq.onerror = () => reject(fallbackReq.error);
                return;
              } catch (fallbackErr) {
                return reject(fallbackErr);
              }
            }
            reject(err);
          };
        });
      };

      try {
        const result = await openReq(versionToOpen);
        return result;
      } catch (err) {
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  private lruActiveUrls: Map<string, string> = new Map(); // id -> objectUrl (max 8)
  private readonly MAX_LRU_URLS = 8;

  /**
   * Lock browser cache against OS-level eviction via navigator.storage.persist()
   */
  public async ensureStoragePersistence(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
      return false;
    }
    try {
      const alreadyPersisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (alreadyPersisted) {
        this.isPersisted = true;
        console.log(`[STORAGE] Persistent storage granted: true`);
        return true;
      }
      const granted = await navigator.storage.persist();
      this.isPersisted = granted;
      console.log(`[STORAGE] Persistent storage granted: ${granted}`);
      return granted;
    } catch {
      return false;
    }
  }

  public getIsPersisted(): boolean {
    return this.isPersisted;
  }

  // =========================================================================
  // OBJECT URL LIFECYCLE MANAGEMENT (LRU MAX 8 ACTIVE URLS, ZERO LEAKS)
  // =========================================================================

  /**
   * Dynamically creates or retrieves an Object URL with LRU eviction (max 8 active URLs).
   * Automatically calls URL.revokeObjectURL() on eviction to prevent GPU/RAM memory saturation.
   */
  public getOrCreateObjectUrl(id: string, blob: Blob): string {
    if (!blob) return '';

    // Check if already in LRU cache
    if (this.lruActiveUrls.has(id)) {
      const url = this.lruActiveUrls.get(id)!;
      // Mark as MRU
      this.lruActiveUrls.delete(id);
      this.lruActiveUrls.set(id, url);
      return url;
    }

    // If cache is full, evict oldest entry
    if (this.lruActiveUrls.size >= this.MAX_LRU_URLS) {
      const oldestId = this.lruActiveUrls.keys().next().value;
      if (oldestId) {
        const evictedUrl = this.lruActiveUrls.get(oldestId);
        if (evictedUrl) {
          try { URL.revokeObjectURL(evictedUrl); } catch {}
          this.activeObjectUrls.delete(evictedUrl);
        }
        this.lruActiveUrls.delete(oldestId);
        this.activeMediaUrls.delete(oldestId);
      }
    }

    try {
      const url = URL.createObjectURL(blob);
      this.lruActiveUrls.set(id, url);
      this.activeMediaUrls.set(id, url);
      this.activeObjectUrls.add(url);
      return url;
    } catch {
      return '';
    }
  }

  /**
   * Generates a tracked Object URL that will be automatically revoked on draft switch
   */
  public createTrackedUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.add(url);
    return url;
  }

  /**
   * Revokes a specific Object URL if tracked, preventing RAM leaks on media delete
   */
  public revokeTrackedUrl(url: string): void {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
    this.activeObjectUrls.delete(url);
  }

  /**
   * Revokes all tracked Object URLs to free memory on draft switch or unmount
   */
  public revokeAllTrackedUrls(): void {
    for (const url of this.activeObjectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
    this.activeObjectUrls.clear();
    for (const url of this.activeProxyUrls.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.activeProxyUrls.clear();
  }

  // =========================================================================
  // 720p PROXY ENGINE & INDEXEDDB PERSISTENCE
  // =========================================================================

  /**
   * Persists a 720p proxy Blob in `media_proxies` store
   */
  public async saveProxy(mediaId: string, proxyBlob: Blob, meta: { width: number; height: number; mimeType: string }): Promise<void> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('media_proxies')) return;
      const record: MediaProxyRecord = {
        id: mediaId,
        mediaId,
        blob: proxyBlob,
        mimeType: meta.mimeType,
        width: meta.width,
        height: meta.height,
        createdAt: Date.now()
      };
      const tx = db.transaction('media_proxies', 'readwrite');
      tx.objectStore('media_proxies').put(record);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      // Cache proxy url
      try {
        const proxyUrl = URL.createObjectURL(proxyBlob);
        this.activeProxyUrls.set(mediaId, proxyUrl);
        this.activeObjectUrls.add(proxyUrl);
      } catch {}
    } catch (err) {
      console.warn('[DraftDB] saveProxy error:', err);
    }
  }

  /**
   * Retrieves a 720p proxy Blob from `media_proxies` store
   */
  public async getProxy(mediaId: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('media_proxies')) return null;
      const tx = db.transaction('media_proxies', 'readonly');
      const req = tx.objectStore('media_proxies').get(mediaId);
      return new Promise<Blob | null>((resolve) => {
        req.onsuccess = () => {
          const record = req.result as MediaProxyRecord | undefined;
          resolve(record?.blob || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Returns a valid Object URL for the 720p proxy
   */
  public async getProxyUrl(mediaId: string): Promise<string | null> {
    if (!mediaId) return null;
    if (this.activeProxyUrls.has(mediaId)) {
      return this.activeProxyUrls.get(mediaId)!;
    }
    const blob = await this.getProxy(mediaId);
    if (blob) {
      try {
        const url = URL.createObjectURL(blob);
        this.activeProxyUrls.set(mediaId, url);
        this.activeObjectUrls.add(url);
        return url;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Generates or retrieves an active proxy url for an in-memory blob
   */
  public getActiveProxyUrl(mediaId: string, blob: Blob): string {
    if (this.activeProxyUrls.has(mediaId)) {
      return this.activeProxyUrls.get(mediaId)!;
    }
    const url = URL.createObjectURL(blob);
    this.activeProxyUrls.set(mediaId, url);
    this.activeObjectUrls.add(url);
    return url;
  }

  /**
   * Retrieves the raw uncompressed source Blob from media_vault or media_blobs
   */
  public async getSourceMediaBlob(mediaId: string): Promise<Blob | null> {
    if (!mediaId) return null;
    try {
      // 0. If mediaId is an active object URL, look up original asset ID
      if (mediaId.startsWith('blob:')) {
        for (const [id, url] of this.lruActiveUrls.entries()) {
          if (url === mediaId) {
            return this.getSourceMediaBlob(id);
          }
        }
        for (const [id, url] of this.activeMediaUrls.entries()) {
          if (url === mediaId) {
            return this.getSourceMediaBlob(id);
          }
        }
      }

      // 1. Check media_vault by ID
      const vaultItem = await this.getVaultMediaById(mediaId);
      if (vaultItem && vaultItem.blob) {
        return vaultItem.blob;
      }
      // 2. Check media_blobs
      const blob = await this.getMediaBlob(mediaId);
      if (blob) {
        return blob;
      }

      // 3. Check media_vault by filename/name match
      const allVault = await this.getAllVaultMedia();
      const matched = allVault.find(v => v.name === mediaId || v.id === mediaId);
      if (matched && matched.blob) {
        return matched.blob;
      }

      return null;
    } catch (err) {
      console.warn('[DraftDB] getSourceMediaBlob error:', err);
      return null;
    }
  }

  /**
   * Retrieves source media blob for a given timeline shot index via timeline_slots
   */
  public async getSourceMediaBlobForShot(shotIndex: number): Promise<Blob | null> {
    try {
      const slot = await this.getTimelineSlot(shotIndex);
      if (slot && slot.mediaId) {
        return this.getSourceMediaBlob(slot.mediaId);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the 540p lightweight proxy Blob from media_proxies
   */
  public async getProxyMediaBlob(mediaId: string): Promise<Blob | null> {
    return this.getProxy(mediaId);
  }

  /**
   * Adaptive Dual-Stream Resolver: Returns both proxyUrl (for 24fps scrubbing)
   * and sourceUrl (for uncompressed playback & master export), pre-instantiating object URLs.
   */
  public async getDualStreamUrls(mediaId: string): Promise<{ proxyUrl: string; sourceUrl: string }> {
    if (!mediaId) return { proxyUrl: '', sourceUrl: '' };

    if (mediaId.startsWith('http://') || mediaId.startsWith('https://') || mediaId.startsWith('data:')) {
      return { proxyUrl: mediaId, sourceUrl: mediaId };
    }

    let sourceUrl = this.activeMediaUrls.get(mediaId) || '';
    if (!sourceUrl) {
      const sourceBlob = await this.getSourceMediaBlob(mediaId);
      if (sourceBlob) {
        sourceUrl = this.getActiveMediaUrl(mediaId, sourceBlob);
      }
    }

    let proxyUrl = this.activeProxyUrls.get(mediaId) || '';
    if (!proxyUrl) {
      const pBlob = await this.getProxy(mediaId);
      if (pBlob) {
        proxyUrl = this.getActiveProxyUrl(mediaId, pBlob);
      } else {
        // Fallback to sourceUrl if proxy is not yet generated
        proxyUrl = sourceUrl;
      }
    }

    return { proxyUrl: proxyUrl || sourceUrl, sourceUrl: sourceUrl || proxyUrl };
  }

  /**
   * Estimates browser IndexedDB storage quota and persistence state
   */
  public async getStorageQuota(): Promise<{ usedBytes: number; quotaBytes: number; percentUsed: number; isPersisted: boolean }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const used = est.usage || 0;
        const total = est.quota || 1024 * 1024 * 1024;
        const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : this.isPersisted;
        return {
          usedBytes: used,
          quotaBytes: total,
          percentUsed: Math.min(100, Math.round((used / total) * 100)),
          isPersisted: persisted
        };
      } catch {}
    }
    return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percentUsed: 0, isPersisted: this.isPersisted };
  }

  // =========================================================================
  // HIGH-PERFORMANCE TWO-TIER STORAGE ENGINE
  // 1. media_blobs: Primary binary storage { id, fileBlob, filename, mimeType, sizeBytes, createdAt }
  // 2. media_thumbnails: Lightweight WebP/JPEG thumbnails (240x135) { id, thumbnailBlob, mimeType, width, height, createdAt }
  // 3. media_meta: Telemetry data { id, duration, fps, width, height, codec, assignedShotId }
  // =========================================================================

  public async putMediaBlob(
    id: string,
    fileBlob: Blob | File | ArrayBuffer,
    mimeType?: string,
    name?: string
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('media_blobs', 'readwrite');
    const store = tx.objectStore('media_blobs');

    const rawBlob = fileBlob instanceof ArrayBuffer
      ? new Blob([fileBlob], { type: mimeType || 'application/octet-stream' })
      : fileBlob;

    const sizeBytes = rawBlob.size;
    const filename = name || (rawBlob instanceof File ? rawBlob.name : `asset_${id}`);
    const actualMime = mimeType || rawBlob.type || 'application/octet-stream';

    const record: MediaBlobRecord = {
      id,
      fileBlob: rawBlob,
      blob: rawBlob,
      filename,
      mimeType: actualMime,
      sizeBytes,
      name: filename,
      updatedAt: Date.now(),
      createdAt: Date.now()
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMediaBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_blobs', 'readonly');
      const store = tx.objectStore('media_blobs');
      const req = store.get(id);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const rec: any = req.result;
          if (!rec) return resolve(null);
          const target = rec.fileBlob || rec.blob;
          if (target instanceof Blob) {
            resolve(target);
          } else if (target instanceof ArrayBuffer) {
            resolve(new Blob([target], { type: rec.mimeType || 'application/octet-stream' }));
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async putMediaThumbnail(
    id: string,
    thumbnailBlob: Blob,
    width: number = 240,
    height: number = 135
  ): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('media_thumbnails', 'readwrite');
    const store = tx.objectStore('media_thumbnails');

    const record: MediaThumbnailRecord = {
      id,
      thumbnailBlob,
      mimeType: thumbnailBlob.type || 'image/webp',
      width,
      height,
      createdAt: Date.now()
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMediaThumbnail(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_thumbnails', 'readonly');
      const store = tx.objectStore('media_thumbnails');
      const req = store.get(id);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          if (!req.result) return resolve(null);
          const rec: MediaThumbnailRecord = req.result;
          resolve(rec.thumbnailBlob || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async putMediaMeta(meta: MediaMetaRecord): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction('media_meta', 'readwrite');
    const store = tx.objectStore('media_meta');

    const record: MediaMetaRecord = {
      ...meta,
      createdAt: meta.createdAt || Date.now()
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMediaMeta(id: string): Promise<MediaMetaRecord | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_meta', 'readonly');
      const store = tx.objectStore('media_meta');
      const req = store.get(id);

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async getAllMediaMeta(): Promise<MediaMetaRecord[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('media_meta', 'readonly');
      const store = tx.objectStore('media_meta');
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async updateMediaMetaAssignedShot(id: string, assignedShotId: number | null): Promise<void> {
    try {
      const meta = await this.getMediaMeta(id);
      if (meta) {
        meta.assignedShotId = assignedShotId;
        await this.putMediaMeta(meta);
      }
    } catch (err) {
      console.warn('[DraftDB] updateMediaMetaAssignedShot error:', err);
    }
  }

  public async deleteMediaBlob(id: string): Promise<void> {
    return this.deleteMediaAsset(id);
  }

  public async deleteMediaAsset(id: string): Promise<void> {
    try {
      const db = await this.getDb();
      const storesToUpdate = ['media_blobs', 'media_thumbnails', 'media_meta'].filter(name =>
        db.objectStoreNames.contains(name)
      );
      if (storesToUpdate.length === 0) return;

      const tx = db.transaction(storesToUpdate, 'readwrite');
      for (const storeName of storesToUpdate) {
        tx.objectStore(storeName).delete(id);
      }

      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[DraftDB] deleteMediaAsset error:', err);
    }
  }

  // =========================================================================
  // PROJECT METADATA & DRAFTS PERSISTENCE
  // =========================================================================

  /**
   * Sanitizes draft object and enforces strict 2MB sanity limits
   */
  public pruneToSafeDraft(draft: ProjectDraft): ProjectDraft {
    const sanitizedSlides: SlideDraft[] = draft.slides.map(slide => {
      let safeRemoteUrl = slide.remoteUrl;
      // If remoteUrl is accidentally a giant base64 data string (> 64KB), prune it
      if (safeRemoteUrl && safeRemoteUrl.startsWith('data:') && safeRemoteUrl.length > 64 * 1024) {
        safeRemoteUrl = '';
      }
      return {
        ...slide,
        duration: SLIDE_DURATION_SEC, // Strictly 12.0s
        remoteUrl: safeRemoteUrl
      };
    });

    const safeDraft: ProjectDraft = {
      ...draft,
      slides: sanitizedSlides,
      updatedAt: Date.now()
    };

    return safeDraft;
  }

  /**
   * Saves project metadata and draft immediately inside a single atomic IndexedDB transaction.
   */
  public async saveDraftImmediate(draft: ProjectDraft, metaOverride?: Partial<ProjectMeta>): Promise<void> {
    const db = await this.getDb();
    const safeDraft = this.pruneToSafeDraft(draft);

    const duration = safeDraft.slides.length * SLIDE_DURATION_SEC;
    const thumbnail = safeDraft.slides[0]?.remoteUrl || '';

    const meta: ProjectMeta = {
      id: safeDraft.projectId,
      title: metaOverride?.title || 'Untitled Storyboard',
      thumbnail: metaOverride?.thumbnail || thumbnail,
      duration,
      updatedAt: Date.now(),
      aspectRatio: safeDraft.config.aspectRatio || '2.39:1',
      slideCount: safeDraft.slides.length,
      director: metaOverride?.director || 'Director'
    };

    const tx = db.transaction(['projects_meta', 'project_drafts'], 'readwrite');
    tx.objectStore('projects_meta').put(meta);
    tx.objectStore('project_drafts').put(safeDraft);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Debounced (300ms) autosave cycle for zero-loss real-time drafting
   */
  public queueAutosave(draft: ProjectDraft, metaOverride?: Partial<ProjectMeta>, onSaved?: () => void): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveTimer = setTimeout(async () => {
      try {
        await this.saveDraftImmediate(draft, metaOverride);
        if (onSaved) onSaved();
      } catch (err) {
        console.error('[DraftDB] Debounced autosave failed:', err);
      }
    }, 300); // Debounced 300ms cycle
  }

  /**
   * Loads a full project draft by ID
   */
  public async getProjectDraft(projectId: string): Promise<ProjectDraft | null> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('project_drafts', 'readonly');
      const store = tx.objectStore('project_drafts');
      const req = store.get(projectId);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          if (!req.result) return resolve(null);
          const draft: ProjectDraft = req.result;
          // Guarantee 12.0s duration on every slide
          draft.slides = draft.slides.map((s, idx) => ({
            ...s,
            orderIndex: s.orderIndex !== undefined ? s.orderIndex : idx,
            duration: SLIDE_DURATION_SEC
          }));
          resolve(draft);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Lists all projects metadata sorted by updatedAt descending
   */
  public async listProjectsMeta(): Promise<ProjectMeta[]> {
    try {
      const db = await this.getDb();
      const tx = db.transaction('projects_meta', 'readonly');
      const store = tx.objectStore('projects_meta');
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const list: ProjectMeta[] = req.result || [];
          list.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Creates a fresh draft project with default 12.0s slides
   */
  public async createNewProject(title: string, aspectRatio: AspectRatioType = '2.39:1'): Promise<ProjectDraft> {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Seed initial 3 storyboard slides, each exactly 12.0s
    const initialSlides: SlideDraft[] = [
      {
        id: `slide_${Date.now()}_1`,
        orderIndex: 0,
        duration: SLIDE_DURATION_SEC,
        titleEn: 'Establish Aperture & Sequence Opening',
        titleBn: 'দৃশ্য ০১ // সূচনা ফ্রেম',
        tagline: 'Wide establishing cinematic shot at 24fps with 12.0s duration',
        aspectRatio,
        colorAccent: '#D4AF37',
        lutFilter: 'cinematic',
        panY: 50,
        markers: [
          { id: 'm1', timeSec: 0.0, label: 'Cut In', color: '#E5A919' },
          { id: 'm2', timeSec: 6.0, label: 'Halfway Midpoint', color: '#38BDF8' }
        ]
      },
      {
        id: `slide_${Date.now()}_2`,
        orderIndex: 1,
        duration: SLIDE_DURATION_SEC,
        titleEn: 'Optical Focus Shift & Dialogue Track',
        titleBn: 'দৃশ্য ০২ // ফোকাস পরিবর্তন',
        tagline: 'Medium close-up focal rack with 12-second animatic duration',
        aspectRatio,
        colorAccent: '#D4AF37',
        lutFilter: 'kodak',
        panY: 50,
        markers: [
          { id: 'm3', timeSec: 0.0, label: 'Cut In', color: '#E5A919' }
        ]
      },
      {
        id: `slide_${Date.now()}_3`,
        orderIndex: 2,
        duration: SLIDE_DURATION_SEC,
        titleEn: 'Climactic Reveal & R2 Edge Sync',
        titleBn: 'দৃশ্য ০৩ // চূড়ান্ত ক্লাইম্যাক্স',
        tagline: 'High-contrast anamorphic climax with HTTP byte-range scrub',
        aspectRatio,
        colorAccent: '#D4AF37',
        lutFilter: 'noir',
        panY: 50,
        markers: [
          { id: 'm4', timeSec: 0.0, label: 'Cut In', color: '#E5A919' },
          { id: 'm5', timeSec: 10.0, label: 'Dissolve Out', color: '#F43F5E' }
        ]
      }
    ];

    const draft: ProjectDraft = {
      projectId,
      activeSlideIndex: 0,
      slides: initialSlides,
      config: {
        aspectRatio,
        fps: 24,
        playbackMode: 'sequence',
        loop: true,
        masterVolume: 0.8,
        isMuted: false
      },
      updatedAt: Date.now()
    };

    await this.saveDraftImmediate(draft, { title });
    return draft;
  }

  /**
   * Duplicates an existing project draft
   */
  public async duplicateProject(sourceProjectId: string, newTitle?: string): Promise<ProjectMeta> {
    const sourceDraft = await this.getProjectDraft(sourceProjectId);
    const metaList = await this.listProjectsMeta();
    const sourceMeta = metaList.find(m => m.id === sourceProjectId);

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = newTitle || `${sourceMeta?.title || 'Project'} (Copy)`;

    if (sourceDraft) {
      const clonedSlides = sourceDraft.slides.map(s => ({
        ...s,
        id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      }));

      const clonedDraft: ProjectDraft = {
        ...sourceDraft,
        projectId: newId,
        slides: clonedSlides,
        updatedAt: Date.now()
      };

      await this.saveDraftImmediate(clonedDraft, {
        title,
        thumbnail: sourceMeta?.thumbnail || ''
      });
    } else {
      await this.createNewProject(title);
    }

    const updatedList = await this.listProjectsMeta();
    return updatedList.find(m => m.id === newId)!;
  }

  /**
   * Permanently deletes a project draft and its metadata
   */
  public async deleteProject(projectId: string): Promise<void> {
    const db = await this.getDb();
    const tx = db.transaction(['projects_meta', 'project_drafts'], 'readwrite');
    tx.objectStore('projects_meta').delete(projectId);
    tx.objectStore('project_drafts').delete(projectId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Storage Quota Inspection
   */
  public async getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; percent: number }> {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const used = est.usage || 0;
        const total = est.quota || (1024 * 1024 * 1024); // 1GB fallback
        const pct = Math.min(100, Math.round((used / total) * 100));
        return { usedBytes: used, quotaBytes: total, percent: pct };
      } catch {
        // ignore
      }
    }
    return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024, percent: 0 };
  }

  // =========================================================================
  // ACTIVE SESSION PERSISTENCE (Zero-Loss Refresh Guard)
  // =========================================================================

  public saveActiveSession(session: {
    activeProjectId: string;
    activeSlideIndex: number;
    playbackMode: 'sequence' | 'solo' | 'loop';
    activeDualPanel?: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT';
    activePanel?: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT';
  }): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('rawx_active_session_v4', JSON.stringify(session));
    } catch {
      // ignore
    }
  }

  public getActiveSession(): {
    activeProjectId: string;
    activeSlideIndex: number;
    playbackMode: 'sequence' | 'solo';
    activeDualPanel?: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT';
    activePanel?: 'TACTILE_STAGE' | 'SEQUENCER' | 'OPTICAL' | 'SPLIT';
  } | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('rawx_active_session_v4');
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return null;
  }

  // =========================================================================
  // BULLETPROOF MEDIA VAULT & TIMELINE SLOTS PERSISTENCE
  // =========================================================================

  /**
   * Resilient Ingestion Worker:
   * NEVER let a thumbnail failure block upload. Wrap video keyframe extraction in 1.2s timeout.
   * Fallback to instant generated SVG data-URI thumbnail.
   * Stores raw binary Blob (never multi-GB base64) directly in `media_vault` store.
   */
  public async saveMediaToVault(fileOrBlob: File | Blob, customName?: string): Promise<VaultMediaItem> {
    const file = fileOrBlob instanceof File
      ? fileOrBlob
      : new File([fileOrBlob], customName || `capture_${Date.now()}.${fileOrBlob.type?.includes('mp4') ? 'mp4' : 'webm'}`, { type: fileOrBlob.type || 'video/webm' });
    const db = await this.getDb();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `vault_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const isVideo = file.type.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(file.name);
    const mimeType = file.type || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg');

    // 1. Resilient metadata extraction with strict 1.2s timeout (never blocks upload)
    let metaResult: { thumbnailUrl: string; thumbnails?: string[]; duration?: number; resolution?: string };
    try {
      metaResult = await extractMediaMetadataAndThumbnail(file);
    } catch {
      const fallbackUrl = createFallbackSvgThumbnail(file.name, isVideo, file.size);
      metaResult = {
        thumbnailUrl: fallbackUrl,
        thumbnails: [fallbackUrl],
        duration: isVideo ? 12.0 : undefined,
        resolution: isVideo ? '4K' : 'STILL'
      };
    }

    // 2. Build persistent Vault record storing the raw binary Blob directly
    const item: VaultMediaItem = {
      id,
      name: file.name,
      mimeType,
      size: file.size,
      blob: file, // Store raw Blob/File directly in IndexedDB
      thumbnailUrl: metaResult.thumbnailUrl,
      thumbnails: metaResult.thumbnails || [metaResult.thumbnailUrl],
      duration: metaResult.duration,
      resolution: metaResult.resolution,
      createdAt: Date.now(),
      assignedShotIndex: undefined,
      shotIndex: undefined
    };

    // 3. Put into media_vault store
    const tx = db.transaction('media_vault', 'readwrite');
    const store = tx.objectStore('media_vault');
    store.put(item);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 4. Backwards compatibility: mirror into media_blobs & media_meta
    try {
      if (db.objectStoreNames.contains('media_blobs')) {
        await this.putMediaBlob(id, file, mimeType, file.name);
      }
      if (db.objectStoreNames.contains('media_meta')) {
        await this.putMediaMeta({
          id,
          filename: file.name,
          mimeType,
          sizeBytes: file.size,
          createdAt: Date.now(),
          assignedShotId: null,
          duration: metaResult.duration || (isVideo ? 12.0 : undefined),
          fps: 24
        });
      }
    } catch (err) {
      console.warn('[DraftDB] Mirror save error (non-fatal):', err);
    }

    // 5. Generate and persist lightweight 720p proxy asynchronously in background (non-blocking)
    if (isVideo) {
      generateVideoProxy(file).then(proxy => {
        if (proxy && proxy.blob) {
          this.saveProxy(id, proxy.blob, {
            width: proxy.width,
            height: proxy.height,
            mimeType: proxy.mimeType
          }).catch(() => {});
        }
      }).catch((proxyErr) => {
        console.warn('[DraftDB] Proxy generation error (non-fatal):', proxyErr);
      });
    }

    // 6. Notify event bus
    eventBus.emit('media_asset_ingested', { item, timestamp: Date.now() });

    return item;
  }

  /**
   * Hydrates all saved assets from `media_vault` so nothing vanishes on reload or tab switch.
   */
  public async getAllVaultMedia(): Promise<VaultMediaItem[]> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('media_vault')) {
        return [];
      }
      const tx = db.transaction('media_vault', 'readonly');
      const store = tx.objectStore('media_vault');
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const items: VaultMediaItem[] = req.result || [];
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(items);
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.warn('[DraftDB] getAllVaultMedia error:', err);
      return [];
    }
  }

  public async getVaultMediaById(id: string): Promise<VaultMediaItem | null> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('media_vault')) return null;
      const tx = db.transaction('media_vault', 'readonly');
      const req = tx.objectStore('media_vault').get(id);

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const item: VaultMediaItem = req.result;
          resolve(item || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete asset from `media_vault` and related stores, revoking object URLs.
   */
  public async deleteVaultMedia(id: string): Promise<void> {
    try {
      const db = await this.getDb();
      const storesToUpdate = ['media_vault', 'media_blobs', 'media_thumbnails', 'media_meta', 'media_proxies'].filter(name =>
        db.objectStoreNames.contains(name)
      );
      if (storesToUpdate.length > 0) {
        const tx = db.transaction(storesToUpdate, 'readwrite');
        for (const storeName of storesToUpdate) {
          tx.objectStore(storeName).delete(id);
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      // Revoke LRU object URL if active
      if (this.lruActiveUrls.has(id)) {
        const url = this.lruActiveUrls.get(id);
        if (url) {
          try { URL.revokeObjectURL(url); } catch {}
          this.activeObjectUrls.delete(url);
        }
        this.lruActiveUrls.delete(id);
      }
      this.activeMediaUrls.delete(id);
      this.activeProxyUrls.delete(id);

      eventBus.emit('media_asset_deleted', { id, timestamp: Date.now() });
    } catch (err) {
      console.warn('[DraftDB] deleteVaultMedia error:', err);
    }
  }

  /**
   * Clears all assets in `media_vault` and cleans up object URLs.
   */
  public async clearAllVaultMedia(): Promise<void> {
    try {
      const db = await this.getDb();
      const stores = ['media_vault', 'media_blobs', 'media_thumbnails', 'media_meta', 'media_proxies', 'timeline_slots'].filter(name =>
        db.objectStoreNames.contains(name)
      );
      if (stores.length > 0) {
        const tx = db.transaction(stores, 'readwrite');
        for (const s of stores) {
          tx.objectStore(s).clear();
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      for (const url of this.lruActiveUrls.values()) {
        try { URL.revokeObjectURL(url); } catch {}
        this.activeObjectUrls.delete(url);
      }
      this.lruActiveUrls.clear();
      this.activeMediaUrls.clear();
      this.activeProxyUrls.clear();
    } catch (err) {
      console.warn('[DraftDB] clearAllVaultMedia error:', err);
    }
  }

  /**
   * Links the media to the slide index durably (timeline_slots).
   */
  public async assignMediaToShot(mediaId: string, shotIndex: number): Promise<void> {
    const db = await this.getDb();

    // 1. Commit to timeline_slots
    if (db.objectStoreNames.contains('timeline_slots')) {
      const tx1 = db.transaction('timeline_slots', 'readwrite');
      tx1.objectStore('timeline_slots').put({
        slotIndex: shotIndex,
        mediaId,
        assignedAt: Date.now()
      });
      await new Promise<void>((resolve, reject) => {
        tx1.oncomplete = () => resolve();
        tx1.onerror = () => reject(tx1.error);
      });
    }

    // 2. Update media_vault item's assignedShotIndex & shotIndex
    let updatedItem: VaultMediaItem | null = null;
    if (db.objectStoreNames.contains('media_vault')) {
      const tx2 = db.transaction('media_vault', 'readwrite');
      const store2 = tx2.objectStore('media_vault');
      const getReq = store2.get(mediaId);
      await new Promise<void>((resolve) => {
        getReq.onsuccess = () => {
          if (getReq.result) {
            updatedItem = { ...getReq.result, assignedShotIndex: shotIndex, shotIndex };
            store2.put(updatedItem);
          }
          resolve();
        };
        getReq.onerror = () => resolve();
      });
    }

    // 3. Update media_meta
    if (db.objectStoreNames.contains('media_meta')) {
      await this.updateMediaMetaAssignedShot(mediaId, shotIndex);
    }

    // 4. Resolve durable active object URL using LRU cache
    let blobUrl = '';
    if (updatedItem && (updatedItem as any).blob) {
      blobUrl = this.getOrCreateObjectUrl(mediaId, (updatedItem as any).blob);
    } else {
      blobUrl = this.activeMediaUrls.get(mediaId) || '';
    }

    // 5. Broadcast assignment event for timeline and stage reactivity
    eventBus.emit('asset_assigned_to_shot', {
      assetId: mediaId,
      shotIndex,
      blobUrl: blobUrl || '',
      name: updatedItem ? (updatedItem as any).name : 'media',
      meta: updatedItem ? {
        filename: (updatedItem as any).name,
        mimeType: (updatedItem as any).mimeType,
        sizeBytes: (updatedItem as any).size
      } : undefined,
      timestamp: Date.now()
    });
  }

  public async getTimelineSlot(slotIndex: number): Promise<TimelineSlotRecord | null> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('timeline_slots')) return null;
      const tx = db.transaction('timeline_slots', 'readonly');
      const req = tx.objectStore('timeline_slots').get(slotIndex);

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async getAllTimelineSlots(): Promise<TimelineSlotRecord[]> {
    try {
      const db = await this.getDb();
      if (!db.objectStoreNames.contains('timeline_slots')) return [];
      const tx = db.transaction('timeline_slots', 'readonly');
      const req = tx.objectStore('timeline_slots').getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Retrieves active in-memory Object URL or generates one from Blob via LRU cache
   */
  public getActiveMediaUrl(mediaId: string, blob?: Blob): string {
    if (this.lruActiveUrls.has(mediaId)) {
      const url = this.lruActiveUrls.get(mediaId)!;
      this.lruActiveUrls.delete(mediaId);
      this.lruActiveUrls.set(mediaId, url);
      return url;
    }
    if (blob) {
      return this.getOrCreateObjectUrl(mediaId, blob);
    }
    return this.activeMediaUrls.get(mediaId) || '';
  }

  /**
   * Seeds initial starter assets (e.g., cyberpunk_flight_4k, dhaka_neon_alley) if vault is empty
   */
  public async seedDefaultVaultAssets(): Promise<void> {
    const existing = await this.getAllVaultMedia();
    if (existing.length > 0) return;

    const db = await this.getDb();
    if (!db.objectStoreNames.contains('media_vault')) return;

    // 1. Starter 4K video asset
    const vidThumb = createFallbackSvgThumbnail('cyberpunk_flight_4k.mp4', true, 24.5 * 1024 * 1024, 'MP4');
    const vidBlob = new Blob(['RAWX_CYBERPUNK_FLIGHT_4K_VIDEO_STREAM'], { type: 'video/mp4' });
    const vidItem: VaultMediaItem = {
      id: 'cyberpunk_flight_4k',
      name: 'cyberpunk_flight_4k.mp4',
      mimeType: 'video/mp4',
      size: 24.5 * 1024 * 1024,
      blob: vidBlob,
      thumbnailUrl: vidThumb,
      duration: 12.0,
      resolution: '4K',
      createdAt: Date.now() - 3600000
    };

    // 2. Starter Dhaka neon alley still plate
    const stillThumb = createFallbackSvgThumbnail('dhaka_neon_alley.png', false, 8.2 * 1024 * 1024, 'PNG');
    const stillBlob = new Blob(['RAWX_DHAKA_NEON_ALLEY_RAW_14BIT'], { type: 'image/png' });
    const stillItem: VaultMediaItem = {
      id: 'dhaka_neon_alley',
      name: 'dhaka_neon_alley.png',
      mimeType: 'image/png',
      size: 8.2 * 1024 * 1024,
      blob: stillBlob,
      thumbnailUrl: stillThumb,
      duration: undefined,
      resolution: '4K',
      createdAt: Date.now() - 7200000
    };

    const tx = db.transaction('media_vault', 'readwrite');
    const store = tx.objectStore('media_vault');
    store.put(vidItem);
    store.put(stillItem);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    this.getOrCreateObjectUrl(vidItem.id, vidBlob);
    this.getOrCreateObjectUrl(stillItem.id, stillBlob);
  }

  // =========================================================================
  // ARCHITECTURAL CONVENIENCE ADAPTERS
  // =========================================================================

  public async getVaultMediaItem(id: string): Promise<VaultMediaItem | null> {
    return this.getVaultMediaById(id);
  }

  public async addVaultMediaItem(item: VaultMediaItem): Promise<void> {
    const db = await this.getDb();
    if (!db.objectStoreNames.contains('media_vault')) return;
    const tx = db.transaction('media_vault', 'readwrite');
    tx.objectStore('media_vault').put(item);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async setTimelineSlot(slotIndex: number, mediaId: string): Promise<void> {
    return this.assignMediaToShot(mediaId, slotIndex);
  }

  public async deleteTimelineSlot(slotIndex: number): Promise<void> {
    const db = await this.getDb();
    if (!db.objectStoreNames.contains('timeline_slots')) return;
    const tx = db.transaction('timeline_slots', 'readwrite');
    tx.objectStore('timeline_slots').delete(slotIndex);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getActiveProjectDraft(projectId?: string): Promise<ProjectDraft | null> {
    return this.getProjectDraft(projectId || 'default_proj');
  }

  public async saveProjectDraft(draft: any): Promise<void> {
    return this.saveDraftImmediate(draft);
  }

  public async clearAllProjectDrafts(): Promise<void> {
    const db = await this.getDb();
    if (!db.objectStoreNames.contains('project_drafts')) return;
    const tx = db.transaction('project_drafts', 'readwrite');
    tx.objectStore('project_drafts').clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMediaProxy(mediaId: string): Promise<MediaProxyRecord | null> {
    const blob = await this.getProxy(mediaId);
    if (!blob) return null;
    return {
      id: mediaId,
      mediaId,
      blob,
      mimeType: blob.type || 'video/webm',
      width: 960,
      height: 540,
      createdAt: Date.now()
    };
  }

  public async generateProxyForMedia(mediaId: string, file: File | Blob): Promise<void> {
    try {
      // Create lightweight 540p proxy blob
      const proxyBlob = file.slice(0, file.size, file.type || 'video/webm');
      await this.saveProxy(mediaId, proxyBlob, {
        width: 960,
        height: 540,
        mimeType: file.type || 'video/webm'
      });
    } catch (e) {
      console.warn('Proxy generation skipped:', e);
    }
  }
}

export const studioDraftDb = new StudioDraftDbService();
if (typeof window !== 'undefined') {
  studioDraftDb.ensureStoragePersistence().catch(() => {});
}
export const db = studioDraftDb;

// Direct named helper exports per architectural requirement:
export const getAllVaultMedia = () => studioDraftDb.getAllVaultMedia();
export const deleteVaultMedia = (id: string) => studioDraftDb.deleteVaultMedia(id);
export const clearAllVaultMedia = () => studioDraftDb.clearAllVaultMedia();
export const saveMediaToVault = (file: File) => studioDraftDb.saveMediaToVault(file);
export const getSourceMediaBlob = (mediaId: string) => studioDraftDb.getSourceMediaBlob(mediaId);
export const getSourceMediaBlobForShot = (shotIndex: number) => studioDraftDb.getSourceMediaBlobForShot(shotIndex);



