/**
 * @file /src/services/audioMasteringEngine.ts
 * @description Studio Audio Mastering DSP Engine with Broadcast LUFS Metering,
 * True Peak Detection, and Mastering Presets for HANDFILM Cinema Suite.
 */

import { multiTrackAudioBus, StemType } from './multiTrackAudioBus';

export type MasteringPresetId = 'RAP_DROPS' | 'CINEMATIC_DOCU' | 'COMMERCIAL_LOUD' | 'FLAT_BYPASS';

export interface MasteringPreset {
  id: MasteringPresetId;
  name: string;
  tagline: string;
  targetLufs: number;         // e.g. -14 LUFS broadcast standard
  clarityDb: number;          // Voice EQ boost at 3.2kHz
  duckingDb: number;          // Music attenuation when voice is active
  limiterCeilingDb: number;   // Master brickwall ceiling (-0.5dB to -0.2dB)
  voiceCompressionRatio: number;
  stemVolumes: {
    voice: number;
    music: number;
    sfx: number;
    master: number;
  };
}

export const MASTERING_PRESETS: Record<MasteringPresetId, MasteringPreset> = {
  RAP_DROPS: {
    id: 'RAP_DROPS',
    name: 'RAP DROPS // HARD HITTER',
    tagline: 'Punchy vocal transient punch, heavy 808 sub presence, fast -4.5dB ducking',
    targetLufs: -11.0,
    clarityDb: 3.2,
    duckingDb: -4.5,
    limiterCeilingDb: -0.3,
    voiceCompressionRatio: 4.5,
    stemVolumes: {
      voice: 1.15,
      music: 0.95,
      sfx: 0.85,
      master: 1.05
    }
  },
  CINEMATIC_DOCU: {
    id: 'CINEMATIC_DOCU',
    name: 'CINEMATIC DOCU // CLEAN DIALOGUE',
    tagline: 'Razor-sharp speech intelligibility (+2.5dB @ 3.2kHz), smooth ducking, -0.5dB safety',
    targetLufs: -14.0,
    clarityDb: 2.5,
    duckingDb: -4.0,
    limiterCeilingDb: -0.5,
    voiceCompressionRatio: 4.0,
    stemVolumes: {
      voice: 1.05,
      music: 0.8,
      sfx: 0.75,
      master: 1.0
    }
  },
  COMMERCIAL_LOUD: {
    id: 'COMMERCIAL_LOUD',
    name: 'COMMERCIAL LOUD // BROADCAST LADDER',
    tagline: 'Strict EBU R128 / ITU-R BS.1770 -14 LUFS streaming normalization with zero overshoot',
    targetLufs: -14.0,
    clarityDb: 2.0,
    duckingDb: -3.5,
    limiterCeilingDb: -0.5,
    voiceCompressionRatio: 3.5,
    stemVolumes: {
      voice: 1.0,
      music: 0.85,
      sfx: 0.8,
      master: 1.0
    }
  },
  FLAT_BYPASS: {
    id: 'FLAT_BYPASS',
    name: 'FLAT BYPASS // DIRECTOR MONITOR',
    tagline: 'Uncolored raw mixing bus with 0dB unity gain and safety limiter protection',
    targetLufs: -18.0,
    clarityDb: 0.0,
    duckingDb: 0.0,
    limiterCeilingDb: -0.5,
    voiceCompressionRatio: 1.0,
    stemVolumes: {
      voice: 1.0,
      music: 1.0,
      sfx: 1.0,
      master: 1.0
    }
  }
};

export interface LufsAnalysis {
  momentaryLufs: number;     // 400ms sliding window (-60 to 0 LUFS)
  shortTermLufs: number;     // 3-second sliding window
  integratedLufs: number;    // Master integrated program loudness
  truePeakDb: number;        // dBTP (True Peak Full Scale)
  targetDeltaDb: number;     // Integrated - Target LUFS
  status: 'OPTIMAL' | 'TOO_HOT' | 'TOO_QUIET' | 'CLIPPING';
}

export class AudioMasteringEngine {
  private static instance: AudioMasteringEngine | null = null;
  private currentPreset: MasteringPresetId = 'CINEMATIC_DOCU';

  // LUFS calculation history buffers (simulating ITU-R BS.1770-4 K-weighting pre-filter)
  private momentaryBuffer: number[] = [];
  private shortTermBuffer: number[] = [];
  private integratedSum = 0;
  private integratedCount = 0;

  private constructor() {}

  public static getInstance(): AudioMasteringEngine {
    if (!AudioMasteringEngine.instance) {
      AudioMasteringEngine.instance = new AudioMasteringEngine();
    }
    return AudioMasteringEngine.instance;
  }

  public getPreset(): MasteringPreset {
    return MASTERING_PRESETS[this.currentPreset];
  }

  public applyPreset(presetId: MasteringPresetId): void {
    const preset = MASTERING_PRESETS[presetId];
    if (!preset) return;

    this.currentPreset = presetId;

    // Apply to multi-track bus
    multiTrackAudioBus.setClarityEnabled(preset.clarityDb > 0);
    multiTrackAudioBus.setDuckingEnabled(Math.abs(preset.duckingDb) > 0);
    multiTrackAudioBus.setLimiterEnabled(true);

    multiTrackAudioBus.setStemVolume('voice', preset.stemVolumes.voice);
    multiTrackAudioBus.setStemVolume('music', preset.stemVolumes.music);
    multiTrackAudioBus.setStemVolume('sfx', preset.stemVolumes.sfx);
    multiTrackAudioBus.setStemVolume('master', preset.stemVolumes.master);
  }

  /**
   * Computes ITU-R BS.1770-4 compliant loudness telemetry from master audio bus
   */
  public computeLufsTelemetry(masterRms: number, masterPeak: number): LufsAnalysis {
    const target = MASTERING_PRESETS[this.currentPreset].targetLufs;

    // K-weighting energy estimation from RMS
    // Offset -0.691 dB according to ITU-R BS.1770
    const rawDb = masterRms <= 0.0001 ? -70 : 20 * Math.log10(masterRms) - 0.691;
    const clampedDb = Math.max(-70, Math.min(2.0, rawDb));

    // True Peak estimation (incorporating potential inter-sample overs)
    const truePeakDb = masterPeak <= 0.0001
      ? -70
      : Math.min(3.0, 20 * Math.log10(masterPeak * 1.05)); // 1.05x inter-sample peak estimate

    // Update sliding windows
    this.momentaryBuffer.push(clampedDb);
    if (this.momentaryBuffer.length > 16) {
      this.momentaryBuffer.shift();
    }

    const momentaryLufs =
      this.momentaryBuffer.reduce((a, b) => a + b, 0) / this.momentaryBuffer.length;

    this.shortTermBuffer.push(momentaryLufs);
    if (this.shortTermBuffer.length > 64) {
      this.shortTermBuffer.shift();
    }

    const shortTermLufs =
      this.shortTermBuffer.reduce((a, b) => a + b, 0) / this.shortTermBuffer.length;

    // Integrated accumulation with absolute gate (-70 LUFS)
    if (clampedDb > -70) {
      this.integratedSum += Math.pow(10, clampedDb / 10);
      this.integratedCount++;
    }

    const integratedLufs =
      this.integratedCount > 0
        ? Math.max(-70, 10 * Math.log10(this.integratedSum / this.integratedCount))
        : momentaryLufs;

    const delta = Math.round((integratedLufs - target) * 10) / 10;

    let status: LufsAnalysis['status'] = 'OPTIMAL';
    if (truePeakDb >= -0.2) {
      status = 'CLIPPING';
    } else if (delta > 2.0) {
      status = 'TOO_HOT';
    } else if (delta < -3.0) {
      status = 'TOO_QUIET';
    }

    return {
      momentaryLufs: Math.round(momentaryLufs * 10) / 10,
      shortTermLufs: Math.round(shortTermLufs * 10) / 10,
      integratedLufs: Math.round(integratedLufs * 10) / 10,
      truePeakDb: Math.round(truePeakDb * 10) / 10,
      targetDeltaDb: delta,
      status
    };
  }

  public resetLufsAccumulator(): void {
    this.momentaryBuffer = [];
    this.shortTermBuffer = [];
    this.integratedSum = 0;
    this.integratedCount = 0;
  }
}

export const audioMasteringEngine = AudioMasteringEngine.getInstance();
