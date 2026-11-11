/**
 * @file /src/components/audio/MultiTrackWaveformVisualizer.tsx
 * @description Zero-Cost Canvas Multi-Track Waveform Scrubber HUD for HANDFILM.
 * Features:
 * - 3-Tier Multi-Colored Stem Waveforms:
 *   - Gold (#F5A623): Vocals / Dialogue
 *   - Cyan (#38BDF8): Beat / Instrumental
 *   - Amber (#FB923C): SFX / Ambience
 * - Interactive Sub-Millisecond Playhead Seeking on direct click/scrub
 * - Magnetic downbeat transient indicators
 * - Tactile SMPTE timecode hover tooltip
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { multiTrackAudioBus } from '../../services/multiTrackAudioBus';
import { Volume2, Sliders, Activity, Disc, Sparkles } from 'lucide-react';

interface MultiTrackWaveformVisualizerProps {
  currentTimeSec: number;
  totalDurationSec: number;
  onSeek: (timeSec: number) => void;
  className?: string;
  onOpenMastering?: () => void;
  height?: number;
}

export const MultiTrackWaveformVisualizer: React.FC<MultiTrackWaveformVisualizerProps> = ({
  currentTimeSec,
  totalDurationSec,
  onSeek,
  className = '',
  onOpenMastering,
  height = 56
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTimeSec, setHoverTimeSec] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const duration = Math.max(1, totalDurationSec || 120);

  // Cached waveform data
  const waveformData = useMemo(() => {
    return multiTrackAudioBus.getWaveformData();
  }, [totalDurationSec]);

  // Main Canvas Render
  const renderWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    // Background: Deep obsidian
    ctx.fillStyle = '#08090D';
    ctx.fillRect(0, 0, width, h);

    // Subtle horizontal center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    // 12-second cut markers & 1-second ticks
    const secToPx = width / duration;
    for (let s = 0; s < duration; s += 1) {
      const x = s * secToPx;
      const isCut = s % 12 === 0 && s > 0;

      if (isCut) {
        ctx.strokeStyle = 'rgba(245, 166, 35, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 166, 35, 0.6)';
        ctx.font = '8px monospace';
        ctx.fillText(`SH${String(Math.floor(s / 12) + 1).padStart(2, '0')}`, x + 3, 10);
      } else if (s % 4 === 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, h - 8);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }

    const { voice, music, sfx } = waveformData;
    const samplesCount = voice ? voice.length : 1200;

    // DRAW STEM 2: MUSIC / BEAT (Cyan #38BDF8) - Base channel
    if (music) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
      const barW = Math.max(1, width / samplesCount);
      for (let i = 0; i < samplesCount; i++) {
        const x = (i / samplesCount) * width;
        const amp = music[i] || 0;
        const barH = amp * (h * 0.42);
        ctx.fillRect(x, (h / 2) - barH, barW, barH * 2);
      }
    }

    // DRAW STEM 1: VOICE / DIALOGUE (Gold #F5A623) - Hero foreground
    if (voice) {
      ctx.fillStyle = 'rgba(245, 166, 35, 0.9)';
      const barW = Math.max(1, width / samplesCount);
      for (let i = 0; i < samplesCount; i++) {
        const x = (i / samplesCount) * width;
        const amp = voice[i] || 0;
        if (amp > 0.05) {
          const barH = amp * (h * 0.48);
          ctx.fillRect(x, (h / 2) - barH, barW, barH * 2);
        }
      }
    }

    // DRAW STEM 3: SFX / AMBIENCE (Amber #FB923C) - Transient spikes
    if (sfx) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.8)';
      const barW = Math.max(1.5, width / samplesCount);
      for (let i = 0; i < samplesCount; i++) {
        const amp = sfx[i] || 0;
        if (amp > 0.25) {
          const x = (i / samplesCount) * width;
          const barH = amp * (h * 0.45);
          ctx.fillRect(x, (h / 2) - barH, barW, barH * 2);
        }
      }
    }

    // Playhead Scrim (dim area prior to playhead slightly)
    const playheadX = (currentTimeSec / duration) * width;
    ctx.fillStyle = 'rgba(245, 166, 35, 0.08)';
    ctx.fillRect(0, 0, playheadX, h);

    // Playhead Line with Golden Bloom
    ctx.save();
    ctx.shadowColor = '#F5A623';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#FFE066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();
    ctx.restore();

    // Playhead Triangle Indicator at Top
    ctx.fillStyle = '#FFE066';
    ctx.beginPath();
    ctx.moveTo(playheadX - 4, 0);
    ctx.lineTo(playheadX + 4, 0);
    ctx.lineTo(playheadX, 6);
    ctx.closePath();
    ctx.fill();

    // Hover Cursor Line
    if (isHovering && hoverTimeSec !== null) {
      const hX = (hoverTimeSec / duration) * width;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [currentTimeSec, duration, isHovering, hoverTimeSec, waveformData]);

  // Keep Canvas resolution crisp with DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      renderWaveform();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [height, renderWaveform]);

  // Redraw when playhead moves
  useEffect(() => {
    renderWaveform();
  }, [renderWaveform]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;
    onSeek(targetSec);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * duration;

    setHoverX(e.clientX - rect.left);
    setHoverTimeSec(targetSec);

    if (isScrubbing) {
      onSeek(targetSec);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Format SMPTE
  const formatTimecode = (sec: number) => {
    const totalFrames = Math.floor(sec * 24);
    const ff = String(totalFrames % 24).padStart(2, '0');
    const totalSec = Math.floor(totalFrames / 24);
    const ss = String(totalSec % 60).padStart(2, '0');
    const mm = String(Math.floor(totalSec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none bg-[#08090D] border-t border-b border-[#1C1D26] group ${className}`}
      style={{ height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setHoverTimeSec(null);
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block cursor-ew-resize" />

      {/* Floating Stem Legend Pills */}
      <div className="absolute top-1.5 left-2 flex items-center gap-1.5 pointer-events-none">
        <span className="flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-black/80 border border-[#F5A623]/50 text-[#F5A623]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
          VOICE (+2.5dB @ 3.2kHz)
        </span>
        <span className="flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-black/80 border border-sky-400/50 text-sky-300">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          MUSIC (DUCK -4dB)
        </span>
        <span className="flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-black/80 border border-amber-500/50 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          SFX
        </span>
      </div>

      {/* Right Action: Studio Mastering Modal / Drawer Trigger */}
      {onOpenMastering && (
        <div className="absolute top-1.5 right-2 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMastering();
            }}
            className="px-2 py-0.5 rounded-[2px] bg-black/85 hover:bg-[#F5A623]/20 border border-white/20 hover:border-[#F5A623] text-zinc-300 hover:text-[#FFE066] text-[8.5px] font-mono flex items-center gap-1 transition-all cursor-pointer shadow-md"
            title="Open Studio Audio Mastering Drawer (LUFS, Stem Gains, Limiter)"
          >
            <Sliders className="w-2.5 h-2.5 text-[#F5A623]" />
            <span className="font-bold">MASTER BUS</span>
          </button>
        </div>
      )}

      {/* Hover Timecode Tooltip */}
      {isHovering && hoverTimeSec !== null && (
        <div
          className="absolute bottom-1 pointer-events-none z-20 px-2 py-0.5 rounded bg-black/95 border border-[#F5A623]/70 text-[#FFE066] text-[9px] font-mono shadow-xl -translate-x-1/2 whitespace-nowrap"
          style={{ left: Math.max(40, Math.min(hoverX, (containerRef.current?.clientWidth || 300) - 40)) }}
        >
          {formatTimecode(hoverTimeSec)} // {(hoverTimeSec).toFixed(3)}s
        </div>
      )}
    </div>
  );
};
