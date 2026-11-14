/**
 * @file /src/components/ComponentsMatrixPopover.tsx
 * @description Components Visibility Matrix Popover.
 * Icon-First + 1-2 Word Bold Tags with universal <CinemaToolHUD /> English/Bangla guidance.
 * Zero visible descriptive sentences; persists state to 'rawx_components_v1' in localStorage.
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
  Sliders,
  RotateCcw,
  CheckCheck,
  Focus,
} from 'lucide-react';

import { clampBarrelDistortion } from '../utils/barrelDistortionFilter';
export { clampBarrelDistortion } from '../utils/barrelDistortionFilter';
import { CinemaToolHUD, CinemaHudAccent } from './ui/CinemaToolHUD';

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
  barrelDistortion?: number;
}

export type BooleanVisibilityKey = Exclude<keyof ComponentVisibility, 'titleOpacity' | 'barrelDistortion'>;

export const DEFAULT_COMPONENT_VISIBILITY: ComponentVisibility = {
  titlesAll: true,
  titleBn: true,
  titleEn: true,
  caption: true,
  badge: true,
  tagline: true,
  hudData: true,
  reticles: true,
  guides: false,
  grain: true,
  vignette: true,
  bloom: true,
  lensBlur: true,
  motionBlur: true,
  frameStepButtons: false,
  titleOpacity: 1.0,
  barrelDistortion: 0,
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
  'motionBlur',
];

export function countActiveComponentToggles(visibility: ComponentVisibility): {
  active: number;
  total: number;
} {
  const active = BOOLEAN_COMPONENT_KEYS.filter((key) => Boolean(visibility[key])).length;
  return { active, total: BOOLEAN_COMPONENT_KEYS.length };
}

const STORAGE_KEY = 'rawx_components_v1';

export function clampTitleOpacity(rawOpacity: unknown): number {
  const numeric = typeof rawOpacity === 'number' && !Number.isNaN(rawOpacity) ? rawOpacity : 1.0;
  return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100));
}

export function readTitleBlockOpacityCssVar(fallback = 1.0): number {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return clampTitleOpacity(fallback);
  }
  const raw = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--title-block-opacity')
    .trim();
  if (!raw) return clampTitleOpacity(fallback);
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? clampTitleOpacity(fallback) : clampTitleOpacity(parsed);
}

export function applyTitleBlockOpacityCssVar(opacity: number): void {
  if (typeof document === 'undefined') return;
  const clamped = clampTitleOpacity(opacity);
  document.documentElement.style.setProperty('--title-block-opacity', String(clamped));
  const titleBlocks = document.querySelectorAll<HTMLElement>('.title-block');
  titleBlocks.forEach((el) => {
    if (!el.classList.contains('opacity-0') && !el.classList.contains('hidden')) {
      el.style.removeProperty('opacity');
    }
  });
}

export function loadSavedComponentVisibility(): ComponentVisibility {
  if (typeof window === 'undefined') return { ...DEFAULT_COMPONENT_VISIBILITY };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const titleOpacity = clampTitleOpacity(parsed.titleOpacity);
      const barrelDistortion = clampBarrelDistortion(parsed.barrelDistortion);
      const hydrated: ComponentVisibility = {
        ...DEFAULT_COMPONENT_VISIBILITY,
        ...parsed,
        titleOpacity,
        barrelDistortion,
      };
      applyTitleBlockOpacityCssVar(titleOpacity);
      return hydrated;
    }
  } catch (err) {
    console.warn('Failed reading saved component visibility', err);
  }
  applyTitleBlockOpacityCssVar(DEFAULT_COMPONENT_VISIBILITY.titleOpacity ?? 1.0);
  return { ...DEFAULT_COMPONENT_VISIBILITY };
}

export function saveComponentVisibility(state: ComponentVisibility): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized: ComponentVisibility = {
      ...state,
      titleOpacity: clampTitleOpacity(state.titleOpacity),
      barrelDistortion: clampBarrelDistortion(state.barrelDistortion),
    };
    applyTitleBlockOpacityCssVar(normalized.titleOpacity ?? 1.0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
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
  shortLabel: string;
  searchLabel: string;
  category: MatrixCategory;
  desc: string;
  bn: string;
  accent: CinemaHudAccent;
}

const COMPONENT_ROWS: ComponentRow[] = [
  // Titles & Narrative
  {
    key: 'titlesAll',
    shortLabel: 'ALL TITLES',
    searchLabel: 'Master Titles (All)',
    category: 'Titles & Narrative',
    desc: 'Global master toggle for all title and narrative layers.',
    bn: 'সব ধরনের টাইটেল একসাথে অন বা অফ করতে এই সুইচ চাপুন।',
    accent: 'amber',
  },
  {
    key: 'titleBn',
    shortLabel: 'BANGLA',
    searchLabel: 'Bangla Title (বাংলা)',
    category: 'Titles & Narrative',
    desc: 'Noto Serif Bengali calligraphic headline overlay.',
    bn: 'ভিডিওর উপর বাংলা শিরোনাম দেখাতে বা লুকাতে এটি চাপুন।',
    accent: 'amber',
  },
  {
    key: 'titleEn',
    shortLabel: 'ENGLISH',
    searchLabel: 'English Main Title',
    category: 'Titles & Narrative',
    desc: 'Cinzel golden uppercase cinematic headline overlay.',
    bn: 'ইংরেজি বড় সিনেমাটিক টাইটেল চালু বা বন্ধ করতে এটি চাপুন।',
    accent: 'amber',
  },
  {
    key: 'badge',
    shortLabel: 'EP BADGE',
    searchLabel: 'Episode Badge (EP 001)',
    category: 'Titles & Narrative',
    desc: 'Anthology shot counter and episode number badge.',
    bn: 'পর্দায় শট বা এপিসোডের নাম্বার ব্যাজ দেখাতে এটি টগল করুন।',
    accent: 'amber',
  },
  {
    key: 'tagline',
    shortLabel: 'TAGLINE',
    searchLabel: 'Curatorial Tagline',
    category: 'Titles & Narrative',
    desc: 'Secondary curatorial subtitle beneath main title.',
    bn: 'মূল টাইটেলের নিচের ছোট সাব-টাইটেল লাইন চালু করতে চাপুন।',
    accent: 'amber',
  },
  {
    key: 'caption',
    shortLabel: 'SOUND CUE',
    searchLabel: 'Sound / Action Cue',
    category: 'Titles & Narrative',
    desc: 'Directorial sound design cue strip below viewport.',
    bn: 'দৃশ্যের সাউন্ড কিউ বার দেখাতে বা লুকাতে এটি ব্যবহার করুন।',
    accent: 'amber',
  },

  // Telemetry HUD
  {
    key: 'hudData',
    shortLabel: 'HUD DATA',
    searchLabel: 'HUD Telemetry Data',
    category: 'Telemetry HUD',
    desc: 'Camera focal length, aperture, node, and archive readout.',
    bn: 'ক্যামেরার লেন্স, আইএসও ও ফ্রেম তথ্য পর্দায় দেখতে অন করুন।',
    accent: 'cyan',
  },
  {
    key: 'reticles',
    shortLabel: 'RETICLES',
    searchLabel: 'Corner Reticle Brackets',
    category: 'Telemetry HUD',
    desc: 'Optical viewfinder corner framing brackets.',
    bn: 'ভিউফাইন্ডারের চার কোণার ফ্রেমিং ব্র্যাকেট অন বা অফ করুন।',
    accent: 'cyan',
  },
  {
    key: 'guides',
    shortLabel: 'GUIDES',
    searchLabel: 'Rule of Thirds & Crosshair',
    category: 'Telemetry HUD',
    desc: 'Composition 3x3 rule-of-thirds grid and center crosshair.',
    bn: 'শটের ফ্রেম মাপার ৩×৩ গ্রিড ও সেন্টার ক্রসহেয়ার দেখতে চাপুন।',
    accent: 'cyan',
  },
  {
    key: 'frameStepButtons',
    shortLabel: 'FRAME STEP',
    searchLabel: 'Frame-Step Buttons (-1F / +1F)',
    category: 'Telemetry HUD',
    desc: 'Show discrete -1F and +1F frame step transport buttons.',
    bn: 'টাইমলাইনে এক ফ্রেম করে আগে-পিছে নেওয়ার বাটন চালু করতে চাপুন।',
    accent: 'cyan',
  },

  // Optical Post FX
  {
    key: 'grain',
    shortLabel: '35MM GRAIN',
    searchLabel: '35mm Film Grain',
    category: 'Optical Post FX',
    desc: 'Dynamic procedural ISO 800 photochemical film grain.',
    bn: 'ভিডিওতে বাস্তব ৩৫ মিমি ফিল্মের মতো গ্রেইন যোগ করতে চাপুন।',
    accent: 'crimson',
  },
  {
    key: 'vignette',
    shortLabel: 'VIGNETTE',
    searchLabel: 'Optical Falloff Vignette',
    category: 'Optical Post FX',
    desc: 'Edge light falloff radial cinema vignette.',
    bn: 'ভিডিওর চারধারে হালকা অন্ধকার সিনেমাটিক শেড দিতে অন করুন।',
    accent: 'crimson',
  },
  {
    key: 'bloom',
    shortLabel: 'SKIN BLOOM',
    searchLabel: 'Center Focus Skin Bloom',
    category: 'Optical Post FX',
    desc: 'Pro-Mist highlight glow and center focus skin softness.',
    bn: 'আলোয় নরম গ্লো এবং স্কিন স্মুথ লুক আনতে SKIN BLOOM চাপুন।',
    accent: 'crimson',
  },
  {
    key: 'lensBlur',
    shortLabel: 'LENS BLUR',
    searchLabel: 'Anamorphic Lens Blur',
    category: 'Optical Post FX',
    desc: 'Peripheral anamorphic optical glass falloff blur.',
    bn: 'ফ্রেমের কিনারায় অ্যানামরফিক লেন্সের মতো ব্লার আনতে চাপুন।',
    accent: 'crimson',
  },
  {
    key: 'motionBlur',
    shortLabel: 'MOTION BLUR',
    searchLabel: 'Hypersonic Motion Blur',
    category: 'Optical Post FX',
    desc: 'Dynamic shutter-angle optical motion trail blur.',
    bn: 'দ্রুত মুভমেন্টের সময় মোশন ব্লার স্মুথনেস আনতে এটি অন করুন।',
    accent: 'crimson',
  },
];

const CATEGORY_META: Record<
  MatrixCategory,
  { id: string; shortLabel: string; icon: React.ElementType; color: string; accent: CinemaHudAccent }
> = {
  'Titles & Narrative': {
    id: 'titles',
    shortLabel: 'TITLES',
    icon: Type,
    color: 'text-amber-400',
    accent: 'amber',
  },
  'Telemetry HUD': {
    id: 'hud',
    shortLabel: 'TELEMETRY',
    icon: Activity,
    color: 'text-cyan-400',
    accent: 'cyan',
  },
  'Optical Post FX': {
    id: 'fx',
    shortLabel: 'OPTICS FX',
    icon: Sparkles,
    color: 'text-red-400',
    accent: 'crimson',
  },
};

function computeCategoryEnabled(cat: MatrixCategory, vis: ComponentVisibility): boolean {
  const rows = COMPONENT_ROWS.filter((r) => r.category === cat);
  const activeCount = rows.filter((r) => Boolean(vis[r.key])).length;
  if (cat === 'Titles & Narrative') {
    return Boolean(vis.titlesAll && activeCount > 0);
  }
  return activeCount > 0;
}

export const ComponentsMatrixPopover: React.FC<ComponentsMatrixPopoverProps> = ({
  isOpen,
  onClose,
  visibility,
  onChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<MatrixCategory, boolean>>(() => ({
    'Titles & Narrative': !computeCategoryEnabled('Titles & Narrative', visibility),
    'Telemetry HUD': !computeCategoryEnabled('Telemetry HUD', visibility),
    'Optical Post FX': !computeCategoryEnabled('Optical Post FX', visibility),
  }));

  const isInternalToggleRef = useRef(false);
  const lastActiveCategoryKeysRef = useRef<Record<MatrixCategory, Partial<Record<BooleanVisibilityKey, boolean>>>>({
    'Titles & Narrative': {
      titlesAll: true,
      titleBn: true,
      titleEn: true,
      badge: true,
      tagline: true,
      caption: true,
    },
    'Telemetry HUD': {
      hudData: true,
      reticles: true,
      guides: false,
      frameStepButtons: false,
    },
    'Optical Post FX': {
      grain: true,
      vignette: true,
      bloom: true,
      lensBlur: true,
      motionBlur: true,
    },
  });

  const prevCategoryEnabledRef = useRef<Record<MatrixCategory, boolean>>({
    'Titles & Narrative': computeCategoryEnabled('Titles & Narrative', visibility),
    'Telemetry HUD': computeCategoryEnabled('Telemetry HUD', visibility),
    'Optical Post FX': computeCategoryEnabled('Optical Post FX', visibility),
  });

  const resolvedOpacity = clampTitleOpacity(
    visibility.titleOpacity ?? readTitleBlockOpacityCssVar(1.0)
  );

  useEffect(() => {
    applyTitleBlockOpacityCssVar(resolvedOpacity);
    if (popoverRef.current) {
      popoverRef.current.style.setProperty('--title-block-opacity', String(resolvedOpacity));
    }
  }, [resolvedOpacity, isOpen]);

  useEffect(() => {
    const nextEnabled: Record<MatrixCategory, boolean> = {
      'Titles & Narrative': computeCategoryEnabled('Titles & Narrative', visibility),
      'Telemetry HUD': computeCategoryEnabled('Telemetry HUD', visibility),
      'Optical Post FX': computeCategoryEnabled('Optical Post FX', visibility),
    };
    const prevEnabled = prevCategoryEnabledRef.current;
    prevCategoryEnabledRef.current = nextEnabled;

    if (isInternalToggleRef.current) {
      isInternalToggleRef.current = false;
      return;
    }

    let changed = false;
    const updates: Partial<Record<MatrixCategory, boolean>> = {};

    (['Titles & Narrative', 'Telemetry HUD', 'Optical Post FX'] as MatrixCategory[]).forEach((cat) => {
      if (prevEnabled[cat] !== nextEnabled[cat]) {
        updates[cat] = !nextEnabled[cat];
        changed = true;
      }
    });

    if (changed) {
      setCollapsedCategories((prev) => ({ ...prev, ...updates }));
    }
  }, [visibility]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
  const titleOpacity = resolvedOpacity;
  const titleOpacityPercent = Math.round(titleOpacity * 100);

  const handleToggle = (key: BooleanVisibilityKey) => {
    isInternalToggleRef.current = true;
    const nextVal = !visibility[key];
    const next: ComponentVisibility = {
      ...visibility,
      [key]: nextVal,
      titleOpacity: clampTitleOpacity(visibility.titleOpacity),
    };

    const rowDef = COMPONENT_ROWS.find((r) => r.key === key);

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

    if (
      key !== 'titlesAll' &&
      nextVal &&
      !visibility.titlesAll &&
      rowDef?.category === 'Titles & Narrative'
    ) {
      next.titlesAll = true;
    }

    if (rowDef) {
      const cat = rowDef.category;
      const wasCatEnabled = computeCategoryEnabled(cat, visibility);
      const isNowCatEnabled = computeCategoryEnabled(cat, next);
      if (isNowCatEnabled) {
        const snapshot: Partial<Record<BooleanVisibilityKey, boolean>> = {};
        COMPONENT_ROWS.filter((r) => r.category === cat).forEach((r) => {
          snapshot[r.key] = Boolean(next[r.key]);
        });
        lastActiveCategoryKeysRef.current[cat] = snapshot;
        if (!wasCatEnabled) {
          setCollapsedCategories((prev) => ({ ...prev, [cat]: false }));
        }
      }
    }

    onChange(next);
    saveComponentVisibility(next);
  };

  const handleTitleOpacityChange = (rawVal: number) => {
    isInternalToggleRef.current = true;
    const clamped = clampTitleOpacity(rawVal);
    applyTitleBlockOpacityCssVar(clamped);
    if (popoverRef.current) {
      popoverRef.current.style.setProperty('--title-block-opacity', String(clamped));
    }
    const next: ComponentVisibility = {
      ...visibility,
      titleOpacity: clamped,
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  const barrelDistortion = clampBarrelDistortion(visibility.barrelDistortion ?? 0);
  const barrelDistortionPercent = Math.round(barrelDistortion * 100);

  const handleBarrelDistortionChange = (rawVal: number) => {
    isInternalToggleRef.current = true;
    const clamped = clampBarrelDistortion(rawVal);
    const next: ComponentVisibility = {
      ...visibility,
      barrelDistortion: clamped,
    };
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleToggleCategoryCollapse = (category: MatrixCategory) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleToggleCategoryVisibility = (
    category: MatrixCategory,
    enableCategory: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    isInternalToggleRef.current = true;
    const rows = COMPONENT_ROWS.filter((r) => r.category === category);
    const next: ComponentVisibility = {
      ...visibility,
      titleOpacity: clampTitleOpacity(visibility.titleOpacity),
    };

    if (!enableCategory) {
      if (computeCategoryEnabled(category, visibility)) {
        const snapshot: Partial<Record<BooleanVisibilityKey, boolean>> = {};
        rows.forEach((r) => {
          snapshot[r.key] = Boolean(visibility[r.key]);
        });
        lastActiveCategoryKeysRef.current[category] = snapshot;
      }
      rows.forEach((r) => {
        next[r.key] = false;
      });
    } else {
      const savedSnapshot = lastActiveCategoryKeysRef.current[category];
      const hasAnySavedTrue = savedSnapshot && rows.some((r) => Boolean(savedSnapshot[r.key]));
      rows.forEach((r) => {
        if (hasAnySavedTrue && savedSnapshot) {
          next[r.key] = Boolean(savedSnapshot[r.key]);
        } else {
          next[r.key] = Boolean(DEFAULT_COMPONENT_VISIBILITY[r.key] ?? true);
        }
      });
      if (category === 'Titles & Narrative') {
        next.titlesAll = true;
        if (!next.titleBn && !next.titleEn && !next.tagline) {
          next.titleBn = true;
          next.titleEn = true;
          next.tagline = true;
        }
      }
    }

    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !enableCategory,
    }));

    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetAll = (val: boolean) => {
    isInternalToggleRef.current = true;
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
      frameStepButtons: val,
      titleOpacity: clampTitleOpacity(visibility.titleOpacity),
      barrelDistortion: clampBarrelDistortion(visibility.barrelDistortion),
    };
    setCollapsedCategories({
      'Titles & Narrative': !val,
      'Telemetry HUD': !val,
      'Optical Post FX': !val,
    });
    onChange(next);
    saveComponentVisibility(next);
  };

  const handleSetDefault = () => {
    isInternalToggleRef.current = true;
    setCollapsedCategories({
      'Titles & Narrative': false,
      'Telemetry HUD': false,
      'Optical Post FX': false,
    });
    const resetState: ComponentVisibility = {
      ...DEFAULT_COMPONENT_VISIBILITY,
      titleOpacity: 1.0,
      barrelDistortion: 0,
    };
    applyTitleBlockOpacityCssVar(resetState.titleOpacity ?? 1.0);
    onChange(resetState);
    saveComponentVisibility(resetState);
  };

  const handleZenClean = () => {
    isInternalToggleRef.current = true;
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
      frameStepButtons: false,
      titleOpacity: clampTitleOpacity(visibility.titleOpacity),
      barrelDistortion: clampBarrelDistortion(visibility.barrelDistortion),
    };
    setCollapsedCategories((prev) => ({
      ...prev,
      'Titles & Narrative': true,
      'Telemetry HUD': true,
    }));
    onChange(next);
    saveComponentVisibility(next);
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const matchesOpacitySearch =
    normalizedQuery.length > 0 &&
    ('title block opacity'.includes(normalizedQuery) ||
      '--title-block-opacity'.includes(normalizedQuery) ||
      'opacity'.includes(normalizedQuery) ||
      'soften'.includes(normalizedQuery) ||
      'contrast'.includes(normalizedQuery) ||
      'alpha'.includes(normalizedQuery));

  const matchesDistortionSearch =
    normalizedQuery.length > 0 &&
    ('barrel distortion'.includes(normalizedQuery) ||
      'distortion'.includes(normalizedQuery) ||
      'barrel'.includes(normalizedQuery) ||
      'curvature'.includes(normalizedQuery) ||
      'spherical'.includes(normalizedQuery) ||
      'warp'.includes(normalizedQuery) ||
      'optical fx'.includes(normalizedQuery) ||
      'lens'.includes(normalizedQuery));

  useEffect(() => {
    if (normalizedQuery.length > 0) {
      setCollapsedCategories({
        'Titles & Narrative': false,
        'Telemetry HUD': false,
        'Optical Post FX': false,
      });
    }
  }, [normalizedQuery]);

  const filteredRows = useMemo(() => {
    if (!normalizedQuery) return COMPONENT_ROWS;
    return COMPONENT_ROWS.filter(
      (r) =>
        r.shortLabel.toLowerCase().includes(normalizedQuery) ||
        r.searchLabel.toLowerCase().includes(normalizedQuery) ||
        r.desc.toLowerCase().includes(normalizedQuery) ||
        r.category.toLowerCase().includes(normalizedQuery) ||
        (matchesOpacitySearch && r.category === 'Titles & Narrative') ||
        (matchesDistortionSearch && r.category === 'Optical Post FX')
    );
  }, [normalizedQuery, matchesOpacitySearch, matchesDistortionSearch]);

  const categories: MatrixCategory[] = ['Titles & Narrative', 'Telemetry HUD', 'Optical Post FX'];

  if (!isOpen) return null;

  const renderToggleRow = (row: ComponentRow) => {
    const isActive = Boolean(visibility[row.key]);
    const accentClass =
      row.accent === 'cyan'
        ? 'cinema-tile-cyan'
        : row.accent === 'crimson'
          ? 'cinema-tile-crimson'
          : 'cinema-tile-amber';

    return (
      <CinemaToolHUD
        key={row.key}
        title={row.searchLabel.toUpperCase()}
        en={row.desc}
        bn={row.bn}
        accent={row.accent}
        side="left"
        blockWrapper
      >
        <button
          type="button"
          onClick={() => handleToggle(row.key)}
          aria-pressed={isActive}
          data-active={isActive ? 'true' : 'false'}
          className={`cinema-tile ${accentClass} matrix-sub-option w-full px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer min-h-[40px]`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="cinema-tile-icon shrink-0">
              {isActive ? <Eye className="w-4 h-4" strokeWidth={2.2} /> : <EyeOff className="w-4 h-4" strokeWidth={2.2} />}
            </span>
            <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase truncate">
              {row.shortLabel}
            </span>
          </span>
          <span
            className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
              isActive
                ? 'bg-black/60 border-white/25 text-white'
                : 'bg-black/40 border-white/10 text-zinc-500'
            }`}
          >
            {isActive ? 'ON' : 'OFF'}
          </span>
        </button>
      </CinemaToolHUD>
    );
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Components Visibility Matrix"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          if (searchQuery) setSearchQuery('');
          else onClose();
        }
      }}
      className="fixed top-14 sm:top-16 right-2 sm:right-12 z-[95] w-[345px] sm:w-[395px] bg-[#0B0C0F]/98 border border-[#26282E] rounded-xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] backdrop-blur-xl flex flex-col font-mono select-none overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Badge */}
      <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-[#111215]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" strokeWidth={2.3} />
          <span className="text-[11px] font-black tracking-wider uppercase text-white">
            LAYERS MATRIX
          </span>
          <span className="text-amber-400 text-[10px] font-black tabular-nums">
            {activeCount}/{totalCount}
          </span>
        </div>
        <CinemaToolHUD
          title="CLOSE LAYERS MATRIX"
          en="Close the HUD & Optics visibility popover."
          bn="লেয়ার প্যানেল বন্ধ করতে X চাপুন।"
          shortcut="ESC"
          accent="crimson"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Components Matrix"
            className="cinema-tile cinema-tile-crimson p-1.5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5 cinema-tile-icon" />
          </button>
        </CinemaToolHUD>
      </div>

      {/* Real-Time Keyword Search Bar */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH LAYERS..."
            className="w-full pl-8 pr-7 py-1.5 text-[11px] font-bold tracking-wider uppercase bg-[#111215] border border-[#26282E] focus:border-amber-400 focus:outline-none rounded-lg text-white placeholder-zinc-500 transition-colors font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Preset Controls */}
      <div className="px-3 py-2 border-b border-white/10 bg-black/30 grid grid-cols-3 gap-1.5">
        <CinemaToolHUD
          title="RESTORE DEFAULTS"
          en="Reset all overlays, guides, and optical FX to studio defaults."
          bn="সব লেয়ার ও অপটিকস স্ট্যান্ডার্ড সেটিংসে ফিরিয়ে আনতে DEFAULT চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleSetDefault}
            className="cinema-tile cinema-tile-amber w-full py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            <span>DEFAULT</span>
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="ENABLE ALL LAYERS"
          en="Turn ON all titles, telemetry reticles, guides, and post FX."
          bn="সবগুলো টাইটেল, গ্রিড এবং ফিল্ম ইফেক্ট একসাথে চালু করতে ALL ON চাপুন।"
          accent="emerald"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => handleSetAll(true)}
            className="cinema-tile cinema-tile-emerald w-full py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            <span>ALL ON</span>
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="CLEAN ZEN VIEW"
          en="Hide all titles, HUD telemetry, and guides for pure cinema frame."
          bn="পর্দার সব লেখা ও গ্রিড সরিয়ে শুধু ভিডিও দেখতে CLEAN ZEN চাপুন।"
          accent="cyan"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleZenClean}
            className="cinema-tile cinema-tile-cyan w-full py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 text-[10px] font-black tracking-wider uppercase cursor-pointer"
          >
            <Focus className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            <span>CLEAN ZEN</span>
          </button>
        </CinemaToolHUD>
      </div>

      {/* Collapsible Categories List */}
      <div className="matrix-body max-h-[420px] overflow-y-auto p-2.5 no-scrollbar flex flex-col gap-2">
        {filteredRows.length === 0 ? (
          <div className="py-6 text-center text-zinc-400 space-y-2">
            <Search className="w-5 h-5 mx-auto opacity-50" />
            <div className="text-[10px] font-black tracking-wider uppercase">NO MATCH</div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-400 hover:underline text-[10px] font-black uppercase cursor-pointer"
            >
              CLEAR
            </button>
          </div>
        ) : (
          categories.map((cat) => {
            const rowsInCat = filteredRows.filter((r) => r.category === cat);
            if (rowsInCat.length === 0) return null;

            const isCategoryExpanded = !collapsedCategories[cat];
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const headerId = `matrix-category-header-${meta.id}`;
            const panelId = `matrix-category-panel-${meta.id}`;
            const activeInCat = rowsInCat.filter((r) => Boolean(visibility[r.key])).length;
            const isCategoryEnabled =
              cat === 'Titles & Narrative'
                ? Boolean(visibility.titlesAll && activeInCat > 0)
                : activeInCat > 0;

            const masterTitleRow =
              cat === 'Titles & Narrative'
                ? rowsInCat.find((r) => r.key === 'titlesAll')
                : undefined;
            const subRows =
              cat === 'Titles & Narrative'
                ? rowsInCat.filter((r) => r.key !== 'titlesAll')
                : rowsInCat;

            return (
              <div
                key={cat}
                data-matrix-category={meta.id}
                data-expanded={isCategoryExpanded}
                className="matrix-category-card border border-[#26282E] rounded-lg overflow-hidden bg-[#111215]/70"
              >
                <div
                  id={headerId}
                  onClick={() => handleToggleCategoryCollapse(cat)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isCategoryExpanded}
                  aria-controls={panelId}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleCategoryCollapse(cat);
                    }
                  }}
                  className="px-2.5 py-2 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors bg-[#111215] border-b border-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${
                        isCategoryExpanded ? 'rotate-0 text-amber-400' : '-rotate-90 text-zinc-500'
                      }`}
                    />
                    <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} strokeWidth={2.2} />
                    <span className="text-[10.5px] font-black tracking-wider uppercase text-white truncate">
                      {meta.shortLabel}
                    </span>
                    <span className="text-[9.5px] font-bold text-zinc-400 tabular-nums shrink-0">
                      {activeInCat}/{rowsInCat.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <CinemaToolHUD
                      title={`TOGGLE ${meta.shortLabel}`}
                      en={`Mute or enable all layers in ${meta.shortLabel}.`}
                      bn={`${meta.shortLabel} বিভাগের সব লেয়ার একসাথে চালু বা বন্ধ করতে চাপুন।`}
                      accent={meta.accent}
                      side="left"
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isCategoryEnabled}
                        aria-expanded={isCategoryExpanded}
                        aria-label={`Toggle ${cat} visibility`}
                        onClick={(e) => handleToggleCategoryVisibility(cat, !isCategoryEnabled, e)}
                        className={`px-2 py-1 rounded-md border cursor-pointer transition-all flex items-center gap-1.5 ${
                          isCategoryEnabled
                            ? 'bg-amber-500/20 border-amber-400/70 text-amber-300'
                            : 'bg-black/40 border-white/10 text-zinc-500 hover:text-white'
                        }`}
                      >
                        {isCategoryEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span className="text-[9px] font-black uppercase">{isCategoryEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </CinemaToolHUD>
                  </div>
                </div>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  aria-hidden={!isCategoryExpanded}
                  data-category-container={meta.id}
                  data-state={isCategoryExpanded ? 'open' : 'closed'}
                  className={`matrix-category-container matrix-slide-reveal ${
                    isCategoryExpanded
                      ? 'matrix-slide-reveal-open is-expanded'
                      : 'matrix-slide-reveal-closed is-collapsed'
                  }`}
                >
                  <div className="matrix-slide-inner">
                    <div className="p-2 flex flex-col gap-1.5">
                      {cat === 'Titles & Narrative' ? (
                        <>
                          {masterTitleRow && renderToggleRow(masterTitleRow)}

                          <CinemaToolHUD
                            title="TITLE OPACITY"
                            en="Adjust alpha opacity of cinema titles over bright plates."
                            bn="টাইটেলের স্বচ্ছতা বা উজ্জ্বলতা কমাতে বা বাড়াতে স্লাইডার টানুন।"
                            accent="amber"
                            side="left"
                            blockWrapper
                          >
                            <div className="matrix-sub-option w-full px-2.5 py-2 rounded-lg bg-[#0B0C0F] border border-[#26282E] space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label
                                  htmlFor="matrix-title-block-opacity"
                                  className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-zinc-200 cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span>OPACITY</span>
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {titleOpacityPercent !== 100 && (
                                    <button
                                      type="button"
                                      onClick={() => handleTitleOpacityChange(1.0)}
                                      className="text-[9px] font-black text-amber-300 hover:underline uppercase cursor-pointer"
                                    >
                                      RESET
                                    </button>
                                  )}
                                  <span className="text-[10px] font-black text-amber-300 tabular-nums">
                                    {titleOpacityPercent}%
                                  </span>
                                </div>
                              </div>
                              <input
                                id="matrix-title-block-opacity"
                                name="titleOpacity"
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={titleOpacity}
                                data-css-var="--title-block-opacity"
                                onChange={(e) => handleTitleOpacityChange(Number.parseFloat(e.target.value))}
                                aria-label="Title Block Opacity"
                                className="matrix-opacity-slider w-full"
                              />
                            </div>
                          </CinemaToolHUD>

                          <div
                            className={`grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 ${
                              visibility.titlesAll ? 'opacity-100' : 'opacity-65'
                            }`}
                          >
                            {subRows.map((row) => renderToggleRow(row))}
                          </div>
                        </>
                      ) : cat === 'Optical Post FX' ? (
                        <>
                          <CinemaToolHUD
                            title="BARREL DISTORTION"
                            en="Simulate wide anamorphic glass curvature distortion."
                            bn="ওয়াইড অ্যাঙ্গেল লেন্সের কার্ভ ইফেক্ট দিতে এই স্লাইডার ডানে-বামে টানুন।"
                            accent="crimson"
                            side="left"
                            blockWrapper
                          >
                            <div className="matrix-sub-option w-full px-2.5 py-2 rounded-lg bg-[#0B0C0F] border border-[#26282E] space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <label
                                  htmlFor="matrix-barrel-distortion"
                                  className="flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase text-zinc-200 cursor-pointer"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  <span>BARREL WARP</span>
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {barrelDistortionPercent !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleBarrelDistortionChange(0)}
                                      className="text-[9px] font-black text-red-300 hover:underline uppercase cursor-pointer"
                                    >
                                      RESET
                                    </button>
                                  )}
                                  <span className="text-[10px] font-black text-red-300 tabular-nums">
                                    {barrelDistortionPercent}%
                                  </span>
                                </div>
                              </div>
                              <input
                                id="matrix-barrel-distortion"
                                name="barrelDistortion"
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={barrelDistortion}
                                onChange={(e) => handleBarrelDistortionChange(Number.parseFloat(e.target.value))}
                                aria-label="Barrel Distortion Simulation"
                                className="matrix-opacity-slider w-full accent-red-400"
                              />
                            </div>
                          </CinemaToolHUD>

                          <div className="grid grid-cols-2 gap-1.5">
                            {subRows.map((row) => renderToggleRow(row))}
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
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
    </div>
  );
};

export default ComponentsMatrixPopover;
