/**
 * @file /src/services/depthOcclusionService.js
 * @description Dynamic 3D Depth Occlusion Pipeline for Handfilm Studio.
 *
 * Architecture:
 * 1. Offscreen Canvas 3-Layer Stack:
 *    - Base Pass: Draws background video / image / procedural fallback (with Kick camera-shake & RGB split).
 *    - Text Pass: Renders dynamic kinetic typography with scale, rotation, chromatic shift, and fragment blur.
 *    - Subject Pass: Renders foreground matte overlay to place the subject cleanly in front of the text layer.
 * 2. Fallback Segmentation:
 *    - Supports pluggable client-side WebGPU matte models.
 *    - When no WebGPU matte model is loaded, executes a fast WebGL GLSL luma + 3x3 Sobel edge-threshold
 *      segmentation shader (with deterministic 2D pixel fallback) to mask high-contrast subjects.
 */

import { eventBus } from '../core/eventBus';
import { transientPunchEngine, AUDIO_PUNCH_MODES } from './transientPunchEngine';
import {
  KINETIC_TYPOGRAPHY_PRESETS,
  computeKineticTypographyState,
  kineticTypographyRenderer
} from './kineticTypographyStyles';

export const DEPTH_LAYER_MODES = {
  BEHIND_SUBJECT: 'BEHIND_SUBJECT',
  FOREGROUND: 'FOREGROUND'
};

const MATTE_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const LUMA_EDGE_MATTE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_frame;
uniform vec2 u_texelSize;
uniform float u_lumaThreshold;
uniform float u_edgeGain;
uniform float u_softness;

float calcLuma(vec3 rgb) {
  return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec4 center = texture2D(u_frame, v_uv);
  float lC = calcLuma(center.rgb);

  // 3x3 Sobel edge magnitude for sharp foreground subject contours
  float lTL = calcLuma(texture2D(u_frame, v_uv + vec2(-u_texelSize.x, -u_texelSize.y)).rgb);
  float lTC = calcLuma(texture2D(u_frame, v_uv + vec2(0.0, -u_texelSize.y)).rgb);
  float lTR = calcLuma(texture2D(u_frame, v_uv + vec2(u_texelSize.x, -u_texelSize.y)).rgb);
  float lML = calcLuma(texture2D(u_frame, v_uv + vec2(-u_texelSize.x, 0.0)).rgb);
  float lMR = calcLuma(texture2D(u_frame, v_uv + vec2(u_texelSize.x, 0.0)).rgb);
  float lBL = calcLuma(texture2D(u_frame, v_uv + vec2(-u_texelSize.x, u_texelSize.y)).rgb);
  float lBC = calcLuma(texture2D(u_frame, v_uv + vec2(0.0, u_texelSize.y)).rgb);
  float lBR = calcLuma(texture2D(u_frame, v_uv + vec2(u_texelSize.x, u_texelSize.y)).rgb);

  float gx = -lTL - 2.0 * lML - lBL + lTR + 2.0 * lMR + lBR;
  float gy = -lTL - 2.0 * lTC - lTR + lBL + 2.0 * lBC + lBR;
  float edge = clamp(length(vec2(gx, gy)) * u_edgeGain, 0.0, 1.0);

  // Sample outer frame periphery to establish adaptive background luma baseline
  float bgRef = 0.25 * (
    calcLuma(texture2D(u_frame, vec2(0.06, 0.14)).rgb) +
    calcLuma(texture2D(u_frame, vec2(0.94, 0.14)).rgb) +
    calcLuma(texture2D(u_frame, vec2(0.06, 0.86)).rgb) +
    calcLuma(texture2D(u_frame, vec2(0.94, 0.86)).rgb)
  );

  float contrastDelta = abs(lC - bgRef);
  float chroma = max(center.r, max(center.g, center.b)) - min(center.r, min(center.g, center.b));
  float subjectSalience = max(lC * 0.68 + chroma * 0.32, contrastDelta * 1.42) + edge * 0.42;

  // Elliptical action-safe spatial weighting so outer letterbox bars never occlude text
  vec2 focalOffset = (v_uv - vec2(0.5, 0.52)) * vec2(1.12, 1.05);
  float spatialWeight = 1.0 - smoothstep(0.28, 0.76, length(focalOffset));

  float mask = smoothstep(
    u_lumaThreshold - u_softness,
    u_lumaThreshold + u_softness,
    subjectSalience * (0.48 + 0.52 * spatialWeight)
  );
  float alpha = clamp(mask + edge * mask * 0.35, 0.0, 1.0);

  gl_FragColor = vec4(center.rgb, alpha);
}
`;

function createLayerCanvas(width, height) {
  const w = Math.max(2, Math.round(width));
  const h = Math.max(2, Math.round(height));
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

/**
 * Pure CPU Luma + Sobel Edge mask evaluator (used for unit testing & headless fallback).
 * @param {Uint8ClampedArray} rgbaPixels
 * @param {number} width
 * @param {number} height
 * @param {number} [lumaThreshold=0.42]
 * @returns {Uint8ClampedArray}
 */
export function computeFallbackLumaEdgeMattePixels(rgbaPixels, width, height, lumaThreshold = 0.42) {
  const out = new Uint8ClampedArray(rgbaPixels.length);
  const lumaBuf = new Float32Array(width * height);

  for (let i = 0, p = 0; i < rgbaPixels.length; i += 4, p++) {
    lumaBuf[p] =
      (0.2126 * rgbaPixels[i] + 0.7152 * rgbaPixels[i + 1] + 0.0722 * rgbaPixels[i + 2]) / 255;
  }

  // Reference corner background luma
  const c1 = lumaBuf[0] || 0;
  const c2 = lumaBuf[width - 1] || 0;
  const c3 = lumaBuf[(height - 1) * width] || 0;
  const c4 = lumaBuf[height * width - 1] || 0;
  const bgLuma = 0.25 * (c1 + c2 + c3 + c4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const p4 = idx * 4;
      const xm = Math.max(0, x - 1);
      const xp = Math.min(width - 1, x + 1);
      const ym = Math.max(0, y - 1);
      const yp = Math.min(height - 1, y + 1);

      const gx =
        -lumaBuf[ym * width + xm] -
        2 * lumaBuf[y * width + xm] -
        lumaBuf[yp * width + xm] +
        lumaBuf[ym * width + xp] +
        2 * lumaBuf[y * width + xp] +
        lumaBuf[yp * width + xp];

      const gy =
        -lumaBuf[ym * width + xm] -
        2 * lumaBuf[ym * width + x] -
        lumaBuf[ym * width + xp] +
        lumaBuf[yp * width + xm] +
        2 * lumaBuf[yp * width + x] +
        lumaBuf[yp * width + xp];

      const edge = Math.min(1.0, Math.hypot(gx, gy) * 1.6);
      const lC = lumaBuf[idx];
      const contrastDelta = Math.abs(lC - bgLuma);
      const signal = Math.max(lC * 0.72, contrastDelta * 1.38) + edge * 0.4;

      const t = Math.max(0, Math.min(1, (signal - (lumaThreshold - 0.1)) / 0.2));
      const smoothAlpha = t * t * (3 - 2 * t);

      out[p4] = rgbaPixels[p4];
      out[p4 + 1] = rgbaPixels[p4 + 1];
      out[p4 + 2] = rgbaPixels[p4 + 2];
      out[p4 + 3] = Math.round(smoothAlpha * 255);
    }
  }

  return out;
}

class LumaEdgeMatteShaderRunner {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.uTexelSize = null;
    this.uLumaThreshold = null;
    this.uEdgeGain = null;
    this.uSoftness = null;
    this.failed = false;
  }

  _init(width, height) {
    if (this.failed) return false;
    if (!this.canvas) {
      this.canvas = createLayerCanvas(width, height);
      if (!this.canvas) return false;

      const gl =
        this.canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false }) ||
        this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
      if (!gl) {
        this.failed = true;
        return false;
      }

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, MATTE_VERTEX_SHADER);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, LUMA_EDGE_MATTE_FRAGMENT_SHADER);
      gl.compileShader(fs);

      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) || !gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        this.failed = true;
        return false;
      }

      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        this.failed = true;
        return false;
      }

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const posLoc = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      this.gl = gl;
      this.program = prog;
      this.texture = tex;
      this.uTexelSize = gl.getUniformLocation(prog, 'u_texelSize');
      this.uLumaThreshold = gl.getUniformLocation(prog, 'u_lumaThreshold');
      this.uEdgeGain = gl.getUniformLocation(prog, 'u_edgeGain');
      this.uSoftness = gl.getUniformLocation(prog, 'u_softness');
    }

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    return true;
  }

  /**
   * Generates foreground subject matte from `baseCanvas` onto `subjectCtx`.
   */
  extractSubjectMatte(baseCanvas, subjectCtx, width, height, lumaThreshold = 0.42) {
    // Downscaled internal matte resolution for sub-millisecond 60fps performance even at 4K
    const matteScale = width > 1920 ? 0.35 : 0.55;
    const mw = Math.max(64, Math.round(width * matteScale));
    const mh = Math.max(36, Math.round(height * matteScale));

    if (this._init(mw, mh) && this.gl) {
      try {
        const gl = this.gl;
        gl.viewport(0, 0, mw, mh);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, baseCanvas);

        gl.uniform2f(this.uTexelSize, 1.0 / mw, 1.0 / mh);
        gl.uniform1f(this.uLumaThreshold, lumaThreshold);
        gl.uniform1f(this.uEdgeGain, 1.65);
        gl.uniform1f(this.uSoftness, 0.11);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        subjectCtx.clearRect(0, 0, width, height);
        subjectCtx.drawImage(this.canvas, 0, 0, width, height);
        return true;
      } catch {
        // Fall through to 2D pixel fallback if CORS or WebGL texture upload fails
      }
    }

    // 2D Canvas ImageData Luma/Sobel fallback
    try {
      const baseCtx = baseCanvas.getContext('2d');
      if (!baseCtx) return false;
      const imgData = baseCtx.getImageData(0, 0, width, height);
      const masked = computeFallbackLumaEdgeMattePixels(imgData.data, width, height, lumaThreshold);
      const outData = new ImageData(masked, width, height);
      subjectCtx.putImageData(outData, 0, 0);
      return true;
    } catch {
      return false;
    }
  }
}

export class DepthOcclusionService {
  constructor() {
    this.config = {
      enabled: true,
      layerMode: DEPTH_LAYER_MODES.BEHIND_SUBJECT,
      audioPunchMode: AUDIO_PUNCH_MODES.KICK,
      preset: KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP,
      impact: 1.0,
      lumaThreshold: 0.42
    };

    /** @type {null | ((source: any, width: number, height: number) => CanvasImageSource | null)} */
    this.webgpuMatteProvider = null;

    // Reusable 3-Layer OffscreenCanvas Stack
    this.baseCanvas = null;
    this.baseCtx = null;
    this.textCanvas = null;
    this.textCtx = null;
    this.subjectCanvas = null;
    this.subjectCtx = null;
    this.shaderRunner = new LumaEdgeMatteShaderRunner();
  }

  /**
   * Registers an optional client-side WebGPU matte segmentation model.
   * When null, automatically uses the fast GLSL luma/edge-threshold shader.
   * @param {null | ((source: any, width: number, height: number) => CanvasImageSource | null)} provider
   */
  setWebGPUMatteModel(provider) {
    this.webgpuMatteProvider = provider;
  }

  /**
   * Updates compositor configuration and synchronizes `transientPunchEngine`.
   * @param {Partial<typeof this.config>} partial
   */
  setConfig(partial) {
    this.config = {
      ...this.config,
      ...partial
    };
    if (partial.audioPunchMode !== undefined) {
      transientPunchEngine.setMode(partial.audioPunchMode);
    }
    if (typeof partial.impact === 'number') {
      transientPunchEngine.setImpact(partial.impact);
    }
    eventBus.emit('depthOcclusion:config', { ...this.config });
  }

  getConfig() {
    return { ...this.config };
  }

  isEnabled() {
    return Boolean(this.config.enabled);
  }

  /**
   * Returns deterministic layer draw order for verification and rendering:
   * - BEHIND_SUBJECT: ['BASE_PASS', 'TEXT_PASS', 'SUBJECT_PASS']
   * - FOREGROUND:     ['BASE_PASS', 'SUBJECT_PASS', 'TEXT_PASS']
   * @param {'BEHIND_SUBJECT' | 'FOREGROUND'} [mode]
   */
  getLayerStackOrder(mode = this.config.layerMode) {
    return mode === DEPTH_LAYER_MODES.BEHIND_SUBJECT
      ? ['BASE_PASS', 'TEXT_PASS', 'SUBJECT_PASS']
      : ['BASE_PASS', 'SUBJECT_PASS', 'TEXT_PASS'];
  }

  _ensureOffscreenStack(width, height) {
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));

    if (!this.baseCanvas) {
      this.baseCanvas = createLayerCanvas(w, h);
      this.baseCtx = this.baseCanvas ? this.baseCanvas.getContext('2d', { willReadFrequently: false }) : null;
    }
    if (!this.textCanvas) {
      this.textCanvas = createLayerCanvas(w, h);
      this.textCtx = this.textCanvas ? this.textCanvas.getContext('2d') : null;
    }
    if (!this.subjectCanvas) {
      this.subjectCanvas = createLayerCanvas(w, h);
      this.subjectCtx = this.subjectCanvas ? this.subjectCanvas.getContext('2d') : null;
    }

    if (this.baseCanvas && (this.baseCanvas.width !== w || this.baseCanvas.height !== h)) {
      this.baseCanvas.width = w;
      this.baseCanvas.height = h;
    }
    if (this.textCanvas && (this.textCanvas.width !== w || this.textCanvas.height !== h)) {
      this.textCanvas.width = w;
      this.textCanvas.height = h;
    }
    if (this.subjectCanvas && (this.subjectCanvas.width !== w || this.subjectCanvas.height !== h)) {
      this.subjectCanvas.width = w;
      this.subjectCanvas.height = h;
    }

    return Boolean(this.baseCtx && this.textCtx && this.subjectCtx);
  }

  /**
   * Draws source media with cover-fit (or procedural high-contrast monolith fallback if unassigned).
   */
  _drawBasePass(baseCtx, width, height, sourceElement, physics, filmFilter = 'none', zoomScale = 1.0) {
    baseCtx.save();
    baseCtx.fillStyle = '#06070B';
    baseCtx.fillRect(0, 0, width, height);

    const shake = physics.cameraShakeMatrix;
    const dpiScale = width / 1920;

    // Apply camera-shake matrix centered on canvas
    baseCtx.translate(width / 2 + shake.tx * dpiScale, height / 2 + shake.ty * dpiScale);
    baseCtx.transform(shake.a, shake.b, shake.c, shake.d, 0, 0);
    baseCtx.translate(-width / 2, -height / 2);

    let drewMedia = false;
    if (sourceElement) {
      let sw = 1920;
      let sh = 1080;
      if (typeof HTMLVideoElement !== 'undefined' && sourceElement instanceof HTMLVideoElement) {
        sw = sourceElement.videoWidth || 1920;
        sh = sourceElement.videoHeight || 1080;
      } else if (typeof ImageBitmap !== 'undefined' && sourceElement instanceof ImageBitmap) {
        sw = sourceElement.width;
        sh = sourceElement.height;
      } else if (typeof HTMLImageElement !== 'undefined' && sourceElement instanceof HTMLImageElement) {
        sw = sourceElement.naturalWidth || 1920;
        sh = sourceElement.naturalHeight || 1080;
      } else if (sourceElement.width && sourceElement.height) {
        sw = sourceElement.width;
        sh = sourceElement.height;
      }

      if (sw > 0 && sh > 0) {
        const mediaAspect = sw / sh;
        const canvasAspect = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;

        if (mediaAspect > canvasAspect) {
          dw = height * mediaAspect;
          dx = (width - dw) / 2;
        } else {
          dh = width / mediaAspect;
          dy = (height - dh) / 2;
        }

        const swScaled = dw * zoomScale;
        const shScaled = dh * zoomScale;
        const sx = dx - (swScaled - dw) / 2;
        const sy = dy - (shScaled - dh) / 2;

        if (filmFilter && filmFilter !== 'none') {
          baseCtx.filter = filmFilter;
        }
        try {
          baseCtx.drawImage(sourceElement, sx, sy, swScaled, shScaled);
          drewMedia = true;
        } catch {}
        baseCtx.filter = 'none';

        // RGB Chromatic Split pass on <120Hz Kick Punch
        if (drewMedia && physics.chromaticSplitPx > 0.35) {
          const shift = physics.chromaticSplitPx * dpiScale;
          baseCtx.save();
          baseCtx.globalCompositeOperation = 'lighter';
          baseCtx.globalAlpha = Math.min(0.28, physics.kickEnvelope * 0.24);
          baseCtx.drawImage(sourceElement, sx - shift, sy, swScaled, shScaled);
          baseCtx.drawImage(sourceElement, sx + shift, sy, swScaled, shScaled);
          baseCtx.restore();
        }
      }
    }

    if (!drewMedia) {
      // Procedural dark cinema grid + high-contrast central monolith subject fallback
      const bgGrad = baseCtx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        height * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.65
      );
      bgGrad.addColorStop(0, '#131622');
      bgGrad.addColorStop(0.65, '#08090F');
      bgGrad.addColorStop(1, '#030407');
      baseCtx.fillStyle = bgGrad;
      baseCtx.fillRect(0, 0, width, height);

      const gridStep = Math.max(24, Math.round(width / 28));
      baseCtx.strokeStyle = 'rgba(245, 166, 35, 0.06)';
      baseCtx.lineWidth = 1;
      for (let x = 0; x < width; x += gridStep) {
        baseCtx.beginPath();
        baseCtx.moveTo(x, 0);
        baseCtx.lineTo(x, height);
        baseCtx.stroke();
      }

      // High-contrast central subject monolith so occlusion works even without external media
      const monoW = Math.round(width * 0.13);
      const monoH = Math.round(height * 0.68);
      const monoX = Math.round((width - monoW) / 2);
      const monoY = Math.round(height * 0.22);
      const monoGrad = baseCtx.createLinearGradient(monoX, monoY, monoX + monoW, monoY + monoH);
      monoGrad.addColorStop(0, '#E2E8F0');
      monoGrad.addColorStop(0.5, '#94A3B8');
      monoGrad.addColorStop(1, '#334155');
      baseCtx.fillStyle = monoGrad;
      baseCtx.fillRect(monoX, monoY, monoW, monoH);
    }

    baseCtx.restore();
  }

  /**
   * Executes the modular 3-Layer Offscreen Canvas Compositing Pipeline:
   * Base Pass -> Text Pass -> Subject Matte Pass (when BEHIND_SUBJECT)
   * or Base Pass -> Text Pass (when FOREGROUND).
   *
   * Hooked directly into the offscreen canvas pipeline immediately prior to WebCodecs frame grab
   * as well as the live stage viewport canvas.
   *
   * @param {{
   *   ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
   *   width: number;
   *   height: number;
   *   sourceElement?: HTMLVideoElement | ImageBitmap | HTMLImageElement | HTMLCanvasElement | null;
   *   timeSec: number;
   *   durationSec?: number;
   *   fps?: number;
   *   isLivePlaying?: boolean;
   *   titleBn?: string;
   *   titleEn?: string;
   *   lyricText?: string;
   *   filmFilter?: string;
   *   zoomScale?: number;
   *   skipBaseDraw?: boolean;
   *   titleSize?: number;
   *   verticalOffset?: number;
   *   postBaseHook?: (baseCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, w: number, h: number) => void;
   * }} params
   */
  compositeFrame(params) {
    const {
      ctx,
      width,
      height,
      sourceElement = null,
      timeSec = 0,
      durationSec = 12.0,
      fps = 24,
      isLivePlaying = false,
      titleBn = 'দৃষ্টির সীমানা',
      titleEn = 'THE SINGULARITY',
      lyricText = '',
      filmFilter = 'none',
      zoomScale = 1.0,
      skipBaseDraw = false,
      titleSize = 72,
      verticalOffset = 0,
      postBaseHook
    } = params;

    if (!ctx || width <= 0 || height <= 0) return;

    const physics = transientPunchEngine.getPhysicsAtTime(timeSec, fps, isLivePlaying);
    const ready = this._ensureOffscreenStack(width, height);
    if (!ready || !this.baseCtx || !this.textCtx || !this.subjectCtx) {
      return;
    }

    // PASS 1: BASE PASS (Background Video / Procedural Fallback + Kick Camera Shake & RGB Split)
    if (skipBaseDraw && ctx.canvas) {
      this.baseCtx.clearRect(0, 0, width, height);
      this.baseCtx.drawImage(ctx.canvas, 0, 0, width, height);
    } else {
      this._drawBasePass(this.baseCtx, width, height, sourceElement, physics, filmFilter, zoomScale);
      if (typeof postBaseHook === 'function') {
        postBaseHook(this.baseCtx, width, height);
      }
    }

    // PASS 2: TEXT PASS (Kinetic Typography Styles + Fragment Directional Blur)
    this.textCtx.clearRect(0, 0, width, height);
    const typoState = computeKineticTypographyState({
      preset: this.config.preset,
      timeSec,
      durationSec,
      fps,
      impact: this.config.impact,
      framesSinceVocalHit: physics.framesSinceVocalHit,
      vocalHitIndex: physics.vocalHitIndex,
      chromaticSplitPx: physics.chromaticSplitPx,
      kickEnvelope: physics.kickEnvelope,
      bengaliText: titleBn,
      englishSubtext: titleEn,
      lyricText: lyricText || titleEn
    });

    kineticTypographyRenderer.renderTextPass(this.textCtx, width, height, typoState, {
      titleSize,
      verticalOffset
    });

    // PASS 3: SUBJECT PASS & 3-LAYER STACK ASSEMBLY
    ctx.drawImage(this.baseCanvas, 0, 0, width, height);

    if (this.config.layerMode === DEPTH_LAYER_MODES.BEHIND_SUBJECT) {
      // Draw Text Layer first (behind subject)
      ctx.drawImage(this.textCanvas, 0, 0, width, height);

      // Extract Foreground Subject Matte (WebGPU model if loaded, otherwise GLSL Luma/Edge shader)
      let hasMatte = false;
      if (typeof this.webgpuMatteProvider === 'function') {
        const customMatte = this.webgpuMatteProvider(this.baseCanvas, width, height);
        if (customMatte) {
          this.subjectCtx.clearRect(0, 0, width, height);
          this.subjectCtx.drawImage(customMatte, 0, 0, width, height);
          hasMatte = true;
        }
      }

      if (!hasMatte) {
        hasMatte = this.shaderRunner.extractSubjectMatte(
          this.baseCanvas,
          this.subjectCtx,
          width,
          height,
          this.config.lumaThreshold
        );
      }

      if (hasMatte) {
        // Subtle depth-separation contact shadow so occluded glyphs sit naturally behind the subject
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = Math.max(4, Math.round((width / 1920) * 10));
        ctx.drawImage(this.subjectCanvas, 0, 0, width, height);
        ctx.restore();
      }
    } else {
      // FOREGROUND mode: Typography sits cleanly in front of the subject
      ctx.drawImage(this.textCanvas, 0, 0, width, height);
    }
  }
}

export const depthOcclusionService = new DepthOcclusionService();
