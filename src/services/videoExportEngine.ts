/**
 * @file /src/services/videoExportEngine.ts
 * @description Professional WebCodecs & Offline Render Pipeline for Cinema Export Studio.
 * 
 * Features:
 * 1. Frame-by-Frame Offline Extraction:
 *    - Headless HTML5 <video> element with strict asynchronous `waitForSeek` to eliminate black frames.
 *    - Locked 24.0 fps stepping with deterministic timestamp generation (t = f / 24.0).
 * 2. Multi-Format Resolution & Aspect Support:
 *    - 1080p Scope (1920 × 804, 2.39:1)
 *    - 4K Master Scope (3840 × 1608, 2.39:1)
 *    - 1080p Standard (1920 × 1080, 16:9)
 *    - 4K Standard (3840 × 2160, 16:9)
 *    - Vertical Reel (1080 × 1920, 9:16) with ambient blurred pillar-box and vertical safe title layout.
 * 3. High-Fidelity Compositing:
 *    - Glowing Bengali display typography (Anek Bangla) with metallic gold bloom shadow.
 *    - Cinzel uppercase English subtitle with tracking.
 *    - Anamorphic horizontal flare core & optical lens bloom simulation.
 *    - Obsidian gradient background for unassigned shots.
 *    - Ken Burns push-in animation for still image plates (1.0 to 1.05 zoom over 288 frames).
 * 4. Multi-Shot Sequential Stitching:
 *    - Sequentially loads uncompressed source blobs from `media_vault` in IndexedDB.
 *    - Cleans up RAM between shots (revoking object URLs).
 * 5. Audio Multiplexing:
 *    - Synthesizes ambient cinema drone with 24fps rhythmic hit markers.
 *    - Encodes AAC 320 kbps stream via WebCodecs `AudioEncoder` (with graceful fallback if unsupported).
 * 6. Memory Safety & Resilient Fallback:
 *    - Disposes of `VideoFrame` instances immediately (`frame.close()`).
 *    - MediaRecorder canvas stream fallback if WebCodecs VideoEncoder is unavailable.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import JSZip from 'jszip';
import { studioDraftDb } from './db';
import {
  getCandidateShotMediaKeys,
  getShotMediaBlob,
  resolveShotMediaEntry,
  ShotMediaMap
} from './handfilmMediaVault';
import { renderProceduralBackdropToCanvas } from '../data/proceduralCinemaEngine';
import { renderAlignedCinemaTitleOverlay } from '../utils/interchangeExport';
import { HeroTitlePreset, resolveEffectiveTitleAlign, TitleAlign, useStudioStore } from '../core/store';
import { AnthologyFrame, FrameAdjustments, LutPreset, ShotCaption } from '../types/anthology';
import { SlideDraft } from '../types/project';
import { buildFilmStockCssFilter, applyCinematicPostProcess } from './cinematicFilterEngine';
import { renderCanvasBurnInCaption } from './captionEngine';

export type ShotSelectionMode = 'all' | 'range' | 'custom' | 'current';

export type CinemaResolutionPreset = 
  | '1080p_scope'      // 1920 × 804 (2.39:1)
  | '4k_scope'         // 3840 × 1608 (2.39:1)
  | '1080p_standard'   // 1920 × 1080 (16:9)
  | '4k_standard'      // 3840 × 2160 (16:9)
  | '9_16_vertical';   // 1080 × 1920 (9:16)

export type BitrateProfile = 'proxy' | 'broadcast' | 'master';

export interface CinemaExportPipelineOptions {
  projectTitle: string;
  frames?: AnthologyFrame[];
  slides?: SlideDraft[];
  currentSlideIndex?: number;
  totalSlides?: number;

  // Shot Selection
  selectionMode: ShotSelectionMode;
  rangeStart?: number; // 1-indexed (e.g. 1)
  rangeEnd?: number;   // 1-indexed (e.g. 24)
  customListText?: string; // e.g. "1, 4, 7-12, 19, 88"
  excludedShotIndices?: number[]; // 0-indexed shots to exclude from render
  overrideShotIndices?: number[]; // Direct explicit shot list

  // Formats & Profiles
  resolutionPreset: CinemaResolutionPreset;
  bitrateProfile: BitrateProfile;
  burnInTitles: boolean;
  cleanPlates: boolean;
  simulateFlare: boolean;
  includeAudio: boolean;

  // Per-Shot IndexedDB Media Map
  shotMediaMap?: ShotMediaMap;

  // Callback Hooks
  onProgress?: (telemetry: RenderTelemetry) => void;
  onFrameRendered?: (canvas: HTMLCanvasElement, frameNum: number, totalFrames: number) => void;
  previewCanvas?: HTMLCanvasElement | null;
  abortSignal?: AbortSignal;
}

export interface RenderTelemetry {
  currentShotIndex: number; // 1-indexed
  totalShots: number;
  currentFrameNum: number;
  totalFrames: number;
  percent: number;
  fps: number;
  statusText: string;
}

export interface ParsedSelectionResult {
  indices: number[]; // 0-indexed slide numbers
  totalShots: number;
  totalFrames: number;
  durationSec: number;
  label: string;
}

/**
 * Robust natural syntax parser for shot selection:
 * Supports ranges ('1-5'), comma-separated numbers ('1, 3, 7'), whitespace, cleans duplicates,
 * and computes exact variable-duration frame budgets when `shotDurationsSec` is provided.
 */
export function parseShotSelection(
  mode: ShotSelectionMode,
  start: number,
  end: number,
  customText: string,
  totalAvailable: number,
  currentIdx: number = 0,
  framesPerShot: number = 288,
  excludedIndices: number[] = [],
  shotDurationsSec?: number[]
): ParsedSelectionResult {
  const maxShots = Math.max(1, totalAvailable);
  let resolvedIndices: number[] = [];

  if (mode === 'current') {
    const validIdx = Math.max(0, Math.min(maxShots - 1, currentIdx));
    resolvedIndices = [validIdx];
  } else if (mode === 'all') {
    resolvedIndices = Array.from({ length: maxShots }, (_, i) => i);
  } else if (mode === 'range') {
    const s = Math.max(1, Math.min(maxShots, Math.floor(start)));
    const e = Math.max(s, Math.min(maxShots, Math.floor(end)));
    resolvedIndices = Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
  } else if (mode === 'custom') {
    const cleaned = (customText || '').trim();
    const tokens = cleaned.split(/[,;\s]+/).filter(Boolean);
    const indexSet = new Set<number>();

    for (const token of tokens) {
      if (token.includes('-')) {
        const [left, right] = token.split('-').map(t => parseInt(t.trim(), 10));
        if (!isNaN(left) && !isNaN(right)) {
          const from = Math.min(left, right);
          const to = Math.max(left, right);
          for (let n = from; n <= to; n++) {
            if (n >= 1 && n <= maxShots) indexSet.add(n - 1);
          }
        }
      } else {
        const val = parseInt(token, 10);
        if (!isNaN(val) && val >= 1 && val <= maxShots) {
          indexSet.add(val - 1);
        }
      }
    }

    resolvedIndices = Array.from(indexSet).sort((a, b) => a - b);
    if (resolvedIndices.length === 0) {
      resolvedIndices = [Math.max(0, Math.min(maxShots - 1, currentIdx))];
    }
  }

  // Filter out excluded shots if provided
  if (excludedIndices && excludedIndices.length > 0) {
    const excludedSet = new Set(excludedIndices);
    resolvedIndices = resolvedIndices.filter(idx => !excludedSet.has(idx));
  }

  const totalShots = resolvedIndices.length;
  const totalFrames = shotDurationsSec && shotDurationsSec.length > 0
    ? resolvedIndices.reduce((sum, idx) => {
        const dur = shotDurationsSec[idx];
        const shotFrames = typeof dur === 'number' && Number.isFinite(dur) && dur > 0
          ? Math.max(1, Math.round(dur * 24))
          : framesPerShot;
        return sum + shotFrames;
      }, 0)
    : totalShots * framesPerShot;
  const durationSec = totalFrames / 24.0;

  let label = '';
  if (totalShots === 0) {
    label = 'SH_EMPTY';
  } else if (totalShots === 1) {
    label = `SH${String(resolvedIndices[0] + 1).padStart(3, '0')}`;
  } else {
    label = `SH${String(resolvedIndices[0] + 1).padStart(3, '0')}-SH${String(resolvedIndices[resolvedIndices.length - 1] + 1).padStart(3, '0')}`;
  }

  return {
    indices: resolvedIndices,
    totalShots,
    totalFrames,
    durationSec,
    label
  };
}

/**
 * Dimensions and aspect details for target preset
 */
export function getExportPresetDimensions(preset: CinemaResolutionPreset): {
  width: number;
  height: number;
  aspectRatio: string;
  isScope: boolean;
  isVertical: boolean;
  name: string;
} {
  switch (preset) {
    case '1080p_scope':
      return { width: 1920, height: 804, aspectRatio: '2.39:1', isScope: true, isVertical: false, name: '1080p Cinema Scope' };
    case '4k_scope':
      return { width: 3840, height: 1608, aspectRatio: '2.39:1', isScope: true, isVertical: false, name: '4K Master Scope' };
    case '1080p_standard':
      return { width: 1920, height: 1080, aspectRatio: '16:9', isScope: false, isVertical: false, name: '1080p Standard (16:9)' };
    case '4k_standard':
      return { width: 3840, height: 2160, aspectRatio: '16:9', isScope: false, isVertical: false, name: '4K Standard (16:9)' };
    case '9_16_vertical':
      return { width: 1080, height: 1920, aspectRatio: '9:16', isScope: false, isVertical: true, name: 'Vertical Reel (9:16)' };
    default:
      return { width: 1920, height: 804, aspectRatio: '2.39:1', isScope: true, isVertical: false, name: '1080p Cinema Scope' };
  }
}

/**
 * Returns bitrate in bps based on profile and resolution
 */
export function getBitrateBps(profile: BitrateProfile, is4K: boolean): number {
  if (is4K) {
    switch (profile) {
      case 'proxy': return 25_000_000;      // 25 Mbps
      case 'broadcast': return 50_000_000;  // 50 Mbps
      case 'master': return 80_000_000;     // 80 Mbps
    }
  } else {
    switch (profile) {
      case 'proxy': return 12_000_000;      // 12 Mbps
      case 'broadcast': return 28_000_000;  // 28 Mbps
      case 'master': return 45_000_000;     // 45 Mbps
    }
  }
}

/**
 * Sanitizes WebCodecs EncodedVideoChunkMetadata before passing to `mp4-muxer`.
 * Critical: `mp4-muxer` merges `meta.decoderConfig` via `Object.assign(track.info.decoderConfig, meta.decoderConfig)`.
 * If a delta chunk omits `meta.decoderConfig` and we synthesize `{ description: undefined }`,
 * `Object.assign` overwrites the saved `AVCDecoderConfigurationRecord`, producing an empty `avcC` atom
 * and causing exported MP4s to decode as solid black frames.
 */
export function sanitizeMuxerChunkMetadata(
  meta: EncodedVideoChunkMetadata | undefined,
  state: { hasDecoderConfig: boolean; cachedDecoderConfig?: VideoDecoderConfig | null }
): EncodedVideoChunkMetadata | undefined {
  if (meta?.decoderConfig) {
    const dc: VideoDecoderConfig = {
      ...meta.decoderConfig,
      colorSpace: meta.decoderConfig.colorSpace ?? {
        primaries: 'bt709',
        transfer: 'bt709',
        matrix: 'bt709',
        fullRange: false
      }
    };
    state.hasDecoderConfig = true;
    state.cachedDecoderConfig = dc;
    return {
      ...meta,
      decoderConfig: dc
    };
  }

  // Never attach `{ decoderConfig: { description: undefined } }` on delta chunks
  if (!meta) return undefined;
  const cleaned: Record<string, any> = { ...meta };
  if ('decoderConfig' in cleaned) {
    delete cleaned.decoderConfig;
  }
  return Object.keys(cleaned).length > 0 ? (cleaned as EncodedVideoChunkMetadata) : undefined;
}

/**
 * Hidden offscreen DOM host so Chromium / WebView2 hardware video decoders and
 * `canvas.captureStream()` actively present frames instead of outputting black textures.
 */
function getOrCreateOffscreenExportHost(): HTMLElement | null {
  if (typeof document === 'undefined' || !document.body) return null;
  let host = document.getElementById('handfilm-offscreen-export-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'handfilm-offscreen-export-host';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:4px;height:4px;opacity:0.001;pointer-events:none;overflow:hidden;z-index:-9999;';
    document.body.appendChild(host);
  }
  return host;
}

function mountOffscreenExportElement(el: HTMLElement | null): void {
  if (!el || typeof document === 'undefined') return;
  try {
    const host = getOrCreateOffscreenExportHost();
    if (host && el.parentElement !== host) {
      el.style.width = '2px';
      el.style.height = '2px';
      host.appendChild(el);
    }
  } catch {
    // Non-fatal in headless test environments
  }
}

function unmountOffscreenExportElement(el: HTMLElement | null): void {
  if (!el) return;
  try {
    if (el.parentElement && el.parentElement.id === 'handfilm-offscreen-export-host') {
      el.parentElement.removeChild(el);
    }
  } catch {
    // ignore
  }
}

/**
 * Awaits `onloadeddata` (readyState >= 2) on a dedicated offscreen <video> element.
 */
async function waitForVideoLoadedData(video: HTMLVideoElement, timeoutMs: number = 3000): Promise<boolean> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;
  return await new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        video.onloadeddata = null;
        video.oncanplay = null;
        video.onerror = null;
        resolve(ok);
      }
    };
    const timer = setTimeout(
      () => finish(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0),
      timeoutMs
    );
    video.onloadeddata = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        finish(true);
      }
    };
    video.oncanplay = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        finish(true);
      }
    };
    video.onerror = () => finish(false);
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      finish(true);
    }
  });
}

function shouldUseAnonymousCors(url: string): boolean {
  return Boolean(url) && !url.startsWith('blob:') && !url.startsWith('data:');
}

async function attemptLoadVideo(
  url: string,
  useCors: boolean,
  timeoutMs: number
): Promise<HTMLVideoElement | null> {
  if (!url || typeof document === 'undefined') return null;
  const vid = document.createElement('video');
  vid.muted = true;
  vid.playsInline = true;
  vid.preload = 'auto';
  if (useCors) {
    vid.crossOrigin = 'anonymous';
  }
  mountOffscreenExportElement(vid);

  const loadedPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        vid.onloadeddata = null;
        vid.oncanplay = null;
        vid.onerror = null;
        resolve(ok);
      }
    };
    const timer = setTimeout(
      () => finish(vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0),
      timeoutMs
    );
    vid.onloadeddata = () => {
      if (vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0) {
        finish(true);
      }
    };
    vid.oncanplay = () => {
      if (vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0) {
        finish(true);
      }
    };
    vid.onerror = () => finish(false);
  });

  vid.src = url;
  try {
    vid.load();
  } catch {
    // Non-fatal; loadedPromise settles via onloadeddata/onerror/timeout
  }

  const ok = await loadedPromise;
  if (ok && vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0) {
    // Prime GPU video surface so frame 0 is decoded & paintable immediately
    try {
      const playPromise = vid.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await Promise.race([playPromise.catch(() => {}), new Promise((r) => setTimeout(r, 80))]);
      }
      vid.pause();
      vid.currentTime = 0;
    } catch {
      // Non-fatal if autoplay blocked; video already loadeddata
    }
    return vid;
  }
  try {
    vid.pause();
    vid.src = '';
    unmountOffscreenExportElement(vid);
  } catch {}
  return null;
}

async function loadVideoElementWithOnLoadedData(
  url: string,
  timeoutMs: number = 4500
): Promise<HTMLVideoElement | null> {
  if (!url || typeof document === 'undefined') return null;
  const preferCors = shouldUseAnonymousCors(url);
  const firstAttempt = await attemptLoadVideo(url, preferCors, timeoutMs);
  if (firstAttempt) return firstAttempt;

  // Retry without CORS if remote/static host omits Access-Control-Allow-Origin
  if (preferCors) {
    const noCorsAttempt = await attemptLoadVideo(url, false, timeoutMs);
    if (noCorsAttempt) return noCorsAttempt;
  }
  return null;
}

async function attemptDecodeImage(
  url: string,
  useCors: boolean,
  timeoutMs: number
): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    if (useCors) {
      img.crossOrigin = 'anonymous';
    }
    img.src = url;
    if (typeof img.decode === 'function') {
      await Promise.race([
        img.decode(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Image decode timeout')), timeoutMs)
        )
      ]);
    } else {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Image load timeout')), timeoutMs);
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Image load error'));
        };
      });
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img;
    }
  } catch {
    // Fall through cleanly
  }
  return null;
}

async function loadDecodedImage(
  url: string,
  timeoutMs: number = 3000
): Promise<HTMLImageElement | null> {
  if (!url) return null;
  const preferCors = shouldUseAnonymousCors(url);
  const first = await attemptDecodeImage(url, preferCors, timeoutMs);
  if (first) return first;
  if (preferCors) {
    return await attemptDecodeImage(url, false, timeoutMs);
  }
  return null;
}

/**
 * Awaits a compositor/video frame presentation after seeking so GPU texture is ready for drawImage.
 */
async function waitForPresentedVideoFrame(video: HTMLVideoElement): Promise<void> {
  const rvfc = (video as any).requestVideoFrameCallback;
  if (typeof rvfc === 'function' && !video.paused) {
    await new Promise<void>((res) => {
      let done = false;
      const t = setTimeout(() => {
        if (!done) {
          done = true;
          res();
        }
      }, 60);
      try {
        rvfc.call(video, () => {
          if (!done) {
            done = true;
            clearTimeout(t);
            res();
          }
        });
      } catch {
        clearTimeout(t);
        res();
      }
    });
    return;
  }
  await new Promise<void>((res) => setTimeout(res, 0));
}

/**
 * Frame-by-frame offline seek helper:
 * Sets `video.currentTime` and awaits `video.onseeked` + `readyState >= 2`
 * before calling `ctx.drawImage(video, ...)` to prevent blank/stale frame captures.
 */
export function waitForSeek(video: HTMLVideoElement, targetTime: number, timeoutMs: number = 1200): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        video.onseeked = null;
        video.oncanplay = null;
        video.onerror = null;
        waitForPresentedVideoFrame(video).then(resolve);
      }
    };

    const timer = setTimeout(finish, timeoutMs);

    const safeTarget = Number.isFinite(video.duration) && video.duration > 0.04
      ? Math.max(0, Math.min(video.duration - 0.02, targetTime))
      : Math.max(0, targetTime);

    if (Math.abs(video.currentTime - safeTarget) < 0.001 && !video.seeking && video.readyState >= 2) {
      finish();
      return;
    }

    video.onseeked = () => finish();
    video.oncanplay = () => {
      if (!video.seeking && video.readyState >= 2) {
        finish();
      }
    };
    video.onerror = () => finish();

    try {
      video.currentTime = safeTarget;
    } catch {
      finish();
    }
  });
}

/**
 * Captures a verified non-black frame snapshot from an HTMLVideoElement onto an offscreen canvas,
 * returning either a verified snapshot canvas or the previous valid snapshot if decode yielded blank.
 */
function resolveVerifiedVideoSource(
  video: HTMLVideoElement,
  probeCanvasRef: { canvas: HTMLCanvasElement | null; ctx: CanvasRenderingContext2D | null; hasValid: boolean }
): HTMLVideoElement | HTMLCanvasElement | null {
  if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return probeCanvasRef.hasValid ? probeCanvasRef.canvas : null;
  }
  if (video.readyState < 2) {
    return probeCanvasRef.hasValid ? probeCanvasRef.canvas : null;
  }
  if (typeof document === 'undefined') {
    return video;
  }
  try {
    if (!probeCanvasRef.canvas) {
      const c = document.createElement('canvas');
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      probeCanvasRef.canvas = c;
      probeCanvasRef.ctx = c.getContext('2d', { willReadFrequently: true });
    } else if (probeCanvasRef.canvas.width !== video.videoWidth || probeCanvasRef.canvas.height !== video.videoHeight) {
      probeCanvasRef.canvas.width = video.videoWidth;
      probeCanvasRef.canvas.height = video.videoHeight;
    }
    const pCtx = probeCanvasRef.ctx;
    const pCanvas = probeCanvasRef.canvas;
    if (!pCtx || !pCanvas) return video;

    pCtx.drawImage(video, 0, 0, pCanvas.width, pCanvas.height);

    // Fast 5-point sample to detect driver GPU-blank frames (all zero RGB)
    const w = pCanvas.width;
    const h = pCanvas.height;
    const pts: Array<[number, number]> = [
      [Math.floor(w * 0.5), Math.floor(h * 0.5)],
      [Math.floor(w * 0.25), Math.floor(h * 0.25)],
      [Math.floor(w * 0.75), Math.floor(h * 0.25)],
      [Math.floor(w * 0.25), Math.floor(h * 0.75)],
      [Math.floor(w * 0.75), Math.floor(h * 0.75)]
    ];
    let hasPixels = false;
    for (const [pxX, pxY] of pts) {
      const d = pCtx.getImageData(pxX, pxY, 1, 1).data;
      if (d[0] + d[1] + d[2] > 4) {
        hasPixels = true;
        break;
      }
    }

    if (hasPixels) {
      probeCanvasRef.hasValid = true;
      return pCanvas;
    }

    // If GPU returned pure black while we already have a previous valid frame, keep the valid frame
    if (probeCanvasRef.hasValid) {
      return pCanvas;
    }
    return video;
  } catch {
    // Tainted cross-origin video: drawImage directly to export canvas (which already runs clean)
    return video;
  }
}

/**
 * Render a single composite cinema frame onto a Canvas
 */
export interface FrameCompositeProps {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  preset: CinemaResolutionPreset;
  shotIndex: number; // 0-indexed
  frameInShot: number; // 0 to totalFramesInShot - 1
  totalFramesInShot: number; // Variable: e.g. 12 frames (0.5s) up to 43,200 frames (30m)
  shotStartTimeSec?: number; // Cumulative timeline start time in seconds for frame-accurate SMPTE
  fps?: number;
  sourceElement: HTMLVideoElement | ImageBitmap | HTMLImageElement | null;
  titleBn?: string;
  titleEn?: string;
  tagline?: string;
  burnInTitles: boolean;
  cleanPlates: boolean;
  simulateFlare: boolean;
  projectTitle: string;
  lutFilter?: LutPreset;
  adjustments?: Partial<FrameAdjustments>;
  caption?: ShotCaption;
  shotType?: string;
  titleAlign?: TitleAlign;
  titlePreset?: HeroTitlePreset;
  titleSize?: number;
  verticalOffset?: number;
}

export function compositeCinemaFrame(props: FrameCompositeProps): void {
  const {
    ctx,
    width,
    height,
    preset,
    shotIndex,
    frameInShot,
    totalFramesInShot,
    shotStartTimeSec,
    fps = 24,
    sourceElement,
    titleBn = 'দৃষ্টি // THE SINGULARITY',
    titleEn = `SHOT ${String(shotIndex + 1).padStart(3, '0')}`,
    tagline = '24.0 FPS UNCOMPRESSED MASTER',
    burnInTitles,
    cleanPlates,
    simulateFlare,
    projectTitle,
    lutFilter,
    adjustments,
    caption,
    shotType,
    titleAlign,
    titlePreset,
    titleSize,
    verticalOffset
  } = props;

  const isVertical = preset === '9_16_vertical';
  const is4K = width >= 3840 || height >= 2160;
  const currentLocalSec = frameInShot / Math.max(1, fps);

  // 1. Always initialize export canvas with the shot's exact procedural color gradient backdrop
  //    (guarantees zero blank #000000 frames even if media decode glitches or is unassigned).
  renderProceduralBackdropToCanvas(ctx, width, height, shotIndex, currentLocalSec);

  // 2. Render Per-Shot Video/Image Media Layer if ready and decodable
  const hasReadySource = Boolean(
    sourceElement &&
      (sourceElement instanceof HTMLVideoElement
        ? sourceElement.readyState >= 2 && sourceElement.videoWidth > 0 && sourceElement.videoHeight > 0
        : sourceElement instanceof HTMLImageElement
          ? sourceElement.complete && sourceElement.naturalWidth > 0 && sourceElement.naturalHeight > 0
          : sourceElement.width > 0 && sourceElement.height > 0)
  );

  if (hasReadySource && sourceElement) {
    let srcW = 1920;
    let srcH = 1080;
    if (sourceElement instanceof HTMLVideoElement) {
      srcW = sourceElement.videoWidth || 1920;
      srcH = sourceElement.videoHeight || 1080;
    } else if (sourceElement instanceof ImageBitmap) {
      srcW = sourceElement.width;
      srcH = sourceElement.height;
    } else if (sourceElement instanceof HTMLImageElement) {
      srcW = sourceElement.naturalWidth || 1920;
      srcH = sourceElement.naturalHeight || 1080;
    }

    if (isVertical) {
      // 9:16 Vertical Reel Mode: Ambient blurred scope backing + sharp centered letterbox
      ctx.save();
      ctx.filter = 'blur(30px) brightness(0.4)';
      ctx.drawImage(sourceElement as any, -width * 0.5, 0, width * 2, height);
      ctx.restore();

      const targetScopeH = Math.round(width / 2.39);
      const targetScopeY = Math.round((height - targetScopeH) / 2);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(sourceElement as any, 0, targetScopeY, width, targetScopeH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, targetScopeY, width, targetScopeH);
    } else {
      const panProgress = frameInShot / Math.max(1, totalFramesInShot);
      const smoothProgress = 0.5 - 0.5 * Math.cos(Math.PI * panProgress);
      const zoom = 1.0 + smoothProgress * 0.04;

      const mediaRatio = srcW / srcH;
      const canvasRatio = width / height;

      let drawW = width;
      let drawH = height;
      let drawX = 0;
      let drawY = 0;

      if (mediaRatio > canvasRatio) {
        drawW = height * mediaRatio;
        drawX = (width - drawW) / 2;
      } else {
        drawH = width / mediaRatio;
        drawY = (height - drawH) / 2;
      }

      const scaledW = drawW * zoom;
      const scaledH = drawH * zoom;
      const scaledX = drawX - (scaledW - drawW) / 2;
      const scaledY = drawY - (scaledH - drawH) / 2;

      ctx.save();
      const filmFilter = buildFilmStockCssFilter(lutFilter || 'kodak_vision3', adjustments);
      if (filmFilter && filmFilter !== 'none') {
        ctx.filter = filmFilter;
      }
      try {
        ctx.drawImage(sourceElement as any, scaledX, scaledY, scaledW, scaledH);
      } catch {
        // Fallback keeps procedural backdrop initialized above
      }
      ctx.restore();
    }
  }

  applyCinematicPostProcess(ctx, width, height, lutFilter || 'kodak_vision3', adjustments, currentLocalSec);

  // 2b. Theatrical 2.39:1 Scope Mattes (Letterbox boundaries) for Standard 16:9 or standalone slates
  const isStandard16_9 = preset === '1080p_standard' || preset === '4k_standard';
  if (isStandard16_9 && !isVertical) {
    const scopeH = Math.round(width / 2.39);
    const matteH = Math.max(0, Math.round((height - scopeH) / 2));
    if (matteH > 0) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, matteH);
      ctx.fillRect(0, height - matteH, width, matteH);

      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = is4K ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(0, matteH);
      ctx.lineTo(width, matteH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, height - matteH);
      ctx.lineTo(width, height - matteH);
      ctx.stroke();
    }
  }

  // If Clean Plates is toggled ON, skip typography & overlays
  if (cleanPlates) {
    return;
  }

  // 3. Cinematic Vignette (Dark edges)
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.65, 'rgba(0,0,0,0.34)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 4. Anamorphic Flare & Light Streak Simulation
  const shouldRenderFlare = Boolean(simulateFlare || !hasReadySource);
  if (shouldRenderFlare) {
    const flareY = isVertical ? height * 0.5 : height * 0.48;
    const flareH = Math.max(8, height * 0.035);

    const flareGrad = ctx.createLinearGradient(0, flareY - flareH, 0, flareY + flareH);
    flareGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    flareGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.08)');
    flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.32)');
    flareGrad.addColorStop(0.7, 'rgba(245, 166, 35, 0.12)');
    flareGrad.addColorStop(1, 'rgba(245, 166, 35, 0)');
    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - flareH, width, flareH * 2);

    const pulse = 0.85 + 0.15 * Math.sin((frameInShot / Math.max(1, totalFramesInShot)) * Math.PI * 2);
    const coreH = Math.max(2, height * 0.004);
    const coreGrad = ctx.createLinearGradient(width * 0.15, flareY, width * 0.85, flareY);
    coreGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    coreGrad.addColorStop(0.35, `rgba(56, 189, 248, ${0.5 * pulse})`);
    coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.9 * pulse})`);
    coreGrad.addColorStop(0.65, `rgba(245, 166, 35, ${0.5 * pulse})`);
    coreGrad.addColorStop(1, 'rgba(245, 166, 35, 0)');
    ctx.fillStyle = coreGrad;
    ctx.fillRect(width * 0.15, flareY - coreH / 2, width * 0.7, coreH);
  }

  // 5. Aligned Dopamine & Kinetics Title Overlay (LEFT | MID | RIGHT | AUTO)
  if (burnInTitles) {
    const rampFrames = Math.min(16, Math.max(3, Math.floor(totalFramesInShot * 0.25)));
    const fadeIn = Math.min(1.0, Math.max(0.08, (frameInShot + 1) / rampFrames));
    const fadeOutFrames = Math.min(8, Math.max(2, Math.floor(totalFramesInShot * 0.12)));
    const remainingFrames = Math.max(1, totalFramesInShot - frameInShot);
    const fadeOut = remainingFrames <= fadeOutFrames ? Math.max(0.15, remainingFrames / fadeOutFrames) : 1.0;
    const titleFade = Math.min(fadeIn, fadeOut);
    const storeState = useStudioStore.getState();
    const resolvedAlign = resolveEffectiveTitleAlign(
      titleAlign ?? storeState.titleAlign ?? 'AUTO',
      shotIndex,
      shotType
    );
    const resolvedPreset = titlePreset ?? storeState.titleConfig?.preset ?? 'molten-gold';
    const resolvedSize = titleSize ?? storeState.titleConfig?.titleSize ?? 72;
    const resolvedVerticalOffset = verticalOffset ?? storeState.titleConfig?.verticalOffset ?? 0;

    renderAlignedCinemaTitleOverlay(ctx, width, height, {
      banglaTitle: titleBn,
      englishTitle: titleEn,
      dialogue: tagline || '24.0 FPS RAW • MASTER CINE PROJECTION',
      effectiveAlign: resolvedAlign,
      preset: resolvedPreset,
      titleSize: resolvedSize,
      verticalOffset: resolvedVerticalOffset,
      opacity: titleFade
    });
  }

  // 6. Top Telemetry Slates & Corner Reticles (Variable-Duration SMPTE Sync)
  const pad = is4K ? 60 : 30;
  const activeFps = fps > 0 ? fps : 24;
  const timeSec = (typeof shotStartTimeSec === 'number' ? shotStartTimeSec : shotIndex * 12.0) + (frameInShot / activeFps);
  const smpte = formatTimecode(timeSec, activeFps);
  const shotDurSec = (totalFramesInShot / activeFps).toFixed(1);

  ctx.save();
  ctx.fillStyle = '#F5A623';
  ctx.font = `bold ${is4K ? 22 : 12}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(`HANDFILM // SHOT ${String(shotIndex + 1).padStart(3, '0')} (${shotDurSec}s) // TC: ${smpte}`, pad, pad + (is4K ? 20 : 12));

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`${activeFps.toFixed(2)} FPS • ACEScg • DCI 4K RAW`, width - pad, pad + (is4K ? 20 : 12));
  ctx.restore();

  ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
  ctx.lineWidth = is4K ? 3 : 1.5;
  const bSize = is4K ? 36 : 18;

  ctx.beginPath();
  ctx.moveTo(pad + bSize, pad);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad, pad + bSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - pad - bSize, pad);
  ctx.lineTo(width - pad, pad);
  ctx.lineTo(width - pad, pad + bSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pad, height - pad - bSize);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(pad + bSize, height - pad);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - pad - bSize, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(width - pad, height - pad - bSize);
  ctx.stroke();

  // 7. Kinetic Rap Captions & Lyrical Typography Burn-In
  if (caption && caption.text && burnInTitles) {
    const shotTotalSec = totalFramesInShot / activeFps;
    renderCanvasBurnInCaption(ctx, width, height, caption, currentLocalSec, shotTotalSec);
  }
}

/**
 * Non-Blank Pixel Guard executed right before encoding each VideoFrame / MediaRecorder frame.
 * Verifies the active viewport is not pure #000000 black; if blank pixels are detected,
 * repaints the shot's procedural palette backdrop + aligned title overlay immediately.
 */
function ensureNonBlankCanvasFrame(props: FrameCompositeProps): void {
  const {
    ctx,
    width,
    height,
    shotIndex,
    frameInShot,
    totalFramesInShot,
    fps = 24,
    lutFilter,
    adjustments,
    burnInTitles,
    cleanPlates,
    titleBn = 'দৃষ্টি // THE SINGULARITY',
    titleEn = `SHOT ${String(shotIndex + 1).padStart(3, '0')}`,
    tagline = '24.0 FPS UNCOMPRESSED MASTER',
    shotType,
    titleAlign,
    titlePreset,
    titleSize,
    verticalOffset
  } = props;

  try {
    const sampleCoords: Array<[number, number]> = [
      [Math.floor(width * 0.5), Math.floor(height * 0.5)],
      [Math.floor(width * 0.25), Math.floor(height * 0.5)],
      [Math.floor(width * 0.75), Math.floor(height * 0.5)],
      [Math.floor(width * 0.5), Math.floor(height * 0.35)],
      [Math.floor(width * 0.5), Math.floor(height * 0.65)]
    ];

    let hasNonBlackPixel = false;
    for (const [sx, sy] of sampleCoords) {
      const px = ctx.getImageData(sx, sy, 1, 1).data;
      if (px[0] + px[1] + px[2] > 8) {
        hasNonBlackPixel = true;
        break;
      }
    }

    if (!hasNonBlackPixel) {
      const currentLocalSec = frameInShot / Math.max(1, fps);
      renderProceduralBackdropToCanvas(ctx, width, height, shotIndex, currentLocalSec);
      applyCinematicPostProcess(ctx, width, height, lutFilter || 'kodak_vision3', adjustments, currentLocalSec);
      if (burnInTitles && !cleanPlates) {
        const storeState = useStudioStore.getState();
        const resolvedAlign = resolveEffectiveTitleAlign(
          titleAlign ?? storeState.titleAlign ?? 'AUTO',
          shotIndex,
          shotType
        );
        renderAlignedCinemaTitleOverlay(ctx, width, height, {
          banglaTitle: titleBn,
          englishTitle: titleEn,
          dialogue: tagline,
          effectiveAlign: resolvedAlign,
          preset: titlePreset ?? storeState.titleConfig?.preset ?? 'molten-gold',
          titleSize: titleSize ?? storeState.titleConfig?.titleSize ?? 72,
          verticalOffset: verticalOffset ?? storeState.titleConfig?.verticalOffset ?? 0,
          opacity: 1.0
        });
      }
    }
  } catch {
    // Never abort export on pixel guard inspection
  }
}

/**
 * Format seconds to SMPTE Timecode HH:MM:SS:FF
 */
function formatTimecode(seconds: number, fps: number = 24): string {
  const totalFrames = Math.floor(seconds * fps);
  const ff = String(totalFrames % fps).padStart(2, '0');
  const totalSec = Math.floor(totalFrames / fps);
  const ss = String(totalSec % 60).padStart(2, '0');
  const mm = String(Math.floor(totalSec / 60) % 60).padStart(2, '0');
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  return `${hh}:${mm}:${ss}:${ff}`;
}

/**
 * Synthesizes an ambient cinema soundtrack buffer with rhythmic cut-boundary hit markers
 */
export function synthesizeAmbientAudioBuffer(
  durationSec: number,
  sampleRate: number = 48000,
  shotBoundaryTimesSec?: number[]
): AudioBuffer {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
  const totalSamples = Math.max(1, Math.ceil(durationSec * sampleRate));
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);

  const leftChannel = buffer.getChannelData(0);
  const rightChannel = buffer.getChannelData(1);

  const droneFreq = 55.0; // Low cinematic A1 drone (55 Hz)
  const harmonicFreq = 110.0; // A2 (110 Hz)
  const boundaries = shotBoundaryTimesSec && shotBoundaryTimesSec.length > 0 ? shotBoundaryTimesSec : null;
  let boundaryCursor = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Ambient cinematic drone with slow sub-bass breathing
    const subLfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.1 * t);
    const drone = (Math.sin(2 * Math.PI * droneFreq * t) * 0.15 +
                   Math.sin(2 * Math.PI * harmonicFreq * t) * 0.08) * subLfo;

    // Tactile hit marker at every variable shot cut boundary
    let shotTime = 1.0;
    if (boundaries) {
      while (boundaryCursor + 1 < boundaries.length && t >= boundaries[boundaryCursor + 1]) {
        boundaryCursor++;
      }
      shotTime = Math.max(0, t - boundaries[boundaryCursor]);
    } else {
      shotTime = t % 12.0;
    }

    let hit = 0;
    if (shotTime < 0.4) {
      const hitEnv = Math.exp(-shotTime * 8.0);
      hit = (Math.sin(2 * Math.PI * 130 * shotTime) * 0.25 +
             (Math.random() * 2 - 1) * 0.05) * hitEnv;
    }

    const val = Math.max(-1, Math.min(1, drone + hit));
    leftChannel[i] = val;
    rightChannel[i] = val;
  }

  return buffer;
}

/**
 * Resolves flexible shot duration in seconds for WebCodecs rendering (0.5s to 1800.0s).
 */
function resolveExportShotDurationSec(slide: any, frame: any): number {
  const candidates = [
    slide?.durationSec,
    slide?.duration,
    frame?.durationSec,
    frame?.slideHoldSec
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
      return Math.max(0.5, Math.min(1800.0, c));
    }
  }
  return 12.0;
}

/**
 * Resolves the raw per-shot Blob from `handfilm_media_vault` first (isolated per shot key),
 * falling back to `studioDraftDb` only when no Vault entry exists for that shot.
 */
async function loadShotRawBlob(shotIdx: number, slide: any, frame: any): Promise<Blob | null> {
  const candidateKeys = getCandidateShotMediaKeys(frame, slide, shotIdx);
  for (const key of candidateKeys) {
    const vaultBlob = await getShotMediaBlob(key);
    if (vaultBlob) return vaultBlob;
  }

  const mediaId = slide?.mediaBlobId || slide?.remoteUrl || frame?.imageUrl || '';
  if (mediaId && !mediaId.startsWith('http') && !mediaId.startsWith('data:') && !mediaId.startsWith('blob:')) {
    const dbBlob = await studioDraftDb.getSourceMediaBlob(mediaId);
    if (dbBlob) return dbBlob;
  }

  // Check studioDraftDb timeline slot -> media_vault (matches TactileStage resolution)
  try {
    const slot = await studioDraftDb.getTimelineSlot(shotIdx);
    if (slot?.mediaId) {
      const vaultItem = await studioDraftDb.getVaultMediaItem(slot.mediaId);
      if (vaultItem?.blob) return vaultItem.blob;
      const sourceBlob = await studioDraftDb.getSourceMediaBlob(slot.mediaId);
      if (sourceBlob) return sourceBlob;
    }
  } catch {
    // non-fatal
  }

  return await studioDraftDb.getSourceMediaBlobForShot(shotIdx);
}

/**
 * Decodes per-shot media from `shotMediaMap` (stored blob URLs) or `handfilm_media_vault`,
 * explicitly awaiting `onloadeddata` for videos or `img.decode()` for images before capture.
 * Returns null sources when missing or failed so `compositeCinemaFrame` falls back to the procedural color gradient.
 */
async function loadShotSourceMedia(
  shotIdx: number,
  slide: any,
  frame: any,
  shotMediaMap?: ShotMediaMap
): Promise<{
  activeVideoElement: HTMLVideoElement | null;
  activeBitmap: ImageBitmap | HTMLImageElement | null;
  activeObjectUrl: string | null;
  ownsObjectUrl: boolean;
}> {
  const storeMediaMap = useStudioStore.getState().shotMediaMap;
  const mediaEntry =
    resolveShotMediaEntry(shotMediaMap, frame, slide, shotIdx) ??
    resolveShotMediaEntry(storeMediaMap, frame, slide, shotIdx);

  let activeVideoElement: HTMLVideoElement | null = null;
  let activeBitmap: ImageBitmap | HTMLImageElement | null = null;
  let activeObjectUrl: string | null = null;
  let ownsObjectUrl = false;

  // 1. Primary: Resolve directly from `shotMediaMap` stored blob URL
  if (mediaEntry?.url) {
    if (mediaEntry.type === 'video') {
      const vid = await loadVideoElementWithOnLoadedData(mediaEntry.url, 4500);
      if (vid) {
        return {
          activeVideoElement: vid,
          activeBitmap: null,
          activeObjectUrl: null,
          ownsObjectUrl: false
        };
      }
    } else {
      const img = await loadDecodedImage(mediaEntry.url, 3000);
      if (img) {
        return {
          activeVideoElement: null,
          activeBitmap: img,
          activeObjectUrl: null,
          ownsObjectUrl: false
        };
      }
    }
  }

  // 2. Secondary: Read binary Blob directly from IndexedDB (`handfilm_media_vault` / `studioDraftDb`)
  const rawBlob = await loadShotRawBlob(shotIdx, slide, frame);
  if (rawBlob) {
    const isBlobVideo =
      rawBlob.type.startsWith('video/') ||
      Boolean(!rawBlob.type && (frame?.isVideo || slide?.isVideo || mediaEntry?.type === 'video'));
    if (isBlobVideo) {
      activeObjectUrl = URL.createObjectURL(rawBlob);
      ownsObjectUrl = true;
      activeVideoElement = await loadVideoElementWithOnLoadedData(activeObjectUrl, 4500);
      if (!activeVideoElement) {
        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = null;
        ownsObjectUrl = false;
      }
    } else {
      activeObjectUrl = URL.createObjectURL(rawBlob);
      ownsObjectUrl = true;
      activeBitmap = await loadDecodedImage(activeObjectUrl, 3000);
      if (!activeBitmap) {
        try {
          activeBitmap = await createImageBitmap(rawBlob);
        } catch {
          activeBitmap = null;
        }
        URL.revokeObjectURL(activeObjectUrl);
        activeObjectUrl = null;
        ownsObjectUrl = false;
      }
    }
    if (activeVideoElement || activeBitmap) {
      return { activeVideoElement, activeBitmap, activeObjectUrl, ownsObjectUrl };
    }
  }

  // 3. Tertiary: Check frame/slide remote or data URL
  const mediaUrl = frame?.videoSrc || frame?.imageUrl || slide?.remoteUrl || '';
  const isVideoMedia = Boolean(
    frame?.isVideo ||
      slide?.isVideo ||
      mediaUrl.startsWith('data:video') ||
      /\.(mp4|webm|mov|m4v|mkv)($|\?)/i.test(mediaUrl)
  );

  if (mediaUrl) {
    if (isVideoMedia) {
      activeVideoElement = await loadVideoElementWithOnLoadedData(mediaUrl, 4500);
    } else {
      activeBitmap = await loadDecodedImage(mediaUrl, 3000);
    }
  }

  // 4. Quaternary fallback: If primary video failed, try raster poster thumbnailUrl if valid
  if (!activeVideoElement && !activeBitmap && frame?.thumbnailUrl && !frame.thumbnailUrl.startsWith('data:image/svg+xml')) {
    activeBitmap = await loadDecodedImage(frame.thumbnailUrl, 2500);
  }

  return { activeVideoElement, activeBitmap, activeObjectUrl, ownsObjectUrl };
}

/**
 * Check if WebCodecs VideoEncoder is available and supports AVC encoding.
 * Returns the highest supported codec string, or null if unsupported.
 */
async function checkWebCodecsSupport(
  is4K: boolean,
  width: number,
  height: number,
  bitrateBps: number,
  fps: number
): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  // Firefox currently lacks AVC description record generation in WebCodecs VideoEncoder metadata,
  // causing mp4-muxer track.info.decoderConfig to remain null. Route Firefox directly to MediaRecorder.
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent || '');
  if (isFirefox) {
    return null;
  }

  const candidates = is4K
    ? ['avc1.640033', 'avc1.4d4028', 'avc1.42001f']
    : ['avc1.640028', 'avc1.4d4028', 'avc1.42001f'];

  for (const codec of candidates) {
    try {
      if (typeof VideoEncoder.isConfigSupported === 'function') {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: bitrateBps,
          framerate: fps,
          avc: { format: 'avc' }
        });
        if (support && support.supported) {
          return codec;
        }
      } else {
        return codec;
      }
    } catch {
      // Continue to next candidate
    }
  }
  return null;
}

/**
 * Universal Hardware/Software MediaRecorder Fallback Pipeline:
 * Provides 100% resilient offline video export across Firefox, Safari, and browsers
 * where WebCodecs VideoEncoder is unavailable, partial, or fails to encode H.264.
 */
async function exportCinemaMasterWithMediaRecorder(
  options: CinemaExportPipelineOptions
): Promise<{ blob: Blob; filename: string }> {
  const {
    projectTitle,
    frames = [],
    slides = [],
    currentSlideIndex = 0,
    totalSlides = 1,
    selectionMode,
    rangeStart = 1,
    rangeEnd = 1,
    customListText = '',
    excludedShotIndices = [],
    overrideShotIndices,
    resolutionPreset,
    burnInTitles,
    cleanPlates,
    simulateFlare,
    includeAudio,
    shotMediaMap,
    onProgress,
    onFrameRendered,
    previewCanvas,
    abortSignal
  } = options;

  const count = Math.max(1, totalSlides || slides.length || frames.length || 1);
  const allShotDurations = Array.from({ length: count }, (_, idx) =>
    resolveExportShotDurationSec(slides[idx], frames[idx])
  );

  const parsedRange = overrideShotIndices && overrideShotIndices.length > 0
    ? (() => {
        const totalOverrideFrames = overrideShotIndices.reduce(
          (sum, idx) => sum + Math.max(1, Math.round((allShotDurations[idx] ?? 12.0) * 24)),
          0
        );
        return {
          indices: overrideShotIndices,
          totalShots: overrideShotIndices.length,
          totalFrames: totalOverrideFrames,
          durationSec: totalOverrideFrames / 24.0,
          label: overrideShotIndices.length === 1 
            ? `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}`
            : `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}-SH${String(overrideShotIndices[overrideShotIndices.length - 1] + 1).padStart(3, '0')}`
        };
      })()
    : parseShotSelection(
        selectionMode,
        rangeStart,
        rangeEnd,
        customListText,
        count,
        currentSlideIndex,
        288,
        excludedShotIndices,
        allShotDurations
      );

  const shotIndices = parsedRange.indices;
  if (shotIndices.length === 0) {
    throw new Error('No shots selected for export.');
  }

  const fps = 24;
  const perShotDurationsSec = shotIndices.map(idx => resolveExportShotDurationSec(slides[idx], frames[idx]));
  const perShotFrameCounts = perShotDurationsSec.map(dur => Math.max(1, Math.round(dur * fps)));
  const shotBoundaryTimesSec: number[] = [];
  let runningBoundarySec = 0;
  for (let i = 0; i < perShotFrameCounts.length; i++) {
    shotBoundaryTimesSec.push(runningBoundarySec);
    runningBoundarySec += perShotFrameCounts[i] / fps;
  }
  const totalFrames = perShotFrameCounts.reduce((acc, n) => acc + n, 0);
  const totalExportDurationSec = totalFrames / fps;

  const dimensions = getExportPresetDimensions(resolutionPreset);
  const width = dimensions.width;
  const height = dimensions.height;
  const is4K = width >= 3840 || height >= 2160;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // Mount capture canvas invisibly in DOM so Chromium/WebView2 captureStream pushes real frames
  mountOffscreenExportElement(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    unmountOffscreenExportElement(canvas);
    throw new Error('Could not instantiate 2D Canvas context for export.');
  }

  // Select optimal MediaRecorder MIME type
  const mimeCandidates = [
    'video/mp4;codecs=avc1.4d4028,mp4a.40.2',
    'video/mp4;codecs=avc1.42e01e,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];
  let chosenMime = 'video/webm';
  if (typeof MediaRecorder !== 'undefined') {
    for (const m of mimeCandidates) {
      if (MediaRecorder.isTypeSupported(m)) {
        chosenMime = m;
        break;
      }
    }
  }

  const stream: MediaStream = (canvas as any).captureStream
    ? (canvas as any).captureStream(fps)
    : (canvas as any).mozCaptureStream
      ? (canvas as any).mozCaptureStream(fps)
      : new MediaStream();

  let audioContext: AudioContext | null = null;
  let audioSourceNode: AudioBufferSourceNode | null = null;
  if (includeAudio) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass({ sampleRate: 48000 });
        const audioBuffer = synthesizeAmbientAudioBuffer(totalExportDurationSec, 48000, shotBoundaryTimesSec);
        const dest = audioContext.createMediaStreamDestination();
        audioSourceNode = audioContext.createBufferSource();
        audioSourceNode.buffer = audioBuffer;
        audioSourceNode.connect(dest);
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack && stream.addTrack) {
          stream.addTrack(audioTrack);
        }
      }
    } catch (e) {
      console.warn('[MediaRecorder audio setup warning]', e);
    }
  }

  const targetBitrate = is4K ? 30_000_000 : 14_000_000;
  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: targetBitrate
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  const videoTrack = stream.getVideoTracks()[0];
  const hasRequestFrame = typeof (videoTrack as any)?.requestFrame === 'function';

  return new Promise<{ blob: Blob; filename: string }>(async (resolve, reject) => {
    const cleanupCaptureCanvas = () => {
      unmountOffscreenExportElement(canvas);
    };

    recorder.onstop = () => {
      cleanupCaptureCanvas();
      try {
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch {}

      const isWebm = chosenMime.includes('webm');
      const finalBlob = new Blob(recordedChunks, { type: chosenMime });
      const cleanProject = (projectTitle || 'PROJECT').replace(/[^a-zA-Z0-9_-]/g, '_');
      const resLabel = dimensions.isScope ? (is4K ? '4K_SCOPE' : '1080P_SCOPE') : (dimensions.isVertical ? '9_16_VERTICAL' : (is4K ? '4K_16_9' : '1080P_16_9'));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `HANDFILM_${cleanProject}_${parsedRange.label}_${resLabel}_${timestamp}.${isWebm ? 'webm' : 'mp4'}`;
      resolve({ blob: finalBlob, filename });
    };

    recorder.onerror = (e) => {
      cleanupCaptureCanvas();
      reject(new Error(`MediaRecorder error: ${e}`));
    };

    recorder.start(100);
    if (audioSourceNode) {
      try {
        audioSourceNode.start();
      } catch {}
    }

    let globalFrameIndex = 0;
    const startTimeMs = performance.now();

    try {
      for (let shotListIdx = 0; shotListIdx < shotIndices.length; shotListIdx++) {
        if (abortSignal?.aborted) {
          recorder.stop();
          cleanupCaptureCanvas();
          return reject(new Error('Export cancelled by user.'));
        }

        const shotIdx = shotIndices[shotListIdx];
        const slide = slides[shotIdx];
        const frame = frames[shotIdx];
        const currentShotNum = shotListIdx + 1;
        const totalShots = shotIndices.length;

        const bTitle = slide?.titleBn || frame?.bengaliTitle || 'দৃষ্টি // THE SINGULARITY';
        const eTitle = slide?.titleEn || frame?.title || `THE SINGULARITY // SHOT ${String(shotIdx + 1).padStart(3, '0')}`;
        const subTitle = slide?.tagline || frame?.tagline || '24.0 FPS UNCOMPRESSED MASTER';

        const { activeVideoElement: loadedVid, activeBitmap: loadedBmp, activeObjectUrl: loadedUrl, ownsObjectUrl } =
          await loadShotSourceMedia(shotIdx, slide, frame, shotMediaMap);
        let activeVideoElement = loadedVid;
        let activeBitmap = loadedBmp;
        let activeObjectUrl = ownsObjectUrl ? loadedUrl : null;
        const probeRef = { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, hasValid: false };

        const shotDurationSec = perShotDurationsSec[shotListIdx];
        const shotFramesCount = perShotFrameCounts[shotListIdx];
        const shotStartTimeSec = shotBoundaryTimesSec[shotListIdx] ?? 0;

        for (let f = 0; f < shotFramesCount; f++) {
          if (abortSignal?.aborted) {
            if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
            if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
            if (activeVideoElement) {
              activeVideoElement.src = '';
              unmountOffscreenExportElement(activeVideoElement);
            }
            recorder.stop();
            cleanupCaptureCanvas();
            return reject(new Error('Export cancelled by user.'));
          }

          let verifiedSource: HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement | null = activeBitmap;
          if (activeVideoElement) {
            await waitForVideoLoadedData(activeVideoElement, 1200);
            const vidDuration = Number.isFinite(activeVideoElement.duration) && activeVideoElement.duration > 0
              ? activeVideoElement.duration
              : shotDurationSec;
            const targetVideoSec = vidDuration > 0 ? (f / fps) % vidDuration : 0;
            await waitForSeek(activeVideoElement, targetVideoSec, 1000);
            verifiedSource = resolveVerifiedVideoSource(activeVideoElement, probeRef) || activeBitmap;
          }

          const frameProps: FrameCompositeProps = {
            ctx,
            width,
            height,
            preset: resolutionPreset,
            shotIndex: shotIdx,
            frameInShot: f,
            totalFramesInShot: shotFramesCount,
            shotStartTimeSec,
            fps,
            sourceElement: verifiedSource as any,
            titleBn: bTitle,
            titleEn: eTitle,
            tagline: subTitle,
            burnInTitles,
            cleanPlates,
            simulateFlare,
            projectTitle,
            lutFilter: frame?.lutFilter,
            adjustments: frame?.adjustments,
            caption: frame?.caption
          };
          compositeCinemaFrame(frameProps);
          ensureNonBlankCanvasFrame(frameProps);

          if (hasRequestFrame) {
            try {
              (videoTrack as any).requestFrame();
            } catch {}
          }

          globalFrameIndex++;

          const now = performance.now();
          const elapsedSec = (now - startTimeMs) / 1000;
          const currentFps = elapsedSec > 0 ? Math.round((globalFrameIndex / elapsedSec) * 10) / 10 : 24.0;
          const percent = Math.min(100, Math.round((globalFrameIndex / totalFrames) * 100));

          if (onProgress) {
            onProgress({
              currentShotIndex: currentShotNum,
              totalShots,
              currentFrameNum: globalFrameIndex,
              totalFrames,
              percent,
              fps: currentFps,
              statusText: `RENDERING (BROADCAST STREAM) // SHOT ${String(currentShotNum).padStart(3, '0')}/${String(totalShots).padStart(3, '0')} // FRAME ${globalFrameIndex.toLocaleString()}/${totalFrames.toLocaleString()} // ${percent}% // ${currentFps} FPS`
            });
          }

          if (previewCanvas) {
            try {
              const previewCtx = previewCanvas.getContext('2d');
              if (previewCtx) {
                previewCtx.drawImage(canvas, 0, 0, 320, 134);
                previewCtx.fillStyle = 'rgba(0, 0, 0, 0.72)';
                previewCtx.fillRect(0, 134 - 24, 320, 24);
                previewCtx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
                previewCtx.lineWidth = 1;
                previewCtx.strokeRect(0, 134 - 24, 320, 24);
                previewCtx.fillStyle = '#F5A623';
                previewCtx.font = 'bold 9.5px "JetBrains Mono", monospace';
                previewCtx.textAlign = 'center';
                const hudText = `[ SHOT ${String(currentShotNum).padStart(3, '0')} • FRAME ${f + 1}/${shotFramesCount} (${shotDurationSec.toFixed(1)}s) • ${fps} FPS ]`;
                previewCtx.fillText(hudText, 160, 134 - 8);
              }
            } catch {}
          }

          if (onFrameRendered) {
            onFrameRendered(canvas, globalFrameIndex, totalFrames);
          }

          await new Promise((r) => setTimeout(r, hasRequestFrame ? 12 : 28));
        }

        if (activeObjectUrl) {
          URL.revokeObjectURL(activeObjectUrl);
          activeObjectUrl = null;
        }
        if (activeBitmap && 'close' in activeBitmap) {
          activeBitmap.close();
          activeBitmap = null;
        }
        if (activeVideoElement) {
          activeVideoElement.pause();
          activeVideoElement.src = '';
          unmountOffscreenExportElement(activeVideoElement);
          activeVideoElement = null;
        }
        probeRef.canvas = null;
        probeRef.ctx = null;
      }

      if (onProgress) {
        onProgress({
          currentShotIndex: shotIndices.length,
          totalShots: shotIndices.length,
          currentFrameNum: totalFrames,
          totalFrames,
          percent: 99,
          fps: 24,
          statusText: 'FINALIZING BROADCAST MASTER STREAM...'
        });
      }

      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();
    } catch (loopErr) {
      try {
        recorder.stop();
      } catch {}
      reject(loopErr);
    }
  });
}

/**
 * WebCodecs Frame-Accurate Hardware Muxer Pipeline
 */
async function exportWithWebCodecs(
  options: CinemaExportPipelineOptions,
  selectedCodec: string,
  hardwareAccel: HardwareAcceleration = 'no-preference'
): Promise<{ blob: Blob; filename: string }> {
  const {
    projectTitle,
    frames = [],
    slides = [],
    currentSlideIndex = 0,
    totalSlides = 1,
    selectionMode,
    rangeStart = 1,
    rangeEnd = 1,
    customListText = '',
    excludedShotIndices = [],
    overrideShotIndices,
    resolutionPreset,
    bitrateProfile,
    burnInTitles,
    cleanPlates,
    simulateFlare,
    includeAudio,
    shotMediaMap,
    onProgress,
    onFrameRendered,
    previewCanvas,
    abortSignal
  } = options;

  const count = Math.max(1, totalSlides || slides.length || frames.length || 1);
  const allShotDurations = Array.from({ length: count }, (_, idx) =>
    resolveExportShotDurationSec(slides[idx], frames[idx])
  );

  const parsedRange = overrideShotIndices && overrideShotIndices.length > 0
    ? (() => {
        const totalOverrideFrames = overrideShotIndices.reduce(
          (sum, idx) => sum + Math.max(1, Math.round((allShotDurations[idx] ?? 12.0) * 24)),
          0
        );
        return {
          indices: overrideShotIndices,
          totalShots: overrideShotIndices.length,
          totalFrames: totalOverrideFrames,
          durationSec: totalOverrideFrames / 24.0,
          label: overrideShotIndices.length === 1 
            ? `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}`
            : `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}-SH${String(overrideShotIndices[overrideShotIndices.length - 1] + 1).padStart(3, '0')}`
        };
      })()
    : parseShotSelection(
        selectionMode,
        rangeStart,
        rangeEnd,
        customListText,
        count,
        currentSlideIndex,
        288,
        excludedShotIndices,
        allShotDurations
      );

  const shotIndices = parsedRange.indices;
  if (shotIndices.length === 0) {
    throw new Error('No shots selected for export.');
  }

  const fps = 24;
  const perShotDurationsSec = shotIndices.map(idx => resolveExportShotDurationSec(slides[idx], frames[idx]));
  const perShotFrameCounts = perShotDurationsSec.map(dur => Math.max(1, Math.round(dur * fps)));
  const shotBoundaryTimesSec: number[] = [];
  let runningBoundarySec = 0;
  for (let i = 0; i < perShotFrameCounts.length; i++) {
    shotBoundaryTimesSec.push(runningBoundarySec);
    runningBoundarySec += perShotFrameCounts[i] / fps;
  }
  const totalFrames = perShotFrameCounts.reduce((acc, n) => acc + n, 0);
  const totalExportDurationSec = totalFrames / fps;

  const dimensions = getExportPresetDimensions(resolutionPreset);
  const width = dimensions.width;
  const height = dimensions.height;
  const is4K = width >= 3840 || height >= 2160;
  const bitrateBps = getBitrateBps(bitrateProfile, is4K);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not instantiate 2D Canvas context for cinema master export.');

  const target = new ArrayBufferTarget();
  let muxer: Muxer<ArrayBufferTarget>;
  let audioBuffer: AudioBuffer | null = null;
  let audioEncoder: AudioEncoder | null = null;

  const hasAudioEncoder = typeof AudioEncoder !== 'undefined';
  const shouldMuxAudio = includeAudio && hasAudioEncoder;

  if (shouldMuxAudio) {
    try {
      audioBuffer = synthesizeAmbientAudioBuffer(totalExportDurationSec, 48000, shotBoundaryTimesSec);
      muxer = new Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
          frameRate: fps
        },
        audio: {
          codec: 'aac',
          numberOfChannels: 2,
          sampleRate: 48000
        },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset'
      });

      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.warn('[WebCodecs AudioEncoder Warning]', e)
      });

      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 320000
      });
    } catch (audioErr) {
      console.warn('[Audio Init Warning - Reverting to Video-Only Muxer]', audioErr);
      muxer = new Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
          frameRate: fps
        },
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset'
      });
      audioEncoder = null;
    }
  } else {
    muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
        frameRate: fps
      },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    });
  }

  let chunksEncoded = 0;
  let validChunksMuxed = 0;
  let encoderError: any = null;
  const decoderConfigState = { hasDecoderConfig: false, cachedDecoderConfig: null as VideoDecoderConfig | null };

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      chunksEncoded++;
      const safeMeta = sanitizeMuxerChunkMetadata(meta, decoderConfigState);

      try {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        const frameDurationMicros = Math.round((1 / fps) * 1_000_000);
        const safeTimestamp = typeof chunk.timestamp === 'number' && !isNaN(chunk.timestamp) && chunk.timestamp >= 0
          ? chunk.timestamp
          : Math.round(((chunksEncoded - 1) / fps) * 1_000_000);
        const safeDuration = typeof chunk.duration === 'number' && !isNaN(chunk.duration) && chunk.duration > 0
          ? chunk.duration
          : frameDurationMicros;

        muxer.addVideoChunkRaw(data, chunk.type, safeTimestamp, safeDuration, safeMeta);
        validChunksMuxed++;
      } catch (chunkErr) {
        console.warn('[WebCodecs addVideoChunk error]', chunkErr);
      }
    },
    error: (e) => {
      encoderError = e;
      console.error('[WebCodecs VideoEncoder Error]', e);
    }
  });

  videoEncoder.configure({
    codec: selectedCodec,
    width,
    height,
    bitrate: bitrateBps,
    framerate: fps,
    hardwareAcceleration: hardwareAccel,
    avc: { format: 'avc' }
  });

  let globalFrameIndex = 0;
  const startTimeMs = performance.now();

  for (let shotListIdx = 0; shotListIdx < shotIndices.length; shotListIdx++) {
    if (abortSignal?.aborted) {
      throw new Error('Export cancelled by user.');
    }
    if (encoderError) {
      throw encoderError;
    }

    const shotIdx = shotIndices[shotListIdx];
    const slide = slides[shotIdx];
    const frame = frames[shotIdx];
    const currentShotNum = shotListIdx + 1;
    const totalShots = shotIndices.length;

    const bTitle = slide?.titleBn || frame?.bengaliTitle || 'দৃষ্টি // THE SINGULARITY';
    const eTitle = slide?.titleEn || frame?.title || `THE SINGULARITY // SHOT ${String(shotIdx + 1).padStart(3, '0')}`;
    const subTitle = slide?.tagline || frame?.tagline || '24.0 FPS UNCOMPRESSED MASTER';

    const { activeVideoElement: loadedVid, activeBitmap: loadedBmp, activeObjectUrl: loadedUrl, ownsObjectUrl } =
      await loadShotSourceMedia(shotIdx, slide, frame, shotMediaMap);
    let activeVideoElement = loadedVid;
    let activeBitmap = loadedBmp;
    let activeObjectUrl = ownsObjectUrl ? loadedUrl : null;
    const probeRef = { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, hasValid: false };

    const shotDurationSec = perShotDurationsSec[shotListIdx];
    const shotFramesCount = perShotFrameCounts[shotListIdx];
    const shotStartTimeSec = shotBoundaryTimesSec[shotListIdx] ?? 0;

    for (let f = 0; f < shotFramesCount; f++) {
      if (abortSignal?.aborted) {
        if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
        if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
        if (activeVideoElement) {
          activeVideoElement.src = '';
          unmountOffscreenExportElement(activeVideoElement);
        }
        throw new Error('Export cancelled by user.');
      }
      if (encoderError) {
        if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
        if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
        if (activeVideoElement) {
          activeVideoElement.src = '';
          unmountOffscreenExportElement(activeVideoElement);
        }
        throw encoderError;
      }

      // Backpressure guard so hardware/software VideoEncoder queues don't overflow on 4K renders
      while (videoEncoder.encodeQueueSize > 8 && !encoderError && !abortSignal?.aborted) {
        await new Promise((r) => setTimeout(r, 4));
      }

      let verifiedSource: HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement | null = activeBitmap;
      if (activeVideoElement) {
        await waitForVideoLoadedData(activeVideoElement, 1200);
        const vidDuration = Number.isFinite(activeVideoElement.duration) && activeVideoElement.duration > 0
          ? activeVideoElement.duration
          : shotDurationSec;
        const targetVideoSec = vidDuration > 0 ? (f / fps) % vidDuration : 0;
        await waitForSeek(activeVideoElement, targetVideoSec, 1000);
        verifiedSource = resolveVerifiedVideoSource(activeVideoElement, probeRef) || activeBitmap;
      }

      const frameProps: FrameCompositeProps = {
        ctx,
        width,
        height,
        preset: resolutionPreset,
        shotIndex: shotIdx,
        frameInShot: f,
        totalFramesInShot: shotFramesCount,
        shotStartTimeSec,
        fps,
        sourceElement: verifiedSource as any,
        titleBn: bTitle,
        titleEn: eTitle,
        tagline: subTitle,
        burnInTitles,
        cleanPlates,
        simulateFlare,
        projectTitle,
        lutFilter: frame?.lutFilter,
        adjustments: frame?.adjustments,
        caption: frame?.caption
      };
      compositeCinemaFrame(frameProps);
      ensureNonBlankCanvasFrame(frameProps);

      const timestampMicros = Math.round((globalFrameIndex / fps) * 1_000_000);
      const durationMicros = Math.round((1 / fps) * 1_000_000);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampMicros,
        duration: durationMicros
      });

      const isKeyFrame = globalFrameIndex % 24 === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      globalFrameIndex++;

      const now = performance.now();
      const elapsedSec = (now - startTimeMs) / 1000;
      const currentFps = elapsedSec > 0 ? Math.round((globalFrameIndex / elapsedSec) * 10) / 10 : 24.0;
      const percent = Math.min(100, Math.round((globalFrameIndex / totalFrames) * 100));

      if (onProgress) {
        onProgress({
          currentShotIndex: currentShotNum,
          totalShots,
          currentFrameNum: globalFrameIndex,
          totalFrames,
          percent,
          fps: currentFps,
          statusText: `RENDERING SHOT ${String(currentShotNum).padStart(3, '0')}/${String(totalShots).padStart(3, '0')} // FRAME ${globalFrameIndex.toLocaleString()}/${totalFrames.toLocaleString()} // ${percent}% // ${currentFps} FPS`
        });
      }

      if (previewCanvas) {
        try {
          const previewCtx = previewCanvas.getContext('2d');
          if (previewCtx) {
            previewCtx.drawImage(canvas, 0, 0, 320, 134);
            previewCtx.fillStyle = 'rgba(0, 0, 0, 0.72)';
            previewCtx.fillRect(0, 134 - 24, 320, 24);
            previewCtx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
            previewCtx.lineWidth = 1;
            previewCtx.strokeRect(0, 134 - 24, 320, 24);
            previewCtx.fillStyle = '#F5A623';
            previewCtx.font = 'bold 9.5px "JetBrains Mono", monospace';
            previewCtx.textAlign = 'center';
            const hudText = `[ SHOT ${String(currentShotNum).padStart(3, '0')} • FRAME ${f + 1}/${shotFramesCount} (${shotDurationSec.toFixed(1)}s) • ${fps} FPS ]`;
            previewCtx.fillText(hudText, 160, 134 - 8);
          }
        } catch {}
      }

      if (onFrameRendered) {
        onFrameRendered(canvas, globalFrameIndex, totalFrames);
      }

      if (globalFrameIndex % 4 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    if (activeObjectUrl) {
      URL.revokeObjectURL(activeObjectUrl);
      activeObjectUrl = null;
    }
    if (activeBitmap && 'close' in activeBitmap) {
      activeBitmap.close();
      activeBitmap = null;
    }
    if (activeVideoElement) {
      activeVideoElement.pause();
      activeVideoElement.src = '';
      unmountOffscreenExportElement(activeVideoElement);
      activeVideoElement = null;
    }
    probeRef.canvas = null;
    probeRef.ctx = null;
  }

  // Encode Audio Track Chunks
  if (audioEncoder && audioBuffer) {
    try {
      if (onProgress) {
        onProgress({
          currentShotIndex: shotIndices.length,
          totalShots: shotIndices.length,
          currentFrameNum: totalFrames,
          totalFrames,
          percent: 98,
          fps: 24,
          statusText: 'MULTIPLEXING AAC 320 KBPS AUDIO TRACK...'
        });
      }

      const sampleRate = audioBuffer.sampleRate;
      const numChannels = audioBuffer.numberOfChannels;
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      const chunkSize = 1024;
      const totalSamples = audioBuffer.length;

      let sampleOffset = 0;
      while (sampleOffset < totalSamples) {
        const currentChunkSize = Math.min(chunkSize, totalSamples - sampleOffset);
        const planarData = new Float32Array(currentChunkSize * numChannels);

        planarData.set(left.subarray(sampleOffset, sampleOffset + currentChunkSize), 0);
        planarData.set(right.subarray(sampleOffset, sampleOffset + currentChunkSize), currentChunkSize);

        const timestampMicros = Math.round((sampleOffset / sampleRate) * 1_000_000);
        const audioData = new (window as any).AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: currentChunkSize,
          numberOfChannels: numChannels,
          timestamp: timestampMicros,
          data: planarData
        });

        audioEncoder.encode(audioData);
        audioData.close();

        sampleOffset += currentChunkSize;
      }

      await audioEncoder.flush();
      audioEncoder.close();
    } catch (audioEncErr) {
      console.warn('[Audio Encoding Flush Warning - Non Fatal]', audioEncErr);
    }
  }

  if (onProgress) {
    onProgress({
      currentShotIndex: shotIndices.length,
      totalShots: shotIndices.length,
      currentFrameNum: totalFrames,
      totalFrames,
      percent: 99,
      fps: 24,
      statusText: 'FINALIZING BROADCAST MP4 CONTAINER...'
    });
  }

  await videoEncoder.flush();
  videoEncoder.close();

  if (chunksEncoded === 0 || encoderError || validChunksMuxed === 0 || !decoderConfigState.hasDecoderConfig) {
    throw new Error(`WebCodecs encoder produced 0 valid chunks: ${encoderError?.message || 'Unsupported WebCodecs format or missing decoderConfig'}`);
  }

  try {
    muxer.finalize();
  } catch (finalizeErr) {
    console.warn('[WebCodecs muxer.finalize failed, falling back to MediaRecorder]', finalizeErr);
    throw finalizeErr;
  }

  const buffer = target.buffer;
  const mp4Blob = new Blob([buffer], { type: 'video/mp4' });

  const cleanProject = (projectTitle || 'PROJECT').replace(/[^a-zA-Z0-9_-]/g, '_');
  const resLabel = dimensions.isScope ? (is4K ? '4K_SCOPE' : '1080P_SCOPE') : (dimensions.isVertical ? '9_16_VERTICAL' : (is4K ? '4K_16_9' : '1080P_16_9'));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `HANDFILM_${cleanProject}_${parsedRange.label}_${resLabel}_${timestamp}.mp4`;

  return { blob: mp4Blob, filename };
}

/**
 * MASTER OFFLINE EXPORT PIPELINE:
 * Dual-engine architecture:
 * 1. Primary: Ultra-fast frame-by-frame hardware WebCodecs pipeline with mp4-muxer (with software fallback).
 * 2. Fallback: Universal MediaRecorder canvas-capture stream pipeline with synthesized audio
 *    guaranteeing successful export on Firefox, Safari, and platforms without AVC WebCodecs.
 */
export async function exportCinemaMasterMp4(
  options: CinemaExportPipelineOptions
): Promise<{ blob: Blob; filename: string }> {
  const dimensions = getExportPresetDimensions(options.resolutionPreset);
  const is4K = dimensions.width >= 3840 || dimensions.height >= 2160;
  const bitrateBps = getBitrateBps(options.bitrateProfile, is4K);

  // 1. Detect if WebCodecs VideoEncoder is available and supports AVC
  const supportedCodec = await checkWebCodecsSupport(
    is4K,
    dimensions.width,
    dimensions.height,
    bitrateBps,
    24
  );

  if (!supportedCodec) {
    console.info('[CinemaExport] WebCodecs AVC not supported on this platform/browser. Seamlessly routing to MediaRecorder fallback.');
    return await exportCinemaMasterWithMediaRecorder(options);
  }

  // 2. Execute WebCodecs pipeline with software retry then MediaRecorder recovery fallback
  try {
    return await exportWithWebCodecs(options, supportedCodec, 'no-preference');
  } catch (webCodecsErr: any) {
    if (options.abortSignal?.aborted || webCodecsErr?.message?.includes('cancelled')) {
      throw webCodecsErr;
    }
    console.warn('[CinemaExport] Primary WebCodecs attempt failed, retrying with software H.264 encoder:', webCodecsErr);
    try {
      return await exportWithWebCodecs(options, 'avc1.4d4028', 'prefer-software');
    } catch (swErr: any) {
      if (options.abortSignal?.aborted || swErr?.message?.includes('cancelled')) {
        throw swErr;
      }
      console.warn('[CinemaExport] Software WebCodecs attempt failed, recovering via MediaRecorder fallback:', swErr);
      return await exportCinemaMasterWithMediaRecorder(options);
    }
  }
}

/**
 * MASTER OFFLINE VP9 WEBM EXPORT PIPELINE:
 * Uses WebCodecs VideoEncoder (`vp09.00.10.08`) + `webm-muxer` when supported,
 * with seamless fallback to MediaRecorder (`video/webm;codecs=vp9,opus` / `video/webm`).
 */
export async function exportCinemaMasterVp9(
  options: CinemaExportPipelineOptions
): Promise<{ blob: Blob; filename: string }> {
  const {
    projectTitle,
    frames = [],
    slides = [],
    currentSlideIndex = 0,
    totalSlides = 1,
    selectionMode,
    rangeStart = 1,
    rangeEnd = 1,
    customListText = '',
    excludedShotIndices = [],
    overrideShotIndices,
    resolutionPreset,
    bitrateProfile,
    burnInTitles,
    cleanPlates,
    simulateFlare,
    includeAudio,
    shotMediaMap,
    onProgress,
    onFrameRendered,
    abortSignal
  } = options;

  const dimensions = getExportPresetDimensions(resolutionPreset);
  const width = dimensions.width;
  const height = dimensions.height;
  const is4K = width >= 3840 || height >= 2160;
  const bitrateBps = getBitrateBps(bitrateProfile, is4K);
  const fps = 24;

  let canWebCodecsVp9 = false;
  if (typeof VideoEncoder !== 'undefined' && typeof VideoEncoder.isConfigSupported === 'function') {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: 'vp09.00.10.08',
        width,
        height,
        bitrate: bitrateBps,
        framerate: fps
      });
      canWebCodecsVp9 = Boolean(support?.supported);
    } catch {
      canWebCodecsVp9 = false;
    }
  }

  if (!canWebCodecsVp9) {
    return await exportCinemaMasterWithMediaRecorder(options);
  }

  const count = Math.max(1, totalSlides || slides.length || frames.length || 1);
  const allShotDurations = Array.from({ length: count }, (_, idx) =>
    resolveExportShotDurationSec(slides[idx], frames[idx])
  );

  const parsedRange =
    overrideShotIndices && overrideShotIndices.length > 0
      ? (() => {
          const totalOverrideFrames = overrideShotIndices.reduce(
            (sum, idx) => sum + Math.max(1, Math.round((allShotDurations[idx] ?? 12.0) * fps)),
            0
          );
          return {
            indices: overrideShotIndices,
            totalShots: overrideShotIndices.length,
            totalFrames: totalOverrideFrames,
            durationSec: totalOverrideFrames / fps,
            label:
              overrideShotIndices.length === 1
                ? `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}`
                : `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}-SH${String(
                    overrideShotIndices[overrideShotIndices.length - 1] + 1
                  ).padStart(3, '0')}`
          };
        })()
      : parseShotSelection(
          selectionMode,
          rangeStart,
          rangeEnd,
          customListText,
          count,
          currentSlideIndex,
          288,
          excludedShotIndices,
          allShotDurations
        );

  const shotIndices = parsedRange.indices;
  if (shotIndices.length === 0) {
    throw new Error('No shots selected for VP9 export.');
  }

  const perShotDurationsSec = shotIndices.map((idx) => resolveExportShotDurationSec(slides[idx], frames[idx]));
  const perShotFrameCounts = perShotDurationsSec.map((dur) => Math.max(1, Math.round(dur * fps)));
  const shotBoundaryTimesSec: number[] = [];
  let runningSec = 0;
  for (let i = 0; i < perShotFrameCounts.length; i++) {
    shotBoundaryTimesSec.push(runningSec);
    runningSec += perShotFrameCounts[i] / fps;
  }
  const totalFrames = perShotFrameCounts.reduce((acc, n) => acc + n, 0);
  const totalExportDurationSec = totalFrames / fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not instantiate 2D Canvas context for VP9 export.');

  try {
    const target = new WebmArrayBufferTarget();
    let audioBuffer: AudioBuffer | null = null;
    let audioEncoder: AudioEncoder | null = null;
    let useAudio = false;

    if (includeAudio && typeof AudioEncoder !== 'undefined' && typeof AudioEncoder.isConfigSupported === 'function') {
      try {
        const opusSupport = await AudioEncoder.isConfigSupported({
          codec: 'opus',
          numberOfChannels: 2,
          sampleRate: 48000,
          bitrate: 192000
        });
        if (opusSupport?.supported) {
          useAudio = true;
          audioBuffer = synthesizeAmbientAudioBuffer(totalExportDurationSec, 48000, shotBoundaryTimesSec);
        }
      } catch {
        useAudio = false;
      }
    }

    const muxer = new WebmMuxer({
      target,
      video: { codec: 'V_VP9', width, height, frameRate: fps },
      ...(useAudio ? { audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: 48000 } } : {})
    });

    if (useAudio) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.warn('[VP9 AudioEncoder warning]', e)
      });
      audioEncoder.configure({
        codec: 'opus',
        numberOfChannels: 2,
        sampleRate: 48000,
        bitrate: 192000
      });
    }

    let vp9Chunks = 0;
    let vp9Error: any = null;
    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        vp9Chunks++;
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        vp9Error = e;
        console.warn('[VP9 VideoEncoder error]', e);
      }
    });

    videoEncoder.configure({
      codec: 'vp09.00.10.08',
      width,
      height,
      bitrate: bitrateBps,
      framerate: fps
    });

    let globalFrameIndex = 0;
    const startTimeMs = performance.now();

    for (let shotListIdx = 0; shotListIdx < shotIndices.length; shotListIdx++) {
      if (abortSignal?.aborted) {
        throw new Error('Export cancelled by user.');
      }

      const shotIdx = shotIndices[shotListIdx];
      const slide = slides[shotIdx];
      const frame = frames[shotIdx];
      const currentShotNum = shotListIdx + 1;
      const totalShots = shotIndices.length;

      const bTitle = slide?.titleBn || frame?.bengaliTitle || 'দৃষ্টি // THE SINGULARITY';
      const eTitle = slide?.titleEn || frame?.title || `THE SINGULARITY // SHOT ${String(shotIdx + 1).padStart(3, '0')}`;
      const subTitle = slide?.tagline || frame?.tagline || '24.0 FPS UNCOMPRESSED MASTER';

      const { activeVideoElement, activeBitmap, activeObjectUrl, ownsObjectUrl } =
        await loadShotSourceMedia(shotIdx, slide, frame, shotMediaMap);
      const ownedUrl = ownsObjectUrl ? activeObjectUrl : null;
      const probeRef = { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, hasValid: false };
      const shotDurationSec = perShotDurationsSec[shotListIdx];
      const shotFramesCount = perShotFrameCounts[shotListIdx];
      const shotStartTimeSec = shotBoundaryTimesSec[shotListIdx] ?? 0;

      for (let f = 0; f < shotFramesCount; f++) {
        if (abortSignal?.aborted) {
          if (ownedUrl) URL.revokeObjectURL(ownedUrl);
          if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
          if (activeVideoElement) {
            activeVideoElement.src = '';
            unmountOffscreenExportElement(activeVideoElement);
          }
          throw new Error('Export cancelled by user.');
        }

        while (videoEncoder.encodeQueueSize > 8 && !vp9Error && !abortSignal?.aborted) {
          await new Promise((r) => setTimeout(r, 4));
        }

        let verifiedSource: HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement | null = activeBitmap;
        if (activeVideoElement) {
          await waitForVideoLoadedData(activeVideoElement, 1200);
          const vidDuration = Number.isFinite(activeVideoElement.duration) && activeVideoElement.duration > 0
            ? activeVideoElement.duration
            : shotDurationSec;
          const targetVideoSec = vidDuration > 0 ? (f / fps) % vidDuration : 0;
          await waitForSeek(activeVideoElement, targetVideoSec, 1000);
          verifiedSource = resolveVerifiedVideoSource(activeVideoElement, probeRef) || activeBitmap;
        }

        const frameProps: FrameCompositeProps = {
          ctx,
          width,
          height,
          preset: resolutionPreset,
          shotIndex: shotIdx,
          frameInShot: f,
          totalFramesInShot: shotFramesCount,
          shotStartTimeSec,
          fps,
          sourceElement: verifiedSource as any,
          titleBn: bTitle,
          titleEn: eTitle,
          tagline: subTitle,
          burnInTitles,
          cleanPlates,
          simulateFlare,
          projectTitle,
          lutFilter: frame?.lutFilter,
          adjustments: frame?.adjustments,
          caption: frame?.caption
        };
        compositeCinemaFrame(frameProps);
        ensureNonBlankCanvasFrame(frameProps);

        const timestampMicros = Math.round((globalFrameIndex / fps) * 1_000_000);
        const durationMicros = Math.round((1 / fps) * 1_000_000);
        const videoFrame = new VideoFrame(canvas, { timestamp: timestampMicros, duration: durationMicros });
        videoEncoder.encode(videoFrame, { keyFrame: globalFrameIndex % 24 === 0 });
        videoFrame.close();

        globalFrameIndex++;
        const elapsedSec = (performance.now() - startTimeMs) / 1000;
        const currentFps = elapsedSec > 0 ? Math.round((globalFrameIndex / elapsedSec) * 10) / 10 : 24.0;
        const percent = Math.min(98, Math.round((globalFrameIndex / totalFrames) * 100));

        if (onProgress) {
          onProgress({
            currentShotIndex: currentShotNum,
            totalShots,
            currentFrameNum: globalFrameIndex,
            totalFrames,
            percent,
            fps: currentFps,
            statusText: `RENDERING SHOT ${String(currentShotNum).padStart(2, '0')}/${String(totalShots).padStart(2, '0')}... (${percent}%)`
          });
        }
        if (onFrameRendered) onFrameRendered(canvas, globalFrameIndex, totalFrames);
        if (globalFrameIndex % 4 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
      if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
      if (activeVideoElement) {
        activeVideoElement.pause();
        activeVideoElement.src = '';
        unmountOffscreenExportElement(activeVideoElement);
      }
    }

    if (audioEncoder && audioBuffer) {
      try {
        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        const chunkSize = 1024;
        for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
          const countNow = Math.min(chunkSize, audioBuffer.length - offset);
          const planar = new Float32Array(countNow * numChannels);
          planar.set(left.subarray(offset, offset + countNow), 0);
          planar.set(right.subarray(offset, offset + countNow), countNow);
          const audioData = new (window as any).AudioData({
            format: 'f32-planar',
            sampleRate,
            numberOfFrames: countNow,
            numberOfChannels: numChannels,
            timestamp: Math.round((offset / sampleRate) * 1_000_000),
            data: planar
          });
          audioEncoder.encode(audioData);
          audioData.close();
        }
        await audioEncoder.flush();
        audioEncoder.close();
      } catch {}
    }

    await videoEncoder.flush();
    videoEncoder.close();

    if (vp9Chunks === 0 || vp9Error) {
      throw new Error('VP9 encoder produced 0 chunks');
    }

    muxer.finalize();
    const webmBlob = new Blob([target.buffer], { type: 'video/webm' });
    const cleanProject = (projectTitle || 'PROJECT').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return {
      blob: webmBlob,
      filename: `HANDFILM_${cleanProject}_${parsedRange.label}_VP9_${timestamp}.webm`
    };
  } catch (err: any) {
    if (abortSignal?.aborted || err?.message?.includes('cancelled')) throw err;
    console.warn('[CinemaExport VP9] Falling back to MediaRecorder WebM:', err);
    return await exportCinemaMasterWithMediaRecorder(options);
  }
}

/**
 * OFFLINE PNG SEQUENCE ZIP EXPORTER:
 * Composites representative key frames (or multi-frame sub-steps) per shot onto HTML5 <canvas>
 * using per-shot `handfilm_media_vault` blobs or procedural backdrops and packs them into a ZIP archive.
 */
export async function exportPngSequenceZip(
  options: CinemaExportPipelineOptions & { framesPerShot?: number }
): Promise<{ blob: Blob; filename: string; frameCount: number }> {
  const {
    projectTitle,
    frames = [],
    slides = [],
    currentSlideIndex = 0,
    totalSlides = 1,
    selectionMode,
    rangeStart = 1,
    rangeEnd = 1,
    customListText = '',
    excludedShotIndices = [],
    overrideShotIndices,
    resolutionPreset,
    burnInTitles,
    cleanPlates,
    simulateFlare,
    framesPerShot = 1,
    shotMediaMap,
    onProgress,
    onFrameRendered,
    abortSignal
  } = options;

  const count = Math.max(1, totalSlides || slides.length || frames.length || 1);
  const allShotDurations = Array.from({ length: count }, (_, idx) =>
    resolveExportShotDurationSec(slides[idx], frames[idx])
  );

  const parsedRange =
    overrideShotIndices && overrideShotIndices.length > 0
      ? {
          indices: overrideShotIndices,
          totalShots: overrideShotIndices.length,
          totalFrames: overrideShotIndices.length * Math.max(1, framesPerShot),
          durationSec: 0,
          label:
            overrideShotIndices.length === 1
              ? `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}`
              : `SH${String(overrideShotIndices[0] + 1).padStart(3, '0')}-SH${String(
                  overrideShotIndices[overrideShotIndices.length - 1] + 1
                ).padStart(3, '0')}`
        }
      : parseShotSelection(
          selectionMode,
          rangeStart,
          rangeEnd,
          customListText,
          count,
          currentSlideIndex,
          288,
          excludedShotIndices,
          allShotDurations
        );

  const shotIndices = parsedRange.indices;
  if (shotIndices.length === 0) {
    throw new Error('No shots selected for PNG Sequence export.');
  }

  const dimensions = getExportPresetDimensions(resolutionPreset);
  const width = dimensions.width;
  const height = dimensions.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not instantiate 2D Canvas context for PNG sequence.');

  const zip = new JSZip();
  const folder = zip.folder('png_sequence') || zip;
  const samplesPerShot = Math.max(1, Math.min(24, Math.floor(framesPerShot)));
  const totalPngCount = shotIndices.length * samplesPerShot;
  let capturedCount = 0;

  let runningStartSec = 0;
  for (let i = 0; i < shotIndices.length; i++) {
    if (abortSignal?.aborted) throw new Error('Export cancelled by user.');
    const shotIdx = shotIndices[i];
    const slide = slides[shotIdx];
    const frame = frames[shotIdx];
    const shotDurSec = resolveExportShotDurationSec(slide, frame);
    const totalShotFrames = Math.max(1, Math.round(shotDurSec * 24));
    const bTitle = slide?.titleBn || frame?.bengaliTitle || 'দৃষ্টি // THE SINGULARITY';
    const eTitle = slide?.titleEn || frame?.title || `THE SINGULARITY // SHOT ${String(shotIdx + 1).padStart(3, '0')}`;
    const subTitle = slide?.tagline || frame?.tagline || '24.0 FPS UNCOMPRESSED MASTER';

    const { activeVideoElement, activeBitmap, activeObjectUrl, ownsObjectUrl } =
      await loadShotSourceMedia(shotIdx, slide, frame, shotMediaMap);
    const ownedUrl = ownsObjectUrl ? activeObjectUrl : null;
    const probeRef = { canvas: null as HTMLCanvasElement | null, ctx: null as CanvasRenderingContext2D | null, hasValid: false };

    for (let s = 0; s < samplesPerShot; s++) {
      if (abortSignal?.aborted) {
        if (ownedUrl) URL.revokeObjectURL(ownedUrl);
        if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
        if (activeVideoElement) {
          activeVideoElement.src = '';
          unmountOffscreenExportElement(activeVideoElement);
        }
        throw new Error('Export cancelled by user.');
      }

      const sampleRatio = samplesPerShot === 1 ? 0.25 : s / samplesPerShot;
      const frameInShot = Math.min(totalShotFrames - 1, Math.round(sampleRatio * totalShotFrames));

      let verifiedSource: HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement | null = activeBitmap;
      if (activeVideoElement) {
        await waitForVideoLoadedData(activeVideoElement, 1200);
        const vidDuration = Number.isFinite(activeVideoElement.duration) && activeVideoElement.duration > 0
          ? activeVideoElement.duration
          : shotDurSec;
        const targetSec = vidDuration > 0 ? (frameInShot / 24) % vidDuration : 0;
        await waitForSeek(activeVideoElement, targetSec, 1000);
        verifiedSource = resolveVerifiedVideoSource(activeVideoElement, probeRef) || activeBitmap;
      }

      const frameProps: FrameCompositeProps = {
        ctx,
        width,
        height,
        preset: resolutionPreset,
        shotIndex: shotIdx,
        frameInShot,
        totalFramesInShot: totalShotFrames,
        shotStartTimeSec: runningStartSec,
        fps: 24,
        sourceElement: verifiedSource as any,
        titleBn: bTitle,
        titleEn: eTitle,
        tagline: subTitle,
        burnInTitles,
        cleanPlates,
        simulateFlare,
        projectTitle,
        lutFilter: frame?.lutFilter,
        adjustments: frame?.adjustments,
        caption: frame?.caption
      };
      compositeCinemaFrame(frameProps);
      ensureNonBlankCanvasFrame(frameProps);

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        const shotPadded = String(shotIdx + 1).padStart(3, '0');
        const framePadded = String(s + 1).padStart(4, '0');
        folder.file(`shot_${shotPadded}_f${framePadded}.png`, base64, { base64: true });
      }

      capturedCount++;
      const percent = Math.min(99, Math.round((capturedCount / totalPngCount) * 100));
      if (onProgress) {
        onProgress({
          currentShotIndex: i + 1,
          totalShots: shotIndices.length,
          currentFrameNum: capturedCount,
          totalFrames: totalPngCount,
          percent,
          fps: 24,
          statusText: `RENDERING SHOT ${String(i + 1).padStart(2, '0')}/${String(shotIndices.length).padStart(2, '0')}... (${percent}%)`
        });
      }
      if (onFrameRendered) onFrameRendered(canvas, capturedCount, totalPngCount);
      await new Promise((r) => setTimeout(r, 0));
    }

    runningStartSec += shotDurSec;
    if (ownedUrl) URL.revokeObjectURL(ownedUrl);
    if (activeBitmap && 'close' in activeBitmap) activeBitmap.close();
    if (activeVideoElement) {
      activeVideoElement.pause();
      activeVideoElement.src = '';
      unmountOffscreenExportElement(activeVideoElement);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const cleanProject = (projectTitle || 'PROJECT').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return {
    blob,
    filename: `HANDFILM_${cleanProject}_${parsedRange.label}_PNG_SEQ_${timestamp}.zip`,
    frameCount: capturedCount
  };
}


