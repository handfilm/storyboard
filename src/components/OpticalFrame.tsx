/**
 * @file /src/components/OpticalFrame.tsx
 * @description Master Optical Stage Viewport & Lens Simulator.
 * Features:
 * - Full-bleed media with interactive vertical pan (Y/P, 50% default)
 * - 12/13 Component Visibility Matrix respect
 * - Reticle corner brackets & Rule of Thirds guides (C)
 * - Multi-layer optical simulation (Bloom, Anamorphic falloff, Film grain, Vignette)
 * - Exact credit line: "A RAWx Storyboard / Director: Rakib Himon"
 * - Responsive non-colliding typography overlay (Bangla + English + Episode labels)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnthologyFrame, AspectRatio } from '../types/anthology';
import { getLutFilterCSS } from '../utils/engine';
import { ComponentVisibility, DEFAULT_COMPONENT_VISIBILITY } from './ComponentsMatrixPopover';
import { calculateShotTimecode } from '../utils/timecode';
import { generateInitialFrames } from '../data/frames';
import { Upload, Image as ImageIcon, Sliders, Sparkles, Volume2, VolumeX, MoveVertical, Play, Pause, Video } from 'lucide-react';

interface OpticalFrameProps {
  frame: AnthologyFrame;
  aspectRatio: AspectRatio;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  isPanActive?: boolean;
  panOffsetPercent?: number;
  showGuides?: boolean;
  fitMode?: 'cover' | 'contain' | 'fill';
  componentsVisibility?: ComponentVisibility;
  onUploadImage: (file: File) => void;
  onOpenInspector: () => void;
  onQuickSampleImage: () => void;
  onPanChange?: (newPercent: number) => void;
}

export const OpticalFrame: React.FC<OpticalFrameProps> = ({
  frame,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  isPanActive = false,
  panOffsetPercent = 50,
  showGuides = false,
  fitMode = 'cover',
  componentsVisibility = DEFAULT_COMPONENT_VISIBILITY,
  onUploadImage,
  onOpenInspector,
  onQuickSampleImage,
  onPanChange
}) => {
  const safeFrame: AnthologyFrame = frame || generateInitialFrames()[0];
  const safeAdjustments = safeFrame.adjustments || {
    brightness: 100,
    contrast: 115,
    saturation: 110,
    bloom: 55,
    grain: 15,
    motionBlur: 70,
    vignette: 40
  };
  const safeCamera = safeFrame.cameraSpec || {
    focalLength: "35mm High-Speed Master",
    aperture: "f/1.4",
    shutter: "1/48s 180°",
    iso: "ISO 400",
    sensor: "Full-Frame 36x24 Cine Sensor",
    format: "RAW 14-BIT ARRI"
  };

  const [isDragOver, setIsDragOver] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPanningDrag, setIsPanningDrag] = useState(false);
  const panStartYRef = useRef<number>(0);
  const panStartOffsetRef = useRef<number>(50);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  const [videoError, setVideoError] = useState(false);

  const isVideo = Boolean(
    safeFrame.isVideo !== undefined
      ? safeFrame.isVideo
      : (safeFrame.imageUrl && (
          safeFrame.imageUrl.startsWith('data:video') ||
          /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(safeFrame.imageUrl)
        ))
  );

  useEffect(() => {
    setVideoError(false);
    if (videoRef.current && isVideo) {
      if (isAutoplay) {
        videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  }, [isAutoplay, isVideo, safeFrame.id, safeFrame.imageUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const filterCSS = getLutFilterCSS(safeFrame.lutFilter || 'cinematic', safeAdjustments);
  const hasPhoto = Boolean(safeFrame.imageUrl);

  // Subtle interactive 3D perspective tilt (disabled during pan drag)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningDrag) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    if (!isPanningDrag) {
      setMousePos({ x: 0, y: 0 });
    }
  };

  // Interactive Pan Y Drag Handler
  const handlePanMouseDown = (e: React.MouseEvent) => {
    if (!isPanActive || !onPanChange) return;
    setIsPanningDrag(true);
    panStartYRef.current = e.clientY;
    panStartOffsetRef.current = panOffsetPercent;
  };

  const handlePanTouchStart = (e: React.TouchEvent) => {
    if (!isPanActive || !onPanChange) return;
    setIsPanningDrag(true);
    panStartYRef.current = e.touches[0].clientY;
    panStartOffsetRef.current = panOffsetPercent;
  };

  useEffect(() => {
    if (!isPanningDrag || !onPanChange) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - panStartYRef.current;
      const sensitivity = 0.25;
      const nextOffset = Math.max(0, Math.min(100, Math.round(panStartOffsetRef.current + deltaY * sensitivity)));
      onPanChange(nextOffset);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const deltaY = e.touches[0].clientY - panStartYRef.current;
      const sensitivity = 0.25;
      const nextOffset = Math.max(0, Math.min(100, Math.round(panStartOffsetRef.current + deltaY * sensitivity)));
      onPanChange(nextOffset);
    };

    const handleGlobalMouseUp = () => {
      setIsPanningDrag(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isPanningDrag, onPanChange]);

  const isMediaFile = (file: File) => {
    return file.type.startsWith('image/') || file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isMediaFile(file)) {
        onUploadImage(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
    e.target.value = '';
  };

  // Aspect ratio container classes
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '2.39:1':
        return 'w-full h-full max-h-[76vh] sm:max-h-[82vh] max-w-[196vh] aspect-[2.39/1]';
      case '16:9':
        return 'w-full h-full max-h-[80vh] sm:max-h-[86vh] max-w-[156vh] aspect-[16/9]';
      case '4:3':
        return 'w-full h-full max-h-[84vh] sm:max-h-[90vh] max-w-[122vh] aspect-[4/3]';
      case '1:1':
        return 'w-full h-full max-h-[78vh] sm:max-h-[82vh] max-w-[82vh] aspect-square';
      case '9:16':
        return 'w-full h-full max-h-[86vh] sm:max-h-[90vh] max-w-[52vh] aspect-[9/16]';
      default:
        return 'w-full h-full';
    }
  };

  // Check component visibility flags
  const showMasterTitles = componentsVisibility.titlesAll;
  const showTitleBn = showMasterTitles && componentsVisibility.titleBn;
  const showTitleEn = showMasterTitles && componentsVisibility.titleEn;
  const showBadge = showMasterTitles && componentsVisibility.badge;
  const showTagline = showMasterTitles && componentsVisibility.tagline;
  const showCaption = showMasterTitles && componentsVisibility.caption;
  const showHudData = showHud && componentsVisibility.hudData;
  const showReticles = showHud && componentsVisibility.reticles;
  const showThirdsGuides = showGuides || componentsVisibility.guides;
  const showGrain = componentsVisibility.grain;
  const showVignette = componentsVisibility.vignette;
  const showBloom = componentsVisibility.bloom;
  const showLensBlur = componentsVisibility.lensBlur;
  const showMotionBlur = componentsVisibility.motionBlur;

  const bgSizeStyle = fitMode === 'contain' ? 'contain' : fitMode === 'fill' ? '100% 100%' : 'cover';

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-5 overflow-hidden select-none">
      {/* Letterbox Cinema Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handlePanMouseDown}
        onTouchStart={handlePanTouchStart}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        style={{
          transform: `perspective(1000px) rotateX(${-mousePos.y * 0.35}deg) rotateY(${mousePos.x * 0.35}deg)`,
          transition: isPanningDrag ? 'none' : 'transform 0.4s var(--ease-hypersonic)'
        }}
        className={`relative ${getAspectRatioClasses()} bg-[#060608] border border-white/10 rounded-[2px] shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden transition-all ${
          isPanActive ? 'cursor-ns-resize ring-1 ring-[#D4AF37]/50' : ''
        }`}
      >
        {/* Layer 1: Base Sharp Media Layer */}
        {hasPhoto ? (
          isVideo ? (
            videoError ? (
              <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center p-4 bg-[#0a0a0d] text-center border border-red-500/20">
                <Video className="w-8 h-8 text-[#D4AF37] mb-2 opacity-60" />
                <p className="font-mono text-xs text-[#FFE066] font-bold">VIDEO FORMAT NOTICE</p>
                <p className="text-[10px] text-white/60 max-w-xs mt-1">
                  Unable to decode this video stream. Please ensure the video is an MP4 (H.264), WebM, or MOV file.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1 bg-[#D4AF37] text-black font-bold text-[10px] rounded hover:bg-[#FFE066] transition-colors"
                >
                  REPLACE VIDEO
                </button>
              </div>
            ) : (
              <video
                key={safeFrame.imageUrl}
                ref={videoRef}
                src={safeFrame.imageUrl}
                autoPlay
                loop
                muted={isVideoMuted}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onError={() => setVideoError(true)}
                className="absolute -inset-[6%] w-[112%] h-[112%] transition-transform duration-700 ease-out z-[1]"
                style={{
                  objectFit: bgSizeStyle === 'contain' ? 'contain' : bgSizeStyle === '100% 100%' ? 'fill' : 'cover',
                  objectPosition: `center ${panOffsetPercent}%`,
                  filter: filterCSS,
                  transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`
                }}
              />
            )
          ) : (
            <div
              className={`absolute -inset-[6%] transition-transform duration-700 ease-out z-[1] ${
                isAutoplay ? 'scale-105 transition-transform duration-[6000ms]' : 'scale-100'
              }`}
              style={{
                backgroundImage: `url(${safeFrame.imageUrl})`,
                backgroundSize: bgSizeStyle,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `center ${panOffsetPercent}%`,
                filter: filterCSS,
                transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`
              }}
            />
          )
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c0d12] via-[#08080a] to-[#040405] z-[1] flex items-center justify-center">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>
        )}

        {/* Pan Active Interactive Pill */}
        {isPanActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3 py-1 bg-black/85 border border-[#D4AF37] rounded-[1px] shadow-lg flex items-center gap-2 pointer-events-auto">
            <MoveVertical className="w-3 h-3 text-[#D4AF37] animate-pulse" />
            <span className="font-mono-tech text-[9px] text-[#FFE066] font-bold">
              PAN Y: {panOffsetPercent}% (DRAG VERTICAL TO ADJUST)
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPanChange?.(50);
              }}
              className="px-1.5 py-0.2 bg-white/10 hover:bg-white/20 text-[8px] text-white/80 rounded cursor-pointer"
              title="Reset Vertical Pan to Center (50%)"
            >
              50% RESET
            </button>
          </div>
        )}

        {/* Layer 2: Soft Focus Bloom */}
        {hasPhoto && !isVideo && showBloom && (
          <div
            className="absolute -inset-[6%] bg-center mix-blend-screen pointer-events-none z-[2] transition-opacity duration-700"
            style={{
              backgroundImage: `url(${safeFrame.imageUrl})`,
              backgroundSize: bgSizeStyle,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `center ${panOffsetPercent}%`,
              filter: `blur(${Math.max(6, safeAdjustments.bloom * 0.2)}px) brightness(1.2) contrast(1.1)`,
              opacity: (safeAdjustments.bloom / 100) * 0.7,
              maskImage: 'radial-gradient(circle at center, black 15%, transparent 65%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 15%, transparent 65%)'
            }}
          />
        )}

        {/* Layer 3: Radial Anamorphic Lens Blur & Falloff */}
        {hasPhoto && !isVideo && showLensBlur && (
          <div
            className="absolute -inset-[6%] bg-center pointer-events-none z-[3] transition-opacity duration-700"
            style={{
              backgroundImage: `url(${safeFrame.imageUrl})`,
              backgroundSize: bgSizeStyle,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `center ${panOffsetPercent}%`,
              filter: 'blur(12px) brightness(0.8)',
              opacity: 0.95,
              maskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 85%)'
            }}
          />
        )}

        {/* Layer: Optical Post FX Edge Motion Blur (photo-motion-edges) */}
        {hasPhoto && showMotionBlur && (
          <div
            className="photo-motion-edges z-[4] pointer-events-none transition-opacity duration-500"
            style={{
              backgroundImage: !isVideo ? `url(${safeFrame.imageUrl})` : undefined,
              backgroundSize: bgSizeStyle,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `center ${panOffsetPercent}%`,
              opacity: Math.max(0.2, (safeAdjustments.motionBlur ?? 70) / 100)
            }}
          />
        )}

        {/* Layer 4: Procedural Film Grain & Dynamic Vignette */}
        {showGrain && (
          <div
            className="absolute inset-0 film-grain z-[10] pointer-events-none"
            style={{ opacity: safeAdjustments.grain / 100 }}
          />
        )}
        {showVignette && (
          <div
            className="absolute inset-0 pointer-events-none z-[11]"
            style={{
              background: `radial-gradient(circle at center, transparent ${Math.max(0, 100 - safeAdjustments.vignette)}%, rgba(0,0,0,${(safeAdjustments.vignette / 100) * 0.85}) 100%)`
            }}
          />
        )}

        {/* Composition Guides: Rule of Thirds & Center Crosshair */}
        {showThirdsGuides && (
          <div className="absolute inset-0 pointer-events-none z-[28]">
            <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-[#D4AF37]/40" />
            <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-[#D4AF37]/40" />
            <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-[#D4AF37]/40" />
            <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-[#D4AF37]/40" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6">
              <div className="absolute top-3 left-0 right-0 h-px bg-[#D4AF37]" />
              <div className="absolute left-3 top-0 bottom-0 w-px bg-[#D4AF37]" />
            </div>
          </div>
        )}

        {/* Video Transport Controls Bar */}
        {hasPhoto && isVideo && (
          <div className="absolute bottom-2 left-4 right-4 z-40 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded border border-[#D4AF37]/30 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play().catch(() => {});
                  } else {
                    videoRef.current.pause();
                  }
                }
              }}
              className="p-1 hover:text-[#FFE066] text-[#EDEDED] transition-colors"
              title={isVideoPlaying ? "Pause Video" : "Play Video"}
            >
              {isVideoPlaying ? <Pause className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Play className="w-3.5 h-3.5 text-[#D4AF37]" />}
            </button>
            <div 
              className="flex-1 h-1.5 bg-white/20 rounded cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current && videoRef.current.duration) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = pos * videoRef.current.duration;
                }
              }}
            >
              <div className="h-full bg-[#D4AF37]" style={{ width: `${videoProgress}%` }} />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.muted = !videoRef.current.muted;
                  setIsVideoMuted(videoRef.current.muted);
                }
              }}
              className="p-1 hover:text-[#FFE066] text-[#EDEDED] transition-colors"
              title={isVideoMuted ? "Unmute Video" : "Mute Video"}
            >
              {isVideoMuted ? <VolumeX className="w-3.5 h-3.5 text-white/60" /> : <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
            </button>
            <span className="text-[9px] font-mono text-[#FFE066] flex items-center gap-1 border-l border-white/10 pl-2">
              <Video className="w-3 h-3 text-[#D4AF37]" />
              4K VIDEO
            </span>
          </div>
        )}

        {/* Drop Media Prompt */}
        {!hasPhoto && (
          <div
            className={`absolute inset-0 z-[25] flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 ${
              isDragOver ? 'bg-amber-500/10 border-2 border-amber-400' : 'bg-transparent'
            }`}
          >
            <div className="w-14 h-14 rounded-full border border-white/20 bg-black/60 flex items-center justify-center text-white/50 backdrop-blur-md shadow-lg">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-mono-tech text-[10px] sm:text-xs tracking-[0.25em] text-white/70 uppercase mb-1">
                [ DROP MEDIA {safeFrame.epNumber} // OR CLICK TO LOAD ]
              </p>
              <p className="text-[9px] text-white/40 tracking-wider">
                SUPPORTS 4K MP4, WEBM, MOV, JPG, PNG, WEBP • DRAG & DROP ANYWHERE
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-[1px] text-[10px] font-mono-tech text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-[#D4AF37]" />
                Upload Media (Video / Image)
              </button>
              <button
                onClick={onQuickSampleImage}
                className="px-3 py-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 rounded-[1px] text-[10px] font-mono-tech text-[#FFE066] flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Load Cinema Preset
              </button>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept="image/*,video/*,.mp4,.webm,.mov,.ogg,.m4v"
          className="hidden"
        />

        {/* Center Slot: Cinematic Title & Bengali Typography (Safe Overlay) */}
        {showMasterTitles && (
          <div className="absolute inset-0 z-[30] pointer-events-none flex flex-col items-center justify-center text-center px-4 sm:px-8 py-10">
            <div className="max-w-3xl flex flex-col items-center">
              {/* Bengali Subtitle / Episode label */}
              {(showBadge || showTitleBn) && (
                <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
                  {showBadge && (
                    <span className="font-mono-tech text-[9px] sm:text-xs tracking-[0.3em] text-[#D4AF37] font-semibold uppercase drop-shadow-md">
                      EP {safeFrame.epNumber} //
                    </span>
                  )}
                  {showTitleBn && (
                    <span className="font-bengali text-xs sm:text-base md:text-lg tracking-widest text-[#FFE066] drop-shadow-lg font-bold">
                      {safeFrame.bengaliTitle}
                    </span>
                  )}
                </div>
              )}

              {/* Epic Cinzel Main Title */}
              {showTitleEn && (
                <h1
                  className="font-cinzel text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.16em] uppercase transition-all duration-300 leading-tight"
                  style={{
                    color: safeFrame.colorAccent || '#D4AF37',
                    textShadow: `0 8px 30px rgba(0,0,0,0.95), 0 2px 10px ${safeFrame.colorAccent || '#D4AF37'}40`
                  }}
                >
                  {safeFrame.title}
                </h1>
              )}

              {/* Curatorial Tagline */}
              {showTagline && (
                <p className="font-mono-tech text-[9px] sm:text-xs md:text-sm tracking-[0.2em] text-white/80 mt-1.5 sm:mt-3 max-w-xl mx-auto drop-shadow-md uppercase">
                  {safeFrame.tagline}
                </p>
              )}

              {/* Sound Cue notification */}
              {showCaption && safeFrame.soundCue && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[8.5px] font-mono-tech text-white/60 tracking-wider">
                  <Volume2 className="w-2.5 h-2.5 text-[#D4AF37]" />
                  <span>{safeFrame.soundCue}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gold Corner Reticle Brackets */}
        {showReticles && (
          <div className="absolute inset-2 sm:inset-3 md:inset-4 border border-white/10 pointer-events-none z-[34]">
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#D4AF37]" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#D4AF37]" />
          </div>
        )}

        {/* Responsive HUD Telemetry (Slot System) */}
        {showHudData && (
          <div className="absolute inset-3 sm:inset-5 md:inset-7 pointer-events-none z-[35]">
            {/* Top Left: File & Timecode & Bitrate */}
            <div className="hud-tl absolute top-0 left-0 font-mono-tech text-[8px] sm:text-[9.5px] tracking-[0.18em] text-white/70 leading-relaxed uppercase">
              <div>PLAYBACK // FILE_{safeFrame.epNumber} <span className="text-[#D4AF37] font-semibold ml-1">[{calculateShotTimecode(safeFrame.id, 60, 24).start}]</span></div>
              <div className="text-white/40">FORMAT: {safeCamera.format} // ASPECT: {aspectRatio}</div>
            </div>

            {/* Top Right: Node Archive */}
            <div className="absolute top-0 right-0 font-mono-tech text-[8px] sm:text-[9.5px] tracking-[0.18em] text-white/70 text-right leading-relaxed uppercase">
              <div>NODE: {nodeLocation}</div>
              <div className="text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SECURE ARCHIVE
              </div>
            </div>

            {/* Bottom Left: Camera Optics Spec */}
            <div className="absolute bottom-0 left-0 font-mono-tech text-[7.5px] sm:text-[9.5px] tracking-[0.15em] text-white/70 leading-tight uppercase max-w-[45%]">
              <div className="truncate">FOCAL: {safeCamera.focalLength}</div>
              <div className="text-white/40 truncate">
                DOF: {safeCamera.aperture} // ISO {safeCamera.iso}
              </div>
            </div>

            {/* Bottom Right: Preserved Exact Credit Line */}
            <div className="absolute bottom-0 right-0 font-mono-tech text-[7.5px] sm:text-[9.5px] tracking-[0.15em] text-white/70 text-right leading-tight uppercase max-w-[45%]">
              <div className="truncate">
                A <span style={{ color: safeFrame.colorAccent || '#D4AF37' }} className="font-bold">RAWx</span> Storyboard
              </div>
              <div className="text-white/40 truncate">
                Director: {directorName || 'Rakib Himon'}
              </div>
            </div>
          </div>
        )}

        {/* Quick Edit Trigger on Frame Hover */}
        {hasPhoto && (
          <div className="absolute top-3 right-3 z-[40] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 transition-opacity">
            <button
              onClick={onOpenInspector}
              className="p-1.5 rounded-[1px] bg-black/80 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shadow-lg"
              title="Open Director Optical Inspector (E)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-[1px] bg-black/80 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shadow-lg"
              title="Replace Frame Photo"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
