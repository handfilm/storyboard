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
import { CutNativeExportModal } from './CutNativeExportModal';
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
  ChevronDown
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
  onOpenVideoScopes?: () => void;
  onOpenAiStudio?: () => void;
  onOpenBloomSequencer?: () => void;
  onOpenSettingsModal?: () => void;
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
  onOpenVideoScopes,
  onOpenAiStudio,
  onOpenBloomSequencer,
  onOpenSettingsModal,
  currentView = 'HOME',
  onSelectView
}) => {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEcosystemMenuOpen, setIsEcosystemMenuOpen] = useState(false);
  const [isNativeExportOpen, setIsNativeExportOpen] = useState(false);

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

          {/* Minimal Nav Links: Home, Top 10 Reels, Manifesto */}
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

        {/* Right: Tactical Action Cluster */}
        <div className="gap-3 flex items-center shrink-0">
          {/* Unified EXPORT ▾ Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsExportMenuOpen(prev => !prev);
                setIsEcosystemMenuOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-[3px] bg-gradient-to-b from-[#181824] to-[#0c0c14] hover:from-[#202030] hover:to-[#12121c] border border-[#d4af37]/60 hover:border-[#fbbf24] text-zinc-100 hover:text-[#fbbf24] font-mono font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-all duration-150 shadow-[0_0_12px_rgba(245,166,35,0.15)] active:scale-[0.98]"
              title="Hollywood NLE Timelines, Video Master & Backup Exporters"
            >
              <Download className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>EXPORT ▾</span>
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
                    if (onOpenExportTimeline) onOpenExportTimeline();
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
                    if (onOpenExportTimeline) onOpenExportTimeline();
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
                    setIsNativeExportOpen(true);
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
                    handleExportContactSheet();
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
                    exportFullIdbBackup();
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

          {/* PRO STUDIO or HOME toggle (tactile HUD style, zero third brackets) */}
          {currentView === 'HOME' ? (
            <button
              type="button"
              onClick={() => onSelectView?.('STUDIO')}
              className="px-4 py-1.5 rounded-[3px] bg-gradient-to-b from-[#ff1e2b] to-[#b3000b] hover:from-[#ff3843] hover:to-[#cc000d] border border-red-400/80 text-white font-mono font-black text-[11px] sm:text-xs flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_18px_rgba(229,9,20,0.6)] active:scale-[0.98]"
              title="Launch Active 12.0s 24fps Previs & Cut Engine"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>▶ PRO STUDIO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectView?.('HOME')}
              className="px-4 py-1.5 rounded-[3px] bg-gradient-to-b from-[#1c1c28] to-[#101018] hover:from-[#242434] hover:to-[#141420] border border-[#E50914]/70 hover:border-[#E50914] text-white font-mono font-bold text-[11px] sm:text-xs flex items-center gap-2 cursor-pointer transition-all duration-150 shadow-[0_0_12px_rgba(229,9,20,0.3)] active:scale-[0.98]"
              title="Return to HANDFILM Home Page"
            >
              <Home className="w-3 h-3 text-[#E50914]" />
              <span>HOME</span>
            </button>
          )}

          {/* Right Ecosystem Menu: HUB, VAULT, R2 / STREAM, BLOOM-APP, DEEPER, LAB, SETTINGS */}
          <div className="relative">
            <button
              onClick={() => {
                setIsEcosystemMenuOpen(prev => !prev);
                setIsExportMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-full bg-[#101018]/90 hover:bg-[#181824] border border-[#272732] hover:border-zinc-400 text-zinc-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              title="Ecosystem Sub-Apps & Master Hub"
            >
              <Globe className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span className="hidden sm:inline font-bold">ECOSYSTEM</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isEcosystemMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a10]/98 border border-[#272732] rounded shadow-2xl p-1.5 z-50 font-mono text-[11px] space-y-1 backdrop-blur-2xl animate-in fade-in duration-150"
                onMouseLeave={() => setIsEcosystemMenuOpen(false)}
              >
                <div className="px-2.5 py-1 text-[8.5px] font-bold text-[#fbbf24] border-b border-[#272732] uppercase tracking-wider flex items-center justify-between">
                  <span>FEDERATED ECOSYSTEM</span>
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client-Side Native WebCodecs MP4 Master Exporter */}
      <CutNativeExportModal
        isOpen={isNativeExportOpen}
        onClose={() => setIsNativeExportOpen(false)}
        projectTitle={projectTitle}
      />
    </header>
  );
};
