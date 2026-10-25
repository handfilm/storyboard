/**
 * @file /src/constants/titleTemplates.ts
 * @description Master Cinematic Title Templates Engine — 10 Production-Ready Director Presets.
 * Designed for 0ms WebCodecs canvas integration, real-time stage previews, and 1-click slide application.
 */

import { AnthologyFrame } from '../types/anthology';
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
    position: 'center',
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
    position: 'center',
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
    fontFamily: 'Rajdhani, monospace, sans-serif',
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
    fontFamily: 'Inter, system-ui, sans-serif',
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
    fontFamily: 'VT323, "Courier New", monospace',
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
    fontFamily: 'Georgia, serif',
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
    fontFamily: 'Didot, "Bodoni MT", serif',
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
    corp_fintech: 'system-ui, -apple-system, sans-serif',
    corp_fashion: 'Didot, "Bodoni MT", serif',
    corp_realestate: 'Cinzel, "Playfair Display", serif',
    corp_fmcg: 'Impact, "Arial Black", sans-serif',
    corp_telco: 'ui-monospace, "SF Mono", "Consolas", monospace',
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


/**
 * Applies a TitleTemplatePreset onto an existing AnthologyFrame with 0ms delay.
 */
export function applyTitleTemplateToFrame(
  frame: AnthologyFrame,
  preset: TitleTemplatePreset
): AnthologyFrame {
  return {
    ...frame,
    title: preset.primaryText,
    bengaliTitle: preset.bengaliText || frame.bengaliTitle,
    tagline: preset.secondaryText || frame.tagline,
    colorAccent: preset.color,
    imageUrl: frame.imageUrl || preset.mockImage,
    thumbnailUrl: frame.thumbnailUrl,
    dopamineConfig: undefined,
    directorNotes: preset.callToAction 
      ? `[CTA: ${preset.callToAction}] ${frame.directorNotes || ''}`.trim()
      : frame.directorNotes,
    titleAnimation: preset.animationStyle,
    caption: {
      text: preset.primaryText,
      bengaliText: preset.bengaliText || frame.bengaliTitle,
      style: preset.category === 'rap' ? 'rap_pop' : 'cinematic_minimal',
      color: preset.color,
      fontFamily: preset.fontFamily,
      position: preset.position
    }
  };
}
