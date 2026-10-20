/**
 * RAWx Studio — Master Cinema Optical Stage
 * Public API: CinemaStage component
 * Implements center-focus sharpness, peripheral motion blur, vertical panning, and HUD overlays.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { toBengaliNumerals } from '../../utils/engine';
import { Sliders, Crop, Volume2, VolumeX, Upload, MoveVertical, Play, Pause, Video } from 'lucide-react';

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
    updateShot
  } = useStudioStore();

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
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleStageDrop}
        className={`relative w-full shadow-2xl overflow-hidden border border-[#D4AF37]/20 rounded-xs group ${
          isPanToolActive ? 'cursor-ns-resize' : ''
        }`}
      >
        {/* Base Media Layer */}
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
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `center ${panY}%`,
              objectFit: fitMode === 'contain' ? 'contain' : 'cover'
            }}
          />
        ) : (
          <div 
            className="absolute inset-0 w-full h-full bg-cover transition-all"
            style={{
              backgroundImage: `url('${imageUrl}')`,
              backgroundPosition: `center ${panY}%`,
              backgroundSize: fitMode === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat'
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

        {/* 35mm Grain Overlay */}
        {visibility.grain && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '3px 3px'
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

        {/* HUD Data Readouts */}
        {visibility.hudData && (
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-10 text-[9px] font-mono tracking-wider text-[#8A8A8A]">
            <div className="flex justify-between items-start">
              <div className="text-[#FFE066]">
                PLAYBACK // FILE_{epNumStr}<br />
                FORMAT: RAW 14-BIT ARRI
              </div>
              <div className="text-right">
                NODE: DHAKA_01<br />
                <span className="text-[#4ADE80] inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                  SECURE ARCHIVE
                </span>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                FOCAL: {activeLens}<br />
                DOF: 1.8cm // {currentTheme.tag || 'MACRO EYES'}
              </div>
              <div className="text-right">
                A <span style={{ color: titleColor }} className="font-bold">RAWx</span> STORYBOARD<br />
                DIRECTOR: RAKIB HIMON
              </div>
            </div>
          </div>
        )}

        {/* Bengali + English Cinema Title Lockup */}
        {visibility.titlesAll && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
            {/* Episode Badge */}
            {visibility.badge && (
              <div className="mb-2 px-2.5 py-0.5 rounded-xs bg-black/60 border border-[#D4AF37]/40 text-[10px] font-mono tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                <span className="font-['Noto_Serif_Bengali']">পর্ব {bnEpNumStr}</span>
                <span className="text-white/40">//</span>
                <span>EP {epNumStr}</span>
              </div>
            )}

            {/* Glowing Main Bengali Title */}
            {visibility.titleBn && (
              <h1 
                className="text-4xl sm:text-6xl font-['Noto_Serif_Bengali'] font-bold drop-shadow-[0_0_20px_rgba(212,175,55,0.7)]"
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

            {/* Bengali Poetic Caption */}
            {visibility.caption && (
              <p className="text-xs sm:text-sm font-['Noto_Serif_Bengali'] text-[#FFE066] mt-2 max-w-lg drop-shadow">
                {currentShot.bengaliDesc || 'মহাজাগতিক শূন্যতায় চেতনার পরম প্রসারণ'}
              </p>
            )}

            {/* Tagline Readout */}
            {visibility.tagline && (
              <p className="text-[10px] font-mono tracking-[0.2em] text-[#8A8A8A] mt-1 uppercase">
                {currentShot.tagline || currentTheme.tag}
              </p>
            )}

            {/* Sound Cue Pill */}
            <div className="mt-3 px-2 py-0.5 rounded-full bg-black/70 border border-white/10 text-[9px] font-mono text-[#8A8A8A] flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>{currentTheme.soundCue || 'Sub-bass pulse 36Hz'}</span>
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

        {/* Floating Quick Media Upload Trigger */}
        <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
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
