/**
 * @file /src/components/CanvasLiquifyModal.tsx
 * @description HTML5 Canvas Liquify & Mesh Warp Studio (Push, Bloat, Pinch, Restore,
 * Brush radius/strength, Undo stack, Wireframe mesh, Apply to frame, Export PNG).
 * Preserved core studio capability.
 */

import React, { useRef, useState, useEffect } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { X, Check, Undo2, RotateCcw, Download, Grid, Sparkles } from 'lucide-react';

interface CanvasLiquifyModalProps {
  isOpen: boolean;
  frame: AnthologyFrame;
  onClose: () => void;
  onApplyWarp: (warpedDataUrl: string) => void;
}

type WarpTool = 'push' | 'bloat' | 'pinch' | 'restore';

export const CanvasLiquifyModal: React.FC<CanvasLiquifyModalProps> = ({
  isOpen,
  frame,
  onClose,
  onApplyWarp
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<WarpTool>('push');
  const [brushRadius, setBrushRadius] = useState(65);
  const [brushStrength, setBrushStrength] = useState(35);
  const [showMesh, setShowMesh] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, visible: false });

  const originalDataRef = useRef<ImageData | null>(null);
  const currentDataRef = useRef<ImageData | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 1280;
    canvas.height = 720;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalDataRef.current = imgData;
      currentDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current = [new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height)];
      drawCanvas();
    };
    img.onerror = () => {
      // Fallback cinema canvas background
      ctx.fillStyle = '#08080C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 36px Cinzel, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EP ${frame.epNumber} // ${frame.title}`, canvas.width / 2, canvas.height / 2);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      originalDataRef.current = imgData;
      currentDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current = [new ImageData(new Uint8ClampedArray(imgData.data), imgData.width, imgData.height)];
      drawCanvas();
    };

    img.src = frame.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1280&q=80';
  }, [isOpen, frame.imageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentDataRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(currentDataRef.current, 0, 0);

    if (showMesh) {
      ctx.save();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [showMesh]);

  const applyWarp = (currentX: number, currentY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentDataRef.current || !originalDataRef.current) return;

    const dx = currentX - lastMouseRef.current.x;
    const dy = currentY - lastMouseRef.current.y;
    if (dx === 0 && dy === 0 && activeTool === 'push') return;

    const width = canvas.width;
    const height = canvas.height;
    const src = currentDataRef.current.data;
    const dst = new Uint8ClampedArray(src);
    const radius = brushRadius;
    const radiusSq = radius * radius;
    const strength = brushStrength / 100;

    const minX = Math.max(0, Math.floor(currentX - radius));
    const maxX = Math.min(width - 1, Math.ceil(currentX + radius));
    const minY = Math.max(0, Math.floor(currentY - radius));
    const maxY = Math.min(height - 1, Math.ceil(currentY + radius));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const distSq = (px - currentX) * (px - currentX) + (py - currentY) * (py - currentY);
        if (distSq < radiusSq) {
          const factor = Math.cos((Math.sqrt(distSq) / radius) * (Math.PI / 2));
          let sampleX = px;
          let sampleY = py;

          if (activeTool === 'push') {
            sampleX = px - dx * factor * strength * 1.5;
            sampleY = py - dy * factor * strength * 1.5;
          } else if (activeTool === 'bloat') {
            const angle = Math.atan2(py - currentY, px - currentX);
            const offset = (1 - Math.sqrt(distSq) / radius) * 14 * strength;
            sampleX = px - Math.cos(angle) * offset;
            sampleY = py - Math.sin(angle) * offset;
          } else if (activeTool === 'pinch') {
            const angle = Math.atan2(py - currentY, px - currentX);
            const offset = (1 - Math.sqrt(distSq) / radius) * 14 * strength;
            sampleX = px + Math.cos(angle) * offset;
            sampleY = py + Math.sin(angle) * offset;
          } else if (activeTool === 'restore') {
            const targetIdx = (py * width + px) * 4;
            const orig = originalDataRef.current.data;
            dst[targetIdx] = orig[targetIdx];
            dst[targetIdx + 1] = orig[targetIdx + 1];
            dst[targetIdx + 2] = orig[targetIdx + 2];
            dst[targetIdx + 3] = orig[targetIdx + 3];
            continue;
          }

          sampleX = Math.max(0, Math.min(width - 1, Math.round(sampleX)));
          sampleY = Math.max(0, Math.min(height - 1, Math.round(sampleY)));

          const srcIdx = (sampleY * width + sampleX) * 4;
          const dstIdx = (py * width + px) * 4;
          dst[dstIdx] = src[srcIdx];
          dst[dstIdx + 1] = src[srcIdx + 1];
          dst[dstIdx + 2] = src[srcIdx + 2];
          dst[dstIdx + 3] = src[srcIdx + 3];
        }
      }
    }

    currentDataRef.current.data.set(dst);
    drawCanvas();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !canvasRef.current || !currentDataRef.current) return;
    setIsDragging(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastMouseRef.current = { x, y };

    if (undoStackRef.current.length > 15) undoStackRef.current.shift();
    undoStackRef.current.push(
      new ImageData(new Uint8ClampedArray(currentDataRef.current.data), currentDataRef.current.width, currentDataRef.current.height)
    );
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true
    });

    if (isDragging) {
      applyWarp(x, y);
      lastMouseRef.current = { x, y };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleUndo = () => {
    if (undoStackRef.current.length > 1) {
      currentDataRef.current = undoStackRef.current.pop()!;
      drawCanvas();
    }
  };

  const handleReset = () => {
    if (!originalDataRef.current) return;
    currentDataRef.current = new ImageData(
      new Uint8ClampedArray(originalDataRef.current.data),
      originalDataRef.current.width,
      originalDataRef.current.height
    );
    drawCanvas();
  };

  const handleApplyToFrame = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    onApplyWarp(dataUrl);
    onClose();
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `RAWx_Warp_EP_${frame.epNumber}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl h-[92vh] bg-[#0A0B0E] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_30px_90px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] text-white">
              LIQUIFY & MESH WARP STUDIO
            </h2>
            <span className="px-2 py-0.5 rounded-[1px] bg-[#D4AF37]/20 text-[8.5px] font-mono-tech text-[#FFE066]">
              EP {frame.epNumber} // {frame.bengaliTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToFrame}
              className="px-3 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold text-[10px] font-mono-tech rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>APPLY TO VAULT</span>
            </button>
            <button
              onClick={handleExportPNG}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-[9px] font-mono-tech text-white rounded-[1px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT PNG</span>
            </button>
            <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Workspace */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#050507]">
          {/* Left Toolbar */}
          <div className="w-full md:w-60 bg-[#08080C] border-b md:border-b-0 md:border-r border-white/10 p-3 flex flex-col gap-3 font-mono-tech shrink-0">
            <div>
              <span className="text-[8px] text-white/40 uppercase tracking-wider">Warp Brush Mode</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {(['push', 'bloat', 'pinch', 'restore'] as WarpTool[]).map((tool) => (
                  <button
                    key={tool}
                    onClick={() => setActiveTool(tool)}
                    className={`px-2 py-1.5 text-[9px] uppercase tracking-wider rounded-[1px] border cursor-pointer transition-all ${
                      activeTool === tool
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066] font-bold'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {tool === 'push' && '🖐️ PUSH'}
                    {tool === 'bloat' && '⭕ BLOAT'}
                    {tool === 'pinch' && '🤏 PINCH'}
                    {tool === 'restore' && '🔄 RESTORE'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[8px] text-white/40 uppercase">
                <span>Brush Radius</span>
                <span className="text-[#FFE066]">{brushRadius}px</span>
              </div>
              <input
                type="range"
                min="15"
                max="200"
                value={brushRadius}
                onChange={e => setBrushRadius(Number(e.target.value))}
                className="w-full mt-1 accent-[#D4AF37] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[8px] text-white/40 uppercase">
                <span>Warp Intensity</span>
                <span className="text-[#FFE066]">{brushStrength}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={brushStrength}
                onChange={e => setBrushStrength(Number(e.target.value))}
                className="w-full mt-1 accent-[#D4AF37] cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowMesh(!showMesh)}
              className={`px-2 py-1.5 text-[9px] uppercase tracking-wider rounded-[1px] border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                showMesh
                  ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066] font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>{showMesh ? 'HIDE GRID MESH' : 'SHOW GRID MESH'}</span>
            </button>

            <div className="mt-auto flex flex-col gap-1.5 pt-3 border-t border-white/10">
              <button
                onClick={handleUndo}
                className="px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-[9px] rounded-[1px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Undo2 className="w-3 h-3 text-[#D4AF37]" />
                <span>UNDO STROKE [Ctrl+Z]</span>
              </button>
              <button
                onClick={handleReset}
                className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] rounded-[1px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>REVERT TO ORIGINAL</span>
              </button>
            </div>
          </div>

          {/* Canvas Workspace */}
          <div 
            ref={containerRef}
            className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-radial from-[#121218] to-[#040406]"
          >
            <div className="relative shadow-[0_20px_60px_rgba(0,0,0,0.95)] border border-[#D4AF37]/40 max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  handleMouseUp();
                  setCursorPos(prev => ({ ...prev, visible: false }));
                }}
                className="block max-w-full max-h-[75vh] object-contain cursor-crosshair"
              />
              {cursorPos.visible && (
                <div
                  className="absolute pointer-events-none rounded-full border border-[#D4AF37] -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${cursorPos.x}px`,
                    top: `${cursorPos.y}px`,
                    width: `${brushRadius}px`,
                    height: `${brushRadius}px`,
                    boxShadow: '0 0 10px rgba(212,175,55,0.4)'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
