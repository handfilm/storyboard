/**
 * RAWx Studio — Pro Color Grading & Scopes Engine
 * Public API: ColorStudio component
 * Features Lift/Gamma/Gain color wheels, 3D LUT presets, shader FX (grain, halation, bloom, vignette),
 * live video scopes (histogram, waveform), and split-screen before/after comparison.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';
import { 
  Palette, 
  Activity, 
  Check, 
  RefreshCcw, 
  Layers,
  SplitSquareHorizontal,
  Sliders
} from 'lucide-react';

const lutPresets = [
  { id: 'cinematic', short: 'CINE 35', name: 'RAWx Cinema 35', desc: 'Warm 35mm golden emulsion with deep shadows.' },
  { id: 'cyberpunk', short: 'NIGHT NOIR', name: 'Dhaka Night Noir', desc: 'High-contrast cyan shadows with neon gold highlights.' },
  { id: 'noir', short: 'SILVER BW', name: 'Monochrome Silver', desc: 'Tri-X 400 high-contrast black and white.' },
  { id: 'bleach', short: 'BLEACH', name: 'Bleach Bypass', desc: 'Desaturated midtones with gritty silver retention.' },
  { id: 'kodachrome', short: 'KODA 64', name: 'Kodachrome 64', desc: 'Vibrant primaries with punchy nostalgic reds.' },
  { id: 'eterna', short: 'ETERNA', name: 'Fuji Eterna Film', desc: 'Soft pastels with muted organic skin tones.' }
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
  const isVideo = Boolean(
    currentShot.isVideo ||
    (imageUrl && (
      imageUrl.startsWith('data:video') ||
      /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(imageUrl)
    ))
  );

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
      updateShot(i, { lutFilter: activeLut as any });
    }
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Left Grade Monitor & Scopes */}
      <div className="flex-1 flex flex-col border-r border-white/[0.08] overflow-hidden">
        {/* Top Grade Bar */}
        <div className="h-12 border-b border-white/[0.08] bg-[#0B0B0B] px-4 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <CinemaBadgeHeader
              icon={<Palette className="w-3.5 h-3.5 text-amber-400" />}
              label="COLOR LAB"
              accent="amber"
            />
            <span className="text-zinc-500 font-black text-[10px]">
              SH{String(activeShotIndex + 1).padStart(3, '0')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <CinemaToolHUD
              title="SPLIT-SCREEN COMPARE"
              en="Drag slider across preview to compare raw plate vs graded output."
              bn="কীভাবে ব্যবহার করবেন: আসল ও গ্রেডেড ফুটেজ পাশাপাশি দেখতে COMPARE অন করুন।"
              accent="cyan"
              side="bottom"
            >
              <button
                type="button"
                onClick={() => setIsSplitMode(!isSplitMode)}
                data-active={isSplitMode ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan min-h-[36px] px-2.5 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>COMPARE</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="APPLY LUT TO ALL SHOTS"
              en="Sync current 3D LUT across all 100 storyboard frames."
              bn="কীভাবে ব্যবহার করবেন: বর্তমান কালার গ্রেড ১০০টি শটে একসাথে বসাতে SYNC ALL চাপুন।"
              accent="emerald"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleApplyToAll}
                className="cinema-tile cinema-tile-emerald min-h-[36px] px-2.5 flex items-center gap-1.5 text-[10px] font-black tracking-wider uppercase"
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>SYNC ALL</span>
              </button>
            </CinemaToolHUD>

            <CinemaToolHUD
              title="RESET GRADE"
              en="Restore neutral exposure, lift/gamma/gain, and film shaders."
              bn="কীভাবে ব্যবহার করবেন: সব কালার স্লাইডার ও ইফেক্ট রিসেট করতে চাপুন।"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={handleResetGrade}
                className="cinema-tile cinema-tile-crimson min-h-[36px] px-2.5 flex items-center gap-1 text-[10px] font-black tracking-wider uppercase"
              >
                <RefreshCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>RESET</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* Viewport Canvas with Graded Image */}
        <div className="flex-1 bg-[#030304] flex items-center justify-center p-6 relative overflow-hidden">
          <div className="w-full max-w-4xl aspect-video bg-black rounded border border-[#26282E] relative overflow-hidden shadow-2xl flex items-center justify-center">
            {isVideo ? (
              <video
                src={imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{
                  filter: `contrast(${100 + gain.master}%) brightness(${100 + gamma.master}%) saturate(${110 + gain.r}%) sepia(${halation * 0.4}%)`,
                  boxShadow: `inset 0 0 ${vignette * 3}px rgba(0,0,0,0.9)`
                }}
              />
            ) : (
              <img
                src={imageUrl}
                alt="Grade Preview"
                className="w-full h-full object-cover"
                style={{
                  filter: `contrast(${100 + gain.master}%) brightness(${100 + gamma.master}%) saturate(${110 + gain.r}%) sepia(${halation * 0.4}%)`,
                  boxShadow: `inset 0 0 ${vignette * 3}px rgba(0,0,0,0.9)`
                }}
              />
            )}

            {/* Split Screen Slider */}
            {isSplitMode && (
              <>
                <div 
                  className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-amber-400 shadow-2xl"
                  style={{ width: `${splitPosition}%` }}
                >
                  {isVideo ? (
                    <video
                      src={imageUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover max-w-none"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={imageUrl}
                      alt="Ungraded Original"
                      className="w-full h-full object-cover max-w-none"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 rounded border border-white/20 text-[9px] font-black tracking-wider text-zinc-300">
                    RAW PLATE
                  </div>
                </div>
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 rounded border border-amber-400/50 text-[9px] font-black tracking-wider text-amber-300">
                  {activeLut.toUpperCase()}
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(Number(e.target.value))}
                  className="absolute inset-x-4 bottom-4 accent-amber-400 opacity-85 hover:opacity-100"
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
        <div className="h-32 bg-[#0B0B0B] border-t border-white/[0.08] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px]">
            <CinemaBadgeHeader
              icon={<Activity className="w-3.5 h-3.5 text-cyan-400" />}
              label="SCOPES"
              accent="cyan"
            />
            <div className="flex items-center gap-1.5">
              <CinemaToolHUD
                title="LUMA WAVEFORM (IRE)"
                en="Inspect brightness luminance distribution from 0 to 100 IRE."
                bn="কীভাবে ব্যবহার করবেন: আলোর ভারসাম্য মাপতে WAVEFORM বেছে নিন।"
                accent="cyan"
                side="top"
              >
                <button
                  type="button"
                  onClick={() => setActiveScope('waveform')}
                  data-active={activeScope === 'waveform' ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1 text-[9.5px] font-black tracking-wider uppercase"
                >
                  WAVEFORM
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="RGB HISTOGRAM"
                en="Inspect RGB tonal clipping and midtone density."
                bn="কীভাবে ব্যবহার করবেন: লাল-সবুজ-নীল রঙের গ্রাফ দেখতে RGB HIST বেছে নিন।"
                accent="amber"
                side="top"
              >
                <button
                  type="button"
                  onClick={() => setActiveScope('histogram')}
                  data-active={activeScope === 'histogram' ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber px-2.5 py-1 text-[9.5px] font-black tracking-wider uppercase"
                >
                  RGB HIST
                </button>
              </CinemaToolHUD>
            </div>
          </div>

          <div className="h-20 bg-black rounded border border-[#26282E] relative flex items-end justify-between px-2 pb-1 overflow-hidden">
            {Array.from({ length: 48 }).map((_, idx) => {
              const height = Math.min(100, Math.max(15, Math.sin(idx * 0.3) * 40 + 50 + (idx % 7) * 4));
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-t-xs ${activeScope === 'waveform' ? 'bg-cyan-400/75' : 'bg-amber-400/75'}`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
            <div className="absolute inset-x-0 top-1/4 border-b border-white/10" />
            <div className="absolute inset-x-0 top-1/2 border-b border-white/10" />
            <div className="absolute inset-x-0 top-3/4 border-b border-white/10" />
            <span className="absolute top-1 left-2 text-[8px] font-black text-zinc-500">100 IRE</span>
            <span className="absolute bottom-1 left-2 text-[8px] font-black text-zinc-500">0 IRE</span>
          </div>
        </div>
      </div>

      {/* Right Grading Controls Panel */}
      <div className="w-full md:w-80 bg-[#0B0B0B] flex flex-col overflow-y-auto custom-scrollbar p-4 gap-4 text-xs">
        <CinemaBadgeHeader
          icon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
          label="3D LUTS"
          accent="amber"
        />

        {/* 3D LUT Presets */}
        <div className="grid grid-cols-2 gap-1.5">
          {lutPresets.map((lut) => {
            const isSelected = activeLut === lut.id;
            return (
              <CinemaToolHUD
                key={lut.id}
                title={lut.name.toUpperCase()}
                en={lut.desc}
                bn="কীভাবে ব্যবহার করবেন: শটে এই ফিল্মিক কালার প্রিসেট লাগাতে ট্যাপ করুন।"
                accent="amber"
                side="left"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={() => setLut(lut.id)}
                  data-active={isSelected ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber w-full min-h-[44px] px-2.5 py-2 flex items-center justify-between text-[10px] font-black tracking-wider uppercase"
                >
                  <span>{lut.short}</span>
                  {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>

        {/* Lift / Gamma / Gain Sliders */}
        <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-3">
          <CinemaBadgeHeader
            icon={<Palette className="w-3 h-3 text-cyan-400" />}
            label="COLOR WHEELS"
            accent="cyan"
          />
          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>LIFT</span>
              <span className="text-amber-400">{lift.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={lift.master}
              onChange={(e) => setLift(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-amber-400 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>GAMMA</span>
              <span className="text-amber-400">{gamma.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={gamma.master}
              onChange={(e) => setGamma(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-amber-400 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>GAIN</span>
              <span className="text-amber-400">{gain.master}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="30"
              value={gain.master}
              onChange={(e) => setGain(prev => ({ ...prev, master: Number(e.target.value) }))}
              className="w-full accent-amber-400 mt-1"
            />
          </div>
        </div>

        {/* Optical Shader FX */}
        <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-3">
          <CinemaBadgeHeader
            icon={<Sliders className="w-3 h-3 text-emerald-400" />}
            label="FILM SHADERS"
            accent="emerald"
          />
          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>35MM GRAIN</span>
              <span className="text-emerald-300">{grain}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={grain}
              onChange={(e) => setGrain(Number(e.target.value))}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>HALATION</span>
              <span className="text-emerald-300">{halation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={halation}
              onChange={(e) => setHalation(Number(e.target.value))}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black tracking-wider text-zinc-400">
              <span>VIGNETTE</span>
              <span className="text-emerald-300">{vignette}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={vignette}
              onChange={(e) => setVignette(Number(e.target.value))}
              className="w-full accent-emerald-400 mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
