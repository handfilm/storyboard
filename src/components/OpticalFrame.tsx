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
  ChevronUp
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
  onToggleTitles
}) => {
  const safeFrame: AnthologyFrame = frame || generateInitialFrames()[0];
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
        onMouseDown={handlePanMouseDown}
        onTouchStart={handlePanTouchStart}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative ${getAspectRatioClasses()} bg-[#040407] border border-[#272732] rounded-[2px] shadow-[0_25px_80px_rgba(0,0,0,0.98)] ring-1 ring-[#d4af37]/20 overflow-hidden transition-colors duration-150 ease-out ${
          isPanActive ? 'cursor-ns-resize ring-2 ring-[#d4af37]' : ''
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

        {/* Real-Time 'technical-jargon' overlay appearing in Stage corners on hover */}
        <TechnicalJargonOverlay
          focalLength={safeCamera.focalLength || '35mm'}
          aperture={safeCamera.aperture || 'T1.2'}
          lensName={safeFrame.activeLens || safeCamera.format || 'Zeiss Supreme Prime 35mm T1.5'}
          aspectRatio={aspectRatio}
          shotNumber={safeFrame.epNumber}
          timecode={calculateShotTimecode(safeFrame.id, 60, 24).start}
          isStageHovered={isStageHovered}
          isPinned={isJargonPinned}
          onTogglePin={() => setIsJargonPinned(p => !p)}
          showTitles={showMasterTitles}
          onToggleTitles={onToggleTitles}
        />

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



        {/* ========================================================================= */}
        {/* 4-CORNER NANO HUD SYSTEM: Animated Subtle Bullets & Short Smart Names      */}
        {/* Hover / Tap reveals deep technical specs for Director, DP, Sensor & DOF    */}
        {/* ========================================================================= */}
        {showHudData && (
          <>
            {/* CORNER 1: TOP-LEFT (Playback, Take, Sensor & Timecode) */}
            <div 
              className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 pointer-events-auto"
              onMouseEnter={() => setActiveCorner('tl')}
              onMouseLeave={() => setActiveCorner(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCorner(p => p === 'tl' ? null : 'tl');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono-tech text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'tl' || pinnedCorner === 'tl')
                    ? 'bg-[#12131A] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-[#D4AF37]/50 text-white/80'
                }`}
                title="Click to pin or hover for playback & sensor telemetry"
              >
                {/* Animated Subtle Bullet */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5A919] shadow-[0_0_8px_#E5A919]" />
                </span>
                {/* Short Smart Name */}
                <span className="font-bold tracking-wider text-[#FFE066]">REC // SH{safeFrame.epNumber}</span>
                {pinnedCorner === 'tl' && <Pin className="w-2.5 h-2.5 text-[#E5A919]" />}
              </button>

              {/* Huge Details Popover */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-full left-0 mt-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-top-left z-50 text-left font-mono-tech ${
                  (activeCorner === 'tl' || pinnedCorner === 'tl')
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E5A919] shadow-[0_0_8px_#E5A919] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase">PLAYBACK TELEMETRY & SENSOR CORE</span>
                  </div>
                  <button 
                    onClick={() => setPinnedCorner(p => p === 'tl' ? null : 'tl')}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={pinnedCorner === 'tl' ? "Unpin details" : "Pin details"}
                  >
                    {pinnedCorner === 'tl' ? <PinOff className="w-3 h-3 text-[#E5A919]" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight">
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">SHOT / TAKE</span>
                    <span className="text-[#FFE066] font-bold text-[9.5px]">SC01-SH{safeFrame.epNumber} // TAKE 04</span>
                  </div>
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">TIMECODE (SMPTE)</span>
                    <span className="text-white font-mono font-bold text-[9.5px]">{calculateShotTimecode(safeFrame.id, 60, 24).start}</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[8px] text-white/70 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">SENSOR ARCHITECTURE:</span>
                    <span className="text-white font-medium">ARRI ALEV III Large Format CMOS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">STREAM & FORMAT:</span>
                    <span className="text-[#FFE066] font-semibold">{safeCamera.format || 'RAW 14-BIT ARRI'} (1.8 Gbps)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">COLOR PIPELINE:</span>
                    <span className="text-white font-medium">ARRIRAW LogC4 // ACEScg 1.3 Wide Gamut</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ASPECT & GATE:</span>
                    <span className="text-white font-medium">{aspectRatio} Cinema Scope (Full LF Aperture)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ROTARY SHUTTER:</span>
                    <span className="text-white font-medium">172.8° Shutter Angle • 1/50.0s @ 24.000 FPS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">AUDIO TIMECODE:</span>
                    <span className="text-emerald-400 font-medium">Genlock Quad-BNC 32-bit Float 48kHz Synced</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[7.5px] text-white/50">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    BUFFER: 100% HEALTHY • 0 DROPS
                  </span>
                  <span className="text-white/30">CLICK CHIP TO PIN</span>
                </div>
              </div>
            </div>

            {/* CORNER 2: TOP-RIGHT (Cluster Node, Cloud Vault & Checksums) */}
            <div 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 pointer-events-auto"
              onMouseEnter={() => setActiveCorner('tr')}
              onMouseLeave={() => setActiveCorner(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCorner(p => p === 'tr' ? null : 'tr');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono-tech text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'tr' || pinnedCorner === 'tr')
                    ? 'bg-[#12131A] border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-emerald-400/50 text-white/80'
                }`}
                title="Click to pin or hover for cloud node archive details"
              >
                {/* Animated Subtle Bullet */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                {/* Short Smart Name */}
                <span className="font-bold tracking-wider text-emerald-300">NODE // {nodeLocation}</span>
                {pinnedCorner === 'tr' && <Pin className="w-2.5 h-2.5 text-emerald-400" />}
              </button>

              {/* Huge Details Popover */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-emerald-500/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-top-right z-50 text-left font-mono-tech ${
                  (activeCorner === 'tr' || pinnedCorner === 'tr')
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase">SECURE ARCHIVE & CLUSTER TELEMETRY</span>
                  </div>
                  <button 
                    onClick={() => setPinnedCorner(p => p === 'tr' ? null : 'tr')}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={pinnedCorner === 'tr' ? "Unpin details" : "Pin details"}
                  >
                    {pinnedCorner === 'tr' ? <PinOff className="w-3 h-3 text-emerald-400" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight">
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">EDGE CLUSTER</span>
                    <span className="text-emerald-300 font-bold text-[9.5px]">{nodeLocation} (Primary Gateway)</span>
                  </div>
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">VAULT PROTOCOL</span>
                    <span className="text-white font-mono font-bold text-[9.5px]">AES-GCM-256 ENCRYPTED</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[8px] text-white/70 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">NETWORK PIPELINE:</span>
                    <span className="text-white font-medium">10GbE Fiber Direct-to-Disk Array</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">CRYPTO CHECKSUM:</span>
                    <span className="text-emerald-400 font-mono">SHA-256: 0x8F9B...D2E1 Validated</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">REAL-TIME PROXY:</span>
                    <span className="text-white font-medium">ProRes 422 HQ Real-time 10-Bit HLS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">SCRATCH STORAGE:</span>
                    <span className="text-white font-medium">Tier 0 NVMe High-IOPS Cinema Array</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">STATE PERSISTENCE:</span>
                    <span className="text-[#FFE066] font-medium">Continuous Micro-Checkpoint Active</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[7.5px] text-white/50">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    VAULT: SECURE & VERIFIED
                  </span>
                  <span className="text-white/30">CLICK CHIP TO PIN</span>
                </div>
              </div>
            </div>

            {/* CORNER 3: BOTTOM-LEFT (Optics, Depth of Field Calculator & Transmission) */}
            <div 
              className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-40 pointer-events-auto"
              onMouseEnter={() => setActiveCorner('bl')}
              onMouseLeave={() => setActiveCorner(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCorner(p => p === 'bl' ? null : 'bl');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono-tech text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'bl' || pinnedCorner === 'bl')
                    ? 'bg-[#12131A] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-[#D4AF37]/50 text-white/80'
                }`}
                title="Click to pin or hover for optical DOF and ray-trace calculator"
              >
                {/* Animated Subtle Bullet */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37] shadow-[0_0_8px_#d4af37]" />
                </span>
                {/* Short Smart Name */}
                <span className="font-bold tracking-wider text-[#FFE066]">DOF // {safeCamera.aperture || 'T1.2'}</span>
                {pinnedCorner === 'bl' && <Pin className="w-2.5 h-2.5 text-[#E5A919]" />}
              </button>

              {/* Huge Details Popover with Deep DOF Jargon */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-bottom-left z-50 text-left font-mono-tech ${
                  (activeCorner === 'bl' || pinnedCorner === 'bl')
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#d4af37] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase">OPTICAL BENCH & DEPTH OF FIELD CALCULATOR</span>
                  </div>
                  <button 
                    onClick={() => setPinnedCorner(p => p === 'bl' ? null : 'bl')}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={pinnedCorner === 'bl' ? "Unpin details" : "Pin details"}
                  >
                    {pinnedCorner === 'bl' ? <PinOff className="w-3 h-3 text-[#E5A919]" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight">
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">PRIMARY GLASS</span>
                    <span className="text-[#FFE066] font-bold text-[9.5px] truncate block">{safeCamera.focalLength || '18mm Cinema Master'}</span>
                  </div>
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">CALCULATED DOF SLICE</span>
                    <span className="text-white font-mono font-bold text-[9.5px]">1.8cm Razor Plane (CoC 0.015mm)</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[8px] text-white/70 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">IRIS TRANSMISSION:</span>
                    <span className="text-white font-medium">{safeCamera.aperture || 'T1.2'} Calibrated (Geometric f/1.18)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">CIRCLE OF CONFUSION:</span>
                    <span className="text-white font-medium">CoC: 0.015mm (Super35/LF Cinema Criterion)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">FOCUS PLANES:</span>
                    <span className="text-[#FFE066] font-medium">Near: 0.341m | Far: 0.359m (Volume: 18mm Razor)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">HYPERFOCAL DISTANCE:</span>
                    <span className="text-white font-medium">H = 2.45m @ T1.2 (Subject Distance: 0.35m)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">IRIS ARCHITECTURE:</span>
                    <span className="text-white font-medium">11 Curved Blades • Oval Anamorphic Bokeh</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">PHOTOMETRIC SENSITIVITY:</span>
                    <span className="text-emerald-400 font-medium">{safeCamera.iso || 'ISO 200'} Native Base • -1.2 EV Push Pull</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[7.5px] text-white/50">
                  <span className="flex items-center gap-1.5 text-[#FFE066] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                    DOF PLANE: ULTRA RAZOR FOCUS
                  </span>
                  <span className="text-white/30">CLICK CHIP TO PIN</span>
                </div>
              </div>
            </div>

            {/* CORNER 4: BOTTOM-RIGHT (Writer, Director, DP, Sound & Production) */}
            <div 
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 pointer-events-auto"
              onMouseEnter={() => setActiveCorner('br')}
              onMouseLeave={() => setActiveCorner(null)}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCorner(p => p === 'br' ? null : 'br');
                }}
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono-tech text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'br' || pinnedCorner === 'br')
                    ? 'bg-[#12131A] border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-purple-400/50 text-white/80'
                }`}
                title="Click to pin or hover for director and screenplay credits"
              >
                {/* Animated Subtle Bullet */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                </span>
                {/* Short Smart Name */}
                <span className="font-bold tracking-wider text-purple-300">CREW // DIR</span>
                {pinnedCorner === 'br' && <Pin className="w-2.5 h-2.5 text-purple-400" />}
              </button>

              {/* Huge Details Popover with Deep Writer & Director Jargon */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-full right-0 mb-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-purple-500/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-bottom-right z-50 text-left font-mono-tech ${
                  (activeCorner === 'br' || pinnedCorner === 'br')
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase">DIRECTOR SLATE & WRITERS GUILD</span>
                  </div>
                  <button 
                    onClick={() => setPinnedCorner(p => p === 'br' ? null : 'br')}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    title={pinnedCorner === 'br' ? "Unpin details" : "Pin details"}
                  >
                    {pinnedCorner === 'br' ? <PinOff className="w-3 h-3 text-purple-400" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight">
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">DIRECTOR</span>
                    <span className="text-purple-300 font-bold text-[9.5px] truncate block">{directorName || 'Rakib Himon'}</span>
                  </div>
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">SCREENPLAY / WRITER</span>
                    <span className="text-white font-mono font-bold text-[9.5px] truncate block">{directorName || 'Rakib Himon'} & Guild</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[8px] text-white/70 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">DIR. OF PHOTOGRAPHY:</span>
                    <span className="text-white font-medium">Anamorphic Rigging & Optics Division</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">PRODUCTION DESIGN:</span>
                    <span className="text-white font-medium">Bengali Neo-Futurism Atelier / CineArt Dhaka</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">COLOR SCIENCE:</span>
                    <span className="text-[#FFE066] font-medium">ACES 2065-1 Film Timing (Kodak 5219 Print)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ACOUSTIC DESIGN:</span>
                    <span className="text-white font-medium">36Hz Infrasonic Sub-Bass Suite + Spatial Cue</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">PRODUCTION SLATE:</span>
                    <span className="text-white font-medium">Day 03 // Scene 01 // Master Setup Alpha</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[7.5px] text-white/50">
                  <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    A RAWx MASTER STORYBOARD
                  </span>
                  <span className="text-white/30">CLICK CHIP TO PIN</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Cinema Stage Slot: Super Animated Titles with Curated Storytelling Positioning */}
        {showMasterTitles && (
          <div className="absolute inset-0 z-[30] pointer-events-none p-4 sm:p-8 overflow-hidden select-none">
            {/* Primary Storytelling Title Container (Choreographed per-slide layout) */}
            <div className={`absolute ${titleLayout.titleContainerClass} flex flex-col ${
              titleLayout.titleAlign === 'left' ? 'items-start text-left' :
              titleLayout.titleAlign === 'right' ? 'items-end text-right' :
              'items-center text-center'
            } transition-all duration-300 pointer-events-none max-w-4xl`}>
              {/* Massive Glowing Bengali Headline with Anek Bangla & Metallic Gold */}
              {showTitleBn && (
                <h1
                  className={`font-anek ${
                    isSideOrSplit
                      ? titleScale === 'ultra'
                        ? 'text-5xl sm:text-7xl md:text-8xl'
                        : titleScale === 'standard'
                        ? 'text-3xl sm:text-5xl md:text-6xl'
                        : 'text-4xl sm:text-6xl md:text-7xl'
                      : titleScale === 'ultra'
                      ? 'text-7xl sm:text-9xl md:text-[9.5rem] lg:text-[11rem] xl:text-[12rem] tracking-wider'
                      : titleScale === 'standard'
                      ? 'text-5xl sm:text-7xl md:text-8xl tracking-wide'
                      : 'text-6xl sm:text-8xl md:text-9xl lg:text-[7.5rem] xl:text-[8.75rem] 2xl:text-[10rem] tracking-wide sm:tracking-wider'
                  } font-black leading-[1.05] transition-all duration-300 w-full ${
                    titleLayout.titleAlign === 'left' ? 'text-left' :
                    titleLayout.titleAlign === 'right' ? 'text-right' :
                    'text-center'
                  } select-none text-metallic-gold drop-shadow-[0_0_35px_rgba(234,179,8,0.45)] ${
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
                  {safeFrame.bengaliTitle || 'দৃষ্টি / সূচনা'}
                </h1>
              )}

              {/* English Cinzel Main Title */}
              {showTitleEn && (
                <h2
                  className={`font-cinzel ${
                    isSideOrSplit
                      ? 'text-base sm:text-xl md:text-2xl font-bold tracking-[0.2em] mt-1.5 sm:mt-2'
                      : 'text-xl sm:text-3xl md:text-4xl font-bold tracking-[0.2em] mt-2 sm:mt-3'
                  } uppercase drop-shadow-2xl transition-all duration-300 ${
                    titleLayout.titleAlign === 'left' ? 'text-left' :
                    titleLayout.titleAlign === 'right' ? 'text-right' :
                    'text-center'
                  } ${
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
                  {safeFrame.title || 'THE SINGULARITY'}
                </h2>
              )}

              {/* Telemetry Subtitle Tagline & Layout Archetype indicator */}
              {showTagline && (
                <div className={`mt-1.5 flex items-center gap-2 flex-wrap ${
                  titleLayout.titleAlign === 'left' ? 'justify-start' :
                  titleLayout.titleAlign === 'right' ? 'justify-end' :
                  'justify-center'
                }`}>
                  <p className={`font-mono-tech text-[10px] sm:text-xs tracking-[0.2em] font-semibold uppercase drop-shadow-md transition-all duration-300 ${
                    activeAnim === 'neon' ? 'super-title-neon text-cyan-300' : 'text-[#d4af37]'
                  }`}>
                    SC01-SH{safeFrame.epNumber} // {safeFrame.tagline || 'THE FIRST GAZE INTO THE UNKNOWN'}
                  </p>
                  <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300/80 font-mono-tech tracking-wider uppercase">
                    {titleLayout.name}
                  </span>
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

        {/* Quick Edit & Title Toggle Trigger on Frame Hover */}
        <div className="absolute top-3 right-32 sm:right-36 z-[40] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 transition-opacity">
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
      </div>
    </div>
  );
};
