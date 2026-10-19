/**
 * @file /src/components/ControlDock.tsx
 * @description Resizable bottom dock with virtualized auto-centering scrubber,
 * "Go to shot" direct jump input, micro transport, optical LUT/Lens selectors,
 * Pan Y, Liquify (W), Guides (C), Still Capture (S), Audio, and Zen mode.
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnthologyFrame, AspectRatio, LutPreset, ViewMode } from '../types/anthology';
import { calculateSlideshowInterval } from '../utils/engine';
import { calculateShotTimecode, DEFAULT_FPS } from '../utils/timecode';
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
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Camera,
  Grid,
  MoveVertical,
  Crosshair,
  Maximize,
  Clock
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
  isPanActive?: boolean;
  panOffsetPercent?: number;
  showGuides?: boolean;
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
  onTogglePan?: () => void;
  onOpenLiquify?: () => void;
  onToggleGuides?: () => void;
  onCaptureStill?: () => void;
  onToggleZen?: () => void;
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
  isPanActive = false,
  panOffsetPercent = 50,
  showGuides = false,
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
  onChangeLut,
  onTogglePan,
  onOpenLiquify,
  onToggleGuides,
  onCaptureStill,
  onToggleZen
}) => {
  const navBarRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');
  const safeFrames = Array.isArray(frames) && frames.length > 0 ? frames : [];
  const currentFrame = safeFrames[currentIndex] || safeFrames[0];

  const intervalSeconds = (calculateSlideshowInterval(speed) / 1000).toFixed(1);
  const shotTc = calculateShotTimecode(currentIndex, 60, DEFAULT_FPS);

  // Auto-scroll the micro-timeline so current frame is centered
  useEffect(() => {
    if (navBarRef.current) {
      const activeDash = navBarRef.current.children[currentIndex] as HTMLElement;
      if (activeDash) {
        activeDash.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= frames.length) {
      onSelectFrame(parsed - 1);
      setJumpInput('');
    }
  };

  const ratios: AspectRatio[] = ['2.39:1', '16:9', '4:3', '1:1', '9:16'];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-2 px-2 sm:px-4">
      {/* 100-Frame Micro Timeline Scrubber Bar with Go-to-shot Input */}
      <div className="w-full max-w-5xl mb-1.5 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous Frame (J)"
          title="Previous Frame (J / Left Arrow)"
          className="p-1 rounded-[1px] bg-black/85 hover:bg-black border border-white/10 hover:border-[#D4AF37] text-white/60 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Virtualized Shot Strip with 6px gaps & non-overlapping chips */}
        <div
          ref={navBarRef}
          className="flex-1 flex gap-[6px] overflow-x-auto py-1 px-2 bg-[#070709]/90 backdrop-blur-md border border-white/15 rounded-[1px] no-scrollbar shadow-xl scroll-smooth"
        >
          {safeFrames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const hasPhoto = Boolean(frame?.imageUrl);
            const epNum = frame?.epNumber || String(idx + 1).padStart(3, '0');
            const epTitle = frame?.title || `SHOT ${epNum}`;
            const epBn = frame?.bengaliTitle || '';

            return (
              <button
                key={frame?.id ?? idx}
                onClick={() => onSelectFrame(idx)}
                aria-label={`Shot ${epNum}: ${epTitle}`}
                title={`EP ${epNum}: ${epTitle} ${epBn ? `(${epBn})` : ''}`}
                className={`shrink-0 min-w-[34px] sm:min-w-[38px] h-6 px-1.5 rounded-[2px] flex items-center justify-center font-mono-tech text-[8.5px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D4AF37] text-black font-black shadow-[0_0_10px_rgba(212,175,55,0.7)] border border-[#FFE066] ring-1 ring-[#D4AF37]/60 scale-100 z-10'
                    : hasPhoto
                    ? 'bg-white/15 hover:bg-white/30 text-white border-b-2 border-[#D4AF37]/70'
                    : 'bg-white/5 hover:bg-white/15 text-white/40'
                }`}
              >
                {epNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          aria-label="Next Frame (L)"
          title="Next Frame (L / Right Arrow)"
          className="p-1 rounded-[1px] bg-black/85 hover:bg-black border border-white/10 hover:border-[#D4AF37] text-white/60 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-colors shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Go To Shot input */}
        <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center shrink-0">
          <input
            type="text"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={() => handleJumpSubmit()}
            placeholder={`# ${currentFrame?.epNumber || '001'}`}
            className="w-16 bg-black/80 border border-white/15 focus:border-[#D4AF37] text-white text-[9px] font-mono-tech px-1.5 py-0.5 rounded-[1px] text-center outline-none"
            title="Type shot number (1-100) and press Enter to jump directly"
          />
        </form>
      </div>

      {/* Main Control Panel Dock (Clutter-free, non-wrapping single-line controls) */}
      <div className="w-full max-w-5xl pointer-events-auto bg-[#08080B]/95 backdrop-blur-xl border border-white/15 rounded-[2px] shadow-2xl p-1.5 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech">
        
        {/* Left: Transport, Timecode, Pace & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause Loop" : "Play Loop"}
            className={`px-2.5 py-1 rounded-[1px] border font-semibold flex items-center gap-1.5 tracking-wider transition-colors cursor-pointer text-[9px] sm:text-[10px] shrink-0 ${
              isPlaying
                ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#FFE066] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'border-white/20 bg-white/5 text-white hover:border-[#D4AF37] hover:text-[#FFE066]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">LOOP</span>
              </>
            )}
          </button>

          {/* Valid SMPTE Timecode Display (HH:MM:SS:FF) */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-[1px] bg-black/90 border border-white/15 text-[8.5px] font-mono-tech shrink-0 whitespace-nowrap"
            title="Sequence Timecode (HH:MM:SS:FF) at 24 FPS"
          >
            <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span className="text-[7.5px] text-white/40 font-semibold uppercase">TC</span>
            <span className="text-[#D4AF37] font-bold tracking-wider">{shotTc.start}</span>
            <span className="text-[7px] text-white/40 border-l border-white/15 pl-1">24F</span>
          </div>

          {/* Pace slider - Strictly single-line (never wraps into 3 lines) */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0 whitespace-nowrap flex-nowrap">
            <span className="text-[8px] text-white/40 uppercase tracking-wider shrink-0">PACE</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-14 sm:w-16 accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded shrink-0"
              title={`Slideshow interval: ${intervalSeconds}s`}
            />
            <span className="text-[8.5px] text-[#D4AF37] min-w-[28px] shrink-0 font-medium">{intervalSeconds}s</span>
          </div>

          {/* Pan Y Tool Button */}
          {onTogglePan && (
            <button
              onClick={onTogglePan}
              className={`px-2 py-1 rounded-[1px] border text-[8.5px] font-mono-tech flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                isPanActive
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Interactive Vertical Alignment Pan Tool (P / Y)"
            >
              <MoveVertical className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">PAN</span>
              <span className="text-[8px] opacity-75">{panOffsetPercent}%</span>
            </button>
          )}

          {/* Canvas Liquify Studio Button (W) */}
          {onOpenLiquify && (
            <button
              onClick={onOpenLiquify}
              className="px-2 py-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] text-[8.5px] font-mono-tech flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
              title="HTML5 Canvas Liquify & Mesh Warp Studio (W)"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">WARP</span>
            </button>
          )}
        </div>

        {/* Center: Aspect Ratio & Filter Selector - Isolated from Timecode */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="flex items-center bg-black/80 border border-white/15 rounded-[1px] p-0.5 shrink-0">
            <span className="text-[7.5px] text-white/40 px-1 hidden lg:inline tracking-widest uppercase">ASPECT</span>
            {ratios.map(r => (
              <button
                key={r}
                onClick={() => onChangeAspectRatio(r)}
                className={`px-1.5 py-0.5 text-[8.5px] rounded-[1px] transition-colors cursor-pointer ${
                  aspectRatio === r
                    ? 'bg-[#D4AF37] text-black font-bold'
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
            className="hidden sm:block px-2 py-0.5 bg-black/80 border border-white/15 rounded-[1px] text-[9px] text-[#FFE066] font-mono-tech outline-none cursor-pointer"
          >
            {lutPresetsList.map(l => (
              <option key={l.id} value={l.id} className="bg-[#101014] text-white">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Camera Guides, Audio, Still Capture, Grid, Fullscreen */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Rule of Thirds Guides */}
          {onToggleGuides && (
            <button
              onClick={onToggleGuides}
              className={`p-1 rounded-[1px] border cursor-pointer transition-colors ${
                showGuides
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Toggle Rule of Thirds & Crosshair Guides (C)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Still Frame Capture */}
          {onCaptureStill && (
            <button
              onClick={onCaptureStill}
              className="p-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer"
              title="Capture High-Res Cinema Still PNG (S)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Audio Synthesizer */}
          <button
            onClick={onToggleAudio}
            className={`p-1 rounded-[1px] border cursor-pointer transition-colors ${
              !isAudioMuted
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title={isAudioMuted ? "Unmute Procedural Audio Synth (M)" : "Mute Audio (M)"}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* 100-Frame Grid */}
          <button
            onClick={onToggleViewMode}
            className={`px-2 py-1 rounded-[1px] border flex items-center gap-1 cursor-pointer transition-colors text-[9px] ${
              viewMode === 'grid'
                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="100-Frame Contact Sheet (G)"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">GRID</span>
          </button>

          {/* Director Inspector */}
          <button
            onClick={onOpenInspector}
            className="p-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer"
            title="Director Optical Inspector (E)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded-[1px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white cursor-pointer"
            title="Toggle Cinema Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
