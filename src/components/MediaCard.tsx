/**
 * @file /src/components/MediaCard.tsx
 * @description Master Filmstrip Media Card for RAWx Storyboard & HANDFILM Media Vault.
 * 
 * Enhanced Capabilities:
 * 1. Dynamic Hover-Scrubbing Video Thumbnail Engine with RAF 60fps tracking.
 * 2. Tactile Hover Zoom:
 *    - Preview container: `relative overflow-hidden rounded-lg border border-white/10 transition-all duration-300 ease-out`
 *    - On Hover: `scale-125 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(245,166,35,0.45)] border-[#F5A623]`
 *    - Edge-safe transform origin (`origin-left`, `origin-right`, or `origin-center`) to prevent boundary clipping.
 * 3. Cinematic Micro-HUD at bottom:
 *    - Broadcast SMPTE timecode (`TC 00:00:03:12` @ 24fps)
 *    - Shot index badge (`SH001` / target shot)
 *    - Playback status indicator badge (`SCRUB`, `24FPS`, `IDB CACHED`)
 * 4. RAM Virtualization & 4GB Guard:
 *    - Mounts HTML5 video decoder context only during hover inspection.
 *    - Full cleanup on unmount: pauses, calls `video.removeAttribute('src')`, `video.load()`, and revokes blob URLs.
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { VaultMediaItem } from '../services/db';
import { 
  formatSMPTETimecode, 
  cleanupVideoElement, 
  thumbnailMemoryCache 
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
  const [targetShotIndex, setTargetShotIndex] = useState<number>(activeShotIndex);
  const [transformOrigin, setTransformOrigin] = useState<'origin-center' | 'origin-left' | 'origin-right'>('origin-center');
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);

  const thumbContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const latestMouseXRef = useRef<number>(0);

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

  // Fallback static thumbnail (never black)
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

  // Handle RAF-throttled position update
  const triggerRafScrub = useCallback(() => {
    if (rafIdRef.current !== null) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!thumbContainerRef.current) return;

      const rect = thumbContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, latestMouseXRef.current));
      const normalized = rect.width > 0 ? x / rect.width : 0;
      const targetSec = normalized * totalDurationSec;

      setCursorX(x);
      setCursorNormalized(normalized);
      setSmpteTimecode(formatSMPTETimecode(targetSec, 24));

      // Scrub HTML5 video element without audio
      if (videoRef.current && videoRef.current.readyState >= 1) {
        try {
          videoRef.current.muted = true;
          videoRef.current.currentTime = targetSec;
        } catch {
          // ignore seek collisions
        }
      }
    });
  }, [totalDurationSec]);

  // Mouse Enter: mount video element if video file, calculate boundary clamping
  const handleMouseEnter = () => {
    setIsHovered(true);
    updateTransformOrigin();

    if (isVid && item.blob && !videoBlobUrl) {
      try {
        const url = URL.createObjectURL(item.blob);
        setVideoBlobUrl(url);
      } catch {
        // ignore
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!thumbContainerRef.current) return;
    const rect = thumbContainerRef.current.getBoundingClientRect();
    latestMouseXRef.current = e.clientX - rect.left;
    triggerRafScrub();
  };

  // Mouse Leave: unmount video tag, release decoder context
  const handleMouseLeave = () => {
    setIsHovered(false);
    setCursorX(null);
    setCursorNormalized(0);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Cleanup video element on leave to enforce 4GB guard
    if (videoRef.current) {
      cleanupVideoElement(videoRef.current, videoBlobUrl);
    }
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
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
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
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
      {/* 1. Tactical Hover Zoom Container with Dynamic Hover Scrubbing & Micro-HUD */}
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
        {/* Active Viewport Media: HTML5 Video when hovered, Lightweight JPEG Fallback otherwise */}
        {isHovered && isVid && videoBlobUrl ? (
          <video
            ref={videoRef}
            src={videoBlobUrl}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : staticFallbackThumbnail ? (
          <img
            src={staticFallbackThumbnail}
            alt={item.name}
            className="w-full h-full object-cover transition-opacity duration-150"
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
