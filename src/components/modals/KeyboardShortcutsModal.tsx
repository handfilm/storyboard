/**
 * @file /src/components/modals/KeyboardShortcutsModal.tsx
 * @description Comprehensive, interactive Keyboard Shortcuts modal for the Storyboard Engine.
 * Provides categorized navigation controls, real-time keypress tester, search filter,
 * and quick-start guides tailored for directors and editors.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Keyboard, 
  Search, 
  Play, 
  FastForward, 
  Rewind, 
  Layers, 
  Film, 
  Sliders, 
  Scissors, 
  Download, 
  Copy, 
  Check, 
  Maximize2, 
  Grid, 
  Camera, 
  Tv, 
  Sparkles,
  Command,
  ArrowRight,
  Eye,
  Info
} from 'lucide-react';
import { keyScopeManager, KeyScopeLayer } from '../../core/keyScopeManager';

export interface ShortcutItem {
  key: string;
  keyLabel?: string;
  name: string;
  description: string;
  category: 'navigation' | 'modes' | 'optics' | 'trimmer' | 'system';
  scope?: string;
  tag?: string;
  testCodes?: string[]; // key event codes to match live keypress tester
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (commandId: string) => void;
}

const ALL_SHORTCUTS: ShortcutItem[] = [
  // --- Navigation & Playback ---
  {
    key: 'Space',
    name: 'Loop Playback / Audition',
    description: 'Toggle instantaneous loop playback and sequence audition',
    category: 'navigation',
    scope: 'UNIVERSAL',
    tag: 'ESSENTIAL',
    testCodes: ['Space']
  },
  {
    key: '← / →',
    name: 'Previous / Next Shot',
    description: 'Jump backward or forward between storyboard shots (in Solo: step ±1 frame)',
    category: 'navigation',
    scope: 'STAGE / SOLO',
    tag: 'ESSENTIAL',
    testCodes: ['ArrowLeft', 'ArrowRight']
  },
  {
    key: ', / .',
    name: 'Precise Single-Frame Step',
    description: 'Nudge playhead exactly -1 frame or +1 frame (41.66ms @ 24fps)',
    category: 'navigation',
    scope: 'NLE ENGINE',
    tag: 'PRECISION',
    testCodes: [',', '.']
  },
  {
    key: 'J',
    name: 'Reverse Shuttle',
    description: 'Smooth reverse playback shuttle / step backward in deck',
    category: 'navigation',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyJ', 'j', 'J']
  },
  {
    key: 'K',
    name: 'Stop / Pause Shuttle',
    description: 'Instantly halt playback transport deck and park playhead',
    category: 'navigation',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyK', 'k', 'K']
  },
  {
    key: 'L',
    name: 'Forward Shuttle (2x)',
    description: 'Smooth forward playback shuttle or accelerate playback rate',
    category: 'navigation',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyL', 'l', 'L']
  },
  {
    key: 'Shift + ← / →',
    name: '10-Frame Leap',
    description: 'Fast skip 10 frames (~0.4s) forward or backward in timeline',
    category: 'navigation',
    scope: 'SOLO INSPECTOR',
    testCodes: ['ArrowLeft', 'ArrowRight']
  },
  {
    key: 'Home / End',
    name: 'First / Last Frame',
    description: 'Instantly seek playhead to Head (00:00:00) or Tail of sequence',
    category: 'navigation',
    scope: 'GLOBAL',
    testCodes: ['Home', 'End']
  },

  // --- Storyboard Views & Modes ---
  {
    key: 'Alt + 1',
    name: 'Stage View (Director Solo)',
    description: 'Switch to primary cinema stage player with live aspect guides',
    category: 'modes',
    scope: 'STAGE',
    tag: 'MODE',
    testCodes: ['Digit1', '1']
  },
  {
    key: 'Alt + 2 (or G)',
    name: '100-Frame Contact Sheet Grid',
    description: 'Toggle high-density overview matrix of all shots & sequences',
    category: 'modes',
    scope: 'BOARD',
    tag: 'MODE',
    testCodes: ['KeyG', 'g', 'G', 'Digit2', '2']
  },
  {
    key: 'Alt + 3',
    name: 'Multi-Track Cut Studio',
    description: 'Open non-linear editor timeline with video/audio tracks & razor',
    category: 'modes',
    scope: 'CUT STUDIO',
    tag: 'MODE',
    testCodes: ['Digit3', '3']
  },
  {
    key: 'F',
    name: 'Fullscreen Cinema Monitor',
    description: 'Toggle borderless 2.39:1 fullscreen presentation viewport',
    category: 'modes',
    scope: 'CINEMA',
    tag: 'VIEWPORT',
    testCodes: ['KeyF', 'f', 'F']
  },
  {
    key: 'Z',
    name: 'Zen Director Mode',
    description: 'Hide all UI controls, sidebars, and panels for clean screening',
    category: 'modes',
    scope: 'VIEWPORT',
    testCodes: ['KeyZ', 'z', 'Z']
  },
  {
    key: 'H',
    name: 'Arri RAW Telemetry HUD',
    description: 'Cycle on-screen metadata: shutter, focal length, ISO, and crop marks',
    category: 'modes',
    scope: 'OVERLAY',
    testCodes: ['KeyH', 'h', 'H']
  },

  // --- Camera, Optics & Framing ---
  {
    key: 'P / Y',
    name: 'Vertical Pan & Tilt Tool',
    description: 'Toggle drag-to-reframe tool for anamorphic optical plates',
    category: 'optics',
    scope: 'CAMERA',
    tag: 'OPTICS',
    testCodes: ['KeyP', 'p', 'P', 'KeyY', 'y', 'Y']
  },
  {
    key: 'C',
    name: 'Director Framing Guides',
    description: 'Toggle Rule-of-Thirds, Crosshairs, Center Spot, and Golden Ratio lines',
    category: 'optics',
    scope: 'STAGE',
    tag: 'GUIDES',
    testCodes: ['KeyC', 'c', 'C']
  },
  {
    key: 'T',
    name: 'Bilingual Cinematic Titles',
    description: 'Cycle title overlays: Bilingual Gold Bloom → Subtitles Only → Off',
    category: 'optics',
    scope: 'TYPOGRAPHY',
    tag: 'TITLES',
    testCodes: ['KeyT', 't', 'T']
  },
  {
    key: 'W',
    name: 'Canvas Liquify & Mesh Warp',
    description: 'Launch HTML5 canvas mesh warp, lens deformation & distortion studio',
    category: 'optics',
    scope: 'CANVAS',
    tag: 'FX',
    testCodes: ['KeyW', 'w', 'W']
  },
  {
    key: 'X',
    name: 'Optical Shaders & 35mm Grain',
    description: 'Cycle real-time GL shaders: 35mm Film Grain, Anamorphic Bloom, Halation',
    category: 'optics',
    scope: 'SHADERS',
    testCodes: ['KeyX', 'x', 'X']
  },
  {
    key: 'V',
    name: 'Component Visibility Matrix',
    description: 'Open quick popover to toggle individual HUD layers and indicators',
    category: 'optics',
    scope: 'CHROME',
    testCodes: ['KeyV', 'v', 'V']
  },

  // --- Trimmer & Cut Studio ---
  {
    key: 'I',
    name: 'Mark Subclip In-Point',
    description: 'Set selection start boundary for precision trimming and looping',
    category: 'trimmer',
    scope: 'TRIMMER',
    tag: 'EDITING',
    testCodes: ['KeyI', 'i', 'I']
  },
  {
    key: 'O',
    name: 'Mark Subclip Out-Point',
    description: 'Set selection end boundary for subclip extraction',
    category: 'trimmer',
    scope: 'TRIMMER',
    tag: 'EDITING',
    testCodes: ['KeyO', 'o', 'O']
  },
  {
    key: 'Alt + X',
    name: 'Clear In / Out Markers',
    description: 'Reset trimmed range back to full sequence duration',
    category: 'trimmer',
    scope: 'TRIMMER',
    testCodes: ['KeyX', 'x', 'X']
  },
  {
    key: 'S',
    name: 'Razor Split Clip',
    description: 'Perform razor cut at playhead position in Cut Studio timeline',
    category: 'trimmer',
    scope: 'CUT STUDIO',
    tag: 'EDITING',
    testCodes: ['KeyS', 's', 'S']
  },
  {
    key: 'Delete / Backspace',
    name: 'Delete Selected Clip',
    description: 'Remove active clip from multi-track timeline',
    category: 'trimmer',
    scope: 'CUT STUDIO',
    testCodes: ['Delete', 'Backspace']
  },
  {
    key: 'Shift + Delete',
    name: 'Purge Shot Media (Zero-Loss)',
    description: 'Safely clear media asset from current storyboard slot',
    category: 'trimmer',
    scope: 'SLOT',
    testCodes: ['Delete', 'Backspace']
  },

  // --- System, Commands & Export ---
  {
    key: 'Ctrl + K (Cmd + K)',
    name: 'Studio Command Palette',
    description: 'Access any command, filter, layout change, or tool via instant search',
    category: 'system',
    scope: 'GLOBAL',
    tag: 'SYSTEM',
    testCodes: ['KeyK', 'k', 'K']
  },
  {
    key: 'Shift + / ( ? )',
    name: 'Keyboard Shortcuts Cheat Sheet',
    description: 'Open or close this interactive keyboard shortcuts reference modal',
    category: 'system',
    scope: 'GLOBAL',
    tag: 'HELP',
    testCodes: ['Slash', '/', '?']
  },
  {
    key: 'Ctrl + Z',
    name: 'Undo Last Action',
    description: 'Revert last edit, clip reposition, or parameter change',
    category: 'system',
    scope: 'HISTORY',
    testCodes: ['KeyZ', 'z', 'Z']
  },
  {
    key: 'Ctrl + Shift + Z / Y',
    name: 'Redo Action',
    description: 'Re-apply previously reverted storyboard action',
    category: 'system',
    scope: 'HISTORY',
    testCodes: ['KeyY', 'y', 'Y']
  },
  {
    key: 'Shift + E',
    name: 'Export Custom MP4 Range',
    description: 'Trigger client-side WebCodecs hardware accelerated video muxer',
    category: 'system',
    scope: 'EXPORT',
    tag: 'EXPORT',
    testCodes: ['KeyE', 'e', 'E']
  },
  {
    key: 'S',
    name: 'Capture 4K Cinema Still (PNG)',
    description: 'Save uncompressed color-accurate PNG screenshot of current frame',
    category: 'system',
    scope: 'STAGE',
    tag: 'CAPTURE',
    testCodes: ['KeyS', 's', 'S']
  },
  {
    key: 'M',
    name: 'Toggle Synthesizer Audio / Mute',
    description: 'Mute or activate Web Audio ambient soundscape engine',
    category: 'system',
    scope: 'AUDIO',
    testCodes: ['KeyM', 'm', 'M']
  },
  {
    key: 'Esc',
    name: 'Dismiss Active Modal / Exit Zen',
    description: 'Close active popover, cancel tool selection, or return to Stage',
    category: 'system',
    scope: 'GLOBAL',
    testCodes: ['Escape']
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Shortcuts', icon: Keyboard },
  { id: 'navigation', label: 'Navigation & Transport', icon: Play },
  { id: 'modes', label: 'Views & Viewports', icon: Grid },
  { id: 'optics', label: 'Camera & Optics', icon: Camera },
  { id: 'trimmer', label: 'Trimmer & Cutting', icon: Scissors },
  { id: 'system', label: 'System & Export', icon: Command }
] as const;

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLayer, setActiveLayer] = useState<KeyScopeLayer>('STAGE');
  const [detectedKey, setDetectedKey] = useState<string | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const detectedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

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
      // If typing in the search box, only handle Esc
      const isInput = document.activeElement === searchInputRef.current;
      
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (isInput) return;

      // Ignore standard tab navigation
      if (e.key === 'Tab') return;

      // Identify pressed key for live tester
      const keyName = e.key === ' ' ? 'Space' : e.key;
      setDetectedKey(keyName);

      // Find matching shortcut item
      const match = ALL_SHORTCUTS.find((s) => {
        if (s.testCodes && s.testCodes.includes(e.code)) return true;
        if (s.testCodes && s.testCodes.includes(e.key)) return true;
        return false;
      });

      if (match) {
        setHighlightedKey(match.key);
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
  }, [isOpen, onClose]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setDetectedKey(null);
      setHighlightedKey(null);
    }
  }, [isOpen]);

  // Filtered Shortcuts
  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_SHORTCUTS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        (item.tag && item.tag.toLowerCase().includes(q)) ||
        (item.scope && item.scope.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery]);

  // Copy full cheatsheet as formatted Markdown
  const handleCopyMarkdown = () => {
    let md = '# HANDFILM / RAWx Storyboard Engine — Keyboard Shortcuts Cheat Sheet\n\n';
    CATEGORIES.filter(c => c.id !== 'all').forEach((cat) => {
      md += `## ${cat.label}\n\n`;
      md += '| Shortcut | Action | Scope | Description |\n';
      md += '| :--- | :--- | :--- | :--- |\n';
      const items = ALL_SHORTCUTS.filter(s => s.category === cat.id);
      items.forEach((item) => {
        md += `| \`${item.key}\` | **${item.name}** | ${item.scope || 'Global'} | ${item.description} |\n`;
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
        className="w-full max-w-4xl bg-[#09090C] border border-[#2A2A38] rounded-xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-[#0E0E14] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E50914] to-[#B20710] flex items-center justify-center shadow-lg shadow-red-950/40 text-white">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-mono tracking-wider text-white">
                  STORYBOARD ENGINE // KEYBOARD SHORTCUTS
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30 text-[10px] font-mono font-semibold text-[#F5A623]">
                  <Layers className="w-2.5 h-2.5" />
                  SCOPE: {activeLayer}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Complete tactile control reference for playback, scrubbing, and director inspection
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

        {/* Quick-Start Navigation Hero Bar (The Core 4 Controls) */}
        <div className="px-5 py-3 bg-gradient-to-r from-zinc-900/90 via-[#12121A] to-zinc-900/90 border-b border-zinc-800/70 shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#F5A623] font-semibold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F5A623]" />
              Essential Storyboard Navigation
            </span>
            {detectedKey && (
              <span className="text-emerald-400 animate-pulse flex items-center gap-1 lowercase font-mono">
                key pressed: <span className="font-bold uppercase text-white bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">[{detectedKey}]</span>
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Play/Pause */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between group hover:border-[#E50914]/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
                  <Play className="w-3 h-3 fill-current" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Play / Pause</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Audition loop</div>
                </div>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold shadow-sm">
                Space
              </kbd>
            </div>

            {/* Previous/Next Shot */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between group hover:border-[#F5A623]/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#F5A623]/20 border border-[#F5A623]/40 flex items-center justify-center text-[#F5A623]">
                  <Film className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Next / Prev Shot</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Jump slide</div>
                </div>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold shadow-sm">
                ← / →
              </kbd>
            </div>

            {/* Shuttle Deck */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between group hover:border-cyan-500/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <FastForward className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">NLE Shuttle</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Rev / Stop / Fwd</div>
                </div>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold shadow-sm">
                J K L
              </kbd>
            </div>

            {/* Single Frame Step */}
            <div className="p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 flex items-center justify-between group hover:border-purple-500/50 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-950/40 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Sliders className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Frame Nudge</div>
                  <div className="text-[10px] text-zinc-500 font-mono">±1F (41ms)</div>
                </div>
              </div>
              <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-bold shadow-sm">
                , / .
              </kbd>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Tabs */}
        <div className="p-4 border-b border-zinc-800/70 bg-[#0B0B10] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = cat.id === 'all' 
                ? ALL_SHORTCUTS.length 
                : ALL_SHORTCUTS.filter(s => s.category === cat.id).length;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md shadow-white/10' 
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-zinc-800 text-white' : 'bg-black/50 text-zinc-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-[#F5A623]/80 focus:ring-1 focus:ring-[#F5A623]/50 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div 
          ref={listContainerRef}
          className="p-5 overflow-y-auto max-h-[50vh] space-y-2.5 custom-scrollbar bg-[#08080B]"
        >
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs">
              <Keyboard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No keyboard shortcuts matching "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[#F5A623] hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((item, idx) => {
                const isItemHighlighted = highlightedKey === item.key;
                return (
                  <div
                    key={`${item.key}-${idx}`}
                    className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 group ${
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
                        {item.key}
                      </kbd>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Pro Tips & Context Status */}
        <div className="px-5 py-3 border-t border-zinc-800/80 bg-[#09090E] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-zinc-500 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-zinc-400">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">?</kbd> anytime to open this modal
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
