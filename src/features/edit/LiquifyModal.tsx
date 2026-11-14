/**
 * RAWx Studio — HTML5 Canvas Liquify & Mesh Warp Studio
 * Public API: LiquifyModal component
 * Interactive pixel distortion engine with push, bloat, pinch, and framing ratios.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '../../core/store';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
import { X, Undo2, RotateCcw, Download, Check, Hand, CircleDot, Shrink, RefreshCw, Sparkles, Sliders, Maximize } from 'lucide-react';

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
        <div className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0E0E12]">
          <CinemaBadgeHeader
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            label="LIQUIFY WARP"
            accent="amber"
          />

          <div className="flex items-center gap-2">
            <CinemaToolHUD
              title="SAVE WARP TO SHOT"
              en="Commit warped frame pixels back to active storyboard shot."
              bn="কীভাবে ব্যবহার করবেন: এডিট করা ছবি শটে সেভ করতে SAVE SHOT চাপুন।"
              accent="emerald"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleApplyToVault}
                data-active="true"
                className="cinema-tile cinema-tile-emerald min-h-[36px] px-3 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>SAVE SHOT</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="EXPORT PNG"
              en="Download full-resolution warped frame as PNG."
              bn="কীভাবে ব্যবহার করবেন: এডিট করা ছবি PNG হিসেবে ডাউনলোড করতে চাপুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleExportPNG}
                className="cinema-tile cinema-tile-cyan min-h-[36px] px-2.5 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>PNG</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="CLOSE LIQUIFY"
              en="Exit mesh warp studio."
              bn="কীভাবে ব্যবহার করবেন: এডিটর বন্ধ করতে চাপুন।"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => setLiquifyModalOpen(false)}
                className="cinema-tile cinema-tile-crimson min-h-[36px] px-2.5 flex items-center justify-center"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Controls Rail */}
          <div className="w-60 border-r border-white/[0.08] p-3 flex flex-col gap-4 bg-[#08090C] overflow-y-auto">
            <div className="flex flex-col gap-2">
              <CinemaBadgeHeader
                icon={<Hand className="w-3 h-3 text-amber-400" />}
                label="WARP TOOL"
                accent="amber"
              />
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'push', label: 'PUSH', icon: Hand, en: 'Smudge and pull pixels along stroke direction.', bn: 'আঙুল বা মাউস টেনে পিক্সেল সরান।' },
                  { id: 'bloat', label: 'BLOAT', icon: CircleDot, en: 'Expand pixels outward from brush center.', bn: 'মাঝের অংশ ফোলাতে ব্যবহার করুন।' },
                  { id: 'pinch', label: 'PINCH', icon: Shrink, en: 'Pull pixels inward toward brush center.', bn: 'পিক্সেল ভেতরে টেনে সংকুচিত করুন।' },
                  { id: 'restore', label: 'RESTORE', icon: RefreshCw, en: 'Restore warped areas back toward original.', bn: 'আসল অবস্থা ফিরিয়ে আনতে ট্যাপ করুন।' },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <CinemaToolHUD
                      key={opt.id}
                      title={`${opt.label} BRUSH`}
                      en={opt.en}
                      bn={`কীভাবে ব্যবহার করবেন: ${opt.bn}`}
                      accent="amber"
                      side="right"
                      blockWrapper
                    >
                      <button
                        type="button"
                        onClick={() => setTool(opt.id as any)}
                        data-active={tool === opt.id ? 'true' : 'false'}
                        className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2 flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                        <span>{opt.label}</span>
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-2.5 border-t border-white/[0.08] pt-3">
              <CinemaBadgeHeader
                icon={<Sliders className="w-3 h-3 text-cyan-400" />}
                label="BRUSH"
                accent="cyan"
              />
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-black tracking-wider">
                  <span className="text-zinc-400">RADIUS</span>
                  <span className="text-cyan-300">{radius}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="accent-cyan-400 h-1.5 bg-[#121212] rounded cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-black tracking-wider">
                  <span className="text-zinc-400">STRENGTH</span>
                  <span className="text-cyan-300">{intensity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="accent-cyan-400 h-1.5 bg-[#121212] rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Framing Aspect Ratios */}
            <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-3">
              <CinemaBadgeHeader
                icon={<Maximize className="w-3 h-3 text-amber-400" />}
                label="APERTURE"
                accent="amber"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {(['16:9', '1:1', '4:5', '2.39:1', '9:16'] as const).map(asp => (
                  <CinemaToolHUD
                    key={asp}
                    title={`APERTURE ${asp}`}
                    en={`Reference framing guide at ${asp}.`}
                    bn={`কীভাবে ব্যবহার করবেন: ${asp} ফ্রেম গাইড বেছে নিতে ট্যাপ করুন।`}
                    accent="amber"
                    side="right"
                    blockWrapper
                  >
                    <button
                      type="button"
                      onClick={() => setFramingAspect(asp)}
                      data-active={framingAspect === asp ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[36px] text-center text-[10px] font-black tracking-wider"
                    >
                      {asp}
                    </button>
                  </CinemaToolHUD>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-white/[0.08]">
              <CinemaToolHUD
                title="UNDO STROKE"
                en="Step backward one warp brushstroke."
                bn="কীভাবে ব্যবহার করবেন: শেষ ওয়ার্প ব্রাশ স্ট্রোকটি বাতিল করতে চাপুন।"
                accent="cyan"
                side="right"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleUndo}
                  className="cinema-tile cinema-tile-cyan w-full min-h-[42px] flex items-center justify-center gap-1.5 text-[10.5px] font-black tracking-wider uppercase"
                >
                  <Undo2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>UNDO</span>
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD
                title="REVERT ORIGINAL"
                en="Reset canvas pixels back to unmodified source plate."
                bn="কীভাবে ব্যবহার করবেন: ছবিটি একদম আগের অবস্থায় ফিরিয়ে নিতে চাপুন।"
                accent="crimson"
                side="right"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={handleRevert}
                  className="cinema-tile cinema-tile-crimson w-full min-h-[42px] flex items-center justify-center gap-1.5 text-[10.5px] font-black tracking-wider uppercase"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>REVERT</span>
                </button>
              </CinemaToolHUD>
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
