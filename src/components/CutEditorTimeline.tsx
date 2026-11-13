/**
 * @file /src/components/CutEditorTimeline.tsx
 * @description CapCut-Grade Multi-Track NLE Cinema Timeline Component for RAWx Studio.
 * Features:
 * - Horizontal & cross-track clip drag-to-move with magnetic snap guides
 * - Left & right trim handles with live frame/duration HUD + beat-snap quantization
 * - Synced per-track Mute (M), Solo (S), Lock (L), and Visibility (Eye) controls
 * - Quick NLE actions: Split (S), Ripple Delete, Freeze Frame, Detach Audio
 * - Real deterministic audio waveform visualization & shotMediaMap vault thumbnails
 * - Auto-scroll following playhead during playback
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TimelineClip, TrackLane, TrackLaneId } from '../types/cut';
import { clampShotDuration, getShotFrameCount } from '../types/storyboard';
import { audioEngine } from '../services/audioEngine';
import { studioDraftDb } from '../services/db';
import { useStudioStore } from '../core/store';
import { resolveShotMediaEntry } from '../services/handfilmMediaVault';
import { moveClipWithMagneticSnap, type TrackMixState } from '../utils/cutRenderMath';
import { cutClock, formatSmpteTimecode } from '../utils/playbackClock';
import {
  Scissors,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Volume2,
  Film,
  Sparkles,
  Magnet,
  Music,
  Upload,
  Snowflake,
  AudioWaveform,
  Trash2,
  Rewind
} from 'lucide-react';
import { TrackVuMeter } from './audio/TrackVuMeter';

export interface CutEditorTimelineProps {
  clips: TimelineClip[];
  tracks?: TrackLane[];
  playheadTime: number;
  totalDuration: number;
  isPlaying?: boolean;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (timeSec: number, isContinuousScrub?: boolean) => void;
  onSplitClip?: () => void;
  onRippleDeleteClip?: (clipId: string) => void;
  onFreezeFrame?: (clipId: string) => void;
  onDetachAudio?: (clipId: string) => void;
  onUpdateClips?: (clips: TimelineClip[]) => void;
  onBeforeMutation?: (prevClips: TimelineClip[]) => void;
  trackStates?: Record<string, TrackMixState>;
  onTrackStatesChange?: (next: Record<string, TrackMixState>) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  className?: string;
}

const DEFAULT_TRACKS: TrackLane[] = [
  { id: 'V2', label: 'V2 OVERLAYS', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'V1', label: 'V1 MASTER SHOTS', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'T1', label: 'T1 TITLES & BENGALI', type: 'text', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A1', label: 'A1 SOUND FX', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A2', label: 'A2 MUSIC & DRONE', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'VO', label: 'VO DIALOGUE', type: 'audio', isMuted: false, isLocked: false, isHidden: false }
];

const TRACK_THEMES: Record<string, { badge: string; border: string; bg: string; text: string }> = {
  V2: { badge: 'bg-cyan-950/80 text-cyan-400 border-cyan-700/60', border: 'border-cyan-600/40', bg: 'bg-cyan-950/20', text: 'text-cyan-400' },
  V1: { badge: 'bg-amber-950/80 text-[#F5A623] border-amber-600/60', border: 'border-amber-600/50', bg: 'bg-amber-950/20', text: 'text-[#F5A623]' },
  T1: { badge: 'bg-purple-950/80 text-purple-300 border-purple-700/60', border: 'border-purple-600/40', bg: 'bg-purple-950/20', text: 'text-purple-300' },
  A1: { badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60', border: 'border-emerald-600/40', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
  A2: { badge: 'bg-sky-950/80 text-sky-400 border-sky-700/60', border: 'border-sky-600/40', bg: 'bg-sky-950/20', text: 'text-sky-400' },
  VO: { badge: 'bg-rose-950/80 text-rose-400 border-rose-700/60', border: 'border-rose-600/40', bg: 'bg-rose-950/20', text: 'text-rose-400' }
};

function isCompatibleTrackTarget(clip: TimelineClip, targetTrack: TrackLane): boolean {
  if (clip.trackId === targetTrack.id) return true;
  if ((clip.trackId === 'V1' || clip.trackId === 'V2') && targetTrack.type === 'video') return true;
  if (clip.trackId === 'T1' && targetTrack.type === 'text') return true;
  if (['A1', 'A2', 'VO'].includes(clip.trackId) && targetTrack.type === 'audio') return true;
  return false;
}

export interface PlayheadTimecodeOverlayProps {
  currentTime: number;
  duration: number;
  isScrubbing?: boolean;
  fps?: number;
  className?: string;
  onScrubStart?: (e: React.MouseEvent) => void;
}

export const PlayheadTimecodeOverlay: React.FC<PlayheadTimecodeOverlayProps> = ({
  currentTime,
  duration,
  fps = 24,
  className = '',
  onScrubStart
}) => {
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const timecodeSpanRef = useRef<HTMLSpanElement>(null);
  const ctxRef = useRef({ duration, fps });
  ctxRef.current = { duration, fps };

  useEffect(() => {
    return cutClock.subscribe((snap) => {
      const safeTime = Math.max(0, snap.timeSec);
      const activeDur = Math.max(0.01, snap.durationSec > 0 ? snap.durationSec : ctxRef.current.duration);
      const activeFps = snap.fps > 0 ? snap.fps : ctxRef.current.fps;
      const pct = Math.min(100, Math.max(0, (safeTime / activeDur) * 100));
      const totalFrames = Math.floor(safeTime * activeFps);

      if (overlayRootRef.current) {
        overlayRootRef.current.style.left = `${pct.toFixed(3)}%`;
      }
      if (timecodeSpanRef.current) {
        timecodeSpanRef.current.textContent = `${formatSmpteTimecode(safeTime, activeFps)} // F${totalFrames}`;
      }
    });
  }, []);

  const safeCurrentTime = Math.max(0, currentTime);
  const safeDuration = Math.max(0.01, duration);
  const normalizedProgress = Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100));

  const totalFrames = Math.floor(safeCurrentTime * fps);
  const timecodeString = `${formatSmpteTimecode(safeCurrentTime, fps)} // F${totalFrames}`;

  return (
    <div
      ref={overlayRootRef}
      className={`absolute top-0 bottom-0 pointer-events-none will-change-[left] ${className}`}
      style={{
        left: `${normalizedProgress}%`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="absolute top-1 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-50">
        <div className="bg-[#0c0d10]/95 border border-[#F5A623]/60 text-[#F5A623] px-2 py-0.5 rounded text-[9.5px] font-mono shadow-lg backdrop-blur-md pointer-events-none whitespace-nowrap flex items-center gap-1.5 tracking-wider tabular-nums">
          <span ref={timecodeSpanRef} className="font-semibold">{timecodeString}</span>
        </div>
      </div>

      <div className="w-0.5 h-full mx-auto bg-gradient-to-b from-[#F5A623] via-rose-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.8)] relative pointer-events-auto cursor-ew-resize">
        <div
          onMouseDown={onScrubStart}
          className="w-3.5 h-3.5 bg-gradient-to-br from-[#FFE066] to-rose-500 transform -translate-x-[6px] translate-y-5 rotate-45 shadow-[0_0_10px_rgba(245,166,35,0.9)] border border-white/90 pointer-events-auto cursor-ew-resize active:scale-110 transition-transform"
          title="Drag Playhead"
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
  isPlaying = false,
  selectedClipId,
  onSelectClip,
  onSeek,
  onSplitClip,
  onRippleDeleteClip,
  onFreezeFrame,
  onDetachAudio,
  onUpdateClips,
  onBeforeMutation,
  trackStates: controlledTrackStates,
  onTrackStatesChange,
  isSnapToBeat: propSnapToBeat,
  onToggleSnapToBeat,
  onLoadAudioFile,
  className = ''
}) => {
  const { project, setActiveShotIndex, shotMediaMap } = useStudioStore();
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isMagneticSnap, setIsMagneticSnap] = useState<boolean>(true);
  const [localSnapToBeat, setLocalSnapToBeat] = useState<boolean>(() => audioEngine.getIsSnapToBeatEnabled());
  const [beatMap, setBeatMap] = useState<number[]>(() => audioEngine.getTransientTimecodeMap());
  const [vaultMediaMap, setVaultMediaMap] = useState<Record<string, string>>({});
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [snapGuideSec, setSnapGuideSec] = useState<number | null>(null);
  const [trimTooltip, setTrimTooltip] = useState<{
    label: string;
    clientX: number;
    clientY: number;
  } | null>(null);

  const [localTrackStates, setLocalTrackStates] = useState<Record<string, TrackMixState>>(() => {
    const map: Record<string, TrackMixState> = {};
    tracks.forEach((t) => {
      map[t.id] = { muted: t.isMuted, locked: t.isLocked, hidden: t.isHidden, solo: false };
    });
    return map;
  });

  const trackStates = controlledTrackStates ?? localTrackStates;
  const updateTrackStates = useCallback((updater: (prev: Record<string, TrackMixState>) => Record<string, TrackMixState>) => {
    if (onTrackStatesChange) {
      onTrackStatesChange(updater(trackStates));
    } else {
      setLocalTrackStates(updater);
    }
  }, [onTrackStatesChange, trackStates]);

  const timelineTracksRef = useRef<HTMLDivElement>(null);
  const headerTimecodeDomRef = useRef<HTMLSpanElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const isBeatSnapActive = propSnapToBeat !== undefined ? propSnapToBeat : localSnapToBeat;

  const selectedClip = useMemo(() => clips.find((c) => c.id === selectedClipId) || null, [clips, selectedClipId]);

  useEffect(() => {
    return audioEngine.subscribeToAnalysis((analysis) => {
      setBeatMap(analysis.transientTimecodeMap || []);
    });
  }, []);

  const pps = (zoomScale / 100) * 50;
  const scrollCtxRef = useRef({ isPlaying, isScrubbing, pps });
  scrollCtxRef.current = { isPlaying, isScrubbing, pps };

  // Direct-DOM 60 FPS header timecode + auto-scroll without triggering React re-renders
  useEffect(() => {
    return cutClock.subscribe((snap) => {
      if (headerTimecodeDomRef.current) {
        headerTimecodeDomRef.current.textContent = formatSmpteTimecode(snap.timeSec, 24);
      }
      const { isPlaying: playing, isScrubbing: scrubbing, pps: curPps } = scrollCtxRef.current;
      if (!playing || scrubbing || !timelineTracksRef.current) return;
      const container = timelineTracksRef.current;
      const playheadPx = snap.timeSec * curPps;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;
      if (playheadPx > viewRight - 80 || playheadPx < viewLeft) {
        container.scrollLeft = Math.max(0, playheadPx - container.clientWidth * 0.25);
      }
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
        if (isMounted) setVaultMediaMap(map);
      } catch {}
    };
    loadVaultUrls();
    return () => {
      isMounted = false;
    };
  }, [project.shots]);

  const resolveClipThumbUrl = useCallback((clip: TimelineClip): { url: string; isVideo: boolean } => {
    const shotIdx = typeof clip.shotIndex === 'number' ? clip.shotIndex : undefined;
    const shot = shotIdx !== undefined ? project.shots?.[shotIdx] : undefined;
    const vaultEntry = resolveShotMediaEntry(shotMediaMap, shot as any, undefined, shotIdx);

    const url =
      vaultEntry?.url ||
      (clip.url && clip.url.trim().length > 0 ? clip.url : '') ||
      ((clip as any).mediaId && vaultMediaMap[(clip as any).mediaId]) ||
      shot?.imageUrl ||
      '';

    const isVideo = Boolean(
      vaultEntry?.type === 'video' ||
      clip.type === 'video' ||
      shot?.isVideo ||
      /\.(mp4|webm|mov|m4v|mkv)($|\?)/i.test(url)
    );

    const thumbUrl = isVideo ? (shot?.thumbnailUrl || '') : url;
    return { url: thumbUrl, isVideo };
  }, [vaultMediaMap, project.shots, shotMediaMap]);

  // 60FPS Direct-DOM RAF-synced timeline scrubber (zero React state re-renders while dragging)
  const dragTimeRef = useRef<number | null>(null);
  const rafSeekRef = useRef<number | null>(null);
  const pendingClientXRef = useRef<number | null>(null);

  const applySeekPosition = useCallback((clientX: number, isContinuousScrub = true) => {
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const scrollLeft = timelineTracksRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    let newTime = Math.max(0, Math.min(totalDuration, clickX / pps));

    if (isBeatSnapActive) {
      newTime = audioEngine.snapTimeToNearestBeat(newTime, 0.35);
    } else if (isMagneticSnap) {
      const snapThreshold = 0.25;
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

    dragTimeRef.current = newTime;
    cutClock.emit({ timeSec: newTime, durationSec: Math.max(0.1, totalDuration), fps: 24 });
    onSeek(newTime, isContinuousScrub);
  }, [totalDuration, pps, onSeek, isMagneticSnap, isBeatSnapActive, clips]);

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.MouseEvent) => {
    setIsScrubbing(true);
    applySeekPosition(e.clientX, true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      pendingClientXRef.current = e.clientX;

      if (rafSeekRef.current === null) {
        rafSeekRef.current = requestAnimationFrame(() => {
          if (pendingClientXRef.current !== null) {
            applySeekPosition(pendingClientXRef.current, true);
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
      const finalSec = dragTimeRef.current;
      dragTimeRef.current = null;
      setIsScrubbing(false);
      if (finalSec !== null) {
        onSeek(finalSec, false);
      }
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
  }, [isScrubbing, applySeekPosition, onSeek]);

  const formatSMPTE = (seconds: number) => formatSmpteTimecode(seconds, 24);

  const currentTime = Math.max(0, playheadTime);
  const duration = Math.max(0.1, totalDuration);

  const toggleTrackState = (trackId: string, prop: keyof TrackMixState) => {
    updateTrackStates((prev) => {
      const current = prev[trackId] || { muted: false, solo: false, locked: false, hidden: false };
      return {
        ...prev,
        [trackId]: {
          ...current,
          [prop]: !current[prop]
        }
      };
    });
  };

  // Horizontal + Cross-Track Drag-to-Move Clip
  const handleClipBodyMouseDown = (clip: TimelineClip, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectClip(clip.id);
    if (clip.shotIndex !== undefined) {
      setActiveShotIndex(clip.shotIndex);
    }

    const trackState = trackStates[clip.trackId];
    if (trackState?.locked || !onUpdateClips) return;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const origStart = clip.start;
    const origTrackIndex = tracks.findIndex((t) => t.id === clip.trackId);
    const baseClips = [...clips];
    let hasMoved = false;

    const onMove = (moveEv: MouseEvent) => {
      const dx = moveEv.clientX - startMouseX;
      const dy = moveEv.clientY - startMouseY;
      if (!hasMoved && Math.hypot(dx, dy) < 4) return;
      if (!hasMoved) {
        hasMoved = true;
        onBeforeMutation?.(baseClips);
      }

      const rawStart = Math.max(0, origStart + dx / Math.max(1, pps));
      const rowDelta = Math.round(dy / 44);
      const targetIdx = Math.max(0, Math.min(tracks.length - 1, origTrackIndex + rowDelta));
      const candidateTrack = tracks[targetIdx];
      const targetTrackId: TrackLaneId =
        candidateTrack && isCompatibleTrackTarget(clip, candidateTrack) && !trackStates[candidateTrack.id]?.locked
          ? candidateTrack.id
          : clip.trackId;

      const snapThreshold = isMagneticSnap ? Math.max(0.18, 12 / Math.max(1, pps)) : 0;
      const extraSnaps = isBeatSnapActive ? [playheadTime, ...beatMap.slice(0, 200)] : [playheadTime];
      const { clips: movedClips, snappedAt } = moveClipWithMagneticSnap(
        baseClips,
        clip.id,
        rawStart,
        targetTrackId,
        snapThreshold,
        extraSnaps
      );

      setSnapGuideSec(snappedAt);
      const movedClip = movedClips.find((c) => c.id === clip.id);
      if (movedClip) {
        setTrimTooltip({
          label: `${movedClip.trackId} • IN ${movedClip.start.toFixed(2)}s`,
          clientX: moveEv.clientX,
          clientY: moveEv.clientY
        });
      }
      onUpdateClips(movedClips);
    };

    const onUp = () => {
      setSnapGuideSec(null);
      setTrimTooltip(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
    onBeforeMutation?.(baseClips);

    setTrimTooltip({
      label: `DUR: ${origDur.toFixed(2)}s // ${getShotFrameCount(origDur, 24)}F`,
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
          label: `DUR: ${nextDur.toFixed(2)}s // ${getShotFrameCount(nextDur, 24)}F`,
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
          label: `DUR: ${nextDur.toFixed(2)}s // ${getShotFrameCount(nextDur, 24)}F`,
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
          className="px-2.5 py-1 rounded-md bg-black/95 border border-[#F5A623] text-[10px] font-mono font-bold text-[#FFE066] whitespace-nowrap shadow-xl pointer-events-none tabular-nums"
        >
          {trimTooltip.label}
        </div>
      )}

      {/* 1. CapCut Pro NLE Control Dock */}
      <div className="min-h-[40px] bg-[#090A0F] border-b border-[#1C1D2A] px-3 py-1 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onSplitClip && (
            <button
              type="button"
              onClick={onSplitClip}
              className="px-2 py-1 bg-[#141520] hover:bg-[#F5A623] hover:text-black rounded border border-[#27283C] text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              title="Split clip at playhead (S)"
            >
              <Scissors className="w-3 h-3" />
              <span>SPLIT [S]</span>
            </button>
          )}

          {selectedClip && onRippleDeleteClip && (
            <button
              type="button"
              onClick={() => onRippleDeleteClip(selectedClip.id)}
              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-600 hover:text-white rounded border border-rose-700/50 text-rose-300 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
              title="Ripple Delete selected clip & close gap"
            >
              <Trash2 className="w-3 h-3" />
              <span>RIPPLE DEL</span>
            </button>
          )}

          {selectedClip && (selectedClip.trackId === 'V1' || selectedClip.trackId === 'V2') && onFreezeFrame && (
            <button
              type="button"
              onClick={() => onFreezeFrame(selectedClip.id)}
              className="px-2 py-1 bg-[#141520] hover:bg-cyan-500/20 hover:border-cyan-400 hover:text-cyan-200 rounded border border-[#27283C] text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
              title="Insert 2.0s Freeze Frame at playhead"
            >
              <Snowflake className="w-3 h-3 text-cyan-300" />
              <span>FREEZE</span>
            </button>
          )}

          {selectedClip && (selectedClip.type === 'video' || selectedClip.trackId === 'V1') && onDetachAudio && (
            <button
              type="button"
              onClick={() => onDetachAudio(selectedClip.id)}
              className="px-2 py-1 bg-[#141520] hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-emerald-200 rounded border border-[#27283C] text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
              title="Detach Audio onto A1 track"
            >
              <AudioWaveform className="w-3 h-3 text-emerald-400" />
              <span>EXTRACT AUDIO</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMagneticSnap(!isMagneticSnap)}
            className={`px-2 py-1 rounded border text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              isMagneticSnap
                ? 'bg-[#F5A623]/20 border-[#F5A623]/80 text-[#FFE066]'
                : 'bg-[#141520] border-[#27283C] text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle magnetic snapping to clip edges"
          >
            <Magnet className="w-3 h-3" />
            <span>SNAP</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBeatSnapInternal}
            className={`px-2 py-1 rounded border text-[10px] font-bold font-mono cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap ${
              isBeatSnapActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                : 'bg-[#141520] border-[#27283C] text-zinc-400 hover:text-white'
            }`}
            title="Snap cuts and drags to audio beats"
          >
            <Music className="w-3 h-3 text-cyan-400" />
            <span>BEAT SNAP</span>
          </button>

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            className="px-2 py-1 rounded bg-[#141520] hover:bg-[#1E2030] border border-[#27283C] text-[10px] font-mono text-zinc-300 hover:text-[#FFE066] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            title="Attach MP3/WAV track for beat markers"
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

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-[#27283C] tabular-nums">
            <span ref={headerTimecodeDomRef} className="font-mono text-[11px] text-[#FFE066] font-bold tracking-wider">
              {formatSMPTE(playheadTime)}
            </span>
            <span className="text-zinc-600 font-mono text-[10px]">
              / {formatSMPTE(totalDuration)}
            </span>
          </div>

          <TrackVuMeter variant="mini" />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
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
              className="w-20 h-1.5 accent-[#F5A623] cursor-pointer bg-zinc-800 rounded-lg appearance-none"
            />
            <span className="text-[9px] text-[#FFE066] w-8 text-right font-mono font-bold tabular-nums">
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

      {/* 2. Timeline Body */}
      <div className="flex-1 flex overflow-hidden relative min-h-[220px]">
        {/* Left Track Headers */}
        <div className="w-52 bg-[#08090E] border-r border-[#1C1D2A] flex flex-col shrink-0 z-20">
          <div className="h-7 border-b border-[#1C1D2A] bg-[#0A0B12] px-2.5 flex items-center justify-between text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            <span>TRACK</span>
            <span>M / S / VIS / LOCK</span>
          </div>

          {tracks.map((track) => {
            const theme = TRACK_THEMES[track.id] || TRACK_THEMES.V1;
            const state = trackStates[track.id] || { muted: false, locked: false, hidden: false, solo: false };

            return (
              <div
                key={track.id}
                className="h-11 border-b border-[#1C1D2A] px-2 flex items-center justify-between text-[10px] font-mono bg-[#07080C] hover:bg-[#0E0F17] transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${theme.badge}`}>
                    {track.id}
                  </span>
                  <span className="text-[9px] font-semibold text-zinc-300 truncate max-w-[68px]">
                    {track.label.replace(/^[A-Z0-9]+\s*/, '')}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleTrackState(track.id, 'muted')}
                    className={`w-5 h-5 rounded text-[8px] font-bold cursor-pointer transition-colors flex items-center justify-center ${
                      state.muted
                        ? 'bg-rose-950 text-rose-400 border border-rose-700/60'
                        : 'text-zinc-500 hover:text-zinc-200 bg-white/5'
                    }`}
                    title="Mute Track"
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTrackState(track.id, 'solo')}
                    className={`w-5 h-5 rounded text-[8px] font-bold cursor-pointer transition-colors flex items-center justify-center ${
                      state.solo
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-400/60'
                        : 'text-zinc-500 hover:text-zinc-200 bg-white/5'
                    }`}
                    title="Solo Track"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTrackState(track.id, 'hidden')}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      state.hidden ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-300 hover:text-white'
                    }`}
                    title={state.hidden ? 'Unhide Track' : 'Hide Track'}
                  >
                    {state.hidden ? <EyeOff className="w-3 h-3 text-zinc-600" /> : <Eye className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleTrackState(track.id, 'locked')}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      state.locked ? 'text-[#F5A623]' : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                    title={state.locked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {state.locked ? <Lock className="w-3 h-3 text-[#F5A623]" /> : <Unlock className="w-3 h-3 text-zinc-600" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Canvas: Timecode Ruler + Multi-Lane Clips */}
        <div
          ref={timelineTracksRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#040407] cursor-crosshair custom-scrollbar"
        >
          <div style={{ width: `${totalContentWidth}px` }} className="relative h-full">
            {/* Ruler */}
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

            {/* Track Lanes */}
            {tracks.map((track) => {
              const theme = TRACK_THEMES[track.id] || TRACK_THEMES.V1;
              const isVideoTrack = track.type === 'video';
              const state = trackStates[track.id] || { muted: false, locked: false, hidden: false, solo: false };

              return (
                <div
                  key={track.id}
                  className={`h-11 border-b border-[#181926] relative transition-colors ${
                    state.hidden ? 'opacity-30' : ''
                  } ${theme.bg}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_100%] pointer-events-none" />

                  {clips
                    .filter((c) => c.trackId === track.id)
                    .map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const isUnderPlayhead = playheadTime >= clip.start && playheadTime < clip.start + clip.duration;
                      const leftPos = clip.start * pps;
                      const clipWidth = Math.max(28, clip.duration * pps);
                      const { url: thumbUrl } = resolveClipThumbUrl(clip);
                      const barCount = Math.min(48, Math.max(6, Math.floor(clipWidth / 6)));

                      return (
                        <div
                          key={clip.id}
                          onMouseDown={(e) => handleClipBodyMouseDown(clip, e)}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute top-1 bottom-1 rounded-md overflow-hidden shadow-md group ${
                            state.locked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                          } ${
                            isSelected
                              ? 'ring-2 ring-[#FFE066] z-20 border border-[#D4AF37] shadow-[0_0_15px_rgba(245,166,35,0.4)]'
                              : isVideoTrack
                                ? 'border border-amber-600/50 bg-[#161724]'
                                : track.type === 'text'
                                  ? 'border border-purple-600/50 bg-purple-950/75'
                                  : 'border border-emerald-600/50 bg-emerald-950/75'
                          }`}
                          style={{
                            left: `${leftPos}px`,
                            width: `${clipWidth}px`
                          }}
                        >
                          {/* Video/Image Filmstrip Thumbnails */}
                          {isVideoTrack && thumbUrl && !thumbUrl.startsWith('data:image/svg') && (
                            <div className="absolute inset-0 flex overflow-hidden opacity-85 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {Array.from({ length: Math.min(20, Math.max(1, Math.ceil(clipWidth / 52))) }).map((_, thumbIdx) => (
                                <img
                                  key={thumbIdx}
                                  src={thumbUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="h-full w-14 object-cover shrink-0 border-r border-black/50"
                                />
                              ))}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />
                            </div>
                          )}

                          {/* Audio Waveform Bars */}
                          {track.type === 'audio' && (
                            <div className="absolute inset-x-1 bottom-0.5 h-5 flex items-end gap-[2px] opacity-45 pointer-events-none overflow-hidden">
                              {Array.from({ length: barCount }).map((_, bIdx) => {
                                const waveH = 25 + Math.abs(Math.sin((bIdx + 1) * 0.72 + clip.start) * 70);
                                return (
                                  <div
                                    key={bIdx}
                                    className="flex-1 bg-emerald-300 rounded-t-[1px] min-w-[2px]"
                                    style={{ height: `${waveH}%` }}
                                  />
                                );
                              })}
                            </div>
                          )}

                          <div className="relative z-10 w-full h-full px-2.5 flex items-center justify-between text-[10px] font-mono pointer-events-none tabular-nums">
                            <div className="flex items-center gap-1 min-w-0">
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
                              {clip.speed?.isFrozen && (
                                <span className="px-1 rounded bg-cyan-500/30 text-cyan-200 text-[8px] font-bold shrink-0">
                                  FREEZE
                                </span>
                              )}
                              {clip.speed?.isReversed && (
                                <Rewind className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                              )}
                              {clip.speed && Math.abs(clip.speed.multiplier - 1) > 0.05 && (
                                <span className="px-1 rounded bg-amber-500/25 text-amber-200 text-[8px] font-bold shrink-0">
                                  {clip.speed.multiplier.toFixed(1)}x
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border shrink-0 ml-1 ${
                                isUnderPlayhead
                                  ? 'bg-black/90 border-[#FFE066] text-[#FFE066]'
                                  : 'bg-black/75 border-white/10 text-zinc-300'
                              }`}
                            >
                              {clip.duration.toFixed(1)}s
                            </span>
                          </div>

                          {/* Left & Right Trim Handles */}
                          <div
                            onMouseDown={(e) => !state.locked && handleClipTrimMouseDown(clip, 'left', e)}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag left edge to trim In-point"
                            className="absolute left-0 top-0 bottom-0 w-2 bg-white/15 group-hover:bg-[#FFE066]/70 hover:!bg-[#FFE066] cursor-ew-resize z-20 flex flex-col justify-center items-center gap-0.5"
                          >
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                            <div className="w-0.5 h-1 bg-black/70 rounded-full" />
                          </div>
                          <div
                            onMouseDown={(e) => !state.locked && handleClipTrimMouseDown(clip, 'right', e)}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag right edge to trim Out-point"
                            className="absolute right-0 top-0 bottom-0 w-2 bg-white/15 group-hover:bg-[#FFE066]/70 hover:!bg-[#FFE066] cursor-ew-resize z-20 flex flex-col justify-center items-center gap-0.5"
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

            {/* Magnetic Snap Alignment Line */}
            {snapGuideSec !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-cyan-400 shadow-[0_0_8px_#22d3ee] pointer-events-none z-40"
                style={{ left: `${snapGuideSec * pps}px` }}
              />
            )}

            {/* Dynamic Playhead */}
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
