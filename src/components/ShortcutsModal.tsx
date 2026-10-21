/**
 * @file /src/components/ShortcutsModal.tsx
 * @description Visual keyboard shortcut cheat sheet triggered via Shift+/ or topbar.
 */

import React from 'react';
import { X, Keyboard, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  category: string;
  items: { key: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'NLE Playback & Transport',
    items: [
      { key: 'Space', description: 'Instant Loop Audition (Play / Pause)' },
      { key: 'J / K / L', description: 'NLE Shuttle (Rewind / Pause / Forward)' },
      { key: '← / →', description: 'Frame-by-Frame Nudge (1/24s @ 41.66ms)' },
      { key: 'Shift + Del', description: 'Instant Media Purge (Zero-Loss Cleanup)' },
      { key: 'G', description: 'Toggle 100-Frame Contact Sheet' },
      { key: 'Alt+1 / 2 / 3', description: 'Switch STAGE / BOARD / CUT Modes' },
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
    category: 'Audio, Still & Export',
    items: [
      { key: 'Shift + E', description: 'Export Custom Frame Range to MP4 Video (WebCodecs)' },
      { key: 'M', description: 'Toggle Audio Track / Mute' },
      { key: 'S', description: 'Capture 4K High-Res Cinema Still PNG' },
      { key: 'F', description: 'Toggle Native Cinema Fullscreen' },
      { key: 'Z', description: 'Toggle Clean Cinema Zen Mode' },
      { key: 'E', description: 'Toggle Director Optics Inspector' },
    ]
  },
  {
    category: 'Studio Commands',
    items: [
      { key: 'Ctrl + K', description: 'Open Studio Command Palette' },
      { key: 'Shift + /', description: 'Open Keyboard Shortcuts Cheat Sheet' },
      { key: 'Ctrl + Z', description: 'Undo Last Action' },
      { key: 'Ctrl + Y', description: 'Redo Action' },
      { key: 'Esc', description: 'Close Modals / Exit Zen Mode' },
    ]
  }
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-[#0B0C10] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] text-white">
              STUDIO KEYBOARD SHORTCUTS
            </h2>
            <span className="px-1.5 py-0.5 rounded-[1px] bg-[#D4AF37]/20 text-[8.5px] font-mono-tech text-[#FFE066]">
              DIRECTOR CHEAT SHEET
            </span>
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
