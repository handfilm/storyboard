/**
 * @file /src/components/ReelsView.tsx
 * @description Dedicated Editorial Viewport for 12.0s Reels Mode.
 * 
 * Distinct Editorial Layout Specifications:
 * - Frosted obsidian capsule: `backdrop-blur-md bg-black/60 border border-[#F5A623]/30 rounded-xl px-6 py-4`
 * - Integrated frame counter tag: `[ F001/288 • 12.0s ]` in gold monospace text
 * - Vertical safe-zone positioning:
 *   - 'top': Top Header Pill anchored below upper matte
 *   - 'center': Center Dialogue Card for cinematic subtitle focus
 *   - 'bottom': Floating Bottom Dock (Default) above lower letterbox matte
 * - Pulsing amber progress line along the bottom border of the capsule syncing to the active 12-second block
 * - On-screen 3-position toggle pill inside the viewport
 * - Non-destructive video playback and media ingestion
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SlideDraft, AspectRatioType } from '../types/project';
import { PlaybackMode } from '../types/editor';
import {
  formatDurationPillValue,
  formatFullSMPTETimecode,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../types/storyboard';
import { CadenceSelectorPill } from './controls/CadenceSelectorPill';
import { ComponentVisibility, applyTitleBlockOpacityCssVar } from './ComponentsMatrixPopover';
import { useTitleContainerRepaint } from '../hooks/useTitleContainerRepaint';
import { useStudioStore } from '../core/store';
import { getShotMediaKey } from '../services/handfilmMediaVault';
import { StageMetadataFxBar } from './stage/StageMetadataFxBar';
import { StageCaptionStrip } from './stage/StageCaptionStrip';
import { StageTextOverlay } from './StageTextOverlay';
import {
  Film,
  Upload,
  Play,
  Pause,
  Maximize2,
  Volume2,
  VolumeX,
  Compass,
  ArrowDownCircle
} from 'lucide-react';

export type ReelsSafeZonePosition = 'top' | 'center' | 'bottom';

export interface ReelsViewProps {
  currentSlide?: SlideDraft;
  nextSlide?: SlideDraft;
  currentIndex: number;
  totalSlides: number;
  aspectRatio: AspectRatioType;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  isLooping: boolean;
  slideTimeSec: number;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  onChangeSlideDuration?: (durationSec: number) => void;
  onChangeTargetFps?: (fps: number) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onStepFrame: (forward: boolean) => void;
  onScrubSlideTime: (timeSec: number) => void;
  onScrubGlobalTime?: (globalSec: number) => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onChangeAspectRatio?: (ratio: AspectRatioType) => void;
  onUploadMedia?: (file: File) => void;
  onPurgeMedia?: () => void;
  onOpenCinemaPlayer?: () => void;
  projectTitle?: string;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  defaultSafeZone?: ReelsSafeZonePosition;
  onSelectReel?: (reelIndex: number) => void;
  onJumpToShot?: (shotIndex: number) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  currentSlide,
  currentIndex,
  totalSlides,
  aspectRatio,
  playbackMode,
  isPlaying,
  isLooping,
  slideTimeSec,
  onChangeSlideDuration,
  onChangeTargetFps,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onTogglePlay,
  onToggleLoop,
  onStepFrame,
  onScrubSlideTime,
  onSelectPlaybackMode,
  onUploadMedia,
  onOpenCinemaPlayer,
  showTitles = true,
  componentsVisibility,
  defaultSafeZone = 'bottom',
  onSelectReel,
  onJumpToShot
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reelsTitleContainerRef = useRef<HTMLDivElement | null>(null);

  const storeTitleOpacity = useStudioStore((s) => s.titleConfig?.titleOpacity ?? 1.0);
  const stageScale = useStudioStore((s) => s.stageScale);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const activeReelIndex = useStudioStore((s) => s.activeReelIndex);
  const reelLoopActive = useStudioStore((s) => s.reelLoopActive);
  const selectStoreReel = useStudioStore((s) => s.selectReel);
  const setReelLoopActive = useStudioStore((s) => s.setReelLoopActive);
  const titleOpacity = Math.max(
    0,
    Math.min(1.0, componentsVisibility?.titleOpacity ?? storeTitleOpacity ?? 1.0)
  );

  useEffect(() => {
    applyTitleBlockOpacityCssVar(titleOpacity);
  }, [titleOpacity]);

  const isReelsTitleVisible = componentsVisibility !== undefined
    ? Boolean(
        showTitles &&
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean(showTitles);

  const repaintRevision = useTitleContainerRepaint({
    containerRef: reelsTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: isReelsTitleVisible,
    label: 'ReelsView',
    activeKey: currentIndex
  });

  const [safeZone, setSafeZone] = useState<ReelsSafeZonePosition>(defaultSafeZone);
  const [isMuted, setIsMuted] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const activeDurationSec = getShotDurationSec(currentSlide, 12.0);
  const activeFps = getShotTargetFps(currentSlide, 24);
  const activeTotalFrames = getShotFrameCount(activeDurationSec, activeFps);

  // Dynamic frame index calculation (F001 to F{activeTotalFrames})
  const currentFrame = useMemo(() => {
    const rawFrame = Math.floor(slideTimeSec * activeFps);
    return Math.min(activeTotalFrames, Math.max(1, rawFrame + 1));
  }, [slideTimeSec, activeFps, activeTotalFrames]);

  // Frame tag string: [ F001/288 • 12.0s ] (adapts dynamically to shot duration)
  const frameCounterTag = useMemo(() => {
    const padWidth = Math.max(3, String(activeTotalFrames).length);
    const paddedFrame = String(currentFrame).padStart(padWidth, '0');
    return `[ F${paddedFrame}/${activeTotalFrames} • ${formatDurationPillValue(activeDurationSec)} ]`;
  }, [currentFrame, activeTotalFrames, activeDurationSec]);

  // Progress percentage across active slide duration (0% to 100%)
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.max(0, (slideTimeSec / activeDurationSec) * 100));
  }, [slideTimeSec, activeDurationSec]);

  // Per-shot isolated media source resolution
  const activeShotKey = getShotMediaKey(currentSlide as any, currentIndex);
  const vaultEntry = shotMediaMap?.[activeShotKey] ?? null;
  const mediaUrl = vaultEntry?.url || currentSlide?.remoteUrl || (currentSlide as any)?.imageUrl || '';
  const isVideo = vaultEntry
    ? vaultEntry.type === 'video'
    : Boolean(
        currentSlide?.isVideo ||
        (mediaUrl && (mediaUrl.startsWith('data:video') || /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(mediaUrl)))
      );

  const displayBangla = currentSlide?.titleBn || 'আলোর স্মৃতি';
  const displayEnglish = currentSlide?.titleEn || `SHOT ${String(currentIndex + 1).padStart(3, '0')} // MASTER REEL`;
  const displaySubtitle = currentSlide?.tagline || currentSlide?.directorNotes || '24.0 FPS RAW • MASTER CINE PROJECTION';

  useEffect(() => {
    console.log('[ReelsView] Re-rendering title elements:', {
      isReelsTitleVisible,
      currentIndex,
      displayBangla,
      displayEnglish,
      repaintRevision
    });
  }, [isReelsTitleVisible, currentIndex, displayBangla, displayEnglish, repaintRevision]);

  // Subtle Cross-Dissolve Transition State
  const [outgoingPlate, setOutgoingPlate] = useState<{
    url: string;
    isVideo: boolean;
    panY?: number;
    title?: string;
  } | null>(null);
  const [isCrossDissolving, setIsCrossDissolving] = useState(false);
  const dissolveTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(currentIndex);
  const prevMediaUrlRef = useRef<string>('');

  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      if (prevMediaUrlRef.current && prevMediaUrlRef.current !== mediaUrl) {
        if (dissolveTimerRef.current) {
          clearTimeout(dissolveTimerRef.current);
        }
        setOutgoingPlate({
          url: prevMediaUrlRef.current,
          isVideo: isVideo,
          panY: currentSlide?.panY ?? 50,
          title: displayEnglish
        });
        setIsCrossDissolving(true);

        dissolveTimerRef.current = window.setTimeout(() => {
          setIsCrossDissolving(false);
          setOutgoingPlate(null);
        }, 340);
      }
      prevIndexRef.current = currentIndex;
    }

    if (mediaUrl) {
      prevMediaUrlRef.current = mediaUrl;
    }
  }, [currentIndex, mediaUrl, isVideo, currentSlide?.panY, displayEnglish]);

  useEffect(() => {
    return () => {
      if (dissolveTimerRef.current) {
        clearTimeout(dissolveTimerRef.current);
      }
    };
  }, []);

  // Sync video currentTime with slideTimeSec without unmounting or restarting
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - slideTimeSec) > 0.15) {
      try {
        videoRef.current.currentTime = Math.min(slideTimeSec, videoRef.current.duration || slideTimeSec);
      } catch {}
    }
  }, [slideTimeSec]);

  // Handle play/pause sync with video element
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onUploadMedia) {
      onUploadMedia(e.dataTransfer.files[0]);
    }
  };

  // Safe zone positioning classes
  const getSafeZoneClass = () => {
    switch (safeZone) {
      case 'top':
        return 'top-8 sm:top-12 left-1/2 -translate-x-1/2 items-center text-center';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center text-center';
      case 'bottom':
      default:
        return 'bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 items-center text-center';
    }
  };

  const getStageBoxStyle = (): React.CSSProperties => {
    if (stageScale === 0.7) {
      return {
        width: '70%',
        height: '70%',
        margin: '0 auto'
      };
    }
    return {
      width: '100%',
      height: '100%'
    };
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col justify-between overflow-hidden select-none bg-[#070709]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* External 28px Stage Metadata & FX Bar (Strictly ABOVE the video box) */}
      <StageMetadataFxBar
        shotIndex={currentIndex}
        frameNum={currentFrame}
        totalFrames={activeTotalFrames}
        smpte={formatFullSMPTETimecode(slideTimeSec, activeFps)}
        fps={activeFps}
        streamLabel="REELS BUFFER"
        aspectRatio={aspectRatio}
        playbackMode={playbackMode}
        isTitlesActive={isReelsTitleVisible}
        safeZone={safeZone}
        onChangeSafeZone={setSafeZone}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
        onOpenCinemaPlayer={onOpenCinemaPlayer}
        onUploadMedia={() => fileInputRef.current?.click()}
      />

      {/* Viewport Pure Zero-Overlay Playback Container */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative overflow-hidden p-0">
        <div
          style={getStageBoxStyle()}
          className="relative bg-[#0B0B0F] border-y border-[#1C1C24] overflow-hidden flex items-center justify-center transition-[width,height] duration-200 ease-out"
        >
          
          {/* Outgoing Visual Plate for Cinematic Cross-Dissolve */}
          {outgoingPlate && isCrossDissolving && (
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 animate-cross-dissolve-out overflow-hidden">
              {outgoingPlate.isVideo ? (
                <video
                  src={outgoingPlate.url}
                  muted
                  playsInline
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: `center ${outgoingPlate.panY ?? 50}%` }}
                />
              ) : (
                <img
                  src={outgoingPlate.url}
                  alt={outgoingPlate.title || 'Outgoing'}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  style={{ objectPosition: `center ${outgoingPlate.panY ?? 50}%` }}
                />
              )}
            </div>
          )}

          {/* Active Visual Media Plate */}
          {mediaUrl ? (
            <div
              key={`reels_plate_${currentIndex}`}
              className={`w-full h-full z-10 overflow-hidden ${isCrossDissolving ? 'animate-cross-dissolve' : ''}`}
            >
              {isVideo ? (
                <video
                  key={mediaUrl}
                  ref={videoRef}
                  src={mediaUrl}
                  playsInline
                  muted={isMuted}
                  autoPlay={isPlaying}
                  loop={isLooping}
                  preload="auto"
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ objectPosition: `center ${currentSlide?.panY ?? 50}%` }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={displayEnglish}
                  className="w-full h-full object-cover object-center pointer-events-none"
                  style={{ objectPosition: `center ${currentSlide?.panY ?? 50}%` }}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090D] p-6 text-center">
              <Film className="w-12 h-12 text-[#F5A623]/30 mb-3 animate-pulse" />
              <p className="font-mono text-xs text-zinc-300 font-bold tracking-widest uppercase">
                12.0S REELS HOOK // SHOT {String(currentIndex + 1).padStart(3, '0')}
              </p>
              <p className="font-mono text-[10.5px] text-zinc-500 mt-1 max-w-sm">
                Attach video or 2.39:1 / 9:16 portrait still for sovereign playback.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-1.5 rounded-full bg-[#161622] hover:bg-[#202030] text-[#F5A623] border border-[#F5A623]/40 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Footage</span>
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0] && onUploadMedia) {
                onUploadMedia(e.target.files[0]);
              }
            }}
          />

          {/* Drag & Drop Visual Indicator */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-[#0E0E14]/95 border-2 border-dashed border-[#F5A623] flex flex-col items-center justify-center p-6 z-40 pointer-events-none">
              <ArrowDownCircle className="w-12 h-12 text-[#F5A623] animate-bounce mb-2" />
              <p className="text-xs font-mono font-bold text-[#F5A623] uppercase tracking-widest">
                DROP TO INGEST INTO 12.0S REELS BUFFER
              </p>
            </div>
          )}

          {/* Stage Cinema Title & Subtitle Overlay Inside Reels Frame */}
          {isReelsTitleVisible && (
            <StageTextOverlay
              shotIndex={currentIndex}
              banglaTitle={displayBangla}
              englishTitle={displayEnglish}
              subtitle={displaySubtitle}
              directorNotes={currentSlide?.directorNotes}
              shotType={currentSlide?.shotType}
              isVisible={isReelsTitleVisible}
              componentsVisibility={componentsVisibility}
              className="z-20 pointer-events-none select-none"
            />
          )}

        </div>
      </div>

      {/* External Technical Telemetry Strip (Strictly BELOW the video box) */}
      <StageCaptionStrip
        shotIndex={currentIndex}
        aspectRatio="9:16"
        shotType={currentSlide?.shotType}
        dopamineConfig={currentSlide?.dopamineConfig}
        slideTimeSec={slideTimeSec}
        durationSec={activeDurationSec}
        isTitlesActive={isReelsTitleVisible}
        componentsVisibility={componentsVisibility}
      />

      {/* Bottom Compact Transport Pill for Reels Workspace */}
      <div className="min-h-[48px] w-full px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#1C1C24] bg-[#0A0A0E] text-zinc-400 text-xs font-mono">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-3 py-1 rounded-full bg-[#E50914] hover:bg-[#ff1e2b] text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            <span className="text-[11px]">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer text-[10px]"
            title={`Step -1 Frame (1/${activeFps}s)`}
          >
            -1F
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer text-[10px]"
            title={`Step +1 Frame (1/${activeFps}s)`}
          >
            +1F
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer text-[10px] tabular-nums ${
              isLooping ? 'bg-amber-950/70 text-[#F5A623] border border-[#F5A623]/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Shot Loop"
          >
            LOOP {formatDurationPillValue(activeDurationSec)}
          </button>

          {onChangeSlideDuration && (
            <CadenceSelectorPill
              durationSec={activeDurationSec}
              targetFps={activeFps}
              onChangeDuration={onChangeSlideDuration}
              onChangeTargetFps={onChangeTargetFps}
              onApplyDurationToAll={onApplyDurationToAll}
              isSnapToBeat={isSnapToBeat}
              onToggleSnapToBeat={onToggleSnapToBeat}
              compact
            />
          )}
        </div>

        {/* Elastic Scrub Bar */}
        <div className="flex-1 min-w-[180px] max-w-md mx-2 sm:mx-6 flex items-center gap-2 tabular-nums">
          <span className="text-[10px] text-zinc-500">0.0s</span>
          <input
            type="range"
            min="0"
            max={activeDurationSec}
            step={1 / activeFps}
            value={Math.min(activeDurationSec, slideTimeSec)}
            onChange={(e) => onScrubSlideTime(parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F5A623]"
          />
          <span className="text-[10px] text-[#F5A623] font-bold">
            {formatDurationPillValue(activeDurationSec)}
          </span>
        </div>

        {/* 10x10 Modular Reel Block Selector + Aspect Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden lg:flex items-center gap-0.5 bg-black/60 border border-white/10 rounded-md px-1 py-0.5">
            {Array.from({ length: 10 }, (_, rIdx) => {
              const isSelectedReel = reelLoopActive && activeReelIndex === rIdx;
              const reelLabel = String(rIdx + 1).padStart(2, '0');
              return (
                <button
                  key={`reel-pill-${rIdx}`}
                  type="button"
                  onClick={() => {
                    selectStoreReel(rIdx);
                    setReelLoopActive(true);
                    onSelectPlaybackMode('sequence');
                    const targetShotIdx = Math.min(Math.max(0, totalSlides - 1), rIdx * 10);
                    if (onSelectReel) {
                      onSelectReel(rIdx);
                    } else if (onJumpToShot) {
                      onJumpToShot(targetShotIdx);
                    }
                  }}
                  title={`REEL ${reelLabel}: Shots ${rIdx * 10 + 1}–${rIdx * 10 + 10}`}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer tabular-nums ${
                    isSelectedReel
                      ? 'bg-[#E50914] text-white'
                      : 'text-zinc-400 hover:text-amber-300 hover:bg-white/10'
                  }`}
                >
                  {reelLabel}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setReelLoopActive(false);
                onSelectPlaybackMode('sequence');
              }}
              title="Play All 100 Shots Continuously (MASTER)"
              className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                !reelLoopActive
                  ? 'bg-amber-500 text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              ALL
            </button>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] border border-zinc-700">
            {aspectRatio}
          </span>
        </div>
      </div>
    </div>
  );
};
