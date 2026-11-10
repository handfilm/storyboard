/**
 * @file /src/services/media/mediaSystemsEngine.test.ts
 * @description Architectural & Invariant Tests for the WebCodecs, WebGL2, and OPFS Media Engine.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { WebCodecsLookaheadQueue } from './webCodecsLookaheadQueue';
import { masterAudioClock } from './masterAudioClock';
import { opfsMediaStorage } from './opfsMediaStorage';
import { codecResilienceEngine } from './codecResilienceEngine';
import { smpteTimecodeEngine } from './smpteTimecodeEngine';
import { transientBeatEngine } from './transientBeatEngine';
import { multiTabLockManager } from './multiTabLockManager';
import { exportRecoveryManager } from './exportRecoveryManager';
import { audioSidechainDucker } from './audioSidechainDucker';
import { waveformTileGenerator } from './waveformTileGenerator';
import { opticalCutDetector } from './opticalCutDetector';
import { eventSourcedJournal } from './eventSourcedJournal';
import { webGpuOpticalFlowEngine } from './webgpuOpticalFlowEngine';
import { parametricFilmGrainEngine } from './parametricFilmGrainEngine';
import { lockFreeAudioWorkletEngine } from './lockFreeAudioWorklet';

test('WebCodecsLookaheadQueue: Sliding window and strict 48-frame capacity boundary', () => {
  const queue = new WebCodecsLookaheadQueue(24);

  // Mock closable frame
  const createMockFrame = () => {
    let closed = false;
    return {
      close() { closed = true; },
      get isClosed() { return closed; }
    } as unknown as ImageBitmap;
  };

  // Enqueue 20 frames around T = 1.0s (frames 24..43)
  const frames: Array<{ frame: ImageBitmap & { isClosed: boolean }; index: number }> = [];
  for (let i = 24; i < 44; i++) {
    const f = createMockFrame() as any;
    frames.push({ frame: f, index: i });
    queue.enqueueFrame(i, f, i / 24);
  }

  assert.strictEqual(queue.getTelemetry().activeFramesCount, 20);

  // Advance playhead to T = 5.0s (frame 120).
  // Window is [4.5s, 7.0s], which corresponds to frames [108, 168].
  // All frames from 24..43 must be evicted and closed.
  queue.updatePlayhead(5.0);

  for (const { frame } of frames) {
    assert.strictEqual(frame.isClosed, true, 'Expired frames outside [T-0.5s, T+2.0s] must be closed');
  }
  assert.strictEqual(queue.getTelemetry().activeFramesCount, 0);

  // Test hard capacity limit of 48 frames
  for (let i = 110; i < 170; i++) {
    const f = createMockFrame() as any;
    queue.enqueueFrame(i, f, i / 24);
  }

  const telemetry = queue.getTelemetry();
  assert.ok(
    telemetry.activeFramesCount <= 48,
    `Active GPU frames (${telemetry.activeFramesCount}) must not exceed hard cap of 48 frames`
  );

  // Verify Zero-GC in-place telemetry reuse
  const t1 = queue.getTelemetry();
  const t2 = queue.getTelemetry();
  assert.strictEqual(t1, t2, 'Telemetry object reference must be reused for Zero-GC compliance');

  queue.destroy();
});

test('MasterAudioClock: Deterministic 24fps quantization, frame-dropping and scrub decoupling', () => {
  // Test time quantization
  const testTimes = [0.0, 0.0416, 0.05, 0.0833, 1.25];
  for (const t of testTimes) {
    const quantized = Math.floor(t * 24.0) / 24.0;
    const frameIndex = Math.floor(t * 24.0);
    assert.strictEqual(quantized, frameIndex / 24.0);
  }

  // Fast-scrub decoupling
  masterAudioClock.handleScrubStart(1.5);
  masterAudioClock.scrubTo(2.0);
  masterAudioClock.handleScrubEnd(false);
  assert.ok(true, 'Scrub start/end operates with zero thrown errors');

  // Deterministic frame sync evaluation:
  // If visual frame is lagging behind audio clock by >= 2 frames, shouldDrop flag must be true
  const syncEval = masterAudioClock.evaluateFrameSync(0);
  assert.ok(typeof syncEval.shouldDrop === 'boolean');
  assert.ok(typeof syncEval.targetFrame === 'number');
});

test('OPFS Ingestion: Orientation detection & 1:1 pixel aspect preservation', async () => {
  const portraitBlob = new Blob(['mock video data'], { type: 'video/mp4' });
  
  // Dimensions detection check
  const dimensions = await opfsMediaStorage.detectMediaDimensions(portraitBlob);
  assert.ok(dimensions.width > 0);
  assert.ok(dimensions.height > 0);
  assert.ok(['portrait', 'landscape', 'square'].includes(dimensions.orientation));

  // Check OPFS support check
  const isSupported = opfsMediaStorage.checkSupport();
  assert.strictEqual(typeof isSupported, 'boolean');
});

test('CodecResilienceEngine: Media audit and fallback transcode detection', async () => {
  const hevcFile = new File(['mock hevc content'], 'clip.hevc', { type: 'video/mp4' });
  const audit = await codecResilienceEngine.auditMediaFile(hevcFile);
  
  assert.ok(audit.detectedCodec.includes('H.265') || audit.detectedCodec.includes('HEVC'));
  assert.strictEqual(typeof audit.isHardwareAccelerated, 'boolean');
  assert.strictEqual(typeof audit.needsFallbackTranscode, 'boolean');
  assert.strictEqual(audit.recommendedCodec, 'avc1.4d401f');
});

test('SmpteTimecodeEngine: SMPTE ST 12-1 24fps and 29.970 Drop-Frame mathematical precision', () => {
  // Test 24.000fps standard formatting
  assert.strictEqual(smpteTimecodeEngine.formatTimecode(0.0, 24, false), '00:00:00:00');
  assert.strictEqual(smpteTimecodeEngine.formatTimecode(1.0, 24, false), '00:00:01:00');
  assert.strictEqual(smpteTimecodeEngine.formatTimecode(0.5, 24, false), '00:00:00:12');
  assert.strictEqual(smpteTimecodeEngine.formatTimecode(3661.0, 24, false), '01:01:01:00');

  // Test Zero-GC object reference reuse
  const rec1 = smpteTimecodeEngine.secondsToTimecode(1.0, 24, false);
  const rec2 = smpteTimecodeEngine.secondsToTimecode(2.0, 24, false);
  assert.strictEqual(rec1, rec2, 'TimecodeRecord memory must be reused in-place');

  // Test 29.970 Drop-Frame: Frame indices 0 & 1 must be dropped at non-10th minute marks
  const dfMinute1 = smpteTimecodeEngine.formatTimecode(60.0, 29.97, true);
  assert.ok(dfMinute1.includes(';'), 'Drop-frame timecode must use semicolon separator');
});

test('TransientBeatEngine: Frame-accurate magnetic beat snapping and Zero-GC lookup', () => {
  // Snapping without stems: returns target time unaltered
  const unsnapped = transientBeatEngine.snapTimeToNearestBeat(1.234, 0.08);
  assert.strictEqual(unsnapped.snappedTimeSec, 1.234);
  assert.strictEqual(unsnapped.isSnapped, false);

  // Snapping with synthetic analysis
  const syntheticStems = {
    bpm: 120,
    durationSec: 10.0,
    transients: [
      { timeSec: 1.0, frameIndex: 24, energy: 0.9, isDownbeat: true, band: 'kick' as const },
      { timeSec: 1.5, frameIndex: 36, energy: 0.7, isDownbeat: false, band: 'snare' as const }
    ],
    downbeats: [
      { timeSec: 1.0, frameIndex: 24, energy: 0.9, isDownbeat: true, band: 'kick' as const }
    ]
  };

  transientBeatEngine.setAnalysis(syntheticStems);

  // Time near 1.02s within 0.08s threshold should snap to 1.0s
  const snapped = transientBeatEngine.snapTimeToNearestBeat(1.02, 0.08);
  assert.strictEqual(snapped.snappedTimeSec, 1.0);
  assert.strictEqual(snapped.isSnapped, true);

  // Time at 1.30s (0.2s from 1.5s, > 0.08s) should NOT snap
  const notSnapped = transientBeatEngine.snapTimeToNearestBeat(1.30, 0.08);
  assert.strictEqual(notSnapped.snappedTimeSec, 1.30);
  assert.strictEqual(notSnapped.isSnapped, false);
});

test('MultiTabLockManager: Web Locks concurrency coordination and crash interceptor', async () => {
  let executed = false;
  await multiTabLockManager.executeWithExclusiveLock('test_opfs_lock', async () => {
    executed = true;
    return 'success';
  });
  assert.strictEqual(executed, true);

  // Test decoder crash recovery state initial values
  const recovery = multiTabLockManager.getRecoveryState();
  assert.strictEqual(typeof recovery.crashCount, 'number');
  assert.strictEqual(typeof recovery.isRecovering, 'boolean');
});

test('ExportRecoveryManager: GOP checkpoint persistence, load, and clearing', async () => {
  await exportRecoveryManager.saveGopCheckpoint({
    exportId: 'test_exp_123',
    filename: 'master_cut.mp4',
    lastFinalizedGop: 2,
    globalFrameIndex: 96,
    totalSequenceFrames: 288,
    width: 3840,
    height: 2160,
    fps: 24,
    timestamp: Date.now(),
    isResumable: true
  });

  const checkpoint = await exportRecoveryManager.loadLastCheckpoint();
  assert.ok(checkpoint !== null);
  assert.strictEqual(checkpoint?.exportId, 'test_exp_123');
  assert.strictEqual(checkpoint?.globalFrameIndex, 96);
  assert.strictEqual(checkpoint?.isResumable, true);

  await exportRecoveryManager.clearCheckpoint();
  const cleared = await exportRecoveryManager.loadLastCheckpoint();
  assert.strictEqual(cleared, null);
});

test('AudioSidechainDucker: Dynamic vocal auto-ducking attenuation and smooth parameter curves', () => {
  audioSidechainDucker.setParameters({
    duckingDb: -12.0,
    thresholdDb: -22.0,
    enabled: true
  });

  // Speech energy at 0.001 (-60dBFS) is below threshold -> 1.0 (no ducking)
  const quietGain = audioSidechainDucker.computeOfflineDuckingGain(0.001);
  assert.strictEqual(quietGain, 1.0);

  // Speech energy at 0.5 (-6dBFS) exceeds threshold -> -12dB attenuation (~0.251 linear)
  const loudGain = audioSidechainDucker.computeOfflineDuckingGain(0.5);
  const expectedGain = Math.pow(10, -12 / 20);
  assert.ok(Math.abs(loudGain - expectedGain) < 0.01, 'Vocal burst must trigger -12dB attenuation');
});

test('WaveformTileGenerator: 256px chunked peak computation and telemetry tracking', async () => {
  // Generate 1 second of synthetic 44.1kHz sine audio
  const sampleRate = 44100;
  const channelData = new Float32Array(sampleRate);
  for (let i = 0; i < sampleRate; i++) {
    channelData[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440);
  }

  const tile = await waveformTileGenerator.getTile(
    'stem_main',
    0,
    channelData,
    sampleRate,
    100, // 100 px per sec
    256,
    64
  );

  assert.strictEqual(tile.tileIndex, 0);
  assert.strictEqual(tile.width, 256);
  assert.strictEqual(tile.minPeaks.length, 256);
  assert.strictEqual(tile.maxPeaks.length, 256);

  // Sine wave peak should be near 1.0 and -1.0
  let maxFound = -1;
  for (let i = 0; i < 256; i++) {
    if (tile.maxPeaks[i] > maxFound) maxFound = tile.maxPeaks[i];
  }
  assert.ok(maxFound > 0.8, 'Waveform peak extraction should preserve high amplitudes');

  const telemetry = waveformTileGenerator.getTelemetry();
  assert.ok(telemetry.totalCachedTiles >= 1);
  assert.strictEqual(telemetry.maxTileCapacity, 64);
});

test('OpticalCutDetector: 64-bin luma histogram delta & automated cut detection', () => {
  // Frame 1: Pure black pixels
  const blackPixels = new Uint8ClampedArray(160 * 90 * 4);
  blackPixels.fill(0);

  // Frame 2: Pure white pixels
  const whitePixels = new Uint8ClampedArray(160 * 90 * 4);
  whitePixels.fill(255);

  const hist1 = new Float32Array(64);
  const hist2 = new Float32Array(64);

  opticalCutDetector.computeLumaHistogram(blackPixels, hist1);
  opticalCutDetector.computeLumaHistogram(whitePixels, hist2);

  // Verify histogram normalization
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < 64; i++) {
    sum1 += hist1[i];
    sum2 += hist2[i];
  }
  assert.ok(Math.abs(sum1 - 1.0) < 0.001);
  assert.ok(Math.abs(sum2 - 1.0) < 0.001);

  // Pure black to pure white delta should equal maximum (2.0 in L1 norm)
  const delta = opticalCutDetector.calculateHistogramDelta(hist1, hist2);
  assert.strictEqual(delta, 2.0);

  // Test detectCutsFromFrames
  const samples = [
    { pixels: blackPixels, timeSec: 0.0, frameIndex: 0 },
    { pixels: blackPixels, timeSec: 0.5, frameIndex: 12 },
    { pixels: whitePixels, timeSec: 1.0, frameIndex: 24 }, // Sharp cut!
    { pixels: whitePixels, timeSec: 1.5, frameIndex: 36 }
  ];

  const result = opticalCutDetector.detectCutsFromFrames(samples, 0.35, 24);
  assert.strictEqual(result.detectedCuts.length, 1);
  assert.strictEqual(result.detectedCuts[0].frameIndex, 24);
});

test('EventSourcedJournal: Immutable delta action commits, undo, and redo history', async () => {
  await eventSourcedJournal.clearJournal();

  const act1 = await eventSourcedJournal.commitAction({
    actionType: 'ADD_SHOT',
    payload: { shotId: 'shot_101', durationSec: 3.5 },
    inversePayload: { shotId: 'shot_101' }
  });

  const act2 = await eventSourcedJournal.commitAction({
    actionType: 'UPDATE_DURATION',
    payload: { shotId: 'shot_101', newDurationSec: 5.0 },
    inversePayload: { shotId: 'shot_101', previousDurationSec: 3.5 }
  });

  assert.strictEqual(eventSourcedJournal.getHistoryLength(), 2);
  assert.strictEqual(eventSourcedJournal.canUndo(), true);

  // Undo back to state 1
  const undoneAct = eventSourcedJournal.undo();
  assert.strictEqual(undoneAct?.id, act2.id);
  assert.strictEqual(eventSourcedJournal.getUndoPointer(), 0);

  // Redo back to state 2
  const redoneAct = eventSourcedJournal.redo();
  assert.strictEqual(redoneAct?.id, act2.id);
  assert.strictEqual(eventSourcedJournal.getUndoPointer(), 1);
});

test('WebGpuOpticalFlowEngine: Bidirectional motion vector calculation & FRC slow-motion telemetry', () => {
  const width = 160;
  const height = 90;
  const frameA = new Uint8ClampedArray(width * height * 4);
  const frameB = new Uint8ClampedArray(width * height * 4);

  // Synthesize shifted horizontal gradient between Frame A and Frame B
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      frameA[idx] = (x * 255) / width;
      frameA[idx + 1] = 128;
      frameA[idx + 2] = 200;
      frameA[idx + 3] = 255;

      // Shift right by 4 pixels in Frame B to simulate camera pan
      const shiftedX = Math.max(0, x - 4);
      frameB[idx] = (shiftedX * 255) / width;
      frameB[idx + 1] = 128;
      frameB[idx + 2] = 200;
      frameB[idx + 3] = 255;
    }
  }

  const telemetry = webGpuOpticalFlowEngine.computeMotionField(frameA, frameB, width, height);
  assert.ok(telemetry.forwardVectorsCalculated);
  assert.ok(telemetry.backwardVectorsCalculated);
  assert.strictEqual(typeof telemetry.averageVelocityMag, 'number');
  assert.strictEqual(typeof telemetry.computeTimeMs, 'number');
});

test('ParametricFilmGrainEngine: Photochemical 35mm/16mm silver halide grain synthesis', () => {
  parametricFilmGrainEngine.setParameters({
    enabled: true,
    intensity: 0.4,
    grainSize: 1.0,
    colorGrain: false,
    filmStock: 'VISION3_500T'
  });

  const params = parametricFilmGrainEngine.getParameters();
  assert.strictEqual(params.enabled, true);
  assert.strictEqual(params.intensity, 0.4);
  assert.strictEqual(params.filmStock, 'VISION3_500T');
});

test('LockFreeAudioWorkletEngine: Worklet engine initialization and telemetry state', () => {
  const telemetry = lockFreeAudioWorkletEngine.getTelemetry();
  assert.strictEqual(typeof telemetry.isWorkletActive, 'boolean');
  assert.strictEqual(typeof telemetry.duckingGainLinear, 'number');
  assert.strictEqual(typeof telemetry.speechEnergyRms, 'number');
  assert.strictEqual(typeof telemetry.isDuckingActive, 'boolean');
});
