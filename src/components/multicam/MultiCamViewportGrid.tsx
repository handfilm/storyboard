/**
 * @file /src/components/multicam/MultiCamViewportGrid.tsx
 * @description Broadcast 9-Camera Live Preview Matrix (3x3, 2x2, 1x3) for the Director Switcher Deck.
 * Supports live video/image feeds + procedural cinema canvas fallback, red live tally (`border-red-600`),
 * amber cue tally (`border-amber-400`), live per-camera audio level meters, and 1-9 instant punch-in cuts.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Volume2, Video, Upload, Link2, Unlink2 } from 'lucide-react';
import { MultiCamGroup, MultiCamAngle } from '../../types/multicam';
import { ANGLE_CONFIGS, proceduralMultiCamFeeds } from '../../services/media/proceduralMultiCamFeeds';
import { isVideoSourceUrl } from '../../services/thumbnailEngine';
import { ShotMediaThumbnail } from '../ShotMediaThumbnail';

export type MultiCamGridConfig = '3x3' | '2x2' | '1x3' | '1x1';

export const ProceduralAngleCanvas: React.FC<{
  index: number;
  currentTimeMs: number;
  isActive: boolean;
  label?: string;
  aspectClass?: string;
}> = ({ index, currentTimeMs, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastDrawTimeMsRef = useRef<number>(-1000);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Throttle background cams slightly (~15fps) when not live on air to preserve GPU budget
    if (!isActive && Math.abs(currentTimeMs - lastDrawTimeMsRef.current) < 66) {
      return;
    }
    lastDrawTimeMsRef.current = currentTimeMs;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    const config = ANGLE_CONFIGS[index % ANGLE_CONFIGS.length];
    if (config) {
      const timeSec = (currentTimeMs || 0) / 1000;
      const frame = Math.floor(timeSec * 24);
      config.renderFrame(ctx, canvas.width, canvas.height, timeSec, frame);
      proceduralMultiCamFeeds.drawCinemaTelemetryHUD(
        ctx,
        canvas.width,
        canvas.height,
        timeSec,
        config,
        isActive ? config.id : ''
      );
    }
  }, [index, currentTimeMs, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      className="w-full h-full object-cover pointer-events-none select-none"
    />
  );
};

export interface MultiCamViewportGridProps {
  group: MultiCamGroup;
  currentActiveAngleIdx: number;
  cuedAngleIdx?: number;
  currentTimeMs: number;
  isPlaying: boolean;
  isMuted?: boolean;
  masterAudioIndex?: number;
  onSelectAngle: (angleIndex: number) => void;
  onCueAngle?: (angleIndex: number) => void;
  onSetMasterAudio?: (angleIndex: number) => void;
  onUploadAngleVideo?: (angleIndex: number, file: File) => void;
  onToggleAngleSync?: (angleIndex: number) => void;
  videoRefs?: React.MutableRefObject<(HTMLVideoElement | null)[]>;
  config?: MultiCamGridConfig;
  onChangeConfig?: (config: MultiCamGridConfig) => void;
  lutCssFilter?: string;
  className?: string;
}

export const MultiCamViewportGrid: React.FC<MultiCamViewportGridProps> = ({
  group,
  currentActiveAngleIdx,
  cuedAngleIdx = 1,
  currentTimeMs,
  isPlaying,
  masterAudioIndex = 0,
  onSelectAngle,
  onCueAngle,
  onUploadAngleVideo,
  onToggleAngleSync,
  videoRefs: externalVideoRefs,
  config: controlledConfig,
  onChangeConfig,
  lutCssFilter = 'none',
  className = ''
}) => {
  const internalVideoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const videoRefs = externalVideoRefs || internalVideoRefs;
  const [localConfig, setLocalConfig] = useState<MultiCamGridConfig>('3x3');
  const [flashingAngleIdx, setFlashingAngleIdx] = useState<number | null>(null);
  const [unsyncedTimesMs, setUnsyncedTimesMs] = useState<Record<number, number>>({});

  const activeConfig = controlledConfig !== undefined ? controlledConfig : localConfig;

  const setConfig = useCallback(
    (newConfig: MultiCamGridConfig) => {
      if (onChangeConfig) {
        onChangeConfig(newConfig);
      } else {
        setLocalConfig(newConfig);
      }
    },
    [onChangeConfig]
  );

  // Normalize strictly 9 broadcast feeds (CAM 01 through CAM 09)
  const displayAngles = useMemo<MultiCamAngle[]>(() => {
    const existing = group.angles || [];
    return Array.from({ length: 9 }, (_, i) => {
      const src = existing[i];
      if (src) {
        return {
          ...src,
          label: `CAM ${String(i + 1).padStart(2, '0')}`
        };
      }
      return {
        id: `ang-slot-${i + 1}`,
        mediaId: `m-slot-${i + 1}`,
        label: `CAM ${String(i + 1).padStart(2, '0')}`,
        blobUrl: '',
        aspectRatio: 16 / 9,
        syncOffsetMs: 0,
        name: `Camera ${i + 1} Live Feed`
      };
    });
  }, [group.angles]);

  const handlePunchCamera = useCallback(
    (angleIdx: number) => {
      setFlashingAngleIdx(angleIdx);
      window.setTimeout(() => setFlashingAngleIdx(null), 65);
      onSelectAngle(angleIdx);
    },
    [onSelectAngle]
  );

  // Compute visible indices per matrix preset (always keeping CAM 01..CAM 09 ready)
  const visibleIndices = useMemo(() => {
    if (activeConfig === '3x3') return [0, 1, 2, 3, 4, 5, 6, 7, 8];
    if (activeConfig === '2x2') {
      const bankOffset = currentActiveAngleIdx >= 4 && currentActiveAngleIdx < 8 ? 4 : currentActiveAngleIdx === 8 ? 5 : 0;
      return [bankOffset, bankOffset + 1, bankOffset + 2, bankOffset + 3];
    }
    if (activeConfig === '1x3') {
      const others = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => i !== currentActiveAngleIdx).slice(0, 3);
      return [currentActiveAngleIdx, ...others];
    }
    return [currentActiveAngleIdx];
  }, [activeConfig, currentActiveAngleIdx]);

  const visibleSet = useMemo(() => new Set(visibleIndices), [visibleIndices]);

  // Compute simulated live audio meter level per camera (4 segments)
  const getAudioMeterBars = (camIdx: number, isLive: boolean, isMaster: boolean): number => {
    if (!isPlaying && !isLive) return 1;
    const phase = (currentTimeMs / 180) + camIdx * 1.7;
    const wave = Math.abs(Math.sin(phase) * 0.65 + Math.cos(phase * 2.3) * 0.35);
    const boost = isLive || isMaster ? 1 : 0.72;
    return Math.max(1, Math.min(5, Math.round(wave * 5 * boost)));
  };

  const handleToggleCardSync = useCallback(
    (e: React.MouseEvent, angleIdx: number, currentlySynced: boolean) => {
      e.stopPropagation();
      setUnsyncedTimesMs((prev) => {
        const next = { ...prev };
        if (currentlySynced) {
          next[angleIdx] = currentTimeMs;
        } else {
          delete next[angleIdx];
        }
        return next;
      });
      onToggleAngleSync?.(angleIdx);
    },
    [currentTimeMs, onToggleAngleSync]
  );

  const renderCameraMedia = (angle: MultiCamAngle, idx: number, isLive: boolean, cardTimeMs: number) => {
    const isVid = Boolean(
      angle.blobUrl &&
      (angle.isVideo || isVideoSourceUrl(angle.blobUrl, { isVideo: angle.isVideo }))
    );
    const isImg = Boolean(angle.blobUrl && !isVid);

    if (isVid && isLive) {
      return (
        <video
          ref={(el) => {
            videoRefs.current[idx] = el;
          }}
          src={angle.blobUrl}
          crossOrigin="anonymous"
          playsInline
          muted
          preload="metadata"
          disablePictureInPicture
          style={{
            filter: lutCssFilter !== 'none' ? lutCssFilter : undefined,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          className="w-full h-full object-cover pointer-events-none select-none"
        />
      );
    }

    if (isVid) {
      return (
        <ShotMediaThumbnail
          shotIndex={idx}
          shotId={angle.id}
          mediaUrl={angle.blobUrl}
          isVideo
          name={angle.name}
          title={angle.label}
          lutFilterCss={lutCssFilter}
          disableLiveVideoElement
          className="w-full h-full overflow-hidden pointer-events-none select-none"
          mediaClassName="w-full h-full object-cover pointer-events-none select-none"
          alt={angle.label}
        />
      );
    }

    if (isImg) {
      return (
        <img
          src={angle.blobUrl}
          alt={angle.label}
          loading="eager"
          decoding="async"
          style={{ filter: lutCssFilter !== 'none' ? lutCssFilter : undefined }}
          className="w-full h-full object-cover pointer-events-none select-none"
        />
      );
    }

    return (
      <div className="w-full h-full" style={{ filter: lutCssFilter !== 'none' ? lutCssFilter : undefined }}>
        <ProceduralAngleCanvas
          index={idx}
          currentTimeMs={cardTimeMs}
          isActive={isLive}
          label={angle.label}
        />
      </div>
    );
  };

  const gridClass =
    activeConfig === '3x3'
      ? 'grid-cols-3 grid-rows-3'
      : activeConfig === '2x2'
      ? 'grid-cols-2 grid-rows-2'
      : activeConfig === '1x3'
      ? 'grid-cols-3 grid-rows-2'
      : 'grid-cols-1 grid-rows-1';

  return (
    <div className={`flex flex-col w-full h-full min-h-0 bg-[#090A0F] border border-white/10 rounded-xl overflow-hidden select-none ${className}`}>
      {/* Matrix Header Toolbar */}
      <div className="h-9 px-3 bg-[#0E1017] border-b border-white/10 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Video className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase truncate">
            9-CAM LIVE MATRIX
          </span>
          <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline tabular-nums">
            · KEYS 1–9 PUNCH · RIGHT-CLICK CUE
          </span>
        </div>

        {/* Grid Mode Switcher: 3x3 / 2x2 / 1x3 */}
        <div className="flex items-center gap-1 bg-black/70 border border-white/10 rounded-lg p-0.5 font-mono text-[10px] shrink-0">
          {(['3x3', '2x2', '1x3'] as MultiCamGridConfig[]).map((preset) => {
            const active = activeConfig === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setConfig(preset)}
                className={`px-2 py-0.5 rounded font-bold uppercase transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-black'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {preset.replace('x', '×')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Camera Cards Grid (Keep all video elements mounted for continuous sync) */}
      <div className={`multi-cam-monitor-grid flex-1 min-h-0 p-2 grid gap-2 ${gridClass} bg-[#050608]`}>
        {displayAngles.map((angle, idx) => {
          const isVisible = visibleSet.has(idx);
          const isLive = idx === currentActiveAngleIdx;
          const isCued = !isLive && idx === cuedAngleIdx;
          const isFlashing = idx === flashingAngleIdx;
          const isMasterAudio = idx === masterAudioIndex;
          const isTimeSynced = angle.isTimeSynced !== false;
          const cardTimeMs = isTimeSynced ? currentTimeMs : (unsyncedTimesMs[idx] ?? currentTimeMs);
          const activeBars = getAudioMeterBars(idx, isLive, isMasterAudio);
          const is1x3Hero = activeConfig === '1x3' && idx === visibleIndices[0];

          return (
            <div
              key={angle.id}
              onClick={() => handlePunchCamera(idx)}
              onContextMenu={(e) => {
                e.preventDefault();
                onCueAngle?.(idx);
              }}
              onMouseEnter={() => {
                if (!isLive && onCueAngle) {
                  // Lightly preview cue only on explicit click/right-click unless hovered; keep explicit cuedAngleIdx deterministic
                }
              }}
              className={`group relative rounded-lg overflow-hidden cursor-pointer bg-black transition-all duration-100 ${
                !isVisible ? 'hidden' : ''
              } ${is1x3Hero ? 'col-span-3 row-span-1' : ''} ${
                isFlashing
                  ? 'border-2 border-white ring-2 ring-white/80'
                  : isLive
                  ? 'border-2 border-red-600 shadow-[0_0_16px_rgba(220,38,38,0.55)] z-10'
                  : isCued
                  ? 'border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] z-[5]'
                  : 'border border-white/15 hover:border-amber-400/70'
              }`}
              title={`Click or press [${idx + 1}] to punch ${angle.label} live on air · Right-click to Cue`}
            >
              {/* Live Feed Canvas / Video / Image */}
              <div className="absolute inset-0 bg-black overflow-hidden">
                {renderCameraMedia(angle, idx, isLive, cardTimeMs)}
              </div>

              {/* Top Tally & Camera Badge Row */}
              <div className="relative z-10 p-1.5 flex items-center justify-between gap-1 bg-gradient-to-b from-black/80 via-black/35 to-transparent">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums leading-none ${
                      isLive
                        ? 'bg-red-600 text-white'
                        : isCued
                        ? 'bg-amber-400 text-black'
                        : 'bg-black/80 text-white border border-white/20'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-white tracking-wide truncate drop-shadow">
                    {angle.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Live Tally Label */}
                  {isLive && (
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-black text-[9px] tracking-wider uppercase leading-none">
                      ON AIR
                    </span>
                  )}
                  {isCued && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-black text-[9px] tracking-wider uppercase leading-none">
                      CUED
                    </span>
                  )}

                  {/* Frame-Accurate Master Program Time-Sync Toggle */}
                  <button
                    type="button"
                    data-testid={`multicam-sync-toggle-${idx}`}
                    aria-pressed={isTimeSynced}
                    aria-label={`Toggle frame-accurate time-sync for ${angle.label}`}
                    onClick={(e) => handleToggleCardSync(e, idx, isTimeSynced)}
                    title={
                      isTimeSynced
                        ? `${angle.label} frame-accurate time-sync with Master Program ON (click to disable)`
                        : `${angle.label} time-sync with Master Program OFF (click to enable)`
                    }
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${
                      isTimeSynced
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/35'
                        : 'bg-black/85 border-white/20 text-neutral-400 hover:text-white hover:border-white/40'
                    }`}
                  >
                    {isTimeSynced ? <Link2 className="w-2.5 h-2.5" /> : <Unlink2 className="w-2.5 h-2.5" />}
                    <span>{isTimeSynced ? 'SYNC' : 'ASYNC'}</span>
                  </button>

                  {/* Per-Camera Audio Level Meter */}
                  <div
                    className="flex items-end gap-[2px] h-3.5 px-1 py-0.5 rounded bg-black/80 border border-white/10"
                    title="Camera Audio Level"
                  >
                    {[1, 2, 3, 4, 5].map((seg) => {
                      const lit = seg <= activeBars;
                      const barColor =
                        seg >= 5 ? 'bg-red-500' : seg >= 4 ? 'bg-amber-400' : 'bg-emerald-400';
                      return (
                        <div
                          key={seg}
                          className={`w-[2px] rounded-xs transition-all duration-75 ${
                            lit ? barColor : 'bg-white/15'
                          }`}
                          style={{ height: `${seg * 2 + 2}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Quick Upload Trigger */}
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded bg-black/85 hover:bg-amber-500 hover:text-black border border-white/20 text-neutral-300 cursor-pointer transition-all"
                    title={`Assign video/image to ${angle.label}`}
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <input
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadAngleVideo?.(idx, file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Bottom Shot/Lens Caption Strip */}
              <div className="absolute inset-x-0 bottom-0 z-10 px-2 py-1 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-2 text-[9.5px] font-mono pointer-events-none">
                <span className="text-neutral-200 truncate">
                  {angle.name || `Camera ${idx + 1}`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0 text-neutral-400 tabular-nums">
                  {isMasterAudio && <Volume2 className="w-2.5 h-2.5 text-cyan-400" />}
                  <span className={isTimeSynced ? 'text-cyan-300/90' : 'text-neutral-500'}>
                    {isTimeSynced ? 'LOCKED' : 'FREE'}
                  </span>
                  <span>·</span>
                  <span>24F</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
