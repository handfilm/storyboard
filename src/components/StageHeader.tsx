/**
 * @file /src/components/StageHeader.tsx
 * @description Master Editorial Cinema Top Bar for HANDFILM (Google Flow & Editorial Brutalist Aesthetic):
 * - Left: Large two-tone wordmark (`HAND` in Crimson Red, `FILM` in White) with `RAW. RAPID. CINEMATIC.` tagline,
 *   accompanied by spacious editorial navigation links (`HOME`, `REELS`, `MANIFESTO`, `FEATURES`, `FAQ`) with floating hover cards.
 * - Center: Smart-curved rectangular view switcher buttons (`rounded-lg`, big bold typography):
 *   [ Stage ], [ Reels ], [ Scrub ], [ Multi-Cam ], [ Monitor ], and tactile [ Master SEQ / Solo Shot ] toggle.
 * - Right: Action block with informative hover guidance cards:
 *   [ 🔍 Search Master Shots... ], [ ● REC ], [ ⤓ EXPORT ▾ ], primary [ ⚡ STUDIO ] red accent, [ 㗊 APPS ▾ ], [ ⚙ ].
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
  Wand2,
  Search,
  LayoutGrid
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';
import { SmartHoverCard } from './ui/SmartHoverCard';
import { OverflowSettingsMenu } from './menus/OverflowSettingsMenu';
import { AppsDropdownMenu } from './menus/AppsDropdownMenu';
import { CompileEngine } from './modules/CompileEngine';
import { RapAudioSync } from './modules/RapAudioSync';
import { NeuralAudioEngine } from './modules/NeuralAudioEngine';
import { VectorForgeCanvas } from './modules/VectorForgeCanvas';
import { OmniAIForge } from './modules/OmniAIForge';
import { B2BCommandCenter } from './modules/B2BCommandCenter';
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
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isRapSyncModalOpen, setIsRapSyncModalOpen] = useState(false);
  const [isNeuralVoxOpen, setIsNeuralVoxOpen] = useState(false);
  const [isVectorForgeOpen, setIsVectorForgeOpen] = useState(false);
  const [isAIForgeOpen, setIsAIForgeOpen] = useState(false);
  const [isB2BHubOpen, setIsB2BHubOpen] = useState(false);
  const [isEcosystemLauncherOpen, setIsEcosystemLauncherOpen] = useState(false);
  const [compileState, setCompileState] = useState<'idle' | 'compiling' | 'success'>('idle');
  const [activeNavTab, setActiveNavTab] = useState<'HOME' | 'REELS' | 'MANIFESTO' | 'FEATURES' | 'FAQ'>('HOME');

  const appsMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or escape
  useEffect(() => {
    if (!isAppsMenuOpen && !isExportMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (appsMenuRef.current && !appsMenuRef.current.contains(e.target as Node)) {
        setIsAppsMenuOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAppsMenuOpen(false);
        setIsExportMenuOpen(false);
        setIsEcosystemLauncherOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAppsMenuOpen, isExportMenuOpen]);

  // Dedicated AI Forge, B2B Hub & Ecosystem event listeners
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

    return () => {
      unsubAI();
      unsubB2B();
      unsubEco();
    };
  }, []);

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

  const handleFeaturesClick = () => {
    setActiveNavTab('FEATURES');
    if (currentView !== 'HOME') {
      if (onSelectView) onSelectView('HOME');
      setTimeout(() => {
        document.getElementById('feature-matrix-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('feature-matrix-section')?.scrollIntoView({ behavior: 'smooth' });
    }
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

  const panels: { id: StagePanelType; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      id: 'TACTILE_STAGE', 
      label: 'Stage', 
      icon: <Film className="w-3.5 h-3.5" />,
      desc: 'Master 2.39:1 anamorphic canvas player with sub-frame scrubbing.'
    },
    { 
      id: 'SPLIT', 
      label: 'Reels', 
      icon: <Sliders className="w-3.5 h-3.5" />,
      desc: 'Dual-panel 9:16 mobile lookbook runner with timeline sequencer.'
    },
    { 
      id: 'SEQUENCER', 
      label: 'Scrub', 
      icon: <Scissors className="w-3.5 h-3.5" />,
      desc: 'Full 100-card multi-cadence timeline with beat-marker snapping.'
    },
    { 
      id: 'MULTICAM', 
      label: 'Multi-Cam', 
      icon: <Video className="w-3.5 h-3.5" />,
      desc: '4-angle synchronized broadcast multiviewer with 1-key angle switching.'
    },
    { 
      id: 'OPTICAL', 
      label: 'Monitor', 
      icon: <Eye className="w-3.5 h-3.5" />,
      desc: 'Dedicated optical mastering monitor with 14-bit ARRI color science.'
    }
  ];

  return (
    <header className={`h-16 bg-[#08090C]/95 backdrop-blur-2xl border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-30 select-none shrink-0 font-mono transition-colors duration-200 ${className}`}>
      
      {/* ========================================================================= */}
      {/* 1. Left: Signature Two-Tone Wordmark & Editorial Menu (Google Flow Spec) */}
      {/* ========================================================================= */}
      <div className="flex items-center shrink-0">
        {/* Studio Dossier Hover Card on Wide & Bold Wordmark with Flush-Aligned Tagline */}
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

        {/* Refined Navigation Links with Optimal Breathing Room */}
        <nav className="hidden xl:flex items-center gap-5 ml-8 pl-6 border-l border-white/10">
          <SmartHoverCard
            code="[ 01 // HOME / 01 ]"
            description="Cinematic preview hub, daily master reels, and quick project launch."
            align="left"
          >
            <button
              type="button"
              onClick={handleHomeClick}
              className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer ${
                currentView === 'HOME' && activeNavTab === 'HOME'
                  ? 'border-b-2 border-[#FF2B2B] pb-1 text-white font-bold'
                  : 'text-white/50 hover:text-white border-b-2 border-transparent pb-1'
              }`}
            >
              HOME
            </button>
          </SmartHoverCard>

          <SmartHoverCard
            code="[ 02 // REELS VIEW ]"
            description="Vertical 9:16 mobile lookbook runner with synchronized multi-cadence pacing."
            align="left"
          >
            <button
              type="button"
              onClick={handleReelsClick}
              className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer ${
                currentPanel === 'SPLIT' && currentView === 'STUDIO'
                  ? 'border-b-2 border-[#FF2B2B] pb-1 text-white font-bold'
                  : 'text-white/50 hover:text-white border-b-2 border-transparent pb-1'
              }`}
            >
              REELS
            </button>
          </SmartHoverCard>

          <SmartHoverCard
            code="[ 03 // MANIFESTO ]"
            description="The 12-second rule, zero-cloud architecture tenets, and offline master standards."
            align="left"
          >
            <button
              type="button"
              onClick={handleManifestoClick}
              className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer ${
                activeNavTab === 'MANIFESTO'
                  ? 'border-b-2 border-[#FF2B2B] pb-1 text-white font-bold'
                  : 'text-white/50 hover:text-white border-b-2 border-transparent pb-1'
              }`}
            >
              MANIFESTO
            </button>
          </SmartHoverCard>

          <SmartHoverCard
            code="[ 04 // FEATURE MATRIX ]"
            description="WebCodecs hardware acceleration, IndexedDB media vaults, and kinetic typography."
            align="left"
          >
            <button
              type="button"
              onClick={handleFeaturesClick}
              className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer ${
                activeNavTab === 'FEATURES'
                  ? 'border-b-2 border-[#FF2B2B] pb-1 text-white font-bold'
                  : 'text-white/50 hover:text-white border-b-2 border-transparent pb-1'
              }`}
            >
              FEATURES
            </button>
          </SmartHoverCard>

          <SmartHoverCard
            code="[ 05 // DIRECTOR FAQ ]"
            description="Answers on local 4K exports, proxy pipelines, and multi-camera sync."
            align="left"
          >
            <button
              type="button"
              onClick={handleFaqClick}
              className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase transition-all duration-200 cursor-pointer ${
                activeNavTab === 'FAQ'
                  ? 'border-b-2 border-[#FF2B2B] pb-1 text-white font-bold'
                  : 'text-white/50 hover:text-white border-b-2 border-transparent pb-1'
              }`}
            >
              FAQ
            </button>
          </SmartHoverCard>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* 2. Center: Harmonized Rectangular View Switchers & Unified Typography     */}
      {/* ========================================================================= */}
      <nav className="hidden lg:flex items-center p-1 bg-black/40 border border-white/10 rounded-xl shadow-inner gap-1.5">
        {panels.map((p) => {
          const isActive = currentPanel === p.id && currentView === 'STUDIO';
          return (
            <SmartHoverCard
              key={p.id}
              code={`[ VIEW // ${p.label.toUpperCase()} ]`}
              description={p.desc}
            >
              <button
                type="button"
                onClick={() => {
                  if (onSelectView && currentView !== 'STUDIO') onSelectView('STUDIO');
                  onSelectPanel(p.id);
                }}
                className={`rounded-md h-8 px-3 border backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all duration-200 uppercase group/btn ${
                  isActive
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_12px_rgba(245,166,35,0.2)] text-amber-400'
                    : 'border-white/10 bg-black/40 hover:border-amber-500/50 hover:bg-amber-500/5 text-white/70 hover:text-amber-400'
                }`}
              >
                <span 
                  className={`w-3.5 h-3.5 flex items-center justify-center transition-colors [&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:stroke-[1.25] ${
                    isActive 
                      ? 'text-amber-400' 
                      : 'text-white/50 group-hover/btn:text-amber-400'
                  }`}
                >
                  {p.icon}
                </span>
                <span 
                  className={`text-[11px] font-mono tracking-wider font-semibold transition-colors ${
                    isActive 
                      ? 'text-amber-400' 
                      : 'text-white/70 group-hover/btn:text-amber-400'
                  }`}
                >
                  {p.label}
                </span>
              </button>
            </SmartHoverCard>
          );
        })}

        {/* 6th Button: Tactile [ Master SEQ / Solo Shot ] Toggle */}
        <SmartHoverCard
          code="[ PLAYBACK CADENCE ]"
          description="Toggle between single shot loop preview (Solo) and full 100-shot montage playback (Master SEQ)."
          shortcut="Space"
        >
          <button
            type="button"
            onClick={() => {
              if (onSelectPlaybackMode) {
                onSelectPlaybackMode(playbackMode === 'solo' ? 'sequence' : 'solo');
              }
            }}
            className={`rounded-md h-8 px-3 border backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all duration-200 font-mono text-[11px] font-semibold tracking-wider uppercase group/btn ${
              playbackMode === 'solo'
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,166,35,0.2)]'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-400'
            }`}
          >
            <span 
              className={`w-2 h-2 rounded-full transition-colors ${
                playbackMode === 'solo' ? 'bg-[#F5A623] shadow-[0_0_6px_#f59e0b]' : 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]'
              }`} 
            />
            <span className="transition-colors">
              {playbackMode === 'solo' ? 'Solo Shot' : 'Master SEQ'}
            </span>
          </button>
        </SmartHoverCard>
      </nav>

      {/* ========================================================================= */}
      {/* 3. Right: Rectangular Action Block with Informative Hover Guidance Cards   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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

        {/* Screen Recorder Trigger [ ● REC ] */}
        <SmartHoverCard
          code="[ REC // SCREEN CAPTURE ]"
          description="Launch detached, floating Red-Pill screen & audio recorder widget."
          align="right"
        >
          <button
            type="button"
            onClick={handleLaunchRecorder}
            className="h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-2 bg-[#1a0507] hover:bg-[#28080a] border border-red-500/50 hover:border-red-400 text-red-400 hover:text-red-300 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
            <span>REC</span>
          </button>
        </SmartHoverCard>

        {/* Export Button [ ⤓ EXPORT ▾ ] */}
        <div className="relative" ref={exportMenuRef}>
          <SmartHoverCard
            code="[ EXPORT // MASTER RENDER ]"
            description="Zero-cloud WebCodecs local rendering directly to MP4 (1080p / 4K Native)."
            shortcut="⌘E"
            align="right"
          >
            <button
              type="button"
              onClick={handleTriggerExport}
              className="h-9 px-3.5 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#F5A623]/70 text-[#FFE066] transition-all duration-200 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden sm:inline">EXPORT</span>
              <ChevronDown className="w-3 h-3 text-[#FFE066]/60" />
            </button>
          </SmartHoverCard>
        </div>

        {/* Corporate B2B Hub Trigger [ 🏢 B2B HUB ] */}
        <SmartHoverCard
          code="[ 🏢 B2B CORPORATE HUB ]"
          description="Instant access to B2B corporate title suites, high-impact cards & business motion presets."
          align="right"
        >
          <button
            type="button"
            onClick={() => setIsB2BHubOpen((prev) => !prev)}
            className="h-9 px-3 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 hover:text-emerald-200 transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          >
            <span>🏢</span>
            <span className="hidden md:inline">B2B HUB</span>
          </button>
        </SmartHoverCard>

        {/* Omni-AI Forge Trigger [ 🧠 AI FORGE ] */}
        <SmartHoverCard
          code="[ 🧠 OMNI-AI FORGE // API GATEWAY ]"
          description="Enterprise API Gateway to generate image & video assets using Gemini, Grok, Veo, Flow & Kling."
          badge="SaaS AI"
          align="right"
        >
          <button
            type="button"
            onClick={() => setIsAIForgeOpen((prev) => !prev)}
            className="h-9 px-3 rounded-md bg-purple-500/10 border border-purple-500/30 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-bold tracking-widest hover:bg-purple-500/20 transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-pointer flex items-center justify-center font-mono text-xs whitespace-nowrap"
          >
            [ 🧠 AI FORGE ]
          </button>
        </SmartHoverCard>

        {/* Primary Red Accent Button [ ⚡ STUDIO ] */}
        <SmartHoverCard
          code="[ ⚡ MASTER STUDIO ]"
          description="Launch full 100-shot timeline, multi-cam switcher, and 4K proxy playback desk."
          badge="ZERO-CLOUD"
          align="right"
        >
          <button
            type="button"
            onClick={handleStudioLaunch}
            className="h-9 px-3.5 sm:px-4 rounded-lg bg-[#E50914] hover:bg-[#ff333d] text-white font-mono font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.4)] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current text-white" />
            <span className="tracking-widest">STUDIO</span>
          </button>
        </SmartHoverCard>

        {/* Mega Ecosystem Launcher [ 㗊 APPS ] */}
        <div className="relative" ref={appsMenuRef}>
          <SmartHoverCard
            code="[ 㗊 THE HIMON ECOSYSTEM ]"
            description="Launch full-width Dopamine Dashboard featuring 5 platforms with auto-scrub hover cards."
            align="right"
          >
            <button
              type="button"
              onClick={() => setIsEcosystemLauncherOpen((prev) => !prev)}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border text-white/80 hover:text-white transition-all duration-200 cursor-pointer text-xs font-mono font-bold ${
                isEcosystemLauncherOpen ? 'border-[#F5A623] text-[#FFE066] bg-white/10 shadow-[0_0_12px_rgba(245,166,35,0.3)]' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#F5A623]" />
              <span className="hidden sm:inline">APPS</span>
              <ChevronDown className={`w-3 h-3 text-white/60 transition-transform duration-200 ${isEcosystemLauncherOpen ? 'rotate-180 text-[#F5A623]' : ''}`} />
            </button>
          </SmartHoverCard>

          <AppsDropdownMenu
            isOpen={isAppsMenuOpen}
            onClose={() => setIsAppsMenuOpen(false)}
            onOpenNeuralVox={() => setIsNeuralVoxOpen(true)}
            onOpenVectorForge={() => setIsVectorForgeOpen(true)}
            onOpenMasteringBus={() => {
              if (onOpenRapSync) onOpenRapSync();
              else setIsRapSyncModalOpen(true);
            }}
            onOpenColorLab={() => {
              if (onOpenVideoScopes) onOpenVideoScopes();
              else eventBus.emit('scopes:open');
            }}
            onOpenProjectManager={onOpenProjectManager}
            onOpenR2Automation={onOpenR2Automation}
            onOpenBloomSequencer={onOpenBloomSequencer}
            onOpenVideoScopes={onOpenVideoScopes}
            onOpenAiStudio={onOpenAiStudio}
          />
        </div>

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
      <MegaEcosystemLauncher
        isOpen={isEcosystemLauncherOpen}
        onClose={() => setIsEcosystemLauncherOpen(false)}
      />
    </header>
  );
};
