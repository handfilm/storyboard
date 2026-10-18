import React, { useRef, useEffect } from 'react';
import { AnthologyFrame, AspectRatio, LutPreset, ViewMode } from '../types/anthology';
import { calculateSlideshowInterval } from '../utils/engine';
import { lutPresetsList } from '../data/frames';
import { 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Share2, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight,
  Ratio,
  Sparkles
} from 'lucide-react';

interface ControlDockProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  viewMode: ViewMode;
  isPlaying: boolean;
  speed: number;
  showHud: boolean;
  aspectRatio: AspectRatio;
  isFullscreen: boolean;
  isAudioMuted: boolean;
  audioVolume: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectFrame: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleHud: () => void;
  onToggleFullscreen: () => void;
  onToggleAudio: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleViewMode: () => void;
  onOpenInspector: () => void;
  onOpenPublishModal: () => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  onChangeLut: (lut: LutPreset) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  frames,
  currentIndex,
  viewMode,
  isPlaying,
  speed,
  showHud,
  aspectRatio,
  isFullscreen,
  isAudioMuted,
  audioVolume,
  onPrev,
  onNext,
  onSelectFrame,
  onTogglePlay,
  onSpeedChange,
  onToggleHud,
  onToggleFullscreen,
  onToggleAudio,
  onVolumeChange,
  onToggleViewMode,
  onOpenInspector,
  onOpenPublishModal,
  onChangeAspectRatio,
  onChangeLut
}) => {
  const navBarRef = useRef<HTMLDivElement>(null);
  const currentFrame = frames[currentIndex];

  const intervalSeconds = (calculateSlideshowInterval(speed) / 1000).toFixed(1);

  // Auto-scroll the micro-timeline so current frame is centered
  useEffect(() => {
    if (navBarRef.current) {
      const activeDash = navBarRef.current.children[currentIndex] as HTMLElement;
      if (activeDash) {
        activeDash.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const ratios: AspectRatio[] = ['2.39:1', '16:9', '4:3', '1:1', '9:16'];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-2 sm:pb-3 px-3">
      {/* 100-Frame Micro Timeline Scrubber Bar */}
      <div className="w-full max-w-5xl mb-2 sm:mb-2.5 pointer-events-auto flex items-center gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous Frame"
          className="p-1 rounded-xs bg-black/80 hover:bg-black border border-white/10 hover:border-amber-400 text-white/60 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={navBarRef}
          className="flex-1 flex gap-[3px] overflow-x-auto py-1.5 px-2 bg-black/75 backdrop-blur-md border border-white/15 rounded-xs no-scrollbar shadow-xl"
        >
          {frames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const hasPhoto = Boolean(frame.imageUrl);

            return (
              <button
                key={frame.id}
                onClick={() => onSelectFrame(idx)}
                aria-label={`Frame ${frame.epNumber}: ${frame.title}`}
                title={`EP ${frame.epNumber}: ${frame.title} (${frame.bengaliTitle})`}
                className={`flex-shrink-0 h-5 px-1 rounded-[2px] flex items-center justify-center font-mono-tech text-[8px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-black font-bold shadow-[0_0_8px_rgba(212,175,55,0.6)] scale-105 z-10'
                    : hasPhoto
                    ? 'bg-white/15 hover:bg-white/30 text-white/80 border-b border-amber-400/50'
                    : 'bg-white/5 hover:bg-white/15 text-white/40'
                }`}
              >
                {frame.epNumber}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          aria-label="Next Frame"
          className="p-1 rounded-xs bg-black/80 hover:bg-black border border-white/10 hover:border-amber-400 text-white/60 hover:text-amber-400 backdrop-blur-md cursor-pointer transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Control Panel Dock */}
      <div className="w-full max-w-5xl pointer-events-auto bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/15 rounded-xs shadow-2xl p-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-tech">
        
        {/* Left Section: Autoplay, Frame counter & Speed */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause Autoplay" : "Start Autoplay"}
            className={`px-3 py-1.5 rounded-xs border font-medium flex items-center gap-2 tracking-wider transition-colors cursor-pointer ${
              isPlaying
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'border-white/20 bg-white/5 text-white hover:border-amber-400 hover:text-amber-300'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">PAUSE LOOP</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">AUTO PLAY</span>
              </>
            )}
          </button>

          {/* Speed slider with real second indicator */}
          <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="text-[10px] text-white/40 uppercase">PACE</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              aria-label="Slideshow Speed"
              className="w-16 sm:w-20 accent-amber-400 cursor-pointer h-1 bg-white/20 rounded"
            />
            <span className="text-[10px] text-amber-400 min-w-[32px]">{intervalSeconds}s</span>
          </div>

          {/* Current Frame Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-white/50 text-[11px] border-l border-white/10 pl-3">
            <span className="text-white font-bold">{currentFrame?.epNumber}</span>
            <span>/ 100</span>
          </div>
        </div>

        {/* Center Section: Aspect Ratio & LUT quick switch */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center bg-black/60 border border-white/10 rounded-xs p-0.5">
            {ratios.map(r => (
              <button
                key={r}
                onClick={() => onChangeAspectRatio(r)}
                aria-label={`Aspect ratio ${r}`}
                className={`px-1.5 py-0.5 text-[9px] rounded-[2px] transition-colors cursor-pointer ${
                  aspectRatio === r
                    ? 'bg-amber-400 text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* LUT Quick Selector */}
          <select
            value={currentFrame?.lutFilter || 'cinematic'}
            onChange={(e) => onChangeLut(e.target.value as LutPreset)}
            aria-label="LUT Filter Preset"
            className="hidden sm:block px-2 py-1 bg-black/60 border border-white/15 rounded-xs text-[10px] text-amber-300 font-mono-tech focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {lutPresetsList.map(l => (
              <option key={l.id} value={l.id} className="bg-[#121216] text-white">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Section: View Toggles, Audio, Inspector, Git & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Audio Synthesizer Toggle */}
          <button
            onClick={onToggleAudio}
            aria-label={isAudioMuted ? "Enable Ambient Audio" : "Mute Ambient Audio"}
            className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
              !isAudioMuted
                ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                : 'border-white/15 text-white/50 hover:text-white hover:border-white/30'
            }`}
            title={isAudioMuted ? "Unmute Ambient Drone & Shutter" : "Mute Audio"}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* HUD Overlay Toggle */}
          <button
            onClick={onToggleHud}
            aria-label={showHud ? "Hide HUD Telemetry" : "Show HUD Telemetry"}
            className={`p-1.5 rounded-xs border transition-colors cursor-pointer ${
              showHud
                ? 'border-white/20 text-white/80'
                : 'border-white/10 text-white/30 hover:text-white'
            }`}
            title="Toggle HUD Telemetry (H)"
          >
            {showHud ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* 100-Frame Grid Contact Sheet Toggle */}
          <button
            onClick={onToggleViewMode}
            aria-label="Toggle 100-Frame Contact Sheet"
            className={`px-2.5 py-1.5 rounded-xs border flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                : 'border-white/15 text-white/70 hover:text-white hover:border-white/30'
            }`}
            title="100-Frame Grid Overview (G)"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px]">GRID</span>
          </button>

          {/* Director Inspector */}
          <button
            onClick={onOpenInspector}
            aria-label="Open Director Studio Inspector"
            className="p-1.5 rounded-xs border border-white/15 hover:border-amber-400 text-white/70 hover:text-amber-300 transition-colors cursor-pointer"
            title="Director Inspector & Optical Sliders (E)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Publish & Git Suite */}
          <button
            onClick={onOpenPublishModal}
            aria-label="Publish & Git Export Suite"
            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 rounded-xs flex items-center gap-1.5 font-bold cursor-pointer transition-all"
            title="Export for Git & Publishing"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px]">PUBLISH & GIT</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-1.5 rounded-xs border border-white/15 hover:border-white/40 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
