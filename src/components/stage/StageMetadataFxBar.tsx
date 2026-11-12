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
import { useStudioStore, HeroTitlePreset, TitlePosition } from '../../core/store';
import { MultiLayerZoomControls } from '../optics/MultiLayerZoomControls';
import { eventBus } from '../../core/eventBus';

export interface StageMetadataFxBarProps {
  sceneCode?: string;
  shotIndex: number;
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
  const titlePosition = useStudioStore((s) => s.titlePosition);
  const setTitlePosition = useStudioStore((s) => s.setTitlePosition);
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

  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isTitleFxOpen, setIsTitleFxOpen] = useState(false);
  const zoomBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleFxBtnRef = useRef<HTMLButtonElement | null>(null);
  const [zoomAnchor, setZoomAnchor] = useState<{ right: number; top: number } | null>(null);
  const [titleFxAnchor, setTitleFxAnchor] = useState<{ right: number; top: number } | null>(null);

  const activePreset: HeroTitlePreset = storeTitleConfig?.preset || 'molten-gold';
  const glow = storeTitleConfig?.glowIntensity ?? 1.0;
  const tracking = storeTitleConfig?.tracking ?? 0.15;
  const verticalOffset = storeTitleConfig?.verticalOffset ?? 0;
  const titleSizePx = storeTitleConfig?.titleSize ?? 72;

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

  const shotCode = String(shotIndex + 1).padStart(3, '0');
  const frameTag = `F${String(Math.min(totalFrames, Math.max(1, frameNum))).padStart(3, '0')}/${String(totalFrames).padStart(3, '0')}`;

  return (
    <div
      data-testid="stage-metadata-fx-bar"
      className={`animate-hud-fade-in w-full max-w-[min(99vw,1880px)] mx-auto h-7 min-h-[28px] px-2.5 bg-[#07080d]/95 border-b border-white/10 flex items-center justify-between gap-2 text-[10px] font-mono select-none shrink-0 z-30 ${className}`}
    >
      {/* LEFT: SCENE // SHOT • F001/144 • FPS • STREAM QUALITY */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-x-auto no-scrollbar">
        <span className="text-[#F5A623] font-bold tracking-wider whitespace-nowrap shrink-0">
          SCENE {sceneCode} // SH{shotCode}
        </span>

        {showHud && (
          <>
            <span className="text-white/25 shrink-0">•</span>
            <span className="text-white font-bold tabular-nums whitespace-nowrap shrink-0">
              {frameTag}
            </span>
            {smpte && (
              <>
                <span className="text-white/25 hidden sm:inline shrink-0">•</span>
                <span className="text-zinc-300 tabular-nums hidden sm:inline whitespace-nowrap shrink-0">
                  {smpte}
                </span>
              </>
            )}
            <span className="text-white/25 hidden md:inline shrink-0">•</span>
            <span className="text-emerald-400 font-bold tabular-nums hidden md:inline whitespace-nowrap shrink-0">
              {fps}.0 fps
            </span>
            <span className="text-white/25 hidden lg:inline shrink-0">•</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold whitespace-nowrap hidden lg:inline shrink-0 border ${
                streamLabel.includes('PROXY')
                  ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                  : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
              }`}
            >
              {streamLabel}
            </span>
          </>
        )}

        {velocityBadge && (
          <span className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold whitespace-nowrap hidden xl:inline shrink-0 ${velocityBadge.color}`}>
            {velocityBadge.label}
          </span>
        )}

        {inOutBadge && (
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 text-[8.5px] font-bold whitespace-nowrap hidden xl:inline shrink-0">
            {inOutBadge}
          </span>
        )}

        {lightName && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[8.5px] font-bold whitespace-nowrap hidden xl:inline-flex items-center gap-1 shrink-0">
            <Lightbulb className="w-2.5 h-2.5" />
            <span>{lightName}</span>
          </span>
        )}

        {digitalZoom.isZoomed && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[8.5px] font-bold shrink-0">
            <span>DIGITAL {digitalZoom.scale.toFixed(1)}x</span>
            <button
              type="button"
              onClick={resetDigitalZoom}
              className="px-1 rounded bg-amber-400/20 hover:bg-amber-400/40 text-white cursor-pointer flex items-center gap-0.5"
              title="Reset Digital Frame Zoom"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>RESET</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: TITLE: LEFT|MID|RIGHT|AUTO • ZOOM • ASPECT • MODE • [ TITLE FX ] */}
      <div className="flex items-center gap-1.5 shrink-0">
        {safeZone && onChangeSafeZone && (
          <div className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 border border-white/15 text-[8.5px]">
            <Compass className="w-2.5 h-2.5 text-[#F5A623] mr-0.5" />
            {(['top', 'center', 'bottom'] as const).map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => onChangeSafeZone(zone)}
                className={`px-1 rounded cursor-pointer transition-colors ${
                  safeZone === zone
                    ? 'bg-[#F5A623] text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {zone === 'top' ? 'TOP' : zone === 'center' ? 'CTR' : 'BOT'}
              </button>
            ))}
          </div>
        )}

        {/* TITLE Position Selector */}
        <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/70 border border-white/10 text-[8.5px]">
          <span className="text-zinc-500 font-bold mr-0.5">TITLE:</span>
          {(
            [
              { id: 'left-bottom', label: 'LEFT' },
              { id: 'mid-bottom', label: 'MID' },
              { id: 'right-bottom', label: 'RIGHT' },
              { id: 'auto', label: 'AUTO' }
            ] as { id: TitlePosition; label: string }[]
          ).map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => setTitlePosition(pos.id)}
              className={`px-1.5 py-0.2 rounded cursor-pointer transition-colors ${
                titlePosition === pos.id
                  ? 'bg-[#F5A623] text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={`Set Stage Caption Alignment: ${pos.label}`}
            >
              {pos.label}
            </button>
          ))}
        </div>

        {/* Multi-Layer ZOOM Trigger */}
        <button
          ref={zoomBtnRef}
          type="button"
          onClick={openZoomPopover}
          className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
            isZoomOpen || fgZoom !== 1.0 || bgZoom !== 1.0
              ? 'bg-[#d4af37]/25 border-[#d4af37] text-[#ffe066]'
              : 'bg-black/70 border-white/15 text-zinc-300 hover:text-white hover:border-amber-400/50'
          }`}
          title="Multi-Layer Parallax Zoom Controls"
        >
          <ZoomIn className="w-2.5 h-2.5 text-[#FFE066]" />
          <span>ZOOM</span>
          <span className="hidden md:inline tabular-nums text-[#FFE066]">
            {fgZoom.toFixed(1)}x/{bgZoom.toFixed(1)}x
          </span>
          {isVertigo && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
        </button>

        {/* Aspect + Inspector/Master Mode */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[9px] font-bold">
          <span className="text-[#F5A623]">{aspectRatio}</span>
          <span className="text-white/20">|</span>
          <span className={playbackMode === 'sequence' ? 'text-emerald-400' : 'text-cyan-300'}>
            {playbackMode === 'sequence' ? 'HERO GLOBAL' : 'SOLO INSPECTOR'}
          </span>
        </div>

        {/* [ TITLE FX ] Trigger Button */}
        <button
          ref={titleFxBtnRef}
          type="button"
          data-testid="stage-title-fx-button"
          onClick={openTitleFxPopover}
          className={`px-2 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
            isTitleFxOpen
              ? 'bg-[#F5A623] border-[#F5A623] text-black'
              : 'bg-black/80 border-[#F5A623]/45 text-[#FFE066] hover:bg-[#F5A623]/20'
          }`}
          title="Hero Title FX & Dopamine Presets"
        >
          <Sliders className="w-2.5 h-2.5" />
          <span>[ TITLE FX ]</span>
        </button>

        {/* Optional External Quick Utility Icons */}
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            className="p-1 rounded bg-black/70 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-emerald-400" />}
          </button>
        )}
        {onUploadMedia && (
          <button
            type="button"
            onClick={onUploadMedia}
            className="p-1 rounded bg-black/70 border border-white/10 text-zinc-300 hover:text-amber-300 cursor-pointer"
            title="Upload / Replace Shot Media"
          >
            <Upload className="w-3 h-3" />
          </button>
        )}
        {onOpenInspector && (
          <button
            type="button"
            onClick={onOpenInspector}
            className="p-1 rounded bg-black/70 border border-white/10 text-zinc-300 hover:text-[#FFE066] cursor-pointer"
            title="Open Optical Inspector"
          >
            <Sparkles className="w-3 h-3" />
          </button>
        )}
        {(onOpenCinemaPlayer || onToggleFullscreen) && (
          <button
            type="button"
            onClick={onOpenCinemaPlayer || onToggleFullscreen}
            className="p-1 rounded bg-black/70 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
            title="Fullscreen Cinema View"
          >
            <Maximize2 className="w-3 h-3" />
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
            className="w-72 bg-[#0a0a10]/98 border border-[#F5A623]/45 rounded-lg p-3 font-mono text-[10px] text-zinc-300 space-y-2.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between text-[#F5A623] font-bold text-[9.5px] border-b border-white/10 pb-1.5">
              <span>HERO TITLE FX ENGINE</span>
              {onToggleTitles && (
                <button
                  type="button"
                  onClick={onToggleTitles}
                  className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold flex items-center gap-1 cursor-pointer ${
                    isTitlesActive
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-zinc-800 border-white/15 text-zinc-400'
                  }`}
                >
                  {isTitlesActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
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
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                ⚡ GOLD
              </button>
              <button
                type="button"
                onClick={() => setTitlePreset('titanium-silver')}
                className={`p-1.5 text-[8.5px] font-bold rounded border cursor-pointer transition-colors ${
                  activePreset === 'titanium-silver'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                ❄ SILVER
              </button>
              <button
                type="button"
                onClick={() => setTitlePreset('neon-crimson')}
                className={`p-1.5 text-[8.5px] font-bold rounded border cursor-pointer transition-colors ${
                  activePreset === 'neon-crimson'
                    ? 'bg-rose-500/25 border-rose-400 text-rose-300'
                    : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                🩸 CRIMSON
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-white/60">
                <span>TITLE SIZE</span>
                <span className="text-[#F5A623] font-bold">{titleSizePx}px</span>
              </div>
              <input
                type="range"
                min="48"
                max="120"
                step="2"
                value={titleSizePx}
                onChange={(e) => setTitleSize(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-white/60">
                <span>GLOW INTENSITY</span>
                <span className="text-[#F5A623] font-bold">{Math.round(glow * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={glow}
                onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-white/60">
                <span>VERTICAL OFFSET</span>
                <span className="text-[#F5A623] font-bold">{verticalOffset}px</span>
              </div>
              <input
                type="range"
                min="-120"
                max="120"
                step="5"
                value={verticalOffset}
                onChange={(e) => setTitleVerticalOffset(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8.5px] text-white/60">
                <span>TRACKING</span>
                <span className="text-[#F5A623] font-bold">{tracking.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.02"
                value={tracking}
                onChange={(e) => setTitleTracking(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setIsTitleFxOpen(false);
                eventBus.emit('studio:open_module', { module: 'TEXT' });
              }}
              className="w-full py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-[9px] cursor-pointer transition-colors"
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
