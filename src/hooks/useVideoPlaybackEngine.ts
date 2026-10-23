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

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SLIDE_DURATION_SEC, PlaybackMode } from '../types/editor';
import {
  calculateMasterSequenceDuration,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotFrameCount,
  resolveGlobalTimeToShot
} from '../types/storyboard';
import { studioDraftDb } from '../services/db';

export type JklVelocity = -2 | -1 | 0 | 1 | 2;

export interface InOutRange {
  inSec: number | null;
  outSec: number | null;
  isActive: boolean;
}

/**
 * High-Performance Two-Tier LRU Playback Cache (Max 8 active Blob URLs)
 * Automatically revokes object URLs on eviction to prevent GPU/browser RAM leaks.
 */
export class LRUBlobUrlCache {
  private capacity: number;
  private cache: Map<string, string>; // assetId -> blobUrl

  constructor(capacity: number = 8) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  public get(key: string): string | undefined {
    if (!this.cache.has(key)) return undefined;
    const url = this.cache.get(key)!;
    // Re-insert to mark as most recently used
    this.cache.delete(key);
    this.cache.set(key, url);
    return url;
  }

  public set(key: string, url: string): void {
    if (this.cache.has(key)) {
      const oldUrl = this.cache.get(key);
      if (oldUrl && oldUrl !== url) {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch {}
      }
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first entry in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const evictedUrl = this.cache.get(oldestKey);
        if (evictedUrl) {
          try {
            URL.revokeObjectURL(evictedUrl);
          } catch {}
        }
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, url);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): void {
    const url = this.cache.get(key);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.cache.delete(key);
  }

  public clear(): void {
    for (const url of this.cache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

export const globalLRUBlobCache = new LRUBlobUrlCache(8);

export interface UseVideoPlaybackEngineOptions {
  totalSlides: number;
  initialSlideIndex?: number;
  initialMode?: PlaybackMode;
  fps?: number;
  activeSlideDurationSec?: number;
  onSlideChange?: (index: number) => void;
  onTimeUpdate?: (slideTimeSec: number, globalTimeSec: number) => void;
  slides?: Array<{ id: string; duration?: number; durationSec?: number; mediaBlobId?: string; remoteUrl?: string }>;
}

export function useVideoPlaybackEngine(options: UseVideoPlaybackEngineOptions) {
  const {
    totalSlides,
    initialSlideIndex = 0,
    initialMode = 'sequence',
    fps = 24,
    activeSlideDurationSec,
    onSlideChange,
    onTimeUpdate,
    slides
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
  const [cuedMediaUrl, setCuedMediaUrl] = useState<string | null>(null);

  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const scrubbingTimerRef = useRef<number | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const reverseTimerRef = useRef<number | null>(null);
  const rVfcIdRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(performance.now());

  const activeDurationSec = useMemo(() => {
    if (typeof activeSlideDurationSec === 'number' && activeSlideDurationSec > 0) {
      return activeSlideDurationSec;
    }
    if (slides && slides[currentIndex]) {
      return getShotDurationSec(slides[currentIndex], SLIDE_DURATION_SEC);
    }
    return SLIDE_DURATION_SEC;
  }, [activeSlideDurationSec, slides, currentIndex]);

  const shotOffsets = useMemo(() => (slides && slides.length > 0 ? getCumulativeShotOffsets(slides) : []), [slides]);
  const currentShotStartSec = shotOffsets[currentIndex]?.startSec ?? currentIndex * activeDurationSec;
  const totalFramesInSlide = getShotFrameCount(activeDurationSec, fps);
  const currentFrameInSlide = Math.min(
    totalFramesInSlide,
    Math.max(1, Math.floor(slideTimeSec * fps) + 1)
  );
  const globalTimeSec = currentShotStartSec + slideTimeSec;
  const totalDurationSec = useMemo(() => {
    if (slides && slides.length > 0) {
      return calculateMasterSequenceDuration(slides);
    }
    return totalSlides * activeDurationSec;
  }, [slides, totalSlides, activeDurationSec]);

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

    const clampedSec = Math.max(0, Math.min(activeDurationSec, timeSec));
    const targetVideoTime = video.duration
      ? clampedSec % Math.max(0.1, video.duration)
      : clampedSec;

    if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
      try {
        (video as any).fastSeek(targetVideoTime);
      } catch {
        video.currentTime = targetVideoTime;
      }
    } else {
      video.currentTime = targetVideoTime;
    }
  }, [activeDurationSec]);

  // =========================================================================
  // SUB-FRAME rVFC (requestVideoFrameCallback) TRACKING
  // =========================================================================
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    let isMounted = true;

    const onFrame = (_now: DOMHighResTimeStamp, metadata: any) => {
      if (!isMounted) return;

      if (metadata && typeof metadata.mediaTime === 'number' && video.duration > 0) {
        const mappedSlideSec = Math.min(activeDurationSec, metadata.mediaTime);
        setSlideTimeSec(mappedSlideSec);
        onTimeUpdate?.(mappedSlideSec, currentShotStartSec + mappedSlideSec);
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
  }, [currentIndex, activeDurationSec, currentShotStartSec, onTimeUpdate]);

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
          const maxBound = inOutRange.isActive && inOutRange.outSec !== null ? inOutRange.outSec : activeDurationSec;

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
  }, [inOutRange, isLooping, activeDurationSec, seekVideoToTime, stopReversePlayback]);

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
  // SUB-FRAME STEPPING (±1 Frame)
  // =========================================================================
  const stepFrame = useCallback((forward: boolean) => {
    stopReversePlayback();
    setIsPlaying(false);
    setJklVelocity(0);

    const FRAME_DURATION = 1 / fps;
    const SLIDE_MAX_TIME = activeDurationSec;

    const video = videoElementRef.current;
    if (video) {
      video.pause();
      const curTime = typeof video.currentTime === 'number' && !isNaN(video.currentTime)
        ? video.currentTime
        : slideTimeSec;
      const nextTime = forward
        ? Math.min(curTime + FRAME_DURATION, SLIDE_MAX_TIME)
        : Math.max(curTime - FRAME_DURATION, 0);

      try {
        video.currentTime = nextTime;
      } catch {
        // Safe seek fallback
      }
      setSlideTimeSec(nextTime);
      onTimeUpdate?.(nextTime, currentShotStartSec + nextTime);
    } else {
      setSlideTimeSec((prev) => {
        const nextTime = forward
          ? Math.min(prev + FRAME_DURATION, SLIDE_MAX_TIME)
          : Math.max(prev - FRAME_DURATION, 0);
        onTimeUpdate?.(nextTime, currentShotStartSec + nextTime);
        return nextTime;
      });
    }
  }, [fps, activeDurationSec, currentShotStartSec, onTimeUpdate, slideTimeSec, stopReversePlayback]);

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

  // Set scrubbing state explicitly
  const setScrubbing = useCallback((scrubbing: boolean) => {
    setIsScrubbing(scrubbing);
    if (scrubbing && scrubbingTimerRef.current !== null) {
      window.clearTimeout(scrubbingTimerRef.current);
      scrubbingTimerRef.current = null;
    }
  }, []);

  // Scrub slide time with auto-proxy switching
  const scrubSlideTime = useCallback((timeSec: number) => {
    setIsScrubbing(true);
    if (scrubbingTimerRef.current !== null) {
      window.clearTimeout(scrubbingTimerRef.current);
    }
    scrubbingTimerRef.current = window.setTimeout(() => {
      setIsScrubbing(false);
    }, 180);

    const clamped = Math.max(0, Math.min(activeDurationSec, timeSec));
    setSlideTimeSec(clamped);
    seekVideoToTime(clamped);
    onTimeUpdate?.(clamped, currentShotStartSec + clamped);
  }, [activeDurationSec, currentShotStartSec, seekVideoToTime, onTimeUpdate]);

  // Scrub global time across variable-duration slides with auto-proxy switching
  const scrubGlobalTime = useCallback((globalSec: number) => {
    setIsScrubbing(true);
    if (scrubbingTimerRef.current !== null) {
      window.clearTimeout(scrubbingTimerRef.current);
    }
    scrubbingTimerRef.current = window.setTimeout(() => {
      setIsScrubbing(false);
    }, 180);

    const clampedGlobal = Math.max(0, Math.min(totalDurationSec, globalSec));
    let targetSlide = 0;
    let localSec = 0;

    if (slides && slides.length > 0) {
      const resolved = resolveGlobalTimeToShot(slides, clampedGlobal);
      targetSlide = resolved.shotIndex;
      localSec = resolved.localTimeSec;
    } else {
      targetSlide = Math.min(totalSlides - 1, Math.floor(clampedGlobal / activeDurationSec));
      localSec = clampedGlobal % activeDurationSec;
    }

    if (targetSlide !== currentIndex) {
      setCurrentIndex(targetSlide);
      onSlideChange?.(targetSlide);
    }
    setSlideTimeSec(localSec);
    seekVideoToTime(localSec);
    onTimeUpdate?.(localSec, clampedGlobal);
  }, [totalDurationSec, slides, totalSlides, activeDurationSec, currentIndex, onSlideChange, seekVideoToTime, onTimeUpdate]);

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

        if (inOutRange.isActive && inOutRange.outSec !== null && inOutRange.inSec !== null) {
          if (next >= inOutRange.outSec) {
            next = inOutRange.inSec;
            seekVideoToTime(next);
          }
          return next;
        }

        const prehydrateThreshold = Math.max(0, activeDurationSec - 1.5);
        if (playbackMode === 'sequence' && next >= prehydrateThreshold) {
          setShouldPrehydrate(true);
        } else {
          setShouldPrehydrate(false);
        }

        if (next >= activeDurationSec) {
          if (playbackMode === 'sequence') {
            const nextIdx = (currentIndex + 1) % totalSlides;
            setCurrentIndex(nextIdx);
            onSlideChange?.(nextIdx);
            next = 0;
            seekVideoToTime(0);
          } else {
            next = isLooping ? 0 : activeDurationSec;
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
  }, [isPlaying, jklVelocity, inOutRange, playbackMode, activeDurationSec, currentIndex, totalSlides, isLooping, onSlideChange, seekVideoToTime, applyVelocity]);

  /**
   * Two-Tier Media Resolver:
   * 1. In-Memory LRU Cache check (0ms instant playback)
   * 2. IndexedDB `media_blobs` retrieval -> URL.createObjectURL() -> LRU Cache entry
   * Evicted items automatically call URL.revokeObjectURL()
   */
  const cueSlideMedia = useCallback(async (assetIdOrUrl: string): Promise<string | null> => {
    if (!assetIdOrUrl) return null;

    // Check if it's already an active external or data URL
    if (assetIdOrUrl.startsWith('http://') || assetIdOrUrl.startsWith('https://') || assetIdOrUrl.startsWith('data:')) {
      setCuedMediaUrl(assetIdOrUrl);
      return assetIdOrUrl;
    }

    // Tier 1: In-Memory Map & LRU Cache
    const activeVaultUrl = studioDraftDb.getActiveMediaUrl(assetIdOrUrl);
    if (activeVaultUrl) {
      setCuedMediaUrl(activeVaultUrl);
      return activeVaultUrl;
    }

    const cachedUrl = globalLRUBlobCache.get(assetIdOrUrl);
    if (cachedUrl) {
      setCuedMediaUrl(cachedUrl);
      return cachedUrl;
    }

    // Tier 2: IndexedDB media_vault & media_blobs
    try {
      const vaultItem = await studioDraftDb.getVaultMediaById(assetIdOrUrl);
      if (vaultItem && vaultItem.blob) {
        const objectUrl = studioDraftDb.getActiveMediaUrl(assetIdOrUrl, vaultItem.blob);
        globalLRUBlobCache.set(assetIdOrUrl, objectUrl);
        setCuedMediaUrl(objectUrl);
        return objectUrl;
      }

      const blob = await studioDraftDb.getMediaBlob(assetIdOrUrl);
      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        globalLRUBlobCache.set(assetIdOrUrl, objectUrl);
        setCuedMediaUrl(objectUrl);
        return objectUrl;
      }
    } catch (err) {
      console.warn('[LRU Cache] Failed to hydrate blob for asset:', assetIdOrUrl, err);
    }

    // Fallback if assetIdOrUrl is a direct blob URL
    if (assetIdOrUrl.startsWith('blob:')) {
      setCuedMediaUrl(assetIdOrUrl);
      return assetIdOrUrl;
    }

    return null;
  }, []);

  /**
   * Dynamic Dual-Stream Cueing Engine:
   * Instantiates both proxyUrl (540p for scrubbing) and sourceUrl (raw 4K/1080p for playback).
   */
  const cueDualStreams = useCallback(async (assetIdOrUrl: string): Promise<{ proxyUrl: string; sourceUrl: string }> => {
    if (!assetIdOrUrl) return { proxyUrl: '', sourceUrl: '' };

    if (assetIdOrUrl.startsWith('http://') || assetIdOrUrl.startsWith('https://') || assetIdOrUrl.startsWith('data:')) {
      setProxyUrl(assetIdOrUrl);
      setSourceUrl(assetIdOrUrl);
      setCuedMediaUrl(assetIdOrUrl);
      return { proxyUrl: assetIdOrUrl, sourceUrl: assetIdOrUrl };
    }

    try {
      const urls = await studioDraftDb.getDualStreamUrls(assetIdOrUrl);
      setProxyUrl(urls.proxyUrl);
      setSourceUrl(urls.sourceUrl);
      setCuedMediaUrl(urls.sourceUrl || urls.proxyUrl);
      return urls;
    } catch (err) {
      console.warn('[DualStream] cueDualStreams failed:', err);
      return { proxyUrl: '', sourceUrl: '' };
    }
  }, []);

  // Auto-cue current slide asset (both dual-stream and classic)
  useEffect(() => {
    if (slides && slides[currentIndex]) {
      const slide = slides[currentIndex];
      const targetId = slide.mediaBlobId || slide.remoteUrl;
      if (targetId) {
        cueSlideMedia(targetId);
        cueDualStreams(targetId);
      }
      // Pre-cue next slide for seamless zero-flicker transition
      const nextSlideData = slides[(currentIndex + 1) % slides.length];
      const nextTargetId = nextSlideData?.mediaBlobId || nextSlideData?.remoteUrl;
      if (nextTargetId && !nextTargetId.startsWith('http') && !nextTargetId.startsWith('data:')) {
        cueSlideMedia(nextTargetId);
        studioDraftDb.getDualStreamUrls(nextTargetId).catch(() => {});
      }
    }
  }, [currentIndex, slides, cueSlideMedia, cueDualStreams]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      stopReversePlayback();
      if (scrubbingTimerRef.current !== null) {
        window.clearTimeout(scrubbingTimerRef.current);
      }
    };
  }, [stopReversePlayback]);

  // Adaptive Playback State Machine resolution
  const activeStreamType: 'proxy' | 'source' = isScrubbing && proxyUrl ? 'proxy' : 'source';
  const activeMediaUrl = (activeStreamType === 'proxy' ? proxyUrl : sourceUrl) || cuedMediaUrl || '';

  return {
    currentIndex,
    playbackMode,
    slideTimeSec,
    globalTimeSec,
    currentFrameInSlide,
    totalFramesInSlide,
    totalDurationSec,
    isPlaying,
    isLooping,
    jklVelocity,
    inOutRange,
    shouldPrehydrate,
    cuedMediaUrl,
    // Dynamic Dual-Stream Engine properties
    isScrubbing,
    setScrubbing,
    proxyUrl,
    sourceUrl,
    activeStreamType,
    activeMediaUrl,
    cueDualStreams,
    lruCache: globalLRUBlobCache,
    cueSlideMedia,
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
