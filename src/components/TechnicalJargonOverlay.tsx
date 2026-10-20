/**
 * @file /src/components/TechnicalJargonOverlay.tsx
 * @description Technical-Jargon Real-Time Optical & Depth-of-Field (DOF) Overlay with
 * animated HUD micro-telemetry and live 'Lens Stress' Heatmap Simulation.
 * 
 * Features:
 * - Appears in the 4 corners of the Stage upon hover (or can be pinned).
 * - Real-time Gaussian & Rayleigh optical physics calculations (DOF slice, Near/Far planes,
 *   Hyperfocal, Entrance pupil, Airy disk diffraction, Field of view).
 * - Animated HUD Elements:
 *   * Breathing reticle corner brackets (animate-reticle-breathe)
 *   * Dynamic 11-Blade Iris diagram that contracts/expands based on aperture
 *   * Animated 172.8° Rotary Shutter disc with live 24fps spin
 *   * Animated Shimmering Light Bar sweeping across the DOF focus split progress meter
 *   * Animated MTF resolving frequency waveform equalizer
 *   * Micro-pulsing beacon LEDs and chromatic shift highlights
 * - Real-Time 'Lens Stress' Heatmap Overlay:
 *   * Simulates chromatic aberration (color dispersion hotspots in corners)
 *   * Simulates radial geometric distortion (barrel curve for wide / pincushion for tele)
 *   * 360° rotating radar scanner sweep line
 *   * 4-corner probe targets with live displacement coordinates
 *   * Selectable modes: Composite, Chromatic Aberration, Geometric Distortion, Thermal
 * - Interactive focus distance controller (scrubber, step buttons, presets) to see calculations change live!
 * - Title Toggle button and Heatmap Toggle button in top control bar.
 */

import React, { useState, useMemo } from 'react';
import { 
  Aperture, 
  Focus, 
  Pin, 
  PinOff, 
  Type, 
  Sparkles, 
  Sliders, 
  Flame, 
  Activity, 
  Layers, 
  Crosshair,
  ShieldCheck,
  Disc,
  BarChart2
} from 'lucide-react';
import { LensStressHeatmapOverlay, HeatmapMode } from './LensStressHeatmapOverlay';

export interface TechnicalJargonOverlayProps {
  focalLength?: string;
  aperture?: string;
  lensName?: string;
  aspectRatio?: string;
  shotNumber?: string | number;
  timecode?: string;
  isStageHovered?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  showTitles?: boolean;
  onToggleTitles?: () => void;
  className?: string;
}

export const TechnicalJargonOverlay: React.FC<TechnicalJargonOverlayProps> = ({
  focalLength = '35mm',
  aperture = 'T1.2',
  lensName = 'Zeiss Supreme Prime 35mm T1.5',
  aspectRatio = '2.39:1',
  shotNumber = '001',
  timecode = '00:00:01:00',
  isStageHovered = false,
  isPinned = false,
  onTogglePin,
  showTitles = true,
  onToggleTitles,
  className = ''
}) => {
  // Local pin override if parent doesn't handle pin state
  const [localPinned, setLocalPinned] = useState(false);
  const effectivePinned = isPinned ?? localPinned;
  const handleTogglePin = onTogglePin ?? (() => setLocalPinned(prev => !prev));

  // Heatmap State (Default to active when jargon overlay is viewed)
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('composite');

  // Interactive focus subject distance in meters (default 1.8m cinema standard)
  const [subjectDistanceMeters, setSubjectDistanceMeters] = useState(1.8);
  const [activeCornerDetails, setActiveCornerDetails] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

  // 1. Parse numeric focal length (mm)
  const f = useMemo(() => {
    const match = focalLength.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 35.0;
  }, [focalLength]);

  // 2. Parse numeric aperture (f-number or T-stop)
  const N = useMemo(() => {
    const match = aperture.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1.4;
  }, [aperture]);

  // 3. Real-Time Optical Physics Calculations
  const calculations = useMemo(() => {
    // Sensor Dimensions: Cinema Large Format / Full-Frame 36.0mm x 24.0mm
    const sensorW = 36.0;
    const sensorH = 24.0;
    const sensorDiag = Math.sqrt(sensorW * sensorW + sensorH * sensorH); // ~43.27mm

    // Circle of Confusion: Cinema 35mm / Large Format critical standard
    const c = 0.015; // mm

    // Subject distance in mm
    const s = Math.max(f + 1, subjectDistanceMeters * 1000);

    // Hyperfocal Distance H = (f^2 / (N * c)) + f in mm
    const H_mm = (f * f) / (N * c) + f;
    const H_meters = H_mm / 1000;

    // Near Focus Limit Dn = s * (H - f) / (H + s - 2*f)
    const Dn_mm = (s * (H_mm - f)) / (H_mm + s - 2 * f);
    const Dn_meters = Math.max(0.05, Dn_mm / 1000);

    // Far Focus Limit Df = s * (H - f) / (H - s)
    let Df_meters = Infinity;
    let isInfinity = false;
    if (s >= (H_mm - f)) {
      Df_meters = Infinity;
      isInfinity = true;
    } else {
      const Df_mm = (s * (H_mm - f)) / (H_mm - s);
      Df_meters = Math.max(Dn_meters, Df_mm / 1000);
    }

    // Total Depth of Field Delta
    let dofFormatted = '';
    let dofMm = 0;
    if (isInfinity) {
      dofFormatted = `INFINITE (From ${Dn_meters.toFixed(2)}m to ∞)`;
    } else {
      dofMm = (Df_meters - Dn_meters) * 1000;
      if (dofMm < 10) {
        dofFormatted = `${dofMm.toFixed(1)} mm Razor Slice`;
      } else if (dofMm < 100) {
        dofFormatted = `${(dofMm / 10).toFixed(1)} cm Thin Volume`;
      } else if (dofMm < 1000) {
        dofFormatted = `${(dofMm / 10).toFixed(1)} cm Standard Plane`;
      } else {
        dofFormatted = `${(dofMm / 1000).toFixed(2)} m Deep Focus`;
      }
    }

    // Focus Distribution: Front vs Rear percentage
    let frontPct = 33;
    let rearPct = 67;
    if (!isInfinity && Df_meters > Dn_meters) {
      const frontDepth = Math.max(0, subjectDistanceMeters - Dn_meters);
      const totalDepth = Df_meters - Dn_meters;
      if (totalDepth > 0) {
        frontPct = Math.min(50, Math.max(10, Math.round((frontDepth / totalDepth) * 100)));
        rearPct = 100 - frontPct;
      }
    }

    // Entrance Pupil Diameter Pe = f / N (mm)
    const pupilDiameterMm = f / N;

    // Airy Disk Diameter φ_airy = 2.44 * λ * N (λ ≈ 0.55µm for green visible light -> 1.342 * N µm)
    const airyDiskUm = 1.342 * N;

    // Resolving Power Limit ~ 1000 / (2 * airyDiskUm) lp/mm
    const resolvingPowerLpmm = Math.round(1000 / (2 * airyDiskUm));

    // Field of View (FOV) in degrees
    const hFov = 2 * Math.atan(sensorW / (2 * f)) * (180 / Math.PI);
    const vFov = 2 * Math.atan(sensorH / (2 * f)) * (180 / Math.PI);
    const dFov = 2 * Math.atan(sensorDiag / (2 * f)) * (180 / Math.PI);

    // Magnification m = f / (s - f)
    const magnification = s > f ? f / (s - f) : 0.01;
    const magRatio = s > f ? ((s - f) / f).toFixed(1) : '100';

    // Sensor Depth of Focus (tolerance at sensor plane) = ± N * c * 1000 (µm)
    const depthOfFocusUm = N * c * 1000;

    // Photometric T-Stop equivalent (with 94% transmission)
    const tStopCalculated = (N / Math.sqrt(0.94)).toFixed(1);

    // Iris Blade Aperture Opening Scale (0 to 1 for visual SVG iris)
    // f/1.2 -> 0.88, f/22 -> 0.15
    const irisOpeningNorm = Math.max(0.12, Math.min(0.92, 1.0 - (Math.log2(Math.max(1, N)) / 5.5)));

    return {
      f,
      N,
      tStopCalculated,
      c,
      H_meters,
      Dn_meters,
      Df_meters,
      isInfinity,
      dofFormatted,
      dofMm,
      frontPct,
      rearPct,
      pupilDiameterMm,
      airyDiskUm,
      resolvingPowerLpmm,
      hFov,
      vFov,
      dFov,
      magnification,
      magRatio,
      depthOfFocusUm,
      sensorW,
      sensorH,
      sensorDiag,
      irisOpeningNorm
    };
  }, [f, N, subjectDistanceMeters]);

  // Visibility: Visible when stage is hovered or when pinned
  const isVisible = isStageHovered || effectivePinned;

  return (
    <div 
      id="technical-jargon-overlay"
      data-testid="technical-jargon-overlay"
      className={`technical-jargon technical-jargon-overlay absolute inset-0 pointer-events-none z-30 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {/* ========================================================================= */}
      {/* 0. REAL-TIME LENS STRESS HEATMAP LAYER (Simulating CA & Distortion)        */}
      {/* ========================================================================= */}
      <LensStressHeatmapOverlay
        focalLengthMm={calculations.f}
        apertureN={calculations.N}
        aspectRatio={aspectRatio}
        isVisible={isVisible && showHeatmap}
        mode={heatmapMode}
      />

      {/* ========================================================================= */}
      {/* TOP BAR / CONTROL DOCK: TITLE TOGGLE, HEATMAP TOGGLE & PIN CONTROLLER      */}
      {/* ========================================================================= */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-[95%]">
        {/* Title Toggle Pill Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleTitles?.();
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] font-bold tracking-wider backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
            showTitles
              ? 'bg-[#12131A]/90 border-[#D4AF37] text-[#FFE066] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
              : 'bg-[#090A0F]/85 border-white/20 text-white/50 hover:text-white/90 hover:border-white/40'
          }`}
          title="Toggle Cinematic Title Overlay (Hotkey: T)"
        >
          <Type className={`w-3 h-3 ${showTitles ? 'text-[#D4AF37]' : 'text-white/40'}`} />
          <span>TITLES: {showTitles ? 'ON' : 'OFF'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${showTitles ? 'bg-[#FFE066] shadow-[0_0_6px_#FFE066]' : 'bg-white/20'}`} />
        </button>

        {/* Lens Stress Heatmap Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowHeatmap(prev => !prev);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] font-bold tracking-wider backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
            showHeatmap
              ? 'bg-[#1c0d12]/95 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-hud-pulse'
              : 'bg-[#090A0F]/85 border-white/20 text-white/50 hover:text-white/90 hover:border-white/40'
          }`}
          title="Toggle Optical Lens Stress & Aberration Heatmap Overlay"
        >
          <Flame className={`w-3 h-3 ${showHeatmap ? 'text-rose-400 animate-pulse' : 'text-white/40'}`} />
          <span>HEATMAP: {showHeatmap ? 'ACTIVE' : 'OFF'}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${showHeatmap ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-ping' : 'bg-white/20'}`} />
        </button>

        {/* Heatmap Mode Selector (Visible when Heatmap is Active) */}
        {showHeatmap && (
          <div className="flex items-center bg-[#07080C]/90 p-0.5 rounded-full border border-rose-500/30 backdrop-blur-xl text-[8px] font-mono">
            {(['composite', 'chromatic', 'distortion', 'thermal'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHeatmapMode(m);
                }}
                className={`px-2 py-0.5 rounded-full uppercase tracking-wider transition-all cursor-pointer ${
                  heatmapMode === m
                    ? 'bg-rose-500 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
                title={`Switch Heatmap Mode to ${m.toUpperCase()}`}
              >
                {m === 'composite' ? 'ALL' : m === 'chromatic' ? 'CA FRINGE' : m === 'distortion' ? 'DISTORT' : 'THERMAL'}
              </button>
            ))}
          </div>
        )}

        {/* Pin HUD Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePin();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] sm:text-[9.5px] font-bold tracking-wider backdrop-blur-xl border transition-all duration-200 shadow-xl cursor-pointer select-none ${
            effectivePinned
              ? 'bg-[#E5A919] border-[#FFE066] text-black shadow-[0_0_12px_rgba(229,169,25,0.6)]'
              : 'bg-[#090A0F]/85 border-white/20 text-white/70 hover:text-white hover:border-[#D4AF37]/50'
          }`}
          title={effectivePinned ? "Unpin Technical Jargon Overlay" : "Pin Technical Jargon Overlay (Keep visible on stage)"}
        >
          {effectivePinned ? (
            <>
              <PinOff className="w-3 h-3 text-black" />
              <span>PINNED</span>
            </>
          ) : (
            <>
              <Pin className="w-3 h-3 text-[#D4AF37]" />
              <span>PIN HUD</span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CORNER 1: TOP-LEFT (Camera Gate, Sensor Architecture & Rotary Shutter)    */}
      {/* ========================================================================= */}
      <div 
        className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-40 pointer-events-auto group/tl text-left"
        onMouseEnter={() => setActiveCornerDetails('tl')}
        onMouseLeave={() => setActiveCornerDetails(null)}
      >
        {/* Animated Reticle Corner Bracket */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-[#D4AF37] pointer-events-none animate-reticle-breathe" />

        <div className="bg-[#07080C]/90 hover:bg-[#0A0C14]/98 backdrop-blur-xl border border-[#D4AF37]/40 hover:border-[#D4AF37] p-2 sm:p-2.5 rounded-xs shadow-[0_8px_30px_rgba(0,0,0,0.85)] font-mono text-[8px] sm:text-[9px] leading-tight text-white/80 max-w-[240px] sm:max-w-[280px] transition-all">
          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A919] shadow-[0_0_6px_#E5A919] animate-ping" />
              <span className="font-bold text-[#FFE066] tracking-wider uppercase text-[8.5px]">OPTICAL GATE // ƒ-{calculations.f.toFixed(0)}mm</span>
            </div>
            {/* Animated Rotary Shutter Mini-Dial */}
            <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-white/10 text-[7px]" title="Rotary Shutter Angle: 172.8° @ 24fps">
              <svg className="w-2.5 h-2.5 animate-hud-radar text-[#E5A919]" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <path d="M 10 10 L 10 2 A 8 8 0 0 1 18 10 Z" fill="#E5A919" />
              </svg>
              <span className="text-[#FFE066] font-bold">172.8°</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">FOCAL LENGTH:</span>
              <span className="text-[#FFE066] font-bold text-[9.5px]">ƒ = {calculations.f.toFixed(1)} mm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">ANGLE OF VIEW:</span>
              <span className="text-white font-medium">H: {calculations.hFov.toFixed(1)}° • V: {calculations.vFov.toFixed(1)}°</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">DIAGONAL FOV:</span>
              <span className="text-cyan-300 font-medium">{calculations.dFov.toFixed(1)}° (Scope)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">GATE DIMENSIONS:</span>
              <span className="text-white font-medium">{calculations.sensorW}×{calculations.sensorH} mm LF</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">IMAGE CIRCLE:</span>
              <span className="text-white/70">Ø {calculations.sensorDiag.toFixed(1)} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CORNER 2: TOP-RIGHT (Aperture, Pupil Diameter & Dynamic 11-Blade Iris)    */}
      {/* ========================================================================= */}
      <div 
        className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-40 pointer-events-auto group/tr text-right"
        onMouseEnter={() => setActiveCornerDetails('tr')}
        onMouseLeave={() => setActiveCornerDetails(null)}
      >
        {/* Animated Reticle Corner Bracket */}
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-400 pointer-events-none animate-reticle-breathe" />

        <div className="bg-[#07080C]/90 hover:bg-[#0A0C14]/98 backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400 p-2 sm:p-2.5 rounded-xs shadow-[0_8px_30px_rgba(0,0,0,0.85)] font-mono text-[8px] sm:text-[9px] leading-tight text-white/80 max-w-[240px] sm:max-w-[280px] transition-all">
          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-white/10">
            {/* Dynamic Animated 11-Blade Iris Graphic */}
            <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[7px]" title="Dynamic 11-Blade Iris Geometry">
              <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" />
                {/* Simulated 11 curved iris blades */}
                <circle 
                  cx="12" 
                  cy="12" 
                  r={Math.max(2, 9 * calculations.irisOpeningNorm)} 
                  fill="#064e3b" 
                  stroke="#34d399" 
                  strokeWidth="1.2" 
                  className="transition-all duration-300"
                />
              </svg>
              <span className="text-emerald-300 font-bold">11-BLADE</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-emerald-300 tracking-wider uppercase text-[8.5px]">IRIS // {aperture}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">GEOMETRIC ƒ-STOP:</span>
              <span className="text-emerald-300 font-bold text-[9.5px]">ƒ/{calculations.N.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">PHOTOMETRIC T-STOP:</span>
              <span className="text-white font-medium">T{calculations.tStopCalculated} (τ = 94%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">ENTRANCE PUPIL:</span>
              <span className="text-white font-medium">Ø {calculations.pupilDiameterMm.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">AIRY DISK DIAMETER:</span>
              <span className="text-cyan-300 font-medium">φ = {calculations.airyDiskUm.toFixed(2)} µm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">MTF DIFFRACTION:</span>
              <span className="text-white/70">~{calculations.resolvingPowerLpmm} lp/mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CORNER 3: BOTTOM-LEFT (Real-Time Depth of Field Engine & Shimmer Bar)     */}
      {/* ========================================================================= */}
      <div 
        className="absolute bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5 z-40 pointer-events-auto group/bl text-left"
        onMouseEnter={() => setActiveCornerDetails('bl')}
        onMouseLeave={() => setActiveCornerDetails(null)}
      >
        {/* Animated Reticle Corner Bracket */}
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-[#D4AF37] pointer-events-none animate-reticle-breathe" />

        <div className="bg-[#07080C]/95 hover:bg-[#0A0C14]/98 backdrop-blur-2xl border border-[#D4AF37]/50 hover:border-[#D4AF37] p-2.5 sm:p-3 rounded-xs shadow-[0_12px_40px_rgba(0,0,0,0.95)] font-mono text-[8px] sm:text-[9px] leading-tight text-white/80 w-[270px] sm:w-[320px] transition-all">
          <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Focus className="w-3 h-3 text-[#E5A919] animate-pulse" />
              <span className="font-bold text-[#FFE066] tracking-wider uppercase text-[9px]">REAL-TIME DOF ENGINE</span>
            </div>
            <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-[#D4AF37]/20 text-[#FFE066] font-bold">
              CoC: {calculations.c}mm
            </span>
          </div>

          {/* Master Highlight Readout */}
          <div className="mb-2 p-1.5 bg-black/70 rounded border border-[#D4AF37]/30 flex items-center justify-between">
            <div>
              <span className="text-white/40 block text-[7px] uppercase tracking-wider">DEPTH OF FIELD SLICE</span>
              <span className="text-[#FFE066] font-bold text-[10.5px] sm:text-[11px] tracking-wide">
                {calculations.dofFormatted}
              </span>
            </div>
            <div className="text-right">
              <span className="text-white/40 block text-[7px] uppercase tracking-wider">HYPERFOCAL (H)</span>
              <span className="text-white font-mono font-bold text-[10px]">
                {calculations.H_meters.toFixed(2)} m
              </span>
            </div>
          </div>

          {/* Near & Far Limits */}
          <div className="grid grid-cols-2 gap-1.5 text-[8px] mb-2">
            <div className="bg-black/50 p-1.5 rounded border border-white/5">
              <span className="text-white/40 block text-[7px] uppercase">NEAR PLANE (Dn)</span>
              <span className="text-emerald-300 font-bold text-[9.5px]">
                {calculations.Dn_meters.toFixed(3)} m
              </span>
            </div>
            <div className="bg-black/50 p-1.5 rounded border border-white/5">
              <span className="text-white/40 block text-[7px] uppercase">FAR PLANE (Df)</span>
              <span className="text-emerald-300 font-bold text-[9.5px]">
                {calculations.isInfinity ? '∞ (INFINITY)' : `${calculations.Df_meters.toFixed(3)} m`}
              </span>
            </div>
          </div>

          {/* Real-time Focus Split Progress Bar with Animated Shimmer Sweep */}
          <div className="mb-2">
            <div className="flex justify-between text-[7px] text-white/50 mb-0.5 uppercase">
              <span>Front Split: {calculations.frontPct}%</span>
              <span>Rear Split: {calculations.rearPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex relative">
              <div className="h-full bg-[#E5A919]" style={{ width: `${calculations.frontPct}%` }} />
              <div className="h-full bg-cyan-400" style={{ width: `${calculations.rearPct}%` }} />
              {/* Shimmer sweep line */}
              <div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-bar pointer-events-none" />
            </div>
          </div>

          {/* Interactive Subject Distance Controller */}
          <div className="pt-1.5 border-t border-white/10">
            <div className="flex items-center justify-between text-[7.5px] mb-1">
              <span className="text-white/50 uppercase font-bold flex items-center gap-1">
                <Sliders className="w-2.5 h-2.5 text-[#D4AF37]" />
                SUBJECT FOCUS (s):
              </span>
              <span className="text-[#FFE066] font-bold">
                {subjectDistanceMeters.toFixed(2)} m ({(subjectDistanceMeters * 3.28084).toFixed(1)} ft)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSubjectDistanceMeters(prev => Math.max(0.3, parseFloat((prev - 0.2).toFixed(2))));
                }}
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[8px] font-bold cursor-pointer transition-colors"
                title="Focus Closer (-0.2m)"
              >
                -
              </button>
              <input
                type="range"
                min="0.3"
                max="10.0"
                step="0.05"
                value={subjectDistanceMeters}
                onChange={(e) => setSubjectDistanceMeters(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 accent-[#D4AF37] h-1 bg-white/20 rounded cursor-pointer"
                title="Drag to dynamically recompute Depth of Field"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSubjectDistanceMeters(prev => Math.min(15.0, parseFloat((prev + 0.2).toFixed(2))));
                }}
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[8px] font-bold cursor-pointer transition-colors"
                title="Focus Farther (+0.2m)"
              >
                +
              </button>
            </div>

            {/* Quick Distance Presets */}
            <div className="flex items-center justify-between gap-1 mt-1.5 text-[7px]">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSubjectDistanceMeters(0.8); }}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  Math.abs(subjectDistanceMeters - 0.8) < 0.05 ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                0.8m CU
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSubjectDistanceMeters(1.8); }}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  Math.abs(subjectDistanceMeters - 1.8) < 0.05 ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                1.8m Port
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSubjectDistanceMeters(3.5); }}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  Math.abs(subjectDistanceMeters - 3.5) < 0.05 ? 'bg-[#D4AF37] text-black font-bold' : 'bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                3.5m Med
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSubjectDistanceMeters(parseFloat(calculations.H_meters.toFixed(2))); }}
                className="px-1.5 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-700/60 text-cyan-200 cursor-pointer font-bold transition-colors"
                title="Set to Hyperfocal Distance"
              >
                H {calculations.H_meters.toFixed(1)}m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CORNER 4: BOTTOM-RIGHT (Lens Spec, Geometry, Bokeh & MTF Equalizer)       */}
      {/* ========================================================================= */}
      <div 
        className="absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-40 pointer-events-auto group/br text-right"
        onMouseEnter={() => setActiveCornerDetails('br')}
        onMouseLeave={() => setActiveCornerDetails(null)}
      >
        {/* Animated Reticle Corner Bracket */}
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-purple-400 pointer-events-none animate-reticle-breathe" />

        <div className="bg-[#07080C]/90 hover:bg-[#0A0C14]/98 backdrop-blur-xl border border-purple-500/40 hover:border-purple-400 p-2 sm:p-2.5 rounded-xs shadow-[0_8px_30px_rgba(0,0,0,0.85)] font-mono text-[8px] sm:text-[9px] leading-tight text-white/80 max-w-[240px] sm:max-w-[280px] transition-all">
          <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-white/10">
            {/* Animated MTF Frequency Equalizer Bars */}
            <div className="flex items-center gap-0.5 bg-black/60 px-1.5 py-0.5 rounded border border-purple-500/30" title="Optical MTF Frequency Resolving Power">
              <span className="w-1 h-3 bg-purple-400 rounded-xs animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-2 bg-purple-300 rounded-xs animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1 h-3.5 bg-cyan-400 rounded-xs animate-pulse" style={{ animationDelay: '400ms' }} />
              <span className="w-1 h-2.5 bg-emerald-400 rounded-xs animate-pulse" style={{ animationDelay: '600ms' }} />
              <span className="text-[7px] text-purple-300 ml-1 font-bold">MTF-50</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-purple-300 tracking-wider uppercase text-[8.5px]">LENS METADATA</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc] animate-ping" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">PRIMARY GLASS:</span>
              <span className="text-white font-bold text-[9px] truncate max-w-[150px]">{lensName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">IRIS ARCHITECTURE:</span>
              <span className="text-[#FFE066] font-medium">11 Curved Blades • Oval Bokeh</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">MAGNIFICATION:</span>
              <span className="text-white font-medium">1:{calculations.magRatio} ({calculations.magnification.toFixed(4)}×)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">SENSOR DOF (TOL):</span>
              <span className="text-emerald-300 font-medium">±{calculations.depthOfFocusUm.toFixed(1)} µm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 uppercase">ANAMORPHIC GATE:</span>
              <span className="text-white/70">{aspectRatio} Scope • 2.0× De-Squeeze</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
