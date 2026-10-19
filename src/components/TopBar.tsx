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
  Palette,
  HardDriveDownload,
  MoreHorizontal,
  ChevronDown,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { exportFullIdbBackup } from '../utils/backup';
import { SaveState } from '../core/storage';

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
  onOpenProjectManager?: () => void;
  saveState?: SaveState;
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
  onOpenProjectManager,
  saveState = 'saved',
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectTitle);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim()) {
      onUpdateTitle(titleDraft.trim());
    } else {
      setTitleDraft(projectTitle);
    }
  };

  return (
    <header className="h-10 w-full bg-[#08080A]/95 border-b border-white/10 px-2 sm:px-4 flex items-center justify-between select-none z-50 backdrop-blur-md relative">
      {/* Left: Branding & Project Title */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
        <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold tracking-[0.2em] text-white shrink-0">
          <span className="text-[#D4AF37] font-black">RAWx</span>
          <span className="text-white/30 hidden sm:inline">//</span>
          <span className="hidden md:inline text-[11px] text-white/80">STUDIO</span>
        </div>

        {/* Editable Project Name with Hover Tooltip */}
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
              className="bg-black/90 border border-[#D4AF37] text-white text-[11px] px-2 py-0.5 rounded-[1px] font-mono-tech outline-none max-w-[160px] sm:max-w-[240px]"
            />
            <button 
              onClick={handleTitleSubmit} 
              className="p-1 text-[#D4AF37] hover:text-[#FFE066] cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink">
            <div 
              onClick={() => {
                setTitleDraft(projectTitle);
                setIsEditingTitle(true);
              }}
              title={`Project: ${projectTitle} (Click to rename)`}
              className="group relative flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono-tech text-white/85 hover:text-[#FFE066] cursor-pointer max-w-[110px] sm:max-w-[190px] xl:max-w-[260px] px-1.5 py-0.5 rounded-[1px] hover:bg-white/5 transition-colors shrink"
            >
              <span className="truncate">{projectTitle}</span>
              <span className="text-[9px] text-[#D4AF37]/60 group-hover:text-[#D4AF37]">✎</span>
              {/* Tooltip on hover */}
              <div className="absolute left-0 top-full mt-1.5 hidden group-hover:flex z-50 px-2 py-1 bg-black/95 border border-[#D4AF37]/60 rounded-[2px] shadow-2xl text-[10px] font-mono-tech text-[#FFE066] whitespace-nowrap pointer-events-none">
                {projectTitle}
              </div>
            </div>

            {/* Project Vault Manager Open Button */}
            {onOpenProjectManager && (
              <button
                onClick={onOpenProjectManager}
                className="p-1 rounded-[1px] bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 text-white/70 hover:text-[#FFE066] cursor-pointer transition-colors shrink-0"
                title="Project Vault Manager: Switch, Create, Duplicate, and Delete Projects"
              >
                <FolderOpen className="w-3 h-3 text-[#D4AF37]" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic Visible Save State (Debounced 800ms) */}
        <div 
          className={`hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[1px] text-[8.5px] font-mono-tech shrink-0 transition-all ${
            saveState === 'saving'
              ? 'bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#FFE066]'
              : saveState === 'error'
              ? 'bg-red-500/15 border border-red-500/40 text-red-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
          title={`IndexedDB Vault: ${
            saveState === 'saving'
              ? 'Saving changes...'
              : saveState === 'error'
              ? 'Storage write error - fallback preserved'
              : 'All 100 frames, pan offsets, and settings automatically saved locally'
          }`}
        >
          <span 
            className={`w-1.5 h-1.5 rounded-full ${
              saveState === 'saving'
                ? 'bg-[#FFE066] animate-ping'
                : saveState === 'error'
                ? 'bg-red-400'
                : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span>
            {saveState === 'saving' ? 'SAVING...' : saveState === 'error' ? 'SAVE ERROR' : 'SAVED'}
          </span>
        </div>

        {/* Safety Net: Export Full Backup Button (>= 1400px) */}
        <button
          onClick={() => exportFullIdbBackup()}
          className="hidden 2xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[1px] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[8.5px] font-mono-tech text-[#FFE066] cursor-pointer transition-colors shrink-0"
          title="Export full backup: Download complete IndexedDB database and local state as a single JSON file"
        >
          <HardDriveDownload className="w-2.5 h-2.5 text-[#D4AF37]" />
          <span>BACKUP IDB</span>
        </button>

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-0.5 border-l border-white/10 pl-1.5 shrink-0">
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

      {/* Center: Primary Mode Switcher (STAGE | BOARD | CUT) with distinct spacing and clear active state */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-black/80 border border-white/15 rounded-[2px] shrink-0 mx-1">
        <button
          onClick={() => onSelectMode('STAGE')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer font-medium ${
            activeMode === 'STAGE'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)] border border-[#FFE066]'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title="Cinematic Hero Stage View (Default)"
        >
          STAGE
        </button>
        <button
          onClick={() => onSelectMode('BOARD')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer font-medium ${
            activeMode === 'BOARD'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)] border border-[#FFE066]'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title="100-Shot Storyboard Sheet View"
        >
          BOARD
        </button>
        <button
          onClick={() => onSelectMode('CUT')}
          className={`px-2.5 sm:px-3 py-1 rounded-[1px] font-mono-tech text-[9px] sm:text-[10px] tracking-wider transition-all cursor-pointer font-medium ${
            activeMode === 'CUT'
              ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)] border border-[#FFE066]'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
          title="CUT Multi-Track Video & Animatic Editor"
        >
          CUT
        </button>
      </div>

      {/* Right: Tools & Utilities - Responsive with More Dropdown below 1400px */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Components Matrix (12/13) Toggle Button */}
        {onToggleComponentsPopover && (
          <button
            onClick={onToggleComponentsPopover}
            className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white/80 hover:text-[#FFE066] font-mono-tech text-[8.5px] sm:text-[9px] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            title="Components Visibility Matrix (Shortcut: V)"
          >
            <Layers className="w-3 h-3 text-[#D4AF37]" />
            <span className="hidden lg:inline">COMPONENTS</span>
            <span className="px-1 py-0.2 rounded-[1px] bg-[#D4AF37]/20 text-[#FFE066] font-bold text-[8px]">
              {componentsBadgeText}
            </span>
          </button>
        )}

        {/* Command Palette Trigger (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37]/50 text-white/70 hover:text-white font-mono-tech text-[9px] items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3 text-[#D4AF37]" />
          <span className="hidden 2xl:inline text-white/40">Search...</span>
          <kbd className="px-1 py-0.2 bg-black/60 border border-white/15 text-[8px] rounded text-[#D4AF37]">
            ⌘K
          </kbd>
        </button>

        {/* Full Desktop Items (Visible on >= 1400px / 2xl) */}
        <div className="hidden 2xl:flex items-center gap-1.5">
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
            className={`px-2 py-0.5 rounded-[1px] font-mono-tech text-[8.5px] border cursor-pointer flex items-center gap-1 transition-colors ${
              isProMode 
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066] font-bold' 
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Toggle Simple / PRO Director Interface"
          >
            <SlidersHorizontal className="w-2.5 h-2.5" />
            <span>{isProMode ? 'PRO' : 'SIMPLE'}</span>
          </button>

          {/* Diagnostics / Self-Test */}
          <button
            onClick={onOpenSelfTest}
            className="p-1.5 sm:px-2 sm:py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] font-mono-tech text-[9px] flex items-center gap-1 cursor-pointer transition-colors"
            title="Run Self-Test Diagnostics & Layout Doctor (?)"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>SELF-TEST</span>
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-colors"
            title="Keyboard Shortcuts (Shift+/)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Below 1400px: "More" Menu Button */}
        <div className="relative 2xl:hidden">
          <button
            onClick={() => setIsMoreMenuOpen(prev => !prev)}
            className={`p-1.5 rounded-[1px] border text-white/70 hover:text-[#FFE066] cursor-pointer transition-colors flex items-center gap-0.5 ${
              isMoreMenuOpen ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066]' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            title="More Studio Tools"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>

          {/* More Dropdown Menu */}
          {isMoreMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-1.5 w-48 bg-[#0B0C10] border border-white/15 rounded-[2px] shadow-2xl p-1 z-50 font-mono-tech text-[10px] space-y-0.5"
              onMouseLeave={() => setIsMoreMenuOpen(false)}
            >
              {onOpenThemeSettings && (
                <button
                  onClick={() => { onOpenThemeSettings(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
                >
                  <Palette className="w-3 h-3 text-[#D4AF37]" />
                  <span>Theme & Appearance</span>
                </button>
              )}

              <button
                onClick={() => { onToggleProMode(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3 h-3 text-[#D4AF37]" />
                  <span>Studio Interface</span>
                </div>
                <span className="px-1 py-0.2 bg-[#D4AF37]/20 text-[#FFE066] text-[8px] rounded">
                  {isProMode ? 'PRO' : 'SIMPLE'}
                </span>
              </button>

              <button
                onClick={() => { onOpenSelfTest(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>Self-Test Diagnostics</span>
              </button>

              <button
                onClick={() => { onOpenShortcuts(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3 text-[#D4AF37]" />
                <span>Shortcuts Cheat Sheet</span>
              </button>

              {onOpenProjectManager && (
                <button
                  onClick={() => { onOpenProjectManager(); setIsMoreMenuOpen(false); }}
                  className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-white/80 hover:text-[#FFE066] flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3 text-[#D4AF37]" />
                  <span>Project Vault Manager</span>
                </button>
              )}

              <div className="border-t border-white/10 my-0.5"></div>

              <button
                onClick={() => { exportFullIdbBackup(); setIsMoreMenuOpen(false); }}
                className="w-full px-2.5 py-1.5 rounded-[1px] text-left hover:bg-white/10 text-[#FFE066] flex items-center gap-2 cursor-pointer"
              >
                <HardDriveDownload className="w-3 h-3 text-[#D4AF37]" />
                <span>Export Full Backup</span>
              </button>
            </div>
          )}
        </div>

        {/* Export / Git - Always Visible and Never Cut Off */}
        <button
          onClick={onOpenPublishModal}
          className="px-2.5 py-1 rounded-[1px] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/50 text-[#FFE066] font-mono-tech text-[9px] sm:text-[10px] tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 shadow-sm"
          title="Export Project, Git Suite & README Generator"
        >
          <Download className="w-3 h-3 text-[#D4AF37]" />
          <span>EXPORT / GIT</span>
        </button>
      </div>
    </header>
  );
};
