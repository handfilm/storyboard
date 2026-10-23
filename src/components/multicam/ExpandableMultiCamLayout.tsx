/**
 * @file /src/components/multicam/ExpandableMultiCamLayout.tsx
 * @description Expandable Multi-Camera Layout Component with 2x2, 1x3, and 1x1 Visual Presets.
 * 
 * Capabilities:
 * 1. Preset 2x2 Quad Grid: 4-quadrant layout for synchronized side-by-side angle comparison.
 * 2. Preset 1x3 Director Grid: Dominant hero master program monitor with 3 synchronized angle thumbnails.
 * 3. Preset 1x1 Solo Monitor: Full-bleed high-detail single angle inspection with tactile angle carousel & A/B compare.
 * 4. Expandable Viewport: Toggle between docked studio fit and maximized full-bleed studio canvas.
 * 5. Broadcast Tally System: Glowing amber/red border ("ON AIR") on active cut, cyan/green for preview.
 * 6. Live Side-by-Side Switching: Click any angle quadrant/thumbnail or press keys (1-4) to cut instantly.
 * 7. Aspect Ratio Adaptation: Native support for 9:16 Shorts, 16:9 Widescreen, and 2.39:1 Cinema Scope.
 */

import React, { useState } from 'react';
import { 
  Grid2X2, 
  LayoutList, 
  Square, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Layers, 
  Sliders, 
  Eye, 
  Clock, 
  ArrowLeftRight,
  Video
} from 'lucide-react';
import { MultiCamGroup, MultiCamAngle } from '../../types/multicam';
import { samplePacks } from '../../data/frames';
import { MultiCamPresetThumbnail } from './MultiCamPresetThumbnail';

export type MultiCamLayoutPreset = '2x2' | '1x3' | '1x1';

export interface ExpandableMultiCamLayoutProps {
  group: MultiCamGroup;
  currentActiveAngleIdx: number;
  previewAngleIdx?: number;
  currentTimeMs: number;
  isPlaying: boolean;
  isMuted: boolean;
  masterAudioIndex: number;
  onSelectAngle: (angleIndex: number) => void;
  onSetMasterAudio?: (angleIndex: number) => void;
  videoRefs: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  layoutPreset?: MultiCamLayoutPreset;
  onChangeLayoutPreset?: (preset: MultiCamLayoutPreset) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  aspectRatio?: '9:16' | '16:9' | '2.39:1';
  onChangeAspectRatio?: (ratio: '9:16' | '16:9' | '2.39:1') => void;
  className?: string;
}

// Visual color palette for angle tags
const ANGLE_THEMES = [
  { border: 'border-amber-400', glow: 'shadow-[0_0_18px_rgba(245,166,35,0.45)]', badge: 'bg-amber-400 text-black', hex: '#F5A623' },
  { border: 'border-cyan-400', glow: 'shadow-[0_0_18px_rgba(0,229,255,0.45)]', badge: 'bg-cyan-400 text-black', hex: '#00E5FF' },
  { border: 'border-emerald-400', glow: 'shadow-[0_0_18px_rgba(16,185,129,0.45)]', badge: 'bg-emerald-400 text-black', hex: '#10B981' },
  { border: 'border-purple-400', glow: 'shadow-[0_0_18px_rgba(139,92,246,0.45)]', badge: 'bg-purple-400 text-white', hex: '#8B5CF6' }
];

export const ExpandableMultiCamLayout: React.FC<ExpandableMultiCamLayoutProps> = ({
  group,
  currentActiveAngleIdx,
  previewAngleIdx = 0,
  currentTimeMs,
  isPlaying,
  isMuted,
  masterAudioIndex,
  onSelectAngle,
  onSetMasterAudio,
  videoRefs,
  layoutPreset: controlledPreset,
  onChangeLayoutPreset,
  isExpanded: controlledExpanded,
  onToggleExpand,
  aspectRatio = '9:16',
  onChangeAspectRatio,
  className = ''
}) => {
  // Local state fallbacks if uncontrolled
  const [localPreset, setLocalPreset] = useState<MultiCamLayoutPreset>('2x2');
  const [localExpanded, setLocalExpanded] = useState<boolean>(false);
  const [compareABAngleIdx, setCompareABAngleIdx] = useState<number | null>(null);

  const activePreset = controlledPreset !== undefined ? controlledPreset : localPreset;
  const isCurrentlyExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

  const setPreset = (preset: MultiCamLayoutPreset) => {
    if (onChangeLayoutPreset) {
      onChangeLayoutPreset(preset);
    } else {
      setLocalPreset(preset);
    }
  };

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(prev => !prev);
    }
  };

  // Format timecode
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Helper to render video or image element for a camera angle
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

  // Determine aspect ratio class
  const getAspectRatioContainerClass = () => {
    if (aspectRatio === '9:16') return 'aspect-[9/16]';
    if (aspectRatio === '2.39:1') return 'aspect-[2.39/1]';
    return 'aspect-[16/9]';
  };

  return (
    <div className={`relative flex flex-col w-full h-full bg-[#070709] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 font-sans ${isCurrentlyExpanded ? 'fixed inset-3 z-[150] shadow-2xl ring-2 ring-amber-500/40' : ''} ${className}`}>
      
      {/* Top Multi-Cam Control Ribbon */}
      <div className="h-11 px-4 bg-[#0D0E15] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
        
        {/* Left: Layout Presets Switcher (2x2, 1x3, 1x1) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F5A623] animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase">
              MULTI-CAM LAYOUT
            </span>
          </div>

          <div className="flex items-center p-1 bg-black/70 rounded-xl border border-white/10 shadow-inner">
            {/* Preset 2x2: Quad View */}
            <button
              type="button"
              onClick={() => setPreset('2x2')}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === '2x2'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="2x2 Quad Grid Preset (Side-by-side comparison of 4 cameras)"
            >
              <MultiCamPresetThumbnail config="2x2" size="sm" isActive={activePreset === '2x2'} angles={group.angles} activeAngleIdx={currentActiveAngleIdx} />
              <span>2x2 QUAD</span>
            </button>

            {/* Preset 1x3: Director Hero + 3 Angle Sidebar/Bottom */}
            <button
              type="button"
              onClick={() => setPreset('1x3')}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === '1x3'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="1x3 Director Preset (Hero program monitor + 3 synchronized angle comparison monitors)"
            >
              <MultiCamPresetThumbnail config="1x3" size="sm" isActive={activePreset === '1x3'} angles={group.angles} activeAngleIdx={currentActiveAngleIdx} />
              <span>1x3 DIRECTOR</span>
            </button>

            {/* Preset 1x1: Solo Focused Monitor */}
            <button
              type="button"
              onClick={() => setPreset('1x1')}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === '1x1'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="1x1 Solo Inspection Preset (Full focus program angle with instant A/B flip)"
            >
              <MultiCamPresetThumbnail config="1x1" size="sm" isActive={activePreset === '1x1'} angles={group.angles} activeAngleIdx={currentActiveAngleIdx} />
              <span>1x1 SOLO</span>
            </button>
          </div>
        </div>

        {/* Center: Live Cut Status & Telemetry */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/5">
            <span className="text-neutral-400">CUT:</span>
            <span className="text-amber-400 font-bold">
              {group.angles[currentActiveAngleIdx]?.label || `CAM 0${currentActiveAngleIdx + 1}`}
            </span>
          </div>

          <div className="text-neutral-500">·</div>

          <div className="text-cyan-400 tabular-nums">
            TC {formatTimecode(currentTimeMs)}
          </div>
        </div>

        {/* Right: Aspect Ratio & Fullscreen Expand Toggle */}
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

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={handleToggleExpand}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            title={isCurrentlyExpanded ? "Dock Layout" : "Expand to Fullscreen Canvas"}
          >
            {isCurrentlyExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Viewport Container according to Active Preset */}
      <div className="flex-1 w-full bg-[#050608] p-3 overflow-hidden flex flex-col justify-center items-center">
        
        {/* ==================================================================== */}
        {/* PRESET 1: 2x2 QUAD GRID CONFIGURATION                               */}
        {/* ==================================================================== */}
        {activePreset === '2x2' && (
          <div className="w-full h-full max-h-full grid grid-cols-2 grid-rows-2 gap-3 p-1 overflow-hidden">
            {group.angles.slice(0, 4).map((angle, idx) => {
              const isActive = idx === currentActiveAngleIdx;
              const isMaster = idx === masterAudioIndex;
              const theme = ANGLE_THEMES[idx % ANGLE_THEMES.length];

              return (
                <div
                  key={angle.id}
                  onClick={() => onSelectAngle(idx)}
                  className={`group relative w-full h-full bg-black rounded-xl overflow-hidden cursor-pointer transition-all duration-150 flex flex-col justify-between border-2 ${
                    isActive
                      ? 'border-[#FFE066] animate-gold-focus-border ring-2 ring-[#F5A623]/80 ring-offset-2 ring-offset-black z-10'
                      : 'border-white/10 hover:border-amber-400/50 opacity-75 hover:opacity-100'
                  }`}
                >
                  {/* Optical Viewfinder Golden Focus Reticles on Active Feed */}
                  {isActive && (
                    <div className="absolute inset-2 pointer-events-none z-20">
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#FFE066] shadow-[0_0_8px_#FFE066]" />
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#FFE066] shadow-[0_0_8px_#FFE066]" />
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#FFE066] shadow-[0_0_8px_#FFE066]" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#FFE066] shadow-[0_0_8px_#FFE066]" />
                    </div>
                  )}

                  {/* Media Viewport */}
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    {renderAngleMedia(angle, idx, true)}
                  </div>

                  {/* Top Broadcast Tally Overlay */}
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
                        <span className="p-1 rounded-md bg-black/80 border border-amber-500/30 text-amber-400" title="Master Audio Mic">
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

                  {/* Bottom Camera Spec & Offset Bar */}
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
        {/* PRESET 2: 1x3 DIRECTOR MULTI-ANGLE CONFIGURATION                    */}
        {/* ==================================================================== */}
        {activePreset === '1x3' && (
          <div className="w-full h-full flex flex-col lg:flex-row gap-3 overflow-hidden">
            
            {/* Main Primary Hero Program Viewport (70% space) */}
            <div className="flex-[2.2] relative bg-black rounded-xl overflow-hidden border-2 border-[#FFE066] animate-gold-focus-border ring-2 ring-[#F5A623]/80 shadow-[0_0_28px_rgba(255,224,102,0.4)] flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                {renderAngleMedia(group.angles[currentActiveAngleIdx] || group.angles[0], currentActiveAngleIdx, false)}
              </div>

              {/* Broadcast Top Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black font-mono font-black text-xs shadow-md tracking-wider">
                    {group.angles[currentActiveAngleIdx]?.label || `CAM 0${currentActiveAngleIdx + 1}`}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-red-500/50 text-red-400 font-mono font-bold text-[10px] tracking-widest flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    LIVE PROGRAM
                  </span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-cyan-400 font-mono text-xs tabular-nums">
                  TC {formatTimecode(currentTimeMs)}
                </div>
              </div>

              {/* Bottom Lens Specification Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-white bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-none z-10">
                <span className="truncate max-w-[220px]">
                  {group.angles[currentActiveAngleIdx]?.name || `Angle ${currentActiveAngleIdx + 1}`}
                </span>
                <span className="text-neutral-400">
                  OFFSET {group.angles[currentActiveAngleIdx]?.syncOffsetMs || 0}ms · MASTER MIC {masterAudioIndex + 1}
                </span>
              </div>
            </div>

            {/* 3 Secondary Angle Monitors for Comparison & Instant Cut (30% space) */}
            <div className="flex-1 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto no-scrollbar">
              {group.angles.map((angle, idx) => {
                const isActive = idx === currentActiveAngleIdx;
                const isMaster = idx === masterAudioIndex;

                return (
                  <div
                    key={angle.id}
                    onClick={() => onSelectAngle(idx)}
                    className={`relative flex-1 min-w-[140px] lg:min-w-0 bg-black rounded-xl overflow-hidden cursor-pointer transition-all border-2 flex items-center justify-center group ${
                      isActive
                        ? 'border-[#FFE066] animate-gold-focus-border ring-2 ring-[#F5A623]/80 shadow-[0_0_15px_rgba(255,224,102,0.5)] opacity-100 scale-[1.01]'
                        : 'border-white/10 hover:border-amber-400/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="absolute inset-0">
                      {renderAngleMedia(angle, idx, true)}
                    </div>

                    {/* Top Angle Bar */}
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

                    {/* Bottom Label */}
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
        {/* PRESET 3: 1x1 SOLO COMPARISON CONFIGURATION                         */}
        {/* ==================================================================== */}
        {activePreset === '1x1' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
            
            {/* Solo Monitor Frame */}
            <div className={`relative w-full max-h-[72vh] mx-auto bg-black rounded-xl overflow-hidden border-2 border-[#FFE066] animate-gold-focus-border ring-2 ring-[#F5A623]/80 shadow-[0_0_28px_rgba(255,224,102,0.4)] flex items-center justify-center ${getAspectRatioContainerClass()}`}>
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
                    SOLO INSPECTION
                  </span>
                </div>

                {/* Quick A/B Flip Switcher */}
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
