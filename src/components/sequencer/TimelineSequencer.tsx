/**
 * @file /src/components/sequencer/TimelineSequencer.tsx
 * @description Dedicated 12.0S Sequencer Panel for RAWx Storyboard Studio.
 * 
 * Strict Directives:
 * - Strict 12.0-second time allocation (288 frames @ 24fps) per card.
 * - Controls card order, scene labels, text cues, and asset bindings.
 * - Seamless integration with SEQUENCE (ANIMATIC) and SOLO SCRUB modes.
 * - Clicking any card isolates playback strictly within that slide's 12.0s range.
 * - Timeline scrubber and frame step buttons (-1F / +1F) scrub locally without triggering slide change.
 * - Strictly NO hover scaling or tooltip popovers.
 */

import React, { useRef, useState, useEffect } from 'react';
import { SlideDraft, AspectRatioType } from '../../types/project';
import { PlaybackMode, SLIDE_DURATION_SEC, SLIDE_TOTAL_FRAMES_24FPS } from '../../types/editor';
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
  Film,
  Layers,
  Sparkles
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

  const safeIndex = Math.max(0, Math.min(slides.length - 1, activeSlideIndex));
  const activeSlide = slides[safeIndex];

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
    const totalFrames = Math.floor(sec * 24);
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

  return (
    <div className={`w-full h-full flex flex-col bg-[#0B0B0F] border-t border-[#242430] font-mono select-none overflow-hidden ${className}`}>
      {/* Top Header & Mode Command Dock */}
      <div className="h-10 px-4 bg-[#14141C] border-b border-[#22222C] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-[#E6E6E6]">
            <Layers className="w-3.5 h-3.5 text-[#E5A919]" />
            <span className="tracking-wider uppercase">12.0S SEQUENCER</span>
          </div>

          <span className="text-white/20">|</span>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#09090D] p-0.5 rounded border border-[#2B2B36] text-[10.5px]">
            <button
              onClick={() => onSelectPlaybackMode('sequence')}
              className={`px-3 py-1 rounded transition-colors duration-150 ease-out cursor-pointer font-bold ${
                playbackMode === 'sequence'
                  ? 'bg-[#E5A919] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Seamless auto-advance across Slide 001 through N every 12.0s"
            >
              SEQUENCE (ANIMATIC)
            </button>
            <button
              onClick={() => onSelectPlaybackMode('solo')}
              className={`px-3 py-1 rounded transition-colors duration-150 ease-out cursor-pointer font-bold ${
                playbackMode === 'solo'
                  ? 'bg-[#E5A919] text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
              title="Clicking any slide isolates playback strictly within that slide's 00:00:00 - 00:00:12 range"
            >
              SOLO SCRUB
            </button>
          </div>

          <span className="text-white/20">|</span>

          {/* Current Frame Index & Timing Specs */}
          <div className="flex items-center gap-2 text-[11px] text-white/70">
            <span>SLIDE</span>
            <span className="text-[#FFE066] font-bold">
              SH{String(safeIndex + 1).padStart(3, '0')}
            </span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{String(slides.length).padStart(3, '0')}</span>
            <span className="text-[10px] text-white/40">(288F @ 24fps)</span>
          </div>
        </div>

        {/* Right: Add Slide & Total Duration */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-white/40" />
            <span className="text-white/40">RUN TIME:</span>
            <span className="text-[#E6E6E6] font-bold">{formatTimecode(totalDurationSec)}</span>
          </div>

          <button
            onClick={onAddSlide}
            className="px-3 py-1 bg-[#1C1C24] hover:bg-[#252530] text-[#E6E6E6] hover:text-[#FFE066] border border-[#353545] rounded text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-out"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5A919]" />
            <span>+ 12.0S CARD</span>
          </button>
        </div>
      </div>

      {/* Global & Local Scrubbing Strip */}
      <div className="px-4 py-2 bg-[#0E0E14] border-b border-[#20202A] flex items-center gap-4 text-xs shrink-0">
        {/* Play/Pause & Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onStepFrame(false)}
            className="px-2 py-1 bg-[#1A1A22] hover:bg-[#22222E] text-[#E6E6E6] border border-[#303040] rounded text-[10.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors duration-150 ease-out"
            title="Step Back 1 Frame (1/24s)"
          >
            <SkipBack className="w-3 h-3 text-[#E5A919]" />
            <span>-1F</span>
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 rounded text-xs font-black flex items-center gap-1 cursor-pointer transition-colors duration-150 ease-out shadow-sm ${
              isPlaying ? 'bg-[#E5A919] text-black' : 'bg-[#22222E] text-white border border-[#3A3A4C]'
            }`}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            onClick={() => onStepFrame(true)}
            className="px-2 py-1 bg-[#1A1A22] hover:bg-[#22222E] text-[#E6E6E6] border border-[#303040] rounded text-[10.5px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors duration-150 ease-out"
            title="Step Forward 1 Frame (1/24s)"
          >
            <SkipForward className="w-3 h-3 text-[#E5A919]" />
            <span>+1F</span>
          </button>
        </div>

        {/* Dynamic Dual-Mode Scrubber */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span className="font-bold text-[#E5A919]">
              {playbackMode === 'solo' 
                ? `SOLO SCRUB: SH${String(safeIndex + 1).padStart(3, '0')} (00:00:00 - 00:00:12)` 
                : 'SEQUENCE GLOBAL SCRUB'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#FFE066] font-bold">{formatTimecode(slideTimeSec)}</span>
              <span className="text-white/30">/</span>
              <span className="text-white/60">00:12:00</span>
              <span className="text-white/30">|</span>
              <span className="text-white/80">GLOBAL: {formatTimecode(globalSec)}</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={playbackMode === 'solo' ? SLIDE_DURATION_SEC : totalDurationSec}
            step="0.0416"
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
            className="w-full h-1.5 bg-[#252535] rounded-none accent-[#E5A919] cursor-pointer"
          />
        </div>
      </div>

      {/* Main 12.0s Storyboard Cards Lane (Strictly No Hover Scaling, No Tooltip Popovers) */}
      <div 
        ref={containerRef}
        className="flex-1 p-4 overflow-x-auto no-scrollbar flex items-center gap-3.5 bg-[#08080C]"
      >
        {slides.map((slide, idx) => {
          const isActive = idx === safeIndex;
          const epNum = String(idx + 1).padStart(3, '0');

          return (
            <div
              key={slide.id || idx}
              data-card-index={idx}
              onClick={() => onSelectSlide(idx)}
              className={`shrink-0 w-64 h-48 rounded border transition-colors duration-150 ease-out cursor-pointer relative flex flex-col justify-between p-3 overflow-hidden ${
                isActive
                  ? 'bg-[#181822] border-[#E5A919] ring-1 ring-[#E5A919]/50 shadow-xl'
                  : 'bg-[#111116] hover:bg-[#15151D] border-[#252532]'
              }`}
            >
              {/* Media Thumbnail Backdrop */}
              {slide.remoteUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
                  style={{ backgroundImage: `url(${slide.remoteUrl})` }}
                />
              )}

              {/* Top Row: Scene ID, 12.0s Duration Badge, Order Move Buttons */}
              <div className="relative z-10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    isActive ? 'bg-[#E5A919] text-black font-black' : 'bg-[#1F1F2C] text-white/80'
                  }`}>
                    SH{epNum}
                  </span>
                  <span className="text-[#FFE066] text-[10px]">12.0s</span>
                  <span className="text-white/40 text-[9px]">(288F)</span>
                </div>

                <div className="flex items-center gap-0.5">
                  {idx > 0 && (
                    <button
                      onClick={(e) => handleMove(idx, idx - 1, e)}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Move card left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < slides.length - 1 && (
                    <button
                      onClick={(e) => handleMove(idx, idx + 1, e)}
                      className="p-1 text-white/40 hover:text-white transition-colors"
                      title="Move card right"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Middle: Scene Labels & Text Cues */}
              <div className="relative z-10 my-auto flex flex-col gap-1">
                {slide.titleBn && (
                  <p className="text-xs text-[#FFE066] font-serif font-bold truncate">
                    {slide.titleBn}
                  </p>
                )}
                <p className="text-xs text-[#E6E6E6] font-mono font-bold truncate">
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
              <div className="relative z-10 flex items-center justify-between text-[10px] text-white/40 border-t border-white/10 pt-2">
                <button
                  onClick={(e) => handleTriggerUpload(idx, e)}
                  className="hover:text-[#FFE066] transition-colors flex items-center gap-1 font-bold"
                  title="Bind media asset (image/video)"
                >
                  <Upload className="w-3 h-3 text-[#E5A919]" />
                  <span>{slide.remoteUrl ? 'REPLACE MEDIA' : 'BIND MEDIA'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => handleStartEdit(idx, e)}
                    className="hover:text-[#FFE066] text-white/50 transition-colors p-1"
                    title="Edit scene labels & text cues"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSlide(idx);
                    }}
                    className="hover:text-[#FFE066] text-white/50 transition-colors p-1"
                    title="Duplicate 12.0s card"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(idx);
                      }}
                      className="hover:text-red-400 text-white/50 transition-colors p-1"
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
            className="w-full max-w-lg bg-[#14141C] border border-[#2B2B38] rounded-md p-5 shadow-2xl flex flex-col gap-3 font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#262635] pb-2">
              <span className="font-bold text-[#E6E6E6] uppercase">
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
                className="bg-[#0A0A0E] border border-[#303040] rounded px-3 py-1.5 text-white outline-none focus:border-[#E5A919]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Bengali Scene Label (Optional)</label>
              <input
                type="text"
                value={editTitleBn}
                onChange={(e) => setEditTitleBn(e.target.value)}
                placeholder="e.g. দৃশ্য ০১ // সূচনা ফ্রেম"
                className="bg-[#0A0A0E] border border-[#303040] rounded px-3 py-1.5 text-[#FFE066] font-serif outline-none focus:border-[#E5A919]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Director Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Camera movement, actor beats, pacing cue..."
                className="bg-[#0A0A0E] border border-[#303040] rounded px-3 py-1.5 text-white/90 outline-none focus:border-[#E5A919] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/50 uppercase">Sound Cue & Music Track</label>
              <input
                type="text"
                value={editSoundCue}
                onChange={(e) => setEditSoundCue(e.target.value)}
                placeholder="e.g. Deep sub bass rumble, synthetic strings crescendo"
                className="bg-[#0A0A0E] border border-[#303040] rounded px-3 py-1.5 text-[#38BDF8] outline-none focus:border-[#E5A919]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262635]">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#E5A919] hover:bg-[#FFB703] text-black font-bold rounded cursor-pointer"
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
