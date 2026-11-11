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
  Music,
  Zap
} from 'lucide-react';
import { WebCodecsStageCompositor } from './WebCodecsStageCompositor';
import { opfsMediaStorage } from '../../services/media/opfsMediaStorage';
import { StudioModuleId } from '../StudioNavRail';
import { ReviewMarkupCanvas } from './ReviewMarkupCanvas';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { 
  extractVideoPoster, 
  thumbnailMemoryCache, 
  cleanupVideoElement 
} from '../../services/thumbnailEngine';
import { handleFileUpload } from '../../services/mediaIngestService';
import { useTitleContainerRepaint } from '../../hooks/useTitleContainerRepaint';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { audioEngine } from '../../utils/audioEngine';
import { framesToTimecode } from '../../utils/timecode';
import {
  clampShotDuration,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps,
  calculateMasterSequenceDuration,
  formatRuntimeTimecode
} from '../../types/storyboard';
import {
  buildFilmStockCssFilter,
  applyCinematicPostProcess,
  getFilmStockMeta
} from '../../services/cinematicFilterEngine';
import { FilterGradingTray } from './FilterGradingTray';
import { KineticCaptionOverlay } from './KineticCaptionOverlay';
import { KineticAdTextDrawer } from './KineticAdTextDrawer';
import { DopamineCompilationSequence } from './templates/DopamineCompilationSequence';
import { FrameAdjustments, LutPreset } from '../../types/anthology';
import { depthOcclusionService } from '../../services/depthOcclusionService';
import { transientPunchEngine } from '../../services/transientPunchEngine';

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
  fitMode?: 'cover' | 'contain' | 'fill';
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
  detectedBpm = 120,
  isAudioMuted = true,
  fitMode = 'cover'
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
  const [isWebCodecsEngineActive, setIsWebCodecsEngineActive] = useState<boolean>(true);

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
  const kineticOcclusion = useStudioStore(s => s.kineticOcclusion);
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

  const kineticOcclusionRef = useRef(kineticOcclusion);
  kineticOcclusionRef.current = kineticOcclusion;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const isTitlesActiveRef = useRef(isTitlesActive);
  isTitlesActiveRef.current = isTitlesActive;
  const isAutoplayRef = useRef(isAutoplay);
  isAutoplayRef.current = isAutoplay;
  const storeTitleConfigRef = useRef(storeTitleConfig);
  storeTitleConfigRef.current = storeTitleConfig;

  // Sync client-side AudioBufferSourceNode dual-band transient detector with transport
  useEffect(() => {
    transientPunchEngine.syncTransport(
      Boolean(isAutoplay && kineticOcclusion.enabled),
      slideTimeSecRef.current
    );
  }, [isAutoplay, kineticOcclusion.enabled, kineticOcclusion.audioPunchMode]);

  useEffect(() => {
    return () => {
      transientPunchEngine.stopBufferSourceNode();
    };
  }, []);
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

  const totalRuntimeTimecode = useMemo(() => {
    return formatRuntimeTimecode(totalMasterRuntimeSec, activeShotFps);
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

  const isVideoMedia = Boolean(
    frame?.isVideo ||
    (frame as any)?.mimeType?.startsWith('video/') ||
    (activeMediaUrl && (
      /\.(mp4|webm|mov|m4v|mkv)(\?|$)/i.test(activeMediaUrl) ||
      activeMediaUrl.includes('video') ||
      activeMediaUrl.startsWith('data:video')
    ))
  );

  const lutFilterStyle = getLutFilterCSS(frame?.lutFilter, frame?.adjustments);
  const combinedMediaFilter = zoomTransforms.bgDepthBlur !== 'none'
    ? `${lutFilterStyle} ${zoomTransforms.bgDepthBlur}`
    : lutFilterStyle;

  // Synchronous Media Pass-Through: Smooth native video playback without micro-stuttering seek loops
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoMedia) return;

    if (isAutoplay) {
      video.muted = isAudioMuted ?? true;
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay with audio was prevented, fallback to muted playback
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      }
      // ONLY seek during active scrubbing or severe playback drift (>0.75s)
      if (isScrubbing || Math.abs(video.currentTime - slideTimeSec) > 0.75) {
        if ('fastSeek' in video && typeof (video as any).fastSeek === 'function') {
          try { (video as any).fastSeek(slideTimeSec); } catch { video.currentTime = slideTimeSec; }
        } else {
          try { video.currentTime = slideTimeSec; } catch {}
        }
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
      // Precision frame seek when paused / stepping
      if (Math.abs(video.currentTime - slideTimeSec) > 0.04) {
        try { video.currentTime = slideTimeSec; } catch {}
      }
    }
  }, [slideTimeSec, isAutoplay, isScrubbing, isVideoMedia, isAudioMuted]);

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
      img.crossOrigin = 'anonymous';
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
          const ctx = canvas.getContext('2d', { alpha: true });
          if (ctx) {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const targetW = Math.max(320, Math.round((rect.width || 1280) * dpr));
            const targetH = Math.max(180, Math.round((rect.height || 536) * dpr));
            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            const curFrame = frameRef.current;
            const ko = kineticOcclusionRef.current;
            const isVideo = isVideoMedia;
            const video = videoRef.current;

            const filmFilter = buildFilmStockCssFilter(curFrame?.lutFilter || 'kodak_vision3', curFrame?.adjustments);

            // Resolve active media source for both Base Pass and scrubbing bitmap cache
            let activeSource: CanvasImageSource | null = null;
            if (isVideo && video) {
              if (isScrubbingRef.current && (video.seeking || video.readyState < 2)) {
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
                  activeSource = closestBmp;
                } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
                  activeSource = cachedPosterImgRef.current;
                }
              } else if (video.readyState >= 2 && video.videoWidth > 0) {
                activeSource = video;

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
                activeSource = cachedPosterImgRef.current;
              }
            } else if (imageElementRef.current && imageElementRef.current.complete && imageElementRef.current.naturalWidth > 0) {
              activeSource = imageElementRef.current;
            } else if (cachedPosterImgRef.current && cachedPosterImgRef.current.complete) {
              activeSource = cachedPosterImgRef.current;
            }

            const useAutonomousCanvas = Boolean(
              ko?.enabled && isTitlesActiveRef.current && !curFrame?.dopamineConfig
            );

            if (useAutonomousCanvas) {
              ctx.filter = 'none';
              depthOcclusionService.compositeFrame({
                ctx,
                width: targetW,
                height: targetH,
                sourceElement: activeSource as any,
                timeSec: slideTimeSecRef.current,
                durationSec: getShotDurationSec(curFrame, 12.0),
                fps: getShotTargetFps(curFrame, 24),
                isLivePlaying: isAutoplayRef.current,
                titleBn: curFrame?.bengaliTitle || 'দৃষ্টির সীমানা',
                titleEn: curFrame?.title || 'THE SINGULARITY',
                lyricText: curFrame?.caption?.text || curFrame?.tagline || curFrame?.title || '',
                filmFilter,
                zoomScale: 1.0,
                titleSize: storeTitleConfigRef.current?.titleSize ?? 72,
                verticalOffset: storeTitleConfigRef.current?.verticalOffset ?? 0,
                postBaseHook: (baseCtx, w, h) => {
                  if (activeSource) {
                    applyCinematicPostProcess(
                      baseCtx as CanvasRenderingContext2D,
                      w,
                      h,
                      curFrame?.lutFilter || 'kodak_vision3',
                      curFrame?.adjustments,
                      slideTimeSecRef.current
                    );
                  }
                }
              });
            } else {
              ctx.clearRect(0, 0, targetW, targetH);
              if (activeSource && (!isVideo || isScrubbingRef.current)) {
                if (filmFilter && filmFilter !== 'none') {
                  ctx.filter = filmFilter;
                }
                drawCover(ctx, activeSource, targetW, targetH);
                ctx.filter = 'none';
                applyCinematicPostProcess(
                  ctx,
                  targetW,
                  targetH,
                  curFrame?.lutFilter || 'kodak_vision3',
                  curFrame?.adjustments,
                  slideTimeSecRef.current
                );
              } else if (!activeMediaUrl && !cachedPosterUrl) {
                // Minimalist Dark Studio Fallback Slate ONLY when shot has NO media
                const grad = ctx.createLinearGradient(0, 0, 0, targetH);
                grad.addColorStop(0, '#0a0a0f');
                grad.addColorStop(1, '#121218');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, targetW, targetH);

                // 4K Target Crosshair & Grid
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
                ctx.lineWidth = 1;
                const cx = targetW / 2;
                const cy = targetH / 2;
                ctx.beginPath();
                ctx.moveTo(cx - 30, cy);
                ctx.lineTo(cx + 30, cy);
                ctx.moveTo(cx, cy - 30);
                ctx.lineTo(cx, cy + 30);
                ctx.stroke();

                // Crosshair circle
                ctx.beginPath();
                ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                ctx.stroke();

                // Telemetry watermark
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`SHOT ${curFrame?.epNumber || '001'} // CINEMA MONITOR STANDBY`, cx, cy + 42);
              }
              ctx.filter = 'none';
              applyCinematicPostProcess(
                ctx,
                targetW,
                targetH,
                curFrame?.lutFilter || 'kodak_vision3',
                curFrame?.adjustments,
                slideTimeSecRef.current
              );
            }
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsIngesting(true);
      const safetyTimeout = window.setTimeout(() => {
        setIsIngesting(false);
      }, 2500);

      try {
        await handleFileUpload(e.dataTransfer.files, {
          shotIndex: currentIndex,
          onImmediatePreview: (item) => {
            setSourceUrl(item.objectUrl);
            setProxyUrl(item.objectUrl);
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: item.objectUrl,
                isVideo: item.isVideo
              });
            }
          },
          onMetadataReady: (item) => {
            if (item.thumbnailUrl) {
              setCachedPosterUrl(item.thumbnailUrl);
              thumbnailMemoryCache.set(String(frame?.id ?? currentIndex), item.thumbnailUrl);
              thumbnailMemoryCache.set(`shot_${currentIndex}`, item.thumbnailUrl);
            }
            if (onUpdateFrame) {
              onUpdateFrame({
                ...frame,
                imageUrl: item.objectUrl,
                thumbnailUrl: item.thumbnailUrl || undefined,
                isVideo: item.isVideo
              });
            }
          }
        });
      } catch (err) {
        console.warn('[RECOVERY FALLBACK] Failed to ingest dropped media:', err);
      } finally {
        window.clearTimeout(safetyTimeout);
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

  // Dynamic Aspect Ratio Auto-Fitting:
  // - Clean, responsive framing flush to top with no blank gap
  // - Leaves dedicated clearance at bottom for bezel ribbon and control dock
  const getAspectStyle = (ar: string): React.CSSProperties => {
    switch (ar) {
      case '9:16':
        return {
          aspectRatio: '9 / 16',
          height: 'calc(100vh - 124px)',
          maxHeight: 'calc(100vh - 124px)',
          width: 'calc((100vh - 124px) * 9 / 16)',
          maxWidth: '100%',
          margin: '0 auto'
        };
      case '1:1':
        return {
          aspectRatio: '1 / 1',
          height: 'calc(100vh - 124px)',
          maxHeight: 'calc(100vh - 124px)',
          width: 'calc(100vh - 124px)',
          maxWidth: '100%',
          margin: '0 auto'
        };
      case '4:3':
        return {
          aspectRatio: '4 / 3',
          width: '100%',
          maxWidth: 'min(98vw, 1500px)',
          maxHeight: 'calc(100vh - 124px)',
          margin: '0 auto'
        };
      case '16:9':
        return {
          aspectRatio: '16 / 9',
          width: '100%',
          maxWidth: 'min(99vw, 1880px)',
          maxHeight: 'calc(100vh - 124px)',
          margin: '0 auto'
        };
      case '2.39:1':
      default:
        return {
          aspectRatio: '2.39 / 1',
          width: '100%',
          maxWidth: 'min(99vw, 1880px)',
          maxHeight: 'calc(100vh - 124px)',
          margin: '0 auto'
        };
    }
  };

  const fitModeClass = fitMode === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="relative w-full h-full flex flex-col items-center justify-start pt-0 mt-0 pb-0 bg-[#000000] overflow-hidden select-none px-0"
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,image/*,.mp4,.mov,.webm,.m4v,.avi,.mkv"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            try {
              await handleFileUpload(e.target.files, {
                shotIndex: currentIndex,
                onImmediatePreview: (item) => {
                  setSourceUrl(item.objectUrl);
                  setProxyUrl(item.objectUrl);
                  if (onUpdateFrame) {
                    onUpdateFrame({
                      ...frame,
                      imageUrl: item.objectUrl,
                      isVideo: item.isVideo
                    });
                  }
                },
                onMetadataReady: (item) => {
                  if (item.thumbnailUrl) {
                    setCachedPosterUrl(item.thumbnailUrl);
                    thumbnailMemoryCache.set(String(frame?.id ?? currentIndex), item.thumbnailUrl);
                    thumbnailMemoryCache.set(`shot_${currentIndex}`, item.thumbnailUrl);
                  }
                  if (onUpdateFrame) {
                    onUpdateFrame({
                      ...frame,
                      imageUrl: item.objectUrl,
                      thumbnailUrl: item.thumbnailUrl || undefined,
                      isVideo: item.isVideo
                    });
                  }
                }
              });
            } catch (err) {
              console.warn('[RECOVERY FALLBACK] File upload input error:', err);
            }
          }
        }}
      />

      {/* 1. MASTER STAGE MEDIA CONTAINER (Flush to top, zero black gap, edge-to-edge cinema presence) */}
      <div
        id="stage-media-container"
        style={getAspectStyle(aspectRatio)}
        className="relative w-full mx-auto bg-[#000000] border-0 rounded-none shadow-[0_16px_80px_rgba(0,0,0,0.98)] overflow-hidden flex items-center justify-center select-none shrink-0 mt-0 pt-0"
      >
        {/* SAFE INSTANT FALLBACK LAYER: Synchronous media pass-through mirroring active media so stage NEVER renders blank */}
        {activeMediaUrl && (
          isVideoMedia ? (
            <video
              id="stage-fallback-video"
              ref={videoRef}
              src={activeMediaUrl}
              crossOrigin="anonymous"
              poster={cachedPosterUrl || undefined}
              autoPlay={isAutoplay}
              loop
              muted={isAudioMuted ?? true}
              playsInline
              preload="auto"
              onCanPlay={(e) => {
                if (isAutoplay && e.currentTarget.paused) {
                  e.currentTarget.play().catch(() => {});
                }
              }}
              onLoadedData={(e) => {
                if (isAutoplay && e.currentTarget.paused) {
                  e.currentTarget.play().catch(() => {});
                }
              }}
              className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-0`}
              style={{ filter: combinedMediaFilter }}
            />
          ) : (
            <img
              id="stage-fallback-img"
              src={activeMediaUrl}
              crossOrigin="anonymous"
              alt="Active Shot Plate"
              className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-0`}
              style={{ filter: combinedMediaFilter }}
            />
          )
        )}
        {!activeMediaUrl && cachedPosterUrl && (
          <img
            id="stage-fallback-poster"
            src={cachedPosterUrl}
            crossOrigin="anonymous"
            alt="Cached Shot Poster"
            className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-0`}
            style={{ filter: combinedMediaFilter }}
          />
        )}

        {/* PRIMARY RENDERER: Hardware / 2D Canvas Synchronous Media Pass-Through */}
        <canvas
          id="stage-canvas"
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${fitModeClass} pointer-events-none z-1`}
          style={{ filter: combinedMediaFilter }}
        />

        {/* TYPOGRAPHY STAGE RESTORATION LAYER: Mounted directly above the stage canvas */}
        <div
          id="stage-typography-layer"
          ref={stageTitleContainerRef}
          data-title-container="tactile-stage"
          style={{
            zIndex: 10,
            pointerEvents: 'none',
            opacity: isTitlesActive ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            transform: zoomTransforms.fgTransform,
            filter: zoomTransforms.fgShadow
          }}
          className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 pointer-events-none"
        >
          {frame?.dopamineConfig ? (
            <DopamineCompilationSequence
              hookText={frame.dopamineConfig.hookText}
              subText={frame.dopamineConfig.subText}
              glitchIntensity={frame.dopamineConfig.glitchIntensity}
              strobeRate={frame.dopamineConfig.strobeRate}
              motionSpeed={frame.dopamineConfig.motionSpeed}
              accentColor={frame.dopamineConfig.accentColor}
              audioBeatSync={frame.dopamineConfig.audioBeatSync ?? true}
              currentTime={slideTimeSec}
              durationSec={activeShotDurationSec}
              isPlaying={isAutoplay}
              showTelemetry={false}
            />
          ) : (
            <StageTextOverlay
              shotIndex={currentIndex}
              banglaTitle={frame?.bengaliTitle || 'সীমানা'}
              englishTitle={frame?.title || 'EVENT HORIZON'}
              subtitle={frame?.tagline || '12.0S CINEMA PREVIS & NLE MONTAGE'}
              directorNotes={frame?.directorNotes}
              cameraInfo={frame?.cameraSpec?.focalLength}
              isVisible={isTitlesActive}
              allowQuickControls={false}
              componentsVisibility={componentsVisibility}
            />
          )}
        </div>

        {/* Drag & Drop Ready Standby when no media exists */}
        {!activeMediaUrl && !cachedPosterUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-3 p-6 text-center z-20 pointer-events-auto">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
              <Film className="w-7 h-7 opacity-60" />
            </div>
            <div>
              <p className="font-cinzel text-xs sm:text-sm text-zinc-300 font-bold tracking-wider">
                SHOT {frame?.epNumber || String(currentIndex + 1).padStart(3, '0')} // READY FOR INGEST
              </p>
              <p className="text-[9.5px] text-zinc-500 mt-1 font-mono-tech">
                Drag &amp; Drop 4K video or photo directly into this monitor
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 px-3 py-1.5 rounded-[2px] bg-[#d4af37]/20 hover:bg-[#d4af37]/35 border border-[#d4af37]/50 text-[#ffe066] text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Media Asset</span>
            </button>
          </div>
        )}

        {/* Ingesting Spinner Overlay */}
        {isIngesting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-30">
            <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono-tech text-[#ffe066] tracking-wider text-center px-4">
              INGESTING RAW 4K ASSET &amp; GENERATING 540P PROXY...
            </span>
          </div>
        )}
      </div>

      {/* 2. SLEEK CINEMA MONITOR BEZEL RIBBON (Ultra-compact 20px bar directly under the monitor) */}
      <div className="w-full max-w-[min(99vw,1880px)] mx-auto mt-0.5 px-2 py-0.5 bg-[#090a0f]/95 border border-white/10 rounded flex items-center justify-between gap-1.5 shrink-0 select-none shadow-md h-5 text-[8.5px]">
        {/* Left: Scene & Shot Metadata */}
        <div className="flex items-center gap-1.5 truncate text-[8.5px] font-mono tracking-wider uppercase text-white/40">
          <span className="text-[#F5A623] font-bold">SCENE {frame?.epNumber ? frame.epNumber.slice(0, 2) : '01'}</span>
          <span className="text-white/20">//</span>
          <span className="text-white/80 font-semibold">SHOT {String(currentIndex + 1).padStart(2, '0')}</span>
          <span className="text-white/20">•</span>
          <span className="text-zinc-300 truncate max-w-[120px] sm:max-w-[200px]">"{frame?.title || 'UNTITLED SHOT'}"</span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="text-[#FFE066]/70 hidden sm:inline">{aspectRatio || '2.39:1'} SCOPE</span>
        </div>

        {/* Right: Telemetry Indicators & Quick Bezel Triggers */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] text-white/40 shrink-0 font-mono">
          <button
            type="button"
            onClick={() => setIsWebCodecsEngineActive(!isWebCodecsEngineActive)}
            className={`px-1 py-0.2 rounded border text-[8px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isWebCodecsEngineActive
                ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                : 'bg-black/50 border-white/20 text-amber-400 hover:bg-white/10'
            }`}
            title="Toggle WebCodecs 24fps WebGL2 Ping-Pong Engine"
          >
            <Zap className="w-2.5 h-2.5 text-current" />
            <span>{isWebCodecsEngineActive ? 'WEBCODECS' : 'NATIVE'}</span>
          </button>

          <span className="hidden md:inline text-white/20">|</span>
          <span className="hidden md:flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400">CALIBRATED</span>
          </span>

          <span className="hidden md:inline text-white/20">|</span>
          <span className="hidden md:inline text-emerald-400">14-BIT ARRI</span>

          <span className="hidden lg:inline text-white/20">|</span>
          <div className="hidden lg:flex items-center gap-1 text-emerald-400">
            <span>RUNTIME: {totalRuntimeTimecode}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/60">{frames.length}S</span>
          </div>

          <div className="flex items-center gap-1 pl-1 border-l border-white/10">
            {/* Quick Replace Media */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded bg-black/60 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer"
              title="Upload / Replace Media Plate"
            >
              <Upload className="w-2.5 h-2.5" />
            </button>

            {/* Quick Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded bg-black/60 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 transition-all cursor-pointer"
              title="Toggle Stage Fullscreen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
};
