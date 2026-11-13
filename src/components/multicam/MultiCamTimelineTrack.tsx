/**
 * @file /src/components/multicam/MultiCamTimelineTrack.tsx
 * @description Compact Broadcast Multi-Cam Timeline Track showing color-coded CAM 01-CAM 09 cut blocks,
 * draggable split boundaries, quick punch strip, and SPLIT AT PLAYHEAD [C].
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { MultiCamGroup, MultiCamCutEvent } from '../../types/multicam';
import { getMultiCamSegments, getActiveMultiCamAngleAtTime, splitMultiCamAtPlayhead } from '../../utils/multiCamMath';
import { Scissors, Trash2, ChevronDown, Check } from 'lucide-react';

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

export const ANGLE_COLORS = [
  { bg: 'bg-red-500/25', hover: 'hover:bg-red-500/35', border: 'border-red-500', text: 'text-red-300', hex: '#EF4444' },
  { bg: 'bg-amber-500/25', hover: 'hover:bg-amber-500/35', border: 'border-amber-500', text: 'text-amber-300', hex: '#F59E0B' },
  { bg: 'bg-cyan-500/25', hover: 'hover:bg-cyan-500/35', border: 'border-cyan-500', text: 'text-cyan-300', hex: '#06B6D4' },
  { bg: 'bg-emerald-500/25', hover: 'hover:bg-emerald-500/35', border: 'border-emerald-500', text: 'text-emerald-300', hex: '#10B981' },
  { bg: 'bg-purple-500/25', hover: 'hover:bg-purple-500/35', border: 'border-purple-500', text: 'text-purple-300', hex: '#A855F7' },
  { bg: 'bg-sky-500/25', hover: 'hover:bg-sky-500/35', border: 'border-sky-500', text: 'text-sky-300', hex: '#38BDF8' },
  { bg: 'bg-rose-500/25', hover: 'hover:bg-rose-500/35', border: 'border-rose-500', text: 'text-rose-300', hex: '#F43F5E' },
  { bg: 'bg-lime-500/25', hover: 'hover:bg-lime-500/35', border: 'border-lime-500', text: 'text-lime-300', hex: '#84CC16' },
  { bg: 'bg-indigo-500/25', hover: 'hover:bg-indigo-500/35', border: 'border-indigo-500', text: 'text-indigo-300', hex: '#6366F1' }
];

export const MultiCamTimelineTrack: React.FC<MultiCamTimelineTrackProps> = ({
  group,
  currentTimeMs,
  onSeekMs,
  onUpdateCutEvents,
  onSelectAngle,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number | null>(null);
  const [activeDropdownIdx, setActiveDropdownIdx] = useState<number | null>(null);
  const [draggingCutId, setDraggingCutId] = useState<string | null>(null);

  const durationMs = group.durationMs || Math.round((group.duration || 12) * 1000);

  const segments = useMemo(
    () => getMultiCamSegments(group.cutEvents, durationMs, group.activeAngleIndex || 0),
    [group.cutEvents, durationMs, group.activeAngleIndex]
  );

  const currentAngleOnAir = useMemo(
    () => getActiveMultiCamAngleAtTime(group.cutEvents, currentTimeMs, group.activeAngleIndex || 0),
    [group.cutEvents, currentTimeMs, group.activeAngleIndex]
  );

  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const getTimeFromMouseEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      return Math.round((clickX / rect.width) * durationMs);
    },
    [durationMs]
  );

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingCutId) return;
    onSeekMs(getTimeFromMouseEvent(e));
  };

  const handleRazorCut = (targetMs: number = currentTimeMs) => {
    const res = splitMultiCamAtPlayhead(group.cutEvents, targetMs, durationMs, currentAngleOnAir);
    if (res.inserted) {
      onUpdateCutEvents(res.cutEvents);
    }
  };

  const handleCutDragStart = (e: React.MouseEvent, cutId: string) => {
    e.stopPropagation();
    setDraggingCutId(cutId);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const posX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const newTimeMs = Math.round((posX / rect.width) * durationMs);

      const updated = group.cutEvents
        .map((c) => (c.id === cutId ? { ...c, timeMs: Math.max(50, Math.min(durationMs - 50, newTimeMs)) } : c))
        .sort((a, b) => a.timeMs - b.timeMs);
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

  const handleDeleteCut = (cutId: string) => {
    if (cutId === 'cut-init' || cutId === 'cut-0') return;
    onUpdateCutEvents(group.cutEvents.filter((c) => c.id !== cutId));
    setSelectedSegmentIdx(null);
  };

  const handleReassignAngle = (cutId: string, newAngleIndex: number) => {
    const updated = group.cutEvents.map((c) => (c.id === cutId ? { ...c, angleIndex: newAngleIndex } : c));
    onUpdateCutEvents(updated);
    setActiveDropdownIdx(null);
  };

  const playheadPercent = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

  const rulerTicks = useMemo(() => {
    const totalSeconds = Math.ceil(durationMs / 1000);
    const step = totalSeconds > 24 ? 2 : 1;
    const ticks: number[] = [];
    for (let s = 0; s <= totalSeconds; s += step) {
      ticks.push(s * 1000);
    }
    return ticks;
  }, [durationMs]);

  return (
    <div className={`w-full flex flex-col bg-[#08090C] border border-white/10 rounded-xl p-2 font-mono select-none ${className}`}>
      {/* Compact Header Row: Label + 1-9 Quick Punch Strip + Split Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-white tracking-wider uppercase whitespace-nowrap">
            MULTI-CAM TIMELINE TRACK
          </span>
          <span className="text-neutral-600 hidden sm:inline">·</span>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {Array.from({ length: Math.min(9, group.angles.length) }, (_, idx) => {
              const label = `C${idx + 1}`;
              const color = ANGLE_COLORS[idx % ANGLE_COLORS.length];
              const isLive = currentAngleOnAir === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectAngle?.(idx)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 border shrink-0 ${
                    isLive
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-white/5 text-neutral-300 border-white/10 hover:border-amber-400/60 hover:text-white'
                  }`}
                  title={`Punch CAM 0${idx + 1} Live (Key ${idx + 1})`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color.hex }} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={() => handleRazorCut(currentTimeMs)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Split active segment at playhead (Hotkey C)"
          >
            <Scissors className="w-3 h-3 text-amber-400" />
            <span>SPLIT AT PLAYHEAD [C]</span>
          </button>

          <span className="text-[11px] text-cyan-400 tabular-nums">
            {formatTimecode(currentTimeMs)} / {formatTimecode(durationMs)}
          </span>
        </div>
      </div>

      {/* Time Ruler */}
      <div className="relative w-full h-4 bg-[#0D0E15] border-x border-t border-white/10 rounded-t-lg mt-1.5 overflow-hidden">
        {rulerTicks.map((ms) => {
          const percent = (ms / durationMs) * 100;
          return (
            <div
              key={ms}
              style={{ left: `${percent}%` }}
              className="absolute bottom-0 flex flex-col items-center -translate-x-1/2 pointer-events-none"
            >
              <span className="text-[8px] text-neutral-500 tabular-nums">{(ms / 1000).toFixed(0)}s</span>
              <div className="w-px h-1 bg-neutral-600" />
            </div>
          );
        })}
      </div>

      {/* Color-Coded Punched Camera Cut Track */}
      <div className="relative w-full">
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          className="relative w-full h-12 bg-[#0A0B10] border border-white/15 rounded-b-lg overflow-visible cursor-pointer flex items-stretch"
        >
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
                  onSeekMs(seg.startMs);
                }}
                className={`relative h-full flex flex-col justify-between px-1.5 py-1 border-r border-black/80 transition-colors group ${color.bg} ${color.hover} ${
                  isSelected ? 'ring-1 ring-inset ring-amber-400' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1 overflow-hidden">
                  <span className={`text-[9.5px] font-bold uppercase truncate ${color.text}`}>
                    {angle?.label || `CAM 0${seg.angleIndex + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdownIdx(activeDropdownIdx === sIdx ? null : sIdx);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/60 text-neutral-300"
                    title="Reassign camera angle"
                  >
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[8.5px] text-neutral-300 tabular-nums">
                  <span>{(seg.durationMs / 1000).toFixed(1)}s</span>
                  {!seg.isFirst && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCut(seg.cutId);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-400"
                      title="Delete cut boundary"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {!seg.isFirst && (
                  <div
                    onMouseDown={(e) => handleCutDragStart(e, seg.cutId)}
                    className="absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-col-resize hover:bg-amber-400/80 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Drag to trim cut split point"
                  >
                    <div className="w-0.5 h-6 bg-white rounded-full" />
                  </div>
                )}

                {activeDropdownIdx === sIdx && (
                  <div
                    className="absolute bottom-full mb-1 left-0 z-50 bg-[#12131A] border border-white/20 rounded-lg shadow-2xl p-1 min-w-[130px] flex flex-col gap-0.5 max-h-44 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.angles.slice(0, 9).map((a, aIdx) => {
                      const aColor = ANGLE_COLORS[aIdx % ANGLE_COLORS.length];
                      const isCurrent = aIdx === seg.angleIndex;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleReassignAngle(seg.cutId, aIdx)}
                          className={`flex items-center justify-between px-2 py-0.5 rounded text-left text-[10px] ${
                            isCurrent ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: aColor.hex }} />
                            {a.label}
                          </span>
                          {isCurrent && <Check className="w-2.5 h-2.5 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_#EF4444] pointer-events-none z-30"
            style={{ left: `${playheadPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
