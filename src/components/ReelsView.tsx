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

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { SlideDraft, AspectRatioType } from '../types/project';
import { PlaybackMode } from '../types/editor';
import { 
  Film, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  Sliders,
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
  defaultSafeZone?: ReelsSafeZonePosition;
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
  onOpenCinemaPlayer,
  projectTitle = '12.0S CINEMA REEL',
  defaultSafeZone = 'bottom'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe-Zone Positioning State: 'bottom' default as confirmed by user
  const [safeZone, setSafeZone] = useState<ReelsSafeZonePosition>(defaultSafeZone);
  const [isMuted, setIsMuted] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 24fps frame index calculation (F001 to F288)
  const currentFrame = useMemo(() => {
    const rawFrame = Math.floor(slideTimeSec * 24);
    return Math.min(288, Math.max(1, rawFrame + 1));
  }, [slideTimeSec]);

  // Frame tag string: [ F001/288 • 12.0s ]
  const frameCounterTag = useMemo(() => {
    const paddedFrame = String(currentFrame).padStart(3, '0');
    return `[ F${paddedFrame}/288 • 12.0s ]`;
  }, [currentFrame]);

  // Progress percentage across 12-second block (0% to 100%)
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.max(0, (slideTimeSec / 12.0) * 100));
  }, [slideTimeSec]);

  // Media source resolution
  const mediaUrl = currentSlide?.remoteUrl || (currentSlide as any)?.imageUrl;
  const isVideo = Boolean(
    currentSlide?.isVideo ||
    (mediaUrl && (mediaUrl.startsWith('data:video') || /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(mediaUrl)))
  );

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

  // Aspect ratio helper
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-[16/9] max-h-[72vh]';
      case '1:1': return 'aspect-square max-h-[72vh]';
      case '9:16': return 'aspect-[9/16] max-h-[82vh]';
      case '2.39:1':
      default: return 'aspect-[2.39/1] max-h-[72vh]';
    }
  };

  const displayBangla = currentSlide?.titleBn || 'আলোর স্মৃতি';
  const displayEnglish = currentSlide?.titleEn || `SHOT ${String(currentIndex + 1).padStart(3, '0')} // MASTER REEL`;
  const displaySubtitle = currentSlide?.tagline || currentSlide?.directorNotes || '24.0 FPS RAW • MASTER CINE PROJECTION';

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex flex-col justify-between overflow-hidden select-none bg-[#070709]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Viewport Playback Container */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative p-2 sm:p-4">
        <div className={`relative ${getAspectClass()} w-full bg-[#0B0B0F] border border-[#1C1C24] shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center`}>
          
          {/* Active Visual Media Plate */}
          {mediaUrl ? (
            isVideo ? (
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
            )
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

          {/* Top Left: Scene & Locked Specs Monospace Badge */}
          <div className="absolute top-3 left-3 bg-[#0E0E12]/95 border border-[#232332] px-3.5 py-1.5 rounded-full text-[10.5px] font-mono text-[#EDEDED] font-bold tracking-wider flex items-center gap-2.5 shadow-lg backdrop-blur-md z-30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-pulse" />
            <span className="text-[#F5A623]">SH{String(currentIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/30">•</span>
            <span className="text-white font-mono tabular-nums">
              {slideTimeSec.toFixed(2)}s / 12.00s
            </span>
            <span className="text-white/30">•</span>
            <span className="text-emerald-400 font-bold">24FPS LOCKED</span>
          </div>

          {/* Top Right: On-Screen 3-Position Safe-Zone Switcher Pill (User Clarification Answer) */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <div className="bg-[#0E0E12]/95 border border-[#F5A623]/40 px-2 py-1 rounded-full text-[9px] font-mono text-[#EDEDED] flex items-center gap-1 shadow-xl backdrop-blur-md">
              <Compass className="w-3 h-3 text-[#F5A623] mr-0.5" />
              <span className="text-zinc-500 font-bold uppercase tracking-wider hidden sm:inline">SAFE-ZONE:</span>
              <button
                type="button"
                onClick={() => setSafeZone('top')}
                className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                  safeZone === 'top'
                    ? 'bg-[#F5A623] text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Top Header Pill Safe Zone"
              >
                TOP
              </button>
              <button
                type="button"
                onClick={() => setSafeZone('center')}
                className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                  safeZone === 'center'
                    ? 'bg-[#F5A623] text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Center Dialogue Card Safe Zone"
              >
                CTR
              </button>
              <button
                type="button"
                onClick={() => setSafeZone('bottom')}
                className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                  safeZone === 'bottom'
                    ? 'bg-[#F5A623] text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Floating Bottom Dock Safe Zone (Default)"
              >
                BOT
              </button>
            </div>

            {/* Audio Mute & Cinema Launchers */}
            <button
              type="button"
              onClick={() => setIsMuted(m => !m)}
              className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer backdrop-blur-md"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {onOpenCinemaPlayer && (
              <button
                type="button"
                onClick={onOpenCinemaPlayer}
                className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 border border-white/15 text-zinc-300 hover:text-[#F5A623] text-xs transition-colors cursor-pointer backdrop-blur-md"
                title="Launch Cinema Theater Player"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* FROSTED OBSIDIAN CAPSULE EDITORIAL SUITE                                  */}
          {/* ========================================================================= */}
          <div 
            className={`absolute z-20 pointer-events-none transition-all duration-300 ease-out w-[92%] sm:w-[86%] max-w-2xl flex flex-col ${getSafeZoneClass()}`}
          >
            <div className="w-full backdrop-blur-md bg-black/60 border border-[#F5A623]/30 rounded-xl px-6 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] relative overflow-hidden animate-title-entrance">
              
              {/* Header Meta Row: Integrated Frame Counter Tag + Sequence Pill */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                {/* Integrated Frame Counter Tag: [ F001/288 • 12.0s ] in Gold Monospace */}
                <div className="font-mono text-[#F5A623] font-bold text-xs tracking-wider flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-[#F5A623]/15 border border-[#F5A623]/40">
                    {frameCounterTag}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest hidden sm:inline">
                    EDIT CUT {String(currentIndex + 1).padStart(2, '0')}/100
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#E50914] animate-pulse" />
                </div>
              </div>

              {/* Glowing Bangla Title */}
              <h2 className="font-bangla font-black text-2xl sm:text-3xl text-[#F5A623] tracking-wide leading-tight animate-golden-bloom">
                {displayBangla}
              </h2>

              {/* English Subtitle / Tagline */}
              <div className="mt-1 space-y-1">
                <p className="font-cinzel font-bold text-xs sm:text-sm text-white/95 uppercase tracking-wider drop-shadow-md">
                  {displayEnglish}
                </p>

                {displaySubtitle && (
                  <p className="font-mono text-[10px] text-zinc-300 tracking-wide line-clamp-2 leading-relaxed">
                    {displaySubtitle}
                  </p>
                )}
              </div>

              {/* Pulsing Amber Progress Line along bottom border syncing to 12.0s block */}
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/40 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#F5A623] via-[#ffc048] to-[#E50914] animate-amber-progress-pulse transition-all duration-100 ease-linear shadow-[0_0_12px_#F5A623]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Bottom Compact Transport Pill for Reels Workspace */}
      <div className="h-12 w-full px-6 flex items-center justify-between border-t border-[#1C1C24] bg-[#0A0A0E] text-zinc-400 text-xs font-mono">
        <div className="flex items-center gap-3">
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
            title="Step -1 Frame (41.6ms)"
          >
            -1F
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer text-[10px]"
            title="Step +1 Frame (41.6ms)"
          >
            +1F
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer text-[10px] ${
              isLooping ? 'bg-amber-950/70 text-[#F5A623] border border-[#F5A623]/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle 12s Loop"
          >
            LOOP 12.0S
          </button>
        </div>

        {/* 12.0s Scrub Bar */}
        <div className="flex-1 max-w-md mx-6 flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">0.0s</span>
          <input
            type="range"
            min="0"
            max="12.0"
            step="0.0416"
            value={slideTimeSec}
            onChange={(e) => onScrubSlideTime(parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F5A623]"
          />
          <span className="text-[10px] text-[#F5A623] font-bold">12.0s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-[10px]">REELS EDITORIAL</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] border border-zinc-700">
            {aspectRatio}
          </span>
        </div>
      </div>
    </div>
  );
};
