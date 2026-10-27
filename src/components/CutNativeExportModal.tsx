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
import { AnthologyFrame, AnthologyProject } from '../types/anthology';
import { SlideDraft } from '../types/project';
import { 
  CinemaResolutionPreset,
  BitrateProfile,
  ShotSelectionMode,
  RenderTelemetry,
  parseShotSelection,
  getExportPresetDimensions,
  exportCinemaMasterMp4 
} from '../services/videoExportEngine';
import { 
  generatePremiereCapCutXml, 
  generateFcpXml, 
  downloadXmlBlob 
} from '../services/exportXml';
import { exportFullIdbBackup } from '../utils/backup';
import { exportDirectorsCutBundle } from '../services/directorsCutExport';
import { exportProductionPackageZip } from '../services/productionPackageExport';
import { downloadStoryboardPdf, exportFrameAsJpeg, exportFramesAsJpegZip } from '../utils/pdfExport';
import { eventBus } from '../core/eventBus';
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
  Camera
} from 'lucide-react';

export type ExportModalTab = 'mp4' | 'premiere' | 'fcpxml' | 'package' | 'pdf' | 'directors_cut' | 'backup';

export interface CutNativeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle?: string;
  frames?: AnthologyFrame[];
  slides?: SlideDraft[];
  currentSlideIndex?: number;
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

export const CutNativeExportModal: React.FC<CutNativeExportModalProps> = ({
  isOpen,
  onClose,
  projectTitle = 'UNTITLED_PROJECT',
  frames = [],
  slides = [],
  currentSlideIndex = 0,
  totalSlides = 1,
  initialTab = 'mp4',
  directorName = 'Rakib Himon',
  aspectRatio = '2.39:1'
}) => {
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

  // 3. MP4 Video Render Settings
  const [resolutionPreset, setResolutionPreset] = useState<CinemaResolutionPreset>('4k_scope');
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfile>('broadcast');
  const [burnInTitles, setBurnInTitles] = useState<boolean>(true);
  const [simulateFlare, setSimulateFlare] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // 4. Custom Output Filename
  const [customFilename, setCustomFilename] = useState<string>('');

  // 5. XML / Timeline Export Options
  const [xmlFps, setXmlFps] = useState<number>(24);
  const [includeXmlMarkers, setIncludeXmlMarkers] = useState<boolean>(true);
  const [isXmlCopied, setIsXmlCopied] = useState<boolean>(false);

  // 6. PDF Contact Sheet & High-Res JPEG Options
  const [pdfColumns, setPdfColumns] = useState<number>(4);
  const [includePdfSpecs, setIncludePdfSpecs] = useState<boolean>(true);
  const [includeJpegSlate, setIncludeJpegSlate] = useState<boolean>(true);

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
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [downloadedFileName, setDownloadedFileName] = useState<string>('');

  // 8. Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dedicatedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shotStripScrollRef = useRef<HTMLDivElement | null>(null);

  // 9. Interactive Shot Preview Selection (for dedicated canvas monitor)
  const [previewShotIdx, setPreviewShotIdx] = useState<number>(currentSlideIndex || 0);

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
    }
  }, [isOpen, currentSlideIndex, totalCount, projectTitle]);

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

  // Blit rendered frame from offline canvas to dedicated preview canvas and live thumbnail monitor
  const handleFrameRendered = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const targets = [dedicatedCanvasRef.current, previewCanvasRef.current].filter(Boolean) as HTMLCanvasElement[];
    if (targets.length === 0) return;

    for (const destCanvas of targets) {
      const destCtx = destCanvas.getContext('2d');
      if (!destCtx) continue;

      const targetW = destCanvas.width || 640;
      const targetH = destCanvas.height || 360;

      destCtx.fillStyle = '#06070B';
      destCtx.fillRect(0, 0, targetW, targetH);

      const sRatio = sourceCanvas.width / sourceCanvas.height;
      const dRatio = targetW / targetH;
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
        destCtx.drawImage(sourceCanvas, dX, dY, dW, dH);
      } catch {}
    }
  }, []);

  // Idle Frame Preview Effect: Renders scaled-down frame preview of current shot selection before rendering
  useEffect(() => {
    if (!isOpen || isExporting) return;
    const canvas = dedicatedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width || 640;
    const h = canvas.height || 360;

    // Reset background
    ctx.fillStyle = '#06070B';
    ctx.fillRect(0, 0, w, h);

    const validShotIdx = activeSelection.indices.includes(previewShotIdx)
      ? previewShotIdx
      : (activeSelection.indices[0] ?? currentSlideIndex ?? 0);

    const slide = slides[validShotIdx];
    const frame = frames[validShotIdx];
    const shotNum = validShotIdx + 1;
    const titleEn = slide?.titleEn || frame?.title || `SHOT ${String(shotNum).padStart(3, '0')}`;
    const titleBn = slide?.titleBn || frame?.bengaliTitle || 'আলোর স্মৃতি';
    const thumbUrl = slide?.remoteUrl || frame?.imageUrl || '';

    let isCancelled = false;

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

      // Centered Hero Title Burn-in Preview
      if (burnInTitles) {
        ctx.save();
        ctx.textAlign = 'center';

        // Outer Volumetric Rim
        ctx.save();
        ctx.shadowColor = 'rgba(245, 166, 35, 0.45)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#FFD54F';
        ctx.font = 'bold 24px "Noto Sans Bengali", "Anek Bangla", sans-serif';
        ctx.fillText(titleBn, w / 2, h / 2 - 8);
        ctx.restore();

        // Ambient Bloom
        ctx.save();
        ctx.shadowColor = '#F5A623';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FFD54F';
        ctx.font = 'bold 24px "Noto Sans Bengali", "Anek Bangla", sans-serif';
        ctx.fillText(titleBn, w / 2, h / 2 - 8);
        ctx.restore();

        // Core Solid
        ctx.save();
        ctx.fillStyle = '#FFF8E1';
        ctx.font = 'bold 24px "Noto Sans Bengali", "Anek Bangla", sans-serif';
        ctx.fillText(titleBn, w / 2, h / 2 - 8);
        ctx.restore();

        // Tracked English Subtitle
        ctx.save();
        ctx.fillStyle = '#E2E8F0';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 6;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(titleEn.toUpperCase(), w / 2, h / 2 + 15);
        ctx.restore();

        // Flare divider
        const flareW = 120;
        const flareY = h / 2 + 22;
        const grad = ctx.createLinearGradient((w - flareW) / 2, flareY, (w + flareW) / 2, flareY);
        grad.addColorStop(0, 'rgba(245,166,35,0)');
        grad.addColorStop(0.5, 'rgba(245,166,35,0.85)');
        grad.addColorStop(1, 'rgba(245,166,35,0)');
        ctx.fillStyle = grad;
        ctx.fillRect((w - flareW) / 2, flareY, flareW, 1.5);

        ctx.restore();
      }

      // Corner Crosshairs & Framing Reticles
      ctx.strokeStyle = 'rgba(245, 166, 35, 0.6)';
      ctx.lineWidth = 1.5;
      const bracketLen = 14;
      const pad = 12;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(pad, pad + bracketLen);
      ctx.lineTo(pad, pad);
      ctx.lineTo(pad + bracketLen, pad);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, pad);
      ctx.lineTo(w - pad, pad);
      ctx.lineTo(w - pad, pad + bracketLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(pad, h - pad - bracketLen);
      ctx.lineTo(pad, h - pad);
      ctx.lineTo(pad + bracketLen, h - pad);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(w - pad - bracketLen, h - pad);
      ctx.lineTo(w - pad, h - pad);
      ctx.lineTo(w - pad, h - pad - bracketLen);
      ctx.stroke();

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 8, h / 2);
      ctx.lineTo(w / 2 + 8, h / 2);
      ctx.moveTo(w / 2, h / 2 - 8);
      ctx.lineTo(w / 2, h / 2 + 8);
      ctx.stroke();
    };

    if (thumbUrl) {
      const isVideo = Boolean(
        frame?.isVideo ||
        slide?.isVideo ||
        thumbUrl.startsWith('data:video') ||
        /\.(mp4|webm|mov|m4v)($|\?)/i.test(thumbUrl)
      );

      if (isVideo) {
        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.src = thumbUrl;
        vid.onloadeddata = () => {
          if (isCancelled || !dedicatedCanvasRef.current) return;
          const iRatio = (vid.videoWidth || 16) / (vid.videoHeight || 9);
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

          ctx.drawImage(vid, dX, dY, dW, dH);
          drawCompositingOverlay();
        };
        vid.onerror = () => {
          if (!isCancelled) drawCompositingOverlay();
        };
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = thumbUrl;
        img.onload = () => {
          if (isCancelled || !dedicatedCanvasRef.current) return;
          const iRatio = img.width / img.height;
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

          ctx.drawImage(img, dX, dY, dW, dH);
          drawCompositingOverlay();
        };
        img.onerror = () => {
          if (!isCancelled) drawCompositingOverlay();
        };
      }
    } else {
      // Clean plate background
      ctx.fillStyle = '#0e0f17';
      ctx.fillRect(16, 16, w - 32, h - 32);
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`[ PLATE: ${titleEn} ]`, w / 2, h / 2 - 4);
      ctx.font = '10px monospace';
      ctx.fillText(`SHOT SH${String(shotNum).padStart(3, '0')} • 24.0 FPS RAW MASTER`, w / 2, h / 2 + 14);
      drawCompositingOverlay();
    }

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    isExporting,
    previewShotIdx,
    activeSelection.indices,
    currentSlideIndex,
    slides,
    frames,
    resolutionPreset,
    burnInTitles,
    simulateFlare
  ]);

  // Launch Master MP4 Render Pipeline
  const handleStartMp4Export = useCallback(async () => {
    if (activeSelection.totalShots === 0) {
      setExportError('At least one shot must be included in the sequence.');
      return;
    }

    setIsExporting(true);
    setIsFinished(false);
    setExportError(null);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      const result = await exportCinemaMasterMp4({
        projectTitle,
        frames,
        slides,
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
        burnInTitles,
        cleanPlates: false,
        simulateFlare,
        includeAudio,
        previewCanvas: previewCanvasRef.current,
        onProgress: (tel) => setTelemetry(tel),
        onFrameRendered: (canvas) => handleFrameRendered(canvas),
        abortSignal: abortCtrl.signal
      });

      const baseName = customFilename.trim().replace(/\.mp4$/i, '') || `HANDFILM_${projectTitle}_Master`;
      const targetName = `${baseName}.mp4`;

      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);

      playExportSuccessChime();
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
    burnInTitles,
    simulateFlare,
    includeAudio,
    customFilename,
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

  // Direct download of Printable Storyboard PDF with camera specs
  const handleDownloadStoryboardPdf = useCallback(async () => {
    try {
      setIsExporting(true);
      await downloadStoryboardPdf(selectedFrames, {
        projectTitle,
        directorName,
        aspectRatio,
        framesPerPage: pdfColumns === 4 ? 4 : 6,
        theme: 'print',
        includeSpecs: includePdfSpecs,
        includeAudio: true
      });
      playExportSuccessChime();
      setIsFinished(true);
      setDownloadedFileName(`${projectTitle}_Storyboard_ContactSheet.pdf`);
    } catch (err: any) {
      console.error('[PDF Download Error]', err);
      setExportError(err?.message || 'Could not download Storyboard PDF.');
    } finally {
      setIsExporting(false);
    }
  }, [selectedFrames, projectTitle, directorName, aspectRatio, pdfColumns, includePdfSpecs]);

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

        {/* ================================================================ */}
        {/* STICKY HEADER WITH FORMAT TABS & CLOSE BUTTON                    */}
        {/* ================================================================ */}
        <div className="sticky top-0 bg-[#08090e]/95 backdrop-blur-2xl border-b border-[#F5A623]/25 px-4 py-2.5 flex flex-col gap-2.5 z-20 shrink-0">
          {/* Top Title & Close Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#F5A623]/20 border border-[#F5A623]/50 flex items-center justify-center shadow-[0_0_12px_rgba(245,166,35,0.3)]">
                <Film className="w-4 h-4 text-[#F5A623]" />
              </div>
              <div>
                <h2 className="text-xs md:text-sm font-bold text-white tracking-widest uppercase">
                  UNIFIED MASTER EXPORT STUDIO <span className="text-[#F5A623] font-normal">// 24FPS NATIVE</span>
                </h2>
                <p className="text-[10px] text-zinc-400 font-sans">
                  Export Video Masters, Hollywood NLE Sequences, Contact Sheets & RAWX Backups
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Dynamic Runtime Badge */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#161722] border border-[#26283b] text-xs">
                <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                <span className="text-zinc-400 text-[10px] uppercase">Runtime:</span>
                <span className="text-white font-bold font-mono">{dynamicRuntime}</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-[#F5A623]/30 bg-[#161722]"
              >
                <span className="text-[#F5A623] font-bold">✕</span>
                <span>CLOSE</span>
              </button>
            </div>
          </div>

          {/* Unified Format Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1 bg-[#050609]/80 border border-[#1e1f2d] rounded-xl text-center backdrop-blur-md">
            {/* 1. MP4 VIDEO */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('mp4')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'mp4'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span className="truncate">MP4 VIDEO</span>
            </button>

            {/* 2. PREMIERE XML */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('premiere')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'premiere'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span className="truncate">PREMIERE XML</span>
            </button>

            {/* 3. CAPCUT FCPXML */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('fcpxml')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'fcpxml'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span className="truncate">CAPCUT FCPXML</span>
            </button>

            {/* 4. PRODUCTION PACKAGE (ZIP) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('package')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'package'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span className="truncate">PRODUCTION PKG</span>
            </button>

            {/* 5. CONTACT SHEET (PDF) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('pdf')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pdf'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">CONTACT SHEET</span>
            </button>

            {/* 6. DIRECTOR'S CUT (ZIP) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('directors_cut')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'directors_cut'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="truncate">DIRECTOR'S CUT</span>
            </button>

            {/* 7. PROJECT BACKUP (.rawx) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setActiveTab('backup')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'backup'
                  ? 'text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.3)] bg-amber-500/10'
                  : 'text-zinc-400 hover:text-white hover:bg-[#141520] border border-transparent'
              }`}
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span className="truncate">BACKUP (.rawx)</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* SCROLLABLE SETTINGS BODY                                         */}
        {/* ================================================================ */}
        <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3">
          
          {/* ============================================================== */}
          {/* SHARED DYNAMIC SHOT SEQUENCE MATRIX (ACTIVE FOR ALL TABS)      */}
          {/* ============================================================== */}
          <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Shared Shot Sequence Matrix</span>
              </label>

              <div className="text-[10.5px] text-zinc-400 font-mono">
                Active in export: <span className="text-white font-bold">{activeSelection.totalShots} Shots</span>
                {' • '}
                <span className="text-[#F5A623] font-bold">{activeSelection.totalFrames.toLocaleString()} Frames</span>
                {' • '}
                <span className="text-cyan-300 font-bold">{dynamicRuntime}</span>
                {excludedIndices.length > 0 && (
                  <span className="text-rose-400 ml-2">({excludedIndices.length} Excluded)</span>
                )}
              </div>
            </div>

            {/* Range Selection Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-[#050609] border border-[#1d1e2b] rounded-lg">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('all')}
                className={`py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  selectionMode === 'all'
                    ? 'bg-[#F5A623] text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ALL SHOTS (1–{totalCount})
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('current')}
                className={`py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  selectionMode === 'current'
                    ? 'bg-[#F5A623] text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                CURRENT SHOT ({String(currentSlideIndex + 1).padStart(3, '0')})
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('range')}
                className={`py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  selectionMode === 'range'
                    ? 'bg-[#F5A623] text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                CUSTOM RANGE
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('custom')}
                className={`py-1.5 px-2 text-xs font-bold rounded transition-all cursor-pointer text-center ${
                  selectionMode === 'custom'
                    ? 'bg-[#F5A623] text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                MANUAL LIST
              </button>
            </div>

            {/* Stepper Inputs for Range Mode */}
            {selectionMode === 'range' && (
              <div className="p-3 rounded-lg bg-[#101118] border border-[#202230] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-sans">From Shot:</span>
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
                    <span className="text-[11px] text-zinc-400 font-sans">To Shot:</span>
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

                <div className="text-[10.5px] text-zinc-400">
                  Span: <span className="text-white font-bold">{Math.max(0, rangeEnd - rangeStart + 1)} Consecutive Shots</span>
                </div>
              </div>
            )}

            {/* Manual Tag-Based Input */}
            {selectionMode === 'custom' && (
              <div className="p-3 rounded-lg bg-[#101118] border border-[#202230] space-y-1.5 animate-in fade-in">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-zinc-400 font-sans">Enter comma-separated shots and ranges:</span>
                  <span className="text-zinc-500">e.g., 1, 3, 5-8, 12</span>
                </div>
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
                  const thumb = slide?.remoteUrl || frame?.imageUrl || '';

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
                      <div className="relative aspect-video w-full bg-black overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={shotLabel}
                            className={`w-full h-full object-cover ${isExcluded ? 'grayscale' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 text-[8px]">
                            <Film className="w-3.5 h-3.5 mb-0.5 opacity-40" />
                            <span>PLATE</span>
                          </div>
                        )}

                        <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-white">
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
                      <div className="text-[11px] font-bold text-white tracking-wider uppercase flex items-center gap-2">
                        <span>{isExporting ? 'LIVE RENDER ENCODER FEED' : 'DEDICATED FRAME PREVIEW MONITOR'}</span>
                        {isExporting ? (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-500/20 text-[#F5A623] border border-amber-500/40 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            REC • 24 FPS
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            STANDBY PREVIEW
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-zinc-400 font-sans">
                        {isExporting 
                          ? `Blitting WebCodecs hardware accelerated render stream (Shot ${telemetry.currentShotIndex}/${telemetry.totalShots})` 
                          : `Visualizing Shot SH${String((previewShotIdx || 0) + 1).padStart(3, '0')} frame with optical composite overlays`}
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
                    <div className="text-[10.5px] font-mono text-[#F5A623] bg-black/60 px-2.5 py-1 rounded border border-[#F5A623]/30">
                      FRAME {telemetry.currentFrameNum.toLocaleString()} / {telemetry.totalFrames.toLocaleString()} ({telemetry.percent}%)
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
                        24.00 FPS DCI
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
                    <div className="absolute bottom-3 left-3 right-3 p-2 rounded bg-black/85 backdrop-blur-sm border border-[#F5A623]/35 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[10px] font-mono text-zinc-200 pointer-events-none shadow-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-[#F5A623] font-bold">
                          SHOT {String(telemetry.currentShotIndex).padStart(3, '0')}/{String(telemetry.totalShots).padStart(3, '0')}
                        </span>
                        <span className="text-zinc-500">•</span>
                        <span>FRAME {telemetry.currentFrameNum}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-cyan-400">{telemetry.percent}% COMPLETED</span>
                      </div>
                      <div className="text-zinc-400 text-[9px]">
                        Hardware Accelerated VideoEncoder Active
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Resolution & Aspect */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-1.5">
                  <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Resolution & Aspect</span>
                  </label>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setResolutionPreset('4k_scope')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        resolutionPreset === '4k_scope'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>4K Scope (3840 × 1608)</span>
                        <span className="text-[8.5px] text-[#F5A623]">2.39:1</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Theatrical Scope Master</div>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setResolutionPreset('4k_standard')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        resolutionPreset === '4k_standard'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>4K UHD (3840 × 2160)</span>
                        <span className="text-[8.5px] text-zinc-400">16:9</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Ultra HD Standard Cinema</div>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setResolutionPreset('1080p_scope')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        resolutionPreset === '1080p_scope'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>1080p Scope (1920 × 804)</span>
                        <span className="text-[8.5px] text-zinc-400">2.39:1</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Fast Theatrical Preview</div>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setResolutionPreset('9_16_vertical')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        resolutionPreset === '9_16_vertical'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-cyan-400" />
                          <span>Vertical Reel (1080 × 1920)</span>
                        </span>
                        <span className="text-[8.5px] text-cyan-400">9:16</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Social Cut Safe-Zone Letterbox</div>
                    </button>
                  </div>
                </div>

                {/* Bitrate & Quality */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-1.5">
                  <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Bitrate Profile</span>
                  </label>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setBitrateProfile('proxy')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        bitrateProfile === 'proxy'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>Fast Proxy</span>
                        <span className="text-[10px] text-[#F5A623]">12 Mbps</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Lightweight review cut</div>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setBitrateProfile('broadcast')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        bitrateProfile === 'broadcast'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>Broadcast Profile</span>
                        <span className="text-[10px] text-[#F5A623]">30 Mbps</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">High Profile H.264 standard</div>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setBitrateProfile('master')}
                      className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        bitrateProfile === 'master'
                          ? 'bg-[#181926] border-[#F5A623] text-white shadow'
                          : 'bg-[#101118] border-[#222332] text-zinc-400'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-white">
                        <span>Cinema Master</span>
                        <span className="text-[10px] text-[#F5A623]">60 Mbps</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">Pristine DCI archival master</div>
                    </button>
                  </div>
                </div>

                {/* Composite Layers */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-[#F5A623]/30 space-y-1.5">
                  <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Composite Layers</span>
                  </label>
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-[11px]">Burn-in Cinematic Titles (Bangla + English)</div>
                        <div className="text-[9px] text-[#F5A623]">Molten Gold bloom + tracked monospace subtitle</div>
                      </div>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => setBurnInTitles(b => !b)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                          burnInTitles ? 'bg-[#F5A623]' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-black transition-transform ${burnInTitles ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-[11px]">Optical Flares</div>
                        <div className="text-[9px] text-zinc-500">Horizontal anamorphic streak</div>
                      </div>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => setSimulateFlare(f => !f)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                          simulateFlare ? 'bg-[#F5A623]' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-black transition-transform ${simulateFlare ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-[11px]">Master Audio</div>
                        <div className="text-[9px] text-zinc-500">320kbps AAC ambient sub-bass</div>
                      </div>
                      <button
                        type="button"
                        disabled={isExporting}
                        onClick={() => setIncludeAudio(a => !a)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                          includeAudio ? 'bg-[#F5A623]' : 'bg-zinc-700'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-black transition-transform ${includeAudio ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PREMIERE PRO FCP 7 XML */}
          {activeTab === 'premiere' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#F5A623]">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Adobe Premiere Pro & CapCut Desktop XML (FCP 7 xmeml v5)</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Generates an industry-standard sequence file with multi-track video timing, 12.0s holds, Bengali/English title overlays, and audio track place-markers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                  <span className="text-[10.5px] text-[#F5A623] font-bold uppercase block">Timeline Settings</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Timebase:</span>
                    <span className="text-white font-bold font-mono">24.0 FPS</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Target Sequence Canvas:</span>
                    <span className="text-white font-bold font-mono">3840 × 1608 (2.39:1 Scope)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Audio Track:</span>
                    <span className="text-emerald-400 font-bold font-mono">Stereo 48.0 kHz</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                  <span className="text-[10.5px] text-[#F5A623] font-bold uppercase block">Import Instructions</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    1. In Premiere Pro: <code className="text-white bg-black/60 px-1 py-0.5 rounded">File &gt; Import</code> and select the generated <code className="text-[#F5A623]">.xml</code> file.<br />
                    2. In CapCut Desktop: <code className="text-white bg-black/60 px-1 py-0.5 rounded">File &gt; Import &gt; XML</code>.<br />
                    All clips, cut points, and marker tracks will populate automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAPCUT / DAVINCI FCPXML */}
          {activeTab === 'fcpxml' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">DaVinci Resolve & Final Cut Pro X (FCPXML v1.10)</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Apple FCPXML interchange interchange standard with DCI 4K format profiles, SMPTE markers, and audio spine alignment.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                  <span className="text-[10.5px] text-cyan-400 font-bold uppercase block">FCPXML Metadata</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Schema Version:</span>
                    <span className="text-white font-bold font-mono">FCPXML 1.10</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Color Grading Markers:</span>
                    <span className="text-cyan-300 font-bold font-mono">Included (Amber/Cyan)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">Rational Time:</span>
                    <span className="text-white font-bold font-mono">288/24s per shot</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                  <span className="text-[10.5px] text-cyan-400 font-bold uppercase block">DaVinci Import Guide</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Open DaVinci Resolve &gt; <code className="text-white bg-black/60 px-1 py-0.5 rounded">File &gt; Import Timeline &gt; Import AAF, EDL, XML...</code><br />
                    Select the <code className="text-cyan-400">.fcpxml</code> file to import full edit timings and color markers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRODUCTION PACKAGE (ZIP) */}
          {activeTab === 'package' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#F5A623]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Professional Production Package (.zip) // NLE Bundle</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Bundles all sequence frame assets into an uncompressed <code className="text-[#F5A623]">assets/</code> directory alongside an industry-standard <code className="text-cyan-400">manifest.json</code>, Premiere &amp; DaVinci XML conform sequence, and CMX 3600 EDL.
                  </p>
                </div>
              </div>

              {/* Package Inclusions Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-[#101118] border border-[#222332] space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    <span>manifest.json</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Universal NLE JSON manifest with frame-accurate SMPTE timecodes, titles, and optics.
                  </p>
                  <span className="inline-block text-[8.5px] font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    JSON Interop 1.0
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#101118] border border-[#222332] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#F5A623] font-bold text-xs">
                    <Film className="w-3.5 h-3.5" />
                    <span>assets/ (Plates)</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Full-resolution cinema stills for every active shot, formatted for direct NLE timeline drop.
                  </p>
                  <span className="inline-block text-[8.5px] font-mono text-[#F5A623] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                    {selectedFrames.length > 0 ? selectedFrames.length : totalCount} Assets
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#101118] border border-[#222332] space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>sequence.xml</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    FCP 7 XML linking to <code className="text-white">assets/</code> for 1-click Premiere &amp; DaVinci conform.
                  </p>
                  <span className="inline-block text-[8.5px] font-mono text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                    xmeml v5
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#101118] border border-[#222332] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                    <Layers className="w-3.5 h-3.5" />
                    <span>sequence.edl</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Standard CMX 3600 Edit Decision List for Avid, DaVinci, and offline post conform.
                  </p>
                  <span className="inline-block text-[8.5px] font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    CMX 3600
                  </span>
                </div>
              </div>

              {/* Package Options */}
              <div className="p-4 rounded-lg bg-[#101118] border border-[#222332] space-y-3">
                <span className="text-[10.5px] text-[#F5A623] font-bold uppercase tracking-wider block">
                  Package Configuration
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Resolution Selection */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-zinc-400 block font-sans">Plate Resolution:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPackageResolution('1080p_scope')}
                        className={`flex-1 py-1.5 px-2 rounded border text-xs font-bold transition-all cursor-pointer ${
                          packageResolution === '1080p_scope'
                            ? 'bg-[#F5A623] text-black border-[#F5A623]'
                            : 'bg-black border-zinc-700 text-zinc-400'
                        }`}
                      >
                        1080p Scope
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageResolution('4k_scope')}
                        className={`flex-1 py-1.5 px-2 rounded border text-xs font-bold transition-all cursor-pointer ${
                          packageResolution === '4k_scope'
                            ? 'bg-[#F5A623] text-black border-[#F5A623]'
                            : 'bg-black border-zinc-700 text-zinc-400'
                        }`}
                      >
                        4K Scope
                      </button>
                    </div>
                  </div>

                  {/* Burn-in Titles Toggle */}
                  <div className="flex flex-col justify-between py-1">
                    <span className="text-[11px] text-zinc-400 font-sans">Burn-in Titles on Assets:</span>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={packageBurnInTitles}
                        onChange={(e) => setPackageBurnInTitles(e.target.checked)}
                        className="accent-[#F5A623] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-white">Burn titles onto plates</span>
                    </label>
                  </div>

                  {/* Include XML / EDL */}
                  <div className="flex flex-col justify-between py-1">
                    <span className="text-[11px] text-zinc-400 font-sans">Conform Sequences:</span>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={packageIncludeXmlEdl}
                        onChange={(e) => setPackageIncludeXmlEdl(e.target.checked)}
                        className="accent-[#F5A623] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-white">Include sequence.xml &amp; .edl</span>
                    </label>
                  </div>
                </div>

                {/* Progress bar when exporting package */}
                {isExporting && activeTab === 'package' && (
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-[#F5A623] font-bold">{packageProgressText}</span>
                      <span className="text-white font-bold">{packageProgressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-[#2a2c3d]">
                      <div
                        className="h-full bg-gradient-to-r from-[#d4af37] via-[#F5A623] to-[#fbbf24] rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(245,166,35,0.5)]"
                        style={{ width: `${Math.max(2, packageProgressPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CONTACT SHEET PDF */}
          {activeTab === 'pdf' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Visual Storyboard Contact Sheet (Printable PDF)</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Generates high-resolution multi-column storyboard sheets for camera crews, clients, and pitch decks.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-3">
                  <span className="text-[10.5px] text-emerald-400 font-bold uppercase block">Layout Density</span>
                  <div className="flex items-center gap-2">
                    {[3, 4, 6].map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setPdfColumns(cols)}
                        className={`flex-1 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer ${
                          pdfColumns === cols
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-black border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {cols} Columns
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-300">Include Technical Specs</span>
                    <input
                      type="checkbox"
                      checked={includePdfSpecs}
                      onChange={(e) => setIncludePdfSpecs(e.target.checked)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                  <span className="text-[10.5px] text-emerald-400 font-bold uppercase block">PDF Delivery</span>
                  <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                    Clicking Download Storyboard PDF generates a multi-frame A4 storyboard packet, or use Print Preview for Light/Dark call sheets.
                  </p>
                </div>
              </div>

              {/* INDIVIDUAL HIGH-RESOLUTION JPEG FRAME EXPORT */}
              <div className="p-4 rounded-lg bg-[#101118] border border-cyan-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10.5px] text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      Individual Frame High-Resolution JPEG Export (1920×1080)
                    </span>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      Select any shot in the Visual Shot Strip above (currently <strong className="text-white">SH{String((previewShotIdx || 0) + 1).padStart(3, '0')} — {frames?.[previewShotIdx || 0]?.title || 'Active Frame'}</strong>) to export a standalone 1080p graded JPEG.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-300 shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeJpegSlate}
                      onChange={(e) => setIncludeJpegSlate(e.target.checked)}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Include Camera Slate</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSingleFrameJpeg}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 hover:text-white text-xs font-bold tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-cyan-300" />
                    <span>EXPORT SH{String((previewShotIdx || 0) + 1).padStart(3, '0')} AS HI-RES JPEG (.JPG)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSelectedFramesJpegZip}
                    className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-[#F5A623] text-xs font-bold tracking-wider flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-[#F5A623]" />
                    <span>BATCH EXPORT {activeSelection.totalShots} JPEGs (.ZIP)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DIRECTOR'S CUT (ZIP BUNDLE) */}
          {activeTab === 'directors_cut' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#F5A623]">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Director's Cut Production Bundle (.zip)</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    Bundles the production shot list (CSV), standard screenplay (Fountain), and master project metadata into a unified archive.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#F5A623] font-bold text-xs uppercase">
                    <FileText className="w-4 h-4" />
                    <span>shot_list.csv</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Full tabular CSV with SMPTE timecodes, durations, lens data, scenes, and action cues.
                  </p>
                  <span className="inline-block text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {selectedFrames.length > 0 ? selectedFrames.length : totalCount} Shots Indexed
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
                    <Film className="w-4 h-4" />
                    <span>screenplay.fountain</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Industry standard Fountain screenplay script with scene headers, character cues, and dialogue.
                  </p>
                  <span className="inline-block text-[9px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">
                    Fountain 1.1 Spec
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase">
                    <Layers className="w-4 h-4" />
                    <span>project_master.json</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                    Complete project state tree with camera setups, markers, aspect ratio, and optical settings.
                  </p>
                  <span className="inline-block text-[9px] font-mono text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                    v2.4 Cinema JSON
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#101118] border border-[#222332] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">Target Archive:</span>
                <span className="text-[#F5A623] font-bold font-mono">
                  {customFilename ? `${customFilename}_DirectorsCut.zip` : `HANDFILM_${projectTitle}_DirectorsCut_Bundle.zip`}
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: FULL PROJECT BACKUP (.rawx) */}
          {activeTab === 'backup' && (
            <div className="p-5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[#F5A623]">
                  <HardDriveDownload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Full Lossless Project Archive (.rawx)</h3>
                  <p className="text-xs text-zinc-400 font-sans mt-0.5">
                    One-click JSON package containing all timeline slides, bilingual titles, marker annotations, config states, and local IndexedDB media records.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#101118] border border-[#222332] space-y-2">
                <span className="text-[10.5px] text-[#F5A623] font-bold uppercase block">Archive Inclusions</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-black/50 border border-zinc-800 rounded text-center">
                    <span className="text-white font-bold block">{totalCount} Shots</span>
                    <span className="text-[9px] text-zinc-500">Timeline State</span>
                  </div>
                  <div className="p-2 bg-black/50 border border-zinc-800 rounded text-center">
                    <span className="text-white font-bold block">12.0s Holds</span>
                    <span className="text-[9px] text-zinc-500">Locked 24fps</span>
                  </div>
                  <div className="p-2 bg-black/50 border border-zinc-800 rounded text-center">
                    <span className="text-white font-bold block">IndexedDB</span>
                    <span className="text-[9px] text-zinc-500">Media Vault</span>
                  </div>
                  <div className="p-2 bg-black/50 border border-zinc-800 rounded text-center">
                    <span className="text-white font-bold block">Zero-Loss</span>
                    <span className="text-[9px] text-zinc-500">Offline JSON</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Error Banner */}
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
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Export Ready / Delivered</p>
                <p className="text-emerald-400/80 font-mono text-[10.5px] truncate max-w-xl">{downloadedFileName}</p>
              </div>
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

                  <div>
                    <div className="text-xs font-bold text-[#F5A623] tracking-wide">
                      [ RENDERING SHOT {String(telemetry.currentShotIndex).padStart(3, '0')}/{String(telemetry.totalShots).padStart(3, '0')} • FRAME {telemetry.currentFrameNum.toLocaleString()}/{telemetry.totalFrames.toLocaleString()} • {telemetry.percent}% • {telemetry.fps.toFixed(1)} FPS ]
                    </div>
                    <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                      Writing H.264 High Profile MP4 bitstream via WebCodecs
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              {/* File Name Preview */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 font-sans">
                  File:
                </span>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full max-w-sm bg-[#07080c] border border-[#26283b] rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:border-[#F5A623] outline-none"
                  placeholder="HANDFILM_Export"
                />
              </div>

              {/* Action Buttons based on Active Tab */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#141520] hover:bg-[#1d1f2e] text-zinc-300 hover:text-white border border-[#292b3e] text-xs font-bold cursor-pointer transition-all"
                >
                  ✕ Close
                </button>

                {activeTab === 'mp4' && (
                  <button
                    type="button"
                    onClick={handleStartMp4Export}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#b38600] via-[#F5A623] to-[#fbbf24] hover:from-[#c29300] hover:to-[#fcd34d] text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>START MP4 EXPORT</span>
                  </button>
                )}

                {activeTab === 'premiere' && (
                  <button
                    type="button"
                    onClick={handleExportPremiereXml}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#b38600] via-[#F5A623] to-[#fbbf24] hover:from-[#c29300] hover:to-[#fcd34d] text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>EXPORT PREMIERE XML (.xml)</span>
                  </button>
                )}

                {activeTab === 'fcpxml' && (
                  <button
                    type="button"
                    onClick={handleExportFcpXml}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 via-cyan-500 to-sky-400 hover:from-cyan-500 hover:to-sky-300 text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(56,189,248,0.6)] transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>EXPORT FCPXML (.fcpxml)</span>
                  </button>
                )}

                {activeTab === 'package' && (
                  <button
                    type="button"
                    onClick={handleExportProductionPackage}
                    disabled={isExporting}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-[#F5A623] to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                  >
                    <Package className="w-4 h-4" />
                    <span>DOWNLOAD PRODUCTION PKG (.ZIP)</span>
                  </button>
                )}

                {activeTab === 'pdf' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleExportSingleFrameJpeg}
                      disabled={isExporting}
                      className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/60 text-cyan-200 hover:text-white font-bold text-xs tracking-wider flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      title="Export active previewed storyboard frame as High-Resolution 1920×1080 JPEG"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-300" />
                      <span>HI-RES JPEG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadStoryboardPdf}
                      disabled={isExporting}
                      className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-[#F5A623] to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>DOWNLOAD STORYBOARD PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportContactSheet}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>PRINT PREVIEW</span>
                    </button>
                  </div>
                )}

                {activeTab === 'directors_cut' && (
                  <button
                    type="button"
                    onClick={handleExportDirectorsCut}
                    disabled={isExporting}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-[#F5A623] to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                  >
                    <Archive className="w-4 h-4" />
                    <span>DOWNLOAD DIRECTOR'S CUT (.ZIP)</span>
                  </button>
                )}

                {activeTab === 'backup' && (
                  <button
                    type="button"
                    onClick={handleExportRawxBackup}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#b38600] via-[#F5A623] to-[#fbbf24] hover:from-[#c29300] hover:to-[#fcd34d] text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-[0.98] animate-pulse hover:animate-none hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                  >
                    <HardDriveDownload className="w-4 h-4" />
                    <span>DOWNLOAD BACKUP (.rawx)</span>
                  </button>
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
