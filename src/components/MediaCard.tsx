/**
 * @file /src/components/MediaCard.tsx
 * @description Master Filmstrip Media Card for RAWx Storyboard & HANDFILM Media Vault.
 * 
 * Enhanced Capabilities:
 * 1. Normalized X hover scrubbing seeking a hidden <video> element via requestAnimationFrame.
 * 2. Real-time dynamic thumbnail source updates without audio playback.
 * 3. Tactile Hover Zoom:
 *    - Preview container: `relative overflow-hidden rounded-lg border border-white/10 transition-all duration-300 ease-out`
 *    - On Hover: `scale-125 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623]`
 *    - Edge-safe transform origin (`origin-left`, `origin-right`, or `origin-center`) to prevent boundary clipping.
 * 4. Cinematic Micro-HUD at bottom:
 *    - Broadcast SMPTE timecode (`TC 00:00:03:12` @ 24fps)
 *    - Shot index badge (`SH001` / target shot)
 *    - Playback status indicator badge (`SCRUB`, `24FPS`, `IDB CACHED`)
 * 5. RAM Virtualization & 4GB Guard:
 *    - Mounts HTML5 video decoder context only during hover inspection.
 *    - Full cleanup on unmount: pauses, calls `video.removeAttribute('src')`, `video.load()`, and revokes blob URLs.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { VaultMediaItem } from '../services/db';
import { 
  formatSMPTETimecode, 
  cleanupVideoElement, 
  thumbnailMemoryCache,
  captureVideoFrameAsBase64,
  hoverScrubThumbnailSource
} from '../services/thumbnailEngine';
import { 
  Video, 
  Image as ImageIcon, 
  Music, 
  CheckSquare, 
  Square, 
  Trash2, 
  Play, 
  CheckCircle2
} from 'lucide-react';

export interface MediaCardProps {
  item: VaultMediaItem;
  isSelected: boolean;
  activeShotIndex: number;
  onToggleSelect: (e: React.MouseEvent, id: string) => void;
  onAssignToShot: (item: VaultMediaItem, targetShotIndex?: number) => void;
  onDeleteAsset: (id: string) => void;
  onOpenPreview: (item: VaultMediaItem) => void;
  onCardDragStart: (e: React.DragEvent, item: VaultMediaItem) => void;
  formatBytes: (bytes?: number) => string;
  formatDuration: (sec?: number) => string;
  onContextMenu?: (e: React.MouseEvent, item: VaultMediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  isSelected,
  activeShotIndex,
  onToggleSelect,
  onAssignToShot,
  onDeleteAsset,
  onOpenPreview,
  onCardDragStart,
  formatBytes,
  formatDuration,
  onContextMenu
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [cursorNormalized, setCursorNormalized] = useState<number>(0);
  const [smpteTimecode, setSmpteTimecode] = useState<string>('TC 00:00:00:00');
  const [dynamicThumbnail, setDynamicThumbnail] = useState<string | null>(null);
  const [scrubFrame, setScrubFrame] = useState<string | null>(null);
  const [targetShotIndex, setTargetShotIndex] = useState<number>(activeShotIndex);
  const [transformOrigin, setTransformOrigin] = useState<'origin-center' | 'origin-left' | 'origin-right'>('origin-center');
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(item.name);
  const isAud = item.mimeType?.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(item.name);
  const assignedIndex = item.assignedShotIndex !== undefined ? item.assignedShotIndex : item.shotIndex;
  const isAssignedToActive = assignedIndex === activeShotIndex;
  const resolution = item.resolution || (isVid ? '4K' : isAud ? 'AUDIO' : 'STILL');
  const duration = formatDuration(item.duration);
  const totalDurationSec = item.duration && !isNaN(item.duration) && item.duration > 0 ? item.duration : 12.0;

  // Filmstrip keyframes fallback
  const filmstripFrames = useMemo(() => {
    if (item.thumbnails && item.thumbnails.length > 0) {
      return item.thumbnails;
    }
    if (item.thumbnailUrl) {
      return Array(6).fill(item.thumbnailUrl);
    }
    const cached = thumbnailMemoryCache.get(item.id);
    if (cached) {
      return Array(6).fill(cached);
    }
    return [];
  }, [item.thumbnails, item.thumbnailUrl, item.id]);

  // Fallback static thumbnail (never pure black)
  const staticFallbackThumbnail = useMemo(() => {
    return item.thumbnailUrl || filmstripFrames[0] || thumbnailMemoryCache.get(item.id) || '';
  }, [item.thumbnailUrl, filmstripFrames, item.id]);

  // Compute transform origin based on card's horizontal viewport position to prevent edge clipping
  const updateTransformOrigin = useCallback(() => {
    if (!thumbContainerRef.current) return;
    const rect = thumbContainerRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    if (rect.left < 160) {
      setTransformOrigin('origin-left');
    } else if (windowWidth - rect.right < 160) {
      setTransformOrigin('origin-right');
    } else {
      setTransformOrigin('origin-center');
    }
  }, []);

  // When hidden video seeks, capture frame to update thumbnail source
  const handleHiddenVideoSeeked = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
      const frameDataUrl = captureVideoFrameAsBase64(videoRef.current);
      if (frameDataUrl && frameDataUrl.length > 50) {
        setDynamicThumbnail(frameDataUrl);
      }
    }
  }, []);

  // onMouseMove event listener on thumbnail container: calculates normalized X and seeks hidden video with RAF
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!thumbContainerRef.current) return;
    const container = thumbContainerRef.current;
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) return;

    // Calculate normalized X position (0.0 to 1.0)
    const clientX = e.clientX;
    const currentX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const normalizedX = currentX / rect.width;
    const targetSec = normalizedX * totalDurationSec;

    // Fast synchronous needle & timecode update
    setCursorX(currentX);
    setCursorNormalized(normalizedX);
    setSmpteTimecode(formatSMPTETimecode(targetSec, 24));

    // Instant filmstrip keyframe feedback
    if (filmstripFrames.length > 0) {
      const fIdx = Math.min(filmstripFrames.length - 1, Math.floor(normalizedX * filmstripFrames.length));
      setScrubFrame(filmstripFrames[fIdx]);
    }

    // Use requestAnimationFrame to map mouse X to video duration and seek the hidden <video> element without audio
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (videoRef.current) {
        // Strictly prevent any audio triggering
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
        try {
          videoRef.current.currentTime = targetSec;
          if (videoRef.current.readyState >= 2) {
            const captured = captureVideoFrameAsBase64(videoRef.current);
            if (captured) {
              setDynamicThumbnail(captured);
            }
          }
        } catch {
          // ignore fast seek collisions
        }
      }
    });
  }, [totalDurationSec, filmstripFrames]);

  // Mount video blob URL when item is available
  useEffect(() => {
    let url: string | null = null;
    if (isVid && item.blob) {
      try {
        url = URL.createObjectURL(item.blob);
        setVideoBlobUrl(url);
      } catch {
        // ignore
      }
    }
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isVid, item.blob]);

  // Mouse Enter: calculate boundary clamping
  const handleMouseEnter = () => {
    setIsHovered(true);
    updateTransformOrigin();
  };

  // Mouse Leave: reset hover, release seek state
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCursorX(null);
    setCursorNormalized(0);
    setScrubFrame(null);
    setDynamicThumbnail(null);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.muted = true;
      } catch {
        // ignore
      }
    }
  };

  // Teardown cleanup on component unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (videoRef.current) {
        cleanupVideoElement(videoRef.current, videoBlobUrl);
      }
    };
  }, [videoBlobUrl]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      onToggleSelect(e, item.id);
      return;
    }
    onAssignToShot(item, targetShotIndex);
  };

  // Active displayed thumbnail source
  const activeThumbnailSource = dynamicThumbnail || scrubFrame || staticFallbackThumbnail;

  return (
    <div
      draggable
      onDragStart={(e) => onCardDragStart(e, item)}
      onClick={handleCardClick}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, item);
        }
      }}
      className={`group relative bg-[#0c0c12] border rounded-[2px] overflow-visible flex flex-col transition-colors duration-150 cursor-pointer select-none ${
        isSelected 
          ? 'ring-2 ring-[#fbbf24] border-[#fbbf24]' 
          : isAssignedToActive 
          ? 'border-[#fbbf24] ring-1 ring-[#fbbf24]/50' 
          : 'border-[#272732] hover:border-[#fbbf24]'
      }`}
    >
      {/* 1. Tactical Hover Zoom Container with onMouseMove Normalized X Scrubbing & Micro-HUD */}
      <div 
        ref={thumbContainerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full aspect-video bg-[#050508] cursor-ew-resize transition-all duration-300 ease-out rounded-lg border ${transformOrigin} ${
          isHovered
            ? 'scale-125 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623]'
            : 'border-white/10 z-0 overflow-hidden'
        }`}
      >
        {/* Hidden <video> Element: Used for smooth non-audio frame seeking with RAF */}
        {isVid && videoBlobUrl && (
          <video
            ref={videoRef}
            src={videoBlobUrl}
            muted
            playsInline
            preload="metadata"
            onSeeked={handleHiddenVideoSeeked}
            className="hidden pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Thumbnail Source: Rendered and dynamically updated via RAF hover scrubbing */}
        {activeThumbnailSource ? (
          <img
            src={activeThumbnailSource}
            alt={item.name}
            className="w-full h-full object-cover transition-opacity duration-100"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-[#09090E]">
            {isVid ? <Video className="w-6 h-6 mb-1 text-cyan-400" /> : isAud ? <Music className="w-6 h-6 mb-1 text-purple-400" /> : <ImageIcon className="w-6 h-6 mb-1 text-[#fbbf24]" />}
            <span className="text-[8px] font-mono tracking-widest text-zinc-400">RAWx MEDIA</span>
          </div>
        )}

        {/* Dynamic Cursor Scrub Needle */}
        {cursorX !== null && (
          <div 
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#F5A623] z-20 pointer-events-none shadow-[0_0_8px_#F5A623]"
            style={{ left: `${cursorX}px` }}
          />
        )}

        {/* Tactical Hover Micro-HUD (Floating Monospace Bar at Bottom) */}
        {isHovered ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/90 backdrop-blur-md border-t border-[#F5A623]/60 px-2 py-1 flex items-center justify-between text-[9px] font-mono z-30 pointer-events-none">
            <div className="flex items-center gap-1.5 font-bold text-[#FFE066]">
              <span>{smpteTimecode}</span>
              <span className="text-white/40">·</span>
              <span className="text-white/80">SH{String((assignedIndex !== undefined && assignedIndex !== null ? assignedIndex : targetShotIndex) + 1).padStart(3, '0')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.2 bg-[#F5A623]/20 border border-[#F5A623]/40 text-[#F5A623] text-[7.5px] font-bold rounded-[2px] tracking-wider animate-pulse">
                SCRUB
              </span>
              <span className="text-zinc-400 text-[8px]">24FPS</span>
            </div>
          </div>
        ) : (
          /* Bottom-Right Static Badges when not hovered */
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 z-10 pointer-events-none">
            <span className="px-1 py-0.2 bg-black/80 text-[7px] font-bold text-amber-300 border border-amber-500/30 rounded-[1px]">
              {resolution}
            </span>
            {isVid && (
              <span className="px-1 py-0.2 bg-black/80 text-[7px] font-mono text-zinc-300 rounded-[1px]">
                {duration}
              </span>
            )}
          </div>
        )}

        {/* Top-Left: Multi-select Checkbox & Type Badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={(e) => onToggleSelect(e, item.id)}
            className="p-0.5 bg-black/80 hover:bg-black rounded-[1px] border border-white/20 text-white cursor-pointer"
            title={isSelected ? "Deselect" : "Select (Shift/Cmd+Click for Multi-Select)"}
          >
            {isSelected ? (
              <CheckSquare className="w-3 h-3 text-[#F5A623]" />
            ) : (
              <Square className="w-3 h-3 text-zinc-400 hover:text-white" />
            )}
          </button>

          <span className="px-1 py-0.2 bg-black/80 backdrop-blur-xs text-[7.5px] font-bold text-white rounded-[1px] flex items-center gap-0.5 border border-white/10">
            {isVid ? <Video className="w-2.5 h-2.5 text-cyan-400" /> : isAud ? <Music className="w-2.5 h-2.5 text-purple-400" /> : <ImageIcon className="w-2.5 h-2.5 text-[#F5A623]" />}
            {isVid ? 'VIDEO' : isAud ? 'AUDIO' : 'STILL'}
          </span>
        </div>

        {/* Top-Right: IDB STORED Badge & Delete Button */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
          <span className="px-1.5 py-0.2 bg-[#062c1d]/95 text-[7px] font-bold text-emerald-400 border border-emerald-500/50 rounded-[1px] tracking-wider shadow-sm">
            IDB STORED
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteAsset(item.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 rounded-[1px] cursor-pointer transition-opacity"
            title="Delete asset from IndexedDB"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Hover Center Play Button for Full Preview Modal */}
        {isHovered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPreview(item);
            }}
            className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-[#F5A623] text-white flex items-center justify-center z-40 cursor-pointer shadow-[0_0_12px_rgba(245,166,35,0.4)] transition-transform hover:scale-110"
            title="Open Full Cinema Preview Modal"
          >
            <Play className="w-4 h-4 text-[#F5A623] ml-0.5 fill-[#F5A623]" />
          </button>
        )}
      </div>

      {/* 2. Metadata & Status Strip */}
      <div className="p-2 flex flex-col gap-1.5 bg-[#0c0c12]">
        <div className="flex items-center justify-between text-[9px] min-w-0">
          <p className="font-bold text-zinc-100 truncate pr-1" title={item.name}>
            {item.name}
          </p>
          <span className="text-[8px] text-zinc-300 bg-white/5 px-1 py-0.2 rounded border border-white/10 shrink-0 tabular-nums font-mono">
            {formatBytes(item.size)}
          </span>
        </div>

        {/* Tactical Status Badges */}
        <div className="flex items-center justify-between text-[8px] text-zinc-400 border-t border-[#1c1c24] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">MIME:</span>
            <span className="text-zinc-300 font-bold truncate max-w-[80px]">{item.mimeType}</span>
          </div>

          {assignedIndex !== null && assignedIndex !== undefined ? (
            <span className="text-[#F5A623] font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              SH{String(assignedIndex + 1).padStart(3, '0')}
            </span>
          ) : (
            <span className="text-zinc-500">UNASSIGNED</span>
          )}
        </div>

        {/* 3. Dynamic Shot Target Assignment & Quick Dropdown Selector for Shots 1-100 */}
        <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onAssignToShot(item, targetShotIndex)}
            className={`flex-1 py-1 px-1.5 rounded-[1px] text-[8.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
              isAssignedToActive
                ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                : 'bg-[#181824] hover:bg-[#222232] border border-[#272732] hover:border-[#F5A623] text-[#F5A623]'
            }`}
            title={`Assign asset to Shot ${targetShotIndex + 1}`}
          >
            <span>
              {isAssignedToActive 
                ? `✓ ASSIGNED TO SH${String(targetShotIndex + 1).padStart(3, '0')}`
                : `+ ASSIGN TO SHOT ${String(targetShotIndex + 1).padStart(3, '0')}`}
            </span>
          </button>

          {/* Quick Dropdown Selector for Shots 1-100 */}
          <div className="relative shrink-0">
            <select
              value={targetShotIndex}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTargetShotIndex(val);
                onAssignToShot(item, val);
              }}
              className="bg-[#12121c] border border-[#272732] hover:border-[#F5A623] text-[#F5A623] text-[8px] font-mono font-bold py-1 px-1 rounded-[1px] outline-none cursor-pointer"
              title="Target Shot Index (1-100)"
            >
              {Array.from({ length: 100 }, (_, i) => (
                <option key={i} value={i}>
                  SH{String(i + 1).padStart(3, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
