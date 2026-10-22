/**
 * @file /src/components/CutNativeExportModal.tsx
 * @description Cinema Export Studio: Client-Side Hardware MP4 Master Exporter.
 * 
 * Powered by WebCodecs & mp4-muxer offline render pipeline.
 * Features:
 * 1. Flexible Shot Selection: All Shots, Range Mode, Custom List Mode ('1, 4, 7-12'), and Current Active Shot.
 * 2. Multi-Format Resolution: 1080p Scope, 4K Master Scope, 1080p Standard, 4K Standard, Vertical Reel (9:16).
 * 3. Bitrate Profiles: Fast Proxy (12 Mbps), Broadcast (28-35 Mbps), Pristine Cinema Master (50-80 Mbps).
 * 4. Toggles: Glowing Bilingual Titles, Clean Video Plates, Anamorphic Flare Simulation, AAC 320kbps Audio.
 * 5. Real-time Live Thumbnail Preview Canvas & Tactical HUD with Amber Progress Bar.
 * 6. Direct browser download: HANDFILM_[ProjectName]_SH[Start]-SH[End]_[Resolution]_[Timestamp].mp4.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  Maximize2
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

export const CutNativeExportModal: React.FC<CutNativeExportModalProps> = ({
  isOpen,
  onClose,
  projectTitle = 'UNTITLED_PROJECT',
  frames = [],
  slides = [],
  currentSlideIndex = 0,
  totalSlides = 1
}) => {
  // Shot selection state
  const [selectionMode, setSelectionMode] = useState<ShotSelectionMode>('all');
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(Math.max(1, totalSlides || slides.length || frames.length || 1));
  const [customListText, setCustomListText] = useState<string>('1, 2, 3');

  // Format & Quality state
  const [resolutionPreset, setResolutionPreset] = useState<CinemaResolutionPreset>('1080p_scope');
  const [bitrateProfile, setBitrateProfile] = useState<BitrateProfile>('broadcast');
  const [colorSpace, setColorSpace] = useState<'rec709' | 'acescg'>('acescg');

  // Compositing Toggles
  const [burnInTitles, setBurnInTitles] = useState<boolean>(true);
  const [cleanPlates, setCleanPlates] = useState<boolean>(false);
  const [simulateFlare, setSimulateFlare] = useState<boolean>(true);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Export & Telemetry state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<RenderTelemetry>({
    currentShotIndex: 1,
    totalShots: 1,
    currentFrameNum: 0,
    totalFrames: 288,
    percent: 0,
    fps: 24.0,
    statusText: 'IDLE // READY FOR RENDER PIPELINE'
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [downloadedFileName, setDownloadedFileName] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronize start & end shots on open or index change
  const totalCount = Math.max(1, totalSlides || slides.length || frames.length || 1);
  useEffect(() => {
    if (isOpen) {
      setRangeStart(Math.max(1, currentSlideIndex + 1));
      setRangeEnd(Math.min(totalCount, currentSlideIndex + 4));
      setCustomListText(`1, 2, ${Math.min(totalCount, 3)}`);
      setExportError(null);
      setIsFinished(false);
      setIsExporting(false);
    }
  }, [isOpen, currentSlideIndex, totalCount]);

  // Dynamic live calculation of selected shots, frames, and duration
  const selectionSummary = useMemo(() => {
    return parseShotSelection(
      selectionMode,
      rangeStart,
      rangeEnd,
      customListText,
      totalCount,
      currentSlideIndex,
      288
    );
  }, [selectionMode, rangeStart, rangeEnd, customListText, totalCount, currentSlideIndex]);

  // Dimension details for active preset
  const dimensionInfo = useMemo(() => {
    return getExportPresetDimensions(resolutionPreset);
  }, [resolutionPreset]);

  // Format runtime nicely mm:ss
  const runtimeDisplay = useMemo(() => {
    const mins = Math.floor(selectionSummary.durationSec / 60);
    const secs = Math.floor(selectionSummary.durationSec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [selectionSummary.durationSec]);

  if (!isOpen) return null;

  // Handle live frame preview blit to modal thumbnail canvas
  const handleFrameRendered = (sourceCanvas: HTMLCanvasElement) => {
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
  };

  // Launch Master Render Pipeline
  const handleStartExport = async () => {
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
        resolutionPreset,
        bitrateProfile,
        burnInTitles: cleanPlates ? false : burnInTitles,
        cleanPlates,
        simulateFlare: cleanPlates ? false : simulateFlare,
        includeAudio,
        onProgress: (tel) => setTelemetry(tel),
        onFrameRendered: (canvas) => handleFrameRendered(canvas),
        abortSignal: abortCtrl.signal
      });

      // Automatic file download trigger
      const downloadUrl = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 8000);

      setDownloadedFileName(result.filename);
      setIsFinished(true);
      setIsExporting(false);

    } catch (err: any) {
      if (err?.message?.includes('cancelled')) {
        setExportError('Export cancelled.');
      } else {
        console.error('[CutNativeExportModal] Export failed:', err);
        setExportError(err?.message || 'Video encoding pipeline failed.');
      }
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none font-sans overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#090A0F] border border-[#d4af37]/40 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-mono text-zinc-300 my-8">
        
        {/* Header: Tactile Cinema Console HUD */}
        <div className="px-6 py-4 bg-[#11121A] border-b border-[#252636] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#d4af37]/20 border border-[#d4af37]/60 flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.3)]">
              <Film className="w-4 h-4 text-[#fbbf24]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wider uppercase">
                  CINEMA EXPORT STUDIO
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#f5a623]/20 border border-[#f5a623]/50 text-[#f5a623] font-bold">
                  WEBCODECS MASTER
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-400 font-sans tracking-wide">
                Offline Frame-Accurate Hardware Renderer • Uncompressed IndexedDB Vault
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Studio Body Split: Settings on Left, Live Telemetry & Inspector on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-[#252636]">
          
          {/* Left Column: Formats, Range, and Codec Selectors (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#252636]">
            
            {/* 1. Shot Selection Mode */}
            <div>
              <label className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>1. Shot Selection Mode</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#050609] border border-[#1e1f2d] rounded">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setSelectionMode('all')}
                  className={`py-1.5 px-2 text-[10.5px] font-bold rounded transition-all cursor-pointer ${
                    selectionMode === 'all'
                      ? 'bg-[#d4af37] text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  All Timeline
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setSelectionMode('range')}
                  className={`py-1.5 px-2 text-[10.5px] font-bold rounded transition-all cursor-pointer ${
                    selectionMode === 'range'
                      ? 'bg-[#d4af37] text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Range Mode
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setSelectionMode('custom')}
                  className={`py-1.5 px-2 text-[10.5px] font-bold rounded transition-all cursor-pointer ${
                    selectionMode === 'custom'
                      ? 'bg-[#d4af37] text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Custom List
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setSelectionMode('current')}
                  className={`py-1.5 px-2 text-[10.5px] font-bold rounded transition-all cursor-pointer ${
                    selectionMode === 'current'
                      ? 'bg-[#d4af37] text-black shadow'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`}
                >
                  Active Shot
                </button>
              </div>

              {/* Sub-inputs for Range or Custom */}
              {selectionMode === 'range' && (
                <div className="mt-2.5 p-3 rounded bg-[#10111a] border border-[#232435] flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-[9.5px] text-zinc-400 block mb-1">From Shot:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalCount}
                      disabled={isExporting}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#090A0F] border border-[#2b2c3f] rounded px-2.5 py-1 text-sm font-bold text-white text-center focus:border-[#fbbf24] outline-none"
                    />
                  </div>
                  <span className="text-zinc-500 pt-4">to</span>
                  <div className="flex-1">
                    <span className="text-[9.5px] text-zinc-400 block mb-1">To Shot:</span>
                    <input
                      type="number"
                      min={rangeStart}
                      max={totalCount}
                      disabled={isExporting}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Math.max(rangeStart, parseInt(e.target.value) || rangeStart))}
                      className="w-full bg-[#090A0F] border border-[#2b2c3f] rounded px-2.5 py-1 text-sm font-bold text-white text-center focus:border-[#fbbf24] outline-none"
                    />
                  </div>
                </div>
              )}

              {selectionMode === 'custom' && (
                <div className="mt-2.5 p-3 rounded bg-[#10111a] border border-[#232435]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9.5px] text-zinc-400">Manual Shot Listing (Comma or Range):</span>
                    <span className="text-[9px] text-zinc-500">e.g., 1, 4, 7-12, 19</span>
                  </div>
                  <input
                    type="text"
                    disabled={isExporting}
                    value={customListText}
                    onChange={(e) => setCustomListText(e.target.value)}
                    placeholder="1, 4, 7-12, 19, 88"
                    className="w-full bg-[#090A0F] border border-[#2b2c3f] rounded px-3 py-1.5 text-xs font-mono text-cyan-300 focus:border-[#fbbf24] outline-none"
                  />
                </div>
              )}
            </div>

            {/* 2. Resolution & Aspect Formats */}
            <div>
              <label className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>2. Resolution & Aspect Formats</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1080p Cinema Scope */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setResolutionPreset('1080p_scope')}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                    resolutionPreset === '1080p_scope'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-bold text-xs text-white">1080p Cinema Scope</div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">1920 × 804 • 2.39:1 Theatrical Scope</div>
                </button>

                {/* 4K Master Scope */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setResolutionPreset('4k_scope')}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                    resolutionPreset === '4k_scope'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-bold text-xs text-white">4K Master Scope</div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">3840 × 1608 • UHD Cinema Archive</div>
                </button>

                {/* 1080p Standard */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setResolutionPreset('1080p_standard')}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                    resolutionPreset === '1080p_standard'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-bold text-xs text-white">1080p Standard (16:9)</div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">1920 × 1080 • Broadcast Master</div>
                </button>

                {/* 4K Standard */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setResolutionPreset('4k_standard')}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                    resolutionPreset === '4k_standard'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-bold text-xs text-white">4K Standard (16:9)</div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">3840 × 2160 • UHD 16:9 Master</div>
                </button>

                {/* Vertical Reel 9:16 */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setResolutionPreset('9_16_vertical')}
                  className={`p-2.5 rounded border text-left sm:col-span-2 cursor-pointer transition-all ${
                    resolutionPreset === '9_16_vertical'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Vertical Reel (1080 × 1920, 9:16)</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                      SOCIAL CUT
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Safe-zone letterboxed scope with ambient blur and vertical title alignment
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Codec & Bitrate Profiles */}
            <div>
              <label className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>3. Codec & Quality Profiles</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setBitrateProfile('proxy')}
                  className={`p-2 rounded border text-center cursor-pointer transition-all ${
                    bitrateProfile === 'proxy'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400'
                  }`}
                >
                  <div className="text-[11px] font-bold">Fast Proxy</div>
                  <div className="text-[9px] text-zinc-500 font-sans">12 Mbps</div>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setBitrateProfile('broadcast')}
                  className={`p-2 rounded border text-center cursor-pointer transition-all ${
                    bitrateProfile === 'broadcast'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400'
                  }`}
                >
                  <div className="text-[11px] font-bold">Broadcast</div>
                  <div className="text-[9px] text-zinc-500 font-sans">28-35 Mbps</div>
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => setBitrateProfile('master')}
                  className={`p-2 rounded border text-center cursor-pointer transition-all ${
                    bitrateProfile === 'master'
                      ? 'bg-[#181926] border-[#fbbf24] text-[#fbbf24]'
                      : 'bg-[#0c0d14] border-[#1e1f2d] text-zinc-400'
                  }`}
                >
                  <div className="text-[11px] font-bold">Cinema Master</div>
                  <div className="text-[9px] text-zinc-500 font-sans">50-80 Mbps</div>
                </button>
              </div>

              {/* Color Space & Audio Info */}
              <div className="mt-3 flex items-center justify-between p-2.5 rounded bg-[#10111a] border border-[#232435] text-[10.5px]">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Color Transform:</span>
                  <span className="text-white font-bold">ACEScg / Rec.709 sRGB Preserved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Audio Muxing:</span>
                  <span className="text-[#fbbf24] font-bold">AAC 320 kbps</span>
                </div>
              </div>
            </div>

            {/* 4. Burn-In & Title Toggles */}
            <div>
              <label className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Type className="w-3.5 h-3.5" />
                <span>4. Burn-In & Title Compositing</span>
              </label>

              <div className="space-y-2">
                {/* Burn In Titles */}
                <div className="p-2.5 rounded bg-[#10111a] border border-[#232435] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Burn In Titles & Typography</div>
                    <div className="text-[9.5px] text-zinc-500 font-sans">
                      Composites glowing Bangla headline + English Cinzel subtitle and timecode
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExporting || cleanPlates}
                    onClick={() => setBurnInTitles(b => !b)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                      burnInTitles && !cleanPlates ? 'bg-[#d4af37]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        burnInTitles && !cleanPlates ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Clean Video Plates */}
                <div className="p-2.5 rounded bg-[#10111a] border border-[#232435] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Clean Video Plates Only</div>
                    <div className="text-[9.5px] text-zinc-500 font-sans">
                      Disables all text, slates, and reticles for raw VFX editorial handoff
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => {
                      setCleanPlates(c => {
                        const next = !c;
                        if (next) setBurnInTitles(false);
                        else setBurnInTitles(true);
                        return next;
                      });
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                      cleanPlates ? 'bg-cyan-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        cleanPlates ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Anamorphic Flare Simulation */}
                <div className="p-2.5 rounded bg-[#10111a] border border-[#232435] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Anamorphic Flare & Light Streak</div>
                    <div className="text-[9.5px] text-zinc-500 font-sans">
                      Renders blue/gold horizontal anamorphic laser filament & lens bloom
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExporting || cleanPlates}
                    onClick={() => setSimulateFlare(f => !f)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                      simulateFlare && !cleanPlates ? 'bg-[#d4af37]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        simulateFlare && !cleanPlates ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Audio Multiplexing */}
                <div className="p-2.5 rounded bg-[#10111a] border border-[#232435] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <div>
                      <div className="text-xs font-bold text-white">Timeline Audio Track Multiplexing</div>
                      <div className="text-[9.5px] text-zinc-500 font-sans">
                        Synthesizes ambient sub-bass drone with 24fps rhythmic cut-point markers
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => setIncludeAudio(a => !a)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                      includeAudio ? 'bg-[#d4af37]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-black transition-transform ${
                        includeAudio ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Telemetry, Thumbnail Monitor, and Diagnostics (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-[#0B0C13] flex flex-col justify-between space-y-5">
            
            <div className="space-y-4">
              {/* Telemetry Header Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Real-Time Monitor & Specs</span>
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                  OFFLINE 24.0 FPS
                </span>
              </div>

              {/* Live Render Canvas Monitor */}
              <div className="relative aspect-video w-full bg-black rounded border border-[#2a2b3d] overflow-hidden flex items-center justify-center shadow-inner">
                <canvas
                  ref={previewCanvasRef}
                  width={320}
                  height={180}
                  className="w-full h-full object-contain"
                />
                {!isExporting && !isFinished && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-center">
                    <Film className="w-8 h-8 text-[#d4af37] mb-2 opacity-80" />
                    <span className="text-xs font-bold text-white">LIVE FRAME MONITOR</span>
                    <span className="text-[9.5px] text-zinc-400 font-sans mt-0.5">
                      Frames stream here during offline rendering
                    </span>
                  </div>
                )}
                {isExporting && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-[#f5a623]/40 text-[9px] text-[#f5a623] font-bold">
                    REC • 24.0 FPS
                  </div>
                )}
              </div>

              {/* Sequence Specs Telemetry Grid */}
              <div className="p-3.5 rounded bg-[#10111a] border border-[#232435] space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400 text-[10.5px]">Total Shots:</span>
                  <span className="text-white font-bold font-mono">{selectionSummary.totalShots}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400 text-[10.5px]">Total Frames @ 24fps:</span>
                  <span className="text-[#fbbf24] font-bold font-mono">{selectionSummary.totalFrames.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400 text-[10.5px]">Estimated Runtime:</span>
                  <span className="text-white font-bold font-mono">{runtimeDisplay} ({selectionSummary.durationSec.toFixed(1)}s)</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400 text-[10.5px]">Output Geometry:</span>
                  <span className="text-cyan-300 font-bold font-mono">
                    {dimensionInfo.width} × {dimensionInfo.height} ({dimensionInfo.aspectRatio})
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400 text-[10.5px]">Source Storage:</span>
                  <span className="text-emerald-400 font-bold text-[10px]">Uncompressed 4K Vault</span>
                </div>
              </div>

              {/* Feedback messages */}
              {exportError && (
                <div className="p-3 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[10.5px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Encoding Interrupted</p>
                    <p className="text-rose-400/80 font-sans">{exportError}</p>
                  </div>
                </div>
              )}

              {isFinished && (
                <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[10.5px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Cinema Master Exported Successfully</p>
                    <p className="text-emerald-400/80 font-mono text-[9.5px] truncate max-w-xs">{downloadedFileName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tactical Render HUD (When Exporting) */}
            {isExporting && (
              <div className="p-4 rounded bg-[#05060A] border border-[#d4af37]/50 space-y-2 shadow-[0_0_20px_rgba(245,166,35,0.15)] animate-in fade-in">
                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-[#f5a623] font-bold truncate max-w-[220px]">
                    {telemetry.statusText}
                  </span>
                  <span className="text-white font-mono font-bold text-sm">
                    {telemetry.percent}%
                  </span>
                </div>

                {/* Amber Progress Bar */}
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4af37] via-[#f5a623] to-[#fbbf24] transition-all duration-150"
                    style={{ width: `${telemetry.percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
                  <span>
                    FRAME {telemetry.currentFrameNum.toLocaleString()} / {telemetry.totalFrames.toLocaleString()}
                  </span>
                  <span>{telemetry.fps.toFixed(1)} FPS</span>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#0e0f17] flex items-center justify-between">
          <div className="text-[10px] text-zinc-500 font-mono truncate max-w-md">
            Output File: <span className="text-zinc-300 font-bold">
              HANDFILM_{projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_{selectionSummary.label}.mp4
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isExporting ? (
              <button
                type="button"
                onClick={handleCancelExport}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-all"
              >
                Cancel Render
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded bg-[#141520] hover:bg-[#1d1f2e] text-zinc-300 hover:text-white border border-[#27283a] text-xs font-bold cursor-pointer transition-all"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleStartExport}
                  className="px-5 py-2 rounded bg-gradient-to-r from-[#b38600] via-[#d4af37] to-[#fbbf24] hover:from-[#c29300] hover:to-[#fcd34d] text-black font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.4)] active:scale-[0.98] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT MP4 MASTER</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
