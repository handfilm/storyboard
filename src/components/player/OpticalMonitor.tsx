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
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { r2StorageService } from '../../services/r2StorageService';
import { studioDraftDb } from '../../services/db';
import { TactileTransport } from '../controls/TactileTransport';
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
  Gauge
} from 'lucide-react';

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
  projectTitle?: string;
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
  projectTitle = 'RAWx Storyboard',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prebufferVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [showTitles, setShowTitles] = useState<boolean>(true);

  // Hook 1: Professional Video Playback Engine
  const engine = useVideoPlaybackEngine({
    totalSlides,
    initialSlideIndex: currentIndex,
    initialMode: playbackMode,
    fps: 24,
    onSlideChange: (idx) => {
      // Trigger slide change in parent if available
    },
    onTimeUpdate: (sSec, gSec) => {
      onScrubSlideTime(sSec);
    }
  });

  // Attach active video element to engine
  useEffect(() => {
    engine.attachVideoElement(videoRef.current);
  }, [engine, currentSlide?.remoteUrl]);

  // Hook 2: Global Keyboard Shortcuts (Space, J/K/L, Arrows, I/O)
  useGlobalKeyboardShortcuts({
    playbackMode,
    onTogglePlay: () => {
      onTogglePlay();
      engine.togglePlay();
    },
    onNextSlide: () => {
      engine.nextSlide();
    },
    onPrevSlide: () => {
      engine.prevSlide();
    },
    onStepFrame: (fwd) => {
      onStepFrame(fwd);
      engine.stepFrame(fwd);
    },
    onShuttleReverse: () => {
      engine.handleShuttleReverse();
    },
    onShuttleStop: () => {
      engine.handleShuttleStop();
    },
    onShuttleForward: () => {
      engine.handleShuttleForward();
    },
    onSetInPoint: () => {
      engine.setInPoint();
    },
    onSetOutPoint: () => {
      engine.setOutPoint();
    },
    onClearInOutPoints: () => {
      engine.clearInOutPoints();
    },
    onToggleFullscreen: () => {
      toggleFullscreen();
    },
    onToggleTitles: () => {
      setShowTitles((t) => !t);
    }
  });

  const isVideo = Boolean(
    currentSlide?.isVideo ||
    (currentSlide?.remoteUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(currentSlide.remoteUrl))
  );

  const mediaUrl = currentSlide?.remoteUrl
    ? r2StorageService.getStreamUrl(currentSlide.remoteUrl, isVideo)
    : '';

  const nextIsVideo = Boolean(
    nextSlide?.isVideo ||
    (nextSlide?.remoteUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(nextSlide.remoteUrl))
  );

  const nextMediaUrl = nextSlide?.remoteUrl
    ? r2StorageService.getStreamUrl(nextSlide.remoteUrl, nextIsVideo)
    : '';

  // Double-buffering pre-hydration pipeline (1.5s prior to 12.0s boundary)
  useEffect(() => {
    if (playbackMode === 'sequence' && (slideTimeSec >= 10.5 || engine.shouldPrehydrate) && nextMediaUrl) {
      if (nextIsVideo && prebufferVideoRef.current) {
        if (prebufferVideoRef.current.src !== nextMediaUrl) {
          prebufferVideoRef.current.src = nextMediaUrl;
          prebufferVideoRef.current.load();
        }
      } else if (!nextIsVideo) {
        const preImg = new Image();
        preImg.src = nextMediaUrl;
      }
    }
  }, [playbackMode, slideTimeSec, engine.shouldPrehydrate, nextMediaUrl, nextIsVideo]);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) {
        studioDraftDb.revokeTrackedUrl(mediaUrl);
      }
    };
  }, [mediaUrl]);

  // Fullscreen controller
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

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

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '2.39:1': return 'aspect-[2.39/1] max-h-[76vh]';
      case '16:9': return 'aspect-[16/9] max-h-[82vh]';
      case '4:3': return 'aspect-[4/3] max-h-[84vh]';
      case '1:1': return 'aspect-square max-h-[78vh]';
      case '9:16': return 'aspect-[9/16] max-h-[88vh]';
      default: return 'aspect-[2.39/1] max-h-[76vh]';
    }
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
      {/* Invisible Secondary Pre-Buffer Video Element for Double-Buffering */}
      <video
        ref={prebufferVideoRef}
        className="hidden"
        preload="auto"
        muted
        playsInline
      />

      {/* Primary Cinema Playback Canvas */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
        <div className={`relative ${getAspectClass()} w-full bg-[#0E0E12] border border-[#1C1C24] shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center transition-colors duration-150 ease-out`}>
          
          {/* Active Media Display */}
          {mediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                muted={isMuted}
                loop={isLooping && !engine.inOutRange.isActive}
                playsInline
                preload="auto"
                className="w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: `center ${currentSlide?.panY ?? 50}%` }}
              />
            ) : (
              <div
                className="w-full h-full bg-cover bg-no-repeat transition-colors duration-150 ease-out"
                style={{
                  backgroundImage: `url(${mediaUrl})`,
                  backgroundPosition: `center ${currentSlide?.panY ?? 50}%`
                }}
              />
            )
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

          {/* ========================================================================= */}
          {/* BROADCAST TELEMETRY HUD OVERLAY (Always Visible & Non-Intrusive)          */}
          {/* ========================================================================= */}
          
          {/* Top Left: Scene ID, Frame Telemetry, SMPTE Timecode */}
          <div className="absolute top-3 left-3 bg-[#0E0E12]/95 border border-[#1C1C24] px-3 py-1.5 rounded-full text-[10px] font-mono text-[#EDEDED] font-bold tracking-wider flex items-center gap-2 shadow-lg backdrop-blur-md z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            <span className="text-[#F5A623]">SH{String(currentIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/20">|</span>
            <span className="text-white font-bold tabular-nums">
              {formatSMPTE(slideTimeSec)}
            </span>
            <span className="text-white/20">|</span>
            <span className="text-white/60 tabular-nums">
              F{String(currentFrameInSlide).padStart(3, '0')}/288
            </span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400 text-[9px]">24.0 FPS LOCKED</span>
          </div>

          {/* Top Right: Transport Velocity & NLE Status */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {/* JKL Velocity Badge */}
            <div className={`px-2.5 py-1 rounded-full border text-[9.5px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md ${velocityBadge.color}`}>
              <Activity className="w-3 h-3" />
              <span>{velocityBadge.label}</span>
            </div>

            {/* In/Out Marker Badge if set */}
            {engine.inOutRange.isActive && engine.inOutRange.inSec !== null && engine.inOutRange.outSec !== null && (
              <div className="px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[9px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md">
                <Bookmark className="w-2.5 h-2.5 text-cyan-400" />
                <span>IN {engine.inOutRange.inSec.toFixed(2)}s ─ OUT {engine.inOutRange.outSec.toFixed(2)}s</span>
              </div>
            )}

            {/* Mode & Aspect Capsule */}
            <div className="bg-[#0E0E12]/95 border border-[#1C1C24] px-3 py-1.5 rounded-full text-[10px] font-mono text-[#EDEDED] font-bold tracking-wider flex items-center gap-2 shadow-lg backdrop-blur-md">
              <span className="text-[#F5A623]">{aspectRatio}</span>
              <span className="text-white/20">|</span>
              <span className={playbackMode === 'sequence' ? 'text-emerald-400' : 'text-[#F5A623]'}>
                {playbackMode === 'sequence' ? 'HERO GLOBAL' : 'SOLO INSPECTOR'}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CREATIVE DYNAMIC PER-SLIDE TITLE STORYTELLING OVERLAY                     */}
          {/* Choreographed positions: Center, Asymmetric Top-Left, Lower-Third, Right  */}
          {/* ========================================================================= */}
          {showTitles && (currentSlide?.titleEn || currentSlide?.titleBn) && (
            <div className="absolute inset-0 pointer-events-none p-6 sm:p-10 flex flex-col justify-between z-10">
              
              {/* Primary Title Container (Positioned via Curated Layout Archetype) */}
              <div className={`absolute ${titleLayout.titleContainerClass} transition-all duration-300`}>
                
                {/* Bengali Glowing Title (Anek Bangla / Metallic Gold) */}
                {currentSlide.titleBn && (
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#ffe58f] via-[#d4af37] to-[#eab308] drop-shadow-[0_0_25px_rgba(234,179,8,0.5)]">
                    {currentSlide.titleBn}
                  </h1>
                )}

                {/* English Subtitle (Cinzel tracking uppercase) */}
                {currentSlide.titleEn && (
                  <h2 className="text-xs sm:text-sm md:text-base font-mono font-bold tracking-[0.25em] text-[#EDEDED] uppercase mt-1 drop-shadow-md">
                    {currentSlide.titleEn}
                  </h2>
                )}

                {/* Unified Captions (for non-split archetypes) */}
                {!titleLayout.hasSplitCaption && (currentSlide.directorNotes || currentSlide.soundCue) && (
                  <div className={titleLayout.captionContainerClass}>
                    {currentSlide.directorNotes && (
                      <p className="text-[10.5px] sm:text-xs text-white/70 font-mono drop-shadow">
                        DIR: {currentSlide.directorNotes}
                      </p>
                    )}
                    {currentSlide.soundCue && (
                      <span className="text-[9.5px] text-[#38BDF8] font-mono mt-0.5 drop-shadow flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        <span>{currentSlide.soundCue}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Asymmetric Split Caption (for Top-Left / Top-Right split archetypes) */}
              {titleLayout.hasSplitCaption && (currentSlide.directorNotes || currentSlide.soundCue) && (
                <div className={`${titleLayout.captionContainerClass} bg-[#0E0E12]/85 backdrop-blur-md px-3.5 py-2 border border-[#1C1C24] rounded-xl shadow-xl transition-all duration-300`}>
                  {currentSlide.directorNotes && (
                    <p className="text-xs text-[#EDEDED] font-mono leading-relaxed">
                      {currentSlide.directorNotes}
                    </p>
                  )}
                  {currentSlide.soundCue && (
                    <p className="text-[10px] text-[#38BDF8] font-mono mt-1 flex items-center justify-end gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>{currentSlide.soundCue}</span>
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Bottom Left Quick Telemetry Indicator: Layout Archetype Name */}
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[8.5px] font-mono text-zinc-400 pointer-events-none z-20">
            LAYOUT: <span className="text-[#F5A623] font-bold uppercase">{titleLayout.name}</span>
          </div>

        </div>
      </div>

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
          onStepFrame(fwd);
          engine.stepFrame(fwd);
        }}
        playbackSpeed={playbackSpeed}
        onChangePlaybackSpeed={onChangePlaybackSpeed || (() => {})}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(m => !m)}
        slideTimeSec={slideTimeSec}
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
