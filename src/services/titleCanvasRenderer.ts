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

import { TitlePresetConfig } from '../types/titlePreset';

export interface TitleCanvasCompositeMeta {
  banglaTitle?: string;
  englishTitle?: string;
  dialogue?: string;
  cameraInfo?: string;
  effectiveAlign?: 'LEFT' | 'MID' | 'RIGHT';
  opacity?: number;
  beatSlamScale?: number;
}

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
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
  const banglaTitle = meta.banglaTitle || '';
  const englishTitle = meta.englishTitle || '';
  const dialogue = meta.dialogue || '';
  if (!banglaTitle && !englishTitle && !dialogue) return;

  const baseOpacity = Math.max(0, Math.min(1, meta.opacity ?? 1));
  if (baseOpacity <= 0.005) return;

  const scaleFactor = Math.min(height / 720, Math.max(0.58, width / 1080));
  const safeTime = Math.max(0, timeSec);

  // Compute entrance motion transform
  let motionOpacity = 1;
  let motionScale = meta.beatSlamScale && meta.beatSlamScale > 0 ? meta.beatSlamScale : 1;
  let motionTranslateX = 0;
  let motionTranslateY = 0;
  let glitchJitterPx = 0;
  let visibleEnglish = englishTitle;

  switch (config.motionAnimation) {
    case 'kinetic-slam': {
      const p = easeOutCubic(safeTime / 0.35);
      motionOpacity = Math.min(1, safeTime / 0.12);
      motionScale *= 1.24 - 0.24 * p;
      break;
    }
    case 'chopper-staccato': {
      const p = easeOutCubic(safeTime / 0.24);
      motionOpacity = Math.min(1, safeTime / 0.08);
      motionScale *= safeTime < 0.24 ? 0.84 + 0.16 * p : 1 + Math.sin(safeTime * 14) * 0.015;
      break;
    }
    case 'typewriter-hud': {
      motionOpacity = Math.min(1, safeTime / 0.12);
      if (safeTime < 0.45 && englishTitle.length > 0) {
        const chars = Math.max(1, Math.floor((safeTime / 0.45) * englishTitle.length));
        visibleEnglish = englishTitle.slice(0, chars);
      }
      break;
    }
    case 'neon-glitch-rgb': {
      motionOpacity = Math.min(1, safeTime / 0.12);
      if (safeTime < 0.4) {
        glitchJitterPx = Math.sin(safeTime * 65) * 4 * scaleFactor;
        motionTranslateX = Math.sin(safeTime * 50) * 5 * scaleFactor;
      } else {
        glitchJitterPx = Math.abs(Math.sin(safeTime * 12)) * 2 * scaleFactor;
      }
      break;
    }
    case 'lower-third-slide': {
      const p = easeOutCubic(safeTime / 0.42);
      motionOpacity = p;
      motionTranslateX = -(1 - p) * 48 * scaleFactor;
      break;
    }
    case 'slow-cinema-fade':
    default: {
      const p = easeOutCubic(safeTime / 0.48);
      motionOpacity = p;
      motionScale *= 0.96 + 0.04 * p;
      break;
    }
  }

  if (config.category === 'DOPAMINE') {
    const pulse = 1 + Math.sin(safeTime * 16) * 0.025;
    motionScale *= pulse;
  }

  const finalOpacity = Math.max(0, Math.min(1, baseOpacity * motionOpacity));
  if (finalOpacity <= 0.01) return;

  const rawAlign = meta.effectiveAlign || 'MID';
  const effectiveAlign: 'LEFT' | 'MID' | 'RIGHT' =
    config.layoutMode === 'lower-third-bar' && rawAlign === 'MID' ? 'LEFT' : rawAlign;

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

  // Vertical anchor per layoutMode
  let anchorY = Math.round(height * 0.48 + offsetY);
  if (config.layoutMode === 'lower-third-bar') {
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
  ctx.scale(motionScale, motionScale);
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
  const isLowerPlate =
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

  // Primary Headline
  if (banglaTitle) {
    drawHeadlineText(ctx, banglaTitle, textX, primaryLineY, maxTextW, config, scaleFactor, glitchJitterPx);
  }

  // Secondary Subtitle
  if (visibleEnglish) {
    ctx.save();
    const subStr = config.uppercase ? visibleEnglish.toUpperCase() : visibleEnglish;
    ctx.font = `700 ${englishFontPx}px ${config.englishFontFamily || '"JetBrains Mono", monospace'}`;
    setCanvasLetterSpacing(ctx, Math.max(0.05, (config.letterTracking || 0.15) + 0.08));
    ctx.fillStyle = config.secondaryColor || '#E4E4E7';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = Math.round(10 * scaleFactor);
    ctx.fillText(subStr, textX, subLineY, maxTextW);
    ctx.restore();
  }

  // Subtle inline dialogue for bottom-plate layouts
  if (isLowerPlate && cleanDialogue) {
    ctx.save();
    ctx.font = `italic 500 ${dialogueFontPx}px ${config.englishFontFamily || 'sans-serif'}`;
    ctx.fillStyle = config.secondaryColor || '#D4D4D8';
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
