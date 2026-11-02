/**
 * @file /src/components/stage/KineticAdTextDrawer.tsx
 * @description Floating Kinetic Title Rack Drawer docked above the timeline text track.
 * 
 * Features:
 * 1. Preset Switcher Buttons:
 *    - [RAP BEAT SYNC]: Word-level Chopper Rap snapping with 1.1x dynamic scale pop & trailing motion blur.
 *    - [COMMERCIAL IMPACT]: 4-frame slam entry from 140% to 100% with 120ms chromatic decay & bilingual stacking.
 *    - [EDITORIAL]: Crisp minimalist monospace subtitle.
 * 2. Progressive Disclosure Behavior:
 *    - Resting state: Compact matte-black hardware pill.
 *    - Hover state (:hover / :focus-within): Ultra-fast 100ms expansion revealing word chips & controls.
 */

import React, { useState, useMemo } from 'react';
import { Sparkles, Zap, Flame, Type, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { AnthologyFrame, ShotCaption } from '../../types/anthology';
import { KineticAdPreset, kineticAdEngine } from '../../services/kineticAdEngine';

export interface KineticAdTextDrawerProps {
  currentFrame: AnthologyFrame;
  slideTimeSec?: number;
  durationSec?: number;
  bpm?: number;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  className?: string;
}

export const KineticAdTextDrawer: React.FC<KineticAdTextDrawerProps> = ({
  currentFrame,
  slideTimeSec = 0,
  durationSec = 5.0,
  bpm = 120,
  onUpdateFrame,
  className = ''
}) => {
  const [activePreset, setActivePreset] = useState<KineticAdPreset>('chopper_rap_snapping');
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  const caption: ShotCaption = useMemo(() => {
    return currentFrame.caption || {
      text: currentFrame.tagline || currentFrame.title || 'RAWX ON THE BEAT',
      bengaliText: currentFrame.bengaliTitle || 'দৃশ্যপট // আলোর ছন্দ',
      style: 'rap_pop'
    };
  }, [currentFrame]);

  // Compute live frame preview
  const frameOutput = useMemo(() => {
    return kineticAdEngine.computeKineticFrame(
      caption,
      slideTimeSec,
      durationSec,
      activePreset,
      currentFrame.bengaliTitle,
      currentFrame.title
    );
  }, [caption, slideTimeSec, durationSec, activePreset, currentFrame.bengaliTitle, currentFrame.title]);

  const handleSelectPreset = (preset: KineticAdPreset) => {
    setActivePreset(preset);
    if (onUpdateFrame) {
      const updatedStyle = preset === 'commercial_ad_punch'
        ? 'bilingual_dual'
        : preset === 'editorial_minimal'
        ? 'cinematic_minimal'
        : 'rap_pop';

      onUpdateFrame({
        ...currentFrame,
        caption: {
          ...caption,
          style: updatedStyle
        }
      });
    }
  };

  return (
    <div
      className={`group/drawer relative transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      <div className="relative bg-[#07080C]/90 hover:bg-[#0A0B10]/98 focus-within:bg-[#0A0B10]/98 border border-white/10 hover:border-[#F5A623]/50 focus-within:border-[#F5A623]/50 rounded-[4px] shadow-[0_8px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl p-2 transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Header / Preset Switcher Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#F5A623] uppercase flex items-center gap-1">
              <Type className="w-3 h-3" />
              <span>KINETIC TITLE RACK</span>
            </span>
            <span className="text-[8px] font-mono text-zinc-500 uppercase hidden sm:inline">
              // 24FPS SNAPPED
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => handleSelectPreset('chopper_rap_snapping')}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 ${
                activePreset === 'chopper_rap_snapping'
                  ? 'bg-[#F5A623] text-black shadow-[0_0_10px_rgba(245,166,35,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Chopper Rap Snapping: Word-level timecode sync with 1.1x dynamic pop & motion blur"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>[RAP BEAT SYNC]</span>
            </button>

            <button
              onClick={() => handleSelectPreset('commercial_ad_punch')}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 ${
                activePreset === 'commercial_ad_punch'
                  ? 'bg-[#2DD4BF] text-black shadow-[0_0_10px_rgba(45,212,191,0.4)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Commercial Ad Punch: 4-frame slam entry from 140% to 100% with chromatic decay"
            >
              <Flame className="w-2.5 h-2.5" />
              <span>[COMMERCIAL IMPACT]</span>
            </button>

            <button
              onClick={() => handleSelectPreset('editorial_minimal')}
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 ${
                activePreset === 'editorial_minimal'
                  ? 'bg-zinc-200 text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
              title="Editorial Minimal: Clean typography with subtle opacity breath"
            >
              <span>[EDITORIAL]</span>
            </button>
          </div>

          <button
            onClick={() => setIsManuallyExpanded(!isManuallyExpanded)}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded"
            title="Toggle Detailed Words Tray"
          >
            {isManuallyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Word Chips Drawer (Expands on container hover or manual toggle) */}
        <div
          className={`overflow-hidden transition-all duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isManuallyExpanded
              ? 'max-h-24 opacity-100 mt-2'
              : 'max-h-0 opacity-0 group-hover/drawer:max-h-24 group-hover/drawer:opacity-100 group-hover/drawer:mt-2 group-focus-within/drawer:max-h-24 group-focus-within/drawer:opacity-100 group-focus-within/drawer:mt-2'
          }`}
        >
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
            {frameOutput.words.map((w, idx) => (
              <span
                key={`${w.word}_${idx}`}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all duration-75 select-none ${
                  w.isActive
                    ? 'bg-[#F5A623] text-black font-black scale-110 shadow-[0_0_10px_rgba(245,166,35,0.6)]'
                    : w.isPast
                    ? 'bg-white/10 text-white/70'
                    : 'bg-black/60 text-white/35 border border-white/5'
                }`}
              >
                {w.word}
              </span>
            ))}

            {frameOutput.words.length === 0 && (
              <span className="text-[10px] font-mono text-zinc-500 italic">
                No timed lyrics on this shot. Add lyrics in the caption editor.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
