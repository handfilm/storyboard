/**
 * @file /src/components/StageHeader.tsx
 * @description Ultra-Minimalist Single-Tier Glass Header for HANDFILM Stage Viewport.
 * 
 * Design Architecture:
 * 1. Single-Tier Glass Bar:
 *    - `h-12 bg-black/60 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between`
 * 2. Left:
 *    - Sleek `HANDFILM` atelier logo only.
 * 3. Center:
 *    - Minimalist hover-pill switches: [ Stage ], [ Reels ], [ Scrub ], [ Multi-Cam ].
 * 4. Right Actions:
 *    - Compact [ ⚡ Compile ] pill with compile notification.
 *    - Tactical Red Dot [ ● REC ] launcher.
 *    - Minimalist [ ⤓ Export ] button.
 *    - Clean [ ⋯ ] flyout menu for secondary settings and studio modules.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Sliders, 
  Scissors, 
  Video, 
  Zap, 
  Download, 
  MoreHorizontal, 
  Settings, 
  SlidersHorizontal, 
  Sparkles, 
  Layers, 
  Keyboard, 
  Check, 
  Activity 
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';

export type StagePanelType = 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM';

export interface StageHeaderProps {
  currentPanel: StagePanelType;
  onSelectPanel: (panel: StagePanelType) => void;
  currentIndex?: number;
  totalShots?: number;
  currentFrame?: AnthologyFrame;
  frames?: AnthologyFrame[];
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
  slideDurationSec?: number;
  fps?: number;
  className?: string;
  onOpenRecorder?: () => void;
  onOpenExport?: () => void;
  onCompile?: () => void;
}

export const StageHeader: React.FC<StageHeaderProps> = ({
  currentPanel,
  onSelectPanel,
  currentIndex = 0,
  totalShots = 100,
  currentFrame,
  frames,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  slideDurationSec = 12.0,
  fps = 24,
  className = '',
  onOpenRecorder,
  onOpenExport,
  onCompile
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [compileState, setCompileState] = useState<'idle' | 'compiling' | 'success'>('idle');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close flyout menu on outside click or escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleTriggerCompile = () => {
    if (onCompile) {
      onCompile();
      return;
    }
    setCompileState('compiling');
    setTimeout(() => {
      setCompileState('success');
      setTimeout(() => setCompileState('idle'), 2400);
    }, 600);
  };

  const handleLaunchRecorder = () => {
    if (onOpenRecorder) {
      onOpenRecorder();
    } else {
      eventBus.emit('recorder:open');
    }
  };

  const handleTriggerExport = () => {
    if (onOpenExport) {
      onOpenExport();
    } else {
      eventBus.emit('export:open');
    }
  };

  const panels: { id: StagePanelType; label: string; icon: React.ReactNode }[] = [
    { id: 'TACTILE_STAGE', label: 'Stage', icon: <Film className="w-3 h-3" /> },
    { id: 'SPLIT', label: 'Reels', icon: <Sliders className="w-3 h-3" /> },
    { id: 'SEQUENCER', label: 'Scrub', icon: <Scissors className="w-3 h-3" /> },
    { id: 'MULTICAM', label: 'Multi-Cam', icon: <Video className="w-3 h-3" /> }
  ];

  return (
    <header className={`h-12 bg-black/60 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between z-30 select-none shrink-0 font-mono transition-colors duration-200 ${className}`}>
      
      {/* 1. Left: Sleek HANDFILM Atelier Brand Logo */}
      <div className="flex items-center gap-2.5">
        <a 
          href="/" 
          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          title="HANDFILM Atelier"
        >
          <div className="w-4 h-4 rotate-45 border border-[#F5A623] bg-[#F5A623]/20 flex items-center justify-center transition-transform duration-300 group-hover:rotate-90 group-hover:bg-[#F5A623]/30">
            <div className="w-1.5 h-1.5 bg-[#F5A623]" />
          </div>
          <span className="text-xs font-bold tracking-[0.25em] text-white group-hover:text-[#FFE066] transition-colors uppercase font-mono">
            HANDFILM
          </span>
        </a>
      </div>

      {/* 2. Center: Minimalist Hover-Pill Switches */}
      <nav className="flex items-center p-0.5 bg-black/40 border border-white/10 rounded-full shadow-inner">
        {panels.map((p) => {
          const isActive = currentPanel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPanel(p.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-[#F5A623]/20 text-[#FFE066] border border-[#F5A623]/60 shadow-[0_0_12px_rgba(245,166,35,0.25)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#F5A623]/40'
              }`}
            >
              <span className={isActive ? 'text-[#F5A623]' : 'text-white/40'}>
                {p.icon}
              </span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Right Actions: [ ⚡ Compile ], [ ● REC ], [ ⤓ Export ], [ ⋯ ] */}
      <div className="flex items-center gap-2">
        {/* Compact Compile Pill */}
        <button
          type="button"
          onClick={handleTriggerCompile}
          disabled={compileState === 'compiling'}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all duration-200 cursor-pointer ${
            compileState === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : compileState === 'compiling'
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 animate-pulse'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#F5A623]/60 text-white/80 hover:text-[#FFE066]'
          }`}
          title="Compile State & Check Invariants"
        >
          {compileState === 'success' ? (
            <Check className="w-3 h-3 text-emerald-400" />
          ) : (
            <Zap className={`w-3 h-3 ${compileState === 'compiling' ? 'animate-spin text-amber-400' : 'text-[#F5A623]'}`} />
          )}
          <span className="hidden sm:inline">
            {compileState === 'success' ? 'COMPILED' : compileState === 'compiling' ? 'SYNCING...' : 'Compile'}
          </span>
        </button>

        {/* Tactical Red Dot [ ● REC ] Launcher */}
        <button
          type="button"
          onClick={handleLaunchRecorder}
          className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-[#1a0507] hover:bg-[#28080a] border border-red-500/40 hover:border-red-500 text-red-400 hover:text-red-300 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.2)]"
          title="Launch Floating Red-Pill Screen Recorder"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
          <span>REC</span>
        </button>

        {/* Minimalist [ ⤓ Export ] Button */}
        <button
          type="button"
          onClick={handleTriggerExport}
          className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-[#F5A623]/15 hover:bg-[#F5A623]/25 border border-[#F5A623]/60 hover:border-[#F5A623] text-[#FFE066] transition-all duration-200 cursor-pointer shadow-[0_0_10px_rgba(245,166,35,0.2)]"
          title="Export Cinema Sequence (MP4 / OTIO / XML)"
        >
          <Download className="w-3 h-3 text-[#F5A623]" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Clean [ ⋯ ] Flyout Trigger */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#F5A623]/60 text-white/70 hover:text-white transition-all duration-200 cursor-pointer"
            title="More Options & Studio Links"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#0c0d12]/95 border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-1.5 text-xs font-mono text-white/80 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                type="button"
                onClick={() => {
                  useStudioStore.getState().toggleInspector();
                  setIsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/85"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#F5A623]" />
                <span>Director Inspector</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  useStudioStore.getState().toggleLeftRail();
                  setIsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/85"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Media Asset Vault</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  eventBus.emit('shortcuts:open');
                  setIsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/85"
              >
                <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                <span>Keyboard Shortcuts (?)</span>
              </button>
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  eventBus.emit('diagnostics:open');
                  setIsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/70 hover:text-white"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Diagnostics & Self-Test</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  eventBus.emit('theme:open');
                  setIsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/70 hover:text-white"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Studio Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
