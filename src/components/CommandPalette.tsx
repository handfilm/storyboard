/**
 * @file /src/components/CommandPalette.tsx
 * @description Global Ctrl+K command palette powered by Feature Registry.
 * Allows quick keyboard execution, tool activation, and feature location.
 */

import React, { useState, useEffect, useRef } from 'react';
import { featureRegistry } from '../core/featureRegistry';
import { Command, CornerDownLeft, X } from 'lucide-react';
import { CinemaToolHUD } from './ui/CinemaToolHUD';

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
          <Command className="w-4 h-4 text-[#D4AF37]" strokeWidth={2.2} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH COMMANDS..."
            className="flex-1 bg-transparent text-white font-mono-tech text-xs font-bold tracking-wider placeholder:text-white/30 outline-none uppercase"
          />
          {query && (
            <CinemaToolHUD
              title="CLEAR SEARCH"
              en="Clear command search input."
              bn="কীভাবে ব্যবহার করবেন: সার্চ বক্স খালি করতে ক্লিক করুন।"
              accent="crimson"
              side="bottom"
            >
              <button
                onClick={() => setQuery('')}
                className="cinema-tile cinema-tile-crimson p-1"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </CinemaToolHUD>
          )}
          <CinemaToolHUD
            title="CLOSE PALETTE"
            en="Exit quick command palette."
            bn="কীভাবে ব্যবহার করবেন: বন্ধ করতে ক্লিক করুন বা ESC চাপুন।"
            shortcut="ESC"
            accent="amber"
            side="bottom"
          >
            <button
              onClick={onClose}
              className="cinema-tile cinema-tile-amber px-2 py-0.5 text-[9px] font-black tracking-wider uppercase"
            >
              ESC
            </button>
          </CinemaToolHUD>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 flex flex-col gap-1.5 no-scrollbar">
          {filteredFeatures.length === 0 ? (
            <div className="py-8 text-center text-white/40 font-black tracking-wider text-[10px] uppercase">
              NO COMMANDS
            </div>
          ) : (
            filteredFeatures.map((feature, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <CinemaToolHUD
                  key={feature.id}
                  title={feature.name.toUpperCase()}
                  en={feature.description}
                  bn={`কীভাবে ব্যবহার করবেন: "${feature.name}" চালু করতে ক্লিক করুন বা Enter চাপুন।`}
                  shortcut={feature.shortcut}
                  accent="amber"
                  side="right"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => {
                      onExecuteCommand(feature.commandId);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-3 py-2 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase truncate">
                        {feature.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[1px] bg-white/10 text-[8px] font-black text-[#D4AF37] uppercase shrink-0">
                        {feature.module}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {feature.shortcut && (
                        <kbd className="px-1.5 py-0.5 rounded-[1px] bg-black/60 border border-white/20 text-[9px] text-[#FFE066] font-mono-tech font-bold">
                          {feature.shortcut}
                        </kbd>
                      )}
                      <CornerDownLeft className={`w-3.5 h-3.5 ${isSelected ? 'text-[#D4AF37]' : 'text-white/30'}`} strokeWidth={2.2} />
                    </div>
                  </button>
                </CinemaToolHUD>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

