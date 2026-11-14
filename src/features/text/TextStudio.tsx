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
import { BrutalistKineticHudStrip } from '../../components/drawers/BrutalistKineticHudStrip';
import { KineticTributeSequence } from '../../components/stage/templates/KineticTributeSequence';
import { TributeProfile, TRIBUTE_PROFILES } from '../../constants/tributeData';
import { resolveShotTitleData, resolveShotTitlePresetConfig } from '../../constants/titleTemplates';
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
import { CinemaToolHUD, CinemaBadgeHeader } from '../../components/ui/CinemaToolHUD';

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
  const activeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const currentShot = useStudioStore((s) => s.project.shots[s.activeShotIndex] || {});
  const updateShot = useStudioStore((s) => s.updateShot);
  const updateShotTitleData = useStudioStore((s) => s.updateShotTitleData);
  const titleConfig = useStudioStore((s) => s.titleConfig);
  const setTitlePreset = useStudioStore((s) => s.setTitlePreset);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore((s) => s.setTitleGlowIntensity);
  const setTitleVerticalOffset = useStudioStore((s) => s.setTitleVerticalOffset);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);

  const currentTheme = baseThemesData[activeShotIndex % baseThemesData.length];
  const shotTitleData = resolveShotTitleData(currentFrame || currentShot, activeShotIndex, titleConfig);

  // Derive active frame values strictly from the active shot's isolated titleData
  const titleEn = shotTitleData.englishSubtitle || (currentFrame ? currentFrame.title : (currentShot.title ?? currentTheme.title));
  const titleBn = shotTitleData.banglaTitle || (currentFrame ? currentFrame.bengaliTitle : (currentShot.bengaliTitle ?? currentTheme.sub));
  const caption = shotTitleData.captionNote || (currentFrame ? currentFrame.tagline : (currentShot.tagline ?? currentTheme.tag));
  const dialogue = currentFrame ? (currentFrame.directorNotes || '') : (currentShot.directorNotes || '');
  const soundCue = currentFrame ? (currentFrame.soundCue || '') : (currentShot.soundCue || '');

  const shotTitleSize = shotTitleData.fontScale ?? titleConfig.titleSize ?? 72;
  const shotGlowIntensity = shotTitleData.glowIntensity ?? titleConfig.glowIntensity ?? 1.0;
  const shotVerticalOffset = shotTitleData.verticalOffset ?? titleConfig.verticalOffset ?? 0;
  const shotTracking = shotTitleData.letterTracking ?? titleConfig.tracking ?? 0.15;
  const shotPresetId = shotTitleData.presetId;

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

    const nextTitleData = {
      ...shotTitleData,
      banglaTitle: updatedFrame.bengaliTitle ?? shotTitleData.banglaTitle,
      englishSubtitle: updatedFrame.title ?? shotTitleData.englishSubtitle,
      captionNote: updatedFrame.tagline ?? shotTitleData.captionNote,
      styleConfig: updatedFrame.titleStyleConfig ?? shotTitleData.styleConfig
    };
    updatedFrame.titleData = nextTitleData;

    // 1. Notify stage & App.tsx for visual repaint
    if (onUpdateFrame) {
      onUpdateFrame(updatedFrame);
    } else {
      eventBus.emit('shot:updated', {
        index: activeShotIndex,
        partial: {
          ...partial,
          titleData: nextTitleData
        }
      });
    }

    // 2. Synchronize useStudioStore strictly on activeShotIndex
    updateShot(activeShotIndex, {
      title: updatedFrame.title,
      bengaliTitle: updatedFrame.bengaliTitle,
      tagline: updatedFrame.tagline,
      directorNotes: updatedFrame.directorNotes,
      soundCue: updatedFrame.soundCue,
      titleAnimation: updatedFrame.titleAnimation,
      titleData: nextTitleData,
      ...(updatedFrame.activeTitlePreset ? { activeTitlePreset: updatedFrame.activeTitlePreset } : {}),
      ...(updatedFrame.titleStyleConfig ? { titleStyleConfig: updatedFrame.titleStyleConfig } : {})
    });
  };

  const handleExportSRT = () => {
    let srtContent = '';
    const shots = useStudioStore.getState().project.shots;
    const total = Math.max(100, shots.length);
    let currentTime = 0;

    for (let i = 0; i < total; i++) {
      const shot = shots[i] || {};
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

  const resolvedSimulatorConfig =
    shotTitleData.styleConfig ?? resolveShotTitlePresetConfig(currentFrame || currentShot, titleConfig);

  // Preview styling based on resolved TitlePresetConfig
  const getPreviewPresetInfo = () => {
    const c = resolvedSimulatorConfig;
    const hasGrad = Array.isArray(c.primaryGradient) && c.primaryGradient.length >= 2;
    return {
      config: c,
      hasGrad,
      glowStyle: hasGrad
        ? {
            backgroundImage: `linear-gradient(90deg, ${c.primaryGradient!.join(', ')})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: `drop-shadow(0 0 ${Math.round(18 * shotGlowIntensity)}px ${c.glowColor})`
          }
        : {
            color: c.primaryColor,
            WebkitTextStroke: c.strokeWidth > 0 ? `1px ${c.strokeColor}` : undefined,
            textShadow: `0 0 ${Math.round(18 * shotGlowIntensity)}px ${c.glowColor}`
          }
    };
  };

  const previewInfo = getPreviewPresetInfo();

  return (
    <div className="w-full h-full flex flex-col bg-[#07070a] text-[#EDEDED] font-mono-tech select-none overflow-y-auto no-scrollbar">
      {/* Top Header & Quick Action Strip */}
      <div className="h-12 border-b border-[#272732] bg-[#0c0c10] px-3.5 flex items-center justify-between text-xs shrink-0 sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CinemaBadgeHeader icon={<Type className="w-3.5 h-3.5" />} label="TITLE FX" accent="amber" />
          <span className="text-zinc-500 text-[10px] font-black tracking-wider">
            SH{String(activeShotIndex + 1).padStart(3, '0')}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick [ T TITLES: ON/OFF ] Per-Shot Toggle */}
          <CinemaToolHUD
            title="TOGGLE SHOT TITLES"
            en="Enable or disable overlay typography for the active shot"
            bn="কীভাবে ব্যবহার করবেন: এই শটের টাইটেল অন বা অফ করতে চাপুন।"
            accent="amber"
            shortcut="T"
          >
            <button
              type="button"
              onClick={() => updateShotTitleData(activeShotIndex, { enabled: !shotTitleData.enabled })}
              data-active={shotTitleData.enabled ? 'true' : 'false'}
              className="cinema-tile cinema-tile-amber px-2.5 py-1.5 min-h-[34px] flex items-center gap-1.5 cursor-pointer"
            >
              <Type className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">
                {shotTitleData.enabled ? 'T ON' : 'T OFF'}
              </span>
            </button>
          </CinemaToolHUD>

          <CinemaToolHUD
            title="EXPORT .SRT SUBTITLES"
            en="Download bilingual timed .SRT subtitles for all 100 shots"
            bn="কীভাবে ব্যবহার করবেন: সব শটের সাবটাইটেল .SRT ফাইলে ডাউনলোড করতে চাপুন।"
            accent="cyan"
          >
            <button
              onClick={handleExportSRT}
              className="cinema-tile cinema-tile-cyan flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">.SRT</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Minimalist Brutalist Control Strip: 3D Depth Occlusion & Transient Punch */}
      <div className="px-3.5 pt-3 pb-2 bg-[#07070a] border-b border-[#272732] shrink-0">
        <BrutalistKineticHudStrip />
      </div>

      {/* Studio Tab Switcher */}
      <div className="flex border-b border-[#272732] bg-[#0c0c10] px-3 py-1.5 gap-1.5 shrink-0">
        <CinemaToolHUD
          title="DIRECTOR PRESETS (10)"
          en="Browse 10 curated bilingual kinetic title templates"
          bn="কীভাবে ব্যবহার করবেন: ১০টি রেডি সিনেমা টাইটেল প্রিসেট দেখতে চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            data-active={activeTab === 'presets' ? 'true' : 'false'}
            className="cinema-tile cinema-tile-amber w-full py-2 min-h-[38px] px-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">PRESETS</span>
          </button>
        </CinemaToolHUD>
        <CinemaToolHUD
          title="KINETIC TRIBUTES (11)"
          en="11 master 5-phase kinetic tribute profiles"
          bn="কীভাবে ব্যবহার করবেন: কিনেটিক ট্রিবিউট সিকোয়েন্স ও প্রোফাইল দেখতে চাপুন।"
          accent="cyan"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => setActiveTab('tributes')}
            data-active={activeTab === 'tributes' ? 'true' : 'false'}
            className="cinema-tile cinema-tile-cyan w-full py-2 min-h-[38px] px-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">TRIBUTES</span>
          </button>
        </CinemaToolHUD>
        <CinemaToolHUD
          title="TITLE CONTROLS"
          en="Fine-tune typography scale, bloom glow, Y-offset, tracking, and motion"
          bn="কীভাবে ব্যবহার করবেন: সাইজ, গ্লো, টেক্সট এবং অ্যানিমেশন কাস্টমাইজ করতে চাপুন।"
          accent="amber"
          blockWrapper
        >
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            data-active={activeTab === 'editor' ? 'true' : 'false'}
            className="cinema-tile cinema-tile-amber w-full py-2 min-h-[38px] px-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span className="font-black tracking-wider text-[10px] sm:text-[11px] uppercase">CONTROLS</span>
          </button>
        </CinemaToolHUD>
      </div>

      {activeTab === 'presets' ? (
        <TextTypographyDrawer
          currentFrame={currentFrame}
          onUpdateFrame={onUpdateFrame}
          hideAutonomousStrip={true}
        />
      ) : activeTab === 'tributes' ? (
        <div className="flex-1 flex flex-col p-4 bg-[#08090C] overflow-y-auto">
          <div className="mb-3 flex items-center justify-between">
            <CinemaBadgeHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="TRIBUTES" accent="amber" />
            <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">11 PROFILES</span>
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
                className="p-2.5 rounded bg-white/5 border border-white/10 hover:border-[#F5A623]/50 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-white uppercase truncate">{p.performer}</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#F5A623]/20 text-[#F5A623] uppercase shrink-0">{p.defaultAnimation}</span>
                </div>
                <CinemaToolHUD
                  title={`APPLY: ${p.performer}`}
                  en={`${p.hook} — ${p.criticNote}`}
                  bn="কীভাবে ব্যবহার করবেন: এই ট্রিবিউট প্রোফাইল শটে বসাতে APPLY চাপুন।"
                  accent="amber"
                  blockWrapper
                >
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
                    className="cinema-tile cinema-tile-amber w-full py-1.5 min-h-[34px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span className="font-black tracking-wider text-[10px] uppercase">APPLY</span>
                  </button>
                </CinemaToolHUD>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="p-3.5 sm:p-4 flex flex-col gap-4">
        {/* Dynamic Hero Title Live Stage Simulator Card */}
        <div
          className="p-4 rounded-[3px] bg-[#020204] border relative overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[140px] text-center"
          style={{ borderColor: `${previewInfo.config.primaryColor}45` }}
        >
          {/* Anamorphic Reflection Streak */}
          <div
            className="absolute top-1/2 left-1/4 right-1/4 -translate-y-1/2 h-[2px] rounded-full opacity-70 blur-[0.5px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${previewInfo.config.primaryColor}, transparent)`,
              boxShadow: `0 0 15px ${previewInfo.config.glowColor}`
            }}
          />

          {/* Primary Hero Headline with Unified Preset Styling */}
          <span 
            className="font-black select-none leading-none transition-all drop-shadow-2xl relative z-10"
            style={{ 
              fontFamily: previewInfo.config.banglaFontFamily,
              fontSize: `${Math.round(shotTitleSize * 0.42)}px`,
              letterSpacing: `${shotTracking}em`,
              transform: `translateY(${shotVerticalOffset * 0.15}px)`,
              ...previewInfo.glowStyle
            }}
          >
            {titleBn || 'দৃষ্টির সীমানা'}
          </span>

          {/* Secondary Subtitle */}
          <span 
            className="font-bold uppercase drop-shadow-md text-center mt-2.5 select-none relative z-10"
            style={{ 
              fontFamily: previewInfo.config.englishFontFamily,
              color: previewInfo.config.secondaryColor,
              fontSize: `${Math.max(9, Math.round(shotTitleSize * 0.16))}px`,
              letterSpacing: `${(shotTracking + 0.15).toFixed(2)}em`
            }}
          >
            {titleEn || 'THE SINGULARITY'}
          </span>

          {/* Dialogue / Tagline Subtitle */}
          {(caption || dialogue) && (
            <div
              className="mt-3 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md border text-[8.5px] italic max-w-[85%] truncate shadow-lg relative z-10"
              style={{
                borderColor: `${previewInfo.config.primaryColor}45`,
                color: previewInfo.config.secondaryColor
              }}
            >
              "{dialogue || caption}"
            </div>
          )}

          <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-400 uppercase">
            {previewInfo.config.presetName} • {previewInfo.config.layoutMode}
          </div>
          <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[8px] text-zinc-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>0ms PER-SHOT SYNC</span>
          </div>
        </div>

        {/* 1. Quick Style Presets: Molten Gold, Titanium Silver, Neon Crimson */}
        <div className="flex flex-col gap-2.5 bg-[#0a0a10] border border-[#272732] p-3 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <CinemaBadgeHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="STYLE PRESETS" accent="amber" />
            <span className="text-[9px] text-zinc-400 font-black uppercase">3-LAYER</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* MOLTEN GOLD */}
            <CinemaToolHUD
              title="MOLTEN GOLD"
              en="Deep amber volumetric glow with anamorphic flare streak"
              bn="কীভাবে ব্যবহার করবেন: সোনালী অ্যানামরফিক গ্লো স্টাইল বসাতে চাপুন।"
              accent="amber"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setTitlePreset('molten-gold')}
                data-active={shotPresetId === 'molten-gold' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-amber w-full p-2.5 min-h-[54px] flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Flame className="w-4 h-4" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">MOLTEN GOLD</span>
              </button>
            </CinemaToolHUD>

            {/* TITANIUM SILVER */}
            <CinemaToolHUD
              title="TITANIUM SILVER"
              en="Liquid chrome typography with blue-hour optical rim light"
              bn="কীভাবে ব্যবহার করবেন: সিলভার ক্রোম টাইটেল স্টাইল বসাতে চাপুন।"
              accent="cyan"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setTitlePreset('titanium-silver')}
                data-active={shotPresetId === 'titanium-silver' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-cyan w-full p-2.5 min-h-[54px] flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Snowflake className="w-4 h-4" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">TITANIUM</span>
              </button>
            </CinemaToolHUD>

            {/* NEON CRIMSON */}
            <CinemaToolHUD
              title="NEON CRIMSON"
              en="High-contrast cyberpunk laser pulse typography"
              bn="কীভাবে ব্যবহার করবেন: সাইবারপাঙ্ক লাল নিয়ন টাইটেল স্টাইল বসাতে চাপুন।"
              accent="crimson"
              blockWrapper
            >
              <button
                type="button"
                onClick={() => setTitlePreset('neon-crimson')}
                data-active={shotPresetId === 'neon-crimson' ? 'true' : 'false'}
                className="cinema-tile cinema-tile-crimson w-full p-2.5 min-h-[54px] flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Activity className="w-4 h-4" strokeWidth={2.2} />
                <span className="font-black tracking-wider text-[10px] uppercase">NEON RED</span>
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* 2. Interactive Geometry & Volumetric Sliders */}
        <div className="flex flex-col gap-3.5 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <CinemaBadgeHeader icon={<Sliders className="w-3.5 h-3.5" />} label="TYPOGRAPHY" accent="amber" />
            <span className="text-[9px] text-emerald-400 font-black uppercase">0MS SYNC</span>
          </div>

          {/* Title Size Slider (48px - 120px) */}
          <CinemaToolHUD
            title="TITLE SCALE"
            en="Adjust primary hero typography scale from 48px to 120px"
            bn="কীভাবে ব্যবহার করবেন: স্লাইডার টেনে হিরো টাইটেলের আকার বড় বা ছোট করুন।"
            accent="amber"
            blockWrapper
          >
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#F5A623]" />
                  SCALE
                </span>
                <span className="text-[#F5A623] tabular-nums">{shotTitleSize}PX</span>
              </div>
              <input
                type="range"
                min="48"
                max="120"
                step="2"
                value={shotTitleSize}
                onChange={(e) => setTitleSize(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
              />
            </div>
          </CinemaToolHUD>

          {/* Glow Intensity Slider (0% - 200%) */}
          <CinemaToolHUD
            title="GLOW BLOOM"
            en="Adjust title volumetric bloom and rim glow (0% to 200%)"
            bn="কীভাবে ব্যবহার করবেন: স্লাইডার টেনে টাইটেলের গ্লো ও আলো বাড়ান বা কমান।"
            accent="amber"
            blockWrapper
          >
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                  GLOW
                </span>
                <span className="text-[#F5A623] tabular-nums">
                  {Math.round(shotGlowIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={shotGlowIntensity}
                onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
              />
            </div>
          </CinemaToolHUD>

          {/* Vertical Offset Slider (Y-axis: -150px to +150px) */}
          <CinemaToolHUD
            title="Y OFFSET"
            en="Shift vertical Y position on frame (-150px to +150px)"
            bn="কীভাবে ব্যবহার করবেন: স্লাইডার দিয়ে টাইটেল ফ্রেমের উপরে বা নিচে সরান।"
            accent="amber"
            blockWrapper
          >
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-[#F5A623]" />
                  Y OFFSET
                </span>
                <span className="text-[#F5A623] tabular-nums">{shotVerticalOffset}PX</span>
              </div>
              <input
                type="range"
                min="-150"
                max="150"
                step="5"
                value={shotVerticalOffset}
                onChange={(e) => setTitleVerticalOffset(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
              />
            </div>
          </CinemaToolHUD>

          {/* Letter Tracking Slider (0.05em - 0.45em) */}
          <CinemaToolHUD
            title="LETTER TRACKING"
            en="Adjust letter spacing spread across subtitles (0.05em - 0.45em)"
            bn="কীভাবে ব্যবহার করবেন: অক্ষরের মাঝের দূরত্ব বাড়াতে বা কমাতে স্লাইডার টানুন।"
            accent="amber"
            blockWrapper
          >
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-black tracking-wider uppercase text-zinc-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#F5A623]" />
                  TRACKING
                </span>
                <span className="text-[#F5A623] tabular-nums">{shotTracking.toFixed(2)}EM</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.45"
                step="0.02"
                value={shotTracking}
                onChange={(e) => setTitleTracking(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 accent-[#F5A623] cursor-pointer rounded"
              />
            </div>
          </CinemaToolHUD>
        </div>

        {/* 3. Real-Time Bilingual Text Content */}
        <div className="flex flex-col gap-3 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <CinemaBadgeHeader icon={<Zap className="w-3.5 h-3.5" />} label="TEXT COPY" accent="amber" />
          </div>

          {/* Bangla Title Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                BANGLA TITLE
              </label>
            </div>
            <input
              type="text"
              value={titleBn || ''}
              onChange={(e) => handleUpdate({ bengaliTitle: e.target.value })}
              placeholder="দৃষ্টির সীমানা"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-sm font-bangla font-black text-[#ffe58f] outline-none transition-colors"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {banglaSuggestions.slice(0, 6).map(sug => (
                <CinemaToolHUD
                  key={sug}
                  title="BANGLA PRESET"
                  en={`Apply "${sug}" as the Bangla headline`}
                  bn="কীভাবে ব্যবহার করবেন: এই বাংলা শিরোনাম শটে বসাতে চাপুন।"
                  accent="amber"
                >
                  <button
                    type="button"
                    onClick={() => handleUpdate({ bengaliTitle: sug })}
                    className="cinema-tile cinema-tile-amber px-2 py-1 text-[10px] font-bangla font-bold cursor-pointer"
                  >
                    {sug}
                  </button>
                </CinemaToolHUD>
              ))}
            </div>
          </div>

          {/* English Headline Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                ENGLISH TITLE
              </label>
            </div>
            <input
              type="text"
              value={titleEn || ''}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              placeholder="THE SINGULARITY"
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-xs font-mono font-bold text-white tracking-wider outline-none transition-colors uppercase"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {englishSuggestions.slice(0, 6).map(sug => (
                <CinemaToolHUD
                  key={sug}
                  title="ENGLISH PRESET"
                  en={`Apply "${sug}" as the English subtitle`}
                  bn="কীভাবে ব্যবহার করবেন: এই ইংরেজি শিরোনাম শটে বসাতে চাপুন।"
                  accent="cyan"
                >
                  <button
                    type="button"
                    onClick={() => handleUpdate({ title: sug })}
                    className="cinema-tile cinema-tile-cyan px-2 py-1 text-[9px] font-black tracking-wider uppercase cursor-pointer"
                  >
                    {sug}
                  </button>
                </CinemaToolHUD>
              ))}
            </div>
          </div>

          {/* Dialogue / Tagline Subtitle Textarea */}
          <div>
            <label className="text-[10px] font-black tracking-wider text-zinc-400 uppercase block mb-1">
              DIALOGUE NOTE
            </label>
            <textarea
              rows={2}
              value={dialogue || caption || ''}
              onChange={(e) => handleUpdate({ directorNotes: e.target.value, tagline: e.target.value })}
              placeholder="Dialogue..."
              className="w-full bg-[#121218] border border-[#272732] focus:border-[#F5A623] rounded-[1px] p-2 text-xs font-mono text-zinc-200 outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 4. Super Title Kinetic Animation Style */}
        <div className="flex flex-col gap-2.5 bg-[#0a0a10] border border-[#272732] p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-[#272732] pb-1.5">
            <CinemaBadgeHeader icon={<Sparkles className="w-3.5 h-3.5" />} label="ENTRANCE FX" accent="amber" />
            <span className="text-[9px] text-[#F5A623] font-black uppercase">600MS</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'flare', label: 'ANAMORPHIC', en: '600ms anamorphic lens flare reveal' },
              { id: 'kinetic', label: 'KINETIC SNAP', en: 'Snappy high-velocity scale lock-in' },
              { id: 'glitch', label: 'GLITCH CUT', en: '35mm celluloid frame tear & chromatic split' },
              { id: 'breathe', label: 'AURA BREATHE', en: 'Gentle atmospheric opacity & scale float' },
              { id: 'typewriter', label: 'TYPEWRITER', en: 'Monospace screenplay character reveal' },
              { id: 'neon', label: 'CYBER NEON', en: 'Blade Runner neon flicker glow' }
            ].map(opt => (
              <CinemaToolHUD
                key={opt.id}
                title={opt.label}
                en={opt.en}
                bn="কীভাবে ব্যবহার করবেন: টাইটেলের এন্ট্রান্স অ্যানিমেশন পরিবর্তন করতে চাপুন।"
                accent="amber"
                blockWrapper
              >
                <button
                  type="button"
                  onClick={() => {
                    setAnimationStyle(opt.id as any);
                    handleUpdate({ titleAnimation: opt.id as any });
                  }}
                  data-active={animationStyle === opt.id ? 'true' : 'false'}
                  className="cinema-tile cinema-tile-amber w-full p-2 min-h-[38px] flex items-center justify-center font-black tracking-wider text-[10px] uppercase cursor-pointer"
                >
                  {opt.label}
                </button>
              </CinemaToolHUD>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
