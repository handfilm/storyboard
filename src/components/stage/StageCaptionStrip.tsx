/**
 * @file /src/components/stage/StageCaptionStrip.tsx
 * @description Single compact 20px (h-5) External Technical Telemetry Bar strictly BELOW the video box.
 * Merges shot telemetry, optics/LUT, WebCodecs status, calibration, bit depth, runtime, and preset badge
 * into one Stealth Grey bar that illuminates with vibrant accents on hover.
 */

import React from 'react';
import { Eye, EyeOff, Maximize2, Upload, Zap } from 'lucide-react';
import {
  useStudioStore,
  HeroTitlePreset,
  resolveEffectiveTitleAlign
} from '../../core/store';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { DopamineShotConfig } from '../../types/anthology';
import { usePlaybackClock } from '../../utils/playbackClock';

export interface StageCaptionStripProps {
  shotIndex: number;
  sceneCode?: string;
  aspectRatio?: string;
  shotType?: string;
  cameraSpec?: string;
  lutFilter?: string;
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
  isWebCodecsEngineActive?: boolean;
  onToggleWebCodecs?: () => void;
  totalRuntimeTimecode?: string;
  totalShotsCount?: number;
  onUploadMedia?: () => void;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const StageCaptionStrip: React.FC<StageCaptionStripProps> = ({
  shotIndex,
  sceneCode,
  aspectRatio = '2.39:1',
  shotType,
  cameraSpec,
  lutFilter,
  dopamineConfig,
  slideTimeSec = 0,
  durationSec = 12,
  isTitlesActive = true,
  onToggleTitles,
  isWebCodecsEngineActive = true,
  onToggleWebCodecs,
  totalRuntimeTimecode,
  totalShotsCount,
  onUploadMedia,
  onToggleFullscreen,
  className = ''
}) => {
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const activePreset: HeroTitlePreset = storeTitleConfig?.preset || 'molten-gold';
  const effectiveAlign = resolveEffectiveTitleAlign(titleAlign, shotIndex, shotType);
  const liveClock = usePlaybackClock(true);

  const activeTime = liveClock.shotIndex === shotIndex ? liveClock.timeSec : slideTimeSec;
  const activeDur = liveClock.shotIndex === shotIndex && liveClock.durationSec > 0 ? liveClock.durationSec : durationSec;
  const progressPct =
    activeDur > 0 ? Math.min(100, Math.max(0, (activeTime / activeDur) * 100)) : 0;

  const presetHoverClass =
    activePreset === 'titanium-silver'
      ? 'group-hover:text-cyan-300 group-hover:border-cyan-400/40'
      : activePreset === 'neon-crimson'
        ? 'group-hover:text-rose-400 group-hover:border-rose-500/40'
        : 'group-hover:text-amber-400 group-hover:border-amber-400/40';

  const sceneLabel = sceneCode || String(Math.floor(shotIndex / 10)).padStart(2, '0');
  const shotLabel = String(shotIndex + 1).padStart(2, '0');

  return (
    <div
      data-testid="stage-caption-strip"
      className={`group relative w-full h-5 min-h-[20px] max-h-[20px] px-2.5 bg-black/90 border-t border-b border-neutral-900 text-neutral-500 group-hover:text-neutral-200 transition-colors duration-200 flex items-center justify-between gap-2 shrink-0 select-none overflow-hidden font-mono text-[10px] tracking-wider ${className}`}
    >
      {/* Subtle 1px Progress Baseline (Stealth grey at rest -> radiant amber/red on bar hover) */}
      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-neutral-900 pointer-events-none">
        <div
          className="h-full bg-neutral-700 group-hover:bg-gradient-to-r group-hover:from-[#F5A623] group-hover:via-[#FFE066] group-hover:to-[#E50914] transition-all duration-200 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Left: Unified Single-Line Technical Telemetry */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate uppercase">
        <span className="text-neutral-400 group-hover:text-amber-400 font-bold whitespace-nowrap shrink-0 transition-colors duration-200">
          SCENE {sceneLabel} // SHOT {shotLabel}
        </span>

        <span className="text-neutral-700 group-hover:text-white/25 shrink-0">·</span>
        <span className="whitespace-nowrap shrink-0">
          {aspectRatio} SCOPE
        </span>

        <span className="hidden sm:inline text-neutral-700 group-hover:text-white/25 shrink-0">·</span>
        <span className="hidden sm:inline text-neutral-500 group-hover:text-cyan-300 whitespace-nowrap shrink-0 transition-colors duration-200">
          TITLE: {titleAlign === 'AUTO' ? `AUTO→${effectiveAlign}` : titleAlign}
        </span>

        {cameraSpec && (
          <>
            <span className="hidden md:inline text-neutral-700 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden md:inline whitespace-nowrap shrink-0">
              {cameraSpec}
            </span>
          </>
        )}

        {lutFilter && (
          <>
            <span className="hidden lg:inline text-neutral-700 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden lg:inline text-neutral-500 group-hover:text-emerald-400 whitespace-nowrap shrink-0 transition-colors duration-200">
              LUT: {lutFilter}
            </span>
          </>
        )}

        {dopamineConfig && (
          <>
            <span className="hidden xl:inline text-neutral-700 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden xl:inline-flex items-center gap-1 text-neutral-500 group-hover:text-rose-400 font-bold whitespace-nowrap shrink-0 tabular-nums transition-colors duration-200">
              <Zap className="w-2.5 h-2.5" />
              <span>
                DOPAMINE FX {dopamineConfig.glitchIntensity ?? 80}%/{dopamineConfig.strobeRate ?? 60}Hz
              </span>
            </span>
          </>
        )}
      </div>

      {/* Right: Merged Hardware Pipeline, Calibration, Runtime, Preset & Quick Triggers */}
      <div className="flex items-center gap-1.5 shrink-0 uppercase text-[9px]">
        {onToggleWebCodecs && (
          <button
            type="button"
            onClick={onToggleWebCodecs}
            className={`px-1 py-0 rounded border text-[8.5px] font-bold flex items-center gap-0.5 transition-colors duration-200 cursor-pointer leading-tight ${
              isWebCodecsEngineActive
                ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400 group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-400'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-500 group-hover:text-amber-300 group-hover:border-amber-500/40'
            }`}
            title="Toggle WebCodecs 24fps WebGL2 Ping-Pong Engine"
          >
            <Zap className="w-2 h-2 text-current" />
            <span>{isWebCodecsEngineActive ? 'WEBCODECS' : 'NATIVE'}</span>
          </button>
        )}

        <span className="hidden md:inline text-neutral-700 group-hover:text-white/20">·</span>
        <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-emerald-400 group-hover:animate-pulse transition-colors duration-200" />
          <span>CALIBRATED</span>
        </span>

        <span className="hidden md:inline text-neutral-700 group-hover:text-white/20">·</span>
        <span className="hidden md:inline text-neutral-500 group-hover:text-emerald-400 whitespace-nowrap transition-colors duration-200">
          16-BIT ARRI
        </span>

        {totalRuntimeTimecode && (
          <>
            <span className="hidden lg:inline text-neutral-700 group-hover:text-white/20">·</span>
            <span className="hidden lg:inline text-neutral-500 group-hover:text-emerald-400 whitespace-nowrap tabular-nums transition-colors duration-200">
              RUNTIME: {totalRuntimeTimecode}
              {typeof totalShotsCount === 'number' ? `/${totalShotsCount}S` : ''}
            </span>
          </>
        )}

        <span
          className={`hidden sm:inline px-1 rounded bg-neutral-900/60 border border-neutral-800 text-neutral-500 text-[8.5px] leading-tight transition-colors duration-200 ${presetHoverClass}`}
        >
          {activePreset.replace('-', ' ').toUpperCase()}
        </span>

        {onToggleTitles && (
          <button
            type="button"
            onClick={onToggleTitles}
            className="px-1 rounded border bg-neutral-900/60 border-neutral-800 text-neutral-500 group-hover:text-neutral-200 group-hover:border-neutral-700 hover:!text-amber-300 flex items-center gap-0.5 cursor-pointer transition-colors duration-200 text-[8.5px] leading-tight"
            title={isTitlesActive ? 'Hide Stage Cinema Title Overlay' : 'Show Stage Cinema Title Overlay'}
          >
            {isTitlesActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
            <span>{isTitlesActive ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {onUploadMedia && (
          <button
            type="button"
            onClick={onUploadMedia}
            className="p-0.5 rounded bg-neutral-900/60 border border-neutral-800 text-neutral-500 group-hover:text-neutral-200 hover:!text-amber-300 transition-colors duration-200 cursor-pointer"
            title="Upload / Replace Media Plate"
          >
            <Upload className="w-2.5 h-2.5" />
          </button>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-0.5 rounded bg-neutral-900/60 border border-neutral-800 text-neutral-500 group-hover:text-neutral-200 hover:!text-white transition-colors duration-200 cursor-pointer"
            title="Toggle Stage Fullscreen"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
};
