/**
 * @file /src/components/MediaCard.tsx
 * @description Master Filmstrip Media Card for RAWx Storyboard & HANDFILM Media Vault.
 * Features:
 * 1. Horizontal filmstrip hover scrubbing through 6 extracted keyframes (0%, 20%, 40%, 60%, 80%, 100%)
 * 2. Dynamic cursor timecode badge tracking horizontal position
 * 3. Dynamic shot assignment label: [+ ASSIGN TO SHOT ${targetIndex + 1}] with quick dropdown selector for Shots 1-100
 * 4. Multi-select support (Shift+Click / Cmd+Click) with drag support for sequential bulk mapping
 * 5. Complete telemetry: 4K/1080P resolution, duration, file size, IDB STORED badge, MIME type
 */

import React, { useState, useRef, useMemo } from 'react';
import { VaultMediaItem } from '../services/db';
import { 
  Video, 
  Image as ImageIcon, 
  Music, 
  CheckSquare, 
  Square, 
  Trash2, 
  Play, 
  CheckCircle2,
  ChevronDown
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
  formatDuration
}) => {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [cursorTimecode, setCursorTimecode] = useState<string | null>(null);
  const [targetShotIndex, setTargetShotIndex] = useState<number>(activeShotIndex);

  const thumbContainerRef = useRef<HTMLDivElement>(null);

  const isVid = item.mimeType?.startsWith('video') || /\.(mp4|webm|mov|mkv|ogg|m4v)$/i.test(item.name);
  const isAud = item.mimeType?.startsWith('audio') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(item.name);
  const assignedIndex = item.assignedShotIndex !== undefined ? item.assignedShotIndex : item.shotIndex;
  const isAssignedToActive = assignedIndex === activeShotIndex;
  const resolution = item.resolution || (isVid ? '4K' : isAud ? 'AUDIO' : 'STILL');
  const duration = formatDuration(item.duration);

  // 6 Filmstrip Keyframes Array
  const filmstripFrames = useMemo(() => {
    if (item.thumbnails && item.thumbnails.length > 0) {
      return item.thumbnails;
    }
    if (item.thumbnailUrl) {
      return Array(6).fill(item.thumbnailUrl);
    }
    return [];
  }, [item.thumbnails, item.thumbnailUrl]);

  // Current active display frame (hover scrub or primary)
  const activeThumbnail = useMemo(() => {
    if (scrubIndex !== null && filmstripFrames[scrubIndex]) {
      return filmstripFrames[scrubIndex];
    }
    return item.thumbnailUrl || filmstripFrames[0] || '';
  }, [scrubIndex, filmstripFrames, item.thumbnailUrl]);

  // Handle horizontal mouse scrubbing across 6 frames
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!thumbContainerRef.current || filmstripFrames.length === 0) return;
    const rect = thumbContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;

    // Pick 1 of 6 frames (0 to 5)
    const frameIndex = Math.min(filmstripFrames.length - 1, Math.floor(ratio * filmstripFrames.length));
    setScrubIndex(frameIndex);
    setCursorX(x);

    // Calculate dynamic timecode badge
    const totalSec = item.duration && !isNaN(item.duration) ? item.duration : 12.0;
    const currentSec = ratio * totalSec;
    const mins = Math.floor(currentSec / 60);
    const secs = Math.floor(currentSec % 60);
    const frames = Math.floor((currentSec % 1) * 24);
    const tc = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    setCursorTimecode(tc);
  };

  const handleMouseLeave = () => {
    setScrubIndex(null);
    setCursorX(null);
    setCursorTimecode(null);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onCardDragStart(e, item)}
      onClick={() => onAssignToShot(item, targetShotIndex)}
      onTouchEnd={(e) => {
        if ((e.target as HTMLElement).tagName !== 'BUTTON' && !(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('select')) {
          onAssignToShot(item, targetShotIndex);
        }
      }}
      className={`group relative bg-[#0c0c12] border rounded-[2px] overflow-hidden flex flex-col transition-all duration-150 hover:border-[#fbbf24] cursor-pointer shadow-md select-none ${
        isSelected 
          ? 'ring-2 ring-[#fbbf24] border-[#fbbf24]' 
          : isAssignedToActive 
          ? 'border-[#fbbf24] ring-1 ring-[#fbbf24]/50' 
          : 'border-[#272732]'
      }`}
    >
      {/* 1. Thumbnail Plate (240x135 aspect-video) with Filmstrip Hover Scrubbing */}
      <div 
        ref={thumbContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full aspect-video bg-[#050508] overflow-hidden flex items-center justify-center cursor-ew-resize"
      >
        {activeThumbnail ? (
          <img
            src={activeThumbnail}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-100 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
            {isVid ? <Video className="w-6 h-6 mb-1 text-cyan-400" /> : isAud ? <Music className="w-6 h-6 mb-1 text-purple-400" /> : <ImageIcon className="w-6 h-6 mb-1 text-[#fbbf24]" />}
            <span className="text-[8px]">IDB STORED</span>
          </div>
        )}

        {/* Dynamic Cursor Scrub Needle & Timecode Badge */}
        {cursorX !== null && cursorTimecode && (
          <>
            {/* Vertical Scrubber Needle Line */}
            <div 
              className="absolute top-0 bottom-0 w-[1.5px] bg-[#fbbf24] z-20 pointer-events-none shadow-[0_0_6px_#fbbf24]"
              style={{ left: `${cursorX}px` }}
            />
            {/* Dynamic Timecode Badge pinned to cursor */}
            <div 
              className="absolute top-2 z-30 pointer-events-none -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-[#fbbf24] text-[8.5px] font-mono font-bold text-[#fbbf24] shadow-lg whitespace-nowrap"
              style={{ left: `${cursorX}px` }}
            >
              {cursorTimecode} • FRAME {((scrubIndex || 0) * 48) + 1}
            </div>
          </>
        )}

        {/* 6-Segment Filmstrip Indicator Bar along bottom of thumbnail */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60 flex z-10 pointer-events-none">
          {filmstripFrames.slice(0, 6).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full border-r border-black/40 transition-colors ${
                scrubIndex === idx ? 'bg-[#fbbf24]' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Top-Left: Multi-select Checkbox & Type Badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={(e) => onToggleSelect(e, item.id)}
            className="p-0.5 bg-black/80 hover:bg-black rounded-[1px] border border-white/20 text-white cursor-pointer"
            title={isSelected ? "Deselect" : "Select (Shift/Cmd+Click for Multi-Select)"}
          >
            {isSelected ? (
              <CheckSquare className="w-3 h-3 text-[#fbbf24]" />
            ) : (
              <Square className="w-3 h-3 text-zinc-400 hover:text-white" />
            )}
          </button>

          <span className="px-1 py-0.2 bg-black/80 backdrop-blur-xs text-[7.5px] font-bold text-white rounded-[1px] flex items-center gap-0.5 border border-white/10">
            {isVid ? <Video className="w-2.5 h-2.5 text-cyan-400" /> : isAud ? <Music className="w-2.5 h-2.5 text-purple-400" /> : <ImageIcon className="w-2.5 h-2.5 text-[#fbbf24]" />}
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

        {/* Bottom-Right Thumbnail Badge: Resolution & Duration */}
        <div className="absolute bottom-2 right-1.5 flex items-center gap-1 z-10">
          <span className="px-1 py-0.2 bg-black/80 text-[7px] font-bold text-amber-300 border border-amber-500/30 rounded-[1px]">
            {resolution}
          </span>
          {isVid && (
            <span className="px-1 py-0.2 bg-black/80 text-[7px] font-mono text-zinc-300 rounded-[1px]">
              {duration}
            </span>
          )}
        </div>

        {/* Hover Play / Preview Button (Centered) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPreview(item);
          }}
          className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-black/75 hover:bg-black border border-white/25 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-lg"
          title="Preview Media Modal"
        >
          <Play className="w-3.5 h-3.5 text-[#fbbf24] ml-0.5" />
        </button>
      </div>

      {/* 2. Metadata & Status Strip */}
      <div className="p-2 flex flex-col gap-1.5">
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
            <span className="text-[#fbbf24] font-bold flex items-center gap-0.5">
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
              className="bg-[#12121c] border border-[#272732] hover:border-[#fbbf24] text-[#fbbf24] text-[8px] font-mono font-bold py-1 px-1 rounded-[1px] outline-none cursor-pointer"
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
