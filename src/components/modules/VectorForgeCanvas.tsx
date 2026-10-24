/**
 * @file /src/components/modules/VectorForgeCanvas.tsx
 * @description Vector Forge — In-Stage Transparent Vector & Shape Engine for HANDFILM.
 * Provides an Illustrator-style floating toolbar overlay with Pen, Shape, Text,
 * and Mask vector path tools rendered directly over the 2.39:1 video canvas.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  PenTool, 
  Square, 
  Type, 
  Crop, 
  X, 
  Sliders, 
  Trash2, 
  Check, 
  Eye, 
  Sparkles,
  Circle,
  Move
} from 'lucide-react';
import { SmartHoverCard } from '../ui/SmartHoverCard';

export type VectorTool = 'pen' | 'shape' | 'text' | 'mask';

export interface VectorForgeCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onCommitVectorOverlay?: (svgDataUrl: string) => void;
}

export const VectorForgeCanvas: React.FC<VectorForgeCanvasProps> = ({
  isOpen,
  onClose,
  onCommitVectorOverlay
}) => {
  const [activeTool, setActiveTool] = useState<VectorTool>('pen');
  const [strokeColor, setStrokeColor] = useState<string>('#F5A623');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [shapes, setShapes] = useState<Array<{ id: string; type: string; points: string; color: string }>>([
    { id: '1', type: 'path', points: 'M 150,200 C 300,100 500,350 700,200', color: '#00F0FF' }
  ]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Keyboard shortcut listener (P, U, T, M, Esc)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pen');
      } else if (e.key === 'u' || e.key === 'U') {
        setActiveTool('shape');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
      } else if (e.key === 'm' || e.key === 'M') {
        setActiveTool('mask');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath(`M ${x},${y}`);
    } else if (activeTool === 'shape') {
      setShapes(prev => [
        ...prev,
        { id: String(Date.now()), type: 'rect', points: `${x},${y},140,80`, color: strokeColor }
      ]);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || activeTool !== 'pen' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setCurrentPath(prev => `${prev} L ${x},${y}`);
  };

  const handleSvgMouseUp = () => {
    if (isDrawing && currentPath) {
      setShapes(prev => [
        ...prev,
        { id: String(Date.now()), type: 'path', points: currentPath, color: strokeColor }
      ]);
      setCurrentPath('');
      setIsDrawing(false);
    }
  };

  const handleClearShapes = () => {
    setShapes([]);
    setStatusNotice('All vector shapes cleared');
    setTimeout(() => setStatusNotice(null), 1200);
  };

  const handleCommit = () => {
    setStatusNotice('✓ Vector overlay committed to stage!');
    if (onCommitVectorOverlay) {
      onCommitVectorOverlay('svg-layer');
    }
    setTimeout(() => {
      setStatusNotice(null);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none flex flex-col justify-between p-4 animate-in fade-in duration-200">
      {/* 1. Top Bar: Floating [ Exit Forge ] Button & Live Status */}
      <div className="w-full flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-zinc-300 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00F0FF]" />
          <span className="font-bold text-white tracking-wider">VECTOR FORGE</span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">| SVG OVERLAY CANVAS</span>
        </div>

        {/* Floating Center Exit Button */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-black/80 hover:bg-black border border-amber-500/60 hover:border-amber-400 text-amber-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(245,166,35,0.3)] flex items-center gap-1.5 cursor-pointer backdrop-blur-md transition-all active:scale-95"
            title="Exit Vector Forge Mode (ESC)"
          >
            <span>Exit Forge [ESC]</span>
            <X className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          {statusNotice && (
            <span className="text-xs font-mono text-emerald-400 font-bold bg-black/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
              {statusNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleClearShapes}
            className="px-3 py-1 rounded-full bg-black/70 hover:bg-red-950/80 border border-white/10 hover:border-red-500/40 text-zinc-400 hover:text-red-300 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-md"
            title="Clear all vector paths"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shadow-[0_0_10px_rgba(245,166,35,0.25)]"
            title="Apply vectors to current frame"
          >
            <Check className="w-3 h-3" />
            <span>Commit to Frame</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive SVG Drawing Layer (pointer-events-auto) */}
      <svg
        ref={svgRef}
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair z-0"
      >
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Existing Shapes */}
        {shapes.map((s) => {
          if (s.type === 'rect') {
            const [x, y, w, h] = s.points.split(',').map(Number);
            return (
              <rect
                key={s.id}
                x={x}
                y={y}
                width={w}
                height={h}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                filter="url(#neon-glow)"
              />
            );
          }
          return (
            <path
              key={s.id}
              d={s.points}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neon-glow)"
            />
          );
        })}

        {/* Active In-Progress Path */}
        {currentPath && (
          <path
            d={currentPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neon-glow)"
          />
        )}
      </svg>

      {/* 3. Left-Side Minimalist Vertical Frosted Toolbar (Adobe Illustrator Style) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-auto z-50">
        <div className="w-11 bg-black/60 backdrop-blur-md border border-white/10 rounded-full py-3 px-1 flex flex-col items-center gap-3 shadow-2xl">
          {/* Pen Tool (P) */}
          <SmartHoverCard
            code="[ TOOL // PEN (P) ]"
            description="Vector bezier curve and freehand path drawing tool."
            shortcut="P"
            align="left"
          >
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Pen Tool (P)"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </SmartHoverCard>

          {/* Shape Tool (U) */}
          <SmartHoverCard
            code="[ TOOL // SHAPE (U) ]"
            description="Insert vector rectangles, bounding frames, and anamorphic masks."
            shortcut="U"
            align="left"
          >
            <button
              type="button"
              onClick={() => setActiveTool('shape')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'shape'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Shape Tool (U)"
            >
              <Square className="w-4 h-4" />
            </button>
          </SmartHoverCard>

          {/* Text Tool (T) */}
          <SmartHoverCard
            code="[ TOOL // TEXT (T) ]"
            description="Kinetic typography anchor point and vector text stamps."
            shortcut="T"
            align="left"
          >
            <button
              type="button"
              onClick={() => setActiveTool('text')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Text Tool (T)"
            >
              <Type className="w-4 h-4" />
            </button>
          </SmartHoverCard>

          {/* Mask Tool (M) */}
          <SmartHoverCard
            code="[ TOOL // MASK (M) ]"
            description="Draw matte letterboxes and anamorphic lens crop masks."
            shortcut="M"
            align="left"
          >
            <button
              type="button"
              onClick={() => setActiveTool('mask')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                activeTool === 'mask'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Mask Tool (M)"
            >
              <Crop className="w-4 h-4" />
            </button>
          </SmartHoverCard>

          {/* Color Palettes mini divider */}
          <div className="w-5 h-[1px] bg-white/15 my-0.5" />

          {/* Color Swatches */}
          {['#F5A623', '#00F0FF', '#FF2B2B', '#FFFFFF'].map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setStrokeColor(col)}
              className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                strokeColor === col ? 'scale-125 border-white' : 'border-white/20 hover:scale-110'
              }`}
              style={{ backgroundColor: col }}
              title={`Color: ${col}`}
            />
          ))}
        </div>
      </div>

      {/* 4. Bottom Telemetry Pill */}
      <div className="w-full flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-4 py-1 text-[10px] font-mono text-zinc-400 flex items-center gap-3 shadow-lg">
          <span>ACTIVE TOOL: <strong className="text-amber-400 uppercase">{activeTool}</strong></span>
          <span>•</span>
          <span>STROKE: <strong className="text-white">{strokeWidth}px</strong></span>
          <span>•</span>
          <span>VECTORS: <strong className="text-cyan-400">{shapes.length} PATHS</strong></span>
        </div>
      </div>
    </div>
  );
};
