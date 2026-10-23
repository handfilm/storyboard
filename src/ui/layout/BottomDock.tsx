/**
 * RAWx Studio — BottomDock Transport & Virtualized Timeline
 * Public API: BottomDock component
 * Houses playback transport, real-time pace speed-ramping, 100-frame strip, and cinema dock menus.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Eye, 
  Sparkles,
  Sliders,
  Ratio
} from 'lucide-react';
import { TrackVuMeter } from '../../components/audio/TrackVuMeter';

const lutPresets = [
  { id: 'cinematic', label: 'RAWx Cinema 35' },
  { id: 'bleach', label: 'Bleach Bypass Silver' },
  { id: 'technicolor', label: 'Technicolor 3-Strip' },
  { id: 'noir', label: 'Monolith High-Contrast B&W' },
  { id: 'cyberpunk', label: 'Cyberpunk Neo-Tokyo' },
  { id: 'golden', label: 'Golden Hour Tungsten' },
  { id: 'infrared', label: 'Aerochrome Infrared' },
  { id: 'raw', label: 'Unprocessed 14-bit RAW' }
];

const lensPresets = [
  { id: '50mm', label: '50mm f/1.4 Human Eye (bokeh)' },
  { id: '35mm', label: '35mm f/1.4 Master Cine' },
  { id: '85mm', label: '85mm f/1.2 Velvet Portrait' },
  { id: '24mm', label: '24mm f/2.8 Ultra-Wide Architectural' },
  { id: '100mm', label: '100mm f/2.8 Macro Razor' }
];

export const BottomDock: React.FC = () => {
  const {
    activeShotIndex,
    setActiveShotIndex,
    slideTimeSec,
    nextShot,
    prevShot,
    isPlaying,
    togglePlay,
    speed,
    setSpeed,
    aspectRatio,
    setAspectRatio,
    activeLut,
    setLut,
    activeLens,
    setLens,
    isAudioMuted,
    toggleAudio,
    toggleZenMode,
    project
  } = useStudioStore();

  const stripRef = useRef<HTMLDivElement>(null);
  const [goToInput, setGoToInput] = useState('');

  // Rate calculation matching exact pace formula: (0.25 to 3.0x / 4.0x)
  const rateVal = (0.25 + (speed - 1) * (2.75 / 99)).toFixed(2);
  const secondsVal = (12 - (speed - 1) * (11.4 / 99)).toFixed(1);

  // Auto-scroll timeline to active shot
  useEffect(() => {
    if (stripRef.current) {
      const activeBtn = stripRef.current.children[activeShotIndex] as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeShotIndex]);

  const handleGoToShot = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(goToInput, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setActiveShotIndex(num - 1);
      setGoToInput('');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <footer className="bg-[#0B0B0B] border-t border-[#D4AF37]/20 flex flex-col px-3 py-1.5 select-none z-30">
      {/* 100-Frame Scrubber Timeline Strip */}
      <div className="w-full flex items-center gap-2 mb-1.5 overflow-hidden">
        <form onSubmit={handleGoToShot} className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
          <span className="text-[#8A8A8A]">GOTO:</span>
          <input
            type="number"
            min="1"
            max="100"
            placeholder="001"
            value={goToInput}
            onChange={(e) => setGoToInput(e.target.value)}
            className="w-12 bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-center rounded px-1 py-0.5 outline-none font-mono"
          />
        </form>

        <div 
          ref={stripRef}
          id="photo-nav-bar"
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
        >
          {Array.from({ length: 100 }, (_, i) => {
            const num = String(i + 1).padStart(3, '0');
            const isActive = i === activeShotIndex;
            const currentSec = isActive ? (slideTimeSec || 0) : 0;
            const relFrames = Math.floor((currentSec % 1) * 24);
            const relSecPart = Math.floor(currentSec);
            const relativeTc = `+${String(relSecPart).padStart(2, '0')}:${String(relFrames).padStart(2, '0')}F`;

            return (
              <button
                key={i}
                onClick={() => setActiveShotIndex(i)}
                className={`nav-dash relative flex-shrink-0 px-2 py-1 text-[9px] font-mono rounded-[2px] border cursor-pointer select-none transition-all group ${
                  isActive
                    ? 'nav-dash-active bg-[#0E0F17] text-[#FFE066] font-bold border-[#FFE066] shadow-[0_0_12px_rgba(212,175,55,0.6)] ring-1 ring-[#D4AF37]'
                    : 'bg-[#121212] text-[#8A8A8A] border-white/5 hover:text-[#EDEDED] hover:border-[#D4AF37]/40'
                }`}
                title={`Shot ${num} — Relative Time: ${isActive ? relativeTc : '12.0s'}`}
              >
                {/* Floating Real-Time Relative Timecode Overlay Badge */}
                {isActive && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black/95 border border-[#FFE066] text-[#FFE066] text-[7px] font-mono font-bold px-1 py-0.2 rounded-[2px] shadow-[0_0_8px_rgba(255,224,102,0.8)] whitespace-nowrap pointer-events-none flex items-center gap-1 z-30 tabular-nums">
                    <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-[#FFE066] animate-pulse' : 'bg-amber-400'}`} />
                    <span>{relativeTc}</span>
                  </span>
                )}
                <span className="relative z-10">{num}</span>
                {/* Real-time hold progress indicator */}
                {isActive && (
                  <span 
                    className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#D4AF37] to-[#FFE066] shadow-[0_0_6px_rgba(255,224,102,0.8)] pointer-events-none"
                    style={{ width: `${Math.min(100, Math.max(0, ((slideTimeSec || 0) / 12.0) * 100))}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transport & Dock Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Playback Controls & Pace Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevShot}
            className="p-1 rounded bg-[#121212] text-[#8A8A8A] hover:text-[#EDEDED] border border-white/5"
            title="Previous Frame (Arrow Left / J)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            id="btn-play"
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold border transition-colors ${
              isPlaying
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-[#121212] text-[#EDEDED] border-[#D4AF37]/30 hover:border-[#D4AF37]'
            }`}
            title="Toggle Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'LOOP'}</span>
          </button>

          <button
            onClick={nextShot}
            className="p-1 rounded bg-[#121212] text-[#8A8A8A] hover:text-[#EDEDED] border border-white/5"
            title="Next Frame (Arrow Right / L)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Pace Slider */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
            <span className="text-[10px] text-[#D4AF37] tracking-wider uppercase">Pace</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              id="speed-slider"
              className="w-24 accent-[#D4AF37] cursor-pointer h-1.5 bg-[#121212] rounded-lg"
              title="Animatic Speed Ramping (0.25x - 3.0x)"
            />
            <span id="speed-label" className="text-[10px] text-[#8A8A8A] min-w-[75px]">
              {secondsVal}s // {rateVal}x
            </span>
          </div>
        </div>

        {/* Aspect, LUT, Lens Dropdowns */}
        <div className="flex items-center gap-1.5">
          {/* Aspect Ratio */}
          <select
            id="aspect-select"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as any)}
            className="bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-[10px] font-mono rounded px-1.5 py-1 outline-none"
            title="Aspect Ratio Framing"
          >
            <option value="16:9">16:9 SCREEN FIT</option>
            <option value="2.39:1">2.39:1 CINEMASCOPE</option>
            <option value="4:3">4:3 ACADEMY</option>
            <option value="4:5">4:5 PORTRAIT</option>
            <option value="1:1">1:1 SQUARE</option>
            <option value="9:16">9:16 VERTICAL</option>
          </select>

          {/* LUT Filter Presets */}
          <select
            id="lut-select"
            value={activeLut}
            onChange={(e) => setLut(e.target.value)}
            className="hidden sm:block bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-[10px] font-mono rounded px-1.5 py-1 outline-none"
            title="Cinematic Color LUT Presets"
          >
            {lutPresets.map(l => (
              <option key={l.id} value={l.id}>FILTER: {l.label}</option>
            ))}
          </select>

          {/* Lens Presets */}
          <select
            id="lens-select"
            value={activeLens}
            onChange={(e) => setLens(e.target.value)}
            className="hidden lg:block bg-[#121212] border border-[#D4AF37]/30 text-[#EDEDED] text-[10px] font-mono rounded px-1.5 py-1 outline-none"
            title="Optical Lens Simulation"
          >
            {lensPresets.map(lens => (
              <option key={lens.id} value={lens.id}>LENS: {lens.label}</option>
            ))}
          </select>
        </div>

        {/* Mode Toggles: Track VU Meter, Zen, Fullscreen */}
        <div className="flex items-center gap-1.5">
          <TrackVuMeter
            variant="dock"
            onToggleMute={toggleAudio}
            isMuted={isAudioMuted}
          />

          <button
            onClick={toggleZenMode}
            className="px-2 py-1 rounded bg-[#121212] border border-white/5 text-[#8A8A8A] hover:text-[#FFE066] text-[10px] transition-colors"
            title="Clean Zen Cinema Mode (Z)"
          >
            ZEN
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-[#121212] border border-white/5 text-[#8A8A8A] hover:text-[#EDEDED] transition-colors"
            title="Toggle Fullscreen (F)"
          >
            <Maximize className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};
