/**
 * @file /src/components/CutNativeExportModal.tsx
 * @description Unified Master Cinema Export Studio for RAWx / HANDFILM.
 * 
 * Combines all export modalities into ONE centered, viewport-locked modal:
 * 1. [ MP4 VIDEO ]: High-res WebCodecs native MP4 render with custom shot range, 4K/Scope/Vertical, and burn-in.
 * 2. [ PREMIERE PRO (FCP7 XML) ]: Final Cut Pro 7 XML (xmeml v5) sequence for Adobe Premiere Pro & CapCut Desktop.
 * 3. [ CAPCUT / DAVINCI (FCPXML) ]: Apple FCPXML v1.10 sequence with chapter markers & timeline timings.
 * 4. [ CONTACT SHEET (PDF) ]: Printable visual storyboard grid and call sheet.
 * 5. [ FULL PROJECT BACKUP (.rawx) ]: Complete loss-less project backup archive of all slides and media blobs.
 * 
 * Architectural Guarantees:
 * - CRITICAL: All React hooks (useState, useEffect, useMemo, useCallback) are declared at the very top of the component.
 * - NEVER puts any hooks after early returns or inside conditional branches.
 * - Portaled to document.body via ReactDOM.createPortal to avoid parent container/navbar clipping.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import gsap from 'gsap';
import { AnthologyFrame, AnthologyProject } from '../../types/anthology';
import { SlideDraft } from '../../types/project';
import { 
  CinemaResolutionPreset,
  BitrateProfile,
  ShotSelectionMode,
  RenderTelemetry,
  parseShotSelection,
  getExportPresetDimensions,
  exportCinemaMasterMp4,
  resolveShotVideoOrImageCandidate,
  verifySequenceMediaReadiness
} from '../../services/videoExportEngine';
import { 
  generatePremiereCapCutXml, 
  generateFcpXml, 
  downloadXmlBlob 
} from '../../services/exportXml';
import { exportFullIdbBackup } from '../../utils/backup';
import { exportDirectorsCutBundle } from '../../services/directorsCutExport';
import { exportProductionPackageZip } from '../../services/productionPackageExport';
import { 
  downloadStoryboardPdf, 
  exportFrameAsJpeg, 
  exportFramesAsJpegZip,
  StoryboardPdfLayout,
  StoryboardPdfTheme 
} from '../../utils/pdfExport';
import { eventBus } from '../../core/eventBus';
import { useStudioStore, resolveEffectiveTitleAlign } from '../../core/store';
import { useLicenseStore } from '../../services/licenseService';
import { resolveExportEntitlementPolicy } from '../../services/proSuiteEngine';
import { getCandidateShotMediaKeys, getShotMediaBlob, resolveShotMediaEntry, ShotMediaMap } from '../../services/handfilmMediaVault';
import { studioDraftDb } from '../../services/db';
import { opfsMediaStorage } from '../../services/media/opfsMediaStorage';
import { renderProceduralBackdropToCanvas } from '../../data/proceduralCinemaEngine';
import { resolveShotTitleData, resolveShotTitlePresetConfig } from '../../constants/titleTemplates';
import { renderTitlePresetToCanvas } from '../../services/titleCanvasRenderer';
import { resolveSpatialTitleChoreography } from '../../services/titleChoreographyEngine';
import { renderShotLightConfigToCanvas } from '../../services/lightingRelightingService';
import { ShotMediaThumbnail } from '../ShotMediaThumbnail';
import { isSvgPlaceholderUrl, isVideoSourceUrl } from '../../services/thumbnailEngine';
import { getLutFilterCSS, formatLutPresetLabel } from '../../utils/engine';
import { ExportLutPreviewCard } from './ExportLutPreviewCard';
import { EditInAppStrip } from '../bridge/EditInAppStrip';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';
import { 
  Film, 
  Video, 
  FileText, 
  HardDriveDownload, 
  Scissors, 
  Download, 
  X, 
  Clock, 
  SlidersHorizontal, 
  Maximize2, 
  Cpu, 
  Layers, 
  Volume2, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Smartphone, 
  Printer,
  Copy,
  Check,
  Archive,
  Package,
  Camera,
  Crown,
  BookOpen,
  Grid3X3,
  Layout,
  CheckSquare
} from 'lucide-react';

export type ExportModalTab = 'mp4' | 'premiere' | 'fcpxml' | 'package' | 'pdf' | 'directors_cut' | 'backup';

export interface UnifiedExportStudioProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle?: string;
  frames?: AnthologyFrame[];
  slides?: SlideDraft[];
  shotMediaMap?: ShotMediaMap;
  currentSlideIndex?: number;
  currentIndex?: number;
  totalSlides?: number;
  initialTab?: ExportModalTab;
  directorName?: string;
  aspectRatio?: string;
}

/**
 * Crystalline cinema success chime synthesizer (E5 -> B5 harmonics)
 */
function playExportSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Note 2: B5 (987.77 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.85);
  } catch {
    // Non-fatal if AudioContext is unavailable
  }
}

export const UnifiedExportStudio: React.FC<UnifiedExportStudioProps> = ({
  isOpen,
  onClose,
  projectTitle = 'UNTITLED_PROJECT',
  frames = [],
  slides = [],
  shotMediaMap: propShotMediaMap,
  currentSlideIndex: rawSlideIndex = 0,
  currentIndex,
  totalSlides = 1,
  initialTab = 'mp4',
  directorName = 'Rakib Himon',
  aspectRatio = '2.39:1'
}) => {
  const currentSlideIndex = typeof currentIndex === 'number' ? currentIndex : (rawSlideIndex ?? 0);
  const storeShotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const projectShots = useStudioStore((s) => s.project?.shots);
  const storeActiveLut = useStudioStore((s) => s.activeLut);
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const titleZone = useStudioStore((s) => s.titleZone);
  const titleConfig = useStudioStore((s) => s.titleConfig);
  const license = useLicenseStore((s) => s.license);
  const exportPolicy = useMemo(() => resolveExportEntitlementPolicy(license), [license]);
  const activeShotMediaMap = propShotMediaMap ?? storeShotMediaMap;

  // =========================================================================
  // HOOKS SECTION: ALL HOOKS DECLARED UNCONDITIONALLY AT THE VERY TOP
  // =========================================================================

  // 1. Modal Active Format Tab
  const [activeTab, setActiveTab] = useState<ExportModalTab>(initialTab);

  // 2. Shared Shot Sequence Matrix State
  const totalCount = Math.max(1, totalSlides || slides.length || frames.length || 1);
  const [selectionMode, setSelectionMode] = useState<ShotSelectionMode>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(12, totalCount));
  const [customListText, setCustomListText] = useState<string>('1, 3, 5-8, 12');
  const [excludedIndices, setExcludedIndices] = useState<number[]>([]);
  const hasAppliedContactRangeRef = useRef<boolean>(false);
  const appliedFirstShotIdxRef = useRef<number | null>(null);
  const appliedRangeBoundsRef = useRef<{ start: number; end: number; isContiguous: boolean } | null>(null);

  useEffect(() => {
    const unsubRange = eventBus.on(
      'export:apply_range',
      (payload?: { rangeText?: string; indices?: number[]; count?: number }) => {
        if (payload?.rangeText) {
          hasAppliedContactRangeRef.current = true;
          const sortedIndices = Array.isArray(payload.indices)
            ? [...payload.indices].sort((a, b) => a - b)
            : [];
          if (sortedIndices.length > 0) {
            const firstIdx = Math.max(0, sortedIndices[0]);
            const lastIdx = Math.max(firstIdx, sortedIndices[sortedIndices.length - 1]);
            const isContiguous = lastIdx - firstIdx + 1 === sortedIndices.length;
            appliedFirstShotIdxRef.current = firstIdx;
            appliedRangeBoundsRef.current = {
              start: firstIdx + 1,
              end: lastIdx + 1,
              isContiguous
            };
            setRangeStart(firstIdx + 1);
            setRangeEnd(lastIdx + 1);
            setPreviewShotIdx(firstIdx);
            setSelectionMode(isContiguous && sortedIndices.length > 1 ? 'range' : 'custom');
          } else {
            appliedFirstShotIdxRef.current = null;
            appliedRangeBoundsRef.current = null;
            setSelectionMode('custom');
          }
          setCustomListText(payload.rangeText);
          setExcludedIndices([]);
        }
      }
    );
    return () => {
      unsubRange();
    };
  }, []);

  // 3. MP4 Video Render Settings (Default to 4K for Active Trial/Pro, 720p Free Watermarked for Free Tier)
  const [resolutionPreset, setResolutionPreset] = useState<CinemaResolutionPreset>(() =>
    useLicenseStore.getState().hasActiveProOrTrial() ? '4k_scope' : '720p_free'
  );
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfile>('broadcast');
  const [targetFps, setTargetFps] = useState<24 | 30 | 60>(24);
  const [transparentAlpha, setTransparentAlpha] = useState<boolean>(false);
  const [burnInTitles, setBurnInTitles] = useState<boolean>(true);
  const [simulateFlare, setSimulateFlare] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Sync MP4 render presets cleanly when async license hydration completes or tier changes
  useEffect(() => {
    if (!exportPolicy.hasProOrTrial) {
      if (resolutionPreset !== '720p_free') setResolutionPreset('720p_free');
      if (targetFps === 60) setTargetFps(24);
      if (transparentAlpha) setTransparentAlpha(false);
    } else if (resolutionPreset === '720p_free') {
      setResolutionPreset(aspectRatio === '9:16' ? '9_16_vertical' : '4k_scope');
    }
  }, [exportPolicy.hasProOrTrial, aspectRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Custom Output Filename
  const [customFilename, setCustomFilename] = useState<string>('');

  // 5. XML / Timeline Export Options
  const [xmlFps, setXmlFps] = useState<number>(24);
  const [includeXmlMarkers, setIncludeXmlMarkers] = useState<boolean>(true);
  const [isXmlCopied, setIsXmlCopied] = useState<boolean>(false);

  // 6. Multi-Page Storyboard PDF & High-Res JPEG Options
  const [pdfLayout, setPdfLayout] = useState<StoryboardPdfLayout>(1);
  const [pdfTheme, setPdfTheme] = useState<StoryboardPdfTheme>('print');
  const [includePdfCover, setIncludePdfCover] = useState<boolean>(true);
  const [includePdfIndex, setIncludePdfIndex] = useState<boolean>(true);
  const [includePdfSpecs, setIncludePdfSpecs] = useState<boolean>(true);
  const [includePdfAudio, setIncludePdfAudio] = useState<boolean>(true);
  const [includePdfNotes, setIncludePdfNotes] = useState<boolean>(true);
  const [includePdfBilingual, setIncludePdfBilingual] = useState<boolean>(true);
  const [pdfProgressText, setPdfProgressText] = useState<string>('Ready to compile');
  const [pdfProgressPercent, setPdfProgressPercent] = useState<number>(0);
  const [includeJpegSlate, setIncludeJpegSlate] = useState<boolean>(true);
  const pdfColumns = pdfLayout; // backwards compatibility alias

  // 6b. Production Package ZIP Options
  const [packageBurnInTitles, setPackageBurnInTitles] = useState<boolean>(false);
  const [packageIncludeXmlEdl, setPackageIncludeXmlEdl] = useState<boolean>(true);
  const [packageResolution, setPackageResolution] = useState<'1080p_scope' | '4k_scope'>('1080p_scope');
  const [packageProgressText, setPackageProgressText] = useState<string>('Ready to bundle');
  const [packageProgressPercent, setPackageProgressPercent] = useState<number>(0);

  // 7. Render State & Live Telemetry (For MP4 Engine)
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<RenderTelemetry>({
    currentShotIndex: 1,
    totalShots: 1,
    currentFrameNum: 0,
    totalFrames: 288,
    percent: 0,
    fps: 24.0,
    statusText: 'IDLE // READY'
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportWarning, setExportWarning] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [downloadedFileName, setDownloadedFileName] = useState<string>('');
  const [lastExportDownload, setLastExportDownload] = useState<{ url: string; filename: string } | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const exportStartedAtRef = useRef<number>(0);

  const formatElapsedClock = useCallback((sec: number): string => {
    const whole = Math.max(0, Math.floor(sec));
    const mins = Math.floor(whole / 60);
    const rem = whole % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (!isExporting) return;
    exportStartedAtRef.current = performance.now();
    setElapsedSec(0);
    const id = window.setInterval(() => {
      setElapsedSec((performance.now() - exportStartedAtRef.current) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [isExporting]);

  useEffect(() => {
    const currentUrl = lastExportDownload?.url;
    return () => {
      if (currentUrl) {
        try {
          URL.revokeObjectURL(currentUrl);
        } catch {}
      }
    };
  }, [lastExportDownload]);

  // 8. Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dedicatedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shotStripScrollRef = useRef<HTMLDivElement | null>(null);
  // 8b. GSAP Transition Refs for Fluid Canvas Frame & Shot Rendering
  const gsapTransitionRef = useRef<{ alpha: number }>({ alpha: 1 });
  const gsapTweenRef = useRef<gsap.core.Tween | null>(null);
  const prevRenderedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevPreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 9. Interactive Shot Preview Selection (for dedicated canvas monitor)
  const [previewShotIdx, setPreviewShotIdx] = useState<number>(currentSlideIndex || 0);
  const [bypassPreviewLut, setBypassPreviewLut] = useState<boolean>(false);

  // Synchronize Tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Synchronize on Modal Open
  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setIsFinished(false);
      setExportError(null);
      setExcludedIndices([]);
      setBypassPreviewLut(false);
      if (hasAppliedContactRangeRef.current) {
        if (appliedFirstShotIdxRef.current !== null) {
          setPreviewShotIdx(Math.min(totalCount - 1, appliedFirstShotIdxRef.current));
        }
        if (appliedRangeBoundsRef.current) {
          setRangeStart(appliedRangeBoundsRef.current.start);
          setRangeEnd(Math.min(totalCount, appliedRangeBoundsRef.current.end));
        }
      } else {
        setPreviewShotIdx(currentSlideIndex || 0);
        const start = Math.max(1, currentSlideIndex + 1);
        const end = Math.min(totalCount, start + 11);
        setRangeStart(start);
        setRangeEnd(end);
        setCustomListText(`1, ${Math.min(3, totalCount)}, ${Math.min(5, totalCount)}-${Math.min(8, totalCount)}`);
      }
      hasAppliedContactRangeRef.current = false;
      appliedFirstShotIdxRef.current = null;
      appliedRangeBoundsRef.current = null;
      
      const cleanProject = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      setCustomFilename(`HANDFILM_${cleanProject}_Master_${timeStr}`);
      if (!exportPolicy.hasProOrTrial) {
        setResolutionPreset('720p_free');
      } else if (aspectRatio === '9:16') {
        setResolutionPreset('9_16_vertical');
      }
    }
  }, [isOpen, currentSlideIndex, totalCount, projectTitle, aspectRatio, exportPolicy.hasProOrTrial]);

  // Global Keyboard Shortcuts (Escape to Close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  // Per-shot variable durations across sequence
  const shotDurationsSec = useMemo(() => {
    return Array.from({ length: totalCount }, (_, idx) => {
      const s: any = slides?.[idx];
      const f: any = frames?.[idx];
      const cands = [s?.durationSec, s?.duration, f?.durationSec, f?.slideHoldSec];
      for (const c of cands) {
        if (typeof c === 'number' && Number.isFinite(c) && c > 0) {
          return Math.max(0.5, Math.min(1800.0, c));
        }
      }
      return 12.0;
    });
  }, [totalCount, slides, frames]);

  // Candidate selection in active range before exclusions
  const candidateSelection = useMemo(() => {
    return parseShotSelection(
      selectionMode,
      rangeStart,
      rangeEnd,
      customListText,
      totalCount,
      currentSlideIndex,
      288,
      [],
      shotDurationsSec
    );
  }, [selectionMode, rangeStart, rangeEnd, customListText, totalCount, currentSlideIndex, shotDurationsSec]);

  // Final active selection after exclusions
  const activeSelection = useMemo(() => {
    return parseShotSelection(
      selectionMode,
      rangeStart,
      rangeEnd,
      customListText,
      totalCount,
      currentSlideIndex,
      288,
      excludedIndices,
      shotDurationsSec
    );
  }, [selectionMode, rangeStart, rangeEnd, customListText, totalCount, currentSlideIndex, excludedIndices, shotDurationsSec]);

  // Dimension details for active resolution preset
  const dimensionInfo = useMemo(() => {
    return getExportPresetDimensions(resolutionPreset);
  }, [resolutionPreset]);

  // Pre-Export Sequence Media Readiness & Active Title Preset Summary
  const mediaReadiness = useMemo(() => {
    return verifySequenceMediaReadiness(activeSelection.indices, slides, frames, activeShotMediaMap);
  }, [activeSelection.indices, slides, frames, activeShotMediaMap, projectShots, titleConfig]);

  // Dynamic runtime display mm:ss.ff (or hh:mm:ss.ff for long sequences)
  const dynamicRuntime = useMemo(() => {
    const totalSec = activeSelection.durationSec;
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    const centis = Math.round((totalSec - Math.floor(totalSec)) * 100) % 100;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  }, [activeSelection.durationSec]);

  // Selected frames filtered by matrix
  const selectedFrames = useMemo(() => {
    const indices = activeSelection.indices;
    return indices.map(idx => frames[idx] || {
      id: `frame_${idx + 1}`,
      title: `Shot ${idx + 1}`,
      bengaliTitle: 'আলোর দৃশ্য',
      imageUrl: '',
      aspectRatio: '2.39:1',
      cameraSpecs: { focalLength: '35mm', aperture: 'T1.5', fps: 24 }
    });
  }, [activeSelection.indices, frames]);

  // Estimated Storyboard PDF total page count
  const estimatedPdfPages = useMemo(() => {
    const shotCount = selectedFrames.length > 0 ? selectedFrames.length : totalCount;
    const contentPages = Math.ceil(shotCount / pdfLayout);
    const coverPages = includePdfCover ? 1 : 0;
    const indexPages = includePdfIndex ? Math.max(1, Math.ceil(shotCount / 14)) : 0;
    return coverPages + indexPages + contentPages;
  }, [selectedFrames.length, totalCount, pdfLayout, includePdfCover, includePdfIndex]);

  // Toggle exclusion of a shot in the matrix
  const handleToggleExcludeShot = useCallback((shotIdx: number) => {
    setExcludedIndices(prev => {
      if (prev.includes(shotIdx)) {
        return prev.filter(i => i !== shotIdx);
      } else {
        if (candidateSelection.indices.length - prev.length <= 1) {
          return prev;
        }
        return [...prev, shotIdx];
      }
    });
  }, [candidateSelection.indices.length]);

  // Blit rendered frame directly 1:1 from the exact composited export <canvas> to LIVE RENDER ENCODER FEED
  const handleFrameRendered = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const targets = [dedicatedCanvasRef.current, previewCanvasRef.current].filter(Boolean) as HTMLCanvasElement[];
    if (targets.length === 0) return;

    if (gsapTweenRef.current) {
      gsapTweenRef.current.kill();
      gsapTweenRef.current = null;
    }

    for (const destCanvas of targets) {
      const destCtx = destCanvas.getContext('2d');
      if (!destCtx) continue;

      const targetW = destCanvas.width || 640;
      const targetH = destCanvas.height || 360;

      destCtx.fillStyle = '#06070B';
      destCtx.fillRect(0, 0, targetW, targetH);

      const sRatio = sourceCanvas.width / Math.max(1, sourceCanvas.height);
      const dRatio = targetW / Math.max(1, targetH);
      let dW = targetW;
      let dH = targetH;
      let dX = 0;
      let dY = 0;

      if (sRatio > dRatio) {
        dH = Math.round(targetW / sRatio);
        dY = Math.round((targetH - dH) / 2);
      } else {
        dW = Math.round(targetH * sRatio);
        dX = Math.round((targetW - dW) / 2);
      }

      try {
        destCtx.save();
        destCtx.globalAlpha = 1;
        destCtx.drawImage(sourceCanvas, dX, dY, dW, dH);
        destCtx.restore();
      } catch {}
    }
  }, []);

  // 9b. Active Monitor Shot Title Preset (shared 1:1 with canvas compositor & label)
  const activeMonitorShotIdx = activeSelection.indices.includes(previewShotIdx)
    ? previewShotIdx
    : (activeSelection.indices[0] ?? currentSlideIndex ?? 0);

  const activeMonitorTitleData = useMemo(() => {
    const f = frames[activeMonitorShotIdx] as any;
    const s = slides[activeMonitorShotIdx] as any;
    const st = projectShots?.[activeMonitorShotIdx] as any;
    return resolveShotTitleData(
      {
        titleData: f?.titleData ?? s?.titleData ?? st?.titleData,
        title: s?.titleEn || f?.title || st?.title,
        bengaliTitle: s?.titleBn || f?.bengaliTitle || st?.bengaliTitle,
        tagline: s?.tagline || f?.tagline || st?.tagline,
        titleStyleConfig: f?.titleStyleConfig ?? s?.titleStyleConfig ?? st?.titleStyleConfig,
        activeTitlePreset: f?.activeTitlePreset ?? st?.activeTitlePreset,
        dopamineConfig: f?.dopamineConfig ?? st?.dopamineConfig
      },
      activeMonitorShotIdx,
      titleConfig,
      titleAlign
    );
  }, [activeMonitorShotIdx, frames, slides, projectShots, titleConfig, titleAlign]);

  const activeMonitorPresetConfig = activeMonitorTitleData.styleConfig;
  const activeMonitorFrame = frames[activeMonitorShotIdx] as any;
  const activeMonitorSlide = slides[activeMonitorShotIdx] as any;
  const activeMonitorStoreShot = projectShots?.[activeMonitorShotIdx] as any;
  const activeMonitorLut =
    activeMonitorFrame?.lutFilter ||
    activeMonitorSlide?.lutFilter ||
    activeMonitorStoreShot?.lutFilter ||
    storeActiveLut ||
    'cinematic';
  const activeMonitorAdjustments =
    activeMonitorFrame?.adjustments ||
    activeMonitorSlide?.adjustments ||
    activeMonitorStoreShot?.adjustments;
  const activeMonitorLutCss = bypassPreviewLut
    ? 'none'
    : getLutFilterCSS(activeMonitorLut, activeMonitorAdjustments);

  // Idle Frame Preview Effect: Resolves per-shot media via unified video/image candidate resolver,
  // IndexedDB vaults, and OPFS — explicitly awaiting `onloadeddata` / `img.decode()` before compositing.
  useEffect(() => {
    if (!isOpen || isExporting) return;
    const canvas = dedicatedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width || 640;
    const h = canvas.height || 360;

    const validShotIdx = activeMonitorShotIdx;
    const slide = slides[validShotIdx] as any;
    const frame = frames[validShotIdx] as any;
    const storeShot = projectShots?.[validShotIdx] as any;
    const shotNum = validShotIdx + 1;
    const titleEn = slide?.titleEn || frame?.title || storeShot?.title || `SHOT ${String(shotNum).padStart(3, '0')}`;
    const titleBn = slide?.titleBn || frame?.bengaliTitle || storeShot?.titleBn || 'আলোর স্মৃতি';
    const tagline = slide?.tagline || frame?.tagline || storeShot?.tagline || '24.0 FPS RAW • MASTER CINE PROJECTION';
    const resolvedCandidate = resolveShotVideoOrImageCandidate(storeShot, frame, slide, validShotIdx, activeShotMediaMap);

    let isCancelled = false;
    let activePreviewVideo: HTMLVideoElement | null = null;
    const ownedObjectUrls: string[] = [];

    const drawCompositingOverlay = () => {
      if (isCancelled) return;

      // Aspect Ratio Masking preview (Scope 2.39:1 letterbox or Vertical 9:16 pillarbox)
      if (resolutionPreset === '4k_scope' || resolutionPreset === '1080p_scope') {
        const scopeH = Math.round(w / 2.39);
        const barH = Math.max(0, Math.round((h - scopeH) / 2));
        if (barH > 0) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, barH);
          ctx.fillRect(0, h - barH, w, barH);
          ctx.fillStyle = 'rgba(245, 166, 35, 0.45)';
          ctx.fillRect(0, barH - 1, w, 1);
          ctx.fillRect(0, h - barH, w, 1);
        }
      } else if (resolutionPreset === '9_16_vertical') {
        const vertW = Math.round(h * (9 / 16));
        const barW = Math.max(0, Math.round((w - vertW) / 2));
        if (barW > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
          ctx.fillRect(0, 0, barW, h);
          ctx.fillRect(w - barW, 0, barW, h);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.fillRect(barW - 1, 0, 1, h);
          ctx.fillRect(w - barW, 0, 1, h);
        }
      }

      // Cinematic Vignette
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.78);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Optical Flare Streak
      if (simulateFlare) {
        const flareY = h * 0.48;
        const flareGrad = ctx.createLinearGradient(0, flareY - 12, 0, flareY + 12);
        flareGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
        flareGrad.addColorStop(1, 'rgba(245, 166, 35, 0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, flareY - 12, w, 24);
      }

      // 3D Relighting & Volumetric Rig Overlay Parity
      const activeLightId = frame?.lightId ?? slide?.lightId ?? storeShot?.lightId ?? null;
      const activeLightConfig = frame?.lightConfig ?? slide?.lightConfig ?? storeShot?.lightConfig;
      if (activeLightConfig || activeLightId) {
        renderShotLightConfigToCanvas(ctx, w, h, activeLightConfig, activeLightId, 500);
      }

      // 1:1 WYSIWYG Preset Title Burn-in Preview matching exact exported MP4 canvas compositor
      if (burnInTitles && activeMonitorTitleData.enabled !== false) {
        const spatial = resolveSpatialTitleChoreography({
          titleAlign: activeMonitorTitleData.alignment ?? titleAlign ?? 'AUTO',
          zone9: activeMonitorTitleData.zone9 ?? (titleConfig?.heroGlobal ? titleZone : undefined),
          layoutMode: activeMonitorPresetConfig.layoutMode,
          shotIndex: validShotIdx,
          shotType: frame?.shotType ?? storeShot?.shotType,
          panX: storeShot?.panX,
          panY: storeShot?.panY,
          smartCropMode: storeShot?.smartCropMode
        });
        const camSpecs = frame?.cameraSpecs ?? frame?.cameraSpec;
        const camInfo = camSpecs
          ? `${camSpecs.focalLength || '35mm'} · ${camSpecs.aperture || 'T1.5'}`
          : undefined;
        const shotDuration =
          (typeof slide?.durationSec === 'number' && slide.durationSec > 0
            ? slide.durationSec
            : typeof frame?.durationSec === 'number' && frame.durationSec > 0
            ? frame.durationSec
            : 12);

        renderTitlePresetToCanvas(
          ctx,
          w,
          h,
          {
            eyebrowText: activeMonitorTitleData.eyebrowText,
            banglaTitle: activeMonitorTitleData.banglaTitle || titleBn,
            englishTitle: activeMonitorTitleData.englishSubtitle || titleEn,
            dialogue: activeMonitorTitleData.captionNote || tagline,
            creditsText: activeMonitorTitleData.creditsText,
            cameraInfo: camInfo,
            effectiveAlign: spatial.effectiveAlign,
            zone9: spatial.zone9,
            kineticEntrance: activeMonitorTitleData.kineticEntrance ?? spatial.kineticEntrance,
            opacity: 1.0,
            durationSec: shotDuration,
            layers: activeMonitorTitleData.layers,
            keyframes: activeMonitorTitleData.keyframes
          },
          activeMonitorPresetConfig,
          1.0
        );
      }

      // Corner Crosshairs & Framing Reticles
      ctx.strokeStyle = 'rgba(245, 166, 35, 0.6)';
      ctx.lineWidth = 1.5;
      const bracketLen = 14;
      const pad = 12;

      ctx.beginPath();
      ctx.moveTo(pad, pad + bracketLen);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + bracketLen, pad);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + bracketLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad, h - pad - bracketLen);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad + bracketLen, h - pad);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad, h - pad - bracketLen);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h / 2);
      ctx.lineTo(w / 2 + 8, h / 2);
      ctx.moveTo(w / 2, h / 2 - 8);
      ctx.lineTo(w / 2, h / 2 + 8);
      ctx.stroke();
    };

    const renderGradedBackdrop = () => {
      ctx.save();
      if (activeMonitorLutCss && activeMonitorLutCss !== 'none') {
        ctx.filter = activeMonitorLutCss;
      }
      renderProceduralBackdropToCanvas(ctx, w, h, validShotIdx, 0);
      ctx.restore();
    };

    const drawCoveredSource = (source: HTMLVideoElement | HTMLImageElement, srcW: number, srcH: number): boolean => {
      if (srcW <= 0 || srcH <= 0) return false;
      const iRatio = srcW / srcH;
      const dRatio = w / h;
      let dW = w;
      let dH = h;
      let dX = 0;
      let dY = 0;

      if (iRatio > dRatio) {
        dH = Math.round(w / iRatio);
        dY = Math.round((h - dH) / 2);
      } else {
        dW = Math.round(h * iRatio);
        dX = Math.round((w - dW) / 2);
      }

      try {
        ctx.save();
        if (activeMonitorLutCss && activeMonitorLutCss !== 'none') {
          ctx.filter = activeMonitorLutCss;
        }
        renderProceduralBackdropToCanvas(ctx, w, h, validShotIdx, 0);
        ctx.drawImage(source, dX, dY, dW, dH);
        ctx.restore();
        return true;
      } catch {
        ctx.restore();
        return false;
      }
    };

    const renderPreviewFrame = async () => {
      // Always initialize monitor with shot's exact procedural color gradient backdrop + active LUT
      renderGradedBackdrop();

      let thumbUrl = resolvedCandidate.url || '';
      let isVideo = resolvedCandidate.isVideo;

      // Fallback check to IndexedDB vault / timeline slot / OPFS when no direct URL resolved
      if (!thumbUrl) {
        try {
          const candidateKeys = getCandidateShotMediaKeys(frame || storeShot, slide, validShotIdx);
          for (const k of candidateKeys) {
            const b = await getShotMediaBlob(k);
            if (b) {
              const objUrl = URL.createObjectURL(b);
              ownedObjectUrls.push(objUrl);
              thumbUrl = objUrl;
              isVideo = b.type.startsWith('video/') || Boolean(frame?.isVideo || slide?.isVideo || storeShot?.isVideo);
              break;
            }
          }
          if (!thumbUrl) {
            const slot = await studioDraftDb.getTimelineSlot(validShotIdx);
            if (slot?.mediaId) {
              const item = await studioDraftDb.getVaultMediaItem(slot.mediaId);
              const blob = item?.blob || (await studioDraftDb.getSourceMediaBlob(slot.mediaId));
              if (blob) {
                const objUrl = URL.createObjectURL(blob);
                ownedObjectUrls.push(objUrl);
                thumbUrl = objUrl;
                isVideo = blob.type.startsWith('video/') || Boolean((slot as any)?.isVideo || frame?.isVideo || slide?.isVideo || storeShot?.isVideo);
              } else if (opfsMediaStorage.checkSupport()) {
                const opfsUrl = await opfsMediaStorage.getMasterMediaUrl(slot.mediaId);
                if (opfsUrl) {
                  ownedObjectUrls.push(opfsUrl);
                  thumbUrl = opfsUrl;
                  isVideo = Boolean((slot as any)?.isVideo || frame?.isVideo || slide?.isVideo || storeShot?.isVideo);
                }
              }
            }
          }
        } catch {
          // non-fatal preview lookup
        }
      }

      if (isCancelled || !dedicatedCanvasRef.current) return;

      if (!thumbUrl) {
        drawCompositingOverlay();
        return;
      }

      const mediaEntry = resolveShotMediaEntry(activeShotMediaMap, frame || storeShot, slide, validShotIdx);
      if (!isVideo && mediaEntry) {
        isVideo =
          mediaEntry.type === 'video' ||
          isVideoSourceUrl(thumbUrl, {
            isVideo: Boolean(frame?.isVideo || slide?.isVideo || storeShot?.isVideo),
            mimeType: (mediaEntry as any)?.mimeType,
            name: (mediaEntry as any)?.name
          });
      }

      const isExternalUrl = !thumbUrl.startsWith('blob:') && !thumbUrl.startsWith('data:');

      const tryDrawFallbackPoster = async () => {
        const posterFallback =
          (frame?.thumbnailUrl && !isSvgPlaceholderUrl(frame.thumbnailUrl) && !isVideoSourceUrl(frame.thumbnailUrl)
            ? frame.thumbnailUrl
            : '') ||
          (slide?.thumbnailUrl && !isSvgPlaceholderUrl(slide.thumbnailUrl) && !isVideoSourceUrl(slide.thumbnailUrl)
            ? slide.thumbnailUrl
            : '');
        if (!posterFallback) return false;
        const posterImg = new Image();
        if (!posterFallback.startsWith('blob:') && !posterFallback.startsWith('data:')) {
          posterImg.crossOrigin = 'anonymous';
        }
        posterImg.src = posterFallback;
        try {
          if (typeof posterImg.decode === 'function') {
            await posterImg.decode();
          } else {
            await new Promise<void>((resolve, reject) => {
              posterImg.onload = () => resolve();
              posterImg.onerror = () => reject(new Error('Poster fallback failed'));
            });
          }
          if (isCancelled || !dedicatedCanvasRef.current) return false;
          return drawCoveredSource(posterImg, posterImg.naturalWidth, posterImg.naturalHeight);
        } catch {
          return false;
        }
      };

      if (isVideo) {
        const loadVideoPreview = async (useCorsAttr: boolean): Promise<HTMLVideoElement | null> => {
          const vid = document.createElement('video');
          activePreviewVideo = vid;
          if (useCorsAttr) vid.crossOrigin = 'anonymous';
          vid.muted = true;
          vid.playsInline = true;
          vid.preload = 'auto';
          vid.style.position = 'fixed';
          vid.style.left = '-9999px';
          vid.style.top = '0px';
          vid.style.width = '4px';
          vid.style.height = '4px';
          vid.style.opacity = '0.001';
          vid.style.pointerEvents = 'none';
          if (document.body) document.body.appendChild(vid);

          const loaded = await new Promise<boolean>((resolve) => {
            let settled = false;
            const finish = (ok: boolean) => {
              if (!settled) {
                settled = true;
                clearTimeout(timer);
                vid.onloadeddata = null;
                vid.onerror = null;
                resolve(ok);
              }
            };
            const timer = setTimeout(
              () => finish(vid.readyState >= 2 && vid.videoWidth > 0),
              3000
            );
            vid.onloadeddata = () => finish(vid.readyState >= 2 && vid.videoWidth > 0);
            vid.onerror = () => finish(false);
            vid.src = thumbUrl;
            try {
              vid.load();
            } catch {}
          });

          if (!loaded || isCancelled) {
            try {
              if (vid.parentElement) vid.parentElement.removeChild(vid);
            } catch {}
            return null;
          }

          // Seek slightly past t=0 to avoid fade-in black frame on first frame
          const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 1.0;
          const seekTarget = Math.min(0.15, dur * 0.1);
          if (dur > 0.25 && Math.abs(vid.currentTime - seekTarget) > 0.05) {
            await new Promise<void>((resolve) => {
              let done = false;
              const finishSeek = () => {
                if (!done) {
                  done = true;
                  clearTimeout(seekTimer);
                  vid.onseeked = null;
                  resolve();
                }
              };
              const seekTimer = setTimeout(finishSeek, 800);
              vid.onseeked = finishSeek;
              try {
                vid.currentTime = seekTarget;
              } catch {
                finishSeek();
              }
            });
          }
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          return vid;
        };

        let previewVid = await loadVideoPreview(isExternalUrl);
        if (!previewVid && isExternalUrl && !isCancelled) {
          previewVid = await loadVideoPreview(false);
        }

        if (isCancelled || !dedicatedCanvasRef.current) {
          if (previewVid?.parentElement) {
            try { previewVid.parentElement.removeChild(previewVid); } catch {}
          }
          return;
        }

        const drew = previewVid
          ? drawCoveredSource(previewVid, previewVid.videoWidth, previewVid.videoHeight)
          : false;
        if (previewVid) {
          try {
            previewVid.pause();
            previewVid.removeAttribute('src');
            if (previewVid.parentElement) previewVid.parentElement.removeChild(previewVid);
          } catch {}
        }

        if (!drew) {
          const drewPoster = await tryDrawFallbackPoster();
          if (isCancelled || !dedicatedCanvasRef.current) return;
          if (!drewPoster) {
            renderGradedBackdrop();
          }
        }
        drawCompositingOverlay();
        return;
      }

      const decodeImage = async (useCorsAttr: boolean): Promise<HTMLImageElement | null> => {
        const img = new Image();
        if (useCorsAttr) img.crossOrigin = 'anonymous';
        img.src = thumbUrl;
        try {
          if (typeof img.decode === 'function') {
            await img.decode();
          } else {
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error('Preview image failed to load'));
            });
          }
          return img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null;
        } catch {
          return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null;
        }
      };

      let decodedImg = await decodeImage(isExternalUrl);
      if (!decodedImg && isExternalUrl && !isCancelled) {
        decodedImg = await decodeImage(false);
      }

      if (isCancelled || !dedicatedCanvasRef.current) return;

      if (!decodedImg || !drawCoveredSource(decodedImg, decodedImg.naturalWidth, decodedImg.naturalHeight)) {
        const drewPoster = await tryDrawFallbackPoster();
        if (isCancelled || !dedicatedCanvasRef.current) return;
        if (!drewPoster) {
          renderGradedBackdrop();
        }
      }
      drawCompositingOverlay();
    };

    void renderPreviewFrame();

    return () => {
      isCancelled = true;
      for (const objUrl of ownedObjectUrls) {
        try { URL.revokeObjectURL(objUrl); } catch {}
      }
      if (activePreviewVideo) {
        activePreviewVideo.onloadeddata = null;
        activePreviewVideo.onseeked = null;
        activePreviewVideo.onerror = null;
        try {
          activePreviewVideo.pause();
          activePreviewVideo.removeAttribute('src');
          if (activePreviewVideo.parentElement) {
            activePreviewVideo.parentElement.removeChild(activePreviewVideo);
          }
        } catch {}
        activePreviewVideo = null;
      }
    };
  }, [
    isOpen,
    isExporting,
    activeMonitorShotIdx,
    activeMonitorPresetConfig,
    activeMonitorLutCss,
    slides,
    frames,
    projectShots,
    activeShotMediaMap,
    resolutionPreset,
    burnInTitles,
    simulateFlare,
    titleAlign,
    titleConfig
  ]);

  // Launch Master MP4 Render Pipeline
  const handleStartMp4Export = useCallback(async () => {
    if (
      resolutionPreset !== '720p_free' &&
      !useLicenseStore.getState().requireProAccess('Pro HD/4K Watermark-Free Export')
    ) {
      return;
    }
    if (targetFps === 60 && !useLicenseStore.getState().requireProAccess('60 FPS Smooth Cinema Export')) {
      return;
    }
    if (transparentAlpha && !useLicenseStore.getState().requireProAccess('Transparent Alpha Export')) {
      return;
    }
    if (activeSelection.totalShots === 0) {
      setExportError('At least one shot must be included in the sequence.');
      return;
    }

    setIsExporting(true);
    setIsFinished(false);
    setExportError(null);
    setExportWarning(null);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await exportCinemaMasterMp4({
        projectTitle,
        frames,
        slides,
        shotMediaMap: activeShotMediaMap,
        currentSlideIndex,
        totalSlides: totalCount,
        selectionMode,
        rangeStart,
        rangeEnd,
        customListText,
        excludedShotIndices: excludedIndices,
        overrideShotIndices: activeSelection.indices,
        resolutionPreset,
        bitrateProfile,
        targetFps,
        transparentAlpha,
        applyFreeWatermark: exportPolicy.watermarkRequired,
        burnInTitles,
        cleanPlates: false,
        simulateFlare,
        includeAudio,
        onProgress: (tel) => setTelemetry(tel),
        onWarning: (msg) => setExportWarning(msg),
        onFrameRendered: (canvas) => handleFrameRendered(canvas),
        abortSignal: abortCtrl.signal
      });

      const ext = result.blob.type.includes('webm') ? '.webm' : '.mp4';
      const baseName = customFilename.trim().replace(/\.(mp4|webm)$/i, '') || result.filename.replace(/\.(mp4|webm)$/i, '') || `HANDFILM_${projectTitle}_Master`;
      const targetName = `${baseName}${ext}`;

      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      playExportSuccessChime();
      setLastExportDownload({ url: downloadUrl, filename: targetName });
      setDownloadedFileName(targetName);
      setIsFinished(true);
      setIsExporting(false);

    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('aborted')) {
        setExportError('Render aborted by user.');
      } else {
        console.error('[CinemaExportStudio] Render failed:', err);
        setExportError(err?.message || 'Video encoding pipeline failed.');
      }
      setIsExporting(false);
    }
  }, [
    activeSelection.totalShots,
    activeSelection.indices,
    projectTitle,
    frames,
    slides,
    currentSlideIndex,
    totalCount,
    selectionMode,
    rangeStart,
    rangeEnd,
    customListText,
    excludedIndices,
    resolutionPreset,
    bitrateProfile,
    targetFps,
    transparentAlpha,
    exportPolicy.watermarkRequired,
    burnInTitles,
    simulateFlare,
    includeAudio,
    customFilename,
    activeShotMediaMap,
    handleFrameRendered
  ]);

  // Launch Professional Cinematography 4K Master MP4 Render Pipeline (3840×1608 4K DCI Scope @ 80 Mbps)
  const handleStart4KMasterExport = useCallback(async () => {
    if (!useLicenseStore.getState().requireProAccess('4K / 16-Bit Master Export')) {
      return;
    }
    if (activeSelection.totalShots === 0) {
      setExportError('At least one shot must be included in the sequence.');
      return;
    }

    // Predefined professional cinematography configuration:
    // - 3840×1608 4K DCI Scope Master
    // - 80 Mbps Master AVC Level 5.1 high-bitrate encoder
    // - 320 kbps High-Fidelity AAC Stereo Audio (48 kHz)
    // - Anamorphic flare streak simulation
    // - Frame-accurate SMPTE timecode
    setResolutionPreset('4k_scope');
    setBitrateProfile('master');
    setSimulateFlare(true);
    setIncludeAudio(true);

    setIsExporting(true);
    setIsFinished(false);
    setExportError(null);
    setExportWarning(null);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await exportCinemaMasterMp4({
        projectTitle,
        frames,
        slides,
        shotMediaMap: activeShotMediaMap,
        currentSlideIndex,
        totalSlides: totalCount,
        selectionMode,
        rangeStart,
        rangeEnd,
        customListText,
        excludedShotIndices: excludedIndices,
        overrideShotIndices: activeSelection.indices,
        resolutionPreset: '4k_scope',
        bitrateProfile: 'master',
        targetFps,
        transparentAlpha: false,
        applyFreeWatermark: false,
        burnInTitles,
        cleanPlates: false,
        simulateFlare: true,
        includeAudio: true,
        onProgress: (tel) => setTelemetry(tel),
        onWarning: (msg) => setExportWarning(msg),
        onFrameRendered: (canvas) => handleFrameRendered(canvas),
        abortSignal: abortCtrl.signal
      });

      const ext = result.blob.type.includes('webm') ? '.webm' : '.mp4';
      const baseName = customFilename.trim().replace(/\.(mp4|webm)$/i, '') || result.filename.replace(/\.(mp4|webm)$/i, '') || `HANDFILM_${projectTitle}_4K_Master`;
      const targetName = `${baseName}${ext}`;

      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      playExportSuccessChime();
      setLastExportDownload({ url: downloadUrl, filename: targetName });
      setDownloadedFileName(targetName);
      setIsFinished(true);
      setIsExporting(false);

    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('aborted')) {
        setExportError('Render aborted by user.');
      } else {
        console.error('[CinemaExportStudio] 4K Master Render failed:', err);
        setExportError(err?.message || '4K Master video encoding pipeline failed.');
      }
      setIsExporting(false);
    }
  }, [
    activeSelection.totalShots,
    activeSelection.indices,
    projectTitle,
    frames,
    slides,
    currentSlideIndex,
    totalCount,
    selectionMode,
    rangeStart,
    rangeEnd,
    customListText,
    excludedIndices,
    targetFps,
    burnInTitles,
    customFilename,
    activeShotMediaMap,
    handleFrameRendered
  ]);

  // Export Premiere FCP 7 XML
  const handleExportPremiereXml = useCallback(() => {
    try {
      const projectData: AnthologyProject = {
        title: projectTitle,
        director: directorName,
        nodeLocation: 'DHAKA_01',
        aspectRatio: (aspectRatio as any) || '2.39:1',
        frames: selectedFrames,
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const xml = generatePremiereCapCutXml(projectData, {
        fps: xmlFps,
        width: dimensionInfo.width,
        height: dimensionInfo.height,
        aspectRatioName: dimensionInfo.aspectRatio,
        includeAudio: true,
        includeMarkers: includeXmlMarkers,
        projectTitle
      });

      const baseName = customFilename.trim().replace(/\.(xml|mp4|fcpxml)$/i, '') || `HANDFILM_${projectTitle}`;
      const filename = `${baseName}_Premiere_FCP7_${activeSelection.label}.xml`;

      downloadXmlBlob(xml, filename);
      playExportSuccessChime();
      setDownloadedFileName(filename);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[ExportXML Error]', err);
      setExportError(err?.message || 'Could not generate Premiere XML.');
    }
  }, [projectTitle, directorName, aspectRatio, selectedFrames, xmlFps, dimensionInfo, includeXmlMarkers, customFilename, activeSelection.label]);

  // Export DaVinci / CapCut FCPXML
  const handleExportFcpXml = useCallback(() => {
    try {
      const projectData: AnthologyProject = {
        title: projectTitle,
        director: directorName,
        nodeLocation: 'DHAKA_01',
        aspectRatio: (aspectRatio as any) || '2.39:1',
        frames: selectedFrames,
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const xml = generateFcpXml(projectData, {
        fps: xmlFps,
        width: dimensionInfo.width,
        height: dimensionInfo.height,
        aspectRatioName: dimensionInfo.aspectRatio,
        includeAudio: true,
        includeMarkers: includeXmlMarkers,
        projectTitle
      });

      const baseName = customFilename.trim().replace(/\.(xml|mp4|fcpxml)$/i, '') || `HANDFILM_${projectTitle}`;
      const filename = `${baseName}_DaVinci_FCPXML_${activeSelection.label}.fcpxml`;

      downloadXmlBlob(xml, filename);
      playExportSuccessChime();
      setDownloadedFileName(filename);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[ExportFcpXml Error]', err);
      setExportError(err?.message || 'Could not generate FCPXML.');
    }
  }, [projectTitle, directorName, aspectRatio, selectedFrames, xmlFps, dimensionInfo, includeXmlMarkers, customFilename, activeSelection.label]);

  // Export Printable Contact Sheet PDF
  const handleExportContactSheet = useCallback(() => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        return;
      }

      const gridCols = pdfColumns;
      const shotsHtml = selectedFrames.map((frame, i) => {
        const shotNumber = activeSelection.indices[i] !== undefined ? activeSelection.indices[i] + 1 : i + 1;
        const shotLabel = `SH${String(shotNumber).padStart(3, '0')}`;
        const titleEn = frame.title || `Shot ${shotNumber}`;
        const titleBn = frame.bengaliTitle || 'দৃশ্য ফ্রেম';
        const imgTag = frame.imageUrl
          ? `<img src="${frame.imageUrl}" style="width:100%;height:100%;object-fit:cover;" />`
          : `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:10px;">RAW PLATE</div>`;

        return `
          <div style="border:1px solid #333;background:#101118;padding:8px;border-radius:4px;">
            <div style="width:100%;height:100px;background:#050508;border:1px solid #222;overflow:hidden;position:relative;">
              ${imgTag}
              <div style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,0.8);color:#F5A623;padding:2px 4px;font-size:9px;font-weight:bold;">${shotLabel}</div>
            </div>
            <div style="font-size:11px;font-weight:bold;color:#F5A623;margin-top:6px;">${shotLabel} • ${titleBn}</div>
            <div style="font-size:10px;color:#eee;">${titleEn}</div>
            ${includePdfSpecs ? `<div style="font-size:8.5px;color:#777;margin-top:3px;">12.0s • 288F • 24.0 FPS • ARRI RAW</div>` : ''}
          </div>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${projectTitle} - Contact Sheet</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace; background: #07080c; color: #ededed; padding: 24px; margin: 0; }
              h1 { font-size: 20px; color: #F5A623; margin: 0 0 4px 0; }
              .meta { font-size: 11px; color: #888; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 8px; }
              .grid { display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 12px; }
              @media print {
                body { background: #fff !important; color: #000 !important; }
                h1 { color: #b37400 !important; }
                .meta { border-color: #ddd !important; }
              }
            </style>
          </head>
          <body>
            <h1>HANDFILM // ${projectTitle} // STORYBOARD CONTACT SHEET</h1>
            <div class="meta">Director: ${directorName} • ${activeSelection.totalShots} Shots Selected • Total Runtime: ${dynamicRuntime} • 24.0 FPS Master</div>
            <div class="grid">
              ${shotsHtml}
            </div>
            <script>
              setTimeout(() => { window.print(); }, 400);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      playExportSuccessChime();
      setIsFinished(true);
      setDownloadedFileName(`${projectTitle}_ContactSheet.pdf`);
    } catch (err: any) {
      console.error('[ContactSheet Error]', err);
      setExportError(err?.message || 'Could not generate Contact Sheet.');
    }
  }, [projectTitle, directorName, selectedFrames, activeSelection.indices, activeSelection.totalShots, dynamicRuntime, pdfColumns, includePdfSpecs]);

  // Direct download of Multi-Page Storyboard PDF document with full metadata & director notes
  const handleDownloadStoryboardPdf = useCallback(async () => {
    const targets = selectedFrames.length > 0 ? selectedFrames : (frames || []);
    if (targets.length === 0) {
      setExportError('No storyboard frames available to export.');
      return;
    }
    try {
      setIsExporting(true);
      setExportError(null);
      setPdfProgressPercent(5);
      setPdfProgressText('Initializing Storyboard Document Engine...');

      await downloadStoryboardPdf(targets, {
        projectTitle,
        directorName,
        aspectRatio,
        framesPerPage: pdfLayout,
        theme: pdfTheme,
        includeCoverPage: includePdfCover,
        includeIndexPage: includePdfIndex,
        includeSpecs: includePdfSpecs,
        includeAudio: includePdfAudio,
        includeNotes: includePdfNotes,
        includeBilingual: includePdfBilingual,
        onProgress: (percent, message) => {
          setPdfProgressPercent(percent);
          setPdfProgressText(message);
        }
      });

      playExportSuccessChime();
      setIsFinished(true);
      const layoutLabel =
        pdfLayout === 1
          ? 'Director_Bible'
          : pdfLayout === 2
          ? 'Dual_Shot'
          : `${pdfLayout}Up`;
      setDownloadedFileName(`${projectTitle}_Storyboard_${layoutLabel}.pdf`);
    } catch (err: any) {
      console.error('[PDF Download Error]', err);
      setExportError(err?.message || 'Could not download Storyboard PDF.');
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedFrames,
    frames,
    projectTitle,
    directorName,
    aspectRatio,
    pdfLayout,
    pdfTheme,
    includePdfCover,
    includePdfIndex,
    includePdfSpecs,
    includePdfAudio,
    includePdfNotes,
    includePdfBilingual
  ]);

  // Direct download of Individual Storyboard Frame as High-Resolution JPEG (1920x1080)
  const handleExportSingleFrameJpeg = useCallback(async () => {
    const safeFrames = frames || [];
    const targetFrame = safeFrames[previewShotIdx] || safeFrames[currentSlideIndex || 0] || selectedFrames[0];
    if (!targetFrame) {
      setExportError('No storyboard frame available to export as JPEG.');
      return;
    }
    try {
      setIsExporting(true);
      setExportError(null);
      await exportFrameAsJpeg(targetFrame, projectTitle, includeJpegSlate);
      playExportSuccessChime();
      const cleanEp = (targetFrame.epNumber || `SH${String((previewShotIdx || 0) + 1).padStart(3, '0')}`).replace(/[^a-zA-Z0-9_-]/g, '');
      setDownloadedFileName(`${projectTitle}_${cleanEp}_HiRes_1080p.jpg`);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[HiRes JPEG Export Error]', err);
      setExportError(err?.message || 'Could not export High-Resolution JPEG.');
    } finally {
      setIsExporting(false);
    }
  }, [frames, previewShotIdx, currentSlideIndex, selectedFrames, projectTitle, includeJpegSlate]);

  // Batch export selected storyboard frames as High-Resolution JPEGs (.zip)
  const handleExportSelectedFramesJpegZip = useCallback(async () => {
    const targets = selectedFrames.length > 0 ? selectedFrames : (frames || []);
    if (targets.length === 0) return;
    try {
      setIsExporting(true);
      setExportError(null);
      await exportFramesAsJpegZip(targets, projectTitle);
      playExportSuccessChime();
      setDownloadedFileName(`${projectTitle}_Storyboard_HiRes_JPEGs.zip`);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[Batch JPEG ZIP Error]', err);
      setExportError(err?.message || 'Could not export High-Resolution JPEGs ZIP.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFrames, frames, projectTitle]);

  // Export Full Lossless RAWX Backup (.rawx JSON)
  const handleExportRawxBackup = useCallback(async () => {
    try {
      await exportFullIdbBackup();
      playExportSuccessChime();
      setIsFinished(true);
      setDownloadedFileName(`HANDFILM_Studio_Archive_${new Date().toISOString().slice(0, 10)}.rawx`);
    } catch (err: any) {
      console.error('[Backup Error]', err);
      setExportError(err?.message || 'Could not export RAWX backup.');
    }
  }, []);

  // Export Director's Cut ZIP Bundle (CSV shot list, Fountain screenplay, project master JSON)
  const handleExportDirectorsCut = useCallback(async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const filename = await exportDirectorsCutBundle({
        projectTitle,
        directorName,
        aspectRatio,
        frames: selectedFrames.length > 0 ? selectedFrames : (frames || []),
        fps: xmlFps,
        customFilename: customFilename ? `${customFilename}_DirectorsCut` : undefined
      });
      playExportSuccessChime();
      setDownloadedFileName(filename);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[DirectorsCut Error]', err);
      setExportError(err?.message || 'Could not generate Director\'s Cut bundle.');
    } finally {
      setIsExporting(false);
    }
  }, [projectTitle, directorName, aspectRatio, selectedFrames, frames, xmlFps, customFilename]);

  // Export Production Package ZIP (frame assets, NLE JSON manifest, CMX 3600 EDL, FCP7 XML)
  const handleExportProductionPackage = useCallback(async () => {
    if (
      packageResolution === '4k_scope' &&
      !useLicenseStore.getState().requireProAccess('4K / 16-Bit Master Export')
    ) {
      return;
    }
    try {
      setIsExporting(true);
      setExportError(null);
      setPackageProgressPercent(0);
      setPackageProgressText('Initializing Production Package...');

      const filename = await exportProductionPackageZip({
        projectTitle,
        directorName,
        aspectRatio,
        frames: selectedFrames.length > 0 ? selectedFrames : (frames || []),
        slides,
        shotMediaMap: activeShotMediaMap,
        fps: xmlFps,
        customFilename: customFilename ? `${customFilename}_ProductionPackage` : undefined,
        burnInTitles: packageBurnInTitles,
        includeXmlEdl: packageIncludeXmlEdl,
        targetResolution: packageResolution,
        onProgress: (p) => {
          setPackageProgressPercent(p.percent);
          setPackageProgressText(p.stage);
        },
        abortSignal: abortControllerRef.current?.signal
      });

      playExportSuccessChime();
      setDownloadedFileName(filename);
      setIsFinished(true);
    } catch (err: any) {
      console.error('[ProductionPackage Error]', err);
      setExportError(err?.message || 'Could not generate Production Package ZIP.');
    } finally {
      setIsExporting(false);
    }
  }, [
    projectTitle,
    directorName,
    aspectRatio,
    selectedFrames,
    frames,
    slides,
    activeShotMediaMap,
    xmlFps,
    customFilename,
    packageBurnInTitles,
    packageIncludeXmlEdl,
    packageResolution
  ]);

  const handleAbortExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  }, []);

  // =========================================================================
  // CONDITIONAL RENDERING STRICTLY IN RETURN STATEMENT
  // =========================================================================
  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const modalNode = (
    <div 
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none font-sans overflow-hidden animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) {
          onClose();
        }
      }}
    >
      {/* Centered Modal Container with Subtle Fade-in & Upward Slide Animation */}
      <div 
        className="w-full max-w-5xl max-h-[92vh] bg-[#07080d]/95 backdrop-blur-3xl border border-[#F5A623]/45 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(245,166,35,0.12)] rounded-xl flex flex-col overflow-hidden relative font-mono text-zinc-300 animate-modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tactical Corner Accents */}
        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#F5A623]/70 pointer-events-none z-30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#F5A623]/70 pointer-events-none z-30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#F5A623]/70 pointer-events-none z-30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#F5A623]/70 pointer-events-none z-30 rounded-br-xl" />

        {/* STICKY HEADER WITH FORMAT TABS & CLOSE BUTTON */}
        <div className="sticky top-0 bg-[#08090e]/95 backdrop-blur-2xl border-b border-[#F5A623]/25 px-4 py-2.5 flex flex-col gap-2.5 z-20 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CinemaBadgeHeader
                icon={<Film className="w-4 h-4" strokeWidth={2.2} />}
                label="EXPORT STUDIO"
                accent="amber"
              />
              {exportPolicy.hasProOrTrial ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-black tracking-wider uppercase">
                  4K {targetFps}FPS READY
                </span>
              ) : (
                <CinemaToolHUD
                  title="UPGRADE 4K EXPORT"
                  en="Unlock watermark-free 4K 60fps cinema master exports."
                  bn="ওয়াটারমার্ক ছাড়াই 4K 60fps ভিডিও এক্সপোর্ট আনলক করতে চাপুন।"
                  accent="amber"
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={() => useLicenseStore.getState().requireProAccess('Watermark-Free 4K 60fps Export')}
                    className="cinema-tile cinema-tile-amber px-2.5 py-1 rounded text-[9px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    <span>720P PRO UPGRADE</span>
                  </button>
                </CinemaToolHUD>
              )}
            </div>

            <div className="flex items-center gap-2">
              <EditInAppStrip
                shotIndex={currentSlideIndex}
                frame={frames[currentSlideIndex]}
                variant="drawer"
              />

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111215] border border-[#26282E] text-[10px] font-black">
                <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                <span className="text-white tabular-nums">{dynamicRuntime}</span>
              </div>

              <CinemaToolHUD
                title="CLOSE EXPORT"
                en="Close the export studio window."
                bn="এক্সপোর্ট স্টুডিও উইন্ডোটি বন্ধ করতে এখানে চাপুন।"
                accent="crimson"
                side="bottom"
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExporting}
                  className="cinema-tile cinema-tile-crimson px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                  <span>CLOSE</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>

          {/* Unified Format Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1 bg-[#050609]/80 border border-[#1e1f2d] rounded-xl text-center backdrop-blur-md">
            {[
              { id: 'mp4' as const, label: 'MP4', Icon: Video, accent: 'amber' as const, en: 'Render native WebCodecs MP4 or transparent WebM master.', bn: 'সরাসরি 4K বা 1080p MP4 ভিডিও রেন্ডার ও ডাউনলোড করুন।' },
              { id: 'premiere' as const, label: 'PREMIERE', Icon: Film, accent: 'cyan' as const, en: 'Generate Adobe Premiere Pro & CapCut Desktop FCP7 XML.', bn: 'প্রিমিয়ার প্রো ও ক্যাপকাটের জন্য টাইমলাইন XML ফাইল তৈরি করুন।' },
              { id: 'fcpxml' as const, label: 'FCPXML', Icon: Scissors, accent: 'cyan' as const, en: 'Export Apple Final Cut & DaVinci Resolve FCPXML v1.10.', bn: 'ডাভিঞ্চি রিজলভ ও ফাইনাল কাটের জন্য FCPXML এক্সপোর্ট করুন।' },
              { id: 'package' as const, label: 'PKG ZIP', Icon: Package, accent: 'amber' as const, en: 'Bundle plates, manifest.json, XML and CMX 3600 EDL.', bn: 'সব ছবি, XML ও EDL একসাথে জিপ ফাইল হিসেবে ডাউনলোড করুন।' },
              { id: 'pdf' as const, label: 'PDF', Icon: FileText, accent: 'emerald' as const, en: 'Export publication-grade storyboard bible or contact sheet.', bn: 'স্টোরিবোর্ড ও ক্যামেরা নোটসহ প্রিন্ট-রেডি PDF বই তৈরি করুন।' },
              { id: 'directors_cut' as const, label: 'DIR CUT', Icon: Archive, accent: 'crimson' as const, en: 'Download shot CSV, Fountain script, and master JSON.', bn: 'শট লিস্ট CSV ও ফাউন্টেন স্ক্রিপ্টসহ ডিরেক্টরস কাট বান্ডেল নিন।' },
              { id: 'backup' as const, label: 'BACKUP', Icon: HardDriveDownload, accent: 'emerald' as const, en: 'Save lossless .rawx archive of all project slides and media.', bn: 'পুরো প্রজেক্ট ও মিডিয়া অফলাইনে ব্যাকআপ রাখতে .rawx সেভ করুন।' },
            ].map((t) => {
              const TabIcon = t.Icon;
              const isTabActive = activeTab === t.id;
              return (
                <CinemaToolHUD key={t.id} title={t.label} en={t.en} bn={t.bn} accent={t.accent} side="bottom" blockWrapper>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setActiveTab(t.id)}
                    data-active={isTabActive ? 'true' : 'false'}
                    className={`cinema-tile cinema-tile-${t.accent} w-full min-h-[44px] py-1.5 px-2 text-[10px] font-black tracking-wider uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1.5`}
                  >
                    <TabIcon className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                    <span className="truncate">{t.label}</span>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        </div>

        {/* SCROLLABLE SETTINGS BODY */}
        <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3">
          {/* SHARED DYNAMIC SHOT SEQUENCE MATRIX */}
          <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CinemaBadgeHeader
                icon={<SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />}
                label="SHOT RANGE"
                accent="amber"
              />
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-300 tabular-nums">
                <span className="text-white">{activeSelection.totalShots} SHOTS</span>
                <span className="text-[#F5A623]">{activeSelection.totalFrames.toLocaleString()}F</span>
                <span className="text-cyan-300">{dynamicRuntime}</span>
                {excludedIndices.length > 0 && (
                  <span className="text-rose-400">-{excludedIndices.length}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#050609] border border-[#1d1e2b] rounded-lg">
              {[
                { id: 'all' as const, label: `ALL (${totalCount})`, en: 'Include every shot in the sequence.', bn: 'সিকোয়েন্সের সব শট একসাথে এক্সপোর্ট করতে চাপুন।' },
                { id: 'current' as const, label: `SH${String(currentSlideIndex + 1).padStart(3, '0')}`, en: 'Export only the currently selected shot.', bn: 'শুধুমাত্র বর্তমান নির্বাচিত শটটি এক্সপোর্ট করুন।' },
                { id: 'range' as const, label: 'RANGE', en: 'Select a continuous start-to-end shot range.', bn: 'শুরু থেকে শেষ নির্দিষ্ট শট রেঞ্জ বাছাই করতে চাপুন।' },
                { id: 'custom' as const, label: 'MANUAL', en: 'Type comma-separated shot numbers and ranges.', bn: 'কমা দিয়ে নির্দিষ্ট শট নম্বর লিখে বাছাই করুন।' },
              ].map((m) => (
                <CinemaToolHUD key={m.id} title={m.label} en={m.en} bn={m.bn} accent="amber" side="top" blockWrapper>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setSelectionMode(m.id)}
                    data-active={selectionMode === m.id ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber w-full min-h-[40px] py-1.5 px-2 text-[10px] font-black tracking-wider uppercase rounded cursor-pointer text-center"
                  >
                    <span>{m.label}</span>
                  </button>
                </CinemaToolHUD>
              ))}
            </div>

            {selectionMode === 'range' && (
              <div className="p-2.5 rounded-lg bg-[#101118] border border-[#202230] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400">FROM</span>
                    <input
                      type="number"
                      min="1"
                      max={totalCount}
                      disabled={isExporting}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Math.max(1, Math.min(totalCount, parseInt(e.target.value) || 1)))}
                      className="w-16 bg-[#07080c] border border-[#2d2f42] rounded px-2 py-1 text-sm font-bold text-[#F5A623] text-center focus:border-[#F5A623] outline-none"
                    />
                  </div>
                  <span className="text-zinc-500 font-bold">→</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black tracking-wider uppercase text-zinc-400">TO</span>
                    <input
                      type="number"
                      min={rangeStart}
                      max={totalCount}
                      disabled={isExporting}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Math.max(rangeStart, Math.min(totalCount, parseInt(e.target.value) || rangeStart)))}
                      className="w-16 bg-[#07080c] border border-[#2d2f42] rounded px-2 py-1 text-sm font-bold text-[#F5A623] text-center focus:border-[#F5A623] outline-none"
                    />
                  </div>
                </div>
                <span className="text-[10px] font-black text-white uppercase tabular-nums">
                  {Math.max(0, rangeEnd - rangeStart + 1)} SHOTS
                </span>
              </div>
            )}

            {selectionMode === 'custom' && (
              <div className="p-2.5 rounded-lg bg-[#101118] border border-[#202230]">
                <input
                  type="text"
                  disabled={isExporting}
                  value={customListText}
                  onChange={(e) => setCustomListText(e.target.value)}
                  placeholder="1, 3, 5-8, 12"
                  className="w-full bg-[#07080c] border border-[#2d2f42] rounded px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-[#F5A623] outline-none"
                />
              </div>
            )}

            {/* Visual Thumbnail Strip with Exclusion Toggles */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Visual Shot Strip (Click <span className="text-rose-400 font-bold">[ × ]</span> to exclude from sequence)</span>
                {excludedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcludedIndices([])}
                    className="text-[#F5A623] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Exclusions</span>
                  </button>
                )}
              </div>

              <div 
                ref={shotStripScrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-zinc-700"
              >
                {candidateSelection.indices.map((shotIdx) => {
                  const isExcluded = excludedIndices.includes(shotIdx);
                  const isPreviewing = previewShotIdx === shotIdx;
                  const slide = slides[shotIdx];
                  const frame = frames[shotIdx];
                  const shotNumber = shotIdx + 1;
                  const shotLabel = `SH${String(shotNumber).padStart(3, '0')}`;
                  const title = slide?.titleEn || frame?.title || `Shot ${shotNumber}`;
                  const mediaEntry = resolveShotMediaEntry(activeShotMediaMap, frame, slide, shotIdx);
                  const rawMediaUrl = mediaEntry?.url || slide?.remoteUrl || frame?.imageUrl || '';
                  const isVideoThumb = mediaEntry
                    ? mediaEntry.type === 'video'
                    : isVideoSourceUrl(rawMediaUrl, {
                        isVideo: Boolean(frame?.isVideo || slide?.isVideo),
                        mimeType: (mediaEntry as any)?.mimeType,
                        name: (mediaEntry as any)?.name
                      });

                  return (
                    <div
                      key={shotIdx}
                      onClick={() => !isExporting && setPreviewShotIdx(shotIdx)}
                      className={`relative shrink-0 w-32 rounded-lg border overflow-hidden transition-all duration-300 hover:scale-105 hover:border-amber-500 hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] hover:z-10 cursor-crosshair group ${
                        isExcluded
                          ? 'bg-[#120a0d] border-rose-900/60 opacity-50'
                          : isPreviewing
                            ? 'bg-[#191812] border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.4)] ring-1 ring-amber-400'
                            : 'bg-[#12131c] border-[#292b3e]'
                      }`}
                      title={isExcluded ? 'Shot excluded from render' : 'Click to preview shot in monitor'}
                    >
                      <div className="relative aspect-video w-full bg-[#090a10] overflow-hidden">
                        <ShotMediaThumbnail
                          shotIndex={shotIdx}
                          shotId={frame?.id ?? slide?.id}
                          mediaUrl={rawMediaUrl}
                          thumbnailUrl={frame?.thumbnailUrl || frame?.thumbnail || slide?.thumbnailUrl}
                          isVideo={isVideoThumb}
                          mimeType={mediaEntry?.mimeType}
                          name={mediaEntry?.name}
                          title={title}
                          bengaliTitle={frame?.bengaliTitle || slide?.titleBn}
                          shotType={frame?.shotType}
                          titleAlign={titleAlign}
                          lutFilterCss={getLutFilterCSS(
                            (frame as any)?.lutFilter ||
                              (slide as any)?.lutFilter ||
                              (projectShots?.[shotIdx] as any)?.lutFilter ||
                              storeActiveLut ||
                              'cinematic',
                            (frame as any)?.adjustments || (projectShots?.[shotIdx] as any)?.adjustments
                          )}
                          mediaClassName={`w-full h-full object-cover ${isExcluded ? 'grayscale' : ''}`}
                          alt={shotLabel}
                          compactProcedural
                        />

                        <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-white z-[2]">
                          {shotLabel}
                        </div>

                        {isPreviewing && !isExcluded && (
                          <div className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-[#F5A623] text-black text-[7.5px] font-extrabold shadow">
                            PREVIEW
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExcludeShot(shotIdx);
                          }}
                          className={`absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer z-10 ${
                            isExcluded
                              ? 'bg-rose-600 text-white'
                              : 'bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isExcluded ? '+' : '×'}
                        </button>

                        {isExcluded && (
                          <div className="absolute inset-0 bg-rose-950/60 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-rose-300">EXCLUDED</span>
                          </div>
                        )}
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        <div className={`text-[9px] font-bold truncate ${isPreviewing && !isExcluded ? 'text-[#F5A623]' : 'text-zinc-200'}`} title={title}>
                          {title}
                        </div>
                        <div className="flex items-center justify-between text-[7.5px] text-zinc-400 font-mono">
                          <span>12.0s • 288F</span>
                          <span className={isExcluded ? 'text-rose-400' : isPreviewing ? 'text-[#F5A623] font-bold' : 'text-zinc-400'}>
                            {isExcluded ? 'SKIP' : isPreviewing ? 'MONITOR' : 'ACTIVE'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SELECTED FRAME PRE-EXPORT LUT LOOK VERIFICATION WINDOW (VISIBLE ON ALL TABS) */}
          {!isExporting && (
            <ExportLutPreviewCard
              shotIndex={activeMonitorShotIdx}
              frame={activeMonitorFrame}
              slide={activeMonitorSlide}
              storeShot={activeMonitorStoreShot}
              shotMediaMap={activeShotMediaMap}
              fallbackLut={storeActiveLut}
              aspectRatio={aspectRatio}
              bypassLut={bypassPreviewLut}
              onToggleBypassLut={() => setBypassPreviewLut((v) => !v)}
              titleAlign={titleAlign}
            />
          )}

          {/* ============================================================== */}
          {/* TAB-SPECIFIC PANELS                                            */}
          {/* ============================================================== */}

          {/* TAB 1: MP4 VIDEO RENDER ENGINE */}
          {activeTab === 'mp4' && (
            <div className="space-y-3 animate-in fade-in duration-150">

              {/* DEDICATED CINEMA FRAME PREVIEW & RENDER MONITOR */}
              <div className="p-3 rounded-xl bg-[#08090e] border border-[#F5A623]/35 shadow-xl space-y-2.5 relative">
                {/* Monitor Top Control / Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f2130] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-2 flex-wrap">
                        <span>{isExporting ? 'LIVE RENDER ENCODER FEED' : 'DEDICATED FRAME PREVIEW MONITOR'}</span>
                        {isExporting ? (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-500/20 text-[#F5A623] border border-amber-500/40 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            REC • {targetFps} FPS
                          </span>
                        ) : (
                          <>
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              STANDBY PREVIEW
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/35">
                              {bypassPreviewLut ? 'LUT BYPASSED' : `LUT: ${formatLutPresetLabel(activeMonitorLut)}`}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[9.5px] text-zinc-400 font-sans">
                        {isExporting 
                          ? `Blitting WebCodecs hardware accelerated render stream (Shot ${telemetry.currentShotIndex}/${telemetry.totalShots})` 
                          : `Visualizing Shot SH${String((previewShotIdx || 0) + 1).padStart(3, '0')} frame with ${formatLutPresetLabel(activeMonitorLut)} LUT & optical overlays`}
                      </div>
                    </div>
                  </div>

                  {/* Quick Shot Selection Dropdown (When Idle) */}
                  {!isExporting && activeSelection.indices.length > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[10px] text-zinc-400">Preview Shot:</span>
                      <select
                        value={previewShotIdx}
                        onChange={(e) => setPreviewShotIdx(Number(e.target.value))}
                        className="bg-[#12131e] border border-[#2d2f44] text-[#F5A623] text-xs font-bold rounded px-2.5 py-1 outline-none cursor-pointer focus:border-[#F5A623]"
                      >
                        {activeSelection.indices.map((idx) => {
                          const num = idx + 1;
                          const slide = slides[idx];
                          const frame = frames[idx];
                          const title = slide?.titleEn || frame?.title || `Shot ${num}`;
                          return (
                            <option key={idx} value={idx}>
                              SH{String(num).padStart(3, '0')}: {title.slice(0, 24)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Render Telemetry Badge (When Exporting) */}
                  {isExporting && (
                    <div className="text-[10.5px] font-mono tabular-nums text-[#F5A623] bg-black/75 px-2.5 py-1 rounded border border-[#F5A623]/40 whitespace-nowrap">
                      FRAME {telemetry.currentFrameNum.toLocaleString()} / {telemetry.totalFrames.toLocaleString()} · {telemetry.percent}% · ELAPSED {formatElapsedClock(elapsedSec)}
                    </div>
                  )}
                </div>

                {/* Dedicated Cinema Canvas Monitor Viewport */}
                <div className="relative w-full bg-[#030406] rounded-lg overflow-hidden border border-[#F5A623]/25 flex items-center justify-center shadow-2xl p-1">
                  {/* Dedicated Canvas Element */}
                  <canvas
                    ref={dedicatedCanvasRef}
                    width={640}
                    height={360}
                    className="w-full max-w-[560px] max-h-[260px] h-auto aspect-video object-contain mx-auto block rounded shadow"
                  />

                  {/* Tactical Watermark HUD Badges on Canvas */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                    <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-white/10 text-[8.5px] font-mono text-zinc-300">
                      {dimensionInfo.name}
                    </div>
                    {isExporting ? (
                      <div className="px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-500/50 text-[8.5px] font-mono font-bold text-[#F5A623] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        {telemetry.fps.toFixed(1)} FPS
                      </div>
                    ) : (
                      <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-white/10 text-[8.5px] font-mono text-emerald-400">
                        {targetFps}.00 FPS DCI
                      </div>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 pointer-events-none">
                    <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs border border-white/10 text-[8.5px] font-mono text-zinc-400">
                      12.0s • 288F PER SHOT
                    </div>
                  </div>

                  {/* Live Render Telemetry Overlay during WebCodecs Export */}
                  {isExporting && (
                    <div className="absolute bottom-3 left-3 right-3 p-2 rounded bg-black/85 backdrop-blur-sm border border-[#F5A623]/35 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[10px] font-mono tabular-nums text-zinc-200 pointer-events-none shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-[#F5A623] font-bold">
                          SHOT {String(telemetry.currentShotIndex).padStart(3, '0')}/{String(telemetry.totalShots).padStart(3, '0')}
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span>FRAME {telemetry.currentFrameNum.toLocaleString()} / {telemetry.totalFrames.toLocaleString()}</span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-cyan-400">{telemetry.percent}%</span>
                      </div>
                      <div className="text-zinc-300 text-[9.5px] font-mono tabular-nums">
                        ELAPSED {formatElapsedClock(elapsedSec)} · {telemetry.statusText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pre-Export Asset & Title Verification Summary */}
              <div className="p-3 rounded-xl bg-[#090a0f] border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${mediaReadiness.proceduralSlateCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-200">
                      Pre-Export Verification Summary
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono tabular-nums">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
                      {mediaReadiness.videoReadyCount}/{mediaReadiness.totalShots} VIDEO CLIPS
                    </span>
                    {mediaReadiness.imageOnlyCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold">
                        {mediaReadiness.imageOnlyCount} STILL PLATES
                      </span>
                    )}
                    {mediaReadiness.proceduralSlateCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                        {mediaReadiness.proceduralSlateCount} PROCEDURAL SLATES
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/15 text-[#F5A623] font-bold uppercase">
                      TITLE: {activeMonitorPresetConfig.presetName} // {activeMonitorPresetConfig.layoutMode}
                    </span>
                  </div>
                </div>
                {mediaReadiness.perShot.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {mediaReadiness.perShot.slice(0, 24).map((item) => (
                      <button
                        key={item.shotIndex}
                        type="button"
                        onClick={() => setPreviewShotIdx(item.shotIndex)}
                        title={`SH${String(item.shotIndex + 1).padStart(3, '0')}: ${item.title} (${item.mediaKind.toUpperCase()} • ${item.presetName})`}
                        className={`shrink-0 px-2 py-1 rounded border text-[9px] font-mono tabular-nums transition-colors cursor-pointer ${
                          activeMonitorShotIdx === item.shotIndex
                            ? 'bg-[#181926] border-[#F5A623] text-white'
                            : 'bg-[#101118] border-white/10 text-zinc-400 hover:border-white/25'
                        }`}
                      >
                        <span className="font-bold">SH{String(item.shotIndex + 1).padStart(2, '0')}</span>
                        <span className="mx-1 text-zinc-600">·</span>
                        <span className={
                          item.mediaKind === 'video'
                            ? 'text-emerald-400 font-bold'
                            : item.mediaKind === 'image'
                              ? 'text-sky-400 font-bold'
                              : 'text-amber-400'
                        }>
                          {item.mediaKind === 'video' ? 'VID' : item.mediaKind === 'image' ? 'IMG' : 'SLATE'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Resolution & Aspect */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-2">
                  <CinemaBadgeHeader
                    icon={<Maximize2 className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="RESOLUTION"
                    accent="amber"
                  />
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { id: '720p_free' as const, label: '720P FREE', badge: '16:9', accent: 'amber' as const, pro: false, en: '1280×720 HD export on Free Tier.', bn: 'ফ্রি ভার্সনে স্ট্যান্ডার্ড ৭২০পি এইচডি ভিডিও রেন্ডার করুন।' },
                      { id: '4k_scope' as const, label: '4K SCOPE', badge: '2.39:1', accent: 'amber' as const, pro: true, en: '3840×1608 theatrical scope watermark-free.', bn: 'সিনেমার ২.৩৯:১ স্কোপ রেশিওতে ৪কে মাস্টার এক্সপোর্ট করুন।' },
                      { id: '4k_standard' as const, label: '4K UHD', badge: '16:9', accent: 'amber' as const, pro: true, en: '3840×2160 full UHD widescreen master.', bn: 'ফুল ১৬:৯ স্ক্রিনে ৪কে আল্ট্রা এইচডি ভিডিও রেন্ডার করুন।' },
                      { id: '1080p_scope' as const, label: '1080P SCOPE', badge: '2.39:1', accent: 'emerald' as const, pro: true, en: '1920×804 fast theatrical scope preview.', bn: 'দ্রুত ১০৮০পি সিনেম্যাটিক স্কোপ প্রিভিউ রেন্ডার করুন।' },
                      { id: '9_16_vertical' as const, label: '9:16 REEL', badge: 'REELS', accent: 'cyan' as const, pro: true, en: '1080×1920 vertical social cut safe frame.', bn: 'রিলস, শর্টস ও টিকটকের জন্য ৯:১৬ ভার্টিকাল এক্সপোর্ট করুন।' },
                    ].map((res) => (
                      <CinemaToolHUD key={res.id} title={res.label} en={res.en} bn={res.bn} accent={res.accent} side="right" blockWrapper>
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={() => {
                            if (res.pro && !useLicenseStore.getState().requireProAccess('4K / Pro Master Export')) return;
                            setResolutionPreset(res.id);
                          }}
                          data-active={resolutionPreset === res.id ? 'true' : 'false'}
                          className={`cinema-tile cinema-tile-${res.accent} w-full min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer`}
                        >
                          <span className="flex items-center gap-1.5">
                            {res.id === '9_16_vertical' ? <Smartphone className="w-3.5 h-3.5 cinema-tile-icon" /> : <Maximize2 className="w-3.5 h-3.5 cinema-tile-icon" />}
                            <span>{res.label}</span>
                          </span>
                          <span className="text-[9px] font-mono opacity-80">{res.badge}</span>
                        </button>
                      </CinemaToolHUD>
                    ))}
                  </div>
                </div>

                {/* Bitrate & Frame Rate */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-2">
                  <CinemaBadgeHeader
                    icon={<Cpu className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="BITRATE & FPS"
                    accent="cyan"
                  />
                  <div className="space-y-1.5">
                    {[
                      { id: 'proxy' as const, label: 'PROXY', spec: '12 MBPS', en: 'Lightweight fast review encode.', bn: 'দ্রুত প্রিভিউ দেখার জন্য হালকা ১২ এমবিপিএস ফাইল তৈরি করুন।' },
                      { id: 'broadcast' as const, label: 'BROADCAST', spec: '30 MBPS', en: 'Standard High Profile H.264 stream.', bn: 'সোশ্যাল মিডিয়া ও টিভির জন্য ৩০ এমবিপিএস হাই-প্রোফাইল।' },
                      { id: 'master' as const, label: 'MASTER', spec: '60 MBPS', en: 'Pristine DCI archival cinema quality.', bn: 'সর্বোচ্চ ডিটেইলসহ ৬০ এমবিপিএস মাস্টার কোয়ালিটি রেন্ডার।' },
                    ].map((bp) => (
                      <CinemaToolHUD key={bp.id} title={bp.label} en={bp.en} bn={bp.bn} accent="cyan" side="top" blockWrapper>
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={() => setBitrateProfile(bp.id)}
                          data-active={bitrateProfile === bp.id ? 'true' : 'false'}
                          className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer"
                        >
                          <span>{bp.label}</span>
                          <span className="text-[9px] font-mono opacity-80">{bp.spec}</span>
                        </button>
                      </CinemaToolHUD>
                    ))}
                  </div>

                  <div className="pt-1.5 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-1.5">
                      {([24, 30, 60] as const).map((fpsVal) => (
                        <CinemaToolHUD
                          key={fpsVal}
                          title={`${fpsVal} FPS`}
                          en={`Render output timeline at ${fpsVal} frames per second.`}
                          bn={`ভিডিও ফ্রেম রেট প্রতি সেকেন্ডে ${fpsVal} FPS সেট করুন।`}
                          accent="amber"
                          side="top"
                          blockWrapper
                        >
                          <button
                            type="button"
                            disabled={isExporting}
                            onClick={() => {
                              if (fpsVal === 60 && !useLicenseStore.getState().requireProAccess('60 FPS Smooth Cinema Export')) {
                                return;
                              }
                              setTargetFps(fpsVal);
                            }}
                            data-active={targetFps === fpsVal ? 'true' : 'false'}
                            className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-1.5 rounded text-[10px] font-black uppercase cursor-pointer"
                          >
                            <span>{fpsVal} FPS</span>
                          </button>
                        </CinemaToolHUD>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Composite Layers */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-2">
                  <CinemaBadgeHeader
                    icon={<Layers className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="LAYERS"
                    accent="emerald"
                  />
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { active: burnInTitles, onClick: () => setBurnInTitles((b) => !b), label: 'BURN TITLES', badge: burnInTitles ? 'ON' : 'OFF', accent: 'amber' as const, en: 'Burn kinetic Bangla & English titles directly into video.', bn: 'ভিডিওর ওপর বাংলা ও ইংরেজি টাইটেল স্থায়ীভাবে বসাতে অন করুন।' },
                      { active: simulateFlare, onClick: () => setSimulateFlare((f) => !f), label: 'OPTIC FLARE', badge: simulateFlare ? 'ON' : 'OFF', accent: 'amber' as const, en: 'Composite horizontal anamorphic lens flare.', bn: 'লেন্সে সিনেম্যাটিক অ্যানামরফিক ফ্লেয়ার আলো যোগ করুন।' },
                      { active: includeAudio, onClick: () => setIncludeAudio((a) => !a), label: 'MASTER AUDIO', badge: includeAudio ? 'ON' : 'OFF', accent: 'emerald' as const, en: 'Mux 320kbps AAC master audio bus into MP4.', bn: 'ভিডিওর সাথে মাস্টার অডিও ও সাউন্ড ইফেক্ট যুক্ত করুন।' },
                      {
                        active: transparentAlpha,
                        onClick: () => {
                          if (!transparentAlpha && !useLicenseStore.getState().requireProAccess('Transparent Alpha Export')) return;
                          setTransparentAlpha((v) => !v);
                        },
                        label: 'ALPHA WEBM',
                        badge: transparentAlpha ? 'ON' : 'OFF',
                        accent: 'cyan' as const,
                        en: 'Export VP9 WebM with transparent alpha background.',
                        bn: 'ট্রান্সপারেন্ট ব্যাকগ্রাউন্ডসহ VP9 WebM আলফা এক্সপোর্ট করুন।'
                      },
                    ].map((layer) => (
                      <CinemaToolHUD key={layer.label} title={layer.label} en={layer.en} bn={layer.bn} accent={layer.accent} side="left" blockWrapper>
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={layer.onClick}
                          data-active={layer.active ? 'true' : 'false'}
                          className={`cinema-tile cinema-tile-${layer.accent} w-full min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[10px] font-black tracking-wider uppercase cursor-pointer`}
                        >
                          <span>{layer.label}</span>
                          <span className="text-[9px] font-mono">{layer.badge}</span>
                        </button>
                      </CinemaToolHUD>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREMIERE PRO FCP 7 XML */}
          {activeTab === 'premiere' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<Film className="w-4 h-4" strokeWidth={2.2} />}
                label="PREMIERE XML"
                accent="amber"
                rightSlot={<span className="text-[10px] font-black text-white uppercase">XMEML V5 · 24 FPS · 3840×1608</span>}
              />
            </div>
          )}

          {/* TAB 3: CAPCUT / DAVINCI FCPXML */}
          {activeTab === 'fcpxml' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<Scissors className="w-4 h-4" strokeWidth={2.2} />}
                label="DAVINCI FCPXML"
                accent="cyan"
                rightSlot={<span className="text-[10px] font-black text-cyan-300 uppercase">V1.10 · SMPTE · 4K</span>}
              />
            </div>
          )}

          {/* TAB 4: PRODUCTION PACKAGE (ZIP) */}
          {activeTab === 'package' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<Package className="w-4 h-4" strokeWidth={2.2} />}
                label="PRODUCTION PKG"
                accent="amber"
                rightSlot={<span className="text-[10px] font-black text-[#F5A623] uppercase">ZIP · XML · EDL · PLATES</span>}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex gap-1.5">
                  <CinemaToolHUD title="1080P SCOPE" en="Export 1920×804 scope plate assets." bn="১০৮০পি স্কোপ ফরম্যাটে ইমেজ প্লেট সেভ করুন।" accent="amber" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => setPackageResolution('1080p_scope')}
                      data-active={packageResolution === '1080p_scope' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-1.5 px-2 rounded text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>1080P SCOPE</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="4K SCOPE" en="Export 3840×1608 4K master plates (PRO)." bn="৪কে স্কোপ ফরম্যাটে হাই-রেজোলিউশন প্লেট সেভ করুন।" accent="amber" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => {
                        if (!useLicenseStore.getState().requireProAccess('4K / 16-Bit Master Export')) return;
                        setPackageResolution('4k_scope');
                      }}
                      data-active={packageResolution === '4k_scope' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-1.5 px-2 rounded text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>4K SCOPE</span>
                    </button>
                  </CinemaToolHUD>
                </div>

                <CinemaToolHUD title="BURN TITLES" en="Render bilingual titles onto exported image plates." bn="ছবির প্লেটের ওপর টাইটেল বসাতে অন করুন।" accent="cyan" side="top" blockWrapper>
                  <button
                    type="button"
                    onClick={() => setPackageBurnInTitles((v) => !v)}
                    data-active={packageBurnInTitles ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-3 rounded text-[10px] font-black uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span>BURN TITLES</span>
                    <span>{packageBurnInTitles ? 'ON' : 'OFF'}</span>
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD title="XML & EDL" en="Include sequence.xml & CMX 3600 EDL files." bn="প্রিমিয়ার XML ও EDL ফাইল বান্ডেলে যুক্ত করুন।" accent="emerald" side="top" blockWrapper>
                  <button
                    type="button"
                    onClick={() => setPackageIncludeXmlEdl((v) => !v)}
                    data-active={packageIncludeXmlEdl ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-3 rounded text-[10px] font-black uppercase flex items-center justify-between cursor-pointer"
                  >
                    <span>XML + EDL</span>
                    <span>{packageIncludeXmlEdl ? 'ON' : 'OFF'}</span>
                  </button>
                </CinemaToolHUD>
              </div>

              {isExporting && activeTab === 'package' && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#F5A623] font-bold">{packageProgressText}</span>
                    <span className="text-white font-bold">{packageProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-[#2a2c3d]">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] via-[#F5A623] to-[#fbbf24] rounded-full transition-all duration-150"
                      style={{ width: `${Math.max(2, packageProgressPercent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MULTI-PAGE STORYBOARD PDF */}
          {activeTab === 'pdf' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<BookOpen className="w-4 h-4" strokeWidth={2.2} />}
                label="PDF BIBLE"
                accent="amber"
                rightSlot={<span className="text-[10px] font-black text-[#F5A623] uppercase tabular-nums">~{estimatedPdfPages} PAGES</span>}
              />

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { count: 1 as const, label: '1 SHOT BIBLE', tag: 'BIBLE', en: 'Full page per shot with notes and optics.', bn: 'প্রতি পেজে ১টি বড় শট ও বিস্তারিত ডিরেক্টর নোট রাখুন।' },
                  { count: 2 as const, label: '2 SHOT DUAL', tag: 'DUAL', en: 'Two stacked widescreen cards per page.', bn: 'প্রতি পেজে ২টি শট পাশাপাশি ও নিচে সাজিয়ে প্রিন্ট করুন।' },
                  { count: 4 as const, label: '4 SHOT 2×2', tag: '2×2', en: 'Balanced 2×2 contact sheet grid.', bn: 'প্রতি পেজে ২×২ গ্রিডে ৪টি শট একসাথে দেখুন।' },
                  { count: 6 as const, label: '6 SHOT 3×2', tag: '3×2', en: 'High-density 3×2 crew call sheet.', bn: 'প্রতি পেজে ৩×২ গ্রিডে ৬টি শট দ্রুত রেফারেন্সের জন্য রাখুন।' },
                ].map((ly) => (
                  <CinemaToolHUD key={ly.count} title={ly.label} en={ly.en} bn={ly.bn} accent="amber" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => setPdfLayout(ly.count)}
                      data-active={pdfLayout === ly.count ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[52px] px-3 py-2 rounded-lg flex items-center justify-between text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 cinema-tile-icon" />
                        <span>{ly.label}</span>
                      </span>
                      <span className="text-[9px] font-mono opacity-80">{ly.tag}</span>
                    </button>
                  </CinemaToolHUD>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="flex gap-1.5">
                  <CinemaToolHUD title="PRINT THEME" en="Crisp white paper background for ink-saving print." bn="প্রিন্ট করার জন্য সাদা কাগজের পরিষ্কার থিম বাছুন।" accent="cyan" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => setPdfTheme('print')}
                      data-active={pdfTheme === 'print' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan w-full min-h-[44px] px-2 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>PRINT</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="OBSIDIAN PDF" en="Dark cinema pitch-deck OLED aesthetic." bn="প্রেজেন্টেশনের জন্য ডার্ক ওএলইডি সিনেম্যাটিক থিম বাছুন।" accent="amber" side="top" blockWrapper>
                    <button
                      type="button"
                      onClick={() => setPdfTheme('dark')}
                      data-active={pdfTheme === 'dark' ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                    >
                      <span>OBSIDIAN</span>
                    </button>
                  </CinemaToolHUD>
                </div>

                <div className="md:col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { checked: includePdfCover, toggle: () => setIncludePdfCover((v) => !v), label: 'COVER', en: 'Include executive cover page.', bn: 'শুরুতে একটি প্রোডাকশন কভার পেজ যুক্ত করুন।' },
                    { checked: includePdfIndex, toggle: () => setIncludePdfIndex((v) => !v), label: 'INDEX', en: 'Include shot index with SMPTE timecodes.', bn: 'শট ইন্ডেক্স ও টাইমকোড তালিকা যুক্ত করুন।' },
                    { checked: includePdfSpecs, toggle: () => setIncludePdfSpecs((v) => !v), label: 'OPTICS', en: 'Include lens, aperture, and LUT metadata.', bn: 'লেন্স, অ্যাপারচার ও LUT তথ্য যুক্ত করুন।' },
                    { checked: includePdfNotes, toggle: () => setIncludePdfNotes((v) => !v), label: 'NOTES', en: 'Include director blocking notes.', bn: 'ডিরেক্টরের ব্লকিং ও ক্যামেরা নোট যুক্ত করুন।' },
                    { checked: includePdfAudio, toggle: () => setIncludePdfAudio((v) => !v), label: 'AUDIO', en: 'Include dialogue and sound cues.', bn: 'সংলাপ ও সাউন্ড কিউ নোট যুক্ত করুন।' },
                    { checked: includePdfBilingual, toggle: () => setIncludePdfBilingual((v) => !v), label: 'BILINGUAL', en: 'Include Bengali and English dual titles.', bn: 'বাংলা ও ইংরেজি দ্বিভাষিক টাইটেল যুক্ত করুন।' },
                  ].map((opt) => (
                    <CinemaToolHUD key={opt.label} title={opt.label} en={opt.en} bn={opt.bn} accent="emerald" side="top" blockWrapper>
                      <button
                        type="button"
                        onClick={opt.toggle}
                        data-active={opt.checked ? 'true' : 'false'}
                        className="cinema-tile cinema-tile-emerald w-full min-h-[44px] px-1.5 rounded-lg text-[9.5px] font-black uppercase cursor-pointer"
                      >
                        <span>{opt.label}</span>
                      </button>
                    </CinemaToolHUD>
                  ))}
                </div>
              </div>

              {isExporting && activeTab === 'pdf' && (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#F5A623] font-bold">{pdfProgressText}</span>
                    <span className="text-white font-bold">{pdfProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-[#2a2c3d]">
                    <div
                      className="h-full bg-gradient-to-r from-[#d4af37] via-[#F5A623] to-[#fbbf24] rounded-full transition-all duration-150"
                      style={{ width: `${Math.max(4, pdfProgressPercent)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <CinemaToolHUD title="JPEG SLATE" en="Burn camera slate bar into exported JPEG frames." bn="ডাউনলোড করা JPEG ছবিতে ক্যামেরা স্লেট তথ্য যুক্ত করুন।" accent="cyan" side="top">
                  <button
                    type="button"
                    onClick={() => setIncludeJpegSlate((v) => !v)}
                    data-active={includeJpegSlate ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan min-h-[44px] px-3 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                  >
                    <span>SLATE {includeJpegSlate ? 'ON' : 'OFF'}</span>
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="FRAME JPEG" en="Export current preview shot as 1080p JPEG." bn="বর্তমান নির্বাচিত শটটি হাই-রেজোলিউশন JPEG ছবি হিসেবে সেভ করুন।" accent="cyan" side="top">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSingleFrameJpeg}
                    className="cinema-tile cinema-tile-cyan min-h-[44px] px-3.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>SH{String((previewShotIdx || 0) + 1).padStart(3, '0')} JPG</span>
                  </button>
                </CinemaToolHUD>
                <CinemaToolHUD title="BATCH JPEGS" en="Export all active shots as JPEG archive ZIP." bn="সবগুলো শটের JPEG ছবি একসাথে ZIP ফাইল করে নিন।" accent="amber" side="top">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSelectedFramesJpegZip}
                    className="cinema-tile cinema-tile-amber min-h-[44px] px-3.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 cinema-tile-icon" />
                    <span>ZIP ({activeSelection.totalShots})</span>
                  </button>
                </CinemaToolHUD>
              </div>
            </div>
          )}

          {/* TAB: DIRECTOR'S CUT (ZIP BUNDLE) */}
          {activeTab === 'directors_cut' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<Archive className="w-4 h-4" strokeWidth={2.2} />}
                label="DIR CUT BUNDLE"
                accent="crimson"
                rightSlot={<span className="text-[10px] font-black text-[#F5A623] uppercase">CSV · FOUNTAIN · JSON</span>}
              />
            </div>
          )}

          {/* TAB: FULL PROJECT BACKUP (.rawx) */}
          {activeTab === 'backup' && (
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-3 animate-in fade-in duration-150">
              <CinemaBadgeHeader
                icon={<HardDriveDownload className="w-4 h-4" strokeWidth={2.2} />}
                label="RAWX BACKUP"
                accent="emerald"
                rightSlot={<span className="text-[10px] font-black text-emerald-300 uppercase">{totalCount} SHOTS · OFFLINE</span>}
              />
            </div>
          )}

          {/* Feedback, Hardware Fallback Alert & Error Banner */}
          {exportWarning && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Encoder Acceleration / Pipeline Alert</p>
                <p className="text-amber-200/80 font-sans text-[11px]">{exportWarning}</p>
              </div>
              <button
                type="button"
                onClick={() => setExportWarning(null)}
                className="text-amber-300/70 hover:text-amber-100 text-[10px] font-bold uppercase cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {exportError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Export Notice</p>
                <p className="text-rose-400/80 font-sans text-[11px]">{exportError}</p>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold">Export Ready / Delivered</p>
                  <p className="text-emerald-400/80 font-mono text-[10.5px] truncate max-w-xl">
                    {downloadedFileName}
                  </p>
                </div>
              </div>
              {lastExportDownload && (
                <a
                  href={lastExportDownload.url}
                  download={lastExportDownload.filename}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] tracking-wider uppercase flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD FILE</span>
                </a>
              )}
            </div>
          )}

        </div>

        {/* ================================================================ */}
        {/* STICKY FOOTER WITH EXPORT BUTTON & LIVE RENDER HUD               */}
        {/* ================================================================ */}
        <div className="sticky bottom-0 bg-[#08090e]/95 backdrop-blur-2xl border-t border-[#F5A623]/25 px-4 py-2.5 flex justify-between items-center gap-3 z-20 shrink-0">
          
          {/* Active MP4 Live Render State */}
          {isExporting ? (
            <div className="w-full space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  <div className="relative shrink-0">
                    <canvas
                      ref={previewCanvasRef}
                      width={320}
                      height={134}
                      className="rounded-lg border border-[#F5A623]/30 bg-black shadow-lg"
                    />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-[#F5A623]/40 text-[7.5px] font-bold text-[#F5A623] font-mono">
                      LIVE RENDER
                    </div>
                  </div>

                  <div className="font-mono tabular-nums">
                    <div className="text-xs font-bold text-[#F5A623] tracking-wide">
                      SHOT {String(telemetry.currentShotIndex).padStart(3, '0')}/{String(telemetry.totalShots).padStart(3, '0')} · FRAME {telemetry.currentFrameNum.toLocaleString()}/{telemetry.totalFrames.toLocaleString()} · {telemetry.percent}% · ELAPSED {formatElapsedClock(elapsedSec)}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                      {telemetry.statusText || 'Encoding master sequence frames via WebCodecs'} ({telemetry.fps.toFixed(1)} FPS)
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAbortExport}
                  className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 text-xs font-bold tracking-wider cursor-pointer transition-all self-end sm:self-center"
                >
                  ABORT RENDER
                </button>
              </div>

              <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-[#2a2c3d]">
                <div
                  className="h-full bg-gradient-to-r from-[#d4af37] via-[#F5A623] to-[#fbbf24] rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(245,166,35,0.5)]"
                  style={{ width: `${Math.max(2, telemetry.percent)}%` }}
                />
              </div>
            </div>
          ) : (
            /* Idle Action Bar */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider shrink-0">
                  FILE
                </span>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full max-w-sm bg-[#07080c] border border-[#26283b] rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-[#F5A623] outline-none"
                  placeholder="HANDFILM_Export"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                <CinemaToolHUD title="CLOSE" en="Close export studio modal." bn="এক্সপোর্ট স্টুডিও বন্ধ করতে চাপুন।" accent="crimson" side="top">
                  <button
                    type="button"
                    onClick={onClose}
                    className="cinema-tile cinema-tile-crimson min-h-[44px] px-3.5 py-2 rounded-lg text-[10px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    <span>CLOSE</span>
                  </button>
                </CinemaToolHUD>

                {activeTab === 'mp4' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <CinemaToolHUD hudId="export-4k" side="top">
                      <button
                        type="button"
                        onClick={handleStartMp4Export}
                        disabled={isExporting}
                        data-active="true"
                        className="cinema-tile cinema-tile-amber min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 cinema-tile-icon" />
                        <span>START MP4 EXPORT</span>
                      </button>
                    </CinemaToolHUD>

                    <CinemaToolHUD
                      title="4K MASTER"
                      en="Render 3840×1608 4K DCI Master Scope at 80 Mbps AVC."
                      bn="সর্বোচ্চ ৮০ এমবিপিএস বিটরেটে ৪কে DCI মাস্টার ভিডিও রেন্ডার করুন।"
                      accent="emerald"
                      side="top"
                    >
                      <button
                        type="button"
                        onClick={handleStart4KMasterExport}
                        disabled={isExporting}
                        data-active="true"
                        className="cinema-tile cinema-tile-emerald min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Crown className="w-4 h-4 cinema-tile-icon" />
                        <span>Export as 4K Master</span>
                      </button>
                    </CinemaToolHUD>
                  </div>
                )}

                {activeTab === 'premiere' && (
                  <CinemaToolHUD title="EXPORT XML" en="Download Premiere Pro & CapCut XML sequence." bn="প্রিমিয়ার ও ক্যাপকাট XML সিকোয়েন্স ডাউনলোড করুন।" accent="amber" side="top">
                    <button
                      type="button"
                      onClick={handleExportPremiereXml}
                      data-active="true"
                      className="cinema-tile cinema-tile-amber min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 cinema-tile-icon" />
                      <span>EXPORT XML</span>
                    </button>
                  </CinemaToolHUD>
                )}

                {activeTab === 'fcpxml' && (
                  <CinemaToolHUD title="EXPORT FCPXML" en="Download DaVinci & Final Cut Pro FCPXML." bn="ডাভিঞ্চি ও ফাইনাল কাটের জন্য FCPXML ডাউনলোড করুন।" accent="cyan" side="top">
                    <button
                      type="button"
                      onClick={handleExportFcpXml}
                      data-active="true"
                      className="cinema-tile cinema-tile-cyan min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 cinema-tile-icon" />
                      <span>EXPORT FCPXML</span>
                    </button>
                  </CinemaToolHUD>
                )}

                {activeTab === 'package' && (
                  <CinemaToolHUD title="EXPORT ZIP" en="Download complete production ZIP archive." bn="সব মিডিয়া ও প্রজেক্ট ফাইলসহ ZIP ডাউনলোড করুন।" accent="amber" side="top">
                    <button
                      type="button"
                      onClick={handleExportProductionPackage}
                      disabled={isExporting}
                      data-active="true"
                      className="cinema-tile cinema-tile-amber min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      <Package className="w-4 h-4 cinema-tile-icon" />
                      <span>EXPORT ZIP</span>
                    </button>
                  </CinemaToolHUD>
                )}

                {activeTab === 'pdf' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <CinemaToolHUD title="HI-RES JPG" en="Export current frame as 1080p JPEG." bn="নির্বাচিত শটটি ১০৮০পি JPG ছবি হিসেবে সেভ করুন।" accent="cyan" side="top">
                      <button
                        type="button"
                        onClick={handleExportSingleFrameJpeg}
                        disabled={isExporting}
                        className="cinema-tile cinema-tile-cyan min-h-[44px] px-3.5 py-2 rounded-lg font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 cinema-tile-icon" />
                        <span>HI-RES JPG</span>
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title="SAVE PDF" en="Download formatted storyboard PDF book." bn="স্টোরিবোর্ড ও নোটসহ PDF ফাইল ডাউনলোড করুন।" accent="amber" side="top">
                      <button
                        type="button"
                        onClick={handleDownloadStoryboardPdf}
                        disabled={isExporting}
                        data-active="true"
                        className="cinema-tile cinema-tile-amber min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4 cinema-tile-icon" />
                        <span>SAVE PDF ({estimatedPdfPages}P)</span>
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD title="PRINT VIEW" en="Open print-ready storyboard sheet." bn="প্রিন্ট প্রিভিউ শিট ওপেন করতে চাপুন।" accent="emerald" side="top">
                      <button
                        type="button"
                        onClick={handleExportContactSheet}
                        className="cinema-tile cinema-tile-emerald min-h-[44px] px-3.5 py-2 rounded-lg font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 cinema-tile-icon" />
                        <span>PRINT</span>
                      </button>
                    </CinemaToolHUD>
                  </div>
                )}

                {activeTab === 'directors_cut' && (
                  <CinemaToolHUD title="DIR CUT ZIP" en="Download CSV shot list, script & JSON bundle." bn="ডিরেক্টরস কাট জিপ বান্ডেল ডাউনলোড করুন।" accent="crimson" side="top">
                    <button
                      type="button"
                      onClick={handleExportDirectorsCut}
                      disabled={isExporting}
                      data-active="true"
                      className="cinema-tile cinema-tile-crimson min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      <Archive className="w-4 h-4 cinema-tile-icon" />
                      <span>DIR CUT ZIP</span>
                    </button>
                  </CinemaToolHUD>
                )}

                {activeTab === 'backup' && (
                  <CinemaToolHUD title="RAWX BACKUP" en="Save lossless .rawx project backup file." bn="পুরো প্রজেক্টের .rawx ব্যাকআপ ফাইল সেভ করুন।" accent="emerald" side="top">
                    <button
                      type="button"
                      onClick={handleExportRawxBackup}
                      data-active="true"
                      className="cinema-tile cinema-tile-emerald min-h-[44px] px-4 py-2 rounded-lg font-black text-[11px] tracking-wider uppercase flex items-center gap-2 cursor-pointer"
                    >
                      <HardDriveDownload className="w-4 h-4 cinema-tile-icon" />
                      <span>RAWX BACKUP</span>
                    </button>
                  </CinemaToolHUD>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );

  return ReactDOM.createPortal(modalNode, document.body);
};

export const CutNativeExportModal = UnifiedExportStudio;
export type CutNativeExportModalProps = UnifiedExportStudioProps;
export default CutNativeExportModal;
