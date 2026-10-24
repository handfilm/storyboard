/**
 * @file /src/App.tsx
 * @description Master Studio Shell & Layout Controller for RAWx Storyboard Engine.
 * Features unified CSS Grid shell: TopBar, Collapsible LeftRail, MainWorkspace,
 * Contextual Inspector, Resizable BottomDock, Command Palette, Components Matrix (12/13),
 * Theme Settings, and Self-Test Diagnostics.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnthologyFrame, AnthologyProject, AspectRatio, LutPreset, ViewMode } from './types/anthology';
import { generateInitialFrames, samplePacks } from './data/frames';
import { WorkspaceMode, themeManager } from './core/theme';
import { featureFlags } from './core/featureFlags';
import { LeftRail, StudioModuleId } from './components/LeftRail';
import { MainWorkspace } from './components/MainWorkspace';
import { ControlDock } from './components/ControlDock';
import { DirectorInspector } from './components/DirectorInspector';
import { PublishModal } from './components/PublishModal';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SelfTestModal } from './components/SelfTestModal';
import { ContactSheetModal } from './components/ContactSheetModal';
import { CanvasLiquifyModal } from './components/CanvasLiquifyModal';
import { VideoScopesModal } from './components/VideoScopesModal';
import { AnimaticPlayerModal } from './components/AnimaticPlayerModal';
import { OpticalMonitorModal } from './components/OpticalMonitorModal';
import { StudioDrawer } from './components/StudioDrawer';
import { R2AutomationModal } from './components/R2AutomationModal';
import { CutNativeExportModal, ExportModalTab } from './components/CutNativeExportModal';
import { CompilationWizardModal } from './components/CompilationWizardModal';
import { exportToOTIO, exportToCMX3600EDL, exportToFountainScreenplay, exportToSRT, exportToCSVShotList, triggerFileDownload } from './data/hollywoodExporters';
import { 
  ComponentsMatrixPopover, 
  ComponentVisibility, 
  DEFAULT_COMPONENT_VISIBILITY,
  loadSavedComponentVisibility, 
  saveComponentVisibility,
  countActiveComponentToggles,
  clampTitleOpacity,
  applyTitleBlockOpacityCssVar
} from './components/ComponentsMatrixPopover';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { audioEngine } from './utils/audioEngine';
import { calculateSlideshowInterval } from './utils/engine';
import { exportFullIdbBackup } from './utils/backup';
import { storageManager, SaveState } from './core/storage';
import { ProjectV1 } from './types/projectSchema';
import { migrateToProjectV1, convertShotV1ToFrame } from './utils/projectMigration';
import { CrashRecoveryBanner } from './components/CrashRecoveryBanner';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { LandingWalkthrough } from './components/landing/LandingWalkthrough';
import { HandfilmHome } from './components/home/HandfilmHome';
import { useStudioStore } from './core/store';
import { eventBus } from './core/eventBus';
import { studioDraftDb } from './services/db';
import { PlaybackMode } from './types/editor';
import { SlideDraft, AspectRatioType, ProjectDraft } from './types/project';
import { CinemaPlayer } from './components/player/CinemaPlayer';
import { keyScopeManager } from './core/keyScopeManager';
import { ScreenRecorderFloatingBar } from './components/recorder/ScreenRecorderFloatingBar';
import { FloatingPillRecorder } from './components/recorder/FloatingPillRecorder';
import { QuickTrimPreviewModal } from './components/recorder/QuickTrimPreviewModal';
import { AdvancedTrimmerModal } from './components/recorder/AdvancedTrimmerModal';
import { RecordedCaptureResult } from './services/screenRecorderEngine';
import { StageHeader, StagePanelType } from './components/StageHeader';
import { MultiCamGroup } from './types/multicam';
import {
  clampShotDuration,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotTargetFps,
  resolveGlobalTimeToShot
} from './types/storyboard';
import { MultiCamGridConfig } from './components/multicam/MultiCamViewportGrid';
import { DEFAULT_SAMPLE_MULTICAM_GROUP } from './components/multicam/MultiCamGridMonitor';
import { projectStorageEngine, SovereignProjectState } from './services/projectStorageEngine';

export default function App() {
  const [project, setProject] = useState<AnthologyProject>(() => ({
    title: "RAWx // Master Anthology Engine 100",
    director: "Rakib Himon",
    nodeLocation: "DHAKA_01",
    aspectRatio: "2.39:1",
    frames: generateInitialFrames(),
    createdAt: new Date().toISOString(),
    version: "1.0.0"
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentView, setCurrentView] = useState<'HOME' | 'STUDIO'>('HOME');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('STAGE');
  const [activeModule, setActiveModule] = useState<StudioModuleId>('PLAYER');
  const [isProMode, setIsProMode] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [showHud, setShowHud] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2.39:1');
  const [fitMode, setFitMode] = useState<'cover' | 'contain' | 'fill'>('cover');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.4);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('sequence');
  const [activeDualPanel, setActiveDualPanel] = useState<StagePanelType>('TACTILE_STAGE');
  const [isOpticalMonitorModalOpen, setIsOpticalMonitorModalOpen] = useState(false);
  const [slideTimeSec, setSlideTimeSec] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // New Studio State & Preserved Optical Controls
  const [isPanActive, setIsPanActive] = useState(false);
  const [panOffsets, setPanOffsets] = useState<Record<number, number>>({});
  const [showGuides, setShowGuides] = useState(false);
  const [componentsVisibility, setComponentsVisibility] = useState<ComponentVisibility>(loadSavedComponentVisibility);

  // Modals and popovers state
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSelfTestOpen, setIsSelfTestOpen] = useState(false);
  const [isLiquifyOpen, setIsLiquifyOpen] = useState(false);
  const [isComponentsOpen, setIsComponentsOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isVideoScopesOpen, setIsVideoScopesOpen] = useState(false);
  const [isAnimaticOpen, setIsAnimaticOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isR2AutomationOpen, setIsR2AutomationOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [exportStudioTab, setExportStudioTab] = useState<ExportModalTab>('mp4');
  const [isCompilationWizardOpen, setIsCompilationWizardOpen] = useState(false);

  const handleOpenExportStudio = useCallback((tab: ExportModalTab = 'mp4') => {
    setExportStudioTab(tab);
    setIsExportStudioOpen(true);
  }, []);

  const [isCinemaPlayerOpen, setIsCinemaPlayerOpen] = useState(false);
  const [isSnapToBeat, setIsSnapToBeat] = useState(false);
  const [detectedBpm, setDetectedBpm] = useState(120);

  // Screen Recorder & WebCodecs Trimmer Suite State
  const [isScreenRecorderOpen, setIsScreenRecorderOpen] = useState(false);
  const [capturedResult, setCapturedResult] = useState<RecordedCaptureResult | null>(null);
  const [isQuickTrimOpen, setIsQuickTrimOpen] = useState(false);
  const [isAdvancedTrimmerOpen, setIsAdvancedTrimmerOpen] = useState(false);
  const [advancedTrimmerInSec, setAdvancedTrimmerInSec] = useState(0);
  const [advancedTrimmerOutSec, setAdvancedTrimmerOutSec] = useState<number | undefined>(undefined);

  const handleRecordingComplete = useCallback((result: RecordedCaptureResult) => {
    setCapturedResult(result);
    setIsQuickTrimOpen(true);
    setIsScreenRecorderOpen(false);
  }, []);

  const handleOpenAdvancedTrimmer = useCallback((result: RecordedCaptureResult, initialIn: number, initialOut: number) => {
    setCapturedResult(result);
    setAdvancedTrimmerInSec(initialIn);
    setAdvancedTrimmerOutSec(initialOut);
    setIsQuickTrimOpen(false);
    setIsAdvancedTrimmerOpen(true);
  }, []);

  const [titleAnimation, setTitleAnimation] = useState<'flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter'>('flare');
  const [historyStack, setHistoryStack] = useState<AnthologyProject[]>([]);
  const [redoStack, setRedoStack] = useState<AnthologyProject[]>([]);

  // M2 Persistence Core State
  const [activeProjectId, setActiveProjectId] = useState<string>('default-project');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [crashRecoveredProject, setCrashRecoveredProject] = useState<ProjectV1 | null>(null);
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Landing Walkthrough Modal State (First-time visitors see full 10-slide walkthrough)
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rawx_walkthrough_seen') !== 'true';
    } catch {
      return false;
    }
  });

  const handleCloseWalkthrough = useCallback(() => {
    setShowWalkthrough(false);
    try {
      localStorage.setItem('rawx_walkthrough_seen', 'true');
    } catch (e) {
      console.warn('Could not save rawx_walkthrough_seen to localStorage', e);
    }
  }, []);

  // Multi-Cam Sovereign State in App Shell
  const [multiCamGroup, setMultiCamGroup] = useState<MultiCamGroup>(() => DEFAULT_SAMPLE_MULTICAM_GROUP);
  const [multiCamLayoutConfig, setMultiCamLayoutConfig] = useState<MultiCamGridConfig>('2x2');

  const handleToggleMultiCam = useCallback(() => {
    setCurrentView('STUDIO');
    setWorkspaceMode('STAGE');
    setIsDrawerOpen(false);
    setActiveDualPanel(prev => (prev === 'MULTICAM' && workspaceMode === 'STAGE' && currentView === 'STUDIO' ? 'TACTILE_STAGE' : 'MULTICAM'));
  }, [workspaceMode, currentView]);

  const sessionRestoreInputRef = useRef<HTMLInputElement>(null);

  // 1. Hard Reload Recovery: Automatically hydrate state from IndexedDB
  useEffect(() => {
    projectStorageEngine.loadSession().then(session => {
      if (!session) return;
      if (typeof session.activeShotIndex === 'number') {
        setCurrentIndex(session.activeShotIndex);
      }
      if (session.multiCamGroup) {
        setMultiCamGroup(session.multiCamGroup);
      }
      if (Array.isArray(session.shots) && session.shots.length > 0) {
        setProject(prev => {
          const mergedFrames = prev.frames.map((f, i) => {
            const saved = session.shots.find(s => s.shotIndex === i);
            if (saved) {
              return {
                ...f,
                title: saved.title || f.title,
                bengaliTitle: saved.bengaliTitle || f.bengaliTitle,
                tagline: saved.tagline || f.tagline,
                directorNotes: saved.directorNotes || f.directorNotes,
                soundCue: saved.soundCue || f.soundCue,
                slideHoldSec: saved.durationSeconds || f.slideHoldSec,
                imageUrl: saved.imageUrl || f.imageUrl,
                isVideo: saved.isVideo ?? f.isVideo
              };
            }
            return f;
          });
          return {
            ...prev,
            title: session.projectTitle || prev.title,
            frames: mergedFrames
          };
        });
      }
    }).catch(err => console.warn('[App] Session load error:', err));
  }, []);

  // 2. Seamless IndexedDB Autosave: Debounce timeline mutations by 1.5 seconds
  useEffect(() => {
    const stateToSave: SovereignProjectState = {
      version: '1.0.0',
      updatedAt: Date.now(),
      activeShotIndex: currentIndex,
      projectTitle: project.title,
      shots: project.frames.map((f, i) => ({
        id: String(f.id ?? i),
        shotIndex: i,
        title: f.title,
        bengaliTitle: f.bengaliTitle || '',
        englishTitle: f.title,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        durationSeconds: f.slideHoldSec ?? 12.0,
        imageUrl: f.imageUrl,
        isVideo: f.isVideo,
        aspectRatio: f.aspectRatio,
        lutFilter: f.lutFilter
      })),
      multiCamGroup: multiCamGroup
    };

    projectStorageEngine.scheduleAutosave(stateToSave, 1500);
  }, [currentIndex, project.title, project.frames, multiCamGroup]);

  // 3. Quick Project Backup (.JSON) Handlers
  const handleSaveProjectJson = useCallback(() => {
    const stateToSave: SovereignProjectState = {
      version: '1.0.0',
      updatedAt: Date.now(),
      activeShotIndex: currentIndex,
      projectTitle: project.title,
      shots: project.frames.map((f, i) => ({
        id: String(f.id ?? i),
        shotIndex: i,
        title: f.title,
        bengaliTitle: f.bengaliTitle || '',
        englishTitle: f.title,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        durationSeconds: f.slideHoldSec ?? 12.0,
        imageUrl: f.imageUrl,
        isVideo: f.isVideo,
        aspectRatio: f.aspectRatio,
        lutFilter: f.lutFilter
      })),
      multiCamGroup: multiCamGroup
    };
    projectStorageEngine.exportProjectJson(stateToSave, 'handfilm_sovereign_project');
  }, [currentIndex, project.title, project.frames, multiCamGroup]);

  const handleRestoreProjectJson = useCallback(() => {
    sessionRestoreInputRef.current?.click();
  }, []);

  const handleFileRestoreChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await projectStorageEngine.importProjectJson(file);
      if (typeof imported.activeShotIndex === 'number') {
        setCurrentIndex(imported.activeShotIndex);
      }
      if (imported.multiCamGroup) {
        setMultiCamGroup(imported.multiCamGroup);
      }
      if (Array.isArray(imported.shots) && imported.shots.length > 0) {
        setProject(prev => {
          const merged = prev.frames.map((f, i) => {
            const s = imported.shots.find(shot => shot.shotIndex === i);
            if (s) {
              return {
                ...f,
                title: s.title || f.title,
                bengaliTitle: s.bengaliTitle || f.bengaliTitle,
                tagline: s.tagline || f.tagline,
                directorNotes: s.directorNotes || f.directorNotes,
                soundCue: s.soundCue || f.soundCue,
                slideHoldSec: s.durationSeconds || f.slideHoldSec,
                imageUrl: s.imageUrl || f.imageUrl,
                isVideo: s.isVideo ?? f.isVideo
              };
            }
            return f;
          });
          return {
            ...prev,
            title: imported.projectTitle || prev.title,
            frames: merged
          };
        });
      }
    } catch (err: any) {
      console.warn('[App] Failed to restore project JSON:', err);
    } finally {
      if (e.target) e.target.value = '';
    }
  }, []);

  // ==========================================
  // Core Audio Engine Handlers (Declared upfront to prevent Temporal Dead Zone / ReferenceError)
  // ==========================================
  const toggleAudio = useCallback(() => {
    setIsAudioMuted(prev => {
      const nextState = !prev;
      try {
        audioEngine.setMuted(nextState);
        if (!nextState) {
          audioEngine.setVolume(audioVolume);
          audioEngine.playShutterClick();
        }
      } catch (err) {
        console.warn('[Audio] toggleAudio error:', err);
      }
      return nextState;
    });
  }, [audioVolume]);

  const playAudio = useCallback(() => {
    if (!isAudioMuted) {
      try {
        audioEngine.playAudio();
      } catch (err) {
        console.warn('[Audio] playAudio error:', err);
      }
    }
  }, [isAudioMuted]);

  const pauseAudio = useCallback(() => {
    try {
      audioEngine.pauseAudio();
    } catch (err) {
      console.warn('[Audio] pauseAudio error:', err);
    }
  }, []);

  const handleLoadAudioFile = useCallback(async (file: File) => {
    try {
      const analysis = await audioEngine.loadAndAnalyzeAudioFile(file);
      setDetectedBpm(analysis.detectedBpm);
      audioEngine.setMuted(false);
      setIsAudioMuted(false);
      audioEngine.setVolume(audioVolume);
    } catch (err) {
      console.warn('Audio track ingestion error:', err);
    }
  }, [audioVolume]);

  const handleToggleSnapToBeat = useCallback(() => {
    setIsSnapToBeat(prev => {
      const next = !prev;
      try {
        audioEngine.setSnapToBeatEnabled(next);
      } catch (err) {
        console.warn('SnapToBeat error:', err);
      }
      return next;
    });
  }, []);

  const applyProjectV1ToState = useCallback((p: ProjectV1) => {
    if (!p) return;
    const safeShots = Array.isArray(p.shots) && p.shots.length > 0 ? p.shots : [];
    const baseFrames = generateInitialFrames();
    
    // Guarantee full 100 frames
    const rawFrames = safeShots.length > 0
      ? safeShots.map((shot, idx) => convertShotV1ToFrame(shot, idx))
      : baseFrames;
    
    const frames = rawFrames.length >= 100
      ? rawFrames
      : [
          ...rawFrames,
          ...baseFrames.slice(rawFrames.length)
        ];

    setActiveProjectId(p.id || 'default-project');
    setProject({
      title: p.meta?.title || "RAWx // Master Anthology Engine 100",
      director: p.meta?.director || "Rakib Himon",
      nodeLocation: p.meta?.nodeLocation || "DHAKA_01",
      aspectRatio: p.settings?.aspectRatio || "2.39:1",
      frames,
      createdAt: p.meta?.createdAt || new Date().toISOString(),
      version: p.meta?.version || "1.0.0"
    });
    setAspectRatio(p.settings?.aspectRatio || '2.39:1');
    setFitMode(p.settings?.fitMode || 'cover');
    if (p.settings?.componentsVisibility) {
      const savedLocal = loadSavedComponentVisibility();
      const hasSavedLocal =
        typeof window !== 'undefined' && Boolean(localStorage.getItem('rawx_components_v1'));
      const mergedVisibility: ComponentVisibility = {
        ...DEFAULT_COMPONENT_VISIBILITY,
        ...p.settings.componentsVisibility,
        ...(hasSavedLocal ? savedLocal : {}),
        titleOpacity: clampTitleOpacity(
          hasSavedLocal
            ? savedLocal.titleOpacity
            : (p.settings.componentsVisibility.titleOpacity ?? DEFAULT_COMPONENT_VISIBILITY.titleOpacity)
        )
      };
      applyTitleBlockOpacityCssVar(mergedVisibility.titleOpacity ?? 1.0);
      setComponentsVisibility(mergedVisibility);
      saveComponentVisibility(mergedVisibility);
    }
    const loadedOffsets: Record<number, number> = {};
    safeShots.forEach((s, idx) => {
      if (typeof s.panY === 'number') {
        loadedOffsets[idx] = s.panY;
      }
    });
    setPanOffsets(loadedOffsets);

    // Sync all loaded shots to useStudioStore so CinemaStage, BoardStudio, MediaStudio are in lockstep
    try {
      const store = useStudioStore.getState();
      safeShots.forEach((s, idx) => {
        store.updateShot(idx, {
          imageUrl: s.imageUrl,
          isVideo: s.isVideo,
          panY: typeof s.panY === 'number' ? s.panY : 50,
          title: s.titleEn,
          bengaliTitle: s.titleBn,
          tagline: s.subtitle,
          directorNotes: s.directorNotes,
          soundCue: s.soundCue,
          tags: s.tags
        });
      });
    } catch {
      // safe fallback
    }
  }, []);

  // Listen to shot updates from MediaStudio, CinemaStage, and BoardStudio
  useEffect(() => {
    const unsub = eventBus.on('shot:updated', ({ index, partial }: { index: number; partial: any }) => {
      setProject(prev => {
        const nextFrames = [...prev.frames];
        if (nextFrames[index]) {
          const nextDur =
            typeof partial.durationSec === 'number' && partial.durationSec > 0
              ? clampShotDuration(partial.durationSec)
              : typeof partial.slideHoldSec === 'number' && partial.slideHoldSec > 0
              ? clampShotDuration(partial.slideHoldSec)
              : typeof partial.durationSeconds === 'number' && partial.durationSeconds > 0
              ? clampShotDuration(partial.durationSeconds)
              : nextFrames[index].durationSec;
          nextFrames[index] = {
            ...nextFrames[index],
            imageUrl: partial.imageUrl !== undefined ? partial.imageUrl : nextFrames[index].imageUrl,
            isVideo: partial.isVideo !== undefined ? partial.isVideo : nextFrames[index].isVideo,
            title: partial.title !== undefined ? partial.title : nextFrames[index].title,
            bengaliTitle: partial.bengaliTitle !== undefined ? partial.bengaliTitle : nextFrames[index].bengaliTitle,
            tagline: partial.tagline !== undefined ? partial.tagline : nextFrames[index].tagline,
            slideHoldSec: nextDur !== undefined ? nextDur : nextFrames[index].slideHoldSec,
            durationSec: nextDur !== undefined ? nextDur : nextFrames[index].durationSec
          };
        }
        return { ...prev, frames: nextFrames };
      });
    });

    const unsubAsset = eventBus.on('asset_assigned_to_shot', ({ assetId, shotIndex, blobUrl, meta }: any) => {
      if (typeof shotIndex === 'number' && blobUrl) {
        const isVid = meta?.mimeType?.startsWith('video') ?? false;
        setProject(prev => {
          const nextFrames = [...prev.frames];
          if (nextFrames[shotIndex]) {
            nextFrames[shotIndex] = {
              ...nextFrames[shotIndex],
              imageUrl: blobUrl,
              isVideo: isVid
            };
          }
          return { ...prev, frames: nextFrames };
        });
        try {
          useStudioStore.getState().updateShot(shotIndex, {
            imageUrl: blobUrl,
            isVideo: isVid
          });
        } catch {}
      }
    });

    const unsubRecorder = eventBus.on('recorder:open', () => {
      setIsScreenRecorderOpen(true);
    });
    const unsubExport = eventBus.on('export:open', () => {
      handleOpenExportStudio('mp4');
    });
    const unsubShortcuts = eventBus.on('shortcuts:open', () => {
      setIsShortcutsOpen(true);
    });
    const unsubDiagnostics = eventBus.on('diagnostics:open', () => {
      setIsSelfTestOpen(true);
    });
    const unsubTheme = eventBus.on('theme:open', () => {
      setIsThemeSettingsOpen(true);
    });

    return () => {
      unsub();
      unsubAsset();
      unsubRecorder();
      unsubExport();
      unsubShortcuts();
      unsubDiagnostics();
      unsubTheme();
    };
  }, [handleOpenExportStudio]);

  // Initialize Storage Core & Check Crash Status on Mount
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = storageManager.onSaveStateChange((st) => {
      if (isMounted) setSaveState(st);
    });

    const initPersistence = async () => {
      // 1. Lock browser storage against OS eviction via navigator.storage.persist()
      await studioDraftDb.ensureStoragePersistence();
      await storageManager.init();
      if (!isMounted) return;

      // 2. Restore active session preferences (zero-loss refresh guard)
      const session = studioDraftDb.getActiveSession();
      if (session && isMounted) {
        if (session.activeProjectId) setActiveProjectId(session.activeProjectId);
        if (typeof session.activeSlideIndex === 'number') setCurrentIndex(session.activeSlideIndex);
        if (session.playbackMode) setPlaybackMode(session.playbackMode);
        if (session.activeDualPanel || session.activePanel) {
          const panel = (session.activeDualPanel || session.activePanel);
          setActiveDualPanel(panel as any || 'TACTILE_STAGE');
        }
      }

      const crash = storageManager.getCrashRecovery();
      if (crash.hasCrash && crash.recoveredProject) {
        setCrashRecoveredProject(crash.recoveredProject);
      }

      const loaded = await storageManager.loadProject(session?.activeProjectId || undefined);
      if (loaded && isMounted) {
        applyProjectV1ToState(loaded);
        if (session && typeof session.activeSlideIndex === 'number') {
          setCurrentIndex(session.activeSlideIndex);
        }
        // Dismiss and bypass the "SESSION RECOVERY AVAILABLE" yellow banner automatically once state is hydrated from IndexedDB
        await storageManager.dismissCrashRecovery();
        setCrashRecoveredProject(null);
      }

      // 3. Auto-hydrate bulletproof media_vault and timeline_slots on mount
      try {
        let vaultItems = await studioDraftDb.getAllVaultMedia();
        if (vaultItems.length === 0) {
          await studioDraftDb.seedDefaultVaultAssets();
          vaultItems = await studioDraftDb.getAllVaultMedia();
        }
        const slots = await studioDraftDb.getAllTimelineSlots();
        for (const slot of slots) {
          const item = vaultItems.find(v => v.id === slot.mediaId);
          if (item && item.blob) {
            const url = studioDraftDb.getActiveMediaUrl(item.id, item.blob);
            const isVid = item.mimeType.startsWith('video');
            setProject(prev => {
              const nextFrames = [...prev.frames];
              if (nextFrames[slot.slotIndex]) {
                nextFrames[slot.slotIndex] = {
                  ...nextFrames[slot.slotIndex],
                  imageUrl: url,
                  isVideo: isVid
                };
              }
              return { ...prev, frames: nextFrames };
            });
            useStudioStore.getState().updateShot(slot.slotIndex, {
              imageUrl: url,
              isVideo: isVid
            });
          }
        }
      } catch (err) {
        console.warn('[App] Vault hydration error on mount:', err);
      }

      setIsStorageInitialized(true);
    };

    initPersistence();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyProjectV1ToState]);

  // Persist Active Session to LocalStorage for zero-loss reload
  useEffect(() => {
    studioDraftDb.saveActiveSession({
      activeProjectId,
      activeSlideIndex: currentIndex,
      playbackMode,
      activeDualPanel
    });
  }, [activeProjectId, currentIndex, playbackMode, activeDualPanel]);

  // Debounced (400ms) Autosave to studioDraftDb (rawx_storyboard_studio_db v4) & legacy sync
  useEffect(() => {
    if (!isStorageInitialized) return;

    // 1. Legacy ProjectV1 format
    const v1 = migrateToProjectV1({
      id: activeProjectId,
      title: project.title,
      director: project.director,
      nodeLocation: project.nodeLocation,
      aspectRatio: aspectRatio,
      frames: project.frames.map((f, i) => ({
        ...f,
        adjustments: f.adjustments
      })),
      createdAt: project.createdAt,
      version: project.version
    });

    v1.settings.fitMode = fitMode;
    v1.settings.componentsVisibility = componentsVisibility;
    v1.shots.forEach((s, i) => {
      s.panY = panOffsets[i] ?? 50;
    });

    storageManager.saveProjectDebounced(v1);

    // 2. CapCut-Style Local Project Draft (v4) with Elastic Multi-Cadence slide durations
    const slideDrafts: SlideDraft[] = project.frames.map((f, i) => {
      const dur = getShotDurationSec(f, project.defaultSlideHoldSec ?? 12.0);
      return {
        id: `slide_${f.id ?? i}`,
        orderIndex: i,
        duration: dur,
        durationSec: dur,
        targetFps: getShotTargetFps(f, 24),
        inPointMs: f.inPointMs,
        outPointMs: f.outPointMs,
        beatSnapEnabled: f.beatSnapEnabled,
        remoteUrl: f.imageUrl,
        titleBn: f.bengaliTitle,
        titleEn: f.title,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        aspectRatio: aspectRatio as AspectRatioType,
        colorAccent: f.colorAccent,
        lutFilter: f.lutFilter,
        isVideo: f.isVideo,
        panY: panOffsets[i] ?? 50
      };
    });

    const draft: ProjectDraft = {
      projectId: activeProjectId,
      activeSlideIndex: currentIndex,
      slides: slideDrafts,
      config: {
        aspectRatio: aspectRatio as AspectRatioType,
        fps: 24,
        playbackMode,
        loop: true,
        masterVolume: audioVolume,
        isMuted: isAudioMuted
      },
      updatedAt: Date.now()
    };

    studioDraftDb.queueAutosave(draft, {
      title: project.title,
      director: project.director,
      aspectRatio: aspectRatio as AspectRatioType
    });
  }, [project, panOffsets, aspectRatio, fitMode, componentsVisibility, isStorageInitialized, activeProjectId, currentIndex, playbackMode, audioVolume, isAudioMuted]);

  const handleSwitchProject = async (id: string) => {
    // Clean up Object URLs with URL.revokeObjectURL() on draft switch to eliminate leaks
    studioDraftDb.revokeAllTrackedUrls();

    const loadedDraft = await studioDraftDb.getProjectDraft(id);
    if (loadedDraft) {
      setActiveProjectId(id);
      setCurrentIndex(loadedDraft.activeSlideIndex || 0);
      setAspectRatio(loadedDraft.config.aspectRatio || '2.39:1');
      if (loadedDraft.slides && loadedDraft.slides.length > 0) {
        setProject(prev => ({
          ...prev,
          title: loadedDraft.projectId,
          frames: loadedDraft.slides.map((s, idx) => {
            const restoredDur = getShotDurationSec(s, 12.0);
            return {
              id: idx + 1,
              epNumber: String(idx + 1).padStart(3, '0'),
              title: s.titleEn || `Shot ${idx + 1}`,
              bengaliTitle: s.titleBn || '',
              tagline: s.tagline || '',
              directorNotes: s.directorNotes || '',
              soundCue: s.soundCue || '',
              cameraSpec: s.cameraSpec as any || {
                focalLength: '35mm High-Speed Master',
                aperture: 'f/1.4',
                shutter: '1/48s 180°',
                iso: 'ISO 400',
                sensor: 'Full-Frame Cine',
                format: 'RAW 14-BIT ARRI'
              },
              imageUrl: s.remoteUrl || '',
              isVideo: s.isVideo || false,
              panY: s.panY ?? 50,
              colorAccent: s.colorAccent || '#D4AF37',
              hoverStyle: 0,
              lutFilter: (s.lutFilter as any) || 'cinematic',
              aspectRatio: s.aspectRatio as any || '2.39:1',
              slideHoldSec: restoredDur,
              durationSec: restoredDur,
              targetFps: getShotTargetFps(s, 24),
              inPointMs: s.inPointMs,
              outPointMs: s.outPointMs,
              beatSnapEnabled: s.beatSnapEnabled,
              adjustments: s.adjustments || {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                bloom: 30,
                grain: 15,
                motionBlur: 50,
                vignette: 40
              },
              tags: ['Scene', `${restoredDur}s`]
            };
          })
        }));
      }
    } else {
      const loaded = await storageManager.loadProject(id);
      if (loaded) {
        applyProjectV1ToState(loaded);
        setCurrentIndex(0);
      }
    }
  };

  const handleRestoreCrash = async (recovered: ProjectV1) => {
    applyProjectV1ToState(recovered);
    await storageManager.dismissCrashRecovery();
    setCrashRecoveredProject(null);
    storageManager.saveProjectDebounced(recovered);
  };

  const handleDismissCrash = async () => {
    await storageManager.dismissCrashRecovery();
    setCrashRecoveredProject(null);
  };

  // Navigate to frame with audio feedback and reset slide timecode
  const goToFrame = useCallback((index: number) => {
    const total = project.frames.length;
    const nextIndex = ((index % total) + total) % total;
    setCurrentIndex(nextIndex);
    setSlideTimeSec(0);
    try {
      useStudioStore.getState().setActiveShotIndex(nextIndex);
      useStudioStore.getState().setSlideTimeSec(0);
    } catch {}
    audioEngine.playShutterClick();
  }, [project.frames.length]);

  const nextFrame = useCallback(() => goToFrame(currentIndex + 1), [goToFrame, currentIndex]);
  const prevFrame = useCallback(() => goToFrame(currentIndex - 1), [goToFrame, currentIndex]);

  // Frame Stepping (-1F / +1F at active shot's targetFps)
  const handleStepFrame = useCallback((forward: boolean) => {
    setIsPlaying(false);

    const activeShot = project.frames[currentIndex] || project.frames[0];
    const shotFps = getShotTargetFps(activeShot, 24);
    const FRAME_DELTA = 1 / shotFps;
    const SLIDE_DURATION = getShotDurationSec(activeShot, project.defaultSlideHoldSec ?? 12.0);
    const totalCount = Math.max(1, project.frames.length);

    if (playbackMode === 'solo') {
      setSlideTimeSec(prev => {
        let updated = forward ? prev + FRAME_DELTA : prev - FRAME_DELTA;
        if (updated < 0) updated = 0;
        if (updated > SLIDE_DURATION) updated = SLIDE_DURATION;
        try {
          useStudioStore.getState().setSlideTimeSec(updated);
        } catch {}
        return updated;
      });
    } else {
      setSlideTimeSec(prev => {
        const updated = forward ? prev + FRAME_DELTA : prev - FRAME_DELTA;
        if (updated >= SLIDE_DURATION) {
          const nextIdx = (currentIndex + 1) % totalCount;
          setCurrentIndex(nextIdx);
          try {
            useStudioStore.getState().setActiveShotIndex(nextIdx);
            useStudioStore.getState().setSlideTimeSec(0);
          } catch {}
          return 0;
        } else if (updated < 0) {
          const prevIdx = (currentIndex - 1 + totalCount) % totalCount;
          const prevShot = project.frames[prevIdx] || activeShot;
          const prevShotDur = getShotDurationSec(prevShot, project.defaultSlideHoldSec ?? 12.0);
          const prevShotFps = getShotTargetFps(prevShot, 24);
          setCurrentIndex(prevIdx);
          const loopTime = Math.max(0, prevShotDur - 1 / prevShotFps);
          try {
            useStudioStore.getState().setActiveShotIndex(prevIdx);
            useStudioStore.getState().setSlideTimeSec(loopTime);
          } catch {}
          return loopTime;
        }
        try {
          useStudioStore.getState().setSlideTimeSec(updated);
        } catch {}
        return updated;
      });
    }
    audioEngine.playShutterClick();
  }, [playbackMode, project.frames, project.defaultSlideHoldSec, currentIndex]);

  // Local slide time scrubbing (0 to active shot's durationSec)
  const handleScrubSlideTime = useCallback((timeSec: number) => {
    const activeShot = project.frames[currentIndex] || project.frames[0];
    const maxDur = getShotDurationSec(activeShot, project.defaultSlideHoldSec ?? 12.0);
    const clamped = Math.max(0, Math.min(maxDur, timeSec));
    setSlideTimeSec(clamped);
    try {
      useStudioStore.getState().setSlideTimeSec(clamped);
    } catch {}
  }, [project.frames, project.defaultSlideHoldSec, currentIndex]);

  // Global Elastic Sequence time scrubbing (0 to sum(shots.map(s => s.durationSec)))
  const handleScrubGlobalTime = useCallback((globalSec: number) => {
    const resolved = resolveGlobalTimeToShot(
      project.frames,
      globalSec,
      project.defaultSlideHoldSec ?? 12.0
    );
    setCurrentIndex(resolved.shotIndex);
    setSlideTimeSec(resolved.localTimeSec);
    try {
      useStudioStore.getState().setActiveShotIndex(resolved.shotIndex);
      useStudioStore.getState().setSlideTimeSec(resolved.localTimeSec);
    } catch {}
  }, [project.frames, project.defaultSlideHoldSec]);

  // Elastic Multi-Cadence Dual-Mode Playback Engine (0.5s rap cuts up to 30m holds)
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      audioEngine.pauseAudio();
      lastTimestampRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    if (!isAudioMuted) {
      audioEngine.playAudio();
    }

    const shotOffsets = getCumulativeShotOffsets(project.frames, project.defaultSlideHoldSec ?? 12.0);
    const currentFrame = project.frames[currentIndex] || project.frames[0];
    const currentOffset = shotOffsets[currentIndex];
    const shotSlideHold = currentOffset?.durationSec ?? getShotDurationSec(currentFrame, project.defaultSlideHoldSec ?? 12.0);
    const shotStartSec = currentOffset?.startSec ?? 0;

    const tick = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const deltaSec = ((now - lastTimestampRef.current) / 1000) * playbackSpeed;
        const safeDelta = Math.min(deltaSec, 0.25);

        setSlideTimeSec(prevTime => {
          const nextTime = prevTime + safeDelta;
          const globalPlaybackSec = shotStartSec + nextTime;
          audioEngine.syncPlaybackTime(globalPlaybackSec);

          try {
            useStudioStore.getState().setSlideTimeSec(nextTime);
          } catch {}

          if (playbackMode === 'sequence') {
            // Elastic Sequence mode: respect per-shot durationSec and snap to nearest audio beat when enabled
            const boundaryDuration = (isSnapToBeat || currentFrame?.beatSnapEnabled)
              ? audioEngine.snapDurationToNearestBeat(shotStartSec, shotSlideHold)
              : shotSlideHold;

            if (nextTime >= boundaryDuration) {
              const framesLength = Math.max(1, project.frames.length);
              const nextIdx = (currentIndex + 1) % framesLength;
              const nextShotDur = shotOffsets[nextIdx]?.durationSec ?? 12.0;
              const remainderTime = Math.min(nextShotDur * 0.5, Math.max(0, nextTime - boundaryDuration));
              setCurrentIndex(nextIdx);
              try {
                useStudioStore.getState().setActiveShotIndex(nextIdx);
                useStudioStore.getState().setSlideTimeSec(remainderTime);
              } catch {}
              return remainderTime;
            }
            return nextTime;
          } else {
            // Solo Scrub mode: loops strictly within this shot's elastic durationSec
            if (nextTime >= shotSlideHold) {
              const loopTime = shotSlideHold > 0 ? nextTime % shotSlideHold : 0;
              try {
                useStudioStore.getState().setSlideTimeSec(loopTime);
              } catch {}
              return loopTime;
            }
            return nextTime;
          }
        });
      }
      lastTimestampRef.current = now;
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, playbackMode, project.frames, project.defaultSlideHoldSec, playbackSpeed, isAudioMuted, currentIndex, isSnapToBeat]);

  // Milestone D1: Single Source of Truth Key Scope Manager Initialization & Sync
  useEffect(() => {
    const cleanupCheatSheet = keyScopeManager.setCheatSheetHandler(() => {
      setIsShortcutsOpen(prev => !prev);
    });
    const cleanupKeyScope = keyScopeManager.init();
    return () => {
      cleanupCheatSheet();
      cleanupKeyScope();
    };
  }, []);

  useEffect(() => {
    if (isCinemaPlayerOpen) {
      keyScopeManager.setActiveLayer('CINEMA');
    } else {
      keyScopeManager.setActiveLayer('STAGE');
    }
  }, [isCinemaPlayerOpen]);

  const isBlockingOverlayOpen =
    isShortcutsOpen ||
    isCommandPaletteOpen ||
    isExportStudioOpen ||
    isSettingsModalOpen ||
    isPublishModalOpen ||
    isProjectManagerOpen ||
    isLiquifyOpen ||
    showWalkthrough;

  useEffect(() => {
    return keyScopeManager.registerStageHandlers({
      onTogglePlay: () => {
        if (!isBlockingOverlayOpen) setIsPlaying(p => !p);
      },
      onNextShot: () => {
        if (!isBlockingOverlayOpen) nextFrame();
      },
      onPrevShot: () => {
        if (!isBlockingOverlayOpen) prevFrame();
      },
      onStepFrame: (fwd) => {
        if (!isBlockingOverlayOpen) handleStepFrame(fwd);
      },
      onToggleGrid: () => {
        if (!isBlockingOverlayOpen && (currentView === 'STUDIO' || isContactSheetOpen)) {
          setIsContactSheetOpen(o => !o);
        }
      },
      onOpenCinema: () => {
        if (!isBlockingOverlayOpen) setIsCinemaPlayerOpen(true);
      },
      onToggleMute: () => {
        if (!isBlockingOverlayOpen) toggleAudio();
      },
      onToggleComponentsMatrix: () => {
        if (!isBlockingOverlayOpen) setIsComponentsOpen(p => !p);
      }
    });
  }, [nextFrame, prevFrame, handleStepFrame, toggleAudio, isBlockingOverlayOpen, currentView, isContactSheetOpen]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Global Alt+R / Shift+R Screen Recorder Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside text input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Alt+R toggles dock; Shift+R opens dock if closed
      if (e.altKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
        e.preventDefault();
        setIsScreenRecorderOpen(prev => !prev);
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R' || e.code === 'KeyR')) {
        if (!isScreenRecorderOpen) {
          e.preventDefault();
          setIsScreenRecorderOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScreenRecorderOpen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 4K Cinema Still Capture
  const handleCaptureStill = () => {
    const frame = project.frames[currentIndex];
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderOverlay = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.fillText(`PLAYBACK // FILE_${frame.epNumber} [RAW 14-BIT ARRI]`, 50, 65);
      ctx.fillText(`FOCAL: ${frame.cameraSpec.focalLength} // ${frame.cameraSpec.aperture}`, 50, canvas.height - 50);

      ctx.textAlign = 'right';
      ctx.fillText(`NODE: ${project.nodeLocation} // SECURE ARCHIVE`, canvas.width - 50, 65);
      ctx.fillText(`A RAWx Storyboard // Director: ${project.director}`, canvas.width - 50, canvas.height - 50);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFE066';
      ctx.font = 'bold 64px Noto Serif Bengali, serif';
      ctx.fillText(frame.bengaliTitle, canvas.width / 2, canvas.height / 2 - 10);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Cinzel, serif';
      ctx.fillText(frame.title, canvas.width / 2, canvas.height / 2 + 40);

      ctx.fillStyle = '#FFE066';
      ctx.font = '18px Noto Serif Bengali, serif';
      ctx.fillText(frame.tagline, canvas.width / 2, canvas.height / 2 + 75);

      const a = document.createElement('a');
      a.download = `RAWx-Still-${frame.epNumber}-${frame.title.replace(/[^a-z0-9]/gi, '_')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    if (frame.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        renderOverlay();
      };
      img.onerror = () => renderOverlay();
      img.src = frame.imageUrl;
    } else {
      renderOverlay();
    }
  };

  const syncVisibilityToStore = useCallback((vis: ComponentVisibility) => {
    try {
      const store = useStudioStore.getState();
      const effectiveVisible = Boolean(
        vis.titlesAll && (vis.titleBn !== false || vis.titleEn !== false || vis.tagline !== false)
      );
      const nextOpacity = clampTitleOpacity(vis.titleOpacity);
      applyTitleBlockOpacityCssVar(nextOpacity);
      store.setTitleConfig({ showTitles: effectiveVisible, titleOpacity: nextOpacity });
      store.setVisibilityItem('titlesAll', effectiveVisible);
      store.setVisibilityItem('titleBn', vis.titleBn);
      store.setVisibilityItem('titleEn', vis.titleEn);
      store.setVisibilityItem('tagline', vis.tagline);
      store.setVisibilityItem('caption', vis.caption);
      store.setVisibilityItem('badge', vis.badge);
      store.setVisibilityItem('hudData', vis.hudData);
      store.setVisibilityItem('reticles', vis.reticles);
      store.setVisibilityItem('guides', vis.guides);
      store.setVisibilityItem('grain', vis.grain);
      store.setVisibilityItem('vignette', vis.vignette);
      store.setVisibilityItem('bloom', vis.bloom);
      store.setVisibilityItem('lensBlur', vis.lensBlur);
      store.setVisibilityItem('motionBlur', vis.motionBlur);
      store.setVisibilityItem('frameStepButtons', vis.frameStepButtons);
      store.setVisibilityItem('titleOpacity', nextOpacity);
    } catch {}
  }, []);

  const syncComponentsVisibility = useCallback((next: ComponentVisibility, source: string) => {
    const normalizedOpacity = clampTitleOpacity(next.titleOpacity);
    const normalized: ComponentVisibility = { ...next, titleOpacity: normalizedOpacity };
    console.log(`[App] Syncing componentsVisibility (${source}) -> triggering title re-render:`, {
      titlesAll: normalized.titlesAll,
      titleBn: normalized.titleBn,
      titleEn: normalized.titleEn,
      tagline: normalized.tagline,
      titleOpacity: normalizedOpacity,
      currentView,
      workspaceMode
    });
    setComponentsVisibility(normalized);
    saveComponentVisibility(normalized);
    syncVisibilityToStore(normalized);
  }, [currentView, workspaceMode, syncVisibilityToStore]);

  // Keep useStudioStore titleConfig.showTitles & visibility channels synchronized on mount & state updates
  useEffect(() => {
    syncVisibilityToStore(componentsVisibility);
  }, [componentsVisibility, syncVisibilityToStore]);

  // Also listen to store-driven title toggles (e.g., Stage or OpticalMonitor shortcut toggleTitles)
  useEffect(() => {
    return eventBus.on('titles:toggle', (visible: boolean) => {
      setComponentsVisibility(prev => {
        if (prev.titlesAll === visible) return prev;
        const allSubChannelsOff =
          prev.titleBn === false && prev.titleEn === false && prev.tagline === false;
        const next: ComponentVisibility = {
          ...prev,
          titlesAll: visible,
          titleBn: visible && allSubChannelsOff ? true : prev.titleBn,
          titleEn: visible && allSubChannelsOff ? true : prev.titleEn,
          tagline: visible && allSubChannelsOff ? true : prev.tagline
        };
        console.log('[App] eventBus titles:toggle received -> syncing componentsVisibility:', next);
        saveComponentVisibility(next);
        return next;
      });
    });
  }, []);

  // Title Toggle Handler
  const handleToggleTitles = useCallback(() => {
    setComponentsVisibility(prev => {
      const currentEffective = Boolean(
        prev.titlesAll && (prev.titleBn !== false || prev.titleEn !== false || prev.tagline !== false)
      );
      const nextVal = !currentEffective;
      const allSubChannelsOff =
        prev.titleBn === false && prev.titleEn === false && prev.tagline === false;
      const next: ComponentVisibility = {
        ...prev,
        titlesAll: nextVal,
        titleBn: nextVal && allSubChannelsOff ? true : prev.titleBn,
        titleEn: nextVal && allSubChannelsOff ? true : prev.titleEn,
        tagline: nextVal && allSubChannelsOff ? true : prev.tagline
      };
      console.log('[App] handleToggleTitles -> updating componentsVisibility:', {
        previous: currentEffective,
        next: nextVal,
        updatedVisibility: next
      });
      saveComponentVisibility(next);
      syncVisibilityToStore(next);
      return next;
    });
  }, [syncVisibilityToStore]);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const prev = historyStack[historyStack.length - 1];
    setRedoStack(r => [...r, project]);
    setHistoryStack(h => h.slice(0, -1));
    setProject(prev);
  }, [historyStack, project]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack(h => [...h, project]);
    setRedoStack(r => r.slice(0, -1));
    setProject(next);
  }, [redoStack, project]);

  const handleUpdateFrame = useCallback((updated: AnthologyFrame) => {
    setProject(prev => {
      const idx = prev.frames.findIndex(f => f.id === updated.id);
      if (idx !== -1) {
        const nextDur = getShotDurationSec(updated, getShotDurationSec(prev.frames[idx], 12.0));
        try {
          useStudioStore.getState().updateShot(idx, {
            title: updated.title,
            bengaliTitle: updated.bengaliTitle,
            tagline: updated.tagline,
            directorNotes: updated.directorNotes,
            soundCue: updated.soundCue,
            imageUrl: updated.imageUrl,
            isVideo: updated.isVideo,
            durationSeconds: nextDur,
            adjustments: updated.adjustments ? {
              halations: 0,
              anamorphicStreak: 0,
              ...updated.adjustments
            } : undefined,
            lutFilter: updated.lutFilter
          });
        } catch {
          // safe fallback
        }
      }
      return {
        ...prev,
        frames: prev.frames.map(f => f.id === updated.id ? updated : f)
      };
    });
  }, []);

  const handleUpdateFrameAtIndex = useCallback((index: number, updated: AnthologyFrame) => {
    setProject(prev => {
      if (index < 0 || index >= prev.frames.length) return prev;
      const nextFrames = [...prev.frames];
      const nextDur = getShotDurationSec(updated, getShotDurationSec(nextFrames[index], 12.0));
      nextFrames[index] = {
        ...updated,
        slideHoldSec: nextDur,
        durationSec: nextDur
      };
      try {
        useStudioStore.getState().updateShot(index, {
          title: updated.title,
          bengaliTitle: updated.bengaliTitle,
          tagline: updated.tagline,
          directorNotes: updated.directorNotes,
          soundCue: updated.soundCue,
          imageUrl: updated.imageUrl,
          isVideo: updated.isVideo,
          durationSeconds: nextDur,
          lutFilter: updated.lutFilter
        });
      } catch {}
      return { ...prev, frames: nextFrames };
    });
  }, []);

  const handleApplyDurationToAll = useCallback((durationSec: number) => {
    const clamped = clampShotDuration(durationSec);
    setProject(prev => {
      const nextFrames = prev.frames.map((f, idx) => {
        try {
          useStudioStore.getState().updateShot(idx, { durationSeconds: clamped });
        } catch {}
        return {
          ...f,
          slideHoldSec: clamped,
          durationSec: clamped
        };
      });
      return {
        ...prev,
        defaultSlideHoldSec: clamped,
        frames: nextFrames
      };
    });
    setSlideTimeSec(prev => Math.min(prev, clamped));
  }, []);

  const handleMatchAudioBeats = useCallback(() => {
    setProject(prev => {
      const activeDur = getShotDurationSec(prev.frames[currentIndex], 12.0);
      const beatDurations = audioEngine.calculateAutoCutDurations(
        prev.frames.length,
        Math.min(activeDur, 4.0)
      );
      const nextFrames = prev.frames.map((f, idx) => {
        const dur = clampShotDuration(beatDurations[idx] ?? activeDur);
        try {
          useStudioStore.getState().updateShot(idx, { durationSeconds: dur });
        } catch {}
        return {
          ...f,
          slideHoldSec: dur,
          durationSec: dur,
          beatSnapEnabled: true
        };
      });
      return { ...prev, frames: nextFrames };
    });
    setIsSnapToBeat(true);
    try {
      audioEngine.setSnapToBeatEnabled(true);
    } catch {}
  }, [currentIndex]);

  const handleBatchInjectCompilation = useCallback(async (newFrames: AnthologyFrame[]) => {
    setProject(prev => ({
      ...prev,
      frames: newFrames
    }));
    setCurrentIndex(0);
    setSlideTimeSec(0);
    try {
      for (let i = 0; i < newFrames.length; i++) {
        const f = newFrames[i];
        if (f.durationSec) {
          await studioDraftDb.updateSlideHoldSec(i, f.durationSec);
        }
      }
    } catch (err) {
      console.warn('[App] Batch injection IndexedDB update error:', err);
    }
  }, []);

  // Rapid Ingestion Pipeline: Direct IndexedDB Storage + High-Impact Overlays
  const handleUploadImage = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
    
    // 1. Direct write to IndexedDB media_vault store & timeline_slots
    let url = '';
    try {
      const vaultItem = await studioDraftDb.saveMediaToVault(file);
      await studioDraftDb.assignMediaToShot(vaultItem.id, currentIndex);
      url = studioDraftDb.getActiveMediaUrl(vaultItem.id, vaultItem.blob);
    } catch (err) {
      console.warn('[App] Vault media persistence error:', err);
      url = URL.createObjectURL(file);
    }

    // 2. Tracked Object URL with zero memory leaks
    const current = project.frames[currentIndex];
    if (current?.imageUrl && current.imageUrl.startsWith('blob:') && current.imageUrl !== url) {
      studioDraftDb.revokeTrackedUrl(current.imageUrl);
    }

    // 3. Auto-pair with default high-impact bilingual title overlays and audio cue
    const shotNum = String(currentIndex + 1).padStart(3, '0');
    const titleEn = (!current.title || current.title.startsWith('Shot ') || current.title.startsWith('Scene Shot') || current.title.startsWith('New Scene'))
      ? `SH${shotNum} // KINETIC FLOW`
      : current.title;
    const titleBn = (!current.bengaliTitle || current.bengaliTitle.includes('নতুন ফ্রেম'))
      ? `দৃশ্য ${shotNum} // গতিশীল দৃষ্টিভঙ্গি`
      : current.bengaliTitle;
    const soundCue = current.soundCue || 'Cinematic Tension Bass // 24fps Stem';

    handleUpdateFrame({
      ...current,
      imageUrl: url,
      isVideo: isVideo,
      title: titleEn,
      bengaliTitle: titleBn,
      soundCue: soundCue
    });

    try {
      useStudioStore.getState().updateShot(currentIndex, {
        imageUrl: url,
        isVideo: isVideo,
        title: titleEn,
        bengaliTitle: titleBn,
        soundCue: soundCue
      });
    } catch {
      // safe fallback
    }
  }, [currentIndex, project.frames, handleUpdateFrame]);

  // Instant Decision Purge (Shift + Delete): zero-loss RAM cleanup
  const handlePurgeMedia = useCallback(() => {
    const current = project.frames[currentIndex];
    if (!current) return;
    if (current.imageUrl && current.imageUrl.startsWith('blob:')) {
      studioDraftDb.revokeTrackedUrl(current.imageUrl);
    }
    handleUpdateFrame({
      ...current,
      imageUrl: '',
      isVideo: false
    });
    try {
      useStudioStore.getState().updateShot(currentIndex, {
        imageUrl: '',
        isVideo: false
      });
    } catch {
      // safe fallback
    }
  }, [currentIndex, project.frames, handleUpdateFrame]);

  // Keyboard Navigation: NLE Shuttle, 1/24s Nudge, Loop Audition & Instant Purge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input, textarea, select, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      // Shift + Delete or Shift + Backspace: Purge slot media instantly if clip lacks impact
      if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handlePurgeMedia();
        return;
      }

      // Global Command Palette (Ctrl+K or Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Global Multi-Cam Mode Trigger: Shift+M (Instantly activates Multi-Cam viewport with MultiCamGridMonitor and MultiCamTimelineTrack)
      if (e.shiftKey && (e.key === 'M' || e.key === 'm' || e.code === 'KeyM')) {
        e.preventDefault();
        setCurrentView('STUDIO');
        setWorkspaceMode('STAGE');
        setIsDrawerOpen(false);
        setActiveDualPanel('MULTICAM');
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey || isShortcutsOpen || isCommandPaletteOpen) {
        if (e.key === 'Escape') {
          setIsCommandPaletteOpen(false);
          setIsShortcutsOpen(false);
        }
        return;
      }

      // Note: Space, ArrowLeft, ArrowRight, ',', '.', 'G', 'F', 'M', and '?' are handled cleanly
      // in capture phase by keyScopeManager to guarantee single-dispatch without double-toggling.
      switch (e.key) {
        // J / K / L: Standard NLE Playback Shuttle (Rewind / Pause / Forward)
        case 'j':
        case 'J':
          e.preventDefault();
          handleStepFrame(false);
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          setIsPlaying(false);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          if (!isPlaying) {
            setIsPlaying(true);
          } else {
            handleStepFrame(true);
          }
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          setIsComponentsOpen(prev => !prev);
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          setIsLiquifyOpen(true);
          break;
        case 'p':
        case 'P':
        case 'y':
        case 'Y':
          e.preventDefault();
          setIsPanActive(prev => !prev);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setShowGuides(prev => !prev);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          handleToggleTitles();
          break;
        case 's':
        case 'S':
          e.preventDefault();
          handleCaptureStill();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setShowHud(h => !h);
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          if (e.shiftKey) {
            handleOpenExportStudio('mp4');
          } else {
            setIsInspectorOpen(o => !o);
          }
          break;
        case 'Escape':
          setIsContactSheetOpen(false);
          setIsInspectorOpen(false);
          setIsPublishModalOpen(false);
          setIsCommandPaletteOpen(false);
          setIsShortcutsOpen(false);
          setIsSelfTestOpen(false);
          setIsLiquifyOpen(false);
          setIsComponentsOpen(false);
          setIsThemeSettingsOpen(false);
          setIsExportStudioOpen(false);
          if (workspaceMode !== 'STAGE') setWorkspaceMode('STAGE');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepFrame, isPlaying, workspaceMode, currentIndex, project, handleToggleTitles, handlePurgeMedia, handleOpenExportStudio, handleToggleMultiCam, isShortcutsOpen, isCommandPaletteOpen]);

  // Touch Swipe on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextFrame();
      else prevFrame();
    }
    touchStartXRef.current = null;
  };


  const handleQuickSampleImage = () => {
    const allPresets = [...samplePacks.cosmicMacro, ...samplePacks.cyberNoir, ...samplePacks.liquidGold];
    const picked = allPresets[currentIndex % allPresets.length];
    const current = project.frames[currentIndex];
    handleUpdateFrame({
      ...current,
      imageUrl: picked
    });
  };

  const handlePopulateAllFrames = () => {
    const allPresets = [...samplePacks.cosmicMacro, ...samplePacks.cyberNoir, ...samplePacks.liquidGold];
    setProject(prev => ({
      ...prev,
      frames: prev.frames.map((frame, i) => ({
        ...frame,
        imageUrl: frame.imageUrl || allPresets[i % allPresets.length]
      }))
    }));
  };

  const handleReorderFrames = useCallback((newFrames: AnthologyFrame[]) => {
    setProject(prev => ({
      ...prev,
      frames: newFrames
    }));
    // Sync to sovereign storage engine so sequence is preserved across sessions
    projectStorageEngine.saveSession({
      version: '1.0.0',
      updatedAt: Date.now(),
      projectTitle: project.title || 'RAWx Storyboard',
      activeShotIndex: currentIndex,
      shots: newFrames.map((f, i) => ({
        id: `shot_${f.id ?? i}`,
        shotIndex: i,
        title: f.title,
        bengaliTitle: f.bengaliTitle,
        tagline: f.tagline,
        directorNotes: f.directorNotes,
        soundCue: f.soundCue,
        durationSeconds: f.slideHoldSec || f.durationSec || 12.0,
        imageUrl: f.imageUrl,
        isVideo: f.isVideo
      }))
    }).catch(err => console.warn('Failed saving reordered session', err));
  }, [currentIndex, project.title]);

  const currentFrame = (project.frames && project.frames[currentIndex]) 
    ? project.frames[currentIndex] 
    : (project.frames && project.frames[0]) 
    ? project.frames[0] 
    : generateInitialFrames()[0];
  const currentPan = panOffsets[currentIndex] ?? 50;

  const handleCommandExecution = (commandId: string) => {
    switch (commandId) {
      case 'workspace.stage': setWorkspaceMode('STAGE'); break;
      case 'workspace.board': setWorkspaceMode('BOARD'); break;
      case 'view:grid': case 'workspace.board.modal': setIsContactSheetOpen(true); break;
      case 'workspace.cut': setWorkspaceMode('CUT'); break;
      case 'tools.pan': setIsPanActive(p => !p); break;
      case 'tools.liquify': setIsLiquifyOpen(true); break;
      case 'view.toggleGuides': setShowGuides(g => !g); break;
      case 'view.componentMatrix': setIsComponentsOpen(true); break;
      case 'export.captureStill': handleCaptureStill(); break;
      case 'export.mp4': handleOpenExportStudio('mp4'); break;
      case 'export.nle': handleOpenExportStudio('premiere'); break;
      case 'system.selfTest': setIsSelfTestOpen(true); break;
      case 'system.shortcuts': setIsShortcutsOpen(true); break;
      case 'system.exportBackup': exportFullIdbBackup(); break;
      case 'system.projectManager': setIsProjectManagerOpen(true); break;
      case 'sound.toggleAudio': toggleAudio(); break;
      case 'view.toggleFullscreen': toggleFullscreen(); break;
      case 'tools.scopes': setIsVideoScopesOpen(true); break;
      case 'tools.animatic': setIsAnimaticOpen(true); break;
      case 'hollywood.otio': {
        const content = exportToOTIO(project);
        triggerFileDownload(`${project.title || 'project'}.otio`, content, 'application/json');
        break;
      }
      case 'hollywood.edl': {
        const content = exportToCMX3600EDL(project);
        triggerFileDownload(`${project.title || 'project'}.edl`, content, 'text/plain');
        break;
      }
      case 'hollywood.fountain': {
        const content = exportToFountainScreenplay(project);
        triggerFileDownload(`${project.title || 'project'}.fountain`, content, 'text/plain');
        break;
      }
      case 'hollywood.srt': {
        const content = exportToSRT(project);
        triggerFileDownload(`${project.title || 'project'}.srt`, content, 'text/plain');
        break;
      }
      case 'hollywood.csv': {
        const content = exportToCSVShotList(project);
        triggerFileDownload(`${project.title || 'project'}-shotlist.csv`, content, 'text/csv');
        break;
      }
    }
  };

  const { active: activeCompCount, total: totalCompCount } = countActiveComponentToggles(componentsVisibility);
  const componentsBadgeText = `${activeCompCount}/${totalCompCount} ON`;

  // Central Stage / Home Navigation Handler: Returns immediately to Hero Viewport from ANY module
  const handleGoHome = () => {
    setCurrentView('HOME');
    setWorkspaceMode('STAGE');
    setActiveModule('PLAYER');
    setIsDrawerOpen(false);
    setIsAnimaticOpen(false);
    setIsInspectorOpen(false);
    setIsPublishModalOpen(false);
    setIsThemeSettingsOpen(false);
    setIsLiquifyOpen(false);
    useStudioStore.getState().setActiveModule('PLAYER');
  };

  return (
    <div
      className="relative w-screen h-screen bg-[#070709] text-zinc-200 overflow-hidden select-none flex flex-col font-mono-tech"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Crash Recovery Notification Banner */}
      {crashRecoveredProject && (
        <CrashRecoveryBanner
          recoveredProject={crashRecoveredProject}
          onRestore={handleRestoreCrash}
          onDismiss={handleDismissCrash}
        />
      )}

      {/* Sleek Single-Tier Master Header */}
      <StageHeader
        currentPanel={activeDualPanel}
        onSelectPanel={(panel) => {
          setActiveDualPanel(panel);
          if (currentView !== 'STUDIO') setCurrentView('STUDIO');
          if (workspaceMode !== 'STAGE') setWorkspaceMode('STAGE');
        }}
        currentIndex={currentIndex}
        totalShots={project.frames.length || 100}
        currentFrame={currentFrame}
        frames={project.frames}
        playbackMode={playbackMode}
        onSelectPlaybackMode={setPlaybackMode}
        slideDurationSec={getShotDurationSec(currentFrame, 12.0)}
        fps={getShotTargetFps(currentFrame, 24)}
        onOpenRecorder={() => setIsScreenRecorderOpen(prev => !prev)}
        onOpenExport={() => handleOpenExportStudio('mp4')}
        onCompile={() => setIsCompilationWizardOpen(true)}
        onGoHome={handleGoHome}
        onOpenManifesto={() => setShowWalkthrough(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenR2Automation={() => setIsR2AutomationOpen(true)}
        onOpenBloomSequencer={() => {
          setWorkspaceMode('BLOOM');
          setIsDrawerOpen(false);
        }}
        onOpenVideoScopes={() => setIsVideoScopesOpen(true)}
        onOpenAiStudio={() => {
          setActiveModule('AI');
          setWorkspaceMode('STAGE');
          setIsDrawerOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenDiagnostics={() => setIsSelfTestOpen(true)}
      />

      {/* Hidden Sovereign Session JSON Restore File Input */}
      <input
        ref={sessionRestoreInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileRestoreChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Main Studio Viewport: HandfilmHome or Full Pro Studio */}
      {currentView === 'HOME' ? (
        <HandfilmHome
          frames={project.frames}
          onEnterStudio={(shotIndex) => {
            if (typeof shotIndex === 'number') {
              setCurrentIndex(shotIndex);
            }
            setCurrentView('STUDIO');
            setWorkspaceMode('STAGE');
          }}
          onLaunchStudio={() => {
            setCurrentView('STUDIO');
            setWorkspaceMode('STAGE');
          }}
          onOpenExportXml={() => handleOpenExportStudio('premiere')}
          onOpenExportRange={() => handleOpenExportStudio('mp4')}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          showTitles={componentsVisibility.titlesAll}
          componentsVisibility={componentsVisibility}
        />
      ) : (
        <>
          {/* Main Studio Body: LeftRail + StudioDrawer + MainWorkspace */}
          <div className="flex-1 w-full flex overflow-hidden relative">
        <LeftRail
          activeModule={activeModule}
          onSelectModule={(mod) => {
            if (
              mod === 'PRODUCTION' ||
              mod === 'REVIEW' ||
              mod === 'AI' ||
              mod === 'R2_STORAGE' ||
              mod === 'LIBRARY' ||
              mod === 'SETTINGS'
            ) {
              if (activeModule === mod && isDrawerOpen && workspaceMode === 'STAGE') {
                setIsDrawerOpen(false);
              } else {
                setActiveModule(mod);
                setWorkspaceMode('STAGE');
                setIsDrawerOpen(true);
              }
            } else if (mod === 'PLAYER' || (mod as string) === 'STAGE') {
              handleGoHome();
            } else if (mod === 'BLOOM') {
              setWorkspaceMode('BLOOM');
              setIsDrawerOpen(false);
            } else if (mod === 'BOARD') {
              setWorkspaceMode('BOARD');
              setIsDrawerOpen(false);
            } else if (mod === 'EDIT/CUT') {
              setWorkspaceMode('CUT');
              setIsDrawerOpen(false);
            } else if (mod === 'EXPORT') {
              setIsPublishModalOpen(true);
            } else if (mod === 'LIQUIFY') {
              setIsLiquifyOpen(true);
            } else if (mod === 'OPTICS') {
              setActiveModule('OPTICS');
              setWorkspaceMode('STAGE');
              setIsDrawerOpen(true);
            } else {
              // Functional modules: STORY, MEDIA, TEXT, SOUND
              if (activeModule === mod && isDrawerOpen && workspaceMode === 'STAGE') {
                setIsDrawerOpen(false);
              } else {
                setActiveModule(mod);
                setWorkspaceMode('STAGE');
                setIsDrawerOpen(true);
              }
            }
          }}
          isCollapsed={isRailCollapsed}
          onToggleCollapse={() => setIsRailCollapsed(c => !c)}
          isProMode={isProMode}
          onToggleProMode={() => setIsProMode(p => !p)}
          onOpenVaultMode={() => setIsProjectManagerOpen(true)}
          onOpenSelfTest={() => setIsSelfTestOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onOpenMultiCam={handleToggleMultiCam}
          totalShots={project.frames?.length || 100}
          currentShotIndex={currentIndex}
          saveState={saveState}
        />

        {/* Functional Studio Drawer in STAGE Mode */}
        {workspaceMode === 'STAGE' && isDrawerOpen && (
          <StudioDrawer
            isOpen={isDrawerOpen}
            activeModule={activeModule}
            currentFrame={currentFrame}
            onUpdateFrame={handleUpdateFrame}
            onClose={() => setIsDrawerOpen(false)}
            onOpenAnimatic={() => setIsAnimaticOpen(true)}
            onOpenLiquify={() => setIsLiquifyOpen(true)}
            onOpenMultiCam={handleToggleMultiCam}
            onSelectFrame={(idx) => goToFrame(idx)}
            onJumpToFrame={(shotIdx, timeSec) => {
              goToFrame(shotIdx);
              setSlideTimeSec(timeSec);
            }}
            currentIndex={currentIndex}
            slideTimeSec={slideTimeSec}
            aspectRatio={aspectRatio}
            onChangeAspectRatio={(r) => setAspectRatio(r)}
            onPreviewLut={(lut) => {
              if (lut) {
                handleUpdateFrame({ ...currentFrame, lutFilter: lut });
              }
            }}
          />
        )}

        <MainWorkspace
          activeMode={workspaceMode}
          activeModule={activeModule}
          onReturnToStage={handleGoHome}
          currentFrame={currentFrame}
          frames={project.frames}
          currentIndex={currentIndex}
          aspectRatio={aspectRatio}
          directorName={project.director}
          nodeLocation={project.nodeLocation}
          showHud={showHud}
          isAutoplay={isPlaying}
          isPanActive={isPanActive}
          panOffsetPercent={currentPan}
          showGuides={showGuides}
          fitMode={fitMode}
          componentsVisibility={componentsVisibility}
          onPrevFrame={prevFrame}
          onNextFrame={nextFrame}
          onSelectFrame={(idx) => {
            goToFrame(idx);
            setWorkspaceMode('STAGE');
          }}
          onUploadImage={handleUploadImage}
          onOpenInspector={() => setIsInspectorOpen(true)}
          onQuickSampleImage={handleQuickSampleImage}
          onPopulateAllFrames={handlePopulateAllFrames}
          onPanChange={(newPercent) => {
            setPanOffsets(prev => ({ ...prev, [currentIndex]: newPercent }));
          }}
          onOpenAnimatic={() => setIsAnimaticOpen(true)}
          onOpenLens={() => {
            setActiveModule('OPTICS');
            setIsDrawerOpen(true);
          }}
          onOpenSliders={() => {
            setActiveModule('OPTICS');
            setIsDrawerOpen(true);
          }}
          onOpenGrid={() => setIsContactSheetOpen(true)}
          onOpenSettings={() => setIsThemeSettingsOpen(true)}
          titleAnimation={titleAnimation}
          onToggleTitles={handleToggleTitles}
          onCycleTitleAnimation={() => {
            const anims: ('flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter')[] = ['flare', 'kinetic', 'glitch', 'breathe', 'typewriter'];
            const next = anims[(anims.indexOf(titleAnimation) + 1) % anims.length];
            setTitleAnimation(next);
          }}
          onReorderFrames={handleReorderFrames}
          onUpdateFrame={handleUpdateFrame}
          onUpdateFrameAtIndex={handleUpdateFrameAtIndex}
          onApplyDurationToAll={handleApplyDurationToAll}
          onMatchAudioBeats={handleMatchAudioBeats}
          playbackMode={playbackMode}
          slideTimeSec={slideTimeSec}
          activeDualPanel={activeDualPanel}
          onChangeDualPanel={setActiveDualPanel}
          onSelectPlaybackMode={setPlaybackMode}
          onTogglePlay={() => setIsPlaying(p => !p)}
          onStepFrame={handleStepFrame}
          onScrubSlideTime={handleScrubSlideTime}
          onScrubGlobalTime={handleScrubGlobalTime}
          playbackSpeed={playbackSpeed}
          onChangePlaybackSpeed={setPlaybackSpeed}
          onPurgeMedia={handlePurgeMedia}
          onChangeAspectRatio={(r) => setAspectRatio(r)}
          onAddSlide={() => {
            const newId = project.frames.length + 1;
            const newFrame: AnthologyFrame = {
              id: newId,
              epNumber: String(newId).padStart(3, '0'),
              title: `New Scene Frame ${newId}`,
              bengaliTitle: `দৃশ্য ${newId} // নতুন ফ্রেম`,
              tagline: '12.0s Storyboard Slide at 24fps',
              directorNotes: 'Director shot notes',
              soundCue: 'Audio cue',
              cameraSpec: {
                focalLength: '35mm High-Speed Master',
                aperture: 'f/1.4',
                shutter: '1/48s 180°',
                iso: 'ISO 400',
                sensor: 'Full-Frame Cine',
                format: 'RAW 14-BIT ARRI'
              },
              imageUrl: '',
              isVideo: false,
              panY: 50,
              colorAccent: '#D4AF37',
              hoverStyle: 0,
              lutFilter: 'cinematic',
              aspectRatio: aspectRatio,
              adjustments: {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                bloom: 30,
                grain: 15,
                motionBlur: 50,
                vignette: 40
              },
              tags: ['Scene', '12s']
            };
            setProject(p => ({
              ...p,
              frames: [...p.frames, newFrame]
            }));
            setCurrentIndex(project.frames.length);
          }}
          onDuplicateSlide={(idx) => {
            const target = project.frames[idx];
            if (!target) return;
            const dup: AnthologyFrame = {
              ...target,
              id: project.frames.length + 1,
              epNumber: String(project.frames.length + 1).padStart(3, '0'),
              title: `${target.title} (Copy)`
            };
            const nextFrames = [...project.frames];
            nextFrames.splice(idx + 1, 0, dup);
            setProject(p => ({ ...p, frames: nextFrames }));
            setCurrentIndex(idx + 1);
          }}
          onDeleteSlide={(idx) => {
            if (project.frames.length <= 1) return;
            const target = project.frames[idx];
            if (target?.imageUrl && target.imageUrl.startsWith('blob:')) {
              studioDraftDb.revokeTrackedUrl(target.imageUrl);
            }
            const nextFrames = project.frames.filter((_, i) => i !== idx);
            setProject(p => ({ ...p, frames: nextFrames }));
            setCurrentIndex(prev => Math.min(nextFrames.length - 1, prev));
          }}
          projectTitle={project.title}
          onOpenExportTimeline={() => handleOpenExportStudio('premiere')}
          onOpenExportRange={() => handleOpenExportStudio('mp4')}
          isSnapToBeat={isSnapToBeat}
          onToggleSnapToBeat={handleToggleSnapToBeat}
          onLoadAudioFile={handleLoadAudioFile}
          detectedBpm={detectedBpm}
          isAudioMuted={isAudioMuted}
          onToggleMute={toggleAudio}
          onOpenCinemaPlayer={() => setIsCinemaPlayerOpen(true)}
          multiCamGroup={multiCamGroup}
          onUpdateMultiCamGroup={setMultiCamGroup}
          multiCamLayoutConfig={multiCamLayoutConfig}
          onChangeMultiCamLayoutConfig={setMultiCamLayoutConfig}
          onOpenRecorder={() => setIsScreenRecorderOpen(true)}
          onOpenExport={() => handleOpenExportStudio('mp4')}
        />

        {/* Director Inspector Sidebar Drawer */}
        {isInspectorOpen && !isDrawerOpen && (
          <DirectorInspector
            frame={currentFrame}
            onUpdateFrame={handleUpdateFrame}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>

      {/* Resizable Bottom Control Dock */}
      <ControlDock
        frames={project.frames}
        currentIndex={currentIndex}
        slideTimeSec={slideTimeSec}
        viewMode={isContactSheetOpen || workspaceMode === 'BOARD' ? 'grid' : 'stage'}
        isPlaying={isPlaying}
        speed={speed}
        showHud={showHud}
        aspectRatio={aspectRatio}
        isFullscreen={isFullscreen}
        isAudioMuted={isAudioMuted}
        audioVolume={audioVolume}
        isPanActive={isPanActive}
        panOffsetPercent={currentPan}
        showGuides={showGuides}
        onToggleTitles={handleToggleTitles}
        showTitles={componentsVisibility.titlesAll}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSelectFrame={goToFrame}
        onUpdateFrameAtIndex={handleUpdateFrameAtIndex}
        onApplyDurationToAll={handleApplyDurationToAll}
        onMatchAudioBeats={handleMatchAudioBeats}
        isSnapToBeat={isSnapToBeat}
        onToggleSnapToBeat={handleToggleSnapToBeat}
        onTogglePlay={() => setIsPlaying(p => !p)}
        onSpeedChange={setSpeed}
        onToggleHud={() => setShowHud(h => !h)}
        onToggleFullscreen={() => setIsCinemaPlayerOpen(true)}
        onToggleAudio={toggleAudio}
        onVolumeChange={setAudioVolume}
        onToggleViewMode={() => setIsContactSheetOpen(o => !o)}
        onOpenInspector={() => setIsInspectorOpen(o => !o)}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onChangeAspectRatio={setAspectRatio}
        onChangeLut={(lut: LutPreset) => {
          handleUpdateFrame({ ...currentFrame, lutFilter: lut });
        }}
        onTogglePan={() => setIsPanActive(p => !p)}
        onOpenLiquify={() => setIsLiquifyOpen(true)}
        onToggleGuides={() => setShowGuides(g => !g)}
        onCaptureStill={handleCaptureStill}
      />
      </>
      )}

      {/* Components Matrix Popover (12/13) */}
      <ComponentsMatrixPopover
        isOpen={isComponentsOpen}
        onClose={() => setIsComponentsOpen(false)}
        visibility={componentsVisibility}
        onChange={(next) => syncComponentsVisibility(next, 'ComponentsMatrixPopover')}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteCommand={handleCommandExecution}
      />

      {/* Shortcuts Modal (Shift+/) */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Self-Test Diagnostics Modal */}
      <SelfTestModal
        isOpen={isSelfTestOpen}
        onClose={() => setIsSelfTestOpen(false)}
      />

      {/* Dedicated Comprehensive Settings & Diagnostics Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Theme Settings Modal */}
      <ThemeSettingsModal
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
      />

      {/* Canvas Liquify & Mesh Warp Studio (W) */}
      <CanvasLiquifyModal
        isOpen={isLiquifyOpen}
        frame={currentFrame}
        onClose={() => setIsLiquifyOpen(false)}
        onApplyWarp={(warpedUrl) => {
          handleUpdateFrame({
            ...currentFrame,
            imageUrl: warpedUrl
          });
        }}
      />

      {/* Modal 1: 100-Frame Contact Sheet Grid & Storyboard Sequence Director */}
      <ContactSheetModal
        isOpen={isContactSheetOpen}
        onClose={() => setIsContactSheetOpen(false)}
        frames={project.frames}
        currentIndex={currentIndex}
        onSelectFrame={(idx) => {
          goToFrame(idx);
          setWorkspaceMode('STAGE');
        }}
        onPopulateSamplePack={handlePopulateAllFrames}
        onReorderFrames={handleReorderFrames}
        onUpdateFrame={handleUpdateFrame}
        projectTitle={project.title}
        directorName={project.director}
        aspectRatio={aspectRatio}
      />

      {/* Publish & Git Modal */}
      {isPublishModalOpen && (
        <PublishModal
          project={project}
          onClose={() => setIsPublishModalOpen(false)}
          onImportProject={(imported) => {
            setProject(imported);
            setCurrentIndex(0);
          }}
        />
      )}

      {/* Multi-Project Vault Manager Modal */}
      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        activeProjectId={activeProjectId}
        onClose={() => setIsProjectManagerOpen(false)}
        onSwitchProject={handleSwitchProject}
        onProjectUpdated={() => {
          handleSwitchProject(activeProjectId);
        }}
      />

      {/* Hardware Video Scopes Modal (IRE Waveform, RGB Parade, Vectorscope) */}
      <VideoScopesModal
        isOpen={isVideoScopesOpen}
        onClose={() => setIsVideoScopesOpen(false)}
        currentFrame={currentFrame}
      />

      {/* Precision Animatic Cinema Player Modal */}
      <AnimaticPlayerModal
        isOpen={isAnimaticOpen}
        onClose={() => setIsAnimaticOpen(false)}
        frames={project.frames}
        currentIndex={currentIndex}
        onSelectFrame={(idx) => {
          goToFrame(idx);
          setWorkspaceMode('STAGE');
        }}
        projectTitle={project.title}
        aspectRatio={aspectRatio}
      />

      {/* Cloudflare R2 Streaming Engine & Automation Webhook Dashboard */}
      <R2AutomationModal
        isOpen={isR2AutomationOpen}
        onClose={() => setIsR2AutomationOpen(false)}
        project={project}
      />

      {/* Unified Master Cinema Export Studio (MP4, Premiere XML, CapCut/DaVinci FCPXML, PDF, RAWX) */}
      <CutNativeExportModal
        isOpen={isExportStudioOpen}
        onClose={() => setIsExportStudioOpen(false)}
        frames={project.frames}
        currentSlideIndex={currentIndex}
        totalSlides={project.frames.length}
        projectTitle={project.title}
        directorName={project.director}
        aspectRatio={aspectRatio}
        initialTab={exportStudioTab}
      />

      {/* Standalone Optical Monitor Cinema Lightbox Modal */}
      <OpticalMonitorModal
        isOpen={isOpticalMonitorModalOpen}
        onClose={() => setIsOpticalMonitorModalOpen(false)}
        frames={project.frames}
        currentIndex={currentIndex}
        aspectRatio={aspectRatio}
        playbackMode={playbackMode}
        isPlaying={isPlaying}
        slideTimeSec={slideTimeSec}
        playbackSpeed={playbackSpeed}
        onTogglePlay={() => setIsPlaying(p => !p)}
        onStepFrame={handleStepFrame}
        onScrubSlideTime={(t) => setSlideTimeSec(t)}
        onSelectPlaybackMode={(mode) => setPlaybackMode(mode)}
        onChangePlaybackSpeed={(s) => setPlaybackSpeed(s)}
        onChangeAspectRatio={(a) => setAspectRatio(a as AspectRatio)}
        onUploadMedia={handleUploadImage}
        projectTitle={project.title}
      />

      {/* YouTube-Grade Cinema Fullscreen Player Engine */}
      <CinemaPlayer
        isOpen={isCinemaPlayerOpen}
        onClose={() => setIsCinemaPlayerOpen(false)}
        frames={project.frames}
        currentIndex={currentIndex}
        onSelectFrame={goToFrame}
        aspectRatio={aspectRatio}
        onChangeAspectRatio={(a) => setAspectRatio(a)}
        directorName={project.director}
        projectTitle={project.title}
        onUploadMedia={handleUploadImage}
      />

      {/* Isolated Draggable Red-Pill Screen Recorder Widget */}
      <FloatingPillRecorder
        isOpen={isScreenRecorderOpen}
        onClose={() => setIsScreenRecorderOpen(false)}
        onRecordingComplete={handleRecordingComplete}
      />

      {/* Instant Post-Capture Quick Trim Preview Modal */}
      <QuickTrimPreviewModal
        captureResult={isQuickTrimOpen ? capturedResult : null}
        onClose={() => {
          setIsQuickTrimOpen(false);
          setCapturedResult(null);
        }}
        onOpenAdvancedTrimmer={handleOpenAdvancedTrimmer}
        onCommittedToVault={async (mediaId, shotIndex) => {
          try {
            const activeUrl = studioDraftDb.getActiveMediaUrl(mediaId);
            if (activeUrl) {
              const frame = project.frames[shotIndex];
              if (frame) {
                handleUpdateFrame({
                  ...frame,
                  imageUrl: activeUrl,
                  isVideo: true
                });
              }
            }
          } catch (err) {
            console.warn('[App] Vault media sync warning:', err);
          }
        }}
        activeShotIndex={currentIndex}
      />

      {/* Pro Precision Multi-Segment Trimmer Modal */}
      <AdvancedTrimmerModal
        captureResult={isAdvancedTrimmerOpen ? capturedResult : null}
        initialInSec={advancedTrimmerInSec}
        initialOutSec={advancedTrimmerOutSec}
        onClose={() => {
          setIsAdvancedTrimmerOpen(false);
          setCapturedResult(null);
        }}
        onCommittedToVault={async (mediaId, shotIndex) => {
          try {
            const activeUrl = studioDraftDb.getActiveMediaUrl(mediaId);
            if (activeUrl) {
              const frame = project.frames[shotIndex];
              if (frame) {
                handleUpdateFrame({
                  ...frame,
                  imageUrl: activeUrl,
                  isVideo: true
                });
              }
            }
          } catch (err) {
            console.warn('[App] Vault media sync warning:', err);
          }
        }}
        activeShotIndex={currentIndex}
      />

      {/* 10-Slide Cinematic Walkthrough Manifesto Modal */}
      {showWalkthrough && (
        <LandingWalkthrough onLaunchStudio={handleCloseWalkthrough} />
      )}

      {/* 1-Click Multi-Clip Master Assembler & Compilation Wizard */}
      <CompilationWizardModal
        isOpen={isCompilationWizardOpen}
        onClose={() => setIsCompilationWizardOpen(false)}
        frames={project.frames}
        onBatchInjectFrames={handleBatchInjectCompilation}
        detectedBpm={detectedBpm}
        totalTargetShots={100}
      />
    </div>
  );
}
