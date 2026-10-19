/**
 * RAWx Studio — Design Tokens & Identity
 * Black + Gold brutalist cinema aesthetic with typographic discipline.
 */

export const tokens = {
  colors: {
    bg: '#050505',
    surface: '#0B0B0B',
    raised: '#121212',
    overlay: 'rgba(5, 5, 5, 0.85)',
    border: 'rgba(212, 175, 55, 0.18)',
    borderHover: 'rgba(212, 175, 55, 0.45)',
    gold: '#D4AF37',
    goldBright: '#FFE066',
    goldMuted: 'rgba(212, 175, 55, 0.3)',
    text: '#EDEDED',
    textMuted: '#8A8A8A',
    success: '#4ADE80',
    danger: '#FF4B4B',
    info: '#4B9EFF'
  },
  typography: {
    fontUi: "'JetBrains Mono', monospace",
    fontDisplay: "'Cinzel', serif",
    fontBengaliSerif: "'Noto Serif Bengali', serif",
    fontBengaliDisplay: "'Anek Bangla', sans-serif"
  },
  spacing: {
    grid: 8,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  },
  motion: {
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '320ms cubic-bezier(0.16, 1, 0.3, 1)'
  }
};

export type StudioTheme = 'RAWx Gold' | 'Warm Film' | 'Cold Steel' | 'Paper Light' | 'High Contrast';
