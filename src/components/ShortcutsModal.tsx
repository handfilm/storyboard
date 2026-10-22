/**
 * @file /src/components/ShortcutsModal.tsx
 * @description Visual keyboard shortcut cheat sheet triggered via Shift+/ or topbar.
 */

import React, { useState, useEffect } from 'react';
import { X, Keyboard, Sparkles, Layers } from 'lucide-react';
import { keyScopeManager, KeyScopeLayer } from '../core/keyScopeManager';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  scopeBadge?: string;
  items: { key: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Stage Slider (Active: STAGE)',
    scopeBadge: 'STAGE LAYER',
    items: [
      { key: 'Space', description: 'Instant Loop Audition (Play / Pause)' },
      { key: '← / →', description: 'Previous / Next Shot' },
      { key: ', / .', description: 'Frame Step (-1 Frame / +1 Frame at 24fps)' },
      { key: 'F', description: 'Open Full-Screen Cinema Player (or Clean Click)' },
      { key: 'G', description: 'Toggle 100-Frame Contact Sheet Grid' },
      { key: 'Shift + Del', description: 'Instant Media Purge (Zero-Loss Cleanup)' },
      { key: 'Alt+1 / 2 / 3', description: 'Switch STAGE / BOARD / CUT Modes' },
    ]
  },
  {
    category: 'Cinema Player (Active: CINEMA)',
    scopeBadge: 'CINEMA LAYER',
    items: [
      { key: 'Space', description: 'Play / Pause Master Feed' },
      { key: '← / →', description: 'Skip 10 Seconds Backward / Forward' },
      { key: 'Shift + ← / →', description: 'Precise Single-Frame Step (1/24s)' },
      { key: 'J / K / L', description: 'NLE Cinema Shuttle (Reverse / Pause / 2x)' },
      { key: 'M', description: 'Toggle Audio Mute' },
      { key: 'F', description: 'Toggle Cinema Container Fullscreen' },
      { key: 'C', description: 'Toggle Bilingual Cinematic Titles / CC' },
      { key: 'Esc', description: 'Exit Cinema Player to Stage' },
    ]
  },
  {
    category: 'Clip Trimmer (Active: TRIMMER)',
    scopeBadge: 'TRIMMER LAYER',
    items: [
      { key: 'I', description: 'Mark In Point (Subclip Start)' },
      { key: 'O', description: 'Mark Out Point (Subclip End)' },
      { key: 'S', description: 'Split Clip / Insert Keyframe Cut' },
      { key: 'J / K / L', description: 'Trimmer Transport Shuttle' },
      { key: '← / →', description: 'Step Frame (-1F / +1F)' },
    ]
  },
  {
    category: 'Camera, Optics & Framing',
    items: [
      { key: 'P / Y', description: 'Toggle Vertical Pan Alignment (0-100%)' },
      { key: 'W', description: 'Open Canvas Liquify & Mesh Warp Studio' },
      { key: 'C', description: 'Toggle Rule of Thirds & Crosshair Guides' },
      { key: 'V', description: 'Open Component Visibility Matrix Popover' },
      { key: 'H', description: 'Cycle Arri RAW Telemetry HUD' },
      { key: 'T', description: 'Cycle Titles & Subtitle Visibility' },
      { key: 'X', description: 'Cycle Optical Shaders (Grain / Bloom / Lens)' },
    ]
  },
  {
    category: 'Studio Commands & Export',
    items: [
      { key: 'Ctrl + K', description: 'Open Studio Command Palette' },
      { key: 'Shift + /', description: 'Open Keyboard Shortcuts Cheat Sheet' },
      { key: 'Ctrl + Z', description: 'Undo Last Action' },
      { key: 'Ctrl + Y', description: 'Redo Action' },
      { key: 'Shift + E', description: 'Export Custom Frame Range to MP4' },
      { key: 'S', description: 'Capture 4K High-Res Cinema Still PNG' },
      { key: 'Esc', description: 'Close Modals / Exit Zen Mode' },
    ]
  }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeLayer, setActiveLayer] = useState<KeyScopeLayer>(keyScopeManager.getActiveLayer());

  useEffect(() => {
    return keyScopeManager.subscribe((l) => setActiveLayer(l));
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-[#0B0B0B] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-[#EDEDED]">
              STUDIO KEYBOARD SHORTCUTS
            </h2>
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-[1px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[9px] font-mono text-[#D4AF37]">
              <Layers className="w-3 h-3 text-[#D4AF37]" />
              <span className="font-bold">ACTIVE SCOPE: {activeLayer}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 4-Column / 2-Column Grid */}
        <div className="p-5 max-h-[70vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 no-scrollbar">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-2">
              <h3 className="font-mono-tech text-[9.5px] tracking-wider uppercase text-[#D4AF37] border-b border-white/10 pb-1 flex items-center justify-between">
                <span>{group.category}</span>
                <span className="text-white/30 text-[8px]">{group.items.length} keys</span>
              </h3>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item, iIdx) => (
                  <div 
                    key={iIdx}
                    className="flex items-center justify-between py-1 px-2 rounded-[1px] bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-colors"
                  >
                    <span className="text-[10px] text-white/70 font-mono-tech">
                      {item.description}
                    </span>
                    <kbd className="px-2 py-0.5 rounded-[1px] bg-black/80 border border-[#D4AF37]/40 text-[#FFE066] font-mono-tech text-[9px] font-bold shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[8.5px] font-mono-tech text-white/40">
          <span>Press ESC or click anywhere outside to close</span>
          <span className="text-[#D4AF37]">RAWx Storyboard Engine Enterprise</span>
        </div>
      </div>
    </div>
  );
};
