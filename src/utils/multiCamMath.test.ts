/**
 * @file /src/utils/multiCamMath.test.ts
 * @description Unit tests for Broadcast Multi-Cam 9-angle switching, cut segmentation, and timecode formatting.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getMultiCamSegments,
  getActiveMultiCamAngleAtTime,
  punchMultiCamAngle,
  splitMultiCamAtPlayhead,
  formatBroadcastTimecode
} from './multiCamMath';

test('punchMultiCamAngle supports switching all 9 camera feeds and builds non-overlapping segments', () => {
  let cuts: any[] = [];
  cuts = punchMultiCamAngle(cuts, 0, 0, 12000, 0).cutEvents; // CAM 01
  cuts = punchMultiCamAngle(cuts, 3000, 4, 12000, 0).cutEvents; // CAM 05
  cuts = punchMultiCamAngle(cuts, 7500, 8, 12000, 4).cutEvents; // CAM 09

  assert.equal(cuts.length, 3);
  assert.equal(getActiveMultiCamAngleAtTime(cuts, 1200), 0);
  assert.equal(getActiveMultiCamAngleAtTime(cuts, 4500), 4);
  assert.equal(getActiveMultiCamAngleAtTime(cuts, 9000), 8);

  const segs = getMultiCamSegments(cuts, 12000, 0);
  assert.equal(segs.length, 3);
  assert.equal(segs[0].durationMs, 3000);
  assert.equal(segs[1].durationMs, 4500);
  assert.equal(segs[2].durationMs, 4500);
});

test('splitMultiCamAtPlayhead inserts razor cut marker at playhead unless within 120ms threshold', () => {
  const base = [{ id: 'c0', timeMs: 0, angleIndex: 0 }];
  const split = splitMultiCamAtPlayhead(base, 5000, 12000, 2);
  assert.equal(split.inserted, true);
  assert.equal(split.cutEvents.length, 2);
  assert.equal(split.cutEvents[1].timeMs, 5000);
  assert.equal(split.cutEvents[1].angleIndex, 2);

  const tooClose = splitMultiCamAtPlayhead(split.cutEvents, 5040, 12000, 2);
  assert.equal(tooClose.inserted, false);
});

test('formatBroadcastTimecode formats HH:MM:SS cleanly', () => {
  assert.equal(formatBroadcastTimecode(0), '00:00:00');
  assert.equal(formatBroadcastTimecode(65000), '00:01:05');
  assert.equal(formatBroadcastTimecode(3661000), '01:01:01');
});
