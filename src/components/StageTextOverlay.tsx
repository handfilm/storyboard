/**
 * @file /src/components/StageTextOverlay.tsx
 * @description Real-Time Dual-Language Typography & Subtitle Synchronization Overlay.
 * 
 * Features:
 * - Dual-language typography: Glowing Bangla title + Cinematic English subtitle/tagline.
 * - Reactive 0ms latency adjustments for scale, glow intensity, and letter tracking.
 * - Auto-binds dynamically to active timeline shot index.
 * - Clean tactile HUD typography with zero noise/grain interference.
 */

import React, { useState } from 'react';
import { Type, Sparkles, Sliders, Eye, EyeOff } from 'lucide-react';

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
  variant?: 'center-low' | 'bottom-left' | 'asymmetric-split' | 'top-right-split' | 'middle-right' | 'bottom-right';
  className?: string;
  allowQuickControls?: boolean;
}

export const StageTextOverlay: React.FC<StageTextOverlayProps> = ({
  shotIndex,
  banglaTitle,
  englishTitle,
  subtitle,
  directorNotes,
  cameraInfo,
  isVisible = true,
  scale: initialScale = 1.0,
  glowIntensity: initialGlow = 1.0,
  tracking: initialTracking = 0.15,
  variant = 'center-low',
  className = '',
  allowQuickControls = false
}) => {
  const [scale, setScale] = useState<number>(initialScale);
  const [glow, setGlow] = useState<number>(initialGlow);
  const [tracking, setTracking] = useState<number>(initialTracking);
  const [showControls, setShowControls] = useState<boolean>(false);

  if (!isVisible) return null;

  // Resolving typography text
  const displayBangla = banglaTitle || 'আলোর স্মৃতি';
  const displayEnglish = englishTitle || `SHOT ${String(shotIndex + 1).padStart(3, '0')} // SEQUENCE ARCHIVE`;
  const displaySubtitle = subtitle || directorNotes || '24.0 FPS RAW • MASTER CINE PROJECTION';

  // Glow styles based on glow intensity
  const banglaGlowStyle = {
    textShadow: glow > 0 
      ? `0 0 ${12 * glow}px rgba(245, 166, 35, 0.75), 0 0 ${28 * glow}px rgba(245, 166, 35, 0.45), 0 2px 4px rgba(0,0,0,0.9)`
      : '0 2px 6px rgba(0,0,0,0.9)',
    letterSpacing: `${tracking}em`,
    transform: `scale(${scale})`,
    transformOrigin: variant === 'center-low' ? 'center center' : variant.includes('right') ? 'right center' : 'left center'
  };

  const englishGlowStyle = {
    letterSpacing: `${(tracking + 0.12).toFixed(2)}em`,
    textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 10px rgba(255,255,255,0.2)'
  };

  const getPositionClasses = () => {
    switch (variant) {
      case 'bottom-left':
        return 'bottom-10 left-8 sm:bottom-14 sm:left-12 text-left items-start';
      case 'bottom-right':
        return 'bottom-10 right-8 sm:bottom-14 sm:right-12 text-right items-end';
      case 'top-right-split':
        return 'top-10 right-8 sm:top-14 sm:right-12 text-right items-end';
      case 'asymmetric-split':
        return 'top-10 left-8 sm:top-14 sm:left-12 text-left items-start';
      case 'middle-right':
        return 'top-1/2 -translate-y-1/2 right-8 sm:right-14 text-right items-end';
      case 'center-low':
      default:
        return 'bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 text-center items-center';
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-20 flex flex-col justify-end p-6 select-none ${className}`}
      data-shot-index={shotIndex}
    >
      {/* Floating typography cluster */}
      <div className={`absolute flex flex-col transition-all duration-75 ease-out max-w-3xl ${getPositionClasses()}`}>
        
        {/* Glowing Bangla Title */}
        <h1
          className="font-bangla font-black text-2xl sm:text-3xl md:text-4xl text-[#F5A623] tracking-wide leading-none transition-transform duration-75"
          style={banglaGlowStyle}
        >
          {displayBangla}
        </h1>

        {/* English Cinematic Subtitle */}
        <div className="mt-2 flex flex-col gap-1">
          <p
            className="font-cinzel font-bold text-xs sm:text-sm md:text-base text-white/95 uppercase transition-all duration-75"
            style={englishGlowStyle}
          >
            {displayEnglish}
          </p>

          {/* Director / Sequence Note */}
          {displaySubtitle && (
            <p className="font-mono text-[9px] sm:text-[10px] text-white/60 tracking-wider uppercase">
              {displaySubtitle}
            </p>
          )}

          {cameraInfo && (
            <span className="font-mono text-[8px] text-[#fbbf24]/80 tracking-widest mt-0.5">
              {cameraInfo}
            </span>
          )}
        </div>
      </div>

      {/* Optional Interactive Mini Quick-Adjuster (pointer-events-auto) */}
      {allowQuickControls && (
        <div className="absolute top-3 right-3 pointer-events-auto z-30">
          <button
            type="button"
            onClick={() => setShowControls(c => !c)}
            className="p-1.5 rounded bg-black/60 hover:bg-black/80 border border-white/10 hover:border-[#F5A623]/50 text-white/70 hover:text-[#F5A623] text-[10px] flex items-center gap-1 transition-all"
            title="Adjust Stage Typography"
          >
            <Sliders className="w-3 h-3 text-[#F5A623]" />
            <span className="font-mono text-[9px]">TXT HUD</span>
          </button>

          {showControls && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#0E0E14]/95 border border-[#272732] rounded p-2.5 font-mono text-[10px] text-zinc-300 space-y-2 backdrop-blur-xl shadow-2xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[#F5A623] font-bold text-[9px] border-b border-white/10 pb-1">
                <span>STAGE TYPOGRAPHY HUD</span>
                <span>SH{String(shotIndex + 1).padStart(3, '0')}</span>
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-white/60">
                  <span>SCALE</span>
                  <span>{scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.6"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
                />
              </div>

              {/* Glow Intensity Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-white/60">
                  <span>GLOW</span>
                  <span>{glow.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={glow}
                  onChange={(e) => setGlow(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-700 accent-[#F5A623] cursor-pointer"
                />
              </div>

              {/* Tracking Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-white/60">
                  <span>TRACKING</span>
                  <span>{tracking.toFixed(2)}em</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.02"
                  value={tracking}
                  onChange={(e) => setTracking(parseFloat(e.target.value))}
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
