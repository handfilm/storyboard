/**
 * RAWx Studio — Preset & Asset Library
 * Public API: LibraryStudio component
 * Central hub for lens presets, 3D LUTs, typography styles, soundscapes, and beat templates.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
import { 
  Library, 
  Camera, 
  Palette, 
  Type, 
  Volume2, 
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
  const [appliedBadge, setAppliedBadge] = useState<string | null>(null);

  const lensPresets = [
    { short: '18MM WIDE', name: '18mm Ultra Wide Cine', focal: 18, fStop: 'f/2.8', desc: 'Expansive environmental perspective with dramatic edge distortion.' },
    { short: '24MM ANAM', name: '24mm Wide Anamorphic', focal: 24, fStop: 'f/2.0', desc: '2x squeeze aesthetic with signature horizontal streak flares.' },
    { short: '35MM CINE', name: '35mm Street Cinema', focal: 35, fStop: 'f/1.8', desc: 'Classic narrative focal length for balanced framing.' },
    { short: '50MM EYE', name: '50mm f/1.4 Human Eye', focal: 50, fStop: 'f/1.4', desc: 'Natural perspective with creamy shallow depth of field.' },
    { short: '85MM BOKEH', name: '85mm Portrait Bokeh', focal: 85, fStop: 'f/1.4', desc: 'Subject isolation with smooth background compression.' },
    { short: '135MM TELE', name: '135mm Telephoto Compression', focal: 135, fStop: 'f/2.0', desc: 'Extreme background magnification for dramatic tension.' }
  ];

  const colorPresets = [
    { id: 'cinematic', short: 'CINE 35', name: 'RAWx Cinema 35', desc: 'Warm 35mm golden emulsion with velvet blacks.' },
    { id: 'cyberpunk', short: 'NIGHT 77', name: 'Dhaka Night 2077', desc: 'Deep cyan shadows with amber neon highlights.' },
    { id: 'noir', short: 'SILVER BW', name: 'Monochrome Silver 400', desc: 'High-contrast monochrome tonal separation.' },
    { id: 'bleach', short: 'BLEACH', name: 'Bleach Bypass Grit', desc: 'Desaturated midtones with gritty halation highlights.' },
    { id: 'kodachrome', short: 'KODA 64', name: 'Kodachrome Vintage 64', desc: 'Punchy retro primaries with deep crimson reds.' }
  ];

  const handleApplyLens = (lens: typeof lensPresets[0]) => {
    setLens(lens.name);
    setAppliedBadge(lens.short);
    setTimeout(() => setAppliedBadge(null), 1600);
  };

  const handleApplyColor = (lutId: string, short: string) => {
    setLut(lutId);
    setAppliedBadge(short);
    setTimeout(() => setAppliedBadge(null), 1600);
  };

  const catIcons = {
    lens: Camera,
    color: Palette,
    type: Type,
    sound: Volume2
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-white/[0.08] bg-[#0B0B0B] px-4 flex items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <CinemaBadgeHeader
            icon={<Library className="w-3.5 h-3.5 text-amber-400" />}
            label="ASSET VAULT"
            accent="amber"
          />
          {appliedBadge && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black tracking-wider">
              {appliedBadge} ON
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-1.5">
          {(['lens', 'color', 'type', 'sound'] as const).map(cat => {
            const Icon = catIcons[cat];
            const accent = cat === 'color' ? 'cyan' : cat === 'sound' ? 'emerald' : 'amber';
            return (
              <CinemaToolHUD
                key={cat}
                title={`${cat.toUpperCase()} PRESETS`}
                en={`Browse studio ${cat} presets for the active shot.`}
                bn={`কীভাবে ব্যবহার করবেন: ${cat.toUpperCase()} প্রিসেট ক্যাটাগরি দেখতে ট্যাপ করুন।`}
                accent={accent}
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  data-active={activeCategory === cat ? 'true' : 'false'}
                  className={`cinema-tile cinema-tile-${accent} min-h-[36px] px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                  <span>{cat}</span>
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#080808]">
        {activeCategory === 'lens' && (
          <div className="max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lensPresets.map((lens) => {
              const isSelected = activeLens === lens.name;
              return (
                <CinemaToolHUD
                  key={lens.name}
                  title={`${lens.name.toUpperCase()} (${lens.fStop})`}
                  en={lens.desc}
                  bn={`কীভাবে ব্যবহার করবেন: শট #${activeShotIndex + 1}-এ ${lens.focal}mm লেন্স লাগাতে ক্লিক করুন।`}
                  accent="amber"
                  side="top"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => handleApplyLens(lens)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-amber w-full min-h-[78px] p-3 flex flex-col justify-between gap-2 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Camera className="w-4 h-4" strokeWidth={2.2} />
                      <span className="text-[10px] font-black tracking-wider text-cyan-300">
                        {lens.fStop}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-black tracking-wider uppercase">{lens.short}</span>
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5 opacity-60" />}
                    </div>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        )}

        {activeCategory === 'color' && (
          <div className="max-w-4xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {colorPresets.map((lut) => {
              const isSelected = activeLut === lut.id;
              return (
                <CinemaToolHUD
                  key={lut.id}
                  title={lut.name.toUpperCase()}
                  en={lut.desc}
                  bn="কীভাবে ব্যবহার করবেন: বর্তমান শটে এই 3D LUT কালার গ্রেড অ্যাপ্লাই করতে ক্লিক করুন।"
                  accent="cyan"
                  side="top"
                  blockWrapper
                >
                  <button
                    type="button"
                    onClick={() => handleApplyColor(lut.id, lut.short)}
                    data-active={isSelected ? 'true' : 'false'}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[78px] p-3 flex flex-col justify-between gap-2 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <Palette className="w-4 h-4" strokeWidth={2.2} />
                      {isSelected && <Check className="w-4 h-4" strokeWidth={2.5} />}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-black tracking-wider uppercase">{lut.short}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                    </div>
                  </button>
                </CinemaToolHUD>
              );
            })}
          </div>
        )}

        {(activeCategory === 'type' || activeCategory === 'sound') && (
          <div className="max-w-md mx-auto p-5 bg-[#111215] border border-[#26282E] rounded-lg flex flex-col items-center gap-2 text-center">
            {activeCategory === 'type' ? (
              <CinemaBadgeHeader icon={<Type className="w-4 h-4 text-amber-400" />} label="TEXT LINKED" accent="amber" />
            ) : (
              <CinemaBadgeHeader icon={<Volume2 className="w-4 h-4 text-emerald-400" />} label="AUDIO LINKED" accent="emerald" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
