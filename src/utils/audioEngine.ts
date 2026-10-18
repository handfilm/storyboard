/**
 * Cinematic Web Audio Synthesizer Engine
 * Synthesizes analog sub-bass drones, tape hiss, and mechanical camera shutter clicks
 * without any external audio asset dependencies.
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

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(3.5, this.ctx.currentTime);
      this.filterNode.connect(this.masterGain);

      this.startDrone();
    } catch {
      // AudioContext not available in some environments
    }
  }

  private startDrone() {
    if (!this.ctx || !this.filterNode || this.isRunning) return;

    try {
      // Sub oscillator (deep fundamental 43.65Hz - F1)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(43.65, this.ctx.currentTime);

      // Fifth harmonic slightly detuned for organic beating (65.41Hz + 0.3Hz)
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'sine';
      this.droneOsc2.frequency.setValueAtTime(65.71, this.ctx.currentTime);

      // Subtle warm noise buffer
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

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx) {
      if (!muted) this.init();
      return;
    }

    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }

    if (this.masterGain && this.ctx) {
      const targetGain = muted ? 0.0001 : this.volume;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public playShutterClick() {
    if (this.isMuted || !this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      // Mechanical transient burst
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

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const audioEngine = new CinematicAudioEngine();
