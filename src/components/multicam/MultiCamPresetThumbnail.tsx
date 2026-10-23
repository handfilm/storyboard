/**
 * @file /src/components/multicam/MultiCamPresetThumbnail.tsx
 * @description Visual thumbnail preview component for MultiCam grid presets (1x1, 1x3, 2x2).
 * Provides high-contrast, scalable visual representations of camera layout geometries.
 */

import React from 'react';
import { MultiCamGridConfig } from './MultiCamViewportGrid';

export interface MultiCamPresetThumbnailProps {
  config: MultiCamGridConfig;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MultiCamPresetThumbnail: React.FC<MultiCamPresetThumbnailProps> = ({
  config,
  isActive = false,
  size = 'md',
  className = ''
}) => {
  // Dimension tokens based on size
  const sizeStyles = {
    sm: 'w-6 h-4.5 p-0.5 rounded-[4px] gap-0.5',
    md: 'w-10 h-7 p-1 rounded-md gap-0.5',
    lg: 'w-28 h-18 p-1.5 rounded-xl gap-1'
  }[size];

  const cellBorderActive = 'border-[#FFE066] bg-[#FFE066]/20 text-[#FFE066]';
  const cellBorderInactive = 'border-white/15 bg-white/5 text-neutral-400';

  if (config === '1x1') {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-[#07080B] border transition-all ${
          isActive
            ? 'border-[#FFE066] shadow-[0_0_10px_rgba(255,224,102,0.35)] ring-1 ring-[#FFE066]/50'
            : 'border-white/20 group-hover:border-white/40'
        } ${sizeStyles} ${className}`}
        title="1x1 Solo Layout Preview"
      >
        {/* Full Single Cell */}
        <div
          className={`w-full h-full rounded-[2px] border flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
            isActive ? cellBorderActive : cellBorderInactive
          }`}
        >
          {size === 'lg' ? (
            <>
              {/* Focus Reticles */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-[#FFE066]" />
              <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-[#FFE066]" />
              <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-[#FFE066]" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-[#FFE066]" />
              <span className="font-mono text-[9px] font-black tracking-wider text-[#FFE066]">
                CAM 01 · SOLO
              </span>
              <span className="text-[7px] text-neutral-400 font-mono mt-0.5">
                FULL 100% PROGRAM
              </span>
            </>
          ) : size === 'md' ? (
            <span className="font-mono text-[7px] font-black tracking-wider text-amber-300">
              1x1
            </span>
          ) : (
            <div className={`w-full h-full rounded-[1px] ${isActive ? 'bg-[#FFE066]' : 'bg-white/40'}`} />
          )}
        </div>
      </div>
    );
  }

  if (config === '1x3') {
    return (
      <div
        className={`relative flex bg-[#07080B] border transition-all ${
          isActive
            ? 'border-[#FFE066] shadow-[0_0_10px_rgba(255,224,102,0.35)] ring-1 ring-[#FFE066]/50'
            : 'border-white/20 group-hover:border-white/40'
        } ${sizeStyles} ${className}`}
        title="1x3 Director Layout Preview"
      >
        {/* Dominant Hero Left Cell (68% width) */}
        <div
          className={`h-full w-[65%] rounded-[2px] border flex flex-col items-center justify-center relative overflow-hidden transition-colors ${
            isActive ? cellBorderActive : cellBorderInactive
          }`}
        >
          {size === 'lg' ? (
            <>
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-[#FFE066]" />
              <span className="font-mono text-[8px] font-black tracking-wider text-[#FFE066]">
                HERO PGM
              </span>
              <span className="text-[6.5px] text-amber-300/80 font-mono">
                CAM 01
              </span>
            </>
          ) : size === 'md' ? (
            <span className="font-mono text-[6.5px] font-black text-amber-300">
              HERO
            </span>
          ) : (
            <div className={`w-full h-full rounded-[1px] ${isActive ? 'bg-[#FFE066]' : 'bg-white/50'}`} />
          )}
        </div>

        {/* 3 Secondary Stacked Right Cells (35% width) */}
        <div className="h-full w-[35%] flex flex-col justify-between gap-0.5">
          {[2, 3, 4].map(camNum => (
            <div
              key={camNum}
              className={`w-full flex-1 rounded-[1.5px] border flex items-center justify-center overflow-hidden transition-colors ${
                isActive ? 'border-[#FFE066]/40 bg-[#FFE066]/10 text-amber-300' : 'border-white/15 bg-white/5 text-neutral-400'
              }`}
            >
              {size === 'lg' ? (
                <span className="font-mono text-[6.5px] font-bold">
                  C0{camNum}
                </span>
              ) : (
                <div className={`w-full h-full ${isActive ? 'bg-[#FFE066]/60' : 'bg-white/25'}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2x2 QUAD GRID
  return (
    <div
      className={`relative grid grid-cols-2 grid-rows-2 bg-[#07080B] border transition-all ${
        isActive
          ? 'border-[#FFE066] shadow-[0_0_10px_rgba(255,224,102,0.35)] ring-1 ring-[#FFE066]/50'
          : 'border-white/20 group-hover:border-white/40'
      } ${sizeStyles} ${className}`}
      title="2x2 Quad Grid Layout Preview"
    >
      {[1, 2, 3, 4].map(idx => {
        const isQuadActive = idx === 1;
        return (
          <div
            key={idx}
            className={`w-full h-full rounded-[1.5px] border flex items-center justify-center overflow-hidden transition-colors ${
              isActive && isQuadActive
                ? cellBorderActive
                : isActive
                ? 'border-[#FFE066]/30 bg-[#FFE066]/10 text-amber-300'
                : cellBorderInactive
            }`}
          >
            {size === 'lg' ? (
              <span className="font-mono text-[7px] font-black">
                CAM {idx}
              </span>
            ) : size === 'md' ? (
              <span className="font-mono text-[6px] font-bold">
                {idx}
              </span>
            ) : (
              <div className={`w-full h-full rounded-[0.5px] ${isActive ? (isQuadActive ? 'bg-[#FFE066]' : 'bg-[#FFE066]/40') : 'bg-white/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};
