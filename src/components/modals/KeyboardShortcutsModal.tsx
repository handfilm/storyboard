/**
 * @file /src/components/modals/KeyboardShortcutsModal.tsx
 * @description Comprehensive, interactive Keyboard Shortcuts modal for RAWx / HANDFILM.
 * Features:
 * - Real-time instant search input field filtering shortcuts as user types
 * - Restructured categorized grouping (Playback, Navigation, Visual FX, Trimmer, Export, System)
 * - Live keypress detector & tester with visual highlighting
 * - Category jump tabs & markdown cheatsheet exporter
 * - Synchronized with custom rebindings from customShortcutsService
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Keyboard, 
  Search, 
  Play, 
  Scissors, 
  Camera, 
  Download, 
  Command, 
  Copy, 
  Check, 
  Sparkles,
  Sliders,
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  customShortcutsService, 
  ShortcutDefinition, 
  ShortcutCategory, 
  CATEGORY_LABELS 
} from '../../services/customShortcutsService';
import { keyScopeManager, KeyScopeLayer } from '../../core/keyScopeManager';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (commandId: string) => void;
}

const CATEGORY_ICONS: Record<ShortcutCategory, React.ElementType> = {
  playback: Play,
  navigation: Compass,
  vfx: Camera,
  trimmer: Scissors,
  export: Download,
  system: Command
};

const ORDERED_CATEGORIES: ShortcutCategory[] = [
  'playback',
  'navigation',
  'vfx',
  'trimmer',
  'export',
  'system'
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(() =>
    customShortcutsService.getShortcuts()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<KeyScopeLayer>('STAGE');
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const detectedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with customShortcutsService
  useEffect(() => {
    setShortcuts(customShortcutsService.getShortcuts());
    return customShortcutsService.subscribe((updated) => setShortcuts(updated));
  }, []);

  // Sync active key scope layer
  useEffect(() => {
    try {
      setActiveLayer(keyScopeManager.getActiveLayer());
      return keyScopeManager.subscribe((layer) => setActiveLayer(layer));
    } catch {
      // Fallback if keyScopeManager not mounted
    }
  }, []);

  // Handle live key detection & Esc closing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement === searchInputRef.current;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (isInput) return;

      // Toggle close modal when '?' or Shift + / is pressed again
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') return;

      // Identify pressed key for live tester
      const keyName = e.key === ' ' ? 'Space' : e.key;
      setDetectedKey(keyName);

      // Find matching shortcut item
      const match = shortcuts.find((s) => {
        if (s.testCodes && s.testCodes.includes(e.code)) return true;
        if (s.testCodes && s.testCodes.includes(e.key)) return true;
        if (s.currentKey.toLowerCase() === keyName.toLowerCase()) return true;
        return false;
      });

      if (match) {
        setHighlightedKey(match.currentKey);
      }

      if (detectedTimerRef.current) clearTimeout(detectedTimerRef.current);
      detectedTimerRef.current = setTimeout(() => {
        setDetectedKey(null);
        setHighlightedKey(null);
      }, 2500);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (detectedTimerRef.current) clearTimeout(detectedTimerRef.current);
    };
  }, [isOpen, onClose, shortcuts]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDetectedKey(null);
      setHighlightedKey(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Filtered Shortcuts
  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return shortcuts.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.currentKey.toLowerCase().includes(q) ||
        item.defaultKey.toLowerCase().includes(q) ||
        (item.tag && item.tag.toLowerCase().includes(q)) ||
        (item.scope && item.scope.toLowerCase().includes(q))
      );
    });
  }, [shortcuts, selectedCategory, searchQuery]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const groups: Record<ShortcutCategory, ShortcutDefinition[]> = {
      playback: [],
      navigation: [],
      vfx: [],
      trimmer: [],
      export: [],
      system: []
    };

    filteredShortcuts.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      }
    });

    return groups;
  }, [filteredShortcuts]);

  // Copy full cheatsheet as formatted Markdown
  const handleCopyMarkdown = () => {
    let md = '# HANDFILM / RAWx Storyboard Engine — Keyboard Shortcuts Cheat Sheet\n\n';
    ORDERED_CATEGORIES.forEach((cat) => {
      const items = shortcuts.filter((s) => s.category === cat);
      if (items.length === 0) return;
      md += `## ${CATEGORY_LABELS[cat]}\n\n`;
      md += '| Shortcut | Action | Scope | Description |\n';
      md += '| :--- | :--- | :--- | :--- |\n';
      items.forEach((item) => {
        md += `| \`${item.currentKey}\` | **${item.name}** | ${item.scope || 'Global'} | ${item.description} |\n`;
      });
      md += '\n';
    });

    navigator.clipboard.writeText(md).then(() => {
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-[#09090C] border border-[#2A2A38] rounded-xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#0E0E14] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E50914] to-[#B20710] flex items-center justify-center shadow-lg shadow-red-950/40 text-white">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold font-mono tracking-wider text-white">
                  HANDFILM // KEYBOARD SHORTCUTS
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30 text-[10px] font-mono font-semibold text-[#F5A623]">
                  <Layers className="w-2.5 h-2.5" />
                  SCOPE: {activeLayer}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-400">
                  PRESS [?] TO TOGGLE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Complete tactile control reference grouped by category for Playback, Navigation, Visual FX, & Export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              title="Copy shortcuts as Markdown table"
              className="px-2.5 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700/50 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Copy MD</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Keypress Tester & Status Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-zinc-900/90 via-[#12121A] to-zinc-900/90 border-b border-zinc-800/70 shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="text-[11px] font-mono text-zinc-400">
              Interactive Hotkey Listener:
            </span>
            {detectedKey ? (
              <span className="text-emerald-400 animate-pulse flex items-center gap-1 font-mono text-[11px]">
                Key Detected:
                <span className="font-bold uppercase text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  [{detectedKey}]
                </span>
              </span>
            ) : (
              <span className="text-zinc-500 font-mono text-[10px]">
                Press any physical key to test and highlight its shortcut
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            {filteredShortcuts.length} of {shortcuts.length} commands visible
          </span>
        </div>

        {/* Search Input Bar & Category Filters */}
        <div className="p-4 border-b border-zinc-800/70 bg-[#0B0B10] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Real-Time Search Field */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts in real-time (e.g. Space, Shuttle, FX, Export)..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-900/90 border border-zinc-700/80 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623]/50 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md shadow-white/10'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800/80'
              }`}
            >
              <span>All Categories</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-zinc-800 text-white' : 'bg-black/50 text-zinc-500'}`}>
                {shortcuts.length}
              </span>
            </button>

            {ORDERED_CATEGORIES.map((catKey) => {
              const Icon = CATEGORY_ICONS[catKey];
              const label = CATEGORY_LABELS[catKey];
              const count = shortcuts.filter((s) => s.category === catKey).length;
              const isSelected = selectedCategory === catKey;

              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md shadow-white/10'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label.split('&')[0].trim()}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-zinc-800 text-white' : 'bg-black/50 text-zinc-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorized Shortcuts List Content */}
        <div className="p-5 overflow-y-auto max-h-[55vh] space-y-6 custom-scrollbar bg-[#08080B]">
          {filteredShortcuts.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 font-mono text-xs">
              <Keyboard className="w-9 h-9 mx-auto mb-3 opacity-30 text-zinc-400" />
              <p className="text-zinc-300 font-semibold">No keyboard shortcuts match "{searchQuery}"</p>
              <p className="text-zinc-500 mt-1">Try searching by key name, action, or scope</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-3 px-3 py-1 bg-zinc-800 text-[#F5A623] hover:bg-zinc-700 rounded text-xs transition-colors"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            ORDERED_CATEGORIES.map((catKey) => {
              const items = groupedShortcuts[catKey];
              if (!items || items.length === 0) return null;
              const Icon = CATEGORY_ICONS[catKey];
              const label = CATEGORY_LABELS[catKey];

              return (
                <div key={catKey} className="space-y-2.5">
                  {/* Category Group Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-[#F5A623]">
                        <Icon className="w-3 h-3" />
                      </div>
                      <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-200 uppercase">
                        {label}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {items.length} command{items.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Commands Grid for this category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {items.map((item) => {
                      const isItemHighlighted =
                        highlightedKey === item.currentKey ||
                        highlightedKey === item.defaultKey;

                      return (
                        <div
                          key={item.id}
                          onClick={() => onSelectAction?.(item.id)}
                          className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 group cursor-pointer ${
                            isItemHighlighted
                              ? 'bg-[#F5A623]/10 border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.25)] ring-1 ring-[#F5A623]'
                              : 'bg-zinc-900/40 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/80'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors">
                                {item.name}
                              </span>
                              {item.tag && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider ${
                                  item.tag === 'ESSENTIAL'
                                    ? 'bg-red-950/60 text-[#E50914] border-red-800/50'
                                    : item.tag === 'PRO TRANSPORT'
                                    ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800/50'
                                    : item.tag === 'EXPORT'
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                  {item.tag}
                                </span>
                              )}
                              {item.scope && (
                                <span className="text-[9px] font-mono text-zinc-500">
                                  [{item.scope}]
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              {item.description}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center pt-0.5">
                            <kbd className="px-2.5 py-1 rounded-md bg-black/90 border border-zinc-700/80 text-zinc-200 text-xs font-mono font-bold shadow-md shadow-black tracking-wider text-center min-w-[36px] group-hover:border-[#F5A623]/60 group-hover:text-[#FFE066] transition-colors">
                              {item.currentKey}
                            </kbd>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Pro Tips & Context Status */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-[#09090E] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-zinc-500 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">?</kbd> to toggle, or rebind keys anytime in Settings
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">Esc</kbd> to exit</span>
            <span className="text-zinc-600">|</span>
            <span className="text-[#F5A623] font-semibold">HANDFILM DIRECTOR CORE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
