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
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

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
    <div className="absolute right-4 top-16 z-40 w-80 sm:w-88 rounded-xl bg-[#0A0A12]/96 border border-[#26282E] shadow-[0_20px_50px_rgba(0,0,0,0.92)] backdrop-blur-2xl p-4 text-xs font-mono text-zinc-300 animate-in fade-in zoom-in-95 duration-150 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <CinemaBadgeHeader
            icon={<Film className="w-3.5 h-3.5" strokeWidth={2.2} />}
            label="FILM STOCK"
            accent="amber"
          />
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300 font-black tabular-nums">
            SH{String(currentIndex + 1).padStart(3, '0')}
          </span>
        </div>
        {onClose && (
          <CinemaToolHUD
            title="CLOSE COLOR TRAY"
            en="Closes the 35mm film stock and grading tray."
            bn="ফিল্ম কালার গ্রেডিং প্যানেল বন্ধ করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={onClose}
              className="cinema-tile cinema-tile-amber w-7 h-7 rounded-md flex items-center justify-center cursor-pointer"
              aria-label="Close Grading Tray"
            >
              <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
            </button>
          </CinemaToolHUD>
        )}
      </div>

      {/* Film Stock Preset Selectors */}
      <div className="my-3 space-y-2">
        <div className="flex items-center justify-between">
          <CinemaBadgeHeader
            icon={<Sparkles className="w-3 h-3" strokeWidth={2.2} />}
            label="35MM LUTS"
            accent="cyan"
          />
          <span className="text-[9.5px] font-black text-amber-400 tracking-wider">{currentMeta.code}</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {FILM_STOCK_PRESETS.map((stock) => {
            const isSelected = currentLut === stock.id;
            return (
              <CinemaToolHUD
                key={stock.id}
                title={stock.name.toUpperCase()}
                en={stock.description}
                bn={`শটে ${stock.name} সিনেমার কালার লুক দিতে চাপুন।`}
                accent="amber"
                blockWrapper
              >
                <button
                  type="button"
                  data-active={isSelected ? 'true' : 'false'}
                  onClick={() => handleSelectPreset(stock)}
                  className="cinema-tile cinema-tile-amber w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-1.5 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: stock.accentColor }}
                    />
                    <span className="font-black text-[10px] tracking-wider uppercase truncate">{stock.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={2.4} />
                  )}
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>
      </div>

      {/* Parametric Adjustment Sliders */}
      <div className="pt-2.5 pb-3 border-t border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <CinemaBadgeHeader
            icon={<Sliders className="w-3 h-3" strokeWidth={2.2} />}
            label="GRADE PASS"
            accent="amber"
          />
          <CinemaToolHUD
            title="RESET GRADE"
            en="Resets exposure, contrast, glow, and grain to selected film stock defaults."
            bn="এই শটের কালার এডজাস্টমেন্ট রিসেট করতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              onClick={handleResetCurrent}
              className="cinema-tile cinema-tile-amber px-2 py-1 rounded-md flex items-center gap-1 text-[9.5px] font-black tracking-wider uppercase cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 cinema-tile-icon" strokeWidth={2.2} />
              <span>RESET</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Exposure */}
        <div>
          <div className="flex justify-between text-[9.5px] font-black tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sun className="w-3 h-3 text-amber-400" />
              EXPOSURE
            </span>
            <span className="text-[#f5a623]">
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
          <div className="flex justify-between text-[9.5px] font-black tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <ContrastIcon className="w-3 h-3 text-cyan-400" />
              CONTRAST
            </span>
            <span className="text-[#f5a623]">{Math.round(contrast)}%</span>
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
          <div className="flex justify-between text-[9.5px] font-black tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Flame className="w-3 h-3 text-rose-400" />
              TEMP
            </span>
            <span className="text-[#f5a623]">
              {temperature > 0 ? `+${temperature}W` : temperature < 0 ? `${temperature}C` : '0'}
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
          <div className="flex justify-between text-[9.5px] font-black tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              GLOW
            </span>
            <span className="text-[#f5a623]">{Math.round(glow)}%</span>
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
          <div className="flex justify-between text-[9.5px] font-black tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1 text-zinc-300">
              <Layers className="w-3 h-3 text-emerald-400" />
              GRAIN
            </span>
            <span className="text-[#f5a623]">{Math.round(grain)}%</span>
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
        <CinemaToolHUD
          title="SYNC GRADE ALL SHOTS"
          en={`Applies active LUT and adjustments across all ${totalShots} sequence shots.`}
          bn="বর্তমান শটের কালার গ্রেড সবগুলো শটে এক ক্লিকে কপি করতে চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={handleRippleToAllShots}
            disabled={rippleSuccess}
            data-active={rippleSuccess ? 'true' : 'false'}
            className="cinema-tile cinema-tile-amber w-full py-2.5 px-3 rounded-lg font-black text-[10.5px] tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            {rippleSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
                <span>SYNCED ALL</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 cinema-tile-icon fill-current" strokeWidth={2.2} />
                <span>SYNC ALL</span>
              </>
            )}
          </button>
        </CinemaToolHUD>
      </div>
    </div>
  );
};
