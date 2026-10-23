/**
 * @file /src/components/ComponentsMatrixPopover.tsx
 * @description 12/13 Components Visibility Matrix Popover.
 * Features:
 * - Real-time keyword search bar at the top
 * - Collapsible categories: 'Narrative Elements', 'Telemetry HUD', and 'Optical Post FX'
 * - Instant toggle, per-category toggle, reset to default, and Clean Zen mode
 * - Persists state to 'rawx_components_v1' in localStorage
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  Layers,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Type,
  Activity,
  Sliders,
  Check
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

export type MatrixCategory = 'Narrative Elements' | 'Telemetry HUD' | 'Optical Post FX';

interface ComponentRow {
  key: keyof ComponentVisibility;
  label: string;
  category: MatrixCategory;
  desc: string;
}

const COMPONENT_ROWS: ComponentRow[] = [
  // Narrative Elements (formerly Typography)
  { key: 'titlesAll', label: 'Master Titles (All)', category: 'Narrative Elements', desc: 'Global toggle for all title layers' },
  { key: 'titleBn', label: 'Bangla Title (বাংলা)', category: 'Narrative Elements', desc: 'Noto Serif Bengali calligraphic headline' },
  { key: 'titleEn', label: 'English Main Title', category: 'Narrative Elements', desc: 'Cinzel golden uppercase cinematic title' },
  { key: 'badge', label: 'Episode Badge (EP 001)', category: 'Narrative Elements', desc: 'Anthology episode counter tag' },
  { key: 'tagline', label: 'Curatorial Tagline', category: 'Narrative Elements', desc: 'Secondary curatorial narrative line' },
  { key: 'caption', label: 'Sound / Action Cue', category: 'Narrative Elements', desc: 'Directorial sound design notification' },
  
  // Telemetry HUD (formerly HUD & Framing)
  { key: 'hudData', label: 'HUD Telemetry Data', category: 'Telemetry HUD', desc: 'Focal, aperture, node, archive readout' },
  { key: 'reticles', label: 'Corner Reticle Brackets', category: 'Telemetry HUD', desc: 'Gold optical corner targeting brackets' },
  { key: 'guides', label: 'Rule of Thirds & Crosshair', category: 'Telemetry HUD', desc: 'Composition 3x3 grid & center marker' },
  { key: 'frameStepButtons', label: 'Frame-Step Buttons (-1F / +1F)', category: 'Telemetry HUD', desc: 'Display discrete frame step buttons on transport strip' },
  
  // Optical Post FX
  { key: 'grain', label: '35mm Film Grain', category: 'Optical Post FX', desc: 'Dynamic procedural ISO 800 grain' },
  { key: 'vignette', label: 'Optical Falloff Vignette', category: 'Optical Post FX', desc: 'Edge falloff radial gradient' },
  { key: 'bloom', label: 'Center Focus Skin Bloom', category: 'Optical Post FX', desc: 'Center softness & highlight halation' },
  { key: 'lensBlur', label: 'Anamorphic Lens Blur', category: 'Optical Post FX', desc: 'Edge radial anamorphic lens blur' },
  { key: 'motionBlur', label: 'Hypersonic Motion Blur', category: 'Optical Post FX', desc: 'Photo-motion optical edge shutter blur' },
];

const CATEGORY_META: Record<MatrixCategory, { icon: React.ElementType; color: string }> = {
  'Narrative Elements': { icon: Type, color: 'text-amber-400' },
  'Telemetry HUD': { icon: Activity, color: 'text-cyan-400' },
  'Optical Post FX': { icon: Sparkles, color: 'text-purple-400' }
};

export const ComponentsMatrixPopover: React.FC<ComponentsMatrixPopoverProps> = ({
  isOpen,
  onClose,
  visibility,
  onChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<MatrixCategory, boolean>>({
    'Narrative Elements': false,
    'Telemetry HUD': false,
    'Optical Post FX': false
  });

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  const activeCount = Object.values(visibility).filter(Boolean).length;
  const totalCount = COMPONENT_ROWS.length;

  const handleToggle = (key: keyof ComponentVisibility) => {
    const next = { ...visibility, [key]: !visibility[key] };
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleToggleCategory = (category: MatrixCategory) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleSetCategoryAll = (category: MatrixCategory, val: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const rows = COMPONENT_ROWS.filter(r => r.category === category);
    const next = { ...visibility };
    rows.forEach(r => {
      (next as any)[r.key] = val;
    });
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
      frameStepButtons: val,
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
      frameStepButtons: false
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return COMPONENT_ROWS;
    return COMPONENT_ROWS.filter(
      r =>
        r.label.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const categories: MatrixCategory[] = ['Narrative Elements', 'Telemetry HUD', 'Optical Post FX'];

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className="fixed top-12 right-2 sm:right-16 z-[95] w-[350px] sm:w-[400px] bg-[#0A0B0E]/98 border border-[#D4AF37]/50 rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col font-mono-tech select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-cinzel text-xs font-bold tracking-[0.15em] text-white">
            COMPONENTS MATRIX
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FFE066] text-[9px] font-bold">
            {activeCount}/{totalCount} ON
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Real-Time Keyword Search Bar */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search toggles (e.g. titles, grain, hud, reticle)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/5 border border-white/10 focus:border-[#D4AF37] focus:outline-none rounded text-white placeholder-white/35 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="px-3 py-1.5 border-b border-white/10 bg-black/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[9px]">
        <button
          onClick={handleSetDefault1213}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
          title="Restore standard display configuration"
        >
          DEFAULT
        </button>
        <button
          onClick={() => handleSetAll(true)}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
        >
          ALL ON
        </button>
        <button
          onClick={handleZenClean}
          className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
          title="Hide all text, HUD, and guides for clean cinema view"
        >
          CLEAN ZEN
        </button>
      </div>

      {/* Collapsible Categories List */}
      <div className="max-h-[380px] overflow-y-auto p-2 no-scrollbar flex flex-col gap-2">
        {filteredRows.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p>No components match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-1 text-[#D4AF37] hover:underline text-[10px]"
            >
              Clear filter
            </button>
          </div>
        ) : (
          categories.map(cat => {
            const rowsInCat = filteredRows.filter(r => r.category === cat);
            if (rowsInCat.length === 0) return null;

            const isCollapsed = Boolean(collapsedCategories[cat]);
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const activeInCat = rowsInCat.filter(r => Boolean(visibility[r.key])).length;
            const allActive = activeInCat === rowsInCat.length;

            return (
              <div 
                key={cat} 
                className="border border-white/10 rounded bg-white/[0.02] overflow-hidden"
              >
                {/* Category Header */}
                <div 
                  onClick={() => handleToggleCategory(cat)}
                  className="px-2.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors bg-black/40 border-b border-white/5"
                >
                  <div className="flex items-center gap-1.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                    )}
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                    <span className="text-[10px] font-bold tracking-wider text-white uppercase">
                      {cat}
                    </span>
                    <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                      {activeInCat}/{rowsInCat.length}
                    </span>
                  </div>

                  {/* Toggle Category Bulk Actions */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleSetCategoryAll(cat, !allActive, e)}
                      className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
                      title={allActive ? `Turn off all ${cat}` : `Turn on all ${cat}`}
                    >
                      {allActive ? 'MUTE' : 'ALL'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Items Drawer */}
                {!isCollapsed && (
                  <div className="p-1.5 flex flex-col gap-0.5 divide-y divide-white/5">
                    {rowsInCat.map(row => {
                      const isActive = Boolean(visibility[row.key]);
                      return (
                        <button
                          key={row.key}
                          onClick={() => handleToggle(row.key)}
                          className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-white/5 hover:bg-white/10 text-white'
                              : 'opacity-40 hover:opacity-75 text-white/60 bg-transparent'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[10px] font-medium leading-tight truncate">
                              {row.label}
                            </span>
                            <span className="text-[8px] text-white/40 leading-tight truncate">
                              {row.desc}
                            </span>
                          </div>
                          <div className={`p-1 rounded shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-white/30'}`}>
                            {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[8px] text-white/40">
        <span>Shortcut: Press 'V' to toggle</span>
        <span>Auto-saved to Vault</span>
      </div>
    </div>
  );
};
export default ComponentsMatrixPopover;
