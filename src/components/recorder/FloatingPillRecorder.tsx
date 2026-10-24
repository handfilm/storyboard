/**
 * @file /src/components/recorder/FloatingPillRecorder.tsx
 * @description Isolated Draggable "Red-Pill" Screen Recorder Widget for HANDFILM.
 * 
 * Features:
 * 1. Self-Excluding Floating Pill Widget:
 *    - Collapsed: Ultra-compact, draggable pill (`w-36 h-9 rounded-full bg-[#120507]/90 border border-red-500/40 backdrop-blur-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-between px-3 z-[9999] cursor-grab active:cursor-grabbing`).
 *    - Pulsing Red Dot: `● REC`, Timecode `00:00`, Expand Caret `▾`.
 * 2. Draggable Viewport Physics:
 *    - Full pointer event tracking (`setPointerCapture`) with viewport boundary clamping.
 *    - Defaults to bottom-right floating above the transport dock.
 * 3. Expanded Tactical Strip:
 *    - Pause / Resume toggle [ ❚❚ Pause / ▶ Resume ]
 *    - Microphone Toggle (On/Off)
 *    - Commit Action [ ■ Stop & Send to Cut ]
 *    - Direct-to-IndexedDB master vault routing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  screenRecorderEngine, 
  RecorderTelemetry, 
  RecordedCaptureResult 
} from '../../services/screenRecorderEngine';
import { 
  Pause, 
  Play, 
  Square, 
  Mic, 
  MicOff, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sparkles,
  Scissors
} from 'lucide-react';

export interface FloatingPillRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (result: RecordedCaptureResult) => void;
  className?: string;
}

export const FloatingPillRecorder: React.FC<FloatingPillRecorderProps> = ({
  isOpen,
  onClose,
  onRecordingComplete,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<RecorderTelemetry['status']>('idle');
  const [telemetry, setTelemetry] = useState<RecorderTelemetry>({
    durationSec: 0,
    timecode: '00:00:00:00',
    fps: 60,
    totalBytes: 0,
    status: 'idle',
    activeCodec: '',
    resolution: '3840x2160',
    multiAngleMode: 'screen-cam-pip',
    hasCamera: false
  });
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Position state (defaults to bottom right above transport dock)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(16, window.innerWidth - 180),
        y: Math.max(16, window.innerHeight - 100)
      };
    }
    return { x: 300, y: 300 };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0
  });
  const hasMovedRef = useRef(false);
  const pillRef = useRef<HTMLDivElement>(null);

  // Sync recorder telemetry and status
  useEffect(() => {
    const unsubTelemetry = screenRecorderEngine.onTelemetry((t) => {
      setTelemetry(t);
    });
    const unsubStatus = screenRecorderEngine.onStatusChange((s) => {
      setStatus(s);
    });

    return () => {
      unsubTelemetry();
      unsubStatus();
    };
  }, []);

  // Update bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - 180),
        y: Math.min(prev.y, window.innerHeight - 80)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format short MM:SS timecode for collapsed pill
  const formatShortTime = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Drag Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position.x,
      startY: position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasMovedRef.current = true;
    }

    const newX = Math.max(12, Math.min(window.innerWidth - (isExpanded ? 340 : 160), dragStartRef.current.startX + deltaX));
    const newY = Math.max(12, Math.min(window.innerHeight - 60, dragStartRef.current.startY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePillClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.stopPropagation();
      return;
    }
    // If not dragging, toggle expanded view
    setIsExpanded((prev) => !prev);
  };

  // Controls
  const handleToggleRecord = async () => {
    setErrorMsg(null);
    if (status === 'idle') {
      try {
        await screenRecorderEngine.startRecording({
          resolution: '4K',
          format: 'webm',
          captureMicrophone: isMicEnabled,
          captureSystemAudio: true
        });
      } catch (err: any) {
        setErrorMsg(err?.message || 'Screen capture permission cancelled');
        setTimeout(() => setErrorMsg(null), 3000);
      }
    } else if (status === 'recording') {
      screenRecorderEngine.pauseRecording();
    } else if (status === 'paused') {
      screenRecorderEngine.resumeRecording();
    }
  };

  const handleStopAndSendToCut = async () => {
    try {
      const result = await screenRecorderEngine.stopRecording();
      if (result) {
        onRecordingComplete(result);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to finish recording');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  if (!isOpen) return null;

  const isRecording = status === 'recording';
  const isPaused = status === 'paused';

  return (
    <div
      ref={pillRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      }}
      className={`fixed z-[9999] select-none font-mono transition-shadow duration-200 ${
        isExpanded ? 'w-auto' : 'w-36 h-9'
      } ${className}`}
    >
      {/* Collapsed Pill State */}
      {!isExpanded ? (
        <div
          onClick={handlePillClick}
          className="w-36 h-9 rounded-full bg-[#120507]/90 border border-red-500/40 backdrop-blur-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-between px-3 cursor-grab active:cursor-grabbing hover:border-red-500 hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording
                  ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'
                  : isPaused
                  ? 'bg-amber-400'
                  : 'bg-red-500/60'
              }`}
            />
            <span className="text-[11px] font-bold text-red-300 tracking-wider">
              {isRecording ? 'REC' : isPaused ? 'PAUSE' : 'STANDBY'}
            </span>
          </div>

          <span className="text-[11px] font-bold text-white tabular-nums">
            {formatShortTime(telemetry.durationSec)}
          </span>

          <ChevronDown className="w-3 h-3 text-red-400/80 shrink-0" />
        </div>
      ) : (
        /* Expanded Tactical Strip */
        <div className="rounded-full bg-[#120507]/95 border border-red-500/50 backdrop-blur-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] px-3 py-1.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing">
          {/* Header & Status Indicator */}
          <div className="flex items-center gap-2 pr-2 border-r border-red-500/30">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-bold text-white tabular-nums tracking-wider">
              {formatShortTime(telemetry.durationSec)}
            </span>
          </div>

          {/* Pause / Resume Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRecord();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            title={isRecording ? 'Pause Recording' : isPaused ? 'Resume Recording' : 'Start Recording'}
          >
            {isRecording ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>

          {/* Mic Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMicEnabled((v) => !v);
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMicEnabled
                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white'
            }`}
            title={isMicEnabled ? 'Microphone Active' : 'Microphone Muted'}
          >
            {isMicEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </button>

          {/* Stop & Send to Cut Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStopAndSendToCut();
            }}
            className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-all active:scale-95 whitespace-nowrap"
            title="Stop recording and send directly to timeline cut"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Send to Cut</span>
          </button>

          {/* Collapse Caret */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white cursor-pointer ml-1"
            title="Collapse Pill"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Dismiss / Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (status !== 'idle') {
                screenRecorderEngine.cancelRecording();
              }
              onClose();
            }}
            className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white cursor-pointer"
            title="Close Recorder"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error notification banner if permission was declined */}
      {errorMsg && (
        <div className="absolute top-full left-0 mt-2 px-3 py-1 bg-red-950/90 border border-red-500 text-red-200 text-[10px] rounded-lg shadow-xl whitespace-nowrap animate-in fade-in duration-150">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
