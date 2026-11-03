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
import { Zap, Flame, Type, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import { AnthologyFrame, ShotCaption } from '../../types/anthology';
import { KineticAdPreset, kineticAdEngine } from '../../services/kineticAdEngine';
import { useStudioStore } from '../../core/store';
import { AutonomousKineticPreset } from '../../services/kineticTypographyStyles';
import { transientPunchEngine } from '../../services/transientPunchEngine';
import { BrutalistKineticHudStrip } from '../drawers/BrutalistKineticHudStrip';

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
  onUpdateFrame,
  className = ''
}) => {
  const kineticOcclusion = useStudioStore((s) => s.kineticOcclusion);
  const setAutonomousKineticPreset = useStudioStore((s) => s.setAutonomousKineticPreset);
  const setKineticOcclusionEnabled = useStudioStore((s) => s.setKineticOcclusionEnabled);

  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);

  const mappedLegacyPreset: KineticAdPreset =
    kineticOcclusion.preset === 'CHOPPER_RAP_PUNCH'
      ? 'chopper_rap_snapping'
      : kineticOcclusion.preset === 'COMMERCIAL_TITAN_DROP'
      ? 'commercial_ad_punch'
      : 'editorial_minimal';

  const caption: ShotCaption = useMemo(() => {
    return (
      currentFrame.caption || {
        text: currentFrame.tagline || currentFrame.title || 'RAWX ON THE BEAT',
        bengaliText: currentFrame.bengaliTitle || 'দৃশ্যপট // আলোর ছন্দ',
        style: 'rap_pop'
      }
    );
  }, [currentFrame]);

  const frameOutput = useMemo(() => {
    return kineticAdEngine.computeKineticFrame(
      caption,
      slideTimeSec,
      durationSec,
      mappedLegacyPreset,
      currentFrame.bengaliTitle,
      currentFrame.title
    );
  }, [caption, slideTimeSec, durationSec, mappedLegacyPreset, currentFrame.bengaliTitle, currentFrame.title]);

  const handleSelectAutonomousPreset = (preset: AutonomousKineticPreset) => {
    if (!kineticOcclusion.enabled) {
      setKineticOcclusionEnabled(true);
    }
    setAutonomousKineticPreset(preset);

    if (preset === 'CHOPPER_RAP_PUNCH') {
      transientPunchEngine.emitVocalHit(0.92);
    } else if (preset === 'COMMERCIAL_TITAN_DROP') {
      transientPunchEngine.emitKickPunch(0.85);
    }

    if (onUpdateFrame) {
      const updatedStyle =
        preset === 'COMMERCIAL_TITAN_DROP'
          ? 'bilingual_dual'
          : preset === 'MINIMAL'
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
      className={`group/drawer relative transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
    >
      <div className="relative bg-[#07080C]/92 hover:bg-[#090B11]/98 focus-within:bg-[#090B11]/98 border border-[#272732] hover:border-[#F5A623]/60 focus-within:border-[#F5A623]/60 rounded-[2px] shadow-[0_8px_32px_rgba(0,0,0,0.88)] backdrop-blur-xl p-2 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
        {/* Resting Brutalist Console Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#F5A623] uppercase flex items-center gap-1">
              <Type className="w-3 h-3" />
              <span>TYPOGRAPHY HUD</span>
            </span>
            <span className="text-[8.5px] font-mono text-zinc-400 uppercase hidden md:inline items-center gap-1">
              <Layers className="w-2.5 h-2.5 inline mr-0.5 text-[#F5A623]" />
              {kineticOcclusion.layerMode === 'BEHIND_SUBJECT' ? 'BEHIND SUBJECT' : 'FOREGROUND'} • {kineticOcclusion.audioPunchMode}
            </span>
          </div>

          {/* Quick Brutalist Preset Switchers */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleSelectAutonomousPreset('CHOPPER_RAP_PUNCH')}
              className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                kineticOcclusion.preset === 'CHOPPER_RAP_PUNCH'
                  ? 'bg-[#F5A623] text-black border border-[#F5A623]'
                  : 'bg-[#0D0F16] text-zinc-400 hover:text-white border border-[#272732] hover:border-zinc-500'
              }`}
              title="CHOPPER_RAP_PUNCH: Single-word replacement with 4-frame 120% -> 100% scale & -3px -> 0px tracking"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>[ RAP CHOPPER ]</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectAutonomousPreset('COMMERCIAL_TITAN_DROP')}
              className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                kineticOcclusion.preset === 'COMMERCIAL_TITAN_DROP'
                  ? 'bg-[#F5A623] text-black border border-[#F5A623]'
                  : 'bg-[#0D0F16] text-zinc-400 hover:text-white border border-[#272732] hover:border-zinc-500'
              }`}
              title="COMMERCIAL_TITAN_DROP: Heavy Bengali Unicode + laser-line wipe + directional motion blur fragment pass"
            >
              <Flame className="w-2.5 h-2.5" />
              <span>[ AD TITAN ]</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectAutonomousPreset('MINIMAL')}
              className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                kineticOcclusion.preset === 'MINIMAL'
                  ? 'bg-[#EDEDED] text-black border border-[#EDEDED]'
                  : 'bg-[#0D0F16] text-zinc-400 hover:text-white border border-[#272732] hover:border-zinc-500'
              }`}
              title="Minimal console typography"
            >
              <span>[ MINIMAL ]</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsManuallyExpanded(!isManuallyExpanded)}
            className="p-1 text-zinc-500 hover:text-zinc-200 rounded-[2px] cursor-pointer"
            title="Pin / Unpin Brutalist Occlusion & Transient Strip"
          >
            {isManuallyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* CSS Hover-Triggered Brutalist Control Strip + Word Cadence Matrix */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isManuallyExpanded
              ? 'max-h-96 opacity-100 mt-2'
              : 'max-h-0 opacity-0 group-hover/drawer:max-h-96 group-hover/drawer:opacity-100 group-hover/drawer:mt-2 group-focus-within/drawer:max-h-96 group-focus-within/drawer:opacity-100 group-focus-within/drawer:mt-2'
          }`}
        >
          <BrutalistKineticHudStrip compact={false} className="border-white/10" />

          <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5 max-h-16 overflow-y-auto no-scrollbar">
            {frameOutput.words.map((w, idx) => (
              <span
                key={`${w.word}_${idx}`}
                className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono tabular-nums transition-all duration-75 select-none ${
                  w.isActive
                    ? 'bg-[#F5A623] text-black font-black scale-105'
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
