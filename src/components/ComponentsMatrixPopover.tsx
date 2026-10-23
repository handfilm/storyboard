/**
 * @file /src/components/ComponentsMatrixPopover.tsx
 * @description Components Visibility Matrix Popover.
 * Features:
 * - Real-time keyword search bar at the top
 * - Collapsible categories ('Titles & Narrative', 'Telemetry HUD', 'Optical Post FX')
 *   with smooth CSS Grid slide-down reveal animations when toggling categories or master channels
 * - Title Block Opacity slider in 'Titles & Narrative' to soften text over complex imagery
 * - Instant toggle, per-category master switch, reset to default, and Clean Zen mode
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
  Sparkles,
  Type,
  Activity,
  Sliders
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
  titleOpacity?: number;
}

export type BooleanVisibilityKey = Exclude<keyof ComponentVisibility, 'titleOpacity'>;

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
  titleOpacity: 1.0
};

export const BOOLEAN_COMPONENT_KEYS: BooleanVisibilityKey[] = [
  'titlesAll',
  'titleBn',
  'titleEn',
  'badge',
  'tagline',
  'caption',
  'hudData',
  'reticles',
  'guides',
  'frameStepButtons',
  'grain',
  'vignette',
  'bloom',
  'lensBlur',
  'motionBlur'
];

export function countActiveComponentToggles(visibility: ComponentVisibility): {
  active: number;
  total: number;
} {
  const active = BOOLEAN_COMPONENT_KEYS.filter((key) => Boolean(visibility[key])).length;
  return { active, total: BOOLEAN_COMPONENT_KEYS.length };
}

const STORAGE_KEY = 'rawx_components_v1';

export function loadSavedComponentVisibility(): ComponentVisibility {
  if (typeof window === 'undefined') return { ...DEFAULT_COMPONENT_VISIBILITY };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const rawOpacity = typeof parsed.titleOpacity === 'number' ? parsed.titleOpacity : 1.0;
      return {
        ...DEFAULT_COMPONENT_VISIBILITY,
        ...parsed,
        titleOpacity: Math.max(0.1, Math.min(1.0, rawOpacity))
      };
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

export type MatrixCategory = 'Titles & Narrative' | 'Telemetry HUD' | 'Optical Post FX';

interface ComponentRow {
  key: BooleanVisibilityKey;
  label: string;
  category: MatrixCategory;
  desc: string;
}

const COMPONENT_ROWS: ComponentRow[] = [
  // Titles & Narrative
  { key: 'titlesAll', label: 'Master Titles (All)', category: 'Titles & Narrative', desc: 'Global toggle for all title & narrative layers' },
  { key: 'titleBn', label: 'Bangla Title (বাংলা)', category: 'Titles & Narrative', desc: 'Noto Serif Bengali calligraphic headline' },
  { key: 'titleEn', label: 'English Main Title', category: 'Titles & Narrative', desc: 'Cinzel golden uppercase cinematic title' },
  { key: 'badge', label: 'Episode Badge (EP 001)', category: 'Titles & Narrative', desc: 'Anthology episode counter tag' },
  { key: 'tagline', label: 'Curatorial Tagline', category: 'Titles & Narrative', desc: 'Secondary curatorial narrative line' },
  { key: 'caption', label: 'Sound / Action Cue', category: 'Titles & Narrative', desc: 'Directorial sound design notification' },

  // Telemetry HUD
  { key: 'hudData', label: 'HUD Telemetry Data', category: 'Telemetry HUD', desc: 'Focal, aperture, node, archive readout' },
  { key: 'reticles', label: 'Corner Reticle Brackets', category: 'Telemetry HUD', desc: 'Gold optical corner targeting brackets' },
  { key: 'guides', label: 'Rule of Thirds & Crosshair', category: 'Telemetry HUD', desc: 'Composition 3x3 grid & center marker' },
  { key: 'frameStepButtons', label: 'Frame-Step Buttons (-1F / +1F)', category: 'Telemetry HUD', desc: 'Display discrete frame step buttons on transport strip' },

  // Optical Post FX
  { key: 'grain', label: '35mm Film Grain', category: 'Optical Post FX', desc: 'Dynamic procedural ISO 800 grain' },
  { key: 'vignette', label: 'Optical Falloff Vignette', category: 'Optical Post FX', desc: 'Edge falloff radial gradient' },
  { key: 'bloom', label: 'Center Focus Skin Bloom', category: 'Optical Post FX', desc: 'Center softness & highlight halation' },
  { key: 'lensBlur', label: 'Anamorphic Lens Blur', category: 'Optical Post FX', desc: 'Edge radial anamorphic lens blur' },
  { key: 'motionBlur', label: 'Hypersonic Motion Blur', category: 'Optical Post FX', desc: 'Photo-motion optical edge shutter blur' }
];

const CATEGORY_META: Record<MatrixCategory, { icon: React.ElementType; color: string }> = {
  'Titles & Narrative': { icon: Type, color: 'text-amber-400' },
  'Telemetry HUD': { icon: Activity, color: 'text-cyan-400' },
  'Optical Post FX': { icon: Sparkles, color: 'text-purple-400' }
};

export const ComponentsMatrixPopover: React.FC<ComponentsMatrixPopoverProps> = ({
  isOpen,
  onClose,
  visibility,
  onChange
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<MatrixCategory, boolean>>({
    'Titles & Narrative': false,
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

  const { active: activeCount, total: totalCount } = countActiveComponentToggles(visibility);
  const titleOpacity = Math.max(0.1, Math.min(1.0, visibility.titleOpacity ?? 1.0));
  const titleOpacityPercent = Math.round(titleOpacity * 100);

  const handleToggle = (key: BooleanVisibilityKey) => {
    const nextVal = !visibility[key];
    const next: ComponentVisibility = { ...visibility, [key]: nextVal };

    // If Master Titles (All) is toggled ON while all sub-channels were off, restore primary channels
    if (
      key === 'titlesAll' &&
      nextVal &&
      !visibility.titleBn &&
      !visibility.titleEn &&
      !visibility.tagline
    ) {
      next.titleBn = true;
      next.titleEn = true;
      next.tagline = true;
    }

    onChange(next);
    saveComponentVisibility(next);
  };

  const handleTitleOpacityChange = (rawVal: number) => {
    const clamped = Math.max(0.1, Math.min(1.0, Math.round(rawVal * 100) / 100));
    const next: ComponentVisibility = {
      ...visibility,
      titleOpacity: clamped
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleToggleCategoryCollapse = (category: MatrixCategory) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Toggling a category's visibility switch turns its options ON (with slide-down reveal) or OFF (with slide-up collapse)
  const handleToggleCategoryVisibility = (
    category: MatrixCategory,
    enableCategory: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const rows = COMPONENT_ROWS.filter((r) => r.category === category);
    const next: ComponentVisibility = { ...visibility };
    rows.forEach((r) => {
      next[r.key] = enableCategory;
    });

    // Slide-down reveal sub-options when category is enabled; smoothly fold when muted
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !enableCategory
    }));

    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetAll = (val: boolean) => {
    const next: ComponentVisibility = {
      ...visibility,
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
      frameStepButtons: val
    };
    setCollapsedCategories({
      'Titles & Narrative': !val,
      'Telemetry HUD': !val,
      'Optical Post FX': !val
    });
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetDefault = () => {
    setCollapsedCategories({
      'Titles & Narrative': false,
      'Telemetry HUD': false,
      'Optical Post FX': false
    });
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
    setCollapsedCategories((prev) => ({
      ...prev,
      'Titles & Narrative': true,
      'Telemetry HUD': true
    }));
    onChange(next);
    saveComponentVisibility(next);
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const matchesOpacitySearch =
    normalizedQuery.length > 0 &&
    ('title block opacity'.includes(normalizedQuery) ||
      'soften'.includes(normalizedQuery) ||
      'contrast'.includes(normalizedQuery) ||
      'alpha'.includes(normalizedQuery));

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return COMPONENT_ROWS;
    return COMPONENT_ROWS.filter(
      (r) =>
        r.label.toLowerCase().includes(normalizedQuery) ||
        r.desc.toLowerCase().includes(normalizedQuery) ||
        r.category.toLowerCase().includes(normalizedQuery) ||
        (matchesOpacitySearch && r.category === 'Titles & Narrative')
    );
  }, [normalizedQuery, matchesOpacitySearch]);

  const categories: MatrixCategory[] = ['Titles & Narrative', 'Telemetry HUD', 'Optical Post FX'];

  if (!isOpen) return null;

  const renderToggleRow = (row: ComponentRow) => {
    const isActive = Boolean(visibility[row.key]);
    return (
      <button
        key={row.key}
        type="button"
        onClick={() => handleToggle(row.key)}
        aria-pressed={isActive}
        className={`w-full px-2.5 py-1.5 rounded flex items-center justify-between text-left cursor-pointer transition-all duration-200 ${
          isActive
            ? 'bg-white/[0.05] hover:bg-white/[0.09] text-white'
            : 'opacity-55 hover:opacity-85 text-white/60 bg-transparent hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[10.5px] font-medium leading-tight truncate">
            {row.label}
          </span>
          <span className="text-[8.5px] text-white/40 leading-tight truncate mt-0.5">
            {row.desc}
          </span>
        </div>

        {/* Animated Visibility Switch + Eye Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full border transition-colors duration-200 ${
              isActive
                ? 'bg-[#D4AF37]/30 border-[#D4AF37]/80'
                : 'bg-black/60 border-white/15'
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full transition-transform duration-200 ${
                isActive
                  ? 'translate-x-3.5 bg-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.85)]'
                  : 'translate-x-0.5 bg-zinc-500'
              }`}
            />
          </span>
          <span
            className={`transition-colors duration-200 ${
              isActive ? 'text-[#D4AF37]' : 'text-white/30'
            }`}
          >
            {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Components Visibility Matrix"
      className="fixed top-16 sm:top-20 right-2 sm:right-12 z-[95] w-[355px] sm:w-[410px] bg-[#0A0B0E]/98 border border-[#D4AF37]/50 rounded-lg shadow-[0_20px_70px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col font-mono select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-cinzel text-xs font-bold tracking-[0.14em] text-white">
            Components Matrix
          </span>
          <span className="text-[#FFE066] text-[9.5px] font-bold tabular-nums">
            · {activeCount}/{totalCount} Active
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Components Matrix"
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
            placeholder="Search toggles or opacity (e.g. titles, hud, grain)..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/5 border border-white/10 focus:border-[#D4AF37] focus:outline-none rounded text-white placeholder-white/35 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Controls */}
      <div className="px-3 py-1.5 border-b border-white/10 bg-black/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[9.5px]">
        <button
          type="button"
          onClick={handleSetDefault}
          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
          title="Restore standard display configuration"
        >
          Default
        </button>
        <button
          type="button"
          onClick={() => handleSetAll(true)}
          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
        >
          All On
        </button>
        <button
          type="button"
          onClick={handleZenClean}
          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4AF37] text-white/80 hover:text-[#FFE066] cursor-pointer shrink-0 transition-colors"
          title="Hide all text, HUD, and guides for clean cinema view"
        >
          Clean Zen
        </button>
      </div>

      {/* Collapsible Categories List with Smooth Slide-Down Reveal */}
      <div className="max-h-[420px] overflow-y-auto p-2.5 no-scrollbar flex flex-col gap-2">
        {filteredRows.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <p>No components match "{searchQuery}"</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-1 text-[#D4AF37] hover:underline text-[10px] cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          categories.map((cat) => {
            const rowsInCat = filteredRows.filter((r) => r.category === cat);
            if (rowsInCat.length === 0) return null;

            const isSearching = normalizedQuery.length > 0;
            const isDrawerOpen = isSearching ? true : !collapsedCategories[cat];
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const activeInCat = rowsInCat.filter((r) => Boolean(visibility[r.key])).length;
            const isCategoryEnabled =
              cat === 'Titles & Narrative'
                ? Boolean(visibility.titlesAll && activeInCat > 0)
                : activeInCat > 0;

            // Separate Master Titles row vs nested sub-options for 'Titles & Narrative'
            const masterTitleRow =
              cat === 'Titles & Narrative'
                ? rowsInCat.find((r) => r.key === 'titlesAll')
                : undefined;
            const subRows =
              cat === 'Titles & Narrative'
                ? rowsInCat.filter((r) => r.key !== 'titlesAll')
                : rowsInCat;
            const areTitleSubOptionsRevealed =
              cat === 'Titles & Narrative'
                ? isSearching || Boolean(visibility.titlesAll)
                : true;

            return (
              <div
                key={cat}
                className="border border-white/10 rounded-md bg-white/[0.02] overflow-hidden transition-colors duration-200"
              >
                {/* Category Header */}
                <div
                  onClick={() => handleToggleCategoryCollapse(cat)}
                  className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-colors bg-black/50 border-b border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-out ${
                        isDrawerOpen ? 'rotate-0 text-[#D4AF37]' : '-rotate-90 text-white/45'
                      }`}
                    />
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                    <span className="text-[10.5px] font-semibold tracking-wide text-white truncate">
                      {cat}
                    </span>
                    <span className="text-[9px] text-white/50 tabular-nums shrink-0">
                      {activeInCat}/{rowsInCat.length}
                    </span>
                  </div>

                  {/* Category Master Visibility Switch (triggers slide-down reveal when enabled) */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleToggleCategoryVisibility(cat, !isCategoryEnabled, e)}
                      aria-pressed={isCategoryEnabled}
                      className={`px-2 py-0.5 rounded text-[9px] font-medium border cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                        isCategoryEnabled
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#FFE066]'
                          : 'bg-white/5 hover:bg-white/10 text-white/55 hover:text-white border-white/10'
                      }`}
                      title={
                        isCategoryEnabled
                          ? `Mute ${cat} layers`
                          : `Enable and reveal ${cat} options`
                      }
                    >
                      <span>{isCategoryEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                </div>

                {/* Animated Slide-Down Category Body */}
                <div
                  className={`matrix-slide-reveal ${
                    isDrawerOpen ? 'matrix-slide-reveal-open' : 'matrix-slide-reveal-closed'
                  }`}
                  aria-hidden={!isDrawerOpen}
                >
                  <div className="matrix-slide-inner">
                    <div className="p-1.5 flex flex-col gap-1">
                      {/* For Titles & Narrative: Master Toggle + Slide-Down Sub-Options & Opacity Control */}
                      {cat === 'Titles & Narrative' ? (
                        <>
                          {masterTitleRow && renderToggleRow(masterTitleRow)}

                          <div
                            className={`matrix-slide-reveal ${
                              areTitleSubOptionsRevealed
                                ? 'matrix-slide-reveal-open'
                                : 'matrix-slide-reveal-closed'
                            }`}
                            aria-hidden={!areTitleSubOptionsRevealed}
                          >
                            <div className="matrix-slide-inner">
                              <div className="pt-1 flex flex-col gap-1 border-t border-white/5">
                                {/* Title Block Container Opacity Slider */}
                                <div className="mx-1 my-1 px-2.5 py-2 rounded bg-black/45 border border-white/10 space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-200">
                                      <Sliders className="w-3 h-3 text-[#D4AF37]" />
                                      <span>Title Block Opacity</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {titleOpacityPercent < 100 && (
                                        <button
                                          type="button"
                                          onClick={() => handleTitleOpacityChange(1.0)}
                                          className="text-[8.5px] text-zinc-400 hover:text-[#FFE066] underline cursor-pointer"
                                          title="Reset title container opacity to 100%"
                                        >
                                          Reset
                                        </button>
                                      )}
                                      <span className="text-[10px] font-bold text-[#FFE066] tabular-nums min-w-[34px] text-right">
                                        {titleOpacityPercent}%
                                      </span>
                                    </div>
                                  </div>

                                  <input
                                    type="range"
                                    min={0.1}
                                    max={1.0}
                                    step={0.05}
                                    value={titleOpacity}
                                    onChange={(e) => handleTitleOpacityChange(parseFloat(e.target.value))}
                                    aria-label="Title Block Container Opacity"
                                    style={{
                                      background: `linear-gradient(to right, #D4AF37 0%, #FFE066 ${
                                        ((titleOpacity - 0.1) / 0.9) * 100
                                      }%, rgba(255,255,255,0.14) ${
                                        ((titleOpacity - 0.1) / 0.9) * 100
                                      }%, rgba(255,255,255,0.14) 100%)`
                                    }}
                                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#FFE066]"
                                  />

                                  <div className="flex items-center justify-between text-[8px] text-white/40">
                                    <span>Soften over complex plates</span>
                                    <span className="tabular-nums">10% – 100%</span>
                                  </div>
                                </div>

                                {/* Individual Narrative Sub-Options */}
                                <div className="flex flex-col gap-0.5 divide-y divide-white/5">
                                  {subRows.map((row) => renderToggleRow(row))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-0.5 divide-y divide-white/5">
                          {subRows.map((row) => renderToggleRow(row))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-1.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-[9px] text-white/45">
        <span>Shortcut: Press V to toggle</span>
        <span>Auto-saved locally</span>
      </div>
    </div>
  );
};

export default ComponentsMatrixPopover;
