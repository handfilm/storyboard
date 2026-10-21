/**
 * @file /src/components/player/OpticalMonitor.tsx
 * @description Dedicated Optical Monitor Panel for RAWx Storyboard Studio.
 * 
 * Strict Directives:
 * - 2.39:1 Cinema aspect ratio playback canvas with zero-latency video/image rendering.
 * - High-visibility permanent transport buttons (Play, Pause, -1F, +1F, Loop).
 * - Strictly NO hover scaling, tooltip popovers, or dynamic overlays on mouse movement.
 * - Hardware-accelerated transitions (transition-colors duration-150 ease-out).
 * - Clear monospace timecode readouts: Slide Timecode (00:00:12:00), Global Timecode, Frame Index (SH001 / 100).
 */

import React, { useRef, useEffect, useState } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { r2StorageService } from '../../services/r2StorageService';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Upload, 
  Download, 
  Film,
  Camera,
  Layers,
  Radio
} from 'lucide-react';

interface OpticalMonitorProps {
  currentSlide?: SlideDraft;
  currentIndex: number;
  totalSlides: number;
  aspectRatio: AspectRatioType;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  isLooping: boolean;
  slideTimeSec: number; // 0.0s to 12.0s
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onStepFrame: (forward: boolean) => void;
  onScrubSlideTime: (timeSec: number) => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onChangeAspectRatio?: (aspect: AspectRatioType) => void;
  onUploadMedia?: (file: File) => void;
  onCaptureStill?: () => void;
  projectTitle?: string;
  className?: string;
}

export const OpticalMonitor: React.FC<OpticalMonitorProps> = ({
  currentSlide,
  currentIndex,
  totalSlides,
  aspectRatio = '2.39:1',
  playbackMode,
  isPlaying,
  isLooping,
  slideTimeSec,
  onTogglePlay,
  onToggleLoop,
  onStepFrame,
  onScrubSlideTime,
  onSelectPlaybackMode,
  onChangeAspectRatio,
  onUploadMedia,
  onCaptureStill,
  projectTitle = 'RAWx Storyboard',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isVideo = Boolean(
    currentSlide?.isVideo ||
    (currentSlide?.remoteUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(currentSlide.remoteUrl))
  );

  const mediaUrl = currentSlide?.remoteUrl
    ? r2StorageService.getStreamUrl(currentSlide.remoteUrl, isVideo)
    : '';

  // Zero-latency video element sync with slideTimeSec and isPlaying
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isVideo, currentIndex]);

  useEffect(() => {
    if (videoRef.current && isVideo && videoRef.current.duration) {
      const targetTime = (slideTimeSec / SLIDE_DURATION_SEC) * videoRef.current.duration;
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.15) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [slideTimeSec, isVideo]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // SMPTE-style Timecode Format (HH:MM:SS:FF @ 24fps)
  const formatTimecode = (sec: number) => {
    const totalFrames = Math.floor(sec * 24);
    const ff = String(totalFrames % 24).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  const slideTc = formatTimecode(slideTimeSec);
  const globalSec = (currentIndex * SLIDE_DURATION_SEC) + slideTimeSec;
  const globalTc = formatTimecode(globalSec);
  const totalDurationSec = totalSlides * SLIDE_DURATION_SEC;
  const totalDurationTc = formatTimecode(totalDurationSec);
  const currentFrameInSlide = Math.min(SLIDE_TOTAL_FRAMES_24FPS, Math.floor(slideTimeSec * 24) + 1);

  // Aspect ratio styling (Default 2.39:1 Cinema)
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '2.39:1': return 'aspect-[2.39/1] max-w-[94vw] max-h-[72vh]';
      case '16:9': return 'aspect-[16/9] max-w-[90vw] max-h-[76vh]';
      case '4:3': return 'aspect-[4/3] max-w-[78vw] max-h-[78vh]';
      case '1:1': return 'aspect-square max-w-[70vw] max-h-[70vh]';
      case '9:16': return 'aspect-[9/16] max-w-[46vw] max-h-[80vh]';
      default: return 'aspect-[2.39/1] max-w-[94vw] max-h-[72vh]';
    }
  };

  const handleCaptureStill = () => {
    if (onCaptureStill) {
      onCaptureStill();
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finish = () => {
      ctx.fillStyle = '#E6E6E6';
      ctx.font = 'bold 36px Cinzel, serif';
      ctx.fillText(currentSlide?.titleEn || `FRAME ${String(currentIndex + 1).padStart(3, '0')}`, 60, canvas.height - 80);

      ctx.fillStyle = '#FFE066';
      ctx.font = '24px Noto Serif Bengali, serif';
      ctx.fillText(currentSlide?.titleBn || '', 60, canvas.height - 40);

      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E5A919';
      ctx.fillText(`SH${String(currentIndex + 1).padStart(3, '0')} // 12.0s // 2.39:1 CINEMA`, canvas.width - 450, canvas.height - 50);

      const a = document.createElement('a');
      a.download = `OPTICAL_SH${String(currentIndex + 1).padStart(3, '0')}_12S.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    if (mediaUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        finish();
      };
      img.onerror = () => finish();
      img.src = mediaUrl;
    } else {
      finish();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex flex-col items-center justify-between p-3 sm:p-5 bg-[#070709] select-none overflow-hidden ${className}`}
    >
      {/* 2.39:1 Cinema Playback Canvas (Rock Solid, Zero Hover Scaling, Zero Wobble) */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
        <div className={`relative ${getAspectClass()} w-full bg-[#0B0B0F] border border-[#262633] shadow-[0_20px_70px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center transition-colors duration-150 ease-out`}>
          {/* Zero-Latency Video / Image Rendering */}
          {mediaUrl ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                muted={isMuted}
                loop={isLooping}
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090D] p-6 text-center">
              <Film className="w-12 h-12 text-white/20 mb-3" />
              <p className="font-mono text-xs text-[#E6E6E6] font-bold tracking-widest uppercase">
                NO ASSET ATTACHED // SHOT {String(currentIndex + 1).padStart(3, '0')}
              </p>
              <p className="font-mono text-[10.5px] text-white/40 mt-1 max-w-sm">
                Attach a 4K video or still asset locally or stream via Cloudflare R2 zero-egress bucket.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-3.5 py-1.5 bg-[#1C1C24] hover:bg-[#262633] text-[#E6E6E6] border border-[#353545] rounded text-xs font-mono font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-[#E5A919]" />
                Attach Media
              </button>
            </div>
          )}

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

          {/* Static Corner Badges (Permanently Readable, Zero Hover Tooltips) */}
          <div className="absolute top-3 left-3 bg-[#111116]/90 border border-[#272733] px-2.5 py-1 text-[10px] font-mono text-[#E6E6E6] font-bold tracking-wider rounded flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5A919]" />
            <span>SH{String(currentIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/40">|</span>
            <span className="text-[#FFE066]">12.000s</span>
            <span className="text-white/40">|</span>
            <span className="text-white/60">F{String(currentFrameInSlide).padStart(3, '0')}/288</span>
          </div>

          <div className="absolute top-3 right-3 bg-[#111116]/90 border border-[#272733] px-2.5 py-1 text-[10px] font-mono text-[#E6E6E6] font-bold tracking-wider rounded flex items-center gap-2">
            <span className="text-white/40">OPTICAL</span>
            <span className="text-[#FFE066]">{aspectRatio} CINEMA</span>
            <span className="text-white/40">|</span>
            <span className={playbackMode === 'sequence' ? 'text-emerald-400' : 'text-amber-400'}>
              {playbackMode === 'sequence' ? 'ANIMATIC' : 'SOLO SCRUB'}
            </span>
          </div>

          {/* Scene Title Caption (Unboxed Typography, No Pill Sandwiches) */}
          {(currentSlide?.titleEn || currentSlide?.titleBn) && (
            <div className="absolute bottom-3 left-4 max-w-lg bg-black/85 backdrop-blur-sm px-3.5 py-2 border border-white/10 rounded">
              {currentSlide.titleBn && (
                <p className="text-[#FFE066] text-sm font-serif font-bold tracking-wide">
                  {currentSlide.titleBn}
                </p>
              )}
              {currentSlide.titleEn && (
                <p className="text-[#E6E6E6] text-xs font-mono font-semibold tracking-wider uppercase mt-0.5">
                  {currentSlide.titleEn}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Permanently Visible High-Visibility Transport Controls Dock */}
      {/* High-contrast styling: Stark white/amber text on deep charcoal #18181D with crisp borders */}
      <div className="w-full max-w-5xl mt-3 px-4 py-2.5 bg-[#18181D] border border-[#2E2E38] rounded-md shadow-2xl flex flex-col gap-2 font-mono">
        {/* Top: 12.0s Slide Scrubber & Continuous Monospace Timecode */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/50 tracking-wider uppercase shrink-0 font-bold">
            {playbackMode === 'solo' ? 'SOLO [00:00 - 00:12]' : 'SLIDE SCRUB'}
          </span>

          <div className="flex-1 flex items-center">
            <input
              type="range"
              min="0"
              max={SLIDE_DURATION_SEC}
              step="0.0416" // 1 frame @ 24fps
              value={slideTimeSec}
              onChange={(e) => onScrubSlideTime(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#262633] rounded-none accent-[#E5A919] cursor-pointer"
            />
          </div>

          {/* Timecode Displays (Monospace, Zero Blur) */}
          <div className="flex items-center gap-2 text-[11px] font-bold shrink-0">
            <span className="text-[#FFE066]">{slideTc}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50">00:00:12:00</span>
            <span className="text-white/20">|</span>
            <span className="text-white/40 text-[9.5px]">GLOBAL:</span>
            <span className="text-[#E6E6E6]">{globalTc}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50 text-[10px]">{totalDurationTc}</span>
          </div>
        </div>

        {/* Bottom: Permanent High-Visibility Transport Buttons */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#252530]">
          {/* Left Transport Controls: Step Back, Play/Pause, Step Forward, Loop, Audio */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onStepFrame(false)}
              className="px-2.5 py-1.5 bg-[#212128] hover:bg-[#2C2C36] text-[#E6E6E6] border border-[#353542] rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out"
              title="Step Back 1 Frame (1/24s)"
            >
              <SkipBack className="w-3.5 h-3.5 text-[#E5A919]" />
              <span>-1F</span>
            </button>

            <button
              onClick={onTogglePlay}
              className={`px-4 py-1.5 rounded text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out shadow-sm ${
                isPlaying
                  ? 'bg-[#E5A919] hover:bg-[#FFB703] text-black'
                  : 'bg-[#2A2A35] hover:bg-[#343442] text-[#FFFFFF] border border-[#404052]'
              }`}
              title={isPlaying ? "Pause Playback (Space)" : "Start Playback (Space)"}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>PLAY</span>
                </>
              )}
            </button>

            <button
              onClick={() => onStepFrame(true)}
              className="px-2.5 py-1.5 bg-[#212128] hover:bg-[#2C2C36] text-[#E6E6E6] border border-[#353542] rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out"
              title="Step Forward 1 Frame (1/24s)"
            >
              <SkipForward className="w-3.5 h-3.5 text-[#E5A919]" />
              <span>+1F</span>
            </button>

            <button
              onClick={onToggleLoop}
              className={`px-3 py-1.5 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out border ${
                isLooping
                  ? 'bg-[#E5A919]/20 text-[#FFE066] border-[#E5A919]/60'
                  : 'bg-[#212128] text-white/50 border-[#353542] hover:text-white'
              }`}
              title="Toggle Looping"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>LOOP {isLooping ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setIsMuted(m => !m)}
              className={`p-1.5 rounded border cursor-pointer transition-colors duration-150 ease-out ${
                !isMuted ? 'bg-[#2A2A35] text-[#FFE066] border-[#E5A919]/50' : 'bg-[#212128] text-white/40 border-[#353542]'
              }`}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Center: Playback Mode Toggles (Seamless Auto-Advance vs Solo Scrub) */}
          <div className="flex items-center bg-[#131318] p-0.5 rounded border border-[#2B2B36] text-[11px]">
            <button
              onClick={() => onSelectPlaybackMode('sequence')}
              className={`px-3 py-1 rounded transition-colors duration-150 ease-out cursor-pointer font-bold ${
                playbackMode === 'sequence'
                  ? 'bg-[#E5A919] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Seamless auto-advance across Slide 001 through N every 12.0s"
            >
              SEQUENCE (ANIMATIC)
            </button>
            <button
              onClick={() => onSelectPlaybackMode('solo')}
              className={`px-3 py-1 rounded transition-colors duration-150 ease-out cursor-pointer font-bold ${
                playbackMode === 'solo'
                  ? 'bg-[#E5A919] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Isolates playback strictly within that slide's 00:00:00 - 00:00:12 range"
            >
              SOLO SCRUB
            </button>
          </div>

          {/* Right: Aspect Ratio, Rec/Still Export, Fullscreen */}
          <div className="flex items-center gap-2">
            {onChangeAspectRatio && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-white/40 uppercase hidden lg:inline">ASPECT:</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => onChangeAspectRatio(e.target.value as AspectRatioType)}
                  className="bg-[#212128] border border-[#353542] text-[#E6E6E6] text-[10.5px] rounded px-2 py-1 outline-none cursor-pointer"
                >
                  <option value="2.39:1">2.39:1 Cinema</option>
                  <option value="16:9">16:9 Widescreen</option>
                  <option value="4:3">4:3 Academy</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="9:16">9:16 Vertical</option>
                </select>
              </div>
            )}

            <button
              onClick={handleCaptureStill}
              className="px-3 py-1 bg-[#212128] hover:bg-[#2D2D38] border border-[#3A3A48] text-[#E6E6E6] hover:text-[#FFE066] rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out"
              title="Capture 4K Cinema Slate Still (PNG)"
            >
              <Camera className="w-3.5 h-3.5 text-[#E5A919]" />
              <span>REC / STILL</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-[#212128] hover:bg-[#2C2C36] text-white/70 hover:text-white border border-[#353542] rounded cursor-pointer transition-colors duration-150 ease-out"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
