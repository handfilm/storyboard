/**
 * @file /src/components/StageHeader.tsx
 * @description Master Editorial Cinema Top Bar for HANDFILM:
 * - Left: Two-tone wordmark (`HAND` in Crimson Red, `FILM` in White) with `RAW. RAPID. CINEMATIC.` tagline,
 *   accompanied by an ultra-minimalist hover-navigation system (`HOME | FEATURES | APPS`) with glassmorphic dropdowns.
 * - Center: Minimalist, sleek playback cadence toggle: [ MASTER | SOLO ] centered with clean status pips.
 * - Right: Action block with [ 🔍 Search... ⌘K ], massively prominent [ ⚡ STUDIO ] red button, and 3-dot overflow menu.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Sliders, 
  Scissors, 
  Video, 
  Zap, 
  ChevronDown, 
  Search,
  LayoutGrid
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';
import { SmartHoverCard } from './ui/SmartHoverCard';
import { OverflowSettingsMenu } from './menus/OverflowSettingsMenu';
import { CompileEngine } from './modules/CompileEngine';
import { RapAudioSync } from './modules/RapAudioSync';
import { NeuralAudioEngine } from './modules/NeuralAudioEngine';
import { VectorForgeCanvas } from './modules/VectorForgeCanvas';
import { OmniAIForge } from './modules/OmniAIForge';
import { B2BCommandCenter } from './modules/B2BCommandCenter';
import { UnifiedExportStudio } from './modules/UnifiedExportStudio';
import { MegaEcosystemLauncher } from './menus/MegaEcosystemLauncher';

export type StagePanelType = 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM';

export interface StageHeaderProps {
  currentPanel: StagePanelType;
  onSelectPanel: (panel: StagePanelType) => void;
  currentView?: 'HOME' | 'STUDIO';
  onSelectView?: (view: 'HOME' | 'STUDIO') => void;
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
  onLaunchStudio?: () => void;
  onOpenSearch?: () => void;
  onOpenManifesto?: () => void;
  onOpenProjectManager?: () => void;
  onOpenR2Automation?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenSettings?: () => void;
  onOpenShortcuts?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenInspector?: () => void;
  onOpenRapSync?: () => void;
  onOpenCacheManager?: () => void;
}

export const StageHeader: React.FC<StageHeaderProps> = ({
  currentPanel,
  onSelectPanel,
  currentView = 'STUDIO',
  onSelectView,
  currentIndex = 0,
  totalShots = 100,
  currentFrame,
  frames = [],
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  slideDurationSec = 12.0,
  fps = 24,
  className = '',
  onOpenRecorder,
  onOpenExport,
  onCompile,
  onGoHome,
  onLaunchStudio,
  onOpenSearch,
  onOpenManifesto,
  onOpenProjectManager,
  onOpenR2Automation,
  onOpenBloomSequencer,
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenSettings,
  onOpenShortcuts,
  onOpenDiagnostics,
  onOpenInspector,
  onOpenRapSync,
  onOpenCacheManager
}) => {
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isRapSyncModalOpen, setIsRapSyncModalOpen] = useState(false);
  const [isNeuralVoxOpen, setIsNeuralVoxOpen] = useState(false);
  const [isVectorForgeOpen, setIsVectorForgeOpen] = useState(false);
  const [isAIForgeOpen, setIsAIForgeOpen] = useState(false);
  const [isB2BHubOpen, setIsB2BHubOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isEcosystemLauncherOpen, setIsEcosystemLauncherOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'HOME' | 'REELS' | 'MANIFESTO' | 'FEATURES' | 'FAQ'>('HOME');

  // Dedicated event listeners
  useEffect(() => {
    const unsubAI = eventBus.on('aiforge:open', () => {
      queueMicrotask(() => setIsAIForgeOpen(true));
    });
    const unsubB2B = eventBus.on('b2b:open', () => {
      queueMicrotask(() => setIsB2BHubOpen(true));
    });
    const unsubEco = eventBus.on('ecosystem:open', () => {
      queueMicrotask(() => setIsEcosystemLauncherOpen(true));
    });
    const unsubExport = eventBus.on('export:open', () => {
      queueMicrotask(() => setIsExportStudioOpen(true));
    });

    return () => {
      unsubAI();
      unsubB2B();
      unsubEco();
      unsubExport();
    };
  }, []);

  const handleHomeClick = () => {
    setActiveNavTab('HOME');
    if (onSelectView) onSelectView('HOME');
    else if (onGoHome) onGoHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReelsClick = () => {
    setActiveNavTab('REELS');
    if (onSelectView && currentView !== 'STUDIO') onSelectView('STUDIO');
    onSelectPanel('SPLIT');
  };

  const handleManifestoClick = () => {
    setActiveNavTab('MANIFESTO');
    if (onOpenManifesto) onOpenManifesto();
    else eventBus.emit('walkthrough:open');
  };

  const handleFaqClick = () => {
    setActiveNavTab('FAQ');
    if (currentView !== 'HOME') {
      if (onSelectView) onSelectView('HOME');
      setTimeout(() => {
        document.getElementById('director-faqs-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('director-faqs-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStudioLaunch = () => {
    if (onLaunchStudio) onLaunchStudio();
    else if (onSelectView) onSelectView('STUDIO');
    else if (onGoHome) onGoHome();
    onSelectPanel('TACTILE_STAGE');
  };

  return (
    <header className={`h-16 bg-[#08090C]/95 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30 select-none shrink-0 font-mono transition-colors duration-200 ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. Left: Signature Two-Tone Wordmark & Hover Menus (HOME | FEATURES | APPS) */}
      {/* ========================================================================= */}
      <div className="flex items-center shrink-0">
        {/* Wordmark */}
        <SmartHoverCard
          code="[ HANDFILM ATELIER // BUILD 2.4 ]"
          description="Browser-native, zero-cloud NLE running on local WebCodecs, WebAudio DSP & 4K hardware proxy pipeline."
          footerTelemetry="ENGINE: RUST / WEBCODECS • BUFFER: LOCAL INDEXEDDB"
          align="left"
          side="bottom"
          cardClassName="w-72"
        >
          <button 
            type="button"
            onClick={handleHomeClick}
            className="inline-flex flex-col items-stretch w-fit group cursor-pointer focus:outline-none bg-transparent border-none p-0 text-left transition-transform active:scale-95 shrink-0"
            title="HANDFILM // Return to Home Overview"
          >
            <div className="flex items-baseline leading-none text-[22px] font-black tracking-wider">
              <span className="text-[#FF2B2B] drop-shadow-[0_0_14px_rgba(255,43,43,0.55)]">
                HAND
              </span>
              <span className="text-white">
                FILM
              </span>
            </div>
            {/* Flush-aligned tagline stretching edge-to-edge from 'H' to 'M' */}
            <div className="w-full flex justify-between items-center text-[8.5px] font-mono text-white/40 uppercase select-none mt-0.5 group-hover:text-white/70 transition-colors">
              <span>RAW.</span>
              <span>RAPID.</span>
              <span>CINEMATIC.</span>
            </div>
          </button>
        </SmartHoverCard>

        {/* Minimalist Hover-Triggered Navigation Bar: HOME | FEATURES | APPS */}
        <nav className="flex items-center gap-1 sm:gap-2 ml-6 pl-5 border-l border-white/10">
          {/* 1. HOME Hover Menu */}
          <div className="relative group py-2">
            <button
              type="button"
              onClick={handleHomeClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer ${
                currentView === 'HOME' && activeNavTab === 'HOME'
                  ? 'text-white bg-white/10 border border-white/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>HOME</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:rotate-180 group-hover:text-white transition-transform duration-200" />
            </button>

            {/* Hover Glassmorphic Dropdown */}
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[200px]">
              <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(255,43,43,0.15)] p-1.5 flex flex-col gap-1 font-mono">
                <button
                  type="button"
                  onClick={handleManifestoClick}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>Manifesto</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-red-400 font-mono">12s RULE</span>
                </button>
                <button
                  type="button"
                  onClick={handleFaqClick}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>FAQ</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-amber-400 font-mono">Q&A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>Privacy Policy</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-emerald-400 font-mono">ZERO-CLOUD</span>
                </button>
              </div>
            </div>
          </div>

          <span className="text-white/20 select-none">|</span>

          {/* 2. FEATURES Hover Menu */}
          <div className="relative group py-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-200 cursor-pointer"
            >
              <span>FEATURES</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:rotate-180 group-hover:text-white transition-transform duration-200" />
            </button>

            {/* Hover Glassmorphic Dropdown */}
            <div className="absolute top-full left-0 pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
              <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(245,166,35,0.15)] p-1.5 flex flex-col gap-1 font-mono">
                <button
                  type="button"
                  onClick={handleReelsClick}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🎬</span>
                    <span>Reels</span>
                  </span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-amber-400 font-mono">9:16</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    eventBus.emit('drawer:open', { type: 'text' });
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🖋️</span>
                    <span>Templates</span>
                  </span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-cyan-400 font-mono">TYPOGRAPHY</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsB2BHubOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🏢</span>
                    <span>B2B Hub</span>
                  </span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-emerald-400 font-mono">ENTERPRISE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAIForgeOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🧠</span>
                    <span>AI Forge</span>
                  </span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-purple-400 font-mono">NEURAL</span>
                </button>
              </div>
            </div>
          </div>

          <span className="text-white/20 select-none">|</span>

          {/* 3. APPS Hover Trigger (Launches MegaEcosystemLauncher) */}
          <div
            className="relative group py-2"
            onMouseEnter={() => setIsEcosystemLauncherOpen(true)}
          >
            <button
              type="button"
              onClick={() => setIsEcosystemLauncherOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent transition-all duration-200 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>APPS</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 2. Middle: Cleaned up Minimalist Playback Cadence Toggle [ MASTER | SOLO ] */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-center p-1 bg-black/50 border border-white/10 rounded-lg backdrop-blur-md shadow-inner gap-1">
        <button
          type="button"
          onClick={() => onSelectPlaybackMode && onSelectPlaybackMode('sequence')}
          className={`h-7 px-4 rounded text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 uppercase ${
            playbackMode === 'sequence'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_12px_rgba(245,166,35,0.25)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
          title="Master Sequence Playback"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${playbackMode === 'sequence' ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-zinc-600'}`} />
          <span>MASTER</span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          onClick={() => onSelectPlaybackMode && onSelectPlaybackMode('solo')}
          className={`h-7 px-4 rounded text-xs font-mono font-bold tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 uppercase ${
            playbackMode === 'solo'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
          title="Solo Shot Loop Playback"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${playbackMode === 'solo' ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-zinc-600'}`} />
          <span>SOLO</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. Right: Search, Massively Prominent STUDIO Button, and 3-Dot Menu       */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Refined Search Box: [ 🔍 Search Master Shots... ⌘K ] */}
        <SmartHoverCard
          code="[ ⌘K // SHOT FINDER ]"
          description="Quick command palette and shot finder across all 100 timeline cards."
          shortcut="⌘K"
          align="right"
        >
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
              else eventBus.emit('command:open');
            }}
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg bg-black/40 border border-white/10 hover:border-white/30 text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden xl:inline text-[11px]">Search Shots...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 text-[10px]">⌘K</kbd>
          </button>
        </SmartHoverCard>

        {/* Massively Prominent STUDIO Button */}
        <button
          type="button"
          onClick={handleStudioLaunch}
          className="bg-red-600 text-white font-black tracking-widest px-6 py-2 rounded-sm border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:scale-105 transition-all uppercase cursor-pointer flex items-center gap-2 font-mono text-xs active:scale-95"
          title="Launch Master Cinema Studio"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-white" />
          <span>STUDIO</span>
        </button>

        {/* 3-Dot Overflow Settings Menu [ ⋯ ] */}
        <OverflowSettingsMenu
          onOpenCompile={() => {
            if (onCompile) onCompile();
            else setIsCompileModalOpen(true);
          }}
          onOpenRapSync={() => {
            if (onOpenRapSync) onOpenRapSync();
            else setIsRapSyncModalOpen(true);
          }}
          onOpenSettings={() => {
            if (onOpenSettings) onOpenSettings();
            else eventBus.emit('settings:open');
          }}
          onOpenInspector={() => {
            if (onOpenInspector) onOpenInspector();
            else useStudioStore.getState().toggleInspector();
          }}
          onOpenCacheManager={onOpenCacheManager}
        />
      </div>

      {/* Restored Rapid-Iteration Module Modals */}
      <CompileEngine
        isOpen={isCompileModalOpen}
        onClose={() => setIsCompileModalOpen(false)}
        onTriggerCompileWizard={onCompile}
        totalShots={totalShots}
      />
      <RapAudioSync
        isOpen={isRapSyncModalOpen}
        onClose={() => setIsRapSyncModalOpen(false)}
      />
      <NeuralAudioEngine
        isOpen={isNeuralVoxOpen}
        onClose={() => setIsNeuralVoxOpen(false)}
        activeShotIndex={currentIndex}
      />
      <VectorForgeCanvas
        isOpen={isVectorForgeOpen}
        onClose={() => setIsVectorForgeOpen(false)}
      />
      <OmniAIForge
        isOpen={isAIForgeOpen}
        onClose={() => setIsAIForgeOpen(false)}
        activeShotIndex={currentIndex}
      />
      <B2BCommandCenter
        isOpen={isB2BHubOpen}
        onClose={() => setIsB2BHubOpen(false)}
        activeShotIndex={currentIndex}
      />
      <UnifiedExportStudio
        isOpen={isExportStudioOpen}
        onClose={() => setIsExportStudioOpen(false)}
        frames={frames}
        currentIndex={currentIndex}
      />
      <MegaEcosystemLauncher
        isOpen={isEcosystemLauncherOpen}
        onClose={() => setIsEcosystemLauncherOpen(false)}
      />

      {/* Zero-Cloud Privacy Policy Modal */}
      {isPrivacyModalOpen && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsPrivacyModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#050505]/95 backdrop-blur-3xl border border-white/20 rounded-2xl p-6 text-zinc-300 font-mono shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wider uppercase">
                <span className="text-emerald-400">🛡️</span>
                <span>[ PRIVACY POLICY // ZERO-CLOUD GUARANTEE ]</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/30 cursor-pointer"
              >
                [ X ]
              </button>
            </div>
            <div className="text-xs space-y-3 leading-relaxed text-zinc-300">
              <p>
                <strong className="text-white">100% Local Browser Execution:</strong> HANDFILM processes all video frames, WebCodecs hardware decodes, WebAudio DSP streams, and project timelines directly inside your browser's local sandbox.
              </p>
              <p>
                <strong className="text-emerald-400">Zero Server Surveillance:</strong> No video assets or storyboard frames are uploaded to external tracking servers. Your media buffers remain stored exclusively in your local browser IndexedDB storage vault.
              </p>
              <p>
                <strong className="text-white">Direct-to-Disk Exports:</strong> 4K MP4 renders, FCP7 XML files, FCPXML sequences, and PDF contact sheets are synthesized on your GPU/CPU and downloaded directly to your local file system.
              </p>
            </div>
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white uppercase tracking-wider transition-all cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
