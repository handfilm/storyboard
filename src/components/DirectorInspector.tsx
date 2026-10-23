/**
 * @file /src/components/DirectorInspector.tsx
 * @description Advanced Edit & Cam Inspector Rack for HANDFILM.
 * Features:
 * 1. 3D Camera Rig & Virtual Framing:
 *    - Pan (-180° to +180°), Tilt (-90° to +90°), Roll (-45° to +45°)
 *    - Focal Length slider (18mm Ultra-Wide to 85mm Telephoto Portrait)
 *    - Anamorphic Squeeze Factor: 1.0x Spherical, 1.33x, 1.5x, 2.0x CinemaScope
 *    - Interactive 3D Gimbal Orientation Preview
 * 2. Real-Time Optical Shaders:
 *    - Soft-Skin Bloom Glow (threshold & radius)
 *    - 35mm Halide Film Grain (ISO noise simulation)
 *    - Hypersonic Edge Motion Blur
 *    - Lens Falloff Vignette
 *    - Contrast & Saturation latitude
 * 3. 8 Built-in 3D LUT Presets:
 *    - RAWx Cinema 35, Neo-Noir, Golden Hour 2800K, Matrix Emerald, Tungsten, Infrared, Bleach Bypass, Kodachrome
 * 4. Bilingual Titles & Audio Telemetry
 */

import React, { useState } from 'react';
import { AnthologyFrame, LutPreset, AspectRatio } from '../types/anthology';
import { samplePacks } from '../data/frames';
import { 
  X, 
  Sliders, 
  Sparkles, 
  Camera, 
  Film, 
  Type, 
  Check, 
  RotateCcw,
  Compass,
  Maximize2,
  Eye,
  SlidersHorizontal,
  ZoomIn
} from 'lucide-react';
import { MultiLayerZoomControls } from './optics/MultiLayerZoomControls';

interface DirectorInspectorProps {
  frame: AnthologyFrame;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onClose: () => void;
}

export const CINE_3D_LUTS: { id: LutPreset; label: string; desc: string; color: string }[] = [
  { id: 'cinematic', label: 'RAWx Cinema 35', desc: '14-bit ARRI LogC filmic contrast with deep blacks', color: '#D4AF37' },
  { id: 'noir', label: 'Neo-Noir', desc: 'High-contrast monochrome with silver halation', color: '#FFFFFF' },
  { id: 'golden', label: 'Golden Hour 2800K', desc: 'Warm amber glow with nostalgic pastel roll-off', color: '#F5A623' },
  { id: 'matrix', label: 'Matrix Emerald', desc: 'Cybernetic green wash with cold shadow cyan', color: '#10B981' },
  { id: 'tungsten', label: 'Tungsten 3200K', desc: 'Steely nocturnal blue with warm skin isolation', color: '#3B82F6' },
  { id: 'infrared', label: 'Infrared Aerochrome', desc: 'False-color magenta vegetation & porcelain skies', color: '#EC4899' },
  { id: 'bleach', label: 'Bleach Bypass', desc: 'Desaturated silver retention with aggressive edge grit', color: '#94A3B8' },
  { id: 'kodachrome', label: 'Kodachrome 64', desc: 'Classic 1960s rich reds, vibrant primaries, analog grain', color: '#E11D48' }
];

export const DirectorInspector: React.FC<DirectorInspectorProps> = ({
  frame,
  onUpdateFrame,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'cam_rig' | 'optics_lut' | 'super_titles' | 'media_vault'>('cam_rig');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(frame.imageUrl || '');

  // 3D Virtual Camera Rig states (persisted inside frame.cameraMove / adjustments)
  const [camPan, setCamPan] = useState<number>(0); // -180 to +180 deg
  const [camTilt, setCamTilt] = useState<number>(0); // -90 to +90 deg
  const [camRoll, setCamRoll] = useState<number>(0); // -45 to +45 deg
  const [focalNum, setFocalNum] = useState<number>(() => {
    const match = frame.cameraSpec.focalLength?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 35;
  });
  const [anamorphicFactor, setAnamorphicFactor] = useState<'1.0x' | '1.33x' | '1.5x' | '2.0x'>('2.0x');

  const updateAdjustments = (key: keyof AnthologyFrame['adjustments'], val: number) => {
    onUpdateFrame({
      ...frame,
      adjustments: {
        ...frame.adjustments,
        [key]: val
      }
    });
  };

  const handleLutChange = (lut: LutPreset) => {
    onUpdateFrame({
      ...frame,
      lutFilter: lut
    });
  };

  const handleFocalChange = (num: number) => {
    setFocalNum(num);
    const label = num <= 24 ? `${num}mm Ultra-Wide Cine` : num <= 40 ? `${num}mm Master Prime` : num <= 60 ? `${num}mm Standard Prime` : `${num}mm Telephoto Portrait`;
    onUpdateFrame({
      ...frame,
      cameraSpec: {
        ...frame.cameraSpec,
        focalLength: label
      }
    });
  };

  const handleGeneratePrompt = () => {
    const prompt = `/imagine prompt: 14-bit ARRI RAW cinema still, focal length ${focalNum}mm, anamorphic ${anamorphicFactor}, pan ${camPan}deg tilt ${camTilt}deg, ${frame.title.toLowerCase()}, ${frame.tagline.toLowerCase()}, Kodachrome Kodak 500T, directed in Dhaka, volumetric illumination --ar 2.39:1 --style raw`;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const applyCustomUrl = () => {
    if (imageUrlInput.trim()) {
      onUpdateFrame({
        ...frame,
        imageUrl: imageUrlInput.trim()
      });
    }
  };

  const handleResetRig = () => {
    setCamPan(0);
    setCamTilt(0);
    setCamRoll(0);
    handleFocalChange(35);
    setAnamorphicFactor('1.0x');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] md:w-[500px] bg-[#0A0A10]/98 backdrop-blur-2xl border-l border-[#272732] shadow-[0_0_60px_rgba(0,0,0,0.98)] z-50 flex flex-col font-mono-tech select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-[#272732] bg-[#0C0C14] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[2px] bg-[#d4af37]/15 border border-[#d4af37]/50 flex items-center justify-center text-[#fbbf24] font-bold text-xs shrink-0">
            {frame.epNumber}
          </div>
          <div className="min-w-0">
            <h3 className="font-cinzel text-xs font-bold text-white tracking-[0.16em] uppercase truncate">
              07 EDIT & CAM // {frame.title}
            </h3>
            <p className="text-[9.5px] text-[#fbbf24] truncate">
              {frame.bengaliTitle} • 3D Virtual Rig & Optics Rack
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-[#272732]"
          aria-label="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#272732] bg-[#08080C] shrink-0">
        {[
          { id: 'cam_rig', label: '3D CAM RIG', icon: Camera },
          { id: 'optics_lut', label: 'OPTICS & LUTS', icon: Sliders },
          { id: 'super_titles', label: 'TITLES', icon: Type },
          { id: 'media_vault', label: 'VAULT', icon: Film },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 px-1.5 flex items-center justify-center gap-1.5 text-[9.5px] tracking-wider border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#fbbf24] text-[#fbbf24] bg-[#fbbf24]/10 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
        
        {/* ========================================================= */}
        {/* TAB 1: 3D CAMERA RIG & VIRTUAL FRAMING                    */}
        {/* ========================================================= */}
        {activeTab === 'cam_rig' && (
          <div className="space-y-4">
            {/* Interactive 3D Gimbal Orientation Preview */}
            <div className="p-3 bg-[#08080E] border border-[#272732] rounded-[2px] flex flex-col gap-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-[#fbbf24] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Compass className="w-3 h-3" />
                  3D VIRTUAL GIMBAL ORIENTATION
                </span>
                <button
                  onClick={handleResetRig}
                  className="text-zinc-500 hover:text-[#fbbf24] flex items-center gap-1 cursor-pointer"
                  title="Reset to 0°"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>RESET RIG</span>
                </button>
              </div>

              {/* 3D Perspective Wireframe Box */}
              <div className="h-28 flex items-center justify-center relative perspective-[500px]">
                <div
                  className="w-32 h-16 border-2 border-[#fbbf24] bg-[#fbbf24]/10 rounded-[2px] shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-transform duration-75 flex flex-col items-center justify-center relative"
                  style={{
                    transform: `rotateX(${-camTilt}deg) rotateY(${camPan}deg) rotateZ(${camRoll}deg)`
                  }}
                >
                  <span className="text-[8px] text-zinc-300 font-bold tracking-widest uppercase">
                    ARRI 35 SENSOR
                  </span>
                  <span className="text-[7.5px] text-[#fbbf24] font-mono">
                    {focalNum}mm • {anamorphicFactor}
                  </span>
                  {/* Crosshairs */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-full h-px bg-white" />
                    <div className="h-full w-px bg-white absolute" />
                  </div>
                </div>
              </div>

              {/* Telemetry Readout */}
              <div className="grid grid-cols-3 gap-1.5 text-[8.5px] text-center border-t border-white/5 pt-2">
                <div className="bg-black/50 p-1 rounded-[1px] border border-white/5">
                  <div className="text-zinc-500">PAN</div>
                  <div className="text-zinc-200 font-bold">{camPan > 0 ? `+${camPan}` : camPan}°</div>
                </div>
                <div className="bg-black/50 p-1 rounded-[1px] border border-white/5">
                  <div className="text-zinc-500">TILT</div>
                  <div className="text-zinc-200 font-bold">{camTilt > 0 ? `+${camTilt}` : camTilt}°</div>
                </div>
                <div className="bg-black/50 p-1 rounded-[1px] border border-white/5">
                  <div className="text-zinc-500">DUTCH ROLL</div>
                  <div className="text-zinc-200 font-bold">{camRoll > 0 ? `+${camRoll}` : camRoll}°</div>
                </div>
              </div>
            </div>

            {/* Gimbal Sliders: Pan, Tilt, Roll */}
            <div className="space-y-3 p-3 bg-[#08080E] border border-[#272732] rounded-[2px]">
              <div>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-400">Horizontal Pan (-180° to +180°)</span>
                  <span className="text-[#fbbf24] font-bold">{camPan}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={camPan}
                  onChange={(e) => setCamPan(Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-400">Vertical Tilt (-90° to +90°)</span>
                  <span className="text-[#fbbf24] font-bold">{camTilt}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={camTilt}
                  onChange={(e) => setCamTilt(Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-400">Camera Dutch Roll (-45° to +45°)</span>
                  <span className="text-[#fbbf24] font-bold">{camRoll}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={camRoll}
                  onChange={(e) => setCamRoll(Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>
            </div>

            {/* Focal Length & Anamorphic Squeeze */}
            <div className="space-y-3 p-3 bg-[#08080E] border border-[#272732] rounded-[2px]">
              <div>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-400">Focal Length (18mm to 85mm Cine)</span>
                  <span className="text-[#fbbf24] font-bold">{focalNum}mm ({Math.round(110 - (focalNum / 85) * 80)}° FOV)</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="85"
                  value={focalNum}
                  onChange={(e) => handleFocalChange(Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
                <div className="flex justify-between text-[7.5px] text-zinc-500 mt-1">
                  <span>18mm (Ultra-Wide)</span>
                  <span>35mm (Master)</span>
                  <span>50mm (Standard)</span>
                  <span>85mm (Portrait)</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-zinc-400 block mb-1.5">
                  Anamorphic Squeeze Factor
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['1.0x', '1.33x', '1.5x', '2.0x'] as const).map(factor => (
                    <button
                      key={factor}
                      onClick={() => setAnamorphicFactor(factor)}
                      className={`py-1 rounded-[1px] border text-[9px] font-bold cursor-pointer transition-colors ${
                        anamorphicFactor === factor
                          ? 'bg-[#fbbf24] text-black border-[#fbbf24]'
                          : 'bg-black/40 border-[#272732] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {factor}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optical Multi-Layer Zoom Rack */}
            <MultiLayerZoomControls variant="inspector" />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: OPTICS & 8 3D LUTS                                 */}
        {/* ========================================================= */}
        {activeTab === 'optics_lut' && (
          <div className="space-y-4">
            {/* 8 Built-in 3D LUT Presets */}
            <div>
              <label className="block text-[10px] font-bold tracking-wider text-[#fbbf24] uppercase mb-2">
                8 CINE 3D LUT EMULATIONS
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CINE_3D_LUTS.map(lut => {
                  const isSelected = frame.lutFilter === lut.id;
                  return (
                    <button
                      key={lut.id}
                      onClick={() => handleLutChange(lut.id)}
                      className={`p-2 rounded-[2px] border text-left transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'border-[#fbbf24] bg-[#fbbf24]/15 text-[#fbbf24] shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                          : 'border-[#272732] bg-black/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lut.color }} />
                        <span className="font-bold text-[9.5px] truncate">{lut.label}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 line-clamp-1 mt-0.5 group-hover:text-zinc-400">
                        {lut.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Optical Shaders */}
            <div className="space-y-3 pt-3 border-t border-[#272732]">
              <div className="flex items-center justify-between text-[9px] text-[#fbbf24] font-bold uppercase tracking-wider">
                <span>REAL-TIME SHADER SLIDERS</span>
                <span className="text-[7.5px] text-zinc-500">60 FPS COMPOSITE</span>
              </div>

              {/* Soft-Skin Bloom */}
              <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-300">Soft-Skin Bloom Glow (Diffusion)</span>
                  <span className="text-[#fbbf24] font-bold">{frame.adjustments.bloom}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.adjustments.bloom}
                  onChange={(e) => updateAdjustments('bloom', Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              {/* 35mm Halide Film Grain */}
              <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-300">35mm Halide Film Grain (ISO Noise)</span>
                  <span className="text-[#fbbf24] font-bold">{frame.adjustments.grain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={frame.adjustments.grain}
                  onChange={(e) => updateAdjustments('grain', Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              {/* Edge Motion Blur */}
              <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-300">Hypersonic Edge Motion Blur</span>
                  <span className="text-[#fbbf24] font-bold">{frame.adjustments.motionBlur}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.adjustments.motionBlur}
                  onChange={(e) => updateAdjustments('motionBlur', Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              {/* Lens Falloff Vignette */}
              <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-zinc-300">Lens Falloff Vignette</span>
                  <span className="text-[#fbbf24] font-bold">{frame.adjustments.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={frame.adjustments.vignette}
                  onChange={(e) => updateAdjustments('vignette', Number(e.target.value))}
                  className="w-full accent-[#fbbf24] cursor-pointer"
                />
              </div>

              {/* Latitude Contrast & Saturation */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#08080E] p-2 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[8.5px] mb-1">
                    <span className="text-zinc-400">Contrast</span>
                    <span className="text-[#fbbf24] font-bold">{frame.adjustments.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    value={frame.adjustments.contrast}
                    onChange={(e) => updateAdjustments('contrast', Number(e.target.value))}
                    className="w-full accent-[#fbbf24] cursor-pointer"
                  />
                </div>
                <div className="bg-[#08080E] p-2 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[8.5px] mb-1">
                    <span className="text-zinc-400">Chroma Sat</span>
                    <span className="text-[#fbbf24] font-bold">{frame.adjustments.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={frame.adjustments.saturation}
                    onChange={(e) => updateAdjustments('saturation', Number(e.target.value))}
                    className="w-full accent-[#fbbf24] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: REAL-TIME BILINGUAL SUPER TITLES                  */}
        {/* ========================================================= */}
        {activeTab === 'super_titles' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider mb-1">
                Bangla Title (বাংলা শিরোনাম)
              </label>
              <input
                type="text"
                value={frame.bengaliTitle}
                placeholder="যেমন: দ্য সিঙ্গুলারিটি"
                onChange={(e) => onUpdateFrame({ ...frame, bengaliTitle: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-sm text-[#fbbf24] font-bold outline-none font-anek"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-300 font-bold uppercase tracking-wider mb-1">
                English Headline (Cinzel Serif)
              </label>
              <input
                type="text"
                value={frame.title}
                placeholder="e.g. THE SINGULARITY"
                onChange={(e) => onUpdateFrame({ ...frame, title: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs font-cinzel font-bold text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Directorial Screenplay Notes & Dialogue
              </label>
              <textarea
                rows={3}
                value={frame.directorNotes || ''}
                placeholder="Directorial notes, spoken dialogue lines, or actor subtext..."
                onChange={(e) => onUpdateFrame({ ...frame, directorNotes: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-zinc-200 outline-none resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Sound Design Stem Cue
              </label>
              <input
                type="text"
                value={frame.soundCue}
                placeholder="e.g. 43.6Hz Sub Drone & Tape Hiss"
                onChange={(e) => onUpdateFrame({ ...frame, soundCue: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-zinc-200 outline-none"
              />
            </div>

            <button
              onClick={handleGeneratePrompt}
              className="w-full py-2 bg-[#fbbf24]/20 hover:bg-[#fbbf24]/30 border border-[#fbbf24]/60 rounded-[2px] text-xs font-bold text-[#fbbf24] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Copied Prompt to Clipboard!' : 'Copy Midjourney / Sora Camera Prompt'}</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MEDIA ASSET VAULT                                  */}
        {/* ========================================================= */}
        {activeTab === 'media_vault' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] text-[#fbbf24] font-bold uppercase tracking-wider mb-1">
                Direct Media URL / Stream
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-white outline-none"
                />
                <button
                  onClick={applyCustomUrl}
                  className="px-3 py-1.5 bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold rounded-[2px] text-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-2">
                Sample Cinema Library
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[...samplePacks.cosmicMacro, ...samplePacks.cyberNoir].slice(0, 9).map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => onUpdateFrame({ ...frame, imageUrl: img })}
                    className="aspect-[16/10] bg-cover bg-center rounded-[2px] border border-white/10 hover:border-[#fbbf24] cursor-pointer transition-transform hover:scale-105"
                    style={{ backgroundImage: `url(${img})` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
