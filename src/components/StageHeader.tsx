/**
 * @file /src/components/StageHeader.tsx
 * @description Master Editorial Cinema Top Bar for HANDFILM:
 * - Left: Two-tone wordmark (`HAND` in Crimson Red, `FILM` in White) with `RAW. RAPID. CINEMATIC.` tagline,
 *   accompanied by an ultra-minimalist hover-navigation system (`HOME | FEATURES | APPS`) with glassmorphic dropdowns.
 * - Center: Minimalist, sleek playback cadence toggle: [ MASTER | SOLO ] centered with clean status pips.
 * - Right: Action block with [ 🔍 Search... ⌘K ], massively prominent [ ⚡ STUDIO ] red button, and 3-dot overflow menu.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  RefreshCw,
  ExternalLink,
  Film,
  Sliders,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { AnthologyFrame } from '../types/anthology';
import { PlaybackMode } from '../types/editor';
import { formatFullSMPTETimecode, getCumulativeShotOffsets } from '../types/storyboard';
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
import { EcosystemGridModal } from './menus/EcosystemGridModal';
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
  onOpenProjectStats?: () => void;
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
  onOpenCacheManager,
  onOpenProjectStats,
  isZenMode = true,
  onToggleZen
}) => {
  const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);
  const [isRapSyncModalOpen, setIsRapSyncModalOpen] = useState(false);
  const [isNeuralVoxOpen, setIsNeuralVoxOpen] = useState(false);
  const [isVectorForgeOpen, setIsVectorForgeOpen] = useState(false);
  const [isAIForgeOpen, setIsAIForgeOpen] = useState(false);
  const [isB2BHubOpen, setIsB2BHubOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isAppsModalOpen, setIsAppsModalOpen] = useState(false);
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

  const activeReelIndex = useStudioStore((s) => s.activeReelIndex);
  const reelLoopActive = useStudioStore((s) => s.reelLoopActive);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const selectReel = useStudioStore((s) => s.selectReel);
  const setReelLoopActive = useStudioStore((s) => s.setReelLoopActive);

  // Cumulative shot offsets for timing
  const shotOffsets = useMemo(() => getCumulativeShotOffsets(frames), [frames]);

  const fallbackCockpitStats = useMemo<CockpitManifestStats>(() => {
    const activeCount = frames.length || totalShots || 14;
    const lightsCount = frames.filter((f) => Boolean(f.lightId)).length;
    const durSec = frames.length > 0
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

  // Global Search State: Unified Application State, Panels, Tools & Ecosystem Index
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [searchHighlightIdx, setSearchHighlightIdx] = useState(0);
  const [searchFilterTab, setSearchFilterTab] = useState<'ALL' | 'SHOTS' | 'TOOLS' | 'APPS'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown & cockpit HUD on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(targetNode)) {
        setIsGlobalSearchOpen(false);
      }
      const inCockpitTrigger = cockpitContainerRef.current?.contains(targetNode);
      const inCockpitDrawer = cockpitDrawerRef.current?.contains(targetNode);
      if (!inCockpitTrigger && !inCockpitDrawer) {
        setIsCockpitHudOpen(false);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // Sync live Cockpit manifest telemetry & collapsible HUD states
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
    const unsubTelemetryState = eventBus.on<boolean>('cockpit:telemetry_state', (val) => {
      setIsTelemetryLayerOn(Boolean(val));
    });
    const unsubSpectrumState = eventBus.on<boolean>('cockpit:spectrum_state', (val) => {
      setIsSpectrumLayerOn(Boolean(val));
    });
    const unsubZoomState = eventBus.on<boolean>('cockpit:zoom_state', (val) => {
      setIsZoomHudLayerOn(Boolean(val));
    });
    return () => {
      unsubStats();
      unsubFeedback();
      unsubTelemetryState();
      unsubSpectrumState();
      unsubZoomState();
    };
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K listener for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
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

  // Live unified search across existing application state (shots & panels), tools, and ecosystem apps
  const unifiedSearchResults = React.useMemo<UnifiedSearchItem[]>(() => {
    const raw = globalSearchQuery.trim().toLowerCase();
    const queryTokens = raw.split(/\s+/).filter(Boolean);

    // 1. Featured Suggestions when query is empty
    if (!raw) {
      const featured: UnifiedSearchItem[] = [];

      // Current & upcoming sequence shots from existing state
      if (frames && frames.length > 0) {
        const activeIdx = typeof currentIndex === 'number' && currentIndex < frames.length ? currentIndex : 0;
        const currentF = frames[activeIdx];
        if (currentF) {
          featured.push({
            id: `shot-${activeIdx}-${currentF.id ?? activeIdx}`,
            type: 'shot',
            title: `Shot ${currentF.epNumber || `#${activeIdx + 1}`}: ${currentF.title || 'Current Active Frame'}`,
            sub: `${currentF.bengaliTitle ? `${currentF.bengaliTitle} • ` : ''}${currentF.tagline || 'Current Timeline Frame'}`,
            badge: `CURRENT SHOT`,
            badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            categoryGroup: 'APPLICATION STATE',
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
            title: `Shot ${nextF.epNumber || `#${activeIdx + 2}`}: ${nextF.title || 'Next Shot'}`,
            sub: `${nextF.bengaliTitle ? `${nextF.bengaliTitle} • ` : ''}${nextF.tagline || 'Next Sequence Frame'}`,
            badge: `NEXT SHOT`,
            badgeColor: 'text-zinc-400 bg-white/5 border-white/10',
            categoryGroup: 'APPLICATION STATE',
            score: 90,
            shotIndex: activeIdx + 1,
            thumbnailUrl: nextF.imageUrl || nextF.thumbnailUrl || nextF.thumbnail,
            colorAccent: nextF.colorAccent
          });
        }
      }

      // Quick-jump workspace panels
      featured.push(
        {
          id: 'panel-stage',
          type: 'panel',
          title: 'TACTILE STAGE',
          sub: 'Primary 2.39:1 / 16:9 cinema viewport and canvas deck',
          badge: 'WORKSPACE',
          badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          categoryGroup: 'WORKSPACE',
          score: 85,
          panelTarget: 'TACTILE_STAGE'
        },
        {
          id: 'panel-reels',
          type: 'panel',
          title: '9:16 REELS & DUAL SPLIT',
          sub: 'Vertical short-form dopamine cut & dual split editor',
          badge: 'WORKSPACE',
          badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
          categoryGroup: 'WORKSPACE',
          score: 80,
          panelTarget: 'SPLIT'
        }
      );

      // Studio tools
      featured.push(
        {
          id: 'tool-ai-forge',
          type: 'studio-tool',
          title: 'AI CINE FORGE',
          sub: 'Director prompt synth, scene loglines & cinematic script generation',
          badge: 'STUDIO TOOL',
          badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          categoryGroup: 'STUDIO OS',
          score: 75,
          actionId: 'aiforge:open'
        },
        {
          id: 'tool-export-studio',
          type: 'studio-tool',
          title: 'UNIFIED MASTER EXPORT',
          sub: '4K WebCodecs MP4, Premiere XML, DaVinci FCPXML & PDF contact sheets',
          badge: 'STUDIO TOOL',
          badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          categoryGroup: 'STUDIO OS',
          score: 70,
          actionId: 'export:open'
        },
        {
          id: 'tool-project-stats',
          type: 'studio-tool',
          title: 'PROJECT STATISTICS & ANALYTICS',
          sub: 'Calculate total runtime (SMPTE), shot count, average duration, and pacing rhythm',
          badge: 'ANALYTICS',
          badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
          categoryGroup: 'STUDIO OS',
          score: 68,
          actionId: 'stats:open'
        }
      );

      // Featured Ecosystem Apps
      featured.push(
        {
          id: 'b2b',
          type: 'ecosystem',
          title: 'B2B GLOBAL ENGINE',
          sub: 'Wholesale & International Trade',
          badge: 'ENTERPRISE',
          categoryGroup: 'COMMERCE & ENTERPRISE',
          score: 65,
          url: 'https://b2b.handsandhead.com'
        },
        {
          id: 'vault',
          type: 'ecosystem',
          title: 'CENTRAL ASSET VAULT',
          sub: 'Lossless RAW Storage Pipeline',
          badge: 'MEDIA',
          categoryGroup: 'CINEMA, AUDIO & MEDIA',
          score: 60,
          url: 'https://vault.handsandhead.com'
        }
      );

      if (searchFilterTab === 'SHOTS') return featured.filter((f) => f.type === 'shot');
      if (searchFilterTab === 'TOOLS') return featured.filter((f) => f.type === 'panel' || f.type === 'studio-tool');
      if (searchFilterTab === 'APPS') return featured.filter((f) => f.type === 'ecosystem');
      return featured;
    }

    const matches: UnifiedSearchItem[] = [];

    // 1. FILTER EXISTING APPLICATION STATE: Shots / Frames in current sequence
    if (frames && frames.length > 0) {
      frames.forEach((f, idx) => {
        let score = 0;
        const shotNumStr = String(idx + 1);
        const epStr = (f.epNumber || '').toLowerCase();
        const titleStr = (f.title || '').toLowerCase();
        const bengaliStr = (f.bengaliTitle || '').toLowerCase();
        const taglineStr = (f.tagline || '').toLowerCase();
        const notesStr = (f.directorNotes || '').toLowerCase();

        // Exact shot number query matching (e.g. "1", "01", "#01", "shot 1", "sh1")
        const isNumericShotQuery =
          raw === shotNumStr ||
          raw === `#${shotNumStr}` ||
          raw === `shot ${shotNumStr}` ||
          raw === `sh${shotNumStr}` ||
          raw === `shot${shotNumStr}` ||
          epStr.includes(raw);

        if (isNumericShotQuery) {
          score += 220;
        } else if (titleStr.includes(raw)) {
          score += 100;
        } else if (bengaliStr.includes(raw)) {
          score += 90;
        } else if (taglineStr.includes(raw) || notesStr.includes(raw)) {
          score += 50;
        }

        for (const token of queryTokens) {
          if (token === shotNumStr || epStr.includes(token)) score += 45;
          if (titleStr.includes(token)) score += 25;
          if (bengaliStr.includes(token)) score += 20;
          if (taglineStr.includes(token)) score += 10;
        }

        if (score > 0) {
          matches.push({
            id: `shot-${idx}-${f.id ?? idx}`,
            type: 'shot',
            title: `Shot ${f.epNumber || `#${idx + 1}`}: ${f.title || 'Frame ' + (idx + 1)}`,
            sub: `${f.bengaliTitle ? `${f.bengaliTitle} • ` : ''}${f.tagline || f.cameraMove || 'Active Sequence Frame'}`,
            badge: `SHOT ${f.epNumber || `#${idx + 1}`}`,
            badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
            categoryGroup: 'SEQUENCE TIMELINE',
            score,
            shotIndex: idx,
            thumbnailUrl: f.imageUrl || f.thumbnailUrl || f.thumbnail,
            colorAccent: f.colorAccent
          });
        }
      });
    }

    // 2. FILTER WORKSPACE PANELS & MODES
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
        title: 'TACTILE STAGE',
        sub: 'Primary 2.39:1 / 16:9 cinema viewport and canvas deck',
        badge: 'WORKSPACE',
        panelTarget: 'TACTILE_STAGE',
        keywords: ['stage', 'cinema', 'viewport', 'tactile', 'player', 'view', 'canvas']
      },
      {
        id: 'panel-reels',
        title: 'REELS & SPLIT',
        sub: '9:16 vertical short-form dopamine cut & dual split editor',
        badge: 'WORKSPACE',
        panelTarget: 'SPLIT',
        keywords: ['reels', 'split', 'vertical', '9:16', 'tiktok', 'shorts', 'dual split']
      },
      {
        id: 'panel-scrub',
        title: 'SCRUB TIMELINE',
        sub: 'Sub-frame precision scrub reel and keyframe navigation deck',
        badge: 'WORKSPACE',
        panelTarget: 'SEQUENCER',
        keywords: ['scrub', 'timeline', 'sequencer', 'sub-frame', 'keyframes', 'scrubber']
      },
      {
        id: 'panel-multicam',
        title: 'MULTI-CAM GRID',
        sub: '4-up multi-camera real-time synchronized live cutting matrix',
        badge: 'WORKSPACE',
        panelTarget: 'MULTICAM',
        keywords: ['multicam', 'multi-cam', 'grid', 'cameras', 'angles', 'matrix']
      },
      {
        id: 'panel-monitor',
        title: 'OPTICAL MONITOR',
        sub: '2.39:1 optical master reference display & cinema parade scopes',
        badge: 'WORKSPACE',
        panelTarget: 'OPTICAL',
        keywords: ['monitor', 'optical', 'scopes', 'waveform', 'parade', 'histogram', 'lut']
      },
      {
        id: 'view-home',
        title: 'HOME OVERVIEW',
        sub: 'Director manifesto, production metrics & ecosystem entrance',
        badge: 'VIEW',
        viewTarget: 'HOME',
        keywords: ['home', 'overview', 'manifesto', 'portfolio', 'landing', 'start']
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
          badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          categoryGroup: 'WORKSPACE NAVIGATION',
          score,
          panelTarget: p.panelTarget,
          viewTarget: p.viewTarget
        });
      }
    });

    // 3. STUDIO TOOLS & 4. ECOSYSTEM APPS VIA KEYWORD SEARCH ENGINE
    const ecoMatches = ecosystemSearchEngine.search(raw, 20);
    ecoMatches.forEach((em) => {
      matches.push({
        id: em.id,
        type: em.type,
        title: em.title,
        sub: em.sub,
        badge: em.category,
        badgeColor: em.type === 'studio-tool' 
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          : 'text-zinc-400 bg-white/5 border-white/10',
        categoryGroup: em.categoryGroup,
        score: em.score,
        url: em.url,
        actionId: em.actionId
      });
    });

    // Sort by descending score
    matches.sort((a, b) => b.score - a.score);

    // Apply active category filter tab
    if (searchFilterTab === 'SHOTS') {
      return matches.filter((m) => m.type === 'shot').slice(0, 10);
    }
    if (searchFilterTab === 'TOOLS') {
      return matches.filter((m) => m.type === 'panel' || m.type === 'studio-tool').slice(0, 10);
    }
    if (searchFilterTab === 'APPS') {
      return matches.filter((m) => m.type === 'ecosystem').slice(0, 10);
    }

    return matches.slice(0, 12);
  }, [globalSearchQuery, frames, currentIndex, searchFilterTab]);

  const handleSelectSearchResult = (item: UnifiedSearchItem) => {
    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery('');

    // Handle Quick Jump to Sequence Shot
    if (item.type === 'shot' && typeof item.shotIndex === 'number') {
      const idx = item.shotIndex;
      if (onSelectView && currentView !== 'STUDIO') {
        onSelectView('STUDIO');
      }
      handleWorkspacePanelSelect('TACTILE_STAGE');
      eventBus.emit('frame:select', { index: idx });
      eventBus.emit('timeline:seek_shot', { index: idx });
      return;
    }

    // Handle Quick Jump to Workspace Panel / View
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

    // Handle Quick Jump to Studio Tool Modal
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

    // Handle Navigation to Ecosystem Project Subdomain
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
        unifiedSearchResults.length ? (prev - 1 + unifiedSearchResults.length) % unifiedSearchResults.length : 0
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
      eventBus.emit('recorder:open');
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
    const unsubStats = eventBus.on('stats:open', () => {
      if (onOpenProjectStats) {
        queueMicrotask(() => onOpenProjectStats());
      }
    });

    return () => {
      unsubAI();
      unsubB2B();
      unsubEco();
      unsubExport();
      unsubDrawerOpen();
      unsubDrawerClose();
      unsubStats();
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
    <header className={`relative w-full h-12 flex items-center px-4 gap-3 z-50 bg-[#000000]/90 backdrop-blur-xl border-b border-white/5 select-none shrink-0 font-sans zen-disclose-header ${className}`}>
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

          {/* 3. APPS Trigger: Launches Full-Screen [ THE HIMON ECOSYSTEM ] Visual Card Launcher */}
          <button
            type="button"
            onClick={() => setIsAppsModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer whitespace-nowrap border ${
              isAppsModalOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_14px_rgba(245,166,35,0.35)]'
                : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:text-white hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-[0_0_10px_rgba(245,166,35,0.2)]'
            }`}
            title="Open [ THE HIMON ECOSYSTEM ] Visual Portfolio Launcher (28 Domains)"
          >
            <span className="text-amber-400 text-xs">㗊</span>
            <span>APPS</span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 shrink-0 ${isAppsModalOpen ? 'rotate-180 text-amber-400' : ''}`} />
          </button>
        </div>

        <div className="hidden md:block w-px h-5 bg-white/20 mx-2 mx-2! shrink-0"></div>

        <nav aria-label="Workspace Views" className="hidden md:flex items-center gap-3 shrink-0">
          {(
            [
              { panel: 'TACTILE_STAGE', label: 'STAGE', title: 'Primary Tactile Cinema Stage' },
              { panel: 'SPLIT', label: 'REELS', title: '9:16 Reels & Dual Split Sequencer' },
              { panel: 'SEQUENCER', label: 'SCRUB', title: 'Sub-Frame Precision Scrub Timeline' },
              { panel: 'MULTICAM', label: 'MULTI-CAM', title: 'Multi-Camera Live Cutting Grid' },
              { panel: 'OPTICAL', label: 'MONITOR', title: '2.39:1 Optical Cinema Monitor' }
            ] as const
          ).map((tab) => {
            const isActive = currentView === 'STUDIO' && currentPanel === tab.panel;
            return (
              <button
                key={tab.panel}
                type="button"
                onClick={() => handleWorkspacePanelSelect(tab.panel)}
                title={tab.title}
                className={`px-3.5 py-1.5 font-mono text-xs tracking-wider whitespace-nowrap shrink-0 cursor-pointer border-b-2 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t font-bold shadow-[0_4px_14px_rgba(251,191,36,0.12)]'
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.04] rounded-t font-medium'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* MODULE 1: High-Contrast Tactical Cockpit Command Pill & Top-Layer Portal Telemetry Drawer */}
        <div ref={cockpitContainerRef} className="relative shrink-0">
          <button
            ref={cockpitBtnRef}
            type="button"
            onClick={() => {
              setIsCockpitHudOpen((prev) => {
                const next = !prev;
                if (next && cockpitBtnRef.current && typeof window !== 'undefined') {
                  const rect = cockpitBtnRef.current.getBoundingClientRect();
                  const clampedLeft = Math.min(window.innerWidth - 336, Math.max(16, rect.left));
                  setCockpitDrawerPos({ top: Math.max(48, rect.bottom + 4), left: clampedLeft });
                }
                return next;
              });
            }}
            title="Director's Cockpit Telemetry & Ecosystem Interchange Hub"
            className="bg-amber-500/15 border border-amber-400/70 text-amber-300 hover:bg-amber-500/25 font-mono text-xs font-bold px-3 py-1 rounded shadow-[0_0_10px_rgba(251,191,36,0.2)] flex items-center gap-2 active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>⚡ COCKPIT</span>
          </button>

          {isCockpitHudOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={cockpitDrawerRef}
              onMouseDown={(e) => e.stopPropagation()}
              style={
                cockpitDrawerPos
                  ? { top: `${cockpitDrawerPos.top}px`, left: `${cockpitDrawerPos.left}px`, zIndex: 9999 }
                  : { zIndex: 9999 }
              }
              className="fixed top-12 left-72 w-80 sm:w-[356px] max-h-[82vh] overflow-y-auto bg-neutral-950/95 border border-amber-500/50 shadow-2xl backdrop-blur-md p-4 rounded-lg z-[9999] font-mono text-xs text-zinc-200 space-y-3"
            >
              {/* Bridge Environment Status */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                  DIRECTOR&apos;S COCKPIT BRIDGE
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    resolvedCockpitStats.isTauriActive
                      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {resolvedCockpitStats.isTauriActive ? 'TAURI NATIVE IPC' : 'OFFLINE READY'}
                </span>
              </div>

              {/* 10x10 Modular Reel Engine Quick-Jump */}
              <div className="space-y-1.5 pb-2 border-b border-white/10">
                <div className="flex items-center justify-between text-[9px] font-bold tracking-wider uppercase">
                  <span className="text-zinc-400">
                    10×10 MODULAR REEL ({reelLoopActive ? `REEL ${String(activeReelIndex + 1).padStart(2, '0')} · ${activeReelIndex * 10 + 1}-${Math.min(frames.length || 100, activeReelIndex * 10 + 10)}` : 'MASTER 100'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setReelLoopActive(!reelLoopActive)}
                    className={`px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors ${
                      !reelLoopActive
                        ? 'bg-red-600/80 border-red-500 text-white'
                        : 'bg-neutral-900 border-white/15 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {reelLoopActive ? 'MASTER ALL' : 'REEL LOOP ON'}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1">
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
                        className={`py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(220,38,38,0.45)]'
                            : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:border-amber-400/50'
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
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-zinc-500 uppercase">TOTAL SHOTS</div>
                  <div className="text-sm font-bold text-white">{resolvedCockpitStats.totalShots}</div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-zinc-500 uppercase">ACTIVE LIGHTS</div>
                  <div className="text-sm font-bold text-amber-300">{resolvedCockpitStats.activeLightsCount} RIGS</div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-zinc-500 uppercase">MASTER AUDIO</div>
                  <div className="text-xs font-bold text-cyan-300 truncate">
                    {resolvedCockpitStats.audioSynced
                      ? `SYNCED · ${resolvedCockpitStats.audioTrackName || 'TRACK'}`
                      : 'STANDBY / UNROUTED'}
                  </div>
                </div>
                <div className="p-2 rounded bg-black/60 border border-white/10">
                  <div className="text-[9px] text-zinc-500 uppercase">SEQUENCE RUNTIME</div>
                  <div className="text-sm font-bold text-emerald-300">
                    {resolvedCockpitStats.totalDurationSec.toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* Offline Render & Export Engine */}
              {(() => {
                const totalCount = Math.max(1, frames.length || 100);
                const scopeStartIdx = renderScope === 'reel' ? Math.min(totalCount - 1, activeReelIndex * 10) : 0;
                const scopeEndIdx = renderScope === 'reel' ? Math.min(totalCount - 1, scopeStartIdx + 9) : totalCount - 1;
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
                      projectTitle: renderScope === 'reel' ? `REEL_${String(activeReelIndex + 1).padStart(2, '0')}` : 'MASTER_100',
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
                    setCockpitFeedback(err?.message?.includes('cancelled') ? 'RENDER CANCELLED' : `RENDER NOTICE: ${err?.message || 'Fallback ready'}`);
                    setTimeout(() => setCockpitFeedback(null), 4000);
                  } finally {
                    setIsRenderingOffline(false);
                    renderAbortRef.current = null;
                    setRenderTelemetry(null);
                  }
                };

                return (
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-wider uppercase text-amber-300">
                        OFFLINE RENDER PIPELINE
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setRenderScope('reel')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${
                            renderScope === 'reel'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          REEL {String(activeReelIndex + 1).padStart(2, '0')} (10)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenderScope('master')}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${
                            renderScope === 'master'
                              ? 'bg-red-600/80 border-red-400 text-white'
                              : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          MASTER ({totalCount})
                        </button>
                      </div>
                    </div>

                    {isRenderingOffline && renderTelemetry && (
                      <div className="p-2 rounded bg-black/80 border border-amber-400/50 space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold text-amber-300">
                          <span className="truncate pr-2">
                            {`RENDERING SHOT ${String(renderTelemetry.currentShotIndex).padStart(2, '0')}/${String(renderTelemetry.totalShots).padStart(2, '0')}...`}
                          </span>
                          <button
                            type="button"
                            onClick={() => renderAbortRef.current?.abort()}
                            className="text-red-400 hover:text-red-300 underline shrink-0 cursor-pointer"
                          >
                            ABORT
                          </button>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-150"
                            style={{ width: `${Math.max(4, Math.min(100, renderTelemetry.percent))}%` }}
                          />
                        </div>
                        <div className="text-[8.5px] text-zinc-400 truncate">
                          {renderTelemetry.statusText}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        disabled={isRenderingOffline}
                        onClick={() => runOfflineVideoRender('mp4')}
                        className="px-2 py-1.5 rounded bg-red-600/20 hover:bg-red-600/35 disabled:opacity-40 border border-red-500/50 text-red-200 font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        MP4
                      </button>
                      <button
                        type="button"
                        disabled={isRenderingOffline}
                        onClick={() => runOfflineVideoRender('vp9')}
                        className="px-2 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/35 disabled:opacity-40 border border-emerald-500/50 text-emerald-200 font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        VP9 WEBM
                      </button>
                      <button
                        type="button"
                        disabled={isRenderingOffline}
                        onClick={() => runOfflineVideoRender('png')}
                        className="px-2 py-1.5 rounded bg-sky-600/20 hover:bg-sky-600/35 disabled:opacity-40 border border-sky-500/50 text-sky-200 font-bold text-[10px] cursor-pointer transition-colors"
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
                            projectName: renderScope === 'reel' ? `HANDFILM_REEL_${String(activeReelIndex + 1).padStart(2, '0')}` : 'HANDFILM_MASTER_100'
                          });
                          triggerBrowserDownload(xml, `HANDFILM_${renderScope === 'reel' ? `REEL_${String(activeReelIndex + 1).padStart(2, '0')}` : 'MASTER'}_Premiere.xml`, 'application/xml');
                          setCockpitFeedback('PREMIERE XMEML EXPORTED');
                          setTimeout(() => setCockpitFeedback(null), 4000);
                        }}
                        className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        PREMIERE XML
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const bridgeShots = buildScopedBridgeShots();
                          const json = generateCapCutDraftJson(bridgeShots, null, {
                            fps: 24,
                            projectName: renderScope === 'reel' ? `HANDFILM_REEL_${String(activeReelIndex + 1).padStart(2, '0')}` : 'HANDFILM_MASTER_100'
                          });
                          triggerBrowserDownload(json, `draft_content_${renderScope === 'reel' ? `R${String(activeReelIndex + 1).padStart(2, '0')}` : 'MASTER'}.json`, 'application/json');
                          setCockpitFeedback('CAPCUT DRAFT JSON EXPORTED');
                          setTimeout(() => setCockpitFeedback(null), 4000);
                        }}
                        className="px-2 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-300 font-bold text-[10px] cursor-pointer transition-colors"
                      >
                        CAPCUT JSON
                      </button>
                    </div>
                  </div>
                );
              })()}

              {cockpitFeedback && (
                <div className="px-2.5 py-1.5 rounded bg-amber-500/15 border border-amber-400/50 text-[10px] font-bold text-amber-300">
                  {cockpitFeedback}
                </div>
              )}

              {/* One-Click Global Pipeline Triggers */}
              <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-white/10">
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
                      triggerBrowserDownload(xml, `HANDFILM_SEQUENCE_${Date.now()}.fcpxml`, 'application/xml');
                      setCockpitFeedback('[SANDBOX MODE] FCPXML exported — Tauri IPC ready for Windows .exe');
                      setTimeout(() => setCockpitFeedback(null), 4000);
                    }
                  }}
                  className="w-full px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                >
                  <span>[ 📤 FCPXML v1.9 ]</span>
                  <span className="text-[9px] text-zinc-400">ALL SHOTS</span>
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
                      triggerBrowserDownload(zipBlob, `HANDFILM_CapCut_Pack_${Date.now()}.zip`, 'application/zip');
                      setCockpitFeedback('[SANDBOX MODE] CapCut Pack exported — Tauri IPC ready for Windows .exe');
                      setTimeout(() => setCockpitFeedback(null), 4000);
                    }
                  }}
                  className="w-full px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                >
                  <span>[ ⚡ CAPCUT PACK ]</span>
                  <span className="text-[9px] text-zinc-400">JSON + DIRECTOR SHEET</span>
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
                  className="w-full px-3 py-2 rounded bg-neutral-900 hover:bg-neutral-800 border border-sky-500/40 hover:border-sky-400 text-sky-300 font-bold text-xs flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                >
                  <span>[ 📸 FREEZE ALL FRAMES ]</span>
                  <span className="text-[9px] text-zinc-400">LOSSLESS PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCockpitHudOpen(false);
                    eventBus.emit('cockpit:action', { type: 'open_modal' });
                  }}
                  className="w-full px-3 py-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-200 font-bold text-[10px] text-center cursor-pointer transition-colors"
                >
                  OPEN FULL INTERCHANGE HUB
                </button>
              </div>

              {/* Telemetry & Spectral Overlay Toggles (collapsed off dock by default) */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="text-[9px] font-bold tracking-wider uppercase text-zinc-400">
                  TELEMETRY & SPECTRAL HUD LAYERS
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    type="button"
                    onClick={() => eventBus.emit('cockpit:toggle_telemetry')}
                    className={`w-full px-2.5 py-1.5 rounded border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      isTelemetryLayerOn
                        ? 'bg-teal-500/20 border-teal-400/70 text-teal-200'
                        : 'bg-neutral-900/90 border-white/10 hover:border-teal-400/50 text-zinc-300'
                    }`}
                  >
                    <span>MODULAR TELEMETRY RACK</span>
                    <span className={isTelemetryLayerOn ? 'text-teal-300' : 'text-zinc-500'}>
                      {isTelemetryLayerOn ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => eventBus.emit('cockpit:toggle_spectrum')}
                    className={`w-full px-2.5 py-1.5 rounded border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      isSpectrumLayerOn
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-200'
                        : 'bg-neutral-900/90 border-white/10 hover:border-amber-400/50 text-zinc-300'
                    }`}
                  >
                    <span>SPECTRAL ENERGY ANALYZER</span>
                    <span className={isSpectrumLayerOn ? 'text-amber-300' : 'text-zinc-500'}>
                      {isSpectrumLayerOn ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => eventBus.emit('cockpit:toggle_zoom')}
                    className={`w-full px-2.5 py-1.5 rounded border text-[10px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      isZoomHudLayerOn
                        ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200'
                        : 'bg-neutral-900/90 border-white/10 hover:border-cyan-400/50 text-zinc-300'
                    }`}
                  >
                    <span>MULTI-LAYER PARALLAX ZOOM</span>
                    <span className={isZoomHudLayerOn ? 'text-cyan-300' : 'text-zinc-500'}>
                      {isZoomHudLayerOn ? 'ACTIVE' : 'HIDDEN'}
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: Master/Export Action Pod & Studio Tools */}
      <div className="flex-1 flex items-center justify-end gap-2.5 lg:gap-3">
        {/* 1. Global Search Bar: Existing Application State, Workspace Panels, Tools & Ecosystem */}
        <div ref={searchContainerRef} className="relative shrink-0">
          <div className="relative flex items-center h-8 bg-black/60 border border-white/10 hover:border-white/25 focus-within:border-amber-400/60 focus-within:ring-1 focus-within:ring-amber-400/30 rounded-lg px-2.5 gap-2 transition-all w-36 sm:w-52 lg:w-64 shadow-inner">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setSearchHighlightIdx(0);
                if (!isGlobalSearchOpen) setIsGlobalSearchOpen(true);
              }}
              onFocus={() => setIsGlobalSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search shots, tools, apps... (⌘K)"
              className="w-full bg-transparent text-[11px] font-mono text-white placeholder:text-zinc-500 focus:outline-none"
            />
            {globalSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="text-zinc-500 hover:text-white p-0.5 cursor-pointer shrink-0"
                title="Clear Search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="hidden sm:inline-flex text-[9px] font-mono text-zinc-500 border border-white/10 rounded px-1 py-0.2 pointer-events-none shrink-0">
                ⌘K
              </span>
            )}
          </div>

          {/* Unified Keyword Indexed Search Dropdown Popover */}
          {isGlobalSearchOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-80 sm:w-[420px] max-h-[480px] overflow-y-auto bg-[#08090C]/98 backdrop-blur-3xl border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.12)] p-2 space-y-1.5 z-[99999] font-mono text-xs select-none">
              {/* Header Telemetry & Category Filter Tabs */}
              <div className="flex flex-col gap-1.5 px-1 pb-1.5 border-b border-white/10">
                <div className="flex items-center justify-between text-[9px] text-zinc-400 uppercase tracking-widest px-1">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>CENTRAL STUDIO &amp; ECOSYSTEM SEARCH</span>
                  </span>
                  <span className="text-amber-400 font-bold">
                    {globalSearchQuery ? `${unifiedSearchResults.length} FOUND` : 'QUICK JUMP'}
                  </span>
                </div>

                {/* Filter Category Tabs */}
                <div className="flex items-center gap-1 pt-0.5">
                  {(['ALL', 'SHOTS', 'TOOLS', 'APPS'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setSearchFilterTab(tab);
                        setSearchHighlightIdx(0);
                      }}
                      className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded tracking-wider uppercase transition-colors cursor-pointer border ${
                        searchFilterTab === tab
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                          : 'bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab === 'SHOTS' ? '🎬 SHOTS' : tab === 'TOOLS' ? '⚡ TOOLS & PANELS' : tab === 'APPS' ? '🌐 APPS' : 'ALL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results List */}
              <div className="py-1 space-y-0.5">
                {unifiedSearchResults.length === 0 ? (
                  <div className="p-5 text-center text-zinc-500 text-xs font-mono space-y-2">
                    <p>No results match &ldquo;{globalSearchQuery}&rdquo; in {searchFilterTab}</p>
                    <div className="flex justify-center gap-2 pt-1">
                      {searchFilterTab !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => setSearchFilterTab('ALL')}
                          className="text-[10px] text-zinc-300 hover:text-white underline cursor-pointer"
                        >
                          Clear category filter
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsGlobalSearchOpen(false);
                          setIsAppsModalOpen(true);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                      >
                        Browse All 28 Apps [ 㗊 ]
                      </button>
                    </div>
                  </div>
                ) : (
                  unifiedSearchResults.map((item, idx) => {
                    const isSelected = idx === searchHighlightIdx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectSearchResult(item)}
                        onMouseEnter={() => setSearchHighlightIdx(idx)}
                        className={`w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-3 text-left transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-[0_0_12px_rgba(245,166,35,0.15)]'
                            : 'bg-transparent border-transparent text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        {/* Leading Graphic / Thumbnail / Icon */}
                        <div className="shrink-0 flex items-center justify-center">
                          {item.type === 'shot' ? (
                            item.thumbnailUrl ? (
                              <div className="w-9 h-7 rounded overflow-hidden border border-white/15 bg-black/50 shrink-0">
                                <img
                                  src={item.thumbnailUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div
                                style={{ borderColor: item.colorAccent || '#D4AF37' }}
                                className="w-8 h-7 rounded border flex items-center justify-center bg-black/60 text-[9px] font-mono text-amber-400 font-bold"
                              >
                                #{String((item.shotIndex ?? 0) + 1).padStart(2, '0')}
                              </div>
                            )
                          ) : item.type === 'panel' ? (
                            <div className="w-8 h-7 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <LayoutGrid className="w-3.5 h-3.5" />
                            </div>
                          ) : item.type === 'studio-tool' ? (
                            <div className="w-8 h-7 rounded border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-400">
                              <Zap className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-8 h-7 rounded border border-white/15 bg-white/5 flex items-center justify-center text-zinc-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Title, Category & Subtitle */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate group-hover:text-amber-300">
                              {item.title}
                            </span>
                            <span
                              className={`text-[8px] px-1.5 py-0.2 rounded border font-semibold uppercase tracking-wider shrink-0 ${
                                item.badgeColor || 'text-zinc-400 bg-black/60 border-white/10'
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-zinc-400 truncate mt-0.5 leading-snug">
                            {item.sub}
                          </p>
                          {item.url && item.url !== '#' && (
                            <span className="text-[8.5px] text-zinc-500 block truncate mt-0.5">
                              {item.url.replace(/^https?:\/\//, '')}
                            </span>
                          )}
                        </div>

                        {/* Action Quick-Jump Badge */}
                        <div className="shrink-0 flex items-center gap-1.5 text-zinc-400 group-hover:text-amber-400">
                          {item.type === 'shot' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              JUMP ↵
                            </span>
                          ) : item.type === 'panel' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              SWITCH ↵
                            </span>
                          ) : item.type === 'studio-tool' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              OPEN ↵
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10 font-bold flex items-center gap-1">
                              <span>LAUNCH</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Jump Action */}
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between px-2 text-[9px] text-zinc-500 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsGlobalSearchOpen(false);
                    setIsAppsModalOpen(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>㗊</span>
                  <span>VIEW ALL 28 APPS IN LAUNCHER</span>
                </button>
                <span>[ESC] TO CLOSE</span>
              </div>
            </div>
          )}
        </div>

        {/* Global Minimalist Icon Dock across ALL tabs */}
        <div className="flex items-center gap-3 pr-2 shrink-0">
          {/* Priority 1: STUDIO Hero */}
          <button
            type="button"
            onClick={handleStudioLaunch}
            className="h-9 px-4 rounded-full bg-[#e50914] hover:bg-[#ff1e2b] text-white font-mono font-bold flex items-center justify-center shadow-[0_0_14px_rgba(229,9,20,0.55)] hover:shadow-[0_0_20px_rgba(229,9,20,0.85)] transition-all duration-100 cursor-pointer active:scale-95 shrink-0"
            title="Launch Master Cinema Studio"
          >
            <span className="text-xs tracking-wider font-black">STUDIO</span>
          </button>

          {/* Priority 2: EXPORT (Amber border #ffaa00) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenExport) onOpenExport();
              else setIsExportStudioOpen(true);
            }}
            className="h-9 w-9 rounded-full bg-neutral-900 border border-[#ffaa00]/70 text-[#ffaa00] hover:bg-[#ffaa00]/15 hover:border-amber-400 flex items-center justify-center text-sm transition-all duration-100 cursor-pointer active:scale-95 shrink-0 shadow-[0_0_10px_rgba(255,170,0,0.25)]"
            title="Export 4K Video & NLE Timelines"
          >
            ⭳
          </button>

          {/* Priority 3: RECORD (Record tally icon) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenRecorder) onOpenRecorder();
              else setIsRecording(r => !r);
            }}
            className={`h-9 w-9 rounded-full bg-neutral-900 border flex items-center justify-center text-sm transition-all duration-100 cursor-pointer active:scale-95 shrink-0 ${
              isRecording
                ? 'border-red-500 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse'
                : 'border-white/10 hover:border-red-500 text-red-500'
            }`}
            title="Record 4K Screen & Studio Audio"
          >
            ●
          </button>

          {/* Priority 4: OPTIONS & WORKSPACE SUITE (3-Dots Dropdown Menu with all restored & present menus) */}
          <OverflowSettingsMenu
            onOpenCompile={onCompile || (() => setIsCompileModalOpen(true))}
            onOpenRapSync={() => {
              if (onOpenRapSync) onOpenRapSync();
              else setIsRapSyncModalOpen(true);
            }}
            onOpenSettings={onOpenSettings || (() => eventBus.emit('settings:open'))}
            onOpenInspector={handleTriggerInspector}
            onOpenCacheManager={() => {
              if (onOpenCacheManager) onOpenCacheManager();
              else setIsCacheManagerOpen(true);
            }}
            onOpenExport={onOpenExport || (() => setIsExportStudioOpen(true))}
            onOpenExportXml={() => eventBus.emit('export:xml')}
            onOpenExportFcpxml={() => eventBus.emit('export:fcpxml')}
            onOpenProjectStats={onOpenProjectStats}
            onOpenShortcuts={onOpenShortcuts || (() => eventBus.emit('shortcuts:open'))}
          />
        </div>
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
        shotMediaMap={shotMediaMap}
        currentIndex={currentIndex}
      />
      <EcosystemGridModal
        isOpen={isAppsModalOpen}
        onClose={() => setIsAppsModalOpen(false)}
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

      {/* Typography & Templates Slide-Over Drawer (Dopamine Compilation Pack & Cinematic Titles) */}
      {isTemplatesDrawerOpen && (
        <div
          className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex justify-start"
          onClick={() => setIsTemplatesDrawerOpen(false)}
        >
          <aside
            aria-label="Typography & Templates Drawer"
            style={{ backdropFilter: 'blur(20px)', background: 'rgba(10, 10, 10, 0.85)' }}
            className="w-[440px] sm:w-[500px] max-w-[92vw] h-full border-r border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col font-mono text-white overflow-hidden animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/40">
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
