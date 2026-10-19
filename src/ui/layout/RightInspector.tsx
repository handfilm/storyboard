/**
 * RAWx Studio — RightInspector Drawer
 * Public API: RightInspector component
 * Contextual inspector for fine optical tuning, camera specifications, and metadata.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { 
  Sliders, 
  Camera, 
  Type, 
  Layers, 
  X, 
  Sparkles, 
  Eye, 
  Info,
  ChevronRight
} from 'lucide-react';

export const RightInspector: React.FC = () => {
  const {
    isInspectorOpen,
    toggleInspector,
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const [activeTab, setActiveTab] = useState<'optics' | 'camera' | 'text' | 'meta'>('optics');

  if (!isInspectorOpen) return null;

  const currentShot = project.shots[activeShotIndex] || {
    id: activeShotIndex,
    epNumber: String(activeShotIndex + 1).padStart(3, '0'),
    title: 'THE SINGULARITY',
    bengaliTitle: 'দৃষ্টি',
    tagline: 'MACRO EYES',
    directorNotes: '',
    cameraSpec: {
      focalLength: '50mm f/1.4 Human Eye',
      aperture: 'f/1.4',
      shutter: '1/48s 180°',
      iso: 'ISO 400',
      sensor: 'Full-Frame Cine',
      format: 'RAW 14-BIT ARRI'
    },
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      bloom: 30,
      grain: 15,
      motionBlur: 50,
      vignette: 40,
      halations: 0,
      anamorphicStreak: 0
    }
  };

  const handleAdjustmentChange = (key: string, value: number) => {
    updateShot(activeShotIndex, {
      adjustments: {
        ...currentShot.adjustments,
        [key]: value
      }
    });
  };

  return (
    <aside className="w-72 bg-[#0B0B0B] border-l border-[#D4AF37]/20 flex flex-col h-full text-xs font-mono select-none z-20">
      {/* Inspector Header */}
      <div className="h-10 px-3 border-b border-[#D4AF37]/20 flex items-center justify-between bg-[#121212]/50">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-bold tracking-wider text-[#FFE066]">INSPECTOR</span>
          <span className="text-[10px] text-[#8A8A8A]">EP {currentShot.epNumber}</span>
        </div>
        <button
          onClick={toggleInspector}
          className="p-1 rounded text-[#8A8A8A] hover:text-[#EDEDED] transition-colors"
          title="Close Inspector"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D4AF37]/20 bg-[#050505]">
        <button
          onClick={() => setActiveTab('optics')}
          className={`flex-1 py-1.5 text-center text-[10px] tracking-wider transition-colors ${
            activeTab === 'optics'
              ? 'text-[#FFE066] border-b-2 border-[#D4AF37] bg-[#121212]'
              : 'text-[#8A8A8A] hover:text-[#EDEDED]'
          }`}
        >
          OPTICS
        </button>
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-1.5 text-center text-[10px] tracking-wider transition-colors ${
            activeTab === 'camera'
              ? 'text-[#FFE066] border-b-2 border-[#D4AF37] bg-[#121212]'
              : 'text-[#8A8A8A] hover:text-[#EDEDED]'
          }`}
        >
          CAMERA
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-1.5 text-center text-[10px] tracking-wider transition-colors ${
            activeTab === 'text'
              ? 'text-[#FFE066] border-b-2 border-[#D4AF37] bg-[#121212]'
              : 'text-[#8A8A8A] hover:text-[#EDEDED]'
          }`}
        >
          SCRIPT
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {activeTab === 'optics' && (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">
              Optical Shader Controls
            </span>

            {/* Brightness */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#8A8A8A]">Exposure / Brightness</span>
                <span className="text-[#EDEDED]">{currentShot.adjustments?.brightness || 100}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={currentShot.adjustments?.brightness || 100}
                onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
              />
            </div>

            {/* Contrast */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#8A8A8A]">Contrast</span>
                <span className="text-[#EDEDED]">{currentShot.adjustments?.contrast || 100}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={currentShot.adjustments?.contrast || 100}
                onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
              />
            </div>

            {/* Optical Bloom */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#8A8A8A]">Optical Bloom</span>
                <span className="text-[#EDEDED]">{currentShot.adjustments?.bloom || 30}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentShot.adjustments?.bloom || 30}
                onChange={(e) => handleAdjustmentChange('bloom', Number(e.target.value))}
                className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
              />
            </div>

            {/* 35mm Grain */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#8A8A8A]">35mm Film Grain</span>
                <span className="text-[#EDEDED]">{currentShot.adjustments?.grain || 15}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentShot.adjustments?.grain || 15}
                onChange={(e) => handleAdjustmentChange('grain', Number(e.target.value))}
                className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
              />
            </div>

            {/* Edge Blur & Vignette */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#8A8A8A]">Edge Blur / Vignette</span>
                <span className="text-[#EDEDED]">{currentShot.adjustments?.vignette || 40}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentShot.adjustments?.vignette || 40}
                onChange={(e) => handleAdjustmentChange('vignette', Number(e.target.value))}
                className="accent-[#D4AF37] h-1.5 bg-[#121212] rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {activeTab === 'camera' && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">
              Arri 14-Bit Optical Spec
            </span>

            <div className="p-2 rounded bg-[#121212] border border-white/5 flex flex-col gap-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Lens Focal:</span>
                <span className="text-[#EDEDED]">{currentShot.cameraSpec?.focalLength || '50mm f/1.4'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Aperture:</span>
                <span className="text-[#EDEDED]">{currentShot.cameraSpec?.aperture || 'f/1.4'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Shutter Angle:</span>
                <span className="text-[#EDEDED]">{currentShot.cameraSpec?.shutter || '1/48s 180°'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Base ISO:</span>
                <span className="text-[#EDEDED]">{currentShot.cameraSpec?.iso || 'ISO 400'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A8A8A]">Sensor Gate:</span>
                <span className="text-[#EDEDED]">{currentShot.cameraSpec?.sensor || 'Full-Frame Cine'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">
              Dialogue & Bengali Titles
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8A8A8A]">English Title</label>
              <input
                type="text"
                value={currentShot.title || ''}
                onChange={(e) => updateShot(activeShotIndex, { title: e.target.value })}
                className="bg-[#121212] border border-[#D4AF37]/30 rounded p-1 text-xs text-[#EDEDED] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8A8A8A]">Bangla Title (বাংলা)</label>
              <input
                type="text"
                value={currentShot.bengaliTitle || ''}
                onChange={(e) => updateShot(activeShotIndex, { bengaliTitle: e.target.value })}
                className="bg-[#121212] border border-[#D4AF37]/30 rounded p-1 text-xs text-[#FFE066] font-['Noto_Serif_Bengali'] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-[#8A8A8A]">Director Directives</label>
              <textarea
                rows={3}
                value={currentShot.directorNotes || ''}
                onChange={(e) => updateShot(activeShotIndex, { directorNotes: e.target.value })}
                className="bg-[#121212] border border-[#D4AF37]/30 rounded p-1 text-xs text-[#EDEDED] outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
