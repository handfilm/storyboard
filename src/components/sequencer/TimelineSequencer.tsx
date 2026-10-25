/**
 * @file /src/components/sequencer/TimelineSequencer.tsx
 * @description Dedicated 12.0S Sequencer Panel in "Google Flow" Tactical Aesthetic.
 * 
 * Strict Directives:
 * - Strict 12.0-second time allocation (288 frames @ 24fps) per card across 100 slides.
 * - Controls card order, scene labels, text cues, audio cues, and asset bindings.
 * - Seamless integration with SEQUENCE (ANIMATIC) and SOLO SCRUB modes.
 * - Permanent visibility: Playback buttons (PLAY, PAUSE, -1F, +1F), scrubbing strip, live timecode.
 * - Re-skinned into tactical pill badges: rounded capsules (`rounded-full`), deep obsidian containers
 *   (`#0E0E12` with subtle `#1C1C24` 1px borders), and vivid warm-amber/gold active accents (`#F5A623`, `#D97706`).
 * - Strictly NO hover scaling or tooltip popovers.
 * - Drag-and-drop raw video ingestion directly onto cards to store in IndexedDB.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SlideDraft } from '../../types/project';
import { PlaybackMode } from '../../types/editor';
import {
  calculateMasterSequenceDuration,
  clampShotDuration,
  formatDurationPillValue,
  formatRuntimeTimecode,
  getCumulativeShotOffsets,
  getShotDurationSec,
  getShotFrameCount,
  getShotTargetFps,
  resolveGlobalTimeToShot
} from '../../types/storyboard';
import { studioDraftDb } from '../../services/db';
import { ReelsSequenceBoard } from '../ReelsSequenceBoard';
import { CadenceSelectorPill } from '../controls/CadenceSelectorPill';
import { extractVideoPoster, thumbnailMemoryCache } from '../../services/thumbnailEngine';
import {
  Play,
  Pause,
  Plus,
  SkipBack,
  SkipForward,
  Clock,
  Upload,
  X,
  Layers,
  Repeat,
  Activity,
  Music
} from 'lucide-react';

interface TimelineSequencerProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  slideTimeSec: number; // 0.0s to activeSlide.durationSec
  onSelectSlide: (index: number) => void;
  onTogglePlay: () => void;
  onStepFrame: (forward: boolean) => void;
  onScrubSlideTime: (timeSec: number) => void;
  onScrubGlobalTime?: (globalTimeSec: number) => void;
  onSelectPlaybackMode: (mode: PlaybackMode) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onReorderSlides: (reordered: SlideDraft[]) => void;
  onUpdateSlide: (index: number, partial: Partial<SlideDraft>) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  onMatchAudioBeats?: () => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  onLoadAudioFile?: (file: File) => void;
  onUploadMedia?: (index: number, file: File) => void;
  className?: string;
}

export const TimelineSequencer: React.FC<TimelineSequencerProps> = ({
  slides,
  activeSlideIndex,
  playbackMode,
  isPlaying,
  slideTimeSec,
  onSelectSlide,
  onTogglePlay,
  onStepFrame,
  onScrubSlideTime,
  onScrubGlobalTime,
  onSelectPlaybackMode,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onReorderSlides,
  onUpdateSlide,
  onApplyDurationToAll,
  onMatchAudioBeats,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  onLoadAudioFile,
  onUploadMedia,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSoundCue, setEditSoundCue] = useState('');
  const [editDurationSec, setEditDurationSec] = useState('12.0');
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
  const [hoveredScrubPreview, setHoveredScrubPreview] = useState<{
    shotIndex: number;
    timeSec: number;
    clientX: number;
    topY: number;
  } | null>(null);

  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));
  const activeSlide = slides[safeIndex];
  const activeSlideDurationSec = getShotDurationSec(activeSlide, 12.0);
  const activeSlideFps = getShotTargetFps(activeSlide, 24);
  const activeSlideFrames = getShotFrameCount(activeSlideDurationSec, activeSlideFps);

  const shotOffsets = useMemo(() => getCumulativeShotOffsets(slides), [slides]);
  const totalDurationSec = useMemo(() => calculateMasterSequenceDuration(slides), [slides]);
  const activeShotStartSec = shotOffsets[safeIndex]?.startSec ?? 0;
  const globalSec = Math.min(totalDurationSec, activeShotStartSec + slideTimeSec);

  // Auto-scroll timeline track to keep current slide in view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-card-index="${safeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  const formatTimecode = (sec: number, fps: number = 24) => formatRuntimeTimecode(sec, fps);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null) return;
    const parsedDur = clampShotDuration(Number(editDurationSec) || 12.0);
    onUpdateSlide(editingIndex, {
      titleEn: editTitleEn.trim(),
      titleBn: editTitleBn.trim(),
      directorNotes: editNotes.trim(),
      soundCue: editSoundCue.trim(),
      duration: parsedDur,
      durationSec: parsedDur
    });
    setEditingIndex(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && uploadTargetIndex !== null && onUploadMedia) {
      const file = e.target.files[0];
      try {
        await studioDraftDb.putMediaBlob(`media_shot_${uploadTargetIndex + 1}_${Date.now()}`, file, file.type, file.name);
        if (file.type.startsWith('video/')) {
          try {
            const poster = await extractVideoPoster(file);
            thumbnailMemoryCache.set(slides[uploadTargetIndex]?.id || `shot_${uploadTargetIndex}`, poster.base64);
          } catch {
            // optional poster cache
          }
        }
      } catch {
        // ignore IndexedDB quota warnings
      }
      onUploadMedia(uploadTargetIndex, file);
    }
    e.target.value = '';
    setUploadTargetIndex(null);
  };

  return (
    <div className={`w-full h-full flex flex-col bg-[#0E0E12] border-t border-[#1C1C24] font-mono select-none overflow-hidden ${className}`}>
      {/* Top Header & Tactical Mode Command Dock */}
      <div className="min-h-[40px] px-4 py-1 bg-[#0E0E12] border-b border-[#1C1C24] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-[#EDEDED]">
            <Layers className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="tracking-wider">ELASTIC SEQUENCER</span>
          </div>

          <span className="text-white/20">·</span>

          {/* Tactical Segmented Capsule Mode Switcher */}
          <div className="flex items-center bg-[#14141B] p-0.5 rounded-full border border-[#23232E] text-[10.5px]">
            <button
              type="button"
              onClick={() => onSelectPlaybackMode('sequence')}
              className={`px-3 py-0.5 rounded-full transition-colors duration-150 ease-out cursor-pointer font-bold active:scale-[0.98] ${
                playbackMode === 'sequence'
                  ? 'bg-[#F5A623] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Seamless auto-advance across variable-duration slides"
            >
              ANIMATIC
            </button>
            <button
              type="button"
              onClick={() => onSelectPlaybackMode('solo')}
              className={`px-3 py-0.5 rounded-full transition-colors duration-150 ease-out cursor-pointer font-bold active:scale-[0.98] ${
                playbackMode === 'solo'
                  ? 'bg-[#F5A623] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Isolates playback strictly within active slide's duration range"
            >
              SOLO SCRUB
            </button>
          </div>

          {/* Current Frame Index & Elastic Timing Specs */}
          <div className="flex items-center gap-1.5 text-[10.5px] text-white/70 tabular-nums">
            <span className="text-white/40">SLIDE:</span>
            <span className="text-[#F5A623] font-bold">
              SH{String(safeIndex + 1).padStart(3, '0')}
            </span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{String(slides.length).padStart(3, '0')}</span>
            <span className="text-[9.5px] text-white/45 ml-0.5">
              ({activeSlideFrames}F @ {activeSlideFps}fps)
            </span>
          </div>
        </div>

        {/* Right: Sequence Rhythm Actions, Total Runtime & Add Card */}
        <div className="flex items-center gap-2 flex-wrap">
          {onApplyDurationToAll && (
            <button
              type="button"
              onClick={() => onApplyDurationToAll(activeSlideDurationSec)}
              className="px-2.5 py-1 rounded-full bg-[#14141B] hover:bg-[#1E1E2A] border border-[#23232E] hover:border-[#F5A623]/60 text-[10px] text-white/75 hover:text-[#FFE066] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title="Ripple apply active shot duration across all slides"
            >
              <Repeat className="w-3 h-3 text-[#F5A623]" />
              <span className="hidden xl:inline">Ripple Apply Duration to All</span>
              <span className="xl:hidden">Ripple All</span>
            </button>
          )}

          {onMatchAudioBeats && (
            <button
              type="button"
              onClick={onMatchAudioBeats}
              className="px-2.5 py-1 rounded-full bg-[#14141B] hover:bg-[#1E1E2A] border border-[#23232E] hover:border-cyan-400/60 text-[10px] text-white/75 hover:text-cyan-200 font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
              title="Quantize all slide durations to detected audio waveform beats"
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="hidden xl:inline">Match Audio Waveform Beats</span>
              <span className="xl:hidden">Match Beats</span>
            </button>
          )}

          {onToggleSnapToBeat && (
            <button
              type="button"
              onClick={onToggleSnapToBeat}
              className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                isSnapToBeat
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-[#14141B] hover:bg-[#1E1E2A] border-[#23232E] text-white/65 hover:text-white'
              }`}
              title="Magnetically snap slide stretch and split operations to nearest beat peak"
            >
              <Music className="w-3 h-3 text-cyan-400" />
              <span>SNAP CUTS TO BEATS</span>
            </button>
          )}

          {onLoadAudioFile && (
            <>
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="px-2.5 py-1 rounded-full bg-[#14141B] hover:bg-[#1E1E2A] border border-[#23232E] text-[10px] text-white/70 hover:text-[#FFE066] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                title="Attach MP3/WAV track for offline beat detection"
              >
                <Upload className="w-3 h-3 text-[#F5A623]" />
                <span>Track</span>
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onLoadAudioFile(e.target.files[0]);
                  }
                  e.target.value = '';
                }}
              />
            </>
          )}

          <div className="flex items-center gap-1.5 text-[10.5px] tabular-nums">
            <Clock className="w-3 h-3 text-[#F5A623]" />
            <span className="text-white/40">TOTAL:</span>
            <span className="text-[#EDEDED] font-bold">{formatTimecode(totalDurationSec, activeSlideFps)}</span>
          </div>

          <button
            type="button"
            onClick={onAddSlide}
            className="px-3 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] hover:text-[#F5A623] border border-[#242432] text-[10.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>+ SHOT CARD</span>
          </button>
        </div>
      </div>

      {/* Global & Local Scrubbing Strip + Quick Cadence Selector */}
      <div className="px-4 py-2 bg-[#0E0E12] border-b border-[#1C1C24] flex items-center gap-3 text-xs shrink-0">
        {/* Play/Pause, Step Buttons & In-Player Quick Cadence Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-2.5 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-[10.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title={`Step Back 1 Frame (1/${activeSlideFps}s)`}
          >
            <SkipBack className="w-3 h-3 text-[#F5A623]" />
            <span>-1F</span>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98] shadow-sm ${
              isPlaying
                ? 'bg-[#F5A623] text-black shadow-[0_0_12px_rgba(245,166,35,0.35)]'
                : 'bg-[#1C1C26] text-white border border-[#303042]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(true)}
            className="px-2.5 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-[10.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title={`Step Forward 1 Frame (1/${activeSlideFps}s)`}
          >
            <SkipForward className="w-3 h-3 text-[#F5A623]" />
            <span>+1F</span>
          </button>

          <CadenceSelectorPill
            durationSec={activeSlideDurationSec}
            targetFps={activeSlideFps}
            onChangeDuration={(dur) => onUpdateSlide(safeIndex, { duration: dur, durationSec: dur })}
            onChangeTargetFps={(fps) => onUpdateSlide(safeIndex, { targetFps: fps })}
            onApplyDurationToAll={onApplyDurationToAll}
            isSnapToBeat={isSnapToBeat}
            onToggleSnapToBeat={onToggleSnapToBeat}
          />
        </div>

        {/* Dynamic Dual-Mode Scrubber with Shot Index Markers & Floating Thumbnail Popup */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 relative">
          <div className="flex items-center justify-between text-[10px] text-white/50 tabular-nums">
            <span className="font-bold text-[#F5A623] truncate">
              {playbackMode === 'solo'
                ? `SOLO SCRUB: SH${String(safeIndex + 1).padStart(3, '0')} (0.0s - ${formatDurationPillValue(activeSlideDurationSec)})`
                : 'SEQUENCE GLOBAL SCRUB'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[#F5A623] font-bold">{formatTimecode(slideTimeSec, activeSlideFps)}</span>
              <span className="text-white/20">/</span>
              <span className="text-white/50">{formatTimecode(activeSlideDurationSec, activeSlideFps)}</span>
              <span className="text-white/20">·</span>
              <span className="text-[#EDEDED]">GLOBAL: {formatTimecode(globalSec, activeSlideFps)}</span>
            </div>
          </div>

          <div
            className="relative flex items-center py-1 py-1!"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
              const maxRange = Math.max(0.5, playbackMode === 'solo' ? activeSlideDurationSec : totalDurationSec);
              const hoverVal = ratio * maxRange;
              if (playbackMode === 'solo') {
                setHoveredScrubPreview({
                  shotIndex: safeIndex,
                  timeSec: hoverVal,
                  clientX: e.clientX,
                  topY: rect.top
                });
              } else {
                const resolved = resolveGlobalTimeToShot(slides, hoverVal);
                setHoveredScrubPreview({
                  shotIndex: resolved.shotIndex,
                  timeSec: hoverVal,
                  clientX: e.clientX,
                  topY: rect.top
                });
              }
            }}
            onMouseLeave={() => setHoveredScrubPreview(null)}
          >
            {/* Shot Boundary Index Tick Markers along Global Scrubber */}
            {playbackMode !== 'solo' && totalDurationSec > 0 && slides.length <= 120 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 pointer-events-none flex items-center">
                {shotOffsets.map((offset, sIdx) => {
                  const pct = (offset.startSec / totalDurationSec) * 100;
                  return (
                    <span
                      key={sIdx}
                      style={{ left: `${pct}%` }}
                      className={`absolute w-[1px] ${
                        sIdx === safeIndex ? 'h-2.5 bg-[#FFE066]' : 'h-1.5 bg-white/20'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            <input
              type="range"
              min="0"
              max={Math.max(0.5, playbackMode === 'solo' ? activeSlideDurationSec : totalDurationSec)}
              step={1 / activeSlideFps}
              value={Math.min(
                playbackMode === 'solo' ? activeSlideDurationSec : totalDurationSec,
                playbackMode === 'solo' ? slideTimeSec : globalSec
              )}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (playbackMode === 'solo') {
                  onScrubSlideTime(val);
                } else if (onScrubGlobalTime) {
                  onScrubGlobalTime(val);
                } else {
                  const resolved = resolveGlobalTimeToShot(slides, val);
                  if (resolved.shotIndex !== safeIndex) {
                    onSelectSlide(resolved.shotIndex);
                  }
                  onScrubSlideTime(resolved.localTimeSec);
                }
              }}
              className="relative z-10 w-full h-1.5 bg-[#1C1C26] rounded-full appearance-none accent-[#F5A623] cursor-pointer"
              aria-label="Timeline sequence scrubber"
            />
          </div>

          {/* Floating Scrubber Thumbnail Popup */}
          {hoveredScrubPreview && slides[hoveredScrubPreview.shotIndex] && (() => {
            const pSlide = slides[hoveredScrubPreview.shotIndex];
            const pNum = String(hoveredScrubPreview.shotIndex + 1).padStart(3, '0');
            const pThumb =
              thumbnailMemoryCache.get(pSlide.id) ||
              thumbnailMemoryCache.get(`shot_${hoveredScrubPreview.shotIndex}`) ||
              (!pSlide.isVideo ? pSlide.remoteUrl || '' : '');
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
            const clampedX = Math.max(96, Math.min(vw - 96, hoveredScrubPreview.clientX));
            return (
              <div
                role="tooltip"
                style={{
                  position: 'fixed',
                  left: `${clampedX}px`,
                  top: `${Math.max(88, hoveredScrubPreview.topY - 8)}px`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: 9998
                }}
                className="w-44 bg-[#090A10]/95 backdrop-blur-xl border border-[#F5A623]/55 rounded-[4px] p-1.5 p-1.5! shadow-[0_14px_36px_rgba(0,0,0,0.94)] pointer-events-none select-none transform-gpu"
              >
                <div className="relative w-full aspect-[16/9] rounded-[2px] overflow-hidden bg-[#050508] border border-white/10">
                  {pThumb ? (
                    <img
                      src={pThumb}
                      alt={`Shot ${pNum}`}
                      referrerPolicy="no-referrer"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : pSlide.isVideo && pSlide.remoteUrl ? (
                    <video
                      src={pSlide.remoteUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0B0C12] text-[8px] text-zinc-500">
                      EMPTY FRAME
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-between px-1.5 px-1.5! pb-0.5 pb-0.5! font-mono text-[8px] tabular-nums">
                    <span className="font-bold text-[#FFE066]">SH{pNum}</span>
                    <span className="text-zinc-300">{formatTimecode(hoveredScrubPreview.timeSec, activeSlideFps)}</span>
                  </div>
                </div>
                <div className="pt-1 pt-1! px-0.5 px-0.5! text-[9.5px] font-semibold text-white truncate">
                  {pSlide.titleEn || `Shot ${hoveredScrubPreview.shotIndex + 1}`}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Main Contextual Ribbon with Viewport Virtualization, Right-Edge Resize Handles & Hover Scrubbing */}
      <ReelsSequenceBoard
        slides={slides}
        activeSlideIndex={safeIndex}
        playbackMode={playbackMode}
        isPlaying={isPlaying}
        slideTimeSec={slideTimeSec}
        onSelectSlide={onSelectSlide}
        onReorderSlides={onReorderSlides}
        onUpdateSlide={onUpdateSlide}
        onApplyDurationToAll={onApplyDurationToAll}
        onMatchAudioBeats={onMatchAudioBeats}
        isSnapToBeat={isSnapToBeat}
        onToggleSnapToBeat={onToggleSnapToBeat}
        onLoadAudioFile={onLoadAudioFile}
        showSequenceActionBar={false}
        onUploadMedia={onUploadMedia}
        onDuplicateSlide={onDuplicateSlide}
        onDeleteSlide={onDeleteSlide}
        onEditSlide={(idx) => {
          const target = slides[idx];
          if (target) {
            setEditingIndex(idx);
            setEditTitleEn(target.titleEn || '');
            setEditTitleBn(target.titleBn || '');
            setEditNotes(target.directorNotes || '');
            setEditSoundCue(target.soundCue || '');
            setEditDurationSec(String(getShotDurationSec(target, 12.0)));
          }
        }}
        onStepFrame={onStepFrame}
        className="flex-1"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Quick Modal for Scene Labels, Duration & Text Cues Editing */}
      {editingIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setEditingIndex(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0E0E12] border border-[#1C1C24] rounded-2xl p-5 shadow-2xl flex flex-col gap-3 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#1C1C24] pb-2">
              <span className="font-bold text-[#EDEDED]">
                Edit Shot Card [SH{String(editingIndex + 1).padStart(3, '0')}]
              </span>
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-[10px] text-white/50">English Scene Label</label>
                <input
                  type="text"
                  value={editTitleEn}
                  onChange={(e) => setEditTitleEn(e.target.value)}
                  placeholder="e.g. Master Anamorphic Reveal"
                  className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-white outline-none focus:border-[#F5A623]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/50">Duration (sec)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="1800"
                  value={editDurationSec}
                  onChange={(e) => setEditDurationSec(e.target.value)}
                  className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-[#FFE066] tabular-nums outline-none focus:border-[#F5A623]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Bengali Scene Label (Optional)</label>
              <input
                type="text"
                value={editTitleBn}
                onChange={(e) => setEditTitleBn(e.target.value)}
                placeholder="e.g. দৃশ্য ০১ · সূচনা ফ্রেম"
                className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-[#F5A623] font-serif outline-none focus:border-[#F5A623]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Director Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Camera movement, actor beats, pacing cue..."
                className="bg-[#14141B] border border-[#23232E] rounded-xl px-3.5 py-2 text-white/90 outline-none focus:border-[#F5A623] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50">Sound Cue & Music Track</label>
              <input
                type="text"
                value={editSoundCue}
                onChange={(e) => setEditSoundCue(e.target.value)}
                placeholder="e.g. Deep sub bass rumble, synthetic strings crescendo"
                className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-[#38BDF8] outline-none focus:border-[#F5A623]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C24]">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-full cursor-pointer active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#F5A623] hover:bg-[#D97706] text-black font-bold rounded-full cursor-pointer active:scale-[0.98]"
              >
                Save Card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

