/**
 * @file /src/components/ComponentsMatrixPopover.tsx
 * @description 12/13 Components Visibility Matrix Popover.
 * Allows toggling individual HUD telemetry, reticle, typography, and optical shader layers.
 * Preserves compatibility with 'rawx_components_v1' localStorage.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Eye, 
  EyeOff, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Grid, 
  Type, 
  Layers,
  X
} from 'lucide-react';

export interface ComponentVisibility {
  titlesAll: boolean;
  titleBn: boolean;
  titleEn: boolean;
  caption: boolean;
  badge: boolean;
  tagline: boolean;
  hudData: boolean;
  reticles: boolean;
  guides: boolean;
  grain: boolean;
  vignette: boolean;
  bloom: boolean;
  lensBlur: boolean;
  motionBlur: boolean;
  frameStepButtons?: boolean;
}

export const DEFAULT_COMPONENT_VISIBILITY: ComponentVisibility = {
  titlesAll: true,
  titleBn: true,
  titleEn: true,
  caption: true,
  badge: true,
  tagline: true,
  hudData: true,
  reticles: true,
  guides: false, // guides off by default
  grain: true,
  vignette: true,
  bloom: true,
  lensBlur: true,
  motionBlur: true,
  frameStepButtons: false, // default OFF per Director specification
};

const STORAGE_KEY = 'rawx_components_v1';

export function loadSavedComponentVisibility(): ComponentVisibility {
  if (typeof window === 'undefined') return { ...DEFAULT_COMPONENT_VISIBILITY };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_COMPONENT_VISIBILITY, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Failed reading saved component visibility', err);
  }
  return { ...DEFAULT_COMPONENT_VISIBILITY };
}

export function saveComponentVisibility(state: ComponentVisibility): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed writing component visibility', err);
  }
}

interface ComponentsMatrixPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: ComponentVisibility;
  onChange: (next: ComponentVisibility) => void;
}

interface ComponentRow {
  key: keyof ComponentVisibility;
  label: string;
  category: 'Typography' | 'HUD & Framing' | 'Optical Post FX';
  desc: string;
}

const COMPONENT_ROWS: ComponentRow[] = [
  // Typography
  { key: 'titlesAll', label: 'Master Titles (All)', category: 'Typography', desc: 'Global toggle for all title layers' },
  { key: 'titleBn', label: 'Bangla Title (বাংলা)', category: 'Typography', desc: 'Noto Serif Bengali calligraphic headline' },
  { key: 'titleEn', label: 'English Main Title', category: 'Typography', desc: 'Cinzel golden uppercase title' },
  { key: 'badge', label: 'Episode Badge (EP 001)', category: 'Typography', desc: 'Anthology episode counter tag' },
  { key: 'tagline', label: 'Curatorial Tagline', category: 'Typography', desc: 'Secondary curatorial narrative line' },
  { key: 'caption', label: 'Sound / Action Cue', category: 'Typography', desc: 'Directorial sound design notification' },
  // HUD & Framing
  { key: 'hudData', label: 'HUD Telemetry Data', category: 'HUD & Framing', desc: 'Focal, aperture, node, archive readout' },
  { key: 'reticles', label: 'Corner Reticle Brackets', category: 'HUD & Framing', desc: 'Gold optical corner targeting brackets' },
  { key: 'guides', label: 'Rule of Thirds & Crosshair', category: 'HUD & Framing', desc: 'Composition 3x3 grid & center marker' },
  { key: 'frameStepButtons', label: 'Frame-Step Buttons (-1F / +1F)', category: 'HUD & Framing', desc: 'Display discrete frame step buttons on the transport strip (keys , and . also step frames)' },
  // Optical Post FX
  { key: 'grain', label: '35mm Film Grain', category: 'Optical Post FX', desc: 'Dynamic procedural ISO 800 grain' },
  { key: 'vignette', label: 'Optical Falloff Vignette', category: 'Optical Post FX', desc: 'Edge falloff radial gradient' },
  { key: 'bloom', label: 'Center Focus Skin Bloom', category: 'Optical Post FX', desc: 'Center softness & highlight halation' },
  { key: 'lensBlur', label: 'Anamorphic Lens Blur', category: 'Optical Post FX', desc: 'Edge radial anamorphic lens blur' },
  { key: 'motionBlur', label: 'Hypersonic Motion Blur', category: 'Optical Post FX', desc: 'photo-motion-edges optical edge shutter blur' },
];

export const ComponentsMatrixPopover: React.FC<ComponentsMatrixPopoverProps> = ({
  isOpen,
  onClose,
  visibility,
  onChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = Object.keys(visibility).length;

  const handleToggle = (key: keyof ComponentVisibility) => {
    const next = { ...visibility, [key]: !visibility[key] };
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetAll = (val: boolean) => {
    const next: ComponentVisibility = {
      titlesAll: val,
      titleBn: val,
      titleEn: val,
      caption: val,
      badge: val,
      tagline: val,
      hudData: val,
      reticles: val,
      guides: val,
      grain: val,
      vignette: val,
      bloom: val,
      lensBlur: val,
      motionBlur: val,
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetDefault1213 = () => {
    onChange({ ...DEFAULT_COMPONENT_VISIBILITY });
    saveComponentVisibility(DEFAULT_COMPONENT_VISIBILITY);
  };

  const handleZenClean = () => {
    const next: ComponentVisibility = {
      ...visibility,
      titlesAll: false,
      titleBn: false,
      titleEn: false,
      caption: false,
      badge: false,
      tagline: false,
      hudData: false,
      reticles: false,
      guides: false,
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  return (
    <div 
      ref={popoverRef}
      className="fixed top-11 right-2 sm:right-16 z-[90] w-[340px] sm:w-[380px] bg-[#0A0B0E]/98 border border-[#D4AF37]/40 rounded-[2px] shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col font-mono-tech select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-cinzel text-xs font-bold tracking-[0.15em] text-white">
            COMPONENTS MATRIX
          </span>
          <span className="px-1.5 py-0.2 rounded-[1px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FFE066] text-[8.5px] font-bold">
            {activeCount}/{totalCount} ON
          </span>
        </div>
        <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Preset Buttons */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[8.5px]">
        <button
          onClick={handleSetDefault1213}
          className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0"
          title="Restore standard display configuration"
        >
          DEFAULT PRESET
        </button>
        <button
          onClick={() => handleSetAll(true)}
          className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0"
        >
          ALL ON ({totalCount}/{totalCount})
        </button>
        <button
          onClick={handleZenClean}
          className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0"
          title="Hide all text, HUD, and guides for clean cinema view"
        >
          CLEAN ZEN
        </button>
      </div>

      {/* Rows List */}
      <div className="max-h-[360px] overflow-y-auto p-2 no-scrollbar flex flex-col gap-1">
        {(['Typography', 'HUD & Framing', 'Optical Post FX'] as const).map(cat => {
          const rowsInCat = COMPONENT_ROWS.filter(r => r.category === cat);
          return (
            <div key={cat} className="mb-1.5">
              <div className="px-2 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]/80 border-b border-white/5">
                {cat}
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {rowsInCat.map(row => {
                  const isActive = Boolean(visibility[row.key]);
                  return (
                    <button
                      key={row.key}
                      onClick={() => handleToggle(row.key)}
                      className={`w-full px-2 py-1.5 rounded-[1px] flex items-center justify-between text-left cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-white/5 hover:bg-white/10 text-white'
                          : 'opacity-40 hover:opacity-75 text-white/60 bg-transparent'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[9.5px] font-medium leading-tight">{row.label}</span>
                        <span className="text-[7.5px] text-white/40 leading-tight">{row.desc}</span>
                      </div>
                      <div className={`p-1 rounded-[1px] ${isActive ? 'text-[#D4AF37]' : 'text-white/30'}`}>
                        {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[8px] text-white/40">
        <span>Shortcut: Press 'V' to toggle</span>
        <span>Auto-saved to Vault</span>
      </div>
    </div>
  );
};
