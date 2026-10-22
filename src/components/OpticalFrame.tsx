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
import { AnthologyFrame, AspectRatio, TitleAnimationStyle } from '../types/anthology';
import { getLutFilterCSS } from '../utils/engine';
import { ComponentVisibility, DEFAULT_COMPONENT_VISIBILITY } from './ComponentsMatrixPopover';
import { calculateShotTimecode } from '../utils/timecode';
import { TechnicalJargonOverlay } from './TechnicalJargonOverlay';
import { getSlideTitleLayout } from './player/OpticalMonitor';
import { generateInitialFrames } from '../data/frames';
import { 
  Upload, 
  Image as ImageIcon, 
  Sliders, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  MoveVertical, 
  Play, 
  Pause, 
  Video, 
  Aperture, 
  LayoutGrid, 
  Settings,
  Pin,
  PinOff,
  Info,
  Check,
  X,
  Shield,
  Cpu,
  Film,
  Disc,
  Type,
  ChevronDown,
  ChevronUp,
  Maximize
} from 'lucide-react';

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
  onOpenAnimatic?: () => void;
  onOpenLens?: () => void;
  onOpenSliders?: () => void;
  onOpenGrid?: () => void;
  onOpenSettings?: () => void;
  titleAnimation?: TitleAnimationStyle;
  onSelectTitleAnimation?: (anim: TitleAnimationStyle) => void;
  onCycleTitleAnimation?: () => void;
  onToggleTitles?: () => void;
  onOpenCinemaPlayer?: () => void;
}

// Real-Time Optical Physics & Depth of Field (DOF) Calculator
const calculateRealtimeDOF = (
  focalLengthStr: string,
  apertureStr: string,
  subjectDistMeters: number = 1.8,
  sensorWidthMm: number = 36.0,
  sensorHeightMm: number = 24.0
) => {
  const fMatch = focalLengthStr.match(/(\d+(\.\d+)?)/);
  const f = fMatch ? parseFloat(fMatch[1]) : 35; // mm

  const aMatch = apertureStr.match(/(\d+(\.\d+)?)/);
  const N = aMatch ? parseFloat(aMatch[1]) : 1.4; // f-number

  // Circle of confusion for cinema full-frame 36x24mm (0.018mm standard)
  const c = 0.018; // mm
  const s = subjectDistMeters * 1000; // mm

  // Hyperfocal distance H = (f^2 / (N * c)) + f in mm
  const H = (f * f) / (N * c) + f;
  const H_meters = H / 1000;

  // Near focus limit Dn = s * (H - f) / (H + s - 2f)
  const Dn_mm = (s * (H - f)) / (H + s - 2 * f);
  const Dn_meters = Math.max(0.1, Dn_mm / 1000);

  // Far focus limit Df = s * (H - f) / (H - s)
  let Df_meters = Infinity;
  let isInfinity = false;
  if (s >= (H - f)) {
    Df_meters = Infinity;
    isInfinity = true;
  } else {
    const Df_mm = (s * (H - f)) / (H - s);
    Df_meters = Df_mm / 1000;
  }

  // Total Depth of Field delta = Df - Dn
  let dofFormatted = '';
  let dofMm = 0;
  if (isInfinity) {
    dofFormatted = 'INFINITE (Hyperfocal to ∞)';
  } else {
    dofMm = (Df_meters - Dn_meters) * 1000;
    if (dofMm < 10) {
      dofFormatted = `${dofMm.toFixed(1)} mm Razor Slice`;
    } else if (dofMm < 100) {
      dofFormatted = `${(dofMm / 10).toFixed(1)} cm Thin Volume`;
    } else {
      dofFormatted = `${(dofMm / 1000).toFixed(2)} m Total Depth`;
    }
  }

  // Entrance pupil diameter = f / N
  const pupilDiameterMm = f / N;

  // Horizontal and Vertical Field of View in degrees
  const hFov = 2 * Math.atan(sensorWidthMm / (2 * f)) * (180 / Math.PI);
  const vFov = 2 * Math.atan(sensorHeightMm / (2 * f)) * (180 / Math.PI);

  // Airy disk diffraction diameter ~ 1.342 * N um
  const airyDiskUm = 1.342 * N;

  // Magnification m = f / (s - f)
  const magnification = (s > f) ? (f / (s - f)) : 0.05;

  return {
    f,
    N,
    c,
    subjectDistMeters,
    H_meters,
    Dn_meters,
    Df_meters,
    isInfinity,
    dofFormatted,
    dofMm,
    pupilDiameterMm,
    hFov,
    vFov,
    airyDiskUm,
    magnification
  };
};

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
  onPanChange,
  onOpenAnimatic,
  onOpenLens,
  onOpenSliders,
  onOpenGrid,
  onOpenSettings,
  titleAnimation,
  onSelectTitleAnimation,
  onCycleTitleAnimation,
  onToggleTitles,
  onOpenCinemaPlayer
}) => {
  const safeFrame: AnthologyFrame = frame || generateInitialFrames()[0];

  // Subtle 'dissolve' crossfade effect between frames
  const [dissolveImageUrl, setDissolveImageUrl] = useState<string | null>(null);
  const [isDissolving, setIsDissolving] = useState(false);
  const activeImageRef = useRef<string | undefined>(safeFrame.imageUrl);
  const dissolveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (safeFrame.imageUrl && safeFrame.imageUrl !== activeImageRef.current) {
      if (activeImageRef.current) {
        setDissolveImageUrl(activeImageRef.current);
        setIsDissolving(true);
        if (dissolveTimerRef.current) clearTimeout(dissolveTimerRef.current);
        dissolveTimerRef.current = window.setTimeout(() => {
          setIsDissolving(false);
          setDissolveImageUrl(null);
        }, 350);
      }
      activeImageRef.current = safeFrame.imageUrl;
    }
  }, [safeFrame.imageUrl]);

  const [localAnimStyle, setLocalAnimStyle] = useState<TitleAnimationStyle>(
    (titleAnimation as any) || (safeFrame.titleAnimation as any) || 'flare'
  );

  const activeAnim = titleAnimation || localAnimStyle;
  const cycleAnim = () => {
    const styles: TitleAnimationStyle[] = ['flare', 'kinetic', 'glitch', 'breathe', 'typewriter', 'neon', 'cinema-fade'];
    const next = styles[(styles.indexOf(activeAnim) + 1) % styles.length];
    if (onSelectTitleAnimation) {
      onSelectTitleAnimation(next);
    } else if (onCycleTitleAnimation) {
      onCycleTitleAnimation();
    } else {
      setLocalAnimStyle(next);
    }
  };
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

  // 4-Corner Interactive Micro-HUD State
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [pinnedCorner, setPinnedCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

  // Technical Jargon Real-Time Overlay State (Appears in corners on stage hover)
  const [isStageHovered, setIsStageHovered] = useState(false);
  const [isJargonPinned, setIsJargonPinned] = useState(false);

  // Title Scale State: 'cover' spans the whole word, 'ultra' is massive, 'standard' is compact
  const [titleScale, setTitleScale] = useState<'cover' | 'ultra' | 'standard'>('cover');
  const [fullscreenBeacon, setFullscreenBeacon] = useState(false);

  // Curated Storytelling Title Layout for this frame
  const frameIdx = (safeFrame.id ? Number(safeFrame.id) - 1 : (safeFrame.epNumber ? Number(safeFrame.epNumber) - 1 : 0)) || 0;
  const titleLayout = getSlideTitleLayout(frameIdx);
  const isSideOrSplit = titleLayout.variant !== 'center-low';

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

  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleContainerPointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleContainerPointerUp = (e: React.PointerEvent) => {
    pointerStartRef.current = null;
  };

  const handleContainerDoubleClick = (e: React.MouseEvent) => {
    if (!isPanActive && onOpenCinemaPlayer) {
      const target = e.target as HTMLElement;
      if (!target.closest('button, input, select, textarea, [data-interactive="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        setFullscreenBeacon(true);
        setTimeout(() => setFullscreenBeacon(false), 500);
        onOpenCinemaPlayer();
      }
    }
  };

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
        onMouseEnter={() => setIsStageHovered(true)}
        onMouseLeave={() => {
          setIsStageHovered(false);
          handleMouseLeave();
        }}
        onPointerDown={handleContainerPointerDown}
        onPointerUp={handleContainerPointerUp}
        onDoubleClick={handleContainerDoubleClick}
        onMouseDown={handlePanMouseDown}
        onTouchStart={handlePanTouchStart}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`group relative ${getAspectRatioClasses()} bg-[#040407] border border-[#272732] rounded-[2px] shadow-[0_25px_80px_rgba(0,0,0,0.98)] ring-1 ring-[#d4af37]/20 overflow-hidden transition-colors duration-150 ease-out ${
          isPanActive ? 'cursor-ns-resize ring-2 ring-[#d4af37]' : 'cursor-pointer'
        }`}
      >
        {/* Cinema Safe-Action & Safe-Title Hairline Corner Marks */}
        <div className="absolute inset-3 sm:inset-4 pointer-events-none z-[29] border border-white/5 select-none">
          <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l border-[#d4af37]/60" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t border-r border-[#d4af37]/60" />
          <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b border-l border-[#d4af37]/60" />
          <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r border-[#d4af37]/60" />
        </div>
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

        {/* Subtle Dissolve Crossfade Layer */}
        {dissolveImageUrl && (
          <div
            className={`absolute -inset-[6%] transition-opacity duration-350 ease-out z-[2] pointer-events-none ${
              isDissolving ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${dissolveImageUrl})`,
              backgroundSize: bgSizeStyle,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `center ${panOffsetPercent}%`,
              filter: filterCSS,
              transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`
            }}
          />
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

        {/* Layer 4: Vignette without noise */}
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
                DROP MEDIA {safeFrame.epNumber} // OR CLICK TO LOAD
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



        {/* 4-Corner HUD removed to eliminate ghost code and clutter from center stage */}



        {/* Cinema Stage Slot: Strictly Centered Primary Bangla Headline + English Title + Anamorphic Flare */}
        {showMasterTitles && (
          <div className="absolute inset-0 z-[30] pointer-events-none p-4 sm:p-8 overflow-hidden select-none flex items-center justify-center">
            {/* Primary Storytelling Title Container (Strictly Centered) */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onOpenInspector?.();
              }}
              title="Click to edit titles in Real-Time Text Inspector"
              className="relative flex flex-col items-center justify-center text-center transition-all duration-300 pointer-events-auto cursor-pointer max-w-4xl group"
            >
              {/* Central Anamorphic Horizontal Light Streak */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] max-w-[1200px] h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE066]/70 to-transparent blur-[1px] pointer-events-none -z-10 animate-pulse" />

              {/* Massive Glowing Bengali Headline with Anek Bangla & Metallic Gold */}
              {showTitleBn && (
                <h1
                  className={`font-anek ${
                    titleScale === 'ultra'
                      ? 'text-7xl sm:text-9xl md:text-[9.5rem] lg:text-[11rem] xl:text-[12rem] tracking-wider'
                      : titleScale === 'standard'
                      ? 'text-5xl sm:text-7xl md:text-8xl tracking-wide'
                      : 'text-6xl sm:text-8xl md:text-9xl lg:text-[7.5rem] xl:text-[8.75rem] 2xl:text-[10rem] tracking-wide sm:tracking-wider'
                  } font-black leading-[1.05] transition-all duration-300 w-full text-center select-none text-metallic-gold drop-shadow-[0_0_35px_rgba(234,179,8,0.45)] ${
                    activeAnim === 'flare'
                      ? 'super-title-flare super-title-breathe'
                      : activeAnim === 'kinetic'
                      ? 'super-title-kinetic text-[#fbbf24]'
                      : activeAnim === 'glitch'
                      ? 'super-title-glitch text-[#fbbf24]'
                      : activeAnim === 'breathe'
                      ? 'super-title-breathe text-[#fbbf24]'
                      : activeAnim === 'typewriter'
                      ? 'super-title-typewriter text-[#fbbf24]'
                      : activeAnim === 'neon'
                      ? 'super-title-neon text-cyan-200'
                      : activeAnim === 'cinema-fade'
                      ? 'super-title-cinema-fade text-[#fbbf24]'
                      : 'text-[#fbbf24]'
                  }`}
                  style={{
                    filter: activeAnim === 'flare' ? undefined : 'drop-shadow(0 0 35px rgba(234,179,8,0.85)) drop-shadow(0 4px 15px rgba(0,0,0,0.95))'
                  }}
                >
                  {safeFrame.bengaliTitle || 'দৃষ্টি'}
                </h1>
              )}

              {/* English Cinzel Main Title */}
              {showTitleEn && (safeFrame.title || (safeFrame.id === 0 ? 'THE SINGULARITY' : '')) && (
                <h2
                  className={`font-cinzel text-xl sm:text-3xl md:text-4xl font-bold tracking-[0.2em] mt-2 sm:mt-3 uppercase drop-shadow-2xl transition-all duration-300 text-center ${
                    activeAnim === 'flare'
                      ? 'super-title-flare'
                      : activeAnim === 'kinetic'
                      ? 'super-title-kinetic text-zinc-100'
                      : activeAnim === 'glitch'
                      ? 'super-title-glitch text-zinc-100'
                      : activeAnim === 'breathe'
                      ? 'super-title-breathe text-zinc-100'
                      : activeAnim === 'typewriter'
                      ? 'super-title-typewriter text-zinc-100'
                      : activeAnim === 'neon'
                      ? 'super-title-neon text-cyan-100'
                      : activeAnim === 'cinema-fade'
                      ? 'super-title-cinema-fade text-zinc-100'
                      : 'text-zinc-100'
                  }`}
                  style={{
                    textShadow: activeAnim === 'flare' ? undefined : '0 4px 20px rgba(0,0,0,0.9), 0 0 15px rgba(234,179,8,0.35)'
                  }}
                >
                  {safeFrame.title || (safeFrame.id === 0 ? 'THE SINGULARITY' : '')}
                </h2>
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

        {/* Quick Edit & Title Toggle Trigger on Frame Hover */}
        <div className="absolute top-3 right-3 sm:right-4 z-[40] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleTitles && (
            <button
              onClick={onToggleTitles}
              className={`px-2 py-1 rounded-[1px] border text-[9px] font-mono-tech backdrop-blur-md cursor-pointer transition-all shadow-lg flex items-center gap-1 ${
                showMasterTitles
                  ? 'bg-black/90 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                  : 'bg-black/70 border-white/20 text-white/40 hover:text-white'
              }`}
              title="Toggle Titles (Hotkey: T)"
            >
              <Type className="w-3 h-3" />
              <span className="font-bold hidden sm:inline">TITLES: {showMasterTitles ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <button
            onClick={onOpenInspector}
            className="p-1.5 rounded-[1px] bg-black/80 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shadow-lg"
            title="Open Director Optical Inspector (E)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          {hasPhoto && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-[1px] bg-black/80 hover:bg-black border border-white/20 text-white hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shadow-lg"
              title="Replace Frame Photo"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* YOUTUBE-GRADE INSIDE-MEDIA FULLSCREEN BUTTON & QUICK DOCK (Bottom Bar)     */}
        {/* ========================================================================= */}
        {/* Bottom-Left Inside-Media Telemetry Pill */}
        <div className="absolute bottom-3 left-3 z-[45] flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="px-2.5 py-1 rounded-[2px] bg-black/80 backdrop-blur-md border border-white/10 text-[9.5px] font-mono text-zinc-300 flex items-center gap-1.5 shadow-lg select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            <span className="font-bold text-[#FFE066]">SHOT {String(safeFrame.id || 1).padStart(3, '0')}</span>
            <span className="text-white/20">•</span>
            <span className="text-zinc-400">DOUBLE-CLICK TO EXPAND</span>
          </div>
        </div>

        {/* Bottom-Right Prominent Inside-Media Fullscreen Button */}
        <div className="absolute bottom-3 right-3 z-[45] flex items-center gap-2 pointer-events-auto">
          {/* Format Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none">
            <span className="font-bold text-[#D4AF37]">{aspectRatio}</span>
            <span className="text-white/20">|</span>
            <span className="text-zinc-400">4K CINEMA</span>
          </div>

          {onOpenCinemaPlayer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenBeacon(true);
                setTimeout(() => setFullscreenBeacon(false), 500);
                onOpenCinemaPlayer();
              }}
              aria-label="Full screen (f)"
              title="Full screen (f)"
              className="group/fs relative flex items-center justify-center p-2 rounded-[2px] bg-black/85 hover:bg-[#D4AF37] border border-white/20 hover:border-[#D4AF37] text-white hover:text-black shadow-[0_4px_24px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-150 cursor-pointer active:scale-95"
            >
              <Maximize className="w-4 h-4 transition-transform duration-150 group-hover/fs:scale-110" />
              {/* Tooltip */}
              <span className="absolute bottom-full right-0 mb-2 px-2 py-0.5 rounded bg-black/95 border border-[#D4AF37]/50 text-[10px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-xl opacity-0 group-hover/fs:opacity-100 pointer-events-none transition-opacity duration-150">
                Full screen (f)
              </span>
            </button>
          )}
        </div>

        {/* Fullscreen Beacon Flash Feedback */}
        {fullscreenBeacon && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-out fade-out duration-300">
            <div className="p-4 rounded-full bg-[#0D0D12]/90 border border-[#D4AF37] text-[#FFE066] shadow-[0_0_30px_rgba(212,175,55,0.6)] animate-ping">
              <Maximize className="w-10 h-10" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
