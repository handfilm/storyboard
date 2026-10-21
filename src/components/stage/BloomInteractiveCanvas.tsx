/**
 * @file /src/components/stage/BloomInteractiveCanvas.tsx
 * @description Bloom Interactive Canvas & Fluid Stage Sequencer for RAWx Master OS.
 * 
 * Mandated Capabilities:
 * - High-contrast dark brutalist aesthetic (#0b0b0f, deep crimson accents, tactical monospace readouts).
 * - Fluid stage view with Bloom-style drag-and-drop frame sequencing and tactile snap alignment.
 * - Magnetic snap threshold physics (calculates dynamic snap distance to adjacent frames and grid axes).
 * - Bi-directional synchronization with NLE "CUT" timeline and storyboard state.
 * - Integrated Master Optical Viewport with lens HUD telemetry and stress heatmap.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';
import { TactileSnapGuideLine } from '../../types/bloom';
import { TactileSnapGuide } from './TactileSnapGuide';
import { OpticalFrame } from '../OpticalFrame';
import { ComponentVisibility, DEFAULT_COMPONENT_VISIBILITY } from '../ComponentsMatrixPopover';
import { localDbService } from '../../services/localDbService';
import { automationService } from '../../services/automationService';
import { BiDirectionalTimeline } from '../timeline/BiDirectionalTimeline';
import { 
  Move, 
  GripHorizontal, 
  Maximize2, 
  Layers, 
  Sparkles, 
  Check, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  Crosshair, 
  Activity, 
  Flame, 
  Cloud,
  Film,
  Plus
} from 'lucide-react';

interface BloomInteractiveCanvasProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  aspectRatio: AspectRatio;
  directorName: string;
  nodeLocation: string;
  showHud: boolean;
  isAutoplay: boolean;
  componentsVisibility?: ComponentVisibility;
  onSelectFrame: (index: number) => void;
  onReorderFrames: (newFrames: AnthologyFrame[]) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  onOpenInspector?: () => void;
  onOpenAnimatic?: () => void;
  onToggleTitles?: () => void;
}

export const BloomInteractiveCanvas: React.FC<BloomInteractiveCanvasProps> = ({
  frames,
  currentIndex,
  aspectRatio,
  directorName,
  nodeLocation,
  showHud,
  isAutoplay,
  componentsVisibility = DEFAULT_COMPONENT_VISIBILITY,
  onSelectFrame,
  onReorderFrames,
  onUpdateFrame,
  onOpenInspector,
  onOpenAnimatic,
  onToggleTitles
}) => {
  // Canvas View Mode: 'viewport-focus' (hero stage + bottom flow strip) or 'canvas-flow' (infinite tactile spatial canvas)
  const [canvasMode, setCanvasMode] = useState<'viewport-focus' | 'canvas-flow'>('viewport-focus');

  // Drag and drop sequencing state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [snapGuides, setSnapGuides] = useState<TactileSnapGuideLine[]>([]);
  const [isMagneticSnapped, setIsMagneticSnapped] = useState(false);
  const [bottomDockMode, setBottomDockMode] = useState<'strip' | 'timeline'>('strip');

  // Zoom & Pan state for spatial canvas mode
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const activeFrame = frames[currentIndex] || frames[0];

  // Save to IndexedDB (rawx_storyboard_studio_db) on frame sequencing change
  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= frames.length || toIdx >= frames.length) {
      return;
    }
    const updated = [...frames];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    onReorderFrames(updated);
    onSelectFrame(toIdx);

    // Persist to IndexedDB
    localDbService.saveTimelineFrames(updated);
    // Trigger automation pipeline sync
    automationService.dispatchEvent('on_timeline_sync', {
      reorderedFrom: fromIdx,
      reorderedTo: toIdx,
      totalFrames: updated.length,
      activeFrameTitle: moved.title
    });
  }, [frames, onReorderFrames, onSelectFrame]);

  // Drag Handlers with Magnetic Snap Threshold
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Calculate magnetic snap threshold
    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const distanceToCenter = Math.abs(e.clientX - midX);

    // Magnetic snap activates within 24px of card threshold
    if (distanceToCenter < 24) {
      setIsMagneticSnapped(true);
      setDropTargetIndex(index);

      // Create tactile snap guide lines
      setSnapGuides([
        {
          id: `snap_guide_v_${index}`,
          orientation: 'vertical',
          coordinate: rect.left,
          startCoord: rect.top,
          endCoord: rect.bottom,
          distancePx: distanceToCenter,
          activeFrameId: draggedIndex,
          snapTargetFrameId: index,
          label: `SNAP TO SH${String(index + 1).padStart(3, '0')}`
        }
      ]);
    } else {
      setIsMagneticSnapped(false);
      setDropTargetIndex(index);
      setSnapGuides([]);
    }
  };

  const handleDragLeave = () => {
    setSnapGuides([]);
    setIsMagneticSnapped(false);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setSnapGuides([]);
    setIsMagneticSnapped(false);
    if (draggedIndex !== null && draggedIndex !== index) {
      handleReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setSnapGuides([]);
    setIsMagneticSnapped(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#0B0B0F] overflow-hidden flex flex-col select-none text-white font-mono"
    >
      {/* ========================================================================= */}
      {/* TACTILE SYSTEM HEADER: RAWx Master OS + Bloom Sequencer Telemetry          */}
      {/* ========================================================================= */}
      <div className="h-10 bg-[#07080C] border-b border-white/10 px-4 flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-rose-950/40 border border-rose-500/60 text-rose-400 text-[10px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>BLOOM // TACTILE STAGE</span>
          </div>

          <span className="text-white/30 text-xs">|</span>

          <span className="text-[10px] text-white/60 font-mono hidden sm:inline">
            TOTAL SHOTS: <strong className="text-[#FFE066]">{frames.length}</strong> • ACTIVE: <strong className="text-rose-400">SH{String(currentIndex + 1).padStart(3, '0')}</strong>
          </span>

          {isMagneticSnapped && (
            <span className="text-[9px] px-2 py-0.5 rounded-xs bg-rose-500 text-black font-black tracking-widest animate-pulse">
              MAGNETIC SNAP ACTIVE
            </span>
          )}
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCanvasMode(m => m === 'viewport-focus' ? 'canvas-flow' : 'viewport-focus')}
            className={`px-2.5 py-1 rounded-xs border text-[9.5px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              canvasMode === 'canvas-flow'
                ? 'bg-rose-500 text-black border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="Toggle Bloom Spatial Canvas vs Hero Stage View"
          >
            <Layers className="w-3 h-3" />
            <span>{canvasMode === 'canvas-flow' ? 'SPATIAL FLOW' : 'STAGE FOCUS'}</span>
          </button>

          <span className="text-white/20 text-xs">|</span>

          {/* Cloudflare R2 Streaming Status Chip */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-[#10131d] border border-cyan-500/40 text-[9px] text-cyan-300">
            <Cloud className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline font-bold">R2 ZERO-EGRESS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN VIEWPORT / SPATIAL CANVAS AREA                                       */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {canvasMode === 'viewport-focus' ? (
          /* Primary Master Optical Stage Viewport */
          <div className="w-full h-full relative flex items-center justify-center p-2 sm:p-4">
            <OpticalFrame
              frame={activeFrame}
              aspectRatio={aspectRatio}
              directorName={directorName}
              nodeLocation={nodeLocation}
              showHud={showHud}
              isAutoplay={isAutoplay}
              componentsVisibility={componentsVisibility}
              onUploadImage={(file) => {
                const url = URL.createObjectURL(file);
                if (onUpdateFrame) onUpdateFrame({ ...activeFrame, imageUrl: url });
              }}
              onOpenInspector={onOpenInspector || (() => {})}
              onQuickSampleImage={() => {}}
              onToggleTitles={onToggleTitles}
            />
          </div>
        ) : (
          /* Spatial Drag-and-Drop Corkboard/Flow Canvas */
          <div className="w-full h-full relative overflow-auto p-8 flex flex-wrap gap-4 items-start justify-center content-start">
            {frames.map((frame, idx) => {
              const isActive = idx === currentIndex;
              const isTarget = dropTargetIndex === idx;

              return (
                <div
                  key={frame.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectFrame(idx)}
                  className={`w-64 bg-[#07080C] border rounded-xs overflow-hidden transition-all duration-200 cursor-grab active:cursor-grabbing relative group ${
                    isActive
                      ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.45)] ring-1 ring-rose-400'
                      : isTarget
                      ? 'border-[#FFE066] scale-105 shadow-2xl'
                      : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  {/* Top Tactical Label */}
                  <div className="px-2.5 py-1 bg-black/80 border-b border-white/10 flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1.5">
                      <GripHorizontal className="w-3 h-3 text-white/40 group-hover:text-rose-400 transition-colors" />
                      <span className="font-bold text-[#FFE066]">SH{String(idx + 1).padStart(3, '0')}</span>
                    </div>
                    <span className="text-white/40 uppercase truncate max-w-[110px]">{frame.title}</span>
                  </div>

                  {/* Thumbnail / Media Layer */}
                  <div className="h-36 bg-[#040406] relative overflow-hidden flex items-center justify-center">
                    {frame.imageUrl ? (
                      <img 
                        src={frame.imageUrl} 
                        alt={frame.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/30 text-xs">
                        <Film className="w-6 h-6 mb-1 text-white/20" />
                        <span>NO MEDIA</span>
                      </div>
                    )}

                    {/* Drag overlay badge */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-2 py-1 bg-black/80 border border-white/20 rounded-xs text-[9px] font-bold text-white">
                        CLICK / DRAG TO SNAP
                      </span>
                    </div>
                  </div>

                  {/* Bottom Slate */}
                  <div className="p-2 bg-black/90 text-[8.5px] border-t border-white/5 space-y-0.5">
                    <div className="flex justify-between text-white/50">
                      <span>LENS: <strong className="text-white">{frame.cameraSpec?.focalLength || '35mm'}</strong></span>
                      <span>IRIS: <strong className="text-emerald-400">{frame.cameraSpec?.aperture || 'T1.2'}</strong></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Magnetic Snap Laser Guides */}
        <TactileSnapGuide guides={snapGuides} zoom={zoom} />
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FLUID TACTILE SEQUENCING STRIP & BI-DIRECTIONAL TIMELINE DOCK     */}
      {/* ========================================================================= */}
      {bottomDockMode === 'timeline' ? (
        <div className="h-72 bg-[#07080C] border-t border-white/10 shrink-0 z-30 flex flex-col overflow-hidden">
          <div className="h-7 bg-[#050508] border-b border-white/10 px-3 flex items-center justify-between text-[9px] shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-400">NLE BI-DIRECTIONAL TIMELINE (ZERO DESYNC)</span>
              <span className="text-white/20">•</span>
              <span className="text-white/60">3-BAND WEB AUDIO DSP & REAL-TIME WAVEFORM</span>
            </div>
            <button
              onClick={() => setBottomDockMode('strip')}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[9px] cursor-pointer flex items-center gap-1 font-mono"
            >
              <span>← Switch to Fluid Snap Strip</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <BiDirectionalTimeline
              frames={frames}
              currentIndex={currentIndex}
              isPlaying={isAutoplay}
              onTogglePlay={() => {}}
              onSelectFrame={onSelectFrame}
              onSyncFramesToTimeline={onReorderFrames}
              onUpdateFrame={onUpdateFrame}
            />
          </div>
        </div>
      ) : (
        <div className="h-28 bg-[#07080C] border-t border-white/10 px-3 py-2 flex flex-col justify-between shrink-0 z-30">
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-white/50 mb-1">
            <div className="flex items-center gap-2">
              <GripHorizontal className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">TACTILE SEQUENCE RUNNER (DRAG FRAMES TO REORDER WITH MAGNETIC SNAP)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-bold">SNAP THRESHOLD: 24PX</span>
              <span className="text-white/20">•</span>
              <button
                onClick={() => setBottomDockMode('timeline')}
                className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:text-white text-[8.5px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                title="Open CapCut / Premiere style multi-track NLE timeline"
              >
                <Film className="w-2.5 h-2.5" />
                <span>EXPAND MULTI-TRACK NLE</span>
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Frame Strip */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {frames.map((frame, idx) => {
              const isActive = idx === currentIndex;
              const isTarget = dropTargetIndex === idx;

              return (
                <div
                  key={frame.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectFrame(idx)}
                  className={`h-full w-28 shrink-0 bg-[#0B0B0F] border rounded-xs overflow-hidden cursor-grab active:cursor-grabbing transition-all flex flex-col relative group ${
                    isActive
                      ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] ring-1 ring-rose-400'
                      : isTarget
                      ? 'border-[#FFE066] scale-105'
                      : 'border-white/15 hover:border-white/40'
                  }`}
                >
                  {/* Media Image Thumbnail */}
                  <div className="flex-1 bg-black relative overflow-hidden">
                    {frame.imageUrl ? (
                      <img src={frame.imageUrl} alt={frame.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[7px] text-white/30">
                        SH{String(idx + 1).padStart(3, '0')}
                      </div>
                    )}

                    {/* Top Badge */}
                    <span className="absolute top-0.5 left-0.5 px-1 py-0.2 bg-black/80 rounded-xs text-[7px] font-bold text-[#FFE066]">
                      {String(idx + 1).padStart(3, '0')}
                    </span>
                  </div>

                  {/* Bottom Short Caption */}
                  <div className="h-4 bg-black/95 px-1 flex items-center justify-between text-[7px] text-white/70">
                    <span className="truncate">{frame.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
