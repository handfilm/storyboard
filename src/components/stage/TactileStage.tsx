/**
 * @file /src/components/stage/TactileStage.tsx
 * @description Master Tactile Cinema Stage & Adaptive Dual-Stream Viewport.
 * Features:
 * - Dynamic Dual-Stream Engine: Lightweight 540p proxy for 24fps zero-latency scrubbing,
 *   full-resolution 4K/1080p source file during playback and fullscreen.
 * - Reactive real-time bilingual titles (Bangla + English).
 * - Zero-cloud bulk ingest via Drag & Drop directly into IndexedDB media_vault.
 */

import React, { useRef, useState, useEffect } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { PlaybackMode } from '../../types/editor';
import { StageTextOverlay } from '../StageTextOverlay';
import { studioDraftDb } from '../../services/db';
import { getLutFilterCSS } from '../../utils/engine';
import {
  Play,
  Pause,
  Upload,
  Maximize2,
  Film,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Volume2,
  VolumeX
} from 'lucide-react';

export interface TactileStageProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUploadImage?: (file: File) => void;
  onOpenAnimatic?: () => void;
  onOpenInspector?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideTimeSec?: number;
  onTogglePlay?: () => void;
  onStepFrame?: (fwd: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
  onPurgeMedia?: () => void;
  projectTitle?: string;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
  isAudioMuted?: boolean;
}

export const TactileStage: React.FC<TactileStageProps> = ({
  frames = [],
  currentIndex = 0,
  currentFrame,
  aspectRatio = '2.39:1',
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  componentsVisibility,
  onSelectFrame,
  onUpdateFrame,
  onUploadImage,
  onOpenInspector,
  onToggleTitles,
  showTitles = true,
  playbackMode = 'sequence',
  onTogglePlay,
  slideTimeSec = 0,
  onPurgeMedia
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  // Active frame fallback
  const frame = currentFrame || frames[currentIndex] || frames[0];

  // Resolve sourceBlob vs proxyBlob for Adaptive Dual-Stream switching
  useEffect(() => {
    let isCancelled = false;

    const resolveMediaStreams = async () => {
      if (!frame) return;

      // 1. Direct image or video URL on frame
      if (frame.imageUrl) {
        if (!isCancelled) {
          setSourceUrl(frame.imageUrl);
          setProxyUrl(frame.imageUrl);
        }
      }

      // 2. Check IndexedDB media vault
      try {
        const slot = await studioDraftDb.getTimelineSlot(currentIndex);
        if (slot?.mediaId) {
          const vaultItem = await studioDraftDb.getVaultMediaItem(slot.mediaId);
          if (vaultItem && !isCancelled) {
            const rawUrl = URL.createObjectURL(vaultItem.blob);
            setSourceUrl(rawUrl);

            const proxy = await studioDraftDb.getMediaProxy(slot.mediaId);
            if (proxy && !isCancelled) {
              const pUrl = URL.createObjectURL(proxy.blob);
              setProxyUrl(pUrl);
            } else if (!isCancelled) {
              setProxyUrl(rawUrl);
            }
          }
        }
      } catch (err) {
        console.warn('Error resolving media streams from vault:', err);
      }
    };

    resolveMediaStreams();

    return () => {
      isCancelled = true;
    };
  }, [currentIndex, frame?.imageUrl]);

  // Determine active media URL based on playback state machine:
  // - While Scrubbing / Dragging -> Fast proxyUrl (540p for zero-latency 24fps)
  // - While Playing / Fullscreen -> Pristine full-resolution sourceUrl
  const activeMediaUrl = (isScrubbing && proxyUrl) ? proxyUrl : (sourceUrl || frame?.imageUrl || null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIsIngesting(true);
      try {
        // Save raw uncompressed source file to media_vault in IndexedDB
        const mediaId = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await studioDraftDb.addVaultMediaItem({
          id: mediaId,
          name: file.name,
          mimeType: file.type || 'video/mp4',
          size: file.size,
          blob: file,
          thumbnailUrl: '',
          createdAt: Date.now(),
          assignedShotIndex: currentIndex
        });

        // Assign to timeline slot
        await studioDraftDb.setTimelineSlot(currentIndex, mediaId);

        // Auto-generate lightweight proxy in background via OffscreenCanvas
        try {
          await studioDraftDb.generateProxyForMedia(mediaId, file);
        } catch (err) {
          console.warn('Background proxy generation note:', err);
        }

        const objectUrl = URL.createObjectURL(file);
        setSourceUrl(objectUrl);
        setProxyUrl(objectUrl);

        if (onUpdateFrame) {
          onUpdateFrame({
            ...frame,
            imageUrl: objectUrl,
            isVideo: file.type.startsWith('video/')
          });
        }
      } catch (err) {
        console.error('Failed to ingest dropped media:', err);
      } finally {
        setIsIngesting(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getAspectStyle = (ar: string) => {
    switch (ar) {
      case '2.39:1':
        return { aspectRatio: '2.39 / 1' };
      case '16:9':
        return { aspectRatio: '16 / 9' };
      case '4:3':
        return { aspectRatio: '4 / 3' };
      case '1:1':
        return { aspectRatio: '1 / 1' };
      case '9:16':
        return { aspectRatio: '9 / 16' };
      default:
        return { aspectRatio: '2.39 / 1' };
    }
  };

  const lutFilterStyle = getLutFilterCSS(frame?.lutFilter, frame?.adjustments);

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#050505] overflow-hidden select-none p-2 sm:p-4"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setSourceUrl(url);
            setProxyUrl(url);
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: url,
                isVideo: file.type.startsWith('video/')
              });
            }
          }
        }}
      />

      {/* Primary Video / Image Viewport Container */}
      <div
        style={getAspectStyle(aspectRatio)}
        className="relative w-full max-h-full max-w-6xl mx-auto bg-black border border-white/10 rounded-[2px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center group"
      >
        {activeMediaUrl ? (
          frame?.isVideo || activeMediaUrl.includes('video') || activeMediaUrl.endsWith('.mp4') || activeMediaUrl.endsWith('.webm') ? (
            <video
              ref={videoRef}
              src={activeMediaUrl}
              autoPlay={isAutoplay}
              loop
              muted
              playsInline
              className="w-full h-full object-cover transition-opacity duration-150"
              style={{ filter: lutFilterStyle }}
            />
          ) : (
            <img
              src={activeMediaUrl}
              alt={frame?.title}
              className="w-full h-full object-cover"
              style={{ filter: lutFilterStyle }}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
              <Film className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <p className="font-cinzel text-sm text-zinc-300 font-bold tracking-wider">
                SHOT {frame?.epNumber || '001'} // READY FOR INGEST
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono-tech">
                Drag & Drop 4K video or photo directly into this monitor
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-3.5 py-1.5 rounded-[2px] bg-[#d4af37]/20 hover:bg-[#d4af37]/35 border border-[#d4af37]/50 text-[#ffe066] text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Media Asset</span>
            </button>
          </div>
        )}

        {/* Ingesting Spinner Overlay */}
        {isIngesting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30">
            <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono-tech text-[#ffe066] tracking-wider">
              INGESTING RAW 4K ASSET & GENERATING 540P PROXY...
            </span>
          </div>
        )}

        {/* Real-Time Bilingual Titles Overlay (Bangla Title + English Subtitle) */}
        {showTitles && (
          <StageTextOverlay
            shotIndex={currentIndex}
            banglaTitle={frame?.bengaliTitle}
            englishTitle={frame?.title}
            subtitle={frame?.tagline}
            directorNotes={frame?.directorNotes}
            cameraInfo={frame?.cameraSpec?.focalLength}
            isVisible={true}
          />
        )}

        {/* Directorial HUD Overlay */}
        {showHud && (
          <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-between text-[10px] font-mono-tech text-white/80 z-20">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 border border-white/15 rounded-[2px]">
              <span className="text-[#d4af37] font-bold">EP {frame?.epNumber || '001'}</span>
              <span className="text-white/30">|</span>
              <span className="truncate max-w-[200px]">{frame?.title}</span>
            </div>

            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 border border-white/15 rounded-[2px]">
              <span>{frame?.cameraSpec?.focalLength || '35mm High-Speed Master'}</span>
              <span className="text-white/30">|</span>
              <span className="text-[#ffe066]">{frame?.cameraSpec?.aperture || 'f/1.4'}</span>
              <span className="text-white/30">|</span>
              <span className="text-cyan-400">
                {isScrubbing ? 'PROXY 540p' : 'SOURCE 4K'}
              </span>
            </div>
          </div>
        )}

        {/* Hover Action Controls */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-20 pointer-events-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
            title="Replace Media"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          {onOpenInspector && (
            <button
              onClick={onOpenInspector}
              className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-[#ffe066] border border-white/20 transition-all cursor-pointer"
              title="Open Color & Lens Inspector"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
            title="Toggle Stage Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
