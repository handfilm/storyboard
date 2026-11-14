/**
 * @file /src/components/StageTextOverlay.tsx
 * @description Master Unified Stage Typography & Preset Compositor Overlay.
 *
 * Driven by a single source of truth (`TitlePresetConfig`) resolved per-shot with
 * real-time slider synchronization from `useStudioStore`:
 * - Supports all 6 distinct layout modes:
 *   `center-hero`, `lower-third-bar`, `hud-bracket`, `brutalist-box`, `editorial-split`, `minimal-whisper`
 * - Renders authentic preset typography (Bangla + English fonts), solid/gradient fills,
 *   vector strokes, volumetric glow, translucent backdrop plates, RGB chromatic split,
 *   and keyframed motion entrances.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  useStudioStore,
  HeroTitlePreset,
  TitleAlign,
  resolveEffectiveTitleAlign
} from '../core/store';
import { ComponentVisibility, applyTitleBlockOpacityCssVar } from './ComponentsMatrixPopover';
import { useTitleContainerRepaint } from '../hooks/useTitleContainerRepaint';
import { getShotProceduralSpec } from '../data/proceduralCinemaEngine';
import { TitlePresetConfig } from '../types/titlePreset';
import {
  buildTitlePresetConfigById,
  resolveShotTitleData,
  resolveShotTitlePresetConfig
} from '../constants/titleTemplates';
import {
  getKineticEntranceCssClass,
  resolveSpatialTitleChoreography
} from '../services/titleChoreographyEngine';
import { TitleZone9, TitleLayerStyle, TitleKeyframeConfig } from '../types/titlePreset';
import {
  buildDefaultTitleLayers,
  DEFAULT_TITLE_KEYFRAMES,
  segmentTextGraphemes
} from '../constants/titleTemplates';
import {
  Sliders,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CopyCheck,
  Check
} from 'lucide-react';

export type StageTitleVariant =
  | 'center'
  | 'auto'
  | 'mid-bottom'
  | 'left-bottom'
  | 'right-bottom'
  | 'center-low'
  | 'bottom-left'
  | 'bottom-right'
  | 'asymmetric-split'
  | 'top-right-split'
  | 'middle-right';

export interface StageTextOverlayProps {
  shotIndex: number;
  banglaTitle?: string;
  englishTitle?: string;
  subtitle?: string;
  directorNotes?: string;
  cameraInfo?: string;
  isVisible?: boolean;
  scale?: number;
  glowIntensity?: number;
  tracking?: number;
  verticalOffset?: number;
  preset?: HeroTitlePreset;
  activeTitlePreset?: string;
  titlePresetConfig?: TitlePresetConfig;
  currentTimeSec?: number;
  durationSec?: number;
  variant?: StageTitleVariant | string;
  titleAlign?: TitleAlign;
  titleZone?: TitleZone9 | 'AUTO';
  shotType?: string;
  className?: string;
  allowQuickControls?: boolean;
  onChangeVariant?: (variant: any) => void;
  componentsVisibility?: ComponentVisibility;
}

function getMotionAnimationClass(anim: TitlePresetConfig['motionAnimation']): string {
  switch (anim) {
    case 'kinetic-slam':
      return 'animate-title-kinetic-slam';
    case 'typewriter-hud':
      return 'animate-title-typewriter-hud';
    case 'neon-glitch-rgb':
      return 'animate-title-neon-glitch';
    case 'chopper-staccato':
      return 'animate-title-chopper-staccato';
    case 'lower-third-slide':
      return 'animate-title-lower-third';
    case '3d-flip':
      return 'animate-title-3d-flip';
    case 'anamorphic-sweep':
      return 'animate-title-anamorphic-sweep';
    case 'glitch-slice':
      return 'animate-title-glitch-slice';
    case 'typewriter-telemetry':
      return 'animate-title-typewriter-telemetry';
    case 'cinema-credit-crawl':
      return 'animate-title-cinema-credit-crawl';
    case 'viral-pop-bounce':
      return 'animate-title-viral-pop-bounce';
    case 'subtle-depth-drift':
      return 'animate-title-subtle-depth-drift';
    case 'slow-cinema-fade':
    default:
      return 'animate-title-slow-fade';
  }
}

function getEasingCss(curve?: TitleKeyframeConfig['easingCurve']): string {
  switch (curve) {
    case 'spring-overshoot':
      return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    case 'linear-hud':
      return 'linear';
    case 'whip-slam':
      return 'cubic-bezier(0.2, 0.9, 0.3, 1)';
    case 'cubic-out':
    default:
      return 'cubic-bezier(0.16, 1, 0.3, 1)';
  }
}

function renderStaggeredText(
  text: string,
  staggerMode: TitleKeyframeConfig['staggerMode'] | undefined,
  delaySec: number
): React.ReactNode {
  if (!text || !staggerMode || staggerMode === 'block') return text;
  const units =
    staggerMode === 'word'
      ? text.split(/(\s+)/)
      : segmentTextGraphemes(text);
  let animIdx = 0;
  return units.map((unit, idx) => {
    if (/^\s+$/.test(unit)) return unit;
    const unitDelayMs = Math.round((delaySec + animIdx * 0.032) * 1000);
    animIdx += 1;
    return (
      <span
        key={idx}
        className="animate-title-stagger-unit"
        style={{ animationDelay: `${unitDelayMs}ms` }}
      >
        {unit}
      </span>
    );
  });
}

export const StageTextOverlay: React.FC<StageTextOverlayProps> = ({
  shotIndex,
  banglaTitle,
  englishTitle,
  subtitle,
  directorNotes,
  cameraInfo,
  isVisible = true,
  scale: propScale,
  glowIntensity: propGlow,
  tracking: propTracking,
  verticalOffset: propOffset,
  preset: propPreset,
  activeTitlePreset: propActivePresetId,
  titlePresetConfig: propTitlePresetConfig,
  currentTimeSec = 0,
  durationSec,
  variant = 'center',
  titleAlign: propTitleAlign,
  titleZone: propTitleZone,
  shotType,
  className = '',
  allowQuickControls = false,
  componentsVisibility
}) => {
  const titleContainerRef = useRef<HTMLDivElement | null>(null);

  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const storeVisibility = useStudioStore((s) => s.visibility.titlesAll);
  const storeTitleAlign = useStudioStore((s) => s.titleAlign);
  const storeTitleZone = useStudioStore((s) => s.titleZone);
  const kineticReplayTick = useStudioStore((s) => s.kineticReplayTick);
  const storeShot = useStudioStore((s) => s.project.shots?.[shotIndex]);
  const updateShotTitleData = useStudioStore((s) => s.updateShotTitleData);
  const setTitleMaterialSwatch = useStudioStore((s) => s.setTitleMaterialSwatch);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);
  const setTitleOpticalFinish = useStudioStore((s) => s.setTitleOpticalFinish);
  const nudgeTitleOffset = useStudioStore((s) => s.nudgeTitleOffset);
  const resetTitleOffset = useStudioStore((s) => s.resetTitleOffset);
  const toggleTitleSafeGuard = useStudioStore((s) => s.toggleTitleSafeGuard);
  const copyTitleStyleToAllShots = useStudioStore((s) => s.copyTitleStyleToAllShots);

  const [showQuickHud, setShowQuickHud] = useState(false);
  const [quickSaveConfirmed, setQuickSaveConfirmed] = useState(false);
  const quickSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (quickSaveTimerRef.current) window.clearTimeout(quickSaveTimerRef.current);
    };
  }, []);

  // Direct double-click inline canvas editing state
  const [editingField, setEditingField] = useState<'bangla' | 'english' | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditingField(null);
  }, [shotIndex]);

  useEffect(() => {
    if (editingField && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [editingField]);

  // Resolve unified per-shot ShotTitleData (100% isolated per shot)
  const effectiveAlignInput: TitleAlign | undefined = propTitleAlign || (storeTitleConfig?.heroGlobal ? storeTitleAlign : undefined);
  const resolvedShotTitle = React.useMemo(
    () =>
      resolveShotTitleData(
        {
          titleData: storeShot?.titleData,
          title: storeShot?.title ?? englishTitle,
          bengaliTitle: storeShot?.bengaliTitle ?? banglaTitle,
          tagline: storeShot?.tagline ?? subtitle,
          directorNotes: storeShot?.directorNotes ?? directorNotes,
          activeTitlePreset: propActivePresetId ?? storeShot?.activeTitlePreset,
          titleStyleConfig: propPreset
            ? buildTitlePresetConfigById(propPreset)
            : (storeShot?.titleStyleConfig ?? propTitlePresetConfig),
          dopamineConfig: storeShot?.dopamineConfig
        },
        shotIndex,
        storeTitleConfig,
        effectiveAlignInput
      ),
    [
      storeShot,
      englishTitle,
      banglaTitle,
      subtitle,
      directorNotes,
      propActivePresetId,
      propPreset,
      propTitlePresetConfig,
      shotIndex,
      storeTitleConfig,
      effectiveAlignInput
    ]
  );

  // Apply explicit prop overrides if supplied cleanly
  const activePresetId = resolvedShotTitle.presetId;
  const glow = propGlow ?? resolvedShotTitle.glowIntensity ?? 1.0;
  const tracking = propTracking ?? resolvedShotTitle.letterTracking ?? 0.15;
  const verticalOffset = propOffset ?? resolvedShotTitle.verticalOffset ?? 0;
  const horizontalOffset = resolvedShotTitle.horizontalOffset ?? 0;
  const safeGuardEnabled = Boolean(resolvedShotTitle.safeGuard);
  const opticalFinish = resolvedShotTitle.opticalFinish;
  const titleSizePx = resolvedShotTitle.fontScale ?? 72;
  const scale = propScale ?? titleSizePx / 72;

  const presetConfig: TitlePresetConfig = {
    ...resolvedShotTitle.styleConfig,
    fontScale: titleSizePx,
    glowIntensity: glow,
    letterTracking: tracking,
    verticalOffset,
    horizontalOffset,
    safeGuard: safeGuardEnabled,
    opticalFinish
  };

  const activeHeroPreset: HeroTitlePreset =
    propPreset ||
    (presetConfig.presetId === 'titanium-silver' ||
    presetConfig.presetId === 'neon-crimson' ||
    presetConfig.presetId === 'pure-white' ||
    presetConfig.presetId === 'amber'
      ? presetConfig.presetId
      : 'molten-gold');

  const titleOpacity = Math.max(
    0,
    Math.min(1.0, componentsVisibility?.titleOpacity ?? storeTitleConfig?.titleOpacity ?? 1.0)
  );

  // Near-end dissolve opacity during playback/scrubbing within final 0.20s of shot duration
  const boundaryOpacityMultiplier =
    typeof durationSec === 'number' && durationSec > 0.6 && currentTimeSec > durationSec - 0.2
      ? Math.max(0.08, (durationSec - currentTimeSec) / 0.2)
      : 1;

  const resolvedEyebrow =
    storeShot?.titleData?.eyebrowText ?? resolvedShotTitle.eyebrowText ?? '';
  const resolvedCredits =
    storeShot?.titleData?.creditsText ?? resolvedShotTitle.creditsText ?? '';
  const keyframes: TitleKeyframeConfig = {
    ...DEFAULT_TITLE_KEYFRAMES,
    inAnim: presetConfig.motionAnimation,
    ...(resolvedShotTitle.keyframes || {}),
  };
  const layerStyles = React.useMemo(
    () => buildDefaultTitleLayers(presetConfig, resolvedShotTitle.layers),
    [presetConfig, resolvedShotTitle.layers]
  );

  // Explicit component visibility check for title elements + per-shot toggle
  const showEyebrow = Boolean(resolvedEyebrow.trim() && layerStyles.eyebrow.enabled);
  const showBangla = (componentsVisibility ? componentsVisibility.titleBn !== false : true) && layerStyles.bangla.enabled;
  const showEnglish = (componentsVisibility ? componentsVisibility.titleEn !== false : true) && layerStyles.english.enabled;
  const showDialogue = (componentsVisibility
    ? componentsVisibility.tagline !== false || componentsVisibility.caption !== false
    : true) && layerStyles.subtitle.enabled;
  const showCredits = Boolean(resolvedCredits.trim() && layerStyles.credits.enabled);
  const effectiveTitlesAll =
    componentsVisibility !== undefined
      ? Boolean(componentsVisibility.titlesAll && (showBangla || showEnglish || showDialogue || showEyebrow || showCredits))
      : Boolean((storeTitleConfig?.showTitles ?? true) && storeVisibility);

  const isEnabled = Boolean(isVisible && effectiveTitlesAll && resolvedShotTitle.enabled !== false);

  // Iconic headline fallbacks for dynamic Bangla hero typography
  const DEFAULT_BANGLA_HEADLINES = ['শূন্য', 'আলো', 'সংঘাত', 'দৃষ্টির সীমানা'];
  const fallbackHeadline = DEFAULT_BANGLA_HEADLINES[shotIndex % DEFAULT_BANGLA_HEADLINES.length];

  const resolvedBanglaSource =
    storeShot?.titleData?.banglaTitle !== undefined
      ? storeShot.titleData.banglaTitle
      : (banglaTitle ?? resolvedShotTitle.banglaTitle);
  const resolvedEnglishSource =
    storeShot?.titleData?.englishSubtitle !== undefined
      ? storeShot.titleData.englishSubtitle
      : (englishTitle ?? resolvedShotTitle.englishSubtitle);

  const displayBangla =
    resolvedBanglaSource && resolvedBanglaSource.trim().length > 0
      ? resolvedBanglaSource
      : fallbackHeadline;
  const displayEnglish =
    resolvedEnglishSource && resolvedEnglishSource.trim().length > 0
      ? resolvedEnglishSource
      : `SHOT ${String(shotIndex + 1).padStart(3, '0')} // MASTER SEQUENCE`;
  const rawDialogue = directorNotes || subtitle || resolvedShotTitle.captionNote;
  const displayDialogue =
    rawDialogue && /^\[(?:🌪️\s*)?DOPAMINE:/i.test(rawDialogue.trim()) && presetConfig.category !== 'DOPAMINE'
      ? subtitle && subtitle !== rawDialogue
        ? subtitle
        : undefined
      : rawDialogue;

  const repaintRevision = useTitleContainerRepaint({
    containerRef: titleContainerRef,
    visibility: componentsVisibility,
    isVisible: isEnabled,
    label: 'StageTextOverlay',
    activeKey: `${shotIndex}-${activePresetId}-${presetConfig.layoutMode}`
  });

  useEffect(() => {
    applyTitleBlockOpacityCssVar(titleOpacity);
  }, [titleOpacity]);

  const activeTitleAlign: TitleAlign = storeTitleConfig?.heroGlobal
    ? (propTitleAlign || storeTitleAlign || resolvedShotTitle.alignment || 'MID')
    : (resolvedShotTitle.alignment || propTitleAlign || 'MID');
  const activeTitleZone: TitleZone9 | 'AUTO' = storeTitleConfig?.heroGlobal
    ? (propTitleZone ?? storeTitleZone ?? resolvedShotTitle.zone9 ?? 'AUTO')
    : (propTitleZone ?? resolvedShotTitle.zone9 ?? 'AUTO');
  const choreography = resolveSpatialTitleChoreography({
    titleAlign: activeTitleAlign,
    zone9: activeTitleZone,
    layoutMode: presetConfig.layoutMode,
    shotIndex,
    shotType: shotType ?? storeShot?.shotType,
    panX: storeShot?.panX,
    panY: storeShot?.panY,
    smartCropMode: storeShot?.smartCropMode,
    safeGuard: safeGuardEnabled,
    horizontalOffset,
    verticalOffset
  });
  const effectiveAlign = choreography.effectiveAlign;
  const effectiveVerticalOffset = choreography.clampedVerticalOffset;
  const effectiveHorizontalOffset = choreography.clampedHorizontalOffset;
  const procedural = getShotProceduralSpec(shotIndex);
  const { palette: procPalette, architecture: procArch, opticalFx: procFx } = procedural;

  const layoutEffectiveAlign: 'LEFT' | 'MID' | 'RIGHT' = effectiveAlign;

  // Preserve required alignment helper classes for test & layout invariants
  const clusterAlignClasses =
    layoutEffectiveAlign === 'LEFT'
      ? 'items-start text-left pl-12'
      : layoutEffectiveAlign === 'RIGHT'
        ? 'items-end text-right pr-12'
        : 'items-center text-center';

  const blockAlignClasses =
    layoutEffectiveAlign === 'LEFT'
      ? 'items-start text-left'
      : layoutEffectiveAlign === 'RIGHT'
        ? 'items-end text-right'
        : 'items-center text-center';

  const horizontalAnchorLeft = choreography.cssLeft;
  const horizontalAnchorRight = choreography.cssRight;
  const horizontalTranslateX = choreography.cssTranslateX;
  const zoneMaxWidth = choreography.cssMaxWidth;

  const getVerticalAnchorStyle = (): React.CSSProperties => {
    const xExpr =
      effectiveHorizontalOffset === 0
        ? horizontalTranslateX
        : `calc(${horizontalTranslateX} + ${effectiveHorizontalOffset}px)`;
    if (choreography.cssVertical.top !== undefined) {
      const baseY = choreography.cssVertical.translateY;
      return {
        top: choreography.cssVertical.top,
        left: horizontalAnchorLeft,
        right: horizontalAnchorRight,
        maxWidth: zoneMaxWidth,
        transform: `translate3d(${xExpr}, calc(${baseY} + ${effectiveVerticalOffset}px), 0)`
      };
    }
    return {
      bottom: choreography.cssVertical.bottom || '12%',
      left: horizontalAnchorLeft,
      right: horizontalAnchorRight,
      maxWidth: zoneMaxWidth,
      transform: `translate3d(${xExpr}, ${effectiveVerticalOffset}px, 0)`
    };
  };

  const bnLayer: TitleLayerStyle = layerStyles.bangla;
  const enLayer: TitleLayerStyle = layerStyles.english;
  const eyebrowLayer: TitleLayerStyle = layerStyles.eyebrow;
  const subLayer: TitleLayerStyle = layerStyles.subtitle;
  const creditsLayer: TitleLayerStyle = layerStyles.credits;

  const isCustomPreset =
    presetConfig.presetId !== 'molten-gold' &&
    presetConfig.presetId !== 'titanium-silver' &&
    presetConfig.presetId !== 'neon-crimson' &&
    presetConfig.presetId !== 'pure-white' &&
    presetConfig.presetId !== 'amber';
  const effectiveFontSizePx = isCustomPreset
    ? Math.max(20, Math.min(96, Math.round(bnLayer.fontSize || presetConfig.fontScale)))
    : Math.max(20, Math.min(96, Math.round((bnLayer.fontSize || titleSizePx) * scale * procArch.scaleMultiplier)));
  const clampedFontSizeCss = `clamp(16px, ${(effectiveFontSizePx / 16).toFixed(2)}cqw, ${effectiveFontSizePx}px)`;
  const effectiveTrackingEm = isCustomPreset
    ? Math.max(0.01, bnLayer.letterSpacing ?? tracking)
    : Math.max(0.02, (bnLayer.letterSpacing ?? tracking) + procArch.trackingBoostEm);

  const bnGrad = bnLayer.gradientStops ?? presetConfig.primaryGradient;
  const hasGradientFill = Array.isArray(bnGrad) && bnGrad.length >= 2;
  const gradientBg = hasGradientFill
    ? `linear-gradient(90deg, ${bnGrad!.join(', ')})`
    : undefined;

  const bnBloom = bnLayer.bloomIntensity ?? glow;
  const glowBlurPrimary = Math.max(0, Math.round(22 * bnBloom));
  const glowBlurAmbient = Math.max(0, Math.round(44 * bnBloom));
  const isHalation = opticalFinish === 'halation';
  const isCleanFinish = opticalFinish === 'clean';
  const gradientFilter = isHalation
    ? `drop-shadow(0 0 ${Math.max(10, glowBlurPrimary)}px rgba(239,68,68,0.88)) drop-shadow(0 0 ${Math.max(24, glowBlurAmbient)}px rgba(245,158,11,0.58))`
    : isCleanFinish
      ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.92))'
      : bnBloom > 0.02
        ? `drop-shadow(0 0 ${glowBlurPrimary}px ${presetConfig.glowColor}) drop-shadow(0 0 ${glowBlurAmbient}px ${presetConfig.glowColor})`
        : bnLayer.dropShadow || 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))';
  const solidTextShadow = isHalation
    ? `0 2px 8px rgba(0,0,0,0.9), 0 0 ${Math.max(12, glowBlurPrimary)}px rgba(239,68,68,0.88), 0 0 ${Math.max(28, glowBlurAmbient)}px rgba(245,158,11,0.58)`
    : isCleanFinish
      ? '0 2px 8px rgba(0,0,0,0.95)'
      : bnBloom > 0.02
        ? `0 2px 8px rgba(0,0,0,0.85), 0 0 ${glowBlurPrimary}px ${presetConfig.glowColor}, 0 0 ${glowBlurAmbient}px ${presetConfig.glowColor}`
        : bnLayer.dropShadow || '0 2px 10px rgba(0,0,0,0.9)';

  const primaryTitleStyle: React.CSSProperties = {
    fontFamily: bnLayer.fontFamily || presetConfig.banglaFontFamily,
    fontWeight: bnLayer.fontWeight || 900,
    fontSize: clampedFontSizeCss,
    lineHeight: bnLayer.lineHeight || 1.08,
    letterSpacing: `${effectiveTrackingEm}em`,
    textTransform: bnLayer.textTransform || (presetConfig.uppercase ? 'uppercase' : 'none'),
    ...(hasGradientFill
      ? {
          backgroundImage: gradientBg,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          filter: gradientFilter
        }
      : {
          color: bnLayer.color || presetConfig.primaryColor,
          WebkitTextFillColor: bnLayer.color || presetConfig.primaryColor,
          WebkitTextStroke:
            (bnLayer.strokeWidth ?? presetConfig.strokeWidth) > 0
              ? `${bnLayer.strokeWidth ?? presetConfig.strokeWidth}px ${bnLayer.strokeColor || presetConfig.strokeColor}`
              : undefined,
          textShadow: solidTextShadow
        }),
    transformOrigin:
      layoutEffectiveAlign === 'LEFT'
        ? 'left center'
        : layoutEffectiveAlign === 'RIGHT'
          ? 'right center'
          : 'center center'
  };

  const englishSubtitleStyle: React.CSSProperties = {
    fontFamily: enLayer.fontFamily || presetConfig.englishFontFamily,
    fontWeight: enLayer.fontWeight || 700,
    lineHeight: enLayer.lineHeight || 1.25,
    color: enLayer.color || presetConfig.secondaryColor,
    textTransform: enLayer.textTransform || (presetConfig.uppercase ? 'uppercase' : 'none'),
    letterSpacing: `${Math.max(0.04, enLayer.letterSpacing ?? (effectiveTrackingEm + (isCustomPreset ? 0.04 : 0.16)))}em`,
    textShadow: enLayer.dropShadow || '0 2px 10px rgba(0,0,0,0.92)'
  };

  const hasRgbSplit = presetConfig.chromaticAberration > 0 || procFx.hasRgbSplit;
  const rgbShiftPx = Math.max(2, Math.round((presetConfig.chromaticAberration || 35) / 18));

  const accentHex = presetConfig.backdropPlate?.accentBarColor || presetConfig.primaryColor;

  const renderAccentDivider = () => {
    if (presetConfig.layoutMode === 'lower-third-bar' || presetConfig.layoutMode === 'brutalist-box') {
      return null;
    }
    if (presetConfig.layoutMode === 'editorial-split') {
      return (
        <div
          key={`editorial-rule-${shotIndex}-${activePresetId}`}
          className="h-[1px] mt-2.5 w-32 animate-streak-expand"
          style={{
            background: `linear-gradient(90deg, transparent, ${presetConfig.primaryColor}, transparent)`
          }}
        />
      );
    }
    if (presetConfig.layoutMode === 'minimal-whisper') {
      return (
        <div
          key={`whisper-rule-${shotIndex}-${activePresetId}`}
          className="h-[1px] mt-2 w-16 opacity-60"
          style={{ backgroundColor: presetConfig.secondaryColor }}
        />
      );
    }
    return (
      <div
        key={`anamorphic-streak-${shotIndex}-${activePresetId}`}
        className="h-[2px] mt-2.5 min-w-[8rem] rounded-full animate-streak-expand"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentHex}, transparent)`,
          boxShadow: glow > 0.05 ? `0 0 ${Math.round(18 * glow)}px ${presetConfig.glowColor}` : 'none'
        }}
      />
    );
  };

  const activeInAnim = keyframes.inAnim || presetConfig.motionAnimation;
  const motionClass = getMotionAnimationClass(activeInAnim);
  const directionalMotionClass = getKineticEntranceCssClass(choreography.kineticEntrance);

  // Smooth 180ms outgoing title dissolve snapshot when crossing shot boundaries
  const [exitingSnapshot, setExitingSnapshot] = useState<{
    key: string;
    bangla: string;
    english: string;
    primaryTitleStyle: React.CSSProperties;
    englishSubtitleStyle: React.CSSProperties;
    anchorStyle: React.CSSProperties;
    clusterAlignClasses: string;
    blockAlignClasses: string;
  } | null>(null);
  const prevShotSnapshotRef = useRef<{
    shotIndex: number;
    enabled: boolean;
    bangla: string;
    english: string;
    primaryTitleStyle: React.CSSProperties;
    englishSubtitleStyle: React.CSSProperties;
    anchorStyle: React.CSSProperties;
    clusterAlignClasses: string;
    blockAlignClasses: string;
  } | null>(null);

  useEffect(() => {
    const prev = prevShotSnapshotRef.current;
    if (prev && prev.shotIndex !== shotIndex && prev.enabled) {
      setExitingSnapshot({
        key: `${prev.shotIndex}-${Date.now()}`,
        bangla: prev.bangla,
        english: prev.english,
        primaryTitleStyle: prev.primaryTitleStyle,
        englishSubtitleStyle: prev.englishSubtitleStyle,
        anchorStyle: prev.anchorStyle,
        clusterAlignClasses: prev.clusterAlignClasses,
        blockAlignClasses: prev.blockAlignClasses
      });
      const timer = window.setTimeout(() => {
        setExitingSnapshot(null);
      }, 190);
      prevShotSnapshotRef.current = {
        shotIndex,
        enabled: isEnabled,
        bangla: displayBangla,
        english: displayEnglish,
        primaryTitleStyle,
        englishSubtitleStyle,
        anchorStyle: getVerticalAnchorStyle(),
        clusterAlignClasses,
        blockAlignClasses
      };
      return () => window.clearTimeout(timer);
    }
    prevShotSnapshotRef.current = {
      shotIndex,
      enabled: isEnabled,
      bangla: displayBangla,
      english: displayEnglish,
      primaryTitleStyle,
      englishSubtitleStyle,
      anchorStyle: getVerticalAnchorStyle(),
      clusterAlignClasses,
      blockAlignClasses
    };
  });

  // Plate styling for container layouts (`lower-third-bar`, `hud-bracket`, `brutalist-box`, `editorial-split`)
  const plateEnabled = Boolean(presetConfig.backdropPlate?.enabled);
  const plateStyle: React.CSSProperties = plateEnabled
    ? {
        background: presetConfig.backdropPlate.background,
        border: presetConfig.backdropPlate.border,
        backdropFilter:
          presetConfig.backdropPlate.backdropBlur > 0
            ? `blur(${presetConfig.backdropPlate.backdropBlur}px)`
            : undefined,
        WebkitBackdropFilter:
          presetConfig.backdropPlate.backdropBlur > 0
            ? `blur(${presetConfig.backdropPlate.backdropBlur}px)`
            : undefined,
        padding: presetConfig.backdropPlate.padding,
        boxShadow:
          presetConfig.layoutMode === 'brutalist-box'
            ? `6px 6px 0px rgba(0,0,0,0.92), 0 0 24px ${presetConfig.glowColor}`
            : `0 12px 36px rgba(0,0,0,0.65)`
      }
    : {};

  // Avoid overlapping lower-third / brutalist plates with bottom-center dialogue capsule
  const isBottomPlateLayout =
    presetConfig.layoutMode === 'lower-third-bar' ||
    presetConfig.layoutMode === 'brutalist-box' ||
    presetConfig.layoutMode === 'minimal-whisper';

  const commitInlineEdit = () => {
    if (!editingField) return;
    const trimmed = draftValue.trim();
    if (editingField === 'bangla' && trimmed.length > 0) {
      updateShotTitleData(shotIndex, { banglaTitle: trimmed });
    } else if (editingField === 'english' && trimmed.length > 0) {
      updateShotTitleData(shotIndex, { englishSubtitle: trimmed });
    }
    setEditingField(null);
  };

  return (
    <div
      data-testid="stage-text-overlay"
      className={`absolute inset-0 pointer-events-none z-20 select-none overflow-hidden ${
        isEnabled ? 'flex flex-col' : 'hidden opacity-0'
      } ${className}`}
      data-shot-index={shotIndex}
      data-preset={activePresetId}
      data-layout-mode={presetConfig.layoutMode}
      data-preset-category={presetConfig.category}
      data-title-align={activeTitleAlign}
      data-effective-align={layoutEffectiveAlign}
      data-title-zone={choreography.zone9}
      data-kinetic-entrance={choreography.kineticEntrance}
      data-procedural-palette={procPalette.id}
      data-typography-arch={procArch.id}
      data-optical-fx={procFx.id}
      data-variant={variant}
      style={{ containerType: 'inline-size' }}
      aria-hidden={!isEnabled}
    >
      {/* Outgoing 180ms Shot Exit Dissolve Layer */}
      {exitingSnapshot && (
        <div
          key={`exiting-cluster-${exitingSnapshot.key}`}
          aria-hidden="true"
          className={`absolute w-fit flex flex-col py-2 pointer-events-none animate-title-exit-dissolve ${exitingSnapshot.clusterAlignClasses} !pl-0 !pr-0`}
          style={exitingSnapshot.anchorStyle}
        >
          <div className={`flex flex-col w-full max-w-full ${exitingSnapshot.blockAlignClasses}`}>
            <span
              className="font-black leading-tight max-w-full"
              style={{
                ...exitingSnapshot.primaryTitleStyle,
                wordBreak: 'keep-all',
                overflowWrap: 'break-word'
              }}
            >
              {exitingSnapshot.bangla}
            </span>
            <span
              className="text-xs sm:text-sm md:text-base font-bold mt-1.5 max-w-full"
              style={{
                ...exitingSnapshot.englishSubtitleStyle,
                wordBreak: 'keep-all',
                overflowWrap: 'break-word'
              }}
            >
              {exitingSnapshot.english}
            </span>
          </div>
        </div>
      )}

      {/* .title-block container controlled by Components Matrix Title Block Opacity slider */}
      <div
        ref={titleContainerRef}
        data-title-container="stage-text-overlay"
        data-repaint-rev={repaintRevision}
        data-bangla-title={showBangla ? displayBangla : ''}
        data-english-title={showEnglish ? displayEnglish : ''}
        data-dialogue={showDialogue && displayDialogue ? displayDialogue : ''}
        data-effective-align={layoutEffectiveAlign}
        data-preset={activePresetId}
        style={{ opacity: boundaryOpacityMultiplier }}
        className={`title-block relative w-full h-full ${
          isEnabled ? 'flex flex-col' : 'hidden opacity-0'
        }`}
      >
        {isEnabled && (
          <>
            {/* Dynamic Unified Preset Title Cluster (Smooth Morph on Preset Switch + Directional Choreography) */}
            <div
              key={`hero-title-cluster-${shotIndex}`}
              data-title-cluster="true"
              className={`absolute w-fit flex flex-col py-2 transition-[left,transform] duration-300 ease-out title-morph-smooth animate-title-reveal-in ${clusterAlignClasses} !pl-0 !pr-0`}
              style={getVerticalAnchorStyle()}
            >
              <div
                key={`kinetic-entrance-${shotIndex}-${choreography.zone9}-${kineticReplayTick}`}
                className={`w-full max-w-full ${directionalMotionClass}`}
              >
              <div
                key={`motion-finish-${shotIndex}-${opticalFinish || presetConfig.motionAnimation}-${kineticReplayTick}`}
                className={`relative flex flex-col w-full max-w-full ${motionClass} title-morph-smooth ${blockAlignClasses} ${
                  presetConfig.layoutMode === 'lower-third-bar'
                    ? 'rounded-r-lg rounded-l-xs'
                    : presetConfig.layoutMode === 'editorial-split'
                      ? 'rounded-xs'
                      : presetConfig.layoutMode === 'brutalist-box'
                        ? 'rounded-none'
                        : presetConfig.layoutMode === 'hud-bracket'
                          ? 'rounded-xs'
                          : opticalFinish === 'scrim'
                            ? 'rounded-md'
                            : ''
                }`}
                style={{
                  ...plateStyle,
                  ['--title-anim-dur' as any]: `${Math.round((keyframes.durationSec || 0.55) * 1000)}ms`,
                  ['--title-anim-delay' as any]: `${Math.round((keyframes.delaySec || 0) * 1000)}ms`,
                  ['--title-anim-ease' as any]: getEasingCss(keyframes.easingCurve),
                }}
              >
                {/* Lower-Third Vertical Signature Accent Bar */}
                {presetConfig.layoutMode === 'lower-third-bar' && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-1 rounded-full"
                    style={{
                      backgroundColor: accentHex,
                      boxShadow: `0 0 12px ${accentHex}`
                    }}
                  />
                )}

                {/* HUD Corner Reticle L-Brackets */}
                {presetConfig.layoutMode === 'hud-bracket' && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2"
                      style={{ borderColor: accentHex }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2"
                      style={{ borderColor: accentHex }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2"
                      style={{ borderColor: accentHex }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2"
                      style={{ borderColor: accentHex }}
                    />
                    <div
                      className="text-[8.5px] font-mono tracking-[0.28em] uppercase mb-1 opacity-80"
                      style={{ color: accentHex }}
                    >
                      SYS // {presetConfig.presetName}
                    </div>
                  </>
                )}

                {/* Editorial Couture Top Hairline Rule */}
                {presetConfig.layoutMode === 'editorial-split' && (
                  <div
                    aria-hidden="true"
                    className="w-full h-[1px] mb-2.5 opacity-60"
                    style={{ backgroundColor: presetConfig.primaryColor }}
                  />
                )}

                <div
                  className={`flex flex-col ${blockAlignClasses} ${
                    presetConfig.layoutMode === 'lower-third-bar' ? 'pl-3' : ''
                  }`}
                >
                  {/* Layer 1: Eyebrow Kicker / Scene Slate */}
                  {showEyebrow && (
                    <span
                      data-testid="stage-eyebrow-kicker"
                      className="mb-1 max-w-full truncate"
                      style={{
                        fontFamily: eyebrowLayer.fontFamily,
                        fontWeight: eyebrowLayer.fontWeight,
                        fontSize: `${Math.max(9, Math.min(28, eyebrowLayer.fontSize ?? 12))}px`,
                        letterSpacing: `${eyebrowLayer.letterSpacing}em`,
                        textTransform: eyebrowLayer.textTransform,
                        color: eyebrowLayer.color,
                        textShadow: eyebrowLayer.dropShadow,
                        ...(eyebrowLayer.plate?.enabled
                          ? {
                              background: eyebrowLayer.plate.background,
                              border: eyebrowLayer.plate.border,
                              borderRadius: `${eyebrowLayer.plate.borderRadius ?? 6}px`,
                              padding: eyebrowLayer.plate.padding,
                            }
                          : {}),
                      }}
                    >
                      {resolvedEyebrow}
                    </span>
                  )}

                  {/* Primary Title (Double-click directly on Stage to inline edit) */}
                  {showBangla && (
                    <div className="relative inline-block max-w-full">
                      {editingField === 'bangla' ? (
                        <input
                          ref={inlineInputRef}
                          type="text"
                          data-interactive="true"
                          data-testid="inline-edit-bangla"
                          aria-label="Edit Bangla Title Inline"
                          value={draftValue}
                          onChange={(e) => {
                            setDraftValue(e.target.value);
                            updateShotTitleData(shotIndex, { banglaTitle: e.target.value });
                          }}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') commitInlineEdit();
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="pointer-events-auto cursor-text bg-[#0B0B0D]/85 border border-[#F59E0B] rounded px-3 py-1 font-bangla font-black text-[#F4F4F5] outline-none min-w-[200px] max-w-full shadow-[0_0_24px_rgba(245,158,11,0.45)]"
                          style={{
                            fontSize: `${Math.max(20, Math.round(effectiveFontSizePx * 0.72))}px`,
                            textAlign: layoutEffectiveAlign === 'LEFT' ? 'left' : layoutEffectiveAlign === 'RIGHT' ? 'right' : 'center'
                          }}
                        />
                      ) : (
                        <>
                          {hasRgbSplit && (
                            <>
                              <span
                                aria-hidden="true"
                                className="font-bold leading-tight select-none absolute inset-0 pointer-events-none opacity-60 max-w-full [text-wrap:balance]"
                                style={{
                                  fontFamily: bnLayer.fontFamily || presetConfig.banglaFontFamily,
                                  fontSize: clampedFontSizeCss,
                                  letterSpacing: `${effectiveTrackingEm}em`,
                                  textTransform: bnLayer.textTransform || (presetConfig.uppercase ? 'uppercase' : 'none'),
                                  color: '#00F0FF',
                                  wordBreak: 'keep-all',
                                  overflowWrap: 'break-word',
                                  transform: `translate3d(-${rgbShiftPx}px, 1px, 0)`
                                }}
                              >
                                {displayBangla}
                              </span>
                              <span
                                aria-hidden="true"
                                className="font-bold leading-tight select-none absolute inset-0 pointer-events-none opacity-60 max-w-full [text-wrap:balance]"
                                style={{
                                  fontFamily: bnLayer.fontFamily || presetConfig.banglaFontFamily,
                                  fontSize: clampedFontSizeCss,
                                  letterSpacing: `${effectiveTrackingEm}em`,
                                  textTransform: bnLayer.textTransform || (presetConfig.uppercase ? 'uppercase' : 'none'),
                                  color: '#FF0055',
                                  wordBreak: 'keep-all',
                                  overflowWrap: 'break-word',
                                  transform: `translate3d(${rgbShiftPx}px, -1px, 0)`
                                }}
                              >
                                {displayBangla}
                              </span>
                            </>
                          )}
                          <h1
                            key={`bangla-title-${shotIndex}-${keyframes.staggerMode}`}
                            data-interactive="true"
                            data-testid="stage-bangla-title-heading"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setDraftValue(displayBangla);
                              setEditingField('bangla');
                            }}
                            onPointerDown={(e) => {
                              if (e.detail >= 2) e.stopPropagation();
                            }}
                            onPointerUp={(e) => {
                              if (e.detail >= 2) e.stopPropagation();
                            }}
                            title="Double-click to edit Bangla title directly on Stage"
                            className={`relative font-black leading-tight select-none pointer-events-auto cursor-text title-morph-smooth max-w-full [text-wrap:balance] ${
                              procFx.hasStrobePulse || presetConfig.category === 'DOPAMINE'
                                ? 'animate-pulse'
                                : ''
                            }`}
                            style={{
                              ...primaryTitleStyle,
                              wordBreak: 'keep-all',
                              overflowWrap: 'break-word'
                            }}
                          >
                            {renderStaggeredText(displayBangla, keyframes.staggerMode, keyframes.delaySec)}
                          </h1>
                        </>
                      )}
                    </div>
                  )}

                  {/* Secondary Subtitle + Preset Divider (Double-click directly on Stage to inline edit) */}
                  {showEnglish && (
                    <div className={`mt-1.5 sm:mt-2.5 flex flex-col title-morph-smooth ${blockAlignClasses}`}>
                      {editingField === 'english' ? (
                        <input
                          ref={inlineInputRef}
                          type="text"
                          data-interactive="true"
                          data-testid="inline-edit-english"
                          aria-label="Edit English Subtitle Inline"
                          value={draftValue}
                          onChange={(e) => {
                            setDraftValue(e.target.value);
                            updateShotTitleData(shotIndex, { englishSubtitle: e.target.value });
                          }}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') commitInlineEdit();
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="pointer-events-auto cursor-text bg-[#0B0B0D]/85 border border-[#F59E0B] rounded px-3 py-1 text-xs sm:text-sm md:text-base font-bold text-[#F4F4F5] outline-none min-w-[200px] shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                          style={{
                            fontFamily: enLayer.fontFamily || presetConfig.englishFontFamily,
                            textTransform: enLayer.textTransform || (presetConfig.uppercase ? 'uppercase' : 'none'),
                            textAlign: layoutEffectiveAlign === 'LEFT' ? 'left' : layoutEffectiveAlign === 'RIGHT' ? 'right' : 'center'
                          }}
                        />
                      ) : (
                        <p
                          data-interactive="true"
                          data-testid="stage-english-subtitle"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setDraftValue(displayEnglish);
                            setEditingField('english');
                          }}
                          onPointerDown={(e) => {
                            if (e.detail >= 2) e.stopPropagation();
                          }}
                          onPointerUp={(e) => {
                            if (e.detail >= 2) e.stopPropagation();
                          }}
                          title="Double-click to edit English subtitle directly on Stage"
                          className="text-xs sm:text-sm font-bold pointer-events-auto cursor-text title-morph-smooth max-w-full [text-wrap:balance]"
                          style={{
                            ...englishSubtitleStyle,
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {renderStaggeredText(displayEnglish, keyframes.staggerMode, keyframes.delaySec + 0.08)}
                        </p>
                      )}

                      {renderAccentDivider()}

                      {cameraInfo && presetConfig.layoutMode !== 'minimal-whisper' && !showCredits && (
                        <span
                          className="font-mono text-[9px] tracking-[0.25em] uppercase mt-1.5 opacity-65 max-w-full truncate"
                          style={{ color: enLayer.color || presetConfig.secondaryColor }}
                        >
                          {cameraInfo}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Layer 5: End Credits / Production Billing Line */}
                  {showCredits && (
                    <p
                      data-testid="stage-credits-layer"
                      className="mt-2 max-w-full"
                      style={{
                        fontFamily: creditsLayer.fontFamily,
                        fontWeight: creditsLayer.fontWeight,
                        fontSize: `${Math.max(9, Math.min(24, creditsLayer.fontSize ?? 11))}px`,
                        lineHeight: creditsLayer.lineHeight,
                        letterSpacing: `${creditsLayer.letterSpacing}em`,
                        textTransform: creditsLayer.textTransform,
                        color: creditsLayer.color,
                        textShadow: creditsLayer.dropShadow,
                        wordBreak: 'keep-all',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {resolvedCredits}
                    </p>
                  )}

                  {/* If lower-plate or lower-row layout is active and dialogue exists, display subtle metadata line inside card */}
                  {(isBottomPlateLayout || choreography.row === 'lower') && showDialogue && displayDialogue && (
                    <p
                      className="mt-1.5 text-[11px] italic opacity-85 max-w-full truncate"
                      style={{
                        fontFamily: subLayer.fontFamily || presetConfig.englishFontFamily,
                        color: subLayer.color || presetConfig.secondaryColor
                      }}
                    >
                      "{displayDialogue}"
                    </p>
                  )}
                </div>

                {/* Editorial Couture Bottom Hairline Rule */}
                {presetConfig.layoutMode === 'editorial-split' && (
                  <div
                    aria-hidden="true"
                    className="w-full h-[1px] mt-2.5 opacity-60"
                    style={{ backgroundColor: presetConfig.primaryColor }}
                  />
                )}
              </div>
              </div>
            </div>

            {/* Narrative Line / Dialogue Card (Rendered at bottom-stage for top/mid layouts) */}
            {!isBottomPlateLayout && choreography.row !== 'lower' && showDialogue && displayDialogue && (
              <div
                className={`absolute bottom-5 sm:bottom-8 z-20 pointer-events-none w-fit px-1 transition-[left,transform] duration-300 ease-out ${
                  effectiveAlign === 'LEFT'
                    ? 'text-left'
                    : effectiveAlign === 'RIGHT'
                      ? 'text-right'
                      : 'text-center'
                }`}
                style={{
                  left: horizontalAnchorLeft,
                  right: horizontalAnchorRight,
                  maxWidth: zoneMaxWidth,
                  transform: `translate3d(${horizontalTranslateX}, 0, 0)`
                }}
              >
                <div
                  className="inline-flex items-center gap-2 max-w-full bg-[#141417]/55 backdrop-blur-xl backdrop-saturate-150 border text-[#F4F4F5]/95 px-4 py-1.5 rounded-full text-xs sm:text-sm italic shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{
                    borderColor: `${accentHex}44`,
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word'
                  }}
                >
                  <span className="max-w-full">"{displayDialogue}"</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Optional Interactive Quick-HUD for on-stage tweaking */}
      {isEnabled && allowQuickControls && (
        <div className="absolute top-12 right-3 pointer-events-auto z-40 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowQuickHud((v) => !v)}
            className="p-1.5 rounded-full bg-[#141417]/90 hover:bg-[#141417] border border-white/[0.07] hover:border-[#F59E0B]/60 text-[#8E8E93] hover:text-[#F4F4F5] text-[10px] font-mono flex items-center gap-1 transition-all backdrop-blur-md shadow-lg cursor-pointer"
            title="Adjust Hero Title Kinetics"
          >
            <Sliders className="w-3 h-3 text-[#F59E0B]" />
            <span className="text-[9px] font-bold">TITLE FX</span>
          </button>

          {showQuickHud && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0B0B0D]/95 border border-white/[0.07] rounded-md p-2.5 font-mono text-[9.5px] text-[#8E8E93] space-y-2 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-150 tabular-nums">
              <div className="flex items-center justify-between text-[#F4F4F5] font-bold text-[9px] border-b border-white/[0.07] pb-1">
                <span>QUICK DECK</span>
                <button
                  type="button"
                  onClick={toggleTitleSafeGuard}
                  className={`px-1.5 py-0.5 rounded border text-[8px] font-bold cursor-pointer ${
                    safeGuardEnabled
                      ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                      : 'bg-[#141417] border-white/[0.08] text-[#8E8E93]'
                  }`}
                >
                  SAFE {safeGuardEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {(
                  [
                    { id: 'molten-gold', label: 'GLD' },
                    { id: 'titanium-silver', label: 'SLV' },
                    { id: 'neon-crimson', label: 'CRM' },
                    { id: 'pure-white', label: 'WHT' },
                    { id: 'amber', label: 'AMB' }
                  ] as const
                ).map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    onClick={() => setTitleMaterialSwatch(sw.id)}
                    className={`py-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
                      activeHeroPreset === sw.id
                        ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                        : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {sw.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(['S', 'M', 'L', 'XL'] as const).map((lbl, idx) => {
                  const px = [44, 60, 74, 92][idx];
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setTitleSize(px)}
                      className={`py-1 text-[8px] font-bold rounded border cursor-pointer ${
                        Math.abs(titleSizePx - px) <= 6
                          ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                          : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'clean', label: 'CLEAN' },
                    { id: 'halation', label: 'HALO' },
                    { id: 'scrim', label: 'SCRIM' },
                    { id: 'kinetic', label: 'KINETIC' }
                  ] as const
                ).map((fin) => (
                  <button
                    key={fin.id}
                    type="button"
                    onClick={() => setTitleOpticalFinish(fin.id)}
                    className={`py-1 text-[7.5px] font-bold rounded border cursor-pointer ${
                      opticalFinish === fin.id
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B]'
                        : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {fin.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-white/[0.06]">
                <div className="grid grid-cols-3 gap-0.5 w-[72px]">
                  <span />
                  <button
                    type="button"
                    data-testid="quick-hud-nudge-up"
                    aria-label="Nudge title up 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(0, -(e.shiftKey ? 2 : 12))}
                    className="h-[19px] rounded bg-[#141417] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer"
                    title="Nudge Up 12px (Shift: 2px)"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    data-testid="quick-hud-nudge-left"
                    aria-label="Nudge title left 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(-(e.shiftKey ? 2 : 12), 0)}
                    className="h-[19px] rounded bg-[#141417] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer"
                    title="Nudge Left 12px (Shift: 2px)"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    data-testid="quick-hud-nudge-reset"
                    aria-label="Reset title nudge to 0,0"
                    onClick={resetTitleOffset}
                    className={`h-[19px] rounded border text-[7px] font-bold flex items-center justify-center cursor-pointer ${
                      effectiveHorizontalOffset === 0 && effectiveVerticalOffset === 0
                        ? 'bg-[#1C1C22] border-white/[0.07] text-[#8E8E93]'
                        : 'bg-[#F59E0B]/15 border-[#F59E0B]/70 text-[#F59E0B]'
                    }`}
                    title="Reset X/Y Nudge to 0,0"
                  >
                    0,0
                  </button>
                  <button
                    type="button"
                    data-testid="quick-hud-nudge-right"
                    aria-label="Nudge title right 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(e.shiftKey ? 2 : 12, 0)}
                    className="h-[19px] rounded bg-[#141417] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer"
                    title="Nudge Right 12px (Shift: 2px)"
                  >
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                  <span />
                  <button
                    type="button"
                    data-testid="quick-hud-nudge-down"
                    aria-label="Nudge title down 12px (Shift+Click 2px)"
                    onClick={(e) => nudgeTitleOffset(0, e.shiftKey ? 2 : 12)}
                    className="h-[19px] rounded bg-[#141417] border border-white/[0.08] hover:border-[#F59E0B] text-[#F4F4F5] hover:text-[#F59E0B] flex items-center justify-center cursor-pointer"
                    title="Nudge Down 12px (Shift: 2px)"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </button>
                  <span />
                </div>

                <div className="flex-1 flex flex-col gap-1 items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[7.5px] text-[#8E8E93] tabular-nums">
                      {effectiveHorizontalOffset >= 0 ? '+' : ''}{effectiveHorizontalOffset},{effectiveVerticalOffset >= 0 ? '+' : ''}{effectiveVerticalOffset}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTitleTracking(tracking >= 0.2 ? 0.12 : 0.24)}
                      className="px-1.5 py-0.5 rounded bg-[#141417] border border-white/[0.08] text-[#F59E0B] text-[8px] cursor-pointer"
                    >
                      TRK {tracking.toFixed(2)}em
                    </button>
                  </div>
                  <button
                    type="button"
                    data-testid="quick-hud-save-all"
                    onClick={() => {
                      copyTitleStyleToAllShots(shotIndex);
                      setQuickSaveConfirmed(true);
                      if (quickSaveTimerRef.current) window.clearTimeout(quickSaveTimerRef.current);
                      quickSaveTimerRef.current = window.setTimeout(() => setQuickSaveConfirmed(false), 1600);
                    }}
                    className={`w-full py-1 px-2 rounded border font-bold text-[8px] flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      quickSaveConfirmed
                        ? 'bg-[#F59E0B] border-[#F59E0B] text-[#0B0B0D]'
                        : 'bg-[#141417] hover:bg-[#F59E0B]/15 border-[#F59E0B]/50 text-[#F59E0B]'
                    }`}
                    title="Save current grid, film role, and optical settings to all shots"
                  >
                    {quickSaveConfirmed ? <Check className="w-2.5 h-2.5" /> : <CopyCheck className="w-2.5 h-2.5" />}
                    <span>{quickSaveConfirmed ? 'SAVED' : 'SAVE TO ALL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
