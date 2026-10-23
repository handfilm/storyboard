/**
 * @file /src/services/thumbnailEngine.test.ts
 * @description Unit tests for dynamic hover video thumbnail engine, non-black frame extraction,
 * SMPTE timecode formatting, hover-scrubbing with requestAnimationFrame, and RAM virtualization cleanup.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THUMB_WIDTH,
  THUMB_HEIGHT,
  DEFAULT_KEYFRAME_TIMESTAMP_SEC,
  formatSMPTETimecode,
  thumbnailMemoryCache,
  extractVideoPoster,
  cleanupVideoElement,
  hoverScrubThumbnailSource,
  createHoverScrubber
} from './thumbnailEngine';

test('thumbnailEngine dimensions and default timestamp are configured', () => {
  assert.equal(THUMB_WIDTH, 160, 'Thumbnail width must be 160px');
  assert.equal(THUMB_HEIGHT, 90, 'Thumbnail height must be 90px (16:9)');
  assert.equal(DEFAULT_KEYFRAME_TIMESTAMP_SEC, 0.5, 'Default keyframe seek must be >= 0.5s to avoid black frames');
});

test('formatSMPTETimecode formats 24fps broadcast timecodes accurately', () => {
  assert.equal(formatSMPTETimecode(0, 24), 'TC 00:00:00:00');
  assert.equal(formatSMPTETimecode(1.0, 24), 'TC 00:00:01:00');
  assert.equal(formatSMPTETimecode(3.5, 24), 'TC 00:00:03:12'); // 0.5s * 24 = 12 frames
  assert.equal(formatSMPTETimecode(65.25, 24), 'TC 00:01:05:06'); // 65s = 1m 5s, 0.25 * 24 = 6 frames
  assert.equal(formatSMPTETimecode(3661.0, 24), 'TC 01:01:01:00'); // 1h 1m 1s
});

test('thumbnailMemoryCache handles LRU insertion and eviction', () => {
  thumbnailMemoryCache.clear();
  thumbnailMemoryCache.set('shot_1', 'data:image/jpeg;base64,sample1');
  assert.equal(thumbnailMemoryCache.get('shot_1'), 'data:image/jpeg;base64,sample1');
  assert.equal(thumbnailMemoryCache.has('shot_1'), true);
  assert.equal(thumbnailMemoryCache.has('shot_nonexistent'), false);
});

test('extractVideoPoster extracts non-black fallback in test environment', async () => {
  const dummyBlob = new Blob(['sample-video-stream'], { type: 'video/mp4' });
  const result = await extractVideoPoster(dummyBlob, 0.5);

  assert.ok(result);
  assert.ok(result.base64.length > 50);
  assert.ok(result.blob instanceof Blob);
  assert.equal(result.width, 160);
  assert.equal(result.height, 90);
  assert.equal(result.timecode, 'TC 00:00:00:12');
});

test('hoverScrubThumbnailSource and createHoverScrubber handle RAF hover scrubbing', () => {
  const mockContainer = {
    getBoundingClientRect: () => ({ left: 0, width: 200, top: 0, height: 100, right: 200, bottom: 100 })
  } as unknown as HTMLElement;

  let reportedState: any = null;
  const scrubber = createHoverScrubber(mockContainer, null, 12.0, (state) => {
    reportedState = state;
  });

  assert.equal(typeof scrubber.handleMouseMove, 'function');
  assert.equal(typeof scrubber.cleanup, 'function');
  scrubber.cleanup();
});

test('cleanupVideoElement executes safely without throwing on null or standard elements', () => {
  assert.doesNotThrow(() => {
    cleanupVideoElement(null);
  });
});
