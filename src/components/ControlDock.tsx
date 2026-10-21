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
        <div className="w-full max-w-5xl mb-2 pointer-events-auto bg-[#0E0E12]/95 backdrop-blur-2xl border border-[#1C1C24] rounded-2xl shadow-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 font-mono-tech text-xs animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/50 uppercase font-bold">LUT:</span>
            <select
              value={currentFrame?.lutFilter || 'cinematic'}
              onChange={(e) => onChangeLut(e.target.value as LutPreset)}
              className="px-2.5 py-1 bg-[#14141B] border border-[#23232E] rounded-full text-[9.5px] text-[#F5A623] font-mono-tech outline-none cursor-pointer"
            >
              {lutPresetsList.map(l => (
                <option key={l.id} value={l.id} className="bg-[#12121A] text-white">
                  {l.label}
                </option>
              ))}
            </select>

            <span className="text-[9px] text-white/50 uppercase ml-2 font-bold">PACE:</span>
            <input
              type="range"
              min="1"
              max="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-16 accent-[#F5A623] cursor-pointer h-1.5 bg-[#1C1C26] rounded-full"
            />
            <span className="text-[9px] text-[#F5A623] font-bold">{intervalSeconds}s</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleGuides && (
              <button
                type="button"
                onClick={onToggleGuides}
                className={`p-1.5 rounded-full border text-[9px] cursor-pointer transition-colors active:scale-[0.98] ${
                  showGuides ? 'bg-[#F5A623]/25 border-[#F5A623] text-[#F5A623]' : 'bg-[#14141B] border-[#23232E] text-white/50'
                }`}
                title="Toggle Rule of Thirds Guides (C)"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
            )}

            {onToggleTitles && (
              <button
                type="button"
                onClick={onToggleTitles}
                className={`px-3 py-1 rounded-full border text-[9px] cursor-pointer transition-colors active:scale-[0.98] flex items-center gap-1 ${
                  showTitles
                    ? 'bg-[#F5A623]/25 border-[#F5A623] text-[#F5A623] shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                    : 'bg-[#14141B] border-[#23232E] text-white/50 hover:text-white'
                }`}
                title="Toggle Master Titles Overlay (Hotkey: T)"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[8.5px] font-bold">TITLES: {showTitles ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {onCaptureStill && (
              <button
                type="button"
                onClick={onCaptureStill}
                className="p-1.5 rounded-full bg-[#14141B] hover:bg-[#1C1C26] border border-[#23232E] text-white/70 hover:text-[#F5A623] cursor-pointer active:scale-[0.98]"
                title="Capture Still PNG (S)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-1.5 rounded-full border cursor-pointer transition-colors active:scale-[0.98] ${
                !isAudioMuted ? 'bg-[#F5A623]/20 border-[#F5A623]/60 text-[#F5A623]' : 'bg-[#14141B] border-[#23232E] text-white/40'
              }`}
              title={isAudioMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onToggleViewMode}
              className={`px-3 py-1 rounded-full border flex items-center gap-1 cursor-pointer transition-colors text-[9.5px] active:scale-[0.98] ${
                viewMode === 'grid' ? 'bg-[#F5A623] text-black font-bold border-[#F5A623]' : 'bg-[#14141B] border-[#23232E] text-white/70'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>GRID</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Single-Bar Floating Transport matching Google Flow tactical aesthetic */}
      <div className="w-full max-w-6xl pointer-events-auto bg-[#0E0E12]/95 backdrop-blur-2xl border border-[#1C1C24] rounded-full px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3 shadow-2xl transition-all">
        {/* Left: Previous, Gold [PLAY] button, Next, and Timecode */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.98]"
            title="Previous Shot (J / Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* High-Contrast Gold [PLAY] button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className="px-4 py-1.5 rounded-full bg-[#F5A623] hover:bg-[#D97706] text-black font-black text-xs font-mono-tech flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] shadow-sm"
            title={isPlaying ? "Pause Sequence (Space / K)" : "Play Sequence (Space / L)"}
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
            type="button"
            onClick={onNext}
            className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.98]"
            title="Next Shot (L / Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Timecode in Gold font */}
          <div className="flex items-center gap-1 pl-1 text-xs font-mono-tech font-bold text-[#F5A623] tracking-wider whitespace-nowrap">
            <span className="text-white/40 text-[9px] font-medium mr-0.5">TC</span>
            <span>{shotTc.start || '00:00:01:00'}</span>
          </div>
        </div>

        {/* Center: Scrollable Continuous Shot Chips */}
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
                type="button"
                onClick={() => onSelectFrame(idx)}
                className={`nav-dash shrink-0 px-2.5 py-1 rounded-full font-mono-tech text-[10px] cursor-pointer flex items-center gap-1 transition-colors duration-150 active:scale-[0.98] ${
                  isActive
                    ? 'nav-dash-active bg-[#F5A623] text-black font-black shadow-[0_0_10px_rgba(245,166,35,0.6)] z-10'
                    : 'bg-[#14141B] hover:bg-[#1C1C26] text-white/60 hover:text-white border border-[#23232E]'
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
            <span className="text-[#F5A623]">{String(currentIndex + 1).padStart(3, '0')}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/60">{frames.length || 100}</span>
          </div>

          {/* Toggle Secondary Tools */}
          <button
            type="button"
            onClick={() => setIsToolsExpanded(p => !p)}
            className={`p-1.5 rounded-full cursor-pointer transition-colors active:scale-[0.98] ${
              isToolsExpanded ? 'bg-[#F5A623] text-black' : 'text-white/40 hover:text-white hover:bg-white/10'
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
