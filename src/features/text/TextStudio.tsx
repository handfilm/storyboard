/**
 * RAWx Studio — Real-Time Text & Super Title Inspector
 * Public API: TextStudio component
 * 
 * Complies with Step 3 Specification:
 * - Real-Time Text Properties Tab with 0ms two-way binding to stage canvas.
 * - Live input fields for Bangla Title, English Headline, and Dialogue / Subtitle.
 * - Quick curated bilingual suggestions & presets.
 * - Instant synchronization to IndexedDB draft storage and useStudioStore.
 * - Maintains anamorphic horizontal light streak, gold metallic gradient, and breathing glow.
 */

import React, { useState } from 'react';
import { useStudioStore } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { toBengaliNumerals } from '../../utils/engine';
import { TitleAnimationStyle, AnthologyFrame } from '../../types/anthology';
import { eventBus } from '../../core/eventBus';
import { 
  Type, 
  Sliders, 
  Sparkles, 
  Download, 
  Eye, 
  Zap,
  Check,
  Film
} from 'lucide-react';

const titlePresets = [
  { name: 'RAWx Gold Blockbuster', font: 'Cinzel', color: '#FFE066', glow: '0 0 20px rgba(212,175,55,0.6)', letterSpacing: '0.25em' },
  { name: 'Dhaka Cyber Neon', font: 'JetBrains Mono', color: '#00FFCC', glow: '0 0 15px rgba(0,255,204,0.7)', letterSpacing: '0.15em' },
  { name: 'Bengali Heritage Serif', font: 'Noto Serif Bengali', color: '#FFFFFF', glow: '0 0 10px rgba(255,255,255,0.4)', letterSpacing: '0.05em' },
  { name: 'Noir Crime Typewriter', font: 'Courier New', color: '#E0E0E0', glow: 'none', letterSpacing: '0.1em' },
  { name: 'Anamorphic Red Flare', font: 'Cinzel', color: '#FF4B4B', glow: '0 0 25px rgba(255,75,75,0.8)', letterSpacing: '0.3em' },
  { name: 'Minimalist Tokyo Sub', font: 'Inter', color: '#FFE066', glow: '0 2px 4px rgba(0,0,0,0.9)', letterSpacing: '0.05em' }
];

const banglaSuggestions = ["দৃষ্টি", "সূচনা", "সীমানা", "আলো", "সংঘাত", "উন্মোচন", "অন্ধকার", "মহাকর্ষ", "গভীরতা", "শূন্য"];
const englishSuggestions = ["THE SINGULARITY", "EVENT HORIZON", "PHOTON SPHERE", "SHOCK // CORE", "SPATIAL DISTORTION", "THE APERTURE", "DARK MATTER", "THE ABYSS"];

export interface TextStudioProps {
  currentFrame?: AnthologyFrame;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
}

export const TextStudio: React.FC<TextStudioProps> = ({
  currentFrame,
  onUpdateFrame
}) => {
  const {
    activeShotIndex,
    project,
    updateShot
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];

  // Derive active frame values with zero-lag fallback
  const titleEn = currentFrame ? currentFrame.title : (currentShot.title ?? currentTheme.title);
  const titleBn = currentFrame ? currentFrame.bengaliTitle : (currentShot.bengaliTitle ?? currentTheme.sub);
  const caption = currentFrame ? currentFrame.tagline : (currentShot.tagline ?? currentTheme.tag);
  const dialogue = currentFrame ? (currentFrame.directorNotes || '') : (currentShot.directorNotes || '');
  const soundCue = currentFrame ? (currentFrame.soundCue || '') : (currentShot.soundCue || '');

  const [fontSize, setFontSize] = useState(36);
  const [fontSizeBn, setFontSizeBn] = useState(56);
  const [textColor, setTextColor] = useState('#FFE066');
  const [selectedFont, setSelectedFont] = useState('Cinzel');
  const [animationStyle, setAnimationStyle] = useState<TitleAnimationStyle>(
    (currentFrame?.titleAnimation as any) || (currentShot.titleAnimation as any) || 'flare'
  );

  // 0ms Lag Two-Way Dispatcher
  const handleUpdate = (partial: Partial<AnthologyFrame>) => {
    const base: AnthologyFrame = currentFrame || {
      id: activeShotIndex + 1,
      epNumber: String(activeShotIndex + 1).padStart(3, '0'),
      title: titleEn,
      bengaliTitle: titleBn,
      tagline: caption,
      directorNotes: dialogue,
      soundCue: soundCue,
      cameraSpec: {
        focalLength: '35mm High-Speed Master',
        aperture: 'f/1.4',
        shutter: '1/48s 180°',
        iso: 'ISO 400',
        sensor: 'Full-Frame Cine',
        format: 'RAW 14-BIT ARRI'
      },
      imageUrl: currentShot.imageUrl || '',
      isVideo: Boolean(currentShot.isVideo),
      panY: 50,
      colorAccent: '#D4AF37',
      hoverStyle: 0,
      lutFilter: 'cinematic',
      aspectRatio: '2.39:1',
      adjustments: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        bloom: 30,
        grain: 15,
        motionBlur: 50,
        vignette: 40
      },
      tags: ['Scene', '12s']
    };

    const updatedFrame: AnthologyFrame = {
      ...base,
      ...partial
    };

    // 1. Immediately notify stage & App.tsx for 0ms visual repaint & autosave queue
    if (onUpdateFrame) {
      onUpdateFrame(updatedFrame);
    }

    // 2. Synchronize useStudioStore
    updateShot(activeShotIndex, {
      title: updatedFrame.title,
      bengaliTitle: updatedFrame.bengaliTitle,
      tagline: updatedFrame.tagline,
      directorNotes: updatedFrame.directorNotes,
      soundCue: updatedFrame.soundCue,
      titleAnimation: updatedFrame.titleAnimation
    });

    // 3. Emit global event for any decoupled listeners
    eventBus.emit('shot:updated', {
      index: activeShotIndex,
      partial
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
      const duration = shot.durationSeconds || 12.0; // 12.0s standard slide
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
    a.download = `RAWx_Subtitles_Master.srt`;
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
    <div className="w-full h-full flex flex-col bg-[#07070a] text-[#EDEDED] font-mono-tech select-none overflow-y-auto no-scrollbar">
      {/* Top Header & Quick Action Strip */}
      <div className="h-10 border-b border-[#272732] bg-[#0c0c10] px-3.5 flex items-center justify-between text-xs shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Type className="w-3.5 h-3.5 text-[#eab308]" />
          <span className="font-bold text-[#fbbf24] text-[11px] tracking-wider uppercase truncate">
            REAL-TIME TEXT INSPECTOR
          </span>
          <span className="text-zinc-500 text-[10px]">
            SH{String(activeShotIndex + 1).padStart(3, '0')}
          </span>
        </div>

        <button
          onClick={handleExportSRT}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 hover:bg-[#d4af37]/20 hover:text-[#fbbf24] border border-[#272732] hover:border-[#d4af37]/40 rounded-[1px] text-[9.5px] transition-colors cursor-pointer"
          title="Export 100-Shot Subtitles as .SRT file"
        >
          <Download className="w-3 h-3 text-[#d4af37]" />
          <span>.SRT</span>
        </button>
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col gap-4">
        {/* Live Title Card Preview (compact anamorphic preview) */}
        <div className="p-3 rounded-[2px] bg-[#030304] border border-[#272732] relative overflow-hidden shadow-inner flex flex-col items-center justify-center min-h-[105px]">
          {/* Anamorphic Gold Flare Background Streak */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FFE066]/50 to-transparent blur-[0.5px]" />
          <div className="absolute top-1/2 left-1/4 right-1/4 -translate-y-1/2 h-2.5 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent blur-sm" />

          {/* Bengali Title */}
          <span 
            className="font-bengali font-black text-metallic-gold super-title-breathe drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all text-center leading-tight select-none"
            style={{ fontSize: `${Math.min(fontSizeBn * 0.5, 34)}px` }}
          >
            {titleBn || 'দৃষ্টি'}
          </span>

          {/* English Headline */}
          <span 
            className="font-cinzel font-bold text-white tracking-[0.2em] uppercase drop-shadow-md text-center mt-1 select-none"
            style={{ 
              fontFamily: selectedFont,
              fontSize: `${Math.min(fontSize * 0.45, 18)}px`,
              color: textColor
            }}
          >
            {titleEn || 'THE SINGULARITY'}
          </span>

          {/* Dialogue / Tagline Subtitle */}
          {caption && (
            <span className="font-mono-tech text-[8px] text-[#fbbf24]/80 tracking-wider uppercase mt-1 text-center truncate max-w-[90%]">
              {caption}
            </span>
          )}

          <div className="absolute bottom-1 right-2 text-[7.5px] text-zinc-500 font-mono-tech">
            LIVE 0ms CANVAS LINKED
          </div>
        </div>

        {/* 1. Real-Time Bilingual Text Properties */}
        <div className="flex flex-col gap-3 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <span className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#eab308]" />
              TEXT PROPERTIES & TWO-WAY BINDING
            </span>
            <span className="text-[8px] text-emerald-400 font-mono-tech bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
              0ms STAGE SYNC
            </span>
          </div>

          {/* Bangla Title Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-zinc-400 font-mono-tech uppercase">
                বাংলা শীর্ষক (Bangla Title)
              </label>
              <span className="text-[8px] text-[#eab308] font-mono-tech">Noto Serif / Anek</span>
            </div>
            <input
              type="text"
              value={titleBn || ''}
              onChange={(e) => handleUpdate({ bengaliTitle: e.target.value })}
              placeholder="যেমন: দৃষ্টি, সূচনা, সীমানা"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#fbbf24] rounded-[1px] p-2 text-sm font-bengali font-bold text-[#ffe58f] outline-none transition-colors"
            />
            {/* Quick Suggestions for Bangla */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {banglaSuggestions.slice(0, 5).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleUpdate({ bengaliTitle: sug })}
                  className="px-1.5 py-0.5 rounded-[1px] bg-white/5 hover:bg-[#d4af37]/20 border border-[#272732] hover:border-[#d4af37]/50 text-[9px] font-bengali text-zinc-300 hover:text-[#fbbf24] cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* English Headline Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-zinc-400 font-mono-tech uppercase">
                English Headline (Cinematic Title)
              </label>
              <span className="text-[8px] text-[#eab308] font-mono-tech">Cinzel 35mm</span>
            </div>
            <input
              type="text"
              value={titleEn || ''}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="e.g. THE SINGULARITY"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#fbbf24] rounded-[1px] p-2 text-xs font-cinzel font-bold text-white tracking-wider outline-none transition-colors uppercase"
            />
            {/* Quick Suggestions for English */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {englishSuggestions.slice(0, 4).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleUpdate({ title: sug })}
                  className="px-1.5 py-0.5 rounded-[1px] bg-white/5 hover:bg-[#d4af37]/20 border border-[#272732] hover:border-[#d4af37]/50 text-[8px] font-mono-tech text-zinc-300 hover:text-white cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Dialogue / Subtitle Textarea */}
          <div>
            <label className="text-[10px] text-zinc-400 font-mono-tech uppercase block mb-1">
              Dialogue / Curatorial Subtitle
            </label>
            <textarea
              rows={2}
              value={caption || ''}
              onChange={(e) => handleUpdate({ tagline: e.target.value })}
              placeholder="Dialogue, scene subtitle, or voiceover cue..."
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#fbbf24] rounded-[1px] p-2 text-xs font-mono-tech text-zinc-200 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Screenplay & Lighting Notes */}
          <div>
            <label className="text-[10px] text-zinc-400 font-mono-tech uppercase block mb-1">
              Screenplay & Director Notes
            </label>
            <textarea
              rows={3}
              value={dialogue || ''}
              onChange={(e) => handleUpdate({ directorNotes: e.target.value })}
              placeholder="Directorial notes on performance, lighting, or blocking..."
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#fbbf24] rounded-[1px] p-2 text-xs font-mono-tech text-zinc-300 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 2. Super Title Kinetic Animation Selector */}
        <div className="flex flex-col gap-2.5 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400 font-mono-tech uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#eab308]" />
              Super Title Animation Style
            </label>
            <span className="text-[8.5px] text-[#fbbf24] font-mono-tech font-bold uppercase">
              {animationStyle}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'flare', label: 'Anamorphic Gold Flare' },
              { id: 'kinetic', label: 'Kinetic Snap' },
              { id: 'glitch', label: 'Celluloid Glitch' },
              { id: 'breathe', label: 'Aura Breathe' },
              { id: 'typewriter', label: 'Typewriter Reveal' },
              { id: 'neon', label: 'Dhaka Cyber Neon' },
              { id: 'cinema-fade', label: '70mm Dissolve' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setAnimationStyle(opt.id as any);
                  handleUpdate({ titleAnimation: opt.id as any });
                }}
                className={`p-1.5 rounded-[1px] border text-[9.5px] text-left transition-colors cursor-pointer ${
                  animationStyle === opt.id 
                    ? 'border-[#fbbf24] bg-[#d4af37]/20 text-[#fbbf24] font-bold shadow-[0_0_8px_rgba(234,179,8,0.3)]' 
                    : 'border-[#272732] bg-[#121218] text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Typography Size & Font Stack */}
        <div className="flex flex-col gap-3 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-[#eab308]" />
              Typography Geometry & Font
            </span>
          </div>

          <div>
            <label className="text-[9.5px] text-zinc-400 uppercase block mb-1">Headline Font Family</label>
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="w-full bg-[#121218] border border-[#272732] rounded-[1px] p-1.5 text-xs text-zinc-200 outline-none cursor-pointer"
            >
              <option value="Cinzel">Cinzel (Cinematic Master)</option>
              <option value="JetBrains Mono">JetBrains Mono (Technical HUD)</option>
              <option value="Noto Serif Bengali">Noto Serif Bengali (Heritage)</option>
              <option value="Anek Bangla">Anek Bangla (Bold Display)</option>
              <option value="Courier New">Courier New (Screenplay Typewriter)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-400 mb-1">
              <span>BANGLA HEADLINE SCALE</span>
              <span className="text-[#fbbf24] font-bold">{fontSizeBn}px</span>
            </div>
            <input
              type="range"
              min="24"
              max="96"
              value={fontSizeBn}
              onChange={(e) => setFontSizeBn(Number(e.target.value))}
              className="w-full accent-[#fbbf24]"
            />
          </div>

          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-400 mb-1">
              <span>ENGLISH TITLE SCALE</span>
              <span className="text-[#fbbf24] font-bold">{fontSize}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="64"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-[#fbbf24]"
            />
          </div>
        </div>

        {/* 4. Cinema Typography Style Presets */}
        <div className="flex flex-col gap-2 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
            Curated Film Presets
          </span>
          <div className="flex flex-col gap-1.5">
            {titlePresets.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-2 bg-[#121218] hover:bg-[#181822] border border-[#272732] hover:border-[#fbbf24]/50 rounded-[1px] text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <span className="font-bold text-xs truncate" style={{ color: preset.color }}>{preset.name}</span>
                <span className="text-[8.5px] text-zinc-400 font-mono-tech">{preset.font}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
