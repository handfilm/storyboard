/**
 * @file /src/components/LensStressHeatmapOverlay.tsx
 * @description Real-Time Optical 'Lens Stress' Heatmap Simulation Overlay.
 * 
 * Simulates:
 * - Chromatic aberration (lateral/transverse color fringing dispersion hotspots in corners)
 * - Radial geometric distortion (barrel curve for wide-angle, pincushion for telephoto)
 * - Coma and astigmatism stress gradients from optical axis (r=0) to gate perimeter (r=1)
 * - Cosine fourth-law optical vignetting and peripheral MTF degradation
 * - Dynamic radar sweep and animated corner probe reticles
 */

import React, { useMemo } from 'react';
import { Activity, Flame, Eye, Sparkles, AlertTriangle, ShieldCheck, Crosshair } from 'lucide-react';

export type HeatmapMode = 'composite' | 'chromatic' | 'distortion' | 'thermal';

export interface LensStressHeatmapOverlayProps {
  focalLengthMm: number;
  apertureN: number;
  aspectRatio?: string;
  isVisible: boolean;
  mode: HeatmapMode;
  opacity?: number;
  className?: string;
}

export const LensStressHeatmapOverlay: React.FC<LensStressHeatmapOverlayProps> = ({
  focalLengthMm,
  apertureN,
  aspectRatio = '2.39:1',
  isVisible,
  mode = 'composite',
  opacity = 0.85,
  className = ''
}) => {
  // Real-time Optical Physics & Aberration Stress Calculations
  const metrics = useMemo(() => {
    const f = Math.max(10, focalLengthMm);
    const N = Math.max(0.7, apertureN);

    // 1. Radial Geometric Distortion (%):
    // Wide angle (<40mm) creates barrel distortion (-), telephoto (>60mm) creates pincushion (+)
    let distortionPercent = 0;
    let distortionType: 'BARREL' | 'NEUTRAL' | 'PINCUSHION' = 'NEUTRAL';
    if (f < 45) {
      distortionPercent = -parseFloat((Math.pow((45 - f) / 45, 1.35) * 4.6).toFixed(2));
      distortionType = 'BARREL';
    } else if (f > 65) {
      distortionPercent = parseFloat((Math.pow((f - 65) / 85, 1.1) * 2.8).toFixed(2));
      distortionType = 'PINCUSHION';
    } else {
      distortionPercent = parseFloat(((50 - f) * 0.02).toFixed(2));
      distortionType = 'NEUTRAL';
    }

    // 2. Lateral Chromatic Aberration (µm dispersion at outer frame radius):
    // Higher with wide angles and wide apertures
    const caFactor = Math.pow(45 / f, 0.75) * Math.pow(2.0 / N, 0.55);
    const lateralCAUm = parseFloat((Math.min(8.5, Math.max(0.6, caFactor * 2.65))).toFixed(2));

    // 3. Tangential Coma & Astigmatism (Wavefront Error λ):
    const comaErrorLambda = parseFloat((Math.max(0.15, (2.8 / N) * Math.pow(35 / f, 0.4) * 0.48)).toFixed(2));

    // 4. Peripheral Illuminance Falloff (Cosine Fourth Law):
    const halfDiagAngleRad = Math.atan(21.6 / f); // 21.6mm = half diagonal of 36x24 sensor
    const falloffCos4 = Math.pow(Math.cos(halfDiagAngleRad), 4);
    const peripheralVignettePct = Math.min(65, Math.round((1 - falloffCos4) * 100 * (1.8 / Math.max(1.4, N))));

    // 5. Composite Lens Stress Score (0 - 100%):
    // Wide open apertures (f/1.2-1.4) + ultra-wide lenses (14-24mm) generate highest stress
    const apertureStress = N < 2.0 ? ((2.0 - N) / 1.0) * 45 : N > 11 ? ((N - 11) / 11) * 35 : 5;
    const focalStress = f < 28 ? ((28 - f) / 18) * 35 : f > 85 ? ((f - 85) / 85) * 25 : 5;
    const rawStress = Math.round(18 + apertureStress + focalStress + Math.abs(distortionPercent) * 4);
    const overallScore = Math.min(98, Math.max(12, rawStress));

    // Stress Tier Label & Color Tone
    let tier: { label: string; color: string; badgeBg: string; status: string } = {
      label: 'OPTIMAL MTF',
      color: '#34d399', // Emerald
      badgeBg: 'rgba(52, 211, 153, 0.15)',
      status: 'DIFFRACTION-FREE'
    };

    if (overallScore >= 78) {
      tier = {
        label: 'CRITICAL STRESS',
        color: '#f43f5e', // Rose/Crimson
        badgeBg: 'rgba(244, 63, 94, 0.25)',
        status: 'HIGH DISPERSION & COMA'
      };
    } else if (overallScore >= 55) {
      tier = {
        label: 'ELEVATED STRESS',
        color: '#f97316', // Orange
        badgeBg: 'rgba(249, 115, 22, 0.2)',
        status: 'CORNER FALLOFF DETECTED'
      };
    } else if (overallScore >= 35) {
      tier = {
        label: 'MODERATE STRESS',
        color: '#eab308', // Amber/Yellow
        badgeBg: 'rgba(234, 179, 8, 0.18)',
        status: 'MARGINAL ABERRATION'
      };
    }

    return {
      f,
      N,
      distortionPercent,
      distortionType,
      lateralCAUm,
      comaErrorLambda,
      peripheralVignettePct,
      overallScore,
      tier
    };
  }, [focalLengthMm, apertureN]);

  if (!isVisible) return null;

  return (
    <div 
      id="lens-stress-heatmap"
      data-testid="lens-stress-heatmap"
      className={`absolute inset-0 pointer-events-none z-[25] overflow-hidden select-none transition-opacity duration-300 ${className}`}
      style={{ opacity }}
    >
      {/* ========================================================================= */}
      {/* 1. SPECTRAL HEATMAP GRADIENT LAYER (Mode-specific)                        */}
      {/* ========================================================================= */}
      {mode === 'thermal' && (
        <div 
          className="absolute inset-0 mix-blend-screen opacity-70 animate-stress-wave"
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(16,185,129,0.05) 0%, rgba(6,182,212,0.18) 35%, rgba(245,158,11,0.45) 70%, rgba(239,68,68,${0.35 + metrics.overallScore * 0.005}) 95%)`
          }}
        />
      )}

      {mode === 'chromatic' && (
        <div className="absolute inset-0 mix-blend-screen opacity-75">
          {/* Cyan / Magenta Lateral Color Fringing in Outer Perimeter */}
          <div 
            className="absolute inset-0 animate-chromatic-shift"
            style={{
              background: `radial-gradient(ellipse at center, transparent 38%, rgba(6,182,212,0.2) 65%, rgba(236,72,153,0.5) 88%, rgba(255,0,80,${0.4 + metrics.lateralCAUm * 0.05}) 100%)`
            }}
          />
        </div>
      )}

      {mode === 'distortion' && (
        <div 
          className="absolute inset-0 mix-blend-screen opacity-65"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 40%, rgba(212,175,55,0.15) 72%, rgba(255,140,0,0.5) 100%)`
          }}
        />
      )}

      {mode === 'composite' && (
        <>
          {/* Ambient Multi-Phase Stress Falloff */}
          <div 
            className="absolute inset-0 mix-blend-screen animate-hud-pulse"
            style={{
              background: `radial-gradient(ellipse at center, transparent 30%, rgba(14,165,233,0.12) 55%, rgba(245,158,11,0.3) 80%, rgba(239,68,68,${0.35 + metrics.overallScore * 0.004}) 100%)`
            }}
          />
          {/* 4 Extreme Corner Flare Hotspots */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-rose-600/35 rounded-full blur-2xl animate-stress-wave" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-600/35 rounded-full blur-2xl animate-stress-wave" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-600/35 rounded-full blur-2xl animate-stress-wave" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rose-600/35 rounded-full blur-2xl animate-stress-wave" />
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. SVG VECTOR FIELD: ISO-STRESS CONTOURS & RADIAL DISTORTION WARP GRID    */}
      {/* ========================================================================= */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <radialGradient id="stressIsoGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
          </radialGradient>

          <pattern id="stressGridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.75" />
          </pattern>
        </defs>

        {/* Base Calibration Grid */}
        <rect width="1000" height="600" fill="url(#stressGridPattern)" opacity={0.6} />

        {/* Concentric Iso-Stress Ellipses */}
        <ellipse 
          cx="500" 
          cy="300" 
          rx="180" 
          ry="110" 
          fill="none" 
          stroke="#10b981" 
          strokeWidth="1" 
          strokeDasharray="4 4" 
          opacity="0.45"
        />
        <ellipse 
          cx="500" 
          cy="300" 
          rx="320" 
          ry="195" 
          fill="none" 
          stroke="#06b6d4" 
          strokeWidth="1.2" 
          strokeDasharray="6 3" 
          opacity="0.6"
        />
        <ellipse 
          cx="500" 
          cy="300" 
          rx="440" 
          ry="265" 
          fill="none" 
          stroke="#f59e0b" 
          strokeWidth="1.5" 
          strokeDasharray="8 4" 
          opacity="0.75" 
          className="animate-stress-wave"
        />
        <ellipse 
          cx="500" 
          cy="300" 
          rx="490" 
          ry="295" 
          fill="none" 
          stroke="#ef4444" 
          strokeWidth="2" 
          strokeDasharray="12 4" 
          opacity="0.85" 
          className="animate-hud-pulse"
        />

        {/* Radial Distortion Vectors (Barrel curvature lines for wide / Pincushion for tele) */}
        {metrics.distortionType === 'BARREL' && (
          <g stroke="#f59e0b" strokeWidth="1" opacity="0.45" fill="none">
            {/* Top & Bottom Curvature Arcs */}
            <path d="M 50 40 Q 500 10 950 40" strokeDasharray="3 3" />
            <path d="M 50 560 Q 500 590 950 560" strokeDasharray="3 3" />
            {/* Left & Right Curvature Arcs */}
            <path d="M 40 50 Q 10 300 40 550" strokeDasharray="3 3" />
            <path d="M 960 50 Q 990 300 960 550" strokeDasharray="3 3" />
          </g>
        )}

        {metrics.distortionType === 'PINCUSHION' && (
          <g stroke="#06b6d4" strokeWidth="1" opacity="0.45" fill="none">
            <path d="M 50 20 Q 500 70 950 20" strokeDasharray="3 3" />
            <path d="M 50 580 Q 500 530 950 580" strokeDasharray="3 3" />
            <path d="M 20 50 Q 70 300 20 550" strokeDasharray="3 3" />
            <path d="M 980 50 Q 930 300 980 550" strokeDasharray="3 3" />
          </g>
        )}

        {/* Optical Axis Center Crosshair & Calm Zone */}
        <circle cx="500" cy="300" r="18" fill="none" stroke="#34d399" strokeWidth="1.5" opacity="0.8" />
        <circle cx="500" cy="300" r="4" fill="#34d399" opacity="0.9" />
        <line x1="470" y1="300" x2="530" y2="300" stroke="#34d399" strokeWidth="1" opacity="0.5" />
        <line x1="500" y1="270" x2="500" y2="330" stroke="#34d399" strokeWidth="1" opacity="0.5" />

        {/* Diagonal Ray Paths to the 4 Stress Hotspot Corners */}
        <line x1="500" y1="300" x2="60" y2="50" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="500" y1="300" x2="940" y2="50" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="500" y1="300" x2="60" y2="550" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="500" y1="300" x2="940" y2="550" stroke="rgba(239,68,68,0.4)" strokeWidth="1" strokeDasharray="4 6" />
      </svg>

      {/* ========================================================================= */}
      {/* 3. ROTATING RADAR ABERRATION SCANNER SWEEP                                */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[120%] h-[120%] max-w-[1200px] max-h-[1200px] rounded-full animate-hud-radar opacity-20 pointer-events-none relative">
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 315deg, rgba(212,175,55,0.02) 330deg, rgba(239,68,68,0.3) 360deg)'
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. 4-CORNER PROBE HUD TARGET RETICLES & NUMERICAL STRESS READOUTS         */}
      {/* ========================================================================= */}
      {/* Top-Left Hotspot Probe */}
      <div className="absolute top-12 left-10 z-30 pointer-events-none font-mono text-[8px] leading-tight text-white/90 animate-reticle-breathe">
        <div className="flex items-center gap-1 text-rose-400 font-bold mb-0.5">
          <Crosshair className="w-3 h-3 text-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
          <span>PROBE // TL_HOTSPOT</span>
        </div>
        <div className="bg-black/85 backdrop-blur-md border border-rose-500/50 px-2 py-1 rounded-xs shadow-lg space-y-0.5">
          <div className="flex justify-between gap-2">
            <span className="text-white/40">LATERAL CA:</span>
            <span className="text-rose-300 font-bold">+{metrics.lateralCAUm} µm</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/40">DISTORTION:</span>
            <span className="text-amber-300 font-bold">{metrics.distortionPercent}%</span>
          </div>
        </div>
      </div>

      {/* Top-Right Hotspot Probe */}
      <div className="absolute top-12 right-10 z-30 pointer-events-none font-mono text-[8px] leading-tight text-white/90 text-right animate-reticle-breathe">
        <div className="flex items-center justify-end gap-1 text-rose-400 font-bold mb-0.5">
          <span>PROBE // TR_HOTSPOT</span>
          <Crosshair className="w-3 h-3 text-rose-500 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div className="bg-black/85 backdrop-blur-md border border-rose-500/50 px-2 py-1 rounded-xs shadow-lg space-y-0.5 text-right">
          <div className="flex justify-between gap-2">
            <span className="text-white/40">COMA ERROR:</span>
            <span className="text-rose-300 font-bold">{metrics.comaErrorLambda} λ</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/40">VIGNETTE:</span>
            <span className="text-amber-300 font-bold">-{metrics.peripheralVignettePct}%</span>
          </div>
        </div>
      </div>

      {/* Bottom-Left Hotspot Probe */}
      <div className="absolute bottom-16 left-10 z-30 pointer-events-none font-mono text-[8px] leading-tight text-white/90 animate-reticle-breathe">
        <div className="bg-black/85 backdrop-blur-md border border-amber-500/50 px-2 py-1 rounded-xs shadow-lg space-y-0.5">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>BL STRESS VECTOR</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/40">RAY DEVIATION:</span>
            <span className="text-amber-300 font-bold">Δr {(metrics.overallScore * 0.042).toFixed(2)}mm</span>
          </div>
        </div>
      </div>

      {/* Bottom-Right Hotspot Probe */}
      <div className="absolute bottom-16 right-10 z-30 pointer-events-none font-mono text-[8px] leading-tight text-white/90 text-right animate-reticle-breathe">
        <div className="bg-black/85 backdrop-blur-md border border-amber-500/50 px-2 py-1 rounded-xs shadow-lg space-y-0.5 text-right">
          <div className="flex items-center justify-end gap-1 text-amber-400 font-bold">
            <span>BR STRESS VECTOR</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-white/40">COLOR FRINGE:</span>
            <span className="text-rose-300 font-bold">R-CYAN SPLIT</span>
          </div>
        </div>
      </div>

      {/* Center Optical Axis Zero-Stress Calibrator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 z-30 pointer-events-none font-mono text-[7.5px] leading-tight text-emerald-400 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
        <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
        <span>OPTICAL AXIS: 0.00% DISTORTION • 100% MTF CENTER SWEET SPOT</span>
      </div>

      {/* ========================================================================= */}
      {/* 5. FLOATING HEATMAP MASTER TELEMETRY DOCK (Bottom-Center)                 */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto bg-[#07080C]/95 backdrop-blur-2xl border border-rose-500/40 hover:border-rose-400 px-3 py-1.5 rounded-full shadow-[0_10px_35px_rgba(244,63,94,0.35)] flex items-center gap-3 font-mono text-[8.5px] sm:text-[9.5px]">
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span className="font-bold text-white tracking-wider uppercase">LENS STRESS INDEX:</span>
          <span className="font-black text-[10px]" style={{ color: metrics.tier.color }}>
            {metrics.overallScore}% [{metrics.tier.label}]
          </span>
        </div>

        <div className="w-20 sm:w-28 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${metrics.overallScore}%`,
              background: `linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)`
            }}
          />
        </div>

        <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-2 text-[8px] text-white/70">
          <span>CA: <strong className="text-rose-400">{metrics.lateralCAUm}µm</strong></span>
          <span>DIST: <strong className="text-amber-400">{metrics.distortionPercent}%</strong></span>
          <span>GATE: <strong className="text-cyan-400">{metrics.f}mm @ ƒ/{metrics.N}</strong></span>
        </div>
      </div>
    </div>
  );
};
