/**
 * @file /src/components/player/VideoPlayer.tsx
 * @description Production-Grade Video Player & Storyboard Canvas Engine.
 * 
 * Enforced Directives:
 * 1. UI De-Clutter: Zero floating tooltips, hover pop-overs, or transient popups directly on or around the canvas.
 * 2. High-Visibility Internal Transport Controls:
 *    - Permanently visible transport dock (#E6E6E6 on deep charcoal #18181D with crisp #2C2C35 borders)
 *    - Controls: Play, Pause, Step Back, Step Forward, Loop, Aspect Ratio, Rec/Export, and Clean Presentation Toggle
 *    - Controls never auto-hide unless user explicitly enables "Clean Presentation" mode
 *    - High-legibility monospace counters (Timecode 00:00:12:00, Frame 001/100, Mode tags) with zero blur interference
 * 3. Dual-Mode Playback Engine:
 *    - Sequence ("ANIMATIC / PLAY"): Runs Slide 1 -> N switching precisely at 12.0s per slide
 *    - Solo Scrub: Confined strictly within that slide's isolated 12.0s window
 * 4. Cloudflare R2 Streaming: HTTP byte-range scrub hook for zero-wait playback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Download, 
  Eye, 
  EyeOff, 
  Film, 
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Upload,
  Radio
} from 'lucide-react';

interface VideoPlayerProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  aspectRatio: AspectRatioType;
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onToggleLoop: () => void;
  onSelectSlide: (index: number) => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onChangeAspectRatio: (ratio: AspectRatioType) => void;
  onExportStill?: () => void;
  onExportSequence?: () => void;
  onUploadMedia?: (file: File) => void;
  projectTitle?: string;
  directorName?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  slides,
  activeSlideIndex,
  playbackMode,
  aspectRatio,
  isPlaying,
  isLooping,
  onTogglePlay,
  onToggleLoop,
  onSelectSlide,
  onPrevSlide,
  onNextSlide,
  onSelectPlaybackMode,
  onChangeAspectRatio,
  onExportStill,
  onExportSequence,
  onUploadMedia,
  projectTitle = 'Untitled Storyboard',
  directorName = 'Rakib Himon',
  className = ''
}) => {
  const safeSlideIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));
  const currentSlide: SlideDraft | undefined = slides[safeSlideIndex];

  // Local presentation state (Clean Presentation Mode hides transport for pristine review)
  const [isCleanPresentation, setIsCleanPresentation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [slideTimeSec, setSlideTimeSec] = useState(0); // 0.0s to 12.0s
  const [isScrubbingSlide, setIsScrubbingSlide] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(performance.now());

  // Detect whether media is video or image
  const isVideo = Boolean(
    currentSlide?.isVideo ||
    (currentSlide?.remoteUrl && /\.(mp4|webm|mov|m4v)($|\?)/i.test(currentSlide.remoteUrl))
  );

  // Synchronize Fullscreen Events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Dual-Mode Playback Engine (12.0s slide timer)
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTickTimeRef.current = performance.now();

    const loop = (time: number) => {
      const deltaSec = (time - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = time;

      setSlideTimeSec(prev => {
        const nextTime = prev + deltaSec;

        if (nextTime >= SLIDE_DURATION_SEC) {
          // Reached end of 12.0s slide window
          if (playbackMode === 'sequence') {
            // Sequence mode: advance to next slide
            if (safeSlideIndex < slides.length - 1) {
              onSelectSlide(safeSlideIndex + 1);
              return 0;
            } else {
              // End of timeline
              if (isLooping) {
                onSelectSlide(0);
                return 0;
              } else {
                onTogglePlay(); // Stop
                return SLIDE_DURATION_SEC;
              }
            }
          } else {
            // Solo Scrub mode: loop strictly within this slide's 12.0s window
            if (isLooping) {
              return 0;
            } else {
              onTogglePlay();
              return SLIDE_DURATION_SEC;
            }
          }
        }

        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playbackMode, safeSlideIndex, slides.length, isLooping, onSelectSlide, onTogglePlay]);

  // Reset slide time on manual slide switch
  useEffect(() => {
    setSlideTimeSec(0);
  }, [safeSlideIndex]);

  // Video Element Playback Sync
  useEffect(() => {
    if (videoRef.current && isVideo) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isVideo, safeSlideIndex]);

  // 1-Frame Step Controls (1/24s step = 0.0416s)
  const stepFrame = (forward: boolean) => {
    const frameDelta = 1 / 24;
    setSlideTimeSec(prev => {
      const target = forward ? prev + frameDelta : prev - frameDelta;
      return Math.max(0, Math.min(SLIDE_DURATION_SEC, target));
    });
  };

  // Timecode calculation for 12.0s slide
  const formatTimecode = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 24);
    const ff = String(totalFrames % 24).padStart(2, '0');
    const ss = String(Math.floor(seconds) % 60).padStart(2, '0');
    const mm = String(Math.floor(seconds / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  // Global Timeline Timecode
  const globalSec = (safeSlideIndex * SLIDE_DURATION_SEC) + slideTimeSec;
  const globalTc = formatTimecode(globalSec);
  const slideTc = formatTimecode(slideTimeSec);

  // Aspect ratio styling
  const getAspectStyle = () => {
    switch (aspectRatio) {
      case '2.39:1': return 'aspect-[2.39/1] max-w-[94vw] max-h-[76vh]';
      case '16:9': return 'aspect-[16/9] max-w-[90vw] max-h-[78vh]';
      case '4:3': return 'aspect-[4/3] max-w-[80vw] max-h-[80vh]';
      case '1:1': return 'aspect-square max-w-[72vw] max-h-[72vh]';
      case '9:16': return 'aspect-[9/16] max-w-[48vw] max-h-[82vh]';
      default: return 'aspect-[2.39/1] max-w-[94vw] max-h-[76vh]';
    }
  };

  // Direct scrub handling on internal 12s mini track
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSlideTimeSec(val);
    if (videoRef.current && isVideo && videoRef.current.duration) {
      videoRef.current.currentTime = (val / SLIDE_DURATION_SEC) * videoRef.current.duration;
    }
  };

  // Cloudflare R2 Edge Stream URL resolution
  const mediaUrl = currentSlide?.remoteUrl 
    ? r2StorageService.getStreamUrl(currentSlide.remoteUrl, isVideo)
    : '';

  const handleCaptureStill = () => {
    setIsExporting(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#08080C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const finish = () => {
      // Draw minimal dark-brutalist caption
      ctx.fillStyle = '#E6E6E6';
      ctx.font = 'bold 32px Cinzel, serif';
      ctx.fillText(currentSlide?.titleEn || 'STORYBOARD FRAME', 60, canvas.height - 80);

      ctx.fillStyle = '#FFE066';
      ctx.font = '24px Noto Serif Bengali, serif';
      ctx.fillText(currentSlide?.titleBn || '', 60, canvas.height - 45);

      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillStyle = '#E5A919';
      ctx.fillText(`FRAME ${String(safeSlideIndex + 1).padStart(3, '0')} // 12.0s // ${aspectRatio}`, canvas.width - 450, canvas.height - 50);

      const a = document.createElement('a');
      a.download = `STORYBOARD_SH${String(safeSlideIndex + 1).padStart(3, '0')}_12S.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      setIsExporting(false);
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
      className={`relative w-full h-full flex flex-col items-center justify-center bg-[#070709] select-none overflow-hidden ${className}`}
    >
      {/* Primary Video Player Canvas */}
      <div className={`relative ${getAspectStyle()} w-full bg-[#101014] border border-[#2A2A33] shadow-[0_12px_48px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center transition-all duration-150`}>
        {/* Layer 1: Media Render */}
        {mediaUrl ? (
          isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              crossOrigin="anonymous"
              muted={isMuted}
              loop={isLooping}
              playsInline
              className="w-full h-full object-cover"
              style={{
                objectPosition: `center ${currentSlide?.panY ?? 50}%`
              }}
            />
          ) : (
            <div
              className="w-full h-full bg-cover bg-no-repeat transition-all duration-150"
              style={{
                backgroundImage: `url(${mediaUrl})`,
                backgroundPosition: `center ${currentSlide?.panY ?? 50}%`
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0C0C10] p-6 text-center">
            <Film className="w-10 h-10 text-white/30 mb-3" />
            <p className="font-mono text-xs text-[#E6E6E6] font-bold tracking-widest uppercase">
              NO MEDIA ASSIGNED [SLIDE {String(safeSlideIndex + 1).padStart(3, '0')}]
            </p>
            <p className="font-mono text-[10px] text-white/40 mt-1 max-w-sm">
              Load edge assets from Cloudflare R2 (xvideos-r2.handsandhead.com) or upload a local 4K MP4 / WebP.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#1F1F27] hover:bg-[#2B2B36] text-[#E6E6E6] border border-[#383845] rounded text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-[#E5A919]" />
                Upload File
              </button>
            </div>
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

        {/* Minimal Non-Intrusive Corner Labels (Static, Zero Hover Popup) */}
        {!isCleanPresentation && (
          <>
            <div className="absolute top-3 left-3 bg-[#111116]/95 border border-[#272730] px-2.5 py-1 text-[10px] font-mono text-[#E6E6E6] font-bold tracking-wider rounded flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A919]" />
              <span>SH{String(safeSlideIndex + 1).padStart(3, '0')}</span>
              <span className="text-white/40">|</span>
              <span className="text-white/60">12.0s WINDOW</span>
            </div>

            <div className="absolute top-3 right-3 bg-[#111116]/95 border border-[#272730] px-2.5 py-1 text-[10px] font-mono text-[#E6E6E6] font-bold tracking-wider rounded flex items-center gap-2">
              <span className="text-white/40">RATIO</span>
              <span className="text-[#FFE066]">{aspectRatio}</span>
              <span className="text-white/40">|</span>
              <span className="text-white/80">{playbackMode === 'sequence' ? 'ANIMATIC' : 'SOLO'}</span>
            </div>

            {/* Slide Title Bottom Caption (Clean Typography, Zero Pill Sandwich) */}
            {(currentSlide?.titleEn || currentSlide?.titleBn) && (
              <div className="absolute bottom-3 left-4 max-w-lg bg-black/80 backdrop-blur-sm px-3.5 py-2 border border-white/10 rounded">
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
          </>
        )}
      </div>

      {/* Permanently Visible High-Contrast Internal Transport Controls */}
      {/* Only hides if user explicitly toggles isCleanPresentation */}
      {!isCleanPresentation ? (
        <div className="w-full max-w-5xl mt-3 px-4 py-2.5 bg-[#18181D] border border-[#2E2E38] rounded-md shadow-2xl flex flex-col gap-2">
          {/* Top Row: 12.0s Slide Scrubber & Precision Frame Readout */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-white/50 tracking-wider uppercase shrink-0">
              SLIDE [12.0S]
            </span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={SLIDE_DURATION_SEC}
                step="0.0416"
                value={slideTimeSec}
                onChange={handleScrubChange}
                className="w-full h-1.5 bg-[#262630] rounded-none accent-[#E5A919] cursor-pointer"
              />
            </div>
            {/* Slide Timecode + Global Timecode Monospace Readout */}
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold shrink-0">
              <span className="text-[#FFE066]">{slideTc}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/50">{formatTimecode(SLIDE_DURATION_SEC)}</span>
              <span className="text-white/20">|</span>
              <span className="text-white/40 text-[9.5px]">GLOBAL:</span>
              <span className="text-[#E6E6E6]">{globalTc}</span>
            </div>
          </div>

          {/* Bottom Row: High-Contrast Control Buttons */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#252530]">
            {/* Left Transport Cluster: Step Back, Play/Pause, Step Forward, Loop */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => stepFrame(false)}
                className="px-2.5 py-1.5 bg-[#212128] hover:bg-[#2C2C36] text-[#E6E6E6] border border-[#353542] rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors duration-150"
                title="Step Back 1 Frame (1/24s)"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">-1F</span>
              </button>

              <button
                onClick={onTogglePlay}
                className={`px-4 py-1.5 rounded font-mono text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ${
                  isPlaying
                    ? 'bg-[#E5A919] hover:bg-[#FFB703] text-black shadow-md'
                    : 'bg-[#2A2A35] hover:bg-[#343442] text-[#FFFFFF] border border-[#404052]'
                }`}
                title={isPlaying ? "Pause Playback" : "Start Playback"}
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
                onClick={() => stepFrame(true)}
                className="px-2.5 py-1.5 bg-[#212128] hover:bg-[#2C2C36] text-[#E6E6E6] border border-[#353542] rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors duration-150"
                title="Step Forward 1 Frame (1/24s)"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+1F</span>
              </button>

              <button
                onClick={onToggleLoop}
                className={`px-3 py-1.5 rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors duration-150 border ${
                  isLooping
                    ? 'bg-[#E5A919]/20 text-[#FFE066] border-[#E5A919]/60'
                    : 'bg-[#212128] text-white/50 border-[#353542] hover:text-white'
                }`}
                title="Toggle Looping Playback"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>LOOP {isLooping ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setIsMuted(m => !m)}
                className={`p-1.5 rounded border cursor-pointer transition-colors duration-150 ${
                  !isMuted ? 'bg-[#2A2A35] text-[#FFE066] border-[#E5A919]/50' : 'bg-[#212128] text-white/40 border-[#353542]'
                }`}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Center: Playback Mode (Sequence vs Solo Scrub) */}
            <div className="flex items-center bg-[#131317] p-0.5 rounded border border-[#2B2B36] text-[11px] font-mono">
              <button
                onClick={() => onSelectPlaybackMode('sequence')}
                className={`px-3 py-1 rounded transition-colors duration-150 cursor-pointer ${
                  playbackMode === 'sequence'
                    ? 'bg-[#E5A919] text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Sequentially play all slides (12s each)"
              >
                SEQUENCE (ANIMATIC)
              </button>
              <button
                onClick={() => onSelectPlaybackMode('solo')}
                className={`px-3 py-1 rounded transition-colors duration-150 cursor-pointer ${
                  playbackMode === 'solo'
                    ? 'bg-[#E5A919] text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Limit scrubbing strictly to current slide 12.0s"
              >
                SOLO SCRUB
              </button>
            </div>

            {/* Right: Aspect Ratio, Rec/Export, Fullscreen & Clean Presentation Toggle */}
            <div className="flex items-center gap-2">
              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1 font-mono text-[10px]">
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

              {/* Rec/Export Button */}
              <button
                onClick={handleCaptureStill}
                disabled={isExporting}
                className="px-3 py-1 bg-[#212128] hover:bg-[#2D2D38] border border-[#3A3A48] text-[#E6E6E6] hover:text-[#FFE066] rounded text-[11px] font-mono font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-150"
                title="Export High-Res 4K Still with 12s Slate"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'EXPORTING...' : 'REC / STILL'}</span>
              </button>

              {/* Clean Presentation Mode Toggle (Never auto-hides controls otherwise) */}
              <button
                onClick={() => setIsCleanPresentation(true)}
                className="p-1.5 bg-[#212128] hover:bg-[#2C2C36] text-white/70 hover:text-white border border-[#353542] rounded cursor-pointer transition-colors duration-150"
                title="Toggle Clean / Fullscreen Presentation Mode (Hides Controls)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 bg-[#212128] hover:bg-[#2C2C36] text-white/70 hover:text-white border border-[#353542] rounded cursor-pointer transition-colors duration-150"
                title="Toggle Window Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Floating Restore Button when in Clean Presentation Mode */
        <button
          onClick={() => setIsCleanPresentation(false)}
          className="fixed bottom-4 right-4 z-50 px-3.5 py-1.5 bg-[#18181D]/90 hover:bg-[#22222A] text-[#FFE066] border border-[#E5A919]/50 rounded font-mono text-xs flex items-center gap-2 cursor-pointer shadow-2xl transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>EXIT CLEAN PRESENTATION</span>
        </button>
      )}
    </div>
  );
};
