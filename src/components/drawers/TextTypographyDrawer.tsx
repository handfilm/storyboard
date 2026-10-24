/**
 * @file /src/components/drawers/TextTypographyDrawer.tsx
 * @description Master Cinematic Title & Motion Typography Drawer.
 * Features 10 production-ready Director presets with interactive hover previews,
 * 1-click slide application, and instant WebCodecs canvas integration.
 */

import React, { useState } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { useStudioStore } from '../../core/store';
import { 
  CINEMATIC_TITLE_PRESETS, 
  TitleTemplatePreset, 
  applyTitleTemplateToFrame 
} from '../../constants/titleTemplates';
import { 
  Type, 
  Sparkles, 
  Zap, 
  Sliders, 
  Check, 
  Layers, 
  MoveVertical,
  SlidersHorizontal,
  Flame,
  Activity,
  Film
} from 'lucide-react';

export interface TextTypographyDrawerProps {
  currentFrame?: AnthologyFrame;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onApplyPreset?: (preset: TitleTemplatePreset) => void;
}

export const TextTypographyDrawer: React.FC<TextTypographyDrawerProps> = ({
  currentFrame,
  onUpdateFrame,
  onApplyPreset
}) => {
  const {
    activeShotIndex,
    titleConfig,
    setTitleSize,
    setTitleGlowIntensity,
    setTitleTracking,
    setTitleVerticalOffset
  } = useStudioStore();

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'cinematic' | 'rap' | 'docu' | 'retro'>('all');
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  const filteredPresets = selectedCategory === 'all'
    ? CINEMATIC_TITLE_PRESETS
    : CINEMATIC_TITLE_PRESETS.filter(p => p.category === selectedCategory);

  const handleApply = (preset: TitleTemplatePreset) => {
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2000);

    if (onApplyPreset) {
      onApplyPreset(preset);
    }

    if (currentFrame && onUpdateFrame) {
      const updated = applyTitleTemplateToFrame(currentFrame, preset);
      onUpdateFrame(updated);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6 p-4 sm:p-5 text-white font-mono select-none">
      {/* Category Filter Pills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#F5A623]" />
            Director Title Presets (10)
          </label>
          <span className="text-[9px] text-zinc-400">1-CLICK APPLY</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-black/50 border border-white/10 rounded-lg">
          {(['all', 'cinematic', 'rap', 'docu', 'retro'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#F5A623]/25 border border-[#F5A623] text-[#FFE066] shadow-[0_0_10px_rgba(245,166,35,0.3)]'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {cat === 'all' ? 'All (10)' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="space-y-3">
        {filteredPresets.map((preset) => {
          const isHovered = hoveredPresetId === preset.id;
          const isApplied = appliedPresetId === preset.id;

          return (
            <div
              key={preset.id}
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
              onClick={() => handleApply(preset)}
              className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md ${
                isApplied
                  ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[0.99]'
                  : isHovered
                  ? 'bg-[#151620] border-[#F5A623] shadow-[0_0_24px_rgba(245,166,35,0.25)] translate-y-[-1px]'
                  : 'bg-black/60 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Header: Name + Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-white group-hover:text-[#FFE066] transition-colors">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono">
                    {preset.position}
                  </span>
                  <span 
                    className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border"
                    style={{ 
                      backgroundColor: `${preset.color}15`, 
                      borderColor: `${preset.color}60`, 
                      color: preset.color 
                    }}
                  >
                    {preset.badge || preset.category}
                  </span>
                </div>
              </div>

              {/* Live Kinetic Typography Hover Preview Box */}
              <div 
                className="relative h-20 w-full rounded-lg bg-black/80 border border-white/5 flex flex-col items-center justify-center p-2 overflow-hidden transition-all duration-200 group-hover:bg-[#08080c]"
                style={{
                  boxShadow: isHovered ? `inset 0 0 20px ${preset.glowColor || 'rgba(245,166,35,0.2)'}` : 'none'
                }}
              >
                {/* Visual Position Bracket Indicators */}
                {preset.position === 'top' && (
                  <div className="absolute top-1 left-2 text-[8px] text-zinc-500 font-mono tracking-widest">
                    ▲ TOP_ALIGN
                  </div>
                )}
                {preset.position === 'lower-third' && (
                  <div className="absolute bottom-1 left-2 text-[8px] text-zinc-500 font-mono tracking-widest">
                    ▼ LOWER_THIRD
                  </div>
                )}

                {/* Primary Title with Live Style */}
                <div
                  className={`text-center font-bold transition-all duration-200 leading-tight ${
                    isHovered ? 'scale-105' : 'scale-100'
                  }`}
                  style={{
                    fontFamily: preset.fontFamily,
                    color: preset.color,
                    letterSpacing: preset.letterSpacing || 'normal',
                    textShadow: isHovered && preset.glowColor ? `0 0 16px ${preset.glowColor}` : '0 1px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  {preset.primaryText}
                </div>

                {/* Secondary Title / Subtitle */}
                {preset.secondaryText && (
                  <div
                    className="text-[9px] mt-1 text-center font-mono opacity-80 tracking-widest uppercase transition-opacity"
                    style={{ color: '#E4E4E7' }}
                  >
                    {preset.secondaryText}
                  </div>
                )}

                {/* Live Animation Indicator Badge */}
                <div className="absolute bottom-1 right-2 text-[8px] text-zinc-500 font-mono">
                  {preset.animationStyle}
                </div>
              </div>

              {/* Hover Quick Action Footer */}
              <div className="mt-2.5 flex items-center justify-between text-[9px] text-zinc-400">
                <span className="font-mono text-zinc-500">{preset.fontFamily.split(',')[0]}</span>
                <span className={`font-bold transition-colors ${isApplied ? 'text-emerald-400' : 'group-hover:text-[#F5A623]'}`}>
                  {isApplied ? '✓ APPLIED TO SHOT' : 'Click to Apply →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Fine-Tuning Sliders */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-[#F5A623]" />
            Fine-Tune Selected Typography
          </span>
          <span className="text-[9px] text-zinc-400 font-mono">0ms Sync</span>
        </div>

        {/* Title Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Font Scale</span>
            <span className="text-[#FFE066] font-mono">{titleConfig.titleSize}px</span>
          </div>
          <input
            type="range"
            min={24}
            max={120}
            step={2}
            value={titleConfig.titleSize}
            onChange={(e) => setTitleSize(Number(e.target.value))}
            className="w-full accent-[#F5A623] cursor-pointer"
          />
        </div>

        {/* Glow Intensity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Anamorphic Glow</span>
            <span className="text-[#FFE066] font-mono">{Math.round(titleConfig.glowIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.05}
            value={titleConfig.glowIntensity}
            onChange={(e) => setTitleGlowIntensity(Number(e.target.value))}
            className="w-full accent-[#F5A623] cursor-pointer"
          />
        </div>

        {/* Letter Tracking Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Letter Tracking</span>
            <span className="text-[#FFE066] font-mono">{titleConfig.tracking.toFixed(2)}em</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.02}
            value={titleConfig.tracking}
            onChange={(e) => setTitleTracking(Number(e.target.value))}
            className="w-full accent-[#F5A623] cursor-pointer"
          />
        </div>

        {/* Vertical Position Offset */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span>Vertical Offset</span>
            <span className="text-[#FFE066] font-mono">{titleConfig.verticalOffset}px</span>
          </div>
          <input
            type="range"
            min={-120}
            max={120}
            step={5}
            value={titleConfig.verticalOffset}
            onChange={(e) => setTitleVerticalOffset(Number(e.target.value))}
            className="w-full accent-[#F5A623] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
