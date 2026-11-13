/**
 * @file /src/components/ReelsView.tsx
 * @description Side-by-Side 9:16 Vertical Cinema Viewport (70%) + Crazy 12-Second Speed Reels Engine Deck (30%).
 *
 * Capabilities:
 * - Left/Center Stage (70% width, full height):
 *   - 9:16 Vertical Cinema Viewport (1080x1920 safe-zone guides for Reels / Shorts / TikTok)
 *   - Interactive pointer drag-to-reframe (X/Y focal point pan & zoom per shot)
 *   - Hardware <video> sync with speed-ramp modulation, inPointMs offset, and readyState<2 poster fallback
 *   - Real-time Beat-Drop 2-frame Vantablack flash cuts, chromatic aberration pulse & kinetic beat title slam
 * - Right Deck (30% width):
 *   1. 1-Click "12s HYPER-REEL" Auto-Packer (exact 12.00s / 288 frames @ 24fps)
 *   2. Velocity Speed-Ramp Presets (Linear, Bullet-Time, Whip-Cut, Heartbeat Pulse) + Apply All
 *   3. Beat-Drop & Flash-Cut Generator (0.5s, 1.0s, 1.5s, 2.0s intervals) + Apply All
 *   4. Auto Smart-Crop 9:16 Subject Lock (LEFT, CENTER, RIGHT, AUTO 1.8x) + Zoom slider
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { SlideDraft, AspectRatioType } from '../types/project';
import { AnthologyFrame, SmartCropMode, SpeedRampPreset } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import {
  calculateMasterSequenceDuration,
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
import { getShotMediaKey, resolveShotMediaEntry } from '../services/handfilmMediaVault';
import { isSvgPlaceholderUrl, isVideoSourceUrl } from '../services/thumbnailEngine';
import { videoCacheService } from '../services/videoCacheService';
import { syncVideoCurrentTimeWithFastSeek } from '../utils/playbackClock';
import { StageMetadataFxBar } from './stage/StageMetadataFxBar';
import { StageTextOverlay } from './StageTextOverlay';
import { eventBus } from '../core/eventBus';
import {
  BEAT_INTERVAL_OPTIONS,
  HYPER_REEL_FPS,
  HYPER_REEL_TOTAL_FRAMES,
  SMART_CROP_MODES,
  SPEED_RAMP_PRESETS,
  computeSmartCropRect,
  evaluateBeatDropFx,
  evaluateSpeedRampSourceTime,
  getSpeedRampInstantRate,
  pack12sHyperReel
} from '../utils/speedReelsEngine';
import {
  Film,
  Upload,
  Play,
  Pause,
  Zap,
  Flame,
  Crop,
  Move,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowDownCircle,
  Check
} from 'lucide-react';

export type ReelsSafeZonePosition = 'top' | 'center' | 'bottom';

export interface ReelsViewProps {
  slides?: SlideDraft[];
  frames?: AnthologyFrame[];
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
  onOpenExport?: () => void;
  onUpdateSlide?: (index: number, partial: Partial<SlideDraft>) => void;
  onCommitNleEdit?: (nextSlides: SlideDraft[], nextActiveIndex: number, nextLocalTimeSec: number) => void;
  onSelectSlide?: (index: number) => void;
  projectTitle?: string;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  defaultSafeZone?: ReelsSafeZonePosition;
  onSelectReel?: (reelIndex: number) => void;
  onJumpToShot?: (shotIndex: number) => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  slides = [],
  currentSlide,
  currentIndex,
  totalSlides,
  aspectRatio,
  playbackMode,
  isPlaying,
  isLooping,
  slideTimeSec,
  playbackSpeed = 1.0,
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
  onOpenExport,
  onUpdateSlide,
  onCommitNleEdit,
  onSelectSlide,
  showTitles = true,
  componentsVisibility,
  defaultSafeZone = 'bottom',
  onJumpToShot
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalStageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reelsTitleContainerRef = useRef<HTMLDivElement | null>(null);

  const storeTitleOpacity = useStudioStore((s) => s.titleConfig?.titleOpacity ?? 1.0);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
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

  useTitleContainerRepaint({
    containerRef: reelsTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: isReelsTitleVisible,
    label: 'ReelsView',
    activeKey: currentIndex
  });

  const [safeZone, setSafeZone] = useState<ReelsSafeZonePosition>(defaultSafeZone);
  const [showSafeZoneGuides, setShowSafeZoneGuides] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [deckNotice, setDeckNotice] = useState<string | null>(null);

  // Interactive Pointer Drag-to-Reframe State
  const isReframingRef = useRef<{
    startX: number;
    startY: number;
    basePanX: number;
    basePanY: number;
  } | null>(null);

  const activeSlideList = slides.length > 0 ? slides : currentSlide ? [currentSlide] : [];
  const activeSlide = activeSlideList[currentIndex] || currentSlide;

  const activeDurationSec = getShotDurationSec(activeSlide, 12.0);
  const activeFps = getShotTargetFps(activeSlide, 24);
  const activeTotalFrames = getShotFrameCount(activeDurationSec, activeFps);

  const totalSequenceSec = useMemo(
    () => calculateMasterSequenceDuration(activeSlideList),
    [activeSlideList]
  );
  const totalSequenceFrames = useMemo(
    () => Math.round(totalSequenceSec * HYPER_REEL_FPS),
    [totalSequenceSec]
  );

  const currentFrame = useMemo(() => {
    const rawFrame = Math.floor(slideTimeSec * activeFps);
    return Math.min(activeTotalFrames, Math.max(1, rawFrame + 1));
  }, [slideTimeSec, activeFps, activeTotalFrames]);

  // Per-shot isolated media source resolution
  const activeShotKey = getShotMediaKey(activeSlide as any, currentIndex);
  const vaultEntry = shotMediaMap?.[activeShotKey] ?? null;
  const rawMediaUrl = vaultEntry?.url || activeSlide?.remoteUrl || (activeSlide as any)?.imageUrl || '';
  const mediaUrl = rawMediaUrl ? (videoCacheService.getFastUrlSync(rawMediaUrl) || rawMediaUrl) : '';
  const isVideo = vaultEntry
    ? vaultEntry.type === 'video'
    : Boolean(
        activeSlide?.isVideo ||
        (rawMediaUrl && (rawMediaUrl.startsWith('data:video') || /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(rawMediaUrl)))
      );
  const fallbackPoster =
    activeSlide?.thumbnailUrl && !isSvgPlaceholderUrl(activeSlide.thumbnailUrl) && !isVideoSourceUrl(activeSlide.thumbnailUrl)
      ? activeSlide.thumbnailUrl
      : '';

  useEffect(() => {
    setIsVideoReady(false);
  }, [mediaUrl, currentIndex]);

  useEffect(() => {
    if (rawMediaUrl && isVideo) {
      void videoCacheService.warmVideoUrl(rawMediaUrl, { promoteSmallRemoteBlob: true });
    }
  }, [rawMediaUrl, isVideo]);

  const showToast = useCallback((msg: string) => {
    setDeckNotice(msg);
    window.setTimeout(() => {
      setDeckNotice((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  // Resolve Smart-Crop / Drag-to-Reframe geometry
  const cropGeom = computeSmartCropRect(1920, 804, 1080, 1920, {
    panX: activeSlide?.panX,
    panY: activeSlide?.panY,
    reframeZoom: activeSlide?.reframeZoom,
    smartCropMode: activeSlide?.smartCropMode
  });

  // Sync video currentTime when paused (with Speed Ramp integration!) & handle playback rate modulation
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isVideo || !mediaUrl) return;

    const targetSourceSec = evaluateSpeedRampSourceTime(activeSlide, slideTimeSec);
    if (!isPlaying) {
      if (!vid.paused) vid.pause();
      if (vid.readyState >= 1) {
        syncVideoCurrentTimeWithFastSeek(vid, targetSourceSec, 0.002);
      }
    } else {
      const rampFactor = getSpeedRampInstantRate(activeSlide?.speedRampPreset, slideTimeSec, activeDurationSec);
      const baseSpd = activeSlide?.playbackSpeed && activeSlide.playbackSpeed > 0 ? activeSlide.playbackSpeed : 1.0;
      const targetRate = Math.max(0.25, Math.min(4.0, baseSpd * (playbackSpeed || 1.0) * rampFactor));
      if (Math.abs(vid.playbackRate - targetRate) > 0.03) {
        vid.playbackRate = targetRate;
      }
      if (vid.paused) {
        vid.play().catch(() => {});
      }
    }
  }, [isPlaying, slideTimeSec, isVideo, mediaUrl, activeSlide, activeDurationSec, playbackSpeed]);

  // Real-time Speed-Ramp playback rate envelope when playing
  useEffect(() => {
    if (!isPlaying || !isVideo || !activeSlide?.speedRampPreset || activeSlide.speedRampPreset === 'NONE') {
      return;
    }
    let rafId = 0;
    const baseSpd = activeSlide.playbackSpeed && activeSlide.playbackSpeed > 0 ? activeSlide.playbackSpeed : 1.0;
    const tick = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused && vid.readyState >= 2) {
        const curLocal = Math.max(0, Math.min(activeDurationSec, vid.currentTime - ((activeSlide.inPointMs ?? 0) / 1000)));
        const factor = getSpeedRampInstantRate(activeSlide.speedRampPreset, curLocal, activeDurationSec);
        const rate = Math.max(0.25, Math.min(4.0, baseSpd * (playbackSpeed || 1.0) * factor));
        if (Math.abs(vid.playbackRate - rate) > 0.04) {
          vid.playbackRate = rate;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isVideo, activeSlide, activeDurationSec, playbackSpeed]);

  // Interactive Pointer Drag-to-Reframe handlers inside 9:16 frame
  const handleReframePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isReframingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      basePanX: cropGeom.objectPositionX,
      basePanY: cropGeom.objectPositionY
    };
  };

  const handleReframePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = isReframingRef.current;
    const box = verticalStageRef.current;
    if (!drag || !box || !onUpdateSlide) return;
    const rect = box.getBoundingClientRect();
    const dxPct = ((e.clientX - drag.startX) / Math.max(100, rect.width)) * -100;
    const dyPct = ((e.clientY - drag.startY) / Math.max(100, rect.height)) * -100;
    const nextPanX = Math.round(Math.max(0, Math.min(100, drag.basePanX + dxPct)));
    const nextPanY = Math.round(Math.max(0, Math.min(100, drag.basePanY + dyPct)));
    onUpdateSlide(currentIndex, {
      panX: nextPanX,
      panY: nextPanY,
      smartCropMode: 'CUSTOM'
    });
  };

  const handleReframePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isReframingRef.current) {
      isReframingRef.current = null;
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  // Drag & Drop File Ingestion
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files?.[0] && onUploadMedia) {
      onUploadMedia(e.dataTransfer.files[0]);
    }
  };

  // Toolkit Actions
  const handlePack12sHyperReel = () => {
    if (activeSlideList.length === 0) return;
    const packed = pack12sHyperReel(activeSlideList, shotMediaMap);
    if (onCommitNleEdit) {
      onCommitNleEdit(packed.slides, 0, 0);
    } else if (onUpdateSlide) {
      packed.slides.forEach((s, idx) => onUpdateSlide(idx, s));
    }
    onSelectPlaybackMode('sequence');
    showToast(`12s HYPER-REEL PACKED · ${packed.selectedCount} CUTS (288F)`);
  };

  const handleApplySpeedRampShot = (preset: SpeedRampPreset) => {
    onUpdateSlide?.(currentIndex, { speedRampPreset: preset });
    showToast(`SHOT ${String(currentIndex + 1).padStart(3, '0')} RAMP: ${preset.replace('_', ' ')}`);
  };

  const handleApplySpeedRampAll = () => {
    const preset = activeSlide?.speedRampPreset || 'WHIP_CUT';
    if (onCommitNleEdit && activeSlideList.length > 0) {
      const updated = activeSlideList.map((s) => ({ ...s, speedRampPreset: preset }));
      onCommitNleEdit(updated, currentIndex, slideTimeSec);
      showToast(`APPLIED ${preset.replace('_', ' ')} TO ALL ${updated.length} CUTS`);
    }
  };

  const handleApplySmartCropPreset = (mode: SmartCropMode) => {
    const preset = SMART_CROP_MODES.find((m) => m.id === mode);
    if (!preset) return;
    onUpdateSlide?.(currentIndex, {
      smartCropMode: preset.id,
      panX: preset.panX,
      panY: preset.panY,
      reframeZoom: preset.zoom
    });
    showToast(`SMART-CROP: ${preset.label}`);
  };

  const handleApplySmartCropAll = () => {
    const mode = activeSlide?.smartCropMode || 'AUTO_ZOOM';
    const px = cropGeom.objectPositionX;
    const py = cropGeom.objectPositionY;
    const zm = cropGeom.zoom;
    if (onCommitNleEdit && activeSlideList.length > 0) {
      const updated = activeSlideList.map((s) => ({
        ...s,
        smartCropMode: mode,
        panX: px,
        panY: py,
        reframeZoom: zm
      }));
      onCommitNleEdit(updated, currentIndex, slideTimeSec);
      showToast(`9:16 SUBJECT LOCK APPLIED TO ALL ${updated.length} CUTS`);
    }
  };

  const handleToggleBeatFx = (patch: Partial<SlideDraft>, applyAll = false) => {
    if (applyAll && onCommitNleEdit && activeSlideList.length > 0) {
      const updated = activeSlideList.map((s) => ({ ...s, ...patch }));
      onCommitNleEdit(updated, currentIndex, slideTimeSec);
      showToast(`BEAT FX APPLIED TO ALL ${updated.length} CUTS`);
    } else {
      onUpdateSlide?.(currentIndex, patch);
    }
  };

  const handleSelectShot = (idx: number) => {
    if (onSelectSlide) onSelectSlide(idx);
    else onJumpToShot?.(idx);
  };

  // Subscribe to Top Bar FEATURES mega-dropdown triggers
  const pack12sRef = useRef(handlePack12sHyperReel);
  pack12sRef.current = handlePack12sHyperReel;
  const toggleBeatFxRef = useRef(handleToggleBeatFx);
  toggleBeatFxRef.current = handleToggleBeatFx;
  const smartCropPresetRef = useRef(handleApplySmartCropPreset);
  smartCropPresetRef.current = handleApplySmartCropPreset;
  const activeSlideRef = useRef(activeSlide);
  activeSlideRef.current = activeSlide;

  useEffect(() => {
    const unsubPack = eventBus.on('reels:pack_12s', () => {
      pack12sRef.current();
    });
    const unsubBeat = eventBus.on('reels:toggle_beat_fx', () => {
      const cur = activeSlideRef.current;
      const nextFlash = !(cur?.flashCutEnabled && cur?.beatDropEnabled);
      toggleBeatFxRef.current({
        flashCutEnabled: nextFlash,
        beatDropEnabled: nextFlash,
        flashCutIntervalSec: cur?.flashCutIntervalSec ?? 1.0
      });
    });
    const unsubCrop = eventBus.on('reels:smart_crop_916', () => {
      smartCropPresetRef.current('AUTO_ZOOM');
    });
    return () => {
      unsubPack();
      unsubBeat();
      unsubCrop();
    };
  }, []);

  const displayBangla = activeSlide?.titleBn || 'আলোর স্মৃতি';
  const displayEnglish = activeSlide?.titleEn || `SHOT ${String(currentIndex + 1).padStart(3, '0')} // MASTER REEL`;
  const displaySubtitle = activeSlide?.tagline || activeSlide?.directorNotes || '24.0 FPS RAW • 9:16 VERTICAL MASTER';

  const beatFx = evaluateBeatDropFx(activeSlide, slideTimeSec, activeFps);
  const progressPercent = Math.min(100, Math.max(0, (slideTimeSec / Math.max(0.01, activeDurationSec)) * 100));

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col overflow-hidden select-none bg-[#050505] text-zinc-200 font-mono"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
      }}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0] && onUploadMedia) {
            onUploadMedia(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* External 28px Metadata Bar */}
      <StageMetadataFxBar
        shotIndex={currentIndex}
        frameNum={currentFrame}
        totalFrames={activeTotalFrames}
        smpte={formatFullSMPTETimecode(slideTimeSec, activeFps)}
        fps={activeFps}
        streamLabel="9:16 REEL ENGINE"
        aspectRatio="9:16"
        playbackMode={playbackMode}
        isTitlesActive={isReelsTitleVisible}
        safeZone={safeZone}
        onChangeSafeZone={setSafeZone}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
        onOpenCinemaPlayer={onOpenCinemaPlayer}
        onUploadMedia={() => fileInputRef.current?.click()}
      />

      {/* Side-by-Side Split-Screen Studio Architecture (70% 9:16 Stage + 30% Speed Reels Deck) */}
      <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / CENTER STAGE (70% Width, Full Height) */}
        <div className="flex-1 lg:w-[70%] min-h-0 flex flex-col bg-[#050505] border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
          {/* Vertical 9:16 Cinema Viewport Area */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-3 relative overflow-hidden">
            {/* Interactive 9:16 Frame (`1080x1920` proportion, drag-to-reframe) */}
            <div
              ref={verticalStageRef}
              data-testid="reels-916-viewport"
              onPointerDown={handleReframePointerDown}
              onPointerMove={handleReframePointerMove}
              onPointerUp={handleReframePointerUp}
              onPointerCancel={handleReframePointerUp}
              className="relative h-full max-h-full aspect-[9/16] max-w-full bg-black border border-white/20 overflow-hidden flex items-center justify-center cursor-move shadow-[0_0_40px_rgba(0,0,0,0.9)]"
              title="Drag inside frame to reframe X/Y subject crop"
            >
              {/* Active Media Layer with Smart-Crop Object Position & Reframe Zoom */}
              {mediaUrl ? (
                <div
                  className="w-full h-full overflow-hidden"
                  style={{
                    transform: `scale(${cropGeom.zoom})`,
                    transformOrigin: `${cropGeom.objectPositionX}% ${cropGeom.objectPositionY}%`
                  }}
                >
                  {isVideo ? (
                    <>
                      {(!isVideoReady && fallbackPoster) && (
                        <img
                          src={fallbackPoster}
                          alt={displayEnglish}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[1]"
                          style={{
                            objectPosition: `${cropGeom.objectPositionX}% ${cropGeom.objectPositionY}%`
                          }}
                        />
                      )}
                      <video
                        key={`reels_vid_${currentIndex}_${mediaUrl}`}
                        ref={videoRef}
                        src={mediaUrl}
                        crossOrigin="anonymous"
                        poster={fallbackPoster || undefined}
                        muted={isMuted}
                        loop={isLooping}
                        playsInline
                        preload="auto"
                        onLoadedData={() => setIsVideoReady(true)}
                        onCanPlay={() => setIsVideoReady(true)}
                        className="w-full h-full object-cover pointer-events-none z-[2]"
                        style={{
                          objectPosition: `${cropGeom.objectPositionX}% ${cropGeom.objectPositionY}%`,
                          opacity: isVideoReady || !fallbackPoster ? 1 : 0,
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden'
                        }}
                      />
                    </>
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={displayEnglish}
                      className="w-full h-full object-cover pointer-events-none"
                      style={{
                        objectPosition: `${cropGeom.objectPositionX}% ${cropGeom.objectPositionY}%`
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#08090C] p-6 text-center">
                  <Film className="w-10 h-10 text-[#F5A623]/40 mb-3" />
                  <p className="text-[11px] text-zinc-200 font-bold tracking-widest uppercase">
                    9:16 REELS SLOT · SH{String(currentIndex + 1).padStart(3, '0')}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[220px]">
                    Drop vertical or 2.39:1 horizontal video to auto-crop in 9:16.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-3 py-1.5 bg-[#F5A623] text-black text-[11px] font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>UPLOAD FOOTAGE</span>
                  </button>
                </div>
              )}

              {/* Beat-Drop Chromatic Aberration Edge Pulse + 2-Frame Vantablack Flash Cut */}
              {beatFx.chromaticOffsetPx > 0.5 && (
                <div
                  className="absolute inset-0 pointer-events-none z-[15]"
                  style={{
                    boxShadow: `inset ${beatFx.chromaticOffsetPx}px 0 0 rgba(229,9,20,0.55), inset -${beatFx.chromaticOffsetPx}px 0 0 rgba(34,211,238,0.55)`
                  }}
                />
              )}
              {beatFx.isFlashCutFrame && (
                <div className="absolute inset-0 bg-[#050505] pointer-events-none z-[18]" />
              )}

              {/* Kinetic Title Overlay with Beat Slam Scale */}
              {isReelsTitleVisible && (
                <div
                  className="absolute inset-0 pointer-events-none z-20 transition-transform duration-75"
                  style={{
                    transform: `scale(${beatFx.beatSlamScale})`
                  }}
                >
                  <StageTextOverlay
                    shotIndex={currentIndex}
                    banglaTitle={displayBangla}
                    englishTitle={displayEnglish}
                    subtitle={displaySubtitle}
                    directorNotes={activeSlide?.directorNotes}
                    shotType={activeSlide?.shotType}
                    isVisible={isReelsTitleVisible}
                    componentsVisibility={componentsVisibility}
                    className="z-20 pointer-events-none select-none"
                  />
                </div>
              )}

              {/* 1080x1920 Safe-Zone Guides (Reels / TikTok / Shorts UI clearance) */}
              {showSafeZoneGuides && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  {/* Top Notch / Story bar zone */}
                  <div className="absolute top-0 inset-x-0 h-[12%] border-b border-dashed border-[#F5A623]/35 bg-black/15 flex items-end justify-between px-2 pb-1 text-[8px] text-[#F5A623]/75">
                    <span>SAFE TOP 12%</span>
                    <span>1080×1920</span>
                  </div>
                  {/* Right-Side Engagement Icons Clearance */}
                  <div className="absolute right-0 top-[42%] bottom-[18%] w-[15%] border-l border-dashed border-cyan-400/30 bg-cyan-950/10 flex items-center justify-center">
                    <span className="text-[8px] text-cyan-300/70 -rotate-90 whitespace-nowrap">UI ICONS</span>
                  </div>
                  {/* Bottom Caption & CTA Safe Zone */}
                  <div className="absolute bottom-0 inset-x-0 h-[18%] border-t border-dashed border-[#F5A623]/35 bg-black/20 flex items-start justify-between px-2 pt-1 text-[8px] text-[#F5A623]/75">
                    <span>REELS / TIKTOK SAFE ZONE</span>
                    <span>CROP {Math.round(cropGeom.objectPositionX)}%/{Math.round(cropGeom.objectPositionY)}%</span>
                  </div>
                </div>
              )}

              {/* Top-Right Quick Overlay Controls inside frame */}
              <div className="absolute top-2 right-2 z-40 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSafeZoneGuides((g) => !g)}
                  className="px-1.5 py-0.5 bg-black/80 border border-white/20 text-[9px] text-zinc-200 hover:text-[#F5A623] flex items-center gap-1 cursor-pointer"
                  title="Toggle 9:16 Platform Safe-Zone Guides"
                >
                  {showSafeZoneGuides ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  <span>GUIDES</span>
                </button>
              </div>

              {/* Drop Indicator */}
              {isDraggingOver && (
                <div className="absolute inset-0 bg-black/90 border-2 border-dashed border-[#F5A623] flex flex-col items-center justify-center p-4 z-50 pointer-events-none">
                  <ArrowDownCircle className="w-10 h-10 text-[#F5A623] mb-2" />
                  <p className="text-[11px] font-bold text-[#F5A623] uppercase tracking-widest text-center">
                    DROP CLIP INTO 9:16 REELS SLOT
                  </p>
                </div>
              )}

              {/* Bottom 1px Progress Line */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/70 z-40 pointer-events-none">
                <div className="h-full bg-[#E50914]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {/* Floating Left Telemetry HUD next to 9:16 Viewport */}
            <div className="hidden xl:flex flex-col gap-1.5 absolute left-3 top-3 text-[10px] text-zinc-400 pointer-events-none tabular-nums">
              <div className="bg-[#0B0C10] border border-white/10 px-2 py-1">
                <span className="text-[#F5A623] font-bold block">FRAME F{String(currentFrame).padStart(3, '0')}/{activeTotalFrames}</span>
                <span>CLIP {activeDurationSec.toFixed(2)}s</span>
              </div>
              <div className="bg-[#0B0C10] border border-white/10 px-2 py-1">
                <span className="text-white font-bold block">CROP X:{Math.round(cropGeom.objectPositionX)}% Y:{Math.round(cropGeom.objectPositionY)}%</span>
                <span className="text-cyan-300">ZOOM {cropGeom.zoom.toFixed(2)}x</span>
              </div>
              <div className="bg-[#0B0C10] border border-white/10 px-2 py-1">
                <span className="text-zinc-200 font-bold block">RAMP: {activeSlide?.speedRampPreset || 'NONE'}</span>
                <span>{activeSlide?.flashCutEnabled ? `2F FLASH @ ${activeSlide.flashCutIntervalSec ?? 1.0}s` : 'STRAIGHT CUT'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Compact Sequence Shot Strip + Transport */}
          <div className="shrink-0 bg-[#08090C] border-t border-white/10 flex flex-col">
            {/* Compact Sequence Cut Strip */}
            <div className="h-11 px-2 py-1 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
              <span className="text-[9px] text-zinc-500 font-bold px-1 shrink-0 tabular-nums">
                SEQ {totalSequenceSec.toFixed(2)}s ({totalSequenceFrames}F)
              </span>
              {activeSlideList.map((s, idx) => {
                const dur = getShotDurationSec(s, 12.0);
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={s.id || idx}
                    type="button"
                    onClick={() => handleSelectShot(idx)}
                    className={`px-2 py-1 text-[10px] font-bold border shrink-0 flex items-center gap-1 cursor-pointer tabular-nums transition-colors ${
                      isActive
                        ? 'bg-[#F5A623] border-[#F5A623] text-black'
                        : 'bg-[#0E1016] border-white/10 text-zinc-300 hover:border-white/35'
                    }`}
                  >
                    <span>#{String(idx + 1).padStart(2, '0')}</span>
                    <span className={isActive ? 'text-black/80' : 'text-[#F5A623]'}>{dur.toFixed(1)}s</span>
                  </button>
                );
              })}
            </div>

            {/* Transport Row */}
            <div className="h-10 px-3 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="px-3 py-1 bg-[#E50914] hover:bg-[#ff1e2b] text-white font-black text-[10px] flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onStepFrame(false)}
                  className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-zinc-200 cursor-pointer"
                >
                  -1F
                </button>
                <button
                  type="button"
                  onClick={() => onStepFrame(true)}
                  className="px-1.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-bold text-zinc-200 cursor-pointer"
                >
                  +1F
                </button>
                <button
                  type="button"
                  onClick={onToggleLoop}
                  className={`px-2 py-1 border text-[10px] font-bold cursor-pointer tabular-nums ${
                    isLooping
                      ? 'bg-amber-950/60 border-[#F5A623]/50 text-[#F5A623]'
                      : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
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

              <div className="flex-1 max-w-sm flex items-center gap-2 tabular-nums">
                <span className="text-[10px] text-zinc-500">0.0s</span>
                <input
                  type="range"
                  min="0"
                  max={activeDurationSec}
                  step={1 / activeFps}
                  value={Math.min(activeDurationSec, slideTimeSec)}
                  onChange={(e) => onScrubSlideTime(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-[#F5A623]"
                />
                <span className="text-[10px] text-[#F5A623] font-bold">
                  {formatDurationPillValue(activeDurationSec)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT / BOTTOM SPEED-REELS CONTROL DECK (30% Width) */}
        <aside className="w-full lg:w-[30%] lg:min-w-[320px] lg:max-w-[440px] bg-[#08090C] flex flex-col overflow-y-auto shrink-0">
          {/* Deck Header */}
          <div className="px-3.5 py-2.5 bg-[#0B0C10] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div>
              <h2 className="text-[11px] font-black tracking-widest text-white uppercase">
                CRAZY 12s SPEED REELS DECK
              </h2>
              <p className="text-[9px] text-zinc-400 tabular-nums">
                MASTER REEL: {totalSequenceSec.toFixed(2)}s · {totalSequenceFrames}F @ 24FPS
              </p>
            </div>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-black border tabular-nums ${
                Math.abs(totalSequenceSec - 12.0) < 0.06
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-white/5 border-white/15 text-[#F5A623]'
              }`}
            >
              {Math.abs(totalSequenceSec - 12.0) < 0.06 ? '12.00s LOCKED' : `${activeSlideList.length} CUTS`}
            </span>
          </div>

          {deckNotice && (
            <div className="mx-3 mt-2.5 px-2.5 py-1.5 bg-[#F5A623]/15 border border-[#F5A623]/60 text-[#FFE066] text-[10px] font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{deckNotice}</span>
            </div>
          )}

          <div className="p-3 space-y-3 flex-1">
            {/* 1. 1-CLICK "12s HYPER-REEL" AUTO-PACKER */}
            <section className="p-2.5 bg-[#0C0D12] border border-[#E50914]/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>1. 12s HYPER-REEL AUTO-PACKER</span>
                </span>
                <span className="text-[9px] text-zinc-400 tabular-nums">{HYPER_REEL_TOTAL_FRAMES}F / 24FPS</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-snug">
                Ranks loaded cuts by visual energy and packs a viral 12.00s cadence: 1.5s Hook, rapid middle cuts, and 2.5s Climax Slam.
              </p>
              <button
                type="button"
                data-testid="reels-pack-12s-btn"
                onClick={handlePack12sHyperReel}
                className="w-full py-2 px-3 bg-[#E50914] hover:bg-[#ff1e2b] text-white font-black text-[11px] tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>PACK 12s HYPER-REEL ({activeSlideList.length >= 10 ? '10 CUTS' : `${activeSlideList.length} CUTS`})</span>
              </button>
            </section>

            {/* 2. VELOCITY SPEED-RAMP PRESETS */}
            <section className="p-2.5 bg-[#0C0D12] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>2. VELOCITY SPEED-RAMP</span>
                </span>
                <button
                  type="button"
                  onClick={handleApplySpeedRampAll}
                  className="text-[9px] font-bold text-[#F5A623] hover:underline cursor-pointer"
                >
                  APPLY ALL
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {SPEED_RAMP_PRESETS.map((preset) => {
                  const active = (activeSlide?.speedRampPreset || 'NONE') === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplySpeedRampShot(preset.id)}
                      className={`p-1.5 border text-left cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1D160B] border-[#F5A623] text-white'
                          : 'bg-black/60 border-white/10 text-zinc-400 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <div className={`text-[10px] font-black ${active ? 'text-[#F5A623]' : 'text-zinc-200'}`}>
                        {preset.label}
                      </div>
                      <div className="text-[9px] text-zinc-500">{preset.curveSummary}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. BEAT-DROP & FLASH-CUT GENERATOR */}
            <section className="p-2.5 bg-[#0C0D12] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3. BEAT-DROP & FLASH CUTS</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleToggleBeatFx(
                      {
                        flashCutEnabled: activeSlide?.flashCutEnabled ?? true,
                        beatDropEnabled: activeSlide?.beatDropEnabled ?? true,
                        flashCutIntervalSec: activeSlide?.flashCutIntervalSec ?? 1.0
                      },
                      true
                    )
                  }
                  className="text-[9px] font-bold text-cyan-300 hover:underline cursor-pointer"
                >
                  APPLY ALL
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-testid="reels-flash-cut-toggle"
                  onClick={() =>
                    handleToggleBeatFx({
                      flashCutEnabled: !activeSlide?.flashCutEnabled,
                      beatDropEnabled: !activeSlide?.flashCutEnabled || Boolean(activeSlide?.beatDropEnabled)
                    })
                  }
                  className={`py-1.5 px-2 border text-[10px] font-bold cursor-pointer ${
                    activeSlide?.flashCutEnabled
                      ? 'bg-[#E50914]/20 border-[#E50914] text-white'
                      : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  2F FLASH: {activeSlide?.flashCutEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleBeatFx({ beatDropEnabled: !activeSlide?.beatDropEnabled })}
                  className={`py-1.5 px-2 border text-[10px] font-bold cursor-pointer ${
                    activeSlide?.beatDropEnabled
                      ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200'
                      : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  BEAT SLAM: {activeSlide?.beatDropEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-1 pt-0.5">
                <span className="text-[9px] text-zinc-400 shrink-0">INTERVAL:</span>
                <div className="grid grid-cols-4 gap-1 flex-1">
                  {BEAT_INTERVAL_OPTIONS.map((sec) => {
                    const active = Math.abs((activeSlide?.flashCutIntervalSec ?? 1.0) - sec) < 0.05;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          handleToggleBeatFx({
                            flashCutIntervalSec: sec,
                            beatDropEnabled: true
                          })
                        }
                        className={`py-1 text-[10px] font-bold border cursor-pointer tabular-nums ${
                          active
                            ? 'bg-[#F5A623] border-[#F5A623] text-black'
                            : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sec.toFixed(1)}s
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 4. AUTO SMART-CROP (9:16 SUBJECT LOCK) */}
            <section className="p-2.5 bg-[#0C0D12] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-wider text-white flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>4. 9:16 AUTO SMART-CROP</span>
                </span>
                <button
                  type="button"
                  onClick={handleApplySmartCropAll}
                  className="text-[9px] font-bold text-[#F5A623] hover:underline cursor-pointer"
                >
                  APPLY ALL
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {SMART_CROP_MODES.map((m) => {
                  const active = activeSlide?.smartCropMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleApplySmartCropPreset(m.id)}
                      className={`py-1.5 px-1 text-[9px] font-black border cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#F5A623] border-[#F5A623] text-black'
                          : 'bg-black/60 border-white/10 text-zinc-300 hover:border-white/30'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5 pt-1 text-[10px] tabular-nums">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Move className="w-3 h-3 text-cyan-400" />
                    REFRAME ZOOM: <strong className="text-white">{cropGeom.zoom.toFixed(2)}x</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplySmartCropPreset('CENTER')}
                    className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>RESET</span>
                  </button>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.05"
                  value={cropGeom.zoom}
                  onChange={(e) =>
                    onUpdateSlide?.(currentIndex, {
                      reframeZoom: parseFloat(e.target.value),
                      smartCropMode: 'CUSTOM'
                    })
                  }
                  className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-[#F5A623]"
                />
                <div className="flex items-center justify-between text-[9px] text-zinc-500">
                  <span>PAN X: {Math.round(cropGeom.objectPositionX)}%</span>
                  <span>PAN Y: {Math.round(cropGeom.objectPositionY)}%</span>
                  <span>DRAG FRAME TO PAN</span>
                </div>
              </div>
            </section>

            {/* Export 9:16 Action */}
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="w-full py-2 px-3 bg-[#F5A623] hover:bg-amber-400 text-black font-black text-[11px] tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT 9:16 REEL MP4 (1080×1920)</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
