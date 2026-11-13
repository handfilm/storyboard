/**
 * @file /src/components/player/OpticalMonitor.tsx
 * @description Dedicated Broadcast-Grade Optical Monitor Panel for RAWx Storyboard Studio.
 * 
 * Architectural & NLE Specifications:
 * - Dual-Mode Engine Integration:
 *   - Mode A: 'HERO_GLOBAL' (12.000s sequence clock across 100 slides)
 *   - Mode B: 'SOLO_INSPECTOR' (locked into isolated 12.0s window with sub-frame scrubbing)
 * - Professional JKL Transport:
 *   - J: 2x Reverse Playback
 *   - K: Stop / Pause
 *   - L: 1x / 2x Forward Playback
 *   - ← / →: Step ±1 Frame (41.666ms / 1/24s)
 *   - I / O: Set Sub-Clip In/Out Markers with strict loop bounding
 * - Double-Buffering & Pre-Hydration Pipeline:
 *   - Pre-hydrates incoming slide video 1.5s prior to sequence boundary for 0ms latency.
 * - Sub-Frame Precision:
 *   - rVFC (requestVideoFrameCallback) and video.fastSeek() for hardware-level sync.
 * - Monospace Telemetry HUD:
 *   - Exact Timecode (00:00:12:00), Frame Index (F001 / 288), Locked FPS (24.0 fps locked), JKL Velocity.
 * - Creative Dynamic Title Storytelling:
 *   - Curated layout rhythm alternating 6 narrative positions across slides (center-low, asymmetric split,
 *     bottom-left, top-right split, middle-right, bottom-right editorial).
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode } from '../../types/editor';
import {
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../../types/storyboard';
import { r2StorageService } from '../../services/r2StorageService';
import { studioDraftDb } from '../../services/db';
import { TactileTransport } from '../controls/TactileTransport';
import { StageTextOverlay } from '../StageTextOverlay';
import { useVideoPlaybackEngine, JklVelocity } from '../../hooks/useVideoPlaybackEngine';
import { useGlobalKeyboardShortcuts } from '../../hooks/useGlobalKeyboardShortcuts';
import { 
  Film, 
  Upload, 
  Trash2,
  Sparkles,
  Layers,
  ArrowDownCircle,
  Clock,
  Maximize2,
  Minimize2,
  Bookmark,
  Activity,
  Repeat,
  Volume2,
  VolumeX,
  Gauge,
  ZoomIn
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { getShotMediaKey } from '../../services/handfilmMediaVault';
import { calculateMultiLayerZoom } from '../../utils/engine';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { useTitleContainerRepaint } from '../../hooks/useTitleContainerRepaint';
import { StageMetadataFxBar } from '../stage/StageMetadataFxBar';
import { StageCaptionStrip } from '../stage/StageCaptionStrip';

export type TitleLayoutVariant =
  | 'center-low'
  | 'asymmetric-split'
  | 'bottom-left'
  | 'top-right-split'
  | 'middle-right'
  | 'bottom-right';

export interface TitleLayoutConfig {
  variant: TitleLayoutVariant;
  name: string;
  titleContainerClass: string;
  captionContainerClass: string;
  titleAlign: 'left' | 'center' | 'right';
  hasSplitCaption: boolean;
}

/**
 * Curated Narrative Title Layout Engine
 * Every title is a story: choreographs positioning across the 100-shot anthology.
 */
export function getSlideTitleLayout(slideIndex: number): TitleLayoutConfig {
  const mod = Math.abs(slideIndex) % 6;
  switch (mod) {
    case 0:
      return {
        variant: 'center-low',
        name: 'Center Hero',
        titleContainerClass: 'bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 text-center max-w-3xl',
        captionContainerClass: 'mt-2.5 flex flex-col items-center text-center',
        titleAlign: 'center',
        hasSplitCaption: false
      };
    case 1:
      return {
        variant: 'asymmetric-split',
        name: 'Top-Left Title // Bottom-Right Caption',
        titleContainerClass: 'top-8 sm:top-12 left-6 sm:left-10 text-left max-w-lg',
        captionContainerClass: 'absolute bottom-8 sm:bottom-12 right-6 sm:right-10 text-right max-w-md',
        titleAlign: 'left',
        hasSplitCaption: true
      };
    case 2:
      return {
        variant: 'bottom-left',
        name: 'Widescreen Lower-Third',
        titleContainerClass: 'bottom-8 sm:bottom-12 left-6 sm:left-10 text-left max-w-xl',
        captionContainerClass: 'mt-2 text-left',
        titleAlign: 'left',
        hasSplitCaption: false
      };
    case 3:
      return {
        variant: 'top-right-split',
        name: 'Top-Right Title // Bottom-Left Caption',
        titleContainerClass: 'top-8 sm:top-12 right-6 sm:right-10 text-right max-w-lg',
        captionContainerClass: 'absolute bottom-8 sm:bottom-12 left-6 sm:left-10 text-left max-w-md',
        titleAlign: 'right',
        hasSplitCaption: true
      };
    case 4:
      return {
        variant: 'middle-right',
        name: 'Middle-Right Anchor',
        titleContainerClass: 'top-1/2 -translate-y-1/2 right-6 sm:right-12 text-right max-w-md',
        captionContainerClass: 'mt-2.5 text-right',
        titleAlign: 'right',
        hasSplitCaption: false
      };
    case 5:
    default:
      return {
        variant: 'bottom-right',
        name: 'Bottom-Right Editorial',
        titleContainerClass: 'bottom-8 sm:bottom-12 right-6 sm:right-10 text-right max-w-xl',
        captionContainerClass: 'mt-2 text-right',
        titleAlign: 'right',
        hasSplitCaption: false
      };
  }
}

interface OpticalMonitorProps {
  currentSlide?: SlideDraft;
  nextSlide?: SlideDraft;
  currentIndex: number;
  totalSlides: number;
  aspectRatio: AspectRatioType;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  isLooping: boolean;
  slideTimeSec: number; // 0.0s to 12.0s
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
  onChangeAspectRatio?: (aspect: AspectRatioType) => void;
  onUploadMedia?: (file: File) => void;
  onPurgeMedia?: () => void;
  onCaptureStill?: () => void;
  onOpenCinemaPlayer?: () => void;
  projectTitle?: string;
  showHud?: boolean;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  className?: string;
}

export const OpticalMonitor: React.FC<OpticalMonitorProps> = ({
  currentSlide,
  nextSlide,
  currentIndex,
  totalSlides,
  aspectRatio = '2.39:1',
  playbackMode,
  isPlaying,
  isLooping,
  slideTimeSec,
  playbackSpeed = 1.0,
  onChangePlaybackSpeed,
  onChangeSlideDuration,
  onChangeTargetFps,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onTogglePlay,
  onToggleLoop,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onSelectPlaybackMode,
  onChangeAspectRatio,
  onUploadMedia,
  onPurgeMedia,
  onCaptureStill,
  onOpenCinemaPlayer,
  projectTitle = 'RAWx Storyboard',
  showHud = true,
  showTitles: propShowTitles,
  componentsVisibility,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prebufferVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const monitorTitleContainerRef = useRef<HTMLDivElement | null>(null);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState<boolean>(false);

  const storeShowTitles = useStudioStore((s) => s.titleConfig?.showTitles ?? true);
  const storeTitlesAll = useStudioStore((s) => s.visibility.titlesAll);
  const showTitles = componentsVisibility !== undefined
    ? Boolean(
        (propShowTitles ?? true) &&
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean((propShowTitles ?? true) && storeShowTitles && storeTitlesAll);

  useTitleContainerRepaint({
    containerRef: monitorTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: showTitles,
    label: 'OpticalMonitor',
    activeKey: currentIndex
  });

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const stageScale = useStudioStore((s) => s.stageScale);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const zoomTransforms = calculateMultiLayerZoom(bgZoom, fgZoom, isVertigo);

  // Elastic frame calculation per active slide
  const activeFps = getShotTargetFps(currentSlide, 24);
  const FRAME_DURATION = 1 / activeFps;
  const SLIDE_MAX_TIME = getShotDurationSec(currentSlide, 12.0);
  const SLIDE_TOTAL_FRAMES = getShotFrameCount(SLIDE_MAX_TIME, activeFps);

  // Active slide frame state
  const [currentFrame, setCurrentFrame] = useState<number>(() => Math.floor(slideTimeSec * activeFps));

  // Store-synced animated title alignment (LEFT | MID | RIGHT | AUTO)
  const storeTitleAlign = useStudioStore((s) => s.titleAlign);

  // Sync frame with slide time changes
  useEffect(() => {
    setCurrentFrame(Math.floor(slideTimeSec * activeFps));
  }, [slideTimeSec, activeFps]);

  // Hook 1: Professional Video Playback Engine (60fps direct-DOM playbackClock; no React re-renders)
  const engine = useVideoPlaybackEngine({
    totalSlides,
    initialSlideIndex: currentIndex,
    initialMode: playbackMode,
    fps: activeFps,
    activeSlideDurationSec: SLIDE_MAX_TIME,
    onSlideChange: () => {}
  });

  // Attach active video element & strictly sync hardware state with React props
  useEffect(() => {
    engine.attachVideoElement(videoRef.current);
  }, [engine, currentSlide?.remoteUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = isMuted;
    vid.playbackRate = Math.max(0.25, Math.min(4.0, playbackSpeed || 1.0));
    if (isPlaying) {
      if (vid.paused) vid.play().catch(() => {});
    } else if (!vid.paused) {
      vid.pause();
    }
  }, [isPlaying, playbackSpeed, isMuted, currentIndex]);

  // Frame-accurate stepping forward (+1F)
  const handleStepForward = useCallback(() => {
    if (isPlaying) {
      onTogglePlay();
    }
    engine.handleShuttleStop();

    if (videoRef.current) {
      videoRef.current.pause();
      const nextTime = Math.min(videoRef.current.currentTime + FRAME_DURATION, SLIDE_MAX_TIME);
      videoRef.current.currentTime = nextTime;
      const targetFrame = Math.floor(nextTime * 24);
      setCurrentFrame(targetFrame);
      onScrubSlideTime(nextTime);
      engine.scrubSlideTime(nextTime);
    } else {
      const nextTime = Math.min(slideTimeSec + FRAME_DURATION, SLIDE_MAX_TIME);
      const targetFrame = Math.floor(nextTime * 24);
      setCurrentFrame(targetFrame);
      onScrubSlideTime(nextTime);
      engine.scrubSlideTime(nextTime);
    }
  }, [isPlaying, onTogglePlay, engine, slideTimeSec, onScrubSlideTime]);

  // Frame-accurate stepping backward (-1F)
  const handleStepBackward = useCallback(() => {
    if (isPlaying) {
      onTogglePlay();
    }
    engine.handleShuttleStop();

    if (videoRef.current) {
      videoRef.current.pause();
      const prevTime = Math.max(videoRef.current.currentTime - FRAME_DURATION, 0);
      videoRef.current.currentTime = prevTime;
      const targetFrame = Math.floor(prevTime * 24);
      setCurrentFrame(targetFrame);
      onScrubSlideTime(prevTime);
      engine.scrubSlideTime(prevTime);
    } else {
      const prevTime = Math.max(slideTimeSec - FRAME_DURATION, 0);
      const targetFrame = Math.floor(prevTime * 24);
      setCurrentFrame(targetFrame);
      onScrubSlideTime(prevTime);
      engine.scrubSlideTime(prevTime);
    }
  }, [isPlaying, onTogglePlay, engine, slideTimeSec, onScrubSlideTime]);

  // Note: Keyboard shortcuts are managed centrally by keyScopeManager in App.tsx
  // to avoid duplicate event handling conflicts when OpticalMonitor is mounted.

  const activeShotKey = getShotMediaKey(currentSlide as any, currentIndex);
  const vaultEntry = shotMediaMap?.[activeShotKey] ?? null;

  const isVideo = vaultEntry
    ? vaultEntry.type === 'video'
    : Boolean(
        currentSlide?.isVideo ||
        (currentSlide?.remoteUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(currentSlide.remoteUrl)) ||
        (currentSlide?.imageUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(currentSlide.imageUrl))
      );

  // Dynamic Dual-Stream Engine State:
  // - proxyUrl: Lightweight 540p for 24fps zero-latency scrubbing
  // - sourceUrl: Uncompressed 4K/1080p for full-res playback, fullscreen, & master export
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const previousUrlRef = useRef<string | null>(null);

  // Hydrate dual streams strictly for active shot
  useEffect(() => {
    let isMounted = true;
    const mediaId = vaultEntry?.url || currentSlide?.mediaBlobId || currentSlide?.remoteUrl || currentSlide?.imageUrl || currentSlide?.thumbnailUrl;
    if (mediaId) {
      if (mediaId.startsWith('http') || mediaId.startsWith('data:') || mediaId.startsWith('blob:')) {
        setSourceUrl(mediaId);
        setProxyUrl(mediaId);
      } else {
        studioDraftDb.getDualStreamUrls(mediaId).then((urls) => {
          if (isMounted) {
            setSourceUrl(urls.sourceUrl);
            setProxyUrl(urls.proxyUrl || urls.sourceUrl);
          }
        });
      }
    } else {
      setSourceUrl('');
      setProxyUrl('');
    }
    return () => { isMounted = false; };
  }, [currentIndex, vaultEntry?.url, currentSlide?.mediaBlobId, currentSlide?.remoteUrl, currentSlide?.imageUrl, currentSlide?.thumbnailUrl]);

  // Adaptive Playback State Machine:
  const isPlayingActive = isPlaying || engine.jklVelocity !== 0;
  const activeStreamType: 'proxy' | 'source' = (engine.isScrubbing && !isFullscreen && proxyUrl) ? 'proxy' : 'source';

  const rawMediaUrl = activeStreamType === 'proxy'
    ? (proxyUrl || sourceUrl)
    : (sourceUrl || proxyUrl);

  const mediaUrl = vaultEntry?.url || rawMediaUrl || (currentSlide?.remoteUrl
    ? r2StorageService.getStreamUrl(currentSlide.remoteUrl, isVideo)
    : '');

  // Subtle Cross-Dissolve Transition State for Shot Navigation
  const [outgoingPlate, setOutgoingPlate] = useState<{
    url: string;
    isVideo: boolean;
    panY?: number;
  } | null>(null);
  const [isCrossDissolving, setIsCrossDissolving] = useState(false);
  const dissolveTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(currentIndex);
  const prevMediaUrlRef = useRef<string>('');

  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      if (prevMediaUrlRef.current && prevMediaUrlRef.current !== mediaUrl && !engine.isScrubbing) {
        if (dissolveTimerRef.current) {
          clearTimeout(dissolveTimerRef.current);
        }
        setOutgoingPlate({
          url: prevMediaUrlRef.current,
          isVideo: Boolean(currentSlide?.isVideo),
          panY: currentSlide?.panY ?? 50
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
  }, [currentIndex, mediaUrl, engine.isScrubbing, currentSlide]);

  useEffect(() => {
    return () => {
      if (dissolveTimerRef.current) {
        clearTimeout(dissolveTimerRef.current);
      }
    };
  }, []);

  // Delayed URL revocation: revoke old URLs only after the next slide mounts to prevent blank frames
  useEffect(() => {
    const oldUrl = previousUrlRef.current;
    if (mediaUrl && oldUrl && oldUrl !== mediaUrl && oldUrl.startsWith('blob:') && oldUrl !== sourceUrl && oldUrl !== proxyUrl) {
      const timer = setTimeout(() => {
        studioDraftDb.revokeTrackedUrl(oldUrl);
      }, 1000);
      previousUrlRef.current = mediaUrl;
      return () => clearTimeout(timer);
    }
    previousUrlRef.current = mediaUrl;
  }, [mediaUrl, sourceUrl, proxyUrl]);

  // Fullscreen controller
  const toggleFullscreen = useCallback(() => {
    if (onOpenCinemaPlayer) {
      onOpenCinemaPlayer();
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, [onOpenCinemaPlayer]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format SMPTE Timecode
  const formatSMPTE = (sec: number) => {
    const totalFrames = Math.max(0, Math.floor(sec * 24));
    const ff = String(totalFrames % 24).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const currentFrameInSlide = Math.min(288, Math.max(1, Math.floor(slideTimeSec * 24) + 1));
  const titleLayout = useMemo(() => getSlideTitleLayout(currentIndex), [currentIndex]);

  // Drag & drop ingestion
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && onUploadMedia) {
      onUploadMedia(e.dataTransfer.files[0]);
    }
  }, [onUploadMedia]);

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

  // Telemetry velocity label
  const velocityBadge = useMemo(() => {
    switch (engine.jklVelocity) {
      case -2: return { label: 'J 2x REV', color: 'text-amber-400 bg-amber-950/70 border-amber-500/50' };
      case -1: return { label: 'J 1x REV', color: 'text-amber-400 bg-amber-950/70 border-amber-500/50' };
      case 0: return { label: 'K PAUSED', color: 'text-zinc-400 bg-zinc-900 border-zinc-700' };
      case 1: return { label: 'L 1x FWD', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/50' };
      case 2: return { label: 'L 2x FWD', color: 'text-emerald-300 bg-emerald-950/90 border-emerald-400' };
    }
  }, [engine.jklVelocity]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-between overflow-hidden select-none font-mono ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black p-4' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Invisible Secondary Pre-Buffer Video Element (metadata-only so primary decoder never starves) */}
      <video
        ref={prebufferVideoRef}
        src={sourceUrl || undefined}
        crossOrigin="anonymous"
        className="hidden"
        preload="metadata"
        muted
        playsInline
      />

      {/* External 28px Stage Metadata & FX Bar (Strictly ABOVE the video frame) */}
      <StageMetadataFxBar
        shotIndex={currentIndex}
        frameNum={currentFrame + 1}
        totalFrames={SLIDE_TOTAL_FRAMES}
        smpte={formatSMPTE(slideTimeSec)}
        fps={activeFps}
        streamLabel={activeStreamType === 'proxy' ? '540p PROXY // 24FPS SCRUB' : 'RAW 4K // FULL-RES'}
        aspectRatio={aspectRatio}
        playbackMode={playbackMode}
        showHud={showHud}
        isTitlesActive={showTitles}
        velocityBadge={velocityBadge}
        inOutBadge={
          engine.inOutRange.isActive && engine.inOutRange.inSec !== null && engine.inOutRange.outSec !== null
            ? `IN ${engine.inOutRange.inSec.toFixed(2)}s - OUT ${engine.inOutRange.outSec.toFixed(2)}s`
            : null
        }
        isMuted={isMuted}
        onToggleMute={() => setIsMuted((m) => !m)}
        onUploadMedia={() => fileInputRef.current?.click()}
        onOpenCinemaPlayer={onOpenCinemaPlayer}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Primary Pure Zero-Overlay Cinema Playback Canvas */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative overflow-hidden p-0">
        <div
          style={getStageBoxStyle()}
          className="relative bg-[#0E0E12] border-y border-[#1C1C24] overflow-hidden flex items-center justify-center transition-[width,height,background-color] duration-200 ease-out"
        >
          
          {/* Active Media Display - Ultra Clean Display with Multi-Layer Zoom & Cross-Dissolve */}
          {outgoingPlate && isCrossDissolving && !outgoingPlate.isVideo && (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none z-0 animate-cross-dissolve-out"
              style={{ transform: zoomTransforms.bgTransform }}
            >
              <div
                className="w-full h-full bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(${outgoingPlate.url})`,
                  backgroundPosition: `center ${outgoingPlate.panY ?? 50}%`
                }}
              />
            </div>
          )}

          {mediaUrl ? (
            <div
              key={`optical_plate_${currentIndex}`}
              className={`w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out origin-center z-10 ${
                isCrossDissolving ? 'animate-cross-dissolve' : ''
              }`}
              style={{ transform: zoomTransforms.bgTransform }}
            >
              {isVideo ? (
                <video
                  key={mediaUrl}
                  ref={videoRef}
                  src={mediaUrl}
                  crossOrigin="anonymous"
                  playsInline
                  muted={isMuted}
                  loop={isLooping && !engine.inOutRange.isActive}
                  preload="auto"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={onTogglePlay}
                  style={{
                    objectPosition: `center ${currentSlide?.panY ?? 50}%`,
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden'
                  }}
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    vid.muted = isMuted;
                    vid.playbackRate = Math.max(0.25, Math.min(4.0, playbackSpeed || 1.0));
                    if (slideTimeSec > 0) {
                      try {
                        vid.currentTime = Math.min(slideTimeSec, vid.duration || slideTimeSec);
                      } catch {}
                    }
                    if (isPlaying && vid.paused) {
                      vid.play().catch(() => {});
                    }
                  }}
                />
              ) : (
                <div
                  className="w-full h-full bg-cover bg-no-repeat transition-colors duration-150 ease-out"
                  style={{
                    backgroundImage: `url(${mediaUrl})`,
                    backgroundPosition: `center ${currentSlide?.panY ?? 50}%`
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0B0F] p-6 text-center">
              <Film className="w-12 h-12 text-white/20 mb-3" />
              <p className="font-mono text-xs text-[#EDEDED] font-bold tracking-widest uppercase">
                NO ASSET ATTACHED // SHOT {String(currentIndex + 1).padStart(3, '0')}
              </p>
              <p className="font-mono text-[10.5px] text-white/40 mt-1 max-w-sm">
                Drag and drop raw 4K video or stills directly onto this slot for instant IndexedDB ingestion.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-1.5 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-xs font-mono font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Attach Media</span>
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

          {/* Drag & Drop Tactical Ingestion Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-[#0E0E12]/95 border-2 border-dashed border-[#F5A623] flex flex-col items-center justify-center p-6 z-30 pointer-events-none animate-in fade-in duration-150">
              <ArrowDownCircle className="w-14 h-14 text-[#F5A623] animate-bounce mb-3" />
              <p className="text-sm font-mono font-black text-[#F5A623] tracking-widest uppercase">
                DROP MEDIA TO INGEST // 15S VIBE-CHECK
              </p>
              <p className="text-xs font-mono text-white/60 mt-1">
                Direct write to IndexedDB `media_blobs` • 12.000s Timeline Sync
              </p>
            </div>
          )}

          {/* Stage Cinema Title & Subtitle Overlay Inside Monitor */}
          {showTitles && (
            <StageTextOverlay
              shotIndex={currentIndex}
              banglaTitle={currentSlide?.titleBn || (currentIndex === 0 ? 'দৃষ্টি' : undefined)}
              englishTitle={currentSlide?.titleEn || (currentIndex === 0 ? 'THE SINGULARITY' : undefined)}
              subtitle={currentSlide?.tagline || '24.0 FPS RAW • MASTER CINE PROJECTION'}
              directorNotes={currentSlide?.directorNotes}
              shotType={currentSlide?.shotType}
              titleAlign={storeTitleAlign}
              isVisible={showTitles}
              componentsVisibility={componentsVisibility}
              className="z-20 pointer-events-none select-none"
            />
          )}

        </div>
      </div>

      {/* External Technical Telemetry Strip (Strictly BELOW the video frame) */}
      <StageCaptionStrip
        shotIndex={currentIndex}
        aspectRatio={aspectRatio || '2.39:1'}
        shotType={currentSlide?.shotType}
        dopamineConfig={currentSlide?.dopamineConfig}
        slideTimeSec={slideTimeSec}
        durationSec={SLIDE_MAX_TIME}
        isTitlesActive={showTitles}
        componentsVisibility={componentsVisibility}
      />

      {/* Permanently Visible Tactical Pill Transport Dock ("Google Flow" Aesthetic) */}
      <TactileTransport
        isPlaying={isPlaying}
        onTogglePlay={() => {
          onTogglePlay();
          engine.togglePlay();
        }}
        playbackMode={playbackMode}
        onSelectPlaybackMode={(mode) => {
          onSelectPlaybackMode(mode);
          engine.setPlaybackMode(mode);
        }}
        isLooping={isLooping}
        onToggleLoop={() => {
          onToggleLoop();
          engine.setIsLooping(!isLooping);
        }}
        onStepFrame={(fwd) => {
          if (fwd) {
            handleStepForward();
          } else {
            handleStepBackward();
          }
        }}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={onChangePlaybackSpeed || (() => {})}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(m => !m)}
        slideTimeSec={slideTimeSec}
        slideDurationSec={SLIDE_MAX_TIME}
        targetFps={activeFps}
        onChangeSlideDuration={onChangeSlideDuration}
        onChangeTargetFps={onChangeTargetFps}
        onApplyDurationToAll={onApplyDurationToAll}
        isSnapToBeat={isSnapToBeat}
        onToggleSnapToBeat={onToggleSnapToBeat}
        currentIndex={currentIndex}
        totalSlides={totalSlides}
        onScrubSlideTime={(t) => {
          onScrubSlideTime(t);
          engine.scrubSlideTime(t);
        }}
        onScrubGlobalTime={(gt) => {
          onScrubGlobalTime?.(gt);
          engine.scrubGlobalTime(gt);
        }}
        aspectRatio={aspectRatio}
        onChangeAspectRatio={onChangeAspectRatio}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onCaptureStill={onCaptureStill}
        onPurgeMedia={onPurgeMedia}
        hasMedia={Boolean(mediaUrl)}
        className="mt-3 shrink-0"
      />
    </div>
  );
};
