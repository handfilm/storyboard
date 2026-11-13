/**
 * @file /src/components/modules/NeuralAudioEngine.tsx
 * @description Neural Vox — Floating Neural Text-to-Speech & Voice Clone Audio Shell.
 * Provides on-device neural voice generation, voice cloning model presets,
 * real-time waveform synthesis, and zero-latency timeline injection.
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Mic } from 'lucide-react';
import { ProAudioStudioWorkspace } from '../audio/ProAudioStudioWorkspace';

export interface NeuralAudioEngineProps {
  isOpen: boolean;
  onClose: () => void;
  activeShotIndex?: number;
}

export const NeuralAudioEngine: React.FC<NeuralAudioEngineProps> = ({
  isOpen,
  onClose,
  activeShotIndex = 0
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center p-4 select-none">
      <div
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        className="pointer-events-auto w-[720px] max-w-[96vw] max-h-[88vh] bg-[#0E1015]/95 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] rounded-xl flex flex-col p-4 text-white font-mono overflow-hidden"
      >
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 cursor-move shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E50914]/20 border border-[#E50914]/50 flex items-center justify-center text-[#FF4D4D]">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-white">
                  04 AUDIO STUDIO // PRO VOICE &amp; MIXING
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  GEMINI + DSP
                </span>
              </div>
              <p className="text-[9px] text-zinc-400">
                Vocal Remover • Live VO Booth • Gemini TTS &amp; Foley • 3-Bus Cinema Mixer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Audio Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <ProAudioStudioWorkspace
            activeShotIndex={activeShotIndex}
            initialTab="gemini-audio"
            compact
          />
        </div>
      </div>
    </div>
  );
};

