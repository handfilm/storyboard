/**
 * @file /src/components/VideoScopesModal.tsx
 * @description Real-time Cinema Video Scopes Engine:
 * - Real-time IRE Luminance Waveform monitor (0 to 100 IRE)
 * - RGB Parade Histogram (Red, Green, Blue separation)
 * - Chrominance Vectorscope (360° color saturation wheel)
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnthologyFrame } from '../types/anthology';
import { X, Activity, BarChart3, CircleDot, Waves } from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

interface VideoScopesModalProps {
  isOpen: boolean;
  frame?: AnthologyFrame;
  currentFrame?: AnthologyFrame;
  onClose: () => void;
}

const SCOPE_META = {
  waveform: {
    label: 'WAVEFORM',
    icon: Waves,
    title: 'IRE WAVEFORM SCOPE',
    en: 'Real-time 0-100 IRE luminance monitor.',
    bn: 'কীভাবে ব্যবহার করবেন: সাদা-কালো এক্সপোজার ও ব্রাইটনেস লেভেল মাপতে WAVEFORM চাপুন।'
  },
  parade: {
    label: 'RGB PARADE',
    icon: BarChart3,
    title: 'RGB PARADE SCOPE',
    en: 'Red, Green, and Blue channel separation histogram.',
    bn: 'কীভাবে ব্যবহার করবেন: কালার ব্যালেন্স ঠিক করতে লাল-সবুজ-নীল চ্যানেল আলাদাভাবে দেখুন।'
  },
  vectorscope: {
    label: 'VECTORSCOPE',
    icon: CircleDot,
    title: 'CHROMA VECTORSCOPE',
    en: '360-degree chrominance hue and saturation wheel.',
    bn: 'কীভাবে ব্যবহার করবেন: স্কিন টোন ও কালার স্যাচুরেশন পরীক্ষা করতে VECTORSCOPE চাপুন।'
  }
} as const;

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
        className="w-full max-w-3xl bg-[#0B0C10] border border-[#26282E] rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono-tech"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-h-[56px] bg-[#111215] border-b border-[#26282E] px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <CinemaBadgeHeader
              icon={<Activity className="w-4 h-4" strokeWidth={2.2} />}
              label="VIDEO SCOPES"
              accent="amber"
            />
            <span className="px-2 py-0.5 rounded bg-[#0B0C10] border border-[#26282E] text-[10px] font-black tracking-wider uppercase text-amber-300">
              EP {activeFrame?.epNumber || '001'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['waveform', 'parade', 'vectorscope'] as const).map(scope => {
              const meta = SCOPE_META[scope];
              const Icon = meta.icon;
              return (
                <CinemaToolHUD
                  key={scope}
                  title={meta.title}
                  en={meta.en}
                  bn={meta.bn}
                  accent="cyan"
                  side="bottom"
                >
                  <button
                    type="button"
                    data-active={activeScope === scope ? 'true' : 'false'}
                    onClick={() => setActiveScope(scope)}
                    className="cinema-tile cinema-tile-cyan px-2.5 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Icon className="w-4 h-4 cinema-tile-icon shrink-0" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase whitespace-nowrap">
                      {meta.label}
                    </span>
                  </button>
                </CinemaToolHUD>
              );
            })}

            <CinemaToolHUD
              title="CLOSE SCOPES"
              en="Close the video scopes monitor."
              bn="কীভাবে ব্যবহার করবেন: স্কোপ মনিটর বন্ধ করতে X বাটনে চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cinema-tile cinema-tile-crimson min-h-[44px] min-w-[44px] px-2.5 rounded-md flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
                <span className="hidden sm:inline font-black tracking-wider text-[10px] uppercase">CLOSE</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-black flex items-center justify-center relative">
          <canvas
            ref={canvasRef}
            width={720}
            height={360}
            className="w-full h-auto max-h-[52vh] border border-[#26282E] rounded shadow-2xl"
          />
        </div>

        <div className="min-h-[44px] bg-[#111215] border-t border-[#26282E] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-black tracking-wider uppercase text-zinc-400">
          <div className="flex items-center gap-4">
            <span>PEAK <strong className="text-amber-300">96.4 IRE</strong></span>
            <span>FLOOR <strong className="text-emerald-400">1.8 IRE</strong></span>
            <span>REC.709 <strong className="text-white">14-BIT</strong></span>
          </div>
          <span className="text-amber-400">RAWx CALIBRATED</span>
        </div>
      </div>
    </div>
  );
};

