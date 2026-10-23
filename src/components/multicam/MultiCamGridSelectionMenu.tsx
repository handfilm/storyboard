/**
 * @file /src/components/multicam/MultiCamGridSelectionMenu.tsx
 * @description Rich visual Grid Selection Menu for MultiCam with thumbnail previews,
 * keyboard shortcut indicators ('1', '2', '3'), and gold-themed layout cards.
 */

import React, { useEffect } from 'react';
import { X, Check, Sparkles, Grid2X2, LayoutList, Square, Keyboard } from 'lucide-react';
import { MultiCamGridConfig } from './MultiCamViewportGrid';
import { MultiCamPresetThumbnail } from './MultiCamPresetThumbnail';

export interface MultiCamGridSelectionMenuProps {
  isOpen: boolean;
  activeConfig: MultiCamGridConfig;
  onSelectConfig: (config: MultiCamGridConfig) => void;
  onClose: () => void;
}

interface PresetOption {
  id: MultiCamGridConfig;
  keyBadge: string;
  title: string;
  subtitle: string;
  description: string;
  bestFor: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    id: '1x1',
    keyBadge: '1',
    title: '1x1 SOLO MONITOR',
    subtitle: 'Single Full-Bleed Inspection',
    description: 'Displays a single camera angle at 100% viewport resolution with instantaneous tactile A/B angle comparison.',
    bestFor: 'Critical focus calibration, fine detail review & hero program output'
  },
  {
    id: '1x3',
    keyBadge: '2',
    title: '1x3 DIRECTOR SPLIT',
    subtitle: 'Hero Master + 3 Secondary Angles',
    description: 'Prominently features the master program feed (68% width) alongside 3 synchronized secondary camera angle tiles.',
    bestFor: 'Live broadcast switching, multi-angle coverage & reaction cutaways'
  },
  {
    id: '2x2',
    keyBadge: '3',
    title: '2x2 QUAD GRID',
    subtitle: 'Synchronized 4-Quadrant Comparison',
    description: 'Equally proportions 4 camera angles in a 2x2 matrix for comprehensive simultaneous multicam monitoring.',
    bestFor: 'Multi-camera studio shoots, coverage alignment & group action scenes'
  }
];

export const MultiCamGridSelectionMenu: React.FC<MultiCamGridSelectionMenuProps> = ({
  isOpen,
  activeConfig,
  onSelectConfig,
  onClose
}) => {
  // ESC to close or '1', '2', '3' to select and close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        onSelectConfig('1x1');
        onClose();
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        onSelectConfig('1x3');
        onClose();
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        onSelectConfig('2x2');
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectConfig, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#090A0E] border border-[#FFE066]/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(255,224,102,0.15)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#12131C] via-[#0E0F17] to-[#12131C] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-[#FFE066]/40 flex items-center justify-center text-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.3)]">
              <Grid2X2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                  MULTICAM GRID CONFIGURATION
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FFE066]/15 text-[#FFE066] border border-[#FFE066]/30">
                  LAYOUT PRESETS
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Select monitor geometry or press keys <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] text-amber-300 font-mono font-bold">1</kbd>, <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] text-amber-300 font-mono font-bold">2</kbd>, or <kbd className="px-1 py-0.2 bg-white/10 rounded text-[10px] text-amber-300 font-mono font-bold">3</kbd> anytime
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Grid Menu (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Cards Grid with Visual Thumbnail Previews */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#060709]">
          {PRESET_OPTIONS.map(preset => {
            const isSelected = activeConfig === preset.id;

            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectConfig(preset.id);
                  onClose();
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#14151F] to-[#0A0B10] border-[#FFE066] shadow-[0_0_24px_rgba(255,224,102,0.35)] ring-2 ring-[#FFE066]/40'
                    : 'bg-[#0B0C12] border-white/10 hover:border-amber-400/50 hover:bg-[#101118]'
                }`}
              >
                {/* Visual Thumbnail Preview Container */}
                <div className="w-full flex flex-col items-center justify-center py-3 bg-black/60 rounded-xl border border-white/5 mb-3 group-hover:border-amber-400/30 transition-colors">
                  <MultiCamPresetThumbnail
                    config={preset.id}
                    isActive={isSelected}
                    size="lg"
                    className="shadow-md"
                  />
                  <div className="flex items-center gap-1.5 mt-2 font-mono text-[10px] text-neutral-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="uppercase tracking-wider">PREVIEW THUMBNAIL</span>
                  </div>
                </div>

                {/* Preset Information */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-mono text-xs font-black tracking-wide text-white group-hover:text-[#FFE066] transition-colors">
                      {preset.title}
                    </h3>
                    <kbd className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isSelected ? 'bg-[#FFE066] text-black shadow-sm' : 'bg-white/10 text-neutral-300'
                    }`}>
                      KEY {preset.keyBadge}
                    </kbd>
                  </div>

                  <span className="text-[11px] font-medium text-amber-400/90 mb-2">
                    {preset.subtitle}
                  </span>

                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    {preset.description}
                  </p>

                  <div className="mt-auto pt-2 border-t border-white/10 text-[10px] font-mono text-neutral-500">
                    <span className="text-neutral-400 font-semibold">BEST FOR: </span>
                    {preset.bestFor}
                  </div>
                </div>

                {/* Bottom Action / Status Button */}
                <div className="mt-4 pt-2">
                  {isSelected ? (
                    <div className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-mono font-black text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,224,102,0.4)]">
                      <Check className="w-3.5 h-3.5" />
                      <span>ACTIVE PRESET</span>
                    </div>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-white/5 group-hover:bg-[#FFE066]/15 group-hover:border-[#FFE066]/40 border border-white/10 text-neutral-300 group-hover:text-[#FFE066] font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
                      <span>SELECT PRESET [{preset.keyBadge}]</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Keyboard Guidance */}
        <div className="px-6 py-3.5 bg-[#0A0B10] border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span>DIRECT KEYBOARD SHORTCUTS: PRESS <strong className="text-white">1</strong> FOR SOLO, <strong className="text-white">2</strong> FOR DIRECTOR, <strong className="text-white">3</strong> FOR QUAD</span>
          </div>
          <span className="text-[11px] text-amber-400/80">ESC TO CLOSE</span>
        </div>
      </div>
    </div>
  );
};
