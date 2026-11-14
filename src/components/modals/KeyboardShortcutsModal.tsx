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
import { CinemaToolHUD, CinemaBadgeHeader } from '../ui/CinemaToolHUD';

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
      if (e.key === '?' || (e.shiftKey && (e.key === '/' || e.code === 'Slash'))) {
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
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts Cheat Sheet"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150 shortcuts-dialog"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl bg-[#09090C] border border-[#2A2A38] rounded-xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col max-h-[92vh] overflow-hidden text-zinc-200 shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-[#0E0E14] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <CinemaBadgeHeader
              icon={<Keyboard className="w-4 h-4 text-[#fbbf24]" strokeWidth={2.2} />}
              label="HOTKEYS"
              accent="amber"
            />
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5A623]/15 border border-[#F5A623]/30 text-[10px] font-black text-[#F5A623] uppercase">
              <Layers className="w-2.5 h-2.5" />
              {activeLayer}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CinemaToolHUD
              title="COPY MARKDOWN"
              en="Copy all keyboard shortcuts as a Markdown cheatsheet."
              bn="কীভাবে ব্যবহার করবেন: শর্টকাট তালিকা কপি করতে ক্লিক করুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                onClick={handleCopyMarkdown}
                data-active={copiedMarkdown ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan min-h-[38px] px-3 py-1.5 flex items-center gap-1.5"
              >
                {copiedMarkdown ? <Check className="w-3.5 h-3.5" strokeWidth={2.2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2.2} />}
                <span className="font-black tracking-wider text-[10px] uppercase">{copiedMarkdown ? 'COPIED' : 'COPY MD'}</span>
              </button>
            </CinemaToolHUD>
            <CinemaToolHUD
              title="CLOSE HOTKEYS"
              en="Close the keyboard shortcuts reference modal."
              bn="কীভাবে ব্যবহার করবেন: বন্ধ করতে ক্লিক করুন বা ESC চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="left"
            >
              <button
                onClick={onClose}
                className="cinema-tile cinema-tile-crimson min-h-[38px] px-2.5 flex items-center gap-1"
                aria-label="Close Shortcuts"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">CLOSE</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Live Keypress Tester & Status Banner */}
        <div className="px-5 py-2 bg-gradient-to-r from-zinc-900/90 via-[#12121A] to-zinc-900/90 border-b border-zinc-800/70 shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">KEY TEST</span>
            {detectedKey && (
              <span className="font-black uppercase text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px]">
                [{detectedKey}]
              </span>
            )}
          </div>
          <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
            {filteredShortcuts.length} / {shortcuts.length}
          </span>
        </div>

        {/* Search Input Bar & Category Filters */}
        <div className="p-4 border-b border-zinc-800/70 bg-[#0B0B10] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH HOTKEYS..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-zinc-900/90 border border-zinc-700/80 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#F5A623] font-mono uppercase"
            />
            {searchQuery && (
              <CinemaToolHUD
                title="CLEAR SEARCH"
                en="Clear shortcut search filter."
                bn="কীভাবে ব্যবহার করবেন: সার্চ মুছতে ক্লিক করুন।"
                accent="crimson"
                side="top"
              >
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 p-0.5 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </CinemaToolHUD>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
            <CinemaToolHUD
              title="ALL SHORTCUTS"
              en="Display shortcuts from all studio categories."
              bn="কীভাবে ব্যবহার করবেন: সব ক্যাটাগরির শর্টকাট দেখতে ক্লিক করুন।"
              accent="amber"
              side="top"
            >
              <button
                onClick={() => setSelectedCategory('all')}
                data-active={selectedCategory === 'all' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber min-h-[38px] px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="font-black tracking-wider text-[10px] uppercase">ALL</span>
                <span className="text-[10px] opacity-75">{shortcuts.length}</span>
              </button>
            </CinemaToolHUD>

            {ORDERED_CATEGORIES.map((catKey) => {
              const Icon = CATEGORY_ICONS[catKey];
              const label = CATEGORY_LABELS[catKey].split('&')[0].trim().toUpperCase();
              const count = shortcuts.filter((s) => s.category === catKey).length;
              const isSelected = selectedCategory === catKey;

              return (
                <CinemaToolHUD
                  key={catKey}
                  title={`${label} SHORTCUTS`}
                  en={`Show keyboard shortcuts for ${label}.`}
                  bn="কীভাবে ব্যবহার করবেন: এই ক্যাটাগরির শর্টকাট ফিল্টার করতে চাপুন।"
                  accent="amber"
                  side="top"
                >
                  <button
                    onClick={() => setSelectedCategory(catKey)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber min-h-[38px] px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] uppercase">{label}</span>
                    <span className="text-[10px] opacity-75">{count}</span>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        </div>

        {/* Categorized Shortcuts List Content */}
        <div className="p-5 overflow-y-auto max-h-[55vh] space-y-6 custom-scrollbar bg-[#08080B]">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center gap-3">
              <Keyboard className="w-8 h-8 opacity-30 text-zinc-400" />
              <span className="font-black tracking-wider text-[10px] uppercase">NO MATCHES</span>
              <CinemaToolHUD
                title="CLEAR FILTER"
                en="Reset shortcut search query."
                bn="কীভাবে ব্যবহার করবেন: সার্চ ফিল্টার মুছতে ক্লিক করুন।"
                accent="amber"
                side="top"
              >
                <button
                  onClick={() => setSearchQuery('')}
                  className="cinema-tile cinema-tile-amber px-3.5 py-1.5 text-[10px] font-black tracking-wider uppercase"
                >
                  CLEAR SEARCH
                </button>
              </CinemaToolHUD>
            </div>
          ) : (
            ORDERED_CATEGORIES.map((catKey) => {
              const items = groupedShortcuts[catKey];
              if (!items || items.length === 0) return null;
              const Icon = CATEGORY_ICONS[catKey];
              const label = CATEGORY_LABELS[catKey].split('&')[0].trim().toUpperCase();

              return (
                <div key={catKey} className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                    <CinemaBadgeHeader
                      icon={<Icon className="w-3.5 h-3.5 text-[#F5A623]" strokeWidth={2.2} />}
                      label={label}
                      accent="amber"
                    />
                    <span className="text-[10px] font-black text-zinc-500">{items.length}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {items.map((item) => {
                      const isItemHighlighted =
                        highlightedKey === item.currentKey ||
                        highlightedKey === item.defaultKey;

                      return (
                        <CinemaToolHUD
                          key={item.id}
                          title={item.name.toUpperCase()}
                          en={item.description}
                          bn={`কীভাবে ব্যবহার করবেন: কিবোর্ডে "${item.currentKey}" চাপুন অথবা সরাসরি চালাতে ক্লিক করুন।`}
                          shortcut={item.currentKey}
                          accent="amber"
                          side="top"
                          blockWrapper
                        >
                          <button
                            type="button"
                            onClick={() => onSelectAction?.(item.id)}
                            data-active={isItemHighlighted ? 'true' : 'false'}
                            className="cinema-tile cinema-tile-amber w-full min-h-[48px] p-3 flex items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase truncate">
                                {item.name}
                              </span>
                              {item.tag && (
                                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-zinc-300 uppercase shrink-0">
                                  {item.tag}
                                </span>
                              )}
                            </div>

                            <kbd className="px-2.5 py-1 rounded-md bg-black/90 border border-zinc-700/80 text-[#FFE066] text-xs font-mono font-bold tracking-wider shrink-0">
                              {item.currentKey}
                            </kbd>
                          </button>
                        </CinemaToolHUD>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-zinc-800/80 bg-[#09090E] flex items-center justify-between text-[10px] font-black tracking-wider text-zinc-500 uppercase shrink-0">
          <span>[?] TOGGLE</span>
          <span className="text-[#F5A623]">HANDFILM CORE</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
