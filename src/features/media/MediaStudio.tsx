/**
 * @file /src/features/media/MediaStudio.tsx
 * @description Master Media Asset Vault & Bulk Ingestion Engine for RAWx Storyboard Studio.
 * Integrates High-Performance MediaBinDrawer with Two-Tier IndexedDB and LRU Cache.
 */

import React from 'react';
import { MediaBinDrawer } from '../../components/MediaBinDrawer';
import { useStudioStore } from '../../core/store';
import { storyboardSyncService } from '../../services/storyboardSyncService';

export const MediaStudio: React.FC = () => {
  const { activeShotIndex, updateShot } = useStudioStore();

  const handleAssignToShot = async (assetId: string, shotIndex: number) => {
    const playbackUrl = await storyboardSyncService.resolvePlaybackUrl(assetId);
    if (playbackUrl) {
      updateShot(shotIndex, {
        imageUrl: playbackUrl
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#07070A]">
      <MediaBinDrawer 
        activeShotIndex={activeShotIndex}
        onAssignToShot={handleAssignToShot}
      />
    </div>
  );
};
