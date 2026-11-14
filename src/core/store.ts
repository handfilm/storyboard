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
  TitleKineticEntrance,
  TitleDirectorRole,
  TitleOpticalFinish
} from '../types/titlePreset';
import {
  clampTitleOffsetsForSafeGuard,
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

export type HeroTitlePreset = 'molten-gold' | 'titanium-silver' | 'neon-crimson' | 'pure-white' | 'amber';
export type TitleAlign = 'LEFT' | 'MID' | 'RIGHT' | 'AUTO';
export type TitlePosition = 'left-bottom' | 'mid-bottom' | 'right-bottom' | 'auto';
export type { TitleZone9, TitleKineticEntrance, TitleDirectorRole, TitleOpticalFinish };

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
  titleSize: number; // 32 to 120 (default 72)
  glowIntensity: number; // 0.0 to 2.0 (default 1.0 = 100%)
  verticalOffset: number; // -200 to 200px (default 0)
  horizontalOffset: number; // -240 to 240px (default 0)
  safeGuard: boolean;
  directorRole?: TitleDirectorRole;
  opticalFinish?: TitleOpticalFinish;
  tracking: number; // 0.04 to 0.45em (default 0.15)
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
  isSafeGuardGuideHover: boolean;
  setIsSafeGuardGuideHover: (hover: boolean) => void;
  kineticReplayTick: number;
  titlePosition: TitlePosition;
  setTitlePosition: (position: TitlePosition) => void;
  setTitlePreset: (preset: HeroTitlePreset) => void;
  setTitleMaterialSwatch: (swatch: HeroTitlePreset) => void;
  setTitleSize: (size: number) => void;
  setTitleGlowIntensity: (intensity: number) => void;
  setTitleVerticalOffset: (offset: number) => void;
  setTitleHorizontalOffset: (offset: number) => void;
  nudgeTitleOffset: (dx: number, dy: number) => void;
  resetTitleOffset: () => void;
  toggleTitleSafeGuard: () => void;
  setTitleSafeGuard: (enabled: boolean) => void;
  applyDirectorTitleRole: (role: TitleDirectorRole) => void;
  setTitleOpticalFinish: (finish: TitleOpticalFinish) => void;
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
      horizontalOffset: 0,
      safeGuard: false,
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
    isSafeGuardGuideHover: false,
    setIsSafeGuardGuideHover: (hover: boolean) => {
      set((state) => {
        state.isSafeGuardGuideHover = Boolean(hover);
      });
    },
    kineticReplayTick: 0,
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
    setTitleMaterialSwatch: (swatch: HeroTitlePreset) => {
      let updatedShotIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      const swatchConfig = buildTitlePresetConfigById(swatch);
      set((state) => {
        state.titleConfig.preset = swatch;
        updatedShotIdx = state.activeShotIndex;
        const shot = state.project.shots?.[updatedShotIdx];
        const currentData = resolveShotTitleData(shot, updatedShotIdx);
        const baseConfig =
          currentData.styleConfig ||
          shot?.titleStyleConfig ||
          buildTitlePresetConfigById(currentData.presetId || 'molten-gold');
        const preserveScrimBg =
          currentData.opticalFinish === 'scrim' || currentData.directorRole === 'lower-3rd';
        const nextBackdrop = {
          ...baseConfig.backdropPlate,
          accentBarColor: swatchConfig.primaryColor
        };
        if (!preserveScrimBg && swatchConfig.backdropPlate?.enabled) {
          Object.assign(nextBackdrop, swatchConfig.backdropPlate);
        }
        nextShotConfig = {
          ...baseConfig,
          presetId: swatch,
          presetName: swatchConfig.presetName,
          primaryColor: swatchConfig.primaryColor,
          primaryGradient: swatchConfig.primaryGradient,
          secondaryColor: swatchConfig.secondaryColor,
          strokeColor: swatchConfig.strokeColor,
          glowColor:
            currentData.opticalFinish === 'halation'
              ? 'rgba(239, 68, 68, 0.85)'
              : swatchConfig.glowColor,
          backdropPlate: nextBackdrop
        };
        const syncedLayers = currentData.layers
          ? {
              ...currentData.layers,
              bangla: {
                ...(currentData.layers.bangla || {}),
                color: swatchConfig.primaryColor,
                gradientStops: swatchConfig.primaryGradient
              },
              english: {
                ...(currentData.layers.english || {}),
                color: swatchConfig.secondaryColor
              }
            }
          : currentData.layers;
        state.titleConfig.activePresetConfig = nextShotConfig;
        if (shot) {
          shot.activeTitlePreset = swatch;
          shot.titleStyleConfig = nextShotConfig;
          shot.colorAccent = swatchConfig.primaryColor;
          shot.dopamineConfig = undefined;
          shot.tags = (shot.tags || []).filter((t) => t !== 'dopamine');
          nextTitleData = {
            ...currentData,
            presetId: swatch,
            layers: syncedLayers,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });
      eventBus.emit('title:preset', swatch);
      if (nextShotConfig && nextTitleData) {
        eventBus.emit('shot:updated', {
          index: updatedShotIdx,
          partial: {
            activeTitlePreset: swatch,
            titleStyleConfig: nextShotConfig,
            titleData: nextTitleData,
            dopamineConfig: undefined,
            colorAccent: nextShotConfig.primaryColor
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
          const nextLayers = currentData.layers
            ? {
                ...currentData.layers,
                bangla: { ...(currentData.layers.bangla || {}), fontSize: nextSize }
              }
            : currentData.layers;
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            fontScale: nextSize,
            layers: nextLayers,
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
          const nextLayers = currentData.layers
            ? {
                ...currentData.layers,
                bangla: { ...(currentData.layers.bangla || {}), bloomIntensity: nextGlow }
              }
            : currentData.layers;
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            glowIntensity: nextGlow,
            layers: nextLayers,
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
    setTitleHorizontalOffset: (offset: number) => {
      const nextOffset = Math.max(-240, Math.min(240, Math.round(offset)));
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.horizontalOffset = nextOffset;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.horizontalOffset = nextOffset;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, horizontalOffset: nextOffset };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            horizontalOffset: nextOffset,
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
    nudgeTitleOffset: (dx: number, dy: number) => {
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        const currentData = resolveShotTitleData(shot, targetIdx, state.titleConfig, state.titleAlign);
        const zone =
          currentData.zone9 && currentData.zone9 !== 'AUTO' && isValidTitleZone9(currentData.zone9)
            ? currentData.zone9
            : 'center-hero';
        const isSafe = Boolean(currentData.safeGuard ?? state.titleConfig.safeGuard);
        const clamped = clampTitleOffsetsForSafeGuard(
          zone,
          (currentData.horizontalOffset ?? 0) + dx,
          (currentData.verticalOffset ?? 0) + dy,
          isSafe
        );
        state.titleConfig.horizontalOffset = clamped.x;
        state.titleConfig.verticalOffset = clamped.y;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.horizontalOffset = clamped.x;
          state.titleConfig.activePresetConfig.verticalOffset = clamped.y;
        }
        if (shot) {
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = {
            ...baseConfig,
            horizontalOffset: clamped.x,
            verticalOffset: clamped.y
          };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            horizontalOffset: clamped.x,
            verticalOffset: clamped.y,
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
    resetTitleOffset: () => {
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        state.titleConfig.horizontalOffset = 0;
        state.titleConfig.verticalOffset = 0;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.horizontalOffset = 0;
          state.titleConfig.activePresetConfig.verticalOffset = 0;
        }
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        if (shot) {
          const currentData = resolveShotTitleData(shot, targetIdx);
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = { ...baseConfig, horizontalOffset: 0, verticalOffset: 0 };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            horizontalOffset: 0,
            verticalOffset: 0,
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
    setTitleSafeGuard: (enabled: boolean) => {
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        const currentData = resolveShotTitleData(shot, targetIdx, state.titleConfig, state.titleAlign);
        const zone =
          currentData.zone9 && currentData.zone9 !== 'AUTO' && isValidTitleZone9(currentData.zone9)
            ? currentData.zone9
            : 'center-hero';
        const clamped = clampTitleOffsetsForSafeGuard(
          zone,
          currentData.horizontalOffset ?? 0,
          currentData.verticalOffset ?? 0,
          enabled
        );
        state.titleConfig.safeGuard = enabled;
        state.titleConfig.horizontalOffset = clamped.x;
        state.titleConfig.verticalOffset = clamped.y;
        if (state.titleConfig.activePresetConfig) {
          state.titleConfig.activePresetConfig.safeGuard = enabled;
          state.titleConfig.activePresetConfig.horizontalOffset = clamped.x;
          state.titleConfig.activePresetConfig.verticalOffset = clamped.y;
        }
        if (shot) {
          const baseConfig =
            currentData.styleConfig ||
            shot.titleStyleConfig ||
            buildTitlePresetConfigById(shot.activeTitlePreset || 'molten-gold');
          nextShotConfig = {
            ...baseConfig,
            safeGuard: enabled,
            horizontalOffset: clamped.x,
            verticalOffset: clamped.y
          };
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            safeGuard: enabled,
            horizontalOffset: clamped.x,
            verticalOffset: clamped.y,
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
    toggleTitleSafeGuard: () => {
      const idx = get().activeShotIndex;
      const shot = get().project.shots?.[idx];
      const current = resolveShotTitleData(shot, idx, get().titleConfig, get().titleAlign);
      get().setTitleSafeGuard(!current.safeGuard);
    },
    applyDirectorTitleRole: (role: TitleDirectorRole) => {
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      let derivedAlign: TitleAlign = 'MID';

      const roleSpecs: Record<
        TitleDirectorRole,
        {
          layoutMode: TitlePresetConfig['layoutMode'];
          zone9: TitleZone9;
          align: TitleAlign;
          fontScale: number;
          letterTracking: number;
          uppercase: boolean;
          glowIntensity: number;
          plate: TitlePresetConfig['backdropPlate'] | null;
        }
      > = {
        'imax-card': {
          layoutMode: 'center-hero',
          zone9: 'center-hero',
          align: 'MID',
          fontScale: 86,
          letterTracking: 0.22,
          uppercase: true,
          glowIntensity: 1.05,
          plate: null
        },
        'lower-3rd': {
          layoutMode: 'lower-third-bar',
          zone9: 'lower-left',
          align: 'LEFT',
          fontScale: 54,
          letterTracking: 0.10,
          uppercase: true,
          glowIntensity: 0.55,
          plate: {
            enabled: true,
            background: 'linear-gradient(90deg, rgba(8, 8, 12, 0.88) 0%, rgba(12, 12, 18, 0.72) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backdropBlur: 12,
            padding: '12px 22px'
          }
        },
        subtitle: {
          layoutMode: 'minimal-whisper',
          zone9: 'lower-center',
          align: 'MID',
          fontScale: 42,
          letterTracking: 0.06,
          uppercase: false,
          glowIntensity: 0.2,
          plate: {
            enabled: true,
            background: 'rgba(6, 6, 10, 0.74)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropBlur: 6,
            padding: '8px 18px'
          }
        },
        credit: {
          layoutMode: 'editorial-split',
          zone9: 'center-hero',
          align: 'MID',
          fontScale: 52,
          letterTracking: 0.28,
          uppercase: true,
          glowIntensity: 0.4,
          plate: null
        }
      };

      const spec = roleSpecs[role];
      derivedAlign = spec.align;

      set((state) => {
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        const currentData = resolveShotTitleData(shot, targetIdx, state.titleConfig, state.titleAlign);
        const baseConfig =
          currentData.styleConfig ||
          shot?.titleStyleConfig ||
          buildTitlePresetConfigById(currentData.presetId || 'molten-gold');
        const accent = baseConfig.primaryColor || '#F59E0B';

        const isScrimFinish = currentData.opticalFinish === 'scrim';
        const resolvedPlate = spec.plate
          ? { ...spec.plate, accentBarColor: accent }
          : isScrimFinish
            ? {
                enabled: true,
                background: 'linear-gradient(180deg, rgba(6,6,10,0.72) 0%, rgba(6,6,10,0.9) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropBlur: 10,
                padding: '14px 26px',
                accentBarColor: accent
              }
            : {
                enabled: false,
                background: 'transparent',
                border: 'none',
                backdropBlur: 0,
                padding: '0px',
                accentBarColor: accent
              };

        nextShotConfig = {
          ...baseConfig,
          layoutMode: spec.layoutMode,
          fontScale: spec.fontScale,
          letterTracking: spec.letterTracking,
          uppercase: spec.uppercase,
          glowIntensity: currentData.opticalFinish === 'halation' ? 1.45 : spec.glowIntensity,
          backdropPlate: resolvedPlate,
          directorRole: role,
          verticalOffset: 0,
          horizontalOffset: 0
        };

        const nextLayers = currentData.layers
          ? {
              ...currentData.layers,
              bangla: {
                ...(currentData.layers.bangla || {}),
                fontSize: spec.fontScale,
                letterSpacing: spec.letterTracking,
                textTransform: (spec.uppercase ? 'uppercase' : 'none') as 'uppercase' | 'none',
                bloomIntensity: nextShotConfig.glowIntensity
              },
              english: {
                ...(currentData.layers.english || {}),
                textTransform: (spec.uppercase ? 'uppercase' : 'none') as 'uppercase' | 'none'
              }
            }
          : currentData.layers;

        state.titleZone = spec.zone9;
        state.titleAlign = spec.align;
        state.titlePosition = titleAlignToPosition(spec.align);
        state.titleConfig.titleSize = spec.fontScale;
        state.titleConfig.tracking = spec.letterTracking;
        state.titleConfig.glowIntensity = nextShotConfig.glowIntensity;
        state.titleConfig.verticalOffset = 0;
        state.titleConfig.horizontalOffset = 0;
        state.titleConfig.directorRole = role;
        state.titleConfig.activePresetConfig = nextShotConfig;

        if (shot) {
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            alignment: spec.align,
            zone9: spec.zone9,
            kineticEntrance: getZone9Metadata(spec.zone9).entrance,
            fontScale: spec.fontScale,
            letterTracking: spec.letterTracking,
            glowIntensity: nextShotConfig.glowIntensity,
            verticalOffset: 0,
            horizontalOffset: 0,
            directorRole: role,
            layers: nextLayers,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });

      eventBus.emit('title:align', derivedAlign);
      if (nextShotConfig && nextTitleData) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            titleData: nextTitleData
          }
        });
      }
    },
    setTitleOpticalFinish: (finish: TitleOpticalFinish) => {
      let targetIdx = 0;
      let nextShotConfig: TitlePresetConfig | undefined;
      let nextTitleData: ShotTitleData | undefined;
      set((state) => {
        targetIdx = state.activeShotIndex;
        const shot = state.project.shots?.[targetIdx];
        const currentData = resolveShotTitleData(shot, targetIdx, state.titleConfig, state.titleAlign);
        const baseConfig =
          currentData.styleConfig ||
          shot?.titleStyleConfig ||
          buildTitlePresetConfigById(currentData.presetId || 'molten-gold');
        const swatchRef = buildTitlePresetConfigById(baseConfig.presetId || 'molten-gold');
        const accent = baseConfig.primaryColor || '#F59E0B';

        let nextGlow = baseConfig.glowIntensity;
        let nextGlowColor = swatchRef.glowColor || baseConfig.glowColor;
        let nextChromatic = 0;
        let nextStrokeWidth = 0;
        let nextPlate = { ...baseConfig.backdropPlate };
        let nextMotion = baseConfig.motionAnimation;
        let nextKeyframes = currentData.keyframes ? { ...currentData.keyframes } : undefined;

        switch (finish) {
          case 'clean': {
            nextGlow = 0.15;
            nextGlowColor = swatchRef.glowColor;
            nextChromatic = 0;
            nextStrokeWidth = 0;
            if (currentData.directorRole !== 'lower-3rd') {
              nextPlate = {
                enabled: false,
                background: 'transparent',
                border: 'none',
                backdropBlur: 0,
                padding: '0px',
                accentBarColor: accent
              };
            }
            break;
          }
          case 'halation': {
            nextGlow = 1.45;
            nextGlowColor = 'rgba(239, 68, 68, 0.85)';
            nextChromatic = 14;
            break;
          }
          case 'scrim': {
            nextGlow = Math.min(0.85, baseConfig.glowIntensity || 0.7);
            nextPlate = {
              enabled: true,
              background: 'linear-gradient(180deg, rgba(6, 6, 10, 0.72) 0%, rgba(6, 6, 10, 0.90) 100%)',
              border: `1px solid ${accent}44`,
              backdropBlur: 10,
              padding: '14px 26px',
              accentBarColor: accent
            };
            break;
          }
          case 'kinetic': {
            nextGlow = Math.max(0.85, baseConfig.glowIntensity || 0.9);
            nextMotion = 'kinetic-slam';
            nextKeyframes = {
              ...(nextKeyframes || {
                inAnim: 'kinetic-slam',
                midAnim: 'none',
                outAnim: 'dissolve-out',
                durationSec: 0.45,
                delaySec: 0,
                easingCurve: 'spring-overshoot',
                staggerMode: 'word'
              }),
              inAnim: 'kinetic-slam',
              durationSec: 0.42,
              easingCurve: 'spring-overshoot',
              staggerMode: 'word'
            };
            state.kineticReplayTick += 1;
            break;
          }
        }

        nextShotConfig = {
          ...baseConfig,
          glowIntensity: nextGlow,
          glowColor: nextGlowColor,
          chromaticAberration: nextChromatic,
          strokeWidth: nextStrokeWidth,
          backdropPlate: nextPlate,
          motionAnimation: nextMotion,
          opticalFinish: finish
        };

        const nextLayers = currentData.layers
          ? {
              ...currentData.layers,
              bangla: {
                ...(currentData.layers.bangla || {}),
                bloomIntensity: nextGlow,
                strokeWidth: nextStrokeWidth
              }
            }
          : currentData.layers;

        state.titleConfig.glowIntensity = nextGlow;
        state.titleConfig.opticalFinish = finish;
        state.titleConfig.activePresetConfig = nextShotConfig;

        if (shot) {
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            glowIntensity: nextGlow,
            opticalFinish: finish,
            entranceAnim: nextMotion,
            keyframes: nextKeyframes ?? currentData.keyframes,
            layers: nextLayers,
            styleConfig: nextShotConfig
          };
          shot.titleData = nextTitleData;
          shot.updatedAt = Date.now();
        }
      });

      if (nextShotConfig && nextTitleData) {
        eventBus.emit('shot:updated', {
          index: targetIdx,
          partial: {
            titleStyleConfig: nextShotConfig,
            titleData: nextTitleData
          }
        });
      }
    },
    setTitleTracking: (tracking: number) => {
      const nextTracking = Math.max(0.0, Math.min(0.6, Math.round(tracking * 100) / 100));
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
          const nextLayers = currentData.layers
            ? {
                ...currentData.layers,
                bangla: { ...(currentData.layers.bangla || {}), letterSpacing: nextTracking }
              }
            : currentData.layers;
          shot.titleStyleConfig = nextShotConfig;
          nextTitleData = {
            ...currentData,
            letterTracking: nextTracking,
            layers: nextLayers,
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
        zone9?: ShotTitleData['zone9'];
        kineticEntrance?: ShotTitleData['kineticEntrance'];
        fontScale: number;
        glowIntensity: number;
        letterTracking: number;
        verticalOffset: number;
        horizontalOffset?: number;
        safeGuard?: boolean;
        directorRole?: ShotTitleData['directorRole'];
        opticalFinish?: ShotTitleData['opticalFinish'];
        entranceAnim?: ShotTitleData['entranceAnim'];
        exitAnim?: ShotTitleData['exitAnim'];
        keyframes?: ShotTitleData['keyframes'];
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
          horizontalOffset: sourceData.horizontalOffset ?? 0,
          safeGuard: Boolean(sourceData.safeGuard),
          ...(sourceData.directorRole ? { directorRole: sourceData.directorRole } : {}),
          ...(sourceData.opticalFinish ? { opticalFinish: sourceData.opticalFinish } : {}),
          entranceAnim: sourceData.entranceAnim,
          exitAnim: sourceData.exitAnim,
          ...(sourceData.keyframes ? { keyframes: { ...sourceData.keyframes } } : {}),
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
