import React, { useState } from 'react';
import { AnthologyFrame, LutPreset, AspectRatio } from '../types/anthology';
import { lutPresetsList, samplePacks } from '../data/frames';
import { 
  X, 
  Sliders, 
  Sparkles, 
  Camera, 
  Film, 
  Type, 
  Volume2, 
  Check, 
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';

interface DirectorInspectorProps {
  frame: AnthologyFrame;
  onUpdateFrame: (updated: AnthologyFrame) => void;
  onClose: () => void;
}

export const DirectorInspector: React.FC<DirectorInspectorProps> = ({
  frame,
  onUpdateFrame,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'optics' | 'script' | 'camera' | 'media'>('optics');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(frame.imageUrl || '');

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

  const handleGeneratePrompt = () => {
    const prompt = `/imagine prompt: cinematic 35mm film still of ${frame.title.toLowerCase()}, ${frame.tagline.toLowerCase()}, extreme macro focus, anamorphic lens flare, Kodak Vision3 500T, directed in Dhaka, 8k resolution, volumetric lighting, photorealistic --ar 21:9 --style raw`;
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

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] md:w-[480px] bg-[#0c0d12] border-l border-white/15 shadow-2xl z-50 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xs bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono-tech text-xs font-bold">
            {frame.epNumber}
          </div>
          <div>
            <h3 className="font-cinzel text-sm font-bold text-white tracking-wider uppercase truncate max-w-[240px]">
              {frame.title}
            </h3>
            <p className="font-bengali text-xs text-amber-400">
              {frame.bengaliTitle} • Director Inspector
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xs hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          aria-label="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/40">
        {[
          { id: 'optics', label: 'Optics & LUTs', icon: Sliders },
          { id: 'script', label: 'Script & Notes', icon: Type },
          { id: 'camera', label: 'Camera Rig', icon: Camera },
          { id: 'media', label: 'Media Assets', icon: Film },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 text-[11px] font-mono-tech tracking-wider border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-amber-400 text-amber-400 bg-white/5 font-semibold'
                  : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* TAB 1: OPTICS & LUTS */}
        {activeTab === 'optics' && (
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-2">
                Color Grading LUT Preset
              </label>
              <div className="grid grid-cols-3 gap-2">
                {lutPresetsList.map(lut => (
                  <button
                    key={lut.id}
                    onClick={() => handleLutChange(lut.id)}
                    className={`p-2 rounded-xs border text-left text-[10px] font-mono-tech transition-all cursor-pointer ${
                      frame.lutFilter === lut.id
                        ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <div className="font-semibold">{lut.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optical Sliders */}
            <div className="space-y-4 pt-2 border-t border-white/10">
              <h4 className="text-[11px] font-mono-tech tracking-wider text-white/70 uppercase">
                Optical Elements & Post-Processing
              </h4>

              {/* Bloom / Soft Focus Glow */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">Soft-Skin Bloom Glow</span>
                  <span className="text-amber-400">{frame.adjustments.bloom}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.adjustments.bloom}
                  onChange={(e) => updateAdjustments('bloom', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Motion Blur */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">Hypersonic Edge Motion Blur</span>
                  <span className="text-amber-400">{frame.adjustments.motionBlur}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={frame.adjustments.motionBlur}
                  onChange={(e) => updateAdjustments('motionBlur', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Film Grain */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">35mm Halide Film Grain</span>
                  <span className="text-amber-400">{frame.adjustments.grain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={frame.adjustments.grain}
                  onChange={(e) => updateAdjustments('grain', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">Latitude Contrast</span>
                  <span className="text-amber-400">{frame.adjustments.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="160"
                  value={frame.adjustments.contrast}
                  onChange={(e) => updateAdjustments('contrast', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Saturation */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">Chroma Saturation</span>
                  <span className="text-amber-400">{frame.adjustments.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={frame.adjustments.saturation}
                  onChange={(e) => updateAdjustments('saturation', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Vignette */}
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech mb-1">
                  <span className="text-white/70">Lens Falloff Vignette</span>
                  <span className="text-amber-400">{frame.adjustments.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={frame.adjustments.vignette}
                  onChange={(e) => updateAdjustments('vignette', Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCRIPT & NOTES */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                English Episode Title
              </label>
              <input
                type="text"
                value={frame.title}
                onChange={(e) => onUpdateFrame({ ...frame, title: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-cinzel tracking-wider text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                Bengali Subtitle
              </label>
              <input
                type="text"
                value={frame.bengaliTitle}
                onChange={(e) => onUpdateFrame({ ...frame, bengaliTitle: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-sm font-bengali text-amber-300 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                Curatorial Tagline
              </label>
              <textarea
                rows={2}
                value={frame.tagline}
                onChange={(e) => onUpdateFrame({ ...frame, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white/90 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                Directorial Screenplay & Lighting Notes
              </label>
              <textarea
                rows={4}
                value={frame.directorNotes}
                onChange={(e) => onUpdateFrame({ ...frame, directorNotes: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white/90 leading-relaxed focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                Sound Design Cue
              </label>
              <input
                type="text"
                value={frame.soundCue}
                onChange={(e) => onUpdateFrame({ ...frame, soundCue: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white/90 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* AI Prompt Generator Button */}
            <div className="pt-3 border-t border-white/10">
              <button
                onClick={handleGeneratePrompt}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 border border-amber-500/40 rounded-xs text-xs font-mono-tech tracking-wider text-amber-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4" />}
                {copiedPrompt ? 'Copied Prompt to Clipboard!' : 'Copy Midjourney / Sora Cinema Prompt'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CAMERA RIG */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <h4 className="text-[11px] font-mono-tech tracking-wider text-white/70 uppercase">
              Optical Lens Rig & Shutter Specifications
            </h4>

            <div>
              <label className="block text-[10px] font-mono-tech tracking-wider text-white/50 uppercase mb-1">
                Focal Length
              </label>
              <input
                type="text"
                value={frame.cameraSpec.focalLength}
                onChange={(e) => onUpdateFrame({
                  ...frame,
                  cameraSpec: { ...frame.cameraSpec, focalLength: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono-tech tracking-wider text-white/50 uppercase mb-1">
                  Aperture
                </label>
                <input
                  type="text"
                  value={frame.cameraSpec.aperture}
                  onChange={(e) => onUpdateFrame({
                    ...frame,
                    cameraSpec: { ...frame.cameraSpec, aperture: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono-tech tracking-wider text-white/50 uppercase mb-1">
                  ISO Sensitivity
                </label>
                <input
                  type="text"
                  value={frame.cameraSpec.iso}
                  onChange={(e) => onUpdateFrame({
                    ...frame,
                    cameraSpec: { ...frame.cameraSpec, iso: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono-tech tracking-wider text-white/50 uppercase mb-1">
                Raw Capture Format
              </label>
              <input
                type="text"
                value={frame.cameraSpec.format}
                onChange={(e) => onUpdateFrame({
                  ...frame,
                  cameraSpec: { ...frame.cameraSpec, format: e.target.value }
                })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        )}

        {/* TAB 4: MEDIA ASSETS */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono-tech tracking-wider text-amber-400 uppercase mb-1">
                Direct Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xs text-xs font-mono-tech text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={applyCustomUrl}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xs text-xs font-mono-tech text-white cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Quick Unsplash Curated Options */}
            <div className="pt-2">
              <label className="block text-[11px] font-mono-tech tracking-wider text-white/70 uppercase mb-2">
                Curated Cinema Sample Library
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[...samplePacks.cosmicMacro, ...samplePacks.cyberNoir].slice(0, 6).map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => onUpdateFrame({ ...frame, imageUrl: img })}
                    className="aspect-[16/10] bg-cover bg-center rounded-xs border border-white/15 hover:border-amber-400 cursor-pointer transition-all hover:scale-105"
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
