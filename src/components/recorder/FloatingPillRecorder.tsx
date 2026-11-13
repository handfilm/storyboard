/**
 * @file /src/components/recorder/FloatingPillRecorder.tsx
 * @description Brutalist Pro Screen Recorder Studio, Draggable Live HUD & Capture Save Deck.
 *
 * State Machine:
 *   idle -> countdown (optional 3s) -> recording <-> paused -> processing -> ready (Preview & Save Deck)
 *
 * Syncs with `screenRecorderEngine.onCaptureComplete` so browser-native "Stop sharing"
 * cleanly exits active recording and opens the 4-option Capture Preview & Save Deck.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  screenRecorderEngine,
  RecorderTelemetry,
  RecordedCaptureResult,
  FpsPreset,
  DisplaySurfacePreference,
  downloadRecordedCapture
} from '../../services/screenRecorderEngine';
import { studioDraftDb } from '../../services/db';
import { useStudioStore } from '../../core/store';
import {
  Pause,
  Play,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  VideoOff,
  Monitor,
  AppWindow,
  Globe,
  Download,
  Film,
  PlusCircle,
  HardDrive,
  Scissors,
  RotateCcw,
  X,
  Check,
  Loader2
} from 'lucide-react';

export interface FloatingPillRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (result: RecordedCaptureResult) => void;
  onCommittedToShot?: (mediaUrl: string, shotIndex: number, result: RecordedCaptureResult) => void;
  onOpenTrimmer?: (result: RecordedCaptureResult) => void;
  className?: string;
}

export const FloatingPillRecorder: React.FC<FloatingPillRecorderProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
  onCommittedToShot,
  onOpenTrimmer,
  className = ''
}) => {
  const activeShotIndex = useStudioStore((s) => s.activeShotIndex);

  const [status, setStatus] = useState<RecorderTelemetry['status']>(() => screenRecorderEngine.getStatus());
  const [telemetry, setTelemetry] = useState<RecorderTelemetry>({
    durationSec: 0,
    timecode: '00:00:00:00',
    fps: 60,
    totalBytes: 0,
    status: 'idle',
    activeCodec: '',
    resolution: '1920x1080',
    multiAngleMode: 'screen-only',
    hasCamera: false,
    audioLevel: 0,
    countdownRemainingSec: 0
  });

  // Matrix configuration state
  const [sourceSurface, setSourceSurface] = useState<DisplaySurfacePreference>('monitor');
  const [fpsPreset, setFpsPreset] = useState<FpsPreset>('1080p60');
  const [systemAudio, setSystemAudio] = useState<boolean>(true);
  const [micEnabled, setMicEnabled] = useState<boolean>(false);
  const [webcamPip, setWebcamPip] = useState<boolean>(false);
  const [useCountdown, setUseCountdown] = useState<boolean>(true);

  // Ready / Save Deck state
  const [captureResult, setCaptureResult] = useState<RecordedCaptureResult | null>(() =>
    screenRecorderEngine.getLastCaptureResult()
  );
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [mp4Progress, setMp4Progress] = useState<{ active: boolean; pct: number; msg: string }>({
    active: false,
    pct: 0,
    msg: ''
  });
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Draggable viewport positioning
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, Math.round(window.innerWidth / 2 - 220)),
        y: Math.max(16, window.innerHeight - 360)
      };
    }
    return { x: 240, y: 200 };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to deterministic state machine & capture completion
  useEffect(() => {
    const unsubTelemetry = screenRecorderEngine.onTelemetry((t) => {
      setTelemetry(t);
    });
    const unsubStatus = screenRecorderEngine.onStatusChange((s) => {
      setStatus(s);
    });
    const unsubComplete = screenRecorderEngine.onCaptureComplete((res) => {
      setCaptureResult(res);
      setStatus('ready');
      onRecordingComplete(res);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
      unsubComplete();
    };
  }, [onRecordingComplete]);

  // Manage preview ObjectURL cleanly
  useEffect(() => {
    if (!captureResult) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(captureResult.blob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [captureResult]);

  // Clamp position on viewport resize or panel sizing change
  useEffect(() => {
    const clampPos = () => {
      if (typeof window === 'undefined') return;
      const widthEstimate = status === 'recording' || status === 'paused' ? 380 : 460;
      const heightEstimate = status === 'ready' ? 430 : status === 'idle' ? 310 : 120;
      setPosition((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - widthEstimate, prev.x)),
        y: Math.max(12, Math.min(window.innerHeight - heightEstimate, prev.y))
      }));
    };
    clampPos();
    window.addEventListener('resize', clampPos);
    return () => window.removeEventListener('resize', clampPos);
  }, [status, isOpen]);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 2600);
  };

  const formatShortTime = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0.0 MB';
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  // Drag handlers on header handle
  const handleDragPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, video')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position.x,
      startY: position.y
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    const panelW = containerRef.current?.offsetWidth || 440;
    const panelH = containerRef.current?.offsetHeight || 280;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - panelW - 8, dragStartRef.current.startX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - panelH - 8, dragStartRef.current.startY + dy))
    });
  };

  const handleDragPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Recording actions
  const handleStartRecording = async () => {
    setErrorMsg(null);
    setCaptureResult(null);
    try {
      await screenRecorderEngine.startRecording({
        sourceSurface,
        fpsPreset,
        resolution: fpsPreset === '4K30' ? '4K' : sourceSurface === 'window' ? 'window' : '1080p',
        format: 'webm',
        captureSystemAudio: systemAudio,
        captureMicrophone: micEnabled,
        enableCamera: webcamPip,
        initialMultiAngleMode: webcamPip ? 'screen-cam-pip' : 'screen-only',
        countdownSec: useCountdown ? 3 : 0
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Screen capture permission declined';
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  const handleTogglePauseResume = () => {
    if (status === 'recording') {
      screenRecorderEngine.pauseRecording();
    } else if (status === 'paused') {
      screenRecorderEngine.resumeRecording();
    }
  };

  const handleStopAndFinalize = async () => {
    setErrorMsg(null);
    try {
      const res = await screenRecorderEngine.stopRecording();
      if (res) {
        setCaptureResult(res);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to finalize recording');
    }
  };

  // 4 Save/Route Options
  const handleDownloadWebm = () => {
    if (!captureResult) return;
    downloadRecordedCapture(captureResult, activeShotIndex);
    showToast('Downloaded .WEBM master');
  };

  const handleExportMp4 = async () => {
    if (!captureResult || mp4Progress.active) return;
    setErrorMsg(null);
    setMp4Progress({ active: true, pct: 5, msg: 'Preparing MP4...' });
    try {
      const mp4Result = await screenRecorderEngine.convertRecordingToMp4(captureResult, (pct, msg) => {
        setMp4Progress({ active: true, pct, msg });
      });
      downloadRecordedCapture(mp4Result, activeShotIndex);
      setMp4Progress({ active: false, pct: 100, msg: '' });
      showToast('Exported H.264 .MP4');
    } catch (err: unknown) {
      setMp4Progress({ active: false, pct: 0, msg: '' });
      setErrorMsg(err instanceof Error ? err.message : 'MP4 conversion unavailable');
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  const handleAddToShot = async () => {
    if (!captureResult) return;
    try {
      const file = new File(
        [captureResult.blob],
        `HANDFILM_REC_SH${String(activeShotIndex + 1).padStart(3, '0')}_${Date.now()}.${captureResult.format}`,
        { type: captureResult.mimeType }
      );
      const vaultItem = await studioDraftDb.saveMediaToVault(file);
      await studioDraftDb.assignMediaToShot(vaultItem.id, activeShotIndex);
      const url = studioDraftDb.getActiveMediaUrl(vaultItem.id, vaultItem.blob);
      useStudioStore.getState().updateShot(activeShotIndex, {
        imageUrl: url,
        isVideo: true,
        title: `REC SHOT ${String(activeShotIndex + 1).padStart(3, '0')}`
      });
      onCommittedToShot?.(url, activeShotIndex, captureResult);
      showToast(`Routed to SH${String(activeShotIndex + 1).padStart(2, '0')}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to inject recording into shot');
    }
  };

  const handleSaveToVault = async () => {
    if (!captureResult) return;
    try {
      const file = new File(
        [captureResult.blob],
        `VAULT_REC_${Date.now()}.${captureResult.format}`,
        { type: captureResult.mimeType }
      );
      await studioDraftDb.saveMediaToVault(file);
      showToast('Saved to Project Vault');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save recording to Vault');
    }
  };

  const handleNewRecording = () => {
    setCaptureResult(null);
    setMp4Progress({ active: false, pct: 0, msg: '' });
    screenRecorderEngine.resetToIdle();
  };

  const handleDismiss = () => {
    if (status === 'recording' || status === 'paused') {
      screenRecorderEngine.cancelRecording();
    } else if (status === 'countdown') {
      screenRecorderEngine.cancelCountdown();
    } else if (status === 'ready') {
      screenRecorderEngine.resetToIdle();
      setCaptureResult(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';
  const isProcessing = status === 'processing';
  const isCountdown = status === 'countdown';
  const isReady = status === 'ready' && Boolean(captureResult);
  const audioLevel = telemetry.audioLevel ?? 0;

  return (
    <div
      ref={containerRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      data-testid="screen-recorder-studio"
      data-recorder-status={status}
      className={`fixed z-[9999] select-none font-mono ${className}`}
    >
      {/* 1. LIVE RECORDING / PAUSED / PROCESSING FLOATING HUD */}
      {(isRecording || isPaused || isProcessing) && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          className="w-[410px] rounded-xl bg-[#0A0A0E]/95 border border-rose-500/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(229,9,20,0.3)] px-3 py-2 cursor-grab active:cursor-grabbing flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isRecording
                    ? 'bg-[#E50914] animate-pulse shadow-[0_0_10px_#E50914]'
                    : isProcessing
                    ? 'bg-cyan-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-[11px] font-black tracking-widest uppercase text-white whitespace-nowrap">
                {isRecording ? 'REC LIVE' : isProcessing ? 'FINALIZING' : 'PAUSED'}
              </span>
              <span className="text-xs font-black text-amber-300 tabular-nums whitespace-nowrap">
                {formatShortTime(telemetry.durationSec)}
              </span>
              <span className="text-[10px] text-neutral-400 tabular-nums whitespace-nowrap">
                {telemetry.fps}fps · {formatBytes(telemetry.totalBytes)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isProcessing && (
                <button
                  type="button"
                  onClick={handleTogglePauseResume}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  title={isRecording ? 'Pause Recording' : 'Resume Recording'}
                >
                  {isRecording ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isRecording ? 'PAUSE' : 'RESUME'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStopAndFinalize}
                disabled={isProcessing}
                data-testid="recorder-stop-finalize"
                className="px-2.5 py-1 rounded bg-[#E50914] hover:bg-rose-500 disabled:opacity-60 text-white text-[10px] font-black tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(229,9,20,0.5)]"
              >
                {isProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Square className="w-2.5 h-2.5 fill-current" />
                )}
                <span>{isProcessing ? 'SAVING...' : 'STOP & FINALIZE'}</span>
              </button>
            </div>
          </div>

          {/* Live Audio VU Meter */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
              AUDIO VU
            </span>
            <div className="flex-1 h-1.5 bg-neutral-900 rounded-full overflow-hidden flex gap-0.5 p-[1px] border border-white/10">
              {Array.from({ length: 20 }).map((_, i) => {
                const segThreshold = ((i + 1) / 20) * 100;
                const lit = audioLevel >= segThreshold;
                const barColor = i >= 16 ? 'bg-rose-500' : i >= 12 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <span
                    key={i}
                    className={`flex-1 h-full rounded-[1px] transition-opacity duration-75 ${
                      lit ? barColor : 'bg-neutral-800'
                    }`}
                  />
                );
              })}
            </div>
            <span className="text-[9px] text-neutral-400 tabular-nums w-7 text-right">
              {audioLevel}%
            </span>
          </div>
        </div>
      )}

      {/* 2. 3-SECOND COUNTDOWN HUD */}
      {isCountdown && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          className="w-[320px] rounded-xl bg-[#0A0A0E]/95 border border-amber-400/60 backdrop-blur-2xl shadow-2xl p-4 flex items-center justify-between gap-3 cursor-grab"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400 text-black font-black text-xl flex items-center justify-center tabular-nums shadow-[0_0_16px_rgba(245,166,35,0.5)]">
              {telemetry.countdownRemainingSec || 3}
            </div>
            <div>
              <div className="text-[11px] font-black text-amber-300 tracking-widest uppercase">
                ARMING CAPTURE
              </div>
              <div className="text-[10px] text-neutral-400">
                {fpsPreset} · {sourceSurface.toUpperCase()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => screenRecorderEngine.cancelCountdown()}
            className="px-2.5 py-1 rounded bg-white/10 hover:bg-rose-600 text-white text-[10px] font-bold uppercase cursor-pointer whitespace-nowrap"
          >
            ABORT
          </button>
        </div>
      )}

      {/* 3. PRE-RECORD STUDIO MATRIX (IDLE) */}
      {status === 'idle' && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          className="w-[450px] rounded-xl bg-[#08090D]/95 border border-white/15 backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header Bar */}
          <div className="px-3.5 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
              <span className="text-[11px] font-black tracking-[0.16em] uppercase text-white">
                SCREEN RECORDER STUDIO
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
              title="Close Screen Recorder"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 flex flex-col gap-3">
            {/* Capture Surface Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                CAPTURE SOURCE
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'monitor', label: 'Screen', icon: Monitor },
                  { id: 'window', label: 'Window', icon: AppWindow },
                  { id: 'browser', label: 'Tab', icon: Globe }
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  const active = sourceSurface === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSourceSurface(opt.id)}
                      className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio + Webcam PiP Matrix */}
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                AUDIO & OVERLAY MATRIX
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSystemAudio((v) => !v)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    systemAudio
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                      : 'bg-white/[0.03] border-white/10 text-neutral-500'
                  }`}
                >
                  {systemAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>Sys Audio</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMicEnabled((v) => !v)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    micEnabled
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-white/[0.03] border-white/10 text-neutral-500'
                  }`}
                >
                  {micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>Mic In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWebcamPip((v) => !v)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    webcamPip
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                      : 'bg-white/[0.03] border-white/10 text-neutral-500'
                  }`}
                >
                  {webcamPip ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  <span>Cam PiP</span>
                </button>
              </div>
            </div>

            {/* Resolution & FPS Preset + Countdown Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-black/70 p-0.5 rounded-lg border border-white/10">
                {([
                  { id: '1080p60', label: '1080p 60' },
                  { id: '4K30', label: '4K 30' },
                  { id: '24fps', label: '24fps Cine' }
                ] as const).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setFpsPreset(preset.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer whitespace-nowrap ${
                      fpsPreset === preset.id
                        ? 'bg-amber-400 text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setUseCountdown((v) => !v)}
                className={`px-2 py-1 rounded border text-[10px] font-bold uppercase cursor-pointer whitespace-nowrap ${
                  useCountdown
                    ? 'bg-white/10 border-white/25 text-white'
                    : 'bg-transparent border-white/10 text-neutral-500'
                }`}
              >
                {useCountdown ? '3s Timer: ON' : 'Instant'}
              </button>
            </div>

            {/* Start Capture CTA */}
            <button
              type="button"
              onClick={handleStartRecording}
              data-testid="recorder-start-button"
              className="w-full py-2.5 rounded-lg bg-[#E50914] hover:bg-rose-500 text-white text-xs font-black tracking-[0.15em] uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all active:scale-[0.99]"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>START SCREEN RECORDING</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. CAPTURE PREVIEW & 4-OPTION SAVE DECK (READY) */}
      {isReady && captureResult && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          data-testid="recorder-save-deck"
          className="w-[468px] rounded-xl bg-[#08090D]/95 border border-emerald-500/40 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.92)] overflow-hidden"
        >
          {/* Header */}
          <div className="px-3.5 py-2 bg-emerald-950/30 border-b border-emerald-500/25 flex items-center justify-between cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-black tracking-widest uppercase text-emerald-200">
                CAPTURE PREVIEW & SAVE DECK
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 tabular-nums whitespace-nowrap">
                {captureResult.width}×{captureResult.height} · {captureResult.durationSec.toFixed(1)}s · {formatBytes(captureResult.totalBytes)}
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                title="Close Save Deck"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video Playback Preview */}
          <div className="bg-black border-b border-white/10 relative aspect-video w-full overflow-hidden">
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
              />
            )}
          </div>

          {/* MP4 Transcode Progress Bar */}
          {mp4Progress.active && (
            <div className="px-3.5 py-1.5 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
              <div className="flex-1 h-1.5 bg-black/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{ width: `${mp4Progress.pct}%` }}
                />
              </div>
              <span className="text-[10px] text-cyan-200 whitespace-nowrap tabular-nums">
                {mp4Progress.pct}%
              </span>
            </div>
          )}

          {/* 4 Instant Saving & Routing Options */}
          <div className="p-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadWebm}
              className="py-2 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>DOWNLOAD .WEBM</span>
            </button>

            <button
              type="button"
              onClick={handleExportMp4}
              disabled={mp4Progress.active}
              className="py-2 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 border border-cyan-400/50 text-cyan-200 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Film className="w-3.5 h-3.5" />
              <span>{mp4Progress.active ? 'MUXING .MP4...' : 'EXPORT .MP4'}</span>
            </button>

            <button
              type="button"
              onClick={handleAddToShot}
              className="py-2 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-[0_0_16px_rgba(245,166,35,0.3)]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ ADD TO SH{String(activeShotIndex + 1).padStart(2, '0')}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToVault}
              className="py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>SAVE TO VAULT</span>
            </button>
          </div>

          {/* Secondary Row: Precision Trimmer & Record Again */}
          <div className="px-3 pb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onOpenTrimmer?.(captureResult)}
              className="flex-1 py-1.5 px-2.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-neutral-300 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Scissors className="w-3 h-3" />
              <span>OPEN TRIMMER</span>
            </button>

            <button
              type="button"
              onClick={handleNewRecording}
              className="flex-1 py-1.5 px-2.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-neutral-300 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>NEW RECORDING</span>
            </button>
          </div>
        </div>
      )}

      {/* Action / Error Toasts */}
      {actionToast && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-[10px] font-bold uppercase tracking-wider shadow-xl flex items-center gap-1.5">
          <Check className="w-3 h-3" />
          <span>{actionToast}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mt-2 px-3 py-1.5 rounded-lg bg-rose-950/95 border border-rose-500 text-rose-200 text-[10px] font-bold shadow-xl">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
