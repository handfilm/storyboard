/**
 * @file /src/components/recorder/QuickTrimPreviewModal.tsx
 * @description Instant Post-Capture Quick Trim Preview Modal with Dual-Handle Scrubber and Direct Vault Injection.
 */

import React, { useState, useRef, useEffect } from 'react';
import { RecordedCaptureResult } from '../../services/screenRecorderEngine';
import { videoTrimmerEngine } from '../../services/videoTrimmerEngine';
import { studioDraftDb } from '../../services/db';
import { 
  Play, 
  Pause, 
  Scissors, 
  Save, 
  Download, 
  RotateCcw, 
  X, 
  Check, 
  Clock, 
  Sparkles,
  ArrowRight,
  Film
} from 'lucide-react';

export interface QuickTrimPreviewModalProps {
  captureResult: RecordedCaptureResult | null;
  onClose: () => void;
  onOpenAdvancedTrimmer: (result: RecordedCaptureResult, initialInSec: number, initialOutSec: number) => void;
  onCommittedToVault?: (mediaId: string, shotIndex: number) => void;
  activeShotIndex?: number;
}

export const QuickTrimPreviewModal: React.FC<QuickTrimPreviewModalProps> = ({
  captureResult,
  onClose,
  onOpenAdvancedTrimmer,
  onCommittedToVault,
  activeShotIndex = 0
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1);
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [targetShot, setTargetShot] = useState<number>(activeShotIndex);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Instantiate object URL on result receipt
  useEffect(() => {
    if (!captureResult) {
      setVideoUrl('');
      return;
    }

    const url = URL.createObjectURL(captureResult.blob);
    setVideoUrl(url);
    const dur = Math.max(0.1, captureResult.durationSec);
    setDuration(dur);
    setStartSec(0);
    setEndSec(dur);
    setCurrentTime(0);
    setIsPlaying(false);
    setSaveSuccess(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [captureResult]);

  if (!captureResult || !videoUrl) return null;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Loop within trim boundaries
    if (t >= endSec) {
      videoRef.current.currentTime = startSec;
      if (!isPlaying) {
        videoRef.current.pause();
      }
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= endSec || currentTime < startSec) {
        videoRef.current.currentTime = startSec;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSetStartAtCurrent = () => {
    const val = Math.min(currentTime, endSec - 0.1);
    setStartSec(Math.max(0, val));
  };

  const handleSetEndAtCurrent = () => {
    const val = Math.max(currentTime, startSec + 0.1);
    setEndSec(Math.min(duration, val));
  };

  const formatTimecode = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 24);
    const ff = totalFrames % 24;
    const ss = Math.floor(seconds) % 60;
    const mm = Math.floor(seconds / 60) % 60;
    const hh = Math.floor(seconds / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  // Direct Save & Commit to IndexedDB media_vault
  const handleSaveAndCommit = async () => {
    setIsSaving(true);
    try {
      // If full duration is kept without cuts, commit raw blob directly
      const isUncut = startSec <= 0.05 && endSec >= duration - 0.05;
      let finalBlob = captureResult.blob;

      if (!isUncut) {
        // Perform quick trim
        const trimResult = await videoTrimmerEngine.exportTrimmedVideo(
          captureResult.blob,
          [
            {
              id: 'quick-trim-seg',
              name: 'Quick Trim',
              startTime: startSec,
              endTime: endSec,
              duration: endSec - startSec
            }
          ],
          {
            format: captureResult.format,
            mergeIntoOne: true,
            applyAudioMicroFade: true
          }
        );
        finalBlob = trimResult.blob;
      }

      const fileName = `Capture_SH${String(targetShot + 1).padStart(3, '0')}_${Date.now()}.${captureResult.format}`;
      const vaultItem = await studioDraftDb.saveMediaToVault(finalBlob, fileName);
      await studioDraftDb.assignMediaToShot(vaultItem.id, targetShot);

      setSaveSuccess(true);
      onCommittedToVault?.(vaultItem.id, targetShot);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[QuickTrim] Error saving to vault:', err);
      setIsSaving(false);
    }
  };

  const [showHotkeys, setShowHotkeys] = useState<boolean>(false);

  // Keyboard navigation & trimming hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Space: Toggle Play
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
        return;
      }

      // I / O: Set Start / End Boundaries
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        handleSetStartAtCurrent();
        return;
      }
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        handleSetEndAtCurrent();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!videoRef.current) return;
        const forward = e.key === 'ArrowRight';
        let step = 1 / 24; // 1 frame
        if (e.shiftKey) {
          step = 1.0; // 1 second
        } else if (e.ctrlKey || e.metaKey) {
          step = 5.0; // 5 seconds
        }

        const nextTime = forward
          ? Math.min(duration, (videoRef.current.currentTime || currentTime) + step)
          : Math.max(0, (videoRef.current.currentTime || currentTime) - step);

        videoRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, startSec, endSec, isPlaying]);

  // Primary Local Disk Download (.mp4)
  const handleDownloadToDisk = async () => {
    try {
      const isUncut = startSec <= 0.05 && endSec >= duration - 0.05;
      let finalBlob = captureResult.blob;

      if (!isUncut) {
        const trimResult = await videoTrimmerEngine.exportTrimmedVideo(
          captureResult.blob,
          [
            {
              id: 'dl-seg',
              name: 'Quick Trim',
              startTime: startSec,
              endTime: endSec,
              duration: endSec - startSec
            }
          ],
          {
            format: 'mp4',
            mergeIntoOne: true,
            applyAudioMicroFade: true
          }
        );
        finalBlob = trimResult.blob;
      }

      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `HANDFILM_REC_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 6000);
    } catch (err) {
      console.warn('[QuickTrim] Export fallback to raw blob download:', err);
      const dlUrl = URL.createObjectURL(captureResult.blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `HANDFILM_REC_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(dlUrl), 6000);
    }
  };

  // Download raw recording file
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `HANDFILM_REC_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const trimmedDuration = Math.max(0.1, endSec - startSec);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 select-none font-mono">
      <div className="w-full max-w-4xl bg-[#08090C] border border-[#F5A623]/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-fade-in">
        {/* Header Bar */}
        <div className="h-12 bg-[#0c0d12] border-b border-white/10 px-5 flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623] shadow-[0_0_8px_#F5A623]" />
            <span className="font-bold tracking-wider text-[#F5A623] text-sm">
              QUICK TRIM & VAULT COMMIT
            </span>
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {captureResult.width}x{captureResult.height} @ {captureResult.fps}FPS
            </span>
          </div>

          <div className="flex items-center gap-3">
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
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#0C0D14] border border-[#F5A623]/40 rounded-xl p-3 shadow-2xl z-50 text-[11px] text-zinc-300 flex flex-col gap-2 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="font-bold text-[#FFE066]">QUICK TRIM SHORTCUTS</span>
                    <button
                      type="button"
                      onClick={() => setShowHotkeys(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px]">
                    <span className="text-zinc-400">Play / Pause:</span>
                    <span className="text-white font-bold text-right">Space</span>

                    <span className="text-zinc-400">Set In Point:</span>
                    <span className="text-white font-bold text-right">I</span>

                    <span className="text-zinc-400">Set Out Point:</span>
                    <span className="text-white font-bold text-right">O</span>

                    <span className="text-zinc-400">Step 1 Frame:</span>
                    <span className="text-white font-bold text-right">← / → (1/24s)</span>

                    <span className="text-zinc-400">Shuttle 1.0s:</span>
                    <span className="text-white font-bold text-right">Shift + ← / →</span>

                    <span className="text-zinc-400">Scrub 5.0s:</span>
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
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Monitor Stage */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/10">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onClick={handleTogglePlay}
            playsInline
            className="max-h-full max-w-full object-contain cursor-pointer"
          />

          {/* Center Play overlay button when paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={handleTogglePlay}
              className="absolute w-14 h-14 rounded-full bg-black/70 hover:bg-[#F5A623] text-white hover:text-black border border-white/20 flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-md"
            >
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </button>
          )}

          {/* Timecode HUD Overlay */}
          <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded-md border border-white/15 text-[11px] text-[#FFE066] font-bold">
            {formatTimecode(currentTime)}
          </div>
        </div>

        {/* Scrubbing & In/Out Range Slider */}
        <div className="p-4 bg-[#0A0B10] flex flex-col gap-3">
          {/* Dual-Handle Trim Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">IN:</span>
                <span className="text-[#F5A623] font-bold">{formatTimecode(startSec)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">SELECTED DURATION:</span>
                <span className="text-emerald-400 font-bold">{trimmedDuration.toFixed(2)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">OUT:</span>
                <span className="text-[#F5A623] font-bold">{formatTimecode(endSec)}</span>
              </div>
            </div>

            {/* Range Scrubber Track */}
            <div className="relative h-7 bg-[#141520] border border-white/15 rounded-lg overflow-hidden flex items-center px-1">
              {/* Highlighted active in-out span */}
              <div
                className="absolute top-0 bottom-0 bg-[#F5A623]/25 border-x-2 border-[#F5A623] pointer-events-none"
                style={{
                  left: `${(startSec / duration) * 100}%`,
                  width: `${((endSec - startSec) / duration) * 100}%`
                }}
              />

              {/* Playhead needle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] pointer-events-none z-10"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />

              {/* Native range slider for playhead scrubbing */}
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
                className="w-full opacity-0 absolute inset-0 cursor-ew-resize z-20"
              />
            </div>
          </div>

          {/* Secondary Controls: Set Start / Set End buttons & Target Shot Selector */}
          <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetStartAtCurrent}
                className="px-2.5 py-1 bg-[#141520] hover:bg-[#202235] text-white rounded-lg border border-white/15 font-bold cursor-pointer transition-all active:scale-95 text-[10px]"
              >
                [ SET START ({formatTimecode(currentTime)}) ]
              </button>
              <button
                type="button"
                onClick={handleSetEndAtCurrent}
                className="px-2.5 py-1 bg-[#141520] hover:bg-[#202235] text-white rounded-lg border border-white/15 font-bold cursor-pointer transition-all active:scale-95 text-[10px]"
              >
                [ SET END ({formatTimecode(currentTime)}) ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartSec(0);
                  setEndSec(duration);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Reset Trim Boundaries"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Target Shot Selector */}
            <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-lg border border-white/10 text-[11px]">
              <Film className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-zinc-400">Assign to:</span>
              <select
                value={targetShot}
                onChange={(e) => setTargetShot(Number(e.target.value))}
                className="bg-[#12131C] text-[#FFE066] font-bold border border-white/20 rounded px-2 py-0.5 text-xs cursor-pointer outline-none"
              >
                {Array.from({ length: 100 }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    Shot {String(idx + 1).padStart(3, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-white/10 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAdvancedTrimmer(captureResult, startSec, endSec)}
                className="px-3 py-1.5 bg-[#F5A623]/15 hover:bg-[#F5A623]/25 text-[#FFE066] rounded-xl border border-[#F5A623]/40 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_10px_rgba(245,166,35,0.15)]"
              >
                <Scissors className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>✂ Advanced Trimmer</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Primary Download to Disk (.MP4) */}
              <button
                type="button"
                onClick={handleDownloadToDisk}
                className="px-4 py-2 bg-gradient-to-r from-[#00F0FF]/20 to-[#00F0FF]/10 hover:from-[#00F0FF]/30 hover:to-[#00F0FF]/20 text-[#00F0FF] rounded-xl border border-[#00F0FF]/50 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_14px_rgba(0,240,255,0.25)] active:scale-95"
              >
                <Download className="w-4 h-4 text-[#00F0FF]" />
                <span>⤓ DOWNLOAD TO DISK (.MP4)</span>
              </button>

              {/* Commit to Shot */}
              <button
                type="button"
                onClick={handleSaveAndCommit}
                disabled={isSaving || saveSuccess}
                className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white'
                    : isSaving
                    ? 'bg-amber-600 text-black opacity-80 cursor-wait'
                    : 'bg-[#F5A623] hover:bg-[#FFE066] text-black shadow-[0_0_16px_rgba(245,166,35,0.4)] cursor-pointer active:scale-95'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>COMMITTED TO SHOT {String(targetShot + 1).padStart(3, '0')}!</span>
                  </>
                ) : isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>SPLICING & INJECTING...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>COMMIT TO SHOT {String(targetShot + 1).padStart(3, '0')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
