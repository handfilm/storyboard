/**
 * @file /src/features/library/LibrarySlidePanel.tsx
 * @description Module 14: LIBRARY (Asset Presets, Sound FX & Typography)
 * Features:
 * - Tabbed Switcher: [ SFX PACK ], [ 3D LUTS ], [ BILINGUAL TYPE PRESETS ]
 * - SFX Pack: WebAudio real-time audition for Whooshes, 40Hz Sub-Bass, Glitch, Braams + Track assignment
 * - 3D LUTs: 8 film looks with hover live-preview & click apply
 * - Bilingual Type Presets: Bangla headlines + tracked English sub-monospaces
 */

import React, { useState } from 'react';
import { 
  Library, 
  Volume2, 
  Palette, 
  Type, 
  Play, 
  Check, 
  Sparkles, 
  Sliders, 
  ArrowRight,
  Disc,
  Radio
} from 'lucide-react';
import { useStudioStore } from '../../core/store';
import { AnthologyFrame, LutPreset } from '../../types/anthology';

interface LibrarySlidePanelProps {
  currentFrame?: AnthologyFrame;
  onUpdateFrame?: (frame: AnthologyFrame) => void;
  onPreviewLut?: (lut: LutPreset | null) => void;
}

export const LibrarySlidePanel: React.FC<LibrarySlidePanelProps> = ({
  currentFrame,
  onUpdateFrame,
  onPreviewLut
}) => {
  const { project } = useStudioStore();
  const [activeTab, setActiveTab] = useState<'sfx' | 'luts' | 'type'>('sfx');
  const [auditioningSfx, setAuditioningSfx] = useState<string | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Web Audio Synthesizer for SFX Pack
  const playWebAudioSfx = (type: 'whoosh' | 'sub_bass' | 'glitch' | 'braam' | 'shutter' | 'drone') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      setAuditioningSfx(type);

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.5, now);
      master.connect(ctx.destination);

      if (type === 'sub_bass') {
        // Deep 40Hz Sub-Bass Drop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(25, now + 1.4);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 1.5);
      } else if (type === 'whoosh') {
        // High-Speed Cinematic Whoosh (Filtered Noise)
        const bufferSize = ctx.sampleRate * 0.8;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.8);
        filter.Q.value = 3.0;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.35);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.8);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        whiteNoise.start(now);
      } else if (type === 'glitch') {
        // Cyberpunk Glitch Hit (Square Wave Burst)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.setValueAtTime(450, now + 0.05);
        osc.frequency.setValueAtTime(2400, now + 0.1);
        osc.frequency.setValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'braam') {
        // Cinematic Braam (Low Sawtooth + Heavy Brass resonance)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(55, now); // A1

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(55.8, now); // Detuned

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 1.2);
        filter.Q.value = 5.0;

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
      } else if (type === 'shutter') {
        // 35mm Mechanical Camera Shutter
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        // Cyber Ambience Drone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(43.65, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 1.6);
      }

      setTimeout(() => setAuditioningSfx(null), 1000);
    } catch (e) {
      console.warn('WebAudio failed to play', e);
      setAuditioningSfx(null);
    }
  };

  const handleAssignSfx = (sfxName: string) => {
    if (currentFrame && onUpdateFrame) {
      onUpdateFrame({
        ...currentFrame,
        soundCue: sfxName
      });
      setAppliedNotification(`Assigned "${sfxName}" to Track A1`);
      setTimeout(() => setAppliedNotification(null), 2500);
    }
  };

  // 8 Film Looks (3D LUTs)
  const lutsList: { id: LutPreset; name: string; subtitle: string; color: string; desc: string }[] = [
    { id: 'cinematic', name: 'RAWx 35mm', subtitle: 'Kodak 5219 Warm Emulsion', color: '#F5A623', desc: 'Warm 35mm golden emulsion with rich velvet blacks and analog grain' },
    { id: 'noir', name: 'Neo-Noir', subtitle: 'Silver Halide B&W', color: '#E4E4E7', desc: 'Monochrome silver 400 with deep contrast and specular halation' },
    { id: 'matrix', name: 'Emerald Matrix', subtitle: 'Cyberpunk Dhaka Green', color: '#10B981', desc: 'Deep obsidian shadows with phosphorescent cyber-green tint' },
    { id: 'infrared', name: 'Infrared', subtitle: 'Aerochrome False Color', color: '#EC4899', desc: 'Surreal magenta foliage and high-contrast ultraviolet glow' },
    { id: 'golden', name: 'Golden Flare', subtitle: 'Anamorphic Sunset 2.39:1', color: '#FBBF24', desc: 'Horizontal amber streak flares with soft highlight rolloff' },
    { id: 'cyberpunk', name: 'Cyber Neon', subtitle: 'Dhaka 2077 Split Tone', color: '#06B6D4', desc: 'Electrifying cyan shadows balanced with high-intensity amber keys' },
    { id: 'bleach', name: 'Bleach Bypass', subtitle: 'Harsh Silver Retention', color: '#94A3B8', desc: 'Desaturated midtones with harsh specular silver highlight clipping' },
    { id: 'tungsten', name: 'Tungsten 3200K', subtitle: 'Night Interior Practical', color: '#F97316', desc: 'Deep Prussian blue shadows with intimate warm tungsten interior glow' }
  ];

  const handleApplyLut = (lutId: LutPreset) => {
    if (currentFrame && onUpdateFrame) {
      onUpdateFrame({
        ...currentFrame,
        lutFilter: lutId
      });
      setAppliedNotification(`Applied 3D LUT "${lutId}" to Frame`);
      setTimeout(() => setAppliedNotification(null), 2500);
    }
  };

  // Bilingual Type Presets
  const typePresets = [
    {
      id: 'p1',
      bangla: 'বিপ্লব // সাইবার প্রতিরোধ',
      english: 'CYBERNETIC RESISTANCE // SECTOR 07',
      fontDesc: 'Anek Bangla Bold + Space Mono (Tracked 0.25em)',
      tagline: '24.0 FPS UNCOMPRESSED MASTER • 2.39:1 SCOPE'
    },
    {
      id: 'p2',
      bangla: 'মহাবিশ্ব // আদি অন্ত',
      english: 'THE SINGULARITY // ZERO HORIZON',
      fontDesc: 'Cinzel Decorative + Galada Stylized Calligraphy',
      tagline: 'ANAMORPHIC 35MM HIGH-SPEED • ARRI RAW'
    },
    {
      id: 'p3',
      bangla: 'অন্ধকার // মেঘনা মোহনা',
      english: 'OBSIDIAN HORIZON // MONSOON MATRIX',
      fontDesc: 'Tiro Bangla Classic + Syne Tech Display',
      tagline: 'VOLUMETRIC FOG • TUNGSTEN 3200K'
    },
    {
      id: 'p4',
      bangla: 'আলোর গতি // ফোটন কণা',
      english: 'PHOTON ACCELERATOR // HYPERLAPS',
      fontDesc: 'Noto Serif Bengali + Inter Tight 800',
      tagline: 'HIGH-CONTRAST NEON FLARE • 1/48S SHUTTER'
    },
    {
      id: 'p5',
      bangla: 'স্মৃতিভ্রম // নিউরাল ট্রানজিশন',
      english: 'NEURAL CORRUPTION // MEMORY CORRIDOR',
      fontDesc: 'Siliguri Bold + JetBrains Mono Hacker',
      tagline: 'KODAK 5219 VISION3 • 35MM ANALOG GRAIN'
    }
  ];

  const handleApplyTypePreset = (preset: typeof typePresets[0]) => {
    if (currentFrame && onUpdateFrame) {
      onUpdateFrame({
        ...currentFrame,
        title: preset.english,
        bengaliTitle: preset.bangla,
        tagline: preset.tagline
      });
      setAppliedNotification('Bilingual Type Stack Applied!');
      setTimeout(() => setAppliedNotification(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#12131a] border border-[#F5A623]/40 rounded p-4 relative overflow-hidden shadow-[0_0_20px_rgba(245,166,35,0.15)]">
        <div className="flex items-center gap-2 text-[#F5A623] mb-1">
          <Library className="w-4 h-4 animate-pulse" />
          <span className="font-mono-tech text-[11px] font-bold tracking-widest uppercase">
            [ MODULE 14 // ASSET & LOOK LIBRARY ]
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono-tech">
          Tactile sound synthesis, 8 film LUTs & curated bilingual typography stacks
        </p>

        {/* Tabbed Switcher */}
        <div className="mt-3 grid grid-cols-3 gap-1 font-mono-tech text-[10px]">
          {[
            { id: 'sfx', label: 'SFX PACK', icon: Volume2 },
            { id: 'luts', label: '3D LUTS', icon: Palette },
            { id: 'type', label: 'TYPE PRESETS', icon: Type }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#F5A623] text-black font-bold border-[#F5A623] shadow-[0_0_8px_rgba(245,166,35,0.4)]'
                    : 'bg-black/50 text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {appliedNotification && (
        <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded text-center text-[10.5px] font-mono-tech text-emerald-300 animate-in fade-in">
          ✓ {appliedNotification}
        </div>
      )}

      {/* 2. TAB 1: SFX PACK */}
      {activeTab === 'sfx' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
            <span>WebAudio Built-In Synthesizer</span>
            <span className="text-[10px] text-[#F5A623]">24-BIT / 48kHz</span>
          </div>

          <div className="space-y-2 font-mono-tech text-[11px]">
            {[
              { id: 'whoosh' as const, name: 'Cinematic Whoosh', desc: 'Filtered noise sweep with exponential pitch drop', track: 'A1 WHOOSH' },
              { id: 'sub_bass' as const, name: 'Deep Sub-Bass Drop (40Hz)', desc: 'Analog 40Hz sub-frequency room resonator', track: 'A2 SUB' },
              { id: 'glitch' as const, name: 'Cyberpunk Glitch Hit', desc: 'Square wave transient bitcrush burst', track: 'A1 GLITCH' },
              { id: 'braam' as const, name: 'Cinematic Trailer Braam', desc: 'Resonant low-brass Hollywood trailer hit', track: 'A2 BRAAM' },
              { id: 'shutter' as const, name: 'Mechanical Shutter Click', desc: '35mm optical camera shutter transient', track: 'A1 CLICK' },
              { id: 'drone' as const, name: 'Binaural Cyber Drone', desc: '43.6Hz continuous atmospheric tone', track: 'A2 DRONE' }
            ].map((sfx) => {
              const isPlaying = auditioningSfx === sfx.id;
              return (
                <div
                  key={sfx.id}
                  className="p-2.5 rounded bg-[#101117] border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
                      <span className="truncate">{sfx.name}</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-400 truncate">{sfx.desc}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => playWebAudioSfx(sfx.id)}
                      className={`px-2.5 py-1 rounded border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${
                        isPlaying 
                          ? 'bg-[#F5A623] text-black border-[#F5A623] font-bold' 
                          : 'bg-white/5 text-zinc-300 hover:text-white border-white/10 hover:bg-white/10'
                      }`}
                      title="Audition live sound in browser"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isPlaying ? 'PLAYING...' : 'AUDITION'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAssignSfx(sfx.track)}
                      className="px-2 py-1 rounded bg-[#F5A623]/20 hover:bg-[#F5A623]/35 text-[#F5A623] border border-[#F5A623]/50 text-[10px] font-bold cursor-pointer"
                      title="Assign to active shot track"
                    >
                      + A1/A2
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. TAB 2: 3D LUTS (8 Film Looks with hover live-preview) */}
      {activeTab === 'luts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
            <span>8 Cinematic 3D LUTs (Hover to Preview)</span>
            <span className="text-[10px] text-cyan-400">ACTIVE: {currentFrame?.lutFilter?.toUpperCase() || 'RAW'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[10.5px]">
            {lutsList.map((lut) => {
              const isSelected = currentFrame?.lutFilter === lut.id;
              return (
                <div
                  key={lut.id}
                  onClick={() => handleApplyLut(lut.id)}
                  onMouseEnter={() => {
                    if (onPreviewLut) onPreviewLut(lut.id);
                  }}
                  onMouseLeave={() => {
                    if (onPreviewLut) onPreviewLut(null);
                  }}
                  className={`p-2.5 rounded border transition-all cursor-pointer relative group ${
                    isSelected 
                      ? 'bg-[#181a24] border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.25)]' 
                      : 'bg-[#101117] border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: lut.color, boxShadow: `0 0 6px ${lut.color}` }}
                    />
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#F5A623]" />}
                  </div>

                  <div className="font-bold text-white text-[11px] truncate">
                    {lut.name}
                  </div>
                  <div className="text-[9px] text-zinc-400 truncate">
                    {lut.subtitle}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB 3: BILINGUAL TYPE PRESETS */}
      {activeTab === 'type' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-tech font-bold uppercase tracking-wider text-white">
            <span>Curated Typography Stacks</span>
            <span className="text-[10px] text-amber-400">BANGLA + ENGLISH</span>
          </div>

          <div className="space-y-2.5">
            {typePresets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleApplyTypePreset(preset)}
                className="p-3 rounded bg-[#101117] border border-white/10 hover:border-[#F5A623]/60 transition-all cursor-pointer group space-y-1"
              >
                <div className="font-bengali text-sm text-[#F5A623] font-bold group-hover:text-amber-300">
                  {preset.bangla}
                </div>
                <div className="font-mono-tech text-[10.5px] text-white font-bold tracking-wider">
                  {preset.english}
                </div>
                <div className="text-[9px] font-mono-tech text-zinc-500 pt-1 border-t border-white/5 flex items-center justify-between">
                  <span>{preset.fontDesc}</span>
                  <span className="text-[#F5A623] group-hover:translate-x-0.5 transition-transform">
                    Apply ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
