/**
 * @file /src/services/kineticTypographyStyles.js
 * @description Autonomous Kinetic Lyric & Commercial Typography Presets for Handfilm Studio.
 *
 * Implements:
 * 1. Preset A: "CHOPPER_RAP_PUNCH"
 *    - Rapid single-word replacement aligned with high-mid (1kHz - 5kHz) transients.
 *    - Scale: 120% -> 100% damping over exact 4 frames.
 *    - Tracking: Dynamic expansion (`letterSpacing` snaps from -3px to 0px).
 * 2. Preset B: "COMMERCIAL_TITAN_DROP"
 *    - Heavy Bengali Unicode typography stacked above micro-tracked uppercase English subtext.
 *    - Laser-line horizontal wipe synchronizing with the secondary title reveal.
 *    - Dynamic directional motion blur rendered in a WebGL GLSL fragment pass.
 * 3. Preset C: "MINIMAL"
 *    - Clean Brutalist console subtitle stack.
 */

export const KINETIC_TYPOGRAPHY_PRESETS = {
  CHOPPER_RAP_PUNCH: 'CHOPPER_RAP_PUNCH',
  COMMERCIAL_TITAN_DROP: 'COMMERCIAL_TITAN_DROP',
  MINIMAL: 'MINIMAL'
};

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_position.x * 0.5 + 0.5, 0.5 - a_position.y * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const DIRECTIONAL_BLUR_FRAGMENT_SHADER_SRC = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_texture;
uniform vec2 u_velocity;
uniform float u_chromaticUv;

void main() {
  vec4 accum = vec4(0.0);
  float weightSum = 0.0;

  // 11-tap Gaussian-weighted directional velocity kernel in fragment pass
  for (int i = -5; i <= 5; i++) {
    float stepNorm = float(i) / 5.0;
    float w = exp(-2.1 * stepNorm * stepNorm);
    vec2 sampleUv = clamp(v_uv + u_velocity * stepNorm, vec2(0.0), vec2(1.0));
    accum += texture2D(u_texture, sampleUv) * w;
    weightSum += w;
  }

  vec4 color = accum / max(weightSum, 0.0001);

  if (u_chromaticUv > 0.00005) {
    vec4 rSample = texture2D(u_texture, clamp(v_uv - vec2(u_chromaticUv, 0.0), vec2(0.0), vec2(1.0)));
    vec4 bSample = texture2D(u_texture, clamp(v_uv + vec2(u_chromaticUv, 0.0), vec2(0.0), vec2(1.0)));
    color.r = max(color.r, rSample.r * 0.88);
    color.b = max(color.b, bSample.b * 0.88);
    color.a = max(color.a, max(rSample.a, bSample.a) * 0.72);
  }

  gl_FragColor = color;
}
`;

/**
 * Creates an OffscreenCanvas or standard HTMLCanvasElement safely in browser environments.
 * @param {number} width
 * @param {number} height
 */
function createBufferCanvas(width, height) {
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
 * Self-contained WebGL GLSL Fragment Pass for directional motion blur on typography layers.
 */
class DirectionalMotionBlurFragmentPass {
  constructor() {
    this.glCanvas = null;
    this.gl = null;
    this.program = null;
    this.texture = null;
    this.uVelocity = null;
    this.uChromaticUv = null;
    this.failed = false;
  }

  _init(width, height) {
    if (this.failed) return false;
    if (!this.glCanvas) {
      if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') {
        return false;
      }
      this.glCanvas = createBufferCanvas(width, height);
      if (!this.glCanvas) return false;

      const gl =
        this.glCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false }) ||
        this.glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
      if (!gl) {
        this.failed = true;
        return false;
      }

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VERTEX_SHADER_SRC);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, DIRECTIONAL_BLUR_FRAGMENT_SHADER_SRC);
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

      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
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
      this.uVelocity = gl.getUniformLocation(prog, 'u_velocity');
      this.uChromaticUv = gl.getUniformLocation(prog, 'u_chromaticUv');
    }

    if (this.glCanvas.width !== width || this.glCanvas.height !== height) {
      this.glCanvas.width = width;
      this.glCanvas.height = height;
    }
    return true;
  }

  /**
   * Executes directional motion blur fragment shader over `sourceCanvas` and blits onto `targetCtx`.
   */
  apply(sourceCanvas, targetCtx, width, height, velocityPxX, velocityPxY, chromaticPx = 0) {
    if (!this._init(width, height) || !this.gl) {
      // Deterministic 2D multi-tap fallback when WebGL is unavailable
      const taps = 5;
      targetCtx.save();
      for (let i = -taps; i <= taps; i++) {
        const frac = i / taps;
        targetCtx.globalAlpha = i === 0 ? 0.65 : 0.08;
        targetCtx.drawImage(sourceCanvas, velocityPxX * frac, velocityPxY * frac, width, height);
      }
      targetCtx.restore();
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    const uvVelX = velocityPxX / Math.max(1, width);
    const uvVelY = velocityPxY / Math.max(1, height);
    const uvChrom = chromaticPx / Math.max(1, width);

    gl.uniform2f(this.uVelocity, uvVelX, uvVelY);
    gl.uniform1f(this.uChromaticUv, uvChrom);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    targetCtx.drawImage(this.glCanvas, 0, 0, width, height);
  }
}

const sharedMotionBlurPass = new DirectionalMotionBlurFragmentPass();

/**
 * Tokenizes lyric/title copy into clean uppercase words for Chopper Rap Punch.
 * @param {string} rawText
 * @returns {string[]}
 */
export function tokenizeChopperWords(rawText) {
  const cleaned = String(rawText || '')
    .replace(/\/\/+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return ['HANDFILM', 'KINETIC', 'PUNCH', '24FPS'];
  const tokens = cleaned.split(' ').filter(Boolean);
  return tokens.length > 0 ? tokens.map((w) => w.toUpperCase()) : ['HANDFILM'];
}

/**
 * Pure deterministic calculation of kinetic typography physics & style state at a given frame/time.
 *
 * @param {{
 *   preset?: 'CHOPPER_RAP_PUNCH' | 'COMMERCIAL_TITAN_DROP' | 'MINIMAL';
 *   timeSec: number;
 *   durationSec?: number;
 *   fps?: number;
 *   impact?: number;
 *   framesSinceVocalHit?: number;
 *   vocalHitIndex?: number;
 *   chromaticSplitPx?: number;
 *   kickEnvelope?: number;
 *   bengaliText?: string;
 *   englishSubtext?: string;
 *   lyricText?: string;
 * }} params
 */
export function computeKineticTypographyState(params) {
  const {
    preset = KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP,
    timeSec = 0,
    durationSec = 12.0,
    fps = 24,
    impact = 1.0,
    framesSinceVocalHit,
    vocalHitIndex,
    chromaticSplitPx = 0,
    kickEnvelope = 0,
    bengaliText = 'দৃষ্টির সীমানা',
    englishSubtext = 'THE SINGULARITY // MASTER SEQUENCE',
    lyricText = ''
  } = params;

  const safeFps = fps > 0 ? fps : 24;
  const safeImpact = Math.max(0, Math.min(2.0, typeof impact === 'number' ? impact : 1.0));
  const currentFrameFloat = Math.max(0, timeSec * safeFps);

  if (preset === KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH) {
    const words = tokenizeChopperWords(lyricText || englishSubtext);

    // Rapid single-word replacement aligned with high-mid transients (or 8-frame staccato fallback)
    const fallbackSlotFrames = 6; // 4 words/sec @ 24fps
    const activeWordIdx =
      typeof vocalHitIndex === 'number' && vocalHitIndex >= 0
        ? vocalHitIndex % words.length
        : Math.floor(currentFrameFloat / fallbackSlotFrames) % words.length;

    const activeWord = words[activeWordIdx] || words[0];

    // Exact 4-frame damping window: Scale 120% -> 100%, Tracking -3px -> 0px
    const hitAgeFrames =
      typeof framesSinceVocalHit === 'number' && framesSinceVocalHit < 900
        ? Math.max(0, framesSinceVocalHit)
        : currentFrameFloat % fallbackSlotFrames;

    const dampingFrames = 4.0;
    const progress = Math.min(1.0, Math.max(0.0, hitAgeFrames / dampingFrames));
    const dampingEnvelope = 1.0 - progress;

    // Scale: 120% -> 100% over 4 frames (at nominal impact = 1.0, 1.20 -> 1.00)
    const scaleBoost = 0.20 * (safeImpact > 0 ? safeImpact : 1.0);
    const scale = Number((1.0 + scaleBoost * dampingEnvelope).toFixed(4));

    // Tracking: Dynamic expansion (`letterSpacing` snaps from -3px to 0px over 4 frames)
    const letterSpacingPx = Number((-3.0 * dampingEnvelope).toFixed(3));

    return {
      preset,
      activeWord,
      activeWordIndex: activeWordIdx,
      totalWords: words.length,
      scale,
      letterSpacingPx,
      wipeProgress: 1.0,
      motionBlurVecPx: { x: 0, y: 0 },
      chromaticShiftPx: Number((chromaticSplitPx + 2.5 * dampingEnvelope * safeImpact).toFixed(2)),
      rotationRad: 0,
      bengaliTitle: bengaliText,
      englishSubtext: englishSubtext.toUpperCase(),
      opacity: 1.0
    };
  }

  if (preset === KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP) {
    // Titan Drop entrance over first 8 frames + transient kick re-impulse
    const dropWindowFrames = 8.0;
    const dropProgress = Math.min(1.0, currentFrameFloat / dropWindowFrames);
    const easeOut = 1.0 - Math.pow(1.0 - dropProgress, 3);
    const dropVelocityFactor = 1.0 - easeOut;

    // Laser-line horizontal wipe synchronizing with secondary uppercase English subtext reveal
    const wipeStartFrame = 2.0;
    const wipeDurationFrames = 12.0;
    const wipeProgress = Math.max(
      0.0,
      Math.min(1.0, (currentFrameFloat - wipeStartFrame) / wipeDurationFrames)
    );
    const smoothWipe = 1.0 - Math.pow(1.0 - wipeProgress, 2.4);

    // Directional motion blur vector (vertical drop slam + horizontal laser shear on kick)
    const blurY = (26.0 * dropVelocityFactor + 10.0 * kickEnvelope) * Math.max(0.35, safeImpact);
    const blurX = (12.0 * (wipeProgress > 0 && wipeProgress < 1 ? 1.0 - smoothWipe : 0) + 6.0 * kickEnvelope) * Math.max(0.35, safeImpact);

    const scale = Number((1.0 + 0.14 * dropVelocityFactor + 0.04 * kickEnvelope).toFixed(4));

    return {
      preset,
      activeWord: '',
      activeWordIndex: 0,
      totalWords: 0,
      scale,
      letterSpacingPx: 4.5, // Micro-tracked uppercase English subtext
      wipeProgress: Number(smoothWipe.toFixed(4)),
      motionBlurVecPx: {
        x: Number(blurX.toFixed(2)),
        y: Number(blurY.toFixed(2))
      },
      chromaticShiftPx: Number((chromaticSplitPx + 3.5 * dropVelocityFactor * safeImpact).toFixed(2)),
      rotationRad: 0,
      bengaliTitle: bengaliText || 'দৃষ্টির সীমানা',
      englishSubtext: (englishSubtext || 'THE SINGULARITY').toUpperCase(),
      opacity: Math.min(1.0, 0.25 + 0.75 * easeOut),
      durationSec
    };
  }

  // Preset C: MINIMAL
  const fadeFrames = 6.0;
  const opacity = Math.min(1.0, Math.max(0.15, (currentFrameFloat + 1) / fadeFrames));
  return {
    preset: KINETIC_TYPOGRAPHY_PRESETS.MINIMAL,
    activeWord: '',
    activeWordIndex: 0,
    totalWords: 0,
    scale: 1.0,
    letterSpacingPx: 2.0,
    wipeProgress: 1.0,
    motionBlurVecPx: { x: 0, y: 0 },
    chromaticShiftPx: Number((chromaticSplitPx * 0.5).toFixed(2)),
    rotationRad: 0,
    bengaliTitle: bengaliText || 'দৃষ্টির সীমানা',
    englishSubtext: (englishSubtext || 'HANDFILM CONSOLE').toUpperCase(),
    opacity
  };
}

/**
 * Draws centered text with explicit pixel letter-spacing (supports both native Canvas letterSpacing
 * and exact per-glyph spacing fallback).
 */
function fillTrackedTextCentered(ctx, text, centerX, centerY, letterSpacingPx, stroke = false) {
  if (!text) return;
  if ('letterSpacing' in ctx) {
    const prev = ctx.letterSpacing;
    ctx.letterSpacing = `${letterSpacingPx.toFixed(2)}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (stroke) {
      ctx.strokeText(text, centerX, centerY);
    } else {
      ctx.fillText(text, centerX, centerY);
    }
    ctx.letterSpacing = prev || '0px';
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) + Math.max(0, chars.length - 1) * letterSpacingPx;

  let cursorX = centerX - totalWidth / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < chars.length; i++) {
    if (stroke) {
      ctx.strokeText(chars[i], cursorX, centerY);
    } else {
      ctx.fillText(chars[i], cursorX, centerY);
    }
    cursorX += widths[i] + letterSpacingPx;
  }
}

export class KineticTypographyRenderer {
  constructor() {
    this.scratchCanvas = null;
    this.scratchCtx = null;
  }

  _ensureScratch(width, height) {
    if (!this.scratchCanvas) {
      this.scratchCanvas = createBufferCanvas(width, height);
      if (this.scratchCanvas) {
        this.scratchCtx = this.scratchCanvas.getContext('2d');
      }
    }
    if (this.scratchCanvas && (this.scratchCanvas.width !== width || this.scratchCanvas.height !== height)) {
      this.scratchCanvas.width = width;
      this.scratchCanvas.height = height;
    }
    return this.scratchCtx;
  }

  /**
   * Renders the dynamic kinetic typography pass onto `targetCtx`.
   */
  renderTextPass(targetCtx, width, height, state, customConfig = {}) {
    if (!targetCtx || width <= 0 || height <= 0) return;

    const dpiScale = width / 1920;
    const verticalOffsetPx = (customConfig.verticalOffset || 0) * dpiScale;
    const baseTitleScale = (customConfig.titleSize || 72) / 72;
    const centerX = width / 2;
    const centerY = height * 0.48 + verticalOffsetPx;

    if (state.preset === KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH) {
      targetCtx.save();
      targetCtx.translate(centerX, centerY);
      if (state.rotationRad) targetCtx.rotate(state.rotationRad);
      targetCtx.scale(state.scale, state.scale);

      const fontPx = Math.max(38, Math.round(118 * dpiScale * baseTitleScale));
      targetCtx.font = `900 ${fontPx}px "JetBrains Mono", "Archivo Black", sans-serif`;

      const trackingScaled = state.letterSpacingPx * Math.max(1, dpiScale);
      const chrom = state.chromaticShiftPx * Math.max(1, dpiScale);

      // RGB Chromatic Split channels on punch
      if (chrom > 0.25) {
        targetCtx.fillStyle = 'rgba(255, 36, 66, 0.78)';
        fillTrackedTextCentered(targetCtx, state.activeWord, -chrom, 0, trackingScaled);
        targetCtx.fillStyle = 'rgba(45, 212, 191, 0.78)';
        fillTrackedTextCentered(targetCtx, state.activeWord, chrom, 0, trackingScaled);
      }

      // Brutalist high-contrast core word with sharp obsidian rim
      targetCtx.lineWidth = Math.max(2, Math.round(4 * dpiScale));
      targetCtx.strokeStyle = 'rgba(6, 7, 11, 0.92)';
      fillTrackedTextCentered(targetCtx, state.activeWord, 0, 0, trackingScaled, true);

      targetCtx.shadowColor = 'rgba(245, 166, 35, 0.55)';
      targetCtx.shadowBlur = Math.round(18 * dpiScale);
      targetCtx.fillStyle = '#FFFFFF';
      fillTrackedTextCentered(targetCtx, state.activeWord, 0, 0, trackingScaled);

      // Subtle Brutalist index rule beneath word
      const ruleW = Math.min(width * 0.22, 220 * dpiScale);
      targetCtx.shadowBlur = 0;
      targetCtx.fillStyle = '#F5A623';
      targetCtx.fillRect(-ruleW / 2, fontPx * 0.62, ruleW, Math.max(2, Math.round(3 * dpiScale)));

      targetCtx.restore();
      return;
    }

    if (state.preset === KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP) {
      const sCtx = this._ensureScratch(width, height) || targetCtx;
      const usingScratch = sCtx !== targetCtx && this.scratchCanvas;

      if (usingScratch) {
        sCtx.clearRect(0, 0, width, height);
      }

      sCtx.save();
      sCtx.globalAlpha = state.opacity;
      sCtx.translate(centerX, centerY);
      sCtx.scale(state.scale, state.scale);

      const bnFontPx = Math.max(36, Math.round(108 * dpiScale * baseTitleScale));
      const enFontPx = Math.max(13, Math.round(24 * dpiScale * baseTitleScale));
      const bnY = -Math.round(bnFontPx * 0.34);
      const laserY = Math.round(bnFontPx * 0.32);
      const enY = laserY + Math.round(enFontPx * 1.45);

      // 1. Heavy Bengali Unicode Typography (Top Stack)
      sCtx.font = `900 ${bnFontPx}px "Anek Bangla", "Noto Serif Bengali", "Noto Sans Bengali", sans-serif`;
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';

      sCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      sCtx.shadowBlur = Math.round(26 * dpiScale);
      sCtx.shadowOffsetY = Math.round(6 * dpiScale);

      const titanGrad = sCtx.createLinearGradient(0, bnY - bnFontPx * 0.55, 0, bnY + bnFontPx * 0.55);
      titanGrad.addColorStop(0, '#FFFFFF');
      titanGrad.addColorStop(0.48, '#FFF3C4');
      titanGrad.addColorStop(0.82, '#F5A623');
      titanGrad.addColorStop(1, '#B45309');

      sCtx.fillStyle = titanGrad;
      sCtx.fillText(state.bengaliTitle, 0, bnY);

      sCtx.shadowBlur = 0;
      sCtx.shadowOffsetY = 0;
      sCtx.strokeStyle = 'rgba(255, 248, 220, 0.45)';
      sCtx.lineWidth = Math.max(1, Math.round(1.8 * dpiScale));
      sCtx.strokeText(state.bengaliTitle, 0, bnY);

      // 2. Laser-Line Horizontal Wipe Synchronized with Secondary Title Reveal
      const maxBarWidth = Math.min(width * 0.62, 760 * dpiScale);
      const activeBarW = maxBarWidth * state.wipeProgress;

      if (activeBarW > 1) {
        const halfMax = maxBarWidth / 2;
        const leftEdge = -halfMax;
        const wipeHeadX = leftEdge + activeBarW;

        // Outer laser glow
        const glowGrad = sCtx.createLinearGradient(leftEdge, laserY, wipeHeadX, laserY);
        glowGrad.addColorStop(0, 'rgba(245, 166, 35, 0.15)');
        glowGrad.addColorStop(0.75, 'rgba(245, 166, 35, 0.95)');
        glowGrad.addColorStop(1, '#38BDF8');

        sCtx.save();
        sCtx.shadowColor = '#F5A623';
        sCtx.shadowBlur = Math.round(14 * dpiScale);
        sCtx.fillStyle = glowGrad;
        sCtx.fillRect(leftEdge, laserY - Math.max(1.5, 2 * dpiScale), activeBarW, Math.max(3, 4 * dpiScale));

        // Incandescent white laser core
        sCtx.fillStyle = '#FFFFFF';
        sCtx.fillRect(leftEdge, laserY - Math.max(0.75, dpiScale * 0.8), activeBarW, Math.max(1.5, dpiScale * 1.6));

        // Leading laser spark tip during active wipe
        if (state.wipeProgress > 0.01 && state.wipeProgress < 0.99) {
          sCtx.beginPath();
          sCtx.fillStyle = '#FFFFFF';
          sCtx.shadowColor = '#38BDF8';
          sCtx.shadowBlur = Math.round(20 * dpiScale);
          sCtx.arc(wipeHeadX, laserY, Math.max(3, 5 * dpiScale), 0, Math.PI * 2);
          sCtx.fill();
        }
        sCtx.restore();

        // 3. Micro-Tracked Uppercase English Subtext (Synchronized Clip Wipe Reveal)
        sCtx.save();
        sCtx.beginPath();
        sCtx.rect(leftEdge - 20 * dpiScale, laserY, activeBarW + 40 * dpiScale, enFontPx * 3.2);
        sCtx.clip();

        sCtx.font = `700 ${enFontPx}px "JetBrains Mono", "Cinzel", monospace`;
        sCtx.fillStyle = '#F4F4F5';
        sCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        sCtx.shadowBlur = Math.round(10 * dpiScale);
        fillTrackedTextCentered(
          sCtx,
          state.englishSubtext,
          0,
          enY,
          state.letterSpacingPx * Math.max(1, dpiScale)
        );
        sCtx.restore();
      }

      sCtx.restore();

      // 4. Dynamic Directional Motion Blur rendered in the WebGL Fragment Pass
      if (usingScratch) {
        const blurMag = Math.hypot(state.motionBlurVecPx.x, state.motionBlurVecPx.y);
        if (blurMag > 0.35 || state.chromaticShiftPx > 0.25) {
          sharedMotionBlurPass.apply(
            this.scratchCanvas,
            targetCtx,
            width,
            height,
            state.motionBlurVecPx.x * dpiScale,
            state.motionBlurVecPx.y * dpiScale,
            state.chromaticShiftPx * dpiScale
          );
        } else {
          targetCtx.drawImage(this.scratchCanvas, 0, 0, width, height);
        }
      }
      return;
    }

    // Preset C: MINIMAL
    targetCtx.save();
    targetCtx.globalAlpha = state.opacity;
    const bnSmallPx = Math.max(22, Math.round(48 * dpiScale * baseTitleScale));
    const enSmallPx = Math.max(12, Math.round(18 * dpiScale * baseTitleScale));
    const minimalY = height * 0.78 + verticalOffsetPx;

    targetCtx.font = `700 ${bnSmallPx}px "Anek Bangla", "Noto Sans Bengali", sans-serif`;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillStyle = '#F4F4F5';
    targetCtx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    targetCtx.shadowBlur = Math.round(10 * dpiScale);
    targetCtx.fillText(state.bengaliTitle, centerX, minimalY - bnSmallPx * 0.55);

    targetCtx.font = `600 ${enSmallPx}px "JetBrains Mono", monospace`;
    targetCtx.fillStyle = '#F5A623';
    fillTrackedTextCentered(
      targetCtx,
      state.englishSubtext,
      centerX,
      minimalY + enSmallPx * 0.85,
      state.letterSpacingPx * Math.max(1, dpiScale)
    );
    targetCtx.restore();
  }
}

export const kineticTypographyRenderer = new KineticTypographyRenderer();
