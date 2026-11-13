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
import { depthOcclusionService, DepthLayerMode } from '../services/depthOcclusionService';
import { AudioPunchMode } from '../services/transientPunchEngine';
import { AutonomousKineticPreset } from '../services/kineticTypographyStyles';
import type { ShotMediaEntry, ShotMediaMap } from '../services/handfilmMediaVault';
import type { ShotLightConfig } from '../types/anthology';
import type {
  TitlePresetConfig,
  ShotTitleData,
  TitleZone9,
  TitleKineticEntrance
} from '../types/titlePreset';
import {
  composeZone9,
  getKineticEntranceForAlign,
  getZone9Metadata,
  isValidTitleZone9,
  zone9ToAlign
} from '../services/titleChoreographyEngine';
import {
  buildTitlePresetConfigById,
  createDefaultShotTitleData,
  resolveShotTitleData,
  stripDopamineDirectorNote
} from '../constants/titleTemplates';

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
  frameStepButtons?: boolean;
  titleOpacity: number;
  barrelDistortion?: number;
}

export interface DigitalZoomState {
  scale: number;
  translateX: number;
  translateY: number;
  isZoomed: boolean;
}

export type StageViewportScale = 0.5 | 0.75 | 1.0 | 'fit';

export type HeroTitlePreset = 'molten-gold' | 'titanium-silver' | 'neon-crimson';
export type TitleAlign = 'LEFT' | 'MID' | 'RIGHT' | 'AUTO';
export type TitlePosition = 'left-bottom' | 'mid-bottom' | 'right-bottom' | 'auto';
export type { TitleZone9, TitleKineticEntrance };

export function titleAlignToPosition(align: TitleAlign): TitlePosition {
  switch (align) {
    case 'LEFT':
      return 'left-bottom';
    case 'RIGHT':
      return 'right-bottom';
    case 'AUTO':
      return 'auto';
    case 'MID':
    default:
      return 'mid-bottom';
  }
}

export function positionToTitleAlign(position: TitlePosition): TitleAlign {
  switch (position) {
    case 'left-bottom':
      return 'LEFT';
    case 'right-bottom':
      return 'RIGHT';
    case 'auto':
      return 'AUTO';
    case 'mid-bottom':
    default:
      return 'MID';
  }
}

/**
 * Resolves live stage title alignment for LEFT | MID | RIGHT | AUTO.
 * - AUTO places hero establishing shots (index 0 or WS/EWS/EST/HERO shot types) in MID,
 *   then alternates LEFT on odd shot indices and RIGHT on even shot indices.
 */
export function resolveEffectiveTitleAlign(
  titleAlign: TitleAlign,
  shotIndex: number,
  shotType?: string
): 'LEFT' | 'MID' | 'RIGHT' {
  if (titleAlign !== 'AUTO') return titleAlign;
  const normalizedType = (shotType || '').toUpperCase();
  if (
    shotIndex === 0 ||
    normalizedType === 'WS' ||
    normalizedType === 'EWS' ||
    normalizedType === 'EST' ||
    normalizedType === 'HERO'
  ) {
    return 'MID';
  }
  return Math.abs(shotIndex) % 2 === 1 ? 'LEFT' : 'RIGHT';
}

export interface HeroTitleConfig {
  preset: HeroTitlePreset;
  activePresetConfig?: TitlePresetConfig;
  heroGlobal?: boolean;
  titleSize: number; // 36 to 120 (default 72)
  glowIntensity: number; // 0.0 to 2.0 (default 1.0 = 100%)
  verticalOffset: number; // -150 to 150px (default 0)
  tracking: number; // 0.05 to 0.45em (default 0.15)
  titleOpacity: number; // 0.0 to 1.0 (default 1.0 = 100%)
  showTitles: boolean;
}

export interface StudioState {
  // Project & Content
  project: StudioProject;
  activeShotIndex: number;
  shotMediaMap: ShotMediaMap;
  setShotMediaMap: (map: ShotMediaMap) => void;
  setShotMediaEntry: (shotId: string, entry: ShotMediaEntry) => void;
  removeShotMediaEntry: (shotId: string) => void;

  // 10x10 Modular Reel Engine
  activeReelIndex: number;
  reelLoopActive: boolean;
  selectReel: (reelIdx: number) => void;
  setReelLoopActive: (active: boolean) => void;
  
  // Kinetic Hero Title Typography Engine
  titleConfig: HeroTitleConfig;
  titleAlign: TitleAlign;
  setTitleAlign: (align: TitleAlign) => void;
  titleZone: TitleZone9 | 'AUTO';
  setTitleZone: (zone: TitleZone9 | 'AUTO') => void;
  isSafeZoneOverlayVisible: boolean;
  setIsSafeZoneOverlayVisible: (visible: boolean) => void;
  titlePosition: TitlePosition;
  setTitlePosition: (position: TitlePosition) => void;
  setTitlePreset: (preset: HeroTitlePreset) => void;
  setTitleSize: (size: number) => void;
  setTitleGlowIntensity: (intensity: number) => void;
  setTitleVerticalOffset: (offset: number) => void;
  setTitleTracking: (tracking: number) => void;
  setTitleOpacity: (opacity: number) => void;
  toggleTitles: () => void;
  setTitleConfig: (partial: Partial<HeroTitleConfig>) => void;
  setShotTitlePresetConfig: (shotIndex: number, config: TitlePresetConfig, syncGlobal?: boolean) => void;
  updateShotTitleData: (shotIndex: number, partial: Partial<ShotTitleData>) => void;
  copyTitleStyleToAllShots: (sourceIndex?: number) => void;

  // Autonomous Kinetic Typography & 3D Depth Occlusion Engine
  kineticOcclusion: {
    enabled: boolean;
    layerMode: DepthLayerMode;
    audioPunchMode: AudioPunchMode;
    preset: AutonomousKineticPreset;
    impact: number;
  };
  setKineticOcclusionEnabled: (enabled: boolean) => void;
  setDepthLayerMode: (mode: DepthLayerMode) => void;
  setAudioPunchMode: (mode: AudioPunchMode) => void;
  setAutonomousKineticPreset: (preset: AutonomousKineticPreset) => void;
  setKineticImpact: (impact: number) => void;
  
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
  stageScale: StageViewportScale;
  setStageScale: (scale: StageViewportScale) => void;
  monitorGuidesVisible: boolean;
  setMonitorGuidesVisible: (visible: boolean) => void;
  toggleMonitorGuides: () => void;
  monitorFocusPeaking: boolean;
  toggleMonitorFocusPeaking: () => void;
  monitorZebraExposure: boolean;
  toggleMonitorZebraExposure: () => void;
  monitorSplitCompare: boolean;
  toggleMonitorSplitCompare: () => void;
  monitorSplitPosition: number;
  setMonitorSplitPosition: (pct: number) => void;
  digitalZoom: DigitalZoomState;
  setDigitalZoom: (zoom: Partial<DigitalZoomState>) => void;
  resetDigitalZoom: () => void;
  
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
  setVisibilityItem: <K extends keyof ComponentVisibility>(key: K, value: ComponentVisibility[K]) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setSlideTimeSec: (time: number) => void;
  toggleAudio: () => void;
  setAudioVolume: (vol: number) => void;
  updateShot: (index: number, partial: Partial<Shot>) => void;
  toggleShotReverse: (shotIndex?: number) => void;
  setShotLightConfig: (shotIndex: number, lightConfig: ShotLightConfig, lightId?: string | null) => void;
  setShots: (shots: Shot[]) => void;
  deleteShots: (indicesToRemove: number[]) => void;
  addShot: (shot: Partial<Shot>) => void;
  appendClip: (clip: Partial<Shot>) => void;
  addMediaItem: (item: MediaItem) => void;
  // Enterprise AI Credits
  credits: number;
  deductCredits: (amount?: number) => boolean;
  setCredits: (amount: number) => void;
  setProjectTitle: (title: string) => void;

  undo: () => void;
  redo: () => void;
}

const baseDefaultVisibility: ComponentVisibility = {
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
  motionBlur: true,
  frameStepButtons: false,
  titleOpacity: 1.0,
  barrelDistortion: 0
};

function syncRootTitleBlockOpacityVar(opacity: number): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--title-block-opacity', String(opacity));
  }
}

function hydrateInitialStoreVisibility(): ComponentVisibility {
  if (typeof window === 'undefined') return { ...baseDefaultVisibility };
  try {
    const raw = localStorage.getItem('rawx_components_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedOpacity = typeof parsed.titleOpacity === 'number' ? parsed.titleOpacity : 1.0;
      const clampedOpacity = Math.max(0, Math.min(1, Math.round(parsedOpacity * 100) / 100));
      const parsedDistortion = typeof parsed.barrelDistortion === 'number' ? parsed.barrelDistortion : 0;
      const clampedDistortion = Math.max(0, Math.min(1, Math.round(parsedDistortion * 100) / 100));
      syncRootTitleBlockOpacityVar(clampedOpacity);
      return {
        ...baseDefaultVisibility,
        ...parsed,
        titleOpacity: clampedOpacity,
        barrelDistortion: clampedDistortion
      };
    }
  } catch {
    // ignore storage errors
  }
  syncRootTitleBlockOpacityVar(baseDefaultVisibility.titleOpacity);
  return { ...baseDefaultVisibility };
}

const defaultVisibility: ComponentVisibility = hydrateInitialStoreVisibility();

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
    isReversed: false,
    titleData: createDefaultShotTitleData(bf, i),
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
    shotMediaMap: {},
    setShotMediaMap: (map: ShotMediaMap) => {
      set((state) => {
        state.shotMediaMap = { ...map };
      });
    },
    setShotMediaEntry: (shotId: string, entry: ShotMediaEntry) => {
      set((state) => {
        state.shotMediaMap[String(shotId)] = entry;
      });
    },
    removeShotMediaEntry: (shotId: string) => {
      set((state) => {
        delete state.shotMediaMap[String(shotId)];
      });
    },
    activeReelIndex: 0,
    reelLoopActive: false,
    selectReel: (reelIdx: number) => {
      const clampedReel = Math.max(0, Math.min(9, Math.floor(reelIdx)));
      const targetShot = clampedReel * 10;
      set((state) => {
        const total = state.project.shots.length || 100;
        state.activeReelIndex = clampedReel;
        state.reelLoopActive = true;
        state.activeShotIndex = Math.min(total - 1, targetShot);
        state.slideTimeSec = 0;
      });
      eventBus.emit('shot:change', get().activeShotIndex);
    },
    setReelLoopActive: (active: boolean) => {
      set((state) => {
        state.reelLoopActive = active;
      });
    },
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
    stageScale: 'fit',
    setStageScale: (scale: StageViewportScale) => {
      set((state) => {
        state.stageScale = scale;
      });
    },
    monitorGuidesVisible: false,
    setMonitorGuidesVisible: (visible: boolean) => {
      set((state) => {
        state.monitorGuidesVisible = Boolean(visible);
      });
    },
    toggleMonitorGuides: () => {
      set((state) => {
        state.monitorGuidesVisible = !state.monitorGuidesVisible;
      });
    },
    monitorFocusPeaking: false,
    toggleMonitorFocusPeaking: () => {
      set((state) => {
        state.monitorFocusPeaking = !state.monitorFocusPeaking;
      });
    },
    monitorZebraExposure: false,
    toggleMonitorZebraExposure: () => {
      set((state) => {
        state.monitorZebraExposure = !state.monitorZebraExposure;
      });
    },
    monitorSplitCompare: false,
    toggleMonitorSplitCompare: () => {
      set((state) => {
        state.monitorSplitCompare = !state.monitorSplitCompare;
      });
    },
    monitorSplitPosition: 50,
    setMonitorSplitPosition: (pct: number) => {
      set((state) => {
        state.monitorSplitPosition = Math.max(5, Math.min(95, Number.isFinite(pct) ? pct : 50));
      });
    },
    digitalZoom: {
      scale: 1.0,
      translateX: 0,
      translateY: 0,
      isZoomed: false
    },
    
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
    credits: 12500,

    // Kinetic Hero Title Typography Engine (Strict Per-Shot Mode by Default)
    titleConfig: {
      preset: 'molten-gold',
      activePresetConfig: buildTitlePresetConfigById('molten-gold'),
      heroGlobal: false,
      titleSize: 72,
      glowIntensity: 1.0,
      verticalOffset: 0,
      tracking: 0.15,
      titleOpacity: defaultVisibility.titleOpacity,
      showTitles: defaultVisibility.titlesAll
    },
    titleAlign: 'MID',
    titleZone: 'AUTO',
    isSafeZoneOverlayVisible: false,
    setIsSafeZoneOverlayVisible: (visible: boolean) => {
      set((state) => {
        state.isSafeZoneOverlayVisible = Boolean(visible);
      });
    },
    setTitleZone: (zone: TitleZone9 | 'AUTO') => {
      let targetIdx = 0;
      let nextTitleData: ShotTitleData | undefined;
      const derivedAlign: TitleAlign = zone === 'AUTO' ? 'AUTO' : zone9ToAlign(zone);
      const derivedEntrance: TitleKineticEntrance | undefined =
        zone === 'AUTO' ? undefined : getZone9Metadata(zone).entrance;
      set((state) => {
        state.titleZone = zone;
        state.titleAlign = derivedAlign;
        state.titlePosition = titleAlignToPosition(derivedAlign);
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const resolved = resolveShotTitleData(shot, targetIdx);
          nextTitleData = {
            ...resolved,
            alignment: derivedAlign,
            zone9: zone,
            kineticEntrance: derivedEntrance
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('title:align', derivedAlign);
      if (nextTitleData) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: { titleData: nextTitleData }
        });
      }
    },
    setTitleAlign: (align: TitleAlign) => {
      let targetIdx = 0;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleAlign = align;
        state.titlePosition = titleAlignToPosition(align);
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        const currentShotZone = shot?.titleData?.zone9 ?? state.titleZone;
        let nextZone: TitleZone9 | 'AUTO' = 'AUTO';
        if (align === 'AUTO') {
          nextZone = 'AUTO';
        } else if (currentShotZone && currentShotZone !== 'AUTO' && isValidTitleZone9(currentShotZone)) {
          const prevRow = getZone9Metadata(currentShotZone).row;
          nextZone = composeZone9(prevRow, align);
        } else {
          nextZone = 'AUTO';
        }
        state.titleZone = nextZone;
        if (shot) {
          const resolved = resolveShotTitleData(shot, targetIdx);
          nextTitleData = {
            ...resolved,
            alignment: align,
            zone9: nextZone,
            kineticEntrance: align === 'AUTO' ? undefined : getKineticEntranceForAlign(align)
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('title:align', align);
      if (nextTitleData) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: { titleData: nextTitleData }
        });
      }
    },
    titlePosition: 'mid-bottom',
    setTitlePosition: (position: TitlePosition) => {
      const nextAlign = positionToTitleAlign(position);
      get().setTitleAlign(nextAlign);
    },
    setTitlePreset: (preset: HeroTitlePreset) => {
      let updatedShotIdx = 0;
      let builtConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      let cleanedNotes = '';
      let cleanedTags: string[] = [];
      set((state) => {
        state.titleConfig.preset = preset;
        updatedShotIdx = state.activeShotIndex;
        const shot = state.project.shots?.[updatedShotIdx];
        const currentData = resolveShotTitleData(shot, updatedShotIdx);
        builtConfig = buildTitlePresetConfigById(preset, {
          fontScale: currentData.fontScale,
          glowIntensity: currentData.glowIntensity,
          letterTracking: currentData.letterTracking,
          verticalOffset: currentData.verticalOffset
        });
        state.titleConfig.activePresetConfig = builtConfig;
        if (shot) {
          cleanedNotes = stripDopamineDirectorNote(shot.directorNotes);
          cleanedTags = (shot.tags || []).filter((t) => t !== 'dopamine');
          shot.activeTitlePreset = builtConfig.presetId;
          shot.titleStyleConfig = builtConfig;
          shot.dopamineConfig = undefined;
          shot.directorNotes = cleanedNotes;
          shot.tags = cleanedTags;
          shot.colorAccent = builtConfig.primaryColor;
          nextTitleData = {
            ...currentData,
            presetId: builtConfig.presetId,
            entranceAnim: builtConfig.motionAnimation,
            styleConfig: builtConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('title:preset', preset);
      if (builtConfig) {
        eventBus.emit('shot:updated', {
          index: updatedShotIdx,
          partial: {
            activeTitlePreset: builtConfig.presetId,
            titleStyleConfig: builtConfig,
            ...(nextTitleData ? { titleData: nextTitleData } : {}),
            dopamineConfig: undefined,
            directorNotes: cleanedNotes,
            tags: cleanedTags,
            colorAccent: builtConfig.primaryColor
          }
        });
      }
    },
    setTitleSize: (size: number) => {
      const nextSize = Math.max(24, Math.min(140, Math.round(size)));
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.titleSize = nextSize;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.fontScale = nextSize;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, fontScale: nextSize };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            fontScale: nextSize,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      if (nextShotConfig) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            ...(nextTitleData ? { titleData: nextTitleData } : {})
          }
        });
      }
    },
    setTitleGlowIntensity: (intensity: number) => {
      const nextGlow = Math.max(0, Math.min(2.0, intensity));
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.glowIntensity = nextGlow;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.glowIntensity = nextGlow;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, glowIntensity: nextGlow };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            glowIntensity: nextGlow,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      if (nextShotConfig) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            ...(nextTitleData ? { titleData: nextTitleData } : {})
          }
        });
      }
    },
    setTitleVerticalOffset: (offset: number) => {
      const nextOffset = Math.max(-200, Math.min(200, Math.round(offset)));
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.verticalOffset = nextOffset;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.verticalOffset = nextOffset;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, verticalOffset: nextOffset };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            verticalOffset: nextOffset,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      if (nextShotConfig) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            ...(nextTitleData ? { titleData: nextTitleData } : {})
          }
        });
      }
    },
    setTitleTracking: (tracking: number) => {
      const nextTracking = Math.max(0.0, Math.min(0.6, tracking));
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.tracking = nextTracking;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.letterTracking = nextTracking;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, letterTracking: nextTracking };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            letterTracking: nextTracking,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      if (nextShotConfig) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            ...(nextTitleData ? { titleData: nextTitleData } : {})
          }
        });
      }
    },
    setTitleOpacity: (opacity: number) => {
      const clamped = Math.max(0, Math.min(1, Math.round(opacity * 100) / 100));
      syncRootTitleBlockOpacityVar(clamped);
      set((state) => {
        state.titleConfig.titleOpacity = clamped;
        state.visibility.titleOpacity = clamped;
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
      if (partial.titleOpacity !== undefined) {
        const clamped = Math.max(0, Math.min(1, Math.round(partial.titleOpacity * 100) / 100));
        syncRootTitleBlockOpacityVar(clamped);
      }
      set((state) => {
        Object.assign(state.titleConfig, partial);
        if (partial.showTitles !== undefined) {
          state.visibility.titlesAll = partial.showTitles;
        }
        if (partial.titleOpacity !== undefined) {
          state.visibility.titleOpacity = Math.max(
            0,
            Math.min(1, Math.round(partial.titleOpacity * 100) / 100)
          );
        }
      });
    },
    setShotTitlePresetConfig: (shotIndex: number, config: TitlePresetConfig, syncGlobal: boolean = false) => {
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        const shot = state.project.shots?.[shotIndex];
        if (shot) {
          const currentData = resolveShotTitleData(shot, shotIndex);
          shot.activeTitlePreset = config.presetId;
          shot.titleStyleConfig = config;
          if (config.category !== 'DOPAMINE') {
            shot.dopamineConfig = undefined;
            shot.directorNotes = stripDopamineDirectorNote(shot.directorNotes);
            shot.tags = (shot.tags || []).filter((t) => t !== 'dopamine');
          }
          shot.colorAccent = config.primaryColor;
          nextTitleData = {
            ...currentData,
            presetId: config.presetId,
            fontScale: config.fontScale,
            glowIntensity: config.glowIntensity,
            letterTracking: config.letterTracking,
            verticalOffset: config.verticalOffset,
            entranceAnim: config.motionAnimation,
            styleConfig: config
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
        if (syncGlobal) {
          state.titleConfig.activePresetConfig = config;
          state.titleConfig.titleSize = config.fontScale;
          state.titleConfig.glowIntensity = config.glowIntensity;
          state.titleConfig.tracking = config.letterTracking;
          state.titleConfig.verticalOffset = config.verticalOffset;
          if (
            config.presetId === 'molten-gold' ||
            config.presetId === 'titanium-silver' ||
            config.presetId === 'neon-crimson'
          ) {
            state.titleConfig.preset = config.presetId;
          }
        }
      });
      eventBus.emit('shot:updated', {
        index: shotIndex,
        partial: {
          activeTitlePreset: config.presetId,
          titleStyleConfig: config,
          ...(nextTitleData ? { titleData: nextTitleData } : {}),
          ...(config.category !== 'DOPAMINE' ? { dopamineConfig: undefined } : {}),
          colorAccent: config.primaryColor
        }
      });
    },
    updateShotTitleData: (shotIndex: number, partial: Partial<ShotTitleData>) => {
      let nextTitleData: ShotTitleData | undefined;
      let nextStyleConfig: TitlePresetConfig | undefined;
      let emitPartial: Record<string, any> = {};

      set((state) => {
        if (!state.project.shots || state.project.shots.length === 0) {
          state.project.shots = createDefaultStoreShots();
        }
        const defaults = createDefaultStoreShots();
        while (state.project.shots.length <= shotIndex) {
          const i = state.project.shots.length;
          state.project.shots.push({ ...defaults[i % defaults.length], id: i });
        }
        const shot = state.project.shots[shotIndex];
        if (!shot) return;

        const base = resolveShotTitleData(shot, shotIndex);
        const mergedStyleBase =
          partial.styleConfig ||
          (partial.presetId && partial.presetId !== base.presetId
            ? buildTitlePresetConfigById(partial.presetId)
            : base.styleConfig || buildTitlePresetConfigById(base.presetId));

        const nextFontScale = partial.fontScale ?? mergedStyleBase.fontScale ?? base.fontScale;
        const nextGlow = partial.glowIntensity ?? mergedStyleBase.glowIntensity ?? base.glowIntensity;
        const nextTracking = partial.letterTracking ?? mergedStyleBase.letterTracking ?? base.letterTracking;
        const nextOffset = partial.verticalOffset ?? mergedStyleBase.verticalOffset ?? base.verticalOffset;

        nextStyleConfig = {
          ...mergedStyleBase,
          fontScale: nextFontScale,
          glowIntensity: nextGlow,
          letterTracking: nextTracking,
          verticalOffset: nextOffset
        };

        nextTitleData = {
          ...base,
          ...partial,
          presetId: partial.presetId ?? nextStyleConfig.presetId,
          fontScale: nextFontScale,
          glowIntensity: nextGlow,
          letterTracking: nextTracking,
          verticalOffset: nextOffset,
          entranceAnim: partial.entranceAnim ?? nextStyleConfig.motionAnimation,
          styleConfig: nextStyleConfig
        };

        shot.titleData = nextTitleData;
        shot.activeTitlePreset = nextTitleData.presetId;
        shot.titleStyleConfig = nextStyleConfig;
        shot.colorAccent = nextStyleConfig.primaryColor;
        if (partial.banglaTitle !== undefined) {
          shot.bengaliTitle = partial.banglaTitle;
        }
        if (partial.englishSubtitle !== undefined) {
          shot.title = partial.englishSubtitle;
        }
        if (partial.captionNote !== undefined) {
          shot.directorNotes = partial.captionNote;
          shot.tagline = partial.captionNote;
        }
        if (nextStyleConfig.category !== 'DOPAMINE') {
          shot.dopamineConfig = undefined;
          shot.tags = (shot.tags || []).filter((t) => t !== 'dopamine');
        }
        shot.updatedAt = Date.now();

        emitPartial = {
          titleData: nextTitleData,
          activeTitlePreset: nextTitleData.presetId,
          titleStyleConfig: nextStyleConfig,
          colorAccent: nextStyleConfig.primaryColor,
          ...(partial.banglaTitle !== undefined ? { bengaliTitle: partial.banglaTitle } : {}),
          ...(partial.englishSubtitle !== undefined ? { title: partial.englishSubtitle } : {}),
          ...(partial.captionNote !== undefined
            ? { directorNotes: partial.captionNote, tagline: partial.captionNote }
            : {}),
          ...(nextStyleConfig.category !== 'DOPAMINE' ? { dopamineConfig: undefined } : {})
        };
      });

      if (nextTitleData) {
        eventBus.emit('shot:updated', {
          index: shotIndex,
          partial: emitPartial
        });
      }
    },
    copyTitleStyleToAllShots: (sourceIndex?: number) => {
      let copiedStylePatch: {
        enabled: boolean;
        presetId: string;
        alignment: ShotTitleData['alignment'];
        fontScale: number;
        glowIntensity: number;
        letterTracking: number;
        verticalOffset: number;
        entranceAnim?: ShotTitleData['entranceAnim'];
        exitAnim?: ShotTitleData['exitAnim'];
        styleConfig?: TitlePresetConfig;
      } | null = null;
      let resolvedSourceIdx = 0;

      set((state) => {
        resolvedSourceIdx =
          typeof sourceIndex === 'number' && Number.isFinite(sourceIndex)
            ? Math.max(0, Math.min(state.project.shots.length - 1, sourceIndex))
            : state.activeShotIndex;
        const sourceShot = state.project.shots[resolvedSourceIdx];
        const sourceData = resolveShotTitleData(sourceShot, resolvedSourceIdx);
        const clonedStyle = sourceData.styleConfig
          ? {
              ...sourceData.styleConfig,
              backdropPlate: { ...sourceData.styleConfig.backdropPlate },
              ...(sourceData.styleConfig.primaryGradient
                ? { primaryGradient: [...sourceData.styleConfig.primaryGradient] as [string, string, string] }
                : {})
            }
          : buildTitlePresetConfigById(sourceData.presetId);

        copiedStylePatch = {
          enabled: sourceData.enabled,
          presetId: sourceData.presetId,
          alignment: sourceData.alignment,
          ...(sourceData.zone9 ? { zone9: sourceData.zone9 } : {}),
          ...(sourceData.kineticEntrance ? { kineticEntrance: sourceData.kineticEntrance } : {}),
          fontScale: sourceData.fontScale,
          glowIntensity: sourceData.glowIntensity,
          letterTracking: sourceData.letterTracking,
          verticalOffset: sourceData.verticalOffset,
          entranceAnim: sourceData.entranceAnim,
          exitAnim: sourceData.exitAnim,
          styleConfig: clonedStyle
        };

        state.project.shots.forEach((shot, idx) => {
          const existingData = resolveShotTitleData(shot, idx);
          const perShotStyle: TitlePresetConfig = {
            ...clonedStyle,
            backdropPlate: { ...clonedStyle.backdropPlate },
            ...(clonedStyle.primaryGradient
              ? { primaryGradient: [...clonedStyle.primaryGradient] as [string, string, string] }
              : {})
          };
          shot.titleData = {
            ...copiedStylePatch!,
            banglaTitle: existingData.banglaTitle,
            englishSubtitle: existingData.englishSubtitle,
            captionNote: existingData.captionNote,
            styleConfig: perShotStyle
          };
          shot.activeTitlePreset = copiedStylePatch!.presetId;
          shot.titleStyleConfig = perShotStyle;
          shot.colorAccent = perShotStyle.primaryColor;
          if (perShotStyle.category !== 'DOPAMINE') {
            shot.dopamineConfig = undefined;
            shot.tags = (shot.tags || []).filter((t) => t !== 'dopamine');
          }
          shot.updatedAt = Date.now();
        });
      });

      if (copiedStylePatch) {
        eventBus.emit('shots:style_copied', {
          sourceIndex: resolvedSourceIdx,
          stylePatch: copiedStylePatch
        });
      }
    },

    // Autonomous Kinetic Typography & 3D Depth Occlusion Engine
    kineticOcclusion: {
      enabled: true,
      layerMode: 'BEHIND_SUBJECT',
      audioPunchMode: 'KICK',
      preset: 'COMMERCIAL_TITAN_DROP',
      impact: 1.0
    },
    setKineticOcclusionEnabled: (enabled: boolean) => {
      set((state) => {
        state.kineticOcclusion.enabled = enabled;
      });
      depthOcclusionService.setConfig({ enabled });
    },
    setDepthLayerMode: (mode: DepthLayerMode) => {
      set((state) => {
        state.kineticOcclusion.layerMode = mode;
      });
      depthOcclusionService.setConfig({ layerMode: mode });
    },
    setAudioPunchMode: (mode: AudioPunchMode) => {
      set((state) => {
        state.kineticOcclusion.audioPunchMode = mode;
      });
      depthOcclusionService.setConfig({ audioPunchMode: mode });
    },
    setAutonomousKineticPreset: (preset: AutonomousKineticPreset) => {
      set((state) => {
        state.kineticOcclusion.preset = preset;
      });
      depthOcclusionService.setConfig({ preset });
    },
    setKineticImpact: (impact: number) => {
      const clamped = Math.max(0.0, Math.min(2.0, Math.round(impact * 100) / 100));
      set((state) => {
        state.kineticOcclusion.impact = clamped;
      });
      depthOcclusionService.setConfig({ impact: clamped });
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

    setDigitalZoom: (zoom: Partial<DigitalZoomState>) => {
      set((state) => {
        Object.assign(state.digitalZoom, zoom);
        if (zoom.scale !== undefined) {
          state.digitalZoom.isZoomed = zoom.scale > 1.01;
        }
      });
    },

    resetDigitalZoom: () => {
      set((state) => {
        state.digitalZoom = {
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          isZoomed: false
        };
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

    setVisibilityItem: <K extends keyof ComponentVisibility>(key: K, value: ComponentVisibility[K]) => {
      if (key === 'titleOpacity' && typeof value === 'number') {
        const clamped = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
        syncRootTitleBlockOpacityVar(clamped);
      }
      set((state) => {
        state.visibility[key] = value;
        if (key === 'titleOpacity' && typeof value === 'number') {
          state.titleConfig.titleOpacity = Math.max(0, Math.min(1, Math.round(value * 100) / 100));
        }
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
        const defaults = createDefaultStoreShots();
        let nextShotId = state.project.shots.reduce(
          (max, s) => (typeof s?.id === 'number' && Number.isFinite(s.id) && s.id > max ? s.id : max),
          -1
        );
        while (state.project.shots.length <= index) {
          const i = state.project.shots.length;
          nextShotId += 1;
          state.project.shots.push({
            ...defaults[i % defaults.length],
            id: nextShotId
          });
        }
        const shot = state.project.shots[index];
        if (shot) {
          Object.assign(shot, partial);
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('shot:updated', { index, partial });
    },

    toggleShotReverse: (shotIndex?: number) => {
      const targetIndex = typeof shotIndex === 'number' ? shotIndex : get().activeShotIndex;
      let nextReversed = false;
      set((state) => {
        if (!state.project.shots || state.project.shots.length === 0) {
          state.project.shots = createDefaultStoreShots();
        }
        const shot = state.project.shots[targetIndex];
        if (shot) {
          nextReversed = !Boolean(shot.isReversed);
          shot.isReversed = nextReversed;
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('shot:updated', { index: targetIndex, partial: { isReversed: nextReversed } });
    },

    setShotLightConfig: (shotIndex: number, lightConfig: ShotLightConfig, lightId?: string | null) => {
      set((state) => {
        if (!state.project.shots || state.project.shots.length === 0) {
          state.project.shots = createDefaultStoreShots();
        }
        const shot = state.project.shots[shotIndex];
        if (shot) {
          shot.lightConfig = { ...lightConfig };
          if (lightId !== undefined) {
            shot.lightId = lightId;
          }
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('shot:updated', {
        index: shotIndex,
        partial: {
          lightConfig,
          ...(lightId !== undefined ? { lightId } : {})
        }
      });
    },

    addShot: (partial: Partial<Shot>) => {
      let newIndex = 0;
      set((state) => {
        if (!state.project.shots || state.project.shots.length === 0) {
          state.project.shots = createDefaultStoreShots();
        }
        newIndex = state.project.shots.length;
        const defaults = createDefaultStoreShots();
        const base = defaults[newIndex % defaults.length] || defaults[0];
        const usedIds = new Set(state.project.shots.map((s) => s.id));
        const maxId = state.project.shots.reduce(
          (max, s) => (typeof s?.id === 'number' && Number.isFinite(s.id) && s.id > max ? s.id : max),
          -1
        );
        const resolvedId =
          typeof partial.id === 'number' && Number.isFinite(partial.id) && !usedIds.has(partial.id)
            ? partial.id
            : maxId + 1;
        const newShot: Shot = {
          ...base,
          ...partial,
          id: resolvedId,
          epNumber: String(newIndex + 1).padStart(3, '0'),
          durationSeconds: partial.durationSeconds || (partial as any).durationSec || 5.0,
          updatedAt: Date.now()
        };
        state.project.shots.push(newShot);
        state.activeShotIndex = newIndex;
      });
      eventBus.emit('timeline:add_shot', { shot: partial, index: newIndex });
      eventBus.emit('shot:change', newIndex);
    },

    appendClip: (clip: Partial<Shot>) => {
      get().addShot(clip);
    },

    setShots: (shots: Shot[]) => {
      if (!Array.isArray(shots) || shots.length === 0) return;
      set((state) => {
        state.project.shots = shots.map((shot, idx) => ({
          ...shot,
          id: idx,
          epNumber: shot.epNumber || `#${String(idx + 1).padStart(3, '0')}`,
          updatedAt: Date.now()
        }));
        if (state.activeShotIndex >= state.project.shots.length) {
          state.activeShotIndex = Math.max(0, state.project.shots.length - 1);
        }
      });
    },

    deleteShots: (indicesToRemove: number[]) => {
      if (!Array.isArray(indicesToRemove) || indicesToRemove.length === 0) return;
      const removeSet = new Set(indicesToRemove);
      let didDelete = false;
      let nextActiveIdx = 0;
      set((state) => {
        const currentShots =
          Array.isArray(state.project.shots) && state.project.shots.length > 0
            ? state.project.shots
            : createDefaultStoreShots();
        const remaining = currentShots.filter((_, idx) => !removeSet.has(idx));
        if (remaining.length === 0) return;
        state.project.shots = remaining.map((shot, idx) => ({
          ...shot,
          id: idx,
          epNumber: `#${String(idx + 1).padStart(3, '0')}`,
          updatedAt: Date.now()
        }));
        state.activeShotIndex = Math.max(
          0,
          Math.min(state.project.shots.length - 1, state.activeShotIndex)
        );
        nextActiveIdx = state.activeShotIndex;
        didDelete = true;
      });
      if (didDelete) {
        eventBus.emit('shots:deleted', { indicesToRemove, activeShotIndex: nextActiveIdx });
      }
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

    deductCredits: (amount: number = 25) => {
      let success = false;
      let remaining = 0;
      set((state) => {
        const current = typeof state.credits === 'number' ? state.credits : 12500;
        if (current >= amount) {
          state.credits = Math.max(0, current - amount);
          remaining = state.credits;
          success = true;
        }
      });
      if (success) {
        eventBus.emit('credits:updated', remaining);
        eventBus.emit('credits:deducted', { amount, remaining });
      }
      return success;
    },

    setCredits: (amount: number) => {
      const safeAmount = Math.max(0, amount);
      set((state) => {
        state.credits = safeAmount;
      });
      eventBus.emit('credits:updated', safeAmount);
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
