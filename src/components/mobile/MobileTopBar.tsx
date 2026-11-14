/**
 * @file /src/components/mobile/MobileTopBar.tsx
 * @description Minimal 48px CapCut-style Mobile Portrait Top Bar (max 4 interactive items):
 * 1. HANDFILM compact badge (opens slide-over menu drawer)
 * 2. Project/Sequence selector pill (SC00 // SH02 — opens shot navigator / drawer)
 * 3. Quality/Ratio pill (2.39:1 / 9:16 / 16:9 — cycles aspect ratio)
 * 4. Primary EXPORT button
 */

import React from 'react';
import { Menu, ChevronDown, Download } from 'lucide-react';
import { AnthologyFrame, AspectRatio } from '../../types/anthology';

export interface MobileTopBarProps {
  currentIndex: number;
  currentFrame?: AnthologyFrame;
  aspectRatio: AspectRatio | string;
  onOpenMenu: () => void;
  onOpenShotPicker: () => void;
  onCycleAspectRatio: () => void;
  onOpenExport: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  currentIndex,
  currentFrame,
  aspectRatio,
  onOpenMenu,
  onOpenShotPicker,
  onCycleAspectRatio,
  onOpenExport
}) => {
  const sceneCode = currentFrame?.epNumber
    ? currentFrame.epNumber.replace(/^#/, '').slice(0, 2).padStart(2, '0')
    : String(Math.floor(currentIndex / 10)).padStart(2, '0');
  const shotCode = String(currentIndex + 1).padStart(2, '0');
  const ratioLabel = String(aspectRatio || '2.39:1');
  const isVertical = ratioLabel === '9:16';

  return (
    <header
      data-testid="mobile-top-bar"
      className="h-[48px] shrink-0 w-full bg-[#0B0B0D]/95 border-b border-white/[0.08] px-2.5 flex items-center justify-between gap-1.5 backdrop-blur-md z-40"
    >
      {/* Left: HANDFILM compact badge + Sequence/Shot selector pill */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open Studio Menu"
          className="min-h-[38px] px-2 rounded-md bg-[#141418] active:bg-[#1E1E24] border border-white/[0.1] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
        >
          <Menu className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
          <span className="font-mono font-black text-[10px] tracking-[0.14em] text-[#F4F4F5] whitespace-nowrap">
            HANDFILM
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenShotPicker}
          aria-label="Select Shot or Sequence"
          className="min-h-[38px] px-2 rounded-md bg-[#141418]/80 active:bg-[#1E1E24] border border-white/[0.07] flex items-center gap-1 min-w-0 transition-colors cursor-pointer"
        >
          <span className="font-mono font-bold text-[10px] tracking-wider text-[#D4D4D8] tabular-nums whitespace-nowrap truncate">
            SC{sceneCode} // SH{shotCode}
          </span>
          <ChevronDown className="w-3 h-3 text-[#8E8E93] shrink-0" />
        </button>
      </div>

      {/* Right: Ratio pill + Primary EXPORT CTA */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onCycleAspectRatio}
          aria-label="Cycle Aspect Ratio"
          className={`min-h-[38px] px-2.5 rounded-md border font-mono font-bold text-[10px] tracking-wider tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            isVertical
              ? 'bg-[#F59E0B]/15 border-[#F59E0B]/60 text-[#F59E0B]'
              : 'bg-[#141418] border-white/[0.1] text-[#E4E4E7] active:bg-[#1E1E24]'
          }`}
        >
          {ratioLabel}
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="min-h-[38px] px-3 rounded-md bg-[#F59E0B] active:bg-[#D97706] text-[#0B0B0D] font-mono font-black text-[10px] tracking-[0.12em] whitespace-nowrap shrink-0 flex items-center gap-1 shadow-[0_0_16px_rgba(245,158,11,0.3)] transition-colors cursor-pointer"
        >
          <Download className="w-3 h-3 stroke-[2.5]" />
          <span>EXPORT</span>
        </button>
      </div>
    </header>
  );
};
