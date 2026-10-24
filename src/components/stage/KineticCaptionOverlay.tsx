/**
 * @file /src/components/stage/KineticCaptionOverlay.tsx
 * @description Dynamic Kinetic Rap Captions & Lyrical Typography Overlay.
 * 
 * Features:
 * 1. Synchronized word-by-word highlight with audio transients:
 *    - [ RAP POP ]: Molten gold highlight (#F5A623), scale punch (scale-110), glowing bloom.
 *    - [ CINEMATIC MINIMAL ]: Monospace tracked uppercase pill with frosted obsidian backdrop.
 *    - [ BILINGUAL DUAL ]: Bengali hero calligraphy (Anek Bangla) + English subtitle (Cinzel).
 * 2. Real-time timeline playback sync to slideTimeSec.
 * 3. Quick inline lyric editor: Add timed lyrics, paste full song verse with auto-distribution.
 */

import React, { useState } from 'react';
import { Type, Edit3, Check, Sparkles, Music, Wand2, X } from 'lucide-react';
import { AnthologyFrame, CaptionStyle, ShotCaption, TimedWord } from '../../types/anthology';
import { autoDistributeLyrics, getActiveCaptionWord } from '../../services/captionEngine';

export interface KineticCaptionOverlayProps {
  currentFrame: AnthologyFrame;
  slideTimeSec: number;
  durationSec: number;
  detectedBpm?: number;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  showCaptions?: boolean;
}

export const KineticCaptionOverlay: React.FC<KineticCaptionOverlayProps> = ({
  currentFrame,
  slideTimeSec,
  durationSec,
  detectedBpm = 120,
  onUpdateFrame,
  showCaptions = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editBnText, setEditBnText] = useState('');
  const [editStyle, setEditStyle] = useState<CaptionStyle>('rap_pop');

  if (!showCaptions) return null;

  const caption: ShotCaption = currentFrame.caption || {
    text: currentFrame.tagline || (currentFrame.title ? `${currentFrame.title} // RHYTHMIC HIT` : ''),
    bengaliText: currentFrame.bengaliTitle,
    style: 'rap_pop'
  };

  const style = caption.style || 'rap_pop';
  const words: TimedWord[] = caption.words && caption.words.length > 0
    ? caption.words
    : (caption.text ? autoDistributeLyrics(caption.text, { shotDurationSec: durationSec, bpm: detectedBpm, style }).words || [] : []);

  const { activeIndex, punchScale } = getActiveCaptionWord(words, slideTimeSec);

  const handleOpenEdit = () => {
    setEditText(caption.text || '');
    setEditBnText(caption.bengaliText || '');
    setEditStyle(style);
    setIsEditing(true);
  };

  const handleSaveLyrics = () => {
    const updatedCaption = autoDistributeLyrics(editText, {
      shotDurationSec: durationSec,
      bpm: detectedBpm,
      style: editStyle,
      bengaliTranslation: editBnText || undefined
    });

    if (onUpdateFrame) {
      onUpdateFrame({
        ...currentFrame,
        caption: updatedCaption
      });
    }
    setIsEditing(false);
  };

  const handleAutoDistributeSample = () => {
    const sampleLyrics = [
      'RAWX ON THE BEAT // BARS DROP HEAVY',
      'CHASING SHADOWS THROUGH THE MIDNIGHT CITY',
      'MONEY FAST LIKE A ROLLS IN MOTION',
      'WE RIDE UNTIL THE SUN HITS THE OCEAN',
      'SPARK THE FLAME // NEVER FOLD UNDER TENSION'
    ];
    const picked = sampleLyrics[Math.floor(Math.random() * sampleLyrics.length)];
    setEditText(picked);
    setEditBnText('দৃষ্টি // আলোর গতিতে জীবনের ছন্দ');
  };

  return (
    <div className="absolute inset-x-0 bottom-16 sm:bottom-20 z-25 pointer-events-none flex flex-col items-center justify-end px-4">
      {/* Inline Quick Lyric Editor Modal / Floating Bar */}
      {isEditing ? (
        <div className="pointer-events-auto w-full max-w-lg p-3.5 rounded-[6px] bg-[#0A0A14]/95 border border-[#d4af37]/60 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(245,166,35,0.25)] backdrop-blur-2xl text-xs font-mono text-zinc-200 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-[#f5a623] font-bold text-[10px] tracking-wider uppercase">
              <Type className="w-3.5 h-3.5" />
              <span>TIMELINE LYRIC & RAP CAPTION EDITOR</span>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Style Selector */}
          <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
            {(['rap_pop', 'cinematic_minimal', 'bilingual_dual'] as CaptionStyle[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setEditStyle(st)}
                className={`py-1.5 px-2 rounded-[3px] font-bold uppercase transition-all cursor-pointer ${
                  editStyle === st
                    ? 'bg-[#d4af37] text-black shadow-[0_0_8px_rgba(245,166,35,0.5)]'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                }`}
              >
                {st === 'rap_pop' ? '⚡ RAP POP' : st === 'cinematic_minimal' ? 'MINIMAL PILL' : 'BILINGUAL DUAL'}
              </button>
            ))}
          </div>

          {/* Lyric Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8.5px] text-zinc-400">
              <span>LYRIC TEXT / VOCAL BARS (AUTO-QUANTIZED TO BEAT)</span>
              <button
                type="button"
                onClick={handleAutoDistributeSample}
                className="text-[#f5a623] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-2.5 h-2.5" />
                <span>Sample Lyric</span>
              </button>
            </div>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Paste line: e.g. BARS DROP HEAVY LIKE RAIN"
              className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/15 text-white focus:outline-none focus:border-[#f5a623] text-xs font-mono"
            />
          </div>

          {/* Bengali Line for Dual mode */}
          {editStyle === 'bilingual_dual' && (
            <div className="space-y-1">
              <div className="text-[8.5px] text-zinc-400">BENGALI HERO CALLIGRAPHY (ANEK BANGLA)</div>
              <input
                type="text"
                value={editBnText}
                onChange={(e) => setEditBnText(e.target.value)}
                placeholder="বাংলা অনুবাদ: আলো ও অন্ধকারের যুদ্ধ"
                className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/15 text-[#f5a623] focus:outline-none focus:border-[#f5a623] text-xs"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer text-[10px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLyrics}
              className="px-4 py-1.5 rounded bg-[#f5a623] text-black font-bold hover:brightness-110 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,166,35,0.4)] cursor-pointer text-[10px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Distribute ({words.length} Words)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Real-time Rendered Caption Display */
        <div className="group relative flex flex-col items-center">
          {/* Edit trigger on hover */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity mb-1 px-2 py-0.5 rounded bg-black/70 border border-white/20 text-[9px] font-mono text-zinc-300 hover:text-[#f5a623] hover:border-[#f5a623] flex items-center gap-1 cursor-pointer shadow-md"
            title="Edit Lyrics & Captions"
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>EDIT LYRIC ({style.toUpperCase()})</span>
          </button>

          {/* 1. RAP POP Style */}
          {style === 'rap_pop' && caption.text && (
            <div className="px-4 py-2 rounded-md bg-[#06070B]/75 border border-[#f5a623]/35 shadow-[0_4px_24px_rgba(0,0,0,0.85),0_0_14px_rgba(245,166,35,0.18)] backdrop-blur-md flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-2xl text-center transition-all">
              {words.map((w, idx) => {
                const isActive = idx === activeIndex;
                const isPast = activeIndex > -1 && idx < activeIndex;

                return (
                  <span
                    key={idx}
                    style={{
                      transform: isActive ? `scale(${punchScale})` : 'scale(1)',
                      transition: 'transform 80ms cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                    }}
                    className={`inline-block font-black tracking-wide text-sm sm:text-base md:text-lg select-none ${
                      isActive
                        ? 'text-[#F5A623] drop-shadow-[0_0_12px_rgba(245,166,35,0.9)] scale-110 z-10'
                        : isPast
                        ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-95'
                        : 'text-zinc-400/60 opacity-60'
                    }`}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
          )}

          {/* 2. CINEMATIC MINIMAL Style */}
          {style === 'cinematic_minimal' && caption.text && (
            <div className="px-4 py-1.5 rounded bg-black/80 border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.9)] backdrop-blur-md text-[11px] sm:text-xs font-mono font-bold tracking-widest text-zinc-100 uppercase select-none">
              {caption.text}
            </div>
          )}

          {/* 3. BILINGUAL DUAL Style */}
          {style === 'bilingual_dual' && caption.text && (
            <div className="flex flex-col items-center text-center space-y-0.5 select-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {caption.bengaliText && (
                <div className="text-xl sm:text-2xl font-black text-[#F5A623] tracking-wide font-sans drop-shadow-[0_0_12px_rgba(245,166,35,0.7)]">
                  {caption.bengaliText}
                </div>
              )}
              <div className="text-[10px] sm:text-xs font-mono font-bold text-zinc-200 tracking-wider uppercase opacity-90">
                {caption.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
