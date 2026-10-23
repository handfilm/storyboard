/**
 * @file /src/components/StageHeader.tsx
 * @description Master Tactile Stage Top Bar & View Switcher.
 * 
 * Capabilities:
 * 1. Primary View Switcher Tabs (Left Cluster):
 *    - Tactile neomorphic capsule buttons: [ Stage ], [ 12.0s Reels ], [ Monitor ].
 *    - Base: `px-5 py-1.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all duration-200 border`
 *    - Active: `bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/60 shadow-[0_0_16px_rgba(245,166,35,0.35)]`
 *    - Inactive: `bg-[#0c0d10]/80 text-slate-400 border-white/10 hover:text-white hover:border-white/25`
 *    - High-Contrast Hover Cards:
 *      - Stage: "DIRECTOR'S CANVAS" (Single-shot composition, optical framing, and live bilingual overlays).
 *      - 12.0s Reels: "TIMELINE PACING" (Full 100-shot sequence rhythm audit, beat transitions, and reel flow).
 *      - Monitor: "CLEAN PREVIEW" (Zero-UI theatrical reference monitor with 2.39:1 scope mask).
 * 2. Relocated Minimal Telemetry Strip (Far-Right Cluster):
 *    - Pinned ml-auto with ultra-compact monospace badges:
 *      - [ SH001 / 100 ]
 *      - [ 288 F // 24 FPS ]
 *      - [ 12.0s ]
 *    - Telemetry Hover Popover:
 *      - TIMELINE TELEMETRY diagnostic card
 *      - Total Budget: 100 Master Blocks (1200.0s Total Runtime)
 *      - Active Allocation: Shot 001 (Strict 12.000s / 288 Frames @ 24.000 FPS Cinema Lock)
 *      - Storage Persistence: Local IndexedDB Sovereign Cache Synced
 */

import React from 'react';
import { Film, Sliders, Maximize2, Radio, Activity } from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';

export type StagePanelType = 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER';

export interface StageHeaderProps {
  currentPanel: StagePanelType;
  onSelectPanel: (panel: StagePanelType) => void;
  currentIndex?: number;
  totalShots?: number;
  currentFrame?: AnthologyFrame;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideDurationSec?: number;
  fps?: number;
  className?: string;
}

export const StageHeader: React.FC<StageHeaderProps> = ({
  currentPanel,
  onSelectPanel,
  currentIndex = 0,
  totalShots = 100,
  currentFrame,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  slideDurationSec = 12.0,
  fps = 24,
  className = ''
}) => {
  const shotNumStr = String(currentIndex + 1).padStart(3, '0');
  const totalShotsCount = totalShots || 100;
  const frameBudget = Math.round(slideDurationSec * fps);
  const totalRuntimeSec = (totalShotsCount * slideDurationSec).toFixed(1);

  return (
    <header className={`h-14 bg-[#08090C]/95 backdrop-blur-md border-b border-white/10 px-4 md:px-6 flex items-center justify-between z-30 select-none shrink-0 font-mono transition-colors duration-150 ${className}`}>
      {/* 1. Primary View Switcher Tabs (Left Cluster) */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* [ Stage ] Capsule Tab */}
        <div className="relative group/tab">
          <button
            type="button"
            onClick={() => onSelectPanel('TACTILE_STAGE')}
            className={`px-5 py-1.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
              currentPanel === 'TACTILE_STAGE'
                ? 'bg-gradient-to-b from-[#F5A623]/25 via-[#F5A623]/15 to-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/70 shadow-[0_0_18px_rgba(245,166,35,0.4),inset_0_1px_2px_rgba(255,255,255,0.25)] ring-1 ring-[#F5A623]/30'
                : 'bg-[#0c0d10]/90 text-slate-400 border-white/10 hover:text-white hover:border-white/30 hover:bg-[#141520]/90 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.6)]'
            }`}
          >
            <Film className={`w-3.5 h-3.5 transition-transform duration-150 ${currentPanel === 'TACTILE_STAGE' ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
            <span>Stage</span>
          </button>

          {/* Hover Card for Stage */}
          <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/35 p-3 rounded-xl shadow-2xl backdrop-blur-xl animate-fade-in absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
            <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
              <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                DIRECTOR'S CANVAS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Single-shot composition, optical framing, and live bilingual overlays.
            </p>
            <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>2.39:1 ANAMORPHIC</span>
              <span className="text-amber-400 font-bold">LIVE COMPOSITOR</span>
            </div>
          </div>
        </div>

        {/* [ 12.0s Reels ] Capsule Tab */}
        <div className="relative group/tab">
          <button
            type="button"
            onClick={() => onSelectPanel('SPLIT')}
            className={`px-5 py-1.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
              currentPanel === 'SPLIT'
                ? 'bg-gradient-to-b from-[#F5A623]/25 via-[#F5A623]/15 to-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/70 shadow-[0_0_18px_rgba(245,166,35,0.4),inset_0_1px_2px_rgba(255,255,255,0.25)] ring-1 ring-[#F5A623]/30'
                : 'bg-[#0c0d10]/90 text-slate-400 border-white/10 hover:text-white hover:border-white/30 hover:bg-[#141520]/90 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.6)]'
            }`}
          >
            <Sliders className={`w-3.5 h-3.5 transition-transform duration-150 ${currentPanel === 'SPLIT' ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
            <span>12.0s Reels</span>
          </button>

          {/* Hover Card for 12.0s Reels */}
          <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/35 p-3 rounded-xl shadow-2xl backdrop-blur-xl animate-fade-in absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
            <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
              <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                TIMELINE PACING
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Full 100-shot sequence rhythm audit, beat transitions, and reel flow.
            </p>
            <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>12.000s QUANTIZED</span>
              <span className="text-sky-400 font-bold">100-SHOT SEQUENCE</span>
            </div>
          </div>
        </div>

        {/* [ Monitor ] Capsule Tab */}
        <div className="relative group/tab">
          <button
            type="button"
            onClick={() => onSelectPanel('OPTICAL')}
            className={`px-5 py-1.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
              currentPanel === 'OPTICAL'
                ? 'bg-gradient-to-b from-[#F5A623]/25 via-[#F5A623]/15 to-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/70 shadow-[0_0_18px_rgba(245,166,35,0.4),inset_0_1px_2px_rgba(255,255,255,0.25)] ring-1 ring-[#F5A623]/30'
                : 'bg-[#0c0d10]/90 text-slate-400 border-white/10 hover:text-white hover:border-white/30 hover:bg-[#141520]/90 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.6)]'
            }`}
          >
            <Maximize2 className={`w-3.5 h-3.5 transition-transform duration-150 ${currentPanel === 'OPTICAL' ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
            <span>Monitor</span>
          </button>

          {/* Hover Card for Monitor */}
          <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/35 p-3 rounded-xl shadow-2xl backdrop-blur-xl animate-fade-in absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
            <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
              <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                CLEAN PREVIEW
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Zero-UI theatrical reference monitor with 2.39:1 scope mask.
            </p>
            <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>ZERO INTERFERENCE</span>
              <span className="text-emerald-400 font-bold">2.39:1 REFERENCE</span>
            </div>
          </div>
        </div>

        {/* Optional Playback Mode Indicator / Toggle */}
        {onSelectPlaybackMode && (
          <button
            type="button"
            onClick={() => onSelectPlaybackMode(playbackMode === 'sequence' ? 'solo' : 'sequence')}
            className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border active:scale-[0.98] ${
              playbackMode === 'sequence'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-[#F5A623]'
            }`}
            title="Toggle between 12s Sequence advance and Solo Scrub"
          >
            <Radio className="w-3 h-3" />
            <span>{playbackMode === 'sequence' ? 'ANIMATIC (12s)' : 'SOLO SCRUB'}</span>
          </button>
        )}
      </div>

      {/* 2. Relocated Minimal Telemetry Strip (Far-Right Cluster) */}
      <div className="ml-auto flex items-center space-x-2.5 relative group/telemetry cursor-default text-xs font-mono">
        {/* Minimal Default Display */}
        <div className="flex items-center space-x-2">
          {/* Badge 1: [ SH001 / 100 ] */}
          <div className="text-[11px] font-mono text-[#F5A623]/90 bg-black/60 border border-[#F5A623]/20 px-2.5 py-1 rounded-md flex items-center gap-1 group-hover/telemetry:border-[#F5A623]/50 transition-all duration-150">
            <span className="text-[#F5A623] font-bold">[</span>
            <span className="text-[#F5A623] font-bold">SH{shotNumStr}</span>
            <span className="text-slate-500">/</span>
            <span>{totalShotsCount}</span>
            <span className="text-[#F5A623] font-bold">]</span>
          </div>

          {/* Badge 2: [ 288 F // 24 FPS ] */}
          <div className="hidden sm:flex text-[11px] font-mono text-[#F5A623]/90 bg-black/60 border border-[#F5A623]/20 px-2.5 py-1 rounded-md items-center gap-1 group-hover/telemetry:border-[#F5A623]/50 transition-all duration-150">
            <span className="text-slate-400 font-bold">[</span>
            <span className="font-semibold">{frameBudget} F</span>
            <span className="text-slate-500">//</span>
            <span className="text-slate-300">{fps} FPS</span>
            <span className="text-slate-400 font-bold">]</span>
          </div>

          {/* Badge 3: [ 12.0s ] */}
          <div className="text-[11px] font-mono text-[#F5A623]/90 bg-black/60 border border-[#F5A623]/20 px-2.5 py-1 rounded-md flex items-center gap-1 font-bold group-hover/telemetry:border-[#F5A623]/50 shadow-sm transition-all duration-150">
            <span className="text-slate-400 font-bold">[</span>
            <span>{slideDurationSec.toFixed(1)}s</span>
            <span className="text-slate-400 font-bold">]</span>
          </div>
        </div>

        {/* Telemetry Hover Popover */}
        <div className="pointer-events-none z-50 bg-[#08090C]/98 border border-[#F5A623]/35 p-4 rounded-xl shadow-2xl backdrop-blur-xl absolute right-0 top-full mt-2 w-80 text-left opacity-0 translate-y-1 group-hover/telemetry:opacity-100 group-hover/telemetry:translate-y-0 transition-all duration-150 ease-out font-mono text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="text-xs font-bold text-[#F5A623] uppercase tracking-wider font-mono">
                TIMELINE TELEMETRY
              </span>
            </div>
            <span className="text-[9px] bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] px-1.5 py-0.5 rounded font-bold">
              LIVE
            </span>
          </div>

          {/* Metrics List */}
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400">Total Budget:</span>
              <span className="text-white font-bold">{totalShotsCount} Master Blocks ({totalRuntimeSec}s Total Runtime)</span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400">Active Allocation:</span>
              <span className="text-[#F5A623] font-bold">
                Shot {shotNumStr} (Strict {slideDurationSec.toFixed(3)}s / {frameBudget} Frames @ {fps.toFixed(3)} FPS Cinema Lock)
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5 border-t border-white/5 pt-2">
              <span className="text-slate-400">Storage Persistence:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                Local IndexedDB Sovereign Cache Synced
              </span>
            </div>
          </div>

          {/* Active Shot Frame Title */}
          {currentFrame && (
            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-slate-300 truncate font-mono">
              <span className="text-[#F5A623] font-bold mr-1.5">ACTIVE:</span>
              <span>{currentFrame.bengaliTitle || 'দৃষ্টি'} // {currentFrame.title || 'THE SINGULARITY'}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
