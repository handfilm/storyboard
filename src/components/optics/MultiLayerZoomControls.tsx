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
import { ZoomIn, ZoomOut, Link, Unlink, RotateCcw, X, Layers } from 'lucide-react';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

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
      className={`bg-[#08080C]/98 backdrop-blur-2xl border border-[#26282E] rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.95)] p-3 select-none font-mono-tech z-40 text-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
        <CinemaBadgeHeader
          icon={<Layers className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="PARALLAX ZOOM"
          accent="amber"
        />

        <div className="flex items-center gap-1.5">
          {isVertigo && (
            <span className="text-[9px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded uppercase">
              VERTIGO
            </span>
          )}
          <CinemaToolHUD
            title="RESET ZOOM"
            en="Restores foreground and background zoom layers back to 1.00x."
            bn="জুম রিসেট করে আসল ১.০০x সাইজে ফিরতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={resetZoom}
              className="cinema-tile cinema-tile-amber p-1 rounded-md cursor-pointer"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
          {onClose && (
            <CinemaToolHUD
              title="CLOSE ZOOM HUD"
              en="Closes the parallax zoom panel."
              bn="জুম প্যানেল বন্ধ করতে চাপুন।"
              accent="amber"
            >
              <button
                type="button"
                onClick={onClose}
                className="cinema-tile cinema-tile-amber p-1 rounded-md cursor-pointer"
                aria-label="Close Zoom HUD"
              >
                <X className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
              </button>
            </CinemaToolHUD>
          )}
        </div>
      </div>

      {/* Sliders Container */}
      <div className="space-y-3">
        {/* 1. Foreground Layer Zoom */}
        <div className="bg-[#111215] p-2 rounded-md border border-[#26282E]">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-cyan-300 font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              FG ZOOM
            </span>
            <span className="text-[#FFE066] font-black tabular-nums">
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
              aria-label="Foreground Zoom"
            />
            <ZoomIn className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* 2. Vertigo Dolly Zoom Link Switch */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-[#111215] border border-[#26282E] rounded-md">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-200 font-black tracking-wider uppercase">
            {isVertigo ? (
              <Link className="w-3.5 h-3.5 text-amber-400" strokeWidth={2.2} />
            ) : (
              <Unlink className="w-3.5 h-3.5 text-zinc-500" strokeWidth={2.2} />
            )}
            <span>VERTIGO</span>
          </div>
          <CinemaToolHUD
            title="VERTIGO DOLLY LINK"
            en="Inversely couples background and foreground zoom for Hitchcock vertigo."
            bn="ব্যাকগ্রাউন্ড ও টাইটেলকে বিপরীতমুখী জুম লিংকে বাঁধতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={() => setVertigo(!isVertigo)}
              data-active={isVertigo ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase cursor-pointer"
            >
              {isVertigo ? 'LINKED' : 'FREE'}
            </button>
          </CinemaToolHUD>
        </div>

        {/* 3. Background Layer Zoom */}
        <div className="bg-[#111215] p-2 rounded-md border border-[#26282E]">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-amber-300 font-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              BG ZOOM
            </span>
            <span className="text-[#FFE066] font-black tabular-nums">
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
              aria-label="Background Zoom"
            />
            <ZoomIn className="w-3 h-3 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Optical Lens Depth Perception Gauge */}
        <div className="bg-[#111215] p-2 rounded-md border border-[#26282E] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-zinc-400 uppercase font-black tracking-wider">DEPTH SPLIT</span>
            <span className="text-[#FFE066] font-black tabular-nums">
              {(fgZoom - bgZoom) >= 0 ? `+${(fgZoom - bgZoom).toFixed(2)}` : (fgZoom - bgZoom).toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden flex relative border border-white/10">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 z-10 -translate-x-1/2" />
            {(fgZoom - bgZoom) >= 0 ? (
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-[#FFE066] rounded-r-full shadow-[0_0_8px_rgba(255,224,102,0.8)]"
                style={{
                  marginLeft: '50%',
                  width: `${Math.min(50, Math.max(0, ((fgZoom - bgZoom) / 1.5) * 50))}%`
                }}
              />
            ) : (
              <div
                className="h-full bg-gradient-to-l from-cyan-500 to-cyan-300 rounded-l-full shadow-[0_0_8px_rgba(0,229,255,0.8)] ml-auto"
                style={{
                  marginRight: '50%',
                  width: `${Math.min(50, Math.max(0, (Math.abs(fgZoom - bgZoom) / 1.5) * 50))}%`
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[8px] text-zinc-400 font-black tracking-wider uppercase pt-0.5">
            <span>BG+</span>
            <span>{Math.abs(fgZoom - bgZoom) < 0.1 ? 'FLAT' : (fgZoom > bgZoom ? 'BOKEH' : 'WIDE')}</span>
            <span>FG+</span>
          </div>
        </div>
      </div>

      {/* Preset Quick Buttons */}
      <div className="pt-2.5 mt-2.5 border-t border-white/10">
        <div className="grid grid-cols-5 gap-1">
          <CinemaToolHUD
            title="1:1 FLAT ZOOM"
            en="Resets foreground and background scales equally to 1.00x."
            bn="দুটি লেয়ারকে স্বাভাবিক ১.০০x সাইজে ফিরিয়ে আনতে চাপুন।"
            accent="cyan"
          >
            <button
              type="button"
              onClick={() => applyPreset('flat')}
              className="cinema-tile cinema-tile-cyan w-full py-1.5 px-1 rounded-md text-[9.5px] font-black tracking-wider uppercase cursor-pointer text-center"
            >
              1:1 FLAT
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="VERTIGO PUSH"
            en="Zooms background in (1.45x) while pulling foreground out."
            bn="পেছনের দৃশ্য জুম-ইন ও টাইটেল ছোট করে ভার্টিগো ইফেক্ট পেতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={() => applyPreset('push')}
              className="cinema-tile cinema-tile-amber w-full py-1.5 px-1 rounded-md text-[9.5px] font-black tracking-wider uppercase cursor-pointer text-center"
            >
              PUSH +
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="VERTIGO PULL"
            en="Pulls background wide (0.72x) while enlarging foreground."
            bn="পেছনের দৃশ্য ওয়াইড করে টাইটেল সামনে পপ করাতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={() => applyPreset('pull')}
              className="cinema-tile cinema-tile-amber w-full py-1.5 px-1 rounded-md text-[9.5px] font-black tracking-wider uppercase cursor-pointer text-center"
            >
              PULL -
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="FG HERO POP"
            en="Scales foreground titles up to 1.35x over 1.00x plate."
            bn="ব্যাকগ্রাউন্ড স্থির রেখে শুধু টাইটেল বড় করে ফুটিয়ে তুলতে চাপুন।"
            accent="cyan"
          >
            <button
              type="button"
              onClick={() => applyPreset('fg-pop')}
              className="cinema-tile cinema-tile-cyan w-full py-1.5 px-1 rounded-md text-[9.5px] font-black tracking-wider uppercase cursor-pointer text-center"
            >
              FG POP
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="DEEP BACKGROUND"
            en="Pushes background plate to 1.30x with steady 1.00x foreground."
            bn="টাইটেল স্থির রেখে ব্যাকগ্রাউন্ড ভিডিও ক্লিপ জুম করতে চাপুন।"
            accent="emerald"
          >
            <button
              type="button"
              onClick={() => applyPreset('deep-bg')}
              className="cinema-tile cinema-tile-emerald w-full py-1.5 px-1 rounded-md text-[9.5px] font-black tracking-wider uppercase cursor-pointer text-center"
            >
              DEEP BG
            </button>
          </CinemaToolHUD>
        </div>
      </div>
    </div>
  );
};
