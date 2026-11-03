/**
 * @file /src/services/transientPunchEngine.js
 * @description Client-Side Audio Transient & Beat-Punch Dispatcher for Handfilm Studio.
 *
 * Capabilities:
 * 1. Ingests timeline audio buffers via Web Audio API `AudioBufferSourceNode`.
 * 2. Dual-Band Transient Detector:
 *    - Low-Band (<120Hz): Detects 808 / Kick peaks. Emits `onKickPunch`
 *      (triggers 2D canvas camera-shake affine matrix & RGB chromatic split).
 *    - High-Mid Band (1kHz - 5kHz): Detects vocal / snare transients. Emits `onVocalHit`
 *      (triggers rapid-fire single-word lyric pop).
 * 3. Physics Intensity Slider Normalization: [ IMPACT : 0.0 to 2.0 ].
 * 4. Zero-Server Architecture: 100% browser / offline deterministic client-side DSP.
 */

import { eventBus } from '../core/eventBus';

export const AUDIO_PUNCH_MODES = {
  KICK: 'KICK',
  VOCAL: 'VOCAL',
  OFF: 'OFF'
};

/**
 * Clamps physics impact slider strictly within [0.0, 2.0].
 * @param {number} value
 * @returns {number}
 */
export function clampImpactIntensity(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 1.0;
  return Math.max(0.0, Math.min(2.0, Math.round(value * 100) / 100));
}

export class TransientPunchEngine {
  constructor() {
    /** @type {'KICK' | 'VOCAL' | 'OFF'} */
    this.mode = AUDIO_PUNCH_MODES.KICK;

    /** @type {number} Normalized physics intensity [0.0 .. 2.0] */
    this.impact = 1.0;

    /** @type {AudioContext | null} */
    this.audioContext = null;

    /** @type {AudioBuffer | null} */
    this.timelineBuffer = null;

    /** @type {AudioBufferSourceNode | null} */
    this.bufferSourceNode = null;

    /** @type {BiquadFilterNode | null} */
    this.lowBandFilter = null;

    /** @type {AnalyserNode | null} */
    this.lowBandAnalyser = null;

    /** @type {BiquadFilterNode | null} */
    this.highMidHpFilter = null;

    /** @type {BiquadFilterNode | null} */
    this.highMidLpFilter = null;

    /** @type {AnalyserNode | null} */
    this.highMidAnalyser = null;

    /** @type {GainNode | null} */
    this.monitorGainNode = null;

    this.isPlaying = false;
    this.isMuted = true;
    this.volume = 0.5;
    this.playbackStartCtxTime = 0;
    this.playbackOffsetSec = 0;
    this.rafId = null;

    // Real-time envelope & lockout tracking
    this.prevLowRms = 0;
    this.prevHighMidRms = 0;
    this.rollingLowFluxMean = 0.02;
    this.rollingHighMidFluxMean = 0.015;
    this.lastKickEmitSec = -1;
    this.lastVocalEmitSec = -1;
    this.minKickLockoutSec = 0.11;  // 110ms 808/kick lockout
    this.minVocalLockoutSec = 0.08; // 80ms rapid chopper syllable lockout

    // Live transient impulse state (for interactive audition & live AudioBufferSourceNode hits)
    this.liveKickTimestampMs = -10000;
    this.liveKickEnergy = 0;
    this.liveVocalTimestampMs = -10000;
    this.liveVocalEnergy = 0;
    this.liveVocalCounter = 0;

    // Offline pre-computed dual-band transient map from ingested AudioBuffer
    this.offlineMap = {
      durationSec: 16.0,
      kickPeaks: [],
      vocalHits: []
    };

    /** @type {Set<(payload: any) => void>} */
    this.kickListeners = new Set();

    /** @type {Set<(payload: any) => void>} */
    this.vocalListeners = new Set();

    // Seed default synthetic dual-band transient timeline so deterministic scrubbing/export works immediately
    this._seedDefaultOfflineTimeline(128, 24.0);
  }

  /**
   * Sets normalized physics intensity [0.0 to 2.0].
   * @param {number} impactValue
   */
  setImpact(impactValue) {
    this.impact = clampImpactIntensity(impactValue);
    eventBus.emit('transient:impact', this.impact);
  }

  /**
   * @returns {number}
   */
  getImpact() {
    return this.impact;
  }

  /**
   * Sets active punch mode: 'KICK' | 'VOCAL' | 'OFF'.
   * @param {'KICK' | 'VOCAL' | 'OFF'} mode
   */
  setMode(mode) {
    if (mode === 'KICK' || mode === 'VOCAL' || mode === 'OFF') {
      this.mode = mode;
      eventBus.emit('transient:mode', this.mode);
    }
  }

  /**
   * @returns {'KICK' | 'VOCAL' | 'OFF'}
   */
  getMode() {
    return this.mode;
  }

  /**
   * Subscribe to Low-Band (<120Hz) 808/Kick transient peaks.
   * @param {(payload: any) => void} listener
   * @returns {() => void}
   */
  onKickPunch(listener) {
    this.kickListeners.add(listener);
    return () => {
      this.kickListeners.delete(listener);
    };
  }

  /**
   * Subscribe to High-Mid Band (1kHz - 5kHz) vocal/snare transient hits.
   * @param {(payload: any) => void} listener
   * @returns {() => void}
   */
  onVocalHit(listener) {
    this.vocalListeners.add(listener);
    return () => {
      this.vocalListeners.delete(listener);
    };
  }

  /**
   * Ensures client-side Web Audio API context and dual-band filter graph are initialized.
   * @returns {AudioContext | null}
   */
  _ensureAudioGraph() {
    if (typeof window === 'undefined') return null;
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return this.audioContext;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      this.audioContext = ctx;

      // Band 1: Low-Band (<120Hz) for 808 / Kick transient detection
      this.lowBandFilter = ctx.createBiquadFilter();
      this.lowBandFilter.type = 'lowpass';
      this.lowBandFilter.frequency.setValueAtTime(120, ctx.currentTime);
      this.lowBandFilter.Q.setValueAtTime(1.35, ctx.currentTime);

      this.lowBandAnalyser = ctx.createAnalyser();
      this.lowBandAnalyser.fftSize = 1024;
      this.lowBandAnalyser.smoothingTimeConstant = 0.3;
      this.lowBandFilter.connect(this.lowBandAnalyser);

      // Band 2: High-Mid Band (1kHz - 5kHz) for Vocal / Snare transient detection
      this.highMidHpFilter = ctx.createBiquadFilter();
      this.highMidHpFilter.type = 'highpass';
      this.highMidHpFilter.frequency.setValueAtTime(1000, ctx.currentTime);
      this.highMidHpFilter.Q.setValueAtTime(0.707, ctx.currentTime);

      this.highMidLpFilter = ctx.createBiquadFilter();
      this.highMidLpFilter.type = 'lowpass';
      this.highMidLpFilter.frequency.setValueAtTime(5000, ctx.currentTime);
      this.highMidLpFilter.Q.setValueAtTime(0.707, ctx.currentTime);

      this.highMidAnalyser = ctx.createAnalyser();
      this.highMidAnalyser.fftSize = 1024;
      this.highMidAnalyser.smoothingTimeConstant = 0.22;

      this.highMidHpFilter.connect(this.highMidLpFilter);
      this.highMidLpFilter.connect(this.highMidAnalyser);

      // Zero-bleed pull gain node so AudioBufferSourceNode streams continuously even when muted
      this.monitorGainNode = ctx.createGain();
      this.monitorGainNode.gain.setValueAtTime(this.isMuted ? 0.0 : this.volume, ctx.currentTime);
      this.lowBandAnalyser.connect(this.monitorGainNode);
      this.highMidAnalyser.connect(this.monitorGainNode);
      this.monitorGainNode.connect(ctx.destination);

      return ctx;
    } catch {
      return null;
    }
  }

  /**
   * Synthesizes a client-side procedural timeline AudioBuffer containing <120Hz 808 kicks
   * and 1kHz-5kHz percussive vocal/snare transients when no external audio file is loaded.
   * @param {number} bpm
   * @param {number} durationSec
   * @returns {AudioBuffer | null}
   */
  createProceduralTimelineBuffer(bpm = 128, durationSec = 16.0) {
    const ctx = this._ensureAudioGraph();
    if (!ctx) return null;

    const sampleRate = ctx.sampleRate || 48000;
    const totalSamples = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const beatSec = 60 / Math.max(60, bpm);
    const sixteenthSec = beatSec / 4;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beatPos = t % beatSec;
      const sixteenthIndex = Math.floor(t / sixteenthSec) % 16;
      const sixteenthPos = t % sixteenthSec;

      // Low-Band (<120Hz): 808 Kick on beats 0, 4, 7, 10, 14
      let kickSample = 0;
      const isKickSlot =
        sixteenthIndex === 0 ||
        sixteenthIndex === 6 ||
        sixteenthIndex === 8 ||
        sixteenthIndex === 11;
      if (isKickSlot && sixteenthPos < 0.16) {
        const env = Math.exp(-sixteenthPos * 24.0);
        const sweepFreq = 58 + 52 * Math.exp(-sixteenthPos * 42.0); // 110Hz -> 58Hz (<120Hz)
        kickSample = Math.sin(2 * Math.PI * sweepFreq * sixteenthPos) * env * 0.85;
      } else if (beatPos < 0.14) {
        const env = Math.exp(-beatPos * 26.0);
        kickSample = Math.sin(2 * Math.PI * 64 * beatPos) * env * 0.7;
      }

      // High-Mid Band (1kHz - 5kHz): Chopper vocal/snare burst on 16th-note cadence
      let vocalSample = 0;
      const isVocalSlot =
        sixteenthIndex % 2 === 1 ||
        sixteenthIndex === 4 ||
        sixteenthIndex === 12;
      if (isVocalSlot && sixteenthPos < 0.065) {
        const vEnv = Math.exp(-sixteenthPos * 55.0);
        // Formant carrier cluster inside 1.8kHz - 3.4kHz
        const f1 = Math.sin(2 * Math.PI * 1850 * sixteenthPos);
        const f2 = Math.sin(2 * Math.PI * 2920 * sixteenthPos);
        const f3 = Math.sin(2 * Math.PI * 3750 * sixteenthPos);
        vocalSample = (0.45 * f1 + 0.35 * f2 + 0.2 * f3) * vEnv * 0.65;
      }

      const mixed = Math.max(-1, Math.min(1, kickSample + vocalSample));
      left[i] = mixed;
      right[i] = mixed;
    }

    return buffer;
  }

  /**
   * Ingests a timeline `AudioBuffer` via Web Audio API `AudioBufferSourceNode`
   * and computes dual-band transient maps (<120Hz and 1kHz-5kHz).
   *
   * @param {AudioBuffer} audioBuffer
   * @param {{ autoStart?: boolean; offsetSec?: number; loop?: boolean; muted?: boolean }} [options]
   */
  ingestAudioBuffer(audioBuffer, options = {}) {
    if (!audioBuffer) return null;
    this.timelineBuffer = audioBuffer;
    this.offlineMap = this.analyzeBufferDualBand(audioBuffer);

    if (typeof options.muted === 'boolean') {
      this.isMuted = options.muted;
    }

    if (options.autoStart) {
      this.startBufferSourceNode(options.offsetSec || 0, options.loop !== false);
    }

    return this.offlineMap;
  }

  /**
   * Decodes and ingests a client-side File or ArrayBuffer into AudioBufferSourceNode.
   * @param {File | Blob | ArrayBuffer} input
   * @param {{ autoStart?: boolean; muted?: boolean }} [options]
   */
  async loadTimelineAudio(input, options = {}) {
    const ctx = this._ensureAudioGraph();
    if (!ctx) return null;

    const rawBuffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
    const decoded = await ctx.decodeAudioData(rawBuffer.slice(0));
    return this.ingestAudioBuffer(decoded, options);
  }

  /**
   * Mounts and starts a fresh Web Audio API `AudioBufferSourceNode` feeding the
   * <120Hz and 1kHz-5kHz filter chains.
   * @param {number} offsetSec
   * @param {boolean} loop
   */
  startBufferSourceNode(offsetSec = 0, loop = true) {
    const ctx = this._ensureAudioGraph();
    if (!ctx) return;

    if (!this.timelineBuffer) {
      this.timelineBuffer = this.createProceduralTimelineBuffer(128, 16.0);
      if (this.timelineBuffer) {
        this.offlineMap = this.analyzeBufferDualBand(this.timelineBuffer);
      }
    }
    if (!this.timelineBuffer || !this.lowBandFilter || !this.highMidHpFilter) return;

    this.stopBufferSourceNode();

    try {
      const source = ctx.createBufferSource();
      source.buffer = this.timelineBuffer;
      source.loop = loop;

      // Route AudioBufferSourceNode into Dual-Band DSP Detectors
      source.connect(this.lowBandFilter);
      source.connect(this.highMidHpFilter);

      if (this.monitorGainNode) {
        this.monitorGainNode.gain.setValueAtTime(this.isMuted ? 0.0 : this.volume, ctx.currentTime);
      }

      const safeOffset = this.timelineBuffer.duration > 0
        ? ((offsetSec % this.timelineBuffer.duration) + this.timelineBuffer.duration) % this.timelineBuffer.duration
        : 0;

      source.start(0, safeOffset);
      this.bufferSourceNode = source;
      this.playbackStartCtxTime = ctx.currentTime;
      this.playbackOffsetSec = safeOffset;
      this.isPlaying = true;

      source.onended = () => {
        if (this.bufferSourceNode === source) {
          this.isPlaying = false;
        }
      };

      this._startRealtimeDetectorLoop();
    } catch {
      this.isPlaying = false;
    }
  }

  /**
   * Stops active `AudioBufferSourceNode` cleanly without mutating external audio engines.
   */
  stopBufferSourceNode() {
    this.isPlaying = false;
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.bufferSourceNode) {
      try {
        this.bufferSourceNode.onended = null;
        this.bufferSourceNode.stop();
      } catch {}
      try {
        this.bufferSourceNode.disconnect();
      } catch {}
      this.bufferSourceNode = null;
    }
  }

  /**
   * Synchronizes playback state with studio transport without mutating the 24fps tick.
   * @param {boolean} shouldPlay
   * @param {number} timelineSec
   */
  syncTransport(shouldPlay, timelineSec = 0) {
    if (this.mode === AUDIO_PUNCH_MODES.OFF) {
      if (this.isPlaying) {
        this.stopBufferSourceNode();
      }
      return;
    }

    if (shouldPlay && !this.isPlaying) {
      this.startBufferSourceNode(timelineSec, true);
    } else if (!shouldPlay && this.isPlaying) {
      this.stopBufferSourceNode();
    }
  }

  /**
   * Pure client-side dual-band DSP analyzer over raw PCM channel data.
   * Works identically in browser and headless/Node environments:
   * - Low-Band (<120Hz): Cascaded 2-pole 120Hz low-pass filter for 808/Kick peaks.
   * - High-Mid Band (1kHz - 5kHz): 1000Hz high-pass + 5000Hz low-pass band-pass for Vocal/Snare hits.
   *
   * @param {{ sampleRate: number; duration: number; numberOfChannels: number; getChannelData: (ch: number) => Float32Array }} bufferLike
   */
  analyzeBufferDualBand(bufferLike) {
    const fs = bufferLike.sampleRate || 48000;
    const ch0 = bufferLike.getChannelData(0);
    const ch1 = bufferLike.numberOfChannels > 1 ? bufferLike.getChannelData(1) : null;
    const totalSamples = ch0.length;
    const durationSec = bufferLike.duration || totalSamples / fs;

    const hopSec = 0.01; // 10ms window resolution
    const hopSamples = Math.max(64, Math.floor(fs * hopSec));
    const numWindows = Math.max(1, Math.floor(totalSamples / hopSamples));

    const lowRmsArr = new Float32Array(numWindows);
    const highMidRmsArr = new Float32Array(numWindows);

    // Filter coefficients
    const dt = 1 / fs;
    const rcLow120 = 1 / (2 * Math.PI * 120);
    const alphaLp120 = dt / (rcLow120 + dt);

    const rcHp1000 = 1 / (2 * Math.PI * 1000);
    const alphaHp1000 = rcHp1000 / (rcHp1000 + dt);

    const rcLp5000 = 1 / (2 * Math.PI * 5000);
    const alphaLp5000 = dt / (rcLp5000 + dt);

    let lp1 = 0;
    let lp2 = 0;
    let hpState = 0;
    let prevMono = 0;
    let bp1 = 0;
    let bp2 = 0;

    let maxLow = 1e-5;
    let maxHighMid = 1e-5;

    for (let w = 0; w < numWindows; w++) {
      const start = w * hopSamples;
      const end = Math.min(totalSamples, start + hopSamples);
      const len = Math.max(1, end - start);

      let sumLowSq = 0;
      let sumHmSq = 0;

      for (let i = start; i < end; i++) {
        const mono = ch1 ? 0.5 * (ch0[i] + ch1[i]) : ch0[i];

        // Cascaded 2-pole <120Hz Low-Pass
        lp1 += alphaLp120 * (mono - lp1);
        lp2 += alphaLp120 * (lp1 - lp2);

        // 1kHz High-Pass -> Cascaded 5kHz Low-Pass
        hpState = alphaHp1000 * (hpState + mono - prevMono);
        prevMono = mono;
        bp1 += alphaLp5000 * (hpState - bp1);
        bp2 += alphaLp5000 * (bp1 - bp2);

        sumLowSq += lp2 * lp2;
        sumHmSq += bp2 * bp2;
      }

      const lRms = Math.sqrt(sumLowSq / len);
      const hmRms = Math.sqrt(sumHmSq / len);

      lowRmsArr[w] = lRms;
      highMidRmsArr[w] = hmRms;
      if (lRms > maxLow) maxLow = lRms;
      if (hmRms > maxHighMid) maxHighMid = hmRms;
    }

    // Half-wave rectified onset flux
    const lowFlux = new Float32Array(numWindows);
    const hmFlux = new Float32Array(numWindows);
    for (let w = 1; w < numWindows; w++) {
      lowFlux[w] = Math.max(0, (lowRmsArr[w] - lowRmsArr[w - 1]) / maxLow);
      hmFlux[w] = Math.max(0, (highMidRmsArr[w] - highMidRmsArr[w - 1]) / maxHighMid);
    }

    const kickPeaks = [];
    const vocalHits = [];

    const kickLockoutWins = Math.max(2, Math.floor(this.minKickLockoutSec / hopSec));
    const vocalLockoutWins = Math.max(2, Math.floor(this.minVocalLockoutSec / hopSec));
    let lastKickWin = -kickLockoutWins;
    let lastVocalWin = -vocalLockoutWins;
    const localRadius = 14;

    for (let w = 1; w < numWindows - 1; w++) {
      // 1. Low-Band (<120Hz) Kick Peak Detection
      const lf = lowFlux[w];
      if (
        lf > 0.08 &&
        lf >= lowFlux[w - 1] &&
        lf >= lowFlux[w + 1] &&
        w - lastKickWin >= kickLockoutWins
      ) {
        let localSum = 0;
        let count = 0;
        for (let k = Math.max(0, w - localRadius); k <= Math.min(numWindows - 1, w + localRadius); k++) {
          localSum += lowFlux[k];
          count++;
        }
        const localMean = localSum / Math.max(1, count);
        // Require genuine absolute low-band RMS energy so faint sub-harmonics never false-trigger
        if (lf > Math.max(0.11, localMean * 1.65) && lowRmsArr[w] > 0.015) {
          const timeSec = Number(((w * hopSamples) / fs).toFixed(4));
          const energy = Math.min(1.0, lowRmsArr[w] / maxLow);
          kickPeaks.push({ timeSec, energy });
          lastKickWin = w;
        }
      }

      // 2. High-Mid Band (1kHz - 5kHz) Vocal / Snare Peak Detection
      const hf = hmFlux[w];
      if (
        hf > 0.08 &&
        hf >= hmFlux[w - 1] &&
        hf >= hmFlux[w + 1] &&
        w - lastVocalWin >= vocalLockoutWins
      ) {
        let localSum = 0;
        let count = 0;
        for (let k = Math.max(0, w - localRadius); k <= Math.min(numWindows - 1, w + localRadius); k++) {
          localSum += hmFlux[k];
          count++;
        }
        const localMean = localSum / Math.max(1, count);
        if (hf > Math.max(0.1, localMean * 1.55) && highMidRmsArr[w] > 0.008) {
          const timeSec = Number(((w * hopSamples) / fs).toFixed(4));
          const energy = Math.min(1.0, highMidRmsArr[w] / maxHighMid);
          vocalHits.push({ timeSec, energy });
          lastVocalWin = w;
        }
      }
    }

    return {
      durationSec,
      kickPeaks,
      vocalHits
    };
  }

  /**
   * Real-time Web Audio Analyser loop polling <120Hz and 1kHz-5kHz bands.
   */
  _startRealtimeDetectorLoop() {
    if (typeof requestAnimationFrame === 'undefined') return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    const lowBuf = new Float32Array(1024);
    const hmBuf = new Float32Array(1024);

    const step = () => {
      if (!this.isPlaying || !this.lowBandAnalyser || !this.highMidAnalyser || !this.audioContext) {
        this.rafId = null;
        return;
      }

      this.lowBandAnalyser.getFloatTimeDomainData(lowBuf);
      this.highMidAnalyser.getFloatTimeDomainData(hmBuf);

      let sumLow = 0;
      let sumHm = 0;
      for (let i = 0; i < lowBuf.length; i++) {
        sumLow += lowBuf[i] * lowBuf[i];
        sumHm += hmBuf[i] * hmBuf[i];
      }
      const lowRms = Math.sqrt(sumLow / lowBuf.length);
      const hmRms = Math.sqrt(sumHm / hmBuf.length);

      const lowFlux = Math.max(0, lowRms - this.prevLowRms);
      const hmFlux = Math.max(0, hmRms - this.prevHighMidRms);
      this.prevLowRms = lowRms;
      this.prevHighMidRms = hmRms;

      this.rollingLowFluxMean = this.rollingLowFluxMean * 0.9 + lowFlux * 0.1;
      this.rollingHighMidFluxMean = this.rollingHighMidFluxMean * 0.9 + hmFlux * 0.1;

      const nowSec = this.audioContext.currentTime;

      // Low-Band (<120Hz) Kick Peak -> Emit `onKickPunch`
      if (
        lowFlux > Math.max(0.035, this.rollingLowFluxMean * 1.9) &&
        nowSec - this.lastKickEmitSec >= this.minKickLockoutSec
      ) {
        this.lastKickEmitSec = nowSec;
        const normEnergy = Math.min(1.0, lowRms * 2.4);
        this.emitKickPunch(normEnergy, nowSec);
      }

      // High-Mid Band (1kHz - 5kHz) Vocal/Snare Hit -> Emit `onVocalHit`
      if (
        hmFlux > Math.max(0.022, this.rollingHighMidFluxMean * 1.75) &&
        nowSec - this.lastVocalEmitSec >= this.minVocalLockoutSec
      ) {
        this.lastVocalEmitSec = nowSec;
        const normEnergy = Math.min(1.0, hmRms * 3.2);
        this.emitVocalHit(normEnergy, nowSec);
      }

      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  /**
   * Emits `onKickPunch` with normalized camera-shake affine matrix & RGB chromatic split.
   * @param {number} energy 0.0 to 1.0
   * @param {number} [timestampSec]
   */
  emitKickPunch(energy = 0.9, timestampSec = 0) {
    const clampedEnergy = Math.max(0, Math.min(1.0, energy));
    const scaled = clampedEnergy * this.impact;

    this.liveKickTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.liveKickEnergy = clampedEnergy;

    const matrix = this._computeShakeMatrix(scaled, timestampSec || 0.01);
    const chromaticSplitPx = Number((8.5 * scaled).toFixed(2));

    const payload = {
      band: 'LOW_BAND_SUB_120HZ',
      energy: clampedEnergy,
      impact: this.impact,
      scaledIntensity: scaled,
      cameraShakeMatrix: matrix,
      chromaticSplitPx,
      timestampSec
    };

    this.kickListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch {}
    });
    eventBus.emit('onKickPunch', payload);
    return payload;
  }

  /**
   * Emits `onVocalHit` for rapid-fire single-word lyric pop.
   * @param {number} energy 0.0 to 1.0
   * @param {number} [timestampSec]
   */
  emitVocalHit(energy = 0.85, timestampSec = 0) {
    const clampedEnergy = Math.max(0, Math.min(1.0, energy));
    const scaled = clampedEnergy * this.impact;

    this.liveVocalTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.liveVocalEnergy = clampedEnergy;
    this.liveVocalCounter += 1;

    const payload = {
      band: 'HIGH_MID_1KHZ_5KHZ',
      energy: clampedEnergy,
      impact: this.impact,
      scaledIntensity: scaled,
      wordIndex: this.liveVocalCounter,
      timestampSec
    };

    this.vocalListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch {}
    });
    eventBus.emit('onVocalHit', payload);
    return payload;
  }

  /**
   * Computes a 2D affine canvas camera-shake matrix `[a, b, c, d, tx, ty]`.
   * @param {number} intensity 0.0 to 2.0
   * @param {number} phaseSeed
   */
  _computeShakeMatrix(intensity, phaseSeed) {
    if (intensity <= 0.001) {
      return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, rotationRad: 0, scale: 1 };
    }
    const angle = Math.sin(phaseSeed * 83.0) * 0.014 * intensity;
    const scale = 1.0 + 0.028 * intensity;
    const tx = Math.sin(phaseSeed * 113.0) * 12.0 * intensity;
    const ty = Math.cos(phaseSeed * 97.0) * 8.0 * intensity;
    const cos = Math.cos(angle) * scale;
    const sin = Math.sin(angle) * scale;

    return {
      a: cos,
      b: sin,
      c: -sin,
      d: cos,
      tx,
      ty,
      rotationRad: angle,
      scale
    };
  }

  /**
   * Evaluates deterministic + live transient physics at any timeline timestamp `timeSec`.
   * Used by both the real-time stage canvas and frame-accurate 24fps WebCodecs exports.
   *
   * @param {number} timeSec
   * @param {number} [fps=24]
   * @param {boolean} [isLivePlaying=false]
   */
  getPhysicsAtTime(timeSec, fps = 24, isLivePlaying = false) {
    const safeFps = fps > 0 ? fps : 24;
    const impact = this.impact;

    if (this.mode === AUDIO_PUNCH_MODES.OFF || impact <= 0.0001) {
      return {
        mode: this.mode,
        impact,
        kickEnvelope: 0,
        vocalEnvelope: 0,
        chromaticSplitPx: 0,
        cameraShakeMatrix: { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0, rotationRad: 0, scale: 1 },
        framesSinceVocalHit: 999,
        vocalHitIndex: Math.max(0, Math.floor(timeSec * 3.2))
      };
    }

    const mapDur = Math.max(0.5, this.offlineMap.durationSec || 16.0);
    const localSec = ((timeSec % mapDur) + mapDur) % mapDur;
    const cycleCount = Math.max(0, Math.floor(timeSec / mapDur));

    // 1. Evaluate Low-Band (<120Hz) Kick Envelope
    let kickEnv = 0;
    const kicks = this.offlineMap.kickPeaks;
    for (let i = 0; i < kicks.length; i++) {
      const dt = localSec - kicks[i].timeSec;
      if (dt >= 0 && dt < 0.22) {
        const decay = Math.exp(-dt * 20.0) * kicks[i].energy;
        if (decay > kickEnv) kickEnv = decay;
      }
    }

    // Blend live interactive kick audition or live AudioBufferSourceNode pulse
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const liveKickAgeSec = (nowMs - this.liveKickTimestampMs) / 1000;
    if (liveKickAgeSec >= 0 && liveKickAgeSec < 0.24) {
      const liveDecay = Math.exp(-liveKickAgeSec * 18.0) * this.liveKickEnergy;
      if (liveDecay > kickEnv) kickEnv = liveDecay;
    }

    // If paused and no live audition was just clicked, keep camera steady so static editing isn't shaky
    const allowRealtimeShake = isLivePlaying || (liveKickAgeSec >= 0 && liveKickAgeSec < 0.24);
    const activeKickIntensity =
      this.mode === AUDIO_PUNCH_MODES.KICK && allowRealtimeShake
        ? kickEnv * impact
        : 0;

    const cameraShakeMatrix = this._computeShakeMatrix(activeKickIntensity, timeSec + 0.13);
    const chromaticSplitPx = Number((8.5 * activeKickIntensity).toFixed(2));

    // 2. Evaluate High-Mid Band (1kHz - 5kHz) Vocal Hit Index & 4-Frame Damping Counter
    const vocals = this.offlineMap.vocalHits;
    let hitsInCurrentCycle = 0;
    let latestVocalHitSec = 0;
    let latestVocalEnergy = 0.85;

    for (let i = 0; i < vocals.length; i++) {
      if (vocals[i].timeSec <= localSec + 1e-4) {
        hitsInCurrentCycle = i + 1;
        latestVocalHitSec = vocals[i].timeSec;
        latestVocalEnergy = vocals[i].energy;
      } else {
        break;
      }
    }

    let vocalDt = Math.max(0, localSec - latestVocalHitSec);
    let vocalHitIndex = cycleCount * Math.max(1, vocals.length) + Math.max(0, hitsInCurrentCycle - 1);

    // Blend live interactive vocal hit trigger if recently fired
    const liveVocalAgeSec = (nowMs - this.liveVocalTimestampMs) / 1000;
    if (liveVocalAgeSec >= 0 && liveVocalAgeSec < 0.35) {
      vocalDt = liveVocalAgeSec;
      latestVocalEnergy = this.liveVocalEnergy;
      vocalHitIndex += this.liveVocalCounter;
    }

    const framesSinceVocalHit = vocalDt * safeFps;
    const vocalEnv =
      this.mode === AUDIO_PUNCH_MODES.VOCAL && framesSinceVocalHit <= 4.0
        ? (1.0 - framesSinceVocalHit / 4.0) * latestVocalEnergy * impact
        : 0;

    return {
      mode: this.mode,
      impact,
      kickEnvelope: activeKickIntensity,
      vocalEnvelope: vocalEnv,
      chromaticSplitPx:
        this.mode === AUDIO_PUNCH_MODES.VOCAL
          ? Number((3.0 * vocalEnv).toFixed(2))
          : chromaticSplitPx,
      cameraShakeMatrix,
      framesSinceVocalHit,
      vocalHitIndex
    };
  }

  /**
   * Seeds deterministic <120Hz kick and 1kHz-5kHz vocal transient markers for immediate startup.
   * @param {number} bpm
   * @param {number} durationSec
   */
  _seedDefaultOfflineTimeline(bpm = 128, durationSec = 24.0) {
    const beatSec = 60 / bpm;
    const subStep = beatSec / 2; // 8th-note chopper cadence (~234ms @ 128BPM)
    const kickPeaks = [];
    const vocalHits = [];

    for (let t = 0; t < durationSec; t += beatSec) {
      kickPeaks.push({ timeSec: Number(t.toFixed(4)), energy: 0.92 });
      if (t + beatSec * 0.75 < durationSec) {
        kickPeaks.push({ timeSec: Number((t + beatSec * 0.75).toFixed(4)), energy: 0.76 });
      }
    }

    let idx = 0;
    for (let t = 0; t < durationSec; t += subStep) {
      vocalHits.push({
        timeSec: Number(t.toFixed(4)),
        energy: idx % 2 === 0 ? 0.95 : 0.8
      });
      idx++;
    }

    this.offlineMap = {
      durationSec,
      kickPeaks,
      vocalHits
    };
  }
}

export const transientPunchEngine = new TransientPunchEngine();
