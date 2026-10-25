/**
 * @file /src/constants/corporateData.ts
 * @description Master Corporate B2B Title & Motion Graphics Suite for HANDFILM.
 * 
 * Contains 5 industry-specific intro templates with fully prepared text content,
 * call-to-actions, mock background photography, and motion styles.
 */

export interface CorporateProfile {
  id: string;
  industry: string;
  hook: string;
  subText: string;
  callToAction: string;
  mockImage: string;
  defaultAnimation: 'brutal_snap' | 'editorial_mask' | 'cinematic_breath' | 'kinetic_overshoot' | 'cipher_glitch' | string;
  theme: string;
}

export const CORPORATE_PROFILES: ReadonlyArray<CorporateProfile> = [
  {
    id: 'corp_fintech',
    industry: 'FIN-TECH & BANKING',
    hook: '10% CASHBACK // ZERO FEES',
    subText: 'Secure. Fast. Borderless Transactions.',
    callToAction: 'DOWNLOAD THE APP NOW',
    mockImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
    defaultAnimation: 'brutal_snap',
    theme: 'glassmorphic_trust'
  },
  {
    id: 'corp_fashion',
    industry: 'HIGH-STREET FASHION',
    hook: '// WINTER DROP 2026 //',
    subText: 'Redefining Urban Aesthetics. Available Nationwide.',
    callToAction: 'SHOP THE COLLECTION',
    mockImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800',
    defaultAnimation: 'editorial_mask',
    theme: 'split_screen_magazine'
  },
  {
    id: 'corp_realestate',
    industry: 'REAL ESTATE & INFRASTRUCTURE',
    hook: 'REDEFINING THE SKYLINE',
    subText: 'Luxury Living Meets Brutalist Architecture.',
    callToAction: 'BOOK YOUR SITE VISIT',
    mockImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
    defaultAnimation: 'cinematic_breath',
    theme: 'majestic_minimal'
  },
  {
    id: 'corp_fmcg',
    industry: 'FMCG & FLASH SALES',
    hook: '48 HOURS ONLY // 50% OFF',
    subText: 'The biggest digital clearance of the year.',
    callToAction: 'GRAB BEFORE IT GONE',
    mockImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=800',
    defaultAnimation: 'kinetic_overshoot',
    theme: 'bold_fomo_blocks'
  },
  {
    id: 'corp_telco',
    industry: 'TELCO & TECH',
    hook: 'CONNECTING 170 MILLION',
    subText: 'Ultra-fast 5G infrastructure for the next generation.',
    callToAction: 'UPGRADE YOUR PLAN',
    mockImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    defaultAnimation: 'cipher_glitch',
    theme: 'hud_telemetry'
  }
];

export const DEFAULT_CORPORATE_PROFILE = CORPORATE_PROFILES[0];

export function getCorporateProfileById(id: string): CorporateProfile | undefined {
  return CORPORATE_PROFILES.find(p => p.id === id);
}
