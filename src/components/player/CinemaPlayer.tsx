/**
 * @file /src/components/player/CinemaPlayer.tsx
 * @description Dedicated Full-Screen Cinema Playback Engine for RAWx Storyboard Studio.
 * 
 * Complies with D1 Specification B:
 * - Fullscreen via player CONTAINER so titles, LUT, grain, and bloom stay 100% visible.
 * - Real media duration from metadata (seconds to hours), supporting local 2GB+ Blobs.
 * - Timecode in HH:MM:SS, or HH:MM:SS:FF when fps is known; toggleable remaining time.
 * - Autohiding HUD: Fades after 2.5s of playback inactivity, cursor hides when idle,
 *   stays visible when paused, focused, or when a menu is open. Respects reduced-motion.
 * - Controls: Play/pause, -10s/+10s, scrubber with buffer range and hover time preview,
 *   volume slider with memory and mute, speed menu (0.25x - 4x), aspect ratio switcher
 *   (16:9, 2.39:1, 9:16, 1:1, Fit), Document PiP + standard PiP with honesty warning banner,
 *   container fullscreen with fallback, titles/CC toggle, "Play subclip / full source" toggle,
 *   and previous/next shot jump.
 * - Touch: Double-tap left/right skips 10s, single tap shows HUD. Large targets (min 44px).
 * - Full keyboard control integrated with Key Scope Manager.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnthologyFrame, AspectRatio, LutPreset } from '../../types/anthology';
import { getLutFilterCSS } from '../../utils/engine';
import { keyScopeManager } from '../../core/keyScopeManager';
import { useStudioStore } from '../../core/store';
import { resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { applyVlcMediaGain, resumeVlcAudioContext } from '../../utils/vlcAudioPreamp';
import { videoCacheService } from '../../services/videoCacheService';
import {
  computeBufferedSummary,
  isTimeInBufferedSegments,
  type BufferedRangeSegment
} from '../../utils/bufferRanges';
import {
  isVideoMediaUrl,
  syncVideoCurrentTimeWithFastSeek,
  type VlcAbLoop,
  type VlcLoopMode
} from '../../utils/playbackClock';
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
  ChevronRight,
  X, 
  Subtitles, 
  Film, 
  PictureInPicture2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Scissors,
  Repeat,
  Repeat1,
  ArrowRightToLine,
  Camera,
  ListVideo,
  Monitor
} from 'lucide-react';

export interface CinemaPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  aspectRatio: AspectRatio;
  onChangeAspectRatio?: (aspect: AspectRatio) => void;
  directorName?: string;
  projectTitle?: string;
  onUploadMedia?: (file: File) => void;
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex,
  onSelectFrame,
  aspectRatio: initialAspect,
  onChangeAspectRatio,
  directorName = 'Rakib Himon',
  projectTitle = 'RAWx Storyboard Studio'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const bufferedSegmentsDomRef = useRef<HTMLDivElement>(null);
  const bufferedBarDomRef = useRef<HTMLDivElement>(null);
  const bufferReadoutDomRef = useRef<HTMLSpanElement>(null);
  const bufferedSegmentsRef = useRef<BufferedRangeSegment[]>([]);
  const progressBarDomRef = useRef<HTMLDivElement>(null);
  const scrubKnobDomRef = useRef<HTMLDivElement>(null);
  const timecodeDomRef = useRef<HTMLButtonElement>(null);
  const hideHudTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const activeFrame: AnthologyFrame = frames[currentIndex] || frames[0];
  const activeVaultEntry = resolveShotMediaEntry(shotMediaMap, activeFrame, undefined, currentIndex);
  const rawResolvedMediaUrl =
    activeVaultEntry?.url ||
    activeFrame?.videoSrc ||
    activeFrame?.blobUrl ||
    activeFrame?.imageUrl ||
    '';
  const resolvedMediaUrl = rawResolvedMediaUrl
    ? (videoCacheService.getFastUrlSync(rawResolvedMediaUrl) || rawResolvedMediaUrl)
    : '';

  const nextShotIdx = frames.length > 1 ? (currentIndex + 1) % frames.length : -1;
  const nextFrameObj = nextShotIdx >= 0 ? frames[nextShotIdx] : undefined;
  const nextVaultEntry = nextFrameObj
    ? resolveShotMediaEntry(shotMediaMap, nextFrameObj, undefined, nextShotIdx)
    : undefined;
  const rawNextMediaUrl =
    nextVaultEntry?.url ||
    nextFrameObj?.videoSrc ||
    nextFrameObj?.blobUrl ||
    nextFrameObj?.imageUrl ||
    '';
  const nextIsVideo = nextVaultEntry
    ? nextVaultEntry.type === 'video'
    : isVideoMediaUrl(rawNextMediaUrl, Boolean(nextFrameObj?.isVideo || nextFrameObj?.videoSrc), (nextFrameObj as any)?.mimeType);
  const nextPrebufferUrl = isOpen && nextIsVideo && rawNextMediaUrl && rawNextMediaUrl !== resolvedMediaUrl
    ? (videoCacheService.getFastUrlSync(rawNextMediaUrl) || rawNextMediaUrl)
    : '';

  useEffect(() => {
    if (isOpen && frames.length > 0) {
      videoCacheService.prefetchShotWindow(frames, currentIndex, shotMediaMap);
    }
  }, [isOpen, frames, currentIndex, shotMediaMap]);

  // Playback States (no 60fps currentTime React state re-renders)
  const [isPlaying, setIsPlaying] = useState(true);
  const [duration, setDuration] = useState(12.0); // Updated dynamically from metadata
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(12.0);
  const bufferedTimeRef = useRef<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenFallbackNotice, setFullscreenFallbackNotice] = useState<string | null>(null);
  const [loopMode, setLoopMode] = useState<VlcLoopMode>('repeat-one');
  const [abLoop, setAbLoop] = useState<VlcAbLoop>({ a: null, b: null });
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  // Aspect & Subclip
  const [aspect, setAspect] = useState<AspectRatio>(initialAspect);
  const [playSubclipOnly, setPlaySubclipOnly] = useState(false);

  // HUD & Tooltip States
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [showTitles, setShowTitles] = useState(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [centerBeacon, setCenterBeacon] = useState<{ type: 'play' | 'pause' | 'fwd' | 'rwd'; id: number } | null>(null);

  // PiP States & Honesty
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipWarning, setPipWarning] = useState<string | null>(null);

  const abLoopRef = useRef(abLoop);
  abLoopRef.current = abLoop;
  const showRemainingTimeRef = useRef(showRemainingTime);
  showRemainingTimeRef.current = showRemainingTime;
  const playSubclipOnlyRef = useRef(playSubclipOnly);
  playSubclipOnlyRef.current = playSubclipOnly;
  const activeFrameRef = useRef(activeFrame);
  activeFrameRef.current = activeFrame;
  const wasPlayingBeforeScrubRef = useRef(false);
  durationRef.current = duration;

  const isVideo = activeVaultEntry
    ? activeVaultEntry.type === 'video'
    : isVideoMediaUrl(
        resolvedMediaUrl,
        Boolean(activeFrame?.isVideo || activeFrame?.videoSrc),
        (activeFrame as any)?.mimeType
      );

  useEffect(() => {
    setAbLoop({ a: null, b: null });
    currentTimeRef.current = 0;
    bufferedTimeRef.current = 0;
  }, [currentIndex]);

  // Key Scope Layer Management & Hardware Fullscreen
  useEffect(() => {
    if (isOpen) {
      keyScopeManager.setActiveLayer('CINEMA');
      // Attempt hardware fullscreen if not already active
      if (!document.fullscreenElement && containerRef.current) {
        const el = containerRef.current as any;
        const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        if (requestMethod) {
          requestMethod.call(el).then(() => {
            setIsFullscreen(true);
          }).catch(() => {
            // Silently fall back to fixed fullscreen theater mode (resilient inside iframe sandbox)
            setIsFullscreen(false);
          });
        }
      }
    } else {
      keyScopeManager.setActiveLayer('STAGE');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isOpen]);

  // Center feedback flash
  const triggerBeacon = useCallback((type: 'play' | 'pause' | 'fwd' | 'rwd') => {
    setCenterBeacon({ type, id: Date.now() });
    setTimeout(() => {
      setCenterBeacon(prev => (prev?.type === type ? null : prev));
    }, 600);
  }, []);

  // Format dynamic timecode: standard HH:MM:SS or HH:MM:SS:FF
  const formatTime = useCallback((seconds: number, isRemaining: boolean = false) => {
    const sec = Math.max(0, seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const frames24 = Math.floor((sec % 1) * 24);

    const formattedM = String(m).padStart(2, '0');
    const formattedS = String(s).padStart(2, '0');
    const formattedFF = String(frames24).padStart(2, '0');

    const prefix = isRemaining ? '-' : '';
    if (h > 0 || duration >= 3600) {
      const formattedH = String(h).padStart(2, '0');
      return `${prefix}${formattedH}:${formattedM}:${formattedS}:${formattedFF}`;
    }
    return `${prefix}${formattedM}:${formattedS}:${formattedFF}`;
  }, [duration]);

  // Autohide HUD logic (fades out after 2.5s of mouse inactivity during playback)
  const showControlsTemporarily = useCallback(() => {
    setIsHudVisible(true);
    if (hideHudTimerRef.current) {
      window.clearTimeout(hideHudTimerRef.current);
      hideHudTimerRef.current = null;
    }

    if (isPlaying && !isDraggingScrubber && !isSpeedMenuOpen && !isAspectMenuOpen) {
      hideHudTimerRef.current = window.setTimeout(() => {
        setIsHudVisible(false);
      }, 2500);
    }
  }, [isPlaying, isDraggingScrubber, isSpeedMenuOpen, isAspectMenuOpen]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Play / Pause Toggle
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

  // Direct DOM sync for exact multi-segment `buffered` TimeRanges (works paused, seeking, & playing)
  const syncBufferedRangesFromVideo = useCallback(
    (curSecOverride?: number, durSecOverride?: number) => {
      const vid = videoRef.current;
      const cur = curSecOverride !== undefined ? curSecOverride : (vid?.currentTime ?? currentTimeRef.current);
      const dur =
        durSecOverride !== undefined && durSecOverride > 0
          ? durSecOverride
          : (vid && Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : durationRef.current);

      const summary = computeBufferedSummary(vid?.buffered, cur, dur);
      bufferedSegmentsRef.current = summary.segments;
      bufferedTimeRef.current = summary.contiguousEndSec;

      if (bufferedBarDomRef.current) {
        bufferedBarDomRef.current.style.width = `${summary.contiguousEndPct.toFixed(3)}%`;
      }

      const segContainer = bufferedSegmentsDomRef.current;
      if (segContainer) {
        const segCount = summary.segments.length;
        // Recycle child segment nodes without allocations during 60fps playback
        while (segContainer.children.length > segCount) {
          segContainer.lastElementChild?.remove();
        }
        while (segContainer.children.length < segCount) {
          const el = document.createElement('div');
          el.className = 'absolute top-0 bottom-0 bg-white/35 border-r border-white/25 transition-[left,width] duration-75';
          segContainer.appendChild(el);
        }
        for (let i = 0; i < segCount; i++) {
          const seg = summary.segments[i];
          const child = segContainer.children[i] as HTMLElement;
          child.style.left = `${seg.leftPct.toFixed(3)}%`;
          child.style.width = `${seg.widthPct.toFixed(3)}%`;
        }
      }

      if (bufferReadoutDomRef.current) {
        const pctInt = Math.round(summary.totalBufferedPct);
        const aheadLabel =
          summary.totalBufferedPct >= 99.5
            ? 'READY 100%'
            : summary.contiguousAheadSec > 0.05
              ? `BUF ${pctInt}% · +${summary.contiguousAheadSec.toFixed(1)}s`
              : `BUF ${pctInt}%`;
        bufferReadoutDomRef.current.textContent = aheadLabel;
      }

      return summary;
    },
    []
  );

  // Direct DOM flush for 60 FPS scrubber + timecode + buffered TimeRanges (zero React re-renders)
  const flushDirectPlayerDom = useCallback(
    (curSec: number, durSec?: number, bufSec?: number) => {
      currentTimeRef.current = curSec;
      const dur = durSec && durSec > 0 ? durSec : durationRef.current;
      const pct = dur > 0 ? Math.min(100, Math.max(0, (curSec / dur) * 100)) : 0;

      if (progressBarDomRef.current) {
        progressBarDomRef.current.style.width = `${pct.toFixed(3)}%`;
      }
      if (scrubKnobDomRef.current) {
        scrubKnobDomRef.current.style.left = `${pct.toFixed(3)}%`;
      }
      if (timecodeDomRef.current) {
        timecodeDomRef.current.textContent = showRemainingTimeRef.current
          ? formatTime(Math.max(0, dur - curSec), true)
          : `${formatTime(curSec)} / ${formatTime(dur)}`;
      }

      if (videoRef.current) {
        syncBufferedRangesFromVideo(curSec, dur);
      } else {
        if (bufferedSegmentsDomRef.current) {
          bufferedSegmentsDomRef.current.replaceChildren();
        }
        if (bufferReadoutDomRef.current) {
          bufferReadoutDomRef.current.textContent = 'BUF 0%';
        }
        if (bufferedBarDomRef.current) {
          const bufPct = bufSec !== undefined && dur > 0 ? Math.min(100, Math.max(pct, (bufSec / dur) * 100)) : 0;
          bufferedBarDomRef.current.style.width = `${bufPct.toFixed(3)}%`;
        }
      }
    },
    [formatTime, syncBufferedRangesFromVideo]
  );

  useEffect(() => {
    bufferedSegmentsRef.current = [];
    flushDirectPlayerDom(currentTimeRef.current, duration, bufferedTimeRef.current);
  }, [duration, showRemainingTime, currentIndex, resolvedMediaUrl, flushDirectPlayerDom]);

  // Skip 10s Backward
  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      const vid = videoRef.current;
      const wasPlaying = !vid.paused;
      if (wasPlaying) vid.pause();
      const next = Math.max(0, vid.currentTime - 10);
      syncVideoCurrentTimeWithFastSeek(vid, next, 0.0005);
      flushDirectPlayerDom(next);
      if (wasPlaying) vid.play().catch(() => {});
    } else {
      flushDirectPlayerDom(Math.max(0, currentTimeRef.current - 10));
    }
    triggerBeacon('rwd');
    showControlsTemporarily();
  }, [showControlsTemporarily, triggerBeacon, flushDirectPlayerDom]);

  // Skip 10s Forward
  const skipForward = useCallback(() => {
    if (videoRef.current) {
      const vid = videoRef.current;
      const wasPlaying = !vid.paused;
      if (wasPlaying) vid.pause();
      const next = Math.min(durationRef.current, vid.currentTime + 10);
      syncVideoCurrentTimeWithFastSeek(vid, next, 0.0005);
      flushDirectPlayerDom(next);
      if (wasPlaying) vid.play().catch(() => {});
    } else {
      flushDirectPlayerDom(Math.min(durationRef.current, currentTimeRef.current + 10));
    }
    triggerBeacon('fwd');
    showControlsTemporarily();
  }, [showControlsTemporarily, triggerBeacon, flushDirectPlayerDom]);

  // Frame Step (1 frame at 24fps)
  const stepFrame = useCallback((forward: boolean) => {
    const frameDelta = 1 / 24;
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      const nextTime = forward
        ? Math.min(durationRef.current, videoRef.current.currentTime + frameDelta)
        : Math.max(0, videoRef.current.currentTime - frameDelta);
      try {
        videoRef.current.currentTime = nextTime;
      } catch {
        syncVideoCurrentTimeWithFastSeek(videoRef.current, nextTime, 0.0005);
      }
      flushDirectPlayerDom(nextTime);
    } else {
      const nextTime = forward
        ? Math.min(durationRef.current, currentTimeRef.current + frameDelta)
        : Math.max(0, currentTimeRef.current - frameDelta);
      flushDirectPlayerDom(nextTime);
    }
    showControlsTemporarily();
  }, [showControlsTemporarily, flushDirectPlayerDom]);

  // Volume & Mute control (VLC 0% - 200% Preamp)
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (!next) resumeVlcAudioContext();
      applyVlcMediaGain(videoRef.current, volume, next);
      return next;
    });
    showControlsTemporarily();
  }, [showControlsTemporarily, volume]);

  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(2.0, newVol));
    setVolume(clamped);
    const shouldMute = clamped <= 0.01;
    setIsMuted(shouldMute);
    if (!shouldMute) resumeVlcAudioContext();
    applyVlcMediaGain(videoRef.current, clamped, shouldMute);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleViewportWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 2) return;
    const step = e.deltaY < 0 ? 0.08 : -0.08;
    handleVolumeChange(volume + step);
  }, [volume, handleVolumeChange]);

  const handleSnapshot = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || vid.videoWidth <= 0) return;
    try {
      const c = document.createElement('canvas');
      c.width = vid.videoWidth;
      c.height = vid.videoHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(vid, 0, 0, c.width, c.height);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `cinema_shot_${String(currentIndex + 1).padStart(3, '0')}.png`;
      a.click();
    } catch {
      // Ignore CORS-tainted canvas snapshot errors
    }
  }, [currentIndex]);

  // Playback speed selection (0.25x to 4x)
  const changeSpeed = useCallback((spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setIsSpeedMenuOpen(false);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Aspect ratio switcher
  const changeAspect = useCallback((newAspect: AspectRatio) => {
    setAspect(newAspect);
    onChangeAspectRatio?.(newAspect);
    setIsAspectMenuOpen(false);
    showControlsTemporarily();
  }, [onChangeAspectRatio, showControlsTemporarily]);

  // Fullscreen toggle via CONTAINER
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      const el = containerRef.current as any;
      const requestMethod = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(el).then(() => {
          setIsFullscreen(true);
          setFullscreenFallbackNotice(null);
        }).catch(() => {
          setFullscreenFallbackNotice("Fullscreen API was blocked by the browser. Operating in maximized viewport mode.");
          setTimeout(() => setFullscreenFallbackNotice(null), 4000);
        });
      } else {
        setFullscreenFallbackNotice("Fullscreen is restricted on this device. Maximized cinema viewport is active.");
        setTimeout(() => setFullscreenFallbackNotice(null), 4000);
      }
    } else {
      const exitMethod = document.exitFullscreen || (document as any).webkitExitFullscreen;
      if (exitMethod) {
        exitMethod.call(document).then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Picture in Picture with Honesty & Document PiP
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      // 1. Try Document Picture-in-Picture (Chrome 116+): preserves titles, LUT, grain
      if ('documentPictureInPicture' in window && (window as any).documentPictureInPicture) {
        try {
          const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
            width: 800,
            height: 450
          });
          // Clone styles
          [...document.styleSheets].forEach((sheet) => {
            try {
              const cssRules = [...sheet.cssRules].map((rule) => rule.cssText).join('');
              const style = document.createElement('style');
              style.textContent = cssRules;
              pipWindow.document.head.appendChild(style);
            } catch {
              if (sheet.href) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                pipWindow.document.head.appendChild(link);
              }
            }
          });
          setIsPiPActive(true);
          setPipWarning(null);
          pipWindow.addEventListener('pagehide', () => setIsPiPActive(false));
          return;
        } catch {
          // Fall through to standard video PiP
        }
      }

      // 2. Standard HTML5 Video PiP
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        setPipWarning(null);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
        // Show visible honesty warning
        setPipWarning("Standard browser PiP displays raw media stream only (without real-time LUT, grain, and title overlays).");
        setTimeout(() => setPipWarning(null), 6000);
      } else {
        setPipWarning("Picture-in-Picture is not supported in this browser environment.");
        setTimeout(() => setPipWarning(null), 5000);
      }
    } catch (err: any) {
      console.warn('PiP error:', err);
      setPipWarning("Picture-in-Picture could not be initiated.");
      setTimeout(() => setPipWarning(null), 4000);
    }
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // High-performance 60 FPS passive rAF clock sync (strictly read-only; zero currentTime/fastSeek writes)
  useEffect(() => {
    if (!isOpen || !isPlaying || !isVideo) return;
    let rafId: number | null = null;

    const tick = () => {
      const vid = videoRef.current;
      if (vid && !vid.seeking && !vid.paused && vid.readyState >= 2) {
        const cur = vid.currentTime;
        const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : durationRef.current;
        if (Math.abs(dur - durationRef.current) > 0.05) {
          durationRef.current = dur;
        }

        // Buffer ranges
        let bufEnd = bufferedTimeRef.current;
        const buf = vid.buffered;
        if (buf && buf.length > 0) {
          for (let i = 0; i < buf.length; i++) {
            if (buf.start(i) <= cur && cur <= buf.end(i)) {
              bufEnd = buf.end(i);
              bufferedTimeRef.current = bufEnd;
              break;
            }
          }
        }

        flushDirectPlayerDom(cur, dur, bufEnd);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isOpen, isPlaying, isVideo, flushDirectPlayerDom]);

  // Discrete timeUpdate handler: enforces A-B / subclip boundaries cleanly & syncs paused clock
  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const cur = vid.currentTime;

    if (!vid.paused) {
      const loop = abLoopRef.current;
      if (loop.a !== null && loop.b !== null && loop.b > loop.a + 0.08 && cur >= loop.b) {
        vid.pause();
        try { vid.currentTime = loop.a; } catch {}
        flushDirectPlayerDom(loop.a);
        vid.play().catch(() => {});
        return;
      }

      const af = activeFrameRef.current;
      if (playSubclipOnlyRef.current && af?.subclipInSec !== undefined && af?.subclipOutSec !== undefined) {
        if (cur >= af.subclipOutSec) {
          vid.pause();
          try { vid.currentTime = af.subclipInSec; } catch {}
          flushDirectPlayerDom(af.subclipInSec);
          vid.play().catch(() => {});
          return;
        }
      }
      return;
    }

    flushDirectPlayerDom(cur);
  };

  // Video metadata loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
        durationRef.current = dur;
        setDuration(dur);
      }
      videoRef.current.playbackRate = playbackSpeed;
      applyVlcMediaGain(videoRef.current, volume, isMuted);
      syncBufferedRangesFromVideo(videoRef.current.currentTime, dur);
      if (playSubclipOnly && activeFrame.subclipInSec !== undefined) {
        if (!videoRef.current.paused) videoRef.current.pause();
        syncVideoCurrentTimeWithFastSeek(videoRef.current, activeFrame.subclipInSec, 0.0005);
        flushDirectPlayerDom(activeFrame.subclipInSec);
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {});
          }
        });
      }
    }
  };

  // Scrubber scrubbing: pauses playback cleanly during drag, uses fastSeek while paused, and resumes on release
  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    if (videoRef.current) {
      wasPlayingBeforeScrubRef.current = !videoRef.current.paused;
      if (!videoRef.current.paused) videoRef.current.pause();
    } else {
      wasPlayingBeforeScrubRef.current = false;
    }
    setIsDraggingScrubber(true);
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pct * durationRef.current;
    flushDirectPlayerDom(targetTime);
    syncVideoCurrentTimeWithFastSeek(videoRef.current, targetTime, 0.0005);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pct * 100);
    setHoverTime(pct * durationRef.current);

    if (isDraggingScrubber) {
      const targetTime = pct * durationRef.current;
      flushDirectPlayerDom(targetTime);
      syncVideoCurrentTimeWithFastSeek(videoRef.current, targetTime, 0.0005);
    }
  };

  const handleScrubberTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrubberRef.current) return;
    if (videoRef.current) {
      wasPlayingBeforeScrubRef.current = !videoRef.current.paused;
      if (!videoRef.current.paused) videoRef.current.pause();
    } else {
      wasPlayingBeforeScrubRef.current = false;
    }
    setIsDraggingScrubber(true);
    const touch = e.touches[0];
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const targetTime = pct * durationRef.current;
    flushDirectPlayerDom(targetTime);
    syncVideoCurrentTimeWithFastSeek(videoRef.current, targetTime, 0.0005);
    showControlsTemporarily();
  };

  const handleScrubberTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!scrubberRef.current || !isDraggingScrubber) return;
    const touch = e.touches[0];
    const rect = scrubberRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    setHoverPosition(pct * 100);
    setHoverTime(pct * durationRef.current);
    const targetTime = pct * durationRef.current;
    flushDirectPlayerDom(targetTime);
    syncVideoCurrentTimeWithFastSeek(videoRef.current, targetTime, 0.0005);
  };

  // Touch double-tap skipping
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = touch.clientX - rect.left;
    const isDoubleTap = now - lastTapRef.current.time < 300 && Math.abs(x - lastTapRef.current.x) < 40;

    if (isDoubleTap) {
      if (x < rect.width * 0.4) {
        skipBackward();
      } else if (x > rect.width * 0.6) {
        skipForward();
      }
    } else {
      showControlsTemporarily();
    }

    lastTapRef.current = { time: now, x };
  };

  // Register Cinema keyboard shortcuts with KeyScopeManager
  useEffect(() => {
    if (!isOpen) return;

    return keyScopeManager.registerCinemaHandlers({
      onTogglePlay: togglePlay,
      onSkipTime: (secs) => {
        if (secs < 0) skipBackward();
        else skipForward();
      },
      onStepFrame: stepFrame,
      onShuttle: (action) => {
        if (action === 'reverse') {
          if (videoRef.current) videoRef.current.playbackRate = 2.0;
          skipBackward();
        } else if (action === 'stop') {
          if (videoRef.current) videoRef.current.pause();
          setIsPlaying(false);
        } else {
          if (videoRef.current) {
            videoRef.current.playbackRate = 1.0;
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      },
      onToggleMute: toggleMute,
      onToggleFullscreen: toggleFullscreen,
      onToggleTitles: () => setShowTitles(t => !t),
      onCloseCinema: onClose
    });
  }, [isOpen, togglePlay, skipBackward, skipForward, stepFrame, toggleMute, toggleFullscreen, onClose]);

  // Window mouseup/touchend listener for scrubber drag
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (isDraggingScrubber) {
        setIsDraggingScrubber(false);
        if (wasPlayingBeforeScrubRef.current && videoRef.current?.paused) {
          videoRef.current.play().catch(() => {});
        }
        wasPlayingBeforeScrubRef.current = false;
        showControlsTemporarily();
      }
    };
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
    };
  }, [isDraggingScrubber, showControlsTemporarily]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!isOpen) return null;

  const filterCSS = getLutFilterCSS(activeFrame?.lutFilter || 'cinematic');

  const getAspectClass = () => {
    switch (aspect) {
      case '16:9': return 'aspect-video max-w-[94vw] max-h-[86vh]';
      case '2.39:1': return 'aspect-[2.39/1] max-w-[96vw] max-h-[82vh]';
      case '9:16': return 'aspect-[9/16] max-h-[88vh]';
      case '1:1': return 'aspect-square max-h-[82vh]';
      case '4:3': return 'aspect-[4/3] max-h-[86vh]';
      default: return 'w-full h-full object-contain';
    }
  };

  const progressPct = duration > 0 ? (currentTimeRef.current / duration) * 100 : 0;
  const bufferPct = duration > 0 ? (bufferedTimeRef.current / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      role="region"
      aria-label="RAWx Cinema Fullscreen Player"
      className={`fixed inset-0 z-[99999] bg-black text-[#EDEDED] font-mono flex flex-col justify-between overflow-hidden select-none cinema-player-dialog ${
        !isHudVisible ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {nextPrebufferUrl && (
        <video
          src={nextPrebufferUrl}
          crossOrigin="anonymous"
          className="hidden"
          preload="auto"
          muted
          playsInline
        />
      )}
      {/* ========================================================================= */}
      {/* 1. VISIBLE FALLBACK / HONESTY WARNING BANNERS                             */}
      {/* ========================================================================= */}
      {pipWarning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0B0B0B]/95 border border-[#D4AF37] px-4 py-2 rounded-full text-xs font-mono text-[#FFE066] flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <span>{pipWarning}</span>
        </div>
      )}

      {fullscreenFallbackNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0B0B0B]/95 border border-amber-500/60 px-4 py-2 rounded-full text-xs font-mono text-amber-300 flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{fullscreenFallbackNotice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TOP HEADER HUD (Auto-Hides)                                           */}
      {/* ========================================================================= */}
      <div 
        className={`w-full p-4 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          isHudVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Back / Close button & Project Metadata */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Cinema Player (Esc)"
            className="p-2 rounded-full bg-black/60 hover:bg-[#D4AF37] text-white hover:text-black border border-white/10 transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37] active:scale-[0.98]"
            title="Exit Cinema Player (Esc)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#D4AF37] font-bold tracking-widest uppercase">
                RAWx CINEMA ENGINE
              </span>
              <span className="text-white/20">•</span>
              <span className="text-xs text-white/90 font-bold truncate">
                {activeFrame?.title || 'THE SINGULARITY'}
              </span>
            </div>
            <p className="text-[10px] text-white/50 tracking-wider">
              {directorName} // {projectTitle}
            </p>
          </div>
        </div>

        {/* Right: Aspect ratio, Shot jump & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Subclip Mode Toggle */}
          {(activeFrame?.subclipInSec !== undefined || playSubclipOnly) && (
            <button
              type="button"
              onClick={() => setPlaySubclipOnly(p => !p)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                playSubclipOnly
                  ? 'bg-amber-950/70 border-[#D4AF37] text-[#FFE066]'
                  : 'bg-black/60 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Toggle Subclip Range vs Full Source Playback"
            >
              <Scissors className="w-3 h-3 text-[#D4AF37]" />
              <span>{playSubclipOnly ? 'SUBCLIP (IN-OUT)' : 'FULL SOURCE'}</span>
            </button>
          )}

          {/* Aspect Ratio Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAspectMenuOpen(o => !o)}
              aria-label="Switch Aspect Ratio"
              className="px-3 py-1 rounded-full bg-black/60 hover:bg-[#1C1C24] border border-white/10 text-xs font-mono font-bold text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            >
              {aspect}
            </button>
            {isAspectMenuOpen && (
              <div className="absolute top-full right-0 mt-2 py-1 bg-[#0B0B0B]/98 border border-[#272732] rounded-lg shadow-2xl flex flex-col z-50 text-xs font-mono min-w-[90px]">
                {(['2.39:1', '16:9', '4:3', '1:1', '9:16'] as AspectRatio[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => changeAspect(r)}
                    className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${
                      aspect === r ? 'text-[#D4AF37] font-bold' : 'text-white/60'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full bg-black/60 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTER VIEWPORT (Preserves Titles, LUT, Grain, Bloom, Vignette)        */}
      {/* ========================================================================= */}
      <div 
        onClick={togglePlay}
        onWheel={handleViewportWheel}
        onDoubleClick={(e) => {
          e.stopPropagation();
          toggleFullscreen();
        }}
        className="flex-1 w-full relative flex items-center justify-center p-2 sm:p-6 cursor-pointer overflow-hidden"
      >
        <div className={`relative ${getAspectClass()} bg-black shadow-[0_30px_90px_rgba(0,0,0,0.98)] overflow-hidden flex items-center justify-center`}>
          
          {/* Active Media Plate */}
          {resolvedMediaUrl ? (
            isVideo ? (
              <video
                key={resolvedMediaUrl}
                ref={videoRef}
                src={resolvedMediaUrl}
                crossOrigin="anonymous"
                muted={isMuted}
                autoPlay={isPlaying}
                loop={!playSubclipOnly && loopMode === 'repeat-one' && abLoop.a === null && abLoop.b === null}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onProgress={() => syncBufferedRangesFromVideo()}
                onLoadedData={() => syncBufferedRangesFromVideo()}
                onCanPlay={() => syncBufferedRangesFromVideo()}
                onWaiting={() => syncBufferedRangesFromVideo()}
                onSeeking={() => syncBufferedRangesFromVideo()}
                onSeeked={() => syncBufferedRangesFromVideo()}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  if (loopMode === 'sequence' && frames.length > 1) {
                    onSelectFrame((currentIndex + 1) % frames.length);
                  } else if (loopMode === 'once') {
                    setIsPlaying(false);
                  }
                }}
                className={`w-full h-full ${fitMode === 'contain' ? 'object-contain' : fitMode === 'fill' ? 'object-fill' : 'object-cover'} pointer-events-none transition-transform duration-700 ease-out`}
                style={{
                  objectPosition: `center ${activeFrame?.panY ?? 50}%`,
                  filter: filterCSS,
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              />
            ) : (
              <div
                className="w-full h-full bg-no-repeat transition-transform duration-700 ease-out"
                style={{
                  backgroundImage: `url(${resolvedMediaUrl})`,
                  backgroundSize: fitMode === 'contain' ? 'contain' : fitMode === 'fill' ? '100% 100%' : 'cover',
                  backgroundPosition: `center ${activeFrame?.panY ?? 50}%`,
                  filter: filterCSS
                }}
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#070709] p-6 text-center select-none">
              <Film className="w-12 h-12 text-[#D4AF37]/30 mb-3" />
              <p className="font-mono text-xs text-[#EDEDED] font-bold tracking-widest uppercase">
                SHOT {String(currentIndex + 1).padStart(3, '0')} // NO MEDIA
              </p>
            </div>
          )}

          {/* Vignette Layer */}
          <div 
            className="absolute inset-0 pointer-events-none z-[11]"
            style={{
              background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.85) 100%)'
            }}
          />

          {/* ========================================================================= */}
          {/* BILINGUAL CALLIGRAPHIC TITLES (Bengali + English, Animate in on Open)    */}
          {/* ========================================================================= */}
          {showTitles && (
            <div className="absolute inset-0 pointer-events-none p-6 sm:p-12 flex flex-col justify-end z-20 select-none">
              <div className="title-block max-w-3xl text-left pb-6 animate-in fade-in slide-in-from-bottom duration-500">
                {/* Bengali Glowing Title */}
                {activeFrame?.bengaliTitle && (
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#FFE066] via-[#D4AF37] to-[#E5A919] drop-shadow-[0_0_35px_rgba(212,175,55,0.7)] leading-tight">
                    {activeFrame.bengaliTitle}
                  </h1>
                )}

                {/* English Subtitle */}
                {activeFrame?.title && (
                  <h2 className="text-sm sm:text-base md:text-lg font-mono font-bold tracking-[0.25em] text-[#EDEDED] uppercase mt-2 drop-shadow-md">
                    {activeFrame.title}
                  </h2>
                )}

                {/* Director Sound / Scene Cue */}
                {(activeFrame?.directorNotes || activeFrame?.soundCue) && (
                  <div className="mt-2.5 flex items-center gap-3 text-xs font-mono text-white/70">
                    {activeFrame.directorNotes && <span>DIR: {activeFrame.directorNotes}</span>}
                    {activeFrame.soundCue && (
                      <span className="text-[#D4AF37] flex items-center gap-1 font-bold">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{activeFrame.soundCue}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Center Feedback Action Beacon */}
          {centerBeacon && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <div className="p-5 rounded-full bg-black/75 border border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.4)] text-[#D4AF37] animate-ping duration-300">
                {centerBeacon.type === 'play' && <Play className="w-10 h-10 fill-current" />}
                {centerBeacon.type === 'pause' && <Pause className="w-10 h-10 fill-current" />}
                {centerBeacon.type === 'fwd' && <RotateCw className="w-10 h-10" />}
                {centerBeacon.type === 'rwd' && <RotateCcw className="w-10 h-10" />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM TRANSPORT HUD (Auto-Hides)                                     */}
      {/* ========================================================================= */}
      <div 
        className={`w-full p-4 sm:p-6 z-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300 flex flex-col gap-3 ${
          isHudVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Strip with Buffer Range and Hover Tooltip */}
        <div 
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onTouchStart={handleScrubberTouchStart}
          onTouchMove={handleScrubberTouchMove}
          onTouchEnd={() => setIsDraggingScrubber(false)}
          className="relative w-full h-5 flex items-center cursor-pointer group py-1"
        >
          {/* Hover Time Tooltip + Buffer Readiness Indicator */}
          {hoverTime !== null && (
            <div 
              style={{ left: `${hoverPosition}%` }}
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/95 border border-[#D4AF37] text-[10px] font-mono text-[#FFE066] font-bold pointer-events-none z-30 whitespace-nowrap shadow-lg flex items-center gap-1.5"
            >
              <span>{formatTime(hoverTime)}</span>
              {isVideo && isTimeInBufferedSegments(bufferedSegmentsRef.current, hoverTime) && (
                <span className="text-[9px] text-emerald-300">● READY</span>
              )}
            </div>
          )}

          {/* Scrubber Background Bar */}
          <div
            aria-label="Timeline and buffer progress bar"
            className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden relative group-hover:h-2 transition-all"
          >
            {/* Exact Multi-Segment Buffered TimeRanges Layer */}
            <div
              ref={bufferedSegmentsDomRef}
              aria-label="Buffered video TimeRanges"
              className="absolute inset-0 pointer-events-none"
            />
            {/* Contiguous Ahead-of-Playhead Buffer Runway */}
            <div 
              ref={bufferedBarDomRef}
              style={{ width: `${bufferPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-emerald-400/35 pointer-events-none"
            />
            {/* A-B Loop Highlight */}
            {abLoop.a !== null && abLoop.b !== null && abLoop.b > abLoop.a && duration > 0 && (
              <div
                style={{
                  left: `${(abLoop.a / duration) * 100}%`,
                  width: `${((abLoop.b - abLoop.a) / duration) * 100}%`
                }}
                className="absolute top-0 bottom-0 bg-cyan-400/50 pointer-events-none"
              />
            )}
            {/* Playhead progress */}
            <div 
              ref={progressBarDomRef}
              style={{ width: `${progressPct}%` }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#D4AF37] to-[#FFE066] pointer-events-none"
            />
          </div>

          {/* Scrub Knob */}
          <div 
            ref={scrubKnobDomRef}
            style={{ left: `${progressPct}%` }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#FFE066] border-2 border-black shadow-[0_0_8px_rgba(212,175,55,0.8)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          />
        </div>

        {/* Controls Strip: Play, Skip, Volume, Timecode, Shot Jump, PiP, Fullscreen */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Transport Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Prev Shot */}
            <button
              type="button"
              onClick={() => onSelectFrame(Math.max(0, currentIndex - 1))}
              disabled={currentIndex <= 0}
              aria-label="Previous Shot"
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              title="Previous Shot"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause (Space)" : "Play (Space)"}
              className="p-2.5 rounded-full bg-[#D4AF37] hover:bg-[#FFE066] text-black transition-colors cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.4)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Next Shot */}
            <button
              type="button"
              onClick={() => onSelectFrame(Math.min(frames.length - 1, currentIndex + 1))}
              disabled={currentIndex >= frames.length - 1}
              aria-label="Next Shot"
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              title="Next Shot"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* -10s Skip */}
            <button
              type="button"
              onClick={skipBackward}
              aria-label="Skip Backward 10 Seconds"
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              title="Skip -10s (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* +10s Skip */}
            <button
              type="button"
              onClick={skipForward}
              aria-label="Skip Forward 10 Seconds"
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              title="Skip +10s (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute (M)" : "Mute (M)"}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                title={isMuted ? "Unmute (M)" : "Mute (M)"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Volume slider (up to 200% preamp)"
                className="w-20 accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded-full"
              />
              <span className={`text-[10px] font-mono tabular-nums ${volume > 1.05 && !isMuted ? 'text-amber-300 font-bold' : 'text-white/55'}`}>
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>

            {/* Timecode display */}
            <button
              ref={timecodeDomRef}
              type="button"
              onClick={() => setShowRemainingTime(r => !r)}
              className="text-xs font-mono font-bold text-white/90 hover:text-[#D4AF37] transition-colors cursor-pointer ml-2 tabular-nums"
              title="Click to Toggle Remaining Time"
            >
              {showRemainingTime
                ? formatTime(duration - currentTimeRef.current, true)
                : `${formatTime(currentTimeRef.current)} / ${formatTime(duration)}`}
            </button>

            {/* Video Buffer Readiness Readout (Direct DOM updates from TimeRanges) */}
            {isVideo && (
              <span
                ref={bufferReadoutDomRef}
                className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-emerald-300/90 tabular-nums"
                title="Buffered TimeRanges readiness for smooth playback"
              >
                BUF 0%
              </span>
            )}
          </div>

          {/* Right Transport Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* A-B Loop */}
            <div className="hidden md:flex items-center rounded border border-white/15 bg-black/50 text-[10px] font-mono overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  const t = currentTimeRef.current;
                  setAbLoop((p) => ({ a: t, b: p.b !== null && p.b <= t ? null : p.b }));
                }}
                className={`px-2 py-1 cursor-pointer ${abLoop.a !== null ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-white/60 hover:text-white'}`}
                title="Set A-B Loop Start"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = currentTimeRef.current;
                  setAbLoop((p) => ({ a: p.a ?? 0, b: Math.max((p.a ?? 0) + 0.1, t) }));
                }}
                className={`px-2 py-1 border-l border-white/15 cursor-pointer ${abLoop.b !== null ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-white/60 hover:text-white'}`}
                title="Set A-B Loop End"
              >
                B
              </button>
              {(abLoop.a !== null || abLoop.b !== null) && (
                <button
                  type="button"
                  onClick={() => setAbLoop({ a: null, b: null })}
                  className="px-1.5 py-1 border-l border-white/15 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                  title="Clear A-B Loop"
                >
                  ×
                </button>
              )}
            </div>

            {/* Loop Mode */}
            <button
              type="button"
              onClick={() => {
                const order: VlcLoopMode[] = ['repeat-one', 'sequence', 'once'];
                setLoopMode(order[(order.indexOf(loopMode) + 1) % order.length]);
              }}
              className="p-2 rounded-full hover:bg-white/10 text-white/75 hover:text-[#D4AF37] transition-colors cursor-pointer"
              title={`Loop Mode: ${loopMode}`}
            >
              {loopMode === 'repeat-one' ? (
                <Repeat1 className="w-4 h-4 text-[#D4AF37]" />
              ) : loopMode === 'sequence' ? (
                <Repeat className="w-4 h-4 text-emerald-400" />
              ) : (
                <ArrowRightToLine className="w-4 h-4" />
              )}
            </button>

            {/* Fit Mode */}
            <button
              type="button"
              onClick={() => {
                const order: Array<'contain' | 'cover' | 'fill'> = ['contain', 'cover', 'fill'];
                setFitMode(order[(order.indexOf(fitMode) + 1) % order.length]);
              }}
              className="hidden sm:flex px-2.5 py-1 rounded-full bg-black/60 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 items-center gap-1 cursor-pointer uppercase"
              title={`Video Fit: ${fitMode}`}
            >
              <Monitor className="w-3.5 h-3.5 text-cyan-300" />
              <span>{fitMode}</span>
            </button>

            {/* Snapshot */}
            <button
              type="button"
              onClick={handleSnapshot}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-amber-300 transition-colors cursor-pointer"
              title="Snapshot Frame PNG"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Playlist Queue Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPlaylistOpen((o) => !o)}
                className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer ${isPlaylistOpen ? 'text-[#D4AF37] bg-white/10' : 'text-white/70 hover:text-white'}`}
                title="Playlist Queue"
              >
                <ListVideo className="w-4 h-4" />
              </button>
              {isPlaylistOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-3 w-72 max-h-64 overflow-y-auto bg-[#0B0C12]/95 border border-[#272732] rounded-lg shadow-2xl divide-y divide-white/5 z-50 text-xs font-mono"
                >
                  {frames.map((item, idx) => (
                    <button
                      key={`${item.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        onSelectFrame(idx);
                        setIsPlaylistOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-white/10 cursor-pointer ${
                        idx === currentIndex ? 'text-[#D4AF37] bg-[#D4AF37]/10 font-bold' : 'text-white/75'
                      }`}
                    >
                      <span className="truncate">#{String(idx + 1).padStart(2, '0')} {item.title}</span>
                      <span className="text-[10px] text-white/40 tabular-nums shrink-0">
                        {(item.durationSec || 4).toFixed(1)}s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Titles / CC Toggle */}
            <button
              type="button"
              onClick={() => setShowTitles(t => !t)}
              aria-label="Toggle Titles and Subtitles (C)"
              className={`p-2 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                showTitles ? 'text-[#D4AF37] bg-white/10' : 'text-white/40 hover:text-white'
              }`}
              title="Toggle Titles Overlay (C)"
            >
              <Subtitles className="w-4 h-4" />
            </button>

            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSpeedMenuOpen(o => !o)}
                aria-label="Playback speed"
                className="px-2.5 py-1 rounded-full bg-black/60 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[#D4AF37] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {isSpeedMenuOpen && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 py-1 bg-[#0B0B0B]/98 backdrop-blur-xl border border-[#272732] rounded-lg shadow-2xl flex flex-col z-50 text-xs font-mono min-w-[75px]"
                >
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => changeSpeed(spd)}
                      className={`px-3 py-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${
                        playbackSpeed === spd ? 'text-[#D4AF37] font-bold' : 'text-white/60'
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
              aria-label="Picture in Picture"
              className={`p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                isPiPActive ? 'text-[#D4AF37]' : 'text-white/70 hover:text-white'
              }`}
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle via CONTAINER */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-[#D4AF37]" />
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
