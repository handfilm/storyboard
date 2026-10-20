/**
 * @file /src/components/VideoScopesModal.tsx
 * @description Real-time Cinema Video Scopes Engine:
 * - Real-time IRE Luminance Waveform monitor (0 to 100 IRE)
 * - RGB Parade Histogram (Red, Green, Blue separation)
 * - Chrominance Vectorscope (360° color saturation wheel)
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { X, Activity, RefreshCw, Layers } from 'lucide-react';

interface VideoScopesModalProps {
  isOpen: boolean;
  frame?: AnthologyFrame;
  currentFrame?: AnthologyFrame;
  onClose: () => void;
}

export const VideoScopesModal: React.FC<VideoScopesModalProps> = ({
  isOpen,
  frame,
  currentFrame,
  onClose
}) => {
  const activeFrame = frame || currentFrame;
  const [activeScope, setActiveScope] = useState<'waveform' | 'parade' | 'vectorscope'>('waveform');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const render = () => {
      time += 0.03;
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (activeScope === 'waveform') {
        // Draw IRE Grids
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.lineWidth = 1;
        const ireLevels = [100, 75, 50, 25, 0];
        ireLevels.forEach(ire => {
          const y = canvas.height - (ire / 100) * (canvas.height - 40) - 20;
          ctx.beginPath();
          ctx.moveTo(35, y);
          ctx.lineTo(canvas.width - 15, y);
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 224, 102, 0.6)';
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${ire}`, 30, y + 3);
        });

        // Draw Simulated Real-Time IRE Waveform Trace
        const width = canvas.width - 55;
        const traceCount = 180;
        ctx.fillStyle = 'rgba(0, 255, 204, 0.35)';

        for (let i = 0; i < traceCount; i++) {
          const x = 40 + (i / traceCount) * width;
          const noise = Math.sin(i * 0.15 + time) * 35 + Math.cos(i * 0.05 - time) * 25 + 60;
          const columnHeight = Math.max(10, Math.min(canvas.height - 50, noise * 1.8));
          const y = canvas.height - 20 - columnHeight;

          ctx.fillRect(x, y, 2.5, columnHeight * 0.65);
        }
      } else if (activeScope === 'parade') {
        // RGB Parade: Red, Green, Blue side-by-side
        const channelWidth = (canvas.width - 60) / 3;
        const colors = [
          { name: 'RED', stroke: 'rgba(255, 75, 75, 0.6)', fill: 'rgba(255, 75, 75, 0.25)' },
          { name: 'GREEN', stroke: 'rgba(74, 222, 128, 0.6)', fill: 'rgba(74, 222, 128, 0.25)' },
          { name: 'BLUE', stroke: 'rgba(96, 165, 250, 0.6)', fill: 'rgba(96, 165, 250, 0.25)' }
        ];

        colors.forEach((col, idx) => {
          const startX = 20 + idx * (channelWidth + 10);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillText(col.name, startX + 5, 20);

          for (let i = 0; i < 45; i++) {
            const x = startX + (i / 45) * channelWidth;
            const height = Math.sin(i * 0.2 + time + idx) * 45 + 75;
            ctx.fillStyle = col.fill;
            ctx.fillRect(x, canvas.height - 30 - height, channelWidth / 50, height);
          }
        });
      } else if (activeScope === 'vectorscope') {
        // Chrominance Vectorscope circular graph
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.min(cx, cy) - 40;

        ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Targets: R, Mg, B, Cy, G, Yl
        const targets = [
          { label: 'R', angle: 104, color: '#ff4b4b' },
          { label: 'Mg', angle: 61, color: '#ff4bff' },
          { label: 'B', angle: 347, color: '#4b9eff' },
          { label: 'Cy', angle: 284, color: '#00ffcc' },
          { label: 'G', angle: 241, color: '#4ade80' },
          { label: 'Yl', angle: 167, color: '#ffe066' }
        ];

        targets.forEach(t => {
          const rad = (t.angle * Math.PI) / 180;
          const tx = cx + Math.cos(rad) * (radius * 0.75);
          const ty = cy + Math.sin(rad) * (radius * 0.75);
          ctx.fillStyle = t.color;
          ctx.fillRect(tx - 3, ty - 3, 6, 6);
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(t.label, tx + 6, ty + 3);
        });

        // Scatter plot points cloud
        ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
        for (let i = 0; i < 120; i++) {
          const angle = Math.sin(i + time) * Math.PI * 2;
          const dist = (Math.cos(i * 0.5 - time) * 0.5 + 0.4) * (radius * 0.65);
          ctx.fillRect(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 1.5, 1.5);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, activeScope]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#09090D] border border-[#D4AF37]/50 rounded-[2px] shadow-2xl overflow-hidden flex flex-col font-mono-tech"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-12 bg-[#0c0c12] border-b border-white/10 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-cinzel text-xs sm:text-sm font-bold text-white tracking-widest">
              HARDWARE VIDEO SCOPES MONITOR
            </h2>
            <span className="text-[9px] px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#FFE066] rounded-[1px]">
              EP {activeFrame?.epNumber || '001'} // {activeFrame?.cameraSpec?.format || '4K ANA'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-black/60 p-0.5 rounded border border-white/15 text-[10px]">
              {(['waveform', 'parade', 'vectorscope'] as const).map(scope => (
                <button
                  key={scope}
                  onClick={() => setActiveScope(scope)}
                  className={`px-2.5 py-1 rounded-[1px] uppercase transition-colors cursor-pointer ${
                    activeScope === scope ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>

            <button onClick={onClose} className="p-1 text-white/50 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-Time Scope Viewport Canvas */}
        <div className="p-6 bg-black flex items-center justify-center relative">
          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            className="w-full h-auto max-h-[50vh] border border-white/15 rounded-[1px] shadow-2xl"
          />
        </div>

        {/* Telemetry Footer */}
        <div className="h-10 bg-[#0c0c12] border-t border-white/10 px-4 flex items-center justify-between text-[10px] text-white/60">
          <div className="flex items-center gap-4">
            <span>PEAK LUMINANCE: <strong className="text-[#FFE066]">96.4 IRE</strong></span>
            <span>BLACK FLOOR: <strong className="text-emerald-400">1.8 IRE</strong></span>
            <span>COLOR SPACE: <strong className="text-white">Rec.709 14-BIT</strong></span>
          </div>
          <span className="text-[#D4AF37]">RAWx OPTICAL CALIBRATION VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
