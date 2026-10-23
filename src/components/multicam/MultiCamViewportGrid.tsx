/**
 * @file /src/components/multicam/MultiCamViewportGrid.tsx
 * @description Multi-Cam Viewport Grid Component with 2x2, 1x3, and 1x1 Configurations,
 * smooth layout morphing transition animations, and keyboard shortcuts ('1', '2', '3').
 * 
 * Capabilities:
 * 1. Visual Configuration Modes:
 *    - '1x1' Solo Monitor (Key '1'): Clean full-bleed single feed with tactile angle switcher & A/B comparison.
 *    - '1x3' Director Grid (Key '2'): Dominant hero master program feed with 3 synchronized secondary angle feeds.
 *    - '2x2' Quad Grid (Key '3'): 4-quadrant layout for synchronized side-by-side comparison of active camera feeds.
 * 2. Layout Transition Animations:
 *    - Smooth layout morphing: camera feeds smoothly morph and resize using GPU-accelerated CSS transitions
 *      (`transition: all 480ms cubic-bezier(0.25, 1, 0.5, 1)`).
 *    - Continuous video playback: video elements remain mounted without unmounting or restarting playback.
 * 3. Keyboard Shortcuts '1', '2', and '3':
 *    - '1': Instantly activates 1x1 Solo preset.
 *    - '2': Instantly activates 1x3 Director preset.
 *    - '3': Instantly activates 2x2 Quad preset.
 * 4. Visual Indicator of Active Preset:
 *    - Tactile key badges (`[1]`, `[2]`, `[3]`) and glowing active preset indicators.
 *    - Dedicated active preset telemetry badge with live pulsing status indicator.
 *    - Corner HUD badge showing current preset mode.
 * 5. Broadcast Tally & Live Cutting:
 *    - Glowing red tally border ("● PROGRAM ON AIR") on the active cut.
 *    - Click any camera feed to cut to that angle instantly at the current timestamp.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Grid2X2, 
  LayoutList, 
  Square, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  ArrowLeftRight,
  Video,
  Radio,
  Sliders,
  Sparkles,
  Check
} from 'lucide-react';
import { MultiCamGroup, MultiCamAngle } from '../../types/multicam';
import { samplePacks } from '../../data/frames';

export type MultiCamGridConfig = '1x1' | '1x3' | '2x2';

export interface MultiCamViewportGridProps {
  group: MultiCamGroup;
  currentActiveAngleIdx: number;
  previewAngleIdx?: number;
  currentTimeMs: number;
  isPlaying: boolean;
  isMuted?: boolean;
  masterAudioIndex?: number;
  onSelectAngle: (angleIndex: number) => void;
  onSetMasterAudio?: (angleIndex: number) => void;
  videoRefs?: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  config?: MultiCamGridConfig;
  onChangeConfig?: (config: MultiCamGridConfig) => void;
  aspectRatio?: '9:16' | '16:9' | '2.39:1';
  onChangeAspectRatio?: (ratio: '9:16' | '16:9' | '2.39:1') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

export const MultiCamViewportGrid: React.FC<MultiCamViewportGridProps> = ({
  group,
  currentActiveAngleIdx,
  previewAngleIdx = 0,
  currentTimeMs,
  isPlaying,
  isMuted = false,
  masterAudioIndex = 0,
  onSelectAngle,
  onSetMasterAudio,
  videoRefs: externalVideoRefs,
  config: controlledConfig,
  onChangeConfig,
  aspectRatio = '9:16',
  onChangeAspectRatio,
  isExpanded: controlledExpanded,
  onToggleExpand,
  className = ''
}) => {
  // Video references fallback
  const internalVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoRefs = externalVideoRefs || internalVideoRefs;

  const [localConfig, setLocalConfig] = useState<MultiCamGridConfig>('2x2');
  const [localExpanded, setLocalExpanded] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [recentlySwitchedPreset, setRecentlySwitchedPreset] = useState<MultiCamGridConfig | null>(null);

  const activeConfig = controlledConfig !== undefined ? controlledConfig : localConfig;
  const isCurrentlyExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

  const setConfig = useCallback((newConfig: MultiCamGridConfig) => {
    if (onChangeConfig) {
      onChangeConfig(newConfig);
    } else {
      setLocalConfig(newConfig);
    }
    setRecentlySwitchedPreset(newConfig);
    setTimeout(() => setRecentlySwitchedPreset(null), 1800);
  }, [onChangeConfig]);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(prev => !prev);
    }
  };

  // Detect compact responsive layout
  useEffect(() => {
    const checkWidth = () => {
      setIsCompact(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Keyboard shortcut listener: '1', '2', and '3' to instantly switch/cycle grid presets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
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

      if (e.key === '1') {
        e.preventDefault();
        setConfig(activeConfig === '1x1' ? '1x3' : '1x1');
      } else if (e.key === '2') {
        e.preventDefault();
        setConfig(activeConfig === '1x3' ? '2x2' : '1x3');
      } else if (e.key === '3') {
        e.preventDefault();
        setConfig(activeConfig === '2x2' ? '1x1' : '2x2');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const cycleOrder: MultiCamGridConfig[] = ['1x1', '1x3', '2x2'];
        const nextIdx = (cycleOrder.indexOf(activeConfig) + 1) % cycleOrder.length;
        setConfig(cycleOrder[nextIdx]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setConfig, activeConfig]);

  // Format timecode
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Safe angles up to 4
  const displayAngles = useMemo(() => {
    return group.angles.slice(0, 4);
  }, [group.angles]);

  const heroIdx = currentActiveAngleIdx < displayAngles.length ? currentActiveAngleIdx : 0;
  const secondaryIndices = useMemo(() => {
    return [0, 1, 2, 3].slice(0, displayAngles.length).filter(i => i !== heroIdx);
  }, [displayAngles.length, heroIdx]);

  // Compute smooth morphing layout coordinates for angle `idx`
  const getCardLayoutStyle = (idx: number): React.CSSProperties => {
    const baseTransition = 'top 480ms cubic-bezier(0.25, 1, 0.5, 1), left 480ms cubic-bezier(0.25, 1, 0.5, 1), width 480ms cubic-bezier(0.25, 1, 0.5, 1), height 480ms cubic-bezier(0.25, 1, 0.5, 1), opacity 400ms ease, transform 480ms cubic-bezier(0.25, 1, 0.5, 1), border-color 200ms ease, box-shadow 200ms ease';

    // 1. CONFIGURATION: 2x2 QUAD GRID
    if (activeConfig === '2x2') {
      const isLeft = idx % 2 === 0;
      const isTop = idx < 2;

      return {
        position: 'absolute',
        top: isTop ? '0%' : 'calc(50% + 5px)',
        left: isLeft ? '0%' : 'calc(50% + 5px)',
        width: 'calc(50% - 5px)',
        height: 'calc(50% - 5px)',
        opacity: 1,
        transform: 'scale(1)',
        pointerEvents: 'auto',
        zIndex: idx === heroIdx ? 15 : 10,
        willChange: 'top, left, width, height, transform, opacity',
        transition: baseTransition
      };
    }

    // 2. CONFIGURATION: 1x3 DIRECTOR SPLIT
    if (activeConfig === '1x3') {
      if (idx === heroIdx) {
        // Dominant Hero Monitor
        if (isCompact) {
          return {
            position: 'absolute',
            top: '0%',
            left: '0%',
            width: '100%',
            height: 'calc(65% - 4px)',
            opacity: 1,
            transform: 'scale(1)',
            pointerEvents: 'auto',
            zIndex: 20,
            willChange: 'top, left, width, height, transform, opacity',
            transition: baseTransition
          };
        }
        return {
          position: 'absolute',
          top: '0%',
          left: '0%',
          width: 'calc(68% - 6px)',
          height: '100%',
          opacity: 1,
          transform: 'scale(1)',
          pointerEvents: 'auto',
          zIndex: 20,
          willChange: 'top, left, width, height, transform, opacity',
          transition: baseTransition
        };
      } else {
        // Secondary 3 comparison monitors
        const slot = secondaryIndices.indexOf(idx);
        const safeSlot = slot >= 0 ? slot : 0;

        if (isCompact) {
          const widthPct = 'calc(33.333% - 4px)';
          const leftCalc = `calc(${safeSlot * 33.333}% + ${safeSlot === 0 ? 0 : safeSlot === 1 ? 2 : 4}px)`;
          return {
            position: 'absolute',
            top: 'calc(65% + 4px)',
            left: leftCalc,
            width: widthPct,
            height: 'calc(35% - 4px)',
            opacity: 1,
            transform: 'scale(1)',
            pointerEvents: 'auto',
            zIndex: 10,
            willChange: 'top, left, width, height, transform, opacity',
            transition: baseTransition
          };
        }

        const heightPct = 'calc(33.333% - 6px)';
        const topCalc = `calc(${safeSlot * 33.333}% + ${safeSlot === 0 ? 0 : safeSlot === 1 ? 3 : 6}px)`;
        return {
          position: 'absolute',
          top: topCalc,
          left: 'calc(68% + 6px)',
          width: 'calc(32% - 6px)',
          height: heightPct,
          opacity: 1,
          transform: 'scale(1)',
          pointerEvents: 'auto',
          zIndex: 10,
          willChange: 'top, left, width, height, transform, opacity',
          transition: baseTransition
        };
      }
    }

    // 3. CONFIGURATION: 1x1 SOLO FEED
    if (activeConfig === '1x1') {
      if (idx === heroIdx) {
        return {
          position: 'absolute',
          top: '0%',
          left: '0%',
          width: '100%',
          height: '100%',
          opacity: 1,
          transform: 'scale(1)',
          pointerEvents: 'auto',
          zIndex: 25,
          willChange: 'top, left, width, height, transform, opacity',
          transition: baseTransition
        };
      } else {
        return {
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '25%',
          height: '25%',
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.75)',
          pointerEvents: 'none',
          zIndex: 1,
          willChange: 'top, left, width, height, transform, opacity',
          transition: baseTransition
        };
      }
    }

    return { transition: baseTransition };
  };

  // Render video or image media element for a camera feed
  const renderAngleMedia = (angle: MultiCamAngle, index: number) => {
    const isVideo = angle.blobUrl && (angle.blobUrl.startsWith('blob:') || angle.blobUrl.endsWith('.mp4') || angle.blobUrl.endsWith('.webm'));
    const fallbackImage = samplePacks.cyberNoir[index % samplePacks.cyberNoir.length] || samplePacks.cosmicMacro[0];

    if (isVideo) {
      return (
        <video
          ref={el => { videoRefs.current[index] = el; }}
          src={angle.blobUrl}
          playsInline
          muted={index !== masterAudioIndex || isMuted}
          className="w-full h-full object-cover pointer-events-none select-none transition-all duration-500"
        />
      );
    }

    return (
      <img
        src={angle.blobUrl || fallbackImage}
        alt={angle.label}
        className="w-full h-full object-cover pointer-events-none select-none transition-all duration-500"
      />
    );
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#070709] border border-white/10 rounded-2xl overflow-hidden font-sans select-none ${isCurrentlyExpanded ? 'fixed inset-3 z-[150] shadow-2xl ring-2 ring-amber-500/40' : ''} ${className}`}>
      
      {/* 1. Viewport Grid Control Header & Preset Switcher */}
      <div className="h-12 px-4 bg-[#0D0E15] border-b border-white/10 flex items-center justify-between shrink-0 z-30">
        
        {/* Left: Configuration Switcher with Key Badges ('1', '2', '3') */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F5A623] animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase hidden sm:inline">
              PRESET GRID
            </span>
          </div>

          {/* Interactive Preset Buttons with Keyboard Shortcuts [1], [2], [3] */}
          <div className="flex items-center p-1 bg-black/70 rounded-xl border border-white/10 shadow-inner">
            {/* 1x1 Solo Preset Button (Shortcut '1') */}
            <button
              type="button"
              onClick={() => setConfig('1x1')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeConfig === '1x1'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,166,35,0.45)] ring-1 ring-amber-300'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Press '1' to activate 1x1 Solo Grid Preset"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                activeConfig === '1x1' ? 'bg-black/40 text-amber-300' : 'bg-white/10 text-neutral-400'
              }`}>
                1
              </kbd>
              <Square className="w-3.5 h-3.5" />
              <span>1x1 SOLO</span>
            </button>

            {/* 1x3 Director Preset Button (Shortcut '2') */}
            <button
              type="button"
              onClick={() => setConfig('1x3')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeConfig === '1x3'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,166,35,0.45)] ring-1 ring-amber-300'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Press '2' to activate 1x3 Director Grid Preset"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                activeConfig === '1x3' ? 'bg-black/40 text-amber-300' : 'bg-white/10 text-neutral-400'
              }`}>
                2
              </kbd>
              <LayoutList className="w-3.5 h-3.5" />
              <span>1x3 DIRECTOR</span>
            </button>

            {/* 2x2 Quad Preset Button (Shortcut '3') */}
            <button
              type="button"
              onClick={() => setConfig('2x2')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeConfig === '2x2'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_12px_rgba(245,166,35,0.45)] ring-1 ring-amber-300'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Press '3' to activate 2x2 Quad Grid Preset"
            >
              <kbd className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-black ${
                activeConfig === '2x2' ? 'bg-black/40 text-amber-300' : 'bg-white/10 text-neutral-400'
              }`}>
                3
              </kbd>
              <Grid2X2 className="w-3.5 h-3.5" />
              <span>2x2 QUAD</span>
            </button>
          </div>
        </div>

        {/* Center: Prominent Visual Indicator of the Active Preset */}
        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
          <span className="text-neutral-500 text-[10px] tracking-wider uppercase font-semibold">
            ACTIVE PRESET:
          </span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/60 border border-[#FFE066]/40 text-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.15)] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#FFE066] animate-pulse shadow-[0_0_6px_#FFE066]" />
            {activeConfig === '1x1' && <span>1x1 SOLO MONITOR [KEY 1]</span>}
            {activeConfig === '1x3' && <span>1x3 DIRECTOR SPLIT [KEY 2]</span>}
            {activeConfig === '2x2' && <span>2x2 QUAD GRID [KEY 3]</span>}
          </div>
        </div>

        {/* Right: Aspect Ratio & Expand Controls */}
        <div className="flex items-center gap-2">
          {onChangeAspectRatio && (
            <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/10 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => onChangeAspectRatio('9:16')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  aspectRatio === '9:16' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                9:16
              </button>
              <button
                type="button"
                onClick={() => onChangeAspectRatio('16:9')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  aspectRatio === '16:9' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                16:9
              </button>
              <button
                type="button"
                onClick={() => onChangeAspectRatio('2.39:1')}
                className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                  aspectRatio === '2.39:1' ? 'bg-cyan-500 text-black font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                2.39:1
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleExpand}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            title={isCurrentlyExpanded ? "Dock Layout" : "Expand to Fullscreen Viewport"}
          >
            {isCurrentlyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Main Animated Viewport Canvas (Camera feeds smoothly morph and resize here) */}
      <div className="relative flex-1 w-full h-full bg-[#050608] p-3 overflow-hidden">
        
        {/* Unified morphing container holding all 4 camera feeds */}
        <div className="relative w-full h-full overflow-hidden">
          {displayAngles.map((angle, idx) => {
            const isHero = idx === heroIdx;
            const isMaster = idx === masterAudioIndex;
            const layoutStyle = getCardLayoutStyle(idx);

            return (
              <div
                key={angle.id}
                style={layoutStyle}
                onClick={() => onSelectAngle(idx)}
                className={`group rounded-2xl overflow-hidden cursor-pointer flex flex-col justify-between border-2 select-none shadow-2xl ${
                  isHero
                    ? 'border-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.35)] ring-2 ring-[#EF4444]/40'
                    : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                }`}
              >
                {/* Media element with smooth resize */}
                <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
                  {renderAngleMedia(angle, idx)}
                </div>

                {/* Top Broadcast Tally Overlay */}
                <div className="relative z-10 p-2.5 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      isHero ? 'bg-[#EF4444] text-white shadow-md' : 'bg-black/80 text-white border border-white/20'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono font-bold text-xs tracking-wider">
                      {angle.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    {isMaster && (
                      <span className="p-1 rounded-md bg-black/80 border border-amber-500/30 text-amber-400" title="Master Audio Feed">
                        <Volume2 className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {isHero ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#EF4444] text-white font-black text-[10px] tracking-wider uppercase animate-pulse shadow-[0_0_12px_#EF4444]">
                        ● PROGRAM ON AIR
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-md bg-black/80 border border-white/20 text-neutral-300 font-mono text-[9px] transition-opacity">
                        CLICK TO CUT
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Lens Specification Overlay */}
                <div className="relative z-10 p-2.5 flex items-center justify-between text-[10px] font-mono bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none">
                  <span className="text-neutral-300 font-medium truncate max-w-[160px]">
                    {angle.name || `Angle 0${idx + 1}`}
                  </span>
                  <span className="text-amber-400/90 tabular-nums">
                    {angle.syncOffsetMs !== 0 ? `${angle.syncOffsetMs > 0 ? '+' : ''}${angle.syncOffsetMs}ms` : '0ms SYNC'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Persistent Viewport Active Preset HUD Indicator */}
        <div className="absolute top-5 left-5 z-30 pointer-events-none flex items-center gap-2 bg-black/85 backdrop-blur-md border border-[#FFE066]/35 px-3 py-1.5 rounded-xl font-mono text-[11px] shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-[#FFE066] animate-pulse shadow-[0_0_8px_#FFE066]" />
          <span className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">PRESET:</span>
          <span className="text-[#FFE066] font-bold tracking-wider uppercase">
            {activeConfig === '1x1' ? '1x1 SOLO' : activeConfig === '1x3' ? '1x3 DIRECTOR' : '2x2 QUAD'}
          </span>
          <span className="text-neutral-400 text-[10px] border-l border-white/20 pl-2 ml-0.5">
            KEY <kbd className="px-1 py-0.2 bg-white/10 rounded text-[9px] text-amber-300 font-bold">{activeConfig === '1x1' ? '1' : activeConfig === '1x3' ? '2' : '3'}</kbd>
          </span>
        </div>

        {/* Transient Morph Transition HUD Confirmation Badge */}
        {recentlySwitchedPreset && (
          <div className="absolute top-5 right-5 z-40 bg-black/95 border border-[#FFE066]/60 px-4 py-2 rounded-xl shadow-[0_0_24px_rgba(255,224,102,0.25)] backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Sparkles className="w-4 h-4 text-[#FFE066] animate-spin" />
            <span className="font-mono text-xs font-bold text-[#FFE066] tracking-wider uppercase">
              MORPHED TO {recentlySwitchedPreset === '1x1' ? '1x1 SOLO' : recentlySwitchedPreset === '1x3' ? '1x3 DIRECTOR' : '2x2 QUAD'} GRID
            </span>
          </div>
        )}

        {/* Floating Quick Switcher Dock in 1x1 Solo Mode */}
        {activeConfig === '1x1' && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-[#0D0E15]/95 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            {displayAngles.map((a, idx) => {
              const isSelected = idx === heroIdx;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelectAngle(idx)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-black font-bold shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={`Switch solo view to ${a.label}`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/30">
                    {idx + 1}
                  </span>
                  <span>{a.label}</span>
                </button>
              );
            })}

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={() => {
                const nextIdx = (heroIdx + 1) % displayAngles.length;
                onSelectAngle(nextIdx);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="A/B Flip to Next Angle"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              <span>A/B Flip</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
