/**
 * @file /src/components/CutNativeExportModal.tsx
 * @description Next-Level Tactical Cinema Export Studio for RAWx / HANDFILM.
 * 
 * Features:
 * 1. Centered, Viewport-Locked Modal (No navbar clipping, fixed inset-0 HUD).
 * 2. Visual Shot Sequence Planner & Exclusion Matrix:
 *    - Mode tabs: [ ALL SHOTS (1–100) ] | [ ACTIVE SHOT ] | [ CUSTOM RANGE ] | [ MANUAL LIST ].
 *    - Stepper range inputs + dynamic runtime readout (e.g. 12 Shots = 02:24.00 @ 24fps).
 *    - Horizontal thumbnail strip with [ × ] exclusion toggle, shot badge, and 12.0s • 288F counter.
 * 3. 3 Modular Panels:
 *    - Master Resolution & Aspect (4K Scope default, 4K UHD 16:9, 1080p Scope, 1080p Standard, 9:16 Vertical Reel).
 *    - Bitrate & Quality Preset (Fast Proxy 12 Mbps, Broadcast 30 Mbps, Cinema Master 60 Mbps).
 *    - Composite Layers Toggles (Bilingual Titles, Optical Letterbox & Flares, 320kbps AAC Audio).
 * 4. Interactive Live Render HUD & Auto-Download:
 *    - Monospace file name preview.
 *    - Live thumbnail canvas preview of active rendered frame.
 *    - Amber progress bar with real-time stats: [ RENDERING SHOT 003/012 • FRAME 672/3456 • 45.2% • 21.4 FPS ].
 *    - Safe cancel/abort trigger + Web Audio success chime on completion.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnthologyFrame } from '../types/anthology';
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
  Film, 
  Download, 
  X, 
  Sparkles, 
  Check, 
  Cpu, 
  HardDrive, 
  Layers, 
  Type, 
  Sliders, 
  Play, 
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Music,
  CheckCircle2,
  Tv,
  Smartphone,
  Maximize2,
  Zap,
  RotateCcw,
  Clock,
  SquareCheck,
  SquareX,
  Volume2
} from 'lucide-react';

export interface CutNativeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle?: string;
  frames?: AnthologyFrame[];
  slides?: SlideDraft[];
  currentSlideIndex?: number;
  totalSlides?: number;
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
    // AudioContext blocked or non-fatal
  }
}

export const CutNativeExportModal: React.FC<CutNativeExportModalProps> = ({
  isOpen,
  onClose,
  projectTitle = 'UNTITLED_PROJECT',
  frames = [],
  slides = [],
  currentSlideIndex = 0,
  totalSlides = 1
}) => {
  const totalCount = Math.max(1, totalSlides || slides.length || frames.length || 1);

  // 1. Sequence & Range Selection
  const [selectionMode, setSelectionMode] = useState<ShotSelectionMode>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.min(12, totalCount));
  const [customListText, setCustomListText] = useState<string>('1, 3, 5-8, 12');
  const [excludedIndices, setExcludedIndices] = useState<number[]>([]);

  // 2. Render Engine Modular Settings
  // Default: 4K Scope (3840 × 1608, 2.39:1 Anamorphic)
  const [resolutionPreset, setResolutionPreset] = useState<CinemaResolutionPreset>('4k_scope');
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfile>('broadcast');
  const [burnInTitles, setBurnInTitles] = useState<boolean>(true);
  const [simulateFlare, setSimulateFlare] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // 3. Custom Output Filename
  const [customFilename, setCustomFilename] = useState<string>('');

  // 4. Render State & Live Telemetry
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shotStripScrollRef = useRef<HTMLDivElement | null>(null);

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setIsFinished(false);
      setExportError(null);
      setExcludedIndices([]);
      const start = Math.max(1, currentSlideIndex + 1);
      const end = Math.min(totalCount, start + 11);
      setRangeStart(start);
      setRangeEnd(end);
      setCustomListText(`1, ${Math.min(3, totalCount)}, ${Math.min(5, totalCount)}-${Math.min(8, totalCount)}`);
      
      const cleanProject = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      setCustomFilename(`HANDFILM_${cleanProject}_DirectorCut_${timeStr}.mp4`);
    }
  }, [isOpen, currentSlideIndex, totalCount, projectTitle]);

  // Candidate shots in selection mode before exclusion
  const candidateSelection = useMemo(() => {
    return parseShotSelection(
      selectionMode,
      rangeStart,
      rangeEnd,
      customListText,
      totalCount,
      currentSlideIndex,
      288,
      [] // without exclusion to show in visual matrix
    );
  }, [selectionMode, rangeStart, rangeEnd, customListText, totalCount, currentSlideIndex]);

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
      excludedIndices
    );
  }, [selectionMode, rangeStart, rangeEnd, customListText, totalCount, currentSlideIndex, excludedIndices]);

  // Dimension details for active preset
  const dimensionInfo = useMemo(() => {
    return getExportPresetDimensions(resolutionPreset);
  }, [resolutionPreset]);

  // Dynamic runtime display mm:ss.ff
  const dynamicRuntime = useMemo(() => {
    const totalSec = activeSelection.durationSec;
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.00`;
  }, [activeSelection.durationSec]);

  // Toggle exclusion of a shot in the matrix
  const handleToggleExcludeShot = (shotIdx: number) => {
    setExcludedIndices(prev => {
      if (prev.includes(shotIdx)) {
        return prev.filter(i => i !== shotIdx);
      } else {
        // Prevent excluding ALL shots
        if (candidateSelection.indices.length - prev.length <= 1) {
          return prev;
        }
        return [...prev, shotIdx];
      }
    });
  };

  // Blit rendered frame from offline canvas to live thumbnail monitor
  const handleFrameRendered = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const destCanvas = previewCanvasRef.current;
    if (!destCanvas) return;
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) return;

    if (destCanvas.width !== 320 || destCanvas.height !== 180) {
      destCanvas.width = 320;
      destCanvas.height = 180;
    }

    destCtx.fillStyle = '#06070B';
    destCtx.fillRect(0, 0, 320, 180);

    const sRatio = sourceCanvas.width / sourceCanvas.height;
    const dRatio = 320 / 180;
    let dW = 320;
    let dH = 180;
    let dX = 0;
    let dY = 0;

    if (sRatio > dRatio) {
      dH = Math.round(320 / sRatio);
      dY = Math.round((180 - dH) / 2);
    } else {
      dW = Math.round(180 * sRatio);
      dX = Math.round((320 - dW) / 2);
    }

    try {
      destCtx.drawImage(sourceCanvas, dX, dY, dW, dH);
    } catch {}
  }, []);

  // Launch Master Render Pipeline
  const handleStartExport = async () => {
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
        onProgress: (tel) => setTelemetry(tel),
        onFrameRendered: (canvas) => handleFrameRendered(canvas),
        abortSignal: abortCtrl.signal
      });

      // Browser download
      const targetName = customFilename.trim().endsWith('.mp4') 
        ? customFilename.trim() 
        : `${customFilename.trim() || 'HANDFILM_Master'}.mp4`;

      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);

      // Play success chime
      playExportSuccessChime();

      setDownloadedFileName(targetName);
      setIsFinished(true);
      setIsExporting(false);

    } catch (err: any) {
      if (err?.message?.includes('cancelled')) {
        setExportError('Render aborted by user.');
      } else {
        console.error('[CinemaExportStudio] Render failed:', err);
        setExportError(err?.message || 'Video encoding pipeline failed.');
      }
      setIsExporting(false);
    }
  };

  const handleAbortExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans overflow-hidden">
      
      {/* Centered Tactical Modal Container */}
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#0c0d10] border border-[#F5A623]/40 rounded-xl flex flex-col overflow-hidden shadow-2xl font-mono text-zinc-300 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Sticky Header: Gold Title, Total Runtime, Prominent Close */}
        <div className="sticky top-0 bg-[#0c0d10] border-b border-[#F5A623]/20 p-4 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#F5A623]/20 border border-[#F5A623]/50 flex items-center justify-center shadow-[0_0_12px_rgba(245,166,35,0.3)]">
              <Film className="w-4 h-4 text-[#F5A623]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs md:text-sm font-bold text-white tracking-widest uppercase">
                  CINEMA EXPORT STUDIO <span className="text-[#F5A623] font-normal">// WebCodecs Native</span>
                </h2>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans tracking-wide">
                Hardware-accelerated offline 24fps render engine with frame-accurate multi-shot stitching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Total Runtime Counter */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-[#161722] border border-[#26283b] text-xs">
              <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-zinc-400 text-[10px] uppercase tracking-wider">Runtime:</span>
              <span className="text-white font-bold font-mono">{dynamicRuntime}</span>
              <span className="text-[#F5A623] text-[10px] font-bold">@ 24fps</span>
            </div>

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

        {/* Scrollable Body Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* ============================================================== */}
          {/* SECTION 1: SHOT SEQUENCE SETTINGS & INTERACTIVE MATRIX        */}
          {/* ============================================================== */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>1. Shot Sequence Matrix & Planner</span>
              </label>

              {/* Dynamic Telemetry Label */}
              <div className="text-[10.5px] text-zinc-400 font-mono">
                Selected: <span className="text-white font-bold">{activeSelection.totalShots} Shots</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-[#07080c] border border-[#1d1e2b] rounded-xl">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('all')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  selectionMode === 'all'
                    ? 'bg-[#F5A623] text-black shadow-[0_0_15px_rgba(245,166,35,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#151620]'
                }`}
              >
                ALL SHOTS (1–{totalCount})
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('current')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  selectionMode === 'current'
                    ? 'bg-[#F5A623] text-black shadow-[0_0_15px_rgba(245,166,35,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#151620]'
                }`}
              >
                ACTIVE SHOT ({String(currentSlideIndex + 1).padStart(3, '0')})
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('range')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  selectionMode === 'range'
                    ? 'bg-[#F5A623] text-black shadow-[0_0_15px_rgba(245,166,35,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#151620]'
                }`}
              >
                CUSTOM RANGE
              </button>
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setSelectionMode('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                  selectionMode === 'custom'
                    ? 'bg-[#F5A623] text-black shadow-[0_0_15px_rgba(245,166,35,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#151620]'
                }`}
              >
                MANUAL LIST
              </button>
            </div>

            {/* Stepper Inputs for Range Mode */}
            {selectionMode === 'range' && (
              <div className="p-3.5 rounded-xl bg-[#101118] border border-[#202230] flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
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
                      className="w-18 bg-[#07080c] border border-[#2d2f42] rounded-lg px-2.5 py-1 text-sm font-bold text-[#F5A623] text-center focus:border-[#F5A623] outline-none"
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
                      className="w-18 bg-[#07080c] border border-[#2d2f42] rounded-lg px-2.5 py-1 text-sm font-bold text-[#F5A623] text-center focus:border-[#F5A623] outline-none"
                    />
                  </div>
                </div>

                <div className="text-[10.5px] text-zinc-400">
                  Span: <span className="text-white font-bold">{Math.max(0, rangeEnd - rangeStart + 1)} Consecutive Shots</span>
                </div>
              </div>
            )}

            {/* Manual Tag-Based List Input */}
            {selectionMode === 'custom' && (
              <div className="p-3.5 rounded-xl bg-[#101118] border border-[#202230] space-y-1.5 animate-in fade-in">
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
                  className="w-full bg-[#07080c] border border-[#2d2f42] rounded-lg px-3.5 py-2 text-xs font-mono text-cyan-300 focus:border-[#F5A623] outline-none"
                />
              </div>
            )}

            {/* Visual Shot Sequence & Exclusion Matrix Strip */}
            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-[#1c1d29] space-y-2">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-zinc-400 font-sans flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>Visual Sequence Strip (Click <span className="text-rose-400 font-bold">[ × ]</span> to exclude from render)</span>
                </span>
                {excludedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcludedIndices([])}
                    className="text-[10px] text-[#F5A623] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Exclusions</span>
                  </button>
                )}
              </div>

              {/* Horizontal Scrollable Thumbnail Strip */}
              <div 
                ref={shotStripScrollRef}
                className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-zinc-700"
              >
                {candidateSelection.indices.map((shotIdx) => {
                  const isExcluded = excludedIndices.includes(shotIdx);
                  const slide = slides[shotIdx];
                  const frame = frames[shotIdx];
                  const shotNumber = shotIdx + 1;
                  const shotLabel = `SH${String(shotNumber).padStart(3, '0')}`;
                  const title = slide?.titleEn || frame?.title || `Shot ${shotNumber}`;
                  const thumb = slide?.remoteUrl || frame?.imageUrl || '';

                  return (
                    <div
                      key={shotIdx}
                      className={`relative shrink-0 w-36 rounded-lg border overflow-hidden transition-all group ${
                        isExcluded
                          ? 'bg-[#120a0d] border-rose-900/60 opacity-50'
                          : 'bg-[#12131c] border-[#292b3e] hover:border-[#F5A623]'
                      }`}
                    >
                      {/* Shot Thumbnail Container */}
                      <div className="relative aspect-video w-full bg-black overflow-hidden">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={shotLabel}
                            className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                              isExcluded ? 'grayscale' : ''
                            }`}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black text-zinc-600 text-[9px]">
                            <Film className="w-4 h-4 mb-0.5 opacity-40" />
                            <span>PLATE</span>
                          </div>
                        )}

                        {/* Top Overlay Badge */}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[8.5px] font-bold text-white">
                          {shotLabel}
                        </div>

                        {/* Exclusion Toggle Button [ × ] */}
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExcludeShot(shotIdx);
                          }}
                          title={isExcluded ? 'Include shot in render' : 'Exclude shot from render'}
                          className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                            isExcluded
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-black/70 hover:bg-rose-600 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {isExcluded ? '+' : '×'}
                        </button>

                        {/* Excluded Diagonal Watermark */}
                        {isExcluded && (
                          <div className="absolute inset-0 bg-rose-950/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[9px] font-bold text-rose-300 tracking-wider">
                              EXCLUDED
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Shot Info Footer */}
                      <div className="p-2 space-y-0.5">
                        <div className="text-[9.5px] font-bold text-zinc-200 truncate" title={title}>
                          {title}
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-zinc-400 font-mono">
                          <span>12.0s • 288F</span>
                          <span className={isExcluded ? 'text-rose-400' : 'text-[#F5A623]'}>
                            {isExcluded ? 'SKIP' : 'ACTIVE'}
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
          {/* SECTION 2: 3 DISTINCT TACTILE MODULAR PANELS                  */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Panel 1: Master Resolution & Aspect */}
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] flex flex-col justify-between space-y-3">
              <div>
                <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Resolution & Aspect</span>
                </label>

                <div className="space-y-1.5">
                  {/* 4K Scope (Default) */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolutionPreset('4k_scope')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '4k_scope'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">4K Scope (3840 × 1608)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623] font-bold">2.39:1</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Theatrical Anamorphic Scope Master</div>
                  </button>

                  {/* 4K Standard 16:9 */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolutionPreset('4k_standard')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '4k_standard'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">4K UHD (3840 × 2160)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">16:9</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Ultra HD 16:9 Cinema Master</div>
                  </button>

                  {/* 1080p Scope */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolutionPreset('1080p_scope')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '1080p_scope'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">1080p Scope (1920 × 804)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">2.39:1</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Fast Theatrical Proxy</div>
                  </button>

                  {/* 1080p Standard */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolutionPreset('1080p_standard')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '1080p_standard'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">1080p Standard (1920 × 1080)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">16:9</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Web & Broadcast Television</div>
                  </button>

                  {/* Vertical Reel 9:16 */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolutionPreset('9_16_vertical')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      resolutionPreset === '9_16_vertical'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Vertical Reel (1080 × 1920)</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold">9:16</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Social Cut with Safe-Zone Letterbox</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Panel 2: Bitrate & Quality Preset */}
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] flex flex-col justify-between space-y-3">
              <div>
                <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Bitrate & Quality Profile</span>
                </label>

                <div className="space-y-2">
                  {/* Fast Proxy */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setBitrateProfile('proxy')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bitrateProfile === 'proxy'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Fast Proxy</span>
                      <span className="text-[10px] text-[#F5A623] font-bold">12 Mbps</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Lightweight client review file</div>
                  </button>

                  {/* Broadcast */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setBitrateProfile('broadcast')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bitrateProfile === 'broadcast'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Broadcast Profile</span>
                      <span className="text-[10px] text-[#F5A623] font-bold">30 Mbps</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Industry standard H.264 High Profile</div>
                  </button>

                  {/* Cinema Master */}
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setBitrateProfile('master')}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bitrateProfile === 'master'
                        ? 'bg-[#181926] border-[#F5A623] text-white shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                        : 'bg-[#101118] border-[#222332] text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Cinema Master</span>
                      <span className="text-[10px] text-[#F5A623] font-bold">60 Mbps</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-sans mt-0.5">Pristine DCI archival quality</div>
                  </button>
                </div>
              </div>

              {/* Color Specs Info Card */}
              <div className="p-3 rounded-lg bg-[#11121a] border border-[#232435] space-y-1 text-[10px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Color Transform:</span>
                  <span className="text-emerald-400 font-bold">ACEScg / Rec.709</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Framerate Lock:</span>
                  <span className="text-[#F5A623] font-bold">24.000 FPS</span>
                </div>
              </div>
            </div>

            {/* Panel 3: Composite Layers & Audio */}
            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1d29] flex flex-col justify-between space-y-3">
              <div>
                <label className="text-[11px] text-[#F5A623] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Composite Layers</span>
                </label>

                <div className="space-y-2">
                  {/* Burn In Titles */}
                  <div className="p-2.5 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Burn-in Glowing Titles</div>
                      <div className="text-[9px] text-zinc-500 font-sans">Bangla gold bloom + English subtitle</div>
                    </div>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setBurnInTitles(b => !b)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        burnInTitles ? 'bg-[#F5A623]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${burnInTitles ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Optical Flare Simulation */}
                  <div className="p-2.5 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Optical Bars & Anamorphic Flare</div>
                      <div className="text-[9px] text-zinc-500 font-sans">Cyan/gold laser streak & bloom</div>
                    </div>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setSimulateFlare(f => !f)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        simulateFlare ? 'bg-[#F5A623]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${simulateFlare ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Master Audio Track */}
                  <div className="p-2.5 rounded-lg bg-[#101118] border border-[#222332] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-[#F5A623]" />
                        <span>Timeline Master Audio</span>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-sans">320kbps AAC ambient sub-bass drone</div>
                    </div>
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setIncludeAudio(a => !a)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                        includeAudio ? 'bg-[#F5A623]' : 'bg-zinc-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-black transition-transform ${includeAudio ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick specs pill */}
              <div className="p-2.5 rounded-lg bg-[#11121a] border border-[#232435] text-[10px] text-zinc-400 flex justify-between items-center">
                <span>Output Dimension:</span>
                <span className="text-white font-mono font-bold">{dimensionInfo.width} × {dimensionInfo.height}</span>
              </div>
            </div>

          </div>

          {/* Feedback & Error Banner */}
          {exportError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Render Interrupted</p>
                <p className="text-rose-400/80 font-sans text-[11px]">{exportError}</p>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cinema Master Export Complete</p>
                <p className="text-emerald-400/80 font-mono text-[10.5px]">Saved as: {downloadedFileName}</p>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="sticky bottom-0 bg-[#0c0d10] border-t border-white/10 p-4 flex justify-between items-center gap-3 z-10 shrink-0">
          
          {isExporting ? (
            /* Active Live Render State: Thumbnail Monitor + Amber Bar + Telemetry + Cancel */
            <div className="w-full space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Live Thumbnail Window */}
                <div className="flex items-center gap-3">
                  <div className="relative w-28 aspect-video rounded-lg bg-black border border-[#F5A623]/50 overflow-hidden shrink-0 shadow-[0_0_12px_rgba(245,166,35,0.2)]">
                    <canvas
                      ref={previewCanvasRef}
                      width={320}
                      height={180}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[7.5px] font-bold text-[#F5A623]">
                      LIVE
                    </div>
                  </div>

                  {/* Telemetry Stats */}
                  <div>
                    <div className="text-xs font-bold text-[#F5A623] tracking-wide">
                      [ RENDERING SHOT {String(telemetry.currentShotIndex).padStart(3, '0')}/{String(telemetry.totalShots).padStart(3, '0')} • FRAME {telemetry.currentFrameNum.toLocaleString()}/{telemetry.totalFrames.toLocaleString()} • {telemetry.percent}% • {telemetry.fps.toFixed(1)} FPS ]
                    </div>
                    <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                      Writing H.264 High Profile MP4 bitstream via WebCodecs
                    </div>
                  </div>
                </div>

                {/* Cancel / Abort Button */}
                <button
                  type="button"
                  onClick={handleAbortExport}
                  className="px-4 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 text-xs font-bold tracking-wider cursor-pointer transition-all self-end sm:self-center"
                >
                  ABORT RENDER
                </button>
              </div>

              {/* Amber Progress Bar */}
              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-[#2a2c3d]">
                <div
                  className="h-full bg-gradient-to-r from-[#d4af37] via-[#F5A623] to-[#fbbf24] rounded-full transition-all duration-150 shadow-[0_0_10px_rgba(245,166,35,0.5)]"
                  style={{ width: `${Math.max(2, telemetry.percent)}%` }}
                />
              </div>
            </div>
          ) : (
            /* Idle Action Bar: Editable File Name Input + Close & Start Button */
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
                  placeholder="HANDFILM_DirectorCut.mp4"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#141520] hover:bg-[#1d1f2e] text-zinc-300 hover:text-white border border-[#292b3e] text-xs font-bold cursor-pointer transition-all"
                >
                  ✕ Close
                </button>

                <button
                  type="button"
                  onClick={handleStartExport}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#b38600] via-[#F5A623] to-[#fbbf24] hover:from-[#c29300] hover:to-[#fcd34d] text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(245,166,35,0.4)] active:scale-[0.98] transition-all"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>START MASTER EXPORT</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
