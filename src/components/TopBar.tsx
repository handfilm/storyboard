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

import React, { useState } from 'react';
import { WorkspaceMode } from '../core/theme';
import { SaveState } from '../core/storage';
import { exportFullIdbBackup } from '../utils/backup';
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
  Type
} from 'lucide-react';

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
  saveState?: SaveState;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onOpenR2Automation?: () => void;
  onOpenExportTimeline?: () => void;
  onOpenExportRange?: () => void;
  onOpenExportStudio?: (tab?: 'mp4' | 'premiere' | 'fcpxml' | 'pdf' | 'backup') => void;
  onOpenWalkthrough?: () => void;
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenSettingsModal?: () => void;
  currentView?: 'HOME' | 'STUDIO';
  onSelectView?: (view: 'HOME' | 'STUDIO') => void;
  currentShotIndex?: number;
  totalShots?: number;
  activePanel?: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER';
  onSelectPanel?: (panel: 'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle = 'UNTITLED_CANVAS_01',
  activeMode = 'STAGE',
  onSelectMode,
  onGoHome,
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
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenBloomSequencer,
  onOpenSettingsModal,
  onToggleTitles,
  showTitles = true,
  currentView = 'HOME',
  onSelectView,
  currentShotIndex = 0,
  totalShots = 100,
  activePanel = 'TACTILE_STAGE',
  onSelectPanel
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEcosystemMenuOpen, setIsEcosystemMenuOpen] = useState(false);

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
    <header className="h-16 w-full bg-gradient-to-b from-[#070709]/95 via-[#070709]/75 to-transparent backdrop-blur-md sticky top-0 z-50 border-b border-white/5 select-none font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full h-full flex items-center justify-between">
        {/* Left: Brand HANDFILM + Minimal Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
          {/* Brand Logo & Name with Obsidian Frosted Glass Hover Popover */}
          <div className="relative group/brand shrink-0">
            <div 
              onClick={handleNavHome}
              className="flex items-center gap-3 cursor-pointer py-1"
              title="HANDFILM — Sovereign NLE"
            >
              {/* Diamond Monogram in HANDFILM Cinema Red */}
              <div className="w-5 h-5 rotate-45 border border-[#E50914] bg-gradient-to-tr from-[#8B0000] via-[#E50914] to-[#ff4d4d] flex items-center justify-center shadow-[0_0_14px_rgba(229,9,20,0.6)] group-hover/brand:shadow-[0_0_22px_rgba(229,9,20,0.95)] group-hover/brand:scale-105 transition-all">
                <Film className="w-2.5 h-2.5 text-white font-black -rotate-45" />
              </div>

              <div className="flex flex-col leading-tight select-none">
                <div className="flex items-center tracking-wider text-sm sm:text-base">
                  <span className="font-cinzel text-red-600 drop-shadow-[0_2px_12px_rgba(220,38,38,0.85)] font-black tracking-wider">
                    HAND
                  </span>
                  <span className="font-cinzel bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-black tracking-wider">
                    FILM
                  </span>
                </div>
                <span className="font-mono text-[7px] sm:text-[7.5px] text-[#F5A623] tracking-[0.18em] uppercase font-bold">
                  AI REELS STUDIO
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

          {/* If Studio Mode: Primary View Switcher Tabs; If Home Mode: Minimal Nav Links */}
          {currentView === 'STUDIO' ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* [ Stage ] */}
              <div className="relative group/tab">
                <button
                  type="button"
                  onClick={() => onSelectPanel ? onSelectPanel('TACTILE_STAGE') : onSelectMode?.('STAGE')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
                    (activePanel === 'TACTILE_STAGE' || activeMode === 'STAGE')
                      ? 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/50 shadow-[0_0_15px_rgba(245,166,35,0.25)]'
                      : 'bg-[#0c0d10]/80 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Film className={`w-4 h-4 transition-transform duration-150 ${(activePanel === 'TACTILE_STAGE' || activeMode === 'STAGE') ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
                  <span>Stage</span>
                </button>

                {/* Hover Card for Stage */}
                <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/30 p-3 rounded-xl shadow-2xl backdrop-blur-xl absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
                    <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                      DIRECTOR'S CANVAS
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Single-shot composition, framing, and live overlays.
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>2.39:1 ANAMORPHIC</span>
                    <span className="text-amber-400 font-bold">LIVE COMPOSITOR</span>
                  </div>
                </div>
              </div>

              {/* [ 12.0s Reels ] */}
              <div className="relative group/tab">
                <button
                  type="button"
                  onClick={() => onSelectPanel ? onSelectPanel('SPLIT') : onSelectMode?.('BOARD')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
                    (activePanel === 'SPLIT' || activeMode === 'BOARD')
                      ? 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/50 shadow-[0_0_15px_rgba(245,166,35,0.25)]'
                      : 'bg-[#0c0d10]/80 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Sliders className={`w-4 h-4 transition-transform duration-150 ${(activePanel === 'SPLIT' || activeMode === 'BOARD') ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
                  <span>12.0s Reels</span>
                </button>

                {/* Hover Card for 12.0s Reels */}
                <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/30 p-3 rounded-xl shadow-2xl backdrop-blur-xl absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
                    <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                      TIMELINE PACING
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Full 100-shot sequence overview and rhythm audit.
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>12.000s QUANTIZED</span>
                    <span className="text-sky-400 font-bold">100-SHOT SEQUENCE</span>
                  </div>
                </div>
              </div>

              {/* [ Monitor ] */}
              <div className="relative group/tab">
                <button
                  type="button"
                  onClick={() => onSelectPanel ? onSelectPanel('OPTICAL') : onSelectMode?.('STAGE')}
                  className={`px-5 py-2 rounded-xl text-sm font-bold tracking-wider transition-all duration-200 border cursor-pointer select-none flex items-center gap-2 active:scale-[0.98] ${
                    activePanel === 'OPTICAL'
                      ? 'bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/50 shadow-[0_0_15px_rgba(245,166,35,0.25)]'
                      : 'bg-[#0c0d10]/80 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Maximize2 className={`w-4 h-4 transition-transform duration-150 ${activePanel === 'OPTICAL' ? 'text-[#F5A623] scale-105' : 'text-slate-400'}`} />
                  <span>Monitor</span>
                </button>

                {/* Hover Card for Monitor */}
                <div className="pointer-events-none z-50 bg-[#08090C]/95 border border-[#F5A623]/30 p-3 rounded-xl shadow-2xl backdrop-blur-xl absolute left-0 top-full mt-2 w-72 text-left opacity-0 translate-y-1 group-hover/tab:opacity-100 group-hover/tab:translate-y-0 transition-all duration-150 ease-out font-sans">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
                    <span className="w-2 h-2 rounded-full bg-[#F5A623] shadow-[0_0_6px_#F5A623]" />
                    <span className="text-xs font-bold text-[#F5A623] tracking-wider uppercase font-mono">
                      CLEAN PREVIEW
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Zero-UI theatrical reference output with 2.39:1 scope.
                  </p>
                  <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>ZERO INTERFERENCE</span>
                    <span className="text-emerald-400 font-bold">2.39:1 REFERENCE</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Minimal Nav Links: Home, Top 10 Reels, Manifesto (Orbitron / Space Grotesk with gold underline and summary cards) */
            <nav className="flex items-center gap-5 sm:gap-7 text-xs font-space-grotesk font-semibold tracking-wide">
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
          )}
        </div>

        {/* Relocated Minimal Telemetry Strip (Pinned to the Far Right Cluster) */}
        <div className="flex items-center space-x-3 ml-auto text-xs font-mono relative group/telemetry cursor-default mr-3 shrink-0">
          {/* Minimal Default Display */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* [ SH001 / 100 ] */}
            <div className="px-2.5 py-1 rounded-lg bg-[#0c0d10]/90 border border-white/10 text-slate-300 font-mono text-xs flex items-center gap-1 group-hover/telemetry:border-[#F5A623]/50 group-hover/telemetry:text-white transition-all duration-150">
              <span className="text-[#F5A623] font-bold">[</span>
              <span className="text-[#F5A623] font-bold">SH{String(currentShotIndex + 1).padStart(3, '0')}</span>
              <span className="text-slate-500">/</span>
              <span>{totalShots}</span>
              <span className="text-[#F5A623] font-bold">]</span>
            </div>

            {/* [ 288 F // 24 FPS ] */}
            <div className="hidden sm:flex px-2.5 py-1 rounded-lg bg-[#0c0d10]/90 border border-white/10 text-slate-300 font-mono text-xs items-center gap-1 group-hover/telemetry:border-[#F5A623]/50 group-hover/telemetry:text-white transition-all duration-150">
              <span className="text-slate-400 font-bold">[</span>
              <span className="font-semibold">288 F</span>
              <span className="text-slate-600">//</span>
              <span className="text-slate-400">24 FPS</span>
              <span className="text-slate-400 font-bold">]</span>
            </div>

            {/* [ 12.0s ] */}
            <div className="px-2.5 py-1 rounded-lg bg-[#0c0d10]/90 border border-white/10 text-[#F5A623] font-mono text-xs flex items-center gap-1 font-bold group-hover/telemetry:border-[#F5A623]/50 shadow-sm transition-all duration-150">
              <span className="text-slate-400 font-bold">[</span>
              <span>12.0s</span>
              <span className="text-slate-400 font-bold">]</span>
            </div>
          </div>

          {/* Expanded Telemetry Hover Card */}
          <div className="absolute right-0 top-full mt-2 w-80 pointer-events-none z-50 bg-[#08090C]/98 border border-[#F5A623]/40 p-4 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] backdrop-blur-2xl opacity-0 translate-y-1 group-hover/telemetry:opacity-100 group-hover/telemetry:translate-y-0 transition-all duration-150 ease-out text-left">
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
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-400">Total Shots:</span>
                <span className="text-white font-bold">{totalShots} Master Blocks</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-400">Current Shot:</span>
                <span className="text-[#F5A623] font-bold">
                  Shot {String(currentShotIndex + 1).padStart(3, '0')} (12.000s Allocated)
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-400">Frame Budget:</span>
                <span className="text-slate-200 font-bold">288 Frames @ 24.000 FPS Cinema Lock</span>
              </div>
              <div className="flex items-center justify-between py-0.5 border-t border-white/5 pt-2">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                  Local Cache Synced (IndexedDB)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tactical Action Cluster */}
        <div className="gap-2 sm:gap-2.5 flex items-center shrink-0">
          {/* Unified EXPORT ▾ Dropdown with Chiseled Tactical Border */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsExportMenuOpen(prev => !prev);
                setIsEcosystemMenuOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-[3px] bg-gradient-to-b from-[#181824] to-[#0c0c14] hover:from-[#202030] hover:to-[#12121c] border-2 border-[#d4af37]/70 hover:border-[#fbbf24] text-zinc-100 hover:text-[#fbbf24] font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-[0_0_12px_rgba(245,166,35,0.2)] active:scale-[0.98]"
              title="Hollywood NLE Timelines, Video Master & Backup Exporters"
            >
              <Download className="w-3.5 h-3.5 text-[#fbbf24]" />
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

          {/* STUDIO or HOME toggle (Clean gradient pill with active glow, 'Pro' strictly removed) */}
          {currentView === 'HOME' ? (
            <button
              type="button"
              onClick={() => onSelectView?.('STUDIO')}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border border-red-400/80 text-white font-mono font-black text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-[0_0_20px_rgba(220,38,38,0.65)] hover:shadow-[0_0_26px_rgba(220,38,38,0.9)] active:scale-[0.98]"
              title="Launch Active 12.0s 24fps Previs & Cut Studio"
            >
              <Play className="w-3 h-3 fill-current" />
              <span className="tracking-wider">STUDIO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectView?.('HOME')}
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#1c1c28] to-[#101018] hover:from-[#242434] hover:to-[#141420] border border-[#E50914]/70 hover:border-[#E50914] text-white font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-[0_0_12px_rgba(229,9,20,0.3)] active:scale-[0.98]"
              title="Return to HANDFILM Home Page"
            >
              <Home className="w-3 h-3 text-[#E50914]" />
              <span className="tracking-wider">HOME</span>
            </button>
          )}

          {/* Kinetic Hero Titles Quick Toggle */}
          {onToggleTitles && (
            <button
              type="button"
              onClick={onToggleTitles}
              className={`px-3 py-1.5 rounded-full font-mono text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all border shadow-sm active:scale-95 ${
                showTitles
                  ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#ffe066] shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                  : 'bg-[#101018]/90 hover:bg-[#181824] border-[#272732] text-zinc-400 hover:text-white'
              }`}
              title="Toggle Kinetic Hero Typography (T)"
            >
              <Type className={`w-3.5 h-3.5 ${showTitles ? 'text-[#ffe066]' : 'text-zinc-500'}`} />
              <span className="hidden md:inline">{showTitles ? 'TITLES: ON' : 'TITLES: OFF'}</span>
              <span className="md:hidden">TXT</span>
            </button>
          )}

          {/* Shortcuts: Stylized icon-only button (⌘/⌨) displaying a floating hotkey cheat sheet on hover */}
          <div className="relative group/shortcuts">
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="w-8 h-8 rounded-full bg-[#101018]/90 hover:bg-[#181824] border border-[#272732] hover:border-[#F5A623]/80 text-[#F5A623] font-mono text-xs flex items-center justify-center cursor-pointer transition-all shadow-sm active:scale-95"
              title="Keyboard Shortcuts Cheat Sheet (⌘ / ⌨)"
            >
              <span className="font-bold text-[13px] leading-none select-none">⌘</span>
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
              className="px-3 py-1.5 rounded-full bg-[#101018]/90 hover:bg-[#181824] border border-[#272732] hover:border-zinc-400 text-zinc-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              title="Creative Suite Applications & Master Hub"
            >
              <Globe className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="hidden sm:inline font-bold tracking-wider">APPS</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
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
