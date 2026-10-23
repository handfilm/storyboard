/**
 * @file /src/features/sound/SoundStudio.tsx
 * @description Procedural Cinema Audio Synthesizer, 3-Band Parametric EQ & Ambience Rack.
 */

import React, { useState } from 'react';
import { audioEngine } from '../../services/audioEngine';
import { webAudioDspService } from '../../services/webAudioDspService';
import {
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Play,
  Pause,
  Activity,
  Radio,
  Music
} from 'lucide-react';

export const SoundStudio: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lowGain, setLowGain] = useState(0);
  const [midGain, setMidGain] = useState(0);
  const [highGain, setHighGain] = useState(0);

  const handleToggleDrone = () => {
    webAudioDspService.init();
    audioEngine.init();
    if (isPlaying) {
      audioEngine.pauseAudio();
      audioEngine.setMuted(true);
      setIsPlaying(false);
    } else {
      audioEngine.setMuted(false);
      audioEngine.playAudio();
      audioEngine.playFrameImpact(0.4);
      setIsPlaying(true);
    }
  };

  const handleEqChange = (band: 'low' | 'mid' | 'high', val: number) => {
    if (band === 'low') {
      setLowGain(val);
      webAudioDspService.setEq(val, midGain, highGain);
    } else if (band === 'mid') {
      setMidGain(val);
      webAudioDspService.setEq(lowGain, val, highGain);
    } else {
      setHighGain(val);
      webAudioDspService.setEq(lowGain, midGain, val);
    }
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 text-white font-mono-tech select-none">
      {/* Synthesizer Master Card */}
      <div className="p-4 rounded-[2px] bg-white/5 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-cinzel text-xs font-bold text-white tracking-wider">
              PROCEDURAL DRONE SYNTHESIZER
            </span>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-[1px] font-bold ${
              isPlaying
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {isPlaying ? 'ACTIVE' : 'MUTED'}
          </span>
        </div>

        <p className="text-[10px] text-white/60 leading-relaxed">
          Synthesizes a continuous 36Hz - 48Hz cinematic low-frequency sub-bass drone with harmonic overtone modulation.
        </p>

        <button
          onClick={handleToggleDrone}
          className={`w-full py-2.5 rounded-[2px] font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isPlaying
              ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
          <span>{isPlaying ? 'PAUSE AMBIENCE DRONE' : 'START PROCEDURAL SYNTH'}</span>
        </button>
      </div>

      {/* 3-Band Parametric EQ */}
      <div className="p-4 rounded-[2px] bg-white/5 border border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#FFE066]" />
          <span className="font-cinzel text-xs font-bold text-white tracking-wider">
            3-BAND PARAMETRIC MASTER EQ
          </span>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-[10px] text-white/70 mb-1">
              <span>LOW SHELF (120 Hz)</span>
              <span className="text-[#D4AF37]">{lowGain > 0 ? `+${lowGain}` : lowGain} dB</span>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              value={lowGain}
              onChange={(e) => handleEqChange('low', Number(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-white/70 mb-1">
              <span>MID PEAK (1.2 kHz, Q=1.2)</span>
              <span className="text-[#D4AF37]">{midGain > 0 ? `+${midGain}` : midGain} dB</span>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              value={midGain}
              onChange={(e) => handleEqChange('mid', Number(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-white/70 mb-1">
              <span>HIGH SHELF (6.5 kHz)</span>
              <span className="text-[#D4AF37]">{highGain > 0 ? `+${highGain}` : highGain} dB</span>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              value={highGain}
              onChange={(e) => handleEqChange('high', Number(e.target.value))}
              className="w-full accent-[#D4AF37] cursor-pointer h-1 bg-white/20 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
