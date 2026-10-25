/**
 * RAWx Studio — Real-Time Text & Super Title Inspector
 * Public API: TextStudio component
 * 
 * Complies with Principal Motion Graphics & Kinetic Typography Engine:
 * - Real-Time Hero Title Kinetic Typography with 0ms two-way binding to stage canvas.
 * - Quick style presets:
 *   [ ⚡ MOLTEN GOLD ]: Deep amber glow with anamorphic streak.
 *   [ ❄ TITANIUM SILVER ]: Shiny liquid chrome with blue-hour rim light.
 *   [ 🩸 NEON CRIMSON ]: Blade Runner cyberpunk pulse.
 * - Sliders for Title Size, Glow Intensity (0%–200%), Vertical Offset (Y-axis), and Tracking.
 * - Live input fields for Bangla Title, English Headline, and Dialogue / Subtitle.
 * - Live interactive [ T TITLES: ON/OFF ] toggle.
 * - Instant synchronization to IndexedDB draft storage and useStudioStore.
 */

import React, { useState } from 'react';
import { useStudioStore, HeroTitlePreset } from '../../core/store';
import { baseThemesData } from '../../data/frames';
import { TitleAnimationStyle, AnthologyFrame } from '../../types/anthology';
import { eventBus } from '../../core/eventBus';
import { TextTypographyDrawer } from '../../components/drawers/TextTypographyDrawer';
import { KineticTributeSequence } from '../../components/stage/templates/KineticTributeSequence';
import { TributeProfile, TRIBUTE_PROFILES } from '../../constants/tributeData';
import { 
  Type, 
  Sliders, 
  Sparkles, 
  Download, 
  Zap,
  Flame,
  Snowflake,
  Activity,
  SlidersHorizontal,
  MoveVertical
} from 'lucide-react';

const banglaSuggestions = ["দৃষ্টির সীমানা", "আলোর স্মৃতি", "মহাজাগতিক শূন্যতা", "সূচনার প্রতিধ্বনি", "সীমানাহীন কাল", "সংঘাতের রেখা", "অন্ধকারের বিস্তার", "মহাকর্ষের টান"];
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
    updateShot,
    titleConfig,
    setTitlePreset,
    setTitleSize,
    setTitleGlowIntensity,
    setTitleVerticalOffset,
    setTitleTracking,
    toggleTitles
  } = useStudioStore();

  const currentShot = project.shots[activeShotIndex] || {};
  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];

  // Derive active frame values with zero-lag fallback
  const titleEn = currentFrame ? currentFrame.title : (currentShot.title ?? currentTheme.title);
  const titleBn = currentFrame ? currentFrame.bengaliTitle : (currentShot.bengaliTitle ?? currentTheme.sub);
  const caption = currentFrame ? currentFrame.tagline : (currentShot.tagline ?? currentTheme.tag);
  const dialogue = currentFrame ? (currentFrame.directorNotes || '') : (currentShot.directorNotes || '');
  const soundCue = currentFrame ? (currentFrame.soundCue || '') : (currentShot.soundCue || '');

  const [activeTab, setActiveTab] = useState<'presets' | 'tributes' | 'editor'>('presets');
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
      queueMicrotask(() => {
        onUpdateFrame(updatedFrame);
      });
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

  const handleExportSRT = () => {
    let srtContent = '';
    const total = Math.max(100, project.shots.length);
    let currentTime = 0;

    for (let i = 0; i < total; i++) {
      const shot = project.shots[i] || {};
      const theme = baseThemesData[i % baseThemesData.length];
      const duration = shot.durationSeconds || 12.0;
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
    a.download = `HANDFILM_Subtitles_Master.srt`;
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

  // Preview styling based on active preset
  const getPreviewPresetInfo = () => {
    switch (titleConfig.preset) {
      case 'titanium-silver':
        return {
          titleClass: 'bg-gradient-to-r from-slate-100 via-slate-300 to-cyan-200 bg-clip-text text-transparent',
          glowStyle: {
            filter: `drop-shadow(0 0 ${Math.round(18 * titleConfig.glowIntensity)}px rgba(56,189,248,0.85)) drop-shadow(0 0 ${Math.round(35 * titleConfig.glowIntensity)}px rgba(14,165,233,0.4))`
          },
          streakClass: 'bg-gradient-to-r from-transparent via-[#38BDF8] to-transparent shadow-[0_0_15px_#38BDF8]',
          capsuleClass: 'border-cyan-400/30 text-cyan-200'
        };
      case 'neon-crimson':
        return {
          titleClass: 'bg-gradient-to-r from-rose-200 via-red-500 to-rose-700 bg-clip-text text-transparent',
          glowStyle: {
            filter: `drop-shadow(0 0 ${Math.round(18 * titleConfig.glowIntensity)}px rgba(239,68,68,0.9)) drop-shadow(0 0 ${Math.round(35 * titleConfig.glowIntensity)}px rgba(220,38,38,0.5))`
          },
          streakClass: 'bg-gradient-to-r from-transparent via-[#EF4444] to-transparent shadow-[0_0_15px_#EF4444]',
          capsuleClass: 'border-rose-500/30 text-rose-300'
        };
      case 'molten-gold':
      default:
        return {
          titleClass: 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent',
          glowStyle: {
            filter: `drop-shadow(0 0 ${Math.round(18 * titleConfig.glowIntensity)}px rgba(245,166,35,0.85)) drop-shadow(0 0 ${Math.round(35 * titleConfig.glowIntensity)}px rgba(245,166,35,0.4))`
          },
          streakClass: 'bg-gradient-to-r from-transparent via-[#F5A623] to-transparent shadow-[0_0_15px_#F5A623]',
          capsuleClass: 'border-[#F5A623]/25 text-[#F5A623]'
        };
    }
  };

  const previewInfo = getPreviewPresetInfo();

  return (
    <div className="w-full h-full flex flex-col bg-[#07070a] text-[#EDEDED] font-mono-tech select-none overflow-y-auto no-scrollbar">
      {/* Top Header & Quick Action Strip */}
      <div className="h-10 border-b border-[#272732] bg-[#0c0c10] px-3.5 flex items-center justify-between text-xs shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Type className="w-3.5 h-3.5 text-[#F5A623]" />
          <span className="font-bold text-[#F5A623] text-[11px] tracking-wider uppercase truncate">
            HERO TITLE KINETIC STUDIO
          </span>
          <span className="text-zinc-500 text-[10px]">
            SH{String(activeShotIndex + 1).padStart(3, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick [ T TITLES: ON/OFF ] Toggle */}
          <button
            type="button"
            onClick={toggleTitles}
            className={`px-2.5 py-1 rounded-[2px] border text-[9.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              titleConfig.showTitles
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,166,35,0.3)]'
                : 'bg-black/80 border-white/15 text-zinc-500 hover:text-white'
            }`}
            title="Toggle Stage Hero Typography (T)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${titleConfig.showTitles ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
            <span>{titleConfig.showTitles ? 'T TITLES: ON' : 'T TITLES: OFF'}</span>
          </button>

          <button
            onClick={handleExportSRT}
            className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-[#d4af37]/20 hover:text-[#fbbf24] border border-[#272732] hover:border-[#d4af37]/40 rounded-[1px] text-[9.5px] transition-colors cursor-pointer"
            title="Export 100-Shot Subtitles as .SRT file"
          >
            <Download className="w-3 h-3 text-[#d4af37]" />
            <span>.SRT</span>
          </button>
        </div>
      </div>

      {/* Studio Tab Switcher: [ ✦ DIRECTOR PRESETS (10) ] / [ ✎ ADVANCED CONTROLS ] */}
      <div className="flex border-b border-[#272732] bg-[#0c0c10] px-3 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`pb-2 pt-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'presets'
              ? 'border-[#F5A623] text-[#FFE066]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
          <span>10 DIRECTOR PRESETS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tributes')}
          className={`pb-2 pt-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'tributes'
              ? 'border-[#F5A623] text-[#FFE066]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
          <span>🌟 KINETIC TRIBUTES (11)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`pb-2 pt-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'editor'
              ? 'border-[#F5A623] text-[#FFE066]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>ADVANCED CONTROLS</span>
        </button>
      </div>

      {activeTab === 'presets' ? (
        <TextTypographyDrawer
          currentFrame={currentFrame}
          onUpdateFrame={onUpdateFrame}
        />
      ) : activeTab === 'tributes' ? (
        <div className="flex-1 flex flex-col p-4 bg-[#08090C] overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider text-[#F5A623] uppercase">
                5-Phase Kinetic Tribute Sequences
              </h3>
              <p className="text-[10px] font-mono text-zinc-400">
                11 Master Tribute Profiles: ALL CAPS performers, ≤20-word bio, and ≤10-word criticNote preceding director signature.
              </p>
            </div>
          </div>

          <div className="h-[460px] rounded-lg border border-[#F5A623]/30 bg-black/90 relative overflow-hidden shadow-2xl">
            <KineticTributeSequence
              durationSec={Math.max(9.0, currentFrame?.slideHoldSec || 9.0)}
              isPlaying={true}
              showControls={true}
              onApplyProfileToFrame={(tribute) => {
                handleUpdate({
                  title: tribute.performer,
                  bengaliTitle: tribute.captions[0] || titleBn,
                  tagline: tribute.hook,
                  directorNotes: tribute.criticNote,
                  caption: {
                    text: tribute.description,
                    bengaliText: tribute.captions[0],
                    style: 'cinematic_minimal',
                    color: '#F5A623'
                  }
                });
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left font-mono">
            {TRIBUTE_PROFILES.map((p) => (
              <div 
                key={p.id}
                className="p-2.5 rounded bg-white/5 border border-white/10 hover:border-[#F5A623]/50 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-white uppercase">{p.performer}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623]">{p.hook}</span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-2 mb-1.5">{p.description}</p>
                <div className="text-[9.5px] italic text-[#F5E2B3] bg-black/40 p-1.5 rounded border border-white/5 mb-2">
                  “{p.criticNote}”
                </div>
                <div className="flex items-center justify-between text-[9px] text-zinc-500">
                  <span>ANIM: {p.defaultAnimation}</span>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdate({
                        title: p.performer,
                        bengaliTitle: p.captions[0] || titleBn,
                        tagline: p.hook,
                        directorNotes: p.criticNote,
                        caption: {
                          text: p.description,
                          bengaliText: p.captions[0],
                          style: 'cinematic_minimal',
                          color: '#F5A623'
                        }
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-[#F5A623] text-black font-bold uppercase hover:bg-white transition-colors"
                  >
                    Apply to Shot
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="p-3.5 sm:p-4 flex flex-col gap-4">
        {/* Dynamic Hero Title Live Stage Simulator Card */}
        <div className="p-4 rounded-[3px] bg-[#020204] border border-[#F5A623]/30 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[140px] text-center">
          {/* Anamorphic Reflection Streak */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#FFE066]/30 to-transparent blur-[0.5px]" />
          <div className={`absolute top-1/2 left-1/4 right-1/4 -translate-y-1/2 h-2 rounded-full ${previewInfo.streakClass} opacity-80 blur-xs`} />

          {/* Bengali Hero Headline with 3-Layer Bloom */}
          <span 
            className={`font-bangla font-black ${previewInfo.titleClass} select-none leading-none transition-all drop-shadow-2xl`}
            style={{ 
              fontSize: `${Math.round(titleConfig.titleSize * 0.42)}px`,
              letterSpacing: `${titleConfig.tracking}em`,
              transform: `translateY(${titleConfig.verticalOffset * 0.15}px)`,
              ...previewInfo.glowStyle
            }}
          >
            {titleBn || 'দৃষ্টির সীমানা'}
          </span>

          {/* Ultra-Wide Tracked English Subtitle */}
          <span 
            className="font-mono font-bold text-slate-200 uppercase drop-shadow-md text-center mt-2.5 select-none"
            style={{ 
              fontSize: `${Math.max(9, Math.round(titleConfig.titleSize * 0.16))}px`,
              letterSpacing: `${(titleConfig.tracking + 0.25).toFixed(2)}em`
            }}
          >
            {titleEn || 'THE SINGULARITY'}
          </span>

          {/* Dialogue / Tagline Subtitle in Floating Obsidian Capsule */}
          {(caption || dialogue) && (
            <div className={`mt-3 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md border ${previewInfo.capsuleClass} text-[8.5px] italic max-w-[85%] truncate shadow-lg`}>
              "{dialogue || caption}"
            </div>
          )}

          <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[8px] text-zinc-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>0ms LIVE STAGE COMPOSITED</span>
          </div>
        </div>

        {/* 1. Quick Style Presets: Molten Gold, Titanium Silver, Neon Crimson */}
        <div className="flex flex-col gap-2.5 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F5A623]" />
              HERO STYLE PRESETS
            </span>
            <span className="text-[8.5px] text-zinc-400 font-mono">
              3-LAYER COMPOSITOR
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* [ ⚡ MOLTEN GOLD ] */}
            <button
              type="button"
              onClick={() => setTitlePreset('molten-gold')}
              className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                titleConfig.preset === 'molten-gold'
                  ? 'bg-amber-950/40 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,166,35,0.35)] ring-1 ring-amber-400/50'
                  : 'bg-[#121218] border-[#272732] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1 text-amber-300">
                  <Flame className="w-3.5 h-3.5" />
                  ⚡ MOLTEN GOLD
                </span>
                {titleConfig.preset === 'molten-gold' && (
                  <span className="text-[8px] bg-amber-400/20 text-amber-300 px-1 rounded font-mono">ACTIVE</span>
                )}
              </div>
              <span className="text-[8px] text-amber-200/60 leading-tight">
                Deep amber glow with anamorphic streak
              </span>
            </button>

            {/* [ ❄ TITANIUM SILVER ] */}
            <button
              type="button"
              onClick={() => setTitlePreset('titanium-silver')}
              className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                titleConfig.preset === 'titanium-silver'
                  ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.35)] ring-1 ring-cyan-400/50'
                  : 'bg-[#121218] border-[#272732] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1 text-cyan-300">
                  <Snowflake className="w-3.5 h-3.5" />
                  ❄ TITANIUM SILVER
                </span>
                {titleConfig.preset === 'titanium-silver' && (
                  <span className="text-[8px] bg-cyan-400/20 text-cyan-300 px-1 rounded font-mono">ACTIVE</span>
                )}
              </div>
              <span className="text-[8px] text-cyan-200/60 leading-tight">
                Liquid chrome with blue-hour rim light
              </span>
            </button>

            {/* [ 🩸 NEON CRIMSON ] */}
            <button
              type="button"
              onClick={() => setTitlePreset('neon-crimson')}
              className={`p-2.5 rounded-[2px] border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                titleConfig.preset === 'neon-crimson'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.35)] ring-1 ring-rose-500/50'
                  : 'bg-[#121218] border-[#272732] text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs flex items-center gap-1 text-rose-300">
                  <Activity className="w-3.5 h-3.5" />
                  🩸 NEON CRIMSON
                </span>
                {titleConfig.preset === 'neon-crimson' && (
                  <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 rounded font-mono">ACTIVE</span>
                )}
              </div>
              <span className="text-[8px] text-rose-200/60 leading-tight">
                Blade Runner cyberpunk laser pulse
              </span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Geometry & Volumetric Sliders */}
        <div className="flex flex-col gap-3.5 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#F5A623]" />
              KINETIC TITLE CONTROLS
            </span>
            <span className="text-[8px] text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
              0ms STAGE SYNC
            </span>
          </div>

          {/* Title Size Slider (48px - 120px) */}
          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Type className="w-3 h-3 text-[#F5A623]" />
                TITLE SCALE (PRIMARY HERO)
              </span>
              <span className="text-[#F5A623] font-bold font-mono">{titleConfig.titleSize}px</span>
            </div>
            <input
              type="range"
              min="48"
              max="120"
              step="2"
              value={titleConfig.titleSize}
              onChange={(e) => setTitleSize(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
            />
          </div>

          {/* Glow Intensity Slider (0% - 200%) */}
          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#F5A623]" />
                GLOW INTENSITY (BLOOM & RIM)
              </span>
              <span className="text-[#F5A623] font-bold font-mono">
                {Math.round(titleConfig.glowIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={titleConfig.glowIntensity}
              onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
            />
          </div>

          {/* Vertical Offset Slider (Y-axis: -150px to +150px) */}
          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <MoveVertical className="w-3 h-3 text-[#F5A623]" />
                VERTICAL OFFSET (Y-AXIS POSITION)
              </span>
              <span className="text-[#F5A623] font-bold font-mono">{titleConfig.verticalOffset}px</span>
            </div>
            <input
              type="range"
              min="-150"
              max="150"
              step="5"
              value={titleConfig.verticalOffset}
              onChange={(e) => setTitleVerticalOffset(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
            />
          </div>

          {/* Letter Tracking Slider (0.05em - 0.45em) */}
          <div>
            <div className="flex justify-between text-[9.5px] text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-[#F5A623]" />
                LETTER TRACKING (MONOSPACE SPREAD)
              </span>
              <span className="text-[#F5A623] font-bold font-mono">{titleConfig.tracking.toFixed(2)}em</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.45"
              step="0.02"
              value={titleConfig.tracking}
              onChange={(e) => setTitleTracking(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
            />
          </div>
        </div>

        {/* 3. Real-Time Bilingual Text Content */}
        <div className="flex flex-col gap-3 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#F5A623]" />
              BILINGUAL TEXT REPOSITORY
            </span>
          </div>

          {/* Bangla Title Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-zinc-400 uppercase font-mono">
                বাংলা শীর্ষক (Primary Hero Bangla Title)
              </label>
              <span className="text-[8px] text-[#F5A623] font-mono">Anek / Noto Serif</span>
            </div>
            <input
              type="text"
              value={titleBn || ''}
              onChange={(e) => handleUpdate({ bengaliTitle: e.target.value })}
              placeholder="যেমন: দৃষ্টির সীমানা, আলোর স্মৃতি"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-sm font-bangla font-black text-[#ffe58f] outline-none transition-colors"
            />
            {/* Quick Suggestions for Bangla */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {banglaSuggestions.slice(0, 6).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleUpdate({ bengaliTitle: sug })}
                  className="px-1.5 py-0.5 rounded-[1px] bg-white/5 hover:bg-[#d4af37]/20 border border-[#272732] hover:border-[#d4af37]/50 text-[9px] font-bangla text-zinc-300 hover:text-[#fbbf24] cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* English Headline Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-zinc-400 uppercase font-mono">
                English Subtitle (Ultra-Wide Tracked)
              </label>
              <span className="text-[8px] text-[#F5A623] font-mono">JetBrains Mono</span>
            </div>
            <input
              type="text"
              value={titleEn || ''}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="e.g. THE SINGULARITY"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-xs font-mono font-bold text-white tracking-wider outline-none transition-colors uppercase"
            />
            {/* Quick Suggestions for English */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {englishSuggestions.slice(0, 6).map(sug => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleUpdate({ title: sug })}
                  className="px-1.5 py-0.5 rounded-[1px] bg-white/5 hover:bg-[#d4af37]/20 border border-[#272732] hover:border-[#d4af37]/50 text-[8px] font-mono text-zinc-300 hover:text-white cursor-pointer transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Dialogue / Tagline Subtitle Textarea */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-mono block mb-1">
              Dialogue Card / Floating Obsidian Capsule
            </label>
            <textarea
              rows={2}
              value={dialogue || caption || ''}
              onChange={(e) => handleUpdate({ directorNotes: e.target.value, tagline: e.target.value })}
              placeholder="Directorial line, quote, or narrative dialogue..."
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-xs font-mono text-zinc-200 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 4. Super Title Kinetic Animation Style */}
        <div className="flex flex-col gap-2.5 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-400 uppercase font-mono flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F5A623]" />
              Kinetic Entrance Transition
            </label>
            <span className="text-[8.5px] text-[#F5A623] font-mono font-bold uppercase">
              600ms Ease-Scale (95% → 100%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'flare', label: '⚡ Anamorphic Flare' },
              { id: 'kinetic', label: '🚀 Kinetic Snap' },
              { id: 'glitch', label: '📼 Celluloid Glitch' },
              { id: 'breathe', label: '✨ Aura Breathe' },
              { id: 'typewriter', label: '⌨ Screenplay Typewriter' },
              { id: 'neon', label: '🌆 Blade Runner Cyber' }
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
                    ? 'border-[#F5A623] bg-[#d4af37]/20 text-[#fbbf24] font-bold shadow-[0_0_8px_rgba(245,166,35,0.3)]' 
                    : 'border-[#272732] bg-[#121218] text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
