/**
 * @file /src/data/homepageSlides.ts
 * @description Locked 10-Slide Home Hero Editorial Sequence (01 to 10)
 * synced to Master Shots #01-#10.
 */

export type SlideWidgetKey =
  | 'telemetry'
  | 'vibe'
  | 'meter'
  | 'playback'
  | 'scope'
  | 'type'
  | 'audio'
  | 'silicon'
  | 'xml'
  | 'launch';

export interface HomepageSlide {
  id: number;
  title: string;
  subtitle: string;
  styleTag: string;
  banglaTag: string;
  banglaSubtitle: string;
  cadenceMode: string;
  body: string;
  tag: string;
  widget: SlideWidgetKey;
  backgroundImage: string;
  imageAlt: string;
  aspectRatio: string;
}

export const HOMEPAGE_SLIDES: readonly HomepageSlide[] = [
  {
    id: 1,
    styleTag: 'ANAMORPHIC GENESIS',
    banglaTag: 'সূচনা',
    title: 'OPENING SEQUENCE // RAW 4K',
    banglaSubtitle: 'অভ্যুদয়',
    cadenceMode: 'HIGH CADENCE URBAN',
    subtitle: 'অভ্যুদয় // HIGH CADENCE URBAN',
    tag: 'ANAMORPHIC GENESIS',
    widget: 'telemetry',
    backgroundImage: '/assets/aistudio/02_4487d60a.jpg',
    imageAlt: 'Opening Sequence RAW 4K tungsten station',
    aspectRatio: '2.39:1',
    body: 'Razor-sharp 18mm ultra-wide push through tungsten haze, crisp transient shutter lock, and sub-harmonic pulse.'
  },
  {
    id: 2,
    styleTag: 'OPTICAL PERIMETER',
    banglaTag: 'সীমানা',
    title: 'EVENT HORIZON // 35MM FILM',
    banglaSubtitle: 'প্রান্তরেখা',
    cadenceMode: 'FAST CHOPPER CLEAN',
    subtitle: 'প্রান্তরেখা // FAST CHOPPER CLEAN',
    tag: 'OPTICAL PERIMETER',
    widget: 'vibe',
    backgroundImage: '/assets/aistudio/01_5fdc96be.jpg',
    imageAlt: 'Event Horizon 35mm film molten amber rim light frame',
    aspectRatio: '2.39:1',
    body: 'Boundary definition between observer and subject with molten amber rim light and rhythmic frame gating.'
  },
  {
    id: 3,
    styleTag: 'PHOTON FIELD',
    banglaTag: 'আলো',
    title: 'SOLAR CORONA // NOCTILUX',
    banglaSubtitle: 'দীপ্তি',
    cadenceMode: 'EXECUTIVE & SHARP',
    subtitle: 'দীপ্তি // EXECUTIVE & SHARP',
    tag: 'PHOTON FIELD',
    widget: 'meter',
    backgroundImage: '/assets/aistudio/03_307d68f5.jpg',
    imageAlt: 'Solar Corona Noctilux specular flare highlight composition',
    aspectRatio: '2.39:1',
    body: 'High-contrast specular highlight roll-off across brutalist steel textures with precision optical flare.'
  },
  {
    id: 4,
    styleTag: 'KINETIC TENSION',
    banglaTag: 'সংঘাত',
    title: 'VELOCITY IMPACT // ZERO BLUR',
    banglaSubtitle: 'কম্পন',
    cadenceMode: 'CINEMATIC FILM',
    subtitle: 'কম্পন // CINEMATIC FILM',
    tag: 'KINETIC TENSION',
    widget: 'playback',
    backgroundImage: '/assets/aistudio/04_a108e8eb.jpg',
    imageAlt: 'Velocity Impact high-shutter kinetic freeze console frame',
    aspectRatio: '2.39:1',
    body: '1/1000s high-shutter kinetic freeze paired with rapid whip-pan transitions and low-end punch.'
  },
  {
    id: 5,
    styleTag: 'MACRO PORTRAIT',
    banglaTag: 'দৃষ্টি',
    title: 'SILENT GAZE // CLOSER 85MM',
    banglaSubtitle: 'অন্তর্দৃষ্টি',
    cadenceMode: 'DOPAMINE PULSE',
    subtitle: 'অন্তর্দৃষ্টি // DOPAMINE PULSE',
    tag: 'MACRO PORTRAIT',
    widget: 'scope',
    backgroundImage: '/assets/aistudio/05__2__6d814b04.jpg',
    imageAlt: 'Silent Gaze shallow depth of field 85mm cinema portrait',
    aspectRatio: '2.39:1',
    body: 'Shallow f/1.2 depth-of-field isolation capturing micro-expressions under warm studio key light.'
  },
  {
    id: 6,
    styleTag: 'FLOATING GLASS OUTRO',
    banglaTag: 'উন্মোচন',
    title: 'END SEQUENCE // 4K BROADCAST',
    banglaSubtitle: 'নির্বাণ',
    cadenceMode: 'AMBIENT CHILL',
    subtitle: 'নির্বাণ // AMBIENT CHILL',
    tag: 'FLOATING GLASS OUTRO',
    widget: 'type',
    backgroundImage: '/assets/aistudio/image_5ea6c84c.png',
    imageAlt: 'End Sequence 4K broadcast floating glass outro',
    aspectRatio: '2.39:1',
    body: 'Soft diffusion blur fade in a floating frosted glass capsule, gentle vertical drift, and sub-bass ducking synchronization.'
  },
  {
    id: 7,
    styleTag: 'OBSIDIAN GRADE',
    banglaTag: 'অন্ধকার',
    title: 'SHADOW ARCHITECTURE // NOIR',
    banglaSubtitle: 'ছায়াপথ',
    cadenceMode: 'DEEP CONTRAST',
    subtitle: 'ছায়াপথ // DEEP CONTRAST',
    tag: 'OBSIDIAN GRADE',
    widget: 'audio',
    backgroundImage: '/assets/aistudio/image_7e972830.png',
    imageAlt: 'Shadow Architecture noir chiaroscuro edge illumination',
    aspectRatio: '2.39:1',
    body: 'Crushed 16-bit ARRI blacks with sculpted single-source chiaroscuro edge illumination.'
  },
  {
    id: 8,
    styleTag: 'CHROMATIC FUSION',
    banglaTag: 'মিশ্রণ',
    title: 'SPECTRAL DRIFT // ANAMORPHIC',
    banglaSubtitle: 'তরঙ্গ',
    cadenceMode: 'HYPNOTIC FLOW',
    subtitle: 'তরঙ্গ // HYPNOTIC FLOW',
    tag: 'CHROMATIC FUSION',
    widget: 'silicon',
    backgroundImage: '/assets/aistudio/image_a4619b66.png',
    imageAlt: 'Spectral Drift dual-tone cyan and molten gold anamorphic study',
    aspectRatio: '2.39:1',
    body: 'Dual-tone cyan and molten gold color separation gliding across slow-motion 120fps frames.'
  },
  {
    id: 9,
    styleTag: 'MOMENTUM LOCK',
    banglaTag: 'গতি',
    title: 'HYPER CADENCE // RAWX CUT',
    banglaSubtitle: 'বেগ',
    cadenceMode: 'INDUSTRIAL DRIVE',
    subtitle: 'বেগ // INDUSTRIAL DRIVE',
    tag: 'MOMENTUM LOCK',
    widget: 'xml',
    backgroundImage: '/assets/aistudio/image_b3398899.png',
    imageAlt: 'Hyper Cadence beat-locked jump cuts montage',
    aspectRatio: '2.39:1',
    body: 'Beat-locked jump cuts engineered for maximum visual retention and relentless forward momentum.'
  },
  {
    id: 10,
    styleTag: 'TOTAL ECLIPSE',
    banglaTag: 'গ্রহণ',
    title: 'MASTER ARCHIVE // SOVEREIGN',
    banglaSubtitle: 'সমাপ্তি',
    cadenceMode: 'ZERO-CLOUD CORE',
    subtitle: 'সমাপ্তি // ZERO-CLOUD CORE',
    tag: 'TOTAL ECLIPSE',
    widget: 'launch',
    backgroundImage: '/assets/aistudio/image_c26145a7.png',
    imageAlt: 'Master Archive Sovereign 4K frame integrity lock',
    aspectRatio: '2.39:1',
    body: 'Final master lock with full-resolution 4K frame integrity and direct multi-platform interchange readiness.'
  }
];
