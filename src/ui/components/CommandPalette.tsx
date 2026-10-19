/**
 * RAWx Studio — Command Palette (cmdk)
 * Public API: CommandPalette component
 * Powers instant fuzzy search across all registered features and shortcuts (Ctrl+K).
 */

import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useStudioStore } from '../../core/store';
import { getAllFeatures, RegisteredFeature } from '../../core/registry';
import { Search, Sparkles, Sliders, Play, Layers, Download, Check } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    toggleCommandPalette,
    setActiveModule,
    togglePanTool,
    setLiquifyModalOpen,
    toggleGuides,
    togglePlay,
    toggleAudio,
    toggleZenMode,
    toggleDiagnostics,
    toggleInspector
  } = useStudioStore();

  const [search, setSearch] = useState('');
  const features = getAllFeatures();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, toggleCommandPalette]);

  if (!isCommandPaletteOpen) return null;

  const handleSelectFeature = (f: RegisteredFeature) => {
    toggleCommandPalette();
    switch (f.commandId) {
      case 'tools:pan':
        togglePanTool();
        break;
      case 'tools:liquify':
        setLiquifyModalOpen(true);
        break;
      case 'tools:guides':
        toggleGuides();
        break;
      case 'player:toggle':
        togglePlay();
        break;
      case 'audio:toggle':
        toggleAudio();
        break;
      case 'view:zen':
        toggleZenMode();
        break;
      case 'view:stage':
        setActiveModule('PLAYER');
        break;
      case 'view:story':
        setActiveModule('STORY');
        break;
      case 'view:media':
        setActiveModule('MEDIA');
        break;
      case 'view:grid':
        setActiveModule('BOARD');
        break;
      case 'view:timeline':
        setActiveModule('BOARD');
        break;
      case 'export:suite':
        setActiveModule('EXPORT');
        break;
      default:
        setActiveModule(f.module);
        break;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4 z-50 select-none animate-fadeIn"
      onClick={() => toggleCommandPalette()}
    >
      <div 
        className="w-full max-w-xl bg-[#0B0B0B] border border-[#D4AF37]/40 rounded-xl shadow-2xl overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[#D4AF37]/20 bg-[#121212]/50">
          <Search className="w-4 h-4 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Type a command or search feature (e.g. Liquify, Pan, Story, Export)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-[#EDEDED] placeholder-[#8A8A8A] outline-none text-xs"
          />
          <kbd className="text-[10px] bg-black/60 text-[#8A8A8A] px-1.5 py-0.5 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-1">
          {features
            .filter(f => 
              !search || 
              f.name.toLowerCase().includes(search.toLowerCase()) || 
              f.description.toLowerCase().includes(search.toLowerCase()) ||
              f.module.toLowerCase().includes(search.toLowerCase())
            )
            .map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelectFeature(f)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-[#121212] border border-transparent hover:border-[#D4AF37]/30 transition-colors text-left group"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#EDEDED] group-hover:text-[#FFE066]">{f.name}</span>
                    <span className="text-[9px] px-1 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                      {f.module}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8A8A8A] truncate max-w-md">{f.description}</span>
                </div>

                {f.shortcut && (
                  <kbd className="text-[10px] bg-black text-[#D4AF37] px-1.5 py-0.5 rounded border border-[#D4AF37]/30 font-bold">
                    {f.shortcut}
                  </kbd>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
