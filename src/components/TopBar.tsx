/**
 * @file /src/components/TopBar.tsx
 * @description Master Editorial Cinema TopBar for HANDFILM:
 * - Left: Cinema Red Diamond Monogram, HANDFILM brand, minimal nav links (Home, Top 10 Reels, Manifesto)
 * - Right: Tactical action cluster ([ ? MANIFESTO ], [ EXPORT XML ], [ ▶ PRO STUDIO ] / [ HOME ])
 * - Zero pill collision or wrap; secondary studio tools neatly accessible via overflow menu.
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
  Sparkles
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
  onOpenWalkthrough?: () => void;
  currentView?: 'HOME' | 'STUDIO';
  onSelectView?: (view: 'HOME' | 'STUDIO') => void;
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
  onOpenWalkthrough,
  currentView = 'HOME',
  onSelectView
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

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

  return (
    <header className="h-16 w-full bg-gradient-to-b from-[#070709]/95 via-[#070709]/75 to-transparent backdrop-blur-md sticky top-0 z-50 border-b border-white/5 select-none font-sans">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full h-full flex items-center justify-between">
        {/* Left: Brand HANDFILM + Minimal Nav Links */}
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
        {/* Brand Logo & Name */}
        <div 
          onClick={handleNavHome}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          title="HANDFILM — Return to Home"
        >
          {/* Diamond Monogram in HANDFILM Cinema Red */}
          <div className="w-5 h-5 rotate-45 border border-[#E50914] bg-gradient-to-tr from-[#8B0000] via-[#E50914] to-[#ff4d4d] flex items-center justify-center shadow-[0_0_14px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_20px_rgba(229,9,20,0.8)] transition-all">
            <Film className="w-2.5 h-2.5 text-white font-black -rotate-45" />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="font-cinzel font-black text-sm sm:text-base text-[#E50914] tracking-[0.22em] group-hover:text-white transition-colors">
              HANDFILM
            </span>
            <span className="font-mono text-[7px] sm:text-[7.5px] text-[#F5A623] tracking-[0.18em] uppercase">
              24FPS PREVIS & NLE
            </span>
          </div>
        </div>

        {/* Minimal Nav Links: Home, Top 10 Reels, Manifesto with gap-6 text-xs text-zinc-400 */}
        <nav className="flex items-center gap-6 text-xs text-zinc-400 font-medium">
          <button
            type="button"
            onClick={handleNavHome}
            className={`transition-colors cursor-pointer hover:text-white ${
              currentView === 'HOME' ? 'text-white font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={handleNavTop10}
            className="transition-colors cursor-pointer hover:text-white"
          >
            Top 10 Reels
          </button>
          <button
            type="button"
            onClick={handleNavManifesto}
            className="transition-colors cursor-pointer hover:text-white"
          >
            Manifesto
          </button>
        </nav>
      </div>

      {/* Right: Tactical Action Cluster (gap-3 flex items-center) */}
      <div className="gap-3 flex items-center shrink-0">
        {/* [ ? MANIFESTO ] */}
        {onOpenWalkthrough && (
          <button
            type="button"
            onClick={onOpenWalkthrough}
            className="px-3.5 py-1.5 rounded-full bg-[#101018]/80 hover:bg-[#F5A623]/15 border border-[#F5A623]/40 hover:border-[#F5A623] text-[#F5A623] font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-sm active:scale-[0.98]"
            title="Open HANDFILM Director's Manifesto (10 Interactive Slides)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>[ ? MANIFESTO ]</span>
          </button>
        )}

        {/* [ EXPORT XML ] */}
        {onOpenExportTimeline && (
          <button
            type="button"
            onClick={onOpenExportTimeline}
            className="px-3.5 py-1.5 rounded-full bg-[#101018]/80 hover:bg-[#181824] border border-[#d4af37]/60 hover:border-[#d4af37] text-zinc-200 hover:text-[#fbbf24] font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-sm active:scale-[0.98]"
            title="Export Timeline XML (Premiere Pro, CapCut Desktop & DaVinci Resolve)"
          >
            <Film className="w-3.5 h-3.5 text-[#eab308]" />
            <span>[ EXPORT XML ]</span>
          </button>
        )}

        {/* [ ▶ PRO STUDIO ] (Solid red #E50914 pill) or [ HOME ] toggle */}
        {currentView === 'HOME' ? (
          <button
            type="button"
            onClick={() => onSelectView?.('STUDIO')}
            className="px-4 py-1.5 rounded-full bg-[#E50914] hover:bg-[#ff1e2b] text-white font-bold text-[11px] sm:text-xs flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_15px_rgba(229,9,20,0.5)] hover:shadow-[0_0_20px_rgba(229,9,20,0.8)] active:scale-[0.98]"
            title="Launch Active 12.0s 24fps Previs & Cut Engine"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>[ ▶ PRO STUDIO ]</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectView?.('HOME')}
            className="px-4 py-1.5 rounded-full bg-[#1b1b24] hover:bg-[#252532] border border-[#E50914]/60 text-white font-bold text-[11px] sm:text-xs flex items-center gap-2 cursor-pointer transition-all duration-150 active:scale-[0.98]"
            title="Return to HANDFILM Home Page"
          >
            <Home className="w-3 h-3 text-[#E50914]" />
            <span>[ HOME ]</span>
          </button>
        )}

        {/* Tactical Studio Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMoreMenuOpen(prev => !prev)}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            title="More Studio Tools & Settings"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMoreMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-56 bg-black/95 border border-[#272732] rounded-md shadow-2xl p-1.5 z-50 font-mono text-[11px] space-y-0.5 backdrop-blur-2xl animate-in fade-in duration-150"
              onMouseLeave={() => setIsMoreMenuOpen(false)}
            >
              {onOpenAnimatic && (
                <button
                  onClick={() => { onOpenAnimatic(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-3 h-3 text-[#d4af37]" />
                    <span>Animatic Cinema Player</span>
                  </div>
                  <span className="text-[8px] bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#fbbf24] px-1 py-0.2 rounded font-bold">
                    PREVIEW
                  </span>
                </button>
              )}

              {onOpenExportRange && (
                <button
                  onClick={() => { onOpenExportRange(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Video className="w-3 h-3 text-[#eab308]" />
                    <span>Export MP4 Range</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-1 py-0.2 rounded text-zinc-400">
                    MP4
                  </span>
                </button>
              )}

              {onOpenProjectManager && (
                <button
                  onClick={() => { onOpenProjectManager(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3 text-[#d4af37]" />
                  <span>Project Vault Manager</span>
                </button>
              )}

              {onToggleComponentsPopover && (
                <button
                  onClick={() => { onToggleComponentsPopover(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-[#d4af37]" />
                    <span>Components Matrix</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-1 py-0.2 rounded text-zinc-400">
                    {componentsBadgeText}
                  </span>
                </button>
              )}

              {onOpenThemeSettings && (
                <button
                  onClick={() => { onOpenThemeSettings(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center gap-2 cursor-pointer"
                >
                  <Palette className="w-3 h-3 text-[#d4af37]" />
                  <span>Theme & Appearance</span>
                </button>
              )}

              {onToggleProMode && (
                <button
                  onClick={() => { onToggleProMode(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3 h-3 text-[#d4af37]" />
                    <span>Studio Layout Mode</span>
                  </div>
                  <span className="px-1.5 py-0.2 bg-[#d4af37]/20 text-[#fbbf24] text-[8px] rounded font-bold">
                    {isProMode ? 'PRO' : 'SIMPLE'}
                  </span>
                </button>
              )}

              {onOpenR2Automation && (
                <button
                  onClick={() => { onOpenR2Automation(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-rose-400 hover:text-rose-300 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3 h-3 text-rose-500" />
                    <span>R2 & Automation Engine</span>
                  </div>
                  <span className="text-[8px] bg-rose-950/60 border border-rose-500/40 text-rose-300 px-1 py-0.2 rounded font-bold">
                    CF R2
                  </span>
                </button>
              )}

              {onOpenSelfTest && (
                <button
                  onClick={() => { onOpenSelfTest(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center gap-2 cursor-pointer"
                >
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Self-Test Diagnostics</span>
                </button>
              )}

              {onOpenShortcuts && (
                <button
                  onClick={() => { onOpenShortcuts(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-zinc-200 hover:text-[#fbbf24] flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3 text-[#d4af37]" />
                  <span>Keyboard Shortcuts (?)</span>
                </button>
              )}

              <div className="border-t border-[#272732] my-1" />

              <button
                onClick={() => { exportFullIdbBackup(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-[#fbbf24] flex items-center gap-2 cursor-pointer"
              >
                <HardDriveDownload className="w-3 h-3 text-[#d4af37]" />
                <span>Backup Local Database</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};
