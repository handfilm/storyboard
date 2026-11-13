/**
 * @file /src/components/StageHeader.tsx
 * @description Compact, High-Density 3-Zone Obsidian Studio Header (48px) for HANDFILM STUDIO:
 * - Left Zone: HANDFILM industrial wordmark + RAW. RAPID. CINEMA. tagline,
 *   plus interactive Brutalist mega-dropdowns (HOME | FEATURES | APPS) with keyboard badges.
 * - Center Zone: Chromatic 6-tab Hardware Workspace Switcher (STAGE, REELS, SCRUB, MULTI-CAM, MONITOR, COCKPIT)
 *   with luminous category edge bars and [1]–[6] hover hints (Alt+1..Alt+6).
 * - Right Zone: Command Search (Cmd+K / /), Live Engine Telemetry (FPS · Aspect Ratio · OPFS Clips),
 *   red STUDIO Focus Mode pill, circular golden Export CTA, Record dot button, and 3-dot Overflow menu.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  ChevronDown,
  Search,
  LayoutGrid,
  Type,
  X,
  Database,
  Trash2,
  Check,
  RefreshCw,
  ExternalLink,
  FolderPlus,
  FolderOpen,
  Save,
  FolderInput,
  RotateCcw,
  Flame,
  Activity,
  Crop,
  Film,
  Keyboard,
  Video,
  Sparkles,
  Palette,
  AudioWaveform,
  Minimize2,
  Download,
  Home,
  PlaySquare,
  Scissors,
  Monitor,
  Cloud,
  BarChart2,
  Cpu
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { SaveState } from '../core/storage';
import { eventBus } from '../core/eventBus';
import { useStudioStore } from '../core/store';
import { studioDraftDb } from '../services/db';
import { opfsMediaStorage } from '../services/media/opfsMediaStorage';
import { DirectorInspector } from './DirectorInspector';
import { CompileEngine } from './modules/CompileEngine';
import { RapAudioSync } from './modules/RapAudioSync';
import { NeuralAudioEngine } from './modules/NeuralAudioEngine';
import { VectorForgeCanvas } from './modules/VectorForgeCanvas';
import { OmniAIForge } from './modules/OmniAIForge';
import { B2BCommandCenter } from './modules/B2BCommandCenter';
import { UnifiedExportStudio } from './modules/UnifiedExportStudio';
import { EcosystemGridModal } from './menus/EcosystemGridModal';
import { OverflowSettingsMenu } from './menus/OverflowSettingsMenu';
import { TextTypographyDrawer } from './drawers/TextTypographyDrawer';
import { ecosystemSearchEngine } from '../services/ecosystemSearchIndex';
import { CockpitManifestStats, CockpitShotBridge } from '../types/cockpit';
import {
  isTauriRuntime,
  generateNLETimelineXML,
  generatePremiereXml,
  generateCapCutDraftJson,
  buildCapCutQuickPackZip,
  triggerBrowserDownload,
  freezeAllShotFrames
} from '../utils/interchangeExport';
import {
  exportCinemaMasterMp4,
  exportCinemaMasterVp9,
  exportPngSequenceZip,
  RenderTelemetry
} from '../services/videoExportEngine';
import { getLightingPresetById } from '../data/lightingPresets';

export type StagePanelType = 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM';

type MegaMenuKey = 'HOME' | 'FEATURES' | 'APPS';

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
  aspectRatio?: string;
  saveState?: SaveState;
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
  onOpenProjectStats?: () => void;
  onNewProject?: () => void;
  onSaveSnapshot?: () => void;
  onRestoreProjectJson?: () => void;
  onBatchImportMedia?: () => void;
  onClearOpfsCache?: () => Promise<void> | void;
  isPlaying?: boolean;
  onOpenColorLab?: () => void;
  onOpenAudioAnalyzer?: () => void;
  onTriggerHyperReelPack?: () => void;
  onTriggerBeatDropEngine?: () => void;
  onTriggerSmartCrop916?: () => void;
  onJumpToShot?: (shotIndex: number) => void;
  isZenMode?: boolean;
  onToggleZen?: () => void;
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
  aspectRatio,
  saveState = 'SAVED (IDB)',
  className = '',
  onOpenRecorder,
  onOpenExport,
  onCompile,
  onGoHome,
  onLaunchStudio,
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
  onOpenCacheManager,
  onOpenProjectStats,
  onNewProject,
  onSaveSnapshot,
  onRestoreProjectJson,
  onBatchImportMedia,
  onClearOpfsCache,
  onOpenColorLab,
  onOpenAudioAnalyzer,
  onTriggerHyperReelPack,
  onTriggerBeatDropEngine,
  onTriggerSmartCrop916,
  onJumpToShot,
  isZenMode = false,
  onToggleZen,
  isPlaying
}) => {
  const storeIsPlaying = useStudioStore((s) => s.isPlaying);
  const effectiveIsPlaying = typeof isPlaying === 'boolean' ? isPlaying : storeIsPlaying;
  // Interactive Mega-Dropdown State (Hover + Click, auto-closing on Escape, outside click, or route switch)
  const [activeDropdown, setActiveDropdown] = useState<MegaMenuKey | null>(null);
  const closeHoverTimerRef = useRef<number | null>(null);
  const navZoneRef = useRef<HTMLDivElement>(null);

  // Secondary Modals & Drawers
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isRapSyncModalOpen, setIsRapSyncModalOpen] = useState(false);
  const [isNeuralVoxOpen, setIsNeuralVoxOpen] = useState(false);
  const [isVectorForgeOpen, setIsVectorForgeOpen] = useState(false);
  const [isAIForgeOpen, setIsAIForgeOpen] = useState(false);
  const [isB2BHubOpen, setIsB2BHubOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
  const [isTemplatesDrawerOpen, setIsTemplatesDrawerOpen] = useState(false);
  const [isInspectorDrawerOpen, setIsInspectorDrawerOpen] = useState(false);
  const [isCacheManagerOpen, setIsCacheManagerOpen] = useState(false);
  const [cacheUsageBytes, setCacheUsageBytes] = useState<number>(0);
  const [cacheQuotaBytes, setCacheQuotaBytes] = useState<number>(0);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [cachePurgeFeedback, setCachePurgeFeedback] = useState<string | null>(null);
  const [headerNotice, setHeaderNotice] = useState<string | null>(null);

  // Workspace Cross-Dissolve Veil
  const [dissolvePulseId, setDissolvePulseId] = useState<number>(0);
  const [dissolveModeLabel, setDissolveModeLabel] = useState<'STAGE' | 'REELS' | 'SCRUB' | null>(null);
  const dissolveTimeoutRef = useRef<number | null>(null);
  const prevPanelRef = useRef<StagePanelType>(currentPanel);

  // Cockpit Portal Drawer State
  const [isCockpitHudOpen, setIsCockpitHudOpen] = useState(false);
  const [isTelemetryLayerOn, setIsTelemetryLayerOn] = useState(false);
  const [isSpectrumLayerOn, setIsSpectrumLayerOn] = useState(false);
  const [isZoomHudLayerOn, setIsZoomHudLayerOn] = useState(false);
  const [cockpitFeedback, setCockpitFeedback] = useState<string | null>(null);
  const [liveCockpitStats, setLiveCockpitStats] = useState<CockpitManifestStats | null>(null);
  const [cockpitDrawerPos, setCockpitDrawerPos] = useState<{ top: number; left: number } | null>(null);
  const [renderScope, setRenderScope] = useState<'reel' | 'master'>('reel');
  const [isRenderingOffline, setIsRenderingOffline] = useState(false);
  const [renderTelemetry, setRenderTelemetry] = useState<RenderTelemetry | null>(null);
  const renderAbortRef = useRef<AbortController | null>(null);
  const cockpitContainerRef = useRef<HTMLDivElement>(null);
  const cockpitBtnRef = useRef<HTMLButtonElement>(null);
  const cockpitDrawerRef = useRef<HTMLDivElement>(null);

  // Store & Vault Telemetry
  const activeReelIndex = useStudioStore((s) => s.activeReelIndex);
  const reelLoopActive = useStudioStore((s) => s.reelLoopActive);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const storeAspectRatio = useStudioStore((s) => s.aspectRatio);
  const selectReel = useStudioStore((s) => s.selectReel);
  const setReelLoopActive = useStudioStore((s) => s.setReelLoopActive);
  const [opfsClipCount, setOpfsClipCount] = useState<number>(0);

  // Command Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [searchHighlightIdx, setSearchHighlightIdx] = useState(0);
  const [searchFilterTab, setSearchFilterTab] = useState<'ALL' | 'SHOTS' | 'TOOLS' | 'APPS'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((msg: string) => {
    setHeaderNotice(msg);
    window.setTimeout(() => {
      setHeaderNotice((cur) => (cur === msg ? null : cur));
    }, 2600);
  }, []);

  // Poll OPFS media_vault count lightly on mount / vault updates
  const refreshOpfsCount = useCallback(async () => {
    try {
      const root = await opfsMediaStorage.getRootDirectory();
      if (!root) {
        setOpfsClipCount(0);
        return;
      }
      const vaultDir = await root.getDirectoryHandle('media_vault', { create: false }).catch(() => null);
      if (!vaultDir) {
        setOpfsClipCount(0);
        return;
      }
      let count = 0;
      for await (const [, handle] of (vaultDir as any).entries()) {
        if (handle?.kind === 'file') count += 1;
      }
      setOpfsClipCount(count);
    } catch {
      setOpfsClipCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshOpfsCount();
  }, [refreshOpfsCount, shotMediaMap]);

  // Derived Telemetry
  const resolvedFps = currentFrame?.targetFps === 60 || fps === 60 ? 60 : 24;
  const resolvedAspectRatio = aspectRatio || currentFrame?.aspectRatio || storeAspectRatio || '2.39:1';
  const vaultClipCount = useMemo(() => {
    const mapCount = Object.keys(shotMediaMap || {}).length;
    const uploadedFramesCount = frames.filter((f) => Boolean(f.imageUrl || f.videoSrc)).length;
    return Math.max(opfsClipCount, mapCount, uploadedFramesCount);
  }, [opfsClipCount, shotMediaMap, frames]);

  const isUnsavedOrSaving =
    saveState === 'SAVING...' || saveState === 'UNSAVED' || saveState === 'SAVE ERROR';

  // Hover & Click Menu Handlers
  const clearCloseTimer = () => {
    if (closeHoverTimerRef.current !== null) {
      window.clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
  };

  const openDropdown = (key: MegaMenuKey) => {
    clearCloseTimer();
    setActiveDropdown(key);
    setIsGlobalSearchOpen(false);
    setIsCockpitHudOpen(false);
  };

  const scheduleCloseDropdown = () => {
    clearCloseTimer();
    closeHoverTimerRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 140);
  };

  const toggleDropdown = (key: MegaMenuKey) => {
    clearCloseTimer();
    setIsGlobalSearchOpen(false);
    setIsCockpitHudOpen(false);
    setActiveDropdown((prev) => (prev === key ? null : key));
  };

  // Close all dropdowns on route/panel switch
  useEffect(() => {
    setActiveDropdown(null);
    setIsGlobalSearchOpen(false);
  }, [currentView, currentPanel]);

  // Close dropdowns, search & cockpit HUD on Escape or outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (navZoneRef.current && !navZoneRef.current.contains(targetNode)) {
        setActiveDropdown(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(targetNode)) {
        setIsGlobalSearchOpen(false);
      }
      const inCockpitTrigger = cockpitContainerRef.current?.contains(targetNode);
      const inCockpitDrawer = cockpitDrawerRef.current?.contains(targetNode);
      if (!inCockpitTrigger && !inCockpitDrawer) {
        setIsCockpitHudOpen(false);
      }
    };

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setIsGlobalSearchOpen(false);
        setIsCockpitHudOpen(false);
      }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalEscape);
    return () => {
      window.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalEscape);
    };
  }, []);

  // Keyboard shortcut Cmd+K / Ctrl+K and '/' for Command Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveDropdown(null);
        setIsCockpitHudOpen(false);
        setIsGlobalSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 10);
        return;
      }

      if (!isTyping && e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveDropdown(null);
        setIsCockpitHudOpen(false);
        setIsGlobalSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cockpit Drawer Toggle Helper (shared by click + Alt+6)
  const toggleCockpitDrawer = useCallback(() => {
    setActiveDropdown(null);
    setIsGlobalSearchOpen(false);
    setIsCockpitHudOpen((prev) => {
      const next = !prev;
      if (next && cockpitBtnRef.current && typeof window !== 'undefined') {
        const rect = cockpitBtnRef.current.getBoundingClientRect();
        const clampedLeft = Math.min(window.innerWidth - 368, Math.max(16, rect.left));
        setCockpitDrawerPos({ top: Math.max(48, rect.bottom + 4), left: clampedLeft });
      }
      return next;
    });
  }, []);

  // Sync live Cockpit telemetry & eventBus listeners
  useEffect(() => {
    const unsubStats = eventBus.on<CockpitManifestStats>('cockpit:stats', (stats) => {
      if (stats) setLiveCockpitStats(stats);
    });
    const unsubFeedback = eventBus.on<string>('cockpit:feedback', (msg) => {
      if (msg) {
        setCockpitFeedback(msg);
        setTimeout(() => setCockpitFeedback(null), 4000);
      }
    });
    const unsubToggleHud = eventBus.on('cockpit:toggle_hud', () => {
      toggleCockpitDrawer();
    });
    const unsubTelemetryState = eventBus.on<boolean>('cockpit:telemetry_state', (val) => {
      setIsTelemetryLayerOn(Boolean(val));
    });
    const unsubSpectrumState = eventBus.on<boolean>('cockpit:spectrum_state', (val) => {
      setIsSpectrumLayerOn(Boolean(val));
    });
    const unsubZoomState = eventBus.on<boolean>('cockpit:zoom_state', (val) => {
      setIsZoomHudLayerOn(Boolean(val));
    });
    const unsubAI = eventBus.on('aiforge:open', () => {
      queueMicrotask(() => setIsAIForgeOpen(true));
    });
    const unsubB2B = eventBus.on('b2b:open', () => {
      queueMicrotask(() => setIsB2BHubOpen(true));
    });
    const unsubEco = eventBus.on('ecosystem:open', () => {
      queueMicrotask(() => setIsAppsModalOpen(true));
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
    const unsubStatsOpen = eventBus.on('stats:open', () => {
      if (onOpenProjectStats) {
        queueMicrotask(() => onOpenProjectStats());
      }
    });

    return () => {
      unsubStats();
      unsubFeedback();
      unsubToggleHud();
      unsubTelemetryState();
      unsubSpectrumState();
      unsubZoomState();
      unsubAI();
      unsubB2B();
      unsubEco();
      unsubExport();
      unsubDrawerOpen();
      unsubDrawerClose();
      unsubStatsOpen();
    };
  }, [onOpenExport, onOpenProjectStats, toggleCockpitDrawer]);

  const fallbackCockpitStats = useMemo<CockpitManifestStats>(() => {
    const activeCount = frames.length || totalShots || 14;
    const lightsCount = frames.filter((f) => Boolean(f.lightId)).length;
    const durSec =
      frames.length > 0
        ? frames.reduce((acc, f) => acc + (f.durationSec || f.slideHoldSec || 12.0), 0)
        : activeCount * slideDurationSec;
    return {
      totalShots: activeCount,
      activeLightsCount: lightsCount,
      audioSynced: false,
      audioTrackName: null,
      totalDurationSec: durSec,
      isTauriActive: isTauriRuntime()
    };
  }, [frames, totalShots, slideDurationSec]);

  const resolvedCockpitStats = liveCockpitStats || fallbackCockpitStats;

  // Unified Command Search Results (Bangla/English title, shot #01-#21/#100, lens metadata, panels, tools, apps)
  interface UnifiedSearchItem {
    id: string;
    type: 'shot' | 'panel' | 'studio-tool' | 'ecosystem';
    title: string;
    sub: string;
    badge: string;
    badgeColor?: string;
    categoryGroup: string;
    score: number;
    url?: string;
    actionId?: string;
    shotIndex?: number;
    panelTarget?: StagePanelType;
    viewTarget?: 'HOME' | 'STUDIO';
    thumbnailUrl?: string;
    colorAccent?: string;
  }

  const unifiedSearchResults = useMemo<UnifiedSearchItem[]>(() => {
    const raw = globalSearchQuery.trim().toLowerCase();
    const queryTokens = raw.split(/\s+/).filter(Boolean);

    if (!raw) {
      const featured: UnifiedSearchItem[] = [];
      if (frames && frames.length > 0) {
        const activeIdx = typeof currentIndex === 'number' && currentIndex < frames.length ? currentIndex : 0;
        const currentF = frames[activeIdx];
        if (currentF) {
          featured.push({
            id: `shot-${activeIdx}-${currentF.id ?? activeIdx}`,
            type: 'shot',
            title: `#${String(activeIdx + 1).padStart(2, '0')} · ${currentF.title || 'Active Frame'}`,
            sub: `${currentF.bengaliTitle ? `${currentF.bengaliTitle} · ` : ''}${currentF.cameraSpec?.focalLength || '35mm'} ${currentF.cameraSpec?.aperture || ''}`.trim(),
            badge: 'CURRENT',
            badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
            categoryGroup: 'SHOTS',
            score: 100,
            shotIndex: activeIdx,
            thumbnailUrl: currentF.imageUrl || currentF.thumbnailUrl || currentF.thumbnail,
            colorAccent: currentF.colorAccent
          });
        }
        if (frames.length > activeIdx + 1) {
          const nextF = frames[activeIdx + 1];
          featured.push({
            id: `shot-${activeIdx + 1}-${nextF.id ?? activeIdx + 1}`,
            type: 'shot',
            title: `#${String(activeIdx + 2).padStart(2, '0')} · ${nextF.title || 'Next Shot'}`,
            sub: `${nextF.bengaliTitle ? `${nextF.bengaliTitle} · ` : ''}${nextF.cameraSpec?.focalLength || '35mm'}`.trim(),
            badge: 'NEXT',
            badgeColor: 'text-zinc-300 bg-white/5 border-white/10',
            categoryGroup: 'SHOTS',
            score: 90,
            shotIndex: activeIdx + 1,
            thumbnailUrl: nextF.imageUrl || nextF.thumbnailUrl || nextF.thumbnail,
            colorAccent: nextF.colorAccent
          });
        }
      }

      featured.push(
        {
          id: 'panel-stage',
          type: 'panel',
          title: 'STAGE',
          sub: 'Primary 2.39:1 cinema viewport & tactile deck',
          badge: 'ALT+1',
          badgeColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
          categoryGroup: 'WORKSPACES',
          score: 85,
          panelTarget: 'TACTILE_STAGE'
        },
        {
          id: 'panel-reels',
          type: 'panel',
          title: 'REELS (9:16)',
          sub: '12s Hyper-Reel & beat-drop vertical sequencer',
          badge: 'ALT+2',
          badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
          categoryGroup: 'WORKSPACES',
          score: 80,
          panelTarget: 'SPLIT'
        },
        {
          id: 'tool-export-studio',
          type: 'studio-tool',
          title: 'Unified Master Export',
          sub: '4K WebCodecs MP4, Premiere XML, FCPXML & PDF',
          badge: 'CMD+E',
          badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
          categoryGroup: 'TOOLS',
          score: 70,
          actionId: 'export:open'
        }
      );

      if (searchFilterTab === 'SHOTS') return featured.filter((f) => f.type === 'shot');
      if (searchFilterTab === 'TOOLS') return featured.filter((f) => f.type === 'panel' || f.type === 'studio-tool');
      if (searchFilterTab === 'APPS') return featured.filter((f) => f.type === 'ecosystem');
      return featured;
    }

    const matches: UnifiedSearchItem[] = [];

    if (frames && frames.length > 0) {
      frames.forEach((f, idx) => {
        let score = 0;
        const shotNumStr = String(idx + 1);
        const padded2 = shotNumStr.padStart(2, '0');
        const padded3 = shotNumStr.padStart(3, '0');
        const epStr = (f.epNumber || '').toLowerCase();
        const titleStr = (f.title || '').toLowerCase();
        const bengaliStr = (f.bengaliTitle || '').toLowerCase();
        const taglineStr = (f.tagline || '').toLowerCase();
        const notesStr = (f.directorNotes || '').toLowerCase();
        const lensStr = [
          f.cameraSpec?.focalLength,
          f.cameraSpec?.aperture,
          f.cameraSpec?.sensor,
          f.cameraSpec?.format,
          f.cameraSpec?.shutter,
          f.cameraSpec?.iso,
          f.lutFilter
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const normalizedRaw = raw.replace(/^#/, '');
        const isNumericShotQuery =
          raw === shotNumStr ||
          raw === padded2 ||
          raw === padded3 ||
          raw === `#${shotNumStr}` ||
          raw === `#${padded2}` ||
          raw === `#${padded3}` ||
          raw === `shot ${shotNumStr}` ||
          raw === `sh${shotNumStr}` ||
          raw === `sh${padded2}` ||
          epStr === raw ||
          epStr.includes(normalizedRaw);

        if (isNumericShotQuery) {
          score += 240;
        } else if (titleStr.includes(raw)) {
          score += 120;
        } else if (bengaliStr.includes(raw)) {
          score += 115;
        } else if (lensStr.includes(raw)) {
          score += 95;
        } else if (taglineStr.includes(raw) || notesStr.includes(raw)) {
          score += 55;
        }

        for (const token of queryTokens) {
          const cleanTok = token.replace(/^#/, '');
          if (cleanTok === shotNumStr || cleanTok === padded2 || epStr.includes(cleanTok)) score += 50;
          if (titleStr.includes(token)) score += 30;
          if (bengaliStr.includes(token)) score += 30;
          if (lensStr.includes(token)) score += 28;
          if (taglineStr.includes(token)) score += 12;
        }

        if (score > 0) {
          const lensTag = f.cameraSpec?.focalLength || '35mm';
          matches.push({
            id: `shot-${idx}-${f.id ?? idx}`,
            type: 'shot',
            title: `#${padded2} · ${f.title || `Frame ${idx + 1}`}`,
            sub: `${f.bengaliTitle ? `${f.bengaliTitle} · ` : ''}${lensTag}${f.cameraSpec?.aperture ? ` ${f.cameraSpec.aperture}` : ''}`,
            badge: `#${padded2}`,
            badgeColor: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30',
            categoryGroup: 'SHOTS',
            score,
            shotIndex: idx,
            thumbnailUrl: f.imageUrl || f.thumbnailUrl || f.thumbnail,
            colorAccent: f.colorAccent
          });
        }
      });
    }

    const panelsData: Array<{
      id: string;
      title: string;
      sub: string;
      badge: string;
      panelTarget?: StagePanelType;
      viewTarget?: 'HOME' | 'STUDIO';
      keywords: string[];
    }> = [
      {
        id: 'panel-stage',
        title: 'STAGE',
        sub: 'Primary 2.39:1 / 16:9 cinema viewport',
        badge: 'ALT+1',
        panelTarget: 'TACTILE_STAGE',
        keywords: ['stage', 'cinema', 'viewport', 'tactile', 'player']
      },
      {
        id: 'panel-reels',
        title: 'REELS',
        sub: '9:16 vertical short-form & 12s hyper-reel',
        badge: 'ALT+2',
        panelTarget: 'SPLIT',
        keywords: ['reels', 'split', 'vertical', '9:16', 'shorts']
      },
      {
        id: 'panel-scrub',
        title: 'SCRUB',
        sub: 'Sub-frame precision scrub timeline',
        badge: 'ALT+3',
        panelTarget: 'SEQUENCER',
        keywords: ['scrub', 'timeline', 'sequencer', 'keyframes']
      },
      {
        id: 'panel-multicam',
        title: 'MULTI-CAM',
        sub: 'Multi-camera synchronized live cutting grid',
        badge: 'ALT+4',
        panelTarget: 'MULTICAM',
        keywords: ['multicam', 'multi-cam', 'grid', 'cameras', 'angles']
      },
      {
        id: 'panel-monitor',
        title: 'MONITOR',
        sub: 'Optical master reference & cinema scopes',
        badge: 'ALT+5',
        panelTarget: 'OPTICAL',
        keywords: ['monitor', 'optical', 'scopes', 'waveform', 'lut']
      },
      {
        id: 'view-home',
        title: 'DIRECTOR HOME',
        sub: 'Anthology showcase & manifesto',
        badge: 'HOME',
        viewTarget: 'HOME',
        keywords: ['home', 'overview', 'manifesto', 'landing']
      }
    ];

    panelsData.forEach((p) => {
      let score = 0;
      const titleLower = p.title.toLowerCase();
      const subLower = p.sub.toLowerCase();
      if (titleLower.includes(raw)) score += 110;
      if (subLower.includes(raw)) score += 30;
      p.keywords.forEach((kw) => {
        if (kw === raw) score += 95;
        else if (kw.includes(raw)) score += 40;
        queryTokens.forEach((token) => {
          if (kw === token) score += 25;
          else if (kw.includes(token)) score += 10;
        });
      });
      if (score > 0) {
        matches.push({
          id: p.id,
          type: 'panel',
          title: p.title,
          sub: p.sub,
          badge: p.badge,
          badgeColor: 'text-[#8E8E93] bg-[#141417] border-white/[0.07]',
          categoryGroup: 'WORKSPACE',
          score,
          panelTarget: p.panelTarget,
          viewTarget: p.viewTarget
        });
      }
    });

    const ecoMatches = ecosystemSearchEngine.search(raw, 16);
    ecoMatches.forEach((em) => {
      matches.push({
        id: em.id,
        type: em.type,
        title: em.title,
        sub: em.sub,
        badge: em.category,
        badgeColor:
          em.type === 'studio-tool'
            ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30'
            : 'text-[#8E8E93] bg-[#141417] border-white/[0.07]',
        categoryGroup: em.categoryGroup,
        score: em.score,
        url: em.url,
        actionId: em.actionId
      });
    });

    matches.sort((a, b) => b.score - a.score);

    if (searchFilterTab === 'SHOTS') return matches.filter((m) => m.type === 'shot').slice(0, 12);
    if (searchFilterTab === 'TOOLS') return matches.filter((m) => m.type === 'panel' || m.type === 'studio-tool').slice(0, 12);
    if (searchFilterTab === 'APPS') return matches.filter((m) => m.type === 'ecosystem').slice(0, 12);
    return matches.slice(0, 14);
  }, [globalSearchQuery, frames, currentIndex, searchFilterTab]);

  // Workspace Cross-Dissolve Helpers
  const triggerCoreWorkspaceCrossDissolve = (targetPanel: StagePanelType) => {
    if (targetPanel !== 'TACTILE_STAGE' && targetPanel !== 'SPLIT' && targetPanel !== 'SEQUENCER') {
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
    }, 240);
  };

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

  useEffect(() => {
    return () => {
      if (dissolveTimeoutRef.current !== null) {
        window.clearTimeout(dissolveTimeoutRef.current);
      }
      clearCloseTimer();
    };
  }, []);

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

  // Navigation & Action Handlers
  const handleHomeClick = () => {
    setActiveDropdown(null);
    if (onSelectView) onSelectView('HOME');
    else if (onGoHome) onGoHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWorkspacePanelSelect = (panel: StagePanelType) => {
    setActiveDropdown(null);
    setIsCockpitHudOpen(false);
    const isCoreDissolveMode =
      panel === 'TACTILE_STAGE' || panel === 'SPLIT' || panel === 'SEQUENCER';
    if (isCoreDissolveMode && (panel !== currentPanel || currentView !== 'STUDIO')) {
      prevPanelRef.current = panel;
      triggerCoreWorkspaceCrossDissolve(panel);
      eventBus.emit('workspace:cross_dissolve', { from: currentPanel, to: panel });
    }
    if (onSelectView && currentView !== 'STUDIO') onSelectView('STUDIO');
    onSelectPanel(panel);
  };

  const handleSelectSearchResult = (item: UnifiedSearchItem) => {
    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery('');
    searchInputRef.current?.blur();

    if (item.type === 'shot' && typeof item.shotIndex === 'number') {
      const idx = item.shotIndex;
      if (onSelectView && currentView !== 'STUDIO') {
        onSelectView('STUDIO');
      }
      onJumpToShot?.(idx);
      eventBus.emit('frame:select', { index: idx });
      eventBus.emit('timeline:seek_shot', { index: idx });
      eventBus.emit('studio:jump_to_shot', { shotIndex: idx });
      return;
    }

    if (item.type === 'panel') {
      if (item.viewTarget === 'HOME') {
        handleHomeClick();
        return;
      }
      if (item.panelTarget) {
        handleWorkspacePanelSelect(item.panelTarget);
        return;
      }
    }

    if (item.type === 'studio-tool' && item.actionId) {
      eventBus.emit(item.actionId);
      if (item.actionId === 'aiforge:open') setIsAIForgeOpen(true);
      if (item.actionId === 'rapsync:open') setIsRapSyncModalOpen(true);
      if (item.actionId === 'neuralvox:open') setIsNeuralVoxOpen(true);
      if (item.actionId === 'vectorforge:open') setIsVectorForgeOpen(true);
      if (item.actionId === 'export:open') {
        if (onOpenExport) onOpenExport();
        else setIsExportStudioOpen(true);
      }
      if (item.actionId === 'recorder:open') {
        if (onOpenRecorder) onOpenRecorder();
        else eventBus.emit('recorder:open');
      }
      if (item.actionId === 'stats:open') {
        if (onOpenProjectStats) onOpenProjectStats();
        else eventBus.emit('stats:open');
      }
      return;
    }

    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsGlobalSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchHighlightIdx((prev) =>
        unifiedSearchResults.length ? (prev + 1) % unifiedSearchResults.length : 0
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHighlightIdx((prev) =>
        unifiedSearchResults.length
          ? (prev - 1 + unifiedSearchResults.length) % unifiedSearchResults.length
          : 0
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = unifiedSearchResults[searchHighlightIdx] || unifiedSearchResults[0];
      if (selected) {
        handleSelectSearchResult(selected);
      } else {
        setIsAppsModalOpen(true);
        setIsGlobalSearchOpen(false);
      }
    }
  };

  const handleClearOpfsAction = async () => {
    setActiveDropdown(null);
    if (onClearOpfsCache) {
      await onClearOpfsCache();
      await refreshOpfsCount();
      showNotice('OPFS Cache Cleared');
      return;
    }
    try {
      opfsMediaStorage.cleanup();
      const root = await opfsMediaStorage.getRootDirectory();
      if (root) {
        await root.removeEntry('media_vault', { recursive: true }).catch(() => {});
        await root.removeEntry('proxies', { recursive: true }).catch(() => {});
      }
      await studioDraftDb.purgeTransientCache();
      await refreshOpfsCount();
      showNotice('OPFS Cache Cleared');
    } catch {
      setIsCacheManagerOpen(true);
    }
  };

  const handleExecuteCachePurge = async () => {
    if (isPurgingCache) return;
    setIsPurgingCache(true);
    try {
      opfsMediaStorage.cleanup();
      const root = await opfsMediaStorage.getRootDirectory();
      if (root) {
        await root.removeEntry('media_vault', { recursive: true }).catch(() => {});
        await root.removeEntry('proxies', { recursive: true }).catch(() => {});
      }
      const result = await studioDraftDb.purgeTransientCache();
      const freedMB = (result.freedEstimatesBytes / (1024 * 1024)).toFixed(2);
      const msg = `Purged ${result.purgedCount} transient bitmaps (${freedMB} MB freed)`;
      setCachePurgeFeedback(msg);
      await refreshOpfsCount();
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setCacheUsageBytes(est.usage || 0);
        setCacheQuotaBytes(est.quota || 0);
      }
    } catch {
      setCachePurgeFeedback('Transient IndexedDB & OPFS cache cleared');
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handleStudioOrFocusToggle = () => {
    setActiveDropdown(null);
    setIsCockpitHudOpen(false);
    if (currentView === 'HOME') {
      if (onLaunchStudio) onLaunchStudio();
      else if (onSelectView) onSelectView('STUDIO');
      onSelectPanel('TACTILE_STAGE');
      return;
    }
    if (onToggleZen) {
      onToggleZen();
    } else {
      useStudioStore.getState().toggleZenMode();
    }
  };

  const handleTriggerExport = () => {
    setActiveDropdown(null);
    setIsCockpitHudOpen(false);
    if (onOpenExport) onOpenExport();
    else setIsExportStudioOpen(true);
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

  const WORKSPACE_TABS: ReadonlyArray<{
    id: string;
    panel: StagePanelType;
    label: string;
    shortcut: string;
    title: string;
    accentHex: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }> = [
    {
      id: 'stage',
      panel: 'TACTILE_STAGE',
      label: 'STAGE',
      shortcut: '1',
      title: 'Primary Cinema Stage (Alt+1)',
      accentHex: '#F59E0B',
      icon: PlaySquare
    },
    {
      id: 'reels',
      panel: 'SPLIT',
      label: 'REELS',
      shortcut: '2',
      title: '9:16 Reels & Hyper-Reel Engine (Alt+2)',
      accentHex: '#FB7185',
      icon: Flame
    },
    {
      id: 'scrub',
      panel: 'SEQUENCER',
      label: 'SCRUB',
      shortcut: '3',
      title: 'Sub-Frame Precision Scrub (Alt+3)',
      accentHex: '#38BDF8',
      icon: Scissors
    },
    {
      id: 'multicam',
      panel: 'MULTICAM',
      label: 'MULTI-CAM',
      shortcut: '4',
      title: 'Multi-Camera Cutting Grid (Alt+4)',
      accentHex: '#10B981',
      icon: LayoutGrid
    },
    {
      id: 'monitor',
      panel: 'OPTICAL',
      label: 'MONITOR',
      shortcut: '5',
      title: 'Optical Cinema Monitor (Alt+5)',
      accentHex: '#A855F7',
      icon: Monitor
    }
  ];

  const flyoutPanelStyle: React.CSSProperties = {
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)'
  };

  return (
    <>
      <header
        data-playing={effectiveIsPlaying ? 'true' : 'false'}
        className={`nle-focus-bar relative w-full h-12 bg-[#0B0B0D]/95 backdrop-blur-xl border-b border-white/[0.08] px-2.5 xl:px-4 flex items-center justify-between gap-2 xl:gap-3 z-[9990] select-none shrink-0 font-sans zen-disclose-header ${className}`}
      >
        {/* ================================================================
            LEFT ZONE: Brand Wordmark + Tagline & Mega-Dropdown Menus
            ================================================================ */}
        <div ref={navZoneRef} className="flex items-center gap-2 xl:gap-3 min-w-0 justify-self-start">
          {/* HANDFILM Wordmark + RAW. RAPID. CINEMA. Tagline (no SYNCED badge) */}
          <button
            type="button"
            data-transport-sharp="true"
            onClick={handleHomeClick}
            className="group flex flex-col items-start justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B] rounded-[3px] py-0.5 pr-1 transition-opacity hover:opacity-95 whitespace-nowrap shrink-0 text-left"
            title="HANDFILM STUDIO — Return to Director Home"
          >
            <span className="font-space-grotesk font-black tracking-[0.14em] text-[15px] xl:text-[16px] leading-none text-[#F4F4F5]">
              HAND<span className="text-[#F59E0B]">FILM</span>
            </span>
            <span className="mt-[3px] font-mono text-[7px] xl:text-[7.5px] font-semibold tracking-[0.2em] uppercase text-[#8E8E93] group-hover:text-[#F4F4F5] leading-none transition-colors">
              RAW. RAPID. CINEMA.
            </span>
          </button>

          <span aria-hidden="true" className="hidden sm:block w-px h-5 bg-white/[0.08] shrink-0" />

          {/* Interactive Mega-Dropdown Menus: HOME | FEATURES | APPS */}
          <nav aria-label="Studio Menus" className="flex items-center gap-0.5 xl:gap-1 shrink-0">
            {/* 1. HOME MEGA-DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => openDropdown('HOME')}
              onMouseLeave={scheduleCloseDropdown}
            >
              <button
                type="button"
                data-active={activeDropdown === 'HOME' ? 'true' : 'false'}
                style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
                aria-expanded={activeDropdown === 'HOME'}
                aria-haspopup="menu"
                onClick={() => toggleDropdown('HOME')}
                className={`nle-editorial-btn h-7 px-2 xl:px-2.5 rounded-[4px] border font-mono text-[10.5px] xl:text-[11px] font-semibold tracking-[0.09em] uppercase flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B] ${
                  activeDropdown === 'HOME'
                    ? 'bg-[#171820] border-[#F59E0B]/60 text-[#F4F4F5]'
                    : 'bg-transparent border-transparent text-zinc-300 hover:text-white hover:bg-[#14141A]'
                }`}
              >
                <span>HOME</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    activeDropdown === 'HOME' ? 'rotate-180 text-[#F59E0B]' : 'text-[#8E8E93]'
                  }`}
                />
              </button>

              {activeDropdown === 'HOME' && (
                <div
                  role="menu"
                  style={flyoutPanelStyle}
                  onMouseEnter={() => openDropdown('HOME')}
                  onMouseLeave={scheduleCloseDropdown}
                  className="absolute left-0 top-full mt-1.5 w-[312px] bg-[#0B0B0D]/96 border border-white/[0.07] rounded-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-1.5 z-[9999] font-mono"
                >
                  <div className="px-2.5 py-1.5 border-b border-white/[0.07] mb-1 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] uppercase text-[#8E8E93] tabular-nums">
                    <span>PROJECT &amp; VAULT</span>
                    <span className="text-[#F59E0B]">
                      {saveState === 'SAVING...' ? 'SAVING...' : isUnsavedOrSaving ? 'UNSAVED' : 'LOCAL OPFS'}
                    </span>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onNewProject) {
                        onNewProject();
                      } else {
                        eventBus.emit('project:new');
                      }
                      showNotice('New Anthology Project Ready');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FolderPlus className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">New Anthology Project</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      NEW
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onRestoreProjectJson) {
                        onRestoreProjectJson();
                      } else if (onOpenProjectManager) {
                        onOpenProjectManager();
                      } else {
                        eventBus.emit('studio:open_project_manager');
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FolderOpen className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Open / Import Project (.json)</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      JSON
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenProjectManager) onOpenProjectManager();
                      else eventBus.emit('studio:open_project_manager');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Database className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Project Vault Manager</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      IDB
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onSaveSnapshot) {
                        onSaveSnapshot();
                      } else {
                        eventBus.emit('project:save_snapshot');
                      }
                      showNotice('Snapshot Saved');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Save className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Save Snapshot</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      Ctrl+S
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onBatchImportMedia) {
                        onBatchImportMedia();
                      } else {
                        eventBus.emit('media:batch_import');
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <FolderInput className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Batch Import Media Folder</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      BATCH
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenR2Automation) onOpenR2Automation();
                      else eventBus.emit('studio:open_module', { module: 'R2_STORAGE' });
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Cloud className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Cloudflare R2 Edge Sync</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      R2
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleClearOpfsAction}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#8E8E93] hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors border-t border-white/[0.07] mt-1 pt-2 group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <RotateCcw className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Clear OPFS Cache &amp; Reset</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] group-hover:text-[#F59E0B] tabular-nums shrink-0">
                      PURGE
                    </kbd>
                  </button>

                  <div className="mt-1 pt-1 border-t border-white/[0.07] flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={handleHomeClick}
                      className="text-[10px] text-[#8E8E93] hover:text-[#F59E0B] flex items-center gap-1.5 py-1 px-1.5 rounded-[2px] cursor-pointer transition-colors"
                    >
                      <Home className="w-3 h-3" />
                      <span>Director Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDropdown(null);
                        if (onOpenManifesto) onOpenManifesto();
                        else eventBus.emit('walkthrough:open');
                      }}
                      className="text-[10px] text-[#8E8E93] hover:text-[#F4F4F5] py-1 px-1.5 rounded-[2px] cursor-pointer transition-colors"
                    >
                      Manifesto
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. FEATURES MEGA-DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => openDropdown('FEATURES')}
              onMouseLeave={scheduleCloseDropdown}
            >
              <button
                type="button"
                data-active={activeDropdown === 'FEATURES' ? 'true' : 'false'}
                style={{ '--item-accent': '#38BDF8' } as React.CSSProperties}
                aria-expanded={activeDropdown === 'FEATURES'}
                aria-haspopup="menu"
                onClick={() => toggleDropdown('FEATURES')}
                className={`nle-editorial-btn h-7 px-2 xl:px-2.5 rounded-[4px] border font-mono text-[10.5px] xl:text-[11px] font-semibold tracking-[0.09em] uppercase flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38BDF8] ${
                  activeDropdown === 'FEATURES'
                    ? 'bg-[#171820] border-[#38BDF8]/60 text-[#F4F4F5]'
                    : 'bg-transparent border-transparent text-zinc-300 hover:text-white hover:bg-[#14141A]'
                }`}
              >
                <span>FEATURES</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    activeDropdown === 'FEATURES' ? 'rotate-180 text-[#38BDF8]' : 'text-[#8E8E93]'
                  }`}
                />
              </button>

              {activeDropdown === 'FEATURES' && (
                <div
                  role="menu"
                  style={flyoutPanelStyle}
                  onMouseEnter={() => openDropdown('FEATURES')}
                  onMouseLeave={scheduleCloseDropdown}
                  className="absolute left-0 top-full mt-1.5 w-[316px] bg-[#0B0B0D]/96 border border-white/[0.07] rounded-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-1.5 z-[9999] font-mono"
                >
                  <div className="px-2.5 py-1.5 border-b border-white/[0.07] mb-1 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] uppercase text-[#8E8E93] tabular-nums">
                    <span>CINEMA ENGINES</span>
                    <span className="text-[#F59E0B]">24 / 60 FPS</span>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onTriggerHyperReelPack) {
                        onTriggerHyperReelPack();
                      } else {
                        handleWorkspacePanelSelect('SPLIT');
                        setTimeout(() => eventBus.emit('reels:pack_12s'), 60);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Flame className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">12s Hyper-Reel Auto-Packer</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] group-hover:text-[#F59E0B] tabular-nums shrink-0">
                      288F
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onTriggerBeatDropEngine) {
                        onTriggerBeatDropEngine();
                      } else {
                        handleWorkspacePanelSelect('SPLIT');
                        setTimeout(() => eventBus.emit('reels:toggle_beat_fx'), 60);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Zap className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Beat-Drop &amp; Flash-Cut Engine</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      2F FX
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onTriggerSmartCrop916) {
                        onTriggerSmartCrop916();
                      } else {
                        useStudioStore.getState().setAspectRatio('9:16');
                        handleWorkspacePanelSelect('SPLIT');
                        setTimeout(() => eventBus.emit('reels:smart_crop_916'), 60);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Crop className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">9:16 Smart Subject Auto-Crop</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      9:16
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenBloomSequencer) onOpenBloomSequencer();
                      else eventBus.emit('studio:open_bloom');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Bloom Interactive Sequencer</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      BLOOM
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenVideoScopes) onOpenVideoScopes();
                      else eventBus.emit('studio:open_scopes');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <BarChart2 className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Live IRE &amp; RGB Video Scopes</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      SCOPES
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleTriggerExport}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Film className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Deterministic Multi-Shot Exporter</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      ⌘E
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenShortcuts) onOpenShortcuts();
                      else eventBus.emit('shortcuts:open');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors border-t border-white/[0.07] mt-1 pt-2 group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Keyboard className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Keyboard Shortcuts Map</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#F59E0B] font-bold tabular-nums shrink-0">
                      ?
                    </kbd>
                  </button>
                </div>
              )}
            </div>

            {/* 3. APPS MEGA-DROPDOWN */}
            <div
              className="relative"
              onMouseEnter={() => openDropdown('APPS')}
              onMouseLeave={scheduleCloseDropdown}
            >
              <button
                type="button"
                data-active={activeDropdown === 'APPS' ? 'true' : 'false'}
                style={{ '--item-accent': '#A855F7' } as React.CSSProperties}
                aria-expanded={activeDropdown === 'APPS'}
                aria-haspopup="menu"
                onClick={() => toggleDropdown('APPS')}
                className={`nle-editorial-btn h-7 px-2 xl:px-2.5 rounded-[4px] border font-mono text-[10.5px] xl:text-[11px] font-semibold tracking-[0.09em] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A855F7] ${
                  activeDropdown === 'APPS'
                    ? 'bg-[#171820] border-[#A855F7]/60 text-[#F4F4F5]'
                    : 'bg-transparent border-transparent text-zinc-300 hover:text-white hover:bg-[#14141A]'
                }`}
              >
                <LayoutGrid className={`w-3.5 h-3.5 shrink-0 transition-colors ${activeDropdown === 'APPS' ? 'text-[#A855F7]' : 'text-[#F59E0B]'}`} />
                <span>APPS</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    activeDropdown === 'APPS' ? 'rotate-180 text-[#A855F7]' : 'text-[#8E8E93]'
                  }`}
                />
              </button>

              {activeDropdown === 'APPS' && (
                <div
                  role="menu"
                  style={flyoutPanelStyle}
                  onMouseEnter={() => openDropdown('APPS')}
                  onMouseLeave={scheduleCloseDropdown}
                  className="absolute left-0 top-full mt-1.5 w-[304px] bg-[#0B0B0D]/96 border border-white/[0.07] rounded-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-1.5 z-[9999] font-mono"
                >
                  <div className="px-2.5 py-1.5 border-b border-white/[0.07] mb-1 flex items-center justify-between text-[9px] font-bold tracking-[0.12em] uppercase text-[#8E8E93] tabular-nums">
                    <span>STUDIO LABS &amp; APPS</span>
                    <span className="text-[#F59E0B]">READY</span>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenRecorder) onOpenRecorder();
                      else eventBus.emit('recorder:open');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Video className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Screen &amp; Audio Recorder</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      Alt+R
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenAiStudio) onOpenAiStudio();
                      else setIsAIForgeOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">AI Shot Prompt Generator</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] group-hover:text-[#F59E0B] tabular-nums shrink-0">
                      AI
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenColorLab) {
                        onOpenColorLab();
                      } else {
                        eventBus.emit('studio:open_module', { module: 'OPTICS' });
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Palette className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Color LUT &amp; Halation Lab</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      LUT
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenAudioAnalyzer) {
                        onOpenAudioAnalyzer();
                      } else if (onOpenRapSync) {
                        onOpenRapSync();
                      } else {
                        eventBus.emit('studio:open_module', { module: 'SOUND' });
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <AudioWaveform className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Audio Beat &amp; Waveform Analyzer</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      DSP
                    </kbd>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveDropdown(null);
                      if (onOpenDiagnostics) onOpenDiagnostics();
                      else eventBus.emit('diagnostics:open');
                    }}
                    className="w-full px-2.5 py-2 rounded-[3px] text-left hover:bg-[#141417] text-[#F4F4F5]/90 hover:text-[#F4F4F5] flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Cpu className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-[#F59E0B] shrink-0 transition-colors" />
                      <span className="text-[11px] font-semibold truncate">Hardware Diagnostics Self-Test</span>
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded-[2px] bg-[#141417] border border-white/[0.07] text-[9px] text-[#8E8E93] tabular-nums shrink-0">
                      TEST
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDropdown(null);
                      setIsAppsModalOpen(true);
                    }}
                    className="w-full mt-1 pt-2 px-2.5 py-1.5 border-t border-white/[0.07] text-[10px] text-[#8E8E93] hover:text-[#F59E0B] flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <LayoutGrid className="w-3 h-3" />
                      <span>All 28 Ecosystem Apps</span>
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* ================================================================
            CENTER ZONE: Editorial 5-Tab Workspace Switcher (STAGE..MONITOR)
            ================================================================ */}
        <div
          role="tablist"
          aria-label="Workspace Switcher"
          className="hidden md:flex items-center bg-[#0B0B0D] border border-white/[0.08] rounded-[7px] p-[3px] gap-1 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
        >
          {WORKSPACE_TABS.map((tab) => {
            const isActive = currentView === 'STUDIO' && currentPanel === tab.panel;
            const TabIcon = tab.icon;

            return (
              <div key={tab.id} className="relative">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-active={isActive ? 'true' : 'false'}
                  style={{
                    '--item-accent': tab.accentHex,
                    borderColor: isActive ? tab.accentHex : `${tab.accentHex}33`,
                    boxShadow: isActive
                      ? `0 0 14px ${tab.accentHex}3D, inset 0 1px 0 rgba(255,255,255,0.12)`
                      : undefined
                  } as React.CSSProperties}
                  onClick={() => handleWorkspacePanelSelect(tab.panel)}
                  title={tab.title}
                  className={`nle-editorial-btn studio-workspace-tab relative group/tab h-[32px] px-2 xl:px-2.5 2xl:px-3 rounded-[5px] border font-mono text-[9.5px] xl:text-[10px] 2xl:text-[10.5px] tracking-[0.09em] uppercase whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B] ${
                    isActive
                      ? 'bg-[#191A22] text-white font-bold'
                      : 'bg-[#121318] text-zinc-300 hover:text-white font-semibold'
                  }`}
                >
                  {/* Inner subtle radial glow */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[4px] overflow-hidden pointer-events-none"
                  >
                    <span
                      style={{
                        background: `radial-gradient(circle at 30% 50%, ${tab.accentHex}29 0%, transparent 72%)`
                      }}
                      className={`absolute inset-0 transition-opacity duration-200 ${
                        isActive ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-75'
                      }`}
                    />
                  </span>

                  <TabIcon
                    style={{ color: tab.accentHex }}
                    className="relative z-10 w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/tab:scale-110"
                  />

                  <span className="relative z-10 leading-none">
                    {tab.label}
                  </span>

                  {/* Active bottom accent edge bar */}
                  <span
                    aria-hidden="true"
                    style={{
                      backgroundColor: tab.accentHex,
                      boxShadow: isActive ? `0 0 10px ${tab.accentHex}` : undefined
                    }}
                    className={`absolute bottom-0 inset-x-1.5 h-[2px] rounded-t-full pointer-events-none transition-opacity duration-150 ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-50'
                    }`}
                  />

                  {/* Micro Hover Shortcut Hint [1]..[5] */}
                  <span
                    aria-hidden="true"
                    style={{ color: tab.accentHex }}
                    className="pointer-events-none opacity-0 group-hover/tab:opacity-100 transition-opacity duration-150 absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-[3px] bg-[#0B0B0D]/95 border border-white/[0.1] text-[9px] font-mono font-bold tabular-nums whitespace-nowrap z-[9999] shadow-xl"
                  >
                    [{tab.shortcut}] · Alt+{tab.shortcut}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Cockpit Telemetry Portal Drawer (z-[9999]) */}
          {isCockpitHudOpen &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                ref={cockpitDrawerRef}
                onMouseDown={(e) => e.stopPropagation()}
                style={
                  cockpitDrawerPos
                    ? {
                        top: `${cockpitDrawerPos.top}px`,
                        left: `${cockpitDrawerPos.left}px`,
                        zIndex: 9999,
                        backdropFilter: 'blur(16px)'
                      }
                    : { zIndex: 9999, backdropFilter: 'blur(16px)' }
                }
                className="fixed top-12 left-72 w-80 sm:w-[356px] max-h-[82vh] overflow-y-auto bg-[#0B0B0D]/96 border border-white/[0.07] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-4 rounded-[4px] z-[9999] font-mono text-xs text-[#F4F4F5] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[#8E8E93]">
                    DIRECTOR&apos;S COCKPIT BRIDGE
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] border bg-[#141417] border-white/[0.07] text-[#F59E0B] tabular-nums">
                    {resolvedCockpitStats.isTauriActive ? 'TAURI NATIVE IPC' : 'OFFLINE READY'}
                  </span>
                </div>

                {/* 10x10 Modular Reel Engine Quick-Jump */}
                <div className="space-y-1.5 pb-2 border-b border-white/[0.07]">
                  <div className="flex items-center justify-between text-[9px] font-bold tracking-wider uppercase tabular-nums">
                    <span className="text-[#8E8E93]">
                      10×10 MODULAR REEL (
                      {reelLoopActive
                        ? `REEL ${String(activeReelIndex + 1).padStart(2, '0')} · ${activeReelIndex * 10 + 1}-${Math.min(frames.length || 100, activeReelIndex * 10 + 10)}`
                        : 'MASTER 100'}
                      )
                    </span>
                    <button
                      type="button"
                      onClick={() => setReelLoopActive(!reelLoopActive)}
                      className={`px-1.5 py-0.5 rounded-[2px] border text-[9px] cursor-pointer transition-colors ${
                        !reelLoopActive
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                          : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {reelLoopActive ? 'MASTER ALL' : 'REEL LOOP ON'}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1 tabular-nums">
                    {Array.from({ length: 10 }, (_, rIdx) => {
                      const isSelected = reelLoopActive && activeReelIndex === rIdx;
                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onClick={() => {
                            selectReel(rIdx);
                            setRenderScope('reel');
                            eventBus.emit('studio:jump_to_shot', { shotIndex: rIdx * 10 });
                          }}
                          className={`py-1 rounded-[2px] text-[10px] font-bold border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                              : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/50'
                          }`}
                        >
                          R{String(rIdx + 1).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Project Manifest Stats */}
                <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                  <div className="p-2 rounded-[3px] bg-[#141417] border border-white/[0.07]">
                    <div className="text-[9px] text-[#8E8E93] uppercase">TOTAL SHOTS</div>
                    <div className="text-sm font-bold text-[#F4F4F5]">{resolvedCockpitStats.totalShots}</div>
                  </div>
                  <div className="p-2 rounded-[3px] bg-[#141417] border border-white/[0.07]">
                    <div className="text-[9px] text-[#8E8E93] uppercase">ACTIVE LIGHTS</div>
                    <div className="text-sm font-bold text-[#F59E0B]">
                      {resolvedCockpitStats.activeLightsCount} RIGS
                    </div>
                  </div>
                  <div className="p-2 rounded-[3px] bg-[#141417] border border-white/[0.07]">
                    <div className="text-[9px] text-[#8E8E93] uppercase">MASTER AUDIO</div>
                    <div className="text-xs font-bold text-[#F4F4F5] truncate">
                      {resolvedCockpitStats.audioSynced
                        ? `SYNCED · ${resolvedCockpitStats.audioTrackName || 'TRACK'}`
                        : 'STANDBY / UNROUTED'}
                    </div>
                  </div>
                  <div className="p-2 rounded-[3px] bg-[#141417] border border-white/[0.07]">
                    <div className="text-[9px] text-[#8E8E93] uppercase">SEQUENCE RUNTIME</div>
                    <div className="text-sm font-bold text-[#F4F4F5]">
                      {resolvedCockpitStats.totalDurationSec.toFixed(1)}s
                    </div>
                  </div>
                </div>

                {/* Offline Render & Export Engine */}
                {(() => {
                  const totalCount = Math.max(1, frames.length || 100);
                  const scopeStartIdx =
                    renderScope === 'reel' ? Math.min(totalCount - 1, activeReelIndex * 10) : 0;
                  const scopeEndIdx =
                    renderScope === 'reel'
                      ? Math.min(totalCount - 1, scopeStartIdx + 9)
                      : totalCount - 1;
                  const scopedSlice = frames.slice(scopeStartIdx, scopeEndIdx + 1);
                  const buildScopedBridgeShots = (): CockpitShotBridge[] =>
                    scopedSlice.map((f, localIdx) => {
                      const absIdx = scopeStartIdx + localIdx;
                      return {
                        shotId: `shot_${String(absIdx + 1).padStart(2, '0')}`,
                        shotNumber: String(absIdx + 1).padStart(2, '0'),
                        titleEn: f.title || `Shot ${absIdx + 1}`,
                        titleBn: f.bengaliTitle || '',
                        personality: 'KINETIC',
                        inPoint: 0,
                        outPoint: f.durationSec || f.slideHoldSec || 12.0,
                        durationSec: f.durationSec || f.slideHoldSec || 12.0,
                        mediaUrl: f.videoSrc || f.imageUrl,
                        lutFilter: f.lutFilter,
                        lensSpec: f.cameraSpec?.focalLength,
                        directorNotes: f.directorNotes,
                        lightId: f.lightId,
                        lightName: f.lightId ? getLightingPresetById(f.lightId)?.name : undefined
                      };
                    });

                  const runOfflineVideoRender = async (format: 'mp4' | 'vp9' | 'png') => {
                    if (isRenderingOffline) return;
                    const controller = new AbortController();
                    renderAbortRef.current = controller;
                    setIsRenderingOffline(true);
                    setRenderTelemetry({
                      currentShotIndex: 1,
                      totalShots: Math.max(1, scopeEndIdx - scopeStartIdx + 1),
                      currentFrameNum: 0,
                      totalFrames: Math.max(1, scopeEndIdx - scopeStartIdx + 1),
                      percent: 1,
                      fps: 24,
                      statusText: `RENDERING SHOT 01/${String(Math.max(1, scopeEndIdx - scopeStartIdx + 1)).padStart(2, '0')}...`
                    });
                    try {
                      const pipelineOpts = {
                        projectTitle:
                          renderScope === 'reel'
                            ? `REEL_${String(activeReelIndex + 1).padStart(2, '0')}`
                            : 'MASTER_100',
                        frames,
                        shotMediaMap,
                        totalSlides: totalCount,
                        selectionMode: 'range' as const,
                        rangeStart: scopeStartIdx + 1,
                        rangeEnd: scopeEndIdx + 1,
                        resolutionPreset: '1080p_standard' as const,
                        bitrateProfile: 'broadcast' as const,
                        burnInTitles: true,
                        cleanPlates: false,
                        simulateFlare: true,
                        includeAudio: true,
                        onProgress: (t: RenderTelemetry) => setRenderTelemetry(t),
                        onWarning: (msg: string) => setCockpitFeedback(msg),
                        abortSignal: controller.signal
                      };
                      if (format === 'mp4') {
                        const res = await exportCinemaMasterMp4(pipelineOpts);
                        triggerBrowserDownload(res.blob, res.filename, res.blob.type || 'video/mp4');
                        setCockpitFeedback(`EXPORTED ${res.filename}`);
                      } else if (format === 'vp9') {
                        const res = await exportCinemaMasterVp9(pipelineOpts);
                        triggerBrowserDownload(res.blob, res.filename, 'video/webm');
                        setCockpitFeedback(`EXPORTED ${res.filename}`);
                      } else {
                        const res = await exportPngSequenceZip({ ...pipelineOpts, framesPerShot: 1 });
                        triggerBrowserDownload(res.blob, res.filename, 'application/zip');
                        setCockpitFeedback(`EXPORTED ${res.frameCount} PNG FRAMES`);
                      }
                      setTimeout(() => setCockpitFeedback(null), 5000);
                    } catch (err: any) {
                      setCockpitFeedback(
                        err?.message?.includes('cancelled')
                          ? 'RENDER CANCELLED'
                          : `RENDER NOTICE: ${err?.message || 'Fallback ready'}`
                      );
                      setTimeout(() => setCockpitFeedback(null), 4000);
                    } finally {
                      setIsRenderingOffline(false);
                      renderAbortRef.current = null;
                      setRenderTelemetry(null);
                    }
                  };

                  return (
                    <div className="pt-2 border-t border-white/[0.07] space-y-2 tabular-nums">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase text-[#8E8E93]">
                          OFFLINE RENDER PIPELINE
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRenderScope('reel')}
                            className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border cursor-pointer transition-colors ${
                              renderScope === 'reel'
                                ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                                : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                            }`}
                          >
                            REEL {String(activeReelIndex + 1).padStart(2, '0')} (10)
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenderScope('master')}
                            className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold border cursor-pointer transition-colors ${
                              renderScope === 'master'
                                ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                                : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                            }`}
                          >
                            MASTER ({totalCount})
                          </button>
                        </div>
                      </div>

                      {isRenderingOffline && renderTelemetry && (
                        <div className="p-2 rounded-[3px] bg-[#141417] border border-[#F59E0B]/50 space-y-1.5 tabular-nums">
                          <div className="flex items-center justify-between text-[9px] font-bold text-[#F59E0B]">
                            <span className="truncate pr-2">
                              {`RENDERING SHOT ${String(renderTelemetry.currentShotIndex).padStart(2, '0')}/${String(renderTelemetry.totalShots).padStart(2, '0')}...`}
                            </span>
                            <button
                              type="button"
                              onClick={() => renderAbortRef.current?.abort()}
                              className="text-[#8E8E93] hover:text-[#F4F4F5] underline shrink-0 cursor-pointer"
                            >
                              ABORT
                            </button>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#0B0B0D] overflow-hidden">
                            <div
                              className="h-full bg-[#F59E0B] transition-all duration-150"
                              style={{ width: `${Math.max(4, Math.min(100, renderTelemetry.percent))}%` }}
                            />
                          </div>
                          <div className="text-[8.5px] text-[#8E8E93] truncate">
                            {renderTelemetry.statusText}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          disabled={isRenderingOffline}
                          onClick={() => runOfflineVideoRender('mp4')}
                          className="px-2 py-1.5 rounded-[2px] bg-[#141417] hover:bg-[#1B1B20] disabled:opacity-40 border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          MP4
                        </button>
                        <button
                          type="button"
                          disabled={isRenderingOffline}
                          onClick={() => runOfflineVideoRender('vp9')}
                          className="px-2 py-1.5 rounded-[2px] bg-[#141417] hover:bg-[#1B1B20] disabled:opacity-40 border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          VP9 WEBM
                        </button>
                        <button
                          type="button"
                          disabled={isRenderingOffline}
                          onClick={() => runOfflineVideoRender('png')}
                          className="px-2 py-1.5 rounded-[2px] bg-[#141417] hover:bg-[#1B1B20] disabled:opacity-40 border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          PNG SEQ
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const bridgeShots = buildScopedBridgeShots();
                            const xml = generatePremiereXml(bridgeShots, null, {
                              fps: 24,
                              projectName:
                                renderScope === 'reel'
                                  ? `HANDFILM_REEL_${String(activeReelIndex + 1).padStart(2, '0')}`
                                  : 'HANDFILM_MASTER_100'
                            });
                            triggerBrowserDownload(
                              xml,
                              `HANDFILM_${renderScope === 'reel' ? `REEL_${String(activeReelIndex + 1).padStart(2, '0')}` : 'MASTER'}_Premiere.xml`,
                              'application/xml'
                            );
                            setCockpitFeedback('PREMIERE XMEML EXPORTED');
                            setTimeout(() => setCockpitFeedback(null), 4000);
                          }}
                          className="px-2 py-1.5 rounded-[2px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          PREMIERE XML
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const bridgeShots = buildScopedBridgeShots();
                            const json = generateCapCutDraftJson(bridgeShots, null, {
                              fps: 24,
                              projectName:
                                renderScope === 'reel'
                                  ? `HANDFILM_REEL_${String(activeReelIndex + 1).padStart(2, '0')}`
                                  : 'HANDFILM_MASTER_100'
                            });
                            triggerBrowserDownload(
                              json,
                              `draft_content_${renderScope === 'reel' ? `R${String(activeReelIndex + 1).padStart(2, '0')}` : 'MASTER'}.json`,
                              'application/json'
                            );
                            setCockpitFeedback('CAPCUT DRAFT JSON EXPORTED');
                            setTimeout(() => setCockpitFeedback(null), 4000);
                          }}
                          className="px-2 py-1.5 rounded-[2px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] cursor-pointer transition-colors"
                        >
                          CAPCUT JSON
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {cockpitFeedback && (
                  <div className="px-2.5 py-1.5 rounded-[3px] bg-[#F59E0B]/15 border border-[#F59E0B]/50 text-[10px] font-bold text-[#F59E0B] tabular-nums">
                    {cockpitFeedback}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentView === 'HOME') {
                        eventBus.emit('cockpit:action', { type: 'nle_xml' });
                      } else {
                        const bridgeShots: CockpitShotBridge[] = frames.map((f, idx) => ({
                          shotId: `shot_${String(idx + 1).padStart(2, '0')}`,
                          shotNumber: String(idx + 1).padStart(2, '0'),
                          titleEn: f.title || `Shot ${idx + 1}`,
                          titleBn: f.bengaliTitle || '',
                          personality: 'KINETIC',
                          inPoint: 0,
                          outPoint: f.durationSec || f.slideHoldSec || 12.0,
                          durationSec: f.durationSec || f.slideHoldSec || 12.0,
                          mediaUrl: f.videoSrc || f.imageUrl,
                          lutFilter: f.lutFilter,
                          lensSpec: f.cameraSpec?.focalLength,
                          directorNotes: f.directorNotes,
                          lightId: f.lightId,
                          lightName: f.lightId ? getLightingPresetById(f.lightId)?.name : undefined
                        }));
                        const xml = generateNLETimelineXML(bridgeShots, null, {
                          fps: 24,
                          projectName: 'HANDFILM_SEQUENCE'
                        });
                        triggerBrowserDownload(
                          xml,
                          `HANDFILM_SEQUENCE_${Date.now()}.fcpxml`,
                          'application/xml'
                        );
                        setCockpitFeedback('FCPXML exported');
                        setTimeout(() => setCockpitFeedback(null), 4000);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                  >
                    <span>FCPXML v1.9</span>
                    <span className="text-[9px] text-[#8E8E93]">ALL SHOTS</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (currentView === 'HOME') {
                        eventBus.emit('cockpit:action', { type: 'capcut_pack' });
                      } else {
                        const bridgeShots: CockpitShotBridge[] = frames.map((f, idx) => ({
                          shotId: `shot_${String(idx + 1).padStart(2, '0')}`,
                          shotNumber: String(idx + 1).padStart(2, '0'),
                          titleEn: f.title || `Shot ${idx + 1}`,
                          titleBn: f.bengaliTitle || '',
                          personality: 'KINETIC',
                          inPoint: 0,
                          outPoint: f.durationSec || f.slideHoldSec || 12.0,
                          durationSec: f.durationSec || f.slideHoldSec || 12.0,
                          mediaUrl: f.videoSrc || f.imageUrl,
                          lutFilter: f.lutFilter,
                          lensSpec: f.cameraSpec?.focalLength,
                          directorNotes: f.directorNotes,
                          lightId: f.lightId,
                          lightName: f.lightId ? getLightingPresetById(f.lightId)?.name : undefined
                        }));
                        const zipBlob = await buildCapCutQuickPackZip(bridgeShots, null, null, {
                          fps: 24,
                          projectName: 'HANDFILM_REEL'
                        });
                        triggerBrowserDownload(
                          zipBlob,
                          `HANDFILM_CapCut_Pack_${Date.now()}.zip`,
                          'application/zip'
                        );
                        setCockpitFeedback('CapCut Pack exported');
                        setTimeout(() => setCockpitFeedback(null), 4000);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                  >
                    <span>CAPCUT PACK</span>
                    <span className="text-[9px] text-[#8E8E93]">JSON + SHEET</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (currentView === 'HOME') {
                        eventBus.emit('cockpit:action', { type: 'freeze_all' });
                      } else {
                        const activeCanvas = document.querySelector('canvas');
                        const bridgeShots: CockpitShotBridge[] = frames.slice(0, 14).map((f, idx) => ({
                          shotId: `shot_${String(idx + 1).padStart(2, '0')}`,
                          shotNumber: String(idx + 1).padStart(2, '0'),
                          titleEn: f.title || `Shot ${idx + 1}`,
                          titleBn: f.bengaliTitle || '',
                          personality: 'KINETIC',
                          inPoint: 0,
                          outPoint: f.durationSec || f.slideHoldSec || 12.0,
                          durationSec: f.durationSec || f.slideHoldSec || 12.0
                        }));
                        const res = await freezeAllShotFrames(bridgeShots, () =>
                          activeCanvas ? activeCanvas.toDataURL('image/png', 1.0) : null
                        );
                        setCockpitFeedback(res.message);
                        setTimeout(() => setCockpitFeedback(null), 4000);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-[3px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                  >
                    <span>FREEZE ALL FRAMES</span>
                    <span className="text-[9px] text-[#8E8E93]">LOSSLESS PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCockpitHudOpen(false);
                      eventBus.emit('cockpit:action', { type: 'open_modal' });
                    }}
                    className="w-full px-3 py-1.5 rounded-[3px] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/60 text-[#F4F4F5] font-bold text-[10px] text-center cursor-pointer transition-colors"
                  >
                    OPEN FULL INTERCHANGE HUB
                  </button>
                </div>

                {/* Telemetry & Spectral Overlay Toggles */}
                <div className="pt-2 border-t border-white/[0.07] space-y-1.5">
                  <div className="text-[9px] font-bold tracking-wider uppercase text-[#8E8E93]">
                    TELEMETRY &amp; SPECTRAL HUD LAYERS
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => eventBus.emit('cockpit:toggle_telemetry')}
                      className={`w-full px-2.5 py-1.5 rounded-[2px] border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        isTelemetryLayerOn
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F4F4F5]'
                          : 'bg-[#141417] border-white/[0.07] hover:border-white/20 text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span>MODULAR TELEMETRY RACK</span>
                      <span className={isTelemetryLayerOn ? 'text-[#F59E0B]' : 'text-[#8E8E93]'}>
                        {isTelemetryLayerOn ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => eventBus.emit('cockpit:toggle_spectrum')}
                      className={`w-full px-2.5 py-1.5 rounded-[2px] border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        isSpectrumLayerOn
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F4F4F5]'
                          : 'bg-[#141417] border-white/[0.07] hover:border-white/20 text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span>SPECTRAL ENERGY ANALYZER</span>
                      <span className={isSpectrumLayerOn ? 'text-[#F59E0B]' : 'text-[#8E8E93]'}>
                        {isSpectrumLayerOn ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => eventBus.emit('cockpit:toggle_zoom')}
                      className={`w-full px-2.5 py-1.5 rounded-[2px] border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        isZoomHudLayerOn
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F4F4F5]'
                          : 'bg-[#141417] border-white/[0.07] hover:border-white/20 text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span>MULTI-LAYER PARALLAX ZOOM</span>
                      <span className={isZoomHudLayerOn ? 'text-[#F59E0B]' : 'text-[#8E8E93]'}>
                        {isZoomHudLayerOn ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </div>

        {/* ================================================================
            RIGHT ZONE: Search, Telemetry, STUDIO, Export, Record & 3-Dots Menu
            ================================================================ */}
        <div className="flex items-center gap-1.5 xl:gap-2 min-w-0">
          {/* Brief inline feedback notice when snapshot/cache action completes */}
          {headerNotice && (
            <span className="hidden 2xl:inline-flex items-center gap-1 text-[10px] font-mono text-[#F59E0B] whitespace-nowrap shrink-0">
              <Check className="w-3 h-3" />
              <span>{headerNotice}</span>
            </span>
          )}

          {/* 1. Compact Command Search (Cmd+K / /) */}
          <div ref={searchContainerRef} className="relative shrink-0">
            <div className="relative flex items-center h-8 w-28 sm:w-32 xl:w-36 2xl:w-48 bg-[#141417] border border-white/[0.07] hover:border-white/20 focus-within:border-[#F59E0B]/70 rounded-full px-2.5 gap-1.5 transition-colors">
              <Search className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Command Search"
                value={globalSearchQuery}
                onChange={(e) => {
                  setGlobalSearchQuery(e.target.value);
                  setSearchHighlightIdx(0);
                  if (!isGlobalSearchOpen) setIsGlobalSearchOpen(true);
                }}
                onFocus={() => {
                  setActiveDropdown(null);
                  setIsGlobalSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search shots, tools..."
                className="w-full min-w-0 bg-transparent text-[10.5px] font-mono text-[#F4F4F5] placeholder:text-[#8E8E93] focus:outline-none"
              />
              {globalSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-[#8E8E93] hover:text-[#F4F4F5] p-0.5 cursor-pointer shrink-0"
                  title="Clear Search"
                  aria-label="Clear Search"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="hidden xl:inline-flex items-center text-[9px] font-mono text-[#8E8E93] border border-white/[0.07] bg-[#0B0B0D] rounded-[3px] px-1 py-0 pointer-events-none tabular-nums shrink-0">
                  ⌘K
                </kbd>
              )}
            </div>

            {isGlobalSearchOpen && (
              <div
                style={flyoutPanelStyle}
                className="absolute top-full right-0 mt-1.5 w-80 sm:w-[420px] max-h-[460px] overflow-y-auto bg-[#0B0B0D]/96 border border-white/[0.07] rounded-[4px] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-2 space-y-1.5 z-[9999] font-mono text-xs select-none"
              >
                <div className="flex flex-col gap-1.5 px-1 pb-1.5 border-b border-white/[0.07]">
                  <div className="flex items-center justify-between text-[9px] text-[#8E8E93] uppercase tracking-widest px-0.5">
                    <span className="font-bold">COMMAND SEARCH · SHOTS / LENS / TOOLS</span>
                    <span className="text-[#F59E0B] font-bold tabular-nums">
                      {globalSearchQuery ? `${unifiedSearchResults.length} FOUND` : 'QUICK JUMP'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 pt-0.5">
                    {(['ALL', 'SHOTS', 'TOOLS', 'APPS'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setSearchFilterTab(tab);
                          setSearchHighlightIdx(0);
                        }}
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-[2px] tracking-wider uppercase transition-colors cursor-pointer border ${
                          searchFilterTab === tab
                            ? 'bg-[#F59E0B]/15 text-[#F4F4F5] border-[#F59E0B]/60'
                            : 'bg-[#141417] text-[#8E8E93] border-white/[0.07] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="py-1 space-y-0.5">
                  {unifiedSearchResults.length === 0 ? (
                    <div className="p-5 text-center text-[#8E8E93] text-xs font-mono space-y-2">
                      <p>No results match &ldquo;{globalSearchQuery}&rdquo;</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGlobalSearchOpen(false);
                          setIsAppsModalOpen(true);
                        }}
                        className="text-[10px] text-[#F59E0B] hover:underline font-bold cursor-pointer"
                      >
                        Browse All 28 Ecosystem Apps
                      </button>
                    </div>
                  ) : (
                    unifiedSearchResults.map((item, idx) => {
                      const isSelected = idx === searchHighlightIdx;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          onMouseEnter={() => setSearchHighlightIdx(idx)}
                          className={`w-full px-2.5 py-2 rounded-[3px] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-[#141417] border-[#F59E0B]/50 text-[#F4F4F5]'
                              : 'bg-transparent border-transparent text-[#F4F4F5]/85 hover:bg-[#141417]/70'
                          }`}
                        >
                          <div className="shrink-0 flex items-center justify-center">
                            {item.type === 'shot' ? (
                              item.thumbnailUrl ? (
                                <div className="w-9 h-7 rounded-[2px] overflow-hidden border border-white/[0.07] bg-[#0B0B0D] shrink-0">
                                  <img
                                    src={item.thumbnailUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-7 rounded-[2px] border border-white/[0.07] flex items-center justify-center bg-[#141417] text-[9px] font-mono text-[#F59E0B] font-bold tabular-nums">
                                  #{String((item.shotIndex ?? 0) + 1).padStart(2, '0')}
                                </div>
                              )
                            ) : item.type === 'panel' ? (
                              <div className="w-8 h-7 rounded-[2px] border border-white/[0.07] bg-[#141417] flex items-center justify-center text-[#8E8E93]">
                                <LayoutGrid className="w-3.5 h-3.5" />
                              </div>
                            ) : item.type === 'studio-tool' ? (
                              <div className="w-8 h-7 rounded-[2px] border border-[#F59E0B]/30 bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-8 h-7 rounded-[2px] border border-white/[0.07] bg-[#141417] flex items-center justify-center text-[#8E8E93]">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[11px] truncate">{item.title}</span>
                              <span
                                className={`text-[8px] px-1.5 py-0.2 rounded-[2px] border font-semibold uppercase tracking-wider tabular-nums shrink-0 ${
                                  item.badgeColor || 'text-[#8E8E93] bg-[#141417] border-white/[0.07]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            </div>
                            <p className="text-[9.5px] text-[#8E8E93] truncate mt-0.5">{item.sub}</p>
                          </div>

                          <span className="text-[9px] text-[#8E8E93] shrink-0">↵</span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 border-t border-white/[0.07] flex items-center justify-between px-2 text-[9px] text-[#8E8E93] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGlobalSearchOpen(false);
                      setIsAppsModalOpen(true);
                    }}
                    className="text-[#F59E0B] hover:underline font-bold tracking-wider uppercase cursor-pointer"
                  >
                    VIEW ALL 28 APPS
                  </button>
                  <span>[ESC] CLOSE · [/] FOCUS</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Live Engine Telemetry (visible on wider desktops 2xl+) */}
          <div
            className="hidden 2xl:flex h-7 px-2 rounded-full bg-[#141417] border border-white/[0.07] items-center gap-1.5 font-mono text-[9.5px] tabular-nums whitespace-nowrap shrink-0"
            title={`Engine Telemetry: ${resolvedFps} FPS · ${resolvedAspectRatio} · ${vaultClipCount} Clips in Vault/OPFS`}
          >
            <span className="text-[#F4F4F5] font-semibold">{resolvedFps} FPS</span>
            <span aria-hidden="true" className="text-[#8E8E93]">·</span>
            <span className="text-[#F59E0B] font-semibold">{resolvedAspectRatio}</span>
            <span aria-hidden="true" className="text-[#8E8E93]">·</span>
            <span className="text-[#8E8E93] font-semibold">
              {vaultClipCount} {vaultClipCount === 1 ? 'CLIP' : 'CLIPS'}
            </span>
          </div>

          {/* 3. STUDIO Red Pill Button (Enters Studio from Home; toggles Focus Mode in Studio) */}
          <button
            type="button"
            data-transport-sharp="true"
            aria-pressed={currentView === 'STUDIO' ? isZenMode : false}
            onClick={handleStudioOrFocusToggle}
            style={{ '--item-accent': '#E50914' } as React.CSSProperties}
            title={
              currentView === 'HOME'
                ? 'Enter Active Cinema Studio'
                : isZenMode
                ? 'Focus Mode Active — Click to Restore Side Rail & Dock (Z)'
                : 'STUDIO — Click to Toggle Focus Mode (Z)'
            }
            className={`nle-editorial-btn h-8 px-3.5 rounded-full font-mono text-[10.5px] font-black tracking-[0.12em] uppercase flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E50914] ${
              currentView === 'STUDIO' && isZenMode
                ? 'bg-[#E50914] border border-red-400 text-white shadow-[0_0_16px_rgba(229,9,20,0.65)]'
                : 'bg-[#E50914]/90 hover:bg-[#E50914] border border-red-500/70 text-white shadow-[0_0_12px_rgba(229,9,20,0.4)]'
            }`}
          >
            {currentView === 'STUDIO' && isZenMode && (
              <Minimize2 className="w-3 h-3 text-white shrink-0" />
            )}
            <span>STUDIO</span>
          </button>

          {/* 4. Circular Golden Export Action Button */}
          <button
            type="button"
            data-transport-sharp="true"
            onClick={handleTriggerExport}
            aria-label="Export Master Render"
            title="Open Unified Render & Export Studio (⌘E)"
            style={{ '--item-accent': '#F59E0B' } as React.CSSProperties}
            className="nle-editorial-btn w-8 h-8 rounded-full bg-[#18150D] hover:bg-[#F59E0B] border border-[#F59E0B]/55 text-[#F59E0B] hover:text-[#0B0B0D] flex items-center justify-center shrink-0 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.25)]"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* 5. Circular Screen & Audio Record Button (Crimson Red reserved strictly for Record trigger) */}
          <button
            type="button"
            data-transport-sharp="true"
            onClick={() => {
              setActiveDropdown(null);
              if (onOpenRecorder) onOpenRecorder();
              else eventBus.emit('recorder:open');
            }}
            aria-label="Screen and Audio Recorder"
            title="Screen & Audio Recorder Studio (Alt+R)"
            style={{ '--item-accent': '#E50914' } as React.CSSProperties}
            className="nle-editorial-btn w-8 h-8 rounded-full bg-[#141417] hover:bg-[#E50914]/15 border border-white/[0.1] hover:border-[#E50914]/75 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E50914]"
          >
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full bg-[#E50914] shadow-[0_0_8px_rgba(229,9,20,0.85)]"
            />
          </button>

          {/* 6. Three-Dots Whole Overflow Workspace Dropdown Menu */}
          <OverflowSettingsMenu
            onOpenCompile={() => setIsCompileModalOpen(true)}
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
              else setIsInspectorDrawerOpen((prev) => !prev);
            }}
            onOpenCacheManager={() => {
              if (onOpenCacheManager) onOpenCacheManager();
              else setIsCacheManagerOpen(true);
            }}
            onOpenExport={handleTriggerExport}
            onOpenExportXml={() => eventBus.emit('export:xml')}
            onOpenExportFcpxml={() => eventBus.emit('export:fcpxml')}
            onOpenProjectStats={() => {
              if (onOpenProjectStats) onOpenProjectStats();
              else eventBus.emit('stats:open');
            }}
            onOpenShortcuts={() => {
              if (onOpenShortcuts) onOpenShortcuts();
              else eventBus.emit('shortcuts:open');
            }}
            closeTriggerKey={`${currentView}-${currentPanel}`}
          />
        </div>
      </header>

      {/* Hardware-Accelerated CSS Cross-Dissolve Veil between STAGE, REELS, and SCRUB */}
      {dissolvePulseId > 0 && (
        <div
          key={dissolvePulseId}
          className="fixed top-12 inset-x-0 bottom-0 z-40 pointer-events-none bg-gradient-to-b from-[#F59E0B]/[0.06] via-[#0B0B0D]/60 to-[#0B0B0D]/80 flex items-start justify-center pt-5 animate-workspace-dissolve-veil transition-opacity duration-200 transform-gpu will-change-[opacity,transform] motion-reduce:hidden"
          aria-hidden="true"
        >
          {dissolveModeLabel && (
            <span className="px-3 py-1 rounded-[3px] bg-[#0B0B0D]/90 border border-[#F59E0B]/40 text-[10px] font-mono font-bold tracking-[0.25em] text-[#F59E0B] uppercase shadow-lg">
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
        shotMediaMap={shotMediaMap}
        currentIndex={currentIndex}
      />
      <EcosystemGridModal
        isOpen={isAppsModalOpen}
        onClose={() => setIsAppsModalOpen(false)}
      />

      {/* Typography & Templates Slide-Over Drawer */}
      {isTemplatesDrawerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex justify-start"
          onClick={() => setIsTemplatesDrawerOpen(false)}
        >
          <aside
            aria-label="Typography & Templates Drawer"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(10, 10, 10, 0.9)' }}
            className="w-[440px] sm:w-[500px] max-w-[92vw] h-full border-r border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col font-mono text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[3px] bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Type className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold tracking-widest uppercase text-white truncate">
                    TYPOGRAPHY &amp; TEMPLATES
                  </h3>
                  <p className="text-[9px] text-zinc-400 truncate">
                    DOPAMINE COMPILATION PACK · KINETIC TITLES
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplatesDrawerOpen(false)}
                className="p-1.5 rounded-[3px] bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
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

      {/* Standalone Director Inspector Drawer Overlay */}
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

      {/* IndexedDB & OPFS Cache Manager Modal */}
      {isCacheManagerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsCacheManagerOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0B0B0D]/98 backdrop-blur-2xl border border-white/[0.07] rounded-[6px] p-6 text-[#F4F4F5] font-mono shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[4px] bg-[#141417] border border-white/[0.07] text-[#F59E0B]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#F4F4F5] tracking-wider uppercase">
                    OPFS &amp; IndexedDB Cache Manager
                  </h3>
                  <p className="text-[10px] text-[#8E8E93]">
                    Local Media Proxy Buffers &amp; Browser Vault Telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCacheManagerOpen(false)}
                className="p-1.5 rounded-[3px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] transition-colors cursor-pointer"
                aria-label="Close Cache Manager"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <div className="p-3.5 rounded-[4px] bg-[#141417] border border-white/[0.07]">
                <div className="text-[10px] text-[#8E8E93] uppercase mb-1">Active Vault Usage</div>
                <div className="text-base font-bold text-[#F4F4F5]">
                  {(cacheUsageBytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <div className="p-3.5 rounded-[4px] bg-[#141417] border border-white/[0.07]">
                <div className="text-[10px] text-[#8E8E93] uppercase mb-1">Available Quota</div>
                <div className="text-base font-bold text-[#F59E0B]">
                  {cacheQuotaBytes > 0
                    ? `${(cacheQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : 'Unlimited'}
                </div>
              </div>
            </div>

            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Purging clears OPFS proxy/media cache and temporary canvas bitmaps from IndexedDB without deleting saved storyboard metadata.
            </p>

            {cachePurgeFeedback && (
              <div className="p-3 rounded-[4px] bg-[#141417] border border-[#F59E0B]/50 text-[#F4F4F5] text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>{cachePurgeFeedback}</span>
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.07] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCacheManagerOpen(false)}
                className="px-4 py-2 rounded-[4px] bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.07] text-xs font-bold text-[#8E8E93] hover:text-[#F4F4F5] transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isPurgingCache}
                onClick={handleExecuteCachePurge}
                className="px-4 py-2 rounded-[4px] bg-[#F59E0B]/15 hover:bg-[#F59E0B] border border-[#F59E0B]/60 text-xs font-bold text-[#F4F4F5] hover:text-[#0B0B0D] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPurgingCache ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Cache</span>
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

export default StageHeader;
