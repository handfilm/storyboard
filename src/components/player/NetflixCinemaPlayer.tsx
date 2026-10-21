/**
 * @file /src/components/player/NetflixCinemaPlayer.tsx
 * @description State-of-the-art Netflix-Style Fullscreen Dynamic Media Player.
 * 
 * Features:
 * - Dynamic Duration: Effortlessly plays media of arbitrary length (seconds, minutes, or hours long).
 * - Autohiding Control HUD: Smooth fade-out after 2.5s of mouse inactivity during playback, hides cursor.
 * - Layered Visuals: Full CSS LUT filter, Bloom, Film Grain, Vignette, and responsive Cinematic Titles intact.
 * - Title HUD Toggle: Titles and effects animate in on launch and can be toggled on/off via HUD CC button.
 * - Netflix-grade Scrubber: Real buffered range progress, hover timestamp tooltip, smooth drag scrubbing.
 * - Modern Transport: Master Play/Pause, 10s Skip Backward/Forward, Previous/Next Shot, Speed Popover,
 *   Volume slider with memory, Picture-in-Picture, and True Fullscreen API.
 * - Center Flash Beacon: Pulsing feedback beacon on Play/Pause/Skip actions.
 * - Comprehensive Keyboard Hotkeys: Space, Arrows, M, F, T, Escape.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { getLutFilterCSS } from '../../utils/engine';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  Volume1, 
  VolumeX, 
  Maximize, 
  Minimize, 
  ChevronLeft, 
  X, 
  Settings, 
  Subtitles, 
  Film, 
  SkipBack, 
  SkipForward,
  PictureInPicture2
} from 'lucide-react';

interface NetflixCinemaPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  aspectRatio: AspectRatio;
  directorName?: string;
  projectTitle?: string;
  onUploadMedia?: (file: File) => void;
}

export const NetflixCinemaPlayer: React.FC<NetflixCinemaPlayerProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex,
  onSelectFrame,
  aspectRatio,
  directorName = 'Rakib Himon',
  projectTitle = 'RAWx Storyboard Studio'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const hideHudTimerRef = useRef<number | null>(null);

  const activeFrame: AnthologyFrame = frames[currentIndex] || frames[0];

  // Dynamic Media Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(12.0); // dynamically replaced once metadata loads
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // HUD & Tooltip States
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [showTitles, setShowTitles] = useState(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [centerBeacon, setCenterBeacon] = useState<{ type: 'play' | 'pause' | 'fwd' | 'rwd'; id: number } | null>(null);

  const isVideo = Boolean(
    activeFrame?.isVideo !== undefined
      ? activeFrame.isVideo
      : (activeFrame?.imageUrl && (
          activeFrame.imageUrl.startsWith('data:video') ||
          /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(activeFrame.imageUrl)
        ))
  );

  // Trigger brief center beacon animation
  const triggerBeacon = useCallback((type: 'play' | 'pause' | 'fwd' | 'rwd') => {
    setCenterBeacon({ type, id: Date.now() });
    setTimeout(() => {
      setCenterBeacon(prev => (prev?.type === type ? null : prev));
    }, 600);
  }, []);

  // Format dynamic timecode: standard HH:MM:SS or MM:SS
  const formatTime = useCallback((seconds: number, isRemaining: boolean = false) => {
    const sec = Math.max(0, seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);

    const formattedM = String(m).padStart(2, '0');
    const formattedS = String(s).padStart(2, '0');

    const prefix = isRemaining ? '-' : '';
    if (h > 0 || duration >= 3600) {
      const formattedH = String(h).padStart(2, '0');
      return `${prefix}${formattedH}:${formattedM}:${formattedS}`;
    }
    return `${prefix}${formattedM}:${formattedS}`;
  }, [duration]);

  // Reset & restart autohiding HUD timer (2.5 seconds inactivity)
  const showControlsTemporarily = useCallback(() => {
    setIsHudVisible(true);
    if (hideHudTimerRef.current) {
      window.clearTimeout(hideHudTimerRef.current);
      hideHudTimerRef.current = null;
    }

    if (isPlaying && !isDraggingScrubber && !isSpeedMenuOpen) {
      hideHudTimerRef.current = window.setTimeout(() => {
        setIsHudVisible(false);
      }, 2500);
    }
  }, [isPlaying, isDraggingScrubber, isSpeedMenuOpen]);

  // Mouse movement listener on full viewport
  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Play / Pause Master Toggle
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          triggerBeacon('play');
        }).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
        triggerBeacon('pause');
      }
    } else {
      setIsPlaying(p => {
        const next = !p;
        triggerBeacon(next ? 'play' : 'pause');
        return next;
      });
    }
    showControlsTemporarily();
  }, [showControlsTemporarily, triggerBeacon]);

  // Skip 10s Backward
  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      setCurrentTime(videoRef.current.currentTime);
    } else {
      setCurrentTime(t => Math.max(0, t - 10));
    }
    triggerBeacon('rwd');
    showControlsTemporarily();
  }, [showControlsTemporarily, triggerBeacon]);

  // Skip 10s Forward
  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
      setCurrentTime(videoRef.current.currentTime);
    } else {
      setCurrentTime(t => Math.min(duration, t + 10));
    }
    triggerBeacon('fwd');
    showControlsTemporarily();
  }, [duration, showControlsTemporarily, triggerBeacon]);

  // Volume & Mute control
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const nextMute = !videoRef.current.muted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
    } else {
      setIsMuted(m => !m);
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      if (clamped > 0 && videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Playback speed selection
  const changeSpeed = useCallback((spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setIsSpeedMenuOpen(false);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Native Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Picture in Picture toggle
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.warn('PiP not supported or rejected:', err);
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Video Time Update & Buffer Progress
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Calculate buffer progress
      const buf = videoRef.current.buffered;
      if (buf && buf.length > 0) {
        const cur = videoRef.current.currentTime;
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= cur && cur <= buf.end(i)) {
            setBufferedTime(buf.end(i));
            break;
          }
        }
      }
    }
  };

  // Video metadata loaded (determines actual dynamic duration)
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        setDuration(dur);
      }
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  // Timeline scrubber scrubbing
  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    setIsDraggingScrubber(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pct * duration;
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pct * 100);
    setHoverTime(pct * duration);

    if (isDraggingScrubber) {
      const targetTime = pct * duration;
      setCurrentTime(targetTime);
      if (videoRef.current) {
        videoRef.current.currentTime = targetTime;
      }
    }
  };

  const handleScrubberMouseLeave = () => {
    if (!isDraggingScrubber) {
      setHoverTime(null);
    }
  };

  // Global mouse up for scrubber drag release
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingScrubber) {
        setIsDraggingScrubber(false);
        setHoverTime(null);
        showControlsTemporarily();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDraggingScrubber, showControlsTemporarily]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard Navigation inside Cinema Player
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          setShowTitles(t => !t);
          showControlsTemporarily();
          break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePlay, skipBackward, skipForward, handleVolumeChange, volume, toggleMute, toggleFullscreen, onClose, showControlsTemporarily]);

  // Simulated playback time for image plates
  useEffect(() => {
    if (!isVideo && isPlaying) {
      const interval = window.setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            return 0; // loop
          }
          return prev + 0.1 * playbackSpeed;
        });
      }, 100);
      return () => window.clearInterval(interval);
    }
  }, [isVideo, isPlaying, duration, playbackSpeed]);

  if (!isOpen) return null;

  // Active adjustments and CSS LUT filter
  const filterCSS = getLutFilterCSS(activeFrame?.lutFilter || 'cinematic', activeFrame?.adjustments);
  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-[100] bg-black flex items-center justify-center select-none overflow-hidden font-sans transition-all duration-300 ${
        !isHudVisible && isPlaying ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* 1. MEDIA VIEWPORT LAYER (Full Bleed Video / Image Canvas) */}
      <div 
        onClick={togglePlay}
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
      >
        {isVideo && activeFrame?.imageUrl ? (
          <video
            ref={videoRef}
            src={activeFrame.imageUrl}
            autoPlay
            playsInline
            loop
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-contain pointer-events-auto transition-transform duration-300"
            style={{ filter: filterCSS }}
          />
        ) : activeFrame?.imageUrl ? (
          <img
            src={activeFrame.imageUrl}
            alt={activeFrame.title || "Cinema Still"}
            className="w-full h-full object-contain pointer-events-auto transition-transform duration-300"
            style={{ filter: filterCSS }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#07070a] text-zinc-600">
            <Film className="w-16 h-16 mb-4 text-[#d4af37]/40 animate-pulse" />
            <p className="font-mono text-sm tracking-widest text-zinc-400">NO MEDIA ATTACHED TO THIS SHOT</p>
          </div>
        )}

        {/* Cinematic Film Grain & Vignette Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-15"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

        {/* 2. CINEMATIC TITLES & EFFECTS LAYER (Toggleable via Title HUD Button) */}
        {showTitles && (
          <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end p-8 sm:p-14 md:p-20 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-500 animate-fadeIn">
            <div className="max-w-3xl space-y-3">
              {/* Bangla Epic Wordmark */}
              {activeFrame?.bengaliTitle && (
                <h1 className="font-anek text-4xl sm:text-6xl md:text-7xl font-black tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-[#FFE066] via-[#F5A623] to-[#D4AF37] drop-shadow-[0_4px_30px_rgba(245,166,35,0.7)] leading-none">
                  {activeFrame.bengaliTitle}
                </h1>
              )}

              {/* English Cinematic Display Title */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-[#fbbf24] border border-amber-500/40">
                  SH{String(currentIndex + 1).padStart(3, '0')}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-[0.2em] text-white uppercase drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)]">
                  {activeFrame?.title || 'UNTITLED SHOT'}
                </h2>
              </div>

              {/* Tagline / Dialogue Subtitle */}
              {activeFrame?.tagline && (
                <p className="text-sm sm:text-base text-zinc-300 font-light tracking-wide max-w-xl italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                  "{activeFrame.tagline}"
                </p>
              )}

              {/* Director & Color Credits */}
              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                <span>DIRECTOR: <strong className="text-zinc-200">{directorName}</strong></span>
                <span>•</span>
                <span>LUT: <strong className="text-[#fbbf24] uppercase">{activeFrame?.lutFilter || 'CINEMATIC'}</strong></span>
                <span>•</span>
                <span>FPS: <strong className="text-zinc-200">24.0 LOCKED</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Center Flash Action Beacon (Netflix style pulsing beacon) */}
        {centerBeacon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-110 animate-ping shadow-[0_0_40px_rgba(251,191,36,0.6)]">
              {centerBeacon.type === 'play' && <Play className="w-10 h-10 fill-current text-[#fbbf24] ml-1" />}
              {centerBeacon.type === 'pause' && <Pause className="w-10 h-10 fill-current text-[#fbbf24]" />}
              {centerBeacon.type === 'fwd' && <RotateCw className="w-10 h-10 text-[#fbbf24]" />}
              {centerBeacon.type === 'rwd' && <RotateCcw className="w-10 h-10 text-[#fbbf24]" />}
            </div>
          </div>
        )}
      </div>

      {/* 3. AUTOHIDING TOP HEADER BAR (Netflix back arrow, title, exit) */}
      <div 
        className={`absolute top-0 inset-x-0 z-50 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-all duration-300 ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Back to Studio Stage */}
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2.5 text-zinc-300 hover:text-white transition-colors cursor-pointer group"
          title="Back to Studio Stage (Esc)"
        >
          <div className="p-2 rounded-full bg-black/50 border border-white/10 group-hover:border-[#fbbf24] group-hover:bg-[#fbbf24]/10 transition-all">
            <ChevronLeft className="w-5 h-5 text-zinc-300 group-hover:text-[#fbbf24]" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider font-semibold">
            BACK TO STAGE
          </span>
        </button>

        {/* Active Title Header Lockup */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[11px] font-mono tracking-widest text-[#fbbf24] uppercase">
            {projectTitle} • SHOT {String(currentIndex + 1).padStart(3, '0')} / {String(frames.length).padStart(3, '0')}
          </span>
          <span className="font-serif text-sm font-bold text-white tracking-wide uppercase">
            {activeFrame?.bengaliTitle ? `${activeFrame.bengaliTitle} // ` : ''}{activeFrame?.title || 'CINEMA MONITOR'}
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-black/50 hover:bg-white/10 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition-all cursor-pointer"
          title="Exit Fullscreen Player (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 4. AUTOHIDING BOTTOM DOCK HUD (Timeline Scrubber & State-of-the-Art Controls) */}
      <div 
        className={`absolute bottom-0 inset-x-0 z-50 px-6 pb-6 pt-12 flex flex-col gap-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-all duration-300 ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Master Netflix-Grade Timeline Scrubber */}
        <div 
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          className="group relative w-full h-4 flex items-center cursor-pointer"
        >
          {/* Background Rail */}
          <div className="w-full h-1 group-hover:h-2 bg-white/20 rounded-full transition-all relative overflow-hidden">
            {/* Loaded Buffer Track */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/40 rounded-full"
              style={{ width: `${Math.min(100, bufferedPercent)}%` }}
            />
            {/* Played Progress Track */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              style={{ width: `${Math.min(100, playedPercent)}%` }}
            />
          </div>

          {/* Scrubber Knob */}
          <div 
            className="absolute -translate-x-1/2 w-3.5 h-3.5 group-hover:w-4.5 group-hover:h-4.5 rounded-full bg-[#fbbf24] border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all pointer-events-none"
            style={{ left: `${Math.min(100, Math.max(0, playedPercent))}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div 
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/20 text-white font-mono text-[10px] pointer-events-none shadow-lg whitespace-nowrap"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Lower Row Controls Dock */}
        <div className="flex items-center justify-between text-white">
          {/* Left Zone: Transport, Skips & Volume */}
          <div className="flex items-center gap-3">
            {/* Previous Shot */}
            <button
              type="button"
              onClick={() => onSelectFrame((currentIndex - 1 + frames.length) % frames.length)}
              className="p-2 text-zinc-300 hover:text-white hover:scale-105 transition-all cursor-pointer"
              title="Previous Shot"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Skip Backward 10s */}
            <button
              type="button"
              onClick={skipBackward}
              className="p-2 text-zinc-300 hover:text-[#fbbf24] hover:scale-105 transition-all cursor-pointer relative"
              title="Rewind 10 Seconds (Left Arrow)"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold mt-0.5">
                10
              </span>
            </button>

            {/* Master Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-white/10 hover:bg-[#fbbf24] text-white hover:text-black border border-white/20 transition-all cursor-pointer shadow-md"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Skip Forward 10s */}
            <button
              type="button"
              onClick={skipForward}
              className="p-2 text-zinc-300 hover:text-[#fbbf24] hover:scale-105 transition-all cursor-pointer relative"
              title="Forward 10 Seconds (Right Arrow)"
            >
              <RotateCw className="w-5 h-5" />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono font-bold mt-0.5">
                10
              </span>
            </button>

            {/* Next Shot */}
            <button
              type="button"
              onClick={() => onSelectFrame((currentIndex + 1) % frames.length)}
              className="p-2 text-zinc-300 hover:text-white hover:scale-105 transition-all cursor-pointer"
              title="Next Shot"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume Control Dock */}
            <div className="flex items-center gap-2 group/vol ml-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#fbbf24]" />
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-white/20 hover:bg-white/40 rounded-full appearance-none cursor-pointer accent-[#fbbf24] transition-all"
                aria-label="Volume level"
              />
            </div>

            {/* Live Monospace Timecode (Click to toggle remaining time) */}
            <button
              type="button"
              onClick={() => setShowRemainingTime(r => !r)}
              className="font-mono text-xs font-semibold text-zinc-300 hover:text-white ml-3 tabular-nums cursor-pointer px-2 py-1 rounded bg-black/40 border border-white/10"
              title="Click to toggle elapsed / remaining time"
            >
              <span className="text-[#fbbf24]">{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-1.5">/</span>
              <span className="text-zinc-400">
                {showRemainingTime ? formatTime(duration - currentTime, true) : formatTime(duration)}
              </span>
            </button>
          </div>

          {/* Right Zone: Titles Toggle, Speed Menu, PiP, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Cinematic Titles & Effects Toggle Button */}
            <button
              type="button"
              onClick={() => setShowTitles(t => !t)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                showTitles
                  ? 'bg-[#fbbf24]/20 border-[#fbbf24] text-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Cinematic Title Overlays (T)"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span>TITLES {showTitles ? 'ON' : 'OFF'}</span>
            </button>

            {/* Playback Speed Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpeedMenuOpen(o => !o)}
                className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-mono font-semibold text-zinc-200 hover:text-white transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {isSpeedMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 py-1 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl flex flex-col z-50 text-xs font-mono min-w-[70px]"
                >
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => changeSpeed(spd)}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${
                        playbackSpeed === spd ? 'text-[#fbbf24] font-bold' : 'text-zinc-400'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              type="button"
              onClick={togglePiP}
              className={`p-2 rounded hover:bg-white/10 transition-colors cursor-pointer ${
                isPiPActive ? 'text-[#fbbf24]' : 'text-zinc-300 hover:text-white'
              }`}
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* True Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-[#fbbf24]" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
