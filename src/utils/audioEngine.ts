/**
 * @file /src/utils/audioEngine.ts
 * @description Cinematic Web Audio Synthesizer & Generative DSP Engine.
 * Features:
 * - 43.6Hz sub-bass binaural drone
 * - Pacemaker heartbeat pulse generator tied to playback pace (0.5x – 3.0x)
 * - Frame hit impact generator with exponential decay
 * - Mechanical 35mm camera shutter transient click
 * - 64-band frequency spectrum analyzer for live HUD visualization
 * - Multi-track background music audio element player
 */

class CinematicAudioEngine {
  private ctx: AudioContext | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted: boolean = true;
  private isRunning: boolean = false;
  private volume: number = 0.4;

  // Heartbeat pulse state
  private heartbeatInterval: number | null = null;
  private heartbeatRate: number = 1.0; // 0.5x to 3.0x

  // BGM element & node
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);
      this.filterNode.connect(this.masterGain);

      this.startDrone();
      this.startHeartbeat();
    } catch {
      // AudioContext unavailable or restricted in this environment - fail silent
    }
  }

  private startDrone() {
    if (!this.ctx || !this.filterNode || this.isRunning) return;

    try {
      // Sub oscillator (deep fundamental 43.65Hz - F1 binaural drone)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(43.65, this.ctx.currentTime);

      // Fifth harmonic slightly detuned for organic beating (65.41Hz + 0.3Hz binaural offset)
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(65.71, this.ctx.currentTime);

      // Subtle warm analog tape noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.04;
      }
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.droneOsc1.connect(oscGain);
      this.droneOsc2.connect(oscGain);
      oscGain.connect(this.filterNode);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.noiseNode.connect(noiseGain);
      noiseGain.connect(this.filterNode);

      this.droneOsc1.start();
      this.droneOsc2.start();
      this.noiseNode.start();
      this.isRunning = true;
    } catch {
      // Ignore start errors
    }
  }

  /**
   * Pacemaker Heartbeat Pulse tied to playback pace
   */
  public setHeartbeatRate(paceMultiplier: number) {
    this.heartbeatRate = Math.max(0.5, Math.min(3.0, paceMultiplier));
    this.restartHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    const ms = Math.round(1000 / this.heartbeatRate);

    this.heartbeatInterval = window.setInterval(() => {
      if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
        this.playSubPulse();
      }
    }, ms);
  }

  private restartHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.startHeartbeat();
    }
  }

  private playSubPulse() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);

      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // safe fallback
    }
  }

  /**
   * Frame Hit Impact - Deep cinematic sub hit with high-frequency transient
   */
  public playFrameImpact(intensity: number = 1.0) {
    if (this.isMuted || !this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.4 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {
      // safe fallback
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) {
      if (!muted) this.init();
      return;
    }

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume().catch(() => {});
    }

    if (this.masterGain && this.ctx) {
      try {
        const targetGain = muted ? 0.0001 : this.volume;
        this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
      } catch {
        // Gain ramp fail silent
      }
    }

    if (this.bgmAudio) {
      if (muted) this.bgmAudio.pause();
      else this.bgmAudio.play().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public playShutterClick() {
    if (this.isMuted || !this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      
      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Shutter click fail silent
    }
  }

  /**
   * Retrieves live frequency bar spectrum data array for spectrum bars HUD
   */
  public getFrequencyData(outputArray?: Uint8Array): Uint8Array {
    if (!this.analyserNode) {
      return outputArray || new Uint8Array(32);
    }
    const data = outputArray || new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data as any);
    return data;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Load custom background music track
   */
  public loadBgmTrack(file: File) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.src = '';
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    this.bgmAudio = audio;

    try {
      this.bgmSource = this.ctx.createMediaElementSource(audio);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.bgmSource.connect(this.bgmGain);
      if (this.analyserNode) {
        this.bgmGain.connect(this.analyserNode);
      } else {
        this.bgmGain.connect(this.ctx.destination);
      }
      if (!this.isMuted) {
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('BGM connect fallback:', e);
    }
  }
}

export const audioEngine = new CinematicAudioEngine();
