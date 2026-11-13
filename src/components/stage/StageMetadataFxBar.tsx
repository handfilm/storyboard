/**
 * @file /src/components/stage/StageMetadataFxBar.tsx
 * @description Unified Single-Row 24px Top Stage Header rendered strictly ABOVE the video canvas.
 * Houses consolidated shot telemetry (Scene/Shot, Frame/SMPTE, Lens icon tooltip, LUT icon tooltip,
 * WebCodecs 16-bit Engine status dot), plus deduplicated Right Cluster controls:
 * Advanced 9-Zone Title Position & Choreography Matrix, Multi-Layer Zoom, [ TITLE FX ], and Edit In.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ZoomIn,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  Compass,
  Aperture,
  Palette,
  Cpu,
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Crosshair,
  Frame,
  Activity,
  SplitSquareHorizontal,
  ArrowLeftRight
} from 'lucide-react';
import { useStudioStore, HeroTitlePreset, TitleAlign, StageViewportScale } from '../../core/store';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { eventBus } from '../../core/eventBus';
import { playbackClock, formatSmpteTimecode } from '../../utils/playbackClock';
import { AnthologyFrame, FrameAdjustments, LutPreset } from '../../types/anthology';
import { TitleZone9 } from '../../types/titlePreset';
import { EditInAppStrip } from '../bridge/EditInAppStrip';
import { resolveShotTitleData } from '../../constants/titleTemplates';
import { formatLutPresetLabel } from '../../utils/engine';
import {
  TITLE_ZONE_9_MATRIX,
  getKineticEntranceLabel,
  resolveSpatialTitleChoreography
} from '../../services/titleChoreographyEngine';

export interface StageMetadataFxBarProps {
  sceneCode?: string;
  shotIndex: number;
  frame?: AnthologyFrame | null;
  frameNum: number;
  totalFrames: number;
  smpte?: string;
  fps: number;
  streamLabel?: string;
  aspectRatio: string;
  playbackMode?: 'solo' | 'sequence' | string;
  showHud?: boolean;
  isTitlesActive?: boolean;
  onToggleTitles?: () => void;
  lightName?: string;
  lutFilter?: LutPreset | string;
  adjustments?: FrameAdjustments;
  isWebCodecsEngineActive?: boolean;
  onToggleWebCodecs?: () => void;
  velocityBadge?: { label: string; color: string } | null;
  inOutBadge?: string | null;
  safeZone?: 'top' | 'center' | 'bottom';
  onChangeSafeZone?: (zone: 'top' | 'center' | 'bottom') => void;
  // Optional legacy/secondary modal props (kept for ReelsView/OpticalMonitor compatibility; deduplicated in Stage HUD)
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
  onUploadMedia?: () => void;
  onOpenInspector?: () => void;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const StageMetadataFxBar: React.FC<StageMetadataFxBarProps> = ({
  sceneCode = '00',
  shotIndex,
  frame,
  frameNum,
  totalFrames,
  smpte,
  fps,
  streamLabel = 'RAW 4K',
  aspectRatio,
  showHud = true,
  isTitlesActive = true,
  onToggleTitles,
  lutFilter,
  adjustments,
  isWebCodecsEngineActive = true,
  onToggleWebCodecs,
  velocityBadge,
  inOutBadge,
  safeZone,
  onChangeSafeZone,
  className = ''
}) => {
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const titleZone = useStudioStore((s) => s.titleZone);
  const setTitleAlign = useStudioStore((s) => s.setTitleAlign);
  const setTitleZone = useStudioStore((s) => s.setTitleZone);
  const setIsSafeZoneOverlayVisible = useStudioStore((s) => s.setIsSafeZoneOverlayVisible);

  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const digitalZoom = useStudioStore((s) => s.digitalZoom);
  const resetDigitalZoom = useStudioStore((s) => s.resetDigitalZoom);

  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const setTitlePreset = useStudioStore((s) => s.setTitlePreset);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore((s) => s.setTitleGlowIntensity);
  const setTitleVerticalOffset = useStudioStore((s) => s.setTitleVerticalOffset);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);

  const stageScale = useStudioStore((s) => s.stageScale);
  const setStageScale = useStudioStore((s) => s.setStageScale);
  const monitorGuidesVisible = useStudioStore((s) => s.monitorGuidesVisible);
  const toggleMonitorGuides = useStudioStore((s) => s.toggleMonitorGuides);
  const monitorFocusPeaking = useStudioStore((s) => s.monitorFocusPeaking);
  const toggleMonitorFocusPeaking = useStudioStore((s) => s.toggleMonitorFocusPeaking);
  const monitorZebraExposure = useStudioStore((s) => s.monitorZebraExposure);
  const toggleMonitorZebraExposure = useStudioStore((s) => s.toggleMonitorZebraExposure);
  const monitorSplitCompare = useStudioStore((s) => s.monitorSplitCompare);
  const toggleMonitorSplitCompare = useStudioStore((s) => s.toggleMonitorSplitCompare);
  const toggleShotReverse = useStudioStore((s) => s.toggleShotReverse);

  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isTitleFxOpen, setIsTitleFxOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [isMatrixPinned, setIsMatrixPinned] = useState(false);

  const zoomBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleFxBtnRef = useRef<HTMLButtonElement | null>(null);
  const matrixBtnRef = useRef<HTMLButtonElement | null>(null);
  const matrixCloseTimerRef = useRef<number | null>(null);

  const [zoomAnchor, setZoomAnchor] = useState<{ right: number; top: number } | null>(null);
  const [titleFxAnchor, setTitleFxAnchor] = useState<{ right: number; top: number } | null>(null);
  const [matrixAnchor, setMatrixAnchor] = useState<{ right: number; top: number } | null>(null);

  const storeShot = useStudioStore((s) => s.project.shots?.[shotIndex]);
  const activeFrame = frame || storeShot;
  const shotTitleData = resolveShotTitleData(activeFrame, shotIndex, storeTitleConfig, titleAlign);
  const resolvedPresetConfig = shotTitleData.styleConfig;
  const activeShotAlign: TitleAlign = storeTitleConfig?.heroGlobal
    ? titleAlign
    : shotTitleData.alignment;
  const activeShotZone: TitleZone9 | 'AUTO' = storeTitleConfig?.heroGlobal
    ? titleZone
    : (shotTitleData.zone9 ?? 'AUTO');

  const choreography = resolveSpatialTitleChoreography({
    titleAlign: activeShotAlign,
    zone9: activeShotZone,
    layoutMode: resolvedPresetConfig.layoutMode,
    shotIndex,
    shotType: activeFrame?.shotType,
    panX: activeFrame?.panX,
    panY: activeFrame?.panY,
    smartCropMode: activeFrame?.smartCropMode,
    aspectRatio
  });

  const activePreset: HeroTitlePreset =
    shotTitleData.presetId === 'molten-gold' ||
    shotTitleData.presetId === 'titanium-silver' ||
    shotTitleData.presetId === 'neon-crimson'
      ? shotTitleData.presetId
      : (storeTitleConfig?.preset || 'molten-gold');
  const glow = shotTitleData.glowIntensity ?? 1.0;
  const tracking = shotTitleData.letterTracking ?? 0.15;
  const verticalOffset = shotTitleData.verticalOffset ?? 0;
  const titleSizePx = shotTitleData.fontScale ?? 72;

  useEffect(() => {
    const closeAll = () => {
      setIsZoomOpen(false);
      setIsTitleFxOpen(false);
      setIsMatrixOpen(false);
      setIsMatrixPinned(false);
      setIsSafeZoneOverlayVisible(false);
    };
    window.addEventListener('resize', closeAll);
    return () => {
      window.removeEventListener('resize', closeAll);
      if (matrixCloseTimerRef.current) window.clearTimeout(matrixCloseTimerRef.current);
      setIsSafeZoneOverlayVisible(false);
    };
  }, [setIsSafeZoneOverlayVisible]);

  useEffect(() => {
    setIsSafeZoneOverlayVisible(isMatrixOpen);
  }, [isMatrixOpen, setIsSafeZoneOverlayVisible]);

  const clearMatrixCloseTimer = () => {
    if (matrixCloseTimerRef.current) {
      window.clearTimeout(matrixCloseTimerRef.current);
      matrixCloseTimerRef.current = null;
    }
  };

  const computeMatrixAnchor = () => {
    if (!matrixBtnRef.current) return;
    const r = matrixBtnRef.current.getBoundingClientRect();
    setMatrixAnchor({
      right: Math.max(12, window.innerWidth - r.right),
      top: r.bottom + 5
    });
  };

  const handleMatrixMouseEnter = () => {
    clearMatrixCloseTimer();
    computeMatrixAnchor();
    setIsMatrixOpen(true);
  };

  const handleMatrixMouseLeave = () => {
    if (isMatrixPinned) return;
    clearMatrixCloseTimer();
    matrixCloseTimerRef.current = window.setTimeout(() => {
      setIsMatrixOpen(false);
    }, 150);
  };

  const toggleMatrixPin = () => {
    clearMatrixCloseTimer();
    setIsZoomOpen(false);
    setIsTitleFxOpen(false);
    computeMatrixAnchor();
    if (isMatrixPinned) {
      setIsMatrixPinned(false);
      setIsMatrixOpen(false);
    } else {
      setIsMatrixPinned(true);
      setIsMatrixOpen(true);
    }
  };

  const openZoomPopover = () => {
    setIsTitleFxOpen(false);
    setIsMatrixOpen(false);
    setIsMatrixPinned(false);
    if (!isZoomOpen && zoomBtnRef.current) {
      const r = zoomBtnRef.current.getBoundingClientRect();
      setZoomAnchor({
        right: Math.max(12, window.innerWidth - r.right),
        top: r.bottom + 5
      });
    }
    setIsZoomOpen((v) => !v);
  };

  const openTitleFxPopover = () => {
    setIsZoomOpen(false);
    setIsMatrixOpen(false);
    setIsMatrixPinned(false);
    if (!isTitleFxOpen && titleFxBtnRef.current) {
      const r = titleFxBtnRef.current.getBoundingClientRect();
      setTitleFxAnchor({
        right: Math.max(12, window.innerWidth - r.right),
        top: r.bottom + 5
      });
    }
    setIsTitleFxOpen((v) => !v);
  };

  const frameTagDomRef = useRef<HTMLSpanElement | null>(null);
  const smpteDomRef = useRef<HTMLSpanElement | null>(null);
  const hudCtxRef = useRef({ shotIndex, totalFrames, fps, showHud });
  hudCtxRef.current = { shotIndex, totalFrames, fps, showHud };

  useEffect(() => {
    return playbackClock.subscribe((snap) => {
      const ctx = hudCtxRef.current;
      if (!ctx.showHud || snap.shotIndex !== ctx.shotIndex) return;
      const activeFps = snap.fps > 0 ? snap.fps : ctx.fps;
      const activeTotal = ctx.totalFrames > 0 ? ctx.totalFrames : Math.max(1, Math.round((snap.durationSec || 12) * activeFps));
      const nextFrame = Math.min(
        activeTotal,
        Math.max(1, Math.floor(Math.max(0, snap.timeSec) * activeFps) + 1)
      );
      if (frameTagDomRef.current) {
        frameTagDomRef.current.textContent = `F${String(nextFrame).padStart(3, '0')}/${String(activeTotal).padStart(3, '0')}`;
      }
      if (smpteDomRef.current) {
        smpteDomRef.current.textContent = formatSmpteTimecode(snap.timeSec, activeFps);
      }
    });
  }, []);

  const normalizedScene = (sceneCode || '00').replace(/[^0-9A-Za-z]/g, '').slice(0, 2).padStart(2, '0');
  const shotCodeShort = String(shotIndex + 1).padStart(2, '0');
  const frameTag = `F${String(Math.min(totalFrames, Math.max(1, frameNum))).padStart(3, '0')}/${String(totalFrames).padStart(3, '0')}`;

  // Concise Optics, LUT, & Calibration specs for icon micro-pills + rich hover tooltips
  const focalLen = activeFrame?.cameraSpec?.focalLength || '35mm';
  const aperture = activeFrame?.cameraSpec?.aperture || 'f/1.4';
  const shutter = activeFrame?.cameraSpec?.shutter || '180°';
  const iso = activeFrame?.cameraSpec?.iso || '800';
  const sensor = activeFrame?.cameraSpec?.sensor || 'ARRI ALEXA 35';
  const rawFormat = activeFrame?.cameraSpec?.format || '16-BIT RAW';

  const effectiveLut = lutFilter ?? activeFrame?.lutFilter ?? 'cinematic';
  const lutLabel = formatLutPresetLabel(effectiveLut).toUpperCase();
  const adj = adjustments ?? activeFrame?.adjustments;

  const avgZoom = isVertigo ? fgZoom : (fgZoom + bgZoom) / 2;

  return (
    <div
      data-testid="stage-metadata-fx-bar"
      className={`group relative animate-hud-fade-in w-full h-[24px] min-h-[24px] max-h-[24px] py-0 px-2.5 bg-[#0B0B0D]/95 border-b border-neutral-900 text-neutral-500 group-hover:text-neutral-200 [border-bottom-color:rgba(255,255,255,0.08)] !text-[#8E8E93] group-hover:!text-[#F4F4F5] transition-colors duration-200 flex items-center justify-between gap-2 text-[9px] leading-none font-mono tabular-nums select-none shrink-0 z-40 ${className}`}
    >
      {/* LEFT CLUSTER: SC00 // SH01 • F001/144 · SMPTE • Icon Micro-Pills (Lens, LUT, Engine Status) */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[#F59E0B]/90 group-hover:text-[#F59E0B] font-bold tracking-wider tabular-nums whitespace-nowrap shrink-0 transition-colors duration-200">
          SC{normalizedScene} // SH{shotCodeShort}
        </span>

        {showHud && (
          <div className="flex items-center gap-1 shrink-0 text-[8.5px]">
            <span className="text-white/20">·</span>
            <span
              ref={frameTagDomRef}
              className="text-[#8E8E93] group-hover:text-[#F4F4F5] font-bold tabular-nums whitespace-nowrap transition-colors duration-200"
            >
              {frameTag}
            </span>
            {smpte && (
              <>
                <span className="text-white/20 hidden sm:inline">·</span>
                <span
                  ref={smpteDomRef}
                  className="text-[#8E8E93] group-hover:text-[#F4F4F5] tabular-nums hidden sm:inline whitespace-nowrap transition-colors duration-200"
                >
                  {smpte}
                </span>
              </>
            )}
          </div>
        )}

        {/* Icon Micro-Pill: OPTICS / LENS (with rich hover tooltip) */}
        <div className="relative group/lens hidden md:inline-flex shrink-0">
          <div
            data-testid="hud-lens-pill"
            className="h-[17px] px-1.5 rounded bg-[#141417] border border-white/[0.07] group-hover/lens:border-[#F59E0B]/60 text-[#8E8E93] group-hover/lens:text-[#F4F4F5] flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap transition-all duration-150 cursor-help"
          >
            <Aperture className="w-2.5 h-2.5 text-[#F59E0B]/80 group-hover/lens:text-[#F59E0B]" />
            <span>{focalLen} {aperture}</span>
          </div>
          <div className="pointer-events-none opacity-0 group-hover/lens:opacity-100 translate-y-1 group-hover/lens:translate-y-0 transition-all duration-150 absolute left-0 top-full mt-1.5 w-56 p-2.5 rounded-md bg-[#0B0B0D]/98 border border-[#F59E0B]/35 shadow-[0_14px_34px_rgba(0,0,0,0.92)] backdrop-blur-xl z-[120] text-[9px] space-y-1">
            <div className="flex items-center justify-between text-[#F59E0B] font-bold border-b border-white/[0.08] pb-1">
              <span>CAMERA &amp; OPTICS</span>
              <span>{fps}.0 FPS</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>GLASS</span>
              <span className="text-[#F4F4F5] font-bold">{focalLen} · {aperture}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>EXPOSURE</span>
              <span className="text-[#F4F4F5]">{shutter} · ISO {iso}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>SENSOR</span>
              <span className="text-[#F4F4F5] truncate max-w-[130px]">{sensor}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>CODEC</span>
              <span className="text-[#F59E0B]">{rawFormat} · {streamLabel}</span>
            </div>
          </div>
        </div>

        {/* Icon Micro-Pill: COLOR LUT (with rich hover tooltip) */}
        <div className="relative group/lut hidden lg:inline-flex shrink-0">
          <div
            data-testid="hud-lut-pill"
            className="h-[17px] px-1.5 rounded bg-[#141417] border border-white/[0.07] group-hover/lut:border-[#F59E0B]/60 text-[#8E8E93] group-hover/lut:text-[#F4F4F5] flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap transition-all duration-150 cursor-help"
          >
            <Palette className="w-2.5 h-2.5 text-cyan-400/80 group-hover/lut:text-cyan-300" />
            <span>{lutLabel}</span>
          </div>
          <div className="pointer-events-none opacity-0 group-hover/lut:opacity-100 translate-y-1 group-hover/lut:translate-y-0 transition-all duration-150 absolute left-0 top-full mt-1.5 w-52 p-2.5 rounded-md bg-[#0B0B0D]/98 border border-cyan-400/35 shadow-[0_14px_34px_rgba(0,0,0,0.92)] backdrop-blur-xl z-[120] text-[9px] space-y-1">
            <div className="flex items-center justify-between text-cyan-300 font-bold border-b border-white/[0.08] pb-1">
              <span>COLOR PIPELINE</span>
              <span>CALIBRATED</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>ACTIVE LUT</span>
              <span className="text-[#F4F4F5] font-bold">{lutLabel}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>BRIGHT / CONT</span>
              <span className="text-[#F4F4F5]">{adj?.brightness ?? 100}% / {adj?.contrast ?? 100}%</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>SAT / GRAIN</span>
              <span className="text-[#F4F4F5]">{adj?.saturation ?? 100}% / {adj?.grain ?? 15}%</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>VIGNETTE</span>
              <span className="text-[#F4F4F5]">{adj?.vignette ?? 20}%</span>
            </div>
          </div>
        </div>

        {/* Icon Micro-Pill: ENGINE STATUS (Green Active Dot + 16-BIT WEBCODECS tooltip) */}
        <div className="relative group/engine hidden xl:inline-flex shrink-0">
          <button
            type="button"
            data-testid="hud-engine-status-pill"
            onClick={() => onToggleWebCodecs?.()}
            className={`h-[17px] px-1.5 rounded bg-[#141417] border border-white/[0.07] group-hover/engine:border-emerald-400/50 text-[#8E8E93] group-hover/engine:text-[#F4F4F5] flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap transition-all duration-150 ${
              onToggleWebCodecs ? 'cursor-pointer' : 'cursor-help'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isWebCodecsEngineActive
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                  : 'bg-neutral-500'
              }`}
            />
            <span>{isWebCodecsEngineActive ? '16-BIT WEBCODECS' : 'NATIVE ENGINE'}</span>
          </button>
          <div className="pointer-events-none opacity-0 group-hover/engine:opacity-100 translate-y-1 group-hover/engine:translate-y-0 transition-all duration-150 absolute left-0 top-full mt-1.5 w-56 p-2.5 rounded-md bg-[#0B0B0D]/98 border border-emerald-400/35 shadow-[0_14px_34px_rgba(0,0,0,0.92)] backdrop-blur-xl z-[120] text-[9px] space-y-1">
            <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-white/[0.08] pb-1">
              <span className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                <span>RENDER ENGINE</span>
              </span>
              <span>{isWebCodecsEngineActive ? 'ACTIVE' : 'BYPASS'}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>COLOR DEPTH</span>
              <span className="text-[#F4F4F5] font-bold">16-BIT ARRI ACEScg</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>CADENCE</span>
              <span className="text-[#F4F4F5]">{fps}.0 FPS · {streamLabel}</span>
            </div>
            <div className="flex justify-between text-[#8E8E93]">
              <span>STATUS</span>
              <span className="text-emerald-400">CALIBRATED · 0-DROP</span>
            </div>
          </div>
        </div>

        {velocityBadge && (
          <span className="hidden 2xl:inline px-1 h-[17px] leading-[17px] rounded border text-[8px] font-bold whitespace-nowrap shrink-0 bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:text-[#F59E0B] group-hover:border-[#F59E0B]/40 transition-colors duration-200">
            {velocityBadge.label}
          </span>
        )}

        {inOutBadge && (
          <span className="hidden 2xl:inline px-1 h-[17px] leading-[17px] rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:border-[#F59E0B]/40 group-hover:text-[#F59E0B] text-[8px] font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors duration-200">
            {inOutBadge}
          </span>
        )}

        {activeFrame?.isReversed && (
          <button
            type="button"
            data-testid="hud-reverse-indicator"
            onClick={() => toggleShotReverse(shotIndex)}
            className="h-[17px] px-1.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/60 text-[#F59E0B] flex items-center gap-1 text-[8px] font-bold whitespace-nowrap cursor-pointer shrink-0"
            title="Clip Reversed — Click to restore forward playback"
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>REV</span>
          </button>
        )}

        {digitalZoom.isZoomed && (
          <div className="flex items-center gap-1 px-1.5 h-[17px] rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:bg-[#F59E0B]/15 group-hover:border-[#F59E0B]/60 group-hover:text-[#F59E0B] text-[8px] font-bold tabular-nums shrink-0 transition-colors duration-200">
            <span>{digitalZoom.scale.toFixed(1)}x</span>
            <button
              type="button"
              onClick={resetDigitalZoom}
              className="px-1 rounded bg-[#0B0B0D] text-[#8E8E93] group-hover:text-[#F4F4F5] cursor-pointer flex items-center gap-0.5"
              title="Reset Digital Frame Zoom"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>RESET</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT CLUSTER (Deduplicated): Scale 50|75|100|FIT • Monitor Overlays • Title Matrix • Zoom • [ TITLE FX ] • Edit In */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Stage Viewport Scale: 50% | 75% | 100% | FIT */}
        <div
          data-testid="stage-scale-selector"
          className="flex items-center gap-0.5 px-1 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8px] font-bold tabular-nums shrink-0 touch-manipulation"
          role="group"
          aria-label="Viewport Scale"
        >
          {(
            [
              { value: 0.5, label: '50%' },
              { value: 0.75, label: '75%' },
              { value: 1.0, label: '100%' },
              { value: 'fit', label: 'FIT' },
            ] as Array<{ value: StageViewportScale; label: string }>
          ).map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              data-testid={`stage-scale-${opt.value}`}
              aria-pressed={stageScale === opt.value}
              onClick={() => setStageScale(opt.value)}
              className={`px-1 h-[14px] leading-none flex items-center rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                stageScale === opt.value
                  ? 'bg-[#F59E0B] text-[#0B0B0D] font-bold'
                  : 'text-[#8E8E93] hover:text-[#F4F4F5]'
              }`}
              title={`Set Stage Viewport Scale: ${opt.label}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Pro Cinema Monitor Overlays: Guides | Focus Peaking | Zebra >90 IRE | Split Wipe A|B */}
        <div
          data-testid="monitor-overlays-group"
          className="hidden md:flex items-center gap-0.5 px-1 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8px] font-bold shrink-0"
          role="group"
          aria-label="Monitor Overlays"
        >
          <button
            type="button"
            data-testid="monitor-overlay-guides"
            aria-pressed={monitorGuidesVisible}
            onClick={toggleMonitorGuides}
            className={`px-1 h-[14px] rounded flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              monitorGuidesVisible
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
            title="Rule-of-Thirds & 90%/93% Title-Safe Guides"
          >
            <Frame className="w-2.5 h-2.5" />
            <span className="hidden 2xl:inline">SAFE</span>
          </button>
          <button
            type="button"
            data-testid="monitor-overlay-peaking"
            aria-pressed={monitorFocusPeaking}
            onClick={toggleMonitorFocusPeaking}
            className={`px-1 h-[14px] rounded flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              monitorFocusPeaking
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
            title="Focus Peaking Edge Detection Overlay"
          >
            <Crosshair className="w-2.5 h-2.5" />
            <span className="hidden 2xl:inline">PEAK</span>
          </button>
          <button
            type="button"
            data-testid="monitor-overlay-zebra"
            aria-pressed={monitorZebraExposure}
            onClick={toggleMonitorZebraExposure}
            className={`px-1 h-[14px] rounded flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              monitorZebraExposure
                ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
            title="Zebra Exposure Warning (>90 IRE)"
          >
            <Activity className="w-2.5 h-2.5" />
            <span className="hidden 2xl:inline">ZEBRA</span>
          </button>
          <button
            type="button"
            data-testid="monitor-overlay-wipe"
            aria-pressed={monitorSplitCompare}
            onClick={toggleMonitorSplitCompare}
            className={`px-1 h-[14px] rounded flex items-center gap-0.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
              monitorSplitCompare
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'text-[#8E8E93] hover:text-[#F4F4F5]'
            }`}
            title="Before/After Split-Screen Wipe (Raw vs Graded + Lit + Titles)"
          >
            <SplitSquareHorizontal className="w-2.5 h-2.5" />
            <span className="hidden 2xl:inline">A|B</span>
          </button>
        </div>
        {safeZone && onChangeSafeZone && (
          <div className="hidden md:flex items-center gap-0.5 px-1 py-0 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8px] transition-colors duration-200">
            <Compass className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B] mr-0.5 transition-colors duration-200" />
            {(['top', 'center', 'bottom'] as const).map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => onChangeSafeZone(zone)}
                className={`px-1 rounded cursor-pointer transition-colors duration-200 ${
                  safeZone === zone
                    ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                    : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
                }`}
              >
                {zone === 'top' ? 'TOP' : zone === 'center' ? 'CTR' : 'BOT'}
              </button>
            ))}
          </div>
        )}

        {/* TITLE Position & Choreography Control (LEFT | MID | RIGHT | AUTO + 9-Zone Matrix Button) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div
            className="flex items-center gap-0.5 px-1 py-0 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8.5px] transition-colors duration-200 shrink-0"
            role="group"
            aria-label="Title Alignment"
          >
            <span className="hidden md:inline text-[#8E8E93] font-bold mr-0.5 transition-colors duration-200">TITLE:</span>
            {(['LEFT', 'MID', 'RIGHT', 'AUTO'] as TitleAlign[]).map((align) => (
              <button
                key={align}
                type="button"
                data-testid={`title-align-${align}`}
                aria-pressed={activeShotAlign === align}
                onClick={() => setTitleAlign(align)}
                className={`px-1 py-0 h-[14px] leading-none flex items-center rounded cursor-pointer transition-colors duration-200 ${
                  activeShotAlign === align
                    ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                    : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
                }`}
                title={
                  align === 'AUTO'
                    ? 'Smart Subject-Aware Negative-Space Composition'
                    : `Align Stage Cinema Title: ${align}`
                }
              >
                {align}
              </button>
            ))}

            {/* 9-Zone Anamorphic Safe-Zone Matrix Trigger */}
            <button
              ref={matrixBtnRef}
              type="button"
              data-testid="title-choreography-grid-btn"
              onMouseEnter={handleMatrixMouseEnter}
              onMouseLeave={handleMatrixMouseLeave}
              onClick={toggleMatrixPin}
              className={`ml-0.5 px-1 h-[14px] rounded flex items-center gap-0.5 cursor-pointer transition-all duration-150 ${
                isMatrixOpen || (activeShotZone && activeShotZone !== 'AUTO')
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/50'
                  : 'text-[#8E8E93] hover:text-[#F59E0B] hover:bg-white/[0.06]'
              }`}
              title="Open 9-Point Anamorphic Safe-Zone Matrix (Shows 90% Title-Safe & 93% Action-Safe Guides)"
              aria-label="9-Zone Title Position Matrix"
            >
              <LayoutGrid className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Multi-Layer ZOOM Trigger */}
        <button
          ref={zoomBtnRef}
          type="button"
          onClick={openZoomPopover}
          className={`px-1.5 py-0 h-[18px] rounded border text-[8.5px] font-bold tabular-nums flex items-center gap-1 cursor-pointer transition-all duration-200 ${
            isZoomOpen || fgZoom !== 1.0 || bgZoom !== 1.0
              ? 'bg-[#141417] border-[#F59E0B]/60 text-[#F4F4F5] group-hover:bg-[#F59E0B]/20 group-hover:border-[#F59E0B] group-hover:text-[#F59E0B]'
              : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60 hover:shadow-[0_0_10px_rgba(245,158,11,0.22)]'
          }`}
          title={`Multi-Layer Parallax Zoom (FG ${fgZoom.toFixed(1)}x / BG ${bgZoom.toFixed(1)}x)`}
        >
          <ZoomIn className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors duration-200" />
          <span className="tabular-nums">{avgZoom.toFixed(1)}x</span>
          {isVertigo && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />}
        </button>

        {/* [ TITLE FX ] Trigger Button */}
        <button
          ref={titleFxBtnRef}
          type="button"
          data-testid="stage-title-fx-button"
          onClick={openTitleFxPopover}
          className={`px-1.5 py-0 h-[18px] rounded border text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-200 ${
            isTitleFxOpen
              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
              : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:border-[#F59E0B]/60 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 hover:shadow-[0_0_10px_rgba(245,158,11,0.22)]'
          }`}
          title="Hero Title FX & Dopamine Presets"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>[ TITLE FX ]</span>
        </button>

        {/* Zero-Prompt EDIT IN App Strip (Ps, Pr, Ai, CapCut) */}
        <EditInAppStrip shotIndex={shotIndex} frame={frame} variant="hud" />
      </div>

      {/* PORTALED 9-POINT ANAMORPHIC SAFE-ZONE MATRIX POPOVER */}
      {isMatrixOpen && matrixAnchor && typeof document !== 'undefined' && createPortal(
        <>
          {isMatrixPinned && (
            <div
              className="fixed inset-0 z-[9997]"
              onClick={() => {
                setIsMatrixPinned(false);
                setIsMatrixOpen(false);
              }}
            />
          )}
          <div
            data-testid="title-zone-matrix-popover"
            onMouseEnter={handleMatrixMouseEnter}
            onMouseLeave={handleMatrixMouseLeave}
            style={{
              position: 'fixed',
              top: `${matrixAnchor.top}px`,
              right: `${matrixAnchor.right}px`,
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-[264px] bg-[#0B0B0D]/98 border border-[#F59E0B]/35 rounded-lg p-2.5 font-mono text-[9.5px] text-[#F4F4F5] space-y-2 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] animate-in fade-in duration-150 tabular-nums"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <div className="flex items-center gap-1.5 text-[#F59E0B] font-bold text-[9px]">
                <Crosshair className="w-3 h-3" />
                <span>9-ZONE SAFE CHOREOGRAPHY</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.08] text-[8px] text-[#8E8E93]">
                {activeShotZone === 'AUTO' ? `AUTO→${choreography.zone9.toUpperCase()}` : choreography.zone9.toUpperCase()}
              </span>
            </div>

            {/* 3x3 Miniature Cinema Safe Frame Grid */}
            <div className="relative p-2 rounded bg-[#050507] border border-white/[0.08]">
              {/* Inner 90% Title-Safe Guide Hint */}
              <div className="grid grid-cols-3 gap-1.5 relative z-10">
                {TITLE_ZONE_9_MATRIX.map((cell) => {
                  const isCellActive = choreography.zone9 === cell.zone;
                  const isManualLock = activeShotZone === cell.zone;
                  return (
                    <button
                      key={cell.zone}
                      type="button"
                      data-testid={`title-zone-cell-${cell.zone}`}
                      onClick={() => {
                        setTitleZone(cell.zone);
                        setIsMatrixPinned(true);
                      }}
                      title={`${cell.label} · Entrance: ${getKineticEntranceLabel(cell.entrance)}`}
                      className={`h-8 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-150 ${
                        isCellActive
                          ? isManualLock
                            ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] font-bold shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                            : 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] font-bold'
                          : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/50 hover:bg-[#1C1C22]'
                      }`}
                    >
                      <span className="text-[8.5px] leading-none font-bold">{cell.shortLabel}</span>
                      <span className={`text-[7px] leading-none opacity-75 ${isManualLock ? 'text-[#0B0B0D]' : 'text-[#8E8E93]'}`}>
                        {cell.col === 'LEFT' ? '←L' : cell.col === 'RIGHT' ? 'R→' : '✦'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Smart AUTO Negative-Space Toggle */}
            <button
              type="button"
              data-testid="title-zone-auto-btn"
              onClick={() => {
                setTitleZone('AUTO');
                setIsMatrixPinned(true);
              }}
              className={`w-full py-1.5 px-2 rounded border text-[8.5px] font-bold flex items-center justify-between cursor-pointer transition-colors ${
                activeShotZone === 'AUTO' && activeShotAlign === 'AUTO'
                  ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                  : 'bg-[#141417] border-white/[0.08] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/40'
              }`}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>AUTO · SUBJECT-AWARE SPACE</span>
              </span>
              <span>{activeShotAlign === 'AUTO' ? 'ON' : 'SET'}</span>
            </button>

            {/* Kinetic Entrance + Safe-Zone Guide Readout */}
            <div className="flex items-center justify-between text-[8px] text-[#8E8E93] pt-0.5 border-t border-white/[0.06]">
              <span className="flex items-center gap-1 text-[#F4F4F5]">
                {choreography.kineticEntrance === 'slide-from-left' && <ArrowLeft className="w-2.5 h-2.5 text-[#F59E0B]" />}
                {choreography.kineticEntrance === 'slide-from-right' && <ArrowRight className="w-2.5 h-2.5 text-[#F59E0B]" />}
                {choreography.kineticEntrance === 'center-bloom' && <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />}
                <span>{getKineticEntranceLabel(choreography.kineticEntrance)}</span>
              </span>
              <span className="text-emerald-400/90">90% / 93% SAFE LIVE</span>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* PORTALED MULTI-LAYER ZOOM POPOVER */}
      {isZoomOpen && zoomAnchor && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsZoomOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: `${zoomAnchor.top}px`,
              right: `${zoomAnchor.right}px`,
              zIndex: 9999
            }}
            className="w-80 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <MultiLayerZoomControls onClose={() => setIsZoomOpen(false)} />
          </div>
        </>,
        document.body
      )}

      {/* PORTALED [ TITLE FX ] POPOVER */}
      {isTitleFxOpen && titleFxAnchor && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsTitleFxOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: `${titleFxAnchor.top}px`,
              right: `${titleFxAnchor.right}px`,
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-72 bg-[#0B0B0D]/96 border border-white/[0.07] rounded-lg p-3 font-mono text-[10px] text-[#F4F4F5] space-y-2.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] animate-in fade-in duration-150 tabular-nums"
          >
            <div className="flex items-center justify-between text-[#F59E0B] font-bold text-[9.5px] border-b border-white/[0.07] pb-1.5 gap-1">
              <span className="truncate">{resolvedPresetConfig.presetName}</span>
              {onToggleTitles && (
                <button
                  type="button"
                  onClick={onToggleTitles}
                  className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isTitlesActive
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F4F4F5]'
                      : 'bg-[#141417] border-white/[0.07] text-[#8E8E93]'
                  }`}
                >
                  {isTitlesActive ? <Eye className="w-2.5 h-2.5 text-[#F59E0B]" /> : <EyeOff className="w-2.5 h-2.5" />}
                  <span>{isTitlesActive ? 'STRIP ON' : 'STRIP OFF'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setTitlePreset('molten-gold')}
                className={`p-1.5 text-[8.5px] font-bold rounded border cursor-pointer transition-colors ${
                  activePreset === 'molten-gold'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                    : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                GOLD
              </button>
              <button
                type="button"
                onClick={() => setTitlePreset('titanium-silver')}
                className={`p-1.5 text-[8.5px] font-bold rounded border cursor-pointer transition-colors ${
                  activePreset === 'titanium-silver'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                    : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                SILVER
              </button>
              <button
                type="button"
                onClick={() => setTitlePreset('neon-crimson')}
                className={`p-1.5 text-[8.5px] font-bold rounded border cursor-pointer transition-colors ${
                  activePreset === 'neon-crimson'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                    : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                CRIMSON
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                <span>TITLE SIZE</span>
                <span className="text-[#F59E0B] font-bold tabular-nums">{titleSizePx}px</span>
              </div>
              <input
                type="range"
                min="48"
                max="120"
                step="2"
                value={titleSizePx}
                onChange={(e) => setTitleSize(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                <span>GLOW INTENSITY</span>
                <span className="text-[#F59E0B] font-bold tabular-nums">{Math.round(glow * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={glow}
                onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                <span>VERTICAL OFFSET</span>
                <span className="text-[#F59E0B] font-bold tabular-nums">{verticalOffset}px</span>
              </div>
              <input
                type="range"
                min="-120"
                max="120"
                step="5"
                value={verticalOffset}
                onChange={(e) => setTitleVerticalOffset(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                <span>TRACKING</span>
                <span className="text-[#F59E0B] font-bold tabular-nums">{tracking.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.02"
                value={tracking}
                onChange={(e) => setTitleTracking(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsTitleFxOpen(false);
                eventBus.emit('studio:open_module', { module: 'TEXT' });
              }}
              className="w-full py-1.5 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/50 text-[#F4F4F5] font-bold text-[9px] cursor-pointer transition-colors"
            >
              OPEN BILINGUAL TYPOGRAPHY &amp; DOPAMINE FX DRAWER
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
