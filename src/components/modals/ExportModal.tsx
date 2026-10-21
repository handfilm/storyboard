/**
 * @file /src/components/modals/ExportModal.tsx
 * @description 100% Client-Side Frame-Range MP4 Video Exporter Modal for RAWx Storyboard Studio.
 * 
 * Features:
 * - Dual Mode Range Selector:
 *   - Shot Range Mode (e.g., SH040 to SH050, 12s per shot)
 *   - Exact Global Frame Mode (e.g., Frame 0040 to 0120)
 * - Resolution Selector:
 *   - 1080p Cinema (1920x804, 2.39:1)
 *   - 4K Cinema (3840x1606, 2.39:1)
 * - Real-Time Progress Bar & Frame Counter:
 *   - "Rendering Frame X / Total Frames"
 *   - Live rendering thumbnail preview
 *   - Cancel / Abort trigger
 * - Automatic background download as RAWx_Sequence_[start]-[end].mp4 without page reload.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { SLIDE_DURATION_SEC } from '../../types/editor';
import { 
  exportFrameRangeToMp4, 
  downloadVideoBlob, 
  calculateFrameRange, 
  getExportDimensions,
  ExportRangeMode, 
  ExportResolution,
  ExportProgress 
} from '../../services/exportEngine';
import { 
  X, 
  Film, 
  Video, 
  Download, 
  Layers, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  StopCircle, 
  Music, 
  Sliders, 
  Check,
  Maximize,
  Tv
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: AnthologyFrame[];
  currentIndex?: number;
  projectTitle?: string;
  directorName?: string;
  aspectRatio?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentIndex = 0,
  projectTitle = 'RAWx Storyboard Studio',
  directorName = 'Rakib Himon',
  aspectRatio = '2.39:1'
}) => {
  const [rangeMode, setRangeMode] = useState<ExportRangeMode>('shot');
  const [startShot, setStartShot] = useState<number>(Math.max(1, currentIndex + 1));
  const [endShot, setEndShot] = useState<number>(Math.min(frames.length, currentIndex + 5));
  const [startFrame, setStartFrame] = useState<number>(currentIndex * 288);
  const [endFrame, setEndFrame] = useState<number>(Math.min(frames.length * 288 - 1, (currentIndex + 1) * 288 + 120));
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);

  // Render & Export state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [exportedFilename, setExportedFilename] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setProgress(null);
      setExportError(null);
      setIsSuccess(false);
      const currentShotNum = Math.max(1, Math.min(frames.length, currentIndex + 1));
      setStartShot(currentShotNum);
      setEndShot(Math.min(frames.length, currentShotNum + 4));
      setStartFrame(currentIndex * 288);
      setEndFrame(Math.min(frames.length * 288 - 1, currentIndex * 288 + 288));
    }
  }, [isOpen, currentIndex, frames.length]);

  // Dimensions
  const dimensions = useMemo(() => {
    return getExportDimensions(resolution, aspectRatio);
  }, [resolution, aspectRatio]);

  // Range metadata
  const rangeInfo = useMemo(() => {
    const startVal = rangeMode === 'shot' ? startShot : startFrame;
    const endVal = rangeMode === 'shot' ? endShot : endFrame;
    return calculateFrameRange(rangeMode, startVal, endVal, frames.length, 24);
  }, [rangeMode, startShot, endShot, startFrame, endFrame, frames.length]);

  // Target filename
  const generatedFilename = useMemo(() => {
    const cleanTitle = (projectTitle || 'RAWx').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${cleanTitle}_Sequence_${rangeInfo.startLabel}-${rangeInfo.endLabel}_${resolution}.mp4`;
  }, [projectTitle, rangeInfo.startLabel, rangeInfo.endLabel, resolution]);

  if (!isOpen) return null;

  const handleStartExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setIsSuccess(false);
      setProgress({
        currentFrame: 0,
        totalFrames: rangeInfo.totalFrames,
        percent: 0,
        statusText: 'Initializing WebCodecs video encoder...'
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const blob = await exportFrameRangeToMp4(
        {
          frames,
          rangeMode,
          start: rangeMode === 'shot' ? startShot : startFrame,
          end: rangeMode === 'shot' ? endShot : endFrame,
          resolution,
          aspectRatio,
          fps: 24,
          includeAudio,
          projectTitle,
          directorName
        },
        (p) => {
          setProgress(p);
        },
        controller.signal
      );

      // Trigger instant in-browser download
      downloadVideoBlob(blob, generatedFilename);
      setExportedFilename(generatedFilename);
      setIsSuccess(true);
      setIsExporting(false);
    } catch (err: any) {
      if (err?.message?.includes('cancelled')) {
        setExportError('Export cancelled by user.');
      } else {
        console.error('Video Export Error:', err);
        setExportError(err?.message || 'An unexpected error occurred during video rendering.');
      }
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0a0a10] border border-[#272732] rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden font-mono text-zinc-300">
        
        {/* Header Strip */}
        <div className="h-14 px-5 bg-[#0c0c10] border-b border-[#272732] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4af37]/30 to-[#eab308]/10 border border-[#d4af37]/50 flex items-center justify-center text-[#fbbf24] shadow-[0_0_15px_rgba(234,179,8,0.25)]">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-cinzel text-sm sm:text-base font-bold text-white tracking-[0.15em] uppercase">
                  Client-Side MP4 Video Exporter
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#181824] border border-[#272732] text-[9px] font-bold text-[#eab308]">
                  WebCodecs H.264
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">
                100% In-Browser Rendering & Muxing (No Server • Zero Upload)
              </p>
            </div>
          </div>

          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#101018] hover:bg-[#181824] text-zinc-400 hover:text-white border border-[#272732] cursor-pointer transition-colors"
              title="Close Exporter (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Active Export Progress Overlay */}
          {isExporting && progress && (
            <div className="p-5 bg-[#0e0e16] border border-[#d4af37]/60 rounded-xl space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.15)] animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] animate-ping" />
                  <span className="font-bold text-white text-sm">
                    Rendering Video Sequence
                  </span>
                </div>
                <span className="font-bold text-[#fbbf24] text-sm tabular-nums">
                  {progress.percent}%
                </span>
              </div>

              {/* Glowing Progress Bar */}
              <div className="w-full h-3 bg-[#181822] rounded-full overflow-hidden p-0.5 border border-[#272732]">
                <div 
                  className="h-full bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#fbbf24] rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(234,179,8,0.5)]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {/* Telemetry Counter */}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Frame:</span>
                  <span className="text-white font-bold tabular-nums">
                    {progress.currentFrame} / {progress.totalFrames}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-[#fbbf24] font-bold">24.00 FPS</span>
                </div>
                <span className="text-zinc-400 text-[11px] truncate max-w-xs">
                  {progress.statusText}
                </span>
              </div>

              {/* Cancel Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cancel Rendering</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {isSuccess && !isExporting && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-600/50 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Video Export Complete!</p>
                  <p className="text-[11px] text-emerald-300">
                    Saved as <span className="font-mono font-bold text-white">{exportedFilename}</span>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Banner */}
          {exportError && !isExporting && (
            <div className="p-4 bg-rose-950/40 border border-rose-700/60 rounded-xl flex items-center gap-3 text-xs text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-white">Export Notice</p>
                <p className="text-[11px] text-rose-300">{exportError}</p>
              </div>
            </div>
          )}

          {!isExporting && (
            <>
              {/* 1. Range Selection Mode Toggle */}
              <div>
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                  1. Boundary Range Specification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRangeMode('shot')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      rangeMode === 'shot'
                        ? 'bg-[#14141e] border-[#d4af37] shadow-[0_0_15px_rgba(234,179,8,0.2)] ring-1 ring-[#eab308]'
                        : 'bg-[#070709] border-[#272732] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-[#fbbf24]" />
                        Shot Range Mode
                      </span>
                      <span className="text-[9px] text-[#fbbf24] font-bold">12.0s / Shot</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Specify by slide numbers (e.g. SH040 to SH050)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRangeMode('frame')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      rangeMode === 'frame'
                        ? 'bg-[#14141e] border-[#d4af37] shadow-[0_0_15px_rgba(234,179,8,0.2)] ring-1 ring-[#eab308]'
                        : 'bg-[#070709] border-[#272732] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
                        Exact Frame Mode
                      </span>
                      <span className="text-[9px] text-[#38bdf8] font-bold">1/24s Precision</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Specify by absolute frame index (e.g. 040 to 120)
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Range Input Controls */}
              <div className="p-4 bg-[#070709] border border-[#272732] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rangeMode === 'shot' ? (
                  <>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                        Start Shot (SH001 - SH{String(frames.length).padStart(3, '0')})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={frames.length}
                          value={startShot}
                          onChange={(e) => setStartShot(Math.max(1, Math.min(frames.length, Number(e.target.value))))}
                          className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-[#d4af37]"
                          placeholder="e.g. 40"
                        />
                        <span className="text-xs text-[#fbbf24] font-bold shrink-0">
                          SH{String(startShot).padStart(3, '0')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                        End Shot (SH001 - SH{String(frames.length).padStart(3, '0')})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={startShot}
                          max={frames.length}
                          value={endShot}
                          onChange={(e) => setEndShot(Math.max(startShot, Math.min(frames.length, Number(e.target.value))))}
                          className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-[#d4af37]"
                          placeholder="e.g. 50"
                        />
                        <span className="text-xs text-[#fbbf24] font-bold shrink-0">
                          SH{String(endShot).padStart(3, '0')}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                        Start Frame (0 - {frames.length * 288 - 1})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={frames.length * 288 - 1}
                          value={startFrame}
                          onChange={(e) => setStartFrame(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-[#d4af37]"
                          placeholder="e.g. 040"
                        />
                        <span className="text-xs text-[#38bdf8] font-bold shrink-0">
                          F{String(startFrame).padStart(4, '0')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-bold block mb-1 uppercase">
                        End Frame (0 - {frames.length * 288 - 1})
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={startFrame + 1}
                          max={frames.length * 288 - 1}
                          value={endFrame}
                          onChange={(e) => setEndFrame(Math.max(startFrame + 1, Number(e.target.value)))}
                          className="w-full bg-[#0a0a10] border border-[#272732] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-[#d4af37]"
                          placeholder="e.g. 050"
                        />
                        <span className="text-xs text-[#38bdf8] font-bold shrink-0">
                          F{String(endFrame).padStart(4, '0')}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Output Resolution & Settings */}
              <div>
                <label className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                  2. Video Quality & Audio Configuration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Resolution Selector */}
                  <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl flex flex-col justify-between">
                    <span className="text-[9.5px] text-zinc-400 font-bold block mb-1.5 uppercase">
                      RESOLUTION FORMAT ({aspectRatio})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setResolution('1080p')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          resolution === '1080p'
                            ? 'bg-[#181824] border-[#d4af37] text-[#fbbf24]'
                            : 'bg-[#0a0a10] border-[#272732] text-zinc-400 hover:text-white'
                        }`}
                      >
                        1080p Cinema
                        <span className="block text-[8.5px] font-normal text-zinc-500 mt-0.5">
                          1920 × 804 (Fast)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setResolution('4K')}
                        className={`py-2 px-2.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                          resolution === '4K'
                            ? 'bg-[#181824] border-[#d4af37] text-[#fbbf24]'
                            : 'bg-[#0a0a10] border-[#272732] text-zinc-400 hover:text-white'
                        }`}
                      >
                        4K Cinema
                        <span className="block text-[8.5px] font-normal text-zinc-500 mt-0.5">
                          3840 × 1606 (Master)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Audio & Codec Specs */}
                  <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl flex flex-col justify-between">
                    <span className="text-[9.5px] text-zinc-400 font-bold block mb-1.5 uppercase">
                      AUDIO TRACK & ENCODING PROFILE
                    </span>
                    <label className="flex items-center gap-2 text-xs text-zinc-200 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={includeAudio}
                        onChange={(e) => setIncludeAudio(e.target.checked)}
                        className="accent-[#eab308] rounded"
                      />
                      <span>Mux Background Audio & Synth Track</span>
                    </label>
                    <div className="text-[9.5px] text-zinc-500 font-mono">
                      Codec: H.264 (avc1.640028) • Container: MP4 • 24.00 FPS
                    </div>
                  </div>

                </div>
              </div>

              {/* Sequence Telemetry Summary */}
              <div className="p-3 bg-[#070709] border border-[#272732] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Total Frames</span>
                    <span className="text-sm font-bold text-white tabular-nums">
                      {rangeInfo.totalFrames.toLocaleString()} frames
                    </span>
                  </div>
                  <div className="h-6 w-px bg-[#272732]" />
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Duration</span>
                    <span className="text-sm font-bold text-[#fbbf24] tabular-nums">
                      {rangeInfo.durationSec.toFixed(2)}s ({Math.floor(rangeInfo.durationSec / 60)}m {Math.round(rangeInfo.durationSec % 60)}s)
                    </span>
                  </div>
                  <div className="h-6 w-px bg-[#272732]" />
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block font-bold">Dimensions</span>
                    <span className="text-sm font-bold text-zinc-300">
                      {dimensions.width} × {dimensions.height}
                    </span>
                  </div>
                </div>

                <div className="text-[9.5px] text-zinc-500">
                  Target: <span className="text-zinc-300 font-bold">{generatedFilename}</span>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="h-16 px-5 bg-[#0c0c10] border-t border-[#272732] flex items-center justify-between shrink-0">
          <div className="text-[10px] text-zinc-500 font-mono">
            {isExporting ? (
              <span className="text-[#fbbf24]">Rendering frame-by-frame at 24fps...</span>
            ) : (
              <span>Ready to encode with OffscreenCanvas & WebCodecs</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isExporting && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#101018] hover:bg-[#181824] border border-[#272732] text-zinc-300 hover:text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}

            {!isExporting && (
              <button
                type="button"
                onClick={handleStartExport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#eab308] to-[#fbbf24] hover:brightness-110 text-black font-black text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4 fill-current" />
                <span>EXPORT MP4 ({rangeInfo.totalFrames} FRAMES)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
