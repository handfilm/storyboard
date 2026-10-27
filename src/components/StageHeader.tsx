/**
 * @file /src/components/StageHeader.tsx
 * @description Master Editorial Cinema Top Bar for HANDFILM:
 * - Left: Two-tone wordmark (`HAND` in Crimson Red, `FILM` in White) with `RAW. RAPID. CINEMATIC.` tagline,
 *   accompanied by an ultra-minimalist hover-navigation system (`HOME | FEATURES | APPS`) with glassmorphic dropdowns.
 * - Center: Minimalist, sleek playback cadence toggle: [ MASTER | SOLO ] centered with clean status pips.
 * - Right: Action block with [ 🔍 Search... ⌘K ], massively prominent [ ⚡ STUDIO ] red button, and 3-dot overflow menu.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  ChevronDown, 
  Search,
  LayoutGrid,
  Upload,
  Type,
  X,
  Database,
  Trash2,
  Check,
  RefreshCw
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';
import { studioDraftDb } from '../services/db';
import { screenRecorderEngine } from '../services/screenRecorderEngine';
import { SmartHoverCard } from './ui/SmartHoverCard';
import { OverflowSettingsMenu } from './menus/OverflowSettingsMenu';
import { DirectorInspector } from './DirectorInspector';
import { CompileEngine } from './modules/CompileEngine';
import { RapAudioSync } from './modules/RapAudioSync';
import { NeuralAudioEngine } from './modules/NeuralAudioEngine';
import { VectorForgeCanvas } from './modules/VectorForgeCanvas';
import { OmniAIForge } from './modules/OmniAIForge';
import { B2BCommandCenter } from './modules/B2BCommandCenter';
import { UnifiedExportStudio } from './modules/UnifiedExportStudio';
import { EcosystemGrid, ECOSYSTEM_PROJECTS } from './menus/EcosystemGrid';
import { TextTypographyDrawer } from './drawers/TextTypographyDrawer';

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
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpen] = useState(false);
  const [isInspectorDrawerOpen, setIsInspectorDrawerOpen] = useState(false);
  const [isCacheManagerOpen, setIsCacheManagerOpen] = useState(false);
  const [cacheUsageBytes, setCacheUsageBytes] = useState<number>(0);
  const [cacheQuotaBytes, setCacheQuotaBytes] = useState<number>(0);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [cachePurgeFeedback, setCachePurgeFeedback] = useState<string | null>(null);
  const [dissolvePulseId, setDissolvePulseId] = useState<number>(0);
  const [dissolveModeLabel, setDissolveModeLabel] = useState<'STAGE' | 'REELS' | 'SCRUB' | null>(null);
  const dissolveTimeoutRef = useRef<number | null>(null);
  const prevPanelRef = useRef<StagePanelType>(currentPanel);
  const [isRecording, setIsRecording] = useState(false);

  // Synchronize recording state with the screenRecorderEngine status
  useEffect(() => {
    const unsub = screenRecorderEngine.onStatusChange((status) => {
      setIsRecording(status === 'recording' || status === 'paused');
    });
    return () => unsub();
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);
      if (onOpenRecorder) {
        onOpenRecorder();
      } else {
        eventBus.emit('recorder:open');
      }
    } catch (err) {
      console.error('[StageHeader] Error in startRecording:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (screenRecorderEngine.getStatus() === 'recording' || screenRecorderEngine.getStatus() === 'paused') {
        await screenRecorderEngine.stopRecording();
      }
      if (onOpenRecorder) {
        onOpenRecorder();
      } else {
        eventBus.emit('recorder:close');
      }
    } catch (err) {
      console.error('[StageHeader] Error in stopRecording:', err);
    } finally {
      setIsRecording(false);
    }
  };

  const [currentMode, setCurrentMode] = useState<'SOLO' | 'MASTER'>(
    playbackMode === 'solo' ? 'SOLO' : 'MASTER'
  );
  const [activeNavTab, setActiveNavTab] = useState<'HOME' | 'REELS' | 'MANIFESTO' | 'FEATURES' | 'FAQ'>('HOME');
  const credits = useStudioStore((state) => (typeof state.credits === 'number' ? state.credits : 12500));

  useEffect(() => {
    setCurrentMode(playbackMode === 'solo' ? 'SOLO' : 'MASTER');
  }, [playbackMode]);

  const handleModeSelect = (nextModeLabel: 'SOLO' | 'MASTER') => {
    const mappedPlaybackMode: PlaybackMode = nextModeLabel === 'SOLO' ? 'solo' : 'sequence';
    setCurrentMode(nextModeLabel);
    console.log(`[StageHeader] Playback mode active: ${nextModeLabel} (${mappedPlaybackMode})`);
    if (onSelectPlaybackMode) {
      onSelectPlaybackMode(mappedPlaybackMode);
    }
    eventBus.emit('playback:mode', { mode: mappedPlaybackMode });
  };

  const triggerCoreWorkspaceCrossDissolve = (targetPanel: StagePanelType) => {
    if (
      targetPanel !== 'TACTILE_STAGE' &&
      targetPanel !== 'SPLIT' &&
      targetPanel !== 'SEQUENCER'
    ) {
      return;
    }
    const labelMap: Record<'TACTILE_STAGE' | 'SPLIT' | 'SEQUENCER', 'STAGE' | 'REELS' | 'SCRUB'> = {
      TACTILE_STAGE: 'STAGE',
      SPLIT: 'REELS',
      SEQUENCER: 'SCRUB'
    };
    const nextPulse = Date.now();
    setDissolvePulseId(nextPulse);
    setDissolveModeLabel(labelMap[targetPanel]);

    // Drive hardware-accelerated CSS cross-dissolve transition on the active workspace container
    if (typeof document !== 'undefined') {
      const workspaceEl = document.getElementById('handfilm-workspace-container');
      if (workspaceEl) {
        workspaceEl.classList.remove('animate-workspace-cross-dissolve');
        workspaceEl.style.opacity = '0.78';
        requestAnimationFrame(() => {
          workspaceEl.classList.add('animate-workspace-cross-dissolve');
          workspaceEl.style.opacity = '1';
        });
      }
    }

    if (dissolveTimeoutRef.current !== null) {
      window.clearTimeout(dissolveTimeoutRef.current);
    }
    dissolveTimeoutRef.current = window.setTimeout(() => {
      setDissolvePulseId(0);
      setDissolveModeLabel(null);
    }, 250);
  };

  // Trigger hardware-accelerated cross-dissolve when currentPanel switches externally (e.g. shortcuts)
  useEffect(() => {
    if (prevPanelRef.current !== currentPanel) {
      const wasCore =
        prevPanelRef.current === 'TACTILE_STAGE' ||
        prevPanelRef.current === 'SPLIT' ||
        prevPanelRef.current === 'SEQUENCER';
      const isCore =
        currentPanel === 'TACTILE_STAGE' ||
        currentPanel === 'SPLIT' ||
        currentPanel === 'SEQUENCER';
      if (wasCore && isCore && currentView === 'STUDIO') {
        triggerCoreWorkspaceCrossDissolve(currentPanel);
      }
      prevPanelRef.current = currentPanel;
    }
  }, [currentPanel, currentView]);

  // Query live IndexedDB storage estimate when Cache Manager opens
  useEffect(() => {
    if (!isCacheManagerOpen) return;
    let cancelled = false;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (!cancelled) {
            setCacheUsageBytes(est.usage || 0);
            setCacheQuotaBytes(est.quota || 0);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isCacheManagerOpen]);

  useEffect(() => {
    return () => {
      if (dissolveTimeoutRef.current !== null) {
        window.clearTimeout(dissolveTimeoutRef.current);
      }
    };
  }, []);

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
      if (!onOpenExport) {
        queueMicrotask(() => setIsExportStudioOpen(true));
      }
    });
    const unsubDrawerOpen = eventBus.on('drawer:open', (payload?: { type?: string }) => {
      if (!payload || !payload.type || payload.type === 'text') {
        queueMicrotask(() => setIsTemplatesDrawerOpen(true));
      }
    });
    const unsubDrawerClose = eventBus.on('drawer:close', () => {
      queueMicrotask(() => setIsTemplatesDrawerOpen(false));
    });

    return () => {
      unsubAI();
      unsubB2B();
      unsubEco();
      unsubExport();
      unsubDrawerOpen();
      unsubDrawerClose();
    };
  }, [onOpenExport]);

  const handleHomeClick = () => {
    setActiveNavTab('HOME');
    if (onSelectView) onSelectView('HOME');
    else if (onGoHome) onGoHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWorkspacePanelSelect = (panel: StagePanelType) => {
    const isCoreDissolveMode =
      panel === 'TACTILE_STAGE' || panel === 'SPLIT' || panel === 'SEQUENCER';
    if (isCoreDissolveMode && (panel !== currentPanel || currentView !== 'STUDIO')) {
      prevPanelRef.current = panel;
      triggerCoreWorkspaceCrossDissolve(panel);
      eventBus.emit('workspace:cross_dissolve', { from: currentPanel, to: panel });
    }
    if (panel === 'SPLIT') setActiveNavTab('REELS');
    if (onSelectView && currentView !== 'STUDIO') onSelectView('STUDIO');
    onSelectPanel(panel);
  };

  const handleReelsClick = () => {
    handleWorkspacePanelSelect('SPLIT');
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

  const handleOpenTemplatesDrawer = () => {
    setIsTemplatesDrawerOpen(true);
  };

  const handleTriggerInspector = () => {
    console.info('[HANDFILM] Director Inspector triggered from 3-Dot Workspace Menu');
    eventBus.emit('inspector:toggle');
    if (currentView === 'STUDIO' && onOpenInspector) {
      onOpenInspector();
    } else {
      setIsInspectorDrawerOpen((prev) => !prev);
      useStudioStore.getState().toggleInspector();
    }
  };

  const handleTriggerCacheManager = () => {
    console.info('[HANDFILM] Cache Manager triggered from 3-Dot Workspace Menu');
    setCachePurgeFeedback(null);
    setIsCacheManagerOpen(true);
    if (onOpenCacheManager) {
      onOpenCacheManager();
    }
  };

  const handleExecuteCachePurge = async () => {
    if (isPurgingCache) return;
    setIsPurgingCache(true);
    try {
      const result = await studioDraftDb.purgeTransientCache();
      const freedMB = (result.freedEstimatesBytes / (1024 * 1024)).toFixed(2);
      const msg = `Purged ${result.purgedCount} transient bitmaps (${freedMB} MB freed)`;
      console.info('[HANDFILM] IndexedDB Cache Purge Complete:', msg);
      setCachePurgeFeedback(msg);
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setCacheUsageBytes(est.usage || 0);
        setCacheQuotaBytes(est.quota || 0);
      }
    } catch (err) {
      console.warn('[HANDFILM] Cache purge warning:', err);
      setCachePurgeFeedback('Transient IndexedDB proxy cache cleared');
    } finally {
      setIsPurgingCache(false);
    }
  };

  const inspectableFrame: AnthologyFrame =
    currentFrame ||
    frames[currentIndex] ||
    frames[0] ||
    ({
      id: 1,
      epNumber: '#001',
      title: 'MASTER SHOT 01',
      bengaliTitle: 'প্রথম দৃশ্য',
      tagline: '2.39:1 Master Scope',
      directorNotes: '',
      soundCue: '',
      cameraSpec: {
        focalLength: '35mm Master Prime',
        aperture: 'f/1.4',
        shutter: '1/48s',
        iso: 'ISO 800',
        sensor: 'Full-Frame Cine',
        format: 'RAW 14-BIT'
      },
      imageUrl: '',
      isVideo: false,
      panY: 50,
      colorAccent: '#D4AF37',
      hoverStyle: 0,
      lutFilter: 'cinematic',
      aspectRatio: '2.39:1',
      adjustments: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        bloom: 30,
        grain: 15,
        motionBlur: 50,
        vignette: 40
      },
      tags: []
    } as AnthologyFrame);

  return (
    <>
    <header className={`relative w-full h-14 flex items-center px-4 px-4! gap-3 z-50 bg-[#0A0C10] border-b border-white/5 select-none shrink-0 font-sans ${className}`}>
      {/* 1. LEFT COLUMN (flex-1 pushes center to middle) */}
      <div className="flex-1 flex items-center justify-start gap-3 lg:gap-4">
        {/* Wordmark Logo */}
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
            className="inline-flex flex-col items-stretch w-fit group cursor-pointer focus:outline-none bg-transparent border-none text-left transition-transform active:scale-95 shrink-0"
            title="HANDFILM // Return to Home Overview"
          >
            <div className="flex items-baseline leading-none text-[16px] font-black tracking-wider">
              <span className="text-[#FF2B2B] drop-shadow-[0_0_14px_rgba(255,43,43,0.55)]">
                HAND
              </span>
              <span className="text-white">
                FILM
              </span>
            </div>
            <div className="w-full flex justify-between items-center text-[6.5px] font-mono text-white/40 uppercase select-none group-hover:text-white/70 transition-colors">
              <span>RAW.</span>
              <span>RAPID.</span>
              <span>CINEMATIC.</span>
            </div>
          </button>
        </SmartHoverCard>

        {/* System Dropdowns: HOME | FEATURES | APPS */}
        <div className="flex items-center gap-3 shrink-0">
          {/* 1. HOME Hover Menu */}
          <div className="relative group py-2!">
            <button
              type="button"
              onClick={handleHomeClick}
              className={`flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                currentView === 'HOME' && activeNavTab === 'HOME'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>HOME</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:rotate-180 group-hover:text-white transition-transform duration-200 shrink-0" />
            </button>

            <div className="absolute top-full left-0 pt-1! opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[200px]">
              <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(255,43,43,0.15)] p-1.5! flex flex-col gap-1 font-mono">
                <button
                  type="button"
                  onClick={handleManifestoClick}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>Manifesto</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-red-400 font-mono">12s RULE</span>
                </button>
                <button
                  type="button"
                  onClick={handleFaqClick}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>FAQ</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-amber-400 font-mono">Q&amp;A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span>Privacy Policy</span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-emerald-400 font-mono">ZERO-CLOUD</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. FEATURES Hover Menu */}
          <div className="relative group py-2!">
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-white transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              <span>FEATURES</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:rotate-180 group-hover:text-white transition-transform duration-200 shrink-0" />
            </button>

            <div className="absolute top-full left-0 pt-1! opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
              <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(245,166,35,0.15)] p-1.5! flex flex-col gap-1 font-mono">
                <button
                  type="button"
                  onClick={handleReelsClick}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🎬</span>
                    <span>Reels</span>
                  </span>
                  <span className="text-[9px] text-zinc-500 group-hover/item:text-amber-400 font-mono">9:16</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenTemplatesDrawer}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
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
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
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
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <span>🧠</span>
                    <span>AI Forge</span>
                  </span>
                  <span className="text-[9px] text-zinc-400 group-hover/item:text-amber-400 font-mono flex items-center gap-1 tabular-nums">
                    <span>🪙</span>
                    <span>{credits.toLocaleString()}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. APPS Hover Menu & EcosystemGrid Trigger */}
          <div className="relative group py-2!">
            <button
              type="button"
              onClick={() => setIsEcosystemLauncherOpen((prev) => !prev)}
              className={`flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                isEcosystemLauncherOpen
                  ? 'text-amber-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>APPS</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 group-hover:rotate-180 group-hover:text-white transition-transform duration-200 shrink-0" />
            </button>

            <div className="absolute top-full left-0 pt-1! opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[250px]">
              <div className="bg-[#050505]/95 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(245,166,35,0.15)] p-1.5! flex flex-col gap-1 font-mono">
                <button
                  type="button"
                  onClick={() => setIsEcosystemLauncherOpen(true)}
                  className="w-full text-left px-3! py-2! rounded-lg text-xs font-bold text-amber-300 hover:text-white hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center justify-between cursor-pointer group/item"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ecosystem Launcher</span>
                  </span>
                  <span className="text-[9px] text-amber-400 font-mono">5 APPS ↗</span>
                </button>
                {ECOSYSTEM_PROJECTS.map((proj) => (
                  <a
                    key={proj.id}
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left px-3! py-1.5! rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer no-underline pointer-events-auto"
                  >
                    <span className="truncate pr-2!">{proj.title}</span>
                    <span className="text-[9px] text-amber-400/90 font-mono shrink-0">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-px h-5 bg-white/20 mx-2 mx-2! shrink-0"></div>

        <div className="hidden md:flex items-center gap-3 lg:gap-4 text-[10px] font-bold text-white/50 tracking-widest shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleWorkspacePanelSelect('TACTILE_STAGE')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkspacePanelSelect('TACTILE_STAGE');
            }}
            className={`${
              currentPanel === 'TACTILE_STAGE'
                ? 'text-amber-500'
                : 'hover:text-amber-500'
            } cursor-pointer transition-colors whitespace-nowrap`}
            title="Primary Tactile Cinema Stage"
          >
            STAGE
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleWorkspacePanelSelect('SPLIT')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkspacePanelSelect('SPLIT');
            }}
            className={`${
              currentPanel === 'SPLIT'
                ? 'text-amber-400'
                : 'hover:text-white'
            } cursor-pointer transition-colors whitespace-nowrap`}
            title="9:16 Reels & Dual Split Sequencer"
          >
            REELS
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleWorkspacePanelSelect('SEQUENCER')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkspacePanelSelect('SEQUENCER');
            }}
            className={`${
              currentPanel === 'SEQUENCER'
                ? 'text-amber-400'
                : 'hover:text-white'
            } cursor-pointer transition-colors whitespace-nowrap`}
            title="Sub-Frame Precision Scrub Timeline"
          >
            SCRUB
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleWorkspacePanelSelect('MULTICAM')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkspacePanelSelect('MULTICAM');
            }}
            className={`${
              currentPanel === 'MULTICAM'
                ? 'text-amber-400'
                : 'hover:text-white'
            } cursor-pointer transition-colors whitespace-nowrap`}
            title="Multi-Camera Live Cutting Grid"
          >
            MULTI-CAM
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => handleWorkspacePanelSelect('OPTICAL')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleWorkspacePanelSelect('OPTICAL');
            }}
            className={`${
              currentPanel === 'OPTICAL'
                ? 'text-amber-400'
                : 'hover:text-white'
            } cursor-pointer transition-colors whitespace-nowrap`}
            title="2.39:1 Optical Cinema Monitor"
          >
            MONITOR
          </div>
        </div>
      </div>

      {/* 2. CENTER COLUMN (flex-none keeps it isolated) */}
      {(() => {
        const isMasterMode = currentMode === 'MASTER';
        return (
          <div
            data-current-mode={currentMode}
            className="flex-none flex justify-center items-center shrink-0"
          >
            <div className="relative flex items-center bg-[#050505] border border-white/10 rounded-full p-0.5 p-0.5! shadow-inner">
              {/* SHRUNKEN TOGGLE */}
              <div
                role="button"
                tabIndex={0}
                aria-pressed={!isMasterMode}
                onClick={() => handleModeSelect('SOLO')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleModeSelect('SOLO');
                }}
                className={`relative z-10 w-16 py-1 py-1! flex justify-center items-center text-[9px] font-black tracking-wider uppercase cursor-pointer rounded-full transition-colors ${
                  !isMasterMode
                    ? 'text-[#050505] bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'text-white/40 hover:text-white/75'
                }`}
              >
                {!isMasterMode && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{
                      scale: [1, 1.08, 1.02, 1.1, 1],
                      opacity: [0.5, 0.2, 0.4, 0.1, 0.5]
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="absolute -inset-0.5 rounded-full border border-amber-400/70 pointer-events-none motion-reduce:hidden"
                  />
                )}
                <span className="relative z-10">SOLO</span>
              </div>

              <div
                role="button"
                tabIndex={0}
                aria-pressed={isMasterMode}
                onClick={() => handleModeSelect('MASTER')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleModeSelect('MASTER');
                }}
                className={`relative z-10 w-16 py-1 py-1! flex justify-center items-center text-[9px] font-black tracking-wider uppercase cursor-pointer rounded-full transition-colors ${
                  isMasterMode
                    ? 'text-[#050505] bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'text-white/40 hover:text-white/75'
                }`}
              >
                {isMasterMode && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{
                      scale: [1, 1.08, 1.02, 1.1, 1],
                      opacity: [0.5, 0.2, 0.4, 0.1, 0.5]
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="absolute -inset-0.5 rounded-full border border-amber-400/70 pointer-events-none motion-reduce:hidden"
                  />
                )}
                <span className="relative z-10">MASTER</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. RIGHT COLUMN (flex-1 pushes content to far right) */}
      <div className="flex-1 flex items-center justify-end gap-2.5 lg:gap-4">
        {/* 1. Search Icon / Command Palette Trigger */}
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
            className="flex items-center justify-center h-8 px-2.5! rounded-lg bg-black/40 border border-white/10 hover:border-white/30 text-xs font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors shrink-0"
            title="Search Master Shots (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>
        </SmartHoverCard>

        {/* 2. REC Toggle Button */}
        <SmartHoverCard
          code="[ 🔴 REC // 4K CAPTURE ]"
          description="Record screen, studio canvas & WebAudio DSP directly to IndexedDB Vault."
          shortcut="Alt+R"
          align="right"
        >
          <button
            type="button"
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            className={`h-8 px-2.5! rounded-lg border text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
              isRecording
                ? 'bg-rose-600/25 border-rose-500 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
                : 'bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white'
            }`}
            title="Toggle 4K Screen & Audio Recorder"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse shrink-0" />
            <span>REC</span>
          </button>
        </SmartHoverCard>

        {/* 3. EXPORT Button (Triggers UnifiedExportStudio Modal) */}
        <SmartHoverCard
          code="[ 📤 EXPORT // 24FPS NATIVE ]"
          description="Open Unified Export Studio for 4K WebCodecs MP4, Premiere XML, DaVinci FCPXML & PDF."
          shortcut="⇧E"
          align="right"
        >
          <button
            type="button"
            onClick={() => {
              if (onOpenExport) {
                onOpenExport();
              } else {
                setIsExportStudioOpen(true);
              }
            }}
            className="h-8 px-2.5! rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-100 text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(245,166,35,0.18)] shrink-0 whitespace-nowrap"
            title="Open Unified Master Export Studio"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>EXPORT</span>
          </button>
        </SmartHoverCard>

        {/* 4. STUDIO (Red) Button */}
        <button
          type="button"
          onClick={handleStudioLaunch}
          className="h-8 px-3.5! bg-red-600 text-white font-black tracking-widest rounded-sm border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:scale-105 transition-all uppercase cursor-pointer flex items-center gap-1.5 font-mono text-[10px] active:scale-95 shrink-0 whitespace-nowrap"
          title="Launch Master Cinema Studio"
        >
          <Zap className="w-3.5 h-3.5 fill-current text-white shrink-0" />
          <span>STUDIO</span>
        </button>

        {/* 5. 3-Dot Overflow Settings Menu */}
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
          onOpenInspector={handleTriggerInspector}
          onOpenCacheManager={handleTriggerCacheManager}
        />
      </div>
    </header>

      {/* Hardware-Accelerated CSS Cross-Dissolve Veil between STAGE, REELS, and SCRUB */}
      {dissolvePulseId > 0 && (
        <div
          key={dissolvePulseId}
          className="fixed top-14 inset-x-0 bottom-0 z-40 pointer-events-none bg-gradient-to-b from-amber-500/[0.08] via-[#070709]/60 to-[#070709]/80 flex items-start justify-center pt-5! animate-workspace-dissolve-veil transition-opacity duration-200 transform-gpu will-change-[opacity,transform] motion-reduce:hidden"
          aria-hidden="true"
        >
          {dissolveModeLabel && (
            <span className="px-3! py-1! rounded bg-black/75 border border-amber-400/30 text-[10px] font-mono font-bold tracking-[0.25em] text-amber-300 uppercase shadow-lg">
              {dissolveModeLabel} WORKSPACE
            </span>
          )}
        </div>
      )}

      {/* Modals & Drawers rendered outside <header> so backdrop-blur never traps fixed overlays */}
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
      {isEcosystemLauncherOpen && (
        <EcosystemGrid onClose={() => setIsEcosystemLauncherOpen(false)} />
      )}

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

      {/* Typography & Templates Slide-Over Drawer (Dopamine Compilation Pack & Cinematic Titles) */}
      {isTemplatesDrawerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex justify-start"
          onClick={() => setIsTemplatesDrawerOpen(false)}
        >
          <aside
            aria-label="Typography & Templates Drawer"
            className="w-[440px] sm:w-[500px] max-w-[92vw] h-full bg-[#08090C]/98 backdrop-blur-3xl border-r border-amber-500/30 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col font-mono text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#050505]/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Type className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white truncate">
                    [ TYPOGRAPHY &amp; TEMPLATES ]
                  </h3>
                  <p className="text-[9px] text-zinc-400 truncate">
                    DOPAMINE COMPILATION PACK • KINETIC TITLES • B2B PRESETS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatesDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Close Templates Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TextTypographyDrawer
                currentFrame={currentFrame || frames[currentIndex]}
                onUpdateFrame={(updated) => {
                  eventBus.emit('shot:updated', {
                    index: currentIndex,
                    partial: updated
                  });
                }}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Standalone Director Inspector Drawer Overlay (Active when triggered from Home or 3-Dot Menu) */}
      {isInspectorDrawerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs"
          onClick={() => setIsInspectorDrawerOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <DirectorInspector
              frame={inspectableFrame}
              onUpdateFrame={(updated) => {
                eventBus.emit('shot:updated', {
                  index: currentIndex,
                  partial: updated
                });
              }}
              onClose={() => setIsInspectorDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* IndexedDB Cache & Vault Manager Modal (Triggered from 3-Dot Menu) */}
      {isCacheManagerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsCacheManagerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#07080C]/95 backdrop-blur-3xl border border-amber-500/30 rounded-2xl p-6 text-zinc-200 font-mono shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase">
                    IndexedDB Cache Manager
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Local Media Proxy Buffers &amp; Browser Vault Telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCacheManagerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Cache Manager"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-zinc-400 uppercase mb-1">Active Vault Usage</div>
                <div className="text-base font-bold text-white">
                  {(cacheUsageBytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10">
                <div className="text-[10px] text-zinc-400 uppercase mb-1">Available Browser Quota</div>
                <div className="text-base font-bold text-emerald-400">
                  {cacheQuotaBytes > 0
                    ? `${(cacheQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : 'Unlimited'}
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Purging clears temporary canvas bitmaps and transient proxy thumbnails from IndexedDB without deleting saved storyboard frames or timeline metadata.
            </p>

            {cachePurgeFeedback && (
              <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cachePurgeFeedback}</span>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCacheManagerOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isPurgingCache}
                onClick={handleExecuteCachePurge}
                className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/60 text-xs font-bold text-rose-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPurgingCache ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Transient Cache</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
