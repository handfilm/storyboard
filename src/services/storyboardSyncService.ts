/**
 * @file /src/services/storyboardSyncService.ts
 * @description Synchronization service connecting the media vault, timeline slots, and playback URLs.
 */

import { studioDraftDb } from './db';

class StoryboardSyncService {
  private activeUrls: Map<string, string> = new Map();

  public async assignAssetToShot(assetId: string, shotIndex: number): Promise<void> {
    await studioDraftDb.setTimelineSlot(shotIndex, assetId);
  }

  public async unassignAsset(assetId: string): Promise<void> {
    const slots = await studioDraftDb.getAllTimelineSlots();
    for (const s of slots) {
      if (s.mediaId === assetId) {
        await studioDraftDb.deleteTimelineSlot(s.slotIndex);
      }
    }
  }

  public async resolvePlaybackUrl(assetId: string): Promise<string | null> {
    if (this.activeUrls.has(assetId)) {
      return this.activeUrls.get(assetId)!;
    }

    try {
      const item = await studioDraftDb.getVaultMediaItem(assetId);
      if (item && item.blob) {
        const url = URL.createObjectURL(item.blob);
        this.activeUrls.set(assetId, url);
        return url;
      }
    } catch (err) {
      console.warn('Could not resolve playback URL for asset:', assetId, err);
    }

    return null;
  }

  public async resolveThumbnailUrl(assetId: string): Promise<string | null> {
    try {
      const item = await studioDraftDb.getVaultMediaItem(assetId);
      if (item) {
        if (item.thumbnailUrl) return item.thumbnailUrl;
        return this.resolvePlaybackUrl(assetId);
      }
    } catch (err) {
      console.warn('Could not resolve thumbnail for asset:', assetId, err);
    }
    return null;
  }

  public clearAllUrls(): void {
    for (const url of this.activeUrls.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.activeUrls.clear();
  }
}

export const storyboardSyncService = new StoryboardSyncService();
