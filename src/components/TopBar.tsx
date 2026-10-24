/**
 * @file /src/components/TopBar.tsx
 * @description Master Editorial Cinema TopBar for HANDFILM:
 * - Left: Cinema Red Diamond Monogram, HANDFILM brand, minimal nav links (Home, Top 10 Reels, Manifesto)
 * - Center/Right:
 *   - Unified [ EXPORT ▾ ] dropdown:
 *     1. FCP 7 XML (Premiere Pro)
 *     2. FCPXML (CapCut / DaVinci)
 *     3. MP4 Master (WebCodecs Render)
 *     4. Contact Sheet PDF
 *     5. Full Project Backup (.rawx)
 *   - [ ▶ PRO STUDIO ] / [ HOME ] toggle
 *   - Right Ecosystem Menu with restored links:
 *     HUB, VAULT, R2 / STREAM, BLOOM-APP, DEEPER, LAB, SETTINGS
 */

import React, { useState, useEffect } from 'react';
import { WorkspaceMode } from '../core/theme';
import { SaveState } from '../core/storage';
import { exportFullIdbBackup } from '../utils/backup';
import { AnthologyFrame } from '../types/anthology';
import { downloadStoryboardPdf } from '../utils/pdfExport';
import {
  Film,
  Home,
  Play,
  MoreVertical,
  FolderOpen,
  Layers,
  Palette,
  Activity,
  HelpCircle,
  HardDriveDownload,
  SlidersHorizontal,
  Cloud,
  Video,
  Sparkles,
  Download,
  Scissors,
  FileText,
  ExternalLink,
  Globe,
  Settings,
  Sliders,
  ChevronDown,
  Keyboard,
  Type,
  Maximize2,
  Circle,
  LogIn,
  LogOut,
  Package,
  Zap
} from 'lucide-react';
import { signInWithGoogle, signOutUser, onAuthChange, auth } from '../services/firebase';
import { firestoreSync, CloudSyncStatus } from '../services/firestoreSync';
import { User } from 'firebase/auth';
import { ExportModalTab } from './CutNativeExportModal';
import { ComponentVisibility } from './ComponentsMatrixPopover';
import { useStudioStore } from '../core/store';
import { PlaybackMode } from '../types/editor';
import {
  calculateMasterSequenceDuration,
  formatRuntimeTimecode,
  formatSoloShotTelemetry,
  getShotDurationSec,
  getShotTargetFps
} from '../types/storyboard';

export interface TopBarProps {
  projectTitle?: string;
  onUpdateTitle?: (title: string) => void;
  activeMode?: WorkspaceMode;
  onSelectMode?: (mode: WorkspaceMode) => void;
  onGoHome?: () => void;
  activeModule?: string;
  isProMode?: boolean;
  onToggleProMode?: () => void;
  componentsBadgeText?: string;
  onToggleComponentsPopover?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSelfTest?: () => void;
  onOpenShortcuts?: () => void;
  onOpenPublishModal?: () => void;
  onOpenProjectManager?: () => void;
  onOpenAnimatic?: () => void;
  onToggleFullscreen?: () => void;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  componentsVisibility?: ComponentVisibility;
  onChangeComponentsVisibility?: (next: ComponentVisibility) => void;
  saveState?: SaveState;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenR2Automation?: () => void;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  onOpenExportStudio?: (tab?: ExportModalTab) => void;
  onOpenWalkthrough?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenScreenRecorder?: () => void;
  currentView?: 'HOME' | 'STUDIO';
  onSelectView?: (view: 'HOME' | 'STUDIO') => void;
  currentShotIndex?: number;
  totalShots?: number;
  activePanel?: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM';
  onSelectPanel?: (panel: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER' | 'MULTICAM') => void;
  onSaveProjectJson?: () => void;
  onRestoreProjectJson?: () => void;
  frames?: AnthologyFrame[];
  onOpenContactSheet?: () => void;
  onOpenCompilationWizard?: () => void;
  playbackMode?: PlaybackMode;
  onSelectPlaybackMode?: (mode: PlaybackMode) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle = 'UNTITLED_CANVAS_01',
  activeMode = 'STAGE',
  onSelectMode,
  onGoHome,
  frames,
  onOpenContactSheet,
  onOpenCompilationWizard,
  playbackMode = 'sequence',
  onSelectPlaybackMode,
  isProMode = true,
  onToggleProMode,
  componentsBadgeText = '12/13 ON',
  onToggleComponentsPopover,
  onOpenThemeSettings,
  onOpenSelfTest,
  onOpenShortcuts,
  onOpenProjectManager,
  onOpenAnimatic,
  onOpenR2Automation,
  onOpenExportTimeline,
  onOpenExportRange,
  onOpenExportStudio,
  onOpenWalkthrough,
  onOpenScreenRecorder,
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenBloomSequencer,
  onOpenSettingsModal,
  onToggleTitles,
  showTitles = true,
  componentsVisibility,
  onChangeComponentsVisibility,
  currentView = 'HOME',
  onSelectView,
  currentShotIndex = 0,
  totalShots,
  activePanel = 'TACTILE_STAGE',
  onSelectPanel,
  onSaveProjectJson,
  onRestoreProjectJson
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEcosystemMenuOpen, setIsEcosystemMenuOpen] = useState(false);

  const activeFrame = frames && frames.length > 0
    ? frames[Math.max(0, Math.min(frames.length - 1, currentShotIndex))]
    : undefined;
  const activeShotDurationSec = getShotDurationSec(activeFrame, 12.0);
  const activeShotFps = getShotTargetFps(activeFrame, 24);
  const totalShotsCount = frames && frames.length > 0 ? frames.length : (totalShots || 100);
  const masterRuntimeSec = frames && frames.length > 0
    ? calculateMasterSequenceDuration(frames, 12.0)
    : totalShotsCount * activeShotDurationSec;
  const soloHudLabel = formatSoloShotTelemetry(currentShotIndex, activeShotDurationSec, activeShotFps);
  const masterRuntimeLabel = `TOTAL RUNTIME: ${formatRuntimeTimecode(masterRuntimeSec, activeShotFps)} // ${totalShotsCount} SHOTS`;

  // Explicit check of component visibility state for TopBar title toggle button
  const effectiveShowTitles = componentsVisibility !== undefined
    ? Boolean(
        componentsVisibility.titlesAll &&
        (componentsVisibility.titleBn !== false ||
          componentsVisibility.titleEn !== false ||
          componentsVisibility.tagline !== false)
      )
    : Boolean(showTitles);

  const handleTitleToggleClick = () => {
    const nextVisible = !effectiveShowTitles;
    console.log('[TopBar] Title toggle clicked — syncing with componentVisibility:', {
      previousTitlesVisible: effectiveShowTitles,
      nextTitlesVisible: nextVisible,
      componentsVisibility
    });

    if (onChangeComponentsVisibility && componentsVisibility) {
      const allSubChannelsOff =
        componentsVisibility.titleBn === false &&
        componentsVisibility.titleEn === false &&
        componentsVisibility.tagline === false;

      const nextVisibility: ComponentVisibility = {
        ...componentsVisibility,
        titlesAll: nextVisible,
        titleBn: nextVisible && allSubChannelsOff ? true : componentsVisibility.titleBn,
        titleEn: nextVisible && allSubChannelsOff ? true : componentsVisibility.titleEn,
        tagline: nextVisible && allSubChannelsOff ? true : componentsVisibility.tagline
      };
      onChangeComponentsVisibility(nextVisibility);
    } else if (onToggleTitles) {
      onToggleTitles();
    } else {
      useStudioStore.getState().toggleTitles();
    }
  };

  // Firebase Auth & Cloud Sync State
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>({ isSynced: false, lastSyncedAt: null, error: null });

  useEffect(() => {
    const unsubAuth = onAuthChange(u => setAuthUser(u));
    const unsubSync = firestoreSync.subscribeStatus(s => setCloudStatus(s));
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, []);

  const handleNavHome = () => {
    if (onSelectView) onSelectView('HOME');
    else if (onGoHome) onGoHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavTop10 = () => {
    if (currentView !== 'HOME') {
      onSelectView?.('HOME');
      setTimeout(() => {
        document.getElementById('top-10-reels-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById('top-10-reels-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavManifesto = () => {
    if (onOpenWalkthrough) onOpenWalkthrough();
  };

  // Printable Contact Sheet Generator
  const handleExportContactSheet = () => {
    if (frames && frames.length > 0) {
      downloadStoryboardPdf(frames, {
        projectTitle,
        directorName: 'Directorial Team',
        aspectRatio: '2.39:1',
        framesPerPage: 6,
        theme: 'print'
      });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectTitle} - Contact Sheet PDF</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "JetBrains Mono", monospace; background: #0a0a0f; color: #ededed; padding: 24px; margin: 0; }
            h1 { font-size: 22px; color: #f5a623; margin: 0 0 6px 0; border-bottom: 1px solid #333; padding-bottom: 10px; }
            .meta { font-size: 11px; color: #888; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
            .card { border: 1px solid #272732; background: #121218; border-radius: 4px; padding: 10px; }
            .thumb { height: 95px; background: #07070a; border: 1px solid #1a1a24; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #555; }
            .title { font-size: 11px; font-weight: bold; color: #f5a623; margin-top: 8px; }
            .sub { font-size: 9.5px; color: #aaa; margin-top: 2px; }
            @media print {
              body { background: #fff; color: #000; }
              .card { border-color: #ddd; background: #fafafa; }
              .thumb { background: #eee; border-color: #ccc; color: #666; }
              .title { color: #b37400; }
              .sub { color: #444; }
            }
          </style>
        </head>
        <body>
          <h1>RAWx Storyboard Contact Sheet // ${projectTitle}</h1>
          <div class="meta">24.0 FPS Master Anthology • 12.000s Slide Holds • Formatted for Print & PDF Export</div>
          <div class="grid">
            ${Array.from({ length: 16 }).map((_, i) => `
              <div class="card">
                <div class="thumb">◆ SHOT ${String(i + 1).padStart(3, '0')}</div>
                <div class="title">SH${String(i + 1).padStart(3, '0')} // KINETIC FLOW</div>
                <div class="sub">12.0s • 288 Frames @ 24fps • ARRI RAW</div>
              </div>
            `).join('')}
          </div>
          <script>
            setTimeout(() => { window.print(); }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <header className="h-18 sm:h-20 w-full bg-gradient-to-b from-[#070709]/98 via-[#070709]/90 to-transparent backdrop-blur-md sticky top-0 z-50 border-b border-white/10 select-none font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full h-full flex items-center justify-between">
        {/* Left: Brand HANDFILM + Minimal Nav Links */}
        <div className="flex items-center gap-6 sm:gap-10 min-w-0">
          {/* Brand Logo & Name with Obsidian Frosted Glass Hover Popover */}
          <div className="relative group/brand shrink-0">
            <div 
              onClick={handleNavHome}
              className="flex items-center gap-3.5 cursor-pointer py-1"
              title="HANDFILM — Sovereign NLE"
            >
              {/* Diamond Monogram in HANDFILM Cinema Red */}
              <div className="w-7 h-7 sm:w-8 sm:h-8 rotate-45 border-2 border-[#E50914] bg-gradient-to-tr from-[#8B0000] via-[#E50914] to-[#ff4d4d] flex items-center justify-center shadow-[0_0_18px_rgba(229,9,20,0.7)] group-hover/brand:shadow-[0_0_28px_rgba(229,9,20,1)] group-hover/brand:scale-105 transition-all">
                <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white font-black -rotate-45" />
              </div>

              <div className="flex flex-col leading-tight select-none">
                <div className="flex items-center tracking-wider text-xl sm:text-2xl md:text-3xl">
                  <span className="font-cinzel text-red-600 drop-shadow-[0_2px_14px_rgba(220,38,38,0.9)] font-black tracking-wider">
                    HAND
                  </span>
                  <span className="font-cinzel bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent font-black tracking-wider">
                    FILM
                  </span>
                </div>
                <span className="font-mono text-[9px] sm:text-[10px] text-[#F5A623] tracking-[0.24em] uppercase font-extrabold">
                  A T E L I E R &nbsp; C I N E M A T I C
                </span>
              </div>
            </div>

            {/* Brand Hover Popover: Obsidian frosted glass card */}
            <div className="absolute left-0 top-full mt-2 w-72 p-3.5 bg-[#0a0a12]/95 border border-[#d4af37]/40 rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.9)] backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/brand:opacity-100 group-hover/brand:translate-y-0 transition-all duration-200 z-50">
              <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_#dc2626]" />
                <span className="text-[10px] font-mono font-bold text-[#fbbf24] uppercase tracking-wider">
                  HANDFILM // SOVEREIGN ENGINE
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                Zero-cloud sovereign NLE designed for 12.0s cinematic rhythm, local browser GPU acceleration, and bilingual title design.
              </p>
              <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[8.5px] font-mono text-zinc-400">
                <span>24.0 FPS LOCKED</span>
                <span className="text-emerald-400 font-bold">LOCAL SILICON</span>
              </div>
            </div>
          </div>

          {/* Minimal Nav Links: Home, Top 10 Reels, Manifesto (Clean typography with gold underline) */}
          <nav className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm font-space-grotesk font-semibold tracking-wide">
            {/* 1. Home */}
            <div className="relative group/nav py-1">
              <button
                type="button"
                onClick={handleNavHome}
                className={`transition-colors cursor-pointer py-0.5 ${
                  currentView === 'HOME' ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Home</span>
                {/* Animated Gold Underline */}
                <span className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#fbbf24] to-[#f5a623] transition-all duration-300 ${
                  currentView === 'HOME' ? 'w-full' : 'w-0 group-hover/nav:w-full'
                }`} />
              </button>
              {/* Hover Summary Card */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 p-2.5 bg-[#0a0a12]/95 border border-[#d4af37]/35 rounded-[3px] shadow-2xl backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="text-[9.5px] font-mono font-bold text-[#fbbf24] mb-0.5">DIRECTOR HOME</div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-tight">10-Slide Cinema Hero Runner, Top 10 Master Shots & Anthology Specs.</div>
              </div>
            </div>

            {/* 2. Top 10 Reels */}
            <div className="relative group/nav py-1">
              <button
                type="button"
                onClick={handleNavTop10}
                className="transition-colors cursor-pointer text-zinc-400 hover:text-white py-0.5"
              >
                <span>Top 10 Reels</span>
                {/* Animated Gold Underline */}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#fbbf24] to-[#f5a623] transition-all duration-300 group-hover/nav:w-full" />
              </button>
              {/* Hover Summary Card */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 p-2.5 bg-[#0a0a12]/95 border border-[#d4af37]/35 rounded-[3px] shadow-2xl backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="text-[9.5px] font-mono font-bold text-[#fbbf24] mb-0.5">TOP 10 MASTER REELS</div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-tight">Curated 24fps master shots with 2.39:1 scope framing and audio telemetry.</div>
              </div>
            </div>

            {/* 3. Manifesto */}
            <div className="relative group/nav py-1">
              <button
                type="button"
                onClick={handleNavManifesto}
                className="transition-colors cursor-pointer text-zinc-400 hover:text-white py-0.5"
              >
                <span>Manifesto</span>
                {/* Animated Gold Underline */}
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#fbbf24] to-[#f5a623] transition-all duration-300 group-hover/nav:w-full" />
              </button>
              {/* Hover Summary Card */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 p-2.5 bg-[#0a0a12]/95 border border-[#d4af37]/35 rounded-[3px] shadow-2xl backdrop-blur-xl opacity-0 translate-y-1 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:translate-y-0 transition-all duration-200 z-50 text-left">
                <div className="text-[9.5px] font-mono font-bold text-[#fbbf24] mb-0.5">SOVEREIGN MANIFESTO</div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-tight">Guiding tenets of 12.0s timing, zero-cloud architecture, and hardware GPU render.</div>
              </div>
            </div>
          </nav>
        </div>

        {/* Right: Tactical Action Cluster + Dynamic Master Telemetry HUD */}
        <div className="gap-2.5 sm:gap-3 flex items-center shrink-0">
          {/* Dynamic Master Telemetry HUD Badge (Solo vs Master Sequence) */}
          <div className="hidden xl:block relative group/topbar-telemetry font-mono tabular-nums">
            <button
              type="button"
              onClick={() => {
                if (onSelectPlaybackMode) {
                  onSelectPlaybackMode(playbackMode === 'solo' ? 'sequence' : 'solo');
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                playbackMode === 'solo'
                  ? 'bg-black/75 border-[#F5A623]/45 hover:border-[#F5A623] text-[#F5A623]'
                  : 'bg-black/75 border-emerald-500/35 hover:border-emerald-400 text-emerald-300'
              }`}
              title="Dynamic Master Telemetry HUD — Click to toggle Shot Solo vs Master Sequence Runtime"
            >
              <span className="text-zinc-500">[</span>
              <span>{playbackMode === 'solo' ? soloHudLabel : masterRuntimeLabel}</span>
              <span className="text-zinc-500">]</span>
            </button>

            <div className="pointer-events-none absolute right-0 top-full mt-2 w-80 p-3 bg-[#0a0a12]/98 border border-[#d4af37]/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 group-hover/topbar-telemetry:opacity-100 group-hover/topbar-telemetry:translate-y-0 transition-all duration-200 z-50 text-left font-mono text-[10px] tabular-nums">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[#fbbf24] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  MASTER TELEMETRY HUD
                </span>
                <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623]">
                  {playbackMode === 'solo' ? 'SHOT SOLO' : 'SEQUENCE'}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Shot Solo:</span>
                  <span className="text-[#FFE066] font-bold">[ {soloHudLabel} ]</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Master Sequence:</span>
                  <span className="text-emerald-300 font-bold">[ {masterRuntimeLabel} ]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cloud Sync & Google Auth Pill */}
          {authUser ? (
            <div className="relative group/auth-user">
              <button
                type="button"
                onClick={signOutUser}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2 hover:border-emerald-400 cursor-pointer shadow-sm active:scale-95"
                title={`Signed in as ${authUser.email}. Click to Sign Out.`}
              >
                {authUser.photoURL ? (
                  <img src={authUser.photoURL} alt="User" className="w-4 h-4 rounded-full border border-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                )}
                <span className="hidden md:inline font-bold text-[11px] max-w-[90px] truncate">{authUser.displayName?.split(' ')[0] || 'Director'}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">SYNCED</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-b from-[#222234] via-[#161624] to-[#0c0c14] hover:from-[#2a2a40] hover:to-[#161624] border border-[#d4af37]/60 hover:border-[#fbbf24] text-zinc-100 hover:text-[#fbbf24] font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Sign in with Google to sync storyboards to Firestore"
            >
              <LogIn className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="hidden sm:inline font-bold text-[11px]">Sign In</span>
            </button>
          )}

          {/* ⚡ AUTO-COMPILE MUSIC VIDEO / DOCU Master Action */}
          {onOpenCompilationWizard && (
            <button
              type="button"
              onClick={onOpenCompilationWizard}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-b from-[#2d2008] via-[#1a1406] to-[#0c0a03] hover:from-[#3d2c0b] hover:to-[#241a08] border-2 border-[#f5a623] text-[#ffe066] hover:text-white font-mono font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_16px_rgba(245,166,35,0.4)] active:scale-[0.98]"
              title="1-Click Auto-Compile Multi-Clip Music Video & Documentary Suite"
            >
              <Zap className="w-3.5 h-3.5 fill-[#f5a623] text-[#f5a623]" />
              <span className="tracking-wide hidden lg:inline">⚡ AUTO-COMPILE MUSIC VIDEO / DOCU</span>
              <span className="tracking-wide lg:hidden">⚡ AUTO-COMPILE</span>
            </button>
          )}

          {/* Tactical Screen Recorder Trigger [ REC. ] (NO HOTKEY on face, shown in hover card) */}
          {onOpenScreenRecorder && (
            <div className="relative group/rec-btn">
              <button
                type="button"
                onClick={onOpenScreenRecorder}
                className="px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl bg-gradient-to-b from-rose-900/90 to-rose-950/90 hover:from-rose-800 hover:to-rose-900 border-2 border-rose-500/80 hover:border-rose-400 text-rose-200 hover:text-white font-mono font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_16px_rgba(244,63,94,0.35)] active:scale-[0.98]"
                title="Screen & Audio Recorder (Alt+R)"
              >
                <Circle className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse" />
                <span className="tracking-wide">REC.</span>
              </button>

              {/* Details Hover Card */}
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#0a0a12]/98 border border-rose-500/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 pointer-events-none group-hover/rec-btn:opacity-100 group-hover/rec-btn:translate-y-0 transition-all duration-200 z-50 text-left font-mono">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[9.5px] text-rose-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                    4K SCREEN RECORDER
                  </span>
                  <kbd className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[8.5px] font-bold">Alt+R</kbd>
                </div>
                <p className="text-[10px] text-zinc-300 font-sans leading-relaxed">
                  Record system display and studio audio at 4K/60fps directly into the persistent Media Vault.
                </p>
              </div>
            </div>
          )}

          {/* Unified EXPORT ▾ Dropdown with Chiseled Tactical Border */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsExportMenuOpen(prev => !prev);
                setIsEcosystemMenuOpen(false);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-b from-[#222234] via-[#161624] to-[#0c0c14] hover:from-[#2a2a40] hover:to-[#161624] border-2 border-[#d4af37]/80 hover:border-[#fbbf24] text-zinc-100 hover:text-[#fbbf24] font-mono font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_16px_rgba(245,166,35,0.25)] active:scale-[0.98]"
              title="Hollywood NLE Timelines, Video Master & Backup Exporters"
            >
              <Download className="w-4 h-4 text-[#fbbf24]" />
              <span className="tracking-wide">EXPORT ▾</span>
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a10]/98 border border-[#d4af37]/50 rounded-[3px] shadow-2xl p-1.5 z-50 font-mono text-[11px] space-y-1 backdrop-blur-2xl animate-in fade-in duration-150"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <div className="px-2.5 py-1 text-[8.5px] font-bold text-[#d4af37] border-b border-[#272732] uppercase tracking-wider flex items-center justify-between">
                  <span>UNIFIED TIMELINE EXPORTER</span>
                  <span className="text-zinc-500">24 FPS</span>
                </div>

                {/* 1. FCP 7 XML (Premiere Pro) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('premiere');
                    else if (onOpenExportTimeline) onOpenExportTimeline();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>FCP 7 XML (Premiere Pro)</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-300 font-bold">XML</span>
                </button>

                {/* 2. FCPXML (CapCut / DaVinci) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('fcpxml');
                    else if (onOpenExportTimeline) onOpenExportTimeline();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>FCPXML (CapCut / DaVinci)</span>
                  </div>
                  <span className="text-[8px] bg-[#38bdf8]/20 border border-[#38bdf8]/40 text-[#38bdf8] px-1.5 py-0.5 rounded font-bold">FCPXML</span>
                </button>

                {/* 3. MP4 Master (Hardware WebCodecs Render) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('mp4');
                    else if (onOpenExportRange) onOpenExportRange();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-emerald-950/40 border border-emerald-500/20 text-emerald-200 hover:text-emerald-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold">MP4 Master (WebCodecs Render)</span>
                  </div>
                  <span className="text-[8px] bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 px-1.5 py-0.5 rounded font-bold">H.264</span>
                </button>

                {/* 3b. Production Package (.zip) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('package');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-amber-950/40 border border-amber-500/20 text-amber-200 hover:text-amber-300 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold">Production Package (.zip)</span>
                  </div>
                  <span className="text-[8px] bg-amber-950/90 border border-amber-400/50 text-amber-300 px-1.5 py-0.5 rounded font-bold">NLE ZIP</span>
                </button>

                {/* 4. Contact Sheet PDF */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('pdf');
                    else handleExportContactSheet();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Contact Sheet PDF</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-300 font-bold">PDF</span>
                </button>

                {/* 5. Full Project Backup (.rawx) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenExportStudio) onOpenExportStudio('backup');
                    else exportFullIdbBackup();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-[2px] text-left hover:bg-white/10 text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors border-t border-[#272732] mt-1 pt-2"
                >
                  <div className="flex items-center gap-2">
                    <HardDriveDownload className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <span>Full Project Backup (.rawx)</span>
                  </div>
                  <span className="text-[8px] bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fbbf24] px-1.5 py-0.5 rounded font-bold">RAWX</span>
                </button>
              </div>
            )}
          </div>

          {/* STUDIO or HOME toggle (Tactile 3D button) */}
          {currentView === 'HOME' ? (
            <button
              type="button"
              onClick={() => onSelectView?.('STUDIO')}
              className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border-2 border-red-400 text-white font-mono font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_22px_rgba(220,38,38,0.7)] hover:shadow-[0_0_28px_rgba(220,38,38,0.95)] active:scale-[0.98]"
              title="Launch Active 12.0s 24fps Previs & Cut Studio"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="tracking-wider">STUDIO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectView?.('HOME')}
              className="px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#202030] to-[#12121c] hover:from-[#28283c] hover:to-[#181824] border-2 border-[#E50914]/80 hover:border-[#E50914] text-white font-mono font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_16px_rgba(229,9,20,0.35)] active:scale-[0.98]"
              title="Return to HANDFILM Home Page"
            >
              <Home className="w-3.5 h-3.5 text-[#E50914]" />
              <span className="tracking-wider">HOME</span>
            </button>
          )}

          {/* Kinetic Hero Titles Toggle: Symbol "T" ONLY */}
          {(onToggleTitles || onChangeComponentsVisibility) && (
            <div className="relative group/title-toggle">
              <button
                type="button"
                onClick={handleTitleToggleClick}
                aria-pressed={effectiveShowTitles}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-serif text-base sm:text-lg font-black flex items-center justify-center cursor-pointer transition-all border-2 shadow-sm active:scale-95 ${
                  effectiveShowTitles
                    ? 'bg-[#d4af37]/25 border-[#d4af37] text-[#ffe066] shadow-[0_0_16px_rgba(212,175,55,0.45)]'
                    : 'bg-[#12131d] hover:bg-[#1c1d2c] border-[#2f3246] text-zinc-400 hover:text-white'
                }`}
                title="Toggle Kinetic Hero Typography (T)"
                aria-label="Toggle Kinetic Hero Typography"
              >
                <span>T</span>
              </button>

              {/* Details Hover Card */}
              <div className="absolute right-0 top-full mt-2 w-56 p-2.5 bg-[#0a0a12]/98 border border-[#d4af37]/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 pointer-events-none group-hover/title-toggle:opacity-100 group-hover/title-toggle:translate-y-0 transition-all duration-200 z-50 text-left font-mono">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase tracking-wider">
                  <span>KINETIC TITLES</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">T</kbd>
                </div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-tight">
                  Status: <span className={effectiveShowTitles ? 'text-amber-400 font-bold' : 'text-zinc-500 font-bold'}>{effectiveShowTitles ? 'ON' : 'OFF'}</span>. Bilingual Bangla-English typography overlays.
                </div>
              </div>
            </div>
          )}

          {/* Components Visibility Matrix Trigger (V) */}
          {onToggleComponentsPopover && (
            <div className="relative group/matrix-toggle">
              <button
                type="button"
                onClick={onToggleComponentsPopover}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#12131d] hover:bg-[#1c1d2c] border-2 border-[#2f3246] hover:border-[#d4af37] text-[#fbbf24] flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
                title="Components Visibility Matrix & Title Opacity (V)"
                aria-label="Open Components Visibility Matrix"
              >
                <Layers className="w-4 h-4 text-[#fbbf24]" />
              </button>

              <div className="absolute right-0 top-full mt-2 w-56 p-2.5 bg-[#0a0a12]/98 border border-[#d4af37]/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 pointer-events-none group-hover/matrix-toggle:opacity-100 group-hover/matrix-toggle:translate-y-0 transition-all duration-200 z-50 text-left font-mono">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/10 text-[9px] text-[#fbbf24] font-bold uppercase tracking-wider">
                  <span>COMPONENTS MATRIX</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">V</kbd>
                </div>
                <div className="text-[9.5px] text-zinc-300 font-sans leading-tight">
                  Layers: <span className="text-amber-400 font-bold tabular-nums">{componentsBadgeText}</span>. Toggle Titles, Telemetry HUD, Post FX & Title Opacity.
                </div>
              </div>
            </div>
          )}

          {/* Shortcuts: Stylized icon-only button (⌘/⌨) displaying a floating hotkey cheat sheet on hover */}
          <div className="relative group/shortcuts">
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#12131d] hover:bg-[#1c1d2c] border-2 border-[#2f3246] hover:border-[#F5A623] text-[#F5A623] font-mono text-sm sm:text-base flex items-center justify-center cursor-pointer transition-all shadow-md active:scale-95"
              title="Keyboard Shortcuts Cheat Sheet (⌘ / ⌨)"
            >
              <span className="font-bold text-sm sm:text-base leading-none select-none">⌘</span>
            </button>

            {/* Floating Hotkey Cheat Sheet Popover on Hover */}
            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[#0a0a12]/98 border border-[#F5A623]/40 rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 pointer-events-none group-hover/shortcuts:opacity-100 group-hover/shortcuts:translate-y-0 transition-all duration-200 z-50 text-left font-mono">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-[9px] text-[#F5A623] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Keyboard className="w-3 h-3" />
                  HOTKEY CHEAT SHEET
                </span>
                <span className="text-zinc-500">PRESS ?</span>
              </div>
              <div className="space-y-1.5 text-[9.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Play / Pause</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">SPACE</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Prev / Next Shot</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">← / →</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">NLE Transport Scrub</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">J • K • L</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Export Studio</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">⌘ + E</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Multi-Cam Angle Grid</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">Shift + M</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Command Palette</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-zinc-700 text-[#fbbf24] text-[8.5px]">⌘ + K</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Right APPS Menu (Replaces ECOSYSTEM): HUB, VAULT, R2 / STREAM, BLOOM-APP, DEEPER, LAB, SETTINGS */}
          <div className="relative">
            <button
              onClick={() => {
                setIsEcosystemMenuOpen(prev => !prev);
                setIsExportMenuOpen(false);
              }}
              className="px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl bg-[#12131d] hover:bg-[#1c1d2c] border-2 border-[#2f3246] hover:border-zinc-300 text-zinc-200 hover:text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              title="Creative Suite Applications & Master Hub"
            >
              <Globe className="w-4 h-4 text-[#fbbf24]" />
              <span className="hidden sm:inline tracking-wider">APPS</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isEcosystemMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a10]/98 border border-[#272732] rounded shadow-2xl p-1.5 z-50 font-mono text-[11px] space-y-1 backdrop-blur-2xl animate-in fade-in duration-150"
                onMouseLeave={() => setIsEcosystemMenuOpen(false)}
              >
                <div className="px-2.5 py-1 text-[8.5px] font-bold text-[#fbbf24] border-b border-[#272732] uppercase tracking-wider flex items-center justify-between">
                  <span>CREATIVE SUITE APPS</span>
                  <span className="text-zinc-500">LIVE</span>
                </div>


                {/* 1. HUB */}
                <a
                  href="https://hub.handsandhead.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#fbbf24]" />
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
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold">VAULT</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500">Project Manager</span>
                </button>

                {/* 3. R2 / STREAM */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenR2Automation) onOpenR2Automation();
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-rose-300 hover:text-rose-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold">R2 / STREAM</span>
                  </div>
                  <span className="text-[8.5px] text-rose-500/80">Cloudflare R2</span>
                </button>

                {/* 4. BLOOM-APP */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBloomSequencer) onOpenBloomSequencer();
                    else if (onSelectMode) onSelectMode('BLOOM');
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-rose-300 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-bold">BLOOM-APP</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500">Sequencer Node</span>
                </button>

                {/* 5. DEEPER */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenVideoScopes) onOpenVideoScopes();
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-emerald-300 hover:text-emerald-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold">DEEPER</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500">Video Scopes</span>
                </button>

                {/* 6. LAB */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAiStudio) onOpenAiStudio();
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-amber-300 hover:text-amber-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold">LAB</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500">Flow AI Director</span>
                </button>

                {/* 7. SETTINGS */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSettingsModal) onOpenSettingsModal();
                    else if (onOpenThemeSettings) onOpenThemeSettings();
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer transition-colors border-t border-[#272732] mt-1 pt-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <span className="font-bold">SETTINGS</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500">Quotas & Diagnostics</span>
                </button>

                {/* SOVEREIGN SESSION PERSISTENCE & BACKUP */}
                <div className="pt-1.5 mt-1 border-t border-[#272732] flex flex-col gap-1">
                  <div className="px-2 py-0.5 text-[8.5px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                    <span>SOVEREIGN SESSION</span>
                    <span className="text-[7.5px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-1 rounded">AUTOSAVED</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSaveProjectJson?.();
                      setIsEcosystemMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded text-left hover:bg-cyan-500/15 text-cyan-300 hover:text-white flex items-center justify-between cursor-pointer transition-colors border border-cyan-500/30"
                    title="Export full project session state to JSON file"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold">💾 Save Project State (.JSON)</span>
                    </div>
                    <span className="text-[8px] text-cyan-400/80 font-mono">.JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onRestoreProjectJson?.();
                      setIsEcosystemMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded text-left hover:bg-amber-500/15 text-amber-300 hover:text-white flex items-center justify-between cursor-pointer transition-colors border border-amber-500/30"
                    title="Restore project session from JSON file"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold">📁 Restore JSON</span>
                    </div>
                    <span className="text-[8px] text-amber-400/80 font-mono">IMPORT</span>
                  </button>
                </div>

                {/* 8. KEYBOARD SHORTCUTS (?) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenShortcuts) onOpenShortcuts();
                    setIsEcosystemMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-[#F5A623] hover:text-[#FFE066] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-[#F5A623]" />
                    <span className="font-bold">SHORTCUTS CHEAT SHEET</span>
                  </div>
                  <span className="text-[8.5px] bg-[#F5A623]/20 border border-[#F5A623]/40 px-1 rounded text-[#F5A623] font-bold">?</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
