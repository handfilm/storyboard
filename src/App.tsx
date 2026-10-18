import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnthologyFrame, AnthologyProject, AspectRatio, LutPreset, ViewMode } from './types/anthology';
import { generateInitialFrames, samplePacks } from './data/frames';
import { OpticalFrame } from './components/OpticalFrame';
import { ControlDock } from './components/ControlDock';
import { GridView } from './components/GridView';
import { DirectorInspector } from './components/DirectorInspector';
import { PublishModal } from './components/PublishModal';
import { audioEngine } from './utils/audioEngine';
import { calculateSlideshowInterval } from './utils/engine';
import { ChevronLeft, ChevronRight, Sliders, Film } from 'lucide-react';

export default function App() {
  const [project, setProject] = useState<AnthologyProject>(() => ({
    title: "RAWx // Master Anthology Engine 100",
    director: "RAKIB HIMON",
    nodeLocation: "DHAKA_01",
    aspectRatio: "2.39:1",
    frames: generateInitialFrames(),
    createdAt: new Date().toISOString(),
    version: "1.0.0"
  }));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('stage');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [showHud, setShowHud] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('2.39:1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.4);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  const touchStartXRef = useRef<number | null>(null);

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

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
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
          setViewMode(m => m === 'grid' ? 'stage' : 'grid');
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
          if (viewMode === 'grid') setViewMode('stage');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextFrame, prevFrame, isAudioMuted, audioVolume, viewMode]);

  // Touch Swipe on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextFrame();
      } else {
        prevFrame();
      }
    }
    touchStartXRef.current = null;
  };

  // Update a single frame
  const handleUpdateFrame = (updated: AnthologyFrame) => {
    setProject(prev => ({
      ...prev,
      frames: prev.frames.map(f => f.id === updated.id ? updated : f)
    }));
  };

  // Upload an image to the current frame
  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    const current = project.frames[currentIndex];
    handleUpdateFrame({
      ...current,
      imageUrl: url
    });
  };

  // Quick preset sample for single frame
  const handleQuickSampleImage = () => {
    const allPresets = [...samplePacks.cosmicMacro, ...samplePacks.cyberNoir, ...samplePacks.liquidGold];
    const picked = allPresets[currentIndex % allPresets.length];
    const current = project.frames[currentIndex];
    handleUpdateFrame({
      ...current,
      imageUrl: picked
    });
  };

  // Populate all frames with curated high-definition packs
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

  const currentFrame = project.frames[currentIndex];

  return (
    <div
      className="relative w-screen h-screen bg-[#050505] text-white overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Strip */}
      <header className="fixed top-0 inset-x-0 z-30 h-12 px-4 sm:px-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="font-cinzel text-xs sm:text-sm font-bold tracking-[0.25em] text-white flex items-center gap-2">
            <span className="text-amber-400 font-extrabold">RAWx</span>
            <span className="text-white/40">//</span>
            <span className="hidden sm:inline">ANTHOLOGY ENGINE 100</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-[2px] bg-white/10 text-[9px] font-mono-tech text-amber-300">
            v1.0 GIT-READY
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-2.5 py-1 rounded-xs bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono-tech text-[10px] sm:text-xs tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Film className="w-3.5 h-3.5" />
            <span>EXPORT / GIT</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      {viewMode === 'stage' ? (
        <main className="w-full h-full flex items-center justify-center pt-8 pb-24">
          <OpticalFrame
            frame={currentFrame}
            aspectRatio={aspectRatio}
            directorName={project.director}
            nodeLocation={project.nodeLocation}
            showHud={showHud}
            isAutoplay={isPlaying}
            onUploadImage={handleUploadImage}
            onOpenInspector={() => setIsInspectorOpen(true)}
            onQuickSampleImage={handleQuickSampleImage}
          />

          {/* Floating Left & Right Navigation Arrows on Tablet & Desktop */}
          <button
            onClick={prevFrame}
            aria-label="Previous Frame"
            className="hidden sm:flex fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-xs bg-black/40 hover:bg-black/90 border border-white/10 hover:border-amber-400 text-white/40 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-110 items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>

          <button
            onClick={nextFrame}
            aria-label="Next Frame"
            className="hidden sm:flex fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-xs bg-black/40 hover:bg-black/90 border border-white/10 hover:border-amber-400 text-white/40 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-110 items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
          </button>
        </main>
      ) : (
        <main className="w-full h-full pt-14 pb-24">
          <GridView
            frames={project.frames}
            currentFrameIndex={currentIndex}
            onSelectFrame={(idx) => {
              goToFrame(idx);
              setViewMode('stage');
            }}
            onPopulateSamplePack={handlePopulateAllFrames}
          />
        </main>
      )}

      {/* Bottom Control Dock & Micro Scrubber */}
      <ControlDock
        frames={project.frames}
        currentIndex={currentIndex}
        viewMode={viewMode}
        isPlaying={isPlaying}
        speed={speed}
        showHud={showHud}
        aspectRatio={aspectRatio}
        isFullscreen={isFullscreen}
        isAudioMuted={isAudioMuted}
        audioVolume={audioVolume}
        onPrev={prevFrame}
        onNext={nextFrame}
        onSelectFrame={goToFrame}
        onTogglePlay={() => setIsPlaying(p => !p)}
        onSpeedChange={setSpeed}
        onToggleHud={() => setShowHud(h => !h)}
        onToggleFullscreen={toggleFullscreen}
        onToggleAudio={toggleAudio}
        onVolumeChange={setAudioVolume}
        onToggleViewMode={() => setViewMode(m => m === 'grid' ? 'stage' : 'grid')}
        onOpenInspector={() => setIsInspectorOpen(o => !o)}
        onOpenPublishModal={() => setIsPublishModalOpen(true)}
        onChangeAspectRatio={setAspectRatio}
        onChangeLut={(lut: LutPreset) => {
          handleUpdateFrame({
            ...currentFrame,
            lutFilter: lut
          });
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

      {/* Git & Platform Publishing Modal */}
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
    </div>
  );
}
