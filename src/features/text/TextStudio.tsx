/**
 * RAWx Studio — Super Title and Caption Editor
 * Public API: TextStudio component
 * Handles in-place typography layout, bilingual font stacks (Noto Serif Bengali, Cinzel, JetBrains Mono),
 * cinematic typography presets, kinetic text animations, and SRT/VTT export.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { toBengaliNumerals } from '../../utils/engine';
import { 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sliders, 
  Sparkles, 
  Download, 
  Upload, 
  Eye, 
  RefreshCw 
} from 'lucide-react';

const titlePresets = [
  { name: 'RAWx Gold Blockbuster', font: 'Cinzel', color: '#FFE066', glow: '0 0 20px rgba(212,175,55,0.6)', letterSpacing: '0.25em' },
  { name: 'Dhaka Cyber Neon', font: 'JetBrains Mono', color: '#00FFCC', glow: '0 0 15px rgba(0,255,204,0.7)', letterSpacing: '0.15em' },
  { name: 'Bengali Heritage Serif', font: 'Noto Serif Bengali', color: '#FFFFFF', glow: '0 0 10px rgba(255,255,255,0.4)', letterSpacing: '0.05em' },
  { name: 'Noir Crime Typewriter', font: 'Courier New', color: '#E0E0E0', glow: 'none', letterSpacing: '0.1em' },
  { name: 'Anamorphic Red Flare', font: 'Cinzel', color: '#FF4B4B', glow: '0 0 25px rgba(255,75,75,0.8)', letterSpacing: '0.3em' },
  { name: 'Minimalist Tokyo Sub', font: 'Inter', color: '#FFE066', glow: '0 2px 4px rgba(0,0,0,0.9)', letterSpacing: '0.05em' }
];

export const TextStudio: React.FC = () => {
  const {
    activeShotIndex,
    project,
    updateShot,
    setActiveShotIndex
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];

  const [titleEn, setTitleEn] = useState(currentShot.titleEn || currentTheme.en);
  const [titleBn, setTitleBn] = useState(currentShot.titleBn || currentTheme.bn);
  const [caption, setCaption] = useState(currentShot.caption || currentTheme.caption);
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState('#FFE066');
  const [selectedFont, setSelectedFont] = useState('Cinzel');
  const [animationStyle, setAnimationStyle] = useState<'static' | 'fade' | 'typewriter' | 'karaoke'>('fade');

  const handleApplyChanges = () => {
    updateShot(activeShotIndex, {
      titleEn,
      titleBn,
      caption
    });
  };

  const handleApplyPreset = (preset: typeof titlePresets[0]) => {
    setSelectedFont(preset.font);
    setTextColor(preset.color);
  };

  const handleExportSRT = () => {
    let srtContent = '';
    const total = Math.max(100, project.shots.length);
    let currentTime = 0;

    for (let i = 0; i < total; i++) {
      const shot = project.shots[i] || {};
      const theme = baseThemesData[i % baseThemesData.length];
      const duration = shot.duration || 2.5;
      const startTimeStr = formatSRTTime(currentTime);
      currentTime += duration;
      const endTimeStr = formatSRTTime(currentTime);

      const en = shot.titleEn || theme.en;
      const bn = shot.titleBn || theme.bn;
      const cap = shot.caption || theme.caption;

      srtContent += `${i + 1}\n${startTimeStr} --> ${endTimeStr}\n${bn} // ${en}\n${cap}\n\n`;
    }

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAWx_Subtitles_EP_${String(activeShotIndex + 1).padStart(3, '0')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSRTTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-[#050505] text-[#EDEDED] font-mono select-none overflow-hidden">
      {/* Left Canvas Preview Area */}
      <div className="flex-1 flex flex-col border-r border-[#D4AF37]/20 overflow-hidden">
        {/* Top bar */}
        <div className="h-12 border-b border-[#D4AF37]/20 bg-[#0B0B0B] px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-bold text-[#FFE066]">TITLE & CAPTION CANVAS</span>
            <span className="text-[#8A8A8A]">| SHOT #{String(activeShotIndex + 1).padStart(3, '0')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSRT}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#121212] hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/30 rounded text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT .SRT</span>
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-3 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold rounded text-xs transition-colors"
            >
              UPDATE SHOT
            </button>
          </div>
        </div>

        {/* Live Preview Display */}
        <div className="flex-1 bg-[#030304] flex items-center justify-center p-6 relative">
          <div className="w-full max-w-4xl aspect-video bg-black rounded border border-[#D4AF37]/30 relative flex flex-col items-center justify-center p-8 shadow-2xl overflow-hidden">
            {/* Background Shot Image */}
            <img
              src={currentShot.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80'}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]"
            />

            {/* Title Lockup Preview */}
            <div className="relative z-10 text-center flex flex-col items-center gap-3 max-w-2xl">
              <div 
                className="font-bold tracking-widest uppercase transition-all duration-200"
                style={{
                  fontFamily: selectedFont,
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  textShadow: '0 0 25px rgba(212,175,55,0.7), 0 4px 12px rgba(0,0,0,0.9)'
                }}
              >
                {titleEn}
              </div>

              <div 
                className="font-serif text-2xl text-[#FFE066] tracking-wider transition-all"
                style={{
                  fontFamily: 'Noto Serif Bengali, serif',
                  textShadow: '0 0 15px rgba(255,224,102,0.6)'
                }}
              >
                {titleBn}
              </div>

              <div className="mt-4 px-4 py-1.5 bg-black/70 rounded-full border border-[#D4AF37]/30 text-xs text-[#EDEDED] font-mono tracking-wide max-w-lg">
                {caption}
              </div>
            </div>

            {/* HUD Meta Overlay */}
            <div className="absolute top-4 left-4 text-[10px] text-[#8A8A8A] font-mono">
              RAWx KINETIC ENGINE // STYLE: {animationStyle.toUpperCase()}
            </div>
            <div className="absolute bottom-4 right-4 text-[10px] text-[#D4AF37] font-mono">
              EP {String(activeShotIndex + 1).padStart(3, '0')} // পর্ব {toBengaliNumerals(String(activeShotIndex + 1).padStart(3, '0'))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Panel */}
      <div className="w-full md:w-80 bg-[#0B0B0B] flex flex-col overflow-y-auto custom-scrollbar p-4 gap-4 text-xs">
        <h3 className="font-bold text-[#FFE066] text-xs uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2">
          Typography Controls
        </h3>

        {/* Text Input Fields */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] text-[#8A8A8A] uppercase">English Title</label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded p-2 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#8A8A8A] uppercase">বাংলা শীর্ষক (Bengali Title)</label>
            <input
              type="text"
              value={titleBn}
              onChange={(e) => setTitleBn(e.target.value)}
              className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded p-2 text-xs text-[#FFE066] font-serif focus:outline-none focus:border-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#8A8A8A] uppercase">Narrative Caption</label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded p-2 text-xs text-[#EDEDED] focus:outline-none focus:border-[#D4AF37] mt-1 resize-none"
            />
          </div>
        </div>

        {/* Font & Size */}
        <div className="flex flex-col gap-3 border-t border-[#D4AF37]/10 pt-3">
          <div>
            <label className="text-[10px] text-[#8A8A8A] uppercase">Font Family</label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full bg-[#121212] border border-[#D4AF37]/20 rounded p-1.5 text-xs text-[#EDEDED] mt-1"
            >
              <option value="Cinzel">Cinzel (Cinematic Epic)</option>
              <option value="JetBrains Mono">JetBrains Mono (Cyber HUD)</option>
              <option value="Noto Serif Bengali">Noto Serif Bengali (Heritage)</option>
              <option value="Inter">Inter (Clean Modern)</option>
              <option value="Courier New">Courier New (Script Typewriter)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>FONT SIZE</span>
              <span className="text-[#FFE066]">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-[#D4AF37] mt-1"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#8A8A8A] uppercase">Kinetic Animation</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {(['static', 'fade', 'typewriter', 'karaoke'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => setAnimationStyle(style)}
                  className={`p-1.5 rounded border text-[11px] capitalize ${
                    animationStyle === style 
                      ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#FFE066]' 
                      : 'border-[#D4AF37]/10 bg-[#121212] text-[#8A8A8A]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Style Presets */}
        <div className="flex flex-col gap-2 border-t border-[#D4AF37]/10 pt-3">
          <label className="text-[10px] text-[#8A8A8A] uppercase">Cinema Style Presets</label>
          <div className="flex flex-col gap-1.5">
            {titlePresets.map(preset => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset)}
                className="p-2 bg-[#121212] hover:bg-[#181818] border border-[#D4AF37]/20 hover:border-[#D4AF37] rounded text-left flex items-center justify-between"
              >
                <span className="font-bold truncate" style={{ color: preset.color }}>{preset.name}</span>
                <span className="text-[9px] text-[#8A8A8A]">{preset.font}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
