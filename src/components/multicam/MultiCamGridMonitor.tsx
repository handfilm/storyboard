/**
 * @file /src/components/multicam/MultiCamGridMonitor.tsx
 * @description In-browser CapCut-style Multi-Camera Live Switching & Precision Shorts Grid Monitor.
 * 
 * Capabilities:
 * 1. Responsive Quad-Split / Multi-Grid: 2x2 or 3x3 vertical 9:16 layout with camera tags and shortcut badges.
 * 2. Active Broadcast Tally: Glowing golden amber border & "PROGRAM ON AIR" tag on active angle.
 * 3. Real-Time Punch-In Live Switching: Number keys (1-9) switch cameras and commit cut events during playback.
 * 4. Master Audio & Video Synchronization: Clock-locked playback across angles taking syncOffsetMs into account.
 * 5. Cut Matrix & Undo: Instant Cmd+Z / Ctrl+Z undo stack for rapid live cutting iterations.
 * 6. Dual-Mode Viewport: Toggle between Quad-Split Monitoring and Full Clean Program view.
 * 7. 1-Click 9:16 Shorts Export: WebCodecs/Canvas render pipeline with instant IndexedDB vault injection.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Scissors, 
  Download, 
  Sparkles, 
  Layers, 
  X, 
  ChevronRight, 
  ChevronLeft,
  RotateCw,
  Sliders,
  Check,
  Video,
  Radio,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { MultiCamGroup, MultiCamAngle, MultiCamCutEvent } from '../../types/multicam';
import { MultiCamTimelineTrack } from './MultiCamTimelineTrack';
import { ExpandableMultiCamLayout, MultiCamLayoutPreset } from './ExpandableMultiCamLayout';
import { MultiCamViewportGrid, MultiCamGridConfig } from './MultiCamViewportGrid';
import { multiCamRenderPipeline } from '../../services/multiCamRenderPipeline';
import { VaultMediaItem, db } from '../../services/db';
import { samplePacks } from '../../data/frames';

export const DEFAULT_SAMPLE_MULTICAM_GROUP: MultiCamGroup = {
  id: 'multicam-default-group',
  name: 'DIRECTOR MULTI-CAM 4-ANGLE SYNC',
  angles: [
    {
      id: 'ang-1',
      mediaId: 'm1',
      label: 'CAM 01 (WIDE)',
      blobUrl: samplePacks.cyberNoir[0] || '',
      aspectRatio: 9 / 16,
      syncOffsetMs: 0,
      name: 'Wide Master 35mm f/1.4'
    },
    {
      id: 'ang-2',
      mediaId: 'm2',
      label: 'CAM 02 (MEDIUM)',
      blobUrl: samplePacks.cosmicMacro[1] || '',
      aspectRatio: 9 / 16,
      syncOffsetMs: 0,
      name: 'Medium Punch 50mm T2.0'
    },
    {
      id: 'ang-3',
      mediaId: 'm3',
      label: 'CAM 03 (CLOSE)',
      blobUrl: samplePacks.liquidGold[2] || '',
      aspectRatio: 9 / 16,
      syncOffsetMs: 0,
      name: 'Close-Up 85mm T1.3'
    },
    {
      id: 'ang-4',
      mediaId: 'm4',
      label: 'CAM 04 (LOW ANG)',
      blobUrl: samplePacks.cyberNoir[3] || '',
      aspectRatio: 9 / 16,
      syncOffsetMs: 0,
      name: 'Low-Angle 24mm f/1.8'
    }
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
  aspectRatio: '9:16'
};

export interface MultiCamGridMonitorProps {
  group?: MultiCamGroup;
  isOpen: boolean;
  onClose: () => void;
  onSaveGroup?: (updatedGroup: MultiCamGroup) => void;
  onExportSuccess?: (vaultItem: VaultMediaItem) => void;
  isInline?: boolean;
  layoutConfig?: MultiCamGridConfig;
  onChangeLayoutConfig?: (config: MultiCamGridConfig) => void;
}

export const MultiCamGridMonitor: React.FC<MultiCamGridMonitorProps> = ({
  group: initialGroup = DEFAULT_SAMPLE_MULTICAM_GROUP,
  isOpen,
  onClose,
  onSaveGroup,
  onExportSuccess,
  isInline = false,
  layoutConfig: controlledConfig,
  onChangeLayoutConfig
}) => {
  const [group, setGroup] = useState<MultiCamGroup>(initialGroup || DEFAULT_SAMPLE_MULTICAM_GROUP);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isLooping, setIsLooping] = useState(true);
  const [programAspectRatio, setProgramAspectRatio] = useState<'9:16' | '2.39:1'>('9:16');
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [layoutPreset, setLayoutPreset] = useState<MultiCamGridConfig>(controlledConfig || '2x2');
  const [isExpanded, setIsExpanded] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Undo stack for cuts
  const [cutHistory, setCutHistory] = useState<MultiCamCutEvent[][]>([]);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportedItem, setExportedItem] = useState<VaultMediaItem | null>(null);

  // References for angle video elements and program video
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const programVideoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const durationMs = group.durationMs || Math.round((group.duration || 15) * 1000);

  // Keep group in sync with prop updates
  useEffect(() => {
    setGroup(initialGroup);
  }, [initialGroup]);

  // Master audio angle index
  const masterAudioIndex = Math.max(0, Math.min(group.angles.length - 1, group.masterAudioAngleIndex));

  // Determine active angle for current playhead
  const currentActiveAngleIdx = useMemo(() => {
    return multiCamRenderPipeline.getActiveAngleIndexAtTime(
      group.cutEvents,
      currentTimeMs,
      group.activeAngleIndex || 0
    );
  }, [group.cutEvents, currentTimeMs, group.activeAngleIndex]);

  // Format Timecode
  const formatTimecode = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const frames = Math.floor(((ms % 1000) / 1000) * 30);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  // Switch camera angle (Live punch-in or paused re-assignment)
  const switchAngle = useCallback((angleIndex: number) => {
    if (angleIndex < 0 || angleIndex >= group.angles.length) return;

    setGroup(prev => {
      // Save current cuts for undo
      setCutHistory(hist => [...hist, prev.cutEvents]);

      // If cut at current time already exists, update it, else insert new cut
      const existingIdx = prev.cutEvents.findIndex(c => Math.abs(c.timeMs - currentTimeMs) < 150);
      let updatedCuts: MultiCamCutEvent[];

      if (existingIdx >= 0) {
        updatedCuts = prev.cutEvents.map((c, i) => i === existingIdx ? { ...c, angleIndex } : c);
      } else {
        const newCut: MultiCamCutEvent = {
          id: `cut-${Date.now()}-${angleIndex}`,
          timeMs: Math.max(0, Math.min(durationMs, currentTimeMs)),
          angleIndex
        };
        updatedCuts = [...prev.cutEvents, newCut].sort((a, b) => a.timeMs - b.timeMs);
      }

      const next = {
        ...prev,
        activeAngleIndex: angleIndex,
        cutEvents: updatedCuts
      };

      onSaveGroup?.(next);
      return next;
    });
  }, [currentTimeMs, durationMs, group.angles.length, onSaveGroup]);

  // Undo last cut event
  const undoLastCut = useCallback(() => {
    if (cutHistory.length === 0) return;
    const previous = cutHistory[cutHistory.length - 1];
    setCutHistory(hist => hist.slice(0, hist.length - 1));
    setGroup(prev => ({
      ...prev,
      cutEvents: previous
    }));
  }, [cutHistory]);

  // Keyboard shortcut listener for camera switching (1-9), spacebar, undo
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Keys 1 through 9
      if (e.key >= '1' && e.key <= '9') {
        const targetIndex = parseInt(e.key, 10) - 1;
        if (targetIndex < group.angles.length) {
          e.preventDefault();
          switchAngle(targetIndex);
        }
      }

      // Spacebar toggles Play/Pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }

      // Undo: Cmd+Z or Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undoLastCut();
      }

      // Frame stepping with Arrow keys
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTimeMs(t => Math.max(0, t - (1000 / 30)));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTimeMs(t => Math.min(durationMs, t + (1000 / 30)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, group.angles.length, switchAngle, undoLastCut, durationMs]);

  // Master Clock Synchronization Loop
  useEffect(() => {
    if (!isOpen) return;

    const syncVideosToTime = (timeMs: number) => {
      videoRefs.current.forEach((video, idx) => {
        if (!video) return;
        const angle = group.angles[idx];
        if (!angle) return;

        // Apply audio offset
        const targetSec = Math.max(0, (timeMs - (angle.syncOffsetMs || 0)) / 1000);
        if (Math.abs(video.currentTime - targetSec) > 0.08) {
          video.currentTime = targetSec;
        }

        // Configure audio routing: strictly unmute master audio angle
        if (idx === masterAudioIndex) {
          video.muted = isMuted;
          video.volume = masterVolume;
        } else {
          video.muted = true;
        }
      });

      // Synchronize Master Program Output video element
      if (programVideoRef.current) {
        const activeAngle = group.angles[currentActiveAngleIdx] || group.angles[0];
        if (activeAngle) {
          const targetSec = Math.max(0, (timeMs - (activeAngle.syncOffsetMs || 0)) / 1000);
          if (Math.abs(programVideoRef.current.currentTime - targetSec) > 0.08) {
            programVideoRef.current.currentTime = targetSec;
          }
        }
      }
    };

    if (isPlaying) {
      lastTimeRef.current = performance.now();

      // Play video elements
      videoRefs.current.forEach(v => {
        if (v && v.paused) {
          v.play().catch(() => {});
        }
      });
      if (programVideoRef.current && programVideoRef.current.paused) {
        programVideoRef.current.play().catch(() => {});
      }

      const tick = (now: number) => {
        const deltaMs = now - lastTimeRef.current;
        lastTimeRef.current = now;

        setCurrentTimeMs(prev => {
          let next = prev + deltaMs;
          if (next >= durationMs) {
            if (isLooping) {
              next = 0;
            } else {
              setIsPlaying(false);
              return durationMs;
            }
          }
          syncVideosToTime(next);
          return next;
        });

        animFrameRef.current = requestAnimationFrame(tick);
      };

      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      // Pause all videos
      videoRefs.current.forEach(v => {
        if (v && !v.paused) {
          v.pause();
        }
      });
      if (programVideoRef.current && !programVideoRef.current.paused) {
        programVideoRef.current.pause();
      }
      syncVideosToTime(currentTimeMs);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isLooping, durationMs, group.angles, masterAudioIndex, isMuted, masterVolume, isOpen]);

  // Handle Scrubbing
  const handleSeekMs = (targetMs: number) => {
    setCurrentTimeMs(targetMs);
    videoRefs.current.forEach((video, idx) => {
      if (!video) return;
      const angle = group.angles[idx];
      if (angle) {
        video.currentTime = Math.max(0, (targetMs - (angle.syncOffsetMs || 0)) / 1000);
      }
    });
  };

  // Render & Export 9:16 Short
  const handleExportShort = async () => {
    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Initializing WebCodecs 9:16 Shorts export...');

    try {
      const result = await multiCamRenderPipeline.renderMultiCamGroup(group, {
        width: 1080,
        height: 1920,
        fps: 30,
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

  // Grid layout class based on number of angles
  const getGridColsClass = () => {
    const count = group.angles.length;
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <div className={isInline ? "w-full h-full flex flex-col bg-[#08090C] text-white font-sans overflow-hidden select-none" : "fixed inset-0 z-[110] flex flex-col bg-[#08090C] text-white font-sans overflow-hidden select-none animate-fade-in"}>
      {/* Top Header Bar */}
      <header className="h-14 px-6 border-b border-white/10 bg-[#0C0D12] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#F5A623]">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight text-white">{group.name}</h1>
              <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                9:16 SHORTS LIVE SWITCHER
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              {group.angles.length} Cameras Locked · Press keys 1–{group.angles.length} to punch-in cuts
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Direct Send to Master Storyboard Timeline */}
          <button
            type="button"
            onClick={() => {
              const count = multiCamRenderPipeline.sendMultiCamSequenceToMasterTimeline(group);
              setSendSuccessMessage(`⚡ Sequenced ${count} cuts into Storyboard Shots 001-${String(count).padStart(3, '0')}!`);
              setTimeout(() => setSendSuccessMessage(null), 3500);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Send multi-camera live cuts directly to Master Storyboard Shots 001-100"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Send Multi-Cam Sequence to Master Timeline (Shots 001-100)</span>
          </button>

          <button
            onClick={undoLastCut}
            disabled={cutHistory.length === 0}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-neutral-300 disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Undo last live cut (Cmd+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo Cut</span>
          </button>

          <button
            onClick={handleExportShort}
            disabled={isExporting}
            className="px-4 py-1.5 bg-[#141520] hover:bg-[#1f2133] border border-cyan-500/40 text-cyan-300 hover:text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Render 9:16 Short</span>
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Success Notification Banner */}
      {sendSuccessMessage && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-6 py-2 flex items-center justify-between text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-amber-400" />
            <span className="font-semibold">{sendSuccessMessage}</span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">STORYBOARD SLOTS 1-100 POPULATED</span>
        </div>
      )}

      {/* Multi-Cam Viewport Grid with 2x2, 1x3, and 1x1 Configurations */}
      <div className="flex-1 w-full p-3 overflow-hidden flex flex-col min-h-0">
        <MultiCamViewportGrid
          group={group}
          currentActiveAngleIdx={currentActiveAngleIdx}
          currentTimeMs={currentTimeMs}
          isPlaying={isPlaying}
          isMuted={isMuted}
          masterAudioIndex={masterAudioIndex}
          onSelectAngle={switchAngle}
          videoRefs={videoRefs}
          config={controlledConfig !== undefined ? controlledConfig : layoutPreset}
          onChangeConfig={(cfg) => {
            setLayoutPreset(cfg);
            onChangeLayoutConfig?.(cfg);
          }}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(e => !e)}
          aspectRatio={programAspectRatio === '2.39:1' ? '2.39:1' : '9:16'}
          onChangeAspectRatio={(r) => setProgramAspectRatio(r === '2.39:1' ? '2.39:1' : '9:16')}
        />
      </div>

      {/* Floating Control Transport & Timecode Bar */}
      <div className="px-6 py-3 bg-[#0C0D12] border-t border-white/10 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          {/* Left Transport Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTimeMs(0)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Return to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentTimeMs(t => Math.max(0, t - 1000 / 30))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Step -1 Frame"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95"
              title="Play / Pause (Spacebar)"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={() => setCurrentTimeMs(t => Math.min(durationMs, t + 1000 / 30))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Step +1 Frame"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsLooping(l => !l)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-colors ${
                isLooping ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-neutral-500 hover:text-white'
              }`}
              title="Toggle Loop"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Live Timecode & Frame Readout */}
          <div className="flex items-center gap-4 bg-[#14151F] border border-white/10 px-4 py-1.5 rounded-xl">
            <div className="font-mono text-sm font-semibold tracking-wider text-amber-400 tabular-nums">
              TC {formatTimecode(currentTimeMs)}
            </div>
            <span className="text-neutral-600">/</span>
            <div className="font-mono text-xs text-neutral-400 tabular-nums">
              TOTAL {formatTimecode(durationMs)}
            </div>
            <span className="text-neutral-600">/</span>
            <div className="font-mono text-xs text-neutral-500 tabular-nums">
              F{Math.floor((currentTimeMs / 1000) * 30)}
            </div>
          </div>

          {/* Right: Audio Volume & Cut Stats */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
              {group.cutEvents.length} CUTS RECORDED
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(m => !m)}
                className="text-neutral-400 hover:text-white p-1"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : masterVolume}
                onChange={e => {
                  setMasterVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Integrated Multi-Cam Timeline Track */}
        <MultiCamTimelineTrack
          group={group}
          currentTimeMs={currentTimeMs}
          onSeekMs={handleSeekMs}
          onUpdateCutEvents={cuts => {
            setGroup(prev => {
              const next = { ...prev, cutEvents: cuts };
              onSaveGroup?.(next);
              return next;
            });
          }}
          onSelectAngle={switchAngle}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(p => !p)}
          onStepFrame={(dir) => setCurrentTimeMs(t => Math.max(0, Math.min(durationMs, t + dir * (1000 / 30))))}
        />
      </div>

      {/* Exporting Progress Modal Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0D12] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[#F5A623] flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Compositing 9:16 Short</h3>
              <p className="text-xs text-neutral-400 mt-1">{exportStatus}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-150"
                style={{ width: `${exportProgress}%` }}
              />
            </div>

            <div className="text-xs font-mono text-amber-400">{exportProgress}% Completed</div>
          </div>
        </div>
      )}

      {/* Export Success Modal Overlay */}
      {exportedItem && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0C0D12] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-semibold text-white tracking-tight">Export Successful!</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Your 9:16 multi-camera short has been saved into the Media Vault and is ready for use.
              </p>
            </div>

            <div className="p-3 bg-neutral-900 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                {exportedItem.thumbnailUrl ? (
                  <img src={exportedItem.thumbnailUrl} alt={exportedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <Video className="w-5 h-5 text-neutral-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-white truncate">{exportedItem.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  {exportedItem.resolution || '1080x1920'} · {(exportedItem.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
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
                className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-colors"
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
