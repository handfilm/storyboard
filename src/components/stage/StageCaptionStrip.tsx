/**
 * @file /src/components/stage/StageCaptionStrip.tsx
 * @description External Scene / Dopamine FX Caption Strip rendered strictly BELOW the video box
 * (between the bottom of the video box and the top of the shot cards) so nothing overlays the video canvas.
 */

import React from 'react';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { useStudioStore, HeroTitlePreset } from '../../core/store';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { DopamineShotConfig } from '../../types/anthology';

export interface StageCaptionStripProps {
  shotIndex: number;
  banglaTitle?: string;
  englishTitle?: string;
  subtitle?: string;
  directorNotes?: string;
  dopamineConfig?: DopamineShotConfig;
  slideTimeSec?: number;
  durationSec?: number;
  isTitlesActive?: boolean;
  onToggleTitles?: () => void;
  componentsVisibility?: ComponentVisibility;
  className?: string;
}

const DEFAULT_BANGLA_HEADLINES = ['শূন্য', 'আলো', 'সংঘাত', 'দৃষ্টির সীমানা'];

export const StageCaptionStrip: React.FC<StageCaptionStripProps> = ({
  shotIndex,
  banglaTitle,
  englishTitle,
  subtitle,
  directorNotes,
  dopamineConfig,
  slideTimeSec = 0,
  durationSec = 12,
  isTitlesActive = true,
  onToggleTitles,
  componentsVisibility,
  className = ''
}) => {
  const titlePosition = useStudioStore((s) => s.titlePosition);
  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const activePreset: HeroTitlePreset = storeTitleConfig?.preset || 'molten-gold';

  const showBangla = componentsVisibility ? componentsVisibility.titleBn !== false : true;
  const showEnglish = componentsVisibility ? componentsVisibility.titleEn !== false : true;
  const showDialogue = componentsVisibility
    ? componentsVisibility.tagline !== false || componentsVisibility.caption !== false
    : true;

  const displayBangla =
    banglaTitle && banglaTitle.trim().length > 0
      ? banglaTitle
      : DEFAULT_BANGLA_HEADLINES[shotIndex % DEFAULT_BANGLA_HEADLINES.length];
  const displayEnglish =
    englishTitle && englishTitle.trim().length > 0
      ? englishTitle
      : `SHOT ${String(shotIndex + 1).padStart(3, '0')} // MASTER SEQUENCE`;
  const displayDialogue = directorNotes || subtitle;

  const progressPct =
    durationSec > 0 ? Math.min(100, Math.max(0, (slideTimeSec / durationSec) * 100)) : 0;

  const presetAccentClass =
    activePreset === 'titanium-silver'
      ? 'text-cyan-300 border-cyan-400/35'
      : activePreset === 'neon-crimson'
        ? 'text-rose-400 border-rose-500/35'
        : 'text-[#F5A623] border-[#F5A623]/35';

  const alignClass =
    titlePosition === 'right-bottom'
      ? 'justify-end text-right'
      : titlePosition === 'mid-bottom'
        ? 'justify-center text-center'
        : 'justify-start text-left';

  return (
    <div
      data-testid="stage-caption-strip"
      className={`relative w-full max-w-[min(99vw,1880px)] mx-auto px-3 py-1 bg-[#06070c]/95 border-t border-b border-white/10 flex items-center justify-between gap-3 shrink-0 select-none min-h-[34px] overflow-hidden ${className}`}
    >
      {/* Progress Baseline */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/5 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#F5A623] via-[#FFE066] to-[#E50914] transition-all duration-100 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Caption & Scene Title Readout */}
      <div className={`flex-1 min-w-0 flex items-center gap-2.5 flex-wrap ${alignClass}`}>
        {!isTitlesActive ? (
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            CAPTION STRIP MUTED — CLICK TO RESTORE SCENE TITLES &amp; DOPAMINE FX READOUT
          </span>
        ) : dopamineConfig ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="px-1.5 py-0.5 rounded border text-[9px] font-mono font-black uppercase flex items-center gap-1 shrink-0"
              style={{
                borderColor: dopamineConfig.accentColor || '#FF2B2B',
                color: dopamineConfig.accentColor || '#FF2B2B',
                backgroundColor: 'rgba(255,43,43,0.12)'
              }}
            >
              <Zap className="w-2.5 h-2.5" />
              <span>DOPAMINE FX</span>
            </span>
            <span className="font-cinzel font-black text-xs sm:text-sm text-white uppercase tracking-wider truncate">
              {dopamineConfig.hookText || displayEnglish}
            </span>
            {dopamineConfig.subText && (
              <span className="text-[10.5px] font-mono text-zinc-300 truncate hidden md:inline">
                — {dopamineConfig.subText}
              </span>
            )}
            <span className="text-[9px] font-mono text-zinc-500 hidden lg:inline shrink-0 tabular-nums">
              GLITCH {dopamineConfig.glitchIntensity ?? 80}% • STROBE {dopamineConfig.strobeRate ?? 60}Hz • {(dopamineConfig.motionSpeed ?? 1.5).toFixed(1)}x
            </span>
          </div>
        ) : (
          <>
            {showBangla && (
              <span className={`font-bangla font-black text-sm sm:text-base tracking-wide leading-none truncate ${presetAccentClass.split(' ')[0]}`}>
                {displayBangla}
              </span>
            )}
            {showBangla && showEnglish && (
              <span className="text-white/20 text-xs shrink-0">//</span>
            )}
            {showEnglish && (
              <span className="font-cinzel font-bold text-[11px] sm:text-xs text-white/95 uppercase tracking-[0.16em] truncate">
                {displayEnglish}
              </span>
            )}
            {showDialogue && displayDialogue && (
              <span className="text-[10px] font-mono text-zinc-400 italic truncate max-w-[360px] hidden lg:inline">
                "{displayDialogue}"
              </span>
            )}
          </>
        )}
      </div>

      {/* Right Status Pill + Quick Toggle */}
      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
        <span className={`hidden sm:inline px-1.5 py-0.5 rounded bg-black/70 border ${presetAccentClass}`}>
          {activePreset.replace('-', ' ').toUpperCase()}
        </span>
        {onToggleTitles && (
          <button
            type="button"
            onClick={onToggleTitles}
            className={`px-1.5 py-0.5 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
              isTitlesActive
                ? 'bg-black/70 border-white/15 text-zinc-300 hover:text-amber-300'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
            }`}
            title={isTitlesActive ? 'Hide Caption Strip' : 'Show Caption Strip'}
          >
            {isTitlesActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>{isTitlesActive ? 'ON' : 'OFF'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
