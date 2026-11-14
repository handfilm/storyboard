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
  ArrowUp,
  ArrowDown,
  Sparkles,
  Crosshair,
  Frame,
  Activity,
  SplitSquareHorizontal,
  ArrowLeftRight,
  ShieldCheck,
  CopyCheck,
  Check
} from 'lucide-react';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';
import {
  useStudioStore,
  HeroTitlePreset,
  TitleAlign,
  StageViewportScale,
  TitleDirectorRole,
  TitleOpticalFinish
} from '../../core/store';
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
  const setTitleMaterialSwatch = useStudioStore((s) => s.setTitleMaterialSwatch);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);
  const nudgeTitleOffset = useStudioStore((s) => s.nudgeTitleOffset);
  const resetTitleOffset = useStudioStore((s) => s.resetTitleOffset);
  const toggleTitleSafeGuard = useStudioStore((s) => s.toggleTitleSafeGuard);
  const applyDirectorTitleRole = useStudioStore((s) => s.applyDirectorTitleRole);
  const setTitleOpticalFinish = useStudioStore((s) => s.setTitleOpticalFinish);
  const copyTitleStyleToAllShots = useStudioStore((s) => s.copyTitleStyleToAllShots);
  const setIsSafeGuardGuideHover = useStudioStore((s) => s.setIsSafeGuardGuideHover);

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
  const [syncAllConfirmed, setSyncAllConfirmed] = useState(false);
  const [isShiftModifier, setIsShiftModifier] = useState(false);

  const zoomBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleFxBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleFxDeckRef = useRef<HTMLDivElement | null>(null);
  const matrixBtnRef = useRef<HTMLButtonElement | null>(null);
  const matrixCloseTimerRef = useRef<number | null>(null);
  const syncFeedbackTimerRef = useRef<number | null>(null);

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

  const safeGuardEnabled = Boolean(shotTitleData.safeGuard ?? resolvedPresetConfig.safeGuard);
  const verticalOffset = shotTitleData.verticalOffset ?? 0;
  const horizontalOffset = shotTitleData.horizontalOffset ?? 0;
  const activeDirectorRole: TitleDirectorRole | undefined =
    shotTitleData.directorRole ?? resolvedPresetConfig.directorRole;
  const activeOpticalFinish: TitleOpticalFinish | undefined =
    shotTitleData.opticalFinish ?? resolvedPresetConfig.opticalFinish;

  const choreography = resolveSpatialTitleChoreography({
    titleAlign: activeShotAlign,
    zone9: activeShotZone,
    layoutMode: resolvedPresetConfig.layoutMode,
    shotIndex,
    shotType: activeFrame?.shotType,
    panX: activeFrame?.panX,
    panY: activeFrame?.panY,
    smartCropMode: activeFrame?.smartCropMode,
    aspectRatio,
    safeGuard: safeGuardEnabled,
    horizontalOffset,
    verticalOffset
  });

  const activePreset: HeroTitlePreset =
    shotTitleData.presetId === 'molten-gold' ||
    shotTitleData.presetId === 'titanium-silver' ||
    shotTitleData.presetId === 'neon-crimson' ||
    shotTitleData.presetId === 'pure-white' ||
    shotTitleData.presetId === 'amber'
      ? shotTitleData.presetId
      : (storeTitleConfig?.preset || 'molten-gold');
  const tracking = shotTitleData.letterTracking ?? 0.15;
  const titleSizePx = shotTitleData.fontScale ?? 72;

  useEffect(() => {
    const closeAll = () => {
      setIsZoomOpen(false);
      setIsTitleFxOpen(false);
      setIsMatrixOpen(false);
      setIsMatrixPinned(false);
      setIsSafeZoneOverlayVisible(false);
      setIsSafeGuardGuideHover(false);
    };
    window.addEventListener('resize', closeAll);
    return () => {
      window.removeEventListener('resize', closeAll);
      if (matrixCloseTimerRef.current) window.clearTimeout(matrixCloseTimerRef.current);
      if (syncFeedbackTimerRef.current) window.clearTimeout(syncFeedbackTimerRef.current);
      setIsSafeZoneOverlayVisible(false);
      setIsSafeGuardGuideHover(false);
    };
  }, [setIsSafeZoneOverlayVisible, setIsSafeGuardGuideHover]);

  useEffect(() => {
    setIsSafeZoneOverlayVisible(isMatrixOpen);
  }, [isMatrixOpen, setIsSafeZoneOverlayVisible]);

  useEffect(() => {
    if (!isTitleFxOpen) {
      setIsSafeGuardGuideHover(false);
      setIsShiftModifier(false);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      titleFxDeckRef.current?.focus({ preventScroll: true });
    });
    const syncShift = (e: KeyboardEvent) => {
      setIsShiftModifier(e.shiftKey);
    };
    const resetShift = () => setIsShiftModifier(false);
    const onKeyDown = (e: KeyboardEvent) => {
      setIsShiftModifier(e.shiftKey);
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const step = e.shiftKey ? 2 : 12;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          setIsTitleFxOpen(false);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          nudgeTitleOffset(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          nudgeTitleOffset(0, step);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          nudgeTitleOffset(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          nudgeTitleOffset(step, 0);
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          e.stopPropagation();
          toggleTitleSafeGuard();
          break;
        case '1':
          e.preventDefault();
          e.stopPropagation();
          applyDirectorTitleRole('imax-card');
          break;
        case '2':
          e.preventDefault();
          e.stopPropagation();
          applyDirectorTitleRole('lower-3rd');
          break;
        case '3':
          e.preventDefault();
          e.stopPropagation();
          applyDirectorTitleRole('subtitle');
          break;
        case '4':
          e.preventDefault();
          e.stopPropagation();
          applyDirectorTitleRole('credit');
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', syncShift, true);
    window.addEventListener('blur', resetShift);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', syncShift, true);
      window.removeEventListener('blur', resetShift);
    };
  }, [
    isTitleFxOpen,
    nudgeTitleOffset,
    toggleTitleSafeGuard,
    applyDirectorTitleRole,
    setIsSafeGuardGuideHover
  ]);

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

  const handleSyncAllShots = () => {
    copyTitleStyleToAllShots(shotIndex);
    setSyncAllConfirmed(true);
    if (syncFeedbackTimerRef.current) window.clearTimeout(syncFeedbackTimerRef.current);
    syncFeedbackTimerRef.current = window.setTimeout(() => {
      setSyncAllConfirmed(false);
    }, 1600);
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

        {/* Icon Micro-Pill: OPTICS / LENS */}
        <div className="hidden md:inline-flex shrink-0">
          <CinemaToolHUD
            title={`CAMERA: ${focalLen} ${aperture}`}
            en={`${sensor} · ${shutter} · ISO ${iso} · ${rawFormat}`}
            bn="শটের ক্যামেরা লেন্স, অ্যাপারচার ও সেন্সর স্পেক্স দেখতে এই পিলটি দেখুন।"
            accent="amber"
            side="bottom"
          >
            <div
              data-testid="hud-lens-pill"
              className="h-[17px] px-1.5 rounded bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap transition-all duration-150 cursor-help"
            >
              <Aperture className="w-2.5 h-2.5 text-[#F59E0B]/80" />
              <span>{focalLen} {aperture}</span>
            </div>
          </CinemaToolHUD>
        </div>

        {/* Icon Micro-Pill: COLOR LUT */}
        <div className="hidden lg:inline-flex shrink-0">
          <CinemaToolHUD
            title={`COLOR LUT: ${lutLabel}`}
            en={`Brightness ${adj?.brightness ?? 100}% · Contrast ${adj?.contrast ?? 100}% · Grain ${adj?.grain ?? 15}%`}
            bn="বর্তমান শটে প্রয়োগ করা কালার লুক (LUT) ও গ্রেডিং মান দেখতে এখানে ধরুন।"
            accent="cyan"
            side="bottom"
          >
            <div
              data-testid="hud-lut-pill"
              className="h-[17px] px-1.5 rounded bg-[#141417] border border-white/[0.07] hover:border-cyan-400/60 text-[#8E8E93] hover:text-[#F4F4F5] flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap transition-all duration-150 cursor-help"
            >
              <Palette className="w-2.5 h-2.5 text-cyan-400/80" />
              <span>{lutLabel}</span>
            </div>
          </CinemaToolHUD>
        </div>

        {/* Icon Micro-Pill: ENGINE STATUS */}
        <div className="hidden xl:inline-flex shrink-0">
          <CinemaToolHUD
            title={isWebCodecsEngineActive ? '16-BIT WEBCODECS' : 'NATIVE ENGINE'}
            en={`16-Bit ARRI ACEScg · ${fps}.0 FPS · ${isWebCodecsEngineActive ? 'Active' : 'Bypass'}`}
            bn="১৬-বিট ওয়েবকোডেক্স বা নেটিভ রেন্ডার ইঞ্জিন সুইচ করতে ক্লিক করুন।"
            accent="emerald"
            side="bottom"
          >
            <button
              type="button"
              data-testid="hud-engine-status-pill"
              data-active={isWebCodecsEngineActive ? 'true' : 'false'}
              onClick={() => onToggleWebCodecs?.()}
              className={`cinema-tile cinema-tile-emerald h-[17px] px-1.5 rounded flex items-center gap-1 text-[8.5px] font-bold whitespace-nowrap ${
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
              <span>{isWebCodecsEngineActive ? 'WEBCODECS' : 'NATIVE'}</span>
            </button>
          </CinemaToolHUD>
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
          <CinemaToolHUD
            title="CLIP REVERSED"
            en="Click to restore normal forward clip playback."
            bn="রিভার্স প্লেব্যাক বন্ধ করে আবার স্বাভাবিক গতিতে চালাতে চাপুন।"
            accent="amber"
            side="bottom"
          >
            <button
              type="button"
              data-testid="hud-reverse-indicator"
              onClick={() => toggleShotReverse(shotIndex)}
              className="h-[17px] px-1.5 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/60 text-[#F59E0B] flex items-center gap-1 text-[8px] font-bold whitespace-nowrap cursor-pointer shrink-0"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              <span>REV</span>
            </button>
          </CinemaToolHUD>
        )}

        {digitalZoom.isZoomed && (
          <div className="flex items-center gap-1 px-1.5 h-[17px] rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:bg-[#F59E0B]/15 group-hover:border-[#F59E0B]/60 group-hover:text-[#F59E0B] text-[8px] font-bold tabular-nums shrink-0 transition-colors duration-200">
            <span>{digitalZoom.scale.toFixed(1)}x</span>
            <CinemaToolHUD
              title="RESET ZOOM"
              en="Reset digital canvas preview zoom back to 1.0x."
              bn="ডিজিটাল ফ্রেম জুম রিসেট করে আসল সাইজে আনতে চাপুন।"
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                onClick={resetDigitalZoom}
                className="px-1 rounded bg-[#0B0B0D] text-[#8E8E93] group-hover:text-[#F4F4F5] cursor-pointer flex items-center gap-0.5"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>RESET</span>
              </button>
            </CinemaToolHUD>
          </div>
        )}
      </div>

      {/* RIGHT CLUSTER */}
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
            <CinemaToolHUD
              key={String(opt.value)}
              title={`SCALE ${opt.label}`}
              en={`Set stage viewport magnification to ${opt.label}.`}
              bn={`প্রিভিউ স্ক্রিনের সাইজ ${opt.label} করতে চাপুন।`}
              accent="amber"
              side="bottom"
            >
              <button
                type="button"
                data-testid={`stage-scale-${opt.value}`}
                aria-pressed={stageScale === opt.value}
                onClick={() => setStageScale(opt.value)}
                className={`px-1 h-[14px] leading-none flex items-center rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  stageScale === opt.value
                    ? 'bg-[#F59E0B] text-[#0B0B0D] font-bold'
                    : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                }`}
              >
                {opt.label}
              </button>
            </CinemaToolHUD>
          ))}
        </div>

        {/* Pro Cinema Monitor Overlays */}
        <div
          data-testid="monitor-overlays-group"
          className="hidden md:flex items-center gap-0.5 px-1 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8px] font-bold shrink-0"
          role="group"
          aria-label="Monitor Overlays"
        >
          <CinemaToolHUD
            title="SAFE GUIDES"
            en="Toggle rule-of-thirds and 90%/93% safe-zone guides."
            bn="রুল অব থার্ডস ও সেফ-জোন গাইড লাইন দেখাতে চাপুন।"
            accent="amber"
            side="bottom"
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
            >
              <Frame className="w-2.5 h-2.5" />
              <span className="hidden 2xl:inline">SAFE</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="FOCUS PEAK"
            en="Highlight sharp in-focus edges across video frames."
            bn="ভিডিওর ফোকাস এজ হাইলাইট করে দেখতে পিকিং অন করুন।"
            accent="emerald"
            side="bottom"
          >
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
            >
              <Crosshair className="w-2.5 h-2.5" />
              <span className="hidden 2xl:inline">PEAK</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="ZEBRA IRE"
            en="Show overexposure warning stripes above 90 IRE."
            bn="বেশি আলো বা ওভার-এক্সপোজার এরিয়া দেখতে জেব্রা অন করুন।"
            accent="crimson"
            side="bottom"
          >
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
            >
              <Activity className="w-2.5 h-2.5" />
              <span className="hidden 2xl:inline">ZEBRA</span>
            </button>
          </CinemaToolHUD>
          <CinemaToolHUD
            title="A|B WIPE"
            en="Split-screen wipe comparing raw plate vs graded look."
            bn="র ভিডিও বনাম কালার গ্রেডেড ফ্রেমের পার্থক্য দেখতে চাপুন।"
            accent="cyan"
            side="bottom"
          >
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
            >
              <SplitSquareHorizontal className="w-2.5 h-2.5" />
              <span className="hidden 2xl:inline">A|B</span>
            </button>
          </CinemaToolHUD>
        </div>
        {safeZone && onChangeSafeZone && (
          <div className="hidden md:flex items-center gap-0.5 px-1 py-0 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8px] transition-colors duration-200">
            <Compass className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B] mr-0.5 transition-colors duration-200" />
            {(['top', 'center', 'bottom'] as const).map((zone) => (
              <CinemaToolHUD
                key={zone}
                title={`SAFE ${zone.toUpperCase()}`}
                en={`Anchor 9:16 Reels title zone to ${zone}.`}
                bn={`৯:১৬ রিলস টাইটেল ${zone} পজিশনে রাখতে চাপুন।`}
                accent="amber"
                side="bottom"
              >
                <button
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
              </CinemaToolHUD>
            ))}
          </div>
        )}

        {/* TITLE Position & Choreography Control */}
        <div className="flex items-center gap-0.5 shrink-0">
          <div
            className="flex items-center gap-0.5 px-1 py-0 h-[18px] rounded bg-[#141417] border border-white/[0.07] text-[8.5px] transition-colors duration-200 shrink-0"
            role="group"
            aria-label="Title Alignment"
          >
            <span className="hidden md:inline text-[#8E8E93] font-bold mr-0.5 transition-colors duration-200">ALIGN</span>
            {(['LEFT', 'MID', 'RIGHT', 'AUTO'] as TitleAlign[]).map((align) => (
              <CinemaToolHUD
                key={align}
                title={`TITLE ${align}`}
                en={align === 'AUTO' ? 'Smart negative-space title placement.' : `Align stage title overlay ${align}.`}
                bn={`স্ক্রিনে টাইটেল ${align} পজিশনে সেট করতে চাপুন।`}
                accent="amber"
                side="bottom"
              >
                <button
                  type="button"
                  data-testid={`title-align-${align}`}
                  aria-pressed={activeShotAlign === align}
                  onClick={() => setTitleAlign(align)}
                  className={`px-1 py-0 h-[14px] leading-none flex items-center rounded cursor-pointer transition-colors duration-200 ${
                    activeShotAlign === align
                      ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                      : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
                  }`}
                >
                  {align}
                </button>
              </CinemaToolHUD>
            ))}

            {/* 9-Zone Matrix Trigger */}
            <CinemaToolHUD
              title="9-ZONE MATRIX"
              en="Open 3x3 title position grid with 90%/93% safe guides."
              bn="৩×৩ গ্রিডে টাইটেলের পজিশন লক করতে চাপুন।"
              accent="amber"
              side="bottom"
            >
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
                aria-label="9-Zone Title Position Matrix"
              >
                <LayoutGrid className="w-2.5 h-2.5" />
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Multi-Layer ZOOM Trigger */}
        <CinemaToolHUD
          title="PARALLAX ZOOM"
          en={`Foreground ${fgZoom.toFixed(1)}x / Background ${bgZoom.toFixed(1)}x optical zoom.`}
          bn="ফোরগ্রাউন্ড ও ব্যাকগ্রাউন্ড প্যারালাক্স জুম নিয়ন্ত্রণ করতে চাপুন।"
          accent="amber"
          side="bottom"
        >
          <button
            ref={zoomBtnRef}
            type="button"
            onClick={openZoomPopover}
            className={`px-1.5 py-0 h-[18px] rounded border text-[8.5px] font-bold tabular-nums flex items-center gap-1 cursor-pointer transition-all duration-200 ${
              isZoomOpen || fgZoom !== 1.0 || bgZoom !== 1.0
                ? 'bg-[#141417] border-[#F59E0B]/60 text-[#F4F4F5] group-hover:bg-[#F59E0B]/20 group-hover:border-[#F59E0B] group-hover:text-[#F59E0B]'
                : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/60 hover:shadow-[0_0_10px_rgba(245,158,11,0.22)]'
            }`}
          >
            <ZoomIn className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors duration-200" />
            <span className="tabular-nums">{avgZoom.toFixed(1)}x</span>
            {isVertigo && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />}
          </button>
        </CinemaToolHUD>

        {/* [ TITLE FX ] Trigger Button */}
        <CinemaToolHUD
          title="TITLE FX"
          en="Open 9-zone title deck, safe-guard, swatches, and scrims."
          bn="৩×৩ গ্রিডে পজিশন বাছুন এবং SAFE GUARD অন করে টাইটেল লক করুন।"
          accent="amber"
          side="bottom"
        >
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
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>TITLE FX</span>
          </button>
        </CinemaToolHUD>

        {/* [ PRO FX ] Trigger Button */}
        <CinemaToolHUD
          title="PRO FX SUITE"
          en="Open Auto Captions, Keyframes, Speed Ramp, and 3D Color Wheels."
          bn="অটো ক্যাপশন, কীফ্রেম ও স্পিড র‍্যাম্প প্রো সুইট খুলতে চাপুন।"
          accent="cyan"
          side="bottom"
        >
          <button
            type="button"
            data-testid="stage-pro-fx-button"
            onClick={() => eventBus.emit('studio:open_pro_suite', { tab: 'ai-captions' })}
            className="cinema-tile cinema-tile-cyan px-1.5 py-0 h-[18px] rounded text-[8.5px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Sparkles className="w-2.5 h-2.5 cinema-tile-icon" />
            <span>PRO FX</span>
          </button>
        </CinemaToolHUD>

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
              <CinemaBadgeHeader
                icon={<Crosshair className="w-3 h-3" strokeWidth={2.3} />}
                label="9-ZONE GRID"
                accent="amber"
              />
              <span className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.08] text-[8px] font-bold text-[#8E8E93]">
                {activeShotZone === 'AUTO' ? choreography.zone9.toUpperCase() : choreography.zone9.toUpperCase()}
              </span>
            </div>

            {/* 3x3 Miniature Cinema Safe Frame Grid */}
            <div className="relative p-2 rounded bg-[#050507] border border-white/[0.08]">
              <div className="grid grid-cols-3 gap-1.5 relative z-10">
                {TITLE_ZONE_9_MATRIX.map((cell) => {
                  const isCellActive = choreography.zone9 === cell.zone;
                  const isManualLock = activeShotZone === cell.zone;
                  return (
                    <CinemaToolHUD
                      key={cell.zone}
                      title={`ZONE: ${cell.label.toUpperCase()}`}
                      en={`Lock title zone to ${cell.label} (${getKineticEntranceLabel(cell.entrance)}).`}
                      bn={`টাইটেল ${cell.label} জোন-এ লক করতে ক্লিক করুন।`}
                      accent="amber"
                      side="left"
                      blockWrapper
                    >
                      <button
                        type="button"
                        data-testid={`title-zone-cell-${cell.zone}`}
                        onClick={() => {
                          setTitleZone(cell.zone);
                          setIsMatrixPinned(true);
                        }}
                        className={`w-full h-8 rounded border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-150 ${
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
                    </CinemaToolHUD>
                  );
                })}
              </div>
            </div>

            {/* Smart AUTO Negative-Space Toggle */}
            <CinemaToolHUD
              title="AUTO SPACE"
              en="Automatically place title in clean negative space."
              bn="সাবজেক্ট বাঁচিয়ে ফাঁকা জায়গায় অটো টাইটেল বসাতে চাপুন।"
              accent="amber"
              side="left"
              blockWrapper
            >
              <button
                type="button"
                data-testid="title-zone-auto-btn"
                onClick={() => {
                  setTitleZone('AUTO');
                  setIsMatrixPinned(true);
                }}
                className={`w-full py-1.5 px-2 rounded border text-[9px] font-black tracking-wider uppercase flex items-center justify-between cursor-pointer transition-colors ${
                  activeShotZone === 'AUTO' && activeShotAlign === 'AUTO'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                    : 'bg-[#141417] border-white/[0.08] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/40'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AUTO SPACE</span>
                </span>
                <span>{activeShotAlign === 'AUTO' ? 'ON' : 'SET'}</span>
              </button>
            </CinemaToolHUD>

            {/* Kinetic Entrance + Safe-Zone Guide Readout */}
            <div className="flex items-center justify-between text-[8px] text-[#8E8E93] pt-0.5 border-t border-white/[0.06]">
              <span className="flex items-center gap-1 text-[#F4F4F5]">
                {choreography.kineticEntrance === 'slide-from-left' && <ArrowLeft className="w-2.5 h-2.5 text-[#F59E0B]" />}
                {choreography.kineticEntrance === 'slide-from-right' && <ArrowRight className="w-2.5 h-2.5 text-[#F59E0B]" />}
                {choreography.kineticEntrance === 'center-bloom' && <Sparkles className="w-2.5 h-2.5 text-[#F59E0B]" />}
                <span>{getKineticEntranceLabel(choreography.kineticEntrance)}</span>
              </span>
              <span className="text-emerald-400/90 font-bold">90/93 SAFE</span>
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

      {/* PORTALED [ TITLE FX ] ZERO-SLIDER CINEMA TYPOGRAPHY & FRAMING DECK */}
      {isTitleFxOpen && titleFxAnchor && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => {
              setIsSafeGuardGuideHover(false);
              setIsTitleFxOpen(false);
            }}
          />
          <div
            ref={titleFxDeckRef}
            role="dialog"
            aria-label="Cinema Typography & Framing Deck"
            data-testid="title-fx-popover"
            data-title-fx-deck="true"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: `${titleFxAnchor.top}px`,
              right: `${titleFxAnchor.right}px`,
              zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-[344px] bg-[#0B0B0D]/98 border border-white/[0.1] rounded-lg p-2.5 font-mono text-[9.5px] text-[#F4F4F5] space-y-2 backdrop-blur-2xl shadow-[0_24px_60px_rgba(0,0,0,0.96)] animate-in fade-in duration-150 tabular-nums outline-none"
          >
            {/* Deck Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5 gap-1.5">
              <CinemaBadgeHeader
                icon={<Sliders className="w-3 h-3" strokeWidth={2.3} />}
                label="TITLE FX"
                accent="amber"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] text-[#8E8E93] tabular-nums whitespace-nowrap">
                  {titleSizePx}px · {tracking.toFixed(2)}em
                </span>
                {onToggleTitles && (
                  <CinemaToolHUD
                    title="TITLE VISIBILITY"
                    en="Show or hide stage cinema title overlays."
                    bn="স্ক্রিনে টাইটেল দেখাতে বা লুকাতে চাপুন।"
                    shortcut="T"
                    accent="amber"
                    side="left"
                  >
                    <button
                      type="button"
                      data-testid="title-fx-strip-toggle"
                      onClick={onToggleTitles}
                      className={`px-1.5 py-0.5 rounded border text-[8px] font-bold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                        isTitlesActive
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F59E0B]'
                          : 'bg-[#141417] border-white/[0.08] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {isTitlesActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      <span>{isTitlesActive ? 'ON' : 'OFF'}</span>
                    </button>
                  </CinemaToolHUD>
                )}
              </div>
            </div>

            {/* ROW 1: 9-Zone Matrix + Micro-Nudge D-Pad + SAFE GUARD */}
            <div className="grid grid-cols-[108px_1fr_84px] gap-1.5 items-stretch bg-[#141417]/75 border border-white/[0.07] rounded-md p-1.5">
              {/* 3x3 Tactical Anchor Grid */}
              <div className="flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between text-[7.5px] font-bold text-[#8E8E93] px-0.5">
                  <span>9-ZONE</span>
                  <CinemaToolHUD
                    title="AUTO SPACE"
                    en="Use automatic negative-space zone placement."
                    bn="টাইটেল অটো ফাঁকা জায়গায় বসাতে চাপুন।"
                    accent="amber"
                    side="left"
                  >
                    <button
                      type="button"
                      data-testid="title-fx-zone-auto"
                      onClick={() => setTitleZone('AUTO')}
                      className={`px-1 rounded text-[7px] font-bold cursor-pointer transition-colors ${
                        activeShotZone === 'AUTO'
                          ? 'bg-[#F59E0B] text-[#0B0B0D]'
                          : 'bg-[#0B0B0D] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      AUTO
                    </button>
                  </CinemaToolHUD>
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                  {(
                    [
                      { zone: 'top-left', lbl: 'TL' },
                      { zone: 'top-center', lbl: 'TC' },
                      { zone: 'top-right', lbl: 'TR' },
                      { zone: 'mid-left', lbl: 'ML' },
                      { zone: 'center-hero', lbl: 'MC' },
                      { zone: 'mid-right', lbl: 'MR' },
                      { zone: 'lower-left', lbl: 'BL' },
                      { zone: 'lower-center', lbl: 'BC' },
                      { zone: 'lower-right', lbl: 'BR' }
                    ] as Array<{ zone: TitleZone9; lbl: string }>
                  ).map((cell) => {
                    const isCellActive = choreography.zone9 === cell.zone;
                    const isLocked = activeShotZone === cell.zone;
                    return (
                      <button
                        key={cell.zone}
                        type="button"
                        data-testid={`title-fx-zone-${cell.lbl}`}
                        onClick={() => setTitleZone(cell.zone)}
                        className={`h-[20px] rounded border text-[7.5px] font-bold flex items-center justify-center cursor-pointer transition-all ${
                          isCellActive
                            ? isLocked
                              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                              : 'bg-[#F59E0B]/20 border-[#F59E0B]/80 text-[#F59E0B]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        {cell.lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Micro-Nudge D-Pad */}
              <div className="flex flex-col items-center justify-between border-x border-white/[0.06] px-1.5">
                <div className="w-full flex items-center justify-between text-[7.5px] text-[#8E8E93] gap-1">
                  <span className="flex items-center gap-1 font-bold">
                    <span>NUDGE</span>
                    <span
                      className={`px-1 rounded text-[6.5px] font-bold leading-tight ${
                        isShiftModifier
                          ? 'bg-[#F59E0B] text-[#0B0B0D]'
                          : 'bg-[#0B0B0D] text-[#8E8E93]'
                      }`}
                    >
                      {isShiftModifier ? '2px' : '12px'}
                    </span>
                  </span>
                  <span className="text-[#F59E0B] tabular-nums">
                    {choreography.clampedHorizontalOffset >= 0 ? '+' : ''}
                    {choreography.clampedHorizontalOffset},{choreography.clampedVerticalOffset >= 0 ? '+' : ''}
                    {choreography.clampedVerticalOffset}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-0.5 w-[74px]">
                  <span />
                  <button
                    type="button"
                    data-testid="title-fx-nudge-up"
                    aria-label="Nudge title up 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(0, -(e.shiftKey ? 2 : 12))}
                    className="h-[20px] rounded bg-[#0B0B0D] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    data-testid="title-fx-nudge-left"
                    aria-label="Nudge title left 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(-(e.shiftKey ? 2 : 12), 0)}
                    className="h-[20px] rounded bg-[#0B0B0D] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="title-fx-nudge-reset"
                    aria-label="Reset title nudge to 0,0"
                    onClick={resetTitleOffset}
                    className={`h-[20px] rounded border text-[7px] font-bold flex items-center justify-center cursor-pointer transition-colors ${
                      horizontalOffset === 0 && verticalOffset === 0
                        ? 'bg-[#1C1C22] border-white/[0.07] text-[#8E8E93]'
                        : 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F59E0B]'
                    }`}
                  >
                    0,0
                  </button>
                  <button
                    type="button"
                    data-testid="title-fx-nudge-right"
                    aria-label="Nudge title right 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(e.shiftKey ? 2 : 12, 0)}
                    className="h-[20px] rounded bg-[#0B0B0D] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    data-testid="title-fx-nudge-down"
                    aria-label="Nudge title down 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(0, e.shiftKey ? 2 : 12)}
                    className="h-[20px] rounded bg-[#0B0B0D] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </button>
                  <span />
                </div>
              </div>

              {/* SAFE GUARD Toggle */}
              <div className="flex flex-col justify-between gap-1">
                <span className="text-[7.5px] font-bold text-[#8E8E93] text-center">GUARD</span>
                <CinemaToolHUD hudId="safe-guard" side="left" blockWrapper>
                  <button
                    type="button"
                    data-testid="title-fx-safe-guard"
                    aria-pressed={safeGuardEnabled}
                    onMouseEnter={() => setIsSafeGuardGuideHover(true)}
                    onMouseLeave={() => setIsSafeGuardGuideHover(false)}
                    onClick={toggleTitleSafeGuard}
                    className={`w-full flex-1 min-h-[52px] rounded border flex flex-col items-center justify-center gap-0.5 px-1 cursor-pointer transition-all ${
                      safeGuardEnabled
                        ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                        : 'bg-[#0B0B0D] border-white/[0.08] text-[#8E8E93] hover:border-[#F59E0B]/60 hover:text-[#F4F4F5]'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-black leading-tight whitespace-nowrap">SAFE GUARD</span>
                    <span className={`text-[7px] leading-none font-bold ${safeGuardEnabled ? 'text-[#0B0B0D]/80' : 'text-[#F59E0B]'}`}>
                      {safeGuardEnabled ? 'LOCKED' : 'OFF'}
                    </span>
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            {/* ROW 2: Director Role Presets + Scale & Tracking */}
            <div className="space-y-1.5 bg-[#141417]/75 border border-white/[0.07] rounded-md p-1.5">
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'imax-card', label: 'IMAX CARD', en: 'Hero bold tracking preset.', bn: 'বড় আইম্যাক্স টাইটেল কার্ড স্টাইল প্রয়োগ করতে চাপুন।', keyHint: '1' },
                    { id: 'lower-3rd', label: 'LOWER 3RD', en: 'Broadcast left plate with backdrop scrim.', bn: 'নিচের বামে লোয়ার-থার্ড প্লেট সেট করতে চাপুন।', keyHint: '2' },
                    { id: 'subtitle', label: 'SUBTITLE', en: 'Bottom-safe dialogue lockup.', bn: 'নিচে সেফ-জোনে সাবটাইটেল লকআপ সেট করতে চাপুন।', keyHint: '3' },
                    { id: 'credit', label: 'CREDIT', en: 'Minimalist chapter/end-card lockup.', bn: 'সিম্পল ক্রেডিট বা চ্যাপ্টার কার্ড সেট করতে চাপুন।', keyHint: '4' }
                  ] as Array<{ id: TitleDirectorRole; label: string; en: string; bn: string; keyHint: string }>
                ).map((role) => {
                  const isActive = activeDirectorRole === role.id;
                  return (
                    <CinemaToolHUD
                      key={role.id}
                      title={role.label}
                      en={role.en}
                      bn={role.bn}
                      shortcut={role.keyHint}
                      accent="amber"
                      side="left"
                      blockWrapper
                    >
                      <button
                        type="button"
                        data-testid={`title-fx-role-${role.id}`}
                        aria-pressed={isActive}
                        onClick={() => applyDirectorTitleRole(role.id)}
                        className={`w-full h-[24px] px-1 rounded border text-[7.5px] font-black whitespace-nowrap cursor-pointer transition-all ${
                          isActive
                            ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        {role.label}
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>

              {/* Scale & Tracking Pill Steppers */}
              <div className="grid grid-cols-[148px_1fr] gap-1.5">
                <div className="flex items-center gap-0.5 bg-[#0B0B0D] border border-white/[0.07] rounded p-0.5">
                  <button
                    type="button"
                    data-testid="title-fx-scale-minus"
                    onClick={(e) => setTitleSize(titleSizePx - (e.shiftKey ? 2 : 6))}
                    className="px-1 h-[18px] rounded text-[8.5px] font-bold text-[#8E8E93] hover:text-[#F4F4F5] hover:bg-white/[0.06] cursor-pointer shrink-0"
                  >
                    −
                  </button>
                  {(
                    [
                      { lbl: 'S', px: 44 },
                      { lbl: 'M', px: 60 },
                      { lbl: 'L', px: 74 },
                      { lbl: 'XL', px: 92 }
                    ] as const
                  ).map((sz) => {
                    const isCurrent = Math.abs(titleSizePx - sz.px) <= 5;
                    return (
                      <button
                        key={sz.lbl}
                        type="button"
                        data-testid={`title-fx-scale-${sz.lbl}`}
                        onClick={() => setTitleSize(sz.px)}
                        className={`flex-1 h-[18px] rounded text-[7.5px] font-bold cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[#F59E0B] text-[#0B0B0D]'
                            : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {sz.lbl}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    data-testid="title-fx-scale-plus"
                    onClick={(e) => setTitleSize(titleSizePx + (e.shiftKey ? 2 : 6))}
                    className="px-1 h-[18px] rounded text-[8.5px] font-bold text-[#8E8E93] hover:text-[#F4F4F5] hover:bg-white/[0.06] cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-0.5 bg-[#0B0B0D] border border-white/[0.07] rounded p-0.5">
                  {(
                    [
                      { lbl: 'TIGHT', short: 'TIGHT', val: 0.04 },
                      { lbl: 'NORM', short: 'NORM', val: 0.12 },
                      { lbl: 'WIDE', short: 'WIDE', val: 0.22 },
                      { lbl: 'ANAMORPHIC', short: 'ANAM', val: 0.34 }
                    ] as const
                  ).map((trk) => {
                    const isCurrent = Math.abs(tracking - trk.val) <= 0.035;
                    return (
                      <button
                        key={trk.lbl}
                        type="button"
                        data-testid={`title-fx-tracking-${trk.lbl}`}
                        onClick={() => setTitleTracking(trk.val)}
                        className={`flex-1 h-[18px] px-0.5 rounded text-[6.8px] font-bold cursor-pointer transition-colors whitespace-nowrap ${
                          isCurrent
                            ? 'bg-[#F59E0B] text-[#0B0B0D]'
                            : 'text-[#8E8E93] hover:text-[#F4F4F5]'
                        }`}
                      >
                        {trk.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ROW 3: Material Swatches + Optical Finishes */}
            <div className="space-y-1.5 bg-[#141417]/75 border border-white/[0.07] rounded-md p-1.5">
              <div className="grid grid-cols-5 gap-1">
                {(
                  [
                    { id: 'molten-gold', label: 'GOLD', hex: '#F5A623' },
                    { id: 'titanium-silver', label: 'SILVER', hex: '#CBD5E1' },
                    { id: 'neon-crimson', label: 'CRIMSON', hex: '#EF4444' },
                    { id: 'pure-white', label: 'WHITE', hex: '#FFFFFF' },
                    { id: 'amber', label: 'AMBER', hex: '#F59E0B' }
                  ] as Array<{ id: HeroTitlePreset; label: string; hex: string }>
                ).map((sw) => {
                  const isActive = activePreset === sw.id;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      data-testid={`title-fx-swatch-${sw.id}`}
                      aria-pressed={isActive}
                      onClick={() => setTitleMaterialSwatch(sw.id)}
                      className={`h-[22px] px-1 rounded border text-[7px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F4F4F5]'
                          : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 border border-black/40"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span>{sw.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'clean', label: 'CLEAN', hudId: undefined, en: 'Crisp vector edges without bloom.', bn: 'কোনো ব্লুম ছাড়া পরিষ্কার শার্প টাইটেল রাখুন।' },
                    { id: 'halation', label: 'HALATION', hudId: 'halation', en: '35mm film amber-red halation edge bloom.', bn: 'অক্ষরের কিনারায় ৩৫মিমি লাল-সোনালি ফিল্ম গ্লো যোগ করুন।' },
                    { id: 'scrim', label: 'SCRIM', hudId: 'scrim', en: 'Adaptive dark backdrop scrim for contrast.', bn: 'উজ্জ্বল ফুটেজে লেখা স্পষ্ট করতে পেছনে কালো স্ক্রিম দিন।' },
                    { id: 'kinetic', label: 'KINETIC', hudId: undefined, en: 'Snappy cinema entrance/exit motion replay.', bn: 'টাইটেলে সিনেমাটিক এন্ট্রি ও এক্সিট অ্যানিমেশন দিন।' }
                  ] as Array<{ id: TitleOpticalFinish; label: string; hudId?: string; en: string; bn: string }>
                ).map((fin) => {
                  const isActive = activeOpticalFinish === fin.id;
                  return (
                    <CinemaToolHUD
                      key={fin.id}
                      hudId={fin.hudId}
                      title={fin.label}
                      en={fin.en}
                      bn={fin.bn}
                      accent="amber"
                      side="left"
                      blockWrapper
                    >
                      <button
                        type="button"
                        data-testid={`title-fx-finish-${fin.id}`}
                        aria-pressed={isActive}
                        onClick={() => setTitleOpticalFinish(fin.id)}
                        className={`w-full h-[24px] px-1 rounded border text-[7.5px] font-black cursor-pointer transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_10px_rgba(245,158,11,0.35)]'
                            : 'bg-[#0B0B0D] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5] hover:border-[#F59E0B]/40'
                        }`}
                      >
                        {fin.label}
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>
            </div>

            {/* ROW 4: TYPOGRAPHY + SYNC ALL */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <CinemaToolHUD
                title="TYPOGRAPHY STUDIO"
                en="Open full Bilingual Typography & Dopamine FX drawer."
                bn="সব বাংলা-ইংরেজি ফন্ট ও ডোপামিন টাইটেল প্রিসেট খুলতে চাপুন।"
                accent="amber"
                side="left"
                className="flex-1"
                blockWrapper
              >
                <button
                  type="button"
                  data-testid="title-fx-open-drawer"
                  onClick={() => {
                    setIsTitleFxOpen(false);
                    eventBus.emit('studio:open_module', { module: 'TEXT' });
                  }}
                  className="cinema-tile cinema-tile-amber w-full py-1.5 px-2 rounded font-black text-[9px] tracking-wider uppercase cursor-pointer truncate whitespace-nowrap"
                >
                  TYPOGRAPHY
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="SYNC ALL SHOTS"
                en="Propagate title layout, role, swatch, and finish across all shots."
                bn="বর্তমান টাইটেল স্টাইল টাইমলাইনের সব শটে একসাথে সেট করতে চাপুন।"
                accent="amber"
                side="left"
              >
                <button
                  type="button"
                  data-testid="title-fx-sync-all"
                  aria-label="Sync current grid, film role, optical finish, and safe-zone lock across all shots"
                  onClick={handleSyncAllShots}
                  className={`py-1.5 px-2 rounded border font-black text-[9px] tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                    syncAllConfirmed
                      ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D] shadow-[0_0_12px_rgba(245,158,11,0.45)]'
                      : 'bg-[#141417] hover:bg-[#F59E0B]/15 border-[#F59E0B]/50 text-[#F59E0B]'
                  }`}
                >
                  {syncAllConfirmed ? <Check className="w-2.5 h-2.5" /> : <CopyCheck className="w-2.5 h-2.5" />}
                  <span>{syncAllConfirmed ? 'SYNCED' : 'SYNC ALL'}</span>
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
