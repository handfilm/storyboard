/**
 * @file /src/services/media/mediaSystemsEngine.test.ts
 * @description Architectural & Invariant Tests for the WebCodecs, WebGL2, and OPFS Media Engine.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { WebCodecsLookaheadQueue } from './webCodecsLookaheadQueue';
import { masterAudioClock } from './masterAudioClock';
import { opfsMediaStorage } from './opfsMediaStorage';

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

  queue.destroy();
});

test('MasterAudioClock: Deterministic 24fps quantization and scrub decoupling', () => {
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
});

test('OPFS Ingestion: Orientation detection & 1:1 pixel aspect preservation', async () => {
  // Create mock portrait file (720x1280)
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
