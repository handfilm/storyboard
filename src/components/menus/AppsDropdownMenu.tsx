/**
 * @file /src/components/menus/AppsDropdownMenu.tsx
 * @description Master Mini-OS Launcher & Apps Dropdown for HANDFILM Omni-Studio.
 * Categorized glassmorphic grid menu (MacOS Control Center meets Cyberpunk):
 * - [ CORE STUDIO ]: HANDFILM NLE (Active)
 * - [ AUDIO & AI ]: NEURAL VOX, MASTERING BUS
 * - [ VISUALS & GFX ]: VECTOR FORGE, COLOR LAB
 * - [ CONNECTED ECOSYSTEM ]: HUB, VAULT, R2 / STREAM, BLOOM-APP, DEEPER / SCOPES, LAB / AI DIRECTOR
 */

import React, { useRef, useEffect } from 'react';
import { 
  Film, 
  Mic, 
  Sliders, 
  PenTool, 
  Palette, 
  Globe, 
  FolderOpen, 
  Cloud, 
  Sparkles, 
  Activity, 
  Wand2, 
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Check
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { eventBus } from '../../core/eventBus';

export interface AppsDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNeuralVox: () => void;
  onOpenVectorForge: () => void;
  onOpenMasteringBus?: () => void;
  onOpenColorLab?: () => void;
  onOpenProjectManager?: () => void;
  onOpenR2Automation?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  className?: string;
}

export const AppsDropdownMenu: React.FC<AppsDropdownMenuProps> = ({
  isOpen,
  onClose,
  onOpenNeuralVox,
  onOpenVectorForge,
  onOpenMasteringBus,
  onOpenColorLab,
  onOpenProjectManager,
  onOpenR2Automation,
  onOpenBloomSequencer,
  onOpenVideoScopes,
  onOpenAiStudio,
  className = ''
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      ref={menuRef}
      className={`absolute right-0 top-full mt-2 w-80 sm:w-88 bg-[#0E1015]/98 border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(245,166,35,0.15)] backdrop-blur-2xl p-3 text-xs font-mono text-white/90 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ${className}`}
    >
      {/* Header / Mini-OS Status Pill */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          <span className="font-bold text-[10px] tracking-wider text-amber-400 uppercase">
            HANDFILM OMNI-STUDIO // APPS
          </span>
        </div>
        <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-zinc-400">
          MINI-OS v2.4
        </span>
      </div>

      {/* 1. [ CORE STUDIO ] */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between px-1">
          <span>[ CORE STUDIO ]</span>
          <span className="text-emerald-400 text-[8px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVE
          </span>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between text-left shadow-[0_0_12px_rgba(245,166,35,0.15)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-[11px] text-amber-200">🎬 HANDFILM NLE</div>
              <div className="text-[8.5px] text-zinc-400">100-shot 2.39:1 anamorphic timeline</div>
            </div>
          </div>
          <span className="text-[8.5px] font-bold text-amber-300 font-mono">STANDBY</span>
        </div>
      </div>

      {/* 2. [ AUDIO & AI ] */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-1">
          [ AUDIO & AI ]
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {/* NEURAL VOX */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNeuralVox();
            }}
            className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-[#E50914]/15 border border-white/10 hover:border-[#E50914]/50 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[11px] text-white group-hover:text-red-300 flex items-center gap-1.5">
                  <span>🗣️ NEURAL VOX</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/40">NEW</span>
                </div>
                <div className="text-[8.5px] text-zinc-400">Text-to-Speech & Voice Clone Engine</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* MASTERING BUS */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenMasteringBus) onOpenMasteringBus();
              else {
                eventBus.emit('rap:open');
              }
            }}
            className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[11px] text-white group-hover:text-yellow-300">
                  🎛️ MASTERING BUS
                </div>
                <div className="text-[8.5px] text-zinc-400">Parametric 3-Band EQ & Limiter DSP</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-yellow-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* 3. [ VISUALS & GFX ] */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-1">
          [ VISUALS & GFX ]
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {/* VECTOR FORGE */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenVectorForge();
            }}
            className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-400/50 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <PenTool className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[11px] text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                  <span>✒️ VECTOR FORGE</span>
                  <span className="text-[7.5px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">SVG</span>
                </div>
                <div className="text-[8.5px] text-zinc-400">Stage Pen, Shapes & Vector Masks</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* COLOR LAB */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenColorLab) onOpenColorLab();
              else {
                eventBus.emit('scopes:open');
              }
            }}
            className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 hover:border-purple-500/40 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-[11px] text-white group-hover:text-purple-300">
                  🎨 COLOR LAB
                </div>
                <div className="text-[8.5px] text-zinc-400">14-Bit ARRI LUTs & Color Grading</div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* 4. [ CONNECTED ECOSYSTEM ] */}
      <div className="pt-2 border-t border-white/10 space-y-1">
        <div className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1">
          CONNECTED ECOSYSTEM
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <a
            href="https://hub.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/10 border border-white/5 flex items-center justify-between text-zinc-300 hover:text-[#FFE066] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#F5A623]" />
              <span className="font-bold">HUB</span>
            </div>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
          </a>

          <button
            type="button"
            onClick={() => {
              if (onOpenProjectManager) onOpenProjectManager();
              else useStudioStore.getState().toggleLeftRail();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/10 border border-white/5 flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
          >
            <FolderOpen className="w-3 h-3 text-amber-400" />
            <span className="font-bold">VAULT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenR2Automation) onOpenR2Automation();
              else eventBus.emit('r2:open');
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/10 border border-white/5 flex items-center gap-1.5 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer text-left"
          >
            <Cloud className="w-3 h-3 text-rose-400" />
            <span className="font-bold">R2 / CLOUD</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenBloomSequencer) onOpenBloomSequencer();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/10 border border-white/5 flex items-center gap-1.5 text-amber-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="font-bold">BLOOM-APP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
