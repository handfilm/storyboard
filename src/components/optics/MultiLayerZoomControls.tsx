/**
 * @file /src/components/optics/MultiLayerZoomControls.tsx
 * @description Master Tactical Multi-Layer Zoom Controller for HANDFILM Cinema Engine.
 * 
 * Features:
 * - Independent Foreground Zoom (titles, bilingual subtitles, director annotations, reticles)
 * - Independent Background Zoom (4K raw video / image media plate)
 * - Hitchcock Vertigo / Dolly Zoom Coupling Engine:
 *   - Inversely links background scale to foreground scale, delivering the iconic optical vertigo effect.
 * - 1-Click Directorial Presets:
 *   - '1:1 FLAT', 'VERTIGO PUSH', 'VERTIGO PULL', 'FG HERO POP', 'DEEP BG'
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { ZoomIn, ZoomOut, Link, Unlink, RotateCcw, Eye, Sparkles, X, SlidersHorizontal } from 'lucide-react';

export interface MultiLayerZoomControlsProps {
  variant?: 'floating-hud' | 'embedded' | 'inspector';
  className?: string;
  onClose?: () => void;
}

export const MultiLayerZoomControls: React.FC<MultiLayerZoomControlsProps> = ({
  variant = 'floating-hud',
  className = '',
  onClose
}) => {
  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const setFg = useStudioStore((s) => s.setForegroundZoom);
  const setBg = useStudioStore((s) => s.setBackgroundZoom);
  const setVertigo = useStudioStore((s) => s.setVertigoLinked);
  const resetZoom = useStudioStore((s) => s.resetMultiLayerZoom);

  const applyPreset = (preset: 'flat' | 'push' | 'pull' | 'fg-pop' | 'deep-bg') => {
    switch (preset) {
      case 'flat':
        resetZoom();
        break;
      case 'push':
        setVertigo(true);
        setBg(1.45);
        break;
      case 'pull':
        setVertigo(true);
        setBg(0.72);
        break;
      case 'fg-pop':
        setVertigo(false);
        setFg(1.35);
        setBg(1.0);
        break;
      case 'deep-bg':
        setVertigo(false);
        setFg(1.0);
        setBg(1.30);
        break;
    }
  };

  return (
    <div
      className={`bg-[#08080C]/98 backdrop-blur-2xl border border-[#D4AF37]/50 rounded-[4px] shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(212,175,55,0.25)] p-3 select-none font-mono-tech z-40 text-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFE066] shadow-[0_0_8px_#FFE066]" />
          <span className="font-bold text-[#FFE066] tracking-wider text-[10.5px] uppercase">
            MULTI-LAYER ZOOM ENGINE
          </span>
          {isVertigo && (
            <span className="text-[8px] bg-amber-500/20 text-[#FFE066] border border-amber-500/40 px-1.5 py-0.2 rounded font-bold uppercase tracking-tight">
              VERTIGO LINKED
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetZoom}
            className="p-1 rounded-[2px] bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-[#FFE066] border border-white/10 cursor-pointer"
            title="Reset All Layers to 1.00x Flat"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[2px] bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
              title="Close Zoom HUD"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sliders Container */}
      <div className="space-y-3">
        {/* 1. Foreground Layer Zoom */}
        <div className="bg-[#050508] p-2 rounded-[2px] border border-white/10">
          <div className="flex items-center justify-between text-[9.5px] mb-1.5">
            <span className="text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              FOREGROUND ZOOM (TITLES & HUD)
            </span>
            <span className="text-[#FFE066] font-bold tabular-nums text-[10px]">
              {fgZoom.toFixed(2)}x
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3 h-3 text-zinc-500 shrink-0" />
            <input
              type="range"
              min="0.30"
              max="2.50"
              step="0.05"
              value={fgZoom}
              onChange={(e) => setFg(parseFloat(e.target.value))}
              className="w-full accent-[#FFE066] cursor-pointer h-1 bg-white/20 rounded"
              title={`Foreground Scale: ${fgZoom.toFixed(2)}x`}
            />
            <ZoomIn className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* 2. Vertigo Dolly Zoom Link Switch */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-[#0C0C12] border border-white/10 rounded-[2px]">
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-300">
            {isVertigo ? (
              <Link className="w-3.5 h-3.5 text-[#FFE066]" />
            ) : (
              <Unlink className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span className="font-bold">VERTIGO / DOLLY ZOOM LINK</span>
          </div>
          <button
            type="button"
            onClick={() => setVertigo(!isVertigo)}
            className={`px-2 py-0.5 rounded-[2px] text-[8.5px] font-bold cursor-pointer transition-all border ${
              isVertigo
                ? 'bg-[#D4AF37] text-black border-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
          >
            {isVertigo ? 'LINKED (ON)' : 'INDEPENDENT'}
          </button>
        </div>

        {/* 3. Background Layer Zoom */}
        <div className="bg-[#050508] p-2 rounded-[2px] border border-white/10">
          <div className="flex items-center justify-between text-[9.5px] mb-1.5">
            <span className="text-zinc-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              BACKGROUND ZOOM (RAW MEDIA PLATE)
            </span>
            <span className="text-[#FFE066] font-bold tabular-nums text-[10px]">
              {bgZoom.toFixed(2)}x
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3 h-3 text-zinc-500 shrink-0" />
            <input
              type="range"
              min="0.30"
              max="2.50"
              step="0.05"
              value={bgZoom}
              onChange={(e) => setBg(parseFloat(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded"
              title={`Background Scale: ${bgZoom.toFixed(2)}x`}
            />
            <ZoomIn className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="pt-2.5 mt-2.5 border-t border-white/10">
        <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1.5">
          OPTICAL PRESETS
        </div>
        <div className="grid grid-cols-5 gap-1 text-[8px]">
          <button
            type="button"
            onClick={() => applyPreset('flat')}
            className="py-1 rounded-[2px] bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white cursor-pointer text-center"
            title="Reset both to 1.00x"
          >
            1:1 FLAT
          </button>
          <button
            type="button"
            onClick={() => applyPreset('push')}
            className="py-1 rounded-[2px] bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 cursor-pointer text-center font-bold"
            title="Hitchcock Vertigo Push (BG 1.45x / FG 0.69x)"
          >
            VERTIGO +
          </button>
          <button
            type="button"
            onClick={() => applyPreset('pull')}
            className="py-1 rounded-[2px] bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 cursor-pointer text-center font-bold"
            title="Hitchcock Vertigo Pull (BG 0.72x / FG 1.39x)"
          >
            VERTIGO -
          </button>
          <button
            type="button"
            onClick={() => applyPreset('fg-pop')}
            className="py-1 rounded-[2px] bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 cursor-pointer text-center font-bold"
            title="Foreground Pop (FG 1.35x / BG 1.00x)"
          >
            FG POP
          </button>
          <button
            type="button"
            onClick={() => applyPreset('deep-bg')}
            className="py-1 rounded-[2px] bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-300 hover:text-white cursor-pointer text-center"
            title="Deep Background (BG 1.30x / FG 1.00x)"
          >
            DEEP BG
          </button>
        </div>
      </div>
    </div>
  );
};
