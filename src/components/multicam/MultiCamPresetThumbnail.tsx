/**
 * @file /src/components/multicam/MultiCamPresetThumbnail.tsx
 * @description Dynamic visual thumbnail preview component for MultiCam grid presets (1x1, 1x3, 2x2).
 * Displays live camera angle frames, camera badges, and golden focus indicators for each layout preset.
 */

import React from 'react';
import { MultiCamGridConfig } from './MultiCamViewportGrid';
import { MultiCamAngle } from '../../types/multicam';
import { samplePacks } from '../../data/frames';

export interface MultiCamPresetThumbnailProps {
  config: MultiCamGridConfig;
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  angles?: MultiCamAngle[];
  activeAngleIdx?: number;
}

// Default fallback camera angles with rich cinematic frames
const DEFAULT_PREVIEW_ANGLES: MultiCamAngle[] = [
  {
    id: 'thumb-ang-1',
    mediaId: 'm1',
    label: 'CAM 01',
    name: 'Wide Master 35mm',
    blobUrl: samplePacks.cyberNoir?.[0] || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    aspectRatio: 9 / 16,
    syncOffsetMs: 0
  },
  {
    id: 'thumb-ang-2',
    mediaId: 'm2',
    label: 'CAM 02',
    name: 'Medium Punch 50mm',
    blobUrl: samplePacks.cosmicMacro?.[1] || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    aspectRatio: 9 / 16,
    syncOffsetMs: 0
  },
  {
    id: 'thumb-ang-3',
    mediaId: 'm3',
    label: 'CAM 03',
    name: 'Close-Up 85mm',
    blobUrl: samplePacks.liquidGold?.[2] || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    aspectRatio: 9 / 16,
    syncOffsetMs: 0
  },
  {
    id: 'thumb-ang-4',
    mediaId: 'm4',
    label: 'CAM 04',
    name: 'Low-Angle 24mm',
    blobUrl: samplePacks.cyberNoir?.[3] || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    aspectRatio: 9 / 16,
    syncOffsetMs: 0
  }
];

export const MultiCamPresetThumbnail: React.FC<MultiCamPresetThumbnailProps> = ({
  config,
  isActive = false,
  size = 'md',
  className = '',
  angles,
  activeAngleIdx = 0
}) => {
  // Resolve angles array with robust fallbacks
  const effectiveAngles = (angles && angles.length > 0) ? angles : DEFAULT_PREVIEW_ANGLES;
  const safeActiveIdx = Math.max(0, Math.min(activeAngleIdx, effectiveAngles.length - 1));
  const activeAngle = effectiveAngles[safeActiveIdx] || effectiveAngles[0] || DEFAULT_PREVIEW_ANGLES[0];

  // Helper to render miniature angle image frame
  const renderAngleFrame = (angle: MultiCamAngle, labelText: string, isFocusAngle: boolean, isCompact: boolean = false) => {
    return (
      <div className="relative w-full h-full bg-[#0a0a0f] overflow-hidden flex items-center justify-center">
        {angle.blobUrl ? (
          <img
            src={angle.blobUrl}
            alt={angle.label || labelText}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        ) : null}

        {/* Subtle dark gradient scrim for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40 pointer-events-none" />

        {/* Viewfinder corner brackets for focus angle */}
        {isFocusAngle && !isCompact && (
          <div className="absolute inset-1 pointer-events-none z-10">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#FFE066]" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#FFE066]" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#FFE066]" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#FFE066]" />
          </div>
        )}

        {/* Camera Label Badge */}
        {!isCompact && (
          <div className="absolute top-1 left-1 z-10 flex items-center gap-1 pointer-events-none">
            <span className={`px-1 py-0.2 rounded font-mono text-[7.5px] font-black leading-tight ${
              isFocusAngle 
                ? 'bg-[#FFE066] text-black shadow-[0_0_6px_rgba(255,224,102,0.8)]' 
                : 'bg-black/80 text-white/90 border border-white/20'
            }`}>
              {labelText}
            </span>
          </div>
        )}

        {/* Focus Active Indicator */}
        {isFocusAngle && !isCompact && (
          <div className="absolute bottom-1 right-1 z-10 pointer-events-none flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFE066] animate-ping" />
            <span className="px-1 py-0.2 rounded bg-amber-500/90 text-black font-mono font-black text-[6.5px] tracking-tight uppercase">
              FOCUS
            </span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 1. CONFIGURATION: 1x1 SOLO MONITOR PREVIEW
  // =========================================================================
  if (config === '1x1') {
    if (size === 'sm') {
      return (
        <div
          className={`relative w-6 h-4.5 rounded-[4px] border overflow-hidden transition-all ${
            isActive
              ? 'border-[#FFE066] shadow-[0_0_8px_rgba(255,224,102,0.5)] ring-1 ring-[#FFE066]'
              : 'border-white/20 bg-neutral-900'
          } ${className}`}
          title="1x1 Solo Layout Preview"
        >
          {activeAngle.blobUrl ? (
            <img src={activeAngle.blobUrl} alt="1x1" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${isActive ? 'bg-[#FFE066]' : 'bg-white/40'}`} />
          )}
        </div>
      );
    }

    if (size === 'md') {
      return (
        <div
          className={`relative w-12 h-8 rounded-lg border-2 overflow-hidden transition-all ${
            isActive
              ? 'border-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.6)] ring-1 ring-[#FFE066]'
              : 'border-white/20 hover:border-amber-400/50'
          } ${className}`}
          title="1x1 Solo Layout Preview"
        >
          {renderAngleFrame(activeAngle, `CAM 0${safeActiveIdx + 1}`, true, false)}
        </div>
      );
    }

    // size === 'lg' (Used in Grid Selection Menu cards)
    return (
      <div
        className={`relative w-full max-w-[240px] h-32 rounded-xl border-2 overflow-hidden transition-all ${
          isActive
            ? 'border-[#FFE066] animate-gold-focus-border shadow-[0_0_24px_rgba(255,224,102,0.4)] ring-2 ring-[#FFE066]/60'
            : 'border-white/25 hover:border-amber-400/60 shadow-lg'
        } ${className}`}
        title="1x1 Solo Layout: 100% Program Inspection"
      >
        {renderAngleFrame(activeAngle, activeAngle.label || `CAM 0${safeActiveIdx + 1}`, true, false)}

        {/* Solo Telemetry HUD Overlays */}
        <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-black/85 border border-[#FFE066]/50 text-[#FFE066] font-mono font-bold text-[8px] tracking-wider uppercase">
            100% SOLO PGM
          </span>
        </div>

        {/* Center Optical Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 z-10">
          <div className="w-5 h-px bg-[#FFE066]" />
          <div className="h-5 w-px bg-[#FFE066] -ml-2.5" />
        </div>

        <div className="absolute bottom-1.5 left-1.5 z-10 pointer-events-none">
          <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-neutral-300 font-mono text-[8px] truncate max-w-[150px] inline-block border border-white/10">
            {activeAngle.name || 'Full-Bleed Master View'}
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. CONFIGURATION: 1x3 DIRECTOR SPLIT PREVIEW
  // =========================================================================
  if (config === '1x3') {
    // Secondary angles list (up to 3 companion angles)
    const secondaryAngles = effectiveAngles.filter((_, idx) => idx !== safeActiveIdx);
    const companionList = secondaryAngles.length >= 3 
      ? secondaryAngles.slice(0, 3) 
      : [...secondaryAngles, ...effectiveAngles].slice(0, 3);

    if (size === 'sm') {
      return (
        <div
          className={`relative w-6 h-4.5 rounded-[4px] border flex p-0.5 gap-0.5 overflow-hidden transition-all ${
            isActive
              ? 'border-[#FFE066] shadow-[0_0_8px_rgba(255,224,102,0.5)] ring-1 ring-[#FFE066]'
              : 'border-white/20 bg-neutral-900'
          } ${className}`}
          title="1x3 Director Layout Preview"
        >
          {/* Dominant 65% hero */}
          <div className={`w-[65%] h-full rounded-[2px] overflow-hidden ${isActive ? 'bg-[#FFE066]' : 'bg-white/50'}`}>
            {activeAngle.blobUrl && (
              <img src={activeAngle.blobUrl} alt="1x3 Hero" className="w-full h-full object-cover" />
            )}
          </div>
          {/* 35% stacked companions */}
          <div className="w-[35%] h-full flex flex-col justify-between gap-0.5">
            <div className={`w-full flex-1 rounded-[1px] ${isActive ? 'bg-[#FFE066]/60' : 'bg-white/30'}`} />
            <div className={`w-full flex-1 rounded-[1px] ${isActive ? 'bg-[#FFE066]/60' : 'bg-white/30'}`} />
            <div className={`w-full flex-1 rounded-[1px] ${isActive ? 'bg-[#FFE066]/60' : 'bg-white/30'}`} />
          </div>
        </div>
      );
    }

    if (size === 'md') {
      return (
        <div
          className={`relative w-12 h-8 rounded-lg border-2 p-0.5 flex gap-1 overflow-hidden transition-all ${
            isActive
              ? 'border-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.6)] ring-1 ring-[#FFE066]'
              : 'border-white/20 hover:border-amber-400/50'
          } ${className}`}
          title="1x3 Director Layout Preview"
        >
          <div className="w-[65%] h-full rounded border border-[#FFE066] overflow-hidden">
            {renderAngleFrame(activeAngle, `CAM 0${safeActiveIdx + 1}`, true, true)}
          </div>
          <div className="w-[35%] h-full flex flex-col gap-0.5">
            {companionList.map((comp, idx) => (
              <div key={comp.id || idx} className="w-full flex-1 rounded border border-white/15 overflow-hidden">
                {renderAngleFrame(comp, `C0${idx + 2}`, false, true)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // size === 'lg' (Used in Grid Selection Menu cards)
    return (
      <div
        className={`relative w-full max-w-[240px] h-32 rounded-xl border-2 p-1.5 flex gap-1.5 overflow-hidden transition-all ${
          isActive
            ? 'border-[#FFE066] animate-gold-focus-border shadow-[0_0_24px_rgba(255,224,102,0.4)] ring-2 ring-[#FFE066]/60'
            : 'border-white/25 hover:border-amber-400/60 shadow-lg'
        } ${className}`}
        title="1x3 Director Layout: Hero Master + 3 Synchronized Feeds"
      >
        {/* Dominant Hero Master Camera Cell (66% width) */}
        <div className="w-[66%] h-full rounded-lg border-2 border-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.5)] overflow-hidden relative">
          {renderAngleFrame(activeAngle, `HERO CAM 0${safeActiveIdx + 1}`, true, false)}
          <div className="absolute bottom-1 left-1 z-10 pointer-events-none">
            <span className="px-1 py-0.2 rounded bg-black/85 text-[#FFE066] font-mono font-bold text-[7px] border border-[#FFE066]/40 uppercase">
              MASTER (68%)
            </span>
          </div>
        </div>

        {/* 3 Secondary Stacked Companion Camera Cells (34% width) */}
        <div className="w-[34%] h-full flex flex-col justify-between gap-1">
          {companionList.map((comp, idx) => (
            <div
              key={comp.id || idx}
              className="w-full flex-1 rounded-md border border-white/20 hover:border-amber-400/40 overflow-hidden relative"
            >
              {renderAngleFrame(comp, comp.label ? comp.label.slice(0, 6) : `CAM 0${idx + 2}`, false, false)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. CONFIGURATION: 2x2 QUAD GRID PREVIEW
  // =========================================================================
  // 4 Quadrants
  const quadAngles = effectiveAngles.slice(0, 4);
  while (quadAngles.length < 4) {
    quadAngles.push(DEFAULT_PREVIEW_ANGLES[quadAngles.length]);
  }

  if (size === 'sm') {
    return (
      <div
        className={`relative w-6 h-4.5 rounded-[4px] border grid grid-cols-2 grid-rows-2 p-0.5 gap-0.5 overflow-hidden transition-all ${
          isActive
            ? 'border-[#FFE066] shadow-[0_0_8px_rgba(255,224,102,0.5)] ring-1 ring-[#FFE066]'
            : 'border-white/20 bg-neutral-900'
        } ${className}`}
        title="2x2 Quad Grid Layout Preview"
      >
        {[0, 1, 2, 3].map((idx) => {
          const isSelected = idx === safeActiveIdx;
          return (
            <div
              key={idx}
              className={`w-full h-full rounded-[1px] ${
                isSelected ? 'bg-[#FFE066]' : isActive ? 'bg-[#FFE066]/40' : 'bg-white/30'
              }`}
            />
          );
        })}
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div
        className={`relative w-12 h-8 rounded-lg border-2 p-0.5 grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden transition-all ${
          isActive
            ? 'border-[#FFE066] shadow-[0_0_12px_rgba(255,224,102,0.6)] ring-1 ring-[#FFE066]'
            : 'border-white/20 hover:border-amber-400/50'
        } ${className}`}
        title="2x2 Quad Grid Layout Preview"
      >
        {quadAngles.map((ang, idx) => {
          const isSelected = idx === safeActiveIdx;
          return (
            <div
              key={ang.id || idx}
              className={`w-full h-full rounded overflow-hidden border ${
                isSelected ? 'border-[#FFE066]' : 'border-white/10'
              }`}
            >
              {renderAngleFrame(ang, `0${idx + 1}`, isSelected, true)}
            </div>
          );
        })}
      </div>
    );
  }

  // size === 'lg' (Used in Grid Selection Menu cards)
  return (
    <div
      className={`relative w-full max-w-[240px] h-32 rounded-xl border-2 p-1.5 grid grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden transition-all ${
        isActive
          ? 'border-[#FFE066] animate-gold-focus-border shadow-[0_0_24px_rgba(255,224,102,0.4)] ring-2 ring-[#FFE066]/60'
          : 'border-white/25 hover:border-amber-400/60 shadow-lg'
      } ${className}`}
      title="2x2 Quad Grid: 4-Quadrant Synchronized Angle Matrix"
    >
      {quadAngles.map((ang, idx) => {
        const isSelected = idx === safeActiveIdx;
        return (
          <div
            key={ang.id || idx}
            className={`w-full h-full rounded-lg overflow-hidden border-2 relative transition-all ${
              isSelected
                ? 'border-[#FFE066] shadow-[0_0_14px_rgba(255,224,102,0.7)] ring-1 ring-[#FFE066] z-10 scale-[1.02]'
                : 'border-white/15 hover:border-amber-400/40 opacity-80'
            }`}
          >
            {renderAngleFrame(ang, ang.label || `CAM 0${idx + 1}`, isSelected, false)}
          </div>
        );
      })}
    </div>
  );
};
