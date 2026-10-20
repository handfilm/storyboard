/**
 * @file /src/components/timeline/WaveformCanvas.tsx
 * @description Real-Time Web Audio DSP Waveform & Spectrum Canvas.
 * 
 * Renders real-time audio time-domain and frequency spectrum data with
 * high-contrast dark brutalist aesthetic (#0b0b0f, deep crimson #e11d48, tactical amber #ffe066).
 */

import React, { useRef, useEffect } from 'react';
import { webAudioDspService } from '../../services/webAudioDspService';
import { WaveformRenderMode } from '../../types/dsp';

interface WaveformCanvasProps {
  width?: number;
  height?: number;
  mode?: WaveformRenderMode;
  isPlaying?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  width = 300,
  height = 48,
  mode = 'bars',
  isPlaying = false,
  primaryColor = '#e11d48',
  secondaryColor = '#ffe066',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    webAudioDspService.init();

    const render = () => {
      if (canvasRef.current) {
        webAudioDspService.renderWaveformToCanvas(canvasRef.current, {
          canvasWidth: canvasRef.current.width,
          canvasHeight: canvasRef.current.height,
          mode,
          primaryColor,
          secondaryColor
        });
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, primaryColor, secondaryColor]);

  return (
    <div className={`relative bg-[#07080C] border border-white/10 rounded-xs overflow-hidden flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full block"
      />
      {/* Tactical HUD Corner Reticle */}
      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-rose-500/80 pointer-events-none" />
      <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-rose-500/80 pointer-events-none" />
    </div>
  );
};
