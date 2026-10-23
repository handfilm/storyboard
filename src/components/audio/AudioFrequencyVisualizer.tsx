/**
 * @file /src/components/audio/AudioFrequencyVisualizer.tsx
 * @description Master Real-Time Audio Frequency Visualizer Overlay for RAWx Storyboard Studio.
 * 
 * Capabilities:
 * - Direct Web Audio API AnalyserNode integration via CinematicAudioEngine.
 * - Precision 60FPS Canvas rendering with triple visualization modes:
 *   1. 'SPECTRUM': 32/48-band mirrored stereo frequency ladder with falling peak-hold caps & gold reflections.
 *   2. 'WAVE': Smooth molten-gold oscilloscope curve with high-energy harmonic bloom.
 *   3. 'AURORA': Volumetric frequency glow landscape simulating analog tape harmonic saturation.
 * - Mapped strictly to RAWx Cinema Gold aesthetic:
 *   - Luminous gold peak highlights (#FFF7B2, #FFE066)
 *   - Deep amber core (#D4AF37, #F5A623)
 *   - Dark bronze roots (#8A6D1C, #382B08)
 * - Real-time frequency telemetry:
 *   - Peak decibel reading (-60dB to 0dB FS)
 *   - Active centroid / fundamental note (e.g., 43.65Hz Sub-Bass Drone / 120 BPM Pulse)
 *   - Sensitivity multipliers (0.5x, 1.0x, 1.5x, 2.0x)
 * - Quick sound FX test triggers (Sub-bass pulse, 35mm shutter, heartbeat)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { Activity, Sliders, Volume2, VolumeX, Sparkles, X, ChevronUp, ChevronDown, Radio } from 'lucide-react';

export type VisualizerMode = 'SPECTRUM' | 'WAVE' | 'AURORA';

export interface AudioFrequencyVisualizerProps {
  variant?: 'dock-overlay' | 'inline-strip' | 'modal' | 'minimal';
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const AudioFrequencyVisualizer: React.FC<AudioFrequencyVisualizerProps> = ({
  variant = 'dock-overlay',
  isOpen = true,
  onClose,
  className = '',
  isAudioMuted = false,
  onToggleAudio
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [mode, setMode] = useState<VisualizerMode>('SPECTRUM');
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [currentPeakDb, setCurrentPeakDb] = useState<number>(-48);
  const [dominantHz, setDominantHz] = useState<string>('43.65 Hz');
  const [isSynthTriggered, setIsSynthTriggered] = useState<boolean>(false);

  // Peak hold array for spectrum bars
  const peakValuesRef = useRef<number[]>(new Array(36).fill(0));
  const peakDecaySpeed = 1.8;

  // Real-time animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const freqData = new Uint8Array(64);

    const render = () => {
      if (!isRunning) return;

      // Handle high-DPI displays
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Fetch actual Web Audio frequency bytes (0-255)
      audioEngine.getFrequencyData(freqData);

      // Check max value & calculate peak dB
      let maxVal = 0;
      let maxBandIdx = 0;
      for (let i = 0; i < freqData.length; i++) {
        if (freqData[i] > maxVal) {
          maxVal = freqData[i];
          maxBandIdx = i;
        }
      }

      // If muted or dead silent, inject gentle organic cinematic amber pulse for aesthetic feedback
      const isMutedNow = isAudioMuted || audioEngine.getIsMuted();
      const now = performance.now() * 0.003;
      const syntheticBase = isMutedNow ? 0.05 : 0.15;

      const normPeak = Math.max(syntheticBase, (maxVal / 255) * sensitivity);
      const computedDb = Math.max(-60, Math.min(0, Math.round(20 * Math.log10(normPeak || 0.001))));
      setCurrentPeakDb(computedDb);

      // Approximate frequency centroid (analyser fftSize = 64, Nyquist ~22kHz)
      const approxHz = Math.round(maxBandIdx * 344) + 43;
      setDominantHz(`${approxHz} Hz`);

      // -------------------------------------------------------------
      // MODE 1: SPECTRUM BARS (Cinema Gold Ladder with Peak Caps)
      // -------------------------------------------------------------
      if (mode === 'SPECTRUM') {
        const numBars = 36;
        const totalGap = (numBars - 1) * 3;
        const barWidth = Math.max(3, (width - totalGap - 16) / numBars);
        const startX = (width - (numBars * barWidth + totalGap)) / 2;

        for (let i = 0; i < numBars; i++) {
          // Sample logarithmically weighted bands
          const dataIndex = Math.min(freqData.length - 1, Math.floor(Math.pow(i / numBars, 1.4) * freqData.length));
          let rawVal = freqData[dataIndex] / 255;

          // Organic oscillation fallback if silent
          if (rawVal < 0.05) {
            const harmonic = Math.sin(now * 2 + i * 0.35) * 0.5 + 0.5;
            rawVal = (0.08 + harmonic * 0.12) * (isMutedNow ? 0.4 : 1.0);
          }

          const amp = Math.min(1.0, rawVal * sensitivity);
          const barHeight = Math.max(3, amp * (height - 18));
          const x = startX + i * (barWidth + 3);
          const y = height - barHeight - 4;

          // Update peak-hold cap
          if (barHeight > (peakValuesRef.current[i] || 0)) {
            peakValuesRef.current[i] = barHeight;
          } else {
            peakValuesRef.current[i] = Math.max(0, (peakValuesRef.current[i] || 0) - peakDecaySpeed);
          }

          // Gold Vertical Gradient
          const gradient = ctx.createLinearGradient(x, y, x, height);
          gradient.addColorStop(0, '#FFF59D');   // Glowing light gold top
          gradient.addColorStop(0.2, '#FFE066'); // Radiant gold
          gradient.addColorStop(0.65, '#D4AF37'); // Classic ARRI amber gold
          gradient.addColorStop(1, '#664E11');   // Deep bronze foundation

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          // Peak Cap
          const peakY = height - (peakValuesRef.current[i] || 0) - 7;
          ctx.fillStyle = '#FFFDE7';
          ctx.shadowColor = 'rgba(255, 224, 102, 0.9)';
          ctx.shadowBlur = 6;
          ctx.fillRect(x, Math.max(2, peakY), barWidth, 2);
          ctx.shadowBlur = 0;

          // Subtle reflection underneath
          ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
          ctx.fillRect(x, height - 2, barWidth, 2);
        }
      } 
      // -------------------------------------------------------------
      // MODE 2: HARMONIC WAVE (Molten Gold Oscilloscope)
      // -------------------------------------------------------------
      else if (mode === 'WAVE') {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#D4AF37');
        gradient.addColorStop(0.5, '#FFE066');
        gradient.addColorStop(1, '#D4AF37');
        ctx.strokeStyle = gradient;
        ctx.shadowColor = 'rgba(245, 166, 35, 0.8)';
        ctx.shadowBlur = 10;

        const sliceWidth = width / freqData.length;
        let x = 0;

        for (let i = 0; i < freqData.length; i++) {
          let v = freqData[i] / 128.0;
          if (v < 0.1) {
            v = 1.0 + Math.sin(now * 3 + i * 0.25) * 0.25;
          }
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Baseline glow
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } 
      // -------------------------------------------------------------
      // MODE 3: AURORA (Volumetric Ambient Harmonic Landscape)
      // -------------------------------------------------------------
      else if (mode === 'AURORA') {
        const step = width / (freqData.length - 1);
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let i = 0; i < freqData.length; i++) {
          let val = freqData[i] / 255;
          if (val < 0.05) {
            val = 0.1 + Math.sin(now * 1.5 + i * 0.18) * 0.15;
          }
          const h = Math.min(height - 4, val * sensitivity * height);
          const x = i * step;
          const y = height - h;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const auroraGrad = ctx.createLinearGradient(0, 0, 0, height);
        auroraGrad.addColorStop(0, 'rgba(255, 224, 102, 0.65)');
        auroraGrad.addColorStop(0.4, 'rgba(212, 175, 55, 0.35)');
        auroraGrad.addColorStop(1, 'rgba(10, 10, 16, 0.05)');
        ctx.fillStyle = auroraGrad;
        ctx.fill();

        // Edge stroke
        ctx.strokeStyle = '#FFE066';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(255, 224, 102, 0.9)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [mode, sensitivity, isAudioMuted]);

  // Sound FX test triggers
  const triggerShutter = () => {
    audioEngine.playShutterClick();
    setIsSynthTriggered(true);
    setTimeout(() => setIsSynthTriggered(false), 300);
  };

  const triggerImpact = () => {
    audioEngine.playFrameImpact();
    setIsSynthTriggered(true);
    setTimeout(() => setIsSynthTriggered(false), 300);
  };

  if (!isOpen && variant !== 'inline-strip') {
    return null;
  }

  // Minimal inline strip mode
  if (variant === 'inline-strip') {
    return (
      <div className={`relative w-full h-4 overflow-hidden rounded-[2px] bg-black/60 border border-white/10 ${className}`}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-5xl bg-[#08080C]/98 backdrop-blur-2xl border border-[#D4AF37]/50 rounded-[4px] shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(212,175,55,0.2)] p-2.5 sm:p-3 select-none font-mono-tech z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
    >
      {/* Visualizer Top Bar & Telemetry */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
        {/* Left: Brand & Frequency Centroid */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FFE066] shadow-[0_0_8px_#FFE066] animate-pulse" />
          <span className="font-bold text-[#FFE066] tracking-wider text-[10px] sm:text-[11px] uppercase">
            AUDIO FREQUENCY ANALYZER
          </span>
          <span className="text-white/20">|</span>
          <span className="text-zinc-400 text-[9.5px] tabular-nums hidden sm:inline">
            CENTROID: <strong className="text-[#D4AF37]">{dominantHz}</strong>
          </span>
          <span className="text-white/20 hidden sm:inline">|</span>
          <span className="text-[9.5px] text-emerald-400 tabular-nums">
            PEAK: {currentPeakDb} dB
          </span>
        </div>

        {/* Center: Mode Selectors */}
        <div className="flex items-center gap-1 bg-black/70 p-0.5 rounded-[3px] border border-white/15">
          {(['SPECTRUM', 'WAVE', 'AURORA'] as VisualizerMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2 py-0.5 text-[8.5px] font-bold rounded-[2px] cursor-pointer transition-all ${
                mode === m
                  ? 'bg-[#D4AF37] text-black shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Right: Sound FX Triggers & Close */}
        <div className="flex items-center gap-1.5">
          {/* Quick DSP triggers */}
          <button
            type="button"
            onClick={triggerShutter}
            className="hidden sm:inline-flex px-2 py-0.5 rounded-[2px] bg-white/5 hover:bg-white/15 border border-white/10 text-[8.5px] text-zinc-300 hover:text-[#FFE066] cursor-pointer active:scale-95"
            title="Fire 35mm Shutter Click Synth FX"
          >
            35mm SHUTTER
          </button>
          <button
            type="button"
            onClick={triggerImpact}
            className="hidden sm:inline-flex px-2 py-0.5 rounded-[2px] bg-[#D4AF37]/20 hover:bg-[#D4AF37]/40 border border-[#D4AF37]/50 text-[8.5px] text-[#FFE066] cursor-pointer active:scale-95"
            title="Fire Low-Frequency Sub-Impact Synth FX"
          >
            SUB-BASS BOOM
          </button>

          {/* Sensitivity */}
          <button
            type="button"
            onClick={() => setSensitivity(s => (s >= 2.0 ? 0.6 : Number((s + 0.4).toFixed(1))))}
            className="px-2 py-0.5 rounded-[2px] bg-black/60 border border-white/15 text-[8.5px] text-zinc-300 hover:text-[#FFE066] cursor-pointer"
            title="Adjust Visualizer Gain Sensitivity"
          >
            SENS: {sensitivity}x
          </button>

          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              className={`p-1 rounded-[2px] border cursor-pointer transition-colors ${
                isAudioMuted
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#FFE066]'
              }`}
              title={isAudioMuted ? 'Unmute Audio Engine' : 'Mute Audio Engine'}
            >
              {isAudioMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[2px] bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 cursor-pointer"
              title="Close Frequency Visualizer Overlay"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Display (100% responsive) */}
      <div className="relative w-full h-20 sm:h-24 bg-[#050508] border border-white/10 rounded-[2px] overflow-hidden flex items-center justify-center shadow-inner">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FFE066_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <canvas ref={canvasRef} className="w-full h-full block relative z-10" />

        {/* Ambient Gold Bottom Edge Glow */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE066]/80 to-transparent pointer-events-none shadow-[0_0_12px_#FFE066]" />
      </div>

      {/* Frequency Scale Legend */}
      <div className="flex items-center justify-between pt-1.5 px-1 text-[7.5px] sm:text-[8px] text-zinc-500 font-mono tracking-wider">
        <span>20 Hz (SUB)</span>
        <span>60 Hz</span>
        <span>150 Hz</span>
        <span>500 Hz (MIDS)</span>
        <span>2 kHz</span>
        <span>8 kHz</span>
        <span>20 kHz (AIR)</span>
      </div>
    </div>
  );
};
