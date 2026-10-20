/**
 * @file /src/components/ControlDock.tsx
 * @description Master Transport Dock matching the Google Flow reference screenshot:
 * - Left: Prev frame, vibrant Gold [▶ PLAY] pill, Next frame, and Timecode (TC 00:00:01:00)
 * - Center: Continuous auto-centering rounded shot chips (001, 002, 003...)
 * - Right: Total shot counter (001 / 100) and collapsible optical tools drawer
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnthologyFrame, AspectRatio, LutPreset, ViewMode } from '../types/anthology';
import { calculateSlideshowInterval } from '../utils/engine';
import { calculateShotTimecode, DEFAULT_FPS } from '../utils/timecode';
import { lutPresetsList } from '../data/frames';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight,
  Maximize2, 
  Minimize2, 
  LayoutGrid, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Camera, 
  Crosshair, 
  Clock,
  SlidersHorizontal,
  ChevronUp,
  Type
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
  isPanActive,
  panOffsetPercent = 50,
  showGuides,
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
  onToggleTitles,
  showTitles = true
}) => {
  const navBarRef = useRef<HTMLDivElement>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);

  const safeFrames = Array.isArray(frames) && frames.length > 0 ? frames : [];
  const currentFrame = safeFrames[currentIndex] || safeFrames[0];
  const intervalSeconds = calculateSlideshowInterval(speed);
  const shotTc = calculateShotTimecode(currentFrame?.id ?? currentIndex, DEFAULT_FPS * 2.5, DEFAULT_FPS);

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

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex flex-col items-center pointer-events-none pb-2.5 px-3 sm:px-6">
      {/* Secondary Tools Drawer (Expanded on Click) */}
      {isToolsExpanded && (
        <div className="w-full max-w-5xl mb-2 pointer-events-auto bg-[#0A0A0F]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl p-2 flex flex-wrap items-center justify-between gap-2 font-mono-tech text-xs animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/50 uppercase">LUT:</span>
            <select
              value={currentFrame?.lutFilter || 'cinematic'}
              onChange={(e) => onChangeLut(e.target.value as LutPreset)}
              className="px-2 py-0.5 bg-black/80 border border-white/15 rounded text-[9.5px] text-[#FFE066] font-mono-tech outline-none cursor-pointer"
            >
              {lutPresetsList.map(l => (
                <option key={l.id} value={l.id} className="bg-[#101014] text-white">
                  {l.label}
                </option>
              ))}
            </select>

            <span className="text-[9px] text-white/50 uppercase ml-2">PACE:</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-16 accent-[#E5A919] cursor-pointer h-1 bg-white/20 rounded"
            />
            <span className="text-[9px] text-[#FFE066]">{intervalSeconds}s</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleGuides && (
              <button
                onClick={onToggleGuides}
                className={`p-1.5 rounded border text-[9px] cursor-pointer transition-colors ${
                  showGuides ? 'bg-[#E5A919]/25 border-[#E5A919] text-[#FFE066]' : 'bg-white/5 border-white/10 text-white/50'
                }`}
                title="Toggle Rule of Thirds Guides (C)"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            )}

            {onToggleTitles && (
              <button
                onClick={onToggleTitles}
                className={`px-2 py-1 rounded border text-[9px] cursor-pointer transition-colors flex items-center gap-1 ${
                  showTitles
                    ? 'bg-[#E5A919]/25 border-[#E5A919] text-[#FFE066] shadow-[0_0_8px_rgba(229,169,25,0.4)]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                }`}
                title="Toggle Master Titles Overlay (Hotkey: T)"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[8.5px] font-bold">TITLES: {showTitles ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {onCaptureStill && (
              <button
                onClick={onCaptureStill}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-[#FFE066] cursor-pointer"
                title="Capture Still PNG (S)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onToggleAudio}
              className={`p-1.5 rounded border cursor-pointer transition-colors ${
                !isAudioMuted ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-white/40'
              }`}
              title={isAudioMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onToggleViewMode}
              className={`px-2.5 py-1 rounded border flex items-center gap-1 cursor-pointer transition-colors text-[9.5px] ${
                viewMode === 'grid' ? 'bg-[#E5A919] text-black font-bold border-[#E5A919]' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>GRID</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Single-Bar Floating Transport matching Google Flow screenshot */}
      <div className="w-full max-w-6xl pointer-events-auto bg-[#07070B]/90 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-full px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3 shadow-2xl transition-all">
        {/* Left: Previous, Gold [PLAY] button, Next, and Timecode */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onPrev}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous Shot (J / Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Glowing Vibrant Gold [PLAY] pill button from screenshot */}
          <button
            onClick={onTogglePlay}
            className="px-4 py-1.5 rounded-full bg-[#E5A919] hover:bg-[#FFB703] text-black font-black text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_12px_rgba(229,169,25,0.45)] hover:scale-102"
            title={isPlaying ? "Pause Sequence (Space)" : "Play Sequence (Space)"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          <button
            onClick={onNext}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Next Shot (L / Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Timecode in Gold font from screenshot */}
          <div className="flex items-center gap-1 pl-1 text-xs font-mono-tech font-bold text-[#E5A919] tracking-wider whitespace-nowrap">
            <span className="text-white/40 text-[9px] font-medium mr-0.5">TC</span>
            <span>{shotTc.start || '00:00:01:00'}</span>
          </div>
        </div>

        {/* Center: Scrollable Continuous Shot Chips from screenshot */}
        <div 
          ref={navBarRef}
          id="photo-nav-bar"
          className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-2 scroll-smooth"
        >
          {safeFrames.map((frame, idx) => {
            const isActive = idx === currentIndex;
            const epNum = frame?.epNumber || String(idx + 1).padStart(3, '0');
            return (
              <button
                key={frame?.id ?? idx}
                onClick={() => onSelectFrame(idx)}
                className={`nav-dash shrink-0 px-2.5 py-1 rounded-full font-mono-tech text-[10px] cursor-pointer flex items-center gap-1 ${
                  isActive
                    ? 'nav-dash-active bg-[#E5A919] text-black font-black shadow-[0_0_10px_rgba(229,169,25,0.6)] z-10'
                    : 'bg-white/5 hover:bg-white/15 text-white/60 hover:text-white'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                <span>{epNum}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Total Shot Count & Tools Expander */}
        <div className="flex items-center gap-2 shrink-0 pr-1">
          <div className="flex items-center gap-1 font-mono-tech text-xs font-bold">
            <span className="text-[#E5A919]">{String(currentIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/60">{frames.length || 100}</span>
          </div>

          {/* Toggle Secondary Tools */}
          <button
            onClick={() => setIsToolsExpanded(p => !p)}
            className={`p-1.5 rounded-full cursor-pointer transition-colors ${
              isToolsExpanded ? 'bg-[#E5A919] text-black' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Extended Optical Controls"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
