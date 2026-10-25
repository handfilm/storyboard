/**
 * @file /src/components/drawers/TextTypographyDrawer.tsx
 * @description Master Cinematic Title & Motion Typography Drawer.
 * Features 10 production-ready Director presets with interactive hover previews,
 * 1-click slide application, and instant WebCodecs canvas integration.
 */

import React, { useState } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { useStudioStore } from '../../core/store';
import { db } from '../../services/db';
import { eventBus } from '../../core/eventBus';
import { 
  CINEMATIC_TITLE_PRESETS, 
  TitleTemplatePreset, 
  applyTitleTemplateToFrame 
} from '../../constants/titleTemplates';
import { 
  COMPILATION_PRESETS, 
  CompilationPreset, 
  getCompilationPresetById 
} from '../../constants/compilationData';
import { DopamineCompilationSequence } from '../stage/templates/DopamineCompilationSequence';
import { 
  Type, 
  Sparkles, 
  Zap, 
  Sliders, 
  Check, 
  Layers, 
  MoveVertical,
  SlidersHorizontal,
  Flame,
  Activity,
  Film,
  Radio,
  RotateCcw
} from 'lucide-react';

export interface TextTypographyDrawerProps {
  currentFrame?: AnthologyFrame;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onApplyPreset?: (preset: TitleTemplatePreset) => void;
}

export const TextTypographyDrawer: React.FC<TextTypographyDrawerProps> = ({
  currentFrame,
  onUpdateFrame,
  onApplyPreset
}) => {
  const activeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const titleSize = useStudioStore((s) => s.titleConfig?.titleSize ?? 72);
  const glowIntensity = useStudioStore((s) => s.titleConfig?.glowIntensity ?? 1.0);
  const tracking = useStudioStore((s) => s.titleConfig?.tracking ?? 0.15);
  const verticalOffset = useStudioStore((s) => s.titleConfig?.verticalOffset ?? 0);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore((s) => s.setTitleGlowIntensity);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);
  const setTitleVerticalOffset = useStudioStore((s) => s.setTitleVerticalOffset);

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'dopamine' | 'cinematic' | 'rap' | 'docu' | 'retro' | 'corporate'>('all');
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);
  const [dragOverPresetId, setDragOverPresetId] = useState<string | null>(null);
  const [boundSuccessPresetId, setBoundSuccessPresetId] = useState<string | null>(null);

  // Dopamine Engine State
  const [activeDopamineId, setActiveDopamineId] = useState<string>('viral_loop_1');
  const [dopamineHook, setDopamineHook] = useState<string>('PURE RHYTHM');
  const [dopamineSub, setDopamineSub] = useState<string>('Visual Physics at Work.');
  const [dopamineGlitch, setDopamineGlitch] = useState<number>(80);
  const [dopamineStrobe, setDopamineStrobe] = useState<number>(60);
  const [dopamineSpeed, setDopamineSpeed] = useState<number>(1.5);
  const [dopamineAccent, setDopamineAccent] = useState<string>('#FF2B2B');
  const [appliedDopamineSuccess, setAppliedDopamineSuccess] = useState<boolean>(false);

  const filteredPresets = selectedCategory === 'all'
    ? CINEMATIC_TITLE_PRESETS
    : CINEMATIC_TITLE_PRESETS.filter(p => p.category === selectedCategory);

  const categoryChips = [
    { id: 'all', label: `ALL (${CINEMATIC_TITLE_PRESETS.length})` },
    { id: 'dopamine', label: '🌪️ DOPAMINE' },
    { id: 'corporate', label: '🏢 CORPORATE B2B' },
    { id: 'cinematic', label: '🎬 CINEMATIC' },
    { id: 'rap', label: '⚡ RAP' },
    { id: 'docu', label: '🎙 DOCU' },
    { id: 'retro', label: '📼 RETRO' }
  ] as const;

  const handleSelectDopaminePreset = (preset: CompilationPreset) => {
    setActiveDopamineId(preset.id);
    setDopamineHook(preset.hook);
    setDopamineSub(preset.subText);
    setDopamineGlitch(preset.glitch);
    setDopamineSpeed(preset.speed);
    if (preset.strobeRate) setDopamineStrobe(preset.strobeRate);
    if (preset.accentColor) setDopamineAccent(preset.accentColor);
  };

  const handleApplyDopamineToFrame = () => {
    if (!currentFrame || !onUpdateFrame) return;
    const preset = getCompilationPresetById(activeDopamineId);

    const updated: AnthologyFrame = {
      ...currentFrame,
      title: dopamineHook,
      tagline: dopamineSub,
      titleAnimation: 'kinetic',
      tags: Array.from(new Set([...(currentFrame.tags || []), 'dopamine', preset.id])),
      directorNotes: `[🌪️ DOPAMINE: ${preset.name}] Glitch: ${dopamineGlitch}%, Strobe: ${dopamineStrobe}ms, Speed: ${dopamineSpeed}x`,
      caption: {
        text: dopamineSub,
        style: 'rap_pop',
        color: dopamineAccent
      }
    };

    onUpdateFrame(updated);
    setAppliedDopamineSuccess(true);
    setTimeout(() => {
      setAppliedDopamineSuccess(false);
      eventBus.emit('drawer:close');
    }, 1200);
  };

  const handleApply = (preset: TitleTemplatePreset) => {
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2000);

    if (onApplyPreset) {
      onApplyPreset(preset);
    }

    if (currentFrame && onUpdateFrame) {
      const updated = applyTitleTemplateToFrame(currentFrame, preset);
      queueMicrotask(() => {
        onUpdateFrame(updated);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent, presetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverPresetId !== presetId) {
      setDragOverPresetId(presetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, presetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    if (e.currentTarget && relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dragOverPresetId === presetId) {
      setDragOverPresetId(null);
    }
  };

  const handleDropAssetOnPreset = async (e: React.DragEvent, preset: TitleTemplatePreset) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPresetId(null);

    // 1. Extract drag payload
    let rawPayload = e.dataTransfer.getData('application/json');
    if (!rawPayload) {
      rawPayload = e.dataTransfer.getData('text/plain');
    }

    let assetData: any = null;
    try {
      if (rawPayload) {
        assetData = JSON.parse(rawPayload);
      }
    } catch (err) {
      console.warn('[TitleTemplates] Failed to parse drag payload:', err);
    }

    const assetId = assetData?.assetId || assetData?.id;
    let mediaUrl = assetData?.mediaUrl || assetData?.url;
    const fileName = assetData?.fileName || assetData?.filename || assetData?.name || 'Master Footage';
    const isVideo = assetData?.isVideo ?? (assetData?.mimeType?.startsWith('video') || true);

    // If mediaUrl is missing but assetId is present, resolve from db
    if (!mediaUrl && assetId) {
      try {
        const item = await db.getVaultMediaById(assetId);
        if (item && item.blob) {
          mediaUrl = db.getActiveMediaUrl(item.id, item.blob);
        } else if (item?.thumbnailUrl) {
          mediaUrl = item.thumbnailUrl;
        }
      } catch (err) {
        console.warn('[TitleTemplates] DB lookup error:', err);
      }
    }

    // 2. Atomic Dispatch:
    // (a) Bind dropped master footage in IndexedDB
    if (assetId) {
      try {
        await db.assignMediaToShot(assetId, activeShotIndex);
      } catch (dbErr) {
        console.warn('[TitleTemplates] DB assignMediaToShot error:', dbErr);
      }
    }

    // (b) Update local studio store shot
    const store = useStudioStore.getState();
    const currentShot = store.project.shots[activeShotIndex] || {};
    const updatedShotPartial: any = {
      title: preset.primaryText,
      bengaliTitle: preset.bengaliText || currentShot.bengaliTitle || 'দৃষ্টির সীমানা',
      tagline: preset.secondaryText || currentShot.tagline,
      titleAnimation: preset.animationStyle
    };
    if (mediaUrl) {
      updatedShotPartial.imageUrl = mediaUrl;
      updatedShotPartial.isVideo = isVideo;
    }
    store.updateShot(activeShotIndex, updatedShotPartial);

    // (c) Apply preset typography & styles to active frame
    const baseFrame: AnthologyFrame = currentFrame || {
      id: activeShotIndex + 1,
      epNumber: String(activeShotIndex + 1).padStart(3, '0'),
      title: preset.primaryText,
      bengaliTitle: preset.bengaliText || 'দৃষ্টির সীমানা',
      tagline: preset.secondaryText || '',
      directorNotes: '',
      soundCue: '',
      cameraSpec: {
        focalLength: '35mm High-Speed Master',
        aperture: 'f/1.4',
        shutter: '1/48s 180°',
        iso: 'ISO 400',
        sensor: 'Full-Frame Cine',
        format: 'RAW 14-BIT ARRI'
      },
      imageUrl: mediaUrl || currentShot.imageUrl || '',
      isVideo: isVideo,
      panY: 50,
      colorAccent: preset.color,
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

    const updatedFrame = applyTitleTemplateToFrame(baseFrame, preset);
    if (mediaUrl) {
      updatedFrame.imageUrl = mediaUrl;
      updatedFrame.isVideo = isVideo;
    }

    if (onUpdateFrame) {
      queueMicrotask(() => {
        onUpdateFrame(updatedFrame);
      });
    }
    if (onApplyPreset) {
      onApplyPreset(preset);
    }

    // (d) Emit global events for timeline and stage canvas sync
    eventBus.emit('shot:updated', {
      index: activeShotIndex,
      partial: updatedShotPartial
    });

    if (mediaUrl) {
      eventBus.emit('asset_assigned_to_shot', {
        assetId: assetId || `temp-${Date.now()}`,
        shotIndex: activeShotIndex,
        blobUrl: mediaUrl,
        meta: {
          mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
          name: fileName
        }
      });
    }

    // (e) Visual feedback state: 1.2s tactical confirmation badge then auto-close drawer
    setBoundSuccessPresetId(preset.id);
    setTimeout(() => {
      setBoundSuccessPresetId(null);
      eventBus.emit('drawer:close');
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col space-y-6 p-4 sm:p-5 text-white font-mono select-none">
      {/* Category Filter Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#F5A623]" />
            Director Title Presets ({filteredPresets.length})
          </label>
          <span className="text-[9px] text-zinc-400">1-CLICK OR DRAG MEDIA</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-black/50 border border-white/10 rounded-lg">
          {categoryChips.map(chip => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedCategory(chip.id)}
                className={
                  isActive
                    ? 'px-2.5 py-1 text-[10px] font-mono text-amber-300 border border-amber-500/50 bg-amber-500/10 rounded shadow-[0_0_8px_rgba(245,166,35,0.2)] cursor-pointer font-bold transition-all'
                    : 'px-2.5 py-1 text-[10px] font-mono text-white/50 border border-white/5 bg-white/[0.02] rounded hover:border-white/20 hover:text-white transition-all cursor-pointer'
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Cards Grid or Dopamine Engine Workspace */}
      {selectedCategory === 'dopamine' ? (
        <div className="space-y-4">
          {/* Dopamine Engine Header */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/40 to-cyan-950/40 border border-red-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold text-white tracking-wider uppercase">
                [ 🌪️ DOPAMINE ENGINE // VIRAL COMPILATION ]
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-400">
              TARGET: SH{String(activeShotIndex + 1).padStart(3, '0')}
            </span>
          </div>

          {/* Preset Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COMPILATION_PRESETS.map((preset) => {
              const isSelected = activeDopamineId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectDopaminePreset(preset)}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-400/50'
                      : 'bg-black/40 border-white/10 hover:border-white/20 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold truncate">{preset.name}</span>
                    <span 
                      className="text-[8px] px-1 py-0.2 rounded font-bold uppercase"
                      style={{ color: preset.accentColor, backgroundColor: `${preset.accentColor}20` }}
                    >
                      {preset.speed}x
                    </span>
                  </div>
                  <div className="text-[9px] text-zinc-400 truncate">{preset.hook}</div>
                  <div className="text-[8px] text-zinc-500 mt-1">Glitch: {preset.glitch}% • Strobe: {preset.strobeRate}ms</div>
                </button>
              );
            })}
          </div>

          {/* Live Dynamic Preview Canvas running DopamineCompilationSequence */}
          <div className="h-44 w-full rounded-xl bg-black border border-red-500/30 overflow-hidden relative shadow-[0_0_20px_rgba(255,0,85,0.15)] flex items-center justify-center">
            <DopamineCompilationSequence
              hookText={dopamineHook}
              subText={dopamineSub}
              glitchIntensity={dopamineGlitch}
              strobeRate={dopamineStrobe}
              motionSpeed={dopamineSpeed}
              accentColor={dopamineAccent}
              audioBeatSync={true}
              isPlaying={true}
              showTelemetry={true}
            />
          </div>

          {/* Interactive Strobe Slider */}
          <div className="space-y-1.5 p-3 rounded-lg bg-black/60 border border-red-500/20">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="dopamine-strobe-range"
                className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                <span>STROBE FREQUENCY RATE</span>
              </label>
              <span className="text-[10px] font-mono text-white font-bold bg-white/10 px-2 py-0.5 rounded border border-white/10">
                {dopamineStrobe} MS
              </span>
            </div>
            <input
              id="dopamine-strobe-range"
              type="range"
              min={20}
              max={200}
              step={5}
              value={dopamineStrobe}
              onChange={(e) => setDopamineStrobe(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-[8px] font-mono text-zinc-500">
              <span>HYPER-FAST (20ms)</span>
              <span>SYNCOPATED (100ms)</span>
              <span>HYPNOTIC (200ms)</span>
            </div>
          </div>

          {/* Direct Text Modifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Hook Word (Strobe/Slide)</label>
              <input
                type="text"
                value={dopamineHook}
                onChange={(e) => setDopamineHook(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                placeholder="HOOK TEXT"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">Sub Text (Kinetic Capsule)</label>
              <input
                type="text"
                value={dopamineSub}
                onChange={(e) => setDopamineSub(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                placeholder="SUB TEXT"
              />
            </div>
          </div>

          {/* Brutalist Apply Button */}
          <button
            type="button"
            onClick={handleApplyDopamineToFrame}
            className={`w-full py-2.5 px-4 font-mono font-bold text-xs uppercase tracking-widest transition-all cursor-pointer rounded-lg border flex items-center justify-center gap-2 ${
              appliedDopamineSuccess
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                : 'bg-red-950/70 hover:bg-red-600 border-red-500/50 hover:border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            }`}
          >
            {appliedDopamineSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>✓ APPLIED TO SHOT SH{String(activeShotIndex + 1).padStart(3, '0')}!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current text-yellow-300" />
                <span>[ ⚡ APPLY DOPAMINE SEQUENCE TO FRAME ]</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPresets.map((preset) => {
          const isHovered = hoveredPresetId === preset.id;
          const isApplied = appliedPresetId === preset.id;
          const isDragOver = dragOverPresetId === preset.id;
          const isBoundSuccess = boundSuccessPresetId === preset.id;

          return (
            <div
              key={preset.id}
              onMouseEnter={() => setHoveredPresetId(preset.id)}
              onMouseLeave={() => setHoveredPresetId(null)}
              onClick={() => handleApply(preset)}
              onDragOver={(e) => handleDragOver(e, preset.id)}
              onDragLeave={(e) => handleDragLeave(e, preset.id)}
              onDrop={(e) => handleDropAssetOnPreset(e, preset)}
              className={`group relative p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden backdrop-blur-md ${
                isBoundSuccess
                  ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/50'
                  : isDragOver
                  ? 'border-amber-400 border-dashed bg-amber-500/10 scale-[1.02] shadow-[0_0_15px_rgba(245,166,35,0.3)] transition-all duration-150'
                  : isApplied
                  ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[0.99]'
                  : isHovered
                  ? 'bg-[#151620] border-[#F5A623] shadow-[0_0_24px_rgba(245,166,35,0.25)] translate-y-[-1px]'
                  : 'bg-black/60 border-white/10 hover:border-white/20'
              }`}
            >
              {/* Drag-Over Drop Target Overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-amber-400 rounded-xl p-3 text-center pointer-events-none animate-in fade-in duration-150">
                  <span className="text-[10px] font-mono font-bold text-amber-300 tracking-wider">
                    [ ⬇ DROP TO BIND ASSET & APPLY TO SLIDE ]
                  </span>
                  <span className="text-[8.5px] font-mono text-zinc-400 mt-1">
                    Binds to Shot SH{String(activeShotIndex + 1).padStart(3, '0')}
                  </span>
                </div>
              )}

              {/* Bound Success Overlay */}
              {isBoundSuccess && (
                <div className="absolute inset-0 z-40 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-emerald-400 rounded-xl p-3 text-center pointer-events-none animate-in fade-in duration-150">
                  <span className="text-[11px] font-mono font-bold text-emerald-300 tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    ✓ BOUND ASSET & APPLIED PRESET!
                  </span>
                  <span className="text-[8.5px] font-mono text-emerald-200/80 mt-1">
                    Synced to Shot SH{String(activeShotIndex + 1).padStart(3, '0')} & IndexedDB
                  </span>
                </div>
              )}

              {/* Header: Name + Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-white group-hover:text-[#FFE066] transition-colors">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono">
                    {preset.position}
                  </span>
                  <span 
                    className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border"
                    style={{ 
                      backgroundColor: `${preset.color}15`, 
                      borderColor: `${preset.color}60`, 
                      color: preset.color 
                    }}
                  >
                    {preset.badge || preset.category}
                  </span>
                </div>
              </div>

              {/* Live Kinetic Typography Hover Preview Box */}
              <div 
                className="relative h-20 w-full rounded-lg bg-black/80 border border-white/5 flex flex-col items-center justify-center p-2 overflow-hidden transition-all duration-200 group-hover:bg-[#08080c]"
                style={{
                  boxShadow: isHovered ? `inset 0 0 20px ${preset.glowColor || 'rgba(245,166,35,0.2)'}` : 'none'
                }}
              >
                {/* Visual Position Bracket Indicators */}
                {preset.position === 'top' && (
                  <div className="absolute top-1 left-2 text-[8px] text-zinc-500 font-mono tracking-widest z-10">
                    ▲ TOP_ALIGN
                  </div>
                )}
                {preset.position === 'lower-third' && (
                  <div className="absolute bottom-1 left-2 text-[8px] text-zinc-500 font-mono tracking-widest z-10">
                    ▼ LOWER_THIRD
                  </div>
                )}

                {/* Optional Mock Background Image for Corporate Suites */}
                {preset.mockImage && (
                  <img
                    src={preset.mockImage}
                    alt={preset.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
                    loading="lazy"
                  />
                )}

                {/* Primary Title with Live Style */}
                <div
                  className={`relative z-10 text-center font-bold transition-all duration-200 leading-tight ${
                    isHovered ? 'scale-105' : 'scale-100'
                  }`}
                  style={{
                    fontFamily: preset.fontFamily,
                    color: preset.color,
                    letterSpacing: preset.letterSpacing || 'normal',
                    textShadow: isHovered && preset.glowColor ? `0 0 16px ${preset.glowColor}` : '0 1px 4px rgba(0,0,0,0.8)'
                  }}
                >
                  {preset.primaryText}
                </div>

                {/* Secondary Title / Subtitle */}
                {preset.secondaryText && (
                  <div
                    className="relative z-10 text-[9px] mt-1 text-center font-mono opacity-80 tracking-widest uppercase transition-opacity"
                    style={{ color: '#E4E4E7' }}
                  >
                    {preset.secondaryText}
                  </div>
                )}

                {/* Corporate Call To Action Badge */}
                {preset.callToAction && (
                  <div className="relative z-10 text-[8px] mt-0.5 text-center font-mono text-emerald-400 font-bold tracking-wider uppercase">
                    [ CTA: {preset.callToAction} ]
                  </div>
                )}

                {/* Live Animation Indicator Badge */}
                <div className="absolute bottom-1 right-2 text-[8px] text-zinc-500 font-mono z-10">
                  {preset.animationStyle}
                </div>
              </div>

              {/* Hover Quick Action Footer */}
              <div className="mt-2.5 flex items-center justify-between text-[9px] text-zinc-400">
                <span className="font-mono text-zinc-500">{preset.fontFamily.split(',')[0]}</span>
                <span className={`font-bold transition-colors ${isBoundSuccess ? 'text-emerald-400' : isApplied ? 'text-emerald-400' : 'group-hover:text-[#F5A623]'}`}>
                  {isBoundSuccess ? '✓ BOUND TO SHOT' : isApplied ? '✓ APPLIED TO SHOT' : 'Click to Apply or Drop Media →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Manual Fine-Tuning Sliders (Dynamic between Dopamine and Standard Typography) */}
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3 text-[#F5A623]" />
            {selectedCategory === 'dopamine' ? '🌪️ Dopamine Engine Parameters' : 'Fine-Tune Selected Typography'}
          </span>
          <span className="text-[9px] text-zinc-400 font-mono">0ms Sync</span>
        </div>

        {selectedCategory === 'dopamine' ? (
          <>
            {/* Dopamine Glitch Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-400" />
                  Glitch Intensity (Chromatic RGB Aberration)
                </span>
                <span className="text-red-400 font-mono font-bold">{dopamineGlitch}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={dopamineGlitch}
                onChange={(e) => setDopamineGlitch(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Dopamine Strobe Rate Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  Strobe Flash Rate (Initial Pulse)
                </span>
                <span className="text-yellow-400 font-mono font-bold">{dopamineStrobe}ms</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={dopamineStrobe}
                onChange={(e) => setDopamineStrobe(Number(e.target.value))}
                className="w-full accent-yellow-400 cursor-pointer"
              />
            </div>

            {/* Dopamine Motion Speed Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Motion Speed Multiplier (Kinetic Anamorphic Slide)
                </span>
                <span className="text-amber-400 font-mono font-bold">{dopamineSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.0}
                step={0.1}
                value={dopamineSpeed}
                onChange={(e) => setDopamineSpeed(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </>
        ) : (
          <>
            {/* Title Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Font Scale</span>
                <span className="text-[#FFE066] font-mono">{titleSize}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={2}
                value={titleSize}
                onChange={(e) => setTitleSize(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            {/* Glow Intensity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Anamorphic Glow</span>
                <span className="text-[#FFE066] font-mono">{Math.round(glowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={glowIntensity}
                onChange={(e) => setTitleGlowIntensity(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            {/* Letter Tracking Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Letter Tracking</span>
                <span className="text-[#FFE066] font-mono">{tracking.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.02}
                value={tracking}
                onChange={(e) => setTitleTracking(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            {/* Vertical Position Offset */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Vertical Offset</span>
                <span className="text-[#FFE066] font-mono">{verticalOffset}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                step={5}
                value={verticalOffset}
                onChange={(e) => setTitleVerticalOffset(Number(e.target.value))}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
