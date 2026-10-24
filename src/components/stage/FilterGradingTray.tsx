/**
 * @file /src/components/stage/FilterGradingTray.tsx
 * @description Floating 35mm Film Stock & Color Grading Tray for HANDFILM Stage.
 * 
 * Features:
 * 1. Film stock selectors: Kodak 5219, Fuji Eterna 500T, Mono Noir 35mm, Bleach Bypass, Raw Clean.
 * 2. Real-time sliders: Exposure (±2.0 EV), Contrast (50-200%), Temperature (Cool/Warm), Anamorphic Glow (0-100%), Grain (0-100%).
 * 3. One-Click Global Ripple: [ ⚡ Apply Grade to All Shots (001-100) ].
 * 4. 3D obsidian brutalist-neomorphic design with glowing gold badges.
 */

import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  Zap,
  X,
  Sun,
  Contrast as ContrastIcon,
  Flame,
  Layers
} from 'lucide-react';
import { AnthologyFrame, FrameAdjustments, LutPreset } from '../../types/anthology';
import {
  FILM_STOCK_PRESETS,
  FilmStockMeta,
  FilmStockPreset,
  getFilmStockMeta
} from '../../services/cinematicFilterEngine';
import { studioDraftDb } from '../../services/db';

export interface FilterGradingTrayProps {
  currentFrame: AnthologyFrame;
  currentIndex: number;
  totalShots?: number;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onApplyGradeToAll?: (lut: LutPreset, adjustments: FrameAdjustments) => void;
  onClose?: () => void;
  isOpen?: boolean;
}

export const FilterGradingTray: React.FC<FilterGradingTrayProps> = ({
  currentFrame,
  currentIndex,
  totalShots = 100,
  onUpdateFrame,
  onApplyGradeToAll,
  onClose,
  isOpen = true
}) => {
  const [rippleSuccess, setRippleSuccess] = useState(false);

  if (!isOpen) return null;

  const currentLut = (currentFrame.lutFilter as FilmStockPreset) || 'kodak_vision3';
  const currentMeta = getFilmStockMeta(currentLut);
  const adjustments = currentFrame.adjustments || {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    bloom: 30,
    grain: 15,
    motionBlur: 50,
    vignette: 40
  };

  const exposure = adjustments.exposure ?? currentMeta.defaultAdjustments.exposure;
  const contrast = adjustments.contrast ?? currentMeta.defaultAdjustments.contrast;
  const temperature = adjustments.temperature ?? currentMeta.defaultAdjustments.temperature;
  const glow = adjustments.glow ?? currentMeta.defaultAdjustments.glow;
  const grain = adjustments.grain ?? currentMeta.defaultAdjustments.grain;

  const handleSelectPreset = (meta: FilmStockMeta) => {
    const updatedAdjustments: FrameAdjustments = {
      ...adjustments,
      exposure: meta.defaultAdjustments.exposure,
      contrast: meta.defaultAdjustments.contrast,
      temperature: meta.defaultAdjustments.temperature,
      glow: meta.defaultAdjustments.glow,
      grain: meta.defaultAdjustments.grain
    };

    onUpdateFrame({
      ...currentFrame,
      lutFilter: meta.id,
      adjustments: updatedAdjustments
    });
  };

  const handleAdjustmentChange = (key: keyof FrameAdjustments, value: number) => {
    const updatedAdjustments: FrameAdjustments = {
      ...adjustments,
      [key]: value
    };

    onUpdateFrame({
      ...currentFrame,
      adjustments: updatedAdjustments
    });
  };

  const handleResetCurrent = () => {
    handleSelectPreset(currentMeta);
  };

  const handleRippleToAllShots = async () => {
    if (onApplyGradeToAll) {
      onApplyGradeToAll(currentLut, adjustments);
    }
    setRippleSuccess(true);
    setTimeout(() => setRippleSuccess(false), 2400);
  };

  return (
    <div className="absolute right-4 top-16 z-40 w-80 sm:w-88 rounded-[6px] bg-[#0A0A12]/96 border border-[#d4af37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.92),0_0_24px_rgba(245,166,35,0.22)] backdrop-blur-2xl p-4 text-xs font-mono text-zinc-300 animate-in fade-in zoom-in-95 duration-150 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[3px] bg-[#f5a623]/20 border border-[#f5a623]/50 flex items-center justify-center">
            <Film className="w-3.5 h-3.5 text-[#f5a623]" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-white tracking-wider flex items-center gap-1.5">
              <span>35MM FILM STOCK DOCK</span>
              <span className="text-[8.5px] px-1 py-0.5 rounded bg-[#f5a623]/20 text-[#f5a623] font-mono">
                SH{String(currentIndex + 1).padStart(3, '0')}
              </span>
            </div>
            <div className="text-[9px] text-zinc-400">Zero-latency WebGL color shader pass</div>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Grading Tray"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Film Stock Preset Selectors */}
      <div className="my-3 space-y-1.5">
        <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Film Stocks (Hollywood 35mm)</span>
          <span className="text-[#f5a623]">{currentMeta.code}</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {FILM_STOCK_PRESETS.map((stock) => {
            const isSelected = currentLut === stock.id;
            return (
              <button
                key={stock.id}
                type="button"
                onClick={() => handleSelectPreset(stock)}
                className={`w-full px-2.5 py-1.5 rounded-[4px] text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#241c0e] to-[#120f08] border border-[#f5a623] text-white shadow-[0_0_12px_rgba(245,166,35,0.25)]'
                    : 'bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: stock.accentColor }}
                    />
                    <span className="font-bold text-[10px] tracking-wide">{stock.name}</span>
                  </div>
                  <div className="text-[8px] text-zinc-400 pl-4 truncate">{stock.description}</div>
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#f5a623] shrink-0 ml-1.5 drop-shadow-[0_0_4px_rgba(245,166,35,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parametric Adjustment Sliders */}
      <div className="pt-2 pb-3 border-t border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
          <span>Real-time Grading Parameters</span>
          <button
            type="button"
            onClick={handleResetCurrent}
            className="flex items-center gap-1 text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="Reset to Stock Defaults"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Exposure */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sun className="w-3 h-3 text-amber-400" />
              Exposure
            </span>
            <span className="text-[#f5a623] font-bold">
              {exposure > 0 ? `+${exposure.toFixed(2)}` : exposure.toFixed(2)} EV
            </span>
          </div>
          <input
            type="range"
            min="-2.0"
            max="2.0"
            step="0.05"
            value={exposure}
            onChange={(e) => handleAdjustmentChange('exposure', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
          />
        </div>

        {/* Contrast */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <ContrastIcon className="w-3 h-3 text-cyan-400" />
              Contrast
            </span>
            <span className="text-[#f5a623] font-bold">{Math.round(contrast)}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            step="1"
            value={contrast}
            onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
          />
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Flame className="w-3 h-3 text-rose-400" />
              Temperature
            </span>
            <span className="text-[#f5a623] font-bold">
              {temperature > 0 ? `+${temperature} Warm` : temperature < 0 ? `${temperature} Cool` : '0 Neutral'}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="2"
            value={temperature}
            onChange={(e) => handleAdjustmentChange('temperature', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
          />
        </div>

        {/* Anamorphic Glow */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              Anamorphic Glow
            </span>
            <span className="text-[#f5a623] font-bold">{Math.round(glow)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={glow}
            onChange={(e) => handleAdjustmentChange('glow', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
          />
        </div>

        {/* Film Grain */}
        <div>
          <div className="flex justify-between text-[9px] mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Layers className="w-3 h-3 text-emerald-400" />
              Film Grain (60fps Noise)
            </span>
            <span className="text-[#f5a623] font-bold">{Math.round(grain)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={grain}
            onChange={(e) => handleAdjustmentChange('grain', parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
          />
        </div>
      </div>

      {/* Ripple to All Shots Action Button */}
      <div className="pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={handleRippleToAllShots}
          disabled={rippleSuccess}
          className={`w-full py-2.5 px-3 rounded-[4px] font-bold text-[10px] tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${
            rippleSuccess
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-r from-[#d4af37] via-[#f5a623] to-[#d4af37] text-black hover:brightness-110 shadow-[0_4px_16px_rgba(245,166,35,0.4)] active:translate-y-0.5'
          }`}
        >
          {rippleSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>APPLIED TO ALL SHOTS (001-{totalShots})</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ APPLY GRADE TO ALL SHOTS (001-{totalShots})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
