import { test } from 'node:test';
import assert from 'node:assert';
import { calculateFrameRange, getExportDimensions } from './exportEngine';

test('calculateFrameRange handles shot mode accurately', () => {
  const result = calculateFrameRange('shot', 40, 50, 100, 24);
  assert.strictEqual(result.startFrame, 39 * 288);
  assert.strictEqual(result.endFrame, 50 * 288 - 1);
  assert.strictEqual(result.totalFrames, 11 * 288);
  assert.strictEqual(result.startLabel, 'SH040');
  assert.strictEqual(result.endLabel, 'SH050');
  assert.strictEqual(result.durationSec, 11 * 12);
});

test('calculateFrameRange handles frame mode accurately', () => {
  const result = calculateFrameRange('frame', 40, 50, 100, 24);
  assert.strictEqual(result.startFrame, 40);
  assert.strictEqual(result.endFrame, 50);
  assert.strictEqual(result.totalFrames, 11);
  assert.strictEqual(result.startLabel, 'F0040');
  assert.strictEqual(result.endLabel, 'F0050');
});

test('getExportDimensions produces even dimensions for H.264', () => {
  const dims1080p = getExportDimensions('1080p', '2.39:1');
  assert.strictEqual(dims1080p.width, 1920);
  assert.strictEqual(dims1080p.height % 2, 0);

  const dims4K = getExportDimensions('4K', '2.39:1');
  assert.strictEqual(dims4K.width, 3840);
  assert.strictEqual(dims4K.height % 2, 0);
});
