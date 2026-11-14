/**
 * @file /src/features/cut/CutStudio.tsx
 * @description Master CapCut / Premiere-Style Multi-Track Video Editor for RAWx Storyboard Studio.
 * Zero-stub, complete implementation with synced multi-track playback engine, VLC 200% audio preamp,
 * interactive canvas transform & scale handles, 30+ shader effects, transitions, keyframe animations,
 * 9 color adjustments, speed curves, ripple delete, freeze frame, extract audio, and real SRT/LUT/Template pipelines.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStudioStore } from '../../core/store';
import { AnthologyFrame, AnthologyProject, AspectRatio } from '../../types/anthology';
import { TimelineClip, TrackLane } from '../../types/cut';
import { baseThemesData, generateInitialFrames } from '../../data/frames';
import { getShotProceduralSpec, PROCEDURAL_PALETTES } from '../../data/proceduralCinemaEngine';
import { convertShotV1ToFrame } from '../../utils/projectMigration';
import { exportToOTIO, triggerFileDownload } from '../../data/hollywoodExporters';
import { audioEngine } from '../../services/audioEngine';
import { resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { applyVlcMediaGain, resumeVlcAudioContext } from '../../utils/vlcAudioPreamp';
import {
  type TrackMixState,
  computeClipMediaTime,
  computeClipAnimationState,
  computeClipTransitionState,
  buildClipColorAndFx,
  buildClipMaskAndCropCss,
  computeAudioClipGain,
  rippleDeleteClip,
  freezeFrameAtPlayhead,
  detachAudioFromClip,
  generateSrtFromClips,
  generateCaptionClipsFromV1
} from '../../utils/cutRenderMath';
import { CutEditorTimeline } from '../../components/CutEditorTimeline';
import { getShotDurationSec, MIN_SHOT_DURATION_SEC } from '../../types/storyboard';
import { eventBus } from '../../core/eventBus';
import { cutClock, syncVideoCurrentTimeWithFastSeek } from '../../utils/playbackClock';
import {
  Scissors,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  Volume2,
  VolumeX,
  Sparkles,
  Film,
  Music,
  Type,
  Sticker,
  Wand2,
  Sliders,
  Download,
  Upload,
  FastForward,
  Rewind,
  Crosshair,
  SplitSquareVertical,
  Check,
  Maximize,
  Radio,
  Snowflake,
  AudioWaveform,
  X
} from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

interface CutStudioProps {
  onSyncToBoard?: (frames: AnthologyFrame[]) => void;
  onOpenMultiCam?: () => void;
}

const defaultTracks: TrackLane[] = [
  { id: 'V2', label: 'V2 OVERLAYS', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'V1', label: 'V1 MAIN VIDEO', type: 'video', isMuted: false, isLocked: false, isHidden: false },
  { id: 'T1', label: 'T1 TEXT/TITLES', type: 'text', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A1', label: 'A1 SOUND FX', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'A2', label: 'A2 MUSIC/DRONE', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
  { id: 'VO', label: 'VO VOICEOVER', type: 'audio', isMuted: false, isLocked: false, isHidden: false },
];

const INITIAL_TRACK_STATES: Record<string, TrackMixState> = {
  V2: { muted: false, solo: false, locked: false, hidden: false },
  V1: { muted: false, solo: false, locked: false, hidden: false },
  T1: { muted: false, solo: false, locked: false, hidden: false },
  A1: { muted: false, solo: false, locked: false, hidden: false },
  A2: { muted: false, solo: false, locked: false, hidden: false },
  VO: { muted: false, solo: false, locked: false, hidden: false }
};

interface FilterLutPreset {
  id: string;
  name: string;
  shader?: string;
  adjustments: TimelineClip['adjustments'];
  swatch: string;
}

const FILTER_LUT_PRESETS: FilterLutPreset[] = [
  {
    id: 'rawx-gold',
    name: 'RAWx Molten Gold',
    shader: 'Golden Haze',
    swatch: 'from-amber-700 via-yellow-600 to-stone-900',
    adjustments: { brightness: 104, contrast: 118, saturation: 122, temperature: 18, shadows: -12, highlights: 14, sharpen: 35, vignette: 24, grain: 14 }
  },
  {
    id: 'dhaka-noir',
    name: 'Dhaka Night Noir',
    shader: 'Noir Silver',
    swatch: 'from-zinc-900 via-zinc-600 to-black',
    adjustments: { brightness: 96, contrast: 132, saturation: 0, temperature: -8, shadows: -20, highlights: 16, sharpen: 40, vignette: 45, grain: 28 }
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass 2383',
    shader: 'Bleach Bypass',
    swatch: 'from-slate-700 via-stone-500 to-zinc-950',
    adjustments: { brightness: 95, contrast: 136, saturation: 55, temperature: -4, shadows: -18, highlights: 20, sharpen: 45, vignette: 32, grain: 22 }
  },
  {
    id: 'teal-orange',
    name: 'Teal & Amber Cinema',
    shader: 'Teal & Orange',
    swatch: 'from-cyan-700 via-teal-900 to-amber-600',
    adjustments: { brightness: 102, contrast: 120, saturation: 128, temperature: -10, shadows: -8, highlights: 10, sharpen: 30, vignette: 20, grain: 12 }
  },
  {
    id: 'kodak-warm',
    name: 'Kodachrome 64',
    shader: 'Kodachrome',
    swatch: 'from-rose-700 via-amber-600 to-emerald-950',
    adjustments: { brightness: 105, contrast: 114, saturation: 118, temperature: 14, shadows: 6, highlights: 8, sharpen: 25, vignette: 18, grain: 20 }
  },
  {
    id: 'cyber-vhs',
    name: 'VHS Cyber Scan',
    shader: 'VHS Glitch',
    swatch: 'from-fuchsia-700 via-cyan-600 to-slate-950',
    adjustments: { brightness: 102, contrast: 122, saturation: 135, temperature: -16, shadows: 8, highlights: 18, sharpen: 15, vignette: 28, grain: 35 }
  },
  {
    id: 'orton-bloom',
    name: 'Dream Orton Bloom',
    shader: 'Orton Bloom',
    swatch: 'from-amber-300 via-rose-400 to-indigo-950',
    adjustments: { brightness: 110, contrast: 96, saturation: 114, temperature: 10, shadows: 12, highlights: 22, sharpen: 0, vignette: 20, grain: 8 }
  },
  {
    id: 'neutral',
    name: 'Reset Neutral',
    shader: undefined,
    swatch: 'from-neutral-700 via-neutral-800 to-neutral-950',
    adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 20, vignette: 10, grain: 8 }
  }
];

interface SequenceTemplateSpec {
  id: string;
  name: string;
  desc: string;
  aspect: AspectRatio;
  clipDurationSec: number;
  transitionType: NonNullable<TimelineClip['transition']>['type'];
  animIn: TimelineClip['animation']['inType'];
  shader?: string;
}

const SEQUENCE_TEMPLATES: SequenceTemplateSpec[] = [
  {
    id: 'cinema-trailer',
    name: 'Cinema Trailer 16:9',
    desc: '2.8s pacing, dissolve transitions & molten gold bloom',
    aspect: '16:9',
    clipDurationSec: 2.8,
    transitionType: 'dissolve',
    animIn: 'zoom-in',
    shader: 'Golden Haze'
  },
  {
    id: 'reels-hook',
    name: 'Reels / Shorts 9:16',
    desc: '1.6s snappy cuts, whip-pan & bold bilingual titles',
    aspect: '9:16',
    clipDurationSec: 1.6,
    transitionType: 'whip-pan',
    animIn: 'slide-up',
    shader: 'Teal & Orange'
  },
  {
    id: 'anamorphic-lookbook',
    name: 'Anamorphic 2.39:1',
    desc: '3.6s scope pacing, dip-to-black & Kodachrome tone',
    aspect: '2.39:1',
    clipDurationSec: 3.6,
    transitionType: 'dip-black',
    animIn: 'fade-in',
    shader: 'Kodachrome'
  },
  {
    id: 'glitch-beat-cut',
    name: 'Staccato Glitch Cut',
    desc: '1.2s rapid cuts, glitch slices & high contrast',
    aspect: '16:9',
    clipDurationSec: 1.2,
    transitionType: 'glitch',
    animIn: 'wipe-right',
    shader: 'VHS Glitch'
  }
];

export const CutStudio: React.FC<CutStudioProps> = ({ onOpenMultiCam }) => {
  const { project, updateShot, shotMediaMap } = useStudioStore();

  // Top Bar state
  const [projectName, setProjectName] = useState(project.title || 'RAWx Director Anthology Cut');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (project.aspectRatio as AspectRatio) || '16:9'
  );
  const [undoStack, setUndoStack] = useState<TimelineClip[][]>([]);
  const [redoStack, setRedoStack] = useState<TimelineClip[][]>([]);

  // Memoized AnthologyProject for Hollywood Exporters
  const anthologyProject: AnthologyProject = useMemo(() => {
    const rawFrames = (project.shots && project.shots.length > 0)
      ? project.shots.map((shot, idx) => convertShotV1ToFrame(shot, idx))
      : generateInitialFrames();
    return {
      title: projectName,
      director: project.director || 'Director',
      nodeLocation: project.nodeLocation || 'RAWx Node-01',
      aspectRatio: aspectRatio,
      frames: rawFrames,
      createdAt: project.createdAt || new Date().toISOString(),
      version: '1.0.0'
    };
  }, [project, projectName, aspectRatio]);

  // Navigation Panel state
  const [activePanel, setActivePanel] = useState<
    'media' | 'audio' | 'text' | 'stickers' | 'effects' | 'transitions' | 'captions' | 'filters' | 'templates'
  >('media');

  // Track Mix states synced with Timeline
  const [trackStates, setTrackStates] = useState<Record<string, TrackMixState>>(INITIAL_TRACK_STATES);
  const [isSnapToBeat, setIsSnapToBeat] = useState<boolean>(() => audioEngine.getIsSnapToBeatEnabled());

  // Initialize timeline clips resolving per-shot vault media
  const [clips, setClips] = useState<TimelineClip[]>(() => {
    const initialClips: TimelineClip[] = [];
    const baseShots = project.shots.length > 0 ? project.shots : baseThemesData;
    const currentMediaMap = useStudioStore.getState().shotMediaMap;
    let currentTimelineTime = 0;

    baseShots.slice(0, 16).forEach((shot: any, index: number) => {
      const duration = getShotDurationSec(shot, 3.0);
      const theme = baseThemesData[index % baseThemesData.length];
      const vaultEntry = resolveShotMediaEntry(currentMediaMap, shot, undefined, index);
      const resolvedUrl = vaultEntry?.url || shot.imageUrl || '';
      const isVid = vaultEntry ? vaultEntry.type === 'video' : Boolean(shot.isVideo);

      initialClips.push({
        id: `clip-v1-${index}`,
        trackId: 'V1',
        name: `Shot ${String(index + 1).padStart(3, '0')}: ${shot.title || theme.title}`,
        type: isVid ? 'video' : 'image',
        start: currentTimelineTime,
        duration: duration,
        inPoint: 0,
        outPoint: duration,
        url: resolvedUrl,
        text: shot.title || theme.title,
        bengaliText: shot.bengaliTitle || theme.sub,
        shotIndex: index,
        posX: 0,
        posY: 0,
        scale: 100,
        rotation: 0,
        opacity: 100,
        blendMode: 'normal',
        mask: 'none',
        crop: { top: 0, bottom: 0, left: 0, right: 0 },
        animation: { inType: 'fade-in', outType: 'none', duration: 0.45 },
        adjustments: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          temperature: 0,
          shadows: 0,
          highlights: 0,
          sharpen: 20,
          vignette: 15,
          grain: 10
        },
        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
        audio: { volume: 100, fadeIn: 0.15, fadeOut: 0.15, noiseReduction: false }
      });

      if (index < 6) {
        initialClips.push({
          id: `clip-t1-${index}`,
          trackId: 'T1',
          name: `Title: ${shot.bengaliTitle || theme.sub}`,
          type: 'text',
          start: currentTimelineTime,
          duration: Math.min(2.0, duration),
          inPoint: 0,
          outPoint: Math.min(2.0, duration),
          text: shot.title || theme.title,
          bengaliText: shot.bengaliTitle || theme.sub,
          posX: 0,
          posY: 0,
          scale: 100,
          rotation: 0,
          opacity: 95,
          blendMode: 'normal',
          mask: 'none',
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
          animation: { inType: 'zoom-in', outType: 'fade-out', duration: 0.35 },
          adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
          speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
          audio: { volume: 0, fadeIn: 0, fadeOut: 0, noiseReduction: false }
        });
      }

      currentTimelineTime += duration;
    });

    initialClips.push({
      id: 'clip-a2-drone',
      trackId: 'A2',
      name: 'Sub-Bass Drone (43.6Hz)',
      type: 'audio',
      start: 0,
      duration: Math.max(30, currentTimelineTime),
      inPoint: 0,
      outPoint: Math.max(30, currentTimelineTime),
      text: '43.6Hz Binaural Ambience',
      posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none', crop: { top: 0, bottom: 0, left: 0, right: 0 },
      animation: { inType: 'none', outType: 'none', duration: 0 },
      adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
      speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
      audio: { volume: 65, fadeIn: 1.0, fadeOut: 1.5, noiseReduction: false }
    });

    return initialClips;
  });

  // Automatically hydrate any timeline clips with freshly loaded shotMediaMap blob URLs
  useEffect(() => {
    setClips(prev => {
      let changed = false;
      const next = prev.map(clip => {
        if ((clip.trackId === 'V1' || clip.trackId === 'V2') && clip.shotIndex !== undefined) {
          const shot = project.shots[clip.shotIndex];
          const entry = resolveShotMediaEntry(shotMediaMap, shot as any, undefined, clip.shotIndex);
          if (entry?.url && (!clip.url || clip.url !== entry.url)) {
            changed = true;
            return {
              ...clip,
              url: entry.url,
              type: entry.type === 'video' ? ('video' as const) : ('image' as const)
            };
          }
        }
        return clip;
      });
      return changed ? next : prev;
    });
  }, [shotMediaMap, project.shots]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  // Discrete React state for cut-boundary swaps & paused snapshots; 60 FPS ticks use playheadTimeRef + cutClock
  const [playheadTime, setPlayheadTime] = useState<number>(0);
  const playheadTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [monitorVolume, setMonitorVolume] = useState<number>(1.0); // 0 .. 2.0 (200% VLC boost)
  const [isMonitorMuted, setIsMonitorMuted] = useState<boolean>(false);
  const [monitorSpeed, setMonitorSpeed] = useState<number>(1.0);
  const [activePropertyTab, setActivePropertyTab] = useState<'video' | 'animation' | 'adjust' | 'speed' | 'audio'>('video');

  // Program Monitor state
  const [isTransformDragging, setIsTransformDragging] = useState(false);
  const [showSafeGuides, setShowSafeGuides] = useState(true);
  const [exportNotification, setExportNotification] = useState<string | null>(null);

  const monitorContainerRef = useRef<HTMLDivElement>(null);
  const monitorTimecodeDomRef = useRef<HTMLSpanElement>(null);
  const v1VideoRef = useRef<HTMLVideoElement | null>(null);
  const v2VideoRef = useRef<HTMLVideoElement | null>(null);
  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playheadRafRef = useRef<number | null>(null);
  const prevActiveClipsRef = useRef<{ v1: string | null; v2: string | null; t1: string | null }>({
    v1: null,
    v2: null,
    t1: null
  });
  const dragTransformRef = useRef<{
    mode: 'move' | 'scale';
    clipId: string;
    startX: number;
    startY: number;
    origPosX: number;
    origPosY: number;
    origScale: number;
  } | null>(null);

  // Clean up audio pool on unmount
  useEffect(() => {
    const pool = audioPoolRef.current;
    return () => {
      pool.forEach(el => {
        el.pause();
        el.src = '';
      });
      pool.clear();
    };
  }, []);

  const notify = useCallback((msg: string, ms = 2500) => {
    setExportNotification(msg);
    setTimeout(() => setExportNotification(null), ms);
  }, []);

  const selectedClip = useMemo(() => clips.find(c => c.id === selectedClipId) || null, [clips, selectedClipId]);

  const totalDuration = useMemo(() => {
    return Math.max(10, ...clips.map(c => c.start + c.duration));
  }, [clips]);

  const anyAudioTrackSoloed = useMemo(() => {
    return ['A1', 'A2', 'VO'].some(id => Boolean(trackStates[id]?.solo));
  }, [trackStates]);

  const formatTC = (timeSec: number) => {
    const totalFrames = Math.floor(timeSec * 24);
    const ff = totalFrames % 24;
    const ss = Math.floor(timeSec) % 60;
    const mm = Math.floor(timeSec / 60) % 60;
    const hh = Math.floor(timeSec / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  const pushUndo = useCallback((prevClips: TimelineClip[]) => {
    setUndoStack(prev => [...prev.slice(-15), prevClips]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, clips]);
    setClips(prev);
    setUndoStack(u => u.slice(0, -1));
  }, [undoStack, clips]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, clips]);
    setClips(next);
    setRedoStack(r => r.slice(0, -1));
  }, [redoStack, clips]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;
  const trackStatesRef = useRef(trackStates);
  trackStatesRef.current = trackStates;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const monitorSpeedRef = useRef(monitorSpeed);
  monitorSpeedRef.current = monitorSpeed;
  const monitorVolumeRef = useRef(monitorVolume);
  monitorVolumeRef.current = monitorVolume;
  const isMonitorMutedRef = useRef(isMonitorMuted);
  isMonitorMutedRef.current = isMonitorMuted;
  const anyAudioTrackSoloedRef = useRef(anyAudioTrackSoloed);
  anyAudioTrackSoloedRef.current = anyAudioTrackSoloed;

  // Helper to sync a video element cleanly via video.fastSeek() & speed/audio at a specific time
  const syncVideoElementAtTime = useCallback(
    (el: HTMLVideoElement | null, clip: TimelineClip | null, tSec: number, playing: boolean) => {
      if (!el || !clip || clip.type !== 'video' || !clip.url) return;

      const curTrackStates = trackStatesRef.current;
      const curSpeed = monitorSpeedRef.current;
      const curMuted = isMonitorMutedRef.current;
      const curVol = monitorVolumeRef.current;

      const targetMediaTime = computeClipMediaTime(clip, tSec);
      const speedMult = Math.max(0.25, Math.min(4.0, (clip.speed?.multiplier ?? 1) * curSpeed));
      const isFrozen = Boolean(clip.speed?.isFrozen);
      const isReversed = Boolean(clip.speed?.isReversed);

      const isInitialClipEntry = el.dataset.activeClipId !== clip.id;
      if (!playing || isFrozen || isReversed) {
        if (!el.paused) el.pause();
        el.dataset.activeClipId = clip.id;
        if (Number.isFinite(targetMediaTime) && el.readyState >= 1) {
          syncVideoCurrentTimeWithFastSeek(el, targetMediaTime, 0.0005);
        }
      } else if (isInitialClipEntry && el.readyState >= 1) {
        el.dataset.activeClipId = clip.id;
        if (Number.isFinite(targetMediaTime) && Math.abs(el.currentTime - targetMediaTime) > 0.08) {
          if (!el.paused) el.pause();
          try {
            el.currentTime = targetMediaTime;
          } catch {}
        }
      }

      if (Math.abs(el.playbackRate - speedMult) > 0.02) {
        try {
          el.playbackRate = speedMult;
        } catch {}
      }

      const trackMutedOrUnsoloed = Boolean(curTrackStates[clip.trackId]?.muted);
      const clipGain =
        computeAudioClipGain(
          clip,
          tSec,
          curTrackStates[clip.trackId],
          false,
          curMuted || trackMutedOrUnsoloed
        ) * curVol;
      applyVlcMediaGain(el, clipGain, curMuted || trackMutedOrUnsoloed || clipGain <= 0.001);

      if (playing && !isFrozen && !isReversed) {
        if (el.paused && el.readyState >= 2) {
          el.play().catch(() => {});
        }
      } else if (!el.paused) {
        el.pause();
      }
    },
    []
  );

  // Sync V1, V2, and A1/A2/VO media elements directly at 60 FPS without React state re-renders
  const syncAllMediaAtTime = useCallback(
    (tSec: number, playing: boolean) => {
      const curClips = clipsRef.current;
      const curTrackStates = trackStatesRef.current;
      const curSpeed = monitorSpeedRef.current;
      const curVol = monitorVolumeRef.current;
      const curMuted = isMonitorMutedRef.current;
      const curSolo = anyAudioTrackSoloedRef.current;

      const v1Clip = !curTrackStates.V1?.hidden
        ? curClips.find((c) => c.trackId === 'V1' && tSec >= c.start && tSec <= c.start + c.duration) || null
        : null;
      const v2Clip = !curTrackStates.V2?.hidden
        ? curClips.find((c) => c.trackId === 'V2' && tSec >= c.start && tSec <= c.start + c.duration) || null
        : null;
      const t1Clip = !curTrackStates.T1?.hidden
        ? curClips.find((c) => c.trackId === 'T1' && tSec >= c.start && tSec <= c.start + c.duration) || null
        : null;

      syncVideoElementAtTime(v1VideoRef.current, v1Clip, tSec, playing);
      syncVideoElementAtTime(v2VideoRef.current, v2Clip, tSec, playing);

      const pool = audioPoolRef.current;
      const activeAudioClips = curClips.filter(
        (c) =>
          (c.trackId === 'A1' || c.trackId === 'A2' || c.trackId === 'VO') &&
          Boolean(c.url) &&
          tSec >= c.start &&
          tSec <= c.start + c.duration
      );
      const activeIds = new Set(activeAudioClips.map((c) => c.id));

      pool.forEach((el, id) => {
        if (!activeIds.has(id) && !el.paused) {
          el.pause();
        }
      });

      activeAudioClips.forEach((clip) => {
        if (!clip.url) return;
        let el = pool.get(clip.id);
        if (!el) {
          el = new Audio(clip.url);
          el.preload = 'auto';
          pool.set(clip.id, el);
        } else if (el.src !== clip.url && !el.src.endsWith(clip.url)) {
          el.src = clip.url;
        }

        const targetTime = computeClipMediaTime(clip, tSec);
        const drift = Math.abs(el.currentTime - targetTime);
        const tolerance = playing && !clip.speed?.isReversed ? 0.25 : 0.02;
        if (Number.isFinite(targetTime) && drift > tolerance && el.readyState >= 1) {
          try {
            el.currentTime = targetTime;
          } catch {}
        }

        const rate = Math.max(0.25, Math.min(4.0, (clip.speed?.multiplier || 1) * curSpeed));
        if (Math.abs(el.playbackRate - rate) > 0.02) {
          try {
            el.playbackRate = rate;
          } catch {}
        }

        const clipGain =
          computeAudioClipGain(clip, tSec, curTrackStates[clip.trackId], curSolo, curMuted) * curVol;

        applyVlcMediaGain(el, clipGain, curMuted || clipGain <= 0.001);

        if (playing && !clip.speed?.isFrozen) {
          if (el.paused) el.play().catch(() => {});
        } else if (!el.paused) {
          el.pause();
        }
      });

      const nextV1Id = v1Clip?.id ?? null;
      const nextV2Id = v2Clip?.id ?? null;
      const nextT1Id = t1Clip?.id ?? null;
      const prevIds = prevActiveClipsRef.current;
      const boundaryChanged =
        nextV1Id !== prevIds.v1 || nextV2Id !== prevIds.v2 || nextT1Id !== prevIds.t1;
      prevActiveClipsRef.current = { v1: nextV1Id, v2: nextV2Id, t1: nextT1Id };
      return boundaryChanged;
    },
    [syncVideoElementAtTime]
  );

  // High-performance 60 FPS Playback Loop: Direct-DOM cutClock + fastSeek (Zero React re-renders between cuts)
  useEffect(() => {
    if (!isPlaying) {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
      const pausedAt = playheadTimeRef.current;
      cutClock.emit({ timeSec: pausedAt, durationSec: totalDuration, fps: 24 });
      if (monitorTimecodeDomRef.current) {
        monitorTimecodeDomRef.current.textContent = formatTC(pausedAt);
      }
      syncAllMediaAtTime(pausedAt, false);
      setPlayheadTime(pausedAt);
      return;
    }

    let lastTime = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const next = playheadTimeRef.current + delta * monitorSpeed;
      if (next >= totalDuration) {
        playheadTimeRef.current = 0;
        cutClock.emit({ timeSec: 0, durationSec: totalDuration, fps: 24 });
        if (monitorTimecodeDomRef.current) {
          monitorTimecodeDomRef.current.textContent = formatTC(0);
        }
        syncAllMediaAtTime(0, false);
        setIsPlaying(false);
        setPlayheadTime(0);
        return;
      }

      playheadTimeRef.current = next;
      if (monitorTimecodeDomRef.current) {
        monitorTimecodeDomRef.current.textContent = formatTC(next);
      }
      cutClock.emit({ timeSec: next, durationSec: totalDuration, fps: 24 });

      const cutBoundaryCrossed = syncAllMediaAtTime(next, true);
      if (cutBoundaryCrossed) {
        // Trigger React mount/unmount swap ONLY when entering/exiting a clip
        setPlayheadTime(next);
      }

      playheadRafRef.current = requestAnimationFrame(tick);
    };

    playheadRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (playheadRafRef.current) cancelAnimationFrame(playheadRafRef.current);
    };
  }, [isPlaying, totalDuration, monitorSpeed, syncAllMediaAtTime]);

  // Direct seek / scrub handler (sub-millisecond video.fastSeek + direct DOM, avoids React re-render during drag)
  const handleTimelineSeek = useCallback(
    (targetTime: number, isContinuousScrub = false) => {
      const clamped = Math.max(0, Math.min(totalDuration, targetTime));
      playheadTimeRef.current = clamped;
      if (monitorTimecodeDomRef.current) {
        monitorTimecodeDomRef.current.textContent = formatTC(clamped);
      }
      cutClock.emit({ timeSec: clamped, durationSec: totalDuration, fps: 24 });
      const boundaryCrossed = syncAllMediaAtTime(clamped, isPlayingRef.current);
      if (!isContinuousScrub || boundaryCrossed) {
        setPlayheadTime(clamped);
      }
    },
    [totalDuration, syncAllMediaAtTime]
  );

  // Active monitor clips (honoring track Hidden eye icon)
  const activeMonitorV1Clip = useMemo(() => {
    if (trackStates.V1?.hidden) return null;
    return clips.find(c => c.trackId === 'V1' && playheadTime >= c.start && playheadTime <= c.start + c.duration) || null;
  }, [clips, playheadTime, trackStates]);

  const activeMonitorV2Clip = useMemo(() => {
    if (trackStates.V2?.hidden) return null;
    return clips.find(c => c.trackId === 'V2' && playheadTime >= c.start && playheadTime <= c.start + c.duration) || null;
  }, [clips, playheadTime, trackStates]);

  const activeMonitorT1Clip = useMemo(() => {
    if (trackStates.T1?.hidden) return null;
    return clips.find(c => c.trackId === 'T1' && playheadTime >= c.start && playheadTime <= c.start + c.duration) || null;
  }, [clips, playheadTime, trackStates]);

  const syncVideoElement = useCallback(
    (el: HTMLVideoElement | null, clip: TimelineClip | null) => {
      syncVideoElementAtTime(el, clip, playheadTimeRef.current, isPlayingRef.current);
    },
    [syncVideoElementAtTime]
  );

  // Re-sync discrete parameter changes (clips edits, track mute/solo, monitor speed/volume)
  useEffect(() => {
    syncAllMediaAtTime(playheadTimeRef.current, isPlaying);
  }, [clips, trackStates, monitorSpeed, monitorVolume, isMonitorMuted, anyAudioTrackSoloed, isPlaying, syncAllMediaAtTime]);

  // Pointer drag/scale handling for Program Monitor bounding box
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragTransformRef.current;
      const box = monitorContainerRef.current;
      if (!drag || !box) return;
      const rect = box.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      setClips(prev =>
        prev.map(c => {
          if (c.id !== drag.clipId) return c;
          if (drag.mode === 'move') {
            const nextPosX = Math.max(-50, Math.min(50, Math.round(drag.origPosX + (dx / rect.width) * 100)));
            const nextPosY = Math.max(-50, Math.min(50, Math.round(drag.origPosY + (dy / rect.height) * 100)));
            return { ...c, posX: nextPosX, posY: nextPosY };
          } else {
            const deltaPct = Math.round(((dx + dy) / rect.width) * 140);
            const nextScale = Math.max(20, Math.min(250, drag.origScale + deltaPct));
            return { ...c, scale: nextScale };
          }
        })
      );
    };

    const handlePointerUp = () => {
      if (dragTransformRef.current) {
        dragTransformRef.current = null;
        setIsTransformDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const startMonitorTransform = (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'scale'
  ) => {
    e.stopPropagation();
    if (trackStates[clip.trackId]?.locked) {
      notify(`Track ${clip.trackId} is locked`, 1600);
      return;
    }
    pushUndo(clips);
    setSelectedClipId(clip.id);
    setIsTransformDragging(true);
    dragTransformRef.current = {
      mode,
      clipId: clip.id,
      startX: e.clientX,
      startY: e.clientY,
      origPosX: clip.posX,
      origPosY: clip.posY,
      origScale: clip.scale
    };
  };

  // Split Clip at Playhead (S)
  const handleSplitAtPlayhead = useCallback(() => {
    const targetClip = selectedClip || activeMonitorV1Clip;
    if (!targetClip) return;

    const currentTime = playheadTimeRef.current;
    let splitTimelineSec = currentTime;
    if (audioEngine.getIsSnapToBeatEnabled()) {
      const snapped = audioEngine.snapTimeToNearestBeat(currentTime, 0.35);
      if (
        snapped >= targetClip.start + MIN_SHOT_DURATION_SEC &&
        snapped <= targetClip.start + targetClip.duration - MIN_SHOT_DURATION_SEC
      ) {
        splitTimelineSec = snapped;
      }
    }

    if (splitTimelineSec <= targetClip.start + 0.05 || splitTimelineSec >= targetClip.start + targetClip.duration - 0.05) return;

    pushUndo(clips);
    const splitPoint = Math.round((splitTimelineSec - targetClip.start) * 1000) / 1000;
    const part1Duration = splitPoint;
    const part2Duration = Math.round((targetClip.duration - splitPoint) * 1000) / 1000;
    const mult = targetClip.speed?.multiplier || 1;

    const part1: TimelineClip = {
      ...targetClip,
      duration: part1Duration,
      outPoint: targetClip.inPoint + part1Duration * mult
    };

    const part2: TimelineClip = {
      ...targetClip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${targetClip.name} (Part 2)`,
      start: splitTimelineSec,
      duration: part2Duration,
      inPoint: targetClip.inPoint + part1Duration * mult,
      outPoint: targetClip.outPoint
    };

    setClips(prev => prev.map(c => c.id === targetClip.id ? part1 : c).concat(part2));
    setSelectedClipId(part2.id);
    playheadTimeRef.current = splitTimelineSec;
    cutClock.emit({ timeSec: splitTimelineSec });
    setPlayheadTime(splitTimelineSec);
    audioEngine.playShutterClick();
  }, [selectedClip, activeMonitorV1Clip, clips, pushUndo]);

  const handleDuplicateClip = (clip: TimelineClip) => {
    pushUndo(clips);
    const newClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Copy)`,
      start: Number((clip.start + clip.duration).toFixed(3))
    };
    setClips(prev => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  };

  const handleDeleteClip = useCallback((clipId: string) => {
    pushUndo(clips);
    setClips(prev => prev.filter(c => c.id !== clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [clips, pushUndo, selectedClipId]);

  const handleRippleDelete = useCallback((clipId: string) => {
    pushUndo(clips);
    setClips(prev => rippleDeleteClip(prev, clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
    notify('Ripple deleted clip & closed gap');
  }, [clips, pushUndo, selectedClipId, notify]);

  const handleFreezeFrame = useCallback((clipId: string) => {
    pushUndo(clips);
    const res = freezeFrameAtPlayhead(clips, clipId, playheadTimeRef.current, 2.0);
    setClips(res.clips);
    if (res.freezeClipId) {
      setSelectedClipId(res.freezeClipId);
      notify('Inserted 2.0s Freeze Frame at playhead');
    }
  }, [clips, pushUndo, notify]);

  const handleDetachAudio = useCallback((clipId: string) => {
    pushUndo(clips);
    const res = detachAudioFromClip(clips, clipId);
    setClips(res.clips);
    if (res.audioClipId) {
      setSelectedClipId(res.audioClipId);
      notify('Extracted audio stream to track A1');
    } else {
      notify('Select a video clip with audio to extract', 2000);
    }
  }, [clips, pushUndo, notify]);

  const handleLoadAudioFile = useCallback((file: File) => {
    resumeVlcAudioContext();
    const url = URL.createObjectURL(file);
    audioEngine.loadAndAnalyzeAudioFile(file).catch(() => {});

    const tempAudio = new Audio(url);
    tempAudio.addEventListener(
      'loadedmetadata',
      () => {
        const dur = Number.isFinite(tempAudio.duration) && tempAudio.duration > 0.5 ? tempAudio.duration : 24;
        pushUndo(clips);
        const newClip: TimelineClip = {
          id: `clip-audio-file-${Date.now()}`,
          trackId: 'A2',
          name: file.name,
          type: 'audio',
          start: playheadTimeRef.current,
          duration: Number(dur.toFixed(2)),
          inPoint: 0,
          outPoint: Number(dur.toFixed(2)),
          url,
          posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
          crop: { top: 0, bottom: 0, left: 0, right: 0 },
          animation: { inType: 'none', outType: 'none', duration: 0 },
          adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
          speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
          audio: { volume: 100, fadeIn: 0.3, fadeOut: 0.5, noiseReduction: false }
        };
        setClips(prev => [...prev, newClip]);
        setSelectedClipId(newClip.id);
        notify(`Loaded audio track "${file.name}" onto A2`);
      },
      { once: true }
    );
  }, [clips, pushUndo, notify]);

  // Two-Way Sync: FROM BOARD
  const handleSyncFromBoard = () => {
    setSaveStatus('saving');
    pushUndo(clips);
    const newClips: TimelineClip[] = [];
    let currentTimelineTime = 0;

    project.shots.forEach((shot, idx) => {
      const duration = getShotDurationSec(shot, 3.0);
      const theme = baseThemesData[idx % baseThemesData.length];
      const vaultEntry = resolveShotMediaEntry(shotMediaMap, shot as any, undefined, idx);
      const imageUrl = vaultEntry?.url || shot.imageUrl || '';
      const isVid = vaultEntry ? vaultEntry.type === 'video' : Boolean(shot.isVideo);

      newClips.push({
        id: `clip-v1-${idx}-${Date.now()}`,
        trackId: 'V1',
        name: `Shot ${String(idx + 1).padStart(3, '0')}: ${shot.title || theme.title}`,
        type: isVid ? 'video' : 'image',
        start: currentTimelineTime,
        duration: duration,
        inPoint: 0,
        outPoint: duration,
        url: imageUrl,
        text: shot.title || theme.title,
        bengaliText: shot.bengaliTitle || theme.sub,
        shotIndex: idx,
        posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
        crop: { top: 0, bottom: 0, left: 0, right: 0 },
        animation: { inType: 'fade-in', outType: 'none', duration: 0.45 },
        adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 20, vignette: 15, grain: 10 },
        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
        audio: { volume: 100, fadeIn: 0.2, fadeOut: 0.2, noiseReduction: false }
      });

      currentTimelineTime += duration;
    });

    setClips(newClips);
    setSaveStatus('saved');
    notify(`Loaded ${project.shots.length} shots from Storyboard into Sequence!`, 3000);
  };

  // Two-Way Sync: TO BOARD
  const handleSyncToBoard = () => {
    setSaveStatus('saving');
    const v1Clips = clips.filter(c => c.trackId === 'V1').sort((a, b) => a.start - b.start);
    v1Clips.forEach((c, idx) => {
      updateShot(idx, {
        durationSeconds: c.duration,
        title: c.text,
        bengaliTitle: c.bengaliText,
        imageUrl: c.url,
        isVideo: c.type === 'video'
      });
      eventBus.emit('shot:updated', {
        index: idx,
        partial: {
          durationSec: c.duration,
          slideHoldSec: c.duration,
          title: c.text,
          bengaliTitle: c.bengaliText,
          imageUrl: c.url,
          isVideo: c.type === 'video'
        }
      });
    });
    setSaveStatus('saved');
    notify(`Synced ${v1Clips.length} variable-duration clips back to Storyboard!`, 3000);
  };

  // Keyboard Shortcuts in Cut View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === ' ') {
        e.preventDefault();
        resumeVlcAudioContext();
        setIsPlaying(p => !p);
      } else if (e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          if (e.shiftKey) handleRippleDelete(selectedClipId);
          else handleDeleteClip(selectedClipId);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayheadTime(t => Math.max(0, t - 1 / 24));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayheadTime(t => Math.min(totalDuration, t + 1 / 24));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, totalDuration, handleSplitAtPlayhead, handleRippleDelete, handleDeleteClip, handleUndo, handleRedo]);

  const updateSelectedClip = (partial: Partial<TimelineClip>) => {
    if (!selectedClipId) return;
    setClips(prev => prev.map(c => c.id === selectedClipId ? { ...c, ...partial } : c));
  };

  const applyFilterPreset = (preset: FilterLutPreset, applyAllV1: boolean) => {
    pushUndo(clips);
    setClips(prev =>
      prev.map(c => {
        const matches = applyAllV1 ? c.trackId === 'V1' : c.id === selectedClipId;
        if (!matches) return c;
        return {
          ...c,
          effectShader: preset.shader,
          adjustments: { ...preset.adjustments }
        };
      })
    );
    notify(`Applied "${preset.name}" ${applyAllV1 ? 'to all V1 shots' : 'to selected clip'}`);
  };

  const applySequenceTemplate = (tpl: SequenceTemplateSpec) => {
    pushUndo(clips);
    setAspectRatio(tpl.aspect);
    setClips(prev => {
      let cursor = 0;
      const nonV1 = prev.filter(c => c.trackId !== 'V1');
      const v1 = prev
        .filter(c => c.trackId === 'V1')
        .sort((a, b) => a.start - b.start)
        .map((c, idx) => {
          const nextClip: TimelineClip = {
            ...c,
            start: Number(cursor.toFixed(3)),
            duration: tpl.clipDurationSec,
            outPoint: c.inPoint + tpl.clipDurationSec,
            effectShader: tpl.shader,
            animation: { ...c.animation, inType: tpl.animIn },
            transition: idx > 0 ? { type: tpl.transitionType, duration: 0.45 } : undefined
          };
          cursor += tpl.clipDurationSec;
          return nextClip;
        });
      return [...v1, ...nonV1];
    });
    setPlayheadTime(0);
    notify(`Applied "${tpl.name}" template (${tpl.aspect})!`);
  };

  // Aspect ratio preview frame style
  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16:9': return 'aspect-[16/9] max-h-[46vh]';
      case '9:16': return 'aspect-[9/16] max-h-[46vh]';
      case '1:1': return 'aspect-square max-h-[46vh]';
      case '4:5': return 'aspect-[4/5] max-h-[46vh]';
      case '2.39:1': return 'aspect-[2.39/1] max-h-[46vh]';
      default: return 'aspect-[16/9] max-h-[46vh]';
    }
  };

  // Precompute active V1 & V2 visual states for rendering
  const v1Anim = activeMonitorV1Clip ? computeClipAnimationState(activeMonitorV1Clip, playheadTime) : null;
  const v1Trans = activeMonitorV1Clip ? computeClipTransitionState(activeMonitorV1Clip, playheadTime) : null;
  const v1ColorFx = activeMonitorV1Clip ? buildClipColorAndFx(activeMonitorV1Clip) : null;
  const v1MaskCrop = activeMonitorV1Clip ? buildClipMaskAndCropCss(activeMonitorV1Clip) : null;

  const v2Anim = activeMonitorV2Clip ? computeClipAnimationState(activeMonitorV2Clip, playheadTime) : null;
  const v2Trans = activeMonitorV2Clip ? computeClipTransitionState(activeMonitorV2Clip, playheadTime) : null;
  const v2ColorFx = activeMonitorV2Clip ? buildClipColorAndFx(activeMonitorV2Clip) : null;
  const v2MaskCrop = activeMonitorV2Clip ? buildClipMaskAndCropCss(activeMonitorV2Clip) : null;

  const t1Anim = activeMonitorT1Clip ? computeClipAnimationState(activeMonitorT1Clip, playheadTime) : null;

  const t1Clips = useMemo(
    () => clips.filter(c => c.trackId === 'T1').sort((a, b) => a.start - b.start),
    [clips]
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#050508] text-[#EDEDED] font-mono-tech select-none overflow-hidden">
      {/* 1. TOP BAR */}
      <header className="h-14 bg-[#08080C] border-b border-white/10 px-4 flex items-center justify-between gap-2 shrink-0 z-30 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="p-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-[2px] text-[#FFE066] shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#D4AF37] px-1 py-0.5 text-xs font-black tracking-wider uppercase text-white focus:outline-none max-w-[180px]"
          />
          <span className="px-2 py-0.5 rounded-[1px] bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-black tracking-wider text-emerald-400 whitespace-nowrap shrink-0">
            {saveStatus === 'saved' ? 'READY' : 'SYNCING'}
          </span>
        </div>

        {/* Center: Two-Way Sync & Undo/Redo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CinemaToolHUD
            title="IMPORT FROM BOARD"
            en="Load all storyboard shots and durations into timeline V1"
            bn="কীভাবে ব্যবহার করবেন: স্টোরিবোর্ড থেকে সব শট টাইমলাইনে আনতে চাপুন।"
            accent="cyan"
          >
            <button
              onClick={handleSyncFromBoard}
              className="cinema-tile cinema-tile-cyan px-2.5 py-1.5 min-h-[34px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">FROM BOARD</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="SYNC TO BOARD"
            en="Push timeline clip durations, order & media back to storyboard"
            bn="কীভাবে ব্যবহার করবেন: এডিট করা ক্লিপগুলো স্টোরিবোর্ডে সেভ করতে চাপুন।"
            accent="amber"
          >
            <button
              onClick={handleSyncToBoard}
              className="cinema-tile cinema-tile-amber px-2.5 py-1.5 min-h-[34px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] uppercase">TO BOARD</span>
            </button>
          </CinemaToolHUD>

          <div className="h-4 w-px bg-white/15 mx-0.5" />

          <CinemaToolHUD title="UNDO" en="Undo last timeline edit" bn="কীভাবে ব্যবহার করবেন: আগের ধাপে ফিরে যেতে চাপুন।" accent="amber" shortcut="Ctrl+Z">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`cinema-tile cinema-tile-amber p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center ${
                undoStack.length > 0 ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD title="REDO" en="Redo undone timeline edit" bn="কীভাবে ব্যবহার করবেন: বাতিল করা ধাপ ফেরাতে চাপুন।" accent="amber" shortcut="Ctrl+Shift+Z">
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`cinema-tile cinema-tile-amber p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center ${
                redoStack.length > 0 ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        </div>

        {/* Right: Aspect Ratio, Multi-Cam & Export */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenMultiCam && (
            <CinemaToolHUD
              title="MULTI-CAM GRID"
              en="Switch to synced multi-camera angle selector grid"
              bn="কীভাবে ব্যবহার করবেন: মাল্টি-ক্যাম অ্যাঙ্গেল গ্রিডে যেতে চাপুন।"
              accent="amber"
              shortcut="Shift+M"
            >
              <button
                type="button"
                onClick={onOpenMultiCam}
                className="cinema-tile cinema-tile-amber px-2.5 py-1.5 min-h-[34px] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="text-xs font-black">⊞</span>
                <span className="font-black tracking-wider text-[10px] uppercase">MULTI-CAM</span>
              </button>
            </CinemaToolHUD>
          )}

          <div className="flex items-center gap-1">
            {(['16:9', '9:16', '1:1', '4:5', '2.39:1'] as AspectRatio[]).map((ratio) => (
              <CinemaToolHUD
                key={ratio}
                title={`ASPECT ${ratio}`}
                en={`Set program monitor aspect ratio to ${ratio}`}
                bn={`কীভাবে ব্যবহার করবেন: ফ্রেমের অনুপাত ${ratio} সেট করতে চাপুন।`}
                accent="cyan"
              >
                <button
                  onClick={() => setAspectRatio(ratio)}
                  data-active={aspectRatio === ratio ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-cyan px-2 py-1 min-h-[30px] text-[9.5px] font-black tracking-wider cursor-pointer whitespace-nowrap"
                >
                  {ratio}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          <CinemaToolHUD
            title="EXPORT OTIO"
            en="Download OpenTimelineIO (.otio) sequence for DaVinci/Premiere"
            bn="কীভাবে ব্যবহার করবেন: .otio টাইমলাইন ফাইল এক্সপোর্ট করতে চাপুন।"
            accent="emerald"
          >
            <button
              onClick={() => {
                triggerFileDownload(exportToOTIO(anthologyProject), `${projectName.replace(/\s+/g, '_')}.otio`, 'application/json');
                notify('Exported .OTIO', 3000);
              }}
              className="cinema-tile cinema-tile-emerald px-3 py-1.5 min-h-[34px] font-black tracking-wider text-[10px] uppercase flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>EXPORT OTIO</span>
            </button>
          </CinemaToolHUD>
        </div>
      </header>

      {/* Notification Toast */}
      {exportNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 bg-[#0C0D12] border border-[#D4AF37] text-[#FFE066] text-xs font-black tracking-wider uppercase rounded shadow-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-[#D4AF37]" />
          <span>{exportNotification}</span>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Leftmost Icon Strip */}
        <div className="w-16 bg-[#08080C] border-r border-white/10 flex flex-col items-center py-2 gap-1.5 shrink-0 z-20 overflow-y-auto no-scrollbar px-1">
          {[
            { id: 'media', label: 'MEDIA', icon: Film, en: 'Ingest video/image plates & procedural backdrops', bn: 'কীভাবে ব্যবহার করবেন: ভিডিও বা ছবি টাইমলাইনে যোগ করতে চাপুন।' },
            { id: 'audio', label: 'AUDIO', icon: Music, en: 'Cinema sound effects & MP3/WAV music import', bn: 'কীভাবে ব্যবহার করবেন: সাউন্ড এফএক্স বা MP3 অডিও যোগ করতে চাপুন।' },
            { id: 'text', label: 'TEXT', icon: Type, en: 'Insert bilingual kinetic title clips onto T1', bn: 'কীভাবে ব্যবহার করবেন: টাইটেল ও টেক্সট ক্লিপ যোগ করতে চাপুন।' },
            { id: 'stickers', label: 'PIP / FX', icon: Sticker, en: 'Overlay stickers & Picture-in-Picture media on V2', bn: 'কীভাবে ব্যবহার করবেন: ওভারলে স্টিকার বা PiP ভিডিও যোগ করতে চাপুন।' },
            { id: 'effects', label: 'SHADERS', icon: Sparkles, en: 'Apply lens, retro, glitch & film shader FX', bn: 'কীভাবে ব্যবহার করবেন: ক্লিপ সিলেক্ট করে শেডার ইফেক্ট বসাতে চাপুন।' },
            { id: 'transitions', label: 'CUT FX', icon: SplitSquareVertical, en: 'Attach dissolve, whip-pan & flash transitions', bn: 'কীভাবে ব্যবহার করবেন: ক্লিপের শুরুতে ট্রানজিশন বসাতে চাপুন।' },
            { id: 'captions', label: 'CAPTIONS', icon: Radio, en: 'Auto-generate bilingual T1 captions & .SRT export', bn: 'কীভাবে ব্যবহার করবেন: অটো ক্যাপশন তৈরি ও .SRT ডাউনলোড করতে চাপুন।' },
            { id: 'filters', label: 'LUTS', icon: Sliders, en: 'Apply cinema grading LUT presets to clip or V1', bn: 'কীভাবে ব্যবহার করবেন: কালার গ্রেডিং LUT বসাতে চাপুন।' },
            { id: 'templates', label: 'PRESETS', icon: Wand2, en: '1-tap trailer, Reels & anamorphic sequence templates', bn: 'কীভাবে ব্যবহার করবেন: এক ক্লিকে পুরো সিকোয়েন্স টেমপ্লেট বসাতে চাপুন।' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <CinemaToolHUD key={item.id} title={item.label} en={item.en} bn={item.bn} accent="amber" side="right" blockWrapper>
                <button
                  onClick={() => setActivePanel(item.id as typeof activePanel)}
                  data-active={isActive ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber w-full py-2 min-h-[44px] flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Icon className="w-4 h-4" strokeWidth={2.2} />
                  <span className="font-black tracking-wider text-[8px] uppercase">{item.label}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {/* Left Expandable Panel Content */}
        <div className="w-64 bg-[#0a0a0f] border-r border-white/10 flex flex-col p-3 text-xs overflow-y-auto no-scrollbar shrink-0">
          {activePanel === 'media' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <CinemaBadgeHeader icon={<Film className="w-3.5 h-3.5" />} label="MEDIA" accent="amber" />
                <CinemaToolHUD
                  title="ADD MEDIA"
                  en="Import video or image files onto V1 at the playhead"
                  bn="কীভাবে ব্যবহার করবেন: প্লেহেডে নতুন ভিডিও বা ছবি যোগ করতে চাপুন।"
                  accent="amber"
                >
                  <label className="cinema-tile cinema-tile-amber px-2.5 py-1 cursor-pointer flex items-center gap-1 text-[10px] font-black tracking-wider uppercase">
                    <Upload className="w-3 h-3" />
                    <span>+ ADD</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.mp4,.webm,.mov"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      pushUndo(clips);
                      let insertAt = playheadTimeRef.current;
                      const added: TimelineClip[] = [];
                      files.forEach((file, idx) => {
                        const url = URL.createObjectURL(file);
                        const isVid = file.type.startsWith('video') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
                        const dur = 3.5;
                        added.push({
                          id: `clip-custom-${Date.now()}-${idx}`,
                          trackId: 'V1',
                          name: file.name,
                          type: isVid ? 'video' : 'image',
                          start: Number(insertAt.toFixed(3)),
                          duration: dur,
                          inPoint: 0,
                          outPoint: dur,
                          url,
                          posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
                          crop: { top: 0, bottom: 0, left: 0, right: 0 },
                          animation: { inType: 'fade-in', outType: 'none', duration: 0.4 },
                          adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 20, vignette: 10, grain: 10 },
                          speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                          audio: { volume: 100, fadeIn: 0.15, fadeOut: 0.15, noiseReduction: false }
                        });
                        insertAt += dur;
                      });
                      setClips(prev => [...prev, ...added]);
                      if (added[0]) setSelectedClipId(added[0].id);
                      notify(`Added ${added.length} media clip(s) at playhead`);
                      e.target.value = '';
                    }}
                  />
                </label>
                </CinemaToolHUD>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PROCEDURAL_PALETTES.slice(0, 8).map((pal, i) => (
                  <div
                    key={pal.id}
                    onClick={() => {
                      const newClip: TimelineClip = {
                        id: `clip-proc-${Date.now()}-${i}`,
                        trackId: 'V1',
                        name: `${pal.name}`,
                        type: 'image',
                        start: Number(playheadTimeRef.current.toFixed(3)),
                        duration: 3.0,
                        inPoint: 0,
                        outPoint: 3.0,
                        url: '',
                        shotIndex: i * 10,
                        posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
                        crop: { top: 0, bottom: 0, left: 0, right: 0 },
                        animation: { inType: 'fade-in', outType: 'none', duration: 0.45 },
                        adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 20, vignette: 10, grain: 10 },
                        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                        audio: { volume: 100, fadeIn: 0.2, fadeOut: 0.2, noiseReduction: false }
                      };
                      pushUndo(clips);
                      setClips(prev => [...prev, newClip]);
                      setSelectedClipId(newClip.id);
                    }}
                    className="group relative aspect-video bg-black rounded border border-white/10 hover:border-[#D4AF37] overflow-hidden cursor-pointer flex items-end p-1.5"
                    style={{ background: pal.thumbCssBackdrop }}
                  >
                    <span className="font-mono text-[8px] text-white/90 font-bold tracking-wider truncate drop-shadow">
                      {pal.name}
                    </span>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Plus className="w-4 h-4 text-[#FFE066]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'audio' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Music className="w-3.5 h-3.5" />} label="AUDIO FX" accent="emerald" />
                <CinemaToolHUD
                  title="IMPORT AUDIO"
                  en="Import local MP3, WAV, AAC or FLAC audio onto track A2"
                  bn="কীভাবে ব্যবহার করবেন: ডিভাইস থেকে MP3 বা WAV অডিও যোগ করতে চাপুন।"
                  accent="emerald"
                >
                  <label className="cinema-tile cinema-tile-emerald px-2 py-1 cursor-pointer text-[9.5px] font-black tracking-wider uppercase">
                    + AUDIO
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.aac,.ogg,.flac"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLoadAudioFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </CinemaToolHUD>
              </div>
              {[
                { name: '43.6Hz Sub Drone', dur: 15, tag: 'Binaural' },
                { name: 'Pacemaker Heartbeat', dur: 10, tag: 'Pulse' },
                { name: 'Cosmic Resonance', dur: 8, tag: 'Atmosphere' },
                { name: 'Anamorphic Swell', dur: 4, tag: 'Riser' },
                { name: '35mm Shutter Click', dur: 0.5, tag: 'Mechanical' },
                { name: 'Sub Boom Impact', dur: 2.5, tag: 'Impact' }
              ].map((fx, i) => (
                <div
                  key={i}
                  onClick={() => {
                    audioEngine.playFrameImpact(0.8);
                    const newClip: TimelineClip = {
                      id: `clip-audio-${Date.now()}-${i}`,
                      trackId: 'A1',
                      name: fx.name,
                      type: 'audio',
                      start: Number(playheadTimeRef.current.toFixed(3)),
                      duration: fx.dur,
                      inPoint: 0,
                      outPoint: fx.dur,
                      posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
                      crop: { top: 0, bottom: 0, left: 0, right: 0 },
                      animation: { inType: 'none', outType: 'none', duration: 0 },
                      adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
                      speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                      audio: { volume: 80, fadeIn: 0.2, fadeOut: 0.4, noiseReduction: false }
                    };
                    pushUndo(clips);
                    setClips(prev => [...prev, newClip]);
                    setSelectedClipId(newClip.id);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="text-white font-bold group-hover:text-[#FFE066]">{fx.name}</div>
                    <div className="text-[9px] text-white/40 tabular-nums">{fx.dur}s // {fx.tag}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                </div>
              ))}
            </div>
          )}

          {activePanel === 'text' && (
            <div className="flex flex-col gap-2">
              <div className="border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Type className="w-3.5 h-3.5" />} label="TITLE CLIPS" accent="amber" />
              </div>
              {[
                { en: 'THE SINGULARITY', bn: 'দ্য সিঙ্গুলারিটি' },
                { en: 'EVENT HORIZON', bn: 'ইভেন্ট হরাইজন' },
                { en: 'DHAKA CYBER NOIR', bn: 'ঢাকা সাইবার নয়্যার' },
                { en: 'DIRECTOR CUT 2026', bn: 'পরিচালকীয় সংস্করণ' }
              ].map((t, i) => (
                <CinemaToolHUD
                  key={i}
                  title={t.en}
                  en="Insert bilingual title clip onto T1 at playhead"
                  bn="কীভাবে ব্যবহার করবেন: টাইমলাইনের T1 ট্র্যাকে টাইটেল যোগ করতে চাপুন।"
                  accent="amber"
                  blockWrapper
                >
                  <div
                    onClick={() => {
                      const newClip: TimelineClip = {
                        id: `clip-text-${Date.now()}-${i}`,
                        trackId: 'T1',
                        name: `Title: ${t.en}`,
                        type: 'text',
                        start: Number(playheadTimeRef.current.toFixed(3)),
                        duration: 3.0,
                        inPoint: 0,
                        outPoint: 3.0,
                        text: t.en,
                        bengaliText: t.bn,
                        posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'none',
                        crop: { top: 0, bottom: 0, left: 0, right: 0 },
                        animation: { inType: 'zoom-in', outType: 'fade-out', duration: 0.4 },
                        adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
                        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                        audio: { volume: 0, fadeIn: 0, fadeOut: 0, noiseReduction: false }
                      };
                      pushUndo(clips);
                      setClips(prev => [...prev, newClip]);
                      setSelectedClipId(newClip.id);
                    }}
                    className="cinema-tile cinema-tile-amber w-full p-2 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="font-black text-[10px] tracking-wider uppercase">{t.en}</div>
                    <div className="text-[10px] text-white/70 font-serif">{t.bn}</div>
                  </div>
                </CinemaToolHUD>
              ))}
            </div>
          )}

          {activePanel === 'stickers' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Sticker className="w-3.5 h-3.5" />} label="PIP / V2" accent="cyan" />
                <CinemaToolHUD
                  title="ADD PIP LAYER"
                  en="Overlay an image or video Picture-in-Picture on track V2"
                  bn="কীভাবে ব্যবহার করবেন: V2 ট্র্যাকে PiP ছবি বা ভিডিও যোগ করতে চাপুন।"
                  accent="cyan"
                >
                  <label className="cinema-tile cinema-tile-cyan px-2 py-1 cursor-pointer text-[9.5px] font-black tracking-wider uppercase">
                    + PIP
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      const isVid = file.type.startsWith('video');
                      const newClip: TimelineClip = {
                        id: `clip-v2-pip-${Date.now()}`,
                        trackId: 'V2',
                        name: `PiP: ${file.name}`,
                        type: isVid ? 'video' : 'image',
                        start: Number(playheadTimeRef.current.toFixed(3)),
                        duration: 4.0,
                        inPoint: 0,
                        outPoint: 4.0,
                        url,
                        posX: 22, posY: -18, scale: 42, rotation: 0, opacity: 100, blendMode: 'normal', mask: 'rectangle',
                        crop: { top: 0, bottom: 0, left: 0, right: 0 },
                        animation: { inType: 'zoom-in', outType: 'fade-out', duration: 0.3 },
                        adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 10, vignette: 0, grain: 0 },
                        speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                        audio: { volume: 60, fadeIn: 0.1, fadeOut: 0.1, noiseReduction: false }
                      };
                      pushUndo(clips);
                      setClips(prev => [...prev, newClip]);
                      setSelectedClipId(newClip.id);
                      e.target.value = '';
                    }}
                  />
                  </label>
                </CinemaToolHUD>
              </div>
              {[
                { name: '4-Corner Reticles', icon: '⛶' },
                { name: 'REC 4K Red Indicator', icon: '● REC 4K' },
                { name: 'SMPTE Timecode Stamp', icon: '00:24:00 FPS' },
                { name: 'Anamorphic Blue Streak', icon: '✦ FLARE' },
                { name: '35mm Gate Frame', icon: '▣ 35MM GATE' }
              ].map((st, i) => (
                <div
                  key={i}
                  onClick={() => {
                    const newClip: TimelineClip = {
                      id: `clip-sticker-${Date.now()}-${i}`,
                      trackId: 'V2',
                      name: st.name,
                      type: 'sticker',
                      start: Number(playheadTimeRef.current.toFixed(3)),
                      duration: 4.0,
                      inPoint: 0,
                      outPoint: 4.0,
                      text: st.icon,
                      posX: 0, posY: 0, scale: 100, rotation: 0, opacity: 90, blendMode: 'screen', mask: 'none',
                      crop: { top: 0, bottom: 0, left: 0, right: 0 },
                      animation: { inType: 'fade-in', outType: 'none', duration: 0.3 },
                      adjustments: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, shadows: 0, highlights: 0, sharpen: 0, vignette: 0, grain: 0 },
                      speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
                      audio: { volume: 0, fadeIn: 0, fadeOut: 0, noiseReduction: false }
                    };
                    pushUndo(clips);
                    setClips(prev => [...prev, newClip]);
                    setSelectedClipId(newClip.id);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded flex items-center justify-between cursor-pointer"
                >
                  <span className="text-white font-bold">{st.name}</span>
                  <span className="text-[10px] text-[#FFE066]">{st.icon}</span>
                </div>
              ))}
            </div>
          )}

          {activePanel === 'effects' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="SHADERS" accent="amber" />
                {selectedClip?.effectShader && (
                  <CinemaToolHUD title="CLEAR FX" en="Remove shader effect from selected clip" bn="কীভাবে ব্যবহার করবেন: ক্লিপের শেডার ইফেক্ট সরাতে চাপুন।" accent="crimson">
                    <button
                      onClick={() => updateSelectedClip({ effectShader: undefined })}
                      className="cinema-tile cinema-tile-crimson px-2 py-0.5 text-[9px] font-black uppercase cursor-pointer"
                    >
                      CLEAR
                    </button>
                  </CinemaToolHUD>
                )}
              </div>
              {!selectedClipId && (
                <div className="px-2 py-1.5 rounded border border-amber-500/25 bg-amber-950/20 text-[9.5px] font-black tracking-wider uppercase text-amber-300 text-center">
                  SELECT CLIP
                </div>
              )}
              {[
                { cat: 'LENS', list: ['Orton Bloom', 'Gaussian Blur', 'Anamorphic Flare', 'Chromatic Aberration'] },
                { cat: 'RETRO', list: ['VHS Glitch', 'CRT Scanlines', '35mm Vintage', 'Halation'] },
                { cat: 'GLITCH', list: ['RGB Split', 'Digital Noise', 'Interlace Tear'] },
                { cat: 'CINEMA', list: ['Noir Silver', 'Bleach Bypass', 'Teal & Orange', 'Kodachrome', 'Golden Haze'] }
              ].map(group => (
                <div key={group.cat} className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#D4AF37] font-black tracking-wider uppercase">{group.cat}</span>
                  <div className="grid grid-cols-1 gap-1">
                    {group.list.map(eff => {
                      const active = selectedClip?.effectShader === eff;
                      return (
                        <CinemaToolHUD
                          key={eff}
                          title={eff.toUpperCase()}
                          en={`Toggle ${eff} shader on selected timeline clip`}
                          bn={`কীভাবে ব্যবহার করবেন: সিলেক্ট করা ক্লিপে ${eff} ইফেক্ট দিতে চাপুন।`}
                          accent="amber"
                          blockWrapper
                        >
                          <button
                            onClick={() => {
                              if (selectedClipId) {
                                pushUndo(clips);
                                updateSelectedClip({ effectShader: active ? undefined : eff });
                                notify(active ? `Removed ${eff}` : `Applied ${eff}`);
                              }
                            }}
                            data-active={active ? 'true' : 'false'}
                            className="cinema-tile cinema-tile-amber w-full px-2.5 py-1.5 text-left text-[10px] font-black tracking-wider uppercase truncate cursor-pointer"
                          >
                            {eff}
                          </button>
                        </CinemaToolHUD>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePanel === 'transitions' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<SplitSquareVertical className="w-3.5 h-3.5" />} label="CUT FX" accent="cyan" />
                {selectedClip?.transition && (
                  <CinemaToolHUD title="REMOVE CUT FX" en="Remove incoming transition from clip" bn="কীভাবে ব্যবহার করবেন: ট্রানজিশন মুছতে চাপুন।" accent="crimson">
                    <button
                      onClick={() => updateSelectedClip({ transition: undefined })}
                      className="cinema-tile cinema-tile-crimson px-2 py-0.5 text-[9px] font-black uppercase cursor-pointer"
                    >
                      REMOVE
                    </button>
                  </CinemaToolHUD>
                )}
              </div>
              {!selectedClipId && (
                <div className="px-2 py-1.5 rounded border border-amber-500/25 bg-amber-950/20 text-[9.5px] font-black tracking-wider uppercase text-amber-300 text-center">
                  SELECT CLIP
                </div>
              )}
              {[
                { name: 'DISSOLVE', type: 'dissolve', en: 'Crossfade optical dissolve transition' },
                { name: 'DIP BLACK', type: 'dip-black', en: 'Brief dip to cinema black between cuts' },
                { name: 'GOLD FLASH', type: 'gold-flash', en: 'Warm 35mm film burn flash' },
                { name: 'WHIP PAN', type: 'whip-pan', en: 'High-velocity horizontal camera whip pan' },
                { name: 'ZOOM CUT', type: 'zoom', en: 'Dynamic optical push-in transition' },
                { name: 'GLITCH SLICE', type: 'glitch', en: 'Cyberpunk digital tear transition' }
              ].map((tr, i) => {
                const active = selectedClip?.transition?.type === tr.type;
                return (
                  <CinemaToolHUD
                    key={i}
                    title={tr.name}
                    en={tr.en}
                    bn={`কীভাবে ব্যবহার করবেন: ক্লিপ সিলেক্ট করে ${tr.name} ট্রানজিশন বসাতে চাপুন।`}
                    accent="cyan"
                    blockWrapper
                  >
                    <button
                      onClick={() => {
                        if (selectedClipId) {
                          pushUndo(clips);
                          updateSelectedClip({ transition: active ? undefined : { type: tr.type as any, duration: 0.6 } });
                          notify(active ? 'Removed transition' : `Applied ${tr.name}`);
                        }
                      }}
                      data-active={active ? 'true' : 'false'}
                      className="cinema-tile cinema-tile-cyan w-full p-2 min-h-[38px] text-left font-black tracking-wider text-[10px] uppercase cursor-pointer"
                    >
                      {tr.name}
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </div>
          )}

          {activePanel === 'captions' && (
            <div className="flex flex-col gap-2.5">
              <div className="border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Radio className="w-3.5 h-3.5" />} label="CAPTIONS" accent="amber" />
              </div>
              <CinemaToolHUD
                title="AUTO CAPTIONS"
                en="Generate timed bilingual T1 caption clips from V1 shots"
                bn="কীভাবে ব্যবহার করবেন: V1 শট থেকে স্বয়ংক্রিয় বাংলা/ইংরেজি ক্যাপশন তৈরি করতে চাপুন।"
                accent="amber"
                blockWrapper
              >
                <button
                  onClick={() => {
                    pushUndo(clips);
                    const generated = generateCaptionClipsFromV1(clips, project.shots);
                    setClips(prev => [...prev.filter(c => !c.id.startsWith('t1-cap-')), ...generated]);
                    notify(`Generated ${generated.length} captions`);
                  }}
                  className="cinema-tile cinema-tile-amber w-full py-2 min-h-[38px] font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  AUTO CAP
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="EXPORT .SRT"
                en="Download timed bilingual subtitles as .SRT"
                bn="কীভাবে ব্যবহার করবেন: সাবটাইটেল ফাইল .SRT হিসেবে ডাউনলোড করতে চাপুন।"
                accent="cyan"
                blockWrapper
              >
                <button
                  onClick={() => {
                    const srt = generateSrtFromClips(clips);
                    triggerFileDownload(srt, `${projectName.replace(/\s+/g, '_')}.srt`, 'text/plain');
                    notify('Exported .SRT!');
                  }}
                  className="cinema-tile cinema-tile-cyan w-full py-2 min-h-[38px] font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  EXPORT .SRT
                </button>
              </CinemaToolHUD>
              <div className="flex flex-col gap-1.5 mt-1">
                {t1Clips.map(tc => (
                  <div
                    key={tc.id}
                    onClick={() => {
                      setSelectedClipId(tc.id);
                      setPlayheadTime(tc.start);
                    }}
                    className={`p-2 rounded border cursor-pointer ${
                      selectedClipId === tc.id ? 'border-[#D4AF37] bg-[#D4AF37]/15' : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <div className="text-[9px] text-[#FFE066] font-black tabular-nums">
                      {tc.start.toFixed(1)}s → {(tc.start + tc.duration).toFixed(1)}s
                    </div>
                    <input
                      type="text"
                      value={tc.text || ''}
                      onChange={(e) => setClips(prev => prev.map(c => c.id === tc.id ? { ...c, text: e.target.value } : c))}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="English..."
                      className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-white mt-1"
                    />
                    <input
                      type="text"
                      value={tc.bengaliText || ''}
                      onChange={(e) => setClips(prev => prev.map(c => c.id === tc.id ? { ...c, bengaliText: e.target.value } : c))}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="বাংলা..."
                      className="w-full bg-black/60 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-white/80 mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'filters' && (
            <div className="flex flex-col gap-2">
              <div className="border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Sliders className="w-3.5 h-3.5" />} label="COLOR LUTS" accent="amber" />
              </div>
              {FILTER_LUT_PRESETS.map(preset => (
                <div key={preset.id} className="p-2 rounded border border-white/10 bg-white/5 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-4 rounded-sm bg-gradient-to-r ${preset.swatch} border border-white/20 shrink-0`} />
                    <span className="font-black tracking-wider text-[10px] uppercase text-white truncate">{preset.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <CinemaToolHUD
                      title={`APPLY ${preset.name}`}
                      en="Apply this LUT grade to selected clip only"
                      bn="কীভাবে ব্যবহার করবেন: শুধু সিলেক্ট করা ক্লিপে কালার গ্রেড দিতে চাপুন।"
                      accent="amber"
                      blockWrapper
                    >
                      <button
                        disabled={!selectedClipId}
                        onClick={() => applyFilterPreset(preset, false)}
                        className={`cinema-tile cinema-tile-amber w-full py-1.5 text-[9.5px] font-black tracking-wider uppercase ${
                          selectedClipId ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'
                        }`}
                      >
                        CLIP
                      </button>
                    </CinemaToolHUD>
                    <CinemaToolHUD
                      title={`SYNC ${preset.name}`}
                      en="Apply this LUT grade across all V1 clips"
                      bn="কীভাবে ব্যবহার করবেন: সব V1 ক্লিপে একসাথে কালার গ্রেড দিতে চাপুন।"
                      accent="cyan"
                      blockWrapper
                    >
                      <button
                        onClick={() => applyFilterPreset(preset, true)}
                        className="cinema-tile cinema-tile-cyan w-full py-1.5 text-[9.5px] font-black tracking-wider uppercase cursor-pointer"
                      >
                        ALL V1
                      </button>
                    </CinemaToolHUD>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activePanel === 'templates' && (
            <div className="flex flex-col gap-2">
              <div className="border-b border-white/10 pb-1.5">
                <CinemaBadgeHeader icon={<Wand2 className="w-3.5 h-3.5" />} label="TEMPLATES" accent="amber" />
              </div>
              {SEQUENCE_TEMPLATES.map(tpl => (
                <CinemaToolHUD
                  key={tpl.id}
                  title={tpl.name.toUpperCase()}
                  en={tpl.desc}
                  bn="কীভাবে ব্যবহার করবেন: এই অটো কাটিং ও কালার টেমপ্লেট পুরো টাইমলাইনে বসাতে চাপুন।"
                  accent="amber"
                  blockWrapper
                >
                  <button
                    onClick={() => applySequenceTemplate(tpl)}
                    className="cinema-tile cinema-tile-amber w-full p-2.5 min-h-[48px] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="font-black tracking-wider text-[10px] uppercase truncate">{tpl.name}</span>
                    <span className="text-[8.5px] px-1.5 py-0.5 bg-black/60 border border-white/15 rounded font-black shrink-0">{tpl.aspect}</span>
                  </button>
                </CinemaToolHUD>
              ))}
            </div>
          )}
        </div>

        {/* Center: Program Monitor Viewport */}
        <div className="flex-1 flex flex-col bg-[#050508] p-3 overflow-hidden min-w-0">
          <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-radial from-[#0e0e14] to-[#040406] border border-white/10 rounded-[2px] shadow-2xl min-h-0">
            <div
              ref={monitorContainerRef}
              onClick={() => {
                if (activeMonitorV1Clip) setSelectedClipId(activeMonitorV1Clip.id);
              }}
              className={`relative ${getAspectClass()} w-full max-w-full bg-black rounded-[2px] overflow-hidden border border-[#D4AF37]/30 shadow-2xl flex items-center justify-center`}
            >
              {/* Active Base Layer (V1) */}
              {activeMonitorV1Clip && v1Anim && v1Trans && v1ColorFx && v1MaskCrop ? (
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: `translate(${activeMonitorV1Clip.posX + v1Anim.translateXPercent + v1Trans.extraTranslateXPercent + v1Trans.glitchOffsetPx}%, ${activeMonitorV1Clip.posY + v1Anim.translateYPercent}%) scale(${(activeMonitorV1Clip.scale / 100) * v1Anim.scaleMultiplier * v1Trans.extraScale}) rotate(${activeMonitorV1Clip.rotation}deg)`,
                    opacity: Math.max(0, Math.min(1, (activeMonitorV1Clip.opacity / 100) * v1Anim.opacityMultiplier * v1Trans.opacityMultiplier)),
                    mixBlendMode: activeMonitorV1Clip.blendMode,
                    clipPath: v1Anim.clipPath || v1MaskCrop.clipPath,
                    filter: v1ColorFx.filterCss,
                    boxShadow: v1ColorFx.rgbSplitPx > 0 ? `${v1ColorFx.rgbSplitPx}px 0 0 rgba(255,0,90,0.45), -${v1ColorFx.rgbSplitPx}px 0 0 rgba(0,220,255,0.45)` : undefined
                  }}
                >
                  {activeMonitorV1Clip.type === 'video' && activeMonitorV1Clip.url ? (
                    <video
                      ref={v1VideoRef}
                      src={activeMonitorV1Clip.url}
                      playsInline
                      preload="auto"
                      onLoadedMetadata={() => syncVideoElement(v1VideoRef.current, activeMonitorV1Clip)}
                      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                      className="w-full h-full object-cover"
                    />
                  ) : activeMonitorV1Clip.url ? (
                    <img
                      src={activeMonitorV1Clip.url}
                      alt={activeMonitorV1Clip.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: getShotProceduralSpec(activeMonitorV1Clip.shotIndex ?? 0).palette.cssBackdrop
                      }}
                    >
                      <span className="font-mono text-xs text-white/70 px-3 py-1 bg-black/50 border border-white/15 rounded">
                        {activeMonitorV1Clip.name}
                      </span>
                    </div>
                  )}

                  {/* Color Temperature Tint */}
                  {v1ColorFx.warmthOverlayColor && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundColor: v1ColorFx.warmthOverlayColor,
                        opacity: v1ColorFx.warmthOverlayOpacity,
                        mixBlendMode: 'color'
                      }}
                    />
                  )}

                  {/* Shader FX Overlay Class */}
                  {v1ColorFx.shaderOverlayClass && (
                    <div className={`absolute inset-0 pointer-events-none ${v1ColorFx.shaderOverlayClass}`} />
                  )}

                  {/* Vignette Overlay */}
                  {v1ColorFx.vignetteOpacity > 0.01 && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle, transparent 48%, rgba(0,0,0,${v1ColorFx.vignetteOpacity.toFixed(2)}) 100%)`
                      }}
                    />
                  )}

                  {/* 35mm Grain Texture Overlay */}
                  {v1ColorFx.grainOpacity > 0.01 && (
                    <div
                      className="absolute inset-0 pointer-events-none opacity-40"
                      style={{
                        opacity: v1ColorFx.grainOpacity,
                        backgroundImage: 'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.14) 0, rgba(0,0,0,0.08) 1px, transparent 2px)'
                      }}
                    />
                  )}

                  {/* Transition Head Flash / Dip Overlay */}
                  {v1Trans.active && v1Trans.overlayColor && v1Trans.overlayOpacity > 0.01 && (
                    <div
                      className="absolute inset-0 pointer-events-none z-10"
                      style={{
                        backgroundColor: v1Trans.overlayColor,
                        opacity: v1Trans.overlayOpacity
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center font-mono-tech text-white/30 text-xs tabular-nums">
                  {trackStates.V1?.hidden
                    ? 'TRACK V1 HIDDEN'
                    : `NO ACTIVE V1 MEDIA AT ${formatTC(playheadTime)}`}
                </div>
              )}

              {/* Active Overlay / PiP / Sticker Layer (V2) */}
              {activeMonitorV2Clip && v2Anim && v2Trans && v2ColorFx && v2MaskCrop && (
                <div
                  onPointerDown={(e) => startMonitorTransform(e, activeMonitorV2Clip, 'move')}
                  className="absolute inset-0 flex items-center justify-center z-10 cursor-move"
                  style={{
                    transform: `translate(${activeMonitorV2Clip.posX + v2Anim.translateXPercent + v2Trans.extraTranslateXPercent}%, ${activeMonitorV2Clip.posY + v2Anim.translateYPercent}%) scale(${(activeMonitorV2Clip.scale / 100) * v2Anim.scaleMultiplier * v2Trans.extraScale}) rotate(${activeMonitorV2Clip.rotation}deg)`,
                    opacity: Math.max(0, Math.min(1, (activeMonitorV2Clip.opacity / 100) * v2Anim.opacityMultiplier * v2Trans.opacityMultiplier)),
                    mixBlendMode: activeMonitorV2Clip.blendMode,
                    clipPath: v2Anim.clipPath || v2MaskCrop.clipPath,
                    filter: v2ColorFx.filterCss
                  }}
                >
                  {activeMonitorV2Clip.type === 'video' && activeMonitorV2Clip.url ? (
                    <video
                      ref={v2VideoRef}
                      src={activeMonitorV2Clip.url}
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={() => syncVideoElement(v2VideoRef.current, activeMonitorV2Clip)}
                      style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                      className="w-full h-full object-cover rounded shadow-2xl border border-cyan-400/30"
                    />
                  ) : activeMonitorV2Clip.url ? (
                    <img
                      src={activeMonitorV2Clip.url}
                      alt={activeMonitorV2Clip.name}
                      className="w-full h-full object-cover rounded shadow-2xl border border-cyan-400/30"
                    />
                  ) : (
                    <span className="font-mono-tech text-xl sm:text-2xl text-[#FFE066] font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] px-3 py-1 bg-black/45 border border-[#FFE066]/40 rounded">
                      {activeMonitorV2Clip.text || activeMonitorV2Clip.name}
                    </span>
                  )}
                </div>
              )}

              {/* Active Title / Text Layer (T1) — uses activeMonitorT1Clip.posY */}
              {activeMonitorT1Clip && t1Anim && (
                <div
                  onPointerDown={(e) => startMonitorTransform(e, activeMonitorT1Clip, 'move')}
                  className="absolute inset-x-4 bottom-8 flex flex-col items-center justify-center text-center z-20 cursor-move"
                  style={{
                    transform: `translate(${activeMonitorT1Clip.posX + t1Anim.translateXPercent}%, ${activeMonitorT1Clip.posY + t1Anim.translateYPercent}%) scale(${(activeMonitorT1Clip.scale / 100) * t1Anim.scaleMultiplier}) rotate(${activeMonitorT1Clip.rotation}deg)`,
                    opacity: Math.max(0, Math.min(1, (activeMonitorT1Clip.opacity / 100) * t1Anim.opacityMultiplier)),
                    mixBlendMode: activeMonitorT1Clip.blendMode
                  }}
                >
                  <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-[#FFE066] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    {activeMonitorT1Clip.text}
                  </h1>
                  {activeMonitorT1Clip.bengaliText && (
                    <h2 className="font-bengali text-base sm:text-lg font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] mt-0.5">
                      {activeMonitorT1Clip.bengaliText}
                    </h2>
                  )}
                </div>
              )}

              {/* Interactive Bounding Box & Scale Handles on Selected V1 / V2 / T1 Clip */}
              {selectedClip &&
                (selectedClip.trackId === 'V1' || selectedClip.trackId === 'V2' || selectedClip.trackId === 'T1') &&
                playheadTime >= selectedClip.start &&
                playheadTime <= selectedClip.start + selectedClip.duration && (
                  <div
                    onPointerDown={(e) => startMonitorTransform(e, selectedClip, 'move')}
                    className="absolute inset-0 border-2 border-[#D4AF37]/80 z-30 cursor-move"
                    style={{
                      transform: `translate(${selectedClip.posX}%, ${selectedClip.posY}%) scale(${selectedClip.scale / 100}) rotate(${selectedClip.rotation}deg)`
                    }}
                  >
                    {isTransformDragging && (
                      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/85 border border-[#D4AF37] text-[#FFE066] text-[9px] font-bold rounded tabular-nums pointer-events-none">
                        X:{selectedClip.posX}% Y:{selectedClip.posY}% · {selectedClip.scale}%
                      </div>
                    )}
                    <div
                      onPointerDown={(e) => startMonitorTransform(e, selectedClip, 'scale')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-[#FFE066] border border-black cursor-nwse-resize"
                      title="Drag corner to scale"
                    />
                    <div
                      onPointerDown={(e) => startMonitorTransform(e, selectedClip, 'scale')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#FFE066] border border-black cursor-nesw-resize"
                      title="Drag corner to scale"
                    />
                    <div
                      onPointerDown={(e) => startMonitorTransform(e, selectedClip, 'scale')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-[#FFE066] border border-black cursor-nesw-resize"
                      title="Drag corner to scale"
                    />
                    <div
                      onPointerDown={(e) => startMonitorTransform(e, selectedClip, 'scale')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#FFE066] border border-black cursor-nwse-resize"
                      title="Drag corner to scale"
                    />
                  </div>
                )}

              {/* 4-Corner 90% Action Safe Guides */}
              {showSafeGuides && (
                <div className="absolute inset-6 border border-dashed border-[#D4AF37]/30 pointer-events-none z-30">
                  <span className="absolute top-1 left-1 text-[8px] text-[#D4AF37]/60 font-mono-tech">90% SAFE</span>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 border border-[#FFE066]/40 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* Program Monitor Transport Bar */}
          <div className="h-12 bg-[#08080C] border border-white/10 mt-2 px-3 rounded-[2px] flex items-center justify-between text-xs shrink-0 gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <CinemaToolHUD title="REWIND START" en="Jump playhead back to 00:00:00:00" bn="কীভাবে ব্যবহার করবেন: টাইমলাইনের শুরুতে ফিরে যেতে চাপুন।" accent="amber">
                <button
                  onClick={() => handleTimelineSeek(0, false)}
                  className="cinema-tile cinema-tile-amber p-1.5 cursor-pointer"
                >
                  <Rewind className="w-3.5 h-3.5" />
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title={isPlaying ? 'PAUSE CUT' : 'PLAY CUT'} en="Play or pause multi-track timeline" bn="কীভাবে ব্যবহার করবেন: ভিডিও প্রিভিউ চালাতে বা থামাতে চাপুন।" accent="amber" shortcut="Space">
                <button
                  onClick={() => {
                    resumeVlcAudioContext();
                    setIsPlaying(p => !p);
                  }}
                  data-active={isPlaying ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber p-2 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="STEP +1S" en="Advance playhead forward by 1 second" bn="কীভাবে ব্যবহার করবেন: প্লেহেড ১ সেকেন্ড সামনে নিতে চাপুন।" accent="amber">
                <button
                  onClick={() => handleTimelineSeek(Math.min(totalDuration, playheadTimeRef.current + 1), false)}
                  className="cinema-tile cinema-tile-amber p-1.5 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </CinemaToolHUD>
              <span
                ref={monitorTimecodeDomRef}
                className="font-mono-tech text-xs text-[#FFE066] font-black ml-1 tabular-nums"
              >
                {formatTC(playheadTime)}
              </span>
              <span className="text-white/40 text-[10px] tabular-nums">/ {formatTC(totalDuration)}</span>
            </div>

            {/* Quick CapCut NLE Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CinemaToolHUD title="SPLIT CLIP" en="Slice selected or active clip at playhead" bn="কীভাবে ব্যবহার করবেন: প্লেহেডের জায়গায় ক্লিপ দুই ভাগ করতে চাপুন।" accent="amber" shortcut="S">
                <button
                  onClick={handleSplitAtPlayhead}
                  className="cinema-tile cinema-tile-amber px-2.5 py-1.5 text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Scissors className="w-3 h-3" strokeWidth={2.2} />
                  <span>SPLIT</span>
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="FREEZE FRAME" en="Insert a 2.0s still hold at the current playhead frame" bn="কীভাবে ব্যবহার করবেন: বর্তমান ফ্রেমে ২ সেকেন্ড স্থির ফ্রিজ ফ্রেম বসাতে চাপুন।" accent="cyan">
                <button
                  disabled={!selectedClipId && !activeMonitorV1Clip}
                  onClick={() => {
                    const id = selectedClipId || activeMonitorV1Clip?.id;
                    if (id) handleFreezeFrame(id);
                  }}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1.5 text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer disabled:opacity-30 whitespace-nowrap"
                >
                  <Snowflake className="w-3 h-3" strokeWidth={2.2} />
                  <span>FREEZE</span>
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="EXTRACT AUDIO" en="Detach audio stem from selected clip onto track A1" bn="কীভাবে ব্যবহার করবেন: ভিডিও ক্লিপ থেকে অডিও আলাদা করতে চাপুন।" accent="emerald">
                <button
                  disabled={!selectedClip || (selectedClip.type !== 'video' && selectedClip.type !== 'audio')}
                  onClick={() => selectedClip && handleDetachAudio(selectedClip.id)}
                  className="cinema-tile cinema-tile-emerald px-2.5 py-1.5 text-[9.5px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer disabled:opacity-30 whitespace-nowrap"
                >
                  <AudioWaveform className="w-3 h-3" strokeWidth={2.2} />
                  <span>EXTRACT</span>
                </button>
              </CinemaToolHUD>
            </div>

            {/* Audio Preamp (0-200%), Speed & View Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <CinemaToolHUD title={isMonitorMuted ? 'UNMUTE' : 'MUTE'} en="Mute or unmute monitor master audio" bn="কীভাবে ব্যবহার করবেন: মনিটর সাউন্ড বন্ধ বা চালু করতে চাপুন।" accent="crimson">
                <button
                  onClick={() => setIsMonitorMuted(m => !m)}
                  data-active={isMonitorMuted ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-crimson p-1.5 cursor-pointer"
                >
                  {isMonitorMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="PREAMP GAIN" en="VLC 200% boost monitor volume slider" bn="কীভাবে ব্যবহার করবেন: স্লাইডার টেনে ভলিউম ২০০% পর্যন্ত বাড়ান।" accent="amber">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={isMonitorMuted ? 0 : monitorVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMonitorVolume(v);
                    if (v > 0 && isMonitorMuted) setIsMonitorMuted(false);
                  }}
                  className="w-16 accent-[#D4AF37] cursor-pointer"
                />
              </CinemaToolHUD>
              <span className="text-[9px] font-black text-white/60 tabular-nums w-8">
                {isMonitorMuted ? 'MUTE' : `${Math.round(monitorVolume * 100)}%`}
              </span>

              <CinemaToolHUD title="PLAYBACK SPEED" en="Cycle preview playback rate (0.5x to 2.0x)" bn="কীভাবে ব্যবহার করবেন: প্রিভিউ গতি বাড়াতে বা কমাতে চাপুন।" accent="cyan">
                <button
                  onClick={() => {
                    const steps = [0.5, 1.0, 1.5, 2.0];
                    const idx = steps.indexOf(monitorSpeed);
                    setMonitorSpeed(steps[(idx + 1) % steps.length]);
                  }}
                  className="cinema-tile cinema-tile-cyan px-2 py-1 text-[9.5px] font-black cursor-pointer tabular-nums"
                >
                  {monitorSpeed}x
                </button>
              </CinemaToolHUD>

              <CinemaToolHUD title="SAFE GUIDES" en="Toggle 90% broadcast action-safe reticle" bn="কীভাবে ব্যবহার করবেন: ৯০% সেফ-জোন গাইড লাইন দেখাতে বা লুকাতে চাপুন।" accent="amber">
                <button
                  onClick={() => setShowSafeGuides(g => !g)}
                  data-active={showSafeGuides ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber p-1.5 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD title="FULLSCREEN" en="Expand studio monitor to fullscreen" bn="কীভাবে ব্যবহার করবেন: ফুলস্ক্রিন মোড অন বা অফ করতে চাপুন।" accent="amber">
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
                    else document.exitFullscreen().catch(() => {});
                  }}
                  className="cinema-tile cinema-tile-amber p-1.5 cursor-pointer"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </div>

        {/* Right: Properties Inspector Panel */}
        <div className="w-72 bg-[#09090D] border-l border-white/10 flex flex-col p-3 text-xs overflow-y-auto no-scrollbar shrink-0">
          <div className="flex border-b border-white/10 pb-2 mb-3 gap-1">
            {([
              { id: 'video', label: 'VIDEO' },
              { id: 'animation', label: 'MOTION' },
              { id: 'adjust', label: 'COLOR' },
              { id: 'speed', label: 'SPEED' },
              { id: 'audio', label: 'AUDIO' }
            ] as const).map(tab => (
              <CinemaToolHUD
                key={tab.id}
                title={`INSPECTOR: ${tab.label}`}
                en={`Edit clip ${tab.label.toLowerCase()} properties`}
                bn={`কীভাবে ব্যবহার করবেন: ক্লিপের ${tab.label} সেটিংস পরিবর্তন করতে চাপুন।`}
                accent="amber"
                blockWrapper
              >
                <button
                  onClick={() => setActivePropertyTab(tab.id)}
                  data-active={activePropertyTab === tab.id ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber w-full px-1.5 py-1.5 text-[9px] uppercase font-black tracking-wider cursor-pointer"
                >
                  {tab.label}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          {selectedClip ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between font-bold text-[#FFE066] text-xs">
                <span className="truncate max-w-[170px]">{selectedClip.name}</span>
                <span className="text-[9px] px-1 bg-white/10 rounded">{selectedClip.trackId}</span>
              </div>

              {/* Active FX / Transition Badges with Quick Clear */}
              {(selectedClip.effectShader || selectedClip.transition) && (
                <div className="flex flex-wrap gap-1">
                  {selectedClip.effectShader && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/20 border border-purple-400/40 rounded text-[9px] text-purple-200">
                      FX: {selectedClip.effectShader}
                      <button
                        onClick={() => updateSelectedClip({ effectShader: undefined })}
                        className="hover:text-white cursor-pointer"
                        title="Remove shader effect"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                  {selectedClip.transition && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-400/40 rounded text-[9px] text-cyan-200">
                      TR: {selectedClip.transition.type}
                      <button
                        onClick={() => updateSelectedClip({ transition: undefined })}
                        className="hover:text-white cursor-pointer"
                        title="Remove transition"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {activePropertyTab === 'video' && (
                <div className="flex flex-col gap-2.5">
                  {/* Inline Title / Sticker Text Editor */}
                  {(selectedClip.trackId === 'T1' || selectedClip.type === 'sticker' || selectedClip.type === 'text') && (
                    <div className="p-2 bg-white/5 border border-white/10 rounded flex flex-col gap-1.5">
                      <label className="text-[9px] text-[#FFE066] uppercase font-bold">Title / Overlay Copy</label>
                      <input
                        type="text"
                        value={selectedClip.text || ''}
                        onChange={(e) => updateSelectedClip({ text: e.target.value })}
                        placeholder="Primary text..."
                        className="w-full bg-black border border-white/20 rounded px-2 py-1 text-[11px] text-white"
                      />
                      {selectedClip.trackId === 'T1' && (
                        <input
                          type="text"
                          value={selectedClip.bengaliText || ''}
                          onChange={(e) => updateSelectedClip({ bengaliText: e.target.value })}
                          placeholder="Bengali / Secondary line..."
                          className="w-full bg-black border border-white/20 rounded px-2 py-1 text-[11px] text-white/80"
                        />
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>SCALE</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.scale}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="250"
                      value={selectedClip.scale}
                      onChange={(e) => updateSelectedClip({ scale: Number(e.target.value) })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>POSITION X</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.posX}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={selectedClip.posX}
                      onChange={(e) => updateSelectedClip({ posX: Number(e.target.value) })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>POSITION Y</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.posY}%</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={selectedClip.posY}
                      onChange={(e) => updateSelectedClip({ posY: Number(e.target.value) })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>ROTATION</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={selectedClip.rotation}
                      onChange={(e) => updateSelectedClip({ rotation: Number(e.target.value) })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>OPACITY</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedClip.opacity}
                      onChange={(e) => updateSelectedClip({ opacity: Number(e.target.value) })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-white/60 uppercase">Blend Mode</label>
                      <select
                        value={selectedClip.blendMode}
                        onChange={(e) => updateSelectedClip({ blendMode: e.target.value as any })}
                        className="w-full bg-black border border-white/20 rounded p-1 text-[10px] mt-1 text-white"
                      >
                        <option value="normal">Normal</option>
                        <option value="screen">Screen</option>
                        <option value="multiply">Multiply</option>
                        <option value="overlay">Overlay</option>
                        <option value="hard-light">Hard Light</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/60 uppercase">Mask Shape</label>
                      <select
                        value={selectedClip.mask}
                        onChange={(e) => updateSelectedClip({ mask: e.target.value as any })}
                        className="w-full bg-black border border-white/20 rounded p-1 text-[10px] mt-1 text-white"
                      >
                        <option value="none">None</option>
                        <option value="rectangle">Rounded Card</option>
                        <option value="ellipse">Cinema Oval</option>
                        <option value="split">50% Split</option>
                      </select>
                    </div>
                  </div>

                  {/* Crop Edge Sliders */}
                  <div className="p-2 bg-white/5 border border-white/10 rounded flex flex-col gap-1.5">
                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase">Edge Crop (%)</span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                        <div key={side}>
                          <div className="flex justify-between text-[9px] text-white/60">
                            <span className="uppercase">{side}</span>
                            <span className="text-[#FFE066] tabular-nums">{selectedClip.crop?.[side] || 0}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={45}
                            value={selectedClip.crop?.[side] || 0}
                            onChange={(e) =>
                              updateSelectedClip({
                                crop: {
                                  ...(selectedClip.crop || { top: 0, bottom: 0, left: 0, right: 0 }),
                                  [side]: Number(e.target.value)
                                }
                              })
                            }
                            className="w-full accent-[#D4AF37]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePropertyTab === 'adjust' && (
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-[#D4AF37] font-bold uppercase">9 Color Adjustments</span>
                  {[
                    { key: 'brightness', label: 'Brightness', min: 50, max: 150 },
                    { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
                    { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
                    { key: 'temperature', label: 'Temperature', min: -50, max: 50 },
                    { key: 'shadows', label: 'Shadows', min: -50, max: 50 },
                    { key: 'highlights', label: 'Highlights', min: -50, max: 50 },
                    { key: 'sharpen', label: 'Sharpen', min: 0, max: 100 },
                    { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
                    { key: 'grain', label: '35mm Grain', min: 0, max: 100 },
                  ].map(param => (
                    <div key={param.key}>
                      <div className="flex justify-between text-[10px] text-white/60">
                        <span>{param.label}</span>
                        <span className="text-[#FFE066] tabular-nums">{selectedClip.adjustments[param.key as keyof typeof selectedClip.adjustments]}</span>
                      </div>
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        value={selectedClip.adjustments[param.key as keyof typeof selectedClip.adjustments]}
                        onChange={(e) => {
                          updateSelectedClip({
                            adjustments: {
                              ...selectedClip.adjustments,
                              [param.key]: Number(e.target.value)
                            }
                          });
                        }}
                        className="w-full accent-[#D4AF37]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {activePropertyTab === 'speed' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>SPEED MULTIPLIER</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.speed.multiplier}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={selectedClip.speed.multiplier}
                      onChange={(e) => updateSelectedClip({ speed: { ...selectedClip.speed, multiplier: Number(e.target.value) } })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {['constant', 'hero', 'slowmo', 'whip'].map(ramp => (
                      <button
                        key={ramp}
                        onClick={() => updateSelectedClip({ speed: { ...selectedClip.speed, ramp: ramp as any } })}
                        className={`p-1.5 rounded border text-[9px] uppercase cursor-pointer ${
                          selectedClip.speed.ramp === ramp ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {ramp}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => updateSelectedClip({ speed: { ...selectedClip.speed, isReversed: !selectedClip.speed.isReversed } })}
                    className={`py-1.5 rounded border text-xs font-bold cursor-pointer ${
                      selectedClip.speed.isReversed ? 'bg-[#D4AF37] text-black' : 'bg-white/5 text-white'
                    }`}
                  >
                    {selectedClip.speed.isReversed ? 'REVERSED ON' : 'PLAY FORWARD'}
                  </button>

                  <button
                    onClick={() => updateSelectedClip({ speed: { ...selectedClip.speed, isFrozen: !selectedClip.speed.isFrozen } })}
                    className={`py-1.5 rounded border text-xs font-bold cursor-pointer ${
                      selectedClip.speed.isFrozen ? 'bg-cyan-500 text-black border-cyan-300' : 'bg-white/5 text-white/80'
                    }`}
                  >
                    {selectedClip.speed.isFrozen ? 'FRAME FROZEN' : 'FREEZE CLIP'}
                  </button>
                </div>
              )}

              {activePropertyTab === 'audio' && (
                <div className="flex flex-col gap-2.5">
                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>CLIP GAIN (UP TO 200%)</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.audio.volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={selectedClip.audio.volume}
                      onChange={(e) => updateSelectedClip({ audio: { ...selectedClip.audio, volume: Number(e.target.value) } })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>FADE IN</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.audio.fadeIn}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2.5"
                      step="0.1"
                      value={selectedClip.audio.fadeIn}
                      onChange={(e) => updateSelectedClip({ audio: { ...selectedClip.audio, fadeIn: Number(e.target.value) } })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>FADE OUT</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.audio.fadeOut}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2.5"
                      step="0.1"
                      value={selectedClip.audio.fadeOut}
                      onChange={(e) => updateSelectedClip({ audio: { ...selectedClip.audio, fadeOut: Number(e.target.value) } })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <button
                    onClick={() => updateSelectedClip({ audio: { ...selectedClip.audio, noiseReduction: !selectedClip.audio.noiseReduction } })}
                    className={`py-1.5 rounded border text-[10px] font-bold cursor-pointer ${
                      selectedClip.audio.noiseReduction ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200' : 'bg-white/5 border-white/15 text-white/60'
                    }`}
                  >
                    {selectedClip.audio.noiseReduction ? 'VOICE ISOLATION ON' : 'NOISE REDUCTION OFF'}
                  </button>
                </div>
              )}

              {activePropertyTab === 'animation' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>ANIM DURATION</span>
                      <span className="text-[#FFE066] tabular-nums">{selectedClip.animation.duration}s</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.05"
                      value={selectedClip.animation.duration}
                      onChange={(e) => updateSelectedClip({ animation: { ...selectedClip.animation, duration: Number(e.target.value) } })}
                      className="w-full accent-[#D4AF37]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase">Keyframe In Curve</span>
                    {(['none', 'fade-in', 'zoom-in', 'slide-up', 'wipe-right'] as const).map(anim => (
                      <button
                        key={anim}
                        onClick={() => updateSelectedClip({ animation: { ...selectedClip.animation, inType: anim } })}
                        className={`py-1 px-2 rounded text-left text-[10px] border cursor-pointer ${
                          selectedClip.animation.inType === anim ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[#D4AF37] font-bold uppercase">Keyframe Out Curve</span>
                    {(['none', 'fade-out', 'zoom-out', 'slide-down', 'wipe-left'] as const).map(anim => (
                      <button
                        key={anim}
                        onClick={() => updateSelectedClip({ animation: { ...selectedClip.animation, outType: anim } })}
                        className={`py-1 px-2 rounded text-left text-[10px] border cursor-pointer ${
                          selectedClip.animation.outType === anim ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clip Action Buttons */}
              <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5">
                <CinemaToolHUD title="SPLIT CLIP" en="Split selected clip at playhead" bn="কীভাবে ব্যবহার করবেন: প্লেহেডের জায়গায় ক্লিপ ভাগ করতে চাপুন।" accent="amber" shortcut="S" blockWrapper>
                  <button
                    onClick={handleSplitAtPlayhead}
                    className="cinema-tile cinema-tile-amber w-full py-2 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span>SPLIT CLIP</span>
                  </button>
                </CinemaToolHUD>
                <div className="grid grid-cols-2 gap-1.5">
                  <CinemaToolHUD title="FREEZE FRAME" en="Insert a 2s still freeze frame at playhead" bn="কীভাবে ব্যবহার করবেন: বর্তমান ফ্রেমে ২ সেকেন্ড স্থির রাখতে চাপুন।" accent="cyan" blockWrapper>
                    <button
                      onClick={() => handleFreezeFrame(selectedClip.id)}
                      className="cinema-tile cinema-tile-cyan w-full py-2 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Snowflake className="w-3 h-3" strokeWidth={2.2} />
                      <span>FREEZE</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="DUPLICATE CLIP" en="Clone selected clip next on timeline" bn="কীভাবে ব্যবহার করবেন: ক্লিপটি ডুপ্লিকেট বা কপি করতে চাপুন।" accent="amber" blockWrapper>
                    <button
                      onClick={() => handleDuplicateClip(selectedClip)}
                      className="cinema-tile cinema-tile-amber w-full py-2 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" strokeWidth={2.2} />
                      <span>DUPLICATE</span>
                    </button>
                  </CinemaToolHUD>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <CinemaToolHUD title="RIPPLE DELETE" en="Delete clip and close timeline gap" bn="কীভাবে ব্যবহার করবেন: ক্লিপ মুছে ফাঁকা জায়গা বন্ধ করতে চাপুন।" accent="amber" shortcut="Shift+Del" blockWrapper>
                    <button
                      onClick={() => handleRippleDelete(selectedClip.id)}
                      className="cinema-tile cinema-tile-amber w-full py-2 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2.2} />
                      <span>RIPPLE DEL</span>
                    </button>
                  </CinemaToolHUD>
                  <CinemaToolHUD title="DELETE CLIP" en="Remove selected clip leaving timeline gap" bn="কীভাবে ব্যবহার করবেন: ক্লিপটি টাইমলাইন থেকে মুছতে চাপুন।" accent="crimson" shortcut="Del" blockWrapper>
                    <button
                      onClick={() => handleDeleteClip(selectedClip.id)}
                      className="cinema-tile cinema-tile-crimson w-full py-2 text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2.2} />
                      <span>DELETE</span>
                    </button>
                  </CinemaToolHUD>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-white/40 text-[10px] font-black tracking-wider uppercase">
              SELECT A CLIP
            </div>
          )}
        </div>
      </div>

      {/* 3. MULTI-TRACK TIMELINE BOTTOM SECTION */}
      <CutEditorTimeline
        clips={clips}
        tracks={defaultTracks}
        playheadTime={playheadTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={handleTimelineSeek}
        onSplitClip={handleSplitAtPlayhead}
        onRippleDeleteClip={handleRippleDelete}
        onFreezeFrame={handleFreezeFrame}
        onDetachAudio={handleDetachAudio}
        onUpdateClips={setClips}
        onBeforeMutation={pushUndo}
        trackStates={trackStates}
        onTrackStatesChange={setTrackStates}
        isSnapToBeat={isSnapToBeat}
        onToggleSnapToBeat={() => {
          const next = !isSnapToBeat;
          audioEngine.setSnapToBeatEnabled(next);
          setIsSnapToBeat(next);
        }}
        onLoadAudioFile={handleLoadAudioFile}
        className="h-64 shrink-0 z-20"
      />
    </div>
  );
};
