/**
 * @file /src/services/mediaIngestService.ts
 * @description Bulletproof Media Ingestion, File Upload & Drag-and-Drop Recovery Service.
 * 
 * Mandates:
 * 1. Synchronous, Non-Blocking Object URL: Instantly produces URL.createObjectURL(file) (<16ms).
 * 2. Wide Container Acceptance: Supports .mp4, .mov, .webm, .m4v, .avi, .mkv, and common images/audio without strict rejection.
 * 3. Non-Blocking Background Queue: Heavy OPFS writes, IndexedDB persistence, and WebCodecs extraction run in background.
 * 4. Resilient Error Isolation: Every step wrapped with try/catch and [RECOVERY FALLBACK] logging.
 */

import { studioDraftDb } from './db';
import { opfsMediaStorage } from './media/opfsMediaStorage';
import { extractVideoPoster, thumbnailMemoryCache, extractVideoMetadata, VideoMetadata } from './thumbnailEngine';
import { useStudioStore } from '../core/store';
import { eventBus } from '../core/eventBus';

export interface IngestedMediaItem {
  id: string;
  name: string;
  file: File;
  objectUrl: string;
  isVideo: boolean;
  isAudio: boolean;
  mimeType: string;
  size: number;
  thumbnailUrl: string;
  metadata?: Partial<VideoMetadata>;
}

export interface IngestOptions {
  shotIndex?: number;
  onImmediatePreview?: (item: IngestedMediaItem) => void;
  onMetadataReady?: (item: IngestedMediaItem) => void;
  onPersisted?: (item: IngestedMediaItem) => void;
  onError?: (err: Error) => void;
}

// Recognized media extensions for desktop and mobile containers
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi|mkv|3gp|wmv|ts|ogv)$/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg|bmp|heic|avif)$/i;
const AUDIO_EXTENSIONS = /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i;

/**
 * Checks if a given file is a video by MIME or container extension.
 */
export function isVideoFile(file: File | { type?: string; name?: string }): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  if (file.name && VIDEO_EXTENSIONS.test(file.name)) return true;
  return false;
}

/**
 * Checks if a given file is an image by MIME or container extension.
 */
export function isImageFile(file: File | { type?: string; name?: string }): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  if (file.name && IMAGE_EXTENSIONS.test(file.name)) return true;
  return false;
}

/**
 * Normalizes FileList, File[], or single File into an array of File objects.
 */
export function normalizeFileInput(input: FileList | File[] | File): File[] {
  if (!input) return [];
  if (input instanceof File) return [input];
  if (Array.isArray(input)) return input;
  return Array.from(input);
}

/**
 * Bulletproof, non-blocking single file ingest routine.
 * Immediately produces a synchronous objectUrl for instant zero-latency UI display (<16ms),
 * while offloading heavy IndexedDB and OPFS writes to the background.
 */
export async function ingestMediaFile(
  file: File,
  options: IngestOptions = {}
): Promise<IngestedMediaItem> {
  const isVideo = isVideoFile(file);
  const isAudio = Boolean(!isVideo && (file.type.startsWith('audio/') || (file.name && AUDIO_EXTENSIONS.test(file.name))));
  const mimeType = file.type || (isVideo ? 'video/mp4' : isAudio ? 'audio/mpeg' : 'image/jpeg');
  const mediaId = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Synchronous, instant baseline Object URL (<16ms)
  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
  } catch (err) {
    console.warn('[RECOVERY FALLBACK] Failed to create object URL:', err);
    objectUrl = '';
  }

  const initialItem: IngestedMediaItem = {
    id: mediaId,
    name: file.name,
    file,
    objectUrl,
    isVideo,
    isAudio,
    mimeType,
    size: file.size,
    thumbnailUrl: !isVideo && !isAudio ? objectUrl : ''
  };

  // Immediate UI Notification
  if (options.onImmediatePreview) {
    try {
      options.onImmediatePreview(initialItem);
    } catch (err) {
      console.warn('[RECOVERY FALLBACK] onImmediatePreview threw:', err);
    }
  }

  // 2. Non-blocking background extraction and persistence
  (async () => {
    let posterDataUrl = initialItem.thumbnailUrl;
    let metadata: Partial<VideoMetadata> = {};

    if (isVideo) {
      try {
        const [posterRes, metaRes] = await Promise.allSettled([
          extractVideoPoster(file, 0.1, mediaId),
          extractVideoMetadata(file)
        ]);

        if (posterRes.status === 'fulfilled' && posterRes.value.base64) {
          posterDataUrl = posterRes.value.base64;
          thumbnailMemoryCache.set(mediaId, posterDataUrl);
          if (options.shotIndex !== undefined) {
            thumbnailMemoryCache.set(`shot_${options.shotIndex}`, posterDataUrl);
          }
        }

        if (metaRes.status === 'fulfilled') {
          metadata = metaRes.value;
        }
      } catch (err) {
        console.warn('[RECOVERY FALLBACK] Video thumbnail/metadata extraction error:', err);
      }
    }

    const enrichedItem: IngestedMediaItem = {
      ...initialItem,
      thumbnailUrl: posterDataUrl,
      metadata
    };

    if (options.onMetadataReady) {
      try {
        options.onMetadataReady(enrichedItem);
      } catch (err) {
        console.warn('[RECOVERY FALLBACK] onMetadataReady threw:', err);
      }
    }

    // 3. Background IndexedDB persistence
    try {
      await studioDraftDb.addVaultMediaItem({
        id: mediaId,
        name: file.name,
        mimeType,
        size: file.size,
        blob: file,
        thumbnailUrl: posterDataUrl,
        createdAt: Date.now(),
        assignedShotIndex: options.shotIndex
      });

      if (options.shotIndex !== undefined) {
        await studioDraftDb.setTimelineSlot(options.shotIndex, mediaId);
      }

      // Generate lightweight 540p proxy if video
      if (isVideo) {
        try {
          await studioDraftDb.generateProxyForMedia(mediaId, file);
        } catch (err) {
          console.warn('[RECOVERY FALLBACK] Background proxy generation skipped:', err);
        }
      }

      // Background OPFS write
      opfsMediaStorage.storeSourceFile(mediaId, file, file.name).then(async (asset) => {
        try {
          await opfsMediaStorage.generate720pScrubProxy(file, mediaId, asset.dimensions);
        } catch {
          // non-fatal
        }
      }).catch((err) => {
        console.warn('[RECOVERY FALLBACK] OPFS storage deferred/skipped:', err);
      });

      if (options.onPersisted) {
        options.onPersisted(enrichedItem);
      }
    } catch (err) {
      console.warn('[RECOVERY FALLBACK] Background database persistence note:', err);
    }
  })();

  return initialItem;
}

/**
 * High-level multi-file ingest routine.
 */
export async function handleFileUpload(
  files: FileList | File[] | File,
  options: IngestOptions = {}
): Promise<IngestedMediaItem[]> {
  const normalized = normalizeFileInput(files);
  if (normalized.length === 0) return [];

  const results: IngestedMediaItem[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const file = normalized[i];
    const shotIdx = options.shotIndex !== undefined ? options.shotIndex + i : undefined;
    try {
      const item = await ingestMediaFile(file, {
        ...options,
        shotIndex: shotIdx
      });
      results.push(item);
    } catch (err) {
      console.warn('[RECOVERY FALLBACK] Failed ingesting file:', file.name, err);
    }
  }

  return results;
}
