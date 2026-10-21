/**
 * @file /src/components/TopBar.tsx
 * @description Master Top Bar matching the Google Flow aesthetic from the reference screenshot:
 * - Green RAWx square logo with film frame
 * - Project title with yellow diamond indicator
 * - Segmented "Tool" / "Edit" pill
 * - Center mode switcher with glowing gold STAGE pill, BOARD, and CUT
 * - Right: Undo, Fullscreen, [▶ ANIMATIC] gold button, [☆ Apply to be featured], Heart, Share, Done
 * - Full suite of studio utilities (Components Matrix, Theme, Self-Test, Project Vault)
 */

import React, { useState } from 'react';
import { WorkspaceMode } from '../core/theme';
import { SaveState } from '../core/storage';
import { exportFullIdbBackup } from '../utils/backup';
import { FEDERATION_APPS } from '../types/editor';
import {
  Film,
  Home,
  RotateCcw,
  RotateCw,
  Maximize2,
  Play,
  Share2,
  Heart,
  MoreVertical,
  Check,
  FolderOpen,
  Layers,
  Palette,
  Activity,
  HelpCircle,
  HardDriveDownload,
  Download,
  SlidersHorizontal,
  ChevronDown,
  Type,
  Cloud,
  Globe,
  ExternalLink
} from 'lucide-react';

interface TopBarProps {
  projectTitle: string;
  onUpdateTitle: (title: string) => void;
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  onGoHome?: () => void;
  activeModule?: string;
  isProMode: boolean;
  onToggleProMode: () => void;
  componentsBadgeText?: string;
  onToggleComponentsPopover?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenCommandPalette: () => void;
  onOpenSelfTest: () => void;
  onOpenShortcuts: () => void;
  onOpenPublishModal: () => void;
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
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle,
  onUpdateTitle,
  activeMode,
  onSelectMode,
  onGoHome,
  activeModule,
  isProMode,
  onToggleProMode,
  componentsBadgeText = '12/13 ON',
  onToggleComponentsPopover,
  onOpenThemeSettings,
  onOpenCommandPalette,
  onOpenSelfTest,
  onOpenShortcuts,
  onOpenPublishModal,
  onOpenProjectManager,
  onOpenAnimatic,
  onToggleFullscreen,
  onToggleTitles,
  showTitles = true,
  saveState = 'saved',
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenR2Automation
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectTitle);
  const [activeTabPill, setActiveTabPill] = useState<'Tool' | 'Edit'>('Tool');
  const [isLiked, setIsLiked] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isFederationDockOpen, setIsFederationDockOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim()) {
      onUpdateTitle(titleDraft.trim());
    } else {
      setTitleDraft(projectTitle);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    }
  };

  return (
    <header className="h-12 w-full bg-[#0E0E12] border-b border-[#1C1C24] px-3 sm:px-4 flex items-center justify-between select-none z-50 backdrop-blur-2xl relative font-sans">
      {/* Left: Branding, Tool/Edit Pill & Project Diamond */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        {/* Green App Logo Badge from screenshot */}
        <div 
          onClick={onOpenProjectManager}
          className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.35)] shrink-0 cursor-pointer active:scale-[0.98] transition-transform"
          title="RAWx Storyboard Studio — Click for Project Vault"
        >
          <Film className="w-3.5 h-3.5 text-black font-black" />
        </div>

        {/* Studio Title */}
        <span className="font-semibold text-xs sm:text-sm text-white tracking-tight shrink-0 hidden sm:inline">
          RAWx Storyboard Studio
        </span>

        {/* Home / Return to Stage Quick Button */}
        <button
          type="button"
          onClick={onGoHome || (() => onSelectMode('STAGE'))}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14141B] hover:bg-[#F5A623]/25 hover:border-[#F5A623]/60 border border-[#23232E] text-white/80 hover:text-[#F5A623] text-xs font-mono transition-colors duration-150 ease-out active:scale-[0.98] cursor-pointer shadow-sm group shrink-0"
          title="STAGE (HOME) — Return to Cinematic Viewport"
        >
          <Home className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="font-bold tracking-wider text-[11px] hidden sm:inline">HOME</span>
        </button>

        {/* Tool / Edit Segmented Pill */}
        <div className="hidden md:flex items-center bg-[#14141B] p-0.5 rounded-full border border-[#23232E] text-[11px] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTabPill('Tool')}
            className={`px-3 py-0.5 rounded-full font-medium transition-colors duration-150 ease-out cursor-pointer active:scale-[0.98] ${
              activeTabPill === 'Tool' ? 'bg-[#272733] text-white shadow-sm' : 'text-white/50 hover:text-white'
            }`}
          >
            Tool
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTabPill('Edit');
              onSelectMode('CUT');
            }}
            className={`px-3 py-0.5 rounded-full font-medium transition-colors duration-150 ease-out cursor-pointer active:scale-[0.98] ${
              activeTabPill === 'Edit' ? 'bg-[#272733] text-white shadow-sm' : 'text-white/50 hover:text-white'
            }`}
          >
            Edit
          </button>
        </div>

        {/* Diamond Project Title pill from screenshot */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1 shrink">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleDraft(projectTitle);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="bg-black/90 border border-[#E5A919] text-white text-xs px-2.5 py-0.5 rounded-full font-mono outline-none max-w-[200px]"
            />
            <button 
              onClick={handleTitleSubmit} 
              className="p-1 text-[#E5A919] hover:text-[#FFCC00] cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => {
              setTitleDraft(projectTitle);
              setIsEditingTitle(true);
            }}
            title={`Project: ${projectTitle} (Click to rename)`}
            className="group flex items-center gap-1.5 px-3 py-1 bg-[#101017]/90 hover:bg-[#161622] rounded-full border border-white/10 hover:border-[#E5A919]/40 text-xs font-mono text-white/90 cursor-pointer transition-all shrink max-w-[150px] sm:max-w-[220px] lg:max-w-[300px]"
          >
            <span className="text-[#E5A919] text-[10px] shrink-0 font-bold">◆</span>
            <span className="truncate tracking-wide font-medium">{projectTitle}</span>
            <span className="text-[9px] text-white/30 group-hover:text-[#E5A919] shrink-0">✎</span>
          </div>
        )}

        {/* Save State Badge */}
        <div className="hidden xl:flex items-center gap-1 text-[8.5px] font-mono text-white/50">
          <span 
            className={`w-1.5 h-1.5 rounded-full ${
              saveState === 'saving'
                ? 'bg-[#FFE066] animate-ping'
                : saveState === 'error'
                ? 'bg-red-400'
                : 'bg-emerald-400 animate-pulse'
            }`} 
          />
          <span className="text-[8px] uppercase tracking-wider">{saveState}</span>
        </div>
      </div>

      {/* Center: Primary Mode Switcher (STAGE | BLOOM | BOARD | CUT) */}
      <div className="flex items-center bg-[#14141B] p-0.5 rounded-full border border-[#23232E] shrink-0 mx-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            if (onGoHome) {
              onGoHome();
            } else {
              onSelectMode('STAGE');
            }
          }}
          className={`px-3.5 sm:px-4 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
            activeMode === 'STAGE' && (!activeModule || activeModule === 'PLAYER')
              ? 'bg-[#F5A623] text-black shadow-[0_0_12px_rgba(245,166,35,0.45)]'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="STAGE (HOME) — Return to Cinematic Viewport"
        >
          <Home className="w-3 h-3" />
          <span>STAGE</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('BLOOM')}
          className={`px-3 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
            activeMode === 'BLOOM'
              ? 'bg-rose-500 text-black shadow-[0_0_12px_rgba(244,63,94,0.55)]'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title="Bloom Interactive Canvas (Fluid Stage & Magnetic Snap Sequencer)"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          <span>BLOOM</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('BOARD')}
          className={`px-3 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium tracking-wider transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
            activeMode === 'BOARD'
              ? 'bg-[#F5A623] text-black font-bold shadow-[0_0_12px_rgba(245,166,35,0.45)]'
              : 'text-white/70 hover:text-white'
          }`}
          title="100-Shot Storyboard Grid"
        >
          <span className="text-xs">⊞</span>
          <span>BOARD</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('CUT')}
          className={`px-3 sm:px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium tracking-wider transition-colors duration-150 ease-out cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
            activeMode === 'CUT'
              ? 'bg-[#F5A623] text-black font-bold shadow-[0_0_12px_rgba(245,166,35,0.45)]'
              : 'text-white/70 hover:text-white'
          }`}
          title="CapCut Multi-Track Sequence Editor"
        >
          <span className="text-xs">🎬</span>
          <span>CUT</span>
        </button>
      </div>

      {/* Right: Actions matching tactical aesthetic */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Undo Button */}
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-full bg-[#14141B] hover:bg-[#1C1C26] text-white/60 hover:text-white border border-[#23232E] disabled:opacity-30 cursor-pointer transition-colors active:scale-[0.98]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Fullscreen Button */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            title="Toggle Cinema Fullscreen (F)"
            className="p-1.5 rounded-full bg-[#14141B] hover:bg-[#1C1C26] text-white/60 hover:text-white border border-[#23232E] cursor-pointer transition-colors active:scale-[0.98]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Quick Title Toggle Button */}
        {onToggleTitles && (
          <button
            type="button"
            onClick={onToggleTitles}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10.5px] font-mono transition-colors duration-150 ease-out cursor-pointer shadow-sm active:scale-[0.98] ${
              showTitles
                ? 'bg-[#181824] border-[#F5A623]/60 text-[#F5A623] shadow-[0_0_8px_rgba(245,166,35,0.3)]'
                : 'bg-[#14141B] border-[#23232E] text-white/40 hover:text-white/80'
            }`}
            title="Toggle Master Titles Overlay (Hotkey: T)"
          >
            <Type className={`w-3.5 h-3.5 ${showTitles ? 'text-[#F5A623]' : 'text-white/40'}`} />
            <span className="font-bold tracking-wider hidden md:inline">
              TITLES: {showTitles ? 'ON' : 'OFF'}
            </span>
          </button>
        )}

        {/* Dedicated Gold [▶ ANIMATIC] Button */}
        <button
          type="button"
          onClick={onOpenAnimatic}
          className="px-3.5 py-1 rounded-full bg-[#F5A623] hover:bg-[#D97706] text-black font-bold text-[10px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out shadow-[0_0_12px_rgba(245,166,35,0.4)] active:scale-[0.98]"
          title="Launch Animatic Cinema Player"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>ANIMATIC</span>
        </button>

        {/* "Apply to be featured" pill from screenshot */}
        <button
          onClick={onOpenPublishModal}
          className="hidden lg:flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-[11px] font-medium cursor-pointer transition-colors"
          title="Publish & Submit Project"
        >
          <span>☆</span>
          <span>Apply to be featured</span>
        </button>

        {/* Heart / Favorite */}
        <button
          onClick={() => setIsLiked(p => !p)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isLiked ? 'text-red-400 bg-red-500/10' : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
          title="Like / Favorite Project"
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer relative"
          title="Share Project URL"
        >
          <Share2 className="w-3.5 h-3.5" />
          {shareFeedback && (
            <span className="absolute right-0 top-full mt-1 px-2 py-0.5 bg-black border border-[#E5A919] text-[#E5A919] text-[9px] rounded font-mono whitespace-nowrap shadow-xl">
              Copied!
            </span>
          )}
        </button>

        {/* Active Hands & Head Ecosystem Links Pill Cluster */}
        <div className="hidden lg:flex items-center gap-1 bg-[#12121A] p-0.5 rounded-full border border-[#23232E] shrink-0 shadow-sm">
          <a
            href="https://hub.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#161622] hover:bg-[#F5A623]/20 border border-transparent hover:border-[#F5A623]/60 text-white/80 hover:text-[#F5A623] text-[10px] font-mono font-bold tracking-wider transition-colors duration-150 active:scale-[0.98]"
            title="Hands & Head Hub — https://hub.handsandhead.com"
          >
            <span>HUB</span>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </a>

          <a
            href="https://vault.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#161622] hover:bg-[#F5A623]/20 border border-transparent hover:border-[#F5A623]/60 text-white/80 hover:text-[#F5A623] text-[10px] font-mono font-bold tracking-wider transition-colors duration-150 active:scale-[0.98]"
            title="Hands & Head Vault — https://vault.handsandhead.com"
          >
            <span>VAULT</span>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </a>

          <a
            href="https://bloom-app.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#161622] hover:bg-rose-500/20 border border-transparent hover:border-rose-500/60 text-white/80 hover:text-rose-400 text-[10px] font-mono font-bold tracking-wider transition-colors duration-150 active:scale-[0.98]"
            title="Bloom App — https://bloom-app.handsandhead.com"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>BLOOM</span>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </a>

          <a
            href="https://xvideos-r2.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#161622] hover:bg-[#F5A623]/20 border border-transparent hover:border-[#F5A623]/60 text-white/80 hover:text-[#F5A623] text-[10px] font-mono font-bold tracking-wider transition-colors duration-150 active:scale-[0.98]"
            title="R2 Stream — https://xvideos-r2.handsandhead.com"
          >
            <span className="text-[#F5A623]">R2</span>
            <span>STREAM</span>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </a>

          <a
            href="https://picseed.handsandhead.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#161622] hover:bg-[#F5A623]/20 border border-transparent hover:border-[#F5A623]/60 text-white/80 hover:text-[#F5A623] text-[10px] font-mono font-bold tracking-wider transition-colors duration-150 active:scale-[0.98]"
            title="Picseed CDN — https://picseed.handsandhead.com"
          >
            <span>PICSEED</span>
            <ExternalLink className="w-2.5 h-2.5 text-white/30" />
          </a>
        </div>

        {/* Cross-App Federation Dock Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsFederationDockOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-mono transition-all cursor-pointer ${
              isFederationDockOpen 
                ? 'bg-[#E5A919]/25 border-[#E5A919] text-[#FFE066] shadow-[0_0_8px_rgba(229,169,25,0.3)]' 
                : 'bg-[#14141B] hover:bg-[#1D1D26] border-white/10 text-white/70 hover:text-white'
            }`}
            title="Hands & Head Federation Ecosystem (hub, vault, bloom, xvideos-r2, picseed)"
          >
            <Globe className="w-3.5 h-3.5 text-[#E5A919]" />
            <span className="hidden xl:inline font-bold">ECOSYSTEM</span>
            <ChevronDown className="w-3 h-3 text-white/40" />
          </button>

          {isFederationDockOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-72 bg-[#0E0E14] border border-[#2D2D3B] rounded-lg shadow-2xl p-2 z-50 font-mono text-xs backdrop-blur-2xl animate-in fade-in duration-150"
              onMouseLeave={() => setIsFederationDockOpen(false)}
            >
              <div className="px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Hands & Head Federation</span>
                <span className="text-[9px] text-[#E5A919]">ACTIVE DRAFT SAFE</span>
              </div>
              <div className="space-y-1">
                {FEDERATION_APPS.map(app => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start justify-between p-2 rounded hover:bg-white/5 transition-colors ${
                      app.badge === 'ACTIVE' ? 'bg-[#181822] border border-[#E5A919]/30' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-[#E6E6E6] text-[11px]">
                        <span>{app.name}</span>
                        {app.badge && (
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono ${
                            app.badge === 'ACTIVE' ? 'bg-[#E5A919] text-black font-black' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[9.5px] text-white/40 mt-0.5">{app.description}</p>
                      <span className="text-[9px] text-white/30">{app.subdomain}.handsandhead.com</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-white/30 shrink-0 mt-1" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* More Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMoreMenuOpen(prev => !prev)}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
            title="More Studio Tools"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMoreMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-52 bg-[#0B0C10] border border-white/15 rounded-md shadow-2xl p-1 z-50 font-mono text-[10px] space-y-0.5 backdrop-blur-xl"
              onMouseLeave={() => setIsMoreMenuOpen(false)}
            >
              {onToggleComponentsPopover && (
                <button
                  onClick={() => { onToggleComponentsPopover(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-[#D4AF37]" />
                    <span>Components Matrix</span>
                  </div>
                  <span className="text-[8px] bg-white/10 px-1 py-0.2 rounded text-white/60">
                    {componentsBadgeText}
                  </span>
                </button>
              )}

              {onOpenThemeSettings && (
                <button
                  onClick={() => { onOpenThemeSettings(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
                >
                  <Palette className="w-3 h-3 text-[#D4AF37]" />
                  <span>Theme & Appearance</span>
                </button>
              )}

              <button
                onClick={() => { onToggleProMode(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3 h-3 text-[#D4AF37]" />
                  <span>Studio Layout Mode</span>
                </div>
                <span className="px-1 py-0.2 bg-[#D4AF37]/20 text-[#FFE066] text-[8px] rounded">
                  {isProMode ? 'PRO' : 'SIMPLE'}
                </span>
              </button>

              <button
                onClick={() => { onOpenSelfTest(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>Self-Test Diagnostics</span>
              </button>

              <button
                onClick={() => { onOpenShortcuts(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3 text-[#D4AF37]" />
                <span>Keyboard Shortcuts (Shift+/)</span>
              </button>

              {onOpenProjectManager && (
                <button
                  onClick={() => { onOpenProjectManager(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3 text-[#D4AF37]" />
                  <span>Project Vault Manager</span>
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

              <div className="border-t border-white/10 my-0.5" />

              <button
                onClick={() => { exportFullIdbBackup(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded text-left hover:bg-white/10 text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <HardDriveDownload className="w-3 h-3 text-[#D4AF37]" />
                <span>Backup Local Database</span>
              </button>
            </div>
          )}
        </div>

        {/* Done / Publish Button from screenshot */}
        <button
          onClick={onOpenPublishModal}
          className="px-3.5 py-1 rounded-full bg-white hover:bg-white/90 text-black font-semibold text-xs transition-colors cursor-pointer shadow-sm shrink-0"
        >
          Done
        </button>
      </div>
    </header>
  );
};
