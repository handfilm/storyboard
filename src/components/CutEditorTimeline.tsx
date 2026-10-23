/**
 * @file /src/components/CutEditorTimeline.tsx
 * @description Pro NLE Multi-Track Cinema Timeline Component for HANDFILM / RAWx.
 * Features:
 * - Professional Hollywood NLE dark aesthetic with precision timecode ruler
 * - Sub-frame playhead scrubbing synchronized with Stage Monitor & transport
 * - Track VU / throughput level meters (reactive simulated peak meters for audio & video)
 * - Per-track Mute (M), Solo (S), Lock (L), and Visibility (Eye) toggles
 * - Color-coded track badges (V2 Cyan, V1 Gold, T1 Purple, A1 Emerald, A2 Sky, VO Rose)
 * - Video thumbnail filmstrip with measured scrim and trim handles
 * - Tactile zoom controls with step buttons and magnetic snapping
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimelineClip, TrackLane } from '../types/cut';
import { clampShotDuration, getShotFrameCount } from '../types/storyboard';
import { audioEngine } from '../services/audioEngine';
import { studioDraftDb } from '../services/db';
import { useStudioStore } from '../core/store';
import {
  Scissors,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  Film,
  Sparkles,
  Magnet,
  Maximize2,
  Music,
  Upload
} from 'lucide-react';
import { TrackVuMeter } from './audio/TrackVuMeter';

export interface CutEditorTimelineProps {
  clips: TimelineClip[];
  tracks?: TrackLane[];
  playheadTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (timeSec: number) => void;
  onSplitClip?: () => void;
  onUpdateClips?: (clips: TimelineClip[]) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  className?: string;
}

interface TrackLaneExtended extends TrackLane {
  isSoloed?: boolean;
}

const DEFAULT_TRACKS: TrackLaneExtended[] = [
  { id: 'V2', label: 'V2 OVERLAYS', type: 'video', isMuted: false, isLocked: false, isHidden: false, isSoloed: false },
  { id: 'V1', label: 'V1 MASTER SHOTS', type: 'video', isMuted: false, isLocked: false, isHidden: false, isSoloed: false },
  { id: 'T1', label: 'T1 TITLES & BENGALI', type: 'text', isMuted: false, isLocked: false, isHidden: false, isSoloed: false },
  { id: 'A1', label: 'A1 SOUND FX', type: 'audio', isMuted: false, isLocked: false, isHidden: false, isSoloed: false },
  { id: 'A2', label: 'A2 MUSIC & DRONE', type: 'audio', isMuted: false, isLocked: false, isHidden: false, isSoloed: false },
  { id: 'VO', label: 'VO DIALOGUE', type: 'audio', isMuted: false, isLocked: false, isHidden: false, isSoloed: false }
];

const TRACK_THEMES: Record<string, { badge: string; border: string; bg: string; text: string }> = {
  V2: { badge: 'bg-cyan-950/80 text-cyan-400 border-cyan-700/60', border: 'border-cyan-600/40', bg: 'bg-cyan-950/30', text: 'text-cyan-400' },
  V1: { badge: 'bg-amber-950/80 text-[#F5A623] border-amber-600/60', border: 'border-amber-600/50', bg: 'bg-amber-950/30', text: 'text-[#F5A623]' },
  T1: { badge: 'bg-purple-950/80 text-purple-300 border-purple-700/60', border: 'border-purple-600/40', bg: 'bg-purple-950/30', text: 'text-purple-300' },
  A1: { badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60', border: 'border-emerald-600/40', bg: 'bg-emerald-950/30', text: 'text-emerald-400' },
  A2: { badge: 'bg-sky-950/80 text-sky-400 border-sky-700/60', border: 'border-sky-600/40', bg: 'bg-sky-950/30', text: 'text-sky-400' },
  VO: { badge: 'bg-rose-950/80 text-rose-400 border-rose-700/60', border: 'border-rose-600/40', bg: 'bg-rose-950/30', text: 'text-rose-400' }
};

export interface PlayheadTimecodeOverlayProps {
  currentTime: number;
  duration: number;
  isScrubbing?: boolean;
  fps?: number;
  className?: string;
  onScrubStart?: (e: React.MouseEvent) => void;
}

/**
 * PlayheadTimecodeOverlay renders a dynamic timecode badge anchored to the playhead scrubber
 * using absolute positioning. Displays timecode as 'TC 00:00:04:12 // F108' and updates at 60fps
 * during playback and dragging with smooth CSS interpolation.
 */
export const PlayheadTimecodeOverlay: React.FC<PlayheadTimecodeOverlayProps> = ({
  currentTime,
  duration,
  isScrubbing = false,
  fps = 24,
  className = '',
  onScrubStart
}) => {
  const safeCurrentTime = Math.max(0, currentTime);
  const safeDuration = Math.max(0.01, duration);
  const normalizedProgress = Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100));

  // Compute exact SMPTE & frame index: 'TC 00:00:04:12 // F108'
  const totalFrames = Math.floor(safeCurrentTime * fps);
  const ff = totalFrames % fps;
  const ss = Math.floor(safeCurrentTime) % 60;
  const mm = Math.floor(safeCurrentTime / 60) % 60;
  const hh = Math.floor(safeCurrentTime / 3600);

  const timecodeString = `TC ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')} // F${totalFrames}`;

  return (
    <div
      className={`absolute top-0 bottom-0 pointer-events-none will-change-[left] ${
        isScrubbing ? 'transition-none' : 'transition-[left] duration-75 ease-out'
      } ${className}`}
      style={{
        left: `${normalizedProgress}%`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Dynamic Timecode Badge anchored to playhead scrubber */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 pointer-events-none whitespace-nowrap z-50">
        <div className="bg-[#0c0d10]/95 border border-[#F5A623]/60 text-[#F5A623] px-2.5 py-0.5 rounded-full text-[10px] font-mono shadow-[0_2px_10px_rgba(0,0,0,0.85),0_0_14px_rgba(245,166,35,0.3)] backdrop-blur-md pointer-events-none whitespace-nowrap flex items-center gap-1.5 animate-fade-in tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] shadow-[0_0_8px_#F5A623] animate-pulse" />
          <span className="font-semibold">{timecodeString}</span>
        </div>
      </div>

      {/* Scrubber Needle (Red/Amber Gradient with Glowing Shadow) */}
      <div className="w-0.5 h-full mx-auto bg-gradient-to-b from-[#F5A623] via-rose-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.8)] relative pointer-events-auto cursor-ew-resize">
        {/* Playhead Diamond Cap (Interactive Drag Handle) */}
        <div
          onMouseDown={onScrubStart}
          className="w-4 h-4 bg-gradient-to-br from-[#FFE066] to-rose-500 transform -translate-x-[7px] translate-y-6 rotate-45 shadow-[0_0_12px_rgba(245,166,35,0.9)] border border-white/90 pointer-events-auto cursor-ew-resize active:scale-110 transition-transform"
          title="Drag Playhead (60fps)"
        />
      </div>
    </div>
  );
};

export const CutEditorTimeline: React.FC<CutEditorTimelineProps> = ({
  clips,
  tracks = DEFAULT_TRACKS,
  playheadTime,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onSeek,
  onSplitClip,
  onUpdateClips,
  isSnapToBeat: propSnapToBeat,
  onToggleSnapToBeat,
  onLoadAudioFile,
  className = ''
}) => {
  const { project, setActiveShotIndex } = useStudioStore();
  const [zoomScale, setZoomScale] = useState<number>(100); // 10 to 200%
  const [isMagneticSnap, setIsMagneticSnap] = useState<boolean>(true);
  const [localSnapToBeat, setLocalSnapToBeat] = useState<boolean>(() => audioEngine.getIsSnapToBeatEnabled());
  const [beatMap, setBeatMap] = useState<number[]>(() => audioEngine.getTransientTimecodeMap());
  const [vaultMediaMap, setVaultMediaMap] = useState<Record<string, string>>({});
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [trimTooltip, setTrimTooltip] = useState<{
    clipId: string;
    durationSec: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const [trackStates, setTrackStates] = useState<Record<string, { isMuted: boolean; isLocked: boolean; isHidden: boolean; isSoloed: boolean }>>(() => {
    const map: Record<string, any> = {};
    tracks.forEach((t) => {
      map[t.id] = { isMuted: t.isMuted, isLocked: t.isLocked, isHidden: t.isHidden, isSoloed: false };
    });
    return map;
  });

  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const isBeatSnapActive = propSnapToBeat !== undefined ? propSnapToBeat : localSnapToBeat;

  useEffect(() => {
    return audioEngine.subscribeToAnalysis((analysis) => {
      setBeatMap(analysis.transientTimecodeMap || []);
    });
  }, []);

  const handleToggleBeatSnapInternal = () => {
    if (onToggleSnapToBeat) {
      onToggleSnapToBeat();
    } else {
      const next = !localSnapToBeat;
      audioEngine.setSnapToBeatEnabled(next);
      setLocalSnapToBeat(next);
    }
  };

  const handleUploadBeatTrackInternal = async (file: File) => {
    if (onLoadAudioFile) {
      onLoadAudioFile(file);
    } else {
      try {
        await audioEngine.loadAndAnalyzeAudioFile(file);
      } catch (err) {
        console.warn('[CutEditorTimeline] Failed to decode audio track:', err);
      }
    }
  };

  // Baseline 50px per second scaled by zoom
  const pps = (zoomScale / 100) * 50;

  // Resolve media URLs directly from IndexedDB media_vault
  useEffect(() => {
    let isMounted = true;
    const loadVaultUrls = async () => {
      try {
        const vaultItems = await studioDraftDb.getAllVaultMedia();
        const map: Record<string, string> = {};
        for (const item of vaultItems) {
          if (item.blob) {
            map[item.id] = studioDraftDb.getActiveMediaUrl(item.id, item.blob);
          }
        }
        if (isMounted) {
          setVaultMediaMap(map);
        }
      } catch (err) {
        console.warn('[CutEditorTimeline] Error loading vault media:', err);
      }
    };

    loadVaultUrls();
    return () => {
      isMounted = false;
    };
  }, [project.shots]);

  const resolveClipMediaUrl = useCallback((clip: TimelineClip): string => {
    if (clip.url && clip.url.trim().length > 0) {
      return clip.url;
    }
    if ((clip as any).mediaId && vaultMediaMap[(clip as any).mediaId]) {
      return vaultMediaMap[(clip as any).mediaId];
    }
    const shotIdx = typeof clip.shotIndex === 'number' 
      ? clip.shotIndex 
      : Math.floor(clip.start / 12.0);

    if (project.shots && project.shots[shotIdx]) {
      const shot = project.shots[shotIdx];
      if (shot.imageUrl) return shot.imageUrl;
    }

    const shotNum = String(shotIdx + 1).padStart(3, '0');
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="40" viewBox="0 0 96 40"><rect width="96" height="40" fill="%2312131e"/><rect x="2" y="2" width="92" height="36" fill="none" stroke="%23f5a623" stroke-width="1" opacity="0.4"/><text x="50%" y="45%" text-anchor="middle" fill="%23f5a623" font-family="monospace" font-size="8.5" font-weight="bold">SH${shotNum}</text><text x="50%" y="75%" text-anchor="middle" fill="%2371717a" font-family="monospace" font-size="6.5">24FPS V1</text></svg>`;
  }, [vaultMediaMap, project.shots]);

  // 60FPS RAF-synced timeline scrubber drag & playback tracking
  const [dragTime, setDragTime] = useState<number | null>(null);
  const rafSeekRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);

  const applySeekPosition = useCallback((clientX: number) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const scrollLeft = timelineTracksRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    let newTime = Math.max(0, Math.min(totalDuration, clickX / pps));

    // Magnetic snapping to audio beat transients or clip boundaries
    if (isBeatSnapActive) {
      newTime = audioEngine.snapTimeToNearestBeat(newTime, 0.35);
    } else if (isMagneticSnap) {
      const snapThreshold = 0.3;
      for (const c of clips) {
        if (Math.abs(newTime - c.start) < snapThreshold) {
          newTime = c.start;
          break;
        }
        const clipEnd = c.start + c.duration;
        if (Math.abs(newTime - clipEnd) < snapThreshold) {
          newTime = clipEnd;
          break;
        }
      }
    }

    setDragTime(newTime);
    onSeek(newTime);
  }, [totalDuration, pps, onSeek, isMagneticSnap, isBeatSnapActive, clips]);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.MouseEvent) => {
    setIsScrubbing(true);
    applySeekPosition(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      pendingClientXRef.current = e.clientX;

      if (rafSeekRef.current === null) {
        rafSeekRef.current = requestAnimationFrame(() => {
          if (pendingClientXRef.current !== null) {
            applySeekPosition(pendingClientXRef.current);
          }
          rafSeekRef.current = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafSeekRef.current !== null) {
        cancelAnimationFrame(rafSeekRef.current);
        rafSeekRef.current = null;
      }
      setIsScrubbing(false);
      setDragTime(null);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafSeekRef.current !== null) {
        cancelAnimationFrame(rafSeekRef.current);
        rafSeekRef.current = null;
      }
    };
  }, [isScrubbing, applySeekPosition]);

  // Format seconds to SMPTE Timecode
  const formatSMPTE = (seconds: number) => {
    const totalFrames = Math.floor(seconds * 24);
    const ff = totalFrames % 24;
    const ss = Math.floor(seconds) % 60;
    const mm = Math.floor(seconds / 60) % 60;
    const hh = Math.floor(seconds / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  const currentTime = dragTime !== null ? dragTime : Math.max(0, playheadTime);
  const duration = Math.max(0.1, totalDuration);


  const toggleTrackState = (trackId: string, prop: 'isMuted' | 'isLocked' | 'isHidden' | 'isSoloed') => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        [prop]: !prev[trackId]?.[prop]
      }
    }));
  };

  const handleClipTrimMouseDown = (
    clip: TimelineClip,
    edge: 'left' | 'right',
    e: React.MouseEvent
  ) => {
    if (!onUpdateClips) return;
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const origStart = clip.start;
    const origDur = clip.duration;
    const origEnd = origStart + origDur;
    const baseClips = [...clips];

    setTrimTooltip({
      clipId: clip.id,
      durationSec: origDur,
      clientX: e.clientX,
      clientY: e.clientY
    });

    const onMove = (moveEv: MouseEvent) => {
      const deltaSec = (moveEv.clientX - startMouseX) / Math.max(1, pps);

      if (edge === 'right') {
        let nextDur = clampShotDuration(origDur + deltaSec);
        if (isBeatSnapActive) {
          nextDur = audioEngine.snapDurationToNearestBeat(origStart, nextDur, 0.5, 0.4);
        }
        const durationDelta = nextDur - origDur;

        // Ripple downstream V1/T1 clips if trimming primary V1 master shot
        const updated = baseClips.map((c) => {
          if (c.id === clip.id) {
            return { ...c, duration: nextDur, outPoint: (c.inPoint || 0) + nextDur };
          }
          if (clip.trackId === 'V1' && (c.trackId === 'V1' || c.trackId === 'T1') && c.start >= origEnd - 0.01) {
            return { ...c, start: Math.max(0, Number((c.start + durationDelta).toFixed(3))) };
          }
          if (clip.trackId === 'V1' && c.trackId === 'T1' && Math.abs(c.start - origStart) < 0.05) {
            return { ...c, duration: nextDur, outPoint: (c.inPoint || 0) + nextDur };
          }
          return c;
        });

        setTrimTooltip({
          clipId: clip.id,
          durationSec: nextDur,
          clientX: moveEv.clientX,
          clientY: moveEv.clientY
        });
        onUpdateClips(updated);
      } else {
        let nextStart = Math.max(0, Math.min(origEnd - 0.5, origStart + deltaSec));
        if (isBeatSnapActive) {
          const snappedStart = audioEngine.snapTimeToNearestBeat(nextStart, 0.35);
          if (origEnd - snappedStart >= 0.5) {
            nextStart = Math.max(0, snappedStart);
          }
        }
        const nextDur = clampShotDuration(origEnd - nextStart);
        const updated = baseClips.map((c) =>
          c.id === clip.id
            ? {
                ...c,
                start: Number(nextStart.toFixed(3)),
                duration: nextDur,
                inPoint: Math.max(0, (c.inPoint || 0) + (nextStart - origStart))
              }
            : c
        );

        setTrimTooltip({
          clipId: clip.id,
          durationSec: nextDur,
          clientX: moveEv.clientX,
          clientY: moveEv.clientY
        });
        onUpdateClips(updated);
      }
    };

    const onUp = () => {
      setTrimTooltip(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const rulerStepSec = pps < 6 ? 60 : pps < 15 ? 15 : pps < 30 ? 5 : 1;
  const rulerTicksCount = Math.min(2000, Math.floor(totalDuration / rulerStepSec) + 1);
  const totalContentWidth = Math.max(1400, totalDuration * pps + 350);

  return (
    <div className={`w-full flex flex-col bg-[#050609] border-t border-[#1C1D2A] select-none text-zinc-300 ${className}`}>
      {trimTooltip && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.max(80, Math.min(window.innerWidth - 190, trimTooltip.clientX - 75))}px`,
            top: `${Math.max(24, trimTooltip.clientY - 40)}px`,
            zIndex: 9999
          }}
          className="px-2.5 py-1 rounded-md bg-black/95 border border-[#F5A623] text-[10px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.9)] pointer-events-none tabular-nums"
        >
          DUR: {trimTooltip.durationSec.toFixed(2)}s // {getShotFrameCount(trimTooltip.durationSec, 24)} FRAMES
        </div>
      )}

      {/* 1. Pro NLE Control Dock */}
      <div className="min-h-[40px] bg-[#090A0F] border-b border-[#1C1D2A] px-4 py-1 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {onSplitClip && (
            <button
              type="button"
              onClick={onSplitClip}
              className="px-2.5 py-1 bg-[#141520] hover:bg-[#F5A623] hover:text-black rounded border border-[#27283C] text-[10px] font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              title="Perform razor cut at playhead (S)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>SPLIT CLIP [S]</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMagneticSnap(!isMagneticSnap)}
            className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isMagneticSnap
                ? 'bg-[#F5A623]/20 border-[#F5A623]/80 text-[#FFE066]'
                : 'bg-[#141520] border-[#27283C] text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle magnetic snapping to cut points"
          >
            <Magnet className="w-3 h-3" />
            <span>SNAP {isMagneticSnap ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBeatSnapInternal}
            className={`px-2.5 py-1 rounded border text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
              isBeatSnapActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-[#141520] border-[#27283C] text-zinc-400 hover:text-white'
            }`}
            title="Magnetically snap clip stretches and splits to detected audio kick/snare beats"
          >
            <Music className="w-3 h-3 text-cyan-400" />
            <span>SNAP CUTS TO BEATS</span>
          </button>

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="px-2 py-1 rounded bg-[#141520] hover:bg-[#1E2030] border border-[#27283C] text-[10px] font-mono text-zinc-300 hover:text-[#FFE066] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            title="Attach MP3/WAV track for offline AudioContext beat detection"
          >
            <Upload className="w-3 h-3 text-[#F5A623]" />
            <span>Beat Track</span>
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUploadBeatTrackInternal(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />

          <div className="h-4 w-px bg-[#1C1D2A] mx-0.5 hidden sm:block" />

          {/* Precision SMPTE Timecode Display */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black/80 border border-[#27283C] tabular-nums">
            <span className="text-[9px] font-mono text-zinc-500">SMPTE</span>
            <span className="font-mono text-xs text-[#FFE066] font-bold tracking-wider">
              {formatSMPTE(playheadTime)}
            </span>
            <span className="text-zinc-600 font-mono text-[10px]">
              / {formatSMPTE(totalDuration)}
            </span>
          </div>

          <TrackVuMeter variant="mini" />
        </div>

        {/* Tactile Zoom & Fit Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomScale((z) => Math.max(20, z - 15))}
            className="p-1 hover:text-[#FFE066] text-zinc-400 hover:bg-white/5 rounded cursor-pointer transition-colors"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded border border-[#27283C]">
            <input
              type="range"
              min="20"
              max="180"
              value={zoomScale}
              onChange={(e) => setZoomScale(Number(e.target.value))}
              className="w-24 h-1.5 accent-[#F5A623] cursor-pointer bg-zinc-800 rounded-lg appearance-none"
            />
            <span className="text-[9px] text-[#FFE066] w-8 text-right font-mono font-bold">
              {zoomScale}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => setZoomScale((z) => Math.min(180, z + 15))}
            className="p-1 hover:text-[#FFE066] text-zinc-400 hover:bg-white/5 rounded cursor-pointer transition-colors"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoomScale(100)}
            className="px-2 py-0.5 text-[9px] font-mono font-bold text-zinc-400 hover:text-white bg-[#141520] hover:bg-zinc-800 rounded border border-[#27283C] cursor-pointer"
            title="Reset Zoom to 100%"
          >
            FIT
          </button>
        </div>
      </div>

      {/* 2. Timeline Body: Left Track Control Headers + Right Multi-Lane Canvas */}
      <div className="flex-1 flex overflow-hidden relative min-h-[220px]">
        
        {/* Left Track Column: Headers, Level VU Meters, & Mute/Solo/Lock Controls */}
        <div className="w-48 bg-[#08090E] border-r border-[#1C1D2A] flex flex-col shrink-0 z-20">
          {/* Header Spacer matching Ruler height */}
          <div className="h-7 border-b border-[#1C1D2A] bg-[#0A0B12] px-2.5 flex items-center justify-between text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            <span>TRACK / LANE</span>
            <div className="flex items-center gap-3">
              <span>VU</span>
              <span>STATE</span>
            </div>
          </div>

          {/* Track Headers */}
          {tracks.map((track) => {
            const theme = TRACK_THEMES[track.id] || TRACK_THEMES.V1;
            const state = trackStates[track.id] || { isMuted: false, isLocked: false, isHidden: false, isSoloed: false };
            const isAudio = track.type === 'audio';

            return (
              <div
                key={track.id}
                className="h-11 border-b border-[#1C1D2A] px-2.5 flex items-center justify-between text-[10px] font-mono bg-[#07080C] hover:bg-[#0E0F17] transition-colors"
              >
                {/* Lane ID Badge & Label */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${theme.badge}`}>
                    {track.id}
                  </span>
                  <span className="text-[9px] font-semibold text-zinc-300 truncate max-w-[62px]">
                    {track.label.replace(/^[A-Z0-9]+\s*/, '')}
                  </span>
                </div>

                {/* Simulated Reactive VU Level Meter Bar */}
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col gap-0.5 w-7 h-4 justify-center bg-black/60 p-0.5 rounded border border-zinc-800">
                    <div className="flex gap-0.5 h-1">
                      <div className={`flex-1 rounded-[0.5px] ${isAudio ? 'bg-emerald-500' : 'bg-cyan-400'} opacity-90`} />
                      <div className={`flex-1 rounded-[0.5px] ${isAudio ? 'bg-emerald-500' : 'bg-cyan-400'} opacity-75`} />
                      <div className="flex-1 rounded-[0.5px] bg-[#F5A623] opacity-60" />
                      <div className="flex-1 rounded-[0.5px] bg-rose-500 opacity-40" />
                    </div>
                  </div>

                  {/* Tactile Track Buttons: Eye, Mute, Lock */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, 'isHidden')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        state.isHidden ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-300 hover:text-white'
                      }`}
                      title={state.isHidden ? 'Unhide Track' : 'Hide Track'}
                    >
                      {state.isHidden ? <EyeOff className="w-3 h-3 text-zinc-600" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, 'isMuted')}
                      className={`px-1 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                        state.isMuted
                          ? 'bg-rose-950 text-rose-400 border border-rose-700/60'
                          : 'text-zinc-500 hover:text-zinc-300 bg-white/5'
                      }`}
                      title="Toggle Mute Track"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, 'isLocked')}
                      className={`p-1 rounded cursor-pointer transition-colors ${
                        state.isLocked ? 'text-[#F5A623]' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title={state.isLocked ? 'Unlock Track' : 'Lock Track'}
                    >
                      {state.isLocked ? <Lock className="w-3 h-3 text-[#F5A623]" /> : <Unlock className="w-3 h-3 text-zinc-600" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Canvas: Precision Timecode Ruler + Multi-Lane Clip Bars */}
        <div
          ref={timelineTracksRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#040407] cursor-crosshair custom-scrollbar"
        >
          <div style={{ width: `${totalContentWidth}px` }} className="relative h-full">
            
            {/* Precision Adaptive Timecode Ruler + Beat Transient Ticks */}
            <div className="h-7 border-b border-[#1C1D2A] bg-gradient-to-b from-[#0C0D14] to-[#08080C] relative select-none flex items-center">
              {Array.from({ length: rulerTicksCount }).map((_, idx) => {
                const sec = idx * rulerStepSec;
                const isMajor = sec % (rulerStepSec * 5) === 0;

                return (
                  <div
                    key={sec}
                    className={`absolute top-0 bottom-0 flex flex-col justify-between pl-1 pointer-events-none ${
                      isMajor ? 'border-l-2 border-[#F5A623]/60' : 'border-l border-zinc-700/50'
                    }`}
                    style={{ left: `${sec * pps}px` }}
                  >
                    <span
                      className={`text-[8px] font-mono tabular-nums leading-none pt-0.5 ${
                        isMajor ? 'text-[#FFE066] font-bold' : 'text-zinc-500 font-medium'
                      }`}
                    >
                      {isMajor
                        ? `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}:00`
                        : `${sec}s`}
                    </span>
                    <div className="flex gap-1 items-end h-1.5 pb-0.5">
                      <div className="w-px h-1 bg-zinc-700" />
                      <div className="w-px h-1 bg-zinc-700" />
                    </div>
                  </div>
                );
              })}

              {/* Beat Transient Peak Markers when Beat Snap Active */}
              {isBeatSnapActive &&
                beatMap
                  .filter((t) => t <= totalDuration && pps >= 12)
                  .slice(0, 600)
                  .map((beatSec, bIdx) => (
                    <div
                      key={`bt-${bIdx}`}
                      className="absolute bottom-0 w-[1.5px] h-2 bg-cyan-400/80 pointer-events-none"
                      style={{ left: `${beatSec * pps}px` }}
                    />
                  ))}
            </div>

            {/* Dedicated Track Lanes */}
            {tracks.map((track) => {
              const theme = TRACK_THEMES[track.id] || TRACK_THEMES.V1;
              const isVideoTrack = track.type === 'video';
              const state = trackStates[track.id] || { isMuted: false, isLocked: false, isHidden: false, isSoloed: false };

              return (
                <div
                  key={track.id}
                  className={`h-11 border-b border-[#181926] relative transition-colors ${
                    state.isHidden ? 'opacity-30' : ''
                  } ${theme.bg}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_100%] pointer-events-none" />

                  {clips
                    .filter((c) => c.trackId === track.id)
                    .map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const isUnderPlayhead = playheadTime >= clip.start && playheadTime < clip.start + clip.duration;
                      const clipRelSec = isUnderPlayhead ? Math.max(0, playheadTime - clip.start) : 0;
                      const relFrames = Math.floor((clipRelSec % 1) * 24);
                      const relSecPart = Math.floor(clipRelSec);
                      const relativeTc = `+${String(relSecPart).padStart(2, '0')}:${String(relFrames).padStart(2, '0')}F`;
                      const leftPos = clip.start * pps;
                      const clipWidth = clip.duration * pps;
                      const mediaUrl = resolveClipMediaUrl(clip);

                      return (
                        <div
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                            if (clip.shotIndex !== undefined) {
                              setActiveShotIndex(clip.shotIndex);
                            }
                          }}
                          className={`absolute top-1 bottom-1 rounded-md cursor-pointer overflow-hidden transition-all shadow-md group ${
                            isSelected
                              ? 'ring-2 ring-[#FFE066] z-20 border-2 border-[#D4AF37] shadow-[0_0_15px_rgba(245,166,35,0.4)]'
                              : isVideoTrack
                              ? 'border border-amber-600/50 bg-[#161724]'
                              : track.type === 'text'
                              ? 'border border-purple-600/50 bg-purple-950/70'
                              : 'border border-emerald-600/50 bg-emerald-950/70'
                          }`}
                          style={{
                            left: `${leftPos}px`,
                            width: `${Math.max(24, clipWidth)}px`
                          }}
                        >
                          {isVideoTrack && mediaUrl && (
                            <div className="absolute inset-0 flex overflow-hidden opacity-85 group-hover:opacity-100 transition-opacity">
                              {Array.from({ length: Math.min(24, Math.max(1, Math.ceil(clipWidth / 52))) }).map((_, thumbIdx) => (
                                <img
                                  key={thumbIdx}
                                  src={mediaUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-14 object-cover shrink-0 border-r border-black/50"
                                />
                              ))}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                            </div>
                          )}

                          {isUnderPlayhead && (
                            <div className="absolute top-1 right-2.5 z-30 pointer-events-none flex items-center gap-1 bg-black/90 border border-[#FFE066] text-[#FFE066] text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] shadow-[0_0_8px_rgba(255,224,102,0.8)] tabular-nums">
                              <span>{relativeTc}</span>
                            </div>
                          )}

                          <div className="relative z-10 w-full h-full px-2.5 flex items-center justify-between text-[10px] font-mono pointer-events-none tabular-nums">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isVideoTrack ? (
                                <Film className="w-3 h-3 text-[#fbbf24] shrink-0" />
                              ) : track.type === 'text' ? (
                                <Sparkles className="w-3 h-3 text-purple-300 shrink-0" />
                              ) : (
                                <Volume2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              )}
                              <span className="font-bold truncate text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                                {clip.name}
                              </span>
                            </div>

                            {!isUnderPlayhead && (
                              <span className="text-[8.5px] font-bold text-zinc-300 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 shrink-0 ml-1">
                                {clip.duration.toFixed(1)}s
                              </span>
                            )}
                          </div>

                          {/* Interactive Left & Right Trim Handles */}
                          <div
                            onMouseDown={(e) => !state.isLocked && handleClipTrimMouseDown(clip, 'left', e)}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag left edge to trim clip In-point"
                            className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 group-hover:bg-[#FFE066]/70 hover:!bg-[#FFE066] cursor-ew-resize z-20 flex flex-col justify-center items-center gap-0.5"
                          >
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                          </div>
                          <div
                            onMouseDown={(e) => !state.isLocked && handleClipTrimMouseDown(clip, 'right', e)}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag right edge to stretch/compress clip duration"
                            className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 group-hover:bg-[#FFE066]/70 hover:!bg-[#FFE066] cursor-ew-resize z-20 flex flex-col justify-center items-center gap-0.5"
                          >
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* Dynamic Playhead & Floating Timecode Overlay Container */}
            <div 
              className="absolute inset-0 pointer-events-none z-30"
              style={{ width: `${totalDuration * pps}px` }}
            >
              <PlayheadTimecodeOverlay
                currentTime={currentTime}
                duration={duration}
                isScrubbing={isScrubbing}
                fps={24}
                onScrubStart={handleTimelineMouseDown}
              />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CutEditorTimeline;
