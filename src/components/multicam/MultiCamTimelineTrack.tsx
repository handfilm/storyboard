/**
 * @file /src/components/multicam/MultiCamTimelineTrack.tsx
 * @description Specialized Multi-Angle Timeline Track with Segment Matrix & Cut Boundary Trimming.
 * 
 * Capabilities:
 * 1. Segment Slicing: Automatically slices the timeline based on committed cut events.
 * 2. Angle Chromatic Coding: Distinctive broadcast color accents per camera angle.
 * 3. Cut Drag Calibration: Drag cut boundary lines left/right to micro-adjust split timing.
 * 4. Angle Re-assignment: Quick-switch a segment's active camera angle without re-recording.
 * 5. Integrated Playhead: Synchronized scrubber needle with high-precision timecode tooltip.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { MultiCamGroup, MultiCamCutEvent } from '../../types/multicam';
import { Scissors, Trash2, Video, ChevronDown, Check } from 'lucide-react';

interface MultiCamTimelineTrackProps {
  group: MultiCamGroup;
  currentTimeMs: number;
  onSeekMs: (timeMs: number) => void;
  onUpdateCutEvents: (cutEvents: MultiCamCutEvent[]) => void;
  onSelectAngle?: (angleIndex: number) => void;
  className?: string;
}

// Visual color palette for up to 9 camera angles
const ANGLE_COLORS = [
  { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', hex: '#F5A623' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', hex: '#00E5FF' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', hex: '#10B981' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', hex: '#8B5CF6' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400', hex: '#F43F5E' },
  { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-400', hex: '#6366F1' },
  { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', hex: '#EAB308' },
  { bg: 'bg-teal-500/20', border: 'border-teal-500', text: 'text-teal-400', hex: '#14B8A6' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', hex: '#F97316' },
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

  // Format timecode (mm:ss:ff)
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Handle timeline track click to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || draggingCutId) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.width));
    const targetMs = Math.round((clickX / rect.width) * durationMs);
    onSeekMs(targetMs);
  };

  // Cut drag boundary handler
  const handleCutDragStart = (e: React.MouseEvent, cutId: string) => {
    e.stopPropagation();
    setDraggingCutId(cutId);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const posX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const newTimeMs = Math.round((posX / rect.width) * durationMs);

      // Update cut event time
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

  // Delete a cut event (merges with preceding segment)
  const handleDeleteCut = (cutId: string) => {
    if (cutId === 'cut-init' || cutId === 'cut-0') return; // Cannot delete initial cut
    const updated = group.cutEvents.filter(c => c.id !== cutId);
    onUpdateCutEvents(updated);
    setSelectedSegmentIdx(null);
  };

  // Playhead position percentage
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

  return (
    <div className={`w-full flex flex-col gap-2 font-sans select-none ${className}`}>
      {/* Track Header / Controls */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white tracking-wide text-[11px]">MULTI-CAM CUT MATRIX</span>
          <span className="text-neutral-500 font-mono text-[11px] tabular-nums">
            {segments.length} CUTS · {formatTimecode(currentTimeMs)} / {formatTimecode(durationMs)}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          {group.angles.slice(0, 4).map((a, idx) => {
            const color = ANGLE_COLORS[idx % ANGLE_COLORS.length];
            return (
              <div key={a.id} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                <span className="text-neutral-400 font-mono">{a.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Track */}
      <div
        ref={containerRef}
        onClick={handleTimelineClick}
        className="relative w-full h-16 bg-[#08090C] border border-white/10 rounded-xl overflow-hidden cursor-pointer shadow-inner flex items-stretch"
      >
        {/* Render Segment Blocks */}
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
              className={`relative h-full flex flex-col justify-between p-1.5 border-r border-black/60 transition-colors group ${
                color.bg
              } ${isSelected ? 'ring-2 ring-inset ring-amber-400' : ''}`}
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
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/40 text-neutral-300 transition-opacity"
                  title="Switch camera angle"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Bottom: Segment Duration */}
              <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 tabular-nums">
                <span>{(seg.durationMs / 1000).toFixed(1)}s</span>
                {!seg.isFirst && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCut(seg.cutId);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 p-0.5"
                    title="Delete cut"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Interactive Cut Drag Handle on boundary */}
              {!seg.isFirst && (
                <div
                  onMouseDown={(e) => handleCutDragStart(e, seg.cutId)}
                  className="absolute left-0 top-0 bottom-0 w-2.5 -translate-x-1/2 cursor-col-resize hover:bg-amber-400/80 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Drag to trim cut point"
                >
                  <div className="w-0.5 h-6 bg-white/90 rounded-full" />
                </div>
              )}

              {/* Quick Angle Switcher Dropdown */}
              {activeDropdownIdx === sIdx && (
                <div 
                  className="absolute top-8 left-1 z-50 bg-[#12131A] border border-white/20 rounded-lg shadow-xl p-1 min-w-[120px] flex flex-col gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[9px] font-semibold text-neutral-400 px-2 py-0.5 border-b border-white/5">
                    ASSIGN CAMERA
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
                          isCurrent ? 'bg-amber-500/20 text-amber-300' : 'text-neutral-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: aColor.hex }} />
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

        {/* Global Playhead Needle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 shadow-[0_0_8px_#F5A623] pointer-events-none z-30 transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border border-black rounded-full shadow-md flex items-center justify-center">
            <div className="w-1 h-1 bg-black rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
