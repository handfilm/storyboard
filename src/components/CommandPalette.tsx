/**
 * @file /src/components/CommandPalette.tsx
 * @description Global Ctrl+K command palette powered by Feature Registry.
 * Allows quick keyboard execution, tool activation, and feature location.
 */

import React, { useState, useEffect, useRef } from 'react';
import { featureRegistry, StudioFeature } from '../core/featureRegistry';
import { Search, Command, ArrowRight, CornerDownLeft, Sparkles, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (commandId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecuteCommand
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredFeatures = featureRegistry.search(query);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredFeatures.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredFeatures.length) % Math.max(1, filteredFeatures.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredFeatures[selectedIndex];
      if (selected) {
        onExecuteCommand(selected.commandId);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0B0C10] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3 bg-black/40">
          <Command className="w-4 h-4 text-[#D4AF37]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a feature, tool, or shortcut (e.g. pan, liquify, aspect)..."
            className="flex-1 bg-transparent text-white font-mono-tech text-xs placeholder:text-white/30 outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-white/40 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/15 text-[8.5px] text-[#D4AF37] font-mono-tech rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar">
          {filteredFeatures.length === 0 ? (
            <div className="py-8 text-center text-white/40 font-mono-tech text-xs">
              No matching features found in registry.
            </div>
          ) : (
            filteredFeatures.map((feature, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={feature.id}
                  onClick={() => {
                    onExecuteCommand(feature.commandId);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded-[1px] flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FFE066]' 
                      : 'text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tech text-[11px] font-semibold truncate">
                        {feature.name}
                      </span>
                      <span className="px-1 py-0.2 rounded-[1px] bg-white/10 text-[7.5px] font-mono-tech text-[#D4AF37] uppercase">
                        {feature.module}
                      </span>
                    </div>
                    <span className="text-[9px] text-white/50 truncate">
                      {feature.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {feature.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded-[1px] bg-black/60 border border-white/20 text-[8.5px] text-[#FFE066] font-mono-tech font-bold">
                        {feature.shortcut}
                      </kbd>
                    )}
                    <span className="text-[8px] text-white/30 hidden sm:inline">
                      {feature.path}
                    </span>
                    <CornerDownLeft className={`w-3 h-3 ${isSelected ? 'text-[#D4AF37]' : 'text-white/20'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3 py-2 bg-black/60 border-t border-white/10 flex items-center justify-between text-[8px] font-mono-tech text-white/40">
          <span>Navigate with ↑ / ↓ • Select with Enter • Locate in UI</span>
          <span>RAWx Feature Registry (16 core capabilities)</span>
        </div>
      </div>
    </div>
  );
};
