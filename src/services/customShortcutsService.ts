/**
 * @file /src/services/customShortcutsService.ts
 * @description Centralized Keyboard Shortcut Registry & Rebinding Service for RAWx / HANDFILM.
 * Supports persistent custom key bindings, conflict detection, real-time sync across components,
 * and categories: Playback, Navigation, Visual FX, Trimmer, Export, and System.
 */

export type ShortcutCategory = 'playback' | 'navigation' | 'vfx' | 'trimmer' | 'export' | 'system';

export interface ShortcutDefinition {
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  defaultKey: string;
  currentKey: string;
  scope: string;
  tag?: string;
  testCodes?: string[];
}

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  playback: 'Playback & Transport',
  navigation: 'Navigation & Cut Points',
  vfx: 'Visual FX & Optics',
  trimmer: 'Trimmer & Razor',
  export: 'Export & Stills',
  system: 'System & Command Palette'
};

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // --- Playback & Transport ---
  {
    id: 'playback_toggle',
    name: 'Loop Playback / Audition',
    description: 'Toggle instantaneous loop playback and sequence audition',
    category: 'playback',
    defaultKey: 'Space',
    currentKey: 'Space',
    scope: 'UNIVERSAL',
    tag: 'ESSENTIAL',
    testCodes: ['Space']
  },
  {
    id: 'shuttle_rev',
    name: 'Reverse Shuttle (2x)',
    description: 'Smooth reverse playback shuttle / step backward in deck',
    category: 'playback',
    defaultKey: 'J',
    currentKey: 'J',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyJ', 'j', 'J']
  },
  {
    id: 'shuttle_stop',
    name: 'Stop / Pause Shuttle',
    description: 'Instantly halt playback transport deck and park playhead',
    category: 'playback',
    defaultKey: 'K',
    currentKey: 'K',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyK', 'k', 'K']
  },
  {
    id: 'shuttle_fwd',
    name: 'Forward Shuttle (2x)',
    description: 'Smooth forward playback shuttle or accelerate playback rate',
    category: 'playback',
    defaultKey: 'L',
    currentKey: 'L',
    scope: 'NLE DECK',
    tag: 'PRO TRANSPORT',
    testCodes: ['KeyL', 'l', 'L']
  },
  {
    id: 'frame_step_backward',
    name: 'Step Backward (-1 Frame)',
    description: 'Nudge playhead exactly -1 frame (41.66ms @ 24fps)',
    category: 'playback',
    defaultKey: ',',
    currentKey: ',',
    scope: 'NLE ENGINE',
    tag: 'PRECISION',
    testCodes: [',', 'Comma']
  },
  {
    id: 'frame_step_forward',
    name: 'Step Forward (+1 Frame)',
    description: 'Nudge playhead exactly +1 frame (41.66ms @ 24fps)',
    category: 'playback',
    defaultKey: '.',
    currentKey: '.',
    scope: 'NLE ENGINE',
    tag: 'PRECISION',
    testCodes: ['.', 'Period']
  },
  {
    id: 'seek_first_frame',
    name: 'First Frame (Head)',
    description: 'Instantly seek playhead to Head (00:00:00:00)',
    category: 'playback',
    defaultKey: 'Home',
    currentKey: 'Home',
    scope: 'GLOBAL',
    testCodes: ['Home']
  },
  {
    id: 'seek_last_frame',
    name: 'Last Frame (Tail)',
    description: 'Instantly seek playhead to Tail of active sequence',
    category: 'playback',
    defaultKey: 'End',
    currentKey: 'End',
    scope: 'GLOBAL',
    testCodes: ['End']
  },

  // --- Navigation & Cut Points ---
  {
    id: 'nav_contact_sheet_grid',
    name: 'Contact Sheet Grid (Modal 1)',
    description: 'Instantly toggle Modal 1: 100-Frame Contact Sheet Grid visibility in the main workspace',
    category: 'navigation',
    defaultKey: 'G',
    currentKey: 'G',
    scope: 'WORKSPACE',
    tag: 'ESSENTIAL',
    testCodes: ['KeyG', 'g', 'G']
  },
  {
    id: 'nav_prev_shot',
    name: 'Previous Shot',
    description: 'Jump backward between storyboard shots or slides',
    category: 'navigation',
    defaultKey: '←',
    currentKey: '←',
    scope: 'STAGE / SOLO',
    tag: 'ESSENTIAL',
    testCodes: ['ArrowLeft']
  },
  {
    id: 'nav_next_shot',
    name: 'Next Shot',
    description: 'Jump forward between storyboard shots or slides',
    category: 'navigation',
    defaultKey: '→',
    currentKey: '→',
    scope: 'STAGE / SOLO',
    tag: 'ESSENTIAL',
    testCodes: ['ArrowRight']
  },
  {
    id: 'nav_10_frame_leap',
    name: '10-Frame Leap',
    description: 'Fast skip 10 frames (~0.4s) forward or backward in timeline',
    category: 'navigation',
    defaultKey: 'Shift + ← / →',
    currentKey: 'Shift + ← / →',
    scope: 'SOLO INSPECTOR',
    testCodes: ['ArrowLeft', 'ArrowRight']
  },
  {
    id: 'nav_prev_cut',
    name: 'Previous Cut Point',
    description: 'Jump playhead to head boundary of previous shot in sequence',
    category: 'navigation',
    defaultKey: '↑',
    currentKey: '↑',
    scope: 'NLE ENGINE',
    tag: 'NAVIGATION',
    testCodes: ['ArrowUp']
  },
  {
    id: 'nav_next_cut',
    name: 'Next Cut Point',
    description: 'Jump playhead to head boundary of next shot in sequence',
    category: 'navigation',
    defaultKey: '↓',
    currentKey: '↓',
    scope: 'NLE ENGINE',
    tag: 'NAVIGATION',
    testCodes: ['ArrowDown']
  },
  {
    id: 'audition_in_out',
    name: 'Audition In / Out Range',
    description: 'Play loop strictly bounded between marked In-point and Out-point markers',
    category: 'navigation',
    defaultKey: 'Shift + Space',
    currentKey: 'Shift + Space',
    scope: 'TRIMMER',
    tag: 'AUDITION',
    testCodes: ['Space']
  },

  // --- Visual FX & Optics ---
  {
    id: 'fx_reframe_tool',
    name: 'Pan & Tilt Reframe Tool',
    description: 'Toggle drag-to-reframe tool for anamorphic optical plates',
    category: 'vfx',
    defaultKey: 'P',
    currentKey: 'P',
    scope: 'CAMERA',
    tag: 'OPTICS',
    testCodes: ['KeyP', 'p', 'P']
  },
  {
    id: 'fx_framing_guides',
    name: 'Director Framing Guides',
    description: 'Toggle Rule-of-Thirds, Crosshairs, Center Spot, and Golden Ratio lines',
    category: 'vfx',
    defaultKey: 'C',
    currentKey: 'C',
    scope: 'STAGE',
    tag: 'GUIDES',
    testCodes: ['KeyC', 'c', 'C']
  },
  {
    id: 'fx_titles_cycle',
    name: 'Bilingual Cinematic Titles',
    description: 'Cycle title overlays: Bilingual Gold Bloom → Subtitles Only → Off',
    category: 'vfx',
    defaultKey: 'T',
    currentKey: 'T',
    scope: 'TYPOGRAPHY',
    tag: 'TITLES',
    testCodes: ['KeyT', 't', 'T']
  },
  {
    id: 'fx_liquify_mesh',
    name: 'Canvas Liquify & Mesh Warp',
    description: 'Launch HTML5 canvas mesh warp, lens deformation & distortion studio',
    category: 'vfx',
    defaultKey: 'W',
    currentKey: 'W',
    scope: 'CANVAS',
    tag: 'FX',
    testCodes: ['KeyW', 'w', 'W']
  },
  {
    id: 'fx_optical_shaders',
    name: 'Optical Shaders & 35mm Grain',
    description: 'Cycle real-time GL shaders: 35mm Film Grain, Anamorphic Bloom, Halation',
    category: 'vfx',
    defaultKey: 'X',
    currentKey: 'X',
    scope: 'SHADERS',
    testCodes: ['KeyX', 'x', 'X']
  },
  {
    id: 'fx_matrix_popover',
    name: 'Components Visibility Matrix',
    description: 'Open quick popover to toggle individual HUD layers and indicators',
    category: 'vfx',
    defaultKey: 'V',
    currentKey: 'V',
    scope: 'CHROME',
    tag: 'HUD',
    testCodes: ['KeyV', 'v', 'V']
  },

  // --- Trimmer & Razor ---
  {
    id: 'trim_in_point',
    name: 'Mark Subclip In-Point',
    description: 'Set selection start boundary for precision trimming and looping',
    category: 'trimmer',
    defaultKey: 'I',
    currentKey: 'I',
    scope: 'TRIMMER',
    tag: 'EDITING',
    testCodes: ['KeyI', 'i', 'I']
  },
  {
    id: 'trim_out_point',
    name: 'Mark Subclip Out-Point',
    description: 'Set selection end boundary for subclip extraction',
    category: 'trimmer',
    defaultKey: 'O',
    currentKey: 'O',
    scope: 'TRIMMER',
    tag: 'EDITING',
    testCodes: ['KeyO', 'o', 'O']
  },
  {
    id: 'trim_clear_markers',
    name: 'Clear In / Out Markers',
    description: 'Reset trimmed range back to full sequence duration',
    category: 'trimmer',
    defaultKey: 'Alt + X',
    currentKey: 'Alt + X',
    scope: 'TRIMMER',
    testCodes: ['KeyX', 'x', 'X']
  },
  {
    id: 'trim_razor_split',
    name: 'Razor Split Clip',
    description: 'Perform razor cut at playhead position in Cut Studio timeline',
    category: 'trimmer',
    defaultKey: 'S',
    currentKey: 'S',
    scope: 'CUT STUDIO',
    tag: 'EDITING',
    testCodes: ['KeyS', 's', 'S']
  },
  {
    id: 'trim_delete_clip',
    name: 'Delete Selected Clip',
    description: 'Remove active clip from multi-track timeline',
    category: 'trimmer',
    defaultKey: 'Delete',
    currentKey: 'Delete',
    scope: 'CUT STUDIO',
    testCodes: ['Delete', 'Backspace']
  },

  // --- Export & Stills ---
  {
    id: 'export_mp4_range',
    name: 'Export Custom MP4 Range',
    description: 'Trigger client-side WebCodecs hardware accelerated video muxer',
    category: 'export',
    defaultKey: 'Shift + E',
    currentKey: 'Shift + E',
    scope: 'EXPORT',
    tag: 'EXPORT',
    testCodes: ['KeyE', 'e', 'E']
  },
  {
    id: 'export_directors_cut',
    name: "Director's Cut Bundle (ZIP)",
    description: 'Package shot list CSV, Fountain screenplay, and master JSON into ZIP archive',
    category: 'export',
    defaultKey: 'Ctrl + Shift + D',
    currentKey: 'Ctrl + Shift + D',
    scope: 'EXPORT',
    tag: 'EXPORT',
    testCodes: ['KeyD', 'd', 'D']
  },
  {
    id: 'capture_cinema_still',
    name: 'Capture 4K Cinema Still (PNG)',
    description: 'Save uncompressed color-accurate PNG screenshot of current frame',
    category: 'export',
    defaultKey: 'Shift + S',
    currentKey: 'Shift + S',
    scope: 'STAGE',
    tag: 'CAPTURE',
    testCodes: ['KeyS', 's', 'S']
  },

  // --- System & Command Palette ---
  {
    id: 'cmd_palette',
    name: 'Studio Command Palette',
    description: 'Access any command, filter, layout change, or tool via instant search',
    category: 'system',
    defaultKey: 'Ctrl + K',
    currentKey: 'Ctrl + K',
    scope: 'GLOBAL',
    tag: 'SYSTEM',
    testCodes: ['KeyK', 'k', 'K']
  },
  {
    id: 'shortcuts_cheat_sheet',
    name: 'Keyboard Shortcuts Cheat Sheet',
    description: 'Open or close the interactive categorized keyboard shortcuts reference',
    category: 'system',
    defaultKey: '?',
    currentKey: '?',
    scope: 'GLOBAL',
    tag: 'HELP',
    testCodes: ['Slash', '/', '?']
  },
  {
    id: 'audio_mute_toggle',
    name: 'Toggle Audio Synthesizer / Mute',
    description: 'Mute or activate Web Audio ambient soundscape engine',
    category: 'system',
    defaultKey: 'M',
    currentKey: 'M',
    scope: 'AUDIO',
    testCodes: ['KeyM', 'm', 'M']
  },
  {
    id: 'fullscreen_toggle',
    name: 'Fullscreen Cinema Monitor',
    description: 'Toggle borderless 2.39:1 fullscreen presentation viewport',
    category: 'system',
    defaultKey: 'F',
    currentKey: 'F',
    scope: 'CINEMA',
    tag: 'VIEWPORT',
    testCodes: ['KeyF', 'f', 'F']
  },
  {
    id: 'zen_mode_toggle',
    name: 'Zen Director Mode',
    description: 'Hide all UI controls, sidebars, and panels for clean screening',
    category: 'system',
    defaultKey: 'Z',
    currentKey: 'Z',
    scope: 'VIEWPORT',
    testCodes: ['KeyZ', 'z', 'Z']
  },
  {
    id: 'system_undo',
    name: 'Undo Last Action',
    description: 'Revert last edit, clip reposition, or parameter change',
    category: 'system',
    defaultKey: 'Ctrl + Z',
    currentKey: 'Ctrl + Z',
    scope: 'HISTORY',
    testCodes: ['KeyZ', 'z', 'Z']
  },
  {
    id: 'dismiss_modal',
    name: 'Dismiss Active Modal / Exit Zen',
    description: 'Close active popover, cancel tool selection, or return to Stage',
    category: 'system',
    defaultKey: 'Esc',
    currentKey: 'Esc',
    scope: 'GLOBAL',
    testCodes: ['Escape']
  }
];

const STORAGE_KEY = 'rawx_custom_shortcuts_v1';
const LISTENERS: Array<(shortcuts: ShortcutDefinition[]) => void> = [];

export const customShortcutsService = {
  /**
   * Get all shortcuts with custom user rebindings applied
   */
  getShortcuts(): ShortcutDefinition[] {
    if (typeof window === 'undefined') return [...DEFAULT_SHORTCUTS];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [...DEFAULT_SHORTCUTS];
      const rebindMap: Record<string, string> = JSON.parse(saved);

      return DEFAULT_SHORTCUTS.map((item) => ({
        ...item,
        currentKey: rebindMap[item.id] || item.defaultKey
      }));
    } catch {
      return [...DEFAULT_SHORTCUTS];
    }
  },

  /**
   * Rebind a shortcut to a new key
   */
  rebindShortcut(id: string, newKey: string): { success: boolean; conflictWith?: ShortcutDefinition } {
    const list = this.getShortcuts();
    const target = list.find((s) => s.id === id);
    if (!target) return { success: false };

    // Check for conflict
    const normalizedNew = newKey.trim().toUpperCase();
    const conflict = list.find(
      (s) => s.id !== id && s.currentKey.trim().toUpperCase() === normalizedNew
    );

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const rebindMap: Record<string, string> = saved ? JSON.parse(saved) : {};
      rebindMap[id] = newKey.trim();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rebindMap));
      this.notifyListeners();
      return { success: true, conflictWith: conflict };
    } catch (err) {
      console.error('[customShortcutsService] Failed to save rebind:', err);
      return { success: false };
    }
  },

  /**
   * Reset a specific shortcut to its factory default
   */
  resetShortcut(id: string): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const rebindMap: Record<string, string> = JSON.parse(saved);
      delete rebindMap[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rebindMap));
      this.notifyListeners();
    } catch (err) {
      console.error('[customShortcutsService] Failed to reset shortcut:', err);
    }
  },

  /**
   * Reset all shortcuts to factory defaults
   */
  resetAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notifyListeners();
    } catch (err) {
      console.error('[customShortcutsService] Failed to reset all shortcuts:', err);
    }
  },

  /**
   * Check if a key combination is already assigned to another action
   */
  checkConflict(newKey: string, currentId?: string): ShortcutDefinition | undefined {
    const list = this.getShortcuts();
    const normalized = newKey.trim().toUpperCase();
    return list.find(
      (s) => s.id !== currentId && s.currentKey.trim().toUpperCase() === normalized
    );
  },

  /**
   * Subscribe to shortcut changes
   */
  subscribe(fn: (shortcuts: ShortcutDefinition[]) => void): () => void {
    LISTENERS.push(fn);
    return () => {
      const idx = LISTENERS.indexOf(fn);
      if (idx !== -1) LISTENERS.splice(idx, 1);
    };
  },

  notifyListeners(): void {
    const updated = this.getShortcuts();
    LISTENERS.forEach((fn) => {
      try {
        fn(updated);
      } catch (err) {
        console.warn('Listener error in customShortcutsService', err);
      }
    });
  }
};
