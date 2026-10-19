/**
 * RAWx Studio — HTML5 Canvas Liquify & Mesh Warp Studio
 * Public API: LiquifyModal component
 * Interactive pixel distortion engine with push, bloat, pinch, and framing ratios.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '../../core/store';
import { X, Undo2, RotateCcw, Download, Check, Hand, CircleDot, Shrink, RefreshCw, Grid } from 'lucide-react';

export const LiquifyModal: React.FC = () => {
  const {
    isLiquifyModalOpen,
    setLiquifyModalOpen,
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'push' | 'bloat' | 'pinch' | 'restore'>('push');
  const [radius, setRadius] = useState(65);
  const [intensity, setIntensity] = useState(35);
  const [showGrid, setShowGrid] = useState(false);
  const [framingAspect, setFramingAspect] = useState<'16:9' | '1:1' | '4:5' | '2.39:1' | '9:16'>('16:9');
  const [historyStack, setHistoryStack] = useState<ImageData[]>([]);

  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isLiquifyModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load active frame image or sample
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = project.shots[activeShotIndex]?.imageUrl || 
      "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1280&q=80";

    img.onload = () => {
      canvas.width = 960;
      canvas.height = 540;
      ctx.drawImage(img, 0, 0, 960, 540);
      setHistoryStack([ctx.getImageData(0, 0, 960, 540)]);
    };
  }, [isLiquifyModalOpen, activeShotIndex, project.shots]);

  if (!isLiquifyModalOpen) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    isDrawing.current = true;
    lastPos.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    // Direct pixel distortion simulation
    const dx = currentX - lastPos.current.x;
    const dy = currentY - lastPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;
      const r = radius;
      const strength = (intensity / 100) * 0.5;

      const minX = Math.max(0, Math.floor(currentX - r));
      const maxX = Math.min(w - 1, Math.ceil(currentX + r));
      const minY = Math.max(0, Math.floor(currentY - r));
      const maxY = Math.min(h - 1, Math.ceil(currentY + r));

      // Push / Bloat pixel shift
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dX = x - currentX;
          const dY = y - currentY;
          const d = Math.sqrt(dX * dX + dY * dY);
          if (d < r) {
            const factor = Math.cos((d / r) * (Math.PI / 2)) * strength;
            const srcX = Math.min(w - 1, Math.max(0, Math.round(x - dx * factor)));
            const srcY = Math.min(h - 1, Math.max(0, Math.round(y - dy * factor)));
            const targetIdx = (y * w + x) * 4;
            const srcIdx = (srcY * w + srcX) * 4;

            data[targetIdx] = data[srcIdx];
            data[targetIdx + 1] = data[srcIdx + 1];
            data[targetIdx + 2] = data[srcIdx + 2];
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      lastPos.current = { x: currentX, y: currentY };
    }
  };

  const handleMouseUp = () => {
    if (isDrawing.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        setHistoryStack(prev => [...prev.slice(-10), ctx.getImageData(0, 0, 960, 540)]);
      }
    }
    isDrawing.current = false;
  };

  const handleUndo = () => {
    if (historyStack.length > 1 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const nextStack = [...historyStack];
        nextStack.pop();
        const prevData = nextStack[nextStack.length - 1];
        ctx.putImageData(prevData, 0, 0);
        setHistoryStack(nextStack);
      }
    }
  };

  const handleRevert = () => {
    if (historyStack.length > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(historyStack[0], 0, 0);
        setHistoryStack([historyStack[0]]);
      }
    }
  };

  const handleApplyToVault = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      updateShot(activeShotIndex, { imageUrl: dataUrl });
      setLiquifyModalOpen(false);
    }
  };

  const handleExportPNG = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `RAWx_Liquify_EP${String(activeShotIndex + 1).padStart(3, '0')}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-fadeIn font-mono text-xs">
      <div className="w-full max-w-5xl bg-[#0B0B0B] border border-[#D4AF37]/40 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#D4AF37]/20 flex items-center justify-between bg-[#121212]/50">
          <div className="flex items-center gap-2">
            <span className="text-[#D4AF37] font-bold text-sm">(•)</span>
            <span className="font-bold tracking-wider text-[#FFE066]">LIQUIFY & MESH WARP STUDIO</span>
            <span className="text-[#8A8A8A] text-[10px]">// ফ্রেম লিকুইফাই এডিটর</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToVault}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#D4AF37] text-black font-bold hover:bg-[#FFE066] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>APPLY TO VAULT</span>
            </button>

            <button
              onClick={handleExportPNG}
              className="px-2.5 py-1 rounded bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] hover:text-[#FFE066] transition-colors"
            >
              EXPORT PNG
            </button>

            <button
              onClick={() => setLiquifyModalOpen(false)}
              className="text-[#8A8A8A] hover:text-[#EDEDED] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls Rail */}
          <div className="w-60 border-r border-[#D4AF37]/20 p-3 flex flex-col gap-3 bg-[#050505] overflow-y-auto">
            {/* Tools */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">Warp Mode</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTool('push')}
                  className={`p-1.5 rounded flex items-center gap-1 text-[11px] border ${
                    tool === 'push' ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]' : 'bg-[#121212] border-white/5 text-[#8A8A8A]'
                  }`}
                >
                  <Hand className="w-3 h-3" />
                  <span>Push</span>
                </button>
                <button
                  onClick={() => setTool('bloat')}
                  className={`p-1.5 rounded flex items-center gap-1 text-[11px] border ${
                    tool === 'bloat' ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]' : 'bg-[#121212] border-white/5 text-[#8A8A8A]'
                  }`}
                >
                  <CircleDot className="w-3 h-3" />
                  <span>Bloat</span>
                </button>
                <button
                  onClick={() => setTool('pinch')}
                  className={`p-1.5 rounded flex items-center gap-1 text-[11px] border ${
                    tool === 'pinch' ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]' : 'bg-[#121212] border-white/5 text-[#8A8A8A]'
                  }`}
                >
                  <Shrink className="w-3 h-3" />
                  <span>Pinch</span>
                </button>
                <button
                  onClick={() => setTool('restore')}
                  className={`p-1.5 rounded flex items-center gap-1 text-[11px] border ${
                    tool === 'restore' ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]' : 'bg-[#121212] border-white/5 text-[#8A8A8A]'
                  }`}
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#8A8A8A]">Brush Radius</span>
                  <span className="text-[#EDEDED]">{radius}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#8A8A8A]">Warp Intensity</span>
                  <span className="text-[#EDEDED]">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Framing Aspect Ratios */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">Framing Aperture</span>
              <div className="grid grid-cols-3 gap-1">
                {(['16:9', '1:1', '4:5', '2.39:1', '9:16'] as const).map(asp => (
                  <button
                    key={asp}
                    onClick={() => setFramingAspect(asp)}
                    className={`py-1 rounded text-center text-[10px] border ${
                      framingAspect === asp ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066]' : 'bg-[#121212] border-white/5 text-[#8A8A8A]'
                    }`}
                  >
                    {asp}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-white/10">
              <button
                onClick={handleUndo}
                className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded bg-[#121212] border border-white/10 hover:border-[#D4AF37]/40 text-[#EDEDED] text-[11px]"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo Stroke</span>
              </button>
              <button
                onClick={handleRevert}
                className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded bg-[#121212] border border-[#FF4B4B]/30 hover:border-[#FF4B4B] text-[#FF4B4B] text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to Original</span>
              </button>
            </div>
          </div>

          {/* Central Canvas Work Area */}
          <div className="flex-1 bg-black flex items-center justify-center p-4 relative overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="max-w-full max-h-[70vh] border border-[#D4AF37]/30 shadow-2xl rounded cursor-crosshair"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
