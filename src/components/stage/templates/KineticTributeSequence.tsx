/**
 * @file /src/components/stage/templates/KineticTributeSequence.tsx
 * @description Master 5-Phase Kinetic Tribute Motion Sequence for HANDFILM Cinema Studio.
 * 
 * Strict Cinematic Time-Gating Architecture:
 * - PHASE 1 (0.0s - 1.5s): Render ONLY the hook impact.
 * - PHASE 2 (1.5s - 3.5s): Render ONLY the performer and description bio.
 * - PHASE 3 (3.5s - 5.5s): Render ONLY the visceral captions.
 * - PHASE 4 (5.5s - 7.0s): Render ONLY the critic note.
 * - PHASE 5 (7.0s - 9.0s): Render ONLY the director signature.
 * - After 9.0s: Return null.
 * 
 * Uses Framer Motion's <AnimatePresence mode="wait"> with strict conditional rendering
 * so only ONE phase exists in the DOM at any second, preventing any text overlap.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Film, 
  CheckCircle2
} from 'lucide-react';

export type TributePhase = 1 | 2 | 3 | 4 | 5;

export interface KineticTributeSequenceProps {
  profile?: TributeProfile | string;
  currentTime?: number;
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
  currentTime: currentTimeProp,
  slideTimeSec,
  durationSec = 9.0,
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
  const [activeProfileId, setActiveProfileId] = useState(activeProfile.id);

  // Sync profile when prop changes
  useEffect(() => {
    if (activeProfile && activeProfile.id !== activeProfileId) {
      setActiveProfileId(activeProfile.id);
    }
  }, [activeProfile, activeProfileId]);

  const currentProfile = useMemo(() => {
    return getTributeProfileById(activeProfileId) || activeProfile;
  }, [activeProfileId, activeProfile]);

  const effectiveDuration = Math.max(durationSec, 9.0);
  const isDrivenExternally = currentTimeProp !== undefined || slideTimeSec !== undefined;
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalPlaying;

  // Autonomous animation loop when not driven externally
  useEffect(() => {
    if (isDrivenExternally || !isPlaying) return;

    let animFrame: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setInternalTimeSec((prev) => {
        const next = prev + dt;
        return next >= effectiveDuration ? 0 : next;
      });
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isDrivenExternally, isPlaying, effectiveDuration]);

  // Strictly resolved currentTime in seconds
  const currentTime = useMemo(() => {
    if (typeof currentTimeProp === 'number') return currentTimeProp;
    if (typeof slideTimeSec === 'number') return slideTimeSec;
    return internalTimeSec;
  }, [currentTimeProp, slideTimeSec, internalTimeSec]);

  // Determine current 5-phase animation window
  const currentPhase: TributePhase = useMemo(() => {
    if (activePhaseOverride) return activePhaseOverride;
    if (currentTime >= 0 && currentTime < 1.5) return 1;
    if (currentTime >= 1.5 && currentTime < 3.5) return 2;
    if (currentTime >= 3.5 && currentTime < 5.5) return 3;
    if (currentTime >= 5.5 && currentTime < 7.0) return 4;
    if (currentTime >= 7.0 && currentTime < 9.0) return 5;
    return 5;
  }, [activePhaseOverride, currentTime]);

  // Notify parent on phase change
  useEffect(() => {
    onPhaseChange?.(currentPhase);
  }, [currentPhase, onPhaseChange]);

  const progress = Math.min(1.0, Math.max(0.0, currentTime / effectiveDuration));
  const animType: TributeAnimationType = (currentProfile.defaultAnimation as any) || 'cinematic_breath';

  /**
   * CRITICAL TIME-GATING RENDER LOGIC:
   * Only ONE specific phase exists in the DOM at any given second.
   * If currentTime >= 9.0s, returns null.
   */
  const renderActivePhase = () => {
    // PHASE 1 (0.0s - 1.5s): Render ONLY the hook
    if (currentTime >= 0 && currentTime < 1.5) {
      return (
        <motion.div
          key="phase-1-hook"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full flex flex-col items-center justify-center text-center px-4"
        >
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
        </motion.div>
      );
    }

    // PHASE 2 (1.5s - 3.5s): Render ONLY the performer and description
    if (currentTime >= 1.5 && currentTime < 3.5) {
      return (
        <motion.div
          key="phase-2-performer-bio"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full flex flex-col items-center justify-center text-center px-4"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-3">
            <Award className="w-3 h-3 text-[#F5A623]" />
            PHASE 02 // PERFORMER ICON & BIO
          </div>

          {/* Enforced ALL CAPS Performer Name */}
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-sans drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)] max-w-3xl">
            {currentProfile.performer}
          </h2>

          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#F5A623] to-transparent my-4 shadow-[0_0_8px_rgba(245,166,35,0.8)]" />

          {/* Strictly Max-20-Word Description */}
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
        </motion.div>
      );
    }

    // PHASE 3 (3.5s - 5.5s): Render ONLY the captions
    if (currentTime >= 3.5 && currentTime < 5.5) {
      return (
        <motion.div
          key="phase-3-captions"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full flex flex-col items-center justify-center text-center px-4"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-4">
            <Film className="w-3 h-3 text-[#F5A623]" />
            PHASE 03 // BILINGUAL VISCERAL CAPTIONS
          </div>

          {currentProfile.captions[0] && (
            <div className="mb-4">
              <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#F5A623] tracking-wide drop-shadow-[0_2px_12px_rgba(245,166,35,0.4)]">
                {currentProfile.captions[0]}
              </p>
            </div>
          )}

          {currentProfile.captions[1] && (
            <div className="max-w-xl">
              <p className="text-base sm:text-xl font-mono text-zinc-200 tracking-wider uppercase">
                "{currentProfile.captions[1]}"
              </p>
            </div>
          )}
        </motion.div>
      );
    }

    // PHASE 4 (5.5s - 7.0s): Render ONLY the criticNote
    if (currentTime >= 5.5 && currentTime < 7.0) {
      return (
        <motion.div
          key="phase-4-critic-note"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full flex flex-col items-center justify-center text-center px-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#F5A623]/15 border border-[#F5A623]/50 text-[#F5A623] text-[10px] font-mono tracking-[0.3em] uppercase mb-4 shadow-[0_0_20px_rgba(245,166,35,0.25)]">
            <Quote className="w-3 h-3 text-[#F5A623]" />
            PHASE 04 // CRITIC NOTE // EDITORIAL ACCLAIM
          </div>

          <div className="max-w-2xl px-6 py-5 rounded-xl bg-[#090910]/85 border border-[#F5A623]/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(245,166,35,0.2)] backdrop-blur-xl relative">
            <span className="absolute top-1.5 left-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute top-1.5 right-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-[#F5A623]/60">+</span>
            <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-[#F5A623]/60">+</span>

            <div className="flex items-center justify-center gap-2 text-[#F5A623] mb-2">
              <span className="h-[1px] w-6 bg-[#F5A623]/50" />
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase">CRITICAL VERDICT</span>
              <span className="h-[1px] w-6 bg-[#F5A623]/50" />
            </div>

            <p className="text-xl sm:text-2xl md:text-3xl font-serif italic text-white leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              “{currentProfile.criticNote}”
            </p>

            <div className="mt-3 text-[10px] font-mono text-zinc-400 flex items-center justify-center gap-2">
              <span className="text-[#F5A623]">CINEMA ARCHIVE EVALUATION</span>
              <span>•</span>
              <span>{currentProfile.criticNote.trim().split(/\s+/).filter(Boolean).length} WORDS (MAX 10)</span>
            </div>
          </div>
        </motion.div>
      );
    }

    // PHASE 5 (7.0s - 9.0s): Render ONLY the signature
    if (currentTime >= 7.0 && currentTime < 9.0) {
      return (
        <motion.div
          key="phase-5-signature"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full flex flex-col items-center justify-center text-center px-4"
        >
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase mb-4">
            <CheckCircle2 className="w-3 h-3 text-[#F5A623]" />
            PHASE 05 // DIRECTOR SIGNATURE
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="text-xs font-mono tracking-[0.45em] text-[#F5A623] uppercase">
              DIRECTED & CURATED BY
            </div>

            <div className="text-2xl sm:text-4xl md:text-5xl font-black tracking-[0.25em] text-white font-mono uppercase border-y border-[#F5A623]/40 py-2 px-6 shadow-[0_0_20px_rgba(245,166,35,0.2)]">
              {currentProfile.signature}
            </div>

            <div className="text-[10px] font-mono tracking-[0.3em] text-zinc-400">
              OFFICIAL TRIBUTE REGISTRY // MASTER RELEASE 2026
            </div>
          </div>
        </motion.div>
      );
    }

    // After 9.0s: Return null
    return null;
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
          <span className="text-[#F5A623] font-bold tabular-nums">PHASE {currentTime < 9.0 ? currentPhase : 'COMPLETE'}/5</span>
          <span className="text-zinc-500 tabular-nums">{(currentTime).toFixed(2)}s / {effectiveDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* =========================================================================
          THE STRICTLY TIME-GATED KINETIC DISPLAY: ONLY ONE PHASE AT A TIME
         ========================================================================= */}
      <div className="relative w-full max-w-4xl px-6 min-h-[360px] flex items-center justify-center text-center z-10">
        <AnimatePresence mode="wait">
          {renderActivePhase()}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          INTERACTIVE DOCK & SCRUBBER (PHASES 1-5 + PROFILE SELECTOR)
         ========================================================================= */}
      {showControls && (
        <div className="absolute bottom-4 inset-x-6 z-30 flex flex-col items-center gap-2">
          {/* Phase Progress Bar with 5 Phase Ticks */}
          <div className="w-full max-w-xl h-1 bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F5A623] transition-all duration-75"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Phase boundary tick marks: 1.5s/9s (16.7%), 3.5s/9s (38.9%), 5.5s/9s (61.1%), 7.0s/9s (77.8%) */}
            <span className="absolute top-0 bottom-0 left-[16.67%] w-[1px] bg-white/30" title="1.5s - Bio" />
            <span className="absolute top-0 bottom-0 left-[38.89%] w-[1px] bg-white/30" title="3.5s - Captions" />
            <span className="absolute top-0 bottom-0 left-[61.11%] w-[1px] bg-white/30" title="5.5s - Critic Note" />
            <span className="absolute top-0 bottom-0 left-[77.78%] w-[1px] bg-white/30" title="7.0s - Signature" />
          </div>

          {/* Control Strip HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-4xl px-4 py-2 rounded-lg bg-[#08090C]/90 border border-white/10 backdrop-blur-xl shadow-2xl">
            {/* Play/Pause & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInternalPlaying(!isPlaying)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-[#F5A623] border border-white/10 transition-colors cursor-pointer"
                title={isPlaying ? 'Pause Sequence' : 'Play Sequence'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setInternalTimeSec(0)}
                className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Restart Sequence"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5-Phase Scrubber Buttons */}
            <div className="flex items-center gap-1">
              {([
                { phase: 1, label: '1. HOOK', jumpTime: 0.5 },
                { phase: 2, label: '2. BIO', jumpTime: 2.2 },
                { phase: 3, label: '3. CAPTIONS', jumpTime: 4.2 },
                { phase: 4, label: '4. CRITIC NOTE', jumpTime: 6.0 },
                { phase: 5, label: '5. SIGNATURE', jumpTime: 7.8 }
              ] as const).map(({ phase, label, jumpTime }) => {
                const isCurrent = currentPhase === phase && currentTime < 9.0;
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => {
                      setInternalTimeSec(jumpTime);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
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
                }}
                className="bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] font-mono text-[#F5A623] focus:outline-none focus:border-[#F5A623] cursor-pointer"
              >
                {TRIBUTE_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.performer.split('//')[0].trim()} ({p.hook})
                  </option>
                ))}
              </select>

              {onApplyProfileToFrame && (
                <button
                  type="button"
                  onClick={() => onApplyProfileToFrame(currentProfile)}
                  className="px-2 py-1 rounded bg-[#F5A623]/20 hover:bg-[#F5A623]/30 border border-[#F5A623]/40 text-[#F5A623] text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer"
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
