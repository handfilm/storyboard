/**
 * @file /src/components/drawers/TextTypographyDrawer.tsx
 * @description Master Cinematic Title & Motion Typography Drawer.
 * Features 10 production-ready Director presets with interactive hover previews,
 * 1-click slide application, and instant WebCodecs canvas integration.
 */

import React, { useState } from 'react';
import { AnthologyFrame } from '../../types/anthology';
import { useStudioStore, TitleAlign } from '../../core/store';
import { db } from '../../services/db';
import { eventBus } from '../../core/eventBus';
import { 
  CINEMATIC_TITLE_PRESETS, 
  TitleTemplatePreset, 
  applyTitleTemplateToFrame,
  buildTitlePresetConfig,
  buildDopamineTitlePresetConfig,
  stripDopamineDirectorNote,
  resolveShotTitlePresetConfig,
  resolveShotTitleData,
  PRO_TITLE_FONT_OPTIONS,
  DEFAULT_TITLE_KEYFRAMES,
  buildDefaultTitleLayers
} from '../../constants/titleTemplates';
import type {
  TitleEasingCurve,
  TitleKeyframeConfig,
  TitleLayerKey,
  TitleLayerStyle,
  TitleMotionAnimation,
  TitleStaggerMode
} from '../../types/titlePreset';
import { 
  COMPILATION_PRESETS, 
  CompilationPreset, 
  getCompilationPresetById 
} from '../../constants/compilationData';
import { applyTemplateToShot } from '../../core/store/timelineState';
import { DopamineCompilationSequence } from '../stage/templates/DopamineCompilationSequence';
import { BrutalistKineticHudStrip } from './BrutalistKineticHudStrip';
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
  RotateCcw,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { CinemaBadgeHeader, CinemaToolHUD } from '../ui/CinemaToolHUD';

export interface TextTypographyDrawerProps {
  currentFrame?: AnthologyFrame;
  onUpdateFrame?: (updated: AnthologyFrame) => void;
  onApplyPreset?: (preset: TitleTemplatePreset) => void;
  hideAutonomousStrip?: boolean;
}

export const TextTypographyDrawer: React.FC<TextTypographyDrawerProps> = ({
  currentFrame,
  onUpdateFrame,
  onApplyPreset,
  hideAutonomousStrip = false
}) => {
  const activeShotIndex = useStudioStore((s) => s.activeShotIndex);
  const targetShotIndex =
    typeof currentFrame?.id === 'number' && currentFrame.id >= 1
      ? currentFrame.id - 1
      : activeShotIndex;

  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const storeShot = useStudioStore((s) => s.project.shots?.[targetShotIndex]);
  const updateShotTitleData = useStudioStore((s) => s.updateShotTitleData);
  const copyTitleStyleToAllShots = useStudioStore((s) => s.copyTitleStyleToAllShots);

  const shotTitleData = resolveShotTitleData(currentFrame || storeShot, targetShotIndex, storeTitleConfig);
  const titleSize = shotTitleData.fontScale ?? 72;
  const glowIntensity = shotTitleData.glowIntensity ?? 1.0;
  const tracking = shotTitleData.letterTracking ?? 0.15;
  const verticalOffset = shotTitleData.verticalOffset ?? 0;

  const activePresetConfig = shotTitleData.styleConfig ?? resolveShotTitlePresetConfig(currentFrame || storeShot, storeTitleConfig);
  const activePresetId = shotTitleData.presetId || activePresetConfig.presetId;

  const [copiedAllSuccess, setCopiedAllSuccess] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'viral-hooks' | 'end-credits' | 'dopamine' | 'cinematic' | 'rap' | 'docu' | 'retro' | 'corporate'
  >('all');
  const [inspectorMode, setInspectorMode] = useState<'layers' | 'keyframes'>('layers');
  const [activeLayerTab, setActiveLayerTab] = useState<TitleLayerKey>('bangla');
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
  const [dopamineAudioBeatSync, setDopamineAudioBeatSync] = useState<boolean>(true);
  const [appliedDopamineSuccess, setAppliedDopamineSuccess] = useState<boolean>(false);

  const filteredPresets = selectedCategory === 'all'
    ? CINEMATIC_TITLE_PRESETS
    : CINEMATIC_TITLE_PRESETS.filter(p => p.category === selectedCategory);

  const categoryChips = [
    { id: 'all', label: `ALL (${CINEMATIC_TITLE_PRESETS.length})` },
    { id: 'viral-hooks', label: 'HOOKS' },
    { id: 'end-credits', label: 'CREDITS' },
    { id: 'dopamine', label: 'DOPAMINE' },
    { id: 'corporate', label: 'B2B' },
    { id: 'cinematic', label: 'CINEMA' },
    { id: 'rap', label: 'RAP' },
    { id: 'docu', label: 'DOCU' },
    { id: 'retro', label: 'RETRO' }
  ] as const;

  const resolvedLayers = buildDefaultTitleLayers(activePresetConfig, {
    ...(activePresetConfig.layers || {}),
    ...(shotTitleData.layers || {})
  });
  const activeLayerStyle: TitleLayerStyle = resolvedLayers[activeLayerTab] || {};
  const activeKeyframes: TitleKeyframeConfig = {
    ...DEFAULT_TITLE_KEYFRAMES,
    inAnim: activePresetConfig.motionAnimation || DEFAULT_TITLE_KEYFRAMES.inAnim,
    ...(activePresetConfig.keyframes || {}),
    ...(shotTitleData.keyframes || {})
  };

  const updateLayerStyle = (layerKey: TitleLayerKey, patch: Partial<TitleLayerStyle>) => {
    const nextLayers = {
      ...(shotTitleData.layers || {}),
      [layerKey]: {
        ...(resolvedLayers[layerKey] || {}),
        ...patch,
        plate: patch.plate
          ? { ...(resolvedLayers[layerKey]?.plate || {}), ...patch.plate }
          : resolvedLayers[layerKey]?.plate
      }
    };
    updateShotTitleData(targetShotIndex, { layers: nextLayers });
  };

  const updateKeyframeConfig = (patch: Partial<TitleKeyframeConfig>) => {
    const nextKeyframes: TitleKeyframeConfig = {
      ...activeKeyframes,
      ...patch
    };
    updateShotTitleData(targetShotIndex, {
      keyframes: nextKeyframes,
      entranceAnim: nextKeyframes.inAnim,
      exitAnim: nextKeyframes.outAnim
    });
  };

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
    const preset = getCompilationPresetById(activeDopamineId);
    const targetShotIndex =
      typeof currentFrame?.id === 'number' && currentFrame.id >= 1
        ? currentFrame.id - 1
        : activeShotIndex;

    // 1. Dispatch strictly scoped template update to timeline store (preserves media & duration)
    applyTemplateToShot(targetShotIndex, {
      presetId: activeDopamineId,
      presetName: preset.name,
      hookText: dopamineHook,
      subText: dopamineSub,
      glitchIntensity: dopamineGlitch,
      strobeRate: dopamineStrobe,
      motionSpeed: dopamineSpeed,
      accentColor: dopamineAccent,
      audioBeatSync: dopamineAudioBeatSync
    });

    // 2. Also sync via prop callback if parent passed currentFrame & onUpdateFrame
    if (currentFrame && onUpdateFrame) {
      const dopamineStyleConfig = buildDopamineTitlePresetConfig({
        presetId: activeDopamineId,
        presetName: preset.name,
        accentColor: dopamineAccent,
        glitchIntensity: dopamineGlitch
      });
      const updated: AnthologyFrame = {
        ...currentFrame,
        imageUrl: currentFrame.imageUrl,
        thumbnailUrl: currentFrame.thumbnailUrl,
        isVideo: currentFrame.isVideo,
        slideHoldSec: currentFrame.slideHoldSec,
        durationSec: currentFrame.durationSec,
        title: dopamineHook,
        tagline: dopamineSub,
        titleAnimation: 'kinetic',
        colorAccent: dopamineAccent,
        tags: Array.from(new Set([...(currentFrame.tags || []), 'dopamine', preset.id])),
        directorNotes: `[🌪️ DOPAMINE: ${preset.name}] Glitch: ${dopamineGlitch}%, Strobe: ${dopamineStrobe}ms, Speed: ${dopamineSpeed}x`,
        activeTitlePreset: activeDopamineId,
        titleStyleConfig: dopamineStyleConfig,
        dopamineConfig: {
          presetId: activeDopamineId,
          presetName: preset.name,
          hookText: dopamineHook,
          subText: dopamineSub,
          glitchIntensity: dopamineGlitch,
          strobeRate: dopamineStrobe,
          motionSpeed: dopamineSpeed,
          accentColor: dopamineAccent,
          audioBeatSync: dopamineAudioBeatSync
        },
        caption: {
          text: dopamineSub,
          style: 'rap_pop',
          color: dopamineAccent
        }
      };
      onUpdateFrame(updated);
    }

    setAppliedDopamineSuccess(true);
    setTimeout(() => {
      setAppliedDopamineSuccess(false);
    }, 1500);
  };

  const handleApply = (preset: TitleTemplatePreset) => {
    setAppliedPresetId(preset.id);
    setTimeout(() => setAppliedPresetId(null), 2000);

    if (onApplyPreset) {
      onApplyPreset(preset);
    }

    // Build complete, self-contained TitlePresetConfig for this preset
    const styleConfig = buildTitlePresetConfig(preset);

    // Sync ONLY this shot without overwriting other shots or existing shot media/duration
    const store = useStudioStore.getState();
    const existingShot = store.project.shots[targetShotIndex];
    const baseNotes = currentFrame?.directorNotes ?? existingShot?.directorNotes;
    const cleanedNotes = stripDopamineDirectorNote(baseNotes);
    const nextNotes = preset.callToAction
      ? `[CTA: ${preset.callToAction}] ${cleanedNotes}`.trim()
      : cleanedNotes;
    const cleanedTags = (currentFrame?.tags || existingShot?.tags || []).filter(
      (t) => t !== 'dopamine'
    );

    const hasOwnCustomText = Boolean(
      (shotTitleData.banglaTitle && shotTitleData.banglaTitle.trim()) ||
      (shotTitleData.englishSubtitle && shotTitleData.englishSubtitle.trim())
    );
    const nextBangla = hasOwnCustomText
      ? shotTitleData.banglaTitle
      : preset.bengaliText || currentFrame?.bengaliTitle || existingShot?.bengaliTitle || '';
    const nextEnglish = hasOwnCustomText
      ? shotTitleData.englishSubtitle
      : preset.primaryText;
    const nextCaption = hasOwnCustomText
      ? shotTitleData.captionNote
      : preset.secondaryText || currentFrame?.tagline || existingShot?.tagline || '';

    if (store.titleConfig?.heroGlobal) {
      store.setTitleConfig({
        activePresetConfig: styleConfig,
        titleSize: styleConfig.fontScale,
        glowIntensity: styleConfig.glowIntensity,
        tracking: styleConfig.letterTracking,
        verticalOffset: styleConfig.verticalOffset,
        showTitles: true
      });
    }

    const nextEyebrow = hasOwnCustomText
      ? shotTitleData.eyebrowText || ''
      : preset.eyebrowText || '';
    const nextCredits = hasOwnCustomText
      ? shotTitleData.creditsText || ''
      : preset.creditsText || '';

    const presetLayers = buildDefaultTitleLayers(styleConfig, styleConfig.layers);
    const presetKeyframes: TitleKeyframeConfig = {
      ...DEFAULT_TITLE_KEYFRAMES,
      inAnim: styleConfig.motionAnimation,
      ...(styleConfig.keyframes || {})
    };

    store.updateShotTitleData(targetShotIndex, {
      enabled: true,
      presetId: preset.id,
      eyebrowText: nextEyebrow,
      banglaTitle: nextBangla,
      englishSubtitle: nextEnglish,
      captionNote: nextCaption,
      creditsText: nextCredits,
      fontScale: styleConfig.fontScale,
      glowIntensity: styleConfig.glowIntensity,
      letterTracking: styleConfig.letterTracking,
      verticalOffset: styleConfig.verticalOffset,
      entranceAnim: presetKeyframes.inAnim,
      exitAnim: presetKeyframes.outAnim,
      layers: presetLayers,
      keyframes: presetKeyframes,
      styleConfig
    });

    store.updateShot(targetShotIndex, {
      directorNotes: nextNotes,
      tags: cleanedTags,
      colorAccent: preset.color,
      titleAnimation: preset.animationStyle,
      dopamineConfig: undefined
    });

    if (currentFrame && onUpdateFrame) {
      const updated = applyTitleTemplateToFrame(currentFrame, preset, styleConfig, {
        preserveCustomText: hasOwnCustomText
      });
      updated.directorNotes = nextNotes;
      updated.tags = cleanedTags;
      onUpdateFrame(updated);
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

    // (b) Update local studio store shot strictly scoped to targetShotIndex
    const store = useStudioStore.getState();
    const currentShot = store.project.shots[targetShotIndex] || {};
    const styleConfig = buildTitlePresetConfig(preset);
    const updatedShotPartial: any = {
      title: preset.primaryText,
      bengaliTitle: preset.bengaliText || currentShot.bengaliTitle || 'দৃষ্টির সীমানা',
      tagline: preset.secondaryText || currentShot.tagline,
      titleAnimation: preset.animationStyle,
      dopamineConfig: undefined,
      activeTitlePreset: preset.id,
      titleStyleConfig: styleConfig
    };
    if (mediaUrl) {
      updatedShotPartial.imageUrl = mediaUrl;
      updatedShotPartial.isVideo = isVideo;
    }
    store.updateShotTitleData(targetShotIndex, {
      enabled: true,
      presetId: preset.id,
      banglaTitle: updatedShotPartial.bengaliTitle,
      englishSubtitle: updatedShotPartial.title,
      captionNote: updatedShotPartial.tagline || '',
      fontScale: styleConfig.fontScale,
      glowIntensity: styleConfig.glowIntensity,
      letterTracking: styleConfig.letterTracking,
      verticalOffset: styleConfig.verticalOffset,
      styleConfig
    });
    if (mediaUrl) {
      store.updateShot(targetShotIndex, {
        imageUrl: mediaUrl,
        isVideo
      });
    }

    // (c) Apply preset typography & styles to active frame
    const baseFrame: AnthologyFrame = currentFrame || {
      id: targetShotIndex + 1,
      epNumber: String(targetShotIndex + 1).padStart(3, '0'),
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

    const updatedFrame = applyTitleTemplateToFrame(baseFrame, preset, styleConfig);
    if (mediaUrl) {
      updatedFrame.imageUrl = mediaUrl;
      updatedFrame.isVideo = isVideo;
    }

    if (onUpdateFrame) {
      onUpdateFrame(updatedFrame);
    } else {
      eventBus.emit('shot:updated', {
        index: targetShotIndex,
        partial: {
          ...updatedShotPartial,
          titleData: updatedFrame.titleData
        }
      });
    }
    if (onApplyPreset) {
      onApplyPreset(preset);
    }

    if (mediaUrl) {
      eventBus.emit('asset_assigned_to_shot', {
        assetId: assetId || `temp-${Date.now()}`,
        shotIndex: targetShotIndex,
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

  const handleCopyStyleToAll = () => {
    copyTitleStyleToAllShots(targetShotIndex);
    setCopiedAllSuccess(true);
    window.setTimeout(() => setCopiedAllSuccess(false), 1800);
  };

  return (
    <div className="w-full flex flex-col space-y-5 p-4 sm:p-5 text-white font-mono select-none">
      {!hideAutonomousStrip && <BrutalistKineticHudStrip />}

      {/* Per-Shot Isolated Title Inspector + Copy Style To All Action */}
      <div className="p-3 rounded-xl bg-[#0D0E12] border border-[#26282E] space-y-2.5">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <CinemaBadgeHeader
              icon={<Type className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label={`SH${String(targetShotIndex + 1).padStart(3, '0')} TITLE`}
              accent="amber"
            />
          </div>
          <CinemaToolHUD
            title="SHOT TITLE VISIBILITY"
            en="Toggles title overlay visibility strictly for the active shot."
            bn="শুধুমাত্র এই শটের টাইটেল দেখা বা লুকাতে চাপুন।"
            accent="amber"
          >
            <button
              type="button"
              data-testid="toggle-shot-title-btn"
              data-active={shotTitleData.enabled ? 'true' : 'false'}
              onClick={() => updateShotTitleData(targetShotIndex, { enabled: !shotTitleData.enabled })}
              className="cinema-tile cinema-tile-amber px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer shrink-0"
            >
              {shotTitleData.enabled ? <Eye className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} /> : <EyeOff className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />}
              <span>{shotTitleData.enabled ? 'ON' : 'OFF'}</span>
            </button>
          </CinemaToolHUD>
        </div>

        {/* Direct Bangla Title & English Subtitle Inputs scoped to this shot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            aria-label="Shot Bangla Title"
            value={shotTitleData.banglaTitle}
            onChange={(e) => updateShotTitleData(targetShotIndex, { banglaTitle: e.target.value })}
            placeholder="বাংলা শিরোনাম..."
            className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/10 focus:border-[#F59E0B] text-xs font-bangla font-bold text-[#FFE066] outline-none"
          />
          <input
            type="text"
            aria-label="Shot English Subtitle"
            value={shotTitleData.englishSubtitle}
            onChange={(e) => updateShotTitleData(targetShotIndex, { englishSubtitle: e.target.value })}
            placeholder="ENGLISH SUBTITLE..."
            className="w-full px-2.5 py-1.5 rounded bg-black/70 border border-white/10 focus:border-[#F59E0B] text-[11px] font-mono font-bold text-white uppercase outline-none"
          />
        </div>

        {/* Pro 06 Super Title Studio Sub-Inspector: 5 Layers & IN/MID/OUT Keyframes */}
        <div className="pt-1.5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-black/70 p-0.5 rounded-md border border-[#26282E]">
              <CinemaToolHUD
                title="5-LAYER TITLE STUDIO"
                en="Edits eyebrow, Bangla, English, subtitle, and credits layers individually."
                bn="৫টি আলাদা টেক্সট লেয়ার (বাংলা, ইংরেজি, ক্রেডিট) সাজাতে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  data-active={inspectorMode === 'layers' ? 'true' : 'false'}
                  onClick={() => setInspectorMode('layers')}
                  className="cinema-tile cinema-tile-amber px-2.5 py-1 rounded-[4px] text-[9.5px] font-black tracking-wider uppercase cursor-pointer whitespace-nowrap"
                >
                  5-LAYER
                </button>
              </CinemaToolHUD>
              <CinemaToolHUD
                title="IN / MID / OUT KEYFRAMES"
                en="Controls entrance, ambient loop, exit motion, and easing curves."
                bn="টাইটেল ঢোকা ও বের হওয়ার অ্যানিমেশন স্পিড সেট করতে চাপুন।"
                accent="cyan"
              >
                <button
                  type="button"
                  data-active={inspectorMode === 'keyframes' ? 'true' : 'false'}
                  onClick={() => setInspectorMode('keyframes')}
                  className="cinema-tile cinema-tile-cyan px-2.5 py-1 rounded-[4px] text-[9.5px] font-black tracking-wider uppercase cursor-pointer whitespace-nowrap"
                >
                  KEYFRAMES
                </button>
              </CinemaToolHUD>
            </div>
            <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-wider tabular-nums">
              {activeKeyframes.staggerMode.toUpperCase()}
            </span>
          </div>

          {inspectorMode === 'layers' ? (
            <div className="space-y-2 bg-black/40 border border-white/10 rounded-lg p-2">
              <div className="grid grid-cols-5 gap-1">
                {(
                  [
                    { id: 'eyebrow', label: 'EYEBROW' },
                    { id: 'bangla', label: 'BANGLA' },
                    { id: 'english', label: 'ENGLISH' },
                    { id: 'subtitle', label: 'SUBTITLE' },
                    { id: 'credits', label: 'CREDITS' }
                  ] as const
                ).map((layer) => {
                  const isSel = activeLayerTab === layer.id;
                  const isEnabled = resolvedLayers[layer.id]?.enabled !== false;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      data-active={isSel ? 'true' : 'false'}
                      onClick={() => setActiveLayerTab(layer.id)}
                      className={`cinema-tile cinema-tile-amber py-1 px-1 rounded text-[9px] font-black tracking-wider uppercase truncate cursor-pointer ${
                        !isSel && !isEnabled ? 'opacity-50' : ''
                      }`}
                    >
                      {layer.label}
                    </button>
                  );
                })}
              </div>

              {/* Layer Text Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  aria-label={`Layer Text ${activeLayerTab}`}
                  value={
                    activeLayerTab === 'eyebrow'
                      ? shotTitleData.eyebrowText || ''
                      : activeLayerTab === 'bangla'
                      ? shotTitleData.banglaTitle
                      : activeLayerTab === 'english'
                      ? shotTitleData.englishSubtitle
                      : activeLayerTab === 'subtitle'
                      ? shotTitleData.captionNote || ''
                      : shotTitleData.creditsText || ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeLayerTab === 'eyebrow') updateShotTitleData(targetShotIndex, { eyebrowText: val });
                    else if (activeLayerTab === 'bangla') updateShotTitleData(targetShotIndex, { banglaTitle: val });
                    else if (activeLayerTab === 'english') updateShotTitleData(targetShotIndex, { englishSubtitle: val });
                    else if (activeLayerTab === 'subtitle') updateShotTitleData(targetShotIndex, { captionNote: val });
                    else updateShotTitleData(targetShotIndex, { creditsText: val });
                  }}
                  placeholder={
                    activeLayerTab === 'eyebrow'
                      ? 'EPISODE 01 // SCENE BEAT...'
                      : activeLayerTab === 'credits'
                      ? 'DIRECTED BY // CINEMATOGRAPHY...'
                      : activeLayerTab === 'subtitle'
                      ? 'Subtitle or dialogue note...'
                      : 'Layer text...'
                  }
                  className="flex-1 min-w-0 px-2 py-1 rounded bg-black/80 border border-white/10 focus:border-[#F59E0B] text-[10.5px] text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateLayerStyle(activeLayerTab, { enabled: activeLayerStyle.enabled === false })
                  }
                  className={`px-2 py-1 rounded text-[8.5px] font-bold border cursor-pointer shrink-0 ${
                    activeLayerStyle.enabled !== false
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900 border-white/10 text-zinc-500'
                  }`}
                >
                  {activeLayerStyle.enabled !== false ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Font + Transform + Colors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <select
                  aria-label="Layer Font Family"
                  value={activeLayerStyle.fontFamily || PRO_TITLE_FONT_OPTIONS[0].value}
                  onChange={(e) => updateLayerStyle(activeLayerTab, { fontFamily: e.target.value })}
                  className="col-span-2 bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9.5px] text-zinc-200 outline-none focus:border-[#F59E0B]"
                >
                  {PRO_TITLE_FONT_OPTIONS.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Layer Text Transform"
                  value={activeLayerStyle.textTransform || 'none'}
                  onChange={(e) =>
                    updateLayerStyle(activeLayerTab, {
                      textTransform: e.target.value as TitleLayerStyle['textTransform']
                    })
                  }
                  className="bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9.5px] text-zinc-200 outline-none focus:border-[#F59E0B]"
                >
                  <option value="none">As Typed</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                </select>
                <div className="flex items-center gap-1 bg-black/80 border border-white/10 rounded px-1.5 py-0.5">
                  <span className="text-[8px] text-zinc-400">COLOR</span>
                  <input
                    type="color"
                    aria-label="Layer Color"
                    value={activeLayerStyle.color || '#F5A623'}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { color: e.target.value })}
                    className="w-5 h-4 bg-transparent border-0 cursor-pointer ml-auto"
                  />
                </div>
              </div>

              {/* Size, Weight, Tracking, Stroke */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8.5px] text-zinc-400">
                <div>
                  <div className="flex justify-between tabular-nums">
                    <span>SIZE</span>
                    <span className="text-[#FFE066]">{Math.round(activeLayerStyle.fontSize ?? 32)}px</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={160}
                    value={activeLayerStyle.fontSize ?? 32}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { fontSize: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between tabular-nums">
                    <span>WEIGHT</span>
                    <span className="text-[#FFE066]">{activeLayerStyle.fontWeight ?? 700}</span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={900}
                    step={100}
                    value={activeLayerStyle.fontWeight ?? 700}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { fontWeight: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between tabular-nums">
                    <span>TRACKING</span>
                    <span className="text-[#FFE066]">{(activeLayerStyle.letterSpacing ?? 0.1).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-0.05}
                    max={0.5}
                    step={0.02}
                    value={activeLayerStyle.letterSpacing ?? 0.1}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { letterSpacing: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between tabular-nums">
                    <span>BLOOM</span>
                    <span className="text-[#FFE066]">{Math.round((activeLayerStyle.bloomIntensity ?? 0.4) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={activeLayerStyle.bloomIntensity ?? 0.4}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { bloomIntensity: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 text-[8.5px]">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">STROKE:</span>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.5}
                    value={activeLayerStyle.strokeWidth ?? 0}
                    onChange={(e) => updateLayerStyle(activeLayerTab, { strokeWidth: Number(e.target.value) })}
                    className="w-20 accent-[#F5A623] cursor-pointer"
                  />
                  <span className="text-zinc-300 tabular-nums">{activeLayerStyle.strokeWidth ?? 0}px</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateLayerStyle(activeLayerTab, {
                      plate: {
                        enabled: !activeLayerStyle.plate?.enabled
                      }
                    })
                  }
                  className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase cursor-pointer ${
                    activeLayerStyle.plate?.enabled
                      ? 'bg-[#F59E0B]/20 border-[#F59E0B]/60 text-[#F59E0B]'
                      : 'bg-black/60 border-white/10 text-zinc-400'
                  }`}
                >
                  PLATE {activeLayerStyle.plate?.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 bg-black/40 border border-white/10 rounded-lg p-2 text-[9px]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <label className="space-y-0.5">
                  <span className="text-[8px] text-zinc-400 uppercase block">IN MOTION</span>
                  <select
                    aria-label="In Animation"
                    value={activeKeyframes.inAnim}
                    onChange={(e) =>
                      updateKeyframeConfig({ inAnim: e.target.value as TitleMotionAnimation })
                    }
                    className="w-full bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9.5px] text-amber-300 outline-none focus:border-[#F59E0B]"
                  >
                    <option value="slow-cinema-fade">Slow Cinema Fade</option>
                    <option value="kinetic-slam">Kinetic Slam</option>
                    <option value="3d-flip">3D Flip</option>
                    <option value="anamorphic-sweep">Anamorphic Sweep</option>
                    <option value="glitch-slice">Glitch Slice</option>
                    <option value="typewriter-telemetry">Typewriter Telemetry</option>
                    <option value="cinema-credit-crawl">Cinema Credit Crawl</option>
                    <option value="viral-pop-bounce">Viral Pop Bounce</option>
                    <option value="subtle-depth-drift">Subtle Depth Drift</option>
                    <option value="neon-glitch-rgb">Neon Glitch RGB</option>
                    <option value="chopper-staccato">Chopper Staccato</option>
                    <option value="lower-third-slide">Lower-Third Slide</option>
                    <option value="typewriter-hud">Typewriter HUD</option>
                  </select>
                </label>

                <label className="space-y-0.5">
                  <span className="text-[8px] text-zinc-400 uppercase block">MID AMBIENT</span>
                  <select
                    aria-label="Mid Loop Animation"
                    value={activeKeyframes.midAnim}
                    onChange={(e) =>
                      updateKeyframeConfig({
                        midAnim: e.target.value as TitleKeyframeConfig['midAnim']
                      })
                    }
                    className="w-full bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9.5px] text-zinc-200 outline-none focus:border-[#F59E0B]"
                  >
                    <option value="none">Static Hold</option>
                    <option value="subtle-depth-drift">Subtle Depth Drift</option>
                    <option value="viral-pop-bounce">Pulse Pop</option>
                    <option value="cinema-credit-crawl">Credit Crawl</option>
                    <option value="neon-glitch-rgb">RGB Glitch</option>
                    <option value="chopper-staccato">Chopper Staccato</option>
                  </select>
                </label>

                <label className="space-y-0.5">
                  <span className="text-[8px] text-zinc-400 uppercase block">OUT EXIT</span>
                  <select
                    aria-label="Out Exit Animation"
                    value={activeKeyframes.outAnim}
                    onChange={(e) =>
                      updateKeyframeConfig({
                        outAnim: e.target.value as TitleKeyframeConfig['outAnim']
                      })
                    }
                    className="w-full bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9.5px] text-zinc-200 outline-none focus:border-[#F59E0B]"
                  >
                    <option value="dissolve-out">Dissolve Out</option>
                    <option value="slide-out">Slide Out</option>
                    <option value="glitch-slice">Glitch Cut</option>
                    <option value="3d-flip">3D Fold Out</option>
                    <option value="none">Hard Cut</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <div className="flex justify-between text-[8px] text-zinc-400 tabular-nums">
                    <span>DURATION</span>
                    <span className="text-[#FFE066]">{activeKeyframes.durationSec.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2.5}
                    step={0.05}
                    value={activeKeyframes.durationSec}
                    onChange={(e) => updateKeyframeConfig({ durationSec: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[8px] text-zinc-400 tabular-nums">
                    <span>DELAY</span>
                    <span className="text-[#FFE066]">{activeKeyframes.delaySec.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2.0}
                    step={0.05}
                    value={activeKeyframes.delaySec}
                    onChange={(e) => updateKeyframeConfig({ delaySec: Number(e.target.value) })}
                    className="w-full accent-[#F5A623] cursor-pointer"
                  />
                </div>
                <label className="space-y-0.5">
                  <span className="text-[8px] text-zinc-400 uppercase block">EASING</span>
                  <select
                    aria-label="Keyframe Easing"
                    value={activeKeyframes.easingCurve}
                    onChange={(e) =>
                      updateKeyframeConfig({ easingCurve: e.target.value as TitleEasingCurve })
                    }
                    className="w-full bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9px] text-zinc-200 outline-none"
                  >
                    <option value="cubic-out">Cubic Out</option>
                    <option value="spring-overshoot">Spring Overshoot</option>
                    <option value="linear-hud">Linear HUD</option>
                    <option value="whip-slam">Whip Slam</option>
                  </select>
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] text-zinc-400 uppercase block">STAGGER</span>
                  <select
                    aria-label="Stagger Mode"
                    value={activeKeyframes.staggerMode}
                    onChange={(e) =>
                      updateKeyframeConfig({ staggerMode: e.target.value as TitleStaggerMode })
                    }
                    className="w-full bg-black/80 border border-white/10 rounded px-1.5 py-1 text-[9px] text-zinc-200 outline-none"
                  >
                    <option value="block">Block</option>
                    <option value="word">Word</option>
                    <option value="char">Char (Bangla Safe)</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Per-Shot Alignment + Copy Style to All Shots */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 bg-black/60 border border-[#26282E] rounded-md p-0.5">
            {(['LEFT', 'MID', 'RIGHT', 'AUTO'] as TitleAlign[]).map((align) => (
              <CinemaToolHUD
                key={align}
                title={`ALIGN ${align}`}
                en={`Aligns shot title choreography to ${align}.`}
                bn={`শটের টাইটেল পজিশন ${align} করতে চাপুন।`}
                accent="amber"
              >
                <button
                  type="button"
                  data-active={shotTitleData.alignment === align ? 'true' : 'false'}
                  onClick={() => updateShotTitleData(targetShotIndex, { alignment: align })}
                  className="cinema-tile cinema-tile-amber px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-wider cursor-pointer"
                >
                  {align}
                </button>
              </CinemaToolHUD>
            ))}
          </div>

          <CinemaToolHUD
            title="SYNC STYLE TO ALL SHOTS"
            en="Copies active preset, fonts, glow, and alignment across every shot."
            bn="এই শটের টাইটেল ডিজাইন ও ফন্ট স্টাইল সবগুলো শটে কপি করতে চাপুন।"
            accent="emerald"
          >
            <button
              type="button"
              data-testid="copy-style-to-all-btn"
              data-active={copiedAllSuccess ? 'true' : 'false'}
              onClick={handleCopyStyleToAll}
              className="cinema-tile cinema-tile-emerald px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 cursor-pointer"
            >
              {copiedAllSuccess ? <Check className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} /> : <Copy className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />}
              <span>{copiedAllSuccess ? 'SYNCED' : 'COPY ALL'}</span>
            </button>
          </CinemaToolHUD>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <CinemaBadgeHeader
            icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />}
            label={`PRESETS (${filteredPresets.length})`}
            accent="amber"
          />
          <span className="text-[9px] font-black tracking-wider uppercase text-zinc-500">TAP / DROP</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 bg-black/50 border border-[#26282E] rounded-lg">
          {categoryChips.map(chip => {
            const isActive = selectedCategory === chip.id;
            return (
              <CinemaToolHUD
                key={chip.id}
                title={`CATEGORY: ${chip.label}`}
                en={`Filters title presets to ${chip.label} templates.`}
                bn={`${chip.label} ক্যাটাগরির টাইটেল ডিজাইন দেখতে চাপুন।`}
                accent={chip.id === 'dopamine' ? 'crimson' : 'amber'}
              >
                <button
                  type="button"
                  data-active={isActive ? 'true' : 'false'}
                  onClick={() => setSelectedCategory(chip.id)}
                  className={`cinema-tile ${chip.id === 'dopamine' ? 'cinema-tile-crimson' : 'cinema-tile-amber'} px-2.5 py-1 text-[10px] font-black tracking-wider uppercase rounded-md cursor-pointer`}
                >
                  {chip.label}
                </button>
              </CinemaToolHUD>
            );
          })}
        </div>
      </div>

      {/* Preset Cards Grid or Dopamine Engine Workspace */}
      {selectedCategory === 'dopamine' ? (
        <div className="space-y-4">
          {/* Dopamine Engine Header */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-purple-950/40 to-cyan-950/40 border border-red-500/30 flex items-center justify-between">
            <CinemaBadgeHeader
              icon={<Flame className="w-3.5 h-3.5" strokeWidth={2.2} />}
              label="DOPAMINE FX"
              accent="crimson"
            />
            <span className="text-[9px] font-black font-mono text-zinc-300">
              SH{String(activeShotIndex + 1).padStart(3, '0')}
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
              audioBeatSync={dopamineAudioBeatSync}
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

          {/* Audio Beat Reactivity & Motion Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDopamineAudioBeatSync(!dopamineAudioBeatSync)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                dopamineAudioBeatSync
                  ? 'bg-red-950/60 border-red-500/60 text-white shadow-[0_0_15px_rgba(239,68,68,0.25)]'
                  : 'bg-black/50 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold tracking-wider uppercase">AUDIO BEAT SYNC</span>
                <span className={`w-2 h-2 rounded-full ${dopamineAudioBeatSync ? 'bg-red-400 animate-pulse shadow-[0_0_8px_#ef4444]' : 'bg-zinc-600'}`} />
              </div>
              <span className="text-[10px] font-bold font-mono mt-1">
                {dopamineAudioBeatSync ? '⚡ 130 BPM LOCKED' : 'FREE RUNNING'}
              </span>
            </button>

            <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 uppercase">
                <span>MOTION SPEED</span>
                <span className="text-white font-bold">{dopamineSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={dopamineSpeed}
                onChange={(e) => setDopamineSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-red-500 mt-1"
              />
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
          <CinemaToolHUD
            title="APPLY DOPAMINE SEQUENCE"
            en="Applies high-energy strobe & chromatic kinetic overlay to active frame."
            bn="বর্তমান ফ্রেমে হাই-স্পিড ডোপামিন স্ট্রোব ও গ্লিচ টাইটেল বসাতে চাপুন।"
            accent="crimson"
            blockWrapper
          >
            <button
              type="button"
              onClick={handleApplyDopamineToFrame}
              data-active={appliedDopamineSuccess ? 'true' : 'false'}
              className="cinema-tile cinema-tile-crimson w-full py-2.5 px-4 font-mono font-black text-[11px] uppercase tracking-wider cursor-pointer rounded-lg flex items-center justify-center gap-2"
            >
              {appliedDopamineSuccess ? (
                <>
                  <Check className="w-4 h-4 cinema-tile-icon" strokeWidth={2.2} />
                  <span>APPLIED</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 cinema-tile-icon fill-current" strokeWidth={2.2} />
                  <span>APPLY DOPAMINE</span>
                </>
              )}
            </button>
          </CinemaToolHUD>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPresets.map((preset) => {
          const isHovered = hoveredPresetId === preset.id;
          const isApplied = appliedPresetId === preset.id;
          const isSelectedOnStage = activePresetId === preset.id;
          const isDragOver = dragOverPresetId === preset.id;
          const isBoundSuccess = boundSuccessPresetId === preset.id;
          const cardConfig = buildTitlePresetConfig(preset);

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
                  : isApplied || isSelectedOnStage
                  ? 'bg-[#12131B] border-[#F59E0B] shadow-[0_0_20px_rgba(245,158,11,0.28)] ring-1 ring-[#F59E0B]/40'
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

              {/* Header: Name + Layout & Category Badges */}
              <div className="flex items-center justify-between mb-2 gap-1">
                <span className="text-[11px] font-bold tracking-wider text-white group-hover:text-[#FFE066] transition-colors truncate">
                  {preset.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-mono uppercase">
                    {cardConfig.layoutMode}
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

              {/* Live Layout-Accurate Typography Hover Preview Box */}
              <div 
                className="relative h-20 w-full rounded-lg bg-black/80 border border-white/5 flex flex-col items-center justify-center p-2 overflow-hidden transition-all duration-200 group-hover:bg-[#08080c]"
                style={{
                  boxShadow: isHovered ? `inset 0 0 20px ${cardConfig.glowColor}` : 'none'
                }}
              >
                {preset.mockImage && (
                  <img
                    src={preset.mockImage}
                    alt={preset.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-35 transition-opacity pointer-events-none"
                    loading="lazy"
                  />
                )}

                <div
                  className={`relative z-10 flex flex-col ${
                    cardConfig.layoutMode === 'lower-third-bar'
                      ? 'self-start items-start text-left pl-2.5 border-l-2'
                      : 'items-center text-center'
                  } ${cardConfig.backdropPlate.enabled ? 'px-2.5 py-1 rounded-xs' : ''}`}
                  style={{
                    background: cardConfig.backdropPlate.enabled ? cardConfig.backdropPlate.background : 'transparent',
                    borderColor:
                      cardConfig.layoutMode === 'lower-third-bar'
                        ? cardConfig.backdropPlate.accentBarColor || cardConfig.primaryColor
                        : undefined,
                    border:
                      cardConfig.layoutMode !== 'lower-third-bar' && cardConfig.backdropPlate.enabled
                        ? cardConfig.backdropPlate.border
                        : undefined
                  }}
                >
                  <div
                    className={`font-bold transition-all duration-200 leading-tight ${
                      isHovered ? 'scale-105' : 'scale-100'
                    }`}
                    style={{
                      fontFamily: cardConfig.englishFontFamily,
                      color: cardConfig.primaryColor,
                      letterSpacing: `${cardConfig.letterTracking}em`,
                      WebkitTextStroke:
                        cardConfig.strokeWidth > 0 ? `0.5px ${cardConfig.strokeColor}` : undefined,
                      textShadow: isHovered ? `0 0 14px ${cardConfig.glowColor}` : '0 1px 4px rgba(0,0,0,0.85)'
                    }}
                  >
                    {preset.primaryText}
                  </div>

                  {preset.secondaryText && (
                    <div
                      className="text-[9px] mt-0.5 tracking-widest uppercase opacity-85"
                      style={{
                        fontFamily: cardConfig.englishFontFamily,
                        color: cardConfig.secondaryColor
                      }}
                    >
                      {preset.secondaryText}
                    </div>
                  )}
                </div>

                {preset.callToAction && (
                  <div className="relative z-10 text-[8px] mt-0.5 text-center font-mono text-emerald-400 font-bold tracking-wider uppercase">
                    [ CTA: {preset.callToAction} ]
                  </div>
                )}

                <div className="absolute bottom-1 right-2 text-[8px] text-zinc-500 font-mono z-10">
                  {cardConfig.motionAnimation}
                </div>
              </div>

              {/* Hover Quick Action Footer */}
              <div className="mt-2.5 flex items-center justify-between text-[9px] text-zinc-400">
                <span className="font-mono text-zinc-500 truncate max-w-[140px]">
                  {cardConfig.englishFontFamily.split(',')[0].replace(/"/g, '')}
                </span>
                <span className={`font-black tracking-wider uppercase transition-colors ${isBoundSuccess ? 'text-emerald-400' : isApplied || isSelectedOnStage ? 'text-[#F59E0B]' : 'group-hover:text-[#F5A623]'}`}>
                  {isBoundSuccess ? '✓ BOUND' : isApplied ? '✓ APPLIED' : isSelectedOnStage ? '● ACTIVE' : 'APPLY'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Manual Fine-Tuning Sliders */}
      <div className="p-4 rounded-xl bg-black/60 border border-[#26282E] space-y-3.5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <CinemaBadgeHeader
            icon={<SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />}
            label={selectedCategory === 'dopamine' ? 'DOPAMINE TUNING' : 'TYPE TUNING'}
            accent={selectedCategory === 'dopamine' ? 'crimson' : 'amber'}
          />
          <span className="text-[9px] text-emerald-400 font-black tracking-wider uppercase font-mono">LIVE</span>
        </div>

        {selectedCategory === 'dopamine' ? (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-red-400" />
                  GLITCH
                </span>
                <span className="text-red-400 font-mono">{dopamineGlitch}%</span>
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

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  STROBE
                </span>
                <span className="text-yellow-400 font-mono">{dopamineStrobe}ms</span>
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

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  SPEED
                </span>
                <span className="text-amber-400 font-mono">{dopamineSpeed.toFixed(1)}x</span>
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
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span>SCALE</span>
                <span className="text-[#FFE066] font-mono tabular-nums">{titleSize}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={2}
                value={titleSize}
                onChange={(e) => updateShotTitleData(targetShotIndex, { fontScale: Number(e.target.value) })}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span>GLOW</span>
                <span className="text-[#FFE066] font-mono tabular-nums">{Math.round(glowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={glowIntensity}
                onChange={(e) => updateShotTitleData(targetShotIndex, { glowIntensity: Number(e.target.value) })}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span>TRACKING</span>
                <span className="text-[#FFE066] font-mono tabular-nums">{tracking.toFixed(2)}em</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.02}
                value={tracking}
                onChange={(e) => updateShotTitleData(targetShotIndex, { letterTracking: Number(e.target.value) })}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-zinc-300 font-black tracking-wider uppercase">
                <span>OFFSET Y</span>
                <span className="text-[#FFE066] font-mono tabular-nums">{verticalOffset}px</span>
              </div>
              <input
                type="range"
                min={-120}
                max={120}
                step={5}
                value={verticalOffset}
                onChange={(e) => updateShotTitleData(targetShotIndex, { verticalOffset: Number(e.target.value) })}
                className="w-full accent-[#F5A623] cursor-pointer"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
