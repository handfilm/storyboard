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
import { TopBar } from './components/TopBar';
import { LeftRail, StudioModuleId } from './components/LeftRail';
import { MainWorkspace } from './components/MainWorkspace';
import { ControlDock } from './components/ControlDock';
import { DirectorInspector } from './components/DirectorInspector';
import { PublishModal } from './components/PublishModal';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SelfTestModal } from './components/SelfTestModal';
import { CanvasLiquifyModal } from './components/CanvasLiquifyModal';
import { VideoScopesModal } from './components/VideoScopesModal';
import { AnimaticPlayerModal } from './components/AnimaticPlayerModal';
import { OpticalMonitorModal } from './components/OpticalMonitorModal';
import { StudioDrawer } from './components/StudioDrawer';
import { R2AutomationModal } from './components/R2AutomationModal';
import { CutNativeExportModal, ExportModalTab } from './components/CutNativeExportModal';
import { exportToOTIO, exportToCMX3600EDL, exportToFountainScreenplay, exportToSRT, exportToCSVShotList, triggerFileDownload } from './data/hollywoodExporters';
import { 
  ComponentsMatrixPopover, 
  ComponentVisibility, 
  loadSavedComponentVisibility, 
  saveComponentVisibility 
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
import { QuickTrimPreviewModal } from './components/recorder/QuickTrimPreviewModal';
import { AdvancedTrimmerModal } from './components/recorder/AdvancedTrimmerModal';
import { RecordedCaptureResult } from './services/screenRecorderEngine';

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
  const [activeDualPanel, setActiveDualPanel] = useState<'TACTILE_STAGE' | 'SPLIT' | 'OPTICAL' | 'SEQUENCER'>('TACTILE_STAGE');
  const [isOpticalMonitorModalOpen, setIsOpticalMonitorModalOpen] = useState(false);
  const [slideTimeSec, setSlideTimeSec] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // New Studio State & Preserved Optical Controls
  const [isPanActive, setIsPanActive] = useState(false);
  const [panOffsets, setPanOffsets] = useState<Record<number, number>>({});
  const [showGuides, setShowGuides] = useState(false);
  const [componentsVisibility, setComponentsVisibility] = useState<ComponentVisibility>(loadSavedComponentVisibility);

  // Modals and popovers state
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
      setComponentsVisibility(p.settings.componentsVisibility);
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
          nextFrames[index] = {
            ...nextFrames[index],
            imageUrl: partial.imageUrl !== undefined ? partial.imageUrl : nextFrames[index].imageUrl,
            isVideo: partial.isVideo !== undefined ? partial.isVideo : nextFrames[index].isVideo,
            title: partial.title !== undefined ? partial.title : nextFrames[index].title,
            bengaliTitle: partial.bengaliTitle !== undefined ? partial.bengaliTitle : nextFrames[index].bengaliTitle,
            tagline: partial.tagline !== undefined ? partial.tagline : nextFrames[index].tagline
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

    return () => {
      unsub();
      unsubAsset();
    };
  }, []);

  // Register KeyScopeManager cheat sheet handler and init on mount
  useEffect(() => {
    const unsubCheatSheet = keyScopeManager.setCheatSheetHandler(() => {
      setIsShortcutsOpen(prev => !prev);
    });
    const unsubKeyScope = keyScopeManager.init();

    return () => {
      unsubCheatSheet();
      unsubKeyScope();
    };
  }, []);

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

    // 2. CapCut-Style Local Project Draft (v4) with strict 12.0s slides
    const slideDrafts: SlideDraft[] = project.frames.map((f, i) => ({
      id: `slide_${f.id ?? i}`,
      orderIndex: i,
      duration: 12.0, // Strictly 12.0s per slide
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
    }));

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
          frames: loadedDraft.slides.map((s, idx) => ({
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
            adjustments: s.adjustments || {
              brightness: 100,
              contrast: 100,
              saturation: 100,
              bloom: 30,
              grain: 15,
              motionBlur: 50,
              vignette: 40
            },
            tags: ['Scene', '12s']
          }))
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

  // Frame Stepping (-1F / +1F at 24fps)
  const handleStepFrame = useCallback((forward: boolean) => {
    // Immediately pause playback to prevent sequence timer collision with playhead
    setIsPlaying(false);

    const FRAME_DELTA = 1 / 24; // 1 frame at 24fps
    const SLIDE_DURATION = 12.0;

    if (playbackMode === 'solo') {
      // Solo scrub mode: strictly isolated within 0 to 12.0s without jumping cuts
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
      // Sequence mode: steps across cuts when crossing 12.0s boundaries
      setSlideTimeSec(prev => {
        const updated = forward ? prev + FRAME_DELTA : prev - FRAME_DELTA;
        if (updated >= SLIDE_DURATION) {
          const nextIdx = (currentIndex + 1) % project.frames.length;
          setCurrentIndex(nextIdx);
          try {
            useStudioStore.getState().setActiveShotIndex(nextIdx);
            useStudioStore.getState().setSlideTimeSec(0);
          } catch {}
          return 0;
        } else if (updated < 0) {
          const prevIdx = (currentIndex - 1 + project.frames.length) % project.frames.length;
          setCurrentIndex(prevIdx);
          const loopTime = Math.max(0, SLIDE_DURATION - FRAME_DELTA);
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
  }, [playbackMode, project.frames.length, currentIndex]);

  // Local slide time scrubbing (0 to 12.000s)
  const handleScrubSlideTime = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(12.0, timeSec));
    setSlideTimeSec(clamped);
    try {
      useStudioStore.getState().setSlideTimeSec(clamped);
    } catch {}
  }, []);

  // Global animatic time scrubbing (0 to N * 12.0s)
  const handleScrubGlobalTime = useCallback((globalSec: number) => {
    const SLIDE_DURATION = 12.0;
    const totalSlides = project.frames.length || 1;
    const totalDuration = totalSlides * SLIDE_DURATION;
    const clamped = Math.max(0, Math.min(totalDuration, globalSec));
    const targetIndex = Math.min(totalSlides - 1, Math.floor(clamped / SLIDE_DURATION));
    const localTime = clamped - (targetIndex * SLIDE_DURATION);
    setCurrentIndex(targetIndex);
    setSlideTimeSec(localTime);
    try {
      useStudioStore.getState().setActiveShotIndex(targetIndex);
      useStudioStore.getState().setSlideTimeSec(localTime);
    } catch {}
  }, [project.frames.length]);

  // 12.0s Dual-Mode Playback Engine (288 frames @ 24fps per card)
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

    const currentFrame = project.frames[currentIndex] || project.frames[0];
    const shotSlideHold = currentFrame?.slideHoldSec ?? project.defaultSlideHoldSec ?? 12.0;

    const tick = (now: number) => {
      if (lastTimestampRef.current !== null) {
        const deltaSec = ((now - lastTimestampRef.current) / 1000) * playbackSpeed;
        const safeDelta = Math.min(deltaSec, 0.5);

        setSlideTimeSec(prevTime => {
          const nextTime = prevTime + safeDelta;
          const globalPlaybackSec = (currentIndex * 12.0) + nextTime;
          audioEngine.syncPlaybackTime(globalPlaybackSec);

          try {
            useStudioStore.getState().setSlideTimeSec(nextTime);
          } catch {}

          if (playbackMode === 'sequence') {
            // Sequence (Animatic) mode: auto-advance across Slide 1 through Slide N every shotSlideHold time
            // If snap-to-beat is enabled, boundary check triggers on musical downbeat
            const boundaryDuration = isSnapToBeat ? 12.0 : shotSlideHold;
            if (nextTime >= boundaryDuration) {
              const framesLength = project.frames.length || 1;
              const nextIdx = (currentIndex + 1) % framesLength;
              setCurrentIndex(nextIdx);
              const remainderTime = nextTime % boundaryDuration;
              try {
                useStudioStore.getState().setActiveShotIndex(nextIdx);
                useStudioStore.getState().setSlideTimeSec(remainderTime);
              } catch {}
              return remainderTime;
            }
            return nextTime;
          } else {
            // Solo Scrub mode: loops strictly within this slide's hold window
            if (nextTime >= shotSlideHold) {
              const loopTime = nextTime % shotSlideHold;
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
    const cleanupKeyScope = keyScopeManager.init();
    keyScopeManager.setCheatSheetHandler(() => setIsShortcutsOpen(prev => !prev));
    return cleanupKeyScope;
  }, []);

  useEffect(() => {
    if (isCinemaPlayerOpen) {
      keyScopeManager.setActiveLayer('CINEMA');
    } else {
      keyScopeManager.setActiveLayer('STAGE');
    }
  }, [isCinemaPlayerOpen]);

  useEffect(() => {
    return keyScopeManager.registerStageHandlers({
      onTogglePlay: () => setIsPlaying(p => !p),
      onNextShot: nextFrame,
      onPrevShot: prevFrame,
      onStepFrame: handleStepFrame,
      onToggleGrid: () => setWorkspaceMode(m => m === 'BOARD' ? 'STAGE' : 'BOARD'),
      onOpenCinema: () => setIsCinemaPlayerOpen(true),
      onToggleMute: toggleAudio
    });
  }, [nextFrame, prevFrame, handleStepFrame, toggleAudio]);

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

  // Title Toggle Handler
  const handleToggleTitles = useCallback(() => {
    setComponentsVisibility(prev => {
      const next = { ...prev, titlesAll: !prev.titlesAll };
      saveComponentVisibility(next);
      return next;
    });
    useStudioStore.getState().setVisibilityItem('titlesAll', !componentsVisibility.titlesAll);
  }, [componentsVisibility.titlesAll]);

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
        try {
          useStudioStore.getState().updateShot(idx, {
            title: updated.title,
            bengaliTitle: updated.bengaliTitle,
            tagline: updated.tagline,
            directorNotes: updated.directorNotes,
            soundCue: updated.soundCue,
            imageUrl: updated.imageUrl,
            isVideo: updated.isVideo,
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
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
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

      // Shortcuts Cheat Sheet (Shift+/)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      switch (e.key) {
        // Left / Right Arrow: Slide Navigation (Previous / Next Shot)
        case 'ArrowRight':
          e.preventDefault();
          nextFrame();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevFrame();
          break;

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

        // Space: Instant loop audition
        case ' ':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          setWorkspaceMode(m => m === 'BOARD' ? 'STAGE' : 'BOARD');
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
        case 'm':
        case 'M':
          e.preventDefault();
          toggleAudio();
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
  }, [nextFrame, prevFrame, handleStepFrame, isPlaying, isAudioMuted, audioVolume, workspaceMode, currentIndex, project, handleToggleTitles, handlePurgeMedia, handleOpenExportStudio]);

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

  const activeCompCount = Object.values(componentsVisibility).filter(Boolean).length;
  const totalCompCount = Object.keys(componentsVisibility).length;
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

      {/* Unified Studio TopBar */}
      <TopBar
        projectTitle={project.title}
        onUpdateTitle={(title) => setProject(p => ({ ...p, title }))}
        activeMode={workspaceMode}
        activeModule={activeModule}
        onGoHome={handleGoHome}
        currentView={currentView}
        onSelectView={setCurrentView}
        currentShotIndex={currentIndex}
        totalShots={project.frames.length || 100}
        activePanel={activeDualPanel}
        onSelectPanel={setActiveDualPanel}
        onSelectMode={(mode) => {
          if (mode === 'STAGE') {
            handleGoHome();
          } else {
            setCurrentView('STUDIO');
            setWorkspaceMode(mode);
            setIsDrawerOpen(false);
          }
        }}
        isProMode={isProMode}
        onToggleProMode={() => setIsProMode(p => !p)}
        componentsBadgeText={componentsBadgeText}
        onToggleComponentsPopover={() => setIsComponentsOpen(p => !p)}
        onOpenThemeSettings={() => setIsThemeSettingsOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSelfTest={() => setIsSelfTestOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenAnimatic={() => setIsAnimaticOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTitles={handleToggleTitles}
        showTitles={componentsVisibility.titlesAll}
        saveState={saveState}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onOpenR2Automation={() => setIsR2AutomationOpen(true)}
        onOpenExportStudio={handleOpenExportStudio}
        onOpenExportTimeline={() => handleOpenExportStudio('premiere')}
        onOpenExportRange={() => handleOpenExportStudio('mp4')}
        onOpenWalkthrough={() => setShowWalkthrough(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenVideoScopes={() => setIsVideoScopesOpen(true)}
        onOpenScreenRecorder={() => setIsScreenRecorderOpen(prev => !prev)}
        onOpenAiStudio={() => {
          setActiveModule('AI');
          setWorkspaceMode('STAGE');
          setIsDrawerOpen(true);
        }}
        onOpenBloomSequencer={() => {
          setWorkspaceMode('BLOOM');
          setIsDrawerOpen(false);
        }}
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
          onOpenGrid={() => setWorkspaceMode('BOARD')}
          onOpenSettings={() => setIsThemeSettingsOpen(true)}
          titleAnimation={titleAnimation}
          onToggleTitles={handleToggleTitles}
          onCycleTitleAnimation={() => {
            const anims: ('flare' | 'kinetic' | 'glitch' | 'breathe' | 'typewriter')[] = ['flare', 'kinetic', 'glitch', 'breathe', 'typewriter'];
            const next = anims[(anims.indexOf(titleAnimation) + 1) % anims.length];
            setTitleAnimation(next);
          }}
          onReorderFrames={(newFrames) => {
            setProject(prev => ({
              ...prev,
              frames: newFrames
            }));
          }}
          onUpdateFrame={handleUpdateFrame}
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
        viewMode={workspaceMode === 'BOARD' ? 'grid' : 'stage'}
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
        onTogglePlay={() => setIsPlaying(p => !p)}
        onSpeedChange={setSpeed}
        onToggleHud={() => setShowHud(h => !h)}
        onToggleFullscreen={() => setIsCinemaPlayerOpen(true)}
        onToggleAudio={toggleAudio}
        onVolumeChange={setAudioVolume}
        onToggleViewMode={() => setWorkspaceMode(m => m === 'BOARD' ? 'STAGE' : 'BOARD')}
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
        onChange={(next) => {
          setComponentsVisibility(next);
          saveComponentVisibility(next);
        }}
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

      {/* Zero-Lag 4K/60FPS Screen Recorder Floating Control Dock */}
      <ScreenRecorderFloatingBar
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
    </div>
  );
}
