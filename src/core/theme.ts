/**
 * @file /src/core/theme.ts
 * @description Design token system, color themes, density modes, and PRO switch.
 * Conforms to the black & gold RAWx cinematic design system.
 */

export type ThemeId = 'rawx-gold' | 'warm-film' | 'cold-steel' | 'paper-light' | 'high-contrast';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';
export type WorkspaceMode = 'STAGE' | 'BOARD' | 'CUT';

export interface ThemeColors {
  bg: string;
  surface: string;
  raised: string;
  accent: string;
  accentBright: string;
  text: string;
  textMuted: string;
  border: string;
}

export const THEMES: Record<ThemeId, { name: string; colors: ThemeColors }> = {
  'rawx-gold': {
    name: 'RAWx Gold (Default)',
    colors: {
      bg: '#050505',
      surface: '#0B0B0B',
      raised: '#121212',
      accent: '#D4AF37',
      accentBright: '#FFE066',
      text: '#EDEDED',
      textMuted: '#8A8A8A',
      border: 'rgba(212, 175, 55, 0.25)',
    },
  },
  'warm-film': {
    name: 'Warm Film 35mm',
    colors: {
      bg: '#080605',
      surface: '#120E0B',
      raised: '#1C1612',
      accent: '#E59866',
      accentBright: '#F8C471',
      text: '#F5EEF0',
      textMuted: '#9E8E89',
      border: 'rgba(229, 152, 102, 0.25)',
    },
  },
  'cold-steel': {
    name: 'Cold Steel / Sci-Fi',
    colors: {
      bg: '#04070A',
      surface: '#0A1017',
      raised: '#111A24',
      accent: '#5DADE2',
      accentBright: '#AED6F1',
      text: '#EBF5FB',
      textMuted: '#85929E',
      border: 'rgba(93, 173, 226, 0.25)',
    },
  },
  'paper-light': {
    name: 'Paper Studio Light',
    colors: {
      bg: '#F5F5F0',
      surface: '#EAEAE2',
      raised: '#DCDCD0',
      accent: '#8C7851',
      accentBright: '#B39D72',
      text: '#1C1C1A',
      textMuted: '#686860',
      border: 'rgba(140, 120, 81, 0.3)',
    },
  },
  'high-contrast': {
    name: 'High Contrast Accessibility',
    colors: {
      bg: '#000000',
      surface: '#000000',
      raised: '#141414',
      accent: '#FFD700',
      accentBright: '#FFFF00',
      text: '#FFFFFF',
      textMuted: '#CCCCCC',
      border: '#FFD700',
    },
  },
};

export interface LayoutSettings {
  theme: ThemeId;
  density: DensityMode;
  isProMode: boolean;
  isLeftRailCollapsed: boolean;
  isInspectorOpen: boolean;
  bottomDockHeight: number; // in pixels
}

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  theme: 'rawx-gold',
  density: 'compact',
  isProMode: false,
  isLeftRailCollapsed: false,
  isInspectorOpen: false,
  bottomDockHeight: 180,
};

const LAYOUT_STORAGE_KEY = 'rawx_layout_settings_v1';

export class ThemeManager {
  private settings: LayoutSettings;

  constructor() {
    this.settings = { ...DEFAULT_LAYOUT_SETTINGS };
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_LAYOUT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback to default
    }
    this.applyCSSVariables();
  }

  public getSettings(): LayoutSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<LayoutSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.applyCSSVariables();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.settings));
      } catch {}
    }
  }

  public setTheme(theme: ThemeId): void {
    this.updateSettings({ theme });
  }

  public setDensity(density: DensityMode): void {
    this.updateSettings({ density });
  }

  public applyCSSVariables(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const currentTheme = THEMES[this.settings.theme] || THEMES['rawx-gold'];
    const { colors } = currentTheme;

    root.style.setProperty('--color-bg', colors.bg);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-raised', colors.raised);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-bright', colors.accentBright);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-border', colors.border);

    // Density root multipliers
    if (this.settings.density === 'compact') {
      root.style.setProperty('--density-gap', '4px');
      root.style.setProperty('--density-pad', '6px');
    } else if (this.settings.density === 'spacious') {
      root.style.setProperty('--density-gap', '12px');
      root.style.setProperty('--density-pad', '16px');
    } else {
      root.style.setProperty('--density-gap', '8px');
      root.style.setProperty('--density-pad', '10px');
    }
  }
}

export const themeManager = new ThemeManager();
