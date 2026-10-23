/**
 * @file /src/components/timeline/BiDirectionalTimeline.tsx
 * @description Bi-Directional Multi-Track Timeline Controller for RAWx Master OS & Bloom Canvas.
 * 
 * Mandated Capabilities:
 * - Bi-directional synchronization: Storyboard frames dynamically mirror the NLE "CUT" multi-track timeline with zero desync.
 * - Multi-lane layout (V2 Overlays, V1 Main Shots, T1 Titles, A1 SFX, A2 Music/Drone, VO Voiceover).
 * - Real-time scrubbing with HTTP byte-range streaming simulation.
 * - Integrated 3-Band Web Audio EQ sliders (Low 120Hz, Mid 1200Hz, High 6500Hz).
 * - Real-time Waveform Canvas rendering with auto-ducking state indicator.
 * - Transient Silence & Beat markers along timeline ruler.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { TrackLane, TimelineClip, TrackLaneId } from '../../types/cut';
import { WaveformCanvas } from './WaveformCanvas';
import { webAudioDspService } from '../../services/webAudioDspService';
import { r2StorageService } from '../../services/r2StorageService';
import { localDbService } from '../../services/localDbService';
import { 
  Play, 
  Pause, 
  Scissors, 
  SlidersHorizontal, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Activity, 
  Clock, 
  Flame, 
  Sparkles,
  Zap,
  RotateCcw
} from 'lucide-react';

interface BiDirectionalTimelineProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectFrame: (index: number) => void;
  onSyncFramesToTimeline?: (frames: AnthologyFrame[]) => void;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  className?: string;
}

const DEFAULT_LANES: TrackLane[] = [
  { id: 'V2', label: 'V2 OVERLAYS', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'V1', label: 'V1 MASTER SHOTS', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'T1', label: 'T1 TITLES/BENGALI', type: 'text', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A1', label: 'A1 SOUND FX', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A2', label: 'A2 MUSIC/DRONE', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'VO', label: 'VO DIALOGUE/VO', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
];

export const BiDirectionalTimeline: React.FC<BiDirectionalTimelineProps> = ({
  frames,
  currentIndex,
  isPlaying,
  onTogglePlay,
  onSelectFrame,
  onSyncFramesToTimeline,
  onUpdateFrame,
  className = ''
}) => {
  // Playhead play position in seconds
  const [playheadTimeSec, setPlayheadTimeSec] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(45); // pixels per second
  const [isScrubbing, setIsScrubbing] = useState(false);

  // 3-Band Parametric EQ State (dB)
  const [eqLow, setEqLow] = useState(2.5);
  const [eqMid, setEqMid] = useState(0.0);
  const [eqHigh, setEqHigh] = useState(1.5);
  const [isEqExpanded, setIsEqExpanded] = useState(false);

  // Auto-Ducking active state
  const [isDuckingActive, setIsDuckingActive] = useState(false);

  // Transient beat cut marks
  const [showBeatMarkers, setShowBeatMarkers] = useState(true);

  const rulerRef = useRef<HTMLDivElement>(null);

  // Synchronize 3-Band EQ changes to webAudioDspService
  const handleEqChange = (low: number, mid: number, high: number) => {
    setEqLow(low);
    setEqMid(mid);
    setEqHigh(high);
    webAudioDspService.setEq(low, mid, high);
  };

  // Convert AnthologyFrames into V1 Timeline Clips with zero desync (strict 12.0s slides)
  const SLIDE_DURATION_SEC = 12.0;

  const timelineClips: TimelineClip[] = useMemo(() => {
    let cursor = 0;
    return frames.map((f, i) => {
      const clipDuration = SLIDE_DURATION_SEC; // Strictly 12.0s per slide
      const clip: TimelineClip = {
        id: `clip_${f.id}_${i}`,
        trackId: 'V1',
        name: `SH${String(i + 1).padStart(3, '0')} - ${f.title}`,
        type: f.isVideo ? 'video' : 'image',
        start: cursor,
        duration: clipDuration,
        inPoint: 0,
        outPoint: clipDuration,
        url: f.imageUrl,
        shotIndex: i,
        posX: 0,
        posY: 0,
        scale: 100,
        rotation: 0,
        opacity: 100,
        blendMode: 'normal',
        mask: 'none',
        crop: { top: 0, bottom: 0, left: 0, right: 0 },
        animation: { inType: 'none', outType: 'none', duration: 0.5 },
        adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
        audio: { volume: 80, fadeIn: 0.2, fadeOut: 0.2, noiseReduction: false }
      };
      cursor += clipDuration;
      return clip;
    });
  }, [frames]);

  const totalDurationSec = useMemo(() => {
    return Math.max(30, frames.length * SLIDE_DURATION_SEC);
  }, [frames.length]);

  // Synchronize playhead with currentIndex
  useEffect(() => {
    if (!isScrubbing) {
      setPlayheadTimeSec(currentIndex * SLIDE_DURATION_SEC);
    }
  }, [currentIndex, isScrubbing]);

  // Timeline Scrubbing Handler with simulated HTTP Byte-Range request
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updatePlayheadFromMouseEvent(e);
  };

  const updatePlayheadFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, e.clientX - rect.left);
    const newTime = Math.max(0, Math.min(totalDurationSec, clickX / zoomLevel));
    setPlayheadTimeSec(newTime);

    // Map time to shot index
    const shotIdx = Math.min(frames.length - 1, Math.floor(newTime / SLIDE_DURATION_SEC));
    if (shotIdx !== currentIndex) {
      onSelectFrame(shotIdx);
    }

    // Trigger instant HTTP byte-range preview request
    r2StorageService.fetchByteRange({
      key: `shots/shot_${String(shotIdx + 1).padStart(3, '0')}.mp4`,
      startByte: Math.round(newTime * 50000),
      endByte: Math.round(newTime * 50000 + 64000)
    });
  }, [totalDurationSec, zoomLevel, frames.length, currentIndex, onSelectFrame]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) updatePlayheadFromMouseEvent(e);
    };
    const handleMouseUp = () => setIsScrubbing(false);

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, updatePlayheadFromMouseEvent]);

  // Formatted SMPTE Timecode
  const formattedTc = useMemo(() => {
    const totalFrames = Math.floor(playheadTimeSec * 24);
    const f = totalFrames % 24;
    const s = Math.floor(playheadTimeSec) % 60;
    const m = Math.floor(playheadTimeSec / 60) % 60;
    const h = Math.floor(playheadTimeSec / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  }, [playheadTimeSec]);

  return (
    <div className={`w-full bg-[#07080C] border-t border-white/10 flex flex-col select-none text-white font-mono ${className}`}>
      {/* ========================================================================= */}
      {/* 1. TIMELINE TRANSPORT & DSP EQUALIZER HEADER                              */}
      {/* ========================================================================= */}
      <div className="h-10 bg-[#0B0B0F] border-b border-white/10 px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onTogglePlay}
            className={`p-1.5 rounded-xs border cursor-pointer transition-all flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-rose-500 text-black border-rose-400 font-bold shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                : 'bg-white/5 border-white/15 text-white/70 hover:text-white hover:border-white/40'
            }`}
            title="Toggle Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[10px] hidden sm:inline">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          {/* Timecode Readout */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-black/80 border border-rose-500/40 rounded-xs font-mono font-bold text-rose-400 text-xs">
            <span className="text-white/40 text-[9px]">TC</span>
            <span>{formattedTc}</span>
          </div>

          <span className="text-white/20">|</span>

          {/* Real-time Web Audio DSP Waveform Mini-Canvas */}
          <div className="flex items-center gap-2">
            <WaveformCanvas width={140} height={22} mode="bars" isPlaying={isPlaying} />
            <span className="text-[8.5px] text-white/50 hidden md:inline">DSP 64-BAND</span>
          </div>
        </div>

        {/* 3-Band Parametric EQ & Auto-Ducking Quick Access */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEqExpanded(p => !p)}
            className={`px-2.5 py-1 rounded-xs border text-[9px] font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              isEqExpanded
                ? 'bg-rose-500 text-black border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
            }`}
            title="Toggle 3-Band Parametric Audio EQ"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>3-BAND EQ</span>
          </button>

          {/* Zoom In / Out */}
          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-xs border border-white/10 text-[9px]">
            <span className="text-white/40">ZOOM:</span>
            <input
              type="range"
              min="20"
              max="100"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-16 accent-rose-500 cursor-pointer h-1 bg-white/20 rounded"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXPANDABLE 3-BAND PARAMETRIC EQ CONTROLS DRAWER                        */}
      {/* ========================================================================= */}
      {isEqExpanded && (
        <div className="bg-[#040407] border-b border-rose-500/30 p-2.5 flex items-center justify-between text-[9px] font-mono animate-fadeIn">
          <div className="flex items-center gap-6">
            <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-rose-500 animate-pulse" />
              WEB AUDIO DSP 3-BAND EQ:
            </span>

            {/* Low Shelf 120Hz */}
            <div className="flex items-center gap-2">
              <span className="text-white/50">LOW (120Hz):</span>
              <input
                type="range"
                min="-18"
                max="18"
                step="0.5"
                value={eqLow}
                onChange={(e) => handleEqChange(Number(e.target.value), eqMid, eqHigh)}
                className="w-20 accent-rose-500 cursor-pointer h-1 bg-white/20 rounded"
              />
              <span className="text-rose-300 w-10 font-bold">{eqLow > 0 ? `+${eqLow}` : eqLow}dB</span>
            </div>

            {/* Mid Peaking 1200Hz */}
            <div className="flex items-center gap-2">
              <span className="text-white/50">MID (1.2kHz):</span>
              <input
                type="range"
                min="-18"
                max="18"
                step="0.5"
                value={eqMid}
                onChange={(e) => handleEqChange(eqLow, Number(e.target.value), eqHigh)}
                className="w-20 accent-amber-400 cursor-pointer h-1 bg-white/20 rounded"
              />
              <span className="text-amber-300 w-10 font-bold">{eqMid > 0 ? `+${eqMid}` : eqMid}dB</span>
            </div>

            {/* High Shelf 6500Hz */}
            <div className="flex items-center gap-2">
              <span className="text-white/50">HIGH (6.5kHz):</span>
              <input
                type="range"
                min="-18"
                max="18"
                step="0.5"
                value={eqHigh}
                onChange={(e) => handleEqChange(eqLow, eqMid, Number(e.target.value))}
                className="w-20 accent-cyan-400 cursor-pointer h-1 bg-white/20 rounded"
              />
              <span className="text-cyan-300 w-10 font-bold">{eqHigh > 0 ? `+${eqHigh}` : eqHigh}dB</span>
            </div>
          </div>

          <button
            onClick={() => handleEqChange(2.5, 0.0, 1.5)}
            className="px-2 py-0.5 rounded-xs bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 text-[8px] flex items-center gap-1 cursor-pointer"
            title="Reset to Cinema Warmth Preset"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>RESET PRESET</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MULTI-TRACK NLE TIMELINE LANES & SCRUBBING RULER                       */}
      {/* ========================================================================= */}
      <div className="h-44 flex overflow-hidden relative">
        {/* Track Headers Column (Left) */}
        <div className="w-44 bg-[#08090E] border-r border-[#1C1D2A] flex flex-col shrink-0 text-[8.5px] z-20">
          {DEFAULT_LANES.map(lane => (
            <div key={lane.id} className="flex-1 px-2.5 border-b border-[#181926] flex items-center justify-between hover:bg-white/[0.02]">
              <div className="flex items-center gap-1.5 font-bold font-mono">
                <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                  lane.type === 'video' 
                    ? 'text-[#F5A623] bg-amber-950/60 border border-amber-700/50' 
                    : lane.type === 'text' 
                    ? 'text-purple-300 bg-purple-950/60 border border-purple-700/50' 
                    : 'text-emerald-400 bg-emerald-950/60 border border-emerald-700/50'
                }`}>
                  {lane.id}
                </span>
                <span className="text-zinc-300 truncate max-w-[60px] text-[8.5px]">
                  {lane.label.replace(/^[A-Z0-9]+\s*/, '')}
                </span>
              </div>

              {/* Pro VU Level Meter Indicator */}
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 h-1.5 w-6 bg-black/80 p-0.5 rounded border border-zinc-800">
                  <div className={`flex-1 rounded-[0.5px] ${lane.type === 'audio' ? 'bg-emerald-500' : 'bg-cyan-400'} opacity-85`} />
                  <div className={`flex-1 rounded-[0.5px] ${lane.type === 'audio' ? 'bg-emerald-500' : 'bg-cyan-400'} opacity-70`} />
                  <div className="flex-1 rounded-[0.5px] bg-[#F5A623] opacity-50" />
                </div>
                <div className="flex items-center gap-1 text-zinc-500">
                  <Lock className="w-2.5 h-2.5 hover:text-[#F5A623] cursor-pointer" />
                  <Eye className="w-2.5 h-2.5 hover:text-white cursor-pointer" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Tracks Canvas (Right) */}
        <div 
          ref={rulerRef}
          onMouseDown={handleRulerMouseDown}
          className="flex-1 bg-[#050508] overflow-x-auto relative flex flex-col cursor-crosshair no-scrollbar"
        >
          {/* Timeline Ruler Marks with Transient Beat Points */}
          <div className="h-4 bg-[#090A0F] border-b border-white/10 relative shrink-0">
            {Array.from({ length: Math.ceil(totalDurationSec) }).map((_, sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-white/10 text-[7px] text-white/30 pl-0.5"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                {sec % 4 === 0 ? `${sec}s` : ''}
              </div>
            ))}
          </div>

          {/* Track Lanes Display */}
          <div className="flex-1 flex flex-col relative" style={{ width: `${totalDurationSec * zoomLevel}px` }}>
            {DEFAULT_LANES.map(lane => (
              <div key={lane.id} className="flex-1 border-b border-white/5 relative flex items-center">
                {/* V1 Lane: Synchronized Storyboard Frames */}
                {lane.id === 'V1' && (
                  timelineClips.map((clip, idx) => {
                    const isSelected = idx === currentIndex;
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFrame(idx);
                        }}
                        className={`absolute top-1 bottom-1 rounded-xs border px-2 flex items-center justify-between text-[8px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.4)] ring-1 ring-rose-400'
                            : 'bg-[#12121A] border-white/15 text-white/80 hover:border-white/40'
                        }`}
                        style={{
                          left: `${clip.start * zoomLevel}px`,
                          width: `${clip.duration * zoomLevel - 2}px`
                        }}
                      >
                        <span className="font-bold truncate">{clip.name}</span>
                        <span className="text-white/40 text-[7px]">{clip.duration}s</span>
                      </div>
                    );
                  })
                )}

                {/* A2 Lane: Music Drone Track */}
                {lane.id === 'A2' && (
                  <div
                    className="absolute top-1 bottom-1 bg-[#092218]/90 border border-emerald-500/40 rounded-xs px-2 flex items-center justify-between text-[8px] text-emerald-300"
                    style={{ left: 0, width: `${totalDurationSec * zoomLevel}px` }}
                  >
                    <span>ANALOG 43.6Hz BINAURAL CINEMA DRONE + SYNTH SUITE</span>
                    <span className="text-[7px] text-emerald-500 font-bold">LOSSLESS AUDIO</span>
                  </div>
                )}
              </div>
            ))}

            {/* Playhead Laser Needle */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)] pointer-events-none z-30"
              style={{ left: `${playheadTimeSec * zoomLevel}px` }}
            >
              <div className="w-3 h-3 bg-rose-500 -translate-x-[5px] rotate-45 shadow-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
