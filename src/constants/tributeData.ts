/**
 * @file /src/constants/tributeData.ts
 * @description Master Tribute Profiles Registry & Motion Typography Data Structure for HANDFILM.
 * 
 * Strict Standards:
 * 1. ALL CAPS performer names with iconic monikers.
 * 2. Strictly max-20-word biographical description (Country of birth, Race, Awards, Achievements).
 * 3. Max-10-word criticNote appearing immediately prior to director signature in 5-phase motion.
 * 4. Distinctive kinetic animation presets mapped per profile.
 */

export type TributeAnimationType =
  | 'cinematic_breath'
  | 'kinetic_overshoot'
  | 'editorial_mask'
  | 'brutal_snap'
  | 'z_axis_tilt'
  | 'neon_flicker'
  | 'fluid_blur'
  | 'anamorphic_stretch'
  | 'strobe_stutter';

export interface TributeProfile {
  id: string;
  hook: string;
  performer: string;
  description: string;
  captions: [string, string] | string[];
  criticNote: string;
  signature: string;
  defaultAnimation: TributeAnimationType | string;
}

export const TRIBUTE_PROFILES: ReadonlyArray<TributeProfile> = [
  {
    id: 'rani_mukherjee',
    hook: 'BENGALI AURA',
    performer: 'RANI MUKHERJEE // The Bengal Tigress',
    description: 'Born in India, Bengali. 7-time Filmfare Award winner. Bollywood’s most versatile actress with iconic voice and expressive eyes.',
    captions: ['চোখে মায়া, ফ্রেমে আগুনের ভল্যুম।', 'Unmatched curves and raw cinematic royalty.'],
    criticNote: 'A powerhouse of emotion and unmatched screen presence.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'cinematic_breath'
  },
  {
    id: 'shakira',
    hook: 'KINETIC FORCE',
    performer: 'SHAKIRA // The Latin Phenomenon',
    description: 'Born in Colombia, Lebanese-Colombian. 3-time Grammy winner. Global pop icon and the undisputed Queen of Latin Music.',
    captions: ['Hip movements that defy visual gravity.', 'পাওয়ারফুল অরা আর পারফেক্ট স্কাল্পটেড কার্ভস।'],
    criticNote: 'Kinetic energy incarnate with hypnotic global appeal.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'kinetic_overshoot'
  },
  {
    id: 'allie_haze',
    hook: 'HISPANIC FIRE',
    performer: 'ALLIE HAZE // The Duality Queen',
    description: 'Born in USA, Hispanic-American. AVN Award winner. Transitioned from adult industry top ranks to successful YouTube creator and mother.',
    captions: ['A devilish wink, an angelic smile.', 'হার্ডকোর ডমিনেশন থেকে রিয়েল লাইফ সারভাইভার।'],
    criticNote: 'Master of duality; innocent smile masking fierce dominance.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'editorial_mask'
  },
  {
    id: 'remy_lacroix',
    hook: 'PURE GRAVITY',
    performer: 'REMY LACROIX // The Portuguese Siren',
    description: 'Born in USA, Portuguese descent. Multi-AVN Award winner. Renowned for incredible athletic flexibility and genuinely embracing adult entertainment.',
    captions: ['Mesmerizing glutes and that killer smile.', 'স্ক্রিন কাঁপানো পারফেক্ট আর্কিটেকচারাল বডি ফর্ম।'],
    criticNote: 'Defies physics with gravity-bending curves and authentic joy.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'brutal_snap'
  },
  {
    id: 'tuba_buyukustun',
    hook: 'TURKISH MAJESTY',
    performer: 'TUBA BÜYÜKÜSTÜN // The Master of Arts',
    description: 'Born in Turkey, Turkish. Emmy-nominated superstar. Represents Turkish cinema globally, blending master-level arts with commanding grace.',
    captions: ['Sharp unconventional curves and commanding height.', 'যে সৌন্দর্য স্ক্রিনে শুধু রেসপেক্ট ডিমান্ড করে।'],
    criticNote: 'Demands absolute respect through unconventional, striking aesthetic architecture.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'z_axis_tilt'
  },
  {
    id: 'kareena_kapoor',
    hook: 'ROYAL ARROGANCE',
    performer: 'KAREENA KAPOOR // The Bollywood Aristocrat',
    description: 'Born in India, Punjabi-Indian. 6-time Filmfare winner. Bollywood royalty known for scene-stealing performances and unapologetic confidence.',
    captions: ['Iconic pout and unapologetic raw attitude.', 'বোল্ড অ্যাটিটিউড আর কার্ভসের ডেডলি মিক্স।'],
    criticNote: 'Pure royal arrogance blended with devastating visual charm.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'brutal_snap'
  },
  {
    id: 'beyonce',
    hook: 'DIVINE POWER',
    performer: 'BEYONCÉ KNOWLES // The Creole Goddess',
    description: 'Born in USA, African-American/Creole. 32-time Grammy winner. The ultimate standard for vocal supremacy and mesmerizing stage domination.',
    captions: ['Hypnotic thick curves and supreme vocals.', 'স্টেজে উঠলেই পারফেক্ট ভিজ্যুয়াল এবং ডমিনেশন।'],
    criticNote: 'The ultimate goddess of sonic and visual perfection.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'neon_flicker'
  },
  {
    id: 'natalie_imbruglia',
    hook: 'TIMELESS GAZE',
    performer: 'NATALIE IMBRUGLIA // The Australian Muse',
    description: 'Born in Australia, Italian-Australian. MTV and Billboard winner. Global 90s icon defining raw, natural beauty and timeless pop-rock.',
    captions: ['Those striking eyes freeze time itself.', 'ন্যাচারাল বিউটির সবচেয়ে পারফেক্ট আর পিওর এক্সাম্পল।'],
    criticNote: 'A timeless gaze that shatters the concept of aging.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'fluid_blur'
  },
  {
    id: 'deepika_padukone',
    hook: 'ATHLETIC GRACE',
    performer: 'DEEPIKA PADUKONE // The Indian Statuesque',
    description: 'Born in Denmark, Konkani-Indian. 3-time Filmfare winner. Global ambassador, balancing athletic grace with profound international cinematic impact.',
    captions: ['Sculpted height and endless perfect curves.', 'ডিম্পল আর চোখের এক্সপ্রেশনে গ্লোবাল ইমপ্যাক্ট।'],
    criticNote: 'Statuesque perfection dominating every frame with absolute elegance.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'anamorphic_stretch'
  },
  {
    id: 'aishwarya_rai',
    hook: 'ETHEREAL SYMMETRY',
    performer: 'AISHWARYA RAI // The Global Icon',
    description: 'Born in India, Tuluva-Indian. Miss World 1994, Padma Shri recipient. Universally celebrated as the most beautiful woman globally.',
    captions: ['Hypnotic eyes framing absolute visual perfection.', 'পৃথিবীর সবচেয়ে নিখুঁত ফেস আর অরা।'],
    criticNote: 'Ethereal symmetry that redefines global standards of beauty.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'cinematic_breath'
  },
  {
    id: 'rihanna',
    hook: 'UNAPOLOGETIC AURA',
    performer: 'RIHANNA // The Barbadian Rebel',
    description: 'Born in Barbados, Afro-Bajan. 9-time Grammy winner. Billionaire fashion mogul rewriting the rules of music and cosmetics.',
    captions: ['Iconic lips and fierce, flawless curves.', 'হাই-ফ্যাশন আর ব্যাডঅ্যাস অ্যাটিটিউডের পারফেক্ট কম্বিনেশন।'],
    criticNote: 'Unapologetic bad-ass aura mixed with flawless high-fashion curves.',
    signature: 'RAKIB HIMON // HANDFILM',
    defaultAnimation: 'strobe_stutter'
  }
];

export const DEFAULT_TRIBUTE_PROFILE = TRIBUTE_PROFILES[0];

/**
 * Retrieve a tribute profile by its unique ID
 */
export function getTributeProfileById(id: string): TributeProfile | undefined {
  return TRIBUTE_PROFILES.find(p => p.id.toLowerCase() === id.toLowerCase());
}

/**
 * Validate that a tribute profile adheres to the HANDFILM motion systems guidelines:
 * - Performer name in ALL CAPS
 * - Description strictly <= 20 words
 * - Critic note strictly <= 10 words
 */
export function validateTributeProfile(profile: TributeProfile): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const descWordCount = profile.description.trim().split(/\s+/).filter(Boolean).length;
  if (descWordCount > 20) {
    errors.push(`Description exceeds 20 words (${descWordCount} words): "${profile.description}"`);
  }

  const criticWordCount = profile.criticNote.trim().split(/\s+/).filter(Boolean).length;
  if (criticWordCount > 10) {
    errors.push(`Critic Note exceeds 10 words (${criticWordCount} words): "${profile.criticNote}"`);
  }

  // Check that the performer name portion before '//' is ALL CAPS (allowing accents/letters)
  const performerMainName = profile.performer.split('//')[0].trim();
  if (performerMainName !== performerMainName.toUpperCase()) {
    errors.push(`Performer name must be ALL CAPS: "${performerMainName}"`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
