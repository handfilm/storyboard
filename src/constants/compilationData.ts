/**
 * @file /src/constants/compilationData.ts
 * @description Master compilation presets for the [ 🌪️ DOPAMINE ENGINE ].
 * High-velocity, rhythmic viral motion templates tailored for rapid video loops,
 * aggressive typography zooms, anamorphic stretch, and chromatic glitch releases.
 */

export interface CompilationPreset {
  id: string;
  name: string;
  hook: string;
  subText: string;
  glitch: number;       // 0 - 100 glitch intensity
  speed: number;        // motion speed multiplier (e.g. 0.8 to 2.5)
  strobeRate?: number;  // strobe flash interval in ms (default 60ms)
  accentColor?: string;
  category?: 'viral' | 'macro' | 'kinetic' | 'editorial';
  description?: string;
}

export const COMPILATION_PRESETS: CompilationPreset[] = [
  { 
    id: 'viral_loop_1', 
    name: 'THE HYPNOTIC TURN', 
    hook: 'PURE RHYTHM', 
    subText: 'Visual Physics at Work.', 
    glitch: 80, 
    speed: 1.5,
    strobeRate: 60,
    accentColor: '#FF2B2B',
    category: 'viral',
    description: 'High-frequency strobe flash into hypersonic forward anamorphic snap.'
  },
  { 
    id: 'viral_loop_2', 
    name: 'MACRO OBSESSION', 
    hook: 'CLOSER', 
    subText: 'Every detail amplified.', 
    glitch: 40, 
    speed: 0.8,
    strobeRate: 90,
    accentColor: '#F5A623',
    category: 'macro',
    description: 'Deliberate, heavy optical zoom with tactile microscopic chromatic split.'
  },
  { 
    id: 'viral_loop_3', 
    name: 'THE 360 AURA', 
    hook: 'UNBROKEN', 
    subText: 'A continuous loop of perfection.', 
    glitch: 100, 
    speed: 2.0,
    strobeRate: 40,
    accentColor: '#A855F7',
    category: 'kinetic',
    description: 'Maximum velocity kinetic explosion with full-channel RGB aberration.'
  },
  {
    id: 'viral_loop_4',
    name: 'SUB-BASS TRANSIENT',
    hook: 'FREQUENCY DROP',
    subText: 'Zero latency kinetic displacement.',
    glitch: 65,
    speed: 1.8,
    strobeRate: 50,
    accentColor: '#06B6D4',
    category: 'viral',
    description: 'Bass-frequency driven strobe pulse paired with aggressive horizontal stretch.'
  },
  {
    id: 'viral_loop_5',
    name: 'CHOPPER VELOCITY',
    hook: 'HARD CUT',
    subText: 'Split-second optical impact.',
    glitch: 90,
    speed: 2.2,
    strobeRate: 35,
    accentColor: '#10B981',
    category: 'editorial',
    description: 'Staccato rhythm typography designed for sub-12-second micro cuts.'
  }
];

export const DEFAULT_COMPILATION_PRESET = COMPILATION_PRESETS[0];

export const getCompilationPresetById = (id: string): CompilationPreset => {
  return COMPILATION_PRESETS.find((p) => p.id === id) || DEFAULT_COMPILATION_PRESET;
};
