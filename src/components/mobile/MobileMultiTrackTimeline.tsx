/**
 * @file /src/components/mobile/MobileMultiTrackTimeline.tsx
 * @description CapCut-style Mobile Multi-Track Timeline (~30% viewport height):
 * - Fixed centered white vertical playhead line
 * - Touch-scrollable Thumbnail Filmstrip Track (scrubs global sequence under playhead)
 * - + Add Audio Track (shows active track/BPM or triggers audio picker / opens Audio sheet)
 * - + Add Text / Title Track (shows active shot title or opens Title FX sheet)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Music, Type, Plus, Volume2 } from 'lucide-react';
import { AnthologyFrame } from '../../types/anthology';
import { getShotDurationSec } from '../../types/storyboard';
import { getShotProceduralSpec } from '../../data/proceduralCinemaEngine';
import { useStudioStore } from '../../core/store';
import { getShotMediaKey, resolveShotMediaEntry } from '../../services/handfilmMediaVault';
import { getCachedThumbnailUrl, isSvgPlaceholderUrl, isVideoSourceUrl } from '../../services/thumbnailEngine';
import { audioEngine } from '../../services/audioEngine';
import { playbackClock } from '../../utils/playbackClock';

export interface MobileMultiTrackTimelineProps {
  frames: AnthologyFrame[];
  currentIndex: number;
  slideTimeSec: number;
  isPlaying: boolean;
  detectedBpm: number;
  showTitles: boolean;
  onSelectFrame: (idx: number) => void;
  onScrubGlobalTime: (globalTimeSec: number) => void;
  onOpenAudioSheet: () => void;
  onOpenTitleSheet: () => void;
  onUploadAudioClick: () => void;
}

const PX_PER_SEC = 18;
const MIN_CLIP_PX = 56;
const MAX_CLIP_PX = 240;

export const MobileMultiTrackTimeline: React.FC<MobileMultiTrackTimelineProps> = ({
  frames,
  currentIndex,
  slideTimeSec,
  isPlaying,
  detectedBpm,
  showTitles,
  onSelectFrame,
  onScrubGlobalTime,
  onOpenAudioSheet,
  onOpenTitleSheet,
  onUploadAudioClick
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);
  const programScrollLockRef = useRef(false);
  const shotMediaMap = useStudioStore((s) => s.shotMediaMap);
  const [audioTrackName, setAudioTrackName] = useState<string | null>(() => {
    const a = audioEngine.getAnalysis();
    return a && a.fileName && a.fileName !== 'Cinematic_Track.wav' ? a.fileName : null;
  });

  useEffect(() => {
    const unsub = audioEngine.subscribeToAnalysis((analysis) => {
      if (analysis?.fileName && analysis.fileName !== 'Cinematic_Track.wav') {
        setAudioTrackName(analysis.fileName);
      }
    });
    return unsub;
  }, []);

  // Compute cumulative layout positions for each shot segment
  const segments = useMemo(() => {
    let accTime = 0;
    let accPx = 0;
    return frames.map((f, idx) => {
      const dur = getShotDurationSec(f, 12.0);
      const widthPx = Math.max(MIN_CLIP_PX, Math.min(MAX_CLIP_PX, Math.round(dur * PX_PER_SEC)));
      const seg = {
        idx,
        frame: f,
        startSec: accTime,
        durSec: dur,
        startPx: accPx,
        widthPx
      };
      accTime += dur;
      accPx += widthPx;
      return seg;
    });
  }, [frames]);

  const totalWidthPx = useMemo(
    () => segments.reduce((sum, s) => sum + s.widthPx, 0),
    [segments]
  );

  // Convert current (currentIndex, slideTimeSec) to pixel offset under centered playhead
  const activePlayheadPx = useMemo(() => {
    const seg = segments[currentIndex];
    if (!seg) return 0;
    const ratio = seg.durSec > 0 ? Math.max(0, Math.min(1, slideTimeSec / seg.durSec)) : 0;
    return seg.startPx + ratio * seg.widthPx;
  }, [segments, currentIndex, slideTimeSec]);

  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  // Keep centered playhead aligned with playback or shot jumps unless user is actively dragging timeline
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isUserScrollingRef.current) return;
    programScrollLockRef.current = true;
    el.scrollLeft = activePlayheadPx;
    const t = window.setTimeout(() => {
      programScrollLockRef.current = false;
    }, 40);
    return () => window.clearTimeout(t);
  }, [activePlayheadPx, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    return playbackClock.subscribe((snap) => {
      const el = scrollRef.current;
      if (!el || isUserScrollingRef.current) return;
      const seg = segmentsRef.current[snap.shotIndex];
      if (!seg) return;
      const ratio = seg.durSec > 0 ? Math.max(0, Math.min(1, snap.timeSec / seg.durSec)) : 0;
      programScrollLockRef.current = true;
      el.scrollLeft = seg.startPx + ratio * seg.widthPx;
      window.requestAnimationFrame(() => {
        programScrollLockRef.current = false;
      });
    });
  }, [isPlaying]);

  const handleScroll = () => {
    if (programScrollLockRef.current) return;
    const el = scrollRef.current;
    if (!el || segments.length === 0) return;

    isUserScrollingRef.current = true;
    if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = window.setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);

    const px = Math.max(0, Math.min(totalWidthPx, el.scrollLeft));
    // Map scroll pixel back to global time
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (px <= s.startPx + s.widthPx || i === segments.length - 1) {
        const localRatio = s.widthPx > 0 ? Math.max(0, Math.min(1, (px - s.startPx) / s.widthPx)) : 0;
        const targetGlobalSec = s.startSec + localRatio * s.durSec;
        onScrubGlobalTime(targetGlobalSec);
        break;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
    };
  }, []);

  const currentFrame = frames[currentIndex];
  const currentTitlePreview =
    currentFrame?.bengaliTitle || currentFrame?.title || `Shot ${currentIndex + 1}`;

  return (
    <section
      data-testid="mobile-multitrack-timeline"
      className="flex-1 min-h-[156px] w-full bg-[#070709] flex flex-col justify-between relative overflow-hidden select-none"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Subtle Top Time Ruler Labels */}
      <div className="h-[20px] shrink-0 px-3 flex items-center justify-between border-b border-white/[0.05] bg-[#0B0B0E]/80 text-[9px] font-mono text-[#71717A] tabular-nums">
        <span>
          TRACKS · {frames.length} SHOTS
        </span>
        <span className="text-[#F59E0B] font-bold">
          SHOT #{String(currentIndex + 1).padStart(3, '0')} · {getShotDurationSec(currentFrame, 12.0).toFixed(1)}s
        </span>
      </div>

      {/* Main Scrollable Track Stack with Centered Fixed White Playhead */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        {/* Centered Fixed White Playhead Line (CapCut signature) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
        >
          <div className="w-2.5 h-2.5 bg-white rotate-45 -mt-1 rounded-[1px] shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
          <div className="w-[2px] flex-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
        </div>

        {/* Horizontal Scrollable Track Container (50% padding left/right so 0s and end align at center line) */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar flex items-stretch"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className="flex flex-col justify-center gap-2 py-2 shrink-0"
            style={{
              paddingLeft: '50vw',
              paddingRight: '50vw',
              width: `calc(100vw + ${totalWidthPx}px)`
            }}
          >
            {/* TRACK 1: THUMBNAIL FILMSTRIP TRACK */}
            <div className="flex items-center h-[56px] rounded-lg overflow-hidden bg-[#111115] border border-white/[0.08]">
              {segments.map((seg) => {
                const isActive = seg.idx === currentIndex;
                const shotKey = getShotMediaKey(seg.frame, seg.idx);
                const media = resolveShotMediaEntry(shotMediaMap, seg.frame, undefined, seg.idx);
                const cachedThumb =
                  getCachedThumbnailUrl([seg.frame?.id, `shot_${seg.idx}`, seg.idx, media?.url, seg.frame?.imageUrl]) ||
                  (seg.frame?.thumbnailUrl && !isSvgPlaceholderUrl(seg.frame.thumbnailUrl) && !isVideoSourceUrl(seg.frame.thumbnailUrl)
                    ? seg.frame.thumbnailUrl
                    : '') ||
                  (!isVideoSourceUrl(seg.frame?.imageUrl || '') && !isSvgPlaceholderUrl(seg.frame?.imageUrl || '')
                    ? seg.frame?.imageUrl || ''
                    : '');
                const proc = getShotProceduralSpec(seg.idx);

                return (
                  <button
                    key={seg.frame.id ?? seg.idx}
                    type="button"
                    onClick={() => onSelectFrame(seg.idx)}
                    style={{
                      width: `${seg.widthPx}px`,
                      background: cachedThumb ? undefined : proc.palette.cssBackdrop
                    }}
                    className={`relative h-full shrink-0 border-r border-black/60 overflow-hidden text-left transition-all cursor-pointer ${
                      isActive
                        ? 'ring-2 ring-inset ring-[#F59E0B] z-10'
                        : 'opacity-85 active:opacity-100'
                    }`}
                  >
                    {cachedThumb && (
                      <img
                        src={cachedThumb}
                        alt={`Shot ${seg.idx + 1}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 pointer-events-none" />
                    <div className="relative z-10 h-full px-1.5 py-1 flex flex-col justify-between">
                      <span
                        className={`self-start px-1 rounded text-[8.5px] font-mono font-bold tabular-nums ${
                          isActive
                            ? 'bg-[#F59E0B] text-[#0B0B0D]'
                            : 'bg-black/65 text-[#E4E4E7]'
                        }`}
                      >
                        #{seg.idx + 1}
                      </span>
                      <span className="text-[8px] font-mono text-white/85 tabular-nums truncate">
                        {seg.durSec.toFixed(1)}s
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* TRACK 2: + ADD AUDIO TRACK */}
            <div className="flex items-center gap-1.5 h-[34px]">
              <button
                type="button"
                onClick={audioTrackName ? onOpenAudioSheet : onUploadAudioClick}
                style={{ width: `${Math.max(220, Math.min(totalWidthPx, 640))}px` }}
                className={`h-full rounded-md border px-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  audioTrackName
                    ? 'bg-emerald-950/45 border-emerald-500/40 text-emerald-200'
                    : 'bg-[#121217] active:bg-[#1A1A22] border-dashed border-white/[0.14] text-[#D4D4D8]'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {audioTrackName ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  )}
                  <Music className="w-3 h-3 text-[#8E8E93] shrink-0" />
                  <span className="font-mono text-[10px] font-bold truncate">
                    {audioTrackName ? audioTrackName : 'Add Audio'}
                  </span>
                </span>
                <span className="font-mono text-[9px] text-[#8E8E93] tabular-nums whitespace-nowrap shrink-0">
                  {detectedBpm} BPM
                </span>
              </button>
            </div>

            {/* TRACK 3: + ADD TEXT / TITLE TRACK */}
            <div className="flex items-center gap-1.5 h-[34px]">
              <button
                type="button"
                onClick={onOpenTitleSheet}
                style={{ width: `${Math.max(220, Math.min(totalWidthPx, 640))}px` }}
                className={`h-full rounded-md border px-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  showTitles
                    ? 'bg-[#F59E0B]/12 border-[#F59E0B]/40 text-[#FDE68A]'
                    : 'bg-[#121217] active:bg-[#1A1A22] border-dashed border-white/[0.14] text-[#D4D4D8]'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Plus className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <Type className="w-3 h-3 text-[#F59E0B] shrink-0" />
                  <span className="font-bangla text-[11px] font-bold truncate">
                    {showTitles ? currentTitlePreview : 'Add Text / Title'}
                  </span>
                </span>
                <span className="font-mono text-[9px] uppercase text-[#F59E0B]/85 whitespace-nowrap shrink-0">
                  {showTitles ? 'TITLE FX' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
