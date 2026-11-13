/**
 * @file /src/constants/titleTemplates.ts
 * @description Master Cinematic Title Templates Engine — 10 Production-Ready Director Presets.
 * Designed for 0ms WebCodecs canvas integration, real-time stage previews, and 1-click slide application.
 */

import { AnthologyFrame } from '../types/anthology';
import {
  TitlePresetCategory,
  TitlePresetConfig,
  ShotTitleData,
  ShotTitleAlignment
} from '../types/titlePreset';
import { CORPORATE_PROFILES } from './corporateData';

export interface TitleTemplatePreset {
  id: string;
  name: string;
  category: 'cinematic' | 'rap' | 'docu' | 'retro' | 'corporate';
  primaryText: string;
  secondaryText?: string;
  fontFamily: string;
  color: string;
  glowColor?: string;
  animationStyle: 'fade' | 'pop' | 'glitch' | 'slide' | 'static';
  position: 'center' | 'lower-third' | 'top' | 'bottom-wide';
  letterSpacing?: string;
  previewThumbnail?: string;
  bengaliText?: string;
  fontSizeRem?: number;
  badge?: string;
  callToAction?: string;
  industry?: string;
  mockImage?: string;
  theme?: string;
}

export const BASE_CINEMATIC_TITLE_PRESETS: ReadonlyArray<TitleTemplatePreset> = [
  {
    id: 'atelier-gold-dual',
    name: '01. ATELIER GOLD DUAL',
    category: 'cinematic',
    primaryText: 'দৃষ্টির সীমানা',
    bengaliText: 'দৃষ্টির সীমানা',
    secondaryText: 'THE SINGULARITY // SCENE BEAT 01',
    fontFamily: 'Cinzel, "Anek Bangla", serif',
    color: '#F5A623',
    glowColor: 'rgba(245, 166, 35, 0.75)',
    animationStyle: 'fade',
    position: 'center',
    letterSpacing: '0.25em',
    fontSizeRem: 2.25,
    badge: 'HERO BILINGUAL'
  },
  {
    id: 'rap-chopper-kinetic',
    name: '02. RAP CHOPPER KINETIC',
    category: 'rap',
    primaryText: 'CHOPPER 140 BPM',
    secondaryText: 'DROP TRANSIENT // HARD HIT',
    fontFamily: 'Impact, "Arial Black", sans-serif',
    color: '#FACC15',
    glowColor: 'rgba(250, 204, 21, 0.85)',
    animationStyle: 'pop',
    position: 'bottom-wide',
    letterSpacing: '0.05em',
    fontSizeRem: 2.5,
    badge: 'RAP STACCATO'
  },
  {
    id: '35mm-film-leader-mono',
    name: '03. 35MM FILM LEADER MONO',
    category: 'retro',
    primaryText: 'HEAD LEADER // 35MM CINE',
    secondaryText: 'TC 00:01:24:00 // SOUND SYNC',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#E4E4E7',
    glowColor: 'rgba(255, 255, 255, 0.3)',
    animationStyle: 'static',
    position: 'top',
    letterSpacing: '0.3em',
    fontSizeRem: 1.6,
    badge: 'OPTICAL LEADER'
  },
  {
    id: 'anamorphic-scifi-hud',
    name: '04. ANAMORPHIC SCI-FI HUD',
    category: 'docu',
    primaryText: '[ VECTOR // SECTOR 07 ]',
    secondaryText: 'SYS_LOCK: 2.39:1 ANAMORPHIC',
    fontFamily: 'Orbitron, Rajdhani, monospace, sans-serif',
    color: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.8)',
    animationStyle: 'glitch',
    position: 'top',
    letterSpacing: '0.2em',
    fontSizeRem: 1.5,
    badge: 'CYAN TELEMETRY'
  },
  {
    id: 'docu-lower-third',
    name: '05. DOCU LOWER THIRD',
    category: 'docu',
    primaryText: 'RAKIB HIMON',
    secondaryText: 'Director of Photography // Atelier RAWx',
    fontFamily: 'Inter, "Space Grotesk", system-ui, sans-serif',
    color: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.2)',
    animationStyle: 'slide',
    position: 'lower-third',
    letterSpacing: '0.08em',
    fontSizeRem: 1.4,
    badge: 'SPEAKER CARD'
  },
  {
    id: 'brutalist-industrial',
    name: '06. BRUTALIST INDUSTRIAL',
    category: 'rap',
    primaryText: 'HEAVY PROTOCOL',
    secondaryText: 'STENCIL CUT // 24FPS UNCOMPRESSED',
    fontFamily: '"Arial Black", Impact, sans-serif',
    color: '#FFFFFF',
    glowColor: 'rgba(0, 0, 0, 0.9)',
    animationStyle: 'pop',
    position: 'bottom-wide',
    letterSpacing: '0.02em',
    fontSizeRem: 2.4,
    badge: 'RAW MONO'
  },
  {
    id: 'retro-vhs-tape',
    name: '07. RETRO VHS TAPE',
    category: 'retro',
    primaryText: 'PLAY ▶ SP 0:00:12',
    secondaryText: 'HI-FI STEREO // TRACKING AUTO',
    fontFamily: 'VT323, "JetBrains Mono", "Courier New", monospace',
    color: '#34D399',
    glowColor: 'rgba(52, 211, 153, 0.6)',
    animationStyle: 'glitch',
    position: 'top',
    letterSpacing: '0.15em',
    fontSizeRem: 1.6,
    badge: 'CASSETTE SP'
  },
  {
    id: 'neon-glitch-pulse',
    name: '08. NEON GLITCH PULSE',
    category: 'rap',
    primaryText: 'CYBER HYPERDRIVE',
    secondaryText: 'SYNAPSE OVERLOAD // 14-BIT ARRI',
    fontFamily: 'Orbitron, sans-serif',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    animationStyle: 'glitch',
    position: 'center',
    letterSpacing: '0.18em',
    fontSizeRem: 2.1,
    badge: 'DUAL CHROMATIC'
  },
  {
    id: 'minimal-poetry-cinema',
    name: '09. MINIMAL POETRY CINEMA',
    category: 'cinematic',
    primaryText: 'the silent horizon waits',
    secondaryText: 'chapter one: whispers in monochrome',
    fontFamily: '"Playfair Display", Georgia, serif',
    color: '#D1D5DB',
    glowColor: 'rgba(209, 213, 219, 0.25)',
    animationStyle: 'fade',
    position: 'lower-third',
    letterSpacing: '0.35em',
    fontSizeRem: 1.35,
    badge: 'WHISPER SCOPE'
  },
  {
    id: 'editorial-runway',
    name: '10. EDITORIAL RUNWAY',
    category: 'cinematic',
    primaryText: "L'ATELIER NOIR",
    secondaryText: 'AUTUMN / WINTER CINEMA COLLECTION',
    fontFamily: 'Didot, "Bodoni MT", "Playfair Display", serif',
    color: '#F8FAFC',
    glowColor: 'rgba(248, 250, 252, 0.4)',
    animationStyle: 'slide',
    position: 'center',
    letterSpacing: '0.28em',
    fontSizeRem: 2.0,
    badge: 'HIGH COUTURE'
  }
];

export const CORPORATE_TITLE_PRESETS: ReadonlyArray<TitleTemplatePreset> = CORPORATE_PROFILES.map((corp, index) => {
  let animStyle: TitleTemplatePreset['animationStyle'] = 'fade';
  if (corp.defaultAnimation === 'brutal_snap' || corp.defaultAnimation === 'kinetic_overshoot') animStyle = 'pop';
  else if (corp.defaultAnimation === 'editorial_mask') animStyle = 'slide';
  else if (corp.defaultAnimation === 'cipher_glitch') animStyle = 'glitch';

  const fontFamilies: Record<string, string> = {
    corp_fintech: 'Inter, system-ui, -apple-system, sans-serif',
    corp_fashion: 'Didot, "Bodoni MT", "Playfair Display", serif',
    corp_realestate: 'Cinzel, "Playfair Display", serif',
    corp_fmcg: 'Impact, "Arial Black", sans-serif',
    corp_telco: '"JetBrains Mono", ui-monospace, "SF Mono", "Consolas", monospace',
  };

  const colors: Record<string, string> = {
    corp_fintech: '#10B981',
    corp_fashion: '#F43F5E',
    corp_realestate: '#D4AF37',
    corp_fmcg: '#F59E0B',
    corp_telco: '#06B6D4',
  };

  const glowColors: Record<string, string> = {
    corp_fintech: 'rgba(16, 185, 129, 0.45)',
    corp_fashion: 'rgba(244, 63, 94, 0.4)',
    corp_realestate: 'rgba(212, 175, 55, 0.5)',
    corp_fmcg: 'rgba(245, 158, 11, 0.6)',
    corp_telco: 'rgba(6, 182, 212, 0.5)',
  };

  const positions: Record<string, TitleTemplatePreset['position']> = {
    corp_fintech: 'center',
    corp_fashion: 'center',
    corp_realestate: 'lower-third',
    corp_fmcg: 'top',
    corp_telco: 'center',
  };

  const names: Record<string, string> = {
    corp_fintech: '11. FIN-TECH // CASHBACK ZERO FEES',
    corp_fashion: '12. HIGH-STREET // WINTER DROP 2026',
    corp_realestate: '13. REAL ESTATE // REDEFINING SKYLINE',
    corp_fmcg: '14. FMCG // 48H FLASH SALE 50% OFF',
    corp_telco: '15. TELCO // CONNECTING 170 MILLION',
  };

  return {
    id: corp.id,
    name: names[corp.id] || `${11 + index}. ${corp.industry}`,
    category: 'corporate' as const,
    primaryText: corp.hook,
    secondaryText: corp.subText,
    fontFamily: fontFamilies[corp.id] || 'sans-serif',
    color: colors[corp.id] || '#FFFFFF',
    glowColor: glowColors[corp.id] || 'rgba(255, 255, 255, 0.5)',
    animationStyle: animStyle,
    position: positions[corp.id] || 'center',
    letterSpacing: corp.id === 'corp_fashion' ? '0.22em' : corp.id === 'corp_realestate' ? '0.25em' : corp.id === 'corp_telco' ? '0.18em' : '0.08em',
    fontSizeRem: corp.id === 'corp_fmcg' ? 2.3 : 2.1,
    badge: corp.industry,
    industry: corp.industry,
    callToAction: corp.callToAction,
    mockImage: corp.mockImage,
    theme: corp.theme,
  };
});

export const CINEMATIC_TITLE_PRESETS: ReadonlyArray<TitleTemplatePreset> = [
  ...BASE_CINEMATIC_TITLE_PRESETS,
  ...CORPORATE_TITLE_PRESETS,
];

export const TEMPLATES: ReadonlyArray<TitleTemplatePreset> = CINEMATIC_TITLE_PRESETS;

function parseLetterSpacingEm(raw?: string, fallback: number = 0.15): number {
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const PRESET_CONFIG_OVERRIDES: Record<string, Partial<TitlePresetConfig>> = {
  'atelier-gold-dual': {
    category: 'CINEMATIC',
    layoutMode: 'center-hero',
    banglaFontFamily: '"Noto Serif Bengali", "Anek Bangla", serif',
    englishFontFamily: 'Cinzel, "JetBrains Mono", serif',
    primaryColor: '#F5A623',
    primaryGradient: ['#FDE68A', '#FBBF24', '#D97706'],
    secondaryColor: '#E2E8F0',
    strokeColor: 'rgba(12, 8, 2, 0.65)',
    strokeWidth: 0,
    glowColor: 'rgba(245, 166, 35, 0.85)',
    glowIntensity: 1.0,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#F5A623'
    },
    motionAnimation: 'slow-cinema-fade',
    chromaticAberration: 0,
    letterTracking: 0.2,
    fontScale: 72,
    verticalOffset: 0,
    uppercase: true
  },
  'rap-chopper-kinetic': {
    category: 'RAP',
    layoutMode: 'brutalist-box',
    banglaFontFamily: '"Anek Bangla", Impact, "Arial Black", sans-serif',
    englishFontFamily: 'Impact, "Arial Black", sans-serif',
    primaryColor: '#FACC15',
    secondaryColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3.5,
    glowColor: 'rgba(250, 204, 21, 0.5)',
    glowIntensity: 0.55,
    backdropPlate: {
      enabled: true,
      background: 'rgba(8, 8, 10, 0.9)',
      border: '2.5px solid #FACC15',
      backdropBlur: 6,
      padding: '12px 26px',
      accentBarColor: '#FACC15'
    },
    motionAnimation: 'chopper-staccato',
    chromaticAberration: 30,
    letterTracking: 0.05,
    fontScale: 74,
    verticalOffset: 0,
    uppercase: true
  },
  '35mm-film-leader-mono': {
    category: 'RETRO',
    layoutMode: 'hud-bracket',
    banglaFontFamily: '"Anek Bangla", "JetBrains Mono", monospace',
    englishFontFamily: '"Courier New", "JetBrains Mono", monospace',
    primaryColor: '#E4E4E7',
    secondaryColor: '#A1A1AA',
    strokeColor: '#000000',
    strokeWidth: 1,
    glowColor: 'rgba(228, 228, 231, 0.35)',
    glowIntensity: 0.35,
    backdropPlate: {
      enabled: true,
      background: 'rgba(9, 9, 11, 0.72)',
      border: '1px dashed rgba(228, 228, 231, 0.5)',
      backdropBlur: 4,
      padding: '12px 24px',
      accentBarColor: '#E4E4E7'
    },
    motionAnimation: 'typewriter-hud',
    chromaticAberration: 0,
    letterTracking: 0.24,
    fontScale: 54,
    verticalOffset: 0,
    uppercase: true
  },
  'anamorphic-scifi-hud': {
    category: 'DOCU',
    layoutMode: 'hud-bracket',
    banglaFontFamily: '"Anek Bangla", "Space Grotesk", sans-serif',
    englishFontFamily: 'Orbitron, Rajdhani, "JetBrains Mono", monospace',
    primaryColor: '#00F0FF',
    secondaryColor: '#CFFAFE',
    strokeColor: '#042F40',
    strokeWidth: 1.5,
    glowColor: 'rgba(0, 240, 255, 0.9)',
    glowIntensity: 1.15,
    backdropPlate: {
      enabled: true,
      background: 'rgba(2, 18, 28, 0.65)',
      border: '1px solid rgba(0, 240, 255, 0.55)',
      backdropBlur: 12,
      padding: '12px 24px',
      accentBarColor: '#00F0FF'
    },
    motionAnimation: 'typewriter-hud',
    chromaticAberration: 22,
    letterTracking: 0.18,
    fontScale: 54,
    verticalOffset: 0,
    uppercase: true
  },
  'docu-lower-third': {
    category: 'DOCU',
    layoutMode: 'lower-third-bar',
    banglaFontFamily: '"Noto Serif Bengali", "Anek Bangla", sans-serif',
    englishFontFamily: 'Inter, "Space Grotesk", system-ui, sans-serif',
    primaryColor: '#FFFFFF',
    secondaryColor: '#D4D4D8',
    strokeColor: '#000000',
    strokeWidth: 0,
    glowColor: 'rgba(255, 255, 255, 0.22)',
    glowIntensity: 0.2,
    backdropPlate: {
      enabled: true,
      background: 'rgba(11, 12, 16, 0.84)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      backdropBlur: 16,
      padding: '12px 24px',
      accentBarColor: '#F59E0B'
    },
    motionAnimation: 'lower-third-slide',
    chromaticAberration: 0,
    letterTracking: 0.08,
    fontScale: 52,
    verticalOffset: 0,
    uppercase: false
  },
  'brutalist-industrial': {
    category: 'RAP',
    layoutMode: 'brutalist-box',
    banglaFontFamily: '"Anek Bangla", "Arial Black", sans-serif',
    englishFontFamily: '"Arial Black", Impact, sans-serif',
    primaryColor: '#FFFFFF',
    secondaryColor: '#D4D4D8',
    strokeColor: '#000000',
    strokeWidth: 3,
    glowColor: 'rgba(255, 255, 255, 0.25)',
    glowIntensity: 0.2,
    backdropPlate: {
      enabled: true,
      background: 'rgba(5, 5, 6, 0.94)',
      border: '2.5px solid #FFFFFF',
      backdropBlur: 0,
      padding: '14px 28px',
      accentBarColor: '#FFFFFF'
    },
    motionAnimation: 'kinetic-slam',
    chromaticAberration: 0,
    letterTracking: 0.04,
    fontScale: 72,
    verticalOffset: 0,
    uppercase: true
  },
  'retro-vhs-tape': {
    category: 'RETRO',
    layoutMode: 'hud-bracket',
    banglaFontFamily: '"Anek Bangla", "JetBrains Mono", monospace',
    englishFontFamily: 'VT323, "JetBrains Mono", "Courier New", monospace',
    primaryColor: '#34D399',
    secondaryColor: '#A7F3D0',
    strokeColor: '#022C22',
    strokeWidth: 1.5,
    glowColor: 'rgba(52, 211, 153, 0.78)',
    glowIntensity: 0.9,
    backdropPlate: {
      enabled: true,
      background: 'rgba(3, 20, 14, 0.62)',
      border: '1px solid rgba(52, 211, 153, 0.45)',
      backdropBlur: 4,
      padding: '10px 22px',
      accentBarColor: '#34D399'
    },
    motionAnimation: 'neon-glitch-rgb',
    chromaticAberration: 48,
    letterTracking: 0.14,
    fontScale: 56,
    verticalOffset: 0,
    uppercase: true
  },
  'neon-glitch-pulse': {
    category: 'RAP',
    layoutMode: 'center-hero',
    banglaFontFamily: '"Anek Bangla", Orbitron, sans-serif',
    englishFontFamily: 'Orbitron, "Space Grotesk", sans-serif',
    primaryColor: '#EC4899',
    primaryGradient: ['#F9A8D4', '#EC4899', '#22D3EE'],
    secondaryColor: '#22D3EE',
    strokeColor: '#09090B',
    strokeWidth: 1.5,
    glowColor: 'rgba(236, 72, 153, 0.95)',
    glowIntensity: 1.35,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#22D3EE'
    },
    motionAnimation: 'neon-glitch-rgb',
    chromaticAberration: 85,
    letterTracking: 0.16,
    fontScale: 70,
    verticalOffset: 0,
    uppercase: true
  },
  'minimal-poetry-cinema': {
    category: 'CINEMATIC',
    layoutMode: 'minimal-whisper',
    banglaFontFamily: '"Noto Serif Bengali", Georgia, serif',
    englishFontFamily: '"Playfair Display", Georgia, serif',
    primaryColor: '#E5E7EB',
    secondaryColor: '#9CA3AF',
    strokeColor: 'transparent',
    strokeWidth: 0,
    glowColor: 'rgba(255, 255, 255, 0.2)',
    glowIntensity: 0.2,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px'
    },
    motionAnimation: 'slow-cinema-fade',
    chromaticAberration: 0,
    letterTracking: 0.3,
    fontScale: 52,
    verticalOffset: 0,
    uppercase: false
  },
  'editorial-runway': {
    category: 'CINEMATIC',
    layoutMode: 'editorial-split',
    banglaFontFamily: '"Noto Serif Bengali", serif',
    englishFontFamily: 'Didot, "Bodoni MT", "Playfair Display", serif',
    primaryColor: '#F8FAFC',
    secondaryColor: '#E2E8F0',
    strokeColor: 'transparent',
    strokeWidth: 0,
    glowColor: 'rgba(248, 250, 252, 0.38)',
    glowIntensity: 0.35,
    backdropPlate: {
      enabled: true,
      background: 'rgba(8, 8, 12, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.35)',
      backdropBlur: 12,
      padding: '16px 32px',
      accentBarColor: '#F8FAFC'
    },
    motionAnimation: 'lower-third-slide',
    chromaticAberration: 0,
    letterTracking: 0.26,
    fontScale: 66,
    verticalOffset: 0,
    uppercase: true
  },
  corp_fintech: {
    category: 'CORPORATE',
    layoutMode: 'lower-third-bar',
    banglaFontFamily: '"Anek Bangla", Inter, sans-serif',
    englishFontFamily: 'Inter, system-ui, sans-serif',
    primaryColor: '#10B981',
    secondaryColor: '#ECFDF5',
    strokeColor: '#022C22',
    strokeWidth: 0,
    glowColor: 'rgba(16, 185, 129, 0.55)',
    glowIntensity: 0.6,
    backdropPlate: {
      enabled: true,
      background: 'rgba(4, 24, 18, 0.85)',
      border: '1px solid rgba(16, 185, 129, 0.45)',
      backdropBlur: 14,
      padding: '12px 24px',
      accentBarColor: '#10B981'
    },
    motionAnimation: 'lower-third-slide',
    chromaticAberration: 0,
    letterTracking: 0.08,
    fontScale: 60,
    verticalOffset: 0,
    uppercase: true
  },
  corp_fashion: {
    category: 'CORPORATE',
    layoutMode: 'editorial-split',
    banglaFontFamily: '"Noto Serif Bengali", serif',
    englishFontFamily: 'Didot, "Bodoni MT", "Playfair Display", serif',
    primaryColor: '#F43F5E',
    secondaryColor: '#FFF1F2',
    strokeColor: '#4C0519',
    strokeWidth: 0,
    glowColor: 'rgba(244, 63, 94, 0.5)',
    glowIntensity: 0.55,
    backdropPlate: {
      enabled: true,
      background: 'rgba(20, 4, 10, 0.52)',
      border: '1px solid rgba(244, 63, 94, 0.4)',
      backdropBlur: 10,
      padding: '16px 32px',
      accentBarColor: '#F43F5E'
    },
    motionAnimation: 'slow-cinema-fade',
    chromaticAberration: 0,
    letterTracking: 0.22,
    fontScale: 66,
    verticalOffset: 0,
    uppercase: true
  },
  corp_realestate: {
    category: 'CORPORATE',
    layoutMode: 'lower-third-bar',
    banglaFontFamily: '"Noto Serif Bengali", serif',
    englishFontFamily: 'Cinzel, "Playfair Display", serif',
    primaryColor: '#D4AF37',
    primaryGradient: ['#FEF3C7', '#D4AF37', '#B45309'],
    secondaryColor: '#F8FAFC',
    strokeColor: '#1C1917',
    strokeWidth: 0,
    glowColor: 'rgba(212, 175, 55, 0.6)',
    glowIntensity: 0.7,
    backdropPlate: {
      enabled: true,
      background: 'rgba(14, 12, 9, 0.85)',
      border: '1px solid rgba(212, 175, 55, 0.45)',
      backdropBlur: 14,
      padding: '12px 24px',
      accentBarColor: '#D4AF37'
    },
    motionAnimation: 'lower-third-slide',
    chromaticAberration: 0,
    letterTracking: 0.22,
    fontScale: 60,
    verticalOffset: 0,
    uppercase: true
  },
  corp_fmcg: {
    category: 'CORPORATE',
    layoutMode: 'brutalist-box',
    banglaFontFamily: '"Anek Bangla", Impact, sans-serif',
    englishFontFamily: 'Impact, "Arial Black", sans-serif',
    primaryColor: '#F59E0B',
    secondaryColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    glowColor: 'rgba(245, 158, 11, 0.7)',
    glowIntensity: 0.75,
    backdropPlate: {
      enabled: true,
      background: 'rgba(10, 8, 4, 0.92)',
      border: '2.5px solid #F59E0B',
      backdropBlur: 4,
      padding: '14px 28px',
      accentBarColor: '#F59E0B'
    },
    motionAnimation: 'kinetic-slam',
    chromaticAberration: 18,
    letterTracking: 0.06,
    fontScale: 74,
    verticalOffset: 0,
    uppercase: true
  },
  corp_telco: {
    category: 'CORPORATE',
    layoutMode: 'hud-bracket',
    banglaFontFamily: '"Anek Bangla", "JetBrains Mono", sans-serif',
    englishFontFamily: '"JetBrains Mono", Orbitron, monospace',
    primaryColor: '#06B6D4',
    secondaryColor: '#E0F2FE',
    strokeColor: '#083344',
    strokeWidth: 1,
    glowColor: 'rgba(6, 182, 212, 0.7)',
    glowIntensity: 0.85,
    backdropPlate: {
      enabled: true,
      background: 'rgba(4, 22, 32, 0.72)',
      border: '1px solid rgba(6, 182, 212, 0.5)',
      backdropBlur: 10,
      padding: '12px 24px',
      accentBarColor: '#06B6D4'
    },
    motionAnimation: 'typewriter-hud',
    chromaticAberration: 15,
    letterTracking: 0.18,
    fontScale: 58,
    verticalOffset: 0,
    uppercase: true
  },
  'molten-gold': {
    presetId: 'molten-gold',
    presetName: 'MOLTEN GOLD',
    category: 'CINEMATIC',
    layoutMode: 'center-hero',
    banglaFontFamily: '"Noto Serif Bengali", "Anek Bangla", serif',
    englishFontFamily: '"JetBrains Mono", monospace',
    primaryColor: '#F5A623',
    primaryGradient: ['#FDE68A', '#FBBF24', '#D97706'],
    secondaryColor: '#E2E8F0',
    strokeColor: '#000000',
    strokeWidth: 0,
    glowColor: 'rgba(245, 166, 35, 0.85)',
    glowIntensity: 1.0,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#F5A623'
    },
    motionAnimation: 'slow-cinema-fade',
    chromaticAberration: 0,
    letterTracking: 0.15,
    fontScale: 72,
    verticalOffset: 0,
    uppercase: true
  },
  'titanium-silver': {
    presetId: 'titanium-silver',
    presetName: 'TITANIUM SILVER',
    category: 'CINEMATIC',
    layoutMode: 'center-hero',
    banglaFontFamily: '"Anek Bangla", "Space Grotesk", sans-serif',
    englishFontFamily: '"JetBrains Mono", monospace',
    primaryColor: '#38BDF8',
    primaryGradient: ['#F1F5F9', '#CBD5E1', '#A5F3FC'],
    secondaryColor: '#F1F5F9',
    strokeColor: '#0F172A',
    strokeWidth: 0,
    glowColor: 'rgba(56, 189, 248, 0.85)',
    glowIntensity: 1.0,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#38BDF8'
    },
    motionAnimation: 'lower-third-slide',
    chromaticAberration: 0,
    letterTracking: 0.18,
    fontScale: 72,
    verticalOffset: 0,
    uppercase: true
  },
  'neon-crimson': {
    presetId: 'neon-crimson',
    presetName: 'NEON CRIMSON',
    category: 'RAP',
    layoutMode: 'center-hero',
    banglaFontFamily: '"Anek Bangla", Orbitron, sans-serif',
    englishFontFamily: 'Orbitron, "JetBrains Mono", monospace',
    primaryColor: '#EF4444',
    primaryGradient: ['#FECDD3', '#EF4444', '#BE123C'],
    secondaryColor: '#FFE4E6',
    strokeColor: '#1F0409',
    strokeWidth: 1,
    glowColor: 'rgba(239, 68, 68, 0.9)',
    glowIntensity: 1.2,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#EF4444'
    },
    motionAnimation: 'neon-glitch-rgb',
    chromaticAberration: 38,
    letterTracking: 0.16,
    fontScale: 72,
    verticalOffset: 0,
    uppercase: true
  }
};

function mapPresetCategory(cat: TitleTemplatePreset['category']): TitlePresetCategory {
  switch (cat) {
    case 'corporate':
      return 'CORPORATE';
    case 'rap':
      return 'RAP';
    case 'docu':
      return 'DOCU';
    case 'retro':
      return 'RETRO';
    case 'cinematic':
    default:
      return 'CINEMATIC';
  }
}

export function buildTitlePresetConfig(
  preset: TitleTemplatePreset,
  overrides?: Partial<TitlePresetConfig>
): TitlePresetConfig {
  const specific = PRESET_CONFIG_OVERRIDES[preset.id] || {};
  const fallbackLayout: TitlePresetConfig['layoutMode'] =
    preset.position === 'lower-third'
      ? 'lower-third-bar'
      : preset.position === 'top'
        ? 'hud-bracket'
        : preset.position === 'bottom-wide'
          ? 'brutalist-box'
          : 'center-hero';
  const fallbackAnim: TitlePresetConfig['motionAnimation'] =
    preset.animationStyle === 'pop'
      ? 'kinetic-slam'
      : preset.animationStyle === 'glitch'
        ? 'neon-glitch-rgb'
        : preset.animationStyle === 'slide'
          ? 'lower-third-slide'
          : 'slow-cinema-fade';

  return {
    presetId: preset.id,
    presetName: preset.name,
    category: mapPresetCategory(preset.category),
    layoutMode: fallbackLayout,
    banglaFontFamily: '"Anek Bangla", "Noto Serif Bengali", sans-serif',
    englishFontFamily: preset.fontFamily || '"JetBrains Mono", monospace',
    primaryColor: preset.color,
    secondaryColor: '#E4E4E7',
    strokeColor: '#000000',
    strokeWidth: 0,
    glowColor: preset.glowColor || 'rgba(245, 166, 35, 0.65)',
    glowIntensity: 1.0,
    backdropPlate: {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: preset.color
    },
    motionAnimation: fallbackAnim,
    chromaticAberration: 0,
    letterTracking: parseLetterSpacingEm(preset.letterSpacing, 0.15),
    fontScale: Math.round((preset.fontSizeRem ?? 2.0) * 32),
    verticalOffset: 0,
    uppercase: true,
    ...specific,
    ...overrides
  };
}

export function buildTitlePresetConfigById(
  idOrHeroPreset?: string | null,
  overrides?: Partial<TitlePresetConfig>
): TitlePresetConfig {
  const key = (idOrHeroPreset || 'molten-gold').trim();
  const template = CINEMATIC_TITLE_PRESETS.find((p) => p.id === key);
  if (template) {
    return buildTitlePresetConfig(template, overrides);
  }
  const heroOverride = PRESET_CONFIG_OVERRIDES[key] || PRESET_CONFIG_OVERRIDES['molten-gold'];
  return {
    presetId: heroOverride.presetId || key || 'molten-gold',
    presetName: heroOverride.presetName || 'MOLTEN GOLD',
    category: heroOverride.category || 'CINEMATIC',
    layoutMode: heroOverride.layoutMode || 'center-hero',
    banglaFontFamily: heroOverride.banglaFontFamily || '"Noto Serif Bengali", "Anek Bangla", serif',
    englishFontFamily: heroOverride.englishFontFamily || '"JetBrains Mono", monospace',
    primaryColor: heroOverride.primaryColor || '#F5A623',
    primaryGradient: heroOverride.primaryGradient,
    secondaryColor: heroOverride.secondaryColor || '#E2E8F0',
    strokeColor: heroOverride.strokeColor || '#000000',
    strokeWidth: heroOverride.strokeWidth ?? 0,
    glowColor: heroOverride.glowColor || 'rgba(245, 166, 35, 0.85)',
    glowIntensity: heroOverride.glowIntensity ?? 1.0,
    backdropPlate: heroOverride.backdropPlate || {
      enabled: false,
      background: 'transparent',
      border: 'none',
      backdropBlur: 0,
      padding: '0px',
      accentBarColor: '#F5A623'
    },
    motionAnimation: heroOverride.motionAnimation || 'slow-cinema-fade',
    chromaticAberration: heroOverride.chromaticAberration ?? 0,
    letterTracking: heroOverride.letterTracking ?? 0.15,
    fontScale: heroOverride.fontScale ?? 72,
    verticalOffset: heroOverride.verticalOffset ?? 0,
    uppercase: heroOverride.uppercase ?? true,
    ...overrides
  };
}

export function buildDopamineTitlePresetConfig(params: {
  presetId?: string;
  presetName?: string;
  accentColor?: string;
  glitchIntensity?: number;
}): TitlePresetConfig {
  const accent = params.accentColor || '#FF2B2B';
  return {
    presetId: params.presetId || 'viral_loop_1',
    presetName: params.presetName || 'DOPAMINE SEQUENCE',
    category: 'DOPAMINE',
    layoutMode: 'brutalist-box',
    banglaFontFamily: '"Anek Bangla", Impact, sans-serif',
    englishFontFamily: 'Impact, Orbitron, "Arial Black", sans-serif',
    primaryColor: '#FFFFFF',
    secondaryColor: accent,
    strokeColor: '#000000',
    strokeWidth: 4,
    glowColor: accent,
    glowIntensity: 1.4,
    backdropPlate: {
      enabled: true,
      background: 'rgba(10, 4, 8, 0.78)',
      border: `2px solid ${accent}`,
      backdropBlur: 8,
      padding: '14px 28px',
      accentBarColor: accent
    },
    motionAnimation: 'neon-glitch-rgb',
    chromaticAberration: params.glitchIntensity ?? 80,
    letterTracking: 0.08,
    fontScale: 78,
    verticalOffset: 0,
    uppercase: true
  };
}

/**
 * Strips stale `[🌪️ DOPAMINE: ...]` or `[DOPAMINE: ...]` or `[CTA: ...]` metadata prefixes
 * so switching presets cleanly replaces stale preset badges/dialogue telemetry.
 */
export function stripDopamineDirectorNote(notes?: string): string {
  if (!notes) return '';
  const trimmed = notes.trim();
  if (/^\[(?:🌪️\s*)?DOPAMINE:/i.test(trimmed)) {
    return '';
  }
  return trimmed
    .replace(/\[(?:🌪️\s*)?DOPAMINE:[^\]]*\]\s*/gi, '')
    .replace(/^\[CTA:[^\]]*\]\s*/i, '')
    .replace(/^\[PRESET:[^\]]*\]\s*/i, '')
    .trim();
}

/**
 * Applies a TitleTemplatePreset onto an existing AnthologyFrame cleanly:
 * - Clears `dopamineConfig` and strips stale Dopamine director notes
 * - Writes `activeTitlePreset`, `titleStyleConfig`, and isolated `titleData`
 * - Preserves media (`imageUrl`, `videoUrl`, `videoSrc`) and duration
 */
export function applyTitleTemplateToFrame(
  frame: AnthologyFrame,
  preset: TitleTemplatePreset,
  overrides?: Partial<TitlePresetConfig>,
  options?: { preserveCustomText?: boolean }
): AnthologyFrame {
  const styleConfig = buildTitlePresetConfig(preset, overrides);
  const cleanedNotes = stripDopamineDirectorNote(frame.directorNotes);
  const nextNotes = preset.callToAction
    ? `[CTA: ${preset.callToAction}] ${cleanedNotes}`.trim()
    : cleanedNotes;

  const preserveText = Boolean(options?.preserveCustomText);
  const existingBn = frame.titleData?.banglaTitle || frame.bengaliTitle;
  const existingEn = frame.titleData?.englishSubtitle || frame.title;
  const nextBangla = preserveText && existingBn ? existingBn : (preset.bengaliText || frame.bengaliTitle || preset.primaryText);
  const nextEnglish = preserveText && existingEn ? existingEn : preset.primaryText;
  const nextCaption = frame.titleData?.captionNote ?? (nextNotes || preset.secondaryText || frame.tagline || '');

  const nextTitleData: ShotTitleData = {
    enabled: frame.titleData?.enabled ?? true,
    presetId: preset.id,
    banglaTitle: nextBangla,
    englishSubtitle: nextEnglish,
    captionNote: nextCaption,
    alignment: frame.titleData?.alignment ?? 'MID',
    fontScale: styleConfig.fontScale,
    glowIntensity: styleConfig.glowIntensity,
    letterTracking: styleConfig.letterTracking,
    verticalOffset: styleConfig.verticalOffset,
    entranceAnim: styleConfig.motionAnimation,
    exitAnim: frame.titleData?.exitAnim ?? 'dissolve-out',
    styleConfig
  };

  return {
    ...frame,
    title: nextEnglish,
    bengaliTitle: nextBangla,
    tagline: preset.secondaryText || frame.tagline,
    colorAccent: preset.color,
    imageUrl: frame.imageUrl || preset.mockImage,
    thumbnailUrl: frame.thumbnailUrl,
    dopamineConfig: undefined,
    activeTitlePreset: preset.id,
    titleStyleConfig: styleConfig,
    titleData: nextTitleData,
    directorNotes: nextNotes,
    tags: (frame.tags || []).filter((t) => t !== 'dopamine'),
    titleAnimation: preset.animationStyle,
    caption: {
      text: nextEnglish,
      bengaliText: nextBangla,
      style: preset.category === 'rap' ? 'rap_pop' : 'cinematic_minimal',
      color: preset.color,
      fontFamily: preset.fontFamily,
      position: preset.position
    }
  };
}

const DEFAULT_FALLBACK_BANGLA_HEADLINES = ['শূন্য', 'আলো', 'সংঘাত', 'দৃষ্টির সীমানা'];

export function createDefaultShotTitleData(
  shotOrFrame:
    | {
        title?: string;
        titleEn?: string;
        bengaliTitle?: string;
        titleBn?: string;
        tagline?: string;
        directorNotes?: string;
        activeTitlePreset?: string;
        titleStyleConfig?: TitlePresetConfig;
        dopamineConfig?: {
          presetId?: string;
          presetName?: string;
          hookText?: string;
          subText?: string;
          accentColor?: string;
          glitchIntensity?: number;
        };
      }
    | null
    | undefined,
  index: number = 0
): ShotTitleData & { styleConfig: TitlePresetConfig } {
  const fallbackBn = DEFAULT_FALLBACK_BANGLA_HEADLINES[Math.abs(index) % DEFAULT_FALLBACK_BANGLA_HEADLINES.length];
  const presetId =
    shotOrFrame?.dopamineConfig?.presetId ||
    shotOrFrame?.titleStyleConfig?.presetId ||
    shotOrFrame?.activeTitlePreset ||
    'molten-gold';

  const baseStyleConfig = shotOrFrame?.dopamineConfig
    ? (shotOrFrame.titleStyleConfig?.category === 'DOPAMINE'
        ? shotOrFrame.titleStyleConfig
        : buildDopamineTitlePresetConfig(shotOrFrame.dopamineConfig))
    : shotOrFrame?.titleStyleConfig || buildTitlePresetConfigById(presetId);

  const rawBn = shotOrFrame?.bengaliTitle ?? shotOrFrame?.titleBn;
  const rawEn = shotOrFrame?.title ?? shotOrFrame?.titleEn;
  const rawCaption = shotOrFrame?.directorNotes || shotOrFrame?.tagline || '';

  return {
    enabled: true,
    presetId: baseStyleConfig.presetId || presetId,
    banglaTitle: rawBn && rawBn.trim().length > 0 ? rawBn : fallbackBn,
    englishSubtitle:
      rawEn && rawEn.trim().length > 0
        ? rawEn
        : `SHOT ${String(index + 1).padStart(3, '0')} // MASTER SEQUENCE`,
    captionNote: rawCaption,
    alignment: 'MID',
    fontScale: baseStyleConfig.fontScale ?? 72,
    glowIntensity: baseStyleConfig.glowIntensity ?? 1.0,
    letterTracking: baseStyleConfig.letterTracking ?? 0.15,
    verticalOffset: baseStyleConfig.verticalOffset ?? 0,
    entranceAnim: baseStyleConfig.motionAnimation || 'slow-cinema-fade',
    exitAnim: 'dissolve-out',
    styleConfig: baseStyleConfig
  };
}

/**
 * Resolves strict per-shot isolated ShotTitleData.
 * Never inherits another shot's global preset/text unless `fallbackStoreConfig.heroGlobal === true`
 * and the shot lacks an explicit `titleData` / `titleStyleConfig` / `activeTitlePreset`.
 */
export function resolveShotTitleData(
  shotOrFrame:
    | {
        titleData?: ShotTitleData;
        title?: string;
        titleEn?: string;
        bengaliTitle?: string;
        titleBn?: string;
        tagline?: string;
        directorNotes?: string;
        activeTitlePreset?: string;
        titleStyleConfig?: TitlePresetConfig;
        dopamineConfig?: {
          presetId?: string;
          presetName?: string;
          hookText?: string;
          subText?: string;
          accentColor?: string;
          glitchIntensity?: number;
        };
      }
    | null
    | undefined,
  index: number = 0,
  fallbackStoreConfig?: {
    heroGlobal?: boolean;
    preset?: string;
    activePresetConfig?: TitlePresetConfig;
    titleSize?: number;
    glowIntensity?: number;
    tracking?: number;
    verticalOffset?: number;
    showTitles?: boolean;
  },
  fallbackAlignment?: ShotTitleAlignment
): ShotTitleData & { styleConfig: TitlePresetConfig } {
  const defaults = createDefaultShotTitleData(shotOrFrame, index);
  const existing = shotOrFrame?.titleData;

  if (existing) {
    const resolvedStyle: TitlePresetConfig = existing.styleConfig
      ? {
          ...existing.styleConfig,
          fontScale: existing.fontScale ?? existing.styleConfig.fontScale,
          glowIntensity: existing.glowIntensity ?? existing.styleConfig.glowIntensity,
          letterTracking: existing.letterTracking ?? existing.styleConfig.letterTracking,
          verticalOffset: existing.verticalOffset ?? existing.styleConfig.verticalOffset
        }
      : buildTitlePresetConfigById(existing.presetId || defaults.presetId, {
          fontScale: existing.fontScale,
          glowIntensity: existing.glowIntensity,
          letterTracking: existing.letterTracking,
          verticalOffset: existing.verticalOffset
        });

    return {
      ...defaults,
      ...existing,
      banglaTitle:
        typeof existing.banglaTitle === 'string' && existing.banglaTitle.length > 0
          ? existing.banglaTitle
          : defaults.banglaTitle,
      englishSubtitle:
        typeof existing.englishSubtitle === 'string' && existing.englishSubtitle.length > 0
          ? existing.englishSubtitle
          : defaults.englishSubtitle,
      alignment: existing.alignment ?? fallbackAlignment ?? 'MID',
      ...(existing.zone9 ? { zone9: existing.zone9 } : {}),
      ...(existing.kineticEntrance ? { kineticEntrance: existing.kineticEntrance } : {}),
      fontScale: existing.fontScale ?? resolvedStyle.fontScale,
      glowIntensity: existing.glowIntensity ?? resolvedStyle.glowIntensity,
      letterTracking: existing.letterTracking ?? resolvedStyle.letterTracking,
      verticalOffset: existing.verticalOffset ?? resolvedStyle.verticalOffset,
      styleConfig: resolvedStyle
    };
  }

  // If heroGlobal is explicitly enabled by user AND shot has no shot-level override, allow global style template
  const hasExplicitShotStyle = Boolean(
    shotOrFrame?.dopamineConfig ||
      shotOrFrame?.titleStyleConfig ||
      shotOrFrame?.activeTitlePreset
  );

  if (!hasExplicitShotStyle && fallbackStoreConfig?.heroGlobal && fallbackStoreConfig.activePresetConfig) {
    const g = fallbackStoreConfig.activePresetConfig;
    const syncedStyle: TitlePresetConfig = {
      ...g,
      fontScale: fallbackStoreConfig.titleSize ?? g.fontScale,
      glowIntensity: fallbackStoreConfig.glowIntensity ?? g.glowIntensity,
      letterTracking: fallbackStoreConfig.tracking ?? g.letterTracking,
      verticalOffset: fallbackStoreConfig.verticalOffset ?? g.verticalOffset
    };
    return {
      ...defaults,
      presetId: syncedStyle.presetId,
      alignment: fallbackAlignment ?? 'MID',
      fontScale: syncedStyle.fontScale,
      glowIntensity: syncedStyle.glowIntensity,
      letterTracking: syncedStyle.letterTracking,
      verticalOffset: syncedStyle.verticalOffset,
      entranceAnim: syncedStyle.motionAnimation,
      styleConfig: syncedStyle
    };
  }

  return {
    ...defaults,
    alignment: fallbackAlignment ?? defaults.alignment
  };
}

/**
 * Resolves the active TitlePresetConfig for any shot/frame/slide.
 */
export function resolveShotTitlePresetConfig(
  shotOrFrame:
    | {
        titleData?: ShotTitleData;
        titleStyleConfig?: TitlePresetConfig;
        activeTitlePreset?: string;
        dopamineConfig?: {
          presetId?: string;
          presetName?: string;
          accentColor?: string;
          glitchIntensity?: number;
        };
      }
    | null
    | undefined,
  heroTitleConfig?: {
    heroGlobal?: boolean;
    preset?: string;
    activePresetConfig?: TitlePresetConfig;
    titleSize?: number;
    glowIntensity?: number;
    tracking?: number;
    verticalOffset?: number;
  }
): TitlePresetConfig {
  if (shotOrFrame?.titleData?.styleConfig) {
    return {
      ...shotOrFrame.titleData.styleConfig,
      fontScale: shotOrFrame.titleData.fontScale ?? shotOrFrame.titleData.styleConfig.fontScale,
      glowIntensity:
        shotOrFrame.titleData.glowIntensity ?? shotOrFrame.titleData.styleConfig.glowIntensity,
      letterTracking:
        shotOrFrame.titleData.letterTracking ?? shotOrFrame.titleData.styleConfig.letterTracking,
      verticalOffset:
        shotOrFrame.titleData.verticalOffset ?? shotOrFrame.titleData.styleConfig.verticalOffset
    };
  }
  if (shotOrFrame?.dopamineConfig) {
    if (shotOrFrame.titleStyleConfig?.category === 'DOPAMINE') {
      return shotOrFrame.titleStyleConfig;
    }
    return buildDopamineTitlePresetConfig(shotOrFrame.dopamineConfig);
  }
  if (shotOrFrame?.titleStyleConfig) {
    return shotOrFrame.titleStyleConfig;
  }
  if (shotOrFrame?.activeTitlePreset) {
    return buildTitlePresetConfigById(shotOrFrame.activeTitlePreset);
  }
  if (heroTitleConfig?.heroGlobal && heroTitleConfig?.activePresetConfig) {
    return {
      ...heroTitleConfig.activePresetConfig,
      fontScale: heroTitleConfig.titleSize ?? heroTitleConfig.activePresetConfig.fontScale,
      glowIntensity: heroTitleConfig.glowIntensity ?? heroTitleConfig.activePresetConfig.glowIntensity,
      letterTracking: heroTitleConfig.tracking ?? heroTitleConfig.activePresetConfig.letterTracking,
      verticalOffset: heroTitleConfig.verticalOffset ?? heroTitleConfig.activePresetConfig.verticalOffset
    };
  }
  return buildTitlePresetConfigById(heroTitleConfig?.heroGlobal ? heroTitleConfig?.preset || 'molten-gold' : 'molten-gold', {
    ...(heroTitleConfig?.heroGlobal && typeof heroTitleConfig?.titleSize === 'number'
      ? { fontScale: heroTitleConfig.titleSize }
      : {}),
    ...(heroTitleConfig?.heroGlobal && typeof heroTitleConfig?.glowIntensity === 'number'
      ? { glowIntensity: heroTitleConfig.glowIntensity }
      : {}),
    ...(heroTitleConfig?.heroGlobal && typeof heroTitleConfig?.tracking === 'number'
      ? { letterTracking: heroTitleConfig.tracking }
      : {}),
    ...(heroTitleConfig?.heroGlobal && typeof heroTitleConfig?.verticalOffset === 'number'
      ? { verticalOffset: heroTitleConfig.verticalOffset }
      : {})
  });
}

