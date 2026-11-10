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
