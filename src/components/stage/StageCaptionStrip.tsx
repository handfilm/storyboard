/**
 * @file /src/components/stage/StageCaptionStrip.tsx
 * @description Single compact 20px (h-5) External Technical Telemetry Bar strictly BELOW the video box.
 * Merges shot telemetry, optics/LUT, WebCodecs status, calibration, bit depth, runtime, and preset badge
 * into one Stealth Grey bar that illuminates with vibrant accents on hover.
 */

import React, { useEffect, useRef } from 'react';
import { Eye, EyeOff, Maximize2, Upload, Zap } from 'lucide-react';
import {
  useStudioStore,
  HeroTitlePreset,
  resolveEffectiveTitleAlign
} from '../../core/store';
import { ComponentVisibility } from '../ComponentsMatrixPopover';
import { DopamineShotConfig } from '../../types/anthology';
import { playbackClock } from '../../utils/playbackClock';
import { CinemaToolHUD } from '../ui/CinemaToolHUD';

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
  const progressFillDomRef = useRef<HTMLDivElement | null>(null);
  const shotIndexRef = useRef(shotIndex);
  const durationPropRef = useRef(durationSec);
  shotIndexRef.current = shotIndex;
  durationPropRef.current = durationSec;

  const initialProgressPct =
    durationSec > 0 ? Math.min(100, Math.max(0, (slideTimeSec / durationSec) * 100)) : 0;

  useEffect(() => {
    return playbackClock.subscribe((snap) => {
      const el = progressFillDomRef.current;
      if (!el) return;
      if (snap.shotIndex !== shotIndexRef.current) return;
      const activeDur = snap.durationSec > 0 ? snap.durationSec : durationPropRef.current;
      const pct = activeDur > 0 ? Math.min(100, Math.max(0, (snap.timeSec / activeDur) * 100)) : 0;
      el.style.width = `${pct.toFixed(3)}%`;
    });
  }, []);

  const presetHoverClass =
    activePreset === 'titanium-silver'
      ? 'group-hover:text-[#F4F4F5] group-hover:border-white/25'
      : activePreset === 'neon-crimson'
        ? 'group-hover:text-[#F59E0B] group-hover:border-[#F59E0B]/40'
        : 'group-hover:text-[#F59E0B] group-hover:border-[#F59E0B]/40';

  const sceneLabel = sceneCode || String(Math.floor(shotIndex / 10)).padStart(2, '0');
  const shotLabel = String(shotIndex + 1).padStart(2, '0');

  return (
    <div
      data-testid="stage-caption-strip"
      className={`group relative w-full h-4 min-h-[16px] max-h-[16px] px-2.5 py-0 bg-[#0B0B0D]/95 border-t border-b border-white/[0.07] text-neutral-500 group-hover:text-neutral-200 !text-[#8E8E93] group-hover:!text-[#F4F4F5] transition-colors duration-200 flex items-center justify-between gap-2 shrink-0 select-none overflow-hidden font-mono text-[8.5px] leading-none tracking-wider tabular-nums ${className}`}
    >
      {/* Subtle 1px Progress Baseline (Stealth grey at rest -> Molten Amber on hover) */}
      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-white/[0.07] pointer-events-none">
        <div
          ref={progressFillDomRef}
          className="h-full bg-[#8E8E93]/60 group-hover:bg-[#F59E0B] transition-colors duration-200"
          style={{ width: `${initialProgressPct}%` }}
        />
      </div>

      {/* Left: Unified Single-Line Technical Telemetry */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate uppercase tabular-nums">
        <span className="text-[#F4F4F5]/90 group-hover:text-[#F59E0B] font-bold whitespace-nowrap shrink-0 transition-colors duration-200">
          SCENE {sceneLabel} // SHOT {shotLabel}
        </span>

        <span className="text-white/15 group-hover:text-white/25 shrink-0">·</span>
        <span className="whitespace-nowrap shrink-0">
          {aspectRatio} SCOPE
        </span>

        <span className="hidden sm:inline text-white/15 group-hover:text-white/25 shrink-0">·</span>
        <span className="hidden sm:inline text-[#8E8E93] group-hover:text-[#F4F4F5] whitespace-nowrap shrink-0 transition-colors duration-200">
          TITLE: {titleAlign === 'AUTO' ? `AUTO→${effectiveAlign}` : titleAlign}
        </span>

        {cameraSpec && (
          <>
            <span className="hidden md:inline text-white/15 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden md:inline whitespace-nowrap shrink-0">
              {cameraSpec}
            </span>
          </>
        )}

        {lutFilter && (
          <>
            <span className="hidden lg:inline text-white/15 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden lg:inline text-[#8E8E93] group-hover:text-[#F4F4F5] whitespace-nowrap shrink-0 transition-colors duration-200">
              LUT: {lutFilter}
            </span>
          </>
        )}

        {dopamineConfig && (
          <>
            <span className="hidden xl:inline text-white/15 group-hover:text-white/25 shrink-0">·</span>
            <span className="hidden xl:inline-flex items-center gap-1 text-[#8E8E93] group-hover:text-[#F59E0B] font-bold whitespace-nowrap shrink-0 tabular-nums transition-colors duration-200">
              <Zap className="w-2.5 h-2.5" />
              <span>
                DOPAMINE FX {dopamineConfig.glitchIntensity ?? 80}%/{dopamineConfig.strobeRate ?? 60}Hz
              </span>
            </span>
          </>
        )}
      </div>

      {/* Right: Merged Hardware Pipeline, Calibration, Runtime, Preset & Quick Triggers */}
      <div className="flex items-center gap-1.5 shrink-0 uppercase text-[8.5px] leading-none tabular-nums">
        {onToggleWebCodecs && (
          <CinemaToolHUD
            title={isWebCodecsEngineActive ? 'WEBCODECS ON' : 'NATIVE ENGINE'}
            en="Toggle 16-bit WebCodecs WebGL2 hardware render pipeline."
            bn="১৬-বিট ওয়েবকোডেক্স রেন্ডার ইঞ্জিন চালু বা বন্ধ করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={onToggleWebCodecs}
              className={`px-1 py-0 rounded border text-[8px] font-bold flex items-center gap-0.5 transition-colors duration-200 cursor-pointer leading-none ${
                isWebCodecsEngineActive
                  ? 'bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:bg-[#F59E0B] group-hover:text-[#0B0B0D] group-hover:border-[#F59E0B]'
                  : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] group-hover:border-[#F59E0B]/40'
              }`}
            >
              <Zap className="w-2 h-2 text-current" />
              <span>{isWebCodecsEngineActive ? 'WEBCODECS' : 'NATIVE'}</span>
            </button>
          </CinemaToolHUD>
        )}

        <span className="hidden md:inline text-white/15 group-hover:text-white/25">·</span>
        <span className="hidden md:inline-flex items-center gap-1 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#8E8E93]/60 group-hover:bg-[#F59E0B] transition-colors duration-200" />
          <span>CALIBRATED</span>
        </span>

        <span className="hidden md:inline text-white/15 group-hover:text-white/25">·</span>
        <span className="hidden md:inline text-[#8E8E93] group-hover:text-[#F4F4F5] whitespace-nowrap transition-colors duration-200">
          16-BIT
        </span>

        {totalRuntimeTimecode && (
          <>
            <span className="hidden lg:inline text-white/15 group-hover:text-white/25">·</span>
            <span className="hidden lg:inline text-[#8E8E93] group-hover:text-[#F4F4F5] whitespace-nowrap tabular-nums transition-colors duration-200">
              {totalRuntimeTimecode}
              {typeof totalShotsCount === 'number' ? `/${totalShotsCount}S` : ''}
            </span>
          </>
        )}

        <span
          className={`hidden sm:inline px-1 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] text-[8.5px] leading-tight transition-colors duration-200 ${presetHoverClass}`}
        >
          {activePreset.replace('-', ' ').toUpperCase()}
        </span>

        {onToggleTitles && (
          <CinemaToolHUD
            title="STAGE TITLES"
            en="Toggle cinema title overlay visibility."
            bn="স্টেজে টাইটেল দেখাতে বা লুকাতে চাপুন।"
            shortcut="T"
            accent="amber"
          >
            <button
              type="button"
              onClick={onToggleTitles}
              className="px-1 rounded border bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] group-hover:border-white/[0.14] hover:!text-[#F59E0B] flex items-center gap-0.5 cursor-pointer transition-colors duration-200 text-[8.5px] leading-tight"
            >
              {isTitlesActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
              <span>{isTitlesActive ? 'ON' : 'OFF'}</span>
            </button>
          </CinemaToolHUD>
        )}

        {onUploadMedia && (
          <CinemaToolHUD
            title="UPLOAD MEDIA"
            en="Upload or replace video/image plate for active shot."
            bn="বর্তমান শটে ভিডিও বা ছবি আপলোড করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={onUploadMedia}
              className="p-0.5 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] transition-colors duration-200 cursor-pointer"
            >
              <Upload className="w-2.5 h-2.5" />
            </button>
          </CinemaToolHUD>
        )}

        {onToggleFullscreen && (
          <CinemaToolHUD
            title="FULLSCREEN"
            en="Expand cinema viewport to full display."
            bn="সিনেমা স্ক্রিন ফুল-স্ক্রিনে বড় করতে চাপুন।"
            shortcut="F"
            accent="cyan"
          >
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-0.5 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] transition-colors duration-200 cursor-pointer"
            >
              <Maximize2 className="w-2.5 h-2.5" />
            </button>
          </CinemaToolHUD>
        )}
      </div>
    </div>
  );
};
