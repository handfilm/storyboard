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
import { PROCEDURAL_PALETTES } from '../data/proceduralCinemaEngine';
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
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

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
    <div
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(10, 10, 10, 0.85)' }}
      className="fixed inset-y-0 right-0 w-full sm:w-[460px] md:w-[500px] border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.95)] z-50 flex flex-col font-mono-tech select-none animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[2px] bg-[#d4af37]/15 border border-[#d4af37]/50 flex items-center justify-center text-[#fbbf24] font-bold text-xs shrink-0">
            {frame.epNumber}
          </div>
          <div className="min-w-0">
            <CinemaBadgeHeader icon={Sliders} label="INSPECTOR" accent="amber" />
            <p className="text-[9.5px] font-bold text-[#fbbf24] truncate mt-0.5">
              {frame.bengaliTitle || frame.title}
            </p>
          </div>
        </div>

        <CinemaToolHUD
          title="CLOSE INSPECTOR"
          en="Closes the optical camera and grade inspector sidebar."
          bn="কীভাবে ব্যবহার করবেন: ইন্সপেক্টর প্যানেল বন্ধ করতে ক্লিক করুন।"
          accent="crimson"
          side="left"
        >
          <button
            onClick={onClose}
            className="cinema-tile cinema-tile-crimson p-1.5 rounded-[2px] cursor-pointer"
            aria-label="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </CinemaToolHUD>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1.5 border-b border-white/10 bg-black/30 shrink-0">
        {[
          { id: 'cam_rig', label: 'CAM RIG', full: '3D CAMERA RIG', en: 'Adjust 3D pan, tilt, roll, focal length, and anamorphic squeeze.', bn: 'কীভাবে ব্যবহার করবেন: ক্যামেরার অ্যাঙ্গেল, লেন্স ও অ্যানামর্ফিক স্কুইজ ঠিক করুন।', icon: Camera, accent: 'amber' as const },
          { id: 'optics_lut', label: 'LUTS & FX', full: 'OPTICS & 3D LUTS', en: 'Apply 3D film stock LUTs, grain, bloom, and exposure sliders.', bn: 'কীভাবে ব্যবহার করবেন: ৩ডি লুট ও অপটিক্যাল গ্লো-গ্রেইন ইফেক্ট দিন।', icon: Sliders, accent: 'cyan' as const },
          { id: 'super_titles', label: 'TITLES', full: 'BILINGUAL TITLES', en: 'Edit Bangla/English shot headlines, director notes, and audio cues.', bn: 'কীভাবে ব্যবহার করবেন: বাংলা-ইংরেজি টাইটেল এবং ডায়ালগ লিখুন।', icon: Type, accent: 'amber' as const },
          { id: 'media_vault', label: 'VAULT', full: 'MEDIA & PALETTES', en: 'Assign external URLs or procedural cinema color palettes.', bn: 'কীভাবে ব্যবহার করবেন: শটের ব্যাকগ্রাউন্ড লিংক বা প্রসিডিউরাল প্যালেট বাছুন।', icon: Film, accent: 'emerald' as const },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <CinemaToolHUD key={tab.id} title={tab.full} en={tab.en} bn={tab.bn} accent={tab.accent} side="bottom">
              <button
                type="button"
                data-active={isActive ? 'true' : 'false'}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`cinema-tile cinema-tile-${tab.accent} w-full min-h-[44px] py-1.5 px-1 rounded flex flex-col items-center justify-center gap-1 cursor-pointer`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[9.5px] font-black tracking-wider truncate max-w-full">{tab.label}</span>
              </button>
            </CinemaToolHUD>
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
                <CinemaBadgeHeader icon={Compass} label="3D GIMBAL" accent="amber" />
                <CinemaToolHUD
                  title="RESET GIMBAL"
                  en="Resets Pan, Tilt, Roll, Focal Length, and Anamorphic Squeeze to defaults."
                  bn="কীভাবে ব্যবহার করবেন: ক্যামেরা রিগ রিসেট করতে RESET চাপুন।"
                  accent="amber"
                  side="left"
                >
                  <button
                    type="button"
                    onClick={handleResetRig}
                    className="cinema-tile cinema-tile-amber px-2 py-1 rounded flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>RESET</span>
                  </button>
                </CinemaToolHUD>
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
                    ARRI 35
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
                  <div className="text-zinc-500 font-black">PAN</div>
                  <div className="text-zinc-200 font-bold">{camPan > 0 ? `+${camPan}` : camPan}°</div>
                </div>
                <div className="bg-black/50 p-1 rounded-[1px] border border-white/5">
                  <div className="text-zinc-500 font-black">TILT</div>
                  <div className="text-zinc-200 font-bold">{camTilt > 0 ? `+${camTilt}` : camTilt}°</div>
                </div>
                <div className="bg-black/50 p-1 rounded-[1px] border border-white/5">
                  <div className="text-zinc-500 font-black">ROLL</div>
                  <div className="text-zinc-200 font-bold">{camRoll > 0 ? `+${camRoll}` : camRoll}°</div>
                </div>
              </div>
            </div>

            {/* Gimbal Sliders: Pan, Tilt, Roll */}
            <div className="space-y-3 p-3 bg-[#08080E] border border-[#272732] rounded-[2px]">
              <CinemaToolHUD
                title="HORIZONTAL PAN"
                en="Rotates camera sensor horizontally from -180° to +180°."
                bn="কীভাবে ব্যবহার করবেন: ক্যামেরা ডানে বা বামে ঘোরানোর জন্য স্লাইডার সরান।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div>
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">PAN</span>
                    <span className="text-[#fbbf24]">{camPan}°</span>
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
              </CinemaToolHUD>

              <CinemaToolHUD
                title="VERTICAL TILT"
                en="Tilts camera sensor up or down from -90° to +90°."
                bn="কীভাবে ব্যবহার করবেন: ক্যামেরা ওপরে বা নিচে কাত করতে স্লাইডার সরান।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div>
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">TILT</span>
                    <span className="text-[#fbbf24]">{camTilt}°</span>
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
              </CinemaToolHUD>

              <CinemaToolHUD
                title="DUTCH ROLL"
                en="Applies tilted horizon Dutch roll from -45° to +45°."
                bn="কীভাবে ব্যবহার করবেন: ড্রামাটিক কাত হওয়া ফ্রেমের জন্য স্লাইডার সরান।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div>
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">ROLL</span>
                    <span className="text-[#fbbf24]">{camRoll}°</span>
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
              </CinemaToolHUD>
            </div>

            {/* Focal Length & Anamorphic Squeeze */}
            <div className="space-y-3 p-3 bg-[#08080E] border border-[#272732] rounded-[2px]">
              <CinemaToolHUD
                title="FOCAL LENGTH"
                en="Adjusts cinema prime lens between 18mm ultra-wide and 85mm telephoto."
                bn="কীভাবে ব্যবহার করবেন: ওয়াইড বা ক্লোজ লেন্স ইফেক্ট পেতে ফোকাল লেংথ পরিবর্তন করুন।"
                accent="cyan"
                side="left"
                blockWrapper
              >
                <div>
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">LENS MM</span>
                    <span className="text-[#fbbf24]">{focalNum}mm ({Math.round(110 - (focalNum / 85) * 80)}° FOV)</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="85"
                    value={focalNum}
                    onChange={(e) => handleFocalChange(Number(e.target.value))}
                    className="w-full accent-[#fbbf24] cursor-pointer"
                  />
                  <div className="flex justify-between text-[7.5px] font-black text-zinc-500 mt-1">
                    <span>18MM</span>
                    <span>35MM</span>
                    <span>50MM</span>
                    <span>85MM</span>
                  </div>
                </div>
              </CinemaToolHUD>

              <div>
                <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase block mb-1.5">
                  SQUEEZE
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['1.0x', '1.33x', '1.5x', '2.0x'] as const).map(factor => (
                    <CinemaToolHUD
                      key={factor}
                      title={`ANAMORPHIC ${factor}`}
                      en={`Sets ${factor} anamorphic optical desqueeze ratio.`}
                      bn="কীভাবে ব্যবহার করবেন: সিনেমাস্কোপ অ্যানামর্ফিক অনুপাত বাছতে ক্লিক করুন।"
                      accent="amber"
                      side="top"
                    >
                      <button
                        type="button"
                        data-active={anamorphicFactor === factor ? 'true' : 'false'}
                        onClick={() => setAnamorphicFactor(factor)}
                        className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-1 rounded text-[10px] font-black cursor-pointer"
                      >
                        {factor}
                      </button>
                    </CinemaToolHUD>
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
            <div className="space-y-2">
              <CinemaBadgeHeader icon={Sparkles} label="3D LUTS" accent="cyan" />
              <div className="grid grid-cols-2 gap-2">
                {CINE_3D_LUTS.map(lut => {
                  const isSelected = frame.lutFilter === lut.id;
                  return (
                    <CinemaToolHUD
                      key={lut.id}
                      title={lut.label.toUpperCase()}
                      en={lut.desc}
                      bn="কীভাবে ব্যবহার করবেন: শটে এই ৩ডি কালার গ্রেড দিতে কার্ডে ক্লিক করুন।"
                      accent="cyan"
                      side="left"
                    >
                      <button
                        type="button"
                        data-active={isSelected ? 'true' : 'false'}
                        onClick={() => handleLutChange(lut.id)}
                        className="cinema-tile cinema-tile-cyan w-full min-h-[44px] p-2 rounded text-left cursor-pointer flex items-center gap-2"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lut.color }} />
                        <span className="font-black text-[10px] tracking-wider uppercase truncate">{lut.label}</span>
                      </button>
                    </CinemaToolHUD>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Optical Shaders */}
            <div className="space-y-3 pt-3 border-t border-[#272732]">
              <CinemaBadgeHeader icon={SlidersHorizontal} label="SHADERS" accent="amber" />

              {/* Soft-Skin Bloom */}
              <CinemaToolHUD
                title="HALATION BLOOM"
                en="Soft-skin optical halation glow around highlights."
                bn="কীভাবে ব্যবহার করবেন: লাইটের চারপাশে সফট সিনেম্যাটিক গ্লো দিতে বাড়ান।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-300">BLOOM</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.bloom}%</span>
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
              </CinemaToolHUD>

              {/* 35mm Halide Film Grain */}
              <CinemaToolHUD
                title="35MM FILM GRAIN"
                en="Simulates organic 35mm silver halide ISO film grain."
                bn="কীভাবে ব্যবহার করবেন: রিয়েল ফিল্ম গ্রেইন টেক্সচার আনতে স্লাইডার সরান।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-300">GRAIN</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.grain}%</span>
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
              </CinemaToolHUD>

              {/* Edge Motion Blur */}
              <CinemaToolHUD
                title="MOTION BLUR"
                en="Adds directional hypersonic lens edge motion blur."
                bn="কীভাবে ব্যবহার করবেন: ফ্রেমের ধারে মোশন ব্লার স্পিড দিতে বাড়ান।"
                accent="cyan"
                side="left"
                blockWrapper
              >
                <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-300">MOTION BLUR</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.motionBlur}%</span>
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
              </CinemaToolHUD>

              {/* Lens Falloff Vignette */}
              <CinemaToolHUD
                title="LENS VIGNETTE"
                en="Controls optical corner light falloff around frame edges."
                bn="কীভাবে ব্যবহার করবেন: ছবির চারপাশের ডার্ক ফোকাস ভিনিয়েট সেট করুন।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <div className="bg-[#08080E] p-2.5 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[9px] font-black tracking-wider mb-1">
                    <span className="text-zinc-300">VIGNETTE</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.vignette}%</span>
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
              </CinemaToolHUD>

              {/* Latitude Contrast & Saturation */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#08080E] p-2 rounded-[2px] border border-[#272732]">
                  <div className="flex justify-between text-[8.5px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">CONTRAST</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.contrast}%</span>
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
                  <div className="flex justify-between text-[8.5px] font-black tracking-wider mb-1">
                    <span className="text-zinc-400">CHROMA</span>
                    <span className="text-[#fbbf24]">{frame.adjustments.saturation}%</span>
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
              <label className="block text-[9.5px] text-[#fbbf24] font-black uppercase tracking-wider mb-1">
                BN TITLE
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
              <label className="block text-[9.5px] text-zinc-300 font-black uppercase tracking-wider mb-1">
                EN TITLE
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
              <label className="block text-[9.5px] font-black text-zinc-400 uppercase tracking-wider mb-1">
                NOTES
              </label>
              <textarea
                rows={3}
                value={frame.directorNotes || ''}
                placeholder="Blocking or dialogue..."
                onChange={(e) => onUpdateFrame({ ...frame, directorNotes: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-zinc-200 outline-none resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[9.5px] font-black text-zinc-400 uppercase tracking-wider mb-1">
                SOUND CUE
              </label>
              <input
                type="text"
                value={frame.soundCue}
                placeholder="e.g. 43.6Hz Sub Drone"
                onChange={(e) => onUpdateFrame({ ...frame, soundCue: e.target.value })}
                className="w-full px-3 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-zinc-200 outline-none"
              />
            </div>

            <CinemaToolHUD
              title="COPY AI CAMERA PROMPT"
              en="Generates and copies a cinematic camera + lens AI prompt for this shot."
              bn="কীভাবে ব্যবহার করবেন: শটের এআই প্রম্পট কপি করতে COPY PROMPT চাপুন।"
              accent="amber"
              side="top"
            >
              <button
                type="button"
                onClick={handleGeneratePrompt}
                className="cinema-tile cinema-tile-amber w-full min-h-[44px] py-2 rounded font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4" />}
                <span>{copiedPrompt ? 'COPIED' : 'COPY PROMPT'}</span>
              </button>
            </CinemaToolHUD>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MEDIA ASSET VAULT                                  */}
        {/* ========================================================= */}
        {activeTab === 'media_vault' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[9.5px] text-[#fbbf24] font-black uppercase tracking-wider mb-1">
                MEDIA URL
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-black/60 border border-[#272732] focus:border-[#fbbf24] rounded-[2px] text-xs text-white outline-none"
                />
                <CinemaToolHUD
                  title="APPLY MEDIA URL"
                  en="Binds the pasted image or video stream URL to this shot."
                  bn="কীভাবে ব্যবহার করবেন: লিংক পেস্ট করে APPLY চাপুন।"
                  accent="amber"
                  side="left"
                >
                  <button
                    type="button"
                    data-active="true"
                    onClick={applyCustomUrl}
                    className="cinema-tile cinema-tile-amber px-3 py-1.5 font-black rounded text-[10px] uppercase cursor-pointer"
                  >
                    APPLY
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <CinemaBadgeHeader icon={Film} label="PALETTES" accent="emerald" />
                {frame.imageUrl && (
                  <CinemaToolHUD
                    title="RESET PROCEDURAL"
                    en="Clears uploaded media and restores procedural cinema backdrop."
                    bn="কীভাবে ব্যবহার করবেন: ছবি মুছে প্রসিডিউরাল প্যালেট ফেরাতে চাপুন।"
                    accent="crimson"
                    side="left"
                  >
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({ ...frame, imageUrl: undefined, thumbnailUrl: undefined, isVideo: false })}
                      className="cinema-tile cinema-tile-crimson px-2 py-1 text-[9px] font-black uppercase rounded cursor-pointer"
                    >
                      RESET
                    </button>
                  </CinemaToolHUD>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PROCEDURAL_PALETTES.map((pal) => (
                  <CinemaToolHUD
                    key={pal.id}
                    title={pal.name.toUpperCase()}
                    en="Applies procedural cinema backdrop palette with zero external photos."
                    bn="কীভাবে ব্যবহার করবেন: শটে এই সিনেম্যাটিক ব্যাকড্রপ দিতে ক্লিক করুন।"
                    accent="amber"
                    side="left"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFrame({
                          ...frame,
                          imageUrl: undefined,
                          thumbnailUrl: undefined,
                          isVideo: false,
                          proceduralPaletteId: pal.id,
                          colorAccent: pal.accentHex
                        })
                      }
                      className="cinema-tile cinema-tile-amber relative aspect-[16/9] w-full rounded overflow-hidden text-left p-1.5 flex items-end cursor-pointer"
                      style={{ background: pal.thumbCssBackdrop }}
                    >
                      <span className="font-mono text-[8.5px] font-black tracking-wider uppercase text-white/95 drop-shadow">
                        {pal.name}
                      </span>
                    </button>
                  </CinemaToolHUD>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
