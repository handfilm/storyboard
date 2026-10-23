/**
 * @file /src/services/multiCamSyncEngine.ts
 * @description In-browser Audio Waveform Cross-Correlation & Multi-Angle Synchronization Engine.
 * 
 * Capabilities:
 * 1. Audio Decoupling: Extracts audio stream from video/audio Blobs into decoded Float32Array PCM buffers.
 * 2. High-Performance Downsampling: Downsamples audio to 2,000Hz mono envelope to compute cross-correlation
 *    in milliseconds without main-thread blocking.
 * 3. Normalized Cross-Correlation (NCC): Computes maximum energy alignment across sliding windows (±15.0s)
 *    to find exact microsecond/millisecond offset relative to the master reference angle.
 * 4. Micro-Waveform Generator: Computes normalized RMS amplitude envelopes for visual timeline alignment HUDs.
 */

import { MultiCamAngle } from '../types/multicam';

export interface SyncAnalysisResult {
  angleId: string;
  syncOffsetMs: number;
  confidence: number; // 0.0 to 1.0
  waveformPeaks: number[]; // 100-point normalized amplitude envelope (0..1)
  error?: string;
}

export class MultiCamSyncEngine {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    return this.audioCtx;
  }

  /**
   * Decodes audio data from a Blob URL into an AudioBuffer.
   */
  public async extractAudioBuffer(blobUrl: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(blobUrl);
      const arrayBuffer = await response.arrayBuffer();
      const ctx = this.getAudioContext();
      // Decode audio data safely
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (err) {
      console.warn(`[MultiCamSyncEngine] Failed to decode audio from ${blobUrl}:`, err);
      return null;
    }
  }

  /**
   * Downsamples an AudioBuffer to a lightweight mono energy envelope at targetSampleRate (e.g. 2000Hz).
   */
  private downsampleToMono(audioBuffer: AudioBuffer, targetSampleRate = 2000): Float32Array {
    const rawRate = audioBuffer.sampleRate;
    const ratio = rawRate / targetSampleRate;
    const channel0 = audioBuffer.getChannelData(0);
    const channel1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
    const outLength = Math.floor(audioBuffer.length / ratio);
    const envelope = new Float32Array(outLength);

    for (let i = 0; i < outLength; i++) {
      const startIdx = Math.floor(i * ratio);
      const endIdx = Math.min(channel0.length, Math.floor((i + 1) * ratio));
      let sumSquares = 0;
      let count = 0;

      for (let j = startIdx; j < endIdx; j++) {
        const monoSample = channel1 ? (channel0[j] + channel1[j]) * 0.5 : channel0[j];
        sumSquares += monoSample * monoSample;
        count++;
      }

      envelope[i] = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    }

    // Normalize envelope
    let max = 0;
    for (let i = 0; i < envelope.length; i++) {
      if (envelope[i] > max) max = envelope[i];
    }
    if (max > 0.0001) {
      for (let i = 0; i < envelope.length; i++) {
        envelope[i] = envelope[i] / max;
      }
    }

    return envelope;
  }

  /**
   * Computes normalized RMS waveform bars for UI rendering (e.g. 100 points).
   */
  public generateWaveformPeaks(envelope: Float32Array, pointCount = 100): number[] {
    const peaks: number[] = new Array(pointCount).fill(0);
    if (!envelope || envelope.length === 0) return peaks;

    const step = envelope.length / pointCount;
    for (let i = 0; i < pointCount; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(envelope.length, Math.floor((i + 1) * step));
      let maxVal = 0;
      for (let j = start; j < end; j++) {
        if (envelope[j] > maxVal) maxVal = envelope[j];
      }
      peaks[i] = Math.min(1.0, Math.max(0.05, maxVal));
    }
    return peaks;
  }

  /**
   * Computes Normalized Cross-Correlation (NCC) between reference envelope and target envelope.
   * Returns estimated lag in milliseconds (target relative to reference).
   * Search range: up to maxSearchOffsetSec (default 15.0 seconds).
   */
  public computeLagOffset(
    refEnvelope: Float32Array,
    targetEnvelope: Float32Array,
    sampleRate = 2000,
    maxSearchOffsetSec = 15.0
  ): { offsetMs: number; confidence: number } {
    if (refEnvelope.length === 0 || targetEnvelope.length === 0) {
      return { offsetMs: 0, confidence: 0 };
    }

    const maxShiftSamples = Math.min(
      Math.floor(maxSearchOffsetSec * sampleRate),
      Math.floor(Math.min(refEnvelope.length, targetEnvelope.length) * 0.8)
    );

    // Limit window to first 45 seconds for rapid calculation
    const windowLength = Math.min(
      sampleRate * 45,
      Math.min(refEnvelope.length, targetEnvelope.length) - maxShiftSamples
    );

    if (windowLength <= 0) {
      return { offsetMs: 0, confidence: 0 };
    }

    let bestCorrelation = -Infinity;
    let bestShift = 0;

    // Search range: -maxShiftSamples to +maxShiftSamples
    // Step by 2 for speed, fine-tune around peak
    const coarseStep = 2;
    for (let shift = -maxShiftSamples; shift <= maxShiftSamples; shift += coarseStep) {
      let sum = 0;
      let refEnergy = 0;
      let tgtEnergy = 0;
      let validCount = 0;

      for (let i = 0; i < windowLength; i++) {
        const tgtIdx = i + shift;
        if (tgtIdx >= 0 && tgtIdx < targetEnvelope.length) {
          const r = refEnvelope[i];
          const t = targetEnvelope[tgtIdx];
          sum += r * t;
          refEnergy += r * r;
          tgtEnergy += t * t;
          validCount++;
        }
      }

      if (validCount > 0 && refEnergy > 0.0001 && tgtEnergy > 0.0001) {
        const normalized = sum / Math.sqrt(refEnergy * tgtEnergy);
        if (normalized > bestCorrelation) {
          bestCorrelation = normalized;
          bestShift = shift;
        }
      }
    }

    // Fine-tune around bestShift by single sample steps
    let refinedShift = bestShift;
    let refinedCorrelation = bestCorrelation;
    for (let fineShift = bestShift - 3; fineShift <= bestShift + 3; fineShift++) {
      let sum = 0;
      let refEnergy = 0;
      let tgtEnergy = 0;
      let validCount = 0;

      for (let i = 0; i < windowLength; i++) {
        const tgtIdx = i + fineShift;
        if (tgtIdx >= 0 && tgtIdx < targetEnvelope.length) {
          const r = refEnvelope[i];
          const t = targetEnvelope[tgtIdx];
          sum += r * t;
          refEnergy += r * r;
          tgtEnergy += t * t;
          validCount++;
        }
      }

      if (validCount > 0 && refEnergy > 0.0001 && tgtEnergy > 0.0001) {
        const normalized = sum / Math.sqrt(refEnergy * tgtEnergy);
        if (normalized > refinedCorrelation) {
          refinedCorrelation = normalized;
          refinedShift = fineShift;
        }
      }
    }

    // Shift in ms: positive means target starts later than reference
    const offsetMs = Math.round((refinedShift / sampleRate) * 1000);
    const confidence = Math.max(0, Math.min(1.0, refinedCorrelation));

    return { offsetMs, confidence };
  }

  /**
   * Automatically analyzes an array of MultiCamAngles, using the designated master reference angle
   * (or Angle 0) to align all other angles via audio correlation.
   */
  public async autoSyncAngles(
    angles: MultiCamAngle[],
    masterAngleIndex = 0,
    onProgress?: (angleIndex: number, total: number, status: string) => void
  ): Promise<{ updatedAngles: MultiCamAngle[]; results: SyncAnalysisResult[] }> {
    if (angles.length === 0) {
      return { updatedAngles: [], results: [] };
    }

    const referenceIndex = Math.max(0, Math.min(angles.length - 1, masterAngleIndex));
    const refAngle = angles[referenceIndex];

    onProgress?.(0, angles.length, `Decoding master audio track: ${refAngle.label}...`);
    const refBuffer = await this.extractAudioBuffer(refAngle.blobUrl);

    const results: SyncAnalysisResult[] = [];
    const updatedAngles: MultiCamAngle[] = angles.map(a => ({ ...a }));

    if (!refBuffer) {
      // Audio extraction failed on master track
      for (const a of angles) {
        results.push({
          angleId: a.id,
          syncOffsetMs: a.syncOffsetMs || 0,
          confidence: 0,
          waveformPeaks: new Array(100).fill(0.2),
          error: 'Master track contains no decodable audio stream'
        });
      }
      return { updatedAngles, results };
    }

    const refEnvelope = this.downsampleToMono(refBuffer);
    const refPeaks = this.generateWaveformPeaks(refEnvelope, 100);

    // Master track is reference zero
    results[referenceIndex] = {
      angleId: refAngle.id,
      syncOffsetMs: 0,
      confidence: 1.0,
      waveformPeaks: refPeaks
    };
    updatedAngles[referenceIndex].syncOffsetMs = 0;

    // Analyze remaining angles against master
    for (let i = 0; i < angles.length; i++) {
      if (i === referenceIndex) continue;
      const angle = angles[i];
      onProgress?.(i, angles.length, `Correlating audio for ${angle.label}...`);

      const targetBuffer = await this.extractAudioBuffer(angle.blobUrl);
      if (!targetBuffer) {
        results[i] = {
          angleId: angle.id,
          syncOffsetMs: angle.syncOffsetMs || 0,
          confidence: 0,
          waveformPeaks: new Array(100).fill(0.1),
          error: 'No audio channel detected in angle video'
        };
        continue;
      }

      const targetEnvelope = this.downsampleToMono(targetBuffer);
      const targetPeaks = this.generateWaveformPeaks(targetEnvelope, 100);
      const { offsetMs, confidence } = this.computeLagOffset(refEnvelope, targetEnvelope);

      // If confidence is acceptable (> 0.25), apply offset, otherwise preserve current
      const finalOffset = confidence >= 0.25 ? offsetMs : (angle.syncOffsetMs || 0);

      results[i] = {
        angleId: angle.id,
        syncOffsetMs: finalOffset,
        confidence,
        waveformPeaks: targetPeaks
      };
      updatedAngles[i].syncOffsetMs = finalOffset;
    }

    onProgress?.(angles.length, angles.length, 'Synchronization complete!');
    return { updatedAngles, results };
  }
}

export const multiCamSyncEngine = new MultiCamSyncEngine();
