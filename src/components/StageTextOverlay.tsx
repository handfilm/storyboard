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
  resolveShotTitlePresetConfig
} from '../constants/titleTemplates';
import { Sliders } from 'lucide-react';

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
  variant?: StageTitleVariant | string;
  titleAlign?: TitleAlign;
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
    case 'slow-cinema-fade':
    default:
      return 'animate-title-slow-fade';
  }
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
  variant = 'center',
  titleAlign: propTitleAlign,
  shotType,
  className = '',
  allowQuickControls = false,
  componentsVisibility
}) => {
  const titleContainerRef = useRef<HTMLDivElement | null>(null);

  const storeTitleConfig = useStudioStore((s) => s.titleConfig);
  const storeVisibility = useStudioStore((s) => s.visibility.titlesAll);
  const storeTitleAlign = useStudioStore((s) => s.titleAlign);
  const storeShot = useStudioStore((s) => s.project.shots?.[shotIndex]);
  const setTitlePreset = useStudioStore((s) => s.setTitlePreset);
  const setTitleSize = useStudioStore((s) => s.setTitleSize);
  const setTitleGlowIntensity = useStudioStore((s) => s.setTitleGlowIntensity);
  const setTitleVerticalOffset = useStudioStore((s) => s.setTitleVerticalOffset);
  const setTitleTracking = useStudioStore((s) => s.setTitleTracking);

  const [showQuickHud, setShowQuickHud] = useState(false);

  // Resolve unified TitlePresetConfig for this shot:
  // 1. Explicit `propPreset` override if supplied
  // 2. Store's synchronously-updated `shot.titleStyleConfig` when same preset or no prop config
  // 3. `propTitlePresetConfig` passed from parent frame
  // 4. `resolveShotTitlePresetConfig(...)` fallback
  const basePresetConfig: TitlePresetConfig = React.useMemo(() => {
    if (propPreset) {
      return buildTitlePresetConfigById(propPreset);
    }
    if (
      storeShot?.titleStyleConfig &&
      (!propTitlePresetConfig || storeShot.titleStyleConfig.presetId === propTitlePresetConfig.presetId)
    ) {
      return storeShot.titleStyleConfig;
    }
    if (propTitlePresetConfig) {
      return propTitlePresetConfig;
    }
    return resolveShotTitlePresetConfig(
      {
        titleStyleConfig: storeShot?.titleStyleConfig,
        activeTitlePreset: propActivePresetId ?? storeShot?.activeTitlePreset,
        dopamineConfig: storeShot?.dopamineConfig
      },
      storeTitleConfig
    );
  }, [propPreset, propTitlePresetConfig, propActivePresetId, storeShot, storeTitleConfig]);

  // Apply live slider synchronization (when active preset matches hero sliders) and explicit prop overrides
  const isSliderSynced =
    !propPreset &&
    storeTitleConfig?.activePresetConfig?.presetId === basePresetConfig.presetId;

  const activePresetId = basePresetConfig.presetId;
  const glow =
    propGlow ??
    (isSliderSynced ? storeTitleConfig?.glowIntensity : basePresetConfig.glowIntensity) ??
    1.0;
  const tracking =
    propTracking ??
    (isSliderSynced ? storeTitleConfig?.tracking : basePresetConfig.letterTracking) ??
    0.15;
  const verticalOffset =
    propOffset ??
    (isSliderSynced ? storeTitleConfig?.verticalOffset : basePresetConfig.verticalOffset) ??
    0;
  const titleSizePx =
    (isSliderSynced ? storeTitleConfig?.titleSize : basePresetConfig.fontScale) ?? 72;
  const scale = propScale ?? titleSizePx / 72;

  const presetConfig: TitlePresetConfig = {
    ...basePresetConfig,
    fontScale: titleSizePx,
    glowIntensity: glow,
    letterTracking: tracking,
    verticalOffset
  };

  const activeHeroPreset: HeroTitlePreset =
    propPreset ||
    (presetConfig.presetId === 'titanium-silver' || presetConfig.presetId === 'neon-crimson'
      ? presetConfig.presetId
      : 'molten-gold');

  const titleOpacity = Math.max(
    0,
    Math.min(1.0, componentsVisibility?.titleOpacity ?? storeTitleConfig?.titleOpacity ?? 1.0)
  );

  // Explicit component visibility check for title elements
  const showBangla = componentsVisibility ? componentsVisibility.titleBn !== false : true;
  const showEnglish = componentsVisibility ? componentsVisibility.titleEn !== false : true;
  const showDialogue = componentsVisibility
    ? componentsVisibility.tagline !== false || componentsVisibility.caption !== false
    : true;
  const effectiveTitlesAll =
    componentsVisibility !== undefined
      ? Boolean(componentsVisibility.titlesAll && (showBangla || showEnglish || showDialogue))
      : Boolean((storeTitleConfig?.showTitles ?? true) && storeVisibility);

  const isEnabled = Boolean(isVisible && effectiveTitlesAll);

  // Iconic headline fallbacks for dynamic Bangla hero typography
  const DEFAULT_BANGLA_HEADLINES = ['শূন্য', 'আলো', 'সংঘাত', 'দৃষ্টির সীমানা'];
  const fallbackHeadline = DEFAULT_BANGLA_HEADLINES[shotIndex % DEFAULT_BANGLA_HEADLINES.length];

  const displayBangla = banglaTitle && banglaTitle.trim().length > 0 ? banglaTitle : fallbackHeadline;
  const displayEnglish =
    englishTitle && englishTitle.trim().length > 0
      ? englishTitle
      : `SHOT ${String(shotIndex + 1).padStart(3, '0')} // MASTER SEQUENCE`;
  const rawDialogue = directorNotes || subtitle;
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

  const activeTitleAlign: TitleAlign = propTitleAlign || storeTitleAlign || 'MID';
  const effectiveAlign = resolveEffectiveTitleAlign(activeTitleAlign, shotIndex, shotType);
  const procedural = getShotProceduralSpec(shotIndex);
  const { palette: procPalette, architecture: procArch, opticalFx: procFx } = procedural;

  // Lower-third-bar naturally anchors left unless explicitly aligned RIGHT
  const layoutEffectiveAlign: 'LEFT' | 'MID' | 'RIGHT' =
    presetConfig.layoutMode === 'lower-third-bar' && activeTitleAlign === 'MID'
      ? 'LEFT'
      : effectiveAlign;

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

  const horizontalAnchorLeft =
    layoutEffectiveAlign === 'LEFT'
      ? presetConfig.layoutMode === 'lower-third-bar'
        ? '5%'
        : '3rem'
      : layoutEffectiveAlign === 'RIGHT'
        ? presetConfig.layoutMode === 'lower-third-bar'
          ? '95%'
          : 'calc(100% - 3rem)'
        : '50%';

  const horizontalTranslateX =
    layoutEffectiveAlign === 'LEFT'
      ? '0%'
      : layoutEffectiveAlign === 'RIGHT'
        ? '-100%'
        : '-50%';

  const getVerticalAnchorStyle = (): React.CSSProperties => {
    switch (presetConfig.layoutMode) {
      case 'lower-third-bar':
        return {
          bottom: '12%',
          left: horizontalAnchorLeft,
          transform: `translate3d(${horizontalTranslateX}, ${verticalOffset}px, 0)`
        };
      case 'hud-bracket':
        return {
          top: '10%',
          left: horizontalAnchorLeft,
          transform: `translate3d(${horizontalTranslateX}, ${verticalOffset}px, 0)`
        };
      case 'brutalist-box':
        return {
          bottom: '14%',
          left: horizontalAnchorLeft,
          transform: `translate3d(${horizontalTranslateX}, ${verticalOffset}px, 0)`
        };
      case 'minimal-whisper':
        return {
          bottom: '14%',
          left: horizontalAnchorLeft,
          transform: `translate3d(${horizontalTranslateX}, ${verticalOffset}px, 0)`
        };
      case 'editorial-split':
      case 'center-hero':
      default:
        return {
          top: '50%',
          left: horizontalAnchorLeft,
          transform: `translate3d(${horizontalTranslateX}, calc(-50% + ${verticalOffset}px), 0)`
        };
    }
  };

  // Use preset's own fontScale directly, tempered gently by architecture multiplier only for default hero
  const isCustomPreset = presetConfig.presetId !== 'molten-gold' && presetConfig.presetId !== 'titanium-silver' && presetConfig.presetId !== 'neon-crimson';
  const effectiveFontSizePx = isCustomPreset
    ? Math.max(24, Math.round(presetConfig.fontScale))
    : Math.round(titleSizePx * scale * procArch.scaleMultiplier);
  const effectiveTrackingEm = isCustomPreset
    ? Math.max(0.01, tracking)
    : Math.max(0.02, tracking + procArch.trackingBoostEm);

  const hasGradientFill =
    Array.isArray(presetConfig.primaryGradient) && presetConfig.primaryGradient.length >= 2;
  const gradientBg = hasGradientFill
    ? `linear-gradient(90deg, ${presetConfig.primaryGradient!.join(', ')})`
    : undefined;

  const glowBlurPrimary = Math.max(0, Math.round(22 * glow));
  const glowBlurAmbient = Math.max(0, Math.round(44 * glow));

  const primaryTitleStyle: React.CSSProperties = {
    fontFamily: presetConfig.banglaFontFamily,
    fontSize: `${effectiveFontSizePx}px`,
    letterSpacing: `${effectiveTrackingEm}em`,
    textTransform: presetConfig.uppercase ? 'uppercase' : 'none',
    ...(hasGradientFill
      ? {
          backgroundImage: gradientBg,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          filter:
            glow > 0.02
              ? `drop-shadow(0 0 ${glowBlurPrimary}px ${presetConfig.glowColor}) drop-shadow(0 0 ${glowBlurAmbient}px ${presetConfig.glowColor})`
              : 'drop-shadow(0 2px 6px rgba(0,0,0,0.85))'
        }
      : {
          color: presetConfig.primaryColor,
          WebkitTextFillColor: presetConfig.primaryColor,
          WebkitTextStroke:
            presetConfig.strokeWidth > 0
              ? `${presetConfig.strokeWidth}px ${presetConfig.strokeColor}`
              : undefined,
          textShadow:
            glow > 0.02
              ? `0 2px 8px rgba(0,0,0,0.85), 0 0 ${glowBlurPrimary}px ${presetConfig.glowColor}, 0 0 ${glowBlurAmbient}px ${presetConfig.glowColor}`
              : '0 2px 10px rgba(0,0,0,0.9)'
        }),
    transformOrigin:
      layoutEffectiveAlign === 'LEFT'
        ? 'left center'
        : layoutEffectiveAlign === 'RIGHT'
          ? 'right center'
          : 'center center'
  };

  const englishSubtitleStyle: React.CSSProperties = {
    fontFamily: presetConfig.englishFontFamily,
    color: presetConfig.secondaryColor,
    textTransform: presetConfig.uppercase ? 'uppercase' : 'none',
    letterSpacing: `${Math.max(0.06, effectiveTrackingEm + (isCustomPreset ? 0.04 : 0.16))}em`,
    textShadow: '0 2px 10px rgba(0,0,0,0.92)'
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

  const motionClass = getMotionAnimationClass(presetConfig.motionAnimation);

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
      data-procedural-palette={procPalette.id}
      data-typography-arch={procArch.id}
      data-optical-fx={procFx.id}
      data-variant={variant}
      aria-hidden={!isEnabled}
    >
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
        className={`title-block relative w-full h-full ${
          isEnabled ? 'flex flex-col' : 'hidden opacity-0'
        }`}
      >
        {isEnabled && (
          <>
            {/* Dynamic Unified Preset Title Cluster */}
            <div
              key={`hero-title-cluster-${shotIndex}-${activePresetId}-${repaintRevision}`}
              data-title-cluster="true"
              className={`absolute w-max max-w-[calc(100%-3rem)] sm:max-w-[calc(100%-6rem)] flex flex-col py-2 transition-[left,transform] duration-300 ease-out ${clusterAlignClasses} !pl-0 !pr-0`}
              style={getVerticalAnchorStyle()}
            >
              <div
                className={`relative flex flex-col max-w-5xl ${motionClass} transition-all duration-300 ${blockAlignClasses} ${
                  presetConfig.layoutMode === 'lower-third-bar'
                    ? 'rounded-r-lg rounded-l-xs'
                    : presetConfig.layoutMode === 'editorial-split'
                      ? 'rounded-xs'
                      : presetConfig.layoutMode === 'brutalist-box'
                        ? 'rounded-none'
                        : presetConfig.layoutMode === 'hud-bracket'
                          ? 'rounded-xs'
                          : ''
                }`}
                style={plateStyle}
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
                  {/* Primary Title (Unified Preset Typography + Optional Chromatic RGB Split) */}
                  {showBangla && (
                    <div className="relative inline-block">
                      {hasRgbSplit && (
                        <>
                          <span
                            aria-hidden="true"
                            className="font-bold leading-tight select-none absolute inset-0 pointer-events-none opacity-60"
                            style={{
                              fontFamily: presetConfig.banglaFontFamily,
                              fontSize: `${effectiveFontSizePx}px`,
                              letterSpacing: `${effectiveTrackingEm}em`,
                              textTransform: presetConfig.uppercase ? 'uppercase' : 'none',
                              color: '#00F0FF',
                              transform: `translate3d(-${rgbShiftPx}px, 1px, 0)`
                            }}
                          >
                            {displayBangla}
                          </span>
                          <span
                            aria-hidden="true"
                            className="font-bold leading-tight select-none absolute inset-0 pointer-events-none opacity-60"
                            style={{
                              fontFamily: presetConfig.banglaFontFamily,
                              fontSize: `${effectiveFontSizePx}px`,
                              letterSpacing: `${effectiveTrackingEm}em`,
                              textTransform: presetConfig.uppercase ? 'uppercase' : 'none',
                              color: '#FF0055',
                              transform: `translate3d(${rgbShiftPx}px, -1px, 0)`
                            }}
                          >
                            {displayBangla}
                          </span>
                        </>
                      )}
                      <h1
                        key={`bangla-title-${shotIndex}-${activePresetId}`}
                        className={`relative font-black leading-tight select-none ${
                          procFx.hasStrobePulse || presetConfig.category === 'DOPAMINE'
                            ? 'animate-pulse'
                            : ''
                        }`}
                        style={primaryTitleStyle}
                      >
                        {displayBangla}
                      </h1>
                    </div>
                  )}

                  {/* Secondary Subtitle + Preset Divider */}
                  {showEnglish && (
                    <div className={`mt-1.5 sm:mt-2.5 flex flex-col transition-all duration-300 ${blockAlignClasses}`}>
                      <p
                        className="text-xs sm:text-sm md:text-base font-bold"
                        style={englishSubtitleStyle}
                      >
                        {displayEnglish}
                      </p>

                      {renderAccentDivider()}

                      {cameraInfo && presetConfig.layoutMode !== 'minimal-whisper' && (
                        <span
                          className="font-mono text-[9px] tracking-[0.25em] uppercase mt-1.5 opacity-65"
                          style={{ color: presetConfig.secondaryColor }}
                        >
                          {cameraInfo}
                        </span>
                      )}
                    </div>
                  )}

                  {/* If lower-plate layout is active and dialogue exists, display subtle metadata line inside card */}
                  {isBottomPlateLayout && showDialogue && displayDialogue && (
                    <p
                      className="mt-1.5 text-[11px] italic opacity-85 max-w-md truncate"
                      style={{
                        fontFamily: presetConfig.englishFontFamily,
                        color: presetConfig.secondaryColor
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

            {/* Narrative Line / Dialogue Card (Rendered at bottom-stage for center/HUD layouts) */}
            {!isBottomPlateLayout && showDialogue && displayDialogue && (
              <div
                className={`absolute bottom-5 sm:bottom-8 z-20 pointer-events-none w-max max-w-[calc(100%-3rem)] sm:max-w-xl px-2 transition-[left,transform] duration-300 ease-out ${
                  effectiveAlign === 'LEFT'
                    ? 'text-left'
                    : effectiveAlign === 'RIGHT'
                      ? 'text-right'
                      : 'text-center'
                }`}
                style={{
                  left: horizontalAnchorLeft,
                  transform: `translate3d(${horizontalTranslateX}, 0, 0)`
                }}
              >
                <div
                  className="inline-flex items-center gap-2 bg-[#141417]/55 backdrop-blur-xl backdrop-saturate-150 border text-[#F4F4F5]/95 px-5 py-1.5 rounded-full text-xs sm:text-sm italic shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ borderColor: `${accentHex}44` }}
                >
                  <span>"{displayDialogue}"</span>
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
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0B0B0D]/95 border border-white/[0.07] rounded-md p-3 font-mono text-[10px] text-[#8E8E93] space-y-2.5 backdrop-blur-2xl shadow-2xl animate-in fade-in duration-150 tabular-nums">
              <div className="flex items-center justify-between text-[#F4F4F5] font-bold text-[9px] border-b border-white/[0.07] pb-1.5">
                <span>HERO TITLE ENGINE</span>
                <span className="text-[8px] bg-[#F59E0B]/15 border border-[#F59E0B]/40 px-1 py-0.2 rounded text-[#F59E0B] font-mono truncate max-w-[120px]">
                  {presetConfig.presetName}
                </span>
              </div>

              {/* Preset Selector */}
              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setTitlePreset('molten-gold')}
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
                    activeHeroPreset === 'molten-gold' && activePresetId === 'molten-gold'
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                      : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                  }`}
                >
                  GOLD
                </button>
                <button
                  type="button"
                  onClick={() => setTitlePreset('titanium-silver')}
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
                    activeHeroPreset === 'titanium-silver'
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                      : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                  }`}
                >
                  SILVER
                </button>
                <button
                  type="button"
                  onClick={() => setTitlePreset('neon-crimson')}
                  className={`p-1 text-[8px] font-bold rounded border cursor-pointer transition-colors ${
                    activeHeroPreset === 'neon-crimson'
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F4F4F5]'
                      : 'bg-[#141417] border-white/[0.07] text-[#8E8E93] hover:text-[#F4F4F5]'
                  }`}
                >
                  CRIMSON
                </button>
              </div>

              {/* Title Size Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                  <span>TITLE SIZE</span>
                  <span className="text-[#F59E0B] font-bold tabular-nums">{titleSizePx}px</span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="120"
                  step="2"
                  value={titleSizePx}
                  onChange={(e) => setTitleSize(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
                />
              </div>

              {/* Glow Intensity Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                  <span>GLOW INTENSITY</span>
                  <span className="text-[#F59E0B] font-bold tabular-nums">{Math.round(glow * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={glow}
                  onChange={(e) => setTitleGlowIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
                />
              </div>

              {/* Vertical Offset Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                  <span>VERTICAL OFFSET</span>
                  <span className="text-[#F59E0B] font-bold tabular-nums">{verticalOffset}px</span>
                </div>
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="5"
                  value={verticalOffset}
                  onChange={(e) => setTitleVerticalOffset(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
                />
              </div>

              {/* Tracking Slider */}
              <div>
                <div className="flex justify-between text-[8.5px] text-[#8E8E93]">
                  <span>TRACKING</span>
                  <span className="text-[#F59E0B] font-bold tabular-nums">{tracking.toFixed(2)}em</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.50"
                  step="0.02"
                  value={tracking}
                  onChange={(e) => setTitleTracking(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#141417] accent-[#F59E0B] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
