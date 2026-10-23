/**
 * @file /src/components/recorder/AdvancedTrimmerModal.tsx
 * @description Pro Precision Multi-Segment Trimmer Suite with WebCodecs Filmstrip and Hybrid Splicing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RecordedCaptureResult } from '../../services/screenRecorderEngine';
import { 
  videoTrimmerEngine, 
  TrimSegment, 
  FilmstripFrame, 
  TrimExportResult 
} from '../../services/videoTrimmerEngine';
import { 
  Play, 
  Pause, 
  Scissors, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Layers, 
  Sliders, 
  Film, 
  X, 
  Check, 
  Sparkles,
  ArrowRight,
  Clock,
  AudioWaveform
} from 'lucide-react';

export interface AdvancedTrimmerModalProps {
  captureResult: RecordedCaptureResult | null;
  initialInSec?: number;
  initialOutSec?: number;
  onClose: () => void;
  onCommittedToVault?: (mediaId: string, shotIndex: number) => void;
  activeShotIndex?: number;
}

export const AdvancedTrimmerModal: React.FC<AdvancedTrimmerModalProps> = ({
  captureResult,
  initialInSec = 0,
  initialOutSec,
  onClose,
  onCommittedToVault,
  activeShotIndex = 0
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [filmstripFrames, setFilmstripFrames] = useState<FilmstripFrame[]>([]);
  const [isLoadingFilmstrip, setIsLoadingFilmstrip] = useState<boolean>(true);

  // Multi-Segment State
  const [segments, setSegments] = useState<TrimSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Export Settings
  const [mergeIntoOne, setMergeIntoOne] = useState<boolean>(true);
  const [applyAudioMicroFade, setApplyAudioMicroFade] = useState<boolean>(true);
  const [targetShotIndex, setTargetShotIndex] = useState<number>(activeShotIndex);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; text: string }>({ percent: 0, text: '' });
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineCanvasRef = useRef<HTMLDivElement | null>(null);
  const filmstripScrollRef = useRef<HTMLDivElement | null>(null);
  const thumbnailItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Calculate active frame thumbnail index based on current playhead
  const activeThumbnailIndex = filmstripFrames.length > 0
    ? Math.min(filmstripFrames.length - 1, Math.max(0, Math.floor((currentTime / duration) * filmstripFrames.length)))
    : 0;

  // Dynamically center active frame thumbnail as user shuttles with arrow keys
  useEffect(() => {
    if (filmstripFrames.length === 0) return;
    const activeThumbEl = thumbnailItemRefs.current[activeThumbnailIndex];
    if (activeThumbEl && filmstripScrollRef.current) {
      activeThumbEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeThumbnailIndex, filmstripFrames.length]);

  // Initialize footage and filmstrip
  useEffect(() => {
    if (!captureResult) return;

    const url = URL.createObjectURL(captureResult.blob);
    setVideoUrl(url);

    const dur = Math.max(0.1, captureResult.durationSec);
    setDuration(dur);

    const initialIn = Math.max(0, initialInSec);
    const initialOut = initialOutSec !== undefined ? Math.min(dur, initialOutSec) : dur;

    // Default first segment
    const firstSegment: TrimSegment = {
      id: `seg-${Date.now()}`,
      name: 'Segment 01',
      startTime: initialIn,
      endTime: initialOut,
      duration: initialOut - initialIn
    };

    setSegments([firstSegment]);
    setSelectedSegmentId(firstSegment.id);
    setCurrentTime(initialIn);

    // Extract filmstrip micro-thumbnails via hardware pipeline (24 dense samples)
    setIsLoadingFilmstrip(true);
    videoTrimmerEngine.generateFilmstripThumbnails(captureResult.blob, 24)
      .then((frames) => {
        setFilmstripFrames(frames);
        setIsLoadingFilmstrip(false);
      })
      .catch((err) => {
        console.warn('[AdvancedTrimmer] Filmstrip extraction fallback:', err);
        setIsLoadingFilmstrip(false);
      });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [captureResult, initialInSec, initialOutSec]);

  if (!captureResult || !videoUrl) return null;

  const activeSegment = segments.find(s => s.id === selectedSegmentId) || segments[0];

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (activeSegment && t >= activeSegment.endTime) {
      if (isPlaying) {
        videoRef.current.currentTime = activeSegment.startTime;
      }
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (activeSegment && (currentTime >= activeSegment.endTime || currentTime < activeSegment.startTime)) {
        videoRef.current.currentTime = activeSegment.startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Sub-frame 1/60s stepping
  const handleStepFrame = (forward: boolean) => {
    if (!videoRef.current) return;
    const delta = 1 / 60; // 60fps single frame increment
    const nextTime = forward
      ? Math.min(duration, currentTime + delta)
      : Math.max(0, currentTime - delta);
    
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  // Split Segment at Current Playhead
  const handleSplitAtPlayhead = () => {
    if (!activeSegment) return;
    if (currentTime <= activeSegment.startTime + 0.1 || currentTime >= activeSegment.endTime - 0.1) {
      return; // Too close to boundaries
    }

    const segA: TrimSegment = {
      ...activeSegment,
      endTime: currentTime,
      duration: currentTime - activeSegment.startTime
    };

    const segB: TrimSegment = {
      id: `seg-${Date.now()}`,
      name: `Segment ${String(segments.length + 1).padStart(2, '0')}`,
      startTime: currentTime,
      endTime: activeSegment.endTime,
      duration: activeSegment.endTime - currentTime
    };

    const nextList = segments.flatMap(s => s.id === activeSegment.id ? [segA, segB] : [s]);
    setSegments(nextList);
    setSelectedSegmentId(segB.id);
  };

  // Add Segment
  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    let start = 0;
    let end = Math.min(duration, 5.0);

    if (lastSeg && lastSeg.endTime < duration - 0.5) {
      start = lastSeg.endTime;
      end = Math.min(duration, start + 5.0);
    }

    const newSeg: TrimSegment = {
      id: `seg-${Date.now()}`,
      name: `Segment ${String(segments.length + 1).padStart(2, '0')}`,
      startTime: start,
      endTime: end,
      duration: end - start
    };

    setSegments([...segments, newSeg]);
    setSelectedSegmentId(newSeg.id);
    setCurrentTime(start);
    if (videoRef.current) {
      videoRef.current.currentTime = start;
    }
  };

  // Delete Segment
  const handleDeleteSegment = (id: string) => {
    if (segments.length <= 1) return;
    const next = segments.filter(s => s.id !== id);
    setSegments(next);
    setSelectedSegmentId(next[0].id);
  };

  // Format Timecode
  const formatTimecode = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 24);
    const ff = totalFrames % 24;
    const ss = Math.floor(seconds) % 60;
    const mm = Math.floor(seconds / 60) % 60;
    const hh = Math.floor(seconds / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  const formatSMPTETimecode = (seconds: number, fps: number = 60) => {
    const totalFrames = Math.floor(seconds * fps);
    const ff = totalFrames % fps;
    const ss = Math.floor(seconds) % 60;
    const mm = Math.floor(seconds / 60) % 60;
    const hh = Math.floor(seconds / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  const [showHotkeys, setShowHotkeys] = useState<boolean>(false);

  // Global Precision Hotkey Matrix with input guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // Shift + A: Add Segment
      if (e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        handleAddSegment();
        return;
      }

      // S or X: Split at Playhead
      if ((e.key === 's' || e.key === 'S' || e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
        return;
      }

      // I: Set In-Point of active segment
      if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (activeSegment) {
          const newStart = Math.min(currentTime, activeSegment.endTime - 0.05);
          const updated: TrimSegment = {
            ...activeSegment,
            startTime: newStart,
            duration: activeSegment.endTime - newStart
          };
          setSegments(segments.map(s => s.id === activeSegment.id ? updated : s));
        }
        return;
      }

      // O: Set Out-Point of active segment
      if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (activeSegment) {
          const newEnd = Math.max(currentTime, activeSegment.startTime + 0.05);
          const updated: TrimSegment = {
            ...activeSegment,
            endTime: newEnd,
            duration: newEnd - activeSegment.startTime
          };
          setSegments(segments.map(s => s.id === activeSegment.id ? updated : s));
        }
        return;
      }

      // Delete / Backspace: Remove active segment
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSegmentId && segments.length > 1) {
          e.preventDefault();
          handleDeleteSegment(selectedSegmentId);
          return;
        }
      }

      // ArrowLeft / ArrowRight Navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!videoRef.current) return;
        const forward = e.key === 'ArrowRight';
        let delta = 1 / 60; // 1 frame @ 60fps
        if (e.shiftKey) {
          delta = 1.0; // 1 second jump
        } else if (e.ctrlKey || e.metaKey) {
          delta = 5.0; // 5 seconds fast scrub
        }

        const nextTime = forward
          ? Math.min(duration, (videoRef.current.currentTime || currentTime) + delta)
          : Math.max(0, (videoRef.current.currentTime || currentTime) - delta);

        videoRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, segments, selectedSegmentId, activeSegment, isPlaying]);

  // Primary Local Disk Download (.mp4 / .webm)
  const handleDownloadToDisk = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 15, text: 'Rendering zero-freeze export...' });

    try {
      const result = await videoTrimmerEngine.exportTrimmedVideo(
        captureResult.blob,
        segments,
        {
          format: captureResult.format,
          mergeIntoOne,
          applyAudioMicroFade,
          onProgress: (percent, text) => setExportProgress({ percent, text })
        }
      );

      const shotStr = `SH${String(targetShotIndex + 1).padStart(3, '0')}`;
      const ext = captureResult.format === 'mp4' ? 'mp4' : 'webm';
      const fileName = `HANDFILM_REC_${Date.now()}_${shotStr}.${ext}`;

      const dlUrl = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 8000);
      setIsExporting(false);
    } catch (err: any) {
      console.warn('[AdvancedTrimmer] Export fallback to raw blob download:', err);
      const shotStr = `SH${String(targetShotIndex + 1).padStart(3, '0')}`;
      const ext = captureResult.format === 'mp4' ? 'mp4' : 'webm';
      const fileName = `HANDFILM_REC_${Date.now()}_${shotStr}.${ext}`;

      const dlUrl = URL.createObjectURL(captureResult.blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 8000);
      setIsExporting(false);
    }
  };

  // Execute Hardware Splice & Export
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress({ percent: 0, text: 'Starting precision export...' });

    try {
      const result = await videoTrimmerEngine.exportTrimmedVideo(
        captureResult.blob,
        segments,
        {
          format: captureResult.format,
          mergeIntoOne,
          applyAudioMicroFade,
          targetShotIndex,
          onProgress: (percent, text) => setExportProgress({ percent, text })
        }
      );

      setExportSuccess(true);
      if (result.vaultItem) {
        onCommittedToVault?.(result.vaultItem.id, targetShotIndex);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('[AdvancedTrimmer] Export error:', err);
      setExportProgress({ percent: 0, text: err.message || 'Export error' });
      setIsExporting(false);
    }
  };

  const totalSegmentsDuration = segments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 select-none font-mono">
      <div className="w-full max-w-6xl h-[92vh] bg-[#07080C] border border-[#F5A623]/50 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden animate-fade-in text-white">
        
        {/* Top Header */}
        <div className="h-13 bg-[#0a0b12] border-b border-white/10 px-6 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#F5A623] shadow-[0_0_10px_#F5A623]" />
            <span className="font-bold tracking-wider text-[#F5A623] text-sm sm:text-base">
              PRO PRECISION MULTI-SEGMENT TRIMMER
            </span>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 hidden sm:inline">
              WebCodecs Hardware Splice
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Total Cut Time:</span>
              <span className="text-emerald-400 font-bold">{totalSegmentsDuration.toFixed(2)}s</span>
            </div>

            {/* Hotkeys HUD Button & Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHotkeys(!showHotkeys)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showHotkeys
                    ? 'bg-[#F5A623] text-black border-[#F5A623] shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/15'
                }`}
              >
                <span>⌨ HOTKEYS</span>
              </button>

              {showHotkeys && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0C0D14] border border-[#F5A623]/40 rounded-xl p-3.5 shadow-2xl z-50 text-[11px] text-zinc-300 flex flex-col gap-2.5 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-[#FFE066]">PRECISION TRIMMER SHORTCUTS</span>
                    <button
                      type="button"
                      onClick={() => setShowHotkeys(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px]">
                    <span className="text-zinc-400">Play / Pause:</span>
                    <span className="text-white font-bold text-right">Space</span>

                    <span className="text-zinc-400">Split at Playhead:</span>
                    <span className="text-white font-bold text-right">S or X</span>

                    <span className="text-zinc-400">+ Add Segment:</span>
                    <span className="text-white font-bold text-right">Shift + A</span>

                    <span className="text-zinc-400">Set In Point:</span>
                    <span className="text-white font-bold text-right">I</span>

                    <span className="text-zinc-400">Set Out Point:</span>
                    <span className="text-white font-bold text-right">O</span>

                    <span className="text-zinc-400">Delete Segment:</span>
                    <span className="text-white font-bold text-right">Del / Backspace</span>

                    <span className="text-zinc-400">Step 1 Frame:</span>
                    <span className="text-white font-bold text-right">← / → (1/60s)</span>

                    <span className="text-zinc-400">Shuttle 1.0s:</span>
                    <span className="text-white font-bold text-right">Shift + ← / →</span>

                    <span className="text-zinc-400">Fast Scrub 5.0s:</span>
                    <span className="text-white font-bold text-right">Ctrl/Cmd + ← / →</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Multi-Segment Cut Matrix */}
          <div className="w-72 bg-[#090A10] border-r border-white/10 flex flex-col p-3 overflow-y-auto shrink-0 gap-2.5 custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Segments ({segments.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddSegment}
                className="px-2 py-1 bg-[#141522] hover:bg-[#F5A623] hover:text-black rounded text-[10px] font-bold border border-white/15 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            {/* Segment Card List */}
            <div className="flex flex-col gap-2">
              {segments.map((seg, idx) => {
                const isSelected = seg.id === selectedSegmentId;
                const segDur = Math.max(0.1, seg.endTime - seg.startTime);

                return (
                  <div
                    key={seg.id}
                    onClick={() => {
                      setSelectedSegmentId(seg.id);
                      setCurrentTime(seg.startTime);
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.startTime;
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#181928] border-[#F5A623] shadow-[0_0_12px_rgba(245,166,35,0.25)]'
                        : 'bg-[#0E0F18] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#FFE066]">
                        {seg.name || `Cut ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                        {segDur.toFixed(2)}s
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>IN: {formatTimecode(seg.startTime)}</span>
                      <span>OUT: {formatTimecode(seg.endTime)}</span>
                    </div>

                    {/* Delete button (if more than 1 segment) */}
                    {segments.length > 1 && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSegment(seg.id);
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded cursor-pointer transition-colors"
                          title="Delete Segment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Audio Automation & Merge Options */}
            <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={mergeIntoOne}
                  onChange={(e) => setMergeIntoOne(e.target.checked)}
                  className="accent-[#F5A623] rounded"
                />
                <span className="text-[11px]">Merge cuts into single clip</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={applyAudioMicroFade}
                  onChange={(e) => setApplyAudioMicroFade(e.target.checked)}
                  className="accent-[#F5A623] rounded"
                />
                <span className="text-[11px]">5ms Audio Micro-Fade (No Pops)</span>
              </label>
            </div>
          </div>

          {/* Right Main Monitor & Controls Canvas */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden">
            {/* Monitor Stage */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden border-b border-white/10">
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onClick={handleTogglePlay}
                playsInline
                className="max-h-full max-w-full object-contain cursor-pointer"
              />

              {/* Floating Timecode overlay badge */}
              <div className="absolute top-4 left-4 bg-black/85 px-3 py-1 rounded-lg border border-white/20 text-xs text-[#FFE066] font-bold shadow-lg font-mono">
                TC {formatSMPTETimecode(currentTime, captureResult.fps || 60)} // {captureResult.fps || 60} FPS
              </div>

              {/* Center Play overlay */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="absolute w-16 h-16 rounded-full bg-black/70 hover:bg-[#F5A623] text-white hover:text-black border border-white/25 flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-md"
                >
                  <Play className="w-7 h-7 fill-current ml-1" />
                </button>
              )}
            </div>

            {/* Transport Toolbar */}
            <div className="h-11 bg-[#090A10] border-b border-white/10 px-4 flex items-center justify-between text-xs shrink-0">
              {/* Stepping and Playback buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepFrame(false)}
                  className="px-2.5 py-1 bg-[#141520] hover:bg-[#F5A623] hover:text-black rounded-lg border border-white/15 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Step Back 1 Frame (1/60s)"
                >
                  <SkipBack className="w-3 h-3" />
                  <span>&lt; 1F</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="px-3.5 py-1 bg-[#F5A623] text-black font-bold rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-[#FFE066] transition-all"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStepFrame(true)}
                  className="px-2.5 py-1 bg-[#141520] hover:bg-[#F5A623] hover:text-black rounded-lg border border-white/15 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                  title="Step Forward 1 Frame (1/60s)"
                >
                  <span>1F &gt;</span>
                  <SkipForward className="w-3 h-3" />
                </button>

                <div className="h-4 w-px bg-white/15 mx-1" />

                {/* Razor Split Tool */}
                <button
                  type="button"
                  onClick={handleSplitAtPlayhead}
                  className="px-3 py-1 bg-[#141520] hover:bg-rose-600 hover:text-white rounded-lg border border-white/15 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Fast Razor Split at Current Playhead"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>SPLIT AT PLAYHEAD</span>
                </button>
              </div>

              {/* In/Out Boundary Fine Tuner for Active Segment */}
              {activeSegment && (
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...activeSegment, startTime: currentTime, duration: activeSegment.endTime - currentTime };
                      setSegments(segments.map(s => s.id === activeSegment.id ? updated : s));
                    }}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/15 rounded border border-white/10 text-[#F5A623] cursor-pointer"
                  >
                    Set In: {formatTimecode(currentTime)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...activeSegment, endTime: currentTime, duration: currentTime - activeSegment.startTime };
                      setSegments(segments.map(s => s.id === activeSegment.id ? updated : s));
                    }}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/15 rounded border border-white/10 text-[#F5A623] cursor-pointer"
                  >
                    Set Out: {formatTimecode(currentTime)}
                  </button>
                </div>
              )}
            </div>

            {/* Dynamic Centered Filmstrip Preview Strip */}
            <div className="bg-[#080910] border-b border-white/10 px-4 py-2 flex flex-col gap-1.5 shrink-0 select-none">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span className="font-bold text-[#F5A623] tracking-wider uppercase">DYNAMIC FILMSTRIP SHUTTLE</span>
                  <span className="text-zinc-500">//</span>
                  <span className="text-zinc-200">
                    FRAME {filmstripFrames.length > 0 ? activeThumbnailIndex + 1 : 0} OF {filmstripFrames.length || 0}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#FFE066] font-bold">TC {formatSMPTETimecode(currentTime, captureResult.fps || 60)}</span>
                  <span className="text-zinc-500 hidden md:inline">(Arrow keys shuttle & auto-center)</span>
                </div>
              </div>

              {/* Scroll Container with Centered Active Frame */}
              <div 
                ref={filmstripScrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 scroll-smooth"
                style={{ scrollbarWidth: 'thin' }}
              >
                {isLoadingFilmstrip ? (
                  <div className="w-full h-16 flex items-center justify-center text-zinc-500 text-xs gap-2">
                    <div className="w-4 h-4 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
                    <span>Extracting dynamic 60fps filmstrip frames...</span>
                  </div>
                ) : (
                  filmstripFrames.map((frame, idx) => {
                    const isActive = idx === activeThumbnailIndex;
                    const isInsideActiveSeg = activeSegment && frame.timeSec >= activeSegment.startTime && frame.timeSec <= activeSegment.endTime;
                    const frameDuration = duration / Math.max(1, filmstripFrames.length);
                    const isNearIn = activeSegment && Math.abs(frame.timeSec - activeSegment.startTime) <= frameDuration;
                    const isNearOut = activeSegment && Math.abs(frame.timeSec - activeSegment.endTime) <= frameDuration;

                    return (
                      <div
                        key={idx}
                        ref={(el) => { thumbnailItemRefs.current[idx] = el; }}
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = frame.timeSec;
                            setCurrentTime(frame.timeSec);
                          }
                        }}
                        className={`relative shrink-0 w-24 h-15 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-150 select-none ${
                          isActive
                            ? 'border-[#F5A623] ring-2 ring-[#F5A623] scale-105 z-20 shadow-[0_0_18px_rgba(245,166,35,0.7)]'
                            : isInsideActiveSeg
                            ? 'border-[#F5A623]/60 opacity-95 hover:border-white'
                            : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/40'
                        }`}
                      >
                        <img
                          src={frame.dataUrl}
                          alt={`Frame ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                        {/* Frame Number Badge */}
                        <span className="absolute top-1 left-1 text-[8px] font-mono font-bold text-zinc-300 bg-black/70 px-1 py-0.2 rounded border border-white/10">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>

                        {/* Boundary Markers (IN / OUT) */}
                        {isNearIn && (
                          <span className="absolute top-1 right-1 text-[8px] font-mono font-black text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-500/50 shadow">
                            IN
                          </span>
                        )}
                        {isNearOut && (
                          <span className="absolute top-1 right-1 text-[8px] font-mono font-black text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-500/50 shadow">
                            OUT
                          </span>
                        )}

                        {/* Bottom Frame Timestamp */}
                        <span className={`absolute bottom-0.5 right-1 text-[8px] font-mono font-bold ${isActive ? 'text-[#FFE066]' : 'text-zinc-400'}`}>
                          {formatTimecode(frame.timeSec)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Hardware Filmstrip Timeline Canvas */}
            <div 
              ref={timelineCanvasRef}
              className="h-24 bg-[#06070B] p-3 flex flex-col justify-center relative select-none shrink-0"
            >
              {/* Micro-Thumbnail Filmstrip Canvas */}
              <div className="relative h-12 bg-[#0F101A] border border-white/15 rounded-lg overflow-hidden flex items-center">
                {isLoadingFilmstrip ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
                    <span>EXTRACTING 4K HARDWARE FILMSTRIP...</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex">
                    {filmstripFrames.map((frame, fIdx) => (
                      <div key={fIdx} className="flex-1 h-full overflow-hidden border-r border-black/40 relative">
                        <img
                          src={frame.dataUrl}
                          alt=""
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Segment Overlays on Filmstrip */}
                {segments.map((seg) => {
                  const isSel = seg.id === selectedSegmentId;
                  const leftPct = (seg.startTime / duration) * 100;
                  const widthPct = ((seg.endTime - seg.startTime) / duration) * 100;

                  return (
                    <div
                      key={seg.id}
                      className={`absolute top-0 bottom-0 pointer-events-none transition-all ${
                        isSel
                          ? 'bg-[#F5A623]/25 border-y-2 border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.4)]'
                          : 'bg-emerald-500/15 border-y border-emerald-500/40'
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`
                      }}
                    >
                      <span className="absolute top-1 left-1.5 text-[8.5px] font-bold text-white bg-black/80 px-1 py-0.2 rounded border border-white/20">
                        {seg.name}
                      </span>
                    </div>
                  );
                })}

                {/* Scrubber Playhead Laser Needle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] pointer-events-none z-30"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="w-3 h-3 bg-white -translate-x-[5px] -translate-y-1 rotate-45 shadow-lg" />
                </div>

                {/* Interactive Click Scrubber */}
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.0416"
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCurrentTime(val);
                    if (videoRef.current) {
                      videoRef.current.currentTime = val;
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-ew-resize z-40"
                />
              </div>

              {/* Timecode markers */}
              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>00:00:00:00</span>
                <span>{formatTimecode(duration / 2)}</span>
                <span>{formatTimecode(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="h-16 bg-[#0a0b12] border-t border-white/10 px-6 flex items-center justify-between text-xs shrink-0">
          {/* Target Shot Selector */}
          <div className="flex items-center gap-2.5 bg-black/60 px-3 py-1.5 rounded-xl border border-white/10">
            <Film className="w-4 h-4 text-[#F5A623]" />
            <span className="text-zinc-400">Direct Ingest to:</span>
            <select
              value={targetShotIndex}
              onChange={(e) => setTargetShotIndex(Number(e.target.value))}
              className="bg-[#12131C] text-[#FFE066] font-bold border border-white/20 rounded-lg px-2.5 py-1 text-xs cursor-pointer outline-none"
            >
              {Array.from({ length: 100 }).map((_, idx) => (
                <option key={idx} value={idx}>
                  Shot {String(idx + 1).padStart(3, '0')} // Master Frame
                </option>
              ))}
            </select>
          </div>

          {/* Export Action Controls */}
          <div className="flex items-center gap-3">
            {isExporting && (
              <div className="flex items-center gap-2.5 text-xs text-[#FFE066]">
                <div className="w-4 h-4 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
                <span>{exportProgress.text} ({exportProgress.percent}%)</span>
              </div>
            )}

            {/* Primary Download to Disk (.MP4 / .WEBM) */}
            <button
              type="button"
              onClick={handleDownloadToDisk}
              disabled={isExporting}
              className="px-4 py-2 bg-gradient-to-r from-[#00F0FF]/20 to-[#00F0FF]/10 hover:from-[#00F0FF]/30 hover:to-[#00F0FF]/20 text-[#00F0FF] rounded-xl border border-[#00F0FF]/50 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_14px_rgba(0,240,255,0.25)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-[#00F0FF]" />
              <span>⤓ DOWNLOAD TO DISK (.MP4 / .WEBM)</span>
            </button>

            {/* Ingest to Master Shot */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || exportSuccess}
              className={`px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xl transition-all ${
                exportSuccess
                  ? 'bg-emerald-600 text-white'
                  : isExporting
                  ? 'bg-amber-600 text-black opacity-80 cursor-wait'
                  : 'bg-[#F5A623] hover:bg-[#FFE066] text-black shadow-[0_0_20px_rgba(245,166,35,0.4)] cursor-pointer active:scale-95'
              }`}
            >
              {exportSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>EXPORT COMPLETE & INJECTED!</span>
                </>
              ) : isExporting ? (
                <span>PROCESSING...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>EXPORT & INGEST TO SHOT {String(targetShotIndex + 1).padStart(3, '0')}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
