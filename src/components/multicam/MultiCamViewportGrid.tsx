/**
 * @file /src/components/multicam/MultiCamViewportGrid.tsx
 * @description Multi-Cam Viewport Grid Component with 2x2, 1x3, and 1x1 Configurations.
 * 
 * Capabilities:
 * 1. Visual Configuration Modes:
 *    - '2x2' Quad Grid: 4-quadrant layout for synchronized side-by-side comparison of active camera feeds.
 *    - '1x3' Director Grid: Prominent hero master program feed with 3 synchronized secondary angle feeds.
 *    - '1x1' Solo Monitor: Full-bleed single feed view with tactile angle switcher ribbon and A/B comparison.
 * 2. Active Feed Tally System: Glowing red/amber tally border ("● PROGRAM ON AIR") on the active cut.
 * 3. Live Angle Cutting: Click any active camera feed or press keys (1-4) to cut immediately at current playback time.
 * 4. Bound to App Shell: Synchronizes with sovereign multi-cam state in the App shell.
 * 5. Audio & Sync Offset Indicators: Real-time display of audio routing and millisecond timecode offsets.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { MultiCamGroup, MultiCamAngle } from '../../types/multicam';
import { samplePacks } from '../../data/frames';

export type MultiCamGridConfig = '2x2' | '1x3' | '1x1';

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
  // Local fallbacks
  const internalVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoRefs = externalVideoRefs || internalVideoRefs;

  const [localConfig, setLocalConfig] = useState<MultiCamGridConfig>('2x2');
  const [localExpanded, setLocalExpanded] = useState<boolean>(false);

  const activeConfig = controlledConfig !== undefined ? controlledConfig : localConfig;
  const isCurrentlyExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

  const setConfig = (newConfig: MultiCamGridConfig) => {
    if (onChangeConfig) {
      onChangeConfig(newConfig);
    } else {
      setLocalConfig(newConfig);
    }
  };

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(prev => !prev);
    }
  };

  // Keyboard shortcut listener: 1-4 for punch-in cuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key >= '1' && e.key <= '4') {
        const targetIdx = parseInt(e.key, 10) - 1;
        if (targetIdx < group.angles.length) {
          e.preventDefault();
          onSelectAngle(targetIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [group.angles.length, onSelectAngle]);

  // Format timecode
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Render video or image media element for a camera feed
  const renderAngleMedia = (angle: MultiCamAngle, index: number, isFill = true) => {
    const isVideo = angle.blobUrl && (angle.blobUrl.startsWith('blob:') || angle.blobUrl.endsWith('.mp4') || angle.blobUrl.endsWith('.webm'));
    const fallbackImage = samplePacks.cyberNoir[index % samplePacks.cyberNoir.length] || samplePacks.cosmicMacro[0];

    if (isVideo) {
      return (
        <video
          ref={el => { videoRefs.current[index] = el; }}
          src={angle.blobUrl}
          playsInline
          muted={index !== masterAudioIndex || isMuted}
          className={`w-full h-full ${isFill ? 'object-cover' : 'object-contain'} pointer-events-none select-none`}
        />
      );
    }

    return (
      <img
        src={angle.blobUrl || fallbackImage}
        alt={angle.label}
        className={`w-full h-full ${isFill ? 'object-cover' : 'object-contain'} pointer-events-none select-none`}
      />
    );
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#070709] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 font-sans ${isCurrentlyExpanded ? 'fixed inset-3 z-[150] shadow-2xl ring-2 ring-amber-500/40' : ''} ${className}`}>
      
      {/* Viewport Grid Control Header */}
      <div className="h-11 px-4 bg-[#0D0E15] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
        
        {/* Left: Configuration Switcher (2x2, 1x3, 1x1) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F5A623] animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase">
              VIEWPORT GRID
            </span>
          </div>

          <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/10">
            {/* 2x2 Quad Grid Button */}
            <button
              type="button"
              onClick={() => setConfig('2x2')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeConfig === '2x2'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="2x2 Quad Grid Configuration (4 synchronized camera angles side-by-side)"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span>2x2 QUAD</span>
            </button>

            {/* 1x3 Director Grid Button */}
            <button
              type="button"
              onClick={() => setConfig('1x3')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeConfig === '1x3'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="1x3 Director Configuration (Dominant program monitor + 3 secondary angle feeds)"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>1x3 DIRECTOR</span>
            </button>

            {/* 1x1 Solo Monitor Button */}
            <button
              type="button"
              onClick={() => setConfig('1x1')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                activeConfig === '1x1'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="1x1 Solo Configuration (Clean single feed with instant A/B angle comparison)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>1x1 SOLO</span>
            </button>
          </div>
        </div>

        {/* Center: Live Cut Telemetry */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/5">
            <span className="text-neutral-400">PROGRAM CUT:</span>
            <span className="text-amber-400 font-bold">
              {group.angles[currentActiveAngleIdx]?.label || `CAM 0${currentActiveAngleIdx + 1}`}
            </span>
          </div>

          <div className="text-neutral-500">·</div>

          <div className="text-cyan-400 tabular-nums">
            TC {formatTimecode(currentTimeMs)}
          </div>
        </div>

        {/* Right: Aspect Ratio & Fullscreen Expand */}
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

      {/* Main Grid Viewport based on activeConfig */}
      <div className="flex-1 w-full bg-[#050608] p-3 overflow-hidden flex flex-col justify-center items-center">
        
        {/* ==================================================================== */}
        {/* 1. CONFIGURATION: 2x2 QUAD GRID                                     */}
        {/* ==================================================================== */}
        {activeConfig === '2x2' && (
          <div className="w-full h-full max-h-full grid grid-cols-2 grid-rows-2 gap-3 p-1 overflow-hidden">
            {group.angles.slice(0, 4).map((angle, idx) => {
              const isActive = idx === currentActiveAngleIdx;
              const isMaster = idx === masterAudioIndex;

              return (
                <div
                  key={angle.id}
                  onClick={() => onSelectAngle(idx)}
                  className={`group relative w-full h-full bg-black rounded-xl overflow-hidden cursor-pointer transition-all duration-150 flex flex-col justify-between border-2 ${
                    isActive
                      ? 'border-[#F5A623] shadow-[0_0_20px_rgba(245,166,35,0.4)] ring-2 ring-[#F5A623]/40 z-10'
                      : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Media Feed */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    {renderAngleMedia(angle, idx, true)}
                  </div>

                  {/* Top Tally Bar */}
                  <div className="relative z-10 p-2 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        isActive ? 'bg-[#F5A623] text-black shadow-md' : 'bg-black/80 text-white border border-white/20'
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

                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#EF4444] text-white font-black text-[10px] tracking-wider uppercase animate-pulse shadow-[0_0_10px_#EF4444]">
                          ● PROGRAM ON AIR
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-md bg-black/80 border border-white/20 text-neutral-300 font-mono text-[9px] transition-opacity">
                          CLICK TO CUT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Metas */}
                  <div className="relative z-10 p-2 flex items-center justify-between text-[10px] font-mono bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                    <span className="text-neutral-300 font-medium truncate max-w-[140px]">
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
        )}

        {/* ==================================================================== */}
        {/* 2. CONFIGURATION: 1x3 DIRECTOR MULTI-ANGLE                          */}
        {/* ==================================================================== */}
        {activeConfig === '1x3' && (
          <div className="w-full h-full flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Primary Hero Master Feed (70%) */}
            <div className="flex-[2.2] relative bg-black rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_24px_rgba(245,166,35,0.35)] flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                {renderAngleMedia(group.angles[currentActiveAngleIdx] || group.angles[0], currentActiveAngleIdx, false)}
              </div>

              {/* Hero Top Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-mono font-black text-xs shadow-md tracking-wider">
                    {group.angles[currentActiveAngleIdx]?.label || `CAM 0${currentActiveAngleIdx + 1}`}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-red-500/50 text-red-400 font-mono font-bold text-[10px] tracking-widest flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    PROGRAM ON AIR
                  </span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-cyan-400 font-mono text-xs tabular-nums">
                  TC {formatTimecode(currentTimeMs)}
                </div>
              </div>

              {/* Hero Bottom Lens Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-white bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-none z-10">
                <span className="truncate max-w-[220px]">
                  {group.angles[currentActiveAngleIdx]?.name || `Angle ${currentActiveAngleIdx + 1}`}
                </span>
                <span className="text-neutral-400">
                  SYNC {group.angles[currentActiveAngleIdx]?.syncOffsetMs || 0}ms · MASTER MIC {masterAudioIndex + 1}
                </span>
              </div>
            </div>

            {/* 3 Secondary Feeds (30%) */}
            <div className="flex-1 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto no-scrollbar">
              {group.angles.map((angle, idx) => {
                const isActive = idx === currentActiveAngleIdx;

                return (
                  <div
                    key={angle.id}
                    onClick={() => onSelectAngle(idx)}
                    className={`relative flex-1 min-w-[140px] lg:min-w-0 bg-black rounded-xl overflow-hidden cursor-pointer transition-all border-2 flex items-center justify-center group ${
                      isActive
                        ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg opacity-100 scale-[1.01]'
                        : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0">
                      {renderAngleMedia(angle, idx, true)}
                    </div>

                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 pointer-events-none">
                      <div className="flex items-center gap-1">
                        <span className={`w-4 h-4 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                          isActive ? 'bg-amber-400 text-black' : 'bg-black/80 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[9px]">
                          {angle.label}
                        </span>
                      </div>

                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500 text-white font-bold text-[8px] uppercase">
                          ON AIR
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between text-[8px] font-mono text-neutral-300 bg-black/70 px-1.5 py-0.5 rounded pointer-events-none">
                      <span className="truncate max-w-[80px]">{angle.name || `Angle ${idx + 1}`}</span>
                      <span>{angle.syncOffsetMs}ms</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. CONFIGURATION: 1x1 SOLO MONITOR                                  */}
        {/* ==================================================================== */}
        {activeConfig === '1x1' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
            <div className={`relative w-full max-h-[72vh] mx-auto bg-black rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_28px_rgba(245,166,35,0.3)] flex items-center justify-center ${
              aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '2.39:1' ? 'aspect-[2.39/1]' : 'aspect-[16/9]'
            }`}>
              <div className="absolute inset-0 flex items-center justify-center">
                {renderAngleMedia(group.angles[currentActiveAngleIdx] || group.angles[0], currentActiveAngleIdx, false)}
              </div>

              {/* Top Bar with A/B Toggle */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-400 text-black font-mono font-black text-xs shadow-md tracking-wider">
                    {group.angles[currentActiveAngleIdx]?.label || `CAM 0${currentActiveAngleIdx + 1}`}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 text-neutral-300 font-mono text-xs">
                    SOLO FEED
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (currentActiveAngleIdx + 1) % group.angles.length;
                    onSelectAngle(nextIdx);
                  }}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Flip to Next Angle for A/B Comparison"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next Angle</span>
                </button>
              </div>

              {/* Bottom Angle Metas */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-white bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 pointer-events-none z-10">
                <div>
                  <span className="font-bold text-amber-400">{group.angles[currentActiveAngleIdx]?.name || `Angle ${currentActiveAngleIdx + 1}`}</span>
                  <span className="text-neutral-400 ml-2">Sync: {group.angles[currentActiveAngleIdx]?.syncOffsetMs || 0}ms</span>
                </div>
                <div className="text-cyan-400 font-bold tabular-nums">
                  TC {formatTimecode(currentTimeMs)}
                </div>
              </div>
            </div>

            {/* Bottom Dock Angle Selector Bar */}
            <div className="mt-3 flex items-center gap-2 p-1.5 bg-[#0D0E15] border border-white/10 rounded-2xl shadow-xl">
              {group.angles.map((a, idx) => {
                const isSelected = idx === currentActiveAngleIdx;
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
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/30">
                      {idx + 1}
                    </span>
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
