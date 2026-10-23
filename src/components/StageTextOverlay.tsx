/**
 * @file /src/components/StageTextOverlay.tsx
 * @description Master Dynamic "Hero Title" Kinetic Typography Engine.
 * 
 * Features:
 * - Dead-center stage hero title layout (z-30 pointer-events-none).
 * - Multi-layer Molten Gold bloom (solid gradient base, ambient bloom, volumetric rim).
 * - Titanium Silver & Neon Crimson kinetic presets.
 * - Ultra-wide tracked monospace English subtitle (tracking-[0.35em]).
 * - Anamorphic optical flare divider reflection bar.
 * - Floating obsidian narrative dialogue capsule.
 * - 600ms cinematic ease-scale entrance motion (scale-95 to scale-100).
 * - 0ms reactive synchronization with useStudioStore.
 */

import React, { useState } from 'react';
import { useStudioStore, HeroTitlePreset } from '../core/store';
import { Sparkles, Sliders, Eye, EyeOff, Zap, Flame, Snowflake } from 'lucide-react';

export type StageTitleVariant =
  | 'center'
  | 'auto'
  | 'mid-bottom'
  | 'left-bottom'
  | 'right-bottom'
  | 'center-low'
  | 'bottom-left'
  | 'bottom-right'
  | 'asymmetric-split'
  | 'top-right-split'
  | 'middle-right';

export interface StageTextOverlayProps {
  shotIndex: number;
  banglaTitle?: string;
  englishTitle?: string;
  subtitle?: string;
  directorNotes?: string;
  cameraInfo?: string;
  isVisible?: boolean;
  scale?: number;
  glowIntensity?: number;
  tracking?: number;
  verticalOffset?: number;
  preset?: HeroTitlePreset;
  variant?: StageTitleVariant | string;
  className?: string;
  allowQuickControls?: boolean;
  onChangeVariant?: (variant: any) => void;
}

export const StageTextOverlay: React.FC<StageTextOverlayProps> = ({
  shotIndex,
  banglaTitle,
  englishTitle,
  subtitle,
  directorNotes,
  cameraInfo,
  isVisible = true,
  scale: propScale,
  glowIntensity: propGlow,
  tracking: propTracking,
  verticalOffset: propOffset,
  preset: propPreset,
  variant = 'center',
  className = '',
  allowQuickControls = false,
  onChangeVariant
}) => {
  const storeTitleConfig = useStudioStore(s => s.titleConfig);
  const storeVisibility = useStudioStore(s => s.visibility.titlesAll);
  const setTitlePreset = useStudioStore(s => s.setTitlePreset);
  const setTitleSize = useStudioStore(s => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore(s => s.setTitleGlowIntensity);
  const setTitleVerticalOffset = useStudioStore(s => s.setTitleVerticalOffset);
  const setTitleTracking = useStudioStore(s => s.setTitleTracking);
  const toggleTitlesStore = useStudioStore(s => s.toggleTitles);

  const [showQuickHud, setShowQuickHud] = useState(false);

  // Active configurations (props override store if explicitly given)
  const activePreset: HeroTitlePreset = propPreset || storeTitleConfig?.preset || 'molten-gold';
  const glow = propGlow ?? storeTitleConfig?.glowIntensity ?? 1.0;
  const tracking = propTracking ?? storeTitleConfig?.tracking ?? 0.15;
  const verticalOffset = propOffset ?? storeTitleConfig?.verticalOffset ?? 0;
  const titleSizePx = storeTitleConfig?.titleSize ?? 72;
  const scale = propScale ?? (titleSizePx / 72);

  // Title visibility check
  const isEnabled = isVisible && (storeTitleConfig?.showTitles ?? true) && storeVisibility;
  if (!isEnabled) return null;

  // Iconic headline fallbacks for dynamic Bangla hero typography
  const DEFAULT_BANGLA_HEADLINES = ['শূন্য', 'আলো', 'সংঘাত', 'দৃষ্টির সীমানা'];
  const fallbackHeadline = DEFAULT_BANGLA_HEADLINES[shotIndex % DEFAULT_BANGLA_HEADLINES.length];

  const displayBangla = (banglaTitle && banglaTitle.trim().length > 0) ? banglaTitle : fallbackHeadline;
  const displayEnglish = (englishTitle && englishTitle.trim().length > 0) 
    ? englishTitle 
    : `SHOT ${String(shotIndex + 1).padStart(3, '0')} // MASTER SEQUENCE`;
  const displayDialogue = directorNotes || subtitle;

  // Preset Visual Treatments
  const getPresetStyles = () => {
    switch (activePreset) {
      case 'titanium-silver':
        return {
          titleGradient: 'from-slate-100 via-slate-300 to-cyan-200 bg-clip-text text-transparent',
          filter: `drop-shadow(0 0 ${Math.round(25 * glow)}px rgba(56,189,248,0.85)) drop-shadow(0 0 ${Math.round(50 * glow)}px rgba(14,165,233,0.4))`,
          flareGradient: 'bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_20px_#38BDF8]',
          subtitleColor: 'text-slate-100',
          capsuleBorder: 'border-cyan-400/30 text-cyan-200/90',
          badgeText: 'TITANIUM SILVER'
        };
      case 'neon-crimson':
        return {
          titleGradient: 'from-rose-200 via-red-500 to-rose-700 bg-clip-text text-transparent',
          filter: `drop-shadow(0 0 ${Math.round(25 * glow)}px rgba(239,68,68,0.9)) drop-shadow(0 0 ${Math.round(50 * glow)}px rgba(220,38,38,0.5))`,
          flareGradient: 'bg-gradient-to-r from-transparent via-[#EF4444] to-transparent shadow-[0_0_20px_#EF4444]',
          subtitleColor: 'text-rose-100',
          capsuleBorder: 'border-rose-500/30 text-rose-300/90',
          badgeText: 'NEON CRIMSON'
        };
      case 'molten-gold':
      default:
        return {
          titleGradient: 'from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent',
          filter: `drop-shadow(0 0 ${Math.round(25 * glow)}px rgba(245,166,35,0.85)) drop-shadow(0 0 ${Math.round(50 * glow)}px rgba(245,166,35,0.4))`,
          flareGradient: 'bg-gradient-to-r from-transparent via-[#F5A623] to-transparent shadow-[0_0_25px_#F5A623]',
          subtitleColor: 'text-slate-200',
          capsuleBorder: 'border-[#F5A623]/25 text-[#F5A623]/90',
          badgeText: 'MOLTEN GOLD'
        };
    }
  };

  const presetStyle = getPresetStyles();

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-30 select-none overflow-hidden flex flex-col ${className}`}
      data-shot-index={shotIndex}
      data-preset={activePreset}
    >
      {/* Centered Dead-Middle Dynamic Hero Title Cluster */}
      <div 
        key={`hero-title-cluster-${shotIndex}-${activePreset}`}
        className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 animate-kinetic-entrance transition-transform duration-200"
        style={{
          transform: `translateY(${verticalOffset}px)`
        }}
      >
        <div className="flex flex-col items-center justify-center text-center max-w-5xl px-4">
          
          {/* Primary Title (Bangla Dynamic Hero Font with 480ms cubic-bezier kinetic expansion) */}
          <h1
            key={`bangla-title-${shotIndex}`}
            className={`font-bangla font-black bg-gradient-to-r ${presetStyle.titleGradient} tracking-wide leading-tight select-none text-5xl sm:text-7xl md:text-8xl drop-shadow-2xl animate-kinetic-entrance`}
            style={{
              fontSize: `${Math.round(titleSizePx * scale)}px`,
              letterSpacing: `${tracking}em`,
              filter: presetStyle.filter,
              transformOrigin: 'center center'
            }}
          >
            {displayBangla}
          </h1>

          {/* Subtitle (Tracked Monospace English) */}
          <div className="mt-4 sm:mt-5 flex flex-col items-center">
            <p
              className={`font-mono text-sm sm:text-base md:text-lg font-bold ${presetStyle.subtitleColor} uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]`}
              style={{
                letterSpacing: `${Math.max(0.2, tracking + 0.2)}em`
              }}
            >
              {displayEnglish}
            </p>

            {/* Accent: Optical Anamorphic Streak Divider expanding horizontally (w-0 to w-32 over 600ms) */}
            <div 
              key={`anamorphic-streak-${shotIndex}`}
              className={`h-[2px] mt-2.5 rounded-full ${presetStyle.flareGradient} animate-streak-expand`}
            />

            {/* Camera Optical Spec / Focal Length Badge (Subtle) */}
            {cameraInfo && (
              <span className="font-mono text-[9px] text-white/50 tracking-[0.25em] uppercase mt-2">
                {cameraInfo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Narrative Line / Dialogue Card: Pinned bottom-center in a floating obsidian capsule */}
      {displayDialogue && (
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-xl px-4 text-center w-full">
          <div className={`mx-auto inline-flex items-center gap-2 bg-black/60 backdrop-blur-md border ${presetStyle.capsuleBorder} px-6 py-2 rounded-full text-xs sm:text-sm italic shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <span>"{displayDialogue}"</span>
          </div>
        </div>
      )}

      {/* Optional Interactive Quick-HUD for on-stage tweaking */}
      {allowQuickControls && (
        <div className="absolute top-12 right-3 pointer-events-auto z-40 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowQuickHud(v => !v)}
            className="p-1.5 rounded-full bg-black/80 hover:bg-black border border-white/20 hover:border-[#F5A623] text-white/80 hover:text-[#F5A623] text-[10px] font-mono flex items-center gap-1 transition-all backdrop-blur-md shadow-lg cursor-pointer"
            title="Adjust Hero Title Kinetics"
          >
            <Sliders className="w-3 h-3 text-[#F5A623]" />
            <span className="text-[9px] font-bold">TITLE FX</span>
          </button>

          {showQuickHud && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0a0a10]/95 border border-[#272732] rounded-md p-3 font-mono text-[10px] text-zinc-300 space-y-2.5 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[#F5A623] font-bold text-[9px] border-b border-white/10 pb-1.5">
                <span>HERO TITLE ENGINE</span>
                <span className="text-[8px] bg-[#F5A623]/20 px-1 py-0.2 rounded text-[#F5A623] font-mono">
                  {presetStyle.badgeText}
                </span>
              </div>

              {/* Preset Selector */}
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setTitlePreset('molten-gold')}
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
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
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
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
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
                    activePreset === 'neon-crimson' 
                      ? 'bg-rose-500/25 border-rose-400 text-rose-300' 
                      : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  🩸 CRIMSON
                </button>
              </div>

              {/* Title Size Slider */}
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

              {/* Glow Intensity Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-white/60">
                  <span>GLOW INTENSITY</span>
                  <span className="text-[#F5A623] font-bold">{Math.round(glow * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={glow}
                  onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
                />
              </div>

              {/* Vertical Offset Slider */}
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

              {/* Tracking Slider */}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};
