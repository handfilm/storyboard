/**
 * @file /src/services/storyboardSyncService.ts
 * @description Bi-Directional Storyboard Synchronization Service for RAWx Media Vault.
 * Synchronizes high-speed bulk ingested media between IndexedDB two-tier stores
 * (media_blobs, media_thumbnails, media_meta) and active 12.0s timeline slides.
 */

import { studioDraftDb } from './db';
import { globalLRUBlobCache } from '../hooks/useVideoPlaybackEngine';
import { eventBus } from '../core/eventBus';
import { MediaMetaRecord } from '../types/project';

class StoryboardSyncService {
  private thumbnailObjectUrls: Map<string, string> = new Map();

  /**
   * Assigns an ingested media asset directly to a specific storyboard shot.
   * Updates `media_meta` telemetry and broadcasts an event to sync the timeline slide.
   */
  public async assignAssetToShot(
    assetId: string,
    shotIndex: number,
    metaOverride?: Partial<MediaMetaRecord>
  ): Promise<{ success: boolean; blobUrl?: string; assetMeta?: MediaMetaRecord }> {
    try {
      // 1. Update media_meta in IndexedDB
      await studioDraftDb.updateMediaMetaAssignedShot(assetId, shotIndex);
      const meta = await studioDraftDb.getMediaMeta(assetId);

      // 2. Resolve playback blob URL through Two-Tier LRU Cache
      const blobUrl = await this.resolvePlaybackUrl(assetId);

      // 3. Emit sync event to update Timeline, MainWorkspace, and Active Slide
      eventBus.emit('asset_assigned_to_shot', {
        assetId,
        shotIndex,
        blobUrl,
        meta: meta || metaOverride,
        timestamp: Date.now()
      });

      return {
        success: true,
        blobUrl: blobUrl || undefined,
        assetMeta: meta || undefined
      };
    } catch (err) {
      console.error('[StoryboardSync] Failed to assign asset to shot:', err);
      return { success: false };
    }
  }

  /**
   * Unassigns an asset from a shot without deleting the binary blob.
   */
  public async unassignAsset(assetId: string): Promise<void> {
    try {
      await studioDraftDb.updateMediaMetaAssignedShot(assetId, null);
      eventBus.emit('asset_unassigned', { assetId, timestamp: Date.now() });
    } catch (err) {
      console.warn('[StoryboardSync] Failed to unassign asset:', err);
    }
  }

  /**
   * Resolves full-resolution playback stream URL using Two-Tier LRU Cache (max 8 active).
   * 0ms if resident in RAM; fetches from IndexedDB `media_blobs` if evicted.
   */
  public async resolvePlaybackUrl(assetId: string): Promise<string | null> {
    if (!assetId) return null;

    // Check LRU in-memory cache
    const cachedUrl = globalLRUBlobCache.get(assetId);
    if (cachedUrl) return cachedUrl;

    // Retrieve from IndexedDB primary store
    const blob = await studioDraftDb.getMediaBlob(assetId);
    if (!blob) return null;

    const objectUrl = URL.createObjectURL(blob);
    globalLRUBlobCache.set(assetId, objectUrl);
    return objectUrl;
  }

  /**
   * Resolves ultra-lightweight 240p thumbnail blob URL (0ms load latency).
   * Kept in dedicated thumbnail cache for snappy Media Vault UI.
   */
  public async resolveThumbnailUrl(assetId: string): Promise<string | null> {
    if (!assetId) return null;

    if (this.thumbnailObjectUrls.has(assetId)) {
      return this.thumbnailObjectUrls.get(assetId)!;
    }

    const thumbBlob = await studioDraftDb.getMediaThumbnail(assetId);
    if (!thumbBlob) {
      // Fallback: check if we can resolve from source blob if thumbnail is missing
      const sourceBlob = await studioDraftDb.getMediaBlob(assetId);
      if (!sourceBlob) return null;
      const url = URL.createObjectURL(sourceBlob);
      this.thumbnailObjectUrls.set(assetId, url);
      return url;
    }

    const thumbUrl = URL.createObjectURL(thumbBlob);
    this.thumbnailObjectUrls.set(assetId, thumbUrl);
    return thumbUrl;
  }

  /**
   * Revoke cached thumbnail URL on asset removal to prevent leaks.
   */
  public revokeThumbnailUrl(assetId: string): void {
    const url = this.thumbnailObjectUrls.get(assetId);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      this.thumbnailObjectUrls.delete(assetId);
    }
  }

  /**
   * Cleans all active object URLs created by this service.
   */
  public clearAllUrls(): void {
    for (const url of this.thumbnailObjectUrls.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.thumbnailObjectUrls.clear();
    globalLRUBlobCache.clear();
  }
}

export const storyboardSyncService = new StoryboardSyncService();
