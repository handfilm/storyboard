/**
 * RAWx Studio — TopBar Navigation & Master Controls
 * Public API: TopBar component
 * Implements clean CSS Grid shell header with editable project title, status badges, and tool triggers.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Undo2, 
  Redo2, 
  Search, 
  Command, 
  Layers, 
  Eye, 
  Crop, 
  Grid, 
  Camera, 
  Share2, 
  Activity, 
  HelpCircle,
  SlidersHorizontal,
  Maximize2
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    project,
    setProjectTitle,
    saveStatus,
    undo,
    redo,
    history,
    isProMode,
    toggleProMode,
    toggleCommandPalette,
    toggleShortcuts,
    toggleDiagnostics,
    isPanToolActive,
    togglePanTool,
    setLiquifyModalOpen,
    isGuidesActive,
    toggleGuides,
    fitMode,
    setFitMode,
    visibility,
    setVisibilityItem,
    activeModule,
    setActiveModule
  } = useStudioStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [isComponentPopoverOpen, setIsComponentPopoverOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      setProjectTitle(titleInput.trim());
    }
  };

  const activeComponentsCount = Object.values(visibility).filter(Boolean).length;

  return (
    <header className="h-10 bg-[#0B0B0B] border-b border-[#D4AF37]/20 flex items-center justify-between px-3 text-xs select-none z-30">
      {/* Brand & Editable Project Title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-[#D4AF37]">
          <span className="font-['Cinzel'] text-sm tracking-widest text-[#FFE066]">RAWx</span>
          <span className="text-[#8A8A8A] font-mono text-[10px]">// STUDIO</span>
        </div>

        <span className="text-[#8A8A8A]/40 font-mono">|</span>

        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
            autoFocus
            className="bg-[#121212] border border-[#D4AF37]/50 rounded px-1.5 py-0.5 text-xs text-[#EDEDED] font-mono outline-none w-56"
          />
        ) : (
          <span
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit project title"
            className="font-mono text-[#EDEDED] hover:text-[#FFE066] cursor-pointer max-w-[200px] sm:max-w-xs truncate"
          >
            {project.title}
          </span>
        )}

        {/* Persistence Status Badge */}
        <span 
          id="vault-status-badge"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono border border-[#4ADE80]/30 bg-[#4ADE80]/10 text-[#4ADE80]"
          title="IndexedDB continuous synchronization"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          <span>{saveStatus}</span>
        </span>
      </div>

      {/* Center Tool Triggers (Preserving exact core functions) */}
      <div className="hidden lg:flex items-center gap-1.5">
        {/* Components Matrix Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsComponentPopoverOpen(!isComponentPopoverOpen)}
            id="btn-comp-matrix"
            className={`px-2 py-1 rounded flex items-center gap-1 font-mono text-[11px] border transition-colors ${
              isComponentPopoverOpen 
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066]' 
                : 'bg-[#121212] border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED]'
            }`}
            title="Components Visibility Matrix (V)"
          >
            <Layers className="w-3 h-3 text-[#D4AF37]" />
            <span>COMPONENTS</span>
            <span className="text-[#D4AF37] font-bold">[{activeComponentsCount}/13]</span>
          </button>

          {/* Component Visibility Popover */}
          {isComponentPopoverOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-64 bg-[#0B0B0B] border border-[#D4AF37]/40 rounded-lg shadow-2xl p-2.5 z-50 text-[11px] font-mono">
              <div className="text-[10px] text-[#D4AF37] uppercase tracking-wider mb-2 font-bold pb-1 border-b border-[#D4AF37]/20 flex justify-between items-center">
                <span>Display Components</span>
                <span className="text-[9px] text-[#8A8A8A]">[13 Channels]</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(visibility).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setVisibilityItem(key as any, !val)}
                    className={`px-1.5 py-1 rounded text-left flex items-center justify-between border ${
                      val 
                        ? 'bg-[#121212] border-[#D4AF37]/30 text-[#EDEDED]' 
                        : 'bg-[#050505] border-white/5 text-[#8A8A8A]/50'
                    }`}
                  >
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-[#D4AF37]' : 'bg-[#8A8A8A]/30'}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Pan Tool */}
        <button
          onClick={togglePanTool}
          id="btn-pan"
          className={`px-2 py-1 rounded flex items-center gap-1 font-mono text-[11px] border transition-colors ${
            isPanToolActive 
              ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]' 
              : 'bg-[#121212] border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED]'
          }`}
          title="Toggle Vertical Pan Tool (P / Y)"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>PAN Y</span>
        </button>

        {/* Canvas Liquify Studio Button */}
        <button
          onClick={() => setLiquifyModalOpen(true)}
          id="btn-warp"
          className="px-2 py-1 rounded flex items-center gap-1 font-mono text-[11px] bg-[#121212] border border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#FFE066] hover:border-[#D4AF37]/50 transition-colors"
          title="HTML5 Canvas Liquify & Mesh Warp Studio (W)"
        >
          <span className="text-[#D4AF37] font-bold">(•)</span>
          <span>LIQUIFY</span>
        </button>

        {/* Fit Mode Toggle */}
        <button
          onClick={() => {
            const next = fitMode === 'crop-middle' ? 'cover' : fitMode === 'cover' ? 'contain' : 'crop-middle';
            setFitMode(next);
          }}
          className="px-2 py-1 rounded font-mono text-[11px] bg-[#121212] border border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED] transition-colors"
          title="Fit Mode Toggle (Crop Middle / Cover / Contain)"
        >
          FIT: {fitMode.toUpperCase().replace('-', ' ')}
        </button>

        {/* Guides Toggle */}
        <button
          onClick={toggleGuides}
          className={`px-2 py-1 rounded flex items-center gap-1 font-mono text-[11px] border transition-colors ${
            isGuidesActive 
              ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#FFE066]' 
              : 'bg-[#121212] border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED]'
          }`}
          title="Director Framing Guides (C)"
        >
          <Crop className="w-3 h-3 text-[#D4AF37]" />
          <span>GUIDES</span>
        </button>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 border-r border-[#D4AF37]/20 pr-1.5">
          <button
            onClick={undo}
            className="p-1 rounded text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212] transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            className="p-1 rounded text-[#8A8A8A] hover:text-[#EDEDED] hover:bg-[#121212] transition-colors"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command Palette Trigger */}
        <button
          onClick={toggleCommandPalette}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-[#121212] border border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#FFE066] hover:border-[#D4AF37]/50 font-mono text-[11px] transition-colors"
          title="Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3 text-[#D4AF37]" />
          <span>COMMAND</span>
          <span className="text-[9px] bg-black/40 px-1 rounded border border-white/10">⌘K</span>
        </button>

        {/* Diagnostics & Self-Test Doctor */}
        <button
          onClick={toggleDiagnostics}
          className="p-1.5 rounded bg-[#121212] border border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#4ADE80] transition-colors"
          title="Diagnostics & Layout Doctor"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>

        {/* Shortcut Cheat Sheet */}
        <button
          onClick={toggleShortcuts}
          className="p-1.5 rounded bg-[#121212] border border-[#D4AF37]/20 text-[#8A8A8A] hover:text-[#EDEDED] transition-colors"
          title="Shortcut Cheat Sheet (Shift+/)"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Simple / PRO Mode Switch */}
        <button
          onClick={toggleProMode}
          className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border transition-colors ${
            isProMode 
              ? 'bg-[#D4AF37] text-black border-[#D4AF37]' 
              : 'bg-[#121212] text-[#8A8A8A] border-[#D4AF37]/20 hover:text-[#EDEDED]'
          }`}
          title="Toggle Simple / PRO Mode"
        >
          {isProMode ? 'PRO' : 'SIMPLE'}
        </button>

        {/* Export / Git */}
        <button
          onClick={() => setActiveModule('EXPORT')}
          className="px-2.5 py-1 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37] text-[#FFE066] font-mono text-[11px] font-bold transition-colors"
          title="Export / Git Suite"
        >
          EXPORT
        </button>
      </div>
    </header>
  );
};
