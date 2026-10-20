/**
 * @file /src/components/stage/TactileSnapGuide.tsx
 * @description Magnetic Snap Alignment Guides & Distance Overlays for Bloom Interactive Canvas.
 */

import React from 'react';
import { TactileSnapGuideLine } from '../../types/bloom';

interface TactileSnapGuideProps {
  guides: TactileSnapGuideLine[];
  zoom: number;
}

export const TactileSnapGuide: React.FC<TactileSnapGuideProps> = ({ guides, zoom }) => {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {guides.map((g) => {
        if (g.orientation === 'vertical') {
          return (
            <div
              key={g.id}
              className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center"
              style={{ left: `${g.coordinate}px` }}
            >
              {/* Tactical Crimson Alignment Laser Line */}
              <div className="w-[1.5px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />

              {/* Distance & Magnetic Snap Badge */}
              <div className="absolute top-6 -translate-x-1/2 bg-[#0B0B0F]/95 border border-rose-500/80 px-2 py-0.5 rounded-xs text-[8px] font-mono font-bold text-rose-300 shadow-xl whitespace-nowrap flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>SNAP {g.label || `${Math.round(g.coordinate)}px`}</span>
              </div>
            </div>
          );
        } else {
          return (
            <div
              key={g.id}
              className="absolute left-0 right-0 pointer-events-none flex items-center"
              style={{ top: `${g.coordinate}px` }}
            >
              {/* Tactical Horizontal Alignment Laser Line */}
              <div className="h-[1.5px] w-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse" />

              {/* Distance & Magnetic Snap Badge */}
              <div className="absolute left-6 -translate-y-1/2 bg-[#0B0B0F]/95 border border-rose-500/80 px-2 py-0.5 rounded-xs text-[8px] font-mono font-bold text-rose-300 shadow-xl whitespace-nowrap flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>SNAP {g.label || `${Math.round(g.coordinate)}px`}</span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};
