/**
 * @file /src/components/stage/TactileStage.tsx
 * @description Master Tactile Cinema Stage & Adaptive Dual-Stream Viewport.
 * Features:
 * - Dynamic Dual-Stream Engine: Lightweight 540p proxy for 24fps zero-latency scrubbing,
 *   full-resolution 4K/1080p source file during playback and fullscreen.
 * - Reactive real-time bilingual titles (Bangla + English).
 * - Zero-cloud bulk ingest via Drag & Drop directly into IndexedDB media_vault.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { PlaybackMode } from '../../types/editor';
import { StageTextOverlay } from '../StageTextOverlay';
import { studioDraftDb } from '../../services/db';
import { getLutFilterCSS, calculateMultiLayerZoom } from '../../utils/engine';
import { useStudioStore } from '../../core/store';
import {
  Play,
  Pause,
  Upload,
  Maximize2,
  Film,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Volume2,
  VolumeX,
  Type,
  ZoomIn,
  Repeat,
  Music
} from 'lucide-react';
import { StudioModuleId } from '../StudioNavRail';
import { ReviewMarkupCanvas } from './ReviewMarkupCanvas';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { 
  extractVideoPoster, 
  thumbnailMemoryCache, 
  cleanupVideoElement 
} from '../../services/thumbnailEngine';
import { useTitleContainerRepaint } from '../../hooks/useTitleContainerRepaint';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { audioEngine } from '../../utils/audioEngine';
import { framesToTimecode } from '../../utils/timecode';
import {
  clampShotDuration,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps
} from '../../types/storyboard';
import {
  buildFilmStockCssFilter,
  applyCinematicPostProcess,
  getFilmStockMeta
} from '../../services/cinematicFilterEngine';
import { FilterGradingTray } from './FilterGradingTray';
import { KineticCaptionOverlay } from './KineticCaptionOverlay';
import { FrameAdjustments, LutPreset } from '../../types/anthology';

export interface TactileStageProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  currentFrame: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onUpdateFrameAtIndex?: (index: number, updated: AnthologyFrame) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  onReorderFrames?: (newFrames: AnthologyFrame[]) => void;
  onUploadImage?: (file: File) => void;
  onOpenAnimatic?: () => void;
  onOpenInspector?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideTimeSec?: number;
  onTogglePlay?: () => void;
  onStepFrame?: (fwd: boolean) => void;
  onScrubSlideTime?: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  playbackSpeed?: number;
  onChangePlaybackSpeed?: (speed: number) => void;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
  onPurgeMedia?: () => void;
  projectTitle?: string;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  detectedBpm?: number;
  isAudioMuted?: boolean;
  activeModule?: StudioModuleId;
}

export const TactileStage: React.FC<TactileStageProps> = ({
  frames = [],
  currentIndex = 0,
  currentFrame,
  aspectRatio = '2.39:1',
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  componentsVisibility,
  onSelectFrame,
  onUpdateFrame,
  onUpdateFrameAtIndex,
  onApplyDurationToAll,
  onMatchAudioBeats,
  onUploadImage,
  onOpenInspector,
  onToggleTitles,
  showTitles = true,
  playbackMode = 'sequence',
  onTogglePlay,
  onStepFrame,
  slideTimeSec = 0,
  onPurgeMedia,
  activeModule,
  onScrubSlideTime,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onReorderFrames,
  detectedBpm = 120
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageTitleContainerRef = useRef<HTMLDivElement | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef<boolean>(false);
  const isDraggingScrubberRef = useRef<boolean>(false);
  const lastScrubTimeRef = useRef<number>(0);
  const wasAudioMutedBeforeScrubRef = useRef<boolean>(true);
  const slideTimeSecRef = useRef<number>(slideTimeSec);
  slideTimeSecRef.current = slideTimeSec;

  const frameBitmapCacheRef = useRef<Map<number, ImageBitmap>>(new Map());
  const cachedPosterImgRef = useRef<HTMLImageElement | null>(null);

  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [cachedPosterUrl, setCachedPosterUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isZoomControlsOpen, setIsZoomControlsOpen] = useState(false);
  const [isFilterTrayOpen, setIsFilterTrayOpen] = useState(false);

  // Auto-open filter dock when OPTICS or LIBRARY module is selected
  useEffect(() => {
    if (activeModule === 'OPTICS' || activeModule === 'LIBRARY') {
      setIsFilterTrayOpen(true);
    }
  }, [activeModule]);

  // Subtle Cross-Dissolve Transition State
  const [outgoingMedia, setOutgoingMedia] = useState<{
    url: string;
    isVideo: boolean;
    filter: string;
    title?: string;
  } | null>(null);
  const [isCrossDissolving, setIsCrossDissolving] = useState(false);
  const dissolveTimerRef = useRef<number | null>(null);
  const prevIndexRef = useRef<number>(currentIndex);
  const prevMediaUrlRef = useRef<string | null>(null);
  const prevFilterRef = useRef<string>('');
  const prevIsVideoRef = useRef<boolean>(false);
  const prevTitleRef = useRef<string>('');

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const zoomTransforms = calculateMultiLayerZoom(bgZoom, fgZoom, isVertigo);

  const storeTitleConfig = useStudioStore(s => s.titleConfig);
  const storeVisibility = useStudioStore(s => s.visibility.titlesAll);
  const toggleTitlesStore = useStudioStore(s => s.toggleTitles);
  const isTitlesActive = componentsVisibility !== undefined
    ? Boolean(
        showTitles !== false &&
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean((showTitles !== false) && (storeTitleConfig?.showTitles ?? true) && (storeVisibility ?? true));

  // Active frame fallback
  const frame = currentFrame || frames[currentIndex] || frames[0];
  const activeShotDurationSec = getShotDurationSec(frame, 12.0);
  const activeShotFps = getShotTargetFps(frame, 24);
  const activeTotalFrames = getShotFrameCount(activeShotDurationSec, activeShotFps);
  const activeFrameNum = Math.min(
    activeTotalFrames,
    Math.max(1, Math.floor(Math.min(slideTimeSec, activeShotDurationSec) * activeShotFps) + 1)
  );
  const progressPercent = activeShotDurationSec > 0
    ? Math.min(100, Math.max(0, (slideTimeSec / activeShotDurationSec) * 100))
    : 0;

  // Master total sequence runtime calculation across all timeline shots
  const totalMasterRuntimeSec = useMemo(() => {
    return frames.reduce((acc, f) => acc + getShotDurationSec(f, 12.0), 0);
  }, [frames]);

  const masterTimecode = useMemo(() => {
    return framesToTimecode(Math.floor(totalMasterRuntimeSec * activeShotFps), activeShotFps);
  }, [totalMasterRuntimeSec, activeShotFps]);

  const handleChangeCurrentDuration = async (newDurationSec: number) => {
    if (!frame) return;
    const clamped = clampShotDuration(newDurationSec);
    const updated: AnthologyFrame = {
      ...frame,
      slideHoldSec: clamped,
      durationSec: clamped
    };
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
    // Write directly to active shot in IndexedDB
    try {
      await studioDraftDb.updateSlideHoldSec(currentIndex, clamped);
    } catch (err) {
      console.warn('[TactileStage] Failed to write duration to IndexedDB:', err);
    }
  };

  const handleRippleAll = async () => {
    if (!frames.length) return;
    const currentDur = activeShotDurationSec;
    if (onApplyDurationToAll) {
      onApplyDurationToAll(currentDur);
    }
    try {
      await studioDraftDb.rippleAllSlideDurations(currentDur);
    } catch (err) {
      console.warn('[TactileStage] Failed to persist ripple to IndexedDB:', err);
    }
  };

  const handleMatchBeats = () => {
    if (onMatchAudioBeats) {
      onMatchAudioBeats();
    }
  };

  const handleChangeCurrentFps = (newFps: number) => {
    if (!frame) return;
    const updated: AnthologyFrame = {
      ...frame,
      targetFps: newFps === 60 ? 60 : 24
    };
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
  };

  const handleUpdateCurrentFrame = (updated: AnthologyFrame) => {
    if (onUpdateFrameAtIndex) {
      onUpdateFrameAtIndex(currentIndex, updated);
    } else if (onUpdateFrame) {
      onUpdateFrame(updated);
    }
  };

  const handleApplyGradeToAll = (lut: LutPreset, adj: FrameAdjustments) => {
    if (!frames.length) return;
    const updatedFrames = frames.map(f => ({
      ...f,
      lutFilter: lut,
      adjustments: { ...f.adjustments, ...adj }
    }));
    if (onReorderFrames) {
      onReorderFrames(updatedFrames);
    } else if (onUpdateFrameAtIndex) {
      updatedFrames.forEach((uf, idx) => onUpdateFrameAtIndex(idx, uf));
    }
  };

  useTitleContainerRepaint({
    containerRef: stageTitleContainerRef,
    visibility: componentsVisibility,
    isVisible: isTitlesActive,
    label: 'TactileStage',
    activeKey: currentIndex
  });

  // Resolve sourceBlob vs proxyBlob for Adaptive Dual-Stream switching & cached poster fallback
  useEffect(() => {
    let isCancelled = false;

    // Check memory cache or frame thumbnail first to instantly prevent black slate
    const initialPoster = thumbnailMemoryCache.get(String(frame?.id)) || frame?.thumbnailUrl;
    if (initialPoster) {
      setCachedPosterUrl(initialPoster);
    }

    const resolveMediaStreams = async () => {
      if (!frame) return;

      // 1. Direct image or video URL on frame
      if (frame.imageUrl) {
        if (!isCancelled) {
          setSourceUrl(frame.imageUrl);
          setProxyUrl(frame.imageUrl);
        }
      }

      // 2. Check IndexedDB media vault
      try {
        const slot = await studioDraftDb.getTimelineSlot(currentIndex);
        if (slot?.mediaId) {
          const vaultItem = await studioDraftDb.getVaultMediaItem(slot.mediaId);
          if (vaultItem && !isCancelled) {
            if (vaultItem.thumbnailUrl) {
              setCachedPosterUrl(vaultItem.thumbnailUrl);
              thumbnailMemoryCache.set(slot.mediaId, vaultItem.thumbnailUrl);
            }
            const rawUrl = URL.createObjectURL(vaultItem.blob);
            setSourceUrl(rawUrl);

            const proxy = await studioDraftDb.getMediaProxy(slot.mediaId);
            if (proxy && !isCancelled) {
              const pUrl = URL.createObjectURL(proxy.blob);
              setProxyUrl(pUrl);
            } else if (!isCancelled) {
              setProxyUrl(rawUrl);
            }
          }
        }
      } catch (err) {
        console.warn('Error resolving media streams from vault:', err);
      }
    };

    resolveMediaStreams();

    return () => {
      isCancelled = true;
    };
  }, [currentIndex, frame?.imageUrl, frame?.thumbnailUrl, frame?.id]);

  // Video decoder teardown on unmount (4GB Guard)
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        cleanupVideoElement(videoRef.current);
      }
    };
  }, []);

  // Determine active media URL based on playback state machine:
  // - While Scrubbing / Dragging -> Fast proxyUrl (540p for zero-latency 24fps)
  // - While Playing / Fullscreen -> Pristine full-resolution sourceUrl
  const activeMediaUrl = (isScrubbing && proxyUrl) ? proxyUrl : (sourceUrl || frame?.imageUrl || null);

  const lutFilterStyle = getLutFilterCSS(frame?.lutFilter, frame?.adjustments);
  const combinedMediaFilter = zoomTransforms.bgDepthBlur !== 'none'
    ? `${lutFilterStyle} ${zoomTransforms.bgDepthBlur}`
    : lutFilterStyle;

  // Track Shot Changes for Subtle Filmic Cross-Dissolve Animation
  useEffect(() => {
    if (prevIndexRef.current !== currentIndex) {
      if (prevMediaUrlRef.current && prevMediaUrlRef.current !== activeMediaUrl && !isScrubbing) {
        if (dissolveTimerRef.current) {
          window.clearTimeout(dissolveTimerRef.current);
        }
        setOutgoingMedia({
          url: prevMediaUrlRef.current,
          isVideo: prevIsVideoRef.current,
          filter: prevFilterRef.current,
          title: prevTitleRef.current
        });
        setIsCrossDissolving(true);

        dissolveTimerRef.current = window.setTimeout(() => {
          setIsCrossDissolving(false);
          setOutgoingMedia(null);
        }, 340);
      }
      prevIndexRef.current = currentIndex;
    }

    if (activeMediaUrl) {
      prevMediaUrlRef.current = activeMediaUrl;
      prevFilterRef.current = combinedMediaFilter;
      prevIsVideoRef.current = Boolean(frame?.isVideo || activeMediaUrl.includes('video') || activeMediaUrl.endsWith('.mp4'));
      prevTitleRef.current = frame?.title || '';
    }
  }, [currentIndex, activeMediaUrl, isScrubbing, combinedMediaFilter, frame]);

  useEffect(() => {
    return () => {
      if (dissolveTimerRef.current) {
        window.clearTimeout(dissolveTimerRef.current);
      }
    };
  }, []);

  // Sync cached poster element for instant fallback
  useEffect(() => {
    if (cachedPosterUrl) {
      const img = new Image();
      img.src = cachedPosterUrl;
      cachedPosterImgRef.current = img;
    } else {
      cachedPosterImgRef.current = null;
    }
  }, [cachedPosterUrl]);

  // Sync still image plate
  useEffect(() => {
    const isVideo = Boolean(frame?.isVideo || activeMediaUrl?.includes('video') || activeMediaUrl?.endsWith('.mp4') || activeMediaUrl?.endsWith('.webm'));
    if (activeMediaUrl && !isVideo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeMediaUrl;
      img.onload = () => {
        imageElementRef.current = img;
      };
    } else {
      imageElementRef.current = null;
    }
  }, [activeMediaUrl, frame?.isVideo]);

  // Clear bitmap cache on shot change
  useEffect(() => {
    for (const bmp of frameBitmapCacheRef.current.values()) {
      try { bmp.close(); } catch {}
    }
    frameBitmapCacheRef.current.clear();
  }, [currentIndex]);

  // Canvas-Accelerated Blit: Draw active video frames or cached bitmaps to <canvas> via requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const drawCover = (ctx: CanvasRenderingContext2D, source: CanvasImageSource, targetW: number, targetH: number) => {
      let sw = 1920;
      let sh = 1080;
      if (source instanceof HTMLVideoElement) {
        sw = source.videoWidth || 1920;
        sh = source.videoHeight || 1080;
      } else if (source instanceof HTMLImageElement) {
        sw = source.naturalWidth || 1920;
        sh = source.naturalHeight || 1080;
      } else if (source instanceof ImageBitmap) {
        sw = source.width;
        sh = source.height;
      }
      if (sw <= 0 || sh <= 0) return;

      const mediaAspect = sw / sh;
      const targetAspect = targetW / targetH;
      let dw = targetW;
      let dh = targetH;
      let dx = 0;
      let dy = 0;

      if (mediaAspect > targetAspect) {
        dw = targetH * mediaAspect;
        dx = (targetW - dw) / 2;
      } else {
        dh = targetW / mediaAspect;
        dy = (targetH - dh) / 2;
      }

      ctx.drawImage(source, dx, dy, dw, dh);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const targetW = Math.round((rect.width || 1280) * dpr);
          const targetH = Math.round((rect.height || 536) * dpr);
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const isVideo = Boolean(frame?.isVideo || activeMediaUrl?.includes('video') || activeMediaUrl?.endsWith('.mp4') || activeMediaUrl?.endsWith('.webm'));
          const video = videoRef.current;

          const filmFilter = buildFilmStockCssFilter(frame?.lutFilter || 'kodak_vision3', frame?.adjustments);
          if (filmFilter && filmFilter !== 'none') {
            ctx.filter = filmFilter;
          }

          if (isVideo && video) {
            if (isScrubbingRef.current && (video.seeking || video.readyState < 2)) {
              // During active timeline scrubbing: Blit closest cached frame bitmap with 0ms DOM lag
              const currentF = Math.round(slideTimeSecRef.current * activeShotFps);
              let closestBmp: ImageBitmap | null = null;
              let minDiff = Infinity;
              for (const [fn, bmp] of frameBitmapCacheRef.current.entries()) {
                const diff = Math.abs(fn - currentF);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestBmp = bmp;
                }
              }
              if (closestBmp) {
                drawCover(ctx, closestBmp, targetW, targetH);
              } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
                drawCover(ctx, cachedPosterImgRef.current, targetW, targetH);
              }
            } else if (video.readyState >= 2 && video.videoWidth > 0) {
              drawCover(ctx, video, targetW, targetH);

              // Cache decoded frame bitmap for frictionless instant scrubbing blit
              const currentF = Math.round(slideTimeSecRef.current * activeShotFps);
              if (!frameBitmapCacheRef.current.has(currentF) && frameBitmapCacheRef.current.size < 60) {
                createImageBitmap(video).then(bmp => {
                  if (frameBitmapCacheRef.current.size >= 60) {
                    const oldest = frameBitmapCacheRef.current.keys().next().value;
                    if (oldest !== undefined) {
                      frameBitmapCacheRef.current.get(oldest)?.close();
                      frameBitmapCacheRef.current.delete(oldest);
                    }
                  }
                  frameBitmapCacheRef.current.set(currentF, bmp);
                }).catch(() => {});
              }
            } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
              drawCover(ctx, cachedPosterImgRef.current, targetW, targetH);
            }
          } else if (imageElementRef.current && imageElementRef.current.complete && imageElementRef.current.naturalWidth > 0) {
            drawCover(ctx, imageElementRef.current, targetW, targetH);
          } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
            drawCover(ctx, cachedPosterImgRef.current, targetW, targetH);
          }

          // Reset filter and execute 35mm optical shader pass (temperature tint, anamorphic glow, 60fps grain)
          ctx.filter = 'none';
          applyCinematicPostProcess(
            ctx,
            targetW,
            targetH,
            frame?.lutFilter || 'kodak_vision3',
            frame?.adjustments,
            slideTimeSecRef.current
          );
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeMediaUrl, activeShotFps, frame?.isVideo, frame?.lutFilter, frame?.adjustments]);

  // Frictionless Scrubbing: 16ms Throttled Pointer Drag Handlers with Audio Mute & Restore
  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingScrubberRef.current = true;
    wasAudioMutedBeforeScrubRef.current = audioEngine.getIsMuted();
    audioEngine.setMuted(true);
    setIsScrubbing(true);
    isScrubbingRef.current = true;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * activeShotDurationSec;
    slideTimeSecRef.current = targetSec;
    lastScrubTimeRef.current = performance.now();
    if (onScrubSlideTime) onScrubSlideTime(targetSec);
    const video = videoRef.current;
    if (video) {
      if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
        try { (video as any).fastSeek(targetSec); } catch { video.currentTime = targetSec; }
      } else {
        video.currentTime = targetSec;
      }
    }
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrubberRef.current) return;
    const now = performance.now();
    if (now - lastScrubTimeRef.current < 16) return; // Strict 16ms throttle
    lastScrubTimeRef.current = now;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * activeShotDurationSec;
    slideTimeSecRef.current = targetSec;
    if (onScrubSlideTime) onScrubSlideTime(targetSec);
    const video = videoRef.current;
    if (video) {
      if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
        try { (video as any).fastSeek(targetSec); } catch { video.currentTime = targetSec; }
      } else {
        video.currentTime = targetSec;
      }
    }
  };

  const handleScrubPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingScrubberRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      isDraggingScrubberRef.current = false;
      setIsScrubbing(false);
      isScrubbingRef.current = false;
      // Restore audio playback instantly as soon as scrubbing ceases
      if (!wasAudioMutedBeforeScrubRef.current) {
        audioEngine.setMuted(false);
        if (isAutoplay) {
          audioEngine.playAudio();
        }
      }
    }
  };


  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setIsIngesting(true);
      try {
        const mediaId = `vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        let posterDataUrl = '';

        if (file.type.startsWith('video/')) {
          try {
            const posterResult = await extractVideoPoster(file);
            posterDataUrl = posterResult.base64;
            thumbnailMemoryCache.set(mediaId, posterDataUrl);
            setCachedPosterUrl(posterDataUrl);
          } catch (err) {
            console.warn('Poster extraction during drop:', err);
          }
        }

        // Save raw source file with authentic non-black poster to media_vault in IndexedDB
        await studioDraftDb.addVaultMediaItem({
          id: mediaId,
          name: file.name,
          mimeType: file.type || 'video/mp4',
          size: file.size,
          blob: file,
          thumbnailUrl: posterDataUrl,
          createdAt: Date.now(),
          assignedShotIndex: currentIndex
        });

        // Assign to timeline slot
        await studioDraftDb.setTimelineSlot(currentIndex, mediaId);

        // Auto-generate lightweight proxy in background via OffscreenCanvas
        try {
          await studioDraftDb.generateProxyForMedia(mediaId, file);
        } catch (err) {
          console.warn('Background proxy generation note:', err);
        }

        const objectUrl = URL.createObjectURL(file);
        setSourceUrl(objectUrl);
        setProxyUrl(objectUrl);

        if (onUpdateFrame) {
          onUpdateFrame({
            ...frame,
            imageUrl: objectUrl,
            isVideo: file.type.startsWith('video/')
          });
        }
      } catch (err) {
        console.error('Failed to ingest dropped media:', err);
      } finally {
        setIsIngesting(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const getAspectStyle = (ar: string) => {
    switch (ar) {
      case '2.39:1':
        return { aspectRatio: '2.39 / 1' };
      case '16:9':
        return { aspectRatio: '16 / 9' };
      case '4:3':
        return { aspectRatio: '4 / 3' };
      case '1:1':
        return { aspectRatio: '1 / 1' };
      case '9:16':
        return { aspectRatio: '9 / 16' };
      default:
        return { aspectRatio: '2.39 / 1' };
    }
  };

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#050505] overflow-hidden select-none p-2 sm:p-4"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setSourceUrl(url);
            setProxyUrl(url);
            let posterDataUrl = '';
            if (file.type.startsWith('video/')) {
              try {
                const posterResult = await extractVideoPoster(file);
                posterDataUrl = posterResult.base64;
                thumbnailMemoryCache.set(String(frame?.id || currentIndex), posterDataUrl);
                setCachedPosterUrl(posterDataUrl);
              } catch (err) {
                console.warn('Poster extraction during file select:', err);
              }
            }
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: url,
                thumbnailUrl: posterDataUrl || undefined,
                isVideo: file.type.startsWith('video/')
              });
            }
          }
        }}
      />

      {/* Primary Video / Image Viewport Container */}
      <div
        style={getAspectStyle(aspectRatio)}
        className="relative w-full max-h-full max-w-6xl mx-auto bg-black border border-white/10 rounded-[2px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex items-center justify-center group"
      >
        {/* Outgoing Base Plate for Cinematic Cross-Dissolve Transition */}
        {outgoingMedia && isCrossDissolving && (
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none z-0 animate-cross-dissolve-out"
            style={{ transform: zoomTransforms.bgTransform }}
          >
            {outgoingMedia.isVideo ? (
              <video
                src={outgoingMedia.url}
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ filter: outgoingMedia.filter }}
              />
            ) : (
              <img
                src={outgoingMedia.url}
                alt="Outgoing Plate"
                className="w-full h-full object-cover"
                style={{ filter: outgoingMedia.filter }}
              />
            )}
          </div>
        )}

        {/* Incoming / Active Media Plate */}
        {activeMediaUrl ? (
          <div
            key={`shot_${currentIndex}`}
            className={`w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200 ease-out origin-center z-10 ${
              isCrossDissolving ? 'animate-cross-dissolve' : ''
            }`}
            style={{ transform: zoomTransforms.bgTransform }}
          >
            {/* Underlying cached thumbnail plate ensures zero black frames while master stream loads */}
            {cachedPosterUrl && (
              <img
                src={cachedPosterUrl}
                alt="Thumbnail Plate Fallback"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ filter: combinedMediaFilter }}
              />
            )}
            {/* Hidden hardware decoding element */}
            {(frame?.isVideo || activeMediaUrl.includes('video') || activeMediaUrl.endsWith('.mp4') || activeMediaUrl.endsWith('.webm')) && (
              <video
                ref={videoRef}
                src={activeMediaUrl}
                poster={cachedPosterUrl || undefined}
                autoPlay={isAutoplay}
                loop
                muted
                playsInline
                className="hidden"
                aria-hidden="true"
              />
            )}
            {/* Canvas-Accelerated Blit Viewport: draws active frames via requestAnimationFrame */}
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover transition-opacity duration-150 relative z-1"
              style={{ filter: combinedMediaFilter }}
            />
          </div>
        ) : cachedPosterUrl ? (
          <div
            key={`cached_shot_${currentIndex}`}
            className="w-full h-full flex items-center justify-center overflow-hidden z-10"
            style={{ transform: zoomTransforms.bgTransform }}
          >
            <img
              src={cachedPosterUrl}
              alt="Cached Shot Poster"
              className="w-full h-full object-cover"
              style={{ filter: combinedMediaFilter }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
              <Film className="w-8 h-8 opacity-60" />
            </div>
            <div>
              <p className="font-cinzel text-sm text-zinc-300 font-bold tracking-wider">
                SHOT {frame?.epNumber || '001'} // READY FOR INGEST
              </p>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono-tech">
                Drag & Drop 4K video or photo directly into this monitor
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-3.5 py-1.5 rounded-[2px] bg-[#d4af37]/20 hover:bg-[#d4af37]/35 border border-[#d4af37]/50 text-[#ffe066] text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Media Asset</span>
            </button>
          </div>
        )}

        {/* Ingesting Spinner Overlay */}
        {isIngesting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30">
            <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono-tech text-[#ffe066] tracking-wider">
              INGESTING RAW 4K ASSET & GENERATING 540P PROXY...
            </span>
          </div>
        )}

        {/* Real-Time Bilingual Titles Overlay (Foreground Multi-Layer Zoom) */}
        <div
          ref={stageTitleContainerRef}
          data-title-container="tactile-stage"
          className={`absolute inset-0 z-30 pointer-events-none transition-transform duration-200 ease-out origin-center ${
            isTitlesActive ? 'flex flex-col' : 'hidden opacity-0'
          }`}
          style={{ transform: zoomTransforms.fgTransform, filter: zoomTransforms.fgShadow }}
          aria-hidden={!isTitlesActive}
        >
          <StageTextOverlay
            shotIndex={currentIndex}
            banglaTitle={frame?.bengaliTitle}
            englishTitle={frame?.title}
            subtitle={frame?.tagline}
            directorNotes={frame?.directorNotes}
            cameraInfo={frame?.cameraSpec?.focalLength}
            isVisible={isTitlesActive}
            allowQuickControls={true}
            componentsVisibility={componentsVisibility}
          />
        </div>

        {/* Dynamic Word-Level Kinetic Caption & Subtitle Overlay */}
        <KineticCaptionOverlay
          currentFrame={frame}
          slideTimeSec={slideTimeSec}
          durationSec={activeShotDurationSec}
          detectedBpm={detectedBpm}
          onUpdateFrame={handleUpdateCurrentFrame}
          showCaptions={true}
        />

        {/* Floating 35mm Film Stock & Color Grading Tray */}
        <FilterGradingTray
          isOpen={isFilterTrayOpen}
          currentFrame={frame}
          currentIndex={currentIndex}
          totalShots={frames.length}
          onUpdateFrame={handleUpdateCurrentFrame}
          onApplyGradeToAll={handleApplyGradeToAll}
          onClose={() => setIsFilterTrayOpen(false)}
        />

        {/* Module 11: Review Visual Markup Canvas Overlay */}
        {activeModule === 'REVIEW' && (
          <ReviewMarkupCanvas
            shotIndex={currentIndex}
            slideTimeSec={slideTimeSec}
            onJumpToFrame={(targetShotIdx, targetTimeSec) => {
              onSelectFrame(targetShotIdx);
              if (onScrubSlideTime) onScrubSlideTime(targetTimeSec);
            }}
          />
        )}

        {/* Pristine Viewport: Zero-distraction cinematic frame with quick tools on hover */}
        <div className="absolute top-3 inset-x-3 pointer-events-none flex items-center justify-between text-[10px] font-mono-tech text-white/80 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-2">
            {/* Quick [ T ] Symbol Toggle on Stage */}
            <button
              type="button"
              onClick={() => {
                if (onToggleTitles) onToggleTitles();
                else toggleTitlesStore();
              }}
              className={`pointer-events-auto w-7 h-7 rounded-[3px] border font-serif text-xs font-black flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-lg ${
                isTitlesActive
                  ? 'bg-[#d4af37]/30 border-[#d4af37] text-[#ffe066] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                  : 'bg-black/80 border-white/20 text-zinc-400 hover:text-white hover:border-white/40'
              }`}
              title="Toggle Real-Time Kinetic Titles (T)"
              aria-label="Toggle Kinetic Titles"
            >
              <span>T</span>
            </button>

            {/* Tactical Multi-Layer Zoom HUD Capsule */}
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsZoomControlsOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
                  isZoomControlsOpen || fgZoom !== 1.0 || bgZoom !== 1.0
                    ? 'bg-[#d4af37]/30 border-[#d4af37] text-[#ffe066] font-bold shadow-[0_0_12px_rgba(212,175,55,0.45)]'
                    : 'bg-black/80 border-white/20 text-zinc-300 hover:text-white hover:border-white/40'
                }`}
                title="Multi-Layer Zoom: Scale Foreground (titles) & Background (media) independently"
              >
                <ZoomIn className="w-3 h-3 text-[#d4af37]" />
                <span className="hidden sm:inline">ZOOM</span>
                <span className="text-[8px] text-[#ffe066] tabular-nums font-bold">
                  {fgZoom.toFixed(1)}x / {bgZoom.toFixed(1)}x
                </span>
                {isVertigo && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Vertigo Link Active" />
                )}
              </button>

              {isZoomControlsOpen && (
                <div className="absolute left-0 top-full mt-2 w-76 sm:w-80 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <MultiLayerZoomControls
                    onClose={() => setIsZoomControlsOpen(false)}
                  />
                </div>
              )}
            </div>

            {/* 35mm Film Stock Grading Dock Trigger */}
            <div className="relative pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsFilterTrayOpen((prev) => !prev)}
                className={`px-2.5 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
                  isFilterTrayOpen
                    ? 'bg-[#f5a623]/30 border-[#f5a623] text-[#ffe066] font-bold shadow-[0_0_12px_rgba(245,166,35,0.45)]'
                    : 'bg-black/80 border-white/20 text-zinc-300 hover:text-white hover:border-[#f5a623]/60'
                }`}
                title="Open 35mm Film Stock & Color Grading Dock"
                aria-label="35mm Film Stock & Color Grading Dock"
              >
                <Sliders className="w-3 h-3 text-[#f5a623]" />
                <span className="hidden sm:inline">35MM GRADE</span>
                <span className="text-[8px] text-[#ffe066] font-bold">
                  {getFilmStockMeta(frame?.lutFilter || 'kodak_vision3').code}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* In-Player Playhead Transport & Quick Cadence Selector Bar */}
        <div className="absolute bottom-3 left-3 z-40 pointer-events-auto flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-white/15 rounded-lg px-2 py-1 shadow-xl">
          {onTogglePlay && (
            <button
              type="button"
              onClick={onTogglePlay}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isAutoplay
                  ? 'bg-[#F5A623] text-black font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isAutoplay ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isAutoplay ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>
          )}
          {onStepFrame && (
            <div className="hidden sm:flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onStepFrame(false)}
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-zinc-300 hover:text-white cursor-pointer"
                title="Step -1 Frame"
              >
                -1F
              </button>
              <button
                type="button"
                onClick={() => onStepFrame(true)}
                className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-zinc-300 hover:text-white cursor-pointer"
                title="Step +1 Frame"
              >
                +1F
              </button>
            </div>
          )}

          {/* Interactive Frictionless Scrub Track (Throttled to 16ms with Audio Muting & Instant Cached Frame Blit) */}
          <div
            onPointerDown={handleScrubPointerDown}
            onPointerMove={handleScrubPointerMove}
            onPointerUp={handleScrubPointerUp}
            onPointerCancel={handleScrubPointerUp}
            className="hidden md:flex items-center w-28 sm:w-36 h-2.5 bg-zinc-900/90 rounded-full overflow-hidden border border-white/15 cursor-ew-resize mx-1.5 relative select-none touch-none group/scrub"
            title={`Drag to Scrub Shot (${slideTimeSec.toFixed(2)}s / ${activeShotDurationSec.toFixed(1)}s) [Throttled 16ms]`}
          >
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] via-[#FFE066] to-[#F5A623] transition-[width] duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(245,166,35,0.8)] opacity-90 group-hover/scrub:scale-125 transition-transform" />
            </div>
          </div>

          <span className="hidden sm:inline text-[9.5px] font-mono text-zinc-300 tabular-nums px-1">
            F{String(activeFrameNum).padStart(3, '0')}/{activeTotalFrames}
          </span>

          {/* Quick Cadence Selector Capsule Pill: [ ⏱ DURATION: 12.0s ▾ ] */}
          <CadenceSelectorPill
            durationSec={activeShotDurationSec}
            targetFps={activeShotFps}
            onChangeDuration={handleChangeCurrentDuration}
            onChangeTargetFps={handleChangeCurrentFps}
            onApplyDurationToAll={onApplyDurationToAll}
            onMatchAudioBeats={handleMatchBeats}
            isSnapToBeat={isSnapToBeat}
            onToggleSnapToBeat={onToggleSnapToBeat}
            compact={true}
          />

          {/* Quick [ Ripple All ] Action Button */}
          {onApplyDurationToAll && (
            <button
              type="button"
              onClick={handleRippleAll}
              className="px-2 py-0.5 rounded bg-[#F5A623]/15 hover:bg-[#F5A623]/25 border border-[#F5A623]/50 text-[#FFE066] text-[9.5px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title={`Ripple apply ${activeShotDurationSec.toFixed(1)}s hold across all ${frames.length} timeline shots`}
            >
              <Repeat className="w-2.5 h-2.5" />
              <span className="hidden lg:inline">Ripple All</span>
            </button>
          )}

          {/* Quick [ Match Beats ] Action Button */}
          {onMatchAudioBeats && (
            <button
              type="button"
              onClick={handleMatchBeats}
              className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 text-[9.5px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Align all timeline shot cuts to detected musical transients (Auto-Cut)"
            >
              <Music className="w-2.5 h-2.5 text-cyan-400" />
              <span className="hidden lg:inline">Match Beats</span>
            </button>
          )}

          {/* Camera Spec Telemetry on Hover (Cleanly relocalized from screen overlay) */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400 hover:text-white transition-colors" title="Active Camera & Media Pipeline">
            <span className="text-[#FFE066] font-bold">{frame?.cameraSpec?.focalLength || '35mm Cine'}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/80">{frame?.cameraSpec?.aperture || 'f/1.4'}</span>
            <span className="text-white/30">·</span>
            <span className="text-cyan-400">{isScrubbing ? 'PROXY 540p' : 'MASTER 4K'}</span>
          </div>
        </div>

        {/* Hover Action Controls */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-40 pointer-events-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
            title="Replace Media"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          {onOpenInspector && (
            <button
              onClick={onOpenInspector}
              className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-[#ffe066] border border-white/20 transition-all cursor-pointer"
              title="Open Color & Lens Inspector"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-[2px] bg-black/85 hover:bg-black text-white/80 hover:text-white border border-white/20 transition-all cursor-pointer"
            title="Toggle Stage Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
