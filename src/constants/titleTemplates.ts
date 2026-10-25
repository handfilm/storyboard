/**
 * @file /src/constants/titleTemplates.ts
 * @description Master Cinematic Title Templates Engine — 10 Production-Ready Director Presets.
 * Designed for 0ms WebCodecs canvas integration, real-time stage previews, and 1-click slide application.
 */

import { AnthologyFrame } from '../types/anthology';

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

export const CINEMATIC_TITLE_PRESETS: ReadonlyArray<TitleTemplatePreset> = [
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
  },
  {
    id: 'corp_fintech',
    name: '11. FIN-TECH // CASHBACK ZERO FEES',
    category: 'corporate',
    primaryText: '10% CASHBACK // ZERO FEES',
    secondaryText: 'Secure. Fast. Borderless Transactions.',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    animationStyle: 'pop',
    position: 'center',
    letterSpacing: '0.08em',
    fontSizeRem: 2.1,
    badge: 'FIN-TECH & BANKING',
    industry: 'FIN-TECH & BANKING',
    callToAction: 'DOWNLOAD THE APP NOW',
    mockImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
    theme: 'glassmorphic_trust'
  },
  {
    id: 'corp_fashion',
    name: '12. HIGH-STREET // WINTER DROP 2026',
    category: 'corporate',
    primaryText: '// WINTER DROP 2026 //',
    secondaryText: 'Redefining Urban Aesthetics. Available Nationwide.',
    fontFamily: 'Didot, "Bodoni MT", serif',
    color: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    animationStyle: 'slide',
    position: 'center',
    letterSpacing: '0.22em',
    fontSizeRem: 2.1,
    badge: 'HIGH-STREET FASHION',
    industry: 'HIGH-STREET FASHION',
    callToAction: 'SHOP THE COLLECTION',
    mockImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800',
    theme: 'split_screen_magazine'
  },
  {
    id: 'corp_realestate',
    name: '13. REAL ESTATE // REDEFINING SKYLINE',
    category: 'corporate',
    primaryText: 'REDEFINING THE SKYLINE',
    secondaryText: 'Luxury Living Meets Brutalist Architecture.',
    fontFamily: 'Cinzel, "Playfair Display", serif',
    color: '#D4AF37',
    glowColor: 'rgba(212, 175, 55, 0.5)',
    animationStyle: 'fade',
    position: 'lower-third',
    letterSpacing: '0.25em',
    fontSizeRem: 1.9,
    badge: 'REAL ESTATE & INFRASTRUCTURE',
    industry: 'REAL ESTATE & INFRASTRUCTURE',
    callToAction: 'BOOK YOUR SITE VISIT',
    mockImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
    theme: 'majestic_minimal'
  },
  {
    id: 'corp_fmcg',
    name: '14. FMCG // 48H FLASH SALE 50% OFF',
    category: 'corporate',
    primaryText: '48 HOURS ONLY // 50% OFF',
    secondaryText: 'The biggest digital clearance of the year.',
    fontFamily: 'Impact, "Arial Black", sans-serif',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    animationStyle: 'pop',
    position: 'top',
    letterSpacing: '0.05em',
    fontSizeRem: 2.3,
    badge: 'FMCG & FLASH SALES',
    industry: 'FMCG & FLASH SALES',
    callToAction: 'GRAB BEFORE IT GONE',
    mockImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800',
    theme: 'bold_fomo_blocks'
  },
  {
    id: 'corp_telco',
    name: '15. TELCO // CONNECTING 170 MILLION',
    category: 'corporate',
    primaryText: 'CONNECTING 170 MILLION',
    secondaryText: 'Ultra-fast 5G infrastructure for the next generation.',
    fontFamily: 'ui-monospace, "SF Mono", "Consolas", monospace',
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    animationStyle: 'glitch',
    position: 'center',
    letterSpacing: '0.18em',
    fontSizeRem: 2.0,
    badge: 'TELCO & TECH',
    industry: 'TELCO & TECH',
    callToAction: 'UPGRADE YOUR PLAN',
    mockImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    theme: 'hud_telemetry'
  }
];

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
    imageUrl: preset.mockImage || frame.imageUrl,
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
