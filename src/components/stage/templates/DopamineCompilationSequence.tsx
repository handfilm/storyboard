/**
 * @file /src/components/stage/templates/DopamineCompilationSequence.tsx
 * @description Master [ 🌪️ DOPAMINE ENGINE ] — Modular Kinetic Animation Engine for Rapid Video Compilations.
 * 
 * Strict Cinematic Time-Gating Architecture (0.0s - 2.3s):
 * 1. The Subliminal Flash (0.0s - 0.3s): Massive, screen-filling Hook text strobing rapidly at `strobeRate` ms.
 * 2. The Rhythmic Kinetic Slide (0.3s - 2.0s): Aggressive scale-up with anamorphic horizontal stretch reacting to `motionSpeed`.
 * 3. The Glitch Exit (2.0s - 2.3s): High-frequency RGB split & chromatic aberration driven by `glitchIntensity`.
 * 4. After 2.3s: Returns null (strictly unmounted).
 * 
 * New Features:
 * - `audioBeatSync`: Rhythmic audio-beat reactivity synced to timeline musical pulses.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Radio, Activity } from 'lucide-react';

export interface DopamineCompilationSequenceProps {
  hookText: string;
  subText: string;
  glitchIntensity: number; // 0 - 100
  strobeRate: number;      // in milliseconds (e.g. 20 - 200)
  motionSpeed: number;     // speed multiplier (e.g. 0.8 - 2.5)
  audioBeatSync?: boolean; // Audio-beat sync reactivity
  currentTime?: number;    // Feeds from StagePlayer or playhead
  durationSec?: number;    // Sequence runtime boundary (default 2.3s)
  isPlaying?: boolean;
  scale?: number;
  accentColor?: string;
  className?: string;
  showTelemetry?: boolean;
}

export type DopaminePhase = 1 | 2 | 3 | 'IDLE';

export const DopamineCompilationSequence: React.FC<DopamineCompilationSequenceProps> = ({
  hookText = 'PURE RHYTHM',
  subText = 'Visual Physics at Work.',
  glitchIntensity = 80,
  strobeRate = 60,
  motionSpeed = 1.5,
  audioBeatSync = true,
  currentTime: externalCurrentTime,
  durationSec = 2.3,
  isPlaying: externalIsPlaying,
  scale = 1.0,
  accentColor = '#FF2B2B',
  className = '',
  showTelemetry = false
}) => {
  // Internal autonomous clock if currentTime is not supplied externally
  const [internalTime, setInternalTime] = useState(0);
  const [internalPlaying, setInternalPlaying] = useState(true);

  const isControlledExternally = typeof externalCurrentTime === 'number';
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalPlaying;

  // Autonomous animation loop (0.0s -> 2.3s loop)
  useEffect(() => {
    if (isControlledExternally || !isPlaying) return;

    let animFrame: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setInternalTime((prev) => {
        const next = prev + dt;
        return next >= durationSec ? 0 : next;
      });
      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, [isControlledExternally, isPlaying, durationSec]);

  // Active time in seconds
  const activeTime = isControlledExternally ? (externalCurrentTime ?? 0) : internalTime;

  // Derive current phase
  const currentPhase: DopaminePhase = useMemo(() => {
    if (activeTime >= 0.0 && activeTime < 0.3) return 1;
    if (activeTime >= 0.3 && activeTime < 2.0) return 2;
    if (activeTime >= 2.0 && activeTime < 2.3) return 3;
    return 'IDLE';
  }, [activeTime]);

  // Audio-beat pulse simulation (130 BPM tempo = 0.4615s per beat, 0.2307s per eighth note)
  const beatImpulse = useMemo(() => {
    if (!audioBeatSync) return 0;
    const beatPeriod = 0.4615; // 130 BPM beat interval
    const timeInPeriod = activeTime % beatPeriod;
    // Exponential envelope: explosive spike on beat hit, decaying over 120ms
    const hit = Math.exp(-timeInPeriod * 14);
    return hit;
  }, [audioBeatSync, activeTime]);

  // Strobe toggle calculation based on strobeRate (ms)
  const isStrobeWhite = useMemo(() => {
    if (currentPhase !== 1) return false;
    const safeRate = Math.max(20, strobeRate);
    const tick = Math.floor((activeTime * 1000) / safeRate);
    return tick % 2 === 0;
  }, [activeTime, currentPhase, strobeRate]);

  // Chromatic split offset in pixels for Glitch Exit
  const chromaticOffset = useMemo(() => {
    const baseOffset = Math.max(1, (glitchIntensity / 100) * 16);
    const beatBoost = audioBeatSync ? beatImpulse * 8 : 0;
    return baseOffset + beatBoost;
  }, [glitchIntensity, audioBeatSync, beatImpulse]);

  /**
   * CRITICAL TIME-GATING:
   * Only ONE phase exists in the DOM at any given second.
   */
  const renderPhase = () => {
    // -------------------------------------------------------------
    // PHASE 1: THE SUBLIMINAL FLASH (0.0s - 0.3s)
    // -------------------------------------------------------------
    if (activeTime >= 0.0 && activeTime < 0.3) {
      const beatFlashBoost = audioBeatSync ? (beatImpulse * 0.2) : 0;
      return (
        <motion.div
          key="dopamine-phase-1-subliminal-flash"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ 
            opacity: Math.min(1, (isStrobeWhite ? 1 : 0.25) + beatFlashBoost), 
            scale: (isStrobeWhite ? 1.05 : 1.0) + (audioBeatSync ? beatImpulse * 0.06 : 0)
          }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.04 }}
          className="relative w-full h-full flex flex-col items-center justify-center text-center px-4"
        >
          {/* Intense Strobe Screen Flash */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-75"
            style={{
              backgroundColor: isStrobeWhite ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              boxShadow: isStrobeWhite 
                ? `inset 0 0 120px ${accentColor}90` 
                : (audioBeatSync && beatImpulse > 0.4 ? `inset 0 0 60px ${accentColor}40` : 'none')
            }}
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono tracking-[0.35em] uppercase mb-4 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current" />
            <span>SUBLIMINAL FLASH // {strobeRate}MS</span>
            {audioBeatSync && (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-red-500/30 text-red-300 text-[8px] font-bold">
                BEAT SYNC
              </span>
            )}
          </div>

          {/* Screen-filling Monumental Word */}
          <h1 
            className="text-6xl sm:text-8xl md:text-9xl font-black uppercase tracking-tighter select-none font-sans leading-none"
            style={{
              color: isStrobeWhite ? '#FFFFFF' : accentColor,
              textShadow: isStrobeWhite
                ? `0 0 40px #FFFFFF, 0 0 80px ${accentColor}`
                : `0 0 25px ${accentColor}`,
              letterSpacing: '-0.04em'
            }}
          >
            {hookText}
          </h1>

          <div className="mt-3 text-[11px] font-mono tracking-[0.3em] text-white/70 uppercase">
            [ INITIAL FREQUENCY STROBE ]
          </div>
        </motion.div>
      );
    }

    // -------------------------------------------------------------
    // PHASE 2: THE RHYTHMIC KINETIC SLIDE (0.3s - 2.0s)
    // -------------------------------------------------------------
    if (activeTime >= 0.3 && activeTime < 2.0) {
      const normalizedPhaseT = (activeTime - 0.3) / 1.7; // 0 to 1
      const baseKineticScale = 1.0 + (0.28 * motionSpeed * normalizedPhaseT);
      const beatScaleKick = audioBeatSync ? (beatImpulse * 0.12 * motionSpeed) : 0;
      const kineticScale = baseKineticScale + beatScaleKick;
      
      const stretchX = 1.0 + (0.18 * motionSpeed * (1 - normalizedPhaseT * 0.5)) + (audioBeatSync ? beatImpulse * 0.08 : 0);

      return (
        <motion.div
          key="dopamine-phase-2-kinetic-slide"
          initial={{ opacity: 0, scale: 0.85, scaleX: 1.3, y: 30 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            scaleX: stretchX, 
            y: 0 
          }}
          exit={{ opacity: 0, scale: 1.1, y: -20 }}
          transition={{ duration: 0.25 / motionSpeed, ease: 'easeOut' }}
          className="relative w-full h-full flex flex-col items-center justify-center text-center px-6 max-w-4xl"
          style={{
            transform: `scale(${kineticScale}) scaleX(${stretchX})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Anamorphic Horizontal Glow Streak with Audio-Beat Expansion */}
          <div 
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none transition-all duration-75"
            style={{
              height: audioBeatSync && beatImpulse > 0.3 ? '4px' : '2px',
              opacity: 0.6 + (audioBeatSync ? beatImpulse * 0.4 : 0),
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
              boxShadow: `0 0 ${20 + (audioBeatSync ? beatImpulse * 30 : 0)}px ${accentColor}`
            }}
          />

          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono tracking-[0.25em] text-zinc-300 uppercase mb-4 backdrop-blur-md">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>RHYTHMIC KINETIC SLIDE // {motionSpeed.toFixed(1)}X SPEED</span>
            {audioBeatSync && (
              <span className="flex items-center gap-1 text-[8.5px] text-red-400 font-bold ml-1">
                <Activity className="w-2.5 h-2.5 animate-pulse" />
                BEAT LOCKED
              </span>
            )}
          </div>

          {/* Aggressively scaled typography reactive to beats */}
          <h2 
            className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-sans transition-all duration-75"
            style={{
              letterSpacing: '-0.02em',
              textShadow: audioBeatSync && beatImpulse > 0.3
                ? `0 0 ${35 + beatImpulse * 25}px ${accentColor}, 0 0 10px #FFFFFF`
                : `0 0 25px ${accentColor}60`
            }}
          >
            {hookText}
          </h2>

          <div 
            className="w-32 h-[2px] my-4 shadow-lg transition-all duration-75"
            style={{
              width: audioBeatSync && beatImpulse > 0.3 ? '180px' : '128px',
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
            }}
          />

          {/* SubText with brutalist cinematic capsule */}
          <div className="max-w-xl px-5 py-2.5 rounded-lg bg-black/80 border border-white/10 backdrop-blur-xl shadow-2xl">
            <p className="text-base sm:text-xl font-mono text-zinc-200 uppercase tracking-widest font-semibold">
              {subText}
            </p>
          </div>
        </motion.div>
      );
    }

    // -------------------------------------------------------------
    // PHASE 3: THE GLITCH EXIT (2.0s - 2.3s)
    // -------------------------------------------------------------
    if (activeTime >= 2.0 && activeTime < 2.3) {
      return (
        <motion.div
          key="dopamine-phase-3-glitch-exit"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ 
            opacity: [1, 0.8, 1, 0.4, 0],
            x: [0, -chromaticOffset, chromaticOffset, -chromaticOffset * 0.5, 0],
            y: [0, 3, -3, 2, 0]
          }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative w-full h-full flex flex-col items-center justify-center text-center px-4"
        >
          {/* Glitch Scanlines */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-40 z-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 2px, transparent 2px, transparent 4px)'
            }}
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/60 border border-red-500/50 text-red-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-spin" />
            <span>CHROMATIC GLITCH DISPLACEMENT // INTENSITY: {glitchIntensity}%</span>
          </div>

          {/* Dual RGB Aberration Layers */}
          <div className="relative select-none">
            {/* Cyan Offset Channel */}
            <h1 
              aria-hidden="true"
              className="absolute inset-0 text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-cyan-400 opacity-80 mix-blend-screen pointer-events-none"
              style={{
                transform: `translate(-${chromaticOffset}px, ${chromaticOffset * 0.3}px)`,
                filter: 'blur(0.5px)'
              }}
            >
              {hookText}
            </h1>

            {/* Red / Magenta Offset Channel */}
            <h1 
              aria-hidden="true"
              className="absolute inset-0 text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-rose-500 opacity-80 mix-blend-screen pointer-events-none"
              style={{
                transform: `translate(${chromaticOffset}px, -${chromaticOffset * 0.3}px)`,
                filter: 'blur(0.5px)'
              }}
            >
              {hookText}
            </h1>

            {/* Master Center Text */}
            <h1 
              className="relative text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-white font-sans"
              style={{
                textShadow: `-${chromaticOffset}px 0 #00ffff, ${chromaticOffset}px 0 #ff0055`
              }}
            >
              {hookText}
            </h1>
          </div>

          <div className="mt-4 text-xs font-mono tracking-[0.25em] text-red-300 uppercase">
            [ TRANSIENT RESOLUTION ]
          </div>
        </motion.div>
      );
    }

    // After 2.3s: return null
    return null;
  };

  return (
    <div 
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
    >
      {/* Dynamic Background Volumetric Atmospheric Flare */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}25 0%, rgba(10, 10, 18, 0.85) 60%, rgba(5, 5, 8, 0.98) 100%)`
        }}
      />

      {/* Optional Telemetry Overlay */}
      {showTelemetry && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between text-[9px] font-mono text-zinc-400 pointer-events-none z-30">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-400 font-bold">[ 🌪️ DOPAMINE ENGINE ]</span>
          </div>
          <div className="flex items-center gap-2">
            <span>PHASE: <strong className="text-white">{currentPhase}</strong></span>
            <span>TIME: <strong className="text-white">{activeTime.toFixed(2)}s</strong> / {durationSec.toFixed(1)}s</span>
            <span>SPEED: <strong className="text-amber-400">{motionSpeed.toFixed(1)}x</strong></span>
            {audioBeatSync && <span className="text-red-400 font-bold">♪ BEAT-SYNC</span>}
          </div>
        </div>
      )}

      {/* Strictly Time-Gated Phase Display */}
      <div className="relative w-full max-w-4xl px-4 min-h-[300px] flex items-center justify-center text-center z-10">
        <AnimatePresence mode="wait">
          {renderPhase()}
        </AnimatePresence>
      </div>
    </div>
  );
};
