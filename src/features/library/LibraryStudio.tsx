/**
 * RAWx Studio — Preset & Asset Library
 * Public API: LibraryStudio component
 * Central hub for lens presets, 3D LUTs, typography styles, soundscapes, and beat templates.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Library, 
  Camera, 
  Palette, 
  Type, 
  Volume2, 
  Sparkles, 
  Check, 
  ArrowRight 
} from 'lucide-react';

export const LibraryStudio: React.FC = () => {
  const {
    activeShotIndex,
    activeLut,
    setLut,
    activeLens,
    setLens
  } = useStudioStore();

  const [activeCategory, setActiveCategory] = useState<'lens' | 'color' | 'type' | 'sound'>('lens');

  const lensPresets = [
    { name: '18mm Ultra Wide Cine', focal: 18, fStop: 'f/2.8', desc: 'Expansive environmental perspective with dramatic edge distortion' },
    { name: '24mm Wide Anamorphic', focal: 24, fStop: 'f/2.0', desc: '2x squeeze aesthetic with signature horizontal streak flares' },
    { name: '35mm Street Cinema', focal: 35, fStop: 'f/1.8', desc: 'The classic narrative focal length for human-environment balance' },
    { name: '50mm f/1.4 Human Eye', focal: 50, fStop: 'f/1.4', desc: 'Natural perspective mirroring human vision with creamy shallow focus' },
    { name: '85mm Portrait Bokeh', focal: 85, fStop: 'f/1.4', desc: 'Subject isolation with cinematic background compression' },
    { name: '135mm Telephoto Compression', focal: 135, fStop: 'f/2.0', desc: 'Extreme background magnification for intense dramatic tension' }
  ];

  const colorPresets = [
    { id: 'cinematic', name: 'RAWx Cinema 35', desc: 'Warm 35mm golden emulsion with rich velvet blacks' },
    { id: 'cyberpunk', name: 'Dhaka Night 2077', desc: 'Deep cyan shadows with electrifying amber neon highlights' },
    { id: 'noir', name: 'Monochrome Silver 400', desc: 'High-contrast black and white with dramatic tonal separation' },
    { id: 'bleach', name: 'Bleach Bypass Grit', desc: 'Desaturated palette with harsh silver halation highlights' },
    { id: 'kodachrome', name: 'Kodachrome Vintage 64', desc: 'Punchy retro primaries with iconic crimson reds' }
  ];

  const handleApplyLens = (lens: typeof lensPresets[0]) => {
    setLens(lens.name);
    alert(`Applied "${lens.name}" to Active Shot!`);
  };

  const handleApplyColor = (lutId: string) => {
    setLut(lutId);
    alert(`Applied LUT to Active Shot!`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Library className="w-4 h-4 text-[#D4AF37]" />
          <span className="font-bold text-[#FFE066]">PRESET & ASSET LIBRARY</span>
          <span className="text-[#8A8A8A]">| PRODUCTION ASSETS</span>
        </div>

        {/* Categories */}
        <div className="flex bg-[#121212] p-1 rounded border border-[#D4AF37]/20 text-xs">
          {(['lens', 'color', 'type', 'sound'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded capitalize transition-colors ${
                activeCategory === cat ? 'bg-[#D4AF37] text-black font-bold' : 'text-[#8A8A8A] hover:text-[#EDEDED]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#080808]">
        {activeCategory === 'lens' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {lensPresets.map((lens) => (
              <div
                key={lens.name}
                className="p-4 bg-[#0B0B0B] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-lg flex flex-col justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#FFE066]">{lens.name}</h3>
                    <span className="px-2 py-0.5 bg-[#121212] border border-[#D4AF37]/30 text-[10px] text-[#00FFCC] rounded">
                      {lens.fStop}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A8A8A] mt-2 leading-relaxed">{lens.desc}</p>
                </div>

                <button
                  onClick={() => handleApplyLens(lens)}
                  className="w-full py-1.5 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>APPLY LENS TO SHOT #{activeShotIndex + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeCategory === 'color' && (
          <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
            {colorPresets.map((lut) => (
              <div
                key={lut.id}
                className="p-4 bg-[#0B0B0B] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-lg flex flex-col justify-between gap-3 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#FFE066]">{lut.name}</h3>
                    {activeLut === lut.id && (
                      <span className="px-2 py-0.5 bg-[#D4AF37] text-black text-[10px] font-bold rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#8A8A8A] mt-2 leading-relaxed">{lut.desc}</p>
                </div>

                <button
                  onClick={() => handleApplyColor(lut.id)}
                  className="w-full py-1.5 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>LOAD 3D LUT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {(activeCategory === 'type' || activeCategory === 'sound') && (
          <div className="max-w-2xl p-6 bg-[#0B0B0B] border border-[#D4AF37]/20 rounded-lg text-center text-xs text-[#8A8A8A]">
            <p className="text-[#FFE066] font-bold mb-1">RAWx CINEMA PRESETS ACTIVE</p>
            <p>Presets are linked with the dedicated Text and Sound Studios.</p>
          </div>
        )}
      </div>
    </div>
  );
};
