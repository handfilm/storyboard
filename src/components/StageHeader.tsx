/**
 * @file /src/components/StageHeader.tsx
 * @description Master Editorial Cinema Top Bar for HANDFILM:
 * - Left: Pure typography brand logo (`HANDFILM`) with signature tagline (`RAW. RAPID. CINEMATIC.`),
 *   followed by primary navigation links (`Home`, `Reels`, `Manifesto`).
 * - Center: Enlarged, breathable view switch capsules:
 *   [ Stage ], [ Reels ], [ Scrub ], [ Multi-Cam ], [ Monitor ], and tactile [ Solo / Master SEQ ] toggle.
 * - Right: Action micro-pills:
 *   [ ⚡ Compile ], [ ● REC ], [ ⤓ Export ], and interactive [ APPS ⌵ ] dropdown.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Sliders, 
  Scissors, 
  Video, 
  Zap, 
  Download, 
  ChevronDown, 
  Settings, 
  SlidersHorizontal, 
  Sparkles, 
  Layers, 
  Keyboard, 
  Check, 
  Activity,
  Globe,
  FolderOpen,
  Cloud,
  ExternalLink,
  Eye,
  Wand2
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
  onGoHome?: () => void;
  onOpenManifesto?: () => void;
  onOpenProjectManager?: () => void;
  onOpenR2Automation?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  onOpenDiagnostics?: () => void;
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
  onCompile,
  onGoHome,
  onOpenManifesto,
  onOpenProjectManager,
  onOpenR2Automation,
  onOpenBloomSequencer,
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenSettings,
  onOpenShortcuts,
  onOpenDiagnostics
}) => {
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [compileState, setCompileState] = useState<'idle' | 'compiling' | 'success'>('idle');
  const appsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    if (!isAppsMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (appsMenuRef.current && !appsMenuRef.current.contains(e.target as Node)) {
        setIsAppsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAppsMenuOpen(false);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAppsMenuOpen]);

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
    { id: 'TACTILE_STAGE', label: 'Stage', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'SPLIT', label: 'Reels', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'SEQUENCER', label: 'Scrub', icon: <Scissors className="w-3.5 h-3.5" /> },
    { id: 'MULTICAM', label: 'Multi-Cam', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'OPTICAL', label: 'Monitor', icon: <Eye className="w-3.5 h-3.5" /> }
  ];

  return (
    <header className={`h-14 bg-[#07070a]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30 select-none shrink-0 font-mono transition-colors duration-200 ${className}`}>
      
      {/* 1. Left: Pure Typography Brand Logo & Primary Editorial Navigation */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        {/* Pure Typography Brand Logo with Signature Tagline */}
        <button 
          type="button"
          onClick={() => {
            if (onGoHome) onGoHome();
          }}
          className="flex flex-col group cursor-pointer focus:outline-none bg-transparent border-none p-0 text-left transition-transform active:scale-95"
          title="HANDFILM Atelier — Return to Stage Overview"
        >
          <span className="text-[13px] sm:text-sm font-black tracking-[0.28em] text-white group-hover:text-[#FFE066] transition-colors uppercase font-mono leading-none drop-shadow-[0_2px_10px_rgba(245,166,35,0.25)]">
            HANDFILM
          </span>
          <span className="text-white/40 text-[8.5px] sm:text-[9px] font-mono tracking-[0.25em] uppercase leading-tight mt-1 group-hover:text-white/60 transition-colors select-none">
            RAW. RAPID. CINEMATIC.
          </span>
        </button>

        {/* Primary Editorial Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 pl-3 sm:pl-4 border-l border-white/10">
          <button
            type="button"
            onClick={() => {
              if (onGoHome) onGoHome();
            }}
            className="text-white/50 hover:text-white transition-colors duration-150 text-xs font-medium px-2.5 py-1 rounded cursor-pointer hover:bg-white/5"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onSelectPanel('SPLIT')}
            className="text-white/50 hover:text-white transition-colors duration-150 text-xs font-medium px-2.5 py-1 rounded cursor-pointer hover:bg-white/5"
          >
            Reels
          </button>
          <button
            type="button"
            onClick={() => {
              if (onOpenManifesto) onOpenManifesto();
              else eventBus.emit('walkthrough:open');
            }}
            className="text-white/50 hover:text-white transition-colors duration-150 text-xs font-medium px-2.5 py-1 rounded cursor-pointer hover:bg-white/5"
          >
            Manifesto
          </button>
        </nav>
      </div>

      {/* 2. Center: Enlarged & Breathable Viewport Switcher Capsules */}
      <nav className="hidden md:flex items-center p-1 bg-black/50 border border-white/10 rounded-full shadow-inner gap-2 sm:gap-2.5">
        {panels.map((p) => {
          const isActive = currentPanel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPanel(p.id)}
              className={`h-8 px-3.5 sm:px-4 rounded-full text-[12px] font-mono font-medium tracking-wide flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'border border-[#F5A623] text-white bg-white/10 shadow-[0_0_12px_rgba(245,166,35,0.3)]'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <span className={isActive ? 'text-[#F5A623]' : 'text-white/40'}>
                {p.icon}
              </span>
              <span>{p.label}</span>
            </button>
          );
        })}

        {/* 6th Capsule: Tactile [ Solo / Master SEQ ] Switch */}
        <button
          type="button"
          onClick={() => {
            if (onSelectPlaybackMode) {
              onSelectPlaybackMode(playbackMode === 'solo' ? 'sequence' : 'solo');
            }
          }}
          className={`h-8 px-3.5 rounded-full text-[11px] sm:text-[12px] font-mono font-medium tracking-wide flex items-center gap-1.5 cursor-pointer transition-all duration-200 border ${
            playbackMode === 'solo'
              ? 'bg-amber-950/40 border-[#F5A623] text-[#FFE066] shadow-[0_0_10px_rgba(245,166,35,0.25)]'
              : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
          }`}
          title="Click to toggle between Shot Solo playback and Master Sequence playback"
        >
          <span 
            className={`w-1.5 h-1.5 rounded-full ${
              playbackMode === 'solo' ? 'bg-[#F5A623]' : 'bg-emerald-400 animate-pulse'
            }`} 
          />
          <span className="hidden xl:inline">PLAYBACK:</span>
          <span className="font-bold">{playbackMode === 'solo' ? 'Solo Shot' : 'Master SEQ'}</span>
        </button>
      </nav>

      {/* 3. Right: Micro-pills [ ⚡ Compile ], [ ● REC ], [ ⤓ Export ], [ APPS ⌵ ] */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Compact Compile Pill */}
        <button
          type="button"
          onClick={handleTriggerCompile}
          disabled={compileState === 'compiling'}
          className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all duration-200 cursor-pointer ${
            compileState === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : compileState === 'compiling'
              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 animate-pulse'
              : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#F5A623]/60 text-white/80 hover:text-[#FFE066]'
          }`}
          title="Compile State & Check Sequence Invariants"
        >
          {compileState === 'success' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Zap className={`w-3.5 h-3.5 ${compileState === 'compiling' ? 'animate-spin text-amber-400' : 'text-[#F5A623]'}`} />
          )}
          <span className="hidden sm:inline">
            {compileState === 'success' ? 'COMPILED' : compileState === 'compiling' ? 'SYNCING...' : 'Compile'}
          </span>
        </button>

        {/* Tactical Red Dot [ ● REC ] Launcher */}
        <button
          type="button"
          onClick={handleLaunchRecorder}
          className="h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-[#1a0507] hover:bg-[#28080a] border border-red-500/50 hover:border-red-400 text-red-400 hover:text-red-300 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          title="Launch Floating Red-Pill Screen Recorder"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
          <span>REC</span>
        </button>

        {/* Minimalist [ ⤓ Export ] Button */}
        <button
          type="button"
          onClick={handleTriggerExport}
          className="h-8 px-3.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-[#F5A623]/20 hover:bg-[#F5A623]/30 border border-[#F5A623]/70 hover:border-[#F5A623] text-[#FFE066] transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(245,166,35,0.25)]"
          title="Export Cinema Sequence (MP4 / OTIO / FCPXML)"
        >
          <Download className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Interactive [ APPS ⌵ ] Dropdown Menu */}
        <div className="relative" ref={appsMenuRef}>
          <button
            type="button"
            onClick={() => setIsAppsMenuOpen((prev) => !prev)}
            className={`h-8 px-3 rounded-full flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border text-white/80 hover:text-white transition-all duration-200 cursor-pointer text-[11px] font-bold ${
              isAppsMenuOpen ? 'border-[#F5A623] text-[#FFE066] bg-white/10' : 'border-white/10 hover:border-[#F5A623]/60'
            }`}
            title="Connected Workspace Tools, Dashboards, and Studio Apps"
          >
            <Globe className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="hidden sm:inline">APPS</span>
            <ChevronDown className={`w-3 h-3 text-white/60 transition-transform duration-200 ${isAppsMenuOpen ? 'rotate-180 text-[#F5A623]' : ''}`} />
          </button>

          {isAppsMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a12]/98 border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl p-2 text-xs font-mono text-white/85 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              <div className="px-2.5 py-1 text-[8.5px] font-bold text-[#fbbf24] border-b border-white/10 uppercase tracking-wider flex items-center justify-between">
                <span>CONNECTED SUITE APPS</span>
                <span className="text-emerald-400">ONLINE</span>
              </div>

              {/* 1. HUB */}
              <a
                href="https://hub.handsandhead.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsAppsMenuOpen(false)}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-white/90 hover:text-[#FFE066]"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span className="font-bold">HUB</span>
                </div>
                <span className="text-[8.5px] text-zinc-500 flex items-center gap-0.5">
                  Command Center <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </a>

              {/* 2. VAULT */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenProjectManager) onOpenProjectManager();
                  else useStudioStore.getState().toggleLeftRail();
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-white/90 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">VAULT</span>
                </div>
                <span className="text-[8.5px] text-zinc-500">Media Asset Store</span>
              </button>

              {/* 3. R2 / STREAM */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenR2Automation) onOpenR2Automation();
                  else eventBus.emit('r2:open');
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-rose-300 hover:text-rose-200"
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-bold">R2 / STREAM</span>
                </div>
                <span className="text-[8.5px] text-rose-500/80">Cloud Storage</span>
              </button>

              {/* 4. BLOOM-APP */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenBloomSequencer) onOpenBloomSequencer();
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-amber-200 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">BLOOM-APP</span>
                </div>
                <span className="text-[8.5px] text-zinc-500">Sequencer Node</span>
              </button>

              {/* 5. DEEPER / SCOPES */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenVideoScopes) onOpenVideoScopes();
                  else eventBus.emit('scopes:open');
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-emerald-300 hover:text-emerald-200"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold">DEEPER</span>
                </div>
                <span className="text-[8.5px] text-zinc-500">Video Scopes</span>
              </button>

              {/* 6. LAB / AI CO-DIRECTOR */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenAiStudio) onOpenAiStudio();
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-purple-300 hover:text-purple-200"
              >
                <div className="flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-bold">LAB / AI DIRECTOR</span>
                </div>
                <span className="text-[8.5px] text-purple-400/80">Smart Beats</span>
              </button>

              {/* 7. DIRECTOR INSPECTOR */}
              <button
                type="button"
                onClick={() => {
                  useStudioStore.getState().toggleInspector();
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-white/85"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>Director Inspector</span>
                </div>
                <span className="text-[8.5px] text-zinc-500">Shift+E</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              {/* 8. STUDIO SETTINGS */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  else eventBus.emit('settings:open');
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/70 hover:text-white"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Studio Settings</span>
              </button>

              {/* 9. KEYBOARD SHORTCUTS */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenShortcuts) onOpenShortcuts();
                  else eventBus.emit('shortcuts:open');
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer text-white/70 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <kbd className="px-1 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8px]">?</kbd>
              </button>

              {/* 10. DIAGNOSTICS & SELF-TEST */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenDiagnostics) onOpenDiagnostics();
                  else eventBus.emit('diagnostics:open');
                  setIsAppsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 text-left transition-colors cursor-pointer text-white/70 hover:text-white"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Diagnostics & Self-Test</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
