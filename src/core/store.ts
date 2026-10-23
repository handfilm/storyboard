/**
 * RAWx Studio — Master Zustand Store (Zustand + Immer)
 * Public API: useStudioStore
 * Central reactive store for all studio state, actions, and persistence hooks.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { StudioProject, Shot, MediaItem } from './schemas';
import { HistoryManager } from './history';
import { eventBus } from './eventBus';
import { generateInitialFrames } from '../data/frames';

export type StudioModule =
  | 'STORY'
  | 'MEDIA'
  | 'BOARD'
  | 'TEXT'
  | 'EDIT'
  | 'COLOR'
  | 'SOUND'
  | 'PLAYER'
  | 'PREVIS'
  | 'PRODUCTION'
  | 'REVIEW'
  | 'EXPORT'
  | 'LIBRARY'
  | 'AI'
  | 'SETTINGS';

export type BoardSubView = 'grid' | 'row' | 'filmstrip' | 'corkboard' | 'kanban' | 'timeline' | 'outline';

export type WorkspacePreset =
  | 'Director'
  | 'Writer'
  | 'Storyboarder'
  | 'Editor'
  | 'Colorist'
  | 'Sound'
  | 'Producer'
  | 'Review'
  | 'Presenter'
  | 'Minimal';

export interface ComponentVisibility {
  titlesAll: boolean;
  titleBn: boolean;
  titleEn: boolean;
  caption: boolean;
  badge: boolean;
  tagline: boolean;
  hudData: boolean;
  reticles: boolean;
  guides: boolean;
  grain: boolean;
  vignette: boolean;
  bloom: boolean;
  lensBlur: boolean;
  motionBlur: boolean;
}

export type HeroTitlePreset = 'molten-gold' | 'titanium-silver' | 'neon-crimson';

export interface HeroTitleConfig {
  preset: HeroTitlePreset;
  titleSize: number; // 36 to 120 (default 72)
  glowIntensity: number; // 0.0 to 2.0 (default 1.0 = 100%)
  verticalOffset: number; // -150 to 150px (default 0)
  tracking: number; // 0.05 to 0.45em (default 0.15)
  titleOpacity: number; // 0.1 to 1.0 (default 1.0 = 100%)
  showTitles: boolean;
}

export interface StudioState {
  // Project & Content
  project: StudioProject;
  activeShotIndex: number;
  
  // Kinetic Hero Title Typography Engine
  titleConfig: HeroTitleConfig;
  setTitlePreset: (preset: HeroTitlePreset) => void;
  setTitleSize: (size: number) => void;
  setTitleGlowIntensity: (intensity: number) => void;
  setTitleVerticalOffset: (offset: number) => void;
  setTitleTracking: (tracking: number) => void;
  setTitleOpacity: (opacity: number) => void;
  toggleTitles: () => void;
  setTitleConfig: (partial: Partial<HeroTitleConfig>) => void;
  
  // Workspace Layout & Navigation
  activeModule: StudioModule;
  boardView: BoardSubView;
  workspacePreset: WorkspacePreset;
  isProMode: boolean;
  isLeftRailExpanded: boolean;
  isInspectorOpen: boolean;
  isCommandPaletteOpen: boolean;
  isShortcutsOpen: boolean;
  isDiagnosticsOpen: boolean;
  isZenMode: boolean;
  
  // Tools & On-Stage Controls
  isPanToolActive: boolean;
  isLiquifyModalOpen: boolean;
  isGuidesActive: boolean;
  fitMode: 'cover' | 'contain' | 'crop-middle';
  foregroundZoom: number;
  backgroundZoom: number;
  isVertigoLinked: boolean;
  
  // Component Visibility (12/13 items)
  visibility: ComponentVisibility;
  
  // Playback & Timing
  isPlaying: boolean;
  speed: number; // 1-100
  slideTimeSec: number;
  aspectRatio: '2.39:1' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16';
  activeLut: string;
  activeLens: string;
  
  // Audio
  isAudioMuted: boolean;
  audioVolume: number;
  
  // History
  history: HistoryManager<any>;
  saveStatus: 'IDB SYNCED' | 'SAVING...' | 'LOCAL ONLY';

  // Actions
  setActiveShotIndex: (index: number) => void;
  nextShot: () => void;
  prevShot: () => void;
  setActiveModule: (module: StudioModule) => void;
  setBoardView: (view: BoardSubView) => void;
  setWorkspacePreset: (preset: WorkspacePreset) => void;
  toggleProMode: () => void;
  toggleLeftRail: () => void;
  toggleInspector: () => void;
  toggleCommandPalette: () => void;
  toggleShortcuts: () => void;
  toggleDiagnostics: () => void;
  toggleZenMode: () => void;
  togglePanTool: () => void;
  setShotPanY: (shotId: number, panY: number) => void;
  setLiquifyModalOpen: (open: boolean) => void;
  toggleGuides: () => void;
  setFitMode: (mode: 'cover' | 'contain' | 'crop-middle') => void;
  setForegroundZoom: (zoom: number) => void;
  setBackgroundZoom: (zoom: number) => void;
  setVertigoLinked: (linked: boolean) => void;
  resetMultiLayerZoom: () => void;
  setAspectRatio: (ratio: '2.39:1' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16') => void;
  setLut: (lut: string) => void;
  setLens: (lens: string) => void;
  setVisibilityItem: (key: keyof ComponentVisibility, value: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setSlideTimeSec: (time: number) => void;
  toggleAudio: () => void;
  setAudioVolume: (vol: number) => void;
  updateShot: (index: number, partial: Partial<Shot>) => void;
  addMediaItem: (item: MediaItem) => void;
  setProjectTitle: (title: string) => void;
  undo: () => void;
  redo: () => void;
}

const defaultVisibility: ComponentVisibility = {
  titlesAll: true,
  titleBn: true,
  titleEn: true,
  caption: true,
  badge: true,
  tagline: true,
  hudData: true,
  reticles: true,
  guides: false,
  grain: true,
  vignette: true,
  bloom: true,
  lensBlur: true,
  motionBlur: true
};

export function createDefaultStoreShots(): Shot[] {
  const baseFrames = generateInitialFrames();
  return baseFrames.map((bf, i) => ({
    id: i,
    epNumber: bf.epNumber,
    title: bf.title,
    bengaliTitle: bf.bengaliTitle,
    tagline: bf.tagline,
    directorNotes: bf.directorNotes,
    soundCue: bf.soundCue,
    cameraSpec: bf.cameraSpec,
    imageUrl: bf.imageUrl,
    isVideo: Boolean(
      bf.isVideo ||
      (bf.imageUrl && (
        bf.imageUrl.startsWith('data:video') ||
        /\.(mp4|webm|mov|ogg|m4v|mkv)($|\?)/i.test(bf.imageUrl)
      ))
    ),
    panY: 50,
    colorAccent: bf.colorAccent,
    hoverStyle: bf.hoverStyle,
    lutFilter: bf.lutFilter,
    aspectRatio: '16:9',
    adjustments: {
      ...bf.adjustments,
      halations: 0,
      anamorphicStreak: 0
    },
    durationSeconds: 4.0,
    shotType: 'MS',
    status: 'planned',
    tags: bf.tags,
    activeLens: '50mm f/1.4 Human Eye',
    dof: '1.8cm',
    updatedAt: Date.now()
  }));
}

export const useStudioStore = create<StudioState>()(
  immer((set, get) => ({
    project: {
      schemaVersion: 1,
      id: 'vault-100',
      title: 'RAWx // Master Anthology Engine 100',
      director: 'RAKIB HIMON',
      nodeLocation: 'DHAKA_01',
      aspectRatio: '16:9',
      activeFilter: 'cinematic',
      activeLens: '50mm f/1.4 Human Eye',
      playbackSpeed: 50,
      shots: createDefaultStoreShots(),
      mediaPool: [],
      scriptText: '',
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      version: '5.0.0'
    },
    activeShotIndex: 0,
    activeModule: 'PLAYER',
    boardView: 'grid',
    workspacePreset: 'Director',
    isProMode: false,
    isLeftRailExpanded: false,
    isInspectorOpen: false,
    isCommandPaletteOpen: false,
    isShortcutsOpen: false,
    isDiagnosticsOpen: false,
    isZenMode: false,
    
    isPanToolActive: false,
    isLiquifyModalOpen: false,
    isGuidesActive: false,
    fitMode: 'crop-middle',
    foregroundZoom: 1.0,
    backgroundZoom: 1.0,
    isVertigoLinked: false,
    
    visibility: { ...defaultVisibility },
    
    isPlaying: false,
    speed: 50,
    slideTimeSec: 0,
    aspectRatio: '16:9',
    activeLut: 'cinematic',
    activeLens: '50mm f/1.4 Human Eye',
    
    isAudioMuted: true,
    audioVolume: 0.4,
    
    history: new HistoryManager<any>({ index: 0 }),
    saveStatus: 'IDB SYNCED',

    // Kinetic Hero Title Typography Engine
    titleConfig: {
      preset: 'molten-gold',
      titleSize: 72,
      glowIntensity: 1.0,
      verticalOffset: 0,
      tracking: 0.15,
      titleOpacity: 1.0,
      showTitles: true
    },
    setTitlePreset: (preset: HeroTitlePreset) => {
      set((state) => {
        state.titleConfig.preset = preset;
      });
      eventBus.emit('title:preset', preset);
    },
    setTitleSize: (size: number) => {
      set((state) => {
        state.titleConfig.titleSize = Math.max(28, Math.min(140, Math.round(size)));
      });
    },
    setTitleGlowIntensity: (intensity: number) => {
      set((state) => {
        state.titleConfig.glowIntensity = Math.max(0, Math.min(2.0, intensity));
      });
    },
    setTitleVerticalOffset: (offset: number) => {
      set((state) => {
        state.titleConfig.verticalOffset = Math.max(-200, Math.min(200, Math.round(offset)));
      });
    },
    setTitleTracking: (tracking: number) => {
      set((state) => {
        state.titleConfig.tracking = Math.max(0.02, Math.min(0.6, tracking));
      });
    },
    setTitleOpacity: (opacity: number) => {
      set((state) => {
        state.titleConfig.titleOpacity = Math.max(0.1, Math.min(1.0, Math.round(opacity * 100) / 100));
      });
    },
    toggleTitles: () => {
      set((state) => {
        const next = !state.titleConfig.showTitles;
        state.titleConfig.showTitles = next;
        state.visibility.titlesAll = next;
      });
      eventBus.emit('titles:toggle', get().titleConfig.showTitles);
    },
    setTitleConfig: (partial: Partial<HeroTitleConfig>) => {
      set((state) => {
        Object.assign(state.titleConfig, partial);
        if (partial.showTitles !== undefined) {
          state.visibility.titlesAll = partial.showTitles;
        }
      });
    },

    setActiveShotIndex: (index: number) => {
      set((state) => {
        const total = state.project.shots.length || 100;
        state.activeShotIndex = ((index % total) + total) % total;
      });
      eventBus.emit('shot:change', get().activeShotIndex);
    },

    nextShot: () => {
      get().setActiveShotIndex(get().activeShotIndex + 1);
    },

    prevShot: () => {
      get().setActiveShotIndex(get().activeShotIndex - 1);
    },

    setActiveModule: (module: StudioModule) => {
      set((state) => {
        state.activeModule = module;
      });
      eventBus.emit('module:change', module);
    },

    setBoardView: (view: BoardSubView) => {
      set((state) => {
        state.boardView = view;
      });
    },

    setWorkspacePreset: (preset: WorkspacePreset) => {
      set((state) => {
        state.workspacePreset = preset;
        switch (preset) {
          case 'Writer':
            state.activeModule = 'STORY';
            state.isProMode = false;
            break;
          case 'Storyboarder':
            state.activeModule = 'BOARD';
            state.boardView = 'grid';
            break;
          case 'Director':
            state.activeModule = 'PLAYER';
            state.isProMode = true;
            break;
          case 'Editor':
            state.activeModule = 'BOARD';
            state.boardView = 'timeline';
            state.isProMode = true;
            break;
          case 'Colorist':
            state.activeModule = 'COLOR';
            state.isProMode = true;
            break;
          case 'Sound':
            state.activeModule = 'SOUND';
            state.isProMode = true;
            break;
          case 'Minimal':
            state.activeModule = 'PLAYER';
            state.isLeftRailExpanded = false;
            state.isInspectorOpen = false;
            break;
        }
      });
    },

    toggleProMode: () => {
      set((state) => {
        state.isProMode = !state.isProMode;
      });
    },

    toggleLeftRail: () => {
      set((state) => {
        state.isLeftRailExpanded = !state.isLeftRailExpanded;
      });
    },

    toggleInspector: () => {
      set((state) => {
        state.isInspectorOpen = !state.isInspectorOpen;
      });
    },

    toggleCommandPalette: () => {
      set((state) => {
        state.isCommandPaletteOpen = !state.isCommandPaletteOpen;
      });
    },

    toggleShortcuts: () => {
      set((state) => {
        state.isShortcutsOpen = !state.isShortcutsOpen;
      });
    },

    toggleDiagnostics: () => {
      set((state) => {
        state.isDiagnosticsOpen = !state.isDiagnosticsOpen;
      });
    },

    toggleZenMode: () => {
      set((state) => {
        state.isZenMode = !state.isZenMode;
      });
    },

    togglePanTool: () => {
      set((state) => {
        state.isPanToolActive = !state.isPanToolActive;
      });
    },

    setShotPanY: (shotId: number, panY: number) => {
      set((state) => {
        const clamped = Math.max(0, Math.min(100, Math.round(panY * 10) / 10));
        const shot = state.project.shots.find(s => s.id === shotId);
        if (shot) {
          shot.panY = clamped;
        }
      });
    },

    setLiquifyModalOpen: (open: boolean) => {
      set((state) => {
        state.isLiquifyModalOpen = open;
      });
    },

    toggleGuides: () => {
      set((state) => {
        state.isGuidesActive = !state.isGuidesActive;
        state.visibility.guides = state.isGuidesActive;
      });
    },

    setFitMode: (mode: 'cover' | 'contain' | 'crop-middle') => {
      set((state) => {
        state.fitMode = mode;
      });
    },

    setForegroundZoom: (zoom: number) => {
      set((state) => {
        const clamped = Math.max(0.2, Math.min(3.5, Math.round(zoom * 100) / 100));
        state.foregroundZoom = clamped;
        if (state.isVertigoLinked && clamped > 0) {
          state.backgroundZoom = Math.max(0.2, Math.min(3.5, Math.round((1.0 / clamped) * 100) / 100));
        }
      });
    },

    setBackgroundZoom: (zoom: number) => {
      set((state) => {
        const clamped = Math.max(0.2, Math.min(3.5, Math.round(zoom * 100) / 100));
        state.backgroundZoom = clamped;
        if (state.isVertigoLinked && clamped > 0) {
          state.foregroundZoom = Math.max(0.2, Math.min(3.5, Math.round((1.0 / clamped) * 100) / 100));
        }
      });
    },

    setVertigoLinked: (linked: boolean) => {
      set((state) => {
        state.isVertigoLinked = linked;
      });
    },

    resetMultiLayerZoom: () => {
      set((state) => {
        state.foregroundZoom = 1.0;
        state.backgroundZoom = 1.0;
        state.isVertigoLinked = false;
      });
    },

    setAspectRatio: (ratio: '2.39:1' | '16:9' | '4:3' | '1:1' | '4:5' | '9:16') => {
      set((state) => {
        state.aspectRatio = ratio;
        state.project.aspectRatio = ratio;
      });
    },

    setLut: (lut: string) => {
      set((state) => {
        state.activeLut = lut;
      });
    },

    setLens: (lens: string) => {
      set((state) => {
        state.activeLens = lens;
      });
    },

    setVisibilityItem: (key: keyof ComponentVisibility, value: boolean) => {
      set((state) => {
        state.visibility[key] = value;
      });
    },

    togglePlay: () => {
      set((state) => {
        state.isPlaying = !state.isPlaying;
      });
    },

    setSpeed: (speed: number) => {
      set((state) => {
        state.speed = speed;
        state.project.playbackSpeed = speed;
      });
    },

    setSlideTimeSec: (time: number) => {
      set((state) => {
        state.slideTimeSec = Math.max(0, time);
      });
    },

    toggleAudio: () => {
      set((state) => {
        state.isAudioMuted = !state.isAudioMuted;
      });
    },

    setAudioVolume: (vol: number) => {
      set((state) => {
        state.audioVolume = vol;
      });
    },

    updateShot: (index: number, partial: Partial<Shot>) => {
      set((state) => {
        if (!state.project.shots || state.project.shots.length === 0) {
          state.project.shots = createDefaultStoreShots();
        }
        while (state.project.shots.length <= index) {
          const i = state.project.shots.length;
          const defaults = createDefaultStoreShots();
          state.project.shots.push(defaults[i % defaults.length]);
        }
        const shot = state.project.shots[index];
        if (shot) {
          Object.assign(shot, partial);
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('shot:updated', { index, partial });
    },

    addMediaItem: (item: MediaItem) => {
      set((state) => {
        state.project.mediaPool.push(item);
      });
    },

    setProjectTitle: (title: string) => {
      set((state) => {
        state.project.title = title;
      });
    },

    undo: () => {
      const prev = get().history.undo();
      if (prev) {
        set((state) => {
          Object.assign(state, prev);
        });
      }
    },

    redo: () => {
      const next = get().history.redo();
      if (next) {
        set((state) => {
          Object.assign(state, next);
        });
      }
    }
  }))
);
