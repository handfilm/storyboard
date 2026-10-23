/**
 * @file /src/components/recorder/ScreenRecorderFloatingBar.tsx
 * @description Floating Aqua-Glass Screen Recorder Control Dock with live 4K/60fps telemetry.
 */

import React, { useState, useEffect } from 'react';
import { 
  screenRecorderEngine, 
  CaptureResolution, 
  RecordingContainerFormat, 
  RecorderTelemetry, 
  RecordedCaptureResult 
} from '../../services/screenRecorderEngine';
import { 
  Circle, 
  Square, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  MousePointer, 
  X, 
  Activity, 
  HardDrive, 
  Clock, 
  Video, 
  Settings2,
  ChevronDown
} from 'lucide-react';

export interface ScreenRecorderFloatingBarProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (result: RecordedCaptureResult) => void;
  className?: string;
}

export const ScreenRecorderFloatingBar: React.FC<ScreenRecorderFloatingBarProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
  className = ''
}) => {
  const [resolution, setResolution] = useState<CaptureResolution>('4K');
  const [format, setFormat] = useState<RecordingContainerFormat>('webm');
  const [systemAudio, setSystemAudio] = useState<boolean>(true);
  const [microphone, setMicrophone] = useState<boolean>(false);
  const [mouseClicks, setMouseClicks] = useState<boolean>(true);
  const [status, setStatus] = useState<RecorderTelemetry['status']>('idle');
  const [telemetry, setTelemetry] = useState<RecorderTelemetry>({
    durationSec: 0,
    timecode: '00:00:00:00',
    fps: 60,
    totalBytes: 0,
    status: 'idle',
    activeCodec: '',
    resolution: '3840x2160'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to recorder engine state
  useEffect(() => {
    const unsubTelemetry = screenRecorderEngine.onTelemetry((t) => setTelemetry(t));
    const unsubStatus = screenRecorderEngine.onStatusChange((s) => setStatus(s));

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, []);

  // Mouse click pulse visualizer
  useEffect(() => {
    if (!mouseClicks || status !== 'recording') return;

    const handlePointerDown = (e: MouseEvent) => {
      const circle = document.createElement('div');
      circle.className = 'fixed pointer-events-none z-[99999] rounded-full border-2 border-[#F5A623] bg-[#F5A623]/25 shadow-[0_0_12px_rgba(245,166,35,0.8)] animate-ping';
      const size = 32;
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.left = `${e.clientX - size / 2}px`;
      circle.style.top = `${e.clientY - size / 2}px`;
      document.body.appendChild(circle);

      setTimeout(() => {
        circle.remove();
      }, 600);
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [mouseClicks, status]);

  if (!isOpen) return null;

  const handleStart = async () => {
    setErrorMessage(null);
    try {
      await screenRecorderEngine.startRecording({
        resolution,
        format,
        captureSystemAudio: systemAudio,
        captureMicrophone: microphone,
        visualizeMouseClicks: mouseClicks
      });
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setErrorMessage(err.message || 'Failed to start screen capture');
      }
    }
  };

  const handlePauseResume = () => {
    if (status === 'recording') {
      screenRecorderEngine.pauseRecording();
    } else if (status === 'paused') {
      screenRecorderEngine.resumeRecording();
    }
  };

  const handleStop = async () => {
    try {
      const result = await screenRecorderEngine.stopRecording();
      if (result) {
        onRecordingComplete(result);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error stopping capture');
    }
  };

  const [showHotkeys, setShowHotkeys] = useState(false);

  // Global Precision Hotkey Matrix for Screen Recorder with input guard
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Shift + R: Start / Pause / Resume
      if (e.shiftKey && e.key.toUpperCase() === 'R') {
        e.preventDefault();
        if (status === 'idle') {
          handleStart();
        } else {
          handlePauseResume();
        }
      }

      // Shift + S: Stop & Launch Trimmer
      if (e.shiftKey && e.key.toUpperCase() === 'S') {
        e.preventDefault();
        if (status === 'recording' || status === 'paused') {
          handleStop();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status, resolution, format, systemAudio, microphone, mouseClicks]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1000 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  const isCapturing = status === 'recording' || status === 'paused';

  return (
    <aside 
      aria-label="Screen Recorder Control Dock"
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-2xl px-4 select-none ${className}`}
    >
      <div className="bg-[#0c0d10]/95 border border-[#F5A623]/40 shadow-2xl backdrop-blur-2xl rounded-2xl p-3 text-white font-mono flex flex-col gap-2.5">
        {/* Top Header & Telemetry Row */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-lg border border-[#F5A623]/30">
              <span className={`w-2 h-2 rounded-full ${
                status === 'recording'
                  ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,1)]'
                  : status === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`} />
              <span className="font-bold text-[#F5A623] tracking-wider text-[11px]">
                {status === 'recording' ? 'LIVE 4K CAPTURE' : status === 'paused' ? 'RECORDING PAUSED' : '4K SCREEN RECORDER'}
              </span>
            </div>

            {/* Resolution indicator */}
            <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {telemetry.resolution || (resolution === '4K' ? '3840x2160' : '1920x1080')}
            </span>
          </div>

          {/* Right Live Telemetry */}
          <div className="flex items-center gap-2.5 text-[11px]">
            {isCapturing && (
              <>
                <div className="flex items-center gap-1 text-zinc-300">
                  <Clock className="w-3 h-3 text-[#F5A623]" />
                  <span className="font-bold text-[#FFE066] tabular-nums">{telemetry.timecode}</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>{telemetry.fps} FPS</span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <HardDrive className="w-3 h-3 text-sky-400" />
                  <span>{formatBytes(telemetry.totalBytes)}</span>
                </div>
              </>
            )}

            {/* Floating HOTKEYS HUD Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHotkeys(!showHotkeys)}
                className="px-2 py-0.5 rounded bg-[#F5A623]/15 hover:bg-[#F5A623]/30 border border-[#F5A623]/40 text-[#FFE066] font-mono text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                title="View recording keyboard shortcuts"
              >
                <span>⌨ HOTKEYS</span>
              </button>

              {showHotkeys && (
                <div 
                  className="absolute right-0 top-7 z-50 w-64 bg-[#0a0b12] border border-[#F5A623]/50 rounded-xl p-3 shadow-2xl text-[10px] font-mono flex flex-col gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-white font-bold border-b border-white/10 pb-1">
                    <span>RECORDER SHORTCUTS</span>
                    <button onClick={() => setShowHotkeys(false)} className="text-neutral-400 hover:text-white">×</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Start / Pause / Resume</span>
                    <span className="bg-black/60 px-1.5 py-0.5 rounded text-[#FFE066] border border-white/10">Shift + R</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Stop & Launch Trimmer</span>
                    <span className="bg-black/60 px-1.5 py-0.5 rounded text-rose-300 border border-white/10">Shift + S</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isCapturing}
              className={`p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ${
                isCapturing ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Close Recorder Dock"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-600/40 px-2.5 py-1 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3 text-xs flex-wrap sm:flex-nowrap">
          {/* Left: Resolution & Format Segmented Buttons */}
          <div className="flex items-center gap-1.5">
            {!isCapturing ? (
              <>
                {/* Resolution Selectors */}
                <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  {(['4K', '1080p', 'window'] as CaptureResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        resolution === res
                          ? 'bg-[#F5A623] text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {res === '4K' ? '4K UHD' : res === '1080p' ? '1080p' : 'Window'}
                    </button>
                  ))}
                </div>

                {/* Format Selector: WebM vs MP4 */}
                <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setFormat('webm')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      format === 'webm'
                        ? 'bg-[#F5A623] text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Hardware AV1/VP9 WebM (Zero-copy native)"
                  >
                    WebM
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('mp4')}
                    className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      format === 'mp4'
                        ? 'bg-[#F5A623] text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Hollywood NLE H.264 MP4"
                  >
                    MP4
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-zinc-300 text-xs">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Recording in progress: <strong className="text-[#F5A623]">{format.toUpperCase()}</strong></span>
              </div>
            )}
          </div>

          {/* Center: Audio & Mouse Toggles */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-lg border border-white/10">
            {/* System Audio Toggle */}
            <button
              type="button"
              onClick={() => !isCapturing && setSystemAudio(!systemAudio)}
              disabled={isCapturing}
              className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] transition-all ${
                systemAudio
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              } ${isCapturing ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
              title="System Audio Passthrough"
            >
              {systemAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">System</span>
            </button>

            {/* Studio Mic Toggle */}
            <button
              type="button"
              onClick={() => !isCapturing && setMicrophone(!microphone)}
              disabled={isCapturing}
              className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] transition-all ${
                microphone
                  ? 'bg-amber-950/80 text-[#FFE066] border border-amber-600/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              } ${isCapturing ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
              title="Studio Mic (Dynamic Compressor)"
            >
              {microphone ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Mic</span>
            </button>

            {/* Mouse Visualizer Toggle */}
            <button
              type="button"
              onClick={() => setMouseClicks(!mouseClicks)}
              className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] cursor-pointer transition-all ${
                mouseClicks
                  ? 'bg-sky-950/80 text-sky-300 border border-sky-600/50'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Mouse Click Circle Pulse Visualizer"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clicks</span>
            </button>
          </div>

          {/* Right: Record / Pause / Stop Transport Action */}
          <div className="flex items-center gap-2">
            {!isCapturing ? (
              <button
                type="button"
                onClick={handleStart}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.5)] cursor-pointer active:scale-95 transition-all text-xs"
              >
                <Circle className="w-3.5 h-3.5 fill-current" />
                <span>⏺ REC</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono border border-white/20">Shift+R</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all text-xs"
                >
                  {status === 'recording' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>PAUSE</span>
                      <span className="text-[9px] bg-black/30 px-1 py-0.5 rounded font-mono">Shift+R</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>RESUME</span>
                      <span className="text-[9px] bg-black/30 px-1 py-0.5 rounded font-mono">Shift+R</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStop}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.6)] cursor-pointer active:scale-95 transition-all text-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>⏹ STOP</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono border border-white/20">Shift+S</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
