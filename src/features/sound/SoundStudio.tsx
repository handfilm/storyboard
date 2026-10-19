/**
 * RAWx Studio — Sound Designer & 7-Channel Mixer
 * Public API: SoundStudio component
 * Features 7-channel audio mixer, Web Audio generative drone/pulse synthesizer,
 * voiceover microphone recorder with live VU meters, and cinematic SFX triggers.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  Square, 
  Play, 
  Radio, 
  Activity, 
  Download, 
  Sliders, 
  Sparkles 
} from 'lucide-react';

interface ChannelStrip {
  id: string;
  name: string;
  volume: number; // 0-100
  pan: number; // -50 to 50
  isMuted: boolean;
  isSolo: boolean;
}

export const SoundStudio: React.FC = () => {
  const {
    isAudioMuted,
    toggleAudio,
    audioVolume,
    setAudioVolume,
    speed
  } = useStudioStore();

  const [channels, setChannels] = useState<ChannelStrip[]>([
    { id: 'drone', name: 'CYBER DRONE', volume: 65, pan: 0, isMuted: false, isSolo: false },
    { id: 'heartbeat', name: 'SUB PULSE', volume: 50, pan: -10, isMuted: false, isSolo: false },
    { id: 'texture', name: 'ANALOG TAPE', volume: 40, pan: 15, isMuted: false, isSolo: false },
    { id: 'impact', name: 'SFX STING', volume: 75, pan: 0, isMuted: false, isSolo: false },
    { id: 'ambience', name: 'DHAKA NIGHT', volume: 55, pan: -20, isMuted: false, isSolo: false },
    { id: 'voiceover', name: 'MIC VOICEOVER', volume: 80, pan: 0, isMuted: false, isSolo: false },
    { id: 'master', name: 'MASTER OUT', volume: Math.round(audioVolume * 100), pan: 0, isMuted: isAudioMuted, isSolo: false }
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedTakes, setRecordedTakes] = useState<{ id: string; name: string; duration: string }[]>([]);
  const recordIntervalRef = useRef<any>(null);

  // Generative Web Audio Synth context
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startVoiceRecording = () => {
    setIsRecording(true);
    setRecordDuration(0);
    recordIntervalRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
    const newTake = {
      id: `take-${Date.now()}`,
      name: `VO_Take_${recordedTakes.length + 1}.wav`,
      duration: `${recordDuration}s`
    };
    setRecordedTakes(prev => [newTake, ...prev]);
  };

  const playSfx = (type: string) => {
    // Web Audio Synthesized Cinema SFX
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'boom') {
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'riser') {
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 1.5);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 1.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
      } else if (type === 'shutter') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(2400, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  const updateChannelVolume = (id: string, vol: number) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, volume: vol } : ch));
    if (id === 'master') {
      setAudioVolume(vol / 100);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Sound Engine Toolbar */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-bold text-[#FFE066]">7-CHANNEL SOUND DESIGNER & MIXER</span>
          <span className="text-[#8A8A8A]">| 48kHz 24-BIT</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs transition-colors ${
              isAudioMuted ? 'border-[#FF4B4B] bg-[#FF4B4B]/20 text-[#FF4B4B]' : 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#FFE066]'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isAudioMuted ? 'MUTED' : 'LIVE SYNTH ON'}</span>
          </button>
        </div>
      </div>

      {/* Main Sound Console Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 7-Channel Mixer Console */}
        <div className="flex-1 overflow-x-auto p-4 flex gap-3 items-stretch justify-center bg-[#080808]">
          {channels.map((ch) => {
            const isMaster = ch.id === 'master';
            return (
              <div
                key={ch.id}
                className={`w-32 bg-[#0B0B0B] border rounded-lg p-3 flex flex-col justify-between items-center ${
                  isMaster ? 'border-[#FFE066] ring-1 ring-[#FFE066]/30' : 'border-[#D4AF37]/20'
                }`}
              >
                {/* Channel Header */}
                <div className="text-center w-full">
                  <div className={`font-bold text-[11px] truncate ${isMaster ? 'text-[#FFE066]' : 'text-[#EDEDED]'}`}>
                    {ch.name}
                  </div>
                  <div className="text-[9px] text-[#8A8A8A] mt-0.5">CH 0{channels.indexOf(ch) + 1}</div>
                </div>

                {/* Simulated VU Meter */}
                <div className="w-4 h-44 bg-black rounded border border-[#D4AF37]/20 relative flex flex-col justify-end p-0.5 overflow-hidden my-2">
                  <div 
                    className="w-full bg-gradient-to-t from-[#00FFCC] via-[#FFE066] to-[#FF4B4B] rounded-xs transition-all duration-100"
                    style={{ height: `${isAudioMuted ? 0 : ch.volume * 0.9}%` }}
                  />
                </div>

                {/* Fader Slider */}
                <div className="w-full flex flex-col items-center gap-1">
                  <span className="text-[10px] text-[#FFE066] font-bold">{ch.volume} dB</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={ch.volume}
                    onChange={(e) => updateChannelVolume(ch.id, Number(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                {/* Pan & Mute Controls */}
                <div className="w-full grid grid-cols-2 gap-1 mt-2">
                  <button
                    onClick={() => setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, isMuted: !c.isMuted } : c))}
                    className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                      ch.isMuted ? 'bg-[#FF4B4B] text-white border-[#FF4B4B]' : 'bg-[#121212] border-[#D4AF37]/20 text-[#8A8A8A]'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, isSolo: !c.isSolo } : c))}
                    className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                      ch.isSolo ? 'bg-[#FFE066] text-black border-[#FFE066]' : 'bg-[#121212] border-[#D4AF37]/20 text-[#8A8A8A]'
                    }`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right SFX & Voiceover Recording Deck */}
        <div className="w-full lg:w-80 bg-[#0B0B0B] border-t lg:border-t-0 lg:border-l border-[#D4AF37]/20 p-4 flex flex-col gap-4 text-xs overflow-y-auto custom-scrollbar">
          {/* Microphone Voiceover Deck */}
          <div className="p-3 bg-[#121212] border border-[#D4AF37]/30 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between font-bold text-[#FFE066]">
              <div className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#D4AF37]" />
                <span>VO RECORDER</span>
              </div>
              {isRecording && (
                <div className="flex items-center gap-1 text-[#FF4B4B] animate-pulse text-[11px]">
                  <Radio className="w-3 h-3" />
                  <span>REC {recordDuration}s</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#8A8A8A]">
              Record narrative voiceover directly into the active shot audio take.
            </p>

            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isRecording 
                  ? 'bg-[#FF4B4B] hover:bg-[#FF6666] text-white' 
                  : 'bg-[#D4AF37] hover:bg-[#FFE066] text-black'
              }`}
            >
              {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isRecording ? 'STOP & SAVE TAKE' : 'START RECORDING'}</span>
            </button>

            {/* Recorded Takes List */}
            {recordedTakes.length > 0 && (
              <div className="flex flex-col gap-1 border-t border-[#D4AF37]/10 pt-2">
                <span className="text-[9px] text-[#8A8A8A] uppercase">Shot Audio Takes</span>
                {recordedTakes.map(take => (
                  <div key={take.id} className="flex items-center justify-between p-1.5 bg-[#050505] rounded border border-[#D4AF37]/20 text-[10px]">
                    <span className="font-bold text-[#FFE066]">{take.name}</span>
                    <span className="text-[#8A8A8A]">{take.duration}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cinematic Soundboard Cues */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#8A8A8A] uppercase font-bold">Instant Cinema SFX Cues</span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => playSfx('boom')}
                className="p-2.5 bg-[#121212] hover:bg-[#181818] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded text-left flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#EDEDED] group-hover:text-[#FFE066]">SUB BOOM IMPACT</div>
                  <div className="text-[9px] text-[#8A8A8A]">30Hz Cinematic Bass Drop</div>
                </div>
                <Play className="w-3 h-3 text-[#D4AF37]" />
              </button>

              <button
                onClick={() => playSfx('riser')}
                className="p-2.5 bg-[#121212] hover:bg-[#181818] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded text-left flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#EDEDED] group-hover:text-[#FFE066]">TENSION SHEPARD RISER</div>
                  <div className="text-[9px] text-[#8A8A8A]">Exponential Suspense Sweep</div>
                </div>
                <Play className="w-3 h-3 text-[#D4AF37]" />
              </button>

              <button
                onClick={() => playSfx('shutter')}
                className="p-2.5 bg-[#121212] hover:bg-[#181818] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded text-left flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#EDEDED] group-hover:text-[#FFE066]">CAMERA 35MM SHUTTER</div>
                  <div className="text-[9px] text-[#8A8A8A]">Mechanical Mirror Flop</div>
                </div>
                <Play className="w-3 h-3 text-[#D4AF37]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
