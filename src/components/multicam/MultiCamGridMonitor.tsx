/**
 * @file /src/components/multicam/MultiCamGridMonitor.tsx
 * @description Broadcast Live Switcher Monitor Deck:
 * - Top ~70% Split Visual Deck:
 *   - Left (60%): 9-Camera Live Preview Matrix (3x3 / 2x2 / 1x3) with CAM 01-09, red ON AIR / amber CUED tally, audio meters.
 *   - Right (40%): Dedicated MASTER PROGRAM Monitor (16:9 / 2.39:1) with LUT filter + Title burn-in preview + LIVE ON AIR · CAM XX · TC 00:00:00.
 * - Bottom ~30% Compact Multi-Cam Timeline Track + Transport & Render Actions.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Check,
  Video,
  Radio,
  Type,
  Sliders
} from 'lucide-react';
import { MultiCamGroup, MultiCamCutEvent } from '../../types/multicam';
import { MultiCamTimelineTrack } from './MultiCamTimelineTrack';
import { MultiCamViewportGrid, MultiCamGridConfig, ProceduralAngleCanvas } from './MultiCamViewportGrid';
import { multiCamRenderPipeline } from '../../services/multiCamRenderPipeline';
import { VaultMediaItem } from '../../services/db';
import { samplePacks } from '../../data/frames';
import { EventSourcedJournal } from '../../services/media/eventSourcedJournal';
import { proceduralMultiCamFeeds } from '../../services/media/proceduralMultiCamFeeds';
import { multiCamSyncEngine } from '../../services/multiCamSyncEngine';
import { getLutFilterCSS } from '../../utils/engine';
import { isVideoSourceUrl } from '../../services/thumbnailEngine';
import { AnthologyFrame, LutPreset } from '../../types/anthology';
import {
  formatBroadcastTimecode,
  getActiveMultiCamAngleAtTime,
  punchMultiCamAngle,
  splitMultiCamAtPlayhead
} from '../../utils/multiCamMath';

export const DEFAULT_SAMPLE_MULTICAM_GROUP: MultiCamGroup = {
  id: 'multicam-default-group',
  name: 'BROADCAST LIVE SWITCHER',
  angles: [
    { id: 'ang-1', mediaId: 'm1', label: 'CAM 01', blobUrl: samplePacks.cyberNoir[0] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Wide Master 35mm' },
    { id: 'ang-2', mediaId: 'm2', label: 'CAM 02', blobUrl: samplePacks.cosmicMacro[1] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Medium Punch 50mm' },
    { id: 'ang-3', mediaId: 'm3', label: 'CAM 03', blobUrl: samplePacks.liquidGold[2] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Close-Up 85mm' },
    { id: 'ang-4', mediaId: 'm4', label: 'CAM 04', blobUrl: samplePacks.cyberNoir[3] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Low-Angle 24mm' },
    { id: 'ang-5', mediaId: 'm5', label: 'CAM 05', blobUrl: samplePacks.liquidGold[0] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Overhead 18mm' },
    { id: 'ang-6', mediaId: 'm6', label: 'CAM 06', blobUrl: samplePacks.cosmicMacro[2] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Macro Profile 100mm' },
    { id: 'ang-7', mediaId: 'm7', label: 'CAM 07', blobUrl: samplePacks.cyberNoir[1] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Steadicam 28mm' },
    { id: 'ang-8', mediaId: 'm8', label: 'CAM 08', blobUrl: samplePacks.liquidGold[1] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Dutch Tilt 40mm' },
    { id: 'ang-9', mediaId: 'm9', label: 'CAM 09', blobUrl: samplePacks.cosmicMacro[0] || '', aspectRatio: 16 / 9, syncOffsetMs: 0, name: 'Telephoto 135mm' }
  ],
  duration: 12.0,
  durationMs: 12000,
  masterAudioAngleIndex: 0,
  activeAngleIndex: 0,
  cutEvents: [
    { id: 'cut-init', timeMs: 0, angleIndex: 0 },
    { id: 'cut-1', timeMs: 3000, angleIndex: 1 },
    { id: 'cut-2', timeMs: 6500, angleIndex: 2 },
    { id: 'cut-3', timeMs: 9500, angleIndex: 3 }
  ],
  aspectRatio: '16:9'
};

const PROGRAM_LUT_OPTIONS: Array<{ id: LutPreset; label: string }> = [
  { id: 'cinematic', label: 'CINE' },
  { id: 'kodak_vision3', label: 'VISION3' },
  { id: 'noir', label: 'NOIR' },
  { id: 'bleach', label: 'BLEACH' },
  { id: 'technicolor', label: 'TECH' },
  { id: 'raw', label: 'RAW' }
];

export interface MultiCamGridMonitorProps {
  group?: MultiCamGroup;
  isOpen: boolean;
  onClose: () => void;
  onSaveGroup?: (updatedGroup: MultiCamGroup) => void;
  onExportSuccess?: (vaultItem: VaultMediaItem) => void;
  isInline?: boolean;
  layoutConfig?: MultiCamGridConfig;
  onChangeLayoutConfig?: (config: MultiCamGridConfig) => void;
  activeShotFrame?: AnthologyFrame;
  projectFrames?: AnthologyFrame[];
}

export const MultiCamGridMonitor: React.FC<MultiCamGridMonitorProps> = ({
  group: initialGroup = DEFAULT_SAMPLE_MULTICAM_GROUP,
  isOpen,
  onClose,
  onSaveGroup,
  onExportSuccess,
  isInline = false,
  layoutConfig: controlledConfig,
  onChangeLayoutConfig,
  activeShotFrame,
  projectFrames
}) => {
  const [group, setGroup] = useState<MultiCamGroup>(initialGroup || DEFAULT_SAMPLE_MULTICAM_GROUP);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [programAspectRatio, setProgramAspectRatio] = useState<'16:9' | '2.39:1'>('16:9');
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [layoutPreset, setLayoutPreset] = useState<MultiCamGridConfig>(controlledConfig || '3x3');
  const [cuedAngleIdx, setCuedAngleIdx] = useState<number>(1);
  const [programLut, setProgramLut] = useState<LutPreset>(activeShotFrame?.lutFilter || 'cinematic');
  const [showProgramTitleBurnIn, setShowProgramTitleBurnIn] = useState<boolean>(true);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [isAfvEnabled, setIsAfvEnabled] = useState(false);

  const [cutStack, setCutStack] = useState<MultiCamCutEvent[]>([]);
  const [redoStack, setRedoStack] = useState<MultiCamCutEvent[]>([]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportedItem, setExportedItem] = useState<VaultMediaItem | null>(null);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const programVideoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const durationMs = group.durationMs || Math.round((group.duration || 12) * 1000);

  // Sync group & enrich unassigned camera slots with live project shot media when available
  useEffect(() => {
    const base = initialGroup || DEFAULT_SAMPLE_MULTICAM_GROUP;
    if (!projectFrames || projectFrames.length === 0) {
      setGroup((prev) => ({
        ...base,
        angles: base.angles.map((angle, idx) => ({
          ...angle,
          isTimeSynced: angle.isTimeSynced ?? prev.angles[idx]?.isTimeSynced
        }))
      }));
      return;
    }

    setGroup((prev) => ({
      ...base,
      angles: base.angles.map((angle, idx) => {
        const frame = projectFrames[idx];
        const hasUserUpload = angle.mediaId?.startsWith('user-') || angle.blobUrl?.startsWith('blob:');
        const preservedSync = angle.isTimeSynced ?? prev.angles[idx]?.isTimeSynced;
        if (!hasUserUpload && frame?.imageUrl) {
          return {
            ...angle,
            blobUrl: frame.imageUrl,
            isVideo: Boolean(frame.isVideo),
            name: frame.title || angle.name,
            isTimeSynced: preservedSync
          };
        }
        return {
          ...angle,
          isTimeSynced: preservedSync
        };
      })
    }));
  }, [initialGroup, projectFrames]);

  useEffect(() => {
    if (activeShotFrame?.lutFilter) {
      setProgramLut(activeShotFrame.lutFilter);
    }
  }, [activeShotFrame?.lutFilter]);

  // Seed procedural feeds silently if slots lack video streams (optional enhancement; procedural canvas already renders live at 60fps)
  useEffect(() => {
    let isCancelled = false;
    const needsSeed = group.angles.every((a) => !a.blobUrl);
    if (!needsSeed) return;

    proceduralMultiCamFeeds
      .getSynchronizedAngles(group.angles[0]?.id || 'ang-1')
      .then((synched) => {
        if (!isCancelled && synched?.length) {
          setGroup((prev) => ({
            ...prev,
            angles: prev.angles.map((old, idx) => ({
              ...old,
              blobUrl: old.blobUrl || synched[idx]?.blobUrl || '',
              isVideo: old.isVideo ?? Boolean(synched[idx]?.blobUrl)
            }))
          }));
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUploadAngleVideo = useCallback(
    (angleIndex: number, file: File) => {
      try {
        const blobUrl = URL.createObjectURL(file);
        const angleName = file.name.replace(/\.[^/.]+$/, '');
        const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);

        setGroup((prev) => {
          const updated = prev.angles.map((ang, idx) =>
            idx === angleIndex
              ? {
                  ...ang,
                  blobUrl,
                  isVideo: isVid,
                  name: angleName,
                  mediaId: `user-${Date.now()}`
                }
              : ang
          );
          const next = { ...prev, angles: updated };
          onSaveGroup?.(next);
          return next;
        });

        setSendSuccessMessage(`Loaded "${file.name}" into CAM ${String(angleIndex + 1).padStart(2, '0')}`);
        window.setTimeout(() => setSendSuccessMessage(null), 2600);

        if (isVid) {
          multiCamSyncEngine.extractAudioBuffer(blobUrl).catch(() => {});
        }
      } catch (err) {
        console.warn('[MultiCamGridMonitor] Upload media error:', err);
      }
    },
    [onSaveGroup]
  );

  const handleToggleAngleSync = useCallback(
    (angleIndex: number) => {
      const currentAngle = group.angles[angleIndex];
      if (!currentAngle) return;

      const nextSynced = currentAngle.isTimeSynced === false;
      const updatedAngles = group.angles.map((ang, idx) =>
        idx === angleIndex ? { ...ang, isTimeSynced: nextSynced } : ang
      );
      const nextGroup: MultiCamGroup = { ...group, angles: updatedAngles };

      setGroup(nextGroup);
      onSaveGroup?.(nextGroup);

      const vid = videoRefs.current[angleIndex];
      if (vid) {
        if (nextSynced) {
          const targetSec = Math.max(0, (currentTimeMs - (currentAngle.syncOffsetMs || 0)) / 1000);
          if (typeof vid.fastSeek === 'function') {
            try {
              vid.fastSeek(targetSec);
            } catch {
              vid.currentTime = targetSec;
            }
          } else {
            vid.currentTime = targetSec;
          }
          if (isPlaying && vid.paused) {
            vid.play().catch(() => {});
          }
        } else if (!vid.paused) {
          vid.pause();
        }
      }
    },
    [group, currentTimeMs, isPlaying, onSaveGroup]
  );

  const masterAudioIndex = Math.max(0, Math.min(group.angles.length - 1, group.masterAudioAngleIndex || 0));

  const currentActiveAngleIdx = useMemo(
    () => getActiveMultiCamAngleAtTime(group.cutEvents, currentTimeMs, group.activeAngleIndex || 0),
    [group.cutEvents, currentTimeMs, group.activeAngleIndex]
  );

  const activeAngle = group.angles[currentActiveAngleIdx] || group.angles[0];
  const activeProgramLutCss = useMemo(
    () => getLutFilterCSS(programLut, activeShotFrame?.adjustments),
    [programLut, activeShotFrame?.adjustments]
  );

  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Immediate live camera punch-in cut (supports CAM 01..CAM 09)
  const switchAngle = useCallback(
    (angleIndex: number) => {
      if (angleIndex < 0 || angleIndex >= group.angles.length) return;

      setGroup((prev) => {
        const prevAngle = getActiveMultiCamAngleAtTime(prev.cutEvents, currentTimeMs, prev.activeAngleIndex || 0);
        if (prevAngle !== angleIndex) {
          setCuedAngleIdx(prevAngle);
        }
        const punched = punchMultiCamAngle(prev.cutEvents, currentTimeMs, angleIndex, durationMs, prevAngle);

        setCutStack((stack) => [...stack, punched.newCut]);
        setRedoStack([]);

        const next: MultiCamGroup = {
          ...prev,
          activeAngleIndex: angleIndex,
          cutEvents: punched.cutEvents
        };

        EventSourcedJournal.getInstance()
          .commitAction({
            actionType: 'SPLIT_SHOT',
            frameIndex: punched.newCut.frame || 0,
            payload: {
              angleIndex,
              timeMs: currentTimeMs,
              label: prev.angles[angleIndex]?.label || `CAM 0${angleIndex + 1}`
            },
            inversePayload: {
              previousAngle: prevAngle,
              timeMs: currentTimeMs
            }
          })
          .catch(() => {});

        onSaveGroup?.(next);
        return next;
      });
    },
    [currentTimeMs, durationMs, group.angles.length, onSaveGroup]
  );

  const handleSplitAtPlayhead = useCallback(() => {
    setGroup((prev) => {
      const activeIdx = getActiveMultiCamAngleAtTime(prev.cutEvents, currentTimeMs, prev.activeAngleIndex || 0);
      const res = splitMultiCamAtPlayhead(prev.cutEvents, currentTimeMs, durationMs, activeIdx);
      if (!res.inserted || !res.newCut) return prev;
      setCutStack((stack) => [...stack, res.newCut!]);
      setRedoStack([]);
      const next = { ...prev, cutEvents: res.cutEvents };
      onSaveGroup?.(next);
      return next;
    });
  }, [currentTimeMs, durationMs, onSaveGroup]);

  const undoLastCut = useCallback(() => {
    if (cutStack.length === 0) return;
    const lastCut = cutStack[cutStack.length - 1];
    setCutStack((stack) => stack.slice(0, -1));
    setRedoStack((redo) => [...redo, lastCut]);

    setGroup((prev) => {
      const updatedCuts = prev.cutEvents.filter((c) => c.id !== lastCut.id);
      const safeCuts =
        updatedCuts.length > 0
          ? updatedCuts
          : [{ id: 'cut-init', timeMs: 0, angleIndex: lastCut.previousAngle ?? 0 }];
      const next = {
        ...prev,
        activeAngleIndex: lastCut.previousAngle ?? 0,
        cutEvents: safeCuts
      };
      onSaveGroup?.(next);
      return next;
    });
  }, [cutStack, onSaveGroup]);

  const redoCut = useCallback(() => {
    if (redoStack.length === 0) return;
    const cutToRedo = redoStack[redoStack.length - 1];
    setRedoStack((redo) => redo.slice(0, -1));
    setCutStack((stack) => [...stack, cutToRedo]);

    setGroup((prev) => {
      const updatedCuts = [...prev.cutEvents.filter((c) => c.id !== cutToRedo.id), cutToRedo].sort(
        (a, b) => a.timeMs - b.timeMs
      );
      const next = {
        ...prev,
        activeAngleIndex: cutToRedo.newAngle ?? cutToRedo.angleIndex,
        cutEvents: updatedCuts
      };
      onSaveGroup?.(next);
      return next;
    });
  }, [redoStack, onSaveGroup]);

  // Keyboard switcher: 1-9 punch cameras, C splits at playhead, A toggles AFV, Space toggles play, Alt+1/2/3 matrix preset
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }

      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setLayoutPreset('3x3');
        onChangeLayoutConfig?.('3x3');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setLayoutPreset('2x2');
        onChangeLayoutConfig?.('2x2');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setLayoutPreset('1x3');
        onChangeLayoutConfig?.('1x3');
        return;
      }

      // Keys 1-9: Instant Live Punch-in Cut across CAM 01..CAM 09
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const targetIndex = parseInt(e.key, 10) - 1;
        if (targetIndex < group.angles.length) {
          e.preventDefault();
          e.stopPropagation();
          switchAngle(targetIndex);
          return;
        }
      }

      // Key C: Split at playhead
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSplitAtPlayhead();
        return;
      }

      if ((e.key === 'a' || e.key === 'A') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setIsAfvEnabled((a) => !a);
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        setIsPlaying((p) => !p);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoCut();
        else undoLastCut();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoCut();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTimeMs((t) => Math.max(0, t - 1000 / 30));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTimeMs((t) => Math.min(durationMs, t + 1000 / 30));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, group.angles.length, switchAngle, handleSplitAtPlayhead, undoLastCut, redoCut, durationMs, onChangeLayoutConfig]);

  // Synchronized Master Clock & Frame-Accurate Video Element Sync
  useEffect(() => {
    if (!isOpen) return;

    const syncVideosToTime = (timeMs: number) => {
      videoRefs.current.forEach((video, idx) => {
        if (!video) return;
        const angle = group.angles[idx];
        if (!angle) return;

        // Only frame-sync preview cards that have Master Program time-sync enabled
        if (angle.isTimeSynced !== false) {
          const targetSec = Math.max(0, (timeMs - (angle.syncOffsetMs || 0)) / 1000);
          if (Math.abs(video.currentTime - targetSec) > 0.033) {
            if (typeof video.fastSeek === 'function') {
              try {
                video.fastSeek(targetSec);
              } catch {
                video.currentTime = targetSec;
              }
            } else {
              video.currentTime = targetSec;
            }
          }
        }

        const effectiveSoundIdx = isAfvEnabled ? currentActiveAngleIdx : masterAudioIndex;
        if (idx === effectiveSoundIdx) {
          video.muted = isMuted;
          video.volume = masterVolume;
        } else {
          video.muted = true;
        }
      });

      if (programVideoRef.current && activeAngle) {
        const targetSec = Math.max(0, (timeMs - (activeAngle.syncOffsetMs || 0)) / 1000);
        if (Math.abs(programVideoRef.current.currentTime - targetSec) > 0.033) {
          if (typeof programVideoRef.current.fastSeek === 'function') {
            try {
              programVideoRef.current.fastSeek(targetSec);
            } catch {
              programVideoRef.current.currentTime = targetSec;
            }
          } else {
            programVideoRef.current.currentTime = targetSec;
          }
        }
      }
    };

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      // Seek ONCE before calling play() (never write currentTime inside rAF while playing)
      syncVideosToTime(currentTimeMs);

      videoRefs.current.forEach((v, idx) => {
        if (!v) return;
        const isSynced = group.angles[idx]?.isTimeSynced !== false;
        if (isSynced && v.paused) {
          v.play().catch(() => {});
        } else if (!isSynced && !v.paused) {
          v.pause();
        }
      });
      if (programVideoRef.current && programVideoRef.current.paused) {
        programVideoRef.current.play().catch(() => {});
      }

      const tick = (now: number) => {
        const deltaMs = now - lastTimeRef.current;
        lastTimeRef.current = now;

        const pVid = programVideoRef.current;
        setCurrentTimeMs((prev) => {
          let next =
            pVid && !pVid.paused && pVid.readyState >= 2 && Number.isFinite(pVid.currentTime)
              ? pVid.currentTime * 1000 + (activeAngle?.syncOffsetMs || 0)
              : prev + deltaMs;
          if (next >= durationMs) {
            if (isLooping) {
              next = 0;
              if (pVid) {
                pVid.pause();
                try { pVid.currentTime = 0; } catch {}
                pVid.play().catch(() => {});
              }
            } else {
              setIsPlaying(false);
              return durationMs;
            }
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      videoRefs.current.forEach((v) => {
        if (v && !v.paused) v.pause();
      });
      if (programVideoRef.current && !programVideoRef.current.paused) {
        programVideoRef.current.pause();
      }
      syncVideosToTime(currentTimeMs);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, isLooping, durationMs, group.angles, masterAudioIndex, isMuted, masterVolume, isOpen, currentActiveAngleIdx, isAfvEnabled, activeAngle]);

  const handleSeekMs = (targetMs: number) => {
    setCurrentTimeMs(targetMs);
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      const angle = group.angles[idx];
      if (angle && angle.isTimeSynced !== false) {
        const sec = Math.max(0, (targetMs - (angle.syncOffsetMs || 0)) / 1000);
        if (typeof video.fastSeek === 'function') {
          try { video.fastSeek(sec); } catch { video.currentTime = sec; }
        } else {
          video.currentTime = sec;
        }
      }
    });
    if (programVideoRef.current && activeAngle) {
      const sec = Math.max(0, (targetMs - (activeAngle.syncOffsetMs || 0)) / 1000);
      if (typeof programVideoRef.current.fastSeek === 'function') {
        try { programVideoRef.current.fastSeek(sec); } catch { programVideoRef.current.currentTime = sec; }
      } else {
        programVideoRef.current.currentTime = sec;
      }
    }
  };

  const handleExportShort = async () => {
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Compositing multi-cam program master...');

    try {
      const result = await multiCamRenderPipeline.renderMultiCamGroup(group, {
        width: programAspectRatio === '2.39:1' ? 1920 : 1920,
        height: programAspectRatio === '2.39:1' ? 804 : 1080,
        fps: 30,
        burnInTitles: showProgramTitleBurnIn,
        banglaTitle: activeShotFrame?.bengaliTitle,
        englishTitle: activeShotFrame?.title,
        onProgress: (pct, msg) => {
          setExportProgress(pct);
          setExportStatus(msg);
        }
      });

      setExportedItem(result.vaultItem);
      onExportSuccess?.(result.vaultItem);
    } catch (err: any) {
      console.warn('[MultiCamGridMonitor] Export error:', err);
      setExportStatus(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const activeConfig = controlledConfig !== undefined ? controlledConfig : layoutPreset;
  const activeAngleIsVideo = Boolean(
    activeAngle?.blobUrl &&
    (activeAngle.isVideo || isVideoSourceUrl(activeAngle.blobUrl, { isVideo: activeAngle.isVideo }))
  );
  const activeAngleIsImage = Boolean(activeAngle?.blobUrl && !activeAngleIsVideo);

  return (
    <div
      className={
        isInline
          ? 'w-full h-full flex flex-col bg-[#07080B] text-white font-sans overflow-hidden select-none'
          : 'fixed inset-0 z-[110] flex flex-col bg-[#07080B] text-white font-sans overflow-hidden select-none'
      }
    >
      {/* Top Broadcast Switcher Header (Slim) */}
      <header className="h-11 px-4 border-b border-white/10 bg-[#0B0C11] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Video className="w-4 h-4 text-red-500 shrink-0" />
          <h1 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white truncate">
            {group.name || 'BROADCAST LIVE SWITCHER'}
          </h1>
          <span className="hidden md:inline text-[11px] font-mono text-neutral-400 tabular-nums">
            · 9-CAM MATRIX · TC {formatBroadcastTimecode(currentTimeMs)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAfvEnabled((a) => !a)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
              isAfvEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
            title="Audio Follows Video (Key A)"
          >
            <Radio className="w-3 h-3" />
            <span>{isAfvEnabled ? 'AFV ON' : 'AFV LOCK'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const count = multiCamRenderPipeline.sendMultiCamSequenceToMasterTimeline(group);
              setSendSuccessMessage(`Sequenced ${count} cuts to Storyboard Slots 001-${String(count).padStart(3, '0')}`);
              window.setTimeout(() => setSendSuccessMessage(null), 3200);
            }}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SEND CUTS TO STORYBOARD</span>
          </button>

          <button
            type="button"
            onClick={handleExportShort}
            disabled={isExporting}
            className="px-3 py-1 bg-[#141622] hover:bg-[#1E2133] border border-cyan-500/40 text-cyan-300 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>RENDER</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Multi-Cam View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {sendSuccessMessage && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">{sendSuccessMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/80">SYNCED TO MASTER TIMELINE</span>
        </div>
      )}

      {/* TOP ~70% BROADCAST LIVE SWITCHER MONITOR DECK: Left 60% (9-Cam Matrix) + Right 40% (Master Program) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 p-2.5 overflow-hidden">
        {/* LEFT (60%): 9-Camera Live Preview Matrix */}
        <div className="w-full lg:w-[60%] h-[55%] lg:h-full min-h-0 flex flex-col">
          <MultiCamViewportGrid
            group={group}
            currentActiveAngleIdx={currentActiveAngleIdx}
            cuedAngleIdx={cuedAngleIdx}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            isMuted={isMuted}
            masterAudioIndex={masterAudioIndex}
            onSelectAngle={switchAngle}
            onCueAngle={setCuedAngleIdx}
            onUploadAngleVideo={handleUploadAngleVideo}
            onToggleAngleSync={handleToggleAngleSync}
            videoRefs={videoRefs}
            config={activeConfig}
            onChangeConfig={(cfg) => {
              setLayoutPreset(cfg);
              onChangeLayoutConfig?.(cfg);
            }}
            lutCssFilter={activeProgramLutCss}
          />
        </div>

        {/* RIGHT (40%): Dedicated MASTER PROGRAM Monitor */}
        <div className="w-full lg:w-[40%] h-[45%] lg:h-full min-h-0 flex flex-col bg-[#090A0F] border border-red-600/40 rounded-xl overflow-hidden shadow-[0_0_24px_rgba(220,38,38,0.12)]">
          {/* Master Program Telemetry Bar */}
          <div className="h-9 px-3 bg-[#10090B] border-b border-red-600/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0 font-mono text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[9.5px] tracking-wider uppercase shrink-0">
                MASTER PROGRAM
              </span>
              <span className="text-red-300 font-bold tracking-wide truncate tabular-nums">
                LIVE ON AIR · {activeAngle?.label || `CAM ${String(currentActiveAngleIdx + 1).padStart(2, '0')}`} · TC {formatBroadcastTimecode(currentTimeMs)}
              </span>
            </div>

            {/* Aspect Ratio Switcher (16:9 / 2.39:1) */}
            <div className="flex items-center gap-1 bg-black/70 border border-white/10 rounded-lg p-0.5 font-mono text-[10px] shrink-0">
              {(['16:9', '2.39:1'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setProgramAspectRatio(ratio)}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    programAspectRatio === ratio ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* High-Contrast Program Screen */}
          <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-2.5 overflow-hidden relative">
            <div
              className={`relative w-full max-h-full bg-black border border-white/15 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center ${
                programAspectRatio === '2.39:1' ? 'aspect-[2.39/1]' : 'aspect-video'
              }`}
            >
              <div className="w-full h-full" style={{ filter: activeProgramLutCss !== 'none' ? activeProgramLutCss : undefined }}>
                {activeAngleIsVideo ? (
                  <video
                    ref={programVideoRef}
                    src={activeAngle?.blobUrl}
                    crossOrigin="anonymous"
                    playsInline
                    muted
                    autoPlay={isPlaying}
                    preload="metadata"
                    style={{
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : activeAngleIsImage ? (
                  <img
                    src={activeAngle?.blobUrl}
                    alt={activeAngle?.label || 'Master Program'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ProceduralAngleCanvas
                    index={currentActiveAngleIdx}
                    currentTimeMs={currentTimeMs}
                    isActive={true}
                    label={activeAngle?.label || 'CAM 01'}
                  />
                )}
              </div>

              {/* Active Title Burn-In Preview */}
              {showProgramTitleBurnIn && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[#FFE066] font-serif font-bold text-sm sm:text-base leading-tight drop-shadow truncate">
                      {activeShotFrame?.bengaliTitle || 'দৃশ্য // লাইভ প্রোগ্রাম'}
                    </div>
                    <div className="text-white font-mono font-bold text-xs tracking-wider uppercase truncate">
                      {activeShotFrame?.title || activeAngle?.name || `PROGRAM ${activeAngle?.label}`}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-neutral-300 shrink-0 tabular-nums">
                    <div className="text-amber-400 font-bold">{programLut.toUpperCase()}</div>
                    <div>{programAspectRatio}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Program LUT & Title Burn-In Controls Strip */}
          <div className="h-9 px-3 bg-[#0D0E14] border-t border-white/10 flex items-center justify-between gap-2 shrink-0 text-[10px] font-mono">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <Sliders className="w-3 h-3 text-amber-400 shrink-0 mr-1" />
              {PROGRAM_LUT_OPTIONS.map((lut) => (
                <button
                  key={lut.id}
                  type="button"
                  onClick={() => setProgramLut(lut.id)}
                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors shrink-0 ${
                    programLut === lut.id
                      ? 'bg-amber-500 text-black'
                      : 'text-neutral-400 hover:text-white bg-white/5'
                  }`}
                >
                  {lut.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowProgramTitleBurnIn((b) => !b)}
              className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer border shrink-0 ${
                showProgramTitleBurnIn
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-white/5 border-white/10 text-neutral-400'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>TITLE BURN-IN</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ~30% COMPACT MULTI-CAM TIMELINE & TRANSPORT DOCK */}
      <div className="h-[30%] min-h-[168px] max-h-[240px] px-3 py-2 bg-[#0B0C11] border-t border-white/10 flex flex-col justify-between gap-2 shrink-0">
        {/* Sleek Transport Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentTimeMs(0)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Return to Start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentTimeMs((t) => Math.max(0, t - 1000 / 30))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Step -1 Frame"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="px-3.5 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTimeMs((t) => Math.min(durationMs, t + 1000 / 30))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Step +1 Frame"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsLooping((l) => !l)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer border ${
                isLooping ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-transparent text-neutral-500 hover:text-white'
              }`}
              title="Loop Playback"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <button
              type="button"
              onClick={undoLastCut}
              disabled={cutStack.length === 0}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-neutral-300 disabled:opacity-30 cursor-pointer"
            >
              UNDO
            </button>
            <button
              type="button"
              onClick={redoCut}
              disabled={redoStack.length === 0}
              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-mono text-neutral-300 disabled:opacity-30 cursor-pointer"
            >
              REDO
            </button>
          </div>

          {/* Center Timecode Readout */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs tabular-nums">
            <span className="text-amber-400 font-bold">TC {formatTimecode(currentTimeMs)}</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">{formatTimecode(durationMs)}</span>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-300">{group.cutEvents.length} CUTS</span>
          </div>

          {/* Right Audio Level */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className="text-neutral-400 hover:text-white p-1 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => {
                setMasterVolume(parseFloat(e.target.value));
                setIsMuted(false);
              }}
              className="w-16 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Low-Profile Multi-Cam Timeline Track */}
        <MultiCamTimelineTrack
          group={group}
          currentTimeMs={currentTimeMs}
          onSeekMs={handleSeekMs}
          onUpdateCutEvents={(cuts) => {
            setGroup((prev) => {
              const next = { ...prev, cutEvents: cuts };
              onSaveGroup?.(next);
              return next;
            });
          }}
          onSelectAngle={switchAngle}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onStepFrame={(dir) => setCurrentTimeMs((t) => Math.max(0, Math.min(durationMs, t + dir * (1000 / 30))))}
          className="flex-1 min-h-0"
        />
      </div>

      {/* Export Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0D12] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[#F5A623] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Rendering Multi-Cam Program</h3>
              <p className="text-xs text-neutral-400 mt-1">{exportStatus}</p>
            </div>
            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-amber-500 transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="text-xs font-mono text-amber-400 tabular-nums">{exportProgress}%</div>
          </div>
        </div>
      )}

      {/* Export Success Modal */}
      {exportedItem && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0D12] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-white">Multi-Cam Render Complete</h3>
              <p className="text-xs text-neutral-400 mt-1">Saved to Media Vault and ready for download.</p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <a
                href={URL.createObjectURL(exportedItem.blob)}
                download={exportedItem.name}
                className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl transition-colors text-center"
              >
                Download File
              </a>
              <button
                type="button"
                onClick={() => setExportedItem(null)}
                className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
