/**
 * RAWx Studio — Master Cinema Optical Stage
 * Public API: CinemaStage component
 * Implements center-focus sharpness, peripheral motion blur, vertical panning, and HUD overlays.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { toBengaliNumerals, calculateMultiLayerZoom } from '../../utils/engine';
import { Sliders, Crop, Volume2, VolumeX, Upload, MoveVertical, Play, Pause, Video, Pin, PinOff, X, Sparkles, Type, ZoomIn } from 'lucide-react';
import { TechnicalJargonOverlay } from '../../components/TechnicalJargonOverlay';
import { MultiLayerZoomControls } from '../../components/optics/MultiLayerZoomControls';

const sampleCinemaImages = [
  "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1519638399535-1b036603ac77?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80"
];

const colorPalette = ["#ffffff", "#d4af37", "#ff4b4b", "#4b9eff", "#00ffcc", "#ff8c00", "#e0e0e0"];

export const CinemaStage: React.FC = () => {
  const {
    activeShotIndex,
    project,
    isPlaying,
    isPanToolActive,
    setShotPanY,
    isGuidesActive,
    visibility,
    aspectRatio,
    fitMode,
    activeLut,
    activeLens,
    updateShot,
    setVisibilityItem,
    foregroundZoom,
    backgroundZoom,
    isVertigoLinked
  } = useStudioStore();

  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const zoomTransforms = calculateMultiLayerZoom(backgroundZoom, foregroundZoom, isVertigoLinked);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [startPanY, setStartPanY] = useState(50);
  const [hudFeedback, setHudFeedback] = useState<number | null>(null);
  const hudTimerRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  // Technical Jargon Overlay State (Appears in corners on stage hover)
  const [isStageHovered, setIsStageHovered] = useState(false);
  const [isJargonPinned, setIsJargonPinned] = useState(false);

  // 4-Corner Interactive Micro-HUD State
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [pinnedCorner, setPinnedCorner] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

  // Center Telemetry & Dialogue Hover / Pin State
  const [isCenterHovered, setIsCenterHovered] = useState(false);
  const [isCenterPinned, setIsCenterPinned] = useState(false);
  const showCenterExpanded = isCenterHovered || isCenterPinned;

  const currentShot = project.shots[activeShotIndex] || {};
  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];
  const epNumStr = String(activeShotIndex + 1).padStart(3, '0');
  const bnEpNumStr = toBengaliNumerals(epNumStr);
  const titleColor = colorPalette[activeShotIndex % colorPalette.length];

  const panY = currentShot.panY !== undefined ? currentShot.panY : 50;
  const imageUrl = currentShot.imageUrl || sampleCinemaImages[activeShotIndex % sampleCinemaImages.length];
  const isVideo = Boolean(
    currentShot.isVideo !== undefined
      ? currentShot.isVideo
      : (imageUrl && (
          imageUrl.startsWith('data:video') ||
          /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(imageUrl)
        ))
  );

  // Synchronize video element playback with timeline isPlaying
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  }, [isPlaying, isVideo, activeShotIndex, imageUrl]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setVideoCurrentTime(videoRef.current.currentTime);
      setVideoDuration(videoRef.current.duration || 0);
    }
  };

  const handleStageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      updateShot(activeShotIndex, { imageUrl: url, isVideo: isVid });
    }
  };

  const handleStageFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      updateShot(activeShotIndex, { imageUrl: url, isVideo: isVid });
    }
    e.target.value = '';
  };

  // Drag interaction for Vertical Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isPanToolActive) return;
    setIsDragging(true);
    setDragStartY(e.clientY);
    setStartPanY(panY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY;
    // Drag down increases offset, drag up decreases
    const deltaPercent = (deltaY / 300) * 50;
    const newPan = Math.max(0, Math.min(100, Math.round(startPanY + deltaPercent)));
    setShotPanY(activeShotIndex, newPan);
    setHudFeedback(newPan);
    clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudFeedback(null), 1200);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Aspect ratio frame dimensions
  const getAspectStyle = () => {
    switch (aspectRatio) {
      case '2.39:1': return { aspectRatio: '2.39 / 1', maxHeight: '82vh', maxWidth: '196vh' };
      case '16:9': return { aspectRatio: '16 / 9', maxHeight: '86vh', maxWidth: '153vh' };
      case '4:3': return { aspectRatio: '4 / 3', maxHeight: '88vh', maxWidth: '117vh' };
      case '4:5': return { aspectRatio: '4 / 5', maxHeight: '88vh', maxWidth: '70vh' };
      case '1:1': return { aspectRatio: '1 / 1', maxHeight: '82vh', maxWidth: '82vh' };
      case '9:16': return { aspectRatio: '9 / 16', maxHeight: '88vh', maxWidth: '49vh' };
      default: return { aspectRatio: '16 / 9', maxHeight: '86vh' };
    }
  };

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#030304] select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Floating HUD Pill for Pan Drag */}
      {hudFeedback !== null && (
        <div 
          id="pan-hud-pill"
          className="fixed top-12 left-1/2 -translate-x-1/2 bg-[#0B0B0B]/90 border border-[#D4AF37] px-3 py-1 rounded-full text-xs font-mono text-[#FFE066] shadow-2xl flex items-center gap-2 z-50 animate-fadeIn"
        >
          <MoveVertical className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>PAN Y: {hudFeedback}%</span>
          <div className="w-16 h-1 bg-[#121212] rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-[#D4AF37]" style={{ width: `${hudFeedback}%` }} />
          </div>
        </div>
      )}

      {/* Frame Container */}
      <div 
        style={getAspectStyle()}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsStageHovered(true)}
        onMouseLeave={() => setIsStageHovered(false)}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleStageDrop}
        className={`relative w-full shadow-2xl overflow-hidden border border-[#D4AF37]/20 rounded-xs group ${
          isPanToolActive ? 'cursor-ns-resize' : ''
        }`}
      >
        {/* Base Media Layer with Background Multi-Layer Zoom & Optical Depth of Field */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden transition-transform duration-200 ease-out origin-center pointer-events-none"
          style={{
            transform: zoomTransforms.bgTransform,
            filter: zoomTransforms.bgDepthBlur !== 'none' ? zoomTransforms.bgDepthBlur : undefined
          }}
        >
          {isVideo ? (
            <video
              key={imageUrl}
              ref={videoRef}
              src={imageUrl}
              autoPlay
              loop
              muted={isVideoMuted}
              playsInline
              preload="auto"
              onTimeUpdate={handleVideoTimeUpdate}
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${panY}%`,
                objectFit: fitMode === 'contain' ? 'contain' : 'cover'
              }}
            />
          ) : (
            <div 
              className="w-full h-full bg-cover transition-all"
              style={{
                backgroundImage: `url('${imageUrl}')`,
                backgroundPosition: `center ${panY}%`,
                backgroundSize: fitMode === 'contain' ? 'contain' : 'cover',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
        </div>

        {/* Optical Post FX: Edge Motion Blur (photo-motion-edges) */}
        {visibility.motionBlur && (
          <div
            className="photo-motion-edges z-[3] pointer-events-none"
            style={{
              backgroundImage: !isVideo ? `url('${imageUrl}')` : undefined,
              backgroundPosition: `center ${panY}%`,
              backgroundSize: fitMode === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
              opacity: 0.75
            }}
          />
        )}

        {/* Optical Center Focus & Edge Blur Shader Vignette */}
        {visibility.vignette && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.85) 100%)'
            }}
          />
        )}

        {/* Director Framing Guides */}
        {(isGuidesActive || visibility.guides) && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Rule of Thirds */}
            <div className="absolute left-1/3 inset-y-0 w-px bg-[#D4AF37]/30" />
            <div className="absolute left-2/3 inset-y-0 w-px bg-[#D4AF37]/30" />
            <div className="absolute top-1/3 inset-x-0 h-px bg-[#D4AF37]/30" />
            <div className="absolute top-2/3 inset-x-0 h-px bg-[#D4AF37]/30" />
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#FFE066]/60 rounded-full" />
          </div>
        )}

        {/* Real-Time 'technical-jargon' overlay appearing in Stage corners on hover */}
        <TechnicalJargonOverlay
          focalLength="35mm"
          aperture="T1.2"
          lensName={activeLens || 'Zeiss Supreme Prime 35mm T1.5'}
          aspectRatio={aspectRatio}
          shotNumber={epNumStr}
          timecode="00:00:00:00"
          isStageHovered={isStageHovered}
          isPinned={isJargonPinned}
          onTogglePin={() => setIsJargonPinned(p => !p)}
          showTitles={visibility.titlesAll}
          onToggleTitles={() => setVisibilityItem('titlesAll', !visibility.titlesAll)}
        />

        {/* ========================================================================= */}
        {/* 4-CORNER NANO HUD SYSTEM: Animated Subtle Bullets & Short Smart Names      */}
        {/* ========================================================================= */}
        {visibility.hudData && (
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
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'tl' || pinnedCorner === 'tl')
                    ? 'bg-[#12131A] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-[#D4AF37]/50 text-white/80'
                }`}
                title="Click to pin or hover for playback & sensor telemetry"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5A919] shadow-[0_0_8px_#E5A919]" />
                </span>
                <span className="font-bold tracking-wider text-[#FFE066]">REC // SH{epNumStr}</span>
                {pinnedCorner === 'tl' && <Pin className="w-2.5 h-2.5 text-[#E5A919]" />}
              </button>

              {/* Huge Details Popover */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-full left-0 mt-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-top-left z-50 text-left font-mono ${
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
                  >
                    {pinnedCorner === 'tl' ? <PinOff className="w-3 h-3 text-[#E5A919]" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8.5px] leading-tight">
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">SHOT / TAKE</span>
                    <span className="text-[#FFE066] font-bold text-[9.5px]">SC01-SH{epNumStr} // TAKE 04</span>
                  </div>
                  <div className="bg-black/60 p-2 rounded border border-white/5">
                    <span className="text-white/40 block text-[7px] tracking-wider uppercase">TIMECODE</span>
                    <span className="text-white font-mono font-bold text-[9.5px]">00:00:00:00</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1.5 text-[8px] text-white/70 border-t border-white/5 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">SENSOR ARCHITECTURE:</span>
                    <span className="text-white font-medium">ARRI ALEV III Large Format CMOS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">STREAM & FORMAT:</span>
                    <span className="text-[#FFE066] font-semibold">RAW 14-BIT ARRI (1.8 Gbps)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">COLOR PIPELINE:</span>
                    <span className="text-white font-medium">ARRIRAW LogC4 // ACEScg 1.3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ASPECT RATIO:</span>
                    <span className="text-white font-medium">{aspectRatio} Cinema Scope</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ROTARY SHUTTER:</span>
                    <span className="text-white font-medium">172.8° • 1/50.0s @ 24.000 FPS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORNER 2: TOP-RIGHT (Cluster Node, Cloud Vault) */}
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
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'tr' || pinnedCorner === 'tr')
                    ? 'bg-[#12131A] border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-emerald-400/50 text-white/80'
                }`}
                title="Click to pin or hover for cloud node archive details"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                <span className="font-bold tracking-wider text-emerald-300">NODE // DHAKA_01</span>
                {pinnedCorner === 'tr' && <Pin className="w-2.5 h-2.5 text-emerald-400" />}
              </button>

              {/* Huge Details Popover */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-full right-0 mt-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-emerald-500/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-top-right z-50 text-left font-mono ${
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
                  >
                    {pinnedCorner === 'tr' ? <PinOff className="w-3 h-3 text-emerald-400" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="space-y-1.5 text-[8px] text-white/70">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">GATEWAY CLUSTER:</span>
                    <span className="text-emerald-300 font-bold">DHAKA_01 (Edge Master)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">VAULT PROTOCOL:</span>
                    <span className="text-white font-medium">AES-GCM-256 ENCRYPTED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">NETWORK PIPELINE:</span>
                    <span className="text-white font-medium">10GbE Fiber Direct-to-Disk</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">CRYPTO CHECKSUM:</span>
                    <span className="text-emerald-400 font-mono">SHA-256 Validated OK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORNER 3: BOTTOM-LEFT (Optics & Depth of Field Calculator) */}
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
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'bl' || pinnedCorner === 'bl')
                    ? 'bg-[#12131A] border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-[#D4AF37]/50 text-white/80'
                }`}
                title="Click to pin or hover for optical DOF specs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37] shadow-[0_0_8px_#d4af37]" />
                </span>
                <span className="font-bold tracking-wider text-[#FFE066]">DOF // T1.2</span>
                {pinnedCorner === 'bl' && <Pin className="w-2.5 h-2.5 text-[#E5A919]" />}
              </button>

              {/* Huge Details Popover with Deep DOF Jargon */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-full left-0 mb-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-bottom-left z-50 text-left font-mono ${
                  (activeCorner === 'bl' || pinnedCorner === 'bl')
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#d4af37] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-wider uppercase">OPTICAL BENCH & DEPTH OF FIELD</span>
                  </div>
                  <button 
                    onClick={() => setPinnedCorner(p => p === 'bl' ? null : 'bl')}
                    className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {pinnedCorner === 'bl' ? <PinOff className="w-3 h-3 text-[#E5A919]" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="space-y-1.5 text-[8px] text-white/70">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">PRIMARY GLASS:</span>
                    <span className="text-[#FFE066] font-bold">{activeLens}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">CALCULATED DOF SLICE:</span>
                    <span className="text-white font-medium">1.8cm Razor Plane (CoC 0.015mm)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">IRIS TRANSMISSION:</span>
                    <span className="text-white font-medium">T1.2 Physically Calibrated</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">HYPERFOCAL DISTANCE:</span>
                    <span className="text-white font-medium">H = 2.45m @ T1.2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">IRIS GEOMETRY:</span>
                    <span className="text-white font-medium">11 Curved Blades • Oval Anamorphic Bokeh</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CORNER 4: BOTTOM-RIGHT (Writer, Director & Crew) */}
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
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
                  (activeCorner === 'br' || pinnedCorner === 'br')
                    ? 'bg-[#12131A] border-purple-400 text-white shadow-[0_0_15px_rgba(192,132,252,0.35)]'
                    : 'bg-[#090A0F]/80 hover:bg-[#0E0E14]/95 border-white/10 hover:border-purple-400/50 text-white/80'
                }`}
                title="Click to pin or hover for director and screenplay credits"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                </span>
                <span className="font-bold tracking-wider text-purple-300">CREW // DIR</span>
                {pinnedCorner === 'br' && <Pin className="w-2.5 h-2.5 text-purple-400" />}
              </button>

              {/* Huge Details Popover with Deep Writer & Director Jargon */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute bottom-full right-0 mb-2 w-80 sm:w-96 bg-[#07080C]/95 backdrop-blur-2xl border border-purple-500/40 rounded-lg p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] transition-all duration-200 origin-bottom-right z-50 text-left font-mono ${
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
                  >
                    {pinnedCorner === 'br' ? <PinOff className="w-3 h-3 text-purple-400" /> : <Pin className="w-3 h-3" />}
                  </button>
                </div>

                <div className="space-y-1.5 text-[8px] text-white/70">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">DIRECTOR:</span>
                    <span className="text-purple-300 font-bold">{project.director || 'Rakib Himon'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">SCREENPLAY / WRITER:</span>
                    <span className="text-white font-medium">{project.director || 'Rakib Himon'} & Guild</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">COLOR SCIENCE:</span>
                    <span className="text-[#FFE066] font-medium">ACES 2065-1 Film Timing</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 uppercase">ACOUSTIC SUITE:</span>
                    <span className="text-white font-medium">36Hz Infrasonic Sub-Bass Resonance</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bengali + English Cinema Title Lockup with Foreground Multi-Layer Zoom & Optical Depth Shadow */}
        {visibility.titlesAll && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4 transition-transform duration-200 ease-out origin-center"
            style={{
              transform: zoomTransforms.fgTransform,
              filter: zoomTransforms.fgShadow
            }}
          >
            {/* Episode Badge */}
            {visibility.badge && (
              <div className="mb-2 px-2.5 py-0.5 rounded-xs bg-black/60 border border-[#D4AF37]/40 text-[10px] font-mono tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                <span className="font-['Noto_Serif_Bengali']">পর্ব {bnEpNumStr}</span>
                <span className="text-white/40">//</span>
                <span>EP {epNumStr}</span>
              </div>
            )}

            {/* Glowing Main Bengali Title (Sized to cover the whole word) */}
            {visibility.titleBn && (
              <h1 
                className="text-6xl sm:text-8xl md:text-9xl lg:text-[7.5rem] xl:text-[8.75rem] 2xl:text-[10rem] font-['Noto_Serif_Bengali'] font-black leading-[1.05] tracking-wide sm:tracking-wider w-full text-center drop-shadow-[0_0_35px_rgba(212,175,55,0.85)]"
                style={{ color: titleColor }}
              >
                {currentShot.bengaliTitle || currentTheme.sub}
              </h1>
            )}

            {/* English Cinematic Subtitle */}
            {visibility.titleEn && (
              <h2 className="text-lg sm:text-2xl font-['Cinzel'] tracking-[0.25em] font-bold text-[#EDEDED] mt-1 drop-shadow-md">
                {currentShot.title || currentTheme.title}
              </h2>
            )}

            {/* Tagline Readout */}
            {visibility.tagline && (
              <p className="text-[10px] font-mono tracking-[0.2em] text-[#D4AF37] mt-1.5 uppercase drop-shadow">
                SC01-SH{epNumStr} // {currentShot.tagline || currentTheme.tag}
              </p>
            )}

            {/* Clean Below-Title Telemetry & Details Drawer on Hover / Tap */}
            <div 
              className="mt-3.5 pointer-events-auto flex flex-col items-center max-w-xl w-full"
              onMouseEnter={() => setIsCenterHovered(true)}
              onMouseLeave={() => setIsCenterHovered(false)}
            >
              {!showCenterExpanded ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCenterPinned(true);
                  }}
                  className="group px-3 py-1 bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 hover:border-[#D4AF37]/50 rounded-full font-mono text-[9px] text-white/70 hover:text-white flex items-center gap-2 cursor-pointer transition-all duration-300 shadow-xl"
                  title="Hover or tap to reveal full shot specs & narrative dialogue"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E5A919]" />
                  </span>
                  <span className="font-bold text-[#FFE066]">SC01-SH{epNumStr}</span>
                  <span className="text-white/30">•</span>
                  <span className="tracking-widest uppercase">TELEMETRY & CAPTIONS</span>
                  <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 group-hover:text-[#FFE066] uppercase">
                    HOVER / TAP
                  </span>
                </button>
              ) : (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-[#07080C]/95 backdrop-blur-2xl border border-[#D4AF37]/40 rounded-xl p-3.5 shadow-2xl animate-fadeIn transition-all duration-300 text-left font-mono"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-[9.5px] text-[#FFE066] font-bold uppercase">
                      <Sparkles className="w-3 h-3 text-[#E5A919]" />
                      <span>SC01-SH{epNumStr} // SHOT SPECS & DIRECTOR'S VISION</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCenterPinned(p => !p)}
                        className={`px-2 py-0.5 rounded text-[8px] flex items-center gap-1 cursor-pointer transition-colors ${
                          isCenterPinned ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/10 text-white/70'
                        }`}
                      >
                        {isCenterPinned ? <PinOff className="w-2.5 h-2.5" /> : <Pin className="w-2.5 h-2.5" />}
                        <span>{isCenterPinned ? 'PINNED' : 'PIN'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCenterPinned(false);
                          setIsCenterHovered(false);
                        }}
                        className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {visibility.caption && (
                    <div className="mb-2.5 px-3 py-1.5 rounded bg-black/60 border border-white/5 text-center">
                      <p className="font-['Noto_Serif_Bengali'] italic text-xs text-[#FFE066] leading-relaxed">
                        "{currentShot.bengaliDesc || 'মহাজাগতিক শূন্যতায় চেতনার পরম প্রসারণ'}"
                      </p>
                      <div className="mt-1 text-[7.5px] text-white/40 uppercase tracking-widest">
                        WRITER & DIRECTOR: {project.director || 'Rakib Himon'}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center text-[8.5px]">
                    <div className="bg-black/60 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[7px] uppercase">LENS</span>
                      <span className="text-white font-medium truncate block">{activeLens}</span>
                    </div>
                    <div className="bg-black/60 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[7px] uppercase">DOF CALC</span>
                      <span className="text-[#FFE066] font-bold">1.8cm Slice</span>
                    </div>
                    <div className="bg-black/60 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[7px] uppercase">COLOR LUT</span>
                      <span className="text-white font-medium uppercase truncate block">{activeLut}</span>
                    </div>
                    <div className="bg-black/60 p-1.5 rounded border border-white/5">
                      <span className="text-white/40 block text-[7px] uppercase">SOUND CUE</span>
                      <span className="text-emerald-400 font-medium truncate block">{currentTheme.soundCue || '36Hz Sub'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Transport Controls Bar */}
        {isVideo && (
          <div className="absolute bottom-3 left-4 right-4 z-40 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded border border-[#D4AF37]/30 flex items-center gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
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
              <div className="h-full bg-[#D4AF37]" style={{ width: `${videoDuration ? (videoCurrentTime / videoDuration) * 100 : 0}%` }} />
            </div>
            <span className="text-[9px] font-mono text-[#8A8A8A]">
              {Math.floor(videoCurrentTime)}s / {Math.floor(videoDuration)}s
            </span>
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-2 py-0.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#D4AF37]/40 text-[9px] text-[#D4AF37] rounded flex items-center gap-1 ml-1 cursor-pointer"
            >
              <Upload className="w-2.5 h-2.5" />
              Replace
            </button>
          </div>
        )}

        {/* Floating Quick Media Upload & Title Toggle Trigger */}
        <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomControlsOpen(prev => !prev);
              }}
              className={`px-2.5 py-1 border rounded text-[10px] font-mono flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-colors ${
                isZoomControlsOpen
                  ? 'bg-black/90 border-[#D4AF37] text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                  : 'bg-black/70 border-white/20 text-white/60 hover:text-white'
              }`}
              title="Multi-Layer Zoom: Scale Foreground & Background independently with optical depth perception"
            >
              <ZoomIn className="w-3 h-3 text-[#D4AF37]" />
              <span>ZOOM</span>
              <span className="text-[#FFE066] font-bold tabular-nums">
                {foregroundZoom.toFixed(1)}x/{backgroundZoom.toFixed(1)}x
              </span>
            </button>

            {isZoomControlsOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <MultiLayerZoomControls
                  onClose={() => setIsZoomControlsOpen(false)}
                />
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisibilityItem('titlesAll', !visibility.titlesAll);
            }}
            className={`px-2.5 py-1 border rounded text-[10px] font-mono flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-colors ${
              visibility.titlesAll
                ? 'bg-black/90 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                : 'bg-black/70 border-white/20 text-white/50 hover:text-white'
            }`}
            title="Toggle Master Titles (Hotkey: T)"
          >
            <Type className="w-3 h-3" />
            <span>TITLES: {visibility.titlesAll ? 'ON' : 'OFF'}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-2.5 py-1 bg-black/85 hover:bg-black border border-[#D4AF37]/50 rounded text-[10px] font-mono text-[#FFE066] flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-colors"
            title="Upload 4K Video or Image onto this Shot"
          >
            <Upload className="w-3 h-3 text-[#D4AF37]" />
            Upload Video / Image
          </button>
        </div>

        {/* Drag Over Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-[#D4AF37]/10 border-2 border-dashed border-[#D4AF37] flex flex-col items-center justify-center gap-2 pointer-events-none backdrop-blur-xs">
            <Upload className="w-8 h-8 text-[#FFE066] animate-bounce" />
            <span className="text-xs font-mono text-[#FFE066] font-bold tracking-wider">
              DROP 4K VIDEO OR IMAGE TO ATTACH TO SHOT #{activeShotIndex + 1}
            </span>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleStageFileInput}
          accept="image/*,video/*,.mp4,.webm,.mov,.ogg,.m4v"
          className="hidden"
        />
      </div>
    </div>
  );
};
