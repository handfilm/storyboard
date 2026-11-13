/**
 * @file /src/components/stage/StageMetadataFxBar.tsx
 * @description Sleek 28px external Stage Metadata & FX Bar rendered strictly ABOVE the video canvas.
 * Houses scene/shot telemetry, dynamic frame counter, FPS, stream quality, TITLE position,
 * Multi-Layer Zoom popover, Digital Zoom reset, Aspect/Mode status, and [ TITLE FX ] popover.
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
  Volume2,
  VolumeX,
  Maximize2,
  Upload,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { useStudioStore, HeroTitlePreset, TitleAlign } from '../../core/store';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { eventBus } from '../../core/eventBus';
import { playbackClock, formatSmpteTimecode } from '../../utils/playbackClock';
import { AnthologyFrame } from '../../types/anthology';
import { EditInAppStrip } from '../bridge/EditInAppStrip';
import { resolveShotTitleData } from '../../constants/titleTemplates';

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
  velocityBadge?: { label: string; color: string } | null;
  inOutBadge?: string | null;
  safeZone?: 'top' | 'center' | 'bottom';
  onChangeSafeZone?: (zone: 'top' | 'center' | 'bottom') => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onOpenCinemaPlayer?: () => void;
  onUploadMedia?: () => void;
  onOpenInspector?: () => void;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const StageMetadataFxBar: React.FC<StageMetadataFxBarProps> = ({
  sceneCode = '01',
  shotIndex,
  frame,
  frameNum,
  totalFrames,
  smpte,
  fps,
  streamLabel = 'RAW 4K',
  aspectRatio,
  playbackMode = 'sequence',
  showHud = true,
  isTitlesActive = true,
  onToggleTitles,
  lightName,
  velocityBadge,
  inOutBadge,
  safeZone,
  onChangeSafeZone,
  isMuted,
  onToggleMute,
  onOpenCinemaPlayer,
  onUploadMedia,
  onOpenInspector,
  onToggleFullscreen,
  className = ''
}) => {
  const titleAlign = useStudioStore((s) => s.titleAlign);
  const setTitleAlign = useStudioStore((s) => s.setTitleAlign);
  const fgZoom = useStudioStore((s) => s.foregroundZoom);
  const bgZoom = useStudioStore((s) => s.backgroundZoom);
  const isVertigo = useStudioStore((s) => s.isVertigoLinked);
  const digitalZoom = useStudioStore((s) => s.digitalZoom);
  const resetDigitalZoom = useStudioStore((s) => s.resetDigitalZoom);
  const stageScale = useStudioStore((s) => s.stageScale);
  const setStageScale = useStudioStore((s) => s.setStageScale);

  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const setTitlePreset = useStudioStore((s) => s.setTitlePreset);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore((s) => s.setTitleGlowIntensity);
  const setTitleVerticalOffset = useStudioStore((s) => s.setTitleVerticalOffset);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);

  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isTitleFxOpen, setIsTitleFxOpen] = useState(false);
  const zoomBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleFxBtnRef = useRef<HTMLButtonElement | null>(null);
  const [zoomAnchor, setZoomAnchor] = useState<{ right: number; top: number } | null>(null);
  const [titleFxAnchor, setTitleFxAnchor] = useState<{ right: number; top: number } | null>(null);

  const storeShot = useStudioStore((s) => s.project.shots?.[shotIndex]);
  const shotTitleData = resolveShotTitleData(frame || storeShot, shotIndex, storeTitleConfig, titleAlign);
  const resolvedPresetConfig = shotTitleData.styleConfig;
  const activeShotAlign: TitleAlign = storeTitleConfig?.heroGlobal
    ? titleAlign
    : shotTitleData.alignment;
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
    };
    window.addEventListener('resize', closeAll);
    return () => window.removeEventListener('resize', closeAll);
  }, []);

  const openZoomPopover = () => {
    setIsTitleFxOpen(false);
    if (!isZoomOpen && zoomBtnRef.current) {
      const r = zoomBtnRef.current.getBoundingClientRect();
      setZoomAnchor({
        right: Math.max(12, window.innerWidth - r.right),
        top: r.bottom + 4
      });
    }
    setIsZoomOpen((v) => !v);
  };

  const openTitleFxPopover = () => {
    setIsZoomOpen(false);
    if (!isTitleFxOpen && titleFxBtnRef.current) {
      const r = titleFxBtnRef.current.getBoundingClientRect();
      setTitleFxAnchor({
        right: Math.max(12, window.innerWidth - r.right),
        top: r.bottom + 4
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

  const shotCode = String(shotIndex + 1).padStart(3, '0');
  const frameTag = `F${String(Math.min(totalFrames, Math.max(1, frameNum))).padStart(3, '0')}/${String(totalFrames).padStart(3, '0')}`;

  return (
    <div
      data-testid="stage-metadata-fx-bar"
      className={`group animate-hud-fade-in w-full h-[20px] min-h-[20px] max-h-[20px] py-0 px-2 bg-[#0B0B0D]/95 border-b border-neutral-900 text-neutral-500 group-hover:text-neutral-200 [border-bottom-color:rgba(255,255,255,0.07)] !text-[#8E8E93] group-hover:!text-[#F4F4F5] transition-colors duration-200 flex items-center justify-between gap-1.5 text-[9px] leading-none font-mono tabular-nums select-none shrink-0 z-30 ${className}`}
    >
      {/* LEFT: SCENE // SHOT • F001/144 • FPS • STREAM QUALITY */}
      <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
        <span className="text-[#8E8E93] group-hover:text-[#F59E0B] font-bold tracking-wider tabular-nums whitespace-nowrap shrink-0 transition-colors duration-200">
          SCENE {sceneCode} // SH{shotCode}
        </span>

        {showHud && (
          <>
            <span className="text-white/20 shrink-0 transition-colors duration-200">•</span>
            <span
              ref={frameTagDomRef}
              className="text-[#8E8E93] group-hover:text-[#F4F4F5] font-bold tabular-nums whitespace-nowrap shrink-0 transition-colors duration-200"
            >
              {frameTag}
            </span>
            {smpte && (
              <>
                <span className="text-white/20 hidden sm:inline shrink-0 transition-colors duration-200">•</span>
                <span
                  ref={smpteDomRef}
                  className="text-[#8E8E93] group-hover:text-[#F4F4F5] tabular-nums hidden sm:inline whitespace-nowrap shrink-0 transition-colors duration-200"
                >
                  {smpte}
                </span>
              </>
            )}
            <span className="text-white/20 hidden md:inline shrink-0 transition-colors duration-200">•</span>
            <span className="text-[#8E8E93] group-hover:text-[#F4F4F5] font-bold tabular-nums hidden md:inline whitespace-nowrap shrink-0 transition-colors duration-200">
              {fps}.0 fps
            </span>
            <span className="text-white/20 hidden lg:inline shrink-0 transition-colors duration-200">•</span>
            <span
              className="px-1 py-0 rounded text-[8px] leading-tight font-bold whitespace-nowrap hidden lg:inline shrink-0 border transition-colors duration-200 bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:border-[#F59E0B]/40 group-hover:text-[#F59E0B]"
            >
              {streamLabel}
            </span>
          </>
        )}

        {velocityBadge && (
          <span className="px-1 py-0 rounded border text-[8px] leading-tight font-bold whitespace-nowrap hidden xl:inline shrink-0 bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:text-[#F59E0B] group-hover:border-[#F59E0B]/40 transition-colors duration-200">
            {velocityBadge.label}
          </span>
        )}

        {inOutBadge && (
          <span className="px-1 py-0 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:border-[#F59E0B]/40 group-hover:text-[#F59E0B] text-[8px] leading-tight font-bold tabular-nums whitespace-nowrap hidden xl:inline shrink-0 transition-colors duration-200">
            {inOutBadge}
          </span>
        )}

        {lightName && (
          <span className="px-1 py-0 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:border-[#F59E0B]/40 group-hover:text-[#F59E0B] text-[8px] leading-tight font-bold whitespace-nowrap hidden xl:inline-flex items-center gap-1 shrink-0 transition-colors duration-200">
            <Lightbulb className="w-2.5 h-2.5" />
            <span>{lightName}</span>
          </span>
        )}

        {digitalZoom.isZoomed && (
          <div className="flex items-center gap-1 px-1 py-0 rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:bg-[#F59E0B]/15 group-hover:border-[#F59E0B]/60 group-hover:text-[#F59E0B] text-[8px] leading-tight font-bold tabular-nums shrink-0 transition-colors duration-200">
            <span>DIGITAL {digitalZoom.scale.toFixed(1)}x</span>
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

      {/* RIGHT: TITLE: LEFT|MID|RIGHT|AUTO • ZOOM • ASPECT • MODE • [ TITLE FX ] */}
      <div className="flex items-center gap-1 shrink-0">
        {safeZone && onChangeSafeZone && (
          <div className="hidden md:flex items-center gap-0.5 px-1 py-0 h-[16px] rounded bg-[#141417] border border-white/[0.07] text-[8px] transition-colors duration-200">
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

        {/* TITLE Alignment Selector (LEFT | MID | RIGHT | AUTO) */}
        <div
          className="flex items-center gap-0.5 px-1 py-0 h-[16px] rounded bg-[#141417] border border-white/[0.07] text-[8px] transition-colors duration-200 shrink-0"
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
              className={`px-1 py-0 rounded cursor-pointer transition-colors duration-200 ${
                activeShotAlign === align
                  ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                  : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
              }`}
              title={`Align Stage Cinema Title: ${align}`}
            >
              {align}
            </button>
          ))}
        </div>

        {/* Multi-Layer ZOOM Trigger */}
        <button
          ref={zoomBtnRef}
          type="button"
          onClick={openZoomPopover}
          className={`px-1.5 py-0 h-[16px] rounded border text-[8.5px] font-bold tabular-nums flex items-center gap-1 cursor-pointer transition-colors duration-200 ${
            isZoomOpen || fgZoom !== 1.0 || bgZoom !== 1.0
              ? 'bg-[#141417] border-[#F59E0B]/60 text-[#F4F4F5] group-hover:bg-[#F59E0B]/20 group-hover:border-[#F59E0B] group-hover:text-[#F59E0B]'
              : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] group-hover:border-[#F59E0B]/50'
          }`}
          title="Multi-Layer Parallax Zoom Controls"
        >
          <ZoomIn className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors duration-200" />
          <span>ZOOM</span>
          <span className="hidden md:inline tabular-nums text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors duration-200">
            {fgZoom.toFixed(1)}x/{bgZoom.toFixed(1)}x
          </span>
          {isVertigo && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />}
        </button>

        {/* Stage Scale 70% / 100% Toggle Pills */}
        <div
          className="flex items-center gap-0.5 px-0.5 py-0 h-[16px] rounded bg-[#141417] border border-white/[0.07] text-[8.5px] font-bold tabular-nums shrink-0 transition-colors duration-200"
          role="group"
          aria-label="Stage Scale"
        >
          <button
            type="button"
            data-testid="stage-scale-70"
            onClick={() => setStageScale(0.7)}
            aria-pressed={stageScale === 0.7}
            className={`px-1 py-0 rounded cursor-pointer transition-colors duration-200 ${
              stageScale === 0.7
                ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
            }`}
            title="Set Stage Video Scale to 70%"
          >
            70%
          </button>
          <button
            type="button"
            data-testid="stage-scale-100"
            onClick={() => setStageScale(1.0)}
            aria-pressed={stageScale === 1.0}
            className={`px-1 py-0 rounded cursor-pointer transition-colors duration-200 ${
              stageScale === 1.0
                ? 'bg-[#1D1D22] text-[#F4F4F5] font-bold group-hover:bg-amber-400 group-hover:text-black'
                : 'text-[#8E8E93] hover:!text-[#F4F4F5]'
            }`}
            title="Set Stage Video Scale to 100% Edge-to-Edge"
          >
            100%
          </button>
        </div>

        {/* Aspect + Inspector/Master Mode */}
        <div className="hidden md:flex items-center gap-1 px-1.5 py-0 h-[16px] rounded bg-[#141417] border border-white/[0.07] text-[8.5px] font-bold tabular-nums transition-colors duration-200">
          <span className="text-[#8E8E93] group-hover:text-[#F59E0B] transition-colors duration-200">{aspectRatio}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#8E8E93] group-hover:text-[#F4F4F5] transition-colors duration-200">
            {playbackMode === 'sequence' ? 'HERO GLOBAL' : 'SOLO INSPECTOR'}
          </span>
        </div>

        {/* [ TITLE FX ] Trigger Button */}
        <button
          ref={titleFxBtnRef}
          type="button"
          data-testid="stage-title-fx-button"
          onClick={openTitleFxPopover}
          className={`px-1.5 py-0 h-[16px] rounded border text-[8.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors duration-200 ${
            isTitleFxOpen
              ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
              : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] group-hover:border-[#F59E0B]/50 group-hover:text-[#F59E0B] group-hover:bg-[#F59E0B]/10'
          }`}
          title="Hero Title FX & Dopamine Presets"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>[ TITLE FX ]</span>
        </button>

        {/* Zero-Prompt EDIT IN App Strip (Ps, Pr, Ai, CapCut) */}
        <EditInAppStrip shotIndex={shotIndex} frame={frame} variant="hud" />

        {/* Optional External Quick Utility Icons */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className="w-4 h-4 p-0 flex items-center justify-center rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] cursor-pointer transition-colors duration-200"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5 text-[#8E8E93] group-hover:text-[#F59E0B]" />}
          </button>
        )}
        {onUploadMedia && (
          <button
            type="button"
            onClick={onUploadMedia}
            className="w-4 h-4 p-0 flex items-center justify-center rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] cursor-pointer transition-colors duration-200"
            title="Upload / Replace Shot Media"
          >
            <Upload className="w-2.5 h-2.5" />
          </button>
        )}
        {onOpenInspector && (
          <button
            type="button"
            onClick={onOpenInspector}
            className="w-4 h-4 p-0 flex items-center justify-center rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] cursor-pointer transition-colors duration-200"
            title="Open Optical Inspector"
          >
            <Sparkles className="w-2.5 h-2.5" />
          </button>
        )}
        {(onOpenCinemaPlayer || onToggleFullscreen) && (
          <button
            type="button"
            onClick={onOpenCinemaPlayer || onToggleFullscreen}
            className="w-4 h-4 p-0 flex items-center justify-center rounded bg-[#141417] border border-white/[0.07] text-[#8E8E93] group-hover:text-[#F4F4F5] hover:!text-[#F59E0B] cursor-pointer transition-colors duration-200"
            title="Fullscreen Cinema View"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

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
