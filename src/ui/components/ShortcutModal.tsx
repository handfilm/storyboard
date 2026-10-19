/**
 * RAWx Studio — Shortcut Cheat Sheet Modal
 * Public API: ShortcutModal component
 * Displays full matrix of keyboard shortcuts triggered by Shift+/ or Help button.
 */

import React, { useEffect } from 'react';
import { useStudioStore } from '../../core/store';
import { X, Keyboard } from 'lucide-react';

const shortcutGroups = [
  {
    title: 'Navigation & Playback',
    shortcuts: [
      { key: 'Space', desc: 'Toggle Play / Pause Loop' },
      { key: '← / J', desc: 'Previous Frame' },
      { key: '→ / L', desc: 'Next Frame' },
      { key: '1 - 7', desc: 'Switch Views (Stage, Story, Media, Board, etc.)' },
      { key: 'Z', desc: 'Clean Zen Cinema Mode' },
      { key: 'F', desc: 'Toggle Fullscreen' }
    ]
  },
  {
    title: 'Tools & Canvas Operations',
    shortcuts: [
      { key: 'P / Y', desc: 'Toggle Vertical Pan Tool (Drag on frame)' },
      { key: 'W', desc: 'Open HTML5 Canvas Liquify & Mesh Warp Studio' },
      { key: 'C', desc: 'Toggle Director Framing Guides & Safe Areas' },
      { key: 'S', desc: 'Capture Uncompressed Frame Still (PNG)' },
      { key: 'G', desc: 'Open 100-Frame Contact Sheet Grid' },
      { key: 'M', desc: 'Toggle Web Audio Ambient Synthesizer' }
    ]
  },
  {
    title: 'Display & Chrome Cycling',
    shortcuts: [
      { key: 'T', desc: 'Cycle Titles (All → Bangla Only → Subtitles Only → Off)' },
      { key: 'H', desc: 'Cycle HUD (Full → Reticles → Guides → Off)' },
      { key: 'X', desc: 'Cycle Optics (All → Bloom/Lens → 35mm Grain → Off)' },
      { key: 'V', desc: 'Open Components Visibility Matrix Popover' },
      { key: 'Ctrl + K', desc: 'Open Command Palette' },
      { key: 'Shift + /', desc: 'Open Shortcut Cheat Sheet' }
    ]
  }
];

export const ShortcutModal: React.FC = () => {
  const { isShortcutsOpen, toggleShortcuts } = useStudioStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        toggleShortcuts();
      }
      if (e.key === 'Escape' && isShortcutsOpen) {
        toggleShortcuts();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, toggleShortcuts]);

  if (!isShortcutsOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-fadeIn"
      onClick={toggleShortcuts}
    >
      <div 
        className="w-full max-w-2xl bg-[#0B0B0B] border border-[#D4AF37]/40 rounded-xl shadow-2xl p-4 font-mono text-xs flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
          <div className="flex items-center gap-2 text-[#FFE066] font-bold">
            <Keyboard className="w-4 h-4 text-[#D4AF37]" />
            <span className="tracking-wider">RAWx STUDIO // SHORTCUT CHEAT SHEET</span>
          </div>
          <button onClick={toggleShortcuts} className="text-[#8A8A8A] hover:text-[#EDEDED]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider pb-1 border-b border-white/5">
                {group.title}
              </span>
              <div className="flex flex-col gap-1.5">
                {group.shortcuts.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8A8A8A] truncate max-w-[130px]">{s.desc}</span>
                    <kbd className="bg-[#121212] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded text-[#FFE066] font-bold">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
