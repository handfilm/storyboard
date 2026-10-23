/**
 * @file /src/components/ControlDock.tsx
 * @description Master Tactical Bottom Control Dock for HANDFILM Cinema Engine.
 * Features 100-shot thumbnail strip, precision transport, pace slider, aspect toggle,
 * LUT selector, and futuristic tactile HUD controls.
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnthologyFrame, LutPreset } from '../types/anthology';
import { calculateSlideshowInterval, getLutFilterCSS } from '../utils/engine';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sliders,
  Move,
  Wand2,
  Grid,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Camera,
  Crosshair,
  SlidersHorizontal,
  Flame,
  Sparkles,
  Eye
} from 'lucide-react';

export interface ControlDockProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  viewMode: 'stage' | 'grid';
  isPlaying: boolean;
  speed: number;
  showHud: boolean;
  aspectRatio: string;
  isFullscreen: boolean;
  isAudioMuted: boolean;
  audioVolume?: number;
  isPanActive?: boolean;
  panOffsetPercent?: number;
  showGuides?: boolean;
  onToggleTitles?: () => void;
  showTitles?: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelectFrame: (index: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleHud: () => void;
  onToggleFullscreen: () => void;
  onToggleAudio: () => void;
  onVolumeChange?: (vol: number) => void;
  onToggleViewMode: () => void;
  onOpenInspector: () => void;
  onOpenPublishModal?: () => void;
  onChangeAspectRatio: (ratio: any) => void;
  onChangeLut: (lut: LutPreset) => void;
  onTogglePan?: () => void;
  onOpenLiquify?: () => void;
  onToggleGuides?: () => void;
  onCaptureStill?: () => void;
  onToggleZen?: () => void;
}

const LUT_PRESETS: { id: LutPreset; label: string }[] = [
  { id: 'cinematic', label: 'Cinema 35' },
  { id: 'noir', label: 'B&W Noir' },
  { id: 'golden', label: 'Golden Hour' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'bleach', label: 'Bleach Bypass' },
  { id: 'technicolor', label: 'Technicolor' },
  { id: 'infrared', label: 'Infrared' },
  { id: 'raw', label: 'RAW Flat' }
];

export const ControlDock: React.FC<ControlDockProps> = ({
  frames = [],
  currentIndex = 0,
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
  onToggleTitles,
  showTitles = true,
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
  const stripRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');

  const safeFrames = Array.isArray(frames) && frames.length > 0 ? frames : [];
  const currentFrame = safeFrames[currentIndex] || safeFrames[0];
  const intervalSeconds = (calculateSlideshowInterval(speed) / 1000).toFixed(1);

  // Timecode calculation at 24fps
  const totalFrames = currentIndex * 288;
  const ff = Math.floor(totalFrames % 24);
  const ss = Math.floor((totalFrames / 24) % 60);
  const mm = Math.floor((totalFrames / (24 * 60)) % 60);
  const hh = Math.floor(totalFrames / (24 * 3600));
  const tcString = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;

  // Auto-scroll timeline to active shot
  useEffect(() => {
    if (stripRef.current) {
      const activeEl = stripRef.current.children[currentIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(jumpInput, 10);
    if (!isNaN(num) && num >= 1 && num <= safeFrames.length) {
      onSelectFrame(num - 1);
      setJumpInput('');
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-2 px-2 sm:px-4">
      {/* 100-Frame Strip Navigation */}
      <div className="w-full max-w-5xl mb-1.5 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous Shot (J)"
          title="Previous Shot (J / Left Arrow)"
          className="p-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={stripRef}
          className="flex-1 flex gap-1.5 overflow-x-auto py-1.5 px-2 bg-[#070709]/92 backdrop-blur-md border border-white/15 rounded-[2px] no-scrollbar shadow-[0_4px_20px_rgba(0,0,0,0.7)] scroll-smooth"
        >
          {safeFrames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const hasMedia = !!frame?.imageUrl || !!frame?.isVideo;
            const ep = frame?.epNumber || String(idx + 1).padStart(3, '0');
            const title = frame?.title || `SHOT ${ep}`;
            const bn = frame?.bengaliTitle || '';

            return (
              <button
                key={frame?.id ?? idx}
                onClick={() => onSelectFrame(idx)}
                aria-label={`Shot ${ep}: ${title}`}
                title={`EP ${ep}: ${title} ${bn ? `(${bn})` : ''}`}
                className={`shrink-0 min-w-[36px] sm:min-w-[40px] h-6 px-1.5 rounded-[2px] flex items-center justify-center font-mono-tech text-[9px] transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#D4AF37] text-black font-black shadow-[0_0_12px_rgba(212,175,55,0.8)] border border-[#FFE066] ring-1 ring-[#D4AF37]/80 scale-105 z-10'
                    : hasMedia
                    ? 'bg-white/15 hover:bg-white/25 text-white border-b-2 border-[#D4AF37]/80'
                    : 'bg-white/5 hover:bg-white/12 text-white/50'
                }`}
              >
                {ep}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          aria-label="Next Shot (L)"
          title="Next Shot (L / Right Arrow)"
          className="p-1.5 rounded-[2px] bg-black/90 hover:bg-black border border-white/15 hover:border-[#D4AF37] text-white/70 hover:text-[#FFE066] backdrop-blur-md cursor-pointer transition-all shadow-[0_2px_8px_rgba(0,0,0,0.6)] shrink-0 active:scale-95"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <form onSubmit={handleJumpSubmit} className="hidden sm:flex items-center shrink-0">
          <input
            type="text"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onBlur={() => handleJumpSubmit()}
            placeholder={`# ${currentFrame?.epNumber || '001'}`}
            className="w-16 bg-black/85 border border-white/20 focus:border-[#D4AF37] text-white text-[9.5px] font-mono-tech px-2 py-1 rounded-[2px] text-center outline-none transition-colors"
            title="Type shot number (1-100) and press Enter to jump"
          />
        </form>
      </div>

      {/* Main Transport & Optics Toolbar */}
      <div className="w-full max-w-5xl pointer-events-auto bg-[#08080B]/95 backdrop-blur-xl border border-white/15 rounded-[3px] shadow-[0_8px_32px_rgba(0,0,0,0.85)] p-2 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tech">
        {/* Left Section: Playback & Speed */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause Loop' : 'Play Loop'}
            className={`px-3 py-1.5 rounded-[2px] border font-bold flex items-center gap-1.5 tracking-wider transition-all cursor-pointer text-[10px] sm:text-[11px] shrink-0 ${
              isPlaying
                ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#FFE066] shadow-[0_0_14px_rgba(212,175,55,0.4)]'
                : 'border-white/20 bg-white/5 text-white hover:border-[#D4AF37] hover:text-[#FFE066]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span className="hidden sm:inline">LOOP</span>
              </>
            )}
          </button>

          {/* Timecode Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-black/90 border border-white/15 text-[9px] font-mono-tech shrink-0 whitespace-nowrap shadow-inner"
            title="Sequence SMPTE Timecode (HH:MM:SS:FF) at 24 FPS"
          >
            <Clock className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span className="text-[8px] text-white/40 font-semibold uppercase">TC</span>
            <span className="text-[#D4AF37] font-bold tracking-wider">{tcString}</span>
            <span className="text-[7.5px] text-white/40 border-l border-white/15 pl-1.5">24F</span>
          </div>

          {/* Pace Slider */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-white/10 pl-2 shrink-0 whitespace-nowrap">
            <span className="text-[8.5px] text-white/40 uppercase tracking-wider shrink-0">PACE</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-14 sm:w-16 accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded shrink-0"
              title={`Slideshow interval: ${intervalSeconds}s`}
            />
            <span className="text-[9px] text-[#D4AF37] min-w-[28px] shrink-0 font-medium">
              {intervalSeconds}s
            </span>
          </div>

          {/* Pan Tool */}
          {onTogglePan && (
            <button
              onClick={onTogglePan}
              className={`px-2.5 py-1 rounded-[2px] border text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                isPanActive
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] font-bold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title="Interactive Vertical Alignment Pan Tool (P / Y)"
            >
              <Move className="w-3 h-3 text-[#D4AF37]" />
              <span className="hidden sm:inline">PAN</span>
              <span className="text-[8px] opacity-75">{panOffsetPercent}%</span>
            </button>
          )}

          {/* Canvas Warp / Liquify */}
          {onOpenLiquify && (
            <button
              onClick={onOpenLiquify}
              className="px-2.5 py-1 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] text-[9px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
              title="HTML5 Canvas Liquify & Mesh Warp Studio (W)"
            >
              <Wand2 className="w-3 h-3 text-[#D4AF37]" />
              <span className="hidden sm:inline">WARP</span>
            </button>
          )}
        </div>

        {/* Center Section: Aspect Ratio & LUT preset */}
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <div className="flex items-center bg-black/80 border border-white/15 rounded-[2px] p-0.5 shrink-0">
            <span className="text-[8px] text-white/40 px-1.5 hidden lg:inline tracking-widest uppercase">
              ASPECT
            </span>
            {['2.39:1', '16:9', '4:3', '1:1', '9:16'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => onChangeAspectRatio(ratio)}
                className={`px-2 py-0.5 text-[9px] rounded-[1px] transition-all cursor-pointer ${
                  aspectRatio === ratio
                    ? 'bg-[#D4AF37] text-black font-bold shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <select
            value={currentFrame?.lutFilter || 'cinematic'}
            onChange={(e) => onChangeLut(e.target.value as LutPreset)}
            className="hidden sm:block px-2.5 py-1 bg-black/85 border border-white/15 rounded-[2px] text-[9.5px] text-[#FFE066] font-mono-tech outline-none cursor-pointer focus:border-[#D4AF37]"
          >
            {LUT_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#101014] text-white">
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Section: Cinema Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Thirds Guides */}
          {onToggleGuides && (
            <button
              onClick={onToggleGuides}
              className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
                showGuides
                  ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#FFE066] shadow-[0_0_8px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Toggle Rule of Thirds & Crosshair Guides (C)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Capture Still */}
          {onCaptureStill && (
            <button
              onClick={onCaptureStill}
              className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all active:scale-95"
              title="Capture High-Res Cinema Still PNG (S)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-1.5 rounded-[2px] border cursor-pointer transition-all ${
              isAudioMuted
                ? 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                : 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
            }`}
            title={isAudioMuted ? 'Unmute Procedural Audio Synth (M)' : 'Mute Audio (M)'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Grid / Contact Sheet */}
          <button
            onClick={onToggleViewMode}
            className={`px-2.5 py-1 rounded-[2px] border flex items-center gap-1 cursor-pointer transition-all text-[9.5px] ${
              viewMode === 'grid'
                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="100-Frame Contact Sheet (G)"
          >
            <Grid className="w-3 h-3" />
            <span className="hidden sm:inline">GRID</span>
          </button>

          {/* Optical Inspector */}
          <button
            onClick={onOpenInspector}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer transition-all"
            title="Director Optical Inspector (E)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Monitor */}
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/12 border border-white/10 text-white/70 hover:text-white cursor-pointer transition-all active:scale-95"
            title="Toggle Cinema Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
