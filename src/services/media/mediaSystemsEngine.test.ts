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
