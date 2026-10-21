/**
 * @file /src/hooks/useVideoPlaybackEngine.ts
 * @description Broadcast-Grade Dual-Mode Video Playback Engine & NLE JKL Transport for RAWx Storyboard Studio.
 * 
 * Capabilities:
 * 1. Dual Playback States:
 *    - Mode A: 'HERO_GLOBAL' (Sequence) - Seamlessly advances across slides 001-100 with strict 12.000s duration.
 *      Pre-hydrates incoming slide media 1.5s prior to transition for 0ms black-frame latency.
 *    - Mode B: 'SOLO_INSPECTOR' - Locked strictly into the active slide's isolated 12.000s (288-frame) window.
 * 2. Professional NLE JKL Transport:
 *    - J: 2x Reverse Playback (high-precision reverse stepping engine at 48fps).
 *    - K: Instant Stop / Pause.
 *    - L: 1x Forward Playback; press again for 2x Fast Forward.
 *    - Single-frame stepping: ±1 Frame (41.666ms / 1/24th sec) via ArrowLeft / ArrowRight.
 * 3. Sub-Frame Precision & Hardware Sync:
 *    - requestVideoFrameCallback (rVFC) for exact hardware frame synchronization.
 *    - video.fastSeek() optimization to eliminate scrub stalls during high-speed scrubbing.
 * 4. Sub-Clip In/Out Markers:
 *    - I: Set In-Point marker.
 *    - O: Set Out-Point marker.
 *    - Automatic strict looping between [In, Out] region when active.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS, PlaybackMode } from '../types/editor';

export type JklVelocity = -2 | -1 | 0 | 1 | 2;

export interface InOutRange {
  inSec: number | null;
  outSec: number | null;
  isActive: boolean;
}

export interface UseVideoPlaybackEngineOptions {
  totalSlides: number;
  initialSlideIndex?: number;
  initialMode?: PlaybackMode;
  fps?: number;
  onSlideChange?: (index: number) => void;
  onTimeUpdate?: (slideTimeSec: number, globalTimeSec: number) => void;
}

export function useVideoPlaybackEngine(options: UseVideoPlaybackEngineOptions) {
  const {
    totalSlides,
    initialSlideIndex = 0,
    initialMode = 'sequence',
    fps = 24,
    onSlideChange,
    onTimeUpdate
  } = options;

  const [currentIndex, setCurrentIndex] = useState<number>(initialSlideIndex);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(initialMode);
  const [slideTimeSec, setSlideTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [jklVelocity, setJklVelocity] = useState<JklVelocity>(0);
  const [inOutRange, setInOutRange] = useState<InOutRange>({
    inSec: null,
    outSec: null,
    isActive: false
  });
  const [shouldPrehydrate, setShouldPrehydrate] = useState<boolean>(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const reverseTimerRef = useRef<number | null>(null);
  const rVfcIdRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(performance.now());

  const frameDurationSec = 1 / fps; // 0.041666...s
  const currentFrameInSlide = Math.min(
    SLIDE_TOTAL_FRAMES_24FPS,
    Math.max(1, Math.floor(slideTimeSec * fps) + 1)
  );
  const globalTimeSec = currentIndex * SLIDE_DURATION_SEC + slideTimeSec;
  const totalDurationSec = totalSlides * SLIDE_DURATION_SEC;

  // Sync external index changes
  useEffect(() => {
    if (initialSlideIndex !== currentIndex) {
      setCurrentIndex(initialSlideIndex);
      setSlideTimeSec(0);
      setInOutRange({ inSec: null, outSec: null, isActive: false });
    }
  }, [initialSlideIndex]);

  // Clean stop for reverse timer
  const stopReversePlayback = useCallback(() => {
    if (reverseTimerRef.current !== null) {
      window.clearInterval(reverseTimerRef.current);
      reverseTimerRef.current = null;
    }
  }, []);

  // Set video element reference
  const attachVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoElementRef.current = video;
  }, []);

  // Frame seek with fastSeek optimization
  const seekVideoToTime = useCallback((timeSec: number) => {
    const video = videoElementRef.current;
    if (!video) return;

    const clampedSec = Math.max(0, Math.min(SLIDE_DURATION_SEC, timeSec));
    const targetVideoTime = video.duration ? (clampedSec / SLIDE_DURATION_SEC) * video.duration : clampedSec;

    if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
      try {
        (video as any).fastSeek(targetVideoTime);
      } catch {
        video.currentTime = targetVideoTime;
      }
    } else {
      video.currentTime = targetVideoTime;
    }
  }, []);

  // =========================================================================
  // SUB-FRAME rVFC (requestVideoFrameCallback) TRACKING
  // =========================================================================
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    let isMounted = true;

    const onFrame = (now: DOMHighResTimeStamp, metadata: any) => {
      if (!isMounted) return;

      if (metadata && typeof metadata.mediaTime === 'number' && video.duration > 0) {
        // Map native video media time to 12.0s slide space
        const mappedSlideSec = (metadata.mediaTime / video.duration) * SLIDE_DURATION_SEC;
        setSlideTimeSec(mappedSlideSec);
        onTimeUpdate?.(mappedSlideSec, currentIndex * SLIDE_DURATION_SEC + mappedSlideSec);
      }

      if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
        rVfcIdRef.current = (video as any).requestVideoFrameCallback(onFrame);
      }
    };

    if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
      rVfcIdRef.current = (video as any).requestVideoFrameCallback(onFrame);
    }

    return () => {
      isMounted = false;
      if (rVfcIdRef.current !== null && 'cancelVideoFrameCallback' in video && typeof (video as any).cancelVideoFrameCallback === 'function') {
        (video as any).cancelVideoFrameCallback(rVfcIdRef.current);
      }
    };
  }, [currentIndex, onTimeUpdate]);

  // =========================================================================
  // JKL SHUTTLE & TRANSPORT CONTROLLER
  // =========================================================================

  // Apply velocity to HTML5 Video & state
  const applyVelocity = useCallback((velocity: JklVelocity) => {
    setJklVelocity(velocity);
    const video = videoElementRef.current;

    stopReversePlayback();

    if (velocity === 0) {
      setIsPlaying(false);
      if (video) video.pause();
    } else if (velocity > 0) {
      setIsPlaying(true);
      if (video) {
        video.playbackRate = velocity;
        video.preservesPitch = true;
        video.play().catch(() => {});
      }
    } else if (velocity < 0) {
      // Negative velocity: Reverse Playback Engine via frame-accurate reverse clock
      setIsPlaying(true);
      if (video) video.pause();

      const reverseFps = Math.abs(velocity) === 2 ? 48 : 24;
      const reverseStepSec = (1 / 24) * (Math.abs(velocity) === 2 ? 2 : 1);
      const intervalMs = Math.round(1000 / reverseFps);

      reverseTimerRef.current = window.setInterval(() => {
        setSlideTimeSec((prev) => {
          let next = prev - reverseStepSec;
          const minBound = inOutRange.isActive && inOutRange.inSec !== null ? inOutRange.inSec : 0;
          const maxBound = inOutRange.isActive && inOutRange.outSec !== null ? inOutRange.outSec : SLIDE_DURATION_SEC;

          if (next < minBound) {
            if (isLooping) {
              next = maxBound;
            } else {
              next = minBound;
              stopReversePlayback();
              setIsPlaying(false);
              setJklVelocity(0);
            }
          }

          seekVideoToTime(next);
          return next;
        });
      }, intervalMs);
    }
  }, [inOutRange, isLooping, seekVideoToTime, stopReversePlayback]);

  // J: Reverse Playback Shuttle
  const handleShuttleReverse = useCallback(() => {
    applyVelocity(-2);
  }, [applyVelocity]);

  // K: Stop / Pause Shuttle
  const handleShuttleStop = useCallback(() => {
    applyVelocity(0);
  }, [applyVelocity]);

  // L: Forward Playback Shuttle (Toggle 1x / 2x)
  const handleShuttleForward = useCallback(() => {
    if (jklVelocity === 1) {
      applyVelocity(2);
    } else {
      applyVelocity(1);
    }
  }, [jklVelocity, applyVelocity]);

  // Toggle Play / Pause (Space)
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      applyVelocity(0);
    } else {
      applyVelocity(1);
    }
  }, [isPlaying, applyVelocity]);

  // =========================================================================
  // SUB-FRAME STEPPING (±1 Frame @ 24fps = 41.666ms)
  // =========================================================================
  const stepFrame = useCallback((forward: boolean) => {
    applyVelocity(0); // Stop shuttle when stepping
    setSlideTimeSec((prev) => {
      const delta = forward ? frameDurationSec : -frameDurationSec;
      let next = prev + delta;

      const minBound = inOutRange.isActive && inOutRange.inSec !== null ? inOutRange.inSec : 0;
      const maxBound = inOutRange.isActive && inOutRange.outSec !== null ? inOutRange.outSec : SLIDE_DURATION_SEC;

      if (next > maxBound) {
        next = isLooping ? minBound : maxBound;
      } else if (next < minBound) {
        next = isLooping ? maxBound : minBound;
      }

      seekVideoToTime(next);
      return next;
    });
  }, [frameDurationSec, inOutRange, isLooping, applyVelocity, seekVideoToTime]);

  // =========================================================================
  // SUB-CLIP IN/OUT MARKERS (I & O Hotkeys)
  // =========================================================================
  const setInPoint = useCallback(() => {
    setInOutRange((prev) => {
      const newIn = Number(slideTimeSec.toFixed(3));
      const validOut = prev.outSec !== null && prev.outSec > newIn ? prev.outSec : null;
      return {
        inSec: newIn,
        outSec: validOut,
        isActive: validOut !== null
      };
    });
  }, [slideTimeSec]);

  const setOutPoint = useCallback(() => {
    setInOutRange((prev) => {
      const newOut = Number(slideTimeSec.toFixed(3));
      const validIn = prev.inSec !== null && prev.inSec < newOut ? prev.inSec : 0;
      return {
        inSec: validIn,
        outSec: newOut,
        isActive: true
      };
    });
  }, [slideTimeSec]);

  const clearInOutPoints = useCallback(() => {
    setInOutRange({ inSec: null, outSec: null, isActive: false });
  }, []);

  // =========================================================================
  // GLOBAL RUNNER VS SOLO INSPECTOR ADVANCEMENT
  // =========================================================================

  // Jump to Next Slide (ArrowRight in Global Mode)
  const nextSlide = useCallback(() => {
    const nextIdx = (currentIndex + 1) % totalSlides;
    setCurrentIndex(nextIdx);
    setSlideTimeSec(0);
    onSlideChange?.(nextIdx);
    seekVideoToTime(0);
  }, [currentIndex, totalSlides, onSlideChange, seekVideoToTime]);

  // Jump to Previous Slide (ArrowLeft in Global Mode)
  const prevSlide = useCallback(() => {
    const prevIdx = (currentIndex - 1 + totalSlides) % totalSlides;
    setCurrentIndex(prevIdx);
    setSlideTimeSec(0);
    onSlideChange?.(prevIdx);
    seekVideoToTime(0);
  }, [currentIndex, totalSlides, onSlideChange, seekVideoToTime]);

  // Select Slide directly (Clicking thumbnail enters SOLO_INSPECTOR Mode B)
  const selectSlide = useCallback((index: number, lockSolo: boolean = true) => {
    const safeIdx = Math.max(0, Math.min(totalSlides - 1, index));
    setCurrentIndex(safeIdx);
    setSlideTimeSec(0);
    if (lockSolo) {
      setPlaybackMode('solo');
    }
    onSlideChange?.(safeIdx);
    seekVideoToTime(0);
  }, [totalSlides, onSlideChange, seekVideoToTime]);

  // Scrub slide time
  const scrubSlideTime = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_DURATION_SEC, timeSec));
    setSlideTimeSec(clamped);
    seekVideoToTime(clamped);
    onTimeUpdate?.(clamped, currentIndex * SLIDE_DURATION_SEC + clamped);
  }, [currentIndex, seekVideoToTime, onTimeUpdate]);

  // Scrub global time across 100 slides
  const scrubGlobalTime = useCallback((globalSec: number) => {
    const clampedGlobal = Math.max(0, Math.min(totalDurationSec, globalSec));
    const targetSlide = Math.min(totalSlides - 1, Math.floor(clampedGlobal / SLIDE_DURATION_SEC));
    const localSec = clampedGlobal % SLIDE_DURATION_SEC;

    if (targetSlide !== currentIndex) {
      setCurrentIndex(targetSlide);
      onSlideChange?.(targetSlide);
    }
    setSlideTimeSec(localSec);
    seekVideoToTime(localSec);
    onTimeUpdate?.(localSec, clampedGlobal);
  }, [totalDurationSec, totalSlides, currentIndex, onSlideChange, seekVideoToTime, onTimeUpdate]);

  // =========================================================================
  // MASTER PLAYBACK TICKER & DOUBLE-BUFFER PRE-HYDRATION
  // =========================================================================
  useEffect(() => {
    if (!isPlaying || jklVelocity <= 0) return;

    let animId: number;

    const tick = (now: DOMHighResTimeStamp) => {
      const deltaSec = (now - lastWallTimeRef.current) / 1000;
      lastWallTimeRef.current = now;

      setSlideTimeSec((prev) => {
        let next = prev + deltaSec * jklVelocity;

        // In/Out range check in Solo mode
        if (inOutRange.isActive && inOutRange.outSec !== null && inOutRange.inSec !== null) {
          if (next >= inOutRange.outSec) {
            next = inOutRange.inSec;
            seekVideoToTime(next);
          }
          return next;
        }

        // Check for double-buffering pre-hydration at 10.5s (1.5s prior to 12.0s boundary)
        if (playbackMode === 'sequence' && next >= 10.5) {
          setShouldPrehydrate(true);
        } else {
          setShouldPrehydrate(false);
        }

        // Slide boundary reached (12.000s)
        if (next >= SLIDE_DURATION_SEC) {
          if (playbackMode === 'sequence') {
            // Mode A: HERO GLOBAL RUNNER -> Advance to next slide
            const nextIdx = (currentIndex + 1) % totalSlides;
            setCurrentIndex(nextIdx);
            onSlideChange?.(nextIdx);
            next = 0;
            seekVideoToTime(0);
          } else {
            // Mode B: SOLO ADVANCED INSPECTOR -> Loop within isolated 12.0s
            next = isLooping ? 0 : SLIDE_DURATION_SEC;
            seekVideoToTime(next);
            if (!isLooping) {
              applyVelocity(0);
            }
          }
        }

        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    lastWallTimeRef.current = performance.now();
    animId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, jklVelocity, inOutRange, playbackMode, currentIndex, totalSlides, isLooping, onSlideChange, seekVideoToTime, applyVelocity]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopReversePlayback();
    };
  }, [stopReversePlayback]);

  return {
    currentIndex,
    playbackMode,
    slideTimeSec,
    globalTimeSec,
    currentFrameInSlide,
    totalFramesInSlide: SLIDE_TOTAL_FRAMES_24FPS,
    totalDurationSec,
    isPlaying,
    isLooping,
    jklVelocity,
    inOutRange,
    shouldPrehydrate,
    // Actions
    togglePlay,
    applyVelocity,
    handleShuttleReverse,
    handleShuttleStop,
    handleShuttleForward,
    stepFrame,
    setInPoint,
    setOutPoint,
    clearInOutPoints,
    nextSlide,
    prevSlide,
    selectSlide,
    scrubSlideTime,
    scrubGlobalTime,
    setPlaybackMode,
    setIsLooping,
    attachVideoElement
  };
}
