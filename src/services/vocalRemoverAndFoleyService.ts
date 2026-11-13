/**
 * @file /src/services/vocalRemoverAndFoleyService.ts
 * @description Real-time Web Audio Stereo Mid-Side Vocal Remover / Acapella Isolator,
 * Pure PCM WAV Encoder, and Offline Procedural Foley Soundscape Synthesizer.
 */

export type VocalIsolationMode = 'instrumental' | 'acapella';

export interface VocalRemoverOptions {
  mode: VocalIsolationMode;
  suppressionPct: number; // 0 to 100
  bassRetainPct: number;  // 0 to 100 (low-pass <180Hz center preservation)
  sampleRate?: number;
}

export interface FoleySynthRecipe {
  id?: string;
  name: string;
  oscType: 'sine' | 'triangle' | 'sawtooth' | 'square';
  baseFreqHz: number;
  endFreqHz: number;
  noiseMix: number;
  filterCutoffHz: number;
  pulseRateHz: number;
  durationSec: number;
  reverbMix: number;
  gain: number;
}

export const FOLEY_PRESETS: ReadonlyArray<FoleySynthRecipe> = [
  {
    id: 'anamorphic-sub-drop',
    name: 'Anamorphic Sub-Bass Drop',
    oscType: 'sine',
    baseFreqHz: 128,
    endFreqHz: 32,
    noiseMix: 0.16,
    filterCutoffHz: 520,
    pulseRateHz: 0.4,
    durationSec: 2.8,
    reverbMix: 0.35,
    gain: 0.85,
  },
  {
    id: '35mm-projector-reel',
    name: '35mm Projector Reel Hum',
    oscType: 'triangle',
    baseFreqHz: 62,
    endFreqHz: 58,
    noiseMix: 0.24,
    filterCutoffHz: 1500,
    pulseRateHz: 24.0,
    durationSec: 4.0,
    reverbMix: 0.18,
    gain: 0.62,
  },
  {
    id: 'rain-neon-asphalt',
    name: 'Rain on Neon Asphalt',
    oscType: 'sine',
    baseFreqHz: 96,
    endFreqHz: 72,
    noiseMix: 0.82,
    filterCutoffHz: 2400,
    pulseRateHz: 1.6,
    durationSec: 4.5,
    reverbMix: 0.48,
    gain: 0.64,
  },
  {
    id: 'cyberpunk-pulse',
    name: 'Tense Cyberpunk Pulse',
    oscType: 'sawtooth',
    baseFreqHz: 73.42,
    endFreqHz: 110.0,
    noiseMix: 0.14,
    filterCutoffHz: 980,
    pulseRateHz: 4.5,
    durationSec: 4.0,
    reverbMix: 0.42,
    gain: 0.72,
  },
  {
    id: 'heartbeat-riser',
    name: 'Heartbeat Riser',
    oscType: 'sine',
    baseFreqHz: 48,
    endFreqHz: 185,
    noiseMix: 0.22,
    filterCutoffHz: 1200,
    pulseRateHz: 2.2,
    durationSec: 3.5,
    reverbMix: 0.38,
    gain: 0.8,
  },
];

/**
 * Pure Mid-Side Stereo DSP Sample Processor.
 * Operates identically in Node unit tests and browser AudioBuffers.
 *
 * Math:
 * - Mid (Center): M = 0.5 * (L + R)   (Lead vocals, snare center, sub-bass)
 * - Side (Stereo): S = 0.5 * (L - R)  (Wide synths, guitars, reverb tails)
 * - Low-End Bass Retention (<180Hz): 1-pole IIR low-pass preserves kick/bass weight in center.
 * - Instrumental mode cancels mid content above 180Hz scaled by `suppressionPct`.
 * - Acapella mode isolates mid band (high-passed above ~160Hz) and attenuates stereo side energy.
 */
export function processMidSideStereoSamples(
  leftIn: Float32Array,
  rightIn: Float32Array,
  options: VocalRemoverOptions
): { leftOut: Float32Array; rightOut: Float32Array } {
  const len = Math.min(leftIn.length, rightIn.length);
  const leftOut = new Float32Array(len);
  const rightOut = new Float32Array(len);
  if (len === 0) return { leftOut, rightOut };

  const sr = Math.max(8000, options.sampleRate || 48000);
  const suppression = Math.max(0, Math.min(1, (options.suppressionPct ?? 88) / 100));
  const bassRetain = Math.max(0, Math.min(1, (options.bassRetainPct ?? 85) / 100));

  // 1-pole low-pass cutoff at 180Hz for bass preservation
  const dt = 1 / sr;
  const rc = 1 / (2 * Math.PI * 180);
  const lpAlpha = dt / (rc + dt);

  let midLowState = 0;

  for (let i = 0; i < len; i++) {
    const l = leftIn[i];
    const r = rightIn[i];

    const mid = 0.5 * (l + r);
    const side = 0.5 * (l - r);

    midLowState += lpAlpha * (mid - midLowState);
    const midHigh = mid - midLowState;

    if (options.mode === 'instrumental') {
      // Retain low-end (<180Hz), suppress high-mid vocal core, boost stereo side slightly for fullness
      const retainedBass = midLowState * bassRetain;
      const residualMid = midHigh * (1 - suppression);
      const wideSide = side * (1 + 0.15 * suppression);

      leftOut[i] = Math.max(-1, Math.min(1, retainedBass + residualMid + wideSide));
      rightOut[i] = Math.max(-1, Math.min(1, retainedBass + residualMid - wideSide));
    } else {
      // Acapella Vocal Isolation: extract mid vocal band while attenuating wide side & deep rumble
      const vocalBand = midHigh * (0.4 + 0.6 * suppression) + midLowState * (1 - bassRetain) * 0.25;
      const attenuatedSide = side * (1 - suppression * 0.92);

      leftOut[i] = Math.max(-1, Math.min(1, vocalBand + attenuatedSide));
      rightOut[i] = Math.max(-1, Math.min(1, vocalBand - attenuatedSide));
    }
  }

  return { leftOut, rightOut };
}

/**
 * Pure PCM16 RIFF WAV Encoder (44-byte canonical header + interleaved stereo PCM16).
 */
export function encodeStereoFloat32ToWavBytes(
  left: Float32Array,
  right: Float32Array,
  sampleRate = 48000
): Uint8Array {
  const numFrames = Math.min(left.length, right.length);
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataByteSize = numFrames * blockAlign;
  const totalByteSize = 44 + dataByteSize;

  const buffer = new ArrayBuffer(totalByteSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true);  // AudioFormat 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataByteSize, true);

  let writeOffset = 44;
  for (let i = 0; i < numFrames; i++) {
    const lSample = Math.max(-1, Math.min(1, left[i]));
    const rSample = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(writeOffset, lSample < 0 ? lSample * 0x8000 : lSample * 0x7fff, true);
    view.setInt16(writeOffset + 2, rSample < 0 ? rSample * 0x8000 : rSample * 0x7fff, true);
    writeOffset += 4;
  }

  return new Uint8Array(buffer);
}

export function encodeStereoFloat32ToWavBlob(
  left: Float32Array,
  right: Float32Array,
  sampleRate = 48000
): Blob {
  const bytes = encodeStereoFloat32ToWavBytes(left, right, sampleRate);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'audio/wav' });
}

/**
 * Decodes a File / Blob audio asset, runs stereo Mid-Side DSP vocal isolation/removal,
 * and returns a playable Blob URL + downloadable WAV Blob.
 */
export async function processAudioFileMidSide(
  fileOrBlob: Blob,
  options: VocalRemoverOptions
): Promise<{
  wavBlob: Blob;
  wavUrl: string;
  durationSec: number;
  sampleRate: number;
}> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const ctx = new AudioCtx();
  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const sampleRate = decoded.sampleRate || 48000;
    const leftIn = decoded.getChannelData(0);
    const rightIn = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : leftIn;

    const { leftOut, rightOut } = processMidSideStereoSamples(leftIn, rightIn, {
      ...options,
      sampleRate,
    });

    const wavBlob = encodeStereoFloat32ToWavBlob(leftOut, rightOut, sampleRate);
    const wavUrl = URL.createObjectURL(wavBlob);
    return {
      wavBlob,
      wavUrl,
      durationSec: decoded.duration,
      sampleRate,
    };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Deterministic Offline Foley Synthesizer (Pure PCM DSP -> Stereo RIFF WAV).
 * Works identically in browser and headless Node tests with zero external assets.
 */
export function synthesizeFoleyRecipeToSamples(
  recipe: FoleySynthRecipe,
  sampleRate = 48000
): { left: Float32Array; right: Float32Array; sampleRate: number } {
  const dur = Math.max(0.5, Math.min(12.0, recipe.durationSec || 3.0));
  const totalSamples = Math.max(1, Math.ceil(dur * sampleRate));
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const baseFreq = Math.max(24, Math.min(2000, recipe.baseFreqHz || 80));
  const endFreq = Math.max(24, Math.min(2000, recipe.endFreqHz || 45));
  const noiseMix = Math.max(0, Math.min(1, recipe.noiseMix ?? 0.25));
  const pulseRate = Math.max(0.1, Math.min(40, recipe.pulseRateHz ?? 2.0));
  const gain = Math.max(0.05, Math.min(0.95, recipe.gain ?? 0.72));
  const cutoff = Math.max(150, Math.min(12000, recipe.filterCutoffHz ?? 1400));

  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * cutoff);
  const filterAlpha = dt / (rc + dt);

  let phase = 0;
  let lpL = 0;
  let lpR = 0;
  // Deterministic PRNG LCG for noise
  let seed = 133742;
  const nextNoise = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;
    const instFreq = baseFreq + (endFreq - baseFreq) * progress;
    phase += (2 * Math.PI * instFreq) / sampleRate;

    let osc = 0;
    const normPhase = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const triPos = normPhase / (2 * Math.PI);
    if (recipe.oscType === 'triangle') {
      osc = 4 * Math.abs(triPos - 0.5) - 1;
    } else if (recipe.oscType === 'sawtooth') {
      osc = 2 * triPos - 1;
    } else if (recipe.oscType === 'square') {
      osc = triPos < 0.5 ? 1 : -1;
    } else {
      osc = Math.sin(phase);
    }

    const nL = nextNoise();
    const nR = nextNoise();

    // Attack + decay + pulse LFO envelope
    const attackEnv = Math.min(1, t / 0.03);
    const releaseEnv = Math.min(1, (dur - t) / 0.18);
    const pulseEnv = 0.55 + 0.45 * Math.sin(2 * Math.PI * pulseRate * t);
    const env = attackEnv * releaseEnv * pulseEnv * gain;

    const rawL = (osc * (1 - noiseMix) + nL * noiseMix) * env;
    const rawR = (osc * (1 - noiseMix) + nR * noiseMix) * env;

    lpL += filterAlpha * (rawL - lpL);
    lpR += filterAlpha * (rawR - lpR);

    left[i] = Math.max(-0.98, Math.min(0.98, lpL));
    right[i] = Math.max(-0.98, Math.min(0.98, lpR));
  }

  // Optional simple feedback reverb tap (70ms stereo delay)
  const revMix = Math.max(0, Math.min(0.8, recipe.reverbMix ?? 0.3));
  if (revMix > 0.02) {
    const delaySamples = Math.floor(0.068 * sampleRate);
    for (let i = delaySamples; i < totalSamples; i++) {
      left[i] = Math.max(-0.98, Math.min(0.98, left[i] + right[i - delaySamples] * revMix * 0.45));
      right[i] = Math.max(-0.98, Math.min(0.98, right[i] + left[i - delaySamples] * revMix * 0.45));
    }
  }

  return { left, right, sampleRate };
}

export function synthesizeFoleyRecipeToWavBytes(
  recipe: FoleySynthRecipe,
  sampleRate = 48000
): Uint8Array {
  const { left, right } = synthesizeFoleyRecipeToSamples(recipe, sampleRate);
  return encodeStereoFloat32ToWavBytes(left, right, sampleRate);
}

export function synthesizeFoleyRecipeToWavBlob(
  recipe: FoleySynthRecipe,
  sampleRate = 48000
): Blob {
  const { left, right } = synthesizeFoleyRecipeToSamples(recipe, sampleRate);
  return encodeStereoFloat32ToWavBlob(left, right, sampleRate);
}
