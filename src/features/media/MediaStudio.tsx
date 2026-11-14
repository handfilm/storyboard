/**
 * @file /src/features/media/MediaStudio.tsx
 * @description Master Media Asset Vault & Bulk Ingestion Engine for RAWx Storyboard Studio.
 * Integrates High-Performance MediaBinDrawer with Two-Tier IndexedDB and LRU Cache.
 */

import React, { useState } from 'react';
import { HardDrive, Sparkles } from 'lucide-react';
import { MediaBinDrawer } from '../../components/MediaBinDrawer';
import { GeminiFlowStudio } from '../../components/media/GeminiFlowStudio';
import { CinemaToolHUD } from '../../components/ui/CinemaToolHUD';
import { useStudioStore } from '../../core/store';
import { storyboardSyncService } from '../../services/storyboardSyncService';
import { AnthologyFrame } from '../../types/anthology';

type MediaPanelMode = 'VAULT' | 'AI_STUDIO';

export interface MediaStudioProps {
  activeShotIndex?: number;
  currentFrame?: AnthologyFrame | null;
}

export const MediaStudio: React.FC<MediaStudioProps> = ({
  activeShotIndex: propShotIndex,
  currentFrame: propFrame
}) => {
  const { activeShotIndex: storeShotIndex, updateShot, project } = useStudioStore();
  const resolvedShotIndex = propShotIndex !== undefined ? propShotIndex : storeShotIndex;
  const fallbackShot = project?.shots?.[resolvedShotIndex];
  const resolvedFrame: AnthologyFrame | null = propFrame || (fallbackShot ? ({
    id: fallbackShot.id,
    epNumber: fallbackShot.epNumber || `#${String(resolvedShotIndex + 1).padStart(3, '0')}`,
    title: fallbackShot.title || '',
    bengaliTitle: fallbackShot.bengaliTitle || '',
    tagline: fallbackShot.tagline || '',
    directorNotes: fallbackShot.directorNotes || '',
    soundCue: fallbackShot.soundCue || '',
    cameraSpec: fallbackShot.cameraSpec || {
      focalLength: '35mm Anamorphic',
      aperture: 'f/1.4',
      shutter: '1/48s',
      iso: 'ISO 400',
      sensor: 'ARRI LF',
      format: '2.39:1 Scope'
    },
    imageUrl: fallbackShot.imageUrl || '',
    thumbnailUrl: fallbackShot.thumbnailUrl,
    isVideo: fallbackShot.isVideo,
    colorAccent: fallbackShot.colorAccent || '#F59E0B',
    hoverStyle: fallbackShot.hoverStyle || 1,
    lutFilter: fallbackShot.lutFilter || 'cinematic',
    aspectRatio: fallbackShot.aspectRatio || '2.39:1',
    adjustments: fallbackShot.adjustments || {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      bloom: 10,
      grain: 8,
      motionBlur: 0,
      vignette: 10
    },
    slideHoldSec: fallbackShot.durationSeconds || 12,
    tags: fallbackShot.tags || []
  }) : null);
  const [panelMode, setPanelMode] = useState<MediaPanelMode>('VAULT');

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
      {/* Prominent Top Segmented Mode Switcher */}
      <div className="px-3 py-2 bg-[#0B0B0D] border-b border-white/[0.08] shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          <CinemaToolHUD
            title="LOCAL PROJECT MEDIA VAULT"
            en="Manage imported clips, stills, and audio stored locally."
            bn="কীভাবে ব্যবহার করবেন: ডিভাইস থেকে আপলোড করা ভিডিও, ছবি ও অডিও দেখতে VAULT চাপুন।"
            accent="amber"
            side="bottom"
            blockWrapper
          >
            <button
              type="button"
              onClick={() => setPanelMode('VAULT')}
              data-active={panelMode === 'VAULT' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber w-full min-h-[40px] px-2 flex items-center justify-center gap-1.5 text-[10.5px] font-black tracking-wider uppercase"
            >
              <HardDrive className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>VAULT</span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="GEMINI & GOOGLE FLOW AI STUDIO"
            en="Generate images, video frames, and AI cinema plates."
            bn="কীভাবে ব্যবহার করবেন: Gemini ও Google Flow দিয়ে শটের জন্য AI ভিজ্যুয়াল তৈরি করতে চাপুন।"
            accent="cyan"
            side="bottom"
            blockWrapper
          >
            <button
              type="button"
              onClick={() => setPanelMode('AI_STUDIO')}
              data-active={panelMode === 'AI_STUDIO' ? 'true' : 'false'}
              className="cinema-tile cinema-tile-cyan w-full min-h-[40px] px-2 flex items-center justify-center gap-1.5 text-[10.5px] font-black tracking-wider uppercase"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>FLOW AI</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {panelMode === 'VAULT' ? (
          <MediaBinDrawer
            activeShotIndex={resolvedShotIndex}
            onAssignToShot={handleAssignToShot}
          />
        ) : (
          <GeminiFlowStudio
            activeShotIndex={resolvedShotIndex}
            currentFrame={resolvedFrame}
            compactLayout={true}
          />
        )}
      </div>
    </div>
  );
};
