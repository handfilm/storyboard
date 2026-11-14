/**
 * @file /src/components/ThemeSettingsModal.tsx
 * @description Theme & Studio Appearance Configuration.
 * Conforms to design tokens (bg #050505, surface #0B0B0B, raised #121212, gold #D4AF37, text #EDEDED, muted #8A8A8A, 8px grid).
 * Supports themes: RAWx Gold, Warm Film, Cold Steel, Paper Light, High Contrast, and density options.
 */

import React, { useState } from 'react';
import { themeManager, THEMES, ThemeId, DensityMode } from '../core/theme';
import { X, Check, Palette, SlidersHorizontal } from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

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
          <CinemaBadgeHeader
            icon={<Palette className="w-4 h-4 text-[#D4AF37]" strokeWidth={2.2} />}
            label="STUDIO THEMES"
            accent="amber"
          />
          <CinemaToolHUD
            title="CLOSE THEMES"
            en="Close the appearance settings modal."
            bn="কীভাবে ব্যবহার করবেন: থিম প্যানেল বন্ধ করতে ক্লিক করুন।"
            shortcut="ESC"
            accent="crimson"
            side="left"
          >
            <button
              onClick={onClose}
              className="cinema-tile cinema-tile-crimson min-h-[36px] px-2.5 flex items-center gap-1"
              aria-label="Close Themes"
            >
              <X className="w-4 h-4" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">CLOSE</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh] no-scrollbar">
          {/* Themes */}
          <div>
            <CinemaBadgeHeader
              icon={<Palette className="w-3.5 h-3.5 text-[#D4AF37]" strokeWidth={2.2} />}
              label="COLOR PRESETS"
              accent="amber"
              className="mb-2.5"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {themeList.map(([id, t]) => {
                const isSelected = settings.theme === id;
                return (
                  <CinemaToolHUD
                    key={id}
                    title={`${t.name.toUpperCase()} PALETTE`}
                    en={`Switch studio UI colors to ${t.name}.`}
                    bn="কীভাবে ব্যবহার করবেন: এই কালার থিম চালু করতে ক্লিক করুন।"
                    accent="amber"
                    side="top"
                    blockWrapper
                  >
                    <button
                      onClick={() => handleSelectTheme(id)}
                      data-active={isSelected ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-amber w-full min-h-[52px] p-2.5 text-left flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">{t.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={2.4} />}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.bg }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.surface }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.accent }} />
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: t.colors.text }} />
                      </div>
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </div>
          </div>

          {/* Density Mode */}
          <div>
            <CinemaBadgeHeader
              icon={<SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" strokeWidth={2.2} />}
              label="UI DENSITY"
              accent="cyan"
              className="mb-2.5"
            />
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map(d => {
                const isSelected = settings.density === d;
                return (
                  <CinemaToolHUD
                    key={d}
                    title={`${d.toUpperCase()} DENSITY`}
                    en={`Set interface padding density to ${d}.`}
                    bn="কীভাবে ব্যবহার করবেন: লেআউট স্পেসিং বদলাতে ক্লিক করুন।"
                    accent="cyan"
                    side="top"
                    blockWrapper
                  >
                    <button
                      onClick={() => handleSelectDensity(d)}
                      data-active={isSelected ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan w-full min-h-[44px] py-2 px-3 text-center font-black tracking-wider text-[10px] sm:text-[11px] uppercase"
                    >
                      {d.toUpperCase()}
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/60 flex items-center justify-end">
          <CinemaToolHUD
            title="APPLY & CLOSE"
            en="Save appearance settings and return to studio."
            bn="কীভাবে ব্যবহার করবেন: সেভ করে ফিরে যেতে চাপুন।"
            accent="emerald"
            side="left"
          >
            <button
              onClick={onClose}
              className="cinema-tile cinema-tile-emerald min-h-[40px] px-4 py-1.5 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">DONE</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>
    </div>
  );
};

