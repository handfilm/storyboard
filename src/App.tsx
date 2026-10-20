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
import { 
  ComponentsMatrixPopover, 
  ComponentVisibility, 
  loadSavedComponentVisibility, 
  saveComponentVisibility 
} from './components/ComponentsMatrixPopover';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { audioEngine } from './utils/audioEngine';
import { calculateSlideshowInterval } from './utils/engine';
import { exportFullIdbBackup } from './utils/backup';
import { storageManager, SaveState } from './core/storage';
import { ProjectV1 } from './types/projectSchema';
import { migrateToProjectV1, convertShotV1ToFrame } from './utils/projectMigration';
import { CrashRecoveryBanner } from './components/CrashRecoveryBanner';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { useStudioStore } from './core/store';
import { eventBus } from './core/eventBus';

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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('STAGE');
  const [activeModule, setActiveModule] = useState<StudioModuleId>('BOARD');
  const [isProMode, setIsProMode] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [showHud, setShowHud] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2.39:1');
  const [fitMode, setFitMode] = useState<'cover' | 'contain' | 'fill'>('cover');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.4);

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
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);

  // M2 Persistence Core State
  const [activeProjectId, setActiveProjectId] = useState<string>('default-project');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [crashRecoveredProject, setCrashRecoveredProject] = useState<ProjectV1 | null>(null);
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);

  const touchStartXRef = useRef<number | null>(null);

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

    return () => unsub();
  }, []);

  // Initialize Storage Core & Check Crash Status on Mount
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = storageManager.onSaveStateChange((st) => {
      if (isMounted) setSaveState(st);
    });

    const initPersistence = async () => {
      await storageManager.init();
      if (!isMounted) return;

      const crash = storageManager.getCrashRecovery();
      if (crash.hasCrash && crash.recoveredProject) {
        setCrashRecoveredProject(crash.recoveredProject);
      }

      const loaded = await storageManager.loadProject();
      if (loaded && isMounted) {
        applyProjectV1ToState(loaded);
      }
      setIsStorageInitialized(true);
    };

    initPersistence();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyProjectV1ToState]);

  // Debounced 800ms Autosave to IndexedDB
  useEffect(() => {
    if (!isStorageInitialized) return;

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
  }, [project, panOffsets, aspectRatio, fitMode, componentsVisibility, isStorageInitialized, activeProjectId]);

  const handleSwitchProject = async (id: string) => {
    const loaded = await storageManager.loadProject(id);
    if (loaded) {
      applyProjectV1ToState(loaded);
      setCurrentIndex(0);
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

  // Navigate to frame with audio feedback
  const goToFrame = useCallback((index: number) => {
    const total = project.frames.length;
    const nextIndex = ((index % total) + total) % total;
    setCurrentIndex(nextIndex);
    audioEngine.playShutterClick();
  }, [project.frames.length]);

  const nextFrame = useCallback(() => goToFrame(currentIndex + 1), [goToFrame, currentIndex]);
  const prevFrame = useCallback(() => goToFrame(currentIndex - 1), [goToFrame, currentIndex]);

  // Autoplay loop timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = calculateSlideshowInterval(speed);
    const timer = setInterval(() => {
      goToFrame(currentIndex + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, speed, currentIndex, goToFrame]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Audio mute toggle
  const toggleAudio = () => {
    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    audioEngine.setMuted(nextState);
    if (!nextState) {
      audioEngine.setVolume(audioVolume);
      audioEngine.playShutterClick();
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

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
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
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          nextFrame();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          prevFrame();
          break;
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
          setIsInspectorOpen(o => !o);
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
          if (workspaceMode !== 'STAGE') setWorkspaceMode('STAGE');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextFrame, prevFrame, isAudioMuted, audioVolume, workspaceMode, currentIndex, project]);

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

  const handleUpdateFrame = (updated: AnthologyFrame) => {
    setProject(prev => ({
      ...prev,
      frames: prev.frames.map(f => f.id === updated.id ? updated : f)
    }));
  };

  const handleUploadImage = (file: File) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v)$/i.test(file.name);
    const url = URL.createObjectURL(file);
    const current = project.frames[currentIndex];
    handleUpdateFrame({
      ...current,
      imageUrl: url,
      isVideo: isVideo
    });
    try {
      useStudioStore.getState().updateShot(currentIndex, {
        imageUrl: url,
        isVideo: isVideo
      });
    } catch {
      // safe fallback
    }
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
      case 'system.selfTest': setIsSelfTestOpen(true); break;
      case 'system.shortcuts': setIsShortcutsOpen(true); break;
      case 'system.exportBackup': exportFullIdbBackup(); break;
      case 'system.projectManager': setIsProjectManagerOpen(true); break;
      case 'sound.toggleAudio': toggleAudio(); break;
      case 'view.toggleFullscreen': toggleFullscreen(); break;
    }
  };

  const activeCompCount = Object.values(componentsVisibility).filter(Boolean).length;
  const componentsBadgeText = `${activeCompCount}/13 ON`;

  return (
    <div
      className="relative w-screen h-screen bg-[#050505] text-[#EDEDED] overflow-hidden select-none flex flex-col font-mono-tech"
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
        onSelectMode={(mode) => setWorkspaceMode(mode)}
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
        saveState={saveState}
      />

      {/* Main Studio Body: LeftRail + MainWorkspace */}
      <div className="flex-1 w-full flex overflow-hidden relative">
        <LeftRail
          activeModule={activeModule}
          onSelectModule={(mod) => {
            setActiveModule(mod);
            if (mod === 'BOARD') setWorkspaceMode('BOARD');
            else if (mod === 'EDIT/CUT') setWorkspaceMode('CUT');
            else if (mod === 'SETTINGS') setIsThemeSettingsOpen(true);
            else if (mod === 'EXPORT') setIsPublishModalOpen(true);
            else setWorkspaceMode('STAGE');
          }}
          isCollapsed={isRailCollapsed}
          onToggleCollapse={() => setIsRailCollapsed(c => !c)}
          isProMode={isProMode}
        />

        <MainWorkspace
          activeMode={workspaceMode}
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
        />

        {/* Director Inspector Sidebar Drawer */}
        {isInspectorOpen && (
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
        onPrev={prevFrame}
        onNext={nextFrame}
        onSelectFrame={goToFrame}
        onTogglePlay={() => setIsPlaying(p => !p)}
        onSpeedChange={setSpeed}
        onToggleHud={() => setShowHud(h => !h)}
        onToggleFullscreen={toggleFullscreen}
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
    </div>
  );
}
