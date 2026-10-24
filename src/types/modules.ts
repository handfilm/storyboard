/**
 * @file /src/types/modules.ts
 * @description Centralized Studio Module Registry & Overflow Settings Module Specifications.
 * Re-registers critical rapid-iteration modules (Compile Engine, Rap Music & Audio Sync,
 * Director Inspector, Global Settings, Cache Manager).
 */

import { StudioModuleId } from '../components/StudioNavRail';

export type { StudioModuleId };

export type RestoredModuleId = 
  | 'COMPILE'
  | 'RAP_SYNC'
  | 'SETTINGS'
  | 'INSPECTOR'
  | 'CACHE_MANAGER';

export interface OverflowMenuItem {
  id: RestoredModuleId;
  code: string;
  label: string;
  description: string;
  shortcut?: string;
  badge?: string;
  tagline: string;
  accentColor: string;
}

export const RESTORED_OVERFLOW_MODULES: ReadonlyArray<OverflowMenuItem> = [
  {
    id: 'COMPILE',
    code: '[ ⚡ COMPILE ENGINE ]',
    label: 'COMPILE ENGINE',
    description: 'Sequence compilation module — batch-slices and merges shots into a master reel.',
    shortcut: '⌘B',
    badge: 'CORE REEL',
    tagline: 'Multi-Clip Master Assembler',
    accentColor: '#F5A623'
  },
  {
    id: 'RAP_SYNC',
    code: '[ 🎵 RAP MUSIC & AUDIO SYNC ]',
    label: 'RAP MUSIC & AUDIO SYNC',
    description: 'Rap transient chopper, 140 BPM beat snapping, 808 sub-bass lock, and audio-reactive visualization.',
    shortcut: 'M',
    badge: 'AUDIO DSP',
    tagline: 'Staccato Transient Slicer',
    accentColor: '#FACC15'
  },
  {
    id: 'SETTINGS',
    code: '[ ⚙️ GLOBAL SETTINGS ]',
    label: 'GLOBAL SETTINGS',
    description: 'Master studio preferences, UI scaling, rendering bitrates, and hardware codec flags.',
    shortcut: '⌘,',
    badge: 'PREFS',
    tagline: 'Engine & Workspace Config',
    accentColor: '#38BDF8'
  },
  {
    id: 'INSPECTOR',
    code: '[ 🛠 DIRECTOR INSPECTOR ]',
    label: 'DIRECTOR INSPECTOR',
    description: 'Advanced telemetry, WebCodecs buffer status, optical lens data, and real-time debug tools.',
    shortcut: 'E',
    badge: 'TELEMETRY',
    tagline: 'Sub-Frame Pipeline HUD',
    accentColor: '#A855F7'
  },
  {
    id: 'CACHE_MANAGER',
    code: '[ 🗃️ CACHE MANAGER ]',
    label: 'CACHE MANAGER',
    description: 'Inspect storage consumption and purge temporary proxy canvas bitmaps from IndexedDB.',
    shortcut: '⌘⇧⌫',
    badge: 'INDEXEDDB',
    tagline: 'Zero-Waste Storage Purge',
    accentColor: '#EF4444'
  }
];
