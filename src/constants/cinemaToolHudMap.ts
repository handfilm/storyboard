export type CinemaHudAccent = 'amber' | 'cyan' | 'crimson' | 'emerald';

export interface CinemaHudDefinition {
  title: string;
  en: string;
  bn: string;
  shortcut?: string;
  accent?: CinemaHudAccent;
}

export const CINEMA_HUD_MAP: Record<string, CinemaHudDefinition> = {
  // Global Navigation & Workspaces
  'nav-stage': {
    title: 'MASTER STAGE',
    en: 'Main cinema viewport with real-time framing, optics, and live title overlays.',
    bn: 'মূল প্রিভিউ স্ক্রিনে ফ্রেম, টাইটেল এবং লেন্স ইফেক্ট সরাসরি দেখতে এটি চাপুন।',
    shortcut: '1',
    accent: 'amber',
  },
  'nav-reels': {
    title: '12S HYPER-REEL DECK',
    en: 'Auto-packs fast 12-second vertical reels with speed ramps and beat cuts.',
    bn: 'স্বয়ংক্রিয়ভাবে ১২ সেকেন্ডের দ্রুত রিলস, স্পিড র‍্যাম্প ও বিট-কাট বানাতে এটি চাপুন।',
    shortcut: '2',
    accent: 'crimson',
  },
  'nav-scrub': {
    title: 'SCRUB & TIMELINE',
    en: 'Precision frame-by-frame timeline scrubbing and multi-shot sequencing.',
    bn: 'ফ্রেম-বাই-ফ্রেম টাইমলাইন স্ক্রাব ও শটগুলোর সময় ঠিক করতে এখানে যান।',
    shortcut: '3',
    accent: 'cyan',
  },
  'nav-multicam': {
    title: 'MULTI-CAM SYNCHRONIZER',
    en: 'Compare multiple camera angles side-by-side and hot-swap active takes.',
    bn: 'একসাথে একাধিক ক্যামেরা অ্যাঙ্গেল দেখে সেরা টেক বাছাই করতে এটি ব্যবহার করুন।',
    shortcut: '4',
    accent: 'cyan',
  },
  'nav-monitor': {
    title: 'COLOR & WAVEFORM MONITOR',
    en: 'Broadcast scopes, luma waveform, RGB parade, and exposure verification.',
    bn: 'ভিডিওর কালার, এক্সপোজার ও ওয়েভফর্ম স্কোপ নির্ভুলভাবে মাপতে এটি ওপেন করুন।',
    shortcut: '5',
    accent: 'emerald',
  },
  'nav-home': {
    title: 'STUDIO HOME LOBBY',
    en: 'Return to the HandFilm overview decks, master shots, and project hub.',
    bn: 'মূল হোম পেজ, প্রজেক্ট ডেক ও মাস্টার শট গ্যালারিতে ফিরতে এটি চাপুন।',
    accent: 'amber',
  },
  'guide-mode': {
    title: 'INTERACTIVE GUIDE MODE',
    en: 'Tap any button while Guide Mode is active to inspect its Bangla & English HUD.',
    bn: 'এটি অন করে যেকোনো বাটনে চাপলেই কাজ না ঘটিয়ে তার ব্যবহারবিধি বাংলায় দেখতে পাবেন।',
    shortcut: '?',
    accent: 'cyan',
  },

  // Sidebar Tools
  'rail-story': {
    title: 'STORY & SEQUENCE',
    en: 'Organize scene beat cards, add new shots, and edit shot order.',
    bn: 'শট কার্ড ড্র্যাগ করে সিকোয়েন্স সাজান বা নতুন সিন যোগ করতে + চাপুন।',
    shortcut: 'G',
    accent: 'amber',
  },
  'rail-media': {
    title: 'MEDIA VAULT BIN',
    en: 'Import video clips, photos, and frame sequences directly into your project.',
    bn: 'ফোন বা পিসি থেকে ভিডিও এবং ছবি আপলোড করে টাইমলাইনে ড্রপ করুন।',
    shortcut: 'M',
    accent: 'cyan',
  },
  'rail-text': {
    title: 'TITLE FX ENGINE',
    en: 'Kinetic typography, 9-zone placement grid, safe-guard clamping, and scrims.',
    bn: '৩×৩ গ্রিডে টাইটেল বসান, সেফ গার্ড লক করুন এবং স্টাইল পরিবর্তন করুন।',
    shortcut: 'T',
    accent: 'amber',
  },
  'rail-audio': {
    title: 'PRO AUDIO STUDIO',
    en: '3-bus audio mixer, foley SFX generator, voiceover recorder, and vocal remover.',
    bn: 'ভয়েস ও মিউজিক আলাদা করতে STEM SPLIT চাপুন অথবা ফোলি সাউন্ড যোগ করুন।',
    shortcut: 'A',
    accent: 'emerald',
  },
  'rail-cut': {
    title: 'CUT & PREVIS EDITOR',
    en: 'Split clips on playhead, snap to beats, and configure optical transitions.',
    bn: 'প্লেহেড যেকোনো ফ্রেমে রেখে SPLIT চাপুন অথবা BEAT CUT দিয়ে অটো কাটুন।',
    shortcut: 'C',
    accent: 'crimson',
  },
  'rail-crop': {
    title: '9:16 AUTO SMART-CROP',
    en: 'Auto-reframe widescreen footage into vertical 9:16 with subject lock.',
    bn: 'ওয়াইড ভিডিওকে ৯:১৬ রিলস বা শর্টস ফ্রেমে অটো ক্রপ ও ফোকাস করতে চাপুন।',
    accent: 'cyan',
  },
  'rail-light': {
    title: '3D CINEMA LIGHT RIG',
    en: 'Drag KEY, RIM, and FILL orbs to relight portraits and apply atmospheric gels.',
    bn: 'স্ক্রিনের KEY, RIM ও FILL বলগুলো ড্র্যাগ করে সিনেমার আলো সেট করুন।',
    shortcut: 'L',
    accent: 'amber',
  },
  'rail-fx': {
    title: 'PRO FX & OPTICS LAB',
    en: '35mm halation bloom, film grain, 3D LUTs, speed ramps, and optical flow.',
    bn: 'হ্যালিয়েশন, ফিল্ম গ্রেইন, ৩ডি লাট এবং স্পিড র‍্যাম্প প্রয়োগ করতে ওপেন করুন।',
    shortcut: 'F',
    accent: 'crimson',
  },
  'rail-bridge': {
    title: 'EXPORT & NLE BRIDGE',
    en: 'Render MP4/WebM or export Premiere XML, CapCut JSON, and FCPXML packages.',
    bn: '4K ভিডিও রেন্ডার করুন অথবা প্রিমিয়ার, ক্যাপকাট ও ডাভিঞ্চিতে প্রজেক্ট এক্সপোর্ট করুন।',
    shortcut: 'E',
    accent: 'emerald',
  },
  'rail-system': {
    title: 'SYSTEM & VAULT SETTINGS',
    en: 'Hardware acceleration telemetry, local vault backups, and workspace prefs.',
    bn: 'সেটিংস, প্রজেক্ট ব্যাকআপ, ক্লাউড সিঙ্ক ও শর্টকাট কন্ট্রোল করতে চাপুন।',
    accent: 'cyan',
  },

  // Reels & Speed Tools
  'hyper-reel': {
    title: '12S HYPER-REEL AUTO-PACKER',
    en: 'Packs loaded clips into an energetic 12-second montage locked to tempo.',
    bn: 'ক্লিপগুলো বাছাই করে এক ক্লিকেই ১২ সেকেন্ডের গতিশীল রিলস তৈরি করুন।',
    accent: 'crimson',
  },
  'hero-ramp': {
    title: 'HERO VELOCITY RAMP',
    en: 'Applies 3.6x fast-in -> 0.45x slow-mo hero reveal -> 2.8x whip-out curve.',
    bn: 'ক্লিপ সিলেক্ট করে HERO বাটনে চাপলেই স্মুথ স্লো-মোশন ও স্পিড বুস্ট হবে।',
    accent: 'amber',
  },
  'safe-guard': {
    title: '9-ZONE SAFE-GUARD MATRIX',
    en: 'Clamps titles inside broadcast/Reels safe zones away from UI obstructions.',
    bn: 'টাইটেল যেন রিলস বা শর্টসের আইকনে ঢাকা না পড়ে সেজন্য সেফ-গার্ড লক করুন।',
    accent: 'emerald',
  },
  'halation': {
    title: '35MM HALATION BLOOM',
    en: 'Adds warm photochemical highlight glow reminiscent of Kodak 500T film stock.',
    bn: 'সিনেমার ফিল্মের মতো উজ্জ্বল অংশে নরম লাল-কমলা আভা যোগ করতে অন করুন।',
    accent: 'crimson',
  },
  'scrim': {
    title: 'DARK CONTRAST SCRIM',
    en: 'Places a subtle dark backdrop gradient behind titles for crisp legibility.',
    bn: 'টাইটেলের নিচে হালকা কালো ছায়া যোগ করে লেখা আরও স্পষ্ট ও পড়ার যোগ্য করুন।',
    accent: 'amber',
  },
  'stem-split': {
    title: 'AI VOCAL STEM REMOVER',
    en: 'Isolates vocals from backing instrumentals using mid-side phase DSP.',
    bn: 'মিউজিক ও ভয়েস আলাদা করতে STEM SPLIT বাটন চাপুন এবং আলাদা ভলিউম দিন।',
    accent: 'emerald',
  },
  'auto-cap': {
    title: 'AUTO BEAT & WORD CAPTIONS',
    en: 'Generates synchronized kinetic captions snapped to speech & beat markers.',
    bn: 'ভিডিওর কথা বা বিটের তালে তালে স্বয়ংক্রিয় ক্যাপশন তৈরি করতে এটি চাপুন।',
    accent: 'cyan',
  },
  'export-4k': {
    title: '4K MASTER RENDER PIPELINE',
    en: 'Offline deterministic canvas encoder exporting crisp MP4, WebM, or XML.',
    bn: 'সম্পাদনা শেষে সর্বোচ্চ কোয়ালিটির ৪কে এমপি৪ ভিডিও সেভ করতে চাপুন।',
    accent: 'emerald',
  },
};

export function getCinemaHud(id: string, fallback?: Partial<CinemaHudDefinition>): CinemaHudDefinition {
  const found = CINEMA_HUD_MAP[id];
  if (found) {
    return {
      title: fallback?.title || found.title,
      en: fallback?.en || found.en,
      bn: fallback?.bn || found.bn,
      shortcut: fallback?.shortcut || found.shortcut,
      accent: fallback?.accent || found.accent,
    };
  }
  return {
    title: fallback?.title || id.toUpperCase().replace(/[-_]+/g, ' '),
    en: fallback?.en || 'Activates this studio control.',
    bn: fallback?.bn || 'এই টুলটি চালু বা পরিবর্তন করতে বাটনে চাপুন।',
    shortcut: fallback?.shortcut,
    accent: fallback?.accent || 'amber',
  };
}
