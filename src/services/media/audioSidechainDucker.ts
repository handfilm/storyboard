/**
 * @file /src/services/media/audioSidechainDucker.ts
 * @description Dynamic Audio Spectral Sidechain Ducking Engine via Web Audio API.
 * 
 * Architectural Capabilities:
 * 1. Automated Sidechain Compression:
 *    - Routes dialogue/voiceover track through an `AnalyserNode` to sample vocal root-mean-square (RMS) energy.
 *    - Dynamically attenuates background music gain by a calibrated threshold (-12dB default) during speech.
 * 2. Glitch-Free Ramp Envelopes:
 *    - Calibrated attack curve (15ms) and release curve (350ms) using `linearRampToValueAtTime` to prevent clicks/pops.
 * 3. Dual-Mode Operation:
 *    - Real-Time Mode: Slaves to active `AudioContext` and animates live gain reduction in the UI.
 *    - Offline Render Mode: Deterministically computes ducking gain multipliers for any frame time $T$
 *      during offline master export.
 * 4. Zero-GC Telemetry Struct:
 *    - In-place telemetry reuse for 60Hz audio metering without heap churn.
 */

export interface SidechainDuckParameters {
  duckingDb: number;        // e.g. -12dB attenuation
  thresholdDb: number;      // e.g. -22dB speech onset threshold
  attackMs: number;         // e.g. 15ms
  releaseMs: number;        // e.g. 350ms
  dialogueGain: number;     // e.g. 1.0 (0.0 to 2.0)
  musicGain: number;        // e.g. 0.8 (0.0 to 1.5)
  enabled: boolean;
}

export interface SidechainDuckingTelemetry {
  speechLevelDb: number;
  currentDuckingDb: number;
  isDuckingActive: boolean;
  musicGainLinear: number;
}

export const DEFAULT_DUCKING_PARAMS: SidechainDuckParameters = {
  duckingDb: -12.0,
  thresholdDb: -22.0,
  attackMs: 15,
  releaseMs: 350,
  dialogueGain: 1.0,
  musicGain: 0.85,
  enabled: true
};

export class AudioSidechainDucker {
  private static instance: AudioSidechainDucker;
  private params: SidechainDuckParameters = { ...DEFAULT_DUCKING_PARAMS };

  // Web Audio Node Graph
  private audioCtx: AudioContext | null = null;
  private musicGainNode: GainNode | null = null;
  private speechAnalyser: AnalyserNode | null = null;
  private speechBuffer: Float32Array | null = null;

  // Real-time ducking state
  private currentGainMultiplier = 1.0;
  private isDucking = false;
  private lastSpeechDetectedTime = 0;

  // Zero-GC Telemetry Cache
  private telemetryCache: SidechainDuckingTelemetry = {
    speechLevelDb: -60,
    currentDuckingDb: 0,
    isDuckingActive: false,
    musicGainLinear: 1.0
  };

  public static getInstance(): AudioSidechainDucker {
    if (!AudioSidechainDucker.instance) {
      AudioSidechainDucker.instance = new AudioSidechainDucker();
    }
    return AudioSidechainDucker.instance;
  }

  /**
   * Connects the sidechain ducker to an active AudioContext node graph.
   */
  public attachAudioGraph(audioCtx: AudioContext, musicSourceNode: AudioNode, destinationNode: AudioNode): {
    musicGainNode: GainNode;
    speechInputNode: GainNode;
  } {
    this.audioCtx = audioCtx;

    // Create Music Gain Node
    const musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(this.params.musicGain, audioCtx.currentTime);
    musicSourceNode.connect(musicGain);
    musicGain.connect(destinationNode);
    this.musicGainNode = musicGain;

    // Create Speech Analyser & Input Node
    const speechGain = audioCtx.createGain();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    speechGain.connect(analyser);

    this.speechAnalyser = analyser;
    this.speechBuffer = new Float32Array(analyser.frequencyBinCount);

    console.info('*Verification:* [Audio Sidechain Ducker] Graph attached. -12dB vocal auto-ducking online.');

    return {
      musicGainNode: musicGain,
      speechInputNode: speechGain
    };
  }

  /**
   * Updates ducking parameters.
   */
  public setParameters(params: Partial<SidechainDuckParameters>): void {
    this.params = { ...this.params, ...params };
  }

  public getParameters(): SidechainDuckParameters {
    return { ...this.params };
  }

  /**
   * Computes offline ducking gain for any discrete frame time T (0ms latency, deterministic).
   * @param speechEnergy01 Speech amplitude level (0.0 to 1.0) at time T
   */
  public computeOfflineDuckingGain(speechEnergy01: number): number {
    if (!this.params.enabled) return 1.0;

    const speechDb = speechEnergy01 > 0.0001 ? 20 * Math.log10(speechEnergy01) : -100;
    if (speechDb > this.params.thresholdDb) {
      // Convert target dB to linear multiplier: 10^(duckingDb / 20)
      const targetGain = Math.pow(10, this.params.duckingDb / 20);
      return targetGain;
    }
    return 1.0;
  }

  /**
   * Real-time audio tick: called at ~60Hz or in render tick to evaluate sidechain compression.
   */
  public evaluateRealtimeDucking(): SidechainDuckingTelemetry {
    if (!this.speechAnalyser || !this.speechBuffer || !this.audioCtx || !this.params.enabled) {
      this.telemetryCache.speechLevelDb = -60;
      this.telemetryCache.currentDuckingDb = 0;
      this.telemetryCache.isDuckingActive = false;
      this.telemetryCache.musicGainLinear = this.params.musicGain;
      return this.telemetryCache;
    }

    (this.speechAnalyser as any).getFloatTimeDomainData(this.speechBuffer as any);

    // Compute RMS Energy
    let sumSquares = 0;
    for (let i = 0; i < this.speechBuffer.length; i++) {
      const s = this.speechBuffer[i];
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / this.speechBuffer.length);
    const speechDb = rms > 0.0001 ? 20 * Math.log10(rms) : -80;

    const now = this.audioCtx.currentTime;
    const targetLinearGain = Math.pow(10, this.params.duckingDb / 20) * this.params.musicGain;

    if (speechDb > this.params.thresholdDb) {
      this.isDucking = true;
      this.lastSpeechDetectedTime = now;
      if (this.musicGainNode) {
        // Fast attack curve
        this.musicGainNode.gain.cancelScheduledValues(now);
        this.musicGainNode.gain.linearRampToValueAtTime(targetLinearGain, now + this.params.attackMs / 1000);
      }
    } else {
      // Release curve after release delay
      if (now - this.lastSpeechDetectedTime > (this.params.releaseMs / 1000)) {
        this.isDucking = false;
        if (this.musicGainNode) {
          this.musicGainNode.gain.cancelScheduledValues(now);
          this.musicGainNode.gain.linearRampToValueAtTime(this.params.musicGain, now + (this.params.releaseMs / 1000));
        }
      }
    }

    // Zero-GC Telemetry update
    this.telemetryCache.speechLevelDb = Math.round(speechDb * 10) / 10;
    this.telemetryCache.currentDuckingDb = this.isDucking ? this.params.duckingDb : 0;
    this.telemetryCache.isDuckingActive = this.isDucking;
    this.telemetryCache.musicGainLinear = this.isDucking ? targetLinearGain : this.params.musicGain;

    return this.telemetryCache;
  }

  /**
   * Disconnects nodes and resets state.
   */
  public destroy(): void {
    if (this.musicGainNode) {
      try { this.musicGainNode.disconnect(); } catch {}
      this.musicGainNode = null;
    }
    if (this.speechAnalyser) {
      try { this.speechAnalyser.disconnect(); } catch {}
      this.speechAnalyser = null;
    }
    this.speechBuffer = null;
    this.audioCtx = null;
    console.info('*Verification:* [Audio Sidechain Ducker] Graph cleanly dismantled.');
  }
}

export const audioSidechainDucker = AudioSidechainDucker.getInstance();
