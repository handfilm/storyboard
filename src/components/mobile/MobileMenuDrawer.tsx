/**
 * @file /src/components/mobile/MobileMenuDrawer.tsx
 * @description Slide-over mobile navigation drawer containing collapsed desktop top-bar items:
 * HOME, FEATURES, Search shots, STUDIO workspace modes, Import Media, Vault & Settings.
 */

import React, { useMemo, useState } from 'react';
import {
  X,
  Home,
  Sparkles,
  Search,
  Film,
  Layers,
  Scissors,
  FolderOpen,
  Settings,
  Upload,
  Gauge,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { AnthologyFrame } from '../../types/anthology';
import { WorkspaceMode } from '../../core/theme';

export interface MobileMenuDrawerProps {
  isOpen: boolean;
  initialFocusSearch?: boolean;
  frames: AnthologyFrame[];
  currentIndex: number;
  workspaceMode: WorkspaceMode;
  projectTitle: string;
  onClose: () => void;
  onGoHome: () => void;
  onSelectWorkspaceMode: (mode: WorkspaceMode) => void;
  onJumpToShot: (idx: number) => void;
  onBatchImportMedia: () => void;
  onTriggerHyperReelPack: () => void;
  onOpenVideoScopes: () => void;
  onOpenProjectManager: () => void;
  onOpenInspector: () => void;
  onOpenSettings: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  initialFocusSearch = false,
  frames,
  currentIndex,
  workspaceMode,
  projectTitle,
  onClose,
  onGoHome,
  onSelectWorkspaceMode,
  onJumpToShot,
  onBatchImportMedia,
  onTriggerHyperReelPack,
  onOpenVideoScopes,
  onOpenProjectManager,
  onOpenInspector,
  onOpenSettings
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = frames.map((f, idx) => ({ frame: f, idx }));
    if (!q) return list.slice(0, 32);
    return list
      .filter(({ frame, idx }) => {
        const numStr = String(idx + 1).padStart(3, '0');
        return (
          numStr.includes(q) ||
          (frame.title || '').toLowerCase().includes(q) ||
          (frame.bengaliTitle || '').toLowerCase().includes(q) ||
          (frame.epNumber || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [frames, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-menu-drawer"
      className="fixed inset-0 z-[120] md:hidden flex"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Studio Menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
      />

      {/* Slide-over drawer panel */}
      <aside
        className="relative w-[84vw] max-w-[320px] h-full bg-[#0B0B0D] border-r border-white/[0.12] flex flex-col shadow-2xl animate-mobile-drawer-in"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        {/* Header */}
        <div className="h-[48px] shrink-0 px-3.5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-mono font-black text-[11px] tracking-[0.18em] text-[#F59E0B]">
              HANDFILM STUDIO
            </div>
            <div className="font-mono text-[9px] text-[#8E8E93] truncate">{projectTitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Menu"
            className="w-[44px] h-[44px] -mr-2 flex items-center justify-center rounded-lg text-[#A1A1AA] active:text-white active:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Primary Navigation: HOME & STUDIO */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#8E8E93] px-1">
              Workspace
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoHome();
                }}
                className="min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2 text-left cursor-pointer"
              >
                <Home className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <span className="font-mono font-bold text-[11px] text-[#F4F4F5] whitespace-nowrap">
                  HOME
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectWorkspaceMode('STAGE');
                  onClose();
                }}
                className={`min-h-[44px] px-3 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                  workspaceMode === 'STAGE'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F59E0B]'
                    : 'bg-[#141418] border-white/[0.08] text-[#F4F4F5]'
                }`}
              >
                <Film className="w-4 h-4 shrink-0" />
                <span className="font-mono font-bold text-[11px] whitespace-nowrap">STUDIO</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onSelectWorkspaceMode('BOARD');
                  onClose();
                }}
                className={`min-h-[44px] px-3 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                  workspaceMode === 'BOARD'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F59E0B]'
                    : 'bg-[#141418] border-white/[0.08] text-[#D4D4D8]'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span className="font-mono font-bold text-[10px] whitespace-nowrap">BOARD</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectWorkspaceMode('CUT');
                  onClose();
                }}
                className={`min-h-[44px] px-3 rounded-lg border flex items-center gap-2 text-left cursor-pointer ${
                  workspaceMode === 'CUT'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F59E0B]'
                    : 'bg-[#141418] border-white/[0.08] text-[#D4D4D8]'
                }`}
              >
                <Scissors className="w-4 h-4 shrink-0" />
                <span className="font-mono font-bold text-[10px] whitespace-nowrap">CUT DESK</span>
              </button>
            </div>
          </div>

          {/* Search Shots */}
          <div className="space-y-2">
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#8E8E93] px-1">
              Search Shots ({frames.length})
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus={initialFocusSearch}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shot #, title, Bangla..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-lg bg-[#141418] border border-white/[0.1] focus:border-[#F59E0B] text-[12px] font-mono text-[#F4F4F5] placeholder:text-[#71717A] outline-none"
              />
            </div>

            <div className="max-h-[190px] overflow-y-auto rounded-lg border border-white/[0.07] bg-[#0F0F13] divide-y divide-white/[0.05]">
              {filteredShots.length === 0 ? (
                <div className="px-3 py-4 text-center font-mono text-[10px] text-[#71717A]">
                  No matching shots
                </div>
              ) : (
                filteredShots.map(({ frame, idx }) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={frame.id ?? idx}
                      type="button"
                      onClick={() => {
                        onJumpToShot(idx);
                        onClose();
                      }}
                      className={`w-full min-h-[44px] px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'active:bg-white/[0.06] text-[#E4E4E7]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bangla text-[12px] font-bold truncate">
                          {frame.bengaliTitle || frame.title || `Shot ${idx + 1}`}
                        </div>
                        <div className="font-mono text-[9px] text-[#8E8E93] truncate">
                          {frame.title || `SH${String(idx + 1).padStart(3, '0')}`}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded bg-black/40 border border-white/[0.08]">
                        #{String(idx + 1).padStart(3, '0')}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Features & Studio Actions */}
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-[#8E8E93] px-1">
              Features &amp; Tools
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBatchImportMedia();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  Import Video / Photo
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTriggerHyperReelPack();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  12s Hyper-Reel Auto-Pack
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoScopes();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  Video Scopes &amp; Waveform
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInspector();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  Director Shot Inspector
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenProjectManager();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  Project Vault &amp; Saves
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full min-h-[44px] px-3 rounded-lg bg-[#141418] active:bg-[#1C1C22] border border-white/[0.08] flex items-center gap-2.5 text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                <span className="font-mono text-[11px] font-bold text-[#F4F4F5]">
                  Studio Settings
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-3.5 py-2 border-t border-white/[0.07] flex items-center justify-between text-[9px] font-mono text-[#71717A]">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#F59E0B]" />
            <span>MOBILE PORTRAIT NLE</span>
          </span>
          <span className="tabular-nums">{frames.length} SHOTS</span>
        </div>
      </aside>
    </div>
  );
};
