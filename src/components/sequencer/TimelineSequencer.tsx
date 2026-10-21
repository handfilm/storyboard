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

import React, { useRef, useState, useEffect } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
import { studioDraftDb } from '../../services/db';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  SkipBack, 
  SkipForward, 
  Clock, 
  Upload, 
  Edit3, 
  Check, 
  X, 
  Volume2, 
  Layers
} from 'lucide-react';

interface TimelineSequencerProps {
  slides: SlideDraft[];
  activeSlideIndex: number;
  playbackMode: PlaybackMode;
  isPlaying: boolean;
  slideTimeSec: number; // 0.0s to 12.0s
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
  onUploadMedia,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editTitleBn, setEditTitleBn] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSoundCue, setEditSoundCue] = useState('');
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);

  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));

  // Auto-scroll timeline track to keep current slide in view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-card-index="${safeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [safeIndex]);

  const formatTimecode = (sec: number) => {
    const totalFrames = Math.max(0, Math.floor(sec * 24));
    const ff = String(totalFrames % 24).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    return `${mm}:${ss}:${ff}`;
  };

  const totalDurationSec = slides.length * SLIDE_DURATION_SEC;
  const globalSec = (safeIndex * SLIDE_DURATION_SEC) + slideTimeSec;

  const handleStartEdit = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = slides[idx];
    if (!target) return;
    setEditingIndex(idx);
    setEditTitleEn(target.titleEn || '');
    setEditTitleBn(target.titleBn || '');
    setEditNotes(target.directorNotes || '');
    setEditSoundCue(target.soundCue || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null) return;
    onUpdateSlide(editingIndex, {
      titleEn: editTitleEn.trim(),
      titleBn: editTitleBn.trim(),
      directorNotes: editNotes.trim(),
      soundCue: editSoundCue.trim()
    });
    setEditingIndex(null);
  };

  const handleMove = (fromIndex: number, toIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (toIndex < 0 || toIndex >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderSlides(reordered);
    onSelectSlide(toIndex);
  };

  const handleTriggerUpload = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadTargetIndex(idx);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && uploadTargetIndex !== null && onUploadMedia) {
      onUploadMedia(uploadTargetIndex, e.target.files[0]);
    }
    e.target.value = '';
    setUploadTargetIndex(null);
  };

  // Drag and drop onto card
  const handleCardDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetIndex(idx);
  };

  const handleCardDragLeave = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragTargetIndex === idx) {
      setDragTargetIndex(null);
    }
  };

  const handleCardDrop = async (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTargetIndex(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0] && onUploadMedia) {
      const file = e.dataTransfer.files[0];
      try {
        await studioDraftDb.putMediaBlob(`media_shot_${idx + 1}_${Date.now()}`, file, file.type, file.name);
      } catch (err) {
        console.warn('[TimelineSequencer] Blob storage error:', err);
      }
      onUploadMedia(idx, file);
    }
  };

  return (
    <div className={`w-full h-full flex flex-col bg-[#0E0E12] border-t border-[#1C1C24] font-mono select-none overflow-hidden ${className}`}>
      {/* Top Header & Tactical Mode Command Dock */}
      <div className="h-10 px-4 bg-[#0E0E12] border-b border-[#1C1C24] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-[#EDEDED]">
            <Layers className="w-3.5 h-3.5 text-[#F5A623]" />
            <span className="tracking-wider uppercase">12.0S SEQUENCER</span>
          </div>

          <span className="text-white/20">|</span>

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
              title="Seamless auto-advance across Slide 001-100 every 12.0s"
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
              title="Isolates playback strictly within that slide's 12.0s range"
            >
              SOLO SCRUB
            </button>
          </div>

          <span className="text-white/20">|</span>

          {/* Current Frame Index & Timing Specs Pill */}
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#14141B] border border-[#23232E] text-[10.5px] text-white/70">
            <span className="text-white/40">SLIDE:</span>
            <span className="text-[#F5A623] font-bold">
              SH{String(safeIndex + 1).padStart(3, '0')}
            </span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{String(slides.length).padStart(3, '0')}</span>
            <span className="text-[9.5px] text-white/40 ml-1">(288F @ 24fps)</span>
          </div>
        </div>

        {/* Right: Add Slide & Total Duration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#14141B] border border-[#23232E] text-[10.5px]">
            <Clock className="w-3 h-3 text-white/40" />
            <span className="text-white/40">RUN:</span>
            <span className="text-[#EDEDED] font-bold">{formatTimecode(totalDurationSec)}</span>
          </div>

          <button
            type="button"
            onClick={onAddSlide}
            className="px-3 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] hover:text-[#F5A623] border border-[#242432] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>+ 12.0S CARD</span>
          </button>
        </div>
      </div>

      {/* Global & Local Scrubbing Strip (Permanent Contrast, Google Flow Style) */}
      <div className="px-4 py-2 bg-[#0E0E12] border-b border-[#1C1C24] flex items-center gap-4 text-xs shrink-0">
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStepFrame(false)}
            className="px-2.5 py-1 rounded-full bg-[#16161F] hover:bg-[#20202C] text-[#EDEDED] border border-[#242432] text-[10.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors duration-150 ease-out active:scale-[0.98]"
            title="Step Back 1 Frame (1/24s)"
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
            title="Step Forward 1 Frame (1/24s)"
          >
            <SkipForward className="w-3 h-3 text-[#F5A623]" />
            <span>+1F</span>
          </button>
        </div>

        {/* Dynamic Dual-Mode Scrubber */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span className="font-bold text-[#F5A623]">
              {playbackMode === 'solo' 
                ? `SOLO SCRUB: SH${String(safeIndex + 1).padStart(3, '0')} (00:00:00 - 00:00:12)` 
                : 'SEQUENCE GLOBAL SCRUB'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#F5A623] font-bold">{formatTimecode(slideTimeSec)}</span>
              <span className="text-white/20">/</span>
              <span className="text-white/50">00:12:00</span>
              <span className="text-white/20">|</span>
              <span className="text-[#EDEDED]">GLOBAL: {formatTimecode(globalSec)}</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={playbackMode === 'solo' ? SLIDE_DURATION_SEC : totalDurationSec}
            step="0.041666"
            value={playbackMode === 'solo' ? slideTimeSec : globalSec}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (playbackMode === 'solo') {
                onScrubSlideTime(val);
              } else {
                if (onScrubGlobalTime) {
                  onScrubGlobalTime(val);
                } else {
                  const targetSlide = Math.min(slides.length - 1, Math.floor(val / SLIDE_DURATION_SEC));
                  const targetSec = val % SLIDE_DURATION_SEC;
                  if (targetSlide !== safeIndex) onSelectSlide(targetSlide);
                  onScrubSlideTime(targetSec);
                }
              }
            }}
            className="w-full h-1.5 bg-[#1C1C26] rounded-full appearance-none accent-[#F5A623] cursor-pointer"
            aria-label="Timeline sequence scrubber"
          />
        </div>
      </div>

      {/* Main 100-Slide Contextual Ribbon (Strictly NO Hover Scaling, High Visual Contrast) */}
      <div 
        ref={containerRef}
        className="flex-1 p-3 overflow-x-auto no-scrollbar flex items-center gap-3 bg-[#0B0B0F]"
      >
        {slides.map((slide, idx) => {
          const isActive = idx === safeIndex;
          const epNum = String(idx + 1).padStart(3, '0');
          const isDropActive = dragTargetIndex === idx;

          return (
            <div
              key={slide.id || idx}
              data-card-index={idx}
              onClick={() => onSelectSlide(idx)}
              onDragOver={(e) => handleCardDragOver(idx, e)}
              onDragLeave={(e) => handleCardDragLeave(idx, e)}
              onDrop={(e) => handleCardDrop(idx, e)}
              className={`shrink-0 w-64 h-44 rounded-xl border transition-colors duration-150 ease-out cursor-pointer relative flex flex-col justify-between p-3 overflow-hidden ${
                isDropActive
                  ? 'border-2 border-dashed border-[#F5A623] bg-[#14141B]'
                  : isActive
                  ? 'bg-[#14141C] border-[#F5A623] shadow-[0_4px_20px_rgba(245,166,35,0.25)]'
                  : 'bg-[#101016] hover:bg-[#15151F] border-[#1C1C26]'
              }`}
            >
              {/* Media Thumbnail Backdrop */}
              {slide.remoteUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
                  style={{ backgroundImage: `url(${slide.remoteUrl})` }}
                />
              )}

              {/* Top Row: Scene ID Tactical Badge, 12.0s Duration Badge, Order Move Buttons */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-[#F5A623] text-black font-black' : 'bg-[#1C1C26] text-white/80'
                  }`}>
                    SH{epNum}
                  </span>
                  <span className="text-[#F5A623] text-[10px] font-bold">12.0s</span>
                  <span className="text-white/40 text-[9px]">(288F)</span>
                </div>

                <div className="flex items-center gap-0.5">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleMove(idx, idx - 1, e)}
                      className="p-1 rounded-full text-white/40 hover:text-white transition-colors active:scale-[0.98]"
                      title="Move card left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < slides.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleMove(idx, idx + 1, e)}
                      className="p-1 rounded-full text-white/40 hover:text-white transition-colors active:scale-[0.98]"
                      title="Move card right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Middle: Scene Labels & Text Cues */}
              <div className="relative z-10 my-auto flex flex-col gap-0.5">
                {slide.titleBn && (
                  <p className="text-xs text-[#F5A623] font-serif font-bold truncate">
                    {slide.titleBn}
                  </p>
                )}
                <p className="text-xs text-[#EDEDED] font-mono font-bold truncate">
                  {slide.titleEn || `Scene Shot ${epNum}`}
                </p>

                {/* Text Cues: Director Notes & Sound Cue */}
                {slide.directorNotes && (
                  <p className="text-[10px] text-white/50 font-mono line-clamp-1">
                    Dir: {slide.directorNotes}
                  </p>
                )}
                {slide.soundCue && (
                  <p className="text-[9.5px] text-[#38BDF8] font-mono line-clamp-1 flex items-center gap-1">
                    <Volume2 className="w-3 h-3 shrink-0" />
                    <span>{slide.soundCue}</span>
                  </p>
                )}
              </div>

              {/* Bottom: Asset Binding & Card Action Buttons */}
              <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40 border-t border-[#1C1C26] pt-1.5">
                <button
                  type="button"
                  onClick={(e) => handleTriggerUpload(idx, e)}
                  className="hover:text-[#F5A623] transition-colors flex items-center gap-1 font-bold active:scale-[0.98]"
                  title="Bind media asset (image/video)"
                >
                  <Upload className="w-3 h-3 text-[#F5A623]" />
                  <span>{slide.remoteUrl ? 'REPLACE' : 'BIND MEDIA'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(idx, e)}
                    className="hover:text-[#F5A623] text-white/50 transition-colors p-1 rounded-full active:scale-[0.98]"
                    title="Edit scene labels & text cues"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSlide(idx);
                    }}
                    className="hover:text-[#F5A623] text-white/50 transition-colors p-1 rounded-full active:scale-[0.98]"
                    title="Duplicate 12.0s card"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(idx);
                      }}
                      className="hover:text-red-400 text-white/50 transition-colors p-1 rounded-full active:scale-[0.98]"
                      title="Delete card"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Quick Modal for Scene Labels & Text Cues Editing */}
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
              <span className="font-bold text-[#EDEDED] uppercase">
                Edit 12.0s Card [SH{String(editingIndex + 1).padStart(3, '0')}]
              </span>
              <button 
                type="button" 
                onClick={() => setEditingIndex(null)} 
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">English Scene Label</label>
              <input
                type="text"
                value={editTitleEn}
                onChange={(e) => setEditTitleEn(e.target.value)}
                placeholder="e.g. Master Anamorphic Reveal"
                className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-white outline-none focus:border-[#F5A623]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Bengali Scene Label (Optional)</label>
              <input
                type="text"
                value={editTitleBn}
                onChange={(e) => setEditTitleBn(e.target.value)}
                placeholder="e.g. দৃশ্য ০১ // সূচনা ফ্রেম"
                className="bg-[#14141B] border border-[#23232E] rounded-full px-3.5 py-1.5 text-[#F5A623] font-serif outline-none focus:border-[#F5A623]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Director Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Camera movement, actor beats, pacing cue..."
                className="bg-[#14141B] border border-[#23232E] rounded-xl px-3.5 py-2 text-white/90 outline-none focus:border-[#F5A623] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Sound Cue & Music Track</label>
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
