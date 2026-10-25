/**
 * @file /src/components/stage/templates/KineticTributeSequence.tsx
 * @description Master 5-Phase Kinetic Tribute Motion Sequence for HANDFILM Cinema Studio.
 * 
 * 5-Phase Motion Architecture:
 * - Phase 1 [0% - 20%]:  HOOK IMPACT — Monumental brutalist typography with chromatic burst & anamorphic streak.
 * - Phase 2 [20% - 44%]: PERFORMER & BIO — Enforced ALL CAPS performer name + strictly max-20-word origin/accolades bio.
 * - Phase 3 [44% - 68%]: VISCERAL CAPTIONS — Dual bilingual poetry (Bengali calligraphy + cinematic prose).
 * - Phase 4 [68% - 86%]: CRITIC NOTE — Distinctive editorial review note (strictly max 10 words) just before signature.
 * - Phase 5 [86% - 100%]: DIRECTOR SIGNATURE — RAKIB HIMON // HANDFILM directorial seal with timecode stamp.
 * 
 * Motion Profiles:
 * - cinematic_breath, kinetic_overshoot, editorial_mask, brutal_snap,
 *   z_axis_tilt, neon_flicker, fluid_blur, anamorphic_stretch, strobe_stutter.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TributeProfile, 
  TRIBUTE_PROFILES, 
  DEFAULT_TRIBUTE_PROFILE,
  getTributeProfileById,
  TributeAnimationType 
} from '../../../constants/tributeData';
import { 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Quote, 
  Award, 
  Compass, 
  Film, 
  ChevronRight,
  Sliders,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

export type TributePhase = 1 | 2 | 3 | 4 | 5;

export interface KineticTributeSequenceProps {
  profile?: TributeProfile | string;
  slideTimeSec?: number;
  durationSec?: number;
  isPlaying?: boolean;
  activePhaseOverride?: TributePhase;
  onPhaseChange?: (phase: TributePhase) => void;
  scale?: number;
  showControls?: boolean;
  className?: string;
  onApplyProfileToFrame?: (profile: TributeProfile) => void;
}

export const KineticTributeSequence: React.FC<KineticTributeSequenceProps> = ({
  profile: profileProp = DEFAULT_TRIBUTE_PROFILE,
  slideTimeSec,
  durationSec = 7.0,
  isPlaying: externalIsPlaying,
  activePhaseOverride,
  onPhaseChange,
  scale = 1.0,
  showControls = true,
  className = '',
  onApplyProfileToFrame
}) => {
  // Resolve active profile
  const activeProfile: TributeProfile = useMemo(() => {
    if (typeof profileProp === 'string') {
      return getTributeProfileById(profileProp) || DEFAULT_TRIBUTE_PROFILE;
    }
    return profileProp || DEFAULT_TRIBUTE_PROFILE;
  }, [profileProp]);

  // Internal playback state if not provided externally
  const [internalTimeSec, setInternalTimeSec] = useState(0);
  const [internalPlaying, setInternalPlaying] = useState(true);
  const [selectedPhaseManual, setSelectedPhaseManual] = useState<TributePhase | null>(null);
  const [activeProfileId, setActiveProfileId] = useState(activeProfile.id);

  // Sync profile when prop changes
  useEffect(() => {
    if (activeProfile && activeProfile.id !== activeProfileId) {
      setActiveProfileId(activeProfile.id);
    }
  }, [activeProfile]);

  const currentProfile = useMemo(() => {
    return getTributeProfileById(activeProfileId) || activeProfile;
  }, [activeProfileId, activeProfile]);

  const effectiveDuration = Math.max(durationSec, 3.0);
  const isDrivenExternally = slideTimeSec !== undefined;
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalPlaying;

  // Autonomous animation loop when not driven externally
  useEffect(() => {
    if (isDrivenExternally || !isPlaying || selectedPhaseManual !== null) return;

    let animFrame: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setInternalTimeSec(prev => {
        const next = prev + dt;
        return next >= effectiveDuration ? 0 : next;
      });
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isDrivenExternally, isPlaying, effectiveDuration, selectedPhaseManual]);

  const currentTime = isDrivenExternally ? (slideTimeSec % effectiveDuration) : internalTimeSec;
  const progress = Math.min(1.0, Math.max(0.0, currentTime / effectiveDuration));

  // Determine current 5-phase animation window
  // Phase 1: [0.00, 0.20) -> HOOK
  // Phase 2: [0.20, 0.44) -> PERFORMER & 20-WORD BIO
  // Phase 3: [0.44, 0.68) -> VISCERAL CAPTIONS
  // Phase 4: [0.68, 0.86) -> CRITIC NOTE (strictly before signature)
  // Phase 5: [0.86, 1.00] -> DIRECTOR SIGNATURE
  const currentPhase: TributePhase = useMemo(() => {
    if (activePhaseOverride) return activePhaseOverride;
    if (selectedPhaseManual) return selectedPhaseManual;

    if (progress < 0.20) return 1;
    if (progress < 0.44) return 2;
    if (progress < 0.68) return 3;
    if (progress < 0.86) return 4;
    return 5;
  }, [activePhaseOverride, selectedPhaseManual, progress]);

  // Notify parent on phase change
  useEffect(() => {
    onPhaseChange?.(currentPhase);
  }, [currentPhase, onPhaseChange]);

  // Phase normalized sub-progress (0 to 1 inside each phase)
  const phaseProgress = useMemo(() => {
    if (selectedPhaseManual || activePhaseOverride) return 0.5; // Steady state for inspection
    switch (currentPhase) {
      case 1: return progress / 0.20;
      case 2: return (progress - 0.20) / 0.24;
      case 3: return (progress - 0.44) / 0.24;
      case 4: return (progress - 0.68) / 0.18;
      case 5: return (progress - 0.86) / 0.14;
    }
  }, [progress, currentPhase, selectedPhaseManual, activePhaseOverride]);

  // Motion styling tailored to defaultAnimation
  const animType: TributeAnimationType = (currentProfile.defaultAnimation as any) || 'cinematic_breath';

  const getPhaseTransitionStyle = (phase: TributePhase) => {
    const isActive = currentPhase === phase;
    if (!isActive) {
      return 'opacity-0 pointer-events-none scale-95 translate-y-3 blur-xs';
    }

    // Active animation classes based on preset
    switch (animType) {
      case 'kinetic_overshoot':
        return 'opacity-100 scale-100 translate-y-0 duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';
      case 'brutal_snap':
        return 'opacity-100 scale-100 translate-y-0 duration-75 ease-linear';
      case 'editorial_mask':
        return 'opacity-100 scale-100 translate-x-0 duration-400 ease-out';
      case 'z_axis_tilt':
        return 'opacity-100 scale-100 translate-y-0 [transform:rotateX(0deg)] duration-500 ease-out';
      case 'neon_flicker':
        return 'opacity-100 scale-100 translate-y-0 animate-[pulse_1.5s_infinite] duration-300';
      case 'fluid_blur':
        return 'opacity-100 scale-100 translate-y-0 filter-none duration-500 ease-out';
      case 'anamorphic_stretch':
        return 'opacity-100 scale-100 scale-x-100 translate-y-0 duration-400 ease-out';
      case 'strobe_stutter':
        return 'opacity-100 scale-100 translate-y-0 duration-150';
      case 'cinematic_breath':
      default:
        return 'opacity-100 scale-100 translate-y-0 duration-500 ease-out';
    }
  };

  return (
    <div 
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    >
      {/* Dynamic Background Volumetric Atmospheric Bloom */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(245, 166, 35, 0.18) 0%, rgba(10, 10, 18, 0.85) 60%, rgba(5, 5, 8, 0.98) 100%)`
        }}
      />

      {/* Anamorphic Horizontal Streak Line */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#F5A623]/30 to-transparent pointer-events-none shadow-[0_0_12px_rgba(245,166,35,0.4)]" />

      {/* Top Cinematic Telemetry Strip */}
      <div className="absolute top-4 inset-x-6 flex items-center justify-between text-[10px] font-mono tracking-widest text-zinc-400 pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-ping" />
          <span className="text-[#F5A623] font-bold">TRIBUTE SEQUENCE // HANDFILM</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300 font-bold tracking-wider">{currentProfile.id.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">ANIM: <span className="text-[#F5A623] uppercase">{animType.replace('_', ' ')}</span></span>
          <span className="text-zinc-600">|</span>
          <span className="text-[#F5A623] font-bold tabular-nums">PHASE {currentPhase}/5</span>
          <span className="text-zinc-500 tabular-nums">{(currentTime).toFixed(2)}s / {effectiveDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* =========================================================================
          THE 5-PHASE KINETIC STAGE DISPLAY
         ========================================================================= */}
      <div className="relative w-full max-w-4xl px-6 min-h-[360px] flex items-center justify-center text-center z-10">

        {/* -------------------------------------------------------------
            PHASE 1: HOOK IMPACT
           ------------------------------------------------------------- */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${getPhaseTransitionStyle(1)}`}>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/40 text-[#F5A623] text-[10px] font-mono tracking-[0.3em] uppercase mb-4 shadow-[0_0_15px_rgba(245,166,35,0.2)]">
            <Sparkles className="w-3 h-3 text-[#F5A623]" />
            PHASE 01 // KINETIC HOOK
          </div>

          <h1 
            className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-[#F5E2B3] to-[#F5A623] drop-shadow-[0_4px_25px_rgba(245,166,35,0.55)] font-sans"
            style={{ letterSpacing: '-0.02em' }}
          >
            {currentProfile.hook}
          </h1>

          <div className="mt-4 flex items-center gap-3 text-xs font-mono tracking-[0.25em] text-zinc-400">
            <span className="h-[1px] w-8 bg-[#F5A623]/60" />
            <span>RAW CINEMATIC IMPACT</span>
            <span className="h-[1px] w-8 bg-[#F5A623]/60" />
          </div>
        </div>

        {/* -------------------------------------------------------------
            PHASE 2: PERFORMER & 20-WORD BIO
           ------------------------------------------------------------- */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${getPhaseTransitionStyle(2)}`}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-3">
            <Award className="w-3 h-3 text-[#F5A623]" />
            PHASE 02 // PERFORMER ICON & BIO
          </div>

          {/* Enforced ALL CAPS Performer Name */}
          <h2 
            className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-sans drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] max-w-3xl"
          >
            {currentProfile.performer}
          </h2>

          {/* Golden hairline divider */}
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#F5A623] to-transparent my-4 shadow-[0_0_8px_rgba(245,166,35,0.8)]" />

          {/* Strictly Max-20-Word Description (Country, Race, Awards, Achievements) */}
          <div className="max-w-2xl px-5 py-3 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl">
            <p className="text-sm sm:text-base md:text-lg font-mono text-zinc-200 leading-relaxed tracking-wide">
              {currentProfile.description}
            </p>
            <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-2">
              <span className="text-[#F5A623]">BIO VERIFIED</span>
              <span>•</span>
              <span>{currentProfile.description.trim().split(/\s+/).filter(Boolean).length} WORDS (MAX 20)</span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            PHASE 3: VISCERAL & POETIC CAPTIONS
           ------------------------------------------------------------- */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${getPhaseTransitionStyle(3)}`}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-4">
            <Film className="w-3 h-3 text-[#F5A623]" />
            PHASE 03 // BILINGUAL VISCERAL CAPTIONS
          </div>

          {/* Bengali Line (Anek Bangla/Calligraphic feel) */}
          {currentProfile.captions[0] && (
            <div className="mb-4">
              <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#F5A623] tracking-wide drop-shadow-[0_2px_12px_rgba(245,166,35,0.4)]">
                {currentProfile.captions[0]}
              </p>
            </div>
          )}

          {/* English Visceral Line */}
          {currentProfile.captions[1] && (
            <div className="max-w-xl">
              <p className="text-base sm:text-xl font-mono text-zinc-200 tracking-wider uppercase">
                "{currentProfile.captions[1]}"
              </p>
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------
            PHASE 4: CRITIC NOTE (STRICTLY PRECEDES FINAL SIGNATURE)
           ------------------------------------------------------------- */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${getPhaseTransitionStyle(4)}`}>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#F5A623]/15 border border-[#F5A623]/50 text-[#F5A623] text-[10px] font-mono tracking-[0.3em] uppercase mb-4 shadow-[0_0_20px_rgba(245,166,35,0.25)]">
            <Quote className="w-3 h-3 text-[#F5A623]" />
            PHASE 04 // CRITIC NOTE // EDITORIAL ACCLAIM
          </div>

          {/* Frosted Obsidian Capsule for Critic Note */}
          <div className="max-w-2xl px-6 py-5 rounded-xl bg-[#090910]/85 border border-[#F5A623]/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(245,166,35,0.2)] backdrop-blur-xl relative">
            {/* Corner Decorative Crosshairs */}
            <span className="absolute top-1.5 left-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute top-1.5 right-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-[#F5A623]/60">+</span>

            <div className="flex items-center justify-center gap-2 text-[#F5A623] mb-2">
              <span className="h-[1px] w-6 bg-[#F5A623]/50" />
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase">CRITICAL VERDICT</span>
              <span className="h-[1px] w-6 bg-[#F5A623]/50" />
            </div>

            {/* The strictly max-10-word Critic Note */}
            <p className="text-xl sm:text-2xl md:text-3xl font-serif italic text-white leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              “{currentProfile.criticNote}”
            </p>

            <div className="mt-3 text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-2">
              <span className="text-[#F5A623]">CINEMA ARCHIVE EVALUATION</span>
              <span>•</span>
              <span>{currentProfile.criticNote.trim().split(/\s+/).filter(Boolean).length} WORDS (MAX 10)</span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------
            PHASE 5: DIRECTOR SIGNATURE & FINAL STAMP
           ------------------------------------------------------------- */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${getPhaseTransitionStyle(5)}`}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-4">
            <CheckCircle2 className="w-3 h-3 text-[#F5A623]" />
            PHASE 05 // DIRECTOR SIGNATURE
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs font-mono tracking-[0.45em] text-[#F5A623] uppercase">
              DIRECTED & CURATED BY
            </div>

            <div 
              className="text-2xl sm:text-4xl md:text-5xl font-black tracking-[0.25em] text-white font-mono uppercase border-y border-[#F5A623]/40 py-2 px-6 shadow-[0_0_20px_rgba(245,166,35,0.2)]"
            >
              {currentProfile.signature}
            </div>

            <div className="text-[10px] font-mono tracking-[0.3em] text-zinc-400">
              OFFICIAL TRIBUTE REGISTRY // MASTER RELEASE 2026
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          INTERACTIVE DOCK & SCRUBBER (PHASES 1-5 + PROFILE SELECTOR)
         ========================================================================= */}
      {showControls && (
        <div className="absolute bottom-4 inset-x-6 z-30 flex flex-col items-center gap-2">
          {/* Phase Progress Bar */}
          <div className="w-full max-w-xl h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5A623] transition-all duration-75"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Phase boundary tick marks */}
            <span className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-white/30" />
            <span className="absolute top-0 bottom-0 left-[44%] w-[1px] bg-white/30" />
            <span className="absolute top-0 bottom-0 left-[68%] w-[1px] bg-white/30" />
            <span className="absolute top-0 bottom-0 left-[86%] w-[1px] bg-white/30" />
          </div>

          {/* Control Strip HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-4xl px-4 py-2 rounded-lg bg-[#08090C]/90 border border-white/10 backdrop-blur-xl shadow-2xl">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPhaseManual(null);
                  setInternalPlaying(!isPlaying);
                }}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-[#F5A623] border border-white/10 transition-colors"
                title={isPlaying ? 'Pause Sequence' : 'Play Sequence'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPhaseManual(null);
                  setInternalTimeSec(0);
                }}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
                title="Restart Sequence"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5-Phase Scrubber Buttons */}
            <div className="flex items-center gap-1">
              {([
                { phase: 1, label: '1. HOOK' },
                { phase: 2, label: '2. BIO' },
                { phase: 3, label: '3. CAPTIONS' },
                { phase: 4, label: '4. CRITIC NOTE' },
                { phase: 5, label: '5. SIGNATURE' }
              ] as const).map(({ phase, label }) => {
                const isCurrent = currentPhase === phase;
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => {
                      setSelectedPhaseManual(phase);
                      // Set corresponding time
                      const phaseTimes = [0, 0, 1.8, 3.5, 5.2, 6.2];
                      setInternalTimeSec(phaseTimes[phase]);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all ${
                      isCurrent
                        ? 'bg-[#F5A623] text-black font-bold shadow-[0_0_10px_rgba(245,166,35,0.5)]'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Profile Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">PROFILE:</span>
              <select
                value={activeProfileId}
                onChange={(e) => {
                  setActiveProfileId(e.target.value);
                  setInternalTimeSec(0);
                  setSelectedPhaseManual(null);
                }}
                className="bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] font-mono text-[#F5A623] focus:outline-none focus:border-[#F5A623]"
              >
                {TRIBUTE_PROFILES.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.performer.split('//')[0].trim()} ({p.hook})
                  </option>
                ))}
              </select>

              {onApplyProfileToFrame && (
                <button
                  type="button"
                  onClick={() => onApplyProfileToFrame(currentProfile)}
                  className="px-2 py-1 rounded bg-[#F5A623]/20 hover:bg-[#F5A623]/30 border border-[#F5A623]/40 text-[#F5A623] text-[10px] font-mono font-bold uppercase transition-colors"
                  title="Apply this tribute profile content to active frame"
                >
                  APPLY TO SHOT
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
