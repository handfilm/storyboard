/**
 * @file /src/components/ThemeSettingsModal.tsx
 * @description Theme & Studio Appearance Configuration.
 * Conforms to design tokens (bg #050505, surface #0B0B0B, raised #121212, gold #D4AF37, text #EDEDED, muted #8A8A8A, 8px grid).
 * Supports themes: RAWx Gold, Warm Film, Cold Steel, Paper Light, High Contrast, and density options.
 */

import React, { useState } from 'react';
import { themeManager, THEMES, ThemeId, DensityMode } from '../core/theme';
import { X, Check, Palette, Sparkles, SlidersHorizontal, Sun, Moon } from 'lucide-react';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState(() => themeManager.getSettings());

  if (!isOpen) return null;

  const handleSelectTheme = (themeId: ThemeId) => {
    themeManager.setTheme(themeId);
    setSettings(themeManager.getSettings());
  };

  const handleSelectDensity = (density: DensityMode) => {
    themeManager.setDensity(density);
    setSettings(themeManager.getSettings());
  };

  const themeList = Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][];

  return (
    <div 
      className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0B0C10] border border-[#D4AF37]/50 rounded-[2px] shadow-[0_30px_80px_rgba(0,0,0,0.95)] flex flex-col font-mono-tech overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.2em] text-white">
              STUDIO DESIGN SYSTEM & THEMES
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh] no-scrollbar">
          {/* Themes */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-2.5 flex items-center gap-1.5">
              <span>COLOR PALETTE PRESETS (5 THEMES)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {themeList.map(([id, t]) => {
                const isSelected = settings.theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectTheme(id)}
                    className={`p-2.5 rounded-[1px] border text-left cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                        : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider">{t.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-[#D4AF37]" />}
                    </div>
                    {/* Color Swatch Dots */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.bg }} title="Background" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.surface }} title="Surface" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.accent }} title="Accent" />
                      <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.text }} title="Text" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density Mode */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#D4AF37] mb-2.5 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3" />
              <span>INTERFACE DENSITY</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map(d => {
                const isSelected = settings.density === d;
                return (
                  <button
                    key={d}
                    onClick={() => handleSelectDensity(d)}
                    className={`py-2 px-3 rounded-[1px] border text-center font-mono-tech text-[9.5px] uppercase tracking-wider cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Token Specs */}
          <div className="p-3 bg-black/50 border border-white/10 rounded-[1px] text-[8.5px] text-white/50 leading-relaxed">
            <div className="text-white/80 font-bold mb-1">RAWx DESIGN SYSTEM TOKENS:</div>
            <div>• Background: #050505 • Surface: #0B0B0B • Raised: #121212</div>
            <div>• Gold Accent: #D4AF37 (Bright: #FFE066) • Base Grid: 8px</div>
            <div>• Font Stack: Cinzel (Display), Noto Serif Bengali, JetBrains Mono</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[9px] text-white/40">
          <span>Preferences persist automatically across sessions</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#D4AF37] text-black font-bold text-[9px] rounded-[1px] cursor-pointer hover:bg-[#FFE066] transition-colors"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
