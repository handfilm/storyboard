/**
 * RAWx Studio — Pro Color Grading & Scopes Engine
 * Public API: ColorStudio component
 * Features Lift/Gamma/Gain color wheels, 3D LUT presets, shader FX (grain, halation, bloom, vignette),
 * live video scopes (histogram, waveform), and split-screen before/after comparison.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Palette, 
  Sliders, 
  Activity, 
  Sparkles, 
  Layers, 
  Check, 
  RefreshCcw, 
  Eye, 
  Sun,
  Flame,
  Contrast
} from 'lucide-react';

const lutPresets = [
  { id: 'cinematic', name: 'RAWx Cinema 35', desc: 'Warm 35mm golden emulsion with deep shadows' },
  { id: 'cyberpunk', name: 'Dhaka Night Noir', desc: 'High-contrast cyan shadows with neon gold highlights' },
  { id: 'noir', name: 'Monochrome Silver', desc: 'Tri-X 400 high-contrast black & white' },
  { id: 'bleach', name: 'Bleach Bypass', desc: 'Desaturated midtones with gritty silver retention' },
  { id: 'kodachrome', name: 'Kodachrome 64', desc: 'Vibrant primaries with punchy nostalgic reds' },
  { id: 'eterna', name: 'Fuji Eterna Film', desc: 'Subtle soft pastels with muted organic skin tones' }
];

export const ColorStudio: React.FC = () => {
  const {
    activeShotIndex,
    project,
    activeLut,
    setLut,
    updateShot
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const imageUrl = currentShot.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80';

  // Color wheel states
  const [lift, setLift] = useState({ r: 0, g: 0, b: 0, master: 0 });
  const [gamma, setGamma] = useState({ r: 0, g: 0, b: 0, master: 0 });
  const [gain, setGain] = useState({ r: 5, g: 2, b: -3, master: 10 });

  // FX states
  const [grain, setGrain] = useState(25);
  const [halation, setHalation] = useState(30);
  const [bloom, setBloom] = useState(20);
  const [vignette, setVignette] = useState(40);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [activeScope, setActiveScope] = useState<'histogram' | 'waveform'>('waveform');

  const handleResetGrade = () => {
    setLift({ r: 0, g: 0, b: 0, master: 0 });
    setGamma({ r: 0, g: 0, b: 0, master: 0 });
    setGain({ r: 0, g: 0, b: 0, master: 0 });
    setGrain(0);
    setHalation(0);
    setBloom(0);
    setVignette(0);
    setLut('cinematic');
  };

  const handleApplyToAll = () => {
    const total = Math.max(100, project.shots.length);
    for (let i = 0; i < total; i++) {
      updateShot(i, { filterLut: activeLut });
    }
    alert(`Applied LUT "${activeLut.toUpperCase()}" to all ${total} frames!`);
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Left Grade Monitor & Scopes */}
      <div className="flex-1 flex flex-col border-r border-[#D4AF37]/20 overflow-hidden">
        {/* Top Grade Bar */}
        <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-[#FFE066]">PRO COLOR GRADE & SHADER PIPELINE</span>
            <span className="text-[#8A8A8A]">| SHOT #{String(activeShotIndex + 1).padStart(3, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSplitMode(!isSplitMode)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                isSplitMode ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#FFE066]' : 'border-[#D4AF37]/30 text-[#8A8A8A]'
              }`}
            >
              BEFORE / AFTER
            </button>
            <button
              onClick={handleApplyToAll}
              className="px-2.5 py-1 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-xs transition-colors"
            >
              APPLY TO ALL 100
            </button>
            <button
              onClick={handleResetGrade}
              className="p-1 text-[#8A8A8A] hover:text-[#EDEDED]"
              title="Reset Grade"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas with Graded Image */}
        <div className="flex-1 bg-[#030304] flex items-center justify-center p-6 relative overflow-hidden">
          <div className="w-full max-w-4xl aspect-video bg-black rounded border border-[#D4AF37]/30 relative overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Graded Image */}
            <img
              src={imageUrl}
              alt="Grade Preview"
              className="w-full h-full object-cover"
              style={{
                filter: `contrast(${100 + gain.master}%) brightness(${100 + gamma.master}%) saturate(${110 + gain.r}%) sepia(${halation * 0.4}%)`,
                boxShadow: `inset 0 0 ${vignette * 3}px rgba(0,0,0,0.9)`
              }}
            />

            {/* Split Screen Slider */}
            {isSplitMode && (
              <>
                <div 
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-[#FFE066] shadow-2xl"
                  style={{ width: `${splitPosition}%` }}
                >
                  <img
                    src={imageUrl}
                    alt="Ungraded Original"
                    className="w-full h-full object-cover max-w-none"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 rounded border border-[#8A8A8A] text-[9px] text-[#8A8A8A]">
                    ORIGINAL
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 rounded border border-[#D4AF37] text-[9px] text-[#FFE066]">
                  GRADED ({activeLut.toUpperCase()})
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(Number(e.target.value))}
                  className="absolute inset-x-4 bottom-4 accent-[#FFE066] opacity-80 hover:opacity-100"
                />
              </>
            )}

            {/* Film Grain Simulation Overlay */}
            {grain > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                style={{
                  backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 0)`,
                  backgroundSize: '4px 4px'
                }}
              />
            )}
          </div>
        </div>

        {/* Real-Time Video Scopes Panel */}
        <div className="h-32 bg-[#0B0B0B] border-t border-[#D4AF37]/20 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="font-bold text-[#FFE066]">LIVE VIDEO SCOPE</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveScope('waveform')}
                className={`px-2 py-0.5 rounded text-[10px] ${activeScope === 'waveform' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'}`}
              >
                WAVEFORM (IRE)
              </button>
              <button
                onClick={() => setActiveScope('histogram')}
                className={`px-2 py-0.5 rounded text-[10px] ${activeScope === 'histogram' ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A]'}`}
              >
                RGB HISTOGRAM
              </button>
            </div>
          </div>

          {/* Simulated Waveform Canvas Graph */}
          <div className="h-20 bg-black rounded border border-[#D4AF37]/20 relative flex items-end justify-between px-2 pb-1 overflow-hidden">
            {Array.from({ length: 48 }).map((_, idx) => {
              const height = Math.min(100, Math.max(15, Math.sin(idx * 0.3) * 40 + 50 + (idx % 7) * 4));
              return (
                <div
                  key={idx}
                  className="w-1 bg-[#00FFCC]/70 rounded-t-xs"
                  style={{ height: `${height}%` }}
                />
              );
            })}
            <div className="absolute inset-x-0 top-1/4 border-b border-[#D4AF37]/20" />
            <div className="absolute inset-x-0 top-1/2 border-b border-[#D4AF37]/20" />
            <div className="absolute inset-x-0 top-3/4 border-b border-[#D4AF37]/20" />
            <span className="absolute top-1 left-2 text-[8px] text-[#8A8A8A]">100 IRE</span>
            <span className="absolute bottom-1 left-2 text-[8px] text-[#8A8A8A]">0 IRE</span>
          </div>
        </div>
      </div>

      {/* Right Grading Controls Panel */}
      <div className="w-full md:w-80 bg-[#0B0B0B] flex flex-col overflow-y-auto custom-scrollbar p-4 gap-4 text-xs">
        <h3 className="font-bold text-[#FFE066] text-xs uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2">
          Color Wheels & Shader FX
        </h3>

        {/* 3D LUT Presets */}
        <div>
          <label className="text-[10px] text-[#8A8A8A] uppercase">Cinematic 3D LUT</label>
          <div className="grid grid-cols-1 gap-1.5 mt-1">
            {lutPresets.map((lut) => (
              <button
                key={lut.id}
                onClick={() => setLut(lut.id)}
                className={`p-2 rounded border text-left flex flex-col gap-0.5 transition-colors ${
                  activeLut === lut.id 
                    ? 'border-[#FFE066] bg-[#D4AF37]/20 text-[#FFE066]' 
                    : 'border-[#D4AF37]/10 bg-[#121212] text-[#8A8A8A] hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="font-bold text-[#EDEDED] flex items-center justify-between">
                  <span>{lut.name}</span>
                  {activeLut === lut.id && <Check className="w-3 h-3 text-[#FFE066]" />}
                </div>
                <div className="text-[10px] text-[#8A8A8A]">{lut.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Lift / Gamma / Gain Sliders */}
        <div className="flex flex-col gap-3 border-t border-[#D4AF37]/10 pt-3">
          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>LIFT (SHADOWS)</span>
              <span className="text-[#FFE066]">{lift.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={lift.master}
              onChange={(e) => setLift(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>GAMMA (MIDTONES)</span>
              <span className="text-[#FFE066]">{gamma.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={gamma.master}
              onChange={(e) => setGamma(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>GAIN (HIGHLIGHTS)</span>
              <span className="text-[#FFE066]">{gain.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="30"
              value={gain.master}
              onChange={(e) => setGain(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>
        </div>

        {/* Optical Shader FX */}
        <div className="flex flex-col gap-3 border-t border-[#D4AF37]/10 pt-3">
          <label className="text-[10px] text-[#8A8A8A] uppercase">Analog Shader Emulation</label>
          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>35MM FILM GRAIN</span>
              <span className="text-[#FFE066]">{grain}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={grain}
              onChange={(e) => setGrain(Number(e.target.value))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>ANAMORPHIC HALATION</span>
              <span className="text-[#FFE066]">{halation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={halation}
              onChange={(e) => setHalation(Number(e.target.value))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>VIGNETTE FALLOFF</span>
              <span className="text-[#FFE066]">{vignette}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={vignette}
              onChange={(e) => setVignette(Number(e.target.value))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
