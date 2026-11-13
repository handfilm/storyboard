/**
 * @file /src/services/titleCanvasRenderer.ts
 * @description 1:1 WYSIWYG 2D Canvas Title Preset Compositor.
 *
 * Shared by:
 * - `videoExportEngine.ts` (WebCodecs MP4, MediaRecorder MP4/WebM, VP9 WebM, PNG Sequence ZIP)
 * - `UnifiedExportStudio.tsx` (Live Canvas Monitor Preview)
 * - `interchangeExport.ts` (Snapshot / Cockpit frame capture)
 *
 * Supports all 6 `TitleLayoutMode` architectures (`center-hero`, `lower-third-bar`,
 * `hud-bracket`, `brutalist-box`, `editorial-split`, `minimal-whisper`), Bangla + English
 * font families, solid & gradient fills, vector strokes, backdrop plates, RGB chromatic split,
 * and keyframed time-driven entrance motion.
 */

import {
  TitlePresetConfig,
  TitleZone9,
  TitleKineticEntrance,
  TitleLayerKey,
  TitleLayerStyle,
  TitleKeyframeConfig,
  TitleMotionAnimation
} from '../types/titlePreset';
import { getZone9Metadata, isValidTitleZone9 } from './titleChoreographyEngine';
import {
  buildDefaultTitleLayers,
  DEFAULT_TITLE_KEYFRAMES,
  segmentTextGraphemes
} from '../constants/titleTemplates';

export interface TitleCanvasCompositeMeta {
  eyebrowText?: string;
  banglaTitle?: string;
  englishTitle?: string;
  dialogue?: string;
  creditsText?: string;
  cameraInfo?: string;
  effectiveAlign?: 'LEFT' | 'MID' | 'RIGHT';
  zone9?: TitleZone9;
  kineticEntrance?: TitleKineticEntrance;
  opacity?: number;
  beatSlamScale?: number;
  durationSec?: number;
  layers?: Partial<Record<TitleLayerKey, Partial<TitleLayerStyle>>>;
  keyframes?: Partial<TitleKeyframeConfig>;
}

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function evaluateKeyframeEasing(
  t: number,
  curve?: TitleKeyframeConfig['easingCurve']
): number {
  const x = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'spring-overshoot': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    case 'linear-hud':
      return x;
    case 'whip-slam':
      return 1 - Math.pow(1 - x, 4);
    case 'cubic-out':
    default:
      return easeOutCubic(x);
  }
}

function drawRoundedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function extractBorderColor(borderStr?: string, fallback: string = 'rgba(255,255,255,0.22)'): {
  color: string;
  width: number;
  dashed: boolean;
} {
  if (!borderStr || borderStr === 'none') {
    return { color: fallback, width: 0, dashed: false };
  }
  const widthMatch = borderStr.match(/([\d.]+)px/);
  const width = widthMatch ? parseFloat(widthMatch[1]) : 1;
  const dashed = /dashed/i.test(borderStr);
  const colorMatch = borderStr.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})/);
  return {
    color: colorMatch ? colorMatch[1] : fallback,
    width,
    dashed
  };
}

function setCanvasLetterSpacing(ctx: CanvasRenderingContext2D, em: number): void {
  try {
    if ('letterSpacing' in ctx) {
      (ctx as any).letterSpacing = `${Math.max(0, em).toFixed(3)}em`;
    }
  } catch {
    // ignore unsupported environments
  }
}

function drawHeadlineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  config: TitlePresetConfig,
  scaleFactor: number,
  glitchJitterPx: number
): void {
  if (!text) return;
  const fontPx = Math.max(20, Math.round((config.fontScale || 72) * scaleFactor * 0.72));
  const rendered = config.uppercase ? text.toUpperCase() : text;
  const fontSpec = `900 ${fontPx}px ${config.banglaFontFamily || '"Anek Bangla", sans-serif'}`;

  // Optional Chromatic RGB Aberration Split Copies
  if (config.chromaticAberration > 0) {
    const shift = Math.max(2, Math.round((config.chromaticAberration / 20) * scaleFactor + glitchJitterPx));
    ctx.save();
    ctx.font = fontSpec;
    setCanvasLetterSpacing(ctx, Math.min(0.28, config.letterTracking || 0.08));
    ctx.globalAlpha *= 0.62;
    ctx.fillStyle = '#00F0FF';
    ctx.fillText(rendered, x - shift, y + Math.max(1, scaleFactor), maxW);
    ctx.fillStyle = '#FF0055';
    ctx.fillText(rendered, x + shift, y - Math.max(1, scaleFactor), maxW);
    ctx.restore();
  }

  ctx.save();
  ctx.font = fontSpec;
  setCanvasLetterSpacing(ctx, Math.min(0.28, config.letterTracking || 0.08));
  ctx.shadowColor = config.glowColor || 'rgba(245, 166, 35, 0.75)';
  ctx.shadowBlur = Math.max(0, Math.round(24 * (config.glowIntensity ?? 1.0) * scaleFactor));

  // Vector outline stroke if configured (e.g. Rap/Brutalist)
  if (config.strokeWidth > 0 && config.strokeColor && config.strokeColor !== 'transparent') {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = config.strokeColor;
    ctx.lineWidth = Math.max(1.5, config.strokeWidth * scaleFactor * 1.15);
    ctx.strokeText(rendered, x, y, maxW);
  }

  // Gradient OR crisp solid fill
  if (Array.isArray(config.primaryGradient) && config.primaryGradient.length >= 2) {
    const span = Math.round(260 * scaleFactor);
    const grad = ctx.createLinearGradient(x - span, y, x + span, y);
    const stops: readonly string[] = config.primaryGradient;
    stops.forEach((hex, idx) => {
      grad.addColorStop(stops.length <= 1 ? 0 : idx / (stops.length - 1), hex);
    });
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = config.primaryColor || '#F5A623';
  }

  ctx.fillText(rendered, x, y, maxW);
  ctx.restore();
}

/**
 * Renders any `TitlePresetConfig` faithfully onto a 2D Canvas for live Monitor Preview
 * and WebCodecs / MediaRecorder MP4 export.
 */
export function renderTitlePresetToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  meta: TitleCanvasCompositeMeta,
  config: TitlePresetConfig,
  timeSec: number = 0
): void {
  const layers = buildDefaultTitleLayers(config, meta.layers);
  const keyframes: TitleKeyframeConfig = {
    ...DEFAULT_TITLE_KEYFRAMES,
    inAnim: config.motionAnimation,
    ...(meta.keyframes || {}),
  };

  const eyebrowText = layers.eyebrow.enabled ? (meta.eyebrowText || '') : '';
  const banglaTitle = layers.bangla.enabled ? (meta.banglaTitle || '') : '';
  const englishTitle = layers.english.enabled ? (meta.englishTitle || '') : '';
  const dialogue = layers.subtitle.enabled ? (meta.dialogue || '') : '';
  const creditsText = layers.credits.enabled ? (meta.creditsText || '') : '';

  if (!eyebrowText && !banglaTitle && !englishTitle && !dialogue && !creditsText) return;

  const baseOpacity = Math.max(0, Math.min(1, meta.opacity ?? 1));
  if (baseOpacity <= 0.005) return;

  const scaleFactor = Math.min(height / 720, Math.max(0.58, width / 1080));
  const rawTime = Math.max(0, timeSec);
  const delaySec = Math.max(0, keyframes.delaySec || 0);
  const animDur = Math.max(0.1, keyframes.durationSec || 0.55);
  const safeTime = Math.max(0, rawTime - delaySec);
  if (rawTime < delaySec * 0.98) {
    return;
  }

  // Compute IN entrance motion transform
  let motionOpacity = 1;
  let motionScale = meta.beatSlamScale && meta.beatSlamScale > 0 ? meta.beatSlamScale : 1;
  let motionScaleY = 1;
  let motionTranslateX = 0;
  let motionTranslateY = 0;
  let glitchJitterPx = 0;
  let visibleEnglish = englishTitle;
  let visibleBangla = banglaTitle;

  const inAnim: TitleMotionAnimation = keyframes.inAnim || config.motionAnimation;
  const pNorm = Math.min(1, safeTime / animDur);
  const easedP = evaluateKeyframeEasing(pNorm, keyframes.easingCurve);

  switch (inAnim) {
    case 'kinetic-slam': {
      motionOpacity = Math.min(1, safeTime / (animDur * 0.35));
      motionScale *= 1.24 - 0.24 * easedP;
      break;
    }
    case 'chopper-staccato': {
      motionOpacity = Math.min(1, safeTime / (animDur * 0.32));
      motionScale *= safeTime < animDur ? 0.84 + 0.16 * easedP : 1 + Math.sin(safeTime * 14) * 0.015;
      break;
    }
    case 'typewriter-hud':
    case 'typewriter-telemetry': {
      motionOpacity = Math.min(1, safeTime / 0.12);
      if (safeTime < animDur && englishTitle.length > 0) {
        const chars = Math.max(1, Math.floor((safeTime / animDur) * englishTitle.length));
        visibleEnglish = englishTitle.slice(0, chars);
      }
      if (safeTime < animDur && banglaTitle.length > 0) {
        const graphemes = segmentTextGraphemes(banglaTitle);
        const count = Math.max(1, Math.ceil((safeTime / animDur) * graphemes.length));
        visibleBangla = graphemes.slice(0, count).join('');
      }
      break;
    }
    case 'neon-glitch-rgb':
    case 'glitch-slice': {
      motionOpacity = Math.min(1, safeTime / 0.12);
      if (safeTime < animDur) {
        glitchJitterPx = Math.sin(safeTime * 65) * 4 * scaleFactor;
        motionTranslateX = Math.sin(safeTime * 50) * 5 * scaleFactor;
      } else {
        glitchJitterPx = Math.abs(Math.sin(safeTime * 12)) * 2 * scaleFactor;
      }
      break;
    }
    case 'lower-third-slide': {
      motionOpacity = easedP;
      motionTranslateX = -(1 - easedP) * 48 * scaleFactor;
      break;
    }
    case '3d-flip': {
      motionOpacity = Math.min(1, easedP * 1.3);
      motionScaleY = 0.25 + 0.75 * easedP;
      motionTranslateY = (1 - easedP) * 18 * scaleFactor;
      break;
    }
    case 'anamorphic-sweep': {
      motionOpacity = Math.min(1, easedP * 1.25);
      motionTranslateX = -(1 - easedP) * 24 * scaleFactor;
      motionScale *= 1 + (1 - easedP) * 0.05;
      break;
    }
    case 'cinema-credit-crawl': {
      motionOpacity = Math.min(1, safeTime / 0.25);
      motionTranslateY = (1 - easedP) * 36 * scaleFactor;
      break;
    }
    case 'viral-pop-bounce': {
      motionOpacity = Math.min(1, safeTime / 0.1);
      motionScale *= 0.65 + 0.35 * easedP;
      break;
    }
    case 'subtle-depth-drift': {
      motionOpacity = easedP;
      motionScale *= 1.06 - 0.06 * easedP;
      break;
    }
    case 'slow-cinema-fade':
    default: {
      motionOpacity = easedP;
      motionScale *= 0.96 + 0.04 * easedP;
      break;
    }
  }

  // Optional Stagger progressive grapheme/word reveal
  if (keyframes.staggerMode && keyframes.staggerMode !== 'block' && safeTime < animDur) {
    if (visibleBangla) {
      const units =
        keyframes.staggerMode === 'word'
          ? visibleBangla.split(' ')
          : segmentTextGraphemes(visibleBangla);
      const count = Math.max(1, Math.ceil((safeTime / animDur) * units.length));
      visibleBangla =
        keyframes.staggerMode === 'word'
          ? units.slice(0, count).join(' ')
          : units.slice(0, count).join('');
    }
  }

  // Subtle MID ambient drift during hold phase
  if (safeTime > animDur && keyframes.midAnim === 'subtle-depth-drift') {
    motionScale *= 1 + Math.sin(safeTime * 1.2) * 0.012;
  }

  // OUT exit dissolve at end of clip
  if (typeof meta.durationSec === 'number' && meta.durationSec > 0.8 && rawTime > meta.durationSec - 0.25) {
    const outRem = Math.max(0, meta.durationSec - rawTime) / 0.25;
    motionOpacity *= Math.max(0.05, outRem);
    if (keyframes.outAnim === 'slide-out') {
      motionTranslateY -= (1 - outRem) * 12 * scaleFactor;
    }
  }

  if (config.category === 'DOPAMINE') {
    const pulse = 1 + Math.sin(safeTime * 16) * 0.025;
    motionScale *= pulse;
  }

  // Directional 9-Zone Kinetic Entrance Choreography (1:1 parity with Stage CSS keyframes)
  if (meta.kineticEntrance === 'slide-from-left') {
    const p = easeOutCubic(safeTime / 0.42);
    motionOpacity = Math.min(motionOpacity, p);
    motionTranslateX += -(1 - p) * 36 * scaleFactor;
  } else if (meta.kineticEntrance === 'slide-from-right') {
    const p = easeOutCubic(safeTime / 0.42);
    motionOpacity = Math.min(motionOpacity, p);
    motionTranslateX += (1 - p) * 36 * scaleFactor;
  } else if (meta.kineticEntrance === 'center-bloom') {
    const p = easeOutCubic(safeTime / 0.44);
    motionOpacity = Math.min(motionOpacity, p);
    motionScale *= 0.92 + 0.08 * p;
  }

  const finalOpacity = Math.max(0, Math.min(1, baseOpacity * motionOpacity));
  if (finalOpacity <= 0.01) return;

  const explicitZoneMeta = meta.zone9 && isValidTitleZone9(meta.zone9)
    ? getZone9Metadata(meta.zone9)
    : null;

  const rawAlign = explicitZoneMeta ? explicitZoneMeta.col : (meta.effectiveAlign || 'MID');
  const effectiveAlign: 'LEFT' | 'MID' | 'RIGHT' =
    !explicitZoneMeta && config.layoutMode === 'lower-third-bar' && rawAlign === 'MID'
      ? 'LEFT'
      : rawAlign;

  // 90% Title-Safe horizontal margins (5.5% inset from edges, 50% center)
  const padX = Math.round(width * 0.055);
  const anchorX =
    effectiveAlign === 'LEFT'
      ? padX
      : effectiveAlign === 'RIGHT'
        ? width - padX
        : Math.round(width * 0.5);
  const textAlign: CanvasTextAlign =
    effectiveAlign === 'LEFT' ? 'left' : effectiveAlign === 'RIGHT' ? 'right' : 'center';

  const banglaFontPx = Math.max(20, Math.round((config.fontScale || 72) * scaleFactor * 0.72));
  const englishFontPx = Math.max(11, Math.round(17 * scaleFactor));
  const dialogueFontPx = Math.max(10, Math.round(14 * scaleFactor));
  const maxTextW = Math.round(width * 0.84);
  const offsetY = (config.verticalOffset || 0) * scaleFactor;
  const accentHex = config.backdropPlate?.accentBarColor || config.primaryColor || '#F5A623';

  // Vertical anchor from explicit 9-zone grid OR per layoutMode (1:1 parity with Stage)
  let anchorY = Math.round(height * 0.48 + offsetY);
  if (explicitZoneMeta) {
    if (explicitZoneMeta.row === 'top') {
      anchorY = Math.round(height * 0.165 + offsetY);
    } else if (explicitZoneMeta.row === 'lower') {
      anchorY = Math.round(height * 0.81 + offsetY);
    } else {
      anchorY = Math.round(height * 0.48 + offsetY);
    }
  } else if (config.layoutMode === 'lower-third-bar') {
    anchorY = Math.round(height * 0.81 + offsetY);
  } else if (config.layoutMode === 'hud-bracket') {
    anchorY = Math.round(height * 0.17 + offsetY);
  } else if (config.layoutMode === 'brutalist-box') {
    anchorY = Math.round(height * 0.79 + offsetY);
  } else if (config.layoutMode === 'minimal-whisper') {
    anchorY = Math.round(height * 0.82 + offsetY);
  }

  ctx.save();
  ctx.globalAlpha = finalOpacity;
  ctx.translate(anchorX + motionTranslateX, anchorY + motionTranslateY);
  ctx.scale(motionScale, motionScale * motionScaleY);
  ctx.translate(-anchorX, -anchorY);

  // Measure line widths for plate sizing
  ctx.save();
  ctx.font = `900 ${banglaFontPx}px ${config.banglaFontFamily || '"Anek Bangla", sans-serif'}`;
  const primaryDisplay = config.uppercase ? banglaTitle.toUpperCase() : banglaTitle;
  const wPrimary = primaryDisplay ? Math.min(maxTextW, ctx.measureText(primaryDisplay).width) : 0;

  ctx.font = `700 ${englishFontPx}px ${config.englishFontFamily || '"JetBrains Mono", monospace'}`;
  const subDisplay = config.uppercase ? visibleEnglish.toUpperCase() : visibleEnglish;
  const wSub = subDisplay ? Math.min(maxTextW, ctx.measureText(subDisplay).width) : 0;

  ctx.font = `italic 500 ${dialogueFontPx}px ${config.englishFontFamily || 'sans-serif'}`;
  const cleanDialogue =
    dialogue && /^\[(?:🌪️\s*)?DOPAMINE:/i.test(dialogue.trim()) && config.category !== 'DOPAMINE'
      ? ''
      : dialogue;
  const isLowerRowZone = explicitZoneMeta?.row === 'lower';
  const isLowerPlate =
    isLowerRowZone ||
    config.layoutMode === 'lower-third-bar' ||
    config.layoutMode === 'brutalist-box' ||
    config.layoutMode === 'minimal-whisper';
  const wDiag =
    isLowerPlate && cleanDialogue
      ? Math.min(maxTextW, ctx.measureText(`"${cleanDialogue}"`).width)
      : 0;
  ctx.restore();

  const contentW = Math.max(Math.round(200 * scaleFactor), wPrimary, wSub, wDiag);
  const platePadX = Math.round(24 * scaleFactor);
  const platePadY = Math.round(14 * scaleFactor);

  const primaryLineY = anchorY - Math.round(englishFontPx * 0.85);
  const subLineY = primaryLineY + Math.round(banglaFontPx * 0.68 + 8 * scaleFactor);
  const diagLineY = subLineY + Math.round(englishFontPx * 1.15);

  const topEdge =
    (banglaTitle ? primaryLineY - banglaFontPx * 0.56 : subLineY - englishFontPx * 0.6) -
    (config.layoutMode === 'hud-bracket' ? Math.round(18 * scaleFactor) : 0) -
    platePadY;
  const bottomEdge =
    (isLowerPlate && cleanDialogue
      ? diagLineY + dialogueFontPx * 0.65
      : englishTitle
        ? subLineY + englishFontPx * 0.75
        : primaryLineY + banglaFontPx * 0.52) + platePadY;

  const boxW = Math.min(width * 0.9, contentW + platePadX * 2 + (config.layoutMode === 'lower-third-bar' ? 12 * scaleFactor : 0));
  const boxH = Math.max(Math.round(52 * scaleFactor), bottomEdge - topEdge);
  const boxX =
    effectiveAlign === 'LEFT'
      ? anchorX - Math.round(8 * scaleFactor)
      : effectiveAlign === 'RIGHT'
        ? anchorX + Math.round(8 * scaleFactor) - boxW
        : anchorX - boxW / 2;
  const boxY = topEdge;

  // Draw Backdrop Plate when enabled
  if (config.backdropPlate?.enabled) {
    ctx.save();
    const borderInfo = extractBorderColor(config.backdropPlate.border, accentHex);

    if (config.layoutMode === 'brutalist-box') {
      // Hard brutalist offset drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(
        boxX + Math.round(6 * scaleFactor),
        boxY + Math.round(6 * scaleFactor),
        boxW,
        boxH
      );
    }

    ctx.fillStyle = config.backdropPlate.background || 'rgba(10, 10, 14, 0.84)';
    const radius =
      config.layoutMode === 'brutalist-box'
        ? 0
        : config.layoutMode === 'lower-third-bar'
          ? Math.round(8 * scaleFactor)
          : Math.round(4 * scaleFactor);

    drawRoundedBox(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    if (borderInfo.width > 0) {
      ctx.strokeStyle = borderInfo.color;
      ctx.lineWidth = Math.max(1, borderInfo.width * scaleFactor);
      if (borderInfo.dashed && typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([Math.round(6 * scaleFactor), Math.round(4 * scaleFactor)]);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Layout-specific accents
  if (config.layoutMode === 'lower-third-bar') {
    ctx.save();
    ctx.fillStyle = accentHex;
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = Math.round(12 * scaleFactor);
    const barW = Math.max(3, Math.round(4.5 * scaleFactor));
    const barX = effectiveAlign === 'RIGHT' ? boxX + boxW - barW : boxX;
    drawRoundedBox(ctx, barX, boxY + Math.round(6 * scaleFactor), barW, boxH - Math.round(12 * scaleFactor), barW / 2);
    ctx.fill();
    ctx.restore();
  } else if (config.layoutMode === 'hud-bracket') {
    ctx.save();
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = Math.max(1.5, Math.round(2 * scaleFactor));
    const arm = Math.round(12 * scaleFactor);
    const corners: Array<[number, number, number, number]> = [
      [boxX, boxY, 1, 1],
      [boxX + boxW, boxY, -1, 1],
      [boxX, boxY + boxH, 1, -1],
      [boxX + boxW, boxY + boxH, -1, -1]
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * arm, cy);
      ctx.stroke();
    }
    // HUD telemetry header tag
    ctx.font = `700 ${Math.max(9, Math.round(10 * scaleFactor))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = accentHex;
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'middle';
    const textX =
      effectiveAlign === 'LEFT'
        ? boxX + platePadX
        : effectiveAlign === 'RIGHT'
          ? boxX + boxW - platePadX
          : anchorX;
    ctx.fillText(`SYS // ${config.presetName}`, textX, boxY + Math.round(14 * scaleFactor), boxW - platePadX);
    ctx.restore();
  } else if (config.layoutMode === 'editorial-split') {
    ctx.save();
    ctx.fillStyle = config.primaryColor || '#F8FAFC';
    ctx.globalAlpha *= 0.65;
    ctx.fillRect(boxX + Math.round(12 * scaleFactor), boxY + Math.round(4 * scaleFactor), boxW - Math.round(24 * scaleFactor), Math.max(1, scaleFactor));
    ctx.fillRect(boxX + Math.round(12 * scaleFactor), boxY + boxH - Math.round(5 * scaleFactor), boxW - Math.round(24 * scaleFactor), Math.max(1, scaleFactor));
    ctx.restore();
  }

  // Text horizontal draw coordinate inside plate
  const textX =
    config.layoutMode === 'lower-third-bar'
      ? effectiveAlign === 'RIGHT'
        ? boxX + boxW - platePadX
        : boxX + platePadX + Math.round(8 * scaleFactor)
      : anchorX;

  ctx.textAlign = textAlign;
  ctx.textBaseline = 'middle';

  // Eyebrow Kicker (Layer 1)
  if (eyebrowText) {
    ctx.save();
    const eyePx = Math.max(9, Math.round((layers.eyebrow.fontSize || 12) * scaleFactor));
    ctx.font = `${layers.eyebrow.fontWeight || 700} ${eyePx}px ${layers.eyebrow.fontFamily}`;
    setCanvasLetterSpacing(ctx, layers.eyebrow.letterSpacing ?? 0.22);
    ctx.fillStyle = layers.eyebrow.color || accentHex;
    ctx.fillText(
      layers.eyebrow.textTransform === 'uppercase' ? eyebrowText.toUpperCase() : eyebrowText,
      textX,
      primaryLineY - Math.round(banglaFontPx * 0.65),
      maxTextW
    );
    ctx.restore();
  }

  // Primary Headline (Layer 2)
  if (visibleBangla) {
    const effectiveCfg: TitlePresetConfig = {
      ...config,
      banglaFontFamily: layers.bangla.fontFamily || config.banglaFontFamily,
      fontScale: layers.bangla.fontSize || config.fontScale,
      letterTracking: layers.bangla.letterSpacing ?? config.letterTracking,
      primaryColor: layers.bangla.color || config.primaryColor,
      primaryGradient: layers.bangla.gradientStops ?? config.primaryGradient,
      strokeWidth: layers.bangla.strokeWidth ?? config.strokeWidth,
      strokeColor: layers.bangla.strokeColor || config.strokeColor,
      glowIntensity: layers.bangla.bloomIntensity ?? config.glowIntensity,
    };
    drawHeadlineText(ctx, visibleBangla, textX, primaryLineY, maxTextW, effectiveCfg, scaleFactor, glitchJitterPx);
  }

  // Secondary Subtitle (Layer 3)
  if (visibleEnglish) {
    ctx.save();
    const subStr = layers.english.textTransform === 'none'
      ? visibleEnglish
      : (config.uppercase || layers.english.textTransform === 'uppercase' ? visibleEnglish.toUpperCase() : visibleEnglish);
    const enPx = Math.max(10, Math.round((layers.english.fontSize || 16) * scaleFactor));
    ctx.font = `${layers.english.fontWeight || 700} ${enPx}px ${layers.english.fontFamily || config.englishFontFamily || '"JetBrains Mono", monospace'}`;
    setCanvasLetterSpacing(ctx, Math.max(0.04, layers.english.letterSpacing ?? (config.letterTracking || 0.15) + 0.08));
    ctx.fillStyle = layers.english.color || config.secondaryColor || '#E4E4E7';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = Math.round(10 * scaleFactor);
    ctx.fillText(subStr, textX, subLineY, maxTextW);
    ctx.restore();
  }

  // Credits Line (Layer 5)
  if (creditsText) {
    ctx.save();
    const credPx = Math.max(9, Math.round((layers.credits.fontSize || 11) * scaleFactor));
    ctx.font = `${layers.credits.fontWeight || 600} ${credPx}px ${layers.credits.fontFamily}`;
    setCanvasLetterSpacing(ctx, layers.credits.letterSpacing ?? 0.2);
    ctx.fillStyle = layers.credits.color || '#CBD5E1';
    ctx.fillText(
      layers.credits.textTransform === 'uppercase' ? creditsText.toUpperCase() : creditsText,
      textX,
      subLineY + Math.round(24 * scaleFactor),
      maxTextW
    );
    ctx.restore();
  }

  // Subtle inline dialogue for bottom-plate layouts
  if (isLowerPlate && cleanDialogue) {
    ctx.save();
    ctx.font = `italic 500 ${dialogueFontPx}px ${layers.subtitle.fontFamily || config.englishFontFamily || 'sans-serif'}`;
    ctx.fillStyle = layers.subtitle.color || config.secondaryColor || '#D4D4D8';
    ctx.globalAlpha *= 0.85;
    ctx.fillText(`"${cleanDialogue}"`, textX, diagLineY, maxTextW);
    ctx.restore();
  }

  // Anamorphic/Accent Divider for center-hero / hud / editorial / minimal
  if (
    visibleEnglish &&
    config.layoutMode !== 'lower-third-bar' &&
    config.layoutMode !== 'brutalist-box'
  ) {
    ctx.save();
    const streakW = Math.round(
      (config.layoutMode === 'minimal-whisper' ? 90 : 170) * scaleFactor
    );
    const streakStart =
      effectiveAlign === 'LEFT'
        ? textX
        : effectiveAlign === 'RIGHT'
          ? textX - streakW
          : textX - streakW / 2;
    const streakY = subLineY + Math.round(16 * scaleFactor);
    const streakGrad = ctx.createLinearGradient(streakStart, streakY, streakStart + streakW, streakY);
    streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
    streakGrad.addColorStop(0.5, accentHex);
    streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streakGrad;
    ctx.shadowColor = config.glowColor || accentHex;
    ctx.shadowBlur = Math.round(14 * (config.glowIntensity ?? 1) * scaleFactor);
    ctx.fillRect(streakStart, streakY, streakW, Math.max(1.5, Math.round(2 * scaleFactor)));
    ctx.restore();
  }

  ctx.restore();

  // Floating Dialogue Capsule at stage bottom for non-bottom-plate modes
  if (!isLowerPlate && cleanDialogue) {
    ctx.save();
    ctx.globalAlpha = finalOpacity;
    const quoted = `"${cleanDialogue}"`;
    ctx.font = `italic 500 ${dialogueFontPx}px ui-sans-serif, system-ui, sans-serif`;
    const textW = ctx.measureText(quoted).width;
    const pillPadX = Math.round(22 * scaleFactor);
    const pillW = Math.min(width * 0.82, textW + pillPadX * 2);
    const pillH = Math.round(32 * scaleFactor);
    const pillX =
      effectiveAlign === 'LEFT'
        ? anchorX
        : effectiveAlign === 'RIGHT'
          ? anchorX - pillW
          : anchorX - pillW / 2;
    const pillY = height - Math.round(52 * scaleFactor) - pillH / 2;

    ctx.fillStyle = 'rgba(14, 14, 18, 0.68)';
    ctx.strokeStyle = `${accentHex}70`;
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scaleFactor));
    drawRoundedBox(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = config.secondaryColor || '#F4F4F5';
    ctx.fillText(quoted, pillX + pillW / 2, pillY + pillH / 2, pillW - pillPadX);
    ctx.restore();
  }
}
