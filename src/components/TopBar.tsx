/**
 * @file /src/components/TopBar.tsx
 * @description Master Studio TopBar with editable project title, IDB save badge,
 * primary mode switch (STAGE | BOARD | CUT), Components Matrix (12/13), Theme selector,
 * Simple/PRO switch, and global action triggers.
 */

import React, { useState } from 'react';
import { WorkspaceMode } from '../core/theme';
import { 
  Command, 
  Activity, 
  SlidersHorizontal, 
  HelpCircle, 
  Download, 
  RotateCcw, 
  RotateCw,
  Check,
  Layers,
  Palette
} from 'lucide-react';

interface TopBarProps {
  projectTitle: string;
  onUpdateTitle: (title: string) => void;
  activeMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  isProMode: boolean;
  onToggleProMode: () => void;
  componentsBadgeText?: string;
  onToggleComponentsPopover?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenCommandPalette: () => void;
  onOpenSelfTest: () => void;
  onOpenShortcuts: () => void;
  onOpenPublishModal: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectTitle,
  onUpdateTitle,
  activeMode,
  onSelectMode,
  isProMode,
  onToggleProMode,
  componentsBadgeText = '12/13 ON',
  onToggleComponentsPopover,
  onOpenThemeSettings,
  onOpenCommandPalette,
  onOpenSelfTest,
  onOpenShortcuts,
  onOpenPublishModal,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectTitle);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim()) {
      onUpdateTitle(titleDraft.trim());
    } else {
      setTitleDraft(projectTitle);
    }
  };

  return (
    <header className="h-10 w-full bg-[#08080A]/95 border-b border-white/10 px-2 sm:px-4 flex items-center justify-between select-none z-50 backdrop-blur-md">
      {/* Left: Branding & Project Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold tracking-[0.2em] text-white shrink-0">
          <span className="text-[#D4AF37] font-black">RAWx</span>
          <span className="text-white/30 hidden sm:inline">//</span>
          <span className="hidden md:inline text-[11px] text-white/80">STUDIO</span>
        </div>

        {/* Editable Project Name */}
        {isEditingTitle ? (
          <div className="flex items-center gap-1">
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
              className="bg-black/90 border border-[#D4AF37] text-white text-[11px] px-2 py-0.5 rounded-[1px] font-mono-tech outline-none max-w-[180px] sm:max-w-[260px]"
            />
            <button 
              onClick={handleTitleSubmit} 
              className="p-1 text-[#D4AF37] hover:text-[#FFE066] cursor-pointer"
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
            title="Click to rename project"
            className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono-tech text-white/85 hover:text-[#FFE066] cursor-pointer truncate max-w-[140px] sm:max-w-[240px] px-1.5 py-0.5 rounded-[1px] hover:bg-white/5 transition-colors"
          >
            <span className="truncate">{projectTitle}</span>
            <span className="text-[9px] text-[#D4AF37]/60">✎</span>
          </div>
        )}

        {/* IDB SYNCED Status Pill */}
        <div 
          className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[1px] bg-emerald-500/10 border border-emerald-500/30 text-[8.5px] font-mono-tech text-emerald-400"
          title="IndexedDB Vault: All 100 frames, pan offsets, and settings automatically saved locally"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>IDB SYNCED</span>
        </div>

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-0.5 border-l border-white/10 pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Center: Primary Mode Switcher (STAGE | BOARD | CUT) */}
      <div className="flex items-center p-0.5 bg-black/70 border border-white/15 rounded-[2px] shrink-0">
        <button
          onClick={() => onSelectMode('STAGE')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer ${
            activeMode === 'STAGE'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          title="Cinematic Hero Stage View (Default)"
        >
          STAGE
        </button>
        <button
          onClick={() => onSelectMode('BOARD')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer ${
            activeMode === 'BOARD'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          title="100-Shot Storyboard Sheet View"
        >
          BOARD
        </button>
        <button
          onClick={() => onSelectMode('CUT')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer ${
            activeMode === 'CUT'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
          title="CUT Multi-Track Video & Animatic Editor"
        >
          CUT
        </button>
      </div>

      {/* Right: Tools & Utilities */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Components Matrix (12/13) Toggle Button */}
        {onToggleComponentsPopover && (
          <button
            onClick={onToggleComponentsPopover}
            className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white/80 hover:text-[#FFE066] font-mono-tech text-[8.5px] sm:text-[9px] flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Components Visibility Matrix (Shortcut: V)"
          >
            <Layers className="w-3 h-3 text-[#D4AF37]" />
            <span className="hidden md:inline">COMPONENTS</span>
            <span className="px-1 py-0.2 rounded-[1px] bg-[#D4AF37]/20 text-[#FFE066] font-bold text-[8px]">
              {componentsBadgeText}
            </span>
          </button>
        )}

        {/* Theme Settings */}
        {onOpenThemeSettings && (
          <button
            onClick={onOpenThemeSettings}
            className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-colors"
            title="Theme & Studio Appearance"
          >
            <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
          </button>
        )}

        {/* Simple vs PRO switch */}
        <button
          onClick={onToggleProMode}
          className={`px-2 py-0.5 rounded-[1px] font-mono-tech text-[8.5px] border cursor-pointer hidden md:flex items-center gap-1 transition-colors ${
            isProMode 
              ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066] font-bold' 
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
          }`}
          title="Toggle Simple / PRO Director Interface"
        >
          <SlidersHorizontal className="w-2.5 h-2.5" />
          <span>{isProMode ? 'PRO' : 'SIMPLE'}</span>
        </button>

        {/* Command Palette Trigger (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white/70 hover:text-white font-mono-tech text-[9px] flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3 text-[#D4AF37]" />
          <span className="hidden xl:inline text-white/40">Search...</span>
          <kbd className="hidden sm:inline px-1 py-0.2 bg-black/60 border border-white/15 text-[8px] rounded text-[#D4AF37]">
            ⌘K
          </kbd>
        </button>

        {/* Diagnostics / Self-Test */}
        <button
          onClick={onOpenSelfTest}
          className="p-1.5 sm:px-2 sm:py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] font-mono-tech text-[9px] flex items-center gap-1 cursor-pointer transition-colors"
          title="Run Self-Test Diagnostics & Layout Doctor (?)"
        >
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="hidden lg:inline">SELF-TEST</span>
        </button>

        {/* Shortcuts Help */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-colors"
          title="Keyboard Shortcuts (Shift+/)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Export / Git */}
        <button
          onClick={onOpenPublishModal}
          className="px-2 sm:px-2.5 py-1 rounded-[1px] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[#FFE066] font-mono-tech text-[9px] sm:text-[10px] tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Export Project, Git Suite & README Generator"
        >
          <Download className="w-3 h-3 text-[#D4AF37]" />
          <span className="hidden sm:inline">EXPORT / GIT</span>
          <span className="sm:hidden">GIT</span>
        </button>
      </div>
    </header>
  );
};
