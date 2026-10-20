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
import { TitleAnimationStyle } from '../../types/anthology';
import { eventBus } from '../../core/eventBus';
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
  RefreshCw,
  Zap
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
  const isVideo = Boolean(
    currentShot.isVideo ||
    (currentShot.imageUrl && (
      currentShot.imageUrl.startsWith('data:video') ||
      currentShot.imageUrl.startsWith('blob:') ||
      /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(currentShot.imageUrl)
    ))
  );

  const [titleEn, setTitleEn] = useState(currentShot.title || currentTheme.title);
  const [titleBn, setTitleBn] = useState(currentShot.bengaliTitle || currentTheme.sub);
  const [caption, setCaption] = useState(currentShot.bengaliDesc || currentShot.tagline || currentTheme.tag);
  const [fontSize, setFontSize] = useState(36);
  const [fontSizeBn, setFontSizeBn] = useState(56);
  const [textColor, setTextColor] = useState('#FFE066');
  const [selectedFont, setSelectedFont] = useState('Cinzel');
  const [animationStyle, setAnimationStyle] = useState<TitleAnimationStyle>(
    (currentShot.titleAnimation as any) || 'flare'
  );

  const handleApplyChanges = () => {
    updateShot(activeShotIndex, {
      title: titleEn,
      bengaliTitle: titleBn,
      tagline: caption,
      titleAnimation: animationStyle
    });
    eventBus.emit('shot:updated', {
      index: activeShotIndex,
      partial: {
        title: titleEn,
        bengaliTitle: titleBn,
        tagline: caption,
        titleAnimation: animationStyle
      }
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
      const duration = shot.durationSeconds || 2.5;
      const startTimeStr = formatSRTTime(currentTime);
      currentTime += duration;
      const endTimeStr = formatSRTTime(currentTime);

      const en = shot.title || theme.title;
      const bn = shot.bengaliTitle || theme.sub;
      const cap = shot.bengaliDesc || shot.tagline || theme.tag;

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
            {/* Background Shot Media (Video or Image) */}
            {isVideo ? (
              <video
                src={currentShot.imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]"
              />
            ) : (
              <img
                src={currentShot.imageUrl || 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1920&q=80'}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[1px]"
              />
            )}

            {/* Title Lockup Preview */}
            <div className="relative z-10 text-center flex flex-col items-center gap-3 max-w-2xl">
              <div 
                className={`font-bold tracking-widest uppercase transition-all duration-300 ${
                  animationStyle === 'flare' ? 'super-title-flare' :
                  animationStyle === 'kinetic' ? 'super-title-kinetic' :
                  animationStyle === 'glitch' ? 'super-title-glitch' :
                  animationStyle === 'breathe' ? 'super-title-breathe' :
                  animationStyle === 'typewriter' ? 'super-title-typewriter' :
                  animationStyle === 'neon' ? 'super-title-neon' :
                  animationStyle === 'cinema-fade' ? 'super-title-cinema-fade' : ''
                }`}
                style={{
                  fontFamily: selectedFont,
                  fontSize: `${fontSize}px`,
                  color: animationStyle === 'flare' ? undefined : textColor,
                  textShadow: animationStyle === 'flare' ? undefined : '0 0 25px rgba(212,175,55,0.7), 0 4px 12px rgba(0,0,0,0.9)'
                }}
              >
                {titleEn}
              </div>

              <div 
                className={`font-serif text-[#FFE066] font-bold tracking-wide sm:tracking-wider leading-none transition-all duration-300 ${
                  animationStyle === 'flare' ? 'super-title-flare super-title-breathe' :
                  animationStyle === 'kinetic' ? 'super-title-kinetic' :
                  animationStyle === 'glitch' ? 'super-title-glitch' :
                  animationStyle === 'breathe' ? 'super-title-breathe' :
                  animationStyle === 'typewriter' ? 'super-title-typewriter' :
                  animationStyle === 'neon' ? 'super-title-neon' :
                  animationStyle === 'cinema-fade' ? 'super-title-cinema-fade' : ''
                }`}
                style={{
                  fontFamily: 'Noto Serif Bengali, serif',
                  fontSize: `${fontSizeBn}px`,
                  textShadow: animationStyle === 'flare' ? undefined : '0 0 25px rgba(255,224,102,0.8), 0 4px 12px rgba(0,0,0,0.9)'
                }}
              >
                {titleBn}
              </div>

              <div className={`mt-4 px-4 py-1.5 bg-black/70 rounded-full border border-[#D4AF37]/30 text-xs font-mono tracking-wide max-w-lg transition-all ${
                animationStyle === 'flare' ? 'super-caption-flare text-[#FFE066]' :
                animationStyle === 'kinetic' ? 'super-caption-wave text-[#EDEDED]' :
                animationStyle === 'glitch' ? 'super-caption-glitch text-[#EDEDED]' :
                animationStyle === 'breathe' ? 'super-caption-breathe text-[#EDEDED]' :
                animationStyle === 'typewriter' ? 'super-caption-typewriter text-[#EDEDED]' :
                animationStyle === 'neon' ? 'super-title-neon text-cyan-200' :
                animationStyle === 'cinema-fade' ? 'super-caption-wave text-[#EDEDED]' : 'text-[#EDEDED]'
              }`}>
                {caption}
              </div>
            </div>

            {/* HUD Meta Overlay */}
            <div className="absolute top-4 left-4 text-[10px] text-[#8A8A8A] font-mono flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#D4AF37] animate-pulse" />
              <span>RAWx SUPER ENGINE // STYLE: <span className="text-[#FFE066] font-bold">{animationStyle.toUpperCase()}</span></span>
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
              <span>ENGLISH FONT SIZE</span>
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
            <div className="flex justify-between text-[10px] text-[#8A8A8A]">
              <span>BANGLA TITLE SIZE (FULL WORD)</span>
              <span className="text-[#FFE066] font-bold">{fontSizeBn}px</span>
            </div>
            <input
              type="range"
              min="24"
              max="96"
              value={fontSizeBn}
              onChange={(e) => setFontSizeBn(Number(e.target.value))}
              className="w-full accent-[#D4AF37] mt-1"
            />
            <div className="flex gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setFontSizeBn(36)}
                className={`px-2 py-0.5 rounded text-[8.5px] font-mono ${fontSizeBn === 36 ? 'bg-[#FFE066] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
              >
                COMPACT (36)
              </button>
              <button
                type="button"
                onClick={() => setFontSizeBn(56)}
                className={`px-2 py-0.5 rounded text-[8.5px] font-mono ${fontSizeBn === 56 ? 'bg-[#FFE066] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
              >
                COVER WORD (56)
              </button>
              <button
                type="button"
                onClick={() => setFontSizeBn(76)}
                className={`px-2 py-0.5 rounded text-[8.5px] font-mono ${fontSizeBn === 76 ? 'bg-[#FFE066] text-black font-bold' : 'bg-white/5 text-white/60 hover:text-white'}`}
              >
                MASSIVE (76)
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-[#8A8A8A] uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                Super Title Animation
              </label>
              <span className="text-[9px] text-[#FFE066] font-bold uppercase">{animationStyle}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'flare', label: 'Anamorphic Flare' },
                { id: 'kinetic', label: 'Kinetic Snap' },
                { id: 'glitch', label: 'Cyber Glitch' },
                { id: 'breathe', label: 'Aura Breathe' },
                { id: 'typewriter', label: 'Typewriter' },
                { id: 'neon', label: 'Cyber Neon' },
                { id: 'cinema-fade', label: 'Cinema Dissolve' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAnimationStyle(opt.id as any)}
                  className={`p-1.5 rounded border text-[10px] text-left transition-all cursor-pointer ${
                    animationStyle === opt.id 
                      ? 'border-[#D4AF37] bg-[#D4AF37]/25 text-[#FFE066] font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]' 
                      : 'border-[#D4AF37]/15 bg-[#121212] text-[#8A8A8A] hover:text-white hover:border-[#D4AF37]/40'
                  }`}
                >
                  {opt.label}
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
