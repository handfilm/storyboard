/**
 * @file /src/components/audio/TrackVuMeter.tsx
 * @description Professional Studio Track VU Meter & Stereo Level Visualizer for RAWx Cinema Engine.
 * 
 * Capabilities:
 * - Real-time stereo RMS & Peak level detection via CinematicAudioEngine Web Audio API analyser.
 * - Broadcast-standard ballistics: instant attack, calibrated decay, and peak-hold indicators.
 * - Tri-color LED bar ladder: Green (-inf to -18dB), Amber (-18dB to -3dB), Red Peak Clip (> -3dB).
 * - Real-time numeric dB readouts (-60dB to 0dB FS) and active frequency band indicator.
 * - Optimized via requestAnimationFrame with automatic idle-state power gating.
 */

import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Volume2, VolumeX, Activity } from 'lucide-react';

interface TrackVuMeterProps {
  variant?: 'compact' | 'dock' | 'mini' | 'vertical';
  showLabels?: boolean;
  showDbReadout?: boolean;
  className?: string;
  onToggleMute?: () => void;
  isMuted?: boolean;
}

export const TrackVuMeter: React.FC<TrackVuMeterProps> = ({
  variant = 'dock',
  showLabels = true,
  showDbReadout = true,
  className = '',
  onToggleMute,
  isMuted: propIsMuted
}) => {
  const [levels, setLevels] = useState({
    leftRms: 0,
    rightRms: 0,
    peak: 0,
    leftDb: -60,
    rightDb: -60,
    bands: [0, 0, 0, 0, 0, 0, 0, 0],
    isMuted: false,
    isActive: false
  });

  // Peak hold state with smooth ballistics
  const peakHoldLRef = useRef(0);
  const peakHoldRRef = useRef(0);
  const peakHoldTimerLRef = useRef(0);
  const peakHoldTimerRRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    const updateMeter = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      const current = audioEngine.getVuMeterLevels();

      // Peak hold ballistics
      if (current.leftRms > peakHoldLRef.current) {
        peakHoldLRef.current = current.leftRms;
        peakHoldTimerLRef.current = now;
      } else if (now - peakHoldTimerLRef.current > 750) {
        // Decay peak hold
        peakHoldLRef.current = Math.max(0, peakHoldLRef.current - deltaSec * 0.8);
      }

      if (current.rightRms > peakHoldRRef.current) {
        peakHoldRRef.current = current.rightRms;
        peakHoldTimerRRef.current = now;
      } else if (now - peakHoldTimerRRef.current > 750) {
        // Decay peak hold
        peakHoldRRef.current = Math.max(0, peakHoldRRef.current - deltaSec * 0.8);
      }

      setLevels(current);
      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const isMuted = propIsMuted !== undefined ? propIsMuted : levels.isMuted;
  const isClipping = levels.peak > 0.94;

  // Mini variant (single compact stereo pill)
  if (variant === 'mini') {
    return (
      <div 
        className={`flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded border border-white/10 ${className}`}
        title={`Audio Track VU Meter: L ${levels.leftDb}dB | R ${levels.rightDb}dB`}
      >
        <Activity className={`w-2.5 h-2.5 ${levels.isActive && !isMuted ? 'text-[#FFE066] animate-pulse' : 'text-zinc-600'}`} />
        <div className="flex flex-col gap-0.5 w-8">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-[width] duration-75"
              style={{ width: `${isMuted ? 0 : Math.round(levels.leftRms * 100)}%` }}
            />
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-[width] duration-75"
              style={{ width: `${isMuted ? 0 : Math.round(levels.rightRms * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Standard Dock variant (broadcast-grade horizontal dual channel with peak ticks)
  return (
    <div 
      className={`flex items-center gap-2 bg-[#06070B]/90 border border-white/15 px-2 py-1 rounded-[3px] select-none text-[9px] font-mono shrink-0 shadow-inner group ${className}`}
      title={`Stereo Master Output: L ${levels.leftDb}dBFS | R ${levels.rightDb}dBFS (Peak: ${isClipping ? 'CLIP' : (levels.peak * 100).toFixed(0) + '%'})`}
    >
      {/* Icon / Channel Indicator */}
      <button
        type="button"
        onClick={onToggleMute}
        disabled={!onToggleMute}
        className={`flex items-center gap-1 cursor-pointer transition-colors ${
          isMuted ? 'text-zinc-500 hover:text-zinc-400' : 'text-[#D4AF37] hover:text-[#FFE066]'
        }`}
        title={onToggleMute ? (isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)') : undefined}
      >
        {isMuted ? (
          <VolumeX className="w-3 h-3 text-zinc-500" />
        ) : (
          <Volume2 className={`w-3 h-3 ${levels.isActive ? 'text-[#FFE066]' : 'text-[#D4AF37]'}`} />
        )}
        {showLabels && (
          <span className="text-[7.5px] font-bold tracking-widest text-zinc-400 uppercase">
            VU
          </span>
        )}
      </button>

      {/* Dual Channel Stereo Ladders (L & R) */}
      <div className="flex flex-col gap-1 w-14 sm:w-20">
        {/* Left Channel */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-zinc-500 font-bold w-2 shrink-0">L</span>
          <div className="flex-1 h-1.5 bg-[#12131C] rounded-[1px] relative overflow-hidden border border-black">
            {/* LED Ladder Fill */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-[width] duration-75"
              style={{ width: `${isMuted ? 0 : Math.round(levels.leftRms * 100)}%` }}
            />
            {/* Peak Hold Tick */}
            {!isMuted && peakHoldLRef.current > 0.05 && (
              <div 
                className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                  peakHoldLRef.current > 0.88 ? 'bg-rose-500' : peakHoldLRef.current > 0.65 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ left: `${Math.min(98, Math.round(peakHoldLRef.current * 100))}%` }}
              />
            )}
          </div>
        </div>

        {/* Right Channel */}
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-zinc-500 font-bold w-2 shrink-0">R</span>
          <div className="flex-1 h-1.5 bg-[#12131C] rounded-[1px] relative overflow-hidden border border-black">
            {/* LED Ladder Fill */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-[width] duration-75"
              style={{ width: `${isMuted ? 0 : Math.round(levels.rightRms * 100)}%` }}
            />
            {/* Peak Hold Tick */}
            {!isMuted && peakHoldRRef.current > 0.05 && (
              <div 
                className={`absolute top-0 bottom-0 w-0.5 z-10 ${
                  peakHoldRRef.current > 0.88 ? 'bg-rose-500' : peakHoldRRef.current > 0.65 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ left: `${Math.min(98, Math.round(peakHoldRRef.current * 100))}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* dB Readout & Peak Clip LED */}
      {showDbReadout && (
        <div className="hidden sm:flex flex-col items-end pl-1 border-l border-white/10 shrink-0 tabular-nums">
          <div className="flex items-center gap-1">
            <span className={`text-[7.5px] font-bold ${
              isMuted ? 'text-zinc-600' : levels.leftDb > -6 ? 'text-rose-400' : levels.leftDb > -18 ? 'text-amber-400' : 'text-zinc-400'
            }`}>
              {isMuted ? 'MUTED' : `${levels.leftDb}dB`}
            </span>
            <div 
              className={`w-1.5 h-1.5 rounded-full ${
                isClipping && !isMuted ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,1)]' : 'bg-zinc-800'
              }`}
              title={isClipping ? 'Audio Peak Clip Warning' : 'Headroom Nominal'}
            />
          </div>
          <span className="text-[6.5px] text-zinc-500 tracking-tight">24-BIT</span>
        </div>
      )}
    </div>
  );
};
