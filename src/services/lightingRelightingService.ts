/**
 * @file /src/services/lightingRelightingService.ts
 * @description Shared 3D Relighting & Volumetric Stage Illumination engine.
 * Synchronizes Kelvin blackbody math, 3-point interactive light nodes (Key / Rim / Fill),
 * CSS live stage overlays, and 2D Canvas export rendering across Stage, Workbench, and Export.
 */

import type { LightingPreset } from '../data/lightingPresets';
import { getLightingPresetById } from '../data/lightingPresets';
import type { ShotLightConfig } from '../types/anthology';

export const DEFAULT_SHOT_LIGHT_CONFIG: ShotLightConfig = {
  keyPos: { x: 28, y: 24 },
  rimPos: { x: 82, y: 28 },
  fillPos: { x: 64, y: 74 },
  keyIntensity: 62,
  colorTempK: 5200,
  hazeBloom: 22,
  rimCatchlight: 38,
  vignetteFalloff: 32,
  streakAngle: 8,
};

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function normalizeShotLightConfig(
  input?: Partial<ShotLightConfig> | null
): ShotLightConfig {
  const base = DEFAULT_SHOT_LIGHT_CONFIG;
  if (!input) {
    return {
      ...base,
      keyPos: { ...base.keyPos },
      rimPos: { ...base.rimPos },
      fillPos: { ...base.fillPos },
    };
  }
  return {
    keyPos: {
      x: clamp(input.keyPos?.x ?? base.keyPos.x, 2, 98),
      y: clamp(input.keyPos?.y ?? base.keyPos.y, 2, 98),
    },
    rimPos: {
      x: clamp(input.rimPos?.x ?? base.rimPos.x, 2, 98),
      y: clamp(input.rimPos?.y ?? base.rimPos.y, 2, 98),
    },
    fillPos: {
      x: clamp(input.fillPos?.x ?? base.fillPos.x, 2, 98),
      y: clamp(input.fillPos?.y ?? base.fillPos.y, 2, 98),
    },
    keyIntensity: clamp(input.keyIntensity ?? base.keyIntensity, 0, 100),
    colorTempK: clamp(input.colorTempK ?? base.colorTempK, 2400, 7500),
    hazeBloom: clamp(input.hazeBloom ?? base.hazeBloom, 0, 100),
    rimCatchlight: clamp(input.rimCatchlight ?? base.rimCatchlight, 0, 100),
    vignetteFalloff: clamp(input.vignetteFalloff ?? base.vignetteFalloff, 0, 100),
    streakAngle: clamp(input.streakAngle ?? base.streakAngle, -45, 45),
  };
}

/**
 * Converts Kelvin temperature (2400K Tungsten -> 7500K Arctic Sky) to sRGB 0-255.
 */
export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const k = clamp(kelvin, 1500, 12000) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (k <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(Math.max(1, k)) - 161.1195681661;
    b = k <= 19 ? 0 : 138.5177312231 * Math.log(Math.max(1, k - 10)) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(Math.max(0.1, k - 60), -0.1332047592);
    g = 288.1221695283 * Math.pow(Math.max(0.1, k - 60), -0.0755148492);
    b = 255;
  }

  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
  };
}

/**
 * Generates visual swatch gradient & node defaults tailored to a 34-preset ID.
 */
export function getPresetSwatchGradient(preset: LightingPreset): string {
  const id = preset.id.toLowerCase();
  if (id.includes('golden') || id.includes('amber') || id.includes('tungsten') || id.includes('candle') || id.includes('sodium')) {
    return 'radial-gradient(circle at 28% 28%, rgba(251,191,36,0.92), rgba(217,119,6,0.52) 52%, rgba(17,12,8,0.96) 100%)';
  }
  if (id.includes('neon') || id.includes('cyber') || id.includes('laser') || id.includes('vapor')) {
    return 'radial-gradient(circle at 75% 28%, rgba(236,72,153,0.88), rgba(34,211,238,0.48) 54%, rgba(9,9,18,0.96) 100%)';
  }
  if (id.includes('moon') || id.includes('cool') || id.includes('blue') || id.includes('screen') || id.includes('ice')) {
    return 'radial-gradient(circle at 30% 25%, rgba(96,165,250,0.88), rgba(30,64,175,0.45) 55%, rgba(6,10,20,0.96) 100%)';
  }
  if (id.includes('fire') || id.includes('crimson') || id.includes('red') || id.includes('lava')) {
    return 'radial-gradient(circle at 35% 75%, rgba(239,68,68,0.9), rgba(153,27,27,0.5) 54%, rgba(14,7,7,0.96) 100%)';
  }
  if (id.includes('low-key') || id.includes('silhouette') || id.includes('split') || id.includes('noir') || id.includes('chiaroscuro')) {
    return 'radial-gradient(circle at 22% 30%, rgba(244,244,245,0.55), rgba(39,39,42,0.45) 42%, rgba(3,3,5,0.98) 100%)';
  }
  if (id.includes('high-key') || id.includes('butterfly') || id.includes('ring') || id.includes('softbox')) {
    return 'radial-gradient(circle at 50% 28%, rgba(255,252,240,0.92), rgba(161,161,170,0.42) 55%, rgba(24,24,27,0.92) 100%)';
  }
  if (preset.category === 'ATMOSPHERE') {
    return 'radial-gradient(circle at 32% 32%, rgba(253,224,71,0.75), rgba(120,113,108,0.42) 54%, rgba(10,10,14,0.96) 100%)';
  }
  if (preset.category === 'OPTICAL') {
    return 'linear-gradient(128deg, rgba(56,189,248,0.65) 0%, rgba(245,158,11,0.55) 48%, rgba(12,12,18,0.95) 100%)';
  }
  return 'radial-gradient(circle at 30% 26%, rgba(245,158,11,0.72), rgba(63,63,70,0.45) 52%, rgba(9,9,11,0.96) 100%)';
}

export function buildPresetRelightDefaults(preset: LightingPreset): ShotLightConfig {
  const id = preset.id.toLowerCase();
  let colorTempK = 5200;
  let keyIntensity = 68;
  let hazeBloom = 26;
  let rimCatchlight = 44;
  let vignetteFalloff = 36;
  let streakAngle = 10;
  let keyPos = { x: 28, y: 24 };
  let rimPos = { x: 82, y: 28 };
  let fillPos = { x: 64, y: 74 };

  if (id.includes('golden') || id.includes('amber') || id.includes('tungsten') || id.includes('candle')) {
    colorTempK = 3100;
    hazeBloom = 44;
    streakAngle = 14;
  } else if (id.includes('moon') || id.includes('screen') || id.includes('cool') || id.includes('ice')) {
    colorTempK = 6900;
    rimCatchlight = 62;
    vignetteFalloff = 48;
  } else if (id.includes('low-key') || id.includes('split') || id.includes('noir')) {
    colorTempK = 4600;
    keyIntensity = 52;
    keyPos = { x: 18, y: 30 };
    vignetteFalloff = 72;
  } else if (id.includes('high-key') || id.includes('butterfly')) {
    colorTempK = 5600;
    keyIntensity = 86;
    keyPos = { x: 50, y: 20 };
    vignetteFalloff = 12;
  } else if (id.includes('rim') || id.includes('silhouette')) {
    rimCatchlight = 84;
    keyIntensity = 42;
    rimPos = { x: 84, y: 22 };
  }

  return normalizeShotLightConfig({
    keyPos,
    rimPos,
    fillPos,
    keyIntensity,
    colorTempK,
    hazeBloom,
    rimCatchlight,
    vignetteFalloff,
    streakAngle,
  });
}

export interface StageLightOverlayStyles {
  hasConfig: boolean;
  keyGradient: string;
  rimGradient: string;
  fillGradient: string;
  hazeGradient: string;
  vignetteGradient: string;
  streakGradient: string;
  kelvinRgb: { r: number; g: number; b: number };
  streakAngle: number;
  streakOpacity: number;
  hazeOpacity: number;
}

/**
 * Computes pure CSS gradients representing the live 3D light nodes on Stage.
 */
export function buildStageLightOverlayStyles(
  config?: ShotLightConfig | null
): StageLightOverlayStyles {
  const c = normalizeShotLightConfig(config);
  const rgb = kelvinToRgb(c.colorTempK);
  const keyAlpha = clamp((c.keyIntensity / 100) * 0.44, 0, 0.55);
  const rimAlpha = clamp((c.rimCatchlight / 100) * 0.46, 0, 0.55);
  const fillAlpha = clamp((c.keyIntensity / 100) * 0.16, 0, 0.25);
  const vigAlpha = clamp((c.vignetteFalloff / 100) * 0.78, 0, 0.85);
  const hazeAlpha = clamp((c.hazeBloom / 100) * 0.36, 0, 0.42);

  return {
    hasConfig: Boolean(config),
    kelvinRgb: rgb,
    streakAngle: c.streakAngle,
    streakOpacity: clamp((c.rimCatchlight + c.hazeBloom) / 240, 0, 0.45),
    hazeOpacity: hazeAlpha,
    keyGradient: `radial-gradient(circle at ${c.keyPos.x}% ${c.keyPos.y}%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${keyAlpha.toFixed(3)}) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(keyAlpha * 0.3).toFixed(3)}) 34%, rgba(0,0,0,0) 70%)`,
    rimGradient: `radial-gradient(circle at ${c.rimPos.x}% ${c.rimPos.y}%, rgba(200, 232, 255, ${rimAlpha.toFixed(3)}) 0%, rgba(140, 200, 255, ${(rimAlpha * 0.28).toFixed(3)}) 28%, rgba(0,0,0,0) 62%)`,
    fillGradient: `radial-gradient(circle at ${c.fillPos.x}% ${c.fillPos.y}%, rgba(255, 240, 218, ${fillAlpha.toFixed(3)}) 0%, rgba(0,0,0,0) 64%)`,
    hazeGradient: `radial-gradient(circle at ${c.keyPos.x}% ${c.keyPos.y}%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${hazeAlpha.toFixed(3)}) 0%, rgba(255, 245, 225, ${(hazeAlpha * 0.25).toFixed(3)}) 48%, rgba(0,0,0,0) 82%)`,
    vignetteGradient: `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,${(vigAlpha * 0.52).toFixed(3)}) 78%, rgba(0,0,0,${vigAlpha.toFixed(3)}) 100%)`,
    streakGradient: `linear-gradient(${90 + c.streakAngle}deg, rgba(0,0,0,0) 36%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.45) 50%, rgba(0,0,0,0) 64%)`,
  };
}

/**
 * 2D Canvas compositor matching TactileStage's live relighting pass 1:1.
 * Used by both LightingRelightingWorkbench preview and videoExportEngine.ts.
 */
export function renderShotLightConfigToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config?: ShotLightConfig | null,
  presetOrId?: LightingPreset | string | null,
  elapsedTime = 0
): void {
  const resolvedPreset =
    typeof presetOrId === 'string'
      ? getLightingPresetById(presetOrId)
      : presetOrId || undefined;

  if (resolvedPreset) {
    ctx.save();
    ctx.globalCompositeOperation = resolvedPreset.blendMode || 'screen';
    resolvedPreset.renderOverlay(ctx, width, height, elapsedTime);
    ctx.restore();
  }

  if (!config) return;
  const c = normalizeShotLightConfig(config);
  const rgb = kelvinToRgb(c.colorTempK);
  const kx = (c.keyPos.x / 100) * width;
  const ky = (c.keyPos.y / 100) * height;
  const rx = (c.rimPos.x / 100) * width;
  const ry = (c.rimPos.y / 100) * height;
  const fx = (c.fillPos.x / 100) * width;
  const fy = (c.fillPos.y / 100) * height;

  // 1. Directional Key Light (screen blend)
  const keyAlpha = clamp((c.keyIntensity / 100) * 0.42, 0, 0.55);
  if (keyAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const keyGrad = ctx.createRadialGradient(kx, ky, width * 0.02, kx, ky, width * 0.68);
    keyGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${keyAlpha})`);
    keyGrad.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${keyAlpha * 0.28})`);
    keyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = keyGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2. Rim Catchlight + Anamorphic Streak
  const rimAlpha = clamp((c.rimCatchlight / 100) * 0.45, 0, 0.55);
  if (rimAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rimGrad = ctx.createRadialGradient(rx, ry, width * 0.01, rx, ry, width * 0.48);
    rimGrad.addColorStop(0, `rgba(200, 232, 255, ${rimAlpha})`);
    rimGrad.addColorStop(0.4, `rgba(140, 200, 255, ${rimAlpha * 0.25})`);
    rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, width, height);

    // Anamorphic angled flare streak across key/rim vector
    ctx.translate(kx, ky);
    ctx.rotate((c.streakAngle * Math.PI) / 180);
    const streakGrad = ctx.createLinearGradient(-width * 0.45, 0, width * 0.45, 0);
    streakGrad.addColorStop(0, 'rgba(0,0,0,0)');
    streakGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rimAlpha * 0.55})`);
    streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(-width * 0.45, -height * 0.035, width * 0.9, height * 0.07);
    ctx.restore();
  }

  // 3. Soft Fill Lift
  const fillAlpha = clamp((c.keyIntensity / 100) * 0.16, 0, 0.25);
  if (fillAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fillGrad = ctx.createRadialGradient(fx, fy, width * 0.02, fx, fy, width * 0.55);
    fillGrad.addColorStop(0, `rgba(255, 240, 218, ${fillAlpha})`);
    fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 4. Volumetric Haze Bloom
  const hazeAlpha = clamp((c.hazeBloom / 100) * 0.34, 0, 0.4);
  if (hazeAlpha > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const hazeGrad = ctx.createRadialGradient(kx, ky, 0, kx, ky, width * 0.9);
    hazeGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${hazeAlpha})`);
    hazeGrad.addColorStop(0.6, `rgba(255, 244, 224, ${hazeAlpha * 0.22})`);
    hazeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 5. Cinema Vignette Falloff
  const vigAlpha = clamp((c.vignetteFalloff / 100) * 0.78, 0, 0.85);
  if (vigAlpha > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const vigGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      width * 0.28,
      width * 0.5,
      height * 0.5,
      width * 0.75
    );
    vigGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    vigGrad.addColorStop(0.65, `rgba(180, 180, 180, ${1 - vigAlpha * 0.45})`);
    vigGrad.addColorStop(1, `rgba(0, 0, 0, 1)`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
