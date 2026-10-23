/**
 * @file /src/components/controls/CadenceSelectorPill.tsx
 * @description Tactical In-Player Quick Cadence Selector Pill & Glassmorphic Rhythm Palette.
 * Supports quick presets (Rap Beat 1.5s, Shorts Pace 6.0s, Cinema Previz 12.0s, Docu Hold 30.0s)
 * and a Custom Micro-Stepper Wheel / Timecode Input (0.5s up to 30m / 00:30:00.00).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CADENCE_PRESETS,
  MIN_SHOT_DURATION_SEC,
  MAX_SHOT_DURATION_SEC,
  clampShotDuration,
  formatDurationPillValue,
  formatCustomDurationTimecode,
  getShotFrameCount,
  parseDurationInput
} from '../../types/storyboard';
import { Clock, ChevronDown, Repeat, Music, Minus, Plus, Check } from 'lucide-react';

export interface CadenceSelectorPillProps {
  durationSec: number;
  targetFps?: number;
  onChangeDuration: (newDurationSec: number) => void;
  onChangeTargetFps?: (fps: number) => void;
  onApplyDurationToAll?: (durationSec: number) => void;
  isSnapToBeat?: boolean;
  onToggleSnapToBeat?: () => void;
  compact?: boolean;
  className?: string;
}

export const CadenceSelectorPill: React.FC<CadenceSelectorPillProps> = ({
  durationSec,
  targetFps = 24,
  onChangeDuration,
  onChangeTargetFps,
  onApplyDurationToAll,
  isSnapToBeat = false,
  onToggleSnapToBeat,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [customInput, setCustomInput] = useState(() => formatCustomDurationTimecode(durationSec));
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: true
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const safeDuration = clampShotDuration(durationSec);
  const safeFps = targetFps === 60 ? 60 : 24;
  const activeFrames = getShotFrameCount(safeDuration, safeFps);

  // Sync custom input when external duration updates
  useEffect(() => {
    setCustomInput(formatCustomDurationTimecode(safeDuration));
  }, [safeDuration]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const paletteWidth = 304;
    const estimatedHeight = 390;
    const openUpward = rect.top > estimatedHeight || window.innerHeight - rect.bottom < estimatedHeight;

    const clampedLeft = Math.max(
      12,
      Math.min(window.innerWidth - paletteWidth - 12, rect.left + rect.width / 2 - paletteWidth / 2)
    );
    const top = openUpward ? Math.max(12, rect.top - 8) : rect.bottom + 8;

    setPopoverCoords({ top, left: clampedLeft, openUpward });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutsideClick = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const applyCustomValue = () => {
    const parsed = parseDurationInput(customInput, safeFps);
    if (parsed !== null) {
      onChangeDuration(parsed);
      setCustomInput(formatCustomDurationTimecode(parsed));
    } else {
      setCustomInput(formatCustomDurationTimecode(safeDuration));
    }
  };

  const stepDuration = (deltaSec: number) => {
    const next = clampShotDuration(safeDuration + deltaSec);
    onChangeDuration(next);
  };

  const handleWheelStep = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const step = e.shiftKey ? 1.0 : 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    stepDuration(direction * step);
  };

  const matchedPreset = CADENCE_PRESETS.find((p) => Math.abs(p.durationSec - safeDuration) < 0.02);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={`Elastic Shot Cadence: ${formatDurationPillValue(safeDuration)} (${activeFrames} frames @ ${safeFps}fps)`}
        className={`inline-flex items-center gap-1.5 rounded-full border font-mono tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
          compact ? 'px-2.5 py-0.5 text-[9.5px]' : 'px-3 py-1 text-[10px]'
        } ${
          isOpen
            ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#FFE066] shadow-[0_0_14px_rgba(245,166,35,0.3)]'
            : 'bg-[#12121A]/95 hover:bg-[#191924] border-white/15 hover:border-[#F5A623]/70 text-[#EDEDED]'
        } ${className}`}
      >
        <Clock className="w-3 h-3 text-[#F5A623] shrink-0" />
        <span className="text-white/55 font-semibold">DURATION:</span>
        <span className="text-[#FFE066] font-bold">{formatDurationPillValue(safeDuration)}</span>
        <ChevronDown
          className={`w-3 h-3 text-white/50 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#F5A623]' : ''}`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: `${popoverCoords.left}px`,
              top: `${popoverCoords.top}px`,
              transform: popoverCoords.openUpward ? 'translateY(-100%)' : 'none',
              width: '304px',
              zIndex: 9999
            }}
            className="bg-[#0B0B11]/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3 font-mono text-xs text-white select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F5A623]" />
                <span className="text-[10.5px] font-bold tracking-wide text-white/90">
                  Cadence & Shot Hold
                </span>
              </div>
              <div className="flex items-center gap-1 bg-black/70 border border-white/10 rounded-md p-0.5 text-[9.5px] tabular-nums">
                {[24, 60].map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    onClick={() => onChangeTargetFps?.(fpsVal)}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      safeFps === fpsVal
                        ? 'bg-[#F5A623] text-black font-bold'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {fpsVal}FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Rhythm Presets */}
            <div className="space-y-1">
              {CADENCE_PRESETS.map((preset) => {
                const isSelected = matchedPreset?.id === preset.id && !isCustomExpanded;
                const presetFrames = getShotFrameCount(preset.durationSec, safeFps);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setIsCustomExpanded(false);
                      onChangeDuration(preset.durationSec);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg border text-left transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#F5A623]/15 border-[#F5A623] text-[#FFE066]'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/85'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold whitespace-nowrap">
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                        <span className="text-[#F5A623] tabular-nums">
                          ({preset.durationSec.toFixed(1)}s / {presetFrames}F)
                        </span>
                      </div>
                      <p className="text-[9.5px] text-white/45 truncate mt-0.5 font-sans">
                        {preset.subtitle}
                      </p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />}
                  </button>
                );
              })}

              {/* Custom Stepper / Manual Timecode */}
              <div
                onWheel={handleWheelStep}
                className={`rounded-lg border p-2.5 transition-colors ${
                  !matchedPreset || isCustomExpanded
                    ? 'bg-[#F5A623]/10 border-[#F5A623]/80'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsCustomExpanded((v) => !v)}
                  className="w-full flex items-center justify-between text-[10.5px] font-bold text-white/90 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#F5A623]">∞</span>
                    <span>CUSTOM</span>
                    <span className="text-[9.5px] text-white/45 font-normal">
                      (Wheel / Timecode)
                    </span>
                  </span>
                  <span className="text-[#FFE066] tabular-nums">
                    {safeDuration.toFixed(2)}s · {activeFrames}F
                  </span>
                </button>

                <div className="mt-2 space-y-2">
                  {/* Micro-stepper wheel controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => stepDuration(-1.0)}
                      disabled={safeDuration <= MIN_SHOT_DURATION_SEC}
                      className="px-2 py-1 rounded bg-black/60 hover:bg-black border border-white/10 text-[9.5px] text-white/75 hover:text-white disabled:opacity-35 cursor-pointer tabular-nums"
                      title="Decrease by 1.0s"
                    >
                      -1.0s
                    </button>
                    <button
                      type="button"
                      onClick={() => stepDuration(-0.1)}
                      disabled={safeDuration <= MIN_SHOT_DURATION_SEC}
                      className="p-1 rounded bg-black/60 hover:bg-black border border-white/10 text-white/75 hover:text-white disabled:opacity-35 cursor-pointer"
                      title="Decrease by 0.1s"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="text"
                      value={customInput}
                      onFocus={() => setIsCustomExpanded(true)}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onBlur={applyCustomValue}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyCustomValue();
                        }
                      }}
                      placeholder="00:01:45.00"
                      title="Enter seconds (e.g. 2.5s, 45) or timecode (00:01:45.00). Scroll wheel to micro-step."
                      className="flex-1 min-w-0 bg-black/80 border border-white/20 focus:border-[#F5A623] rounded px-2 py-1 text-center text-[10.5px] text-[#FFE066] font-mono tabular-nums outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => stepDuration(0.1)}
                      disabled={safeDuration >= MAX_SHOT_DURATION_SEC}
                      className="p-1 rounded bg-black/60 hover:bg-black border border-white/10 text-white/75 hover:text-white disabled:opacity-35 cursor-pointer"
                      title="Increase by 0.1s"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepDuration(1.0)}
                      disabled={safeDuration >= MAX_SHOT_DURATION_SEC}
                      className="px-2 py-1 rounded bg-black/60 hover:bg-black border border-white/10 text-[9.5px] text-white/75 hover:text-white disabled:opacity-35 cursor-pointer tabular-nums"
                      title="Increase by 1.0s"
                    >
                      +1.0s
                    </button>
                  </div>

                  {/* Quick extreme anchors (0.5s staccato .. 30m docu) */}
                  <div className="flex items-center justify-between gap-1 text-[9px] text-white/55 tabular-nums">
                    {[
                      { label: '0.5s', val: 0.5 },
                      { label: '2.5s', val: 2.5 },
                      { label: '45s', val: 45.0 },
                      { label: '3m', val: 180.0 },
                      { label: '30m', val: 1800.0 }
                    ].map((anchor) => (
                      <button
                        key={anchor.label}
                        type="button"
                        onClick={() => onChangeDuration(anchor.val)}
                        className="flex-1 py-0.5 rounded bg-black/50 hover:bg-white/10 border border-white/10 hover:text-[#FFE066] transition-colors cursor-pointer"
                      >
                        {anchor.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions: Snap to Beats & Ripple Apply */}
            {(onToggleSnapToBeat || onApplyDurationToAll) && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col gap-1.5">
                {onToggleSnapToBeat && (
                  <button
                    type="button"
                    onClick={onToggleSnapToBeat}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSnapToBeat
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-white/70'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-cyan-400" />
                      <span>SNAP CUTS TO BEATS</span>
                    </span>
                    <span className="text-[9px] tabular-nums">{isSnapToBeat ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {onApplyDurationToAll && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyDurationToAll(safeDuration);
                      setIsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#F5A623]/15 hover:bg-[#F5A623]/25 border border-[#F5A623]/60 text-[#FFE066] text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Repeat className="w-3 h-3" />
                    <span>Ripple Apply {formatDurationPillValue(safeDuration)} to All</span>
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
