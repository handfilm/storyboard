/**
 * @file /src/services/audioReactiveService.ts
 * @description Audio-Reactive Kinetic Sync Engine for RAWx Storyboard Workstation.
 * 
 * Features:
 * 1. Web Audio API AnalyserNode Integration:
 *    - Real-time multi-band spectral decomposition (Bass: 20-250Hz, Mid: 250-2500Hz, Treble: 2500-16000Hz).
 *    - Normalized RMS amplitude peak tracking (0.0 to 1.0).
 * 2. Beat-Detection Dispatcher:
 *    - Adaptive energy thresholding with customizable sensitivity (0.1 - 0.9) and minimum transient lockout.
 *    - Emits normalized `onBeat` (kick, snare, downbeat) and `frequencyEnergy` events aligned with timeline playhead.
 * 3. Kinetic Visual Layer Binding:
 *    - Computes real-time canvas visual transforms:
 *      * Scale pulse (up to 1.15x on heavy kicks).
 *      * Chromatic aberration RGB displacement spikes (0 to 14px).
 *      * Dynamic camera shake (decaying 2D translation and slight rotational tilt).
 * 4. Deterministic Offline Rendering Support:
 *    - Provides `getDeterministicBeatAtTime(timeSec, bpm)` for identical 24fps WebCodecs exports.
 */

import { eventBus } from '../core/eventBus';
import { audioEngine } from './audioEngine';

export type BeatType = 'kick' | 'snare' | 'downbeat' | 'transient' | 'beat';

export interface BeatEventPayload {
  type: BeatType;
  energy: number;       // 0.0 to 1.0
  bass: number;         // 0.0 to 1.0
  mid: number;          // 0.0 to 1.0
  treble: number;       // 0.0 to 1.0
  timestamp: number;    // Timeline seconds or AudioContext currentTime
}

export interface FrequencyEnergyPayload {
  bass: number;         // 0.0 to 1.0
  mid: number;          // 0.0 to 1.0
  treble: number;       // 0.0 to 1.0
  rms: number;          // 0.0 to 1.0
  peak: number;         // 0.0 to 1.0
}

export interface ReactiveVisualTransforms {
  scale: number;              // 1.0 to 1.20
  chromaticOffsetPx: number;  // 0 to 15px
  shakeX: number;             // -10 to +10px
  shakeY: number;             // -10 to +10px
  shakeRotDeg: number;        // -2 to +2 deg
  glowIntensity: number;      // 0.0 to 2.0
}

export interface AudioReactiveConfig {
  sensitivity: number;        // 0.1 (low) to 0.9 (high), default 0.65
  scalePulseEnabled: boolean;
  chromaticSpikesEnabled: boolean;
  cameraShakeEnabled: boolean;
  maxScalePulse: number;      // default 1.12
  maxChromaticPx: number;     // default 10
  maxShakePx: number;         // default 8
  decayRate: number;          // spring dampening 0.80 to 0.95
}

export const DEFAULT_AUDIO_REACTIVE_CONFIG: AudioReactiveConfig = {
  sensitivity: 0.65,
  scalePulseEnabled: true,
  chromaticSpikesEnabled: true,
  cameraShakeEnabled: true,
  maxScalePulse: 1.12,
  maxChromaticPx: 10,
  maxShakePx: 8,
  decayRate: 0.88
};

export class AudioReactiveService {
  private analyser: AnalyserNode | null = null;
  private config: AudioReactiveConfig = { ...DEFAULT_AUDIO_REACTIVE_CONFIG };
  private rafId: number | null = null;
  private isListening: boolean = false;

  // Smoothing buffers & decay states
  private currentBass = 0;
  private currentMid = 0;
  private currentTreble = 0;
  private currentRms = 0;
  private lastBeatTimeSec = 0;
  private minBeatIntervalSec = 0.12; // 120ms lockout

  // Visual impulse states
  private impulseScale = 1.0;
  private impulseChromatic = 0.0;
  private impulseShakeX = 0;
  private impulseShakeY = 0;
  private impulseShakeRot = 0;

  // Listeners
  private beatListeners: Set<(payload: BeatEventPayload) => void> = new Set();
  private energyListeners: Set<(payload: FrequencyEnergyPayload) => void> = new Set();
  private visualListeners: Set<(transforms: ReactiveVisualTransforms) => void> = new Set();

  constructor() {
    this.bindAudioEngine();
  }

  /**
   * Connects to the master audio engine's AnalyserNode
   */
  public bindAudioEngine(customAnalyser?: AnalyserNode): void {
    if (customAnalyser) {
      this.analyser = customAnalyser;
      return;
    }
    const engineAnalyser = audioEngine.getAnalyser();
    if (engineAnalyser) {
      this.analyser = engineAnalyser;
    }
  }

  /**
   * Updates configuration settings
   */
  public updateConfig(partial: Partial<AudioReactiveConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public getConfig(): AudioReactiveConfig {
    return { ...this.config };
  }

  /**
   * Starts the high-frequency analysis loop
   */
  public start(): void {
    if (this.isListening) return;
    this.isListening = true;
    this.bindAudioEngine();
    this.tick();
  }

  /**
   * Stops the analysis loop
   */
  public stop(): void {
    this.isListening = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Core frame-by-frame analysis tick
   */
  private tick = (): void => {
    if (!this.isListening) return;

    if (!this.analyser) {
      this.bindAudioEngine();
    }

    if (this.analyser) {
      this.extractFrequencyData();
    } else {
      // Passive decay if analyser is unmounted
      this.decayImpulses();
    }

    this.emitVisualTransforms();
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Decomposes FFT data into 3 distinct musical frequency bands
   */
  private extractFrequencyData(): void {
    if (!this.analyser) return;

    const binCount = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(binCount);
    const timeData = new Uint8Array(binCount);

    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getByteTimeDomainData(timeData);

    const sampleRate = this.analyser.context.sampleRate || 44100;
    const hzPerBin = (sampleRate / 2) / binCount;

    // Band bin limits
    const bassEndBin = Math.max(1, Math.min(binCount, Math.floor(250 / hzPerBin)));
    const midEndBin = Math.max(bassEndBin + 1, Math.min(binCount, Math.floor(2500 / hzPerBin)));

    // Calculate band energies
    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < binCount; i++) {
      const val = freqData[i] / 255;
      if (i <= bassEndBin) {
        bassSum += val;
      } else if (i <= midEndBin) {
        midSum += val;
      } else {
        trebleSum += val;
      }
    }

    const rawBass = bassSum / Math.max(1, bassEndBin);
    const rawMid = midSum / Math.max(1, (midEndBin - bassEndBin));
    const rawTreble = trebleSum / Math.max(1, (binCount - midEndBin));

    // Calculate RMS from time domain
    let timeSumSq = 0;
    let peak = 0;
    for (let i = 0; i < binCount; i++) {
      const norm = (timeData[i] - 128) / 128;
      const absVal = Math.abs(norm);
      if (absVal > peak) peak = absVal;
      timeSumSq += norm * norm;
    }
    const rms = Math.sqrt(timeSumSq / binCount);

    // Smooth envelope followers
    this.currentBass = this.currentBass * 0.4 + rawBass * 0.6;
    this.currentMid = this.currentMid * 0.5 + rawMid * 0.5;
    this.currentTreble = this.currentTreble * 0.5 + rawTreble * 0.5;
    this.currentRms = this.currentRms * 0.4 + rms * 0.6;

    const energyPayload: FrequencyEnergyPayload = {
      bass: Math.min(1.0, this.currentBass * 1.5),
      mid: Math.min(1.0, this.currentMid * 1.4),
      treble: Math.min(1.0, this.currentTreble * 1.3),
      rms: Math.min(1.0, this.currentRms * 1.8),
      peak: Math.min(1.0, peak)
    };

    // Notify energy listeners
    this.energyListeners.forEach(listener => {
      try { listener(energyPayload); } catch { /* ignore */ }
    });
    eventBus.emit('AUDIO_ENERGY', energyPayload);

    // Detect transients / beats
    this.detectBeat(energyPayload);
  }

  /**
   * Transient detection & visual impulse triggering
   */
  private detectBeat(energy: FrequencyEnergyPayload): void {
    const nowSec = performance.now() / 1000;
    if (nowSec - this.lastBeatTimeSec < this.minBeatIntervalSec) {
      this.decayImpulses();
      return;
    }

    // Dynamic threshold based on sensitivity (0.1 to 0.9 => 0.70 down to 0.25)
    const threshold = 0.75 - (this.config.sensitivity * 0.50);

    const isKick = energy.bass > threshold && energy.bass > energy.mid * 1.1;
    const isSnare = energy.mid > threshold * 1.1 && energy.treble > threshold * 0.8;
    const isGenericBeat = energy.rms > threshold;

    if (isKick || isSnare || isGenericBeat) {
      this.lastBeatTimeSec = nowSec;
      const beatType: BeatType = isKick ? 'kick' : isSnare ? 'snare' : 'beat';
      const peakEnergy = Math.max(energy.bass, energy.rms);

      const beatPayload: BeatEventPayload = {
        type: beatType,
        energy: peakEnergy,
        bass: energy.bass,
        mid: energy.mid,
        treble: energy.treble,
        timestamp: nowSec
      };

      // Apply impulses based on config
      if (this.config.scalePulseEnabled) {
        const addedScale = (this.config.maxScalePulse - 1.0) * peakEnergy;
        this.impulseScale = Math.min(this.config.maxScalePulse, 1.0 + addedScale);
      }

      if (this.config.chromaticSpikesEnabled && (isKick || peakEnergy > 0.6)) {
        this.impulseChromatic = this.config.maxChromaticPx * peakEnergy;
      }

      if (this.config.cameraShakeEnabled && isKick) {
        const signX = Math.random() > 0.5 ? 1 : -1;
        const signY = Math.random() > 0.5 ? 1 : -1;
        this.impulseShakeX = (Math.random() * 0.6 + 0.4) * this.config.maxShakePx * signX * peakEnergy;
        this.impulseShakeY = (Math.random() * 0.6 + 0.4) * (this.config.maxShakePx * 0.7) * signY * peakEnergy;
        this.impulseShakeRot = (Math.random() - 0.5) * 2.0 * peakEnergy;
      }

      // Dispatch
      this.beatListeners.forEach(listener => {
        try { listener(beatPayload); } catch { /* ignore */ }
      });
      eventBus.emit('AUDIO_BEAT', beatPayload);
    } else {
      this.decayImpulses();
    }
  }

  /**
   * Smoothly decays visual transform states back to neutral
   */
  private decayImpulses(): void {
    const decay = this.config.decayRate;
    this.impulseScale = 1.0 + (this.impulseScale - 1.0) * decay;
    if (Math.abs(this.impulseScale - 1.0) < 0.002) this.impulseScale = 1.0;

    this.impulseChromatic = this.impulseChromatic * decay;
    if (this.impulseChromatic < 0.1) this.impulseChromatic = 0;

    this.impulseShakeX = this.impulseShakeX * decay;
    this.impulseShakeY = this.impulseShakeY * decay;
    this.impulseShakeRot = this.impulseShakeRot * decay;

    if (Math.abs(this.impulseShakeX) < 0.05) this.impulseShakeX = 0;
    if (Math.abs(this.impulseShakeY) < 0.05) this.impulseShakeY = 0;
    if (Math.abs(this.impulseShakeRot) < 0.05) this.impulseShakeRot = 0;
  }

  /**
   * Emits calculated visual transform matrix
   */
  private emitVisualTransforms(): void {
    const transforms: ReactiveVisualTransforms = {
      scale: this.impulseScale,
      chromaticOffsetPx: this.impulseChromatic,
      shakeX: this.impulseShakeX,
      shakeY: this.impulseShakeY,
      shakeRotDeg: this.impulseShakeRot,
      glowIntensity: 1.0 + (this.currentBass * 0.8)
    };

    this.visualListeners.forEach(listener => {
      try { listener(transforms); } catch { /* ignore */ }
    });
    eventBus.emit('AUDIO_VISUAL_MOD', transforms);
  }

  /**
   * Deterministic beat and visual transform calculation for offline WebCodecs rendering
   */
  public getDeterministicBeatAtTime(
    timeSec: number,
    bpm: number = 120
  ): {
    isBeat: boolean;
    beatPhase: number;
    transforms: ReactiveVisualTransforms;
    bassEnergy: number;
  } {
    const secPerBeat = 60 / Math.max(40, bpm);
    const beatFraction = (timeSec % secPerBeat) / secPerBeat;
    const isBeat = beatFraction < 0.12; // first 12% of beat duration is the transient hit

    // Decay curve across beat
    const impulseDecay = Math.max(0, 1.0 - beatFraction * 3.5);
    const bassEnergy = isBeat ? 0.85 * impulseDecay : 0.15;

    const scale = this.config.scalePulseEnabled
      ? 1.0 + (this.config.maxScalePulse - 1.0) * impulseDecay
      : 1.0;

    const chromaticOffsetPx = this.config.chromaticSpikesEnabled
      ? this.config.maxChromaticPx * impulseDecay
      : 0;

    const shakePhase = Math.sin(timeSec * 50);
    const shakeX = this.config.cameraShakeEnabled ? shakePhase * this.config.maxShakePx * impulseDecay : 0;
    const shakeY = this.config.cameraShakeEnabled ? Math.cos(timeSec * 45) * (this.config.maxShakePx * 0.6) * impulseDecay : 0;
    const shakeRotDeg = this.config.cameraShakeEnabled ? shakePhase * 1.5 * impulseDecay : 0;

    return {
      isBeat,
      beatPhase: beatFraction,
      bassEnergy,
      transforms: {
        scale,
        chromaticOffsetPx,
        shakeX,
        shakeY,
        shakeRotDeg,
        glowIntensity: 1.0 + bassEnergy * 0.6
      }
    };
  }

  /**
   * Subscriber methods
   */
  public onBeat(cb: (payload: BeatEventPayload) => void): () => void {
    this.beatListeners.add(cb);
    return () => this.beatListeners.delete(cb);
  }

  public onEnergy(cb: (payload: FrequencyEnergyPayload) => void): () => void {
    this.energyListeners.add(cb);
    return () => this.energyListeners.delete(cb);
  }

  public onVisualTransform(cb: (transforms: ReactiveVisualTransforms) => void): () => void {
    this.visualListeners.add(cb);
    return () => this.visualListeners.delete(cb);
  }

  public getCurrentEnergy(): FrequencyEnergyPayload {
    return {
      bass: this.currentBass,
      mid: this.currentMid,
      treble: this.currentTreble,
      rms: this.currentRms,
      peak: Math.max(this.currentBass, this.currentRms)
    };
  }
}

export const audioReactiveService = new AudioReactiveService();
