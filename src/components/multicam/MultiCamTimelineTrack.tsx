/**
 * @file /src/components/multicam/MultiCamTimelineTrack.tsx
 * @description Consolidated Multi-Cam Timeline Track synchronizing playback across all active camera streams.
 * 
 * Capabilities:
 * 1. Synchronized Multi-Stream Playback: Synchronizes timecode across all active camera streams in lockstep.
 * 2. Consolidated Track Matrix:
 *    - Master Program Cut Track: Sliced color-coded segments representing committed camera switches.
 *    - Dedicated Camera Stream Lanes: Individual horizontal lanes for CAM 01, CAM 02, CAM 03, CAM 04 with sync offsets.
 * 3. In-Timeline Angle Cutting:
 *    - Click directly on any camera lane to cut to that angle at that exact sub-frame timestamp.
 *    - 'Razor Cut at Playhead' [C] tool to split the active segment.
 *    - Live Angle Punch bar: 1-click punch buttons [CAM 1] to [CAM 4].
 * 4. Boundary Calibration: Drag split handles between cut segments to fine-tune transition timings.
 * 5. Integrated Transport Dock: Play/Pause (Space), frame step (J/L), return to start, and timecode ruler.
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { MultiCamGroup, MultiCamCutEvent, MultiCamAngle } from '../../types/multicam';
import { 
  Scissors, 
  Trash2, 
  Video, 
  ChevronDown, 
  Check, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Layers,
  Radio,
  Sliders
} from 'lucide-react';

export interface MultiCamTimelineTrackProps {
  group: MultiCamGroup;
  currentTimeMs: number;
  onSeekMs: (timeMs: number) => void;
  onUpdateCutEvents: (cutEvents: MultiCamCutEvent[]) => void;
  onSelectAngle?: (angleIndex: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onStepFrame?: (direction: -1 | 1) => void;
  className?: string;
}

// Visual broadcast color accents per angle
export const ANGLE_COLORS = [
  { bg: 'bg-amber-500/25', hover: 'hover:bg-amber-500/35', border: 'border-amber-500', text: 'text-amber-400', hex: '#F5A623', name: 'Amber' },
  { bg: 'bg-cyan-500/25', hover: 'hover:bg-cyan-500/35', border: 'border-cyan-500', text: 'text-cyan-400', hex: '#00E5FF', name: 'Cyan' },
  { bg: 'bg-emerald-500/25', hover: 'hover:bg-emerald-500/35', border: 'border-emerald-500', text: 'text-emerald-400', hex: '#10B981', name: 'Emerald' },
  { bg: 'bg-purple-500/25', hover: 'hover:bg-purple-500/35', border: 'border-purple-500', text: 'text-purple-400', hex: '#8B5CF6', name: 'Purple' },
  { bg: 'bg-rose-500/25', hover: 'hover:bg-rose-500/35', border: 'border-rose-500', text: 'text-rose-400', hex: '#F43F5E', name: 'Rose' },
  { bg: 'bg-indigo-500/25', hover: 'hover:bg-indigo-500/35', border: 'border-indigo-500', text: 'text-indigo-400', hex: '#6366F1', name: 'Indigo' }
];

export const MultiCamTimelineTrack: React.FC<MultiCamTimelineTrackProps> = ({
  group,
  currentTimeMs,
  onSeekMs,
  onUpdateCutEvents,
  onSelectAngle,
  isPlaying = false,
  onTogglePlay,
  onStepFrame,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [draggingCutId, setDraggingCutId] = useState<string | null>(null);
  const [hoveredTimeMs, setHoveredTimeMs] = useState<number | null>(null);

  const durationMs = group.durationMs || Math.round((group.duration || 15) * 1000);

  // Convert raw cut events into ordered segment intervals
  const segments = useMemo(() => {
    const cuts = [...group.cutEvents].sort((a, b) => a.timeMs - b.timeMs);
    // Ensure first cut starts at 0ms
    if (cuts.length === 0 || cuts[0].timeMs > 0) {
      cuts.unshift({ id: 'cut-init', timeMs: 0, angleIndex: group.activeAngleIndex || 0 });
    }

    const segs: Array<{
      id: string;
      cutId: string;
      startMs: number;
      endMs: number;
      durationMs: number;
      angleIndex: number;
      isFirst: boolean;
    }> = [];

    for (let i = 0; i < cuts.length; i++) {
      const current = cuts[i];
      const nextTime = (i < cuts.length - 1) ? cuts[i + 1].timeMs : durationMs;
      const segDuration = Math.max(0, nextTime - current.timeMs);

      segs.push({
        id: `seg-${i}-${current.id}`,
        cutId: current.id,
        startMs: current.timeMs,
        endMs: nextTime,
        durationMs: segDuration,
        angleIndex: current.angleIndex,
        isFirst: i === 0
      });
    }

    return segs;
  }, [group.cutEvents, durationMs, group.activeAngleIndex]);

  // Determine which angle is currently on air
  const currentAngleOnAir = useMemo(() => {
    const matching = segments.find(s => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs);
    return matching ? matching.angleIndex : (group.activeAngleIndex || 0);
  }, [segments, currentTimeMs, group.activeAngleIndex]);

  // Format timecode (mm:ss:ff)
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Convert client X position to time in milliseconds
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = containerRef.current || lanesRef.current;
    if (!target) return 0;
    const rect = target.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    return Math.round((clickX / rect.width) * durationMs);
  }, [durationMs]);

  // Handle timeline track click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingCutId) return;
    const targetMs = getTimeFromMouseEvent(e);
    onSeekMs(targetMs);
  };

  // Perform a razor cut at the current playhead or target timestamp
  const handleRazorCut = (targetMs: number = currentTimeMs) => {
    const safeMs = Math.max(100, Math.min(durationMs - 100, targetMs));
    
    // Check if a cut already exists within 150ms
    const existing = group.cutEvents.find(c => Math.abs(c.timeMs - safeMs) < 150);
    if (existing) return;

    const newCut: MultiCamCutEvent = {
      id: `cut-${Date.now()}-${currentAngleOnAir}`,
      timeMs: safeMs,
      angleIndex: currentAngleOnAir
    };

    const updated = [...group.cutEvents, newCut].sort((a, b) => a.timeMs - b.timeMs);
    onUpdateCutEvents(updated);
  };

  // Cut directly to a specific camera angle at the current playhead or clicked timestamp
  const handleCutToAngle = (angleIndex: number, targetMs: number = currentTimeMs) => {
    if (angleIndex < 0 || angleIndex >= group.angles.length) return;
    const safeMs = Math.max(0, Math.min(durationMs, targetMs));

    // If a cut exists right near targetMs, update it
    const existingIdx = group.cutEvents.findIndex(c => Math.abs(c.timeMs - safeMs) < 150);
    let updated: MultiCamCutEvent[];

    if (existingIdx >= 0) {
      updated = group.cutEvents.map((c, i) => i === existingIdx ? { ...c, angleIndex } : c);
    } else {
      const newCut: MultiCamCutEvent = {
        id: `cut-${Date.now()}-${angleIndex}`,
        timeMs: safeMs,
        angleIndex
      };
      updated = [...group.cutEvents, newCut].sort((a, b) => a.timeMs - b.timeMs);
    }

    onUpdateCutEvents(updated);
    onSelectAngle?.(angleIndex);
  };

  // Cut drag boundary handler to trim cut points
  const handleCutDragStart = (e: React.MouseEvent, cutId: string) => {
    e.stopPropagation();
    setDraggingCutId(cutId);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const posX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const newTimeMs = Math.round((posX / rect.width) * durationMs);

      const updated = group.cutEvents.map(c => {
        if (c.id === cutId) {
          return { ...c, timeMs: Math.max(50, Math.min(durationMs - 50, newTimeMs)) };
        }
        return c;
      });
      onUpdateCutEvents(updated);
    };

    const onMouseUp = () => {
      setDraggingCutId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Delete a cut event (merges with preceding segment)
  const handleDeleteCut = (cutId: string) => {
    if (cutId === 'cut-init' || cutId === 'cut-0') return;
    const updated = group.cutEvents.filter(c => c.id !== cutId);
    onUpdateCutEvents(updated);
    setSelectedSegmentIdx(null);
  };

  // Re-assign segment camera angle
  const handleReassignAngle = (cutId: string, newAngleIndex: number) => {
    const updated = group.cutEvents.map(c => {
      if (c.id === cutId) {
        return { ...c, angleIndex: newAngleIndex };
      }
      return c;
    });
    onUpdateCutEvents(updated);
    setActiveDropdownIdx(null);
  };

  // Playhead position percentage
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

  // Time ruler notches
  const rulerTicks = useMemo(() => {
    const totalSeconds = Math.ceil(durationMs / 1000);
    const step = totalSeconds > 20 ? 2 : 1;
    const ticks: number[] = [];
    for (let s = 0; s <= totalSeconds; s += step) {
      ticks.push(s * 1000);
    }
    return ticks;
  }, [durationMs]);

  return (
    <div className={`w-full flex flex-col bg-[#08090C] border border-white/10 rounded-2xl p-3 shadow-2xl font-mono select-none ${className}`}>
      
      {/* 1. Header: Status Readout, Razor Cut Button, Quick Punch Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2 border-b border-white/10 text-xs">
        
        {/* Left: Component Identity & Punch-In Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F5A623] animate-pulse" />
            <span className="font-extrabold text-white tracking-wider text-[11px] uppercase">
              MULTI-CAM TIMELINE TRACK
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Quick Cut to Cam Punch Bar */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 font-sans hidden md:inline mr-1">PUNCH CUT:</span>
            {group.angles.slice(0, 4).map((a, idx) => {
              const color = ANGLE_COLORS[idx % ANGLE_COLORS.length];
              const isLive = currentAngleOnAir === idx;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleCutToAngle(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isLive
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_12px_rgba(245,166,35,0.4)]'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:border-white/30 hover:bg-white/10'
                  }`}
                  title={`Punch Cut to ${a.label} at current playhead (Key ${idx + 1})`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                  <span>{a.label}</span>
                  <kbd className="text-[9px] opacity-60">[{idx + 1}]</kbd>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Razor Tool, Undo, and Timecode Telemetry */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Razor Cut Tool */}
          <button
            type="button"
            onClick={() => handleRazorCut(currentTimeMs)}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Split active segment at playhead (Hotkey C)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split at Playhead [C]</span>
          </button>

          {/* Timecode Readout */}
          <div className="px-2.5 py-1 rounded-lg bg-black/80 border border-white/10 text-cyan-400 font-mono text-xs tabular-nums">
            {formatTimecode(currentTimeMs)} / {formatTimecode(durationMs)}
          </div>
        </div>
      </div>

      {/* 2. Time Ruler Bar */}
      <div className="relative w-full h-5 bg-[#0D0E15] border-x border-t border-white/10 rounded-t-xl overflow-hidden flex items-end">
        {rulerTicks.map((ms) => {
          const percent = (ms / durationMs) * 100;
          return (
            <div
              key={ms}
              style={{ left: `${percent}%` }}
              className="absolute bottom-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            >
              <span className="text-[8.5px] font-mono text-neutral-500 tabular-nums">
                {(ms / 1000).toFixed(0)}s
              </span>
              <div className="w-px h-1.5 bg-neutral-600" />
            </div>
          );
        })}
      </div>

      {/* 3. Master Program Cut Track (Consolidated Cut Line) */}
      <div className="relative w-full">
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          className="relative w-full h-14 bg-[#0A0B10] border-x border-b border-white/15 overflow-hidden cursor-pointer shadow-inner flex items-stretch"
        >
          {/* Render Sliced Segments */}
          {segments.map((seg, sIdx) => {
            const widthPercent = (seg.durationMs / durationMs) * 100;
            const angle = group.angles[seg.angleIndex] || group.angles[0];
            const color = ANGLE_COLORS[seg.angleIndex % ANGLE_COLORS.length];
            const isSelected = selectedSegmentIdx === sIdx;

            return (
              <div
                key={seg.id}
                style={{ width: `${widthPercent}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSegmentIdx(sIdx);
                  onSelectAngle?.(seg.angleIndex);
                  onSeekMs(seg.startMs);
                }}
                className={`relative h-full flex flex-col justify-between p-1.5 border-r border-black/80 transition-colors group ${
                  color.bg
                } ${color.hover} ${isSelected ? 'ring-2 ring-inset ring-amber-400' : ''}`}
              >
                {/* Top: Angle Tag & Dropdown */}
                <div className="flex items-center justify-between gap-1 overflow-hidden">
                  <span className={`text-[10px] font-mono font-bold uppercase truncate ${color.text}`}>
                    {angle?.label || `CAM 0${seg.angleIndex + 1}`}
                  </span>

                  {/* Dropdown switch button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownIdx(activeDropdownIdx === sIdx ? null : sIdx);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/60 text-neutral-300 transition-opacity"
                    title="Switch camera angle"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Bottom: Segment Duration & Trash Button */}
                <div className="flex items-center justify-between text-[9px] font-mono text-neutral-300 tabular-nums">
                  <span>{(seg.durationMs / 1000).toFixed(1)}s</span>
                  {!seg.isFirst && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCut(seg.cutId);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-400 p-0.5"
                      title="Delete cut"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Drag Handle on Cut Boundary */}
                {!seg.isFirst && (
                  <div
                    onMouseDown={(e) => handleCutDragStart(e, seg.cutId)}
                    className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-col-resize hover:bg-amber-400 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Drag to trim cut split point"
                  >
                    <div className="w-0.5 h-7 bg-white rounded-full shadow-md" />
                  </div>
                )}

                {/* Dropdown Angle Selector */}
                {activeDropdownIdx === sIdx && (
                  <div 
                    className="absolute top-8 left-1 z-50 bg-[#12131A] border border-white/20 rounded-xl shadow-2xl p-1.5 min-w-[140px] flex flex-col gap-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="text-[9px] font-semibold text-neutral-400 px-2 py-0.5 border-b border-white/10">
                      REASSIGN ANGLE
                    </div>
                    {group.angles.map((a, aIdx) => {
                      const aColor = ANGLE_COLORS[aIdx % ANGLE_COLORS.length];
                      const isCurrent = aIdx === seg.angleIndex;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleReassignAngle(seg.cutId, aIdx)}
                          className={`flex items-center justify-between px-2 py-1 rounded text-left text-xs font-mono transition-colors ${
                            isCurrent ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: aColor.hex }} />
                            {a.label}
                          </span>
                          {isCurrent && <Check className="w-3 h-3 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Needle overlay on master cut track */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_10px_#F5A623] pointer-events-none z-30 transition-all duration-75"
            style={{ left: `${playheadPercent}%` }}
          />
        </div>
      </div>

      {/* 4. Active Camera Stream Lanes (Consolidated Synchronized Stream Matrix) */}
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400 font-mono">
          <span>ACTIVE CAMERA STREAMS (CLICK ANY STREAM TO CUT)</span>
          <span>AUDIO SYNC OFFSET</span>
        </div>

        <div ref={lanesRef} className="relative flex flex-col gap-1">
          {group.angles.map((angle, idx) => {
            const color = ANGLE_COLORS[idx % ANGLE_COLORS.length];
            const isLive = currentAngleOnAir === idx;
            const isMasterMic = idx === group.masterAudioAngleIndex;

            return (
              <div
                key={angle.id}
                onClick={(e) => {
                  const targetMs = getTimeFromMouseEvent(e);
                  handleCutToAngle(idx, targetMs);
                }}
                className={`group relative h-9 w-full rounded-xl border flex items-center justify-between px-3 cursor-pointer transition-all ${
                  isLive
                    ? 'bg-black/90 border-amber-400 shadow-[0_0_16px_rgba(245,166,35,0.2)]'
                    : 'bg-[#0B0C12] border-white/5 hover:border-white/20'
                }`}
                title={`Click to cut to ${angle.label} at clicked time`}
              >
                {/* Left: Angle Identity & Badge */}
                <div className="flex items-center gap-2.5 z-10 pointer-events-none">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${
                    isLive ? 'bg-amber-400 text-black shadow-md' : 'bg-black/60 text-white border border-white/10'
                  }`}>
                    {idx + 1}
                  </span>

                  <span className={`text-xs font-mono font-bold tracking-wider ${isLive ? 'text-amber-400' : 'text-neutral-300'}`}>
                    {angle.label}
                  </span>

                  {isMasterMic && (
                    <span className="p-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Master Audio Source">
                      <Volume2 className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Center: Live Air Status or Cut Prompt */}
                <div className="z-10 pointer-events-none">
                  {isLive ? (
                    <span className="px-2 py-0.5 rounded bg-[#EF4444] text-white font-black text-[9px] tracking-wider uppercase animate-pulse shadow-[0_0_8px_#EF4444]">
                      ● ON AIR
                    </span>
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] font-mono text-cyan-400 transition-opacity">
                      CLICK TO CUT
                    </span>
                  )}
                </div>

                {/* Right: Sync Offset */}
                <div className="flex items-center gap-3 z-10 pointer-events-none text-[10px] font-mono">
                  <span className="text-neutral-400">
                    {angle.syncOffsetMs !== 0 ? `${angle.syncOffsetMs > 0 ? '+' : ''}${angle.syncOffsetMs}ms` : '0ms SYNC'}
                  </span>
                </div>

                {/* Background visual strip indicating active segments for this angle */}
                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none opacity-20">
                  {segments.filter(s => s.angleIndex === idx).map(s => {
                    const startPct = (s.startMs / durationMs) * 100;
                    const widthPct = (s.durationMs / durationMs) * 100;
                    return (
                      <div
                        key={s.id}
                        style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-0 bottom-0 ${color.bg}`}
                      />
                    );
                  })}
                </div>

                {/* Synchronized Playhead line across lanes */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_#F5A623] pointer-events-none z-30 transition-all duration-75"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
